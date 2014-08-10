module WinJS.KO {
 
    export var observable = function (data): any {
        var _data = typeof data == "object" ? data : new PrimitiveTypeWrapper(data);

        if (_data) {
            var _observable = WinJS.Binding.as(_data);
            return new Observable(_observable);
        }

        return _data;
    }

    export var computed = function (evaluator: Function, destObj?: any, destProp?: string) {
        if (typeof evaluator == "function") {
            var _computed;
            var _propName: string;

            if (arguments.length > 1) {
                if (destObj && destObj instanceof Observable) {
                    _computed = destObj;
                    _propName = destProp;
                }
                else {
                    //if destionation object is not a observable, just sets and returns the value immediately
                    var ret = evaluator();
                    destObj[destProp] = ret;
                    return ret;
                }
            }
            else {
                _computed = observable(0);
                _propName = "value";
            }

            var _initVal;

            var computedUpdater = function () {
                var context = DependencyDetection.currentContext();
                if (context && context.type == 0) {
                    return; //triggered by the bind methods in intial computed. do nothing
                }
                context = new DependencyDetectionContext(1, new UpdateStamp(new Date(0)));
                DependencyDetection.begin(context);
                try {
                    var value = evaluator();
                    var lastUpdatedStamp = <UpdateStamp>_computed._lastUpdatedStamps[_propName];
                    if (!lastUpdatedStamp || lastUpdatedStamp.lessThan(context.upateStamp)) {
                        _computed.setProperty(_propName, value, context.upateStamp);
                    }
                }
                finally {
                    DependencyDetection.end();
                }
            }

            DependencyDetection.begin(new DependencyDetectionContext(0, computedUpdater));
            try {
                _initVal = evaluator();
                _computed.setProperty(_propName, _initVal);
            }
            finally {
                DependencyDetection.end();
            }

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

        addProperty(name: string, value): any {
            var ret = this._winjsObservable.addProperty(name);
            this._addProperty(name);
            return ret;
        }

        getProperty(name: string): any {
            var observable = this._winjsObservable;

            var context = DependencyDetection.currentContext();
            if (context)
            {
                if (context.type == 0) { //initial computed
                    observable.bind(name, context.subscriber);
                }
                else if (context.type == 1) { //computed updater
                    var lastUpdateStamp = this._lastUpdatedStamps[name];
                    if (lastUpdateStamp && context.upateStamp.lessThan(lastUpdateStamp)) {
                        context.upateStamp = lastUpdateStamp;
                    }
                }
            }
            
            return observable.getProperty(name);
        }

        _lastUpdatedStamps = {};

        setProperty(name: string, value: any, updateStamp? : UpdateStamp) {
            this._lastUpdatedStamps[name] = updateStamp || UpdateStamp.newStamp();
            this._winjsObservable.updateProperty(name, value);
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
            _prop.computed = function (evaluator: Function) {
                computed(evaluator, that, name);
            }

            return _prop;
        }
    }

    class DependencyDetectionContext {
        constructor(type: number, subsriberOrUpdateStamp) {
            this.type = type;
            if (type == 0) {
                this.subscriber = subsriberOrUpdateStamp;
            }
            else {
                this.upateStamp = subsriberOrUpdateStamp;
            }
        }


        type: number; //0: initial evalutor, 1: computed updater, 2: computed writer
        subscriber: Function;   //only needed for type 0
        upateStamp: UpdateStamp; //only need for type 1 and 2
    }

    class DependencyDetection {

        private static _currentContext: DependencyDetectionContext;
        private static contextStack = [];

        static begin(context: DependencyDetectionContext) {
            DependencyDetection.contextStack.push(DependencyDetection._currentContext);
            DependencyDetection._currentContext = context;
        }

        static end() {
            DependencyDetection._currentContext = DependencyDetection.contextStack.pop();
        }

        static currentContext(): DependencyDetectionContext {
            return DependencyDetection._currentContext;
        }
    }

    class UpdateStamp {
        constructor(timeStamp?: Date, index?: number) {
            this.timeStamp = timeStamp || new Date();
            this.index = index || 0;
        }

        timeStamp: Date;
        index: number;

        lessThan(updateStamp: UpdateStamp): boolean {
            return this.timeStamp < updateStamp.timeStamp || (this.timeStamp < updateStamp.timeStamp && this.index < updateStamp.index);
        }

        static newStamp(): UpdateStamp {
            var stamp = new UpdateStamp;
            if (stamp.timeStamp == UpdateStamp._lastUpdateStamp.timeStamp) {
                stamp.index == UpdateStamp._lastUpdateStamp.index + 1;
            }

            UpdateStamp._lastUpdateStamp = new UpdateStamp(stamp.timeStamp, stamp.index); 

            return stamp;
        }

        private static _lastUpdateStamp: UpdateStamp = new UpdateStamp; 
    }

    class PrimitiveTypeWrapper {
        value: any;
        constructor(value) {
            this.value = value;
        }
    }
}