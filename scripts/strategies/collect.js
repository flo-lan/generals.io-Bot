const Heuristics = require('../heuristics.js');
const Algorithms = require('../algorithms.js');

class Collect {

	static getCollectArea(bot) {
		let gameState = bot.gameState;
		let gameMap = bot.gameMap;

		let enemyTarget = Heuristics.chooseEnemyTargetTile(gameState, gameMap);
		let pathToEnemy = Algorithms.aStar(gameState, gameMap, gameMap.ownGeneral, [enemyTarget.index]);
		return pathToEnemy;
	}

	static collect(bot) {
		let highestArmyIndex = this.getHighestArmyIndex(bot.gameState.ownTiles, bot.collectArea, bot.gameMap.ownGeneral);
		if(highestArmyIndex == -1) {
			//skip collecting, no tiles found
		} else {
			let pathToAttackingPath = Algorithms.aStar(bot.gameState, bot.gameMap, highestArmyIndex, bot.collectArea);
			if(pathToAttackingPath.length > 0) {
				bot.move({"start": highestArmyIndex, "end": pathToAttackingPath[0]});
			}
		}
	}

	//TODO: return list of tied highest army tiles and choose the one, which collects the most units until goal
	static getHighestArmyIndex(tiles, path, generalIndex) {
		let index = -1;
		let armies = 0;
		for (var [key, value] of tiles) {
			//TODO: ignore general
			if(value > armies && value > 1 && !path.includes(key) && key != generalIndex) {
				index = key;
				armies = value;
			}
		}
		return index;
	}
}

module.exports = Collect;