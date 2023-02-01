
// // Global API configuration
// var Api = new Restivus({
// 	useDefaultAuth: true,
// 	prettyJson: true
// });

// Api.addRoute('test/:id', {authRequired: false}, {
// 	get: function () {
// 		var elems = Elements.find();
// 		return {status: 200, response: {msg: "Testing get", id: this.urlParams.id, elements: elems.fetch(),}};
// 	},

// 	post: function () {
// 		var elems = Elements.find();
// 		return {status: 200, response: {msg: "Testing post1", elements: elems.fetch(),}};
// 	},
// });


// Api.addRoute('test', {authRequired: false}, {

// 	post: function () {
// 		var elems = Elements.find();
// 		return {status: 200, response: {msg: "Testing post2", elements: elems.fetch(),}};
// 	},

// });