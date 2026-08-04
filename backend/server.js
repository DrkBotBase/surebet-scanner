const express = require('express');
const path = require('path');
const http = require('http');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const MAX_CONNECTIONS = 100;
let activeConnections = 0;

server.on('connection', (socket) => {
    activeConnections++;
    if (activeConnections > MAX_CONNECTIONS) {
        socket.destroy();
        activeConnections--;
        console.warn('⚠️ Conexión rechazada: límite excedido');
        return;
    }
    
    socket.on('close', () => {
        activeConnections--;
    });
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

app.use(express.json({ limit: '10mb' }));
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

server.listen(PORT, () => {
    console.log('Servidor Online');
});