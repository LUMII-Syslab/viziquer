Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

  ExecuteSPARQL_from_diagram: function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    // Print All SPARQL Queries within the diagram
    _.each(genAbstractQueryForElementList(elems_in_diagram_ids),function(q) {
         //console.log(JSON.stringify(q,null,2));
     var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
		 var rootClass = abstractQueryTable["root"];
		 var result = generateSPARQLtext(rootClass);
		 console.log(result);
		 Session.set("generatedSparql", result);

     executeSparqlString(result);
    })
  },

  ExecuteSPARQL_from_selection: function() {
    var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());

    // Print All SPARQL Queries within the diagram
    _.each(genAbstractQueryForElementList(elem_ids),function(q) {
         //console.log(JSON.stringify(q,null,2));
     var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
		 var rootClass = abstractQueryTable["root"];
		 var result = generateSPARQLtext(rootClass);
		 console.log(result);
		 Session.set("generatedSparql", result);

     executeSparqlString(result);
    })
  },

  GenerateSPARQL_from_selection: function() {
    // get _id-s of selected elements - it serves as potential root Classes
    // and as allowed elements
    var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());

    GenerateSPARQL_for_ids(elem_ids)
  },

  GenerateSPARQL_from_diagram: function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    GenerateSPARQL_for_ids(elems_in_diagram_ids)
  },

  ExecuteSPARQL_from_text: function(text) {
      executeSparqlString(text);
  },
});


// generate SPARQL for given id-s
function GenerateSPARQL_for_ids(list_of_ids) {
  // goes through all queries found within the list of VQ element ids
  _.each(genAbstractQueryForElementList(list_of_ids),function(q) {
       //console.log(JSON.stringify(q,null,2));
   var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
   var rootClass = abstractQueryTable["root"];
   var result = generateSPARQLtext(rootClass);
   console.log(result);
   Session.set("generatedSparql", result);
  })
}

// string -->
// Executes the given Sparql end shows result in the GUI
function executeSparqlString(sparql) {
  // Default Data Set Name (Graph IRI) and SPARQL endpoint url
  var graph_iri = "MiniBkusEN";
  var endpoint = "http://185.23.162.167:8833/sparql";

  var proj = Projects.findOne({_id: Session.get("activeProject")});

  if (proj && proj.uri && proj.endpoint) {
    graph_iri = proj.uri;
    endpoint = proj.endpoint;
  }

  var list = {projectId: Session.get("activeProject"),
              versionId: Session.get("versionId"),
              options: {
                        params: {
                               params: {
                                     "default-graph-uri": graph_iri,
                                      query: sparql,
                               },
                        },
                        endPoint: endpoint,
              },
           };
  //console.log(list);
  Utilities.callMeteorMethod("executeSparql", list, function(res) {
    if (res.status == 200) {
      //console.log(res);
      Session.set("executedSparql", res.result);
    } else {
      Session.set("executedSparql", undefined);
      console.error(res);
    }
  })
}

//generate table with unique class names in form [_id] = class_unique_name
//rootClass - abstract syntax table starting with 'rootClass' object
function generateIds(rootClass){
	var counter = 0;
	var idTable = [];

	//add root class unique name
	var rootClassId = rootClass["instanceAlias"];
	if(rootClassId == null) rootClassId = rootClass["identification"]["localName"];
	if(rootClassId == null) rootClassId = "expr";
	if(rootClass["isVariable"] == true) rootClassId = "_" + rootClass["variableName"];
	idTable[rootClass["identification"]["_id"]] = rootClassId;

	//go through all root class children classes
	_.each(rootClass["children"],function(subclazz) {
		idTable.concat(generateClassIds(subclazz, idTable, counter));
	})
	return idTable;
}

function findUsedPrefixes(expressionTable, prefixTable){

	for(var key in expressionTable){
		if(key == 'Prefix') {
			if(typeof prefixTable[expressionTable[key]] === 'undefined') prefixTable[expressionTable[key]] = 1;
			else prefixTable[expressionTable[key]] = prefixTable[expressionTable[key]] +1;
		}
		if(typeof expressionTable[key] == 'object') prefixTable = findUsedPrefixes(expressionTable[key], prefixTable);
	}
	return prefixTable;
}

function findEmptyPrefix(expressionTable){
	var prefix = null;

	if(typeof expressionTable[""] === 'undefined'){
		for(var key in expressionTable){
			if(typeof expressionTable[key] === 'number'){
				if(prefix == null) prefix = key;
				else if(expressionTable[key] > expressionTable[prefix]) prefix = key;
			}
		}
	} else prefix = "";
	return prefix
}

