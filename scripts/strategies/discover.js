const Algorithms = require('../algorithms.js');
const Heuristics = require('../heuristics.js');

class Discover {
	//every tile just got an extra unit, move them to conquer new tiles 
	static first(bot, waitTurns) {
		//get all tiles, that can be reached with a maximum of moves
		let radius = this.armiesReceivedTillTurn(this.INITIAL_WAIT_TURNS + 1);
		let reachableTiles = Algorithms.bfs(bot.gameState, bot.gameMap, bot.gameMap.ownGeneral, radius);
		let discoverTile = Heuristics.chooseDiscoverTile(bot.gameMap, reachableTiles);
		let moves = Algorithms.dijkstra(bot.gameState, bot.gameMap, bot.gameMap.ownGeneral, discoverTile);

		bot.queueMoves(moves);
	}

	static second(bot, waitTurns) {
		let turns = Math.ceil((waitTurns + 1) / 2 / 2);
		let moveableTiles = bot.gameMap.getMoveableTiles(bot.gameState);
		
		let move = Algorithms.decisionTreeSearch(bot.gameState, bot.gameMap, moveableTiles, turns);
		bot.move(move);
	}

	//gets the amount of armies that the general produced until a given turn
	static armiesReceivedTillTurn(turn) {
		return (turn / 2) + 1;
	}
}

module.exports = Discover;