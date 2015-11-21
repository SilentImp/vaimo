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
                var transEndEventNames = {
                    'WebkitTransition': 'webkitTransitionEnd',
                    'MozTransition': 'transitionend',
                    'OTransition': 'oTransitionEnd',
                    'msTransition': 'MSTransitionEnd',
                    'transition': 'transitionend'
                };
                this.wrapper.addEventListener(transEndEventNames[Modernizr.prefixed('transition')], this.stopAnimation.bind(this));
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
                this.wrapper.style[Modernizr.prefixed('transform')] = 'translateX(' + -this.width * this.current + 'px)';
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
                var transEndEventNames = {
                    'WebkitTransition': 'webkitTransitionEnd',
                    'MozTransition': 'transitionend',
                    'OTransition': 'oTransitionEnd',
                    'msTransition': 'MSTransitionEnd',
                    'transition': 'transitionend'
                };
                this.wrapper.addEventListener(transEndEventNames[Modernizr.prefixed('transition')], this.checkIndex.bind(this));

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
                this.wrapper.style[Modernizr.prefixed('transform')] = 'translateX(' + -this.wrapper.offsetWidth * (index + 1) + 'px)';
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
                var ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(event) {
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

                return function checkIndex(_x2) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJ1bnRpbWUuanMiLCJmYXZvcml0ZS5qcyIsIm5hdmlnYXRpb24uanMiLCJzY3JvbGxlci5qcyIsInN1YnNjcmliZS5qcyIsInRhYnMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFVQSxDQUFDLENBQUMsVUFBUyxNQUFNLEVBQUU7QUFDakIsY0FBWSxDQUFDOztBQUViLE1BQUksTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDO0FBQzdDLE1BQUksU0FBUztBQUFDLEFBQ2QsTUFBSSxPQUFPLEdBQUcsT0FBTyxNQUFNLEtBQUssVUFBVSxHQUFHLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDekQsTUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLFFBQVEsSUFBSSxZQUFZLENBQUM7QUFDdEQsTUFBSSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsV0FBVyxJQUFJLGVBQWUsQ0FBQzs7QUFFL0QsTUFBSSxRQUFRLEdBQUcsUUFBTyxNQUFNLHlDQUFOLE1BQU0sT0FBSyxRQUFRLENBQUM7QUFDMUMsTUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLGtCQUFrQixDQUFDO0FBQ3hDLE1BQUksT0FBTyxFQUFFO0FBQ1gsUUFBSSxRQUFRLEVBQUU7OztBQUdaLFlBQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO0tBQzFCOzs7QUFBQSxBQUdELFdBQU87R0FDUjs7OztBQUFBLEFBSUQsU0FBTyxHQUFHLE1BQU0sQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7O0FBRXJFLFdBQVMsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRTs7QUFFakQsUUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sSUFBSSxTQUFTLENBQUEsQ0FBRSxTQUFTLENBQUMsQ0FBQztBQUNoRSxRQUFJLE9BQU8sR0FBRyxJQUFJLE9B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LEVBQUEsQ0FBQztDQUNaLENBQUEsRUFBRyxDQUFDIiwiZmlsZSI6InNjcmlwdHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBodHRwczovL3Jhdy5naXRodWIuY29tL2ZhY2Vib29rL3JlZ2VuZXJhdG9yL21hc3Rlci9MSUNFTlNFIGZpbGUuIEFuXG4gKiBhZGRpdGlvbmFsIGdyYW50IG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW5cbiAqIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG4hKGZ1bmN0aW9uKGdsb2JhbCkge1xuICBcInVzZSBzdHJpY3RcIjtcblxuICB2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgdmFyIHVuZGVmaW5lZDsgLy8gTW9yZSBjb21wcmVzc2libGUgdGhhbiB2b2lkIDAuXG4gIHZhciAkU3ltYm9sID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiID8gU3ltYm9sIDoge307XG4gIHZhciBpdGVyYXRvclN5bWJvbCA9ICRTeW1ib2wuaXRlcmF0b3IgfHwgXCJAQGl0ZXJhdG9yXCI7XG4gIHZhciB0b1N0cmluZ1RhZ1N5bWJvbCA9ICRTeW1ib2wudG9TdHJpbmdUYWcgfHwgXCJAQHRvU3RyaW5nVGFnXCI7XG5cbiAgdmFyIGluTW9kdWxlID0gdHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIjtcbiAgdmFyIHJ1bnRpbWUgPSBnbG9iYWwucmVnZW5lcmF0b3JSdW50aW1lO1xuICBpZiAocnVudGltZSkge1xuICAgIGlmIChpbk1vZHVsZSkge1xuICAgICAgLy8gSWYgcmVnZW5lcmF0b3JSdW50aW1lIGlzIGRlZmluZWQgZ2xvYmFsbHkgYW5kIHdlJ3JlIGluIGEgbW9kdWxlLFxuICAgICAgLy8gbWFrZSB0aGUgZXhwb3J0cyBvYmplY3QgaWRlbnRpY2FsIHRvIHJlZ2VuZXJhdG9yUnVudGltZS5cbiAgICAgIG1vZHVsZS5leHBvcnRzID0gcnVudGltZTtcbiAgICB9XG4gICAgLy8gRG9uJ3QgYm90aGVyIGV2YWx1YXRpbmcgdGhlIHJlc3Qgb2YgdGhpcyBmaWxlIGlmIHRoZSBydW50aW1lIHdhc1xuICAgIC8vIGFscmVhZHkgZGVmaW5lZCBnbG9iYWxseS5cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBEZWZpbmUgdGhlIHJ1bnRpbWUgZ2xvYmFsbHkgKGFzIGV4cGVjdGVkIGJ5IGdlbmVyYXRlZCBjb2RlKSBhcyBlaXRoZXJcbiAgLy8gbW9kdWxlLmV4cG9ydHMgKGlmIHdlJ3JlIGluIGEgbW9kdWxlKSBvciBhIG5ldywgZW1wdHkgb2JqZWN0LlxuICBydW50aW1lID0gZ2xvYmFsLnJlZ2VuZXJhdG9yUnVudGltZSA9IGluTW9kdWxlID8gbW9kdWxlLmV4cG9ydHMgOiB7fTtcblxuICBmdW5jdGlvbiB3cmFwKGlubmVyRm4sIG91dGVyRm4sIHNlbGYsIHRyeUxvY3NMaXN0KSB7XG4gICAgLy8gSWYgb3V0ZXJGbiBwcm92aWRlZCwgdGhlbiBvdXRlckZuLnByb3RvdHlwZSBpbnN0YW5jZW9mIEdlbmVyYXRvci5cbiAgICB2YXIgZ2VuZXJhdG9yID0gT2JqZWN0LmNyZWF0ZSgob3V0ZXJGbiB8fCBHZW5lcmF0b3IpLnByb3RvdHlwZSk7XG4gICAgdmFyIGNvbnRleHQgPSBuZXcgQ29udGV4dCh0cnlMb2NzTGlzdCB8fCBbXSk7XG5cbiAgICAvLyBUaGUgLl9pbnZva2UgbWV0aG9kIHVuaWZpZXMgdGhlIGltcGxlbWVudGF0aW9ucyBvZiB0aGUgLm5leHQsXG4gICAgLy8gLnRocm93LCBhbmQgLnJldHVybiBtZXRob2RzLlxuICAgIGdlbmVyYXRvci5faW52b2tlID0gbWFrZUludm9rZU1ldGhvZChpbm5lckZuLCBzZWxmLCBjb250ZXh0KTtcblxuICAgIHJldHVybiBnZW5lcmF0b3I7XG4gIH1cbiAgcnVudGltZS53cmFwID0gd3JhcDtcblxuICAvLyBUcnkvY2F0Y2ggaGVscGVyIHRvIG1pbmltaXplIGRlb3B0aW1pemF0aW9ucy4gUmV0dXJucyBhIGNvbXBsZXRpb25cbiAgLy8gcmVjb3JkIGxpa2UgY29udGV4dC50cnlFbnRyaWVzW2ldLmNvbXBsZXRpb24uIFRoaXMgaW50ZXJmYWNlIGNvdWxkXG4gIC8vIGhhdmUgYmVlbiAoYW5kIHdhcyBwcmV2aW91c2x5KSBkZXNpZ25lZCB0byB0YWtlIGEgY2xvc3VyZSB0byBiZVxuICAvLyBpbnZva2VkIHdpdGhvdXQgYXJndW1lbnRzLCBidXQgaW4gYWxsIHRoZSBjYXNlcyB3ZSBjYXJlIGFib3V0IHdlXG4gIC8vIGFscmVhZHkgaGF2ZSBhbiBleGlzdGluZyBtZXRob2Qgd2Ugd2FudCB0byBjYWxsLCBzbyB0aGVyZSdzIG5vIG5lZWRcbiAgLy8gdG8gY3JlYXRlIGEgbmV3IGZ1bmN0aW9uIG9iamVjdC4gV2UgY2FuIGV2ZW4gZ2V0IGF3YXkgd2l0aCBhc3N1bWluZ1xuICAvLyB0aGUgbWV0aG9kIHRha2VzIGV4YWN0bHkgb25lIGFyZ3VtZW50LCBzaW5jZSB0aGF0IGhhcHBlbnMgdG8gYmUgdHJ1ZVxuICAvLyBpbiBldmVyeSBjYXNlLCBzbyB3ZSBkb24ndCBoYXZlIHRvIHRvdWNoIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBUaGVcbiAgLy8gb25seSBhZGRpdGlvbmFsIGFsbG9jYXRpb24gcmVxdWlyZWQgaXMgdGhlIGNvbXBsZXRpb24gcmVjb3JkLCB3aGljaFxuICAvLyBoYXMgYSBzdGFibGUgc2hhcGUgYW5kIHNvIGhvcGVmdWxseSBzaG91bGQgYmUgY2hlYXAgdG8gYWxsb2NhdGUuXG4gIGZ1bmN0aW9uIHRyeUNhdGNoKGZuLCBvYmosIGFyZykge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4geyB0eXBlOiBcIm5vcm1hbFwiLCBhcmc6IGZuLmNhbGwob2JqLCBhcmcpIH07XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICByZXR1cm4geyB0eXBlOiBcInRocm93XCIsIGFyZzogZXJyIH07XG4gICAgfVxuICB9XG5cbiAgdmFyIEdlblN0YXRlU3VzcGVuZGVkU3RhcnQgPSBcInN1c3BlbmRlZFN0YXJ0XCI7XG4gIHZhciBHZW5TdGF0ZVN1c3BlbmRlZFlpZWxkID0gXCJzdXNwZW5kZWRZaWVsZFwiO1xuICB2YXIgR2VuU3RhdGVFeGVjdXRpbmcgPSBcImV4ZWN1dGluZ1wiO1xuICB2YXIgR2VuU3RhdGVDb21wbGV0ZWQgPSBcImNvbXBsZXRlZFwiO1xuXG4gIC8vIFJldHVybmluZyB0aGlzIG9iamVjdCBmcm9tIHRoZSBpbm5lckZuIGhhcyB0aGUgc2FtZSBlZmZlY3QgYXNcbiAgLy8gYnJlYWtpbmcgb3V0IG9mIHRoZSBkaXNwYXRjaCBzd2l0Y2ggc3RhdGVtZW50LlxuICB2YXIgQ29udGludWVTZW50aW5lbCA9IHt9O1xuXG4gIC8vIER1bW15IGNvbnN0cnVjdG9yIGZ1bmN0aW9ucyB0aGF0IHdlIHVzZSBhcyB0aGUgLmNvbnN0cnVjdG9yIGFuZFxuICAvLyAuY29uc3RydWN0b3IucHJvdG90eXBlIHByb3BlcnRpZXMgZm9yIGZ1bmN0aW9ucyB0aGF0IHJldHVybiBHZW5lcmF0b3JcbiAgLy8gb2JqZWN0cy4gRm9yIGZ1bGwgc3BlYyBjb21wbGlhbmNlLCB5b3UgbWF5IHdpc2ggdG8gY29uZmlndXJlIHlvdXJcbiAgLy8gbWluaWZpZXIgbm90IHRvIG1hbmdsZSB0aGUgbmFtZXMgb2YgdGhlc2UgdHdvIGZ1bmN0aW9ucy5cbiAgZnVuY3Rpb24gR2VuZXJhdG9yKCkge31cbiAgZnVuY3Rpb24gR2VuZXJhdG9yRnVuY3Rpb24oKSB7fVxuICBmdW5jdGlvbiBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSgpIHt9XG5cbiAgdmFyIEdwID0gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUucHJvdG90eXBlID0gR2VuZXJhdG9yLnByb3RvdHlwZTtcbiAgR2VuZXJhdG9yRnVuY3Rpb24ucHJvdG90eXBlID0gR3AuY29uc3RydWN0b3IgPSBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZTtcbiAgR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUuY29uc3RydWN0b3IgPSBHZW5lcmF0b3JGdW5jdGlvbjtcbiAgR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGVbdG9TdHJpbmdUYWdTeW1ib2xdID0gR2VuZXJhdG9yRnVuY3Rpb24uZGlzcGxheU5hbWUgPSBcIkdlbmVyYXRvckZ1bmN0aW9uXCI7XG5cbiAgLy8gSGVscGVyIGZvciBkZWZpbmluZyB0aGUgLm5leHQsIC50aHJvdywgYW5kIC5yZXR1cm4gbWV0aG9kcyBvZiB0aGVcbiAgLy8gSXRlcmF0b3IgaW50ZXJmYWNlIGluIHRlcm1zIG9mIGEgc2luZ2xlIC5faW52b2tlIG1ldGhvZC5cbiAgZnVuY3Rpb24gZGVmaW5lSXRlcmF0b3JNZXRob2RzKHByb3RvdHlwZSkge1xuICAgIFtcIm5leHRcIiwgXCJ0aHJvd1wiLCBcInJldHVyblwiXS5mb3JFYWNoKGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgICAgcHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbihhcmcpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ludm9rZShtZXRob2QsIGFyZyk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgcnVudGltZS5pc0dlbmVyYXRvckZ1bmN0aW9uID0gZnVuY3Rpb24oZ2VuRnVuKSB7XG4gICAgdmFyIGN0b3IgPSB0eXBlb2YgZ2VuRnVuID09PSBcImZ1bmN0aW9uXCIgJiYgZ2VuRnVuLmNvbnN0cnVjdG9yO1xuICAgIHJldHVybiBjdG9yXG4gICAgICA/IGN0b3IgPT09IEdlbmVyYXRvckZ1bmN0aW9uIHx8XG4gICAgICAgIC8vIEZvciB0aGUgbmF0aXZlIEdlbmVyYXRvckZ1bmN0aW9uIGNvbnN0cnVjdG9yLCB0aGUgYmVzdCB3ZSBjYW5cbiAgICAgICAgLy8gZG8gaXMgdG8gY2hlY2sgaXRzIC5uYW1lIHByb3BlcnR5LlxuICAgICAgICAoY3Rvci5kaXNwbGF5TmFtZSB8fCBjdG9yLm5hbWUpID09PSBcIkdlbmVyYXRvckZ1bmN0aW9uXCJcbiAgICAgIDogZmFsc2U7XG4gIH07XG5cbiAgcnVudGltZS5tYXJrID0gZnVuY3Rpb24oZ2VuRnVuKSB7XG4gICAgaWYgKE9iamVjdC5zZXRQcm90b3R5cGVPZikge1xuICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKGdlbkZ1biwgR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnZW5GdW4uX19wcm90b19fID0gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGU7XG4gICAgICBpZiAoISh0b1N0cmluZ1RhZ1N5bWJvbCBpbiBnZW5GdW4pKSB7XG4gICAgICAgIGdlbkZ1blt0b1N0cmluZ1RhZ1N5bWJvbF0gPSBcIkdlbmVyYXRvckZ1bmN0aW9uXCI7XG4gICAgICB9XG4gICAgfVxuICAgIGdlbkZ1bi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEdwKTtcbiAgICByZXR1cm4gZ2VuRnVuO1xuICB9O1xuXG4gIC8vIFdpdGhpbiB0aGUgYm9keSBvZiBhbnkgYXN5bmMgZnVuY3Rpb24sIGBhd2FpdCB4YCBpcyB0cmFuc2Zvcm1lZCB0b1xuICAvLyBgeWllbGQgcmVnZW5lcmF0b3JSdW50aW1lLmF3cmFwKHgpYCwgc28gdGhhdCB0aGUgcnVudGltZSBjYW4gdGVzdFxuICAvLyBgdmFsdWUgaW5zdGFuY2VvZiBBd2FpdEFyZ3VtZW50YCB0byBkZXRlcm1pbmUgaWYgdGhlIHlpZWxkZWQgdmFsdWUgaXNcbiAgLy8gbWVhbnQgdG8gYmUgYXdhaXRlZC4gU29tZSBtYXkgY29uc2lkZXIgdGhlIG5hbWUgb2YgdGhpcyBtZXRob2QgdG9vXG4gIC8vIGN1dGVzeSwgYnV0IHRoZXkgYXJlIGN1cm11ZGdlb25zLlxuICBydW50aW1lLmF3cmFwID0gZnVuY3Rpb24oYXJnKSB7XG4gICAgcmV0dXJuIG5ldyBBd2FpdEFyZ3VtZW50KGFyZyk7XG4gIH07XG5cbiAgZnVuY3Rpb24gQXdhaXRBcmd1bWVudChhcmcpIHtcbiAgICB0aGlzLmFyZyA9IGFyZztcbiAgfVxuXG4gIGZ1bmN0aW9uIEFzeW5jSXRlcmF0b3IoZ2VuZXJhdG9yKSB7XG4gICAgZnVuY3Rpb24gaW52b2tlKG1ldGhvZCwgYXJnLCByZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZWNvcmQgPSB0cnlDYXRjaChnZW5lcmF0b3JbbWV0aG9kXSwgZ2VuZXJhdG9yLCBhcmcpO1xuICAgICAgaWYgKHJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgICAgcmVqZWN0KHJlY29yZC5hcmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHJlY29yZC5hcmc7XG4gICAgICAgIHZhciB2YWx1ZSA9IHJlc3VsdC52YWx1ZTtcbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgQXdhaXRBcmd1bWVudCkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodmFsdWUuYXJnKS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICBpbnZva2UoXCJuZXh0XCIsIHZhbHVlLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgaW52b2tlKFwidGhyb3dcIiwgZXJyLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2YWx1ZSkudGhlbihmdW5jdGlvbih1bndyYXBwZWQpIHtcbiAgICAgICAgICAvLyBXaGVuIGEgeWllbGRlZCBQcm9taXNlIGlzIHJlc29sdmVkLCBpdHMgZmluYWwgdmFsdWUgYmVjb21lc1xuICAgICAgICAgIC8vIHRoZSAudmFsdWUgb2YgdGhlIFByb21pc2U8e3ZhbHVlLGRvbmV9PiByZXN1bHQgZm9yIHRoZVxuICAgICAgICAgIC8vIGN1cnJlbnQgaXRlcmF0aW9uLiBJZiB0aGUgUHJvbWlzZSBpcyByZWplY3RlZCwgaG93ZXZlciwgdGhlXG4gICAgICAgICAgLy8gcmVzdWx0IGZvciB0aGlzIGl0ZXJhdGlvbiB3aWxsIGJlIHJlamVjdGVkIHdpdGggdGhlIHNhbWVcbiAgICAgICAgICAvLyByZWFzb24uIE5vdGUgdGhhdCByZWplY3Rpb25zIG9mIHlpZWxkZWQgUHJvbWlzZXMgYXJlIG5vdFxuICAgICAgICAgIC8vIHRocm93biBiYWNrIGludG8gdGhlIGdlbmVyYXRvciBmdW5jdGlvbiwgYXMgaXMgdGhlIGNhc2VcbiAgICAgICAgICAvLyB3aGVuIGFuIGF3YWl0ZWQgUHJvbWlzZSBpcyByZWplY3RlZC4gVGhpcyBkaWZmZXJlbmNlIGluXG4gICAgICAgICAgLy8gYmVoYXZpb3IgYmV0d2VlbiB5aWVsZCBhbmQgYXdhaXQgaXMgaW1wb3J0YW50LCBiZWNhdXNlIGl0XG4gICAgICAgICAgLy8gYWxsb3dzIHRoZSBjb25zdW1lciB0byBkZWNpZGUgd2hhdCB0byBkbyB3aXRoIHRoZSB5aWVsZGVkXG4gICAgICAgICAgLy8gcmVqZWN0aW9uIChzd2FsbG93IGl0IGFuZCBjb250aW51ZSwgbWFudWFsbHkgLnRocm93IGl0IGJhY2tcbiAgICAgICAgICAvLyBpbnRvIHRoZSBnZW5lcmF0b3IsIGFiYW5kb24gaXRlcmF0aW9uLCB3aGF0ZXZlcikuIFdpdGhcbiAgICAgICAgICAvLyBhd2FpdCwgYnkgY29udHJhc3QsIHRoZXJlIGlzIG5vIG9wcG9ydHVuaXR5IHRvIGV4YW1pbmUgdGhlXG4gICAgICAgICAgLy8gcmVqZWN0aW9uIHJlYXNvbiBvdXRzaWRlIHRoZSBnZW5lcmF0b3IgZnVuY3Rpb24sIHNvIHRoZVxuICAgICAgICAgIC8vIG9ubHkgb3B0aW9uIGlzIHRvIHRocm93IGl0IGZyb20gdGhlIGF3YWl0IGV4cHJlc3Npb24sIGFuZFxuICAgICAgICAgIC8vIGxldCB0aGUgZ2VuZXJhdG9yIGZ1bmN0aW9uIGhhbmRsZSB0aGUgZXhjZXB0aW9uLlxuICAgICAgICAgIHJlc3VsdC52YWx1ZSA9IHVud3JhcHBlZDtcbiAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgICAgIH0sIHJlamVjdCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiICYmIHByb2Nlc3MuZG9tYWluKSB7XG4gICAgICBpbnZva2UgPSBwcm9jZXNzLmRvbWFpbi5iaW5kKGludm9rZSk7XG4gICAgfVxuXG4gICAgdmFyIHByZXZpb3VzUHJvbWlzZTtcblxuICAgIGZ1bmN0aW9uIGVucXVldWUobWV0aG9kLCBhcmcpIHtcbiAgICAgIGZ1bmN0aW9uIGNhbGxJbnZva2VXaXRoTWV0aG9kQW5kQXJnKCkge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgaW52b2tlKG1ldGhvZCwgYXJnLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByZXZpb3VzUHJvbWlzZSA9XG4gICAgICAgIC8vIElmIGVucXVldWUgaGFzIGJlZW4gY2FsbGVkIGJlZm9yZSwgdGhlbiB3ZSB3YW50IHRvIHdhaXQgdW50aWxcbiAgICAgICAgLy8gYWxsIHByZXZpb3VzIFByb21pc2VzIGhhdmUgYmVlbiByZXNvbHZlZCBiZWZvcmUgY2FsbGluZyBpbnZva2UsXG4gICAgICAgIC8vIHNvIHRoYXQgcmVzdWx0cyBhcmUgYWx3YXlzIGRlbGl2ZXJlZCBpbiB0aGUgY29ycmVjdCBvcmRlci4gSWZcbiAgICAgICAgLy8gZW5xdWV1ZSBoYXMgbm90IGJlZW4gY2FsbGVkIGJlZm9yZSwgdGhlbiBpdCBpcyBpbXBvcnRhbnQgdG9cbiAgICAgICAgLy8gY2FsbCBpbnZva2UgaW1tZWRpYXRlbHksIHdpdGhvdXQgd2FpdGluZyBvbiBhIGNhbGxiYWNrIHRvIGZpcmUsXG4gICAgICAgIC8vIHNvIHRoYXQgdGhlIGFzeW5jIGdlbmVyYXRvciBmdW5jdGlvbiBoYXMgdGhlIG9wcG9ydHVuaXR5IHRvIGRvXG4gICAgICAgIC8vIGFueSBuZWNlc3Nhcnkgc2V0dXAgaW4gYSBwcmVkaWN0YWJsZSB3YXkuIFRoaXMgcHJlZGljdGFiaWxpdHlcbiAgICAgICAgLy8gaXMgd2h5IHRoZSBQcm9taXNlIGNvbnN0cnVjdG9yIHN5bmNocm9ub3VzbHkgaW52b2tlcyBpdHNcbiAgICAgICAgLy8gZXhlY3V0b3IgY2FsbGJhY2ssIGFuZCB3aHkgYXN5bmMgZnVuY3Rpb25zIHN5bmNocm9ub3VzbHlcbiAgICAgICAgLy8gZXhlY3V0ZSBjb2RlIGJlZm9yZSB0aGUgZmlyc3QgYXdhaXQuIFNpbmNlIHdlIGltcGxlbWVudCBzaW1wbGVcbiAgICAgICAgLy8gYXN5bmMgZnVuY3Rpb25zIGluIHRlcm1zIG9mIGFzeW5jIGdlbmVyYXRvcnMsIGl0IGlzIGVzcGVjaWFsbHlcbiAgICAgICAgLy8gaW1wb3J0YW50IHRvIGdldCB0aGlzIHJpZ2h0LCBldmVuIHRob3VnaCBpdCByZXF1aXJlcyBjYXJlLlxuICAgICAgICBwcmV2aW91c1Byb21pc2UgPyBwcmV2aW91c1Byb21pc2UudGhlbihcbiAgICAgICAgICBjYWxsSW52b2tlV2l0aE1ldGhvZEFuZEFyZyxcbiAgICAgICAgICAvLyBBdm9pZCBwcm9wYWdhdGluZyBmYWlsdXJlcyB0byBQcm9taXNlcyByZXR1cm5lZCBieSBsYXRlclxuICAgICAgICAgIC8vIGludm9jYXRpb25zIG9mIHRoZSBpdGVyYXRvci5cbiAgICAgICAgICBjYWxsSW52b2tlV2l0aE1ldGhvZEFuZEFyZ1xuICAgICAgICApIDogY2FsbEludm9rZVdpdGhNZXRob2RBbmRBcmcoKTtcbiAgICB9XG5cbiAgICAvLyBEZWZpbmUgdGhlIHVuaWZpZWQgaGVscGVyIG1ldGhvZCB0aGF0IGlzIHVzZWQgdG8gaW1wbGVtZW50IC5uZXh0LFxuICAgIC8vIC50aHJvdywgYW5kIC5yZXR1cm4gKHNlZSBkZWZpbmVJdGVyYXRvck1ldGhvZHMpLlxuICAgIHRoaXMuX2ludm9rZSA9IGVucXVldWU7XG4gIH1cblxuICBkZWZpbmVJdGVyYXRvck1ldGhvZHMoQXN5bmNJdGVyYXRvci5wcm90b3R5cGUpO1xuXG4gIC8vIE5vdGUgdGhhdCBzaW1wbGUgYXN5bmMgZnVuY3Rpb25zIGFyZSBpbXBsZW1lbnRlZCBvbiB0b3Agb2ZcbiAgLy8gQXN5bmNJdGVyYXRvciBvYmplY3RzOyB0aGV5IGp1c3QgcmV0dXJuIGEgUHJvbWlzZSBmb3IgdGhlIHZhbHVlIG9mXG4gIC8vIHRoZSBmaW5hbCByZXN1bHQgcHJvZHVjZWQgYnkgdGhlIGl0ZXJhdG9yLlxuICBydW50aW1lLmFzeW5jID0gZnVuY3Rpb24oaW5uZXJGbiwgb3V0ZXJGbiwgc2VsZiwgdHJ5TG9jc0xpc3QpIHtcbiAgICB2YXIgaXRlciA9IG5ldyBBc3luY0l0ZXJhdG9yKFxuICAgICAgd3JhcChpbm5lckZuLCBvdXRlckZuLCBzZWxmLCB0cnlMb2NzTGlzdClcbiAgICApO1xuXG4gICAgcmV0dXJuIHJ1bnRpbWUuaXNHZW5lcmF0b3JGdW5jdGlvbihvdXRlckZuKVxuICAgICAgPyBpdGVyIC8vIElmIG91dGVyRm4gaXMgYSBnZW5lcmF0b3IsIHJldHVybiB0aGUgZnVsbCBpdGVyYXRvci5cbiAgICAgIDogaXRlci5uZXh0KCkudGhlbihmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0LmRvbmUgPyByZXN1bHQudmFsdWUgOiBpdGVyLm5leHQoKTtcbiAgICAgICAgfSk7XG4gIH07XG5cbiAgZnVuY3Rpb24gbWFrZUludm9rZU1ldGhvZChpbm5lckZuLCBzZWxmLCBjb250ZXh0KSB7XG4gICAgdmFyIHN0YXRlID0gR2VuU3RhdGVTdXNwZW5kZWRTdGFydDtcblxuICAgIHJldHVybiBmdW5jdGlvbiBpbnZva2UobWV0aG9kLCBhcmcpIHtcbiAgICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVFeGVjdXRpbmcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgcnVubmluZ1wiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHN0YXRlID09PSBHZW5TdGF0ZUNvbXBsZXRlZCkge1xuICAgICAgICBpZiAobWV0aG9kID09PSBcInRocm93XCIpIHtcbiAgICAgICAgICB0aHJvdyBhcmc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCZSBmb3JnaXZpbmcsIHBlciAyNS4zLjMuMy4zIG9mIHRoZSBzcGVjOlxuICAgICAgICAvLyBodHRwczovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtZ2VuZXJhdG9ycmVzdW1lXG4gICAgICAgIHJldHVybiBkb25lUmVzdWx0KCk7XG4gICAgICB9XG5cbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHZhciBkZWxlZ2F0ZSA9IGNvbnRleHQuZGVsZWdhdGU7XG4gICAgICAgIGlmIChkZWxlZ2F0ZSkge1xuICAgICAgICAgIGlmIChtZXRob2QgPT09IFwicmV0dXJuXCIgfHxcbiAgICAgICAgICAgICAgKG1ldGhvZCA9PT0gXCJ0aHJvd1wiICYmIGRlbGVnYXRlLml0ZXJhdG9yW21ldGhvZF0gPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIC8vIEEgcmV0dXJuIG9yIHRocm93ICh3aGVuIHRoZSBkZWxlZ2F0ZSBpdGVyYXRvciBoYXMgbm8gdGhyb3dcbiAgICAgICAgICAgIC8vIG1ldGhvZCkgYWx3YXlzIHRlcm1pbmF0ZXMgdGhlIHlpZWxkKiBsb29wLlxuICAgICAgICAgICAgY29udGV4dC5kZWxlZ2F0ZSA9IG51bGw7XG5cbiAgICAgICAgICAgIC8vIElmIHRoZSBkZWxlZ2F0ZSBpdGVyYXRvciBoYXMgYSByZXR1cm4gbWV0aG9kLCBnaXZlIGl0IGFcbiAgICAgICAgICAgIC8vIGNoYW5jZSB0byBjbGVhbiB1cC5cbiAgICAgICAgICAgIHZhciByZXR1cm5NZXRob2QgPSBkZWxlZ2F0ZS5pdGVyYXRvcltcInJldHVyblwiXTtcbiAgICAgICAgICAgIGlmIChyZXR1cm5NZXRob2QpIHtcbiAgICAgICAgICAgICAgdmFyIHJlY29yZCA9IHRyeUNhdGNoKHJldHVybk1ldGhvZCwgZGVsZWdhdGUuaXRlcmF0b3IsIGFyZyk7XG4gICAgICAgICAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlIHJldHVybiBtZXRob2QgdGhyZXcgYW4gZXhjZXB0aW9uLCBsZXQgdGhhdFxuICAgICAgICAgICAgICAgIC8vIGV4Y2VwdGlvbiBwcmV2YWlsIG92ZXIgdGhlIG9yaWdpbmFsIHJldHVybiBvciB0aHJvdy5cbiAgICAgICAgICAgICAgICBtZXRob2QgPSBcInRocm93XCI7XG4gICAgICAgICAgICAgICAgYXJnID0gcmVjb3JkLmFyZztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobWV0aG9kID09PSBcInJldHVyblwiKSB7XG4gICAgICAgICAgICAgIC8vIENvbnRpbnVlIHdpdGggdGhlIG91dGVyIHJldHVybiwgbm93IHRoYXQgdGhlIGRlbGVnYXRlXG4gICAgICAgICAgICAgIC8vIGl0ZXJhdG9yIGhhcyBiZWVuIHRlcm1pbmF0ZWQuXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciByZWNvcmQgPSB0cnlDYXRjaChcbiAgICAgICAgICAgIGRlbGVnYXRlLml0ZXJhdG9yW21ldGhvZF0sXG4gICAgICAgICAgICBkZWxlZ2F0ZS5pdGVyYXRvcixcbiAgICAgICAgICAgIGFyZ1xuICAgICAgICAgICk7XG5cbiAgICAgICAgICBpZiAocmVjb3JkLnR5cGUgPT09IFwidGhyb3dcIikge1xuICAgICAgICAgICAgY29udGV4dC5kZWxlZ2F0ZSA9IG51bGw7XG5cbiAgICAgICAgICAgIC8vIExpa2UgcmV0dXJuaW5nIGdlbmVyYXRvci50aHJvdyh1bmNhdWdodCksIGJ1dCB3aXRob3V0IHRoZVxuICAgICAgICAgICAgLy8gb3ZlcmhlYWQgb2YgYW4gZXh0cmEgZnVuY3Rpb24gY2FsbC5cbiAgICAgICAgICAgIG1ldGhvZCA9IFwidGhyb3dcIjtcbiAgICAgICAgICAgIGFyZyA9IHJlY29yZC5hcmc7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBEZWxlZ2F0ZSBnZW5lcmF0b3IgcmFuIGFuZCBoYW5kbGVkIGl0cyBvd24gZXhjZXB0aW9ucyBzb1xuICAgICAgICAgIC8vIHJlZ2FyZGxlc3Mgb2Ygd2hhdCB0aGUgbWV0aG9kIHdhcywgd2UgY29udGludWUgYXMgaWYgaXQgaXNcbiAgICAgICAgICAvLyBcIm5leHRcIiB3aXRoIGFuIHVuZGVmaW5lZCBhcmcuXG4gICAgICAgICAgbWV0aG9kID0gXCJuZXh0XCI7XG4gICAgICAgICAgYXJnID0gdW5kZWZpbmVkO1xuXG4gICAgICAgICAgdmFyIGluZm8gPSByZWNvcmQuYXJnO1xuICAgICAgICAgIGlmIChpbmZvLmRvbmUpIHtcbiAgICAgICAgICAgIGNvbnRleHRbZGVsZWdhdGUucmVzdWx0TmFtZV0gPSBpbmZvLnZhbHVlO1xuICAgICAgICAgICAgY29udGV4dC5uZXh0ID0gZGVsZWdhdGUubmV4dExvYztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUgPSBHZW5TdGF0ZVN1c3BlbmRlZFlpZWxkO1xuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29udGV4dC5kZWxlZ2F0ZSA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWV0aG9kID09PSBcIm5leHRcIikge1xuICAgICAgICAgIGlmIChzdGF0ZSA9PT0gR2VuU3RhdGVTdXNwZW5kZWRZaWVsZCkge1xuICAgICAgICAgICAgY29udGV4dC5zZW50ID0gYXJnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250ZXh0LnNlbnQgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAobWV0aG9kID09PSBcInRocm93XCIpIHtcbiAgICAgICAgICBpZiAoc3RhdGUgPT09IEdlblN0YXRlU3VzcGVuZGVkU3RhcnQpIHtcbiAgICAgICAgICAgIHN0YXRlID0gR2VuU3RhdGVDb21wbGV0ZWQ7XG4gICAgICAgICAgICB0aHJvdyBhcmc7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGNvbnRleHQuZGlzcGF0Y2hFeGNlcHRpb24oYXJnKSkge1xuICAgICAgICAgICAgLy8gSWYgdGhlIGRpc3BhdGNoZWQgZXhjZXB0aW9uIHdhcyBjYXVnaHQgYnkgYSBjYXRjaCBibG9jayxcbiAgICAgICAgICAgIC8vIHRoZW4gbGV0IHRoYXQgY2F0Y2ggYmxvY2sgaGFuZGxlIHRoZSBleGNlcHRpb24gbm9ybWFsbHkuXG4gICAgICAgICAgICBtZXRob2QgPSBcIm5leHRcIjtcbiAgICAgICAgICAgIGFyZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChtZXRob2QgPT09IFwicmV0dXJuXCIpIHtcbiAgICAgICAgICBjb250ZXh0LmFicnVwdChcInJldHVyblwiLCBhcmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUgPSBHZW5TdGF0ZUV4ZWN1dGluZztcblxuICAgICAgICB2YXIgcmVjb3JkID0gdHJ5Q2F0Y2goaW5uZXJGbiwgc2VsZiwgY29udGV4dCk7XG4gICAgICAgIGlmIChyZWNvcmQudHlwZSA9PT0gXCJub3JtYWxcIikge1xuICAgICAgICAgIC8vIElmIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd24gZnJvbSBpbm5lckZuLCB3ZSBsZWF2ZSBzdGF0ZSA9PT1cbiAgICAgICAgICAvLyBHZW5TdGF0ZUV4ZWN1dGluZyBhbmQgbG9vcCBiYWNrIGZvciBhbm90aGVyIGludm9jYXRpb24uXG4gICAgICAgICAgc3RhdGUgPSBjb250ZXh0LmRvbmVcbiAgICAgICAgICAgID8gR2VuU3RhdGVDb21wbGV0ZWRcbiAgICAgICAgICAgIDogR2VuU3RhdGVTdXNwZW5kZWRZaWVsZDtcblxuICAgICAgICAgIHZhciBpbmZvID0ge1xuICAgICAgICAgICAgdmFsdWU6IHJlY29yZC5hcmcsXG4gICAgICAgICAgICBkb25lOiBjb250ZXh0LmRvbmVcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgaWYgKHJlY29yZC5hcmcgPT09IENvbnRpbnVlU2VudGluZWwpIHtcbiAgICAgICAgICAgIGlmIChjb250ZXh0LmRlbGVnYXRlICYmIG1ldGhvZCA9PT0gXCJuZXh0XCIpIHtcbiAgICAgICAgICAgICAgLy8gRGVsaWJlcmF0ZWx5IGZvcmdldCB0aGUgbGFzdCBzZW50IHZhbHVlIHNvIHRoYXQgd2UgZG9uJ3RcbiAgICAgICAgICAgICAgLy8gYWNjaWRlbnRhbGx5IHBhc3MgaXQgb24gdG8gdGhlIGRlbGVnYXRlLlxuICAgICAgICAgICAgICBhcmcgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHJlY29yZC50eXBlID09PSBcInRocm93XCIpIHtcbiAgICAgICAgICBzdGF0ZSA9IEdlblN0YXRlQ29tcGxldGVkO1xuICAgICAgICAgIC8vIERpc3BhdGNoIHRoZSBleGNlcHRpb24gYnkgbG9vcGluZyBiYWNrIGFyb3VuZCB0byB0aGVcbiAgICAgICAgICAvLyBjb250ZXh0LmRpc3BhdGNoRXhjZXB0aW9uKGFyZykgY2FsbCBhYm92ZS5cbiAgICAgICAgICBtZXRob2QgPSBcInRocm93XCI7XG4gICAgICAgICAgYXJnID0gcmVjb3JkLmFyZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICAvLyBEZWZpbmUgR2VuZXJhdG9yLnByb3RvdHlwZS57bmV4dCx0aHJvdyxyZXR1cm59IGluIHRlcm1zIG9mIHRoZVxuICAvLyB1bmlmaWVkIC5faW52b2tlIGhlbHBlciBtZXRob2QuXG4gIGRlZmluZUl0ZXJhdG9yTWV0aG9kcyhHcCk7XG5cbiAgR3BbaXRlcmF0b3JTeW1ib2xdID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgR3BbdG9TdHJpbmdUYWdTeW1ib2xdID0gXCJHZW5lcmF0b3JcIjtcblxuICBHcC50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBcIltvYmplY3QgR2VuZXJhdG9yXVwiO1xuICB9O1xuXG4gIGZ1bmN0aW9uIHB1c2hUcnlFbnRyeShsb2NzKSB7XG4gICAgdmFyIGVudHJ5ID0geyB0cnlMb2M6IGxvY3NbMF0gfTtcblxuICAgIGlmICgxIGluIGxvY3MpIHtcbiAgICAgIGVudHJ5LmNhdGNoTG9jID0gbG9jc1sxXTtcbiAgICB9XG5cbiAgICBpZiAoMiBpbiBsb2NzKSB7XG4gICAgICBlbnRyeS5maW5hbGx5TG9jID0gbG9jc1syXTtcbiAgICAgIGVudHJ5LmFmdGVyTG9jID0gbG9jc1szXTtcbiAgICB9XG5cbiAgICB0aGlzLnRyeUVudHJpZXMucHVzaChlbnRyeSk7XG4gIH1cblxuICBmdW5jdGlvbiByZXNldFRyeUVudHJ5KGVudHJ5KSB7XG4gICAgdmFyIHJlY29yZCA9IGVudHJ5LmNvbXBsZXRpb24gfHwge307XG4gICAgcmVjb3JkLnR5cGUgPSBcIm5vcm1hbFwiO1xuICAgIGRlbGV0ZSByZWNvcmQuYXJnO1xuICAgIGVudHJ5LmNvbXBsZXRpb24gPSByZWNvcmQ7XG4gIH1cblxuICBmdW5jdGlvbiBDb250ZXh0KHRyeUxvY3NMaXN0KSB7XG4gICAgLy8gVGhlIHJvb3QgZW50cnkgb2JqZWN0IChlZmZlY3RpdmVseSBhIHRyeSBzdGF0ZW1lbnQgd2l0aG91dCBhIGNhdGNoXG4gICAgLy8gb3IgYSBmaW5hbGx5IGJsb2NrKSBnaXZlcyB1cyBhIHBsYWNlIHRvIHN0b3JlIHZhbHVlcyB0aHJvd24gZnJvbVxuICAgIC8vIGxvY2F0aW9ucyB3aGVyZSB0aGVyZSBpcyBubyBlbmNsb3NpbmcgdHJ5IHN0YXRlbWVudC5cbiAgICB0aGlzLnRyeUVudHJpZXMgPSBbeyB0cnlMb2M6IFwicm9vdFwiIH1dO1xuICAgIHRyeUxvY3NMaXN0LmZvckVhY2gocHVzaFRyeUVudHJ5LCB0aGlzKTtcbiAgICB0aGlzLnJlc2V0KHRydWUpO1xuICB9XG5cbiAgcnVudGltZS5rZXlzID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSB7XG4gICAgICBrZXlzLnB1c2goa2V5KTtcbiAgICB9XG4gICAga2V5cy5yZXZlcnNlKCk7XG5cbiAgICAvLyBSYXRoZXIgdGhhbiByZXR1cm5pbmcgYW4gb2JqZWN0IHdpdGggYSBuZXh0IG1ldGhvZCwgd2Uga2VlcFxuICAgIC8vIHRoaW5ncyBzaW1wbGUgYW5kIHJldHVybiB0aGUgbmV4dCBmdW5jdGlvbiBpdHNlbGYuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICB3aGlsZSAoa2V5cy5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXMucG9wKCk7XG4gICAgICAgIGlmIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgbmV4dC52YWx1ZSA9IGtleTtcbiAgICAgICAgICBuZXh0LmRvbmUgPSBmYWxzZTtcbiAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBUbyBhdm9pZCBjcmVhdGluZyBhbiBhZGRpdGlvbmFsIG9iamVjdCwgd2UganVzdCBoYW5nIHRoZSAudmFsdWVcbiAgICAgIC8vIGFuZCAuZG9uZSBwcm9wZXJ0aWVzIG9mZiB0aGUgbmV4dCBmdW5jdGlvbiBvYmplY3QgaXRzZWxmLiBUaGlzXG4gICAgICAvLyBhbHNvIGVuc3VyZXMgdGhhdCB0aGUgbWluaWZpZXIgd2lsbCBub3QgYW5vbnltaXplIHRoZSBmdW5jdGlvbi5cbiAgICAgIG5leHQuZG9uZSA9IHRydWU7XG4gICAgICByZXR1cm4gbmV4dDtcbiAgICB9O1xuICB9O1xuXG4gIGZ1bmN0aW9uIHZhbHVlcyhpdGVyYWJsZSkge1xuICAgIGlmIChpdGVyYWJsZSkge1xuICAgICAgdmFyIGl0ZXJhdG9yTWV0aG9kID0gaXRlcmFibGVbaXRlcmF0b3JTeW1ib2xdO1xuICAgICAgaWYgKGl0ZXJhdG9yTWV0aG9kKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvck1ldGhvZC5jYWxsKGl0ZXJhYmxlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBpdGVyYWJsZS5uZXh0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhYmxlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWlzTmFOKGl0ZXJhYmxlLmxlbmd0aCkpIHtcbiAgICAgICAgdmFyIGkgPSAtMSwgbmV4dCA9IGZ1bmN0aW9uIG5leHQoKSB7XG4gICAgICAgICAgd2hpbGUgKCsraSA8IGl0ZXJhYmxlLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKGhhc093bi5jYWxsKGl0ZXJhYmxlLCBpKSkge1xuICAgICAgICAgICAgICBuZXh0LnZhbHVlID0gaXRlcmFibGVbaV07XG4gICAgICAgICAgICAgIG5leHQuZG9uZSA9IGZhbHNlO1xuICAgICAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBuZXh0LnZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgIG5leHQuZG9uZSA9IHRydWU7XG5cbiAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gbmV4dC5uZXh0ID0gbmV4dDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gYW4gaXRlcmF0b3Igd2l0aCBubyB2YWx1ZXMuXG4gICAgcmV0dXJuIHsgbmV4dDogZG9uZVJlc3VsdCB9O1xuICB9XG4gIHJ1bnRpbWUudmFsdWVzID0gdmFsdWVzO1xuXG4gIGZ1bmN0aW9uIGRvbmVSZXN1bHQoKSB7XG4gICAgcmV0dXJuIHsgdmFsdWU6IHVuZGVmaW5lZCwgZG9uZTogdHJ1ZSB9O1xuICB9XG5cbiAgQ29udGV4dC5wcm90b3R5cGUgPSB7XG4gICAgY29uc3RydWN0b3I6IENvbnRleHQsXG5cbiAgICByZXNldDogZnVuY3Rpb24oc2tpcFRlbXBSZXNldCkge1xuICAgICAgdGhpcy5wcmV2ID0gMDtcbiAgICAgIHRoaXMubmV4dCA9IDA7XG4gICAgICB0aGlzLnNlbnQgPSB1bmRlZmluZWQ7XG4gICAgICB0aGlzLmRvbmUgPSBmYWxzZTtcbiAgICAgIHRoaXMuZGVsZWdhdGUgPSBudWxsO1xuXG4gICAgICB0aGlzLnRyeUVudHJpZXMuZm9yRWFjaChyZXNldFRyeUVudHJ5KTtcblxuICAgICAgaWYgKCFza2lwVGVtcFJlc2V0KSB7XG4gICAgICAgIGZvciAodmFyIG5hbWUgaW4gdGhpcykge1xuICAgICAgICAgIC8vIE5vdCBzdXJlIGFib3V0IHRoZSBvcHRpbWFsIG9yZGVyIG9mIHRoZXNlIGNvbmRpdGlvbnM6XG4gICAgICAgICAgaWYgKG5hbWUuY2hhckF0KDApID09PSBcInRcIiAmJlxuICAgICAgICAgICAgICBoYXNPd24uY2FsbCh0aGlzLCBuYW1lKSAmJlxuICAgICAgICAgICAgICAhaXNOYU4oK25hbWUuc2xpY2UoMSkpKSB7XG4gICAgICAgICAgICB0aGlzW25hbWVdID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZG9uZSA9IHRydWU7XG5cbiAgICAgIHZhciByb290RW50cnkgPSB0aGlzLnRyeUVudHJpZXNbMF07XG4gICAgICB2YXIgcm9vdFJlY29yZCA9IHJvb3RFbnRyeS5jb21wbGV0aW9uO1xuICAgICAgaWYgKHJvb3RSZWNvcmQudHlwZSA9PT0gXCJ0aHJvd1wiKSB7XG4gICAgICAgIHRocm93IHJvb3RSZWNvcmQuYXJnO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5ydmFsO1xuICAgIH0sXG5cbiAgICBkaXNwYXRjaEV4Y2VwdGlvbjogZnVuY3Rpb24oZXhjZXB0aW9uKSB7XG4gICAgICBpZiAodGhpcy5kb25lKSB7XG4gICAgICAgIHRocm93IGV4Y2VwdGlvbjtcbiAgICAgIH1cblxuICAgICAgdmFyIGNvbnRleHQgPSB0aGlzO1xuICAgICAgZnVuY3Rpb24gaGFuZGxlKGxvYywgY2F1Z2h0KSB7XG4gICAgICAgIHJlY29yZC50eXBlID0gXCJ0aHJvd1wiO1xuICAgICAgICByZWNvcmQuYXJnID0gZXhjZXB0aW9uO1xuICAgICAgICBjb250ZXh0Lm5leHQgPSBsb2M7XG4gICAgICAgIHJldHVybiAhIWNhdWdodDtcbiAgICAgIH1cblxuICAgICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5RW50cmllcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICB2YXIgZW50cnkgPSB0aGlzLnRyeUVudHJpZXNbaV07XG4gICAgICAgIHZhciByZWNvcmQgPSBlbnRyeS5jb21wbGV0aW9uO1xuXG4gICAgICAgIGlmIChlbnRyeS50cnlMb2MgPT09IFwicm9vdFwiKSB7XG4gICAgICAgICAgLy8gRXhjZXB0aW9uIHRocm93biBvdXRzaWRlIG9mIGFueSB0cnkgYmxvY2sgdGhhdCBjb3VsZCBoYW5kbGVcbiAgICAgICAgICAvLyBpdCwgc28gc2V0IHRoZSBjb21wbGV0aW9uIHZhbHVlIG9mIHRoZSBlbnRpcmUgZnVuY3Rpb24gdG9cbiAgICAgICAgICAvLyB0aHJvdyB0aGUgZXhjZXB0aW9uLlxuICAgICAgICAgIHJldHVybiBoYW5kbGUoXCJlbmRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZW50cnkudHJ5TG9jIDw9IHRoaXMucHJldikge1xuICAgICAgICAgIHZhciBoYXNDYXRjaCA9IGhhc093bi5jYWxsKGVudHJ5LCBcImNhdGNoTG9jXCIpO1xuICAgICAgICAgIHZhciBoYXNGaW5hbGx5ID0gaGFzT3duLmNhbGwoZW50cnksIFwiZmluYWxseUxvY1wiKTtcblxuICAgICAgICAgIGlmIChoYXNDYXRjaCAmJiBoYXNGaW5hbGx5KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5wcmV2IDwgZW50cnkuY2F0Y2hMb2MpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZShlbnRyeS5jYXRjaExvYywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMucHJldiA8IGVudHJ5LmZpbmFsbHlMb2MpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZShlbnRyeS5maW5hbGx5TG9jKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSBpZiAoaGFzQ2F0Y2gpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnByZXYgPCBlbnRyeS5jYXRjaExvYykge1xuICAgICAgICAgICAgICByZXR1cm4gaGFuZGxlKGVudHJ5LmNhdGNoTG9jLCB0cnVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSBpZiAoaGFzRmluYWxseSkge1xuICAgICAgICAgICAgaWYgKHRoaXMucHJldiA8IGVudHJ5LmZpbmFsbHlMb2MpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGhhbmRsZShlbnRyeS5maW5hbGx5TG9jKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0cnkgc3RhdGVtZW50IHdpdGhvdXQgY2F0Y2ggb3IgZmluYWxseVwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgYWJydXB0OiBmdW5jdGlvbih0eXBlLCBhcmcpIHtcbiAgICAgIGZvciAodmFyIGkgPSB0aGlzLnRyeUVudHJpZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0gdGhpcy50cnlFbnRyaWVzW2ldO1xuICAgICAgICBpZiAoZW50cnkudHJ5TG9jIDw9IHRoaXMucHJldiAmJlxuICAgICAgICAgICAgaGFzT3duLmNhbGwoZW50cnksIFwiZmluYWxseUxvY1wiKSAmJlxuICAgICAgICAgICAgdGhpcy5wcmV2IDwgZW50cnkuZmluYWxseUxvYykge1xuICAgICAgICAgIHZhciBmaW5hbGx5RW50cnkgPSBlbnRyeTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZmluYWxseUVudHJ5ICYmXG4gICAgICAgICAgKHR5cGUgPT09IFwiYnJlYWtcIiB8fFxuICAgICAgICAgICB0eXBlID09PSBcImNvbnRpbnVlXCIpICYmXG4gICAgICAgICAgZmluYWxseUVudHJ5LnRyeUxvYyA8PSBhcmcgJiZcbiAgICAgICAgICBhcmcgPD0gZmluYWxseUVudHJ5LmZpbmFsbHlMb2MpIHtcbiAgICAgICAgLy8gSWdub3JlIHRoZSBmaW5hbGx5IGVudHJ5IGlmIGNvbnRyb2wgaXMgbm90IGp1bXBpbmcgdG8gYVxuICAgICAgICAvLyBsb2NhdGlvbiBvdXRzaWRlIHRoZSB0cnkvY2F0Y2ggYmxvY2suXG4gICAgICAgIGZpbmFsbHlFbnRyeSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHZhciByZWNvcmQgPSBmaW5hbGx5RW50cnkgPyBmaW5hbGx5RW50cnkuY29tcGxldGlvbiA6IHt9O1xuICAgICAgcmVjb3JkLnR5cGUgPSB0eXBlO1xuICAgICAgcmVjb3JkLmFyZyA9IGFyZztcblxuICAgICAgaWYgKGZpbmFsbHlFbnRyeSkge1xuICAgICAgICB0aGlzLm5leHQgPSBmaW5hbGx5RW50cnkuZmluYWxseUxvYztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29tcGxldGUocmVjb3JkKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIENvbnRpbnVlU2VudGluZWw7XG4gICAgfSxcblxuICAgIGNvbXBsZXRlOiBmdW5jdGlvbihyZWNvcmQsIGFmdGVyTG9jKSB7XG4gICAgICBpZiAocmVjb3JkLnR5cGUgPT09IFwidGhyb3dcIikge1xuICAgICAgICB0aHJvdyByZWNvcmQuYXJnO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVjb3JkLnR5cGUgPT09IFwiYnJlYWtcIiB8fFxuICAgICAgICAgIHJlY29yZC50eXBlID09PSBcImNvbnRpbnVlXCIpIHtcbiAgICAgICAgdGhpcy5uZXh0ID0gcmVjb3JkLmFyZztcbiAgICAgIH0gZWxzZSBpZiAocmVjb3JkLnR5cGUgPT09IFwicmV0dXJuXCIpIHtcbiAgICAgICAgdGhpcy5ydmFsID0gcmVjb3JkLmFyZztcbiAgICAgICAgdGhpcy5uZXh0ID0gXCJlbmRcIjtcbiAgICAgIH0gZWxzZSBpZiAocmVjb3JkLnR5cGUgPT09IFwibm9ybWFsXCIgJiYgYWZ0ZXJMb2MpIHtcbiAgICAgICAgdGhpcy5uZXh0ID0gYWZ0ZXJMb2M7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGZpbmlzaDogZnVuY3Rpb24oZmluYWxseUxvYykge1xuICAgICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5RW50cmllcy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICB2YXIgZW50cnkgPSB0aGlzLnRyeUVudHJpZXNbaV07XG4gICAgICAgIGlmIChlbnRyeS5maW5hbGx5TG9jID09PSBmaW5hbGx5TG9jKSB7XG4gICAgICAgICAgdGhpcy5jb21wbGV0ZShlbnRyeS5jb21wbGV0aW9uLCBlbnRyeS5hZnRlckxvYyk7XG4gICAgICAgICAgcmVzZXRUcnlFbnRyeShlbnRyeSk7XG4gICAgICAgICAgcmV0dXJuIENvbnRpbnVlU2VudGluZWw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgXCJjYXRjaFwiOiBmdW5jdGlvbih0cnlMb2MpIHtcbiAgICAgIGZvciAodmFyIGkgPSB0aGlzLnRyeUVudHJpZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgdmFyIGVudHJ5ID0gdGhpcy50cnlFbnRyaWVzW2ldO1xuICAgICAgICBpZiAoZW50cnkudHJ5TG9jID09PSB0cnlMb2MpIHtcbiAgICAgICAgICB2YXIgcmVjb3JkID0gZW50cnkuY29tcGxldGlvbjtcbiAgICAgICAgICBpZiAocmVjb3JkLnR5cGUgPT09IFwidGhyb3dcIikge1xuICAgICAgICAgICAgdmFyIHRocm93biA9IHJlY29yZC5hcmc7XG4gICAgICAgICAgICByZXNldFRyeUVudHJ5KGVudHJ5KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRocm93bjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBUaGUgY29udGV4dC5jYXRjaCBtZXRob2QgbXVzdCBvbmx5IGJlIGNhbGxlZCB3aXRoIGEgbG9jYXRpb25cbiAgICAgIC8vIGFyZ3VtZW50IHRoYXQgY29ycmVzcG9uZHMgdG8gYSBrbm93biBjYXRjaCBibG9jay5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcImlsbGVnYWwgY2F0Y2ggYXR0ZW1wdFwiKTtcbiAgICB9LFxuXG4gICAgZGVsZWdhdGVZaWVsZDogZnVuY3Rpb24oaXRlcmFibGUsIHJlc3VsdE5hbWUsIG5leHRMb2MpIHtcbiAgICAgIHRoaXMuZGVsZWdhdGUgPSB7XG4gICAgICAgIGl0ZXJhdG9yOiB2YWx1ZXMoaXRlcmFibGUpLFxuICAgICAgICByZXN1bHROYW1lOiByZXN1bHROYW1lLFxuICAgICAgICBuZXh0TG9jOiBuZXh0TG9jXG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gQ29udGludWVTZW50aW5lbDtcbiAgICB9XG4gIH07XG59KShcbiAgLy8gQW1vbmcgdGhlIHZhcmlvdXMgdHJpY2tzIGZvciBvYnRhaW5pbmcgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbFxuICAvLyBvYmplY3QsIHRoaXMgc2VlbXMgdG8gYmUgdGhlIG1vc3QgcmVsaWFibGUgdGVjaG5pcXVlIHRoYXQgZG9lcyBub3RcbiAgLy8gdXNlIGluZGlyZWN0IGV2YWwgKHdoaWNoIHZpb2xhdGVzIENvbnRlbnQgU2VjdXJpdHkgUG9saWN5KS5cbiAgdHlwZW9mIGdsb2JhbCA9PT0gXCJvYmplY3RcIiA/IGdsb2JhbCA6XG4gIHR5cGVvZiB3aW5kb3cgPT09IFwib2JqZWN0XCIgPyB3aW5kb3cgOlxuICB0eXBlb2Ygc2VsZiA9PT0gXCJvYmplY3RcIiA/IHNlbGYgOiB0aGlzXG4pO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4oZnVuY3Rpb24gKCkge1xuICAgIGNsYXNzIEZhdm9yaXRlcyB7XG5cbiAgICAgICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgICAgICBsZXQgcmVhZHkgPSBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSAhPSBcImxvYWRpbmdcIikgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZWFkeS50aGVuKHRoaXMuaW5pdC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluaXQoKSB7XG4gICAgICAgICAgICB0aGlzLmZhdm9yaXRlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5mYXZvcml0ZScpO1xuICAgICAgICAgICAgaWYgKHRoaXMuZmF2b3JpdGVzID09PSBudWxsKSByZXR1cm47XG5cbiAgICAgICAgICAgIGxldCBwcm9kdWN0cyA9IHRoaXMuZmF2b3JpdGVzLnF1ZXJ5U2VsZWN0b3JBbGwoJy5wcm9kdWN0Jyk7XG4gICAgICAgICAgICB0aGlzLmNvdW50ID0gcHJvZHVjdHMubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKHRoaXMuY291bnQgPT0gMCl7XG4gICAgICAgICAgICAgICAgdGhpcy5mYXZvcml0ZXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmZhdm9yaXRlcyk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuY291bnQ7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuZmF2b3JpdGVzO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy53cmFwcGVyID0gdGhpcy5mYXZvcml0ZXMucXVlcnlTZWxlY3RvcignLmZhdm9yaXRlX193cmFwcGVyLWlubmVyJyk7XG5cbiAgICAgICAgICAgIHRoaXMubmV4dF9idXR0b24gPSB0aGlzLmZhdm9yaXRlcy5xdWVyeVNlbGVjdG9yKCcuZmF2b3JpdGVfX2J1dHRvbl9uZXh0Jyk7XG4gICAgICAgICAgICB0aGlzLnByZXZfYnV0dG9uID0gdGhpcy5mYXZvcml0ZXMucXVlcnlTZWxlY3RvcignLmZhdm9yaXRlX19idXR0b25fcHJldicpO1xuXG4gICAgICAgICAgICB0aGlzLm5leHRfYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5uZXh0LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5wcmV2X2J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMucHJldi5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgdGhpcy5tYXJnaW4gPSAyMDtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgICAgICAgICB0aGlzLndpZHRoID0gcHJvZHVjdHNbMF0ub2Zmc2V0V2lkdGggKyB0aGlzLm1hcmdpbjtcbiAgICAgICAgICAgIHRoaXMuaW5saW5lID0gTWF0aC5mbG9vcigodGhpcy53cmFwcGVyLm9mZnNldFdpZHRoK3RoaXMubWFyZ2luKS90aGlzLndpZHRoKTtcblxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMudGltZXIgPSBudWxsO1xuICAgICAgICAgICAgbGV0IHRyYW5zRW5kRXZlbnROYW1lcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgICAgICAgICAgICAgICAgICdNb3pUcmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgICAgICAgICAgICAgICAnT1RyYW5zaXRpb24nOiAnb1RyYW5zaXRpb25FbmQnLFxuICAgICAgICAgICAgICAgICAgICAnbXNUcmFuc2l0aW9uJzogJ01TVHJhbnNpdGlvbkVuZCcsXG4gICAgICAgICAgICAgICAgICAgICd0cmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlci5hZGRFdmVudExpc3RlbmVyKHRyYW5zRW5kRXZlbnROYW1lc1tNb2Rlcm5penIucHJlZml4ZWQoJ3RyYW5zaXRpb24nKV0sIHRoaXMuc3RvcEFuaW1hdGlvbi5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLnJlc2l6ZS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0QW5pbWF0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0b3BBbmltYXRpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXIgIT0gbnVsbCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRyb3BBbmltYXRpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudGltZXIgIT0gbnVsbCkgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuICAgICAgICAgICAgdGhpcy50aW1lciA9IHNldFRpbWVvdXQodGhpcy5zdG9wQW5pbWF0aW9uLmJpbmQodGhpcyksIDI1MCk7XG4gICAgICAgIH1cblxuICAgICAgICBuZXh0IChldmVudCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50Kys7XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50ID09IHRoaXMuY291bnQtdGhpcy5pbmxpbmUrMSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNjcm9sbCgpO1xuICAgICAgICAgICAgdGhpcy5uZXh0X2J1dHRvbi5ibHVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBwcmV2IChldmVudCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50LS07XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50ID09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gdGhpcy5jb3VudC10aGlzLmlubGluZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsKCk7XG4gICAgICAgICAgICB0aGlzLnByZXZfYnV0dG9uLmJsdXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc2l6ZSAoKSB7XG4gICAgICAgICAgICB0aGlzLmlubGluZSA9IE1hdGguZmxvb3IoKHRoaXMud3JhcHBlci5vZmZzZXRXaWR0aCt0aGlzLm1hcmdpbikvdGhpcy53aWR0aCk7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2Nyb2xsICgpIHtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtNb2Rlcm5penIucHJlZml4ZWQoJ3RyYW5zZm9ybScpXSA9ICd0cmFuc2xhdGVYKCcgKyAoLXRoaXMud2lkdGggKiAodGhpcy5jdXJyZW50KSkgKyAncHgpJztcbiAgICAgICAgICAgIHRoaXMuZHJvcEFuaW1hdGlvbigpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgbmV3IEZhdm9yaXRlcztcblxufSkoKVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4oZnVuY3Rpb24gKCkge1xuICAgIGNsYXNzIE5hdmlnYXRpb24ge1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgbGV0IHJlYWR5ID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgIT0gXCJsb2FkaW5nXCIpIHJldHVybiByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgKCkgPT4gcmVzb2x2ZSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVhZHkudGhlbih0aGlzLmluaXQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpbml0ICgpIHtcbiAgICAgICAgICAgIHRoaXMubmF2aWdhdGlvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5uYXZpZ2F0aW9uJyk7XG4gICAgICAgICAgICBpZiAodGhpcy5uYXZpZ2F0aW9uID09PSBudWxsKSByZXR1cm47XG5cbiAgICAgICAgICAgIGxldCBsYWJlbHMgPSB0aGlzLm5hdmlnYXRpb24ucXVlcnlTZWxlY3RvckFsbCgnLm5hdmlnYXRpb25fX2xhYmVsJyk7XG4gICAgICAgICAgICBbXS5mb3JFYWNoLmNhbGwobGFiZWxzLCBsYWJlbCA9PiB7XG4gICAgICAgICAgICAgICAgbGFiZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLm9wZW5Ecm9wZG93bi5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnRvZ2dsZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5uYXZpZ2F0aW9uX190b2dnbGUnKTtcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy50b2dnbGVOYXZpZ2F0aW9uLmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgdG9nZ2xlTmF2aWdhdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLm5hdmlnYXRpb24uY2xhc3NMaXN0LnRvZ2dsZSgnbmF2aWdhdGlvbl9vcGVuJyk7XG4gICAgICAgICAgICB0aGlzLnRvZ2dsZS5ibHVyKCk7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC50b2dnbGUoJ25hdmlnYXRpb25fb3BlbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgb3BlbkRyb3Bkb3duIChldmVudCkge1xuICAgICAgICAgICAgZXZlbnQuY3VycmVudFRhcmdldC5jbGFzc0xpc3QudG9nZ2xlKCduYXZpZ2F0aW9uX19sYWJlbF9vcGVuJyk7XG4gICAgICAgICAgICBldmVudC5jdXJyZW50VGFyZ2V0Lm5leHRFbGVtZW50U2libGluZy5jbGFzc0xpc3QudG9nZ2xlKCduYXZpZ2F0aW9uX19jb250YWluZXJfb3BlbicpO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBuZXcgTmF2aWdhdGlvbjtcbn0pKCk7XG4iLCJcInVzZSBzdHJpY3RcIjtcbihmdW5jdGlvbiAoKSB7XG4gICAgY2xhc3MgU2Nyb2xsZXIge1xuXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgbGV0IHJlYWR5ID0gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgIT0gXCJsb2FkaW5nXCIpIHJldHVybiByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgKCkgPT4gcmVzb2x2ZSgpKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVhZHkudGhlbih0aGlzLmluaXQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpbml0KCkge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zY3JvbGxlcicpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5zY3JvbGxlciA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgICAgICAgICB0aGlzLndyYXBwZXIgPSB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoJy5zY3JvbGxlcl9fd3JhcHBlci1pbm5lcicpO1xuICAgICAgICAgICAgdGhpcy5zbGlkZXMgPSB0aGlzLndyYXBwZXIucXVlcnlTZWxlY3RvckFsbCgnLnNjcm9sbGVyX19zbGlkZScpO1xuICAgICAgICAgICAgdGhpcy5jb3VudCA9IHRoaXMuc2xpZGVzLmxlbmd0aDtcblxuICAgICAgICAgICAgaWYgKHRoaXMuY291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNjcm9sbGVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5zbGlkZXMpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLndyYXBwZXI7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2xpZGVzO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnNjcm9sbGVyO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNvdW50O1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5wYWdpbmF0b3IgPSB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoJy5zY3JvbGxlcl9fcGFnaW5hdG9yJyk7XG4gICAgICAgICAgICB0aGlzLnByZXZfYnV0dG9uID0gdGhpcy5zY3JvbGxlci5xdWVyeVNlbGVjdG9yKCcuc2Nyb2xsZXJfX3ByZXYnKTtcbiAgICAgICAgICAgIHRoaXMubmV4dF9idXR0b24gPSB0aGlzLnNjcm9sbGVyLnF1ZXJ5U2VsZWN0b3IoJy5zY3JvbGxlcl9fbmV4dCcpO1xuXG4gICAgICAgICAgICB0aGlzLnByZXZfYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5vcGVuUHJldlNsaWRlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5uZXh0X2J1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMub3Blbk5leHRTbGlkZS5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgbGV0IGZpcnN0X3NsaWRlID0gdGhpcy5zbGlkZXNbMF0uY2xvbmVOb2RlKHRydWUpXG4gICAgICAgICAgICAgICAgLCBsYXN0X3NsaWRlID0gdGhpcy5zbGlkZXNbdGhpcy5jb3VudCAtIDFdLmNsb25lTm9kZSh0cnVlKTtcblxuICAgICAgICAgICAgZmlyc3Rfc2xpZGUuY2xhc3NMaXN0LmFkZCgnY2xvbmVkJyk7XG4gICAgICAgICAgICBsYXN0X3NsaWRlLmNsYXNzTGlzdC5hZGQoJ2Nsb25lZCcpO1xuICAgICAgICAgICAgdGhpcy53cmFwcGVyLmFwcGVuZENoaWxkKGZpcnN0X3NsaWRlKTtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlci5pbnNlcnRCZWZvcmUobGFzdF9zbGlkZSwgdGhpcy5zbGlkZXNbMF0pO1xuXG4gICAgICAgICAgICBsZXQgaW5kZXggPSB0aGlzLmNvdW50O1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4LS0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZUJ1dHRvbih0aGlzLmNvdW50IC0gaW5kZXggLSAxKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X3BhZ2UgPSAwO1xuICAgICAgICAgICAgdGhpcy5wYWdpbmF0b3JfYnV0dG9ucyA9IHRoaXMucGFnaW5hdG9yLnF1ZXJ5U2VsZWN0b3JBbGwoJy5zY3JvbGxlcl9fcGFnZScpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbiA9IHRoaXMucGFnaW5hdG9yX2J1dHRvbnNbMF07XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfYnV0dG9uLmNsYXNzTGlzdC5hZGQoJ3Njcm9sbGVyX19wYWdlX2N1cnJlbnQnKTtcblxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgICAgIGxldCB0cmFuc0VuZEV2ZW50TmFtZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgICdXZWJraXRUcmFuc2l0aW9uJzogJ3dlYmtpdFRyYW5zaXRpb25FbmQnLFxuICAgICAgICAgICAgICAgICAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICAgICAgICAgICAgICAgJ09UcmFuc2l0aW9uJzogJ29UcmFuc2l0aW9uRW5kJyxcbiAgICAgICAgICAgICAgICAgICAgJ21zVHJhbnNpdGlvbic6ICdNU1RyYW5zaXRpb25FbmQnLFxuICAgICAgICAgICAgICAgICAgICAndHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLndyYXBwZXIuYWRkRXZlbnRMaXN0ZW5lcih0cmFuc0VuZEV2ZW50TmFtZXNbTW9kZXJuaXpyLnByZWZpeGVkKCd0cmFuc2l0aW9uJyldLCB0aGlzLmNoZWNrSW5kZXguYmluZCh0aGlzKSk7XG5cbiAgICAgICAgICAgIHRoaXMubW92ZVRvRmlyc3QoKS5kZWxheSgpLnRoZW4odGhpcy50dXJuT24uYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5yZXNpemVkLmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgbW92ZVRvQ3VycmVudCgpIHtcbiAgICAgICAgICAgIHRoaXMubW92ZSh0aGlzLmN1cnJlbnRfcGFnZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIG1vdmVUb0ZpcnN0KCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X3BhZ2UgPSAwO1xuICAgICAgICAgICAgdGhpcy5yZXBvc1NsaWRlKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIG1vdmVUb0xhc3QoKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfcGFnZSA9IHRoaXMuY291bnQgLSAxO1xuICAgICAgICAgICAgdGhpcy5yZXBvc1NsaWRlKCk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIHR1cm5PbigpIHtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtNb2Rlcm5penIucHJlZml4ZWQoJ3RyYW5zaXRpb24nKV0gPSBNb2Rlcm5penIucHJlZml4ZWQoJ3RyYW5zZm9ybScpICsgJyAuMjVzJztcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdHVybk9mZigpIHtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtNb2Rlcm5penIucHJlZml4ZWQoJ3RyYW5zaXRpb24nKV0gPSAnbm9uZSc7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuXG4gICAgICAgIG1vdmUoaW5kZXgpIHtcbiAgICAgICAgICAgIHRoaXMud3JhcHBlci5zdHlsZVtNb2Rlcm5penIucHJlZml4ZWQoJ3RyYW5zZm9ybScpXSA9ICd0cmFuc2xhdGVYKCcgKyAoLXRoaXMud3JhcHBlci5vZmZzZXRXaWR0aCAqIChpbmRleCArIDEpKSArICdweCknO1xuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgcmVzaXplZCgpIHtcbiAgICAgICAgICAgIHRoaXMudHVybk9mZigpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyNSk7XG4gICAgICAgICAgICB0aGlzLm1vdmVUb0N1cnJlbnQoKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjUpO1xuICAgICAgICAgICAgdGhpcy50dXJuT24oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFzeW5jIGRlbGF5KG1pbGxpc2Vjb25kcykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQocmVzb2x2ZSwgbWlsbGlzZWNvbmRzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgYXN5bmMgY2hlY2tJbmRleChldmVudCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudF9wYWdlID09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50dXJuT2ZmKCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyNSk7XG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlVG9MYXN0KCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyNSk7XG4gICAgICAgICAgICAgICAgdGhpcy50dXJuT24oKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5jdXJyZW50X3BhZ2UgPT0gdGhpcy5jb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMudHVybk9mZigpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjUpO1xuICAgICAgICAgICAgICAgIHRoaXMubW92ZVRvRmlyc3QoKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmRlbGF5KDI1KTtcbiAgICAgICAgICAgICAgICB0aGlzLnR1cm5PbigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zdG9wQW5pbWF0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBzdG9wQW5pbWF0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXJ0QW5pbWF0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5hbmltYXRpb24gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgZHJvcEFuaW1hdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKHRoaXMudGltZXIpICE9ICd1bmRlZmluZWQnKSBjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XG4gICAgICAgICAgICB0aGlzLnRpbWVyID0gc2V0VGltZW91dCh0aGlzLnN0b3BBbmltYXRpb24uYmluZCh0aGlzKSwgMzUwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNyZWF0ZUJ1dHRvbihpbmRleCkge1xuICAgICAgICAgICAgbGV0IGJ1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0JVVFRPTicpLCBzcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnU1BBTicpO1xuICAgICAgICAgICAgYnV0dG9uLnNldEF0dHJpYnV0ZSgndHlwZScsICdidXR0b24nKTtcbiAgICAgICAgICAgIGJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGFnZScsIGluZGV4KTtcbiAgICAgICAgICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdzY3JvbGxlcl9fcGFnZScpO1xuICAgICAgICAgICAgYnV0dG9uLmFwcGVuZENoaWxkKHNwYW4pO1xuICAgICAgICAgICAgYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5zY3JvbGxUb1NsaWRlLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy5wYWdpbmF0b3IuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wZW5TbGlkZSgpIHtcbiAgICAgICAgICAgIHRoaXMucmVwb3NTbGlkZSgpO1xuICAgICAgICAgICAgdGhpcy5kcm9wQW5pbWF0aW9uKCk7XG4gICAgICAgIH1cblxuICAgICAgICBvcGVuUHJldlNsaWRlKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAodGhpcy5hbmltYXRpb24gPT09IHRydWUpIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRBbmltYXRpb24oKTtcblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X3BhZ2UtLTtcbiAgICAgICAgICAgIHRoaXMucHJldl9idXR0b24uYmx1cigpO1xuICAgICAgICAgICAgdGhpcy5vcGVuU2xpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9wZW5OZXh0U2xpZGUoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmFuaW1hdGlvbiA9PT0gdHJ1ZSkgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy5zdGFydEFuaW1hdGlvbigpO1xuXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfcGFnZSsrO1xuICAgICAgICAgICAgdGhpcy5uZXh0X2J1dHRvbi5ibHVyKCk7XG4gICAgICAgICAgICB0aGlzLm9wZW5TbGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2Nyb2xsVG9TbGlkZShldmVudCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uID09PSB0cnVlKSByZXR1cm47XG4gICAgICAgICAgICB0aGlzLnN0YXJ0QW5pbWF0aW9uKCk7XG5cbiAgICAgICAgICAgIGxldCBidXR0b24gPSBldmVudC5jdXJyZW50VGFyZ2V0O1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X3BhZ2UgPSBwYXJzZUludChidXR0b24uZ2V0QXR0cmlidXRlKCdkYXRhLXBhZ2UnKSwgMTApO1xuICAgICAgICAgICAgYnV0dG9uLmJsdXIoKTtcbiAgICAgICAgICAgIHRoaXMub3BlblNsaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXBvc1NsaWRlKCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCdzY3JvbGxlcl9fcGFnZV9jdXJyZW50JywgZmFsc2UpO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbiA9IHRoaXMucGFnaW5hdG9yX2J1dHRvbnNbTWF0aC5taW4oTWF0aC5tYXgodGhpcy5jdXJyZW50X3BhZ2UsIDApLCB0aGlzLmNvdW50IC0gMSldO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCdzY3JvbGxlcl9fcGFnZV9jdXJyZW50JywgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLm1vdmUodGhpcy5jdXJyZW50X3BhZ2UpO1xuICAgICAgICB9XG5cbiAgICB9XG4gICAgbmV3IFNjcm9sbGVyO1xufSkoKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuKGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIEBjbGFzcyBDbGFzcyBoYW5kbGUgc3Vic2NyaXB0aW9uIHByb2Nlc3NcbiAgICAgKi9cbiAgICBjbGFzcyBTdWJzY3JpYmUge1xuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIFN0YXJ0IGluaXRpYWxpemF0aW9uIG9uIGRvbWxvYWRcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqL1xuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgICAgIGxldCByZWFkeSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQucmVhZHlTdGF0ZSAhPSBcImxvYWRpbmdcIikgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCAoKSA9PiByZXNvbHZlKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZWFkeS50aGVuKHRoaXMuaW5pdC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gQWRkaW5nIGV2ZW50cyBhbmQgcHJvcGVydGllc1xuICAgICAgICAgKi9cbiAgICAgICAgaW5pdCgpIHtcbiAgICAgICAgICAgIHRoaXMuZm9ybSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5zdWJzY3JpYmUnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmZvcm0gPT09IG51bGwpIHJldHVybjtcblxuICAgICAgICAgICAgdGhpcy5pbnB1dCA9IHRoaXMuZm9ybS5xdWVyeVNlbGVjdG9yKCcuc3Vic2NyaWJlX19lbWFpbCcpO1xuICAgICAgICAgICAgdGhpcy5zdWNjZXNzX21lc3NhZ2UgPSB0aGlzLmZvcm0ucXVlcnlTZWxlY3RvcignLnN1YnNjcmliZV9fc3RhdGVfc3VjY2VzcycpO1xuICAgICAgICAgICAgdGhpcy5zdWNjZXNzX2ZhaWwgPSB0aGlzLmZvcm0ucXVlcnlTZWxlY3RvcignLnN1YnNjcmliZV9fc3RhdGVfZmFpbCcpO1xuICAgICAgICAgICAgdGhpcy5zdWNjZXNzX3Byb2dyZXNzID0gdGhpcy5mb3JtLnF1ZXJ5U2VsZWN0b3IoJy5zdWJzY3JpYmVfX3N0YXRlX2luLXByb2dyZXNzJyk7XG5cbiAgICAgICAgICAgIHRoaXMuZm9ybS5zZXRBdHRyaWJ1dGUoJ25vdmFsaWRhdGUnLCB0cnVlKTtcbiAgICAgICAgICAgIHRoaXMuZm9ybS5hZGRFdmVudExpc3RlbmVyKCdzdWJtaXQnLCB0aGlzLnZhbGlkYXRlRm9ybS5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gVmFsaWRhdGluZyB1c2VyIGlucHV0XG4gICAgICAgICAqL1xuICAgICAgICB2YWxpZGF0ZUZvcm0oZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGxldCBlbWFpbF9yZWdleCA9IG5ldyBSZWdFeHAoXCJeKFthLXpBLVowLTlfXFwuXFwtXSkrXFxAKChbYS16QS1aMC05XFwtXSkrXFwuKSsoW2EtekEtWjAtOV17Miw0fSkrJFwiKTtcbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAodGhpcy5pbnB1dC52YWx1ZS50cmltKCkubGVuZ3RoID4gMCAmJiBlbWFpbF9yZWdleC50ZXN0KHRoaXMuaW5wdXQudmFsdWUudHJpbSgpKSA9PT0gZmFsc2UgfHwgdGhpcy5pbnB1dC52YWx1ZS50cmltKCkubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgICAgIHx8ICh0aGlzLmlucHV0LnZhbHVlLnRyaW0oKS5sZW5ndGggPT09IDApXG4gICAgICAgICAgICApe1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3RhdGUoJ2ZhaWwnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBET05FID0gNFxuICAgICAgICAgICAgICAgICwgT0sgPSAyMDBcbiAgICAgICAgICAgICAgICAsIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICAgICAgICAgICAgLCBzZW5kZXIgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4aHIub3BlbignUE9TVCcsIHRoaXMuZm9ybS5nZXRBdHRyaWJ1dGUoJ2FjdGlvbicpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5zZW5kKG5ldyBGb3JtRGF0YSh0aGlzLmZvcm0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSBET05FKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZm9ybS5yZXNldCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSBPSykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh4aHIuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKHhoci5jb2RlICsgJzogJyArIHhoci5zdGF0dXNUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKCdwcm9ncmVzcycpO1xuICAgICAgICAgICAgc2VuZGVyLnRoZW4odGhpcy5zdWNjZXNzLmJpbmQodGhpcykpLmNhdGNoKHRoaXMuZmFpbC5iaW5kKHRoaXMpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gcmVxdWVzdCBoYXZlIHN1Y2NlZWRlZFxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBzZXJ2ZXIgYW5zd2VyXG4gICAgICAgICAqL1xuICAgICAgICBzdWNjZXNzIChtZXNzYWdlKSB7XG4gICAgICAgICAgICB0aGlzLnNldFN0YXRlKCdzdWNjZXNzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIHJlcXVlc3QgaGF2ZSBmYWlsZWRcbiAgICAgICAgICogQHBhcmFtIHtFcnJvcn0gZXJyb3IgZXJyb3Igb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBmYWlsIChlcnJvcikge1xuICAgICAgICAgICAgdGhpcy5zZXRTdGF0ZSgnZmFpbCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXNjcmlwdGlvbiBTZXQgc3Vic2NyaXB0aW9uIHN0YXRlXG4gICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzdGF0ZSBuZXcgc3RhdGVcbiAgICAgICAgICovXG4gICAgICAgIHNldFN0YXRlIChzdGF0ZSkge1xuXG4gICAgICAgICAgICBsZXQgZmFpbCA9IGZhbHNlLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3MgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcm9ncmVzcyA9IGZhbHNlO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcImZhaWxcIjpcbiAgICAgICAgICAgICAgICAgICAgZmFpbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXQuZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcInN1Y2Nlc3NcIjpcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaW5wdXQuYmx1cigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwicHJvZ3Jlc3NcIjpcbiAgICAgICAgICAgICAgICAgICAgcHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5mb3JtLmNsYXNzTGlzdC50b2dnbGUoJ3N1YnNjcmliZV9mYWlsJywgZmFpbCk7XG4gICAgICAgICAgICB0aGlzLmZvcm0uY2xhc3NMaXN0LnRvZ2dsZSgnc3Vic2NyaWJlX3N1Y2Nlc3MnLCBzdWNjZXNzKTtcbiAgICAgICAgICAgIHRoaXMuZm9ybS5jbGFzc0xpc3QudG9nZ2xlKCdzdWJzY3JpYmVfcHJvZ3Jlc3MnLCBwcm9ncmVzcyk7XG4gICAgICAgIH1cblxuICAgIH1cbiAgICBuZXcgU3Vic2NyaWJlO1xufSkoKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuKGZ1bmN0aW9uKCkge1xuICAgIC8qKlxuICAgICAqIEBjbGFzcyBDbGFzcyBoYW5kbGUgdGFicyBsb2FkaW5nXG4gICAgICovXG4gICAgY2xhc3MgVGFicyB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAZGVzY3JpcHRpb24gU3RhcnQgaW5pdGlhbGl6YXRpb24gb24gZG9tbG9hZFxuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICovXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgbGV0IHJlYWR5ID0gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5yZWFkeVN0YXRlICE9IFwibG9hZGluZ1wiKSByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsICgpID0+IHJlc29sdmUoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlYWR5LnRoZW4odGhpcy5pbml0LmJpbmQodGhpcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBkZXNjcmlwdGlvbiBBZGRpbmcgZXZlbnRzIGFuZCBwcm9wZXJ0aWVzXG4gICAgICAgICAqL1xuICAgICAgICBpbml0KCkge1xuICAgICAgICAgICAgdGhpcy53aWRnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudGFicycpO1xuICAgICAgICAgICAgaWYgKHRoaXMud2lkZ2V0ID09PSBudWxsKSByZXR1cm47XG5cbiAgICAgICAgICAgIGxldCBET05FID0gNFxuICAgICAgICAgICAgICAgICwgT0sgPSAyMDBcbiAgICAgICAgICAgICAgICAsIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICAgICAgICAgICAgLCBzZW5kZXIgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4aHIub3BlbignR0VUJywgdGhpcy53aWRnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLXVybCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4aHIuc2VuZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4aHIucmVhZHlTdGF0ZSA9PT0gRE9ORSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IE9LKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh4aHIuc3RhdHVzVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoeGhyLmNvZGUgKyAnOiAnICsgeGhyLnN0YXR1c1RleHQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNlbmRlci50aGVuKHRoaXMuYnVpbGQuYmluZCh0aGlzKSkuY2F0Y2godGhpcy5mb29fYnVpbGQuYmluZCh0aGlzKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIEZvbyBidWlsZCB3aWRnZXRcbiAgICAgICAgICovXG4gICAgICAgIGZvb19idWlsZCAoKSB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkKCdbe1wiVGl0bGVcIjpcIldvbWVuXCIsXCJDb250ZW50XCI6XCIxMTo1NDo1NSBMb3JlbSBpcHN1bSBkb2xvciBzaXQgYW1ldCwgY29uc2VjdGV0dXIgYWRpcGlzY2luZyBlbGl0LiBNYXVyaXMgc2VtIGxpZ3VsYSwgbHVjdHVzIGV0IGFsaXF1ZXQgZWdldCwgdWx0cmljZXMgZXUgc2VtLiBGdXNjZSBlbmltIGxhY3VzLCBzb2RhbGVzIHZlbCBzb2xsaWNpdHVkaW4gdml0YWUsIHByZXRpdW0gbm9uIHVybmEuIFN1c3BlbmRpc3NlIHNjZWxlcmlzcXVlIGxpZ3VsYSBhdCBudWxsYSBncmF2aWRhIGZyaW5naWxsYS4gVml2YW11cyBzZWQgZmVybWVudHVtIHNlbS4gQWVuZWFuIHZvbHV0cGF0IHBvcnRhIGR1aSwgdmVsIHRlbXBvciBkaWFtLiBDdXJhYml0dXIgbm9uIGNvbnZhbGxpcyBkaWFtLiBVdCBtYXR0aXMgbm9uIGFudGUgbmVjIHBoYXJldHJhLiBQcmFlc2VudCBwdWx2aW5hciBtb2xsaXMgdmVsaXQgc2l0IGFtZXQgYWxpcXVhbS4gTW9yYmkgdnVscHV0YXRlIHRpbmNpZHVudCBxdWFtIHF1aXMgdml2ZXJyYS4gRnVzY2UgYmliZW5kdW0gcHVsdmluYXIgdHVycGlzIGV1IHRyaXN0aXF1ZS4gUHJvaW4gZXQgc3VzY2lwaXQgc2FwaWVuLlxcblxcblBlbGxlbnRlc3F1ZSB0cmlzdGlxdWUgYWNjdW1zYW4gZHVpLiBEb25lYyBldSBtYXR0aXMgZWxpdC4gRXRpYW0gbmlzbCBmZWxpcywgaW1wZXJkaWV0IHZpdGFlIHRlbXBvciBzZWQsIGRpZ25pc3NpbSBhdCBhcmN1LiBFdGlhbSBlbGVpZmVuZCB1cm5hIHV0IGxvcmVtIGNvbmRpbWVudHVtIHVsdHJpY2llcy4gSW4gdml2ZXJyYSBxdWlzIG1ldHVzIHV0IGltcGVyZGlldC4gTW9yYmkgZW5pbSBvZGlvLCBjb25kaW1lbnR1bSB1dCBuaWJoIHNpdCBhbWV0LCBibGFuZGl0IG1vbGxpcyB0ZWxsdXMuIE51bGxhbSB0aW5jaWR1bnQgZGlhbSBwdXJ1cywgc2VkIHBvc3VlcmUgbGFjdXMgbG9ib3J0aXMgaWQuIE51bGxhbSB2ZXN0aWJ1bHVtIG1hdXJpcyBxdWlzIG5pc2wgY29tbW9kbywgcXVpcyB1bHRyaWNpZXMgdG9ydG9yIGJsYW5kaXQuIE1vcmJpIGhlbmRyZXJpdCB1dCBqdXN0byBldCB2ZW5lbmF0aXMuIEludGVnZXIgcnV0cnVtIG1hc3NhIHZlbCBtaSBlbGVpZmVuZCBydXRydW0uIFZlc3RpYnVsdW0gYW50ZSBpcHN1bSBwcmltaXMgaW4gZmF1Y2lidXMgb3JjaSBsdWN0dXMgZXQgdWx0cmljZXMgcG9zdWVyZSBjdWJpbGlhIEN1cmFlOyBTZWQgbW9sZXN0aWUgY29uc2VjdGV0dXIgdmVsaXQgdXQgdml2ZXJyYS4gUGhhc2VsbHVzIHR1cnBpcyBvZGlvLCBwb3N1ZXJlIGEgdGVsbHVzIGVnZXQsIGludGVyZHVtIGRpY3R1bSBudWxsYS4gRG9uZWMgcG9ydGEgZXN0IGxhY2luaWEgbG9ib3J0aXMgc2FnaXR0aXMuIFV0IHV0IGlwc3VtIHRlbXB1cywgZmVybWVudHVtIGxpYmVybyBldCwgdGluY2lkdW50IGFyY3UuIE51bmMgYSBkaWFtIHVybmEuIFBoYXNlbGx1cyBsYWNpbmlhLCBmZWxpcyBhIGZlcm1lbnR1bSBsYW9yZWV0LCBpcHN1bSB2ZWxpdCBsdWN0dXMgbWksIHF1aXMgcG9ydHRpdG9yIG1ldHVzIGVyb3Mgdml0YWUgb3JjaS4gUGhhc2VsbHVzIGRhcGlidXMgbnVsbGEgdWx0cmljaWVzIGFyY3UgZ3JhdmlkYSBvcm5hcmUuIER1aXMgdml0YWUgcG9zdWVyZSBlbmltLiBJbiBxdWlzIGZldWdpYXQgbmliaC4gQWxpcXVhbSBkaWN0dW0gdmVsaXQgc3VzY2lwaXQgbGVvIGxvYm9ydGlzIG9ybmFyZS4gRnVzY2UgcHJldGl1bSB0ZWxsdXMgc2VkIGZlbGlzIGZldWdpYXQgcmhvbmN1cyBldSBldCBtYWduYS4gQWxpcXVhbSBlcmF0IHZvbHV0cGF0LiBVdCBpcHN1bSBlbmltLCBtb2xlc3RpZSBpZCBtaSBub24sIGxhb3JlZXQgcGxhY2VyYXQgdG9ydG9yLiBEb25lYyBjb21tb2RvLCBpcHN1bSBub24gZGlnbmlzc2ltIGNvbmRpbWVudHVtLCB0b3J0b3Igb3JjaSBzYWdpdHRpcyBlcm9zLCBhdCBoZW5kcmVyaXQgbGlndWxhIGVsaXQgaW4gc2FwaWVuLlxcblxcbkludGVnZXIgYWxpcXVldCBxdWFtIHNlbSwgZWdldCBhbGlxdWV0IG51bGxhIGNvbnNlcXVhdCBhdC4gQWVuZWFuIGNvbW1vZG8gYW50ZSBub24gc29kYWxlcyBwb3N1ZXJlLiBDcmFzIGNvbW1vZG8gdHVycGlzIG5lYyBzb2RhbGVzIHBlbGxlbnRlc3F1ZS4gRG9uZWMgdGluY2lkdW50IG1hdXJpcyBkdWksIGV0IGFkaXBpc2NpbmcgdG9ydG9yIGdyYXZpZGEgYS4gRXRpYW0gZWdldCB1cm5hIGludGVyZHVtIG1hc3NhIHN1c2NpcGl0IHZlc3RpYnVsdW0gbmVjIGF0IGFudGUuIEFlbmVhbiBwaGFyZXRyYSBwbGFjZXJhdCBsb2JvcnRpcy4gTnVsbGFtIHRpbmNpZHVudCBpbnRlcmR1bSBjb25ndWUuIFV0IG5vbiBlbmltIG1pLiBJbiBzaXQgYW1ldCBqdXN0byB2ZWhpY3VsYSwgcG9zdWVyZSBlbmltIGV1LCBlZ2VzdGFzIGxlby4gTWFlY2VuYXMgYmxhbmRpdCB1cm5hIG51bmMsIGV0IGVsZW1lbnR1bSBlc3QgZXVpc21vZCBub24uIEluIGltcGVyZGlldCBkaWFtIG5lYyBhcmN1IGN1cnN1cyBwb3J0YS4gTW9yYmkgY29uc2VxdWF0IGRpYW0gYXQgcXVhbSBjb252YWxsaXMsIHZlbCBydXRydW0gbnVsbGEgc2NlbGVyaXNxdWUuXFxuXFxuTW9yYmkgYWxpcXVhbSBvcmNpIHF1aXMgbmliaCBlZ2VzdGFzLCBpbiBzdXNjaXBpdCBlcmF0IHZvbHV0cGF0LiBEb25lYyBhdCBhY2N1bXNhbiBhdWd1ZSwgc2VkIGVsZW1lbnR1bSBsaWJlcm8uIERvbmVjIGluIGZlcm1lbnR1bSBtYXVyaXMuIFZpdmFtdXMgdmVzdGlidWx1bSwgbGlndWxhIGVnZXQgbW9sZXN0aWUgdmVoaWN1bGEsIHJpc3VzIGFudGUgZmF1Y2lidXMgbGliZXJvLCBldCBwZWxsZW50ZXNxdWUgaXBzdW0gdHVycGlzIHNvbGxpY2l0dWRpbiBlcmF0LiBOdWxsYSBmYWNpbGlzaS4gVml2YW11cyBxdWlzIHBvcnRhIGVyYXQuIFBlbGxlbnRlc3F1ZSB2aXRhZSBydXRydW0gdHVycGlzLiBQZWxsZW50ZXNxdWUgaGFiaXRhbnQgbW9yYmkgdHJpc3RpcXVlIHNlbmVjdHVzIGV0IG5ldHVzIGV0IG1hbGVzdWFkYSBmYW1lcyBhYyB0dXJwaXMgZWdlc3Rhcy4gTnVsbGEgc2l0IGFtZXQgYWxpcXVldCBzZW0sIHZlbCB2ZW5lbmF0aXMgbnVsbGEuIFN1c3BlbmRpc3NlIGFjIHRvcnRvciBpYWN1bGlzLCBsb2JvcnRpcyBzYXBpZW4gbm9uLCBzb2RhbGVzIHRvcnRvci4gU3VzcGVuZGlzc2UgaXBzdW0gYXJjdSwgbG9ib3J0aXMgYWMgcGxhY2VyYXQgcXVpcywgdmFyaXVzIG5lYyBxdWFtLiBRdWlzcXVlIHZlaGljdWxhIG1pIHV0IGRpYW0gdWxsYW1jb3JwZXIgYmxhbmRpdC5cIn0se1wiVGl0bGVcIjpcIk1lblwiLFwiQ29udGVudFwiOlwiMjAxNTExMTIgTG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIGNvbnNlY3RldHVyIGFkaXBpc2NpbmcgZWxpdC4gTWF1cmlzIHNlbSBsaWd1bGEsIGx1Y3R1cyBldCBhbGlxdWV0IGVnZXQsIHVsdHJpY2VzIGV1IHNlbS4gRnVzY2UgZW5pbSBsYWN1cywgc29kYWxlcyB2ZWwgc29sbGljaXR1ZGluIHZpdGFlLCBwcmV0aXVtIG5vbiB1cm5hLiBTdXNwZW5kaXNzZSBzY2VsZXJpc3F1ZSBsaWd1bGEgYXQgbnVsbGEgZ3JhdmlkYSBmcmluZ2lsbGEuIFZpdmFtdXMgc2VkIGZlcm1lbnR1bSBzZW0uIEFlbmVhbiB2b2x1dHBhdCBwb3J0YSBkdWksIHZlbCB0ZW1wb3IgZGlhbS4gQ3VyYWJpdHVyIG5vbiBjb252YWxsaXMgZGlhbS4gVXQgbWF0dGlzIG5vbiBhbnRlIG5lYyBwaGFyZXRyYS4gUHJhZXNlbnQgcHVsdmluYXIgbW9sbGlzIHZlbGl0IHNpdCBhbWV0IGFsaXF1YW0uIE1vcmJpIHZ1bHB1dGF0ZSB0aW5jaWR1bnQgcXVhbSBxdWlzIHZpdmVycmEuIEZ1c2NlIGJpYmVuZHVtIHB1bHZpbmFyIHR1cnBpcyBldSB0cmlzdGlxdWUuIFByb2luIGV0IHN1c2NpcGl0IHNhcGllbi5cXG5cXG5QZWxsZW50ZXNxdWUgdHJpc3RpcXVlIGFjY3Vtc2FuIGR1aS4gRG9uZWMgZXUgbWF0dGlzIGVsaXQuIEV0aWFtIG5pc2wgZmVsaXMsIGltcGVyZGlldCB2aXRhZSB0ZW1wb3Igc2VkLCBkaWduaXNzaW0gYXQgYXJjdS4gRXRpYW0gZWxlaWZlbmQgdXJuYSB1dCBsb3JlbSBjb25kaW1lbnR1bSB1bHRyaWNpZXMuIEluIHZpdmVycmEgcXVpcyBtZXR1cyB1dCBpbXBlcmRpZXQuIE1vcmJpIGVuaW0gb2RpbywgY29uZGltZW50dW0gdXQgbmliaCBzaXQgYW1ldCwgYmxhbmRpdCBtb2xsaXMgdGVsbHVzLiBOdWxsYW0gdGluY2lkdW50IGRpYW0gcHVydXMsIHNlZCBwb3N1ZXJlIGxhY3VzIGxvYm9ydGlzIGlkLiBOdWxsYW0gdmVzdGlidWx1bSBtYXVyaXMgcXVpcyBuaXNsIGNvbW1vZG8sIHF1aXMgdWx0cmljaWVzIHRvcnRvciBibGFuZGl0LiBNb3JiaSBoZW5kcmVyaXQgdXQganVzdG8gZXQgdmVuZW5hdGlzLiBJbnRlZ2VyIHJ1dHJ1bSBtYXNzYSB2ZWwgbWkgZWxlaWZlbmQgcnV0cnVtLiBWZXN0aWJ1bHVtIGFudGUgaXBzdW0gcHJpbWlzIGluIGZhdWNpYnVzIG9yY2kgbHVjdHVzIGV0IHVsdHJpY2VzIHBvc3VlcmUgY3ViaWxpYSBDdXJhZTsgU2VkIG1vbGVzdGllIGNvbnNlY3RldHVyIHZlbGl0IHV0IHZpdmVycmEuIFBoYXNlbGx1cyB0dXJwaXMgb2RpbywgcG9zdWVyZSBhIHRlbGx1cyBlZ2V0LCBpbnRlcmR1bSBkaWN0dW0gbnVsbGEuIERvbmVjIHBvcnRhIGVzdCBsYWNpbmlhIGxvYm9ydGlzIHNhZ2l0dGlzLiBVdCB1dCBpcHN1bSB0ZW1wdXMsIGZlcm1lbnR1bSBsaWJlcm8gZXQsIHRpbmNpZHVudCBhcmN1LiBOdW5jIGEgZGlhbSB1cm5hLiBQaGFzZWxsdXMgbGFjaW5pYSwgZmVsaXMgYSBmZXJtZW50dW0gbGFvcmVldCwgaXBzdW0gdmVsaXQgbHVjdHVzIG1pLCBxdWlzIHBvcnR0aXRvciBtZXR1cyBlcm9zIHZpdGFlIG9yY2kuIFBoYXNlbGx1cyBkYXBpYnVzIG51bGxhIHVsdHJpY2llcyBhcmN1IGdyYXZpZGEgb3JuYXJlLiBEdWlzIHZpdGFlIHBvc3VlcmUgZW5pbS4gSW4gcXVpcyBmZXVnaWF0IG5pYmguIEFsaXF1YW0gZGljdHVtIHZlbGl0IHN1c2NpcGl0IGxlbyBsb2JvcnRpcyBvcm5hcmUuIEZ1c2NlIHByZXRpdW0gdGVsbHVzIHNlZCBmZWxpcyBmZXVnaWF0IHJob25jdXMgZXUgZXQgbWFnbmEuIEFsaXF1YW0gZXJhdCB2b2x1dHBhdC4gVXQgaXBzdW0gZW5pbSwgbW9sZXN0aWUgaWQgbWkgbm9uLCBsYW9yZWV0IHBsYWNlcmF0IHRvcnRvci4gRG9uZWMgY29tbW9kbywgaXBzdW0gbm9uIGRpZ25pc3NpbSBjb25kaW1lbnR1bSwgdG9ydG9yIG9yY2kgc2FnaXR0aXMgZXJvcywgYXQgaGVuZHJlcml0IGxpZ3VsYSBlbGl0IGluIHNhcGllbi5cXG5cXG5JbnRlZ2VyIGFsaXF1ZXQgcXVhbSBzZW0sIGVnZXQgYWxpcXVldCBudWxsYSBjb25zZXF1YXQgYXQuIEFlbmVhbiBjb21tb2RvIGFudGUgbm9uIHNvZGFsZXMgcG9zdWVyZS4gQ3JhcyBjb21tb2RvIHR1cnBpcyBuZWMgc29kYWxlcyBwZWxsZW50ZXNxdWUuIERvbmVjIHRpbmNpZHVudCBtYXVyaXMgZHVpLCBldCBhZGlwaXNjaW5nIHRvcnRvciBncmF2aWRhIGEuIEV0aWFtIGVnZXQgdXJuYSBpbnRlcmR1bSBtYXNzYSBzdXNjaXBpdCB2ZXN0aWJ1bHVtIG5lYyBhdCBhbnRlLiBBZW5lYW4gcGhhcmV0cmEgcGxhY2VyYXQgbG9ib3J0aXMuIE51bGxhbSB0aW5jaWR1bnQgaW50ZXJkdW0gY29uZ3VlLiBVdCBub24gZW5pbSBtaS4gSW4gc2l0IGFtZXQganVzdG8gdmVoaWN1bGEsIHBvc3VlcmUgZW5pbSBldSwgZWdlc3RhcyBsZW8uIE1hZWNlbmFzIGJsYW5kaXQgdXJuYSBudW5jLCBldCBlbGVtZW50dW0gZXN0IGV1aXNtb2Qgbm9uLiBJbiBpbXBlcmRpZXQgZGlhbSBuZWMgYXJjdSBjdXJzdXMgcG9ydGEuIE1vcmJpIGNvbnNlcXVhdCBkaWFtIGF0IHF1YW0gY29udmFsbGlzLCB2ZWwgcnV0cnVtIG51bGxhIHNjZWxlcmlzcXVlLlxcblxcbk1vcmJpIGFsaXF1YW0gb3JjaSBxdWlzIG5pYmggZWdlc3RhcywgaW4gc3VzY2lwaXQgZXJhdCB2b2x1dHBhdC4gRG9uZWMgYXQgYWNjdW1zYW4gYXVndWUsIHNlZCBlbGVtZW50dW0gbGliZXJvLiBEb25lYyBpbiBmZXJtZW50dW0gbWF1cmlzLiBWaXZhbXVzIHZlc3RpYnVsdW0sIGxpZ3VsYSBlZ2V0IG1vbGVzdGllIHZlaGljdWxhLCByaXN1cyBhbnRlIGZhdWNpYnVzIGxpYmVybywgZXQgcGVsbGVudGVzcXVlIGlwc3VtIHR1cnBpcyBzb2xsaWNpdHVkaW4gZXJhdC4gTnVsbGEgZmFjaWxpc2kuIFZpdmFtdXMgcXVpcyBwb3J0YSBlcmF0LiBQZWxsZW50ZXNxdWUgdml0YWUgcnV0cnVtIHR1cnBpcy4gUGVsbGVudGVzcXVlIGhhYml0YW50IG1vcmJpIHRyaXN0aXF1ZSBzZW5lY3R1cyBldCBuZXR1cyBldCBtYWxlc3VhZGEgZmFtZXMgYWMgdHVycGlzIGVnZXN0YXMuIE51bGxhIHNpdCBhbWV0IGFsaXF1ZXQgc2VtLCB2ZWwgdmVuZW5hdGlzIG51bGxhLiBTdXNwZW5kaXNzZSBhYyB0b3J0b3IgaWFjdWxpcywgbG9ib3J0aXMgc2FwaWVuIG5vbiwgc29kYWxlcyB0b3J0b3IuIFN1c3BlbmRpc3NlIGlwc3VtIGFyY3UsIGxvYm9ydGlzIGFjIHBsYWNlcmF0IHF1aXMsIHZhcml1cyBuZWMgcXVhbS4gUXVpc3F1ZSB2ZWhpY3VsYSBtaSB1dCBkaWFtIHVsbGFtY29ycGVyIGJsYW5kaXQuXCJ9LHtcIlRpdGxlXCI6XCJKdW5pb3JcIixcIkNvbnRlbnRcIjpcIk5vdmVtYmVyIDEyLCAyMDE1LCAxMTo1NCBhbSBMb3JlbSBpcHN1bSBkb2xvciBzaXQgYW1ldCwgY29uc2VjdGV0dXIgYWRpcGlzY2luZyBlbGl0LiBNYXVyaXMgc2VtIGxpZ3VsYSwgbHVjdHVzIGV0IGFsaXF1ZXQgZWdldCwgdWx0cmljZXMgZXUgc2VtLiBGdXNjZSBlbmltIGxhY3VzLCBzb2RhbGVzIHZlbCBzb2xsaWNpdHVkaW4gdml0YWUsIHByZXRpdW0gbm9uIHVybmEuIFN1c3BlbmRpc3NlIHNjZWxlcmlzcXVlIGxpZ3VsYSBhdCBudWxsYSBncmF2aWRhIGZyaW5naWxsYS4gVml2YW11cyBzZWQgZmVybWVudHVtIHNlbS4gQWVuZWFuIHZvbHV0cGF0IHBvcnRhIGR1aSwgdmVsIHRlbXBvciBkaWFtLiBDdXJhYml0dXIgbm9uIGNvbnZhbGxpcyBkaWFtLiBVdCBtYXR0aXMgbm9uIGFudGUgbmVjIHBoYXJldHJhLiBQcmFlc2VudCBwdWx2aW5hciBtb2xsaXMgdmVsaXQgc2l0IGFtZXQgYWxpcXVhbS4gTW9yYmkgdnVscHV0YXRlIHRpbmNpZHVudCBxdWFtIHF1aXMgdml2ZXJyYS4gRnVzY2UgYmliZW5kdW0gcHVsdmluYXIgdHVycGlzIGV1IHRyaXN0aXF1ZS4gUHJvaW4gZXQgc3VzY2lwaXQgc2FwaWVuLlxcblxcblBlbGxlbnRlc3F1ZSB0cmlzdGlxdWUgYWNjdW1zYW4gZHVpLiBEb25lYyBldSBtYXR0aXMgZWxpdC4gRXRpYW0gbmlzbCBmZWxpcywgaW1wZXJkaWV0IHZpdGFlIHRlbXBvciBzZWQsIGRpZ25pc3NpbSBhdCBhcmN1LiBFdGlhbSBlbGVpZmVuZCB1cm5hIHV0IGxvcmVtIGNvbmRpbWVudHVtIHVsdHJpY2llcy4gSW4gdml2ZXJyYSBxdWlzIG1ldHVzIHV0IGltcGVyZGlldC4gTW9yYmkgZW5pbSBvZGlvLCBjb25kaW1lbnR1bSB1dCBuaWJoIHNpdCBhbWV0LCBibGFuZGl0IG1vbGxpcyB0ZWxsdXMuIE51bGxhbSB0aW5jaWR1bnQgZGlhbSBwdXJ1cywgc2VkIHBvc3VlcmUgbGFjdXMgbG9ib3J0aXMgaWQuIE51bGxhbSB2ZXN0aWJ1bHVtIG1hdXJpcyBxdWlzIG5pc2wgY29tbW9kbywgcXVpcyB1bHRyaWNpZXMgdG9ydG9yIGJsYW5kaXQuIE1vcmJpIGhlbmRyZXJpdCB1dCBqdXN0byBldCB2ZW5lbmF0aXMuIEludGVnZXIgcnV0cnVtIG1hc3NhIHZlbCBtaSBlbGVpZmVuZCBydXRydW0uIFZlc3RpYnVsdW0gYW50ZSBpcHN1bSBwcmltaXMgaW4gZmF1Y2lidXMgb3JjaSBsdWN0dXMgZXQgdWx0cmljZXMgcG9zdWVyZSBjdWJpbGlhIEN1cmFlOyBTZWQgbW9sZXN0aWUgY29uc2VjdGV0dXIgdmVsaXQgdXQgdml2ZXJyYS4gUGhhc2VsbHVzIHR1cnBpcyBvZGlvLCBwb3N1ZXJlIGEgdGVsbHVzIGVnZXQsIGludGVyZHVtIGRpY3R1bSBudWxsYS4gRG9uZWMgcG9ydGEgZXN0IGxhY2luaWEgbG9ib3J0aXMgc2FnaXR0aXMuIFV0IHV0IGlwc3VtIHRlbXB1cywgZmVybWVudHVtIGxpYmVybyBldCwgdGluY2lkdW50IGFyY3UuIE51bmMgYSBkaWFtIHVybmEuIFBoYXNlbGx1cyBsYWNpbmlhLCBmZWxpcyBhIGZlcm1lbnR1bSBsYW9yZWV0LCBpcHN1bSB2ZWxpdCBsdWN0dXMgbWksIHF1aXMgcG9ydHRpdG9yIG1ldHVzIGVyb3Mgdml0YWUgb3JjaS4gUGhhc2VsbHVzIGRhcGlidXMgbnVsbGEgdWx0cmljaWVzIGFyY3UgZ3JhdmlkYSBvcm5hcmUuIER1aXMgdml0YWUgcG9zdWVyZSBlbmltLiBJbiBxdWlzIGZldWdpYXQgbmliaC4gQWxpcXVhbSBkaWN0dW0gdmVsaXQgc3VzY2lwaXQgbGVvIGxvYm9ydGlzIG9ybmFyZS4gRnVzY2UgcHJldGl1bSB0ZWxsdXMgc2VkIGZlbGlzIGZldWdpYXQgcmhvbmN1cyBldSBldCBtYWduYS4gQWxpcXVhbSBlcmF0IHZvbHV0cGF0LiBVdCBpcHN1bSBlbmltLCBtb2xlc3RpZSBpZCBtaSBub24sIGxhb3JlZXQgcGxhY2VyYXQgdG9ydG9yLiBEb25lYyBjb21tb2RvLCBpcHN1bSBub24gZGlnbmlzc2ltIGNvbmRpbWVudHVtLCB0b3J0b3Igb3JjaSBzYWdpdHRpcyBlcm9zLCBhdCBoZW5kcmVyaXQgbGlndWxhIGVsaXQgaW4gc2FwaWVuLlxcblxcbkludGVnZXIgYWxpcXVldCBxdWFtIHNlbSwgZWdldCBhbGlxdWV0IG51bGxhIGNvbnNlcXVhdCBhdC4gQWVuZWFuIGNvbW1vZG8gYW50ZSBub24gc29kYWxlcyBwb3N1ZXJlLiBDcmFzIGNvbW1vZG8gdHVycGlzIG5lYyBzb2RhbGVzIHBlbGxlbnRlc3F1ZS4gRG9uZWMgdGluY2lkdW50IG1hdXJpcyBkdWksIGV0IGFkaXBpc2NpbmcgdG9ydG9yIGdyYXZpZGEgYS4gRXRpYW0gZWdldCB1cm5hIGludGVyZHVtIG1hc3NhIHN1c2NpcGl0IHZlc3RpYnVsdW0gbmVjIGF0IGFudGUuIEFlbmVhbiBwaGFyZXRyYSBwbGFjZXJhdCBsb2JvcnRpcy4gTnVsbGFtIHRpbmNpZHVudCBpbnRlcmR1bSBjb25ndWUuIFV0IG5vbiBlbmltIG1pLiBJbiBzaXQgYW1ldCBqdXN0byB2ZWhpY3VsYSwgcG9zdWVyZSBlbmltIGV1LCBlZ2VzdGFzIGxlby4gTWFlY2VuYXMgYmxhbmRpdCB1cm5hIG51bmMsIGV0IGVsZW1lbnR1bSBlc3QgZXVpc21vZCBub24uIEluIGltcGVyZGlldCBkaWFtIG5lYyBhcmN1IGN1cnN1cyBwb3J0YS4gTW9yYmkgY29uc2VxdWF0IGRpYW0gYXQgcXVhbSBjb252YWxsaXMsIHZlbCBydXRydW0gbnVsbGEgc2NlbGVyaXNxdWUuXFxuXFxuTW9yYmkgYWxpcXVhbSBvcmNpIHF1aXMgbmliaCBlZ2VzdGFzLCBpbiBzdXNjaXBpdCBlcmF0IHZvbHV0cGF0LiBEb25lYyBhdCBhY2N1bXNhbiBhdWd1ZSwgc2VkIGVsZW1lbnR1bSBsaWJlcm8uIERvbmVjIGluIGZlcm1lbnR1bSBtYXVyaXMuIFZpdmFtdXMgdmVzdGlidWx1bSwgbGlndWxhIGVnZXQgbW9sZXN0aWUgdmVoaWN1bGEsIHJpc3VzIGFudGUgZmF1Y2lidXMgbGliZXJvLCBldCBwZWxsZW50ZXNxdWUgaXBzdW0gdHVycGlzIHNvbGxpY2l0dWRpbiBlcmF0LiBOdWxsYSBmYWNpbGlzaS4gVml2YW11cyBxdWlzIHBvcnRhIGVyYXQuIFBlbGxlbnRlc3F1ZSB2aXRhZSBydXRydW0gdHVycGlzLiBQZWxsZW50ZXNxdWUgaGFiaXRhbnQgbW9yYmkgdHJpc3RpcXVlIHNlbmVjdHVzIGV0IG5ldHVzIGV0IG1hbGVzdWFkYSBmYW1lcyBhYyB0dXJwaXMgZWdlc3Rhcy4gTnVsbGEgc2l0IGFtZXQgYWxpcXVldCBzZW0sIHZlbCB2ZW5lbmF0aXMgbnVsbGEuIFN1c3BlbmRpc3NlIGFjIHRvcnRvciBpYWN1bGlzLCBsb2JvcnRpcyBzYXBpZW4gbm9uLCBzb2RhbGVzIHRvcnRvci4gU3VzcGVuZGlzc2UgaXBzdW0gYXJjdSwgbG9ib3J0aXMgYWMgcGxhY2VyYXQgcXVpcywgdmFyaXVzIG5lYyBxdWFtLiBRdWlzcXVlIHZlaGljdWxhIG1pIHV0IGRpYW0gdWxsYW1jb3JwZXIgYmxhbmRpdC5cIn1dJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQGRlc2NyaXB0aW9uIEJ1aWxkIHdpZGdldFxuICAgICAgICAgKi9cbiAgICAgICAgYnVpbGQgKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGxldCBkYXRhID0gSlNPTi5wYXJzZShtZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCBcIlxcXFxuXCIpLnJlcGxhY2UoL1xcci9nLCBcIlxcXFxyXCIpLnJlcGxhY2UoL1xcdC9nLCBcIlxcXFx0XCIpLnJlcGxhY2UoL1xcZi9nLCBcIlxcXFxmXCIpKTtcblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbiA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRfdGFiID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKGRhdGEubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLndpZGdldC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMud2lkZ2V0KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy53aWRnZXQ7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgbWVudSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ01FTlUnKTtcbiAgICAgICAgICAgIG1lbnUuc2V0QXR0cmlidXRlKCd0eXBlJywgJ3Rvb2xiYXInKTtcbiAgICAgICAgICAgIG1lbnUuY2xhc3NMaXN0LmFkZCgndGFic19fbWVudScpO1xuICAgICAgICAgICAgdGhpcy53aWRnZXQuYXBwZW5kQ2hpbGQobWVudSk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IHRhYiBvZiBkYXRhKSB7XG5cbiAgICAgICAgICAgICAgICBsZXQgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnQlVUVE9OJylcbiAgICAgICAgICAgICAgICAgICAgLCBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdTRUNUSU9OJylcbiAgICAgICAgICAgICAgICAgICAgLCB0ZXh0ID0gdGFiLkNvbnRlbnQuc3BsaXQoJ1xcblxcbicpO1xuXG4gICAgICAgICAgICAgICAgYnV0dG9uLnNldEF0dHJpYnV0ZSgndHlwZScsICdidXR0b24nKTtcbiAgICAgICAgICAgICAgICBidXR0b24uc2V0QXR0cmlidXRlKCdkYXRhLXRhcmdldCcsIHRhYi5UaXRsZSk7XG4gICAgICAgICAgICAgICAgYnV0dG9uLmNsYXNzTGlzdC5hZGQoJ3RhYnNfX2J1dHRvbicpO1xuICAgICAgICAgICAgICAgIGJ1dHRvbi5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh0YWIuVGl0bGUpKTtcbiAgICAgICAgICAgICAgICBidXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLm9wZW5UYWIuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgbWVudS5hcHBlbmRDaGlsZChidXR0b24pO1xuXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnNldEF0dHJpYnV0ZSgnZGF0YS10YWInLCB0YWIuVGl0bGUpO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCd0YWJzX190YWInKTtcblxuICAgICAgICAgICAgICAgIGZvciAobGV0IHBhcmFncmFwaCBvZiB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnUCcpO1xuICAgICAgICAgICAgICAgICAgICBwLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHBhcmFncmFwaCkpO1xuICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQocCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy53aWRnZXQuYXBwZW5kQ2hpbGQoY29udGFpbmVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbWVudS5xdWVyeVNlbGVjdG9yKCdidXR0b24nKS5jbGljaygpO1xuICAgICAgICAgICAgdGhpcy53aWRnZXQuY2xhc3NMaXN0LmFkZCgndGFic19idWlsZGVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICBvcGVuVGFiIChldmVudCkge1xuICAgICAgICAgICAgbGV0IGJ1dHRvbiA9IGV2ZW50LmN1cnJlbnRUYXJnZXRcbiAgICAgICAgICAgICAgICAsIHRhcmdldCA9IGJ1dHRvbi5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0Jyk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfdGFiICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfdGFiLmNsYXNzTGlzdC50b2dnbGUoJ3RhYnNfX3RhYl9jdXJyZW50JywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50X2J1dHRvbiAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKCd0YWJzX19idXR0b25fY3VycmVudCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X2J1dHRvbiA9IGJ1dHRvbjtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudF9idXR0b24uY2xhc3NMaXN0LnRvZ2dsZSgndGFic19fYnV0dG9uX2N1cnJlbnQnLCB0cnVlKTtcblxuICAgICAgICAgICAgdGhpcy5jdXJyZW50X3RhYiA9IHRoaXMud2lkZ2V0LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXRhYj0nICsgdGFyZ2V0ICsgJ10nKTtcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRfdGFiICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRfdGFiLmNsYXNzTGlzdC50b2dnbGUoJ3RhYnNfX3RhYl9jdXJyZW50JywgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBuZXcgVGFicztcbn0pKCk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
