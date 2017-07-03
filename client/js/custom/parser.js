var tripleTable = [];
var variableTable = [];
var isAggregate = false;
var isFunction = false;
var isExpression = false;
var counter = 0;
var variableNamesAll = [];
var variableNamesClass = [];
var expressionLevelNames = [];
var prefixTable = [];
var parseType;
var isSimpleVaraible;
var applyExistsToFilter = null;
var emptyPrefix = null;

makeString = function (o){
	var str='';
	_.each(o, function(val) {

		if(typeof val == 'string'){
			str+= val;
		}
		else{

			if (_.isObject(val)) {
				str+= makeString(val);
			}
		}
	});

	return str;
}

function getPrefix(givenPrefix){
	if(emptyPrefix == givenPrefix) return "";
	return givenPrefix;
}

function initiate_variables(vna, count, pt, ep){
	tripleTable = [];
	variableTable = [];
	isAggregate = false;
	isFunction = false;
	isExpression = false;
	applyExistsToFilter = null;
	counter = count;
	variableNamesAll = vna;
	variableNamesClass = [];
	expressionLevelNames = [];
	prefixTable = [];
	parseType = pt;
	emptyPrefix = ep;
}

parse_filter = function(parsed_exp, className, vna, count,ep) {
	initiate_variables(vna, count, "different", ep);
	
	var parsed_exp1 = transformBetweenLike(parsed_exp);
	var parsed_exp2 = transformSubstring(parsed_exp1);
	// console.log(parsed_exp2);
	var parsed_exp3 = transformExistsNotExists(parsed_exp2, null, className);
	counter++;
	var result = generateExpression(parsed_exp3, "", className, null, true, false);
	
	// console.log(JSON.stringify(parsed_exp3,null,2));
	// console.log("applyExistsToFilter", applyExistsToFilter);
	
	var uniqueTriples = createTriples(tripleTable).filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	// if in filter expression is used variable name, then put filter inside EXISTS
	if(applyExistsToFilter != null && applyExistsToFilter == true){
		result = "EXISTS{" + uniqueTriples.join("\n") + "\nFILTER(" + result + ")}";
		uniqueTriples = [];
	}
	
	return {"exp":result, "triples":uniqueTriples, "expressionLevelNames":expressionLevelNames, "counter":counter, "isAggregate":isAggregate, "isFunction":isFunction, "isExpression":isExpression, "prefixTable":prefixTable};
}

parse_attrib = function(parsed_exp, alias, className, vnc, vna, count, ep) {
	alias = alias || "";
	
	//TODO check if use one variable or different
	//when new abstrack syntax JSON ir ready
	
	initiate_variables(vna, count, "condition", ep);
	variableNamesClass = vnc;
	var parsed_exp1 = transformSubstring(parsed_exp);
	// check if given expression is simple variable name or agregation, function, expression
	// if given expression is simple variable, then in triple use alias(if exists), else - use variable names
	isSimpleVaraible = checkIfIsSimpleVariable(parsed_exp1, true);
	if(isSimpleVaraible == false || alias == "") alias = null; 
	var result = generateExpression(parsed_exp1, "", className, alias, true, isSimpleVaraible);
	return {"exp":result, "triples":createTriples(tripleTable), "variables":variableTable, "variableNamesClass":variableNamesClass, "counter":counter, "isAggregate":isAggregate, "isFunction":isFunction, "isExpression":isExpression, "prefixTable":prefixTable};

}

// for JH GenerateSPARQL
parse_attribute = function(str, alias) {
	alias = alias || "";
	initiate_variables(vna, count, "condition");
	variableNamesClass = vnc;
	
	// check if given expression is simple variable name or agregation, function, expression
	// if given expression is simple variable, then in triple use alias(if exists), else - use variable names
	isSimpleVaraible = checkIfIsSimpleVariable(parsed_exp, true);
	if(isSimpleVaraible == false || alias == "") alias = null; 
	var result = generateExpression(parsed_exp, "", className, alias, true, isSimpleVaraible);
	return result;

}

function checkIfIsSimpleVariable(expressionTable, isSimpleVaraible){
	
	for(var key in expressionTable){
		
		if(key == "Concat" || key == "Additive" || key == "Unary" || key == "Aggregate" || key == "Function" || key == "RegexExpression" ||
		key == "SubstringExpression" || key == "SubstringBifExpression" || key == "StrReplaceExpression" || key == "iri" || key == "FunctionTime"){
			isSimpleVaraible = false;
		}
		
		if(isSimpleVaraible == true && typeof expressionTable[key] == 'object'){
			var temp = checkIfIsSimpleVariable(expressionTable[key], isSimpleVaraible);
			if(temp==false) isSimpleVaraible = false;
		}
	}
	return isSimpleVaraible;
}

function createTriples(tripleTable){
	var triples = []
	_.each(tripleTable,function(triple) {
		if(typeof triple["BIND"] === 'string') triples.push(triple["BIND"]);
		else if(typeof triple["VALUES"] === 'string') triples.push(triple["VALUES"]);
		else triples.push("?" + triple["object"] + " " + triple["prefixedName"] + " " + triple["var"] + "." );
	})
	return triples;
}

