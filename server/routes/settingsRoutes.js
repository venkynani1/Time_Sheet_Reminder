// Maps health and manual Gmail API test endpoints to their controller functions.
const router = require('express').Router();
const controller = require('../controllers/settingsController');
router.get('/health', controller.health);
router.get('/email-template', controller.getEmailTemplate);
router.post('/test-email', controller.sendTestEmail);
router.put('/email-template', controller.updateEmailTemplate);
module.exports = router;