// generate table with unique class names in form [_id] = class_unique_name
// clazz - abstract syntax table starting with given class object
// idTable - table with unique class names, generated so far
// counter - counter for classes with equals names
function generateClassIds(clazz, idTable, counter){
	// if instance if defined, use it
	if(clazz["instanceAlias"] != null) idTable[clazz["identification"]["_id"]] = clazz["instanceAlias"];
	else if(clazz["isVariable"] == true) idTable[clazz["identification"]["_id"]] = "_" + clazz["variableName"];
	else{
		//TODO if isVariable == true
		//TODO container name
		var foundInIdTable = false;
		for(var key in idTable) {
			// if given class name is in the table, add counter to the class name
			if(idTable[key] == clazz["identification"]["localName"]){
				foundInIdTable = true;
				idTable[clazz["identification"]["_id"]] = clazz["identification"]["localName"] + "_"+ counter;
				counter++;
			}
		}
		// if given class name is not in the table, use it
		if(foundInIdTable == false) idTable[clazz["identification"]["_id"]] = clazz["identification"]["localName"];
	}
	_.each(clazz["children"],function(subclazz) {
		idTable.concat(generateClassIds(subclazz, idTable, counter));
	})
	return idTable;
}

function generateSPARQLtext(rootClass){
		 var SPARQL_text = "SELECT ";

		 //DISTINCT
		 if(rootClass["distinct"] == true && rootClass["aggregations"].length == 0) SPARQL_text = SPARQL_text + "DISTINCT ";

		 //generate table with unique class names in [form _id] = class_unique_name
		 var idTable = generateIds(rootClass);

		 var emptyPrefix = findEmptyPrefix(findUsedPrefixes(rootClass, []));

		 //table with unique variable names
		 var variableNamesAll = [];

		//counter for variables with equals names
		 var counter = 0;

		 var result = forAbstractQueryTable(rootClass, idTable[rootClass["identification"]["_id"]], idTable, variableNamesAll, counter, [], false, emptyPrefix);
		 sparqlTable = result["sparqlTable"];
		 // console.log(result);

		 var prefixTable = result["prefixTable"];


		 // console.log("sparqlTable", sparqlTable);
		 var selectResult = generateSELECT(sparqlTable);
		 // console.log("selectResult", selectResult);
		 var tempSelect = selectResult["select"];
		 tempSelect = tempSelect.concat(selectResult["aggregate"]);
		 SPARQL_text = SPARQL_text + tempSelect.join(" ");
		 SPARQL_text = SPARQL_text + " WHERE{\n";

		 //SELECT DISTINCT
		 if(rootClass["distinct"] == true && rootClass["aggregations"].length > 0){
			 SPARQL_text = SPARQL_text + "{SELECT DISTINCT " + selectResult["selectDistinct"] + " WHERE{\n";
		 }

		  //HAVING
		 // var having = getHaving(rootClass["havingConditions"]);
		 // if(having != "") SPARQL_text = SPARQL_text + having + "\n";

		 var whereStatements = generateSPARQLWHEREStatements(sparqlTable, [], [], []);
		 var temp = whereStatements["triples"];
		 temp = temp.concat(whereStatements["links"]);
		 temp = temp.concat(whereStatements["filters"]);

		 SPARQL_text = SPARQL_text + temp.join("\n")  + "}";
		 if(rootClass["distinct"] == true && rootClass["aggregations"].length > 0) SPARQL_text = SPARQL_text + "}}";
		 //GROUP BY
		 var groupBy = selectResult["groupBy"].join(" ");
		 if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;

		 if(rootClass["aggregations"].length > 0) SPARQL_text = SPARQL_text + groupBy;

		 //ORDER BY
		 var orderBy = getOrderBy(rootClass["orderings"]);
		 if (orderBy != "") SPARQL_text = SPARQL_text + "\nORDER BY " + orderBy;

		 //OFFSET
		 if (rootClass["offset"] != null) SPARQL_text = SPARQL_text + "\nOFFSET " + rootClass["offset"];

		 //LIMIT
		 if (rootClass["limit"] != null) SPARQL_text = SPARQL_text + "\nLIMIT " + rootClass["limit"];

		 //Prefixes
		 var prefixes = "";
		 for (var prefix in prefixTable){
			if(typeof prefixTable[prefix] === "string") prefixes = prefixes + "PREFIX " + prefix + " " + prefixTable[prefix] + "\n";
		 }
		 SPARQL_text = prefixes + SPARQL_text;
		 return SPARQL_text;
}

