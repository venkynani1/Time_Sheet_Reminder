// Maps member CRUD endpoints to their controller functions.
const router = require('express').Router();
const controller = require('../controllers/memberController');
router.get('/', controller.list);
router.post('/', controller.create);
router.post('/import', controller.importCsv);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
module.exports = router;
