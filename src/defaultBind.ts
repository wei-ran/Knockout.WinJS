//Copyright (c) wildcatsoft.
//All Rights Reserved.
//Licensed under the Apache License, Version 2.0.
//See License.txt in the project root for license information.

module WinJS.KO {

    var _koBindings = {
        //control flow bindings
        "$foreach": foreachBind,
        "$if": ifBind,
        "$ifnot": ifNotBind,
        "$with": withBind,
        //event bindings
        "$event": eventBind,
        "$click": clickBind,
        "$submit": submitBind,
        //two-ways bindings
        "$value": valueBind,
        "$checked": checkedBind,
        "$hasFocus": hasFocusBind,
        "$selectedOptions": selectedOptionsBind,
        //helper bindings
        "$visible": visibleBind,
        "$enabled": enableBind,
        "$options": optionsBind,
        "$option": optionBind,
    }

    export var defaultBind = WinJS.Binding.initializer(function (
        source, sourceProps: string[], dest: HTMLElement, destProps: string[], customConverter?: CustomConverter): ICancelable {
        var data = source;
        if (destProps.length > 0 && _dataContextMemebrs[sourceProps[0]]) {
            var dataContext = DataContext.getDataContextFromElement(dest);
            if (dataContext)
                data = dataContext;
        }

        if (destProps || destProps.length == 1) {
            var destProp = destProps[0];

            if (_koBindings[destProp]) {
                return _koBindings[destProp](data, sourceProps, dest, customConverter);
            }
        }

        return _createBinding(data, sourceProps, dest, destProps, customConverter);
    });

    interface ICancelable {
        cancel();
    }

    class Cancelable implements ICancelable {
        _innerCancelables: any[];

        constructor(...innerCancelables: any[]) {
            this._innerCancelables = innerCancelables;
        }

        cancel() {
            if (this._innerCancelables) {
                this._innerCancelables.forEach(function (cancelable) {
                    if (cancelable instanceof Function) {
                        cancelable();
                    }
                    else if (cancelable && cancelable.cancel instanceof Function) {
                        cancelable.cancel();
                    }
                });
            }
        }
    }

    class CustomConverter implements IConvert {
        constructor(convert: Function, convertBack?: Function, isComputed?: boolean) {
            this.convert = convert;
            this.convertBack = convertBack;
            this.isComputed = isComputed;
        }

        convert: Function;
        convertBack: Function;
        isComputed: boolean;
    }

    export interface IConvert {
        convert: Function;
        convertBack?: Function;
    }

    export interface IConverter {
        fn: Function;
        <T>(convert: Function, initializer?: Function);
        <T>(convert: IConvert, initializer?: Function);
    }

    function _converterImpl(customConverter: CustomConverter) {
        return WinJS.Binding.initializer(
            function (source, sourceProps: string[], dest: HTMLElement, destProps: string[]) {
                return defaultBind(source, sourceProps, dest, destProps, customConverter);
            });
    }

    export var converter = function (convert: Function, convertBack?: Function) {
        return _converterImpl(new CustomConverter(convert, convertBack, false));
    }

    export var computedConverter = function (convert: Function, convertBack?: Function) {
        return _converterImpl(new CustomConverter(convert, convertBack, true));
    }

    export var negConverter = converter(function (value) {
        return !value;
    });

    function defaultConvert(data) {
        return data;
    }

    function _createBinding(source, sourceProps: string[], dest: HTMLElement, destProps: string[], customConverter?: CustomConverter, convert?: Function, dispose?: Function): ICancelable {
        convert = convert || defaultConvert;
        var disposeComputed;

        var convertCancelable = WinJS.Binding.converter(function (data) {
            var convertedData = data;

            if (customConverter instanceof CustomConverter && customConverter.convert instanceof Function) {
                if (customConverter.isComputed) {
                    var computedObj = computed(function () {
                        return customConverter.convert(WinJS.Binding.as(data), source, sourceProps, dest, destProps);
                    });
                    convertedData = computedObj.value;
                    var updater = function (value) {
                        _nestedSet(dest, destProps, value, convert);
                    };
                    computedObj.bind("value", updater);

                    disposeComputed = function () {
                        computedObj.unbind("value", updater);
                        computedObj.dispose();
                    }
                }
                else {
                    convertedData = customConverter.convert(data, source, sourceProps, dest, destProps);
                }
            }
            return convert(convertedData);
        })(source, sourceProps, dest, destProps);

        if (dispose) {
            return new Cancelable(convertCancelable, dispose, disposeComputed);
        }
        else {
            return <any>convertCancelable;
        }

    }

