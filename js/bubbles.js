var chatBubs = [],
	quedBubbles = [];


function Bubble(user,chat,bubInfo) {
	var x = 0;
	var y = 0;
	
	if (user) {
		if (user.sticky) {
			user.sticky.remove(true);
			user.sticky = null;
			reDraw();
		}
		x = user.x;
		y = user.y;
	} else if (theRoom.sticky) {
		theRoom.sticky.remove(true);
		theRoom.sticky = null;
		reDraw();
	}
	
	if (bubInfo.x !== undefined) {
		x = bubInfo.x;
		y = bubInfo.y;
	}
	
	this.p = document.createElement('p');
	this.p.className = 'chatBubble';
	if (chat.whisper) this.p.style.fontStyle = 'italic';
	
	this.p.textContent = chat.chatstr.substring(bubInfo.start);
	this.p.style.top = '-9999px'; /* hide html element for now */
	
	this.user = user;
	
	if (user) this.color = user.color;
	this.size = 0.5;
	this.sticky = Boolean(bubInfo.type & 1);
	this.thought = Boolean(bubInfo.type & 2);
	this.shout = Boolean(bubInfo.type & 4);
	this.storedOriginX = x;
	this.storedOriginY = y;
	this.adjustOrigin();
	this.padA = bubbleConsts.padding;
	this.padB = bubbleConsts.padding*2;
	if (this.shout) { /* needs more space */
		this.padA += bubbleConsts.padding*2;
		this.padB += bubbleConsts.padding*4;
	}
	this.p.style.maxHeight = (bgEnv.height - this.padB*2+this.padA)+'px';
	overLayer.appendChild(this.p); /* append to DOM before measurements are possible */
	this.textWidth = this.p.offsetWidth;
	this.textHeight = this.p.offsetHeight;
	if (this.textHeight < this.padB && !this.shout) this.textHeight = this.padB;
	
	if (!this.awaitDirection()) {
		this.show();
	} else {
		quedBubbles.push(this);
	}
}

