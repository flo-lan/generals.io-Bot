const io = require('socket.io-client');
const config = require('./config.js');
const Bot = require('./scripts/bot.js');

const socket = io('http://bot.generals.io');
const fs = require('fs');

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
	let custom_game_id = config.custom_game_id;
	//socket.emit('join_private', custom_game_id, user_id);
	//socket.emit('set_force_start', custom_game_id, true);
	//console.log('Joined custom game at http://bot.generals.io/games/' + encodeURIComponent(custom_game_id));

	// Join the 1v1 queue.
	socket.emit('join_1v1', user_id);

	// Join the FFA queue.
	// socket.emit('play', user_id);

	// Join a 2v2 team.
	// socket.emit('join_team', 'team_name', user_id);
});

let bot;
let playerIndex;
let replay_url = null;

socket.on('game_start', function(data) {
	// Get ready to start playing the game.
	playerIndex = data.playerIndex;
	replay_url = 'http://bot.generals.io/replays/' + encodeURIComponent(data.replay_id);
	console.log('Game starting! The replay will be available after the game at ' + replay_url);
	socket.emit('chat_message', data.chat_room, "gl hf");
});

socket.on('game_update', function(data) {
	if(bot === undefined) {
		bot = new Bot(socket, playerIndex, data);
	}

	bot.update(data);
});

socket.on('game_lost', leaveGame(false));

socket.on('game_won', leaveGame(true));

function leaveGame(won) {
	socket.emit('leave_game');
	//game_lost and game_won are called at startup. make sure to not write to file in this situation
	if(replay_url !== undefined && replay_url !== null) {
		let date = getFormattedDate();
		let winningString = won ? "won" : "lost";
		let fileString = date + ": " + winningString + " replay: " + replay_url + "\r\n";
		fs.appendFile('history.log', fileString, function (err) {
			console.log("error while writing file: " + err);
		});
		replay_url = null;
	}
	socket.emit('join_1v1', config.user_id);
}

function getFormattedDate() {
    var date = new Date();
    var str = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

    return str;
}