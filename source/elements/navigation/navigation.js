"use strict";
(function () {
    /**
     * Controls navigation on low resolution
     * @class
     */
    class Navigation {

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
        init () {
            this.navigation = document.querySelector('.navigation');
            if (this.navigation === null) return;

            let labels = this.navigation.querySelectorAll('.navigation__label');
            [].forEach.call(labels, label => {
                label.addEventListener('click', this.openDropdown.bind(this));
            });

            this.toggle = document.querySelector('.navigation__toggle');
            this.toggle.addEventListener('click', this.toggleNavigation.bind(this));
        }

        /**
         * Show and hide navigation on mobile
         */
        toggleNavigation () {
            this.navigation.classList.toggle('navigation_open');
            this.toggle.blur();
            document.body.classList.toggle('navigation_open');
        }

        /**
         * Show and hide dropdown
         * @param {Event} event — click event, so we may get dropdown to open
         */
        openDropdown (event) {
            event.currentTarget.classList.toggle('navigation__label_open');
            event.currentTarget.nextElementSibling.classList.toggle('navigation__container_open');
        }

    }

    new Navigation;
})();
