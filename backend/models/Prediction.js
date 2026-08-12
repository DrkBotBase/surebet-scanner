const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    event: { type: String, required: true },
    time: { type: String, required: true },
    eventDate: { type: Date, required: true },
    prediction: { type: String, required: true },
    odds: { type: String, required: true },
    bookmaker: { type: String, required: true },
    score: { type: String, default: '0:0' },
    status: { type: String, enum: ['pendiente', 'verificado', 'fallido', 'return'], default: 'pendiente' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prediction', predictionSchema);
