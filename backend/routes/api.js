const express = require('express');
const router = express.Router();

const News = require('../models/News');
const Prediction = require('../models/Prediction');
const Surebet = require('../models/Surebet');
const GoalTable = require('../models/GoalTable');
const upload = require('../middlewares/multer');
const cloudinary = require('../config/cloudinary');

const kambiService = require('../services/kambiService');
const xbetService = require('../services/xbetService');
const { extraerDatosKambi, extraerDatos1xBet, detectarSurebets } = require('../surebetEngine');
const { calcularProbabilidadesPartido, evaluarValuebets } = require('../services/quantEngine');

const NodeCache = require('node-cache');
const cache = new NodeCache({ 
    stdTTL: 600,
    checkperiod: 120,
    maxKeys: 50
});
const rateLimit = new Map();
function checkRateLimit(ip) {
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 10;
    
    if (!rateLimit.has(ip)) {
        rateLimit.set(ip, { count: 1, timestamp: now });
        return true;
    }
    
    const data = rateLimit.get(ip);
    if (now - data.timestamp > windowMs) {
        rateLimit.set(ip, { count: 1, timestamp: now });
        return true;
    }
    
    if (data.count >= maxRequests) {
        return false;
    }
    
    data.count++;
    rateLimit.set(ip, data);
    return true;
}
setInterval(() => {
    const now = Date.now();
    const windowMs = 60000;
    for (const [ip, data] of rateLimit.entries()) {
        if (now - data.timestamp > windowMs) {
            rateLimit.delete(ip);
        }
    }
}, 300000);


// Endpoints Noticias
router.get('/news', async (req, res) => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener noticias' });
    }
});
router.post('/admin/news', async (req, res) => {
    const news = new News(req.body);
    await news.save();
    res.status(201).json(news);
});

// Endpoints Pronósticos
router.get('/predictions', async (req, res) => {
    const predictions = await Prediction.find().sort({ createdAt: -1 });
    res.json(predictions);
});
router.post('/admin/predictions', async (req, res) => {
    const prediction = new Prediction(req.body);
    await prediction.save();
    res.status(201).json(prediction);
});

// Endpoints Surebets
router.get('/surebets', async (req, res) => {
    const surebets = await Surebet.find().sort({ createdAt: -1 });
    res.json(surebets);
});
router.post('/admin/surebets', async (req, res) => {
    const surebet = new Surebet(req.body);
    await surebet.save();
    res.status(201).json(surebet);
});

// Endpoints Tabla de Goles
router.get('/goal-tables', async (req, res) => {
    const goalTables = await GoalTable.find().sort({ createdAt: -1 });
    res.json(goalTables);
});
router.post('/admin/goal-tables', async (req, res) => {
    const goalTable = new GoalTable(req.body);
    await goalTable.save();
    res.status(201).json(goalTable);
});

router.get('/verificar-pendientes', async (req, res) => {
    try {
        const predictions = await Prediction.find({});
        const goalTables = await GoalTable.find({});
        const statusMap = {};

        predictions.forEach(p => {
            statusMap[p._id] = p.status === 'verificado' ? true : (p.status === 'fallido' ? false : 'pendiente');
        });
        goalTables.forEach(g => {
            statusMap[g._id] = g.status === 'verificado' ? true : (g.status === 'fallido' ? false : 'pendiente');
        });
        res.json(statusMap);
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar estados' });
    }
});

