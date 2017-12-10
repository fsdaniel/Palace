// @flow

var avPropHolder = document.createElement('div');
avPropHolder.className = 'avpropholder'; // placeholder for user props to optimize

class PalaceUser {
	constructor(info,entered) {
		Object.assign(this, info); // copy info to the new instance

		this.domProp = new Array(9);
		this.domAvatar = document.createElement('div');
		this.style = this.domAvatar.style;
		this.domNametag = document.createElement('span');

		if (entered) {
			this.shrink();
		} else {
			this.setAvatarLocation();
		}

		this.setColor();
		this.domAvatar.className = 'avatar';
		this.domNametag.className = 'avnametag';
		this.domNametag.innerText = this.name;

		this.domAvatar.appendChild(this.domNametag);
		this.setDomProps();
		palace.container.appendChild(this.domAvatar);



	}

	setDomProps(dlPid) {

		if (this.animateTimer) {
			clearInterval(this.animateTimer);
			this.animateTimer = null;
		}

		for (let i = this.props.length; i < 9; i++) {
			let d = this.domProp[i];
			if (d) {
				this.domProp[i] = null;
				this.domAvatar.removeChild(d.div);
			}
		}

		let animatedProps = [];
		for (let i = 0; i < this.props.length; i++) {
			let d = this.domProp[i];
			let pid = this.props[i];
			let wrongProp = (d && (!d.prop || d.prop.id !== pid));
			if (wrongProp || !d) {
				let prop = allProps[pid];
				if (prop && prop.img && prop.img.src) {
					if (d) d = d.div; // if dom prop is a placeholder or another prop
					let dd = this.createDomProp(i,prop,dlPid,d); //now recycles div elements
					if (prop.animated) {
						animatedProps.push(dd);
					}
					if (!d) { // if domProp was empty, and a prop was found
						this.domAvatar.appendChild(dd.div);
					}
					if (dlPid === prop.id) {
						let tmp = dd.div.offsetWidth; //hack to force it to render so that opacity will transition
						dd.div.style.opacity = '1';
					}
				} else if (wrongProp && d.prop) { // replace wrong prop with placeholder since new one isn't yet available
					this.propPlaceHolder(i,d.div);
				} else if (!d) { // append placeholder if empty
					this.propPlaceHolder(i);
				}
			} else if (d.prop.animated) {
				animatedProps.push(d);
			} else {
				this.setDomPropVisibility(d,true);
			}
		}

		let head = this.hasHead; // if wearing a head prop don't render smiley
		if (head && !this.head) {
			this.head = head;
			this.style.backgroundImage = '';
		} else if (!head && this.head) {
			this.head = head;
			this.setFace(this.face);
		}


		if (animatedProps.length > 1) {
			this.animate(animatedProps);
		}

	}

	propPlaceHolder(i,div) {
		let ph = avPropHolder.cloneNode(false);
		this.domProp[i] = {div:ph, visible:false};
		if (div) {
			this.domAvatar.replaceChild(ph,div);
		} else {
			this.domAvatar.appendChild(ph);
		}
	}

	createDomProp(i,prop,dlPid,div) {
		let im = div && div.constructor === HTMLDivElement?div:document.createElement('div');
		if (dlPid === prop.id) im.style.opacity = '0';
		im.style.width = prop.w+'px';
		im.style.height = prop.h+'px';
		im.style.backgroundImage = 'url('+prop.img.src+')';
		im.style.transform = 'translate('+prop.x+'px,'+prop.y+'px)';
		im.className = 'avprop';
		var d = {div:im, prop:prop, visible:true};
		this.domProp[i] = d;
		return d;
	}

	get hasHead() {
		for (let i = 0; i < this.domProp.length; i++) {
			let d = this.domProp[i];
			if (d && d.prop && d.prop.head) {
				return true;
			}
		}
	}

