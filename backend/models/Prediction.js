const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    event: { type: String, required: true },
    team1: { 
        name: String, 
        logo: String 
    },
    team2: { 
        name: String, 
        logo: String 
    },
    flashscoreId: { type: String },
    time: { type: String, required: true },
    eventDate: { type: Date, required: true },
    prediction: { type: String, required: true },
    cornersUrl: { type: String },
    odds: { type: String, required: true },
    bookmaker: { type: String, required: true },
    score: { type: String, default: '0:0' },
    status: { type: String, enum: ['pendiente', 'verificado', 'fallido', 'return', 'live', 'finished', 'not_started'], default: 'pendiente' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prediction', predictionSchema);
