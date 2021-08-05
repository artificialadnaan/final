const support = {
	mobile: isMobile.any,
	firefox: navigator.userAgent.indexOf("Firefox") > -1
};

const math = {
	normalize: (value, max, min) => (value - min) / (max - min),
	denormalize: (value, max, min) => value * (max - min) + min,
	lerp: (previous, current, ease) => (1 - ease) * previous + ease * current,
	clamp: (min, max, value) => Math.max(min, Math.min(value, max))
};

const config = {
	windowWidth: window.innerWidth,
	windowHeight: window.innerHeight
};

const keyCodes = {
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	SPACE: 32
};

/**
 * https://gist.github.com/gre/1650294
 * https://easings.net/en
 **/
const ease = {
	// acceleration until halfway, then deceleration
	inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
	// decelerating to zero velocity
	outQuint: (t) => 1 + --t * t * t * t * t
	// acceleration until halfway, then deceleration
};

class ScrollManager {
	constructor({ content = null } = {}) {
		if (support.mobile || content === null) {
			document.body.classList.add("is-mobile");
			return;
		}

		this.raf = null;

		this.DOM = {
			content,
			sections: content.querySelectorAll("[data-scroll-section]")
		};

		this.options = {
			firefoxMultiplier: 15,
			keyStep: 120
		};

		this.data = {
			current: 0,
			target: 0,
			ease: 0.075,
			scrollHeight: content.getBoundingClientRect().height
		};

		this.animatedSections = [];

		this.sectionOne = new SectionOne({
			section: content.querySelector(".right-image")
		});
		this.animatedSections.push(this.sectionOne);

		this.sectionTwo = new SectionTwo({
			section: content.querySelector(".description")
		});
		this.animatedSections.push(this.sectionTwo);

		this.sectionThree = new SectionThree({
			section: content.querySelector(".sign-up")
		});
		this.animatedSections.push(this.sectionThree);

		this.bindFns();
		this.init();
	}

	bindFns() {
		["run", "wheel", "resize", "keyDown"].forEach(
			(fn) => (this[fn] = this[fn].bind(this))
		);
	}

	animateSections(current) {
		this.animatedSections.forEach((section) => section && section.run(current));
	}

	wheel(e) {
		if (support.firefox && e.deltaMode == 1) {
			this.data.target += e.deltaY * this.options.firefoxMultiplier;
		} else {
			this.data.target += e.deltaY;
		}

		this.clampTarget();
	}

	keyDown(e) {
		switch (e.keyCode) {
			case keyCodes.LEFT:
				//this.data.target = this.options.keyStep;
				break;

			case keyCodes.UP:
				this.data.target -= this.options.keyStep;
				this.clampTarget();
				break;

			case keyCodes.RIGHT:
				// this.data.target = - this.options.keyStep;
				break;

			case keyCodes.DOWN:
				this.data.target += this.options.keyStep;
				this.clampTarget();
				break;

			case e.shiftKey && keyCodes.SPACE:
				this.data.target -= config.windowHeight;
				this.clampTarget();
				break;

			case keyCodes.SPACE:
				this.data.target += config.windowHeight;
				this.clampTarget();
				break;

			default:
				return;
		}
	}

	clampTarget() {
		this.data.target = math.clamp(
			0,
			this.data.scrollHeight - config.windowHeight,
			this.data.target
		);
	}

	run() {
		this.data.current = math
			.lerp(this.data.current, this.data.target, this.data.ease)
			.toFixed(2);

		if (this.data.current < 0.1) {
			this.data.current = 0;
		}

		this.requestAnimationFrame();

		this.DOM.sections.forEach((section) => {
			section.style.transform = `translate3d(0, ${-1 * this.data.current}px, 0)`;
		});

		this.animatedSections &&
			this.animateSections({
				scrollTop: this.data.current,
				target: this.data.target
			});
	}

	requestAnimationFrame() {
		this.raf = requestAnimationFrame(this.run);
	}

