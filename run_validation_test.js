
const mongoose = require('mongoose');
const Prediction = require('./backend/models/Prediction');
const GoalTable = require('./backend/models/GoalTable');
const connectDB = require('./backend/db');
const { validatePredictionStatus } = require('./backend/services/validateService');

async function runValidation() {
    await connectDB();
    
    // Test the new query logic
    const pendientes = await Prediction.find({ status: { $in: ['pendiente', 'pending'] } });
    console.log(`Found ${pendientes.length} pending predictions.`);
    
    for (const p of pendientes) {
        console.log(`Validating ${p.flashscoreId}...`);
        const result = await validatePredictionStatus(p._id);
        console.log('Result:', result);
    }
    
    process.exit();
}

runValidation();
