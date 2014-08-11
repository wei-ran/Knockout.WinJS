module WinJS.KO {
 
    export var observable = function (data): any {
        var _data = typeof data == "object" ? data : new PrimitiveTypeWrapper(data);

        if (_data) {
            var _observable = WinJS.Binding.as(_data);
            return new Observable(_observable);
        }

        return _data;
    }

    export var computed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget?, options?, destObj?: any, destProp?: string) {

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
        var evaluator = () => {
            return evaluatorFunctionTarget ? readFunction.call(evaluatorFunctionTarget) : readFunction();
        }

        var _computed;
        var _propName: string;

        if (destObj) {
            _computed = destObj;
            _propName = destProp;
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
            DependencyDetection.execute(context, () => {
                var value = evaluator();
                if (_computed instanceof Observable) {
                    var lastUpdatedStamp = <UpdateStamp>_computed._lastUpdatedStamps[_propName];
                    if (!lastUpdatedStamp || lastUpdatedStamp.lessThan(context.upateStamp)) {
                        _computed.setProperty(_propName, value, context.upateStamp);
                    }
                } else {
                    _computed._propName = value;
                }
            });
        }

        var writer = options["write"];
        if (writer && typeof writer == "function") {
            if (_computed instanceof Observable) {
                DependencyDetection.execute(new DependencyDetectionContext(2), () => {
                    _computed.bindable().bind(_propName, () => {
                        var context = DependencyDetection.currentContext();
                        if (!context || context.type != 2) { //skip initial writer run
                            context = new DependencyDetectionContext(3, _computed._lastUpdatedStamps[_propName] || UpdateStamp.newStamp());
                            DependencyDetection.execute(context, () => {
                                evaluatorFunctionTarget ? writer.call(evaluatorFunctionTarget) : writer();
                            });
                        }
                    });
                });
            }
            else {
                throw new Error("A non-observable destionation does not support writer.");
            }
        }

        DependencyDetection.execute(new DependencyDetectionContext(0, computedUpdater), () => {
            _initVal = evaluator();
            if (_computed instanceof Observable) {
                _computed.setProperty(_propName, _initVal);
            }
            else {
                _computed._propName = _initVal;
            }
        });

        if (_computed == destObj) {
            return _initVal;
        }
        else {
            return _computed;
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

        setProperty(name: string, value: any, updateStamp?: UpdateStamp) {
            var context = DependencyDetection.currentContext();
            if (context && context.type == 3) {
                var lastUpdateStamp = this._lastUpdatedStamps[name];
                if (!lastUpdateStamp || lastUpdateStamp.lessThan(context.upateStamp)) {
                    this._lastUpdatedStamps[name] = context.upateStamp;
                    this._winjsObservable.updateProperty(name, value);
                }
            }
            else {
                this._lastUpdatedStamps[name] = updateStamp || UpdateStamp.newStamp();
                this._winjsObservable.updateProperty(name, value);
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
            _prop.computed = function (evaluatorFunctionOrOptions, evaluatorFunctionTarget?, options?) {
                computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, that, name);
            }

            return _prop;
        }
    }

    class DependencyDetectionContext {
        constructor(type: number, subsriberOrUpdateStamp?) {
            this.type = type;
            if (type == 0) {
                this.subscriber = subsriberOrUpdateStamp;
            }
            else {
                this.upateStamp = subsriberOrUpdateStamp;
            }
        }


        type: number; //0: initial evalutor, 1: computed updater, 2: writer intial run, 3: computed writer
        subscriber: Function;   //only needed for type 0
        upateStamp: UpdateStamp; //only need for type 1 and 2
    }

    class DependencyDetection {

        private static _currentContext: DependencyDetectionContext;
        private static contextStack = [];

        static execute(context: DependencyDetectionContext, callback: Function) {
            try {
                var existingContext = DependencyDetection._currentContext;
                DependencyDetection._currentContext = context;

                callback();
            }
            finally {
                DependencyDetection._currentContext = existingContext;
            }
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