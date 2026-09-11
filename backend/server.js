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
const paymentRoutes = require('./routes/paymentRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { uploadsDir } = require('./middleware/uploadMiddleware');
const User = require('./models/User');
const {
  startPaymentReminderScheduler,
} = require('./jobs/paymentReminders');

const app = express();

const PORT = 5000;

const corsOptions = {
  origin: true,
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
app.use('/api/payments', paymentRoutes);
app.use('/api/users', adminUserRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.send('Rent Manager Backend is running!');
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully!');

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (adminEmail) {
      const result = await User.updateOne(
        { email: adminEmail },
        { $set: { role: 'admin', isActive: true } }
      );
      if (result.matchedCount === 0) {
        console.log(
          `ADMIN_EMAIL ${adminEmail} is not registered yet. Register that Gmail, then restart the server.`
        );
      } else {
        console.log(`Admin role assigned to ${adminEmail}`);
      }
    } else {
      console.log('ADMIN_EMAIL is not set in .env — skip admin seed');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      startPaymentReminderScheduler();
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
  });
