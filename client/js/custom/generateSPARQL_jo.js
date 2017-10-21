Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

  ExecuteSPARQL_from_diagram: function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    var queries = genAbstractQueryForElementList(elems_in_diagram_ids);
    // ErrorHandling - just one query at a moment allowed
    if (queries.length==0) {
       Interpreter.showErrorMsg("No queries found.", -3);
       return;
    } else if (queries.length>1) {
       Interpreter.showErrorMsg("More than one query found.", -3);
       return;
    };
    _.each(queries,function(q) {
         //console.log(JSON.stringify(q,null,2));
     var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
		 var rootClass = abstractQueryTable["root"];
		 var result = generateSPARQLtext(abstractQueryTable);
		 console.log(result);
		 Session.set("generatedSparql", result);

     executeSparqlString(result);
    })
  },

  ExecuteSPARQL_from_selection: function() {
    var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());

    var queries = genAbstractQueryForElementList(elem_ids);
    // ErrorHandling - just one query at a moment allowed
    if (queries.length==0) {
       Interpreter.showErrorMsg("No queries found.", -3);
       return;
    } else if (queries.length>1) {
       Interpreter.showErrorMsg("More than one query found.", -3);
       return;
    };
    _.each(queries,function(q) {
         //console.log(JSON.stringify(q,null,2));
     var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
		 var rootClass = abstractQueryTable["root"];
		 var result = generateSPARQLtext(abstractQueryTable);
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
  
  GenerateSPARQL_from_diagram_for_all_queries: function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    GenerateSPARQL_for_all_queries(elems_in_diagram_ids)
  },

  ExecuteSPARQL_from_text: function(text, paging_info) {
      executeSparqlString(text, paging_info);
  },
});


// generate SPARQL for given id-s
function GenerateSPARQL_for_ids(list_of_ids) {
  Interpreter.destroyErrorMsg();
  var queries = genAbstractQueryForElementList(list_of_ids);
  // ErrorHandling - just one query at a moment allowed
  if (queries.length==0) {
     Interpreter.showErrorMsg("No queries found.", -3);
     return;
  } else if (queries.length>1) {
     Interpreter.showErrorMsg("More than one query found.", -3);
     return;
  };
  // goes through all queries found within the list of VQ element ids
  _.each(queries, function(q) {
       //console.log(JSON.stringify(q,null,2));
   var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);
   var rootClass = abstractQueryTable["root"];
   var result = generateSPARQLtext(abstractQueryTable);
   console.log(result);
   Session.set("generatedSparql", result);
   // Interpreter.destroyErrorMsg();
  })
}

// string, {limit: , offset:, total_rows:} -->
// Executes the given Sparql end shows result in the GUI
function executeSparqlString(sparql, paging_info) {
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
                        paging_info: paging_info
              },
           };
  //console.log(list);
  Utilities.callMeteorMethod("executeSparql", list, function(res) {
    if (res.status == 200) {
      //console.log(res.result);
      Session.set("executedSparql", res.result);
      Interpreter.destroyErrorMsg();
    } else {
      Session.set("executedSparql", {limit_set:false, number_of_rows:0});
      //console.error(res);
      if (res.status==503) {
          Interpreter.showErrorMsg("SPARQL execution failed: most probably the endpoint is not reachable.",-3)
      } else if (res.status==504) {
          Interpreter.showErrorMsg("SPARQL execution results unreadable.",-3)
      } else {
          var msg = ".";
          if (res.error && res.error.response) {
             msg = ": "+res.error.response.content;
          };
          Interpreter.showErrorMsg("SPARQL execution failed" + msg,-3);
      };

    }
  })
}


// generate SPARQL for all queries
function GenerateSPARQL_for_all_queries(list_of_ids) {
  Interpreter.destroyErrorMsg();
  var queries = genAbstractQueryForElementList(list_of_ids);

  // goes through all queries found within the list of VQ element ids
  _.each(queries, function(q) {
       //console.log(JSON.stringify(q,null,2));
   var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);

   var result = generateSPARQLtext(abstractQueryTable);
   console.log(result);
   
   Session.set("generatedSparql", result);
   // Interpreter.destroyErrorMsg();
  })
}

//generate table with unique class names in form [_id] = class_unique_name
//rootClass - abstract syntax table starting with 'rootClass' object
function generateIds(rootClass){
	var counter = 0;
	var idTable = [];
	var referenceTable = [];

	//add root class unique name
	var rootClassId = rootClass["instanceAlias"];
	if(rootClassId == null) rootClassId = rootClass["identification"]["localName"];
	//set rootClassId to "expr" if no class name
	if(rootClassId == null || rootClassId == "(no_class)") rootClassId = "expr";
	if(rootClass["isVariable"] == true) rootClassId = "_" + rootClass["variableName"];
	idTable[rootClass["identification"]["_id"]] = rootClassId;
	
	referenceTable[rootClassId] = [];
	referenceTable[rootClassId]["classes"] = [];
	
	//go through all root class children classes
	_.each(rootClass["children"],function(subclazz) {
		var temp = generateClassIds(subclazz, idTable, counter, rootClass["identification"]["_id"]);
		idTable.concat(temp["idTable"]);
		referenceTable[rootClassId]["classes"].push(temp["referenceTable"]);
	})
	return {idTable:idTable, referenceTable:referenceTable};
}



