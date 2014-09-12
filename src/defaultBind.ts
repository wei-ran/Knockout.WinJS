//Copyright (c) wildcatsoft (Wei Ran).
//All Rights Reserved.
//Licensed under the Apache License, Version 2.0.
//See License.txt in the project root for license information.

module WinJS.KO {

    var _koBindings = {
        "visible": visibleBind,
        "text": textBind,
        "html": htmlBind,
        "click": clickBind,
        "submit": submitBind,
        "enable": enableBind,
        "hasFocus": hasFocusBind,
        "value": valueBind,
        "checked": checkedBind,
        "$foreach": foreachBind,
        "$with": withBind,
        "$if": ifBind,
        "$ifnot": ifNotBind,
    }

    export var defaultBind = WinJS.Binding.initializer(function (
        source, sourceProps: string[], dest: HTMLElement, destProps: string[]): ICancelable {

        var data = source;
        if (destProps.length > 0 && _dataContextMemebrs[sourceProps[0]]) {
            var dataContext = DataContext.getDataContextFromElement(dest);
            if (dataContext && dataContext.bindable)
                data = dataContext.bindable();
        }

        if (destProps || destProps.length == 1) {
            var destProp = destProps[0];

            if (_koBindings[destProp]) {
               return _koBindings[destProp](data, sourceProps, dest);     
            }
        }

        return  WinJS.Binding.defaultBind(source, sourceProps, dest, destProps)
        
    });

    interface ICancelable {
        cancel();
    }

    function visibleBind(source, sourceProps: string[], dest : HTMLElement) : ICancelable {
        var converter = WinJS.Binding.converter(function (visible: boolean) {
            return visible? "" : "none";
        });

        return converter(source, sourceProps, dest, ["style", "display"]);
    }

