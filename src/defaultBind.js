//Copyright (c) wildcatsoft (Wei Ran).
//All Rights Reserved.
//Licensed under the Apache License, Version 2.0.
//See License.txt in the project root for license information.
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
//# sourceMappingURL=defaultBind.js.map
