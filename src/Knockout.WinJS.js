var WinJS;
(function (WinJS) {
    (function (Knockout) {
        Knockout.observable = function (data) {
            var _data = typeof data == "object" ? data : new PrimitiveTypeWrapper(data);
            var _observable = WinJS.Binding.as(_data);
            return new Observable(_observable);
        };

        Knockout.computed = function (func, destObj, destProp) {
            if (typeof func == "function" && (func.arguments == null || func.arguments.length == 0)) {
                var _computed;
                var _propName;

                if (destObj && destObj.setProperty && destProp) {
                    _computed = destObj;
                    _propName = destProp;
                } else {
                    _computed = Knockout.observable(0);
                    _propName = "value";
                }

                var _initVal = _computed.setProperty(_propName, func(function () {
                    _computed.setProperty(_propName, func());
                }));

                if (_computed == destObj) {
                    return _initVal;
                } else {
                    return _computed;
                }
            }
        };

        var Observable = (function () {
            function Observable(winjsObservable) {
                this._winjsObservable = winjsObservable;
            }
            Observable.prototype.bindable = function () {
                return this._winjsObservable;
            };

            Observable.prototype.getProperty = function (name) {
                var caller = this.getProperty.caller;
                var subscriber = null;

                if (caller && caller.arguments && caller.arguments.length > 0) {
                    var _subscriber = caller.arguments[0];
                    if (_subscriber.bind && typeof _subscriber.bind == "function") {
                        subscriber = _subscriber;
                    }
                }

                if (subscriber) {
                    this._winjsObservable.bind(name, subscriber);
                }

                return this._winjsObservable.getProperty(name);
            };

            Observable.prototype.setProperty = function (name, value) {
                if (typeof value == "object" && Object.getPrototypeOf(value) == Observable.prototype && ((this.bindable()._listeners || {})[name] || []).length == 0) {
                    return Knockout.computed(function () {
                        return value.getProperty("value");
                    }, this, name);
                } else {
                    return this._winjsObservable.setProperty(name, value);
                }
            };
            return Observable;
        })();

        var PrimitiveTypeWrapper = (function () {
            function PrimitiveTypeWrapper(value) {
                this.value = value;
            }
            return PrimitiveTypeWrapper;
        })();
    })(WinJS.Knockout || (WinJS.Knockout = {}));
    var Knockout = WinJS.Knockout;
})(WinJS || (WinJS = {}));
//# sourceMappingURL=Knockout.WinJS.js.map
