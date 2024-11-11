
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');
const router = require('./router');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: 'http://localhost:3000', 
        methods: ['GET', 'POST'],
        credentials: true 
    }
});

// middleware for CORS
app.use(cors({
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST'], 
    credentials: true 
}));

app.use(router);

// socket.io connection event
io.on('connect', (socket) => {
    console.log('New client connected:', socket.id);

    // join room event
    socket.on('join', ({ name, room }, callback) => {
        console.log('Join event received.'); 
        console.log(`Data received: ${JSON.stringify({ name, room })}`); 

        const { error, user } = addUser({ id: socket.id, name, room });

        if (error) {
            console.error('Join error:', error);
            return callback(error);
        }

        console.log(`User joining: Name = ${user.name}, Room = ${user.room}`); // Log user info
        socket.join(user.room);

        socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.` });
        socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });

        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

        callback();
    });

    // send message event
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', { user: user.name, text: message });
            callback();
        } else {
            console.error('User not found:', socket.id);
            callback('User not found.');
        }
    });

    // disconnect event
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', { user: 'Admin', text: `${user.name} has left.` });
            io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
        }

        console.log('Client disconnected:', socket.id);
    });
});

// start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server has started on port ${PORT}.`));

