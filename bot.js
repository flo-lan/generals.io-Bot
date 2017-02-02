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
	// TODO
	var user_id = config.user_id;
	var username = config.username;
});