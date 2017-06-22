Meteor.methods({

	executeSparql: function(list) {

		var user_id = Meteor.userId();
    //console.log("ex-SPARQL");
		if (is_project_version_admin(user_id, list)) {
      //console.log(list);
			var options = list.options;

			Future = Npm.require('fibers/future');
			var future = new Future();

			HTTP.call("POST", options.endPoint, options.params, function(err, resp) {

				if (err) {
					future.return({status: 500,});
				}
				else {

	                xml2js.parseString(resp.content, function(json_err, json_res) {

	                	if (json_err) {
	                		future.return({status: 500,});
	                	}
	                	else {
											//console.log(JSON.stringify(json_res,null,2));
	                		/*var result = _.map(json_res["sparql"]["results"][0]["result"], function(item) {
												return item.binding;
	                		});*/

	                		future.return({status: 200, result: json_res,});
	                	}

	                });
				}

			});

			return future.wait();
		}

	},

	testProjectEndPoint: function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			if (!list.endpoint || !list.uri) {
				console.error("No data specified");
				return {status: 500,};
			}

			Future = Npm.require('fibers/future');
			var future = new Future();

			var params = {};
			HTTP.call("POST", list.endpoint, params, function(err, resp) {

				if (err) {
					future.return({status: 500,});
				}
				else {

	                xml2js.parseString(resp.content, function(json_err, json_res) {

	                	if (json_err) {
	                		future.return({status: 500,});
	                	}
	                	else {
	                		future.return({status: 200,});
	                	}

	                });
				}
			});

			return future.wait();
		}
	},

});


function isURL(s) {
   var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
   return regexp.test(s);
}
