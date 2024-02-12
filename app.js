const express = require('express');
/* const createError = require('http-errors'); */
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const compression = require('compression');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

require('dotenv').config();

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

const mongoDb = process.env.MONGODB;
mongoose.connect(mongoDb);
const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'mongo connection error'));

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Passport
passport.use(
	new LocalStrategy(async (username, password, done) => {
		try {
			const user = await User.findOne({ username: username });
			if (!user) {
				return done(null, false, { message: 'Incorrect username' });
			}
			if (user.password !== password) {
				return done(null, false, { message: 'Incorrect password' });
			}
			return done(null, user);
		} catch (err) {
			done(err);
		}
	})
);

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (err) {
		done(err);
	}
});

app.use(compression());
if (process.env.NODE_ENV !== 'production') {
	app.use(logger('dev'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/users', usersRouter);

/* app.use(function (req, res, next) {
	next(createError(404));
}); */

app.use(function (err, req, res, next) {
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
