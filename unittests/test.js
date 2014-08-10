var QUnit;

var assert = QUnit.assert;

var wko = WinJS.KO;
var wb = WinJS.Binding;
var promise = WinJS.Promise;

var WinJSBindingAttribute = "data-win-bind";

var Knockout;
(function (Knockout) {
    (function (WinJS) {
        (function (UnitTests) {
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

            var assginedComputedBind = function (complete) {
                QUnit.expect(3);

                var o = wko.observable({ t1: 1, t2: 2, t3: 0 });
                var c = wko.computed(function () {
                    return o.t1() + o.t2();
                });
                o.t3(c);

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

            var assignedComputedBind2 = function (complete) {
                QUnit.expect(3);

                var o = wko.observable({ t1: 1, t2: 2, t3: 0 });
                wko.computed(function () {
                    return o.t1() + o.t2();
                }, o, "t3");

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

            var assignedComputedBind3 = function (complete) {
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

            var testCases = {
                "Null Observable": nullObservable,
                "Premative Observable Bind": premativeObservableBind,
                "Object Observable Bind": objectObservableBind,
                "Single Computed Bind": singleComputedBind,
                "Assigned Computed Bind": assginedComputedBind,
                "Assigned Computed Bind 2": assignedComputedBind2,
                "Assigned Computed Bind 3": assignedComputedBind3
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
        })(WinJS.UnitTests || (WinJS.UnitTests = {}));
        var UnitTests = WinJS.UnitTests;
    })(Knockout.WinJS || (Knockout.WinJS = {}));
    var WinJS = Knockout.WinJS;
})(Knockout || (Knockout = {}));
//# sourceMappingURL=test.js.map
