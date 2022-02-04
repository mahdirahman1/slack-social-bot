const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
	id: String,
	name: String,
	interests: [String],
});

module.exports = mongoose.model("User", userSchema);
