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

    function hasFocusBind(complete) {
        var o = wko.observable(true);

        var input = document.createElement("input");
        input.focus();
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "hasFocus : value WinJS.KO.defaultBind");
        wb.processAll(input, o.bindable()).then(() => {
            assert.equal(document.activeElement, input);

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
        "Has Focus Bind": hasFocusBind,
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