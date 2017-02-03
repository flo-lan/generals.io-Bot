class Bot {

	constructor(socket, playerIndex, width, height) {
		// Terrain Constants.
		// Any tile with a nonnegative value is owned by the player corresponding to its value.
		// For example, a tile with value 1 is owned by the player with playerIndex = 1.
		this.TILE_EMPTY = -1;
		this.TILE_MOUNTAIN = -2;
		this.TILE_FOG = -3;
		this.TILE_FOG_OBSTACLE = -4; // Cities and Mountains show up as Obstacles in the fog of war.
		this.TILE_OFF_LIMITS = -5;

		this.socket = socket;
		this.playerIndex = playerIndex;
		this.width = width;
		this.height = height;
		this.size = width * height;
	}

	update(turn, terrain, cities, generals) {
		//wait for the first 10 moves
		if(turn > 10) {
			this.doRandomMoves(terrain, cities);
		}
	}

	getAdjacentTiles(index, terrain) {
		let up = this.getAdjacentTile(terrain, index, -width);
		let right = this.getAdjacentTile(terrain, index, 1);
		let down = this.getAdjacentTile(terrain, index, width);
		let left = this.getAdjacentTile(terrain, index, -1);
		return tileNeighbours = {
			left, right, up, down
		};
	}

	getAdjacentTile(terrain, index, distance) {
		let adjacentIndex = index + distance;
		let curRow = Math.floor(index / this.width);
		let adjacentRow = Math.floor(adjacentIndex / this.width);
		switch(distance) {
			//search for either right or left neighbor
			case 1:
			case -1:
				//return only if it won't get out of grid bounds
				if(adjacentRow === curRow) {
					return terrain[adjacentIndex];
				}
				break;
			//down
			case width:
				if(adjacentRow < this.height) {
					return terrain[adjacentIndex];
				}
				break;
			//up
			case -width:
				if(adjacentRow >= 0) {
					return terrain[adjacentIndex];
				}
				break;
		}
		return this.TILE_OFF_LIMITS;
	}

	doRandomMoves(terrain, cities) {
		while(true) {
			// Pick a random tile.
			let index = Math.floor(Math.random() * this.size);
			// If we own this tile, make a random move starting from it.
			if (terrain[index] === this.playerIndex) {
				let row = Math.floor(index / this.width);
				let col = index % this.width;
				let endIndex = index;

				let rand = Math.random();
				if (rand < 0.25 && col > 0) { // left
					endIndex--;
				} else if (rand < 0.5 && col < this.width - 1) { // right
					endIndex++;
				} else if (rand < 0.75 && row < this.height - 1) { // down
					endIndex += this.width;
				} else if (row > 0) { //up
					endIndex -= this.width;
				} else {
					continue;
				}

				// Would we be attacking a city? Don't attack cities.
				if (cities.indexOf(endIndex) >= 0) {
					continue;
				}

				this.socket.emit('attack', index, endIndex);
				break;
			}
		}
	}
}

module.exports = Bot;