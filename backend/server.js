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
        maxAge: 30 * 24 * 60 * 60 * 1000
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

const SystemConfig = require('./models/SystemConfig');
const { getMatchInfo } = require('./services/test');
const { validatePredictionStatus } = require('./services/validateService');

async function autoValidarPendientes() {
    try {
        const config = await SystemConfig.findOne({ key: 'autoScraper' });
        if (!config || !config.value) return;

        // Obtener pendientes de ambos modelos
        const [pendientesPronosticos, pendientesGoles] = await Promise.all([
            Prediction.find({ status: { $in: ['pendiente', 'pending'] } }),
            GoalTable.find({ status: { $in: ['pendiente', 'pending'] } })
        ]);
        
        const todosPendientes = [
            ...pendientesPronosticos.map(p => ({ doc: p, type: 'prediction' })),
            ...pendientesGoles.map(g => ({ doc: g, type: 'goal-table' }))
        ];
        
        for (const item of todosPendientes) {
            try {
                const { doc, type } = item;
                
                if (type === 'prediction') {
                    // Usar servicio de validación automática para pronósticos
                    await validatePredictionStatus(doc._id);
                } else {
                    // Mantener lógica para tablas de goles
                    const updatedData = await getMatchInfo(doc.flashscoreId);
                    
                    doc.score = updatedData.score;
                    doc.status = updatedData.status;
                    if (updatedData.datetime && updatedData.datetime.iso) {
                        doc.eventDate = moment.tz(updatedData.datetime.iso, "America/Bogota").startOf('day').toDate();
                    }
                    await doc.save();
                }
                
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (e) {
                console.error(`Error validando ${item.type} ${item.doc._id}:`, e);
            }
        }
    } catch (error) {
        console.error('Error en validación automática:', error);
    }
}

setInterval(autoValidarPendientes, 10 * 60 * 1000);

const News = require('./models/News');
const Prediction = require('./models/Prediction');
const Surebet = require('./models/Surebet');
const GoalTable = require('./models/GoalTable');


app.get('/', async (req, res) => {
    try {
        const todayColombia = moment().tz("America/Bogota").startOf('day');
        
        const todayStart = todayColombia.clone().utc().startOf('day').toDate();
        const todayEnd = todayColombia.clone().utc().endOf('day').toDate();

        const [news, surebets, predictions, goalTables] = await Promise.all([
            News.find().sort({ createdAt: -1 }).limit(3),
            Surebet.find({ eventDate: { $gte: todayStart } }).sort({ eventDate: 1 }).limit(6),
            Prediction.find({ 
                eventDate: { 
                    $gte: todayStart,
                    $lte: todayEnd
                } 
            })
            .sort({ eventDate: -1 })
            .limit(10),
            GoalTable.find({ 
                eventDate: { 
                    $gte: todayStart,
                    $lte: todayEnd
                } 
            })
            .sort({ eventDate: -1 })
            .limit(10)
        ]);
        
        const getMatchStatus = (eventDate, timeStr) => {
            if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return null;
            try {
                const [h, m] = timeStr.split(':').map(Number);
                
                const matchTime = moment(eventDate)
                    .tz("America/Bogota")
                    .hour(h)
                    .minute(m)
                    .second(0);
                
                const now = moment().tz("America/Bogota");
                const matchEnd = matchTime.clone().add(112, 'minutes');
                
                if (now.isBetween(matchTime, matchEnd)) return 'LIVE';
                if (now.isAfter(matchEnd)) return 'FINALIZADO';
                return null;
            } catch(e) {
                console.error('Error calculating match status:', e);
                return null;
            }
        };

        const processedPredictions = predictions
            .map(p => {
                const pObj = p.toObject ? p.toObject() : { ...p };
                
                const [h, m] = pObj.time.split(':').map(Number);
                const fullDate = moment(pObj.eventDate)
                    .tz("America/Bogota")
                    .hour(h)
                    .minute(m)
                    .second(0);
                
                const matchStatus = getMatchStatus(pObj.eventDate, pObj.time);
                
                return {
                    ...pObj,
                    eventDateColombia: fullDate.toDate(),
                    timeColombia: pObj.time,
                    matchStatus: matchStatus
                };
            })
            .sort((a, b) => {
                if (a.eventDateColombia > b.eventDateColombia) return -1;
                if (a.eventDateColombia < b.eventDateColombia) return 1;
                return a.time.localeCompare(b.time);
            });

        const processedGoalTables = goalTables
            .map(g => {
                const gObj = g.toObject ? g.toObject() : { ...g };
                
                const [h, m] = gObj.time.split(':').map(Number);
                const fullDate = moment(gObj.eventDate)
                    .tz("America/Bogota")
                    .hour(h)
                    .minute(m)
                    .second(0);
                
                return {
                    ...gObj,
                    eventDateColombia: fullDate.toDate(),
                    timeColombia: gObj.time,
                    matchStatus: getMatchStatus(gObj.eventDate, gObj.time)
                };
            })
            .sort((a, b) => {
                if (a.eventDateColombia > b.eventDateColombia) return -1;
                if (a.eventDateColombia < b.eventDateColombia) return 1;
                return a.time.localeCompare(b.time);
            });
        
        res.render('landing', { 
            news, 
            surebets, 
            predictions: processedPredictions, 
            goalTables: processedGoalTables,
            moment
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