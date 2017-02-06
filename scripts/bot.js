const TILE = require('./tile.js'); 
const GameState = require('./gameState.js');
const GameMap = require('./gameMap.js');

class Bot {

	constructor(socket, data) {
		this.INITIAL_WAIT_TURNS = 24;
		this.SECONDS_DISCOVER_TURN = Math.ceil(this.INITIAL_WAIT_TURNS * 1.5);
		this.REINFORCEMENT_INTERVAL = 50;

		this.socket = socket;
		this.playerIndex = data.playerIndex;

		//true, if bot found an adjacent enemy line with low values
		this.isInfiltrating = false;
		this.gameState = new GameState(data);
		this.gameMap = new GameMap(this.gameState.width, this.gameState.height);

		this.initGeneral(this.gameState.generals);
	}

	initGeneral(generals) {
		for(let general of generals) {
			if(general != -1) {
				this.ownGeneral = general;
			}
		}
	}

	update(data) {
		this.gameState.update(data);

		this.ownedTiles = this.getOwnedTiles();

		//console.log("turn: " + turn + " armies: " + armies[this.ownGeneral]);
		
		if(this.gameState.turn <= this.INITIAL_WAIT_TURNS) {
			//wait for some armies to develop
		} else if(this.gameState.turn % this.REINFORCEMENT_INTERVAL == 0) {
			//this.spreadPhase();
		} else if(this.gameState.turn == this.INITIAL_WAIT_TURNS + 1){
			this.discover();
		} else if(this.gameState.turn == this.SECONDS_DISCOVER_TURN){
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

	//TODO: calculate at every step and maybe take waiting into decision tree(also moving on a tile multiple times)
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
			let index = Math.floor(Math.random() * this.gameMap.size);
			// If we own this tile, make a random move starting from it.
			if (this.gameState.terrain[index] === this.playerIndex) {
				let row = Math.floor(index / this.gameMap.width);
				let col = index % this.gameMap.width;
				let endIndex = index;

				let rand = Math.random();
				if (rand < 0.25 && col > 0) { // left
					endIndex--;
				} else if (rand < 0.5 && col < this.gameMap.width - 1) { // right
					endIndex++;
				} else if (rand < 0.75 && row < this.gameMap.height - 1) { // down
					endIndex += this.gameMap.width;
				} else if (row > 0) { //up
					endIndex -= this.gameMap.width;
				} else {
					continue;
				}

				// Would we be attacking a city? Don't attack cities.
				if (this.gameState.cities.indexOf(endIndex) >= 0) {
					continue;
				}

				this.socket.emit('attack', index, endIndex);
				break;
			}
		}
	}

	getOwnedTiles() {
		let ownedTiles = new Map();
		for(let i = 0; i < this.gameState.terrain.length; i++) {
			let tile = this.gameState.terrain[i];
			if(tile == this.playerIndex) {
				ownedTiles.set(i, this.gameState.armies[i]);
			}
		}
		return ownedTiles;
	}

	//needs a tile object with index and value field
	isWalkable(tile) {
		return tile.value !== TILE.FOG_OBSTACLE && 
			tile.value !== TILE.OFF_LIMITS &&
			tile.value !== TILE.MOUNTAIN && 
			this.gameState.cities.indexOf(tile.index) < 0;
	}

	//terrain must be walkable!!
	//0 if it belongs to himself, 1 for empty and 3 for enemy tile
	calcCaptureWeight(terrainValue) {
		if(terrainValue == this.playerIndex) {
			return 0;
		} else if(terrainValue == TILE.EMPTY || terrainValue == TILE.FOG) {
			return 1;
		} else if(terrainValue < 0) {
			//tile belonds to enemy
			return 3;
		}
	}

	//breadth first search. get all reachble tiles in radius
	bfs(node, radius) {
		let isVisited = Array.apply(null, Array(this.gameMap.size)).map(function () { return false; })
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
			
			let adjacentTiles = this.gameMap.getAdjacentTiles(this.gameState, curTile);
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
		
		for(let i = 0; i < this.gameMap.size; i++) {
			isVisited[i] = false;
			previous[i] = i;
		}

		let queue = [];
		queue.push(start);
		isVisited[start] = true;

		while(queue.length > 0) {
			let curTile = queue.shift();
			isVisited[curTile] = true;

			let adjacentTiles = this.gameMap.getAdjacentTiles(this.gameState, curTile);
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
		let isVisited = Array.apply(null, Array(this.gameMap.size)).map(function () { return false; })
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
			let adjacentTiles = this.gameMap.getAdjacentTiles(this.gameState, start);
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
			"x": Math.floor(id % this.gameMap.width),
			"y": Math.floor(id / this.gameMap.width)
		}
	}

	//gets a calculated distance from closest edges 
	//distance from closest edge * distance from closest edge on complementary side
	getEdgeWeightForID(id) {
		let tileCoords = this.getCoordinatesFromTileID(id);
		let upperEdge = tileCoords.y;
		let rightEdge = this.gameMap.width - tileCoords.x;
		let downEdge = this.gameMap.height - tileCoords.y;
		let leftEdge = tileCoords.x;
		return Math.min(upperEdge, downEdge) * Math.min(leftEdge, rightEdge);
	}
}

module.exports = Bot;