var tripleTable = [];
var variableTable = [];
var referenceTable = [];
var referenceCandidateTable = [];
var isAggregate = false;
var isFunction = false;
var isExpression = false;
var isTimeFunction = false;
var counter = 0;
var variableNamesAll = [];
var variableNamesClass = [];
var expressionLevelNames = [];
var prefixTable = [];
var parseType;
var isSimpleVariable;
var isSimpleVariableForNameDef;
var applyExistsToFilter = null;
var emptyPrefix = null;
var symbolTable = null;
var isInternal = null;
var parameterTable = [];
var idTable = [];
var messages = [];
var classTable = [];


function getPrefix(givenPrefix){
	if(emptyPrefix == givenPrefix) return "";
	return givenPrefix;
}

function initiate_variables(vna, count, pt, ep, st,internal, prt, idT, ct){
	tripleTable = [];
	variableTable = [];
	referenceTable = [];
	referenceCandidateTable = [];
	isAggregate = false;
	isFunction = false;
	isExpression = false;
	isTimeFunction = false;
	applyExistsToFilter = null;
	counter = count;
	variableNamesAll = vna;
	variableNamesClass = [];
	expressionLevelNames = [];
	prefixTable = [];
	parseType = pt;
	emptyPrefix = ep;
	symbolTable = st;
	isInternal = internal;
	parameterTable = prt;
	idTable = idT;
	messages = [];
	classTable = ct;
}

parse_filter = function(parsed_exp, className, vnc, vna, count, ep, st, classTr, prt, idT, rTable) {
	initiate_variables(vna, count, "condition", ep, st, false, prt, idT, rTable);
	//initiate_variables(vna, count, "different", ep, st, false, prt, idT);
	variableNamesClass = vnc;
	
	var parsed_exp1 = transformBetweenLike(parsed_exp);
	
	var parsed_exp2 = transformSubstring(parsed_exp1);
	//console.log(JSON.stringify(parsed_exp2,null,2));
	var parsed_exp3 = transformExistsNotExists(parsed_exp2, null, className);
	//counter++;
	var result = generateExpression(parsed_exp3, "", className, null, true, false, false);
	
	//console.log(JSON.stringify(parsed_exp3,null,2));
	// console.log("applyExistsToFilter", applyExistsToFilter);
	
	var uniqueTriples = createTriples(tripleTable, "out").filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	// if in filter expression is used variable name, then put filter inside EXISTS
	//console.log("applyExistsToFilter", applyExistsToFilter);
	if(applyExistsToFilter != null && applyExistsToFilter == true){
		var uniqueTriplesFilter = createTriples(tripleTable, "filter").filter(function (el, i, arr) {
			return arr.indexOf(el) === i;
		});
		
		// if OpenLink Virtuoso && classTr != null && classTr != ""
		if(typeof parameterTable["queryEngineType"] !== 'undefined' && parameterTable["queryEngineType"] == "VIRTUOSO" && classTr != null && classTr != "") uniqueTriples.unshift(classTr);
		result = "EXISTS{" + uniqueTriplesFilter.join("\n") + "\nFILTER(" + result + ")}";
		// uniqueTriples = [];
	}
	
	return {"exp":result, "triples":uniqueTriples, "expressionLevelNames":expressionLevelNames, "references":referenceTable,  "counter":counter, "isAggregate":isAggregate, "isFunction":isFunction, "isExpression":isExpression, "isTimeFunction":isTimeFunction, "prefixTable":prefixTable, "referenceCandidateTable":referenceCandidateTable, "messages":messages};
}

parse_attrib = function(parsed_exp, alias, className, vnc, vna, count, ep, st, internal, prt, idT, rTable, parType) {
	alias = alias || "";
	
	if(parType != null) initiate_variables(vna, count, parType, ep, st, internal, prt, idT, rTable);
	else initiate_variables(vna, count, "attribute", ep, st, internal, prt, idT, rTable);
	
	variableNamesClass = vnc;
	var parsed_exp1 = transformSubstring(parsed_exp);
	// check if given expression is simple variable name or agregation, function, expression
	// if given expression is simple variable, then in triple use alias(if exists), else - use variable names
	isSimpleVariable = checkIfIsSimpleVariable(parsed_exp1, true);
	isSimpleVariableForNameDef = checkIfIsSimpleVariableForNameDef(parsed_exp1, true);
	if(isSimpleVariable == false || alias == "") alias = null; 
	var result = generateExpression(parsed_exp1, "", className, alias, true, isSimpleVariable, false);
	//var resultSQL = generateExpressionSQL(parsed_exp1, "", className, alias, true, isSimpleVariable, false);
	//console.log(resultSQL);

	return {"exp":result, "triples":createTriples(tripleTable, "out"), "variables":variableTable, "references":referenceTable, "variableNamesClass":variableNamesClass, "counter":counter, "isAggregate":isAggregate, "isFunction":isFunction, "isExpression":isExpression, "isTimeFunction":isTimeFunction, "prefixTable":prefixTable, "referenceCandidateTable":referenceCandidateTable, "messages":messages};

}

function createTriples(tripleTable, tripleType){
	var triples = []
	_.each(tripleTable,function(triple) {
		if(typeof triple["BIND"] === 'string') triples.push(triple["BIND"]);
		else if(typeof triple["VALUES"] === 'string') triples.push(triple["VALUES"]);
		else{
			var objectName =  triple["object"];
			if(objectName.indexOf("://") != -1) objectName = "<" + objectName + ">";
			else if(objectName.indexOf(":") != -1) {
				//TODO add prefix to table
			} else objectName = "?"+objectName;
			if(tripleType == "out"){
				if(parseType == "attribute"|| parseType == "aggregation" ||  (parseType == "condition" && triple["inFilter"] == null)) triples.push(objectName + " " + triple["prefixedName"] + " " + triple["var"] + "." );
			} else {
				if(parseType == "different" || (parseType == "condition" && triple["inFilter"] == true)) triples.push(objectName + " " + triple["prefixedName"] + " " + triple["var"] + "." );
			}
		//	triples.push("?" + triple["object"] + " " + triple["prefixedName"] + " " + triple["var"] + "." );
		}
	})
	return triples;
}

