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
        div.setAttribute(WinJSBindingAttribute, "visible : value WinJS.KO.defaultBind");
        wb.processAll(div, o.bindable()).then(() => {
            assert.equal(div.style.display, "none");
            
            o.value(true);
            _scheduleNTimes(0, 10).then(() => {
                assert.ok(!div.style.display);
                document.body.removeChild(div);
                complete();
            });
        });
    }

    function textBind(complete) {
        var o = wko.observable({t1:"<div>hello</div>", t2:"hello"});

        var span = document.createElement("span");
        var em = document.createElement("div");
        document.body.appendChild(span);
        document.body.appendChild(em);
        span.setAttribute(WinJSBindingAttribute, "text : t1 WinJS.KO.defaultBind");
        em.setAttribute(WinJSBindingAttribute, "text : t2 WinJS.KO.defaultBind");
        wb.processAll(document.body, o.bindable()).then(() => {
            assert.equal(span.textContent, "<div>hello</div>");
            assert.equal(em.textContent, "hello");

            o.t1("hello");
            o.t2("<div>hello</div>");
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(em.textContent, "<div>hello</div>");
                assert.equal(span.textContent, "hello");
                document.body.removeChild(span);
                document.body.removeChild(em);
                complete();
            });
        });
    }

    function htmlBind(complete) {
        var o = wko.observable("test1");
        var div = document.createElement("div");
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "html : value WinJS.KO.defaultBind");
        wb.processAll(div, o.bindable()).then(() => {
            assert.equal(div.innerHTML, "test1");
            o.value("<div>test</div>");
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(div.innerHTML, "<div>test</div>");
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
        var o = wko.observable({ t1: wko.observable({ t2: wko.observable({ t3: "a" }) })});
        var div = _createFlowControl();
        div.innerHTML = "<div data-win-control=\"WinJS.KO.FlowControl\" data-win-bind=\"$with : t2\"><div id=\"test1\" data-win-bind=\"textContent : t3\"></div></div>";
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "$with : t1 WinJS.KO.defaultBind");
        wb.processAll(div, o.bindable()).then(() => {
            assert.equal(document.getElementById("test1").textContent, "a");
            o.t1().t2().t3("b");
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(document.getElementById("test1").textContent, "b");
                o.t1().t2({ t3: "c" });
                _scheduleNTimes(0, 10).then(() => {
                    assert.equal(document.getElementById("test1").textContent, "c");
                    o.t1({ t2: { t3: "d" } });
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
        var b = wko.observable({ t0: o});
        var div = _createFlowControl();
        div.innerHTML = "<div class=\"test1\" data-win-bind=\"textContent : t1\"></div>";
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "$foreach : t0 WinJS.KO.defaultBind");
        wb.processAll(div, b.bindable()).then(() => {
            var c = div.getElementsByClassName("test1");
            assert.equal(c[0].textContent, "a");
            c1.t1("b");
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
        var o = wko.observable({visible: false, t2: null});
        var div = _createFlowControl();
        div.innerHTML = "<div id=\"test1\" data-win-bind=\"textContent: t2\"></div>";
        document.body.appendChild(div);
        div.setAttribute(WinJSBindingAttribute, "$if : visible WinJS.KO.defaultBind");
        wb.processAll(div, o.bindable()).then(() => {
            assert.equal(div.hasChildNodes(), false);
            div.innerHTML = "<div>test3</div>"
            o.visible(true);
            o.t2("hello");
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
        wb.processAll(div, o.bindable()).then(() => {
            assert.equal(div.hasChildNodes(), false);
            div.innerHTML = "<div>test3</div>"
            o.visible(false);
            o.t2("hello");
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(document.getElementById("test1").textContent, "hello");
                document.body.removeChild(div);
                complete();
            });
        });
    }

    function clickBind(complete) {
        function _clickme1() {
            
        }
        function _clickme2() {
        }
        WinJS.Utilities.markSupportedForProcessing(_clickme1);
        WinJS.Utilities.markSupportedForProcessing(_clickme2);
        var o = wko.observable(_clickme1);
        var button = document.createElement("button");
        document.body.appendChild(button);
        button.setAttribute(WinJSBindingAttribute, "click : value WinJS.KO.defaultBind");
        wb.processAll(button, o.bindable()).then(() => {
            assert.equal(button.onclick, _clickme1);
            o.value(_clickme2);
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(button.onclick, _clickme2);
                o.value(null);
                _scheduleNTimes(0, 10).then(() => {
                    assert.equal(button.onclick, null);
                    document.body.removeChild(button);
                    complete();
                });
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
       
        form.setAttribute(WinJSBindingAttribute, "submit : value WinJS.KO.defaultBind");
        wb.processAll(form, o.bindable()).then(() => {
            submit.click();
            _scheduleNTimes(0, 10).then(() => {
                o.value(_submit2);
                _scheduleNTimes(0, 10).then(() => {
                    submit.click();
                    _scheduleNTimes(0, 10).then(() => {
                        assert.ok(submit1Called);
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
        input.setAttribute(WinJSBindingAttribute, "hasFocus : value WinJS.KO.defaultBind");
        wb.processAll(input, o.bindable()).then(() => {
            assert.equal(document.activeElement, input);
            _scheduleNTimes(0, 10).then(() => {
                o.value(false);
                _scheduleNTimes(0, 10).then(() => {
                    assert.notEqual(document.activeElement, input);
                    input.focus();

                    _scheduleNTimes(0, 10).then(() => {
                        assert.ok(o.value());
                        input.blur();

                        _scheduleNTimes(0, 10).then(() => {
                            assert.ok(!o.value());
                            document.body.removeChild(input);
                            complete();
                        });
                    });
                });
            });
        });
    }

    function enableBind(complete) {
        var o = wko.observable(false);
        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "enable : value WinJS.KO.defaultBind");
        wb.processAll(input, o.bindable()).then(() => {
            assert.ok(input.disabled);
            o.value(true);
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
        input.setAttribute(WinJSBindingAttribute, "value : value WinJS.KO.defaultBind");
        wb.processAll(input, o.bindable()).then(() => {
            assert.equal(input.value, "test1");
            o.value("test2");
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(input.value, "test2");
                _scheduleNTimes(0, 10).then(() => {
                    
                    input.value = "test3"
                    input.oninput(null);
                    _scheduleNTimes(0, 10).then(() => {
                        
                        assert.equal(o.value(), "test3");
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
        input.setAttribute(WinJSBindingAttribute, "checked : value WinJS.KO.defaultBind");
        wb.processAll(input, o.bindable()).then(() => {
            assert.ok(input.checked);
            o.value(false);
            _scheduleNTimes(0, 10).then(() => {
                assert.ok(!input.checked);
                _scheduleNTimes(0, 10).then(() => {
                    input.checked = true;
                    input.onchange(null);
                    _scheduleNTimes(0, 10).then(() => {
                        assert.ok(o.value());
                        document.body.removeChild(input);
                        complete();
                    });
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

    var testCases = {
        "Visible Bind": visibleBind,
        "Text Bind": textBind,
        "Html Bind" : htmlBind,
        "Has Focus Bind": hasFocusBind,
        "If Bind": ifBind,
        "If Not Bind": ifNotBind,
        "With Bind": withBind,
        "Foreach Bind": foreachBind,
        "Click Bind": clickBind,
        "Submit Bind": submitBind,
        "Enable Bind": enableBind,
        "Value Bind": valueBind,
        "Checked Bind": checkedBind,
    };

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