const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
	message: { type: String, required: true },
	author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	timestamp: { type: String, required: true },
});

module.exports = mongoose.model('Message', MessageSchema);
