const ws = require('ws');
const cors = require('cors');
const url = require('node:url');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

const users = [
	{
		username: 'blade',
		password: 'thor',
		authKey: 'bbb-555'
	},
	{
		username: 'vampir',
		password: 'black',
		authKey: 'vvv-666'
	}
];

app.post('/api/auth', (req, res) => {
	const { username, password } = req.body;
	for (let i = 0; i < users.length; i++) {
		const currentUser = users[i];

		if (currentUser.username == username || currentUser.password == password) {
			return res.send({ authKey: currentUser.authKey });
		};
	};

	return res.status(401).send({ message: "No Such User" });
});

app.listen(port, () => {
	console.log(`Server is Running on ${port} port!`);
});


const server = new ws.Server({
	port: 4000,
});

server.on('connection', (client, req) => {

	const { query } = url.parse(req.url, true);
	const { authKey } = query;

	let user = null;
	for (let i = 0; i < users.length; i++) {
		if (users[i].authKey == authKey) {
			users[i].client = client;
			user = users[i];
		};
	};

	if (!user) {
		client.send('Unauthorized');
		client.close();
	} else {
		client.send('Welcome to the BEST CHAT ' + user.username + ' jan');
	};

	client.on('message', message => {
		users.forEach(cl => {
			cl.client.send('From: ' + user.username + '. > ' + message.toString());
		});
	});

});