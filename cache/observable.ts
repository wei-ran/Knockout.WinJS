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
            createObservable(_observable);
            return _observable;
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

        evaluatorFunctionTarget = evaluatorFunctionTarget || options["owner"] || _computed;

        var evaluator = () => {
            return readFunction.call(evaluatorFunctionTarget);
        }

        var _initVal;


        if (_computed.dispose) {
            _computed.dispose(_propName);
        }

        var computedProperty: ComputedProperty = new ComputedProperty;
        _computed._computedProperties[_propName] = computedProperty;

        var computedUpdater = function () {
            var context = DependencyDetection.currentContext();
            if (context && context.type == DependencyDetectionContext.TYPE_COMPUTED_DEPENDENCY_BIND) {
                return; //triggered by the bind methods in intial evaluation. do nothing
            }

            computedProperty._removeAllDependencies();

            var value;
            DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_COMPUTED_EVALUATIOR, new ObservableProperty(_computed, _propName)), function () {
                value = evaluator();
            });

            var dependencies = <ObservableProperty[]>(computedProperty._dependencies || []);
            DependencyDetection.execute(new DependencyDetectionContext(DependencyDetectionContext.TYPE_COMPUTED_DEPENDENCY_BIND), function () {
                dependencies.forEach(function (d) {
                    d._observable.bind(d._propertyName, computedUpdater);
                });
            });

            var updateStamp = new UpdateStamp(new Date(0));
            dependencies.forEach(function (d) {
                var lastUpdateStamp = d._observable._lastUpdatedStamp(d._propertyName);
                if (lastUpdateStamp && updateStamp.lessThan(lastUpdateStamp)) {
                    updateStamp = lastUpdateStamp;
                }
            });

            if (_computed._lastUpdatedStamp) {
                var lastUpdatedStamp = <UpdateStamp>_computed._lastUpdatedStamp(_propName);
                if (!lastUpdatedStamp || lastUpdatedStamp.lessThan(updateStamp)) {
                    _computed.updateProperty(_propName, value, updateStamp);
                }
            } else {
                _computed[_propName] = value;
            }

            return value;
        }

        var writer = options["write"];
        if (writer && typeof writer == "function") {
            computedProperty._computedWriter = function (value) {
                writer.call(evaluatorFunctionTarget, value);
            };
        }

        computedProperty._computedUpdater = computedUpdater;

        if (typeof _computed._lastUpdatedStamp == "function") {
            _computed._lastUpdatedStamp(_propName, null);
        }

        var initValue = computedUpdater();

        if (_computed == destObj) {
            return _initVal;
        }
        else {
            return _computed;
        }
    }

    export function observableArray(list?): IObservableArray<any> {
        var list = list || [];
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

        Object.defineProperty(winJSList, "array", {
            get: function () {
                var context = DependencyDetection.currentContext();
                if (context) {
                    _bindComputedUpdaterIfNeccessary(<any>winJSList, "_array");
                }

                return winJSList._array;
            },
            enumerable: true,
            configurable: true
        });

        return <IObservableArray<any>>winJSList;
    }

    export function isObservableArray(obj): boolean {
        return obj instanceof WinJS.Binding.List && obj._array instanceof Array;
    }

    export function getRawArray<T>(list: WinJS.Binding.List<T>): T[] {
        if (list instanceof WinJS.Binding.List) {
            return list.map(function (v) {return v });
        }
    }

    export interface IObservableArray<T> extends WinJS.Binding.List<T> {
        array: T[];
    }

    function createObservable(winjsObservable) {
        winjsObservable.addComputedProperty = function (name: string, evaluatorFunctionOrOptions, evaluatorFunctionTarget?, options?, destObj?: any, destProp?: string) {
            this.addProperty(name);
            computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, this, name);
        }

        var _getProperty: Function = winjsObservable.getProperty;

        winjsObservable.getProperty = function (name: string): any {
            _bindComputedUpdaterIfNeccessary(this, name);
            return _getProperty.call(this, name);
        }

        var _updateProperty: Function = winjsObservable.updateProperty;

        winjsObservable.updateProperty = function (name: string, value: any, updateStamp?: UpdateStamp) {
            this._lastUpdatedStamp(name, updateStamp || UpdateStamp.newStamp());
            _updateProperty.call(this, name, value);
        }

        var _setProperty: Function = winjsObservable.setProperty;
        winjsObservable.setProperty = function (name: string, value: any) {

            var computedProperty: ComputedProperty = this._computedProperty(name);
            if (computedProperty) {
                if (computedProperty._computedWriter) {
                    computedProperty._computedWriter(value);
                    return;
                }
                else {
                    throw new Error("Cannot write a value to a computed observable property unless you specify a 'write' option.");
                }
            }
            return _setProperty.call(this, name, value);
        }

        winjsObservable._removeAllDependencies = function (name: string) {
            var property = this._computedProperty(name);
            if (property) {
                var dependencies: ObservableProperty[] = property._dependencies || [];
                dependencies.forEach(function (d) {
                    d._observable.unbind(d._propertyName, property._computedUpdater);
                });
                property._dependencies = [];
            }
        }

        var _dispose: Function = winjsObservable.dispose;
        winjsObservable.dispose = function (name?: string) {
            if (arguments.length > 0) {

                var property = this._computedProperty(name);
                if (property) {
                    property._removeAllDependencies();
                    property._computedUpdater = null;
                    property._computedWriter = null
                    delete this._computedProperties[name];
                }
            }
            else {
                if (_dispose) {
                    _dispose.call(this);
                }
                Object.keys(this).forEach((k) => {
                    this.dispose(k);
                });
            }
        }

        //_winjsObservable: any;
        winjsObservable._lastUpdatedStamps = {};

        winjsObservable._lastUpdatedStamp = function (name?: string, updateStamp?: UpdateStamp): UpdateStamp {
            this._lastUpdatedStamps = this._lastUpdatedStamps || {};
            if (arguments.length == 1) {
                return this._lastUpdatedStamps[name];
            }
            else if (arguments.length > 1) {
                this._lastUpdatedStamps[name] = updateStamp;
            }
        }

        winjsObservable._computedProperties = {};
        winjsObservable._computedProperty = function (name: string): ComputedProperty {
            return this._computedProperties[name];
        }

        winjsObservable.peek = function (name: string) {
            return _getProperty.call(this, name);
        }

        winjsObservable.computed = function (name: string, evaluatorFunctionOrOptions, evaluatorFunctionTarget?, options?) {
            computed(evaluatorFunctionOrOptions, evaluatorFunctionTarget, options, this, name);
        }

        winjsObservable.getDependenciesCount = function (name: string) {
            var computedProperty: ComputedProperty = this._computedProperty(name);
            return computedProperty && computedProperty._dependencies ? computedProperty._dependencies.length : 0;
        }
    }

    function _bindComputedUpdaterIfNeccessary(observable: IObservable, name: string) {
        var context = DependencyDetection.currentContext();
        if (context) {
            if (context.type == DependencyDetectionContext.TYPE_COMPUTED_EVALUATIOR) { //initial computed evaluator
                var observableProperty = context.observableProperty;

                if (!observableProperty || (observableProperty._observable === observable && observableProperty._propertyName == name)) {
                    return;
                }

                var computed: ComputedProperty = observableProperty._observable._computedProperty(observableProperty._propertyName);


                var property = new ObservableProperty(observable, name);
                var dependencies = <any[]>(computed._dependencies || []);
                if (!dependencies.some(function (o) {
                    return o === property;
                })) {
                    dependencies.push(property);
                };
                computed._dependencies = dependencies;
            }
        }
    }

    interface IObservable {
        bind(name: string, action: Function);
        unbind(name: string, action: Function);
        _lastUpdatedStamp(name: string): UpdateStamp;
        _computedProperty(name: string): ComputedProperty;
    }

    class ObservableProperty {
        constructor(observable: IObservable, propertyName: string) {
            this._observable = observable;
            this._propertyName = propertyName;
        }
        _observable: IObservable;
        _propertyName: string;
    }

    class ComputedProperty {
        _dependencies: ObservableProperty[] = [];
        _computedUpdater: Function;
        _computedWriter: Function;

        _removeAllDependencies() {
            var computedUpdater = this._computedUpdater;
            this._dependencies.forEach(function (d) {
                d._observable.unbind(d._propertyName, computedUpdater);
            });
            this._dependencies = [];
        }
    }

    class DependencyDetectionContext {
        constructor(type: number, observablePropertyOrUpdateStamp?) {
            this.type = type;
            if (type == DependencyDetectionContext.TYPE_COMPUTED_EVALUATIOR) {
                this.observableProperty = observablePropertyOrUpdateStamp;
            }
            else {
                this.upateStamp = observablePropertyOrUpdateStamp;
            }
        }

        static TYPE_COMPUTED_EVALUATIOR = 0;
        static TYPE_COMPUTED_DEPENDENCY_BIND = 1;
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