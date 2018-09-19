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
	//var filterTable = [];
	var linkTable = [];
	var orderTable = [];

	//where
	var where = parsedQuery["where"];
	for(var key in where){
		var wherePartTemp = parseSPARQLjsStructureWhere(where[key], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, false);
		classesTable = wherePartTemp["classesTable"];
		attributeTable = wherePartTemp["attributeTable"];
		linkTable = wherePartTemp["linkTable"];
		//filterTable = filterTable.concat(wherePartTemp["filterTable"]);
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
					"exp":parsedClass
				}
				classesTable[variables[key]] = addAttributeToClass(classesTable[variables[key]], attributeInfo);
			}
			//property
			else if(typeof attributeTable[vq_visual_grammar.parse(variables[key])["value"]] !== 'undefined') {
				// add attribute
				var parsedAttribute = vq_visual_grammar.parse(variables[key])["value"]

				var attributeInfoTemp = attributeTable[parsedAttribute];
				var attributeInfo = {
					"alias":attributeInfoTemp["alias"],
					"identification":attributeInfoTemp["identification"],
					"requireValues":attributeInfoTemp["requireValues"],
					"isInternal":false,
					"groupValues":false,
					"exp":attributeInfoTemp["identification"]["localName"]
				}
				classesTable[attributeTable[parsedAttribute]["class"]] = addAttributeToClass(classesTable[attributeTable[parsedAttribute]["class"]], attributeInfo);
				attributeTable[parsedAttribute]["seen"] = true;
			}
			//reference
			else if(typeof variableList[variables[key]] !== 'undefined'){
				var parsedAttribute = vq_visual_grammar.parse(variables[key])["value"];
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
					var aggregateInfo = {
						"exp":aggregationExp,
						"alias":alias
					}
					classesTable[expression["expression"]] = addAggrigateToClass(classesTable[expression["expression"]], aggregateInfo);
					
				}
				//aggregate on attribute
				else if(typeof attributeTable[aggregateExpression] !== 'undefined') {
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
				
				var temp = parseSPARQLjsStructureWhere(expression, classesTable, attributeTable, linkTable, "plain", allClasses, variableList, false);
				//	viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				var variable;
				for(var exprVar in temp["viziQuerExpr"]["exprVariables"]){
					variable = temp["viziQuerExpr"]["exprVariables"][exprVar];
					break;
				}
				var attributeInfo = {
					"alias":vq_visual_grammar.parse(variables[key]["variable"])["value"],
					"identification":null,
					"requireValues":false,
					"isInternal":false,
					"groupValues":false,
					"exp":temp["viziQuerExpr"]["exprString"]
				}
				
				classesTable[attributeTable[variable]["class"]] = addAttributeToClass(classesTable[attributeTable[variable]["class"]], attributeInfo);
			}
		}
	}

	//internal attributes
	for(var attribute in attributeTable){
		if(attributeTable[attribute]["seen"] != true){
			var attributeInfoTemp = attributeTable[attribute];
			var attributeInfo = {
					"alias":attributeInfoTemp["alias"],
					"identification":attributeInfoTemp["identification"],
					"requireValues":attributeInfoTemp["requireValues"],
					"isInternal":true,
					"groupValues":false,
					"exp":attributeInfoTemp["identification"]["localName"]
				}
			classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);

		}
	}

	//return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, orderTable:orderTable};
	return {classesTable:classesTable,  attributeTable:attributeTable, linkTable:linkTable, orderTable:orderTable};
}