function getPrefix(emptyPrefix, givenPrefix){
	if(emptyPrefix == givenPrefix) return "";
	return givenPrefix;
}


// generate SPARQL structure table
// clazz - abstract syntax table for given class
// rootClassId - root class unique name
// idTable - table with unique class names, generated so far
// variableNamesAll - table with unique variable names for all query
// counter - counter for variables with equals names
// sparqlTable - table with SPARQL structure generated so far
// underNotLink - label, that class is under NOT link
function forAbstractQueryTable(clazz, rootClassId, idTable, variableNamesAll, counter, sparqlTable, underNotLink, emptyPrefix){
	var variableNamesClass = [];
	var prefixTable = [];

	var instance = idTable[clazz["identification"]["_id"]];

	var sparqlTable = [];
	sparqlTable["class"] = "?" + instance;
	if(clazz["isVariable"] == true) {
		sparqlTable["classTriple"] = "?" + instance + " a ?" + clazz["variableName"]+ ".";
		sparqlTable["variableName"] = "?" + clazz["variableName"];
	}
	else if(clazz["identification"]["localName"] != "[ ]" && clazz["identification"]["localName"] != "[ + ]" && clazz["identification"]["localName"] != null && clazz["identification"]["localName"] != "" && clazz["identification"]["localName"] != "(no_class)") {
		sparqlTable["classTriple"] = "?" + instance + " a " + getPrefix(emptyPrefix, clazz["identification"]["Prefix"]) + ":" + clazz["identification"]["localName"] + ".";
		prefixTable[getPrefix(emptyPrefix, clazz["identification"]["Prefix"]) +":"] = "<"+clazz["identification"]["Namespace"]+"#>";
	}
	sparqlTable["stereotype"] = clazz["stereotype"];
	sparqlTable["distinct"] = clazz["distinct"];
	sparqlTable["agregationInside"] = false;
	sparqlTable["simpleTriples"] = [];
	sparqlTable["expressionTriples"] = [];
	sparqlTable["functionTriples"] = [];
	sparqlTable["aggregateTriples"] = [];
	sparqlTable["localAggregateTriples"] = [];
	sparqlTable["filterTriples"] = [];
	sparqlTable["filter"] = [];
	sparqlTable["conditionLinks"] = [];
	sparqlTable["selectMain"] = [];
	sparqlTable["selectMain"]["simpleVariables"] = [];
	sparqlTable["selectMain"]["expressionVariables"] = [];
	sparqlTable["selectMain"]["functionVariables"] = [];
	sparqlTable["selectMain"]["aggrigateVariables"] = [];
	sparqlTable["selectDistinct"] = [];
	sparqlTable["selectDistinct"]["simpleVariables"] = [];
	sparqlTable["selectDistinct"]["expressionVariables"] = [];
	sparqlTable["selectDistinct"]["functionVariables"] = [];
	sparqlTable["selectDistinct"]["aggrigateVariables"] = [];

	//conditions
	_.each(clazz["conditions"],function(condition) {
		var result = parse_filter(condition["parsed_exp"], instance, variableNamesAll, counter, emptyPrefix);
		counter = result["counter"]
		// for (var attrname in result["variableNamesClass"]) { variableNamesClass[attrname] = result["variableNamesClass"][attrname]; }
		for (var attrname in result["expressionLevelNames"]) {variableNamesAll[attrname] = result["expressionLevelNames"][attrname]; }
		for (var prefix in result["prefixTable"]) { prefixTable[prefix] = result["prefixTable"][prefix]; }

		var tempTripleTable = [];
		tempTripleTable["triple"] = [];
		for (var triple in result["triples"]){
			tempTripleTable["triple"].push(result["triples"][triple]);
		}
		sparqlTable["filterTriples"].push(tempTripleTable);
		sparqlTable["filter"].push("FILTER(" + result["exp"] + ")");

		// console.log("CONDITION", condition["exp"], result);
	})

	//attributes
	_.each(clazz["fields"],function(field) {
		var result = parse_attrib(field["parsed_exp"], field["alias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix);
		counter = result["counter"]
		for (var attrname in result["variableNamesClass"]) { variableNamesClass[attrname] = result["variableNamesClass"][attrname]; }
		for (var prefix in result["prefixTable"]) { prefixTable[prefix] = result["prefixTable"][prefix]; }

		var alias = field["alias"];
		if(alias == "") {
			alias = "expr_" + counter;
			counter++;
		}

		//agregation in class
		if(result["isAggregate"] == true) {
			//local Aggregation
			tempTripleTable = []
			for (var triple in result["triples"]){
				if(typeof result["triples"][triple] === 'string') tempTripleTable.push(result["triples"][triple]);
			}

			var uniqueTriples = tempTripleTable.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			});

			var localAggregation = "{SELECT ?" + rootClassId + " (" + result["exp"] + " AS ?" + alias + ") WHERE{" + uniqueTriples.join(" ") +"} GROUP BY ?" + rootClassId +"}";
			sparqlTable["localAggregateTriples"].push(localAggregation);
		}

		//function in expression
		else if(result["isFunction"] == true) {
			//functionTriples
			sparqlTable["functionTriples"].push(getTriple(result, alias, field["requireValues"], true));

			//MAIN SELECT function variables (not undet NOT link and is not internal)
			if(underNotLink != true && field["isInternal"] != true){
				sparqlTable["selectMain"]["functionVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
				for (var variable in result["variables"]){
					if(typeof result["variables"][variable] === 'string') sparqlTable["selectDistinct"]["functionVariables"].push(result["variables"][variable]);
				}
			}
		}

		//expression in expression
		else if(result["isExpression"] == true) {
			//expressionTriples
			sparqlTable["expressionTriples"].push(getTriple(result, alias, field["requireValues"], true));

			// MAIN SELECT expression variables (not undet NOT link and is not internal)
			if(underNotLink != true && field["isInternal"] != true){
				sparqlTable["selectMain"]["expressionVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
				for (var variable in result["variables"]){
					if(typeof result["variables"][variable] === 'string') sparqlTable["selectDistinct"]["expressionVariables"].push(result["variables"][variable]);
				}
			}
		}
		//simple triples
		else {
			alias = result["exp"];
			var tempTripleTable = [];
			if(field["requireValues"] == true && alias!= null && alias!="") tempTripleTable["bound"] = "FILTER(BOUND(" + alias + "))";
			tempTripleTable["triple"] = [];
			for (var triple in result["triples"]){
				tempTripleTable["triple"].push(result["triples"][triple]);
			}
			sparqlTable["simpleTriples"].push(tempTripleTable);

			// MAIN SELECT simple variables (not undet NOT link and is not internal)
			if(underNotLink != true && field["isInternal"] != true){
				sparqlTable["selectMain"]["simpleVariables"].push({"alias": alias, "value" : alias});
				for (var variable in result["variables"]){
					if(typeof result["variables"][variable] === 'string') sparqlTable["selectDistinct"]["simpleVariables"].push(result["variables"][variable]);
				}
			}
		}

		// console.log("FIELD", field["exp"], result);
	})

	//aggregations
	_.each(clazz["aggregations"],function(field) {
		var result = parse_attrib(field["parsed_exp"], field["alias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix);
		counter = result["counter"]
		for (var attrname in result["variableNamesClass"]) { variableNamesClass[attrname] = result["variableNamesClass"][attrname]; }
		for (var prefix in result["prefixTable"]) { prefixTable[prefix] = result["prefixTable"][prefix]; }

		var alias = field["alias"];
		if(alias == "") {
			alias = "expr_" + counter;
			counter++;
		}

		///////////////////////////////////////////////////////////////////////////////////////////////
		//aggregateTriples
		if(rootClassId == idTable[clazz["identification"]["_id"]] || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) {
			sparqlTable["agregationInside"] = true;
			sparqlTable["aggregateTriples"].push(getTriple(result, alias, field["requireValues"], false));
			//MAIN SELECT agregate variables
			sparqlTable["selectMain"]["aggrigateVariables"].push({"alias": "?" + alias, "value" : result["exp"]});

			for (var variable in result["variables"]){
				if(typeof result["variables"][variable] === 'string') sparqlTable["selectDistinct"]["aggrigateVariables"].push(result["variables"][variable]);
			}
		}
		///////////////////////////////////////////////////////////////////////////////////////////////
	})


	//subClasses
	if(clazz["children"].length > 0){
		sparqlTable["subClasses"] = [];
	};
	for (var attrname in variableNamesClass) {variableNamesAll[attrname] = variableNamesClass[attrname]; }
	_.each(clazz["children"],function(subclazz) {
		if(subclazz["linkType"] == 'NOT') underNotLink = true;
		var temp = forAbstractQueryTable(subclazz, rootClassId, idTable, variableNamesAll, counter, sparqlTable, underNotLink);
		counter = temp["counter"];
		for (var attrname in temp["variableNamesAll"]) { variableNamesClass[attrname] = temp["variableNamesAll"][attrname]; }
		for (var prefix in temp["prefixTable"]) { prefixTable[prefix] = temp["prefixTable"][prefix]; }
		underNotLink = false;
		//link triple
		if(typeof subclazz["linkIdentification"]["localName"] !== 'undefined'){
			if(subclazz["linkIdentification"]["localName"] != null && subclazz["linkIdentification"]["localName"] != "++"){
				var subject, preditate, object;
				if(subclazz["linkIdentification"]["localName"].startsWith('?')) {
					preditate = " " + subclazz["linkIdentification"]["localName"];
					temp["sparqlTable"]["linkVariableName"] = subclazz["linkIdentification"]["localName"];
				} else {
					preditate = " " + getPrefix(emptyPrefix, subclazz["linkIdentification"]["Prefix"]) +":" + subclazz["linkIdentification"]["localName"];
					if(subclazz["linkIdentification"]["localName"] != "==") prefixTable[getPrefix(emptyPrefix, subclazz["linkIdentification"]["Prefix"])+":"] = "<"+subclazz["linkIdentification"]["Namespace"]+"#>";
				}
				if(subclazz["isInverse"] == true) {
					object = instance;
					subject = idTable[subclazz["identification"]["_id"]];
				} else {
					subject = instance;
					object = idTable[subclazz["identification"]["_id"]];
				}
				// if is global subQuery then no need in link between classes
				if(subclazz["isGlobalSubQuery"] != true && subclazz["linkIdentification"]["localName"] != "==")temp["sparqlTable"]["linkTriple"] = "?" + subject +  preditate + " ?" + object + ".";
				if(subclazz["linkIdentification"]["localName"] == "==") sparqlTable["filter"].push("FILTER(" + "?" + subject + " = " + "?" + object +")");
			}

			temp["sparqlTable"]["linkType"] = subclazz["linkType"];
			temp["sparqlTable"]["isSubQuery"] = subclazz["isSubQuery"];
			temp["sparqlTable"]["isGlobalSubQuery"] = subclazz["isGlobalSubQuery"];

			if(subclazz["isSubQuery"] == true || subclazz["isGlobalSubQuery"] == true){
				 //HAVING
				// temp["sparqlTable"]["having"] = getHaving(subclazz["havingConditions"]);

				//ORDER BY
				temp["sparqlTable"]["order"] = getOrderBy(subclazz["orderings"]);

				 //OFFSET
				temp["sparqlTable"]["offset"] = subclazz["offset"];

				 //LIMIT
				 temp["sparqlTable"]["limit"] = subclazz["limit"];
			}
		}

		sparqlTable["subClasses"].push(temp["sparqlTable"]);
	})

	//conditionLinks
	_.each(clazz["conditionLinks"],function(condLink) {
		var sourse, target;
		if(condLink["isInverse"] == true) {
			target = "?" + idTable[clazz["identification"]["_id"]];
			sourse = "?" + idTable[condLink["target"]];
		} else {
			target = "?" + idTable[condLink["target"]];
			sourse = "?" + idTable[clazz["identification"]["_id"]];
		}
		var triple = sourse + " " + getPrefix(emptyPrefix, condLink["identification"]["Prefix"]) + ":" + condLink["identification"]["localName"] + " " + target + ".";
		if(condLink["isNot"] == true) triple = "FILTER NOT EXISTS{" + triple + "}";
		sparqlTable["conditionLinks"].push(triple);
		prefixTable[getPrefix(emptyPrefix, condLink["identification"]["Prefix"]) +":"] = "<"+condLink["identification"]["Namespace"]+"#>";
	})

	for (var attrname in variableNamesClass) { variableNamesAll[attrname] = variableNamesClass[attrname]; }
	return {variableNamesAll:variableNamesAll, sparqlTable:sparqlTable, prefixTable:prefixTable, counter:counter};
}


function getOrderBy(orderings){
	var orderTable = [];

	_.each(orderings,function(order) {
		var descendingStart = "";
		var descendingEnd = "";
		if(order["isDescending"] == true) {
			descendingStart = "DESC("
			descendingEnd = ")"
		}

		var result = parse_attrib(order["parsed_exp"], null, "", [], [], 0);
		orderTable.push(descendingStart + result["exp"] + descendingEnd + " ");

	})
	var uniqueTriples = orderTable.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	return uniqueTriples.join(" ");
}

// generete HAVING statements
function getHaving(havingConditions){
	var havingTable = [];

	_.each(havingConditions,function(having) {
		//TODO dabut izparseto izteiksmi
		havingTable.push("FILTER(" + having["exp"] + ")");
	})

	// remove duplicates
	var uniqueTriples = havingTable.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	return uniqueTriples.join("\n");
}

function getTriple(result, alias, required, notAgrageted){

	var tempTripleTable = [];
	if(notAgrageted == true)tempTripleTable["bind"] = "BIND(" + result["exp"] + " AS ?" + alias + ")";
	if(required == true && notAgrageted == true)tempTripleTable["bound"] = "FILTER(BOUND(?" + alias + "))";
	tempTripleTable["triple"] = [];
	for (var triple in result["triples"]){
		tempTripleTable["triple"].push(result["triples"][triple]);
	}
	return tempTripleTable;
}

// genrerate SPARQL WHERE statements
// sparqlTable - table with sparql parts
function generateSPARQLWHEREStatements(sparqlTable, ws, fil, lin){
	whereStatements = [];
	filters = [];
	links = [];

	// whereStatements.push(sparqlTable["classTriple"]);

	// simpleTriples
	for (var expression in sparqlTable["simpleTriples"]){
		if(typeof sparqlTable["simpleTriples"][expression] === 'object'){
			for (var triple in sparqlTable["simpleTriples"][expression]["triple"]){
				if(typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
					if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(') || sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ?')) whereStatements.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
					else whereStatements.push("OPTIONAL{" + sparqlTable["simpleTriples"][expression]["triple"][triple] + "}");
				}
			}
		}
		if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') whereStatements.push(sparqlTable["simpleTriples"][expression]["bound"]);
	}
	// expressionTriples
	for (var expression in sparqlTable["expressionTriples"]){
		if(typeof sparqlTable["expressionTriples"][expression] === 'object'){
			for (var triple in sparqlTable["expressionTriples"][expression]["triple"]){
				if(typeof sparqlTable["expressionTriples"][expression]["triple"][triple] === 'string') whereStatements.push("OPTIONAL{" + sparqlTable["expressionTriples"][expression]["triple"][triple] + "}");
			}
		}
		if(typeof sparqlTable["expressionTriples"][expression]["bind"]  === 'string') whereStatements.push(sparqlTable["expressionTriples"][expression]["bind"]);
		if(typeof sparqlTable["expressionTriples"][expression]["bound"]  === 'string') whereStatements.push(sparqlTable["expressionTriples"][expression]["bound"]);
	}

	// functionTriples
	for (var expression in sparqlTable["functionTriples"]){
		if(typeof sparqlTable["functionTriples"][expression] === 'object'){
			for (var triple in sparqlTable["functionTriples"][expression]["triple"]){
				if(typeof sparqlTable["functionTriples"][expression]["triple"][triple] === 'string') whereStatements.push("OPTIONAL{" + sparqlTable["functionTriples"][expression]["triple"][triple] + "}");
			}
		}
		if(typeof sparqlTable["functionTriples"][expression]["bind"]  === 'string') whereStatements.push(sparqlTable["functionTriples"][expression]["bind"]);
		if(typeof sparqlTable["functionTriples"][expression]["bound"]  === 'string') whereStatements.push(sparqlTable["functionTriples"][expression]["bound"]);
	}

	// aggregateTriples
	for (var expression in sparqlTable["aggregateTriples"]){
		if(typeof sparqlTable["aggregateTriples"][expression] === 'object'){
			for (var triple in sparqlTable["aggregateTriples"][expression]["triple"]){
				if(typeof sparqlTable["aggregateTriples"][expression]["triple"][triple] === 'string') whereStatements.push("OPTIONAL{" + sparqlTable["aggregateTriples"][expression]["triple"][triple] + "}");
			}
		}
		// if(typeof sparqlTable["aggregateTriples"][expression]["bind"]  === 'string') whereStatements.push(sparqlTable["aggregateTriples"][expression]["bind"]);
		// if(typeof sparqlTable["aggregateTriples"][expression]["bound"]  === 'string') whereStatements.push(sparqlTable["aggregateTriples"][expression]["bound"]);
	}

	// localAggregateTriples
	for (var expression in sparqlTable["localAggregateTriples"]){
		if(typeof sparqlTable["localAggregateTriples"][expression] === 'string'){
			whereStatements.push(sparqlTable["localAggregateTriples"][expression]);
		}
	}

	// filterTriples
	for (var expression in sparqlTable["filterTriples"]){
		if(typeof sparqlTable["filterTriples"][expression] === 'object'){
			for (var triple in sparqlTable["filterTriples"][expression]["triple"]){
				if(typeof sparqlTable["filterTriples"][expression]["triple"][triple] === 'string') whereStatements.push("OPTIONAL{" + sparqlTable["filterTriples"][expression]["triple"][triple] + "}");
			}
		}
		if(typeof sparqlTable["filterTriples"][expression]["bind"]  === 'string') whereStatements.push(sparqlTable["filterTriples"][expression]["bind"]);
		if(typeof sparqlTable["filterTriples"][expression]["bound"]  === 'string') whereStatements.push(sparqlTable["filterTriples"][expression]["bound"]);
	}

	//filters
	for (var expression in sparqlTable["filter"]){
		if(typeof sparqlTable["filter"][expression] === 'string'){
			filters.push(sparqlTable["filter"][expression]);
		}
	}

	//link
	if(typeof sparqlTable["linkTriple"] === 'string'){
		links.push(sparqlTable["linkTriple"]);
	}

	//conditionLinks
	for (var expression in sparqlTable["conditionLinks"]){
		if(typeof sparqlTable["conditionLinks"][expression] === 'string'){
			links.push(sparqlTable["conditionLinks"][expression]);
		}
	}

	var subQueries = [];

	if(typeof sparqlTable["subClasses"] !=='undefined'){
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				if(sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
					var temp = generateSPARQLWHEREStatements(sparqlTable["subClasses"][subclass], whereStatements, filters, links);
					filters = filters.concat(temp["filters"]);

					links = links.concat(temp["links"]);
					whereStatements = whereStatements.concat(temp["triples"]);
				}else {

					var selectResult = generateSELECT(sparqlTable["subClasses"][subclass]);

					var wheresubStatements = generateSPARQLWHEREStatements(sparqlTable["subClasses"][subclass], [], [], []);
					var temp = wheresubStatements["triples"];
					temp = temp.concat(wheresubStatements["links"]);
					temp = temp.concat(wheresubStatements["filters"]);

					var tempSelect = selectResult["select"];
					tempSelect= tempSelect.concat(selectResult["aggregate"])
					if(tempSelect.length > 0){
						var subQuery = "{SELECT " ;

						//DISTINCT
						if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";

						subQuery = subQuery + tempSelect.join(" ") + " WHERE{\n";

						//SELECT DISTINCT
						if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "SELECT DISTINCT " + selectResult["selectDistinct"].join(" ") + " WHERE{\n";

						subQuery = subQuery + temp.join("\n")  + "}";
						var groupBy = selectResult["groupBy"].join(" ");
						if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;

						if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";

						if(sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;


						//ORDER BY
						// console.log("ORDER ORDER", sparqlTable["subClasses"][subclass]["order"]);
						 var orderBy = sparqlTable["subClasses"][subclass]["order"];
						 if (orderBy != "") subQuery = subQuery + "\nORDER BY " + orderBy;

						 //OFFSET
						 if (sparqlTable["subClasses"][subclass]["offset"] != null) subQuery = subQuery + "\nOFFSET " + sparqlTable["subClasses"][subclass]["offset"];

						 //LIMIT
						if (sparqlTable["subClasses"][subclass]["limit"] != null) subQuery = subQuery + "\nLIMIT " + sparqlTable["subClasses"][subclass]["limit"];

						subQuery = subQuery + "}";

						if(sparqlTable["class"] == "?[ + ]")subQueries.push(subQuery);
						else whereStatements.unshift(subQuery);
					} else {
						var subQuery = "FILTER(EXISTS{" + temp.join("\n") + "})"
						whereStatements.unshift(subQuery);
					}
				}
			}
		}
	}

	if(sparqlTable["class"] == "?[ + ]"){
		whereStatements.unshift(subQueries.join("\nUNION\n"))
	}

	if(typeof sparqlTable["classTriple"] !== 'undefined')whereStatements.unshift(sparqlTable["classTriple"]);
	// console.log(subQueries);
	// remove duplicates
	var whereStatements = whereStatements.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	var filters = filters.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	var links = links.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	//link type
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "OPTIONAL"){
		whereStatements = whereStatements.concat(filters);
		whereStatements = whereStatements.concat(links);
		var tempString = "OPTIONAL{" + whereStatements.join("\n") + "}";
		whereStatements = [];
		whereStatements.push(tempString);
		filters = [];
		links = [];
	}
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "NOT"){
		whereStatements = whereStatements.concat(filters);
		whereStatements = whereStatements.concat(links);
		var tempString = "FILTER NOT EXISTS{" + whereStatements.join("\n") + "}";
		whereStatements = [];
		whereStatements.push(tempString);
		filters = [];
		links = [];
	}
	whereStatements.concat(ws);
	filters.concat(fil);
	links.concat(lin);

	return {"triples" : whereStatements, "filters" : filters, "links":links}
}