router.post('/scan', async (req, res) => {
    try {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        if (!checkRateLimit(clientIp)) {
            return res.status(429).json({ 
                error: '⏳ Demasiadas peticiones a las APIs externas (1xBet/Kambi)',
                details: 'Cada IP tiene un límite de 10 peticiones por minuto. Espera 60 segundos.',
                retryAfter: 60,
                tip: 'Cambia de navegador o usa VPN para cambiar tu IP'
            });
        }

        const { idXbet, idKambi, stats, isLive } = req.body;

        if (!idXbet || !idKambi) {
            return res.status(400).json({ 
                error: 'Se requieren ambos IDs (idXbet y idKambi)' 
            });
        }

        let cacheKey;
        if (stats && stats.homePJ && stats.awayPJ) {
            cacheKey = `${idXbet}_${idKambi}_stats_${stats.homePJ}_${stats.homeGF}_${stats.homeGC}_${stats.awayPJ}_${stats.awayGF}_${stats.awayGC}_${stats.leagueAvg || 1.10}`;
        } else {
            cacheKey = `${idXbet}_${idKambi}_no_stats`;
        }

        if (!isLive) {
            const cachedResult = cache.get(cacheKey);
            if (cachedResult) {
                return res.json({
                    ...cachedResult,
                    fromCache: true
                });
            }
        }

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout: La API tardó demasiado en responder')), 30000);
        });

        const fetchPromise = Promise.all([
            xbetService.obtenerCuotas1xBet(idXbet, isLive),
            kambiService.obtenerDatosKambi(idKambi)
        ]);

        const [xbetData, kambiData] = await Promise.race([fetchPromise, timeoutPromise]);

        if (!xbetData || !kambiData) {
            return res.status(500).json({ 
                error: 'Error al obtener datos de las APIs. Intenta nuevamente.' 
            });
        }

        const datos1xBet = extraerDatos1xBet(xbetData);
        const datosKambi = extraerDatosKambi(kambiData);

        const surebets = detectarSurebets(datos1xBet, datosKambi);

        let quantAnalysis = null;
        let valuebets = [];

        if (stats && stats.homePJ && stats.awayPJ) {
            quantAnalysis = calcularProbabilidadesPartido(stats);
            valuebets = evaluarValuebets(datos1xBet, datosKambi, quantAnalysis);
        }

        const result = {
            idXbet,
            idKambi,
            nombreLocal: datosKambi.nombreLocal,
            nombreVisitante: datosKambi.nombreVisitante,
            fechaInicio: datosKambi.fechaInicio || "",
            timestamp: new Date().toISOString(),
            surebets,
            totalSurebets: surebets.length,
            quantAnalysis,
            valuebets,
            totalValuebets: valuebets.length,
            hasQuantAnalysis: !!quantAnalysis,
            statsUsed: stats || null
        };

        if (!isLive) {
            cache.set(cacheKey, result);
        }

        res.json(result);
        
    } catch (error) {
        console.error('Error en /api/scan:', error);
        if (error.message.includes('Timeout')) {
            return res.status(504).json({ 
                error: '⏱️ Tiempo de espera agotado. El servidor tardó demasiado en responder.',
                details: 'Intenta nuevamente en unos segundos'
            });
        }
        
        if (error.response?.status === 429) {
            return res.status(429).json({ 
                error: '⏳ La API externa está limitando las peticiones. Espera un momento.',
                details: 'Demasiadas peticiones a 1xBet o Kambi'
            });
        }
        
        if (error.response?.status === 403 || error.response?.status === 401) {
            return res.status(403).json({ 
                error: '🔒 Acceso denegado a la API externa.',
                details: 'Verifica que los IDs sean correctos o intenta más tarde'
            });
        }
        
        res.status(500).json({ 
            error: 'Error al escanear el partido',
            details: error.message 
        });
    }
});

router.delete('/cache', (req, res) => {
    cache.flushAll();
    rateLimit.clear();
    res.json({ message: 'Caché y rate limit limpiados' });
});

router.get('/status', (req, res) => {
    const stats = cache.getStats();
    res.json({
        cache: {
            keys: cache.keys().length,
            maxKeys: 50,
            hits: stats.hits || 0,
            misses: stats.misses || 0
        },
        rateLimit: {
            activeIPs: rateLimit.size,
            maxRequestsPerMinute: 10
        }
    });
});

module.exports = router;