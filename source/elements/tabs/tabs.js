"use strict";
(function() {
    /**
     * @class Class handle tabs loading
     */
    class Tabs {
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
            this.widget = document.querySelector('.tabs');
            if (this.widget === null) return;

            let DONE = 4
                , OK = 200
                , xhr = new XMLHttpRequest()
                , sender = new Promise((resolve, reject) => {
                    try {
                        xhr.open('GET', this.widget.getAttribute('data-url'));
                            xhr.send();
                            xhr.onreadystatechange = () => {
                                if (xhr.readyState === DONE) {
                                    if (xhr.status === OK) {
                                        resolve(xhr.response);
                                    } else {
                                        reject(new Error(xhr.code + ': ' + xhr.statusText));
                                    }
                                }
                            };
                    } catch (error) {
                        reject(error);
                    }
                });

            sender.then(this.build.bind(this));
        }

        /**
         * @description Build widget
         */
        build (message) {
            let data = JSON.parse(message.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\f/g, "\\f"));

            this.current_button = null;
            this.current_tab = null;

            if (data.length == 0) {
                this.widget.parentNode.removeChild(this.widget);
                delete this.widget;
                return;
            }

            let menu = document.createElement('MENU');
            menu.setAttribute('type', 'toolbar');
            menu.classList.add('tabs__menu');
            this.widget.appendChild(menu);

            for (let tab of data) {

                let button = document.createElement('BUTTON')
                    , container = document.createElement('SECTION')
                    , text = tab.Content.split('\n\n');

                button.setAttribute('type', 'button');
                button.setAttribute('data-target', tab.Title);
                button.classList.add('tabs__button');
                button.appendChild(document.createTextNode(tab.Title));
                button.addEventListener('click', this.openTab.bind(this));
                menu.appendChild(button);

                container.setAttribute('data-tab', tab.Title);
                container.classList.add('tabs__tab');

                for (let paragraph of text) {
                    let p = document.createElement('P');
                    p.appendChild(document.createTextNode(paragraph));
                    container.appendChild(p);
                }

                this.widget.appendChild(container);
            }

            menu.querySelector('button').click();
            this.widget.classList.add('tabs_builded');
        }

        openTab (event) {
            let button = event.currentTarget
                , target = button.getAttribute('data-target');

            if (this.current_tab != null) {
                this.current_tab.classList.toggle('tabs__tab_current', false);
            }

            if (this.current_button != null) {
                this.current_button.classList.toggle('tabs__button_current', false);
            }

            this.current_button = button;
            this.current_button.classList.toggle('tabs__button_current', true);

            this.current_tab = this.widget.querySelector('[data-tab=' + target + ']');
            if (this.current_tab != null) {
                this.current_tab.classList.toggle('tabs__tab_current', true);
            }
        }
    }

    new Tabs;
})();