function parseSPARQLjsStructureWhere(where, classesTable, attributeTable, linkTable, bgptype, allClasses, variableList, underExists){
	var viziQuerExpr = {
		"exprString" : "",
		"exprVariables" : []
	};
	var linkTableAdded = [];
	var classTableAdded = [];
	var attributeTableAdded = [];
	//var filterTable = [];
	
	if(typeof where === 'string'){
		var arg1 = generateArgument(where);
		if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
		viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
	}
	
	//type=bgp
	if(where["type"] == "bgp"){
		var triples = where["triples"];
		var temp = generateTypebgp(triples, classesTable, attributeTable, linkTable, bgptype, allClasses);
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		linkTable = temp["linkTable"];
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
		}

		for(var pattern in patterns){
			var temp = parseSPARQLjsStructureWhere(patterns[pattern], classesTable, attributeTable, linkTable, bgptype, allClasses, variableList, underExists);
			classesTable = temp["classesTable"];
			attributeTable = temp["attributeTable"];
			//linkTable = temp["linkTable"];
			//filterTable = filterTable.concat(temp["filterTable"]);
			linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
			classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
			attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
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
		var temp = parseSPARQLjsStructureWhere(where["expression"], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, underExists);
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
		//filterTable = filterTable.concat(temp["filterTable"]);

		viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
		viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);

		if(underExists == false){
			for(var fil in viziQuerExpr["exprVariables"]){
				var className;
				if(typeof  attributeTable[viziQuerExpr["exprVariables"][fil]] != 'undefined') className = attributeTable[viziQuerExpr["exprVariables"][fil]]["class"];
				else{
					for(var clazz in classesTable){
						className = clazz;
						break;
					}
				}
				if(typeof classesTable[className]["conditions"] === 'undefined') classesTable[className]["conditions"] = [];
				classesTable[className]["conditions"].push(viziQuerExpr["exprString"]);
			}
		}
		if(typeof className !== 'undefined'){
			classesTable[className]["conditions"] = classesTable[className]["conditions"].filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			});
		}
	}

	if(where["type"] == "operation"){
		// || or &&
		if(where["operator"] == "||" || where["operator"] == "&&"){
			var exprStringTemp = [];
			for(var arg in where["args"]){
				var temp = parseSPARQLjsStructureWhere(where["args"][arg], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, underExists);
				exprStringTemp.push(temp["viziQuerExpr"]["exprString"]);
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ exprStringTemp.join(" " + where["operator"] + " ");	
		}
		//realtion or atithmetic
		else if(checkIfRelation(where["operator"]) != -1 || chechIfArithmetic(where["operator"]) != -1){
			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, underExists);
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
				var temp = parseSPARQLjsStructureWhere(where["args"][1], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, underExists);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		// in or not in
		else if(where["operator"] == "in" || where["operator"] == "notin"){
			var operator;
			if(where["operator"] == "in") operator = " IN (";
			else operator = " NOT IN (";
			
			var arg1 = generateArgument(where["args"][0]);
			if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"] + operator;
			
			var exprStringTemp = [];
			for(var arg in where["args"][1]){
				
				var arg1 = generateArgument(where["args"][1][arg]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				exprStringTemp.push(arg1["value"]);
				
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ exprStringTemp.join(", ") + ")";
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
				var temp = parseSPARQLjsStructureWhere(where["args"][0], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, underExists);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";

		}//two argumentFunctions
		else if(checkIfTwoArgunemtFunctuion(where["operator"]) != -1){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";

			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1["value"];
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = parseSPARQLjsStructureWhere(where["args"][0], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, underExists);
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
				var temp = parseSPARQLjsStructureWhere(where["args"][1], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, underExists);
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";

		}
		//regex / substr / replace / if
		else if(where["operator"] == "regex" || where["operator"] == "substr" || where["operator"] == "replace" || where["operator"] == "if"){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ where["operator"] +"(";
			var exprStringTemp = [];
			for(var arg in where["args"]){
				
				//var arg1 = generateArgument(where["args"][arg]);
				//if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				//exprStringTemp.push(arg1["value"]);
				
				var temp = parseSPARQLjsStructureWhere(where["args"][arg], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, underExists);
				exprStringTemp.push(temp["viziQuerExpr"]["exprString"]);
				//viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ exprStringTemp.join(", ") + ")";
		}
		//not exists
		else if(where["operator"] == "notexists" || where["operator"] == "exists"){
			
			for(var arg in where["args"]){
				if(where["args"][arg]["type"] == 'group'){
					var patterns =  where["args"][arg]["patterns"];
					for(var pattern in patterns){
						var temp = parseSPARQLjsStructureWhere(patterns[pattern], classesTable, attributeTable, linkTable, bgptype, allClasses, variableList, true);
						classesTable = temp["classesTable"];
						attributeTable = temp["attributeTable"];
						//linkTable = temp["linkTable"];
						//filterTable = filterTable.concat(temp["filterTable"]);
						linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
						classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
						attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);

						 viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
						 viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					}
				 } else{
					var temp = parseSPARQLjsStructureWhere(where["args"][arg], classesTable, attributeTable, linkTable, bgptype, allClasses, variableList, true);
					classesTable = temp["classesTable"];
					attributeTable = temp["attributeTable"];
					//filterTable = filterTable.concat(temp["filterTable"]);
					linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
					classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
					attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
					
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
					viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				 }
				 
				var prefix = "";
			
				if(classTableAdded.length == 0){
					if(where["operator"] == "notexists") prefix = "NOT EXISTS ";
					else prefix = "EXISTS ";
				}
				 
				if(viziQuerExpr["exprString"] != "" ) viziQuerExpr["exprString"] = prefix + viziQuerExpr["exprString"];
			}
			
			for(link in linkTableAdded){
				if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
					if(where["operator"] == "notexists")linkTableAdded[link]["linkType"] = "NOT";
					if(where["operator"] == "exists")linkTableAdded[link]["isSubQuery"] = true;
					for(attr in attributeTableAdded){
						var attributeInfoTemp = attributeTable[attributeTableAdded[attr]];
						var attributeInfo = {
							"alias":attributeInfoTemp["alias"],
							"identification":attributeInfoTemp["identification"],
							"requireValues":attributeInfoTemp["requireValues"],
							"isInternal":false,
							"groupValues":false,
							"exp":attributeInfoTemp["identification"]["localName"]
						}
						classesTable[attributeTable[attributeTableAdded[attr]]["class"]] = addAttributeToClass(classesTable[attributeTable[attributeTableAdded[attr]]["class"]], attributeInfo);
						attributeTable[attributeTableAdded[attr]]["seen"] = true;
					}
				}
			}
			linkTable = linkTable.concat(linkTableAdded);
			
			console.log("viziQuerExpr[exprString]", viziQuerExpr["exprString"]);
			console.log("classTableAdded", classTableAdded);
		}
	}
	if(where["type"] == "group"){

		var abstractTable = generateAbstractTable(where["patterns"][0], classesTable, variableList);
		
		console.log("abstractTable", abstractTable);
		
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


		abstractTable["classesTable"][subSelectMainClass]["orderings"] = abstractTable["orderTable"];
		if(typeof where["patterns"][0]["limit"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["limit"] =  where["patterns"][0]["limit"];
		if(typeof where["patterns"][0]["offset"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["offset"] =  where["patterns"][0]["offset"];
		if(typeof where["patterns"][0]["distinct"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["distinct"] =  where["patterns"][0]["distinct"];

		for(subClass in abstractTable["classesTable"]){
			classesTable[subClass] = abstractTable["classesTable"][subClass];
		}

	//	visualizeQuery(abstractTable["classesTable"]["root"], null);
	}
	if(where["type"] == "bind"){
		var temp = parseSPARQLjsStructureWhere(where["expression"], classesTable, attributeTable, linkTable, "plain", allClasses, variableList, underExists);
		//viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
		//viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
		
		var variable;
		for(var exprVar in temp["viziQuerExpr"]["exprVariables"]){
			variable = temp["viziQuerExpr"]["exprVariables"][exprVar];
			break;
		}
		
		var requireValues = true;
		if(bgptype == "optional") requireValues = false;

		attributeTable[vq_visual_grammar.parse(where["variable"])["value"]] = {
			"class":attributeTable[variable]["class"],
			"identification":{"localName":temp["viziQuerExpr"]["exprString"]},
			"alias":vq_visual_grammar.parse(where["variable"])["value"],
			"requireValues":false,
			"seen":false
		};
		attributeTableAdded.push(temp["viziQuerExpr"]["exprString"]);
		
		/*var variable;
		for(var exprVar in temp["viziQuerExpr"]["exprVariables"]){
			variable = temp["viziQuerExpr"]["exprVariables"][exprVar];
			break;
		}
		
		var attributeInfo = {
			"alias":vq_visual_grammar.parse(where["variable"])["value"],
			"identification":null,
			"requireValues":false,
			"isInternal":false,
			"groupValues":false,
			"exp":temp["viziQuerExpr"]["exprString"]
		}
		classesTable[attributeTable[variable]["class"]] = addAttributeToClass(classesTable[attributeTable[variable]["class"]], attributeInfo);*/

	}
	//console.log("RETURN filterTable", filterTable);
	
	//return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, viziQuerExpr:viziQuerExpr, attributeTableAdded:attributeTableAdded};
	return {classesTable:classesTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, viziQuerExpr:viziQuerExpr, attributeTableAdded:attributeTableAdded};
}

function generateTypebgp(triples, classesTable, attributeTable, linkTable, bgptype, allClasses){
	var linkTableAdded = [];
	var classTableAdded = [];
	var attributeTableAdded = [];

	var schema = new VQ_Schema();
	for(var triple in triples){

		//class definitions
		if(triples[triple]["predicate"] == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" && typeof allClasses[triples[triple]["subject"]] === 'undefined'){
			var instanceAlias = null;
			var classResolved = schema.resolveClassByName(triples[triple]["object"]);
			var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"]);

			//id identification.localName not equeals subject use alias
			if(classResolved["localName"] != subjectNameParsed["value"]) instanceAlias = subjectNameParsed["value"];

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
			if(schema.resolveAttributeByName(null, triples[triple]["predicate"]) != null){
				//subjest
				//var classNameParsed = vq_visual_grammar.parse(triples[triple]["subject"]);
				//var classResolved = schema.resolveClassByName(classNameParsed["value"]);

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
			}

			//from object property
			else if(schema.resolveLinkByName(triples[triple]["predicate"]) != null){
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

	for(var triple in triples){
		if(triples[triple]["predicate"] != "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
			//data property
			if(typeof classesTable[triples[triple]["object"]] === 'undefined' && schema.resolveAttributeByName(null, triples[triple]["predicate"]) != null){
				//if(typeof classesTable[triples[triple]["subject"]]["fields"] === 'undefined')classesTable[triples[triple]["subject"]]["fields"] = [];
				var alias = "";
				var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
				var attributeResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]);

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
			//object property
			else {
				var linkType = "REQUIRED";
				if(bgptype == "optional") linkType = "OPTIONAL";

				var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]);

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
		}
	}

	return {classesTable:classesTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, attributeTableAdded:attributeTableAdded};
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
	"MD5", "SHA1", "SHA256", "SHA512", "ISIRI", "ISURI", "ISLITERAL", "ISNUMERIC", "DATETIME", "DATE"]
	return functions.indexOf(value.toUpperCase());
}

function checkIfTwoArgunemtFunctuion(value){
	var functions = ["LANGMATCHES", "CONTAINS", "STRSTARTS", "STRENDS", "STRBEFORE", "STRAFTER", "STRLANG", "STRDT", "SAMETERM"]
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

function visualizeQuery(clazz, parentClass){

	//node type
	var nodeType = "condition";
	if(parentClass == null) nodeType = "query";

	//instanceAlias
	var instanceAlias = clazz["instanceAlias"];

	//name
	// var className = "(no_class)";
	var className = "";
	if(clazz["identification"] != null) className = clazz["identification"]["localName"];


	if(clazz["isVariable"] == true) {
		className = clazz["variableName"]; //false
	}

	if(clazz["isUnit"] == true) {
		className = "[ ]"; //false
	}

	if(clazz["isUnion"] == true) {
		className = "[ + ]"; //fasle
	}

	var loc = {x:x,y:y,width:width,height:height};
	Create_VQ_Element(function(classBox) {
		if(className != null && className != "") classBox.setName(className);
		classBox.setClassType(nodeType);
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
			if(typeof clazz["linkIdentification"] !== 'undefined') linkName = clazz["linkIdentification"]["localName"];
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


			var points = [x+50, y+100, x+50, y+height];
			if(isInverse != true){
				Create_VQ_Element(function(linkLine) {
					linkLine.setName(linkName);
					linkLine.setLinkType(linkType);
					linkLine.setLinkQueryType(linkQueryType);
				}, points, true, parentClass, classBox);
			} else {
				Create_VQ_Element(function(linkLine) {
					linkLine.setName(linkName);
					linkLine.setLinkType(linkType);
					linkLine.setLinkQueryType(linkQueryType);
				}, points, true, classBox, parentClass);
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
	}, loc);

}
