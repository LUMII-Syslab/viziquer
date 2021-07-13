// meteor npm install sparqljs

var x = 10;
var y = 10;
var width = 150;
var height = 100;
var counter = 0;
var whereTriplesVaribles = [];

Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

  generateVisualQuery: function(text, xx, yy, queryId, queryQuestion){
	   // Utilities.callMeteorMethod("parseExpressionForCompletions", text);
	  Utilities.callMeteorMethod("parseSPARQLText", text, function(parsedQuery) {
		whereTriplesVaribles = [];
		x = xx;
		y = yy;
		counter = 0;
		//console.log(JSON.stringify(parsedQuery, 0, 2));
		var schema = new VQ_Schema();
		
		// Get all variables (except class names) from a query SELECT statements, including subqueries.
		var variableList = getAllVariablesInQuery(parsedQuery, schema, []);
		
		// console.log("variableList", variableList);
		whereTriplesVaribles = getWhereTriplesVaribles(parsedQuery["where"]);
		// Generate ViziQuer query abstract syntax tables
		var abstractTable = generateAbstractTable(parsedQuery, [], variableList, []);
		abstractTable["linkTable"] = removeDuplicateLinks(abstractTable["linkTable"]);
		
		// console.log(JSON.stringify(abstractTable["classesTable"], 0, 2));
		console.log(abstractTable);
		
		var classesTable = abstractTable["classesTable"];
		// /*
		
//		console.log("whereTriplesVaribles", whereTriplesVaribles)
		// Decide which class is a query start class
		
		var tempGetStartClass = getStartClass(classesTable, abstractTable["linkTable"]);
		var startClass = tempGetStartClass["startClass"];
		classesTable = tempGetStartClass["classesTable"];
		// console.log("startClass", startClass);
		
		var visitedClasses = [];
		for(var clazz in classesTable){
			visitedClasses[clazz] = false;
		}
		visitedClasses[ startClass["name"]] = true;
		// Generate tree ViziQuer query structure, from class and link tables 
		classesTable = generateClassCtructure(startClass["class"], startClass["name"], classesTable, abstractTable["linkTable"], whereTriplesVaribles, visitedClasses);

		classesTable["orderings"] = abstractTable["orderTable"];
		if(typeof classesTable["groupings"] !== "undefined") classesTable["groupings"] = classesTable["groupings"].concat( abstractTable["groupTable"]);
		else classesTable["groupings"] = abstractTable["groupTable"];
		if(typeof parsedQuery["limit"] !== 'undefined') classesTable["limit"] =  parsedQuery["limit"];
		if(typeof parsedQuery["offset"] !== 'undefined') classesTable["offset"] =  parsedQuery["offset"];
		if(typeof parsedQuery["distinct"] !== 'undefined') classesTable["distinct"] =  parsedQuery["distinct"];

		
		// console.log("whereTriplesVaribles", whereTriplesVaribles);
		// Visualize query based on tree structure
		
		visualizeQuery(classesTable, null, queryId, queryQuestion);
			// */	
		// console.log("classesTable", classesTable, abstractTable);
		

	  });
  },
});

// Generate ViziQuer query abstract syntax tables
function generateAbstractTable(parsedQuery, allClasses, variableList, parentNodeList){
	// x = 200;
	// y = 10;
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
	var groupTable = [];
	
	// console.log("allClasses", allClasses);
	// console.log("variableList", variableList);
	// console.log("classesTable", classesTable);
	// console.log("filterTable", filterTable);
	// console.log("attributeTable", attributeTable);
	// console.log("linkTable", linkTable);
	// console.log("orderTable", orderTable);
	// console.log("bindTable", bindTable);

	//where
	var where = parsedQuery["where"];
	
	// Create a list of nodes in a current query scope 
	var tempN = collectNodeList(where);
	var nodeList = tempN["nodeList"];
	
	var plainVariables = getWhereTriplesPlainVaribles(where);
	
	// For every structure in query WHERE part, create abstract tables’ instances. First triples, then the rest.
	for(var key in where){
		if(typeof where[key]["type"] !== "undefined" && where[key]["type"] == "bgp"){
			var wherePartTemp = parseSPARQLjsStructureWhere(where[key], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, null, bindTable);
			classesTable = wherePartTemp["classesTable"];
			attributeTable = wherePartTemp["attributeTable"];
			linkTable = wherePartTemp["linkTable"];
			filterTable = wherePartTemp["filterTable"];
			bindTable = wherePartTemp["bindTable"];
		}
	}
	for(var key in where){
		if(typeof where[key]["type"] === "undefined" || (typeof where[key]["type"] !== "undefined" && where[key]["type"] !== "bgp")){
			var wherePartTemp = parseSPARQLjsStructureWhere(where[key], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, null, bindTable);
			classesTable = wherePartTemp["classesTable"];
			attributeTable = wherePartTemp["attributeTable"];
			linkTable = wherePartTemp["linkTable"];
			filterTable = wherePartTemp["filterTable"];
			bindTable = wherePartTemp["bindTable"];
		}
	}
	
	// Connect equals classes 
	// !!!!!!!!!!!!!!!!!!!!!!!!
	// undo
	linkTable = connectNotConnectedClasses(classesTable, linkTable, nodeList);
	// !!!!!!!!!!!!!!!!!!!!!!!!
	// linkTable = connectEqualClasses(nodeList, classesTable, linkTable);
	//console.log("linkTable", linkTable);
	
	//order
	var order = parsedQuery["order"];
	for(var key in order){
		if(typeof order[key]["expression"] === "string"){
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
		} else {
			var isDescending = false;
			if(typeof order[key]["descending"] !== 'undefined') isDescending = order[key]["descending"];
			

			
			var orderTemp = parseSPARQLjsStructureWhere(order[key]["expression"], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, null, bindTable);
			if(orderTemp["viziQuerExpr"]["exprString"] != ""){
				orderTable.push({
					"exp":orderTemp["viziQuerExpr"]["exprString"],
					"isDescending":isDescending
				})
			} else if(order[key]["expression"]["type"] == "aggregate"){	
				var distinct = "";
				if(order[key]["expression"]["distinct"] == true)distinct = "DISTINCT ";
				
				var aggregateExpression;
				
				//agregate on expression
				if(typeof order[key]["expression"]["expression"] == "object"){
					var temp = parseSPARQLjsStructureWhere(order[key]["expression"]["expression"], plainVariables, nodeList, [], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, null, bindTable);
					aggregateExpression = temp.viziQuerExpr.exprString;
					aggregationExp = order[key]["expression"]["aggregation"] + "(" +distinct + aggregateExpression +")";
					orderTable.push({
						"exp":aggregationExp,
						"isDescending":isDescending
					})
				} else {
					aggregateExpression = vq_visual_grammar.parse(order[key]["expression"]["expression"])["value"];
					var aggregationExp = order[key]["expression"]["aggregation"] + "(" +distinct + aggregateExpression +")";
					orderTable.push({
						"exp":aggregationExp,
						"isDescending":isDescending
					}) 
					
				}
				
			}
		}
	}
	
	//select
	var variables = parsedQuery["variables"];
	var starInSelect = false;
	for(var key in variables){
		if(typeof variables[key] === 'string' && variables[key] == "*"){
			starInSelect = true;
			break;
			
		}
	}
	if(starInSelect == true){
		variables = variables.concat(tempN["selectStarList"]);
		variables = variables.filter(function (el, i, arr) {
			return arr.indexOf(el) === i && el !== "*";
		});
	}
	
	var aggregationInSelect = false;
	
	for(var key in variables){
		if(typeof variables[key] === 'string'){
	
			var isVariable = false;
			for(var link in linkTable){
				if(typeof linkTable[link]["isVariable"] !== "undefined" && linkTable[link]["isVariable"] == true && (linkTable[link]["linkIdentification"]["short_name"].substring(1) == variables[key] || starInSelect == true)){
					isVariable = true;
					if(linkTable[link]["linkIdentification"]["short_name"].startsWith("??")){
						linkTable[link]["linkIdentification"]["localName"] = linkTable[link]["linkIdentification"]["localName"].substring(1);
						linkTable[link]["linkIdentification"]["short_name"] = linkTable[link]["linkIdentification"]["short_name"].substring(1);
					}
					break;
				}
			}
			
			//check kind (Class, reference or Property)
			//class
						
			var classes = findByVariableName(classesTable, variables[key]);
			// var classes2 = findByShortName(classesTable, variables[key]);
			if(Object.keys(classes).length > 0){

				//add class as attribute
				var parsedClass = vq_visual_grammar.parse(variables[key])["value"]
				var attributeInfo = {
					"alias":"",
					"identification":schema.resolveClassByName(parsedClass),
					"exp":"(select this)"
				}
				
				for(var clazz in classes){
					classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
				}
			} else if (Object.keys(findByShortName(classesTable, variables[key])).length > 0){
				
			}
			//reference
			else if(typeof variableList[variables[key]] !== 'undefined' && typeof attributeTable[variables[key].substring(1)] === 'undefined'){	
				
				var parsedAttribute = vq_visual_grammar.parse(variables[key])["value"];
	
				if(typeof bindTable[parsedAttribute] === 'undefined'){
					//var isVariable = false;
					//for(var link in linkTable){
					//	if(typeof linkTable[link]["isVariable"] !== "undefined" && linkTable[link]["isVariable"] == true && (linkTable[link]["linkIdentification"]["short_name"].substring(1) == variables[key] || starInSelect == true)){
					//		isVariable = true;
					//		linkTable[link]["linkIdentification"]["localName"] = linkTable[link]["linkIdentification"]["localName"].substring(1);
					//		linkTable[link]["linkIdentification"]["short_name"] = linkTable[link]["linkIdentification"]["short_name"].substring(1);
					//		break;
					//	}
					//}
					if(isVariable == false && variableList[variables[key]] != 1){
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
					} else if(variableList[variables[key]] == 1) {
						Interpreter.showErrorMsg("Unbound variable '" + variables[key] + "' excluded from the visual presentation", -3);
					}
				} else if(variableList["?"+parsedAttribute] != "seen") {
	
					var attributeInfo = {
						"alias":bindTable[parsedAttribute]["alias"],
						"identification":null,
						"requireValues":false,
						"isInternal":false,
						"groupValues":false,
						"exp":bindTable[parsedAttribute]["exp"]
					}

					for (var clazz in classesTable){
						classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
						break;
					}
				}
			}

			//property
			if(typeof attributeTable[vq_visual_grammar.parse(variables[key])["value"]] !== 'undefined') {

				// add attribute
				var parsedAttribute = vq_visual_grammar.parse(variables[key])["value"];	
				var attributes = findByVariableName(attributeTable, parsedAttribute);
				
				for(var attribute in attributes){
					var attributeInfoTemp = attributeTable[attribute];
					var exp = attributeInfoTemp["identification"]["short_name"];
					if(typeof attributeInfoTemp.exp !== 'undefined') exp = attributeInfoTemp.exp;
					
					var attrAlias = attributeInfoTemp["alias"];
					if(attrAlias == "" && typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["identification"]["short_name"].indexOf(":")!= -1) attrAlias = attributeInfoTemp["identification"]["localName"];
					
					var attributeInfo = {
						"alias":attrAlias,
						"identification":attributeInfoTemp["identification"],
						"requireValues":attributeInfoTemp["requireValues"],
						"isInternal":false,
						"groupValues":false,
						"exp":exp
					}
					
					if(attributeTable[attribute]["class"] != attribute){
					classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
					attributeTable[attribute]["seen"] = true;}
				}
			}
			
		} else if(typeof variables[key] === 'object'){
			
			var alias = vq_visual_grammar.parse(variables[key]["variable"])["value"];
			var expression = variables[key]["expression"];
			//aggregation
			if(expression["type"] == "aggregate"){
				var distinct = "";
				if(expression["distinct"] == true)distinct = "DISTINCT ";
				
				var aggregateExpression;
				
				//agregate on expression
				if(typeof expression["expression"] == "object"){
					var temp = parseSPARQLjsStructureWhere(expression["expression"], plainVariables, nodeList, [], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, null, bindTable);
					aggregateExpression = temp.viziQuerExpr.exprString;
					aggregationExp = expression["aggregation"] + "(" +distinct + aggregateExpression +")";
						
					var aggregateInfo = {
						"exp":aggregationExp,
						"alias":alias
					}
					var aggrClass;
					for(var attr in temp["viziQuerExpr"]["exprVariables"]){
						var attribute = temp["viziQuerExpr"]["exprVariables"][attr];
						var inSameClass = false;
						if(attr == 0){
							var attributes = findByVariableName(attributeTable, attribute);
							
							for(var a in attributes){
								for (var clazz in classesTable){
									if(clazz == attributeTable[a]["class"])inSameClass = true;
									classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
									break;
								}
							}
						}
						var attributes = findByVariableName(attributeTable, attribute);
						for(var attribute in attributes){
							if(((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["localName"]) || attributeTable[attribute]["alias"] == "") && inSameClass == true)attributeTable[attribute]["seen"] = true;
						}
					}
					
				} else {
					aggregateExpression = vq_visual_grammar.parse(expression["expression"])["value"];
					var aggregationExp = expression["aggregation"] + "(" +distinct + aggregateExpression +")";
					
					//aggregate on class
					var classes = findByVariableName(classesTable, expression["expression"]);

					if(Object.keys(classes).length == 1){
						if(expression["aggregation"].toLowerCase() == "count") {
							if(distinct == "") aggregationExp = "count(.)";
							else  aggregationExp = "count_distinct(.)";
						}
						var aggregateInfo = {
							"exp":aggregationExp,
							"alias":alias
						}
						for (var clazz in classes){
							classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
							break;
						}
					} else if(Object.keys(classes).length > 1){
						if(expression["aggregation"].toLowerCase() == "count") {
							if(distinct == "") aggregationExp = "count(.)";
							else  aggregationExp = "count_distinct(.)";
						}
						var aggregateInfo = {
							"exp":aggregationExp,
							"alias":alias
						}
						for (var clazz in classesTable){
							classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);

							break;
						}
					}
					//aggregate on attribute
					else if(Object.keys(findByVariableName(attributeTable, aggregateExpression)).length > 0) {
						var attributes = findByVariableName(attributeTable, aggregateExpression);

						for(var attribute in attributes){
							if(attributeTable[attribute]["alias"] == "" && typeof attributeTable[attribute]["exp"] !== 'undefined') aggregationExp = expression["aggregation"] + "(" +distinct + attributeTable[attribute]["exp"] +")";
							
							var aggregateInfo = {
								"exp":aggregationExp,
								"alias":alias
							}

							var inSameClass = false;
							for (var clazz in classesTable){
								classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);

								if(clazz == attributeTable[attribute]["class"])inSameClass = true;
								break;
							}
							if(((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["localName"]) || attributeTable[attribute]["alias"] == "" ) && inSameClass == true)attributeTable[attribute]["seen"] = true;
						}
					} else {
						var aggregateInfo = {
								"exp":aggregationExp,
								"alias":alias
							}

						for (var clazz in classesTable){
							classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
							break;
						}
					}
				}
			}
			//operation
			else if(expression["type"] == "operation"){
			
				var temp = parseSPARQLjsStructureWhere(expression, plainVariables, nodeList, [], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, null, bindTable);

				var attributeInfo = {
					"alias":vq_visual_grammar.parse(variables[key]["variable"])["value"],
					"identification":null,
					"requireValues":false,
					"isInternal":false,
					"groupValues":false,
					"exp":temp["viziQuerExpr"]["exprString"]
				} 
				
				for(var attr in temp["viziQuerExpr"]["exprVariables"]){
					var attribute = temp["viziQuerExpr"]["exprVariables"][attr];
					var inSameClass = false;
					if(attr == 0){
						var attributes = findByVariableName(attributeTable, attribute);
							
						for(var a in attributes){
							for (var clazz in classesTable){
								if(clazz == attributeTable[a]["class"])inSameClass = true;
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								break;
							}
						}
						if(Object.keys(attributes.length == 0)){
							for (var clazz in classesTable){
								if(clazz == attribute)inSameClass = true;
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								break;
							}
						}
					}
					var attributes = findByVariableName(attributeTable, attribute);
					for(var attribute in attributes){
						if(((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["localName"]) || attributeTable[attribute]["alias"] == "") && inSameClass == true)attributeTable[attribute]["seen"] = true;
					}
				}
			}
			//functionCall
			else if(expression["type"] == "functionCall"){
				// var temp = parseSPARQLjsStructureWhere(expression, plainVariables, nodeList, [], classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, null, bindTable);
				// console.log("fffffffffff", temp, expression);
				
				var functionName = "<"+expression["function"]+">"
				// var ignoreFunction = false;
				// if(where["function"] == "http://www.w3.org/2001/XMLSchema#dateTime" || where["function"] == "http://www.w3.org/2001/XMLSchema#date" || where["function"] == "http://www.w3.org/2001/XMLSchema#decimal") ignoreFunction = true;
				//if(where["function"] == "http://www.w3.org/2001/XMLSchema#decimal") functionName = "xsd:decimal";
				
				
				var schema = new VQ_Schema();
				var shortFunction = generateInstanceAlias(schema, expression["function"]);
				if(shortFunction != expression["function"]) functionName = shortFunction;
				var viziQuerExpr = {
					"exprString" : "",
					"exprVariables" : []
				};
				// if(ignoreFunction == false)
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + functionName + "(";
				var args = [];
					
				for(var arg in expression["args"]){
					if(typeof expression["args"][arg] == 'string') {
						var arg1 = generateArgument(expression["args"][arg]);
						if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
						args.push(arg1["value"]);
					}
					else if(typeof expression["args"][arg] == 'object'){
						var temp = parseSPARQLjsStructureWhere(expression["args"][arg], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						bindTable = temp["bindTable"];
						args.push(temp["viziQuerExpr"]["exprString"]);
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					}
				}
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ");
				// if(ignoreFunction == false) 
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + ")";
				
				var attributeInfo = {
					"alias":vq_visual_grammar.parse(variables[key]["variable"])["value"],
					"identification":null,
					"requireValues":false,
					"isInternal":false,
					"groupValues":false,
					"exp":viziQuerExpr["exprString"]
				} 
				
				for(var attr in viziQuerExpr["exprVariables"]){
					var attribute = viziQuerExpr["exprVariables"][attr];
					var inSameClass = false;
					if(attr == 0){
						var attributes = findByVariableName(attributeTable, attribute);
							
						for(var a in attributes){
							for (var clazz in classesTable){
								if(clazz == attributeTable[a]["class"])inSameClass = true;
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								break;
							}
						}
						if(Object.keys(attributes.length == 0)){
							for (var clazz in classesTable){
								if(clazz == attribute)inSameClass = true;
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								break;
							}
						}
					}
					var attributes = findByVariableName(attributeTable, attribute);
					for(var attribute in attributes){
						if(((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["localName"]) || attributeTable[attribute]["alias"] == "") && inSameClass == true)attributeTable[attribute]["seen"] = true;
					}
				}
			}
		}
	}
	// console.log("attributeTable",attributeTable)

	//internal attributes
	for(var attribute in attributeTable){
		if(attributeTable[attribute]["seen"] != true){
			var attributeInfoTemp = attributeTable[attribute];
			
			var found = false;
			if(typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["identification"]["maxCardinality"] == 1 && attributeInfoTemp["alias"] != ""){
				for(var condition in classesTable[attributeTable[attribute]["class"]]["conditions"]){
					if(classesTable[attributeTable[attribute]["class"]]["conditions"][condition]["exp"].includes(attributeInfoTemp["alias"])) found = true;
					if(typeof attributeInfoTemp["exp"] !== 'undefined') classesTable[attributeTable[attribute]["class"]]["conditions"][condition]["exp"] = classesTable[attributeTable[attribute]["class"]]["conditions"][condition]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["exp"]);
					else classesTable[attributeTable[attribute]["class"]]["conditions"][condition]["exp"] = classesTable[attributeTable[attribute]["class"]]["conditions"][condition]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["identification"]["short_name"]);
				}
				for(var aggregation in classesTable[attributeTable[attribute]["class"]]["aggregations"]){
					var indexFirst = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].indexOf("(");
					var indexLast = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].lastIndexOf(")");
					
					if(classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].includes(attributeInfoTemp["alias"])) found = true;
					if(typeof attributeInfoTemp["exp"] !== 'undefined') {
						// classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"] = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["exp"])
						classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"] = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].substring(0, indexFirst+1) +
						classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].substring(indexFirst+1, indexLast).replace(attributeInfoTemp["alias"], attributeInfoTemp["exp"]) + ")";
					}
					else {
						// classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"] = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["identification"]["short_name"]);
						classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"] = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].substring(0, indexFirst+1) +
						classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].substring(indexFirst+1, indexLast).replace(attributeInfoTemp["alias"], attributeInfoTemp["identification"]["short_name"]) + ")";
					
					}
				}
			}
			if(found == false){
				var exp = attributeInfoTemp["exp"];
				if(typeof exp === 'undefined') exp = attributeInfoTemp["identification"]["short_name"];
				var attributeInfo = {
						"alias":attributeInfoTemp["alias"],
						"identification":attributeInfoTemp["identification"],
						"requireValues":attributeInfoTemp["requireValues"],
						"isInternal":true,
						"groupValues":false,
						"exp":exp
				} 
				classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
			}
		}
	}
	
	//group
	var group = parsedQuery["group"];
	for(var key in group){
		var exp = vq_visual_grammar.parse(group[key]["expression"])["value"];
		var classes = findByVariableName(classesTable, group[key]["expression"]);
		if(Object.keys(classes).length > 0){
			for (var clazz in classes){
				classesTable[clazz]["groupByThis"] = true;
			}
		} 
		else {
			var inSelect = false;
			for(var k in variables){
				if(typeof variables[k] === 'string' && variables[k] == group[key]["expression"]){
					inSelect = true;
				}
			}
			if(inSelect == false) groupTable.push(exp); 
		}

	}

	return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, orderTable:orderTable, groupTable:groupTable, nodeList:nodeList};
}

