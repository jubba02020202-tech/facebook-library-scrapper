const express = require('express');
const router = express.Router();
const controller = require('../controllers/extractController');

router.post('/extract', controller.startExtraction);
router.get('/status/:sessionId', controller.getStatus);
router.get('/export/:sessionId', controller.getExport);
router.get('/sessions', controller.getSessions);

module.exports = router;
