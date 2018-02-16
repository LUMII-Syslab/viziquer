Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

  GenerateSQL_from_selection: function() {
    // get _id-s of selected elements - it serves as potential root Classes
    // and as allowed elements
    var editor = Interpreter.editor;
		var elem_ids = _.keys(editor.getSelectedElements());

    GenerateSQL_for_ids(elem_ids)
  },

  GenerateSQL_from_component: function() {
    var editor = Interpreter.editor;
		var elem = _.keys(editor.getSelectedElements());

    // now we should find the connected classes ...
    if (elem) {
       var selected_elem = new VQ_Element(elem[0]);
       var visited_elems = {};

       function GetComponentIds(vq_elem) {
           visited_elems[vq_elem._id()]=true;
           _.each(vq_elem.getLinks(),function(link) {
               if (!visited_elems[link.link._id()]) {
                 visited_elems[link.link._id()]=true;
                 var next_el = null;
                 if (link.start) {
                   next_el=link.link.getStartElement();
                 } else {
                   next_el=link.link.getEndElement();
                 };
                 if (!visited_elems[next_el._id()]) {
                    GetComponentIds(next_el);
                 };
               };
           });
       };

       GetComponentIds(selected_elem);

       var elem_ids = _.keys(visited_elems);
       GenerateSQL_for_ids(elem_ids);
    } else {
      // nothing selected
    }

  },
  GenerateSQL_from_diagram: function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    GenerateSQL_for_ids(elems_in_diagram_ids)
  },
  
  GenerateSQL_from_diagram_for_all_queries: function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    GenerateSQL_for_all_queries(elems_in_diagram_ids);
  },

});


// generate SPARQL for given id-s
function GenerateSQL_for_ids(list_of_ids) {
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
   var resultSQL = generateSQLtext(abstractQueryTable);
   
    console.log(resultSQL);
   Session.set("generatedSparql", resultSQL);
   $('#vq-tab a[href="#sparql"]').tab('show');
   // Interpreter.destroyErrorMsg();
  })
}