function connectNotConnectedClasses(classesTable, linkTable, nodeList){
	for(clazz in classesTable){
		var clazzFound = false;
		for(link in linkTable){
			if(linkTable[link]["subject"] == clazz || linkTable[link]["object"] == clazz) {
				clazzFound = true;
				break;
			}
		}
		if(clazzFound == false){
			var equalClasses = connectEqualClasses(classesTable[clazz]["variableName"], nodeList, linkTable);
	
			if(equalClasses["linkAdded"] == true) linkTable = equalClasses["linkTable"];
			else{
				for(var clazz2 in classesTable){
					if(clazz != clazz2){
						var link = {
						"linkIdentification":{localName: "++", short_name: "++"},
						"object":clazz,
						"subject":clazz2,
						"isVisited":false,
						"linkType":"REQUIRED",
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						}
						linkTable.push(link);
						break;
					}
				}
			}
		}
	}
	return linkTable;
}

function connectEqualClasses(node, nodeList, linkTable){
		var linkAdded = false;
		if(Object.keys(nodeList[node]["uses"].length > 1)){
			var linkNodes = [];
			for(var use in nodeList[node]["uses"]){
				var nodeInLinkTable = false;
				for(var link in linkTable){
					if(linkTable[link]["subject"] == nodeList[node]["uses"][use] || linkTable[link]["object"] == nodeList[node]["uses"][use]) {
						nodeInLinkTable = true;
						break;
					}
				}
				if(nodeInLinkTable == false) linkNodes.push(use);
			}
			if(linkNodes.length > 1) {
				linkAdded = true;
				var subject = linkNodes[0];
				for (i = 1; i < linkNodes.length; i++) {
					var link = {
						"linkIdentification":{localName: "==", short_name: "=="},
						"object":subject,
						"subject":linkNodes[i],
						"isVisited":false,
						"linkType":"REQUIRED",
						"isSubQuery":false,
						"isGlobalSubQuery":false,
					}
					linkTable.push(link);
				}
			}
		}
	return {"linkTable":linkTable, "linkAdded":linkAdded};
}

// function connectEqualClasses(nodeList, classesTable, linkTable){
	// for(var node in nodeList){
		// if(Object.keys(nodeList[node]["uses"].length > 1)){
			// var linkNodes = [];
			// for(var use in nodeList[node]["uses"]){
				// var nodeInLinkTable = false;
				// for(var link in linkTable){
					// if(linkTable[link]["subject"] == nodeList[node]["uses"][use] || linkTable[link]["object"] == nodeList[node]["uses"][use]) {
						// nodeInLinkTable = true;
						// break;
					// }
				// }
				// if(nodeInLinkTable == false) linkNodes.push(use);
			// }
			// if(linkNodes.length > 1) {
				// var subject = linkNodes[0];
				// for (i = 1; i < linkNodes.length; i++) {
					// var link = {
						// "linkIdentification":{localName: "==", short_name: "=="},
						// "object":subject,
						// "subject":linkNodes[i],
						// "isVisited":false,
						// "linkType":"REQUIRED",
						// "isSubQuery":false,
						// "isGlobalSubQuery":false,
					// }
					// linkTable.push(link);
				// }
			// }
		// }
	// }
	// return linkTable;
// }

function connectAllClasses(classesTable, linkTable, allClasses){
	
	if(Object.keys(classesTable.length > 1)){
		for(var clazz in classesTable){
			if(classesTable[clazz]["variableName"] != "?[ + ]" && typeof allClasses[clazz] === 'undefined'){
				
				var classNotConnected = true;
				for(var link in linkTable){
					if(linkTable[link]["object"] == clazz || linkTable[link]["subject"] == clazz){
						classNotConnected = false;
						break;
					}
				}
				if(classNotConnected == true){
					var classToConnect;
					for(var c in classesTable){
						if(c != clazz && classesTable[c]["variableName"] != "?[ + ]"){
							classToConnect = c;
							break;
						}
					}
					if(typeof classToConnect !== 'undefined'){
						var link = {
								"linkIdentification":{localName: "++", short_name: "++"},
								"object":clazz,
								"subject":classToConnect,
								"isVisited":false,
								"linkType":"REQUIRED",
								"isSubQuery":false,
								"isGlobalSubQuery":false,
						}
						linkTable.push(link);
					}
				}
			}
		}
	}
	return linkTable;
}

