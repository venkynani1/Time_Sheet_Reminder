// Starts the weekly timesheet reminder API and its India-time scheduler.
require('dotenv').config();

const cors = require('cors');
const express = require('express');
const memberRoutes = require('./routes/memberRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const { health } = require('./controllers/settingsController');
const { startScheduler } = require('./services/schedulerService');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = ['http://localhost:5173', process.env.CLIENT_URL].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS.');
    error.status = 403;
    return callback(error);
  },
}));
app.use(express.json());
app.get('/api/health', health);
app.get('/api/healthChecks', health);
app.use('/api/members', memberRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/timesheet', timesheetRoutes);
app.use((err, req, res, next) => {
  if (err.status !== 403) console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'An unexpected server error occurred.' });
});

if (require.main === module) {
  startScheduler();
  app.listen(PORT, () => console.log(`Timesheet Reminder API running on http://localhost:${PORT}`));
}

module.exports = app;
