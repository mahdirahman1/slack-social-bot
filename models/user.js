const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
	id: String,
	name: String,
	interests: Object,
});

module.exports = mongoose.model("User", userSchema);
