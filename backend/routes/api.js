const express = require('express');
const router = express.Router();
const kambiService = require('../services/kambiService');
const xbetService = require('../services/xbetService');
const { extraerDatosKambi, extraerDatos1xBet, detectarSurebets } = require('../surebetEngine');
const { calcularProbabilidadesPartido, evaluarValuebets } = require('../services/quantEngine');

const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 });

router.post('/scan', async (req, res) => {
    try {
        const { idXbet, idKambi, stats } = req.body;
        
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
        
        const cachedResult = cache.get(cacheKey);
        
        if (cachedResult) {
            return res.json({
                ...cachedResult,
                fromCache: true
            });
        }

        const [xbetData, kambiData] = await Promise.all([
            xbetService.obtenerCuotas1xBet(idXbet),
            kambiService.obtenerDatosKambi(idKambi)
        ]);

        if (!xbetData || !kambiData) {
            return res.status(500).json({ 
                error: 'Error al obtener datos de las APIs' 
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

        cache.set(cacheKey, result);

        res.json(result);
    } catch (error) {
        console.error('Error en /api/scan:', error);
        res.status(500).json({ 
            error: 'Error al escanear el partido',
            details: error.message 
        });
    }
});

router.delete('/cache', (req, res) => {
    cache.flushAll();
    res.json({ message: 'Caché limpiada' });
});

module.exports = router;