"use strict";
(function () {
    /**
     * Controls scroller
     * @class
     */
    class Scroller {

        /**
         * Run init when dom is ready
         * @constructs
         */
        constructor() {
            let ready = new Promise(resolve => {
                if (document.readyState != "loading") return resolve();
                document.addEventListener("DOMContentLoaded", () => resolve());
            });
            ready.then(this.init.bind(this));
        }

        /**
         * Add events and initialize
         */
        init() {
            this.scroller = document.querySelector('.scroller');

            if (this.scroller === null) return;

            this.wrapper = this.scroller.querySelector('.scroller__wrapper-inner');
            this.slides = this.wrapper.querySelectorAll('.scroller__slide');
            this.count = this.slides.length;

            if (this.count === 0) {
                this.scroller.parentNode.removeChild(this.slides);
                delete this.wrapper;
                delete this.slides;
                delete this.scroller;
                delete this.count;
                return;
            }

            this.transitions = document.documentElement.classList.contains('csstransitions');
            this.transforms = document.documentElement.classList.contains('csstransforms');

            this.paginator = this.scroller.querySelector('.scroller__paginator');
            this.prev_button = this.scroller.querySelector('.scroller__prev');
            this.next_button = this.scroller.querySelector('.scroller__next');

            this.prev_button.addEventListener('click', this.openPrevSlide.bind(this));
            this.next_button.addEventListener('click', this.openNextSlide.bind(this));

            let first_slide = this.slides[0].cloneNode(true)
                , last_slide = this.slides[this.count - 1].cloneNode(true);

            first_slide.classList.add('cloned');
            last_slide.classList.add('cloned');
            this.wrapper.appendChild(first_slide);
            this.wrapper.insertBefore(last_slide, this.slides[0]);

            let index = this.count;
            while (index--) {
                this.createButton(this.count - index - 1);
            }

            this.current_page = 0;
            this.paginator_buttons = this.paginator.querySelectorAll('.scroller__page');
            this.current_button = this.paginator_buttons[0];
            this.current_button.classList.add('scroller__page_current');

            this.animation = false;
            this.tansition_timer = null;

            if (this.transitions) {
                let transEndEventNames = {
                        'WebkitTransition': 'webkitTransitionEnd',
                        'MozTransition': 'transitionend',
                        'OTransition': 'oTransitionEnd',
                        'msTransition': 'MSTransitionEnd',
                        'transition': 'transitionend'
                    };
                this.wrapper.addEventListener(transEndEventNames[Modernizr.prefixed('transition')], this.checkIndex.bind(this));
            }

            this.moveToFirst().delay().then(this.turnOn.bind(this));
            window.addEventListener('resize', this.resized.bind(this));
        }


        /**
         * Move to current slide
         */
        moveToCurrent() {
            this.move(this.current_page);
            return this;
        }

        /**
         * Move to first slide
         */
        moveToFirst() {
            this.current_page = 0;
            this.reposSlide();
            return this;
        }

        /**
         * Move to last slide
         */
        moveToLast() {
            this.current_page = this.count - 1;
            this.reposSlide();
            return this;
        }

        /**
         * Turn on scroll animation
         */
        turnOn() {
            this.wrapper.style[Modernizr.prefixed('transition')] = Modernizr.prefixed('transform') + ' .25s';
            return this;
        }

        /**
         * Turn off scroll animation
         */
        turnOff() {
            this.wrapper.style[Modernizr.prefixed('transition')] = 'none';
            return this;
        }

        /**
         * Show slide
         * @param {Number} index — slide number
         */
        move(index) {
            if (this.transforms) {
                this.wrapper.style[Modernizr.prefixed('transform')] = 'translateX(' + (-this.wrapper.offsetWidth * (index + 1)) + 'px)';
            } else {
                this.wrapper.style.right = (-this.wrapper.offsetWidth * (index + 1)) + 'px';
            }
        }

        /**
         * Rewind slides on resize
         */
        async resized() {
            this.turnOff();
            await this.delay(25);
            this.moveToCurrent();
            await this.delay(25);
            this.turnOn();
        }

        /**
         * Delay, so browser may rebuild DOM and CSS
         * @param {Number} milliseconds — delay duration
         */
        async delay(milliseconds) {
            return new Promise(resolve => {
                setTimeout(resolve, milliseconds);
            });
        }

        /**
         * Rewind slides
         */
        async checkIndex() {
            if (this.current_page == -1) {
                this.turnOff();
                await this.delay(25);
                this.moveToLast();
                await this.delay(25);
                this.turnOn();
            } else if (this.current_page == this.count) {
                this.turnOff();
                await this.delay(25);
                this.moveToFirst();
                await this.delay(25);
                this.turnOn();
            }
            this.stopAnimation();
        }

        /**
         * Remove animation flag
         */
        stopAnimation() {
            this.animation = false;
        }

        /**
         * Set animation flag
         */
        startAnimation() {
            this.animation = true;
        }

        /**
         * Remove animation flag by timeout
         */
        dropAnimation() {
            if (typeof (this.timer) != 'undefined') clearTimeout(this.timer);
            this.timer = setTimeout(this.stopAnimation.bind(this), 350);
        }

        /**
         * Create paginator button
         * @param {Number} index — slide number
         */
        createButton(index) {
            let button = document.createElement('BUTTON'), span = document.createElement('SPAN');
            button.setAttribute('type', 'button');
            button.setAttribute('data-page', index);
            button.classList.add('scroller__page');
            button.appendChild(span);
            button.addEventListener('click', this.scrollToSlide.bind(this));
            this.paginator.appendChild(button);
        }

        /**
         * Scroll to current slide
         */
        openSlide() {
            this.reposSlide();
            this.dropAnimation();
            if(!this.transitions) {
                if (this.tansition_timer!=null) clearTimeout(this.tansition_timer);
                this.tansition_timer = setTimeout(this.checkIndex.bind(this), 250);
            }
        }

        /**
         * Scroll to previous slide
         */
        openPrevSlide() {
            if (this.animation === true) return;
            this.startAnimation();

            this.current_page--;
            this.prev_button.blur();
            this.openSlide();
        }

        /**
         * Scroll to next slide
         */
        openNextSlide() {
            if (this.animation === true) return;
            this.startAnimation();

            this.current_page++;
            this.next_button.blur();
            this.openSlide();
        }

        /**
         * Scroll to selected slide
         * @param {Event} event — click event, so we may get paginator button
         */
        scrollToSlide(event) {
            if (this.animation === true) return;
            this.startAnimation();

            let button = event.currentTarget;
            this.current_page = parseInt(button.getAttribute('data-page'), 10);
            button.blur();
            this.openSlide();
        }

        /**
         * Move scroller to selected slide and set buttons state
         */
        reposSlide() {
            this.current_button.classList.toggle('scroller__page_current', false);
            this.current_button = this.paginator_buttons[Math.min(Math.max(this.current_page, 0), this.count - 1)];
            this.current_button.classList.toggle('scroller__page_current', true);
            this.move(this.current_page);
        }

    }
    new Scroller;
})();
