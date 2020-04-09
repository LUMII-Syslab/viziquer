// meteor npm install sparqljs

// ?Student :hasMark 8 .

var x = 10;
var y = 10;
var width = 150;
var height = 66;

Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

  generateVisualQuery: function(text){
	  Utilities.callMeteorMethod("parseSPARQLText", text, function(parsedQuery) {

		//console.log("tttttttttttttt", parsedQuery);
		console.log(JSON.stringify(parsedQuery, 0, 2));
		var schema = new VQ_Schema();
		var variableList = getAllVariablesInQuery(parsedQuery, schema);

		var abstractTable = generateAbstractTable(parsedQuery, [], variableList);
		//console.log(abstractTable);
		// console.log(JSON.stringify(abstractTable["classesTable"], 0, 2));
		var classesTable = abstractTable["classesTable"];

		var startClass = getStartClass(classesTable);

		classesTable = generateClassCtructure(startClass["class"], startClass["name"], classesTable, abstractTable["linkTable"]);

		classesTable["orderings"] = abstractTable["orderTable"];
		if(typeof parsedQuery["limit"] !== 'undefined') classesTable["limit"] =  parsedQuery["limit"];
		if(typeof parsedQuery["offset"] !== 'undefined') classesTable["offset"] =  parsedQuery["offset"];
		if(typeof parsedQuery["distinct"] !== 'undefined') classesTable["distinct"] =  parsedQuery["distinct"];

		// visualizeQuery(abstractTable["classesTable"]["root"], null);
		visualizeQuery(classesTable, null);
		
		console.log("classesTable", classesTable, abstractTable);

	  });
  },
  
   pegTest: function(text){
	  Utilities.callMeteorMethod("parseExpressionForCompletions", text, function(parsedQuery) {

		// console.log("tttttttttttttt", parsedQuery);
		

	  });
  },
});


function generateAbstractTable(parsedQuery, allClasses, variableList){
	x = 10;
	y = 10;
	var schema = new VQ_Schema();

	var abstractTable = [];
	//table with textual SPARQL query prefixes
	var prefixes = parsedQuery["prefixes"];

	var classesTable = [];
	var attributeTable = [];
	var filterTable = [];
	var linkTable = [];
	var orderTable = [];
	var bindTable = [];

	//where
	var where = parsedQuery["where"];
	for(var key in where){
		var wherePartTemp = parseSPARQLjsStructureWhere(where[key], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, null, bindTable);
		classesTable = wherePartTemp["classesTable"];
		attributeTable = wherePartTemp["attributeTable"];
		linkTable = wherePartTemp["linkTable"];
		filterTable = wherePartTemp["filterTable"];
		bindTable = wherePartTemp["bindTable"];
	}
	
	
	//order
	var order = parsedQuery["order"];
	for(var key in order){
		var exp = vq_visual_grammar.parse(order[key]["expression"])["value"];
		var isDescending = false;
		if(typeof order[key]["descending"] !== 'undefined') isDescending = order[key]["descending"];
		if(typeof attributeTable[exp] !== 'undefined' && (attributeTable[exp]["alias"] == "" || (attributeTable[exp]["identification"] != null && attributeTable[exp]["identification"]["localName"] == attributeTable[exp]["alias"]))) {
			attributeTable[exp]["seen"] = true;
		}
		orderTable.push({
			"exp":exp,
			"isDescending":isDescending
		})
	}
	//select
	var variables = parsedQuery["variables"];
	for(var key in variables){
		if(typeof variables[key] === 'string'){

			//check kind (Class or Property)
			//class
			if(typeof classesTable[variables[key]] !== 'undefined'){
				//add class as attribute
				var parsedClass = vq_visual_grammar.parse(variables[key])["value"]
				var attributeInfo = {
					"alias":"",
					"identification":schema.resolveClassByName(parsedClass),
					// "exp":parsedClass
					"exp":"(select this)"
				}
				classesTable[variables[key]] = addAttributeToClass(classesTable[variables[key]], attributeInfo);
			}
			//property
			else if(typeof attributeTable[vq_visual_grammar.parse(variables[key])["value"]] !== 'undefined') {
				// add attribute
				var parsedAttribute = vq_visual_grammar.parse(variables[key])["value"]

				var attributeInfoTemp = attributeTable[parsedAttribute];
				var exp = attributeInfoTemp["identification"]["short_name"];
				if(typeof attributeInfoTemp.exp !== 'undefined') exp = attributeInfoTemp.exp;
				var attributeInfo = {
					"alias":attributeInfoTemp["alias"],
					"identification":attributeInfoTemp["identification"],
					"requireValues":attributeInfoTemp["requireValues"],
					"isInternal":false,
					"groupValues":false,
					"exp":exp
				}
				classesTable[attributeTable[parsedAttribute]["class"]] = addAttributeToClass(classesTable[attributeTable[parsedAttribute]["class"]], attributeInfo);
				attributeTable[parsedAttribute]["seen"] = true;
			}
			//reference
			else if(typeof variableList[variables[key]] !== 'undefined'){
				
				var parsedAttribute = vq_visual_grammar.parse(variables[key])["value"];
				if(typeof bindTable[parsedAttribute] === 'undefined'){
					var attributeInfo = {
						"alias":"",
						"identification":null,
						"requireValues":false,
						"isInternal":false,
						"groupValues":false,
						"exp":parsedAttribute
					}

					for (var clazz in classesTable){
						classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
						break;
					}
				}
				//attributeTable[parsedAttribute]["seen"] = true;
			}
		} else if(typeof variables[key] === 'object'){

			var alias = vq_visual_grammar.parse(variables[key]["variable"])["value"];
			var expression = variables[key]["expression"];
			//aggregation
			if(expression["type"] == "aggregate"){
				var distinct = "";
				if(expression["distinct"] == true)distinct = "DISTINCT ";
				var aggregateExpression = vq_visual_grammar.parse(expression["expression"])["value"];
				var aggregationExp = expression["aggregation"] + "(" +distinct + aggregateExpression +")";

				//aggregate on class
				if(typeof classesTable[expression["expression"]] !== 'undefined'){
					if(expression["aggregation"].toLowerCase() == "count") {
						if(distinct == "") aggregationExp = "count(.)";
						else  aggregationExp = "count_distinct(.)";
					}
					var aggregateInfo = {
						"exp":aggregationExp,
						"alias":alias
					}
					classesTable[expression["expression"]] = addAggrigateToClass(classesTable[expression["expression"]], aggregateInfo);
				}
				//aggregate on attribute
				else if(typeof attributeTable[aggregateExpression] !== 'undefined') {
					if(attributeTable[aggregateExpression]["alias"] == "" && typeof attributeTable[aggregateExpression]["exp"] !== 'undefined') aggregationExp = expression["aggregation"] + "(" +distinct + attributeTable[aggregateExpression]["exp"] +")";
					
					var aggregateInfo = {
						"exp":aggregationExp,
						"alias":alias
					}
					classesTable[attributeTable[aggregateExpression]["class"]] = addAggrigateToClass(classesTable[attributeTable[aggregateExpression]["class"]], aggregateInfo);
					if((attributeTable[aggregateExpression]["identification"]!= null && attributeTable[aggregateExpression]["alias"] == attributeTable[aggregateExpression]["identification"]["localName"]) || attributeTable[aggregateExpression]["alias"] == "")attributeTable[aggregateExpression]["seen"] = true;
				}
			}
			//operation
			else if(expression["type"] == "operation"){
				//TODO
			}
		}
	}

	//internal attributes
	for(var attribute in attributeTable){
		if(attributeTable[attribute]["seen"] != true){
			var attributeInfoTemp = attributeTable[attribute];
			// console.log("AAAAAAAA", attributeInfoTemp)
			var attributeInfo = {
					"alias":attributeInfoTemp["alias"],
					"identification":attributeInfoTemp["identification"],
					"requireValues":attributeInfoTemp["requireValues"],
					"isInternal":true,
					"groupValues":false,
					"exp":attributeInfoTemp["identification"]["short_name"]
				}
			classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);

		}
	}

	//console.log("classesTable", classesTable);
	//console.log("filterTable", filterTable);
	//console.log("attributeTable", attributeTable);
	//console.log("linkTable", linkTable);
	//console.log("orderTable", orderTable);
	//console.log("bindTable", bindTable);

	return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, orderTable:orderTable};
}

