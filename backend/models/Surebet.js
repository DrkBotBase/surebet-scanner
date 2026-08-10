const mongoose = require('mongoose');

const surebetSchema = new mongoose.Schema({
    event: { type: String, required: true },
    time: { type: String, required: true },
    eventDate: { type: Date, required: true },
    market: { type: String, required: true },
    line: { type: String, required: true },
    percentage: { type: String, required: true },
    bookmaker1: { type: String, required: true },
    odds1: { type: String, required: true },
    bookmaker2: { type: String, required: true },
    odds2: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Surebet', surebetSchema);
