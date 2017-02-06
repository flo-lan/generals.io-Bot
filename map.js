const TILE = require('./tile.js');

class GameMap {
	constructor(width, height) {
		this.width = width;
		this.height = height;
		this.size = width * height;
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
				if(adjacentRow < gameState.height) {
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
}

module.exports = Map;