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

        KO.computed = function (func, destObj, destProp) {
            if (typeof func == "function") {
                var _computed;
                var _propName;

                if (destObj && destObj.setProperty && destProp) {
                    _computed = destObj;
                    _propName = destProp;
                } else {
                    _computed = KO.observable(0);
                    _propName = "value";
                }

                var _initVal;

                DependencyDetection.Detect(function () {
                    _computed.setProperty(_propName, func());
                }, function () {
                    _initVal = func();
                    _computed.setProperty(_propName, _initVal);
                });

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

                DependencyDetection.ActIfSubscriberExists(function (subscriber) {
                    observable.bind(name, subscriber);
                });

                return observable.getProperty(name);
            };

            Observable.prototype.setProperty = function (name, value) {
                if (typeof value == "object" && Object.getPrototypeOf(value) == Observable.prototype && ((this.bindable()._listeners || {})[name] || []).length == 0) {
                    return KO.computed(function () {
                        return value.getProperty("value");
                    }, this, name);
                } else {
                    return this._winjsObservable.setProperty(name, value);
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
                _prop.computed = function (evaluator) {
                    KO.computed(evaluator, that, name);
                };

                return _prop;
            };
            return Observable;
        })();

        var DependencyDetection = (function () {
            function DependencyDetection() {
            }
            DependencyDetection.Detect = function (subscriber, action) {
                var exitingSubscriber = DependencyDetection._currentSubscriber;
                DependencyDetection._currentSubscriber = subscriber;
                try  {
                    action();
                } finally {
                    DependencyDetection._currentSubscriber = exitingSubscriber;
                }
            };

            DependencyDetection.ActIfSubscriberExists = function (action) {
                var subscriber = DependencyDetection._currentSubscriber;
                if (subscriber) {
                    action(subscriber);
                }
            };
            return DependencyDetection;
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