	cancelAnimationFrame() {
		cancelAnimationFrame(this.raf);
	}

	init() {
		// prep browser for transform
		this.DOM.sections.forEach((section) => {
			section.style.transform = `translate3d(0, ${
				-1 * this.data.scrollHeight - config.windowHeight
			}px, 0)`;
			section.style.transform = `translate3d(0, 0, 0)`;
		});

		this.run();
		window.addEventListener("wheel", this.wheel);
		window.addEventListener("resize", this.resize);
		window.addEventListener("keydown", this.keyDown);
	}

	destroy() {
		this.cancelAnimationFrame();
		window.removeEventListener("wheel", this.wheel);
		window.removeEventListener("resize", this.resize);
		window.removeEventListener("keydown", this.keyDown);
	}

	resize() {
		this.data.scrollHeight = this.DOM.content.getBoundingClientRect().height;
		config.windowHeight = window.innerHeight;
		config.windowWidth = window.innerWidth;
	}
}

class Section {
	constructor({ section = null } = {}) {
		const bounds = section.getBoundingClientRect();

		this.data = {
			current: 0,
			progress: 0,
			height: bounds.height,
			top: bounds.top,
			bottom: bounds.bottom,
			scrollTop: 0,
			visibleOnLoad: false
		};

		this.checkViewPort();

		if (this.isVisible) {
			this.data.visibleOnLoad = true;
			this.getData(this.data.visibleOnLoad);
		}
	}

	checkViewPort() {
		this.isVisible =
			this.data.top < config.windowHeight + this.data.scrollTop &&
			this.data.bottom > this.data.scrollTop;
	}

	// get data if section is out of viewport
	getData(visibleOnLoad = false) {
		if (visibleOnLoad) {
			this.data.current = this.data.scrollTop;
			this.data.progress = math.normalize(this.data.current, this.data.bottom, 0);
		} else {
			this.data.current =
				this.data.scrollTop + config.windowHeight - this.data.top;
			this.data.progress = math.normalize(
				this.data.current,
				config.windowHeight + this.data.height,
				0
			);
		}
	}

	run({ scrollTop, target }) {
		this.data.scrollTop = parseInt(scrollTop);
		this.checkViewPort();
		if (!this.isVisible) return;
		this.getData(this.data.visibleOnLoad);
	}
}

class SectionOne extends Section {
	constructor({ section = null } = {}) {
		super({ section });

		this.DOM = {
			imageOverflow: section.querySelector(".right-image__overflow"),
			image: section.querySelector(".right-image__container")
		};
	}

	run({ scrollTop, target }) {
		super.run({ scrollTop, target });
		if (!this.isVisible) return;

		// animate here
		const section = {
			progress: this.data.progress,
			keyframeA: math.normalize(this.data.current, this.data.bottom * 0.5, 0),
			keyframeB: math.normalize(this.data.current, this.data.bottom * 0.5, 0) - 1
		};

		section.keyframeA = math.clamp(0, 1, section.keyframeA);
		section.keyframeB = math.clamp(0, 1, section.keyframeB);

		let keyframe;
		if (section.keyframeA < 1) {
			keyframe = `translate3d(0, ${math.denormalize(
				ease.inOutQuad(section.keyframeA),
				-260,
				0
			)}px, 0)`;
		} else {
			keyframe = `translate3d(0, ${math.denormalize(
				section.keyframeB,
				0,
				-260
			)}px, 0)`;
		}

		this.DOM.imageOverflow.style.transform = `translate3d(0, ${math.denormalize(
			ease.outQuint(this.data.progress),
			-260,
			0
		)}px, 0)`;
		// this.DOM.imageOverflow.style.transform = keyframe;
		this.DOM.image.style.transform = `translate3d(0, ${math.denormalize(
			section.progress,
			100,
			0
		)}px, 0)`;
	}
}

