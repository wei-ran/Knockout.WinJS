//Copyright (c) wildcatsoft.
//All Rights Reserved.
//Licensed under the Apache License, Version 2.0.
//See License.txt in the project root for license information.

interface IAssert {
    ok(state: any, message?: string);
    equal(actual: any, expected: any, message?: string);
    notEqual(actual: any, expected: any, message?: string);
}

interface IQUnit {
    test(name: string, test: Function);
    asyncTest(name: string, test: Function);
    start();
    expect(amount: number);
    assert: IAssert;
}

var QUnit: IQUnit;

var assert: IAssert = QUnit.assert;

var wko = WinJS.KO;
var wb = WinJS.Binding;
var promise = WinJS.Promise;

var WinJSBindingAttribute = "data-win-bind";



module WinJS.Knockout.UnitTests {



    function visibleBind(complete) {
        var o = wko.observable(false);

        var div = document.createElement("div");
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "$visible : value WinJS.KO.defaultBind");
        wb.processAll(div, o).then(() => {
            assert.equal(div.style.display, "none");

            o.value = true;
            _scheduleNTimes(0, 10).then(() => {
                assert.ok(!div.style.display);
                document.body.removeChild(div);
                complete();
            });
        });
    }

    function visibleBindWithNegConverter(complete) {
        var o = wko.observable(false);

        var div = document.createElement("div");
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "$visible : value WinJS.KO.negConverter");
        wb.processAll(div, o).then(() => {
            assert.ok(!div.style.display);
            o.value = true;
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(div.style.display, "none");
                document.body.removeChild(div);
                complete();
            });
        });
    }


    function _createFlowControl() {
        var div = document.createElement("div");
        div.setAttribute("data-win-control", "WinJS.KO.FlowControl");
        return div;
    }

    function withBind(complete) {
        var o = wko.observable({ t1: wko.observable({ t2: wko.observable({ t3: "a" }) }) });
        var div = _createFlowControl();
        div.innerHTML = "<div data-win-control=\"WinJS.KO.FlowControl\" data-win-bind=\"$with : t2\"><div id=\"test1\" data-win-bind=\"textContent : t3\"></div></div>";
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "$with : t1 WinJS.KO.defaultBind");
        wb.processAll(div, o).then(() => {
            assert.equal(document.getElementById("test1").textContent, "a");
            o.t1.t2.t3 = "b";
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(document.getElementById("test1").textContent, "b");
                o.t1.t2 = { t3: "c" };
                _scheduleNTimes(0, 10).then(() => {
                    assert.equal(document.getElementById("test1").textContent, "c");
                    o.t1 = { t2: { t3: "d" } };
                    _scheduleNTimes(0, 10).then(() => {
                        assert.equal(document.getElementById("test1").textContent, "d");
                        document.body.removeChild(div);
                        complete();
                    });
                });
            });
        });
    }

    function foreachBind(complete) {
        var c1 = wko.observable({ t1: "a" });
        var o = wko.observableArray([c1]);
        var b = wko.observable({ t0: o });
        var div = _createFlowControl();
        div.innerHTML = "<div class=\"test1\" data-win-bind=\"textContent : t1\"></div>";
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "$foreach : t0 WinJS.KO.defaultBind");
        wb.processAll(div, b).then(() => {
            var c = div.getElementsByClassName("test1");
            assert.equal(c[0].textContent, "a");
            c1.t1 = "b";
            _scheduleNTimes(0, 10).then(() => {
                c = div.getElementsByClassName("test1");
                assert.equal(c[0].textContent, "b");
                o.splice(0, 0, { t1: "c" });
                _scheduleNTimes(0, 10).then(() => {
                    c = div.getElementsByClassName("test1");
                    assert.equal(c[0].textContent, "c");
                    assert.equal(c[1].textContent, "b");
                    o.pop();
                    _scheduleNTimes(0, 10).then(() => {
                        c = div.getElementsByClassName("test1");
                        assert.equal(c[0].textContent, "c");
                        assert.equal(c.length, 1);
                        document.body.removeChild(div);
                        complete();
                    });
                });
            });
        });
    }

    function ifBind(complete) {
        var o = wko.observable({ visible: false, t2: null });
        var div = _createFlowControl();
        div.innerHTML = "<div id=\"test1\" data-win-bind=\"textContent: t2\"></div>";
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "$if : visible WinJS.KO.defaultBind");
        wb.processAll(div, o).then(() => {
            assert.equal(div.hasChildNodes(), false);
            div.innerHTML = "<div>test3</div>"
            o.visible = true;
            o.t2 = "hello";
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(document.getElementById("test1").textContent, "hello");
                document.body.removeChild(div);
                complete();
            });
        });
    }

    function ifNotBind(complete) {
        var o = wko.observable({ visible: true, t2: null });
        var div = _createFlowControl();
        div.innerHTML = "<div id=\"test1\" data-win-bind=\"textContent: t2\"></div>";
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "$ifnot : visible WinJS.KO.defaultBind");
        wb.processAll(div, o).then(() => {
            assert.equal(div.hasChildNodes(), false);
            div.innerHTML = "<div>test3</div>"
            o.visible = false;
            o.t2 = "hello";
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(document.getElementById("test1").textContent, "hello");
                document.body.removeChild(div);
                complete();
            });
        });
    }

    function clickBind(complete) {
        var clickme1Called = false;
        var clickme2Called = false;
        function _clickme1() {
            clickme1Called = true;
        }
        function _clickme2() {
            clickme2Called = true;
        }
        WinJS.Utilities.markSupportedForProcessing(_clickme1);
        WinJS.Utilities.markSupportedForProcessing(_clickme2);
        var o = wko.observable(_clickme1);
        var button = document.createElement("button");
        document.body.appendChild(button);
        button.setAttribute(WinJSBindingAttribute, "$click : value WinJS.KO.defaultBind");
        wb.processAll(button, o).then(() => {
            button.click();
            assert.ok(clickme1Called);
            assert.ok(!clickme2Called);
            clickme1Called = false;
            o.value = _clickme2;
            _scheduleNTimes(0, 10).then(() => {
                button.click();
                assert.ok(clickme2Called);
                assert.ok(!clickme1Called);
                document.body.removeChild(button);
                complete();
            });
        });
    }

    function eventBind(complete) {
        var clickmeCalled = false;
        var focusmeCalled = false;
        function _clickme() {
            clickmeCalled = true;
        }
        function _focusme() {
            focusmeCalled = true;
            return true;
        }
        WinJS.Utilities.markSupportedForProcessing(_clickme);
        WinJS.Utilities.markSupportedForProcessing(_focusme);
        var o = wko.observable({ events: { click: _clickme } });
        var link = document.createElement("a");
        document.body.appendChild(link);
        link.setAttribute(WinJSBindingAttribute, "$event : events WinJS.KO.defaultBind");
        wb.processAll(link, o).then(() => {
            link.click();
            assert.ok(clickmeCalled);
            assert.ok(!focusmeCalled);
            clickmeCalled = false;
            o.events = { focus: _focusme };
            _scheduleNTimes(0, 10).then(() => {
                //link.focus();
                link.click();
                var evt = document.createEvent("UIEvent");
                evt.initEvent("focus", true, true);
                link.dispatchEvent(evt);
                assert.ok(focusmeCalled);
                assert.ok(!clickmeCalled);
                document.body.removeChild(link);
                complete();
            });
        });
    }

    function submitBind(complete) {
        var submit1Called = false;
        var submit2Called = false;
        function _submit1() {
            submit1Called = true;
        }
        function _submit2() {
            submit2Called = true;
        }
        WinJS.Utilities.markSupportedForProcessing(_submit1);
        WinJS.Utilities.markSupportedForProcessing(_submit2);
        var o = wko.observable(_submit1);
        var form = document.createElement("form");
        document.body.appendChild(form);
        var submit = document.createElement("input");
        submit.setAttribute("type", "submit");
        form.appendChild(submit);

        form.setAttribute(WinJSBindingAttribute, "$submit : value WinJS.KO.defaultBind");
        wb.processAll(form, o).then(() => {
            submit.click();
            _scheduleNTimes(0, 10).then(() => {
                assert.ok(submit1Called);
                assert.ok(!submit2Called);
                submit1Called = false;
                o.value = _submit2;
                _scheduleNTimes(0, 10).then(() => {
                    submit.click();
                    _scheduleNTimes(0, 10).then(() => {
                        assert.ok(!submit1Called);
                        assert.ok(submit2Called);
                        document.body.removeChild(form);
                        complete();
                    });
                });

            });
        });
    }

    function hasFocusBind(complete) {
        var o = wko.observable(true);

        var input = document.createElement("input");
        input.focus();
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "$hasFocus : value WinJS.KO.defaultBind");
        wb.processAll(input, o).then(() => {
            assert.equal(document.activeElement, input);
            _scheduleNTimes(0, 10).then(() => {
                o.value = false;
                _scheduleNTimes(0, 10).then(() => {
                    assert.notEqual(document.activeElement, input);
                    input.focus();

                    _scheduleNTimes(0, 10).then(() => {
                        assert.ok(o.value);
                        input.blur();

                        _scheduleNTimes(0, 10).then(() => {
                            assert.ok(!o.value);
                            document.body.removeChild(input);
                            complete();
                        });
                    });
                });
            });
        });
    }

    function enabledBind(complete) {
        var o = wko.observable(false);
        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "$enabled : value WinJS.KO.defaultBind");
        wb.processAll(input, o).then(() => {
            assert.ok(input.disabled);
            o.value = true;
            _scheduleNTimes(0, 10).then(() => {
                assert.ok(!input.disabled)
                document.body.removeChild(input);
                complete();
            });
        });
    }

    function valueBind(complete) {
        var o = wko.observable("test1");
        var input = document.createElement("input");
        input.type = "text";
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "$value : value WinJS.KO.defaultBind");
        wb.processAll(input, o).then(() => {
            assert.equal(input.value, "test1");
            o.value = "test2";
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(input.value, "test2");
                _scheduleNTimes(0, 10).then(() => {

                    input.value = "test3"
                    _dispatchEvent("input", input);
                    _scheduleNTimes(0, 10).then(() => {

                        assert.equal(o.value, "test3");
                        document.body.removeChild(input);
                        complete();
                    });
                });
            });
        });
    }

    function checkedBind(complete) {
        var o = wko.observable(true);
        var input = document.createElement("input");
        input.type = "checkbox";
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "$checked : value WinJS.KO.defaultBind");
        wb.processAll(input, o).then(() => {
            assert.ok(input.checked);
            o.value = false;
            _scheduleNTimes(0, 10).then(() => {
                assert.ok(!input.checked);
                _scheduleNTimes(0, 10).then(() => {
                    input.checked = true;
                    _dispatchEvent("change", input);
                    _scheduleNTimes(0, 10).then(() => {
                        assert.ok(o.value);
                        document.body.removeChild(input);
                        complete();
                    });
                });
            });
        });
    }

    function checkedBindArray(complete) {
        var o = wko.observable({
            available: ["a", "b", "c", "d"],
            selected: wko.observableArray(["b", "d"])
        });
        var div = _createFlowControl();
        div.setAttribute(WinJSBindingAttribute, "$foreach : available WinJS.KO.defaultBind");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.setAttribute(WinJSBindingAttribute, "value: $data WinJS.KO.defaultBind; $checked : $parent.selected WinJS.KO.defaultBind;");
        document.body.appendChild(div);
        div.appendChild(input);

        wb.processAll(div, o).then(() => {
            assert.ok(!div.children[0]["checked"]);
            assert.ok(div.children[1]["checked"]);
            assert.ok(!div.children[2]["checked"]);
            assert.ok(div.children[3]["checked"]);
            o.selected.push("c");
            o.selected.splice(0, 1);
            _scheduleNTimes(0, 100).then(() => {
                assert.ok(!div.children[0]["checked"]);
                assert.ok(!div.children[1]["checked"]);
                assert.ok(div.children[2]["checked"]);
                assert.ok(div.children[3]["checked"]);
                div.children[0]["checked"] = true;
                div.children[3]["checked"] = false;
                _dispatchEvent("change", <any>div.children[0]);
                _dispatchEvent("change", <any>div.children[3]);
                _scheduleNTimes(0, 10).then(() => {
                    assert.ok(o.selected.indexOf("a") >= 0);
                    assert.ok(o.selected.indexOf("b") < 0);
                    assert.ok(o.selected.indexOf("c") >= 0);
                    assert.ok(o.selected.indexOf("d") < 0);
                    document.body.removeChild(div);
                    complete();
                });
            });
        });
    }

    function checkedBindRidioArray(complete) {
        var o = wko.observable({
            available: ["a", "b", "c"],
            selected: "b"
        });
        var div = _createFlowControl();
        div.setAttribute(WinJSBindingAttribute, "$foreach : available WinJS.KO.defaultBind");
        var input = document.createElement("input");
        input.type = "radio";
        input.setAttribute(WinJSBindingAttribute, "value: $data WinJS.KO.defaultBind; $checked : $parent.selected WinJS.KO.defaultBind;");
        document.body.appendChild(div);
        div.appendChild(input);

        wb.processAll(div, o).then(() => {
            assert.ok(!div.children[0]["checked"]);
            assert.ok(div.children[1]["checked"]);
            assert.ok(!div.children[2]["checked"]);
            o.selected = "c";
            _scheduleNTimes(0, 100).then(() => {
                assert.ok(!div.children[0]["checked"]);
                assert.ok(!div.children[1]["checked"]);
                assert.ok(div.children[2]["checked"]);
                div.children[0]["checked"] = true;
                _dispatchEvent("change", <any>div.children[0]);
                _scheduleNTimes(0, 10).then(() => {
                    assert.equal(o.selected, "a");
                    document.body.removeChild(div);
                    complete();
                });
            });
        });
    }

    function optionsBind(complete) {
        var v1 = WinJS.KO.observable({ value: "v1", text: "ttt" });
        var viewModel = WinJS.KO.observable({
            options: WinJS.KO.observableArray([
                v1,
                { text: "v2" },
                "v3"]),
            selected: WinJS.KO.observableArray(["v1", "v2", "v3"]),
        });

        var select = document.createElement("select");
        document.body.appendChild(select);
        select.setAttribute(WinJSBindingAttribute, "$options : options WinJS.KO.defaultBind; $selectedOptions: selected WinJS.KO.defaultBind");
        select.setAttribute("multiple", "true");
        wb.processAll(select, viewModel).then(() => {
            assert.equal(select.children[0]["value"], "v1");
            assert.equal(select.children[0]["textContent"], "ttt");
            assert.ok(select.children[0]["selected"]);
            assert.equal(select.children[1]["value"], "v2");
            assert.equal(select.children[1]["textContent"], "v2");
            assert.ok(select.children[1]["selected"]);
            assert.equal(select.children[2]["value"], "v3");
            assert.equal(select.children[2]["textContent"], "v3");
            assert.ok(select.children[2]["selected"]);

            v1.value = "v11";
            v1.text = "new value";
            viewModel.selected.splice(0, 1);
            viewModel.options.push({ value: "v4", text: "ttt2" });
            viewModel.options.splice(1, 1);

            _scheduleNTimes(0, 100).then(() => {
                assert.equal(select.children[0]["value"], "v11");
                assert.equal(select.children[0]["textContent"], "new value");
                assert.ok(!select.children[0]["selected"]);
                assert.equal(select.children[1]["value"], "v3");
                assert.equal(select.children[1]["textContent"], "v3");
                assert.ok(select.children[1]["selected"]);
                assert.equal(select.children[2]["value"], "v4");
                assert.equal(select.children[2]["textContent"], "ttt2");
                assert.ok(!select.children[2]["selected"]);


                select.children[2]["selected"] = true;
                _dispatchEvent("change", select);

                _scheduleNTimes(0, 10).then(() => {
                    assert.equal(viewModel.selected.length, 2);
                    assert.equal(viewModel.selected.getAt(0), "v3");
                    assert.equal(viewModel.selected.getAt(1), "v4");


                    document.body.removeChild(select);
                    complete();
                });
            });
        });
    }

    function optionsBindWithConverter(complete) {
        var v1 = WinJS.KO.observable({ f1: "v1", f2: "ttt" });
        var viewModel = WinJS.KO.observable({
            options: WinJS.KO.observableArray([
                v1,
                { text: "v2" },
                "v3"]),
            selected: WinJS.KO.observableArray(["v1", "v2", "v3"]),
        });

        testInitializer = WinJS.KO.computedConverter(function (d) {
            if (d.f1 || d.f2) {
                return { value: d.f1, text: d.f2 };
            }
            else if (d.text) {
                return d;
            }
            else {
                return { text: d };
            }
        });

        var select = document.createElement("select");
        document.body.appendChild(select);
        select.setAttribute(WinJSBindingAttribute, "$options : options WinJS.Knockout.UnitTests.testInitializer");
        wb.processAll(select, viewModel).then(() => {
            assert.equal(select.children[0]["value"], "v1");
            assert.equal(select.children[0]["textContent"], "ttt");
            assert.equal(select.children[1]["value"], "v2");
            assert.equal(select.children[1]["textContent"], "v2");
            assert.equal(select.children[2]["value"], "v3");
            assert.equal(select.children[2]["textContent"], "v3");

            v1.f1 = "v11";
            v1.f2 = "new value";
            viewModel.selected.splice(0, 1);
            viewModel.options.push({ f1: "v4", f2: "ttt2" });
            viewModel.options.splice(1, 1);

            _scheduleNTimes(0, 100).then(() => {
                assert.equal(select.children[0]["value"], "v11");
                assert.equal(select.children[0]["textContent"], "new value");
                assert.equal(select.children[1]["value"], "v3");
                assert.equal(select.children[1]["textContent"], "v3");
                assert.equal(select.children[2]["value"], "v4");
                assert.equal(select.children[2]["textContent"], "ttt2");

                document.body.removeChild(select);
                complete();
            });
        });
    }

    function selectedOptionsBindWithConverter(complete) {
        var viewModel = WinJS.KO.observable({
            options: ["v1", "v2", "v3"],
            selected: WinJS.KO.observableArray(["v2"]),
        });

        function convert(source) {
            var converted = [];
            viewModel.options.forEach(function (value) {
                if (wko.isObservableArray(source)) {
                    source = source.array;
                }

                if (source.indexOf(value) < 0) {
                    converted.push(value);
                }
            });
            return converted;
        }

        testInitializer = WinJS.KO.converter({ convert: convert, convertBack: convert });

        var select = document.createElement("select");
        document.body.appendChild(select);
        select.setAttribute(WinJSBindingAttribute, "$options : options WinJS.KO.defaultBind; $selectedOptions : selected WinJS.Knockout.UnitTests.testInitializer");
        select.setAttribute("multiple", "true");
        wb.processAll(select, viewModel).then(() => {
            assert.ok(select.children[0]["selected"]);
            assert.ok(!select.children[1]["selected"]);
            assert.ok(select.children[2]["selected"]);

            viewModel.selected.splice(0, 1);
            viewModel.selected.push("v3");

            _scheduleNTimes(0, 100).then(() => {
                assert.ok(select.children[0]["selected"]);
                assert.ok(select.children[1]["selected"]);
                assert.ok(!select.children[2]["selected"]);
                select.children[0]["selected"] = false;
                select.children[2]["selected"] = true;
                _dispatchEvent("change", select);
                _scheduleNTimes(0, 100).then(() => {
                    assert.equal(viewModel.selected.getAt(0), "v1");
                    assert.equal(viewModel.selected.length, 1);
                    document.body.removeChild(select);
                    complete();
                });
            });
        });
    }

    function computedConverter(complete) {
        var viewModel = wko.observable({
            a: 1,
            b: 2
        });

        testInitializer = wko.computedConverter(function (v) {
            return v.a + v.b;
        });

        var div = document.createElement("div");
        div.setAttribute(WinJSBindingAttribute, "textContent : this WinJS.Knockout.UnitTests.testInitializer");
        document.body.appendChild(div);
        WinJS.Binding.processAll(div, viewModel).then(function () {
            assert.equal(div.textContent, "3");
            viewModel.a = 3;
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(div.textContent, "5");
                viewModel.b = 4;
                _scheduleNTimes(0, 100).then(() => {
                    assert.equal(div.textContent, "7");
                    document.body.removeChild(div);
                    complete();
                });
            });
        });
    }

    function twoWaysBind(complete) {

        testInitializer = wko.twoWaysBind(["change"]);

        var viewModel = wko.observable({
            checked: true
        });

        var input = document.createElement("input");
        input.type = "checkbox";
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "checked : checked WinJS.Knockout.UnitTests.testInitializer");
        wb.processAll(input, viewModel).then(function () {
            assert.ok(input.checked);
            viewModel.checked = false;
            _scheduleNTimes(0, 10).then(function () {
                assert.ok(!input.checked);
                input.checked = true;
                _dispatchEvent("change", input);
                _scheduleNTimes(0, 50).then(function () {
                    assert.ok(viewModel.checked);
                    complete();
                });
            });
        });
    }

    function twoWaysBindWithConverter(complete) {

        function hasFocus(element: HTMLElement) {
            return element.ownerDocument.activeElement == element;
        }

        testInitializer = wko.converter({
            convert: function (value, source, sourceProps, dest: HTMLElement) {
                if (value === "true") {
                    dest.focus();
                }
                else {
                    dest.blur();
                }
            },
            convertBack: function (value) {
                return value.toString();
            }
        }, wko.twoWaysBind(["blur", "focus"], hasFocus));

        var viewModel = wko.observable({
            hasFocus: "true"
        });

        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "testHasFocus : hasFocus WinJS.Knockout.UnitTests.testInitializer");
        wb.processAll(input, viewModel).then(function () {
            assert.ok(hasFocus(input));
            viewModel.hasFocus = "false";
            _scheduleNTimes(0, 10).then(function () {
                assert.ok(!hasFocus(input));
                input.focus();
                _dispatchEvent("focus", input);
                _scheduleNTimes(0, 50).then(function () {
                    assert.equal(viewModel.hasFocus, "true");
                    complete();
                });
            });
        });
    }

    function _post(v): WinJS.Promise<any> {
        return WinJS.Utilities.Scheduler.schedulePromiseNormal().then(function () { return v; });
    }

    function _wait(): WinJS.Promise<any> {
        return promise.timeout(0).then(_post);
    }

    function _scheduleNTimes(timeout: number, times: number): WinJS.Promise<any> {
        var currentPromise: WinJS.Promise<any> = null;
        if (times > 0) {
            currentPromise = promise.timeout(timeout);
            for (var i = 1; i < times; i++) {
                currentPromise = currentPromise.then(_post);
            }
        }

        return currentPromise || promise.as(0);
    }

    function _dispatchEvent(event: string, element: HTMLElement) {
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent(event, false, false);
        element.dispatchEvent(evt);
    }

    var testCases = {
        "Foreach Bind": foreachBind,
        "If Bind": ifBind,
        "If Not Bind": ifNotBind,
        "With Bind": withBind,
        "Event Bind": eventBind,
        "Click Bind": clickBind,
        "Submit Bind": submitBind,
        "Value Bind": valueBind,
        "Checked Bind": checkedBind,
        "Checked Bind (Array)": checkedBindArray,
        "Checked Bind (Ridio Array)": checkedBindRidioArray,
        "Enabled Bind": enabledBind,
        "Has Focus Bind": hasFocusBind,
        "Visible Bind": visibleBind,
        "Visible Bind with Negative Converter": visibleBindWithNegConverter,
        "Options Bind": optionsBind,
        "Options Bind with converter": optionsBindWithConverter,
        "Selected Options with converter": selectedOptionsBindWithConverter,
        "Computed Converter": computedConverter,
        "Two-ways Bind": twoWaysBind,
        "Two-ways Bind with Converter": twoWaysBindWithConverter,
    };

    export var testInitializer;

    (function Run() {
        Object.keys(testCases).forEach((key) => {
            var testCase = testCases[key];
            QUnit.asyncTest(key, () => {
                var ret = testCase(() => {
                    QUnit.start();
                });
            });
        });
    })();
}