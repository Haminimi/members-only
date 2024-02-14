const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { DateTime } = require('luxon');
const User = require('../models/user');
const Message = require('../models/message');

router.get('/', async (req, res, next) => {
	try {
		const messages = await Message.find()
			.populate('author')
			.sort({ timestamp: -1 })
			.exec();
		res.render('index', { messages: messages });
	} catch (err) {
		return next(err);
	}
});

router.get('/sign-up', (req, res) => {
	res.render('sign-up-form');
});

router.post(
	'/sign-up',
	[
		body('first', 'First name must not be empty.')
			.trim()
			.isLength({ min: 1 })
			.escape(),
		body('last', 'Last name must not be empty.')
			.trim()
			.isLength({ min: 1 })
			.escape(),
		body('username')
			.trim()
			.isLength({ min: 1 })
			.escape()
			.withMessage('Username must not be empty.')
			.custom(async (value) => {
				const user = await User.findOne({ username: value });
				if (user) {
					throw new Error('Username already in use.');
				}
			}),
		body('password', 'Your password should be at least 8 characters long.')
			.trim()
			.isLength({ min: 8 })
			.escape(),
		body('passwordConfirmation', 'Passwords do not match.').custom(
			(value, { req }) => {
				return value === req.body.password;
			}
		),
	],
	async (req, res, next) => {
		try {
			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				res.render('sign-up-form', {
					errors: errors.array(),
					username: req.body.username,
					first: req.body.first,
					last: req.body.last,
				});
			} else
				bcrypt.hash(
					req.body.password,
					10,
					async (err, hashedPassword) => {
						if (err) {
							next(err);
						}

						const user = new User({
							username: req.body.username,
							firstName: req.body.first,
							lastName: req.body.last,
							password: hashedPassword,
						});
						await user.save();
						res.redirect('/log-in');
					}
				);
		} catch (err) {
			return next(err);
		}
	}
);

router.get('/log-in', (req, res) => {
	const errors = req.flash('error');
	const username = req.flash('username')[0];
	res.render('log-in-form', { errors: errors, username: username });
});

router.post('/log-in', (req, res, next) => {
	req.flash('username', req.body.username);

	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/log-in',
		failureFlash: true,
	})(req, res, next);
});

router.get('/log-out', (req, res, next) => {
	req.logout((err) => {
		if (err) {
			return next(err);
		}
		res.redirect('/');
	});
});

router.post(
	'/new-message',
	[
		body('message', 'Message must not be empty.')
			.trim()
			.isLength({ min: 1 })
			.blacklist('<>&/'),
	],
	async (req, res, next) => {
		try {
			const errors = validationResult(req);

			const message = new Message({
				message: req.body.message,
				author: req.body.author,
				timestamp: DateTime.now().toFormat('dd/MM/yyyy, HH:mm'),
			});

			if (!errors.isEmpty()) {
				res.redirect('/');
			} else {
				await message.save();
				res.redirect('/');
			}
		} catch (err) {
			return next(err);
		}
	}
);

router.post('/delete-message', async (req, res, next) => {
	try {
		await Message.findByIdAndDelete(req.body.message);
		res.redirect('/');
	} catch (err) {
		return next(err);
	}
});

router.get('/profile', (req, res) => {
	res.render('profile');
});

router.post(
	'/member',
	[
		body('code')
			.trim()
			.isLength({ min: 1 })
			.escape()
			.withMessage('Code must not be empty.')
			.custom((value) => {
				return value === 'secretcode';
			})
			.withMessage('That is not the code we are looking for.'),
	],
	async (req, res, next) => {
		try {
			const errors = validationResult(req);

			const user = await User.findById(req.body.user);

			if (!errors.isEmpty()) {
				res.render('profile', { errors: errors.array() });
			} else {
				const updatedUser = new User({
					username: user.username,
					firstName: user.firstName,
					lastName: user.lastName,
					password: user.password,
					membershipStatus: 'Member',
					_id: user._id,
				});
				await User.findByIdAndUpdate(req.body.user, updatedUser, {});
				res.redirect('/profile');
			}
		} catch (err) {
			return next(err);
		}
	}
);

router.post('/admin', async (req, res, next) => {
	try {
		const checkboxValue = req.body.admin;

		if (checkboxValue === 'on') {
			const user = await User.findById(req.body.user);

			const updatedUser = new User({
				username: user.username,
				firstName: user.firstName,
				lastName: user.lastName,
				password: user.password,
				membershipStatus: 'Admin',
				_id: user._id,
			});

			await User.findByIdAndUpdate(req.body.user, updatedUser, {});
			res.redirect('/profile');
		} else {
			const user = await User.findById(req.body.user);

			const updatedUser = new User({
				username: user.username,
				firstName: user.firstName,
				lastName: user.lastName,
				password: user.password,
				membershipStatus: 'Member',
				_id: user._id,
			});

			await User.findByIdAndUpdate(req.body.user, updatedUser, {});
			res.redirect('/profile');
		}
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
