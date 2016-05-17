//Add fadeOut method to soundmanager
if(typeof soundManager !== 'undefined')
soundManager.fadeOut = function(id, duration, stopInTheEnd, callback) {
	var duration = duration || 1000;
	var toVolume = 0;
	var callback = typeof callback == 'function' ? callback : function(){};

	var sound = soundManager.getSoundById(id);
	var volume = sound.volume;
	var timeStep = duration/volume;

	if(volume != 0 && sound.playState != 0) {
		var interval = setInterval( function(){
			if(volume > 0) volume = volume - 1;	
			
			sound.setVolume(volume);
			//console.log("Step: " + volume);

			//if volume is less than 0 or the sound is stopped in the meantime
			if(volume <= 0 || sound.playState == 0) {
				console.log("Fadding finished");
				clearInterval(interval);
				interval = null;
				callback();

				if(stopInTheEnd) sound.stop();
			}
		}, timeStep);
	}
}

function Sound(name, volume) {
	this.name = name;
	this.volume = volume;
}

function Combo(id, name) {
  this.id = id;
  this.name = name;
  this.sounds = [];

  this.loadSounds = function(soundArray) {
  	var _self = this;
  	$.each(soundArray, function(i){
		_self.sounds.push(new Sound(soundArray[i].name, soundArray[i].volume));
	});
  }
}

function CombosController() {
	this.combos = [];

	this.loadCombos = function(data) {
		var _self = this;
		this.combos = [];
		//Get Combos
		$.each(data.combos, function(i) { _self.combos.push(new Combo(data.combos[i].id, data.combos[i].name)); });
		//Get Combos Sounds
		$.each(data.sounds, function(i) {
			var comboIndex = _self.indexOfCombo(data.sounds[i][0].combo_id);
			_self.combos[comboIndex].loadSounds(data.sounds[i]);
		});
	}

	this.indexOfCombo = function(id) {
		return this.combos.map(function(c) {return c.id; }).indexOf(id);
	}

	this.getCombo = function(id) {
		return this.combos[this.indexOfCombo(id)];
	}
}


function SoundController() {
	this.soundIDs = [];

	this.loadSounds = function(data) {
		var sound_links = data.sound_links;

		for (var name in sound_links["mp3"]) {
			var _self = this;

			this.soundIDs.push(name);
			soundManager.createSound({ 
		  		id: name,
		 		url: sound_links["mp3"][name],
		 		volume: 0,
		 		stream: true, 
		 		autoPlay: false,
		 		autoLoad: false,
                multiShot: false,
				onplay:function() {
					//Prevent the sound to start while it's fadding
					console.log("Sound " + this.id + " started with volume " + this.volume + "...");
				},
				onfinish: function() {
					console.log("Sound " + this.id + " just finished...");
					soundManager.play(this.id); //loop sound
				},
				onload: function() {
					var _sound_self = this;
					this.onPosition(this.duration - 3000, function(eventPosition) {
						
						var _sound_volume = this.volume;

						soundManager.fadeOut(this.id, 3000, false, function() {
							console.log("Finishing fading " + _sound_self.id + " sound from volume " + _sound_volume);
							_sound_self.setVolume(_sound_volume);
						});
					});
				}

			});
		}
	}

	this.setupSounds = function(callback) {
		soundManager.setup({
			debugMode: false,
			//useHTML5Audio: true,
	  		preferFlash: false,
	  		stream: true, // allows playing before entire file has loaded (recommended)
	  		//autoLoad: true,  // enable automatic loading (otherwise .load() will call with .play())
	  		multiShot: false, // let sounds "restart" or "chorus" when played multiple times..
	  		onready: function() {
	  			callback();
	  		}
	  	});
	}

	this.stopAll = function() {
		var _self = this;
		$.each(_self.soundIDs, function(i) {
			soundManager.unload(_self.soundIDs[i]);
		});
		soundManager.stopAll();
	}

	this.toggleMute = function(value) {
		if(value)
			soundManager.mute();
		else
			soundManager.unmute();
	}

	this.changeVolume = function(overallVolume, combo) {
		var _self = this;

		$.each(combo.sounds, function(i) {
			var sound =  soundManager.getSoundById(combo.sounds[i].name);
			sound.setVolume(combo.sounds[i].volume * overallVolume);
			console.log("Changing to: " + (combo.sounds[i].volume * overallVolume));
  		});

		//console.log("Changing to: " + value);
		//soundManager.setVolume(value);
	}

	this.playCombo = function(combo, overallVolume){
		this.stopAll();
		$.each(combo.sounds, function(i) {
			var sound =  soundManager.getSoundById(combo.sounds[i].name);
			sound.setVolume(combo.sounds[i].volume * overallVolume);
			sound.play();
  		});
  	};

  	this.status = function() {
  		var _self = this;
  		$.each(this.soundIDs, function(i) {
  			var name = _self.soundIDs[i];
  			var sound = soundManager.getSoundById(name);
  			var volume = sound.volume;
  			var status = (sound.playState == 0)? "-" : "PLAYING";
  			console.log(name + ": " + status + " " + volume);
  		});
  	}

  	this.fadeOutAll = function(time, combo, callback) {
		console.log("Timer: fadding...");
		$.each(combo.sounds, function(i) {
			soundManager.fadeOut(combo.sounds[i].name, time, true, callback);
  		});
  	}
}

/*
function SoundPlayer(name, ogg_url, mp3_url) {
  this.name = name;
  this.ogg_url = ogg_url;
  this.mp3_url = mp3_url;

  this.player = new Audio();
  this.player.src = this.mp3_url;

  this.setVolume = function(volume) {
  	this.player.volume = volume;
  };

  this.play = function(volume) {
  	this.player.play();
  };

  this.stop = function() {
  	this.player.pause();
	this.player.currentTime = 0;
  };

}

function SoundController() {
	this.players = [];
	this.overall_volume = 1;

	this.initialize = function(callback) {
		soundManager.setup({
  		preferFlash: false,
  		onready: function() {
  			callback();
  		}
	}

	this.loadSounds = function(data) {
		this.players = [];
		var sound_links = data.sound_links;
		for (var name in sound_links["ogg"]) {
			var ogg_url = sound_links["ogg"][name];
			var mp3_url = sound_links["mp3"][name];
			this.players.push(new SoundPlayer(name, ogg_url, mp3_url));
		}
	};

	this.playSound = function(name, volume) {
		var index = this.players.map(function(p) {return p.name; }).indexOf(name);
		this.players[index].setVolume(volume);
		this.players[index].play();
	};

	this.stopAll = function() {
		var _self = this;
		$.each(this.players, function(i) {
			_self.players[i].stop();
		});
	}

	this.playCombo = function(combo){
		var _self = this;
		this.stopAll();
		$.each(combo.sounds, function(i) {
			_self.playSound(combo.sounds[i].name, combo.sounds[i].volume)
  		});
  	};

  	this.status = function() {
  		var _self = this;
  		$.each(this.players, function(i) {
			console.log(_self.players[i].name + ": " + (_self.players[i].player.paused? "-" : "PLAYING " + _self.players[i].player.volume));
		});
  	}
}
*/