function parseSPARQLjsStructureWhere(where, plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression){
	
	var viziQuerExpr = {
		"exprString" : "",
		"exprVariables" : []
	};
	var linkTableAdded = [];
	var classTableAdded = [];
	var attributeTableAdded = [];

	//type=bgp
	if(where["type"] == "bgp"){
		var triples = where["triples"];
		var temp = generateTypebgp(triples, nodeList, parentNodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
		
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		linkTable = temp["linkTable"];
		filterTable = temp["filterTable"];
		nodeList = temp["nodeList"];
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
		var plainVariables = getWhereTriplesPlainVaribles(patterns);
		for(var pattern in patterns){
			if(typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] == "bgp"){
				var temp = parseSPARQLjsStructureWhere(patterns[pattern], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				classesTable = temp["classesTable"];
				attributeTable = temp["attributeTable"];
				filterTable = temp["filterTable"];
				linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
				classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
				attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
				bindTable = temp["bindTable"];
			}
		}
		
		for(var pattern in patterns){
			if(typeof patterns[pattern]["type"] === "undefined" || (typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] !== "bgp")){

				var temp = parseSPARQLjsStructureWhere(patterns[pattern], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				classesTable = temp["classesTable"];
				attributeTable = temp["attributeTable"];
				filterTable = temp["filterTable"];
				linkTable = temp["linkTable"];
				linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
				classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
				attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
				bindTable = temp["bindTable"];		
			}
		}
		
		//find optional link
		for(var link in linkTableAdded){
			
			if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
				linkTableAdded[link]["linkType"] = "OPTIONAL";
				break;
			}
		}
		bgptype == "plain";
		
		if(linkTable.length == 0) linkTable = linkTableAdded;
	}
	//type=values
	if(where["type"] == "values"){
			
		var variableList = [];
		
		for(var valueClause in where["values"]){		
			var valuePairs = where["values"][valueClause];
			for(var pair in valuePairs){
				variableList.push(vq_visual_grammar.parse(pair)["value"]);
			}
		}
		
		var variableList = variableList.filter(function (el, i, arr) {
			return arr.indexOf(el) === i;
		});

		if(variableList.length == 1){
			var alias = variableList[0];
			var valuesList = [];
			
			for(var valueClause in where["values"]){
				var valuePairs = where["values"][valueClause];
				for(var pair in valuePairs){
					valuesList.push(vq_visual_grammar.parse(valuePairs[pair])["value"]);
				}
			}
			var values = "{" + valuesList.join(" ") + "}";
			
			attributeInfo = {
				"variableName":alias,
				"identification":{short_name:alias},
				"alias":alias,
				"requireValues":false,
				"seen":true,
				"exp":values
			};
			
			for (var clazz in classesTable){
				classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
				break;
			}
		} else {
			var alias = "(" +variableList.join(" ") + ")";
			
			var valuesList = [];
			for(var valueClause in where["values"]){
				var valuePairs = where["values"][valueClause];
				var valuesPairList = [];
				for(var pair in valuePairs){
					valuesPairList.push(vq_visual_grammar.parse(valuePairs[pair])["value"]);
				}
				valuesList.push("(" + valuesPairList.join(" ") + ")")
			}
			var values = "{" + valuesList.join(" ") + "}";
	
			attributeInfo = {
				"variableName":alias,
				"identification":{short_name:alias},
				"alias":alias,
				"requireValues":false,
				"seen":true,
				"exp":values
			};
			for (var clazz in classesTable){
				classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
				break;
			}
		}
	}
	//type=filter
	if(where["type"] == "filter"){
		
		var allowMultiplication = null;
		
		var temp = parseSPARQLjsStructureWhere(where["expression"], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, checkIfOrAndInFilter(where["expression"], generateOnlyExpression));
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		filterTable = temp["filterTable"];
		attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
		bindTable = temp["bindTable"];
		
		
		
		if(where["expression"]["type"] == "operation" && where["expression"]["operator"] == "exists"){
			allowMultiplication = false;
			var viziQuerExpr = temp["viziQuerExpr"];
			var className;
			for(var fil in viziQuerExpr["exprVariables"]){
				var classes = [];
				if(typeof classesTable[viziQuerExpr["exprVariables"][fil]] !== 'undefined' && typeof plainVariables[viziQuerExpr["exprVariables"][fil]] !== 'undefined') {
					className = classesTable[viziQuerExpr["exprVariables"][fil]]["variableName"].substring(1);
					classes[viziQuerExpr["exprVariables"][fil]] = classesTable[viziQuerExpr["exprVariables"][fil]];
				}	
				else if(typeof classesTable["?" + viziQuerExpr["exprVariables"][fil]] !== 'undefined' && typeof plainVariables[viziQuerExpr["exprVariables"][fil]] !== 'undefined') {
					className = "?" + viziQuerExpr["exprVariables"][fil];
					classes = findByVariableName(classesTable, "?"+className);
				} else if(typeof  attributeTable[viziQuerExpr["exprVariables"][fil]] != 'undefined' && typeof plainVariables[viziQuerExpr["exprVariables"][fil]] !== 'undefined') {
					className = attributeTable[viziQuerExpr["exprVariables"][fil]]["class"];
					var attributeNames = findByVariableName(attributeTable, viziQuerExpr["exprVariables"][fil]);
					for(var attributeName in attributeNames){
						var classN = attributeTable[attributeName]["class"];
						classes[classN] = classesTable[classN];
					}
					classes[className] = classesTable[className];
					if(classesTable[className]["variableName"].startsWith("?"))className = classesTable[className]["variableName"].substring(1);
					else className = classesTable[className]["variableName"];
				} else{
					if(typeof className === 'undefined'){
						for(var clazz in classesTable){
							className = clazz;
							break;
						}
						classes = findByVariableName(classesTable, "?"+className);
					}
				}

				for (var clazz in classesTable){	
					for(var condition in classesTable[clazz]["conditions"]){
						if(classesTable[clazz]["conditions"][condition]["exp"] == viziQuerExpr["exprString"]){
							classesTable[clazz]["conditions"][condition]["allowMultiplication"] = false;
						}
					}
				}
			}	
			
		}
		
		else if(filterTable.length == 0 && temp["viziQuerExpr"]["exprString"] == ""){
			linkTable = linkTable.concat(temp["linkTableAdded"]);
			linkTableAdded = temp["linkTableAdded"];
		}else{
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
			viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			filterTable.push({filterString:viziQuerExpr["exprString"], filterVariables:viziQuerExpr["exprVariables"]});
			var className;
			for(var fil in viziQuerExpr["exprVariables"]){
				var classes = [];
				if(typeof classesTable[viziQuerExpr["exprVariables"][fil]] !== 'undefined' && typeof plainVariables[viziQuerExpr["exprVariables"][fil]] !== 'undefined') {
					className = classesTable[viziQuerExpr["exprVariables"][fil]]["variableName"].substring(1);
					classes[viziQuerExpr["exprVariables"][fil]] = classesTable[viziQuerExpr["exprVariables"][fil]];
				}	
				else if(typeof classesTable["?" + viziQuerExpr["exprVariables"][fil]] !== 'undefined' && typeof plainVariables[viziQuerExpr["exprVariables"][fil]] !== 'undefined') {
					className = "?" + viziQuerExpr["exprVariables"][fil];
					classes = findByVariableName(classesTable, "?"+className);
				} else if(typeof  attributeTable[viziQuerExpr["exprVariables"][fil]] != 'undefined' && typeof plainVariables[viziQuerExpr["exprVariables"][fil]] !== 'undefined') {
					className = attributeTable[viziQuerExpr["exprVariables"][fil]]["class"];
					var attributeNames = findByVariableName(attributeTable, viziQuerExpr["exprVariables"][fil]);
					for(var attributeName in attributeNames){
						var classN = attributeTable[attributeName]["class"];
						classes[classN] = classesTable[classN];
					}
					classes[className] = classesTable[className];
					if(classesTable[className]["variableName"].startsWith("?"))className = classesTable[className]["variableName"].substring(1);
					else className = classesTable[className]["variableName"];
				} else{
					if(typeof className === 'undefined'){
						for(var clazz in classesTable){
							className = clazz;
							break;
						}
						classes = findByVariableName(classesTable, "?"+className);
					}
				}

				if(generateOnlyExpression != true){
					for (var clazz in classes){		
						if((typeof nodeList["?"+className] !== 'undefined' && typeof nodeList["?"+className]["uses"][clazz] !== 'undefined') || typeof nodeList[className] !== 'undefined' && typeof nodeList[className]["uses"][clazz] !== 'undefined'){	
							if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
							
							for(var exprVariable in viziQuerExpr["exprVariables"]){
								if(typeof attributeTable[viziQuerExpr["exprVariables"][exprVariable]] !== "undefined" &&
								(attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["alias"] == null || attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["alias"] == "")
								&& 	typeof attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["exp"] !== "undefined" && attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["exp"] != null
								&& !viziQuerExpr["exprString"].includes(attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["exp"])){
									viziQuerExpr["exprString"] = viziQuerExpr["exprString"].replace(viziQuerExpr["exprVariables"][exprVariable], attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["exp"])
								}
								if((typeof attributeTable[viziQuerExpr["exprVariables"][exprVariable]] !== "undefined" 
								&& typeof attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["identification"] !== "undefined"
								&& attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["identification"] != null
								&& attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["identification"]["maxCardinality"] == 1
								 || typeof attributeTable[viziQuerExpr["exprVariables"][exprVariable]] === "undefined")){
									
								} else if(allowMultiplication == null) allowMultiplication = true;
							}
							classesTable[clazz]["conditions"].push({exp:viziQuerExpr["exprString"], allowMultiplication:allowMultiplication});
						}
					}
				}
				
				
			}	
			
			if(typeof className !== 'undefined' &&  typeof classesTable[className] !== 'undefined' && typeof classesTable[className]["conditions"] !== 'undefined') {
				classesTable[className]["conditions"] = classesTable[className]["conditions"].filter(function (el, i, arr) {
					return arr.indexOf(el)["exp"] === i["exp"];
				});
			}
		}
	}
	
	// type=union
	if(where["type"] == "union"){
		
		var classCount = Object.keys(classesTable).length;
		var unionClass;
		var subject = findClassToConnect(classesTable, linkTable, nodeList, "subject");
		if(subject == null){
				for(var subClass in classesTable){
					subject = subClass;
					break;
				}
		}
		
		// console.log("subject", subject, linkTable)
		
		if(typeof classesTable["[ + ]"] === 'undefined' && typeof allClasses["[ + ]"] === 'undefined'){
			classesTable["[ + ]"] = {
				"variableName":"?[ + ]",
				"identification":null,
				"instanceAlias":"",
				"isVariable":false,
				"isUnit":false,
				"isUnion":true
			};
			classTableAdded.push("[ + ]");
			nodeList["?[ + ]"]= {uses: {"[ + ]": "class"}, count:1};
			unionClass = "[ + ]";
		}else {
			classesTable["[ + ]"+counter] = {
				"variableName":"?[ + ]",
				"identification":null,
				"instanceAlias":"",
				"isVariable":false,
				"isUnit":false,
				"isUnion":true
			};
			classTableAdded.push("[ + ]"+counter);
			if(typeof nodeList["?[ + ]"] === 'undefined') nodeList["?[ + ]"] = {uses: [], count:1}
			nodeList["?[ + ]"]["uses"]["[ + ]"+counter] = "class";
			nodeList["?[ + ]"]["count"] = nodeList["?[ + ]"]["count"]+1;
			unionClass = "?[ + ]"+counter;
			counter++;
		}
		if(classCount != 0){
			
			var link = {
				"linkIdentification":{localName: "++", short_name: "++"},
				"object":unionClass,
				"subject":subject,
				"isVisited":false,
				"linkType":"REQUIRED",
				"isSubQuery":false,
				"isGlobalSubQuery":false,
			}
			linkTable.push(link);
			linkTableAdded.push(link);
		} else if (Object.keys(allClasses).length != 0){
			var subject = findClassToConnect(allClasses, linkTable, [], "subject");
			if(subject == null){
					for(var subClass in allClasses){
						subject = subClass;
						break;
					}
			}
			var link = {
				"linkIdentification":{localName: "++", short_name: "++"},
				"object":unionClass,
				"subject":subject,
				"isVisited":false,
				"linkType":"REQUIRED",
				"isSubQuery":true,
				"isGlobalSubQuery":false,
			}
			linkTable.push(link);
			linkTableAdded.push(link);
		}
		for(var pattern in where["patterns"]){
		
			// union subQuery (required, optinal)
			if(typeof where["patterns"][pattern]["queryType"] !== 'undefined'){
				
				for(var clazz in classesTable){
					allClasses[clazz] = classesTable[clazz];
				}
				
				var abstractTable = generateAbstractTable(where["patterns"][pattern], allClasses, variableList, nodeList);
				
				// console.log("UNION abstractTable", abstractTable)
				
				abstractTable["linkTable"] = connectAllClasses(abstractTable["classesTable"], abstractTable["linkTable"], allClasses);

				for(var clazz in abstractTable["classesTable"]){
					allClasses[clazz] = abstractTable["classesTable"][clazz];
				}
				
				var object = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null, "object");
				if(object == null){
					for(var subClass in abstractTable["classesTable"]){
						object = subClass;
						break;
					}
				}
				var linktype = "REQUIRED";
				if(where["patterns"][pattern]["where"][0]["type"] == "optional")linktype = "OPTIONAL";

				var link = {
					"linkIdentification":{localName: "++", short_name: "++"},
					"object":object,
					"subject":unionClass,
					"isVisited":false,
					"linkType":linktype,
					"isSubQuery":true,
					"isGlobalSubQuery":false,
				}
				linkTable.push(link);
				linkTableAdded.push(link);
				
				var subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"object");
				if(subSelectMainClass == null){
					for(var subClass in abstractTable["classesTable"]){
						subSelectMainClass = subClass;
						break;
					}
				}

				abstractTable["classesTable"][subSelectMainClass]["orderings"] = abstractTable["orderTable"];
				abstractTable["classesTable"][subSelectMainClass]["groupings"] = abstractTable["groupings"];
				if(typeof where["patterns"][0]["limit"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["limit"] =  where["patterns"][0]["limit"];
				if(typeof where["patterns"][0]["offset"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["offset"] =  where["patterns"][0]["offset"];
				if(typeof where["patterns"][0]["distinct"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["distinct"] =  where["patterns"][0]["distinct"];

				for(var subClass in abstractTable["classesTable"]){
					if(typeof classesTable[subClass] === 'undefined')classesTable[subClass] = abstractTable["classesTable"][subClass];
				}

				linkTable = linkTable.concat(abstractTable["linkTable"]);
			} 
			else if(typeof where["patterns"][pattern]["type"] !== 'undefined') {
				// glogal subquery + negation
				if(where["patterns"][pattern]["type"] == 'minus'){
					for(var p in where["patterns"][pattern]["patterns"]){
						var classTableTemp = [];
						var linkTableTemp = [];
						var nodeLitsTemp = [];
						
						var linktype = "NOT";

						var patterns;
						if(where["patterns"][pattern]["patterns"][p]["type"] == 'filter' 
							&& where["patterns"][pattern]["patterns"][p]["expression"]["type"] == "operation"
							&& where["patterns"][pattern]["patterns"][p]["expression"]["operator"] == "notexists") {
								var patterns = where["patterns"][pattern]["patterns"][p]["expression"]["args"][0]["patterns"];
						}

						var temp  = collectNodeList(patterns)["nodeList"];
						var plainVariables = getWhereTriplesPlainVaribles(patterns);
						for(var node in temp){
							nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						}
						for(var groupPattern in patterns){
							if(typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] == "bgp"){
								var temp = parseSPARQLjsStructureWhere(patterns[groupPattern], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								for(var clazz in temp["classTableAdded"]){
									classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
								}
								attributeTable = temp["attributeTable"];
								linkTable = temp["linkTable"];
								filterTable = temp["filterTable"];
								linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
							}
						}
						
						for(var groupPattern in patterns){
							if(typeof patterns[groupPattern]["type"] === "undefined" || (typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] !== "bgp")){
								var temp = parseSPARQLjsStructureWhere(patterns[groupPattern], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								for(var clazz in temp["classTableAdded"]){
									classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
								}
								attributeTable = temp["attributeTable"];
								linkTable = temp["linkTable"];
								filterTable = temp["filterTable"];
								linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
							}
						}
						
						var object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");
						if(object == null){
							for(var subClass in classTableTemp){
								object = subClass;
								break;
							}
						}

						var link = {
							"linkIdentification":{localName: "++", short_name: "++"},
							"object":object,
							"subject":unionClass,
							"isVisited":false,
							"linkType":linktype,
							"isSubQuery":false,
							"isGlobalSubQuery":true,
						}
						
						linkTable.push(link);
						linkTableAdded.push(link);
					}
				} 
				// simple group 
				else{	
					var classTableTemp = [];
					var linkTableTemp = [];
					var nodeLitsTemp = [];
					
					var linktype = "REQUIRED";
					if(where["patterns"][pattern]["type"] == "optional")linktype = "OPTIONAL";
					
					var patterns;
					if(where["patterns"][pattern]["type"] == 'group' || where["patterns"][pattern]["type"] == "optional") patterns = where["patterns"][pattern]["patterns"];
					else if(where["patterns"][pattern]["type"] == 'filter' 
						&& where["patterns"][pattern]["expression"]["type"] == "operation"
						&& where["patterns"][pattern]["expression"]["operator"] == "notexists") {
							patterns = where["patterns"][pattern]["expression"]["args"][0]["patterns"];
							linktype = "NOT";
					} else if(where["patterns"][pattern]["type"] == 'bgp') patterns = {0:where["patterns"][pattern]};
					
					var temp  = collectNodeList(patterns)["nodeList"];
					var plainVariables = getWhereTriplesPlainVaribles(patterns);
					for(var node in temp){
						nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
					}
				
					for(var groupPattern in patterns){	
						if(typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] == "bgp"){
							var temp = parseSPARQLjsStructureWhere(patterns[groupPattern], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
							classesTable = temp["classesTable"];
							for(var clazz in temp["classTableAdded"]){
								classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							}
							attributeTable = temp["attributeTable"];
							linkTable = temp["linkTable"];
							filterTable = temp["filterTable"];
							linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
						}
					}
					
					for(var groupPattern in patterns){	
						if(typeof patterns[groupPattern]["type"] === "undefined" || (typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] !== "bgp")){
							var temp = parseSPARQLjsStructureWhere(patterns[groupPattern], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
							classesTable = temp["classesTable"];
							for(var clazz in temp["classTableAdded"]){
								classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							}
							attributeTable = temp["attributeTable"];
							linkTable = temp["linkTable"];
							filterTable = temp["filterTable"];
							linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
						}
					}
					
					// console.log("UNION classTableTemp", classTableTemp, classesTable, allClasses, nodeLitsTemp, nodeList, parentNodeList);
					
					linkTable = connectAllClasses(classTableTemp, linkTable, allClasses);
					
					var NL = parentNodeList;
					for(var node in nodeList){
						NL[node] = concatNodeListInstance(NL, node, nodeList[node]);
					}
					
					classesTable = removeParrentQueryClasses(NL, classesTable, classTableTemp, linkTableTemp, attributeTable);
					var tempLink = relinkUnionLink(classesTable, linkTable, unionClass);
					linkTable = tempLink["linkTable"];
					
					if(tempLink["relinkt"] == false){
						var object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");
						if(object == null){
							for(var subClass in classTableTemp){
								object = subClass;
								break;
							}
						}

						var link = {
							"linkIdentification":{localName: "++", short_name: "++"},
							"object":object,
							"subject":unionClass,
							"isVisited":false,
							"linkType":linktype,
							"isSubQuery":false,
							"isGlobalSubQuery":false,
						}
						linkTable.push(link);
						linkTableAdded.push(link);
					}
				}
			}
		}
	}
	// type=bind
	if(where["type"] == "bind"){
		var temp = parseSPARQLjsStructureWhere(where["expression"], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
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
		
		if(viziQuerExpr["exprString"] != "" && Object.keys(findByVariableName(attributeTable, viziQuerExpr["exprVariables"][0])).length > 0){
			var attributes = findByVariableName(attributeTable, viziQuerExpr["exprVariables"][0]);
			for (var attribute in attributes){
				classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
				variableList[where["variable"]] = "seen";
			}
		}
		if(typeof classesTable[viziQuerExpr["exprVariables"][0]] !== 'undefined'){
			classesTable[viziQuerExpr["exprVariables"][0]] = addAttributeToClass(classesTable[viziQuerExpr["exprVariables"][0]], attributeInfo);
			variableList[where["variable"]] = "seen";
		}
		
		// console.log("variableList", variableList);
		// console.log("bindTable", bindTable);
		// console.log("classesTable", attributeTable);
		// console.log("attributeTable", classesTable);
		
	}
	// type=functionCall
	if(where["type"] == "functionCall"){
		var functionName = "<"+where["function"]+">"
		var ignoreFunction = false;
		if(where["function"] == "http://www.w3.org/2001/XMLSchema#dateTime" || where["function"] == "http://www.w3.org/2001/XMLSchema#date" || where["function"] == "http://www.w3.org/2001/XMLSchema#decimal") ignoreFunction = true;
		//if(where["function"] == "http://www.w3.org/2001/XMLSchema#decimal") functionName = "xsd:decimal";
		
		
		var schema = new VQ_Schema();
		var shortFunction = generateInstanceAlias(schema, where["function"]);
		if(shortFunction != where["function"]) functionName = shortFunction;
		
		if(ignoreFunction == false) viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + functionName + "(";
		var args = [];
			
		for(var arg in where["args"]){
			if(typeof where["args"][arg] == 'string') {
				var arg1 = generateArgument(where["args"][arg]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				args.push(arg1["value"]);
			}
			else if(typeof where["args"][arg] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][arg], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				args.push(temp["viziQuerExpr"]["exprString"]);
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ");
		if(ignoreFunction == false) viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + ")";
	}
	// type=operation
	if(where["type"] == "operation"){
		//realtion or atithmetic
		if(checkIfRelation(where["operator"]) != -1 || chechIfArithmetic(where["operator"]) != -1){
			
			
			
			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(arg1["type"] == "iri" && checkIfRelation(where["operator"]) != -1) argValue = "<"+argValue+">";
				//if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;	
			}
			else if(typeof where["args"][0] == 'object'){	
				var temp = parseSPARQLjsStructureWhere(where["args"][0], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				if((where["operator"] == "*" || where["operator"] == "/") && (typeof where["args"][0]["type"] === 'undefined' || (typeof where["args"][0]["type"] !== 'undefined' && where["args"][0]["type"] != "functionCall"))) viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "(" +temp["viziQuerExpr"]["exprString"] + ")";
				else viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				bindTable = temp["bindTable"];
				// console.log("bindTable", bindTable);
				// console.log("exprString", viziQuerExpr["exprString"]);
			}

			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + where["operator"] + " ";

			if(typeof where["args"][1] == 'string') {
				var arg2 = generateArgument(where["args"][1]);
				if(arg2["type"] == "varName") viziQuerExpr["exprVariables"].push(arg2["value"]);
				var argValue = arg2["value"];
				if(arg2["type"] == "iri" && checkIfRelation(where["operator"]) != -1) argValue = "<"+argValue+">";
				//if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][1], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				if((where["operator"] == "*" || where["operator"] == "/") && (typeof where["args"][1]["type"] === 'undefined' || (typeof where["args"][1]["type"] !== 'undefined' && where["args"][1]["type"] != "functionCall"))) viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "(" +temp["viziQuerExpr"]["exprString"] + ")";
				else viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		//zero argumentFunctions
		else if(where["args"].length == 0){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "()";
		}//one argumentFunctions
		else if(checkIfOneArgunemtFunctuion(where["operator"]) != -1){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";

			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ", ";
			
			if(typeof where["args"][1] == 'string') {
				var arg1 = generateArgument(where["args"][1]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][1], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
					var argValue = arg1["value"];
					if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
					args.push(argValue);
				}
				else if(typeof where["args"][arg] == 'object'){
					var temp = parseSPARQLjsStructureWhere(where["args"][arg], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
					bindTable = temp["bindTable"];
					args.push(temp["viziQuerExpr"]["exprString"]);
					viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				}
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ") + ")";
		}
		// !
		else if(where["operator"] == "!"){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] ;

			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		//not exists
		else if(where["operator"] == "notexists"){
			var nodeLitsTemp = [];
			
			if(where["args"].length == 1 && where["args"][0]["type"] == "bgp" && where["args"][0]["triples"].length == 1){
				
				var temp  = collectNodeList(where["args"])["nodeList"];
				var plainVariables = getWhereTriplesPlainVaribles(where["args"]);
				for(var node in temp){
					nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
				}
							
				var schema = new VQ_Schema();
					
				var dataPropertyResolved = schema.resolveAttributeByName(null, where["args"][0]["triples"][0]["predicate"]);
				if(dataPropertyResolved == null) dataPropertyResolved = schema.resolveLinkByName(where["args"][0]["triples"][0]["predicate"]);

				if(dataPropertyResolved!=null){
					exprVariables = [];
					exprVariables.push(dataPropertyResolved["localName"]);
					filterTable.push({filterString:"NOT EXISTS " + dataPropertyResolved["localName"], filterVariables:exprVariables});
					
					var classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"])
					if(generateOnlyExpression != true){
						for (var clazz in classes){
							if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
							classesTable[clazz]["conditions"].push({exp:"NOT EXISTS " + dataPropertyResolved["localName"], allowMultiplication:false});
							//temp["attributeTable"][temp["attributeTableAdded"][attribute]]["seen"] = true;
						}
					}
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + dataPropertyResolved["localName"]
					viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
				} else if(typeof where["args"][0]["triples"][0]["predicate"] == "object"){
					var temp = generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
					exprVariables = [];

					for(var attribute in temp["attributeTableAdded"]){
						exprVariables.push(temp["attributeTable"][temp["attributeTableAdded"][attribute]]["variableName"]);
						filterTable.push({filterString:"NOT EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"], filterVariables:exprVariables});
						
						var classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"])
						if(generateOnlyExpression != true){
							for (var clazz in classes){
								if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
								classesTable[clazz]["conditions"].push({exp:"NOT EXISTS " + + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"], allowMultiplication:false});
							}
						}
						viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
					}
					
					for(var clazz in temp["classTableAdded"]){
						for(var link in linkTable){
							if(linkTable[link]["subject"] == temp["classTableAdded"][clazz] || linkTable[link]["object"] == temp["classTableAdded"][clazz]) {
								linkTable[link]["linkType"] = "NOT";
							}
						}
					}		
				}
			} else {	
				for(var arg in where["args"]){
					if(where["args"][arg]["type"] == 'group'){
						var patterns =  where["args"][arg]["patterns"];
						var tempClassTable = [];
						for(var pattern in patterns){
							var temp  = collectNodeList(patterns)["nodeList"];
							var plainVariables = getWhereTriplesPlainVaribles(patterns);
							for(var node in temp){
								nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
							}
							 
							if(patterns[pattern]["type"] == "filter" && tempClassTable.length == 0){
								var temp = parseSPARQLjsStructureWhere(patterns[pattern]["expression"], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);

								for(var attr in attributeTableAdded){
									var addedAttribute = attributeTableAdded[attr];
									var schema = new VQ_Schema();
									if(typeof attributeTable[addedAttribute] !== 'undefined' && (schema.resolveLinkByName(attributeTable[addedAttribute]["variableName"]) != null) || schema.resolveAttributeByName(null, attributeTable[addedAttribute]["variableName"]) != null) attributeTable[addedAttribute]["seen"] = true;
								}
								
								viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + temp["viziQuerExpr"]["exprString"];
								viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
	
							}  else{
								var temp = parseSPARQLjsStructureWhere(patterns[pattern], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								attributeTable = temp["attributeTable"];
								filterTable = temp["filterTable"];
								linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
								classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
								tempClassTable = classTableAdded.concat(temp["classTableAdded"]);
								attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
								bindTable = temp["bindTable"];
							}
						}
					} else{
						var temp  = collectNodeList(where["args"])["nodeList"];
						var plainVariables = getWhereTriplesPlainVaribles(patterns);
						for(var node in temp){
							nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						}

						var temp = parseSPARQLjsStructureWhere(where["args"][arg], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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

			// console.log("NOT EXISTS", nodeLitsTemp, nodeList, linkTable, linkTableAdded, classTableAdded);
			

			for(link in linkTableAdded){
				if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
					linkTableAdded[link]["linkType"] = "NOT";
					if(patternType == "minus") linkTableAdded[link]["isGlobalSubQuery"] = true;
					for(attr in attributeTableAdded){
						var attributeInfoTemp = attributeTable[attributeTableAdded[attr]];
						var attributeInfo = {
							"alias":attributeInfoTemp["alias"],
							"identification":attributeInfoTemp["identification"],
							"requireValues":attributeInfoTemp["requireValues"],
							"isInternal":true,
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
			var nodeLitsTemp = [];
			if(where["args"].length == 1 && where["args"][0]["type"] == "bgp" && where["args"][0]["triples"].length == 1){
				var temp  = collectNodeList(where["args"])["nodeList"];
				var plainVariables = getWhereTriplesPlainVaribles(where["args"]);
				for(var node in temp){
					nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
				}
				
				var schema = new VQ_Schema();
				var dataPropertyResolved = schema.resolveAttributeByName(null, where["args"][0]["triples"][0]["predicate"]);
				if(dataPropertyResolved == null) dataPropertyResolved = schema.resolveLinkByName(where["args"][0]["triples"][0]["predicate"]);

				if(dataPropertyResolved!=null){
					exprVariables = [];
					exprVariables.push(dataPropertyResolved["localName"]);
					filterTable.push({filterString:"EXISTS " + dataPropertyResolved["localName"], filterVariables:exprVariables});
					
					var classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"])
					if(generateOnlyExpression != true){
						for (var clazz in classes){
							if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
							classesTable[clazz]["conditions"].push({exp:"EXISTS " + dataPropertyResolved["localName"], allowMultiplication:false});
						}
					}
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "EXISTS " + dataPropertyResolved["localName"]
					viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
				}else if(typeof where["args"][0]["triples"][0]["predicate"] == "object"){
					var temp = generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
					exprVariables = [];
					
					for(var attribute in temp["attributeTableAdded"]){
						exprVariables.push(temp["attributeTable"][temp["attributeTableAdded"][attribute]]["variableName"]);
						filterTable.push({filterString:"EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"], filterVariables:exprVariables});
						
						var classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"])
						if(generateOnlyExpression != true){
							for (var clazz in classes){
								if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
								classesTable[clazz]["conditions"].push({exp:"EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"], allowMultiplication:false});
								temp["attributeTable"][temp["attributeTableAdded"][attribute]]["seen"] = true;
							}
						}
						viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
					}
					
					for(var clazz in temp["classTableAdded"]){
						for(var link in linkTable){
							if(linkTable[link]["subject"] == temp["classTableAdded"][clazz] || linkTable[link]["object"] == temp["classTableAdded"][clazz]) {
								linkTable[link]["isSubQuery"] = true;
							}
						}
					}
				}
			} else {
				var nodeLitsTemp = [];
				
				for(var arg in where["args"]){
					if(where["args"][arg]["type"] == 'group'){
						var patterns =  where["args"][arg]["patterns"];
						var temp  = collectNodeList(patterns)["nodeList"];
						var plainVariables = getWhereTriplesPlainVaribles(patterns);
						for(var node in temp){
							nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						}
						
						var notBgpOrfilter = false;
						for(var pattern in patterns){
							if(patterns[pattern]["type"] != "bgp" || patterns[pattern]["type"] != "filter") notBgpOrfilter = true;
						}
						if(notBgpOrfilter == true){
							
							var tempClassTable = [];
							for(var pattern in patterns){
								if( patterns[pattern]["type"] == "bgp"){
									var triples = patterns[pattern]["triples"];
									var temp = generateTypebgp(triples, nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
									tempClassTable = tempClassTable.concat(temp["classTableAdded"]);
		
									if(typeof temp["nodeLits"] !== 'undefined')nodeLitsTemp = temp["nodeLits"];

									for(var attr in temp["attributeTableAdded"]){
										var addedAttribute = temp["attributeTableAdded"][attr];
										var schema = new VQ_Schema();
										if(typeof attributeTable[addedAttribute] !== 'undefined' && (schema.resolveLinkByName(attributeTable[addedAttribute]["variableName"]) != null) || schema.resolveAttributeByName(null, attributeTable[addedAttribute]["variableName"]) != null) attributeTable[addedAttribute]["seen"] = true;
									}
								} else{
									var temp = parseSPARQLjsStructureWhere(patterns[pattern], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
									
									viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
									viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
									
									// for(var exprVariable in viziQuerExpr["exprVariables"]){
										// console.log("dfgsfdgsfdgdsg", viziQuerExpr["exprVariables"][exprVariable], attributeTable[viziQuerExpr["exprVariables"][exprVariable]])
										// if((attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["alias"] == null || attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["alias"] == "")
										// && 	typeof attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["exp"] !== "undefined" && attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["exp"] != null){
											// viziQuerExpr["exprString"] = viziQuerExpr["exprString"].replace(viziQuerExpr["exprVariables"][exprVariable], attributeTable[viziQuerExpr["exprVariables"][exprVariable]]["exp"])
										// }
									// }
								}
							}
							
							for(var link in linkTable){
								if((tempClassTable.indexOf(linkTable[link]["object"]) != -1 && tempClassTable.indexOf(linkTable[link]["subject"]) == -1) || 
								(tempClassTable.indexOf(linkTable[link]["object"]) == -1 && tempClassTable.indexOf(linkTable[link]["subject"]) != -1)) {
									linkTable[link]["isSubQuery"] = true;
								}
							}
							
						}else{
							for(var pattern in patterns){
								var temp = parseSPARQLjsStructureWhere(patterns[pattern], plainVariables, nodeLitsTemp,  nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								attributeTable = temp["attributeTable"];
								filterTable = temp["filterTable"];
								linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
								classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
								attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
								bindTable = temp["bindTable"];
							}
						}
					} else{ 
						var temp  = collectNodeList(where["args"])["nodeList"];
						var plainVariables = getWhereTriplesPlainVaribles(where["args"]);
						for(var node in temp){
							nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						}
						
						if(where["args"][arg]["type"] == "bgp"){
							var schema = new VQ_Schema();
							var triples = where["args"][arg]["triples"];
							for(var triple in triples){
								var dataPropertyResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]);
								if(dataPropertyResolved!=null){
									exprVariables = [];
									exprVariables.push(dataPropertyResolved["localName"]);
									filterTable.push({filterString:"EXISTS " + dataPropertyResolved["localName"], filterVariables:exprVariables});
									
									var classes = findByVariableName(classesTable, triples[triple]["subject"])
									if(generateOnlyExpression != true){
										for (var clazz in classes){
											if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
											classesTable[clazz]["conditions"].push({exp:"EXISTS " + dataPropertyResolved["localName"], allowMultiplication:false});
										}
									}
								} else {
									var temp = parseSPARQLjsStructureWhere(where["args"][arg], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
									classesTable = temp["classesTable"];
									attributeTable = temp["attributeTable"];
									filterTable = temp["filterTable"];
									linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
									classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
									attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
									bindTable = temp["bindTable"];
								}
							}
						} else{
							var temp = parseSPARQLjsStructureWhere(where["args"][arg], plainVariables, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
			}
			// console.log("FILTER EXISTS", nodeLitsTemp, nodeList);

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
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}

			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + where["operator"] + " ";

			if(typeof where["args"][1] == 'string') {
				var arg2 = generateArgument(where["args"][1]);
				if(arg2["type"] == "varName") viziQuerExpr["exprVariables"].push(arg2["value"]);
				var argValue = arg2["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][1], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], plainVariables, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
					var argNParsed = generateArgument(where["args"][1][arg]);
					var argN = argNParsed["value"]
					if(argNParsed["type"] == "iri"){
						argN = "<"+argNParsed["value"]+">";
					}
					
					args.push(argN);
				}
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ");
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + ")";
		}	
	}
	// type=subquery
	if((where["type"] == "group" || where["type"] == "optional") && typeof where["patterns"][0]["queryType"] != "undefined"){
		
		for(var clazz in classesTable){
			allClasses[clazz] = classesTable[clazz];
		}
		// console.log("SUBQUERY", where["patterns"][0], classesTable, allClasses, bgptype);
		
		var abstractTable = generateAbstractTable(where["patterns"][0], allClasses, variableList, nodeList);

		for(var clazz in abstractTable["classesTable"]){
			allClasses[clazz] = abstractTable["classesTable"][clazz];
		}

		var linkFound = false;
		var pn = null;
		for(var node in abstractTable["nodeList"]){
			if(typeof nodeList[node] !== 'undefined'){
				//find links outside subquery
				for(var subLink in abstractTable["linkTable"]){
					if((typeof classesTable[abstractTable["linkTable"][subLink]["subject"]]!=='undefined' && classesTable[abstractTable["linkTable"][subLink]["subject"]]["variableName"] == node) 
						|| (typeof classesTable[abstractTable["linkTable"][subLink]["object"]] !== 'undefined' && classesTable[abstractTable["linkTable"][subLink]["object"]]["variableName"] == node)){
						if(linkFound==false){
							var subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"subject", nodeList[node]);
							
							pn = nodeList[node];
							if(subSelectMainClass == null){
								for(var subClass in abstractTable["classesTable"]){
									subSelectMainClass = subClass;
									break;
								}
							 } 
								
							for(var clazz in abstractTable["classesTable"]){
								if(clazz !== subSelectMainClass && (typeof abstractTable["classesTable"][clazz]["aggregations"] !== "undefined" || abstractTable["classesTable"][clazz]["aggregations"] != null)){
									
									var underSubQuery = false;
									for(var l in  abstractTable["linkTable"]){
										if(abstractTable["linkTable"][l]["subject"] == clazz && (abstractTable["linkTable"][l]["isSubQuery"] == true || abstractTable["linkTable"][l]["isGlobalSubQuery"] == true )){
											underSubQuery = true;
											break;
										}
									}
									if(underSubQuery != true){
										var aggregations = abstractTable["classesTable"][clazz]["aggregations"];
										for(var aggr in aggregations){
										
											if(aggregations[aggr]["exp"].toLowerCase() == "count(.)"){
												var cn = abstractTable["classesTable"][clazz]["instanceAlias"];
												if(typeof cn === 'undefined' || cn == null) cn = abstractTable["classesTable"][clazz]["identification"]["short_name"];
												abstractTable["classesTable"][subSelectMainClass] = addAggrigateToClass(abstractTable["classesTable"][subSelectMainClass], {exp:"count(" + cn + ")", alias:aggregations[aggr]["alias"]});
											} else if(aggregations[aggr]["exp"].toLowerCase() == "count_distinct(.)"){
												var cn = abstractTable["classesTable"][clazz]["instanceAlias"];
												if(typeof cn === 'undefined' || cn == null) cn = abstractTable["classesTable"][clazz]["identification"]["short_name"];
												abstractTable["classesTable"][subSelectMainClass] = addAggrigateToClass(abstractTable["classesTable"][subSelectMainClass], {exp:"count_distinct(" + cn + ")", alias:aggregations[aggr]["alias"]});
											} else {
												abstractTable["classesTable"][subSelectMainClass] = addAggrigateToClass(abstractTable["classesTable"][subSelectMainClass], aggregations[aggr]);
											}
										}
										abstractTable["classesTable"][clazz]["aggregations"] = null;
									}
								}
							}
							
							if(typeof abstractTable["classesTable"][subSelectMainClass]["aggregations"] === 'undefined' && typeof where["patterns"][0]["distinct"] === 'undefined'){
								abstractTable["classesTable"][subSelectMainClass]["selectAll"] = true;
							}
							var isSubQuery = true;
							var isGlobalSubQuery = false;
							if(typeof where["patterns"][0]["limit"] !== 'undefined' || typeof where["patterns"][0]["offset"] !== 'undefined' || typeof where["patterns"][0]["order"] !== 'undefined'){
								isSubQuery = false;
								isGlobalSubQuery = true;
							}	
							abstractTable["linkTable"][subLink]["isSubQuery"] = isSubQuery;
							abstractTable["linkTable"][subLink]["isGlobalSubQuery"] = isGlobalSubQuery;
							
							
							if(bgptype == "optionalLink"){
								var parrentQueryClass;
								if(abstractTable["linkTable"][subLink]["object"] == subSelectMainClass) parrentQueryClass = abstractTable["linkTable"][subLink]["subject"];
								else parrentQueryClass = abstractTable["linkTable"][subLink]["object"];

								abstractTable["classesTable"][parrentQueryClass+counter] = {
									"variableName":"",
									"identification":null,
									"instanceAlias":"",
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push("[ ]");
								
								var link = {
									"linkIdentification":{localName: "==", short_name: "=="},
									"object":parrentQueryClass+counter,
									"subject":parrentQueryClass,
									"isVisited":false,
									"linkType":"OPTIONAL",
									"isSubQuery":false,
									"isGlobalSubQuery":false,
								}
								
								linkTable.push(link);
								
								if(abstractTable["linkTable"][subLink]["object"] == parrentQueryClass) abstractTable["linkTable"][subLink]["object"] = parrentQueryClass+counter;
								else abstractTable["linkTable"][subLink]["subject"] = parrentQueryClass+counter;
								counter++;
							}
							
							if(where["type"] == "optional") abstractTable["linkTable"][subLink]["linkType"] = "OPTIONAL";
							linkFound = true;
						}else{
							abstractTable["linkTable"][subLink]["isConditionLink"] = true;
						}
					}
					linkTable.push(abstractTable["linkTable"][subLink]);
				}
			}
		}
		
		// UNIT
		if(Object.keys(nodeList).length == 0){
			if(typeof classesTable["[ ]"] === 'undefined' && typeof allClasses["[ ]"] === 'undefined'){
				classesTable["[ ]"] = {
					"variableName":"?[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classTableAdded.push("[ ]");
				nodeList["?[ ]"]= {uses: {"[ ]": "class"}, count:1};
			}else {
				classesTable["[ ]"+counter] = {
					"variableName":"?[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classTableAdded.push("[ ]"+counter);
				if(typeof nodeList["?[ ]"] === 'undefined') nodeList["?[ ]"] = {uses: [], count:1}
				nodeList["?[ ]"]["uses"]["[ ]"+counter] = "class";
				nodeList["?[ ]"]["count"] = nodeList["?[ ]"]["count"]+1;
				counter++;
			}
		}
		if(linkFound == false){
			var linkType = "REQUIRED"
			if(where["type"] == "optional") linkType = "OPTIONAL";
			if(typeof nodeList["?[ ]"] !== 'undefined'){
				for(var unionClass in nodeList["?[ ]"]["uses"]){
					var object = findClassToConnectUNIT(abstractTable["classesTable"], abstractTable["linkTable"], null, "object");
					if(object == null){
						for(var subClass in abstractTable["classesTable"]){
							object = subClass;
							break;
						}
					}

					var link = {
						"linkIdentification":{localName: "++", short_name: "++"},
						"object":object,
						"subject":unionClass,
						"isVisited":false,
						"linkType":linkType,
						"isSubQuery":true,
						"isGlobalSubQuery":false,
					}
					
					linkTable.push(link);
					linkTableAdded.push(link);
					linkFound = true;
				}
			}
			if(typeof abstractTable["nodeList"]["?[ ]"] !== 'undefined'){
				for(var unionClass in abstractTable["nodeList"]["?[ ]"]["uses"]){
					
					var subject = findClassToConnectUNIT(classesTable, linkTable, nodeList, "subject");
					if(subject == null){
						for(var subClass in classesTable){
							subject = subClass;
							break;
						}
					}
					var link = {
						"linkIdentification":{localName: "++", short_name: "++"},
						"object":unionClass,
						"subject":subject,
						"isVisited":false,
						"linkType":linkType,
						"isSubQuery":true,
						"isGlobalSubQuery":false,
					}
					linkTable.push(link);
					linkTableAdded.push(link);
					linkFound = true;
				}
			}
			for(var subLink in abstractTable["linkTable"]){
				linkTable.push(abstractTable["linkTable"][subLink]);
			}
		}
		if(linkFound == false){
			var linkType = "REQUIRED"
			if(where["type"] == "optional") linkType = "OPTIONAL";
			
			//if no link found
			// search for equals nodes in nodeList and parentNodeList
			for(var node in abstractTable["nodeList"]){
				if(typeof nodeList[node] !== 'undefined'){
					for(var classNode in abstractTable["nodeList"][node]["uses"]){
						for(var classParentNode in nodeList[node]["uses"]){
							var link = {
								"linkIdentification":{localName: "==", short_name: "=="},
								"object":classParentNode,
								"subject":classNode,
								"isVisited":false,
								"linkType":linkType,
								"isSubQuery":true,
								"isGlobalSubQuery":false,
							}
							linkTable.push(link);
							linkTableAdded.push(link);
						}
					}
				}
			}
			
			// if no equals nodes found, connect subquery main class, with parent query class, without outgoing links
			// TO DO
		}
		
		var subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"subject", pn);
		if(subSelectMainClass == null){
			for(var subClass in abstractTable["classesTable"]){
				subSelectMainClass = subClass;
				break;
			}
		}

		abstractTable["classesTable"][subSelectMainClass]["orderings"] = abstractTable["orderTable"];
		abstractTable["classesTable"][subSelectMainClass]["groupings"] = abstractTable["groupings"];
		if(typeof where["patterns"][0]["limit"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["limit"] =  where["patterns"][0]["limit"];
		if(typeof where["patterns"][0]["offset"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["offset"] =  where["patterns"][0]["offset"];
		if(typeof where["patterns"][0]["distinct"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["distinct"] =  where["patterns"][0]["distinct"];

		for(var subClass in abstractTable["classesTable"]){
			if(typeof classesTable[subClass] === 'undefined')classesTable[subClass] = abstractTable["classesTable"][subClass];
		}
	}
	// type = minus
	if(where["type"] == "minus"){
		
		
		var patterns = where["patterns"];
		var nodeLitsTemp = [];
		var parenNodeLitsTemp;
		if(patterns.length > 1){
			parenNodeLitsTemp = nodeList;
			var temp  = collectNodeList(patterns, true)["nodeList"];
			var plainVariables = getWhereTriplesPlainVaribles(patterns);
			for(var node in temp){
				nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
			}
		} else {
			nodeLitsTemp = nodeList;
			parenNodeLitsTemp = parentNodeList;
		}
			
		var classTableTemp = [];
		var linkTableTemp = [];

		for(var pattern in patterns){
			if(typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] == "bgp"){
				var temp = parseSPARQLjsStructureWhere(patterns[pattern], plainVariables, nodeLitsTemp, parenNodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, "optionalLink", allClasses, variableList, "minus", bindTable, generateOnlyExpression);
				classesTable = temp["classesTable"];
				for(var clazz in temp["classTableAdded"]){
					classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
				}
				attributeTable = temp["attributeTable"];
				filterTable = temp["filterTable"];
				linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
				classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
				attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
				linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
				bindTable = temp["bindTable"];
			}
		}
		
		for(var pattern in patterns){
			if(typeof patterns[pattern]["type"] === "undefined" || (typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] !== "bgp")){
				var temp = parseSPARQLjsStructureWhere(patterns[pattern], plainVariables, nodeLitsTemp, parenNodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, "optionalLink", allClasses, variableList, "minus", bindTable, generateOnlyExpression);
				classesTable = temp["classesTable"];
				for(var clazz in temp["classTableAdded"]){
					classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
				}
				attributeTable = temp["attributeTable"];
				filterTable = temp["filterTable"];
				linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
				classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
				attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
				linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
				bindTable = temp["bindTable"];
			}
		}
		
		if(patterns.length > 1){
			//find links outside subquery
			for(var link in linkTableAdded){
				for(var node in parenNodeLitsTemp){
					if(typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["subject"]] !== 'undefined' || typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["object"]] !== 'undefined'){
						linkTableAdded[link]["isGlobalSubQuery"] = true;
						linkTableAdded[link]["linkType"] = "NOT";
						break;
					}
				}
			}
		}
		
		linkTable = linkTable.concat(linkTableAdded);
	}

	return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, viziQuerExpr:viziQuerExpr, attributeTableAdded:attributeTableAdded, bindTable:bindTable};
}


function findClassToConnect(classesTable, linkTable, nodeList, type, parentNode){

	if(typeof parentNode !== "undefined" && parentNode != null){
			for(var p in parentNode["uses"]){
			for(var link in linkTable){
				if(linkTable[link]["subject"] == p){
					return linkTable[link]["object"];
				};
				if(linkTable[link]["object"] == p){
					return linkTable[link]["subject"];
				}
			}
		}
	}
	if(nodeList != null){
		for(var node in nodeList){
			for(var clazz in nodeList[node]["uses"]){
				var linkFound = false;
				for(var link in linkTable){
					if(linkTable[link][type] == clazz){
						linkFound = true;
						break;
					}
				}
				if(linkFound == false) return clazz;
			}
		}
	} else{
		// for class table
		for(var clazz in classesTable){
			var linkFound = false;
			// for link table
			for(var link in linkTable){
				// if link table in subquect or objact (based on type parameter) are equal to class, class is not the one
				if(linkTable[link][type] == clazz){
					linkFound = true;
					break;
				}
			}
			if(linkFound == false)  return clazz;
		}
	}
	return null;
}

function findClassToConnectUNIT(classesTable, linkTable, nodeList, type){
	if(nodeList != null){
		for(var node in nodeList){
			for(var clazz in nodeList[node]["uses"]){
				var linkFound = false;
				for(var link in linkTable){
					if(linkTable[link][type] == clazz){
						linkFound = true;
						break;
					}
				}
				if(linkFound == false) return clazz;
			}
		}
	} else{
		for(var clazz in classesTable){
			if(typeof classesTable[clazz]["aggregations"] !== 'undefined') return clazz;
		}
		for(var clazz in classesTable){
			var linkFound = false;
			for(var link in linkTable){
				if(linkTable[link][type] == clazz){
					linkFound = true;
					break;
				}
			}
			// console.log("clazz", classesTable[clazz])
			
			if(linkFound == false) return clazz;
		}
	}
	return null;
}

function findClassToConnectUnion(classesTable,parentClassesTable, linkTable, nodeList, type){
	if(nodeList != null){
		for(var node in nodeList){
			for(var clazz in nodeList[node]["uses"]){
				var linkFound = false;
				for(var link in linkTable){
					if(linkTable[link][type] == clazz){
						linkFound = true;
						break;
					}
				}
				if(linkFound == false) return clazz;
			}
		}
	} else{
		for(var clazz in classesTable){
			var linkFound = false;
			var fromParantClass = false;
			for(var pClazz in parentClassesTable){
						if(parentClassesTable[pClazz]["variableName"] == classesTable[clazz]["variableName"]){
							fromParantClass = true;
							break;
						}
					}
			for(var link in linkTable){
				if(linkTable[link][type] == clazz){
					linkFound = true;
					break;
				}
			}
			if(linkFound == false && fromParantClass == false) {return clazz;}
		}
	}
	return null;
}

function createNodeListInstance(nodeList, nodeName){
	var nodeListInstance = {};
	if(typeof nodeList[nodeName] === 'undefined'){
		return {count:1, uses:[]}
	} else{
		nodeListInstance = nodeList[nodeName];
		nodeListInstance["count"] = nodeListInstance["count"]+1;
	}
	return nodeListInstance;
}

function concatNodeListInstance(nodeList, nodeName, nodeInstance){
	var nodeListInstance = {};
	if(typeof nodeList[nodeName] === 'undefined'){
		return {count:nodeInstance["count"], uses:[]}
	} else{
		nodeListInstance = nodeList[nodeName];
		nodeListInstance["count"] = nodeListInstance["count"]+nodeInstance["count"];
	}
	return nodeListInstance;
}

// Create a list of nodes in a current query scope 
function collectNodeList(whereAll, propUnderOptional){
  var nodeList = [];
  var selectStarList = [];
  for(var key in whereAll){
	var where = whereAll[key];
	//type=bgp
	if(where["type"] == "bgp"){
		var triples = where["triples"];
		var schema = new VQ_Schema();
		for(var triple in triples){
			if(vq_visual_grammar.parse(triples[triple]["subject"])["type"] == "varName") selectStarList.push(triples[triple]["subject"]);
			if(vq_visual_grammar.parse(triples[triple]["object"])["type"] == "varName") selectStarList.push(triples[triple]["object"]);
			if(typeof triples[triple]["predicate"] === "string" && vq_visual_grammar.parse(triples[triple]["predicate"])["type"] == "varName") selectStarList.push(triples[triple]["predicate"]);

			//class definitions
			if(triples[triple]["predicate"] == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
				nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
			} else{
				//if class without definition
				//from data property
				if(schema.resolveAttributeByName(null, triples[triple]["predicate"]) != null){
					//subjest
					nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
					//object, dataproperty as objectproperty
					if(propUnderOptional != null && propUnderOptional == true) nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
				}
				//from object property
				else if(schema.resolveLinkByName(triples[triple]["predicate"]) != null){
					//subjest
					nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
					//object
					nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
				}
				//from property path
				else if(typeof triples[triple]["predicate"] === "object" && triples[triple]["predicate"]["type"] == "path"){
					var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
					if(typeof last_element == "object"){
						last_element = last_element["items"][last_element["items"].length - 1];
					}
					// object property
					if(schema.resolveLinkByName(last_element) != null){
						//subjest
						nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
						//object
						nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
					}
					// data property
					if(schema.resolveAttributeByName(null, last_element) != null){
						//subjest
						nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
					}
				}
				//from property not in a schema
				else if(schema.resolveAttributeByName(null, triples[triple]["predicate"]) == null && schema.resolveAttributeByName(null, triples[triple]["predicate"]) == null){
					//subjest
					nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
					//object
					nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
				}
			}
		}
	}
	//type=optional
	if(where["type"] == "optional"){
		var patterns = where["patterns"];
		var optionalDataPropAsObjectProp = false;
		for(var pattern in patterns){
			if(typeof patterns[pattern]["type"] !== 'undefined' && patterns[pattern]["type"] != "bgp") optionalDataPropAsObjectProp = true;
		}
		var temp = collectNodeList(patterns, optionalDataPropAsObjectProp);
		var tempNode = temp["nodeList"];
		for(var node in tempNode){
			nodeList[node] = concatNodeListInstance(nodeList, node, tempNode[node]);
		}
		selectStarList = selectStarList.concat(temp["selectStarList"]);
	}
  }
  return {"nodeList":nodeList, "selectStarList":selectStarList}
}

function findAttributeInAttributeTable(attributeTable, parsedVariableName, variableName, identification){
	//attributes are the same if  equals variableName, identification is null or identification short_name are the equals
	for(var a in attributeTable){
		var attribute = attributeTable[a]
		if(a.startsWith(parsedVariableName) && attribute["variableName"] == variableName &&
		((typeof identification === 'undefined' && typeof attributeTable["identification"] === 'undefined') || 
		(typeof identification !== 'undefined' && typeof attributeTable["identification"] !== 'undefined' && identification["short_name"] == attributeTable["identification"]["short_name"]))) return attribute;
	}
	return null;
}

function findClassInClassTable(classesTable, parsedVariableName, variableName, nodeList, identification){
	//classes are the same if  equals variableName, 
	// identifications are null or identifications short_name are equals or (classesTable identification is not emprty and identification is empty)
	for(var c in classesTable){
		var clazz = classesTable[c];
		if(c.startsWith(parsedVariableName) && clazz["variableName"] == variableName &&
		((typeof identification === 'undefined' && (typeof clazz["identification"] === 'undefined' || clazz["identification"] == null)) || 
		(typeof identification !== 'undefined' && (typeof clazz["identification"] !== 'undefined' && clazz["identification"] != null) && identification["short_name"] == clazz["identification"]["short_name"]) ||
		(typeof identification === 'undefined' && (typeof clazz["identification"] !== 'undefined' && clazz["identification"] != null)))) return clazz;
		
		if(c.startsWith(parsedVariableName) && clazz["variableName"] == variableName &&
		(typeof identification !== 'undefined' && (typeof clazz["identification"] === 'undefined' || clazz["identification"] == null))) return "addToClass";
	}
	return null;
}

function findByVariableName(classesTable, variableName){
	var classes = [];
	for(var c in classesTable){
		var clazz = classesTable[c]
		if(clazz["variableName"] == variableName) classes[c]=clazz;
	}
	return classes;
}

function findByShortName(classesTable, variableName){
	var classes = [];
	for(var c in classesTable){
		var clazz = classesTable[c]
		if(typeof clazz["identification"] !== "undefined" && clazz["identification"] != null && clazz["identification"]["notInSchema"] == "variable" && clazz["identification"]["short_name"] == variableName) classes[c]=clazz;
	}
	return classes;
}

function generateTypebgp(triples, nodeList, parentNodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList){//+parrentClasses
	var linkTableAdded = [];
	var classTableAdded = [];
	var attributeTableAdded = [];
	var filterTable = [];
	var schema = new VQ_Schema();
	
	// console.log("classesTable", classesTable);
	// console.log("parentNodeList", parentNodeList);
	// console.log("allClasses", allClasses);
	// console.log("nodeList", nodeList);
	// console.log("variableList", variableList);
	
	for(var triple in triples){
		//class definitions
		if(triples[triple]["predicate"] == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" && typeof allClasses[triples[triple]["subject"]] === 'undefined'){
			var instanceAlias = null;
			var classResolved = schema.resolveClassByName(triples[triple]["object"]);
			var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"]);
			
			if(classResolved != null && classResolved["localName"] != subjectNameParsed["value"]) instanceAlias = subjectNameParsed["value"];

			if(classResolved == null){
				var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"])["value"];
	
				var className = generateInstanceAlias(schema, objectNameParsed);
				if(triples[triple]["object"].startsWith("?")) {
					className = triples[triple]["object"];
					classResolved = {
						"short_name":className,
						"localName":className,
						"URI":triples[triple]["object"],
						"notInSchema": "variable"
					}
				} else {
					classResolved = {
						"short_name":className,
						"localName":className,
						"URI":triples[triple]["object"],
						"notInSchema": "true"
					}
				}
				instanceAlias = subjectNameParsed["value"];
			}
			
			if(typeof classesTable[subjectNameParsed["value"]] === 'undefined'){
				if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
					if(typeof allClasses[subjectNameParsed["value"]] === 'undefined'){
						// If class first time used in a query – create new class box
						// console.log("CLASS 1", subjectNameParsed["value"], classResolved);
						classesTable[subjectNameParsed["value"]] = {
							"variableName":triples[triple]["subject"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};
						classTableAdded.push(subjectNameParsed["value"]);
						
						nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed["value"]] = "class";
					} else {
						// If class defined in all query scope (higher than a parent scope) - create new class box with different identification.
						// console.log("CLASS 2", subjectNameParsed["value"]);
						classesTable[subjectNameParsed["value"]+counter] = {
							"variableName":triples[triple]["subject"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};
						classTableAdded.push(subjectNameParsed["value"]+counter);
						nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed["value"]+counter] = "class";
						counter++;
					}
				} else {
					// if class defined in a parent scope
					//create new class if identification short name not equals, or parrent class identification is missing
					// else copy class from parrent
					var createClass = true;
					for(var use in parentNodeList[triples[triple]["subject"]]["uses"]){
						if(typeof allClasses[use] !== 'undefined'
							&& allClasses[use]["identification"] != null 
							&& allClasses[use]["identification"]["short_name"] == classResolved["short_name"]
						){
							createClass = use;
							break;
						}
					}
					if(createClass == true){
						// console.log("CLASS 3", subjectNameParsed["value"]);
						classesTable[subjectNameParsed["value"]+counter] = {
							"variableName":triples[triple]["subject"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};
						classTableAdded.push(subjectNameParsed["value"]+counter);
						nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed["value"]+counter] = "class";
						counter++;
					} else if(nodeList[triples[triple]["subject"]]["count"] > 1){
						// if class used more than once, copy class from parent scope (to decide later whether to build a new class box or not)
						// console.log("CLASS 4", subjectNameParsed["value"]);
						classesTable[createClass] = {
							"variableName":triples[triple]["subject"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};
						classTableAdded.push(createClass);
						nodeList[triples[triple]["subject"]]["uses"][createClass] = "class";
					}
				}
			} else {
				var createClass = true;
				// if class is defined without identification (from object/data property)
				var addToClass = false;
				
				for(var use in nodeList[triples[triple]["subject"]]["uses"]){
					if(typeof classesTable[use] !== 'undefined'
							&& classesTable[use]["identification"] != null 
							&& classesTable[use]["identification"]["short_name"] == classResolved["short_name"]
					){
						createClass = false;
					} else if(typeof classesTable[use] !== 'undefined' && classesTable[use]["identification"] == null) {
						addToClass = use;
						createClass = false;
					}
				}
				// If more than one class within same scope uses the same name, create different class box for each.
				if(createClass == true && nodeList[triples[triple]["subject"]]["count"] > 1){
					// console.log("CLASS 5", subjectNameParsed["value"], nodeList[triples[triple]["subject"]]);
					classesTable[subjectNameParsed["value"]+counter] = {
						"variableName":triples[triple]["subject"],
						"identification":classResolved,
						"instanceAlias":instanceAlias,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false
					};
					classTableAdded.push(subjectNameParsed["value"]+counter);
					nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed["value"]+counter] = "class";
					counter++;
				}
				// 	If class earlier was defined without identification (from object/data property) - add identification to existing class
				if(addToClass != false){
					// console.log("CLASS 6", addToClass);
					classesTable[addToClass]["identification"] = classResolved;
				}
			}
		} else{
			//if class without definition
			//from data property
			if(schema.resolveAttributeByName(null, triples[triple]["predicate"]) != null && bgptype != "optionalLink" && vq_visual_grammar.parse(triples[triple]["object"])["type"] != "iri"){
				//subjest
				var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"])["value"];
				
				var instanceAlias = generateInstanceAlias(schema, subjectNameParsed);
				
				if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0){
					if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
						if(typeof allClasses[subjectNameParsed] === 'undefined'){
							// If first time used in a query – create new class box.
							classesTable[subjectNameParsed] = {
								"variableName":triples[triple]["subject"],
								"identification":null,
								"instanceAlias":instanceAlias,
								"isVariable":false,
								"isUnit":false,
								"isUnion":false
							};
							classTableAdded.push(subjectNameParsed);
							nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "dataProperty";
							// console.log("CLASS DP 22", subjectNameParsed);
						} else {
							// If defined in all query scope (two or more scope level up) - create new class box with different identification.
							classesTable[subjectNameParsed+counter] = {
								"variableName":triples[triple]["subject"],
								"identification":null,
								"instanceAlias":instanceAlias,
								"isVariable":false,
								"isUnit":false,
								"isUnion":false
							};
							classTableAdded.push(subjectNameParsed+counter);
							nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "dataProperty";
							counter++;
							// console.log("CLASS DP 23", subjectNameParsed);
						}
					} else {
						// If class defined in a parent scope
						for(var use in parentNodeList[triples[triple]["subject"]]["uses"]){
							if(typeof classesTable[use] === 'undefined'){
								classesTable[use] = {
									"variableName":triples[triple]["subject"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(use);
								nodeList[triples[triple]["subject"]]["uses"][use] = "dataProperty";
							}
						}
						// console.log("CLASS DP 24", subjectNameParsed);
						nodeList[triples[triple]["subject"]]["uses"] = parentNodeList[triples[triple]["subject"]]["uses"];
					}
				} 
				if(whereTriplesVaribles[triples[triple]["object"].substring(1)] >1){
					var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"])["value"];
					var instanceAlias = generateInstanceAlias(schema, objectNameParsed);
					if(Object.keys(nodeList[triples[triple]["object"]]["uses"]).length == 0){
						if(typeof parentNodeList[triples[triple]["object"]] === 'undefined'){
							if(typeof allClasses[objectNameParsed] === 'undefined'){
								// If first time used in a query – create new class box.
								classesTable[objectNameParsed] = {
									"variableName":triples[triple]["object"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(objectNameParsed);
								nodeList[triples[triple]["object"]]["uses"][objectNameParsed] = "dataProperty";
								// console.log("CLASS DP 22", objectNameParsed);
							} else {
								// If defined in all query scope (two or more scope level up) - create new class box with different identification.
								classesTable[objectNameParsed+counter] = {
									"variableName":triples[triple]["object"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(objectNameParsed+counter);
								nodeList[triples[triple]["object"]]["uses"][objectNameParsed+counter] = "dataProperty";
								counter++;
								// console.log("CLASS DP 23", objectNameParsed);
							}
						} else {
							// If class defined in a parent scope
							for(var use in parentNodeList[triples[triple]["object"]]["uses"]){
								if(typeof classesTable[use] === 'undefined'){
									classesTable[use] = {
										"variableName":triples[triple]["object"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(use);
									nodeList[triples[triple]["object"]]["uses"][use] = "dataProperty";
								}
							}
							// console.log("CLASS DP 24", objectNameParsed);
							nodeList[triples[triple]["object"]]["uses"] = parentNodeList[triples[triple]["object"]]["uses"];
						}
					}
				}
				
				
			}
			//from object property path
			else if(typeof triples[triple]["predicate"] === "object" && triples[triple]["predicate"]["type"] == "path"){
				
				var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
				if(typeof last_element == "object"){
						last_element = last_element["items"][last_element["items"].length - 1];
				}
				if(schema.resolveLinkByName(last_element) != null){
					//subjest
					var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"])["value"];
						if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0){
							if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
								if(typeof allClasses[subjectNameParsed] === 'undefined'){
									classesTable[subjectNameParsed] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":vq_visual_grammar.parse(triples[triple]["subject"])["value"],
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
									// console.log("CLASS OPP 16", subjectNameParsed);
								} else {
									classesTable[subjectNameParsed+counter] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":vq_visual_grammar.parse(triples[triple]["subject"])["value"],
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed+counter);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OPP 17", subjectNameParsed);
								}
							} else {
								nodeList[triples[triple]["subject"]]["uses"] = parentNodeList[triples[triple]["subject"]]["uses"];
								// console.log("CLASS OPP 18", subjectNameParsed);
							}
						} 
					if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0) nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
					
					//object
					var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"])["value"];
					if(findClassInClassTable(classesTable, objectNameParsed, triples[triple]["object"], nodeList) == null && findClassInClassTable(allClasses, objectNameParsed, triples[triple]["object"], nodeList) == null){
						if(Object.keys(nodeList[triples[triple]["object"]]["uses"]).length == 0){
							if(typeof parentNodeList[triples[triple]["object"]] === 'undefined'){
								if(typeof allClasses[objectNameParsed] === 'undefined'){
									classesTable[objectNameParsed] = {
										"variableName":triples[triple]["object"],
										"identification":null,
										"instanceAlias":vq_visual_grammar.parse(triples[triple]["object"])["value"],
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(objectNameParsed);
									nodeList[triples[triple]["object"]]["uses"][objectNameParsed] = "objectProperty";
									// console.log("CLASS OPP 19", objectNameParsed);
								} else {
									classesTable[objectNameParsed+counter] = {
										"variableName":triples[triple]["object"],
										"identification":null,
										"instanceAlias":vq_visual_grammar.parse(triples[triple]["object"])["value"],
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(objectNameParsed+counter);
									nodeList[triples[triple]["object"]]["uses"][objectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OPP 20", objectNameParsed);
								}
							} else {
								nodeList[triples[triple]["object"]]["uses"] = parentNodeList[triples[triple]["object"]]["uses"];
								// console.log("CLASS OPP 21", objectNameParsed);
							}
						} 

					}
					if(Object.keys(nodeList[triples[triple]["object"]]["uses"]).length == 0) nodeList[triples[triple]["object"]]["uses"][objectNameParsed] = "objectProperty";
				}
				if(schema.resolveAttributeByName(null, last_element) != null){
					//subjest
					var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"])["value"];
						if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0){
							if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
								if(typeof allClasses[subjectNameParsed] === 'undefined'){
									classesTable[subjectNameParsed] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":vq_visual_grammar.parse(triples[triple]["subject"])["value"],
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
									// console.log("CLASS OPP 16", subjectNameParsed);
								} else {
									classesTable[subjectNameParsed+counter] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":vq_visual_grammar.parse(triples[triple]["subject"])["value"],
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed+counter);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OPP 17", subjectNameParsed);
								}
							} else {
								nodeList[triples[triple]["subject"]]["uses"] = parentNodeList[triples[triple]["subject"]]["uses"];
								// console.log("CLASS OPP 18", subjectNameParsed);
							}
						} 
					if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0) nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
				}
			}
			//from object property
			else {//if(schema.resolveLinkByName(triples[triple]["predicate"]) != null || bgptype == "optionalLink"){
				//subjest
				var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"]);
				
				// console.log("ooooooooooooooo", subjectNameParsed, triples[triple])
				
				if(subjectNameParsed["type"] != "number" && subjectNameParsed["type"] != "string" && subjectNameParsed["type"] != "RDFLiteral"){
					subjectNameParsed = subjectNameParsed["value"];
					if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0){
						var instanceAlias = generateInstanceAlias(schema, subjectNameParsed);
						if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
							if(typeof allClasses[subjectNameParsed] === 'undefined'){
								classesTable[subjectNameParsed] = {
									"variableName":triples[triple]["subject"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(subjectNameParsed);
								nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
								// console.log("CLASS OP 10", subjectNameParsed);
							} else {
								classesTable[subjectNameParsed+counter] = {
									"variableName":triples[triple]["subject"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(subjectNameParsed+counter);
								nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "objectProperty";
								counter++;
								// console.log("CLASS OP 11", subjectNameParsed);
							}
						} else {
							for(var use in parentNodeList[triples[triple]["subject"]]["uses"]){
								if(typeof classesTable[use] === 'undefined'){
									classesTable[use] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(use);
									nodeList[triples[triple]["subject"]]["uses"][use] = "dataProperty";
									// console.log("CLASS OP 12", subjectNameParsed, classesTable, parentNodeList, nodeList);
								}
							}
							nodeList[triples[triple]["subject"]]["uses"] = parentNodeList[triples[triple]["subject"]]["uses"];	
						}
					}
				} 
				
				//object
				var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
				
				if(objectNameParsed["type"] != "number" && objectNameParsed["type"] != "string" && objectNameParsed["type"] != "RDFLiteral"){
					objectNameParsed = objectNameParsed["value"];
					if(typeof nodeList[triples[triple]["object"]] === "undefined" || Object.keys(nodeList[triples[triple]["object"]]["uses"]).length == 0){
						if(typeof nodeList[triples[triple]["object"]] === "undefined") nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
						var instanceAlias = generateInstanceAlias(schema, objectNameParsed);
						if(typeof parentNodeList[triples[triple]["object"]] === 'undefined'){
							if(typeof allClasses[objectNameParsed] === 'undefined'){
								classesTable[objectNameParsed] = {
									"variableName":triples[triple]["object"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(objectNameParsed);
								nodeList[triples[triple]["object"]]["uses"][objectNameParsed] = "objectProperty";
								// console.log("CLASS OP 13", objectNameParsed);
							} else {
								classesTable[objectNameParsed+counter] = {
									"variableName":triples[triple]["object"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(objectNameParsed+counter);
								nodeList[triples[triple]["object"]]["uses"][objectNameParsed+counter] = "objectProperty";
								counter++;
								// console.log("CLASS OP 14", objectNameParsed);
							}
						} else {
							for(var use in parentNodeList[triples[triple]["object"]]["uses"]){
								if(typeof classesTable[use] === 'undefined'){
									classesTable[use] = {
										"variableName":triples[triple]["object"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(use);
									nodeList[triples[triple]["object"]]["uses"][use] = "dataProperty";
								}
							}
							nodeList[triples[triple]["object"]]["uses"] = parentNodeList[triples[triple]["object"]]["uses"];
							// console.log("CLASS OP 15", objectNameParsed);
						}
					} 
				}
			}
			
		}
	}

	for(var triple in triples){
		if(triples[triple]["predicate"] != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
			
			//data property
			
			//console.log("whereTriplesVaribles", whereTriplesVaribles);
			// console.log("triples[triple]", triples[triple]);
			// console.log("bgptype", bgptype);
			//console.log("nodeList", nodeList[triples[triple]["object"]]);
			// console.log("nodeList", nodeList[triples[triple]["object"]]["uses"]);
			// console.log("schema", schema.resolveAttributeByName(null, triples[triple]["predicate"]));
			// console.log("findByVariableName", triples[triple]["subject"], classesTable, findByVariableName(classesTable, triples[triple]["subject"]));
			// console.log("findByVariableName", triples[triple]["object"], classesTable, findByVariableName(classesTable, triples[triple]["object"]));
			// console.log("findByVariableName", vq_visual_grammar.parse(triples[triple]["object"])["value"], classesTable, findByVariableName(classesTable, vq_visual_grammar.parse(triples[triple]["object"])["value"]));
			
			
			var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
			
			if((objectNameParsed["type"] == "number" || objectNameParsed["type"] == "string" || objectNameParsed["type"] == "RDFLiteral") 
			||( bgptype != "optionalLink" 
			&& Object.keys(findByVariableName(classesTable, triples[triple]["subject"])).length > 0 
			&& Object.keys(findByVariableName(classesTable, triples[triple]["object"])).length == 0 
			&& Object.keys(findByVariableName(classesTable, vq_visual_grammar.parse(triples[triple]["object"])["value"])).length == 0 
		    && vq_visual_grammar.parse(triples[triple]["object"])["type"] != "iri"
			//&& whereTriplesVaribles[triples[triple]["object"]] <=1
			&& schema.resolveAttributeByName(null, triples[triple]["predicate"]) != null && schema.resolveClassByName(vq_visual_grammar.parse(triples[triple]["object"])["value"]) == null)){
				// console.log("DATA PROPERTY", triples[triple], schema.resolveLinkByName(triples[triple]["predicate"]));
				 
				var alias = "";
				var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
				var attributeResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]);
				if(attributeResolved == null) attributeResolved = schema.resolveLinkByName(triples[triple]["predicate"]);

				// filter as triple
				if(objectNameParsed["type"] == "number" || objectNameParsed["type"] == "string" || objectNameParsed["type"] == "RDFLiteral"){
					exprVariables = [];
					var attrName;
					if(attributeResolved != null) attrName = attributeResolved["short_name"];
					else attrName = generateInstanceAlias(schema, triples[triple]["predicate"]);
					exprVariables.push(attrName);
					filterTable.push({filterString:attrName+ " = " + objectNameParsed["value"], filterVariables:exprVariables});
					
					var classes = findByVariableName(classesTable, triples[triple]["subject"]);

					for (var clazz in classes){
						if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
						classesTable[clazz]["conditions"].push({exp:attrName+ " = " + objectNameParsed["value"], allowMultiplication:false});
					}
				} else{
					//id identification.localName not equeals to subject - use alias
					if(attributeResolved["localName"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
	
					var requireValues = true;
					if(bgptype == "optional") requireValues = false;
					
					var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];

					for(var sclass in subjectClasses){
						var createAttribute = true;
						var schema = new VQ_Schema();
						// if class is in the schema, class does not have given attribute -> do not add attribute to this class
						if (classesTable[sclass]["identification"] != null && Object.keys(subjectClasses).length>1) {
							var all_attributes = schema.findClassByName(classesTable[sclass]["identification"]["short_name"]).getAllAttributes();

							attributeInClass = false;
							for(var attribute in all_attributes){
								if(all_attributes[attribute]["short_name"] == attributeResolved["short_name"]){
									attributeInClass = true;
									break;
								}
							}
							if(attributeInClass == false) createAttribute = false;
						};

						if(createAttribute == true){
							if(typeof attributeTable[objectNameParsed["value"]] === 'undefined'){
								attributeTable[objectNameParsed["value"]] = {
									"class":sclass,
									"variableName":objectNameParsed["value"],
									"identification":attributeResolved,
									"alias":alias,
									"requireValues":requireValues,
									"seen":false
								};
								attributeTableAdded.push(objectNameParsed["value"]);
							} else if(findAttributeInAttributeTable(attributeTable, objectNameParsed["value"], triples[triple]["object"], attributeResolved) == null){
								attributeTable[objectNameParsed["value"]+counter] = {
									"class":sclass,
									"variableName":objectNameParsed["value"],
									"identification":attributeResolved,
									"alias":alias,
									"requireValues":requireValues,
									"seen":false
								};
								attributeTableAdded.push(objectNameParsed["value"]+counter);
								counter++;
							}
						}
					}
				}
			}
			//object property
			else {
				//console.log("OBJECT PROPERTY", triples[triple]);
				
				if (typeof triples[triple]["predicate"] == "string"){
					if(triples[triple]["predicate"].startsWith("?")){
						// for every object usage in nodeList, for elery subject usage in nodeList - create link
						var objectClasses = nodeList[triples[triple]["object"]]["uses"];
						for(var oclass in objectClasses){
							var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
							var linkType = "REQUIRED";
							for(var sclass in subjectClasses){
								var link = {
									"linkIdentification":{localName: "?"+triples[triple]["predicate"], short_name: "?"+triples[triple]["predicate"]},
									"object":oclass,
									"subject":sclass,
									"isVisited":false,
									"linkType":linkType,
									"isSubQuery":false,
									"isGlobalSubQuery":false,
									"isVariable":true,
								}
								linkTable.push(link);
								linkTableAdded.push(link);
							}
						}	
					} else {
						var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]);
						if (bgptype == "optionalLink" && linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]);
						if(linkResolved == null){
							var predicateParsed = vq_visual_grammar.parse(triples[triple]["predicate"])["value"];
							var linkName = generateInstanceAlias(schema, predicateParsed);
						
							linkResolved = {
								"short_name":linkName,
								"localName":linkName,
								"URI":triples[triple]["predicate"],
								"notInSchema": "true"
							}
						}
						var linkType = "REQUIRED";
						// if(bgptype == "optional" || bgptype == "optionalLink") linkType = "OPTIONAL";
						
						if(typeof unionSubject !== 'undefined' && unionSubject != null && triples[triple]["subject"] == unionSubject){
							var link = {
								"linkIdentification":linkResolved,
								"object":triples[triple]["object"],
								"subject":"[ + ]",
								"isVisited":false,
								"linkType":linkType,
								"isSubQuery":false,
								"isGlobalSubQuery":false,
							}
							linkTable.push(link);
							linkTableAdded.push(link);
						}
						else{
							// for every object usage in nodeList, for every subject usage in nodeList - create link
							// if object class has identification and does not has link
							// and subject class has identification and does not has link -> do not create link
							
							var objectClasses = nodeList[triples[triple]["object"]]["uses"];
							for(var oclass in objectClasses){
								
								var createAssociation = true;
								var associationCreated = false;
								var schema = new VQ_Schema();
								
								// if (classesTable[oclass]["identification"] != null) {
									// var all_association = schema.findClassByName(classesTable[oclass]["identification"]["short_name"]).getAllAssociations();
									// var associationInClass = false;
									// for(var association in all_association){
										// if(all_association[association]["short_name"] == linkResolved["short_name"] && all_association[association]["type"] == "<="){
											// associationInClass = true;
											// break;
										// }
									// }
									// var all_association = schema.findClassByName(classesTable[oclass]["identification"]["short_name"]).getAllAttributes();
									// for(var association in all_association){
										// if(all_association[association]["short_name"] == linkResolved["short_name"]){
											// associationInClass = true;
											// break;
										// }
									// }
									// if(associationInClass == false) createAssociation = false;
								// };

								var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];

								for(var sclass in subjectClasses){
									
									// if multiple links with same name to same object and subject, then create only one
									for(var link in linkTableAdded){
										if(classesTable[linkTableAdded[link]["object"]]["instanceAlias"] == classesTable[oclass]["instanceAlias"] &&
										classesTable[linkTableAdded[link]["subject"]]["instanceAlias"] == classesTable[sclass]["instanceAlias"] &&
										linkTableAdded[link]["linkIdentification"]["short_name"] == linkResolved["short_name"]) {
											associationCreated = true;
										}
									}
									if(Object.keys(subjectClasses).length > 1 || Object.keys(objectClasses).length > 1){
										if (classesTable[sclass]["identification"] != null) {
											var all_association = schema.findClassByName(classesTable[sclass]["identification"]["short_name"]).getAllAssociations();
											var associationInClass = false;
											for(var association in all_association){
												if(all_association[association]["short_name"] == linkResolved["short_name"] && all_association[association]["type"] == "=>"){
													associationInClass = true;
													break;
												}
											}
											var all_association = schema.findClassByName(classesTable[sclass]["identification"]["short_name"]).getAllAttributes();
											for(var association in all_association){
												if(all_association[association]["short_name"] == linkResolved["short_name"]){
													associationInClass = true;
													break;
												}
											}
											if(associationInClass == false) createAssociation = false;
										};
									}
									if(associationCreated != true && (createAssociation == true || schema.resolveLinkByName(triples[triple]["predicate"])==null)){
										var link = {
											"linkIdentification":linkResolved,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
										}
										linkTable.push(link);
										linkTableAdded.push(link);
									}
								}
							}
						}
					}
				} else if(typeof triples[triple]["predicate"] == "object"){
					//property path
					if(typeof triples[triple]["predicate"]["type"] !== "undefined" && triples[triple]["predicate"]["type"] == "path"){
						
						var alias = "";

						if(triples[triple]["predicate"]["pathType"] == "/"){
							var pathText = [];
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
										if(linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]["items"][0])
										pathText.push("^" + buildPathElement(linkResolved));
									}
								}
								var linkType = "REQUIRED";
								if(bgptype == "optional") linkType = "OPTIONAL"; 

								var linkResolved = schema.resolveLinkByName(last_element);
								linkResolved["localName"] = pathText.join(".");
								linkResolved["short_name"] = pathText.join(".");
								
								// for every object usage in nodeList, for elery subject usage in nodeList - create link
								if(typeof nodeList[triples[triple]["object"]] !== 'undefined'){
									var objectClasses = nodeList[triples[triple]["object"]]["uses"];
									for(var oclass in objectClasses){
										var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
										for(var sclass in subjectClasses){
											var link = {
												"linkIdentification":linkResolved,
												"object":oclass,
												"subject":sclass,
												"isVisited":false,
												"linkType":linkType,
												"isSubQuery":false,
												"isGlobalSubQuery":false,
											}
											linkTable.push(link);
											linkTableAdded.push(link);
										}
									}
								}
							}
							// attribute
							else if(schema.resolveAttributeByName(null, last_element) != null){
								for(var item in triples[triple]["predicate"]["items"]){
									if(typeof triples[triple]["predicate"]["items"][item] == "string"){
										
										if(item != triples[triple]["predicate"]["items"].length - 1){
											var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]);
											if(linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]);
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
											if(linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]["items"][0]);
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
				
								var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
								for(var sclass in subjectClasses){
									if(typeof attributeTable[objectNameParsed["value"]] === 'undefined'){
										attributeTable[objectNameParsed["value"]] = {
											"class":sclass,
											"variableName":objectNameParsed["value"],
											"identification":attrResolved,
											"alias":alias,
											"requireValues":requireValues,
											"exp":pathText.join("."),
											"seen":false
										};
										attributeTableAdded.push(objectNameParsed["value"]);
									} else if(findAttributeInAttributeTable(attributeTable, objectNameParsed["value"], triples[triple]["object"], attrResolved) == null){
										attributeTable[objectNameParsed["value"]+counter] = {
											"class":sclass,
											"variableName":objectNameParsed["value"],
											"identification":attrResolved,
											"alias":alias,
											"requireValues":requireValues,
											"exp":pathText.join("."),
											"seen":false
										};
										attributeTableAdded.push(objectNameParsed["value"]+counter);
										counter++;
									}
								}
							}	
						} else if(triples[triple]["predicate"]["pathType"] == "^"){
							var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
							var pahtString = "";
							for(var item in triples[triple]["predicate"]["items"]){
								pahtString = pahtString + triples[triple]["predicate"]["items"][item];
							}
							var attrResolved
							var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
							//link
							
							if(schema.resolveLinkByName(last_element) != null){
								attrResolved = schema.resolveLinkByName(last_element);
								attrResolved["localName"] = "^" + attrResolved["localName"];
								attrResolved["short_name"] = "^" + attrResolved["short_name"];
								
								var requireValues = true;
								if(bgptype == "optional") linkType = "OPTIONAL";
								// for every object usage in nodeList, for elery subject usage in nodeList - create link
								var objectClasses = nodeList[triples[triple]["object"]]["uses"];
								for(var oclass in objectClasses){
									var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
									for(var sclass in subjectClasses){
										var link = {
											"linkIdentification":attrResolved,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
										}
										linkTable.push(link);
										linkTableAdded.push(link);
									}
								}	
							} else if(schema.resolveAttributeByName(null, last_element) != null){
								attrResolved = schema.resolveAttributeByName(null, last_element);
								
								//id identification.localName not equeals to subject - use alias
								if(attrResolved["localName"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
								var requireValues = true;
								if(bgptype == "optional") requireValues = false;
								
								var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
								for(var sclass in subjectClasses){
									if(typeof attributeTable[objectNameParsed["value"]] === 'undefined'){
										attributeTable[objectNameParsed["value"]] = {
											"class":sclass,
											"variableName":objectNameParsed["value"],
											"identification":attrResolved,
											"alias":alias,
											"requireValues":requireValues,
											"exp":"^" + buildPathElement(attrResolved),
											"seen":false
										};
										attributeTableAdded.push(objectNameParsed["value"]);
									} else if(findAttributeInAttributeTable(attributeTable, objectNameParsed["value"], triples[triple]["object"], attrResolved) == null){
										attributeTable[objectNameParsed["value"]+counter] = {
											"class":sclass,
											"variableName":objectNameParsed["value"],
											"identification":attrResolved,
											"alias":alias,
											"requireValues":requireValues,
											"exp":"^" + buildPathElement(attrResolved),
											"seen":false
										};
										attributeTableAdded.push(objectNameParsed["value"]+counter);
										counter++;
									}
								}
							}
						} else if(triples[triple]["predicate"]["pathType"] == "+" || triples[triple]["predicate"]["pathType"] == "*" || triples[triple]["predicate"]["pathType"] == "?" || triples[triple]["predicate"]["pathType"] == "!"){
							var propertyPathText = "";
							for(var item in triples[triple]["predicate"]["items"]){
								var temp = generatePropertyPath(schema, triple, triples[triple]["predicate"]["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
								propertyPathText = propertyPathText + temp;
							}
							if(triples[triple]["predicate"]["pathType"] == "!") propertyPathText = triples[triple]["predicate"]["pathType"] + propertyPathText;
							else propertyPathText = propertyPathText + triples[triple]["predicate"]["pathType"];
							
							var linkType = "REQUIRED";
							if(bgptype == "optional") linkType = "OPTIONAL"; 
							linkResolved = {
								"short_name":propertyPathText,
								"localName":propertyPathText,
								"notInSchema": "true"
							}
							// for every object usage in nodeList, for elery subject usage in nodeList - create link
							if(typeof nodeList[triples[triple]["object"]] !== 'undefined'){
								var objectClasses = nodeList[triples[triple]["object"]]["uses"];
								for(var oclass in objectClasses){
									var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
									for(var sclass in subjectClasses){
										var link = {
											"linkIdentification":linkResolved,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
										}
										linkTable.push(link);
										linkTableAdded.push(link);
									}
								}
							}
						} else if(triples[triple]["predicate"]["pathType"] == "|"){
							var propertyPathText = "";
							var propertyPathArray = [];
							for(var item in triples[triple]["predicate"]["items"]){
								var temp = generatePropertyPath(schema, triple, triples[triple]["predicate"]["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
								propertyPathArray.push(temp)
							}
							propertyPathText = propertyPathText + "("+propertyPathArray.join(" | ") + ")";

							var linkType = "REQUIRED";
							if(bgptype == "optional") linkType = "OPTIONAL"; 
							linkResolved = {
								"short_name":propertyPathText,
								"localName":propertyPathText,
								"notInSchema": "true"
							}
							// for every object usage in nodeList, for elery subject usage in nodeList - create link
							if(typeof nodeList[triples[triple]["object"]] !== 'undefined'){
								var objectClasses = nodeList[triples[triple]["object"]]["uses"];
								for(var oclass in objectClasses){
									var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
									for(var sclass in subjectClasses){
										var link = {
											"linkIdentification":linkResolved,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
										}
										linkTable.push(link);
										linkTableAdded.push(link);
									}
								}
							}
						}
						
					}
				}
			}
		}
	}

	return {classesTable:classesTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, attributeTableAdded:attributeTableAdded, filterTable:filterTable, nodeList:nodeList};
}

function generatePropertyPath(schema, triple, predicate, linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList){
	var propertyPathText = "";
	
	if(typeof predicate === "string"){
		var linkResolved = schema.resolveLinkByName(predicate);
		if(linkResolved != null){
			propertyPathText = propertyPathText + buildPathElement(linkResolved);
		} else {
			var predicateParsed = vq_visual_grammar.parse(predicate)["value"];
			var linkName = generateInstanceAlias(schema, predicateParsed);
			propertyPathText = propertyPathText + linkName;
		}
	} else if(predicate["pathType"] == "/"){
		var pathText = [];
		for(var item in predicate["items"]){
			if(typeof predicate["items"][item] == "string"){
				var linkResolved = schema.resolveLinkByName(predicate["items"][item]);
				if(linkResolved != null) pathText.push(buildPathElement(linkResolved));
				else {
					var linkResolved = schema.resolveAttributeByName(null, predicate["items"][item]);
					if(linkResolved != null) pathText.push(buildPathElement(linkResolved));
					else {
						var predicateParsed = vq_visual_grammar.parse(predicate)["value"];
						var linkName = generateInstanceAlias(schema, predicateParsed);
						pathText.push(linkName);
					}
				}
			} 
			// ^
			else if(predicate["items"][item]["type"] == "path" && predicate["items"][item]["pathType"] == "^"){
				var linkResolved = schema.resolveLinkByName(predicate["items"][item]["items"][0]);
				if(linkResolved != null) pathText.push("^" + buildPathElement(linkResolved));
				else {
					var linkResolved = schema.resolveAttributeByName(null, predicate["items"][item]);
					if(linkResolved != null) pathText.push("^" + buildPathElement(linkResolved));
					else {
						var predicateParsed = vq_visual_grammar.parse(predicate)["value"];
						var linkName = generateInstanceAlias(schema, predicateParsed);
						pathText.push("^"+linkName);
					}
				}
			}
		}
		propertyPathText = propertyPathText + pathText.join(".")
	
	} else if(predicate["pathType"] == "^"){
		for(var item in predicate["items"]){
			if(typeof predicate["items"][item] == "string"){
				var linkResolved = schema.resolveLinkByName(predicate["items"][item]);
				if(linkResolved != null) propertyPathText = propertyPathText + "^" + buildPathElement(linkResolved);
				else {
					var linkResolved = schema.resolveAttributeByName(null, predicate["items"][item]);
					if(linkResolved != null) propertyPathText = propertyPathText + "^" + buildPathElement(linkResolved);
					else {
						var predicateParsed = vq_visual_grammar.parse(predicate)["value"];
						var linkName = generateInstanceAlias(schema, predicateParsed);
						propertyPathText = propertyPathText + "^" + linkName;
					}
				}
			} 
			else {
				for(var i in predicate["items"][item]){
					var temp = generatePropertyPath(schema, triple, predicate["items"][item][i], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
					propertyPathText = propertyPathText + temp;
				}
			}
		}
	} else if(predicate["pathType"] == "+" || predicate["pathType"] == "*" || predicate["pathType"] == "?" || predicate["pathType"] == "!"){
		for(var item in predicate["items"]){
			var temp = generatePropertyPath(schema, triple, predicate["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
			propertyPathText = propertyPathText + temp;
		}
		if(predicate["pathType"] == "!") propertyPathText = predicate["pathType"] + propertyPathText;
		else propertyPathText = propertyPathText + predicate["pathType"];
	} else if(predicate["pathType"] == "|"){
		var propertyPathArray = [];
		for(var item in predicate["items"]){
			var temp = generatePropertyPath(schema, triple, predicate["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
			propertyPathArray.push(temp);
		}
		propertyPathText = propertyPathText + "("+propertyPathArray.join(" | ") + ")";
	}
	
	return propertyPathText;
	
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
	"MD5", "SHA1", "SHA256", "SHA512", "isIRI", "isURI", "isLITERAL", "isNUMERIC", "dateTime", "date", "BOUND"]
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
	
	var fieldExists = false;
	for(var field in classesTable["fields"]){
		if(classesTable["fields"][field]["alias"] == identification["alias"] && classesTable["fields"][field]["exp"] == identification["exp"]){
			fieldExists = true;
			break;
		}
	}
	
	if(fieldExists == false )classesTable["fields"].push(identification);
	return classesTable;
}

function addAggrigateToClass(classesTable, identification){	
	if(typeof classesTable["aggregations"] === 'undefined')classesTable["aggregations"] = [];
	classesTable["aggregations"].push(identification);
	return classesTable;
}

// Generate tree like ViziQuer query structure, from class and link tables 
function generateClassCtructure(clazz, className, classesTable, linkTable, whereTriplesVaribles, visitedClasses){
	// In link table find all links with a subject or an object as given the class. Add class from opposite link end and link information, as given class children.
	for(var linkName in linkTable){
		if(typeof linkTable[linkName]["isConditionLink"] === 'undefined'){
			if(linkTable[linkName]["subject"] == className && linkTable[linkName]["isVisited"] == false){
				linkTable[linkName]["isVisited"] = true;
				var tempAddClass = addClass(classesTable[linkTable[linkName]["object"]], linkTable[linkName], linkTable[linkName]["object"], linkTable[linkName]["linkIdentification"], false, classesTable, linkTable, whereTriplesVaribles, visitedClasses);
				visitedClasses = tempAddClass["visitedClasses"];
				if(typeof visitedClasses[linkTable[linkName]["object"]] === 'undefined' || visitedClasses[linkTable[linkName]["object"]] != true){
					clazz["children"] = addChildren(clazz);
					var childerenClass = tempAddClass["childrenClass"];
		
					// if child and parent are connected with plain link or optional without filters
					// if child has no identification (is not defined class)
					// if child has no attributes or one attribute "(select this)"
					// if child has no aggregation fields
					// if child instance alias is variable, not URI
					// if child variable is used once in a query
					// transform child class into parent class attribute
					
					if(childerenClass["identification"] == null 
					&& (typeof whereTriplesVaribles[childerenClass["instanceAlias"]] !== 'undefined' && whereTriplesVaribles[childerenClass["instanceAlias"]] == 1)
					&& (((linkTable[linkName]["linkType"] == "OPTIONAL" && typeof childerenClass["conditions"] === 'undefined') || linkTable[linkName]["linkType"] == "REQUIRED") && linkTable[linkName]["isSubQuery"] == false && linkTable[linkName]["isGlobalSubQuery"] == false)
					&& typeof childerenClass["children"] === 'undefined'
					&& (typeof childerenClass["fields"] === 'undefined' || (childerenClass["fields"].length == 1 && childerenClass["fields"][0]["exp"] == "(select this)"))
					&& typeof childerenClass["aggregations"] === 'undefined'
					&& linkTable[linkName]["linkIdentification"]["short_name"].indexOf(")*") === -1
					&& linkTable[linkName]["linkIdentification"]["short_name"].indexOf("|") === -1
					){	
						var exp = linkTable[linkName]["linkIdentification"]["short_name"];
						if(exp.startsWith("http://") || exp.startsWith("https://")) exp = "<" +exp+ ">";
						var requred = true;
						if(linkTable[linkName]["linkType"] == "OPTIONAL") requred = false;
						var internal = true;
						if(typeof childerenClass["fields"] !== 'undefined' && childerenClass["fields"].length == 1 && childerenClass["fields"][0]["exp"] == "(select this)")internal = false;
						
						var attrAlias = childerenClass["instanceAlias"];
						if(attrAlias == exp) attrAlias = "";
						
						
						var attributeInfo = {
							"alias":attrAlias,
							"identification":null,
							"exp":exp,
							"requireValues":requred,
							"isInternal":internal
						}
						clazz = addAttributeToClass(clazz, attributeInfo);
						
						for(var condition  in childerenClass["conditions"]){
							if(typeof clazz["conditions"] === 'undefined') {
								clazz["conditions"] = [];
								clazz["conditions"].push(childerenClass["conditions"][condition]);
							}
							var included = false;
							for(var con in clazz["conditions"]){
								if(clazz["conditions"][con]["exp"].includes(childerenClass["conditions"][condition]["exp"])) {
									included = true;
									break;
								}
							}
							if(!included) clazz["conditions"].push(childerenClass["conditions"][condition]); 
						}

						if(typeof childerenClass["groupByThis"] !== 'undefined' && childerenClass["groupByThis"] == true) {
							var group = exp;
							if(childerenClass["instanceAlias"] != null && childerenClass["instanceAlias"] != "") group = childerenClass["instanceAlias"];
							if(typeof clazz["groupings"] === "undefined") clazz["groupings"] = [];
							clazz["groupings"].push(group);
						}
					}
					else {
						clazz["children"].push(childerenClass);
						// childerenClass["isVisited"] = true;
						visitedClasses[linkTable[linkName]["object"]] = true;
					}
				}

			} else if(linkTable[linkName]["object"] == className && linkTable[linkName]["isVisited"] == false){
				linkTable[linkName]["isVisited"] = true;
				clazz["children"] = addChildren(clazz);
				var tempAddClass = addClass(classesTable[linkTable[linkName]["subject"]],linkTable[linkName], linkTable[linkName]["subject"],  linkTable[linkName]["linkIdentification"], true, classesTable, linkTable, whereTriplesVaribles, visitedClasses)
				visitedClasses = tempAddClass["visitedClasses"];
				if(typeof visitedClasses[linkTable[linkName]["subject"]] === 'undefined' || visitedClasses[linkTable[linkName]["subject"]] != true){
					var childerenClass = tempAddClass["childrenClass"];
					
					clazz["children"].push(childerenClass);
					// childerenClass["isVisited"] = true;
					visitedClasses[linkTable[linkName]["subject"]] = true;
					
				}
			}
		} else {
			// condition links
			if(linkTable[linkName]["subject"] == className && linkTable[linkName]["isVisited"] == false){
				linkTable[linkName]["isVisited"] = true;
				var conditinClass = classesTable[linkTable[linkName]["subject"]];
				conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
				conditinClass["conditionLinks"].push(addConditinClass(linkTable[linkName], linkTable[linkName]["object"], true, false));
			} else if(linkTable[linkName]["object"] == className && linkTable[linkName]["isVisited"] == false){
				var conditinClass = classesTable[linkTable[linkName]["object"]];
				linkTable[linkName]["isVisited"] = true;
				conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
				conditinClass["conditionLinks"].push(addConditinClass(linkTable[linkName], linkTable[linkName]["subject"], false, false));
			}
		}
	}
	return clazz;
}

function addChildren(clazz){
	if(typeof clazz["children"] === 'undefined') clazz["children"] = [];
	return clazz["children"];
}
function addConditionLinks(clazz){
	if(typeof clazz["conditionLinks"] === 'undefined') clazz["conditionLinks"] = [];
	return clazz["conditionLinks"];
}

function addClass(childrenClass, linkInformation, childrenClassName, linkIdentification, isInverse, classesTable, linkTable, whereTriplesVaribles, visitedClasses){

	childrenClass["isInverse"] = isInverse;
	childrenClass["linkIdentification"] = linkInformation["linkIdentification"];
	childrenClass["linkType"] = linkInformation["linkType"];
	childrenClass["isSubQuery"] = linkInformation["isSubQuery"];
	childrenClass["isGlobalSubQuery"] = linkInformation["isGlobalSubQuery"];;
	childrenClass = generateClassCtructure(childrenClass, childrenClassName, classesTable, linkTable, whereTriplesVaribles, visitedClasses);

	return {childrenClass:childrenClass, visitedClasses:visitedClasses};
}

function addConditinClass(linkInformation, targetClass, isInverse, isNot){
	var conditionLink = {}
	conditionLink["isInverse"] = isInverse;
	conditionLink["identification"] = linkInformation["linkIdentification"];
	conditionLink["isNot"] = isNot;
	conditionLink["target"] = targetClass;
	
	return conditionLink;
}

// Decide which class is a query start class
function getStartClass(classesTable, linkTable) {
  
  // If class has aggregation inside and no incoming subquery links or if no aggregations in a query, use first class appeared.
  // collect classes with aggregations inside, from the main query 
  var classesWithAggregations = [];
  for (var clazz in classesTable){
    if(typeof classesTable[clazz]["aggregations"] !== 'undefined' && classesTable[clazz]["aggregations"] != null){
		var underSubQuery = false;
		for (var link in linkTable){
			if((linkTable[link]["object"] == clazz || linkTable[link]["subject"] == clazz) && (linkTable[link]["isSubQuery"] == true || linkTable[link]["isGlobalSubQuery"] == true)){
				underSubQuery = true;
				break;
			}
		}
		if(underSubQuery == false) classesWithAggregations.push({"name":clazz, "class":classesTable[clazz]});
	}
  }
  
  if(classesWithAggregations.length > 1){
	var mainClass = classesWithAggregations[0];
	for (i = 1; i < classesWithAggregations.length; i++) {
		var aggregations = classesWithAggregations[i]["class"]["aggregations"];
		for(var aggr in aggregations){
			if(aggregations[aggr]["exp"].toLowerCase() == "count(.)"){
				// classesTable[mainClass["name"]]["aggregations"].push({exp:"count(" + classesWithAggregations[i]["name"] + ")", alias:aggregations[aggr]["alias"]});
				var cn = classesWithAggregations[i]["class"]["instanceAlias"];
				if(typeof cn === 'undefined' || cn == null) cn = classesWithAggregations[i]["class"]["identification"]["short_name"];
				classesTable[mainClass["name"]] = addAggrigateToClass(classesTable[mainClass["name"]], {exp:"count(" + cn + ")", alias:aggregations[aggr]["alias"]});
			} else if(aggregations[aggr]["exp"].toLowerCase() == "count_distinct(.)"){
				// classesTable[mainClass["name"]]["aggregations"].push({exp:"count(" + classesWithAggregations[i]["name"] + ")", alias:aggregations[aggr]["alias"]});
				var cn = classesWithAggregations[i]["class"]["instanceAlias"];
				if(typeof cn === 'undefined' || cn == null) cn = classesWithAggregations[i]["class"]["identification"]["short_name"];
				classesTable[mainClass["name"]] = addAggrigateToClass(classesTable[mainClass["name"]], {exp:"count_distinct(" + cn + ")", alias:aggregations[aggr]["alias"]});
			} else {
				// classesTable[mainClass["name"]]["aggregations"].push(aggregations[aggr]);
				classesTable[mainClass["name"]] = addAggrigateToClass(classesTable[mainClass["name"]], aggregations[aggr]);
			}
		}
		classesTable[classesWithAggregations[i]["name"]]["aggregations"] = null;
	}
	
	return {startClass:mainClass, classesTable:classesTable}
  }
  
  if(classesWithAggregations.length == 1){
	return {startClass:classesWithAggregations[0], classesTable:classesTable}
  }
  
  for (var clazz in classesTable){ 
	return {startClass:{"name":clazz, "class":classesTable[clazz]}, classesTable:classesTable};
  }
}

function getAllVariablesInQuery(expression, schema, variableTable){
	// var variableTable = [];
	for(var key in expression){
		if(typeof expression[key] === 'object'){
			if(key == 'variables'){
				var variables = expression[key];
				for(var variable in variables){
					
					if(typeof variables[variable] === 'string' && schema.resolveClassByName(vq_visual_grammar.parse(variables[variable])["value"]) == null){
						variableTable[variables[variable]] = 0;
					} else if(typeof variables[variable] === 'object'){
						variableTable[variables[variable]["variable"]] = 1;
					}
				}
			}
			var temp = getAllVariablesInQuery(expression[key], schema, variableTable);
			for(var t in temp){
				variableTable[t] = temp[t];
			}
		} else if(typeof expression[key] === 'string' && expression[key].startsWith("?")) {
			if(typeof variableTable[expression[key]] !== 'undefined') {
				variableTable[expression[key]] = variableTable[expression[key]] + 1;
			}
		}
	}
	return variableTable;
}

function checkIfOrAndInFilter(expression, value){
	if(expression["type"] == 'operation' && (expression["operator"] == "||" || expression["operator"] == "&&")){
		value = true;
	}
	for(var key in expression){
		if(typeof expression[key] === 'object'){
			var temp = checkIfOrAndInFilter(expression[key], value);
			if(temp == true) value = true;
		}
	}
	return value;
}

function buildPathElement(pathElement){
	if(pathElement["Prefix"] == "") return pathElement["localName"];
	else return pathElement["Prefix"]+":"+pathElement["localName"];
}

// Visualize query based on tree structure
function visualizeQuery(clazz, parentClass, queryId, queryQuestion){
	//node type
	var nodeType = "condition";
	if(parentClass == null) nodeType = "query";

	//instanceAlias
	var instanceAlias = clazz["instanceAlias"];

	//name
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
		// console.log("classIdentification = ", clazz["identification"]);
		//class not in a schema 
		if(clazz["identification"] != null && typeof clazz["identification"]["notInSchema"] !== 'undefined' && clazz["identification"]["notInSchema"] != "variable"){
			if(queryId != null || queryQuestion != null){
				classBox.setComment("Class not in the data schema;\nID = " + queryId + ",\nQuestion = " + queryQuestion);
			} else classBox.setComment("Class not in the data schema");
		} else if(queryId != null || queryQuestion != null){
			classBox.setComment("ID = " + queryId + ",\nQuestion = " + queryQuestion);
		}

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
			classBox.addAggregateField(expression, alias,false);
			// console.log("  alias = ", alias);
			// console.log("  expression = ", expression);
		})

		// console.log("CONDITIONS");
		//conditions

		clazz["conditions"] = removeDuplicateConditions(clazz["conditions"]);
		
		_.each(clazz["conditions"],function(condition) {
			var expression = condition["exp"];

			//add condition to class
			classBox.addCondition(expression, condition["allowMultiplication"]);
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
		
		if(typeof clazz["groupByThis"] !== 'undefined') classBox.setGroupByThis(clazz["groupByThis"]);
		
		//groupBy
		_.each(clazz["groupings"],function(group) {
			var expression = group["exp"];
			var isDescending = group["isDescending"];

			//add group to class
			classBox.addGrouping(group);
		})

		//distinct
		var distinct = clazz["distinct"];
		classBox.setDistinct(distinct);
		// console.log("distinct = ", distinct);
		
		//selectAll
		var selectAll = clazz["selectAll"];
		if(typeof selectAll === "undefined") selectAll = false;
		classBox.setSelectAll(selectAll);

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
	
            //Link Coordinates
            var coordX = newPosition.x + Math.round(newPosition.width/2);
            var coordY = oldPosition.y + oldPosition.height;
            var locLink = [];

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
		// console.log("CONDITION LINKS", clazz["conditionLinks"]);
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
	}, newPosition);
}

function generateInstanceAlias(schema, uri){
	var splittedUri = splitURI(uri);
	if(splittedUri == null) return uri;
	
	var prefixes = schema.getPrefixes()
	for(var key in prefixes){
		if(prefixes[key][1] == splittedUri.namespace) {
			if(prefixes[key][0].slice(-1) == ":") return prefixes[key][0]+splittedUri.name;
			return prefixes[key][0]+":"+splittedUri.name;
		}
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

function removeDuplicateLinks(linkTable){
	var newLinkTable = [];
	for(var link in linkTable){
		var linkExists = false;
		for(var newLink in newLinkTable){
			if(linkTable[link]["object"] == newLinkTable[newLink]["object"] &&
			linkTable[link]["subject"] == newLinkTable[newLink]["subject"] &&
			linkTable[link]["isSubQuery"] == newLinkTable[newLink]["isSubQuery"] &&
			linkTable[link]["isGlobalSubQuery"] == newLinkTable[newLink]["isGlobalSubQuery"] &&
			linkTable[link]["isGlobalSubQuery"] == newLinkTable[newLink]["isGlobalSubQuery"] &&
			((typeof linkTable[link]["linkIdentification"]  === 'undefined' && typeof newLinkTable[newLink]["linkIdentification"] === 'undefined') ||
			typeof linkTable[link]["linkIdentification"]  !== 'undefined' && typeof newLinkTable[newLink]["linkIdentification"] !== 'undefined'
			&& linkTable[link]["linkIdentification"]["short_name"] == newLinkTable[newLink]["linkIdentification"]["short_name"])
			) {
				linkExists = true;
				break;
			}
		}
		if(linkExists == false) newLinkTable.push(linkTable[link]);
	}
	return newLinkTable;
}

function removeParrentQueryClasses(parentNodeList, classesTable, classTableTemp, linkTableTemp, attributeTable){
	var unionClassTable = [];
	for(var clazz in classesTable){
		if(typeof classTableTemp[clazz] === 'undefined') unionClassTable[clazz] = classesTable[clazz];
		else if(typeof parentNodeList[classTableTemp[clazz]["variableName"]] !== 'undefined'){
			var classWithAttribute = false;
			
			for(var attribute in attributeTable){
				if(attributeTable[attribute]["class"] == clazz) {
					classWithAttribute = true;
					break;
				}
			} 
			
			if(classWithAttribute == true) unionClassTable[clazz] = classesTable[clazz];
		} else unionClassTable[clazz] = classesTable[clazz];
	}

	return unionClassTable
}

function relinkUnionLink(classesTable, linkTable, unionClass){
	
	var relinkt = false;
	for(var link in linkTable){
		if(linkTable[link]["subject"] != unionClass && linkTable[link]["object"] != unionClass && typeof classesTable[linkTable[link]["object"]] === "undefined"){
			
			linkTable[link]["object"] = unionClass;
			relinkt = true;
		} else if(linkTable[link]["object"] != unionClass && linkTable[link]["subject"] != unionClass &&  typeof classesTable[linkTable[link]["subject"]] === "undefined"){
			
			linkTable[link]["subject"] = unionClass;
			relinkt = true;
		}
	}
	
	return {linkTable:linkTable, relinkt:relinkt}
}

function checkIfClassHasAttributes(clazz, attributeTable){

	for(attribute in attributeTable){
		if(attributeTable[attribute]["class"] == clazz) return true;
	}
	
	return false;
}

function removeClass(classesTable, clazz){
	var classT = [];
	for(var c in classesTable){
		if(c != clazz) classT[c] = classesTable[c];
	}
	return classT;
}

function getWhereTriplesVaribles(where){
	var variableList = [];
	
	for(var key in where){
		if(typeof where[key]["type"] !== "undefined" && where[key]["type"] == "bgp"){
			// console.log(where[key]);
			var triples = where[key]["triples"];
			for(var triple in triples){
				
				var subject = vq_visual_grammar.parse(triples[triple]["subject"]);
				var object = vq_visual_grammar.parse(triples[triple]["object"]);
				if(subject["type"] == "varName"){
					if(typeof variableList[subject["value"]] === "undefined") variableList[subject["value"]] = 1;
					else variableList[subject["value"]] = variableList[subject["value"]] + 1;
				}
				if(object["type"] == "varName"){
					if(typeof variableList[object["value"]] === "undefined") variableList[object["value"]] = 1;
					else variableList[object["value"]] = variableList[object["value"]] + 1;
				}
			}
		}else if(typeof where[key] === 'object'){
			var temp = getWhereTriplesVaribles(where[key]);
			for(var variable in temp){
				if(typeof variableList[variable] === "undefined") variableList[variable] = temp[variable];
					else variableList[variable] = variableList[variable] + temp[variable];
			}
		}
	}
	return variableList;
}

function getWhereTriplesPlainVaribles(where){
	var variableList = [];
	
	for(var key in where){
		if(typeof where[key]["type"] !== "undefined" && where[key]["type"] == "bgp"){
			// console.log(where[key]);
			var triples = where[key]["triples"];
			for(var triple in triples){
				
				var subject = vq_visual_grammar.parse(triples[triple]["subject"]);
				var object = vq_visual_grammar.parse(triples[triple]["object"]);
				if(subject["type"] == "varName"){
					if(typeof variableList[subject["value"]] === "undefined") variableList[subject["value"]] = 1;
					else variableList[subject["value"]] = variableList[subject["value"]] + 1;
				}
				if(object["type"] == "varName"){
					if(typeof variableList[object["value"]] === "undefined") variableList[object["value"]] = 1;
					else variableList[object["value"]] = variableList[object["value"]] + 1;
				}
			}
		} else if(where[key]["type"] == "optional" && where[key]["patterns"].length == 1 && typeof where[key]["patterns"][0]["type"] != "undefined" && where[key]["patterns"][0]["type"] == "bgp"){
			
			var triples = where[key]["patterns"][0]["triples"];
			for(var triple in triples){
				
				var subject = vq_visual_grammar.parse(triples[triple]["subject"]);
				var object = vq_visual_grammar.parse(triples[triple]["object"]);
				if(subject["type"] == "varName"){
					if(typeof variableList[subject["value"]] === "undefined") variableList[subject["value"]] = 1;
					else variableList[subject["value"]] = variableList[subject["value"]] + 1;
				}
				if(object["type"] == "varName"){
					if(typeof variableList[object["value"]] === "undefined") variableList[object["value"]] = 1;
					else variableList[object["value"]] = variableList[object["value"]] + 1;
				}
			}
		}
	}
	return variableList;
}

function removeDuplicateConditions(conditions){
	var c = [];
	for(var con in conditions){
		c[conditions[con]["exp"]] = conditions[con];
	}
	var cc = [];
	for(var con in c){
		cc.push(c[con])
	}
	return cc
}