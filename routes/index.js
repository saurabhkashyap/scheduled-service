var express = require('express');
const { example } = require('../src/controllers');
var router = express.Router();

/* GET home page. */
router.get('/', example);

module.exports = router;
