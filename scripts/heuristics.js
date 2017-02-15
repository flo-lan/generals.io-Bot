const TILE = require('./tile.js');

class Heuristics {
	
	//TODO: choose by manhatten distance, not breadth search distance
	//returns the furthest possible tile id from the general, with maximum distance to edge
	//tiles are arrays of Objects with id and generalDistance properties
	static chooseDiscoverTile(gameState, gameMap, tiles) {
		let generalCoords = gameMap.getCoordinatesFromTileID(gameState.ownGeneral);

		let optimalTile = {"id": -1, "edgeWeight": -1};

		let maxGeneralDistance = tiles[tiles.length -1].generalDistance;
	
		//first elements are the closest to the general
		for(let i = tiles.length - 1; i >= 0; i--) {
			let tile = tiles[i];
			let edgeWeight = gameMap.getEdgeWeightForID(tile.id);
			console.log("disc:" + tile.id + " distan: " + tile.generalDistance + " weight: " + edgeWeight);

			//general distance is not at maximum anymore. ignore other tiles
			if(tile.generalDistance < maxGeneralDistance) {
				if(optimalTile.id == -1) {
					console.log(tile.generalDistance + " maxDi: " + maxGeneralDistance);
					console.log(tiles);
				}
				return optimalTile.id;
			}

			//a tile with maximum generalDistance and 
			if(edgeWeight > optimalTile.edgeWeight) {
				optimalTile.id = tile.id;
				optimalTile.edgeWeight = edgeWeight;
			}
		}

		//loop stopped, but optimal tile was found(meaning it was only 1 step away from general)
		if(optimalTile.id != -1) {
			return optimalTile.id;
		} else {
			console.log("No tile found. Something is going wrong here!");
		}
	}

	//find an enemy tile adjcaent to fog with a minimum army value
	static chooseEnemyTargetTileByLowestArmy(gameState, gameMap) {
		let tilesWithFog = [];
		
		//loop through all visible enemy tiles
		for (let [key, value] of gameState.enemyTiles) {
			if(gameMap.isAdjacentToFog(gameState, key)) {
				tilesWithFog.push({"index": key, "value": value});
			}
		}
		if(tilesWithFog.length == 0) {
			return null;
		}

		//find one with lowest army value
		return tilesWithFog.reduce((a, b) =>
			(a.value < b.value) ? a : b
		);
	}

	//terrain must be walkable!!
	//0 if it belongs to himself, 1 for empty and 3 for enemy tile
	static calcCaptureWeight(playerIndex, terrainValue) {
		if(terrainValue == playerIndex) {
			return 0;
		} else if(terrainValue == TILE.EMPTY || terrainValue == TILE.FOG) {
			return 1;
		} else if(terrainValue < 0) {
			//tile belonds to enemy
			return 3;
		}
	}
}

module.exports = Heuristics;