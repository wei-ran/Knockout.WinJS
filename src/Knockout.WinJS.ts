module WinJS.Knockout {
 
    export var observable = function (data): any {
        var _data = typeof data == "object" ? data : new PrimitiveTypeWrapper(data);
        var _observable = WinJS.Binding.as(_data);
        return new Observable(_observable);
    }

    export var computed = function (func: Function, destObj? : any, destProp? : string) {
        if (typeof func == "function") {
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

            var _initVal;
           
            DependencyDetection.Detect(() => {
                 _computed.setProperty(_propName, func());
            },
            () => {
                _initVal = func();
                _computed.setProperty(_propName, _initVal)
            });

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
            var data = winjsObservable.backingData;
            var that = this;
            while (data && data !== Object.prototype) {
                Object.keys(data).forEach((key) => this._addProperty.call(that, key));
                data = Object.getPrototypeOf(data);
            }

        }

        bindable() {
            return this._winjsObservable;
        }

        addProperty(name: string, value) : any {
            var ret = this._winjsObservable.addProperty(name);
            this._addProperty(name);
            return ret;
        }

        getProperty(name: string) : any {
            var observable = this._winjsObservable;

            DependencyDetection.ActIfSubscriberExists((subscriber) => {
                observable.bind(name, subscriber);
            });

            return observable.getProperty(name);
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

        private _addProperty(name) {
            var that = <Observable> this;

            var prop = function (value?: any) {
                if (arguments.length == 0) {
                    return that.getProperty(name);
                }
                else {
                    return that.setProperty(name, value);
                }
            }

            this[name] = prop;

            var _prop = this[name];
            _prop.peek = function () {
                return that._winjsObservable.getProperty(name);
            }

            return _prop;
        }
    }

    class DependencyDetection {

        private static _currentSubscriber;

        static Detect(subscriber, action: Function) {
            var exitingSubscriber = DependencyDetection._currentSubscriber;
            DependencyDetection._currentSubscriber = subscriber;
            try {
                action();
            }
            finally {
                DependencyDetection._currentSubscriber = exitingSubscriber;
            }
        }

        static ActIfSubscriberExists(action: Function) {
            var subscriber = DependencyDetection._currentSubscriber
            if (subscriber) {
                action(subscriber);
            }
        }
    }

    class PrimitiveTypeWrapper {
        value: any;
        constructor(value) {
            this.value = value;
        }
    }
}