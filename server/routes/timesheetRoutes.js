// Maps weekly reminder and confirmation endpoints to their controller functions.
const router = require('express').Router();
const controller = require('../controllers/timesheetController');
router.get('/current-week', controller.current);
router.get('/logs', controller.logs);
router.get('/settings', controller.settings);
router.post('/confirm/:token', controller.confirm);
router.post('/send-reminders-now', controller.sendNow);
router.post('/reset-week', controller.reset);
router.post('/mark-submitted/:memberId', controller.mark);
module.exports = router;
