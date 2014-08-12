module WinJS.KO {

    export var defaultBind = WinJS.Binding.initializer(function (
        source, sourceProps : string[], dest : HTMLElement, destProps: string[]) {

        var isHandled = false;
        if (destProps || destProps.length == 1) {
            var destProp = destProps[0];

            switch (destProp) {
                case "visible": 
                    isHandled = visibleBind(source, sourceProps, dest, destProp);
                    break;
                case "text":
                    isHandled = textBind(source, sourceProps, dest, destProp);
                    break;
                case "hasFocus":
                    isHandled = hasFocusBind(source, sourceProps, dest, destProp);
                    break;
            }
        }

        if (!isHandled) {
            WinJS.Binding.defaultBind(source, sourceProps, dest, destProps);
        }

    });

    function visibleBind(source, sourceProps: string[], dest : HTMLElement, destProp): boolean {
        var converter = WinJS.Binding.converter(function (visible: boolean) {
            return visible? "" : "none";
        });

        converter(source, sourceProps, dest, ["style", "display"]);

        return true;
    }

    function textBind(source, sourceProps: string[], dest: HTMLElement, destProp): boolean {
        WinJS.Binding.defaultBind(source, sourceProps, dest, ["textContent"]);
        return true;
    }

    function hasFocusBind(source, sourceProps: string[], dest: HTMLElement, destProp): boolean {
        var pendingInitalFocusEvent = 0;
        var pendingIntialBlurEvent = 0;

        function onFocus() {
            if (pendingInitalFocusEvent > 0) {
                pendingInitalFocusEvent--
                }
            else {
                _nestedSet(source, sourceProps, true);
            }
        }

        function onBlur() {
            if (pendingIntialBlurEvent > 0) {
                pendingIntialBlurEvent--
                }
            else {
                _nestedSet(source, sourceProps, false);
            }
        }

        var isSourceObservable = _isObservable(source)

        if (isSourceObservable) {
            dest.onfocus = onFocus;
            dest.onblur = onBlur;
        }

        var converter = WinJS.Binding.converter(function (hasFocus: boolean) {

            hasFocus ? dest.focus() : dest.blur();

            if (isSourceObservable) {
                hasFocus ? pendingInitalFocusEvent++ : pendingIntialBlurEvent++;
            }

            return hasFocus;
        });

        converter(source, sourceProps, dest, ["hasFocus"]);

        return true;
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