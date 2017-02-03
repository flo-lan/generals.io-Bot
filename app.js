var io = require('socket.io-client');
var config = require('./config.js');
var Bot = require('./bot.js');
var Patcher = require('./updatePatcher.js');

var socket = io('http://bot.generals.io');

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
	socket.emit('join_private', custom_game_id, user_id);
	socket.emit('set_force_start', custom_game_id, true);
	console.log('Joined custom game at http://bot.generals.io/games/' + encodeURIComponent(custom_game_id));

	// Join the 1v1 queue.
	// socket.emit('join_1v1', user_id);

	// Join the FFA queue.
	// socket.emit('play', user_id);

	// Join a 2v2 team.
	// socket.emit('join_team', 'team_name', user_id);
});

// Game data.
let bot;
let playerIndex;
let cities = [];
let map = [];
let height, width, size;

socket.on('game_start', function(data) {
	// Get ready to start playing the game.
	playerIndex = data.playerIndex;
	let replay_url = 'http://bot.generals.io/replays/' + encodeURIComponent(data.replay_id);
	console.log('Game starting! The replay will be available after the game at ' + replay_url);
	socket.emit('chat_message', data.chat_room, "gl hf");
});

socket.on('game_update', function(data) {
	// Patch the city and map diffs into our local variables.
	cities = Patcher.patch(cities, data.cities_diff);
	map = Patcher.patch(map, data.map_diff);
	let generals = data.generals;

	let turn = data.turn;
	if(turn === 1) {
		// The first two terms in |map| are the dimensions.
		width = map[0];
		height = map[1];
		size = width * height;

		bot = new Bot(socket, playerIndex, width, height);
	}

	// The next |size| terms are army values.
	// armies[0] is the top-left corner of the map.
	let armies = map.slice(2, size + 1);

	// The last |size| terms are terrain values.
	// terrain[0] is the top-left corner of the map.
	let terrain = map.slice(size + 2, map.length - 1);	

	bot.update(turn, terrain, cities, generals);
});

socket.on('game_lost', leaveGame);

socket.on('game_won', leaveGame);

function leaveGame() {
	socket.emit('leave_game');
}