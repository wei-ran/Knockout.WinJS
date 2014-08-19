//Copyright (c) wildcatsoft (Wei Ran).
//All Rights Reserved.
//Licensed under the Apache License, Version 2.0.
//See License.txt in the project root for license information.

module WinJS.KO {

    var _koBindings = {
        "visible": visibleBind,
        "text": textBind,
        "html": htmlBind,
        "foreach": foreachBind,
        "_if": ifBind,
        "ifnot": ifNotBind,
        "click": clickBind,
        "submit": submitBind,
        "enable": enableBind,
        "hasFocus": hasFocusBind,
        "value": valueBind,
        "checked": checkedBind,
    }

    export var defaultBind = WinJS.Binding.initializer(function (
        source, sourceProps: string[], dest: HTMLElement, destProps: string[]) : ICancelable {

        if (destProps || destProps.length == 1) {
            var destProp = destProps[0];

            if (_koBindings[destProp]) {
               return _koBindings[destProp](source, sourceProps, dest);     
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

    function foreachBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        var template: Element;
        if (dest.childElementCount == 1) {
            template = dest.firstElementChild;
            dest.removeChild(dest.firstElementChild);
        }
        else {
            var newTemplate = document.createElement("div");
            newTemplate.innerHTML = dest.innerHTML;
            while (dest.hasChildNodes()) {
                dest.removeChild(dest.lastChild);
            }
            template = newTemplate;
        }

        var winJSTemplate = new WinJS.Binding.Template(<any>template);

        function disposeChildNodes(dest: HTMLElement) {
            while (dest.hasChildNodes()) {
                var child: any = dest.lastChild;
                if (child.dispose) {
                    child.dispose()
                    }
                dest.removeChild(child);
            }
        }

        function foreachUpdater(list) {
            if (!(list instanceof Array || list instanceof WinJS.Binding.List)) {
                return;
            }

            var children = list.map(function (item) {
                var child = dest.firstChild
                while (child) {
                    if ((<any>child)._winjs_ko_dataItem == item) {
                        break;
                    }
                    child = child.nextSibling;
                }
                if (child) {
                    dest.removeChild(child);
                }
                else {
                    child = document.createElement("div");
                    winJSTemplate.render(item, <any>child);
                    (<any>child)._winjs_ko_dataItem = item;       
                }
                return child;
            });

            disposeChildNodes(dest);

            children.forEach(function (child) {
                dest.appendChild(child);
            });
        }

        var root = {};
        var current = root;
        for (var i = 0; i < sourceProps.length - 1; i++) {
            current = current[sourceProps[i]] = {};
        }
        var listBind;
        current[sourceProps[sourceProps.length - 1]] = function (newValue, oldValue) {
            if (oldValue instanceof WinJS.Binding.List) {
                oldValue.unbind("_array", foreachUpdater);
                listBind = null;
            }

            if (newValue instanceof WinJS.Binding.List && newValue._array instanceof Array) {
                newValue.bind("_array", foreachUpdater);
                listBind = newValue;
            }
            else {
                foreachUpdater(newValue);
            }
        };
        var listBindCancelable = <ICancelable> WinJS.Binding.bind(source, root);

        return {
            cancel: function () {
                listBindCancelable.cancel();
                if (listBind) {
                    listBind.unbind("_array", foreachUpdater);
                }
                disposeChildNodes(dest);
            }
        };
    }

    function withBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        var converter = WinJS.Binding.converter(function (value) {
            var child = dest.firstChild;
            while (child) {
                if (child instanceof Element) {
                    WinJS.Binding.processAll(<Element>child, value);
                }
                child = child.nextSibling
            }
        });
        return converter(source, sourceProps, dest, ["_winjs_ko_datacontext"]);
    }

    function _ifBindConverter(dest: HTMLElement, children : any[], value) {
        if (value && children.length > 0) {
            while (children.length > 0) {
                var child = children.pop();
                dest.appendChild(child);
                WinJS.Binding.processAll(child);
            }
        }
        else if (!value && dest.hasChildNodes()) {
            while (dest.hasChildNodes()) {
                children.push(dest.lastChild);
                dest.removeChild(dest.lastChild);
            }
        }
        return value;
    };

    function ifBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        var children = [];

        var converter = WinJS.Binding.converter(function (value) {
            return _ifBindConverter(dest, children, value);
        });

        return converter(source, sourceProps, dest, ["_winjs_ko_if"]);
    }

    function ifNotBind(source, sourceProps: string[], dest: HTMLElement) : ICancelable {
        var children = [];

        var converter = WinJS.Binding.converter(function (value) {
            return _ifBindConverter(dest, children, !value);
        });

        return converter(source, sourceProps, dest, ["_winjs_ko_ifnot"]);
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