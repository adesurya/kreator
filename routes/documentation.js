const express = require('express');
const router = express.Router();
const documentationController = require('../controllers/documentationController');

router.get('/', documentationController.renderDocumentation);
router.get('/search', documentationController.searchDocs);

module.exports = router;