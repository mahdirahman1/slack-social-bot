const { App } = require("@slack/bolt");
require("dotenv").config();
// Initializes your app with your bot token and signing secret
const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	socketMode: true, // enable the following to use socket mode
	appToken: process.env.APP_TOKEN,
});

app.command("/addinterests", async ({ command, body, logger, client, ack, say }) => {
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
							text: "Pick items from the list",
						},
						accessory: {
							action_id: "text1234",
							type: "multi_static_select",
							placeholder: {
								type: "plain_text",
								text: "Select interests",
							},
							options: [
								{
									text: {
										type: "plain_text",
										text: "*this is plain_text text*",
									},
									value: "value-0",
								},
								{
									text: {
										type: "plain_text",
										text: "*this is plain_text text*",
									},
									value: "value-1",
								},
								{
									text: {
										type: "plain_text",
										text: "*this is plain_text text*",
									},
									value: "value-2",
								},
							],
						},
					},
				],
				submit: {
					type: "plain_text",
					text: "Submit",
				},
			},
		});

    logger.info(result);

	} catch (error) {
		console.log("err");
		console.error(error);
	}
});


app.view('view_1', async ({ ack, body, view, client, logger }) => {
  // Acknowledge the view_submission request
  await ack();
  console.log('submitted stuff');

});

(async () => {
	const port = 3000;
	// Start your app
	await app.start(process.env.PORT || port);
	console.log(`⚡️ Slack Bolt app is running on port ${port}!`);
})();
