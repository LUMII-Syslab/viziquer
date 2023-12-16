import { Projects } from '/imports/db/platform/collections'

import { dataShapes } from '/imports/client/custom/vq/js/DataShapes'
import { checkIfIsSimpleVariable, checkIfIsSimpleVariableForNameDef, findINExpressionTable, isFunctionExpr, transformSubstring } from './parserCommon';

var tripleTable = [];
var filetrAsTripleTable = [];
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
var attributeOrder = 99999;
var fieldId = null;
var attributesNames = [];
var currentClass = null;
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

function initiate_variables(vna, count, pt, ep, st,internal, prt, idT, ct, memS, knPr, clID, attribNames, expr,  variableNT, variableNC, ord, fId, cl){
	tripleTable = [];
	filetrAsTripleTable = [];
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
	variableNamesTable = variableNT;
	variableNamesCounter = variableNC;
	currentClass = cl;
	if(ord != null) attributeOrder = ord;
	if(fId != null) fieldId = fId;
	
	for(let key = 0; key < knPr.length; key++){
		if(knPr[key]["name"] == emptyPrefix)knownNamespaces[":"] = knPr[key]["value"];
		knownNamespaces[knPr[key]["name"]+":"] = knPr[key]["value"];
	}
}

function parse_class(clazz, symbolTable, parameterTable, idTable, referenceTable, classMembership, knPr){
	var messages = [];
	var triples = [];
	var prefixTable = [];
	var exp = "";
	
	for(let key = 0; key < knPr.length; key++){
		if(knPr[key]["name"] == emptyPrefix)knownNamespaces[":"] = knPr[key]["value"];
		knownNamespaces[knPr[key]["name"]+":"] = knPr[key]["value"];
		if(knPr[key].is_local == true) knownNamespaces[":"] = knPr[key]["value"];
	}

	if(typeof idTable[clazz.identification._id] !== "undefined"){
		var classForm = checkIfIsURI(idTable[clazz.identification._id])
		if(classForm == "not_uri")exp = "?"+ idTable[clazz.identification._id];
		else if(classForm == "full_form") exp = "<" + idTable[clazz.identification._id] +">";
		else if(classForm == "prefix_form") exp = idTable[clazz.identification._id];
	} else {
		messages.push({
						"type" : "Error",
						"message" : "Class name "+clazz.identification.display_name +" is undefined.",
						"isBlocking" : true
					});
	}
	var pr = clazz.identification.prefix;
	if(typeof pr === "undefined" || pr === null) pr = "";
	var object = pr+":"+clazz.identification.local_name;
	if(clazz.identification.is_literal == true) object = '"'+ clazz.identification.local_name +'"'
	var triple = exp + " "+ classMembership + " " + object+ ". ";	
	triples.push(triple);
	
	
	if(typeof knownNamespaces[pr +":"] !== "undefined"){
		if(clazz.identification.prefix != null) prefixTable[clazz.identification.prefix+":"] = "<"+ knownNamespaces[clazz.identification.prefix+":"]+ ">";
	}
	else {
		messages.push({
						"type" : "Error",
						"message" : "Unknown prefix: "+clazz.identification.prefix,
						"isBlocking" : true
					});
	}
	
	return {"exp":exp, "triples":triples, "prefixTable":prefixTable, "messages":messages};

}

function parse_filter(cl, expr, variableNT, variableNC, attribNames, clID, parsed_exp, className, classSchemaName, vnc, vna, count, ep, st, classTr, prt, idT, rTable, memS, knPr, fId, generateTriple) {
	initiate_variables(vna, count, "condition", ep, st, false, prt, idT, rTable, memS, knPr, clID, attribNames, expr["exp"], variableNT, variableNC, 99999999999999, fId, cl);
	//initiate_variables(vna, count, "different", ep, st, false, prt, idT);
	variableNamesClass = vnc;
	
	var parsed_exp1 = transformBetweenLike(parsed_exp);
	
	// console.log(JSON.stringify(parsed_exp1,null,2));
	var parsed_exp2 = transformSubstring(parsed_exp1);
	
	var parsed_exp3 = transformExistsNotExists(parsed_exp2, null, className);

	// console.log(JSON.stringify(parsed_exp3,null,2));
	var temp = checkIfIsSimpleVariable(parsed_exp3, true, null, true, false, false, false);
	isSimpleFilter = temp["isSimpleFilter"];
	isUnderOr = temp["isUnderOr"];
	isUnderIf = temp["isUnderIf"];
	
	var result = generateExpression(parsed_exp3, "", className, classSchemaName, null, true, false, false);
	
	// console.log(JSON.stringify(parsed_exp3,null,2));
	
	var uniqueTriples = createTriples(tripleTable, "out").filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
		
	// if in filter expression is used variable name, then put filter inside EXISTS
	if(applyExistsToFilter != null && applyExistsToFilter == true && generateTriple != false){
		var uniqueTriplesFilter = createTriples(tripleTable, "filter").filter(function (el, i, arr) {
			return arr.indexOf(el) === i;
		});
		
		// if OpenLink Virtuoso && classTr != null && classTr != ""
		if((typeof parameterTable["queryEngineType"] === 'undefined' || parameterTable["queryEngineType"] == "VIRTUOSO") && classTr != null && classTr != "") uniqueTriples.unshift(classTr);
		if((typeof parameterTable["simpleConditionImplementation"] !== "undefined" && parameterTable["simpleConditionImplementation"] == true) || expr["allowResultMultiplication"] == true) {
			uniqueTriples = uniqueTriples.concat(uniqueTriplesFilter);
		}
		else {
			if(uniqueTriplesFilter.length != 0) result = "EXISTS{" + uniqueTriplesFilter.join("\n") + "\nFILTER(" + result + ")}";
		}
		// uniqueTriples = [];
	}
	
	if(uniqueTriples.length == 1 && typeof uniqueTriples[0] === "string" && uniqueTriples[0].startsWith("BIND(") && uniqueTriples[0].endsWith(result+")")){
		result = uniqueTriples[0].substring(5, uniqueTriples[0].length-result.length-5);
		uniqueTriples = [];
	}
	
	return {"exp":result, "triples":uniqueTriples, "filetrAsTripleTable":filetrAsTripleTable, "expressionLevelNames":expressionLevelNames, "references":referenceTable,  "counter":counter, "isAggregate":isAggregate, "isFunction":isFunction, "isExpression":isExpression, "isTimeFunction":isTimeFunction, "prefixTable":prefixTable, "referenceCandidateTable":referenceCandidateTable, "messages":messages};
}

function parse_attrib(cl, expr, variableNT, variableNC, attribNames, clID, parsed_exp, alias, className, classSchemaName, vnc, vna, count, ep, st, internal, prt, idT, rTable, memS, parType, knPr, ord, fId) {

	alias = alias || "";
	
	if(parType != null) initiate_variables(vna, count, parType, ep, st, internal, prt, idT, rTable, memS, knPr, clID, attribNames, expr,  variableNT, variableNC, ord, fId, cl);
	else initiate_variables(vna, count, "attribute", ep, st, internal, prt, idT, rTable, memS, knPr, clID, attribNames, expr,  variableNT, variableNC, ord, fId, cl);
	
	variableNamesClass = vnc;
	
	var parsed_exp1 = transformSubstring(parsed_exp);
	// check if given expression is simple variable name or agregation, function, expression
	// if given expression is simple variable, then in triple use alias(if exists), else - use variable names
	var temp = checkIfIsSimpleVariable(parsed_exp1, true, true, null, false, false, false);
	isSimpleVariable = temp["isSimpleVariable"];
	isUnderOr = temp["isUnderOr"];
	isUnderIf = temp["isUnderIf"];

	isSimpleVariableForNameDef = checkIfIsSimpleVariableForNameDef(parsed_exp1, true);
	if(temp["isIRIREF"] == false && (isSimpleVariable == false || alias == "")) alias = null; 
	
	var result = generateExpression(parsed_exp1, "", className, classSchemaName, alias, true, isSimpleVariable, false);
	//var resultSQL = generateExpressionSQL(parsed_exp1, "", className, classSchemaName, alias, true, isSimpleVariable, false);

	if(alias != null && typeof symbolTable[classID] !== "undefined" && typeof symbolTable[classID][expr] !== "undefined" && symbolTable[classID][expr].length == 1 && symbolTable[classID][expr][0]["kind"].indexOf("_ALIAS") != -1){
		tripleTable.push({"BIND":"BIND(?" + expr + " AS ?" + alias + ")"})
	}
	
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
		var dot = ".";
		if(typeof triple["BIND"] === 'string') triples.push(triple["BIND"]);
		else if(typeof triple["VALUES"] === 'string') triples.push(triple["VALUES"]);
		else{
			var objectName =  triple["object"];
			if(objectName.indexOf("://") != -1 && objectName.indexOf("<") != 0) objectName = "<" + objectName + ">";
			else if(objectName.indexOf(":") != -1) {
				//TODO add prefix to table
			} else if(objectName.startsWith("_b")){
				objectName = "";
				dot = "";
			}else objectName = "?"+objectName;
			if(tripleType == "out"){
				if(parseType == "attribute") {
					if(!triple["prefixedName"].startsWith("undefined:")){
						var triple = objectName + " " + triple["prefixedName"] + " " + triple["var"] + ".";
						if(attributeFilter != ""){
							triple = triple+ " FILTER("+attributeFilter+")";
						}
						triples.push(triple);
					}
				}
				if(parseType == "class" || parseType == "aggregation" ||  (parseType == "condition" && (triple["inFilter"] == null || applyExistsToFilter == false))) triples.push(objectName + " " + triple["prefixedName"] + " " + triple["var"] + dot );
			} else {
				if(parseType == "different" || (parseType == "condition" && triple["inFilter"] == true)) triples.push(tripleStart + objectName + " " + triple["prefixedName"] + " " + triple["var"] + tripleEnd + dot);
			}
		//	triples.push("?" + triple["object"] + " " + triple["prefixedName"] + " " + triple["var"] + "." );
		}
	})
	return triples;
}

function findReferenceDefinitions(variableNamesTableClass, referenceName, isPath){
	var referenceDefinitions = [];
	if(typeof variableNamesTableClass != "undefined" && typeof variableNamesTableClass[referenceName] != "undefined"){
		for(let refDef = 0; refDef < variableNamesTableClass[referenceName].length; refDef++){
			if(variableNamesTableClass[referenceName][refDef]["order"] <= attributeOrder && variableNamesTableClass[referenceName][refDef]["isPath"] == isPath) referenceDefinitions[refDef] = variableNamesTableClass[referenceName][refDef];
		}
	}
	return referenceDefinitions;
}

function getSimbolTableWithoutPrefixes(symbolTable, referenceName){
	var simbolTableWithoutPrefixes = {};
	
	for(let st in symbolTable){
		if(st.indexOf(":") != -1 && referenceName.indexOf(":") == -1){
			var nameWithoutPrefix = st.substring(st.indexOf(":")+1)
			if(referenceName == nameWithoutPrefix){
				if(typeof simbolTableWithoutPrefixes[nameWithoutPrefix] === "undefined"){
					simbolTableWithoutPrefixes[nameWithoutPrefix] = [];
				}
				
				for(let stRow = 0; stRow < symbolTable[st].length; stRow++){
					simbolTableWithoutPrefixes[nameWithoutPrefix].push(symbolTable[st][stRow])
				}
				
				if(typeof simbolTableWithoutPrefixes[st] === "undefined"){
					simbolTableWithoutPrefixes[st] = [];
				}
				for(let stRow = 0; stRow < symbolTable[st].length; stRow++){
					simbolTableWithoutPrefixes[st].push(symbolTable[st][stRow])
				}
			}
		} else {
			if(st == referenceName){
				if(typeof simbolTableWithoutPrefixes[referenceName] === "undefined"){
					simbolTableWithoutPrefixes[referenceName] = [];
				}
				for(let stRow = 0; stRow < symbolTable[st].length; stRow++){
					simbolTableWithoutPrefixes[referenceName].push(symbolTable[st][stRow])
				}
			}
		}
	}
	return simbolTableWithoutPrefixes;
}

function getLastField(referenceName, referenceDefinitions){
	var refName = referenceName;
	var order = -10;
	if(typeof referenceDefinitions !== "undefined"){
		for(let name = 0; name < referenceDefinitions.length; name++){
			if(order<referenceDefinitions[name]["order"]){
				refName = referenceDefinitions[name]["name"];
				order = referenceDefinitions[name]["order"]
			}	
		}
	}
	return refName;
}

