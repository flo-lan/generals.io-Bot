const io = require('socket.io-client');
const config = require('./config.js');
const Bot = require('./scripts/bot.js');

const socket = io('http://bot.generals.io');
const fs = require('fs');
const args = require('minimist')(process.argv.slice(2));

socket.on('disconnect', function() {
	console.error('Disconnected from server.');

	//terminate with failure
	process.exit(1);
});

socket.on('connect', function() {
	console.log('Connected to server.');

	let user_id = config.user_id;
	let username = config.username;
	// Set the username for the bot.
	socket.emit('set_username', user_id, username);
	
	if(args.o) {
		// Join the 1v1 queue.
		socket.emit('join_1v1', user_id);
		console.log(getFormattedDate() + ' Joined 1vs1 lobby');
	} else {
		// Join custom queue
		let custom_game_id = config.custom_game_id;
		socket.emit('join_private', custom_game_id, user_id);
		socket.emit('set_force_start', custom_game_id, true);
		console.log(getFormattedDate() + ' Custom game http://bot.generals.io/games/' + encodeURIComponent(custom_game_id));
	}

	// Join the FFA queue.
	// socket.emit('play', user_id);

	// Join a 2v2 team.
	// socket.emit('join_team', 'team_name', user_id);
});


let bot;
let playerIndex;
let replay_url = null;
let usernames;

socket.on('game_start', function(data) {
	// Get ready to start playing the game.
	playerIndex = data.playerIndex;
	replay_url = 'http://bot.generals.io/replays/' + encodeURIComponent(data.replay_id);
	usernames = data.usernames;
	console.log(getFormattedDate() + ' Game starting! playing:' + getEnemies() + ' Replay ' + replay_url);
	socket.emit('chat_message', data.chat_room, "gl hf");
});

socket.on('game_update', function(data) {
	if(bot === undefined || bot === null) {
		bot = new Bot(socket, playerIndex, data);
	}

	bot.update(data);
});

socket.on('game_lost', function() {
	leaveGame(false);
});

socket.on('game_won', function() {
	leaveGame(true);
});

function leaveGame(won) {
	socket.emit('leave_game');
	//game_lost and game_won are called at startup. make sure to not write to file in this situation
	if(replay_url !== undefined && replay_url !== null) {
		let date = getFormattedDate();
		let winningString = won ? "won" : "lost";
		let enemies = getEnemies();
		let fileString = date + ": " + winningString + " against: " + enemies + " replay: " + replay_url + "\r\n";
		fs.appendFile('history.log', fileString, function (err) {
			if(err !== null) {
				console.log("error while writing file: " + err);
			}
		});
		replay_url = null;
		bot = null;
		//socket.emit('join_1v1', config.user_id);
		let custom_game_id = config.custom_game_id;
		socket.emit('join_private', custom_game_id, config.user_id);
		socket.emit('set_force_start', custom_game_id, true);
		console.log(getFormattedDate() + ' Custom game http://bot.generals.io/games/' + encodeURIComponent(custom_game_id));
	}
}

function getEnemies() {
	let enemies = [];
	for(username of usernames) {
		if(username != "[Bot] FloBot") {
			enemies.push(username);
		}
	}
	return enemies;
}

function getFormattedDate() {
    var date = new Date();
    var str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

    return str;
}