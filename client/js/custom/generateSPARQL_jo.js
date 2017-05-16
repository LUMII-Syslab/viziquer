Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

 
  GenerateSPARQL_jo: function() {
    // get _id of the active ajoo diagram
    var diagramId = Session.get("activeDiagram");

    // get an array of ajoo Elements whithin the active diagram
    var elems_in_diagram_ids = Elements.find({diagramId:diagramId}).map(function(e) {
      return e["_id"]
    });

    // Print All SPARQL Queries within the diagram
    _.each(genAbstractQueryForElementList(elems_in_diagram_ids),function(q) {
         //console.log(JSON.stringify(q,null,2));

		 var SPARQL_text = "SELECT ";
		 
         var abstractQueryJSON = JSON.stringify(resolveTypesAndBuildSymbolTable(q),null,2);
         var abstractQueryTable = JSON.parse(abstractQueryJSON);
		 
		 var rootClass = abstractQueryTable["root"];
		 
		 //DISTINCT
		 if(rootClass["distinct"] == true) SPARQL_text = SPARQL_text + "DISTINCT ";
		 
		
		 
		 //generate table with unique class names in [form _id] = class_unique_name
		 var idTable = generateIds(rootClass);
		 
		 //table with unique variable names
		 var variableNamesAll = [];
		 
		//counter for variables with equals names
		 var counter = 0;
		 
		 var result = forAbstractQueryTable(rootClass, idTable, variableNamesAll, counter, [], false);
		 sparqlTable = result["sparqlTable"];
		
		 // console.log("sparqlTable", sparqlTable);
		 
		 SPARQL_text = SPARQL_text + generateSELECT(sparqlTable).join(" ");
		 SPARQL_text = SPARQL_text + " WHERE{\n";
		 
		  //HAVING
		 var having = getHaving(rootClass["havingConditions"]);
		 if(having != "") SPARQL_text = SPARQL_text + having + "\n";
		 
		 SPARQL_text = SPARQL_text + generateSPARQLWHEREStatements(sparqlTable).join("\n") + "}";
		 
		 //ORDER BY
		 var orderBy = getOrderBy(rootClass["orderings"]);
		 if (orderBy != "") SPARQL_text = SPARQL_text + "\nORDER BY " + orderBy;
		 
		 //OFFSET
		 if (rootClass["offset"] != null) SPARQL_text = SPARQL_text + "\nOFFSET " + rootClass["offset"];
		 
		 //LIMIT 
		 if (rootClass["limit"] != null) SPARQL_text = SPARQL_text + "\nLIMIT " + rootClass["limit"];
		 
		 console.log(SPARQL_text)
       })
  },
});

//generate table with unique class names in form [_id] = class_unique_name
//rootClass - abstract syntax table starting with 'rootClass' object
function generateIds(rootClass){
	var counter = 0;
	var idTable = [];
	
	//add root class unique name
	var rootClassId = rootClass["instanceAlias"];
	if(rootClassId == null) rootClassId = rootClass["identification"]["localName"];
	idTable[rootClass["identification"]["_id"]] = rootClassId;
	
	//go through all root class children classes
	_.each(rootClass["children"],function(subclazz) {
		idTable.concat(generateClassIds(subclazz, idTable, counter));
	})
	return idTable;
}

