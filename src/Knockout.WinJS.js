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

        KO.computed = function (evaluator, destObj, destProp) {
            if (typeof evaluator == "function") {
                var _computed;
                var _propName;

                if (arguments.length > 1) {
                    if (destObj && destObj instanceof Observable) {
                        _computed = destObj;
                        _propName = destProp;
                    } else {
                        //if destionation object is not a observable, just sets and returns the value immediately
                        var ret = evaluator();
                        destObj[destProp] = ret;
                        return ret;
                    }
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
                    DependencyDetection.begin(context);
                    try  {
                        var value = evaluator();
                        var lastUpdatedStamp = _computed._lastUpdatedStamps[_propName];
                        if (!lastUpdatedStamp || lastUpdatedStamp.lessThan(context.upateStamp)) {
                            _computed.setProperty(_propName, value, context.upateStamp);
                        }
                    } finally {
                        DependencyDetection.end();
                    }
                };

                DependencyDetection.begin(new DependencyDetectionContext(0, computedUpdater));
                try  {
                    _initVal = evaluator();
                    _computed.setProperty(_propName, _initVal);
                } finally {
                    DependencyDetection.end();
                }

                if (_computed == destObj) {
                    return _initVal;
                } else {
                    return _computed;
                }
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
                this._lastUpdatedStamps[name] = updateStamp || UpdateStamp.newStamp();
                this._winjsObservable.updateProperty(name, value);
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
                _prop.computed = function (evaluator) {
                    KO.computed(evaluator, that, name);
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
            DependencyDetection.begin = function (context) {
                DependencyDetection.contextStack.push(DependencyDetection._currentContext);
                DependencyDetection._currentContext = context;
            };

            DependencyDetection.end = function () {
                DependencyDetection._currentContext = DependencyDetection.contextStack.pop();
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