function parseSPARQLjsStructureWhere(where, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, unionSubject){
	var viziQuerExpr = {
		"exprString" : "",
		"exprVariables" : []
	};
	var linkTableAdded = [];
	var classTableAdded = [];
	var attributeTableAdded = [];
	// var bindTable = [];

	//type=bgp
	if(where["type"] == "bgp"){
		var triples = where["triples"];
		var temp = generateTypebgp(triples, classesTable, attributeTable, linkTable, bgptype, allClasses, unionSubject);
		
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		linkTable = temp["linkTable"];
		filterTable = temp["filterTable"];
		linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
		classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
		attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
	}
	//type=optional
	if(where["type"] == "optional"){

		// bgptype = "optional";
		var patterns = where["patterns"];

		//if optional attribute
		if(patterns.length == 1 && patterns[0]["type"] == "bgp" && patterns[0]["triples"].length == 1){
			bgptype = "optional";
		} else {
			bgptype = "optionalLink";
		}

		for(var pattern in patterns){
			var temp = parseSPARQLjsStructureWhere(patterns[pattern], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, unionSubject);
			classesTable = temp["classesTable"];
			attributeTable = temp["attributeTable"];
			//linkTable = temp["linkTable"];
			filterTable = temp["filterTable"];
			linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
			classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
			attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
			bindTable = temp["bindTable"];
			// viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
			// viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			
		}
		//find optional link
		for(var link in linkTableAdded){
			if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
				linkTableAdded[link]["linkType"] = "OPTIONAL";
			}
		}
		linkTable = linkTable.concat(linkTableAdded);

		bgptype == "plain";
	}
	//type=filter
	if(where["type"] == "filter"){
		// var temp2 = generateTypeFilter(where["expression"]);
		var temp = parseSPARQLjsStructureWhere(where["expression"], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);

		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		filterTable = temp["filterTable"];
		attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
		bindTable = temp["bindTable"];
		
		if(filterTable.length == 0 && temp["viziQuerExpr"]["exprString"] == ""){
			
		}else{
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
			viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);

			filterTable.push({filterString:viziQuerExpr["exprString"], filterVariables:viziQuerExpr["exprVariables"]});
			var className;
			for(var fil in viziQuerExpr["exprVariables"]){
				
				if(typeof  attributeTable[viziQuerExpr["exprVariables"][fil]] != 'undefined') className = attributeTable[viziQuerExpr["exprVariables"][fil]]["class"];
				else{
					
					if(typeof classesTable[viziQuerExpr["exprVariables"][fil]] !== 'undefined') className = classesTable[viziQuerExpr["exprVariables"][fil]]
					
					if(typeof classesTable["?" + viziQuerExpr["exprVariables"][fil]] !== 'undefined') className = "?" + viziQuerExpr["exprVariables"][fil]
					
					if(typeof className == 'undefined'){
						for(var clazz in classesTable){
							className = clazz;
							break;
						}
					}
				}
				
				if(typeof classesTable[className]["conditions"] === 'undefined') classesTable[className]["conditions"] = [];
				classesTable[className]["conditions"].push(viziQuerExpr["exprString"]);
			}
			
			if(typeof classesTable[className]["conditions"] !== 'undefined') {
				classesTable[className]["conditions"] = classesTable[className]["conditions"].filter(function (el, i, arr) {
					return arr.indexOf(el) === i;
				});
			}
			// console.log("className", className, attributeTable, classesTable)
		}
	}
	
	if(where["type"] == "union"){
		var identification = {
				"localName": "[ + ]",
				  "parsed_exp": [
					null,
					"[ + ]",
					null
				  ]
			}
		classesTable["[ + ]"] = {
			"localName":"[ + ]",
			"identification":identification,
			"instanceAlias":null,
			"isVariable":false,
			"isUnit":false,
			"isUnion":true
		};
		
		console.log(attributeTable, classesTable, linkTable);
		
		
		var subjectTable = [];
		
		for(var pattern in where["patterns"]){
			if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "group"){
				for(var p in where["patterns"][pattern]["patterns"]){
					var pat = where["patterns"][pattern]["patterns"][p]
					if(typeof pat["type"] !== 'undefined' && pat["type"] == "bgp"){
						for(var triple in pat["triples"]){
							if(typeof subjectTable[pat["triples"][triple]["subject"]] === 'undefined') subjectTable[pat["triples"][triple]["subject"]] = 1;
							else subjectTable[pat["triples"][triple]["subject"]] = subjectTable[pat["triples"][triple]["subject"]] + 1;
						}
					}
					console.log("AAAAA", where["patterns"][pattern]["patterns"][p])
				}
			} else if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "bgp"){
					
					console.log("BBBB", where["patterns"][pattern]);
					var pat = where["patterns"][pattern]
					if(typeof pat["type"] !== 'undefined' && pat["type"] == "bgp"){
						for(var triple in pat["triples"]){
							if(typeof subjectTable[pat["triples"][triple]["subject"]] === 'undefined') subjectTable[pat["triples"][triple]["subject"]] = 1;
							else subjectTable[pat["triples"][triple]["subject"]] = subjectTable[pat["triples"][triple]["subject"]] + 1;
						}
					}
					
			} else if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "optional"){
				for(var p in where["patterns"][pattern]["patterns"]){
					console.log("CCCCC", where["patterns"][pattern]["patterns"][p])
				}
			}else if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "filter" && where["patterns"][pattern]["expression"]["type"] == "operation" && where["patterns"][pattern]["expression"]["operator"] == "notexists"){
				console.log("DDDDD", where["patterns"][pattern]["patterns"][p])
				
			}else if(typeof where["patterns"][pattern]["queryType"] !== 'undefined' && where["patterns"][pattern]["queryType"] == "SELECT"){
				
				console.log("EEEEEE", where["patterns"][pattern])
			}
		}
		
		var unionSubject = null;
		
		for(var subject in subjectTable){
			if(unionSubject == null) unionSubject = subject;
			else if(subjectTable[subject] > subjectTable[unionSubject])unionSubject = subject;
		}
		
		if(unionSubject != null){
			var link = {
				"linkIdentification":{localName: "++", short_name: "++"},
				"object":"[ + ]",
				"subject":unionSubject,
				"isVisited":false,
				"linkType":"REQUIRED",
				"localName":"++",
				"isSubQuery":false,
				"isGlobalSubQuery":false,
			}
			linkTable.push(link);
			linkTableAdded.push(link);
		}

		for(var pattern in where["patterns"]){
			if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "group"){
				for(var p in where["patterns"][pattern]["patterns"]){
					var temp = parseSPARQLjsStructureWhere( where["patterns"][pattern]["patterns"][p], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, unionSubject);
	
				}
			} else if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "bgp"){
					
					var triples = where["patterns"][pattern]["triples"];
					var temp = generateTypebgp(triples, classesTable, attributeTable, linkTable, bgptype, allClasses, unionSubject);
					
			} else if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "optional"){
				
				console.log("IIIIIIII", "optional")
				
				for(var p in where["patterns"][pattern]["patterns"]){
					var temp = parseSPARQLjsStructureWhere( where["patterns"][pattern]["patterns"][p], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, unionSubject);
				}

			}else if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "filter" && where["patterns"][pattern]["expression"]["type"] == "operation" && where["patterns"][pattern]["expression"]["operator"] == "notexists"){
				
				console.log("IIIIIIII", "notexists")
	
			}else if(typeof where["patterns"][pattern]["queryType"] !== 'undefined' && where["patterns"][pattern]["queryType"] == "SELECT"){

			}
		}

		// for(var pattern in where["patterns"]){
			// if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "group"){
				// for(var p in where["patterns"][pattern]["patterns"]){
					// var temp = parseSPARQLjsStructureWhere( where["patterns"][pattern]["patterns"][p], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable);
					// classesTable = temp["classesTable"];
					// attributeTable = temp["attributeTable"];
					// filterTable = temp["filterTable"];
					// linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
					// classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
					// attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
					// bindTable = temp["bindTable"];
					// viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
					// viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					
					// if(temp["classTableAdded"].length > 0){
						// for(var c in temp["classTableAdded"]){
							// var link = {
								// "linkIdentification":{localName: "++"},
								// "object":temp["classTableAdded"][c],
								// "subject":"[ + ]",
								// "isVisited":false,
								// "linkType":"REQUIRED",
								// "localName":"++",
								// "isSubQuery":false,
								// "isGlobalSubQuery":false,
							// }
							// linkTable.push(link);
							// linkTableAdded.push(link);
							// break;
						// }
					// }	
				// }
			// } else if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "bgp"){
					// var triples = where["patterns"][pattern]["triples"];
					// var temp = generateTypebgp(triples, classesTable, attributeTable, linkTable, bgptype, allClasses);
					
					// console.log("TTTTTTTTTt", temp);
					
					// classesTable = temp["classesTable"];
					// attributeTable = temp["attributeTable"];
					// linkTable = temp["linkTable"];
					// filterTable = temp["filterTable"];
					// linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
					// classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
					// attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
					
					// var schema = new VQ_Schema();
					
					// var linkResolved = schema.resolveLinkByName(triples[0]["predicate"]);
					// if (linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[0]["predicate"]);

					// if(temp["classTableAdded"].length > 0){
						// for(var c in temp["classTableAdded"]){
							// var link = {
								// "linkIdentification":linkResolved,
								// "object":temp["classTableAdded"][c],
								// "subject":"[ + ]",
								// "isVisited":false,
								// "linkType":"REQUIRED",
								// "localName":linkResolved["localName"],
								// "isSubQuery":false,
								// "isGlobalSubQuery":false,
							// }
							// linkTable.push(link);
							// linkTableAdded.push(link);
							// break;
						// }
					// }	
			// } else if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "optional"){
				// for(var p in where["patterns"][pattern]["patterns"]){
					// var temp = parseSPARQLjsStructureWhere( where["patterns"][pattern]["patterns"][p], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable);
					// classesTable = temp["classesTable"];
					// attributeTable = temp["attributeTable"];
					// filterTable = temp["filterTable"];
					// linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
					// classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
					// attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
					// bindTable = temp["bindTable"];
					// viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
					// viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					
					
					// if(temp["classTableAdded"].length > 0){
						// for(var c in temp["classTableAdded"]){
							// var link = {
								// "linkIdentification":{localName: "++"},
								// "object":temp["classTableAdded"][c],
								// "subject":"[ + ]",
								// "isVisited":false,
								// "linkType":"OPTIONAL",
								// "localName":"++",
								// "isSubQuery":false,
								// "isGlobalSubQuery":false,
							// }
							// linkTable.push(link);
							// linkTableAdded.push(link);
							// break;
						// }
					// }	
				// }
			// }else if(typeof where["patterns"][pattern]["type"] !=="undefined" && where["patterns"][pattern]["type"]== "filter" && where["patterns"][pattern]["expression"]["type"] == "operation" && where["patterns"][pattern]["expression"]["operator"] == "notexists"){
				
				// var temp = parseSPARQLjsStructureWhere(where["patterns"][pattern]["expression"], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable);
				// classesTable = temp["classesTable"];
				// attributeTable = temp["attributeTable"];
				// filterTable = temp["filterTable"];
				// linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
				// classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
				// attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
				// bindTable = temp["bindTable"];
				// viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				// viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					
					
				// if(temp["classTableAdded"].length > 0){
					// for(var c in temp["classTableAdded"]){
						// var link = {
							// "linkIdentification":{localName: "++"},
							// "object":temp["classTableAdded"][c],
							// "subject":"[ + ]",
							// "isVisited":false,
							// "linkType":"NOT",
							// "localName":"++",
							// "isSubQuery":false,
							// "isGlobalSubQuery":false,
						// }
						// linkTable.push(link);
						// linkTableAdded.push(link);
						// break;
					// }
				// }
			// }else if(typeof where["patterns"][pattern]["queryType"] !== 'undefined' && where["patterns"][pattern]["queryType"] == "SELECT"){

				// var abstractTable = generateAbstractTable(where["patterns"][pattern], classesTable, variableList);

				// var linkType = "REQUIRED";
				// if(typeof where["patterns"][pattern]["where"] !== 'undefined' && where["patterns"][pattern]["where"].length == 1 && where["patterns"][pattern]["where"][0]["type"] == "optional") linkType = "OPTIONAL";

				// var subSelectMainClass;
				// for(subClass in abstractTable["classesTable"]){
					// subSelectMainClass = subClass;
					// break;
				// }
				// var link = {
							// "linkIdentification":{localName: "++"},
							// "object":subSelectMainClass,
							// "subject":"[ + ]",
							// "isVisited":false,
							// "linkType":linkType,
							// "localName":"++",
							// "isSubQuery":true,
							// "isGlobalSubQuery":false,
						// }
						// linkTable.push(link);
						// linkTableAdded.push(link);

				// for(subClass in abstractTable["classesTable"]){
					// classesTable[subClass] = abstractTable["classesTable"][subClass];
				// }
			// }
		// }
	}
	
	if(where["type"] == "bind"){
		var temp = parseSPARQLjsStructureWhere( where["expression"], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, unionSubject);
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		//linkTable = temp["linkTable"];
		filterTable = temp["filterTable"];
		linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
		classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
		attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
		bindTable = temp["bindTable"];
		viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
		viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
		var attributeInfo = {
							"alias":where["variable"].substring(1),
							"identification":null,
							"requireValues":false,
							"isInternal":false,
							"groupValues":false,
							"exp":viziQuerExpr["exprString"]
						}
		bindTable[where["variable"].substring(1)] = attributeInfo;
		if(viziQuerExpr["exprString"] != "")classesTable[attributeTable[viziQuerExpr["exprVariables"][0]]["class"]] = addAttributeToClass(classesTable[attributeTable[viziQuerExpr["exprVariables"][0]]["class"]], attributeInfo);
		
	}
	
	if(where["type"] == "operation"){
		//realtion or atithmetic
		if(checkIfRelation(where["operator"]) != -1 || chechIfArithmetic(where["operator"]) != -1){
			
			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
			}
			else if(typeof where["args"][0] == 'object'){
				
				var temp = parseSPARQLjsStructureWhere(where["args"][0], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);
				
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				bindTable = temp["bindTable"];
			}

			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + where["operator"] + " ";

			if(typeof where["args"][1] == 'string') {
				var arg2 = generateArgument(where["args"][1]);
				if(arg2["type"] == "varName") viziQuerExpr["exprVariables"].push(arg2["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg2["value"];
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][1], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		//one argumentFunctions
		else if(checkIfOneArgunemtFunctuion(where["operator"]) != -1){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";

			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";

		}
		//two argumentFunctions
		else if(checkIfTwoArgunemtFunctuion(where["operator"]) != -1){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";

			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ", ";
			
			if(typeof where["args"][1] == 'string') {
				var arg1 = generateArgument(where["args"][1]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][1], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";
		}
		//coalesce / concat / regex / substr
		else if(where["operator"]== "coalesce" || where["operator"]== "concat" || where["operator"]== "regex" || where["operator"]== "substr" || where["operator"]== "replace"){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";
			var args = [];
			
			for(var arg in where["args"]){
				if(typeof where["args"][arg] == 'string') {
					var arg1 = generateArgument(where["args"][arg]);
					if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
					args.push(arg1["value"]);
					// viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
				}
				else if(typeof where["args"][arg] == 'object'){
					var temp = parseSPARQLjsStructureWhere(where["args"][arg], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);
					bindTable = temp["bindTable"];
					// viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
					args.push(temp["viziQuerExpr"]["exprString"]);
					viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				}
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ") + ")";
		}
		//not exists
		else if(where["operator"] == "notexists"){
			
			if(where["args"].length == 1 && where["args"][0]["type"] == "bgp" && where["args"][0]["triples"].length == 1){
				var schema = new VQ_Schema();
				var dataPropertyResolved = schema.resolveAttributeByName(null, where["args"][0]["triples"][0]["predicate"]);
				if(dataPropertyResolved!=null){
					exprVariables = [];
					exprVariables.push(dataPropertyResolved["localName"]);
					filterTable.push({filterString:"NOT EXISTS " + dataPropertyResolved["localName"], filterVariables:exprVariables});
					
					if(typeof classesTable[where["args"][0]["triples"][0]["subject"]]["conditions"] === 'undefined') classesTable[where["args"][0]["triples"][0]["subject"]]["conditions"] = [];
					classesTable[where["args"][0]["triples"][0]["subject"]]["conditions"].push("NOT EXISTS " + dataPropertyResolved["localName"]);
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + dataPropertyResolved["localName"]
					viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
				}
			} else {
				for(var arg in where["args"]){
					if(where["args"][arg]["type"] == 'group'){
						var patterns =  where["args"][arg]["patterns"];
						for(var pattern in patterns){
							var temp = parseSPARQLjsStructureWhere(patterns[pattern], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, unionSubject);
							classesTable = temp["classesTable"];
							attributeTable = temp["attributeTable"];
							//linkTable = temp["linkTable"];
							filterTable = temp["filterTable"];
							linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
							classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
							attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
							bindTable = temp["bindTable"];

							// viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
							// viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
						}
					} else{
						var temp = parseSPARQLjsStructureWhere(where["args"][arg], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, unionSubject);
						classesTable = temp["classesTable"];
						attributeTable = temp["attributeTable"];
						filterTable = temp["filterTable"];
						linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
						classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
						attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
						bindTable = temp["bindTable"];					
					}
				}
			}

			for(link in linkTableAdded){
				if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
					linkTableAdded[link]["linkType"] = "NOT";
					if(patternType == "minus") linkTableAdded[link]["isSubQuery"] = true;
					for(attr in attributeTableAdded){
						var attributeInfoTemp = attributeTable[attributeTableAdded[attr]];
						var attributeInfo = {
							"alias":attributeInfoTemp["alias"],
							"identification":attributeInfoTemp["identification"],
							"requireValues":attributeInfoTemp["requireValues"],
							"isInternal":false,
							"groupValues":false,
							"exp":attributeInfoTemp["identification"]["short_name"]
						}
						classesTable[attributeTable[attributeTableAdded[attr]]["class"]] = addAttributeToClass(classesTable[attributeTable[attributeTableAdded[attr]]["class"]], attributeInfo);
						attributeTable[attributeTableAdded[attr]]["seen"] = true;
					}
				}
			}
			linkTable = linkTable.concat(linkTableAdded);
		}
		//exists
		else if(where["operator"] == "exists"){
			for(var arg in where["args"]){
				if(where["args"][arg]["type"] == 'group'){
					var patterns =  where["args"][arg]["patterns"];
					for(var pattern in patterns){
						var temp = parseSPARQLjsStructureWhere(patterns[pattern], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, unionSubject);
						classesTable = temp["classesTable"];
						attributeTable = temp["attributeTable"];
						//linkTable = temp["linkTable"];
						filterTable = temp["filterTable"];
						linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
						classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
						attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
						bindTable = temp["bindTable"];

						// viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
						// viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					}
				 } else{
					var temp = parseSPARQLjsStructureWhere(where["args"][arg], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, unionSubject);
					classesTable = temp["classesTable"];
					attributeTable = temp["attributeTable"];
					filterTable = temp["filterTable"];
					linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
					classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
					attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
					bindTable = temp["bindTable"];
				 }
			}

			for(link in linkTableAdded){
				if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
					linkTableAdded[link]["linkType"] = "REQUIRED";
					linkTableAdded[link]["isSubQuery"] = true;
					for(attr in attributeTableAdded){
						var attributeInfoTemp = attributeTable[attributeTableAdded[attr]];
						var attributeInfo = {
							"alias":attributeInfoTemp["alias"],
							"identification":attributeInfoTemp["identification"],
							"requireValues":attributeInfoTemp["requireValues"],
							"isInternal":false,
							"groupValues":false,
							"exp":attributeInfoTemp["identification"]["short_name"]
						}
						classesTable[attributeTable[attributeTableAdded[attr]]["class"]] = addAttributeToClass(classesTable[attributeTable[attributeTableAdded[attr]]["class"]], attributeInfo);
						attributeTable[attributeTableAdded[attr]]["seen"] = true;
					}
				}
			}
			linkTable = linkTable.concat(linkTableAdded);
		}
		// or / and
		else if(where["operator"] == "||" || where["operator"] == "&&" ){
			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}

			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + where["operator"] + " ";

			if(typeof where["args"][1] == 'string') {
				var arg2 = generateArgument(where["args"][1]);
				if(arg2["type"] == "varName") viziQuerExpr["exprVariables"].push(arg2["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg2["value"];
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][1], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		// in / not in
		else if(where["operator"] == "in" || where["operator"] == "notin" ){
			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, unionSubject);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}

			var operator = "";
			if (where["operator"] == "in") operator = "IN";
			if (where["operator"] == "notin") operator = "NOT IN";
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + operator + "(";

			if(typeof where["args"][1] == 'object'){
				var args = [];
				for(arg in where["args"][1]){
					args.push(where["args"][1][arg]);
				}
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ");
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + ")";
		}
	}
	if(where["type"] == "group" && typeof where["patterns"][0]["queryType"] != "undefined"){

		var abstractTable = generateAbstractTable(where["patterns"][0], classesTable, variableList);

		//find links outside subquery
		for(subLink in abstractTable["linkTable"]){
			if(typeof classesTable[abstractTable["linkTable"][subLink]["subject"]] !== 'undefined' || typeof classesTable[abstractTable["linkTable"][subLink]["object"]] !== 'undefined'){
				abstractTable["linkTable"][subLink]["isSubQuery"] = true;
			}
			linkTable.push(abstractTable["linkTable"][subLink]);
		}


		var subSelectMainClass;
		for(subClass in abstractTable["classesTable"]){
			subSelectMainClass = subClass;
			break;
		}

console.log("EEEEEEE", subSelectMainClass, abstractTable["classesTable"])

		abstractTable["classesTable"][subSelectMainClass]["orderings"] = abstractTable["orderTable"];
		if(typeof where["patterns"][0]["limit"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["limit"] =  where["patterns"][0]["limit"];
		if(typeof where["patterns"][0]["offset"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["offset"] =  where["patterns"][0]["offset"];
		if(typeof where["patterns"][0]["distinct"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["distinct"] =  where["patterns"][0]["distinct"];

		for(subClass in abstractTable["classesTable"]){
			classesTable[subClass] = abstractTable["classesTable"][subClass];
		}

	//	visualizeQuery(abstractTable["classesTable"]["root"], null);
	}
	if(where["type"] == "minus"){

		var patterns = where["patterns"];

		for(var pattern in patterns){
			var temp = parseSPARQLjsStructureWhere(patterns[pattern], classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, "minus", bindTable, unionSubject);
			classesTable = temp["classesTable"];
			attributeTable = temp["attributeTable"];
			filterTable = temp["filterTable"];
			linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
			classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
			attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
			bindTable = temp["bindTable"];
		}
	}

	return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, viziQuerExpr:viziQuerExpr, attributeTableAdded:attributeTableAdded, bindTable:bindTable};
}

function generateTypebgp(triples, classesTable, attributeTable, linkTable, bgptype, allClasses, unionSubject){
	
	var linkTableAdded = [];
	var classTableAdded = [];
	var attributeTableAdded = [];
	var filterTable = [];

	var schema = new VQ_Schema();
	for(var triple in triples){

		//class definitions
		if(triples[triple]["predicate"] == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" && typeof allClasses[triples[triple]["subject"]] === 'undefined'){
			var instanceAlias = null;
			var classResolved = schema.resolveClassByName(triples[triple]["object"]);
			var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"]);

			//id identification.localName not equeals subject use alias
			if(classResolved["localName"] != subjectNameParsed["value"]) instanceAlias = subjectNameParsed["value"];

			console.log("CLASS DEFINITION", triples[triple]);

			classesTable[triples[triple]["subject"]] = {
				"localName":triples[triple]["object"],
				"identification":classResolved,
				"instanceAlias":instanceAlias,
				"isVariable":false,
				"isUnit":false,
				"isUnion":false
			};
			classTableAdded.push(triples[triple]["subject"]);

		} else{
			//if class without definition
			//from data property
			if(schema.resolveAttributeByName(null, triples[triple]["predicate"]) != null && bgptype != "optionalLink"){
				//subjest
				//var classNameParsed = vq_visual_grammar.parse(triples[triple]["subject"]);
				//var classResolved = schema.resolveClassByName(classNameParsed["value"]);

				// splitURI(triples[triple]["subject"]);
				// splitURI(vq_visual_grammar.parse(triples[triple]["subject"])["value"]);
				var instanceAlias = generateInstanceAlias(schema, vq_visual_grammar.parse(triples[triple]["subject"])["value"])

				console.log("CLASS FROM DATa PR", triples[triple]);

				if(typeof classesTable[triples[triple]["subject"]] === 'undefined' && typeof allClasses[triples[triple]["subject"]] === 'undefined'){
					classesTable[triples[triple]["subject"]] = {
						"localName":triples[triple]["subject"],
						"identification":null,
						"instanceAlias":instanceAlias,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false
					};

					classTableAdded.push(triples[triple]["subject"]);
				}
			}

			//from object property
			else if(schema.resolveLinkByName(triples[triple]["predicate"]) != null || bgptype == "optionalLink"){
				//subjest
				if(typeof classesTable[triples[triple]["subject"]] === 'undefined' && typeof allClasses[triples[triple]["subject"]] === 'undefined'){
					// splitURI(triples[triple]["subject"]);
					// splitURI(vq_visual_grammar.parse(triples[triple]["subject"])["value"]);
					var instanceAlias = generateInstanceAlias(schema, vq_visual_grammar.parse(triples[triple]["subject"])["value"])
				
					
					
					classesTable[triples[triple]["subject"]] = {
						"localName":triples[triple]["subject"],
						"identification":null,
						"instanceAlias":instanceAlias,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false
					};
					
					console.log("CLASS FROM OBJECT PR SUBJECT", triples[triple], triples[triple]["subject"], classesTable);

					classTableAdded.push(triples[triple]["subject"]);
				}
				//object
				if(typeof classesTable[triples[triple]["object"]] === 'undefined' && typeof allClasses[triples[triple]["object"]] === 'undefined'){
					
					// splitURI(triples[triple]["object"]);
					// splitURI(vq_visual_grammar.parse(triples[triple]["object"])["value"]);
					var instanceAlias = generateInstanceAlias(schema, vq_visual_grammar.parse(triples[triple]["object"])["value"])
				
				console.log("CLASS FROM OBJECT PR OBJECT", triples[triple]);
					
					classesTable[triples[triple]["object"]] = {
						"localName":triples[triple]["object"],
						"identification":null,
						"instanceAlias":instanceAlias,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false
					};

					classTableAdded.push(triples[triple]["object"]);
				}
			}
			//from object property path
			else if(typeof triples[triple]["predicate"] === "object" && triples[triple]["predicate"]["type"] == "path"){
				var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
				if(schema.resolveLinkByName(last_element) != null){
					//subjest
					if(typeof classesTable[triples[triple]["subject"]] === 'undefined' && typeof allClasses[triples[triple]["subject"]] === 'undefined'){
						classesTable[triples[triple]["subject"]] = {
							"localName":triples[triple]["subject"],
							"identification":null,
							"instanceAlias":vq_visual_grammar.parse(triples[triple]["subject"])["value"],
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};

						classTableAdded.push(triples[triple]["subject"]);
					}
					//object
					if(typeof classesTable[triples[triple]["object"]] === 'undefined' && typeof allClasses[triples[triple]["object"]] === 'undefined'){
						classesTable[triples[triple]["object"]] = {
							"localName":triples[triple]["object"],
							"identification":null,
							"instanceAlias":vq_visual_grammar.parse(triples[triple]["object"])["value"],
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};

						classTableAdded.push(triples[triple]["object"]);
					}
				}
			}
		}
	}

	for(var triple in triples){
		if(triples[triple]["predicate"] != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
			//data property
			if(bgptype != "optionalLink" && typeof classesTable[triples[triple]["object"]] === 'undefined' && schema.resolveAttributeByName(null, triples[triple]["predicate"]) != null){
				
				//if(typeof classesTable[triples[triple]["subject"]]["fields"] === 'undefined')classesTable[triples[triple]["subject"]]["fields"] = [];
				var alias = "";
				var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
				var attributeResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]);

				// filter as triple
				if(objectNameParsed["type"] == "number" || objectNameParsed["type"] == "string" || objectNameParsed["type"] == "RDFLiteral"){
					exprVariables = [];
					exprVariables.push(attributeResolved["short_name"]);
					filterTable.push({filterString:attributeResolved["short_name"]+ " = " + objectNameParsed["value"], filterVariables:exprVariables});
					
					if(typeof classesTable[triples[triple]["subject"]]["conditions"] === 'undefined') classesTable[triples[triple]["subject"]]["conditions"] = [];
					classesTable[triples[triple]["subject"]]["conditions"].push(attributeResolved["short_name"]+ " = " + objectNameParsed["value"]);
				} else{
					//id identification.localName not equeals to subject - use alias
					if(attributeResolved["localName"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
	
					var requireValues = true;
					if(bgptype == "optional") requireValues = false;

					attributeTable[objectNameParsed["value"]] = {
						"class":triples[triple]["subject"],
						"identification":attributeResolved,
						"alias":alias,
						"requireValues":requireValues,
						"seen":false
					};
					attributeTableAdded.push(objectNameParsed["value"]);
				}
			}
			//object property
			else {
				if (typeof triples[triple]["predicate"] == "string"){
					
					var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]);
					if (bgptype == "optionalLink") linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]);

					console.log(bgptype, triples[triple]["predicate"], linkResolved);

					var linkType = "REQUIRED";
					if(bgptype == "optional" || bgptype == "optionalLink") linkType = "OPTIONAL";
					
					if(unionSubject != null && triples[triple]["subject"] == unionSubject){
						var link = {
							"linkIdentification":linkResolved,
							"object":triples[triple]["object"],
							"subject":"[ + ]",
							"isVisited":false,
							"linkType":linkType,
							"localName":linkResolved["localName"],
							"isSubQuery":false,
							"isGlobalSubQuery":false,
						}
						linkTable.push(link);
						linkTableAdded.push(link);
					}
					else{
						var link = {
							"linkIdentification":linkResolved,
							"object":triples[triple]["object"],
							"subject":triples[triple]["subject"],
							"isVisited":false,
							"linkType":linkType,
							"localName":linkResolved["localName"],
							"isSubQuery":false,
							"isGlobalSubQuery":false,
						}
						linkTable.push(link);
						linkTableAdded.push(link);
					}
				} else if(typeof triples[triple]["predicate"] == "object"){
					//property path
					if(typeof triples[triple]["predicate"]["type"] !== "undefined" && triples[triple]["predicate"]["type"] == "path"){
						var alias = "";
						var pathText = [];
						if(triples[triple]["predicate"]["pathType"] == "/"){
							
							var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
							if(typeof last_element === "object" && typeof last_element["items"][0] !== "undefined")  last_element = last_element["items"][0];
							//link
							if(schema.resolveLinkByName(last_element) != null){
								for(var item in triples[triple]["predicate"]["items"]){
									if(typeof triples[triple]["predicate"]["items"][item] == "string"){
										var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]);
										pathText.push(buildPathElement(linkResolved));
									} 
									// ^
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "^"){
										var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]["items"][0]);
										pathText.push("^" + buildPathElement(linkResolved));
									}
								}
								var linkType = "REQUIRED";
								if(bgptype == "optional") linkType = "OPTIONAL";

								var linkResolved = schema.resolveLinkByName(last_element);
								linkResolved["localName"] = pathText.join(".");
								var link = {
									"linkIdentification":linkResolved,
									"object":triples[triple]["object"],
									"subject":triples[triple]["subject"],
									"isVisited":false,
									"linkType":linkType,
									"localName":pathText.join("."),
									"isSubQuery":false,
									"isGlobalSubQuery":false,
								}
								linkTable.push(link);
								linkTableAdded.push(link);
							}
							// attribute
							else if(schema.resolveAttributeByName(null, last_element) != null){
								for(var item in triples[triple]["predicate"]["items"]){
									if(typeof triples[triple]["predicate"]["items"][item] == "string"){
										
										if(item != triples[triple]["predicate"]["items"].length - 1){
											var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]);
											pathText.push(buildPathElement(linkResolved));
										}
										//last element
										else {
											var linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]);
											pathText.push(buildPathElement(linkResolved));
										}
										
									} 
									// ^
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "^"){
										if(item != triples[triple]["predicate"]["items"].length - 1){
											linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]["items"][0]);
											pathText.push("^" + buildPathElement(linkResolved));
										}
										//last element
										else {
											linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]["items"][0]);
											pathText.push("^" + buildPathElement(linkResolved));
										}
									}
								}
								
								var attrResolved = schema.resolveAttributeByName(null, last_element);
								
								var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
								//id identification.localName not equeals to subject - use alias
								if(attrResolved["localName"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
								
								var requireValues = true;
								if(bgptype == "optional") requireValues = false;
								
								var attributeInfo = {
									"class":triples[triple]["subject"],
									"identification":attrResolved,
									"alias":alias,
									"requireValues":requireValues,
									"exp":pathText.join("."),
									"seen":false
								};
								attributeTable[objectNameParsed["value"]] = attributeInfo;
								attributeTableAdded.push(objectNameParsed["value"]);
							}
						
							
						} else if(triples[triple]["predicate"]["pathType"] == "^"){
							
							var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
							var pahtString = "";
							for(var item in triples[triple]["predicate"]["items"]){
								pahtString = pahtString + triples[triple]["predicate"]["items"][item];
							}
							var attrResolved
							//link
							if(schema.resolveLinkByName(last_element) != null){
								attrResolved = schema.resolveLinkByName(last_element);
							} else if(schema.resolveAttributeByName(null, last_element) != null){
								attrResolved = schema.resolveAttributeByName(null, last_element);
							}
							
							var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
							//id identification.localName not equeals to subject - use alias
							if(attrResolved["localName"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
							
							var requireValues = true;
							if(bgptype == "optional") requireValues = false;

							var attributeInfo = {
								"class":triples[triple]["subject"],
								"identification":attrResolved,
								"alias":alias,
								"requireValues":requireValues,
								"exp":"^" + buildPathElement(attrResolved),
								"seen":false
							};
							
							//console.log("AAAAAAAAAAAAAAAAAAA", triples[triple]["object"], objectNameParsed);
								
							attributeTable[objectNameParsed["value"]] = attributeInfo;
							attributeTableAdded.push(objectNameParsed["value"]);
						}
						
					}
				}
				
				
			}
		}
	}

	return {classesTable:classesTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, attributeTableAdded:attributeTableAdded, filterTable:filterTable};
}

