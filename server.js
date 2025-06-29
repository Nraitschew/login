const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 7500;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https:", "http:"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    // Allow requests with no origin (mobile apps, etc)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      // Allow all localhost for development
      callback(null, true);
    } else if (origin.endsWith('.framer.app')) {
      // Allow all Framer preview domains
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Zu viele Versuche. Bitte warten Sie 15 Minuten.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Static files (login page)
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'anymize-login' });
});

// Auth routes
app.use('/api/auth', authLimiter, authRoutes);

// Serve login page for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Interner Serverfehler'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
    🚀 Anymize Login Server
    =====================
    Environment: ${process.env.NODE_ENV}
    Port: ${PORT}
    URL: http://0.0.0.0:${PORT}
    
    Endpoints:
    - GET  /              → Login page
    - POST /api/auth/request-code
    - POST /api/auth/verify
    - POST /api/auth/session
    - POST /api/auth/logout
  `);
});