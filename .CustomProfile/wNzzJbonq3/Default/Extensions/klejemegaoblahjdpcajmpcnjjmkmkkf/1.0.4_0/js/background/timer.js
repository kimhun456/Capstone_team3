var Timer = function() {
    //time variables
    this.timeRemaining = null;
    this.startDate = null;

    //callback variables
    this.timerId = null;
    this.callback = null;
    
    //starts Timer
    this.start = function(time, callback) {

  		this.timeRemaining = time;
  		this.callback = callback;
  		this.startDate = new Date();
  		
  		console.log("Timer: start!");
  		this.timerId = window.setTimeout(this.callback, this.timeRemaining);
    }

    //pauses timer
    this.pause = function() {
        this.clear();
        this.timeRemaining -= new Date() - this.startDate;
    };

    //resumes timer
    this.resume = function() {
        this.startDate = new Date();
        this.timerId = window.setTimeout(this.callback, this.timeRemaining);
    }

    //stops timer
    this.stop = function() {
    	this.clear();
    	this.timerId = null;
    	this.timeRemaining = null;
    	this.startDate = null;
    	this.callback = null;
    }

    //clears timer
    this.clear = function() {
    	window.clearTimeout(this.timerId);
    }

    //return the remainingTime in seconds
    /*this.getRemainingTime = function() {
        var seconds = ( this.timeRemaining - (new Date() - this.startDate) )/1000;
    	return Math.floor(seconds);
    }*/
}