function generateTypeFilter(expression){
	var filterString = "";
	var filterVariables = [];
	if(expression["type"] == "operation"){
		//if is a relational expressin
		if(checkIfRelation(expression["operator"]) != -1){
			var arg1 = generateArgument(expression["args"][0]);
			var arg2 =  generateArgument(expression["args"][1]);

			filterString = arg1["value"] + " " + expression["operator"] + " " + arg2["value"];

			if(arg1["type"] == "varName") filterVariables.push(arg1["value"]);
			if(arg2["type"] == "varName") filterVariables.push(arg2["value"]);
		}
	}
	return {filterString:filterString, filterVariables:filterVariables};
}

function checkIfRelation(value){
	var relations = [ "=" , "!=" , "<>" , "<=" , ">=" ,"<" , ">"]
	return relations.indexOf(value);
}

function chechIfArithmetic(value){
	var arithmetics = [ "+" , "-" , "*" , "/"]
	return arithmetics.indexOf(value);
}

function checkIfOneArgunemtFunctuion(value){
	var functions = ["STR", "LANG", "DATATYPE", "IRI", "URI", "ABS", "CEIL", "FLOOR", "ROUND", "STRLEN",
	"UCASE", "LCASE", "ENCODE_FOR_URI", "YEAR", "MONTH", "DAY", "HOURS", "MINUTES", "SECONDS", "TIMEZONE", "TZ",
	"MD5", "SHA1", "SHA256", "SHA512", "isIRI", "isURI", "isLITERAL", "isNUMERIC", "dateTime", "date"]
	return functions.indexOf(value.toUpperCase());
}
function checkIfTwoArgunemtFunctuion(value){
	var functions = ["LANGMATCHES" , "CONTAINS", "STRSTARTS", "STRENDS", "STRBEFORE", "STRAFTER", "STRLANG", "STRDT", "sameTerm"]
	return functions.indexOf(value.toUpperCase());
}

