// index.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

const rooms = {}; // store metadata of each room

io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', ({ meetingId, userId, name, role }) => {
    socket.join(meetingId);
    socket.meetingId = meetingId;
    socket.userId = userId;
    socket.name = name || 'Anonymous';
    socket.role = role || 'student';

    if (!rooms[meetingId]) rooms[meetingId] = {};
    rooms[meetingId][socket.id] = { userId, name: socket.name, role: socket.role };

    // Notify existing users
    socket.to(meetingId).emit('user-joined', {
      socketId: socket.id,
      userId,
      name: socket.name,
      role: socket.role
    });

    // Send current users to new joiner
    const clients = Object.entries(rooms[meetingId])
      .filter(([id]) => id !== socket.id)
      .map(([id, info]) => ({ socketId: id, ...info }));

    socket.emit('room-clients', clients);
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
      if (rooms[socket.meetingId]) delete rooms[socket.meetingId][socket.id];
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));
