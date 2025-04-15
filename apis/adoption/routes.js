const express = require('express');
const controller = require('./controller');
const router = express.Router();

// GET /adoption/process?cow_id=UUID
router.get('/process', controller.processAdoption);

module.exports = router;