//Copyright (c) wildcatsoft.
//All Rights Reserved.
//Licensed under the Apache License, Version 2.0.
//See License.txt in the project root for license information.
/// <reference path="../typings/winjs/winjs.d.ts" />

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
        var computedProperty: ComputedProperty = _computed[_propName];

        if (_computed instanceof Observable) {
            _computed.dispose(_propName);
        }

        var computedUpdater = function () {
            var context = DependencyDetection.currentContext();
            if (context && context.type == DependencyDetectionContext.TYPE_INITIAL_EVALUATION) {
                return; //triggered by the bind methods in intial evaluation. do nothing
            }

            var value = evaluator();
            var dependencies = <ObservableProperty[]>(computedProperty._dependencies || []);
            var updateStamp = new UpdateStamp(new Date(0));
            dependencies.forEach(function (d) {
                var lastUpdateStamp = d._observable._lastUpdatedStamp(d._propertyName);
                if (lastUpdateStamp && updateStamp.lessThan(lastUpdateStamp)) {
                    updateStamp = lastUpdateStamp;
                }
            });

            if (_computed instanceof Observable) {
                var lastUpdatedStamp = <UpdateStamp>_computed._lastUpdatedStamp(_propName);
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
                    context = new DependencyDetectionContext(DependencyDetectionContext.COMPUTED_WRITER, _computed._lastUpdatedStamp(_propName) || UpdateStamp.newStamp());
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

        DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_INITIAL_EVALUATION, new ObservableProperty(_computed, _propName)), () => {
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

    export function observableArray(list) : IObservableArray<any> {
        var winJSList = <any>new WinJS.Binding.List(list);
        var lastUpdatedStamp: UpdateStamp;

        function onListChanged() {
            lastUpdatedStamp = new UpdateStamp();
            var oldArray = winJSList._array;
            winJSList._array = getRawArray(winJSList);

            winJSList.notify("_array", winJSList._array, oldArray);
        }

        winJSList.addEventListener("itemchanged", onListChanged);
        winJSList.addEventListener("iteminserted", onListChanged);
        winJSList.addEventListener("itemmoved", onListChanged);
        winJSList.addEventListener("itemmutated", onListChanged);
        winJSList.addEventListener("itemremoved", onListChanged);
        winJSList.addEventListener("reload", onListChanged);

        winJSList._lastUpdatedStamp = function () {
            return lastUpdatedStamp;
        };

        winJSList._array = getRawArray(winJSList);

        winJSList.array = function() {
            var context = DependencyDetection.currentContext();
            if (context) {
                _bindComputedUpdaterIfNeccessary(<any>winJSList, "_array");
            }

            return winJSList._array;
        };
        return <IObservableArray<any>>winJSList;
    }

    export function getRawArray<T>(list : WinJS.Binding.List<T>): T[]
    {
        if (list instanceof WinJS.Binding.List) {
            return list.map(function (v) {return v });
        }
    }

    export interface IObservableArray<T> extends WinJS.Binding.List<T> {
        array(): T[];
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

        bind(name: string, action: Function) {
            return this._winjsObservable.bind(name, action);
        }

        unbind(name: string, action: Function) {
            return this._winjsObservable.unbind(name, action);
        }

        addComputedProperty(name: string, evaluatorFunctionOrOptions, evaluatorFunctionTarget?, options?, destObj?: any, destProp?: string) {
            this.addProperty(name);
            computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, this, name);
        }

        addProperty(name: string, value?): any {
            var ret = this._winjsObservable.addProperty(name, value);
            this._addProperty(name);
            return ret;
        }

        getProperty(name: string): any {
            _bindComputedUpdaterIfNeccessary(this, name);

            return this._winjsObservable.getProperty(name);
        }

        setProperty(name: string, value: any, updateStamp?: UpdateStamp) {
            var property = this[name];
            var context = DependencyDetection.currentContext();
            if (context && context.type == DependencyDetectionContext.COMPUTED_WRITER) {
                var lastUpdateStamp = this._lastUpdatedStamp(name);
                if (!lastUpdateStamp || lastUpdateStamp.lessThan(context.upateStamp)) {
                    this._lastUpdatedStamp(name, context.upateStamp);
                    this._winjsObservable.updateProperty(name, value);
                }
            }
            else {
                this._lastUpdatedStamp(name, updateStamp || UpdateStamp.newStamp());
                this._winjsObservable.updateProperty(name, value);
            }
        }

        dispose(name?: string) {
            if (arguments.length > 0) {
                var property = <ComputedProperty>this[name];
                if (property) {
                    if (property._computedUpdater) {
                        var dependencies: ObservableProperty[] = property._dependencies || [];
                        dependencies.forEach(function (d) {
                            d._observable.unbind(d._propertyName, property._computedUpdater);
                        });
                        property._computedUpdater = null;
                        property._dependencies = [];
                    }

                    if (property._computedWriter) {
                        this.unbind(name, property._computedWriter);
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
        _lastUpdatedStamps: {};

        _lastUpdatedStamp(name?: string, updateStamp?: UpdateStamp) : UpdateStamp {
            this._lastUpdatedStamps = this._lastUpdatedStamps || {};
            if (arguments.length == 1) {
                return this._lastUpdatedStamps[name];
            }
            else if (arguments.length > 1){
                this._lastUpdatedStamps[name] = updateStamp;
            }
        }

        _getObservable() {
            return this;
        }

        private _addProperty(name){

            var prop: ComputedProperty = <any>((value?: any) => {
                if (arguments.length == 0) {
                    return this.getProperty(name);
                }
                else {
                    return this.setProperty(name, value);
                }
            });

            this[name] = prop;

            var _peek = ()=> {
                return this._winjsObservable.getProperty(name);
            }

            var _computed = (evaluatorFunctionOrOptions, evaluatorFunctionTarget?, options?) => {
                computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, this, name);
            }

            var _dispose = ()=> {
                this.dispose(name);
            }

            prop.peek = _peek;
            prop.computed = _computed
            prop.dispose = _dispose;
            return prop;
        }
    }

    function _bindComputedUpdaterIfNeccessary(observable: IObservable, name : string) {
        var context = DependencyDetection.currentContext();
        if (context) {
            if (context.type == DependencyDetectionContext.TYPE_INITIAL_EVALUATION) { //initial computed evaluator
                var observableProperty = context.observableProperty;
                var computed: ComputedProperty = observableProperty._observable[observableProperty._propertyName];
                var property = new ObservableProperty(observable, name);
                var dependencies = <any[]>(computed._dependencies || []);
                if (!dependencies.some(function (o) {
                    return o === property;
                })) {
                    dependencies.push(property);
                };
                computed._dependencies = dependencies;

                observable.bind(name, computed._computedUpdater);
            }
        }
    }

    interface IObservable {
        bind(name: string, action: Function);
        unbind(name: string, action: Function);
        _lastUpdatedStamp(name: string): UpdateStamp;
    }

    class ObservableProperty {
        constructor(observable : IObservable, propertyName : string) {
            this._observable = observable;
            this._propertyName = propertyName;
        }
        _observable: IObservable;
        _propertyName: string;
    }

    interface ComputedProperty extends Function {
        _dependencies?: ObservableProperty[];
        _computedUpdater?: Function;
        _computedWriter?: Function;
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