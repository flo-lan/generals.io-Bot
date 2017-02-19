const TILE = require('./tile.js'); 
const patch = require('./updatePatcher.js');

class GameState {

	constructor(data, playerIndex) {
		this.cities = [];
		this.map = [];

		this.playerIndex = playerIndex;
		this.ownTiles = new Map();
		this.enemyTiles = new Map();

		this.ownGeneral = -1;
		this.enemyGeneral = -1;
		this.update(data);
	}

	update(data) {
		// Patch the city and map diffs into our local variables.
		this.cities = patch(this.cities, data.cities_diff);
		this.map = patch(this.map, data.map_diff);
		this.generals = data.generals;

		this.turn = data.turn;
	
		// The first two terms in |map| are the dimensions.
		this.width = this.map[0];
		this.height = this.map[1];
		this.size = this.width * this.height;

		// The next |size| terms are army values.
		// armies[0] is the top-left corner of the map.
		this.armies = this.map.slice(2, this.size + 2);

		// The last |size| terms are terrain values.
		// terrain[0] is the top-left corner of the map.
		this.terrain = this.map.slice(this.size + 2, this.size + 2 + this.size);
		this.updatePlayerTiles();
		this.updateGenerals();
	}

	updatePlayerTiles() {
		this.ownTiles.clear();
		this.enemyTiles.clear();
		for(let i = 0; i < this.terrain.length; i++) {
			let tile = this.terrain[i];
			if(tile >= 0) {
				let armies = this.armies[i];
				if(tile == this.playerIndex) {
					this.ownTiles.set(i, armies);
				} else {
					this.enemyTiles.set(i, armies);
				}
			}
		}
	}

	updateGenerals() {
		for(let general of this.generals) {
			if(general != -1) {
				if(this.ownGeneral == -1) {
					this.ownGeneral = general;
				} else if(general != this.ownGeneral) {
					//only update enemyGeneral if it hasn't been found yet
					this.enemyGeneral = general;
				}
			}
		}
	}
}

module.exports = GameState;