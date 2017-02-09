const TILE = require('./tile.js'); 

class GameMap {

	constructor(width, height, playerIndex, generals) {
		this.width = width;
		this.height = height;
		this.size = width * height;
		this.playerIndex = playerIndex;
		this.initGeneral(generals);
	}

	initGeneral(generals) {
		for(let general of generals) {
			if(general != -1) {
				this.ownGeneral = general;
			}
		}
	}

	//needs a tile object with index and value field
	isWalkable(gameState, tile) {
		return tile.value !== TILE.FOG_OBSTACLE && 
			tile.value !== TILE.OFF_LIMITS &&
			tile.value !== TILE.MOUNTAIN && 
			!this.isCity(gameState, tile);
	}

	isCity(gameState, tile) {
		return gameState.cities.indexOf(tile.index) >= 0;
	}

	getAdjacentTiles(gameState, index) {
		let up = this.getAdjacentTile(gameState, index, -this.width);
		let right = this.getAdjacentTile(gameState, index, 1);
		let down = this.getAdjacentTile(gameState, index, this.width);
		let left = this.getAdjacentTile(gameState, index, -1);
		return {
			up, right, down, left
		};
	}

	getAdjacentTile(gameState, index, distance) {
		let adjacentIndex = index + distance;
		let curRow = Math.floor(index / this.width);
		let adjacentRow = Math.floor(adjacentIndex / this.width);
	
		switch(distance) {
			//search for either right or left neighbor
			case 1:
			case -1:
				//return only if it won't get out of grid bounds
				if(adjacentRow === curRow) {
					return {"index": adjacentIndex, "value": gameState.terrain[adjacentIndex]};
				}
				break;
			//down
			case this.width:
				if(adjacentRow < this.height) {
					return {"index": adjacentIndex, "value": gameState.terrain[adjacentIndex]};
				}
				break;
			//up
			case -this.width:
				if(adjacentRow >= 0) {
					return {"index": adjacentIndex, "value": gameState.terrain[adjacentIndex]};
				}
				break;
		}
		return {"index": adjacentIndex, "value": TILE.OFF_LIMITS};
	}

	//takes a list of tiles and returns a list of all those with at least more than 1 unit 
	getMoveableTiles(gameState) {
		let tiles = [];
		for (var [key, value] of gameState.ownTiles) {
			if(value > 1) {
				tiles.push(key);
			}
		}
			
		return tiles;
	}

	//gets a calculated distance from closest edges 
	//distance from closest edge * distance from closest edge on complementary side
	getEdgeWeightForID(id) {
		let tileCoords = this.getCoordinatesFromTileID(id);
		let upperEdge = tileCoords.y;
		let rightEdge = this.width - tileCoords.x;
		let downEdge = this.height - tileCoords.y;
		let leftEdge = tileCoords.x;
		return Math.min(upperEdge, downEdge) * Math.min(leftEdge, rightEdge);
	}

	manhattenDistance(index1, index2) {
		let coord1 = this.getCoordinatesFromTileID(index1);
		let coord2 = this.getCoordinatesFromTileID(index2);
		return Math.abs(coord1.x - coord2.x) + Math.abs(coord1.y - coord2.y);
	}

	getCoordinatesFromTileID(id) {
		return {
			"x": Math.floor(id % this.width),
			"y": Math.floor(id / this.width)
		}
	}
}

module.exports = GameMap;