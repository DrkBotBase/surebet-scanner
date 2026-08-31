const Prediction = require('../models/Prediction');
const { getMatchInfo } = require('./test');
const moment = require('moment-timezone');
const axios = require('axios');
const cheerio = require('cheerio');

async function validatePredictionStatus(predictionId) {
    try {
        const prediction = await Prediction.findById(predictionId);
        if (!prediction || !prediction.flashscoreId) {
            return { success: false, message: 'Pronóstico no encontrado o sin ID de Flashscore' };
        }

        if (!['pendiente', 'pending', 'live', 'not_started'].includes(prediction.status)) {
            return { success: false, message: 'El pronóstico no está en estado pendiente, live o not_started' };
        }

        const updatedData = await getMatchInfo(prediction.flashscoreId);
        prediction.score = updatedData.score;
        
        // Determinar el nuevo estado
        let newStatus = prediction.status;
        
        if (updatedData.status === 'finished') {
            let estado = 'desconocido';
            
            if (prediction.cornersUrl && prediction.prediction.startsWith('corners_')) {
                // Lógica especial para corners: scraper necesita visitar URL
                const totalCorners = await scrapearCorners(prediction.cornersUrl);
                estado = evaluarCorners(prediction.prediction, totalCorners);
            } else {
                const [golesLocal, golesVisitante] = updatedData.score.split('-').map(Number);
                estado = calcularEstado(prediction.prediction, golesLocal, golesVisitante);
            }
            
            const statusMap = {
                'ganado': 'verificado',
                'fallido': 'fallido',
                'reembolso': 'return'
            };
            
            newStatus = statusMap[estado] || 'finished';
        } else if (updatedData.status === 'live') {
            newStatus = 'live';
        } else if (updatedData.status === 'not_started') {
            newStatus = 'not_started';
        } else {
            newStatus = 'pendiente';
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

async function scrapearCorners(url) {
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(response.data);
        
        let totalCorners = 0;
        $('span').each((i, el) => {
            if ($(el).text().trim() === 'Corner kicks') {
                const home = parseInt($(el).parent().prev().find('span').text()) || 0;
                const away = parseInt($(el).parent().next().find('span').text()) || 0;
                totalCorners = home + away;
                return false;
            }
        });
        return totalCorners;
    } catch (e) {
        console.error('Error scrapearCorners:', e);
        return 0;
    }
}

function calcularEstado(prediccion, L, V, corners = 0) {
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
        'under 2.5' : (L + V) < 2.5,
        'corners_o75': corners > 7.5,
        'corners_u75': corners < 7.5,
        'corners_o105': corners > 10.5,
        'corners_u105': corners < 10.5
    };
    
    if (mercados.hasOwnProperty(p)) {
        return mercados[p] ? 'ganado' : 'fallido';
    }
    
    return 'desconocido';
}

function evaluarCorners(prediccion, corners) {
    const p = prediccion.toLowerCase();
    if (p === 'corners_o75') return corners > 7.5 ? 'ganado' : 'fallido';
    if (p === 'corners_u75') return corners < 7.5 ? 'ganado' : 'fallido';
    if (p === 'corners_o105') return corners > 10.5 ? 'ganado' : 'fallido';
    if (p === 'corners_u105') return corners < 10.5 ? 'ganado' : 'fallido';
    return 'desconocido';
}

module.exports = { validatePredictionStatus };