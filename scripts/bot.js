const GameState = require('./gameState.js');
const GameMap = require('./gameMap.js');
const Strategy = require('./strategy.js');

class Bot {

	constructor(socket, playerIndex, data) {
		this.socket = socket;

		//true, if bot found an adjacent enemy line with low values
		this.isInfiltrating = false;

		this.gameState = new GameState(data, playerIndex);
		this.gameMap = new GameMap(this.gameState.width, this.gameState.height, playerIndex, this.gameState.generals);
	}


	update(data) {
		this.gameState.update(data);
		Strategy.pickStrategy(this);
		/*
		if(this.gameState.turn <= this.INITIAL_WAIT_TURNS) {
			//wait for some armies to develop
		} else if(this.gameState.turn == this.INITIAL_WAIT_TURNS + 1) {
			//discover new tiles towards the center
			this.discover();
		} else if(this.gameState.turn >= this.SECONDS_DISCOVER_TURN 
			&& this.gameState.turn < this.REINFORCEMENT_INTERVAL) {
			//take as many new tiles as possible till reinforcements come
			this.secondDiscover();
		} else if(this.gameState.turn % this.REINFORCEMENT_INTERVAL == 0) {
			//spread new gained units
			Spread.spread(this.gameMap, this.gameState, this.gameMap.playerIndex, this);
		} else {
			if(this.gameState.enemyTiles.size > 0) {
				let enemyTarget = Heuristics.chooseEnemyTargetTile(this.gameState, this.gameMap);
			}
		}*/
	}

	queueMoves(moves) {
		for(let move of moves) {
			this.move(move);
		}
	}

	move(move) {
		if(move.end != -1) {
			this.socket.emit('attack', move.start, move.end);
		}
	}
}

module.exports = Bot;