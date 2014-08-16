var WinJS;
(function (WinJS) {
    //Copyright (c) wildcatsoft (Wei Ran).
    //All Rights Reserved.
    //Licensed under the Apache License, Version 2.0.
    //See License.txt in the project root for license information.
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
                    var lastUpdateStamp = d._lastUpdatedStamp;
                    if (lastUpdateStamp && updateStamp.lessThan(lastUpdateStamp)) {
                        updateStamp = lastUpdateStamp;
                    }
                });

                if (_computed instanceof Observable) {
                    var lastUpdatedStamp = computedProperty._lastUpdatedStamp;
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
                        context = new DependencyDetectionContext(DependencyDetectionContext.COMPUTED_WRITER, computedProperty._lastUpdatedStamp || UpdateStamp.newStamp());
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

            DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_INITIAL_EVALUATION, computedProperty), function () {
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

            Observable.prototype.addProperty = function (name, value) {
                var ret = this._winjsObservable.addProperty(name);
                this._addProperty(name);
                return ret;
            };

            Observable.prototype.getProperty = function (name) {
                var observable = this._winjsObservable;
                var context = DependencyDetection.currentContext();
                if (context) {
                    if (context.type == DependencyDetectionContext.TYPE_INITIAL_EVALUATION) {
                        var observableProperty = context.observableProperty;
                        var property = this[name];
                        var dependencies = (observableProperty._dependencies || []);
                        if (!dependencies.some(function (o) {
                            return o === property;
                        })) {
                            dependencies.push(property);
                        }
                        ;
                        observableProperty._dependencies = dependencies;

                        observable.bind(name, context.observableProperty._computedUpdater);
                    }
                }

                return observable.getProperty(name);
            };

            Observable.prototype.setProperty = function (name, value, updateStamp) {
                var property = this[name];
                var context = DependencyDetection.currentContext();
                if (context && context.type == DependencyDetectionContext.COMPUTED_WRITER) {
                    var lastUpdateStamp = property._lastUpdatedStamp;
                    if (!lastUpdateStamp || lastUpdateStamp.lessThan(context.upateStamp)) {
                        property._lastUpdatedStamp = context.upateStamp;
                        this._winjsObservable.updateProperty(name, value);
                    }
                } else {
                    property._lastUpdatedStamp = updateStamp || UpdateStamp.newStamp();
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
                                d._observable.bindable().unbind(d._propertyName, property._computedUpdater);
                            });
                            property._computedUpdater = null;
                            property._dependencies = [];
                        }

                        if (property._computedWriter) {
                            property._observable.bindable().unbind(property._propertyName, property._computedWriter);
                            property._computedUpdater = null;
                        }
                    }
                } else {
                    Object.keys(this).forEach(function (k) {
                        _this.dispose(k);
                    });
                }
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

                function _peek() {
                    return this._observable._winjsObservable.getProperty(name);
                }

                function _computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {
                    KO.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, this._observable, this._propertyName);
                }

                function _dispose() {
                    this._observable.dispose(this._propertyName);
                }

                prop._observable = this;
                prop._propertyName = name;
                prop.peek = _peek;
                prop.computed = _computed;
                prop.dispose = _dispose;
                return prop;
            };
            return Observable;
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
