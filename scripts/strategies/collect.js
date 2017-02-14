const Heuristics = require('../heuristics.js');
const Algorithms = require('../algorithms.js');

class Collect {

	static getCollectArea(bot) {
		let gameState = bot.gameState;
		let gameMap = bot.gameMap;

		bot.isCollecting = true;

		//enemy tile found
		if(gameState.enemyTiles.size > 0) {
			let enemyTarget = Heuristics.chooseEnemyTargetTileByLowestArmy(gameState, gameMap);
			if(enemyTarget) {
				let pathToEnemy = Algorithms.aStar(gameState, gameMap, gameMap.ownGeneral, [enemyTarget.index]);
				return pathToEnemy;
			}
		}
		//no enemy found, TODO: gather around general (e.g. within 2 or 3 manhatten distance)
		return [gameMap.ownGeneral];
	}

	static collect(bot) {
		let highestArmyIndex = this.getHighestArmyIndex(bot.gameState.ownTiles, bot.collectArea, bot.gameMap.ownGeneral);
		if(highestArmyIndex == -1) {
			//skip collecting, no tiles found
			bot.isCollecting = false;
		} else {
			let pathToAttackingPath = Algorithms.aStar(bot.gameState, bot.gameMap, highestArmyIndex, bot.collectArea);
			//first aStar path entry is always the starting node
			if(pathToAttackingPath.length > 1) {
				bot.move({"start": highestArmyIndex, "end": pathToAttackingPath[1]});
			}
		}
	}

	//TODO: return list of tied highest army tiles and choose the one, which collects the most units until goal
	static getHighestArmyIndex(tiles, path, generalIndex) {
		let index = -1;
		let armies = 0;
		for (var [key, value] of tiles) {
			if(value > armies && value > 1 && !path.includes(key)) {
				index = key;
				armies = value;
			}
		}
		return index;
	}
}

module.exports = Collect;