const express = require('express');
const router = express.Router();
const schemeController = require('../controllers/schemeController');

router.get('/', schemeController.getSchemes);
router.post('/', schemeController.addScheme);
router.post('/sync', schemeController.syncSchemes);
router.put('/:id', schemeController.updateScheme);
router.delete('/:id', schemeController.deleteScheme);

module.exports = router;
