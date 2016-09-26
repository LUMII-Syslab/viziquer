 	

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

parser_filter = function(str) {

	var result = grammer.parse(str);
	return generateExpression(result, "");
}

parse_attribute = function(str, alias) {

	alias = alias || "";
	var result = grammer.parse(str);
	return generateExpression(result, "");
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

function generateExpression(expressionTable, SPARQLstring){
	for(var key in expressionTable){
		var visited = 0;
		if (key == "BrackettedExpression") {
			SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key], "") + ")";
			visited = 1;
		}
		//if (key == "NotExistsFunc") {
		//	SPARQLstring = SPARQLstring + "NOT EXISTS " + generateExpression(expressionTable[key], "");
		//	visited = 1;
		//}
		if (key == "BooleanLiteral") {
			SPARQLstring = SPARQLstring + expressionTable[key];
			visited = 1;
		}
		if(key == "var") SPARQLstring = expressionTable[key];
		if (key == "Additive" || key == "Unary") {
			//isFunction = true
			SPARQLstring = SPARQLstring + expressionTable[key];
			visited = 1;
		}
		if (key == "RDFLiteral") {
			//isFunction = true
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
			//isAggregate = true
			//if value["Aggregate"] == "COUNT" or value["Aggregate"] == "COUNT DISTINCT" then isCount = true end
			SPARQLstring = SPARQLstring + expressionTable[key]['Aggregate'];
			var DISTINCT = "";
			if (typeof expressionTable[key]['DISTINCT'] !== 'undefined') DISTINCT = expressionTable[key]['DISTINCT'] + " ";
			if (expressionTable[key]['Aggregate'] == 'GROUP_CONCAT'){
				var separator = "";
				if (typeof expressionTable[key]['SEPARATOR'] !== 'undefined') separator = "; SEPARATOR=" + expressionTable[key]['SEPARATOR'];
				//elseif lQuery("Onto#Parameter[name='Default grouping separator']"):attr("value") == "true" and lQuery("Onto#Parameter[name='Default grouping separator']"):attr("input")~="" then
				//	separator = '; SEPARATOR="' .. lQuery("Onto#Parameter[name='Default grouping separator']"):attr("input") .. '"'
				//end
				
				SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "") + separator + ")";
			}
			else {
				SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "") + ")";
			}
			visited = 1
		}
		
		if (key == "RelationalExpression") {
			SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], ""); 
			if (typeof expressionTable[key]['Relation'] !== 'undefined'){
				if (expressionTable[key]["Relation"] == "<>") SPARQLstring = SPARQLstring  + " !=";
				else if (expressionTable[key]["Relation"] == "NOTIN") SPARQLstring = SPARQLstring  + " NOT IN";
				else SPARQLstring = SPARQLstring  + " " + expressionTable[key]["Relation"];
				if (expressionTable[key]["Relation"] == "IN" || expressionTable[key]["Relation"] == "NOTIN") {
					SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key]["ExpressionList"], "") + ")";//?????????????????? ExpressionList
				}
				if (typeof expressionTable[key]["NumericExpressionR"] !== 'undefined') SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "");
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
				var res = generateExpression(expressionTable[key]["UnaryExpression"], "")
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")/";
				}
				res = generateExpression(expressionTable[key]["UnaryExpressionList"][0]["UnaryExpression"], "")
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")";
				}
				//isFunction = true
			}
			else{
				if(typeof expressionTable[key]["UnaryExpression"]["Additive"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + expressionTable[key]["UnaryExpression"]["Additive"];
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["UnaryExpression"]["PrimaryExpression"], "");
				}
				else SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["UnaryExpression"], "");
				if (typeof expressionTable[key]["UnaryExpressionList"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["UnaryExpressionList"], "")
				}
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
				SPARQLstring = SPARQLstring  + "(" + DISTINCT + " " + generateExpression(o, "") + ")";
			}
			visited = 1
		}
		if (key == "FunctionExpression") {
			//isFunction = true
			if (typeof expressionTable[key]["Function"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + expressionTable[key]["Function"];
			}
			if (typeof expressionTable[key]["Expression"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + "(" + generateExpression({Expression : expressionTable[key]["Expression"]}, "") + ")";
			}
			if (typeof expressionTable[key]["ExpressionList"]!== 'undefined') {
				SPARQLstring = SPARQLstring  + "(" + generateExpression({ExpressionList : expressionTable[key]["ExpressionList"]}, "") + ")";
			}
			if (typeof expressionTable[key]["FunctionTime"]!== 'undefined') {
				//todo
			}
			//????????????
			visited = 1;
		}

		if (key == "SubstringExpression") {
		    //isFunction = true
		    var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "");
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "");
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "");
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "SUBSTR(" + expr1 + expr2 + expr3 + ")";
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
			SPARQLstring = SPARQLstring + "REGEX(" + generateExpression(expressionTable[key], "") + ")";
			visited = 1
		}
		
		if(visited == 0 && typeof expressionTable[key] == 'object'){
			SPARQLstring += generateExpression(expressionTable[key], "");
		}
		
		
	}
	return SPARQLstring
}
