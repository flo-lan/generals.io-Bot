const TILE = require('./tile.js');

class Heuristics {
	
	//returns the furthest possible tile id from the general, with maximum distance to edge
	//tiles are arrays of Objects with id and generalDistance properties
	static chooseDiscoverTile(gameMap, tiles) {
		let generalCoords = gameMap.getCoordinatesFromTileID(gameMap.ownGeneral);

		let optimalTile = {"id": -1, "edgeWeight": 0};

		let maxGeneralDistance = tiles[tiles.length -1].generalDistance;

		//first elements are the closest to the general
		for(let i = tiles.length - 1; i >= 0; i--) {
			let tile = tiles[i];
			let edgeWeight = gameMap.getEdgeWeightForID(tile.id);
			
			//general distance is not at maximum anymore. ignore other tiles
			if(tile.generalDistance < maxGeneralDistance) {
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
			console.log("No tile found. Something is going wrong here.!");
		}
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