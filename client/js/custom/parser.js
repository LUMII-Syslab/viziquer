var tripleTable = [];
var isAggregate = false;
var isFunction = false;
var isExpression = false;
var counter = 0;
var variableNamesAll = [];
var variableNamesClass = [];

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

function initiate_variables(vna, count){
	tripleTable = [];
	isAggregate = false;
	isFunction = false;
	isExpression = false;
	counter = count;
	variableNamesAll = vna;
	variableNamesClass = [];
}

parse_filter = function(parsed_exp, className, vna, count) {
	initiate_variables(vna, count);
	
	var parsed_exp1 = transformBetweenLike(parsed_exp);
	var parsed_exp2 = transformSubstring(parsed_exp1);
	// console.log(parsed_exp2);
	var parsed_exp3 = transformExistsNotExists(parsed_exp2, null, className);
	counter++;
	var result = generateExpression(parsed_exp3, "", className, null, true);
	
	// console.log(JSON.stringify(parsed_exp3,null,2));
	
	var uniqueTriples = createTriples(tripleTable).filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	return {"exp":result, "triples":uniqueTriples, "variableNamesClass":variableNamesClass, "counter":counter, "isAggregate":isAggregate, "isFunction":isFunction, "isExpression":isExpression};
}

parse_attrib = function(parsed_exp, alias, className, vnc, vna, count) {
	alias = alias || "";
	initiate_variables(vna, count);
	variableNamesClass = vnc;
	
	// check if given expression is simple variable name or agregation, function, expression
	// if given expression is simple variable, then in triple use alias(if exists), else - use variable names
	var isSimpleVaraible = checkIfIsSimpleVariable(parsed_exp, true);
	if(isSimpleVaraible == false || alias == "") alias = null; 
	var result = generateExpression(parsed_exp, "", className, alias, true);
	return {"exp":result, "triples":createTriples(tripleTable), "variableNamesClass":variableNamesClass, "counter":counter, "isAggregate":isAggregate, "isFunction":isFunction, "isExpression":isExpression};

}

parse_attribute = function(str, alias) {
	alias = alias || "";
	initiate_variables(vna, count);
	variableNamesClass = vnc;
	
	// check if given expression is simple variable name or agregation, function, expression
	// if given expression is simple variable, then in triple use alias(if exists), else - use variable names
	var isSimpleVaraible = checkIfIsSimpleVariable(parsed_exp, true);
	if(isSimpleVaraible == false || alias == "") alias = null; 
	var result = generateExpression(parsed_exp, "", className, alias, true);
	return result;

}

