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
var isSimpleFilter;
var isUnderOr = false;
var isUnderIf = false;
var isSimpleVariableForNameDef;
var applyExistsToFilter = null;
var emptyPrefix = null;
var symbolTable = null;
var isInternal = null;
var parameterTable = [];
var idTable = [];
var messages = [];
var classTable = [];
var classMembership = "a";
var attributeFilter = "";
var classID = null;
var exp = "";
var attributesNames = [];
var knownNamespaces = {
	"foaf:":"http://xmlns.com/foaf/0.1/",
       "owl:":"http://www.w3.org/2002/07/owl#",
       "rdf:":"http://www.w3.org/1999/02/22-rdf-syntax-ns#",
       "rdfs:":"http://www.w3.org/2000/01/rdf-schema#",
       "dbp:":"http://dbpedia.org/property/",
       "skos:":"http://www.w3.org/2004/02/skos/core#",
       "xsd:":"http://www.w3.org/2001/XMLSchema#",
       "geo:":"http://www.w3.org/2003/01/geo/wgs84_pos#",
       "sioc:":"http://rdfs.org/sioc/ns#",
       "d2rq:":"http://www.wiwiss.fu-berlin.de/suhl/bizer/D2RQ/0.1#",
       "rss:":"http://purl.org/rss/1.0/",
       "test2:":"http://this.invalid/test2#",
       "swrc:":"http://swrc.ontoware.org/ontology#",
       "dbpedia:":"http://dbpedia.org/resource/",
       "content:":"http://purl.org/rss/1.0/modules/content/",
       "nie:":"http://www.semanticdesktop.org/ontologies/2007/01/19/nie#",
       "gen:":"http://www.w3.org/2006/gen/ont#",
       "dbo:":"http://dbpedia.org/ontology/",
       "xhtml:":"http://www.w3.org/1999/xhtml/vocab#",
       "dbpprop:":"http://dbpedia.org/property/",
       "dcterms:":"http://purl.org/dc/terms/"
}


function getPrefix(givenPrefix){
	if(emptyPrefix == givenPrefix) return "";
	return givenPrefix;
}

function initiate_variables(vna, count, pt, ep, st,internal, prt, idT, ct, memS, knPr, clID, attribNames, expr){
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
	classMembership = memS;
	classID = clID;
	attributeFilter = "";
	attributesNames = attribNames;
	exp = expr;
	
	for(var key in knPr){
		if(knPr[key][0] == "")knownNamespaces[":"] = knPr[key][1];
		knownNamespaces[knPr[key][0]+":"] = knPr[key][1];
	}
	
}

