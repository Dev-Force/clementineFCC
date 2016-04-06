'use strict';

var path = process.cwd();
var ClickHandler = require(path + '/app/controllers/clickHandler.server.js');
var validurl = require('valid-url');
var URL = require('../models/url');
var Images = require('../models/images');
var Bing = require('node-bing-api')({ accKey: "VRAFeiNTP31dbq0goGu60OTxAC0rBMECjtzlRTFHd7c=" });
var multer = require('multer');
var upload = multer();

var cors = function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    };

module.exports = function (app, passport) {

	function isLoggedIn (req, res, next) {
		if (req.isAuthenticated()) {
			return next();
		} else {
			res.redirect('/login');
		}
	}

	var clickHandler = new ClickHandler();

	app.route('/')
		.get(isLoggedIn, function (req, res) {
			res.sendFile(path + '/public/index.html');
		});

	app.route('/login')
		.get(function (req, res) {
			res.sendFile(path + '/public/login.html');
		});

	app.route('/logout')
		.get(function (req, res) {
			req.logout();
			res.redirect('/login');
		});

	app.route('/profile')
		.get(isLoggedIn, function (req, res) {
			res.sendFile(path + '/public/profile.html');
		});

	app.route('/api/:id')
		.get(isLoggedIn, function (req, res) {
			res.json(req.user.github);
		});

	app.route('/auth/github')
		.get(passport.authenticate('github'));

	app.route('/auth/github/callback')
		.get(passport.authenticate('github', {
			successRedirect: '/',
			failureRedirect: '/login'
		}));

	app.route('/api/:id/clicks')
		.get(isLoggedIn, clickHandler.getClicks)
		.post(isLoggedIn, clickHandler.addClick)
		.delete(isLoggedIn, clickHandler.resetClicks);
		
	// Custom
	app.route('/whoami')
		.get(function(req, res) {
			res.contentType('application/json');
			var useragent = req.headers['user-agent'];
			var words = [];
			useragent.replace(/\((.+?)\)/g, function($0, $1) { words.push($1) })
	
			res.send({
				ipaddress: req.headers['x-forwarded-for'],
				language: req.headers["accept-language"].split(',')[0],
				software: words[0]
			});
			
		});
	
	app.route('/new/*')
		.get(function(req, res) {
			res.contentType('application/json');
			if(validurl.isWebUri(req.params[0])) { // if its a valid url
				URL.findOne({uri: req.params[0]}, function(err, data) {
					if(err) throw err;
					console.log(data);
					if(data != null) {
						res.json({original_url: req.params[0], short_url: req.protocol + '://' + req.get('host') + '/' + data.id });
					} else {
						URL.findOne().sort({x:1}).exec(function(err, sorted) {
							if(err) throw err;
							console.log(sorted);
							var newURL = new URL();
							newURL.id = (sorted == null) ? 0 : (+sorted.id + 1);
							newURL.uri = req.params[0];
							newURL.short_url = req.protocol + '://' + req.get('host') + '/' + newURL.id
		
							newURL.save(function (err) {
								if (err) throw err;
								// console log message
								res.json({
									original_url: newURL.uri,
									short_url: newURL.short_url
								});
								
							});	
						});						
					}
				});
			} else {
				res.send('this is not a valid URI');
			}
		});
		
	app.route('/url/*')
		.get(function(req, res) {
			// URL.find(function(err, data) {
			// 	res.send(data);
			// });
			if(!isNaN(req.params[0])) { // If its a number
				URL.findOne({id: req.params[0]}, function(err, data) {
					if(err) throw err;
					if(data != null) {
						console.log(data.uri);
						res.redirect(data.uri);
						// res.json({original_url: req.params[0], short_url: req.protocol + '://' + req.get('host') + '/' + data.id });
					} else {
						res.send('No such shortlink');
					}
				});
			} else {
				res.send('Invalid shortlink');
			}
		});
	
	app.route('/imagesearch/:string')
		.get(function(req, res) {
			var offset = 0;
			if(req.query.offset != null) {
				offset = +req.query.offset;
			}
			
			var image = new Images();
			image.term = req.params.string;
			image.save();
			
			if(isNaN(offset) || offset<0) {
				res.send('Wrong offset. Must be a positive integer');
				return;
			}
			
			Bing.images(req.params.string, {top: 10, skip: 10*offset}, function(err, response, body) {
				if(err) throw err;
				var images = [];
				
				body.d.results.forEach(function(image) {
					images.push({
						Url: image.MediaUrl,
						AltText: image.Title,
						PageUrl: image.SourceUrl
					});
				});
			  	res.json(images);
			});
		});
	
	app.route('/latest/imagesearch')
		.get(function(req, res) {
			Images.find({}, {
					_id: 0,
					term: 1,
					createdAt: 1
				},function(err, data) {
					if(err) throw err;
					res.send(data);
				});
		});	
		
	app.route('/fileupload')
		.get(function(req, res) {
			res.sendFile(path + '/public/fileupload.html');
		});
	
	app.route('/fileanalyse')
		.post(upload.single('the-file'), cors, function(req, res, next) {
			console.log(req.file);
			res.json({fileSize: req.file.size});
		});
		
		
	app.route('/:datetime')
		.get(function(req, res) {
			res.contentType('application/json');
			if(isNaN(+req.params.datetime)){
				var datetime = Date.parse(req.params.datetime);
				if(!datetime) {
					res.json({
						unix: null,
						natural: null
					});
				} else {
					datetime = new Date(datetime);
					res.json({
						unix: +(datetime.getTime()/1000),
						natural: req.params.datetime
					});
				}
			} else {
				var unixtime = new Date(+req.params.datetime*1000);
				var monthNames = ["January", "February", "March", "April", "May", "June",
				  "July", "August", "September", "October", "November", "December"
				];
				
				res.json({
					unix: +req.params.datetime,
					natural: monthNames[unixtime.getMonth()] + ' ' + unixtime.getDate() + ', ' + unixtime.getFullYear()
				});
			
			}
			
			res.end();
			
		});
};
