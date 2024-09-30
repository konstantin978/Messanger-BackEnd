const ws = require('ws');
const cors = require('cors');
const url = require('node:url');
const errors = require('./error');
const express = require('express');
const usersModel = require('./db');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

mongoose.connect('mongodb://localhost:27017/chat');

const app = express();
const clients = new Map();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

app.post('/api/register', async (req, res) => {
	const { username, password } = req.body;
	try {
		if (!username) {
			throw new errors.MissingUsernameError();
		};
		if (!password) {
			throw new errors.MissingPasswordError();
		};

		const authKey = username[0] + (Math.random() * 10);

		const newUser = new usersModel({ username, password, authKey });
		await newUser.save();
		res.send('{"message": "Successfully!"}');

	} catch (err) {
		res.send(`Error Status Code: ${err.code}, Error Message: ${err.message}`);
	}
});


app.post('/api/auth', async (req, res) => {
	const { username, password } = req.body;

	try {

		if (!username) {
			throw new errors.MissingUsernameError();
		};
		if (!password) {
			throw new errors.MissingPasswordError();
		};

		const currentUser = await usersModel.findOne({ username });

		if (!currentUser) {
			throw new errors.UserNotFoundError();
		};

		if (currentUser.username === username || currentUser.password === password) {
			return res.send({ authKey: currentUser.authKey });
		};
	} catch (err) {
		res.send(`Error Status Code: ${err.code}, Error Message: ${err.message}`);
	}
});



app.post('/follow', async (req, res) => {
	const { firstUsername, secondUsername } = req.body;
	try {

		if (!firstUsername) {
			throw new errors.MissingFirstUsernameError();
		};

		if (!secondUsername) {
			throw new errors.MissingSecondUsernameError();
		};

		const firstUser = await usersModel.findOne({ username: firstUsername });
		const secondUser = await usersModel.findOne({ username: secondUsername });
		
		if(!firstUser) {
			throw new errors.UserNotFoundError();
		};

		if(!secondUser){
			throw new errors.UserNotFoundError();
		};

		for (let i = 0; i < firstUser.followings.length; ++i) {
			if (firstUser.followings[i] == secondUsername) {
				throw new errors.AlreadyFollowingError();
			};
		};

		firstUser.followings.push(secondUser.username);
		secondUser.followers.push(firstUser.username);

		await firstUser.save();
		await secondUser.save();
		res.send(`Successfully ${secondUsername} followed by ${firstUsername}`);
	} catch (err) {
		res.send(`Error Status Code: ${err.code}, Error Message: ${err.message}`);
	}
});


app.listen(port, () => {
	console.log(`Server is Running on ${port} port!`);
});

// WEB SOCKETS

const server = new ws.Server({
	port: 4000,
});

server.on('connection', async (client, req) => {

	const { query } = url.parse(req.url, true);
	const { authKey } = query;

	const user = await usersModel.findOne({ authKey });

	if (!user) {
		client.send('Unauthorized');
		client.close();
	};

	client.send(`Welcome to the BEST CHAT ${user.username} jan`);

	user.connected = true;
	await user.save();

	clients.set(user._id.toString(), client);

	client.on('message', async (message) => {
		let messageString = typeof message === 'string' ? message : message.toString();

		const messageParts = messageString.split(':');

		try {
			if (messageParts.length < 2) {
				throw new errors.InvalidMessageSyntaxError();
			}

			const recipientUsername = messageParts[0].trim();
			const messageText = messageParts.slice(1).join(':').trim();

			const recipientUser = await usersModel.findOne({ username: recipientUsername });

			if (!recipientUser) {
				throw new errors.UserNotFoundError();
			}

			if (!user.followings.includes(recipientUsername)) {
				throw new errors.AccessDeniedError();
			}

			const recipientClient = clients.get(recipientUser._id.toString());
			if (recipientClient && recipientClient.readyState === ws.OPEN) {
				recipientClient.send(`${user.username}: ${messageText}`);
			} else {
				throw new errors.UserNotConnectedError();
			}
		} catch (err) {
			client.send(`Error Message: ${err.message}`);
		};
	});

	client.on('close', async () => {
		user.connected = false;
		await user.save();
		clients.delete(user._id.toString());
	});
});
