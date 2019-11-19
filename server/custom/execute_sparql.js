VQ_sparql_logs = new Mongo.Collection("VQ_Exec_SPARQL_Logs");

Meteor.methods({

	executeSparql: function(list) {
		var user_id = Meteor.userId();
		if (!is_project_member(user_id, list)) return;

        console.log("in exec sparql");
        console.log("list:", JSON.stringify(list));

        var options = list.options;
        if (!options || !options.params || !options.params.params || !options.params.params.query) {
            console.error('The query is empty – returning immediately');
            return { status: 500, error: 'The query is empty'};
        }

        var limit_set = false;
        var number_of_rows = 0;

        var authOptions = {};
        if (hasAuthInfo(options)) {
            authOptions = { auth: makeAuthString(options) };
        }

        // requestFunction(url, httpOptions, query, namedGraph="", preferJSON = false, callback = null);
        var HTTP_REQUEST_FN = selectHttpRequestProfile(options);

        var sparql_log_entry = {};
        _.extend(sparql_log_entry, list);
        var currentTime = new Date();
        _.extend(sparql_log_entry, { user:user_id, date:currentTime.toLocaleDateString(), time:currentTime.toLocaleTimeString() });

        if (!options.paging_info) {

            // let's try to determine the number of rows in the result
            try {
                // clone object. It is an efficient hack
                var count_options = JSON.parse(JSON.stringify(options));

                // inserting SELECT COUNT before the first occurence of SELECT
                let query = buildEnhancedQuery(count_options.params.params.query, "SELECT", " SELECT (COUNT(*) as ?number_of_rows_in_query_xyz) WHERE { ", "}");

                let namedGraph = count_options.params.params['default-graph-uri'];

                // let httpOptions = _.extend({}, authOptions);
                let httpOptions = _.extend({}, count_options.params, authOptions); // ?? vai count_options.params var saturēt ko noderīgu?

                var qres = HTTP_REQUEST_FN(count_options.endPoint, httpOptions, query, namedGraph, true);

                if (qres.statusCode == 200) {
                    console.log(qres.content); //££//
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
            // to modify endpoint by adding URL encoded querry
            let query = options.params.params.query;
            let namedGraph = options.params.params['default-graph-uri'];

            query = encodeQuery(query);
            // options.endPoint = options.endPoint + '?'+ 'default-graph-uri=' + namedGraph +'&query=' + query;

            let httpOptions = _.extend({}, authOptions);
            // let httpOptions = _.extend({}, options.params, authOptions);

            HTTP_REQUEST_FN(options.endPoint, httpOptions, query, namedGraph, false, function(err, resp) {

                if (err) {
                    future.return({status: 505, error:err, limit_set: false, number_of_rows: 0});
                }
                else {
                    if( resp["statusCode"] == 200 && resp["headers"]["content-type"].toLowerCase().startsWith("text")){
                        console.log(resp["statusCode"], resp["headers"]["content-type"], resp.content);
                        var error_message = resp.content;
                        if(error_message.length > 514) error_message = error_message.substring(0, 514) + "...";
                        future.return({status: 504, error:resp.content, limit_set: false, number_of_rows: 0});
                    } else{
                        xml2js.parseString(resp.content, function(json_err, json_res) {
                            console.log(resp["statusCode"], resp["headers"]["content-type"], resp.content, json_res);
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
                }

            });
        }
        catch (ex) {
            future.return({status: 503, ex:ex, limit_set: false, number_of_rows: 0});
        };

        return future.wait();
	},

	testProjectEndPoint__: function(options) {
		var user_id = Meteor.userId();
        if (!is_project_member(user_id, options)) return;

        console.log("in test endpoint");
        console.log("options:", options);

        if (!options.endpoint) {
            console.error("No data specified");
            return {status: 500,};
        }

        var HTTP_REQUEST_FN = selectHttpRequestProfile(options);

        Future = Npm.require('fibers/future');
        var future = new Future();

        var httpOptions = {};

        if (hasAuthInfo(options)) {
            httpOptions = { auth: makeAuthString(options) }
        }

        let testResults = {};

        for (let profile of ["P1", "P2", "P3", "P4"]) {
            console.log("trying profile", profile);
            let fn = selectHttpRequestProfileByName(profile);

            try {
                let response = fn(options.endpoint, httpOptions, ENDPOINT_TEST_QUERY, options.uri, false);
                let ct = detectContentType(resp.content);
                testResults[profile] = ct;
                if (ct === 'xml') {
                    let xml = xml2js.parseStringSync(resp.content);
                }
            } catch (e) {
                testResults[profile] = "fail";
            }
        }

        console.log(testResults);
        return {status: 200};

	},

	testProjectEndPoint: function(options) {
		var user_id = Meteor.userId();
        if (!is_project_member(user_id, options)) return;

        console.log("in test endpoint");
        console.log("options:", options);

        if (!options.endpoint) {
            console.error("No data specified");
            return {status: 500,};
        }

        var HTTP_REQUEST_FN = selectHttpRequestProfile(options);

        Future = Npm.require('fibers/future');
        var future = new Future();

        var httpOptions = {};

        if (hasAuthInfo(options)) {
            httpOptions = { auth: makeAuthString(options) }
        }

        HTTP_REQUEST_FN(options.endpoint, httpOptions, ENDPOINT_TEST_QUERY, options.uri, false, function(err, resp){
            if (err) {
                console.log(err);
                if (err.response.statusCode === 401) {
                    future.return({status: 401,});
                } else {
                    future.return({status: 500,});
                }
            }
            else {
                xml2js.parseString(resp.content, function(json_err, json_res) {

                    if (json_err) {
                        console.log(json_err);
                        future.return({status: 500,});
                    }
                    else {
                        future.return({status: 200,});
                    }

                });
            }

        });

        return future.wait();
	},

});

function detectContentType(content) {
    let text = content.toLowerCase();
    if (text.startsWith('<?xml')) return 'xml';
    if (text.startsWith('<sparql')) return 'xml';
    if (text.startsWith('{')) return 'json'; // REFINE ME
    if (text.startsWith('<!doctype')) return 'html';
    if (text.startsWith('<html')) return 'html';
    if (text.startsWith('<!--')) return 'html';
    return 'text';
}

function selectHttpRequestProfile(options) {
    if (options && options.httpRequestProfileName) {
        return selectHttpRequestProfileByName(options.httpRequestProfileName);
    } else {
        let profileName = selectHttpRequestProfileNameByUrl(options.endPoint || options.endpoint); // TODO: vienādot rakstību
        return selectHttpRequestProfileByName(profileName);
    }
}

var DEFAULT_PROFILE_NAME = "P1";

var NON_DEFAULT_PROFILES = [
    { pattern: 'wikidata.org', profileName: 'P1' },
    { pattern: 'scholarlydata.org', profilName: 'P4' },
];

var TIMEOUT = 0;

var XML_FORMAT = 'application/sparql-results+xml';
var JSON_FORMAT = 'application/sparql-results+json';

var ENDPOINT_TEST_QUERY = 'SELECT ?a ?b ?c where{?a ?b ?c} LIMIT 10';

function selectHttpRequestProfileByName(name) {
    if (!name) return DEFAULT_PROFILE;

    switch(name) {
        case 'P1':
            return doHttpRequestP1;
        case 'P1b':
            return doHttpRequestP1b;
        case 'P2':
            return doHttpRequestP2;
        case 'P2b':
            return doHttpRequestP2b;
        case 'P3':
            return doHttpRequestP3;
        case 'P4':
            return doHttpRequestP4;
        default:
            return selectHttpRequestProfileByName(DEFAULT_PROFILE_NAME);
    }
}

function selectHttpRequestProfileNameByUrl(url) {
    for (let entry of NON_DEFAULT_PROFILES) {
        if (url.indexOf(entry.pattern) !== -1) return entry.profilName;
    }

    return DEFAULT_PROFILE_NAME;
}

// NOTE: Blazegraph does not like an empty value for the parameter 'default-graph-uri'.

/**
 * HTTP request profiles for calling SPARQL endpoints:
 *
 * P1* - GET with encoded params in URL,
 * P2* - POST with encoded params in body,
 * P3* - POST with raw query in body and remaining params encoded in URL, and
 * P4* - POST with encoded params in URL (non-standard).
 */

function doHttpRequestP1(url, httpOptions, query, namedGraph, preferJSON, callback) {
    console.log("profile P1", url, query, namedGraph, httpOptions, preferJSON);
    let fullUrl = `${url}?query=${encodeQuery2(query)}`;
    if (namedGraph) {
        fullUrl += `&default-graph-uri=${encodeURIComponent(namedGraph)}`;
    }
    let fullOptions = _.extend({}, httpOptions, { timeout: TIMEOUT });
    fullOptions.headers = {};
    if (preferJSON) {
        // fullUrl += `&format=${JSON_FORMAT}`;
        fullOptions.headers['Accept'] = JSON_FORMAT;
    } else {
        // fullUrl += `&format=${XML_FORMAT}`;
        fullOptions.headers['Accept'] = XML_FORMAT;
    }
    console.log("get P1", fullUrl, fullUrl);
    if (callback) {
        HTTP.get(fullUrl, fullOptions, callback);
    } else {
        return HTTP.get(fullUrl, fullOptions);
    }
}

function doHttpRequestP1b(url, httpOptions, query, namedGraph, preferJSON, callback) {
    console.log("profile P1b", url, query, namedGraph, httpOptions, preferJSON);
    let fullUrl = url;
    let fullOptions = _.extend({}, httpOptions, { timeout: TIMEOUT });

    fullOptions.params = {
        query: query
    };
    if (namedGraph) {
        fullOptions.params['default-graph-uri'] = namedGraph;
    }

    fullOptions.headers = {};
    if (preferJSON) {
        // fullUrl += `&format=${JSON_FORMAT}`;
        fullOptions.headers['Accept'] = JSON_FORMAT;
    } else {
        // fullUrl += `&format=${XML_FORMAT}`;
        fullOptions.headers['Accept'] = XML_FORMAT;
    }
    console.log("get P1b", fullUrl, fullUrl);
    if (callback) {
        HTTP.get(fullUrl, fullOptions, callback);
    } else {
        return HTTP.get(fullUrl, fullOptions);
    }
}

function doHttpRequestP2(url, httpOptions, query, namedGraph, preferJSON, callback) {
    console.log("profile P2", url, query, namedGraph, httpOptions, preferJSON);
    let fullUrl = url;
    let fullOptions = _.extend({}, httpOptions, { timeout: TIMEOUT });
    fullOptions.headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    // fullOptions.content = `query=${encodeQuery(query)}`;
    fullOptions.content = `query=${encodeQuery2(query)}`;
    // fullOptions.content = `query=${query}`;
    if (namedGraph) {
        fullOptions.content += `&default-graph-uri=${encodeURIComponent(namedGraph)}`;
    }
    if (preferJSON) {
        // fullOptions.content += `&format=${JSON_FORMAT}`;
        fullOptions.headers['Accept'] = JSON_FORMAT;
    } else {
        // fullOptions.content += `&format=${XML_FORMAT}`;
        fullOptions.headers['Accept'] = XML_FORMAT;
    }
    console.log("post P2", fullUrl, fullUrl);
    if (callback) {
        HTTP.post(fullUrl, fullOptions, callback);
    } else {
        return HTTP.post(fullUrl, fullOptions);
    }
}

function doHttpRequestP2b(url, httpOptions, query, namedGraph, preferJSON, callback) {
    console.log("profile P2b", url, query, namedGraph, httpOptions, preferJSON);
    let fullUrl = url;
    let fullOptions = _.extend({}, httpOptions, { timeout: TIMEOUT });
    fullOptions.headers = {}
    fullOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    fullOptions.params = {
        query: encodeQuery2(query),
        // query: query,
    }
    if (namedGraph) {
        fullOptions.params['default-graph-uri'] = namedGraph
    }
    if (preferJSON) {
        // fullOptions.content.format = JSON_FORMAT;
        fullOptions.headers['Accept'] = JSON_FORMAT;
    } else {
        // fullOptions.content.format = XML_FORMAT;
        fullOptions.headers['Accept'] = XML_FORMAT;
    }
    console.log("post P2b", fullUrl, fullUrl);
    if (callback) {
        HTTP.post(fullUrl, fullOptions, callback);
    } else {
        return HTTP.post(fullUrl, fullOptions);
    }
}

function doHttpRequestP3(url, httpOptions, query, namedGraph, preferJSON, callback) {
    console.log("profile P3", url, query, namedGraph, httpOptions, preferJSON);
    let fullUrl = `${url}`;
    if (namedGraph) {
        fullUrl += `?default-graph-uri=${encodeURIComponent(namedGraph)}`;
    }
    let fullOptions = _.extend({}, httpOptions, { timeout: TIMEOUT });
    fullOptions.headers = {
        'Content-Type': 'application/sparql-query'
    };
    fullOptions.content = query;
    if (preferJSON) {
        // fullUrl += `&format=${JSON_FORMAT}`;
        fullOptions.headers['Accept'] = JSON_FORMAT;
    } else {
        // fullUrl += `&format=${XML_FORMAT}`;
        fullOptions.headers['Accept'] = XML_FORMAT;
    }
    console.log("post P3", fullUrl, fullUrl);
    if (callback) {
        HTTP.post(fullUrl, fullOptions, callback);
    } else {
        return HTTP.post(fullUrl, fullOptions);
    }
}

function doHttpRequestP4(url, httpOptions, query, namedGraph, preferJSON, callback) {
    console.log("profile P4", url, query, namedGraph, httpOptions, preferJSON);
    let fullUrl = `${url}?query=${encodeQuery2(query)}`;
    if (namedGraph) {
        fullUrl += `&default-graph-uri=${encodeURIComponent(namedGraph)}`;
    }
    let fullOptions = _.extend({}, httpOptions, { timeout: TIMEOUT });
    fullOptions.headers = {};
    if (preferJSON) {
        // fullUrl += `&format=${JSON_FORMAT}`;
        fullOptions.headers['Accept'] = JSON_FORMAT;
    } else {
        // fullUrl += `&format=${XML_FORMAT}`;
        fullOptions.headers['Accept'] = XML_FORMAT;
    }
    console.log("post P4", fullUrl, fullUrl);
    if (callback) {
        HTTP.post(fullUrl, fullOptions, callback);
    } else {
        return HTTP.post(fullUrl, fullOptions);
    }
}

function encodeQuery(q) {
    var query = q.replace(/(\r\n|\n|\r)/gm," ");
    query = encodeURIComponent(query);
    query = query.replace(/\*/g, '%2A');
    query = query.replace(/\(/g, '%28');
    query = query.replace(/\)/g, '%29');
    return query;
}

function encodeQuery2(q) {
    var query = q.replace(/(\r\n|\n|\r)/gm," ");
    query = query.replace(/\s/g, '+');
    query = query.replace(/\?/g, '%3F');
    query = query.replace(/\{/g, '%7B');
    query = query.replace(/\}/g, '%7D');

    // query = query.replace(/\*/g, '%2A');
    // query = query.replace(/\(/g, '%28');
    // query = query.replace(/\)/g, '%29');

    return query;
}

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

function hasAuthInfo(params) {
	return params.endpointUsername && params.endpointPassword;
}

function makeAuthString(params) {
	return params.endpointUsername + ':' + params.endpointPassword;
}
