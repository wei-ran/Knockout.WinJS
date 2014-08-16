//Copyright (c) wildcatsoft (Wei Ran).
//All Rights Reserved.
//Licensed under the Apache License, Version 2.0.
//See License.txt in the project root for license information.
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
        var computedProperty: ObservableProperty = _computed[_propName];

        if (_computed instanceof Observable) {
            _computed.dispose(_propName);
        }

        var computedUpdater = function () {
            var context = DependencyDetection.currentContext();
            if (context && context.type == DependencyDetectionContext.TYPE_INITIAL_EVALUATION) {
                return; //triggered by the bind methods in intial evaluation. do nothing
            }

            var value = evaluator();
            var dependencies = <any[]>(computedProperty._dependencies || []);
            var updateStamp = new UpdateStamp(new Date(0));
            dependencies.forEach(function (d) {
                var lastUpdateStamp = d._lastUpdatedStamp;
                if (lastUpdateStamp && updateStamp.lessThan(lastUpdateStamp)) {
                    updateStamp = lastUpdateStamp;
                }
            });

            if (_computed instanceof Observable) {
                var lastUpdatedStamp = <UpdateStamp>computedProperty._lastUpdatedStamp;
                if (!lastUpdatedStamp || lastUpdatedStamp.lessThan(updateStamp)) {
                    _computed.setProperty(_propName, value, updateStamp);
                }
            } else {
                _computed[_propName] = value;
            }
        }

        var writer = options["write"];
        if (writer && typeof writer == "function") {
            computedProperty._computedWriter = function() {
                var context = DependencyDetection.currentContext();
                if (!context || context.type != DependencyDetectionContext.TYPE_WRITER_INITIAL_RUN) { //skip for the writer initial run
                    context = new DependencyDetectionContext(DependencyDetectionContext.COMPUTED_WRITER, computedProperty._lastUpdatedStamp || UpdateStamp.newStamp());
                    DependencyDetection.execute(context, () => {
                        evaluatorFunctionTarget ? writer.call(evaluatorFunctionTarget) : writer();
                    });
                }
            };

            if (_computed instanceof Observable) {
                DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_WRITER_INITIAL_RUN), () => {
                    _computed.bindable().bind(_propName, computedProperty._computedWriter);
                });
            }
            else {
                throw new Error("A non-observable destionation does not support writer.");
            }
        }

        computedProperty._computedUpdater = computedUpdater;

        DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_INITIAL_EVALUATION, computedProperty), () => {
            _initVal = evaluator();
            if (_computed instanceof Observable) {
                _computed.setProperty(_propName, _initVal);
            }
            else {
                _computed[_propName] = _initVal;
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
            while (data && data !== Object.prototype) {
                Object.keys(data).forEach((key) => this._addProperty(key));
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
            if (context) {
                if (context.type == DependencyDetectionContext.TYPE_INITIAL_EVALUATION) { //initial computed evaluator
                    var observableProperty = context.observableProperty;
                    var property = this[name];
                    var dependencies = <any[]>(observableProperty._dependencies || []);
                    if (!dependencies.some(function (o) {
                        return o === property;
                    })) {
                        dependencies.push(property);
                    };
                    observableProperty._dependencies = dependencies;

                    observable.bind(name, context.observableProperty._computedUpdater);
                }
            }

            return observable.getProperty(name);
        }

        setProperty(name: string, value: any, updateStamp?: UpdateStamp) {
            var property = this[name];
            var context = DependencyDetection.currentContext();
            if (context && context.type == DependencyDetectionContext.COMPUTED_WRITER) {
                var lastUpdateStamp = property._lastUpdatedStamp;
                if (!lastUpdateStamp || lastUpdateStamp.lessThan(context.upateStamp)) {
                    property._lastUpdatedStamp = context.upateStamp;
                    this._winjsObservable.updateProperty(name, value);
                }
            }
            else {
                property._lastUpdatedStamp = updateStamp || UpdateStamp.newStamp();
                this._winjsObservable.updateProperty(name, value);
            }
        }

        dispose(name?: string) {
            if (arguments.length > 0) {
                var property = <ObservableProperty>this[name];
                if (property) {
                    if (property._computedUpdater) {
                        var dependencies: ObservableProperty[] = property._dependencies || [];
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
            }
            else {
                Object.keys(this).forEach((k) => {
                    this.dispose(k);
                });
            }
        }

        _winjsObservable: any;

        private _addProperty(name){

            var prop: ObservableProperty = <any>((value?: any) => {
                if (arguments.length == 0) {
                    return this.getProperty(name);
                }
                else {
                    return this.setProperty(name, value);
                }
            });

            this[name] = prop;

            function _peek() {
                return this._observable._winjsObservable.getProperty(name);
            }

            function _computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget?, options?) {
                computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, this._observable, this._propertyName);
            }

            function _dispose() {
                this._observable.dispose(this._propertyName);
            }

            prop._observable = this;
            prop._propertyName = name;
            prop.peek = _peek;
            prop.computed = _computed
            prop.dispose = _dispose;
            return prop;
        }
    }

    interface ObservableProperty extends Function {
        _observable: Observable;
        _propertyName: string;
        _dependencies?: ObservableProperty[];
        _computedUpdater?: Function;
        _computedWriter?: Function;
        _lastUpdatedStamp?: UpdateStamp;
        peek: Function;
        computed: Function;
        dispose: Function;
        
    }

    class DependencyDetectionContext {
        constructor(type: number, observablePropertyOrUpdateStamp?) {
            this.type = type;
            if (type == DependencyDetectionContext.TYPE_INITIAL_EVALUATION) {
                this.observableProperty = observablePropertyOrUpdateStamp;
            }
            else {
                this.upateStamp = observablePropertyOrUpdateStamp;
            }
        }

        static TYPE_INITIAL_EVALUATION = 0;
        static TYPE_COMPUTED_UPDATER = 1;
        static TYPE_WRITER_INITIAL_RUN = 2;
        static COMPUTED_WRITER = 3;

        type: number; //0: initial evalutor, 1: computed updater, 2: writer intial run, 3: computed writer
        observableProperty: ObservableProperty;   //only needed for type 0
        upateStamp: UpdateStamp; //only need for type 1, 2, 3
        
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