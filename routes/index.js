'use strict';
var express = require('express');
var router = express.Router();


router.get('/', function (req, res) {
    res.render('index.ejs');
});

router.get('/signup', function (req, res){
    res.render('signup.ejs');
});
router.get('/findrestaurant', function (req, res) {
    res.render('findRestaurant.ejs');
});
module.exports = router;