// generate table with unique class names in form [_id] = class_unique_name
// clazz - abstract syntax table starting with given class object
// idTable - table with unique class names, generated so far
// counter - counter for classes with equals names
function generateClassIds(clazz, idTable, counter){
	// if instance if defined, use it
	if(clazz["instanceAlias"] != null) idTable[clazz["identification"]["_id"]] = clazz["instanceAlias"];
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

// generate SPARQL structure table
// clazz - abstract syntax table for given class
// idTable - table with unique class names, generated so far
// variableNamesAll - table with unique variable names for all query
// counter - counter for variables with equals names
// sparqlTable - table with SPARQL structure generated so far
// underNotLink - label, that class isunder NOT link
function forAbstractQueryTable(clazz, idTable, variableNamesAll, counter, sparqlTable, underNotLink){
	var variableNamesClass = [];
	
	var instance = idTable[clazz["identification"]["_id"]];
	
	var sparqlTable = [];
	sparqlTable["class"] = "?" + instance;
	sparqlTable["classTriple"] = "?" + instance + " a :" + clazz["identification"]["localName"] + ".";
	sparqlTable["stereotype"] = clazz["stereotype"];
	sparqlTable["agregationInside"] = false;
	sparqlTable["simpleTriples"] = [];
	sparqlTable["expressionTriples"] = [];
	sparqlTable["functionTriples"] = [];
	sparqlTable["aggregateTriples"] = [];
	sparqlTable["filterTriples"] = [];
	sparqlTable["filter"] = [];
	sparqlTable["selectMain"] = [];
	sparqlTable["selectMain"]["simpleVariables"] = [];
	sparqlTable["selectMain"]["expressionVariables"] = [];
	sparqlTable["selectMain"]["functionVariables"] = [];
	sparqlTable["selectMain"]["aggrigateVariables"] = [];
	
	//conditions
	_.each(clazz["conditions"],function(condition) {
		var result = parse_filter(condition["parsed_exp"], instance, variableNamesAll, counter);
		counter = result["counter"]
		for (var attrname in result["variableNamesClass"]) { variableNamesClass[attrname] = result["variableNamesClass"][attrname]; }
		
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
		var result = parse_attrib(field["parsed_exp"], field["alias"], instance, variableNamesClass, variableNamesAll, counter);
		counter = result["counter"]
		for (var attrname in result["variableNamesClass"]) { variableNamesClass[attrname] = result["variableNamesClass"][attrname]; }
		
		var alias = field["alias"];
		if(alias == "") {
			alias = "expr_" + counter;
			counter++;
		}
		
		//agregation in class
		if(result["isAggregate"] == true) {
			sparqlTable["agregationInside"] = true;
			
			//aggregateTriples
			sparqlTable["aggregateTriples"].push(getTriple(result, alias, field["requireValues"], false));
		}
		
		//function in expression
		else if(result["isFunction"] == true) {
			//functionTriples
			sparqlTable["functionTriples"].push(getTriple(result, alias, field["requireValues"], true));
			
			//MAIN SELECT function variables (not undet NOT link)
			if(underNotLink != true) sparqlTable["selectMain"]["functionVariables"].push({"alias": alias, "value" : result["exp"]});
		}
		
		//function in expression
		else if(result["isExpression"] == true) {
			//expressionTriples
			sparqlTable["expressionTriples"].push(getTriple(result, alias, field["requireValues"], true));
			
			// MAIN SELECT expression variables (not undet NOT link)
			if(underNotLink != true) sparqlTable["selectMain"]["expressionVariables"].push({"alias": alias, "value" : result["exp"]});
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
			
			// MAIN SELECT simple variables (not undet NOT link)
			if(underNotLink != true) sparqlTable["selectMain"]["simpleVariables"].push({"alias": alias, "value" : alias});
		}
		
		// console.log("FIELD", field["exp"], result);
	})
	
	//subClasses
	if(clazz["children"].length > 0){
		sparqlTable["subClasses"] = [];
	}; 
	
	_.each(clazz["children"],function(subclazz) {
		if(subclazz["linkType"] == 'NOT') underNotLink = true;
		var temp = forAbstractQueryTable(subclazz, idTable, variableNamesAll, counter, sparqlTable, underNotLink);
		for (var attrname in temp["variableNamesAll"]) { variableNamesClass[attrname] = temp["variableNamesAll"][attrname]; }
		underNotLink = false;
		//link triple
		if(typeof subclazz["linkIdentification"] !== 'undefined'){
			var subject, preditate, object;
			preditate = subclazz["linkIdentification"]["localName"];
			if(subclazz["isInverse"] == true) {
				object = instance;
				subject = idTable[subclazz["identification"]["_id"]];
			} else {
				subject = instance;
				object = idTable[subclazz["identification"]["_id"]];
			}
			temp["sparqlTable"]["linkTriple"] = "?" + subject + " :" + preditate + " ?" + object + ".";
			temp["sparqlTable"]["linkType"] = subclazz["linkType"];
			temp["sparqlTable"]["isSubQuery"] = subclazz["isSubQuery"];
			
		}
		
		sparqlTable["subClasses"].push(temp["sparqlTable"]);
	})
	
	//conditionLinks
	//TODO
	
	for (var attrname in variableNamesClass) { variableNamesAll[attrname] = variableNamesClass[attrname]; }
	return {variableNamesAll:variableNamesAll, sparqlTable:sparqlTable};
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
function generateSPARQLWHEREStatements(sparqlTable){
	whereStatements = [];

	whereStatements.push(sparqlTable["classTriple"]);
	// simpleTriples
	for (var expression in sparqlTable["simpleTriples"]){
		if(typeof sparqlTable["simpleTriples"][expression] === 'object'){
			for (var triple in sparqlTable["simpleTriples"][expression]["triple"]){
				if(typeof sparqlTable["simpleTriples"][expression]["triple"][triple] === 'string') whereStatements.push("OPTIONAL{" + sparqlTable["simpleTriples"][expression]["triple"][triple] + "}");
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
		if(typeof sparqlTable["aggregateTriples"][expression]["bind"]  === 'string') whereStatements.push(sparqlTable["aggregateTriples"][expression]["bind"]);
		if(typeof sparqlTable["aggregateTriples"][expression]["bound"]  === 'string') whereStatements.push(sparqlTable["aggregateTriples"][expression]["bound"]);
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
			whereStatements.push(sparqlTable["filter"][expression]);
		}
	}
	
	//link
	if(typeof sparqlTable["linkTriple"] === 'string'){
		whereStatements.push(sparqlTable["linkTriple"]);
	}

	// remove duplicates
	var uniqueTriples = whereStatements.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	if(typeof sparqlTable["subClasses"] !=='udefined'){
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				uniqueTriples = uniqueTriples.concat(generateSPARQLWHEREStatements(sparqlTable["subClasses"][subclass]));
			}
		}
	}
	
	//link type
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "OPTIONAL"){
		uniqueTriples = "OPTIONAL{" + uniqueTriples.join("\n") + "}";
	}
	if(typeof sparqlTable["linkType"] === 'string' && sparqlTable["linkType"] == "NOT"){
		uniqueTriples = "FILTER NOT EXISTS{" + uniqueTriples.join("\n") + "}";
	}
	return uniqueTriples
}