function createTripleBlockTable(expressionTable, t){
	for(var key in expressionTable){
		if(typeof expressionTable[key] == 'object'){
			createTripleBlockTable(expressionTable[key], t)
		}
		if (key == "PrimaryExpression") { 
			var cn = 'className'
			var varValue = ''
			var prefixedNameValue = ''
			if (typeof expressionTable[key]['var'] !== 'undefined'){
				varValue =  expressionTable[key]['var']
				//no ontologijas jaatrod propertijas URI (jaskatas Onto#Attribute un Onto#AllAssociation klases)
				prefixedNameValue = "???"
				/*if lQuery("Onto#Attribute[name='" .. string.sub(varValue, 2) .. "']"):is_not_empty() then
					prefixedNameValue = generate_SPARQL.getURI("Onto#Attribute", string.sub(varValue, 2))
				elseif lQuery("Onto#AllAssociation[name='" .. string.sub(varValue, 2) .. "']"):is_not_empty() then
					prefixedNameValue = generate_SPARQL.getURI("Onto#AllAssociation", string.sub(varValue, 2))
				else
					return
				end*/
			} //TO DO citi zari
			else return 
			
			var attributeAlias
			var object = attributeAlias
			if(object == null){
				object = varValue
			}
			cn = "?" + cn
			
			if (typeof expressionTable[key]['INV'] !== 'undefined'){
				var temp = cn
				cn = object
				object = temp
			}
			
			t[varValue] = {
			  varOrTerm : {
				var : cn
			  },
			  propertyListNotEmpty : {
				verb : {
				  varOrIRIref : {
					iriRef : {
					  prefixedName : prefixedNameValue
					}
				  }
				},
				objectList : {
				  object : {
					graphNode : {
					  varOrTerm : {
						var : object
					  }
					}
				  }
				}
			  }
			}
		}
	}
	return t
}

function generateTriples(expressionTable){
	var tripleTable = new Object();
	for(var key in expressionTable){
		var propertyList = expressionTable[key]["propertyListNotEmpty"]
		var propertyList2 = expressionTable[key]["propertyListNotEmpty"]
		var tripleString = expressionTable[key]["varOrTerm"]["var"] + " "
		+ propertyList["verb"]["varOrIRIref"]["iriRef"]["prefixedName"] + " "
		+ propertyList2["objectList"]["object"]["graphNode"]["varOrTerm"]["var"];
		tripleTable[tripleString] = tripleString;
	}
	return tripleTable;
}

// set unique variable name
// varName - given variable
// alias - given variable alias
// if alias is not empty then use alias
// else: if variable is not defined yet, in given class scope:
	// if variable is not taken yet: use variable
	// else use variable+_+counter
	
// function setVariableName(varName, alias){
	// if(alias != null) variableNamesClass[varName] = alias;
	// else if(typeof variableNamesClass[varName]=== 'undefined'){
		// if(typeof variableNamesAll[varName]=== 'undefined'){
			// variableNamesClass[varName] = varName;
		// } else {
			// variableNamesClass[varName] = varName + "_" +counter;
			// counter++;
		// }
	// }
	
	// return variableNamesClass[varName];
// }

function setVariableName(varName, alias, variableData){
	if(alias != null) {
		variableNamesClass[varName] = alias;
		return alias;
	}
	else if(variableData["kind"] == "PROPERTY_NAME" || typeof variableData["kind"] === 'undefined'){
		applyExistsToFilter = true;
		if(parseType == "different"){
			if(typeof expressionLevelNames[varName] === 'undefined'){
				if(typeof variableNamesAll[varName]=== 'undefined'){
					expressionLevelNames[varName] = varName;
				} else {
					expressionLevelNames[varName] = varName + "_" +counter;
					counter++;
				}
			}else{
				return expressionLevelNames[varName];
			}
		}else{
			// if given expression is simple variable name
			if(isSimpleVaraible == true){
				// variable is not defined in given class attributes yet
				if(typeof variableNamesClass[varName] === 'undefined'){
					var tempVarName;
					if(typeof variableNamesAll[varName]=== 'undefined'){
						tempVarName = varName;
					} else {
						tempVarName = varName + "_" +counter;
						counter++;
					}
					expressionLevelNames[varName] = tempVarName;
					variableNamesClass[varName] = {alias : tempVarName, isvar : true};
					return tempVarName;
				} else {
					//if is defined as one variable
					if(typeof variableNamesClass[varName]["isvar"] !== 'undefined'){
						expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
						return variableNamesClass[varName]["alias"];
					}else {
						expressionLevelNames[varName] = varName + "_" +counter;
						counter++;
						return expressionLevelNames[varName];
					}
				}
			}else{
				// if variable is not used it expression yet
				if(typeof expressionLevelNames[varName] === 'undefined'){
					// variable is not defined in given class attributes yet
					if(typeof variableNamesClass[varName] === 'undefined'){
						var tempVarName;
						if(typeof variableNamesAll[varName]=== 'undefined'){
							tempVarName = varName;
						} else {
							tempVarName = varName + "_" +counter;
							counter++;
						}
						expressionLevelNames[varName] = tempVarName;
						variableNamesClass[varName] = {alias : tempVarName};
						return tempVarName;
					} else {
						//if is defined as one variable
						if(typeof variableNamesClass[varName]["isvar"] !== 'undefined'){
							expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
							return variableNamesClass[varName]["alias"];
						}else {
							expressionLevelNames[varName] = varName + "_" +counter;
							counter++;
							return expressionLevelNames[varName];
						}
					}
				}else{
					return expressionLevelNames[varName];
				}
			}
		}
		return expressionLevelNames[varName];
	} else {
		return varName;
	}
}

// generate prefixedName path from path experession
// expressionTable - parsed expression table part with path definicion
getPath = function(expressionTable){
	var path = "";
	for(var key in expressionTable){
		if(typeof expressionTable[key]["path"]!== 'undefined'){
			var pathPart =  getPrefix(expressionTable[key]["path"]["type"]["Prefix"]) + ":" + expressionTable[key]["path"]["name"];
			prefixTable[getPrefix(expressionTable[key]["path"]["type"]["Prefix"]) + ":"] = "<"+expressionTable[key]["path"]["type"]["Namespace"]+"#>"
			if(typeof expressionTable[key]["path"]["inv"] === "string") pathPart = "^" + pathPart;
			if(path == "") path = pathPart;
			else path = path +"/" + pathPart;
		}
	}
	return path;
}

