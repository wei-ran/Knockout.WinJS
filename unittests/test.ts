interface IAssert {
    ok(state: any, message?: string);
    equal(actual : any, expected : any, message?: string);
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
   
    var nullObservable = function (complete) {
        assert.equal(wko.observable(null), null);
        complete();
    }

    var premativeObservableBind = function (complete) {
        QUnit.expect(3);
        var o = wko.observable(1);
        assert.equal(o.value(), 1);

        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "value : value");
        wb.processAll(input, o.bindable()).then(() => {
            assert.equal(input.value, 1);
            o.value(2);
            promise.timeout(0).then(() => {
                assert.equal(input.value, 2);
                document.body.removeChild(input);
                complete();
            });
        });
    }

    var objectObservableBind = function (complete) {
        QUnit.expect(3);

        var o = wko.observable({t1: 1, t2:2});
        assert.equal(o.t1(), 1);

        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "value : t1");
        wb.processAll(input, o.bindable()).then(() => {
            assert.equal(input.value, 1);
            o.t1(2);
            promise.timeout(0).then(() => {
                assert.equal(input.value, 2);
                document.body.removeChild(input);
                complete();
            });
        });
    }

    var singleComputedBind = function (complete) {
        QUnit.expect(3);

        var o = wko.observable({ t1: 1, t2: 2 });
        var c = wko.computed(() => {
            return o.t1() + o.t2();
        });

        assert.equal(c.value(), 3);

        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "value : value");
        wb.processAll(input, c.bindable()).then(() => {
            assert.equal(input.value, 3);
            o.t1(2);
            o.t2(3)
            promise.timeout(0).then(() => {
                assert.equal(input.value, 5);
                document.body.removeChild(input);
                complete();
            });
        });
    }

    var assignedComputedBind = function (complete) {
        QUnit.expect(3);

        var o = wko.observable({ t1: 1, t2: 2, t3: 0 });
        o.t3.computed(() => {
            return o.t1() + o.t2();
        });

        assert.equal(o.t3(), 3);

        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "value : t3");
        wb.processAll(input, o.bindable()).then(() => {
            assert.equal(input.value, 3);
            o.t1(2);
            o.t2(4)
            promise.timeout(0).then(() => {
                assert.equal(input.value, 6);
                document.body.removeChild(input);
                complete();
            });
        });
    }

    var assignedComputedAnotherSyntax = function (complete) {
        QUnit.expect(2);

        var o = wko.observable({ t1: 1, t2: 2, t3: 0 });
        wko.computed(() => {
            return o.t1() + o.t2();
        }, o, "t3");

        assert.equal(o.t3(), 3);
        o.t1(3);
        o.t2(4)
        promise.timeout(0).then(() => {
            assert.equal(o.t3(), 7);
            complete();
        });
    }

    var selfCircularDependency = function (complete) {
        var o = wko.observable(1);
        o.value.computed(() => {
            return o.value() * 2;
        });

        assert.equal(o.value(), 2);

        o.value(3);

        _timeoutNTimes(0, 3).then(() => {
            assert.equal(o.value(), 3);
            complete();
        });
    }

    var indirectComputed = function (compete) {
        var o = wko.observable({ t1: 1, t2: 0, t3: 0 });
        o.t2.computed(() => {
           return o.t1() * 2;
        });

        o.t3.computed(() => {
          return o.t1() + o.t2()
        });

        assert.equal(o.t3(), 3);

        o.t1(2);

        _timeoutNTimes(0, 20).then(() => {
            assert.equal(o.t3(), 6);
            compete();
        });
    }

    var indirectCirularComputed = function (compete) {
        var o = wko.observable({ t1: 1, t2: 0});
        o.t2.computed(() => {
            return o.t1() * 2;
        });

        o.t1.computed(() => {
            return o.t2() + 1;
        });

        assert.equal(o.t1(), 3);
        assert.equal(o.t2(), 2);

        o.t1(2);

        _timeoutNTimes(0, 20).then(() => {
            assert.equal(o.t2(), 4);
            assert.equal(o.t1(), 2);
            compete();
        });
    }

    function _timeoutNTimes(timeout : number, times: number) : WinJS.Promise<any>
    {
        var currentPromise = null;
        if (times > 0) {
            currentPromise = promise.timeout(timeout);
            for (var i = 1; i < times; i++) {
                currentPromise = currentPromise.then(() => {
                    promise.timeout(timeout);
                });
            }
        }

        return currentPromise || promise.as(0);
    }

    var testCases = {
        "Null Observable": nullObservable,
        "Premative Observable Bind": premativeObservableBind,
        "Object Observable Bind": objectObservableBind,
        "Single Computed Bind": singleComputedBind,
        "Assigned Computed Bind": assignedComputedBind,
        "Assigned Computed Another Syntax": assignedComputedAnotherSyntax,
        "Self Circurlar Dependency": selfCircularDependency,
        "Indirect Computed": indirectComputed,
        "Indirect Circular Computed" : indirectCirularComputed,
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