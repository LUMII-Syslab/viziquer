
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

checkIfIsSimpleVariable = function(expressionTable, isSimpleVariable, isUnderInRelation, isSimpleFilter, isUnderOr, isUnderIf, isIRIREF){
	
	for(let key in expressionTable){
		
		if(key == "Concat" || key == "Additive" || key == "Unary"  || (key == "Function" && expressionTable[key] != "langmatchesShort" && expressionTable[key] != "langmatchesShortMultiple") || key == "RegexExpression" || key == "Aggregate" ||
		key == "SubstringExpression" || key == "SubstringBifExpression" || key == "StrReplaceExpression" || key == "IRIREF" || key == "FunctionTime"){
			isSimpleVariable = false;
		}
		if(key == "Concat" || key == "Additive" || key == "Unary"  || key == "Function" || key == "RegexExpression" || key == "Aggregate" ||
		key == "SubstringExpression" || key == "SubstringBifExpression" || key == "StrReplaceExpression" || key == "IRIREF" || key == "FunctionTime" 
		|| key == "Comma" || key == "OROriginal" || key == "ANDOriginal"  || key == "ValueScope"  || key == "Filter"  || key == "NotExistsExpr" 
		|| key == "ExistsExpr" || key == "notBound" || key == "Bound" || key == "ArgListExpression" || key == "ExpressionList" || key == "FunctionExpression" || key == "classExpr" 
		|| key == "NotExistsFunc" || key == "ExistsFunc" || key == "BrackettedExpression" || key == "VariableName" ){
			isSimpleFilter = false;
		}
		if(key == "OROriginal") isUnderOr = true;
		if(key == "Function" && expressionTable[key] == "IF") isUnderIf = true;
		if(key == "IRIREF") isIRIREF = true;
		
		//if(isSimpleVariable == true && typeof expressionTable[key] == 'object'){
		if(typeof expressionTable[key] == 'object'){
			var temp = checkIfIsSimpleVariable(expressionTable[key], isSimpleVariable, isUnderInRelation, isSimpleFilter, isUnderOr, isUnderIf, isIRIREF);
			if(temp["isSimpleVariable"]==false) isSimpleVariable = false;
			if(temp["isSimpleFilter"]==false) isSimpleFilter = false;
			if(temp["isUnderOr"]==true) isUnderOr = true;
			if(temp["isUnderIf"]==true) isUnderIf = true;
			if(temp["isIRIREF"]==true) isIRIREF = true;
		}
	}
	return {isSimpleVariable:isSimpleVariable, isSimpleFilter:isSimpleFilter, isUnderOr:isUnderOr, isUnderIf:isUnderIf, isIRIREF};
}