// generate SPARQL for all queries
function GenerateSQL_for_all_queries(list_of_ids) {
  Interpreter.destroyErrorMsg();
  var queries = genAbstractQueryForElementList(list_of_ids);

  // goes through all queries found within the list of VQ element ids
  _.each(queries, function(q) {
       //console.log(JSON.stringify(q,null,2));
   var abstractQueryTable = resolveTypesAndBuildSymbolTable(q);

   var result = generateSQLtext(abstractQueryTable);
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
	if(rootClass["isVariable"] == true && rootClass["instanceAlias"] == null) rootClassId = "_" + rootClass["variableName"];
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

// generate SQL query text
// abstractQueryTable - abstract query sintex table
function generateSQLtext(abstractQueryTable){
		 var rootClass = abstractQueryTable["root"];
		 var symbolTable = abstractQueryTable["symbolTable"];
		 var parameterTable = abstractQueryTable["params"];
		 
 		 //generate table with unique class names in form [_id] = class_unique_name
		 var generateIdsResult = generateIds(rootClass);
		 var idTable = generateIdsResult["idTable"];
		 var referenceTable = [];

		 //table with unique variable names
		 var variableNamesAll = [];
		 
		 //table with field names (attributes, aggregations)
		 var fieldNames = [];
		 
		//counter for variables with equals names
		 var counter = 0;

		  var result = forAbstractQueryTableSQl(rootClass, null, idTable[rootClass["identification"]["_id"]], idTable, variableNamesAll, counter, [], false, "", fieldNames, symbolTable, parameterTable);
		  var sqlTable = result["sqlTable"];
		// console.log(result, JSON.stringify(sqlTable,null,2));

		 // table with prefixes used in query
		 //var prefixTable = result["prefixTable"];
		 
		 var SQL_text = "";
		 

			SQL_text = "SELECT ";

			 //DISTINCT
			 if(rootClass["distinct"] == true && rootClass["aggregations"].length == 0) SQL_text = SQL_text + "DISTINCT ";

			  //LIMIT
			if (rootClass["limit"] != null) SQL_text = SQL_text + "TOP " + rootClass["limit"] + " ";
			 
			 var selectResult = generateSELECTSQL(sqlTable);
			 
			 //SQL_text = SQL_text + " [SELECT ATTRIBUTES] ";
			 
			  var tempSelect = selectResult["select"];
			 tempSelect = tempSelect.concat(selectResult["aggregate"]);
			 
			 // remove duplicates
			 tempSelect = tempSelect.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			 });
			 
			 SQL_text = SQL_text + tempSelect.join(", ");
			 
			// console.log(selectResult);
			 
			 SQL_text = SQL_text + " FROM ";

			var whereResult = generateSQLWHEREInfo(sqlTable, [], [], counter, null);
			//console.log("OOOOOOOOOOOOOOOOOOOOOOOOO", whereResult);
			
			var fromPart = generateFromPart(whereResult["whereInfo"]);
			var wherePart = generateWherePart(whereResult["filters"]);
			 
			 SQL_text = SQL_text + fromPart;
			 
			 if(wherePart !== null && wherePart != "")SQL_text = SQL_text + "\nWHERE " + wherePart;
			 
			 //var orderBy = getOrderBy(rootClass["orderings"], result["fieldNames"], rootClass["identification"]["_id"], idTable);
			 
			 var groupByTemp = selectResult["groupBy"].concat(sqlTable["order"]["groupBy"]);
			 
			 groupByTemp = groupByTemp.filter(function (el, i, arr) {
				return arr.indexOf(el) === i;
			});
			 
			 //GROUP BY
			 var groupBy = groupByTemp.join(", ");
			 if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;

			 if(rootClass["aggregations"].length > 0) SQL_text = SQL_text + groupBy;

			// console.log("orderBy", sqlTable["order"]);
			// messages = messages.concat(sqlTable["order"]["messages"]);
			
			 //ORDER BY
			if (sqlTable["order"]["orders"] != "") SQL_text = SQL_text + "\nORDER BY " + sqlTable["order"]["orders"];

			 //OFFSET
			 if (rootClass["offset"] != null) SQL_text = SQL_text + "\nOFFSET " + rootClass["offset"] + " ROWS";

			


		 return SQL_text;
}

// generate SPARQL structure table
// clazz - abstract syntax table for given class
// rootClassId - root class unique name
// idTable - table with unique class names, generated so far
// variableNamesAll - table with unique variable names for all query
// counter - counter for variables with equals names
// sqlTable - table with SQL structure generated so far
// underNotLink - label, that class is under NOT link
// emptyPrefix - prefix that is uset as a empty in a query
// fieldNames - all field names in a query
// symbolTable - table with symbols presented in a query
// parameterTable - table with user set SPARQL generation parameters
function forAbstractQueryTableSQl(clazz, parentClass, rootClassId, idTable, variableNamesAll, counter, sqlTable, underNotLink, emptyPrefix, fieldNames, symbolTable, parameterTable){
	var variableNamesClass = [];
	
	var instance = idTable[clazz["identification"]["_id"]];
	
	var sqlTable = {};
	sqlTable["class"] =  instance; // unique class name
	sqlTable["isSimpleClassName"] = true; // if class name is simple name = true, if class name contains expression = false

	sqlTable["distinct"] = clazz["distinct"]; //value from class 'Distinct' field
	sqlTable["agregationInside"] = false; // if class contains agregations in 'Aggregates' field and class is main class or subquery main class = true
	
	sqlTable["fullSPARQL"] = clazz["fullSPARQL"]; // SPARQL from 'FullSPARQL' field
	sqlTable["isUnion"] = clazz["isUnion"]; // label if class is union
	sqlTable["isUnit"] = clazz["isUnit"]; // label if class in unit
	sqlTable["variableReferenceCandidate"] = []; // list with candidates to reference
	
	sqlTable["selectSimple"] = [];
	sqlTable["selectNot"] = [];
	sqlTable["selectAgreggate"] = [];
	sqlTable["localAggregateSubQueries"] = [];
	sqlTable["classFrom"] = [];
	sqlTable["from"] = [];
	sqlTable["where"] = [];
	sqlTable["isInverse"] = clazz["isInverse"];
	sqlTable["isSubQuery"] = clazz["isSubQuery"];
	sqlTable["isGlobalSubQuery"] = clazz["isGlobalSubQuery"];
	
	var resultClass;
	var primaryKey = null;
	if(clazz["isVariable"] == true) {
		//TODO
	}
	else if(clazz["identification"]["localName"] != "[ ]" && clazz["isUnion"] != true && clazz["isUnit"] != true && clazz["identification"]["localName"] != "[ + ]" && clazz["identification"]["localName"] != null && clazz["identification"]["localName"] != "" && clazz["identification"]["localName"] != "(no_class)") {

		resultClass = parse_attribSQL(clazz["identification"]["parsed_exp"], clazz["instanceAlias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable, clazz["identification"]["_id"]);
		counter = resultClass["counter"]

		for(var map in resultClass["sqlSubSelectMap"]){
			if(typeof resultClass["sqlSubSelectMap"][map] === 'object'){
				sqlTable["classFrom"].push(resultClass["sqlSubSelectMap"][map]);
				primaryKey = findPrimaryKey(resultClass["sqlSubSelectMap"][map]);
			}
		}
		//console.log("resultClass", resultClass);
		
	}
	
	var JoinClasses = [];
	for (var map in resultClass["sqlSubSelectMap"]) {
		JoinClasses.push(getJoinOn(resultClass["sqlSubSelectMap"][map]));
	}
	
	//attributes
	_.each(clazz["fields"],function(field) {
		if(clazz["isUnit"] == true && field["exp"].match("^[a-zA-Z0-9_]+$")){
			//sqlTable["selectMain"]["simpleVariables"].push({"alias": "?"+field["exp"], "value" : "?"+field["exp"]});
		} else {
			var result = parse_attribSQL(field["parsed_exp"], field["alias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, field["isInternal"], parameterTable, idTable, null, {"JoinClassName":instance, "JoinWith":JoinClasses}, null, primaryKey);
			//console.log("ATTRIBUTE", result);
			
			counter = result["counter"]
			
			for (var attrname in result["variableNamesClass"]) { 
				if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname]; 
				if(typeof fieldNames[attrname] === 'undefined') fieldNames[attrname] = [];
				if(typeof result["variableNamesClass"][attrname] === 'object')fieldNames[attrname][clazz["identification"]["_id"]] = result["variableNamesClass"][attrname]["alias"]
			}
			
			var alias = field["alias"];
			if(alias == null || alias == "") {
				alias = "expr_" + counter;
				counter++;
			} else {
				if(typeof fieldNames[alias] === 'undefined') fieldNames[alias] = [];
				fieldNames[alias][clazz["identification"]["_id"]] = alias;
			}
			
			//agregation in class
			if(result["isAggregate"] == true) {
				//local aggregation
				var localFrom = [];
				for(var map in result["sqlSubSelectMap"]){
					if(typeof result["sqlSubSelectMap"][map] === 'object') localFrom.push(result["sqlSubSelectMap"][map]);
				}
				var localTemp = {"from":localFrom, "select":{"alias": alias, "value" : result["exp"]}};
				sqlTable["localAggregateSubQueries"].push(localTemp);
				sqlTable["selectSimple"].push({"alias": alias, "value" : alias});
			}

			//function in expression
			else if(result["isFunction"] == true) {
				//functionTriples

				for(var map in result["sqlSubSelectMap"]){
					if(typeof result["sqlSubSelectMap"][map] === 'object') sqlTable["from"].push(result["sqlSubSelectMap"][map]);
				}
				
				var optimizationResult = optimizeAttributeSQLs(sqlTable["classFrom"], sqlTable["from"]);
					
				sqlTable["classFrom"] = optimizationResult["classSQL"];
				sqlTable["from"] = optimizationResult["fromSQL"];
				
				//MAIN SELECT function variables (not undet NOT link and is not internal)
				if(underNotLink != true && field["isInternal"] != true){
					sqlTable["selectSimple"].push({"alias": alias, "value" : result["exp"]});
				}
				if(underNotLink == true) sqlTable["selectNot"].push({"alias": alias, "value" : result["exp"]});
			}

			//expression in expression
			else if(result["isExpression"] == true) {
				//expressionTriples

				for(var map in result["sqlSubSelectMap"]){
					if(typeof result["sqlSubSelectMap"][map] === 'object') sqlTable["from"].push(result["sqlSubSelectMap"][map]);
				}
				
				var optimizationResult = optimizeAttributeSQLs(sqlTable["classFrom"], sqlTable["from"]);
					
				sqlTable["classFrom"] = optimizationResult["classSQL"];
				sqlTable["from"] = optimizationResult["fromSQL"];
				
				// MAIN SELECT expression variables (not undet NOT link and is not internal)
				if(underNotLink != true && field["isInternal"] != true){
					sqlTable["selectSimple"].push({"alias": alias, "value" : result["exp"]});
				}
				if(underNotLink == true) sqlTable["selectNot"].push({"alias": alias, "value" : result["exp"]});
			}
			//simple expression
			else {
					alias = result["exp"];
					
					// console.log("1111", sqlTable["classFrom"]);
					
					//sqlTable["from"].push(result["sqlSubSelectMap"]);
					for(var map in result["sqlSubSelectMap"]){
						if(typeof result["sqlSubSelectMap"][map] === 'object') sqlTable["from"].push(result["sqlSubSelectMap"][map]);
					}

					var optimizationResult = optimizeAttributeSQLs(sqlTable["classFrom"], sqlTable["from"]);
					
					sqlTable["classFrom"] = optimizationResult["classSQL"];
					sqlTable["from"] = optimizationResult["fromSQL"];
					
					// MAIN SELECT simple variables (not undet NOT link and is not internal)
					if(underNotLink != true && (field["isInternal"] != true || field["exp"].startsWith("?"))){
						sqlTable["selectSimple"].push({"alias": alias, "value" : alias});
					} 
					if(underNotLink == true) sqlTable["selectNot"].push({"alias": alias, "value" : result["exp"]});
			}
			if(field["requireValues"] == true) sqlTable["where"].push({"where": alias + " IS NOT NULL"});
		}
	})

 
	//aggregations
	_.each(clazz["aggregations"],function(field) {
		
		var result = parse_attribSQL(field["parsed_exp"], field["alias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable, null, {"JoinClassName":instance, "JoinWith":JoinClasses}, "aggregation", primaryKey);
		counter = result["counter"];
		for (var attrname in result["variableNamesClass"]) { 
			if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname]; 
		}
		
		var alias = field["alias"];
		if(alias == null || alias == "") {
			if(result["isExpression"] == false && result["isFunction"] == false) {
				var indexCole = result["exp"].indexOf(";");
				var endIndex = result["exp"].indexOf(")");
				if(indexCole != -1 && indexCole < endIndex) endIndex = indexCole;
				
				var tempAlias = result["exp"].substring(result["exp"].indexOf("(")+1, endIndex) + "_" + result["exp"].substring(0, result["exp"].indexOf("("));

				if(typeof variableNamesAll[tempAlias] !== 'undefined') {
					var count = variableNamesAll[tempAlias]["counter"] + 1;
					variableNamesAll[tempAlias]["counter"]  = count;
					alias = tempAlias + "_" + count;
				}
				else {
					alias = tempAlias;
					variableNamesAll[tempAlias] = {"alias":tempAlias, "nameIsTaken":true, counter:0, "isVar" : false};
				}
				
			} else {
				alias = "expr_" + counter;
				counter++;
			}
		}
		if(typeof fieldNames[alias] === 'undefined') fieldNames[alias] = [];
		fieldNames[alias][clazz["identification"]["_id"]] = alias;

		//aggregateTriples only in main class or subselect main class
		if(rootClassId == idTable[clazz["identification"]["_id"]] || clazz["isSubQuery"] == true || clazz["isGlobalSubQuery"] == true) {
			sqlTable["agregationInside"] = true;
			for(var map in result["sqlSubSelectMap"]){
				if(typeof result["sqlSubSelectMap"][map] === 'object') sqlTable["from"].push(result["sqlSubSelectMap"][map]);
			}
			
			var optimizationResult = optimizeAttributeSQLs(sqlTable["classFrom"], sqlTable["from"]);
					
			sqlTable["classFrom"] = optimizationResult["classSQL"];
			sqlTable["from"] = optimizationResult["fromSQL"];
			
			sqlTable["selectAgreggate"].push({"alias": alias, "value" : result["exp"]}); 
			// console.log("alias: ", alias);
			// console.log("value: ", result["exp"]);
			// console.log("map: ", result["sqlSubSelectMap"]);
			// console.log(" ");
		}

	})
	
	//conditions
	_.each(clazz["conditions"],function(condition) {
		var result = parse_filterSQL(condition["parsed_exp"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, parameterTable, idTable, {"JoinClassName":instance, "JoinWith":JoinClasses}, primaryKey);

		counter = result["counter"]
		
		for (var attrname in result["variableNamesClass"]) { 
			if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname]; 
		}  
		
		for (var attrname in result["expressionLevelNames"]) {
			if(typeof result["expressionLevelNames"][attrname] === 'string') {
				if(typeof variableNamesAll[attrname] === 'undefined') variableNamesAll[attrname] = {"alias": result["expressionLevelNames"][attrname], "nameIsTaken": true, counter:0, "isVar" : false};
			}
		}
		var optimizationResult = optimizeAttributeSQLs(sqlTable["classFrom"], result["sqlSubSelectMap"]);
					
		sqlTable["classFrom"] = optimizationResult["classSQL"];
		result["sqlSubSelectMap"] = optimizationResult["fromSQL"];
		
		sqlTable["where"].push({"where": result["exp"], "from" : result["sqlSubSelectMap"]});
	})
	
	sqlTable["from"] = optimizeAllAttributes(sqlTable["from"]);


	//subClasses
	if(clazz["children"].length > 0){
		sqlTable["subClasses"] = []; // class all sub classes
	};

	for (var attrname in variableNamesClass) {
		if(typeof variableNamesClass[attrname] === 'object' || typeof variableNamesClass[attrname] === 'string') {
			//if(typeof variableNamesAll[attrname] === 'undefined') 
				variableNamesAll[attrname] = {"alias": variableNamesClass[attrname]["alias"], "nameIsTaken": variableNamesClass[attrname]["nameIsTaken"], "counter":variableNamesClass[attrname]["counter"], "isVar" : variableNamesClass[attrname]["isVar"]};
		}
	}
	
	_.each(clazz["children"],function(subclazz) {
		if(subclazz["linkType"] == 'NOT') underNotLink = true;
		var temp = forAbstractQueryTableSQl(subclazz, clazz, rootClassId, idTable, variableNamesAll, counter, sqlTable, underNotLink, emptyPrefix, fieldNames, symbolTable, parameterTable);
		counter = temp["counter"];

		for (var attrname in temp["variableNamesAll"]) {
			if(typeof temp["variableNamesAll"][attrname] === 'string') {
				variableNamesClass[attrname] = {"alias": temp["variableNamesAll"][attrname]["alias"], "nameIsTaken": temp["variableNamesAll"][attrname]["nameIsTaken"], "counter":temp["variableNamesAll"][attrname]["counter"], "isVar" : temp["variableNamesAll"][attrname]["isVar"]};
			}
		}
		underNotLink = false;
		var tempSubSelect = [];
		var count1 = counter;
		counter++;
		var count2 = counter;
		counter++;
		
		for(var map in subclazz["linkIdentification"]["triplesMaps"]){
			if(typeof subclazz["linkIdentification"]["triplesMaps"][map] === 'object'){
				var templete = subclazz["linkIdentification"]["triplesMaps"][map]["subjectMap"]["templete"];
				var logicalTable = subclazz["linkIdentification"]["triplesMaps"][map]["logicalTable"];
				var from;
				var view1;
				if(logicalTable["type"] == "view") {
					view1 = "view_"+counter;
					from = {"Expression":"("+removeQuotes(logicalTable["sqlQuery"].replace(";", "").replace(";", ""))+")", "Name":view1};
				}
				else {
					view1 = "table_"+counter;
					from = {"Expression":removeQuotes(logicalTable["table"].replace(";", "").replace(";", "")), "Name":view1};
				}
				counter++;
				var select = null;
				
				
				for(var pom in subclazz["linkIdentification"]["triplesMaps"][map]["predicateObjectMap"]){
					if(typeof subclazz["linkIdentification"]["triplesMaps"][map]["predicateObjectMap"][pom] == 'object'){
						var predicateObjectMap = subclazz["linkIdentification"]["triplesMaps"][map]["predicateObjectMap"][pom];
						if(predicateObjectMap["predicate"] == subclazz["linkIdentification"]["URI"]){
							var templete2 = predicateObjectMap["objectMap"]["parentTriplesMap"]["subjectMap"]["templete"];
							var logicalTable2 = predicateObjectMap["objectMap"]["parentTriplesMap"]["logicalTable"];
							var view2;
							var from2;
							if(logicalTable2["type"] == "view") {
								view2 = "view_"+counter;
								from2 =  {"Expression":"("+removeQuotes(logicalTable2["sqlQuery"])+")", "Name":view2};
							}
							else {
								view2 = "table_"+counter;
								from2 =  {"Expression":removeQuotes(logicalTable2["table"]), "Name":view2};
							}
							counter++;
							
							tempSubSelect.push({"SelectJoin":
							  [{
								  "Template": {
									"alias": "Template_"+count1 , 
								    "name":templete.substring(1, templete.search("{"))
								  }, 
								  "PK": {
									"name":templete.substring(templete.search("{")+1, templete.search("}")),
									"view":view1,
									"alias":"key_"+count1
								  }
							   },
							   {
								  "Template": {
									"alias": "Template_"+count2 , 
									"name":templete2.substring(1, templete2.search("{"))
								  }, 
								  "PK": {
									  "name":templete2.substring(templete2.search("{")+1, templete2.search("}")),
									  "view":view2,
									  "alias":"key_"+count2
								  }
							   }], 
							"From" : [from, from2],
							"Select": select,
							"JoinCondition":{
								"parent": {
									"name":removeQuotes(predicateObjectMap["objectMap"]["joinCondition"]["parent"]),
									"view": view1,
								}, 
								"child": {
									"name":removeQuotes(predicateObjectMap["objectMap"]["joinCondition"]["child"]),
									"view": view2,
								}
							}//,
							 // "JoinWith":{"JoinClassName":instance, "JoinWith":JoinClasses}
							 });
						}
					}
				}	
				
			}
		}
		
		if(subclazz["isSubQuery"] == true || subclazz["isGlobalSubQuery"] == true){

				//ORDER BY
				//temp["sparqlTable"]["order"] = getOrderBy(subclazz["orderings"], fieldNames, subclazz["identification"]["_id"], idTable, emptyPrefix);
				 //OFFSET
				temp["sqlTable"]["offset"] = subclazz["offset"];

				 //LIMIT
				 temp["sqlTable"]["limit"] = subclazz["limit"];
		}
		
		//tempSubSelect.push({"JoinClasses":JoinClasses});
		// temp["sqlTable"]["from"].unshift(tempSubSelect);
		temp["sqlTable"]["link"] = [];
		temp["sqlTable"]["link"].push(tempSubSelect);
		temp["sqlTable"]["linkType"] = subclazz["linkType"];
		
		if(typeof subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"] !== 'undefined' && subclazz["linkIdentification"]["localName"] != "=="){
			var path = getPath(subclazz["linkIdentification"]["parsed_exp"]["PrimaryExpression"]["Path"]);
		}
		
		sqlTable["subClasses"].push(temp["sqlTable"]);
		
	})

	//conditionLinks
	sqlTable["conditions"] = [];
	_.each(clazz["conditionLinks"],function(condLink) {
		//sqlTable["from"].push("FROM DEFFINITION FOR " + result["exp"]);
		for (var map in condLink["identification"]["triplesMaps"]){
			if(typeof condLink["identification"]["triplesMaps"][map] === 'object'){
				for(var pom in condLink["identification"]["triplesMaps"][map]["predicateObjectMap"]){
					if(typeof condLink["identification"]["triplesMaps"][map]["predicateObjectMap"][pom] == 'object'){
						var predicateObjectMap = condLink["identification"]["triplesMaps"][map]["predicateObjectMap"][pom];
						if(predicateObjectMap["predicate"] == condLink["identification"]["URI"]){ 
							sqlTable["conditions"].push({
								"parent":{
									"id" : condLink["identification"]["_id"], 
									"condition" : removeQuotes(predicateObjectMap["objectMap"]["joinCondition"]["parent"])
								},
								"child":{
									"id" : condLink["target"], 
									"condition" : removeQuotes(predicateObjectMap["objectMap"]["joinCondition"]["child"])
								}
							})
						}
					}
				}
			}
		}
	})

	//ORDER BY
		var orderInfo = getOrderBy(clazz["orderings"], fieldNames, clazz["identification"]["_id"], idTable, {"JoinClassName":instance, "JoinWith":JoinClasses}, counter);

		sqlTable["order"] = orderInfo;
		
		var optimizationResult = optimizeAttributeSQLs(sqlTable["classFrom"], orderInfo["sqlSubSelectMap"]);
					
		sqlTable["classFrom"] = optimizationResult["classSQL"];
		if(optimizationResult["fromSQL"].length > 0 )sqlTable["from"].concat(optimizationResult["fromSQL"]);
		
	
	for (var attrname in variableNamesClass) {
		if(typeof variableNamesClass[attrname] === 'object' || typeof variableNamesClass[attrname] === 'string'){
			//variableNamesAll[attrname] = variableNamesClass[attrname]["alias"];
			variableNamesAll[attrname] = {"alias": variableNamesClass[attrname]["alias"], "nameIsTaken":variableNamesClass[attrname]["nameIsTaken"], "counter":variableNamesClass[attrname]["counter"], "isVar":variableNamesClass[attrname]["isVar"]};
		}
	}
	
	return {variableNamesAll:variableNamesAll, sqlTable:sqlTable, counter:counter, fieldNames:fieldNames};
}

function optimizeAttributeSQLs(classSQL, fromSQL){
	for (var attr in fromSQL) {
		for (var clazz in classSQL) {
			for (var attr2 in  fromSQL[attr]) {
				for (var clazz2 in classSQL[clazz]) {
					var matchTable = [];
					// if each record in fromSQL SelectJoin have the same in classSQL SelectJoin
					var matchInSelectJoin = null;
					for (var sja in  fromSQL[attr][attr2]["SelectJoin"]) {
						var matchInOneSelectJoin = false;
						for (var sjc in classSQL[clazz][clazz2]["SelectJoin"]) {
							if(fromSQL[attr][attr2]["SelectJoin"][sja]["PK"]["name"] == classSQL[clazz][clazz2]["SelectJoin"][sjc]["PK"]["name"] &&
							fromSQL[attr][attr2]["SelectJoin"][sja]["Template"]["name"] == classSQL[clazz][clazz2]["SelectJoin"][sjc]["Template"]["name"] ) matchInOneSelectJoin = true;
						}
						if(matchInSelectJoin != false) matchInSelectJoin = matchInOneSelectJoin;
					}
					var matchInFrom = null;
					for (var sja in  fromSQL[attr][attr2]["From"]) {
						var matchInOneFrom = false;
						for (var sjc in classSQL[clazz][clazz2]["From"]) {
							if(fromSQL[attr][attr2]["From"][sja]["Expression"] == classSQL[clazz][clazz2]["From"][sjc]["Expression"] &&
							fromSQL[attr][attr2]["From"][sja]["Expression"] == classSQL[clazz][clazz2]["From"][sjc]["Expression"] ) {
								matchInOneFrom = true;
								matchTable[fromSQL[attr][attr2]["From"][sja]["Name"]] = classSQL[clazz][clazz2]["From"][sjc]["Name"];
							}
						}
						if(matchInFrom != false) matchInFrom = matchInOneFrom;
					}
					if(matchInSelectJoin == true && matchInOneFrom == true){
						for (var sel in fromSQL[attr][attr2]["Select"]){
							var tempSel = {"select": fromSQL[attr][attr2]["Select"][sel]["select"], "alias": fromSQL[attr][attr2]["Select"][sel]["alias"], "viewName":matchTable[fromSQL[attr][attr2]["Select"][sel]["viewName"]]};
							if(classSQL[clazz][clazz2]["Select"] == null) classSQL[clazz][clazz2]["Select"] = [tempSel];
							else {
								classSQL[clazz][clazz2]["Select"].push(tempSel);
							}
						}
						//fromSQL = [];
						fromSQL[attr] = null;
					}
				}
			}
		}
	}
	return {"classSQL":classSQL, "fromSQL":fromSQL};
}

function optimizeAllAttributes(fromSQL){
	for (var clazz in fromSQL) {
		for (var attr in fromSQL) {
			if(attr != clazz){
				for (var clazz2 in  fromSQL[attr]) {
					for (var attr2 in fromSQL[clazz]) {
						if(typeof fromSQL[attr][attr2] !== 'undefined' && typeof fromSQL[clazz][clazz2] !== 'undefined'){
							var matchTable = [];
							// if each record in fromSQL SelectJoin have the same in classSQL SelectJoin
							var matchInSelectJoin = null;
							for (var sja in  fromSQL[attr][attr2]["SelectJoin"]) {
								var matchInOneSelectJoin = false;
								for (var sjc in fromSQL[clazz][clazz2]["SelectJoin"]) {
									if(fromSQL[attr][attr2]["SelectJoin"][sja]["PK"]["name"] == fromSQL[clazz][clazz2]["SelectJoin"][sjc]["PK"]["name"] &&
									fromSQL[attr][attr2]["SelectJoin"][sja]["Template"]["name"] == fromSQL[clazz][clazz2]["SelectJoin"][sjc]["Template"]["name"] ) matchInOneSelectJoin = true;
								}
								if(matchInSelectJoin != false) matchInSelectJoin = matchInOneSelectJoin;
							}
							var matchInFrom = null;
							for (var sja in  fromSQL[attr][attr2]["From"]) {
								var matchInOneFrom = false;
								for (var sjc in fromSQL[clazz][clazz2]["From"]) {
									if(fromSQL[attr][attr2]["From"][sja]["Expression"] == fromSQL[clazz][clazz2]["From"][sjc]["Expression"] &&
									fromSQL[attr][attr2]["From"][sja]["Expression"] == fromSQL[clazz][clazz2]["From"][sjc]["Expression"] ) {
										matchInOneFrom = true;
										matchTable[fromSQL[attr][attr2]["From"][sja]["Name"]] = fromSQL[clazz][clazz2]["From"][sjc]["Name"];
									}
								}
								if(matchInFrom != false) matchInFrom = matchInOneFrom;
							}
							if(matchInSelectJoin == true && matchInOneFrom == true){
								for (var sel in fromSQL[attr][attr2]["Select"]){
									var tempSel = {"select": fromSQL[attr][attr2]["Select"][sel]["select"], "alias": fromSQL[attr][attr2]["Select"][sel]["alias"], "viewName":matchTable[fromSQL[attr][attr2]["Select"][sel]["viewName"]]};
									if(fromSQL[clazz][clazz2]["Select"] == null) fromSQL[clazz][clazz2]["Select"] = [tempSel];
									else {
										fromSQL[clazz][clazz2]["Select"].push(tempSel);
									}
								}
								//fromSQL[attr] = null;
								delete fromSQL[attr];
							}
						}
					}
				}
			}
		}
	}
	
	return fromSQL;
}

function generateSELECTSQL(sqlTable){
	selectInfo = [];
	aggregateSelectInfo = [];
	groupBy = [];
	selectNotInfo = [];

	// simpleVariables
	for (var number in sqlTable["selectSimple"]){
		if(typeof sqlTable["selectSimple"][number]["alias"] === 'string') {
			if(sqlTable["selectSimple"][number]["alias"] == sqlTable["selectSimple"][number]["value"]) selectInfo.push(sqlTable["selectSimple"][number]["alias"]);
			else selectInfo.push(sqlTable["selectSimple"][number]["value"] + " AS " + sqlTable["selectSimple"][number]["alias"]);
			groupBy.push(sqlTable["selectSimple"][number]["alias"]);
		}
	}
	
	// simpleVariables under NOT
	for (var number in sqlTable["selectNot"]){
		if(typeof sqlTable["selectNot"][number]["alias"] === 'string') {
			if(sqlTable["selectNot"][number]["alias"] == sqlTable["selectNot"][number]["value"]) selectNotInfo.push(sqlTable["selectNot"][number]["alias"]);
			else selectNotInfo.push(sqlTable["selectNot"][number]["value"] + " AS " + sqlTable["selectNot"][number]["alias"]);
			groupBy.push(sqlTable["selectNot"][number]["alias"]);
		}
	}

	// aggregateVariables
	for (var number in sqlTable["selectAgreggate"]){
		if(typeof sqlTable["selectAgreggate"][number]["alias"] === 'string') aggregateSelectInfo.push(sqlTable["selectAgreggate"][number]["value"] + " AS " + sqlTable["selectAgreggate"][number]["alias"]);
	}	
	
	// remove duplicates
	var selectInfo = selectInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var selectNotInfo = selectNotInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var aggregateSelectInfo = aggregateSelectInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	var groupBy = groupBy.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	if(typeof sqlTable["subClasses"] !=='undefined'){
		for (var subclass in sqlTable["subClasses"]){
			if(typeof sqlTable["subClasses"][subclass] === 'object' && sqlTable["subClasses"][subclass]["isSubQuery"] != true && sqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true) {
				var temp = generateSELECTSQL(sqlTable["subClasses"][subclass]);
				selectInfo = selectInfo.concat(temp["select"]);
				selectNotInfo = selectNotInfo.concat(temp["select"]);
				aggregateSelectInfo = aggregateSelectInfo.concat(temp["aggregate"]);
				groupBy = groupBy.concat(temp["groupBy"]);
			}
		}
	}

	return {"select":selectInfo, "selectNotInfo":selectNotInfo, "aggregate":aggregateSelectInfo, "groupBy":groupBy};
}

// genrerate SQL FROM info
// sqlTable - table with sql parts
function generateSQLWHEREInfo(sqlTable, ws, fil, counter, parentClassJoinOn){
	//console.log("IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII", sqlTable);
	var whereInfo = [];
	var filters = [];
	var localAggregateSubQueries = [];
	
	var linkJoin = null;
	var joinOn = null;
	var linkType = "\nINNER JOIN\n";
	if(typeof sqlTable["linkType"] === 'string' && sqlTable["linkType"] == "OPTIONAL" && sqlTable["isInverse"] != true) linkType = "\nLEFT OUTER JOIN\n";
	else if(typeof sqlTable["linkType"] === 'string' && sqlTable["linkType"] == "OPTIONAL" && sqlTable["isInverse"] == true) linkType = "\nRIGHT OUTER JOIN\n";
	else if(typeof sqlTable["linkType"] === 'string' && sqlTable["linkType"] == "NOT") linkType = "NOT EXISTS";
	
	// link from part 
	for (var expression in sqlTable["link"]){
		if(typeof sqlTable["link"][expression] === 'object'){
			//whereInfo.push(sqlTable["classFrom"][expression]);
			joinOn=getJoinOn(sqlTable["link"][expression]);
			// var subselects = [];
			var joinPart = generateJoinPart(sqlTable["link"][expression]);
			linkJoin = {"name": "select_"+counter, "joinWith": joinOn};
			if(joinOn.length > 0 && joinPart != ""){
				whereInfo.push({
					"name": "select_"+counter,
					"select":joinPart,
					"joinOn":joinOn,
					"joinWith":parentClassJoinOn,
					"linkType":linkType
				}) 
				counter++;
			}
			// whereInfo.push(subselects);
			// console.log("UUUUUUUUUUUUUUUUUUUUUUUu",  subselects);
		} 
	}
	
	// class from part 
	for (var expression in sqlTable["classFrom"]){
		if(typeof sqlTable["classFrom"][expression] === 'object'){
			var joinWithSuperClass = null;
			var joinPart = generateJoinPart(sqlTable["classFrom"][expression]);
			joinOn = getJoinOn(sqlTable["classFrom"][expression]);
			if(joinOn.length > 0 && joinPart != ""){
				whereInfo.push({
					"name": sqlTable["class"],
					"select":joinPart,
					"joinOn":joinOn,
					"joinWith":linkJoin
				}) 
			}
			// whereInfo.push(subselects);
			// console.log("UUUUUUUUUUUUUUUUUUUUUUUu",  subselects);
		} 
	}
	
	// simpleTriples
	for (var expression in sqlTable["from"]){
		if(typeof sqlTable["from"][expression] === 'object'){
			var joinPart = generateJoinPart(sqlTable["from"][expression]);
			var joinOnCondition = getJoinOn(sqlTable["from"][expression]);
			if(joinOnCondition.length > 0 && joinPart != ""){
				whereInfo.push({
					"name": "select_"+counter,
					"select":joinPart,
					"joinOn":joinOnCondition,
					"joinWith":{"name": sqlTable["class"], "joinWith": joinOn}
				}) 
				counter++;
			}
			// console.log("aaaaaaaaaaaaaaaaaaaaaaa", subselects);
		} 
	}

	// filters
	for (var expression in sqlTable["where"]){
		if(typeof sqlTable["where"][expression] === 'object'){
			filters.push(sqlTable["where"][expression]["where"]);
			for (var fromPart in sqlTable["where"][expression]["from"]){
				if(typeof sqlTable["where"][expression]["from"][fromPart] === 'object'){
					var joinOnFilter = getJoinOn(sqlTable["where"][expression]["from"][fromPart])
					var joinPart = generateJoinPart(sqlTable["where"][expression]["from"][fromPart]);
					if(joinOnFilter.length > 0 && joinPart != ""){
						whereInfo.push({
							"name": "select_"+counter,
							"select":joinPart,
							"joinOn":joinOnFilter,
							"joinWith":{"name": sqlTable["class"], "joinWith": joinOn}
						}) 
						counter++;
					}
					 // whereInfo.push(subselects);
					// console.log("sssssssssssssssssss", whereInfo);
				}
			}
			
		}
	}
	
	// localAggregateSubQueries
	for (var expression in sqlTable["localAggregateSubQueries"]){
		if(typeof sqlTable["localAggregateSubQueries"][expression] === 'object'){
			var localTemp = [];
			//localTemp["select"].push(sqlTable["localAggregateSubQueries"][expression]["select"]);
			for (var fromPart in sqlTable["localAggregateSubQueries"][expression]["from"]){
				if(typeof sqlTable["localAggregateSubQueries"][expression]["from"][fromPart] === 'object'){
					// whereInfo.push(sqlTable["where"][expression]["from"][fromPart]);
					// var subselects = [];
					var joinPart = generateJoinPart(sqlTable["localAggregateSubQueries"][expression]["from"][fromPart]);
					var joinOnLocal = getJoinOn(sqlTable["localAggregateSubQueries"][expression]["from"][fromPart])
					if(joinOnLocal.length > 0 && joinPart != ""){
						localTemp.push({
							"name": "select_"+counter,
							"select":joinPart,
							"joinOn":joinOnLocal,
							"joinWith":{"name": sqlTable["class"], "joinWith": joinOn}
						}) 
						counter++;
					}
					
					//console.log("11111111111111111", {"name": sqlTable["class"], "joinWith": joinOn});
					//console.log("22222222222222222", {"name": "select_"+counter, "joinWith": joinOnLocal});
					
					var subSelectResult = generateLocalAggregate(sqlTable["localAggregateSubQueries"][expression]["select"], {"name": sqlTable["class"], "joinWith": joinOn}, {"name": "select_"+counter, "joinWith": joinOnLocal}, counter, localTemp);
					counter = subSelectResult["counter"];
					
					//whereInfo = [];
					whereInfo.push({
						"name": subSelectResult["name"],
						"select":subSelectResult["select"],
						"joinOn":subSelectResult["joinCondition"],
						"joinWith":{"name": sqlTable["class"], "joinWith": joinOn},
					})
					 // whereInfo.push(subselects);
					// console.log("sssssssssssssssssss",whereInfo);
				}
			}
			
			 
		}
	}
	
	//if(typeof sqlTable["subClasses"] !=='undefined'){
		for (var subclass in sqlTable["subClasses"]){
			if(typeof sqlTable["subClasses"][subclass] === 'object') {
				if(sqlTable["subClasses"][subclass]["isUnion"] == true) {}// TO DO whereInfo.push(getUNIONClasses(sqlTable["subClasses"][subclass], sqlTable["class"], sqlTable["classTriple"], false, referenceTable));
				//else if(sqlTable["subClasses"][subclass]["isSubQuery"] != true && sqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
				else{	
				    var temp = generateSQLWHEREInfo(sqlTable["subClasses"][subclass], whereInfo, filters, counter, {"name": sqlTable["class"], "joinWith": joinOn});
					filters = filters.concat(temp["filters"]);
					whereInfo = whereInfo.concat(temp["whereInfo"]);
					counter = temp["counter"];
					// classFrom = classFrom.concat(temp["classFrom"]);
					
				//}else {
					//sub selects
				}
			}
		}
	//}

	// remove duplicates
	var whereInfo = whereInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	var filters = filters.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	if((typeof sqlTable["isSubQuery"] !== 'undefined' && sqlTable["isSubQuery"] == true) || (typeof sqlTable["isGlobalSubQuery"] !== 'undefined' && sqlTable["isGlobalSubQuery"] == true)){
		 var selectResult = generateSELECTSQL(sqlTable);
		 var subSelectResult = generateSubSelect(selectResult, whereInfo, filters, linkJoin, parentClassJoinOn, counter, sqlTable);
		 counter = subSelectResult["counter"];
		 whereInfo = [];
		 whereInfo.push({
			"name": subSelectResult["name"],
			"select":subSelectResult["select"],
			"joinOn":subSelectResult["joinCondition"],
			"joinWith":parentClassJoinOn,
			"linkType":linkType
		}) 
	}
	else if(typeof sqlTable["linkType"] === 'string' && sqlTable["linkType"] == "OPTIONAL"){
		 var selectResult = generateSELECTSQL(sqlTable);
		 var optionalselectResult = generateOptionalSelect(selectResult, whereInfo, filters, linkJoin, parentClassJoinOn, counter);
		 counter = optionalselectResult["counter"];
		 whereInfo = [];
		 whereInfo.push({
			"name": optionalselectResult["name"],
			"select":optionalselectResult["select"],
			"joinOn":optionalselectResult["joinCondition"],
			"joinWith":parentClassJoinOn,
			"linkType":linkType
		}) 
	}
	else if(typeof sqlTable["linkType"] === 'string' && sqlTable["linkType"] == "NOT"){
		 var selectResult = generateSELECTSQL(sqlTable);
		 var notselectResult = generateNotSelect(selectResult, whereInfo, filters, counter);
		 whereInfo = [];
		 filters = [];
		 filters.push("NOT EXISTS(" + notselectResult + ")");
	}

	whereInfo.concat(ws);
	filters.concat(fil);

	return {"whereInfo" : whereInfo, "filters" : filters, "counter" : counter}
}

function generateWherePart(whereInfo){
	//console.log(whereInfo);
	return whereInfo.join(" AND ");
}

function generateFromPart(whereInfo){
	//console.log("LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL", whereInfo.length, whereInfo);
	if(whereInfo.length == 0) return "";
	else if(whereInfo.length == 1) {
		return whereInfo[0]["select"] + " " + whereInfo[0]["name"];
	}
	else{
		var queryFrom =  whereInfo[0]["select"] + " " + whereInfo[0]["name"];
		var select1 = whereInfo[0];
		for (i = 1; i < whereInfo.length; i++) {
			var joinType = "\nINNER JOIN\n";
			if(typeof whereInfo[i]["linkType"] !== 'undefined' && whereInfo[i]["linkType"] != "NOT EXISTS")joinType = whereInfo[i]["linkType"];
			
			queryFrom = queryFrom + joinType + whereInfo[i]["select"] + " " + whereInfo[i]["name"];
			
			queryFrom = queryFrom + "\n ON " + findJoinOnConditions(select1, whereInfo[i]);
			
			select1 = whereInfo[i];
		} 
		//console.log(queryFrom);
		return queryFrom;
	}
	
	/*
	var counter = 0;
	if(whereInfo.length == 0) return "";
	else if(whereInfo.length == 1) {
		return generateJoinPart(whereInfo[0]);
	}
	else{
		var subselects = [];
		for (i = 0; i < whereInfo.length; i++) {
			// console.log(whereInfo[i-1])
			var joinPart = generateJoinPart(whereInfo[i]);
			// console.log(whereInfo[i]);
			
			subselects.push({
				"name":" select_" + counter,
				"select":joinPart,
				"joinOn":getJoinOn(whereInfo[i])
			})
			counter++;
		} 
		//console.log(JSON.stringify(subselects,null,2), subselects);
		
		var queryFrom =  subselects[0]["select"] + " " + subselects[0]["name"];
		var select1 = subselects[0];
		for (i = 1; i < subselects.length; i++) {
			
			
			queryFrom = queryFrom + "\nINNER JOIN\n" + subselects[i]["select"] + " " + subselects[i]["name"];
			
			queryFrom = queryFrom + "\n ON " + findJoinOnConditions(select1, subselects[i]);
			
			select1 = subselects[i];
		} 
		//console.log(queryFrom);
		return queryFrom;
	}*/
}

function findJoinOnConditions(select1, select2){
	var joinConditions = [];
	
	for (var i in select2["joinOn"]){
		for (var k in select2["joinWith"]["joinWith"]){
			if(select2["joinOn"][i]["PK"]["name"] == select2["joinWith"]["joinWith"][k]["PK"]["name"] && select2["joinOn"][i]["Template"]["name"] ==  select2["joinWith"]["joinWith"][k]["Template"]["name"]){
				joinConditions.push(select2["name"] + "." + select2["joinOn"][i]["Template"]["alias"] + " = " + select2["joinWith"]["name"] + "." + select2["joinWith"]["joinWith"][k]["Template"]["alias"] + " AND " + select2["name"] + "." + select2["joinOn"][i]["PK"]["alias"] + " = " +select2["joinWith"]["name"] + "."+ select2["joinWith"]["joinWith"][k]["PK"]["alias"]);
			}
		}
	}
	
	
	// for (var i in select1["joinOn"]){
		// for (var k in select2["joinOn"]){
			// if(select1["joinOn"][i]["PK"]["name"] == select2["joinOn"][k]["PK"]["name"] && select1["joinOn"][i]["Template"]["name"] == select2["joinOn"][k]["Template"]["name"]){
				// joinConditions.push(select1["name"] + "." + select1["joinOn"][i]["Template"]["alias"] + " = " + select2["name"] + "." + select2["joinOn"][k]["Template"]["alias"] + " AND " + select1["name"] + "." + select1["joinOn"][i]["PK"]["alias"] + " = " + select2["name"] + "."+ select2["joinOn"][k]["PK"]["alias"]);
			// }
		// }
	// }
	return joinConditions.join("\n AND \n");
}

function getJoinOn(whereInfo){
	var selectJoin = [];
	for (var expr in whereInfo){
		for (var expression in whereInfo[expr]["SelectJoin"]){
			selectJoin.push(whereInfo[expr]["SelectJoin"][expression]);
		}
	}
	return selectJoin;
}

function generateJoinPart(fromPart){
	var unionTable = [];
	for (var expression in fromPart){
		if(typeof fromPart[expression] === 'object'){
			unionTable.push(generateUnionPart(fromPart[expression]));
		}
	}
	if(unionTable.length > 1) return "("+unionTable.join("\nUNION\n")+")";
	return unionTable.join("\nUNION\n");
}

function generateUnionPart(unionPart){
	var subSelect = "(SELECT ";
	var selectJoin = [];
	for (var expression in unionPart["SelectJoin"]){
		var template = unionPart["SelectJoin"][expression]["Template"];
		selectJoin.push("'"+ template["name"] + "' AS " +template["alias"] + ", " + unionPart["SelectJoin"][expression]["PK"]["view"] + "." + unionPart["SelectJoin"][expression]["PK"]["name"] + " AS " + unionPart["SelectJoin"][expression]["PK"]["alias"]);
	}
	
	if(unionPart["Select"] != null){
		for (var sel in unionPart["Select"]){
			selectJoin.push(unionPart["Select"][sel]["viewName"] +"."+unionPart["Select"][sel]["select"] + " AS " + unionPart["Select"][sel]["alias"]);
		}
	}
	
	//remove duplicates
	selectJoin = selectJoin.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	//console.log("YYYYYYYYYYYYYy", unionPart);
	subSelect = subSelect + selectJoin.join(", ");
	
	var fromTable = [];
	for (var expression in unionPart["From"]){
		fromTable.push(unionPart["From"][expression]["Expression"] + " " + unionPart["From"][expression]["Name"]);
	}
	
	subSelect = subSelect + " FROM " + fromTable.join(",\n");
	
	if(typeof unionPart["JoinCondition"] !== 'undefined'){
		subSelect = subSelect + "\n WHERE " + unionPart["JoinCondition"]["parent"]["view"] + "." + unionPart["JoinCondition"]["parent"]["name"] + " = " + unionPart["JoinCondition"]["child"]["view"] + "." + unionPart["JoinCondition"]["child"]["name"] + "\n";
	}
	
	subSelect = subSelect + ")";
	
	return subSelect;
}

function removeQuotes(str){
	if(typeof str !== 'undefined'){
		if(str.startsWith('"') == true) str = str.substring(1);
		if(str.endsWith('"') == true) str = str.substring(0, str.length-1);
	}
	return str;
}

function generateNotSelect(selectResult, whereInfo, filters, counter){
	var SQL_text = "(SELECT ";
	var tempSelect = selectResult["selectNotInfo"];
	if(tempSelect.length == 0) SQL_text = SQL_text + "* ";
	else SQL_text = SQL_text + tempSelect.join(", ");
	
	SQL_text = SQL_text + " FROM ";
	
	var fromPart = generateFromPart(whereInfo);
	var wherePart = generateWherePart(filters);
			 
	SQL_text = SQL_text + fromPart;
			 
	if(wherePart !== null && wherePart != "")SQL_text = SQL_text + "\nWHERE " + wherePart;
	SQL_text = SQL_text + ")";
	
	return SQL_text;
}

function generateLocalAggregate(selectResult, parentClassJoinOn, linkJoin, counter, whereInfo){
	var SQL_text = "(SELECT ";
	 var tempSelect = [];
	 tempSelect.push(selectResult["value"] + " AS " + selectResult["alias"]);
	 var selectName = "localAggregate_" + counter;
	 var joinSelect = getJoinSelect(linkJoin, parentClassJoinOn, selectName);
	 counter++;

	 tempSelect = tempSelect.concat(joinSelect["select"]);
	 
	// remove duplicates
	tempSelect = tempSelect.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
			 
	SQL_text = SQL_text + tempSelect.join(", ");
			 
	SQL_text = SQL_text + " FROM ";
	
	var fromPart = generateFromPart(whereInfo);
	// var wherePart = generateWherePart(filters);
			 
	SQL_text = SQL_text + fromPart;
	
	SQL_text = SQL_text + "\nGROUP BY " + joinSelect["select"].join(", ");
	// if(wherePart !== null && wherePart != "")SQL_text = SQL_text + "\nWHERE " + wherePart;
	SQL_text = SQL_text + ")";

	return {"select" : SQL_text, "name": selectName, "joinCondition":joinSelect["joinCondition"],  "counter": counter};
}

function  generateOptionalSelect(selectResult, whereInfo, filters, linkJoin, parentClassJoinOn, counter){
	 var SQL_text = "(SELECT ";
	 var tempSelect = selectResult["select"];
	 var selectName = "optionalSelect_" + counter;
	 var joinSelect = getJoinSelect(linkJoin, parentClassJoinOn, selectName);
	 counter++;
	 
	 tempSelect = tempSelect.concat(joinSelect["select"]);
	 
	// remove duplicates
	tempSelect = tempSelect.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
			 
	SQL_text = SQL_text + tempSelect.join(", ");
			 
	SQL_text = SQL_text + " FROM ";
	
	var fromPart = generateFromPart(whereInfo);
	var wherePart = generateWherePart(filters);
			 
	SQL_text = SQL_text + fromPart;
			 
	if(wherePart !== null && wherePart != "")SQL_text = SQL_text + "\nWHERE " + wherePart;
	SQL_text = SQL_text + ")";

	return {"select" : SQL_text, "name": selectName, "joinCondition":joinSelect["joinCondition"],  "counter": counter};
}

function generateSubSelect(selectResult, whereInfo, filters, linkJoin, parentClassJoinOn, counter,sqlTable){
	var SQL_text = "(SELECT ";
	
	//LIMIT
	if (sqlTable["limit"] != null) SQL_text = SQL_text + "TOP " + sqlTable["limit"] + " ";
	
	 var tempSelect = selectResult["select"];
	 var selectName = "subSelect_" + counter;
	 var joinSelect = getJoinSelect(linkJoin, parentClassJoinOn, selectName);
	 counter++;
	 
	 tempSelect = tempSelect.concat(selectResult["aggregate"]);
	 tempSelect = tempSelect.concat(joinSelect["select"]);
	 
	// remove duplicates
	tempSelect = tempSelect.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
			 
	SQL_text = SQL_text + tempSelect.join(", ");
			 
	SQL_text = SQL_text + " FROM ";
	
	var fromPart = generateFromPart(whereInfo);
	var wherePart = generateWherePart(filters);
			 
	SQL_text = SQL_text + fromPart;
			 
	if(wherePart !== null && wherePart != "")SQL_text = SQL_text + "\nWHERE " + wherePart;
	
	//GROUP BY
	// var groupByArray = selectResult["groupBy"];
	// groupByArray = groupByArray.concat(joinSelect["select"]);
	// var groupBy = groupByArray.join(", ");
	// if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;
	
	var groupByTemp = selectResult["groupBy"].concat(sqlTable["order"]["groupBy"]);
	groupByTemp = groupByTemp.concat(joinSelect["select"]);
	
	groupByTemp = groupByTemp.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
			 
	//GROUP BY
	var groupBy = groupByTemp.join(", ");
	if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;
	

	if(selectResult["aggregate"].length > 0) SQL_text = SQL_text + groupBy;
	
	 //ORDER BY
	if (sqlTable["order"]["orders"] != "") SQL_text = SQL_text + "\nORDER BY " + sqlTable["order"]["orders"];

	
	 //OFFSET
	 if (sqlTable["offset"] != null) SQL_text = SQL_text + "\nOFFSET " + sqlTable["offset"] + " ROWS";

	 
	
	SQL_text = SQL_text + ")";

	return {"select" : SQL_text, "name": selectName, "joinCondition":joinSelect["joinCondition"],  "counter": counter};
}

function getJoinSelect(select1, select2, name){
	var joinConditions = [];
	var selectResult = [];
	
	for (var i in select1["joinWith"]){
		for (var k in select2["joinWith"]){
			if(select1["joinWith"][i]["PK"]["name"] == select2["joinWith"][k]["PK"]["name"] && select1["joinWith"][i]["Template"]["name"] ==  select2["joinWith"][k]["Template"]["name"]){
				//joinConditions.push(name + "." + select1["joinWith"][i]["Template"]["alias"] + " = " + select2["name"] + "." + select2["joinWith"][k]["Template"]["alias"] + " AND " + name + "." + select1["joinWith"][i]["PK"]["alias"] + " = " +select2["name"] + "."+ select2["joinWith"][k]["PK"]["alias"]);
				selectResult.push(select1["joinWith"][i]["Template"]["alias"]);
				selectResult.push(select1["joinWith"][i]["PK"]["alias"]);
				joinConditions.push(select1["joinWith"][i]);
			}
		}
	}
	return {"joinCondition":joinConditions, "select":selectResult};
}

function getOrderBy(orderings, fieldNames, rootClass_id, idTable, joinConditions, counter){
	var messages = [];
	var groupBy = [];
	var orderTable = [];
	var sqlSubSelectMap = [];
	_.each(orderings,function(order) {
		var descendingEnd = "";
		if(order["isDescending"] == true) {
			descendingEnd = " DESC"
		}
		var orderName = order["exp"];
		if(orderName.search(":") != -1) orderName = orderName.substring(orderName.search(":")+1);
		if(typeof fieldNames[orderName] !== 'undefined'){
			var result = fieldNames[orderName][rootClass_id];
			if(typeof result === 'undefined'){
				for (var ordr in fieldNames[orderName]) {
					result = fieldNames[orderName][ordr];
					break;
				}
			}
			orderTable.push(result + descendingEnd);
			groupBy.push(result);
		 } else {		
			//var result = parse_attrib(order["parsed_exp"], null, idTable[rootClass_id], [], [], 0, emptyPrefix, [], false, [], idTable, referenceTable);
			var result = parse_attribSQL(order["parsed_exp"], null, idTable[rootClass_id], [], [], counter, null, [], false, [], idTable, null, joinConditions);

			 //messages = messages.concat(result["messages"]);
			 if(result["isAggregate"] == false && result["isExpression"] == false && result["isFunction"] == false && result["sqlSubSelectMap"].length > 0){
				 orderTable.push(result["exp"] + descendingEnd);
				 groupBy.push(result["exp"]);
				 for(var map in result["sqlSubSelectMap"]){
					if(typeof result["sqlSubSelectMap"][map] === 'object') sqlSubSelectMap.push(result["sqlSubSelectMap"][map]);
				}
			 } else {
				/* messages.push({
					"type" : "Warning",
					"message" : "ORDER BY allowed only over explicit selection fields, " + order["exp"] + " is not a selection field",
					"listOfElementId":[rootClass_id],
					"isBlocking" : false
				 });*/
			 }
		 }
	})

	//if(messages.length > 0) Interpreter.showErrorMsg(messages.join("\n"), -3);

	orderTable = orderTable.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	return {"orders":orderTable.join(", "), "sqlSubSelectMap":sqlSubSelectMap, "messages":messages, "groupBy":groupBy};
}

function findPrimaryKey(map){
	var pk;
	for (var i in map){
		for (var v in map[i]["SelectJoin"]){
			//console.log("IIIIIIIIIIIIIIIIIIIIIIIII", map[i]["SelectJoin"][v]["PK"]["alias"]);
			pk = map[i]["SelectJoin"][v]["PK"]["alias"];
			break;
		}
	}
	return pk;
}
