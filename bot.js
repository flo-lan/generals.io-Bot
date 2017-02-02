var io = require('socket.io-client');
var config = require('./config');

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
});

// Terrain Constants.
// Any tile with a nonnegative value is owned by the player corresponding to its value.
// For example, a tile with value 1 is owned by the player with playerIndex = 1.
const TILE_EMPTY = -1;
const TILE_MOUNTAIN = -2;
const TILE_FOG = -3;
const TILE_FOG_OBSTACLE = -4; // Cities and Mountains show up as Obstacles in the fog of war.

// Game data.
let playerIndex;
let generals;
let cities = [];
let map = [];

socket.on('game_start', function(data) {
	// Get ready to start playing the game.
	playerIndex = data.playerIndex;
	let replay_url = 'http://bot.generals.io/replays/' + encodeURIComponent(data.replay_id);
	console.log('Game starting! The replay will be available after the game at ' + replay_url);
});

socket.on('game_update', function(data) {
	// TODO
});

socket.on('game_lost', leaveGame);

socket.on('game_won', leaveGame);

function leaveGame() {
	socket.emit('leave_game');
}