// generate table with unique class names in form [_id] = class_unique_name
// clazz - abstract syntax table starting with given class object
// idTable - table with unique class names, generated so far
// counter - counter for classes with equals names
// parentClassId - parent class identificator
function generateClassIds(clazz, idTable, counter, parentClassId){
	var referenceTable = [];
	
	// if instance if defined, use it
	if(clazz["instanceAlias"] != null) idTable[clazz["identification"]["_id"]] = clazz["instanceAlias"];
	else if(clazz["isVariable"] == true) idTable[clazz["identification"]["_id"]] = "_" + clazz["variableName"];
	else if(clazz["instanceAlias"] == null && (clazz["identification"]["localName"] == null || clazz["identification"]["localName"] == "" || clazz["identification"]["localName"] == "(no_class)") || typeof clazz["identification"]["URI"] === 'undefined') {
		idTable[clazz["identification"]["_id"]] = "expr_"+counter;
		counter++;
	} else if(clazz["linkIdentification"]["localName"] == "==" && typeof idTable[parentClassId] !== 'undefined') {
		idTable[clazz["identification"]["_id"]] = idTable[parentClassId];
	}
	else{
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
	var className = idTable[clazz["identification"]["_id"]];
	var linkType = "palin";
	if(clazz["linkType"] != "REQUIRED" || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) linkType = "notPlain";
	referenceTable[className] = [];
	referenceTable[className]["type"] = linkType;
	referenceTable[className]["classes"] = [];
	_.each(clazz["children"],function(subclazz) {
		var temp = generateClassIds(subclazz, idTable, counter, clazz["identification"]["_id"]);
		idTable.concat(temp["idTable"]);
		referenceTable[className]["classes"].push(temp["referenceTable"]);
	})
	return {idTable: idTable, referenceTable: referenceTable};
}

// find all prefixes used it a SPARQL query
// expressionTable - query abstract syntex table
// prefixTable - table with prefixes find so far
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

// find prefix, used most offen in query or empty prefix if it is already used
// prefixTable - table with prefixes in a query
function findEmptyPrefix(prefixTable){
	var prefix = null;

	if(typeof prefixTable[""] === 'undefined'){
		for(var key in prefixTable){
			if(typeof prefixTable[key] === 'number'){
				if(prefix == null) prefix = key;
				else if(prefixTable[key] > prefixTable[prefix]) prefix = key;
			}
		}
	} else prefix = "";
	return prefix
}

// generate SPARQL query text
// abstractQueryTable - abstract query sintex table
function generateSPARQLtext(abstractQueryTable){
		 var rootClass = abstractQueryTable["root"];
		 var symbolTable = abstractQueryTable["symbolTable"];
		 var parameterTable = abstractQueryTable["params"];
		 
 		 //generate table with unique class names in form [_id] = class_unique_name
		 var generateIdsResult = generateIds(rootClass);
		 var idTable = generateIdsResult["idTable"];
		 var referenceTable = generateIdsResult["referenceTable"];

		 //empty prefix in query
		 var emptyPrefix = findEmptyPrefix(findUsedPrefixes(rootClass, []));

		 //table with unique variable names
		 var variableNamesAll = [];
		 
		 //table with field names (attributes, aggregations)
		 var fieldNames = [];
		 
		//counter for variables with equals names
		 var counter = 0;

		 var result = forAbstractQueryTable(rootClass, null, idTable[rootClass["identification"]["_id"]], idTable, variableNamesAll, counter, [], false, emptyPrefix, fieldNames, symbolTable, parameterTable);
		 sparqlTable = result["sparqlTable"];
		 //console.log(result, JSON.stringify(sparqlTable,null,2));

		 // table with prefixes used in query
		 var prefixTable = result["prefixTable"];
		 
		 var SPARQL_text = "";
		 
		 // if root class is Union
		 if(rootClass["isUnion"] == true){
			SPARQL_text = getUNIONClasses(sparqlTable, null, null, true, referenceTable);
		 } else{
			SPARQL_text = "SELECT ";

			 //DISTINCT
			 if(rootClass["distinct"] == true && rootClass["aggregations"].length == 0) SPARQL_text = SPARQL_text + "DISTINCT ";

			 // console.log("sparqlTable", sparqlTable);
			 var selectResult = generateSELECT(sparqlTable);
			 // console.log("selectResult", selectResult);
			 var tempSelect = selectResult["select"];
			 tempSelect = tempSelect.concat(selectResult["aggregate"]);
			 
			 // remove duplicates
			 tempSelect = tempSelect.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			 });
			 
			 SPARQL_text = SPARQL_text + tempSelect.join(" ");
			 SPARQL_text = SPARQL_text + " WHERE{\n";

			 //SELECT DISTINCT
			 if(rootClass["distinct"] == true && rootClass["aggregations"].length > 0){
				 SPARQL_text = SPARQL_text + "{SELECT DISTINCT " + selectResult["innerDistinct"] + " WHERE{\n";
			 }

			  //HAVING
			 // var having = getHaving(rootClass["havingConditions"]);
			 // if(having != "") SPARQL_text = SPARQL_text + having + "\n";

			 var whereInfo = generateSPARQLWHEREInfo(sparqlTable, [], [], [], referenceTable);
			 var temp = whereInfo["triples"];
			 temp = temp.concat(whereInfo["links"]);
			 temp = temp.concat(whereInfo["filters"]);

			 var orderBy = getOrderBy(rootClass["orderings"], result["fieldNames"], rootClass["identification"]["_id"], idTable, emptyPrefix);
			 //add triples from order by
			 temp = temp.concat(orderBy["triples"]);

			 SPARQL_text = SPARQL_text + temp.join("\n")  + "}";
			 if(rootClass["distinct"] == true && rootClass["aggregations"].length > 0) SPARQL_text = SPARQL_text + "}}";
			 //GROUP BY
			 var groupBy = selectResult["groupBy"].join(" ");
			 if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;

			 if(rootClass["aggregations"].length > 0) SPARQL_text = SPARQL_text + groupBy;

			 //ORDER BY
			 
			 if (orderBy["orders"] != "") SPARQL_text = SPARQL_text + "\nORDER BY " + orderBy["orders"];

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
		 }
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
// emptyPrefix - prefix that is uset as a empty in a query
// fieldNames - all field names in a query
// symbolTable - table with symbols presented in a query
// parameterTable - table with user set SPARQL generation parameters
function forAbstractQueryTable(clazz, parentClass, rootClassId, idTable, variableNamesAll, counter, sparqlTable, underNotLink, emptyPrefix, fieldNames, symbolTable, parameterTable){
	var variableNamesClass = [];
	var prefixTable = [];
	
	var instance = idTable[clazz["identification"]["_id"]];
	
	var sparqlTable = {};
	sparqlTable["class"] = "?" + instance; // unique class name
	sparqlTable["isSimpleClassName"] = true; // if class name is simple name = true, if class name contains expression = false
	//sparqlTable["stereotype"] = clazz["stereotype"];
	sparqlTable["distinct"] = clazz["distinct"]; //value from class 'Distinct' field
	sparqlTable["agregationInside"] = false; // if class contains agregations in 'Aggregates' field and class is main class or subquery main class = true
	sparqlTable["simpleTriples"] = []; // triples for simple (field contains static attribute name) fields from 'Attributes' 
	//sparqlTable["expressionTriples"] = []; // triples for fields from 'Attributes' with expression inside, like 'a+1'
	//sparqlTable["functionTriples"] = []; // triples for fields from 'Attributes' with function expression inside, like 'SUBSTR(a,1,1)'
	sparqlTable["aggregateTriples"] = [];// triples for fields from 'Aggregates'
	sparqlTable["localAggregateSubQueries"] = []; // triples for fields from 'Attributes' with aggregation expression inside, like 'SUM(courseCredits)'
	sparqlTable["filterTriples"] = []; // triples for fields from 'Conditions'
	sparqlTable["filters"] = []; // filter expression for fields from 'Conditions'
	sparqlTable["conditionLinks"] = []; //links with condition label for given class
	sparqlTable["selectMain"] = []; // select values from given class for upper SELECT level
	sparqlTable["selectMain"]["simpleVariables"] = []; // select value for simple fields from 'Attributes' 
	//sparqlTable["selectMain"]["expressionVariables"] = []; // select value for fields from 'Attributes' with expression inside, like 'a+1'
	//sparqlTable["selectMain"]["functionVariables"] = []; // select value for fields from 'Attributes' with function expression inside, like 'SUBSTR(a,1,1)'
	sparqlTable["selectMain"]["aggregateVariables"] = []; // select value for fields from 'Aggregates'
	sparqlTable["selectMain"]["referenceVariables"] = []; // list with candidates to reference
	sparqlTable["innerDistinct"] = []; // select values from given class for upper DISTINCT level
	sparqlTable["innerDistinct"]["simpleVariables"] = []; // select value for simple fields from 'Attributes' 
	//sparqlTable["innerDistinct"]["expressionVariables"] = []; // select value for fields from 'Attributes' with expression inside, like 'a+1'
	//sparqlTable["innerDistinct"]["functionVariables"] = []; // select value for fields from 'Attributes' with function expression inside, like 'SUBSTR(a,1,1)'
	sparqlTable["innerDistinct"]["aggregateVariables"] = []; // select value for fields from 'Aggregates'
	sparqlTable["fullSPARQL"] = clazz["fullSPARQL"]; // SPARQL from 'FullSPARQL' field
	sparqlTable["isUnion"] = clazz["isUnion"]; // label if class is union
	sparqlTable["isUnit"] = clazz["isUnit"]; // label if class in unit
	sparqlTable["variableReferenceCandidate"] = []; // list with candidates to reference
	
	var classSimpleTriples = [];
	var classExpressionTriples = [];
	var classFunctionTriples = [];
	
	
	if(clazz["isVariable"] == true) {
		sparqlTable["classTriple"] = "?" + instance + " a ?" + clazz["variableName"]+ ".";
		if(underNotLink != true)sparqlTable["variableName"] = "?" + clazz["variableName"];
	}
	else if(clazz["identification"]["localName"] != "[ ]" && clazz["isUnion"] != true && clazz["isUnit"] != true && clazz["identification"]["localName"] != "[ + ]" && clazz["identification"]["localName"] != null && clazz["identification"]["localName"] != "" && clazz["identification"]["localName"] != "(no_class)") {

		var resultClass = parse_attrib(clazz["identification"]["parsed_exp"], clazz["instanceAlias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable);
		counter = resultClass["counter"]
		var temp = [];

		for (var triple in resultClass["triples"]){
			if(typeof resultClass["triples"][triple] === 'string')temp.push(resultClass["triples"][triple]);
		}
		if(resultClass["isAggregate"] == true || resultClass["isExpression"] == true || resultClass["isFunction"] == true){
			sparqlTable["isSimpleClassName"] = false;
			var tempTripleTable = [];
			tempTripleTable["bind"] = "BIND(" + resultClass["exp"] + " AS ?" + instance + ")";
			//sparqlTable["expressionTriples"].push(tempTripleTable);
			classExpressionTriples.push(tempTripleTable);
		}
		sparqlTable["classTriple"] = temp.join("\n"); // triples for class name
		
		// sparqlTable["classTriple"] = "?" + instance + " a " + getPrefix(emptyPrefix, clazz["identification"]["Prefix"]) + ":" + clazz["identification"]["localName"] + ".";
		var namespace = clazz["identification"]["Namespace"]
		if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
		if(typeof clazz["identification"]["Prefix"] !== 'undefined')prefixTable[getPrefix(emptyPrefix, clazz["identification"]["Prefix"]) +":"] = "<"+namespace+">";
	}
	
	
		
	

	//attributes
	_.each(clazz["fields"],function(field) {
		if(clazz["isUnit"] == true && field["exp"].match("^[a-zA-Z0-9_]+$")){
			sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?"+field["exp"], "value" : "?"+field["exp"]});
		} else {
			var result = parse_attrib(field["parsed_exp"], field["alias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, field["isInternal"], parameterTable, idTable);
			//console.log("ATTRIBUTE", result);
			sparqlTable["variableReferenceCandidate"].concat(result["referenceCandidateTable"]);
			for (var reference in result["referenceCandidateTable"]){
				if(typeof result["referenceCandidateTable"][reference] === 'string') sparqlTable["variableReferenceCandidate"].push(result["referenceCandidateTable"][reference])
			}
			for (var reference in result["references"]){
				if(typeof result["references"][reference] === 'string') sparqlTable["selectMain"]["referenceVariables"].push(result["references"][reference]);
			}
			
			counter = result["counter"]
			
			for (var attrname in result["variableNamesClass"]) { 
				if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname]; 
				if(typeof fieldNames[attrname] === 'undefined') fieldNames[attrname] = [];
				if(typeof result["variableNamesClass"][attrname] === 'object')fieldNames[attrname][clazz["identification"]["_id"]] = result["variableNamesClass"][attrname]["alias"]
			}
			for (var prefix in result["prefixTable"]) { 
				if(typeof result["prefixTable"][prefix] === 'string') prefixTable[prefix] = result["prefixTable"][prefix];
			}

			var alias = field["alias"];
			if(alias == "") {
				alias = "expr_" + counter;
				counter++;
			} else {
				if(typeof fieldNames[alias] === 'undefined') fieldNames[alias] = [];
				fieldNames[alias][clazz["identification"]["_id"]] = alias;
			}
			
			//agregation in class
			if(result["isAggregate"] == true) {
				sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
				
				//local Aggregation
				tempTripleTable = []
				for (var triple in result["triples"]){
					if(typeof result["triples"][triple] === 'string') tempTripleTable.push(result["triples"][triple]);
				}

				var uniqueTriples = tempTripleTable.filter(function (el, i, arr) {
					return arr.indexOf(el) === i;
				});
				var rootClass = "?" + rootClassId + " ";
				if(clazz["isUnion"] == true || clazz["isUnit"] == true) rootClass = "";
				var localAggregation = "{SELECT " + rootClass + "(" + result["exp"] + " AS ?" + alias + ") WHERE{";
				
				if(field["requireValues"] != true && clazz["identification"]["localName"] != "(no_class)") localAggregation = localAggregation + sparqlTable["classTriple"] + " OPTIONAL{";
				
				localAggregation = localAggregation + uniqueTriples.join(" ");
				
				if(field["requireValues"] != true) localAggregation = localAggregation + "}";
				
				localAggregation = localAggregation +"} GROUP BY ?" + rootClassId +"}";
				sparqlTable["localAggregateSubQueries"].push(localAggregation);
				//requireValues
			}

			//function in expression
			else if(result["isFunction"] == true) {
				//functionTriples
				//sparqlTable["functionTriples"].push(getTriple(result, alias, field["requireValues"], true));
				classFunctionTriples.push(getTriple(result, alias, field["requireValues"], true));

				//MAIN SELECT function variables (not undet NOT link and is not internal)
				if(underNotLink != true && field["isInternal"] != true){
					sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
					//sparqlTable["selectMain"]["functionVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
					for (var variable in result["variables"]){
						//if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["functionVariables"].push(result["variables"][variable]);
						if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["simpleVariables"].push(result["variables"][variable]);
					}
				}
			}

			//expression in expression
			else if(result["isExpression"] == true) {
				//expressionTriples
				//sparqlTable["expressionTriples"].push(getTriple(result, alias, field["requireValues"], true));
				classExpressionTriples.push(getTriple(result, alias, field["requireValues"], true));

				// MAIN SELECT expression variables (not undet NOT link and is not internal)
				if(underNotLink != true && field["isInternal"] != true){
					//sparqlTable["selectMain"]["expressionVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
					sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + alias, "value" : result["exp"]});
					for (var variable in result["variables"]){
						//if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["expressionVariables"].push(result["variables"][variable]);
						if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["simpleVariables"].push(result["variables"][variable]);
					}
				}
			}
			//simple triples
			else {
					alias = result["exp"];
					var tempTripleTable = [];

					if(field["requireValues"] == true) tempTripleTable["requireValues"] = true;
					tempTripleTable["triple"] = [];
					for (var triple in result["triples"]){
						if(typeof result["triples"][triple] === 'string')tempTripleTable["triple"].push(result["triples"][triple]);
					}
					//sparqlTable["simpleTriples"].push(tempTripleTable);
					classSimpleTriples.push(tempTripleTable);

					// MAIN SELECT simple variables (not undet NOT link and is not internal)
					if(underNotLink != true && (field["isInternal"] != true || field["exp"].startsWith("?"))){
						sparqlTable["selectMain"]["simpleVariables"].push({"alias": alias, "value" : alias});
						for (var variable in result["variables"]){
							if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["simpleVariables"].push(result["variables"][variable]);
						}
					} 
			}
		}
	})
	classSimpleTriples = classSimpleTriples.concat(classExpressionTriples);
	classSimpleTriples = classSimpleTriples.concat(classFunctionTriples);
	sparqlTable["simpleTriples"] = classSimpleTriples;
	
	//conditions
	_.each(clazz["conditions"],function(condition) {
		var result = parse_filter(condition["parsed_exp"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, sparqlTable["classTriple"], parameterTable, idTable);
		//console.log("FILTER", result);
		for (var reference in result["referenceCandidateTable"]){
			if(typeof result["referenceCandidateTable"][reference] === 'string')sparqlTable["variableReferenceCandidate"].push(result["referenceCandidateTable"][reference])
		};
		for (var reference in result["references"]){
			if(typeof result["references"][reference] === 'string') sparqlTable["selectMain"]["referenceVariables"].push(result["references"][reference]);
		}

		counter = result["counter"]
		// for (var attrname in result["variableNamesClass"]) { variableNamesClass[attrname] = result["variableNamesClass"][attrname]; }
		for (var attrname in result["variableNamesClass"]) { 
				if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname]; 
		}  
		for (var attrname in result["expressionLevelNames"]) {
			if(typeof result["expressionLevelNames"][attrname] === 'string') variableNamesAll[attrname] = result["expressionLevelNames"][attrname]; 
		}
		for (var prefix in result["prefixTable"]) {
			if(typeof result["prefixTable"][prefix] === 'string')  prefixTable[prefix] = result["prefixTable"][prefix]; 
		}

		var tempTripleTable = [];
		tempTripleTable["triple"] = [];
		for (var triple in result["triples"]){
			if(typeof result["triples"][triple] === 'string') tempTripleTable["triple"].push(result["triples"][triple]);
		}
		sparqlTable["filterTriples"].push(tempTripleTable);
		if(result["exp"] != "") sparqlTable["filters"].push("FILTER(" + result["exp"] + ")");

		// console.log("CONDITION", result["exp"], result, instance, sparqlTable["classTriple"]);
	})
 
	//aggregations
	_.each(clazz["aggregations"],function(field) {
		
		var result = parse_attrib(field["parsed_exp"], field["alias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable);
		counter = result["counter"];
		for (var attrname in result["variableNamesClass"]) { 
			if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname]; 
		}
		for (var prefix in result["prefixTable"]) {
			if(typeof result["prefixTable"][prefix] === 'string') prefixTable[prefix] = result["prefixTable"][prefix];
		}
		var alias = field["alias"];
		if(alias == "") {
			if(result["isExpression"] == false && result["isFunction"] == false) {
				var tempAlias = result["exp"].substring(result["exp"].indexOf("(")+2, result["exp"].indexOf(")")) + "_" + result["exp"].substring(0, result["exp"].indexOf("("));
				if(typeof variableNamesAll[tempAlias] !== 'undefined') alias = tempAlias + "_" + counter;
				else alias = tempAlias;
				variableNamesAll[tempAlias] = tempAlias;
			} else {
				alias = "expr_" + counter;
				counter++;
			}
		}
		if(typeof fieldNames[alias] === 'undefined') fieldNames[alias] = [];
		fieldNames[alias][clazz["identification"]["_id"]] = alias;

		//aggregateTriples only in main class or subselect main class
		if(rootClassId == idTable[clazz["identification"]["_id"]] || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) {
			sparqlTable["agregationInside"] = true;
			sparqlTable["aggregateTriples"].push(getTriple(result, alias, field["requireValues"], false));
			//MAIN SELECT agregate variables
			sparqlTable["selectMain"]["aggregateVariables"].push({"alias": "?" + alias, "value" : result["exp"]});

			for (var variable in result["variables"]){
				if(typeof result["variables"][variable] === 'string') sparqlTable["innerDistinct"]["aggregateVariables"].push(result["variables"][variable]);
			}
		}

	})


	//subClasses
	if(clazz["children"].length > 0){
		sparqlTable["subClasses"] = []; // class all sub classes
	};
	for (var attrname in variableNamesClass) {
		if(typeof variableNamesClass[attrname] === 'object' || typeof variableNamesClass[attrname] === 'string') variableNamesAll[attrname] = variableNamesClass[attrname]["alias"]; 
	}
	_.each(clazz["children"],function(subclazz) {
		if(subclazz["linkType"] == 'NOT') underNotLink = true;
		var temp = forAbstractQueryTable(subclazz, clazz, rootClassId, idTable, variableNamesAll, counter, sparqlTable, underNotLink, emptyPrefix, fieldNames, symbolTable, parameterTable);
		counter = temp["counter"];
		for (var attrname in temp["variableNamesAll"]) {
			if(typeof temp["variableNamesAll"][attrname] === 'string') variableNamesClass[attrname] = {"alias":temp["variableNamesAll"][attrname], "isvar" : false}; 
		}
		for (var prefix in temp["prefixTable"]) { 
			if(typeof temp["prefixTable"][prefix] === 'string') prefixTable[prefix] = temp["prefixTable"][prefix];
		}
		underNotLink = false;
		//link triple
		//if(typeof subclazz["linkIdentification"]["localName"] !== 'undefined'){
			
			if(subclazz["linkIdentification"]["localName"] != null && subclazz["linkIdentification"]["localName"] != "++"){
				var subject, preditate, object;
				if(subclazz["linkIdentification"]["localName"].startsWith('?')) {
					preditate = " " + subclazz["linkIdentification"]["localName"];
					if(subclazz["linkType"] != 'NOT') temp["sparqlTable"]["linkVariableName"] = subclazz["linkIdentification"]["localName"];
				} else {
					preditate = " " + getPrefix(emptyPrefix, subclazz["linkIdentification"]["Prefix"]) +":" + subclazz["linkIdentification"]["localName"];
					
					if(typeof subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"] !== 'undefined' && subclazz["linkIdentification"]["localName"] != "=="){
						preditate = " " + getPath(subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"]);
					}
					var namespace = subclazz["linkIdentification"]["Namespace"]
					if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
					if(subclazz["linkIdentification"]["localName"] != "==" && typeof subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"] === 'undefined') prefixTable[getPrefix(emptyPrefix, subclazz["linkIdentification"]["Prefix"])+":"] = "<"+namespace+">";
				}
				if(subclazz["isInverse"] == true) {
					if(clazz["isUnion"] != true) object = instance;
					else if (clazz["isUnion"] == true && parentClass == null) object = null;
					else object = idTable[parentClass["identification"]["_id"]];
					subject = idTable[subclazz["identification"]["_id"]];
				} else {
					if(clazz["isUnion"] != true) subject = instance;
					else if (clazz["isUnion"] == true && parentClass == null) subject = null;
					else subject = idTable[parentClass["identification"]["_id"]];
					object = idTable[subclazz["identification"]["_id"]];
				}
				// if is global subQuery then no need in link between classes
				if(subclazz["linkIdentification"]["localName"] != "==" && subject != null && object != null){
					temp["sparqlTable"]["linkTriple"] = "?" + subject +  preditate + " ?" + object + ".";
				}
				// if(subclazz["linkIdentification"]["localName"] == "==") sparqlTable["filters"].push("FILTER(" + "?" + subject + " = " + "?" + object +")");
				if(subclazz["linkIdentification"]["localName"] == "==") temp["sparqlTable"]["equalityLink"] = true;
			}

			temp["sparqlTable"]["linkType"] = subclazz["linkType"];
			if(subclazz["identification"]["localName"] == "(no_class)" || subclazz["identification"]["localName"] == "" || subclazz["identification"]["localName"] == null) temp["sparqlTable"]["linkType"] = "REQUIRED";
			temp["sparqlTable"]["isSubQuery"] = subclazz["isSubQuery"];
			temp["sparqlTable"]["isGlobalSubQuery"] = subclazz["isGlobalSubQuery"];

			if(subclazz["isSubQuery"] == true || subclazz["isGlobalSubQuery"] == true){
				 //HAVING
				// temp["sparqlTable"]["having"] = getHaving(subclazz["havingConditions"]);

				//ORDER BY
				temp["sparqlTable"]["order"] = getOrderBy(subclazz["orderings"], fieldNames, subclazz["identification"]["_id"], idTable, emptyPrefix);
				 //OFFSET
				temp["sparqlTable"]["offset"] = subclazz["offset"];

				 //LIMIT
				 temp["sparqlTable"]["limit"] = subclazz["limit"];
			}
		//}

		sparqlTable["subClasses"].push(temp["sparqlTable"]);
	})

	//conditionLinks
	_.each(clazz["conditionLinks"],function(condLink) {
		if(clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) sparqlTable["selectMain"]["simpleVariables"].push({"alias": "?" + idTable[condLink["target"]], "value" : "?" + idTable[condLink["target"]]});
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
		var namespace = condLink["identification"]["Namespace"]
		if(typeof namespace !== 'undefined' && namespace.endsWith("/") == false && namespace.endsWith("#") == false) namespace = namespace + "#";
		prefixTable[getPrefix(emptyPrefix, condLink["identification"]["Prefix"]) +":"] = "<"+namespace+">";
	})

	for (var attrname in variableNamesClass) {
		if(typeof variableNamesClass[attrname] === 'object' || typeof variableNamesClass[attrname] === 'string')variableNamesAll[attrname] = variableNamesClass[attrname]["alias"];
	}
	return {variableNamesAll:variableNamesAll, sparqlTable:sparqlTable, prefixTable:prefixTable, counter:counter, fieldNames:fieldNames};
}


function getOrderBy(orderings, fieldNames, rootClass_id, idTable, emptyPrefix){
	var warnings = [];
	var orderTable = [];
	var orderTripleTable = [];
	_.each(orderings,function(order) {
		var descendingStart = "";
		var descendingEnd = "";
		if(order["isDescending"] == true) {
			descendingStart = "DESC("
			descendingEnd = ")"
		}
		if(typeof fieldNames[order["exp"]] !== 'undefined'){
			var result = fieldNames[order["exp"]][rootClass_id];
			if(typeof result === 'undefined'){
				for (var ordr in fieldNames[order["exp"]]) { 
					result = fieldNames[order["exp"]][ordr];
					break;
				}
			}
			orderTable.push(descendingStart +  "?" + result + descendingEnd + " ");
		 } else {
			 var result = parse_attrib(order["parsed_exp"], null, idTable[rootClass_id], [], [], 0, emptyPrefix, [], false, [], idTable);
			 if(result["isAggregate"] == false && result["isExpression"] == false && result["isFunction"] == false && result["triples"].length > 0){
				 orderTable.push(descendingStart +  result["exp"] + descendingEnd + " ");
				 orderTripleTable.push(result["triples"]);
			 } else {warnings.push("order by allowed only over explicit selection fields, " + order["exp"] + " is not a selection field");}
		 } 
	})
	
	if(warnings.length > 0) Interpreter.showErrorMsg(warnings.join("\n"), -3);
	
	orderTable = orderTable.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	return {"orders":orderTable.join(" "), "triples":orderTripleTable};
}

// generete HAVING info
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

// genrerate SPARQL WHERE info
// sparqlTable - table with sparql parts
function generateSPARQLWHEREInfo(sparqlTable, ws, fil, lin, referenceTable){

	var whereInfo = [];
	var filters = [];
	var links = [];
	var bind = [];

	// whereInfo.push(sparqlTable["classTriple"]);

	// simpleTriples
	for (var expression in sparqlTable["simpleTriples"]){
		if(typeof sparqlTable["simpleTriples"][expression] === 'object'){
			for (var triple in sparqlTable["simpleTriples"][expression]["triple"]){
				if(typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') {
					if(sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('BIND(') || sparqlTable["simpleTriples"][expression]["triple"][triple].startsWith('VALUES ?')) whereInfo.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
					else if(sparqlTable["simpleTriples"][expression]["requireValues"] == true) whereInfo.push(sparqlTable["simpleTriples"][expression]["triple"][triple]);
					else whereInfo.push("OPTIONAL{" + sparqlTable["simpleTriples"][expression]["triple"][triple] + "}");
				}
			}
		} 
		if(typeof sparqlTable["simpleTriples"][expression]["bind"]  === 'string') bind.push(sparqlTable["simpleTriples"][expression]["bind"]);

		if(typeof sparqlTable["simpleTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["simpleTriples"][expression]["bound"]);
		
	}
	// expressionTriples
	/*for (var expression in sparqlTable["expressionTriples"]){
		if(typeof sparqlTable["expressionTriples"][expression] === 'object'){
			for (var triple in sparqlTable["expressionTriples"][expression]["triple"]){
				if(typeof sparqlTable["expressionTriples"][expression]["triple"][triple] === 'string') whereInfo.push("OPTIONAL{" + sparqlTable["expressionTriples"][expression]["triple"][triple] + "}");
			}
		}
		if(typeof sparqlTable["expressionTriples"][expression]["bind"]  === 'string') whereInfo.push(sparqlTable["expressionTriples"][expression]["bind"]);
		if(typeof sparqlTable["expressionTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["expressionTriples"][expression]["bound"]);
	}

	// functionTriples
	for (var expression in sparqlTable["functionTriples"]){
		if(typeof sparqlTable["functionTriples"][expression] === 'object'){
			for (var triple in sparqlTable["functionTriples"][expression]["triple"]){
				if(typeof sparqlTable["functionTriples"][expression]["triple"][triple] === 'string') whereInfo.push("OPTIONAL{" + sparqlTable["functionTriples"][expression]["triple"][triple] + "}");
			}
		}
		if(typeof sparqlTable["functionTriples"][expression]["bind"]  === 'string') whereInfo.push(sparqlTable["functionTriples"][expression]["bind"]);
		if(typeof sparqlTable["functionTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["functionTriples"][expression]["bound"]);
	}*/

	// aggregateTriples
	for (var expression in sparqlTable["aggregateTriples"]){
		if(typeof sparqlTable["aggregateTriples"][expression] === 'object'){
			for (var triple in sparqlTable["aggregateTriples"][expression]["triple"]){
				if(typeof sparqlTable["aggregateTriples"][expression]["triple"][triple] === 'string') whereInfo.push("OPTIONAL{" + sparqlTable["aggregateTriples"][expression]["triple"][triple] + "}");
			}
		}
		// if(typeof sparqlTable["aggregateTriples"][expression]["bind"]  === 'string') whereInfo.push(sparqlTable["aggregateTriples"][expression]["bind"]);
		// if(typeof sparqlTable["aggregateTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["aggregateTriples"][expression]["bound"]);
	}

	// localAggregateSubQueries
	for (var expression in sparqlTable["localAggregateSubQueries"]){
		if(typeof sparqlTable["localAggregateSubQueries"][expression] === 'string'){
			whereInfo.push(sparqlTable["localAggregateSubQueries"][expression]);
		}
	}

	// filterTriples
	for (var expression in sparqlTable["filterTriples"]){
		if(typeof sparqlTable["filterTriples"][expression] === 'object'){
			for (var triple in sparqlTable["filterTriples"][expression]["triple"]){
				 //if(typeof sparqlTable["filterTriples"][expression]["triple"][triple] === 'string') whereInfo.push("OPTIONAL{" + sparqlTable["filterTriples"][expression]["triple"][triple] + "}");
				if(typeof sparqlTable["filterTriples"][expression]["triple"][triple] === 'string') whereInfo.push(sparqlTable["filterTriples"][expression]["triple"][triple]);
			}
		}
		if(typeof sparqlTable["filterTriples"][expression]["bind"]  === 'string') bind.push(sparqlTable["filterTriples"][expression]["bind"]);
		if(typeof sparqlTable["filterTriples"][expression]["bound"]  === 'string') whereInfo.push(sparqlTable["filterTriples"][expression]["bound"]);
	}
 
	whereInfo = whereInfo.concat(bind);
 
	//filters
	for (var expression in sparqlTable["filters"]){
		if(typeof sparqlTable["filters"][expression] === 'string'){
			filters.push(sparqlTable["filters"][expression]);
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

	if(sparqlTable["fullSPARQL"]!= null){
		if(sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") == true) whereInfo.unshift("{" + sparqlTable["fullSPARQL"] + "}");
	}
	
	if(typeof sparqlTable["subClasses"] !=='undefined'){
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				if(sparqlTable["subClasses"][subclass]["isUnion"] == true) whereInfo.push(getUNIONClasses(sparqlTable["subClasses"][subclass], sparqlTable["class"], sparqlTable["classTriple"], false, referenceTable));
				else if(sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
					var temp = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], whereInfo, filters, links, referenceTable);
					filters = filters.concat(temp["filters"]);

					links = links.concat(temp["links"]);
					whereInfo = whereInfo.concat(temp["triples"]);
				}else {
					//sub selects
					var selectResult = generateSELECT(sparqlTable["subClasses"][subclass]);

					//reference candidates
					var refTable = [];
					for (var ref in selectResult["variableReferenceCandidate"]){
						if(typeof selectResult["variableReferenceCandidate"][ref] === 'string'){
							if(checkIfReference(selectResult["variableReferenceCandidate"][ref], referenceTable, sparqlTable["subClasses"][subclass]["class"], true) == true) refTable.push("?" + selectResult["variableReferenceCandidate"][ref]);
						}
					}
					
					var wheresubInfo = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], [], [], [], referenceTable);

					var temp = wheresubInfo["triples"];
					temp = temp.concat(wheresubInfo["links"]);
					temp = temp.concat(wheresubInfo["filters"]);

					var tempSelect = refTable;
					tempSelect= tempSelect.concat(selectResult["select"]);
					tempSelect= tempSelect.concat(selectResult["aggregate"]);
					
					if(sparqlTable["subClasses"][subclass]["linkType"] != "NOT"){
						var tempTable = selectResult["select"];
						tempTable = tempTable.concat(selectResult["aggregate"]);
						if(tempTable.length > 0 || sparqlTable["subClasses"][subclass]["equalityLink"] == true){
							
							var subQuery = "{SELECT " ;

							//DISTINCT
							if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";
							
							var parentClass = "";
							if(sparqlTable["subClasses"][subclass]["linkTriple"] != null || sparqlTable["subClasses"][subclass]["equalityLink"] == true) {
								parentClass = sparqlTable["class"] //+ " ";
								
								selectResult["groupBy"].unshift(sparqlTable["class"]);
							}
							if(sparqlTable["isUnion"] == true || sparqlTable["isUnit"] == true) parentClass = "";
							else tempSelect.unshift(parentClass);
							
							tempSelect = tempSelect.filter(function (el, i, arr) {
								return arr.indexOf(el) === i;
							});
							
							// subQuery = subQuery + parentClass + tempSelect.join(" ") + " WHERE{\n";
							subQuery = subQuery + tempSelect.join(" ") + " WHERE{\n";
							
							//SELECT DISTINCT
							if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "SELECT DISTINCT " + selectResult["innerDistinct"].join(" ") + " WHERE{\n";
							
							if(sparqlTable["subClasses"][subclass]["linkType"] == "OPTIONAL"){
								temp.push(sparqlTable["subClasses"][subclass]["classTriple"]);
							}
							
							var orderBy = sparqlTable["subClasses"][subclass]["order"];
							//ad tripoles from order by
							temp = temp.concat(orderBy["triples"])
							
							var temp = temp.filter(function (el, i, arr) {
								return arr.indexOf(el) === i;
							});
							subQuery = subQuery + temp.join("\n")  + "}";

							
							selectResult["groupBy"] = selectResult["groupBy"].concat(refTable);
							
							selectResult["groupBy"] = selectResult["groupBy"].filter(function (el, i, arr) {
								return arr.indexOf(el) === i;
							});
							
							var groupBy = selectResult["groupBy"].join(" ");
							if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;
							
							if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";
							
							if(sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;
							
							
							//ORDER BY 
							 if (orderBy["orders"] != "") subQuery = subQuery + "\nORDER BY " + orderBy["orders"];
							 
							 //OFFSET
							 if (sparqlTable["subClasses"][subclass]["offset"] != null) subQuery = subQuery + "\nOFFSET " + sparqlTable["subClasses"][subclass]["offset"];
							 
							 //LIMIT 
							if (sparqlTable["subClasses"][subclass]["limit"] != null) subQuery = subQuery + "\nLIMIT " + sparqlTable["subClasses"][subclass]["limit"];
							
							subQuery = subQuery + "}";
							
							whereInfo.unshift(subQuery);
						} else {
							var subQuery = "FILTER(EXISTS{" + temp.join("\n") + "})"
							whereInfo.unshift(subQuery);
						}
					
					} else {
						whereInfo.push("MINUS{" + temp.join("\n")+ "}");
					}
				}
			}
		}
	}

	if(typeof sparqlTable["classTriple"] !== 'undefined')whereInfo.unshift(sparqlTable["classTriple"]);

	// remove duplicates
	var whereInfo = whereInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	var filters = filters.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	var links = links.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	if(sparqlTable["fullSPARQL"]!= null){
		if(sparqlTable["fullSPARQL"].toLowerCase().startsWith("select ") != true) whereInfo.push(sparqlTable["fullSPARQL"]);
	}
	
	//link type
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "OPTIONAL"){
		whereInfo = whereInfo.concat(filters);
		whereInfo = whereInfo.concat(links);
		if(sparqlTable["isSimpleClassName"] == true){
			var tempString = "OPTIONAL{" + whereInfo.join("\n") + "}";
			whereInfo = [];
			whereInfo.push(tempString);
		} else {console.log("OPTIONAL subselect replaced with required")}
		filters = [];
		links = [];
	}
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "NOT"){
		whereInfo = whereInfo.concat(filters);
		whereInfo = whereInfo.concat(links);
		var tempString = "FILTER NOT EXISTS{" + whereInfo.join("\n") + "}";
		whereInfo = [];
		whereInfo.push(tempString);
		filters = [];
		links = [];
	}
	whereInfo.concat(ws);
	filters.concat(fil);
	links.concat(lin);

	return {"triples" : whereInfo, "filters" : filters, "links":links}
}

function checkIfReference(reference, referenceTable, subQueryMainClass, isPlain){

	for(var ref in referenceTable){
		if(typeof referenceTable[ref] === 'object'){
			if(typeof referenceTable[ref]["type"] !== 'undefined' && referenceTable[ref]["type"] == "notPlain") isPlain = false;
			if(reference == ref){
				if(isPlain == true) return true;
				else {
					if(findSubQueryMainClass(referenceTable[ref]["classes"], subQueryMainClass) == true) return true;
				}
			}else {
				var result  = false;
				for(var r in referenceTable[ref]["classes"]){
					if(typeof referenceTable[ref]["classes"][r] === 'object'){
						var tempResult = checkIfReference(reference, referenceTable[ref]["classes"][r], subQueryMainClass, isPlain);
						if(tempResult == true) result = true;
					}
				}
				if(result == true) return true;
			}
		}
	}
	return false;
}

function findSubQueryMainClass(referenceTable, subQueryMainClass){
	var result = false;
	for(var ref in referenceTable){
		if(typeof referenceTable[ref] === 'object'){
			for(var r in referenceTable[ref]){
				if(typeof referenceTable[ref][r] === 'object'){
					if("?"+r == subQueryMainClass) result = true;
					else{
						var temp = findSubQueryMainClass(referenceTable[ref][r]["classes"], subQueryMainClass);
						if(temp == true) result = true;
					}
				}
			}
		}
	}
	return result;
}

function getUNIONClasses(sparqlTable, parentClassInstance, parentClassTriple, generateUpperSelect, referenceTable){
	var whereInfo = [];
	var unionsubSELECTstaterents = [];
	if(typeof sparqlTable["subClasses"] !=='undefined'){
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				var selectResult = generateSELECT(sparqlTable["subClasses"][subclass]);

				var wheresubInfo = generateSPARQLWHEREInfo(sparqlTable["subClasses"][subclass], [], [], [], referenceTable);
				var temp = wheresubInfo["triples"];
				temp = temp.concat(wheresubInfo["links"]);
				temp = temp.concat(wheresubInfo["filters"]);

				var tempSelect = selectResult["select"];
				tempSelect= tempSelect.concat(selectResult["aggregate"]);
				
				
				if(sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
					var subQuery = "{";
					
					//union parent triple
					if(parentClassTriple != null) subQuery = subQuery + parentClassTriple + "\n";
					
					//triples
					subQuery = subQuery + temp.join("\n");
					
					subQuery = subQuery + "}";
					
					whereInfo.push(subQuery);
					
					unionsubSELECTstaterents= unionsubSELECTstaterents.concat(tempSelect);
				}else {
					if(sparqlTable["subClasses"][subclass]["linkType"] != "NOT"){	
						var subQuery = "{SELECT " ;

						//DISTINCT
						if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] != true) subQuery = subQuery + "DISTINCT ";
							
						if(parentClassInstance != null){
							subQuery = subQuery + parentClassInstance + " ";
						}
						subQuery = subQuery +  tempSelect.join(" ") + " WHERE{\n";
							
						//SELECT DISTINCT
						if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "SELECT DISTINCT " + selectResult["innerDistinct"].join(" ") + " WHERE{\n";
	
						//union parent triple
						if(parentClassTriple != null) subQuery = subQuery + parentClassTriple + "\n";
						
						var orderBy = sparqlTable["subClasses"][subclass]["order"];
						//add triples from order by
						temp = temp.concat(orderBy["triples"]);
						
						subQuery = subQuery + temp.join("\n")  + "}";
							
						var groupBy = selectResult["groupBy"].join(" ");
						if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;
							
						if(sparqlTable["subClasses"][subclass]["distinct"] == true && sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + "}";
							
						if(sparqlTable["subClasses"][subclass]["agregationInside"] == true) subQuery = subQuery + groupBy;
							
						//ORDER BY
						
						if (orderBy["orders"] != "") subQuery = subQuery + "\nORDER BY " + orderBy["orders"];
							 
						//OFFSET
						if (sparqlTable["subClasses"][subclass]["offset"] != null) subQuery = subQuery + "\nOFFSET " + sparqlTable["subClasses"][subclass]["offset"];
							 
						//LIMIT 
						if (sparqlTable["subClasses"][subclass]["limit"] != null) subQuery = subQuery + "\nLIMIT " + sparqlTable["subClasses"][subclass]["limit"];
							
						subQuery = subQuery + "}";

						whereInfo.push(subQuery);
					} else {
						whereInfo.push("MINUS{" + temp.join("\n")+ "}");
					}
				}
			}
		}
	}
	
	unionsubSELECTstaterents = unionsubSELECTstaterents.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	var returnValue = whereInfo.join("\nUNION\n");
	if(generateUpperSelect == true) returnValue = "SELECT " + unionsubSELECTstaterents.join(" ") + " WHERE{\n" + returnValue + "}";
	else if(sparqlTable["isSubQuery"] == true || sparqlTable["isGlobalSubQuery"] == true){
		if(unionsubSELECTstaterents.length > 0) returnValue = "{SELECT " + unionsubSELECTstaterents.join(" ") + " WHERE{\n" + returnValue + "}}";
		else returnValue = "FILTER(EXISTS{" + returnValue + "})";
	}
	return returnValue;
}

