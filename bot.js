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
		this.SECONDS_DISCOVER_TURN = Math.ceil(this.INITIAL_WAIT_TURNS * 1.5);
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

		//console.log("turn: " + turn + " armies: " + armies[this.ownGeneral]);
		
		if(turn <= this.INITIAL_WAIT_TURNS) {
			//wait for some armies to develop
		} else if(turn % this.REINFORCEMENT_INTERVAL == 0) {
			//this.spreadPhase();
		} else if(turn == this.INITIAL_WAIT_TURNS + 1){
			this.discover();
		} else if(turn == this.SECONDS_DISCOVER_TURN){
			this.secondDiscover();
		}
	}

	//wait for a set amount of turns and then discover as far away from the general as possible
	discover() {
		//get all tiles, that can be reached with a maximum of moves
		let reachableTiles = this.bfs(this.ownGeneral, this.INITIAL_WAIT_TURNS / 2);
		let discoverTile = this.chooseDiscoverTile(reachableTiles);
		let path = this.dijkstra(this.ownGeneral, discoverTile);

		this.queueAttackPath(this.ownGeneral, path);
	}

	//capture as many tiles as possible before turn 50
	secondDiscover() {
		let turns = Math.ceil((this.INITIAL_WAIT_TURNS + 1) / 2 / 2);
		let path = this.decisionTreeSearch(this.ownGeneral, turns);
		this.queueAttackPath(this.ownGeneral, path);
	}

	//every tile just got an extra unit, move them to conquer new tiles 
	spreadUnits() {

	}

	queueAttackPath(startIndex, path) {
		let lastIndex = startIndex;
		for(let attackingIndex of path) {
			this.socket.emit('attack', lastIndex, attackingIndex);
			lastIndex = attackingIndex;
		}
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

	//needs a tile object with index and value field
	isWalkable(tile) {
		return tile.value !== this.TILE_FOG_OBSTACLE && 
			tile.value !== this.TILE_OFF_LIMITS &&
			tile.value !== this.TILE_MOUNTAIN && 
			this.cities.indexOf(tile.index) < 0;
	}

	//terrain must be walkable!!
	//0 if it belongs to himself, 1 for empty and 3 for enemy tile
	calcCaptureWeight(terrainValue) {
		if(terrainValue == this.playerIndex) {
			return 0;
		} else if(terrainValue == this.TILE_EMPTY || terrainValue == this.TILE_FOG) {
			return 1;
		} else if(terrainValue < 0) {
			//tile belonds to enemy
			return 3;
		}
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
						if(this.isWalkable(nextTile)) {
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

	//returns shortest path (as array) between start and end index
	//no node weights
	dijkstra(start, end) {
		let isVisited = [];
		let previous = [];
		
		for(let i = 0; i < this.size; i++) {
			isVisited[i] = false;
			previous[i] = i;
		}

		let queue = [];
		queue.push(start);
		isVisited[start] = true;

		while(queue.length > 0) {
			let curTile = queue.shift();
			isVisited[curTile] = true;

			let adjacentTiles = this.getAdjacentTiles(curTile);
			//loop through adjacent tiles
			for(let direction in adjacentTiles) {
				if (adjacentTiles.hasOwnProperty(direction)) {
					let nextTile = adjacentTiles[direction];
					if(!isVisited[nextTile.index] && !queue.includes(nextTile.index) 
						&& this.isWalkable(nextTile)) {
						previous[nextTile.index] = curTile;
						if(nextTile.index == end) {
							return this.constructDijkstraPath(start, end, previous);
						}
						queue.push(nextTile.index);
					}
				}
			}
		}

		//no path to end node found
		console.log("Dijkstra found no path!")
		return [];
	}

	//go from end backwards and reconstruct the path as an array
	constructDijkstraPath(start, end, previous) {
		let prevIndex;
		let curIndex = end;
		let path = [];
		path.push(end);

		while((prevIndex = previous[curIndex]) !== start) {
			//insert at first index of array
			path.unshift(prevIndex);
			curIndex = prevIndex;
		}
		return path;
	}

	decisionTreeSearch(start, turns) {
		let isVisited = Array.apply(null, Array(this.size)).map(function () { return false; })
		isVisited[start] = true;
		let path = this.decisionTreeSearchRec(start, turns, isVisited).path;
		console.log(path);
		//throw start node away
		return path.slice(1) === undefined ? [] : path.slice(1);
	}

	//TODO: if enemy tile -> check if it can be captured
	//weight: see calcCaptureWeight
	//gets path with maximum amount of tile captures
	decisionTreeSearchRec(start, turns, isVisited, weight = 0) {
		isVisited[start] = true;
		let path = [start];
		//console.log(path);
		let possiblePaths = [];

		if(turns != 0) {
			let adjacentTiles = this.getAdjacentTiles(start);
			//loop through adjacent tiles
			for(let direction in adjacentTiles) {
				if (adjacentTiles.hasOwnProperty(direction)) {
					let nextTile = adjacentTiles[direction];
					if(!isVisited[nextTile.index] && this.isWalkable(nextTile)) {
						let nextWeight = this.calcCaptureWeight(nextTile.value);
						//slice isVisited for cloning array and not passing a reference
						possiblePaths.push(this.decisionTreeSearchRec(nextTile.index, turns - 1, isVisited.slice(), nextWeight));
					} 
				}
			}
		}

		//no more possible moves
		if(possiblePaths.length == 0) {
			return {"path": path, "weight": weight};
		} else {
			//more possible moves found
			let bestPath = possiblePaths.reduce((prev, current) =>
				(prev.weight > current.weight) ? prev : current
			);
			return {"path": path.concat(bestPath.path), "weight": weight + bestPath.weight};
		}
	}

	//returns the furthest possible tile id from the general, with maximum distance to edge
	chooseDiscoverTile(tiles) {
		let generalCoords = this.getCoordinatesFromTileID(this.ownGeneral);

		let optimalTile = {"id": -1, "edgeWeight": 0};

		let maxGeneralDistance = tiles[tiles.length -1].generalDistance;

		//first elements are the closest to the general
		for(let i = tiles.length - 1; i >= 0; i--) {
			let tile = tiles[i];
			let edgeWeight = this.getEdgeWeightForID(tile.id);
			
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

	getCoordinatesFromTileID(id) {
		return {
			"x": Math.floor(id % this.width),
			"y": Math.floor(id / this.width)
		}
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
}

module.exports = Bot;