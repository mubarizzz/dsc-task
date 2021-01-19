const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const methodOverride = require('method-override');
var flash = require('connect-flash');
const mongoose = require('mongoose');

const passport = require('passport');
const LocalStrategy = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');

var User = require('./models/user');

mongoose
	.connect('mongodb://localhost:27017/tds', {
		useFindAndModify: false,
		useNewUrlParser: true,
		useUnifiedTopology: true
	})
	.then(() => console.log('Connected to DB!'))
	.catch((error) => console.log(error.message));

app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(flash());

//seedDB();

//PASSPORT CONFIGURATION

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
app.use(
	session({
		secret: 'my apps secret',
		resave: false,
		saveUninitialized: false,
		store: new MongoStore({ mongooseConnection: mongoose.connection })
	})
);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next) {
	res.locals.currentUser = req.user;
	res.locals.error = req.flash('error');
	res.locals.success = req.flash('success');
	next();
});

app.get('/', (req, res) => {
	res.render('page/landing');
});

app.get('/register', (req, res) => {
	res.render('user/register');
});

app.post('/register', (req, res) => {
	var newUser = new User({ username: req.body.username, name: req.body.name });
	User.register(newUser, req.body.password, (err, user) => {
		if (err) {
			req.flash('error', 'Email Already Taken');
			res.redirect('/register');
		} else {
			passport.authenticate('local')(req, res, () => {
				req.flash('success', 'Welcome ' + user.username);
				res.redirect('/');
			});
		}
	});
});

app.get('/login', (req, res) => {
	res.render('user/login');
});

app.post(
	'/login',
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/login'
	}),
	(req, res) => {}
);

// LOG OUT ROUTE

app.get('/logout', (req, res) => {
	req.logOut();
	req.flash('success', 'Logged You Out');
	res.redirect('/');
});

//secret page
app.get('/secret', isLoggedIn, (req, res) => {
	res.render('page/secret');
});

app.get('/view', (req, res) => {
	User.find({}, (err, user) => {
		if (err) {
			console.log(err);
		} else {
			res.render('page/view', { users: user });
		}
	});
});

app.get('/update', (req, res) => {
	if (req.user) {
		User.find({}, (err, user) => {
			if (err) {
				console.log(err);
			} else {
				res.render('page/update', { users: user });
			}
		});
	} else {
		req.flash('error', 'Please Login First');
		res.redirect('/login');
	}
});

app.post('/update', (req, res) => {
	if (req.user) {
		User.findOneAndUpdate({ username: req.user.username }, { name: req.body.name }, (err, result) => {
			if (err) {
				res.redirect('/');
			} else {
				req.flash('success', 'Name Updated');
				res.redirect('/');
			}
		});
	} else {
		res.redirect('/login');
	}
});

app.post('/delete', (req, res) => {
	if (req.user) {
		User.findOneAndDelete({ username: req.user.username }, (err, result) => {
			if (err) {
				res.redirect('/');
			} else {
				req.flash('error', 'Deleted User');
				res.redirect('/login');
			}
		});
	} else {
		req.flash('error', 'Please Login First');
		res.redirect('/login');
	}
});

//middleware
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	req.flash('error', 'Please Login First!!!!');
	res.redirect('/login');
}

app.get('/*', (req, res) => {
	res.send('<h1>This Page Does not Exist</h1>');
});

app.listen(3000, () => {
	console.log('Server Started!!');
});
