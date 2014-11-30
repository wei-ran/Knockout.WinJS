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
                if (dataContext)
                    data = dataContext;
            }

            if (destProps || destProps.length == 1) {
                var destProp = destProps[0];

                if (_koBindings[destProp]) {
                    return _koBindings[destProp](data, sourceProps, dest);
                }
            }

            return WinJS.Binding.defaultBind(data, sourceProps, dest, destProps);
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
                flowControl._parentContext = source;
                return WinJS.Binding.defaultBind(source, sourceProps, dest, ["winControl", "data"]);
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
            var data = {
                onclick: function (obj) {
                },
                context: source
            };
            var cancelable = WinJS.Binding.defaultBind(source, sourceProps, data, ["onclick"]);
            dest.onclick = function () {
                if (DataContext.isObservableDataContext(data.context)) {
                    data.onclick.call(WinJS.Binding.unwrap(data.context.$data));
                } else {
                    data.onclick.call(data.context);
                }
            };

            return {
                cancel: function () {
                    cancelable.cancel();
                    dest.onclick = undefined;
                }
            };
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

                    if (div.childElementCount == 1) {
                        var element = div.firstElementChild;
                        div.removeChild(div.firstElementChild);
                        element["_winjs_ko_dataContext"] = context;
                        return element;
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
                            var dataContex = this._parentContext;

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
                                    child["_winjs_ko_dataContext"].$index = index;
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
                return source && WinJS.Binding.unwrap(source) instanceof DataContext;
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
                    dataContext.$parentContext = parent;
                } else {
                    dataContext.$parentContexts = [];
                }

                var dataContextObservable = KO.observable(dataContext);

                if (DataContext.isObservableDataContext(parent)) {
                    dataContext.$parentContexts.concat(parent.$parentContexts);
                    dataContextObservable.addComputedProperty("$parents", function () {
                        return dataContextObservable.peek("$parentContexts").map(function (p) {
                            return p.$data;
                        });
                    });

                    dataContextObservable.addComputedProperty("$parent", function () {
                        return dataContextObservable.peek("$parentContext").$data;
                    });

                    dataContextObservable.addComputedProperty("$root", function () {
                        var parentContexts = dataContextObservable.peek("$parentContexts");
                        if (parentContexts.length > 0) {
                            return parentContexts[parentContexts.length - 1].$data;
                        }
                    });
                } else {
                    dataContextObservable.$parents = [parent];
                    dataContextObservable.$parent = parent;
                    dataContextObservable.$root = parent;
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
                createObservable(_observable);
                return _observable;
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

            var _computed;
            var _propName;

            if (destObj) {
                _computed = destObj;
                _propName = destProp;
            } else {
                _computed = KO.observable(0);
                _propName = "value";
            }

            evaluatorFunctionTarget = evaluatorFunctionTarget || options["owner"] || _computed;

            var evaluator = function () {
                return readFunction.call(evaluatorFunctionTarget);
            };

            var _initVal;

            if (_computed.dispose) {
                _computed.dispose(_propName);
            }

            var computedProperty = new ComputedProperty;
            _computed._computedProperties[_propName] = computedProperty;

            var computedUpdater = function () {
                var context = DependencyDetection.currentContext();
                if (context && context.type == DependencyDetectionContext.TYPE_COMPUTED_DEPENDENCY_BIND) {
                    return;
                }

                computedProperty._removeAllDependencies();

                var value;
                DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_COMPUTED_EVALUATIOR, new ObservableProperty(_computed, _propName)), function () {
                    value = evaluator();
                });

                var dependencies = (computedProperty._dependencies || []);
                DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_COMPUTED_DEPENDENCY_BIND), function () {
                    dependencies.forEach(function (d) {
                        d._observable.bind(d._propertyName, computedUpdater);
                    });
                });

                var updateStamp = new UpdateStamp(new Date(0));
                dependencies.forEach(function (d) {
                    var lastUpdateStamp = d._observable._lastUpdatedStamp(d._propertyName);
                    if (lastUpdateStamp && updateStamp.lessThan(lastUpdateStamp)) {
                        updateStamp = lastUpdateStamp;
                    }
                });

                if (_computed._lastUpdatedStamp) {
                    var lastUpdatedStamp = _computed._lastUpdatedStamp(_propName);
                    if (!lastUpdatedStamp || lastUpdatedStamp.lessThan(updateStamp)) {
                        _computed.updateProperty(_propName, value, updateStamp);
                    }
                } else {
                    _computed[_propName] = value;
                }

                return value;
            };

            var writer = options["write"];
            if (writer && typeof writer == "function") {
                computedProperty._computedWriter = function (value) {
                    writer.call(evaluatorFunctionTarget, value);
                };
            }

            computedProperty._computedUpdater = computedUpdater;

            if (typeof _computed._lastUpdatedStamp == "function") {
                _computed._lastUpdatedStamp(_propName, null);
            }

            var initValue = computedUpdater();

            if (_computed == destObj) {
                return _initVal;
            } else {
                return _computed;
            }
        };

        function observableArray(list) {
            var list = list || [];
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

            Object.defineProperty(winJSList, "array", {
                get: function () {
                    var context = DependencyDetection.currentContext();
                    if (context) {
                        _bindComputedUpdaterIfNeccessary(winJSList, "_array");
                    }

                    return winJSList._array;
                },
                enumerable: true,
                configurable: true
            });

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

        function createObservable(winjsObservable) {
            winjsObservable.addComputedProperty = function (name, evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, destObj, destProp) {
                this.addProperty(name);
                KO.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, this, name);
            };

            var _getProperty = winjsObservable.getProperty;

            winjsObservable.getProperty = function (name) {
                _bindComputedUpdaterIfNeccessary(this, name);
                return _getProperty.call(this, name);
            };

            var _updateProperty = winjsObservable.updateProperty;

            winjsObservable.updateProperty = function (name, value, updateStamp) {
                this._lastUpdatedStamp(name, updateStamp || UpdateStamp.newStamp());
                _updateProperty.call(this, name, value);
            };

            var _setProperty = winjsObservable.setProperty;
            winjsObservable.setProperty = function (name, value) {
                var computedProperty = this._computedProperty(name);
                if (computedProperty) {
                    if (computedProperty._computedWriter) {
                        computedProperty._computedWriter(value);
                        return;
                    } else {
                        throw new Error("Cannot write a value to a computed observable property unless you specify a 'write' option.");
                    }
                }
                return _setProperty.call(this, name, value);
            };

            winjsObservable._removeAllDependencies = function (name) {
                var property = this._computedProperty(name);
                if (property) {
                    var dependencies = property._dependencies || [];
                    dependencies.forEach(function (d) {
                        d._observable.unbind(d._propertyName, property._computedUpdater);
                    });
                    property._dependencies = [];
                }
            };

            var _dispose = winjsObservable.dispose;
            winjsObservable.dispose = function (name) {
                var _this = this;
                if (arguments.length > 0) {
                    var property = this._computedProperty(name);
                    if (property) {
                        property._removeAllDependencies();
                        property._computedUpdater = null;
                        property._computedWriter = null;
                        delete this._computedProperties[name];
                    }
                } else {
                    if (_dispose) {
                        _dispose.call(this);
                    }
                    Object.keys(this).forEach(function (k) {
                        _this.dispose(k);
                    });
                }
            };

            winjsObservable._lastUpdatedStamps = {};

            winjsObservable._lastUpdatedStamp = function (name, updateStamp) {
                this._lastUpdatedStamps = this._lastUpdatedStamps || {};
                if (arguments.length == 1) {
                    return this._lastUpdatedStamps[name];
                } else if (arguments.length > 1) {
                    this._lastUpdatedStamps[name] = updateStamp;
                }
            };

            winjsObservable._computedProperties = {};
            winjsObservable._computedProperty = function (name) {
                return this._computedProperties[name];
            };

            winjsObservable.peek = function (name) {
                return _getProperty.call(this, name);
            };

            winjsObservable.computed = function (name, evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {
                KO.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, this, name);
            };

            winjsObservable.getDependenciesCount = function (name) {
                var computedProperty = this._computedProperty(name);
                return computedProperty && computedProperty._dependencies ? computedProperty._dependencies.length : 0;
            };
        }

        function _bindComputedUpdaterIfNeccessary(observable, name) {
            var context = DependencyDetection.currentContext();
            if (context) {
                if (context.type == DependencyDetectionContext.TYPE_COMPUTED_EVALUATIOR) {
                    var observableProperty = context.observableProperty;

                    if (!observableProperty || (observableProperty._observable === observable && observableProperty._propertyName == name)) {
                        return;
                    }

                    var computed = observableProperty._observable._computedProperty(observableProperty._propertyName);

                    var property = new ObservableProperty(observable, name);
                    var dependencies = (computed._dependencies || []);
                    if (!dependencies.some(function (o) {
                        return o === property;
                    })) {
                        dependencies.push(property);
                    }
                    ;
                    computed._dependencies = dependencies;
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

        var ComputedProperty = (function () {
            function ComputedProperty() {
                this._dependencies = [];
            }
            ComputedProperty.prototype._removeAllDependencies = function () {
                var computedUpdater = this._computedUpdater;
                this._dependencies.forEach(function (d) {
                    d._observable.unbind(d._propertyName, computedUpdater);
                });
                this._dependencies = [];
            };
            return ComputedProperty;
        })();

        var DependencyDetectionContext = (function () {
            function DependencyDetectionContext(type, observablePropertyOrUpdateStamp) {
                this.type = type;
                if (type == DependencyDetectionContext.TYPE_COMPUTED_EVALUATIOR) {
                    this.observableProperty = observablePropertyOrUpdateStamp;
                } else {
                    this.upateStamp = observablePropertyOrUpdateStamp;
                }
            }
            DependencyDetectionContext.TYPE_COMPUTED_EVALUATIOR = 0;
            DependencyDetectionContext.TYPE_COMPUTED_DEPENDENCY_BIND = 1;
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