parse_filter = function(expr, attribNames, clID, parsed_exp, className, vnc, vna, count, ep, st, classTr, prt, idT, rTable, memS, knPr) {
	initiate_variables(vna, count, "condition", ep, st, false, prt, idT, rTable, memS, knPr, clID, attribNames, expr);
	//initiate_variables(vna, count, "different", ep, st, false, prt, idT);
	variableNamesClass = vnc;
	
	var parsed_exp1 = transformBetweenLike(parsed_exp);
	// console.log(JSON.stringify(parsed_exp1,null,2));
	var parsed_exp2 = transformSubstring(parsed_exp1);
	
	var parsed_exp3 = transformExistsNotExists(parsed_exp2, null, className);
	//counter++;
	// console.log(JSON.stringify(parsed_exp3,null,2));
	var temp = checkIfIsSimpleVariable(parsed_exp3, true, null, true, false, false);
	isSimpleFilter = temp["isSimpleFilter"];
	isUnderOr = temp["isUnderOr"];
	isUnderIf = temp["isUnderIf"];
	
	var result = generateExpression(parsed_exp3, "", className, null, true, false, false);
	
	//console.log(JSON.stringify(parsed_exp3,null,2));
	// console.log("applyExistsToFilter", applyExistsToFilter);
	
	var uniqueTriples = createTriples(tripleTable, "out").filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	// if in filter expression is used variable name, then put filter inside EXISTS
	//console.log("applyExistsToFilter", applyExistsToFilter, tripleTable);
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

parse_attrib = function(expr, attribNames, clID, parsed_exp, alias, className, vnc, vna, count, ep, st, internal, prt, idT, rTable, memS, parType, knPr) {
	
	//console.log("parsed_exp",parsed_exp);
	alias = alias || "";
	
	if(parType != null) initiate_variables(vna, count, parType, ep, st, internal, prt, idT, rTable, memS, knPr, clID, attribNames, expr);
	else initiate_variables(vna, count, "attribute", ep, st, internal, prt, idT, rTable, memS, knPr, clID, attribNames, expr);
	
	variableNamesClass = vnc;
	var parsed_exp1 = transformSubstring(parsed_exp);
	// check if given expression is simple variable name or agregation, function, expression
	// if given expression is simple variable, then in triple use alias(if exists), else - use variable names
	var temp = checkIfIsSimpleVariable(parsed_exp1, true, true, null, false, false);
	isSimpleVariable = temp["isSimpleVariable"];
	isUnderOr = temp["isUnderOr"];
	isUnderIf = temp["isUnderIf"];

	isSimpleVariableForNameDef = checkIfIsSimpleVariableForNameDef(parsed_exp1, true);
	if(isSimpleVariable == false || alias == "") alias = null; 
	var result = generateExpression(parsed_exp1, "", className, alias, true, isSimpleVariable, false);
	//var resultSQL = generateExpressionSQL(parsed_exp1, "", className, alias, true, isSimpleVariable, false);
	//console.log(resultSQL);

	return {"exp":result, "triples":createTriples(tripleTable, "out"), "variables":variableTable, "references":referenceTable, "variableNamesClass":variableNamesClass, "counter":counter, "isAggregate":isAggregate, "isFunction":isFunction, "isExpression":isExpression, "isTimeFunction":isTimeFunction, "prefixTable":prefixTable, "referenceCandidateTable":referenceCandidateTable, "messages":messages};

}



function createTriples(tripleTable, tripleType){
	var triples = []
	var tripleStart= "";
	var tripleEnd = "";
	if(isUnderIf == true || isUnderOr == true){
		tripleStart = "OPTIONAL{";
		tripleEnd = "}";
	}
	_.each(tripleTable,function(triple) {
		if(typeof triple["BIND"] === 'string') triples.push(triple["BIND"]);
		else if(typeof triple["VALUES"] === 'string') triples.push(triple["VALUES"]);
		else{
			var objectName =  triple["object"];
			if(objectName.indexOf("://") != -1 && objectName.indexOf("<") != 0) objectName = "<" + objectName + ">";
			else if(objectName.indexOf(":") != -1) {
				//TODO add prefix to table
			} else objectName = "?"+objectName;
			if(tripleType == "out"){
				if(parseType == "attribute") {
					var triple = objectName + " " + triple["prefixedName"] + " " + triple["var"] + ".";
					if(attributeFilter != ""){
						triple = triple+ "\n  FILTER("+attributeFilter+")\n";
					}
					triples.push(triple);
				}
				if(parseType == "class" || parseType == "aggregation" ||  (parseType == "condition" && triple["inFilter"] == null)) triples.push(objectName + " " + triple["prefixedName"] + " " + triple["var"] + "." );
			} else {
				if(parseType == "different" || (parseType == "condition" && triple["inFilter"] == true)) triples.push(tripleStart + objectName + " " + triple["prefixedName"] + " " + triple["var"] + tripleEnd + "." );
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
	// console.log("rrrrrrrrr", typeof variableNamesClass[varName]);
	// console.log("----------------------------------------");
	// console.log("     ");
	//console.log("eeeeeeeeeeeee", attributesNames, classID, symbolTable[classID][varName])
	var isPropertyFromSubQuery = null;
	var isOwnProperty = false;
	if(typeof symbolTable[classID] !== 'undefined' && typeof symbolTable[classID][varName] !== 'undefined'){
		if( symbolTable[classID][varName].length > 1){
			var parentTypeIsNull = false;
			var isNotJoinedClass = false;
			var definedInJoinClass = null;
			for(var key in symbolTable[classID][varName]){
				if(symbolTable[classID][varName][key]["context"] != classID && typeof symbolTable[classID][varName][key]["type"] !== 'undefined' && symbolTable[classID][varName][key]["type"]["parentType"] != null) isNotJoinedClass = true;
				if(typeof symbolTable[classID][varName][key]["type"] !== 'undefined' && symbolTable[classID][varName][key]["type"]["parentType"] == null) {
					parentTypeIsNull = true;
				}
				if(typeof symbolTable[classID][varName][key]["type"] !== 'undefined' 
				&& symbolTable[classID][varName][key]["context"] != classID
				&& typeof symbolTable[classID][varName][key]["upBySubQuery"] === 'undefined') {
					definedInJoinClass = idTable[symbolTable[classID][varName][key]["context"]];
				}
			}
			
			if( definedInJoinClass != null && parentTypeIsNull == true && isNotJoinedClass == true){
				messages.push({
					"type" : "Warning",
					"message" : "The name '"+varName+"' in '"+idTable[classID]+"' class may refer both to '"+varName+"' field in '"+definedInJoinClass+"' class node and to some instance attribute name. Introduce an alias to '"+varName+"' field in '"+definedInJoinClass+"' node to disambiguate.",
					"listOfElementId" : [classID],
					"isBlocking" : true
				});
			}
		}
		
		
		for(var key in symbolTable[classID][varName]){
			if(typeof symbolTable[classID][varName][key]["upBySubQuery"] !== 'undefined' && symbolTable[classID][varName][key]["upBySubQuery"] == 1) {
				isPropertyFromSubQuery = symbolTable[classID][varName][key]["context"];
			}
			if(symbolTable[classID][varName][key]["context"] == classID 
			&& typeof symbolTable[classID][varName][key]["type"] !== "undefined" && symbolTable[classID][varName][key]["type"] != null 
			&& symbolTable[classID][varName][key]["type"]["parentType"] != null) {
				isOwnProperty = true;
			}
		}
		
		if(isPropertyFromSubQuery!= null && isOwnProperty){
			messages.push({
					"type" : "Warning",
					"message" : "The name '"+varName+"' in '"+idTable[classID]+"' class is defined both as its schema attribute name, and as a field from a subquery. Introduce an alias to the subquery field to disambiguate.",
					"listOfElementId" : [classID],
					"isBlocking" : true
				});
		}
	}
	
	//console.log("qqqqqqqqqqqqqqqqqqq", isPropertyFromSubQuery, isOwnProperty, idTable[classID], varName)
	
	var varNameRep = varName.replace(/-/g, '_');
	if(alias != null) {
		//console.log("1111", varName, alias);
		var aliasSet = false;
		for(var key in idTable){
			if (idTable[key] == alias) {
				var classes = [];
				if(typeof variableNamesAll[alias] !== 'undefined' && typeof variableNamesAll[alias]["classes"] !== 'undefined') classes = variableNamesAll[alias]["classes"];
				classes[classID] = alias + "_" +count;
				variableNamesAll[alias] = {"alias" : alias + "_" +counter, "nameIsTaken" : true, "counter" : counter, "isVar" : true, "classes": classes};
				aliasSet = true;
				break;
			}
		}
		if (aliasSet == false) {
			var classes = [];
			if(typeof variableNamesAll[alias] !== 'undefined' && typeof variableNamesAll[alias]["classes"] !== 'undefined') classes = variableNamesAll[alias]["classes"];
			classes[classID] = alias;
			variableNamesAll[alias] = {"alias" : alias, "nameIsTaken" : true, "counter" : 0, "isVar" : true, "classes": classes};
		}
		
		return variableNamesAll[alias]["alias"];
	}
	//if symbol table has variable with property upBySubQuery = 1
	else if(isPropertyFromSubQuery != null && !isOwnProperty && typeof attributesNames[varName] != 'undefined'){
		//console.log("aaaaaaa", attributesNames[varName]["classes"][isPropertyFromSubQuery]["name"], isPropertyFromSubQuery);
		return attributesNames[varName]["classes"][isPropertyFromSubQuery]["name"];
	}
	
	else if(variableData["kind"] == "PROPERTY_NAME" || typeof variableData["kind"] === 'undefined'){
		// console.log("2222", varName);
		//Aply exists to filter if variable is not defined
		if(typeof variableNamesClass[varName] === 'undefined' || (typeof variableNamesClass[varName] !== 'undefined' && (variableNamesClass[varName]["isVar"] != true ||
			variableData["type"] != null && false)))applyExistsToFilter = true;
		// if(typeof variableNamesClass[varName] === 'undefined' || (typeof variableNamesClass[varName] !== 'undefined' && (variableNamesClass[varName]["isVar"] != true ||
			// variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))))applyExistsToFilter = true;
		//??????????????????????????????????????
		if(generateNewName != null && generateNewName == true ){
			// console.log("2aaaa", varName);
			if(typeof expressionLevelNames[varName] === 'undefined'){
				if(typeof variableNamesClass[varName]=== 'undefined'){
					if(typeof variableNamesAll[varName]=== 'undefined'){
						// console.log("1111", attributesNames[varName]["classes"][classID]["name"])
						expressionLevelNames[varName] = varNameRep;
						variableNamesClass[varName] = {"alias" : varNameRep, "nameIsTaken" : true, "counter" : 0, "isVar" : false};
						
						var classes = [];
						if(typeof variableNamesAll[varName] !== 'undefined' && typeof variableNamesAll[varName]["classes"] !== 'undefined') classes = variableNamesAll[varName]["classes"];
						classes[classID] = varNameRep;
			
						variableNamesAll[varName] = {"alias" : varNameRep, "nameIsTaken" : true, "counter" : 0, "isVar" : false, "classes":classes};
					} else {
						// console.log("2222", attributesNames[varName]["classes"][classID]["name"])
						var count = variableNamesAll[varName]["counter"] + 1;
						expressionLevelNames[varName] = varNameRep + "_" +count;
						variableNamesAll[varName]["counter"] = count;
						
						var classes = [];
						if(typeof variableNamesAll[varName] !== 'undefined' && typeof variableNamesAll[varName]["classes"] !== 'undefined') classes = variableNamesAll[varName]["classes"];
						classes[classID] = varNameRep + "_" +count;
						variableNamesAll[varName]["classes"] = classes;
						
						variableNamesClass[varName] = {"alias" : varNameRep + "_" +count, "nameIsTaken" : variableNamesAll[varName]["nameIsTaken"], "counter" : count, "isVar" : variableNamesAll[varName]["isVar"]};
					}
				} else {
					// console.log("3333", attributesNames[varName]["classes"][classID]["name"])
					var count = variableNamesClass[varName]["counter"] + 1;
					expressionLevelNames[varName] = varNameRep + "_" +count;
					variableNamesClass[varName]["counter"] = count;
					
					var classes = [];
					if(typeof variableNamesAll[varName] !== 'undefined' && typeof variableNamesAll[varName]["classes"] !== 'undefined') classes = variableNamesAll[varName]["classes"];
					classes[classID] = varNameRep + "_" +count;
					
					variableNamesAll[varName] = {"alias" : varNameRep + "_" +count, "nameIsTaken" : variableNamesClass[varName]["nameIsTaken"], "counter" : count, "isVar" : variableNamesClass[varName]["isVar"], "classes":classes};
					// console.log(count, varName + "_" +count, variableNamesClass[varName]["counter"], variableNamesAll[varName]["counter"])
				}
			}else{
				return expressionLevelNames[varName];
			}
		}else{
			 // console.log("2cccc", varName, isSimpleVariableForNameDef);
			//if not used in given expression
			if(typeof expressionLevelNames[varName] === 'undefined' || typeof expressionLevelNames[varName] === 'function'){
				// console.log("2c 1", varName);
				//if not used in class scope
				if(typeof variableNamesClass[varName] === 'undefined'|| typeof variableNamesClass[varName] === 'function'){
					// console.log("2c 11", varName);
					//if not used in query scope
					if(typeof variableNamesAll[varName]=== 'undefined' || typeof variableNamesAll[varName]=== 'function'){
						//not used at all
						// console.log("2c 111", varName, parseType);
						//if simple variable
						if(isSimpleVariableForNameDef == true){
							// console.log("4444", attributesNames[varName]["classes"][classID]["name"], attributesNames[varName])
							var count = 0;
							if(typeof  attributesNames[varName] !== 'undefined'){
								// console.log("4a")
								if(typeof attributesNames[varName]["classes"][classID] !== 'undefined')varNameRep = attributesNames[varName]["classes"][classID]["name"].replace(/-/g, '_');
								count = attributesNames[varName]["counter"];
							}
							var tempIsVar = false;
							if(parseType == "attribute" || parseType == "class") tempIsVar = true;
							variableNamesClass[varName] = {"alias" : varNameRep, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
						} else {
							// console.log("5555", attributesNames[varName]["classes"][classID]["name"])
							var count = 0;
							if(typeof  attributesNames[varName] !== 'undefined'){
								count = attributesNames[varName]["counter"];
							}
							count = count+1;
							variableNamesClass[varName] = {"alias" : varNameRep+"_"+count, "nameIsTaken" : false, "counter" : count, "isVar" : false};
						}
						 // console.log("variableNamesClass[varName]", variableNamesClass[varName]);
						expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					
					//is used in query, but not in a given class (somewhere else)
					} else {
						//  console.log("2c 112", varName);
						//if simple variable
						if(isSimpleVariableForNameDef == true){
							var tempIsVar = false;
							if(parseType == "attribute"|| parseType == "class") tempIsVar = true;
							
							//name is not taken
							if(variableNamesAll[varName]["nameIsTaken"] != true){

								var count = 0;
								if(typeof  attributesNames[varName] !== 'undefined'){
									if(typeof attributesNames[varName]["classes"][classID] !== 'undefined')varNameRep = attributesNames[varName]["classes"][classID]["name"];
									count = attributesNames[varName]["counter"];
								}
								if(count<variableNamesAll[varName]["counter"])count = variableNamesAll[varName]["counter"]

								variableNamesClass[varName] = {"alias" : varNameRep, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
							//name is taken
							} else {
								
								var count = variableNamesAll[varName]["counter"] + 1;
								var varN = varNameRep+"_"+count;
								if(typeof  attributesNames[varName] !== 'undefined'){
									if(typeof attributesNames[varName]["classes"][classID] !== 'undefined')varN = attributesNames[varName]["classes"][classID]["name"];
									count = attributesNames[varName]["counter"];
								}
								if(count<variableNamesAll[varName]["counter"])count = variableNamesAll[varName]["counter"];
								variableNamesClass[varName] = {"alias" : varN, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
								
								var classes = [];
								if(typeof variableNamesAll[varName] !== 'undefined' && typeof variableNamesAll[varName]["classes"] !== 'undefined') classes = variableNamesAll[varName]["classes"];
								classes[classID] = varN;
								
								variableNamesAll[varName] = {"alias" : varN, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar, "classes":classes}; //????? vai vajag	
							}
						//is expression
						} else {
							var count = variableNamesAll[varName]["counter"];
							if(typeof  attributesNames[varName] !== 'undefined'){
								count = attributesNames[varName]["counter"];
							}
							if(count<variableNamesAll[varName]["counter"])count = variableNamesAll[varName]["counter"];
							count = count + 1;
								
							variableNamesClass[varName] = {"alias" : varNameRep+"_"+count, "nameIsTaken" : variableNamesAll[varName]["nameIsTaken"], "counter" : count, "isVar" : false};
						}
						expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					}
					return variableNamesClass[varName]["alias"];
				//is used in a given class
				}else{
					//  console.log("2c 12", varName);
					//if simple variable
					if(isSimpleVariableForNameDef == true){
						//  console.log("2c 121", varName);
						var tempIsVar = false;
						if(parseType == "attribute"|| parseType == "class") tempIsVar = true;
						
						//name is not taken
						if(variableNamesClass[varName]["nameIsTaken"] != true){
							var count = 0;
							if(typeof  attributesNames[varName] !== 'undefined'){
								if(typeof attributesNames[varName]["classes"][classID] !== 'undefined')varNameRep = attributesNames[varName]["classes"][classID]["name"];
								count = attributesNames[varName]["counter"];
							}
							if(count<variableNamesClass[varName]["counter"])count = variableNamesClass[varName]["counter"]

							variableNamesClass[varName] = {"alias" : varNameRep, "nameIsTaken" : true, "counter" : variableNamesClass[varName]["counter"], "isVar" : tempIsVar};
						//name is taken
						} else {
							//if name is not defined as variable
							if(variableNamesClass[varName]["isVar"] != true) {
								var count = variableNamesClass[varName]["counter"];
								if(typeof  attributesNames[varName] !== 'undefined'){
									count = attributesNames[varName]["counter"];
								}
								if(count<variableNamesClass[varName]["counter"])count = variableNamesClass[varName]["counter"];
								count = count + 1;
								
								variableNamesClass[varName] = {"alias" : varNameRep+"_"+count, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
							}
						}
						// console.log("variableNamesClass[varName]", variableNamesClass[varName]);
					//is expression
					} else {
						 // console.log("2c 122", varName);
						//name is not taken
						if(variableNamesClass[varName]["nameIsTaken"] != true){
							var count = variableNamesClass[varName]["counter"];
							if(typeof  attributesNames[varName] !== 'undefined'){
								count = attributesNames[varName]["counter"];
							}
							if(count<variableNamesClass[varName]["counter"])count = variableNamesClass[varName]["counter"];
							count = count + 1;
								
							variableNamesClass[varName] = {"alias" : varNameRep+"_"+count, "nameIsTaken" : false, "counter" : count, "isVar" : false};
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
				//  console.log("2c 2", varName);
				return expressionLevelNames[varName];
			}
		}
		return expressionLevelNames[varName];
	} else {
		//  console.log("3333", varName);
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
			if(typeof expressionTable[key]["path"]["PathMod"] !== 'undefined' &&  expressionTable[key]["path"]["PathMod"] != null) pathPart = pathPart + expressionTable[key]["path"]["PathMod"];
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

getPathFullGrammar = function(expressionTable){
	var prTable = [];
	var path = "";
	var variable;
	var isPath = true;
	var mes = [];
	
	for(var key in expressionTable){
		var visited = 0;
		
		//PathPrimary
		//iriOra
		if((key == "PathPrimary" || key == "iriOra") && typeof expressionTable[key]["var"] !== 'undefined'){

			if(typeof expressionTable[key]["var"]["type"] !== 'undefined' && expressionTable[key]["var"]["type"] != null){	
				if(typeof expressionTable[key]["var"]["type"]["parentType"] !== 'undefined' && expressionTable[key]["var"]["type"]["parentType"] != null) isPath = false;
				
				var pathPart =  getPrefix(expressionTable[key]["var"]["type"]["Prefix"]) + ":" + expressionTable[key]["var"]["name"];
				path = path + pathPart;
				
				var namespace = expressionTable[key]["var"]["type"]["Namespace"]
				if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";

				prTable[getPrefix(expressionTable[key]["var"]["type"]["Prefix"]) + ":"] = "<"+namespace+">"
				
				variable = expressionTable[key];
			
				visited = 1;
			}else {
					isPath = false;
			}
		}
		//IRIREF
		if(key == "IRIREF"){
			path = path + expressionTable[key];
		}
		//PrefixedName
		if(key == "PrefixedName"){
			if(typeof expressionTable[key]["var"]["type"] !== 'undefined' && expressionTable[key]["var"]["type"] != null){	
				if(typeof expressionTable[key]["var"]["type"]["parentType"] !== 'undefined' && expressionTable[key]["var"]["type"]["parentType"] != null) isPath = false;
				
				var pathPart =  getPrefix(expressionTable[key]["var"]["type"]["Prefix"]) + ":" + expressionTable[key]["var"]["name"];
				path = path + pathPart;
				
				var namespace = expressionTable[key]["var"]["type"]["Namespace"]
				if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
				
				prTable[getPrefix(expressionTable[key]["var"]["type"]["Prefix"]) + ":"] = "<"+namespace+">"
				variable = expressionTable[key];
				visited = 1;
			} else {
				
				if(typeof expressionTable[key]["Prefix"] !== 'undefined'){
					path = path + expressionTable[key]["Prefix"] + expressionTable[key]["var"]["name"];
					
					if(knownNamespaces[expressionTable[key]["Prefix"]] != null){prTable[expressionTable[key]["Prefix"]] = "<"+ knownNamespaces[expressionTable[key]["Prefix"]]+">";}
					visited = 1;

					mes.push({
						"type" : "Error",
						"message" : "Undefined property '" +  path +"' can't be used in navigation expression",
						// "listOfElementId" : [clId],
						"isBlocking" : true
					});
				} else {
					isPath = false;
				}
			}
			
		}
		
		//PATH_SYMBOL
		if(key == "PathSymbol"){
			path = path + "/";
		}
		//Alternative
		//PathMod
		//inv
		if(key == "Alternative" || key == "PathMod" || key == "inv"){
			if( expressionTable[key] != null)path = path + expressionTable[key];
		}
		
		if(expressionTable[key] == ")" || expressionTable[key] == "(" || expressionTable[key] == "!" || expressionTable[key] == "a") path = path + expressionTable[key];          
		
		
		if(visited == 0 && typeof expressionTable[key] == 'object'){
			var temp = getPathFullGrammar(expressionTable[key]);
			mes = mes.concat(temp["messages"]);
			for(var prefix in temp["prefixTable"]){
				prTable[prefix] = temp["prefixTable"][prefix];
			}
			path = path + temp["path"];
			if(typeof temp["variable"] !== 'undefined') variable = temp["variable"];
			if(temp["isPath"] == false) isPath = temp["isPath"];
		}
	}

	return {path:path, prefixTable:prTable, variable:variable, isPath:isPath, messages:mes};
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
	var variable, prefixedName, className;
			if(typeof pe["Reference"] !== 'undefined'){
					variable = setVariableName(pe["var"]["name"] + "_" + pe["Reference"]["name"], alias, pe["var"]);
					prefixedName = getPrefix(pe["var"]["type"]["Prefix"])+":"+pe["var"]["name"];
					var namespace = pe["var"]["type"]["Namespace"];
					if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
					prefixTable[getPrefix(pe["var"]["type"]["Prefix"]) + ":"] = "<"+namespace+">";
					referenceTable.push("?"+pe["Reference"]["name"]);
					referenceCandidateTable.push(pe["Reference"]["name"]);
					className = pe["Reference"]["name"];
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
				
			}else if(typeof pe["PathProperty"] !== 'undefined'){
				var path = getPathFullGrammar(pe["PathProperty"]);
				
				if(typeof path["messages"] !== 'undefined' ) {
					prefixedName = null;
					messages = messages.concat(path["messages"]);
				}
				else{
					for (var prefix in path["prefixTable"]) { 
						if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
					}
					prefixedName = path["path"];
				}
				variableNamesClass[path["variable"]["var"]["name"]] = {"alias" : path["variable"]["var"]["name"] + "_" + counter, "isvar" : false};
				variableNamesAll[path["variable"]["var"]["name"]+ "_" + counter] = path["variable"]["var"]["name"];
				variable = setVariableName(path["variable"]["var"]["name"], alias, path["variable"]["var"]);
				expressionLevelNames[path["variable"]["name"]] = variable;
				
			}else if(typeof pe["var"] !== 'undefined') {
				//variableNamesClass[pe["var"]["name"]] = pe["var"]["name"] + "_" + counter;
				//variableNamesClass[pe["var"]["name"]] = {"alias" : pe["var"]["name"] + "_" + counter, "isvar" : false};
				//variableNamesAll[pe["var"]["name"]+ "_" + counter] = pe["var"]["name"];
				variable = setVariableName(pe["var"]["name"], alias, pe["var"], true);
				prefixedName = getPrefix(pe["var"]["type"]["Prefix"])+":"+pe["var"]["name"];
				var namespace = pe["var"]["type"]["Namespace"];
				if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
				prefixTable[getPrefix(pe["var"]["type"]["Prefix"]) + ":"] = "<"+namespace+">";

			}
	return {"variable":variable, "prefixedName":prefixedName, "className":className};
}

function transformExistsAND(expressionTable, prefix, existsExpr, count, alias, className){
	if(typeof expressionTable[count]["RelationalExpression"]["Relation"] !== 'undefined'){
		// var tempAliasOrAttribute = "Attribute";
		var tempAliasOrAttribute = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["kind"];
			
		if(tempAliasOrAttribute.indexOf("_ALIAS") !== -1){
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
					var clName = className;
					if(typeof tempVarPRN["className"] !== "undefined") clName = tempVarPRN["className"];
				
					tripleTable.push({
								"variable" : variable,
								"prefixedName" : prefixedName,
								"object" : clName,
							});
				}
				else pe = findINExpressionTable(pe["FunctionExpression"], "PrimaryExpression");
			}

			// var variable, prefixedName
			var tempVarPRN = generatePrefixedNameVariable(prefix, existsExpr, alias, pe);

			var variable = tempVarPRN["variable"];
			var prefixedName =  tempVarPRN["prefixedName"];
			var clName = className;
			if(typeof tempVarPRN["className"] !== "undefined") clName = tempVarPRN["className"];
			
			tripleTable.push({
						"variable" : variable,
						"prefixedName" : prefixedName,
						"object" : clName,
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
		if(tempAliasOrAttribute.indexOf("_ALIAS") !== -1){
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
					var clName = className;
					if(typeof tempVarPRN["className"] !== "undefined") clName = tempVarPRN["className"];
			
					tripleTable.push({
								"variable" : variable,
								"prefixedName" : prefixedName,
								"object" : clName,
							});
				}
				else pe = findINExpressionTable(pe["FunctionExpression"], "PrimaryExpression");
			}
			var tempVarPRN = generatePrefixedNameVariable(prefix, existsExpr, alias, pe);
			var variable = tempVarPRN["variable"];
			var prefixedName =  tempVarPRN["prefixedName"];
			var clName = className;
			if(typeof tempVarPRN["className"] !== "undefined") clName = tempVarPRN["className"];
			
			tripleTable.push({
						"variable" : variable,
						"prefixedName" : prefixedName,
						"object" : clName,
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
			if(typeof temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Path"] === 'undefined'
			&& typeof temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"] === 'undefined'
			&& typeof temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Reference"] === 'undefined'){
				pe = {
                        "var" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"],
						"Substring": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Substring"],
					    "ReferenceToClass": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ReferenceToClass"],
					    "ValueScope": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["ValueScope"],
					    "FunctionBETWEEN": null,
					    "FunctionLike": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionLike"]
                     }
			} else if(typeof temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"] !== 'undefined'){
				pe = {
					"PathProperty" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"],
					"Substring": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Substring"],
					"FunctionBETWEEN": null,
					"FunctionLike": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["FunctionLike"]
               }
			} else if(typeof temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Reference"] !== 'undefined'){
				// console.log("uUUUUUUUUUUUUUUUUUUUUUUUUUU");
				pe = {
					"var" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"],
					"Reference" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Reference"],
					"Substring": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["Substring"],
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

function checkIfUnderUnion(reference, refTable, isUnderUnion){
	for(var ref in refTable){
		if(typeof refTable[ref] === 'object'){
			if(typeof refTable[ref]["underUnion"] !== 'undefined' && refTable[ref]["underUnion"] == true) isUnderUnion = true;

			if(reference == ref){
				if(isUnderUnion == true) return true;
			}else {
				var result  = false;
				for(var r in refTable[ref]["classes"]){
					if(typeof refTable[ref]["classes"][r] === 'object'){
						var tempResult = checkIfUnderUnion(reference, refTable[ref]["classes"][r], isUnderUnion);
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
			var underOptionalPlain = checkIfUnderOptionalPlain(expressionTable[key]["Reference"]["name"], classTable, false);
			var underUnion = checkIfUnderUnion(expressionTable[key]["Reference"]["name"], classTable, false)
			if(underOptionalPlain == false && underUnion == false){

				var variable = setVariableName(expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"], alias, expressionTable[key]["var"])
				if(generateTriples == true && expressionTable[key]["var"]['type'] != null) {
					var inFilter = false;
					//if(typeof variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]] !== 'undefined' && variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]]["isvar"] != true) inFilter = true;
					
					var variableData = expressionTable[key]["var"];
					// if(typeof variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]] !== 'undefined' && (variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]]["isVar"] != true 
					// || variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))) inFilter = true;
					if(typeof variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]] !== 'undefined' && (variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]]["isVar"] != true 
					|| variableData["type"] != null && false)) inFilter = true;
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
				
				var messageText;
				if(underOptionalPlain == true) messageText = "Reference to instance '" + expressionTable[key]["Reference"]["name"] + "' from Optional-block not allowed in navigation expression '" + expressionTable[key]["Reference"]["name"] +"."+expressionTable[key]["var"]["name"] +"' outside the block.\nConsider moving the Optional-block a subquery, or define an internal field '"+ expressionTable[key]["var"]["name"] + "' within the scope of '"+ expressionTable[key]["Reference"]["name"] +"'";
				else messageText = "Reference to instance '" + expressionTable[key]["Reference"]["name"] + "' from Union-block not allowed in navigation expression '" + expressionTable[key]["Reference"]["name"] +"."+expressionTable[key]["var"]["name"] +"' outside the block.'";
				
				messages.push({
					"type" : "Error",
					"message" : messageText,
					// "listOfElementId" : [clId],
					"isBlocking" : true
				});
				
				visited = 1;
			}
		}
		
		//PathFull
		if(key  == "PrimaryExpression" && typeof expressionTable[key]["PathProperty"] !== 'undefined'){
			var path = getPathFullGrammar(expressionTable[key]["PathProperty"]);

			if(path["isPath"] == false){
				var clId;
					for(var k in idTable){
						if (idTable[k] == className) {
							clId = k;
							break;
						}
					}
				messages.push({
						"type" : "Error",
						"message" : "Path expression " + exp + " can start only with role(object property). To specify arithmetic division, surround the '/' symbol by spaces.",
						"listOfElementId" : [clId],
						"isBlocking" : true
					});
			}
			if(path["messages"].length > 0) {
				prefixName = null;
				messages = messages.concat(path["messages"]);
			}
			else{
				for (var prefix in path["prefixTable"]) { 
					if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
				}
				var prefixName = path["path"];
			}
			var variableStructure = path["variable"];
			//console.log("variableStructure", variableStructure)
			//console.log("path", path)
			if(typeof variableStructure !== "undefined"){
				if(typeof variableStructure["SubstringExpression"] !== 'undefined'){
					var substringvar = variableStructure["var"];
					
					if(substringvar["type"] == null){
						var clId;
						for(var k in idTable){
							if (idTable[k] == className) {
								clId = k;
								break;
							}
						}
						messages.push({
							"type" : "Error",
							"message" : "Unrecognized variable '" + substringvar["name"] + "'. Please specify variable.",
							"listOfElementId" : [clId],
							"isBlocking" : true
						});
					}
					else{
					
						var variable = setVariableName(substringvar["name"], alias, substringvar);
						variableTable.push("?" + variable);
						if(generateTriples == true && substringvar['type'] != null && path != null) {
							var inFilter = false;
							// if(typeof variableNamesClass[substringvar["name"]] !== 'undefined' && (variableNamesClass[substringvar["name"]]["isVar"] != true 
							// || substringvar["type"] != null && (typeof substringvar["type"]["maxCardinality"] === 'undefined' || substringvar["type"]["maxCardinality"] > 1 || substringvar["type"]["maxCardinality"] == -1))) inFilter = true;
							if(typeof variableNamesClass[substringvar["name"]] !== 'undefined' && (variableNamesClass[substringvar["name"]]["isVar"] != true 
							|| substringvar["type"] != null && false)) inFilter = true;
							var inv = "";
							
							if(typeof substringvar["INV"] !== 'undefined') inv = "^";
							tripleTable.push({"var":"?"+variable, "prefixedName":prefixName+ "/" + inv + getPrefix(substringvar["type"]["Prefix"]) + ":" + substringvar["name"], "object":className, "inFilter":inFilter});
							var namespace = substringvar["type"]["Namespace"];
							if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
							prefixTable[getPrefix(substringvar["type"]["Prefix"]) + ":"] = "<"+namespace+">";
							generateTriples = false;
							SPARQLstring = SPARQLstring + generateExpression(variableStructure, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
							generateTriples = true;
						}
					}
				}else {
					// if(typeof expressionTable[key]["PrimaryExpression"]["iri"] !== 'undefined'){

						// if (typeof expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]!== 'undefined'){
							// var valueString = expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]['var']['name'];
							// if(expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]['var']['type'] !== null){
								// valueString = generateExpression({"var" : expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]['var']}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
							// } else {
								// if(knownNamespaces[expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]["Prefix"]] != null){prefixTable[expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]["Prefix"]] = "<"+ knownNamespaces[ expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]["Prefix"]]+">";}
							// }
							// var name = alias;
							
							// if(name == null || name == "") name = expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]["Name"];
							// tripleTable.push({"var":"?"+name, "prefixedName":prefixName+ "/" +valueString, "object":className, "inFilter":inFilter});
							// variableTable.push("?" + variable);
							// SPARQLstring = SPARQLstring  + "?" + name;
						// }
						
					// } else {
						if(variableStructure["var"]["type"] == null){
							var clId;
							for(var k in idTable){
								if (idTable[k] == className) {
									clId = k;
									break;
								}
							}
							messages.push({
								"type" : "Error",
								"message" : "Unrecognized variable '" + variableStructure["var"]["name"] + "'. Please specify variable.",
								"listOfElementId" : [clId],
								"isBlocking" : true
							});
						}
						else{
							var variable = setVariableName(variableStructure["var"]["name"], alias, variableStructure["var"])
												
							variableTable.push("?" + variable);
							if(generateTriples == true && variableStructure["var"]['type'] != null && path != null) {
								var inFilter = false;
								var variableData = variableStructure["var"];
								// if(typeof variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]] !== 'undefined' && (variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]]["isVar"] != true
								// || variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))) inFilter = true;
								if(typeof variableNamesClass[variableStructure["var"]["name"]] !== 'undefined' && (variableNamesClass[variableStructure["var"]["name"]]["isVar"] != true
								|| variableData["type"] != null && false)) inFilter = true;
								var inv = "";
								if(typeof variableStructure["var"]["INV"] !== 'undefined') inv = "^";
								// tripleTable.push({"var":"?"+variable, "prefixedName":prefixName+ "/" + inv + getPrefix(expressionTable[key]["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":" + expressionTable[key]["PrimaryExpression"]["var"]["name"], "object":className, "inFilter":inFilter});
								tripleTable.push({"var":"?"+variable, "prefixedName":prefixName, "object":className, "inFilter":inFilter});
								// var namespace = expressionTable[key]["PrimaryExpression"]["var"]["type"]["Namespace"];
								// if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
								// prefixTable[getPrefix(expressionTable[key]["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":"] = "<"+namespace+">";
							}
							SPARQLstring = SPARQLstring + "?" + variable;
						}
					// }
				}
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
						"message" : "Path expression " + exp + " can start only with role(object property). To specify arithmetic division, surround the '/' symbol by spaces.",
						"listOfElementId" : [clId],
						"isBlocking" : true
					});
			}
			visited = 1;
		}
		
		//PATH
		if(key == "PrimaryExpression" && typeof expressionTable[key]["Path"] !== 'undefined'){
			//console.log(expressionTable[key], alias);
			var path = getPath(expressionTable[key]["Path"]);
			//console.log("path", path)
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
				
				if(substringvar["type"] == null){
					var clId;
					for(var k in idTable){
						if (idTable[k] == className) {
							clId = k;
							break;
						}
					}
					messages.push({
						"type" : "Error",
						"message" : "Unrecognized variable '" + substringvar["name"] + "'. Please specify variable.",
						"listOfElementId" : [clId],
						"isBlocking" : true
					});
				}
				else{
				
					var variable = setVariableName(substringvar["name"], alias, substringvar);
					variableTable.push("?" + variable);
					if(generateTriples == true && substringvar['type'] != null && path != null) {
						var inFilter = false;
						// if(typeof variableNamesClass[substringvar["name"]] !== 'undefined' && (variableNamesClass[substringvar["name"]]["isVar"] != true 
						// || substringvar["type"] != null && (typeof substringvar["type"]["maxCardinality"] === 'undefined' || substringvar["type"]["maxCardinality"] > 1 || substringvar["type"]["maxCardinality"] == -1))) inFilter = true;
						if(typeof variableNamesClass[substringvar["name"]] !== 'undefined' && (variableNamesClass[substringvar["name"]]["isVar"] != true 
						|| substringvar["type"] != null && false)) inFilter = true;
						var inv = "";
						
						if(typeof substringvar["INV"] !== 'undefined') inv = "^";
						tripleTable.push({"var":"?"+variable, "prefixedName":prefixName+ "/" + inv + getPrefix(substringvar["type"]["Prefix"]) + ":" + substringvar["name"], "object":className, "inFilter":inFilter});
						var namespace = substringvar["type"]["Namespace"];
						if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
						prefixTable[getPrefix(substringvar["type"]["Prefix"]) + ":"] = "<"+namespace+">";
						generateTriples = false;
						SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["PrimaryExpression"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						generateTriples = true;
					}
				}
			} else {
				if(typeof expressionTable[key]["PrimaryExpression"]["iri"] !== 'undefined'){

					if (typeof expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]!== 'undefined'){
						var valueString = expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]['var']['name'];
						if(expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]['var']['type'] !== null){
							valueString = generateExpression({"var" : expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]['var']}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
						} else {
							if(knownNamespaces[expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]["Prefix"]] != null){prefixTable[expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]["Prefix"]] = "<"+ knownNamespaces[ expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]["Prefix"]]+">";}
						}
						var name = alias;
						
						if(name == null || name == "") name = expressionTable[key]["PrimaryExpression"]["iri"]["PrefixedName"]["Name"];
						tripleTable.push({"var":"?"+name, "prefixedName":prefixName+ "/" +valueString, "object":className, "inFilter":inFilter});
						variableTable.push("?" + variable);
						SPARQLstring = SPARQLstring  + "?" + name;
					}
					
				} else {
					if(expressionTable[key]["PrimaryExpression"]["var"]["type"] == null){
						var clId;
						for(var k in idTable){
							if (idTable[k] == className) {
								clId = k;
								break;
							}
						}
						messages.push({
							"type" : "Error",
							"message" : "Unrecognized variable '" + expressionTable[key]["PrimaryExpression"]["var"]["name"] + "'. Please specify variable.",
							"listOfElementId" : [clId],
							"isBlocking" : true
						});
					}
					else{
						var variable = setVariableName(expressionTable[key]["PrimaryExpression"]["var"]["name"], alias, expressionTable[key]["PrimaryExpression"]["var"])
											
						variableTable.push("?" + variable);
						if(generateTriples == true && expressionTable[key]["PrimaryExpression"]["var"]['type'] != null && path != null) {
							var inFilter = false;
							var variableData = expressionTable[key]["PrimaryExpression"]["var"];
							// if(typeof variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]] !== 'undefined' && (variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]]["isVar"] != true
							// || variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))) inFilter = true;
							if(typeof variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]] !== 'undefined' && (variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]]["isVar"] != true
							|| variableData["type"] != null && false)) inFilter = true;
							var inv = "";
							if(typeof expressionTable[key]["PrimaryExpression"]["var"]["INV"] !== 'undefined') inv = "^";
							tripleTable.push({"var":"?"+variable, "prefixedName":prefixName+ "/" + inv + getPrefix(expressionTable[key]["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":" + expressionTable[key]["PrimaryExpression"]["var"]["name"], "object":className, "inFilter":inFilter});
							var namespace = expressionTable[key]["PrimaryExpression"]["var"]["type"]["Namespace"];
							if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
							prefixTable[getPrefix(expressionTable[key]["PrimaryExpression"]["var"]["type"]["Prefix"]) + ":"] = "<"+namespace+">";
						}
						SPARQLstring = SPARQLstring + "?" + variable;
					}
				}
			}
			
			visited = 1;
		}
		
		//VariableName
		if (key == "VariableName") {
			var tempAlias;
			var varName = expressionTable[key];
			
			if(expressionTable[key].startsWith("??")){
				
				if(varName =="??" ) varName = "?data_property";
				if(varName.startsWith("??")) varName = varName.substr(1);
				if(alias == "" || alias == null) tempAlias = varName+"_";
				else tempAlias = "?"+alias;
				
				var vn = varName.substr(1);
				if(typeof variableNamesClass[vn]=== 'undefined'){
					if(typeof variableNamesAll[vn]=== 'undefined'){
						expressionLevelNames[vn] = vn;
						variableNamesClass[vn] = {"alias" : tempAlias, "nameIsTaken" : true, "counter" : 0, "isVar" : false};
						
						var classes = [];
						if(typeof variableNamesAll[vn] !== 'undefined' && typeof variableNamesAll[vn]["classes"] !== 'undefined') classes = variableNamesAll[vn]["classes"];
						classes[classID]  = tempAlias;
						
						variableNamesAll[vn] = {"alias" : tempAlias, "nameIsTaken" : true, "counter" : 0, "isVar" : false, "classes" : classes};
						alias = tempAlias;
					} else {
						var count = variableNamesAll[vn]["counter"] + 1;
						expressionLevelNames[vn] = vn + "_" +count;
						variableNamesAll[vn]["counter"] = count;
						
						var classes = [];
						if(typeof variableNamesAll[vn] !== 'undefined' && typeof variableNamesAll[vn]["classes"] !== 'undefined') classes = variableNamesAll[vn]["classes"];
						classes[classID]  = tempAlias + "_" +count;
						
						variableNamesAll[vn]["classes"] = classes;
						
						variableNamesClass[vn] = {"alias" : tempAlias + "_" +count, "nameIsTaken" : variableNamesAll[vn]["nameIsTaken"], "counter" : count, "isVar" : variableNamesAll[vn]["isVar"]};
						alias = tempAlias + "_" +count;
					}
				} else {
					var count = variableNamesClass[vn]["counter"] + 1;
					expressionLevelNames[vn] = vn + "_" +count;
					variableNamesClass[vn]["counter"] = count;
					
					var classes = [];
					if(typeof variableNamesAll[vn] !== 'undefined' && typeof variableNamesAll[vn]["classes"] !== 'undefined') classes = variableNamesAll[vn]["classes"];
					classes[classID]  = tempAlias + "_" +count;
					
					variableNamesAll[vn] = {"alias" : tempAlias + "_" +count, "nameIsTaken" : variableNamesClass[vn]["nameIsTaken"], "counter" : count, "isVar" : variableNamesClass[vn]["isVar"], "classes":classes};
					alias = tempAlias + "_" +count;
				}
				
				if(isInternal !=true) SPARQLstring = SPARQLstring + "?"+expressionLevelNames[vn] + " " + tempAlias;
				else SPARQLstring = SPARQLstring + "?"+expressionLevelNames[vn];
				tripleTable.push({"var":alias, "prefixedName":"?"+expressionLevelNames[vn], "object":className, "inFilter":false});
				
			} else {
				if(alias == "" || alias == null) tempAlias = varName+"_";
				else tempAlias = "?"+alias;
				if(isInternal !=true) SPARQLstring = SPARQLstring + varName + " " + tempAlias;
				else SPARQLstring = SPARQLstring + varName
				tripleTable.push({"var":tempAlias, "prefixedName":varName, "object":className, "inFilter":false});
				expressionLevelNames[varName.substr(1)] = varName;
				variableNamesClass[varName.substr(1)] = {"alias" : tempAlias, "nameIsTaken" : true, "counter" : 0, "isVar" : false};
				
				var classes = [];
				if(typeof variableNamesAll[varName.substr(1)] !== 'undefined' && typeof variableNamesAll[varName.substr(1)]["classes"] !== 'undefined') classes = variableNamesAll[varName.substr(1)]["classes"];
				classes[classID]  = tempAlias;
				
				variableNamesAll[varName.substr(1)] = {"alias" : tempAlias, "nameIsTaken" : variableNamesClass[varName.substr(1)]["nameIsTaken"], "counter" : 0, "isVar" : variableNamesClass[varName.substr(1)]["isVar"], "classes":classes};
					
			}

			visited = 1;
		}
		
		if (key == "BrackettedExpression") {
			if(typeof expressionTable[key]["classExpr"] !== 'undefined') SPARQLstring = SPARQLstring +  generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
			else SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
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
			if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined' && expressionTable[key]['type']['localName'] !== null && typeof expressionTable[key]['type']['localName'] !== 'undefined' && typeof expressionTable[key]["kind"] !== 'undefined' && expressionTable[key]["kind"].indexOf("_ALIAS") === -1) varName = expressionTable[key]['type']['localName'];
			// if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined' && expressionTable[key]['type']['localName'] !== null && typeof expressionTable[key]['type']['localName'] !== 'undefined' ) varName = expressionTable[key]['type']['localName'];
			else varName = expressionTable[key]["name"];
			if(expressionTable[key]['kind'] !== null){
				var pathMod = "";
				if(typeof expressionTable[key]['PathMod'] !== 'undefined' && expressionTable[key]['PathMod'] != null) pathMod = expressionTable[key]['PathMod'];
				var variable = setVariableName(varName, alias, expressionTable[key])
	
				SPARQLstring = SPARQLstring + "?" + variable;
				variableTable.push("?" + variable);
				if(generateTriples == true && expressionTable[key]['type'] != null && className != "[ ]" && className != "[ + ]") {
					if(expressionTable[key]['kind'] == "CLASS_ALIAS") referenceCandidateTable.push(varName);
					if(expressionTable[key]['kind'] == "CLASS_NAME") {
						var inFilter = false;
						if(typeof variableNamesClass[varName] !== 'undefined' && variableNamesClass[varName]["isVar"] != true) inFilter = true;
						
						if(isSimpleVariable == true) {
							if(parseType == "class")tripleTable.push({"var": getPrefix(expressionTable[key]["type"]["Prefix"])+":"+varName, "prefixedName" : classMembership, "object":className, "inFilter":inFilter});
						}else tripleTable.push({"var": getPrefix(expressionTable[key]["type"]["Prefix"])+":"+varName, "prefixedName" : classMembership, "object":variable, "inFilter":inFilter});
	
					}
					else if(expressionTable[key]['kind'] == "CLASS_ALIAS" && isSimpleVariable == true && variable != varName){
						tripleTable.push({"BIND":"BIND(?" + varName + " AS ?" + variable + ")"})
					}else if(expressionTable[key]['kind'] == "CLASS_ALIAS" && alias == null || expressionTable[key]['kind'] == "PROPERTY_ALIAS") {
						
					} else {
						var inFilter = false;
						var variableData = expressionTable[key];
						// if(typeof variableNamesClass[varName] !== 'undefined' && (variableNamesClass[varName]["isVar"] != true 
						// || variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))) inFilter = true;
						if(typeof variableNamesClass[varName] !== 'undefined' && (variableNamesClass[varName]["isVar"] != true 
						|| variableData["type"] != null && false)) inFilter = true;
						var inv = "";
						if(typeof expressionTable[key]["INV"] !== 'undefined') inv = "^";
						
						var isPropertyFromSubQuery = false;
						var isOwnProperty = false;
						if(typeof symbolTable[classID] !== 'undefined' && typeof symbolTable[classID][varName] !== 'undefined'){
							for(var k in symbolTable[classID][varName]){
								if(typeof symbolTable[classID][varName][k]["upBySubQuery"] !== 'undefined' && symbolTable[classID][varName][k]["upBySubQuery"] == 1) {
									isPropertyFromSubQuery = true;
								}
								if(symbolTable[classID][varName][k]["context"] == classID 
								&& typeof symbolTable[classID][varName][k]["type"] !== "undefined" && symbolTable[classID][varName][k]["type"] != null 
								&& symbolTable[classID][varName][k]["type"]["parentType"] != null){
									isOwnProperty = true;
								}
							}
						}
				
						if(isPropertyFromSubQuery == false || isOwnProperty == true) tripleTable.push({"var":"?"+variable, "prefixedName":inv + getPrefix(expressionTable[key]["type"]["Prefix"])+":"+varName+pathMod, "object":className, "inFilter":inFilter});
						var namespace = expressionTable[key]["type"]["Namespace"];
						if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
						prefixTable[getPrefix(expressionTable[key]["type"]["Prefix"]) + ":"] = "<"+namespace+">";
					}
					if(expressionTable[key]['kind'] == "CLASS_ALIAS" || expressionTable[key]['kind'] == "PROPERTY_ALIAS") referenceTable.push("?"+variable)
				}
			} else if (typeof variableNamesAll[expressionTable[key]["name"]] !== 'undefined'){
				SPARQLstring = SPARQLstring + "?" + expressionTable[key]["name"];
				variableTable.push("?" + expressionTable[key]["name"]);
			} else if (expressionTable[key]["name"].toLowerCase() == 'type'){
				var name = alias;
				if(name == null || name == "") name = expressionTable[key]["name"];
				tripleTable.push({"var":"?"+name, "prefixedName":"rdf:type", "object":className, "inFilter" : true});
				SPARQLstring = SPARQLstring + "?" + name;
				variableTable.push("?" + name);
				prefixTable["rdf:"] = "<"+knownNamespaces["rdf:"]+">";
			}else{
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
					
			if(parseType == "attribute" && isFunction != true && isExpression != true && isAggregate != true){
				if(alias == null || alias == ""){
					alias = "expr_"+counter;
					counter++;
				}
				tripleTable.push({"BIND":"BIND(" + SPARQLstring + " AS ?" + alias + ")"});
				SPARQLstring = "?" + alias;
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
						else separator = "; SEPARATOR=', '";
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
			// if(typeof expressionTable[key]["Relation"]!== 'undefined' && parseType != "condition"){
				 // var clId;
				 // for(var k in idTable){
					// if (idTable[k] == className) {
						// clId = k;
						// break;
					// }
				 // }
				// messages.push({
					// "type" : "Error",
					// "message" : "Incorrect use of relation " + expressionTable[key]["Relation"] + ", it cannot be used in " + parseType,
					// "listOfElementId" : [clId],
					// "isBlocking" : true
				// });
				// visited = 1
			// } else {
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
					//Parameter useStringLiteralConversion
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
							
							|| (typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
							
							 && //(symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]!== null &&
							// (symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'XSD_STRING'
							 // || symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'xsd:string'))
							 typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]) == true
							))
						) ||
						(typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
						&& ((expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]!= null
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]!== 'undefined'
						
						&& (expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]== 'XSD_STRING'
						 || expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["type"]== 'xsd:string')
						
						) || (typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
							// && symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'XSD_STRING'
							&& typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["name"]) == true
							))
						) 
						|| (typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]!== 'undefined'
						&& ((expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]!= null
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] !== 'undefined'
						
						&& (expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] == 'XSD_STRING'
						 || expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["type"] == 'xsd:string')) 
						 
							|| (typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["name"]] !== 'undefined'
							
							// && (symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["name"]]["type"]["type"]== 'XSD_STRING'
							 // || symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["name"]]["type"]["type"]== 'xsd:string')
							 && typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["name"]) == true
							 ))
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
						
						
						if ( visited != 1 && typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]=== 'undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionL"]) == false
						){
							var path = getPathFullGrammar(expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"]);
							messages = messages.concat(path["messages"]);
							if(typeof path["variable"] !== 'undefined' &&
							typeof path["variable"]["var"] !== 'undefined' &&
							typeof path["variable"]["var"]["type"] !== 'undefined' &&
							path["variable"]["var"]["type"] != null &&
							typeof path["variable"]["var"]["type"]["type"] !== 'undefined' &&
							(path["variable"]["var"]["type"]["type"] == "xsd:string" || path["variable"]["var"]["type"]["type"] == "XSD_STRING" )){
								SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ") " + relation +" ";
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)	
								visited = 1
							}
						}
						
						if ( visited != 1 && typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]=== 'undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionR"]) == false
						){
							var path = getPathFullGrammar(expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"]);
							messages = messages.concat(path["messages"]);
							if(typeof path["variable"] !== 'undefined' &&
							typeof path["variable"]["var"] !== 'undefined' &&
							typeof path["variable"]["var"]["type"] !== 'undefined' &&
							path["variable"]["var"]["type"] != null &&
							typeof path["variable"]["var"]["type"]["type"] !== 'undefined' &&
							(path["variable"]["var"]["type"]["type"] == "xsd:string" || path["variable"]["var"]["type"]["type"] == "XSD_STRING" )){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)+ " " + relation + " ";
								SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)+")";
								visited = 1
							}
						}
						
					}
					//parameter useStringLiteralConversion
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
						 
						|| (typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
							// && (symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'XSD_STRING'
							 // || symbolTable[expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'xsd:string')
							&& typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]) == true
							))
						
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
						 
						|| (typeof symbolTable[classID][expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
							// && (symbolTable[expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'XSD_STRING'
							 // || symbolTable[expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]]["type"]["type"]== 'xsd:string')
							&& typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]) == true
							 ))
						
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
						
						if (visited != 1 && typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"]!== 'undefined'

						&& typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]==='undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionL"]) == false)
						{
							var path = getPathFullGrammar(expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"]);
							messages = messages.concat(path["messages"]);
							if(typeof path["variable"] !== 'undefined' &&
							typeof path["variable"]["var"] !== 'undefined' &&
							typeof path["variable"]["var"]["type"] !== 'undefined' &&
							path["variable"]["var"]["type"] != null &&
							typeof path["variable"]["var"]["type"]["type"] !== 'undefined' &&
							(path["variable"]["var"]["type"]["type"] == "xsd:string" || path["variable"]["var"]["type"]["type"] == "XSD_STRING" )){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " ";
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "^^xsd:string";
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								visited = 1
							}
						}
						
						if (visited != 1 && typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"]!== 'undefined'
						
						&& typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]==='undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionR"]) == false)
						{
							var path = getPathFullGrammar(expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"]);
							messages = messages.concat(path["messages"]);
							if(typeof path["variable"] !== 'undefined' &&
							typeof path["variable"]["var"] !== 'undefined' &&
							typeof path["variable"]["var"]["type"] !== 'undefined' &&
							path["variable"]["var"]["type"] != null &&
							typeof path["variable"]["var"]["type"]["type"] !== 'undefined' &&
							(path["variable"]["var"]["type"]["type"] == "xsd:string" || path["variable"]["var"]["type"]["type"] == "XSD_STRING" )){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)+"^^xsd:string " + relation + " ";
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								visited = 1
							}
						}
					}
					//student = S
					//objectProperty = CLASS_ALIAS
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
							|| variableData["type"] != null && false)) inFilter = true;
							// if(typeof variableNamesClass[variableData['name']] !== 'undefined' && (variableNamesClass[variableData['name']]["isVar"] != true
							// || variableData["type"] != null && (typeof variableData["type"]["maxCardinality"] === 'undefined' || variableData["type"]["maxCardinality"] > 1 || variableData["type"]["maxCardinality"] == -1))) inFilter = true;
							if(isSimpleFilter)tripleTable.push({"var":"?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'], "prefixedName":getPrefix(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["Prefix"])+":"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"], "object":className, "inFilter":inFilter});
							else SPARQLstring = "EXISTS{?"+ className + " " + getPrefix(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["Prefix"])+":"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"] + " ?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'] + ".}";
							
							visited = 1
						}
					}
					
					var specialProperties = ["rdf:type", "owl:sameas", "rdfs:subclassof"];
					//special_property = CLASS_NAME					
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["var"] !== 'undefined'
						&& specialProperties.indexOf(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'].toLowerCase()) != -1
						
						&& typeof expressionTable[key]['NumericExpressionR'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& ((typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'CLASS_NAME')
						||(typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'CLASS_NAME'
						))
						){
							var variable = findINExpressionTable(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'], "var");
							var inFilter = null;
							if(isSimpleFilter) tripleTable.push({"var":":"+variable['type']['localName'], "prefixedName":expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'], "object":className, "inFilter":inFilter});
							else SPARQLstring = "EXISTS{?"+ className + " " + expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'] + " :"+variable['type']['localName'] + ".}";
							
							if(knownNamespaces[expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["Prefix"]] != null)prefixTable[ expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["Prefix"]] = "<"+ knownNamespaces[ expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["Prefix"]]+">";
			
							visited = 1
						}
					}
					//CLASS_NAME = special_property				
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionR'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["var"] !== 'undefined'
						&& specialProperties.indexOf(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'].toLowerCase()) != -1
						
						&& typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& ((typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'CLASS_NAME')
						||(typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'CLASS_NAME'
						))
						){
							var variable = findINExpressionTable(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'], "var");
							var inFilter = null;
							if(isSimpleFilter) tripleTable.push({"var":":"+variable['type']['localName'], "prefixedName":expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'], "object":className, "inFilter":inFilter});
							else SPARQLstring = "EXISTS{?"+ className + " " + expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'] + " :"+variable['type']['localName'] + ".}";
							
							if(knownNamespaces[expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["Prefix"]] != null)prefixTable[ expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["Prefix"]] = "<"+ knownNamespaces[ expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["Prefix"]]+">";
			
							visited = 1
						}
					}
					
					//property = special_property				
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionR'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["var"] !== 'undefined'
						&& specialProperties.indexOf(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'].toLowerCase()) != -1
						
						&& typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& ((typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& (expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_NAME'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_ALIAS'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == null))
						||(typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var'] !== 'undefined'
						&& (expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'PROPERTY_ALIAS'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'PROPERTY_NAME'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == null)
						))
						){
							var variable = findINExpressionTable(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'], "var");
							if(variable['PropertyReference'] == null){
								var varName = variable["name"];
								if(knownNamespaces[varName.substring(0,varName.indexOf(":")+1)] != null) prefixTable[varName.substring(0, varName.indexOf(":")+1)] = "<"+ knownNamespaces[varName.substring(0, varName.indexOf(":")+1)]+">";
								if(varName.indexOf(":") != -1) varName = varName.substring(varName.indexOf(":")+1);
								varName = setVariableName(varName, null,variable);
								var inFilter = true;
								if(isSimpleFilter) {
									tripleTable.push({"var":"?"+varName, "prefixedName":variable["name"], "object":className, "inFilter":inFilter});
									applyExistsToFilter = true;
									var relation = expressionTable[key]['Relation'];
									if(relation = "<>") relation = "!=";
									SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " " + "?"+varName;
								}
								visited = 1;
							} else {
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
								var relation = expressionTable[key]['Relation'];
								if(relation = "<>") relation = "!=";
								SPARQLstring = SPARQLstring  + " " + relation + " ";
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
								visited = 1;
							}
						}
					}
					//special_property = property			
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["var"] !== 'undefined'
						&& specialProperties.indexOf(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'].toLowerCase()) != -1
						
						&& typeof expressionTable[key]['NumericExpressionR'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& ((typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& (expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_NAME'
							|| expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_ALIAS'
							|| expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == null))
						||(typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var'] !== 'undefined'
						&& (expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'PROPERTY_ALIAS'
							|| expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'PROPERTY_NAME'
							|| expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == null)
						))
						){
							var variable = findINExpressionTable(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'], "var");
							if(variable['PropertyReference'] == null){
								var varName = variable["name"];
								if(knownNamespaces[varName.substring(0,varName.indexOf(":")+1)] != null) prefixTable[varName.substring(0, varName.indexOf(":")+1)] = "<"+ knownNamespaces[varName.substring(0, varName.indexOf(":")+1)]+">";
								if(varName.indexOf(":") != -1) varName = varName.substring(varName.indexOf(":")+1);
								varName = setVariableName(varName, null,variable);
								var inFilter = true;
								if(isSimpleFilter) {
									tripleTable.push({"var":"?"+varName, "prefixedName":variable["name"], "object":className, "inFilter":inFilter});
									applyExistsToFilter = true;
									var relation = expressionTable[key]['Relation'];
									if(relation = "<>") relation = "!=";
									SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " " + "?"+varName;
								}
								visited = 1;
							} else {
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
								var relation = expressionTable[key]['Relation'];
								if(relation = "<>") relation = "!=";
								SPARQLstring = SPARQLstring  + " " + relation + " ";
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
								visited = 1;
							}
						}
					}
					
					//`rdf:type, `pr:attr	in attribute
					if(visited != 1 && typeof expressionTable[key]['Relation'] === 'undefined' && parseType == "attribute"){
						if(typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["var"] !== 'undefined'

						){
							var variable = findINExpressionTable(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'], "var");
							if(variable['PropertyReference'] != null){
								var expression = expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'];
								if(knownNamespaces[expression["PrefixedName"]["Prefix"]] != null){
									prefixTable[expression["PrefixedName"]["Prefix"]] = "<"+ knownNamespaces[expression["PrefixedName"]["Prefix"]]+">";
									var name = alias;
									if(name == null || name == "") name = expression["PrefixedName"]["Name"];
									tripleTable.push({"BIND":"BIND(" + expression["PrefixedName"]["var"]["name"] + " AS ?" + name + ")"})
									valueString = "?"+name;
									SPARQLstring = SPARQLstring  + valueString; 
								} else if(variable["type"] != null){
									var name = setVariableName(expression["PrefixedName"]["Name"], alias, variable);
									var namespace = variable["type"]["Namespace"]
									prefixTable[getPrefix(variable["type"]["Prefix"]) + ":"] = "<"+namespace+">"
									
									tripleTable.push({"BIND":"BIND(" + expression["PrefixedName"]["var"]["name"] + " AS ?" + name + ")"})
									valueString = "?"+name;
									SPARQLstring = SPARQLstring  + valueString; 
								}
								
								visited = 1;
							}
						}
					}
					
					//`attribute		
					if(visited != 1 && typeof expressionTable[key]['Relation'] === 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']["var"] !== 'undefined'

						){
							var variable = findINExpressionTable(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'], "var");
							if(variable['PropertyReference'] != null){
								
								var name = setVariableName(variable["name"], alias, variable);
									tripleTable.push({"BIND":"BIND(" + variable["type"]["Prefix"]+":" + variable["name"] + " AS ?" + name + ")"})
									valueString = "?"+name;
									SPARQLstring = SPARQLstring  + valueString; 
								visited = 1;
							}
						}
					}
					//console.log(expressionTable[key]['NumericExpressionL'])
					//property = `attribute				
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionR'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']["var"] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']["var"]['PropertyReference'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']["var"]['PropertyReference'] != null
						
						&& typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& ((typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& (expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_NAME'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_ALIAS'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == null))
						||(typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var'] !== 'undefined'
						&& (expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'PROPERTY_ALIAS'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'PROPERTY_NAME'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == null)
						))
						){
							
							var variable = findINExpressionTable(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'], "var");
							var varName = variable["name"];
							varName = setVariableName(varName, null,variable);
							if(isSimpleFilter && typeof variable["type"] !== 'undefined' && variable["type"] != null) {
								applyExistsToFilter = false;
								var relation = expressionTable[key]['Relation'];
								if(relation = "<>") relation = "!=";
								SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " " + variable["type"]["Prefix"] + ":" + variable["name"];
							}
							visited = 1;
						}
					}
					
					//property = `pr:attribute				
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionR'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["var"] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]["var"]['PropertyReference'] != null
						
						&& typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& ((typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& (expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_NAME'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_ALIAS'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == null))
						||(typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var'] !== 'undefined'
						&& (expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'PROPERTY_ALIAS'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == 'PROPERTY_NAME'
							|| expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['kind'] == null)
						))
						){
							
							var variable = findINExpressionTable(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'], "var");
							var varName = variable["name"];
							varName = setVariableName(varName, null,variable);
							if(isSimpleFilter && typeof variable["type"] !== 'undefined' && variable["type"] != null) {
								
								var namespace = variable["type"]["Namespace"]
								prefixTable[getPrefix(variable["type"]["Prefix"]) + ":"] = "<"+namespace+">"
								
								applyExistsToFilter = false;
								var relation = expressionTable[key]['Relation'];
								if(relation = "<>") relation = "!=";
								SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " " + variable["name"];
							}
							visited = 1;
						}
					}
					
					//property = "2000-01-01"
					//date/tateTime = "string"
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['type'] != null
						
						
						&& typeof expressionTable[key]['NumericExpressionR'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['RDFLiteral'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['RDFLiteral']['iri'] === 'undefined'
					
						){
							var variable = expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'];
							if(variable['type']['type'] == "xsd:date"){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + expressionTable[key]['Relation'] + " ";
								SPARQLstring = SPARQLstring  + "xsd:date(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								visited = 1
							}
							if(variable['type']['type'] == "xsd:dateTime"){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + expressionTable[key]['Relation'] + " ";
								SPARQLstring = SPARQLstring  + "xsd:dateTime(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								visited = 1
							}
						}
					}

					var left = findINExpressionTable(expressionTable[key]["NumericExpressionL"], "PrimaryExpression");
					var right = findINExpressionTable(expressionTable[key]["NumericExpressionR"], "PrimaryExpression");
					
					//property = 5
					//propety = "string"
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined' && expressionTable[key]['Relation'] == "=" && isSimpleFilter == true && 
					((((typeof left["var"] !== 'undefined' && typeof left["var"]["kind"] !== 'undefined' && left["var"]["kind"] == "PROPERTY_NAME") 
					    || typeof left["Path"] !== 'undefined' 
						|| typeof left["Reference"] !== 'undefined') && typeof right["var"] === 'undefined' 
						&& typeof right["Path"] === 'undefined' 
						&& typeof right["Reference"] === 'undefined'
						)
					    ||(((typeof right["var"] !== 'undefined' && typeof right["var"]["kind"] !== 'undefined' && right["var"]["kind"] == "PROPERTY_NAME") 
						|| typeof right["Path"] !== 'undefined' 
						|| typeof right["Reference"] !== 'undefined')
						&& typeof left["var"] === 'undefined' 
						&& typeof left["Path"] === 'undefined' 
						&& typeof left["Reference"] === 'undefined'
						))
					){
						
						var tripleTableTemp = tripleTable;
						tripleTable = [];
						var VarL = generateExpression(expressionTable[key]["NumericExpressionL"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						var VarR = generateExpression(expressionTable[key]["NumericExpressionR"], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						
						tripleTable = tripleTable.filter(function (el, i, arr) {
							return arr.indexOf(el) === i;
						});
						
						for(var k in tripleTable){
							var varTemp;
							if(tripleTable[k]["var"] == VarL)varTemp = VarR;
							else varTemp = VarL;
							tripleTableTemp.push({"object":tripleTable[k]["object"], "prefixedName":tripleTable[k]["prefixedName"], "var":varTemp + " " });
						}
						tripleTable = tripleTableTemp;
						applyExistsToFilter = false;
						visited = 1;
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
								if(alias!=null)SPARQLstring =  "?" +alias + SPARQLstring;
								else SPARQLstring =  "?" +className + SPARQLstring;
							}
						}
						visited = 1
					}
				}
			//}
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
							if(isDateVar(left, dateArray, symbolTable[classID]) == true && isDateVar(right, dateArray, symbolTable[classID]) == true){
								SPARQLstring = SPARQLstring + 'bif:datediff("day", ' + sr + ", " + sl + ")";
								isFunction = true;
								isTimeFunction = true;
							} else if(isDateVar(left, dateTimeArray, symbolTable[classID]) == true && isDateVar(right, dateTimeArray, symbolTable[classID]) == true){
								SPARQLstring = SPARQLstring + 'bif:datediff("day", ' + sr + ", " + sl + ")";
								isFunction = true;
								isTimeFunction = true;
							} else if(isDateVar(left, dateTimeArray, symbolTable[classID]) == true && isValidForConvertation(right, symbolTable[classID]) == true ){
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								SPARQLstring = SPARQLstring + 'bif:datediff("day", xsd:dateTime(' + sr + '),' + sl + ")";
								isFunction = true;
								isTimeFunction = true;
							} else if(isDateVar(left, dateTimeArray, symbolTable[classID]) == true){
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
					valueString = generateExpression({"var" : expressionTable[key]["iri"]["PrefixedName"]['var']}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				} else {
					if(knownNamespaces[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]] != null){
						prefixTable[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]] = "<"+ knownNamespaces[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]]+">";
						if(parseType == "attribute"){
							var name = alias;
							if(name == null || name == "") name = expressionTable[key]["iri"]["PrefixedName"]["Name"];
							tripleTable.push({"var":"?"+name, "prefixedName":expressionTable[key]["iri"]["PrefixedName"]["var"]["name"], "object":className, "inFilter" : true});
							valueString = "?"+name;
						}
						if(parseType == "class"){
							var name = alias;
							if(name == null || name == "") name = expressionTable[key]["iri"]["PrefixedName"]["Name"];
							tripleTable.push({"var":expressionTable[key]["iri"]["PrefixedName"]["var"]["name"], "prefixedName":classMembership, "object":className, "inFilter" : true});
							valueString = name;
						}
						
					}
				}
				
				if (valueString == "vq:datediff") valueString = "bif:datediff" ;
				SPARQLstring = SPARQLstring  + valueString;
			}
			if (typeof expressionTable[key]["iri"]["IRIREF"]!== 'undefined') {
				if(typeof expressionTable[key]["ArgList"] === 'undefined' && parseType != "condition"){
					var name = alias;
					if(name == null || name == "") {
						name = "expr_"+counter;
						counter++;
					}
					if(parseType == "class"){tripleTable.push({"var":"?"+className, "prefixedName":classMembership, "object":expressionTable[key]["iri"]["IRIREF"], "inFilter" : true});}
					else {tripleTable.push({"var":"?"+name, "prefixedName":expressionTable[key]["iri"]["IRIREF"], "object":className, "inFilter" : true});}
					SPARQLstring = SPARQLstring + "?"+name;
				}else{
					SPARQLstring = SPARQLstring  + expressionTable[key]["iri"]["IRIREF"];
				}
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
			
			if(typeof expressionTable[key]["Function"]!== 'undefined' && expressionTable[key]["Function"] == "langmatchesShort"){
				var pe = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				if(parseType == "attribute"){
					SPARQLstring = pe
					attributeFilter = "LANGMATCHES(LANG(" + pe + "), '" +expressionTable[key]["LANGTAG"] + "')";
				}				
			}else if(typeof expressionTable[key]["Function"]!== 'undefined' && expressionTable[key]["Function"] == "langmatchesShortMultiple"){
				attributeFilter = true;
				var pe = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				
				var lang = "LANGMATCHES(LANG(" + pe + "), '";
				
				SPARQLstring = SPARQLstring  + lang + expressionTable[key]["LANGTAG_MUL"][0] + "')";
				if(typeof expressionTable[key]["LANGTAG_MUL"][1] !== 'undefined'){
					for(var langtag in expressionTable[key]["LANGTAG_MUL"][1]){
						SPARQLstring = SPARQLstring  + " || " + lang + expressionTable[key]["LANGTAG_MUL"][1][langtag] + "')";
					}
				}
				if(parseType == "attribute"){
					attributeFilter = SPARQLstring;
					SPARQLstring = pe;
				}
			}else if(typeof expressionTable[key]["Function"]!== 'undefined' && expressionTable[key]["Function"] == "coalesceShort"){
				isFunction = true;
				var pe = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression1"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				var pe2 = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression2"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				
				SPARQLstring = SPARQLstring + "COALESCE(" + pe + ", " + pe2 + ")";
				
			} else if(typeof expressionTable[key]["Function"]!== 'undefined' && (expressionTable[key]["Function"].toLowerCase() == 'month' 
					|| expressionTable[key]["Function"].toLowerCase() == 'day' || expressionTable[key]["Function"].toLowerCase() == 'year'
					|| expressionTable[key]["Function"].toLowerCase() == 'hours' || expressionTable[key]["Function"].toLowerCase() == 'minutes'
					|| expressionTable[key]["Function"].toLowerCase() == 'seconds'
					|| expressionTable[key]["Function"].toLowerCase() == 'timezone' || expressionTable[key]["Function"].toLowerCase() == 'tz')){
				isTimeFunction = true;
				isFunction = true;
				prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
				SPARQLstring = SPARQLstring  + expressionTable[key]["Function"];
				SPARQLstring = SPARQLstring  + "(xsd:dateTime(" + generateExpression({Expression : expressionTable[key]["Expression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "))";	
			} else{
				isFunction = true;
			
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
				if (typeof expressionTable[key]["PrimaryExpression"]!== 'undefined') {
					SPARQLstring = SPARQLstring  + "(" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression"]}, "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
				}
				if (typeof expressionTable[key]["NIL"]!== 'undefined') {
					SPARQLstring = SPARQLstring  + "()";
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
				if(expTable.length > 0) SPARQLstring = SPARQLstring  + "(" + expTable.join(", ") +")";
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
						if(isDateVar(expressionTable[key]["PrimaryExpressionL"], dateArray, symbolTable[classID]) == true && isDateVar(expressionTable[key]["PrimaryExpressionR"], dateArray, symbolTable[classID]) == true){
							SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '", ' + sr + ", " + sl + ")";
						}
						else if(isDateVar(expressionTable[key]["PrimaryExpressionL"], dateTimeArray, symbolTable[classID]) == true && isDateVar(expressionTable[key]["PrimaryExpressionR"], dateTimeArray, symbolTable[classID]) == true){
							SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '", ' + sr + ", " + sl + ")";
						}
						else if(isDateVar(expressionTable[key]["PrimaryExpressionL"], dateTimeArray, symbolTable[classID]) == true && isValidForConvertation(expressionTable[key]["PrimaryExpressionR"], symbolTable[classID]) == true ){
							SPARQLstring = SPARQLstring + 'bif:datediff("' + fun.substring(0, fun.length-1) + '",  xsd:dateTime(' + sr + "), " + sl + ")";
							prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
						}
						else if(isDateVar(expressionTable[key]["PrimaryExpressionR"], dateTimeArray, symbolTable[classID]) == true){
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
			isFunction = true;
			SPARQLstring = SPARQLstring + "REGEX(" + generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			visited = 1
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
		if (key == "NIL"){
			SPARQLstring = SPARQLstring  + "()";
			visited = 1
		}
		
		if(visited == 0 && typeof expressionTable[key] == 'object'){
			SPARQLstring += generateExpression(expressionTable[key], "", className, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		}
	}
	return SPARQLstring
}


countCardinality = function(str_expr, context){	 
	var schema = new VQ_Schema();

	try {
      if(typeof str_expr !== 'undefined' && str_expr != null && str_expr != ""){
		  var parsed_exp = vq_grammar.parse(str_expr, {schema:schema, symbol_table:{}, context:context});
		  var cardinality = countMaxExpressionCardinality(parsed_exp, -1);
		  
		  if(cardinality["isAggregation"] == true) return 1;
		  if(cardinality["isMultiple"] == true) return -1;
		  if(cardinality["isMultiple"] == false && cardinality["isAggregation"] == false) return 1;
		  
	  } else return -1
    } catch (e) {
      console.log(e)
    } 
	
	return -1;
}

function countMaxExpressionCardinality(expressionTable){
	var isMultiple = false;
	var isAggregation = false;
	
	for(var key in expressionTable){
		if(key == "var") {	
			//if type information is known
			if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined') {
				//if maxCardinality is known
				if(typeof expressionTable[key]['type']['maxCardinality'] !== 'undefined' && expressionTable[key]['type']['maxCardinality'] != null){
					if(expressionTable[key]['type']['maxCardinality'] == -1 || expressionTable[key]['type']['maxCardinality'] > 1) {
						isMultiple = true;
					}
				//if maxCardinality not known
				} else {
					isMultiple = true;
				}
			// if type information not known
			} else if(typeof expressionTable[key]['type'] === 'undefined' || expressionTable[key]['type'] == null )  {
				isMultiple = true;
			}
		}
	
		if (key == "Aggregate") {
			isAggregation = true;
		}
		
		if(isAggregation == false && typeof expressionTable[key] == 'object'){
			var temp = countMaxExpressionCardinality(expressionTable[key]);
			if(isAggregation == false) isAggregation = temp["isAggregation"];
			if(isMultiple == false) isMultiple = temp["isMultiple"];	
		}
	}
	
	return {isMultiple:isMultiple, isAggregation:isAggregation};
}

function typeStringFromSymbolTable(symbolTable, expression){
	var value = false;
	for(var key in symbolTable[expression]){

		if(symbolTable[expression][key]["type"]!== null && typeof symbolTable[expression][key]["type"] !== 'undefined' &&
			(symbolTable[expression][key]["type"]["type"]== 'XSD_STRING'
			|| symbolTable[expression][key]["type"]["type"]== 'xsd:string')) value = true;
		
	}
	
	return value;
}

