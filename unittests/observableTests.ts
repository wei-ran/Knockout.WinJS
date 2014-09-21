//Copyright (c) wildcatsoft.
//All Rights Reserved.
//Licensed under the Apache License, Version 2.0.
//See License.txt in the project root for license information.

module WinJS.Knockout.UnitTests {

    interface IAssert {
        ok(state: any, message?: string);
        equal(actual: any, expected: any, message?: string);
    }

    interface IQUnit {
        test(name: string, test: Function);
        asyncTest(name: string, test: Function);
        start();
        expect(amount: number);
        assert: IAssert;
    }

    declare var QUnit: IQUnit;

    var assert: IAssert = QUnit.assert;

    var wko = WinJS.KO;
    var wb = WinJS.Binding;
    var promise = WinJS.Promise;

    var WinJSBindingAttribute = "data-win-bind";
   
    var nullObservable = function (complete) {
        assert.equal(wko.observable(null), null);
        complete();
    }

    var premativeObservableBind = function (complete) {
        QUnit.expect(3);
        var o = wko.observable(1);
        assert.equal(o.value, 1);

        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "value : value");
        wb.processAll(input, o).then(() => {
            assert.equal(input.value, 1);
            o.value = 2;
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
        assert.equal(o.t1, 1);

        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "value : t1");
        wb.processAll(input, o).then(() => {
            assert.equal(input.value, 1);
            o.t1 = 2;
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
            return o.t1 + o.t2;
        });

        assert.equal(c.value, 3);

        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "value : value");
        wb.processAll(input, c).then(() => {
            assert.equal(input.value, 3);
            o.t1 = 2;
            o.t2 = 3;
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
        o.computed("t3", () => {
            return o.t1 + o.t2;
        });

        assert.equal(o.t3, 3);

        var input = document.createElement("input");
        document.body.appendChild(input);
        input.setAttribute(WinJSBindingAttribute, "value : t3");
        wb.processAll(input, o).then(() => {
            assert.equal(input.value, 3);
            o.t1 = 2;
            o.t2 = 4;
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
            return o.t1 + o.t2;
        }, null, null, o, "t3");

        assert.equal(o.t3, 3);
        o.t1 = 3;
        o.t2 = 4;
        _scheduleNTimes(0, 50).then(() => {
            assert.equal(o.t3, 7);
            complete();
        });
    }

    var selfCircularDependency = function (complete) {
        var o = wko.observable(1);
        o.computed("value", () => {
            return o.value * 2;
        });

        assert.equal(o.value, 2);

        o.value = 3;

        _scheduleNTimes(0, 20).then(() => {
            assert.equal(o.value, 3);
            complete();
        });
    }

    var indirectComputed = function (compete) {
        var o = wko.observable({ t1: 1, t2: 0, t3: 0 });
        o.computed("t2", () => {
           return o.t1 * 2;
        });

        o.computed("t3", () => {
            return o.t1 + o.t2;
        });

        assert.equal(o.t3, 3);

        o.t1 = 2;

        _wait().then(() => {
            assert.equal(o.t3, 6);
            compete();
        });
    }

    var indirectCirularComputed = function (compete) {
        var o = wko.observable({ t1: 1, t2: 0});
        o.computed("t2", () => {
            return o.t1 * 2;
        });

        o.computed("t1", () => {
            return o.t2 + 1;
        });

        assert.equal(o.t1, 3);
        assert.equal(o.t2, 2);

        o.t1 = 2;

        _scheduleNTimes(0, 100).then(() => {
            assert.equal(o.t2, 4);
            assert.equal(o.t1, 2);
            compete();
        });
    }

    function computedWriter(complete) {
        var o = wko.observable({ t1: 1, t2: 0, t3: 1 });
        o.computed("t3", {
            read: () => {
                return 2;
            },
            write: () => {
                o.t1 = o.t3 * 2;
                o.t2 = o.t3 + 1;
            }
        });

        _scheduleNTimes(0, 10).then(() => {
            assert.equal(o.t1, 4);
            assert.equal(o.t2, 3);
            assert.equal(o.t3, 2);

            o.t3 = 3;

            _scheduleNTimes(0, 10).then(() => {
                assert.equal(o.t1, 6);
                assert.equal(o.t2, 4);
                complete();
            });
        });
    }

    function computedWriter2(complete) {
        var o = wko.observable({ t1: 1, t2: 0, t3: 1 });
        o.computed("t2", () => {
            return o.t1 + 1;
        }, null,
        {
            write: () => {
                o.t3 = o.t2 + 2;
            }
        });

        _scheduleNTimes(0, 10).then(() => {
            assert.equal(o.t2, 2);
            assert.equal(o.t3, 4);

            o.t1 = 3;

            _scheduleNTimes(0, 10).then(() => {
                assert.equal(o.t2, 4);
                assert.equal(o.t3, 6);
                complete();
            });
        });
    }

    function computedOnwer(complete) {
        var o = wko.observable({ t1: 1, t2: 0, t3: 1, t4 : 0 });
        o.computed("t2",function() {
            return this.t1 + 1;
        }, o);

        o.computed("t3",
            {
                read: function() {
                    return this.t2 + 2;
                },
                write: function() {
                    this.t4 = this.t3 + 3;
                },
                owner : o
            });

        _scheduleNTimes(0, 100).then(() => {
            assert.equal(o.t2, 2);
            assert.equal(o.t3, 4);
            assert.equal(o.t4, 7);

            o.t1 = 3;

            _scheduleNTimes(0, 10).then(() => {
                assert.equal(o.t2, 4);
                assert.equal(o.t3, 6);
                assert.equal(o.t4, 9);
                complete();
            });
        });
    }

    function simpleCircularComputedWriter(complete) {
        var o = wko.observable({ t1: 1, t2:0 });
        o.computed("t2", {
            read: function () {
                return o.t1 * 2;
            },
            write: function () {
                o.t1 = o.t2 * 2;
            }
        });

        _scheduleNTimes(0, 2).then(function () {
            assert.equal(o.t1, 4);
            assert.equal(o.t2, 2);

            o.t1 = 3;

            _scheduleNTimes(0, 100).then(function () {
                assert.equal(o.t1, 3);
                assert.equal(o.t2, 6);

                o.t2 = 4;

                _scheduleNTimes(0, 100).then(function () {
                    assert.equal(o.t1, 8);
                    assert.equal(o.t2, 4);
                    complete();
                });
            });
        });
    }

    function disposeComputedProperty(complete) {
        var o = wko.observable({ t1: 1, t2: 2, t3: 0 });
        o.computed("t3", function () {
            return o.t2 + 2 * o.t1;
        });

        assert.equal(o.t3, 4);
        o.t1 = 2;
        o.t2 = 3;
        _scheduleNTimes(0, 10).then(() => {
            assert.equal(o.t3, 7);
            o.dispose("t3");
            o.t1 = 3;
            o.t2 = 4;
            _scheduleNTimes(0, 50).then(() => {
                assert.equal(o.t3, 7);
                complete();
            });
        });
    }

    function disposeComputedWriter(complete) {
        var o = wko.observable({ t1: 1, t2: 0, t3: 0 });
        o.computed("t2", function () {
            return o.t1 * 2;
        }, null, {
                write: function () {
                    o.t3 = o.t2 + 1;
                }
            });

        _scheduleNTimes(0, 10).then(() => {
            assert.equal(o.t2, 2);
            assert.equal(o.t3, 3);
            o.t1 = 2;
            _scheduleNTimes(0, 20).then(() => {
                assert.equal(o.t2, 4);
                assert.equal(o.t3, 5);
                o.dispose("t2");
                o.t1 = 3;
                _scheduleNTimes(0, 50).then(() => {
                    assert.equal(o.t2, 4);
                    assert.equal(o.t3, 5)
                    complete();
                });
            });
            
        });
    }

    function autoDisposeWhenRecomputed(complete) {
        var o = wko.observable({ t1: 1, t2: 2});
        o.computed("t2", function () {
            return o.t1 + 1;
        });

        assert.equal(o._listeners["t1"].length, 1);

        o.computed("t2", function () {
            return o.t1 + 2;
        });

        assert.equal(o._listeners["t1"].length, 1);;
        assert.equal(o.t2, 3);
        o.t1 = 3;
        _scheduleNTimes(0, 10).then(() => {
            assert.equal(o.t2, 5);
            complete();
        });
    }

    function dynamicDependecyTracking(complete) {
        var o = wko.observable({ t1: { t2: 1 }, t3: 0 });
        o.computed("t3", function () {
            return o.t1.t2 * 2;
        });
        assert.equal(o.t3, 2);
        o.t1.t2 = 2; //should not update t3
        _scheduleNTimes(0, 10).then(() => {
            assert.equal(o.t3, 2);
            o.t1 = wko.observable({ t2: 3 });
            o.t1.t2 = 4; //shoud update t3 now
            _scheduleNTimes(0, 10).then(() => {
                assert.equal(o.t3, 8);
                complete();
            });
        });
    }

    function getDependenciesCount(complete) {
        var o = wko.observable({ t1: { t2: 1 }, t3: 0 });
        o.computed("t3", function () {
            return o.t1.t2 * 2;
        });
        assert.equal(o.getDependenciesCount("t1"), 0);
        assert.equal(o.getDependenciesCount("t3"), 1);
        o.t1 = wko.observable({ t2: 3 });
        _scheduleNTimes(0, 10).then(() => {
            assert.equal(o.getDependenciesCount("t3"), 2);
            o.dispose("t3");
            assert.equal(o.getDependenciesCount("t3"), 0);
            complete();
        });
    }

    function basicObservableArray(complete) {
        var a = wko.observableArray([1, 2, 3]);
        var b = wko.computed(() => {
            var sum = 0;
            a.array.forEach(function (v) {
                sum += v;
            });
            return sum;
        });

        assert.equal(b.value, 6);

        a.push(4);

        _scheduleNTimes(0, 50).then(() => {
            assert.equal(b.value, 10);
            complete();
        });
    }

    function disposeWithObservableArray(compelete) {
        var a = wko.observableArray([1, 2, 3]);
        var b = wko.observable({ t1: 0, t2: 1 });
        b.computed("t1", () => {
            var sum = 0;
            a.array.forEach(function (v) {
                sum += v;
            });
            return sum / a.array.length + b.t2 + b.t2;
        });

        assert.equal(b.t1, 4);
        assert.equal((<any>a)._listeners["_array"].length, 1);
        assert.equal((<any>b)._listeners["t2"].length, 1);


        a.push(4);

        _scheduleNTimes(0, 50).then(() => {
            assert.equal(b.t1, 4.5);
            b.dispose("t1");
            assert.equal((<any>a)._listeners["_array"], undefined);
            assert.equal((<any>b)._listeners["t2"], undefined);
            compelete();
        });
    }

    function observableArrayDynamicDependencyTracking(complete) {
        var items = wko.observableArray();
        var calc = WinJS.KO.observable({ sumA: 0 });
        calc.computed("sumA", function () {
            var sum = 0;
            items.array.forEach(function (v) {
                if (v) {
                    sum += v.A;
                }
            });
            return sum;
        });
        var item1 = { A: 1 };
        var item2 = WinJS.KO.observable({ A: 2 });
        items.push(item1); 
        items.push(item2);
        _scheduleNTimes(0, 50).then(() => {
            assert.equal(calc.sumA, 3);

            item1.A = 3; //it should NOT update calc.sumA
            _scheduleNTimes(0, 50).then(() => {
                assert.equal(calc.sumA, 3);
                item2.A = 4; //it should NOT update calc.sumA
                _scheduleNTimes(0, 50).then(() => {
                    assert.equal(calc.sumA, 7);
                    complete();
                });
            }); 
        });
    }

    function _post(v) : WinJS.Promise<any> {
        return WinJS.Utilities.Scheduler.schedulePromiseNormal().then(function () { return v; });
    }

    function _wait(): WinJS.Promise<any> {
        return promise.timeout(0).then(_post);
    }

    function _scheduleNTimes(timeout : number, times: number) : WinJS.Promise<any>
    {
        var currentPromise : WinJS.Promise<any> = null;
        if (times > 0) {
            currentPromise = promise.timeout(timeout);
            for (var i = 1; i < times; i++) {
                currentPromise = currentPromise.then(_post);
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
        "Indirect Circular Computed": indirectCirularComputed,
        "Computed Writer": computedWriter,
        "Computed Writer 2": computedWriter2,
        "Computed Owner": computedOnwer,
        "Simple Circular Computed Writer": simpleCircularComputedWriter,
        "Dispose Computed Property": disposeComputedProperty,
        "Dispose Computed Writer": disposeComputedWriter,
        "Auto Dispose When Recomputed": autoDisposeWhenRecomputed,
        "Dynamic Dependency Tracking": dynamicDependecyTracking,
        "Get Dependencies Count" : getDependenciesCount,
        "Basic Observable Array": basicObservableArray,
        "Dispose with Observable Array": disposeWithObservableArray,
        "Observable Array Dynamic Dependency Tracking": observableArrayDynamicDependencyTracking,
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