	animate(animatedProps) {
		let bounce = false;
		animatedProps.forEach((d,i) => {
			if (d.prop.bounce) bounce = true;
			if (i !== 0) this.setDomPropVisibility(d,false);
		});
		let index = 0, last, forward = true, animator = () => {
			if (last) this.setDomPropVisibility(last,false);
			last = animatedProps[index];
			this.setDomPropVisibility(last,true);
			if (index === animatedProps.length-1) {
				bounce?forward = false:index = -1;
			} else if (index === 0) {
				forward = true;
			}
			forward?index++:index--;
		};
		this.animateTimer = setInterval(animator,350);
		animator();
	}

	setDomPropVisibility(d,visible) {
		if (visible && !d.visible) {
			d.div.style.visibility = 'visible';
		} else if (!visible && d.visible) {
			d.div.style.visibility = 'hidden';
		}
		d.visible = visible;
	}

	findDomProp(pid) {
		return this.domProp.find((d) => {
			return d.constructor === Object && d.prop.id === pid;
		});
	}

	changeUserProps(props,fromSelf) {

		let same = (this.props.length === props.length &&
			this.props.every( (v,i) => { return v === props[i] }));

		this.props = props;

		if (!same) {
			loadProps(this.props,fromSelf);
			if (this === palace.theUser) {
				enablePropButtons();
			}
			this.setDomProps();
			return true;
		}
	}

	get avatarLoc() {
		return 'translate('+(this.x-110)+'px,'+(this.y-110)+'px)';
	}

	setAvatarLocation() {
		this.style.transform = this.avatarLoc;
	}

	setColor() {
		this.domNametag.style.color = getHsl(this.color,60);
		if (!this.head) this.style.backgroundImage = 'url('+smileys[this.face+','+this.color].src+')';
	}

	setFace() {
		if (!this.head) this.style.backgroundImage = 'url('+smileys[this.face+','+this.color].src+')';
	}

	poke() { // when you click a user (might use for something else later) pressure variable might be an idea!
		//this.style.animation = 'poke 1s infinite';
	}

	grow() {
		this.setAvatarLocation();
	}

	shrink(exit) {
		this.style.transform = this.avatarLoc + ' scale(0.001)';
		if (exit) {
			this.id = -1;// marks user as exited and going to be removed from the room.
			this.domAvatar.addEventListener('transitionend',() => {
				this.remove();
			});
		}
	}

	setName() {
		this.domNametag.innerText = this.name;
	}

	removeFromDom() {
		if (this.animateTimer) {
			clearInterval(this.animateTimer);
		}
		palace.container.removeChild(this.domAvatar);
	}

	remove() {
		this.popBubbles();
		this.removeFromDom();
		palace.theRoom.users.splice(palace.theRoom.users.indexOf(this),1);
		palace.theRoom.setUserCount();
		palace.theRoom.reDraw();
	}


	get nameRectBounds() { // need to reduce size of this function!
		var w = this.nametag.width;
		var h = this.nametag.height;
		var half = (w/2);
		var x = this.x*this.scale;
		var y = this.y*this.scale;
		var bgw = palace.roomWidth*this.scale;
		var bgh = palace.roomHeight*this.scale;

		if (x-half < 0) x = half;
		if (x > bgw-half) x = bgw-half;

		if (this.scale != 1) {
			x = x-half;
			y = y+(h/2);
		} else {
			x = (x-half).fastRound(); // don't want floating point coordinates if not scaling
			y = (y+(h/2)).fastRound();
		}

		if (y < 0) y = 0;
		if (y > bgh-h) y = bgh-h;

		return {x:x,y:y,w:w,h:h};
	}

	popBubbles() {
		var i = chatBubs.length;
		for (var a = quedBubbles.length; --a >= 0;) {
			var bub = quedBubbles[a];
			if (this === bub.user) {
				bub.user = null;
				palace.container.removeChild(bub.p);
				quedBubbles.splice(a,1);
			}
		}
		for (let c = i; --c >= 0;) {
			var bub = chatBubs[c];
			if (this === bub.user) {
				bub.remove(true);
			}
		}
		if (i > 0) palace.theRoom.reDrawTop();
	}





}