function checkIfIsSimpleVariable(expressionTable, isSimpleVaraible){
	
	for(var key in expressionTable){
		
		if(key == "Concat" || key == "Additive" || key == "Unary" || key == "Aggregate" || key == "Function" || key == "RegexExpression" ||
		key == "SubstringExpression" || key == "SubstringBifExpression" || key == "StrReplaceExpression" || key == "iri"){
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
		triples.push("?" + triple["object"] + " :" + triple["prefixedName"] + " ?" + triple["var"] +"." );
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
function setVariableName(varName, alias){
	if(alias != null) variableNamesClass[varName] = alias;
	else if(typeof variableNamesClass[varName]=== 'undefined'){
		if(typeof variableNamesAll[varName]=== 'undefined'){
			variableNamesClass[varName] = varName;
		} else {
			variableNamesClass[varName] = varName + "_" +counter;
			counter++;
		}
	}
	
	return variableNamesClass[varName];
}

// generate prefixedName path from path experession
// expressionTable - parsed expression table part with path definicion
function getPath(expressionTable){
	var path = "";
	for(var key in expressionTable){
		if(typeof expressionTable[key]["path"]!== 'undefined'){
			if(path == "") path = expressionTable[key]["path"]["name"];
			else path = path +"/:" + expressionTable[key]["path"]["name"];
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
		if(key == "ExistsFunc" || key == "NotExistsFunc"){
			var prefix = "";
			var existsExpr = "ExistsExpr";
			if(key == "NotExistsFunc") {
				prefix = "not";
				existsExpr = "NotExistsExpr";
			}

			var condOr = findINExpressionTable(expressionTable, "ConditionalOrExpression");
			transformExistsOR(condOr, prefix, existsExpr, 0, alias, className);
		}
		
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
		var tempAliasOrAttribute = "Attribute";
		if(tempAliasOrAttribute == "Alias"){
			expressionTable[count][prefix + "Bound"] = {"var":findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")}
		} else if(tempAliasOrAttribute == "Attribute"){
			var pe = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "PrimaryExpression");
			var variable, prefixedName
			if(typeof pe["Reference"] !== 'undefined'){
				variable = setVariableName(pe["var"]["name"] + "_" + pe["Reference"]["name"], alias);
				prefixedName = pe["var"]["name"];
			}
			else if(typeof pe["Path"] !== 'undefined'){
				prefixedName = getPath(pe["Path"]);
				variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
				variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
				variable = setVariableName(pe["var"]["name"], alias)
			}
			else if(typeof pe["var"] !== 'undefined') {
				variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
				variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
				variable = setVariableName(pe["var"]["name"], alias);
				prefixedName = pe["var"]["name"];
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
		var tempAliasOrAttribute = "Attribute";
		if(tempAliasOrAttribute == "Alias"){
			expressionTable[count][prefix + "Bound"] = {"var":findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")}
			delete expressionTable[count]["RelationalExpression"];
		} else if(tempAliasOrAttribute == "Attribute"){
			var pe = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "PrimaryExpression");
			var variable, prefixedName
			if(typeof pe["Reference"] !== 'undefined'){
				variable = setVariableName(pe["var"]["name"] + "_" + pe["Reference"]["name"], alias);
				prefixedName = pe["var"]["name"];
			}
			else if(typeof pe["Path"] !== 'undefined'){
				prefixedName = getPath(pe["Path"]);
				variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
				variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
				variable = setVariableName(pe["var"]["name"], alias);
			}
			else if(typeof pe["var"] !== 'undefined') {
				variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
				variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
				variable = setVariableName(pe["var"]["name"], alias);
				prefixedName = pe["var"]["name"];
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

function generateExpression(expressionTable, SPARQLstring, className, alias, generateTriples){
	for(var key in expressionTable){
		var visited = 0;
		
		
		if(key == "PrimaryExpression" && typeof expressionTable[key]["Reference"] !== 'undefined'){
			var variable = setVariableName(expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"], alias)
			if(generateTriples == true) tripleTable.push({"var":variable, "prefixedName":expressionTable[key]["var"]["name"], "object":expressionTable[key]["Reference"]["name"]});
			SPARQLstring = SPARQLstring + "?" + variable;
			visited = 1;
		}
		
		if(key == "PrimaryExpression" && typeof expressionTable[key]["Path"] !== 'undefined'){
			var prefixName = getPath(expressionTable[key]["Path"]);
			var variable = setVariableName(expressionTable[key]["PrimaryExpression"]["var"]["name"], alias)
			if(generateTriples == true) tripleTable.push({"var":variable, "prefixedName":prefixName+ "/:" + expressionTable[key]["PrimaryExpression"]["var"]["name"], "object":className});
			SPARQLstring = SPARQLstring + "?" + variable;
			visited = 1;
		}
		
		if (key == "BrackettedExpression") {
			SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key], "", className, alias, generateTriples) + ")";
			visited = 1;
		}
		
		if (key == "NotExistsFunc" || key == "ExistsFunc") {
			generateTriples = false
			SPARQLstring = SPARQLstring + generateExpression(expressionTable[key], "", className, alias, generateTriples);
			visited = 1;
			generateTriples = true
		}
		if (key == "BooleanLiteral") {
			SPARQLstring = SPARQLstring + expressionTable[key];
			visited = 1;
		}
		if(key == "var") {
			var variable = setVariableName(expressionTable[key]["name"], alias)
			SPARQLstring = SPARQLstring + "?" + variable;
			if(generateTriples == true) tripleTable.push({"var":variable, "prefixedName":expressionTable[key]["name"], "object":className});
		}
		if (key == "Additive" || key == "Unary") {
			isExpression = true
			SPARQLstring = SPARQLstring + expressionTable[key];
			visited = 1;
		}
		if (key == "RDFLiteral") {
			SPARQLstring = SPARQLstring + expressionTable[key]['String'];
			if (typeof expressionTable[key]['LANGTAG'] !== 'undefined'){
				SPARQLstring = SPARQLstring + expressionTable[key]['LANGTAG']
			}
			if (typeof expressionTable[key]['iri'] !== 'undefined'){
				if (typeof expressionTable[key]['iri']['PrefixedName'] !== 'undefined'){
					SPARQLstring = SPARQLstring + expressionTable[key]['iri']['PrefixedName']
				}
				if (typeof expressionTable[key]['iri']['IRIREF'] !== 'undefined'){
					SPARQLstring = SPARQLstring + expressionTable[key]['iri']['IRIREF']
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
				//elseif lQuery("Onto#Parameter[name='Default grouping separator']"):attr("value") == "true" and lQuery("Onto#Parameter[name='Default grouping separator']"):attr("input")~="" then
				//	separator = '; SEPARATOR="' .. lQuery("Onto#Parameter[name='Default grouping separator']"):attr("input") .. '"'
				//end
				
				SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "", className, alias, generateTriples) + separator + ")";
			}
			else {
				SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "", className, alias, generateTriples) + ")";
			}
			visited = 1
		}
		
		if (key == "RelationalExpression") {
			SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples); 
			//TODO atributa tips XSD_STRING
			if (typeof expressionTable[key]['Relation'] !== 'undefined'){
				isExpression = true;
				if (expressionTable[key]["Relation"] == "<>") SPARQLstring = SPARQLstring  + " != ";
				else if (expressionTable[key]["Relation"] == "NOTIN") SPARQLstring = SPARQLstring  + " NOT IN";
				else SPARQLstring = SPARQLstring  + " " + expressionTable[key]["Relation"] + " ";
				if (expressionTable[key]["Relation"] == "IN" || expressionTable[key]["Relation"] == "NOTIN") {
					SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key]["ExpressionList"], "", className, alias, generateTriples) + ")";//?????????????????? ExpressionList
				}
				if (typeof expressionTable[key]["NumericExpressionR"] !== 'undefined') SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples);
			}
			visited = 1
		}
		if (key == "NumericLiteral") {
			SPARQLstring = SPARQLstring + expressionTable[key]['Number'];
			visited = 1;
		}
		if (key == "MultiplicativeExpression") {
			if(typeof expressionTable[key]["UnaryExpressionList"]!== 'undefined' && typeof expressionTable[key]["UnaryExpressionList"][0]!== 'undefined' && typeof expressionTable[key]["UnaryExpressionList"][0]["Unary"]!== 'undefined'
			&& expressionTable[key]["UnaryExpressionList"][0]["Unary"] == "/"){
				var res = generateExpression(expressionTable[key]["UnaryExpression"], "", className, alias, generateTriples)
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")/";
				}
				res = generateExpression(expressionTable[key]["UnaryExpressionList"][0]["UnaryExpression"], "", className, alias, generateTriples)
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")";
				}
				isFunction = true
			}
			else{
				if(typeof expressionTable[key]["UnaryExpression"]["Additive"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + expressionTable[key]["UnaryExpression"]["Additive"];
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["UnaryExpression"]["PrimaryExpression"], "", className, alias, generateTriples);
				}
				else SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["UnaryExpression"], "", className, alias, generateTriples);
				if (typeof expressionTable[key]["UnaryExpressionList"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["UnaryExpressionList"], "", className, alias, generateTriples)
				}
			}
			visited = 1
		}
		
		if (key == "MultiplicativeExpressionList"){
			for(var k in expressionTable[key]){
				if(typeof expressionTable[key][k]["Additive"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + expressionTable[key][k]["Additive"]
					SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpression:expressionTable[key][k]["MultiplicativeExpression"]}, "", className, alias, generateTriples)
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
			else {SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples) }
			if (typeof additiveExpression["MultiplicativeExpressionList"] !== 'undefined') {
				if (typeof additiveExpression["MultiplicativeExpressionList"][0] !== 'undefined' && typeof additiveExpression["MultiplicativeExpressionList"][0]["Concat"]!== 'undefined') {
					var concat = " CONCAT(" + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples)
					for(var k in additiveExpression["MultiplicativeExpressionList"]){
						if (typeof additiveExpression["MultiplicativeExpressionList"]["Concat"] !== 'undefined') {
							isFunction = true
							concat = concat + ", " + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpressionList"]["MultiplicativeExpression"]}, "", className, alias, generateTriples)
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
					
						// var sl = generateExpression({PrimaryExpression : left}, "", className, alias, generateTriples)
						// var sr = generateExpression({PrimaryExpression : right}, "", className, alias, generateTriples)
						// if lQuery("Onto#Parameter[name='SPARQL engine type']"):attr("value") == "OpenLink Virtuoso" then
							// if isDateVar(left) == true and isDateVar(right) == true then
								// SPARQLstring = SPARQLstring + 'bif:datediff("day", ' + sr + ", " + sl + ")"
								// isFunction = true
							// elseif isDateTimeVar(left) == true and isDateTimeVar(right) == true then
								// SPARQLstring = SPARQLstring + 'bif:datediff("day", ' + sr + ", " + sl + ")"
								// isFunction = true
							// elseif isDateTimeVar(left) == true and isValidForConvertation(right) then
								// SPARQLstring = SPARQLstring + 'bif:datediff("day", xsd:dateTime(' + sr + '),' + sl + ")"
								// prefixes["xsd:"] = lQuery("Onto#Prefix[shortForm='xsd:']"):attr("fullForm")
								// isFunction = true
							// elseif isDateTimeVar(left) == true then
								// SPARQLstring = SPARQLstring + 'bif:datediff("day",  ' + sr + ', xsd:dateTime(' + sl + "))"
								// prefixes["xsd:"] = lQuery("Onto#Prefix[shortForm='xsd:']"):attr("fullForm")
								// isFunction = true
							// else
								// SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpression = value["MultiplicativeExpression"]}, "", className, alias, generateTriples)
								// SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpressionList = value["MultiplicativeExpressionList"]}, "", className, alias, generateTriples)
							// end
						// else
							var value = generateExpression({MultiplicativeExpression : additiveExpression["MultiplicativeExpression"]}, "", className, alias, generateTriples) + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, alias, generateTriples)
							// if (isDateVar(left) == true or isDateVar(right) == true or isDateTimeVar(left) == true or isDateTimeVar(right) == true) and showIncorrectSyntaxForm == true then incorrectSyntaxForm(additiveExpression, "Unsupported Syntax for General SPARQL option") end
							SPARQLstring = SPARQLstring  + value
						// end
					}
				} else SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, alias, generateTriples)
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
				SPARQLstring = SPARQLstring  + "(" + DISTINCT + " " + generateExpression(o, "", className, alias, generateTriples) + ")";
			}
			visited = 1
		}
		if (key == "FunctionExpression") { 
			isFunction = true
			if (typeof expressionTable[key]["Function"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + expressionTable[key]["Function"];
			}
			if (typeof expressionTable[key]["Expression"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + "(" + generateExpression({Expression : expressionTable[key]["Expression"]}, "", className, alias, generateTriples) + ")";
			}
			if (typeof expressionTable[key]["ExpressionList"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + "(" + generateExpression({ExpressionList : expressionTable[key]["ExpressionList"]}, "", className, alias, generateTriples) + ")";
			}
			if (typeof expressionTable[key]["FunctionTime"]!== 'undefined') {
				// if lQuery("Onto#Parameter[name='SPARQL engine type']"):attr("value") == "OpenLink Virtuoso" then
					// local fun = value["FunctionTime"]
					// local sl = generateExpression({PrimaryExpression = value["PrimaryExpressionL"]}, "")
					// local sr = generateExpression({PrimaryExpression = value["PrimaryExpressionR"]}, "")
					// if isDateVar(value["PrimaryExpressionL"]) == true and isDateVar(value["PrimaryExpressionR"]) == true then
						// SPARQLstring = SPARQLstring .. 'bif:datediff("' .. string.sub(fun, 1, string.len(fun)-1) .. '", ' .. sr .. ", " .. sl .. ")"
					// elseif isDateTimeVar(value["PrimaryExpressionL"]) == true and isDateTimeVar(value["PrimaryExpressionR"]) == true then
						// SPARQLstring = SPARQLstring .. 'bif:datediff("' .. string.sub(fun, 1, string.len(fun)-1) .. '", ' .. sr .. ", " .. sl .. ")"
					// elseif isDateTimeVar(value["PrimaryExpressionL"]) == true and isValidForConvertation(value["PrimaryExpressionR"]) then
						// SPARQLstring = SPARQLstring .. 'bif:datediff("' .. string.sub(fun, 1, string.len(fun)-1) .. ',  xsd:dateTime(' .. sr .. "), " .. sl .. ")"
						// prefixes["xsd:"] = lQuery("Onto#Prefix[shortForm='xsd:']"):attr("fullForm")
					// elseif isDateTimeVar(value["PrimaryExpressionR"]) == true then
						// SPARQLstring = SPARQLstring .. 'bif:datediff("' .. string.sub(fun, 1, string.len(fun)-1) .. '", ' .. sr .. ", xsd:dateTime(" .. sl .. "))"
						// prefixes["xsd:"] = lQuery("Onto#Prefix[shortForm='xsd:']"):attr("fullForm")
					// else
						// if showIncorrectSyntaxForm == true then incorrectSyntaxForm(fun .. "(" .. sl .. "-" .. sr .. ")") end
						// SPARQLstring = SPARQLstring .. fun .. "(" .. sl .. "-" .. sr .. ")"
					// end
				// else
					var s = expressionTable[key]["FunctionTime"] + "(" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionL"]}, "", className, alias, generateTriples) +  "-" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionR"]}, "", className, alias, generateTriples) + ")"
					// if showIncorrectSyntaxForm == true then incorrectSyntaxForm(s, "Unsupported Syntax for General SPARQL option") end
					SPARQLstring = SPARQLstring  + s
				// end
			}
			//???????????????????????????
			// var fipairs = "";
			// for(var k in expressionTable[key]){
				// if (fipairs == "") fipairs = generateExpression({0:expressionTable[key][k]}, "", className, alias, generateTriples)
				// else fipairs = fipairs + ", " + generateExpression({0:expressionTable[key][k]}, "", className, alias, generateTriples)
			// }
			// if (fipairs!="") SPARQLstring = SPARQLstring + "(" + fipairs + ")"
			// ??????????????????????????
			visited = 1;
		}

		if (key == "ExpressionList") {
			for(var k in expressionTable[key]){
				SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key][k], "", className, alias, generateTriples);
			}
			visited = 1
		}

		if (key == "ArgListExpression") {
			for(var k in expressionTable[key]){
				SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key][k], "", className, alias, generateTriples); 
			}
			visited = 1
		}
		
		
		if (key == "SubstringExpression") {
		    isExpression = true
			// if lQuery("Onto#Parameter[name='SPARQL engine type']"):attr("value") == "OpenLink Virtuoso" then
				// SPARQLstring = SPARQLstring  .. "bif:substring(" .. generateExpression({ExpressionList = value}, "") .. ")"
			// else
				// SPARQLstring = SPARQLstring  .. "SUBSTR(" .. generateExpression({ExpressionList = value}, "") .. ")"
			// end
		    var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "SUBSTR(" + expr1 + expr2 + expr3 + ")";
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
			SPARQLstring =  brackedOpen + "BOUND(" + generateExpression(expressionTable[key], "", className, alias, generateTriples) + ")" + and + SPARQLstring  + brackedClose;
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
			SPARQLstring = brackedOpen +  "!BOUND(" + generateExpression(expressionTable[key], "", className, alias, generateTriples) + ")" + and + SPARQLstring + brackedClose ;
			visited = 1;
		}
		if(key == "ExistsExpr"){
			var triple = "?" + expressionTable[key]["Triple"]["object"] + " :" + expressionTable[key]["Triple"]["prefixedName"] + " ?" + expressionTable[key]["Triple"]["variable"]+ "." ;
			// counter++;
			SPARQLstring = SPARQLstring  + "EXISTS{" + triple + " " + generateExpression(expressionTable[key], "", className, alias, generateTriples) + "}";
			visited = 1;
			var temp = variableNamesAll[expressionTable[key]["Triple"]["variable"]];
			delete variableNamesClass[temp];
			delete variableNamesAll[expressionTable[key]["Triple"]["variable"]];
			variableNamesAll[temp] = temp;
		}
		if(key == "NotExistsExpr"){
			var triple = "?" + expressionTable[key]["Triple"]["object"] + " :" + expressionTable[key]["Triple"]["prefixedName"] + " ?" + expressionTable[key]["Triple"]["variable"] + "." ;
			// counter++;
			SPARQLstring = SPARQLstring  + "NOT EXISTS{" + triple + " " + generateExpression(expressionTable[key], "", className, alias, generateTriples) + "}";
			visited = 1;
			var temp = variableNamesAll[expressionTable[key]["Triple"]["variable"]];
			delete variableNamesClass[temp];
			delete variableNamesAll[expressionTable[key]["Triple"]["variable"]];
			variableNamesAll[temp] = temp;
		}
		
		if(key == "Filter"){
			SPARQLstring = SPARQLstring  + " FILTER(" + generateExpression(expressionTable[key], "", className, alias, generateTriples) + ")";
			visited = 1;
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
			SPARQLstring = SPARQLstring + "REGEX(" + generateExpression(expressionTable[key], "", className, alias, generateTriples) + ")";
			visited = 1
		}
		
		if (key == "SubstringBifExpression") {
			isFunction = true;
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "bif:substring(" + expr1 + expr2 + expr3 + ")";
			visited = 1
		}
		
		if (key == "StrReplaceExpression") {
			isFunction = true;
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, alias, generateTriples);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, alias, generateTriples);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, alias, generateTriples);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "REPLACE(" + expr1 + expr2 + expr3 + ")";
			visited = 1
		}
		
		if(visited == 0 && typeof expressionTable[key] == 'object'){
			SPARQLstring += generateExpression(expressionTable[key], "", className, alias, generateTriples);
		}
	}
	return SPARQLstring
}
