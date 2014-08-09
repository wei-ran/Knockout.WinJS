module WinJS.Knockout {
 
    export var observable = function (data): any {
        var _data = typeof data == "object" ? data : new PrimitiveTypeWrapper(data);
        var _observable = WinJS.Binding.as(_data);
        return new Observable(_observable);
    }

    export var computed = function (func: Function, destObj? : any, destProp? : string) {
        if (typeof func == "function" && (func.arguments == null || func.arguments.length == 0)) {
            var _computed;
            var _propName: string;
 
            if (destObj && destObj.setProperty && destProp) {
                _computed = destObj;
                _propName = destProp;
            }
            else {
                _computed = observable(0);
                _propName = "value";
            }

            var _initVal = _computed.setProperty(_propName, func(() => {
                _computed.setProperty(_propName, func());
            }));

            if (_computed == destObj) {
                return _initVal;
            }
            else {
                return _computed;
            }
        }
    }

    class Observable {
        constructor(winjsObservable) {
            this._winjsObservable = winjsObservable;
        }

        bindable() {
            return this._winjsObservable;
        }

        getProperty(name: string) : any {
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
        }

        setProperty(name: string, value: any): any {
            if (typeof value == "object" && Object.getPrototypeOf(value) == Observable.prototype
                && ((this.bindable()._listeners || {})[name] || []).length == 0)
            {
                return computed(() => {
                    return value.getProperty("value");
                }, this, name);
            }
            else {
                return this._winjsObservable.setProperty(name, value);
            }
        }

    _winjsObservable: any;
    }

    class PrimitiveTypeWrapper {
        value: any;
        constructor(value) {
            this.value = value;
        }
    }
}