checkIfIsSimpleVariableForNameDef = function(expressionTable, isSimpleVariableForNameDef){
	
	for(let key in expressionTable){
		
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
	// var v = [];
	if(typeof expressionTable !== "undefined"){
		for(let key in expressionTable){
			if (key == level) {
				v = expressionTable[key];
				return v;
			}else{
				if(typeof expressionTable[key] == 'object'){
					v = findINExpressionTable(expressionTable[key], level);
				}
			}
		}
	}
	return v;
}
//???
transformSubstring = function(expressionTable){
	for(let key in expressionTable){
		
		if(typeof expressionTable[key] == 'object'){
			transformSubstring(expressionTable[key]);
		}
		var substringValues = null;
		if (key == "PrimaryExpression" && typeof expressionTable[key]["var"]!== 'undefined' && typeof expressionTable[key]["Substring"] !== 'undefined' && expressionTable[key]["Substring"]!="" ){
			substringValues = expressionTable[key]["Substring"];
		//} else if(key == "PrimaryExpression" && typeof expressionTable[key]["PathProperty"]!== 'undefined'){
		} else if(key == "PrimaryExpression" && typeof expressionTable[key]["PathProperty"]!== 'undefined' && typeof expressionTable[key]["Substring"] !== 'undefined' && expressionTable[key]["Substring"]!="" ){
			//var path = getPathFullGrammar(expressionTable[key]["PathProperty"]);
			//if(typeof path["variable"]!== 'undefined' && typeof path["variable"]["Substring"] !== 'undefined' && path["variable"]["Substring"]!=""){
			//	substringValues = path["variable"]["Substring"];
			//}
			substringValues = expressionTable[key]["Substring"];
		}
		if(substringValues != null){
			var t = JSON.parse(JSON.stringify(expressionTable[key]));
			//console.log(JSON.stringify(t,null,2), t["Substring"]);
			var substrStart, substrEnd = null;
			substrStart = substringValues.substring(1,2);
			if(substringValues.search(",") != -1) substrEnd = substringValues.substring(substringValues.search(",")+1,substringValues.search(",")+2);
			else {
				substrEnd = substrStart;
				substrStart = 1;
			}
		
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

function isDateVarSymbolTable(symbolTable, expression, dateType){
	var value = false;
	for(let key in symbolTable){
		if(typeof symbolTable[expression] !== 'undefined' && 
			symbolTable[expression]["type"] != null
			&& dateType.indexOf(symbolTable[expression]["type"]["data_type"]) > -1) value = true;
		
	}
	return value;
}

// if add symbolTable
isDateVar = function(v, dateType, symbolTable){
	if(typeof v["var"] !== 'undefined'){
		if((v["var"]["type"]!=null && dateType.indexOf(v["var"]["type"]["data_type"])> -1) || isDateVarSymbolTable(symbolTable, v["var"]["name"], dateType) == true) return true;
		// if((v["var"]["type"]!=null && v["var"]["type"]["data_type"] == dateType) || (typeof symbolTable[v["var"]["name"]] !== 'undefined' && symbolTable[v["var"]["name"]]["type"] != null && symbolTable[v["var"]["name"]]["type"]["data_type"] == dateType)) return true;
		else return false;
	}
	if(typeof v["RDFLiteral"] !== 'undefined'){
		if(typeof v["RDFLiteral"]["iri"] !== 'undefined' && typeof v["RDFLiteral"]["iri"]["PrefixedName"] !== 'undefined' && dateType.indexOf(v["RDFLiteral"]["iri"]["PrefixedName"]['var']['name'].toLowerCase()) > -1) return true;
		// if(typeof v["RDFLiteral"]["iri"] !== 'undefined' && typeof v["RDFLiteral"]["iri"]["PrefixedName"] !== 'undefined' && v["RDFLiteral"]["iri"]["PrefixedName"]['var']['name'].toLowerCase() == dateType.toLowerCase()) return true;
		else return false;
	}
	if(typeof v["iri"] !== 'undefined' && typeof v["iri"]["PrefixedName"] !== 'undefined'){
		if(dateType.indexOf(v["iri"]["PrefixedName"]['var']["type"]["data_type"]) > -1) return true;
		// if( v["iri"]["PrefixedName"]['var']['name'].toLowerCase() == dateType.toLowerCase()) return true;
		else return false;
	}
	if(typeof v["Path"] !== 'undefined'){
		if((v["PrimaryExpression"]["var"]["type"]!=null && dateType.indexOf(v["PrimaryExpression"]["var"]["type"]["data_type"]) > -1) || isDateVarSymbolTable(symbolTable, v["PrimaryExpression"]["var"]["name"], dateType) == true) return true;
		else return false;
	}
	if(typeof v["PathProperty"] !== 'undefined'){
		var path = getPathFullGrammar(v["PathProperty"]);
		if(path["messages"].length > 0) messages = messages.concat(path["messages"]);
		if((path["variable"]["var"]["type"]!=null && dateType.indexOf(path["variable"]["var"]["type"]["data_type"]) > -1) || isDateVarSymbolTable(symbolTable, path["variable"]["var"]["name"], dateType) == true) return true;
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
		for(let k in value){
			if (k == "FunctionExpression") r = true;
			else r = isFunctionExpr(value[k]);
		}
	}
	return r;
}