function generateSELECT(sparqlTable){
	selectInfo = [];
	variableReferenceInfo = [];
	aggregateSelectInfo = [];
	innerDistinctInfo = [];
	variableReferenceCandidate = [];
	// selectClasses = [];
	groupBy = [];

	// selectMAIN

	// simpleVariables
	for (var number in sparqlTable["selectMain"]["simpleVariables"]){
		if(typeof sparqlTable["selectMain"]["simpleVariables"][number]["alias"] === 'string') {
			selectInfo.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
			groupBy.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
		}
	}
	for (var number in sparqlTable["innerDistinct"]["simpleVariables"]){
		if(typeof sparqlTable["innerDistinct"]["simpleVariables"][number] === 'string') {
			innerDistinctInfo.push(sparqlTable["innerDistinct"]["simpleVariables"][number]);
		}
	}

	// expressionVariables
	/*for (var number in sparqlTable["selectMain"]["expressionVariables"]){
		if(typeof sparqlTable["selectMain"]["expressionVariables"][number]["alias"] === 'string') {
			selectInfo.push(sparqlTable["selectMain"]["expressionVariables"][number]["alias"]);
			groupBy.push(sparqlTable["selectMain"]["expressionVariables"][number]["alias"]);
		}
	}
	for (var number in sparqlTable["innerDistinct"]["expressionVariables"]){
		if(typeof sparqlTable["innerDistinct"]["expressionVariables"][number] === 'string') {
			innerDistinctInfo.push(sparqlTable["innerDistinct"]["expressionVariables"][number]);
		}
	}*/

	// functionVariables
	/*for (var number in sparqlTable["selectMain"]["functionVariables"]){
		if(typeof sparqlTable["selectMain"]["functionVariables"][number]["alias"] === 'string') {
			selectInfo.push(sparqlTable["selectMain"]["functionVariables"][number]["alias"]);
			groupBy.push(sparqlTable["selectMain"]["functionVariables"][number]["alias"]);
		}
	}
	for (var number in sparqlTable["innerDistinct"]["functionVariables"]){
		if(typeof sparqlTable["innerDistinct"]["functionVariables"][number] === 'string') {
			innerDistinctInfo.push(sparqlTable["innerDistinct"]["functionVariables"][number]);
		}
	}*/

	//variable names
	if(typeof sparqlTable["variableName"] !== 'undefined') {
		selectInfo.push(sparqlTable["variableName"]);
		groupBy.push(sparqlTable["variableName"]);
		innerDistinctInfo.push(sparqlTable["variableName"]);
	}
	if(typeof sparqlTable["linkVariableName"] !== 'undefined') selectInfo.push(sparqlTable["linkVariableName"]);

	// aggregateVariables
	for (var number in sparqlTable["selectMain"]["aggregateVariables"]){
		if(typeof sparqlTable["selectMain"]["aggregateVariables"][number]["alias"] === 'string') aggregateSelectInfo.push("("+ sparqlTable["selectMain"]["aggregateVariables"][number]["value"] + " AS " + sparqlTable["selectMain"]["aggregateVariables"][number]["alias"] + ")");
	}
	for (var number in sparqlTable["innerDistinct"]["aggregateVariables"]){
		if(typeof sparqlTable["innerDistinct"]["aggregateVariables"][number] === 'string') {
			innerDistinctInfo.push(sparqlTable["innerDistinct"]["aggregateVariables"][number]);
		}
	}

	//subQuery references
	for (var number in sparqlTable["selectMain"]["referenceVariables"]){
		if(typeof sparqlTable["selectMain"]["referenceVariables"][number] === 'string') {
			variableReferenceInfo.push(sparqlTable["selectMain"]["referenceVariables"][number]);
		}
	}
	
	//referenceCandidates
	for (var number in sparqlTable["variableReferenceCandidate"]){
		if(typeof sparqlTable["variableReferenceCandidate"][number] === 'string') {
			variableReferenceCandidate.push(sparqlTable["variableReferenceCandidate"][number]);
		}
	}
	
	// remove duplicates
	var groupBy = groupBy.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var selectInfo = selectInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var aggregateSelectInfo = aggregateSelectInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var innerDistinctInfo = innerDistinctInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var variableReferenceInfo = variableReferenceInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var variableReferenceCandidate = variableReferenceCandidate.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	if(typeof sparqlTable["subClasses"] !=='undefined'){
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object' && sparqlTable["subClasses"][subclass]["isSubQuery"] != true && sparqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true) {
				var temp = generateSELECT(sparqlTable["subClasses"][subclass]);
				selectInfo = selectInfo.concat(temp["select"]);
				variableReferenceCandidate = variableReferenceCandidate.concat(temp["variableReferenceCandidate"]);
				variableReferenceInfo = variableReferenceInfo.concat(temp["variableReference"]);
				innerDistinctInfo = innerDistinctInfo.concat(temp["innerDistinct"]);
				aggregateSelectInfo = aggregateSelectInfo.concat(temp["aggregate"]);
				groupBy = groupBy.concat(temp["groupBy"]);
				// selectClasses = selectClasses.concat(temp["classes"]);
			}
		}
	}

	return {"select":selectInfo, "innerDistinct":innerDistinctInfo, "aggregate":aggregateSelectInfo, "groupBy":groupBy, "variableReference":variableReferenceInfo, "variableReferenceCandidate":variableReferenceCandidate};
}
