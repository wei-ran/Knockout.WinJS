var QUnit;

var assert = QUnit.assert;

var wko = WinJS.KO;
var wb = WinJS.Binding;
var promise = WinJS.Promise;

var WinJSBindingAttribute = "data-win-bind";

var WinJS;
(function (WinJS) {
    (function (Knockout) {
        (function (UnitTests) {
            function visibleBind(complete) {
                var o = wko.observable(false);

                var div = document.createElement("div");
                document.body.appendChild(div);
                div.setAttribute(WinJSBindingAttribute, "visible : value WinJS.KO.defaultBind");
                wb.processAll(div, o.bindable()).then(function () {
                    assert.equal(div.style.display, "none");

                    o.value(true);
                    _scheduleNTimes(0, 10).then(function () {
                        assert.ok(!div.style.display);
                        document.body.removeChild(div);
                        complete();
                    });
                });
            }

            function textBind(complete) {
                var o = wko.observable({ t1: "<div>hello</div>", t2: "hello" });

                var span = document.createElement("span");
                var em = document.createElement("div");
                document.body.appendChild(span);
                document.body.appendChild(em);
                span.setAttribute(WinJSBindingAttribute, "text : t1 WinJS.KO.defaultBind");
                em.setAttribute(WinJSBindingAttribute, "text : t2 WinJS.KO.defaultBind");
                wb.processAll(document.body, o.bindable()).then(function () {
                    assert.equal(span.textContent, "<div>hello</div>");
                    assert.equal(em.textContent, "hello");

                    o.t1("hello");
                    o.t2("<div>hello</div>");
                    _scheduleNTimes(0, 10).then(function () {
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
                wb.processAll(div, o.bindable()).then(function () {
                    assert.equal(div.innerHTML, "test1");
                    o.value("<div>test</div>");
                    _scheduleNTimes(0, 10).then(function () {
                        assert.equal(div.innerHTML, "<div>test</div>");
                        document.body.removeChild(div);
                        complete();
                    });
                });
            }

            function ifBind(complete) {
                var o = wko.observable(false);
                var div = document.createElement("div");
                div.innerHTML = "<div>test1</div><div>test2</div>";
                document.body.appendChild(div);
                div.setAttribute(WinJSBindingAttribute, "_if : value WinJS.KO.defaultBind");
                wb.processAll(div, o.bindable()).then(function () {
                    assert.equal(div.hasChildNodes(), false);
                    div.innerHTML = "<div>test3</div>";
                    o.value(true);
                    _scheduleNTimes(0, 10).then(function () {
                        assert.equal(div.innerHTML, "<div>test3</div><div>test1</div><div>test2</div>");
                        document.body.removeChild(div);
                        complete();
                    });
                });
            }

            function ifNotBind(complete) {
                var o = wko.observable(true);
                var div = document.createElement("div");
                div.innerHTML = "<div>test1</div><div>test2</div>";
                document.body.appendChild(div);
                div.setAttribute(WinJSBindingAttribute, "ifnot : value WinJS.KO.defaultBind");
                wb.processAll(div, o.bindable()).then(function () {
                    assert.equal(div.hasChildNodes(), false);
                    div.innerHTML = "<div>test3</div>";
                    o.value(false);
                    _scheduleNTimes(0, 10).then(function () {
                        assert.equal(div.innerHTML, "<div>test3</div><div>test1</div><div>test2</div>");
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
                wb.processAll(button, o.bindable()).then(function () {
                    assert.equal(button.onclick, _clickme1);
                    o.value(_clickme2);
                    _scheduleNTimes(0, 10).then(function () {
                        assert.equal(button.onclick, _clickme2);
                        o.value(null);
                        _scheduleNTimes(0, 10).then(function () {
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
                wb.processAll(form, o.bindable()).then(function () {
                    submit.click();
                    _scheduleNTimes(0, 10).then(function () {
                        o.value(_submit2);
                        _scheduleNTimes(0, 10).then(function () {
                            submit.click();
                            _scheduleNTimes(0, 10).then(function () {
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
                wb.processAll(input, o.bindable()).then(function () {
                    assert.equal(document.activeElement, input);
                    _scheduleNTimes(0, 10).then(function () {
                        o.value(false);
                        _scheduleNTimes(0, 10).then(function () {
                            assert.notEqual(document.activeElement, input);
                            input.focus();

                            _scheduleNTimes(0, 10).then(function () {
                                assert.ok(o.value());
                                input.blur();

                                _scheduleNTimes(0, 10).then(function () {
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
                wb.processAll(input, o.bindable()).then(function () {
                    assert.ok(input.disabled);
                    o.value(true);
                    _scheduleNTimes(0, 10).then(function () {
                        assert.ok(!input.disabled);
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
                wb.processAll(input, o.bindable()).then(function () {
                    assert.equal(input.value, "test1");
                    o.value("test2");
                    _scheduleNTimes(0, 10).then(function () {
                        assert.equal(input.value, "test2");
                        _scheduleNTimes(0, 10).then(function () {
                            input.value = "test3";
                            input.oninput(null);
                            _scheduleNTimes(0, 10).then(function () {
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
                wb.processAll(input, o.bindable()).then(function () {
                    assert.ok(input.checked);
                    o.value(false);
                    _scheduleNTimes(0, 10).then(function () {
                        assert.ok(!input.checked);
                        _scheduleNTimes(0, 10).then(function () {
                            input.checked = true;
                            input.onchange(null);
                            _scheduleNTimes(0, 10).then(function () {
                                assert.ok(o.value());
                                document.body.removeChild(input);
                                complete();
                            });
                        });
                    });
                });
            }

            function _post(v) {
                return WinJS.Utilities.Scheduler.schedulePromiseNormal().then(function () {
                    return v;
                });
            }

            function _wait() {
                return promise.timeout(0).then(_post);
            }

            function _scheduleNTimes(timeout, times) {
                var currentPromise = null;
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
                "Html Bind": htmlBind,
                "Has Focus Bind": hasFocusBind,
                "If Bind": ifBind,
                "If Not Bind": ifNotBind,
                "Click Bind": clickBind,
                "Submit Bind": submitBind,
                "Enable Bind": enableBind,
                "Value Bind": valueBind,
                "Checked Bind": checkedBind
            };

            (function Run() {
                Object.keys(testCases).forEach(function (key) {
                    var testCase = testCases[key];
                    QUnit.asyncTest(key, function () {
                        var ret = testCase(function () {
                            QUnit.start();
                        });
                    });
                });
            })();
        })(Knockout.UnitTests || (Knockout.UnitTests = {}));
        var UnitTests = Knockout.UnitTests;
    })(WinJS.Knockout || (WinJS.Knockout = {}));
    var Knockout = WinJS.Knockout;
})(WinJS || (WinJS = {}));
//# sourceMappingURL=defaultBindTests.js.map
