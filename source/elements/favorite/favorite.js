"use strict";
(function () {
    /**
     * Controls favorites block
     * @class
     */
    class Favorites {

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
            this.favorites = document.querySelector('.favorite');
            if (this.favorites === null) return;

            let products = this.favorites.querySelectorAll('.product');
            this.count = products.length;
            if (this.count == 0){
                this.favorites.parentNode.removeChild(this.favorites);
                delete this.count;
                delete this.favorites;
                return;
            }

            this.transitions = document.documentElement.classList.contains('csstransitions');
            this.transforms = document.documentElement.classList.contains('csstransforms');

            this.wrapper = this.favorites.querySelector('.favorite__wrapper-inner');

            this.next_button = this.favorites.querySelector('.favorite__button_next');
            this.prev_button = this.favorites.querySelector('.favorite__button_prev');
            this.menu = this.favorites.querySelector('.favorite__menu');

            this.next_button.addEventListener('click', this.next.bind(this));
            this.prev_button.addEventListener('click', this.prev.bind(this));

            this.margin = 20;
            this.current = 0;
            this.width = products[0].offsetWidth + this.margin;
            this.inline = Math.floor((this.wrapper.offsetWidth+this.margin)/this.width);

            if (this.inline>=this.count) {
                this.menu.classList.toggle('favorite__menu_hidden', true);
            } else {
                this.menu.classList.toggle('favorite__menu_hidden', false);
            }

            this.animation = false;
            this.timer = null;
            if (this.transitions) {
                let transEndEventNames = {
                        'WebkitTransition': 'webkitTransitionEnd',
                        'MozTransition': 'transitionend',
                        'OTransition': 'oTransitionEnd',
                        'msTransition': 'MSTransitionEnd',
                        'transition': 'transitionend'
                    };
                this.wrapper.addEventListener(transEndEventNames[Modernizr.prefixed('transition')], this.stopAnimation.bind(this));
            }
            window.addEventListener('resize', this.resize.bind(this));
        }

        /**
         * Set animation flag
         */
        startAnimation () {
            this.animation = true;
        }

        /**
         * Remove animation flag
         */
        stopAnimation () {
            if (this.timer != null) clearTimeout(this.timer);
            this.animation = false;
        }

        /**
         * Remove animation flag by timeout
         */
        dropAnimation () {
            if (this.timer != null) clearTimeout(this.timer);
            this.timer = setTimeout(this.stopAnimation.bind(this), 250);
        }

        /**
         * Select next slide and scroll
         */
        next () {
            this.current++;
            if (this.current == this.count-this.inline+1) {
                this.current = 0;
            }
            this.scroll();
            this.next_button.blur();
        }

        /**
         * Select previous slide and scroll
         */
        prev () {
            this.current--;
            if (this.current == -1) {
                this.current = this.count-this.inline;
            }
            this.scroll();
            this.prev_button.blur();
        }

        /**
         * Recount on resize
         */
        resize () {
            this.inline = Math.floor((this.wrapper.offsetWidth+this.margin)/this.width);

            if (this.inline>=this.count) {
                this.menu.classList.toggle('favorite__menu_hidden', true);
                this.current = 0;
            } else {
                this.menu.classList.toggle('favorite__menu_hidden', false);
            }
            this.scroll();
        }

        /**
         * Scroll to current slide
         */
        scroll () {
            if (this.transforms) {
                this.wrapper.style[Modernizr.prefixed('transform')] = 'translateX(' + (-this.width * (this.current)) + 'px)';
            } else {
                this.wrapper.style.right = (-this.width * (this.current)) + 'px';
            }
            this.dropAnimation();
        }
    }

    new Favorites;

})()