class SectionTwo extends Section {
	constructor({ section = null } = {}) {
		super({ section });

		this.DOM = { container: section.querySelector(".description__container") };

		this.animate = {
			from: { y: 0 },
			to: { y: 25 }
		};
	}

	run(scrollTop) {
		super.run(scrollTop);
		if (!this.isVisible) return;

		// animate
		const yTranslate = math.denormalize(
			this.data.progress,
			this.animate.to.y,
			this.animate.from.y
		);
		this.DOM.container.style.transform = `translate3d(0, ${yTranslate}px, 0)`;
	}
}

class SectionThree extends Section {
	constructor({ section = null } = {}) {
		super({ section });

		this.DOM = {
			container: document.getElementsByClassName("sign-up__container")[0],
			fixedImageOverflow: document.getElementById("image-two-overflow"),
			fixedImage: document.getElementById("image-two")
		};
	}

	run(scrollTop) {
		super.run(scrollTop);
		if (!this.isVisible) return;

		this.data.progress = math.normalize(this.data.current, this.data.height, 0);

		// animate
		this.DOM.container.style.transform = `translate3d(0, ${math.denormalize(
			this.data.progress,
			0,
			100
		)}px, 0)`;
		this.DOM.fixedImageOverflow.style.transform = `translate3d(0, ${math.denormalize(
			ease.inOutQuad(this.data.progress),
			0,
			100
		)}px, 0)`;
		this.DOM.fixedImage.style.transform = `translate3d(0, ${math.denormalize(
			this.data.progress,
			-100,
			0
		)}%, 0)`;
	}
}

class Introduction {
	constructor() {
		this.DOM = {
			navigation: document.getElementById("navigation"),
			links: document.getElementById("links"),
			topHeadline: document.getElementById("top-headline"),
			bottomHeadline: document.getElementById("bottom-headline"),
			fixedImageContainer: document.getElementById("fixed-image-container"),
			fixedImageOverflow: document.getElementById("image-one-overflow"),
			fixedImage: document.getElementById("fixed-image"),
			text: document.getElementById("text"),
			rightImage: document.getElementById("right-image"),
			description: document.getElementById("description")
		};

		this.animation = anime.timeline({
			easing: "easeOutExpo"
		});

		this.animation
			.add(
				{
					targets: this.DOM.navigation,
					translateY: ["-100%", "0%"],
					duration: 1000
				},
				0
			)
			.add(
				{
					targets: this.DOM.links,
					translateY: [-60, 0],
					duration: 900,
					delay: 100
				},
				0
			)
			.add(
				{
					targets: this.DOM.topHeadline,
					translateX: ["-80%", "0%"],
					duration: 900,
					delay: 100
				},
				0
			)
			.add(
				{
					targets: [this.DOM.bottomHeadline, this.DOM.text],
					translateX: ["-65%", "0%"],
					duration: 1000
				},
				0
			)
			.add(
				{
					targets: this.DOM.rightImage,
					translateX: ["110%", "0%"],
					translateY: [300, 0],
					duration: 750,
					delay: 250
				},
				0
			)
			.add(
				{
					targets: this.DOM.description,
					translateX: ["100%", "0%"],
					translateY: [200, 0],
					duration: 800,
					delay: 200
				},
				0
			)
			.add(
				{
					targets: [this.DOM.fixedImageContainer, this.DOM.fixedImageOverflow],
					translateX: ["50%", "0%"],
					translateY: [300, 0],
					duration: 1000
				},
				0
			)
			.add(
				{
					targets: this.DOM.fixedImage,
					translateX: ["-100%", "0%"],
					translateY: [-500, 0],
					duration: 1000
				},
				0
			);

		this.animation.pause();
	}

	play() {
		this.animation.play();
	}
}

// INIT PAGE
window.addEventListener("load", () => {
	const content = document.querySelector("[data-scroll]");
	const introduction = new Introduction();

	introduction.animation.complete = () => new ScrollManager({ content });

	document.querySelector(".main-body").classList.remove("loading");
	setTimeout(() => introduction.play(), 1000);
});