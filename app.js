const { App } = require("@slack/bolt");
const interestData = require("./interests");
const mongoose = require("mongoose");
const User = require("./models/user");
require("dotenv").config();
// Initializes your app with your bot token and signing secret
const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	socketMode: true, // enable the following to use socket mode
	appToken: process.env.APP_TOKEN,
	ignoreSelf: false,
});

mongoose
	.connect(
		"mongodb+srv://mahdi:" +
			process.env.MONGO_DB_PASS +
			"@clusterbotslack.1ko1w.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
		{
			useNewUrlParser: true,
		}
	)
	.then(() => console.log("Connected to DB"))
	.catch((err) => console.log(err));

const getInterestOptions = () => {
	const options = [];
	Object.keys(interestData).map((category) => {
		const object = {
			label: {
				type: "plain_text",
				text: `${category}`,
			},
			options: [],
		};
		interestData[category].map((interest) => {
			object.options.push({
				text: {
					type: "plain_text",
					text: `${interest}`,
				},
				value: `${category}-${interest}`,
			});
		});
		options.push(object);
	});
	return options;
};

app.command("/addinterests", async ({ body, ack }) => {
	try {
		await ack();
		const result = await app.client.views.open({
			trigger_id: body.trigger_id,
			view: {
				type: "modal",
				// View identifier
				callback_id: "view_1",
				title: {
					type: "plain_text",
					text: "Add my Interests",
				},
				blocks: [
					{
						type: "section",
						block_id: "section678",
						text: {
							type: "mrkdwn",
							text: "Pick as many interests as possible",
						},
						accessory: {
							action_id: "text1234",
							type: "multi_static_select",
							placeholder: {
								type: "plain_text",
								text: "Select interests",
							},
							option_groups: getInterestOptions(),
						},
					},
				],
				submit: {
					type: "plain_text",
					text: "Add",
				},
			},
		});
	} catch (error) {
		console.log("err");
		console.error(error);
	}
});

app.view("view_1", async ({ ack, body, view, client }) => {
	// Acknowledge the view_submission request
	await ack();
	const selectedOptions = {
		sports: [],
		music: [],
		videogames: [],
		TV: [],
		miscellaneous: [],
	};
	view["state"]["values"]["section678"]["text1234"].selected_options.forEach(
		(interest) => {
			const cat = interest.value.split("-")[0];
			selectedOptions[cat].push(interest.text.text);
		}
	);

	console.log(selectedOptions);

	try {
		const id = body["user"]["id"];
		const found = await User.find({ id }).exec();
		const userInfo = await client.users.info({
			user: id,
		});

		if (found.length > 0) {
			//update
			const update = await User.updateOne(
				{ id },
				{
					$set: {
						id,
						name: userInfo.user.real_name,
						interests: selectedOptions,
					},
				}
			);

			if (update) {
				// DB save was successful
				msg = "Your interests were updated succesfully!";
			} else {
				msg = "Could not update your interests :( Try again";
			}

			// Message the user
			const res = await client.chat.postMessage({
				channel: id,
				text: msg,
			});
		} else {
			const user = new User({
				id,
				name: userInfo.user.real_name,
				interests: selectedOptions,
			});

			const add = await user.save();
			if (add) {
				// DB save was successful
				msg = "Your interests were succesfully added!";
			} else {
				msg = "Could not add your interests :( Try again";
			}

			const res = await client.chat.postMessage({
				channel: id,
				text: msg,
			});
		}
		// Call the users.info method using the WebClient
	} catch (error) {
		console.error(error);
	}
});

app.command("/random-match", async ({ body, ack, say }) => {
	//get a random person from db
	// Get the count of all users

	//list their interests
	try {
		await ack();
		const count = await User.count().exec();
		if (count < 2) {
			say("Cannot find a random match :( Not enough users");
			return;
		}

		const userID = body["user_id"];
		let foundID = userID;
		let result = {};
		let string = "";

		while (foundID === userID) {
			string = "";
			const random = Math.floor(Math.random() * count);
			// Again query all users but only fetch one offset by our random #
			result = await User.findOne().skip(random).exec();
			// Tada! random user

			Object.keys(result.interests).forEach((cat) => {
				if (result.interests[cat].length !== 0) {
					const ints = result.interests[cat].join(", ");
					string += `*${
						cat.charAt(0).toUpperCase() + cat.slice(1)
					}* - ${ints}\n`;
				}
			});
			foundID = result.id;
		}

		say(`Your random match is <@${result.id}>! 
			\nTheir interests are:\n${string}
			`);
	} catch (error) {
		console.log("err");
		console.error(error);
	}
});

app.command("/common-interests", async ({ body, ack, command, say }) => {
	//get a random person from db
	// Get the count of all users

	const currentUserId = body.user_id;
	const currentUser = await User.find({ id: currentUserId });
	if (currentUser.length === 0) {
		say(
			"You have not added interests, use the /addinterests command to get started"
		);
	}
	//list their interests
	try {
		await ack();
		const userInterests = currentUser[0].interests;

		const allUsers = await User.find();

		let maxNumberOfCommonInterests = 0;
		let bestMatch = currentUser;

		allUsers.forEach((user) => {
			if (user.id !== currentUserId) {
				let commons = 0;
				Object.keys(user.interests).forEach((cat) => {
					const filteredArray = user.interests[cat].filter((value) =>
						userInterests[cat].includes(value)
					);

					commons += filteredArray.length;
				});

				if (commons > maxNumberOfCommonInterests) {
					maxNumberOfCommonInterests = commons;
					bestMatch = user;
				}
			}
		});
		if (bestMatch === currentUser) {
			say("Sorry, could not find anyone with common interests :(");
		}
		const interests = {};
		Object.keys(bestMatch.interests).forEach((cat) => {
			const filteredArray = bestMatch.interests[cat].filter((value) =>
				userInterests[cat].includes(value)
			);

			if (filteredArray.length !== 0) {
				interests[cat] = filteredArray;
			}
		});

		let string = "";
		Object.keys(interests).forEach((cat) => {
			const ints = interests[cat].join(", ");
			string += `*${cat.charAt(0).toUpperCase() + cat.slice(1)}* - ${ints}\n`;
		});
		// let string = bestMatch.interests.join(", ");
		say(
			`The match you have the most common interests with is <@${bestMatch.id}>!
			\nYour common interests are:\n${string}`
		);
	} catch (error) {
		console.log("err");
		console.error(error);
	}
});

(async () => {
	const port = 3000;
	// Start your app
	await app.start(process.env.PORT || port);
	console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();
