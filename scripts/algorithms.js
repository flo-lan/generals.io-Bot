const Heuristics = require('./heuristics.js');

class Algorithms {

	set gameMap(gameMap){
		this.this.gameMap = this.gameMap;
	}

	//breadth first search. get all reachble tiles in radius
	static bfs(gameState, node, radius) {
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
			
			let adjacentTiles = this.gameMap.getAdjacentTiles(gameState, curTile);
			//loop through adjacent tiles
			for(let direction in adjacentTiles) {
				if (adjacentTiles.hasOwnProperty(direction)) {
					let nextTile = adjacentTiles[direction];
					if(!isVisited[nextTile.index]) {
						//tile can be moved on(ignore cities)
						if(this.gameMap.isWalkable(gameState, nextTile)) {
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
	static dijkstra(gameState, start, end) {
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

			let adjacentTiles = this.gameMap.getAdjacentTiles(gameState, curTile);
			//loop through adjacent tiles
			for(let direction in adjacentTiles) {
				if (adjacentTiles.hasOwnProperty(direction)) {
					let nextTile = adjacentTiles[direction];
					if(!isVisited[nextTile.index] && !queue.includes(nextTile.index) 
						&& this.gameMap.isWalkable(gameState, nextTile)) {
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
	static constructDijkstraPath(start, end, previous) {
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

	static decisionTreeSearch(gameState, start, turns) {
		let isVisited = Array.apply(null, Array(this.gameMap.size)).map(function () { return false; })
		isVisited[start] = true;

		//to avoid passing the gameState in every recursion
		this.curGameState = gameState;
		let path = this.decisionTreeSearchRec(start, turns, isVisited).path;

		//throw start node away
		return path.slice(1) === undefined ? [] : path.slice(1);
	}

	//TODO: if enemy tile -> check if it can be captured
	//weight: see calcCaptureWeight
	//gets path with maximum amount of tile captures
	static decisionTreeSearchRec(start, turns, isVisited, weight = 0) {
		isVisited[start] = true;
		let path = [start];
		//console.log(path);
		let possiblePaths = [];

		if(turns != 0) {
			let adjacentTiles = this.gameMap.getAdjacentTiles(this.curGameState, start);
			//loop through adjacent tiles
			for(let direction in adjacentTiles) {
				if (adjacentTiles.hasOwnProperty(direction)) {
					let nextTile = adjacentTiles[direction];
					if(!isVisited[nextTile.index] && this.gameMap.isWalkable(this.curGameState, nextTile)) {
						let nextWeight = Heuristics.calcCaptureWeight(this.playerIndex, nextTile.value);
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
}
module.exports = Algorithms;