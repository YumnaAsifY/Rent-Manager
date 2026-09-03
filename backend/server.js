const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const rentalRequestRoutes = require('./routes/rentalRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { uploadsDir } = require('./middleware/uploadMiddleware');

const app = express();

const PORT = 5000;

// Allow Expo Web on localhost and the laptop LAN IP (phone / Expo Go).
const isLocalDevelopmentOrigin = (origin) => {
  return /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$/.test(
    origin
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || isLocalDevelopmentOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/rental-requests', rentalRequestRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('Rent Manager Backend is running!');
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully!');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
  });
