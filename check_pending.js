
const mongoose = require('mongoose');
const Prediction = require('./backend/models/Prediction');
const GoalTable = require('./backend/models/GoalTable');
const connectDB = require('./backend/db');

async function checkPending() {
    await connectDB();
    
    const pendientesPronosticos = await Prediction.find({ status: 'pendiente' });
    const pendientesGoles = await GoalTable.find({ status: 'pendiente' });
    
    console.log(`Pronosticos pendientes: ${pendientesPronosticos.length}`);
    console.log(`GoalTables pendientes: ${pendientesGoles.length}`);
    
    process.exit();
}

checkPending();
