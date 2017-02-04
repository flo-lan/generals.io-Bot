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

		this.INITIAL_WAIT_TURNS = 24;
		this.REINFORCEMENT_INTERVAL = 50;

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

		
		/*if(turn <= this.INITIAL_WAIT_TURNS) {
			//wait for 10 armies on the general
		} else*/ if(turn % this.REINFORCEMENT_INTERVAL == 0) {
			//this.spreadPhase();
		} else if(turn == 1){
			this.discover();
		}
	}

	//wait for a set amount of turns and then discover as far away from the general as possible
	discover() {
		//get all tiles, that can be reached with a maximum of moves
		let reachableTiles = this.bfs(this.ownGeneral, this.INITIAL_WAIT_TURNS / 2);
		let discoverTile = this.chooseDiscoverTile(reachableTiles);
		console.log(this.getCoordinatesFromTileID(discoverTile));
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
				foundNodes.push({"id": curTile, "generalDistance": curLayer});
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

	//!!!TODO: favour tiles near center
	//returns the furthest possible tile id from the general, while beeing not too close to the edge
	chooseDiscoverTile(tiles) {
		let generalCoords = this.getCoordinatesFromTileID(this.ownGeneral);

		//alternative tile, if no tiles with min edge distance was found
		//choose by furthest away from edge first, then most steps
		let alternativeTile = {"edgeDistance" : 0, "generalDistance": 0};

		//first elements are the closest to the general
		for(let i = tiles.length - 1; i >= 0; i--) {
			let tile = tiles[i];
			let edgeDistance = this.getDistanceFromEdgeForID(tile.id);
			//choose first best tile, if it is at least 2 tiles away from edge
			if(edgeDistance >= 2) {
				return tile.id;
			}

			//save possible alternativeTile candidates
			if(edgeDistance >= alternativeTile.edgeDistance) {
				//either edgeDistance is greater, OR at least equal with a greater general distance
				if(edgeDistance > alternativeTile.edgeDistance || 
					tile.generalDistance > alternativeTile.generalDistance) {
					alternativeTile = {"id": tile.id, "edgeDistance": edgeDistance, "generalDistance": tile.generalDistance};
				}
			}
		}

		if(alternativeTile.id === undefined) {
			console.log("No tile found. Something is going wrong here.!");
		}

		//no tile found with an edge distance of at least 2
		return alternativeTile.id;
	}

	getCoordinatesFromTileID(id) {
		return {
			"x": Math.floor(id % this.width),
			"y": Math.floor(id / this.width)
		}
	}

	//gets the distance to the closest edge. (e.g. coordinates 1,0 return 0 and 2,1 return 1)
	getDistanceFromEdgeForID(id) {
		let tileCoords = this.getCoordinatesFromTileID(id);
		let upperEdge = tileCoords.y;
		let rightEdge = this.width - tileCoords.x;
		let downEdge = this.height - tileCoords.y;
		let leftEdge = tileCoords.y;
		return Math.min(upperEdge, rightEdge, downEdge, leftEdge);
	}
}

module.exports = Bot;