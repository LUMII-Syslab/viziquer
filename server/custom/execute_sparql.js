Meteor.methods({

	executeSparql: function(list) {

		var user_id = Meteor.userId();
    //console.log("ex-SPARQL");
		//if (is_project_version_admin(user_id, list)) {
      //console.log(list.options);
			var options = list.options;
			var limit_set = false;
			var number_of_rows = 0;

    if (!options.paging_info) {
			// let's try to determine the number of rows in the result
    try {
			// clone object. It is an efficient hack
			var count_options = JSON.parse(JSON.stringify(options));
			var c_query = count_options.params.params.query.split("\n");
			c_query.splice(1,0,"SELECT (COUNT(*) as ?number_of_rows_in_query_xyz) WHERE {");
			c_query.push("}");
		  count_options.params.params.query = _.reduce(c_query,
			                                             function(memo, num) {return memo + "\n" + num});
      //console.log(count_options.params.params.query);
			count_options.params.params.format="application/sparql-results+json";
			var qres = HTTP.post(count_options.endPoint, count_options.params);
			//console.log(qres);
      if (qres.statusCode == 200) {
			    var content = JSON.parse(qres.content);
					number_of_rows = content.results.bindings[0].number_of_rows_in_query_xyz.value;
					//console.log(number_of_rows);

					if (number_of_rows>50) {
						var new_query = options.params.params.query.split("\n");
						new_query.splice(1,0,"SELECT * WHERE {");
						new_query.push("} LIMIT 50");
					  options.params.params.query = _.reduce(new_query,
						                                             function(memo, num) {return memo + "\n" + num});
						limit_set = true;
					}
			}

		} catch (ex) {
			// ERROR - pass the original SPARQL to the server
			console.error(ex);
		};
	} else {
		var new_query = options.params.params.query.split("\n");
		new_query.splice(1,0,"SELECT * WHERE {");
		new_query.push("}");
		new_query.push("OFFSET "+options.paging_info.offset);
		new_query.push("LIMIT "+options.paging_info.limit);
		options.params.params.query = _.reduce(new_query,
																								 function(memo, num) {return memo + "\n" + num});
		limit_set = true;
		number_of_rows = options.paging_info.number_of_rows;
	};

			Future = Npm.require('fibers/future');
			var future = new Future();
      try {
        //console.log(options.params.params.query);
				HTTP.call("POST", options.endPoint, options.params, function(err, resp) {

					if (err) {
						future.return({status: 505, error:err, limit_set:false, number_of_rows:0});
					}
					else {

										xml2js.parseString(resp.content, function(json_err, json_res) {

											if (json_err) {
												future.return({status: 504, error:json_err, limit_set:false, number_of_rows:0});
											}
											else {
												//console.log(JSON.stringify(json_res,null,2));
												/*var result = _.map(json_res["sparql"]["results"][0]["result"], function(item) {
													return item.binding;
												});*/
												if (limit_set) {
													 if (options.paging_info) {
														  _.extend(json_res, {limit:50, offset:options.paging_info.offset+50});
													 } else {
														  _.extend(json_res, {limit:50, offset:50});
													 }
												}
                        _.extend(json_res, {limit_set:limit_set, number_of_rows:number_of_rows});
												future.return({status: 200, result: json_res});
											}

										});
					}

				});
			} catch (ex) {
				future.return({status: 503, ex:ex, limit_set:false, number_of_rows:0});
			};


			return future.wait();
		//}

	},

	testProjectEndPoint: function(list) {

		var user_id = Meteor.userId();
		//if (is_project_version_admin(user_id, list)) {

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
		//}
	},

});


function isURL(s) {
   var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
   return regexp.test(s);
}
