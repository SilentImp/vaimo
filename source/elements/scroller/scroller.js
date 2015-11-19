"use strict";
(function () {
    class Scroller {

        constructor() {
            let ready = new Promise(resolve => {
                if (document.readyState != "loading") return resolve();
                document.addEventListener("DOMContentLoaded", () => resolve());
            });
            ready.then(this.init.bind(this));
        }

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
            let transEndEventNames = {
                    'WebkitTransition': 'webkitTransitionEnd',
                    'MozTransition': 'transitionend',
                    'OTransition': 'oTransitionEnd',
                    'msTransition': 'MSTransitionEnd',
                    'transition': 'transitionend'
                }
                , transEndEventName = transEndEventNames[Modernizr.prefixed('transition')];

            if (Modernizr.hasEvent(transEndEventName, window)) {
                this.wrapper.addEventListener(transEndEventName, this.checkIndex.bind(this));
            }

            this.moveToFirst().delay().then(this.turnOn.bind(this));
            window.addEventListener('resize', this.resized.bind(this));
        }

        resized() {
            this.turnOff().delay().then(function () {
                this.moveToCurrent().delay().then(function () {
                    this.turnOn();
                }.bind(this));
            }.bind(this));
        }

        moveToCurrent() {
            this.move(this.current_page);
            return this;
        }

        moveToFirst() {
            this.current_page = 0;
            this.reposSlide();
            return this;
        }

        moveToLast() {
            this.current_page = this.count - 1;
            this.reposSlide();
            return this;
        }

        turnOn() {
            this.wrapper.style[Modernizr.prefixed('transition')] = Modernizr.prefixed('transform') + ' .25s';
            return this;
        }

        turnOff() {
            this.wrapper.style[Modernizr.prefixed('transition')] = 'none';
            return this;
        }

        move(index) {
            this.wrapper.style[Modernizr.prefixed('transform')] = 'translateX(' + (-this.wrapper.offsetWidth * (index + 1)) + 'px)';
        }

        async delay(milliseconds) {
            return new Promise(resolve => {
                setTimeout(resolve, milliseconds);
            });
        }

        async checkIndex(event) {
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

        stopAnimation() {
            this.animation = false;
        }

        startAnimation() {
            this.animation = true;
        }

        dropAnimation() {
            if (typeof (this.timer) != 'undefined') clearTimeout(this.timer);
            this.timer = setTimeout(this.stopAnimation.bind(this), 350);
        }

        createButton(index) {
            let button = document.createElement('BUTTON'), span = document.createElement('SPAN');
            button.setAttribute('type', 'button');
            button.setAttribute('data-page', index);
            button.classList.add('scroller__page');
            button.appendChild(span);
            button.addEventListener('click', this.scrollToSlide.bind(this));
            this.paginator.appendChild(button);
        }

        openSlide() {
            this.reposSlide();
            this.dropAnimation();
        }

        openPrevSlide(event) {
            if (this.animation === true) return;
            this.startAnimation();

            this.current_page--;
            this.prev_button.blur();
            this.openSlide();
        }

        openNextSlide(event) {
            if (this.animation === true) return;
            this.startAnimation();

            this.current_page++;
            this.next_button.blur();
            this.openSlide();
        }

        scrollToSlide(event) {
            if (this.animation === true) return;
            this.startAnimation();

            let button = event.currentTarget;
            this.current_page = parseInt(button.getAttribute('data-page'), 10);
            button.blur();
            this.openSlide();
        }

        reposSlide() {
            this.current_button.classList.toggle('scroller__page_current', false);
            this.current_button = this.paginator_buttons[Math.min(Math.max(this.current_page, 0), this.count - 1)];
            this.current_button.classList.toggle('scroller__page_current', true);
            this.move(this.current_page);
        }

    }
    new Scroller;
})();
