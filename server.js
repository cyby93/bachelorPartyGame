const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log(`Helyi IP cím: ${iface.address}`);
            }
        }
                for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }

    }
    return 'localhost';
}

app.get('/api/ip', (req, res) => {
    res.json({ ip: getLocalIp(), port: PORT });
});

io.on('connection', (socket) => {
    // console.log('Új kapcsolat: ' + socket.id);

    socket.on('identify', (type) => {
        // console.log(`Eszköz: ${type}`);
    });

    socket.on('player_join', (data) => {
        console.log(`Játékos csatlakozott: ${data.name}`);
        io.emit('host_player_joined', {
            id: socket.id,
            name: data.name,
            color: getRandomColor()
        });
    });

    // --- FONTOS VÁLTOZÁS: Twin-Stick Input kezelése ---
    socket.on('player_input', (data) => {
        // A kliens mostantól küldhet:
        // type: 'move' -> x, y (Bal joystick)
        // type: 'aim'  -> x, y (Jobb joystick)
        // type: 'action' -> btn (1-4 Gombok)

        io.emit('host_player_input', {
            id: socket.id,
            type: data.type,
            x: data.x,
            y: data.y,
            btn: data.btn
        });
    });

    socket.on('disconnect', () => {
        io.emit('host_player_left', { id: socket.id });
    });
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

server.listen(PORT, () => {
    const ip = getLocalIp();
    console.log(`🚀 SZERVER FUT! Host: http://localhost:${PORT}/host.html | Join: http://${ip}:${PORT}/controller.html`);
});