// set unique variable name
// varName - given variable
// alias - given variable alias
function setVariableName(varName, alias, variableData, generateNewName){
	// console.log("----------------------------------------");
	// console.log(varName, alias, variableData);
	// console.log("expressionLevelNames", expressionLevelNames);
	// console.log("variableNamesClass", variableNamesClass);
	// console.log("variableNamesAll", variableNamesAll);
	// console.log("rrrrrrrrr", variableNamesClass[varName]);
	// console.log("----------------------------------------");
	// console.log("     ");
	if(alias != null) {
		//console.log("1111", varName, alias);
		var aliasSet = false;
		for(var key in idTable){
			if (idTable[key] == alias) {
				variableNamesAll[alias] = {"alias" : alias + "_" +counter, "nameIsTaken" : true, "counter" : counter, "isVar" : true};
				aliasSet = true;
				break;
			}
		}
		if (aliasSet == false) variableNamesAll[alias] = {"alias" : alias, "nameIsTaken" : true, "counter" : 0, "isVar" : true};
		
		return variableNamesAll[alias]["alias"];
	}
	else if(variableData["kind"] == "PROPERTY_NAME" || typeof variableData["kind"] === 'undefined'){
		// console.log("2222", varName);
		//??????????????????????????????????????
		//if(typeof variableNamesClass[varName] === 'undefined' || (typeof variableNamesClass[varName] !== 'undefined' && typeof variableNamesClass[varName]["isvar"] !== 'undefined' && variableNamesClass[varName]["isvar"] != true))applyExistsToFilter = true;
		if(typeof variableNamesClass[varName] === 'undefined' || (typeof variableNamesClass[varName] !== 'undefined' && (variableNamesClass[varName]["isVar"] != true ||
			variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))))applyExistsToFilter = true;
		//??????????????????????????????????????
		if(generateNewName != null && generateNewName == true ){
			// console.log("2aaaa", varName);
			if(typeof expressionLevelNames[varName] === 'undefined'){
				if(typeof variableNamesClass[varName]=== 'undefined'){
					if(typeof variableNamesAll[varName]=== 'undefined'){
						expressionLevelNames[varName] = varName;
						variableNamesClass[varName] = {"alias" : varName, "nameIsTaken" : true, "counter" : 0, "isVar" : false};
						variableNamesAll[varName] = {"alias" : varName, "nameIsTaken" : true, "counter" : 0, "isVar" : false};
					} else {
						var count = variableNamesAll[varName]["counter"] + 1;
						expressionLevelNames[varName] = varName + "_" +count;
						variableNamesAll[varName]["counter"] = count;
						variableNamesClass[varName] = {"alias" : varName + "_" +count, "nameIsTaken" : variableNamesAll[varName]["nameIsTaken"], "counter" : count, "isVar" : variableNamesAll[varName]["isVar"]};
					}
				} else {
					var count = variableNamesClass[varName]["counter"] + 1;
					expressionLevelNames[varName] = varName + "_" +count;
					variableNamesClass[varName]["counter"] = count;
					variableNamesAll[varName] = {"alias" : varName + "_" +count, "nameIsTaken" : variableNamesClass[varName]["nameIsTaken"], "counter" : count, "isVar" : variableNamesClass[varName]["isVar"]};
					//console.log(count, varName + "_" +count, variableNamesClass[varName]["counter"], variableNamesAll[varName]["counter"])
				}
			}else{
				return expressionLevelNames[varName];
			}
		// cardinality is more then 1 or is unknown (for each variable new definition)
		} else if(variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1)){
		// console.log("2bbbb", varName);		   
		   //if not used in given expression
			if(typeof expressionLevelNames[varName] === 'undefined'){
				//if not used in class scope
				if(typeof variableNamesClass[varName] === 'undefined'){
					//if not used in query scope
					if(typeof variableNamesAll[varName]=== 'undefined'){
						//not used at all
						
						//if simple variable
						if(isSimpleVariableForNameDef == true){
							var tempIsVar = false;
							if(parseType == "attribute") tempIsVar = true;
							variableNamesClass[varName] = {"alias" : varName, "nameIsTaken" : true, "counter" : 0, "isVar" : tempIsVar};
						} else {
							variableNamesClass[varName] = {"alias" : varName+"_1", "nameIsTaken" : false, "counter" : 1, "isVar" : false};
						}
						expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					
					//is used in query, but not in a given class (somewhere else)
					} else {
						//if simple variable
						if(isSimpleVariableForNameDef == true){
							var tempIsVar = false;
							if(parseType == "attribute") tempIsVar = true;
							
							//name is not taken
							if(variableNamesAll[varName]["nameIsTaken"] != true){
								variableNamesClass[varName] = {"alias" : varName, "nameIsTaken" : true, "counter" : variableNamesAll[varName]["counter"], "isVar" : tempIsVar};
							//name is taken
							} else {
								var count = variableNamesAll[varName]["counter"] + 1;
								variableNamesClass[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
								variableNamesAll[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar}; //????? vai vajag
							}
						//is expression
						} else {
							var count = variableNamesAll[varName]["counter"] + 1;
							variableNamesClass[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : variableNamesAll[varName]["nameIsTaken"], "counter" : count, "isVar" : false};
						}
						expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					}
					return variableNamesClass[varName]["alias"];
				//is used in a given class
				}else{
					//if simple variable
					if(isSimpleVariableForNameDef == true){
						var tempIsVar = false;
						if(parseType == "attribute") tempIsVar = true;
						
						//name is not taken
						if(variableNamesClass[varName]["nameIsTaken"] != true){
							variableNamesClass[varName] = {"alias" : varName, "nameIsTaken" : true, "counter" : variableNamesClass[varName]["counter"], "isVar" : tempIsVar};
						//name is taken
						} else {
							var count = variableNamesClass[varName]["counter"] + 1;
							variableNamesClass[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
						}
					//is expression
					} else {
						var count = variableNamesClass[varName]["counter"] + 1;
						variableNamesClass[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : true, "counter" : count, "isVar" : false};
					}
					
					expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					return variableNamesClass[varName]["alias"];
				}
			//used in given expression
			} else {
				return expressionLevelNames[varName];
			}
		}
		// cardinality is <=1
		else{
			// console.log("2cccc", varName, isSimpleVariableForNameDef);
			//if not used in given expression
			if(typeof expressionLevelNames[varName] === 'undefined'){
				// console.log("2c 1", varName);
				//if not used in class scope
				if(typeof variableNamesClass[varName] === 'undefined'){
					// console.log("2c 11", varName);
					//if not used in query scope
					if(typeof variableNamesAll[varName]=== 'undefined'){
						//not used at all
						// console.log("2c 111", varName, parseType);
						//if simple variable
						if(isSimpleVariableForNameDef == true){
							var tempIsVar = false;
							if(parseType == "attribute") tempIsVar = true;
							variableNamesClass[varName] = {"alias" : varName, "nameIsTaken" : true, "counter" : 0, "isVar" : tempIsVar};
						} else {
							variableNamesClass[varName] = {"alias" : varName+"_1", "nameIsTaken" : false, "counter" : 1, "isVar" : false};
						}
						// console.log("variableNamesClass[varName]", variableNamesClass[varName]);
						expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					
					//is used in query, but not in a given class (somewhere else)
					} else {
						// console.log("2c 112", varName);
						//if simple variable
						if(isSimpleVariableForNameDef == true){
							var tempIsVar = false;
							if(parseType == "attribute") tempIsVar = true;
							
							//name is not taken
							if(variableNamesAll[varName]["nameIsTaken"] != true){
								variableNamesClass[varName] = {"alias" : varName, "nameIsTaken" : true, "counter" : variableNamesAll[varName]["counter"], "isVar" : tempIsVar};
							//name is taken
							} else {
								var count = variableNamesAll[varName]["counter"] + 1;
								variableNamesClass[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
								variableNamesAll[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar}; //????? vai vajag
							}
						//is expression
						} else {
							var count = variableNamesAll[varName]["counter"] + 1;
							variableNamesClass[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : variableNamesAll[varName]["nameIsTaken"], "counter" : count, "isVar" : false};
						}
						expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					}
					return variableNamesClass[varName]["alias"];
				//is used in a given class
				}else{
					// console.log("2c 12", varName);
					//if simple variable
					if(isSimpleVariableForNameDef == true){
						// console.log("2c 121", varName);
						var tempIsVar = false;
						if(parseType == "attribute") tempIsVar = true;
						
						//name is not taken
						if(variableNamesClass[varName]["nameIsTaken"] != true){
							variableNamesClass[varName] = {"alias" : varName, "nameIsTaken" : true, "counter" : variableNamesClass[varName]["counter"], "isVar" : tempIsVar};
						//name is taken
						} else {
							//if name is not defined as variable
							if(variableNamesClass[varName]["isVar"] != true) {
								
								var count = variableNamesClass[varName]["counter"] + 1;
								variableNamesClass[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
							}
						}
						// console.log("variableNamesClass[varName]", variableNamesClass[varName]);
					//is expression
					} else {
						// console.log("2c 122", varName);
						//name is not taken
						if(variableNamesClass[varName]["nameIsTaken"] != true){
							var count = variableNamesClass[varName]["counter"] + 1;
							variableNamesClass[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : false, "counter" : count, "isVar" : false};
						//name is taken
						} //else {
						//	var count = variableNamesClass[varName]["counter"] + 1;
						//	variableNamesClass[varName] = {"alias" : varName+"_"+count, "nameIsTaken" : true, "counter" : count};
						//}
					}
					
					expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					return variableNamesClass[varName]["alias"];
				}
			//used in given expression
			} else {
				// console.log("2c 2", varName);
				return expressionLevelNames[varName];
			}
		}
		return expressionLevelNames[varName];
	} else {
		//console.log("3333", varName);
		return varName;
	}
}

// generate prefixedName path from path experession
// expressionTable - parsed expression table part with path definicion
getPath = function(expressionTable){

	var prTable = [];
	var path = "";
	for(var key in expressionTable){
		if(typeof expressionTable[key]["path"]!== 'undefined' && typeof expressionTable[key]["path"]["type"]!== 'undefined' &&  expressionTable[key]["path"]["type"] != null){
			var pathPart =  getPrefix(expressionTable[key]["path"]["type"]["Prefix"]) + ":" + expressionTable[key]["path"]["name"];
			var namespace = expressionTable[key]["path"]["type"]["Namespace"]
			if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
			// prefixTable[getPrefix(expressionTable[key]["path"]["type"]["Prefix"]) + ":"] = "<"+namespace+">"
			prTable[getPrefix(expressionTable[key]["path"]["type"]["Prefix"]) + ":"] = "<"+namespace+">"
			if(typeof expressionTable[key]["path"]["inv"] === "string") pathPart = "^" + pathPart;
			if(path == "") path = pathPart;
			else path = path +"/" + pathPart;
			
		} else {

			// Interpreter.showErrorMsg("Unrecognized link property or property path. Please specify link property or property path from ontology.");
			 return {messages : {
				"type" : "Error",
				"message" : "Unrecognized link property or property path. Please specify link property or property path from ontology.",
				//"listOfElementId" : [clId],
				"isBlocking" : true
			 }};
		}
		
	}
	return {path:path, prefixTable:prTable};
}


// transfort exists and not exists expressions
function transformExistsNotExists(expressionTable, alias, className){
	for(var key in expressionTable){
		// var visited = 0;
		if(key == "ExistsFunc" || key == "NotExistsFunc"){
			var prefix = "";
			var existsExpr = "ExistsExpr";
			if(key == "NotExistsFunc") {
				prefix = "not";
				existsExpr = "NotExistsExpr";
			}

			var condOr = findINExpressionTable(expressionTable, "ConditionalOrExpression");
			transformExistsOR(condOr, prefix, existsExpr, 0, alias, className);
			// visited = 1;
		}
		
		// if(key == "ConditionalAndExpression") transformVariableFilter(expressionTable[key], prefix, existsExpr, 0, alias, className);
		
		// if(visited == 0 && typeof expressionTable[key] == 'object'){
		if(typeof expressionTable[key] == 'object'){
			transformExistsNotExists(expressionTable[key], alias, className);
		}
		
	}
	return expressionTable
}

function transformExistsOR(expressionTable, prefix, existsExpr, countOR, alias, className){	
	expressionTable[countOR]["ConditionalAndExpression"] = transformExistsAND(expressionTable[countOR]["ConditionalAndExpression"], prefix, existsExpr, 0, alias, className);
			
	for(var key in expressionTable[1]){
		if(typeof expressionTable[1][key][3] !== 'undefined') expressionTable[1][key] = transformExistsOR(expressionTable[1][key], prefix, existsExpr, 3, alias, className);
	}
	return expressionTable;
}

function generatePrefixedNameVariable(prefix, existsExpr, alias, pe){
	var variable, prefixedName
			if(typeof pe["Reference"] !== 'undefined'){
					variable = setVariableName(pe["var"]["name"] + "_" + pe["Reference"]["name"], alias, pe["var"]);
					prefixedName = getPrefix(pe["var"]["type"]["Prefix"])+":"+pe["var"]["name"];
					var namespace = pe["var"]["type"]["Namespace"];
					if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
					prefixTable[getPrefix(pe["var"]["type"]["Prefix"]) + ":"] = "<"+namespace+">";
					referenceTable.push("?"+pe["Reference"]["name"]);
					referenceCandidateTable.push(pe["Reference"]["name"]);
			}
			else if(typeof pe["Path"] !== 'undefined'){
				var path = getPath(pe["Path"]);
				if(typeof path["messages"] !== 'undefined' ) {
					prefixedName = null;
					messages = messages.concat(path["messages"]);
				}
				else{
					for (var prefix in path["prefixTable"]) { 
						if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
					}
					prefixedName = path["path"]+ "/" + getPrefix(pe["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":" + pe["PrimaryExpression"]["var"]["name"];
				}
				//variableNamesClass[pe["PrimaryExpression"]["var"]["name"]] = pe["PrimaryExpression"]["var"]["name"] + "_" + counter;
				variableNamesClass[pe["PrimaryExpression"]["var"]["name"]] = {"alias" : pe["PrimaryExpression"]["var"]["name"] + "_" + counter, "isvar" : false};
				variableNamesAll[pe["PrimaryExpression"]["var"]["name"]+ "_" + counter] = pe["PrimaryExpression"]["var"]["name"];
				variable = setVariableName(pe["PrimaryExpression"]["var"]["name"], alias, pe["PrimaryExpression"]["var"]);
				expressionLevelNames[pe["PrimaryExpression"]["var"]["name"]] = variable;
				
			}
			else if(typeof pe["var"] !== 'undefined') {
				//variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
				//variableNamesClass[pe["var"]["name"]] = {"alias" : pe["var"]["name"] + "_" + counter, "isvar" : false};
				//variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
				variable = setVariableName(pe["var"]["name"], alias, pe["var"], true);
				prefixedName = getPrefix(pe["var"]["type"]["Prefix"])+":"+pe["var"]["name"];
				var namespace = pe["var"]["type"]["Namespace"];
				if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
				prefixTable[getPrefix(pe["var"]["type"]["Prefix"]) + ":"] = "<"+namespace+">";

			}
	return {"variable":variable, "prefixedName":prefixedName};
}

function transformExistsAND(expressionTable, prefix, existsExpr, count, alias, className){
	if(typeof expressionTable[count]["RelationalExpression"]["Relation"] !== 'undefined'){
		// var tempAliasOrAttribute = "Attribute";
		var tempAliasOrAttribute = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["kind"];
		if(tempAliasOrAttribute == "PROPERTY_ALIAS" || tempAliasOrAttribute == "CLASS_ALIAS"){
			referenceCandidateTable.push(findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["name"]);
			expressionTable[count][prefix + "Bound"] = {"var":findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")}
		// } else if(tempAliasOrAttribute == "PROPERTY_NAME" || tempAliasOrAttribute == "CLASS_NAME"){
		} else {
			var tripleTable = [];
			var pe = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "PrimaryExpression");
			if(typeof pe["FunctionExpression"] !== 'undefined') {
				if(typeof pe["FunctionExpression"]["FunctionTime"] !== 'undefined'){
					
					var pe2 = findINExpressionTable(pe["FunctionExpression"], "PrimaryExpressionR");
					pe = findINExpressionTable(pe["FunctionExpression"], "PrimaryExpressionL");
	
					var tempVarPRN = generatePrefixedNameVariable(prefix, existsExpr, alias, pe2);
					var variable = tempVarPRN["variable"];
					var prefixedName =  tempVarPRN["prefixedName"];
			
					tripleTable.push({
								"variable" : variable,
								"prefixedName" : prefixedName,
								"object" : className,
							});
				}
				else pe = findINExpressionTable(pe["FunctionExpression"], "PrimaryExpression");
			}

			// var variable, prefixedName
			var tempVarPRN = generatePrefixedNameVariable(prefix, existsExpr, alias, pe);
			var variable = tempVarPRN["variable"];
			var prefixedName =  tempVarPRN["prefixedName"];
			
			
			tripleTable.push({
						"variable" : variable,
						"prefixedName" : prefixedName,
						"object" : className,
					});
			
			expressionTable[count] =  {
				[existsExpr] : {
					"Triple" : tripleTable,
					"Filter" : {"RelationalExpression":expressionTable[count]["RelationalExpression"]}
				}
			} 
		}
	} else {
		
		// var tempAliasOrAttribute = "Attribute";
		var tempAliasOrAttribute = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["kind"];
		if(tempAliasOrAttribute == "PROPERTY_ALIAS" || tempAliasOrAttribute == "CLASS_ALIAS"){
			if(tempAliasOrAttribute == "CLASS_ALIAS") referenceCandidateTable.push(findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["name"]);
			expressionTable[count][prefix + "Bound"] = {"var":findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")}
			delete expressionTable[count]["RelationalExpression"];
		} else if(tempAliasOrAttribute == "PROPERTY_NAME" || tempAliasOrAttribute == "CLASS_NAME"){
			var tripleTable = [];
			
			var pe = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "PrimaryExpression");
			var generateFilter = false;
			if(typeof pe["FunctionExpression"] !== 'undefined') {
				generateFilter = true;
				if(typeof pe["FunctionExpression"]["FunctionTime"] !== 'undefined'){
					
					var pe2 = findINExpressionTable(pe["FunctionExpression"], "PrimaryExpressionR");
					pe = findINExpressionTable(pe["FunctionExpression"], "PrimaryExpressionL");
	
					var tempVarPRN = generatePrefixedNameVariable(prefix, existsExpr, alias, pe2);
					var variable = tempVarPRN["variable"];
					var prefixedName =  tempVarPRN["prefixedName"];
			
					tripleTable.push({
								"variable" : variable,
								"prefixedName" : prefixedName,
								"object" : className,
							});
				}
				else pe = findINExpressionTable(pe["FunctionExpression"], "PrimaryExpression");
			}
			var tempVarPRN = generatePrefixedNameVariable(prefix, existsExpr, alias, pe);
			var variable = tempVarPRN["variable"];
			var prefixedName =  tempVarPRN["prefixedName"];
			
			
			tripleTable.push({
						"variable" : variable,
						"prefixedName" : prefixedName,
						"object" : className,
					});
			
					
			if(generateFilter == false){
				expressionTable[count] =  {
					[existsExpr] : {
						"Triple" : tripleTable,
					}
				} 
			} else {
				expressionTable[count] =  {
					[existsExpr] : {
						"Triple" : tripleTable,
						"Filter" : {"RelationalExpression":expressionTable[count]["RelationalExpression"]}
					}
				} 
			}
		}
	}

	for(var key in expressionTable[1]){
		if(typeof expressionTable[1][key][3] !== 'undefined') expressionTable[1][key] = transformExistsAND(expressionTable[1][key], prefix, existsExpr, 3, alias, className);
	}
	return expressionTable
}

function transformVariableFilter(expressionTable, prefix, existsExpr, count, alias, className){
	if(typeof expressionTable[count]["ExistsExpr"] === 'undefined' && typeof expressionTable[count]["NotExistsExpr"] === 'undefined'){
		if(typeof expressionTable[count]["RelationalExpression"]["Relation"] !== 'undefined'){
			var tempAliasOrAttribute = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["kind"];
			if(tempAliasOrAttribute == "PROPERTY_NAME" || tempAliasOrAttribute == "CLASS_NAME"){
				var pe = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "PrimaryExpression");
				var variable, prefixedName
				if(typeof pe["Reference"] !== 'undefined'){
					variable = setVariableName(pe["var"]["name"] + "_" + pe["Reference"]["name"], alias, pe["var"]);
					prefixedName = pe["var"]["name"];
					referenceTable.push("?"+pe["Reference"]["name"]);
					referenceCandidateTable.push(pe["Reference"]["name"]);
				}
				else if(typeof pe["Path"] !== 'undefined'){
					var path = getPath(pe["Path"]);
					if(typeof path["messages"] !== 'undefined') {
						prefixedName = null;
						messages = messages.concat(path["messages"]);
					}
					else{
						for (var prefix in path["prefixTable"]) { 
							if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
						}
						prefixedName = path["path"];
					}
					//variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
					variableNamesClass[pe["var"]["name"]] ={"alias" : pe["var"]["name"] + "_" + counter, "isvar" : false};
					variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
					variable = setVariableName(pe["var"]["name"], alias, pe["var"])
				}
				else if(typeof pe["var"] !== 'undefined') {
					//variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
					variableNamesClass[pe["var"]["name"]] = {"alias" : pe["var"]["name"] + "_" + counter, "isvar" : false};
					variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
					variable = setVariableName(pe["var"]["name"], alias, pe["var"]);
				
					var path = getPath(pe["var"]["name"]);
					if(typeof path["messages"] !== 'undefined') {
						prefixedName = null;
						messages = messages.concat(path["messages"]);
					}
					else{
						for (var prefix in path["prefixTable"]) { 
							if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
						}
						prefixedName = path["path"];
					}
				}
						
				expressionTable[count] =  {
					["ExistsExpr"] : {
						"Triple" : [{
							"variable" : variable,
							"prefixedName" : prefixedName,
							"object" : className,
						}],
						"Filter" : {"RelationalExpression":expressionTable[count]["RelationalExpression"]}
					}
				} 
			}
		} else {
			var tempAliasOrAttribute = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["kind"];
			if(tempAliasOrAttribute == "PROPERTY_NAME" || tempAliasOrAttribute == "CLASS_NAME"){
				var pe = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "PrimaryExpression");
				var variable, prefixedName
				if(typeof pe["Reference"] !== 'undefined'){
					variable = setVariableName(pe["var"]["name"] + "_" + pe["Reference"]["name"], alias, pe["var"]);
					prefixedName = pe["var"]["name"];
					referenceTable.push("?"+pe["Reference"]["name"]);
					referenceCandidateTable.push(pe["Reference"]["name"]);
				}
				else if(typeof pe["Path"] !== 'undefined'){
					var path = getPath(pe["Path"]);
					if(typeof path["messages"] !== 'undefined') {
						prefixedName = null;
						messages = messages.concat(path["messages"]);
					}
					else{
						for (var prefix in path["prefixTable"]) { 
							if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
						}
						prefixedName = path["path"];
					}
					//variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
					variableNamesClass[pe["var"]["name"]] = {"alias" : pe["var"]["name"] + "_" + counter, "isvar" : false};
					variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
					variable = setVariableName(pe["var"]["name"], alias, pe["var"]);
				}
				else if(typeof pe["var"] !== 'undefined') {
					//variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
					variableNamesClass[pe["var"]["name"]] = {"alias" : pe["var"]["name"] + "_" + counter, "isvar" : false};
					variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
					variable = setVariableName(pe["var"]["name"], alias, pe["var"]);
					prefixedName = pe["var"]["name"];
				}
						
				expressionTable[count] =  {
					["ExistsExpr"] : {
						"Triple" : [{
							"variable" : variable,
							"prefixedName" : prefixedName,
							"object" : className,
						}],
					}
				} 
			}
		}
	}
	for(var key in expressionTable[1]){
		if(typeof expressionTable[1][key][3] !== 'undefined') expressionTable[1][key] = transformVariableFilter(expressionTable[1][key], prefix, existsExpr, 3, alias, className);
	}
	return expressionTable
}

// transform a BETWEEN(1, 3) into a>=1 && a<=3
// transform a LIKE "%abc" into REGEX(a, "abc$")
function transformBetweenLike(expressionTable){
	for(var key in expressionTable){
		
		//BETWEEN
		if (key == "ConditionalAndExpression" &&
		typeof expressionTable[key][0]!== 'undefined' && expressionTable[key][0]["RelationalExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionBETWEEN"]!== 'undefined' &&
		expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionBETWEEN"]!= null 
		){
			var temp = expressionTable[key][0];
			var pe;
			if(typeof temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Path"] === 'undefined'){
				pe = {
                            	"var" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"],
								"Substring": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Substring"],
					            "ReferenceToClass": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ReferenceToClass"],
					            "ValueScope": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ValueScope"],
					            "FunctionBETWEEN": null,
					            "FunctionLike": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionLike"]
                            }
			} else {
				pe = {
					"Path" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Path"],
					"PrimaryExpression" : {
						"var" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"],
						"Substring": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["Substring"]
					},
                    "ReferenceToClass": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ReferenceToClass"],
					"ValueScope": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ValueScope"],
					"FunctionBETWEEN": null,
					"FunctionLike": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionLike"]
               }
			}
			
			expressionTable["ConditionalAndExpression"] = [ {
                  "RelationalExpression" : {
                    "NumericExpressionL" : {
                      "AdditiveExpression" : {
                        "MultiplicativeExpression" : {
                          "UnaryExpression" : {
                            "PrimaryExpression" : pe,
                          },
                          "UnaryExpressionList" : []
                        },
                        "MultiplicativeExpressionList" : []
                      },
                    },
                    "Relation" : ">=",
                    "NumericExpressionR" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionBETWEEN"]["BetweenExpressionL"],
                    
                  }
                }, 
				[
                    [
                        null,
						{
                            "ANDOriginal": "&&",
                        },
						null,
                        {
                                "RelationalExpression": {
                                  "NumericExpressionL": {
                                    "AdditiveExpression": {
                                      "MultiplicativeExpression": {
                                        "UnaryExpression": {
                                          "PrimaryExpression": pe,
										}, 
										"UnaryExpressionList": []
                                       },
									   "MultiplicativeExpressionList": []
                                      },
                                    },
                                  "Relation": "<=",
                                  "NumericExpressionR": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionBETWEEN"]["BetweenExpressionR"],
                                 }, 
                        }
                    ]
                ]
		 ]
			temp=null;
		}
		
		if(typeof expressionTable[key] == 'object'){
			transformBetweenLike(expressionTable[key]);
		}
		
		 if (key == "PrimaryExpression" && typeof expressionTable[key]["FunctionLike"]!== 'undefined' && expressionTable[key]["FunctionLike"] != null) {
			 var t = expressionTable[key];
			 var regaxExpression = "";
			 var regaxExpression = expressionTable[key]["FunctionLike"]["string"];
			 if (expressionTable[key]["FunctionLike"]["start"] == null)  regaxExpression = "^" + regaxExpression; 
			 if (expressionTable[key]["FunctionLike"]["end"] == null)  regaxExpression = regaxExpression + "$"; 
			
			 expressionTable["PrimaryExpression"] = {
                               "RegexExpression" : [
                            	   "REGEX",
                                   "(",
                                   {
                                   "OrExpression" : [ {
                                      "ANDExpression" : [ {
                                           "ConditionalOrExpression" : [ {
                                               "ConditionalAndExpression" : [ {
                                                   "RelationalExpression" : {
                                                     "NumericExpressionL" : {
                                                       "AdditiveExpression" : {
                                                         "MultiplicativeExpression" : {
                                                           "UnaryExpression" : {
                                                             "PrimaryExpression" : t
                                                           },
                                                           "UnaryExpressionList" :[]
                                                         },
                                                         "MultiplicativeExpressionList" : []
                                                       }
                                                     }
                                                   }
                                                 } ]
                                             } ]
                                         } ]
                                     } ]
                                 }, 
                                 {
                                     "Comma": ","
                                 },
                                 {
                                   "OrExpression" : [ {
                                       "ANDExpression" : [ {
                                           "ConditionalOrExpression" : [ {
                                               "ConditionalAndExpression" : [ {
                                                   "RelationalExpression" : {
                                                     "NumericExpressionL" : {
                                                       "AdditiveExpression" : {
                                                         "MultiplicativeExpression" : {
                                                           "UnaryExpression" : {
                                                             "PrimaryExpression" : {
                                                               "RDFLiteral" : { 
                                                            	   "String":'"' + regaxExpression  + '"'
                                                            	}
                                                             }
                                                           },
                                                           "UnaryExpressionList" : {}
                                                         },
                                                         "MultiplicativeExpressionList" : {}
                                                       }
                                                     }
                                                   }
                                                 } ]
                                             } ]
                                         } ]
                                     } ]
                                 } ]
                             }
		}
	}
	return expressionTable
}


function checkIfUnderOptionalPlain(reference, refTable, isOptionalPlain){

	for(var ref in refTable){
		if(typeof refTable[ref] === 'object'){
			if(typeof refTable[ref]["optionaPlain"] !== 'undefined' && refTable[ref]["optionaPlain"] == true) isOptionalPlain = true;

			if(reference == ref){
				if(isOptionalPlain == true) return true;
			}else {
				var result  = false;
				for(var r in refTable[ref]["classes"]){
					if(typeof refTable[ref]["classes"][r] === 'object'){
						var tempResult = checkIfUnderOptionalPlain(reference, refTable[ref]["classes"][r], isOptionalPlain);
						if(tempResult == true) result = true;
					}
				}
				if(result == true) return true;
			}
		}
	}
	return false;
}

function generateExpression(expressionTable, SPARQLstring, className, alias, generateTriples, isSimpleVariable, isUnderInRelation){
	for(var key in expressionTable){
		var visited = 0;
		
		//REFERENCE
		if(key == "PrimaryExpression" && typeof expressionTable[key]["Reference"] !== 'undefined'){
			if(checkIfUnderOptionalPlain(expressionTable[key]["Reference"]["name"], classTable, false) == false){
				var variable = setVariableName(expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"], alias, expressionTable[key]["var"])
				if(generateTriples == true && expressionTable[key]["var"]['type'] != null) {
					var inFilter = false;
					//if(typeof variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]] !== 'undefined' && variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]]["isvar"] != true) inFilter = true;
					
					var variableData = expressionTable[key]["var"];
					if(typeof variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]] !== 'undefined' && (variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]]["isVar"] != true 
					|| variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))) inFilter = true;
					tripleTable.push({"var":"?"+variable, "prefixedName":expressionTable[key]["var"]["type"]["Prefix"]+":"+expressionTable[key]["var"]["name"], "object":expressionTable[key]["Reference"]["name"], "inFilter" : inFilter});
				}
				variableTable.push("?" + variable);
				SPARQLstring = SPARQLstring + "?" + variable;
				visited = 1;
				
				referenceTable.push("?"+expressionTable[key]["Reference"]["name"]);
				referenceCandidateTable.push(expressionTable[key]["Reference"]["name"]);
			} else {
				var clId;
				for(var k in idTable){
					if (idTable[k] == className) {
						clId = k;
						break;
					}
				}
				
				messages.push({
					"type" : "Error",
					"message" : "Reference to instance '" + expressionTable[key]["Reference"]["name"] + "' from Optional-block not allowed in navigation expression '" + expressionTable[key]["Reference"]["name"] +"."+expressionTable[key]["var"]["name"] +"' outside the block.\nConsider moving the Optional-block a subquery, or define an internal field '"+ expressionTable[key]["var"]["name"] + "' within the scope of '"+ expressionTable[key]["Reference"]["name"] +"'",
					// "listOfElementId" : [clId],
					"isBlocking" : true
				});
				
				visited = 1;
			}
		}
		
		//PATH
		if(key == "PrimaryExpression" && typeof expressionTable[key]["Path"] !== 'undefined'){
			var path = getPath(expressionTable[key]["Path"]);
			if(typeof path["messages"] !== 'undefined') {
				prefixName = null;
				messages = messages.concat(path["messages"]);
			}
			else{
				for (var prefix in path["prefixTable"]) { 
					if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
				}
				var prefixName = path["path"];
			}
			// findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")
			if(typeof expressionTable[key]["PrimaryExpression"]["SubstringExpression"] !== 'undefined'){
				var substringvar = findINExpressionTable(expressionTable[key]["PrimaryExpression"], "var");
				var variable = setVariableName(substringvar["name"], alias, substringvar);
				variableTable.push("?" + variable);
				if(generateTriples == true && substringvar['type'] != null && path != null) {
					var inFilter = false;
					if(typeof variableNamesClass[substringvar["name"]] !== 'undefined' && (variableNamesClass[substringvar["name"]]["isVar"] != true 
					|| substringvar["type"] != null && (typeof substringvar["type"]["maxCardinality"] === 'undefined' || substringvar["type"]["maxCardinality"] > 1 || substringvar["type"]["maxCardinality"] == -1))) inFilter = true;
					tripleTable.push({"var":"?"+variable, "prefixedName":prefixName+ "/" + getPrefix(substringvar["type"]["Prefix"]) + ":" + substringvar["name"], "object":className, "inFilter":inFilter});
					var namespace = substringvar["type"]["Namespace"];
					if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
					prefixTable[getPrefix(substringvar["type"]["Prefix"]) + ":"] = "<"+namespace+">";
					generateTriples = false;
					SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["PrimaryExpression"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
					generateTriples = true;
				}
			} else {
				var variable = setVariableName(expressionTable[key]["PrimaryExpression"]["var"]["name"], alias, expressionTable[key]["PrimaryExpression"]["var"])
				variableTable.push("?" + variable);
				if(generateTriples == true && expressionTable[key]["PrimaryExpression"]["var"]['type'] != null && path != null) {
					var inFilter = false;
					var variableData = expressionTable[key]["PrimaryExpression"]["var"];
					if(typeof variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]] !== 'undefined' && (variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]]["isVar"] != true
					|| variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))) inFilter = true;
					tripleTable.push({"var":"?"+variable, "prefixedName":prefixName+ "/" + getPrefix(expressionTable[key]["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":" + expressionTable[key]["PrimaryExpression"]["var"]["name"], "object":className, "inFilter":inFilter});
					var namespace = expressionTable[key]["PrimaryExpression"]["var"]["type"]["Namespace"];
					if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
					prefixTable[getPrefix(expressionTable[key]["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":"] = "<"+namespace+">";
				}
				SPARQLstring = SPARQLstring + "?" + variable;
			}
			visited = 1;
		}
		
		//VariableName
		if (key == "VariableName") {
			var tempAlias;
			if(alias == "" || alias == null) tempAlias = expressionTable[key]+"_";
			else tempAlias = "?"+alias;
			if(isInternal !=true) SPARQLstring = SPARQLstring + expressionTable[key] + " " + tempAlias;
			else SPARQLstring = SPARQLstring + expressionTable[key];
			tripleTable.push({"var":tempAlias, "prefixedName":expressionTable[key], "object":className, "inFilter":false});
			visited = 1;
		}
		
		if (key == "BrackettedExpression") {
			SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			visited = 1;
		}
		
		if (key == "NotExistsFunc" || key == "ExistsFunc") {
			generateTriples = false
			SPARQLstring = SPARQLstring + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
			visited = 1;
			generateTriples = true
			applyExistsToFilter = false;
		}
		if (key == "BooleanLiteral") {
			SPARQLstring = SPARQLstring + expressionTable[key];
			visited = 1;
		}
		
		if (key == "classExpr"){
			if(alias != null && alias != "") {
				SPARQLstring = SPARQLstring + "?" + alias;
				variableTable.push("?" + alias);
				if(className != alias)tripleTable.push({"BIND":"BIND(?" + className + " AS ?" + alias + ")"})
			}else {
				SPARQLstring = SPARQLstring + "?" + className;
				variableTable.push("?" + className);
			}
			visited = 1;
		}
		
		if(key == "var") {
			var varName
			if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined' && expressionTable[key]['type']['localName'] !== null && typeof expressionTable[key]['type']['localName'] !== 'undefined' && typeof expressionTable[key]["kind"] !== 'undefined' && expressionTable[key]["kind"] != "CLASS_ALIAS" && expressionTable[key]["kind"] != "PROPERTY_ALIAS") varName = expressionTable[key]['type']['localName'];
			// if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined' && expressionTable[key]['type']['localName'] !== null && typeof expressionTable[key]['type']['localName'] !== 'undefined' ) varName = expressionTable[key]['type']['localName'];
			else varName = expressionTable[key]["name"];
			if(expressionTable[key]['kind'] !== null){

				var variable = setVariableName(varName, alias, expressionTable[key])
	
				SPARQLstring = SPARQLstring + "?" + variable;
				variableTable.push("?" + variable);
				if(generateTriples == true && expressionTable[key]['type'] != null && className != "[ ]" && className != "[ + ]") {
					if(expressionTable[key]['kind'] == "CLASS_ALIAS") referenceCandidateTable.push(varName);
					if(expressionTable[key]['kind'] == "CLASS_NAME") {
						var inFilter = false;
						if(typeof variableNamesClass[varName] !== 'undefined' && variableNamesClass[varName]["isVar"] != true) inFilter = true;
						
						if(isSimpleVariable ==true) tripleTable.push({"var": getPrefix(expressionTable[key]["type"]["Prefix"])+":"+varName, "prefixedName" : "a", "object":className, "inFilter":inFilter});
						else tripleTable.push({"var": getPrefix(expressionTable[key]["type"]["Prefix"])+":"+varName, "prefixedName" : "a", "object":variable, "inFilter":inFilter});
					}
					else if(expressionTable[key]['kind'] == "CLASS_ALIAS" && isSimpleVariable == true && variable != varName){
						tripleTable.push({"BIND":"BIND(?" + varName + " AS ?" + variable + ")"})
					}else if(expressionTable[key]['kind'] == "CLASS_ALIAS" && alias == null || expressionTable[key]['kind'] == "PROPERTY_ALIAS") {
						
					} else {
						var inFilter = false;
						var variableData = expressionTable[key];
						if(typeof variableNamesClass[varName] !== 'undefined' && (variableNamesClass[varName]["isVar"] != true 
						|| variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))) inFilter = true;
						
						tripleTable.push({"var":"?"+variable, "prefixedName":getPrefix(expressionTable[key]["type"]["Prefix"])+":"+varName, "object":className, "inFilter":inFilter});
						var namespace = expressionTable[key]["type"]["Namespace"];
						if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
						prefixTable[getPrefix(expressionTable[key]["type"]["Prefix"]) + ":"] = "<"+namespace+">";
					}
					if(expressionTable[key]['kind'] == "CLASS_ALIAS" || expressionTable[key]['kind'] == "PROPERTY_ALIAS") referenceTable.push("?"+variable)
				}
			} else{
				var clId;
				for(var k in idTable){
					if (idTable[k] == className) {
						clId = k;
						break;
					}
				}

				messages.push({
					"type" : "Error",
					"message" : "Unrecognized variable '" + varName + "'. Please specify variable.",
					"listOfElementId" : [clId],
					"isBlocking" : true
				});
				//Interpreter.showErrorMsg("Unrecognized variable '" + varName + "'. Please specify variable.");
			}
		}
		if (key == "Additive" || key == "Unary") {
			isExpression = true
			SPARQLstring = SPARQLstring + expressionTable[key];
			visited = 1;
		}
		if (key == "RDFLiteral") {
			SPARQLstring = SPARQLstring + expressionTable[key]['String'];
			if (typeof expressionTable[key]['LANGTAG'] !== 'undefined'){
				SPARQLstring = SPARQLstring + expressionTable[key]['LANGTAG'];
			}
			if (typeof expressionTable[key]['iri'] !== 'undefined'){
				if (typeof expressionTable[key]['iri']['PrefixedName'] !== 'undefined'){
					SPARQLstring = SPARQLstring + "^^" + expressionTable[key]['iri']['PrefixedName']['var']['name'];
					if(expressionTable[key]['iri']['PrefixedName']['var']['name'].toLowerCase().startsWith("xsd:") == true) prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
				}
				if (typeof expressionTable[key]['iri']['IRIREF'] !== 'undefined'){
					SPARQLstring = SPARQLstring + expressionTable[key]['iri']['IRIREF'];
				}
			}
			visited = 1;
		}
		
		if (key == "Aggregate") {
			if(parseType == "condition"){
				var clId;
				for(var k in idTable){
					if (idTable[k] == className) {
						clId = k;
						break;
					}
				}
				messages.push({
					"type" : "Error",
					"message" : "Aggregates are allowed only in result sets",
					"listOfElementId" : [clId],
					"isBlocking" : true
				});
			 }//else{
				isAggregate = true
				//if value["Aggregate"] == "COUNT" or value["Aggregate"] == "COUNT DISTINCT" then isCount = true end //???
				SPARQLstring = SPARQLstring + expressionTable[key]['Aggregate'];
				var DISTINCT = "";
				if (typeof expressionTable[key]['DISTINCT'] !== 'undefined') DISTINCT = expressionTable[key]['DISTINCT'] + " ";
				if (expressionTable[key]['Aggregate'].toLowerCase() == 'group_concat'){
					var separator = "";
					if (typeof expressionTable[key]['SEPARATOR'] !== 'undefined') separator = "; SEPARATOR=" + expressionTable[key]['SEPARATOR'];
					else {
						if(typeof parameterTable["defaultGroupingSeparator"] !== 'undefined') separator = "; SEPARATOR='"+ parameterTable["defaultGroupingSeparator"] +"'";
						else separator = "; SEPARATOR=','";
					}	
					SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + separator + ")";
				}
				else {
					SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
				}
			// }
			visited = 1
		}
		
		if (key == "RelationalExpression") {
			if(typeof expressionTable[key]["Relation"]!== 'undefined' && parseType != "condition"){
				 var clId;
				 for(var k in idTable){
					if (idTable[k] == className) {
						clId = k;
						break;
					}
				 }
				messages.push({
					"type" : "Error",
					"message" : "Incorrect use of relation " + expressionTable[key]["Relation"] + ", it cannot be used in " + parseType,
					"listOfElementId" : [clId],
					"isBlocking" : true
				});
				visited = 1
			} else {
				if(typeof expressionTable[key]["Relation"]!== 'undefined') {
					var VarL = findINExpressionTable(expressionTable[key]["NumericExpressionL"], "PrimaryExpression");
					var VarR = findINExpressionTable(expressionTable[key]["NumericExpressionR"], "PrimaryExpression");
					
					if((typeof VarL["NumericLiteral"] !== 'undefined' && typeof VarR["var"] !== 'undefined' && (VarR["var"]['kind'] == "CLASS_NAME" || VarR["var"]['kind'] == "CLASS_ALIAS"))
						|| (typeof VarR["NumericLiteral"] !== 'undefined' && typeof VarL["var"] !== 'undefined' && (VarL["var"]['kind'] == "CLASS_NAME" || VarL["var"]['kind'] == "CLASS_ALIAS"))){
							var clId;
							 for(var k in idTable){
								if (idTable[k] == className) {
									clId = k;
									break;
								}
							 }
							messages.push({
								"type" : "Error",
								"message" : "Class id '" + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation).substring(1) +"' can not be used in relational expression." ,
								"listOfElementId" : [clId],
								"isBlocking" : true
							});
							visited = 1
						}
				}
				if(visited != 1){
					var Usestringliteralconversion = parameterTable["useStringLiteralConversion"];
					//console.log("symbolTable",  symbolTable);
					if(typeof Usestringliteralconversion !== 'undefined' && Usestringliteralconversion == "SIMPLE" && typeof expressionTable[key]["Relation"]!== 'undefined' && (expressionTable[key]["Relation"] == "=" || expressionTable[key]["Relation"] == "!=" || expressionTable[key]["Relation"] == "<>")) {
						var relation = expressionTable[key]["Relation"];
						if(relation == "<>") relation = "!=";
						if (typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&&typeof  expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& ((typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
						&& ((expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]!= null
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
						
						&& (expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]== 'XSD_STRING'
						 || expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]== 'xsd:string'))
							
							|| (typeof symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
							
							&& (symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]!== null &&
							(symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'XSD_STRING'
							 || symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'xsd:string'))
							
							))
						) ||
						(typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
						&& ((expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]!= null
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
						
						&& (expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]== 'XSD_STRING'
						 || expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]== 'xsd:string')
						
						) || (typeof symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
							&& symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'XSD_STRING'))
						) 
						|| (typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]!== 'undefined'
						&& ((expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]!= null
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] !== 'undefined'
						
						&& (expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] == 'XSD_STRING'
						 || expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] == 'xsd:string')) 
						 
							|| (typeof symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["name"]] !== 'undefined'
							
							&& (symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["name"]]["type"]["type"]== 'XSD_STRING'
							 || symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["name"]]["type"]["type"]== 'xsd:string')))
						))
						
						&& typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]=== 'undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionL"]) == false
						){
							SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ") " + relation +" ";
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)	
							visited = 1
						}
						
						if(typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& ((typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
						&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]!= null
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
						
						&& (expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"] == "XSD_STRING"
						 || expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"] == "xsd:string"))
						 
						|| (typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]!== 'undefined'
						&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]!= null
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"]!== 'undefined'
						
						&& (expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] == "XSD_STRING"
						 || expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] == "xsd:string")))
						
						&& typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"] === 'undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionR"]) == false
						){
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)+ " " + relation + " ";
							SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)+")";
							visited = 1
						}
					}
					
					if(Usestringliteralconversion == "TYPED" && typeof expressionTable[key]["Relation"]!== 'undefined' && (expressionTable[key]["Relation"] == "=" || expressionTable[key]["Relation"] == "!=" || expressionTable[key]["Relation"] == "<>")) {
						var relation = expressionTable[key]["Relation"];
						if(relation == "<>") relation = "!=";
						if (typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
						&& ((expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]!=null
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
						
						&& (expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"] == "XSD_STRING"
						 || expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"] == "xsd:string"))
						 
						|| (typeof symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
							&& (symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'XSD_STRING'
							 || symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'xsd:string')))
						
						&& typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]==='undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionL"]) == false)
						{
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " ";
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "^^xsd:string";
							prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
							visited = 1
						}
						
						if (typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
						&& ((expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]!=null
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
						
						&& (expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"] == "XSD_STRING"
						 || expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"] == "xsd:string"))
						 
						|| (typeof symbolTable[expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
							&& (symbolTable[expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'XSD_STRING'
							 || symbolTable[expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'xsd:string')))
						
						&& typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]==='undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionR"]) == false)
						{
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)+"^^xsd:string " + relation + " ";
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
							prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
							visited = 1
						}
					}
					
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_NAME'
						
						&& typeof expressionTable[key]['NumericExpressionR'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& (expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'CLASS_NAME' ||
						expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'CLASS_ALIAS')
						){
							referenceCandidateTable.push(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']);
							if(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == "CLASS_ALIAS" || expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == "PROPERTY_ALIAS") referenceTable.push("?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'])
							
							var inFilter = null;
							var variableData = expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'];
							if(typeof variableNamesClass[variableData['name']] !== 'undefined' && (variableNamesClass[variableData['name']]["isVar"] != true
							|| variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))) inFilter = true;
							tripleTable.push({"var":"?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'], "prefixedName":getPrefix(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["Prefix"])+":"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"], "object":className, "inFilter":inFilter});
							visited = 1
						}
					}
					
					if(visited != 1){
						SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation); 
						
						if (typeof expressionTable[key]['Relation'] !== 'undefined'){
							isExpression = true;
							if (expressionTable[key]["Relation"] == "<>") SPARQLstring = SPARQLstring  + " != ";
							else if (expressionTable[key]["Relation"] == "NOTIN") SPARQLstring = SPARQLstring  + " NOT IN";
							else SPARQLstring = SPARQLstring  + " " + expressionTable[key]["Relation"] + " ";
							if (expressionTable[key]["Relation"] == "IN" || expressionTable[key]["Relation"] == "NOTIN") {
								var Var = findINExpressionTable(expressionTable[key]["NumericExpressionL"], "var");
								
								if(typeof Var["type"] !== 'undefined' && Var["type"] != null && typeof Var["type"]["type"] !== 'undefined' && (Var["type"]["type"] == "XSD_STRING" || Var["type"]["type"] == "xsd:string")){
									SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key]["ExpressionList"], "", className, alias, generateTriples, isSimpleVariable, true) + ")";
								}
								else SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key]["ExpressionList"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";//?????????????????? ExpressionList
							}
							if (typeof expressionTable[key]["NumericExpressionR"] !== 'undefined') SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
							if (typeof expressionTable[key]["classExpr"] !== 'undefined') {
								if(alias!=null)SPARQLstring = SPARQLstring  + "?" +alias;
								else SPARQLstring = SPARQLstring  + "?" +className;
							}
						}
						visited = 1
					}
				}
			}
		}
		if (key == "NumericLiteral") {
			if(isUnderInRelation == true) SPARQLstring = SPARQLstring +  '"' + expressionTable[key]['Number'] + '"';
			else SPARQLstring = SPARQLstring + expressionTable[key]['Number'];
			visited = 1;
		}
		if (key == "MultiplicativeExpression") {
			if(typeof expressionTable[key]["UnaryExpressionList"]!== 'undefined' && typeof expressionTable[key]["UnaryExpressionList"][0]!== 'undefined' && typeof expressionTable[key]["UnaryExpressionList"][0]["Unary"]!== 'undefined'
			&& expressionTable[key]["UnaryExpressionList"][0]["Unary"] == "/"){
				var res = generateExpression(expressionTable[key]["UnaryExpression"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")/";
					prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
				}
				res = generateExpression(expressionTable[key]["UnaryExpressionList"][0]["UnaryExpression"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")";
					prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
				}
				isFunction = true;
			}
			else{
				if(typeof expressionTable[key]["UnaryExpression"]["Additive"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + expressionTable[key]["UnaryExpression"]["Additive"];
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["UnaryExpression"]["PrimaryExpression"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
				}
				else SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["UnaryExpression"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
				if (typeof expressionTable[key]["UnaryExpressionList"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["UnaryExpressionList"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				}
			}
			visited = 1
		}
		
		if (key == "MultiplicativeExpressionList"){
			for(var k in expressionTable[key]){
				if(typeof expressionTable[key][k]["Additive"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + expressionTable[key][k]["Additive"]
					SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpression:expressionTable[key][k]["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
					isExpression = true
				}
			}
			visited = 1
		}
		
		
		if (key == "AdditiveExpression") {
			var additiveExpression = expressionTable[key];
			if (typeof additiveExpression["MultiplicativeExpressionList"] !== 'undefined' 
			&& typeof additiveExpression["MultiplicativeExpressionList"][0] !== 'undefined'
			&& ((typeof additiveExpression["MultiplicativeExpressionList"][0]["Concat"]!== 'undefined') 
				|| (typeof additiveExpression["MultiplicativeExpressionList"][1] === 'undefined'
				&& typeof additiveExpression["MultiplicativeExpressionList"][0]["Additive"]!== 'undefined' 
				&& typeof additiveExpression["MultiplicativeExpressionList"][0]["Additive"]=="-") )) {}
			else {SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) }
			if (typeof additiveExpression["MultiplicativeExpressionList"] !== 'undefined') {
				if (typeof additiveExpression["MultiplicativeExpressionList"][0] !== 'undefined' && typeof additiveExpression["MultiplicativeExpressionList"][0]["Concat"]!== 'undefined') {
					var concat = "CONCAT(" + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
					for(var k in additiveExpression["MultiplicativeExpressionList"]){
						if (typeof additiveExpression["MultiplicativeExpressionList"][k]["Concat"] !== 'undefined') {
							isFunction = true
							concat = concat + ", " + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpressionList"][k]["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
						} else break
					}
					concat = concat + ") "
					SPARQLstring = SPARQLstring + concat
				}
				else if (typeof additiveExpression["MultiplicativeExpressionList"][0] !== 'undefined' && 
				typeof additiveExpression["MultiplicativeExpressionList"][1] !== 'undefined' &&
				typeof additiveExpression["MultiplicativeExpressionList"][0]["Additive"]!== 'undefined' &&
				typeof additiveExpression["MultiplicativeExpressionList"][0]["Additive"]=="-" ) {
					if (typeof additiveExpression["MultiplicativeExpression"]!== 'undefined' &&
					   typeof additiveExpression["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined' &&
					   (typeof additiveExpression["MultiplicativeExpression"]["UnaryExpressionList"]=== 'undefined' || (typeof additiveExpression["MultiplicativeExpression"]["UnaryExpressionList"]!== 'undefined' && typeof additiveExpression["MultiplicativeExpression"]["UnaryExpressionList"][0]=== 'undefined')) &&
					   typeof additiveExpression["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined' &&
						
					   typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]!== 'undefined' &&
					   typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined' &&
					   (typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpressionList"]=== 'undefined' || (typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpressionList"]!== 'undefined' && typeof additiveExpression["MultiplicativeExpressionList"][10]["MultiplicativeExpression"]["UnaryExpressionList"][0]=== 'undefined')) &&
					   typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined') {
						var left = additiveExpression["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]
						var right = additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]
					
						var sl = generateExpression({PrimaryExpression : left}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						var sr = generateExpression({PrimaryExpression : right}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						// if lQuery("Onto#Parameter[name='SPARQL engine type']"):attr("value") == "OpenLink Virtuoso" then
						if(typeof parameterTable["queryEngineType"] !== 'undefined' && parameterTable["queryEngineType"] == "VIRTUOSO"){
							var dateArray = ["xsd:date", "XSD_DATE", "xsd_date"];
							var dateTimeArray = ["xsd:dateTime", "XSD_DATE_TIME", "xsd_date"];
							if(isDateVar(left, dateArray, symbolTable) == true && isDateVar(right, dateArray, symbolTable) == true){
								SPARQLstring = SPARQLstring + 'bif:datediff("day", ' + sr + ", " + sl + ")";
								isFunction = true;
								isTimeFunction = true;
							} else if(isDateVar(left, dateTimeArray, symbolTable) == true && isDateVar(right, dateTimeArray, symbolTable) == true){
								SPARQLstring = SPARQLstring + 'bif:datediff("day", ' + sr + ", " + sl + ")";
								isFunction = true;
								isTimeFunction = true;
							} else if(isDateVar(left, dateTimeArray, symbolTable) == true && isValidForConvertation(right, symbolTable) == true ){
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								SPARQLstring = SPARQLstring + 'bif:datediff("day", xsd:dateTime(' + sr + '),' + sl + ")";
								isFunction = true;
								isTimeFunction = true;
							} else if(isDateVar(left, dateTimeArray, symbolTable) == true){
								SPARQLstring = SPARQLstring + 'bif:datediff("day",  ' + sr + ', xsd:dateTime(' + sl + "))";
								isFunction = true;
								isTimeFunction = true;
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
							} else {
								var value = generateExpression({MultiplicativeExpression : additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
							// if (isDateVar(left) == true or isDateVar(right) == true or isDateTimeVar(left) == true or isDateTimeVar(right) == true) and showIncorrectSyntaxForm == true then incorrectSyntaxForm(additiveExpression, "Unsupported Syntax for General SPARQL option") end
							SPARQLstring = SPARQLstring  + value
							}
						} else {
							var value = generateExpression({MultiplicativeExpression : additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
							// if (isDateVar(left) == true or isDateVar(right) == true or isDateTimeVar(left) == true or isDateTimeVar(right) == true) and showIncorrectSyntaxForm == true then incorrectSyntaxForm(additiveExpression, "Unsupported Syntax for General SPARQL option") end
							SPARQLstring = SPARQLstring  + value
						}
					}
				} else SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
			}
			visited = 1
		}
		
		
		if (key == "PrimaryExpression" && typeof expressionTable[key]["iri"]!== 'undefined') {
			if (typeof expressionTable[key]["iri"]["PrefixedName"]!== 'undefined'){
				var valueString = expressionTable[key]["iri"]["PrefixedName"]['var']['name'];
				if(expressionTable[key]["iri"]["PrefixedName"]['var']['type'] !== null){
					//valueString = expressionTable[key]["iri"]["PrefixedName"]['var']['type']['localName'];
					//triple
					//tripleTable.push({"var":"?"+valueString, "prefixedName":expressionTable[key]["iri"]["PrefixedName"]['var']['name'], "object":className, "inFilter" : true});
					//prefix
					//if(expressionTable[key]["iri"]["PrefixedName"]['var']['type']['Prefix'] !== null) prefixTable[expressionTable[key]["iri"]["PrefixedName"]['var']['type']['Prefix']+":"] = expressionTable[key]["iri"]["PrefixedName"]['var']['type']['Namespace'];
					valueString = generateExpression({"var" : expressionTable[key]["iri"]["PrefixedName"]['var']}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				}
				
				if (valueString == "vq:datediff") valueString = "bif:datediff" ;
				SPARQLstring = SPARQLstring  + valueString
			}
			if (typeof expressionTable[key]["iri"]["IRIREF"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + expressionTable[key]["iri"]["IRIREF"];
			}
			if (typeof expressionTable[key]["ArgList"]!== 'undefined' && expressionTable[key]["ArgList"]!= ''){
				var DISTINCT = '';
				if (typeof expressionTable[key]["ArgList"]["DISTINCT"]!== 'undefined') DISTINCT = expressionTable[key]["ArgList"]["DISTINCT"] + " ";
				var o = {ArgList : expressionTable[key]["ArgList"]};
				SPARQLstring = SPARQLstring  + "(" + DISTINCT + " " + generateExpression(o, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			}
			visited = 1
		}
		if (key == "FunctionExpression") { 
			isFunction = true
			if(typeof expressionTable[key]["Function"]!== 'undefined' && (expressionTable[key]["Function"].toLowerCase() == 'month' || expressionTable[key]["Function"].toLowerCase() == 'day' || expressionTable[key]["Function"].toLowerCase() == 'year'
				|| expressionTable[key]["Function"].toLowerCase() == 'timezone' || expressionTable[key]["Function"].toLowerCase() == 'tz')) isTimeFunction = true;
			if (typeof expressionTable[key]["Function"]!== 'undefined') {
				if(expressionTable[key]["Function"].toLowerCase() == 'date' || expressionTable[key]["Function"].toLowerCase() == 'datetime') {
					SPARQLstring = SPARQLstring+ "xsd:";
					prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
					isTimeFunction = true;
				}
				SPARQLstring = SPARQLstring  + expressionTable[key]["Function"];
			}
			if (typeof expressionTable[key]["Expression"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + "(" + generateExpression({Expression : expressionTable[key]["Expression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			}
			var expTable = [];
			if (typeof expressionTable[key]["Expression1"]!== 'undefined') {
				expTable.push(generateExpression({Expression : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation));
			}
			if (typeof expressionTable[key]["Expression2"]!== 'undefined') {
				expTable.push(generateExpression({Expression : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation));
			}
			if (typeof expressionTable[key]["Expression3"]!== 'undefined') {
				expTable.push(generateExpression({Expression : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation));
			}
			if(expTable.length > 0) SPARQLstring = SPARQLstring  + " (" + expTable.join(", ") +")";
			if (typeof expressionTable[key]["ExpressionList"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + "(" + generateExpression({ExpressionList : expressionTable[key]["ExpressionList"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			}
			if (typeof expressionTable[key]["FunctionTime"]!== 'undefined') {
				isTimeFunction = true;
				if(typeof parameterTable["queryEngineType"] !== 'undefined' && parameterTable["queryEngineType"] == "VIRTUOSO"){
				// if lQuery("Onto#Parameter[name='SPARQL engine type']"):attr("value") == "OpenLink Virtuoso" then
					var fun = expressionTable[key]["FunctionTime"].toLowerCase();
					var sl = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionL"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
					var sr = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionR"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
					var dateArray = ["xsd:date", "XSD_DATE", "xsd_date"];
					var dateTimeArray = ["xsd:dateTime", "XSD_DATE_TIME", "xsd_date"];
					if(isDateVar(expressionTable[key]["PrimaryExpressionL"], dateArray, symbolTable) == true && isDateVar(expressionTable[key]["PrimaryExpressionR"], dateArray, symbolTable) == true){
						SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '", ' + sr + ", " + sl + ")";
					}
					else if(isDateVar(expressionTable[key]["PrimaryExpressionL"], dateTimeArray, symbolTable) == true && isDateVar(expressionTable[key]["PrimaryExpressionR"], dateTimeArray, symbolTable) == true){
						SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '", ' + sr + ", " + sl + ")";
					}
					else if(isDateVar(expressionTable[key]["PrimaryExpressionL"], dateTimeArray, symbolTable) == true && isValidForConvertation(expressionTable[key]["PrimaryExpressionR"], symbolTable) == true ){
						SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '",  xsd:dateTime(' + sr + "), " + sl + ")";
						prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
					}
					else if(isDateVar(expressionTable[key]["PrimaryExpressionR"], dateTimeArray, symbolTable) == true){
						SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '", ' + sr + ", xsd:dateTime(" + sl + "))";
						prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
					}
					else{
						var s = expressionTable[key]["FunctionTime"] + "(" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionL"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) +  "-" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionR"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")"
						// if showIncorrectSyntaxForm == true then incorrectSyntaxForm(s, "Unsupported Syntax for General SPARQL option") end
						SPARQLstring = SPARQLstring  + s
					}
				}else{
					var s = expressionTable[key]["FunctionTime"] + "(" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionL"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) +  "-" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionR"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")"
					// if showIncorrectSyntaxForm == true then incorrectSyntaxForm(s, "Unsupported Syntax for General SPARQL option") end
					SPARQLstring = SPARQLstring  + s
				}
			}
			
			visited = 1;
		}

		if (key == "ExpressionList") {
			for(var k in expressionTable[key]){
				SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key][k], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
			}
			visited = 1
		}

		if (key == "ArgListExpression") {
			for(var k in expressionTable[key]){
				SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key][k], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation); 
			}
			visited = 1
		}
		
		
		if (key == "SubstringExpression") {
		    isExpression = true
			var substr = "SUBSTR(";

			if(typeof parameterTable["queryEngineType"] !== 'undefined' && parameterTable["queryEngineType"] == "VIRTUOSO")	substr = "bif:substring(";
		    
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + substr + expr1 + expr2 + expr3 + ")";
		    visited = 1;
		}
		
		if(key == "Bound"){
			var and = "";
			var brackedOpen = ""; 
			var brackedClose = "";
			if(typeof expressionTable["RelationalExpression"] !== 'undefined') {
				and = " && ";
				brackedOpen = "(";
				brackedClose = ")";
			}
			SPARQLstring =  brackedOpen + "BOUND(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")" + and + SPARQLstring  + brackedClose;
			visited = 1;
		}
		if(key == "notBound"){
			var and = "";
			var brackedOpen = ""; 
			var brackedClose = "";
			if(typeof expressionTable["RelationalExpression"] !== 'undefined') {
				and = " && ";
				brackedOpen = "(";
				brackedClose = ")";
			}
			SPARQLstring = brackedOpen +  "!BOUND(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")" + and + SPARQLstring + brackedClose ;
			visited = 1;
		}
		if(key == "ExistsExpr"){
			var triples = [];
			for(var t in expressionTable[key]["Triple"]){
				var triple = "?" + expressionTable[key]["Triple"][t]["object"] + " " + expressionTable[key]["Triple"][t]["prefixedName"] + " ?" + expressionTable[key]["Triple"][t]["variable"]+ "." ;
				var temp = variableNamesAll[expressionTable[key]["Triple"][t]["variable"]];
				delete variableNamesClass[temp];
				delete variableNamesAll[expressionTable[key]["Triple"][t]["variable"]];
				variableNamesAll[temp] = temp;
				triples.push(triple);
			}
			// counter++;
			SPARQLstring = SPARQLstring  + "EXISTS{" + triples.join("\n") + " " + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "}";
			visited = 1;
			
		}
		if(key == "NotExistsExpr"){
			var triples = [];
			for(var t in expressionTable[key]["Triple"]){
				var triple = "?" + expressionTable[key]["Triple"][t]["object"] + " " + expressionTable[key]["Triple"][t]["prefixedName"] + " ?" + expressionTable[key]["Triple"][t]["variable"] + "." ;
			// counter++;
			
				var temp = variableNamesAll[expressionTable[key]["Triple"][t]["variable"]];
				delete variableNamesClass[temp];
				delete variableNamesAll[expressionTable[key]["Triple"][t]["variable"]];
				variableNamesAll[temp] = temp;
				triples.push(triple);
			}
			SPARQLstring = SPARQLstring  + "NOT EXISTS{" + triples.join("\n") + " " + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "}";
			visited = 1;
		}
		
		if(key == "Filter"){
			// generateTriples = false;
			SPARQLstring = SPARQLstring  + " FILTER(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			visited = 1;
			// generateTriples = true;
		}
		
		if (key == "Comma") {
			SPARQLstring = SPARQLstring + ", ";
			visited = 1
		}
		if (key == "OROriginal") {
			SPARQLstring = SPARQLstring + " || ";
			visited = 1
		}
		if (key == "ANDOriginal") {
			SPARQLstring = SPARQLstring + " && ";
			visited = 1
		}
		if (key == "RegexExpression") {
			SPARQLstring = SPARQLstring + "REGEX(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			visited = 1
			isFunction = true;
		}
		
		if (key == "SubstringBifExpression") {
			isFunction = true;
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "bif:substring(" + expr1 + expr2 + expr3 + ")";
			visited = 1
		}
		
		if (key == "StrReplaceExpression") {
			isFunction = true;
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "REPLACE(" + expr1 + expr2 + expr3 + ")";
			visited = 1
		}
		
		if (key == "ValueScope" && typeof expressionTable[key] !== 'undefined'){
			var tempAlias = alias;
			if(tempAlias == null) tempAlias = "expr";
			SPARQLstring = SPARQLstring  + "?" + tempAlias;
			tripleTable.push({"VALUES":"VALUES ?" + tempAlias + " {" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "}"});
			visited = 1
		}
		
		if(visited == 0 && typeof expressionTable[key] == 'object'){
			SPARQLstring += generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		}
	}
	return SPARQLstring
}
