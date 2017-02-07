const TILE = require('./tile.js'); 
const GameState = require('./gameState.js');
const GameMap = require('./gameMap.js');
const Algorithms = require('./algorithms.js');
const Heuristics = require('./heuristics.js');

class Bot {

	constructor(socket, data) {
		this.socket = socket;
		this.playerIndex = data.playerIndex;

		this.INITIAL_WAIT_TURNS = 24;
		this.SECONDS_DISCOVER_TURN = Math.ceil(this.INITIAL_WAIT_TURNS * 1.5);
		this.REINFORCEMENT_INTERVAL = 50;

		//true, if bot found an adjacent enemy line with low values
		this.isInfiltrating = false;

		this.gameState = new GameState(data);
		this.gameMap = new GameMap(this.gameState.width, this.gameState.height, this.gameState.generals);
		Algorithms.gameMap = this.gameMap;
	}


	update(data) {
		this.gameState.update(data);
		
		if(this.gameState.turn <= this.INITIAL_WAIT_TURNS) {
			//wait for some armies to develop
		} else if(this.gameState.turn % this.REINFORCEMENT_INTERVAL == 0) {
			//this.spreadPhase();
		} else if(this.gameState.turn == this.INITIAL_WAIT_TURNS + 1) {
			this.discover();
		} else if(this.gameState.turn == this.SECONDS_DISCOVER_TURN) {
			this.secondDiscover();
		}
	}

	//wait for a set amount of turns and then discover as far away from the general as possible
	discover() {
		//get all tiles, that can be reached with a maximum of moves
		let reachableTiles = Algorithms.bfs(this.gameState, this.gameMap.ownGeneral, this.INITIAL_WAIT_TURNS / 2);
		let discoverTile = Heuristics.chooseDiscoverTile(this.gameMap, reachableTiles);
		let path = Algorithms.dijkstra(this.gameState, this.gameMap.ownGeneral, discoverTile);

		this.queueAttackPath(this.gameMap.ownGeneral, path);
	}

	//TODO: calculate at every step and maybe take waiting into decision tree(also moving on a tile multiple times)
	//capture as many tiles as possible before turn 50
	secondDiscover() {
		let turns = Math.ceil((this.INITIAL_WAIT_TURNS + 1) / 2 / 2);
		let path = Algorithms.decisionTreeSearch(this.gameState, this.gameMap.ownGeneral, turns);
		this.queueAttackPath(this.gameMap.ownGeneral, path);
	}

	//every tile just got an extra unit, move them to conquer new tiles 
	spreadUnits() {

	}

	queueAttackPath(startIndex, path) {
		let lastIndex = startIndex;
		for(let attackingIndex of path) {
			this.socket.emit('attack', lastIndex, attackingIndex);
			lastIndex = attackingIndex;
		}
	}
}

module.exports = Bot;