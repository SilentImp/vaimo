"use strict";

(function () {
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
            if (this.input.value.trim().length > 0 && email_regex.test(this.input.value.trim()) === false || this.input.value.trim().length === 0 || this.input.value.trim().length === 0) {
                this.setState('fail');
                return;
            }

            let DONE = 4,
                OK = 200,
                xhr = new XMLHttpRequest(),
                sender = new Promise((resolve, reject) => {
                try {
                    xhr.open('POST', this.form.getAttribute('action'));
                    xhr.send(new FormData(this.form));
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === DONE) {
                            this.form.reset();
                            this.setState();
                            if (xhr.status === OK) {
                                resolve(xhr.statusText);
                            } else {
                                reject(new Error(xhr.code + ': ' + xhr.statusText));
                            }
                        }
                    };
                } catch (error) {
                    reject(error);
                }
            });

            this.setState('progress');
            sender.then(this.success.bind(this)).catch(this.fail.bind(this));
        }

        /**
         * @description request have succeeded
         * @param {String} message server answer
         */
        success(message) {
            this.setState('success');
        }

        /**
         * @description request have failed
         * @param {Error} error error object
         */
        fail(error) {
            this.setState('fail');
        }

        /**
         * @description Set subscription state
         * @param {String} state new state
         */
        setState(state) {

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
    new Subscribe();
})();
"use strict";

