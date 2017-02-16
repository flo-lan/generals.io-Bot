const Algorithms = require('../algorithms.js');
const Collect = require('./collect.js');

class RushGeneral {

	static rush(bot) {
		if(!this.tryToKillGeneral(bot)) {
			//not enough armies adjacent to enemy general. gather some
			let start = Collect.getHighestArmyIndex(bot.gameState.ownTiles, []);
			let pathFromHighestArmyToGeneral = Algorithms.aStar(bot.gameState, bot.gameMap, start, [bot.gameState.enemyGeneral]);

			if(pathFromHighestArmyToGeneral.length > 1) {
				bot.move({"start": start, "end": pathFromHighestArmyToGeneral[1]});
			}
		}
	}

	//if player is adjacent to enemy general and has enough amrmies -> attack and return true
	//return false otherwise
	static tryToKillGeneral(bot) {
		let adjacentTiles = bot.gameMap.getAdjacentTiles(bot.gameState, bot.gameState.enemyGeneral);
		//loop through adjacent tiles
		for(let direction in adjacentTiles) {
			if(adjacentTiles.hasOwnProperty(direction)) {
				let nextTile = adjacentTiles[direction];
				if(nextTile.value == bot.gameState.playerIndex && 
					bot.gameState.armies[nextTile.index] > bot.gameState.armies[bot.gameState.enemyGeneral]) {
					bot.move({"start": nextTile.index, "end": bot.gameState.enemyGeneral});
					return true;
				}
			}
		}
		return false;
	}
}

module.exports = RushGeneral;