const io = require('socket.io-client');
const config = require('./config.js');
const Bot = require('./scripts/bot.js');

const socket = io('http://bot.generals.io');
const fs = require('fs');
const args = require('minimist')(process.argv.slice(2));

let bot;
let playerIndex;
let replay_url = null;
let usernames;
let started = false;
let restartWaitTime = 10000;

socket.on('disconnect', function() {
	console.error('Disconnected from server.');

	//terminate with failure
	process.exit(1);
});

socket.on('connect', function() {
	console.log('Connected to server.');

	// Set the username for the bot.
	socket.emit('set_username', config.user_id, config.username);
	
	if(args.o) {
		joinOneVsOneQueue();
	} else {
		joinCustomGameQueue();
	}

	// Join the FFA queue.
	// socket.emit('play', user_id);

	// Join a 2v2 team.
	// socket.emit('join_team', 'team_name', user_id);
});

socket.on('game_start', function(data) {
	// Get ready to start playing the game.
	playerIndex = data.playerIndex;
	started = false;
	replay_url = 'http://bot.generals.io/replays/' + encodeURIComponent(data.replay_id);
	usernames = data.usernames;
	console.log(getFormattedDate() + ' Game starting! playing:' + getEnemies() + ' Replay ' + replay_url);
	socket.emit('chat_message', data.chat_room, "gl hf");
});

socket.on('game_update', function(data) {
	if(!started) {
		console.log("start");
		bot = new Bot(socket, playerIndex, data);
		started = true;
	}
	
	bot.update(data);
});

socket.on('game_lost', function() {
	leaveGame(false);
});

socket.on('game_won', function() {
	leaveGame(true);
});

function joinOneVsOneQueue() {
	socket.emit('join_1v1', config.user_id);
	console.log(getFormattedDate() + ' 1vs1 Lobby');
}

function joinCustomGameQueue() {
	let custom_game_id = config.custom_game_id;
	socket.emit('join_private', custom_game_id, config.user_id);
	socket.emit('set_force_start', custom_game_id, true);
	console.log(getFormattedDate() + ' Custom game Lobby http://bot.generals.io/games/' + encodeURIComponent(custom_game_id));
}

function leaveGame(won) {
	socket.emit('leave_game');
	//game_lost and game_won are called at startup. make sure to not write to file in this situation
	if(replay_url !== undefined && replay_url !== null) {
		let date = getFormattedDate();
		let winningString = won ? "won" : "lost";
		let enemies = getEnemies();
		let fileString = date + " " + winningString + " against: " + enemies + " replay: " + replay_url + "\r\n";
		console.log(date + " " + winningString);
		if(args.o) {
			fs.appendFile('history.log', fileString, function (err) {
				if(err !== null) {
					console.log("error while writing file: " + err);
				}
			});
		}
		setTimeout(restart, restartWaitTime);
	}
}

function restart() {
	replay_url = null;
	if(args.o) {
		joinOneVsOneQueue();
	} else {
		joinCustomGameQueue();
	}
}

function getEnemies() {
	let enemies = [];
	for(username of usernames) {
		if(username != config.username) {
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