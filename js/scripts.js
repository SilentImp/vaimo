"use strict";

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * https://raw.github.com/facebook/regenerator/master/LICENSE file. An
 * additional grant of patent rights can be found in the PATENTS file in
 * the same directory.
 */

!(function (global) {
  "use strict";

  var hasOwn = Object.prototype.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  var inModule = (typeof module === "undefined" ? "undefined" : _typeof(module)) === "object";
  var runtime = global.regeneratorRuntime;
  if (runtime) {
    if (inModule) {
      // If regeneratorRuntime is defined globally and we're in a module,
      // make the exports object identical to regeneratorRuntime.
      module.exports = runtime;
    }
    // Don't bother evaluating the rest of this file if the runtime was
    // already defined globally.
    return;
  }

  // Define the runtime globally (as expected by generated code) as either
  // module.exports (if we're in a module) or a new, empty object.
  runtime = global.regeneratorRuntime = inModule ? module.exports : {};

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided, then outerFn.prototype instanceof Generator.
    var generator = Object.create((outerFn || Generator).prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  runtime.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype;
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] = GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function (method) {
      prototype[method] = function (arg) {
        return this._invoke(method, arg);
      };
    });
  }

  runtime.isGeneratorFunction = function (genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor ? ctor === GeneratorFunction ||
    // For the native GeneratorFunction constructor, the best we can
    // do is to check its .name property.
    (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
  };

  runtime.mark = function (genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `value instanceof AwaitArgument` to determine if the yielded value is
  // meant to be awaited. Some may consider the name of this method too
  // cutesy, but they are curmudgeons.
  runtime.awrap = function (arg) {
    return new AwaitArgument(arg);
  };

  function AwaitArgument(arg) {
    this.arg = arg;
  }

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value instanceof AwaitArgument) {
          return Promise.resolve(value.arg).then(function (value) {
            invoke("next", value, resolve, reject);
          }, function (err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function (unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration. If the Promise is rejected, however, the
          // result for this iteration will be rejected with the same
          // reason. Note that rejections of yielded Promises are not
          // thrown back into the generator function, as is the case
          // when an awaited Promise is rejected. This difference in
          // behavior between yield and await is important, because it
          // allows the consumer to decide what to do with the yielded
          // rejection (swallow it and continue, manually .throw it back
          // into the generator, abandon iteration, whatever). With
          // await, by contrast, there is no opportunity to examine the
          // rejection reason outside the generator function, so the
          // only option is to throw it from the await expression, and
          // let the generator function handle the exception.
          result.value = unwrapped;
          resolve(result);
        }, reject);
      }
    }

    if ((typeof process === "undefined" ? "undefined" : _typeof(process)) === "object" && process.domain) {
      invoke = process.domain.bind(invoke);
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function (resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
      // If enqueue has been called before, then we want to wait until
      // all previous Promises have been resolved before calling invoke,
      // so that results are always delivered in the correct order. If
      // enqueue has not been called before, then it is important to
      // call invoke immediately, without waiting on a callback to fire,
      // so that the async generator function has the opportunity to do
      // any necessary setup in a predictable way. This predictability
      // is why the Promise constructor synchronously invokes its
      // executor callback, and why async functions synchronously
      // execute code before the first await. Since we implement simple
      // async functions in terms of async generators, it is especially
      // important to get this right, even though it requires care.
      previousPromise ? previousPromise.then(callInvokeWithMethodAndArg,
      // Avoid propagating failures to Promises returned by later
      // invocations of the iterator.
      callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  runtime.async = function (innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList));

    return runtime.isGeneratorFunction(outerFn) ? iter // If outerFn is a generator, return the full iterator.
    : iter.next().then(function (result) {
      return result.done ? result.value : iter.next();
    });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          if (method === "return" || method === "throw" && delegate.iterator[method] === undefined) {
            // A return or throw (when the delegate iterator has no throw
            // method) always terminates the yield* loop.
            context.delegate = null;

            // If the delegate iterator has a return method, give it a
            // chance to clean up.
            var returnMethod = delegate.iterator["return"];
            if (returnMethod) {
              var record = tryCatch(returnMethod, delegate.iterator, arg);
              if (record.type === "throw") {
                // If the return method threw an exception, let that
                // exception prevail over the original return or throw.
                method = "throw";
                arg = record.arg;
                continue;
              }
            }

            if (method === "return") {
              // Continue with the outer return, now that the delegate
              // iterator has been terminated.
              continue;
            }
          }

          var record = tryCatch(delegate.iterator[method], delegate.iterator, arg);

          if (record.type === "throw") {
            context.delegate = null;

            // Like returning generator.throw(uncaught), but without the
            // overhead of an extra function call.
            method = "throw";
            arg = record.arg;
            continue;
          }

          // Delegate generator ran and handled its own exceptions so
          // regardless of what the method was, we continue as if it is
          // "next" with an undefined arg.
          method = "next";
          arg = undefined;

          var info = record.arg;
          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
          } else {
            state = GenStateSuspendedYield;
            return info;
          }

          context.delegate = null;
        }

        if (method === "next") {
          if (state === GenStateSuspendedYield) {
            context.sent = arg;
          } else {
            context.sent = undefined;
          }
        } else if (method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw arg;
          }

          if (context.dispatchException(arg)) {
            // If the dispatched exception was caught by a catch block,
            // then let that catch block handle the exception normally.
            method = "next";
            arg = undefined;
          }
        } else if (method === "return") {
          context.abrupt("return", arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done ? GenStateCompleted : GenStateSuspendedYield;

          var info = {
            value: record.arg,
            done: context.done
          };

          if (record.arg === ContinueSentinel) {
            if (context.delegate && method === "next") {
              // Deliberately forget the last sent value so that we don't
              // accidentally pass it on to the delegate.
              arg = undefined;
            }
          } else {
            return info;
          }
        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(arg) call above.
          method = "throw";
          arg = record.arg;
        }
      }
    };
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[iteratorSymbol] = function () {
    return this;
  };

  Gp[toStringTagSymbol] = "Generator";

  Gp.toString = function () {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  runtime.keys = function (object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1,
            next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  runtime.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function reset(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      this.sent = undefined;
      this.done = false;
      this.delegate = null;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function stop() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function dispatchException(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;
        return !!caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }
          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }
          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }
          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function abrupt(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.next = finallyEntry.finallyLoc;
      } else {
        this.complete(record);
      }

      return ContinueSentinel;
    },

    complete: function complete(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" || record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = record.arg;
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }
    },

    finish: function finish(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function _catch(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function delegateYield(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      return ContinueSentinel;
    }
  };
})(
// Among the various tricks for obtaining a reference to the global
// object, this seems to be the most reliable technique that does not
// use indirect eval (which violates Content Security Policy).
(typeof global === "undefined" ? "undefined" : _typeof(global)) === "object" ? global : (typeof window === "undefined" ? "undefined" : _typeof(window)) === "object" ? window : (typeof self === "undefined" ? "undefined" : _typeof(self)) === "object" ? self : undefined);
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
    var Favorites = (function () {
        function Favorites() {
            _classCallCheck(this, Favorites);

            var ready = new Promise(function (resolve) {
                if (document.readyState != "loading") return resolve();
                document.addEventListener("DOMContentLoaded", function () {
                    return resolve();
                });
            });
            ready.then(this.init.bind(this));
        }

        _createClass(Favorites, [{
            key: "init",
            value: function init() {
                this.favorites = document.querySelector('.favorite');
                if (this.favorites === null) return;

                var products = this.favorites.querySelectorAll('.product');
                this.count = products.length;
                if (this.count == 0) {
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

                this.next_button.addEventListener('click', this.next.bind(this));
                this.prev_button.addEventListener('click', this.prev.bind(this));

                this.margin = 20;
                this.current = 0;
                this.width = products[0].offsetWidth + this.margin;
                this.inline = Math.floor((this.wrapper.offsetWidth + this.margin) / this.width);

                this.animation = false;
                this.timer = null;
                if (this.transitions) {
                    var transEndEventNames = {
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
        }, {
            key: "startAnimation",
            value: function startAnimation() {
                this.animation = true;
            }
        }, {
            key: "stopAnimation",
            value: function stopAnimation() {
                if (this.timer != null) clearTimeout(this.timer);
                this.animation = false;
            }
        }, {
            key: "dropAnimation",
            value: function dropAnimation() {
                if (this.timer != null) clearTimeout(this.timer);
                this.timer = setTimeout(this.stopAnimation.bind(this), 250);
            }
        }, {
            key: "next",
            value: function next(event) {
                this.current++;
                if (this.current == this.count - this.inline + 1) {
                    this.current = 0;
                }
                this.scroll();
                this.next_button.blur();
            }
        }, {
            key: "prev",
            value: function prev(event) {
                this.current--;
                if (this.current == -1) {
                    this.current = this.count - this.inline;
                }
                this.scroll();
                this.prev_button.blur();
            }
        }, {
            key: "resize",
            value: function resize() {
                this.inline = Math.floor((this.wrapper.offsetWidth + this.margin) / this.width);
                this.scroll();
            }
        }, {
            key: "scroll",
            value: function scroll() {
                if (this.transforms) {
                    this.wrapper.style[Modernizr.prefixed('transform')] = 'translateX(' + -this.width * this.current + 'px)';
                } else {
                    this.wrapper.style.right = -this.width * this.current + 'px';
                }
                this.dropAnimation();
            }
        }]);

        return Favorites;
    })();

    new Favorites();
})();
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
    var Navigation = (function () {
        function Navigation() {
            _classCallCheck(this, Navigation);

            var ready = new Promise(function (resolve) {
                if (document.readyState != "loading") return resolve();
                document.addEventListener("DOMContentLoaded", function () {
                    return resolve();
                });
            });
            ready.then(this.init.bind(this));
        }

        _createClass(Navigation, [{
            key: "init",
            value: function init() {
                var _this = this;

                this.navigation = document.querySelector('.navigation');
                if (this.navigation === null) return;

                var labels = this.navigation.querySelectorAll('.navigation__label');
                [].forEach.call(labels, function (label) {
                    label.addEventListener('click', _this.openDropdown.bind(_this));
                });

                this.toggle = document.querySelector('.navigation__toggle');
                this.toggle.addEventListener('click', this.toggleNavigation.bind(this));
            }
        }, {
            key: "toggleNavigation",
            value: function toggleNavigation() {
                this.navigation.classList.toggle('navigation_open');
                this.toggle.blur();
                document.body.classList.toggle('navigation_open');
            }
        }, {
            key: "openDropdown",
            value: function openDropdown(event) {
                event.currentTarget.classList.toggle('navigation__label_open');
                event.currentTarget.nextElementSibling.classList.toggle('navigation__container_open');
            }
        }]);

        return Navigation;
    })();

    new Navigation();
})();
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
    /**
     * @class Class handle subscription process
     */

    var Subscribe = (function () {
        /**
         * @description Start initialization on domload
         * @constructor
         */

        function Subscribe() {
            _classCallCheck(this, Subscribe);

            var ready = new Promise(function (resolve, reject) {
                if (document.readyState != "loading") return resolve();
                document.addEventListener("DOMContentLoaded", function () {
                    return resolve();
                });
            });
            ready.then(this.init.bind(this));
        }

        /**
         * @description Adding events and properties
         */

        _createClass(Subscribe, [{
            key: "init",
            value: function init() {
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

        }, {
            key: "validateForm",
            value: function validateForm(event) {
                var _this = this;

                event.preventDefault();

                var email_regex = new RegExp("^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$");
                if (this.input.value.trim().length > 0 && email_regex.test(this.input.value.trim()) === false || this.input.value.trim().length === 0 || this.input.value.trim().length === 0) {
                    this.setState('fail');
                    return;
                }

                var DONE = 4,
                    OK = 200,
                    xhr = new XMLHttpRequest(),
                    sender = new Promise(function (resolve, reject) {
                    try {
                        xhr.open('POST', _this.form.getAttribute('action'));
                        xhr.send(new FormData(_this.form));
                        xhr.onreadystatechange = function () {
                            if (xhr.readyState === DONE) {
                                _this.form.reset();
                                _this.setState();
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

        }, {
            key: "success",
            value: function success(message) {
                this.setState('success');
            }

            /**
             * @description request have failed
             * @param {Error} error error object
             */

        }, {
            key: "fail",
            value: function fail(error) {
                this.setState('fail');
            }

            /**
             * @description Set subscription state
             * @param {String} state new state
             */

        }, {
            key: "setState",
            value: function setState(state) {

                var fail = false,
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
        }]);

        return Subscribe;
    })();

    new Subscribe();
})();
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
    /**
     * @class Class handle tabs loading
     */

    var Tabs = (function () {
        /**
         * @description Start initialization on domload
         * @constructor
         */

        function Tabs() {
            _classCallCheck(this, Tabs);

            var ready = new Promise(function (resolve, reject) {
                if (document.readyState != "loading") return resolve();
                document.addEventListener("DOMContentLoaded", function () {
                    return resolve();
                });
            });
            ready.then(this.init.bind(this));
        }

        /**
         * @description Adding events and properties
         */

        _createClass(Tabs, [{
            key: "init",
            value: function init() {
                var _this = this;

                this.widget = document.querySelector('.tabs');
                if (this.widget === null) return;

                var DONE = 4,
                    OK = 200,
                    xhr = new XMLHttpRequest(),
                    sender = new Promise(function (resolve, reject) {
                    try {
                        xhr.open('GET', _this.widget.getAttribute('data-url'));
                        xhr.send();
                        xhr.onreadystatechange = function () {
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

        }, {
            key: "foo_build",
            value: function foo_build() {
                this.build('[{"Title":"Women","Content":"11:54:55 Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem ligula, luctus et aliquet eget, ultrices eu sem. Fusce enim lacus, sodales vel sollicitudin vitae, pretium non urna. Suspendisse scelerisque ligula at nulla gravida fringilla. Vivamus sed fermentum sem. Aenean volutpat porta dui, vel tempor diam. Curabitur non convallis diam. Ut mattis non ante nec pharetra. Praesent pulvinar mollis velit sit amet aliquam. Morbi vulputate tincidunt quam quis viverra. Fusce bibendum pulvinar turpis eu tristique. Proin et suscipit sapien.\n\nPellentesque tristique accumsan dui. Donec eu mattis elit. Etiam nisl felis, imperdiet vitae tempor sed, dignissim at arcu. Etiam eleifend urna ut lorem condimentum ultricies. In viverra quis metus ut imperdiet. Morbi enim odio, condimentum ut nibh sit amet, blandit mollis tellus. Nullam tincidunt diam purus, sed posuere lacus lobortis id. Nullam vestibulum mauris quis nisl commodo, quis ultricies tortor blandit. Morbi hendrerit ut justo et venenatis. Integer rutrum massa vel mi eleifend rutrum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed molestie consectetur velit ut viverra. Phasellus turpis odio, posuere a tellus eget, interdum dictum nulla. Donec porta est lacinia lobortis sagittis. Ut ut ipsum tempus, fermentum libero et, tincidunt arcu. Nunc a diam urna. Phasellus lacinia, felis a fermentum laoreet, ipsum velit luctus mi, quis porttitor metus eros vitae orci. Phasellus dapibus nulla ultricies arcu gravida ornare. Duis vitae posuere enim. In quis feugiat nibh. Aliquam dictum velit suscipit leo lobortis ornare. Fusce pretium tellus sed felis feugiat rhoncus eu et magna. Aliquam erat volutpat. Ut ipsum enim, molestie id mi non, laoreet placerat tortor. Donec commodo, ipsum non dignissim condimentum, tortor orci sagittis eros, at hendrerit ligula elit in sapien.\n\nInteger aliquet quam sem, eget aliquet nulla consequat at. Aenean commodo ante non sodales posuere. Cras commodo turpis nec sodales pellentesque. Donec tincidunt mauris dui, et adipiscing tortor gravida a. Etiam eget urna interdum massa suscipit vestibulum nec at ante. Aenean pharetra placerat lobortis. Nullam tincidunt interdum congue. Ut non enim mi. In sit amet justo vehicula, posuere enim eu, egestas leo. Maecenas blandit urna nunc, et elementum est euismod non. In imperdiet diam nec arcu cursus porta. Morbi consequat diam at quam convallis, vel rutrum nulla scelerisque.\n\nMorbi aliquam orci quis nibh egestas, in suscipit erat volutpat. Donec at accumsan augue, sed elementum libero. Donec in fermentum mauris. Vivamus vestibulum, ligula eget molestie vehicula, risus ante faucibus libero, et pellentesque ipsum turpis sollicitudin erat. Nulla facilisi. Vivamus quis porta erat. Pellentesque vitae rutrum turpis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla sit amet aliquet sem, vel venenatis nulla. Suspendisse ac tortor iaculis, lobortis sapien non, sodales tortor. Suspendisse ipsum arcu, lobortis ac placerat quis, varius nec quam. Quisque vehicula mi ut diam ullamcorper blandit."},{"Title":"Men","Content":"20151112 Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem ligula, luctus et aliquet eget, ultrices eu sem. Fusce enim lacus, sodales vel sollicitudin vitae, pretium non urna. Suspendisse scelerisque ligula at nulla gravida fringilla. Vivamus sed fermentum sem. Aenean volutpat porta dui, vel tempor diam. Curabitur non convallis diam. Ut mattis non ante nec pharetra. Praesent pulvinar mollis velit sit amet aliquam. Morbi vulputate tincidunt quam quis viverra. Fusce bibendum pulvinar turpis eu tristique. Proin et suscipit sapien.\n\nPellentesque tristique accumsan dui. Donec eu mattis elit. Etiam nisl felis, imperdiet vitae tempor sed, dignissim at arcu. Etiam eleifend urna ut lorem condimentum ultricies. In viverra quis metus ut imperdiet. Morbi enim odio, condimentum ut nibh sit amet, blandit mollis tellus. Nullam tincidunt diam purus, sed posuere lacus lobortis id. Nullam vestibulum mauris quis nisl commodo, quis ultricies tortor blandit. Morbi hendrerit ut justo et venenatis. Integer rutrum massa vel mi eleifend rutrum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed molestie consectetur velit ut viverra. Phasellus turpis odio, posuere a tellus eget, interdum dictum nulla. Donec porta est lacinia lobortis sagittis. Ut ut ipsum tempus, fermentum libero et, tincidunt arcu. Nunc a diam urna. Phasellus lacinia, felis a fermentum laoreet, ipsum velit luctus mi, quis porttitor metus eros vitae orci. Phasellus dapibus nulla ultricies arcu gravida ornare. Duis vitae posuere enim. In quis feugiat nibh. Aliquam dictum velit suscipit leo lobortis ornare. Fusce pretium tellus sed felis feugiat rhoncus eu et magna. Aliquam erat volutpat. Ut ipsum enim, molestie id mi non, laoreet placerat tortor. Donec commodo, ipsum non dignissim condimentum, tortor orci sagittis eros, at hendrerit ligula elit in sapien.\n\nInteger aliquet quam sem, eget aliquet nulla consequat at. Aenean commodo ante non sodales posuere. Cras commodo turpis nec sodales pellentesque. Donec tincidunt mauris dui, et adipiscing tortor gravida a. Etiam eget urna interdum massa suscipit vestibulum nec at ante. Aenean pharetra placerat lobortis. Nullam tincidunt interdum congue. Ut non enim mi. In sit amet justo vehicula, posuere enim eu, egestas leo. Maecenas blandit urna nunc, et elementum est euismod non. In imperdiet diam nec arcu cursus porta. Morbi consequat diam at quam convallis, vel rutrum nulla scelerisque.\n\nMorbi aliquam orci quis nibh egestas, in suscipit erat volutpat. Donec at accumsan augue, sed elementum libero. Donec in fermentum mauris. Vivamus vestibulum, ligula eget molestie vehicula, risus ante faucibus libero, et pellentesque ipsum turpis sollicitudin erat. Nulla facilisi. Vivamus quis porta erat. Pellentesque vitae rutrum turpis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla sit amet aliquet sem, vel venenatis nulla. Suspendisse ac tortor iaculis, lobortis sapien non, sodales tortor. Suspendisse ipsum arcu, lobortis ac placerat quis, varius nec quam. Quisque vehicula mi ut diam ullamcorper blandit."},{"Title":"Junior","Content":"November 12, 2015, 11:54 am Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem ligula, luctus et aliquet eget, ultrices eu sem. Fusce enim lacus, sodales vel sollicitudin vitae, pretium non urna. Suspendisse scelerisque ligula at nulla gravida fringilla. Vivamus sed fermentum sem. Aenean volutpat porta dui, vel tempor diam. Curabitur non convallis diam. Ut mattis non ante nec pharetra. Praesent pulvinar mollis velit sit amet aliquam. Morbi vulputate tincidunt quam quis viverra. Fusce bibendum pulvinar turpis eu tristique. Proin et suscipit sapien.\n\nPellentesque tristique accumsan dui. Donec eu mattis elit. Etiam nisl felis, imperdiet vitae tempor sed, dignissim at arcu. Etiam eleifend urna ut lorem condimentum ultricies. In viverra quis metus ut imperdiet. Morbi enim odio, condimentum ut nibh sit amet, blandit mollis tellus. Nullam tincidunt diam purus, sed posuere lacus lobortis id. Nullam vestibulum mauris quis nisl commodo, quis ultricies tortor blandit. Morbi hendrerit ut justo et venenatis. Integer rutrum massa vel mi eleifend rutrum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed molestie consectetur velit ut viverra. Phasellus turpis odio, posuere a tellus eget, interdum dictum nulla. Donec porta est lacinia lobortis sagittis. Ut ut ipsum tempus, fermentum libero et, tincidunt arcu. Nunc a diam urna. Phasellus lacinia, felis a fermentum laoreet, ipsum velit luctus mi, quis porttitor metus eros vitae orci. Phasellus dapibus nulla ultricies arcu gravida ornare. Duis vitae posuere enim. In quis feugiat nibh. Aliquam dictum velit suscipit leo lobortis ornare. Fusce pretium tellus sed felis feugiat rhoncus eu et magna. Aliquam erat volutpat. Ut ipsum enim, molestie id mi non, laoreet placerat tortor. Donec commodo, ipsum non dignissim condimentum, tortor orci sagittis eros, at hendrerit ligula elit in sapien.\n\nInteger aliquet quam sem, eget aliquet nulla consequat at. Aenean commodo ante non sodales posuere. Cras commodo turpis nec sodales pellentesque. Donec tincidunt mauris dui, et adipiscing tortor gravida a. Etiam eget urna interdum massa suscipit vestibulum nec at ante. Aenean pharetra placerat lobortis. Nullam tincidunt interdum congue. Ut non enim mi. In sit amet justo vehicula, posuere enim eu, egestas leo. Maecenas blandit urna nunc, et elementum est euismod non. In imperdiet diam nec arcu cursus porta. Morbi consequat diam at quam convallis, vel rutrum nulla scelerisque.\n\nMorbi aliquam orci quis nibh egestas, in suscipit erat volutpat. Donec at accumsan augue, sed elementum libero. Donec in fermentum mauris. Vivamus vestibulum, ligula eget molestie vehicula, risus ante faucibus libero, et pellentesque ipsum turpis sollicitudin erat. Nulla facilisi. Vivamus quis porta erat. Pellentesque vitae rutrum turpis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla sit amet aliquet sem, vel venenatis nulla. Suspendisse ac tortor iaculis, lobortis sapien non, sodales tortor. Suspendisse ipsum arcu, lobortis ac placerat quis, varius nec quam. Quisque vehicula mi ut diam ullamcorper blandit."}]');
            }

            /**
             * @description Build widget
             */

        }, {
            key: "build",
            value: function build(message) {
                var data = JSON.parse(message.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\f/g, "\\f"));

                this.current_button = null;
                this.current_tab = null;

                if (data.length == 0) {
                    this.widget.parentNode.removeChild(this.widget);
                    delete this.widget;
                    return;
                }

                var menu = document.createElement('MENU');
                menu.setAttribute('type', 'toolbar');
                menu.classList.add('tabs__menu');
                this.widget.appendChild(menu);

                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var tab = _step.value;

                        var button = document.createElement('BUTTON'),
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
                                var paragraph = _step2.value;

                                var p = document.createElement('P');
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
        }, {
            key: "openTab",
            value: function openTab(event) {
                var button = event.currentTarget,
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
        }]);

        return Tabs;
    })();

    new Tabs();
})();
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { var callNext = step.bind(null, "next"); var callThrow = step.bind(null, "throw"); function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(callNext, callThrow); } } callNext(); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

(function () {
    var Scroller = (function () {
        function Scroller() {
            _classCallCheck(this, Scroller);

            var ready = new Promise(function (resolve) {
                if (document.readyState != "loading") return resolve();
                document.addEventListener("DOMContentLoaded", function () {
                    return resolve();
                });
            });
            ready.then(this.init.bind(this));
        }

        _createClass(Scroller, [{
            key: "init",
            value: function init() {
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

                var first_slide = this.slides[0].cloneNode(true),
                    last_slide = this.slides[this.count - 1].cloneNode(true);

                first_slide.classList.add('cloned');
                last_slide.classList.add('cloned');
                this.wrapper.appendChild(first_slide);
                this.wrapper.insertBefore(last_slide, this.slides[0]);

                var index = this.count;
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
                    var transEndEventNames = {
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
        }, {
            key: "moveToCurrent",
            value: function moveToCurrent() {
                this.move(this.current_page);
                return this;
            }
        }, {
            key: "moveToFirst",
            value: function moveToFirst() {
                this.current_page = 0;
                this.reposSlide();
                return this;
            }
        }, {
            key: "moveToLast",
            value: function moveToLast() {
                this.current_page = this.count - 1;
                this.reposSlide();
                return this;
            }
        }, {
            key: "turnOn",
            value: function turnOn() {
                this.wrapper.style[Modernizr.prefixed('transition')] = Modernizr.prefixed('transform') + ' .25s';
                return this;
            }
        }, {
            key: "turnOff",
            value: function turnOff() {
                this.wrapper.style[Modernizr.prefixed('transition')] = 'none';
                return this;
            }
        }, {
            key: "move",
            value: function move(index) {
                if (this.transforms) {
                    this.wrapper.style[Modernizr.prefixed('transform')] = 'translateX(' + -this.wrapper.offsetWidth * (index + 1) + 'px)';
                } else {
                    this.wrapper.style.right = -this.wrapper.offsetWidth * (index + 1) + 'px';
                }
            }
        }, {
            key: "resized",
            value: (function () {
                var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
                    return regeneratorRuntime.wrap(function _callee$(_context) {
                        while (1) {
                            switch (_context.prev = _context.next) {
                                case 0:
                                    this.turnOff();
                                    _context.next = 3;
                                    return this.delay(25);

                                case 3:
                                    this.moveToCurrent();
                                    _context.next = 6;
                                    return this.delay(25);

                                case 6:
                                    this.turnOn();

                                case 7:
                                case "end":
                                    return _context.stop();
                            }
                        }
                    }, _callee, this);
                }));

                return function resized() {
                    return ref.apply(this, arguments);
                };
            })()
        }, {
            key: "delay",
            value: (function () {
                var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(milliseconds) {
                    return regeneratorRuntime.wrap(function _callee2$(_context2) {
                        while (1) {
                            switch (_context2.prev = _context2.next) {
                                case 0:
                                    return _context2.abrupt("return", new Promise(function (resolve) {
                                        setTimeout(resolve, milliseconds);
                                    }));

                                case 1:
                                case "end":
                                    return _context2.stop();
                            }
                        }
                    }, _callee2, this);
                }));

                return function delay(_x) {
                    return ref.apply(this, arguments);
                };
            })()
        }, {
            key: "checkIndex",
            value: (function () {
                var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
                    return regeneratorRuntime.wrap(function _callee3$(_context3) {
                        while (1) {
                            switch (_context3.prev = _context3.next) {
                                case 0:
                                    if (!(this.current_page == -1)) {
                                        _context3.next = 10;
                                        break;
                                    }

                                    this.turnOff();
                                    _context3.next = 4;
                                    return this.delay(25);

                                case 4:
                                    this.moveToLast();
                                    _context3.next = 7;
                                    return this.delay(25);

                                case 7:
                                    this.turnOn();
                                    _context3.next = 18;
                                    break;

                                case 10:
                                    if (!(this.current_page == this.count)) {
                                        _context3.next = 18;
                                        break;
                                    }

                                    this.turnOff();
                                    _context3.next = 14;
                                    return this.delay(25);

                                case 14:
                                    this.moveToFirst();
                                    _context3.next = 17;
                                    return this.delay(25);

                                case 17:
                                    this.turnOn();

                                case 18:
                                    this.stopAnimation();

                                case 19:
                                case "end":
                                    return _context3.stop();
                            }
                        }
                    }, _callee3, this);
                }));

                return function checkIndex() {
                    return ref.apply(this, arguments);
                };
            })()
        }, {
            key: "stopAnimation",
            value: function stopAnimation() {
                this.animation = false;
            }
        }, {
            key: "startAnimation",
            value: function startAnimation() {
                this.animation = true;
            }
        }, {
            key: "dropAnimation",
            value: function dropAnimation() {
                if (typeof this.timer != 'undefined') clearTimeout(this.timer);
                this.timer = setTimeout(this.stopAnimation.bind(this), 350);
            }
        }, {
            key: "createButton",
            value: function createButton(index) {
                var button = document.createElement('BUTTON'),
                    span = document.createElement('SPAN');
                button.setAttribute('type', 'button');
                button.setAttribute('data-page', index);
                button.classList.add('scroller__page');
                button.appendChild(span);
                button.addEventListener('click', this.scrollToSlide.bind(this));
                this.paginator.appendChild(button);
            }
        }, {
            key: "openSlide",
            value: function openSlide() {
                this.reposSlide();
                this.dropAnimation();
                if (!this.transitions) {
                    if (this.tansition_timer != null) clearTimeout(this.tansition_timer);
                    this.tansition_timer = setTimeout(this.checkIndex.bind(this), 250);
                }
            }
        }, {
            key: "openPrevSlide",
            value: function openPrevSlide(event) {
                if (this.animation === true) return;
                this.startAnimation();

                this.current_page--;
                this.prev_button.blur();
                this.openSlide();
            }
        }, {
            key: "openNextSlide",
            value: function openNextSlide(event) {
                if (this.animation === true) return;
                this.startAnimation();

                this.current_page++;
                this.next_button.blur();
                this.openSlide();
            }
        }, {
            key: "scrollToSlide",
            value: function scrollToSlide(event) {
                if (this.animation === true) return;
                this.startAnimation();

                var button = event.currentTarget;
                this.current_page = parseInt(button.getAttribute('data-page'), 10);
                button.blur();
                this.openSlide();
            }
        }, {
            key: "reposSlide",
            value: function reposSlide() {
                this.current_button.classList.toggle('scroller__page_current', false);
                this.current_button = this.paginator_buttons[Math.min(Math.max(this.current_page, 0), this.count - 1)];
                this.current_button.classList.toggle('scroller__page_current', true);
                this.move(this.current_page);
            }
        }]);

        return Scroller;
    })();

    new Scroller();
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bnRpbWUuanMiLCJmYXZvcml0ZS5qcyIsIm5hdmlnYXRpb24uanMiLCJzdWJzY3JpYmUuanMiLCJ0YWJzLmpzIiwic2Nyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFVQSxDQUFDLENBQUMsVUFBUyxNQUFNLEVBQUU7QUFDakIsY0FBWSxDQUFDOztBQUViLE1BQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO0FBQzdDLE1BQUksU0FBUztBQUFDLEFBQ2QsTUFBSSxPQUFPLEdBQUcsT0FBTyxNQUFNLEtBQUssVUFBVSxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDekQsTUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLFFBQVEsSUFBSSxZQUFZLENBQUM7QUFDdEQsTUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLGVBQWUsQ0FBQzs7QUFFL0QsTUFBSSxRQUFRLEdBQUcsUUFBTyxNQUFNLHlDQUFOLE1BQU0sT0FBSyxRQUFRLENBQUM7QUFDMUMsTUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLGtCQUFrQixDQUFDO0FBQ3hDLE1BQUksT0FBTyxFQUFFO0FBQ1gsUUFBSSxRQUFRLEVBQUU7OztBQUdaLFlBQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0tBQzFCOzs7QUFBQSxBQUdELFdBQU87R0FDUjs7OztBQUFBLEFBSUQsU0FBTyxHQUFHLE1BQU0sQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7O0FBRXJFLFdBQVMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRTs7QUFFakQsUUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sSUFBSSxTQUFTLENBQUEsQ0FBRSxTQUFTLENBQUMsQ0FBQztBQUNoRSxRQUFJLE9BQU8sR0FBRyxJQUFJLE9B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QUM7QUFDckUsb0JBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQ2hDOzs7ZUE3TUMsUUFBUTs7O0FBZ05kLFFBQUksUUFBUSxFQUFBLENBQUM7Q0FDaEIsQ0FBQSxFQUFHLENBQUMiLCJmaWxlIjoic2NyaXB0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIGh0dHBzOi8vcmF3LmdpdGh1Yi5jb20vZmFjZWJvb2svcmVnZW5lcmF0b3IvbWFzdGVyL0xJQ0VOU0UgZmlsZS4gQW5cbiAqIGFkZGl0aW9uYWwgZ3JhbnQgb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpblxuICogdGhlIHNhbWUgZGlyZWN0b3J5LlxuICovXG5cbiEoZnVuY3Rpb24oZ2xvYmFsKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuICB2YXIgdW5kZWZpbmVkOyAvLyBNb3JlIGNvbXByZXNzaWJsZSB0aGFuIHZvaWQgMC5cbiAgdmFyICRTeW1ib2wgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgPyBTeW1ib2wgOiB7fTtcbiAgdmFyIGl0ZXJhdG9yU3ltYm9sID0gJFN5bWJvbC5pdGVyYXRvciB8fCBcIkBAaXRlcmF0b3JcIjtcbiAgdmFyIHRvU3RyaW5nVGFnU3ltYm9sID0gJFN5bWJvbC50b1N0cmluZ1RhZyB8fCBcIkBAdG9TdHJpbmdUYWdcIjtcblxuICB2YXIgaW5Nb2R1bGUgPSB0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiO1xuICB2YXIgcnVudGltZSA9IGdsb2JhbC5yZWdlbmVyYXRvclJ1bnRpbWU7XG4gIGlmIChydW50aW1lKSB7XG4gICAgaWYgKGluTW9kdWxlKSB7XG4gICAgICAvLyBJZiByZWdlbmVyYXRvclJ1bnRpbWUgaXMgZGVmaW5lZCBnbG9iYWxseSBhbmQgd2UncmUgaW4gYSBtb2R1bGUsXG4gICAgICAvLyBtYWtlIHRoZSBleHBvcnRzIG9iamVjdCBpZGVudGljYWwgdG8gcmVnZW5lcmF0b3JSdW50aW1lLlxuICAgICAgbW9kdWxlLmV4cG9ydHMgPSBydW50aW1lO1xuICAgIH1cbiAgICAvLyBEb24ndCBib3RoZXIgZXZhbHVhdGluZyB0aGUgcmVzdCBvZiB0aGlzIGZpbGUgaWYgdGhlIHJ1bnRpbWUgd2FzXG4gICAgLy8gYWxyZWFkeSBkZWZpbmVkIGdsb2JhbGx5LlxuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIERlZmluZSB0aGUgcnVudGltZSBnbG9iYWxseSAoYXMgZXhwZWN0ZWQgYnkgZ2VuZXJhdGVkIGNvZGUpIGFzIGVpdGhlclxuICAvLyBtb2R1bGUuZXhwb3J0cyAoaWYgd2UncmUgaW4gYSBtb2R1bGUpIG9yIGEgbmV3LCBlbXB0eSBvYmplY3QuXG4gIHJ1bnRpbWUgPSBnbG9iYWwucmVnZW5lcmF0b3JSdW50aW1lID0gaW5Nb2R1bGUgPyBtb2R1bGUuZXhwb3J0cyA6IHt9O1xuXG4gIGZ1bmN0aW9uIHdyYXAoaW5uZXJGbiwgb3V0ZXJGbiwgc2VsZiwgdHJ5TG9jc0xpc3QpIHtcbiAgICAvLyBJZiBvdXRlckZuIHByb3ZpZGVkLCB0aGVuIG91dGVyRm4ucHJvdG90eXBlIGluc3RhbmNlb2YgR2VuZXJhdG9yLlxuICAgIHZhciBnZW5lcmF0b3IgPSBPYmplY3QuY3JlYXRlKChvdXRlckZuIHx8IEdlbmVyYXRvcikucHJvdG90eXBlKTtcbiAgICB2YXIgY29udGV4dCA9IG5ldyBDb250ZXh0KHRyeUxvY3NMaXN0IHx8IFtdKTtcblxuICAgIC8vIFRoZSAuX2ludm9rZSBtZXRob2QgdW5pZmllcyB0aGUgaW1wbGVtZW50YXRpb25zIG9mIHRoZSAubmV4dCxcbiAgICAvLyAudGhyb3csIGFuZCAucmV0dXJuIG1ldGhvZHMuXG4gICAgZ2VuZXJhdG9yLl9pbnZva2UgPSBtYWtlSW52b2tlTWV0aG9kKGlubmVyRm4sIHNlbGYsIGNvbnRleHQpO1xuXG4gICAgcmV0dXJuIGdlbmVyYXRvcjtcbiAgfVxuICBydW50aW1lLndyYXAgPSB3cmFwO1xuXG4gIC8vIFRyeS9jYXRjaCBoZWxwZXIgdG8gbWluaW1pemUgZGVvcHRpbWl6YXRpb25zLiBSZXR1cm5zIGEgY29tcGxldGlvblxuICAvLyByZWNvcmQgbGlrZSBjb250ZXh0LnRyeUVudHJpZXNbaV0uY29tcGxldGlvbi4gVGhpcyBpbnRlcmZhY2UgY291bGRcbiAgLy8gaGF2ZSBiZWVuIChhbmQgd2FzIHByZXZpb3VzbHkpIGRlc2lnbmVkIHRvIHRha2UgYSBjbG9zdXJlIHRvIGJlXG4gIC8vIGludm9rZWQgd2l0aG91dCBhcmd1bWVudHMsIGJ1dCBpbiBhbGwgdGhlIGNhc2VzIHdlIGNhcmUgYWJvdXQgd2VcbiAgLy8gYWxyZWFkeSBoYXZlIGFuIGV4aXN0aW5nIG1ldGhvZCB3ZSB3YW50IHRvIGNhbGwsIHNvIHRoZXJlJ3Mgbm8gbmVlZFxuICAvLyB0byBjcmVhdGUgYSBuZXcgZnVuY3Rpb24gb2JqZWN0LiBXZSBjYW4gZXZlbiBnZXQgYXdheSB3aXRoIGFzc3VtaW5nXG4gIC8vIHRoZSBtZXRob2QgdGFrZXMgZXhhY3RseSBvbmUgYXJndW1lbnQsIHNpbmNlIHRoYXQgaGFwcGVucyB0byBiZSB0cnVlXG4gIC8vIGluIGV2ZXJ5IGNhc2UsIHNvIHdlIGRvbid0IGhhdmUgdG8gdG91Y2ggdGhlIGFyZ3VtZW50cyBvYmplY3QuIFRoZVxuICAvLyBvbmx5IGFkZGl0aW9uYWwgYWxsb2NhdGlvbiByZXF1aXJlZCBpcyB0aGUgY29tcGxldGlvbiByZWNvcmQsIHdoaWNoXG4gIC8vIGhhcyBhIHN0YWJsZSBzaGFwZSBhbmQgc28gaG9wZWZ1bGx5IHNob3VsZCBiZSBjaGVhcCB0byBhbGxvY2F0ZS5cbiAgZnVuY3Rpb24gdHJ5Q2F0Y2goZm4sIG9iaiwgYXJnKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiB7IHR5cGU6IFwibm9ybWFsXCIsIGFyZzogZm4uY2FsbChvYmosIGFyZykgfTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIHJldHVybiB7IHR5cGU6IFwidGhyb3dcIiwgYXJnOiBlcnIgfTtcbiAgICB9XG4gIH1cblxuICB2YXIgR2VuU3RhdGVTdXNwZW5kZWRTdGFydCA9IFwic3VzcGVuZGVkU3RhcnRcIjtcbiAgdmFyIEdlblN0YXRlU3VzcGVuZGVkWWllbGQgPSBcInN1c3BlbmRlZFlpZWxkXCI7XG4gIHZhciBHZW5TdGF0ZUV4ZWN1dGluZyA9IFwiZXhlY3V0aW5nXCI7XG4gIHZhciBHZW5TdGF0ZUNvbXBsZXRlZCA9IFwiY29tcGxldGVkXCI7XG5cbiAgLy8gUmV0dXJuaW5nIHRoaXMgb2JqZWN0IGZyb20gdGhlIGlubmVyRm4gaGFzIHRoZSBzYW1lIGVmZmVjdCBhc1xuICAvLyBicmVha2luZyBvdXQgb2YgdGhlIGRpc3BhdGNoIHN3aXRjaCBzdGF0ZW1lbnQuXG4gIHZhciBDb250aW51ZVNlbnRpbmVsID0ge307XG5cbiAgLy8gRHVtbXkgY29uc3RydWN0b3IgZnVuY3Rpb25zIHRoYXQgd2UgdXNlIGFzIHRoZSAuY29uc3RydWN0b3IgYW5kXG4gIC8vIC5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgcHJvcGVydGllcyBmb3IgZnVuY3Rpb25zIHRoYXQgcmV0dXJuIEdlbmVyYXRvclxuICAvLyBvYmplY3RzLiBGb3IgZnVsbCBzcGVjIGNvbXBsaWFuY2UsIHlvdSBtYXkgd2lzaCB0byBjb25maWd1cmUgeW91clxuICAvLyBtaW5pZmllciBub3QgdG8gbWFuZ2xlIHRoZSBuYW1lcyBvZiB0aGVzZSB0d28gZnVuY3Rpb25zLlxuICBmdW5jdGlvbiBHZW5lcmF0b3IoKSB7fVxuICBmdW5jdGlvbiBHZW5lcmF0b3JGdW5jdGlvbigpIHt9XG4gIGZ1bmN0aW9uIEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlKCkge31cblxuICB2YXIgR3AgPSBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUgPSBHZW5lcmF0b3IucHJvdG90eXBlO1xuICBHZW5lcmF0b3JGdW5jdGlvbi5wcm90b3R5cGUgPSBHcC5jb25zdHJ1Y3RvciA9IEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlO1xuICBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEdlbmVyYXRvckZ1bmN0aW9uO1xuICBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZVt0b1N0cmluZ1RhZ1N5bWJvbF0gPSBHZW5lcmF0b3JGdW5jdGlvbi5kaXNwbGF5TmFtZSA9IFwiR2VuZXJhdG9yRnVuY3Rpb25cIjtcblxuICAvLyBIZWxwZXIgZm9yIGRlZmluaW5nIHRoZSAubmV4dCwgLnRocm93LCBhbmQgLnJldHVybiBtZXRob2RzIG9mIHRoZVxuICAvLyBJdGVyYXRvciBpbnRlcmZhY2UgaW4gdGVybXMgb2YgYSBzaW5nbGUgLl9pbnZva2UgbWV0aG9kLlxuICBmdW5jdGlvbiBkZWZpbmVJdGVyYXRvck1ldGhvZHMocHJvdG90eXBlKSB7XG4gICAgW1wibmV4dFwiLCBcInRocm93XCIsIFwicmV0dXJuXCJdLmZvckVhY2goZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgICBwcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKGFyZykge1xuICAgICAgICByZXR1cm4gdGhpcy5faW52b2tlKG1ldGhvZCwgYXJnKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH1cblxuICBydW50aW1lLmlzR2VuZXJhdG9yRnVuY3Rpb24gPSBmdW5jdGlvbihnZW5GdW4pIHtcbiAgICB2YXIgY3RvciA9IHR5cGVvZiBnZW5GdW4gPT09IFwiZnVuY3Rpb25cIiAmJiBnZW5GdW4uY29uc3RydWN0b3I7XG4gICAgcmV0dXJuIGN0b3JcbiAgICAgID8gY3RvciA9PT0gR2VuZXJhdG9yRnVuY3Rpb24gfHxcbiAgICAgICAgLy8gRm9yIHRoZSBuYXRpdmUgR2VuZXJhdG9yRnVuY3Rpb24gY29uc3RydWN0b3IsIHRoZSBiZXN0IHdlIGNhblxuICAgICAgICAvLyBkbyBpcyB0byBjaGVjayBpdHMgLm5hbWUgcHJvcGVydHkuXG4gICAgICAgIChjdG9yLmRpc3BsYXlOYW1lIHx8IGN0b3IubmFtZSkgPT09IFwiR2VuZXJhdG9yRnVuY3Rpb25cIlxuICAgICAgOiBmYWxzZTtcbiAgfTtcblxuICBydW50aW1lLm1hcmsgPSBmdW5jdGlvbihnZW5GdW4pIHtcbiAgICBpZiAoT2JqZWN0LnNldFByb3RvdHlwZU9mKSB7XG4gICAgICBPYmplY3Quc2V0UHJvdG90eXBlT2YoZ2VuRnVuLCBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdlbkZ1bi5fX3Byb3RvX18gPSBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZTtcbiAgICAgIGlmICghKHRvU3RyaW5nVGFnU3ltYm9sIGluIGdlbkZ1bikpIHtcbiAgICAgICAgZ2VuRnVuW3RvU3RyaW5nVGFnU3ltYm9sXSA9IFwiR2VuZXJhdG9yRnVuY3Rpb25cIjtcbiAgICAgIH1cbiAgICB9XG4gICAgZ2VuRnVuLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoR3ApO1xuICAgIHJldHVybiBnZW5GdW47XG4gIH07XG5cbiAgLy8gV2l0aGluIHRoZSBib2R5IG9mIGFueSBhc3luYyBmdW5jdGlvbiwgYGF3YWl0IHhgIGlzIHRyYW5zZm9ybWVkIHRvXG4gIC8vIGB5aWVsZCByZWdlbmVyYXRvclJ1bnRpbWUuYXdyYXAoeClgLCBzbyB0aGF0IHRoZSBydW50aW1lIGNhbiB0ZXN0XG4gIC8vIGB2YWx1ZSBpbnN0YW5jZW9mIEF3YWl0QXJndW1lbnRgIHRvIGRldGVybWluZSBpZiB0aGUgeWllbGRlZCB2YWx1ZSBpc1xuICAvLyBtZWFudCB0byBiZSBhd2FpdGVkLiBTb21lIG1heSBjb25zaWRlciB0aGUgbmFtZSBvZiB0aGlzIG1ldGhvZCB0b29cbiAgLy8gY3V0ZXN5LCBidXQgdGhleSBhcmUgY3VybXVkZ2VvbnMuXG4gIHJ1bnRpbWUuYXdyYXAgPSBmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gbmV3IEF3YWl0QXJndW1lbnQoYXJnKTtcbiAgfTtcblxuICBmdW5jdGlvbiBBd2FpdEFyZ3VtZW50KGFyZykge1xuICAgIHRoaXMuYXJnID0gYXJnO1xuICB9XG5cbiAgZnVuY3Rpb24gQXN5bmNJdGVyYXRvcihnZW5lcmF0b3IpIHtcbiAgICBmdW5jdGlvbiBpbnZva2UobWV0aG9kLCBhcmcsIHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgdmFyIHJlY29yZCA9IHRyeUNhdGNoKGdlbmVyYXRvclttZXRob2RdLCBnZW5lcmF0b3IsIGFyZyk7XG4gICAgICBpZiAocmVjb3JkLnR5cGUgPT09IFwidGhyb3dcIikge1xuICAgICAgICByZWplY3QocmVjb3JkLmFyZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcmVzdWx0ID0gcmVjb3JkLmFyZztcbiAgICAgICAgdmFyIHZhbHVlID0gcmVzdWx0LnZhbHVlO1xuICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBBd2FpdEFyZ3VtZW50KSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2YWx1ZS5hcmcpLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIGludm9rZShcIm5leHRcIiwgdmFsdWUsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICBpbnZva2UoXCJ0aHJvd1wiLCBlcnIsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKGZ1bmN0aW9uKHVud3JhcHBlZCkge1xuICAgICAgICAgIC8vIFdoZW4gYSB5aWVsZGVkIFByb21pc2UgaXMgcmVzb2x2ZWQsIGl0cyBmaW5hbCB2YWx1ZSBiZWNvbWVzXG4gICAgICAgICAgLy8gdGhlIC52YWx1ZSBvZiB0aGUgUHJvbWlzZTx7dmFsdWUsZG9uZX0+IHJlc3VsdCBmb3IgdGhlXG4gICAgICAgICAgLy8gY3VycmVudCBpdGVyYXRpb24uIElmIHRoZSBQcm9taXNlIGlzIHJlamVjdGVkLCBob3dldmVyLCB0aGVcbiAgICAgICAgICAvLyByZXN1bHQgZm9yIHRoaXMgaXRlcmF0aW9uIHdpbGwgYmUgcmVqZWN0ZWQgd2l0aCB0aGUgc2FtZVxuICAgICAgICAgIC8vIHJlYXNvbi4gTm90ZSB0aGF0IHJlamVjdGlvbnMgb2YgeWllbGRlZCBQcm9taXNlcyBhcmUgbm90XG4gICAgICAgICAgLy8gdGhyb3duIGJhY2sgaW50byB0aGUgZ2VuZXJhdG9yIGZ1bmN0aW9uLCBhcyBpcyB0aGUgY2FzZVxuICAgICAgICAgIC8vIHdoZW4gYW4gYXdhaXRlZCBQcm9taXNlIGlzIHJlamVjdGVkLiBUaGlzIGRpZmZlcmVuY2UgaW5cbiAgICAgICAgICAvLyBiZWhhdmlvciBiZXR3ZWVuIHlpZWxkIGFuZCBhd2FpdCBpcyBpbXBvcnRhbnQsIGJlY2F1c2UgaXRcbiAgICAgICAgICAvLyBhbGxvd3MgdGhlIGNvbnN1bWVyIHRvIGRlY2lkZSB3aGF0IHRvIGRvIHdpdGggdGhlIHlpZWxkZWRcbiAgICAgICAgICAvLyByZWplY3Rpb24gKHN3YWxsb3cgaXQgYW5kIGNvbnRpbnVlLCBtYW51YWxseSAudGhyb3cgaXQgYmFja1xuICAgICAgICAgIC8vIGludG8gdGhlIGdlbmVyYXRvciwgYWJhbmRvbiBpdGVyYXRpb24sIHdoYXRldmVyKS4gV2l0aFxuICAgICAgICAgIC8vIGF3YWl0LCBieSBjb250cmFzdCwgdGhlcmUgaXMgbm8gb3Bwb3J0dW5pdHkgdG8gZXhhbWluZSB0aGVcbiAgICAgICAgICAvLyByZWplY3Rpb24gcmVhc29uIG91dHNpZGUgdGhlIGdlbmVyYXRvciBmdW5jdGlvbiwgc28gdGhlXG4gICAgICAgICAgLy8gb25seSBvcHRpb24gaXMgdG8gdGhyb3cgaXQgZnJvbSB0aGUgYXdhaXQgZXhwcmVzc2lvbiwgYW5kXG4gICAgICAgICAgLy8gbGV0IHRoZSBnZW5lcmF0b3IgZnVuY3Rpb24gaGFuZGxlIHRoZSBleGNlcHRpb24uXG4gICAgICAgICAgcmVzdWx0LnZhbHVlID0gdW53cmFwcGVkO1xuICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIgJiYgcHJvY2Vzcy5kb21haW4pIHtcbiAgICAgIGludm9rZSA9IHByb2Nlc3MuZG9tYWluLmJpbmQoaW52b2tlKTtcbiAgICB9XG5cbiAgICB2YXIgcHJldmlvdXNQcm9taXNlO1xuXG4gICAgZnVuY3Rpb24gZW5xdWV1ZShtZXRob2QsIGFyZykge1xuICAgICAgZnVuY3Rpb24gY2FsbEludm9rZVdpdGhNZXRob2RBbmRBcmcoKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICBpbnZva2UobWV0aG9kLCBhcmcsIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJldmlvdXNQcm9taXNlID1cbiAgICAgICAgLy8gSWYgZW5xdWV1ZSBoYXMgYmVlbiBjYWxsZWQgYmVmb3JlLCB0aGVuIHdlIHdhbnQgdG8gd2FpdCB1bnRpbFxuICAgICAgICAvLyBhbGwgcHJldmlvdXMgUHJvbWlzZXMgaGF2ZSBiZWVuIHJlc29sdmVkIGJlZm9yZSBjYWxsaW5nIGludm9rZSxcbiAgICAgICAgLy8gc28gdGhhdCByZXN1bHRzIGFyZSBhbHdheXMgZGVsaXZlcmVkIGluIHRoZSBjb3JyZWN0IG9yZGVyLiBJZlxuICAgICAgICAvLyBlbnF1ZXVlIGhhcyBub3QgYmVlbiBjYWxsZWQgYmVmb3JlLCB0aGVuIGl0IGlzIGltcG9ydGFudCB0b1xuICAgICAgICAvLyBjYWxsIGludm9rZSBpbW1lZGlhdGVseSwgd2l0aG91dCB3YWl0aW5nIG9uIGEgY2FsbGJhY2sgdG8gZmlyZSxcbiAgICAgICAgLy8gc28gdGhhdCB0aGUgYXN5bmMgZ2VuZXJhdG9yIGZ1bmN0aW9uIGhhcyB0aGUgb3Bwb3J0dW5pdHkgdG8gZG9cbiAgICAgICAgLy8gYW55IG5lY2Vzc2FyeSBzZXR1cCBpbiBhIHByZWRpY3RhYmxlIHdheS4gVGhpcyBwcmVkaWN0YWJpbGl0eVxuICAgICAgICAvLyBpcyB3aHkgdGhlIFByb21pc2UgY29uc3RydWN0b3Igc3luY2hyb25vdXNseSBpbnZva2VzIGl0c1xuICAgICAgICAvLyBleGVjdXRvciBjYWxsYmFjaywgYW5kIHdoeSBhc3luYyBmdW5jdGlvbnMgc3luY2hyb25vdXNseVxuICAgICAgICAvLyBleGVjdXRlIGNvZGUgYmVmb3JlIHRoZSBmaXJzdCBhd2FpdC4gU2luY2Ugd2UgaW1wbGVtZW50IHNpbXBsZVxuICAgICAgICAvLyBhc3luYyBmdW5jdGlvbnMgaW4gdGVybXMgb2YgYXN5bmMgZ2VuZXJhdG9ycywgaXQgaXMgZXNwZWNpYWxseVxuICAgICAgICAvLyBpbXBvcnRhbnQgdG8gZ2V0IHRoaXMgcmlnaHQsIGV2ZW4gdGhvdWdoIGl0IHJlcXVpcmVzIGNhcmUuXG4gICAgICAgIHByZXZpb3VzUHJvbWlzZSA/IHByZXZpb3VzUHJvbWlzZS50aGVuKFxuICAgICAgICAgIGNhbGxJbnZva2VXaXRoTWV0aG9kQW5kQXJnLFxuICAgICAgICAgIC8vIEF2b2lkIHByb3BhZ2F0aW5nIGZhaWx1cmVzIHRvIFByb21pc2VzIHJldHVybmVkIGJ5IGxhdGVyXG4gICAgICAgICAgLy8gaW52b2NhdGlvbnMgb2YgdGhlIGl0ZXJhdG9yLlxuICAgICAgICAgIGNhbGxJbnZva2VXaXRoTWV0aG9kQW5kQXJnXG4gICAgICAgICkgOiBjYWxsSW52b2tlV2l0aE1ldGhvZEFuZEFyZygpO1xuICAgIH1cblxuICAgIC8vIERlZmluZSB0aGUgdW5pZmllZCBoZWxwZXIgbWV0aG9kIHRoYXQgaXMgdXNlZCB0byBpbXBsZW1lbnQgLm5leHQsXG4gICAgLy8gLnRocm93LCBhbmQgLnJldHVybiAoc2VlIGRlZmluZUl0ZXJhdG9yTWV0aG9kcykuXG4gICAgdGhpcy5faW52b2tlID0gZW5xdWV1ZTtcbiAgfVxuXG4gIGRlZmluZUl0ZXJhdG9yTWV0aG9kcyhBc3luY0l0ZXJhdG9yLnByb3RvdHlwZSk7XG5cbiAgLy8gTm90ZSB0aGF0IHNpbXBsZSBhc3luYyBmdW5jdGlvbnMgYXJlIGltcGxlbWVudGVkIG9uIHRvcCBvZlxuICAvLyBBc3luY0l0ZXJhdG9yIG9iamVjdHM7IHRoZXkganVzdCByZXR1cm4gYSBQcm9taXNlIGZvciB0aGUgdmFsdWUgb2ZcbiAgLy8gdGhlIGZpbmFsIHJlc3VsdCBwcm9kdWNlZCBieSB0aGUgaXRlcmF0b3IuXG4gIHJ1bnRpbWUuYXN5bmMgPSBmdW5jdGlvbihpbm5lckZuLCBvdXRlckZuLCBzZWxmLCB0cnlMb2NzTGlzdCkge1xuICAgIHZhciBpdGVyID0gbmV3IEFzeW5jSXRlcmF0b3IoXG4gICAgICB3cmFwKGlubmVyRm4sIG91dGVyRm4sIHNlbGYsIHRyeUxvY3NMaXN0KVxuICAgICk7XG5cbiAgICByZXR1cm4gcnVudGltZS5pc0dlbmVyYXRvckZ1bmN0aW9uKG91dGVyRm4pXG4gICAgICA/IGl0ZXIgLy8gSWYgb3V0ZXJGbiBpcyBhIGdlbmVyYXRvciwgcmV0dXJuIHRoZSBmdWxsIGl0ZXJhdG9yLlxuICAgICAgOiBpdGVyLm5leHQoKS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQuZG9uZSA/IHJlc3VsdC52YWx1ZSA6IGl0ZXIubmV4dCgpO1xuICAgICAgICB9KTtcbiAgfTtcblxuICBmdW5jdGlvbiBtYWtlSW52b2tlTWV0aG9kKGlubmVyRm4sIHNlbGYsIGNvbnRleHQpIHtcbiAgICB2YXIgc3RhdGUgPSBHZW5TdGF0ZVN1c3BlbmRlZFN0YXJ0O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGludm9rZShtZXRob2QsIGFyZykge1xuICAgICAgaWYgKHN0YXRlID09PSBHZW5TdGF0ZUV4ZWN1dGluZykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBydW5uaW5nXCIpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc3RhdGUgPT09IEdlblN0YXRlQ29tcGxldGVkKSB7XG4gICAgICAgIGlmIChtZXRob2QgPT09IFwidGhyb3dcIikge1xuICAgICAgICAgIHRocm93IGFyZztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJlIGZvcmdpdmluZywgcGVyIDI1LjMuMy4zLjMgb2YgdGhlIHNwZWM6XG4gICAgICAgIC8vIGh0dHBzOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy1nZW5lcmF0b3JyZXN1bWVcbiAgICAgICAgcmV0dXJuIGRvbmVSZXN1bHQoKTtcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdmFyIGRlbGVnYXRlID0gY29udGV4dC5kZWxlZ2F0ZTtcbiAgICAgICAgaWYgKGRlbGVnYXRlKSB7XG4gICAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJyZXR1cm5cIiB8fFxuICAgICAgICAgICAgICAobWV0aG9kID09PSBcInRocm93XCIgJiYgZGVsZWdhdGUuaXRlcmF0b3JbbWV0aG9kXSA9PT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgLy8gQSByZXR1cm4gb3IgdGhyb3cgKHdoZW4gdGhlIGRlbGVnYXRlIGl0ZXJhdG9yIGhhcyBubyB0aHJvd1xuICAgICAgICAgICAgLy8gbWV0aG9kKSBhbHdheXMgdGVybWluYXRlcyB0aGUgeWllbGQqIGxvb3AuXG4gICAgICAgICAgICBjb250ZXh0LmRlbGVnYXRlID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gSWYgdGhlIGRlbGVnYXRlIGl0ZXJhdG9yIGhhcyBhIHJldHVybiBtZXRob2QsIGdpdmUgaXQgYVxuICAgICAgICAgICAgLy8gY2hhbmNlIHRvIGNsZWFuIHVwLlxuICAgICAgICAgICAgdmFyIHJldHVybk1ldGhvZCA9IGRlbGVnYXRlLml0ZXJhdG9yW1wicmV0dXJuXCJdO1xuICAgICAgICAgICAgaWYgKHJldHVybk1ldGhvZCkge1xuICAgICAgICAgICAgICB2YXIgcmVjb3JkID0gdHJ5Q2F0Y2gocmV0dXJuTWV0aG9kLCBkZWxlZ2F0ZS5pdGVyYXRvciwgYXJnKTtcbiAgICAgICAgICAgICAgaWYgKHJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgcmV0dXJuIG1ldGhvZCB0aHJldyBhbiBleGNlcHRpb24sIGxldCB0aGF0XG4gICAgICAgICAgICAgICAgLy8gZXhjZXB0aW9uIHByZXZhaWwgb3ZlciB0aGUgb3JpZ2luYWwgcmV0dXJuIG9yIHRocm93LlxuICAgICAgICAgICAgICAgIG1ldGhvZCA9IFwidGhyb3dcIjtcbiAgICAgICAgICAgICAgICBhcmcgPSByZWNvcmQuYXJnO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChtZXRob2QgPT09IFwicmV0dXJuXCIpIHtcbiAgICAgICAgICAgICAgLy8gQ29udGludWUgd2l0aCB0aGUgb3V0ZXIgcmV0dXJuLCBub3cgdGhhdCB0aGUgZGVsZWdhdGVcbiAgICAgICAgICAgICAgLy8gaXRlcmF0b3IgaGFzIGJlZW4gdGVybWluYXRlZC5cbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHJlY29yZCA9IHRyeUNhdGNoKFxuICAgICAgICAgICAgZGVsZWdhdGUuaXRlcmF0b3JbbWV0aG9kXSxcbiAgICAgICAgICAgIGRlbGVnYXRlLml0ZXJhdG9yLFxuICAgICAgICAgICAgYXJnXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgICAgICBjb250ZXh0LmRlbGVnYXRlID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gTGlrZSByZXR1cm5pbmcgZ2VuZXJhdG9yLnRocm93KHVuY2F1Z2h0KSwgYnV0IHdpdGhvdXQgdGhlXG4gICAgICAgICAgICAvLyBvdmVyaGVhZCBvZiBhbiBleHRyYSBmdW5jdGlvbiBjYWxsLlxuICAgICAgICAgICAgbWV0aG9kID0gXCJ0aHJvd1wiO1xuICAgICAgICAgICAgYXJnID0gcmVjb3JkLmFyZztcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIERlbGVnYXRlIGdlbmVyYXRvciByYW4gYW5kIGhhbmRsZWQgaXRzIG93biBleGNlcHRpb25zIHNvXG4gICAgICAgICAgLy8gcmVnYXJkbGVzcyBvZiB3aGF0IHRoZSBtZXRob2Qgd2FzLCB3ZSBjb250aW51ZSBhcyBpZiBpdCBpc1xuICAgICAgICAgIC8vIFwibmV4dFwiIHdpdGggYW4gdW5kZWZpbmVkIGFyZy5cbiAgICAgICAgICBtZXRob2QgPSBcIm5leHRcIjtcbiAgICAgICAgICBhcmcgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgICB2YXIgaW5mbyA9IHJlY29yZC5hcmc7XG4gICAgICAgICAgaWYgKGluZm8uZG9uZSkge1xuICAgICAgICAgICAgY29udGV4dFtkZWxlZ2F0ZS5yZXN1bHROYW1lXSA9IGluZm8udmFsdWU7XG4gICAgICAgICAgICBjb250ZXh0Lm5leHQgPSBkZWxlZ2F0ZS5uZXh0TG9jO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZSA9IEdlblN0YXRlU3VzcGVuZGVkWWllbGQ7XG4gICAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb250ZXh0LmRlbGVnYXRlID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtZXRob2QgPT09IFwibmV4dFwiKSB7XG4gICAgICAgICAgaWYgKHN0YXRlID09PSBHZW5TdGF0ZVN1c3BlbmRlZFlpZWxkKSB7XG4gICAgICAgICAgICBjb250ZXh0LnNlbnQgPSBhcmc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnRleHQuc2VudCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChtZXRob2QgPT09IFwidGhyb3dcIikge1xuICAgICAgICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVTdXNwZW5kZWRTdGFydCkge1xuICAgICAgICAgICAgc3RhdGUgPSBHZW5TdGF0ZUNvbXBsZXRlZDtcbiAgICAgICAgICAgIHRocm93IGFyZztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoY29udGV4dC5kaXNwYXRjaEV4Y2VwdGlvbihhcmcpKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgZGlzcGF0Y2hlZCBleGNlcHRpb24gd2FzIGNhdWdodCBieSBhIGNhdGNoIGJsb2NrLFxuICAgICAgICAgICAgLy8gdGhlbiBsZXQgdGhhdCBjYXRjaCBibG9jayBoYW5kbGUgdGhlIGV4Y2VwdGlvbiBub3JtYWxseS5cbiAgICAgICAgICAgIG1ldGhvZCA9IFwibmV4dFwiO1xuICAgICAgICAgICAgYXJnID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKG1ldGhvZCA9PT0gXCJyZXR1cm5cIikge1xuICAgICAgICAgIGNvbnRleHQuYWJydXB0KFwicmV0dXJuXCIsIGFyZyk7XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZSA9IEdlblN0YXRlRXhlY3V0aW5nO1xuXG4gICAgICAgIHZhciByZWNvcmQgPSB0cnlDYXRjaChpbm5lckZuLCBzZWxmLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKHJlY29yZC50eXBlID09PSBcIm5vcm1hbFwiKSB7XG4gICAgICAgICAgLy8gSWYgYW4gZXhjZXB0aW9uIGlzIHRocm93biBmcm9tIGlubmVyRm4sIHdlIGxlYXZlIHN0YXRlID09PVxuICAgICAgICAgIC8vIEdlblN0YXRlRXhlY3V0aW5nIGFuZCBsb29wIGJhY2sgZm9yIGFub3RoZXIgaW52b2NhdGlvbi5cbiAgICAgICAgICBzdGF0ZSA9IGNvbnRleHQuZG9uZVxuICAgICAgICAgICAgPyBHZW5TdGF0ZUNvbXBsZXRlZFxuICAgICAgICAgICAgOiBHZW5TdGF0ZVN1c3BlbmRlZFlpZWxkO1xuXG4gICAgICAgICAgdmFyIGluZm8gPSB7XG4gICAgICAgICAgICB2YWx1ZTogcmVjb3JkLmFyZyxcbiAgICAgICAgICAgIGRvbmU6IGNvbnRleHQuZG9uZVxuICAgICAgICAgIH07XG5cbiAgICAgICAgICBpZiAocmVjb3JkLmFyZyA9PT0gQ29udGludWVTZW50aW5lbCkge1xuICAgICAgICAgICAgaWYgKGNvbnRleHQuZGVsZWdhdGUgJiYgbWV0aG9kID09PSBcIm5leHRcIikge1xuICAgICAgICAgICAgICAvLyBEZWxpYmVyYXRlbHkgZm9yZ2V0IHRoZSBsYXN0IHNlbnQgdmFsdWUgc28gdGhhdCB3ZSBkb24ndFxuICAgICAgICAgICAgICAvLyBhY2NpZGVudGFsbHkgcGFzcyBpdCBvbiB0byB0aGUgZGVsZWdhdGUuXG4gICAgICAgICAgICAgIGFyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAocmVjb3JkLnR5cGUgPT09IFwidGhyb3dcIikge1xuICAgICAgICAgIHN0YXRlID0gR2VuU3RhdGVDb21wbGV0ZWQ7XG4gICAgICAgICAgLy8gRGlzcGF0Y2ggdGhlIGV4Y2VwdGlvbiBieSBsb29waW5nIGJhY2sgYXJvdW5kIHRvIHRoZVxuICAgICAgICAgIC8vIGNvbnRleHQuZGlzcGF0Y2hFeGNlcHRpb24oYXJnKSBjYWxsIGFib3ZlLlxuICAgICAgICAgIG1ldGhvZCA9IFwidGhyb3dcIjtcbiAgICAgICAgICBhcmcgPSByZWNvcmQuYXJnO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXG4gIC8vIERlZmluZSBHZW5lcmF0b3IucHJvdG90eXBlLntuZXh0LHRocm93LHJldHVybn0gaW4gdGVybXMgb2YgdGhlXG4gIC8vIHVuaWZpZWQgLl9pbnZva2UgaGVscGVyIG1ldGhvZC5cbiAgZGVmaW5lSXRlcmF0b3JNZXRob2RzKEdwKTtcblxuICBHcFtpdGVyYXRvclN5bWJvbF0gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICBHcFt0b1N0cmluZ1RhZ1N5bWJvbF0gPSBcIkdlbmVyYXRvclwiO1xuXG4gIEdwLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFwiW29iamVjdCBHZW5lcmF0b3JdXCI7XG4gIH07XG5cbiAgZnVuY3Rpb24gcHVzaFRyeUVudHJ5KGxvY3MpIHtcbiAgICB2YXIgZW50cnkgPSB7IHRyeUxvYzogbG9jc1swXSB9O1xuXG4gICAgaWYgKDEgaW4gbG9jcykge1xuICAgICAgZW50cnkuY2F0Y2hMb2MgPSBsb2NzWzFdO1xuICAgIH1cblxuICAgIGlmICgyIGluIGxvY3MpIHtcbiAgICAgIGVudHJ5LmZpbmFsbHlMb2MgPSBsb2NzWzJdO1xuICAgICAgZW50cnkuYWZ0ZXJMb2MgPSBsb2NzWzNdO1xuICAgIH1cblxuICAgIHRoaXMudHJ5RW50cmllcy5wdXNoKGVudHJ5KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2V0VHJ5RW50cnkoZW50cnkpIHtcbiAgICB2YXIgcmVjb3JkID0gZW50cnkuY29tcGxldGlvbiB8fCB7fTtcbiAgICByZWNvcmQudHlwZSA9IFwibm9ybWFsXCI7XG4gICAgZGVsZXRlIHJlY29yZC5hcmc7XG4gICAgZW50cnkuY29tcGxldGlvbiA9IHJlY29yZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIENvbnRleHQodHJ5TG9jc0xpc3QpIHtcbiAgICAvLyBUaGUgcm9vdCBlbnRyeSBvYmplY3QgKGVmZmVjdGl2ZWx5IGEgdHJ5IHN0YXRlbWVudCB3aXRob3V0IGEgY2F0Y2hcbiAgICAvLyBvciBhIGZpbmFsbHkgYmxvY2spIGdpdmVzIHVzIGEgcGxhY2UgdG8gc3RvcmUgdmFsdWVzIHRocm93biBmcm9tXG4gICAgLy8gbG9jYXRpb25zIHdoZXJlIHRoZXJlIGlzIG5vIGVuY2xvc2luZyB0cnkgc3RhdGVtZW50LlxuICAgIHRoaXMudHJ5RW50cmllcyA9IFt7IHRyeUxvYzogXCJyb290XCIgfV07XG4gICAgdHJ5TG9jc0xpc3QuZm9yRWFjaChwdXNoVHJ5RW50cnksIHRoaXMpO1xuICAgIHRoaXMucmVzZXQodHJ1ZSk7XG4gIH1cblxuICBydW50aW1lLmtleXMgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmplY3QpIHtcbiAgICAgIGtleXMucHVzaChrZXkpO1xuICAgIH1cbiAgICBrZXlzLnJldmVyc2UoKTtcblxuICAgIC8vIFJhdGhlciB0aGFuIHJldHVybmluZyBhbiBvYmplY3Qgd2l0aCBhIG5leHQgbWV0aG9kLCB3ZSBrZWVwXG4gICAgLy8gdGhpbmdzIHNpbXBsZSBhbmQgcmV0dXJuIHRoZSBuZXh0IGZ1bmN0aW9uIGl0c2VsZi5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgIHdoaWxlIChrZXlzLmxlbmd0aCkge1xuICAgICAgICB2YXIga2V5ID0ga2V5cy5wb3AoKTtcbiAgICAgICAgaWYgKGtleSBpbiBvYmplY3QpIHtcbiAgICAgICAgICBuZXh0LnZhbHVlID0ga2V5O1xuICAgICAgICAgIG5leHQuZG9uZSA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBuZXh0O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFRvIGF2b2lkIGNyZWF0aW5nIGFuIGFkZGl0aW9uYWwgb2JqZWN0LCB3ZSBqdXN0IGhhbmcgdGhlIC52YWx1ZVxuICAgICAgLy8gYW5kIC5kb25lIHByb3BlcnRpZXMgb2ZmIHRoZSBuZXh0IGZ1bmN0aW9uIG9iamVjdCBpdHNlbGYuIFRoaXNcbiAgICAgIC8vIGFsc28gZW5zdXJlcyB0aGF0IHRoZSBtaW5pZmllciB3aWxsIG5vdCBhbm9ueW1pemUgdGhlIGZ1bmN0aW9uLlxuICAgICAgbmV4dC5kb25lID0gdHJ1ZTtcbiAgICAgIHJldHVybiBuZXh0O1xuICAgIH07XG4gIH07XG5cbiAgZnVuY3Rpb24gdmFsdWVzKGl0ZXJhYmxlKSB7XG4gICAgaWYgKGl0ZXJhYmxlKSB7XG4gICAgICB2YXIgaXRlcmF0b3JNZXRob2QgPSBpdGVyYWJsZVtpdGVyYXRvclN5bWJvbF07XG4gICAgICBpZiAoaXRlcmF0b3JNZXRob2QpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yTWV0aG9kLmNhbGwoaXRlcmFibGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGl0ZXJhYmxlLm5leHQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICByZXR1cm4gaXRlcmFibGU7XG4gICAgICB9XG5cbiAgICAgIGlmICghaXNOYU4oaXRlcmFibGUubGVuZ3RoKSkge1xuICAgICAgICB2YXIgaSA9IC0xLCBuZXh0ID0gZnVuY3Rpb24gbmV4dCgpIHtcbiAgICAgICAgICB3aGlsZSAoKytpIDwgaXRlcmFibGUubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duLmNhbGwoaXRlcmFibGUsIGkpKSB7XG4gICAgICAgICAgICAgIG5leHQudmFsdWUgPSBpdGVyYWJsZVtpXTtcbiAgICAgICAgICAgICAgbmV4dC5kb25lID0gZmFsc2U7XG4gICAgICAgICAgICAgIHJldHVybiBuZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIG5leHQudmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgbmV4dC5kb25lID0gdHJ1ZTtcblxuICAgICAgICAgIHJldHVybiBuZXh0O1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBuZXh0Lm5leHQgPSBuZXh0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJldHVybiBhbiBpdGVyYXRvciB3aXRoIG5vIHZhbHVlcy5cbiAgICByZXR1cm4geyBuZXh0OiBkb25lUmVzdWx0IH07XG4gIH1cbiAgcnVudGltZS52YWx1ZXMgPSB2YWx1ZXM7XG5cbiAgZnVuY3Rpb24gZG9uZVJlc3VsdCgpIHtcbiAgICByZXR1cm4geyB2YWx1ZTogdW5kZWZpbmVkLCBkb25lOiB0cnVlIH07XG4gIH1cblxuICBDb250ZXh0LnByb3RvdHlwZSA9IHtcbiAgICBjb25zdHJ1Y3RvcjogQ29udGV4dCxcblxuICAgIHJlc2V0OiBmdW5jdGlvbihza2lwVGVtcFJlc2V0KSB7XG4gICAgICB0aGlzLnByZXYgPSAwO1xuICAgICAgdGhpcy5uZXh0ID0gMDtcbiAgICAgIHRoaXMuc2VudCA9IHVuZGVmaW5lZDtcbiAgICAgIHRoaXMuZG9uZSA9IGZhbHNlO1xuICAgICAgdGhpcy5kZWxlZ2F0ZSA9IG51bGw7XG5cbiAgICAgIHRoaXMudHJ5RW50cmllcy5mb3JFYWNoKHJlc2V0VHJ5RW50cnkpO1xuXG4gICAgICBpZiAoIXNraXBUZW1wUmVzZXQpIHtcbiAgICAgICAgZm9yICh2YXIgbmFtZSBpbiB0aGlzKSB7XG4gICAgICAgICAgLy8gTm90IHN1cmUgYWJvdXQgdGhlIG9wdGltYWwgb3JkZXIgb2YgdGhlc2UgY29uZGl0aW9uczpcbiAgICAgICAgICBpZiAobmFtZS5jaGFyQXQoMCkgPT09IFwidFwiICYmXG4gICAgICAgICAgICAgIGhhc093bi5jYWxsKHRoaXMsIG5hbWUpICYmXG4gICAgICAgICAgICAgICFpc05hTigrbmFtZS5zbGljZSgxKSkpIHtcbiAgICAgICAgICAgIHRoaXNbbmFtZV0gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5kb25lID0gdHJ1ZTtcblxuICAgICAgdmFyIHJvb3RFbnRyeSA9IHRoaXMudHJ5RW50cmllc1swXTtcbiAgICAgIHZhciByb290UmVjb3JkID0gcm9vdEVudHJ5LmNvbXBsZXRpb247XG4gICAgICBpZiAocm9vdFJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgICAgdGhyb3cgcm9vdFJlY29yZC5hcmc7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnJ2YWw7XG4gICAgfSxcblxuICAgIGRpc3BhdGNoRXhjZXB0aW9uOiBmdW5jdGlvbihleGNlcHRpb24pIHtcbiAgICAgIGlmICh0aGlzLmRvbmUpIHtcbiAgICAgICAgdGhyb3cgZXhjZXB0aW9uO1xuICAgICAgfVxuXG4gICAgICB2YXIgY29udGV4dCA9IHRoaXM7XG4gICAgICBmdW5jdGlvbiBoYW5kbGUobG9jLCBjYXVnaHQpIHtcbiAgICAgICAgcmVjb3JkLnR5cGUgPSBcInRocm93XCI7XG4gICAgICAgIHJlY29yZC5hcmcgPSBleGNlcHRpb247XG4gICAgICAgIGNvbnRleHQubmV4dCA9IGxvYztcbiAgICAgICAgcmV0dXJuICEhY2F1Z2h0O1xuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBpID0gdGhpcy50cnlFbnRyaWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIHZhciBlbnRyeSA9IHRoaXMudHJ5RW50cmllc1tpXTtcbiAgICAgICAgdmFyIHJlY29yZCA9IGVudHJ5LmNvbXBsZXRpb247XG5cbiAgICAgICAgaWYgKGVudHJ5LnRyeUxvYyA9PT0gXCJyb290XCIpIHtcbiAgICAgICAgICAvLyBFeGNlcHRpb24gdGhyb3duIG91dHNpZGUgb2YgYW55IHRyeSBibG9jayB0aGF0IGNvdWxkIGhhbmRsZVxuICAgICAgICAgIC8vIGl0LCBzbyBzZXQgdGhlIGNvbXBsZXRpb24gdmFsdWUgb2YgdGhlIGVudGlyZSBmdW5jdGlvbiB0b1xuICAgICAgICAgIC8vIHRocm93IHRoZSBleGNlcHRpb24uXG4gICAgICAgICAgcmV0dXJuIGhhbmRsZShcImVuZFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbnRyeS50cnlMb2MgPD0gdGhpcy5wcmV2KSB7XG4gICAgICAgICAgdmFyIGhhc0NhdGNoID0gaGFzT3duLmNhbGwoZW50cnksIFwiY2F0Y2hMb2NcIik7XG4gICAgICAgICAgdmFyIGhhc0ZpbmFsbHkgPSBoYXNPd24uY2FsbChlbnRyeSwgXCJmaW5hbGx5TG9jXCIpO1xuXG4gICAgICAgICAgaWYgKGhhc0NhdGNoICYmIGhhc0ZpbmFsbHkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByZXYgPCBlbnRyeS5jYXRjaExvYykge1xuICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmNhdGNoTG9jLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5wcmV2IDwgZW50cnkuZmluYWxseUxvYykge1xuICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmZpbmFsbHlMb2MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIGlmIChoYXNDYXRjaCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJldiA8IGVudHJ5LmNhdGNoTG9jKSB7XG4gICAgICAgICAgICAgIHJldHVybiBoYW5kbGUoZW50cnkuY2F0Y2hMb2MsIHRydWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIGlmIChoYXNGaW5hbGx5KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcmV2IDwgZW50cnkuZmluYWxseUxvYykge1xuICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmZpbmFsbHlMb2MpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRyeSBzdGF0ZW1lbnQgd2l0aG91dCBjYXRjaCBvciBmaW5hbGx5XCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBhYnJ1cHQ6IGZ1bmN0aW9uKHR5cGUsIGFyZykge1xuICAgICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5RW50cmllcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICB2YXIgZW50cnkgPSB0aGlzLnRyeUVudHJpZXNbaV07XG4gICAgICAgIGlmIChlbnRyeS50cnlMb2MgPD0gdGhpcy5wcmV2ICYmXG4gICAgICAgICAgICBoYXNPd24uY2FsbChlbnRyeSwgXCJmaW5hbGx5TG9jXCIpICYmXG4gICAgICAgICAgICB0aGlzLnByZXYgPCBlbnRyeS5maW5hbGx5TG9jKSB7XG4gICAgICAgICAgdmFyIGZpbmFsbHlFbnRyeSA9IGVudHJ5O1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChmaW5hbGx5RW50cnkgJiZcbiAgICAgICAgICAodHlwZSA9PT0gXCJicmVha1wiIHx8XG4gICAgICAgICAgIHR5cGUgPT09IFwiY29udGludWVcIikgJiZcbiAgICAgICAgICBmaW5hbGx5RW50cnkudHJ5TG9jIDw9IGFyZyAmJlxuICAgICAgICAgIGFyZyA8PSBmaW5hbGx5RW50cnkuZmluYWxseUxvYykge1xuICAgICAgICAvLyBJZ25vcmUgdGhlIGZpbmFsbHkgZW50cnkgaWYgY29udHJvbCBpcyBub3QganVtcGluZyB0byBhXG4gICAgICAgIC8vIGxvY2F0aW9uIG91dHNpZGUgdGhlIHRyeS9jYXRjaCBibG9jay5cbiAgICAgICAgZmluYWxseUVudHJ5ID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgdmFyIHJlY29yZCA9IGZpbmFsbHlFbnRyeSA/IGZpbmFsbHlFbnRyeS5jb21wbGV0aW9uIDoge307XG4gICAgICByZWNvcmQudHlwZSA9IHR5cGU7XG4gICAgICByZWNvcmQuYXJnID0gYXJnO1xuXG4gICAgICBpZiAoZmluYWxseUVudHJ5KSB7XG4gICAgICAgIHRoaXMubmV4dCA9IGZpbmFsbHlFbnRyeS5maW5hbGx5TG9jO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jb21wbGV0ZShyZWNvcmQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgICB9LFxuXG4gICAgY29tcGxldGU6IGZ1bmN0aW9uKHJlY29yZCwgYWZ0ZXJMb2MpIHtcbiAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgIHRocm93IHJlY29yZC5hcmc7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJicmVha1wiIHx8XG4gICAgICAgICAgcmVjb3JkLnR5cGUgPT09IFwiY29udGludWVcIikge1xuICAgICAgICB0aGlzLm5leHQgPSByZWNvcmQuYXJnO1xuICAgICAgfSBlbHNlIGlmIChyZWNvcmQudHlwZSA9PT0gXCJyZXR1cm5cIikge1xuICAgICAgICB0aGlzLnJ2YWwgPSByZWNvcmQuYXJnO1xuICAgICAgICB0aGlzLm5leHQgPSBcImVuZFwiO1xuICAgICAgfSBlbHNlIGlmIChyZWNvcmQudHlwZSA9PT0gXCJub3JtYWxcIiAmJiBhZnRlckxvYykge1xuICAgICAgICB0aGlzLm5leHQgPSBhZnRlckxvYztcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgZmluaXNoOiBmdW5jdGlvbihmaW5hbGx5TG9jKSB7XG4gICAgICBmb3IgKHZhciBpID0gdGhpcy50cnlFbnRyaWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIHZhciBlbnRyeSA9IHRoaXMudHJ5RW50cmllc1tpXTtcbiAgICAgICAgaWYgKGVudHJ5LmZpbmFsbHlMb2MgPT09IGZpbmFsbHlMb2MpIHtcbiAgICAgICAgICB0aGlzLmNvbXBsZXRlKGVudHJ5LmNvbXBsZXRpb24sIGVudHJ5LmFmdGVyTG9jKTtcbiAgICAgICAgICByZXNldFRyeUVudHJ5KGVudHJ5KTtcbiAgICAgICAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBcImNhdGNoXCI6IGZ1bmN0aW9uKHRyeUxvYykge1xuICAgICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5RW50cmllcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICB2YXIgZW50cnkgPSB0aGlzLnRyeUVudHJpZXNbaV07XG4gICAgICAgIGlmIChlbnRyeS50cnlMb2MgPT09IHRyeUxvYykge1xuICAgICAgICAgIHZhciByZWNvcmQgPSBlbnRyeS5jb21wbGV0aW9uO1xuICAgICAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgICAgICB2YXIgdGhyb3duID0gcmVjb3JkLmFyZztcbiAgICAgICAgICAgIHJlc2V0VHJ5RW50cnkoZW50cnkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdGhyb3duO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZSBjb250ZXh0LmNhdGNoIG1ldGhvZCBtdXN0IG9ubHkgYmUgY2FsbGVkIHdpdGggYSBsb2NhdGlvblxuICAgICAgLy8gYXJndW1lbnQgdGhhdCBjb3JyZXNwb25kcyB0byBhIGtub3duIGNhdGNoIGJsb2NrLlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaWxsZWdhbCBjYXRjaCBhdHRlbXB0XCIpO1xuICAgIH0sXG5cbiAgICBkZWxlZ2F0ZVlpZWxkOiBmdW5jdGlvbihpdGVyYWJsZSwgcmVzdWx0TmFtZSwgbmV4dExvYykge1xuICAgICAgdGhpcy5kZWxlZ2F0ZSA9IHtcbiAgICAgICAgaXRlcmF0b3I6IHZhbHVlcyhpdGVyYWJsZSksXG4gICAgICAgIHJlc3VsdE5hbWU6IHJlc3VsdE5hbWUsXG4gICAgICAgIG5leHRMb2M6IG5leHRMb2NcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBDb250aW51ZVNlbnRpbmVsO1xuICAgIH1cbiAgfTtcbn0pKFxuICAvLyBBbW9uZyB0aGUgdmFyaW91cyB0cmlja3MgZm9yIG9idGFpbmluZyBhIHJlZmVyZW5jZSB0byB0aGUgZ2xvYmFsXG4gIC8vIG9iamVjdCwgdGhpcyBzZWVtcyB0byBiZSB0aGUgbW9zdCByZWxpYWJsZSB0ZWNobmlxdWUgdGhhdCBkb2VzIG5vdFxuICAvLyB1c2UgaW5kaXJlY3QgZXZhbCAod2hpY2ggdmlvbGF0ZXMgQ29udGVudCBTZWN1cml0eSBQb2xpY3kpLlxuICB0eXBlb2YgZ2xvYmFsID09PSBcIm9iamVjdFwiID8gZ2xvYmFsIDpcbiAgdHlwZW9mIHdpbmRvdyA9PT0gXCJvYmplY3RcIiA/IHdpbmRvdyA6XG4gIHR5cGVvZiBzZWxmID09PSBcIm9iamVjdFwiID8gc2VsZiA6IHRoaXNcbik7XG4iLCJcInVzZSBzdHJpY3RcIjtcbihmdW5jdGlvbiAoKSB7XG4gICAgY2xhc3MgRmF2b3JpdGVzIHtcblxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIGxldCByZWFkeSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlICE9IFwibG9hZGluZ1wiKSByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHJlc29sdmUoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlYWR5LnRoZW4odGhpcy5pbml0LmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5pdCgpIHtcbiAgICAgICAgICAgIHRoaXMuZmF2b3JpdGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmZhdm9yaXRlJyk7XG4gICAgICAgICAgICBpZiAodGhpcy5mYXZvcml0ZXMgPT09IG51bGwpIHJldHVybjtcblxuICAgICAgICAgICAgbGV0IHByb2R1Y3RzID0gdGhpcy5mYXZvcml0ZXMucXVlcnlTZWxlY3RvckFsbCgnLnByb2R1Y3QnKTtcbiAgICAgICAgICAgIHRoaXMuY291bnQgPSBwcm9kdWN0cy5sZW5ndGg7XG4gICAgICAgICAgICBpZiAodGhpcy5jb3VudCA9PSAwKXtcbiAgICAgICAgICAgICAgICB0aGlzLmZhdm9yaXRlcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuZmF2b3JpdGVzKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5jb3VudDtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5mYXZvcml0ZXM7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25zID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnY3NzdHJhbnNpdGlvbnMnKTtcbiAgICAgICAgICAgIHRoaXMudHJhbnNmb3JtcyA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2Nzc3RyYW5zZm9ybXMnKTtcblxuICAgICAgICAgICAgdGhpcy53cmFwcGVyID0gdGhpcy5mYXZvcml0ZXMucXVlcnlTZWxlY3RvcignLmZhdm9yaXRlX193cmFwcGVyLWlubmVyJyk7XG5cbiAgICAgICAgICAgIHRoaXMubmV4dF9idXR0b24gPSB0aGlzLmZhdm9yaXRlcy5xdWVyeVNlbGVjdG9yKCcuZmF2b3JpdGVfX2J1dHRvbl9uZXh0Jyk7XG4gICAgICAgICAgICB0aGlzLnByZXZfYnV0dG9uID0gdGhpcy5mYXZvcml0ZXMucXVlcnlTZWxlY3RvcignLmZhdm9yaXRlX19idXR0b25fcHJldicpO1xuXG4gICAgICAgICAgICB0aGlzLm5leHRfYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5uZXh0LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5wcmV2X2J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucHJldi5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgdGhpcy5tYXJnaW4gPSAyMDtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgICAgICAgICB0aGlzLndpZHRoID0gcHJvZHVjdHNbMF0ub2Zmc2V0V2lkdGggKyB0aGlzLm1hcmdpbjtcbiAgICAgICAgICAgIHRoaXMuaW5saW5lID0gTWF0aC5mbG9vcigodGhpcy53cmFwcGVyLm9mZnNldFdpZHRoK3RoaXMubWFyZ2luKS90aGlzLndpZHRoKTtcblxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMudGltZXIgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHRoaXMudHJhbnNpdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBsZXQgdHJhbnNFbmRFdmVudE5hbWVzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdPVHJhbnNpdGlvbic6ICdvVHJhbnNpdGlvbkVuZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnbXNUcmFuc2l0aW9uJzogJ01TVHJhbnNpdGlvbkVuZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJ1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRoaXMud3JhcHBlci5hZGRFdmVudExpc3RlbmVyKHRyYW5zRW5kRXZlbnROYW1lc1tNb2Rlcm5penIucHJlZml4ZWQoJ3RyYW5zaXRpb24nKV0sIHRoaXMuc3RvcEFuaW1hdGlvbi5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLnJlc2l6ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0QW5pbWF0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0b3BBbmltYXRpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXIgIT0gbnVsbCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRyb3BBbmltYXRpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXIgIT0gbnVsbCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IHNldFRpbWVvdXQodGhpcy5zdG9wQW5pbWF0aW9uLmJpbmQodGhpcyksIDI1MCk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXh0IChldmVudCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50Kys7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50ID09IHRoaXMuY291bnQtdGhpcy5pbmxpbmUrMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNjcm9sbCgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0X2J1dHRvbi5ibHVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBwcmV2IChldmVudCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50LS07XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50ID09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gdGhpcy5jb3VudC10aGlzLmlubGluZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsKCk7XG4gICAgICAgICAgICB0aGlzLnByZXZfYnV0dG9uLmJsdXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc2l6ZSAoKSB7XG4gICAgICAgICAgICB0aGlzLmlubGluZSA9IE1hdGguZmxvb3IoKHRoaXMud3JhcHBlci5vZmZzZXRXaWR0aCt0aGlzLm1hcmdpbikvdGhpcy53aWR0aCk7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2Nyb2xsICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRyYW5zZm9ybXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBwZXIuc3R5bGVbTW9kZXJuaXpyLnByZWZpeGVkKCd0cmFuc2Zvcm0nKV0gPSAndHJhbnNsYXRlWCgnICsgKC10aGlzLndpZHRoICogKHRoaXMuY3VycmVudCkpICsgJ3B4KSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMud3JhcHBlci5zdHlsZS5yaWdodCA9ICgtdGhpcy53aWR0aCAqICh0aGlzLmN1cnJlbnQpKSArICdweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmRyb3BBbmltYXRpb24oKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5ldyBGYXZvcml0ZXM7XG5cbn0pKClcbiIsIlwidXNlIHN0cmljdFwiO1xuKGZ1bmN0aW9uICgpIHtcbiAgICBjbGFzcyBOYXZpZ2F0aW9uIHtcblxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIGxldCByZWFkeSA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlICE9IFwibG9hZGluZ1wiKSByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHJlc29sdmUoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlYWR5LnRoZW4odGhpcy5pbml0LmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5pdCAoKSB7XG4gICAgICAgICAgICB0aGlzLm5hdmlnYXRpb24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmF2aWdhdGlvbicpO1xuICAgICAgICAgICAgaWYgKHRoaXMubmF2aWdhdGlvbiA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBsZXQgbGFiZWxzID0gdGhpcy5uYXZpZ2F0aW9uLnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYXZpZ2F0aW9uX19sYWJlbCcpO1xuICAgICAgICAgICAgW10uZm9yRWFjaC5jYWxsKGxhYmVscywgbGFiZWwgPT4ge1xuICAgICAgICAgICAgICAgIGxhYmVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5vcGVuRHJvcGRvd24uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy50b2dnbGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubmF2aWdhdGlvbl9fdG9nZ2xlJyk7XG4gICAgICAgICAgICB0aGlzLnRvZ2dsZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMudG9nZ2xlTmF2aWdhdGlvbi5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRvZ2dsZU5hdmlnYXRpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5uYXZpZ2F0aW9uLmNsYXNzTGlzdC50b2dnbGUoJ25hdmlnYXRpb25fb3BlbicpO1xuICAgICAgICAgICAgdGhpcy50b2dnbGUuYmx1cigpO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QudG9nZ2xlKCduYXZpZ2F0aW9uX29wZW4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wZW5Ecm9wZG93biAoZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LmN1cnJlbnRUYXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgnbmF2aWdhdGlvbl9fbGFiZWxfb3BlbicpO1xuICAgICAgICAgICAgZXZlbnQuY3VycmVudFRhcmdldC5uZXh0RWxlbWVudFNpYmxpbmcuY2xhc3NMaXN0LnRvZ2dsZSgnbmF2aWdhdGlvbl9fY29udGFpbmVyX29wZW4nKTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgbmV3IE5hdmlnYXRpb247XG59KSgpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4oZnVuY3Rpb24oKSB7XG4gICAgLyoqXG4gICAgICogQGNsYXNzIENsYXNzIGhhbmRsZSBzdWJzY3JpcHRpb24gcHJvY2Vzc1xuICAgICAqL1xuICAgIGNsYXNzIFN1YnNjcmliZSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gU3RhcnQgaW5pdGlhbGl6YXRpb24gb24gZG9tbG9hZFxuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgbGV0IHJlYWR5ID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlICE9IFwibG9hZGluZ1wiKSByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHJlc29sdmUoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlYWR5LnRoZW4odGhpcy5pbml0LmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXNjcmlwdGlvbiBBZGRpbmcgZXZlbnRzIGFuZCBwcm9wZXJ0aWVzXG4gICAgICAgICAqL1xuICAgICAgICBpbml0KCkge1xuICAgICAgICAgICAgdGhpcy5mb3JtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnN1YnNjcmliZScpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZm9ybSA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgICAgICAgICB0aGlzLmlucHV0ID0gdGhpcy5mb3JtLnF1ZXJ5U2VsZWN0b3IoJy5zdWJzY3JpYmVfX2VtYWlsJyk7XG4gICAgICAgICAgICB0aGlzLnN1Y2Nlc3NfbWVzc2FnZSA9IHRoaXMuZm9ybS5xdWVyeVNlbGVjdG9yKCcuc3Vic2NyaWJlX19zdGF0ZV9zdWNjZXNzJyk7XG4gICAgICAgICAgICB0aGlzLnN1Y2Nlc3NfZmFpbCA9IHRoaXMuZm9ybS5xdWVyeVNlbGVjdG9yKCcuc3Vic2NyaWJlX19zdGF0ZV9mYWlsJyk7XG4gICAgICAgICAgICB0aGlzLnN1Y2Nlc3NfcHJvZ3Jlc3MgPSB0aGlzLmZvcm0ucXVlcnlTZWxlY3RvcignLnN1YnNjcmliZV9fc3RhdGVfaW4tcHJvZ3Jlc3MnKTtcblxuICAgICAgICAgICAgdGhpcy5mb3JtLnNldEF0dHJpYnV0ZSgnbm92YWxpZGF0ZScsIHRydWUpO1xuICAgICAgICAgICAgdGhpcy5mb3JtLmFkZEV2ZW50TGlzdGVuZXIoJ3N1Ym1pdCcsIHRoaXMudmFsaWRhdGVGb3JtLmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXNjcmlwdGlvbiBWYWxpZGF0aW5nIHVzZXIgaW5wdXRcbiAgICAgICAgICovXG4gICAgICAgIHZhbGlkYXRlRm9ybShldmVudCkge1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgbGV0IGVtYWlsX3JlZ2V4ID0gbmV3IFJlZ0V4cChcIl4oW2EtekEtWjAtOV9cXC5cXC1dKStcXEAoKFthLXpBLVowLTlcXC1dKStcXC4pKyhbYS16QS1aMC05XXsyLDR9KSskXCIpO1xuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICAgICh0aGlzLmlucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPiAwICYmIGVtYWlsX3JlZ2V4LnRlc3QodGhpcy5pbnB1dC52YWx1ZS50cmltKCkpID09PSBmYWxzZSB8fCB0aGlzLmlucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPT09IDApXG4gICAgICAgICAgICAgICAgfHwgKHRoaXMuaW5wdXQudmFsdWUudHJpbSgpLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICl7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSgnZmFpbCcpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IERPTkUgPSA0XG4gICAgICAgICAgICAgICAgLCBPSyA9IDIwMFxuICAgICAgICAgICAgICAgICwgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICAgICAgICAgICAgICAsIHNlbmRlciA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5vcGVuKCdQT1NUJywgdGhpcy5mb3JtLmdldEF0dHJpYnV0ZSgnYWN0aW9uJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgeGhyLnNlbmQobmV3IEZvcm1EYXRhKHRoaXMuZm9ybSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IERPTkUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JtLnJlc2V0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IE9LKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHhoci5zdGF0dXNUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoeGhyLmNvZGUgKyAnOiAnICsgeGhyLnN0YXR1c1RleHQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoJ3Byb2dyZXNzJyk7XG4gICAgICAgICAgICBzZW5kZXIudGhlbih0aGlzLnN1Y2Nlc3MuYmluZCh0aGlzKSkuY2F0Y2godGhpcy5mYWlsLmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXNjcmlwdGlvbiByZXF1ZXN0IGhhdmUgc3VjY2VlZGVkXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBtZXNzYWdlIHNlcnZlciBhbnN3ZXJcbiAgICAgICAgICovXG4gICAgICAgIHN1Y2Nlc3MgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoJ3N1Y2Nlc3MnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gcmVxdWVzdCBoYXZlIGZhaWxlZFxuICAgICAgICAgKiBAcGFyYW0ge0Vycm9yfSBlcnJvciBlcnJvciBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIGZhaWwgKGVycm9yKSB7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKCdmYWlsJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIFNldCBzdWJzY3JpcHRpb24gc3RhdGVcbiAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHN0YXRlIG5ldyBzdGF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgc2V0U3RhdGUgKHN0YXRlKSB7XG5cbiAgICAgICAgICAgIGxldCBmYWlsID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgc3VjY2VzcyA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIHByb2dyZXNzID0gZmFsc2U7XG5cbiAgICAgICAgICAgIHN3aXRjaCAoc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiZmFpbFwiOlxuICAgICAgICAgICAgICAgICAgICBmYWlsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dC5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwic3VjY2Vzc1wiOlxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbnB1dC5ibHVyKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJwcm9ncmVzc1wiOlxuICAgICAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmZvcm0uY2xhc3NMaXN0LnRvZ2dsZSgnc3Vic2NyaWJlX2ZhaWwnLCBmYWlsKTtcbiAgICAgICAgICAgIHRoaXMuZm9ybS5jbGFzc0xpc3QudG9nZ2xlKCdzdWJzY3JpYmVfc3VjY2VzcycsIHN1Y2Nlc3MpO1xuICAgICAgICAgICAgdGhpcy5mb3JtLmNsYXNzTGlzdC50b2dnbGUoJ3N1YnNjcmliZV9wcm9ncmVzcycsIHByb2dyZXNzKTtcbiAgICAgICAgfVxuXG4gICAgfVxuICAgIG5ldyBTdWJzY3JpYmU7XG59KSgpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4oZnVuY3Rpb24oKSB7XG4gICAgLyoqXG4gICAgICogQGNsYXNzIENsYXNzIGhhbmRsZSB0YWJzIGxvYWRpbmdcbiAgICAgKi9cbiAgICBjbGFzcyBUYWJzIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXNjcmlwdGlvbiBTdGFydCBpbml0aWFsaXphdGlvbiBvbiBkb21sb2FkXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKi9cbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICBsZXQgcmVhZHkgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgIT0gXCJsb2FkaW5nXCIpIHJldHVybiByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgKCkgPT4gcmVzb2x2ZSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVhZHkudGhlbih0aGlzLmluaXQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIEFkZGluZyBldmVudHMgYW5kIHByb3BlcnRpZXNcbiAgICAgICAgICovXG4gICAgICAgIGluaXQoKSB7XG4gICAgICAgICAgICB0aGlzLndpZGdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50YWJzJyk7XG4gICAgICAgICAgICBpZiAodGhpcy53aWRnZXQgPT09IG51bGwpIHJldHVybjtcblxuICAgICAgICAgICAgbGV0IERPTkUgPSA0XG4gICAgICAgICAgICAgICAgLCBPSyA9IDIwMFxuICAgICAgICAgICAgICAgICwgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICAgICAgICAgICAgICAsIHNlbmRlciA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5vcGVuKCdHRVQnLCB0aGlzLndpZGdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdXJsJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSBET05FKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoeGhyLnN0YXR1cyA9PT0gT0spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHhoci5zdGF0dXNUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcih4aHIuY29kZSArICc6ICcgKyB4aHIuc3RhdHVzVGV4dCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgc2VuZGVyLnRoZW4odGhpcy5idWlsZC5iaW5kKHRoaXMpKS5jYXRjaCh0aGlzLmZvb19idWlsZC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gRm9vIGJ1aWxkIHdpZGdldFxuICAgICAgICAgKi9cbiAgICAgICAgZm9vX2J1aWxkICgpIHtcbiAgICAgICAgICAgIHRoaXMuYnVpbGQoJ1t7XCJUaXRsZVwiOlwiV29tZW5cIixcIkNvbnRlbnRcIjpcIjExOjU0OjU1IExvcmVtIGlwc3VtIGRvbG9yIHNpdCBhbWV0LCBjb25zZWN0ZXR1ciBhZGlwaXNjaW5nIGVsaXQuIE1hdXJpcyBzZW0gbGlndWxhLCBsdWN0dXMgZXQgYWxpcXVldCBlZ2V0LCB1bHRyaWNlcyBldSBzZW0uIEZ1c2NlIGVuaW0gbGFjdXMsIHNvZGFsZXMgdmVsIHNvbGxpY2l0dWRpbiB2aXRhZSwgcHJldGl1bSBub24gdXJuYS4gU3VzcGVuZGlzc2Ugc2NlbGVyaXNxdWUgbGlndWxhIGF0IG51bGxhIGdyYXZpZGEgZnJpbmdpbGxhLiBWaXZhbXVzIHNlZCBmZXJtZW50dW0gc2VtLiBBZW5lYW4gdm9sdXRwYXQgcG9ydGEgZHVpLCB2ZWwgdGVtcG9yIGRpYW0uIEN1cmFiaXR1ciBub24gY29udmFsbGlzIGRpYW0uIFV0IG1hdHRpcyBub24gYW50ZSBuZWMgcGhhcmV0cmEuIFByYWVzZW50IHB1bHZpbmFyIG1vbGxpcyB2ZWxpdCBzaXQgYW1ldCBhbGlxdWFtLiBNb3JiaSB2dWxwdXRhdGUgdGluY2lkdW50IHF1YW0gcXVpcyB2aXZlcnJhLiBGdXNjZSBiaWJlbmR1bSBwdWx2aW5hciB0dXJwaXMgZXUgdHJpc3RpcXVlLiBQcm9pbiBldCBzdXNjaXBpdCBzYXBpZW4uXFxuXFxuUGVsbGVudGVzcXVlIHRyaXN0aXF1ZSBhY2N1bXNhbiBkdWkuIERvbmVjIGV1IG1hdHRpcyBlbGl0LiBFdGlhbSBuaXNsIGZlbGlzLCBpbXBlcmRpZXQgdml0YWUgdGVtcG9yIHNlZCwgZGlnbmlzc2ltIGF0IGFyY3UuIEV0aWFtIGVsZWlmZW5kIHVybmEgdXQgbG9yZW0gY29uZGltZW50dW0gdWx0cmljaWVzLiBJbiB2aXZlcnJhIHF1aXMgbWV0dXMgdXQgaW1wZXJkaWV0LiBNb3JiaSBlbmltIG9kaW8sIGNvbmRpbWVudHVtIHV0IG5pYmggc2l0IGFtZXQsIGJsYW5kaXQgbW9sbGlzIHRlbGx1cy4gTnVsbGFtIHRpbmNpZHVudCBkaWFtIHB1cnVzLCBzZWQgcG9zdWVyZSBsYWN1cyBsb2JvcnRpcyBpZC4gTnVsbGFtIHZlc3RpYnVsdW0gbWF1cmlzIHF1aXMgbmlzbCBjb21tb2RvLCBxdWlzIHVsdHJpY2llcyB0b3J0b3IgYmxhbmRpdC4gTW9yYmkgaGVuZHJlcml0IHV0IGp1c3RvIGV0IHZlbmVuYXRpcy4gSW50ZWdlciBydXRydW0gbWFzc2EgdmVsIG1pIGVsZWlmZW5kIHJ1dHJ1bS4gVmVzdGlidWx1bSBhbnRlIGlwc3VtIHByaW1pcyBpbiBmYXVjaWJ1cyBvcmNpIGx1Y3R1cyBldCB1bHRyaWNlcyBwb3N1ZXJlIGN1YmlsaWEgQ3VyYWU7IFNlZCBtb2xlc3RpZSBjb25zZWN0ZXR1ciB2ZWxpdCB1dCB2aXZlcnJhLiBQaGFzZWxsdXMgdHVycGlzIG9kaW8sIHBvc3VlcmUgYSB0ZWxsdXMgZWdldCwgaW50ZXJkdW0gZGljdHVtIG51bGxhLiBEb25lYyBwb3J0YSBlc3QgbGFjaW5pYSBsb2JvcnRpcyBzYWdpdHRpcy4gVXQgdXQgaXBzdW0gdGVtcHVzLCBmZXJtZW50dW0gbGliZXJvIGV0LCB0aW5jaWR1bnQgYXJjdS4gTnVuYyBhIGRpYW0gdXJuYS4gUGhhc2VsbHVzIGxhY2luaWEsIGZlbGlzIGEgZmVybWVudHVtIGxhb3JlZXQsIGlwc3VtIHZlbGl0IGx1Y3R1cyBtaSwgcXVpcyBwb3J0dGl0b3IgbWV0dXMgZXJvcyB2aXRhZSBvcmNpLiBQaGFzZWxsdXMgZGFwaWJ1cyBudWxsYSB1bHRyaWNpZXMgYXJjdSBncmF2aWRhIG9ybmFyZS4gRHVpcyB2aXRhZSBwb3N1ZXJlIGVuaW0uIEluIHF1aXMgZmV1Z2lhdCBuaWJoLiBBbGlxdWFtIGRpY3R1bSB2ZWxpdCBzdXNjaXBpdCBsZW8gbG9ib3J0aXMgb3JuYXJlLiBGdXNjZSBwcmV0aXVtIHRlbGx1cyBzZWQgZmVsaXMgZmV1Z2lhdCByaG9uY3VzIGV1IGV0IG1hZ25hLiBBbGlxdWFtIGVyYXQgdm9sdXRwYXQuIFV0IGlwc3VtIGVuaW0sIG1vbGVzdGllIGlkIG1pIG5vbiwgbGFvcmVldCBwbGFjZXJhdCB0b3J0b3IuIERvbmVjIGNvbW1vZG8sIGlwc3VtIG5vbiBkaWduaXNzaW0gY29uZGltZW50dW0sIHRvcnRvciBvcmNpIHNhZ2l0dGlzIGVyb3MsIGF0IGhlbmRyZXJpdCBsaWd1bGEgZWxpdCBpbiBzYXBpZW4uXFxuXFxuSW50ZWdlciBhbGlxdWV0IHF1YW0gc2VtLCBlZ2V0IGFsaXF1ZXQgbnVsbGEgY29uc2VxdWF0IGF0LiBBZW5lYW4gY29tbW9kbyBhbnRlIG5vbiBzb2RhbGVzIHBvc3VlcmUuIENyYXMgY29tbW9kbyB0dXJwaXMgbmVjIHNvZGFsZXMgcGVsbGVudGVzcXVlLiBEb25lYyB0aW5jaWR1bnQgbWF1cmlzIGR1aSwgZXQgYWRpcGlzY2luZyB0b3J0b3IgZ3JhdmlkYSBhLiBFdGlhbSBlZ2V0IHVybmEgaW50ZXJkdW0gbWFzc2Egc3VzY2lwaXQgdmVzdGlidWx1bSBuZWMgYXQgYW50ZS4gQWVuZWFuIHBoYXJldHJhIHBsYWNlcmF0IGxvYm9ydGlzLiBOdWxsYW0gdGluY2lkdW50IGludGVyZHVtIGNvbmd1ZS4gVXQgbm9uIGVuaW0gbWkuIEluIHNpdCBhbWV0IGp1c3RvIHZlaGljdWxhLCBwb3N1ZXJlIGVuaW0gZXUsIGVnZXN0YXMgbGVvLiBNYWVjZW5hcyBibGFuZGl0IHVybmEgbnVuYywgZXQgZWxlbWVudHVtIGVzdCBldWlzbW9kIG5vbi4gSW4gaW1wZXJkaWV0IGRpYW0gbmVjIGFyY3UgY3Vyc3VzIHBvcnRhLiBNb3JiaSBjb25zZXF1YXQgZGlhbSBhdCBxdWFtIGNvbnZhbGxpcywgdmVsIHJ1dHJ1bSBudWxsYSBzY2VsZXJpc3F1ZS5cXG5cXG5Nb3JiaSBhbGlxdWFtIG9yY2kgcXVpcyBuaWJoIGVnZXN0YXMsIGluIHN1c2NpcGl0IGVyYXQgdm9sdXRwYXQuIERvbmVjIGF0IGFjY3Vtc2FuIGF1Z3VlLCBzZWQgZWxlbWVudHVtIGxpYmVyby4gRG9uZWMgaW4gZmVybWVudHVtIG1hdXJpcy4gVml2YW11cyB2ZXN0aWJ1bHVtLCBsaWd1bGEgZWdldCBtb2xlc3RpZSB2ZWhpY3VsYSwgcmlzdXMgYW50ZSBmYXVjaWJ1cyBsaWJlcm8sIGV0IHBlbGxlbnRlc3F1ZSBpcHN1bSB0dXJwaXMgc29sbGljaXR1ZGluIGVyYXQuIE51bGxhIGZhY2lsaXNpLiBWaXZhbXVzIHF1aXMgcG9ydGEgZXJhdC4gUGVsbGVudGVzcXVlIHZpdGFlIHJ1dHJ1bSB0dXJwaXMuIFBlbGxlbnRlc3F1ZSBoYWJpdGFudCBtb3JiaSB0cmlzdGlxdWUgc2VuZWN0dXMgZXQgbmV0dXMgZXQgbWFsZXN1YWRhIGZhbWVzIGFjIHR1cnBpcyBlZ2VzdGFzLiBOdWxsYSBzaXQgYW1ldCBhbGlxdWV0IHNlbSwgdmVsIHZlbmVuYXRpcyBudWxsYS4gU3VzcGVuZGlzc2UgYWMgdG9ydG9yIGlhY3VsaXMsIGxvYm9ydGlzIHNhcGllbiBub24sIHNvZGFsZXMgdG9ydG9yLiBTdXNwZW5kaXNzZSBpcHN1bSBhcmN1LCBsb2JvcnRpcyBhYyBwbGFjZXJhdCBxdWlzLCB2YXJpdXMgbmVjIHF1YW0uIFF1aXNxdWUgdmVoaWN1bGEgbWkgdXQgZGlhbSB1bGxhbWNvcnBlciBibGFuZGl0LlwifSx7XCJUaXRsZVwiOlwiTWVuXCIsXCJDb250ZW50XCI6XCIyMDE1MTExMiBMb3JlbSBpcHN1bSBkb2xvciBzaXQgYW1ldCwgY29uc2VjdGV0dXIgYWRpcGlzY2luZyBlbGl0LiBNYXVyaXMgc2VtIGxpZ3VsYSwgbHVjdHVzIGV0IGFsaXF1ZXQgZWdldCwgdWx0cmljZXMgZXUgc2VtLiBGdXNjZSBlbmltIGxhY3VzLCBzb2RhbGVzIHZlbCBzb2xsaWNpdHVkaW4gdml0YWUsIHByZXRpdW0gbm9uIHVybmEuIFN1c3BlbmRpc3NlIHNjZWxlcmlzcXVlIGxpZ3VsYSBhdCBudWxsYSBncmF2aWRhIGZyaW5naWxsYS4gVml2YW11cyBzZWQgZmVybWVudHVtIHNlbS4gQWVuZWFuIHZvbHV0cGF0IHBvcnRhIGR1aSwgdmVsIHRlbXBvciBkaWFtLiBDdXJhYml0dXIgbm9uIGNvbnZhbGxpcyBkaWFtLiBVdCBtYXR0aXMgbm9uIGFudGUgbmVjIHBoYXJldHJhLiBQcmFlc2VudCBwdWx2aW5hciBtb2xsaXMgdmVsaXQgc2l0IGFtZXQgYWxpcXVhbS4gTW9yYmkgdnVscHV0YXRlIHRpbmNpZHVudCBxdWFtIHF1aXMgdml2ZXJyYS4gRnVzY2UgYmliZW5kdW0gcHVsdmluYXIgdHVycGlzIGV1IHRyaXN0aXF1ZS4gUHJvaW4gZXQgc3VzY2lwaXQgc2FwaWVuLlxcblxcblBlbGxlbnRlc3F1ZSB0cmlzdGlxdWUgYWNjdW1zYW4gZHVpLiBEb25lYyBldSBtYXR0aXMgZWxpdC4gRXRpYW0gbmlzbCBmZWxpcywgaW1wZXJkaWV0IHZpdGFlIHRlbXBvciBzZWQsIGRpZ25pc3NpbSBhdCBhcmN1LiBFdGlhbSBlbGVpZmVuZCB1cm5hIHV0IGxvcmVtIGNvbmRpbWVudHVtIHVsdHJpY2llcy4gSW4gdml2ZXJyYSBxdWlzIG1ldHVzIHV0IGltcGVyZGlldC4gTW9yYmkgZW5pbSBvZGlvLCBjb25kaW1lbnR1bSB1dCBuaWJoIHNpdCBhbWV0LCBibGFuZGl0IG1vbGxpcyB0ZWxsdXMuIE51bGxhbSB0aW5jaWR1bnQgZGlhbSBwdXJ1cywgc2VkIHBvc3VlcmUgbGFjdXMgbG9ib3J0aXMgaWQuIE51bGxhbSB2ZXN0aWJ1bHVtIG1hdXJpcyBxdWlzIG5pc2wgY29tbW9kbywgcXVpcyB1bHRyaWNpZXMgdG9ydG9yIGJsYW5kaXQuIE1vcmJpIGhlbmRyZXJpdCB1dCBqdXN0byBldCB2ZW5lbmF0aXMuIEludGVnZXIgcnV0cnVtIG1hc3NhIHZlbCBtaSBlbGVpZmVuZCBydXRydW0uIFZlc3RpYnVsdW0gYW50ZSBpcHN1bSBwcmltaXMgaW4gZmF1Y2lidXMgb3JjaSBsdWN0dXMgZXQgdWx0cmljZXMgcG9zdWVyZSBjdWJpbGlhIEN1cmFlOyBTZWQgbW9sZXN0aWUgY29uc2VjdGV0dXIgdmVsaXQgdXQgdml2ZXJyYS4gUGhhc2VsbHVzIHR1cnBpcyBvZGlvLCBwb3N1ZXJlIGEgdGVsbHVzIGVnZXQsIGludGVyZHVtIGRpY3R1bSBudWxsYS4gRG9uZWMgcG9ydGEgZXN0IGxhY2luaWEgbG9ib3J0aXMgc2FnaXR0aXMuIFV0IHV0IGlwc3VtIHRlbXB1cywgZmVybWVudHVtIGxpYmVybyBldCwgdGluY2lkdW50IGFyY3UuIE51bmMgYSBkaWFtIHVybmEuIFBoYXNlbGx1cyBsYWNpbmlhLCBmZWxpcyBhIGZlcm1lbnR1bSBsYW9yZWV0LCBpcHN1bSB2ZWxpdCBsdWN0dXMgbWksIHF1aXMgcG9ydHRpdG9yIG1ldHVzIGVyb3Mgdml0YWUgb3JjaS4gUGhhc2VsbHVzIGRhcGlidXMgbnVsbGEgdWx0cmljaWVzIGFyY3UgZ3JhdmlkYSBvcm5hcmUuIER1aXMgdml0YWUgcG9zdWVyZSBlbmltLiBJbiBxdWlzIGZldWdpYXQgbmliaC4gQWxpcXVhbSBkaWN0dW0gdmVsaXQgc3VzY2lwaXQgbGVvIGxvYm9ydGlzIG9ybmFyZS4gRnVzY2UgcHJldGl1bSB0ZWxsdXMgc2VkIGZlbGlzIGZldWdpYXQgcmhvbmN1cyBldSBldCBtYWduYS4gQWxpcXVhbSBlcmF0IHZvbHV0cGF0LiBVdCBpcHN1bSBlbmltLCBtb2xlc3RpZSBpZCBtaSBub24sIGxhb3JlZXQgcGxhY2VyYXQgdG9ydG9yLiBEb25lYyBjb21tb2RvLCBpcHN1bSBub24gZGlnbmlzc2ltIGNvbmRpbWVudHVtLCB0b3J0b3Igb3JjaSBzYWdpdHRpcyBlcm9zLCBhdCBoZW5kcmVyaXQgbGlndWxhIGVsaXQgaW4gc2FwaWVuLlxcblxcbkludGVnZXIgYWxpcXVldCBxdWFtIHNlbSwgZWdldCBhbGlxdWV0IG51bGxhIGNvbnNlcXVhdCBhdC4gQWVuZWFuIGNvbW1vZG8gYW50ZSBub24gc29kYWxlcyBwb3N1ZXJlLiBDcmFzIGNvbW1vZG8gdHVycGlzIG5lYyBzb2RhbGVzIHBlbGxlbnRlc3F1ZS4gRG9uZWMgdGluY2lkdW50IG1hdXJpcyBkdWksIGV0IGFkaXBpc2NpbmcgdG9ydG9yIGdyYXZpZGEgYS4gRXRpYW0gZWdldCB1cm5hIGludGVyZHVtIG1hc3NhIHN1c2NpcGl0IHZlc3RpYnVsdW0gbmVjIGF0IGFudGUuIEFlbmVhbiBwaGFyZXRyYSBwbGFjZXJhdCBsb2JvcnRpcy4gTnVsbGFtIHRpbmNpZHVudCBpbnRlcmR1bSBjb25ndWUuIFV0IG5vbiBlbmltIG1pLiBJbiBzaXQgYW1ldCBqdXN0byB2ZWhpY3VsYSwgcG9zdWVyZSBlbmltIGV1LCBlZ2VzdGFzIGxlby4gTWFlY2VuYXMgYmxhbmRpdCB1cm5hIG51bmMsIGV0IGVsZW1lbnR1bSBlc3QgZXVpc21vZCBub24uIEluIGltcGVyZGlldCBkaWFtIG5lYyBhcmN1IGN1cnN1cyBwb3J0YS4gTW9yYmkgY29uc2VxdWF0IGRpYW0gYXQgcXVhbSBjb252YWxsaXMsIHZlbCBydXRydW0gbnVsbGEgc2NlbGVyaXNxdWUuXFxuXFxuTW9yYmkgYWxpcXVhbSBvcmNpIHF1aXMgbmliaCBlZ2VzdGFzLCBpbiBzdXNjaXBpdCBlcmF0IHZvbHV0cGF0LiBEb25lYyBhdCBhY2N1bXNhbiBhdWd1ZSwgc2VkIGVsZW1lbnR1bSBsaWJlcm8uIERvbmVjIGluIGZlcm1lbnR1bSBtYXVyaXMuIFZpdmFtdXMgdmVzdGlidWx1bSwgbGlndWxhIGVnZXQgbW9sZXN0aWUgdmVoaWN1bGEsIHJpc3VzIGFudGUgZmF1Y2lidXMgbGliZXJvLCBldCBwZWxsZW50ZXNxdWUgaXBzdW0gdHVycGlzIHNvbGxpY2l0dWRpbiBlcmF0LiBOdWxsYSBmYWNpbGlzaS4gVml2YW11cyBxdWlzIHBvcnRhIGVyYXQuIFBlbGxlbnRlc3F1ZSB2aXRhZSBydXRydW0gdHVycGlzLiBQZWxsZW50ZXNxdWUgaGFiaXRhbnQgbW9yYmkgdHJpc3RpcXVlIHNlbmVjdHVzIGV0IG5ldHVzIGV0IG1hbGVzdWFkYSBmYW1lcyBhYyB0dXJwaXMgZWdlc3Rhcy4gTnVsbGEgc2l0IGFtZXQgYWxpcXVldCBzZW0sIHZlbCB2ZW5lbmF0aXMgbnVsbGEuIFN1c3BlbmRpc3NlIGFjIHRvcnRvciBpYWN1bGlzLCBsb2JvcnRpcyBzYXBpZW4gbm9uLCBzb2RhbGVzIHRvcnRvci4gU3VzcGVuZGlzc2UgaXBzdW0gYXJjdSwgbG9ib3J0aXMgYWMgcGxhY2VyYXQgcXVpcywgdmFyaXVzIG5lYyBxdWFtLiBRdWlzcXVlIHZlaGljdWxhIG1pIHV0IGRpYW0gdWxsYW1jb3JwZXIgYmxhbmRpdC5cIn0se1wiVGl0bGVcIjpcIkp1bmlvclwiLFwiQ29udGVudFwiOlwiTm92ZW1iZXIgMTIsIDIwMTUsIDExOjU0IGFtIExvcmVtIGlwc3VtIGRvbG9yIHNpdCBhbWV0LCBjb25zZWN0ZXR1ciBhZGlwaXNjaW5nIGVsaXQuIE1hdXJpcyBzZW0gbGlndWxhLCBsdWN0dXMgZXQgYWxpcXVldCBlZ2V0LCB1bHRyaWNlcyBldSBzZW0uIEZ1c2NlIGVuaW0gbGFjdXMsIHNvZGFsZXMgdmVsIHNvbGxpY2l0dWRpbiB2aXRhZSwgcHJldGl1bSBub24gdXJuYS4gU3VzcGVuZGlzc2Ugc2NlbGVyaXNxdWUgbGlndWxhIGF0IG51bGxhIGdyYXZpZGEgZnJpbmdpbGxhLiBWaXZhbXVzIHNlZCBmZXJtZW50dW0gc2VtLiBBZW5lYW4gdm9sdXRwYXQgcG9ydGEgZHVpLCB2ZWwgdGVtcG9yIGRpYW0uIEN1cmFiaXR1ciBub24gY29udmFsbGlzIGRpYW0uIFV0IG1hdHRpcyBub24gYW50ZSBuZWMgcGhhcmV0cmEuIFByYWVzZW50IHB1bHZpbmFyIG1vbGxpcyB2ZWxpdCBzaXQgYW1ldCBhbGlxdWFtLiBNb3JiaSB2dWxwdXRhdGUgdGluY2lkdW50IHF1YW0gcXVpcyB2aXZlcnJhLiBGdXNjZSBiaWJlbmR1bSBwdWx2aW5hciB0dXJwaXMgZXUgdHJpc3RpcXVlLiBQcm9pbiBldCBzdXNjaXBpdCBzYXBpZW4uXFxuXFxuUGVsbGVudGVzcXVlIHRyaXN0aXF1ZSBhY2N1bXNhbiBkdWkuIERvbmVjIGV1IG1hdHRpcyBlbGl0LiBFdGlhbSBuaXNsIGZlbGlzLCBpbXBlcmRpZXQgdml0YWUgdGVtcG9yIHNlZCwgZGlnbmlzc2ltIGF0IGFyY3UuIEV0aWFtIGVsZWlmZW5kIHVybmEgdXQgbG9yZW0gY29uZGltZW50dW0gdWx0cmljaWVzLiBJbiB2aXZlcnJhIHF1aXMgbWV0dXMgdXQgaW1wZXJkaWV0LiBNb3JiaSBlbmltIG9kaW8sIGNvbmRpbWVudHVtIHV0IG5pYmggc2l0IGFtZXQsIGJsYW5kaXQgbW9sbGlzIHRlbGx1cy4gTnVsbGFtIHRpbmNpZHVudCBkaWFtIHB1cnVzLCBzZWQgcG9zdWVyZSBsYWN1cyBsb2JvcnRpcyBpZC4gTnVsbGFtIHZlc3RpYnVsdW0gbWF1cmlzIHF1aXMgbmlzbCBjb21tb2RvLCBxdWlzIHVsdHJpY2llcyB0b3J0b3IgYmxhbmRpdC4gTW9yYmkgaGVuZHJlcml0IHV0IGp1c3RvIGV0IHZlbmVuYXRpcy4gSW50ZWdlciBydXRydW0gbWFzc2EgdmVsIG1pIGVsZWlmZW5kIHJ1dHJ1bS4gVmVzdGlidWx1bSBhbnRlIGlwc3VtIHByaW1pcyBpbiBmYXVjaWJ1cyBvcmNpIGx1Y3R1cyBldCB1bHRyaWNlcyBwb3N1ZXJlIGN1YmlsaWEgQ3VyYWU7IFNlZCBtb2xlc3RpZSBjb25zZWN0ZXR1ciB2ZWxpdCB1dCB2aXZlcnJhLiBQaGFzZWxsdXMgdHVycGlzIG9kaW8sIHBvc3VlcmUgYSB0ZWxsdXMgZWdldCwgaW50ZXJkdW0gZGljdHVtIG51bGxhLiBEb25lYyBwb3J0YSBlc3QgbGFjaW5pYSBsb2JvcnRpcyBzYWdpdHRpcy4gVXQgdXQgaXBzdW0gdGVtcHVzLCBmZXJtZW50dW0gbGliZXJvIGV0LCB0aW5jaWR1bnQgYXJjdS4gTnVuYyBhIGRpYW0gdXJuYS4gUGhhc2VsbHVzIGxhY2luaWEsIGZlbGlzIGEgZmVybWVudHVtIGxhb3JlZXQsIGlwc3VtIHZlbGl0IGx1Y3R1cyBtaSwgcXVpcyBwb3J0dGl0b3IgbWV0dXMgZXJvcyB2aXRhZSBvcmNpLiBQaGFzZWxsdXMgZGFwaWJ1cyBudWxsYSB1bHRyaWNpZXMgYXJjdSBncmF2aWRhIG9ybmFyZS4gRHVpcyB2aXRhZSBwb3N1ZXJlIGVuaW0uIEluIHF1aXMgZmV1Z2lhdCBuaWJoLiBBbGlxdWFtIGRpY3R1bSB2ZWxpdCBzdXNjaXBpdCBsZW8gbG9ib3J0aXMgb3JuYXJlLiBGdXNjZSBwcmV0aXVtIHRlbGx1cyBzZWQgZmVsaXMgZmV1Z2lhdCByaG9uY3VzIGV1IGV0IG1hZ25hLiBBbGlxdWFtIGVyYXQgdm9sdXRwYXQuIFV0IGlwc3VtIGVuaW0sIG1vbGVzdGllIGlkIG1pIG5vbiwgbGFvcmVldCBwbGFjZXJhdCB0b3J0b3IuIERvbmVjIGNvbW1vZG8sIGlwc3VtIG5vbiBkaWduaXNzaW0gY29uZGltZW50dW0sIHRvcnRvciBvcmNpIHNhZ2l0dGlzIGVyb3MsIGF0IGhlbmRyZXJpdCBsaWd1bGEgZWxpdCBpbiBzYXBpZW4uXFxuXFxuSW50ZWdlciBhbGlxdWV0IHF1YW0gc2VtLCBlZ2V0IGFsaXF1ZXQgbnVsbGEgY29uc2VxdWF0IGF0LiBBZW5lYW4gY29tbW9kbyBhbnRlIG5vbiBzb2RhbGVzIHBvc3VlcmUuIENyYXMgY29tbW9kbyB0dXJwaXMgbmVjIHNvZGFsZXMgcGVsbGVudGVzcXVlLiBEb25lYyB0aW5jaWR1bnQgbWF1cmlzIGR1aSwgZXQgYWRpcGlzY2luZyB0b3J0b3IgZ3JhdmlkYSBhLiBFdGlhbSBlZ2V0IHVybmEgaW50ZXJkdW0gbWFzc2Egc3VzY2lwaXQgdmVzdGlidWx1bSBuZWMgYXQgYW50ZS4gQWVuZWFuIHBoYXJldHJhIHBsYWNlcmF0IGxvYm9ydGlzLiBOdWxsYW0gdGluY2lkdW50IGludGVyZHVtIGNvbmd1ZS4gVXQgbm9uIGVuaW0gbWkuIEluIHNpdCBhbWV0IGp1c3RvIHZlaGljdWxhLCBwb3N1ZXJlIGVuaW0gZXUsIGVnZXN0YXMgbGVvLiBNYWVjZW5hcyBibGFuZGl0IHVybmEgbnVuYywgZXQgZWxlbWVudHVtIGVzdCBldWlzbW9kIG5vbi4gSW4gaW1wZXJkaWV0IGRpYW0gbmVjIGFyY3UgY3Vyc3VzIHBvcnRhLiBNb3JiaSBjb25zZXF1YXQgZGlhbSBhdCBxdWFtIGNvbnZhbGxpcywgdmVsIHJ1dHJ1bSBudWxsYSBzY2VsZXJpc3F1ZS5cXG5cXG5Nb3JiaSBhbGlxdWFtIG9yY2kgcXVpcyBuaWJoIGVnZXN0YXMsIGluIHN1c2NpcGl0IGVyYXQgdm9sdXRwYXQuIERvbmVjIGF0IGFjY3Vtc2FuIGF1Z3VlLCBzZWQgZWxlbWVudHVtIGxpYmVyby4gRG9uZWMgaW4gZmVybWVudHVtIG1hdXJpcy4gVml2YW11cyB2ZXN0aWJ1bHVtLCBsaWd1bGEgZWdldCBtb2xlc3RpZSB2ZWhpY3VsYSwgcmlzdXMgYW50ZSBmYXVjaWJ1cyBsaWJlcm8sIGV0IHBlbGxlbnRlc3F1ZSBpcHN1bSB0dXJwaXMgc29sbGljaXR1ZGluIGVyYXQuIE51bGxhIGZhY2lsaXNpLiBWaXZhbXVzIHF1aXMgcG9ydGEgZXJhdC4gUGVsbGVudGVzcXVlIHZpdGFlIHJ1dHJ1bSB0dXJwaXMuIFBlbGxlbnRlc3F1ZSBoYWJpdGFudCBtb3JiaSB0cmlzdGlxdWUgc2VuZWN0dXMgZXQgbmV0dXMgZXQgbWFsZXN1YWRhIGZhbWVzIGFjIHR1cnBpcyBlZ2VzdGFzLiBOdWxsYSBzaXQgYW1ldCBhbGlxdWV0IHNlbSwgdmVsIHZlbmVuYXRpcyBudWxsYS4gU3VzcGVuZGlzc2UgYWMgdG9ydG9yIGlhY3VsaXMsIGxvYm9ydGlzIHNhcGllbiBub24sIHNvZGFsZXMgdG9ydG9yLiBTdXNwZW5kaXNzZSBpcHN1bSBhcmN1LCBsb2JvcnRpcyBhYyBwbGFjZXJhdCBxdWlzLCB2YXJpdXMgbmVjIHF1YW0uIFF1aXNxdWUgdmVoaWN1bGEgbWkgdXQgZGlhbSB1bGxhbWNvcnBlciBibGFuZGl0LlwifV0nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gQnVpbGQgd2lkZ2V0XG4gICAgICAgICAqL1xuICAgICAgICBidWlsZCAobWVzc2FnZSkge1xuICAgICAgICAgICAgbGV0IGRhdGEgPSBKU09OLnBhcnNlKG1lc3NhZ2UucmVwbGFjZSgvXFxuL2csIFwiXFxcXG5cIikucmVwbGFjZSgvXFxyL2csIFwiXFxcXHJcIikucmVwbGFjZSgvXFx0L2csIFwiXFxcXHRcIikucmVwbGFjZSgvXFxmL2csIFwiXFxcXGZcIikpO1xuXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfYnV0dG9uID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudF90YWIgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAoZGF0YS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMud2lkZ2V0LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy53aWRnZXQpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLndpZGdldDtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBtZW51ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnTUVOVScpO1xuICAgICAgICAgICAgbWVudS5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndG9vbGJhcicpO1xuICAgICAgICAgICAgbWVudS5jbGFzc0xpc3QuYWRkKCd0YWJzX19tZW51Jyk7XG4gICAgICAgICAgICB0aGlzLndpZGdldC5hcHBlbmRDaGlsZChtZW51KTtcblxuICAgICAgICAgICAgZm9yIChsZXQgdGFiIG9mIGRhdGEpIHtcblxuICAgICAgICAgICAgICAgIGxldCBidXR0b24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdCVVRUT04nKVxuICAgICAgICAgICAgICAgICAgICAsIGNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ1NFQ1RJT04nKVxuICAgICAgICAgICAgICAgICAgICAsIHRleHQgPSB0YWIuQ29udGVudC5zcGxpdCgnXFxuXFxuJyk7XG5cbiAgICAgICAgICAgICAgICBidXR0b24uc2V0QXR0cmlidXRlKCd0eXBlJywgJ2J1dHRvbicpO1xuICAgICAgICAgICAgICAgIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0JywgdGFiLlRpdGxlKTtcbiAgICAgICAgICAgICAgICBidXR0b24uY2xhc3NMaXN0LmFkZCgndGFic19fYnV0dG9uJyk7XG4gICAgICAgICAgICAgICAgYnV0dG9uLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRhYi5UaXRsZSkpO1xuICAgICAgICAgICAgICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMub3BlblRhYi5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICBtZW51LmFwcGVuZENoaWxkKGJ1dHRvbik7XG5cbiAgICAgICAgICAgICAgICBjb250YWluZXIuc2V0QXR0cmlidXRlKCdkYXRhLXRhYicsIHRhYi5UaXRsZSk7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3RhYnNfX3RhYicpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgcGFyYWdyYXBoIG9mIHRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdQJyk7XG4gICAgICAgICAgICAgICAgICAgIHAuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGFyYWdyYXBoKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChwKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLndpZGdldC5hcHBlbmRDaGlsZChjb250YWluZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtZW51LnF1ZXJ5U2VsZWN0b3IoJ2J1dHRvbicpLmNsaWNrKCk7XG4gICAgICAgICAgICB0aGlzLndpZGdldC5jbGFzc0xpc3QuYWRkKCd0YWJzX2J1aWxkZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wZW5UYWIgKGV2ZW50KSB7XG4gICAgICAgICAgICBsZXQgYnV0dG9uID0gZXZlbnQuY3VycmVudFRhcmdldFxuICAgICAgICAgICAgICAgICwgdGFyZ2V0ID0gYnV0dG9uLmdldEF0dHJpYnV0ZSgnZGF0YS10YXJnZXQnKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF90YWIgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF90YWIuY2xhc3NMaXN0LnRvZ2dsZSgndGFic19fdGFiX2N1cnJlbnQnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfYnV0dG9uICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfYnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoJ3RhYnNfX2J1dHRvbl9jdXJyZW50JywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfYnV0dG9uID0gYnV0dG9uO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCd0YWJzX19idXR0b25fY3VycmVudCcsIHRydWUpO1xuXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfdGFiID0gdGhpcy53aWRnZXQucXVlcnlTZWxlY3RvcignW2RhdGEtdGFiPScgKyB0YXJnZXQgKyAnXScpO1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF90YWIgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudF90YWIuY2xhc3NMaXN0LnRvZ2dsZSgndGFic19fdGFiX2N1cnJlbnQnLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIG5ldyBUYWJzO1xufSkoKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuKGZ1bmN0aW9uICgpIHtcbiAgICBjbGFzcyBTY3JvbGxlciB7XG5cbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICBsZXQgcmVhZHkgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSAhPSBcImxvYWRpbmdcIikgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZWFkeS50aGVuKHRoaXMuaW5pdC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluaXQoKSB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNjcm9sbGVyJyk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbGVyID09PSBudWxsKSByZXR1cm47XG5cbiAgICAgICAgICAgIHRoaXMud3JhcHBlciA9IHRoaXMuc2Nyb2xsZXIucXVlcnlTZWxlY3RvcignLnNjcm9sbGVyX193cmFwcGVyLWlubmVyJyk7XG4gICAgICAgICAgICB0aGlzLnNsaWRlcyA9IHRoaXMud3JhcHBlci5xdWVyeVNlbGVjdG9yQWxsKCcuc2Nyb2xsZXJfX3NsaWRlJyk7XG4gICAgICAgICAgICB0aGlzLmNvdW50ID0gdGhpcy5zbGlkZXMubGVuZ3RoO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5jb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2Nyb2xsZXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLnNsaWRlcyk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMud3JhcHBlcjtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5zbGlkZXM7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2Nyb2xsZXI7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuY291bnQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25zID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnY3NzdHJhbnNpdGlvbnMnKTtcbiAgICAgICAgICAgIHRoaXMudHJhbnNmb3JtcyA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2Nzc3RyYW5zZm9ybXMnKTtcblxuICAgICAgICAgICAgdGhpcy5wYWdpbmF0b3IgPSB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoJy5zY3JvbGxlcl9fcGFnaW5hdG9yJyk7XG4gICAgICAgICAgICB0aGlzLnByZXZfYnV0dG9uID0gdGhpcy5zY3JvbGxlci5xdWVyeVNlbGVjdG9yKCcuc2Nyb2xsZXJfX3ByZXYnKTtcbiAgICAgICAgICAgIHRoaXMubmV4dF9idXR0b24gPSB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoJy5zY3JvbGxlcl9fbmV4dCcpO1xuXG4gICAgICAgICAgICB0aGlzLnByZXZfYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5vcGVuUHJldlNsaWRlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5uZXh0X2J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMub3Blbk5leHRTbGlkZS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgbGV0IGZpcnN0X3NsaWRlID0gdGhpcy5zbGlkZXNbMF0uY2xvbmVOb2RlKHRydWUpXG4gICAgICAgICAgICAgICAgLCBsYXN0X3NsaWRlID0gdGhpcy5zbGlkZXNbdGhpcy5jb3VudCAtIDFdLmNsb25lTm9kZSh0cnVlKTtcblxuICAgICAgICAgICAgZmlyc3Rfc2xpZGUuY2xhc3NMaXN0LmFkZCgnY2xvbmVkJyk7XG4gICAgICAgICAgICBsYXN0X3NsaWRlLmNsYXNzTGlzdC5hZGQoJ2Nsb25lZCcpO1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyLmFwcGVuZENoaWxkKGZpcnN0X3NsaWRlKTtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlci5pbnNlcnRCZWZvcmUobGFzdF9zbGlkZSwgdGhpcy5zbGlkZXNbMF0pO1xuXG4gICAgICAgICAgICBsZXQgaW5kZXggPSB0aGlzLmNvdW50O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4LS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUJ1dHRvbih0aGlzLmNvdW50IC0gaW5kZXggLSAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X3BhZ2UgPSAwO1xuICAgICAgICAgICAgdGhpcy5wYWdpbmF0b3JfYnV0dG9ucyA9IHRoaXMucGFnaW5hdG9yLnF1ZXJ5U2VsZWN0b3JBbGwoJy5zY3JvbGxlcl9fcGFnZScpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbiA9IHRoaXMucGFnaW5hdG9yX2J1dHRvbnNbMF07XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfYnV0dG9uLmNsYXNzTGlzdC5hZGQoJ3Njcm9sbGVyX19wYWdlX2N1cnJlbnQnKTtcblxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMudGFuc2l0aW9uX3RpbWVyID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKHRoaXMudHJhbnNpdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBsZXQgdHJhbnNFbmRFdmVudE5hbWVzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdPVHJhbnNpdGlvbic6ICdvVHJhbnNpdGlvbkVuZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnbXNUcmFuc2l0aW9uJzogJ01TVHJhbnNpdGlvbkVuZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJ1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHRoaXMud3JhcHBlci5hZGRFdmVudExpc3RlbmVyKHRyYW5zRW5kRXZlbnROYW1lc1tNb2Rlcm5penIucHJlZml4ZWQoJ3RyYW5zaXRpb24nKV0sIHRoaXMuY2hlY2tJbmRleC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5tb3ZlVG9GaXJzdCgpLmRlbGF5KCkudGhlbih0aGlzLnR1cm5Pbi5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLnJlc2l6ZWQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cblxuICAgICAgICBtb3ZlVG9DdXJyZW50KCkge1xuICAgICAgICAgICAgdGhpcy5tb3ZlKHRoaXMuY3VycmVudF9wYWdlKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgbW92ZVRvRmlyc3QoKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfcGFnZSA9IDA7XG4gICAgICAgICAgICB0aGlzLnJlcG9zU2xpZGUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgbW92ZVRvTGFzdCgpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudF9wYWdlID0gdGhpcy5jb3VudCAtIDE7XG4gICAgICAgICAgICB0aGlzLnJlcG9zU2xpZGUoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdHVybk9uKCkge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW01vZGVybml6ci5wcmVmaXhlZCgndHJhbnNpdGlvbicpXSA9IE1vZGVybml6ci5wcmVmaXhlZCgndHJhbnNmb3JtJykgKyAnIC4yNXMnO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cblxuICAgICAgICB0dXJuT2ZmKCkge1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyLnN0eWxlW01vZGVybml6ci5wcmVmaXhlZCgndHJhbnNpdGlvbicpXSA9ICdub25lJztcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgbW92ZShpbmRleCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudHJhbnNmb3Jtcykge1xuICAgICAgICAgICAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtNb2Rlcm5penIucHJlZml4ZWQoJ3RyYW5zZm9ybScpXSA9ICd0cmFuc2xhdGVYKCcgKyAoLXRoaXMud3JhcHBlci5vZmZzZXRXaWR0aCAqIChpbmRleCArIDEpKSArICdweCknO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLndyYXBwZXIuc3R5bGUucmlnaHQgPSAoLXRoaXMud3JhcHBlci5vZmZzZXRXaWR0aCAqIChpbmRleCArIDEpKSArICdweCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhc3luYyByZXNpemVkKCkge1xuICAgICAgICAgICAgdGhpcy50dXJuT2ZmKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRlbGF5KDI1KTtcbiAgICAgICAgICAgIHRoaXMubW92ZVRvQ3VycmVudCgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyNSk7XG4gICAgICAgICAgICB0aGlzLnR1cm5PbigpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgZGVsYXkobWlsbGlzZWNvbmRzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChyZXNvbHZlLCBtaWxsaXNlY29uZHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBhc3luYyBjaGVja0luZGV4KCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF9wYWdlID09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50dXJuT2ZmKCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyNSk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlVG9MYXN0KCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyNSk7XG4gICAgICAgICAgICAgICAgdGhpcy50dXJuT24oKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5jdXJyZW50X3BhZ2UgPT0gdGhpcy5jb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHVybk9mZigpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjUpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvRmlyc3QoKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRlbGF5KDI1KTtcbiAgICAgICAgICAgICAgICB0aGlzLnR1cm5PbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zdG9wQW5pbWF0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBzdG9wQW5pbWF0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0QW5pbWF0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZHJvcEFuaW1hdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKHRoaXMudGltZXIpICE9ICd1bmRlZmluZWQnKSBjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XG4gICAgICAgICAgICB0aGlzLnRpbWVyID0gc2V0VGltZW91dCh0aGlzLnN0b3BBbmltYXRpb24uYmluZCh0aGlzKSwgMzUwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNyZWF0ZUJ1dHRvbihpbmRleCkge1xuICAgICAgICAgICAgbGV0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0JVVFRPTicpLCBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnU1BBTicpO1xuICAgICAgICAgICAgYnV0dG9uLnNldEF0dHJpYnV0ZSgndHlwZScsICdidXR0b24nKTtcbiAgICAgICAgICAgIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGFnZScsIGluZGV4KTtcbiAgICAgICAgICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdzY3JvbGxlcl9fcGFnZScpO1xuICAgICAgICAgICAgYnV0dG9uLmFwcGVuZENoaWxkKHNwYW4pO1xuICAgICAgICAgICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5zY3JvbGxUb1NsaWRlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5wYWdpbmF0b3IuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wZW5TbGlkZSgpIHtcbiAgICAgICAgICAgIHRoaXMucmVwb3NTbGlkZSgpO1xuICAgICAgICAgICAgdGhpcy5kcm9wQW5pbWF0aW9uKCk7XG4gICAgICAgICAgICBpZighdGhpcy50cmFuc2l0aW9ucykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhbnNpdGlvbl90aW1lciE9bnVsbCkgY2xlYXJUaW1lb3V0KHRoaXMudGFuc2l0aW9uX3RpbWVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRhbnNpdGlvbl90aW1lciA9IHNldFRpbWVvdXQodGhpcy5jaGVja0luZGV4LmJpbmQodGhpcyksIDI1MCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBvcGVuUHJldlNsaWRlKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hbmltYXRpb24gPT09IHRydWUpIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRBbmltYXRpb24oKTtcblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X3BhZ2UtLTtcbiAgICAgICAgICAgIHRoaXMucHJldl9idXR0b24uYmx1cigpO1xuICAgICAgICAgICAgdGhpcy5vcGVuU2xpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wZW5OZXh0U2xpZGUoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFuaW1hdGlvbiA9PT0gdHJ1ZSkgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy5zdGFydEFuaW1hdGlvbigpO1xuXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfcGFnZSsrO1xuICAgICAgICAgICAgdGhpcy5uZXh0X2J1dHRvbi5ibHVyKCk7XG4gICAgICAgICAgICB0aGlzLm9wZW5TbGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2Nyb2xsVG9TbGlkZShldmVudCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uID09PSB0cnVlKSByZXR1cm47XG4gICAgICAgICAgICB0aGlzLnN0YXJ0QW5pbWF0aW9uKCk7XG5cbiAgICAgICAgICAgIGxldCBidXR0b24gPSBldmVudC5jdXJyZW50VGFyZ2V0O1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X3BhZ2UgPSBwYXJzZUludChidXR0b24uZ2V0QXR0cmlidXRlKCdkYXRhLXBhZ2UnKSwgMTApO1xuICAgICAgICAgICAgYnV0dG9uLmJsdXIoKTtcbiAgICAgICAgICAgIHRoaXMub3BlblNsaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXBvc1NsaWRlKCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCdzY3JvbGxlcl9fcGFnZV9jdXJyZW50JywgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbiA9IHRoaXMucGFnaW5hdG9yX2J1dHRvbnNbTWF0aC5taW4oTWF0aC5tYXgodGhpcy5jdXJyZW50X3BhZ2UsIDApLCB0aGlzLmNvdW50IC0gMSldO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCdzY3JvbGxlcl9fcGFnZV9jdXJyZW50JywgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLm1vdmUodGhpcy5jdXJyZW50X3BhZ2UpO1xuICAgICAgICB9XG5cbiAgICB9XG4gICAgbmV3IFNjcm9sbGVyO1xufSkoKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
