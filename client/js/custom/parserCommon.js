
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

checkIfIsSimpleVariable = function(expressionTable, isSimpleVariable, isUnderInRelation, isSimpleFilter){
	
	for(var key in expressionTable){
		
		if(key == "Concat" || key == "Additive" || key == "Unary"  || key == "Function" || key == "RegexExpression" || key == "Aggregate" ||
		key == "SubstringExpression" || key == "SubstringBifExpression" || key == "StrReplaceExpression" || key == "iri" || key == "FunctionTime"){
			isSimpleVariable = false;
		}
		if(key == "Concat" || key == "Additive" || key == "Unary"  || key == "Function" || key == "RegexExpression" || key == "Aggregate" ||
		key == "SubstringExpression" || key == "SubstringBifExpression" || key == "StrReplaceExpression" || key == "iri" || key == "FunctionTime" 
		|| key == "Comma" || key == "OROriginal" || key == "ANDOriginal"  || key == "ValueScope"  || key == "Filter"  || key == "NotExistsExpr" 
		|| key == "ExistsExpr" || key == "notBound" || key == "Bound" || key == "ArgListExpression" || key == "ExpressionList" || key == "FunctionExpression" || key == "classExpr" 
		|| key == "NotExistsFunc" || key == "ExistsFunc" || key == "BrackettedExpression" || key == "VariableName" ){
			isSimpleFilter = false;
		}
		
		//if(isSimpleVariable == true && typeof expressionTable[key] == 'object'){
		if(typeof expressionTable[key] == 'object'){
			var temp = checkIfIsSimpleVariable(expressionTable[key], isSimpleVariable, isUnderInRelation, isSimpleFilter);
			if(temp["isSimpleVariable"]==false) isSimpleVariable = false;
			if(temp["isSimpleFilter"]==false) isSimpleFilter = false;
		}
	}
	return {isSimpleVariable:isSimpleVariable, isSimpleFilter:isSimpleFilter};
}

checkIfIsSimpleVariableForNameDef = function(expressionTable, isSimpleVariableForNameDef){
	
	for(var key in expressionTable){
		
		if(key == "Concat" || key == "Additive" || key == "Unary"  || key == "Function" || key == "RegexExpression" || 
		//key == "SubstringExpression" || key == "SubstringBifExpression" || key == "StrReplaceExpression" || key == "iri" || key == "FunctionTime"){
		key == "SubstringExpression" || key == "SubstringBifExpression" || key == "StrReplaceExpression" || key == "FunctionTime"){
			isSimpleVariableForNameDef = false;
		}
		
		if(isSimpleVariableForNameDef == true && typeof expressionTable[key] == 'object'){
			var temp = checkIfIsSimpleVariableForNameDef(expressionTable[key], isSimpleVariableForNameDef);
			if(temp==false) isSimpleVariableForNameDef = false;
		}
	}
	return isSimpleVariableForNameDef;
}

// find necessary level in expressionTable and return it
// expressionTable - parsed expression table
// level - level name
findINExpressionTable = function(expressionTable, level){
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
//???
transformSubstring = function(expressionTable){
	for(var key in expressionTable){
		
		if(typeof expressionTable[key] == 'object'){
			transformSubstring(expressionTable[key]);
		}
	
		if (key == "PrimaryExpression" && typeof expressionTable[key]["var"]!== 'undefined' && typeof expressionTable[key]["Substring"] !== 'undefined' && expressionTable[key]["Substring"]!="" ){
				
			//var t = expressionTable[key];
			var t = JSON.parse(JSON.stringify(expressionTable[key]));
			//console.log(JSON.stringify(t,null,2), t["Substring"]);
			var substringValues = expressionTable[key]["Substring"];
			var substrStart, substrEnd = null;
			substrStart = substringValues.substring(1,2);
			if(substringValues.search(",") != -1) substrEnd = substringValues.substring(substringValues.search(",")+1,substringValues.search(",")+2);
			else substrEnd = substrStart;
		
			t["Substring"] = "";
		
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
	//console.log(JSON.stringify(expressionTable,null,2));
	return expressionTable
}

// if add symbolTable
isDateVar = function(v, dateType, symbolTable){
	if(typeof v["var"] !== 'undefined'){
		if((v["var"]["type"]!=null && dateType.indexOf(v["var"]["type"]["type"])> -1) || (typeof symbolTable[v["var"]["name"]] !== 'undefined' && symbolTable[v["var"]["name"]]["type"] != null && dateType.indexOf(symbolTable[v["var"]["name"]]["type"]["type"]) > -1)) return true;
		// if((v["var"]["type"]!=null && v["var"]["type"]["type"] == dateType) || (typeof symbolTable[v["var"]["name"]] !== 'undefined' && symbolTable[v["var"]["name"]]["type"] != null && symbolTable[v["var"]["name"]]["type"]["type"] == dateType)) return true;
		else return false;
	}
	if(typeof v["RDFLiteral"] !== 'undefined'){
		if(typeof v["RDFLiteral"]["iri"] !== 'undefined' && typeof v["RDFLiteral"]["iri"]["PrefixedName"] !== 'undefined' && dateType.indexOf(v["RDFLiteral"]["iri"]["PrefixedName"]['var']['name'].toLowerCase()) > -1) return true;
		// if(typeof v["RDFLiteral"]["iri"] !== 'undefined' && typeof v["RDFLiteral"]["iri"]["PrefixedName"] !== 'undefined' && v["RDFLiteral"]["iri"]["PrefixedName"]['var']['name'].toLowerCase() == dateType.toLowerCase()) return true;
		else return false;
	}
	if(typeof v["iri"] !== 'undefined' && typeof v["iri"]["PrefixedName"] !== 'undefined'){
		if(dateType.indexOf(v["iri"]["PrefixedName"]['var']['name'].toLowerCase()) > -1) return true;
		// if( v["iri"]["PrefixedName"]['var']['name'].toLowerCase() == dateType.toLowerCase()) return true;
		else return false;
	}
	if(typeof v["Path"] !== 'undefined'){
		if((v["PrimaryExpression"]["var"]["type"]!=null && dateType.indexOf(v["PrimaryExpression"]["var"]["type"]["type"]) > -1) || (typeof symbolTable[v["PrimaryExpression"]["var"]["name"]] !== 'undefined' && symbolTable[v["PrimaryExpression"]["var"]["name"]]["type"] != null && dateType.indexOf(symbolTable[v["PrimaryExpression"]["var"]["name"]]["type"]["type"]) > -1)) return true;
		else return false;
	}
	return false
}

isValidForConvertation = function(v, symbolTable){
	var dateArray = ["xsd:date", "XSD_DATE", "xsd_date"];
	if(isDateVar(v, dateArray, symbolTable) == true) return true;
	else{
		if(typeof v["RDFLiteral"] !== 'undefined') {
			var value = v["RDFLiteral"];
			if(typeof value["iri"]=== 'undefined') return true;
			else return false;
		}
	}
	return false
}

isFunctionExpr = function(value){
	var r = false;
	if (typeof value == 'object') {
		for(var k in value){
			if (k == "FunctionExpression") r = true;
			else r = isFunctionExpr(value[k]);
		}
	}
	return r;
}