function generateSELECT(sparqlTable){
	selectStatements = [];

	// selectMAIN
	
	// simpleVariables
	for (var number in sparqlTable["selectMain"]["simpleVariables"]){
		if(typeof sparqlTable["selectMain"]["simpleVariables"][number]["alias"] === 'string') selectStatements.push(sparqlTable["selectMain"]["simpleVariables"][number]["alias"]);
	}
	
	// expressionVariables
	for (var number in sparqlTable["selectMain"]["expressionVariables"]){
		if(typeof sparqlTable["selectMain"]["expressionVariables"][number]["alias"] === 'string') selectStatements.push(sparqlTable["selectMain"]["expressionVariables"][number]["alias"]);
	}
	
	// functionVariables
	for (var number in sparqlTable["selectMain"]["functionVariables"]){
		if(typeof sparqlTable["selectMain"]["functionVariables"][number]["alias"] === 'string') selectStatements.push(sparqlTable["selectMain"]["functionVariables"][number]["alias"]);
	}

	// remove duplicates
	var uniqueTriples = selectStatements.filter(function (el, i, arr) {
		return arr.indexOf(el) === i;
	});
	
	if(typeof sparqlTable["subClasses"] !=='udefined'){
		for (var subclass in sparqlTable["subClasses"]){
			if(typeof sparqlTable["subClasses"][subclass] === 'object') {
				uniqueTriples = uniqueTriples.concat(generateSELECT(sparqlTable["subClasses"][subclass]));
			}
		}
	}
	
	return uniqueTriples
}