require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(session({
    secret: 'secret-key-super-segura',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
    }
}));

const server = http.createServer(app);
const MAX_CONNECTIONS = 100;
let activeConnections = 0;

server.on('connection', (socket) => {
    activeConnections++;
    if (activeConnections > MAX_CONNECTIONS) {
        socket.destroy();
        activeConnections--;
        console.warn('⚠️ Conexión rechazada: límite excedido');
        return;
    }
    
    socket.on('close', () => {
        activeConnections--;
    });
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

const News = require('./models/News');
const Prediction = require('./models/Prediction');
const Surebet = require('./models/Surebet');
const GoalTable = require('./models/GoalTable');

const moment = require('moment-timezone');
// ...
app.get('/', async (req, res) => {
    try {
        const yesterday = moment().tz("America/Bogota").subtract(1, 'days').startOf('day').toDate();

        const [news, surebets, predictions, goalTables] = await Promise.all([
            News.find().sort({ createdAt: -1 }).limit(3),
            Surebet.find({ eventDate: { $gte: yesterday } }).sort({ eventDate: 1 }).limit(6),
            Prediction.find({ eventDate: { $gte: yesterday } }).sort({ eventDate: 1 }).limit(6),
            GoalTable.find({ eventDate: { $gte: yesterday } }).sort({ eventDate: 1 }).limit(10)
        ]);
        res.render('landing', { news, surebets, predictions, goalTables });
    } catch (error) {
        console.error('Error al cargar datos:', error);
        res.render('landing', { news: [], surebets: [], predictions: [], goalTables: [] });
    }
});
app.get('/arbs', (req, res) => {
    res.render('arbs');
});
app.get('/analyze', (req, res) => {
    res.render('calc', { data: null, error: null, lastUrl: '', oddsOver: '', oddsBtts: '' });
});
const { parsearFlashscoreMobi } = require('./services/scraper');
const { calcularProbabilidades } = require('./services/quantEngineV2');
app.post('/analyze', async (req, res) => {
    const { url, leagueAvg, oddsOver, oddsBtts } = req.body;

    if (!url || !url.includes('flashscore')) {
        return res.render('calc', { 
            data: null, 
            error: 'Por favor ingresa una URL válida de Flashscore Mobi', 
            lastUrl: url, oddsOver, oddsBtts 
        });
    }

    const scrapedData = await parsearFlashscoreMobi(url);

    if (!scrapedData) {
        return res.render('calc', { 
            data: null, 
            error: 'No se pudieron extraer los datos del enlace enviado', 
            lastUrl: url, oddsOver, oddsBtts 
        });
    }

    const quantResults = calcularProbabilidades({
        ...scrapedData,
        leagueAvg: parseFloat(leagueAvg) || 1.10,
        oddsOver: parseFloat(oddsOver) || null,
        oddsBtts: parseFloat(oddsBtts) || null
    });

    res.render('calc', {
        data: {
            ...scrapedData,
            ...quantResults,
            leagueAvg: parseFloat(leagueAvg) || 1.10,
            manualOddsOver: oddsOver,
            manualOddsBtts: oddsBtts
        },
        error: null,
        lastUrl: url
    });
});

app.get('/ping', (req, res) => {
  res.send('Pong');
});

app.use((req, res, next) => {
    res.status(404).send('Err')
});

server.listen(PORT, () => {
    console.log('Servidor Online');
});