// find necessary level in expressionTable and return it
// expressionTable - parsed expression table
// level - level name
function findINExpressionTable(expressionTable, level){
	for(var key in expressionTable){
		if (key == level) {
			v = expressionTable[key];
			return v;
		}else{
			if(typeof expressionTable[key] == 'object'){
				v = findINExpressionTable(expressionTable[key], level);
			}
		}
	}
	return v;
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

function transformExistsAND(expressionTable, prefix, existsExpr, count, alias, className){
	if(typeof expressionTable[count]["RelationalExpression"]["Relation"] !== 'undefined'){
		// var tempAliasOrAttribute = "Attribute";
		var tempAliasOrAttribute = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["kind"];
		if(tempAliasOrAttribute == "PROPERTY_ALIAS" || tempAliasOrAttribute == "CLASS_ALIAS"){
			expressionTable[count][prefix + "Bound"] = {"var":findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")}
		// } else if(tempAliasOrAttribute == "PROPERTY_NAME" || tempAliasOrAttribute == "CLASS_NAME"){
		} else {
			var pe = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "PrimaryExpression");
			var variable, prefixedName
			if(typeof pe["Reference"] !== 'undefined'){
				variable = setVariableName(pe["var"]["name"] + "_" + pe["Reference"]["name"], alias, pe["var"]);
				prefixedName = getPrefix(pe["var"]["type"]["Prefix"])+":"+pe["var"]["name"];
				prefixTable[getPrefix(pe["var"]["type"]["Prefix"]) + ":"] = "<"+pe["var"]["type"]["Namespace"]+"#>";
			}
			else if(typeof pe["Path"] !== 'undefined'){
				prefixedName = getPath(pe["Path"])+ "/" + getPrefix(pe["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":" + pe["PrimaryExpression"]["var"]["name"];
				variableNamesClass[pe["PrimaryExpression"]["var"]["name"]] = pe["PrimaryExpression"]["var"]["name"] + "_" + counter;
				variableNamesAll[pe["PrimaryExpression"]["var"]["name"]+ "_" + counter] = pe["PrimaryExpression"]["var"]["name"];
				variable = setVariableName(pe["PrimaryExpression"]["var"]["name"], alias, pe["PrimaryExpression"]["var"])
			}
			else if(typeof pe["var"] !== 'undefined') {
				variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
				variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
				variable = setVariableName(pe["var"]["name"], alias, pe["var"]);
				prefixedName = getPrefix(pe["var"]["type"]["Prefix"])+":"+pe["var"]["name"];
				prefixTable[getPrefix(pe["var"]["type"]["Prefix"]) + ":"] = "<"+pe["var"]["type"]["Namespace"]+"#>";
			}
					
			expressionTable[count] =  {
				[existsExpr] : {
					"Triple" : {
						"variable" : variable,
						"prefixedName" : prefixedName,
						"object" : className,
					},
					"Filter" : {"RelationalExpression":expressionTable[count]["RelationalExpression"]}
				}
			} 
		}
	} else {
		// var tempAliasOrAttribute = "Attribute";
		var tempAliasOrAttribute = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["kind"];
		if(tempAliasOrAttribute == "PROPERTY_ALIAS" || tempAliasOrAttribute == "CLASS_ALIAS"){
			expressionTable[count][prefix + "Bound"] = {"var":findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")}
			delete expressionTable[count]["RelationalExpression"];
		} else if(tempAliasOrAttribute == "PROPERTY_NAME" || tempAliasOrAttribute == "CLASS_NAME"){
			var pe = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "PrimaryExpression");
			var variable, prefixedName
			if(typeof pe["Reference"] !== 'undefined'){
				variable = setVariableName(pe["var"]["name"] + "_" + pe["Reference"]["name"], alias, pe["var"]);
				prefixedName = getPrefix(pe["var"]["type"]["Prefix"])+":"+pe["var"]["name"];
				prefixTable[getPrefix(pe["var"]["type"]["Prefix"]) + ":"] = "<"+pe["var"]["type"]["Namespace"]+"#>";
			}
			else if(typeof pe["Path"] !== 'undefined'){
				prefixedName = getPath(pe["Path"])+ "/" + getPrefix(pe["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":" + pe["PrimaryExpression"]["var"]["name"];
				variableNamesClass[pe["PrimaryExpression"]["var"]["name"]] = pe["PrimaryExpression"]["var"]["name"] + "_" + counter;
				variableNamesAll[pe["PrimaryExpression"]["var"]["name"]+ "_" + counter] = pe["PrimaryExpression"]["var"]["name"];
				variable = setVariableName(pe["PrimaryExpression"]["var"]["name"], alias, pe["PrimaryExpression"]["var"])
			}
			else if(typeof pe["var"] !== 'undefined') {
				variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
				variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
				variable = setVariableName(pe["var"]["name"], alias, pe["var"]);
				prefixedName = getPrefix(pe["var"]["type"]["Prefix"])+":"+pe["var"]["name"];
				prefixTable[getPrefix(pe["var"]["type"]["Prefix"]) + ":"] = "<"+pe["var"]["type"]["Namespace"]+"#>";
			}
					
			expressionTable[count] =  {
				[existsExpr] : {
					"Triple" : {
						"variable" : variable,
						"prefixedName" : prefixedName,
						"object" : className,
					},
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
				}
				else if(typeof pe["Path"] !== 'undefined'){
					prefixedName = getPath(pe["Path"]);
					variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
					variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
					variable = setVariableName(pe["var"]["name"], alias, pe["var"])
				}
				else if(typeof pe["var"] !== 'undefined') {
					variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
					variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
					variable = setVariableName(pe["var"]["name"], alias, pe["var"]);
					prefixedName = pe["var"]["name"];
				}
						
				expressionTable[count] =  {
					["ExistsExpr"] : {
						"Triple" : {
							"variable" : variable,
							"prefixedName" : prefixedName,
							"object" : className,
						},
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
				}
				else if(typeof pe["Path"] !== 'undefined'){
					prefixedName = getPath(pe["Path"]);
					variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
					variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
					variable = setVariableName(pe["var"]["name"], alias, pe["var"]);
				}
				else if(typeof pe["var"] !== 'undefined') {
					variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
					variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
					variable = setVariableName(pe["var"]["name"], alias, pe["var"]);
					prefixedName = pe["var"]["name"];
				}
						
				expressionTable[count] =  {
					["ExistsExpr"] : {
						"Triple" : {
							"variable" : variable,
							"prefixedName" : prefixedName,
							"object" : className,
						},
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
			expressionTable["ConditionalAndExpression"] = [ {
                  "RelationalExpression" : {
                    "NumericExpressionL" : {
                      "AdditiveExpression" : {
                        "MultiplicativeExpression" : {
                          "UnaryExpression" : {
                            "PrimaryExpression" : {
                            	"var" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"],
								"Substring": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Substring"],
					            "ReferenceToClass": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ReferenceToClass"],
					            "ValueScope": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ValueScope"],
					            "FunctionBETWEEN": null,
					            "FunctionLike": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionLike"]
                            },
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
                        {
                            "ANDOriginal": "&&",
                        },
                        {
                                "RelationalExpression": {
                                  "NumericExpressionL": {
                                    "AdditiveExpression": {
                                      "MultiplicativeExpression": {
                                        "UnaryExpression": {
                                          "PrimaryExpression": {
                                        	  "var" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"],
						                      "Substring": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Substring"],
						                      "ReferenceToClass": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ReferenceToClass"],
						                      "ValueScope": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ValueScope"],
						                      "FunctionBETWEEN": null,
						                      "FunctionLike": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionLike"]
                                          },
										},
                                       },
                                        "UnaryExpressionList": []
                                      },
                                      "MultiplicativeExpressionList": []
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

function transformSubstring(expressionTable){
	for(var key in expressionTable){
		
		if(typeof expressionTable[key] == 'object'){
			transformSubstring(expressionTable[key]);
		}

		
		if (key == "PrimaryExpression" && typeof expressionTable[key]["var"]!== 'undefined' && typeof expressionTable[key]["Substring"] !== 'undefined' && expressionTable[key]["Substring"]!="" ){
		
			var t = expressionTable[key];
			var substringValues = expressionTable[key]["Substring"];
			var substrStart, substrEnd = null;
			substrStart = substringValues.substring(1,2);
			if(substringValues.search(",") != -1) substrEnd = substringValues.substring(substringValues.search(",")+1,substringValues.search(",")+2);
			else substrEnd = substrStart;
		
			expressionTable["PrimaryExpression"] = {"SubstringExpression" : { 
				"Expression1":{
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
				"Expression2":{
                  "OrExpression" : [ {
                      "ANDExpression" : [ {
                          "ConditionalOrExpression" : [ {
                              "ConditionalAndExpression" : [ {
                                  "RelationalExpression" : {
                                    "NumericExpressionL" : {
                                      "AdditiveExpression" : {
                                        "MultiplicativeExpression" : {
                                          "UnaryExpression" : {
                                            "PrimaryExpression" :{
                                              "NumericLiteral" : {
                                                  "Number": substrStart
                                              }
                                            }
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
				"Expression3":{
                  "OrExpression" : [ {
                      "ANDExpression" : [ {
                          "ConditionalOrExpression" : [ {
                              "ConditionalAndExpression" : [ {
                                  "RelationalExpression" : {
                                    "NumericExpressionL" : {
                                      "AdditiveExpression" : {
                                        "MultiplicativeExpression" : {
                                          "UnaryExpression" : {
                                            "PrimaryExpression" :{
                                              "NumericLiteral" : {
                                                  "Number": substrEnd
                                              }
                                            }
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
                } }}
		}
	}
	return expressionTable
}

function generateExpression(expressionTable, SPARQLstring, className, alias, generateTriples, isSimpleVaraible){
	for(var key in expressionTable){
		var visited = 0;
		
		//REFERENCE
		if(key == "PrimaryExpression" && typeof expressionTable[key]["Reference"] !== 'undefined'){
			var variable = setVariableName(expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"], alias, expressionTable[key]["var"])
			if(generateTriples == true && expressionTable[key]["var"]['type'] != null) tripleTable.push({"var":"?"+variable, "prefixedName":expressionTable[key]["var"]["type"]["Prefix"]+":"+expressionTable[key]["var"]["name"], "object":expressionTable[key]["Reference"]["name"]});
			variableTable.push("?" + variable);
			SPARQLstring = SPARQLstring + "?" + variable;
			visited = 1;
		}
		
		//PATH
		if(key == "PrimaryExpression" && typeof expressionTable[key]["Path"] !== 'undefined'){
			var prefixName = getPath(expressionTable[key]["Path"]);
			// findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")
			if(typeof expressionTable[key]["PrimaryExpression"]["SubstringExpression"] !== 'undefined'){
				var substringvar = findINExpressionTable(expressionTable[key]["PrimaryExpression"], "var");
				var variable = setVariableName(substringvar["name"], alias, substringvar);
				variableTable.push("?" + variable);
				if(generateTriples == true && substringvar['type'] != null) {
					tripleTable.push({"var":"?"+variable, "prefixedName":prefixName+ "/" + getPrefix(substringvar["type"]["Prefix"]) + ":" + substringvar["name"], "object":className});
					prefixTable[getPrefix(substringvar["type"]["Prefix"]) + ":"] = "<"+substringvar["type"]["Namespace"]+"#>";
					generateTriples = false;
					SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["PrimaryExpression"], "", className, alias, generateTriples, isSimpleVaraible);
					generateTriples = true;
				}
			} else {
				var variable = setVariableName(expressionTable[key]["PrimaryExpression"]["var"]["name"], alias, expressionTable[key]["PrimaryExpression"]["var"])
				variableTable.push("?" + variable);
				if(generateTriples == true && expressionTable[key]["PrimaryExpression"]["var"]['type'] != null) {
					tripleTable.push({"var":"?"+variable, "prefixedName":prefixName+ "/" + getPrefix(expressionTable[key]["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":" + expressionTable[key]["PrimaryExpression"]["var"]["name"], "object":className});
					prefixTable[getPrefix(expressionTable[key]["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":"] = "<"+expressionTable[key]["PrimaryExpression"]["var"]["type"]["Namespace"]+"#>";
				}
				SPARQLstring = SPARQLstring + "?" + variable;
			}
			visited = 1;
		}
		
		//VariableName
		if (key == "VariableName") {
			SPARQLstring = SPARQLstring + expressionTable[key] + " " + "?"+alias;
			tripleTable.push({"var":"?"+alias, "prefixedName":expressionTable[key], "object":className});
			visited = 1;
		}
		
		if (key == "BrackettedExpression") {
			SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible) + ")";
			visited = 1;
		}
		
		if (key == "NotExistsFunc" || key == "ExistsFunc") {
			generateTriples = false
			SPARQLstring = SPARQLstring + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible);
			visited = 1;
			generateTriples = true
			applyExistsToFilter = false;
		}
		if (key == "BooleanLiteral") {
			SPARQLstring = SPARQLstring + expressionTable[key];
			visited = 1;
		}
		
		if (key == "classExpr"){
			SPARQLstring = SPARQLstring + "?" + className;
			variableTable.push("?" + className);
			visited = 1;
		}
		
		if(key == "var") {
			var variable = setVariableName(expressionTable[key]["name"], alias, expressionTable[key])
			SPARQLstring = SPARQLstring + "?" + variable;
			variableTable.push("?" + variable);
			if(generateTriples == true && expressionTable[key]['type'] != null && className != "[ ]" && className != "[ + ]") {
				
				if(expressionTable[key]['kind'] == "CLASS_NAME") tripleTable.push({"var": getPrefix(expressionTable[key]["type"]["Prefix"])+":"+expressionTable[key]["name"], "prefixedName" : "a", "object":variable});
				else if(expressionTable[key]['kind'] == "CLASS_ALIAS" && isSimpleVaraible == true && variable != expressionTable[key]["name"]){
					tripleTable.push({"BIND":"BIND(?" + expressionTable[key]["name"] + " AS ?" + variable + ")"})
				}else if(expressionTable[key]['kind'] == "CLASS_ALIAS" && alias == null) {
					
				} else {
					tripleTable.push({"var":"?"+variable, "prefixedName":getPrefix(expressionTable[key]["type"]["Prefix"])+":"+expressionTable[key]["name"], "object":className});
					prefixTable[getPrefix(expressionTable[key]["type"]["Prefix"]) + ":"] = "<"+expressionTable[key]["type"]["Namespace"]+"#>";
				}
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
					SPARQLstring = SPARQLstring + "^^" + expressionTable[key]['iri']['PrefixedName'];
				}
				if (typeof expressionTable[key]['iri']['IRIREF'] !== 'undefined'){
					SPARQLstring = SPARQLstring + expressionTable[key]['iri']['IRIREF'];
				}
			}
		}
		
		if (key == "Aggregate") {
			isAggregate = true
			//if value["Aggregate"] == "COUNT" or value["Aggregate"] == "COUNT DISTINCT" then isCount = true end //???
			SPARQLstring = SPARQLstring + expressionTable[key]['Aggregate'];
			var DISTINCT = "";
			if (typeof expressionTable[key]['DISTINCT'] !== 'undefined') DISTINCT = expressionTable[key]['DISTINCT'] + " ";
			if (expressionTable[key]['Aggregate'] == 'GROUP_CONCAT'){
				var separator = "";
				if (typeof expressionTable[key]['SEPARATOR'] !== 'undefined') separator = "; SEPARATOR=" + expressionTable[key]['SEPARATOR'];
				else {
					separator = "; SEPARATOR=','";
				}
				//elseif lQuery("Onto#Parameter[name='Default grouping separator']"):attr("value") == "true" and lQuery("Onto#Parameter[name='Default grouping separator']"):attr("input")~="" then
				//	separator = '; SEPARATOR="' .. lQuery("Onto#Parameter[name='Default grouping separator']"):attr("input") .. '"'
				//end
				
				SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "", className, alias, generateTriples, isSimpleVaraible) + separator + ")";
			}
			else {
				SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "", className, alias, generateTriples, isSimpleVaraible) + ")";
			}
			visited = 1
		}
		
		if (key == "RelationalExpression") {
			
			var Usestringliteralconversion = "Use simple string literals";
			if(Usestringliteralconversion == "Use simple string literals" && typeof expressionTable[key]["Relation"]!== 'undefined' && expressionTable[key]["Relation"] == "=") {
				if (typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
				&&typeof  expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
				&& ((typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
				&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]== 'xsd:string'
				) ||
				(typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
				&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]== 'xsd:string'
				) 
				|| (typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] !== 'undefined'
				&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] == 'xsd:string'
				))
				
				&& typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]=== 'undefined'
				&& isFunctionExpr(expressionTable[key]["NumericExpressionL"]) == false
				){
					SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVaraible) + ") = ";
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVaraible)	
					visited = 1
				}
				
				if(typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
				&& ((typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
				&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"] == "xsd:string")
				|| (typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"]!== 'undefined'
				&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] == "xsd:string"))
				
				&& typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"] === 'undefined'
				&& isFunctionExpr(expressionTable[key]["NumericExpressionR"]) == false
				){
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVaraible)+" = "
					SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVaraible)+")"
					visited = 1
				}
			}
			
			if(Usestringliteralconversion == "Use typed string literals" && typeof expressionTable[key]["Relation"]!== 'undefined' && expressionTable[key]["Relation"] == "=") {
				if (typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
				&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"] == "xsd:string"
				
				&& typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]==='undefined'
				&& isFunctionExpr(expressionTable[key]["NumericExpressionL"]) == false)
				{
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVaraible) + " = ";
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVaraible) + "^^xsd:string";
					prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
					visited = 1
				}
				
				if (typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
				&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["type"] == "xsd:string"
				
				&& typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
				&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]==='undefined'
				&& isFunctionExpr(expressionTable[key]["NumericExpressionR"]) == false)
				{
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVaraible)+"^^xsd:string = ";
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVaraible);
					prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
					visited = 1
				}
			}
			
			// if visited~=1 then
				// if lQuery("Onto#Parameter[name='Use string literal conversion']"):attr("expressionTable[key]") == "Use simple string literals" && checkIfINRelExpr(expressionTable[key]) == true && isFunctionExpr(expressionTable[key]["NumericExpressionL"]) == false then
					// SPARQLstring = SPARQLstring  + "STR(" + getSPARQLGpoupGraphPatternExpression(expressionTable[key]["NumericExpressionL"], "") + ")"	
				// else
					// SPARQLstring = SPARQLstring  + getSPARQLGpoupGraphPatternExpression(expressionTable[key]["NumericExpressionL"], "") 
				// end
				// if expressionTable[key]["Relation"]~= nil then 
					// if expressionTable[key]["Relation"] == "<>" then SPARQLstring = SPARQLstring  + " !=" 
					// else SPARQLstring = SPARQLstring  + " " + expressionTable[key]["Relation"] end
					// if expressionTable[key]["Relation"] == "IN" || expressionTable[key]["Relation"] == "NOT IN" then
						// SPARQLstring = SPARQLstring + "(" + getSPARQLGpoupGraphPatternExpression2(expressionTable[key], "") + ")" 
					// end
					// if expressionTable[key]["NumericExpressionR"]~= nil then
						// SPARQLstring = SPARQLstring  + getSPARQLGpoupGraphPatternExpression(expressionTable[key]["NumericExpressionR"], "") 
					// end
				// end
				// visited = 1
			// end
			
			if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
				if(typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
				&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
				&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
				&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
				&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
				&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
				&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
				&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
				&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_NAME'
				
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
					tripleTable.push({"var":"?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'], "prefixedName":getPrefix(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["Prefix"])+":"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"], "object":className});
					visited = 1
				}
			}
			
			if(visited != 1){
				SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVaraible); 
				
				if (typeof expressionTable[key]['Relation'] !== 'undefined'){
					isExpression = true;
					if (expressionTable[key]["Relation"] == "<>") SPARQLstring = SPARQLstring  + " != ";
					else if (expressionTable[key]["Relation"] == "NOTIN") SPARQLstring = SPARQLstring  + " NOT IN";
					else SPARQLstring = SPARQLstring  + " " + expressionTable[key]["Relation"] + " ";
					if (expressionTable[key]["Relation"] == "IN" || expressionTable[key]["Relation"] == "NOTIN") {
						SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key]["ExpressionList"], "", className, alias, generateTriples, isSimpleVaraible) + ")";//?????????????????? ExpressionList
					}
					if (typeof expressionTable[key]["NumericExpressionR"] !== 'undefined') SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVaraible);
					if (typeof expressionTable[key]["classExpr"] !== 'undefined') SPARQLstring = SPARQLstring  + "?" +className;
				}
				visited = 1
			}
		}
		if (key == "NumericLiteral") {
			SPARQLstring = SPARQLstring + expressionTable[key]['Number'];
			visited = 1;
		}
		if (key == "MultiplicativeExpression") {
			if(typeof expressionTable[key]["UnaryExpressionList"]!== 'undefined' && typeof expressionTable[key]["UnaryExpressionList"][0]!== 'undefined' && typeof expressionTable[key]["UnaryExpressionList"][0]["Unary"]!== 'undefined'
			&& expressionTable[key]["UnaryExpressionList"][0]["Unary"] == "/"){
				var res = generateExpression(expressionTable[key]["UnaryExpression"], "", className, alias, generateTriples, isSimpleVaraible)
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")/";
					prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
				}
				res = generateExpression(expressionTable[key]["UnaryExpressionList"][0]["UnaryExpression"], "", className, alias, generateTriples, isSimpleVaraible)
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")";
					prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
				}
				isFunction = true
			}
			else{
				if(typeof expressionTable[key]["UnaryExpression"]["Additive"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + expressionTable[key]["UnaryExpression"]["Additive"];
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["UnaryExpression"]["PrimaryExpression"], "", className, alias, generateTriples, isSimpleVaraible);
				}
				else SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["UnaryExpression"], "", className, alias, generateTriples, isSimpleVaraible);
				if (typeof expressionTable[key]["UnaryExpressionList"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["UnaryExpressionList"], "", className, alias, generateTriples, isSimpleVaraible)
				}
			}
			visited = 1
		}
		
		if (key == "MultiplicativeExpressionList"){
			for(var k in expressionTable[key]){
				if(typeof expressionTable[key][k]["Additive"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + expressionTable[key][k]["Additive"]
					SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpression:expressionTable[key][k]["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVaraible)
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
			else {SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVaraible) }
			if (typeof additiveExpression["MultiplicativeExpressionList"] !== 'undefined') {
				if (typeof additiveExpression["MultiplicativeExpressionList"][0] !== 'undefined' && typeof additiveExpression["MultiplicativeExpressionList"][0]["Concat"]!== 'undefined') {
					var concat = " CONCAT(" + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVaraible)
					for(var k in additiveExpression["MultiplicativeExpressionList"]){
						if (typeof additiveExpression["MultiplicativeExpressionList"]["Concat"] !== 'undefined') {
							isFunction = true
							concat = concat + ", " + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpressionList"]["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVaraible)
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
					
						var sl = generateExpression({PrimaryExpression : left}, "", className, alias, generateTriples, isSimpleVaraible);
						var sr = generateExpression({PrimaryExpression : right}, "", className, alias, generateTriples, isSimpleVaraible);
						// if lQuery("Onto#Parameter[name='SPARQL engine type']"):attr("value") == "OpenLink Virtuoso" then
							if(isDateVar(left, "xsd:date") == true && isDateVar(right, "xsd:date") == true){
								SPARQLstring = SPARQLstring + 'bif:datediff("day", ' + sr + ", " + sl + ")";
								isFunction = true;
							} else if(isDateVar(left, "xsd:dateTime") == true && isDateVar(right, "xsd:dateTime") == true){
								SPARQLstring = SPARQLstring + 'bif:datediff("day", ' + sr + ", " + sl + ")";
								isFunction = true;
							} else if(isDateVar(left, "xsd:dateTime") == true && isValidForConvertation(right) == true ){
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								SPARQLstring = SPARQLstring + 'bif:datediff("day", xsd:dateTime(' + sr + '),' + sl + ")";
								isFunction = true;
							} else if(isDateVar(left, "xsd:dateTime") == true){
								SPARQLstring = SPARQLstring + 'bif:datediff("day",  ' + sr + ', xsd:dateTime(' + sl + "))";
								isFunction = true;
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
							} else {
								var value = generateExpression({MultiplicativeExpression : additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVaraible) + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, alias, generateTriples, isSimpleVaraible)
							// if (isDateVar(left) == true or isDateVar(right) == true or isDateTimeVar(left) == true or isDateTimeVar(right) == true) and showIncorrectSyntaxForm == true then incorrectSyntaxForm(additiveExpression, "Unsupported Syntax for General SPARQL option") end
							SPARQLstring = SPARQLstring  + value
							}
						// else
							var value = generateExpression({MultiplicativeExpression : additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples, isSimpleVaraible) + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, alias, generateTriples, isSimpleVaraible)
							// if (isDateVar(left) == true or isDateVar(right) == true or isDateTimeVar(left) == true or isDateTimeVar(right) == true) and showIncorrectSyntaxForm == true then incorrectSyntaxForm(additiveExpression, "Unsupported Syntax for General SPARQL option") end
							SPARQLstring = SPARQLstring  + value
						// end
					}
				} else SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, alias, generateTriples, isSimpleVaraible)
			}
			visited = 1
		}
		
		
		if (key == "PrimaryExpression" && typeof expressionTable[key]["iri"]!== 'undefined') {
			if (typeof expressionTable[key]["iri"]["PrefixedName"]!== 'undefined'){
				var valueString = expressionTable[key]["iri"]["PrefixedName"];
				if (valueString == "vq:datediff") valueString = "bif:datediff" ;
				/*elseif string.lower(valueString) == "xsd:date" or string.lower(valueString) == "xsd:datetime" then 
					isFunction = true
					prefixes["xsd:"] = lQuery("Onto#Prefix[shortForm='xsd:']"):attr("fullForm")
				else
					if lQuery("Onto#Prefix[shortForm='" .. string.sub(valueString,1, string.find(valueString, ":")) .. "']"):is_not_empty()
					and value["ArgList"]~=nil and value["ArgList"]==""	then
						prefixes[string.sub(valueString,1, string.find(valueString, ":"))] = lQuery("Onto#Prefix[shortForm='" .. string.sub(valueString,1, string.find(valueString, ":")) .. "']"):attr("fullForm")
						valueString = "?" .. string.sub(valueString, string.find(valueString, ":")+1)
					end
				end*/
				SPARQLstring = SPARQLstring  + valueString
			}
			if (typeof expressionTable[key]["iri"]["IRIREF"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + expressionTable[key]["iri"]["IRIREF"];
			}
			if (typeof expressionTable[key]["ArgList"]!== 'undefined' && expressionTable[key]["ArgList"]!= ''){
				var DISTINCT = '';
				if (typeof expressionTable[key]["ArgList"]["DISTINCT"]!== 'undefined') DISTINCT = expressionTable[key]["ArgList"]["DISTINCT"] + " ";
				var o = {ArgList : expressionTable[key]["ArgList"]};
				SPARQLstring = SPARQLstring  + "(" + DISTINCT + " " + generateExpression(o, "", className, alias, generateTriples, isSimpleVaraible) + ")";
			}
			visited = 1
		}
		if (key == "FunctionExpression") { 
			isFunction = true
			if (typeof expressionTable[key]["Function"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + expressionTable[key]["Function"];
			}
			if (typeof expressionTable[key]["Expression"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + "(" + generateExpression({Expression : expressionTable[key]["Expression"]}, "", className, alias, generateTriples, isSimpleVaraible) + ")";
			}
			if (typeof expressionTable[key]["ExpressionList"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + "(" + generateExpression({ExpressionList : expressionTable[key]["ExpressionList"]}, "", className, alias, generateTriples, isSimpleVaraible) + ")";
			}
			if (typeof expressionTable[key]["FunctionTime"]!== 'undefined') {
				// if lQuery("Onto#Parameter[name='SPARQL engine type']"):attr("value") == "OpenLink Virtuoso" then
					var fun = expressionTable[key]["FunctionTime"]
					var sl = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionL"]}, "", className, alias, generateTriples, isSimpleVaraible);
					var sr = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionR"]}, "", className, alias, generateTriples, isSimpleVaraible);
					if(isDateVar(expressionTable[key]["PrimaryExpressionL"], "xsd:date") == true && isDateVar(expressionTable[key]["PrimaryExpressionR"], "xsd:date") == true){
						SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '", ' + sr + ", " + sl + ")";
					}
					else if(isDateVar(expressionTable[key]["PrimaryExpressionL"], "xsd:dateTime") == true && isDateVar(expressionTable[key]["PrimaryExpressionR"], "xsd:dateTime") == true){
						SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '", ' + sr + ", " + sl + ")";
					}
					else if(isDateVar(expressionTable[key]["PrimaryExpressionL"], "xsd:dateTime") == true && isValidForConvertation(expressionTable[key]["PrimaryExpressionR"]) == true ){
						SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '",  xsd:dateTime(' + sr + "), " + sl + ")";
						prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
					}
					else if(isDateVar(expressionTable[key]["PrimaryExpressionR"], "xsd:dateTime") == true){
						SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '", ' + sr + ", xsd:dateTime(" + sl + "))";
						prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
					}
					
					else{
						var s = expressionTable[key]["FunctionTime"] + "(" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionL"]}, "", className, alias, generateTriples, isSimpleVaraible) +  "-" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionR"]}, "", className, alias, generateTriples, isSimpleVaraible) + ")"
						// if showIncorrectSyntaxForm == true then incorrectSyntaxForm(s, "Unsupported Syntax for General SPARQL option") end
						SPARQLstring = SPARQLstring  + s
					}
				// end
			}
			//???????????????????????????
			// var fipairs = "";
			// for(var k in expressionTable[key]){
				// if (fipairs == "") fipairs = generateExpression({0:expressionTable[key][k]}, "", className, alias, generateTriples, isSimpleVaraible)
				// else fipairs = fipairs + ", " + generateExpression({0:expressionTable[key][k]}, "", className, alias, generateTriples, isSimpleVaraible)
			// }
			// if (fipairs!="") SPARQLstring = SPARQLstring + "(" + fipairs + ")"
			// ??????????????????????????
			visited = 1;
		}

		if (key == "ExpressionList") {
			for(var k in expressionTable[key]){
				SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key][k], "", className, alias, generateTriples, isSimpleVaraible);
			}
			visited = 1
		}

		if (key == "ArgListExpression") {
			for(var k in expressionTable[key]){
				SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key][k], "", className, alias, generateTriples, isSimpleVaraible); 
			}
			visited = 1
		}
		
		
		if (key == "SubstringExpression") {
		    isExpression = true
			var substr = "SUBSTR(";
			// if(SPARQL engine type) 
				substr = "bif:substring(";
		    var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples, isSimpleVaraible);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples, isSimpleVaraible);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples, isSimpleVaraible);
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
			SPARQLstring =  brackedOpen + "BOUND(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible) + ")" + and + SPARQLstring  + brackedClose;
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
			SPARQLstring = brackedOpen +  "!BOUND(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible) + ")" + and + SPARQLstring + brackedClose ;
			visited = 1;
		}
		if(key == "ExistsExpr"){
			var triple = "?" + expressionTable[key]["Triple"]["object"] + " " + expressionTable[key]["Triple"]["prefixedName"] + " ?" + expressionTable[key]["Triple"]["variable"]+ "." ;
			// counter++;
			SPARQLstring = SPARQLstring  + "EXISTS{" + triple + " " + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible) + "}";
			visited = 1;
			var temp = variableNamesAll[expressionTable[key]["Triple"]["variable"]];
			delete variableNamesClass[temp];
			delete variableNamesAll[expressionTable[key]["Triple"]["variable"]];
			variableNamesAll[temp] = temp;
		}
		if(key == "NotExistsExpr"){
			var triple = "?" + expressionTable[key]["Triple"]["object"] + " " + expressionTable[key]["Triple"]["prefixedName"] + " ?" + expressionTable[key]["Triple"]["variable"] + "." ;
			// counter++;
			SPARQLstring = SPARQLstring  + "NOT EXISTS{" + triple + " " + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible) + "}";
			visited = 1;
			var temp = variableNamesAll[expressionTable[key]["Triple"]["variable"]];
			delete variableNamesClass[temp];
			delete variableNamesAll[expressionTable[key]["Triple"]["variable"]];
			variableNamesAll[temp] = temp;
		}
		
		if(key == "Filter"){
			// generateTriples = false;
			SPARQLstring = SPARQLstring  + " FILTER(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible) + ")";
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
			SPARQLstring = SPARQLstring + "REGEX(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible) + ")";
			visited = 1
		}
		
		if (key == "SubstringBifExpression") {
			isFunction = true;
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples, isSimpleVaraible);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples, isSimpleVaraible);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples, isSimpleVaraible);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "bif:substring(" + expr1 + expr2 + expr3 + ")";
			visited = 1
		}
		
		if (key == "StrReplaceExpression") {
			isFunction = true;
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples, isSimpleVaraible);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples, isSimpleVaraible);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples, isSimpleVaraible);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "REPLACE(" + expr1 + expr2 + expr3 + ")";
			visited = 1
		}
		
		if (key == "ValueScope"){
			var tempAlias = alias;
			if(tempAlias == null) tempAlias = "expr";
			SPARQLstring = SPARQLstring  + "?" + tempAlias;
			tripleTable.push({"VALUES":"VALUES ?" + tempAlias + " {" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible) + "}"});
			visited = 1
		}
		
		if(visited == 0 && typeof expressionTable[key] == 'object'){
			SPARQLstring += generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVaraible);
		}
	}
	return SPARQLstring
}

function isDateVar(v, dateType){
	if(typeof v["var"] !== 'undefined'){
		if( v["var"]["type"]["type"] == dateType) return true;
		else return false;
	}
	if(typeof v["RDFLiteral"] !== 'undefined'){
		if(typeof v["RDFLiteral"]["iri"] !== 'undefined' && typeof v["RDFLiteral"]["iri"]["PrefixedName"] !== 'undefined' && v["RDFLiteral"]["iri"]["PrefixedName"].toLowerCase() == dateType.toLowerCase()) return true;
		else return false;
	}
	if(typeof v["iri"] !== 'undefined' && typeof v["iri"]["PrefixedName"] !== 'undefined'){
		if( v["iri"]["PrefixedName"].toLowerCase() == dateType.toLowerCase()) return true;
		else return false;
	}
	if(typeof v["Path"] !== 'undefined'){
		if( v["PrimaryExpression"]["var"]["type"]["type"] == dateType) return true;
		else return false;
	}
	return false
}

function isValidForConvertation(v){
	if(isDateVar(v, "xsd:date") == true) return true;
	else{
		if(typeof v["RDFLiteral"] !== 'undefined') {
			var value = v["RDFLiteral"];
			if(typeof value["iri"]=== 'undefined') return true;
			else return false;
		}
	}
	return false
}

function isFunctionExpr(value){
	var r = false;
	if (typeof value == 'object') {
		for(var k in value){
			if (k == "FunctionExpression") r = true;
			else r = isFunctionExpr(value[k]);
		}
	}
	return r;
}