    function visibleBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        return _createBinding(source, sourceProps, dest, ["style", "display"], customConverter, function (visible: boolean) {
            return visible ? "" : "none";
        });
    }

    function _controlFlowBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter, type: string): ICancelable {
        var flowControl: FlowControl = dest.winControl;

        var newFlowControl;

        if (!flowControl && dest.getAttribute("data-win-control") == "WinJS.KO.FlowControl") {
            flowControl = newFlowControl = new WinJS.KO.FlowControl(dest, { converter: customConverter });
        }

        var cancelable;

        if (!flowControl) {
            return new Cancelable();
        }

        flowControl.type = type;
        flowControl.source = source;

        return _createBinding(source, sourceProps, dest, ["winControl", "data"], customConverter, undefined, function () {
            if (newFlowControl) {
                newFlowControl.dispose();
            }
        });
    }

    function foreachBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        return _controlFlowBind(source, sourceProps, dest, customConverter, "foreach");
    }


    function withBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        return _controlFlowBind(source, sourceProps, dest, customConverter, "with");
    }

    function ifBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        return _controlFlowBind(source, sourceProps, dest, customConverter, "if");
    }

    function ifNotBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        return _controlFlowBind(source, sourceProps, dest, customConverter, "ifnot");
    }


    function _eventBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter, getEvents: Function): ICancelable {

        var data = DataContext.isObservableDataContext(source) ? WinJS.Binding.unwrap(source.$data) : source;

        function _foreachEvent(events, func: Function) {
            events = events || {};
            for (var key in events) {
                var event = <Function>events[key];
                if (typeof event == "function") {
                    func(key);
                }
            }
        }

        function _removeEvents() {
            _foreachEvent(dest["_winjs_ko_eventBind"], function (key) {
                dest.removeEventListener(key, _eventHandler);
            });
        }

        function _eventHandler(evt: UIEvent) {
            var handler: Function = dest["_winjs_ko_eventBind"][evt.type]
            if (true !== handler.apply(data, [data, evt])) {
                evt.preventDefault();
            }
        }

        return _createBinding(source, sourceProps, dest, ["_winjs_ko_eventBind"], customConverter, function (sourceData) {

            var events = getEvents(sourceData) || {};

            _removeEvents();

            _foreachEvent(events, function (key) {
                dest.addEventListener(key, _eventHandler);
            });

            return events;
        }, _removeEvents);
    }

    function clickBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        return _eventBind(source, sourceProps, dest, customConverter, function (event) {
            return { click: event };
        });
    }

    function eventBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        return _eventBind(source, sourceProps, dest, customConverter, function (events) {
            return events;
        });
    }

    function submitBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        return _eventBind(source, sourceProps, dest, customConverter, function (event) {
            return { submit: event };
        });
    }

    function enableBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        return _createBinding(source, sourceProps, dest, ["disabled"], customConverter, function (value) {
            return !value;
        });
    }

    function _registerBindEvent(eventNames: string[], source, sourceProps: string[], dest: HTMLElement, customConverter: any, getValue: Function) {
        function updateSource() {
            var convertBack = customConverter instanceof Function ? customConverter : customConverter && customConverter.convertBack;
            _nestedSet(source, sourceProps, getValue(dest), convertBack);
        }

        eventNames.forEach(function (eventName) {
            dest.addEventListener(eventName, updateSource);
        });

        return function () {
            eventNames.forEach(function (eventName) {
                return dest.removeEventListener(eventName, updateSource);
            });
        };
    }

    function valueBind(source, sourceProps: string[], dest: HTMLInputElement, customConverter: CustomConverter): ICancelable {
        return _createBinding(source, sourceProps, dest, ["value"], customConverter, undefined,
            _registerBindEvent(["input"], source, sourceProps, dest, customConverter, function (dest) {
                return dest.value;
            }));
    }

    function hasFocusBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter) {

        function elementHasFocus(element: HTMLElement): boolean {
            return element.ownerDocument.activeElement == element;
        }

        return _createBinding(source, sourceProps, dest, ["_winjs_ko_hasFocus"], customConverter, function (hasFocus: boolean) {

            var destHasFocus = elementHasFocus(dest);

            if (hasFocus != destHasFocus) {
                hasFocus ? dest.focus() : dest.blur();
            }

            return hasFocus;
        }, _registerBindEvent(["focus", "blur"], source, sourceProps, dest, customConverter, elementHasFocus));
    }

    function checkedBind(source, sourceProps: string[], dest: HTMLInputElement, customConverter: CustomConverter): ICancelable {

        function checkedConvert(data): boolean {
            if (dest.tagName != "INPUT")
                return false;

            if (dest.type == "checkbox") {
                if (data instanceof Array || data instanceof WinJS.Binding.List) {
                    if (isObservableArray(data)) {
                        //bind to observable array
                        return data.array.indexOf(dest.value) >= 0;
                    }
                    else {
                        return data.indexOf(dest.value) >= 0;
                    }
                }
                else {
                    return data;
                }
            }
            else if (dest.type == "radio") {
                return data == dest.value;
            }
            else {
                return false;
            }
        }

        var checkedConvertBack = function (checked: boolean, oldValue): any {
            if (dest.type == "checkbox" && (oldValue instanceof Array || oldValue instanceof WinJS.Binding.List)) {
                var index = oldValue.indexOf(dest.value);
                if (checked && index < 0) {
                    oldValue.push(dest.value);
                }
                else if (!checked && index >= 0) {
                    oldValue.splice(index, 1);
                }
                return oldValue;
            }
            else if (dest.type == "radio") {
                if (checked) {
                    return dest.value;
                }
                else if (oldValue == dest.value) {
                    return undefined;
                }
                else {
                    return oldValue;
                }
            }
            else {
                return checked;
            }
        };

        if (!(customConverter instanceof CustomConverter)) {
            customConverter = new CustomConverter(checkedConvert, checkedConvertBack, true);
        }

        return _createBinding(source, sourceProps, dest, ["checked"], customConverter, undefined, _registerBindEvent(["change"], source, sourceProps, dest, customConverter, function (dest) {
            return dest.checked;
        }));
    }

    function optionsBind(source, sourceProps: string[], dest: HTMLSelectElement, customConverter: CustomConverter): ICancelable {
        var div = document.createElement("div");
        div.innerHTML = "<option data-win-bind=\"$option : $data\"/>";
        var template = new WinJS.Binding.Template(div);
        template.bindingInitializer = _converterImpl(customConverter);

        var flowControl = new WinJS.KO.FlowControl(dest, {
            template: template
        });
        var cancelable = _controlFlowBind(source, sourceProps, dest, undefined, "foreach");

        return new Cancelable(cancelable, function () {
            flowControl.dispose();
        });
    }

    function optionBind(source, sourceProps: string[], dest: HTMLOptionElement, customConverter: CustomConverter): ICancelable {
        function updateOption(data) {
            if (data) {
                dest.value = data.value || data.text;
                dest.text = data.text;
            }
        }

        var convert = (customConverter && customConverter.convert) || function (data) {
            if (typeof data == "object") {
                return {
                    value: data.value,
                    text: data.text
                }
            }
            return {
                text: data
            }
        };

        var converter = new CustomConverter(function (data) {
            var optionData = convert(data);
            updateOption(optionData);
            return optionData;
        }, undefined, true);

        return _createBinding(source, sourceProps, dest, ["_winjs_ko_option"], converter);
    }

    function selectedOptionsBind(source, sourceProps: string[], dest: HTMLElement, customConverter: CustomConverter): ICancelable {
        function updateSelectedOptions(selectedOptions) {
            var child = dest.firstElementChild;
            while (child) {
                if (child.tagName == "OPTION") {
                    var option = <HTMLOptionElement>child;
                    option.selected = selectedOptions.indexOf(option.value) >= 0;
                }
                child = child.nextElementSibling;
            }
        }

        var computedConverter = new CustomConverter(function (data) {
            var convert = (customConverter && customConverter.convert) || defaultConvert;
            var convertedData = convert(data);

            if (isObservableArray(convertedData)) {
                //bind to the observable array
                convertedData = data.array;
            }
            return convertedData;
        }, undefined, true);

        function getSelectedOptions(dest: HTMLElement): string[] {
            var selected = [];
            var child = dest.firstElementChild;
            while (child) {
                if (child.tagName == "OPTION") {
                    var option = <HTMLOptionElement>child;
                    if (option.selected) {
                        selected.push(option.value);
                    }
                }
                child = child.nextElementSibling;
            }
            return selected;
        };

        function convertBack(value, oldValue) {
            var convertBack = (customConverter && customConverter.convertBack) || defaultConvert;
            var newValue = convertBack(value);
            if (oldValue instanceof Array || oldValue instanceof WinJS.Binding.List) {
                oldValue.splice(0, oldValue.length);
                oldValue.push.apply(oldValue, newValue);
                return oldValue;
            }
            return newValue;
        };

        return _createBinding(source, sourceProps, dest, ["_winjs_ko_selectedOptions"], computedConverter, updateSelectedOptions,
            _registerBindEvent(["change"], source, sourceProps, dest, convertBack, getSelectedOptions));
    }

    export class FlowControl {
        constructor(element: HTMLElement, options?: {}) {
            options = options || {};

            if (element.winControl) {
                return;
            }

            function _createChildTemplate(root: HTMLElement): WinJS.Binding.Template {
                var template = document.createElement("div");
                template.innerHTML = root.innerHTML;

                var elements = root.querySelectorAll("[data-win-bind]");
                for (var i = 0; i < elements.length; i++) {
                    elements.item(i).attributes.removeNamedItem("data-win-bind");
                }
                while (root.hasChildNodes()) {
                    root.removeChild(root.lastChild);
                }

                var _template = new WinJS.Binding.Template(<any>template);
                _template.bindingInitializer = WinJS.KO.defaultBind;
                (<any>template).isDeclarativeControlContainer = true;

                return _template;
            }


            this._data = options["data"];
            this._template = options["template"] || _createChildTemplate(element)
            this._type = options["type"];
            this._source = options["source"];
            this.element = element;
            element.winControl = this;
            this.reload();
        }

        dispose = function () {
            this._disposeChildren();
        }

        element: HTMLElement;

        _source: any;
        _data: any;
        _template: WinJS.Binding.Template;
        _type: string;

        reload() {
            var createElementWithDataContext = (data, newContext: boolean, parentContext?, index?: number): Element => {
                var div = document.createElement("div");

                if (!data) {
                    return div;
                }

                if (newContext) {
                    var context = DataContext.createObservableDataContext(data, parentContext);
                    if (arguments.length >= 4) {
                        context.addProperty("$index", index);
                    }
                    div["_winjs_ko_dataContext"] = context;
                }

                this._template.render(data, div);

                var element;

                if (div.childElementCount == 1) {
                    element = div.firstElementChild;
                    div.removeChild(element);
                    element["_winjs_ko_dataContext"] = div["_winjs_ko_dataContext"];
                }
                else {
                    element = div;
                }

                element._winjs_ko_dispose = function () {
                    if (div["dispose"])
                        div["dispose"]();
                }

                return element;
            }

            var createChildElement = (data, newContext: boolean, parentContext?) => {
                var childElement = createElementWithDataContext(data, newContext, parentContext);
                this.element.appendChild(childElement);
            }

            this._disposeChildren();

            if (this._template) {
                switch (this._type) {
                    case "if":
                        if (this._data) {
                            createChildElement(this._source, false);
                        }
                        break;
                    case "ifnot":
                        if (!this._data) {
                            createChildElement(this._source, false);
                        }
                        break;
                    case "with":
                        createChildElement(this._data, true, this._source);
                        break;
                    case "foreach":
                        var dataContex = this._source;

                        var foreachUpdater = (list) => {
                            if (!(list instanceof Array || list instanceof WinJS.Binding.List)) {
                                return;
                            }

                            var children = <any[]>list.map((item, index: number) => {
                                var child = this.element.firstChild
                                while (child) {
                                    if ((<any>child)._winjs_ko_dataItem == item) {
                                        break;
                                    }
                                    child = child.nextSibling;
                                }
                                if (child) {
                                    this.element.removeChild(child);
                                }
                                else {
                                    child = createElementWithDataContext(item, true, dataContex, index);
                                    (<any>child)._winjs_ko_dataItem = item;
                                }
                                return child;
                            });

                            this._disposeChildren();

                            children.forEach((child, index: number) => {
                                child["_winjs_ko_dataContext"].$index = index;
                                this.element.appendChild(child);
                            });
                        }

                        if (WinJS.KO.isObservableArray(this._data)) {
                            this._data.bind("_array", foreachUpdater);
                        }
                        else {
                            foreachUpdater(this._data);
                        }
                        break;
                }

            }
        }

        get data() {
            return this._data;
        }

        set data(data) {
            if (data !== this._data) {
                this._data = data;
                this.reload();
            }
        }

        get template(): WinJS.Binding.Template {
            return this._template;
        }

        set template(template: WinJS.Binding.Template) {
            if (template !== this._template) {
                this._template = template;
                this.reload();
            }
        }

        get type(): string {
            return this.type;
        }

        set type(type: string) {
            if (type !== this._type) {
                this._type = type;
                this.reload();
            }
        }

        get source() {
            return this._source;
        }

        set source(source) {
            if (source !== this._source) {
                this._source = source;
                this.reload();
            }
        }

        _disposeChildren() {
            while (this.element.childElementCount > 0) {
                var child = this.element.lastElementChild;
                var disposeChild = child["_winjs_ko_dispose"];
                if (typeof disposeChild == "function") {
                    disposeChild();
                }

                var childContext = child["_winjs_ko_dataContext"];
                if (childContext && typeof childContext["dispose"] == "function") {
                    childContext["dispose"]();
                }

                this.element.removeChild(child);
            }
        }

        static cctor = (function () {
            WinJS.Utilities.markSupportedForProcessing(FlowControl);
            FlowControl["isDeclarativeControlContainer"] = true;
        })();
    }

    var _dataContextMemebrs = { "$parent": true, "$parents": true, "$root": true, "$data": true, "$index": true, "$parentContext": true, "$rawData": true, "$element": true, "$context": true };

    class DataContext {
        data(_data) {
            this.$data = _data;
            if (_data instanceof WinJS.Binding.List) {
                this.$rawData = WinJS.KO.getRawArray(_data);
            }
            else {
                this.$rawData = WinJS.Binding.unwrap(_data);
            }
        }

        static isObservableDataContext(source): boolean {
            return source && WinJS.Binding.unwrap(source) instanceof DataContext;
        }

        static getDataContextFromElement(element: HTMLElement) {
            var cur = element;
            while (cur && !DataContext.isObservableDataContext(cur["_winjs_ko_dataContext"])) {
                cur = cur.parentElement;
            }

            return cur ? cur["_winjs_ko_dataContext"] : null;
        }

        static createObservableDataContext(data, parent): any {
            var dataContext = new DataContext;
            dataContext.data(data);
            if (parent) {
                dataContext.$parentContexts = [parent];
                dataContext.$parentContext = parent;
            }
            else {
                dataContext.$parentContexts = [];
            }

            var dataContextObservable = observable(dataContext);


            if (DataContext.isObservableDataContext(parent)) {

                dataContext.$parentContexts.concat(parent.$parentContexts);
                dataContextObservable.addComputedProperty("$parents", function () {
                    return dataContextObservable.peek("$parentContexts").map(function (p) {
                        return p.$data;
                    });
                });

                dataContextObservable.addComputedProperty("$parent", function () {
                    return dataContextObservable.peek("$parentContext").$data;
                });

                dataContextObservable.addComputedProperty("$root", function () {
                    var parentContexts: any[] = dataContextObservable.peek("$parentContexts");
                    if (parentContexts.length > 0) {
                        return parentContexts[parentContexts.length - 1].$data;
                    }
                });
            }
            else {
                dataContextObservable.$parents = [parent];
                dataContextObservable.$parent = parent;
                dataContextObservable.$root = parent;
            }

            return dataContextObservable;


        }

        $parent: any;
        $parents: any[];
        $root: any;
        $data: any;
        $index: number;
        $parentContexts: any[];
        $parentContext: any;
        $rawData: any;
        $element: Element;
        $context: DataContext;
    }

    function _isObservable(data): boolean {
        return WinJS.Binding.unwrap(data) !== data;
    }

    function _nestedSet(dest, destProperties: string[], value, converter?: Function) {
        for (var i = 0, len = (destProperties.length - 1); i < len; i++) {
            dest = dest[destProperties[i]];
            if (!dest) {
                return;
            }
        }

        if (destProperties.length > 0) {
            var prop = destProperties[destProperties.length - 1];
            if (converter) {
                value = converter(value, dest[prop], dest, destProperties);
            }
            dest[prop] = value;
        }
        else {
            //still invoke the converter
            converter(value, dest, dest, destProperties);
        }
    }

    (function cctor() {
        WinJS.Utilities.markSupportedForProcessing(defaultBind);
    })();

} 