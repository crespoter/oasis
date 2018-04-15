'use strict';
var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var url = "mongodb://crespoter:blantest@ds151348.mlab.com:51348/oasis";

MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    console.log("MongoDB Connection Established");
    db.close();
});

router.get('/', function (req, res) {
    var session = req.session;
    if (session.name) {
        res.render('index.ejs', { registered: true });
    }
    else {
        res.render('index.ejs', { registered:false });
    }
});

router.get('/signup', function (req, res){
    res.render('signup.ejs');
});

router.get('/findrestaurant', function (req, res) {
    var session = req.session;
    var retObj = {};
    if (session.name) {
        retObj.registered = true;
    }
    else {
        retObj.registered =  false;
    }
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("oasis");
        dbo.collection("cities").find({}).toArray((err, data) => {
            retObj.cities = data;
            db.close();
            res.render('findRestaurant.ejs', retObj);
        });
    });  
});

router.get('/restaurant', function (req, res) {
    var session = req.session;
    var id = req.query.id;
    var retObj = {};
    if (session.name) {
        retObj.registered = true;
    }
    else {
        retObj.registered = false;
    }
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("oasis");
        dbo.collection("restaurants").findOne({ _id: ObjectID(id) }).then((data) => {
            db.close();
            retObj.restaurant = data;
            var averageRating = 0;
            var alreadyRated = false;
            for (var i = 0; i < data.rating.length; i++)
            {
                averageRating += (data.rating[i][1] / data.rating.length);
                if (data.rating[i][3] === session.email)
                    alreadyRated = true;
            }
           
            retObj.averageRating = averageRating;
            retObj.alreadyRated = alreadyRated;
            res.render('restaurant.ejs', retObj);
        });
    });  
    
});
router.get('/logout', (req, res) => {
    var session = req.session;
    session.destroy();
    res.redirect('/?message=User Logged Out');

})
router.post('/signup', function (req, res) {
    var session = req.session;
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("oasis");
        var myobj = { name: name, email: email, password: password };
        dbo.collection("users").findOne({ email: email }).then(function (data) {
            if (data == null)
            {
                dbo.collection("users").insertOne(myobj, function (err, data) {
                    if (err) throw err;
                    console.log("User Registered");
                    db.close();
                    res.redirect("/?message=User Registered. Please Login");
                });
            }
            else
            {
                res.redirect('/signup?message=Email is already registered. Please Try Logging in');
            }
        });
    });
    
});

router.post('/login',(req, res)=>{
    var session = req.session;
    var email = req.body.email;
    var password = req.body.password;
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("oasis");
        var searchObj = { email: email, password: password };
        dbo.collection("users").findOne(searchObj).then(function (data) {
            if (data == null) {
                searchObj = { email: email };
                dbo.collection("users").findOne(searchObj).then(function (data) {
                    if (data == null)
                    {
                        res.redirect("/?message=This email is not registered. Please register to login");
                    }
                    else
                    {
                        res.redirect("/?message=You have entered the wrong password");
                    }
                    db.close();
                });
            }
            else
            {
                session.name = data.name;
                session.email = data.email;
                res.redirect("/?message=Successfully Logged In");
                db.close();
            }
        });
    });
});



router.post('/rate', (req, res) => {
    var session = req.session;
    var rating = req.body.rating;
    var comment = req.body.comment;
    var restaurantId = req.body.idrestaurant;

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("oasis");
        var searchObj = { email: session.email };
        dbo.collection("users").findOne(searchObj).then(function (data) {
            var name = data.name;
            dbo.collection("restaurants").findOne({ _id: ObjectID(restaurantId) }).then(function (data) {
                data.rating.push([name, parseInt(rating), comment, session.email]);
                dbo.collection("restaurants").updateOne({ _id: ObjectID(restaurantId) }, { $set: { rating: data.rating } }, function (err, data) {
                    if (err) throw err;
                    console.log("Rating Submitted");
                    res.redirect("/restaurant?id=" + restaurantId);
                })
            });
        });
    });
});



//==========================================================================APIS========================================================================================

router.get('/api/findrestaurants', (req, res) => {
    var retObj = [];
    var search = req.query.search;
    var searchObj = { city: req.query.city, type: req.query.type };
    if (req.query.type === "None")
        searchObj = { city: req.query.city };
    var regex = "";
    if (search == null)
    {
        regex = new RegExp(/.*/);
    }
    else
    {
        regex = new RegExp(search, 'i');
    }

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("oasis");
        dbo.collection("restaurants").find(searchObj).toArray((err, data) => {
            for (var i = 0; i < data.length; i++) {
                if (data[i].name.match(regex))
                    retObj.push(data[i]);
            }
            db.close();
            res.json(retObj);
        });
    });
});


router.get('/api/findCity', (req, res) => {
    var city = req.query.city;
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("oasis");
        dbo.collection("cities").findOne({ name: city }).then((data) => {
            res.json(data); 
        });
    });
});




module.exports = router;
