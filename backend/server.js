const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');
const fs = require('fs');
require('dotenv').config();

// Ensure temp upload directories exist (used before Cloudinary upload)
['uploads/events', 'uploads/profiles'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const ticketTypeRoutes = require('./routes/ticketTypeRoutes');
const khaltiRoutes = require('./routes/khaltiRoutes');
const esewaRoutes = require('./routes/esewaRoutes');
const chatRoutes = require('./routes/chatRoutes');
const pollRoutes = require('./routes/pollRoutes');
const questionRoutes = require('./routes/questionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes = require('./routes/profileRoutes');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Session configuration (required for passport)
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Make io accessible to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join event room
  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
    console.log(`User ${socket.id} joined event-${eventId}`);
  });

  // Leave event room
  socket.on('leave-event', (eventId) => {
    socket.leave(`event-${eventId}`);
    console.log(`User ${socket.id} left event-${eventId}`);
  });

  // Chat message
  socket.on('chat-message', (data) => {
    io.to(`event-${data.eventId}`).emit('chat-message', data);
  });

  // Poll vote
  socket.on('poll-vote', (data) => {
    io.to(`event-${data.eventId}`).emit('poll-update', data);
  });

  // Question submitted
  socket.on('question-submit', (data) => {
    io.to(`event-${data.eventId}`).emit('question-new', data);
  });

  // Question upvote
  socket.on('question-upvote', (data) => {
    io.to(`event-${data.eventId}`).emit('question-update', data);
  });

  // Organizer joined meeting
  socket.on('organizer-joined', (data) => {
    io.to(`event-${data.eventId}`).emit('organizer-joined', data);
  });

  // Ticket purchase notification
  socket.on('ticket-purchased', (data) => {
    io.to(`event-${data.eventId}`).emit('ticket-update', data);
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/ticket-types', ticketTypeRoutes);
app.use('/api/khalti', khaltiRoutes);
app.use('/api/esewa', esewaRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Nexus Backend - Authentication System with Google OAuth',
    timestamp: new Date().toISOString() 
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 Nexus Backend running on port ${PORT}`);
  console.log(`📚 Authentication System Active (Local + Google OAuth)`);
  console.log(`⚡ Socket.IO enabled for real-time features`);
});