    function textBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        return WinJS.Binding.defaultBind(source, sourceProps, dest, ["textContent"]);
    }

    function htmlBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        return WinJS.Binding.defaultBind(source, sourceProps, dest, ["innerHTML"]);
    }

    function _flowControlBind(source, sourceProps: string[], dest: HTMLElement, type : string): ICancelable {
        var flowControl: FlowControl = dest.winControl;

        if (!flowControl && dest.getAttribute("data-win-control") == "WinJS.KO.FlowControl") {
            flowControl = new WinJS.KO.FlowControl(dest);
        }

        flowControl.type = type;
        var ret = WinJS.Binding.defaultBind(source, sourceProps, flowControl, ["data"]);

        return ret;
    }

    function foreachBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        return _flowControlBind(source, sourceProps, dest, "foreach");
    }


    function withBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        return _flowControlBind(source, sourceProps, dest, "with");
    }

    function ifBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        return _flowControlBind(source, sourceProps, dest, "if");
    }

    function ifNotBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        return _flowControlBind(source, sourceProps, dest, "ifnot");
    }

    function clickBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        return WinJS.Binding.defaultBind(source, sourceProps, dest, ["onclick"]);
    }

    function eventBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        function _foreachEvent(events, func: Function) {
            events = events || {};
            for (var key in events) {
                var event = events[key];
                if (typeof event == "function") {
                    func(key, event);
                }
            }
        }

        function _removeEvents() {
            _foreachEvent(dest["_winjs_ko_eventBind"], function (key, event) {
                dest.removeEventListener(key, event);
            });
        }

        var converter = WinJS.Binding.converter(function (events) {

            _removeEvents();

            _foreachEvent(events, function (key, event) {
                dest.addEventListener(key, event);
            });

        });

        var converterCancelable: ICancelable = converter(source, sourceProps, dest, ["_winjs_ko_eventBind"]);

        return {
            cancel: function () {
                converterCancelable.cancel();
                _removeEvents();
            }
        };
    }

    function submitBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {

        var submitEvent: Function;

        var submitEventOuter = function (ev: Event) {
            if (submitEvent && !submitEvent(ev)) {
                ev.preventDefault();
            }
        }

        dest.addEventListener("submit", submitEventOuter);

        var converter = WinJS.Binding.converter(function (event) {
            submitEvent = (typeof (event) == "function") ? event : null;
            return submitEvent;
        });

        var converterCancelable: ICancelable = converter(source, sourceProps, dest, ["_winjs_ko_submitBind"]);
        return {
            cancel: function () {
                converterCancelable.cancel();
                dest.removeEventListener("submit", submitEventOuter);
            }
        };

    }

    function enableBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        var converter = WinJS.Binding.converter(function (value) {
            return !value;
        });

        return converter(source, sourceProps, dest, ["disabled"]);
    }


    function valueBind(source, sourceProps: string[], dest: HTMLInputElement) : ICancelable {
        var defaultBindCancelable: ICancelable = WinJS.Binding.defaultBind(source, sourceProps, dest, ["value"]);

        if (_isObservable(source)) {
            dest.oninput = function () {
                _nestedSet(source, sourceProps, dest.value);
            }
        }

        return {
            cancel: function () {
                defaultBindCancelable.cancel();
                dest.oninput = null;
            }
        };
    }

    function hasFocusBind(source, sourceProps: string[], dest: HTMLElement) {

        function elementHasFocus(element: HTMLElement): boolean {
            return element.ownerDocument.activeElement == element;
        }

        var converter = WinJS.Binding.converter(function (hasFocus: boolean) {

            var destHasFocus = elementHasFocus(dest);

            if (hasFocus != destHasFocus) {
                hasFocus ? dest.focus() : dest.blur();
            }

            if (_isObservable(source)) {
                dest.onfocus = dest.onblur = function () {
                    _nestedSet(source, sourceProps, elementHasFocus(dest));
                }
            }

            return hasFocus;
        });

        var converterCancelable: ICancelable = converter(source, sourceProps, dest, ["_winjs_ko_hasFocus"]);
        return {
            cancel: function () {
                converterCancelable.cancel();
                dest.onfocus = dest.onblur = null;
            }
        };
    }

    function checkedBind(source, sourceProps: string[], dest: HTMLInputElement) : ICancelable {
        var defaultBindCancelable: ICancelable = WinJS.Binding.defaultBind(source, sourceProps, dest, ["checked"]);

        if (_isObservable(source)) {
            dest.onchange = function () {
                _nestedSet(source, sourceProps, dest.checked);
            }
        }

        return {
            cancel: function () {
                defaultBindCancelable.cancel();
                dest.onchange = null;
            }
        };
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
            this._template = options["tempate"] || _createChildTemplate(element)
            this._type = options["type"];
            this.element = element;
            this._parentContext = DataContext.getDataContextFromElement(this.element);
            this._dataContext = DataContext.createObservableDataContext(this._data, this._parentContext);
            element.winControl = this;
            this.reload();
        }

        element: HTMLElement;

        _data: any;
        _template: WinJS.Binding.Template;
        _type: string;
        _dataContext: any;
        _parentContext: any;

        _createChildElement(data, parentContext): HTMLElement {
            var div = document.createElement("div");
            var context = DataContext.createObservableDataContext(data, parentContext);
            context.addProperty("$index", -1);
            div["_winjs_ko_dataContext"] = context;
            this._template.render(data, div);
            return div;
        }



        reload() {
            if (this._data && this._template) {
                var child = this.element.lastElementChild;
                while (this.element.childElementCount > 0) {
                    if (typeof child["dispose"] == "function") {
                        child["dispose"]();
                    }

                    var childContext = child["_winjs_ko_dataContext"];
                    if (typeof childContext["dispose"] == "function") {
                        childContext["dispose"]();
                    }

                    this.element.removeChild(child);
                }

                switch (this._type) {
                    case "with":
                        var childElement = this._createChildElement(this._data, this._parentContext);
                        this.element.appendChild(childElement);
                        break;
                    case "if":
                        break;
                    case "ifnot":
                        break;
                    case "foreach":
                        var dataContex = DataContext.createObservableDataContext(this._data, this._parentContext);

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
                                    child = this._createChildElement(item, dataContex);
                                    (<any>child)._winjs_ko_dataItem = item;
                                }
                                return child;
                            });

                            //disposeChildNodes(dest);

                            children.forEach((child, index: number) => {
                                child["_winjs_ko_dataContext"].$index(index);
                                this.element.appendChild(child);
                            });
                        }

                        if (this._data instanceof WinJS.Binding.List && this._data._array instanceof Array) {
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
            this._data = data;
            this.reload();
        }

        get template(): WinJS.Binding.Template {
            return this._template;
        }

        set template(template: WinJS.Binding.Template) {
            this._template = template;
            this.reload();
        }

        get type(): string {
            return this.type;
        }

        set type(type: string) {
            this._type = type;
            this.reload();
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
            return source && source.bindable && WinJS.Binding.unwrap(source.bindable()) instanceof DataContext;
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
                dataContext.$parentContexts.concat(parent.$parentContexts());
                dataContext.$parentContext = parent;
            }
            else {
                dataContext.$parentContexts = [];
            }

            var dataContextObservable = observable(dataContext);


            if (parent) {
                dataContextObservable.addComputedProperty("$parents", function () {
                    return dataContextObservable.$parentContexts.peek().map(function (p) {
                        return p.$data();
                    });
                });

                dataContextObservable.addComputedProperty("$parent", function () {
                    return dataContextObservable.$parentContext.peek().$data();
                });

                dataContextObservable.addComputedProperty("$root", function () {
                    var parentContexts: any[] = dataContextObservable.$parentContexts.peek();
                    if (parentContexts.length > 0) {
                        return parentContexts[parentContexts.length - 1].$data();
                    }
                });
            }
            else {
                dataContext.$parents = [];
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

    function _nestedSet(dest, destProperties : string[], v) {
        for (var i = 0, len = (destProperties.length - 1); i < len; i++) {
            dest = dest[destProperties[i]];
            if (!dest) {
                return;
            }
        }
        var prop = destProperties[destProperties.length - 1];
        dest[prop] = v;
    }

    (function cctor() {
        WinJS.Utilities.markSupportedForProcessing(defaultBind);
    })();

} 