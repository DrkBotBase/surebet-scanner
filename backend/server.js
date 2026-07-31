const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/ping', (req, res) => {
  res.send('Pong');
});

app.use((req, res, next) => {
    res.status(404).send('Err')
});

app.listen(PORT, () => {
    console.log('Servidor Online');
});