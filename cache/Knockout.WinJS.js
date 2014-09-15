var WinJS;
(function (WinJS) {
    (function (KO) {
        var _koBindings = {
            "visible": visibleBind,
            "text": textBind,
            "html": htmlBind,
            "click": clickBind,
            "submit": submitBind,
            "enable": enableBind,
            "hasFocus": hasFocusBind,
            "value": valueBind,
            "checked": checkedBind,
            "$foreach": foreachBind,
            "$with": withBind,
            "$if": ifBind,
            "$ifnot": ifNotBind
        };

        KO.defaultBind = WinJS.Binding.initializer(function (source, sourceProps, dest, destProps) {
            var data = source;
            if (destProps.length > 0 && _dataContextMemebrs[sourceProps[0]]) {
                var dataContext = DataContext.getDataContextFromElement(dest);
                if (dataContext && dataContext.bindable)
                    data = dataContext.bindable();
            }

            if (destProps || destProps.length == 1) {
                var destProp = destProps[0];

                if (_koBindings[destProp]) {
                    return _koBindings[destProp](data, sourceProps, dest);
                }
            }

            return WinJS.Binding.defaultBind(source, sourceProps, dest, destProps);
        });

        function visibleBind(source, sourceProps, dest) {
            var converter = WinJS.Binding.converter(function (visible) {
                return visible ? "" : "none";
            });

            return converter(source, sourceProps, dest, ["style", "display"]);
        }

        function textBind(source, sourceProps, dest) {
            return WinJS.Binding.defaultBind(source, sourceProps, dest, ["textContent"]);
        }

        function htmlBind(source, sourceProps, dest) {
            return WinJS.Binding.defaultBind(source, sourceProps, dest, ["innerHTML"]);
        }

        function _flowControlBind(source, sourceProps, dest, type) {
            var flowControl = dest.winControl;

            if (!flowControl && dest.getAttribute("data-win-control") == "WinJS.KO.FlowControl") {
                flowControl = new WinJS.KO.FlowControl(dest);
            }

            if (flowControl) {
                flowControl.type = type;
                flowControl.source = source;
                return WinJS.Binding.defaultBind(source, sourceProps, flowControl, ["data"]);
            } else {
                return {
                    cancel: function () {
                    }
                };
            }
        }

        function foreachBind(source, sourceProps, dest) {
            return _flowControlBind(source, sourceProps, dest, "foreach");
        }

        function withBind(source, sourceProps, dest) {
            return _flowControlBind(source, sourceProps, dest, "with");
        }

        function ifBind(source, sourceProps, dest) {
            return _flowControlBind(source, sourceProps, dest, "if");
        }

        function ifNotBind(source, sourceProps, dest) {
            return _flowControlBind(source, sourceProps, dest, "ifnot");
        }

        function clickBind(source, sourceProps, dest) {
            return WinJS.Binding.defaultBind(source, sourceProps, dest, ["onclick"]);
        }

        function eventBind(source, sourceProps, dest) {
            function _foreachEvent(events, func) {
                events = events || {};
                for (var key in events) {
                    var event = events[key];
                    if (typeof event == "function") {
                        func(key, event);
                    }
                }
            }

            function _removeEvents() {
                _foreachEvent(dest["_winjs_ko_eventBind"], function (key, event) {
                    dest.removeEventListener(key, event);
                });
            }

            var converter = WinJS.Binding.converter(function (events) {
                _removeEvents();

                _foreachEvent(events, function (key, event) {
                    dest.addEventListener(key, event);
                });
            });

            var converterCancelable = converter(source, sourceProps, dest, ["_winjs_ko_eventBind"]);

            return {
                cancel: function () {
                    converterCancelable.cancel();
                    _removeEvents();
                }
            };
        }

        function submitBind(source, sourceProps, dest) {
            var submitEvent;

            var submitEventOuter = function (ev) {
                if (submitEvent && !submitEvent(ev)) {
                    ev.preventDefault();
                }
            };

            dest.addEventListener("submit", submitEventOuter);

            var converter = WinJS.Binding.converter(function (event) {
                submitEvent = (typeof (event) == "function") ? event : null;
                return submitEvent;
            });

            var converterCancelable = converter(source, sourceProps, dest, ["_winjs_ko_submitBind"]);
            return {
                cancel: function () {
                    converterCancelable.cancel();
                    dest.removeEventListener("submit", submitEventOuter);
                }
            };
        }

        function enableBind(source, sourceProps, dest) {
            var converter = WinJS.Binding.converter(function (value) {
                return !value;
            });

            return converter(source, sourceProps, dest, ["disabled"]);
        }

        function valueBind(source, sourceProps, dest) {
            var defaultBindCancelable = WinJS.Binding.defaultBind(source, sourceProps, dest, ["value"]);

            if (_isObservable(source)) {
                dest.oninput = function () {
                    _nestedSet(source, sourceProps, dest.value);
                };
            }

            return {
                cancel: function () {
                    defaultBindCancelable.cancel();
                    dest.oninput = null;
                }
            };
        }

        function hasFocusBind(source, sourceProps, dest) {
            function elementHasFocus(element) {
                return element.ownerDocument.activeElement == element;
            }

            var converter = WinJS.Binding.converter(function (hasFocus) {
                var destHasFocus = elementHasFocus(dest);

                if (hasFocus != destHasFocus) {
                    hasFocus ? dest.focus() : dest.blur();
                }

                if (_isObservable(source)) {
                    dest.onfocus = dest.onblur = function () {
                        _nestedSet(source, sourceProps, elementHasFocus(dest));
                    };
                }

                return hasFocus;
            });

            var converterCancelable = converter(source, sourceProps, dest, ["_winjs_ko_hasFocus"]);
            return {
                cancel: function () {
                    converterCancelable.cancel();
                    dest.onfocus = dest.onblur = null;
                }
            };
        }

        function checkedBind(source, sourceProps, dest) {
            var defaultBindCancelable = WinJS.Binding.defaultBind(source, sourceProps, dest, ["checked"]);

            if (_isObservable(source)) {
                dest.onchange = function () {
                    _nestedSet(source, sourceProps, dest.checked);
                };
            }

            return {
                cancel: function () {
                    defaultBindCancelable.cancel();
                    dest.onchange = null;
                }
            };
        }

        var FlowControl = (function () {
            function FlowControl(element, options) {
                this.dispose = function () {
                    this._disposeChildren();
                };
                options = options || {};

                if (element.winControl) {
                    return;
                }

                function _createChildTemplate(root) {
                    var template = document.createElement("div");
                    template.innerHTML = root.innerHTML;

                    var elements = root.querySelectorAll("[data-win-bind]");
                    for (var i = 0; i < elements.length; i++) {
                        elements.item(i).attributes.removeNamedItem("data-win-bind");
                    }
                    while (root.hasChildNodes()) {
                        root.removeChild(root.lastChild);
                    }

                    var _template = new WinJS.Binding.Template(template);
                    _template.bindingInitializer = WinJS.KO.defaultBind;
                    template.isDeclarativeControlContainer = true;

                    return _template;
                }

                this._data = options["data"];
                this._template = options["tempate"] || _createChildTemplate(element);
                this._type = options["type"];
                this._source = options["source"];
                this.element = element;
                this._parentContext = DataContext.getDataContextFromElement(this.element);
                element.winControl = this;
                this.reload();
            }
            FlowControl.prototype.reload = function () {
                var _this = this;
                var createElementWithDataContext = function (data, newContext, parentContext, index) {
                    var div = document.createElement("div");
                    if (newContext) {
                        var context = DataContext.createObservableDataContext(data, parentContext);
                        if (arguments.length >= 4) {
                            context.addProperty("$index", index);
                        }
                        div["_winjs_ko_dataContext"] = context;
                    }
                    if (data) {
                        _this._template.render(data, div);
                    }
                    return div;
                };

                var createChildElement = function (data, newContext, parentContext) {
                    var childElement = createElementWithDataContext(data, newContext, parentContext);
                    _this.element.appendChild(childElement);
                };

                this._disposeChildren();

                if (this._template) {
                    switch (this._type) {
                        case "if":
                            if (this._data) {
                                createChildElement(this._source, false);
                            }
                            break;
                        case "ifnot":
                            if (!this._data) {
                                createChildElement(this._source, false);
                            }
                            break;
                        case "with":
                            createChildElement(this._data, true, this._parentContext);
                            break;
                        case "foreach":
                            var dataContex = DataContext.createObservableDataContext(this._data, this._parentContext);

                            var foreachUpdater = function (list) {
                                if (!(list instanceof Array || list instanceof WinJS.Binding.List)) {
                                    return;
                                }

                                var children = list.map(function (item, index) {
                                    var child = _this.element.firstChild;
                                    while (child) {
                                        if (child._winjs_ko_dataItem == item) {
                                            break;
                                        }
                                        child = child.nextSibling;
                                    }
                                    if (child) {
                                        _this.element.removeChild(child);
                                    } else {
                                        child = createElementWithDataContext(item, true, dataContex, index);
                                        child._winjs_ko_dataItem = item;
                                    }
                                    return child;
                                });

                                _this._disposeChildren();

                                children.forEach(function (child, index) {
                                    child["_winjs_ko_dataContext"].$index(index);
                                    _this.element.appendChild(child);
                                });
                            };

                            if (this._data instanceof WinJS.Binding.List && this._data._array instanceof Array) {
                                this._data.bind("_array", foreachUpdater);
                            } else {
                                foreachUpdater(this._data);
                            }
                            break;
                    }
                }
            };

            Object.defineProperty(FlowControl.prototype, "data", {
                get: function () {
                    return this._data;
                },
                set: function (data) {
                    if (data !== this._data) {
                        this._data = data;
                        this.reload();
                    }
                },
                enumerable: true,
                configurable: true
            });


            Object.defineProperty(FlowControl.prototype, "template", {
                get: function () {
                    return this._template;
                },
                set: function (template) {
                    if (template !== this._template) {
                        this._template = template;
                        this.reload();
                    }
                },
                enumerable: true,
                configurable: true
            });


            Object.defineProperty(FlowControl.prototype, "type", {
                get: function () {
                    return this.type;
                },
                set: function (type) {
                    if (type !== this._type) {
                        this._type = type;
                        this.reload();
                    }
                },
                enumerable: true,
                configurable: true
            });


            Object.defineProperty(FlowControl.prototype, "source", {
                get: function () {
                    return this._source;
                },
                set: function (source) {
                    if (source !== this._source) {
                        this._source = source;
                        this.reload();
                    }
                },
                enumerable: true,
                configurable: true
            });


            FlowControl.prototype._disposeChildren = function () {
                while (this.element.childElementCount > 0) {
                    var child = this.element.lastElementChild;
                    if (typeof child["dispose"] == "function") {
                        child["dispose"]();
                    }

                    var childContext = child["_winjs_ko_dataContext"];
                    if (childContext && typeof childContext["dispose"] == "function") {
                        childContext["dispose"]();
                    }

                    this.element.removeChild(child);
                }
            };

            FlowControl.cctor = (function () {
                WinJS.Utilities.markSupportedForProcessing(FlowControl);
                FlowControl["isDeclarativeControlContainer"] = true;
            })();
            return FlowControl;
        })();
        KO.FlowControl = FlowControl;

        var _dataContextMemebrs = { "$parent": true, "$parents": true, "$root": true, "$data": true, "$index": true, "$parentContext": true, "$rawData": true, "$element": true, "$context": true };

        var DataContext = (function () {
            function DataContext() {
            }
            DataContext.prototype.data = function (_data) {
                this.$data = _data;
                if (_data instanceof WinJS.Binding.List) {
                    this.$rawData = WinJS.KO.getRawArray(_data);
                } else {
                    this.$rawData = WinJS.Binding.unwrap(_data);
                }
            };

            DataContext.isObservableDataContext = function (source) {
                return source && source.bindable && WinJS.Binding.unwrap(source.bindable()) instanceof DataContext;
            };

            DataContext.getDataContextFromElement = function (element) {
                var cur = element;
                while (cur && !DataContext.isObservableDataContext(cur["_winjs_ko_dataContext"])) {
                    cur = cur.parentElement;
                }

                return cur ? cur["_winjs_ko_dataContext"] : null;
            };

            DataContext.createObservableDataContext = function (data, parent) {
                var dataContext = new DataContext;
                dataContext.data(data);
                if (parent) {
                    dataContext.$parentContexts = [parent];
                    dataContext.$parentContexts.concat(parent.$parentContexts());
                    dataContext.$parentContext = parent;
                } else {
                    dataContext.$parentContexts = [];
                }

                var dataContextObservable = KO.observable(dataContext);

                if (parent) {
                    dataContextObservable.addComputedProperty("$parents", function () {
                        return dataContextObservable.$parentContexts.peek().map(function (p) {
                            return p.$data();
                        });
                    });

                    dataContextObservable.addComputedProperty("$parent", function () {
                        return dataContextObservable.$parentContext.peek().$data();
                    });

                    dataContextObservable.addComputedProperty("$root", function () {
                        var parentContexts = dataContextObservable.$parentContexts.peek();
                        if (parentContexts.length > 0) {
                            return parentContexts[parentContexts.length - 1].$data();
                        }
                    });
                } else {
                    dataContext.$parents = [];
                }

                return dataContextObservable;
            };
            return DataContext;
        })();

        function _isObservable(data) {
            return WinJS.Binding.unwrap(data) !== data;
        }

        function _nestedSet(dest, destProperties, v) {
            for (var i = 0, len = (destProperties.length - 1); i < len; i++) {
                dest = dest[destProperties[i]];
                if (!dest) {
                    return;
                }
            }
            var prop = destProperties[destProperties.length - 1];
            dest[prop] = v;
        }

        (function cctor() {
            WinJS.Utilities.markSupportedForProcessing(KO.defaultBind);
        })();
    })(WinJS.KO || (WinJS.KO = {}));
    var KO = WinJS.KO;
})(WinJS || (WinJS = {}));
var WinJS;
(function (WinJS) {
    (function (KO) {
        KO.observable = function (data) {
            var _data = typeof data == "object" ? data : new PrimitiveTypeWrapper(data);

            if (_data) {
                var _observable = WinJS.Binding.as(_data);
                return new Observable(_observable);
            }

            return _data;
        };

        KO.computed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, destObj, destProp) {
            var readFunction = evaluatorFunctionOrOptions;
            if (evaluatorFunctionOrOptions && typeof evaluatorFunctionOrOptions == "object") {
                options = evaluatorFunctionOrOptions || {};
                readFunction = options["read"];
            } else {
                options = options || {};
                if (!readFunction)
                    readFunction = options["read"];
            }

            if (typeof readFunction != "function")
                throw new Error("Pass a function that returns the value of the computed function.");

            evaluatorFunctionTarget = evaluatorFunctionTarget || options["owner"];
            var evaluator = function () {
                return evaluatorFunctionTarget ? readFunction.call(evaluatorFunctionTarget) : readFunction();
            };

            var _computed;
            var _propName;

            if (destObj) {
                _computed = destObj;
                _propName = destProp;
            } else {
                _computed = KO.observable(0);
                _propName = "value";
            }

            var _initVal;
            var computedProperty = _computed[_propName];

            if (_computed instanceof Observable) {
                _computed.dispose(_propName);
            }

            var computedUpdater = function () {
                var context = DependencyDetection.currentContext();
                if (context && context.type == DependencyDetectionContext.TYPE_INITIAL_EVALUATION) {
                    return;
                }

                var value = evaluator();
                var dependencies = (computedProperty._dependencies || []);
                var updateStamp = new UpdateStamp(new Date(0));
                dependencies.forEach(function (d) {
                    var lastUpdateStamp = d._observable._lastUpdatedStamp(d._propertyName);
                    if (lastUpdateStamp && updateStamp.lessThan(lastUpdateStamp)) {
                        updateStamp = lastUpdateStamp;
                    }
                });

                if (_computed instanceof Observable) {
                    var lastUpdatedStamp = _computed._lastUpdatedStamp(_propName);
                    if (!lastUpdatedStamp || lastUpdatedStamp.lessThan(updateStamp)) {
                        _computed.setProperty(_propName, value, updateStamp);
                    }
                } else {
                    _computed[_propName] = value;
                }
            };

            var writer = options["write"];
            if (writer && typeof writer == "function") {
                computedProperty._computedWriter = function () {
                    var context = DependencyDetection.currentContext();
                    if (!context || context.type != DependencyDetectionContext.TYPE_WRITER_INITIAL_RUN) {
                        context = new DependencyDetectionContext(DependencyDetectionContext.COMPUTED_WRITER, _computed._lastUpdatedStamp(_propName) || UpdateStamp.newStamp());
                        DependencyDetection.execute(context, function () {
                            evaluatorFunctionTarget ? writer.call(evaluatorFunctionTarget) : writer();
                        });
                    }
                };

                if (_computed instanceof Observable) {
                    DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_WRITER_INITIAL_RUN), function () {
                        _computed.bindable().bind(_propName, computedProperty._computedWriter);
                    });
                } else {
                    throw new Error("A non-observable destionation does not support writer.");
                }
            }

            computedProperty._computedUpdater = computedUpdater;

            DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_INITIAL_EVALUATION, new ObservableProperty(_computed, _propName)), function () {
                _initVal = evaluator();
                if (_computed instanceof Observable) {
                    _computed.setProperty(_propName, _initVal);
                } else {
                    _computed[_propName] = _initVal;
                }
            });

            if (_computed == destObj) {
                return _initVal;
            } else {
                return _computed;
            }
        };

        function observableArray(list) {
            var winJSList = new WinJS.Binding.List(list);
            var lastUpdatedStamp;

            function onListChanged() {
                lastUpdatedStamp = new UpdateStamp();
                var oldArray = winJSList._array;
                winJSList._array = getRawArray(winJSList);

                winJSList.notify("_array", winJSList._array, oldArray);
            }

            winJSList.addEventListener("itemchanged", onListChanged);
            winJSList.addEventListener("iteminserted", onListChanged);
            winJSList.addEventListener("itemmoved", onListChanged);
            winJSList.addEventListener("itemmutated", onListChanged);
            winJSList.addEventListener("itemremoved", onListChanged);
            winJSList.addEventListener("reload", onListChanged);

            winJSList._lastUpdatedStamp = function () {
                return lastUpdatedStamp;
            };

            winJSList._array = getRawArray(winJSList);

            winJSList.array = function () {
                var context = DependencyDetection.currentContext();
                if (context) {
                    _bindComputedUpdaterIfNeccessary(winJSList, "_array");
                }

                return winJSList._array;
            };
            return winJSList;
        }
        KO.observableArray = observableArray;

        function getRawArray(list) {
            if (list instanceof WinJS.Binding.List) {
                return list.map(function (v) {
                    return v;
                });
            }
        }
        KO.getRawArray = getRawArray;

        var Observable = (function () {
            function Observable(winjsObservable) {
                var _this = this;
                this._winjsObservable = winjsObservable;
                var data = winjsObservable.backingData;
                while (data && data !== Object.prototype) {
                    Object.keys(data).forEach(function (key) {
                        return _this._addProperty(key);
                    });
                    data = Object.getPrototypeOf(data);
                }
            }
            Observable.prototype.bindable = function () {
                return this._winjsObservable;
            };

            Observable.prototype.bind = function (name, action) {
                return this._winjsObservable.bind(name, action);
            };

            Observable.prototype.unbind = function (name, action) {
                return this._winjsObservable.unbind(name, action);
            };

            Observable.prototype.addComputedProperty = function (name, evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, destObj, destProp) {
                this.addProperty(name);
                KO.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, this, name);
            };

            Observable.prototype.addProperty = function (name, value) {
                var ret = this._winjsObservable.addProperty(name, value);
                this._addProperty(name);
                return ret;
            };

            Observable.prototype.getProperty = function (name) {
                _bindComputedUpdaterIfNeccessary(this, name);

                return this._winjsObservable.getProperty(name);
            };

            Observable.prototype.setProperty = function (name, value, updateStamp) {
                var property = this[name];
                var context = DependencyDetection.currentContext();
                if (context && context.type == DependencyDetectionContext.COMPUTED_WRITER) {
                    var lastUpdateStamp = this._lastUpdatedStamp(name);
                    if (!lastUpdateStamp || lastUpdateStamp.lessThan(context.upateStamp)) {
                        this._lastUpdatedStamp(name, context.upateStamp);
                        this._winjsObservable.updateProperty(name, value);
                    }
                } else {
                    this._lastUpdatedStamp(name, updateStamp || UpdateStamp.newStamp());
                    this._winjsObservable.updateProperty(name, value);
                }
            };

            Observable.prototype.dispose = function (name) {
                var _this = this;
                if (arguments.length > 0) {
                    var property = this[name];
                    if (property) {
                        if (property._computedUpdater) {
                            var dependencies = property._dependencies || [];
                            dependencies.forEach(function (d) {
                                d._observable.unbind(d._propertyName, property._computedUpdater);
                            });
                            property._computedUpdater = null;
                            property._dependencies = [];
                        }

                        if (property._computedWriter) {
                            this.unbind(name, property._computedWriter);
                            property._computedUpdater = null;
                        }
                    }
                } else {
                    Object.keys(this).forEach(function (k) {
                        _this.dispose(k);
                    });
                }
            };

            Observable.prototype._lastUpdatedStamp = function (name, updateStamp) {
                this._lastUpdatedStamps = this._lastUpdatedStamps || {};
                if (arguments.length == 1) {
                    return this._lastUpdatedStamps[name];
                } else if (arguments.length > 1) {
                    this._lastUpdatedStamps[name] = updateStamp;
                }
            };

            Observable.prototype._getObservable = function () {
                return this;
            };

            Observable.prototype._addProperty = function (name) {
                var _this = this;
                var prop = (function (value) {
                    if (arguments.length == 0) {
                        return _this.getProperty(name);
                    } else {
                        return _this.setProperty(name, value);
                    }
                });

                this[name] = prop;

                var _peek = function () {
                    return _this._winjsObservable.getProperty(name);
                };

                var _computed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {
                    KO.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, _this, name);
                };

                var _dispose = function () {
                    _this.dispose(name);
                };

                prop.peek = _peek;
                prop.computed = _computed;
                prop.dispose = _dispose;
                return prop;
            };
            return Observable;
        })();

        function _bindComputedUpdaterIfNeccessary(observable, name) {
            var context = DependencyDetection.currentContext();
            if (context) {
                if (context.type == DependencyDetectionContext.TYPE_INITIAL_EVALUATION) {
                    var observableProperty = context.observableProperty;
                    var computed = observableProperty._observable[observableProperty._propertyName];
                    var property = new ObservableProperty(observable, name);
                    var dependencies = (computed._dependencies || []);
                    if (!dependencies.some(function (o) {
                        return o === property;
                    })) {
                        dependencies.push(property);
                    }
                    ;
                    computed._dependencies = dependencies;

                    observable.bind(name, computed._computedUpdater);
                }
            }
        }

        var ObservableProperty = (function () {
            function ObservableProperty(observable, propertyName) {
                this._observable = observable;
                this._propertyName = propertyName;
            }
            return ObservableProperty;
        })();

        var DependencyDetectionContext = (function () {
            function DependencyDetectionContext(type, observablePropertyOrUpdateStamp) {
                this.type = type;
                if (type == DependencyDetectionContext.TYPE_INITIAL_EVALUATION) {
                    this.observableProperty = observablePropertyOrUpdateStamp;
                } else {
                    this.upateStamp = observablePropertyOrUpdateStamp;
                }
            }
            DependencyDetectionContext.TYPE_INITIAL_EVALUATION = 0;
            DependencyDetectionContext.TYPE_COMPUTED_UPDATER = 1;
            DependencyDetectionContext.TYPE_WRITER_INITIAL_RUN = 2;
            DependencyDetectionContext.COMPUTED_WRITER = 3;
            return DependencyDetectionContext;
        })();

        var DependencyDetection = (function () {
            function DependencyDetection() {
            }
            DependencyDetection.execute = function (context, callback) {
                try  {
                    var existingContext = DependencyDetection._currentContext;
                    DependencyDetection._currentContext = context;

                    callback();
                } finally {
                    DependencyDetection._currentContext = existingContext;
                }
            };

            DependencyDetection.currentContext = function () {
                return DependencyDetection._currentContext;
            };
            DependencyDetection.contextStack = [];
            return DependencyDetection;
        })();

        var UpdateStamp = (function () {
            function UpdateStamp(timeStamp, index) {
                this.timeStamp = timeStamp || new Date();
                this.index = index || 0;
            }
            UpdateStamp.prototype.lessThan = function (updateStamp) {
                return this.timeStamp < updateStamp.timeStamp || (this.timeStamp < updateStamp.timeStamp && this.index < updateStamp.index);
            };

            UpdateStamp.newStamp = function () {
                var stamp = new UpdateStamp;
                if (stamp.timeStamp == UpdateStamp._lastUpdateStamp.timeStamp) {
                    stamp.index == UpdateStamp._lastUpdateStamp.index + 1;
                }

                UpdateStamp._lastUpdateStamp = new UpdateStamp(stamp.timeStamp, stamp.index);

                return stamp;
            };

            UpdateStamp._lastUpdateStamp = new UpdateStamp;
            return UpdateStamp;
        })();

        var PrimitiveTypeWrapper = (function () {
            function PrimitiveTypeWrapper(value) {
                this.value = value;
            }
            return PrimitiveTypeWrapper;
        })();
    })(WinJS.KO || (WinJS.KO = {}));
    var KO = WinJS.KO;
})(WinJS || (WinJS = {}));
//# sourceMappingURL=Knockout.WinJS.js.map
