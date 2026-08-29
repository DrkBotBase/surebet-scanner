
const mongoose = require('mongoose');
const Prediction = require('./backend/models/Prediction');
const GoalTable = require('./backend/models/GoalTable');
const connectDB = require('./backend/db');

async function checkSpecificMatch() {
    await connectDB();
    
    const flashscoreId = '8WJPrmXp';
    
    const prediction = await Prediction.findOne({ flashscoreId: flashscoreId });
    const goalTable = await GoalTable.findOne({ flashscoreId: flashscoreId });
    
    if (prediction) {
        console.log(`Encontrado en Prediction: ID=${prediction._id}, Status=${prediction.status}`);
    } else if (goalTable) {
        console.log(`Encontrado en GoalTable: ID=${goalTable._id}, Status=${goalTable.status}`);
    } else {
        console.log(`No encontrado en ninguna colección con flashscoreId: ${flashscoreId}`);
    }
    
    process.exit();
}

checkSpecificMatch();
