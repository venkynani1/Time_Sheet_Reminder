// Starts the weekly timesheet reminder API and its India-time scheduler.
require('dotenv').config();

if (!process.env.DATABASE_URL) console.error('Startup configuration error: DATABASE_URL is required. Set it to the Supabase Transaction Pooler URI.');

const cors = require('cors');
const express = require('express');
const memberRoutes = require('./routes/memberRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const { dbHealth, health } = require('./controllers/settingsController');
const { startScheduler } = require('./services/schedulerService');
const whatsappService = require('./whatsappService');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  'http://localhost:5173',
  'https://time-sheet-reminder.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app');

    if (isAllowed) {
      console.log('CORS accepted:', origin);
      return callback(null, true);
    }

    console.warn('CORS rejected:', origin);
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.get('/api/health', health);
app.get('/api/healthChecks', health);
app.get('/api/db-health', dbHealth);
app.get('/api/cors-debug', (req, res) => res.json({ clientUrl: process.env.CLIENT_URL, allowedOrigins }));
app.use('/api/members', memberRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/timesheet', timesheetRoutes);
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'An unexpected server error occurred.' });
});

if (require.main === module) {
  whatsappService.initialize();
  startScheduler();
  app.listen(PORT, () => console.log(`Timesheet Reminder API running on http://localhost:${PORT}`));
}

module.exports = app;