function generateArgument(argument){
	if(typeof argument == 'string'){
		return  vq_visual_grammar.parse(argument);
	}
}

function addAttributeToClass(classesTable, identification){
	if(typeof classesTable["fields"] === 'undefined')classesTable["fields"] = [];
	classesTable["fields"].push(identification);
	return classesTable;
}

function addAggrigateToClass(classesTable, identification){
	if(typeof classesTable["aggregations"] === 'undefined')classesTable["aggregations"] = [];
	classesTable["aggregations"].push(identification);
	return classesTable;
}

function generateClassCtructure(clazz, className, classesTable, linkTable){

	for(var linkName in linkTable){
		
		if(linkTable[linkName]["subject"] == className && linkTable[linkName]["isVisited"] == false){
			linkTable[linkName]["isVisited"] = true;
			clazz["children"] = addChildren(clazz);
			clazz["children"].push(addClass(classesTable[linkTable[linkName]["object"]], linkTable[linkName], linkTable[linkName]["object"], linkTable[linkName]["linkIdentification"], false, classesTable, linkTable));
		} else if(linkTable[linkName]["object"] == className && linkTable[linkName]["isVisited"] == false){
			linkTable[linkName]["isVisited"] = true;
			clazz["children"] = addChildren(clazz);
			clazz["children"].push(addClass(classesTable[linkTable[linkName]["subject"]],linkTable[linkName], linkTable[linkName]["subject"],  linkTable[linkName]["linkIdentification"], true, classesTable, linkTable));
		}

	}
	return clazz;
}

