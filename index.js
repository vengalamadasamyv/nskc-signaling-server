// index.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

const rooms = {};

io.on('connection', socket => {
  console.log('client connected', socket.id);

  socket.on('join-room', ({ meetingId, userId, name, role }) => {
    socket.join(meetingId);
    socket.meetingId = meetingId;
    socket.userId = userId;
    socket.name = name || 'Anonymous';
    socket.role = role || 'student';

    // Notify existing users
    socket.to(meetingId).emit('user-joined', {
      socketId: socket.id,
      userId,
      name: socket.name,
      role: socket.role
    });

    // Send list of existing clients to this user
    const clients = Array.from(io.sockets.adapter.rooms.get(meetingId) || []);
    socket.emit('room-clients', clients.filter(id => id !== socket.id));
  });

  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('chat-message', ({ meetingId, message, name }) => {
    io.to(meetingId).emit('chat-message', { from: socket.id, name, message, ts: Date.now() });
  });

  socket.on('disconnect', () => {
    if (socket.meetingId) {
      socket.to(socket.meetingId).emit('user-left', { socketId: socket.id });
    }
    console.log('client disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));
