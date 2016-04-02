'use strict';

var path = process.cwd();
var ClickHandler = require(path + '/app/controllers/clickHandler.server.js');


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
			
			res.end();
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