function addChildren(clazz){
	if(typeof clazz["children"] === 'undefined') clazz["children"] = [];
	return clazz["children"];
}

function addClass(childrenClass, linkInformation, childrenClassName, linkIdentification, isInverse, classesTable, linkTable){

	childrenClass["isInverse"] = isInverse;
	childrenClass["linkIdentification"] = linkInformation["linkIdentification"];
	childrenClass["linkType"] = linkInformation["linkType"];
	childrenClass["localName"] = linkInformation["localName"];
	childrenClass["isSubQuery"] = linkInformation["isSubQuery"];
	childrenClass["isGlobalSubQuery"] = linkInformation["isGlobalSubQuery"];;
	childrenClass = generateClassCtructure(childrenClass, childrenClassName, classesTable, linkTable);

	return childrenClass;
}

function getStartClass(classesTable) {
  for (var clazz in classesTable){
    return {"name":clazz, "class":classesTable[clazz]};
  }
}

function getAllVariablesInQuery(expression, schema){
	var variableTable = [];
	for(var key in expression){
		if(typeof expression[key] === 'object'){
			if(key == 'variables'){
				var variables = expression[key];
				for(var variable in variables){
					if(typeof variables[variable] === 'string' && schema.resolveClassByName(vq_visual_grammar.parse(variables[variable])["value"]) == null){
						variableTable[variables[variable]] = true;
					} else if(typeof variables[variable] === 'object'){
						variableTable[variables[variable]["variable"]] = true;
					}
				}
			}
			var temp = getAllVariablesInQuery(expression[key], schema);
			for(var t in temp){
				variableTable[t] = true;
			}
		}
	}
	return variableTable;
}