function getReferenceName(referenceName, symbolTable, classID){
	
	//var referenceName = expressionTable["name"];
	
	//simbol table copy with names without prefixes
	var simbolTableWithOutPrefixes = getSimbolTableWithoutPrefixes(symbolTable, referenceName);
	
	// if reference name is in a simbol table
	if(typeof simbolTableWithOutPrefixes[referenceName] !== "undefined"){
		
		var referenceNameST = simbolTableWithOutPrefixes[referenceName];
		
		var sameClassContext = null;
		for(let st = 0; st < referenceNameST.length; st++){
			// if reference in the symbol table in a given class context;
			if(referenceNameST[st]["context"] == classID && referenceNameST[st]["kind"] != "REFERENCE_TO_ALIAS") {
				sameClassContext = referenceNameST;	
			}
		}

		//if reference in the simbol table is with type _ALIAS
		for(let st = 0; st < referenceNameST.length; st++){
			if(referenceNameST[st]["kind"].indexOf("_ALIAS") != -1) {
				// if alias is from other class context and given class has property with same name, without path expression
				var isAlias = false;
				var isPath = false;
				
				if(typeof variableNamesTable[classID] !== "undefined" && typeof variableNamesTable[classID][referenceName] !== "undefined"){
					for(let vnt in variableNamesTable[classID][referenceName]){
						
						if(variableNamesTable[classID][referenceName][vnt]["isAlias"] === true){
							isAlias = true;
							// break;
						}
						if(variableNamesTable[classID][referenceName][vnt]["isPath"] === true){
							isPath = true;
							// break;
						}
					}
				}
				if(classID != referenceNameST[st]["context"] && typeof variableNamesTable[classID] !== "undefined" && typeof variableNamesTable[classID][referenceName] !== "undefined" && isAlias == false && isPath == false){
					// TODO ERROR
					// console.log("ERROR vards gan aliass, gan propertija", variableNamesTable[classID][referenceName])
					messages.push({
						"type" : "Error",
						"message" : "The reference to the name "+referenceName+" can not be resolved unanimously (there are two or more candidate places to which it can refer). The query can not be generated.",
						"isBlocking" : true
					});
					referenceName = null;
					return "";
				}
				// else if(sameClassContext != null && (referenceNameST[st]["kind"] == "CLASS_ALIAS" || referenceNameST[st]["kind"] == "AGGREGATE_ALIAS")){
					
					// return referenceName;
				// }
				// else use alias if variable is not in context class;
				else if(sameClassContext == null) {
					return referenceName;
				}
			}
		}
		
		// if reference in the symbol table in a given class context;
		if(sameClassContext != null && referenceName!= null){
				// if variable is without prefix
				if(referenceName.indexOf(":") == -1){
					
					//if class is unit or union use reference from other context
					if(currentClass != null && (currentClass.isUnion == true || currentClass.isUnit == true)){
						for(let st = 0; st < referenceNameST.length; st++){
							if(referenceNameST[st]["context"] !== classID){
								if(referenceNameST[st]["kind"].indexOf("_ALIAS") != -1) return referenceName;
								
								for(let name in variableNamesTable[referenceNameST[st]["context"]][referenceName]){
									if(variableNamesTable[referenceNameST[st]["context"]][referenceName][name]["isPath"] == false){	
										return variableNamesTable[referenceNameST[st]["context"]][referenceName][name]["name"];
									}
								}
							}
						}
					}
					var referenceDefinitions = findReferenceDefinitions(variableNamesTable[classID], referenceName, false);
					
					// if VNT have variable that is not path expression and is used after definition
					if(Object.keys(referenceDefinitions).length > 0){
						
						// last order where exp = referenceName
						var lastOrderFull;
						for(let name = 0; name < referenceDefinitions.length; name++){
							if(referenceDefinitions[name]["exp"] == referenceName) lastOrderFull = referenceDefinitions[name]["order"];
						}
						// last order
						var lastOrder;
						for(let name = 0; name < referenceDefinitions.length; name++){
							lastOrder = referenceDefinitions[name]["order"];
						}
						// if name is defined before dbo:name
						if(lastOrderFull < lastOrder){
					
							// console.log("ERROR name before dbo:name", referenceDefinitions, referenceName, referenceDefinitions[name]["exp"])
							messages.push({
											"type" : "Error",
											"message" : "The referenced name "+referenceName+" is used before definition.",
											"isBlocking" : true
										});
							return "";
						}
						var refName = getLastField(referenceName, referenceDefinitions);
						// for(let name = 0; name < referenceDefinitions.length; name++){
							// refName = referenceDefinitions[name]["name"];	
						// }
						
						return refName;
					} else {
						
						var referenceDefinitions = findReferenceDefinitions(variableNamesTable[classID], referenceName, true);
						
						// if VNT have variable that is path expression and is used after definition
						if(Object.keys(referenceDefinitions).length > 0){
							// if variable is in simbol table more then one time
							if(referenceNameST.length > 1){
								for(let st = 0; st < referenceNameST.length; st++){
									if(referenceNameST[st]["context"] != classID && referenceNameST[st]["kind"] == "PROPERTY_NAME"){
					   
										// console.log("ERROR vards izmantots cela izteiksme un cita klase")
										
										messages.push({
											"type" : "Error",
											"message" : "The referenced name @"+referenceName+" coincides with the last property of a property path. Reformulate the query (e.g., add an explicit alias to the property path expression or the name to be referenced) to avoid potential mis-understanding.",
											"isBlocking" : true
										});
										return "";
									}
								}
							}
							
							// use variable from VNT
							else {
								var refName = "";
								// for(let name = 0; name < referenceDefinitions.length; name++){
									// refName = referenceDefinitions[name]["name"];
								// }
								messages.push({
									"type" : "Error",
									"message" : "Used name (variable) '" + referenceName + "' not defined in the query, the query can not be created",
									"isBlocking" : true
								});
								return refName;
							}
	
						} else {
							if(typeof variableNamesTable[classID] !== "undefined"){
								for(let name in variableNamesTable[classID][referenceName]){
									if(variableNamesTable[classID][referenceName][name]["order"] > attributeOrder){
										// TODO ERROR
										// console.log("ERROR name before dbo:name", referenceName, referenceDefinitions, attributeOrder, variableNamesTable[classID][referenceName][name]["order"])
										messages.push({
												"type" : "Error",
												"message" : "The referenced name "+referenceName+" is used before definition.",
												"isBlocking" : true
											});
										return "";
									}
								}
							}
	
							for(let st = 0; st < sameClassContext.length; st++){
								if(sameClassContext[st]["kind"].indexOf("_ALIAS") != null) return referenceName
							}
							// console.log("nevar atrast mainigo")
							messages.push({
								"type" : "Error",
								//"message" : "Unrecognized variable '" + substringvar["name"] + "'. Please specify variable.",
								"message" : "Used name (variable) '" + referenceName + "' not defined in the query, the query can not be created",
								//"listOfElementId" : [clId],
								"isBlocking" : true
							});
							return "";
						}
					}
					
				} 
				// if variable is with prefix
				else {
					var refName = referenceName.substring(referenceName.indexOf(":")+1);
					// if VNT have variable that is not path expression, is used after definition, with the same prefix, use it
					if(typeof variableNamesTable[classID] !== "undefined"){
						for(let name in variableNamesTable[classID][refName]){
							if(variableNamesTable[classID][refName][name]["isPath"] == false && variableNamesTable[classID][refName][name]["order"] < attributeOrder && variableNamesTable[classID][refName][name]["exp"] == referenceName){	
								return variableNamesTable[classID][refName][name]["name"];
							}
						}
						for(let name in variableNamesTable[classID][refName]){
							if(variableNamesTable[classID][refName][name]["order"] > attributeOrder){	
								// TODO ERROR
								// console.log("iznamtosana pirms definesanas")
								messages.push({
											"type" : "Error",
											"message" : "The referenced name "+referenceName+" is used before definition.",
											"isBlocking" : true
										});
								return "";
							}
						}
				  
										
				 
					}
					
					//if class is unit or union use reference from ather context
					if(currentClass != null && (currentClass.isUnion == true || currentClass.isUnit == true)){
						for(let st = 0; st < referenceNameST.length; st++){
							if(referenceNameST[st]["context"] !== classID){
								for(let name in variableNamesTable[referenceNameST[st]["context"]][refName]){
									if(variableNamesTable[referenceNameST[st]["context"]][refName][name]["isPath"] == false && variableNamesTable[referenceNameST[st]["context"]][refName][name]["exp"] == referenceName){	
										return variableNamesTable[referenceNameST[st]["context"]][refName][name]["name"];
									}
								}
							}
						}
					}
					messages.push({
								"type" : "Error",
								//"message" : "Unrecognized variable '" + substringvar["name"] + "'. Please specify variable.",
								"message" : "Used name (variable) '" + referenceName + "' not defined in the query, the query can not be created",
								//"listOfElementId" : [clId],
								"isBlocking" : true
							});
					return "";
				}
		} else if(referenceName != null) {
		// if variable is in a simbol table with different context
			for(let st = 0; st < referenceNameST.length; st++){

					if(referenceNameST.length > 1){
						// TODO ERROR
						// console.log("vairākas references no dazadam klasem");
						messages.push({
							"type" : "Error",
							"message" : "The reference to the name "+referenceName+" can not be resolved unanimously (there are two or more candidate places to which it can refer). The query can not be generated.",
							"isBlocking" : true
						});
						return "";
					} else {
						var isReferenceDefinitions = false;
						if(typeof variableNamesTable[classID] != "undefined" && typeof variableNamesTable[classID][referenceName] != "undefined"){
							for(let refDef in variableNamesTable[classID][referenceName]){
								
								if(variableNamesTable[classID][referenceName][refDef]["isPath"] == true) {
									isReferenceDefinitions = true;
									break;
								}
							}
						}
						if(isReferenceDefinitions == true){
							// TODO ERROR
							// console.log("vairākas references no dazadam klasem + cela izteiksme");
							messages.push({
								"type" : "Error",
								"message" : "The reference to the name "+referenceName+" can not be resolved unanimously (there are two or more candidate places to which it can refer). The query can not be generated.",
								"isBlocking" : true
							});
							return "";
						}
						
						var refName = null;
						// for(var name in variableNamesTable[referenceNameST[0]["context"]][referenceName]){
							// refName = variableNamesTable[referenceNameST[0]["context"]][referenceName][name]["name"];
						// }
						var refName = getLastField(refName, variableNamesTable[referenceNameST[0]["context"]][referenceName]);
						
						return refName;
					}	
			}
		}
			
	} 
	// if reference name is NOT in a simbol table
	else {
		// if VNT have variable with path expression, use it
		// var refName = null;
		// if(typeof variableNamesTable[classID] !== "undefined" && typeof variableNamesTable[classID][referenceName] !== "undefined"){
			// for(var name in variableNamesTable[classID][referenceName]){
				// if(variableNamesTable[classID][referenceName][name]["order"] < attributeOrder && variableNamesTable[classID][referenceName][name]["isPath"] == true){
					// refName = variableNamesTable[classID][referenceName][name]["name"];
				// }
			// }
		// }

		// if(refName != null) return refName;
		
		// if VNT have variable, use it
		var refName = null;
		if(typeof variableNamesTable[classID] !== "undefined" && typeof variableNamesTable[classID][referenceName] !== "undefined"){
			for(let name in variableNamesTable[classID][referenceName]){
				if(variableNamesTable[classID][referenceName][name]["order"] > attributeOrder && variableNamesTable[classID][referenceName][name]["isAlias"] == true){
					refName = variableNamesTable[classID][referenceName][name]["name"];
				}
			}
		}

		if(refName != null) return refName;
		
		// console.log("ERROR ERROR ERROR not in a simbol table")
		messages.push({
			"type" : "Error",
			"message" : "Used name (variable) '"+referenceName+ "' not defined in the query, the query can not be created",
			"isBlocking" : true
		});
		//TO DO ERROR
		return "";
	}

	return referenceName;
}

function setVariableName(varName, alias, variableData, generateNewName){
	
	var reserverNames = ["constructor", "length", "prototype"];
	if(reserverNames.indexOf(varName) != -1) varName = varName + " ";
	if(reserverNames.indexOf(alias) != -1) alias = alias + " ";
	
	if(variableData["kind"].indexOf("CLASS") !== -1) {
		if(typeof alias !== "undefined" && alias != null){
			return alias;
		} else if(variableData["kind"] == "CLASS_ALIAS") return varName;
		else return idTable[classID];
	}
	
	var classSimbolTable = getSimbolTableWithoutPrefixes(symbolTable[classID], varName);
	//simbol table copy with names without prefixes
	
	var varFullName = variableData["name"];
	// if is unit or union class
	if(currentClass != null && (currentClass.isUnit == true || currentClass.isUnion == true)){
		
		if((classSimbolTable[varName].length ==1 && classSimbolTable[varName][0]["context"] == classID) || classSimbolTable[varName].length < 1){
			// console.log("Property (attribute) {text} can not be defined at a node without data instance")
			messages.push({
				"type" : "Error",
				"message" : "Property (attribute) "+ varFullName +" can not be defined at a node without data instance",
				"isBlocking" : true
			});
			return "";
		}
	}
	
	if(variableData["kind"] == null){
	   
		// console.log("ERROR vards nav atpazits") 
		messages.push({
			"type" : "Error",
			"message" : "Used name (variable) "+ varFullName +" not defined in the query, the query can not be created",
			"isBlocking" : true
		});
		return "";
	} else {
		// if alias is given use it
		if(typeof alias !== "undefined" && alias != null){
			return alias;
		} else {
			
			if(typeof variableNamesTable[classID] !== "undefined" && typeof variableNamesTable[classID][varName.replace(/-/g, '_').replace(/ /g, '')] !== "undefined" && typeof variableNamesTable[classID][varName.replace(/-/g, '_').replace(/ /g, '')][fieldId] !== "undefined" ){
				//is simbol table has variable, wiht kind ALIAS and ather class context
				if(typeof classSimbolTable[varFullName] !== "undefined"){
					for(let st = 0; st < classSimbolTable[varFullName].length; st++){
						if(typeof classSimbolTable[varFullName][st] === "object"){
							if(classSimbolTable[varFullName][st]["kind"].indexOf("ALIAS") !== -1 && classSimbolTable[varFullName][st]["context"] != classID && variableNamesTable[classID][varName.replace(/-/g, '_').replace(/ /g, '')][fieldId]["isPath"] != true){
								messages.push({
									"type" : "Error",
									"message" : "The used name "+varFullName+" can denote either an existing name (variable), or a new attribute (property). Use @"+varFullName+" to refer to the already existing name, or {prefix}:"+varFullName+" to introduce a new attribute (property)",
									"isBlocking" : true
								});
								return "";
							}
						}
					}
				}
				//if variableNamesTable has property with given field id, use it
				return variableNamesTable[classID][varName.replace(/-/g, '_').replace(/ /g, '')][fieldId]["name"];
			} else {
				// if variable is not in a simbol table, make new name 
				if(variableData["kind"] == "PROPERTY_NAME" && typeof classSimbolTable[varFullName] === "undefined"){
					
					//variableNamesCounter has no name
					if(varName.indexOf("[") !== -1 && varName.indexOf("]") !== -1){
						var attributeName = varName;
						if(attributeName.indexOf(":") !== -1) attributeName = attributeName.substring(attributeName.indexOf(":")+1)

						if(attributeName.startsWith("[") && attributeName.endsWith("]")){
							var textPart = attributeName.substring(1);
							if(textPart.indexOf("(") !== -1) textPart = textPart.substring(0, textPart.indexOf("("));
							else textPart = textPart.substring(0, textPart.length - 1);
							textPart = textPart.trim();
							var t = textPart.match(/([\s]+)/g);
								
							if(t == null || t.length <3 ){
								textPart = textPart.replace(/([\s]+)/g, "_").replace(/([\s]+)/g, "_").replace(/[^0-9a-z_]/gi, '');
							} else textPart = attributeName.substring(attributeName.indexOf("(")+1 , attributeName.indexOf(")"));
							
							attributeName = textPart
						}
						varName = attributeName.replace(/-/g, '_');
					}
					if(varName.indexOf(":") !== -1) varName = varName.substring(varName.indexOf(":")+1);

					if(typeof variableNamesTable[classID] === "undefined") variableNamesTable[classID] = [];
					if(typeof variableNamesCounter[varName] === "undefined"){
							//generate new
							variableNamesTable[classID][varFullName] = [];
							variableNamesTable[classID][varFullName][fieldId] = {name:varName, order:-1};
							variableNamesCounter[varName] = 1;

							return varName;
					} else {
							//variableNamesCounter has name
							//use counter
							if(typeof variableNamesTable[classID] === "undefined") variableNamesTable[classID] = [];
							if(typeof variableNamesTable[classID][varFullName]=== "undefined") variableNamesTable[classID][varFullName] = [];
							var newName = varName+ "_" + variableNamesCounter[varName];
							variableNamesTable[classID][varFullName][fieldId] = {name:newName, order:-1};
							variableNamesCounter[varName] = variableNamesCounter[varName] + 1;

							return newName;
					}	
				} else {
					var referenceDefinitions = findReferenceDefinitions(variableNamesTable[classID], varName, false);
					// if(Object.keys(referenceDefinitions).length == 0){
						
					// } else 
					if(variableData["kind"].indexOf("CLASS") == -1) {
						var newName = getReferenceName(varFullName, symbolTable[classID], classID)

						return newName
					}
				} 
			}
		}
	}
	
	return setVariableName2(varName, alias, variableData, generateNewName);
	
	return null;
}

