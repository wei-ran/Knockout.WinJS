Knockout.WinJS
==============

Enable the cool features of Knockout.js in WinJS, e.g. computed observables and built-in two-way bindings, without the dependency on Knockout.js.

##Introduction##

Knockout.WinJS is a Javascript (Typescript) library for WinJS, which makes WinJS developers easier to write WinJS bindings.

If you are familiar with Knockout.js, which is the most popular MVVM javascript framework, it will be very easy for you to use Knockout.WinJS is very similar. 

Some features which makes the data binding easier in Knockout.js are not available in WinJS, e.g. computed observables and built-in two-way bindings.

Knockout.WinJS is for enabling these features in without the dependency on Knockout.js. 

##Requirements##
- WinJS
- (Knockout.js is not required)

##Examles##
HTML:

	<html>
		<body>
			<input data-win-bind="value: myValue"/>
 		</body>
	</html>
JS:
	
	var data = {
    	t1: 1,
    	t2: 2,
    	myValue: 0
	}

	var viewModel = WinJS.KO.observable(data);
	viewModel.myValue.computed(function () {
    	return viewModel.t1() + viewModel.t2.peek();
	});

	WinJS.Binding.processAll(document.body, viewModel.bindable());

	//the value on the HTML will be updated automatically
	viewModel.t1(3);
 

	