function buildPathElement(pathElement){
	if(pathElement["Prefix"] == "") return pathElement["localName"];
	else return pathElement["Prefix"]+":"+pathElement["localName"];
}

function visualizeQuery(clazz, parentClass){

	//node type
	var nodeType = "condition";
	if(parentClass == null) nodeType = "query";

	//instanceAlias
	var instanceAlias = clazz["instanceAlias"];

	//name
	// var className = "(no_class)";
	var className = "";
	if(clazz["identification"] != null) className = clazz["identification"]["short_name"];


	if(clazz["isVariable"] == true) {
		className = clazz["variableName"]; //false
	}

	if(clazz["isUnit"] == true) {
		className = "[ ]"; //false
	}

	if(clazz["isUnion"] == true) {
		className = "[ + ]"; //fasle
	}

	var newPosition = {x:x,y:y,width:width,height:height};
	if(parentClass != null){
		var d = 30; //distance between boxes
		var oldPosition = parentClass.getCoordinates(); //Old class coordinates and size
		newPosition = parentClass.getNewLocation(d); //New class coordinates and size
	}
	
	Create_VQ_Element(function(classBox) {
		if(className != null && className != "") classBox.setName(className);
		classBox.setClassStyle(nodeType);
		if(instanceAlias != null) classBox.setInstanceAlias(instanceAlias);

		// console.log("nodeType = ", nodeType);
		// console.log("instanceAlias = ", instanceAlias);
		// console.log("className = ", className);

		//attributes
		//console.log("ATTRIBUTES");
		_.each(clazz["fields"],function(field) {

			var alias = field["alias"];
			var expression = field["exp"];
			var requireValues = field["requireValues"];
			var isInternal = field["isInternal"];
			var groupValues = field["groupValues"]; // false

			//add attribute to class
			classBox.addField(expression,alias,requireValues,groupValues,isInternal);

			// console.log("  field = ", field);
			// console.log("  alias = ", alias);
			// console.log("  expression = ", expression);
			// console.log("  requireValues = ", requireValues);
			// console.log("  isInternal = ", isInternal);
			// console.log("  groupValues = ", groupValues);
		})

		// console.log("AGGREGATES");
		//aggregations
		_.each(clazz["aggregations"],function(field) {
			var alias = field["alias"];
			var expression = field["exp"];

			//add aggregation to class
			classBox.addAggregateField(expression, alias);
			// console.log("  alias = ", alias);
			// console.log("  expression = ", expression);

		})


		// console.log("CONDITIONS");
		//conditions
		_.each(clazz["conditions"],function(condition) {
			var expression = condition;

			//add condition to class
			classBox.addCondition(expression);
			// console.log("  expression = ", expression);

		})

		//orderBy
		// console.log("ORDER BY");
		_.each(clazz["orderings"],function(order) {
			var expression = order["exp"];
			var isDescending = order["isDescending"];

			//add order to class
			classBox.addOrdering(expression, isDescending);

			

			// console.log("  expression = ", expression);
			// console.log("  isDescending = ", isDescending);

		})

		//distinct
		var distinct = clazz["distinct"];
		classBox.setDistinct(distinct);
		// console.log("distinct = ", distinct);

		//limit
		var limit = clazz["limit"];
		classBox.setLimit(limit);
		// console.log("limit = ", limit);

		//offset
		var offset = clazz["offset"];
		classBox.setOffset(offset);
		// console.log("offset = ", offset);

		//full SPARQL
		var fullSPARQL = clazz["fullSPARQL"];
		classBox.setFullSPARQL(fullSPARQL);
		// console.log("fullSPARQL = ", fullSPARQL);

		//link
		if(parentClass != null){
			var linkName = "++";
			if(typeof clazz["linkIdentification"] !== 'undefined') linkName = clazz["linkIdentification"]["short_name"];
			// REQUIRED, NOT, OPTIONAL
			var linkType  = clazz["linkType"];

			// PLAIN, SUBQUERY, GLOBAL_SUBQUERY, CONDITION
			var linkQueryType = "PLAIN";

			var isSubQuery = clazz["isSubQuery"];
			if(isSubQuery == true) linkQueryType = "SUBQUERY";
			var isGlobalSubQuery = clazz["isGlobalSubQuery"];
			if(isGlobalSubQuery == true) linkQueryType = "GLOBAL_SUBQUERY";

			var isInverse = clazz["isInverse"];


			// console.log("  linkName = ", linkName);
			// console.log("  linkType = ", linkType);
			// console.log("  isSubQuery = ", isSubQuery);
			// console.log("  isGlobalSubQuery = ", isGlobalSubQuery);
			// console.log("  isInverse = ", isInverse);


			
			//loc = newPosition;
            //Link Coordinates
            var coordX = newPosition.x + Math.round(newPosition.width/2);
            var coordY = oldPosition.y + oldPosition.height;
            var locLink = [];

			// var points = [x+50, y+100, x+50, y+height];
			if(isInverse != true){
				locLink = [coordX, coordY, coordX, newPosition.y]; 
				Create_VQ_Element(function(linkLine) {
					linkLine.setName(linkName);
					linkLine.setLinkType(linkType);
					linkLine.setNestingType(linkQueryType);
				}, locLink, true, parentClass, classBox);
			} else {
				locLink = [coordX, newPosition.y, coordX, coordY];
				Create_VQ_Element(function(linkLine) {
					linkLine.setName(linkName);
					linkLine.setLinkType(linkType);
					linkLine.setNestingType(linkQueryType);
				}, locLink, true, classBox, parentClass);
			}
		}
		//subClasses
		// console.log("SUB CLASSES");
		_.each(clazz["children"],function(subclazz) {
			y = y + 100;
			visualizeQuery(subclazz, classBox);

		})

		//conditionLinks
		// console.log("CONDITION LINKS");
		_.each(clazz["conditionLinks"],function(condLink) {
			var linkName = condLink["identification"]["localName"];

			var isNot = condLink["isNot"];

			var isInverse = condLink["isInverse"];

			// console.log("  linkName = ", linkName);
			// console.log("  isNot = ", isNot);
			// console.log("  isInverse = ", isInverse);
			//TODO find second class
			//TODO create condition link

		})

		// console.log(" ");
		// console.log(" ");
	}, newPosition);

}

function generateInstanceAlias(schema, uri){
	var splittedUri = splitURI(uri);
	if(splittedUri == null) return uri;
	
	var prefixes = schema.getPrefixes()
	for(var key in prefixes){
		if(prefixes[key][1] == splittedUri.namespace) return prefixes[key][0]+":"+splittedUri.name;
	}
	
	return uri;
}

function splitURI(uri){
	if(uri.lastIndexOf("#") != -1){
		return {namespace:uri.substring(0, uri.lastIndexOf("#")+1), name:uri.substring(uri.lastIndexOf("#")+1)}
	} else if (uri.lastIndexOf("/") != -1){
		return {namespace:uri.substring(0, uri.lastIndexOf("/")+1), name:uri.substring(uri.lastIndexOf("/")+1)}
	}
	return null;
}
