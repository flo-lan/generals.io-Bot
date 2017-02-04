class Bot {

	constructor(socket, generals, playerIndex, width, height) {
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

		//true, if bot found an adjacent enemy line with low values
		this.isInfiltrating = false;

		this.initGeneral(generals);
	}

	initGeneral(generals) {
		for(let general of generals) {
			if(general != -1) {
				this.ownGeneral = general;
			}
		}
	}

	update(turn, armies, terrain, cities, generals) {
		this.armies = armies;
		this.terrain = terrain;
		this.cities = cities;
		this.generals = generals;

		this.ownedTiles = this.getOwnedTiles();

		
		if(turn <= 20) {
			//wait for 10 armies on the general
		} else if(turn % 25 == 0) {
			//this.spreadPhase();
		} else {
			this.discover();
		}
	}

	discover() {
		//get all tiles, that can be reached with a maximum of 10 moves
		let reachableTiles = this.bfs(this.ownGeneral, 10);
	}

	//every tile just got an extra unit, move them to conquer new tiles 
	spreadUnits() {

	}

	doRandomMoves() {
		while(true) {
			// Pick a random tile.
			let index = Math.floor(Math.random() * this.size);
			// If we own this tile, make a random move starting from it.
			if (this.terrain[index] === this.playerIndex) {
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
				if (this.cities.indexOf(endIndex) >= 0) {
					continue;
				}

				this.socket.emit('attack', index, endIndex);
				break;
			}
		}
	}

	getAdjacentTiles(index) {
		let up = this.getAdjacentTile(index, -this.width);
		let right = this.getAdjacentTile(index, 1);
		let down = this.getAdjacentTile(index, this.width);
		let left = this.getAdjacentTile(index, -1);
		return {
			up, right, down, left
		};
	}

	getAdjacentTile(index, distance) {
		let adjacentIndex = index + distance;
		let curRow = Math.floor(index / this.width);
		let adjacentRow = Math.floor(adjacentIndex / this.width);
	
		switch(distance) {
			//search for either right or left neighbor
			case 1:
			case -1:
				//return only if it won't get out of grid bounds
				if(adjacentRow === curRow) {
					return {"index": adjacentIndex, "value": this.terrain[adjacentIndex]};
				}
				break;
			//down
			case this.width:
				if(adjacentRow < this.height) {
					return {"index": adjacentIndex, "value": this.terrain[adjacentIndex]};
				}
				break;
			//up
			case -this.width:
				if(adjacentRow >= 0) {
					return {"index": adjacentIndex, "value": this.terrain[adjacentIndex]};
				}
				break;
		}
		return {"index": adjacentIndex, "value": this.TILE_OFF_LIMITS};
	}

	getOwnedTiles() {
		let ownedTiles = new Map();
		for(let i = 0; i < this.terrain.length; i++) {
			let tile = this.terrain[i];
			if(tile == this.playerIndex) {
				ownedTiles.set(i, this.armies[i]);
			}
		}
		return ownedTiles;
	}

	//breadth first search. get all reachble tiles in radius
	bfs(node, radius) {
		let isVisited = Array.apply(null, Array(this.size)).map(function () { return false; })
		isVisited[node] = true;
		
		let queue = [];
		let curLayer = 0;
		let curLayerTiles = 1;
		let nextLayerTiles = 0;
		let foundNodes = [];

		queue.push(node);
		while(queue.length > 0) {
			let curTile = queue.shift();

			//don't add starting node
			if(curLayer != 0) {
				foundNodes.push(curTile);
			}
			
			let adjacentTiles = this.getAdjacentTiles(curTile);
			//loop through adjacent tiles
			for(let direction in adjacentTiles) {
				if (adjacentTiles.hasOwnProperty(direction)) {
					let nextTile = adjacentTiles[direction];
					if(!isVisited[nextTile.index]) {
						//tile can be moved on(ignore cities)
						if(nextTile.value !== this.TILE_FOG_OBSTACLE && nextTile.value !== this.TILE_OFF_LIMITS &&
						   nextTile.value !== this.TILE_MOUNTAIN && this.cities.indexOf(nextTile.index) < 0) {
							queue.push(nextTile.index);
							isVisited[nextTile.index] = true;
							nextLayerTiles++;
						}
					}
				}
			}

			//check if all tiles of current depth are already visited
			if(--curLayerTiles == 0) {
				//move to next layer, if radius reached -> stop
				if(curLayer++ == radius) {
					break;
				}	
				curLayerTiles = nextLayerTiles;
				nextLayerTiles = 0;
			}
		}
		return foundNodes;
	}
}

module.exports = Bot;