Bubble.prototype.adjustOrigin = function() {
	this.originX = this.storedOriginX;
	this.originY = this.storedOriginY;
	if (this.originX < 0) this.originX = 0;
	if (this.originY < 0) this.originY = 0;
	if (this.originX > bgEnv.width) this.originX = bgEnv.width;
	if (this.originY > bgEnv.height) this.originY = bgEnv.height;
};
Bubble.prototype.remove = function(now) {
	if (now) {
		var index = chatBubs.indexOf(this);
		if (index > -1) {
			if (this.timer) clearInterval(this.timer);
			this.timer = null;
			if (this.popTimer) clearTimeout(this.popTimer);
			this.popTimer = null;
			this.user = null; // needed in case it's sticky, because circular reference 
			overLayer.removeChild(this.p);
			chatBubs.splice(index,1);
		}
	} else {
		this.deflate(true);
	}
	pushBubbles();
};
Bubble.prototype.show = function() {
	if (this.sticky && this.user) this.user.sticky = this;
	if (this.sticky && !this.user) theRoom.sticky = this;
	
	chatBubs.push(this);

	this.inflate();
	
	if (!this.sticky) {
		var speed = this.p.textContent.length * 130;
		if (speed < 3540) {
			speed = 3540;
		} else if (speed > 12000) {
			speed = 12000;
		}
		var bub = this;
		this.popTimer = setTimeout(function(){bub.remove(false)}, speed); //is bub=null; required?
	}
	reDraw();
};
Bubble.prototype.inflate = function() {
	this.deflated = false;
	if (this.timer) clearInterval(this.timer);
	var bub = this;
	this.timer = setInterval(function() {
		if (bub.size < 1) {
			bub.size += 0.08;
		} else {
			bub.size = 1;
			if (bub.timer) {
				clearInterval(bub.timer);
				bub.timer = null;
			}
			bub.p.style.left = bub.x+'px';
			bub.p.style.top = bub.y+'px';
		}
		reDraw();
	},20);
};
Bubble.prototype.deflate = function(remove) {
	this.p.style.top = '-9999px';
	this.deflated = true;
	if (this.timer) clearInterval(this.timer);
	this.timer = null;
	var bub = this;
	this.timer = setInterval(function() {
		if (bub.size > 0.5) {
			bub.size -= 0.1;
		} else {
			bub.size = 0.5;
			if (bub.timer) {
				clearInterval(bub.timer);
				bub.timer = null;
			}
			if (remove) bub.remove(true);
		}
		reDraw();
	},20);
};
Bubble.prototype.makeShoutBubble = function(ctx) {
	var w = this.textWidth*this.size;
	var h = this.textHeight*this.size;
	var centerX = (this.x + (this.textWidth/2));
	var centerY = (this.y + (this.textHeight/2));
	var radiusW = (w/1.45)+bubbleConsts.padding;
	var radiusH = (h/1.45)+bubbleConsts.padding;
	var circum = radiusW * radiusH * Math.PI;
	var inter = circum/(circum/(bubbleConsts.spikeSize+Math.round((radiusW+radiusH)/bubbleConsts.spikeSpread)));

	var pie = Math.PI/inter;

	ctx.beginPath();
	ctx.moveTo(centerX + radiusW * Math.cos(pie), centerY + radiusH * Math.sin(pie));
	
	var angle = 0;
	for (var n = 0; n < inter; n++) {
		pie = Math.PI/inter;
		
		angle += pie;
		ctx.lineTo(centerX + radiusW * Math.cos(angle), centerY + radiusH * Math.sin(angle));
		
		angle += pie;
		var r1 = 16;
		var r2 = 16;
		if (this.size < 1) {
			r1 = (r1+4)*Math.random();
			r2 = (r1+4)*Math.random();
		}
		
		ctx.lineTo(centerX + (radiusW+5+r1) * Math.cos(angle), centerY + (radiusH+5+r2) * Math.sin(angle));
	}
	ctx.closePath();
};
Bubble.prototype.makeRegularBubble = function(ctx, radius) {
	var x = this.x - bubbleConsts.padding;
	var y = this.y - bubbleConsts.padding;
	var width = this.textWidth + (bubbleConsts.padding*2);
	var height = this.textHeight + (bubbleConsts.padding*2);
	var ux = this.originX;
	var uy = this.originY;
	var dist = 23;
	var space = 4;
	var w = width;
	
	if (this.right) {
		width = width*this.size;
		x = x + w/4 - (width*this.size)/4;
	} else {
		width = width*this.size;
		x = x + w/3 - (width*this.size)/3;
	}
	
	if (this.textHeight > 23) {
		var h = height;
		height = height*this.size;
		y = y + h/4 - (height*this.size)/4;
	}
	
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.lineTo(x + width - radius, y);
	ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
	if (!this.right && !this.sticky) {
		var blexit = uy;
		if (y + radius > blexit) blexit = y + radius;
		if (y + height - radius < blexit) blexit = y + height - radius;
		ctx.lineTo(x + width, blexit - space);
		ctx.lineTo(ux - dist, uy);
		ctx.lineTo(x + width, blexit + space);
	}
	ctx.lineTo(x + width, y + height - radius);
	ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
	ctx.lineTo(x + radius, y + height);
	ctx.quadraticCurveTo(x, y + height, x , y + height - radius);
	if (this.right === true && !this.sticky) {
		var brexit = uy;
		if (y + height - radius < brexit) brexit = y + height - radius;
		if (y + radius > brexit) brexit = y + radius;
		ctx.lineTo(x, brexit + space);
		ctx.lineTo(ux + dist, uy);
		ctx.lineTo(x, brexit - space);
	}
	ctx.lineTo(x, y + radius );
	ctx.quadraticCurveTo(x, y, x + radius, y);
	ctx.closePath();
};
Bubble.prototype.avoidOthers = function() {
	var submissives = [];
	var x1 = this.x-this.padA;
	var y1 = this.y-this.padA;
	var w1 = this.textWidth+this.padB;
	var h1 = this.textHeight+this.padB;
	
	//for (var i = chatBubs.length; --i >= 0;) {
	var bub = this;
	if (chatBubs.find(function(boob) {
		if (bub != boob) {
			var x2 = boob.x-boob.padA;
			var y2 = boob.y-boob.padA;
			var w2 = boob.textWidth+boob.padB;
			var h2 = boob.textHeight+boob.padB;
			var overLaps = rectsOverlap(x1,y1,w1,h1,x2,y2,w2,h2);
			if (((bub.sticky && boob.sticky) || (!boob.deflated && !boob.sticky)) && overLaps)
				return true;
			if (!bub.sticky && boob.sticky && overLaps)
				submissives.push(boob);
		}
	})) return true;
	
	if ((x1 < 0 || y1 < 0 || x1+w1 > bgEnv.width || y1+h1 > bgEnv.height)) {// is bubble offscreen
		
		return true;
	}

	submissives.find(function(sub){sub.deflate(false)});
};
Bubble.prototype.awaitDirection = function() {
	var side = (bgEnv.width/2 < this.originX);
	var offsetOrigin = 42;
	if (this.sticky) offsetOrigin = -this.textWidth/2;
	var iterations = 0;
	
	do {
		if (iterations > 1) return true; /* bub must wait */

		iterations++;
		
		var x = this.originX;
		var y = this.originY;
		
		if (side || this.sticky) {
			x -= this.textWidth + offsetOrigin;
			this.right = false;
		} else {
			x += offsetOrigin;
			this.right = true;
		}
		y -= this.textHeight/2;

		if (y+this.textHeight+this.padB > bgEnv.height)
			y = bgEnv.height-(this.textHeight+this.padB);
		if (y-this.padA < 0)
			y = this.padA;
	
		if (x+this.textWidth+this.padB > bgEnv.width && (this.right === false || this.sticky || this.shout))
			x = bgEnv.width-(this.textWidth+this.padB);
		if (x-this.padA < 0 && (this.right === true || this.sticky || this.shout))
			x = this.padA;
		
		this.x = x;
		this.y = y;

		side = !side;
	} while (this.avoidOthers());
	
	return false; /* okay to display bub */
};

