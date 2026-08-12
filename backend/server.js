require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');
const moment = require('moment-timezone');
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

app.get('/', async (req, res) => {
    try {
        // Fecha de ayer en hora Colombia
        const yesterday = moment().tz("America/Bogota")
            .subtract(1, 'days')
            .startOf('day')
            .toDate();

        const [news, surebets, predictions, goalTables] = await Promise.all([
            News.find().sort({ createdAt: -1 }).limit(3),
            Surebet.find({ eventDate: { $gte: yesterday } }).sort({ eventDate: 1 }).limit(6),
            Prediction.find({ eventDate: { $gte: yesterday } })
                .sort({ eventDate: -1 })
                .limit(6),
            GoalTable.find({ eventDate: { $gte: yesterday } })
                .sort({ eventDate: -1 })
                .limit(10)
        ]);

        // Convertir fechas a hora Colombia para el renderizado
        const formatToColombia = (date) => {
            return moment(date).tz("America/Bogota").format();
        };

        // Procesar predicciones y ordenar por fecha+hora en Colombia
        const processedPredictions = predictions
            .map(p => ({
                ...p._doc,
                eventDateColombia: moment(p.eventDate).tz("America/Bogota").toDate(),
                timeColombia: moment(p.eventDate).tz("America/Bogota").format('HH:mm')
            }))
            .sort((a, b) => {
                // Ordenar por fecha en Colombia (más reciente primero)
                if (a.eventDateColombia > b.eventDateColombia) return -1;
                if (a.eventDateColombia < b.eventDateColombia) return 1;
                // Si misma fecha, por hora
                return a.time.localeCompare(b.time);
            });

        const processedGoalTables = goalTables
            .map(g => ({
                ...g._doc,
                eventDateColombia: moment(g.eventDate).tz("America/Bogota").toDate(),
                timeColombia: moment(g.eventDate).tz("America/Bogota").format('HH:mm')
            }))
            .sort((a, b) => {
                if (a.eventDateColombia > b.eventDateColombia) return -1;
                if (a.eventDateColombia < b.eventDateColombia) return 1;
                return a.time.localeCompare(b.time);
            });

        res.render('landing', { 
            news, 
            surebets, 
            predictions: processedPredictions, 
            goalTables: processedGoalTables 
        });
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
    const { url, leagueAvg, oddsOver, oddsBtts, oddsScore1, oddsScore2, oddsScore3 } = req.body;

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
    
    const odds1 = parseFloat(oddsScore1) || null;
    const odds2 = parseFloat(oddsScore2) || null;
    const odds3 = parseFloat(oddsScore3) || null;

    const quantResults = calcularProbabilidades({
        ...scrapedData,
        leagueAvg: parseFloat(leagueAvg) || 1.10,
        oddsOver: parseFloat(oddsOver) || null,
        oddsBtts: parseFloat(oddsBtts) || null,
        manualScoreOdds: [odds1, odds2, odds3]
    });

    res.render('calc', {
        data: {
            ...scrapedData,
            ...quantResults,
            leagueAvg: parseFloat(leagueAvg) || 1.10,
            manualOddsOver: oddsOver,
            manualOddsBtts: oddsBtts,
            manualOddsScore1: oddsScore1,
            manualOddsScore2: oddsScore2,
            manualOddsScore3: oddsScore3
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