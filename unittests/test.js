//Copyright (c) wildcatsoft (Wei Ran).
//All Rights Reserved.
//Licensed under the Apache License, Version 2.0.
//See License.txt in the project root for license information.
var WinJS;
(function (WinJS) {
    (function (Knockout) {
        (function (UnitTests) {
            var assert = QUnit.assert;

            var wko = WinJS.KO;
            var wb = WinJS.Binding;
            var promise = WinJS.Promise;

            var WinJSBindingAttribute = "data-win-bind";

            var nullObservable = function (complete) {
                assert.equal(wko.observable(null), null);
                complete();
            };

            var premativeObservableBind = function (complete) {
                QUnit.expect(3);
                var o = wko.observable(1);
                assert.equal(o.value(), 1);

                var input = document.createElement("input");
                document.body.appendChild(input);
                input.setAttribute(WinJSBindingAttribute, "value : value");
                wb.processAll(input, o.bindable()).then(function () {
                    assert.equal(input.value, 1);
                    o.value(2);
                    promise.timeout(0).then(function () {
                        assert.equal(input.value, 2);
                        document.body.removeChild(input);
                        complete();
                    });
                });
            };

            var objectObservableBind = function (complete) {
                QUnit.expect(3);

                var o = wko.observable({ t1: 1, t2: 2 });
                assert.equal(o.t1(), 1);

                var input = document.createElement("input");
                document.body.appendChild(input);
                input.setAttribute(WinJSBindingAttribute, "value : t1");
                wb.processAll(input, o.bindable()).then(function () {
                    assert.equal(input.value, 1);
                    o.t1(2);
                    promise.timeout(0).then(function () {
                        assert.equal(input.value, 2);
                        document.body.removeChild(input);
                        complete();
                    });
                });
            };

            var singleComputedBind = function (complete) {
                QUnit.expect(3);

                var o = wko.observable({ t1: 1, t2: 2 });
                var c = wko.computed(function () {
                    return o.t1() + o.t2();
                });

                assert.equal(c.value(), 3);

                var input = document.createElement("input");
                document.body.appendChild(input);
                input.setAttribute(WinJSBindingAttribute, "value : value");
                wb.processAll(input, c.bindable()).then(function () {
                    assert.equal(input.value, 3);
                    o.t1(2);
                    o.t2(3);
                    promise.timeout(0).then(function () {
                        assert.equal(input.value, 5);
                        document.body.removeChild(input);
                        complete();
                    });
                });
            };

            var assignedComputedBind = function (complete) {
                QUnit.expect(3);

                var o = wko.observable({ t1: 1, t2: 2, t3: 0 });
                o.t3.computed(function () {
                    return o.t1() + o.t2();
                });

                assert.equal(o.t3(), 3);

                var input = document.createElement("input");
                document.body.appendChild(input);
                input.setAttribute(WinJSBindingAttribute, "value : t3");
                wb.processAll(input, o.bindable()).then(function () {
                    assert.equal(input.value, 3);
                    o.t1(2);
                    o.t2(4);
                    promise.timeout(0).then(function () {
                        assert.equal(input.value, 6);
                        document.body.removeChild(input);
                        complete();
                    });
                });
            };

            var assignedComputedAnotherSyntax = function (complete) {
                QUnit.expect(2);

                var o = wko.observable({ t1: 1, t2: 2, t3: 0 });
                wko.computed(function () {
                    return o.t1() + o.t2();
                }, null, null, o, "t3");

                assert.equal(o.t3(), 3);
                o.t1(3);
                o.t2(4);
                _scheduleNTimes(0, 50).then(function () {
                    assert.equal(o.t3(), 7);
                    complete();
                });
            };

            var selfCircularDependency = function (complete) {
                var o = wko.observable(1);
                o.value.computed(function () {
                    return o.value() * 2;
                });

                assert.equal(o.value(), 2);

                o.value(3);

                _scheduleNTimes(0, 20).then(function () {
                    assert.equal(o.value(), 3);
                    complete();
                });
            };

            var indirectComputed = function (compete) {
                var o = wko.observable({ t1: 1, t2: 0, t3: 0 });
                o.t2.computed(function () {
                    return o.t1() * 2;
                });

                o.t3.computed(function () {
                    return o.t1() + o.t2();
                });

                assert.equal(o.t3(), 3);

                o.t1(2);

                _wait().then(function () {
                    assert.equal(o.t3(), 6);
                    compete();
                });
            };

            var indirectCirularComputed = function (compete) {
                var o = wko.observable({ t1: 1, t2: 0 });
                o.t2.computed(function () {
                    return o.t1() * 2;
                });

                o.t1.computed(function () {
                    return o.t2() + 1;
                });

                assert.equal(o.t1(), 3);
                assert.equal(o.t2(), 2);

                o.t1(2);

                _scheduleNTimes(0, 100).then(function () {
                    assert.equal(o.t2(), 4);
                    assert.equal(o.t1(), 2);
                    compete();
                });
            };

            function computedWriter(complete) {
                var o = wko.observable({ t1: 1, t2: 0, t3: 1 });
                o.t3.computed({
                    read: function () {
                        return 2;
                    },
                    write: function () {
                        o.t1(o.t3() * 2);
                        o.t2(o.t3() + 1);
                    }
                });

                _scheduleNTimes(0, 10).then(function () {
                    assert.equal(o.t1(), 4);
                    assert.equal(o.t2(), 3);
                    assert.equal(o.t3(), 2);

                    o.t3(3);

                    _scheduleNTimes(0, 10).then(function () {
                        assert.equal(o.t1(), 6);
                        assert.equal(o.t2(), 4);
                        complete();
                    });
                });
            }

            function computedWriter2(complete) {
                var o = wko.observable({ t1: 1, t2: 0, t3: 1 });
                o.t2.computed(function () {
                    return o.t1() + 1;
                }, null, {
                    write: function () {
                        o.t3(o.t2() + 2);
                    }
                });

                _scheduleNTimes(0, 10).then(function () {
                    assert.equal(o.t2(), 2);
                    assert.equal(o.t3(), 4);

                    o.t1(3);

                    _scheduleNTimes(0, 10).then(function () {
                        assert.equal(o.t2(), 4);
                        assert.equal(o.t3(), 6);
                        complete();
                    });
                });
            }

            function computedOnwer(complete) {
                var o = wko.observable({ t1: 1, t2: 0, t3: 1, t4: 0 });
                o.t2.computed(function () {
                    return this.t1() + 1;
                }, o);

                o.t3.computed({
                    read: function () {
                        return this.t2() + 2;
                    },
                    write: function () {
                        this.t4(this.t3() + 3);
                    },
                    owner: o
                });

                _scheduleNTimes(0, 100).then(function () {
                    assert.equal(o.t2(), 2);
                    assert.equal(o.t3(), 4);
                    assert.equal(o.t4(), 7);

                    o.t1(3);

                    _scheduleNTimes(0, 10).then(function () {
                        assert.equal(o.t2(), 4);
                        assert.equal(o.t3(), 6);
                        assert.equal(o.t4(), 9);
                        complete();
                    });
                });
            }

            function simpleCircularComputedWriter(complete) {
                var o = wko.observable({ t1: 1, t2: 0 });
                o.t2.computed({
                    read: function () {
                        return o.t1() * 2;
                    },
                    write: function () {
                        o.t1(o.t2() * 2);
                    }
                });

                _scheduleNTimes(0, 2).then(function () {
                    assert.equal(o.t1(), 4);
                    assert.equal(o.t2(), 2);

                    o.t1(3);

                    _scheduleNTimes(0, 100).then(function () {
                        assert.equal(o.t1(), 3);
                        assert.equal(o.t2(), 6);

                        o.t2(4);

                        _scheduleNTimes(0, 100).then(function () {
                            assert.equal(o.t1(), 8);
                            assert.equal(o.t2(), 4);
                            complete();
                        });
                    });
                });
            }

            function disposeComputedProperty(complete) {
                var o = wko.observable({ t1: 1, t2: 2, t3: 0 });
                o.t3.computed(function () {
                    return o.t2() + 2 * o.t1();
                });

                assert.equal(o.t3(), 4);
                o.t1(2);
                o.t2(3);
                _scheduleNTimes(0, 10).then(function () {
                    assert.equal(o.t3(), 7);
                    o.t3.dispose();
                    o.t1(3);
                    o.t2(4);
                    _scheduleNTimes(0, 50).then(function () {
                        assert.equal(o.t3(), 7);
                        complete();
                    });
                });
            }

            function disposeComputedWriter(complete) {
                var o = wko.observable({ t1: 1, t2: 0, t3: 0 });
                o.t2.computed(function () {
                    return o.t1() * 2;
                }, null, {
                    write: function () {
                        o.t3(o.t2() + 1);
                    }
                });

                _scheduleNTimes(0, 10).then(function () {
                    assert.equal(o.t2(), 2);
                    assert.equal(o.t3(), 3);
                    o.t1(2);
                    _scheduleNTimes(0, 20).then(function () {
                        assert.equal(o.t2(), 4);
                        assert.equal(o.t3(), 5);
                        o.t2.dispose();
                        o.t1(3);
                        _scheduleNTimes(0, 50).then(function () {
                            assert.equal(o.t2(), 4);
                            assert.equal(o.t3(), 5);
                            complete();
                        });
                    });
                });
            }

            function autoDisposeWhenRecomputed(complete) {
                var o = wko.observable({ t1: 1, t2: 2 });
                o.t2.computed(function () {
                    return o.t1() + 1;
                });

                assert.equal(o.bindable()._listeners["t1"].length, 1);

                o.t2.computed(function () {
                    return o.t1() + 2;
                });

                assert.equal(o.bindable()._listeners["t1"].length, 1);
                ;
                assert.equal(o.t2(), 3);
                o.t1(3);
                _scheduleNTimes(0, 10).then(function () {
                    assert.equal(o.t2(), 5);
                    complete();
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
                "Auto Dispose When Recomputed": autoDisposeWhenRecomputed
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
//# sourceMappingURL=test.js.map