function playThemeSound(name) {
	if (!prefs.general.disableSounds) {
		var player = document.getElementById('soundplayer');
		player.onerror = function() {
			var parts = player.src.split('.');
			var ext = parts.pop();
			if (ext == 'wav' && ext != 'mp3') this.src = parts[0] + '.mp3';
		};
		player.src = 'audio/' + (name.split('.').length == 1 ? name+'.wav' : name);
	}
}

function bubbleAI(chatstr) {
	var i, r, end;
	var bubInfo = {start:0,type:0};
	var chatLen = chatstr.length;
	for (i = 0; i < chatLen; i++) {
		switch(chatstr.charAt(i)) {
			case '!':
				bubInfo.type |= 4;
				break;
			case ':':
				bubInfo.type |= 2;
				break;
			case '^':
				bubInfo.type |= 1;
				break;
			case ')':
				r = bubbleConsts.sound.exec(chatstr.substr(i+1));
				if (r && r[1].length > 0) {
					playThemeSound(r[1]);
					i += r[0].length;
				}
				break;
			case '@':
				r = bubbleConsts.spoof.exec(chatstr);
				if (r) {
					bubInfo.x = Number(r[1]);
					bubInfo.y = Number(r[2]);
					i += r[0].length;
				}
				break;
			case ';':
				bubInfo.type = -1;
				bubInfo.start = i;
				return bubInfo;
			default:
				end = true;
		}
		if (end) break;
	}
	bubInfo.start = i;
	return bubInfo;
}

function deleteAllBubbles() {
	var i = 0;
	for (i = chatBubs.length; --i >= 0;) {
		chatBubs[i].remove(true);
	}
	for (i = quedBubbles.length; --i >= 0;) {
		overLayer.removeChild(quedBubbles[i].p);
		quedBubbles.splice(i,1);
	}
	if (theRoom.sticky) {
		theRoom.sticky.remove(true);
		theRoom.sticky = null;
	}
}

function pushBubbles() {
	for (var i = 0; i < quedBubbles.length; i++) {
		var bub = quedBubbles[i];
		if (!bub.awaitDirection()) {
			quedBubbles.splice(i,1);
			bub.show();
			i--;
		}
	}
	for (var i = chatBubs.length; --i >= 0;) {
		var bub = chatBubs[i];
		if (bub.sticky && bub.deflated && !bub.awaitDirection())
			bub.inflate();
	}
}

function resetDisplayedBubbles() {
	for (var i = 0; i < chatBubs.length; i++) {
		var bub = chatBubs[i];
		bub.adjustOrigin();
		bub.awaitDirection();
		if (bub.p.style.top != '-9999px') {
			bub.p.style.left = bub.x+'px';
			bub.p.style.top = bub.y+'px';
		}
	}
	pushBubbles();
}