(function () {
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

            let DONE = 4,
                OK = 200,
                xhr = new XMLHttpRequest(),
                sender = new Promise((resolve, reject) => {
                try {
                    xhr.open('GET', this.widget.getAttribute('data-url'));
                    xhr.send();
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === DONE) {
                            if (xhr.status === OK) {
                                resolve(xhr.statusText);
                            } else {
                                reject(new Error(xhr.code + ': ' + xhr.statusText));
                            }
                        }
                    };
                } catch (error) {
                    reject(error);
                }
            });

            sender.then(this.build.bind(this)).catch(this.foo_build.bind(this));
        }

        /**
         * @description Foo build widget
         */
        foo_build() {
            this.build('[{"Title":"Women","Content":"11:54:55 Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem ligula, luctus et aliquet eget, ultrices eu sem. Fusce enim lacus, sodales vel sollicitudin vitae, pretium non urna. Suspendisse scelerisque ligula at nulla gravida fringilla. Vivamus sed fermentum sem. Aenean volutpat porta dui, vel tempor diam. Curabitur non convallis diam. Ut mattis non ante nec pharetra. Praesent pulvinar mollis velit sit amet aliquam. Morbi vulputate tincidunt quam quis viverra. Fusce bibendum pulvinar turpis eu tristique. Proin et suscipit sapien.\n\nPellentesque tristique accumsan dui. Donec eu mattis elit. Etiam nisl felis, imperdiet vitae tempor sed, dignissim at arcu. Etiam eleifend urna ut lorem condimentum ultricies. In viverra quis metus ut imperdiet. Morbi enim odio, condimentum ut nibh sit amet, blandit mollis tellus. Nullam tincidunt diam purus, sed posuere lacus lobortis id. Nullam vestibulum mauris quis nisl commodo, quis ultricies tortor blandit. Morbi hendrerit ut justo et venenatis. Integer rutrum massa vel mi eleifend rutrum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed molestie consectetur velit ut viverra. Phasellus turpis odio, posuere a tellus eget, interdum dictum nulla. Donec porta est lacinia lobortis sagittis. Ut ut ipsum tempus, fermentum libero et, tincidunt arcu. Nunc a diam urna. Phasellus lacinia, felis a fermentum laoreet, ipsum velit luctus mi, quis porttitor metus eros vitae orci. Phasellus dapibus nulla ultricies arcu gravida ornare. Duis vitae posuere enim. In quis feugiat nibh. Aliquam dictum velit suscipit leo lobortis ornare. Fusce pretium tellus sed felis feugiat rhoncus eu et magna. Aliquam erat volutpat. Ut ipsum enim, molestie id mi non, laoreet placerat tortor. Donec commodo, ipsum non dignissim condimentum, tortor orci sagittis eros, at hendrerit ligula elit in sapien.\n\nInteger aliquet quam sem, eget aliquet nulla consequat at. Aenean commodo ante non sodales posuere. Cras commodo turpis nec sodales pellentesque. Donec tincidunt mauris dui, et adipiscing tortor gravida a. Etiam eget urna interdum massa suscipit vestibulum nec at ante. Aenean pharetra placerat lobortis. Nullam tincidunt interdum congue. Ut non enim mi. In sit amet justo vehicula, posuere enim eu, egestas leo. Maecenas blandit urna nunc, et elementum est euismod non. In imperdiet diam nec arcu cursus porta. Morbi consequat diam at quam convallis, vel rutrum nulla scelerisque.\n\nMorbi aliquam orci quis nibh egestas, in suscipit erat volutpat. Donec at accumsan augue, sed elementum libero. Donec in fermentum mauris. Vivamus vestibulum, ligula eget molestie vehicula, risus ante faucibus libero, et pellentesque ipsum turpis sollicitudin erat. Nulla facilisi. Vivamus quis porta erat. Pellentesque vitae rutrum turpis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla sit amet aliquet sem, vel venenatis nulla. Suspendisse ac tortor iaculis, lobortis sapien non, sodales tortor. Suspendisse ipsum arcu, lobortis ac placerat quis, varius nec quam. Quisque vehicula mi ut diam ullamcorper blandit."},{"Title":"Men","Content":"20151112 Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem ligula, luctus et aliquet eget, ultrices eu sem. Fusce enim lacus, sodales vel sollicitudin vitae, pretium non urna. Suspendisse scelerisque ligula at nulla gravida fringilla. Vivamus sed fermentum sem. Aenean volutpat porta dui, vel tempor diam. Curabitur non convallis diam. Ut mattis non ante nec pharetra. Praesent pulvinar mollis velit sit amet aliquam. Morbi vulputate tincidunt quam quis viverra. Fusce bibendum pulvinar turpis eu tristique. Proin et suscipit sapien.\n\nPellentesque tristique accumsan dui. Donec eu mattis elit. Etiam nisl felis, imperdiet vitae tempor sed, dignissim at arcu. Etiam eleifend urna ut lorem condimentum ultricies. In viverra quis metus ut imperdiet. Morbi enim odio, condimentum ut nibh sit amet, blandit mollis tellus. Nullam tincidunt diam purus, sed posuere lacus lobortis id. Nullam vestibulum mauris quis nisl commodo, quis ultricies tortor blandit. Morbi hendrerit ut justo et venenatis. Integer rutrum massa vel mi eleifend rutrum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed molestie consectetur velit ut viverra. Phasellus turpis odio, posuere a tellus eget, interdum dictum nulla. Donec porta est lacinia lobortis sagittis. Ut ut ipsum tempus, fermentum libero et, tincidunt arcu. Nunc a diam urna. Phasellus lacinia, felis a fermentum laoreet, ipsum velit luctus mi, quis porttitor metus eros vitae orci. Phasellus dapibus nulla ultricies arcu gravida ornare. Duis vitae posuere enim. In quis feugiat nibh. Aliquam dictum velit suscipit leo lobortis ornare. Fusce pretium tellus sed felis feugiat rhoncus eu et magna. Aliquam erat volutpat. Ut ipsum enim, molestie id mi non, laoreet placerat tortor. Donec commodo, ipsum non dignissim condimentum, tortor orci sagittis eros, at hendrerit ligula elit in sapien.\n\nInteger aliquet quam sem, eget aliquet nulla consequat at. Aenean commodo ante non sodales posuere. Cras commodo turpis nec sodales pellentesque. Donec tincidunt mauris dui, et adipiscing tortor gravida a. Etiam eget urna interdum massa suscipit vestibulum nec at ante. Aenean pharetra placerat lobortis. Nullam tincidunt interdum congue. Ut non enim mi. In sit amet justo vehicula, posuere enim eu, egestas leo. Maecenas blandit urna nunc, et elementum est euismod non. In imperdiet diam nec arcu cursus porta. Morbi consequat diam at quam convallis, vel rutrum nulla scelerisque.\n\nMorbi aliquam orci quis nibh egestas, in suscipit erat volutpat. Donec at accumsan augue, sed elementum libero. Donec in fermentum mauris. Vivamus vestibulum, ligula eget molestie vehicula, risus ante faucibus libero, et pellentesque ipsum turpis sollicitudin erat. Nulla facilisi. Vivamus quis porta erat. Pellentesque vitae rutrum turpis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla sit amet aliquet sem, vel venenatis nulla. Suspendisse ac tortor iaculis, lobortis sapien non, sodales tortor. Suspendisse ipsum arcu, lobortis ac placerat quis, varius nec quam. Quisque vehicula mi ut diam ullamcorper blandit."},{"Title":"Junior","Content":"November 12, 2015, 11:54 am Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem ligula, luctus et aliquet eget, ultrices eu sem. Fusce enim lacus, sodales vel sollicitudin vitae, pretium non urna. Suspendisse scelerisque ligula at nulla gravida fringilla. Vivamus sed fermentum sem. Aenean volutpat porta dui, vel tempor diam. Curabitur non convallis diam. Ut mattis non ante nec pharetra. Praesent pulvinar mollis velit sit amet aliquam. Morbi vulputate tincidunt quam quis viverra. Fusce bibendum pulvinar turpis eu tristique. Proin et suscipit sapien.\n\nPellentesque tristique accumsan dui. Donec eu mattis elit. Etiam nisl felis, imperdiet vitae tempor sed, dignissim at arcu. Etiam eleifend urna ut lorem condimentum ultricies. In viverra quis metus ut imperdiet. Morbi enim odio, condimentum ut nibh sit amet, blandit mollis tellus. Nullam tincidunt diam purus, sed posuere lacus lobortis id. Nullam vestibulum mauris quis nisl commodo, quis ultricies tortor blandit. Morbi hendrerit ut justo et venenatis. Integer rutrum massa vel mi eleifend rutrum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed molestie consectetur velit ut viverra. Phasellus turpis odio, posuere a tellus eget, interdum dictum nulla. Donec porta est lacinia lobortis sagittis. Ut ut ipsum tempus, fermentum libero et, tincidunt arcu. Nunc a diam urna. Phasellus lacinia, felis a fermentum laoreet, ipsum velit luctus mi, quis porttitor metus eros vitae orci. Phasellus dapibus nulla ultricies arcu gravida ornare. Duis vitae posuere enim. In quis feugiat nibh. Aliquam dictum velit suscipit leo lobortis ornare. Fusce pretium tellus sed felis feugiat rhoncus eu et magna. Aliquam erat volutpat. Ut ipsum enim, molestie id mi non, laoreet placerat tortor. Donec commodo, ipsum non dignissim condimentum, tortor orci sagittis eros, at hendrerit ligula elit in sapien.\n\nInteger aliquet quam sem, eget aliquet nulla consequat at. Aenean commodo ante non sodales posuere. Cras commodo turpis nec sodales pellentesque. Donec tincidunt mauris dui, et adipiscing tortor gravida a. Etiam eget urna interdum massa suscipit vestibulum nec at ante. Aenean pharetra placerat lobortis. Nullam tincidunt interdum congue. Ut non enim mi. In sit amet justo vehicula, posuere enim eu, egestas leo. Maecenas blandit urna nunc, et elementum est euismod non. In imperdiet diam nec arcu cursus porta. Morbi consequat diam at quam convallis, vel rutrum nulla scelerisque.\n\nMorbi aliquam orci quis nibh egestas, in suscipit erat volutpat. Donec at accumsan augue, sed elementum libero. Donec in fermentum mauris. Vivamus vestibulum, ligula eget molestie vehicula, risus ante faucibus libero, et pellentesque ipsum turpis sollicitudin erat. Nulla facilisi. Vivamus quis porta erat. Pellentesque vitae rutrum turpis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla sit amet aliquet sem, vel venenatis nulla. Suspendisse ac tortor iaculis, lobortis sapien non, sodales tortor. Suspendisse ipsum arcu, lobortis ac placerat quis, varius nec quam. Quisque vehicula mi ut diam ullamcorper blandit."}]');
        }

        /**
         * @description Build widget
         */
        build(message) {
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

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    let tab = _step.value;

                    let button = document.createElement('BUTTON'),
                        container = document.createElement('SECTION'),
                        text = tab.Content.split('\n\n');

                    button.setAttribute('type', 'button');
                    button.setAttribute('data-target', tab.Title);
                    button.classList.add('tabs__button');
                    button.appendChild(document.createTextNode(tab.Title));
                    button.addEventListener('click', this.openTab.bind(this));
                    menu.appendChild(button);

                    container.setAttribute('data-tab', tab.Title);
                    container.classList.add('tabs__tab');

                    var _iteratorNormalCompletion2 = true;
                    var _didIteratorError2 = false;
                    var _iteratorError2 = undefined;

                    try {
                        for (var _iterator2 = text[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                            let paragraph = _step2.value;

                            let p = document.createElement('P');
                            p.appendChild(document.createTextNode(paragraph));
                            container.appendChild(p);
                        }
                    } catch (err) {
                        _didIteratorError2 = true;
                        _iteratorError2 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion2 && _iterator2.return) {
                                _iterator2.return();
                            }
                        } finally {
                            if (_didIteratorError2) {
                                throw _iteratorError2;
                            }
                        }
                    }

                    this.widget.appendChild(container);
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            menu.querySelector('button').click();
            this.widget.classList.add('tabs_builded');
        }

        openTab(event) {
            let button = event.currentTarget,
                target = button.getAttribute('data-target');

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

    new Tabs();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInN1YnNjcmliZS5qcyIsInRhYnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsWUFBWSxDQUFDOztBQUNiLENBQUMsWUFBVzs7OztBQUlSLFVBQU0sU0FBUyxDQUFDOzs7OztBQUtaLG1CQUFXLEdBQUc7QUFDVixnQkFBSSxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxLQUFLO0FBQ3pDLG9CQUFJLFFBQVEsQ0FBQyxVQUFVLElBQUksU0FBUyxFQUFFLE9BQU8sT0FBTyxFQUFFLENBQUM7QUFDdkQsd0JBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLE9BQU8sRUFBRSxDQUFDLENBQUM7YUFDbEUsQ0FBQyxDQUFDO0FBQ0gsaUJBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNwQzs7Ozs7QUFBQSxBQUtELFlBQUksR0FBRztBQUNILGdCQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDakQsZ0JBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUUsT0FBTzs7QUFFL0IsZ0JBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUMxRCxnQkFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzVFLGdCQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFDdEUsZ0JBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDOztBQUVqRixnQkFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENB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ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuKGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIEBjbGFzcyBDbGFzcyBoYW5kbGUgc3Vic2NyaXB0aW9uIHByb2Nlc3NcbiAgICAgKi9cbiAgICBjbGFzcyBTdWJzY3JpYmUge1xuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIFN0YXJ0IGluaXRpYWxpemF0aW9uIG9uIGRvbWxvYWRcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIGxldCByZWFkeSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSAhPSBcImxvYWRpbmdcIikgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZWFkeS50aGVuKHRoaXMuaW5pdC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gQWRkaW5nIGV2ZW50cyBhbmQgcHJvcGVydGllc1xuICAgICAgICAgKi9cbiAgICAgICAgaW5pdCgpIHtcbiAgICAgICAgICAgIHRoaXMuZm9ybSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zdWJzY3JpYmUnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmZvcm0gPT09IG51bGwpIHJldHVybjtcblxuICAgICAgICAgICAgdGhpcy5pbnB1dCA9IHRoaXMuZm9ybS5xdWVyeVNlbGVjdG9yKCcuc3Vic2NyaWJlX19lbWFpbCcpO1xuICAgICAgICAgICAgdGhpcy5zdWNjZXNzX21lc3NhZ2UgPSB0aGlzLmZvcm0ucXVlcnlTZWxlY3RvcignLnN1YnNjcmliZV9fc3RhdGVfc3VjY2VzcycpO1xuICAgICAgICAgICAgdGhpcy5zdWNjZXNzX2ZhaWwgPSB0aGlzLmZvcm0ucXVlcnlTZWxlY3RvcignLnN1YnNjcmliZV9fc3RhdGVfZmFpbCcpO1xuICAgICAgICAgICAgdGhpcy5zdWNjZXNzX3Byb2dyZXNzID0gdGhpcy5mb3JtLnF1ZXJ5U2VsZWN0b3IoJy5zdWJzY3JpYmVfX3N0YXRlX2luLXByb2dyZXNzJyk7XG5cbiAgICAgICAgICAgIHRoaXMuZm9ybS5zZXRBdHRyaWJ1dGUoJ25vdmFsaWRhdGUnLCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuZm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCB0aGlzLnZhbGlkYXRlRm9ybS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gVmFsaWRhdGluZyB1c2VyIGlucHV0XG4gICAgICAgICAqL1xuICAgICAgICB2YWxpZGF0ZUZvcm0oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBlbWFpbF9yZWdleCA9IG5ldyBSZWdFeHAoXCJeKFthLXpBLVowLTlfXFwuXFwtXSkrXFxAKChbYS16QS1aMC05XFwtXSkrXFwuKSsoW2EtekEtWjAtOV17Miw0fSkrJFwiKTtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAodGhpcy5pbnB1dC52YWx1ZS50cmltKCkubGVuZ3RoID4gMCAmJiBlbWFpbF9yZWdleC50ZXN0KHRoaXMuaW5wdXQudmFsdWUudHJpbSgpKSA9PT0gZmFsc2UgfHwgdGhpcy5pbnB1dC52YWx1ZS50cmltKCkubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgICAgIHx8ICh0aGlzLmlucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPT09IDApXG4gICAgICAgICAgICApe1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoJ2ZhaWwnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBET05FID0gNFxuICAgICAgICAgICAgICAgICwgT0sgPSAyMDBcbiAgICAgICAgICAgICAgICAsIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICAgICAgICAgICAgLCBzZW5kZXIgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4aHIub3BlbignUE9TVCcsIHRoaXMuZm9ybS5nZXRBdHRyaWJ1dGUoJ2FjdGlvbicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZW5kKG5ldyBGb3JtRGF0YSh0aGlzLmZvcm0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSBET05FKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZm9ybS5yZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSBPSykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh4aHIuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKHhoci5jb2RlICsgJzogJyArIHhoci5zdGF0dXNUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKCdwcm9ncmVzcycpO1xuICAgICAgICAgICAgc2VuZGVyLnRoZW4odGhpcy5zdWNjZXNzLmJpbmQodGhpcykpLmNhdGNoKHRoaXMuZmFpbC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gcmVxdWVzdCBoYXZlIHN1Y2NlZWRlZFxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBzZXJ2ZXIgYW5zd2VyXG4gICAgICAgICAqL1xuICAgICAgICBzdWNjZXNzIChtZXNzYWdlKSB7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKCdzdWNjZXNzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIHJlcXVlc3QgaGF2ZSBmYWlsZWRcbiAgICAgICAgICogQHBhcmFtIHtFcnJvcn0gZXJyb3IgZXJyb3Igb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBmYWlsIChlcnJvcikge1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSgnZmFpbCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXNjcmlwdGlvbiBTZXQgc3Vic2NyaXB0aW9uIHN0YXRlXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdGF0ZSBuZXcgc3RhdGVcbiAgICAgICAgICovXG4gICAgICAgIHNldFN0YXRlIChzdGF0ZSkge1xuXG4gICAgICAgICAgICBsZXQgZmFpbCA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IGZhbHNlO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcImZhaWxcIjpcbiAgICAgICAgICAgICAgICAgICAgZmFpbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInN1Y2Nlc3NcIjpcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXQuYmx1cigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwicHJvZ3Jlc3NcIjpcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5mb3JtLmNsYXNzTGlzdC50b2dnbGUoJ3N1YnNjcmliZV9mYWlsJywgZmFpbCk7XG4gICAgICAgICAgICB0aGlzLmZvcm0uY2xhc3NMaXN0LnRvZ2dsZSgnc3Vic2NyaWJlX3N1Y2Nlc3MnLCBzdWNjZXNzKTtcbiAgICAgICAgICAgIHRoaXMuZm9ybS5jbGFzc0xpc3QudG9nZ2xlKCdzdWJzY3JpYmVfcHJvZ3Jlc3MnLCBwcm9ncmVzcyk7XG4gICAgICAgIH1cblxuICAgIH1cbiAgICBuZXcgU3Vic2NyaWJlO1xufSkoKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuKGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIEBjbGFzcyBDbGFzcyBoYW5kbGUgdGFicyBsb2FkaW5nXG4gICAgICovXG4gICAgY2xhc3MgVGFicyB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gU3RhcnQgaW5pdGlhbGl6YXRpb24gb24gZG9tbG9hZFxuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgbGV0IHJlYWR5ID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlICE9IFwibG9hZGluZ1wiKSByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHJlc29sdmUoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlYWR5LnRoZW4odGhpcy5pbml0LmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXNjcmlwdGlvbiBBZGRpbmcgZXZlbnRzIGFuZCBwcm9wZXJ0aWVzXG4gICAgICAgICAqL1xuICAgICAgICBpbml0KCkge1xuICAgICAgICAgICAgdGhpcy53aWRnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudGFicycpO1xuICAgICAgICAgICAgaWYgKHRoaXMud2lkZ2V0ID09PSBudWxsKSByZXR1cm47XG5cbiAgICAgICAgICAgIGxldCBET05FID0gNFxuICAgICAgICAgICAgICAgICwgT0sgPSAyMDBcbiAgICAgICAgICAgICAgICAsIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICAgICAgICAgICAgLCBzZW5kZXIgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4aHIub3BlbignR0VUJywgdGhpcy53aWRnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLXVybCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4aHIuc2VuZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gRE9ORSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IE9LKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh4aHIuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoeGhyLmNvZGUgKyAnOiAnICsgeGhyLnN0YXR1c1RleHQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNlbmRlci50aGVuKHRoaXMuYnVpbGQuYmluZCh0aGlzKSkuY2F0Y2godGhpcy5mb29fYnVpbGQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIEZvbyBidWlsZCB3aWRnZXRcbiAgICAgICAgICovXG4gICAgICAgIGZvb19idWlsZCAoKSB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkKCdbe1wiVGl0bGVcIjpcIldvbWVuXCIsXCJDb250ZW50XCI6XCIxMTo1NDo1NSBMb3JlbSBpcHN1bSBkb2xvciBzaXQgYW1ldCwgY29uc2VjdGV0dXIgYWRpcGlzY2luZyBlbGl0LiBNYXVyaXMgc2VtIGxpZ3VsYSwgbHVjdHVzIGV0IGFsaXF1ZXQgZWdldCwgdWx0cmljZXMgZXUgc2VtLiBGdXNjZSBlbmltIGxhY3VzLCBzb2RhbGVzIHZlbCBzb2xsaWNpdHVkaW4gdml0YWUsIHByZXRpdW0gbm9uIHVybmEuIFN1c3BlbmRpc3NlIHNjZWxlcmlzcXVlIGxpZ3VsYSBhdCBudWxsYSBncmF2aWRhIGZyaW5naWxsYS4gVml2YW11cyBzZWQgZmVybWVudHVtIHNlbS4gQWVuZWFuIHZvbHV0cGF0IHBvcnRhIGR1aSwgdmVsIHRlbXBvciBkaWFtLiBDdXJhYml0dXIgbm9uIGNvbnZhbGxpcyBkaWFtLiBVdCBtYXR0aXMgbm9uIGFudGUgbmVjIHBoYXJldHJhLiBQcmFlc2VudCBwdWx2aW5hciBtb2xsaXMgdmVsaXQgc2l0IGFtZXQgYWxpcXVhbS4gTW9yYmkgdnVscHV0YXRlIHRpbmNpZHVudCBxdWFtIHF1aXMgdml2ZXJyYS4gRnVzY2UgYmliZW5kdW0gcHVsdmluYXIgdHVycGlzIGV1IHRyaXN0aXF1ZS4gUHJvaW4gZXQgc3VzY2lwaXQgc2FwaWVuLlxcblxcblBlbGxlbnRlc3F1ZSB0cmlzdGlxdWUgYWNjdW1zYW4gZHVpLiBEb25lYyBldSBtYXR0aXMgZWxpdC4gRXRpYW0gbmlzbCBmZWxpcywgaW1wZXJkaWV0IHZpdGFlIHRlbXBvciBzZWQsIGRpZ25pc3NpbSBhdCBhcmN1LiBFdGlhbSBlbGVpZmVuZCB1cm5hIHV0IGxvcmVtIGNvbmRpbWVudHVtIHVsdHJpY2llcy4gSW4gdml2ZXJyYSBxdWlzIG1ldHVzIHV0IGltcGVyZGlldC4gTW9yYmkgZW5pbSBvZGlvLCBjb25kaW1lbnR1bSB1dCBuaWJoIHNpdCBhbWV0LCBibGFuZGl0IG1vbGxpcyB0ZWxsdXMuIE51bGxhbSB0aW5jaWR1bnQgZGlhbSBwdXJ1cywgc2VkIHBvc3VlcmUgbGFjdXMgbG9ib3J0aXMgaWQuIE51bGxhbSB2ZXN0aWJ1bHVtIG1hdXJpcyBxdWlzIG5pc2wgY29tbW9kbywgcXVpcyB1bHRyaWNpZXMgdG9ydG9yIGJsYW5kaXQuIE1vcmJpIGhlbmRyZXJpdCB1dCBqdXN0byBldCB2ZW5lbmF0aXMuIEludGVnZXIgcnV0cnVtIG1hc3NhIHZlbCBtaSBlbGVpZmVuZCBydXRydW0uIFZlc3RpYnVsdW0gYW50ZSBpcHN1bSBwcmltaXMgaW4gZmF1Y2lidXMgb3JjaSBsdWN0dXMgZXQgdWx0cmljZXMgcG9zdWVyZSBjdWJpbGlhIEN1cmFlOyBTZWQgbW9sZXN0aWUgY29uc2VjdGV0dXIgdmVsaXQgdXQgdml2ZXJyYS4gUGhhc2VsbHVzIHR1cnBpcyBvZGlvLCBwb3N1ZXJlIGEgdGVsbHVzIGVnZXQsIGludGVyZHVtIGRpY3R1bSBudWxsYS4gRG9uZWMgcG9ydGEgZXN0IGxhY2luaWEgbG9ib3J0aXMgc2FnaXR0aXMuIFV0IHV0IGlwc3VtIHRlbXB1cywgZmVybWVudHVtIGxpYmVybyBldCwgdGluY2lkdW50IGFyY3UuIE51bmMgYSBkaWFtIHVybmEuIFBoYXNlbGx1cyBsYWNpbmlhLCBmZWxpcyBhIGZlcm1lbnR1bSBsYW9yZWV0LCBpcHN1bSB2ZWxpdCBsdWN0dXMgbWksIHF1aXMgcG9ydHRpdG9yIG1ldHVzIGVyb3Mgdml0YWUgb3JjaS4gUGhhc2VsbHVzIGRhcGlidXMgbnVsbGEgdWx0cmljaWVzIGFyY3UgZ3JhdmlkYSBvcm5hcmUuIER1aXMgdml0YWUgcG9zdWVyZSBlbmltLiBJbiBxdWlzIGZldWdpYXQgbmliaC4gQWxpcXVhbSBkaWN0dW0gdmVsaXQgc3VzY2lwaXQgbGVvIGxvYm9ydGlzIG9ybmFyZS4gRnVzY2UgcHJldGl1bSB0ZWxsdXMgc2VkIGZlbGlzIGZldWdpYXQgcmhvbmN1cyBldSBldCBtYWduYS4gQWxpcXVhbSBlcmF0IHZvbHV0cGF0LiBVdCBpcHN1bSBlbmltLCBtb2xlc3RpZSBpZCBtaSBub24sIGxhb3JlZXQgcGxhY2VyYXQgdG9ydG9yLiBEb25lYyBjb21tb2RvLCBpcHN1bSBub24gZGlnbmlzc2ltIGNvbmRpbWVudHVtLCB0b3J0b3Igb3JjaSBzYWdpdHRpcyBlcm9zLCBhdCBoZW5kcmVyaXQgbGlndWxhIGVsaXQgaW4gc2FwaWVuLlxcblxcbkludGVnZXIgYWxpcXVldCBxdWFtIHNlbSwgZWdldCBhbGlxdWV0IG51bGxhIGNvbnNlcXVhdCBhdC4gQWVuZWFuIGNvbW1vZG8gYW50ZSBub24gc29kYWxlcyBwb3N1ZXJlLiBDcmFzIGNvbW1vZG8gdHVycGlzIG5lYyBzb2RhbGVzIHBlbGxlbnRlc3F1ZS4gRG9uZWMgdGluY2lkdW50IG1hdXJpcyBkdWksIGV0IGFkaXBpc2NpbmcgdG9ydG9yIGdyYXZpZGEgYS4gRXRpYW0gZWdldCB1cm5hIGludGVyZHVtIG1hc3NhIHN1c2NpcGl0IHZlc3RpYnVsdW0gbmVjIGF0IGFudGUuIEFlbmVhbiBwaGFyZXRyYSBwbGFjZXJhdCBsb2JvcnRpcy4gTnVsbGFtIHRpbmNpZHVudCBpbnRlcmR1bSBjb25ndWUuIFV0IG5vbiBlbmltIG1pLiBJbiBzaXQgYW1ldCBqdXN0byB2ZWhpY3VsYSwgcG9zdWVyZSBlbmltIGV1LCBlZ2VzdGFzIGxlby4gTWFlY2VuYXMgYmxhbmRpdCB1cm5hIG51bmMsIGV0IGVsZW1lbnR1bSBlc3QgZXVpc21vZCBub24uIEluIGltcGVyZGlldCBkaWFtIG5lYyBhcmN1IGN1cnN1cyBwb3J0YS4gTW9yYmkgY29uc2VxdWF0IGRpYW0gYXQgcXVhbSBjb252YWxsaXMsIHZlbCBydXRydW0gbnVsbGEgc2NlbGVyaXNxdWUuXFxuXFxuTW9yYmkgYWxpcXVhbSBvcmNpIHF1aXMgbmliaCBlZ2VzdGFzLCBpbiBzdXNjaXBpdCBlcmF0IHZvbHV0cGF0LiBEb25lYyBhdCBhY2N1bXNhbiBhdWd1ZSwgc2VkIGVsZW1lbnR1bSBsaWJlcm8uIERvbmVjIGluIGZlcm1lbnR1bSBtYXVyaXMuIFZpdmFtdXMgdmVzdGlidWx1bSwgbGlndWxhIGVnZXQgbW9sZXN0aWUgdmVoaWN1bGEsIHJpc3VzIGFudGUgZmF1Y2lidXMgbGliZXJvLCBldCBwZWxsZW50ZXNxdWUgaXBzdW0gdHVycGlzIHNvbGxpY2l0dWRpbiBlcmF0LiBOdWxsYSBmYWNpbGlzaS4gVml2YW11cyBxdWlzIHBvcnRhIGVyYXQuIFBlbGxlbnRlc3F1ZSB2aXRhZSBydXRydW0gdHVycGlzLiBQZWxsZW50ZXNxdWUgaGFiaXRhbnQgbW9yYmkgdHJpc3RpcXVlIHNlbmVjdHVzIGV0IG5ldHVzIGV0IG1hbGVzdWFkYSBmYW1lcyBhYyB0dXJwaXMgZWdlc3Rhcy4gTnVsbGEgc2l0IGFtZXQgYWxpcXVldCBzZW0sIHZlbCB2ZW5lbmF0aXMgbnVsbGEuIFN1c3BlbmRpc3NlIGFjIHRvcnRvciBpYWN1bGlzLCBsb2JvcnRpcyBzYXBpZW4gbm9uLCBzb2RhbGVzIHRvcnRvci4gU3VzcGVuZGlzc2UgaXBzdW0gYXJjdSwgbG9ib3J0aXMgYWMgcGxhY2VyYXQgcXVpcywgdmFyaXVzIG5lYyBxdWFtLiBRdWlzcXVlIHZlaGljdWxhIG1pIHV0IGRpYW0gdWxsYW1jb3JwZXIgYmxhbmRpdC5cIn0se1wiVGl0bGVcIjpcIk1lblwiLFwiQ29udGVudFwiOlwiMjAxNTExMTIgTG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIGNvbnNlY3RldHVyIGFkaXBpc2NpbmcgZWxpdC4gTWF1cmlzIHNlbSBsaWd1bGEsIGx1Y3R1cyBldCBhbGlxdWV0IGVnZXQsIHVsdHJpY2VzIGV1IHNlbS4gRnVzY2UgZW5pbSBsYWN1cywgc29kYWxlcyB2ZWwgc29sbGljaXR1ZGluIHZpdGFlLCBwcmV0aXVtIG5vbiB1cm5hLiBTdXNwZW5kaXNzZSBzY2VsZXJpc3F1ZSBsaWd1bGEgYXQgbnVsbGEgZ3JhdmlkYSBmcmluZ2lsbGEuIFZpdmFtdXMgc2VkIGZlcm1lbnR1bSBzZW0uIEFlbmVhbiB2b2x1dHBhdCBwb3J0YSBkdWksIHZlbCB0ZW1wb3IgZGlhbS4gQ3VyYWJpdHVyIG5vbiBjb252YWxsaXMgZGlhbS4gVXQgbWF0dGlzIG5vbiBhbnRlIG5lYyBwaGFyZXRyYS4gUHJhZXNlbnQgcHVsdmluYXIgbW9sbGlzIHZlbGl0IHNpdCBhbWV0IGFsaXF1YW0uIE1vcmJpIHZ1bHB1dGF0ZSB0aW5jaWR1bnQgcXVhbSBxdWlzIHZpdmVycmEuIEZ1c2NlIGJpYmVuZHVtIHB1bHZpbmFyIHR1cnBpcyBldSB0cmlzdGlxdWUuIFByb2luIGV0IHN1c2NpcGl0IHNhcGllbi5cXG5cXG5QZWxsZW50ZXNxdWUgdHJpc3RpcXVlIGFjY3Vtc2FuIGR1aS4gRG9uZWMgZXUgbWF0dGlzIGVsaXQuIEV0aWFtIG5pc2wgZmVsaXMsIGltcGVyZGlldCB2aXRhZSB0ZW1wb3Igc2VkLCBkaWduaXNzaW0gYXQgYXJjdS4gRXRpYW0gZWxlaWZlbmQgdXJuYSB1dCBsb3JlbSBjb25kaW1lbnR1bSB1bHRyaWNpZXMuIEluIHZpdmVycmEgcXVpcyBtZXR1cyB1dCBpbXBlcmRpZXQuIE1vcmJpIGVuaW0gb2RpbywgY29uZGltZW50dW0gdXQgbmliaCBzaXQgYW1ldCwgYmxhbmRpdCBtb2xsaXMgdGVsbHVzLiBOdWxsYW0gdGluY2lkdW50IGRpYW0gcHVydXMsIHNlZCBwb3N1ZXJlIGxhY3VzIGxvYm9ydGlzIGlkLiBOdWxsYW0gdmVzdGlidWx1bSBtYXVyaXMgcXVpcyBuaXNsIGNvbW1vZG8sIHF1aXMgdWx0cmljaWVzIHRvcnRvciBibGFuZGl0LiBNb3JiaSBoZW5kcmVyaXQgdXQganVzdG8gZXQgdmVuZW5hdGlzLiBJbnRlZ2VyIHJ1dHJ1bSBtYXNzYSB2ZWwgbWkgZWxlaWZlbmQgcnV0cnVtLiBWZXN0aWJ1bHVtIGFudGUgaXBzdW0gcHJpbWlzIGluIGZhdWNpYnVzIG9yY2kgbHVjdHVzIGV0IHVsdHJpY2VzIHBvc3VlcmUgY3ViaWxpYSBDdXJhZTsgU2VkIG1vbGVzdGllIGNvbnNlY3RldHVyIHZlbGl0IHV0IHZpdmVycmEuIFBoYXNlbGx1cyB0dXJwaXMgb2RpbywgcG9zdWVyZSBhIHRlbGx1cyBlZ2V0LCBpbnRlcmR1bSBkaWN0dW0gbnVsbGEuIERvbmVjIHBvcnRhIGVzdCBsYWNpbmlhIGxvYm9ydGlzIHNhZ2l0dGlzLiBVdCB1dCBpcHN1bSB0ZW1wdXMsIGZlcm1lbnR1bSBsaWJlcm8gZXQsIHRpbmNpZHVudCBhcmN1LiBOdW5jIGEgZGlhbSB1cm5hLiBQaGFzZWxsdXMgbGFjaW5pYSwgZmVsaXMgYSBmZXJtZW50dW0gbGFvcmVldCwgaXBzdW0gdmVsaXQgbHVjdHVzIG1pLCBxdWlzIHBvcnR0aXRvciBtZXR1cyBlcm9zIHZpdGFlIG9yY2kuIFBoYXNlbGx1cyBkYXBpYnVzIG51bGxhIHVsdHJpY2llcyBhcmN1IGdyYXZpZGEgb3JuYXJlLiBEdWlzIHZpdGFlIHBvc3VlcmUgZW5pbS4gSW4gcXVpcyBmZXVnaWF0IG5pYmguIEFsaXF1YW0gZGljdHVtIHZlbGl0IHN1c2NpcGl0IGxlbyBsb2JvcnRpcyBvcm5hcmUuIEZ1c2NlIHByZXRpdW0gdGVsbHVzIHNlZCBmZWxpcyBmZXVnaWF0IHJob25jdXMgZXUgZXQgbWFnbmEuIEFsaXF1YW0gZXJhdCB2b2x1dHBhdC4gVXQgaXBzdW0gZW5pbSwgbW9sZXN0aWUgaWQgbWkgbm9uLCBsYW9yZWV0IHBsYWNlcmF0IHRvcnRvci4gRG9uZWMgY29tbW9kbywgaXBzdW0gbm9uIGRpZ25pc3NpbSBjb25kaW1lbnR1bSwgdG9ydG9yIG9yY2kgc2FnaXR0aXMgZXJvcywgYXQgaGVuZHJlcml0IGxpZ3VsYSBlbGl0IGluIHNhcGllbi5cXG5cXG5JbnRlZ2VyIGFsaXF1ZXQgcXVhbSBzZW0sIGVnZXQgYWxpcXVldCBudWxsYSBjb25zZXF1YXQgYXQuIEFlbmVhbiBjb21tb2RvIGFudGUgbm9uIHNvZGFsZXMgcG9zdWVyZS4gQ3JhcyBjb21tb2RvIHR1cnBpcyBuZWMgc29kYWxlcyBwZWxsZW50ZXNxdWUuIERvbmVjIHRpbmNpZHVudCBtYXVyaXMgZHVpLCBldCBhZGlwaXNjaW5nIHRvcnRvciBncmF2aWRhIGEuIEV0aWFtIGVnZXQgdXJuYSBpbnRlcmR1bSBtYXNzYSBzdXNjaXBpdCB2ZXN0aWJ1bHVtIG5lYyBhdCBhbnRlLiBBZW5lYW4gcGhhcmV0cmEgcGxhY2VyYXQgbG9ib3J0aXMuIE51bGxhbSB0aW5jaWR1bnQgaW50ZXJkdW0gY29uZ3VlLiBVdCBub24gZW5pbSBtaS4gSW4gc2l0IGFtZXQganVzdG8gdmVoaWN1bGEsIHBvc3VlcmUgZW5pbSBldSwgZWdlc3RhcyBsZW8uIE1hZWNlbmFzIGJsYW5kaXQgdXJuYSBudW5jLCBldCBlbGVtZW50dW0gZXN0IGV1aXNtb2Qgbm9uLiBJbiBpbXBlcmRpZXQgZGlhbSBuZWMgYXJjdSBjdXJzdXMgcG9ydGEuIE1vcmJpIGNvbnNlcXVhdCBkaWFtIGF0IHF1YW0gY29udmFsbGlzLCB2ZWwgcnV0cnVtIG51bGxhIHNjZWxlcmlzcXVlLlxcblxcbk1vcmJpIGFsaXF1YW0gb3JjaSBxdWlzIG5pYmggZWdlc3RhcywgaW4gc3VzY2lwaXQgZXJhdCB2b2x1dHBhdC4gRG9uZWMgYXQgYWNjdW1zYW4gYXVndWUsIHNlZCBlbGVtZW50dW0gbGliZXJvLiBEb25lYyBpbiBmZXJtZW50dW0gbWF1cmlzLiBWaXZhbXVzIHZlc3RpYnVsdW0sIGxpZ3VsYSBlZ2V0IG1vbGVzdGllIHZlaGljdWxhLCByaXN1cyBhbnRlIGZhdWNpYnVzIGxpYmVybywgZXQgcGVsbGVudGVzcXVlIGlwc3VtIHR1cnBpcyBzb2xsaWNpdHVkaW4gZXJhdC4gTnVsbGEgZmFjaWxpc2kuIFZpdmFtdXMgcXVpcyBwb3J0YSBlcmF0LiBQZWxsZW50ZXNxdWUgdml0YWUgcnV0cnVtIHR1cnBpcy4gUGVsbGVudGVzcXVlIGhhYml0YW50IG1vcmJpIHRyaXN0aXF1ZSBzZW5lY3R1cyBldCBuZXR1cyBldCBtYWxlc3VhZGEgZmFtZXMgYWMgdHVycGlzIGVnZXN0YXMuIE51bGxhIHNpdCBhbWV0IGFsaXF1ZXQgc2VtLCB2ZWwgdmVuZW5hdGlzIG51bGxhLiBTdXNwZW5kaXNzZSBhYyB0b3J0b3IgaWFjdWxpcywgbG9ib3J0aXMgc2FwaWVuIG5vbiwgc29kYWxlcyB0b3J0b3IuIFN1c3BlbmRpc3NlIGlwc3VtIGFyY3UsIGxvYm9ydGlzIGFjIHBsYWNlcmF0IHF1aXMsIHZhcml1cyBuZWMgcXVhbS4gUXVpc3F1ZSB2ZWhpY3VsYSBtaSB1dCBkaWFtIHVsbGFtY29ycGVyIGJsYW5kaXQuXCJ9LHtcIlRpdGxlXCI6XCJKdW5pb3JcIixcIkNvbnRlbnRcIjpcIk5vdmVtYmVyIDEyLCAyMDE1LCAxMTo1NCBhbSBMb3JlbSBpcHN1bSBkb2xvciBzaXQgYW1ldCwgY29uc2VjdGV0dXIgYWRpcGlzY2luZyBlbGl0LiBNYXVyaXMgc2VtIGxpZ3VsYSwgbHVjdHVzIGV0IGFsaXF1ZXQgZWdldCwgdWx0cmljZXMgZXUgc2VtLiBGdXNjZSBlbmltIGxhY3VzLCBzb2RhbGVzIHZlbCBzb2xsaWNpdHVkaW4gdml0YWUsIHByZXRpdW0gbm9uIHVybmEuIFN1c3BlbmRpc3NlIHNjZWxlcmlzcXVlIGxpZ3VsYSBhdCBudWxsYSBncmF2aWRhIGZyaW5naWxsYS4gVml2YW11cyBzZWQgZmVybWVudHVtIHNlbS4gQWVuZWFuIHZvbHV0cGF0IHBvcnRhIGR1aSwgdmVsIHRlbXBvciBkaWFtLiBDdXJhYml0dXIgbm9uIGNvbnZhbGxpcyBkaWFtLiBVdCBtYXR0aXMgbm9uIGFudGUgbmVjIHBoYXJldHJhLiBQcmFlc2VudCBwdWx2aW5hciBtb2xsaXMgdmVsaXQgc2l0IGFtZXQgYWxpcXVhbS4gTW9yYmkgdnVscHV0YXRlIHRpbmNpZHVudCBxdWFtIHF1aXMgdml2ZXJyYS4gRnVzY2UgYmliZW5kdW0gcHVsdmluYXIgdHVycGlzIGV1IHRyaXN0aXF1ZS4gUHJvaW4gZXQgc3VzY2lwaXQgc2FwaWVuLlxcblxcblBlbGxlbnRlc3F1ZSB0cmlzdGlxdWUgYWNjdW1zYW4gZHVpLiBEb25lYyBldSBtYXR0aXMgZWxpdC4gRXRpYW0gbmlzbCBmZWxpcywgaW1wZXJkaWV0IHZpdGFlIHRlbXBvciBzZWQsIGRpZ25pc3NpbSBhdCBhcmN1LiBFdGlhbSBlbGVpZmVuZCB1cm5hIHV0IGxvcmVtIGNvbmRpbWVudHVtIHVsdHJpY2llcy4gSW4gdml2ZXJyYSBxdWlzIG1ldHVzIHV0IGltcGVyZGlldC4gTW9yYmkgZW5pbSBvZGlvLCBjb25kaW1lbnR1bSB1dCBuaWJoIHNpdCBhbWV0LCBibGFuZGl0IG1vbGxpcyB0ZWxsdXMuIE51bGxhbSB0aW5jaWR1bnQgZGlhbSBwdXJ1cywgc2VkIHBvc3VlcmUgbGFjdXMgbG9ib3J0aXMgaWQuIE51bGxhbSB2ZXN0aWJ1bHVtIG1hdXJpcyBxdWlzIG5pc2wgY29tbW9kbywgcXVpcyB1bHRyaWNpZXMgdG9ydG9yIGJsYW5kaXQuIE1vcmJpIGhlbmRyZXJpdCB1dCBqdXN0byBldCB2ZW5lbmF0aXMuIEludGVnZXIgcnV0cnVtIG1hc3NhIHZlbCBtaSBlbGVpZmVuZCBydXRydW0uIFZlc3RpYnVsdW0gYW50ZSBpcHN1bSBwcmltaXMgaW4gZmF1Y2lidXMgb3JjaSBsdWN0dXMgZXQgdWx0cmljZXMgcG9zdWVyZSBjdWJpbGlhIEN1cmFlOyBTZWQgbW9sZXN0aWUgY29uc2VjdGV0dXIgdmVsaXQgdXQgdml2ZXJyYS4gUGhhc2VsbHVzIHR1cnBpcyBvZGlvLCBwb3N1ZXJlIGEgdGVsbHVzIGVnZXQsIGludGVyZHVtIGRpY3R1bSBudWxsYS4gRG9uZWMgcG9ydGEgZXN0IGxhY2luaWEgbG9ib3J0aXMgc2FnaXR0aXMuIFV0IHV0IGlwc3VtIHRlbXB1cywgZmVybWVudHVtIGxpYmVybyBldCwgdGluY2lkdW50IGFyY3UuIE51bmMgYSBkaWFtIHVybmEuIFBoYXNlbGx1cyBsYWNpbmlhLCBmZWxpcyBhIGZlcm1lbnR1bSBsYW9yZWV0LCBpcHN1bSB2ZWxpdCBsdWN0dXMgbWksIHF1aXMgcG9ydHRpdG9yIG1ldHVzIGVyb3Mgdml0YWUgb3JjaS4gUGhhc2VsbHVzIGRhcGlidXMgbnVsbGEgdWx0cmljaWVzIGFyY3UgZ3JhdmlkYSBvcm5hcmUuIER1aXMgdml0YWUgcG9zdWVyZSBlbmltLiBJbiBxdWlzIGZldWdpYXQgbmliaC4gQWxpcXVhbSBkaWN0dW0gdmVsaXQgc3VzY2lwaXQgbGVvIGxvYm9ydGlzIG9ybmFyZS4gRnVzY2UgcHJldGl1bSB0ZWxsdXMgc2VkIGZlbGlzIGZldWdpYXQgcmhvbmN1cyBldSBldCBtYWduYS4gQWxpcXVhbSBlcmF0IHZvbHV0cGF0LiBVdCBpcHN1bSBlbmltLCBtb2xlc3RpZSBpZCBtaSBub24sIGxhb3JlZXQgcGxhY2VyYXQgdG9ydG9yLiBEb25lYyBjb21tb2RvLCBpcHN1bSBub24gZGlnbmlzc2ltIGNvbmRpbWVudHVtLCB0b3J0b3Igb3JjaSBzYWdpdHRpcyBlcm9zLCBhdCBoZW5kcmVyaXQgbGlndWxhIGVsaXQgaW4gc2FwaWVuLlxcblxcbkludGVnZXIgYWxpcXVldCBxdWFtIHNlbSwgZWdldCBhbGlxdWV0IG51bGxhIGNvbnNlcXVhdCBhdC4gQWVuZWFuIGNvbW1vZG8gYW50ZSBub24gc29kYWxlcyBwb3N1ZXJlLiBDcmFzIGNvbW1vZG8gdHVycGlzIG5lYyBzb2RhbGVzIHBlbGxlbnRlc3F1ZS4gRG9uZWMgdGluY2lkdW50IG1hdXJpcyBkdWksIGV0IGFkaXBpc2NpbmcgdG9ydG9yIGdyYXZpZGEgYS4gRXRpYW0gZWdldCB1cm5hIGludGVyZHVtIG1hc3NhIHN1c2NpcGl0IHZlc3RpYnVsdW0gbmVjIGF0IGFudGUuIEFlbmVhbiBwaGFyZXRyYSBwbGFjZXJhdCBsb2JvcnRpcy4gTnVsbGFtIHRpbmNpZHVudCBpbnRlcmR1bSBjb25ndWUuIFV0IG5vbiBlbmltIG1pLiBJbiBzaXQgYW1ldCBqdXN0byB2ZWhpY3VsYSwgcG9zdWVyZSBlbmltIGV1LCBlZ2VzdGFzIGxlby4gTWFlY2VuYXMgYmxhbmRpdCB1cm5hIG51bmMsIGV0IGVsZW1lbnR1bSBlc3QgZXVpc21vZCBub24uIEluIGltcGVyZGlldCBkaWFtIG5lYyBhcmN1IGN1cnN1cyBwb3J0YS4gTW9yYmkgY29uc2VxdWF0IGRpYW0gYXQgcXVhbSBjb252YWxsaXMsIHZlbCBydXRydW0gbnVsbGEgc2NlbGVyaXNxdWUuXFxuXFxuTW9yYmkgYWxpcXVhbSBvcmNpIHF1aXMgbmliaCBlZ2VzdGFzLCBpbiBzdXNjaXBpdCBlcmF0IHZvbHV0cGF0LiBEb25lYyBhdCBhY2N1bXNhbiBhdWd1ZSwgc2VkIGVsZW1lbnR1bSBsaWJlcm8uIERvbmVjIGluIGZlcm1lbnR1bSBtYXVyaXMuIFZpdmFtdXMgdmVzdGlidWx1bSwgbGlndWxhIGVnZXQgbW9sZXN0aWUgdmVoaWN1bGEsIHJpc3VzIGFudGUgZmF1Y2lidXMgbGliZXJvLCBldCBwZWxsZW50ZXNxdWUgaXBzdW0gdHVycGlzIHNvbGxpY2l0dWRpbiBlcmF0LiBOdWxsYSBmYWNpbGlzaS4gVml2YW11cyBxdWlzIHBvcnRhIGVyYXQuIFBlbGxlbnRlc3F1ZSB2aXRhZSBydXRydW0gdHVycGlzLiBQZWxsZW50ZXNxdWUgaGFiaXRhbnQgbW9yYmkgdHJpc3RpcXVlIHNlbmVjdHVzIGV0IG5ldHVzIGV0IG1hbGVzdWFkYSBmYW1lcyBhYyB0dXJwaXMgZWdlc3Rhcy4gTnVsbGEgc2l0IGFtZXQgYWxpcXVldCBzZW0sIHZlbCB2ZW5lbmF0aXMgbnVsbGEuIFN1c3BlbmRpc3NlIGFjIHRvcnRvciBpYWN1bGlzLCBsb2JvcnRpcyBzYXBpZW4gbm9uLCBzb2RhbGVzIHRvcnRvci4gU3VzcGVuZGlzc2UgaXBzdW0gYXJjdSwgbG9ib3J0aXMgYWMgcGxhY2VyYXQgcXVpcywgdmFyaXVzIG5lYyBxdWFtLiBRdWlzcXVlIHZlaGljdWxhIG1pIHV0IGRpYW0gdWxsYW1jb3JwZXIgYmxhbmRpdC5cIn1dJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIEJ1aWxkIHdpZGdldFxuICAgICAgICAgKi9cbiAgICAgICAgYnVpbGQgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGxldCBkYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCBcIlxcXFxuXCIpLnJlcGxhY2UoL1xcci9nLCBcIlxcXFxyXCIpLnJlcGxhY2UoL1xcdC9nLCBcIlxcXFx0XCIpLnJlcGxhY2UoL1xcZi9nLCBcIlxcXFxmXCIpKTtcblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbiA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfdGFiID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKGRhdGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLndpZGdldC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMud2lkZ2V0KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy53aWRnZXQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgbWVudSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ01FTlUnKTtcbiAgICAgICAgICAgIG1lbnUuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3Rvb2xiYXInKTtcbiAgICAgICAgICAgIG1lbnUuY2xhc3NMaXN0LmFkZCgndGFic19fbWVudScpO1xuICAgICAgICAgICAgdGhpcy53aWRnZXQuYXBwZW5kQ2hpbGQobWVudSk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IHRhYiBvZiBkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICBsZXQgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnQlVUVE9OJylcbiAgICAgICAgICAgICAgICAgICAgLCBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdTRUNUSU9OJylcbiAgICAgICAgICAgICAgICAgICAgLCB0ZXh0ID0gdGFiLkNvbnRlbnQuc3BsaXQoJ1xcblxcbicpO1xuXG4gICAgICAgICAgICAgICAgYnV0dG9uLnNldEF0dHJpYnV0ZSgndHlwZScsICdidXR0b24nKTtcbiAgICAgICAgICAgICAgICBidXR0b24uc2V0QXR0cmlidXRlKCdkYXRhLXRhcmdldCcsIHRhYi5UaXRsZSk7XG4gICAgICAgICAgICAgICAgYnV0dG9uLmNsYXNzTGlzdC5hZGQoJ3RhYnNfX2J1dHRvbicpO1xuICAgICAgICAgICAgICAgIGJ1dHRvbi5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0YWIuVGl0bGUpKTtcbiAgICAgICAgICAgICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLm9wZW5UYWIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgbWVudS5hcHBlbmRDaGlsZChidXR0b24pO1xuXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnNldEF0dHJpYnV0ZSgnZGF0YS10YWInLCB0YWIuVGl0bGUpO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCd0YWJzX190YWInKTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IHBhcmFncmFwaCBvZiB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnUCcpO1xuICAgICAgICAgICAgICAgICAgICBwLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBhcmFncmFwaCkpO1xuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy53aWRnZXQuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWVudS5xdWVyeVNlbGVjdG9yKCdidXR0b24nKS5jbGljaygpO1xuICAgICAgICAgICAgdGhpcy53aWRnZXQuY2xhc3NMaXN0LmFkZCgndGFic19idWlsZGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcGVuVGFiIChldmVudCkge1xuICAgICAgICAgICAgbGV0IGJ1dHRvbiA9IGV2ZW50LmN1cnJlbnRUYXJnZXRcbiAgICAgICAgICAgICAgICAsIHRhcmdldCA9IGJ1dHRvbi5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0Jyk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfdGFiICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfdGFiLmNsYXNzTGlzdC50b2dnbGUoJ3RhYnNfX3RhYl9jdXJyZW50JywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50X2J1dHRvbiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCd0YWJzX19idXR0b25fY3VycmVudCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbiA9IGJ1dHRvbjtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudF9idXR0b24uY2xhc3NMaXN0LnRvZ2dsZSgndGFic19fYnV0dG9uX2N1cnJlbnQnLCB0cnVlKTtcblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X3RhYiA9IHRoaXMud2lkZ2V0LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRhYj0nICsgdGFyZ2V0ICsgJ10nKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfdGFiICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfdGFiLmNsYXNzTGlzdC50b2dnbGUoJ3RhYnNfX3RhYl9jdXJyZW50JywgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBuZXcgVGFicztcbn0pKCk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
