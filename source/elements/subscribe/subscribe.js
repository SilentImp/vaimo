"use strict";
(function() {
    /**
     * @class Class handle subscription process
     */
    class Subscribe {
        /**
         * @description Start initialization on domload
         * @constructor
         */
        constructor() {
            let ready = new Promise((resolve, reject) => {
                if (document.readyState != "loading") return resolve();
                document.addEventListener("DOMContentLoaded", () => resolve());
            });
            ready.then(this.init.bind(this));
        }

        /**
         * @description Adding events and properties
         */
        init() {
            this.form = document.querySelector('.subscribe');
            if (this.form === null) return;

            this.input = this.form.querySelector('.subscribe__email');
            this.success_message = this.form.querySelector('.subscribe__state_success');
            this.success_fail = this.form.querySelector('.subscribe__state_fail');
            this.success_progress = this.form.querySelector('.subscribe__state_in-progress');

            this.form.setAttribute('novalidate', true);
            this.form.addEventListener('submit', this.validateForm.bind(this));
        }

        /**
         * @description Validating user input
         */
        validateForm(event) {
            event.preventDefault();

            let email_regex = new RegExp("^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$");
            if (
                (this.input.value.trim().length > 0 && email_regex.test(this.input.value.trim()) === false || this.input.value.trim().length === 0)
                || (this.input.value.trim().length === 0)
            ){
                this.setState('fail');
                return;
            }

            let DONE = 4
                , OK = 200
                , xhr = new XMLHttpRequest()
                , sender = new Promise((resolve, reject) => {
                    xhr.open('POST', this.form.getAttribute('action'));
                        xhr.send(new FormData(this.form));
                        xhr.onreadystatechange = () => {
                            if (xhr.readyState === DONE) {
                                this.form.reset();
                                this.setState();
                                if (xhr.status === OK) {
                                    resolve(xhr.statusText);
                                } else {
                                    reject(new Error(xhr.statusText));
                                }
                            }
                        };
                    });

            this.setState('progress');
            sender.then(this.success.bind(this)).catch(this.fail.bind(this));
        }

        /**
         * @description request have succeeded
         * @param {String} message server answer
         */
        success (message) {
            this.setState('success');
        }

        /**
         * @description request have failed
         * @param {Error} error error object
         */
        fail (error) {
            this.setState('fail');
        }

        /**
         * @description Set subscription state
         * @param {String} state new state
         */
        setState (state) {

            let fail = false,
                success = false,
                progress = false;

            switch (state) {
                case "fail":
                    fail = true;
                    this.input.focus();
                    break;
                case "success":
                    success = true;
                    this.input.blur();
                    break;
                case "progress":
                    progress = true;
                    break;
            }

            this.form.classList.toggle('subscribe_fail', fail);
            this.form.classList.toggle('subscribe_success', success);
            this.form.classList.toggle('subscribe_progress', progress);
        }

    }
    new Subscribe;
})();
