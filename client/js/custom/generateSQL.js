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
		 console.log(result, JSON.stringify(sqlTable,null,2));

		 // table with prefixes used in query
		 //var prefixTable = result["prefixTable"];
		 
		 var SQL_text = "";
		 

			SQL_text = "SELECT ";

			 //DISTINCT
			 if(rootClass["distinct"] == true && rootClass["aggregations"].length == 0) SQL_text = SQL_text + "DISTINCT ";

			 
			 
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
			 
			 //GROUP BY
			 var groupBy = selectResult["groupBy"].join(", ");
			 if(groupBy != "") groupBy = "\nGROUP BY " + groupBy;

			 if(rootClass["aggregations"].length > 0) SQL_text = SQL_text + groupBy;

			 //ORDER BY
			 //if (orderBy["orders"] != "") SQL_text = SQL_text + "\nORDER BY " + orderBy["orders"];

			 //OFFSET
			 if (rootClass["offset"] != null) SQL_text = SQL_text + "\nOFFSET " + rootClass["offset"];

			 //LIMIT
			if (rootClass["limit"] != null) SQL_text = SQL_text + "\nLIMIT " + rootClass["limit"];


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
	sqlTable["selectAgreggate"] = [];
	sqlTable["classFrom"] = [];
	sqlTable["from"] = [];
	sqlTable["where"] = [];
	
	var resultClass;
	if(clazz["isVariable"] == true) {
		//TODO
	}
	else if(clazz["identification"]["localName"] != "[ ]" && clazz["isUnion"] != true && clazz["isUnit"] != true && clazz["identification"]["localName"] != "[ + ]" && clazz["identification"]["localName"] != null && clazz["identification"]["localName"] != "" && clazz["identification"]["localName"] != "(no_class)") {

		resultClass = parse_attribSQL(clazz["identification"]["parsed_exp"], clazz["instanceAlias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable, clazz["identification"]["_id"]);
		counter = resultClass["counter"]

		for(var map in resultClass["sqlSubSelectMap"]){
			if(typeof resultClass["sqlSubSelectMap"][map] === 'object')sqlTable["classFrom"].push(resultClass["sqlSubSelectMap"][map]);
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
			var result = parse_attribSQL(field["parsed_exp"], field["alias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, field["isInternal"], parameterTable, idTable, null, {"JoinClassName":instance, "JoinWith":JoinClasses});
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
			}

			//function in expression
			else if(result["isFunction"] == true) {
				//functionTriples

				for(var map in result["sqlSubSelectMap"]){
					if(typeof result["sqlSubSelectMap"][map] === 'object') sqlTable["from"].push(result["sqlSubSelectMap"][map]);
				}
				//MAIN SELECT function variables (not undet NOT link and is not internal)
				if(underNotLink != true && field["isInternal"] != true){
					sqlTable["selectSimple"].push({"alias": alias, "value" : result["exp"]});
				}
			}

			//expression in expression
			else if(result["isExpression"] == true) {
				//expressionTriples

				for(var map in result["sqlSubSelectMap"]){
					if(typeof result["sqlSubSelectMap"][map] === 'object') sqlTable["from"].push(result["sqlSubSelectMap"][map]);
				}
				// MAIN SELECT expression variables (not undet NOT link and is not internal)
				if(underNotLink != true && field["isInternal"] != true){
					sqlTable["selectSimple"].push({"alias": alias, "value" : result["exp"]});
				}
			}
			//simple expression
			else {
					alias = result["exp"];
					
					//sqlTable["from"].push(result["sqlSubSelectMap"]);
					for(var map in result["sqlSubSelectMap"]){
						if(typeof result["sqlSubSelectMap"][map] === 'object') sqlTable["from"].push(result["sqlSubSelectMap"][map]);
					}

					// MAIN SELECT simple variables (not undet NOT link and is not internal)
					if(underNotLink != true && (field["isInternal"] != true || field["exp"].startsWith("?"))){
						sqlTable["selectSimple"].push({"alias": alias, "value" : alias});
					} 
			}
		}
	})

	//conditions
	_.each(clazz["conditions"],function(condition) {
		var result = parse_filterSQL(condition["parsed_exp"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, parameterTable, idTable, {"JoinClassName":instance, "JoinWith":JoinClasses});

		counter = result["counter"]
		
		for (var attrname in result["variableNamesClass"]) { 
				if(typeof result["variableNamesClass"][attrname] === 'object' || typeof result["variableNamesClass"][attrname] === 'string') variableNamesClass[attrname] = result["variableNamesClass"][attrname]; 
		}  
		for (var attrname in result["expressionLevelNames"]) {
			if(typeof result["expressionLevelNames"][attrname] === 'string') variableNamesAll[attrname] = result["expressionLevelNames"][attrname]; 
		}
		
		sqlTable["where"].push({"where": result["exp"], "from" : result["sqlSubSelectMap"]});
	})
 
	//aggregations
	_.each(clazz["aggregations"],function(field) {
		
		var result = parse_attribSQL(field["parsed_exp"], field["alias"], instance, variableNamesClass, variableNamesAll, counter, emptyPrefix, symbolTable, false, parameterTable, idTable, null, {"JoinClassName":instance, "JoinWith":JoinClasses});
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
				
				var tempAlias = result["exp"].substring(result["exp"].indexOf("?")+1, endIndex) + "_" + result["exp"].substring(0, result["exp"].indexOf("("));
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
			sqlTable["agregationInside"] = true;
			for(var map in result["sqlSubSelectMap"]){
				if(typeof result["sqlSubSelectMap"][map] === 'object') sqlTable["from"].push(result["sqlSubSelectMap"][map]);
			}
			sqlTable["selectAgreggate"].push({"alias": alias, "value" : result["exp"]}); 
			// console.log("alias: ", alias);
			// console.log("value: ", result["exp"]);
			// console.log("map: ", result["sqlSubSelectMap"]);
			// console.log(" ");
		}

	})


	//subClasses
	if(clazz["children"].length > 0){
		sqlTable["subClasses"] = []; // class all sub classes
	};
	for (var attrname in variableNamesClass) {
		if(typeof variableNamesClass[attrname] === 'object' || typeof variableNamesClass[attrname] === 'string') variableNamesAll[attrname] = variableNamesClass[attrname]["alias"]; 
	}
	_.each(clazz["children"],function(subclazz) {
		if(subclazz["linkType"] == 'NOT') underNotLink = true;
		var temp = forAbstractQueryTableSQl(subclazz, clazz, rootClassId, idTable, variableNamesAll, counter, sqlTable, underNotLink, emptyPrefix, fieldNames, symbolTable, parameterTable);
		counter = temp["counter"];
		for (var attrname in temp["variableNamesAll"]) {
			if(typeof temp["variableNamesAll"][attrname] === 'string') variableNamesClass[attrname] = {"alias":temp["variableNamesAll"][attrname], "isvar" : false}; 
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
	_.each(clazz["conditionLinks"],function(condLink) {
		//sqlTable["from"].push("FROM DEFFINITION FOR " + result["exp"]);
		//console.log("CCCCCCCCCCCCCCCCCCcccc", condLink);
	})

	for (var attrname in variableNamesClass) {
		if(typeof variableNamesClass[attrname] === 'object' || typeof variableNamesClass[attrname] === 'string')variableNamesAll[attrname] = variableNamesClass[attrname]["alias"];
	}
	return {variableNamesAll:variableNamesAll, sqlTable:sqlTable, counter:counter, fieldNames:fieldNames};
}

function generateSELECTSQL(sqlTable){
	selectInfo = [];
	aggregateSelectInfo = [];
	groupBy = [];

	// simpleVariables
	for (var number in sqlTable["selectSimple"]){
		if(typeof sqlTable["selectSimple"][number]["alias"] === 'string') {
			if(sqlTable["selectSimple"][number]["alias"] == sqlTable["selectSimple"][number]["value"]) selectInfo.push(sqlTable["selectSimple"][number]["alias"]);
			else selectInfo.push(sqlTable["selectSimple"][number]["value"] + " AS " + sqlTable["selectSimple"][number]["alias"]);
			groupBy.push(sqlTable["selectSimple"][number]["alias"]);
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
				aggregateSelectInfo = aggregateSelectInfo.concat(temp["aggregate"]);
				groupBy = groupBy.concat(temp["groupBy"]);
			}
		}
	}

	return {"select":selectInfo, "aggregate":aggregateSelectInfo, "groupBy":groupBy};
}

// genrerate SQL FROM info
// sqlTable - table with sql parts
function generateSQLWHEREInfo(sqlTable, ws, fil, counter, parentClassJoinOn){

	var whereInfo = [];
	var filters = [];
	
	var linkJoin = null;
	var joinOn = null;
	var linkType = "\nINNER JOIN\n";
	if(typeof sqlTable["linkType"] === 'string' && sqlTable["linkType"] == "OPTIONAL") linkType = "\nLEFT OUTER JOIN\n";
	else if(typeof sqlTable["linkType"] === 'string' && sqlTable["linkType"] == "NOT") linkType = "NOT EXISTS";
	
	// link from part 
	for (var expression in sqlTable["link"]){
		if(typeof sqlTable["link"][expression] === 'object'){
			//whereInfo.push(sqlTable["classFrom"][expression]);
			joinOn=getJoinOn(sqlTable["link"][expression]);
			// var subselects = [];
				var joinPart = generateJoinPart(sqlTable["link"][expression]);
				linkJoin = {"name": "select_"+counter, "joinWith": joinOn}
				whereInfo.push({
					"name": "select_"+counter,
					"select":joinPart,
					"joinOn":joinOn,
					"joinWith":parentClassJoinOn,
					"linkType":linkType
				}) 
				counter++;
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
			whereInfo.push({
				"name": sqlTable["class"],
				"select":joinPart,
				"joinOn":joinOn,
				"joinWith":linkJoin
			}) 
			// whereInfo.push(subselects);
			// console.log("UUUUUUUUUUUUUUUUUUUUUUUu",  subselects);
		} 
	}
	
	// simpleTriples
	for (var expression in sqlTable["from"]){
		if(typeof sqlTable["from"][expression] === 'object'){
			var joinPart = generateJoinPart(sqlTable["from"][expression]);
			whereInfo.push({
				"name": "select_"+counter,
				"select":joinPart,
				"joinOn":getJoinOn(sqlTable["from"][expression]),
				"joinWith":{"name": sqlTable["class"], "joinWith": joinOn}
			}) 
			counter++;
					// whereInfo.push(subselects);
			// console.log("aaaaaaaaaaaaaaaaaaaaaaa", subselects);
		} 
	}

	// filters
	for (var expression in sqlTable["where"]){
		if(typeof sqlTable["where"][expression] === 'object'){
			filters.push(sqlTable["where"][expression]["where"]);
			for (var fromPart in sqlTable["where"][expression]["from"]){
				if(typeof sqlTable["where"][expression]["from"][fromPart] === 'object'){
					// whereInfo.push(sqlTable["where"][expression]["from"][fromPart]);
					// var subselects = [];
					var joinPart = generateJoinPart(sqlTable["where"][expression]["from"][fromPart]);
					whereInfo.push({
						"name": "select_"+counter,
						"select":joinPart,
						"joinOn":getJoinOn(sqlTable["where"][expression]["from"][fromPart]),
						"joinWith":{"name": sqlTable["class"], "joinWith": joinOn}
					}) 
					counter++;
					 // whereInfo.push(subselects);
					// console.log("sssssssssssssssssss", subselects);
				}
			}
			
		}
	}
	
	if(typeof sqlTable["subClasses"] !=='undefined'){
		for (var subclass in sqlTable["subClasses"]){
			if(typeof sqlTable["subClasses"][subclass] === 'object') {
				if(sqlTable["subClasses"][subclass]["isUnion"] == true) {}// TO DO whereInfo.push(getUNIONClasses(sqlTable["subClasses"][subclass], sqlTable["class"], sqlTable["classTriple"], false, referenceTable));
				else if(sqlTable["subClasses"][subclass]["isSubQuery"] != true && sqlTable["subClasses"][subclass]["isGlobalSubQuery"] != true){
					var temp = generateSQLWHEREInfo(sqlTable["subClasses"][subclass], whereInfo, filters, counter, {"name": sqlTable["class"], "joinWith": joinOn});
					filters = filters.concat(temp["filters"]);
					whereInfo = whereInfo.concat(temp["whereInfo"]);
					counter = temp["counter"];
					// classFrom = classFrom.concat(temp["classFrom"]);
				}else {
					//sub selects
				}
			}
		}
	}

	// remove duplicates
	var whereInfo = whereInfo.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});

	var filters = filters.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	// var classFrom = classFrom.filter(function (el, i, arr) {
		// return arr.indexOf(el) === i;
	// });

	//link type
	/*if(typeof sqlTable["linkType"] === 'string' && sqlTable["linkType"] == "OPTIONAL"){
		whereInfo = whereInfo.concat(filters);
		whereInfo = whereInfo.concat(links);
		if(sqlTable["isSimpleClassName"] == true){
			var tempString = "OPTIONAL{" + whereInfo.join("\n") + "}";
			whereInfo = [];
			whereInfo.push(tempString);
		} else {console.log("OPTIONAL subselect replaced with required")}
		filters = [];
		links = [];
	}
	if(typeof sqlTable["linkType"] === 'string' && sqlTable["linkType"] == "NOT"){
		whereInfo = whereInfo.concat(filters);
		whereInfo = whereInfo.concat(links);
		var tempString = "FILTER NOT EXISTS{" + whereInfo.join("\n") + "}";
		whereInfo = [];
		whereInfo.push(tempString);
		filters = [];
		links = [];
	}*/
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
	// console.log("JJJJJJJJJJJJJJJJJJJJ", select1, select2);
	var joinConditions = [];
	
	for (var i in select2["joinOn"]){
		for (var k in select2["joinWith"]["joinWith"]){
			// console.log("2222222222222222222222222222222", )
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
		selectJoin.push(unionPart["Select"]["select"] + " AS " + unionPart["Select"]["alias"]);
	}
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