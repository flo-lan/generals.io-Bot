const Spread = require('./strategies/spread.js');
const Discover = require('./strategies/discover.js');
const Heuristics = require('./heuristics.js');

//armies are always given at even turn numbers
//turn 1 -> 1 turn 2 -> 2, turn 4 -> 3, turn 24 -> 13 (turn / 2 + 1) = army count
let INITIAL_WAIT_TURNS = 23;
let SECONDS_DISCOVER_TURN = Math.ceil((INITIAL_WAIT_TURNS + 1) * 1.5);
let REINFORCEMENT_INTERVAL = 50;

class Strategy {

	static pickStrategy(bot) {
		let turn = bot.gameState.turn;

		if(turn % REINFORCEMENT_INTERVAL == 0) {
			Spread.spread(bot);
		}
		else if(turn < REINFORCEMENT_INTERVAL) {
			this.earlyGame(bot, turn);
		} else if(false) { //TODO: check if enemy general was found
			this.endGame(bot, turn);
		} else {
			this.midGame(bot, turn);
		}
	}

	static earlyGame(bot, turn) {
		if(turn <= INITIAL_WAIT_TURNS) {
			//wait for some armies to develop
		} else if(turn == INITIAL_WAIT_TURNS + 1) {
			//discover new tiles towards the center
			Discover.first(bot, INITIAL_WAIT_TURNS);
		} else if(turn >= SECONDS_DISCOVER_TURN) {
			//take as many new tiles as possible till reinforcements come
			Discover.second(bot, INITIAL_WAIT_TURNS);
		} 
	}

	static midGame(bot, turn) {
		if(bot.gameState.enemyTiles.size > 0) {
			let enemyTarget = Heuristics.chooseEnemyTargetTile(bot.gameState, bot.gameMap);
		}
	}

	static endGame(bot, turn) {

	}
}

module.exports = Strategy;