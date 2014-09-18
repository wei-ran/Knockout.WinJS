Knockout.WinJS
==============

Knockout.WinJS is a Javascript (Typescript) library which is on top of WinJS and helps WinJS developers easier to write WinJS [MVVM](http://en.wikipedia.org/wiki/Model_View_ViewModel) bindings.

It brings some cool features of [Knockout.JS](http://knockoutjs.com/documentation/introduction.html) into WinJS, such as computed observables, automatic dependency tracking, data contexts, flow control bindings, built-in two way bindings, and etc.

Learn more about Knockout.WinJS [here](https://github.com/wildcatsoft/Knockout.WinJS/wiki/Introduction).

##Requirements##
- WinJS
- (Knockout.js is **NOT** required)

##Examles##

The below is a simple example to demonstrate how to write a basic HTML/Javascript application leveraging Knockout.WinJS.

HTML:

	<html>
		<head>
			<script src="/js/winjs/base.js"></script>
			<script src="/js/winjs/ui.js"></script>
			<script src="/js/Knockout.WinJS.js"></script>
		</head>
		<body>
			<p>
				First name: 
				<input data-win-bind="value: firstName WinJS.KO.defaultBind" />
			</p>
			<p>
				Last name: 
				<input data-win-bind="value: lastName  WinJS.KO.defaultBind" />
			</p>
			<p>
				<span data-win-bind="textContent: fullName WinJS.KO.defaultBind"/>
			</p>
 		</body>
	</html>
JS:
	
	var viewModel = WinJS.KO.observable({firstName:"John",lastName:"Doe",fullName:""});
	viewModel.computed("fullName", function(){
    	return viewModel.firstName + " " + viewModel.lastName;
	});
	WinJS.Binding.processAll(document.body, viewModel);

[Try it yourself](http://jsfiddle.net/wildcatsoft/e33sxsa3/)

## Building Knockout.WinJS ##

In order to build Knockout.WinJS, ensure that you have [git](http://git-scm.com/downloads) and [Node.js](http://nodejs.org/download/) installed.

Clone a copy of the master Knockout.WinJS git repo:
```
git clone https://github.com/wildcatsoft/Knockout.WinJS.git
```

Change to the `Knockout.WinJS` directory:
```
cd Knockout.WinJS
```

Install the [grunt command-line interface](https://github.com/gruntjs/grunt-cli) globally:
```
npm install -g grunt-cli
```

Grunt dependencies are installed separately in each cloned git repo. Install the dependencies with:
```
npm install
```

Run the following and the Knockout.WinJS JavaScript will be put in the `bin` directory:
```
grunt
```

> **Note:** You may need to use sudo (for OSX, *nix, BSD etc) or run your command shell as Administrator (for Windows) to install Grunt globally.

## Runing Unit Tests ##
The unit tests for Knockout.Winjs is based on [QUnit](http://http://qunitjs.com/).

1. Build Knockout.WinJS as instructed in the above section.
2. Build WinJS

	Change to the `winjs` directory:
	```
	winjs
	```

	Initialize and update the winjs submodule:
	```
	git submodule init
	```
	```
	git submodule update
	```
	
	Build WinJS using grunt:
	```
	grunt
	```
3. Open tests `*.html` under the `bin\unittests` directory