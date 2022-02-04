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
				value: `${interest}`,
			});
		});
		options.push(object);
	});
	return options;
};

app.command("/addinterests", async ({ command, body, logger, ack }) => {
	try {
		await ack();
		console.log(command.trigger_ids);
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

app.view("view_1", async ({ ack, body, view, client, logger }) => {
	// Acknowledge the view_submission request
	await ack();
	console.log("submitted stuff");
	const selectedOptions = [];
	view["state"]["values"]["section678"]["text1234"].selected_options.forEach(
		(interest) => {
			selectedOptions.push(interest.value);
		}
	);

	try {
		const id = body["user"]["id"];
		const found = await User.find({ id }).exec();
		const userInfo = await client.users.info({
			user: id,
		});
		const botId = body["view"]["bot_id"];
		if (found.length > 0) {
			//update
			console.log(found);
			const update = await User.updateOne(
				{ id },
				{
					$set: {
						_id: id,
						name: userInfo.user.real_name,
						interests: selectedOptions,
					},
				}
			);

			if (update) {
				// DB save was successful
				msg = "Your submission was successful";
			} else {
				msg = "There was an error with your submission";
			}

			// Message the user
			const res = await client.chat.postMessage({
				channel: id,
				text: msg,
			});
		} else {
			const user = new User({
				_id: id,
				name: userInfo.user.real_name,
				interests: selectedOptions,
			});

			const res = await user.save();
			console.log(res);
		}
		// Call the users.info method using the WebClient
	} catch (error) {
		console.error(error);
	}
});

(async () => {
	const port = 3000;
	// Start your app
	await app.start(process.env.PORT || port);
	console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();
