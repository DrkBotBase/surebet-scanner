const Prediction = require('../models/Prediction');
const { getMatchInfo } = require('./test');
const moment = require('moment-timezone');

async function validatePredictionStatus(predictionId) {
    try {
        const prediction = await Prediction.findById(predictionId);
        if (!prediction || !prediction.flashscoreId) {
            return { success: false, message: 'Pronóstico no encontrado o sin ID de Flashscore' };
        }

        if (!['pendiente', 'pending', 'live'].includes(prediction.status)) {
            return { success: false, message: 'El pronóstico no está en estado pendiente o live' };
        }

        const updatedData = await getMatchInfo(prediction.flashscoreId);
        prediction.score = updatedData.score;
        
        let newStatus = prediction.status;
        
        if (updatedData.status === 'finished') {
            const [golesLocal, golesVisitante] = updatedData.score.split('-').map(Number);
            const estado = calcularEstado(prediction.prediction, golesLocal, golesVisitante);
            
            const statusMap = {
                'ganado': 'verificado',
                'fallido': 'fallido',
                'reembolso': 'return',
                'desconocido': 'desconocido'
            };
            
            newStatus = statusMap[estado] || 'desconocido';
            
        } else if (updatedData.status === 'live') {
            newStatus = 'live';
        }

        prediction.status = newStatus;
        
        if (updatedData.datetime && updatedData.datetime.iso) {
            prediction.eventDate = moment.tz(updatedData.datetime.iso, "America/Bogota").startOf('day').toDate();
        }
        
        await prediction.save();
        return { success: true, data: prediction };
        
    } catch (error) {
        console.error('Error en validatePredictionStatus:', error);
        return { success: false, message: error.message };
    }
}

function calcularEstado(prediccion, L, V) {
    const p = prediccion.toLowerCase();
    
    if (p === 'dnb1' || p === 'dnb2') {
        if (L === V) return 'reembolso';
        return ((p === 'dnb1' && L > V) || (p === 'dnb2' && V > L)) ? 'ganado' : 'fallido';
    }
    
    const mercados = {
        '1': L > V,
        'x': L === V,
        '2': L < V,
        '1x': L >= V,
        'x2': L <= V,
        'btts_si': L > 0 && V > 0,
        'btts_no': !(L > 0 && V > 0),
        'o25': (L + V) > 2.5,
        'over 2.5': (L + V) > 2.5,
        'u25': (L + V) < 2.5,
        'under 2.5' : (L + V) < 2.5
    };
    
    if (mercados.hasOwnProperty(p)) {
        return mercados[p] ? 'ganado' : 'fallido';
    }
    
    return 'desconocido';
}

module.exports = { validatePredictionStatus };