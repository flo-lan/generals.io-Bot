var io = require('socket.io-client');
var config = require('./config.js');

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
	// Patch the city and map diffs into our local variables.
	cities = patch(cities, data.cities_diff);
	map = patch(map, data.map_diff);
	generals = data.generals;

	// The first two terms in |map| are the dimensions.
	let width = map[0];
	let height = map[1];
	let size = width * height;

	// The next |size| terms are army values.
	// armies[0] is the top-left corner of the map.
	let armies = map.slice(2, size + 1);

	// The last |size| terms are terrain values.
	// terrain[0] is the top-left corner of the map.
	var terrain = map.slice(size + 2, map.length - 1);

	doRandomMoves(terrain, size, width, height);
});

function doRandomMoves(terrain, size, width, height) {
	while(true) {
		// Pick a random tile.
		let index = Math.floor(Math.random() * size);

		// If we own this tile, make a random move starting from it.
		if (terrain[index] === playerIndex) {
			let row = Math.floor(index / width);
			let col = index % width;
			let endIndex = index;

			let rand = Math.random();
			if (rand < 0.25 && col > 0) { // left
				endIndex--;
			} else if (rand < 0.5 && col < width - 1) { // right
				endIndex++;
			} else if (rand < 0.75 && row < height - 1) { // down
				endIndex += width;
			} else if (row > 0) { //up
				endIndex -= width;
			} else {
				continue;
			}

			// Would we be attacking a city? Don't attack cities.
			if (cities.indexOf(endIndex) >= 0) {
				continue;
			}

			socket.emit('attack', index, endIndex);
			break;
		}
	}
}

socket.on('game_lost', leaveGame);

socket.on('game_won', leaveGame);

function leaveGame() {
	socket.emit('leave_game');
}

/* Returns a new array created by patching the diff into the old array.
 * The diff formatted with alternating matching and mismatching segments:
 * <Number of matching elements>
 * <Number of mismatching elements>
 * <The mismatching elements>
 * ... repeated until the end of diff.
 * Example 1: patching a diff of [1, 1, 3] onto [0, 0] yields [0, 3].
 * Example 2: patching a diff of [0, 1, 2, 1] onto [0, 0] yields [2, 0].
 */
function patch(old, diff) {
	let out = [];
	let i = 0;
	while (i < diff.length) {
		if (diff[i]) {  // matching
			Array.prototype.push.apply(out, old.slice(out.length, out.length + diff[i]));
		}
		i++;
		if (i < diff.length && diff[i]) {  // mismatching
			Array.prototype.push.apply(out, diff.slice(i + 1, i + 1 + diff[i]));
			i += diff[i];
		}
		i++;
	}
	return out;
}

socket.on('game_start', function(data) {
	// Get ready to start playing the game.
	playerIndex = data.playerIndex;
	let replay_url = 'http://bot.generals.io/replays/' + encodeURIComponent(data.replay_id);
	console.log('Game starting! The replay will be available after the game at ' + replay_url);
});