function generateSELECT(sparqlTable){
	selectStatements = [];
	aggregateSelectStatements = [];
	selectDistinctStatements = [];
	groupBy = [];

	// selectMAIN

	// simpleVariables
	for (var number in sparqlTable["selectMain"]["simpleVariables"]){
		if(typeof sparqlTable["selectMain"]["simpleVariables"][number]["alias"] === 'string') {
			selectStatements.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
			groupBy.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
		}
	}
	for (var number in sparqlTable["selectDistinct"]["simpleVariables"]){
		if(typeof sparqlTable["selectDistinct"]["simpleVariables"][number] === 'string') {
			selectDistinctStatements.push(sparqlTable["selectDistinct"]["simpleVariables"][number]);
		}
	}

	// expressionVariables
	for (var number in sparqlTable["selectMain"]["expressionVariables"]){
		if(typeof sparqlTable["selectMain"]["expressionVariables"][number]["alias"] === 'string') {
			selectStatements.push(sparqlTable["selectMain"]["expressionVariables"][number]["alias"]);
			groupBy.push(sparqlTable["selectMain"]["expressionVariables"][number]["alias"]);
		}
	}
	for (var number in sparqlTable["selectDistinct"]["expressionVariables"]){
		if(typeof sparqlTable["selectDistinct"]["expressionVariables"][number] === 'string') {
			selectDistinctStatements.push(sparqlTable["selectDistinct"]["expressionVariables"][number]);
		}
	}

	// functionVariables
	for (var number in sparqlTable["selectMain"]["functionVariables"]){
		if(typeof sparqlTable["selectMain"]["functionVariables"][number]["alias"] === 'string') {
			selectStatements.push(sparqlTable["selectMain"]["functionVariables"][number]["alias"]);
			groupBy.push(sparqlTable["selectMain"]["functionVariables"][number]["alias"]);
		}
	}
	for (var number in sparqlTable["selectDistinct"]["functionVariables"]){
		if(typeof sparqlTable["selectDistinct"]["functionVariables"][number] === 'string') {
			selectDistinctStatements.push(sparqlTable["selectDistinct"]["functionVariables"][number]);
		}
	}

	//variable names
	if(typeof sparqlTable["variableName"] !== 'undefined') {
		selectStatements.push(sparqlTable["variableName"]);
		groupBy.push(sparqlTable["variableName"]);
		selectDistinctStatements.push(sparqlTable["variableName"]);
	}
	if(typeof sparqlTable["linkVariableName"] !== 'undefined') selectStatements.push(sparqlTable["linkVariableName"]);

	// aggrigateVariables
	for (var number in sparqlTable["selectMain"]["aggrigateVariables"]){
		if(typeof sparqlTable["selectMain"]["aggrigateVariables"][number]["alias"] === 'string') aggregateSelectStatements.push("("+ sparqlTable["selectMain"]["aggrigateVariables"][number]["value"] + " AS " + sparqlTable["selectMain"]["aggrigateVariables"][number]["alias"] + ")");
	}
	for (var number in sparqlTable["selectDistinct"]["aggrigateVariables"]){
		if(typeof sparqlTable["selectDistinct"]["aggrigateVariables"][number] === 'string') {
			selectDistinctStatements.push(sparqlTable["selectDistinct"]["aggrigateVariables"][number]);
		}
	}

	// remove duplicates
	var groupBy = groupBy.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var selectStatements = selectStatements.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var aggregateSelectStatements = aggregateSelectStatements.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var selectDistinctStatements = selectDistinctStatements.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	if(typeof sparqlTable["subClasses"] !=='undefined'){
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object' && sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true) {
				var temp = generateSELECT(sparqlTable["subClasses"][subclass]);
				selectStatements = selectStatements.concat(temp["select"]);
				selectDistinctStatements = selectDistinctStatements.concat(temp["selectDistinct"]);
				aggregateSelectStatements = aggregateSelectStatements.concat(temp["aggregate"]);
				groupBy = groupBy.concat(temp["groupBy"]);
			}
		}
	}

	return {"select":selectStatements, "selectDistinct":selectDistinctStatements, "aggregate":aggregateSelectStatements, "groupBy":groupBy};
}