// set unique variable name
// varName - given variable
// alias - given variable alias
function setVariableName2(varName, alias, variableData, generateNewName){
	
	// console.log("variableNamesTable, variableNamesCounter", varName, alias, variableData, generateNewName, symbolTable, variableNamesTable, variableNamesCounter)
	
	var reserverNames = ["constructor", "length", "prototype"];
	if(reserverNames.indexOf(varName) != -1) varName = varName + " ";
	if(reserverNames.indexOf(alias) != -1) alias = alias + " ";
	
	var isPropertyFromSubQuery = null;
	var isOwnProperty = false;
	var variableDataName = variableData["name"];
	if(typeof symbolTable[classID] !== 'undefined' && typeof symbolTable[classID][varName] !== 'undefined'){
		// if more then one usage of name
		if( symbolTable[classID][varName].length > 1){
			var parentTypeIsNull = false;
			var isNotJoinedClass = false;
			var definedInJoinClass = null;
			for(var key in symbolTable[classID][varName]){
				// if data kind is undefined and in symbol table kind is CLASS_ALIAS, set it to data kind
				if(typeof variableData["kind"] == "undefined" && symbolTable[classID][varName][key]["kind"] == "CLASS_ALIAS") variableData["kind"]  = "CLASS_ALIAS";
				
				// if name is used in another class, and parentType is known, then is not joined classes
				if(symbolTable[classID][varName][key]["context"] != classID && typeof symbolTable[classID][varName][key]["type"] !== 'undefined' 
				&& symbolTable[classID][varName][key]["type"] != null && symbolTable[classID][varName][key]["type"]["parentType"] != null) isNotJoinedClass = true;
				
				// if parrent type is not defined
				if(typeof symbolTable[classID][varName][key]["type"] !== 'undefined' && symbolTable[classID][varName][key]["type"] != null && symbolTable[classID][varName][key]["type"]["parentType"] == null) {
					parentTypeIsNull = true;
				}
				if(typeof symbolTable[classID][varName][key]["type"] !== 'undefined' 
				&& symbolTable[classID][varName][key]["context"] != classID
				&& typeof symbolTable[classID][varName][key]["upBySubQuery"] === 'undefined') {
					// class where name is also defined in the same scope
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
			// is used in the given class, and parent type is known
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
	
	var varNameRep = varName.replace(/-/g, '_').replace(/ /g, '');
	// if alias is given
	if(alias != null) {
	 // console.log("1111", varName, alias, parseType);
		var aliasSet = false;
		/*for(var key in idTable){
			if (idTable[key] == alias) {
				var classes = [];
				if(typeof variableNamesAll[alias] !== 'undefined' && typeof variableNamesAll[alias]["classes"] !== 'undefined') classes = variableNamesAll[alias]["classes"];
				
				var aliasTable = {};
				aliasTable[alias] = alias + "_" +count;
				
				classes[classID] = aliasTable;
				variableNamesAll[alias] = {"alias" : alias + "_" +counter, "nameIsTaken" : true, "counter" : counter, "isVar" : true, "classes": classes};
				aliasSet = true;
				break;
			}
		}*/
		if (aliasSet == false) {
			var classes = [];
			if(typeof variableNamesAll[alias] !== 'undefined' && typeof variableNamesAll[alias]["classes"] !== 'undefined') classes = variableNamesAll[alias]["classes"];
			
			var aliasTable = {};
				aliasTable[alias] = alias;
			
			classes[classID] = aliasTable;
			variableNamesAll[alias] = {"alias" : alias, "nameIsTaken" : true, "counter" : 0, "isVar" : true, "classes": classes};
		}
		
		return variableNamesAll[alias]["alias"];
	}
	//if symbol table has variable from one level subquery and given class does not have property, then use the sub query property name
	else if(isPropertyFromSubQuery != null && !isOwnProperty && typeof attributesNames[varName] != 'undefined'){
		return attributesNames[varName]["classes"][isPropertyFromSubQuery]["name"];
	}
	// if is PROPERTY_NAME or
	// kind is undefined or
	
	else if(variableData["kind"] == "PROPERTY_NAME" || typeof variableData["kind"] === 'undefined' || (variableData["kind"] == "UNRESOLVED_FIELD_ALIAS" && typeof variableData["type"] !== 'undefined' && variableData["type"] != null && variableData["type"]["is_local"] == true )){
		 // console.log("2222", varName);
		//Aply exists to filter if variable is not defined
		if(typeof variableNamesClass[varName] === 'undefined' || (typeof variableNamesClass[varName] !== 'undefined' && (variableNamesClass[varName]["isVar"] != true ||
			variableData["type"] != null && false)))applyExistsToFilter = true;

		if(generateNewName != null && generateNewName == true ){
			 // console.log("2aaaa", varName);
			if(typeof expressionLevelNames[varName] === 'undefined'){
				if(typeof variableNamesClass[varName]=== 'undefined'){
					if(typeof variableNamesAll[varName]=== 'undefined'){
						 // console.log("1111")

						var aliasTable = {};
						aliasTable[variableDataName] = varNameRep;
						
						expressionLevelNames[varName] = aliasTable;
						variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : true, "counter" : 0, "isVar" : false};
						
						var classes = [];
						if(typeof variableNamesAll[varName] !== 'undefined' && typeof variableNamesAll[varName]["classes"] !== 'undefined') classes = variableNamesAll[varName]["classes"];
						classes[classID] = aliasTable;
			
						variableNamesAll[varName] = {"alias" : varNameRep, "nameIsTaken" : true, "counter" : 0, "isVar" : false, "classes":classes};
					} else {
						  // console.log("2222", attributesNames[varName]["classes"][classID]["name"])
						var count = variableNamesAll[varName]["counter"] + 1;
						
						var aliasTable = {};
						aliasTable[variableDataName] = varNameRep + "_" +count;
						
						expressionLevelNames[varName] = aliasTable;
						variableNamesAll[varName]["counter"] = count;
						
						var classes = [];
						if(typeof variableNamesAll[varName] !== 'undefined' && typeof variableNamesAll[varName]["classes"] !== 'undefined') classes = variableNamesAll[varName]["classes"];
						classes[classID] = aliasTable;
						variableNamesAll[varName]["classes"] = classes;
						
						variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : variableNamesAll[varName]["nameIsTaken"], "counter" : count, "isVar" : variableNamesAll[varName]["isVar"]};
					}
				} else {
					  // console.log("3333", attributesNames[varName]["classes"][classID]["name"])
					var count = variableNamesClass[varName]["counter"] + 1;
					
					var aliasTable = {};
					aliasTable[variableDataName] = varNameRep + "_" +count;
					expressionLevelNames[varName] = aliasTable;
					variableNamesClass[varName]["counter"] = count;
					
					var classes = [];
					if(typeof variableNamesAll[varName] !== 'undefined' && typeof variableNamesAll[varName]["classes"] !== 'undefined') classes = variableNamesAll[varName]["classes"];
					classes[classID] = aliasTable;
					
					variableNamesAll[varName] = {"alias" : varNameRep + "_" +count, "nameIsTaken" : variableNamesClass[varName]["nameIsTaken"], "counter" : count, "isVar" : variableNamesClass[varName]["isVar"], "classes":classes};
				}
			}else{
				return expressionLevelNames[varName][variableDataName];
			}
		}else{
			   // console.log("2cccc", varName, isSimpleVariableForNameDef);
			//if not used in given expression
			if(typeof expressionLevelNames[varName] === 'undefined' || typeof expressionLevelNames[varName] === 'function' || typeof expressionLevelNames[varName][variableDataName] === "undefined"){
				  // console.log("2c 1", varName, variableNamesClass, typeof variableNamesClass[varName], variableNamesClass["length"]);
				//if not used in class scope
				if(typeof variableNamesClass[varName] === 'undefined'|| typeof variableNamesClass[varName] === 'function'){
					  // console.log("2c 11", varName);
					//if not used in query scope
					if(typeof variableNamesAll[varName]=== 'undefined' || typeof variableNamesAll[varName]=== 'function'){
						//not used at all
						  // console.log("2c 111", varName, parseType);
						//if simple variable
						if(isSimpleVariableForNameDef == true){
							  // console.log("4444", varName, attributesNames[varName], symbolTable[classID][varName])
							var count = 0;
							if(typeof  attributesNames[varName] !== 'undefined'){
								  // console.log("4a", classID, varName, attributesNames, typeof(attributesNames[varName]));
								if(typeof attributesNames[varName] !== "function" && typeof attributesNames[varName]["classes"][classID] !== 'undefined')varNameRep = attributesNames[varName]["classes"][classID]["name"].replace(/-/g, '_');
								count = attributesNames[varName]["counter"];
							}
							
							var nameIsTaken = true;
							
							var tempIsVar = false;
							if(parseType == "attribute" || parseType == "class") tempIsVar = true;
							
							var aliasTable = {};
							aliasTable[variableDataName] = varNameRep;
							
							variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : nameIsTaken, "counter" : count, "isVar" : tempIsVar};
						} else {
							  // console.log("5555", attributesNames[varName])
							var count = 0;
							if(typeof  attributesNames[varName] !== 'undefined'){
								count = attributesNames[varName]["counter"];
							}
							count = count+1;
							var aliasTable = {};
							aliasTable[variableDataName] = varNameRep+"_"+count;
							variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : false, "counter" : count, "isVar" : false};
						}
						 
						expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					
					//is used in query, but not in a given class (somewhere else)
					} else {
						   // console.log("2c 112", varName);
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
								var aliasTable = {};
								aliasTable[variableDataName] = varNameRep;
								variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
							//name is taken
							} else {
								
								var count = variableNamesAll[varName]["counter"] + 1;
								var varN = varNameRep+"_"+count;
								if(typeof  attributesNames[varName] !== 'undefined'){
									if(typeof attributesNames[varName]["classes"][classID] !== 'undefined')varN = attributesNames[varName]["classes"][classID]["name"];
									count = attributesNames[varName]["counter"];
								}
								if(count<variableNamesAll[varName]["counter"])count = variableNamesAll[varName]["counter"];
								var aliasTable = {};
								aliasTable[variableDataName] = varN;
								variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
								
								var classes = [];
								if(typeof variableNamesAll[varName] !== 'undefined' && typeof variableNamesAll[varName]["classes"] !== 'undefined') classes = variableNamesAll[varName]["classes"];
								classes[classID] = aliasTable;
								
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
							var aliasTable = {};
							aliasTable[variableDataName] =  varNameRep+"_"+count;
							variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : variableNamesAll[varName]["nameIsTaken"], "counter" : count, "isVar" : false};
						}
						expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					}
					return variableNamesClass[varName]["alias"][variableDataName];
				//is used in a given class
				}else{
					   // console.log("2c 12", varName);
					//if simple variable
					if(isSimpleVariableForNameDef == true){
						   // console.log("2c 121", varName);
						var tempIsVar = false;
						if(parseType == "attribute"|| parseType == "class") tempIsVar = true;
						
						//name is not taken
						if(variableNamesClass[varName]["nameIsTaken"] != true){
							// console.log("2c 1211", varName);
							var count = 0;
							if(typeof  attributesNames[varName] !== 'undefined'){
								
								if(typeof attributesNames[varName] !== "function" && typeof attributesNames[varName]["classes"][classID] !== 'undefined')varNameRep = attributesNames[varName]["classes"][classID]["name"];
								count = attributesNames[varName]["counter"];
							}
							if(count<variableNamesClass[varName]["counter"])count = variableNamesClass[varName]["counter"]
							
							var aliasTable = {};
							aliasTable[variableDataName] =  varNameRep;
							
							variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : true, "counter" : variableNamesClass[varName]["counter"], "isVar" : tempIsVar};
						//name is taken
						} else {
							// console.log("2c 1212", varName);
							
							//if name is not defined as variable
							if(variableNamesClass[varName]["isVar"] != true) {
								var count = variableNamesClass[varName]["counter"];
								if(typeof  attributesNames[varName] !== 'undefined'){
									count = attributesNames[varName]["counter"];
								}
								if(count<variableNamesClass[varName]["counter"])count = variableNamesClass[varName]["counter"];
								count = count + 1;
								
								var aliasTable = {};
								aliasTable[variableDataName] =  varNameRep+"_"+count;
								
								variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
							}
							
							if(typeof variableNamesClass[varName]["alias"][variableDataName] === "undefined"){
								// console.log("2c 12121", varName);
								var count = variableNamesClass[varName]["counter"];
								if(typeof  attributesNames[varName] !== 'undefined'){
									count = attributesNames[varName]["counter"];
								}
								if(count<variableNamesClass[varName]["counter"])count = variableNamesClass[varName]["counter"];
								count = count + 1;
								
								var aliasTable = {};
								aliasTable[variableDataName] =  varNameRep+"_"+count;
								
								variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : true, "counter" : count, "isVar" : tempIsVar};
							}
						}

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
							var aliasTable = {};
							aliasTable[variableDataName] =  varNameRep+"_"+count;
							variableNamesClass[varName] = {"alias" : aliasTable, "nameIsTaken" : false, "counter" : count, "isVar" : false};
						//name is taken
						} 
					}
					
					expressionLevelNames[varName] = variableNamesClass[varName]["alias"];
					return variableNamesClass[varName]["alias"][variableDataName];
				}
			//used in given expression
			} else {
				return expressionLevelNames[varName][variableDataName];
			}
		}
		return expressionLevelNames[varName][variableDataName];
	} else {
		// console.log("3333", varName);
		return varName;
	}
}

