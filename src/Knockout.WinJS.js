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
                // Single-parameter syntax - everything is on this "options" param
                options = evaluatorFunctionOrOptions || {};
                readFunction = options["read"];
            } else {
                // Multi-parameter syntax - construct the options according to the params passed
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

            var computedUpdater = function () {
                var context = DependencyDetection.currentContext();
                if (context && context.type == 0) {
                    return;
                }
                context = new DependencyDetectionContext(1, new UpdateStamp(new Date(0)));
                DependencyDetection.execute(context, function () {
                    var value = evaluator();
                    if (_computed instanceof Observable) {
                        var lastUpdatedStamp = _computed._lastUpdatedStamps[_propName];
                        if (!lastUpdatedStamp || lastUpdatedStamp.lessThan(context.upateStamp)) {
                            _computed.setProperty(_propName, value, context.upateStamp);
                        }
                    } else {
                        _computed._propName = value;
                    }
                });
            };

            var writer = options["write"];
            if (writer && typeof writer == "function") {
                if (_computed instanceof Observable) {
                    DependencyDetection.execute(new DependencyDetectionContext(2), function () {
                        _computed.bindable().bind(_propName, function () {
                            var context = DependencyDetection.currentContext();
                            if (!context || context.type != 2) {
                                context = new DependencyDetectionContext(3, _computed._lastUpdatedStamps[_propName] || UpdateStamp.newStamp());
                                DependencyDetection.execute(context, function () {
                                    evaluatorFunctionTarget ? writer.call(evaluatorFunctionTarget) : writer();
                                });
                            }
                        });
                    });
                } else {
                    throw new Error("A non-observable destionation does not support writer.");
                }
            }

            DependencyDetection.execute(new DependencyDetectionContext(0, computedUpdater), function () {
                _initVal = evaluator();
                if (_computed instanceof Observable) {
                    _computed.setProperty(_propName, _initVal);
                } else {
                    _computed._propName = _initVal;
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
                this._lastUpdatedStamps = {};
                this._winjsObservable = winjsObservable;
                var data = winjsObservable.backingData;
                var that = this;
                while (data && data !== Object.prototype) {
                    Object.keys(data).forEach(function (key) {
                        return _this._addProperty.call(that, key);
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
                    if (context.type == 0) {
                        observable.bind(name, context.subscriber);
                    } else if (context.type == 1) {
                        var lastUpdateStamp = this._lastUpdatedStamps[name];
                        if (lastUpdateStamp && context.upateStamp.lessThan(lastUpdateStamp)) {
                            context.upateStamp = lastUpdateStamp;
                        }
                    }
                }

                return observable.getProperty(name);
            };

            Observable.prototype.setProperty = function (name, value, updateStamp) {
                var context = DependencyDetection.currentContext();
                if (context && context.type == 3) {
                    var lastUpdateStamp = this._lastUpdatedStamps[name];
                    if (!lastUpdateStamp || lastUpdateStamp.lessThan(context.upateStamp)) {
                        this._lastUpdatedStamps[name] = context.upateStamp;
                        this._winjsObservable.updateProperty(name, value);
                    }
                } else {
                    this._lastUpdatedStamps[name] = updateStamp || UpdateStamp.newStamp();
                    this._winjsObservable.updateProperty(name, value);
                }
            };

            Observable.prototype._addProperty = function (name) {
                var that = this;

                var prop = function (value) {
                    if (arguments.length == 0) {
                        return that.getProperty(name);
                    } else {
                        return that.setProperty(name, value);
                    }
                };

                this[name] = prop;

                var _prop = this[name];
                _prop.peek = function () {
                    return that._winjsObservable.getProperty(name);
                };
                _prop.computed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget, options) {
                    KO.computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, that, name);
                };

                return _prop;
            };
            return Observable;
        })();

        var DependencyDetectionContext = (function () {
            function DependencyDetectionContext(type, subsriberOrUpdateStamp) {
                this.type = type;
                if (type == 0) {
                    this.subscriber = subsriberOrUpdateStamp;
                } else {
                    this.upateStamp = subsriberOrUpdateStamp;
                }
            }
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
