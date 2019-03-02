VQ_sparql_logs = new Mongo.Collection("VQ_Exec_SPARQL_Logs");

Meteor.methods({

	executeSparql: function(list) {
    //add_sparql_log(list);
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			console.log("in exec sparql");

			var options = list.options;
			var limit_set = false;
			var number_of_rows = 0;

			var sparql_log_entry = {};
			_.extend(sparql_log_entry, list);
			_.extend(sparql_log_entry, {user:user_id});

      		var newDate = new Date();
			_.extend(sparql_log_entry, {date:newDate.toLocaleDateString(), time:newDate.toLocaleTimeString()});
		    if (!options.paging_info) {

				// let's try to determine the number of rows in the result
		    	try {
					// clone object. It is an efficient hack
					var count_options = JSON.parse(JSON.stringify(options));

					// inserting SELECT COUNT before the first occurence of SELECT
		      		count_options.params.params.query = buildEnhancedQuery(count_options.params.params.query, "SELECT", " SELECT (COUNT(*) as ?number_of_rows_in_query_xyz) WHERE { ", "}");
					count_options.params.params.format="application/sparql-results+json";

					////////////////////////////////////////////////////////
					// to modify endpoint by adding URL encoded querry
					let query = count_options.params.params.query;
					query = query.replace(/(\r\n|\n|\r)/gm," ");	
					query = encodeURIComponent(query);
					query = query.replace(/[*]/g, '%2A');
					query = query.replace(/[(]/g, '%28');
					query = query.replace(/[)]/g, '%29');
					count_options.endPoint = count_options.endPoint + '?query=' + query + '&format=JSON';
					/////////////////////////////////////////////

					//var qres = HTTP.post(count_options.endPoint, count_options.params);
					var qres = HTTP.post(count_options.endPoint);

		      		if (qres.statusCode == 200) {
					    var content = JSON.parse(qres.content);
						number_of_rows = content.results.bindings[0].number_of_rows_in_query_xyz.value;
            			_.extend(sparql_log_entry, {successfull:true});
						if (number_of_rows > 50) {
							options.params.params.query = buildEnhancedQuery(options.params.params.query, "SELECT", "SELECT * WHERE {", "} LIMIT 50");
							limit_set = true;
						}
					}
				}

				catch (ex) {
					// ERROR - pass the original SPARQL to the server
					_.extend(sparql_log_entry, {successfull:false, error_message:ex})
					console.error(ex);
				};
			}

			else {
				if (!options.paging_info.download) {
					options.params.params.query = buildEnhancedQuery(options.params.params.query, "SELECT", "SELECT * WHERE {", "} OFFSET "+options.paging_info.offset+" LIMIT "+options.paging_info.limit);
					limit_set = true;
					number_of_rows = options.paging_info.number_of_rows;
				} else {
					// Do not change query
				  // Since no refresh is intended = no additional parameters required	
				}

			}

      _.extend(sparql_log_entry, {number_of_rows:number_of_rows});
			add_sparql_log(sparql_log_entry);
			Future = Npm.require('fibers/future');
			var future = new Future();

		    try {

				////////////////////////////////////////////////////////
					// to modify endpoint by adding URL encoded querry
					let query = options.params.params.query;
					query = query.replace(/(\r\n|\n|\r)/gm," ");
					query = encodeURIComponent(query);
					query = query.replace(/(\*)/g, '%2A');
					query = query.replace(/[(]/g, '%28');
					query = query.replace(/[)]/g, '%29');
					options.endPoint = options.endPoint + '?query=' + query;
					/////////////////////////////////////////////

				// HTTP.call("POST", options.endPoint, options.params, function(err, resp) {
				HTTP.call("POST", options.endPoint, function(err, resp) {
					if (err) {
						future.return({status: 505, error:err, limit_set: false, number_of_rows: 0});
					}
					else {

						xml2js.parseString(resp.content, function(json_err, json_res) {

							if (json_err) {
								future.return({status: 504, error:json_err, limit_set: false, number_of_rows: 0});
							}
							else {

								if (limit_set) {
									if (options.paging_info) {
										 _.extend(json_res, {limit: 50, offset:options.paging_info.offset + 50});
									}
									else {
										_.extend(json_res, {limit: 50, offset: 50});
									}
								}

	              _.extend(json_res, {limit_set: limit_set, number_of_rows: number_of_rows});
								future.return({status: 200, result: json_res});
							}
						});
					}
				});
			}
			catch (ex) {
				future.return({status: 503, ex:ex, limit_set: false, number_of_rows: 0});
			};

			return future.wait();
		}
	},

	testProjectEndPoint: function(list) {

		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

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

function buildEnhancedQuery(originalQuery, fragmentToFind, fragmentToInsert, fragmentToAdd) {
	var index_of_first_occurence = originalQuery.search(new RegExp(fragmentToFind,"i"));
	if (index_of_first_occurence != -1) {
		return originalQuery.substr(0,index_of_first_occurence) +
				fragmentToInsert +
				originalQuery.substr(index_of_first_occurence) +
				fragmentToAdd;
	}
	else {
			console.error("No SELECT in the query");
	};
}

function add_sparql_log(log) {
	VQ_sparql_logs.insert(log)
}