function getPathFullGrammar(expressionTable){
	
	var prTable = [];
	var path = "";
	var variable;
	// var isPath = true;
	var isPath = null;
	var mes = [];
	var cardinality = 1;

	for(let key in expressionTable){
		var visited = 0;
		
		//PathPrimary
		//iriOra
		if((key == "PathPrimary" || key == "iriOra") && typeof expressionTable[key]["var"] !== 'undefined'){
			
			if(typeof expressionTable[key]["var"]["type"] !== 'undefined' && expressionTable[key]["var"]["type"] != null){	
					
				if(expressionTable[key]["var"]["type"]["object_cnt"]) {isPath = true;}
				
				if(expressionTable[key]["var"]["type"]["max_cardinality"] != 1) {cardinality = -1;}
				
				var pathPart =  getPrefix(expressionTable[key]["var"]["type"]["prefix"]) + ":" + expressionTable[key]["var"]["name"];

				if(expressionTable[key]["var"]["name"].indexOf("[") != -1 && typeof expressionTable[key]["var"]["type"] !== "undefined")pathPart =  getPrefix(expressionTable[key]["var"]["type"]["prefix"]) + ":" + expressionTable[key]["var"]["type"]["local_name"];
				if(expressionTable[key]["var"]["name"].indexOf("/") !== -1) pathPart = "<" + expressionTable[key]["var"]["type"]["iri"] +">";
				path = path + pathPart;
				
				//console.log("p1", pathPart)
				
				prTable[getPrefix(expressionTable[key]["var"]["type"]["prefix"])+":"] = "<"+knownNamespaces[getPrefix(expressionTable[key]["var"]["type"]["prefix"])+":"]+">";
				
				variable = expressionTable[key];
			
				visited = 1;
			}else {
				cardinality = -1;
				isPath = false;
			}
		}
		//IRIREF
		if(key == "IRIREF"){
			path = path + expressionTable[key];
			//console.log("p2", expressionTable[key])
		}
		//PrefixedName
		if(key == "PrefixedName"){
			if(typeof expressionTable[key]["var"]["type"] !== 'undefined' && expressionTable[key]["var"]["type"] != null){	
				if(expressionTable[key]["var"]["type"]["max_cardinality"] != 1) {cardinality = -1;}
				if(typeof expressionTable[key]["var"]["type"]["parentType"] !== 'undefined' && expressionTable[key]["var"]["type"]["parentType"] != null) isPath = false;
				else if(expressionTable[key]["var"]["type"]["object_cnt"] > 0 ){isPath = true;}
				
				var pathPart =  getPrefix(expressionTable[key]["var"]["type"]["prefix"]) + ":" + expressionTable[key]["var"]["name"];
				if(expressionTable[key]["var"]["name"].startsWith(getPrefix(expressionTable[key]["var"]["type"]["prefix"]) + ":")) pathPart = expressionTable[key]["var"]["name"]
				
				if(expressionTable[key]["var"]["name"].indexOf("[") != -1 && typeof expressionTable[key]["var"]["type"] !== "undefined")pathPart =  getPrefix(expressionTable[key]["var"]["type"]["prefix"]) + ":" + expressionTable[key]["var"]["type"]["local_name"];
				if(expressionTable[key]["var"]["name"].indexOf("/") !== -1) pathPart = "<" + expressionTable[key]["var"]["type"]["iri"] +">";
				path = path + pathPart;
				// console.log("p3", pathPart, expressionTable[key])

				var namespace = expressionTable[key]["var"]["type"]["Namespace"]
				if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
				
				prTable[getPrefix(expressionTable[key]["var"]["type"]["prefix"]) + ":"] = "<"+knownNamespaces[getPrefix(expressionTable[key]["var"]["type"]["prefix"])+":"]+">"
				variable = expressionTable[key];
				visited = 1;
			} else {
				cardinality = -1;
				if(typeof expressionTable[key]["Prefix"] !== 'undefined'){
					path = path + expressionTable[key]["Prefix"] + expressionTable[key]["var"]["name"];
					//console.log("p4", expressionTable[key]["Prefix"] + expressionTable[key]["var"]["name"])
					if(expressionTable[key]["var"]["name"].indexOf("/") !== -1) pathPart = "<" + expressionTable[key]["var"]["type"]["iri"] +">";
					if(knownNamespaces[expressionTable[key]["Prefix"]] != null){prTable[expressionTable[key]["Prefix"]] = "<"+ knownNamespaces[expressionTable[key]["Prefix"]]+">";}
					visited = 1;
					variable = expressionTable[key];
					mes.push({
						"type" : "Error",
						"message" : "Undefined property '" +  path +"' can't be used in navigation expression",
						"isBlocking" : false
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
			if(key == "inv" && expressionTable[key] != null && expressionTable[key] != "") {cardinality = -1;}
			if( expressionTable[key] != null)path = path + expressionTable[key];
			//console.log("p5", path)
		}
		
		if(expressionTable[key] == ")" || expressionTable[key] == "(" || expressionTable[key] == "!" || expressionTable[key] == "a") path = path + expressionTable[key];          
		//console.log("p6", path)
		
		if(visited == 0 && typeof expressionTable[key] == 'object'){
			var temp = getPathFullGrammar(expressionTable[key]);
			mes = mes.concat(temp["messages"]);
			if(temp["cardinality"] == -1) {cardinality = -1;}
			for(let prefix in temp["prefixTable"]){
				prTable[prefix] = temp["prefixTable"][prefix];
			}
			path = path + temp["path"];
			//console.log("p7", path)
			if(typeof temp["variable"] !== 'undefined') variable = temp["variable"];
			if(temp["isPath"] != null) isPath = temp["isPath"];
		}
	}
	
	return {path:path, prefixTable:prTable, variable:variable, isPath:isPath, messages:mes, cardinality:cardinality};
}

// transfort exists and not exists expressions
function transformExistsNotExists(expressionTable, alias, className){
	for(let key in expressionTable){

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

function transformIriForValues(expressionTable){
	for(let key in expressionTable){
		
		if(key == "iri"){
			expressionTable["iriValues"] = expressionTable[key];
			delete expressionTable[key];
		}
		
		if(key == "var"){
			expressionTable["varValues"] = expressionTable[key];
			delete expressionTable[key];
		}
		
		if(typeof expressionTable[key] == 'object'){
			transformIriForValues(expressionTable[key]);
		}
		
	}
	return expressionTable
}

function transformExistsOR(expressionTable, prefix, existsExpr, countOR, alias, className){	
	expressionTable[countOR]["ConditionalAndExpression"] = transformExistsAND(expressionTable[countOR]["ConditionalAndExpression"], prefix, existsExpr, 0, alias, className);
			
	for(let key in expressionTable[1]){
		if(typeof expressionTable[1][key][3] !== 'undefined') expressionTable[1][key] = transformExistsOR(expressionTable[1][key], prefix, existsExpr, 3, alias, className);
	}
	return expressionTable;
}

function generatePrefixedNameVariable(prefix, existsExpr, alias, pe){
	
	var variable, prefixedName, className;
			if(typeof pe["Reference"] !== 'undefined'){
					variable = setVariableName(pe["var"]["name"] + "_" + pe["Reference"]["name"], alias, pe["var"]);
					prefixedName = getPrefix(pe["var"]["type"]["prefix"])+":"+pe["var"]["name"];
					var namespace = pe["var"]["type"]["Namespace"];
					if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
					
					prefixTable[getPrefix(pe["var"]["type"]["prefix"]) + ":"] = "<"+knownNamespaces[getPrefix(pe["var"]["type"]["prefix"])+":"]+">";
					referenceTable.push("?"+pe["Reference"]["name"]);
					referenceCandidateTable.push(pe["Reference"]["name"]);
					className = pe["Reference"]["name"];
			}
			else if(typeof pe["PathProperty"] !== 'undefined'){

				var path = getPathFullGrammar(pe["PathProperty"]);

				if(path["messages"].length > 0) {
					prefixedName = null;
					messages = messages.concat(path["messages"]);
				}
				else{
					for(let prefix in path["prefixTable"]) { 
						if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
					}
					prefixedName = path["path"];
				}
				
				var aliasTable = {};
				aliasTable[path["variable"]["var"]["name"]] =  path["variable"]["var"]["name"] + "_" + counter;
				
				// variableNamesClass[path["variable"]["var"]["name"]] = {"alias" : aliasTable, "isvar" : false};
				// variableNamesAll[path["variable"]["var"]["name"]+ "_" + counter] = path["variable"]["var"]["name"];
				variable = setVariableName(path["variable"]["var"]["name"], alias, path["variable"]["var"]);
				// expressionLevelNames[path["variable"]["name"]] = variable;
				
			}else if(typeof pe["var"] !== 'undefined') {
				if(alias == null || alias == ""){
					var textPart = pe["var"]['type']['display_name'].substring(1);
					if(textPart.indexOf("(") !== -1) textPart = textPart.substring(0, textPart.indexOf("("));
					else textPart = textPart.substring(0, textPart.length - 1);
					textPart = textPart.trim();
					var t = textPart.match(/([\s]+)/g);
								
					if(t == null || t.length <3  || existsExpr == "NotExistsExpr" || existsExpr == "ExistsExpr"){
						alias = textPart.replace(/([\s]+)/g, "_").replace(/([\s]+)/g, "_").replace(/[^0-9a-z_]/gi, ''); 
					}
				}
				
				
				variable = setVariableName(pe["var"]["name"], alias, pe["var"], true);
				prefixedName = getPrefix(pe["var"]["type"]["prefix"])+":"+pe["var"]["type"]["local_name"];
				var namespace = pe["var"]["type"]["Namespace"];
				if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
				prefixTable[getPrefix(pe["var"]["type"]["prefix"]) + ":"] = "<"+knownNamespaces[getPrefix(pe["var"]["type"]["prefix"])+":"]+">";

			} else if(typeof pe["iri"] !== 'undefined' && typeof pe["ArgList"] === 'undefined'){
				variable = setVariableName(pe["iri"]["PrefixedName"]["Name"], alias, pe["iri"]["PrefixedName"]["var"], true);
				prefixedName = getPrefix(pe["iri"]["PrefixedName"]["Prefix"])+pe["iri"]["PrefixedName"]["Name"];
				var namespace = pe["iri"]["PrefixedName"]["var"]["type"]["Namespace"];
				if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
				prefixTable[getPrefix(pe["iri"]["PrefixedName"]["Prefix"])] = "<"+knownNamespaces[getPrefix(pe["iri"]["PrefixedName"]["Prefix"])]+">";
			}
	return {"variable":variable, "prefixedName":prefixedName, "className":className};
}

function transformExistsAND(expressionTable, prefix, existsExpr, count, alias, className){
	if(typeof expressionTable[count]["RelationalExpression"]["Relation"] !== 'undefined'){
		
		var tempAliasOrAttribute = findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["kind"];
			
		if(tempAliasOrAttribute.indexOf("_ALIAS") !== -1){
			referenceCandidateTable.push(findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")["name"]);
			if(tempAliasOrAttribute !== "CLASS_ALIAS")expressionTable[count][prefix + "Bound"] = {"var":findINExpressionTable(expressionTable[count]["RelationalExpression"]["NumericExpressionL"], "var")}
		
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
						// console.log("tripleTable 1", variable)
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
					// console.log("tripleTable 2", variable)
			expressionTable[count] =  {
				[existsExpr] : {
					"Triple" : tripleTable,
					"Filter" : {"RelationalExpression":expressionTable[count]["RelationalExpression"]}
				}
			} 
		}
	} else {

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
					// console.log("tripleTable 3", variable)
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
				// console.log("tripleTable 4", variable)	
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

	for(let key in expressionTable[1]){
		if(typeof expressionTable[1][key][3] !== 'undefined') expressionTable[1][key] = transformExistsAND(expressionTable[1][key], prefix, existsExpr, 3, alias, className);
	}
	return expressionTable
}

// transform a BETWEEN(1, 3) into a>=1 && a<=3
// transform a LIKE "%abc" into REGEX(a, "abc$")
function transformBetweenLike(expressionTable){
	for(let key in expressionTable){
		
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
		
		//BETWEEN
		if (key == "ConditionalAndExpression" &&
		typeof expressionTable[key][0]!== 'undefined' && expressionTable[key][0]["RelationalExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]!== 'undefined' &&
		typeof expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["FunctionBETWEEN"]!== 'undefined' &&
		expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["FunctionBETWEEN"]!= null 
		){	
			var temp = expressionTable[key][0];
			var pe = expressionTable[key][0]["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"];
			
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
                    "NumericExpressionR" : temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["FunctionBETWEEN"]["BetweenExpressionL"],
                    
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
                                  "NumericExpressionR": temp["RelationalExpression"]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["FunctionBETWEEN"]["BetweenExpressionR"],
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
			 var arg3 = null;
			
			 var regaxExpression = expressionTable[key]["FunctionLike"]["string"];
			  if(typeof regaxExpression !== "string"){
				  arg3 = expressionTable[key]["FunctionLike"]["case"];
				  regaxExpression = regaxExpression["string"];
			  }	 
			 
			 if (expressionTable[key]["FunctionLike"]["start"] == null)  regaxExpression = "^" + regaxExpression; 
			 if (expressionTable[key]["FunctionLike"]["end"] == null)  regaxExpression = regaxExpression + "$"; 
			 if(arg3 == null){
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
			} else {
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
                                                            	   "String":'"' + arg3  + '"'
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
                                 }
								 ]
                             }
			}
		}
		if (key == "PrimaryExpression" && 
			typeof expressionTable[key]["iri"]!== 'undefined' && 
			typeof expressionTable[key]["iri"]["PrefixedName"]!== 'undefined' && 
			typeof expressionTable[key]["iri"]["PrefixedName"]["FunctionLike"]!== 'undefined' && 
			expressionTable[key]["iri"]["PrefixedName"]["FunctionLike"] != null) {
			 
			 var t = expressionTable[key];
			 var regaxExpression = "";
			 var regaxExpression = expressionTable[key]["iri"]["PrefixedName"]["FunctionLike"]["string"];
			 if (expressionTable[key]["iri"]["PrefixedName"]["FunctionLike"]["start"] == null)  regaxExpression = "^" + regaxExpression; 
			 if (expressionTable[key]["iri"]["PrefixedName"]["FunctionLike"]["end"] == null)  regaxExpression = regaxExpression + "$"; 
			
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
	for(let ref in refTable){
		if(typeof refTable[ref] === 'object'){
			if(typeof refTable[ref]["optionaPlain"] !== 'undefined' && refTable[ref]["optionaPlain"] == true) isOptionalPlain = true;
			
			if(reference == ref){
				if(isOptionalPlain == true) return true;
			}else {
				var result  = false;
				for(let r in refTable[ref]["classes"]){
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
	for(let ref in refTable){
		if(typeof refTable[ref] === 'object'){
			if(typeof refTable[ref]["underUnion"] !== 'undefined' && refTable[ref]["underUnion"] == true) isUnderUnion = true;

			if(reference == ref){
				if(isUnderUnion == true) return true;
			}else {
				var result  = false;
				for(let r in refTable[ref]["classes"]){
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

function generateExpression(expressionTable, SPARQLstring, className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation){
		
	for(let key in expressionTable){
		var visited = 0;
		
		//REFERENCE
		if(key == "PrimaryExpression" && typeof expressionTable[key]["Reference"] !== 'undefined'){
			
			
			
			var underOptionalPlain = checkIfUnderOptionalPlain(expressionTable[key]["Reference"]["name"], classTable, false);
			var underUnion = checkIfUnderUnion(expressionTable[key]["Reference"]["name"], classTable, false)
			if(underOptionalPlain == false && underUnion == false){
				if(typeof  expressionTable[key]["ReferencePath"] !== "undefined"){
					var path = getPathFullGrammar(expressionTable[key]["ReferencePath"]);
					var variable = setVariableName(path["variable"]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"], alias, path["variable"]["var"])
					if(generateTriples == true && path["variable"]["var"]['type'] != null) {
						var inFilter = true;
						applyExistsToFilter = true;
						
						var variableData = path["variable"]["var"];
						// if(typeof variableNamesClass[path["variable"]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]] !== 'undefined' && ((variableNamesClass[path["variable"]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]]["isVar"] != true 
						// || variableData["type"] != null) && (typeof path["cardinality"] === 'undefined' || path["cardinality"] > 1 || path["cardinality"] == -1))) inFilter = true;
						// else 
						if((parseType == "condition") && path["cardinality"] == 1){
							inFilter = null;
							applyExistsToFilter = false;
						}
						// console.log("tripleTable 5", variable)
						tripleTable.push({"var":"?"+variable, "prefixedName":path["path"].substring(1), "object":expressionTable[key]["Reference"]["name"], "inFilter" : inFilter});
					}
					variableTable.push("?" + variable);
					SPARQLstring = SPARQLstring + "?" + variable;
					visited = 1;
					
					referenceTable.push("?"+expressionTable[key]["Reference"]["name"]);
					referenceCandidateTable.push(expressionTable[key]["Reference"]["name"]);

				}else{
					// var variable = setVariableName(expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"], alias, expressionTable[key]["var"])
					var variable = expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"];
					if(alias != null && alias != "") variable = alias;
					if(generateTriples == true && expressionTable[key]["var"]['type'] != null) {
						var inFilter = true;
						applyExistsToFilter = true;
						
						var variableData = expressionTable[key]["var"];
						
						// if(typeof variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]] !== 'undefined' && ((variableNamesClass[expressionTable[key]["var"]["name"] + "_" + expressionTable[key]["Reference"]["name"]]["isVar"] != true 
						// || variableData["type"] != null) && (typeof variableData["type"]["max_cardinality"] === 'undefined' || variableData["type"]["max_cardinality"] > 1 || variableData["type"]["max_cardinality"] == -1))) inFilter = true;
						// else 
						if((parseType == "condition") && variableData["type"]["max_cardinality"] == 1){
							inFilter = true;
							applyExistsToFilter = false;
						}
						// console.log("tripleTable 6", variable, inFilter, applyExistsToFilter)
						tripleTable.push({"var":"?"+variable, "prefixedName":expressionTable[key]["var"]["type"]["prefix"]+":"+expressionTable[key]["var"]["name"], "object":expressionTable[key]["Reference"]["name"], "inFilter" : inFilter});
					}
					variableTable.push("?" + variable);
					SPARQLstring = SPARQLstring + "?" + variable;
					visited = 1;
					
					referenceTable.push("?"+expressionTable[key]["Reference"]["name"]);
					referenceCandidateTable.push(expressionTable[key]["Reference"]["name"]);
				}
			} else {
				var clId;
				for(let k in idTable){
					if (idTable[k] == className) {
						clId = k;
						break;
					}
				}
				
				var messageText;
				if(underOptionalPlain == true) messageText = "Reference to instance '" + expressionTable[key]["Reference"]["name"] + "' from Optional-block not allowed in navigation expression '" + expressionTable[key]["Reference"]["name"] +"."+expressionTable[key]["var"]["name"] +"' outside the block.\nConsider making the Optional-block a subquery, or define an internal field '"+ expressionTable[key]["var"]["name"] + "' within the scope of '"+ expressionTable[key]["Reference"]["name"] +"'";
				else messageText = "Reference to instance '" + expressionTable[key]["Reference"]["name"] + "' from Union-block not allowed in navigation expression '" + expressionTable[key]["Reference"]["name"] +"."+expressionTable[key]["var"]["name"] +"' outside the block.'";
				
				messages.push({
					"type" : "Error",
					"message" : messageText,
					"isBlocking" : true
				});
				
				visited = 1;
			}
		}
		
		//PathFull
		if(key  == "PrimaryExpression" && typeof expressionTable[key]["PathProperty"] !== 'undefined'){
			var path = getPathFullGrammar(expressionTable[key]["PathProperty"]);

			if(path["isPath"] != true && parseType != "condition"){
				
				var clId;
					for(let k in idTable){
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

			for(let prefix in path["prefixTable"]) { 
				if(typeof path["prefixTable"][prefix] === 'string') prefixTable[prefix] = path["prefixTable"][prefix];
			}
			var prefixName = path["path"];

			var variableStructure = path["variable"];

			if(typeof variableStructure !== "undefined"){
				if(typeof variableStructure["SubstringExpression"] !== 'undefined'){
					var substringvar = variableStructure["var"];
					
					if(substringvar["type"] == null){
						var clId;
						for(let k in idTable){
							if (idTable[k] == className) {
								clId = k;
								break;
							}
						}
						messages.push({
							"type" : "Error",
							//"message" : "Unrecognized variable '" + substringvar["name"] + "'. Please specify variable.",
							"message" : "Used name (variable) '" + substringvar["name"] + "' not defined in the query, the query can not be created",
							"listOfElementId" : [clId],
							"isBlocking" : false
						});
					}
					else{
					
						var variable = setVariableName(substringvar["name"], alias, substringvar);
						variableTable.push("?" + variable);
						if(generateTriples == true && substringvar['type'] != null && path != null) {
							var inFilter = false;
							// if(typeof variableNamesClass[substringvar["name"]] !== 'undefined' && ((variableNamesClass[substringvar["name"]]["isVar"] != true 
							// || substringvar["type"] != null) && (typeof substringvar["type"]["max_cardinality"] === 'undefined' || substringvar["type"]["max_cardinality"] > 1 || substringvar["type"]["max_cardinality"] == -1))) inFilter = true;
								// else if((parseType == "condition") && substringvar["type"]["max_cardinality"] == 1){
								// inFilter = null;
								// applyExistsToFilter = false;
							// }
							
							if (typeof substringvar["type"]["max_cardinality"] === 'undefined' || substringvar["type"]["max_cardinality"] > 1 || substringvar["type"]["max_cardinality"] == -1) inFilter = true;
									else if((parseType == "condition") && substringvar["type"]["max_cardinality"] == 1 && path["cardinality"] == 1){
										inFilter = null;
										applyExistsToFilter = false;
									}
							
							var inv = "";
				
							if(typeof substringvar["INV"] !== 'undefined') inv = "^";
							// console.log("tripleTable 7", variable)
							tripleTable.push({"var":"?"+variable, "prefixedName":prefixName+ "/" + inv + getPrefix(substringvar["type"]["prefix"]) + ":" + substringvar["name"], "object":className, "inFilter":inFilter});
							var namespace = substringvar["type"]["Namespace"];
							if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
							prefixTable[getPrefix(substringvar["type"]["prefix"]) + ":"] = "<"+knownNamespaces[getPrefix(substringvar["type"]["prefix"])+":"]+">";
							generateTriples = false;
							SPARQLstring = SPARQLstring + generateExpression(variableStructure, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
							generateTriples = true;
						}
					}
				}else {
						if(variableStructure["var"]["type"] == null){
							var clId;
							for(let k in idTable){
								if (idTable[k] == className) {
									clId = k;
									break;
								}
							}
							messages.push({
								"type" : "Error",
								//"message" : "Unrecognized variable '" + variableStructure["var"]["name"] + "'. Please specify variable.",
								"message" : "Used name (variable) '" + variableStructure["var"]["name"] + "' not defined in the query, the query can not be created",
								"listOfElementId" : [clId],
								"isBlocking" : false
							});
						}

							var generateNewName = false;
							// if(path["isPath"] != true && parseType == "condition") {
							if(parseType == "condition") {
								generateNewName = true;
								applyExistsToFilter = true;
							}
							var variable = setVariableName(variableStructure["var"]["name"], alias, variableStructure["var"], generateNewName)
	
							variableTable.push("?" + variable);
							
							if(generateTriples == true && path != null) {
								var inFilter = false;
								var variableData = variableStructure["var"];
								
								if(variableStructure["var"]['type'] != null){

									// if(typeof expressionTable[key]["PrimaryExpression"] !== 'undefined' 
									// && typeof variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]] !== 'undefined' 
									// && ((variableNamesClass[expressionTable[key]["PrimaryExpression"]["var"]["name"]]["isVar"] != true	|| variableData["type"] != null) 
									// && (typeof variableData["type"]["max_cardinality"] === 'undefined' || variableData["type"]["max_cardinality"] > 1 || variableData["type"]["max_cardinality"] == -1))) inFilter = true;
									// else if((parseType == "condition") && variableData["type"]["max_cardinality"] == 1 && path["cardinality"] == 1){
										// inFilter = null;
										// applyExistsToFilter = false;
									// }
									// variableNamesTable
									if (typeof variableData["type"]["max_cardinality"] === 'undefined' || variableData["type"]["max_cardinality"] > 1 || variableData["type"]["max_cardinality"] == -1) inFilter = true;
									else if((parseType == "condition") && variableData["type"]["max_cardinality"] == 1 && path["cardinality"] == 1){
										inFilter = null;
										applyExistsToFilter = false;
									}
								}
								var inv = "";
								if(typeof variableStructure["var"]["INV"] !== 'undefined') inv = "^";
								if((path["isPath"] != true || path["cardinality"] != 1) && parseType == "condition") inFilter = true;
								// console.log("tripleTable 8", variable, path, variableStructure["var"]["name"], inFilter, applyExistsToFilter)
								tripleTable.push({"var":"?"+variable, "prefixedName":prefixName, "object":className, "inFilter":inFilter});
							}
							SPARQLstring = SPARQLstring + "?" + variable;
				}
			} else {
				var clId;
					for(let k in idTable){
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
				
				if(alias !== null && alias !== ""){
					if(isInternal !=true) SPARQLstring = SPARQLstring + "?"+variableNamesTable[classID][alias][fieldId]["name"] + " " + tempAlias;
					else SPARQLstring = SPARQLstring + "?"+variableNamesTable[classID][alias][fieldId]["name"];
					tripleTable.push({"var":"?"+alias, "prefixedName":"?"+vn, "object":className, "inFilter":false});
				}else {
					if(typeof variableNamesCounter[vn] === "undefined") {
						alias = tempAlias;
						variableNamesCounter[vn] = 1;	
						if(typeof variableNamesTable[classID] === "undefined") variableNamesTable[classID] = [];
						if(typeof variableNamesTable[classID][vn] === "undefined") variableNamesTable[classID][vn] = [];
						variableNamesTable[classID][vn][fieldId] = {name:vn, order:-1, exp:vn, isPath:false};
						
					} else {
						alias = tempAlias + variableNamesCounter[vn];
						alias = tempAlias + variableNamesCounter[vn];
						if(typeof variableNamesTable[classID] === "undefined") variableNamesTable[classID] = [];
						if(typeof variableNamesTable[classID][vn] === "undefined") variableNamesTable[classID][vn] = [];
						variableNamesTable[classID][vn][fieldId] = {name:vn + "_" + variableNamesCounter[vn], order:-1, exp:vn, isPath:false};
						variableNamesCounter[vn] = variableNamesCounter[vn] + 1;	
					}
				
					if(isInternal !=true) SPARQLstring = SPARQLstring + "?"+variableNamesTable[classID][vn][fieldId]["name"] + " " + tempAlias;
					else SPARQLstring = SPARQLstring + "?"+variableNamesTable[classID][vn][fieldId]["name"];

					tripleTable.push({"var":alias, "prefixedName":"?"+vn, "object":className, "inFilter":false});
				}
				// console.log("tripleTable 12", alias)
			} else {
				if(alias == "" || alias == null) tempAlias = varName+"_";
				else tempAlias = "?"+alias;
				if(isInternal !=true) SPARQLstring = SPARQLstring + varName + " " + tempAlias;
				else SPARQLstring = SPARQLstring + varName
				tripleTable.push({"var":tempAlias, "prefixedName":varName, "object":className, "inFilter":false});
				// console.log("tripleTable 13", tempAlias)
				var aliasTable = {};
				aliasTable[vn] =  tempAlias;
				
				// expressionLevelNames[varName.substr(1)] = aliasTable;
				
				// variableNamesClass[varName.substr(1)] = {"alias" : aliasTable, "nameIsTaken" : true, "counter" : 0, "isVar" : false};
				
				// var classes = [];
				// if(typeof variableNamesAll[varName.substr(1)] !== 'undefined' && typeof variableNamesAll[varName.substr(1)]["classes"] !== 'undefined') classes = variableNamesAll[varName.substr(1)]["classes"];
				// classes[classID]  = aliasTable;
				
				// variableNamesAll[varName.substr(1)] = {"alias" : tempAlias, "nameIsTaken" : variableNamesClass[varName.substr(1)]["nameIsTaken"], "counter" : 0, "isVar" : variableNamesClass[varName.substr(1)]["isVar"], "classes":classes};	
			}
			visited = 1;
		}
		
		if (key == "BrackettedExpression") {
			if(typeof expressionTable[key]["classExpr"] !== 'undefined') SPARQLstring = SPARQLstring +  generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
			else SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			visited = 1;
		}
		
		if (key == "NotExistsFunc" || key == "ExistsFunc") {
			generateTriples = false
			SPARQLstring = SPARQLstring + generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
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
				
				var bindExpr = className;
				if(className.indexOf(":") == -1)bindExpr = "?" + className;
				
				if(className != alias){
					tripleTable.push({"BIND":"BIND(" + bindExpr + " AS ?" + alias + ")"})
				}
			} else if(isAggregate == true && className.indexOf(":") != -1){
				SPARQLstring = SPARQLstring + className;
				variableTable.push( className);
			}else {
				SPARQLstring = SPARQLstring + "?" + className;
				variableTable.push("?" + className);
			}
		
			visited = 1;
		}
		
		if(key == "varValues") {
			if(typeof expressionTable[key]["type"] !== "undefined" && expressionTable[key]["type"] != null){
				SPARQLstring = SPARQLstring + expressionTable[key]["type"]["prefix"] + ":" + expressionTable[key]["type"]["local_name"];
			} else {
				SPARQLstring = SPARQLstring + expressionTable[key]["name"];
			}
		}
		if(key == "var") {	
			if(expressionTable[key]["ref"] != null){
				// isExpression = true;
				var referenceName = getReferenceName(expressionTable[key]["name"], symbolTable[classID], classID);
				if(referenceName != null) SPARQLstring = SPARQLstring + "?"+referenceName;
			} else {
			
				var varName
				
				
				if((alias == null || alias == "") && parseType != "condition" && expressionTable[key]["kind"] != "CLASS_ALIAS" && expressionTable[key]["kind"] != "PROPERTY_ALIAS" && 
				expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined' && expressionTable[key]['type']['display_name'] !== null 
				&& typeof expressionTable[key]['type']['display_name'] !== 'undefined' && expressionTable[key]['type']['display_name'].indexOf("[") !== -1){
					var textPart = expressionTable[key]['type']['display_name'].substring(1);
					if(textPart.indexOf("(") !== -1) textPart = textPart.substring(0, textPart.indexOf("("));
					else textPart = textPart.substring(0, textPart.length - 1);
					textPart = textPart.trim();
					var t = textPart.match(/([\s]+)/g);
					
					if(t == null || t.length <3 ){
						alias = textPart.replace(/([\s]+)/g, "_").replace(/([\s]+)/g, "_").replace(/[^0-9a-z_]/gi, '');
						// if(typeof variableNamesCounter[alias] !== "undefined"){
							// alias = alias + "_" +variableNamesCounter[alias];
							// variableNamesCounter[alias] = variableNamesCounter[alias]+1;
						// }
						// if(typeof variableNamesAll[expressionTable[key]['type']['local_name']] !== "undefined"){
							// alias = textPart.replace(/([\s]+)/g, "_").replace(/([\s]+)/g, "_").replace(/[^0-9a-z_]/gi, '') + "_"+variableNamesAll[expressionTable[key]['type']['local_name']]["counter"]; 
						// }
						// aliasInfo = {};
						// aliasInfo[expressionTable[key]['type']['display_name']] = alias
						
						// if(typeof variableNamesClass[expressionTable[key]['type']['local_name']] === "undefined"){
							// variableNamesClass[expressionTable[key]['type']['local_name']] = {
								// "alias": aliasInfo,
								// "counter": 0,
								// "isVar": false,
								// "nameIsTaken": true
							// }
							// applyExistsToFilter = true;
						// }
						
						// if class have not attribute, add it to filter
						if(typeof variableNamesTable[classID] === "undefined" || typeof variableNamesTable[classID][alias] === "undefined") {
							applyExistsToFilter = true;
						} else if(typeof variableNamesTable[classID] !== "undefined" && typeof variableNamesTable[classID][alias]!== "undefined" && typeof variableNamesTable[classID][alias][fieldId]!== "undefined"){
							alias = variableNamesTable[classID][alias][fieldId]["name"];
						} else {
							if(typeof variableNamesCounter[alias] !== "undefined"){
								alias = alias + "_" +variableNamesCounter[alias];
								variableNamesCounter[alias] = variableNamesCounter[alias]+1;
							}
						}
						varName = expressionTable[key]['type']['local_name'];
	
						// varName = expressionTable[key]['type']['local_name'];
					} else varName = expressionTable[key]['type']['local_name'];
				} else if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined' && expressionTable[key]['type']['display_name'] !== null && typeof expressionTable[key]['type']['display_name'] !== 'undefined' && typeof expressionTable[key]["kind"] !== 'undefined' && expressionTable[key]["kind"].indexOf("_ALIAS") === -1) varName = expressionTable[key]['type']['local_name'];
				else if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined' && expressionTable[key]['type']['display_name'] !== null && typeof expressionTable[key]['type']['display_name'] !== 'undefined' && typeof expressionTable[key]["kind"] !== 'undefined' && expressionTable[key]["kind"].indexOf("_ALIAS") === -1) varName = expressionTable[key]['type']['display_name'];
				else varName = expressionTable[key]["name"];
				
				if(varName.startsWith("[") && varName.endsWith("]")) varName = varName.substring(2, varName.length-2);
				
				if(expressionTable[key]['kind'] !== null){
						
					var pathMod = "";
					if(typeof expressionTable[key]['PathMod'] !== 'undefined' && expressionTable[key]['PathMod'] != null) pathMod = expressionTable[key]['PathMod'];
					
					var generateTriplesTemp = generateTriples;
					var variableToUse = null;

					// if variable from other class
					if(expressionTable[key]['kind'] == "PROPERTY_NAME" || expressionTable[key]["ref"] != null){
						var classHasProperty = false;
						
						if(typeof symbolTable[classID] !== "undefined"){
							var st = symbolTable[classID][varName];
							if(typeof st !== "undefined"){
								for(let symbol = 0; symbol < st.length; symbol++){
									if(typeof st[symbol]["type"] !== 'undefined' && st[symbol]["type"] != null && 
									typeof st[symbol]["type"]["parentType"] !== "undefined" && st[symbol]["type"]["parentType"] != null &&
									st[symbol]["type"]["parentType"]["short_name"] != classSchemaName
									){
										generateTriples = false;
										variableToUse = st[symbol]["type"]["short_name"];
									} else if (typeof st[symbol]["type"] !== 'undefined' && st[symbol]["type"] != null && 
									typeof st[symbol]["type"]["parentType"] !== "undefined" && st[symbol]["type"]["parentType"] != null &&
									st[symbol]["type"]["parentType"]["short_name"] == classSchemaName){
										classHasProperty = true;
									} else if(expressionTable[key]["ref"] != null){
										generateTriples = false;
										variableToUse = varName;
									}
								}
							}
						}
						
						if(classHasProperty == true) {
							generateTriples = generateTriplesTemp;
							variableToUse = null;
						}
					}
					var variable;
								
					if(variableToUse == null && expressionTable[key]["ref"] == null) {
						variable = setVariableName(varName, alias, expressionTable[key]);
					}
					else variable = variableToUse;
					
					

					if(variable == null) variable = variableToUse;
					
					if(parseType == "condition" && expressionTable[key]['kind'] == "CLASS_NAME") {
						variable = expressionTable[key]['type']["prefix"] + ":" + expressionTable[key]['type']["local_name"];
						SPARQLstring = SPARQLstring + variable;		
					} else {
						variable = variable.replace("/", "_")
						SPARQLstring = SPARQLstring + "?" + variable;
						variableTable.push("?" + variable);	
					}			
					
					if(generateTriples == true && expressionTable[key]['type'] != null && className != "[ ]" && className != "[ + ]") {
						if(expressionTable[key]['kind'] == "CLASS_ALIAS") referenceCandidateTable.push(varName);
						if(expressionTable[key]['kind'] == "CLASS_NAME") {
							var inFilter = true;
							// if(typeof variableNamesClass[varName] !== 'undefined' && variableNamesClass[varName]["isVar"] != true) inFilter = true;

							if(isSimpleVariable == true) {
								if(parseType == "class"){
									if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined' && expressionTable[key]['type']['display_name'] !== null && typeof expressionTable[key]['type']['display_name'] !== 'undefined' && typeof expressionTable[key]["kind"] !== 'undefined' && expressionTable[key]["kind"].indexOf("_ALIAS") === -1 && expressionTable[key]['type']['display_name'] !== expressionTable[key]['type']['local_name']) varName = expressionTable[key]['type']['local_name']
									var tripleVar = getPrefix(expressionTable[key]["type"]["prefix"])+":"+varName
									if(varName.indexOf("/") !== -1 && expressionTable[key]['type'] != null && expressionTable[key]['type']["iri"] != null) tripleVar = "<" + expressionTable[key]['type']["iri"] + ">"
									tripleTable.push({"var": tripleVar, "prefixedName" : classMembership, "object":className, "inFilter":inFilter});
									// console.log("tripleTable 14", expressionTable[key]['type'], variable, className, getPrefix(expressionTable[key]["type"]["prefix"])+":"+varName)
									prefixTable[getPrefix(expressionTable[key]["type"]["prefix"])+":"] = "<"+knownNamespaces[getPrefix(expressionTable[key]["type"]["prefix"])+":"]+">";
								}
							}else {
								tripleTable.push({"var": getPrefix(expressionTable[key]["type"]["prefix"])+":"+varName, "prefixedName" : classMembership, "object":variable, "inFilter":inFilter});	
								// console.log("tripleTable 15", variable)
							}
		
						}
						else if(expressionTable[key]['kind'] == "CLASS_ALIAS" && isSimpleVariable == true && variable != varName){
							tripleTable.push({"BIND":"BIND(?" + varName + " AS ?" + variable + ")"})
						}else if(expressionTable[key]['kind'] == "CLASS_ALIAS" && alias == null || expressionTable[key]['kind'] == "PROPERTY_ALIAS") {
							
						} else {
							var inFilter = false;
							var variableData = expressionTable[key];
							
							/*if(typeof variableNamesClass[varName] !== 'undefined' 
							&& (
								(variableNamesClass[varName]["isVar"] != true || variableData["type"] != null) 
								&& (typeof variableData["type"]["max_cardinality"] === 'undefined' || variableData["type"]["max_cardinality"] > 1 || variableData["type"]["max_cardinality"] == -1)
							)) inFilter = true;
							else if((parseType == "condition") && variableData["type"]["max_cardinality"] == 1){
								inFilter = null;
								applyExistsToFilter = false;
								if(typeof symbolTable[classID] !== 'undefined' && typeof symbolTable[classID][varName] !== 'undefined') inFilter = true;
							}*/
							
							// triple should be in a filter if, vnt has no record of these triple and max cardinality is not 1
							
							if((typeof variableNamesTable[classID] === 'undefined' || typeof variableNamesTable[classID][varName] === "undefined" || (typeof variableNamesTable[classID][varName][fieldId] !== 'undefined' && variableNamesTable[classID][varName][fieldId]["order"] == -1))
							//&& typeof variableNamesTable[classID][varName][fieldId] !== 'undefined'
							&& (typeof variableData["type"]["max_cardinality"] === 'undefined' || variableData["type"]["max_cardinality"] > 1 || variableData["type"]["max_cardinality"] == -1)
							){
								inFilter = true;
								applyExistsToFilter = true;
							}else if((parseType == "condition") && variableData["type"]["max_cardinality"] == 1){
								inFilter = null;
								applyExistsToFilter = false;
								if(typeof symbolTable[classID] !== 'undefined' && typeof symbolTable[classID][varName] !== 'undefined') inFilter = true;
							}
							
							var inv = "";
							if(typeof expressionTable[key]["INV"] !== 'undefined') inv = "^";
							
							var isPropertyFromSubQuery = false;
							var isOwnProperty = false;
							var isReference = false;
							if(typeof symbolTable[classID] !== 'undefined' && typeof symbolTable[classID][varName] !== 'undefined'){
								for(let k = 0; k < symbolTable[classID][varName].length; k++){
									if(typeof symbolTable[classID][varName][k]["upBySubQuery"] !== 'undefined' && symbolTable[classID][varName][k]["upBySubQuery"] == 1) {
										isPropertyFromSubQuery = true;
									}
									if(symbolTable[classID][varName][k]["context"] == classID 
									&& typeof symbolTable[classID][varName][k]["type"] !== "undefined" && symbolTable[classID][varName][k]["type"] != null 
									&& symbolTable[classID][varName][k]["type"]["parentType"] != null){
										isOwnProperty = true;
									}
									if(symbolTable[classID][varName][k]["context"] != classID && (alias == null || alias == "") && typeof variableNamesTable[classID][varName] === "undefined") isReference = true;
								}
							}
	
							if(((isPropertyFromSubQuery == false || isOwnProperty == true) && isReference != true) && variableData["kind"] !== "BIND_ALIASS") {
								var prefixedName = getPrefix(expressionTable[key]["type"]["prefix"])+":"+varName;
								if(varName.indexOf("/") !== -1) prefixedName = "<"+expressionTable[key]["type"]["iri"]+">";
								tripleTable.push({"var":"?"+variable, "prefixedName":inv + prefixedName + pathMod, "object":className, "inFilter":inFilter});
								// console.log("tripleTable 16", isReference, isPropertyFromSubQuery, isOwnProperty, variable, applyExistsToFilter, {"var":"?"+variable, "prefixedName":inv + prefixedName + pathMod, "object":className, "inFilter":inFilter})
							}
							var namespace = expressionTable[key]["type"]["Namespace"];
							if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
							
							if(typeof expressionTable[key]["type"]["prefix"] !== "undefined") prefixTable[getPrefix(expressionTable[key]["type"]["prefix"])+":"] = "<"+knownNamespaces[getPrefix(expressionTable[key]["type"]["prefix"])+":"]+">";
							
						}
						if(expressionTable[key]['kind'] == "CLASS_ALIAS" || expressionTable[key]['kind'] == "PROPERTY_ALIAS") referenceTable.push("?"+variable)
					}
					generateTriples = generateTriplesTemp;
				// } else if (typeof variableNamesAll[expressionTable[key]["name"]] !== 'undefined'){
					// SPARQLstring = SPARQLstring + "?" + expressionTable[key]["name"];
					// variableTable.push("?" + expressionTable[key]["name"]);
					
				} else if (expressionTable[key]["name"].toLowerCase() == 'type'){
					
					
					
					var name = alias;
					if(name == null || name == "") name = expressionTable[key]["name"];
					
					tripleTable.push({"var":"?"+name, "prefixedName":"rdf:type", "object":className, "inFilter" : true});
					// console.log("tripleTable 17", variable)
					SPARQLstring = SPARQLstring + "?" + name;
					variableTable.push("?" + name);
					prefixTable["rdf:"] = "<"+knownNamespaces["rdf:"]+">";
				}else{
					var clId;
					for(let k in idTable){
						if (idTable[k] == className) {
							clId = k;
							break;
						}
					}
						
					messages.push({
						"type" : "Error",
						//"message" : "Unrecognized variable '" + varName + "'. Please specify variable.",
						"message" : "Used name (variable) '" + varName + "' not defined in the query, the query can not be created",
						"listOfElementId" : [clId],
						"isBlocking" : false
					});
					
					
					
					SPARQLstring = SPARQLstring + "?" + varName;
				}
			}
		}
		if (key == "Additive" || key == "Unary") {
			isExpression = true
			SPARQLstring = SPARQLstring + " "+ expressionTable[key] + " ";
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
					SPARQLstring = SPARQLstring + "^^" + expressionTable[key]['iri']['IRIREF'];
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
				for(let k in idTable){
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
			 } else if(className == "[ ]" || className == "[ + ]"){
				 messages.push({
					"type" : "Error",
					"message" : "Inline aggregation can not be used in control nodes not linked to a data instance",
					"isBlocking" : true
				});
			 }
				isAggregate = true
				
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
					SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + separator + ")";
				}
				else {
					SPARQLstring = SPARQLstring + "(" + DISTINCT + generateExpression(expressionTable[key]["Expression"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
				}
			visited = 1;
		}
		
		if(expressionTable[key] == "*" && visited != 1){
			SPARQLstring = SPARQLstring + "*";
			visited = 1;
		}
		
		if (key == "RelationalExpression") {

				if(typeof expressionTable[key]["Relation"]!== 'undefined') {
					var VarL = findINExpressionTable(expressionTable[key]["NumericExpressionL"], "PrimaryExpression");
					var VarR = findINExpressionTable(expressionTable[key]["NumericExpressionR"], "PrimaryExpression");

					if((typeof VarL["NumericLiteral"] !== 'undefined' && typeof VarR["var"] !== 'undefined' && VarR["var"]['kind'] == "CLASS_NAME")
						|| (typeof VarR["NumericLiteral"] !== 'undefined' && typeof VarL["var"] !== 'undefined' && VarL["var"]['kind'] == "CLASS_NAME")){
							var clId;
							 for(let k in idTable){
								if (idTable[k] == className) {
									clId = k;
									break;
								}
							 }
							messages.push({
								"type" : "Error",
								"message" : "Class id '" + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation).substring(1) +"' can not be used in relational expression." ,
								"listOfElementId" : [clId],
								"isBlocking" : true
							});
							visited = 1
						}
				}
				if(visited != 1){

					var Usestringliteralconversion = parameterTable["useStringLiteralConversion"];
					//Parameter useStringLiteralConversion
					if((typeof Usestringliteralconversion === 'undefined' || Usestringliteralconversion == "SIMPLE") && typeof expressionTable[key]["Relation"]!== 'undefined' && (expressionTable[key]["Relation"] == "=" || expressionTable[key]["Relation"] == "!=" || expressionTable[key]["Relation"] == "<>")) {
						var relation = expressionTable[key]["Relation"];
						if(relation == "<>") relation = "!=";
						
						// property = "string" -> STR(?property) = "string"
						if (
						  typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						  && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						  && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						  && typeof  expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						  && (
							(
								typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
								&& (
									(expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]!= null
										&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["data_type"]== 'xsd:string')
									|| 
									(typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
										 && typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]) == true
									)
								)
							) ||
							(
								typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]!== 'undefined'
								&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
								&& (
									(
										expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]!= null
										&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["data_type"]!== 'undefined'
										&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["type"]["data_type"]== 'xsd:string'
									
									) || 
									(typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
										&& typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PrimaryExpression"]["var"]["name"]) == true
									)
								)
							) || 
							(
								typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]!== 'undefined'
								&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]!== 'undefined'
								&& (
									(expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]!= null
									&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["data_type"] !== 'undefined'
									&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["data_type"] == 'xsd:string'
									) || 
									(typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["name"]] !== 'undefined'
										&& typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["name"]) == true
									)
								)
							)|| 
							(
								typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]!== 'undefined'
								&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]!== 'undefined'
								&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]!== 'undefined'
								&& (
									(expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["type"]!= null
									&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["type"]["data_type"] !== 'undefined'
									&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["type"]["data_type"] == 'xsd:string'
									) || 
									(typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["name"]] !== 'undefined'
										&& typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["name"]) == true
									)
								)
							)
						  )
						
						&& typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]=== 'undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionL"]) == false
					  ){
							SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ") " + relation +" ";
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)	
							visited = 1
						}
						
					  if(typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& (
							(typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
								&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]!= null
								&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["data_type"]!== 'undefined'
								&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["data_type"] == "xsd:string"
							) || 
							(typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]!== 'undefined'
								&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]!== 'undefined'
								&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]!= null
								&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["data_type"]!== 'undefined'
								&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"][0]["var"]["type"]["data_type"] == "xsd:string"
							)
						)
						
						&& typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
						&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"] === 'undefined'
						&& isFunctionExpr(expressionTable[key]["NumericExpressionR"]) == false
						){
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)+ " " + relation + " ";
							SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)+")";
							visited = 1
						}
						
						// a.b.c.property = "string"
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
							if(path["messages"].length > 0) messages = messages.concat(path["messages"]);
							if(typeof path["variable"] !== 'undefined' &&
								typeof path["variable"]["var"] !== 'undefined' &&
								typeof path["variable"]["var"]["type"] !== 'undefined' &&
								path["variable"]["var"]["type"] != null &&
								typeof path["variable"]["var"]["type"]["data_type"] !== 'undefined' &&
								(path["variable"]["var"]["type"]["data_type"] == "xsd:string" || path["variable"]["var"]["type"]["data_type"] == "XSD_STRING" )
							){
								SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ") " + relation +" ";
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)	
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
							if(path["messages"].length > 0) messages = messages.concat(path["messages"]);
							if(typeof path["variable"] !== 'undefined' &&
								typeof path["variable"]["var"] !== 'undefined' &&
								typeof path["variable"]["var"]["type"] !== 'undefined' &&
								path["variable"]["var"]["type"] != null &&
								typeof path["variable"]["var"]["type"]["data_type"] !== 'undefined' &&
								(path["variable"]["var"]["type"]["data_type"] == "xsd:string" || path["variable"]["var"]["type"]["data_type"] == "XSD_STRING" )
							){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)+ " " + relation + " ";
								SPARQLstring = SPARQLstring  + "STR(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)+")";
								visited = 1
							}
						}
						
					}
					//parameter useStringLiteralConversion
					if(Usestringliteralconversion == "TYPED" && typeof expressionTable[key]["Relation"]!== 'undefined' && (expressionTable[key]["Relation"] == "=" || expressionTable[key]["Relation"] == "!=" || expressionTable[key]["Relation"] == "<>")) {
						var relation = expressionTable[key]["Relation"];
						if(relation == "<>") relation = "!=";
						
						// property = "string" -> ?propety = "string"^^xsd:string
						if (
							typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
							&& (
								(
									typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
									&& (
										(expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]!=null
											&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["data_type"]!== 'undefined'
											&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["data_type"] == "xsd:string"
										) || 
										(typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
											&& typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]) == true
										)
									)
								) || 
								(
									typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]!== 'undefined'
									&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]!== 'undefined'
									&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]!== 'undefined'
									&& (
										(expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["type"]!= null
										&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["type"]["data_type"] !== 'undefined'
										&& expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["type"]["data_type"] == 'xsd:string'
										) || 
										(typeof symbolTable[classID][expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["name"]] !== 'undefined'
											&& typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["iri"]["PrefixedName"]["var"]["name"]) == true
										)
									)
								)
							)
							&& typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]==='undefined'
							&& isFunctionExpr(expressionTable[key]["NumericExpressionL"]) == false
						){
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " ";
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "^^xsd:string";
							prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
							visited = 1
						}
						
						if (
							typeof expressionTable[key]["NumericExpressionR"]!== 'undefined' && typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]!== 'undefined'
							&& (
								(
									expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]!=null
									&& typeof expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["data_type"]!== 'undefined'
									&& expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["type"]["data_type"] == "xsd:string"
								 )
								|| (typeof symbolTable[classID][expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]] !== 'undefined'
									&& typeStringFromSymbolTable(symbolTable[classID], expressionTable[key]["NumericExpressionR"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["var"]["name"]) == true
								)
							)
							
							&& typeof expressionTable[key]["NumericExpressionL"]!== 'undefined' && expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]!== 'undefined'
							&& typeof expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["RDFLiteral"]["iri"]==='undefined'
							&& isFunctionExpr(expressionTable[key]["NumericExpressionR"]) == false
						){
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)+"^^xsd:string " + relation + " ";
							SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
							prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
							visited = 1
						}
						
						// a.b.c.property = "string" -> ?property = "string"^^xsd:string
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
							if(path["messages"].length > 0) messages = messages.concat(path["messages"]);
							if(typeof path["variable"] !== 'undefined' &&
							typeof path["variable"]["var"] !== 'undefined' &&
							typeof path["variable"]["var"]["type"] !== 'undefined' &&
							path["variable"]["var"]["type"] != null &&
							typeof path["variable"]["var"]["type"]["data_type"] !== 'undefined' &&
							(path["variable"]["var"]["type"]["data_type"] == "xsd:string" || path["variable"]["var"]["type"]["data_type"] == "XSD_STRING" )){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " ";
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "^^xsd:string";
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
				
							if(path["messages"].length > 0) messages = messages.concat(path["messages"]);
							if(typeof path["variable"] !== 'undefined' &&
							typeof path["variable"]["var"] !== 'undefined' &&
							typeof path["variable"]["var"]["type"] !== 'undefined' &&
							path["variable"]["var"]["type"] != null &&
							typeof path["variable"]["var"]["type"]["data_type"] !== 'undefined' &&
							(path["variable"]["var"]["type"]["data_type"] == "xsd:string" || path["variable"]["var"]["type"]["data_type"] == "XSD_STRING" )){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)+"^^xsd:string " + relation + " ";
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
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
							

							// if(typeof variableNamesClass[variableData['name']] !== 'undefined' && ((variableNamesClass[variableData['name']]["isVar"] != true
							if(variableData["type"] !== null && (typeof variableData["type"]["max_cardinality"] === 'undefined' || variableData["type"]["max_cardinality"] > 1 || variableData["type"]["max_cardinality"] == -1)) inFilter = true;
							else if((parseType == "condition") && variableData["type"] !== null && variableData["type"]["max_cardinality"] == 1){
								inFilter = null;
								applyExistsToFilter = false;
							}
					
							if(isSimpleFilter){
								if(expressionTable[key]['Relation'] == "!=" || expressionTable[key]['Relation'] == "<>"){
									var objectName = expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']
									if(objectName.indexOf("[") !== -1 && objectName.indexOf("]") !== -1) objectName = " "+ expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["prefix"] + ":" + expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["local_name"];
									else objectName = " ?"+objectName;
									if(className == expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']) SPARQLstring = "?" + expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"] + " != ?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']
									else SPARQLstring = "NOT EXISTS{?" + className + " " + getPrefix(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["prefix"])+":"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']["var"]["type"]["local_name"] + objectName + ".}";	
				
								}else {
									if(className == expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']) SPARQLstring = "?" + expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"] + " != ?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']
									else tripleTable.push({"var": "?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'], "prefixedName":getPrefix(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["prefix"])+":"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"], "object":className, "inFilter":inFilter});
								// console.log("tripleTable 18", variable)
								}
							}
							else {
								SPARQLstring = "EXISTS{?"+ className + " " + getPrefix(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["prefix"])+":"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"] + " ?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'] + ".}";	
							}
							visited = 1
						}
					}
					//S = student
					//CLASS_ALIAS = objectProperty
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionR'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'PROPERTY_NAME'
						
						&& typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
						&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'] !== 'undefined'
						&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['Reference'] === 'undefined'
						&& (expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'CLASS_NAME' ||
						expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == 'CLASS_ALIAS')
						){
							referenceCandidateTable.push(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']);
							if(expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == "CLASS_ALIAS" || expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['kind'] == "PROPERTY_ALIAS") referenceTable.push("?"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'])
							
							var inFilter = null;
							var variableData = expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var'];
							
							// if(typeof variableNamesClass[variableData['name']] !== 'undefined' && ((variableNamesClass[variableData['name']]["isVar"] != true
							if((variableData["type"] != null) && (typeof variableData["type"]["max_cardinality"] === 'undefined' || variableData["type"]["max_cardinality"] > 1 || variableData["type"]["max_cardinality"] == -1)) inFilter = true;
							else if((parseType == "condition") && variableData["type"]["max_cardinality"] == 1){
								inFilter = null;
								applyExistsToFilter = false;
							}
							if(isSimpleFilter){
								if(expressionTable[key]['Relation'] == "!=" || expressionTable[key]['Relation'] == "<>") {
									if(className == expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']) SPARQLstring = "?" + expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"] + " != ?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']
									else SPARQLstring = "NOT EXISTS{?" + className + " " + getPrefix(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["prefix"])+":"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"] + " ?"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'] + ".}";	
								}else {
									if(className == expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']) SPARQLstring = "?" + expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"] + " != ?"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name']
									else tripleTable.push({"var": "?"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'], "prefixedName":getPrefix(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["prefix"])+":"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"], "object":className, "inFilter":inFilter});
								// console.log("tripleTable 19", variable)
								}
							}
							else SPARQLstring = "EXISTS{?"+ className + " " + getPrefix(expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["type"]["prefix"])+":"+expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']["name"] + " ?"+expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['var']['name'] + ".}";	
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
							if(isSimpleFilter) {
								if(expressionTable[key]['Relation'] == "!=" || expressionTable[key]['Relation'] == "<>") {
									SPARQLstring = "FILTER NOT EXISTS{" + className + " " + expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'] + " :"+variable['type']['local_name'] + ".}";
								}else tripleTable.push({"var":":"+variable['type']['local_name'], "prefixedName":expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'], "object":className, "inFilter":inFilter});
							// console.log("tripleTable 20", variable)
							}
							else SPARQLstring = "EXISTS{?"+ className + " " + expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'] + " :"+variable['type']['local_name'] + ".}";
							
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
							if(isSimpleFilter) tripleTable.push({"var":":"+variable['type']['local_name'], "prefixedName":expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'], "object":className, "inFilter":inFilter});
							
							else SPARQLstring = "EXISTS{?"+ className + " " + expressionTable[key]['NumericExpressionR']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']["PrefixedName"]['var']['name'] + " :"+variable['type']['local_name'] + ".}";
							// console.log("tripleTable 21", variable)
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
									// console.log("tripleTable 22", varName)
									applyExistsToFilter = true;
									var relation = expressionTable[key]['Relation'];
									if(relation = "<>") relation = "!=";
									SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " " + "?"+varName;
								}
								
								visited = 1;
							} //else {
								// SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
								// var relation = expressionTable[key]['Relation'];
								// if(relation = "<>") relation = "!=";
								// SPARQLstring = SPARQLstring  + " " + relation + " ";
								// SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
								// visited = 1;
							//}
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
								if(varName.indexOf(":") != -1) varName = varName.substr
								var inFilter = true;
								if(isSimpleFilter) {
									tripleTable.push({"var":"?"+varName, "prefixedName":variable["name"], "object":className, "inFilter":inFilter});
									// console.log("tripleTable 23", varName)
									applyExistsToFilter = true;
									var relation = expressionTable[key]['Relation'];
									if(relation = "<>") relation = "!=";
									SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " " + "?"+varName;
								}
								visited = 1;
							} //else {
								// SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
								// var relation = expressionTable[key]['Relation'];
								// if(relation = "<>") relation = "!=";
								// SPARQLstring = SPARQLstring  + " " + relation + " ";
								// SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
								// visited = 1;
							// }
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
									prefixTable[getPrefix(variable["type"]["prefix"]) + ":"] = "<"+namespace+">"
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
	
								if(variable["name"].indexOf("[") != -1 && variable["name"].indexOf("]") != -1){
									var prefix = "";
									if(typeof variable["type"]["prefix"] !== "undefined") prefix = variable["type"]["prefix"]+":";
									tripleTable.push({"BIND":"BIND(" + prefix + variable["type"]["local_name"] + " AS ?" + name + ")"})
								} else tripleTable.push({"BIND":"BIND(" + variable["type"]["prefix"]+":" + variable["name"] + " AS ?" + name + ")"})
									valueString = "?"+name;
									SPARQLstring = SPARQLstring  + valueString; 
								visited = 1;
							}
						}
					}
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
								SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " " + variable["type"]["prefix"] + ":" + variable["name"];
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
								prefixTable[getPrefix(variable["type"]["prefix"]) + ":"] = "<"+namespace+">"
								
								applyExistsToFilter = false;
								var relation = expressionTable[key]['Relation'];
								if(relation = "<>") relation = "!=";
								SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + relation + " " + variable["name"];
							}
							visited = 1;
						}
					}
					
					//property = "2000-01-01"
					//date/dateTime = "string"
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
							if(variable["type"]["data_type"] == "xsd:date"){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + expressionTable[key]['Relation'] + " ";
								SPARQLstring = SPARQLstring  + "xsd:date(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								visited = 1
							}
							if(variable["type"]["data_type"] == "xsd:dateTime"){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + expressionTable[key]['Relation'] + " ";
								SPARQLstring = SPARQLstring  + "xsd:dateTime(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								visited = 1
							}
						}
					}
					
					//prefix:property = "2000-01-01"
					//date/dateTime = "string"
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
							&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
							&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri'] !== 'undefined'
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName'] !== 'undefined'
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var'] !== 'undefined'
							&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var']['type'] != null
							
							
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
							var variable = expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['iri']['PrefixedName']['var'];
							if(variable["type"]["data_type"] == "xsd:date"){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + expressionTable[key]['Relation'] + " ";
								SPARQLstring = SPARQLstring  + "xsd:date(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								visited = 1
							}
							if(variable["type"]["data_type"] == "xsd:dateTime"){
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + expressionTable[key]['Relation'] + " ";
								SPARQLstring = SPARQLstring  + "xsd:dateTime(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
								prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
								visited = 1
							}
						}
					}
					
					// a.b.c.property = "2020-01-01"
					if(visited != 1 && typeof expressionTable[key]['Relation'] !== 'undefined'){
						if(typeof expressionTable[key]['NumericExpressionL'] !== 'undefined'
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression'] !== 'undefined'
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression'] !== 'undefined'
							&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpressionList'].length < 1
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression'] !== 'undefined'
							&& expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpressionList'].length < 1
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression'] !== 'undefined'
							&& typeof expressionTable[key]['NumericExpressionL']['AdditiveExpression']['MultiplicativeExpression']['UnaryExpression']['PrimaryExpression']['PathProperty'] !== 'undefined'							
							
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
							var path = getPathFullGrammar(expressionTable[key]["NumericExpressionL"]["AdditiveExpression"]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]["PathProperty"]);
							if(path["messages"].length > 0) messages = messages.concat(path["messages"]);
							if(typeof path["variable"] !== 'undefined' &&
								typeof path["variable"]["var"] !== 'undefined' &&
								typeof path["variable"]["var"]["type"] !== 'undefined' &&
								path["variable"]["var"]["type"] != null &&
								typeof path["variable"]["var"]["type"]["data_type"] !== 'undefined' 
							){
								var variable = path["variable"]["var"];
								if(variable["type"]["data_type"] == "xsd:date"){
									SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + expressionTable[key]['Relation'] + " ";
									SPARQLstring = SPARQLstring  + "xsd:date(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
									prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
									visited = 1
								}
								if(variable["type"]["data_type"] == "xsd:dateTime"){
									SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + " " + expressionTable[key]['Relation'] + " ";
									SPARQLstring = SPARQLstring  + "xsd:dateTime(" + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
									prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
									visited = 1
								}
							}	
						}
					}

					var left = findINExpressionTable(expressionTable[key]["NumericExpressionL"], "PrimaryExpression");
					var right = findINExpressionTable(expressionTable[key]["NumericExpressionR"], "PrimaryExpression");
					
					//property = 5
					//propety = "string"
					// filter as triple
					if(visited != 1 && (Usestringliteralconversion == "OFF" || className.startsWith("_")) 
						&& typeof expressionTable[key]['Relation'] !== 'undefined' 
						&& expressionTable[key]['Relation'] == "=" && isSimpleFilter == true && 
							(
							   (((typeof left["var"] !== 'undefined' && typeof left["var"]["kind"] !== 'undefined' && left["var"]["kind"] == "PROPERTY_NAME" && left["var"]["ref"] == null) 
								|| typeof left["Path"] !== 'undefined' 
								|| typeof left["Reference"] !== 'undefined'
								|| (typeof left["iri"] !== 'undefined' && typeof left["iri"]["PrefixedName"] !== 'undefined')
								) && typeof right["var"] === 'undefined' 
								&& typeof right["Path"] === 'undefined' 
								&& typeof right["Reference"] === 'undefined'
								&& typeof right["iri"] === 'undefined'
								)
								||(((typeof right["var"] !== 'undefined' && typeof right["var"]["kind"] !== 'undefined' && right["var"]["kind"] == "PROPERTY_NAME") 
								|| typeof right["Path"] !== 'undefined' 
								|| typeof right["Reference"] !== 'undefined'
								)
								&& typeof left["var"] === 'undefined' 
								&& typeof left["Path"] === 'undefined' 
								&& typeof left["Reference"] === 'undefined'
								&& (typeof left["iri"] !== 'undefined' && typeof left["iri"]["PrefixedName"] === 'undefined')
								)
							))
					{
						var tripleTableTemp = tripleTable;
						tripleTable = [];
						var VarL = generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						var VarR = generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						
						tripleTable = tripleTable.filter(function (el, i, arr) {
							return arr.indexOf(el) === i;
						});
						 
						for(let k = 0; k < tripleTable.length; k++){
							var varTemp;
							if(tripleTable[k]["var"] == VarL)varTemp = VarR;
							else varTemp = VarL;
							filetrAsTripleTable.push({"object":tripleTable[k]["object"], "prefixedName":tripleTable[k]["prefixedName"], "var":varTemp + " " , isConstant :true});
							// console.log("tripleTable 24")
						}
						if(tripleTable.length == 0) filetrAsTripleTable.push({"object":className, "prefixedName":VarL, "var":VarR + " ", isConstant :true});
						tripleTable = tripleTableTemp;
						applyExistsToFilter = false;
						visited = 1;		
						
					}
					
					//<iri> = "string"
					//<iri> = 5
					// filter as triple
					if(visited != 1 && (Usestringliteralconversion == "OFF" || className.startsWith("_")) && typeof expressionTable[key]['Relation'] !== 'undefined' && expressionTable[key]['Relation'] == "=" && 
					((
						typeof left["iri"] !== 'undefined' && typeof left["iri"]["IRIREF"] !== 'undefined' && typeof left["ArgList"] === 'undefined'
						&& typeof right["var"] === 'undefined' 
						&& typeof right["Path"] === 'undefined' 
						&& typeof right["Reference"] === 'undefined'
						)
					    ||(typeof right["iri"] !== 'undefined' && typeof right["iri"]["IRIREF"] !== 'undefined' && typeof right["ArgList"] === 'undefined'
						&& typeof left["var"] === 'undefined' 
						&& typeof left["Path"] === 'undefined' 
						&& typeof left["Reference"] === 'undefined'
						&& (typeof left["iri"] !== 'undefined' && typeof left["iri"]["PrefixedName"] === 'undefined')
						)
					)){
						var tripleTableTemp = tripleTable;
						tripleTable = [];
						var VarL = generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						var VarR = generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						
						tripleTable = tripleTable.filter(function (el, i, arr) {
							return arr.indexOf(el) === i;
						});
						filetrAsTripleTable.push({"object":className, "prefixedName":VarL, "var":VarR + " ", isConstant :true });

						tripleTable = tripleTableTemp;
						applyExistsToFilter = false;
						visited = 1;				
					}
					// filter as triple
					// property = reference
					if(visited != 1 && (Usestringliteralconversion == "OFF" || className.startsWith("_")) 
						&& typeof expressionTable[key]['Relation'] !== 'undefined' 
						&& expressionTable[key]['Relation'] == "=" && isSimpleFilter == true && 
							(
							   (((typeof left["var"] !== 'undefined' && typeof left["var"]["kind"] !== 'undefined' && left["var"]["kind"] == "PROPERTY_NAME" && left["var"]["ref"] == null) 
								|| typeof left["Path"] !== 'undefined' 
								|| typeof left["Reference"] !== 'undefined'
								|| (typeof left["iri"] !== 'undefined' && typeof left["iri"]["PrefixedName"] !== 'undefined')
								)
								&& typeof right["var"] !== 'undefined' 
								&& typeof right["Path"] === 'undefined' 
								&& typeof right["Reference"] === 'undefined'
								&& typeof right["iri"] === 'undefined'
								)

							))
					{
						
						if(typeof symbolTable[classID][right["var"]["name"]] !== "undefined"){

									var tripleTableTemp = tripleTable;
									tripleTable = [];
									var VarL = generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
									var VarR = generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
									
									tripleTable = tripleTable.filter(function (el, i, arr) {
										return arr.indexOf(el) === i;
									});
									 
									for(let k = 0; k < tripleTable.length; k++){
										var varTemp;
										if(tripleTable[k]["var"] == VarL)varTemp = VarR;
										else varTemp = VarL;
										filetrAsTripleTable.push({"object":tripleTable[k]["object"], "prefixedName":tripleTable[k]["prefixedName"], "var":varTemp + " ", isConstant :false });
									}
									if(tripleTable.length == 0) filetrAsTripleTable.push({"object":className, "prefixedName":VarL, "var":VarR + " " , isConstant :false});
									tripleTable = tripleTableTemp;
									applyExistsToFilter = false;
									visited = 1;
						}
					}
					
					if(visited != 1){
						
						var left = findINExpressionTable(expressionTable[key]["NumericExpressionL"], "PrimaryExpression");
						var right = findINExpressionTable(expressionTable[key]["NumericExpressionR"], "PrimaryExpression");
						if(typeof expressionTable[key]["NumericExpressionL"] !== "undefined") SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["NumericExpressionL"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						else if (typeof expressionTable[key]["classExpr"] !== 'undefined') {
								if(alias!=null)SPARQLstring =  "?" +alias;
								else SPARQLstring =  "?" +className;
						}
						if (typeof expressionTable[key]['Relation'] !== 'undefined'){
							isExpression = true;
							if (expressionTable[key]["Relation"] == "<>") SPARQLstring = SPARQLstring  + " != ";
							else if (expressionTable[key]["Relation"] == "NOTIN") SPARQLstring = SPARQLstring  + " NOT IN";
							else SPARQLstring = SPARQLstring  + " " + expressionTable[key]["Relation"] + " ";
							
							if (expressionTable[key]["Relation"] == "IN" || expressionTable[key]["Relation"] == "NOTIN") {
								var Var = findINExpressionTable(expressionTable[key]["NumericExpressionL"], "var");
								
								if(typeof Var["type"] !== 'undefined' && Var["type"] != null && typeof Var["type"]["data_type"] !== 'undefined' && (Var["type"]["data_type"] == "XSD_STRING" || Var["type"]["data_type"] == "xsd:string")){
									SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key]["ExpressionList"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, true) + ")";
								}
								else SPARQLstring = SPARQLstring + "(" + generateExpression(expressionTable[key]["ExpressionList"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, true) + ")";//?????????????????? ExpressionList
							}
							if (typeof expressionTable[key]["NumericExpressionR"] !== 'undefined') {
								SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["NumericExpressionR"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation); 
							}
							else if (typeof expressionTable[key]["classExpr"] !== 'undefined') {
								if(alias!=null)SPARQLstring = SPARQLstring  + " ?" +alias;
								else SPARQLstring =   SPARQLstring  + "?" +className;
							}
							
						}
						if((expressionTable[key]["Relation"] == "<>" || expressionTable[key]["Relation"] == "!=" || expressionTable[key]["Relation"] == "=") && typeof left["var"] !== "undefined" && left["var"]["type"] == null &&  typeof right["var"] !== "undefined" && right["var"]["type"] == null) applyExistsToFilter = false;

						visited = 1
					}
				}
			//}
	
		}
		if (key == "NumericLiteral") {
			if(isUnderInRelation == true) SPARQLstring = SPARQLstring +  '"' + expressionTable[key]['Number'] + '"';
			else SPARQLstring = SPARQLstring + expressionTable[key]['Number'];
			isExpression = true;
			visited = 1;
		}
		if (key == "MultiplicativeExpression") {
			if(typeof expressionTable[key]["UnaryExpressionList"]!== 'undefined' && typeof expressionTable[key]["UnaryExpressionList"][0]!== 'undefined' && typeof expressionTable[key]["UnaryExpressionList"][0]["Unary"]!== 'undefined'
			&& expressionTable[key]["UnaryExpressionList"][0]["Unary"] == "/"){
				var res = generateExpression(expressionTable[key]["UnaryExpression"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")/";
					prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
				}
				res = generateExpression(expressionTable[key]["UnaryExpressionList"][0]["UnaryExpression"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				if(res != null && res != ""){
					SPARQLstring = SPARQLstring  + "xsd:decimal(" + res + ")";
					prefixTable["xsd:"] = "<http://www.w3.org/2001/XMLSchema#>";
				}
				isFunction = true;
			}
			else{
				if(typeof expressionTable[key]["UnaryExpression"]["Additive"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + expressionTable[key]["UnaryExpression"]["Additive"];
					var result = generateExpression({"PrimaryExpression":expressionTable[key]["UnaryExpression"]["PrimaryExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
					if(tripleTable.length == 1 && typeof tripleTable[0]["BIND"] !== "undefined" && tripleTable[0]["BIND"].startsWith("BIND(") && tripleTable[0]["BIND"].endsWith(result+")")){
						result = tripleTable[0]["BIND"].substring(5, tripleTable[0]["BIND"].length-result.length-5);
						tripleTable = [];
					}
					SPARQLstring = SPARQLstring  + 	result;			
	
				}
				else SPARQLstring = SPARQLstring + generateExpression(expressionTable[key]["UnaryExpression"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
				if (typeof expressionTable[key]["UnaryExpressionList"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key]["UnaryExpressionList"], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				}
			}
			visited = 1
		}
		
		if (key == "MultiplicativeExpressionList"){
			for(let k = 0; k < expressionTable[key].length; k++){
				if(typeof expressionTable[key][k]["Additive"]!== 'undefined'){
					SPARQLstring = SPARQLstring  + expressionTable[key][k]["Additive"]
					SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpression:expressionTable[key][k]["MultiplicativeExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
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
				&& additiveExpression["MultiplicativeExpressionList"][0]["Additive"]=="-") )) {}
			else {SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) }
			if (typeof additiveExpression["MultiplicativeExpressionList"] !== 'undefined') {

				if (typeof additiveExpression["MultiplicativeExpressionList"][0] !== 'undefined' && typeof additiveExpression["MultiplicativeExpressionList"][0]["Concat"]!== 'undefined') {
					
					var concat = "CONCAT(" + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
					for(let k = 0; k < additiveExpression["MultiplicativeExpressionList"].length; k++){
						if (typeof additiveExpression["MultiplicativeExpressionList"][k]["Concat"] !== 'undefined') {
							isFunction = true
							concat = concat + ", " + generateExpression({MultiplicativeExpression:additiveExpression["MultiplicativeExpressionList"][k]["MultiplicativeExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
						} else break
					}
					concat = concat + ") "
					SPARQLstring = SPARQLstring + concat
				}
				else if (typeof additiveExpression["MultiplicativeExpressionList"][0] !== 'undefined' && 
				
				typeof additiveExpression["MultiplicativeExpressionList"][0]["Additive"]!== 'undefined' &&
				additiveExpression["MultiplicativeExpressionList"][0]["Additive"]=="-" ) {
						
					if (typeof additiveExpression["MultiplicativeExpression"]!== 'undefined' &&
					   typeof additiveExpression["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined' &&
					   (
						typeof additiveExpression["MultiplicativeExpression"]["UnaryExpressionList"]=== 'undefined' 
						|| 
						(typeof additiveExpression["MultiplicativeExpression"]["UnaryExpressionList"]!== 'undefined' 
							&& typeof additiveExpression["MultiplicativeExpression"]["UnaryExpressionList"][0]=== 'undefined')
					   ) &&
					   typeof additiveExpression["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined' &&
						
					   typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]!== 'undefined' &&
					   typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpression"]!== 'undefined' &&
					   (typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpressionList"]=== 'undefined' || (typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpressionList"]!== 'undefined' && typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpressionList"][0]=== 'undefined')) &&
					   typeof additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]!== 'undefined'
					) {
						var left = additiveExpression["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]
						var right = additiveExpression["MultiplicativeExpressionList"][0]["MultiplicativeExpression"]["UnaryExpression"]["PrimaryExpression"]
						
						
						
						var sl = generateExpression({PrimaryExpression : left}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						var sr = generateExpression({PrimaryExpression : right}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						
						if(typeof parameterTable["queryEngineType"]=== 'undefined' || parameterTable["queryEngineType"] == "VIRTUOSO"){
							var dateArray = ["xsd:date", "XSD_DATE", "xsd_date"];
							var dateTimeArray = ["xsd:dateTime", "XSD_DATE_TIME"];
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
								var value = generateExpression({MultiplicativeExpression : additiveExpression["MultiplicativeExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
							
							SPARQLstring = SPARQLstring  + value
							}
						} else {
							var value = generateExpression({MultiplicativeExpression : additiveExpression["MultiplicativeExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
							
							SPARQLstring = SPARQLstring  + value
						}
					}
				} else SPARQLstring = SPARQLstring  + generateExpression({MultiplicativeExpressionList : additiveExpression["MultiplicativeExpressionList"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
			}
			visited = 1
		}
		
		
		if (key == "PrimaryExpression" && typeof expressionTable[key]["iri"]!== 'undefined') {
			
			if (typeof expressionTable[key]["ArgList"]!== 'undefined' && expressionTable[key]["ArgList"]!= ''){
				isFunction = true;
				if (typeof expressionTable[key]["iri"]["PrefixedName"]!== 'undefined'){
					SPARQLstring = SPARQLstring + expressionTable[key]["iri"]["PrefixedName"]['var']['name'];
					if(knownNamespaces[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]] != null){
						prefixTable[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]] = "<"+ knownNamespaces[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]]+">";
					}
				}
				if (typeof expressionTable[key]["iri"]["IRIREF"]!== 'undefined') {
					SPARQLstring = SPARQLstring + expressionTable[key]["iri"]["IRIREF"];
				}
				
				var DISTINCT = '';
				if (typeof expressionTable[key]["ArgList"]["DISTINCT"]!== 'undefined') DISTINCT = expressionTable[key]["ArgList"]["DISTINCT"] + " ";
				var o = {ArgList : expressionTable[key]["ArgList"]};
				SPARQLstring = SPARQLstring  + "(" + DISTINCT + generateExpression(o, "", className, classSchemaName, null, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
				
				if(alias == null || alias == "") {
					alias = "expr_" + counter;
					counter++;
				}
				
				tripleTable.push({"BIND":"BIND(" + SPARQLstring + " AS ?" + alias + ")"})
				SPARQLstring = "?"+alias;
				// isFunction = true;
			} else {
				if (typeof expressionTable[key]["iri"]["PrefixedName"]!== 'undefined'){
					var valueString = expressionTable[key]["iri"]["PrefixedName"]['var']['name'];
					
					if(expressionTable[key]["iri"]["PrefixedName"]['var']['type'] !== null){
						var valueStringTemp = generateExpression({"var" : expressionTable[key]["iri"]["PrefixedName"]['var']}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
						if(valueStringTemp.indexOf(":") !== -1){
							prefixTable[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]] = "<"+ knownNamespaces[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]]+">";
						} else valueString = valueStringTemp;
					} else {
						if(knownNamespaces[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]] != null){
							prefixTable[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]] = "<"+ knownNamespaces[expressionTable[key]["iri"]["PrefixedName"]["Prefix"]]+">";
							if(parseType == "attribute" || parseType == "condition"){
								var name = alias;
								if(isUnderInRelation == true || (expressionTable[key]["iri"]["PrefixedName"]['var']['kind'] !== null && expressionTable[key]["iri"]["PrefixedName"]['var']['kind'].indexOf("ALIAS") != -1)){
									valueString =expressionTable[key]["iri"]["PrefixedName"]["var"]["name"];
								}
								else {
									if(name == null || name == "") name = expressionTable[key]["iri"]["PrefixedName"]["Name"];
									tripleTable.push({"var":"?"+name, "prefixedName":expressionTable[key]["iri"]["PrefixedName"]["var"]["name"], "object":className, "inFilter" : true});
									console.log("tripleTable 25",tripleTable, isUnderInRelation )
									valueString = "?"+name;
								}
							}
							if(parseType == "class"){
								var name = alias;
								if(name == null || name == "") name = expressionTable[key]["iri"]["PrefixedName"]["Name"];
								tripleTable.push({"var":expressionTable[key]["iri"]["PrefixedName"]["var"]["name"], "prefixedName":classMembership, "object":className, "inFilter" : true});
								// console.log("tripleTable 26")
								valueString = name;
							}
							
						} else {
							messages.push({
								"type" : "Warning",
								//"message" : "Unrecognized variable '" + valueString + "'. Please specify variable.",
								"message" : "Used name (variable) '" + valueString + "' not defined in the query, the query can not be created",
								"listOfElementId" : [classID],
								"isBlocking" : false
							});
							valueString = "";
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
						// console.log("tripleTable 27")
						SPARQLstring = SPARQLstring + "?"+name;
					}else{
						SPARQLstring = SPARQLstring  + expressionTable[key]["iri"]["IRIREF"];
					}
				}
			}
			visited = 1
		}
		if (key == "FunctionExpression") { 
			
			if(typeof expressionTable[key]["Function"]!== 'undefined' && expressionTable[key]["Function"] == "langmatchesShort"){
				var pe = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				if(parseType == "attribute"){
					SPARQLstring = pe
					attributeFilter = "LANG(" + pe + ") = '" +expressionTable[key]["LANGTAG"].substring(1) + "'";
				}				
			}else if(typeof expressionTable[key]["Function"]!== 'undefined' && expressionTable[key]["Function"] == "langmatchesShortMultiple"){
				attributeFilter = true;
				var pe = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				
				var lang = "LANGMATCHES(LANG(" + pe + "), '";
				
				SPARQLstring = SPARQLstring  + lang + expressionTable[key]["LANGTAG_MUL"][0] + "')";
				if(typeof expressionTable[key]["LANGTAG_MUL"][1] !== 'undefined'){
					for(let langtag in expressionTable[key]["LANGTAG_MUL"][1]){
						SPARQLstring = SPARQLstring  + " || " + lang + expressionTable[key]["LANGTAG_MUL"][1][langtag] + "')";
					}
				}
				if(parseType == "attribute"){
					attributeFilter = SPARQLstring;
					SPARQLstring = pe;
				}
			}else if(typeof expressionTable[key]["Function"]!== 'undefined' && expressionTable[key]["Function"] == "coalesceShort"){
				isFunction = true;
				var pe = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression1"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				var pe2 = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression2"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation)
				
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
				SPARQLstring = SPARQLstring  + "(xsd:dateTime(" + generateExpression({Expression : expressionTable[key]["Expression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "))";	
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
					SPARQLstring = SPARQLstring  + "(" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
				}
				if (typeof expressionTable[key]["NIL"]!== 'undefined') {
					SPARQLstring = SPARQLstring  + "()";
				}
				if (typeof expressionTable[key]["Expression"]!== 'undefined') {
					SPARQLstring = SPARQLstring  + "(" + generateExpression({Expression : expressionTable[key]["Expression"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
				}
				var expTable = [];
				if (typeof expressionTable[key]["Expression1"]!== 'undefined') {
					expTable.push(generateExpression({Expression : expressionTable[key]["Expression1"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation));
				}
				if (typeof expressionTable[key]["Expression2"]!== 'undefined') {
					var parseTypeTemp = parseType;
					var generateTriplesTemp = generateTriples;
					if(expressionTable[key]["Function"] == "IF") {parseType = "condition"; generateTriples = false};
					expTable.push(generateExpression({Expression : expressionTable[key]["Expression2"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation));
					parseType = parseTypeTemp;
					generateTriples = generateTriplesTemp;
				}
				if (typeof expressionTable[key]["Expression3"]!== 'undefined') {
					var parseTypeTemp = parseType;
					var generateTriplesTemp = generateTriples;
					if(expressionTable[key]["Function"] == "IF") {parseType = "condition"; generateTriples = false};
					expTable.push(generateExpression({Expression : expressionTable[key]["Expression3"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation));
					parseType = parseTypeTemp;
					generateTriples = generateTriplesTemp;
				}
				if(expTable.length > 0) SPARQLstring = SPARQLstring  + "(" + expTable.join(", ") +")";
				if (typeof expressionTable[key]["ExpressionList"]!== 'undefined') {
					SPARQLstring = SPARQLstring  + "(" + generateExpression({ExpressionList : expressionTable[key]["ExpressionList"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
				}
				if (typeof expressionTable[key]["FunctionTime"]!== 'undefined') {
					isTimeFunction = true;
					if(typeof parameterTable["queryEngineType"] === 'undefined' || parameterTable["queryEngineType"] == "VIRTUOSO"){
						var fun = expressionTable[key]["FunctionTime"].toLowerCase();
						var sl = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionL"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
						var sr = generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionR"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
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
							var s = expressionTable[key]["FunctionTime"] + "(" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionL"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) +  "-" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionR"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")"
							SPARQLstring = SPARQLstring  + s
						}
					}else{
						var s = expressionTable[key]["FunctionTime"] + "(" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionL"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) +  "-" + generateExpression({PrimaryExpression : expressionTable[key]["PrimaryExpressionR"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")"
						SPARQLstring = SPARQLstring  + s
					}
				}
			}
			visited = 1;
		}

		if (key == "ExpressionList") {
			for(let k in expressionTable[key]){
				SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key][k], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
			}
			visited = 1
		}

		if (key == "ArgListExpression") {
			for(let k in expressionTable[key]){
				SPARQLstring = SPARQLstring  + generateExpression(expressionTable[key][k], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation); 
			}
			visited = 1
		}
			
		if (key == "SubstringExpression") {
		    isExpression = true
			var substr = "SUBSTR(";

			if(typeof parameterTable["queryEngineType"] === 'undefined' || parameterTable["queryEngineType"] == "VIRTUOSO")	substr = "bif:substring(";
		    
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
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
			SPARQLstring =  brackedOpen + "BOUND(" + generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")" + and + SPARQLstring  + brackedClose;
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
			SPARQLstring = brackedOpen +  "!BOUND(" + generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")" + and + SPARQLstring + brackedClose ;
			visited = 1;
		}
		if(key == "ExistsExpr"){
			var triples = [];
			for(let t = 0; t < expressionTable[key]["Triple"].length; t++){
				var triple = "?" + expressionTable[key]["Triple"][t]["object"] + " " + expressionTable[key]["Triple"][t]["prefixedName"] + " ?" + expressionTable[key]["Triple"][t]["variable"]+ "." ;
				// var temp = variableNamesAll[expressionTable[key]["Triple"][t]["variable"]];
				// delete variableNamesClass[temp];
				// delete variableNamesAll[expressionTable[key]["Triple"][t]["variable"]];
				// variableNamesAll[temp] = temp;
				triples.push(triple);
			}
			SPARQLstring = SPARQLstring  + "EXISTS{" + triples.join("\n") + " " + generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "}";
			visited = 1;
			
		}
		if(key == "NotExistsExpr"){
			var triples = [];
			for(let t = 0; t < expressionTable[key]["Triple"].length; t++){
				var triple = "?" + expressionTable[key]["Triple"][t]["object"] + " " + expressionTable[key]["Triple"][t]["prefixedName"] + " ?" + expressionTable[key]["Triple"][t]["variable"] + "." ;
				// var temp = variableNamesAll[expressionTable[key]["Triple"][t]["variable"]];
				// delete variableNamesClass[temp];
				// delete variableNamesAll[expressionTable[key]["Triple"][t]["variable"]];
				// variableNamesAll[temp] = temp;
				triples.push(triple);
			}
			SPARQLstring = SPARQLstring  + "NOT EXISTS{" + triples.join("\n") + " " + generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + "}";
			
			visited = 1;
		}
		
		if(key == "Filter"){
			SPARQLstring = SPARQLstring  + " FILTER(" + generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			visited = 1;
		}
		
		if (key == "Comma") {
			SPARQLstring = SPARQLstring + ", ";
			visited = 1
		}
		if (key == "Space") {
			SPARQLstring = SPARQLstring + " ";
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
			SPARQLstring = SPARQLstring + "REGEX(" + generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation) + ")";
			visited = 1
		}
		
		if (key == "SubstringBifExpression") {
			isFunction = true;
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "bif:substring(" + expr1 + expr2 + expr3 + ")";
			visited = 1
		}
		
		if (key == "StrReplaceExpression") {
			isFunction = true;
			var expr1 = generateExpression({Expression1 : expressionTable[key]["Expression1"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    var expr2 = generateExpression({Expression2 : expressionTable[key]["Expression2"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr2 != "") {expr2 = ", " + expr2};
		    var expr3 = generateExpression({Expression3 : expressionTable[key]["Expression3"]}, "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		    if(expr3 != "") {expr3 = ", " + expr3};
		    SPARQLstring = SPARQLstring  + "REPLACE(" + expr1 + expr2 + expr3 + ")";
			visited = 1
		}
		
		if (key == "ValueScope" && typeof expressionTable[key] !== 'undefined'){
			
			var tempAlias = alias;
			if(tempAlias == null) tempAlias = "expr";
			
			if(tempAlias.indexOf("(") !== -1){
				tempAlias = tempAlias.replace(/ /g, '')
				var array = tempAlias.substring(1, tempAlias.length-1).split(',');
				tempAlias = "(?" + array.join(" ?") + ")";
			}
			
			expressionTable[key] = transformIriForValues(expressionTable[key]);
			
			var temp = isExpression;
			isExpression = true;
			if(tempAlias.indexOf("(") != -1) tripleTable.push({"VALUES":"VALUES " + tempAlias + " {" + generateExpression(expressionTable[key], "", className, classSchemaName, null, generateTriples, isSimpleVariable, isUnderInRelation) + "}"});
			else tripleTable.push({"VALUES":"VALUES ?" + tempAlias + " {" + generateExpression(expressionTable[key], "", className, classSchemaName, null, generateTriples, isSimpleVariable, isUnderInRelation) + "}"});
			isExpression = temp;
			SPARQLstring = SPARQLstring + "?" + tempAlias;
			visited = 1
		}
		
		if (key == "Scope" && typeof expressionTable[key] !== 'undefined'){
			
			var expr =  generateExpression(expressionTable[key], "", className, classSchemaName, null, generateTriples, isSimpleVariable, isUnderInRelation);
			SPARQLstring = SPARQLstring  + "(" + expr + ")";
			visited = 1
		}
		
		if(key == "iriValues"){
			
			if (typeof expressionTable[key]["IRIREF"]!== 'undefined') {
				SPARQLstring = SPARQLstring + expressionTable[key]["IRIREF"];
			} else if(typeof expressionTable[key]["PrefixedName"]!== 'undefined'){
				var pathPart = expressionTable[key]["PrefixedName"]["var"]["name"];
				
				if(expressionTable[key]["PrefixedName"]["var"]["name"].indexOf("[") != -1 && typeof expressionTable[key]["var"]["type"] !== "undefined")pathPart =  getPrefix(expressionTable[key]["PrefixedName"]["var"]["type"]["prefix"]) + ":" + expressionTable[key]["PrefixedName"]["var"]["type"]["local_name"];
				
				SPARQLstring = SPARQLstring + pathPart;
					
				if(expressionTable[key]["PrefixedName"]["var"]["type"] != null)prefixTable[getPrefix(expressionTable[key]["PrefixedName"]["var"]["type"]["prefix"]) + ":"] = "<"+knownNamespaces[getPrefix(expressionTable[key]["PrefixedName"]["var"]["type"]["prefix"])+":"]+">";
				else if(typeof expressionTable[key]["PrefixedName"]["Prefix"] !== "undefined")prefixTable[expressionTable[key]["PrefixedName"]["Prefix"]] = "<"+knownNamespaces[getPrefix(expressionTable[key]["PrefixedName"]["Prefix"])]+">";
			}
			visited = 1;
		}
		
		if (key == "InlineDataOneVar" && typeof expressionTable[key] !== 'undefined'){
			var dataTable = [];
			for(let data in expressionTable[key]){
				var dataBloctValue = generateExpression(expressionTable[key][data], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
				dataTable.push(dataBloctValue)
			}
			SPARQLstring = SPARQLstring  + dataTable.join(" ");
			visited = 1
		}
		
		if (key == "InlineDataFull" && typeof expressionTable[key] !== 'undefined'){
			var dataTable = [];
			for(let data in expressionTable[key]){
				var dataBloctValue = generateExpression(expressionTable[key][data], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
				dataTable.push(dataBloctValue)
			}
			SPARQLstring = SPARQLstring  + dataTable.join(" ");
			visited = 1
		}
		
		if (key == "DataBlockValueFull" && typeof expressionTable[key] !== 'undefined'){
			SPARQLstring = SPARQLstring  + "(";
			var dataTable = [];
			for(let data in expressionTable[key]){
				var dataBloctValue = generateExpression(expressionTable[key][data], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
				dataTable.push(dataBloctValue)
			}
			SPARQLstring = SPARQLstring  + dataTable.join(" ") + ")";
			
			visited = 1
		}
		
		if (key == "DataBlockValue" && typeof expressionTable[key] !== 'undefined'){
			var parseTypeTemp = parseType;
			parseType = "";
			var dataBloctValue = generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
			
			parseType = parseTypeTemp;
			SPARQLstring = SPARQLstring  + dataBloctValue;
			visited = 1
		}
		
		if (key == "UNDEF"){
			SPARQLstring = SPARQLstring  + "UNDEF";
			visited = 1
		}
		
		if (key == "NIL"){
			SPARQLstring = SPARQLstring  + "()";
			visited = 1
		}
		
		if(visited == 0 && typeof expressionTable[key] == 'object'){
			SPARQLstring += generateExpression(expressionTable[key], "", className, classSchemaName, alias, generateTriples, isSimpleVariable, isUnderInRelation);
		}
	}
	return SPARQLstring
}

async function countCardinality(str_expr, context){	 
	
	try {
      if(typeof str_expr !== 'undefined' && str_expr != null && str_expr != ""){
		  
		  var proj = Projects.findOne({_id: Session.get("activeProject")});
		  
		  var schemaName = dataShapes.schema.schemaType; 
		  var parsed_exp = await vq_grammar_parser.parse(str_expr, {schema:null, schemaName:schemaName, symbol_table:{}, exprType:"attribute", context:context});
		  parsed_exp = await getResolveInformation(parsed_exp, schemaName, {}, context, "attribute");
		  
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
	
	for(let key in expressionTable){
		if(key == "var") {	
			//if type information is known
			if(expressionTable[key]['type'] !== null && typeof expressionTable[key]['type'] !== 'undefined') {
				//if max_cardinality is known
				if(typeof expressionTable[key]['type']['max_cardinality'] !== 'undefined' && expressionTable[key]['type']['max_cardinality'] != null){
					if(expressionTable[key]['type']['max_cardinality'] == -1 || expressionTable[key]['type']['max_cardinality'] > 1) {
						isMultiple = true;
					}
				//if max_cardinality not known
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
	for(let key = 0; key < symbolTable[expression].length; key++){
		if(symbolTable[expression][key]["type"]!== null && typeof symbolTable[expression][key]["type"] !== 'undefined' &&
			(symbolTable[expression][key]["type"]["data_type"]== 'XSD_STRING'
			|| symbolTable[expression][key]["type"]["data_type"]== 'xsd:string')) value = true;	
	}
	return value;
}

function checkIfIsURI(text){
	if(text == null) return "not_uri";
	if(text.indexOf("://") != -1) return "full_form";
	else if(text.indexOf(":") != -1) return "prefix_form";
	return "not_uri";
}

export {
  countCardinality,
  getPathFullGrammar,
}
