// meteor npm install sparqljs

var x = 10;
var y = 10;
var width = 350;
var height = 150;
var counter = 0;
VQ_Elements = {};
var directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
var indirectClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
var schemaName = null;
var isUnderUnion = false;
var orderCounter = 1;

Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

generateVisualQueryAll: async function(queries, xx, yy, queryId, queryQuestion){
	  x = xx;
	  y = yy;
	  orderCounter = 1;
	  // var proj = Projects.findOne({_id: Session.get("activeProject")});
	  // if (proj) {
		// if (proj.schema) {
			// schemaName = proj.schema;
			// schemaName = schemaName.toLowerCase();
		// };
	  // }
	  
	  schemaName = dataShapes.schema.schemaType;
	  // schemaName = "wikidata";
	   
	  directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
	  indirectClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
		
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		 if (proj) {
			  
			  if (proj.directClassMembershipRole) {
				var dirRole = proj.directClassMembershipRole;
				if(dirRole == "" || dirRole == "a" || dirRole == "rdf:type") directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
				else if(dirRole == "wdt:P31") directClassMembershipRole = "http://www.wikidata.org/prop/direct/P31";
				else directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
			  };
			   if (proj.indirectClassMembershipRole) {
				indirectClassMembershipRole = proj.indirectClassMembershipRole;
				// if(indirectClassMembershipRole == "wdt:P31/wdt:P279*") indirectClassMembershipRole = "wdt:[[instance of(P31)]].wdt:[[subclass of(P279)]]*";
				// if(indirectClassMembershipRole == "wdt:P31.wdt:P279*") indirectClassMembershipRole = "wdt:[[instance of(P31)]].wdt:[[subclass of(P279)]]*";
				if(indirectClassMembershipRole == "wdt:P31/wdt:P279*") indirectClassMembershipRole = "[instance of (P31)].[subclass of (P279)]*";
				if(indirectClassMembershipRole == "wdt:P31.wdt:P279*") indirectClassMembershipRole = "[instance of (P31)].[subclass of (P279)]*";
			  }; 
			  
			  
		 }
		 
		  var prefixes = await dataShapes.getNamespaces();
		
			var prefixesText = [];
			for(var p in prefixes){
				prefixesText.push("PREFIX " + prefixes[p]["name"] + ": <" + prefixes[p]["value"] + ">");
			}

	  // for(var query in queries){
     for (let query = 0; query < queries.length; query++) {
		 isUnderUnion = false;
		var text = queries[query]["sparql"];
		text = prefixesText.join("\n") + text;
	  // Utilities.callMeteorMethod("parseExpressionForCompletions", text);
	  Utilities.callMeteorMethod("parseSPARQLText", text, async function(parsedQuery) {
		// x = xx;
		y = yy;
		counter = 0;
		
		// console.log("queryId:", queries[query]["id"], "--------------------------");
		
		parsedQuery = transformParsedQuery(parsedQuery);		
		// console.log(JSON.stringify(parsedQuery, 0, 2));
		// var schema = new VQ_Schema();
		
		// Get all variables (except class names) from a query SELECT statements, including subqueries.
		var variableList = await getAllVariablesInQuery(parsedQuery, []);
		
		// console.log("variableList", variableList);

		// Generate ViziQuer query abstract syntax tables
		var abstractTable = await generateAbstractTable(parsedQuery, [], variableList, []);
		abstractTable["linkTable"] = removeDuplicateLinks(abstractTable["linkTable"]);
		
		// console.log(JSON.stringify(abstractTable["classesTable"], 0, 2));
		// console.log("abstractTable", abstractTable);
		
		var classesTable = abstractTable["classesTable"];
		var classCount = Object.keys(classesTable).length;											
		// /*
		var whereTriplesVaribles = getWhereTriplesVaribles(parsedQuery["where"]);
		// Decide which class is a query start class
		
		var tempGetStartClass = getStartClass(classesTable, abstractTable["linkTable"]);
		var startClass = tempGetStartClass["startClass"];
		classesTable = tempGetStartClass["classesTable"];
		
		for(var fil in abstractTable["filterTable"]){
			if((typeof abstractTable["filterTable"][fil]["filterAdded"] !== "undefined" && abstractTable["filterTable"][fil]["filterAdded"] == false) || typeof tempGetStartClass.emptyClassSet !== "undefined"){
				if(typeof startClass["class"]["conditions"] === 'undefined') {
					startClass["class"]["conditions"] = [];
				}
				startClass["class"]["conditions"].push(abstractTable["filterTable"][fil]["filterString"])
			}
		}

		var isNotConnectdClass = true;
		while(isNotConnectdClass == true){
			isNotConnectdClass = false;
			var ct = [];
			for(var cl in abstractTable["classesTable"]){
				ct[cl] = false;
			}
			
			var ct = connectNotConnectedQueryParts(startClass["name"], abstractTable["linkTable"], ct);
			for(var cl in ct){
				if(ct[cl] == false){
					isNotConnectdClass = true;
					var link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":cl,
						"subject":startClass["name"],
						"isVisited":false,
						"linkType":"REQUIRED",
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"isVariable":false,
						"counter":orderCounter
					}
					abstractTable["linkTable"].push(link);
					orderCounter++;
					break;
				}
			}
		}
			
		if(parsedQuery["where"].length == 1 && parsedQuery["where"][0]["type"] == "optional" && (parsedQuery["where"][0]["patterns"].length != 1 || 
		(parsedQuery["where"][0]["patterns"].length == 1 && parsedQuery["where"][0]["patterns"][0]["type"] == "bgp" && parsedQuery["where"][0]["patterns"][0]["triples"].length != 1))){
			var unit
			if(typeof classesTable["[ ]"] === 'undefined'){
				unit = {
					"variableName":"?[ ]",
					"name": "[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classesTable["[ ]"] = unit;
			}else {
				unit = {
					"variableName":"?[ ]",
					"identification":null,
					"name": "[ ]"+counter,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classesTable["[ ]"+counter] = unit
				counter++;
			}
			var link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":startClass.name,
						"subject":unit.name,
						"isVisited":false,
						"linkType":"OPTIONAL",
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"counter":orderCounter
						}
			abstractTable["linkTable"].push(link);
			orderCounter++;
			
			if(typeof startClass.class.aggregations !== "undefined"){
				unit["aggregations"] = [];
				for(var aggr in startClass.class.aggregations){
					if(startClass.class.aggregations[aggr]["exp"].indexOf("(.)") !== -1){
						startClass.class.aggregations[aggr]["exp"] = startClass.class.aggregations[aggr]["exp"].replace("(.)", "(" + startClass.name + ")")
					} 
					unit["aggregations"].push(startClass.class.aggregations[aggr])	
				}
				// unit["aggregations"] = startClass.class.aggregations;
				startClass.class.aggregations = null;
			}
			
			startClass = {"name": unit.name, "class":unit};
		}
		
		var visitedClasses = [];
		for(var clazz in classesTable){
			visitedClasses[clazz] = false;
		}
		visitedClasses[ startClass["name"]] = true;
		// Generate tree ViziQuer query structure, from class and link tables 
		var generateClassCtructuretemp = generateClassCtructure(startClass["class"], startClass["name"], classesTable, abstractTable["linkTable"], whereTriplesVaribles, visitedClasses, [], variableList);
		
		classesTable = generateClassCtructuretemp.clazz;
		conditionLinks = generateClassCtructuretemp.conditionLinks;													 
		classesTable["orderings"] = abstractTable["orderTable"];
		classesTable["graphs"] = abstractTable["fromTable"];
		if(typeof classesTable["groupings"] !== "undefined") classesTable["groupings"] = classesTable["groupings"].concat( abstractTable["groupTable"]);
		else classesTable["groupings"] = abstractTable["groupTable"];
		if(typeof parsedQuery["limit"] !== 'undefined') classesTable["limit"] =  parsedQuery["limit"];
		else if(parsedQuery["queryType"] == "ASK") classesTable["limit"] = 1;
		if(typeof parsedQuery["offset"] !== 'undefined') classesTable["offset"] =  parsedQuery["offset"];
		if(typeof parsedQuery["distinct"] !== 'undefined') classesTable["distinct"] =  parsedQuery["distinct"];
		if(abstractTable["serviceLabelLang"] !== '') classesTable["serviceLabelLang"] =  abstractTable["serviceLabelLang"];
		if(abstractTable["fullSPARQL"] !== '') classesTable["fullSPARQL"] =  abstractTable["fullSPARQL"];

		
		// console.log("whereTriplesVaribles", whereTriplesVaribles);
		// Visualize query based on tree structure
		var queryId = queries[query]["id"];
		var queryQuestion = queries[query]["question"];
		
		VQ_Elements = {};
		
		var variableListCount = getAllVariableCountInQuery(parsedQuery, []);
			
		await visualizeQuery(classesTable, null, variableListCount, queryId, queryQuestion);

		var i = 0;
		while(Object.keys(VQ_Elements).length < classCount && i < 100){
			await delay(100);
			i++;
		}

		 _.each(conditionLinks,function(condLink) {
			
			var linkName = condLink["identification"]["display_name"];
			var isNot = condLink["isNot"];
			var isInverse = condLink["isInverse"];
			var linkType = "REQUIRED";
			if(isNot == true) linkType = "NOT";
			
			 var target = new VQ_Element(VQ_Elements[condLink.target]);
			 var source = new VQ_Element(VQ_Elements[condLink.source]);
			 
			 var tCoordinates = target.getCoordinates();
			 var sCoordinates = source.getCoordinates();
			 
			  var coordX = tCoordinates.x + Math.round(tCoordinates.width/2)+20;
				var coordY = sCoordinates.y + sCoordinates.height;
				var locLink = [];

				if(isInverse != true){
					locLink = [coordX, coordY, coordX, tCoordinates.y]; 
					Create_VQ_Element(function(linkLine) {
						linkLine.setName(linkName);
						linkLine.setLinkType(linkType);
						linkLine.setNestingType("CONDITION");
					}, locLink, true, target, source);
				} else {
					locLink = [coordX, tCoordinates.y, coordX, coordY];
					Create_VQ_Element(function(linkLine) {
						linkLine.setName(linkName);
						linkLine.setLinkType(linkType);
						linkLine.setNestingType("CONDITION");
					}, locLink, true, source, target);
				}
			//TODO create condition link
		})							   
		
	  });
	  
		await delay(15000);
		var idNumb = parseInt(queries[query]["id"], 10);
		if(idNumb % 10 === 0) {
			x = 10;
			yy = yy + 1000;
			y = yy;
		} else {
			x = x+500;
			y = yy;
		}
	  }
  },
  
generateVisualQuery: async function(text, xx, yy, queryId, queryQuestion){
	orderCounter = 1;
	isUnderUnion = false;
	 var prefixes = await dataShapes.getNamespaces();
		
			var prefixesText = [];
			for(var p in prefixes){
				prefixesText.push("PREFIX " + prefixes[p]["name"] + ": <" + prefixes[p]["value"] + ">");
			}
		
			text = prefixesText.join("\n") + text;
	
	  // Utilities.callMeteorMethod("parseExpressionForCompletions", text);
	  Utilities.callMeteorMethod("parseSPARQLText", text, async function(parsedQuery) {
		
		schemaName = dataShapes.schema.schemaType;
		  
		x = xx;
		y = yy;
		counter = 0;
		// console.log(JSON.stringify(parsedQuery, 0, 2));
		parsedQuery = transformParsedQuery(parsedQuery);
		  // console.log(JSON.stringify(parsedQuery, 0, 2));
		// var schema = new VQ_Schema();
		directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
		indirectClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
		
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		 if (proj) {
			  
			  if (proj.directClassMembershipRole) {
				var dirRole = proj.directClassMembershipRole;
				if(dirRole == "" || dirRole == "a" || dirRole == "rdf:type") directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
				else if(dirRole == "wdt:P31") directClassMembershipRole = "http://www.wikidata.org/prop/direct/P31";
				else directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
			  };
			   if (proj.indirectClassMembershipRole) {
				indirectClassMembershipRole = proj.indirectClassMembershipRole;
				if(indirectClassMembershipRole == "wdt:P31/wdt:P279*") indirectClassMembershipRole = "[instance of (P31)].[subclass of (P279)]*";
				if(indirectClassMembershipRole == "wdt:P31.wdt:P279*") indirectClassMembershipRole = "[instance of (P31)].[subclass of (P279)]*";
			  }; 
			  
			  
		 }
		
		// Get all variables (except class names) from a query SELECT statements, including subqueries.
		var variableList = await getAllVariablesInQuery(parsedQuery, []);
		
		// Generate ViziQuer query abstract syntax tables
		var abstractTable = await generateAbstractTable(parsedQuery, [], variableList, []);
		
		abstractTable["linkTable"] = removeDuplicateLinks(abstractTable["linkTable"]);
		
		// console.log(JSON.stringify(abstractTable["classesTable"], 0, 2));
		  // console.log("abstractTable", abstractTable);
		
		var classesTable = abstractTable["classesTable"];
		var classCount = Object.keys(classesTable).length;

		var whereTriplesVaribles = getWhereTriplesVaribles(parsedQuery["where"]);
		// Decide which class is a query start class
		
		var tempGetStartClass = getStartClass(classesTable, abstractTable["linkTable"]);
		
		
		
		var startClass = tempGetStartClass["startClass"];
		classesTable = tempGetStartClass["classesTable"];
			
		for(var fil in abstractTable["filterTable"]){
			if((typeof abstractTable["filterTable"][fil]["filterAdded"] !== "undefined" && abstractTable["filterTable"][fil]["filterAdded"] == false) || typeof tempGetStartClass.emptyClassSet !== "undefined"){
				if(typeof startClass["class"]["conditions"] === 'undefined') {
					startClass["class"]["conditions"] = [];
				}
				startClass["class"]["conditions"].push(abstractTable["filterTable"][fil]["filterString"])
			}
		}
			
		var isNotConnectdClass = true;
		while(isNotConnectdClass == true){
			isNotConnectdClass = false;
			var ct = [];
			for(var cl in abstractTable["classesTable"]){
				ct[cl] = false;
			}
			
			var ct = connectNotConnectedQueryParts(startClass["name"], abstractTable["linkTable"], ct);
			for(var cl in ct){
				if(ct[cl] == false){
					isNotConnectdClass = true;
					var link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":cl,
						"subject":startClass["name"],
						"isVisited":false,
						"linkType":"REQUIRED",
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"isVariable":false,
						"counter":orderCounter
					}
					abstractTable["linkTable"].push(link);
					orderCounter++;
					break;
				}
			}
		}
			
		if(parsedQuery["where"].length == 1 && parsedQuery["where"][0]["type"] == "optional" && (parsedQuery["where"][0]["patterns"].length != 1 || 
		(parsedQuery["where"][0]["patterns"].length == 1 && parsedQuery["where"][0]["patterns"][0]["type"] == "bgp" && parsedQuery["where"][0]["patterns"][0]["triples"].length != 1))){
			var unit
			if(typeof classesTable["[ ]"] === 'undefined'){
				unit = {
					"variableName":"?[ ]",
					"name": "[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classesTable["[ ]"] = unit;
			}else {
				unit = {
					"variableName":"?[ ]",
					"identification":null,
					"name": "[ ]"+counter,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classesTable["[ ]"+counter] = unit
				counter++;
			}
			var link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":startClass.name,
						"subject":unit.name,
						"isVisited":false,
						"linkType":"OPTIONAL",
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"counter":orderCounter
						}
			abstractTable["linkTable"].push(link);
			orderCounter++;
			
			if(typeof startClass.class.aggregations !== "undefined"){
				unit["aggregations"] = [];
				for(var aggr in startClass.class.aggregations){
					if(startClass.class.aggregations[aggr]["exp"].indexOf("(.)") !== -1){
						startClass.class.aggregations[aggr]["exp"] = startClass.class.aggregations[aggr]["exp"].replace("(.)", "(" + startClass.name + ")")
					} 
					unit["aggregations"].push(startClass.class.aggregations[aggr])	
				}
				// unit["aggregations"] = startClass.class.aggregations;
				startClass.class.aggregations = null;
			}
			
			startClass = {"name": unit.name, "class":unit};
		}

		var visitedClasses = [];
		for(var clazz in classesTable){
			visitedClasses[clazz] = false;
		}
		visitedClasses[ startClass["name"]] = true;

		// Generate tree ViziQuer query structure, from class and link tables 
		generateClassCtructuretemp = generateClassCtructure(startClass["class"], startClass["name"], classesTable, abstractTable["linkTable"], whereTriplesVaribles, visitedClasses, [], variableList);
	
		
		classesTable = generateClassCtructuretemp.clazz;
		conditionLinks = generateClassCtructuretemp.conditionLinks;
		classesTable["orderings"] = abstractTable["orderTable"];
		classesTable["graphs"] = abstractTable["fromTable"];
		if(typeof classesTable["groupings"] !== "undefined") classesTable["groupings"] = classesTable["groupings"].concat( abstractTable["groupTable"]);
		else classesTable["groupings"] = abstractTable["groupTable"];
		if(typeof parsedQuery["limit"] !== 'undefined') classesTable["limit"] =  parsedQuery["limit"];
		else if(parsedQuery["queryType"] == "ASK") classesTable["limit"] = 1;

		if(typeof parsedQuery["offset"] !== 'undefined') classesTable["offset"] =  parsedQuery["offset"];
		if(typeof parsedQuery["distinct"] !== 'undefined') classesTable["distinct"] =  parsedQuery["distinct"];
		if(abstractTable["serviceLabelLang"] !== '') classesTable["serviceLabelLang"] =  abstractTable["serviceLabelLang"];
		if(abstractTable["fullSPARQL"] !== '') classesTable["fullSPARQL"] =  abstractTable["fullSPARQL"];
		
		// Visualize query based on tree structure
		VQ_Elements = {};
		
		var variableListCount = getAllVariableCountInQuery(parsedQuery, []);
		
		await visualizeQuery(classesTable, null, variableListCount, queryId, queryQuestion);
		
		var i = 0;
		while(Object.keys(VQ_Elements).length < classCount && i < 100){
			await delay(100);
			i++;
		}
		
		 _.each(conditionLinks,function(condLink) {
			
			var linkName = condLink["identification"]["display_name"];
			var isNot = condLink["isNot"];
			var isInverse = condLink["isInverse"];
			var linkType = "REQUIRED";
			if(isNot == true) linkType = "NOT";
			
			 var target = new VQ_Element(VQ_Elements[condLink.target]);
			 var source = new VQ_Element(VQ_Elements[condLink.source]);
			 
			 var tCoordinates = target.getCoordinates();
			 var sCoordinates = source.getCoordinates();
			 
			  // var coordX = tCoordinates.x + Math.round(tCoordinates.width/2)+20;
			  var coordX = tCoordinates.x +20;
				var coordY = sCoordinates.y + sCoordinates.height;
				var locLink = [];

				if(isInverse != true){
					locLink = [coordX, coordY, coordX, tCoordinates.y]; 
					Create_VQ_Element(function(linkLine) {
						linkLine.setName(linkName);
						linkLine.setLinkType(linkType);
						linkLine.setNestingType("CONDITION");
					}, locLink, true, target, source);
				} else {
					locLink = [coordX, tCoordinates.y, coordX, coordY];
					Create_VQ_Element(function(linkLine) {
						linkLine.setName(linkName);
						linkLine.setLinkType(linkType);
						linkLine.setNestingType("CONDITION");
					}, locLink, true, source, target);
				}
			//TODO create condition link
		})
	  });
  },
});

const delay = ms => new Promise(res => setTimeout(res, ms));

// Generate ViziQuer query abstract syntax tables
async function generateAbstractTable(parsedQuery, allClasses, variableList, parentNodeList){
	// x = 200;
	// y = 10;
	// var schema = new VQ_Schema();

	var selectVariables = parsedQuery["variables"];

	var abstractTable = [];
	//table with textual SPARQL query prefixes
	var prefixes = parsedQuery["prefixes"];

	var classesTable = [];
	var attributeTable = [];
	var filterTable = [];
	var linkTable = [];
	var orderTable = [];
	var fromTable = [];
	var bindTable = [];
	var groupTable = [];
	var serviceLabelLang = "";
	var fullSPARQL = "";

	//where
	var where = parsedQuery["where"];
	
	var nodeWhere = parsedQuery["where"];
	
	if(where.length == 1 && typeof where[0]["type"] !== "undefined" && (where[0]["type"] == "graph" || where[0]["type"] == "service")) nodeWhere = where[0]["patterns"];
	
	// Create a list of nodes in a current query scope 
	var tempN = await collectNodeList(nodeWhere);
	var nodeList = tempN["nodeList"];
													  
	// For every structure in query WHERE part, create abstract tables instances. First triples, then the rest.
	for(var key in where){
		if(typeof where[key]["type"] !== "undefined" && where[key]["type"] == "bgp"){
			var wherePartTemp = await parseSPARQLjsStructureWhere(where[key], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
			classesTable = wherePartTemp["classesTable"];
			attributeTable = wherePartTemp["attributeTable"];
			linkTable = wherePartTemp["linkTable"];
			filterTable = wherePartTemp["filterTable"];
			bindTable = wherePartTemp["bindTable"];
		}
	}
	for(var key in where){
		if(where[key]["type"] != "group"){
			if(where[key]["type"] == "service" && where[key]["name"] == "http://wikiba.se/ontology#label"){
				

			}
			else if(typeof where[key]["type"] === "undefined" || (typeof where[key]["type"] !== "undefined" && where[key]["type"] !== "bgp" && where[key]["type"] !== "service")){
				var wherePartTemp = await parseSPARQLjsStructureWhere(where[key], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
			}
		}
	}
	
	for(var key in where){
		if(where[key]["type"] == "group" || where[key]["type"] == "service"){
			if(where[key]["type"] == "service" && where[key]["name"] == "http://wikiba.se/ontology#label"){
				
				for(var pattern in where[key]["patterns"]){
					if(where[key]["patterns"][pattern]["triples"].length == 1 && where[key]["patterns"][pattern]["triples"][0]["subject"] == "http://www.bigdata.com/rdf#serviceParam"){
						for(var triple in where[key]["patterns"][pattern]["triples"]){
							serviceLabelLang = where[key]["patterns"][pattern]["triples"][triple]["object"].replace(/"/g, "");
						}
					} else {
						 Utilities.callMeteorMethod("parseService", where[key], async function(parsedQuery) {
							 fullSPARQL = fullSPARQL + parsedQuery
						 })
					}
					await delay(10)
					console.log("fullSPARQL", fullSPARQL)
				}
			}
			else if(typeof where[key]["type"] === "undefined" || (typeof where[key]["type"] !== "undefined" && where[key]["type"] !== "bgp")){
				var wherePartTemp = await parseSPARQLjsStructureWhere(where[key], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
			}
		}
	}
	
	// Connect equals classes 
	linkTable = connectNotConnectedClasses(classesTable, linkTable, nodeList);
	
	//from
	var from = parsedQuery["from"];
	for(var f in from){
		var graphInstruction = "FROM";
		if(f == "named") graphInstruction = "FROM NAMED";
		var graph = from[f];
		fromTable.push({
			"graph":graph,
			"graphInstruction":graphInstruction
		})
	}
	
	//order
	var order = parsedQuery["order"];
	for(var key in order){
		if(typeof order[key]["expression"] === "string"){
			var exp = vq_visual_grammar.parse(order[key]["expression"])["value"];
			var isDescending = false;
			if(typeof order[key]["descending"] !== 'undefined') isDescending = order[key]["descending"];
			if(typeof attributeTable[exp] !== 'undefined' && parsedQuery["variables"].indexOf("?"+exp) == -1 && (attributeTable[exp]["alias"] == "" || (attributeTable[exp]["identification"] != null && attributeTable[exp]["identification"]["local_name"] == attributeTable[exp]["alias"]))) {
				
				attributeTable[exp]["seen"] = true;
			}
			orderTable.push({
				"exp":exp,
				"isDescending":isDescending
			})
		} else {
			var isDescending = false;
			if(typeof order[key]["descending"] !== 'undefined') isDescending = order[key]["descending"];
			

			
			var orderTemp = await parseSPARQLjsStructureWhere(order[key]["expression"], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
			if(orderTemp["viziQuerExpr"]["exprString"] != ""){
				orderTable.push({
					"exp":orderTemp["viziQuerExpr"]["exprString"],
					"isDescending":isDescending
				})
			} else if(order[key]["expression"]["type"] == "aggregate"){	
				var distinct = "";
				if(order[key]["expression"]["distinct"] == true)distinct = "DISTINCT ";
				
				var aggregateExpression;
				
				//agregate on expression
				if(typeof order[key]["expression"]["expression"] == "object"){
					var temp = await parseSPARQLjsStructureWhere(order[key]["expression"]["expression"], nodeList, [], classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
					aggregateExpression = temp.viziQuerExpr.exprString;
					aggregationExp = order[key]["expression"]["aggregation"] + "(" +distinct + aggregateExpression +")";
					orderTable.push({
						"exp":aggregationExp,
						"isDescending":isDescending
					})
				} else {
					aggregateExpression = vq_visual_grammar.parse(order[key]["expression"]["expression"])["value"];
					var aggregationExp = order[key]["expression"]["aggregation"] + "(" +distinct + aggregateExpression +")";
					orderTable.push({
						"exp":aggregationExp,
						"isDescending":isDescending
					}) 
					
				}
				
			}
		}
	}
	
	//select
	var variables = parsedQuery["variables"];
	
	var starInSelect = false;
	for(var key in variables){
		if(typeof variables[key] === 'string' && variables[key] == "*"){
			starInSelect = true;
			break;
			
		}
	}
	if(starInSelect == true){
		variables = variables.concat(tempN["selectStarList"]);
		variables = variables.filter(function (el, i, arr) {
			return arr.indexOf(el) === i && el !== "*" && el.startsWith("_:") != true;
		});
	}
	
	var aggregationInSelect = false;
	
	for(var key in variables){
		
		if(typeof variables[key] === 'string'){
			if(serviceLabelLang != "" && 
			(variables[key].endsWith("Label") == true && typeof variableList[variables[key].substring(0, variables[key].length-5)] !== "undefined")
			|| (variables[key].endsWith("AltLabel") == true && typeof variableList[variables[key].substring(0, variables[key].length-8)] !== "undefined")
			|| (variables[key].endsWith("Description") == true && typeof variableList[variables[key].substring(0, variables[key].length-11)] !== "undefined")
			){
				
			} else {
			
			var isVariable = false;
			for(var link in linkTable){
				if(typeof linkTable[link]["isVariable"] !== "undefined" && linkTable[link]["isVariable"] == true && (linkTable[link]["linkIdentification"]["short_name"].substring(1) == variables[key] || starInSelect == true)){
					isVariable = true;
					if(linkTable[link]["linkIdentification"]["short_name"].startsWith("??")){
						linkTable[link]["linkIdentification"]["local_name"] = linkTable[link]["linkIdentification"]["local_name"].substring(1);
						linkTable[link]["linkIdentification"]["short_name"] = linkTable[link]["linkIdentification"]["short_name"].substring(1);
					}
					
					break;
				}
			}
			
			
			if(typeof bindTable[variables[key].substring(1)] !== "undefined" && typeof bindTable[variables[key].substring(1)]["class"] !== "undefined"){	
				var cl = classesTable[bindTable[variables[key].substring(1)]["class"]];
				for(var field in cl["fields"]){
					
					if(typeof bindTable[cl["fields"][field]["alias"]] !== "undefined") cl["fields"][field]["isInternal"] = false;
				}
			}
			
			//check kind (Class, reference or Property)
			//class
			var classes2 = findByShortName(classesTable, "?"+variables[key]);
			for(var clazz in classes2){
				classesTable[clazz]["identification"]["short_name"] = classesTable[clazz]["identification"]["short_name"].substring(1);
			}		
			
			var classes = findByVariableName(classesTable, variables[key]);
				
			// if(Object.keys(classes).length > 0 && typeof nodeList[variables[key]] !== "undefined"){
			if(Object.keys(classes).length > 0){
				//add class as attribute
				var parsedClass = vq_visual_grammar.parse(variables[key])["value"];
				var identification = await dataShapes.resolveClassByName({name: parsedClass});
				
				var addLabel = false;
				if(typeof variableList[variables[key]+"Label"] !== "undefined" && serviceLabelLang != "")addLabel = true;
				var addAltLabel = false;
				if(typeof variableList[variables[key]+"AltLabel"] !== "undefined" && serviceLabelLang != "")addAltLabel = true;
				var addDescription = false;
				if(typeof variableList[variables[key]+"Description"] !== "undefined" && serviceLabelLang != "")addDescription = true;
	
				var attributeInfo = {
					"alias":"",
					"identification":identification.data[0],
					"exp":"(select this)",
					"addLabel":addLabel,
					"addAltLabel":addAltLabel,
					"addDescription":addDescription,
					"counter":0
				}

				orderCounter++;
				if(identification.complete == true) {
					var sn = identification.data[0].display_name;
					
					if(schemaName == "wikidata" && identification.data[0].prefix == "wd"){}
					else if(identification.data[0].is_local != true)sn = identification.data[0].prefix+ ":" + sn;
					attributeInfo.identification.short_name = sn;	
				}
				for(var clazz in classes){
					classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
					// console.log("1", attributeInfo)
				}
				if(typeof nodeList[variables[key]] === "undefined"){
					var parsedAttribute = vq_visual_grammar.parse(variables[key])["value"];	
					if(typeof bindTable[parsedAttribute] === 'undefined'){		
						if(isVariable == false && variableList[variables[key]] != 1){
							var addLabel = false;
							var addAltLabel = false;
							var addDescription = false;
							for(var k in variables){
								if(typeof variables[k] === "string"){
									if(variables[k].endsWith("Label") == true && variables[k].startsWith(variables[key])) addLabel = true;
									if(variables[k].endsWith("AltLabel") == true && variables[k].startsWith(variables[key])) addAltLabel = true;
									if(variables[k].endsWith("Description") == true && variables[k].startsWith(variables[key])) addDescription = true;
								}
							}
							
							var attributeInfo = {
								"alias":"",
								"identification":null,
								"requireValues":false,
								"isInternal":false,
								"groupValues":false,
								"exp":parsedAttribute,
								"addLabel":addLabel,
								"addAltLabel":addAltLabel,
								"addDescription":addDescription,
								"counter":orderCounter
							}
						
							orderCounter++;

							for (var clazz in classesTable){
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								// console.log("1,5", attributeInfo)
								break;
							}
						} else if(variableList[variables[key]] == 1) {
							// Interpreter.showErrorMsg("Unbound variable '" + variables[key] + "' excluded from the visual presentation", -3);
						}
					}
				}
			} else if (Object.keys(findByShortName(classesTable, variables[key])).length > 0){
				
			}
			//reference
			else if(typeof variableList[variables[key]] !== 'undefined' && typeof attributeTable[variables[key].substring(1)] === 'undefined'){		
				var parsedAttribute = vq_visual_grammar.parse(variables[key])["value"];	
				if(typeof bindTable[parsedAttribute] === 'undefined'){		
					if(isVariable == false && variableList[variables[key]] != 1){
						var addLabel = false;
						var addAltLabel = false;
						var addDescription = false;
						for(var k in variables){
							if(typeof variables[k] === "string"){
								if(variables[k].endsWith("Label") == true && variables[k].startsWith(variables[key])) addLabel = true;
								if(variables[k].endsWith("AltLabel") == true && variables[k].startsWith(variables[key])) addAltLabel = true;
								if(variables[k].endsWith("Description") == true && variables[k].startsWith(variables[key])) addDescription = true;
							}
						}
						
						var attributeInfo = {
							"alias":"",
							"identification":null,
							"requireValues":false,
							"isInternal":false,
							"groupValues":false,
							"exp":parsedAttribute,
							"addLabel":addLabel,
							"addAltLabel":addAltLabel,
							"addDescription":addDescription,
							"counter":orderCounter
						}
					
						orderCounter++;

						for (var clazz in classesTable){
							classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
							// console.log("2", attributeInfo)
							break;
						}
					} else if(variableList[variables[key]] == 1) {
						// Interpreter.showErrorMsg("Unbound variable '" + variables[key] + "' excluded from the visual presentation", -3);
					}
				} else if(variableList["?"+parsedAttribute] != "seen") {
	
					var attributeInfo = {
						"alias":bindTable[parsedAttribute]["alias"],
						"identification":null,
						"requireValues":false,
						"isInternal":false,
						"groupValues":false,
						"exp":bindTable[parsedAttribute]["exp"],
						"counter":orderCounter
					}
	
					orderCounter++;
					bindTable[parsedAttribute]["seen"] = true;

					for (var clazz in classesTable){
						classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
						// console.log("3", attributeInfo)
						break;
					}
				}
			}
			
			
			//property
			if(typeof attributeTable[vq_visual_grammar.parse(variables[key])["value"]] !== 'undefined') {
				// add attribute
				
				var parsedAttribute = vq_visual_grammar.parse(variables[key])["value"];	
				var attributes = findByVariableName(attributeTable, parsedAttribute);
				
				for(var attribute in attributes){
					if(attributeTable[attribute]["seen"] != true){
						var attributeInfoTemp = attributeTable[attribute];
						var exp = attributeInfoTemp["identification"]["short_name"];
						if(typeof attributeInfoTemp.exp !== 'undefined') exp = attributeInfoTemp.exp;
						
						var attrAlias = attributeInfoTemp["alias"];
						if(attrAlias == "" && typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["identification"]["short_name"].indexOf(":")!= -1) attrAlias = attributeInfoTemp["identification"]["local_name"];
						
						var addLabel = false;
						if(typeof variableList["?"+attrAlias+"Label"] !== "undefined" && serviceLabelLang != "")addLabel = true;
						var addAltLabel = false;
						if(typeof variableList["?"+attrAlias+"AltLabel"] !== "undefined" && serviceLabelLang != "")addAltLabel = true;
						var addDescription = false;
						if(typeof variableList["?"+attrAlias+"Description"] !== "undefined" && serviceLabelLang != "")addDescription = true;
						
						// if(typeof variableList["?"+attrAlias] !== 'undefined' && variableList["?"+attrAlias] <=1 ) attrAlias = "";
						
						var attributeInfo = {
							"alias":attrAlias,
							"identification":attributeInfoTemp["identification"],
							"requireValues":attributeInfoTemp["requireValues"],
							"isInternal":false,
							"groupValues":false,
							"exp":exp,
							"addLabel":addLabel,
							"addAltLabel":addAltLabel,
							"addDescription":addDescription,
							"graph":attributeInfoTemp["graph"],
							"graphInstruction":attributeInfoTemp["graphInstruction"],
							"counter":attributeInfoTemp["counter"]
						}

						if(attributeTable[attribute]["class"] != attribute){
							classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
							// console.log("4", attributeInfo, variableList)
							attributeTable[attribute]["seen"] = true;
						}
					} else {
						attributeTable[attribute]["isInternal"] = false;
					}
				}
			}
			}
			
		} else if(typeof variables[key] === 'object'){
			
			var alias = vq_visual_grammar.parse(variables[key]["variable"])["value"];
			var expression = variables[key]["expression"];
			//aggregation
			if(expression["type"] == "aggregate"){
				var distinct = "";
				if(expression["distinct"] == true)distinct = "DISTINCT ";
				
				var aggregateExpression;
				
				//agregate on expression
				if(typeof expression["expression"] == "object"){
					var temp = await parseSPARQLjsStructureWhere(expression["expression"], nodeList, [], classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
					aggregateExpression = temp.viziQuerExpr.exprString;
					aggregationExp = expression["aggregation"] + "(" +distinct + aggregateExpression +")";
						
					var aggregateInfo = {
						"exp":aggregationExp,
						"alias":alias
					}
					var aggrClass;
					for(var attr in temp["viziQuerExpr"]["exprVariables"]){
						var attribute = temp["viziQuerExpr"]["exprVariables"][attr];
						var inSameClass = false;
						if(attr == 0){
							var attributes = findByVariableName(attributeTable, attribute);
							
							for(var a in attributes){
								for (var clazz in classesTable){
									if(clazz == attributeTable[a]["class"])inSameClass = true;
									classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
									break;
								}
							}
						}
						var attributes = findByVariableName(attributeTable, attribute);
						for(var attribute in attributes){
							if(((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["local_name"]) || attributeTable[attribute]["alias"] == "") && inSameClass == true)attributeTable[attribute]["seen"] = true;
						}
					}
					
				} else {
					aggregateExpression = vq_visual_grammar.parse(expression["expression"])["value"];
					var aggregationExp = expression["aggregation"] + "(" +distinct + aggregateExpression +")";
					
					//aggregate on class
					var classes = findByVariableName(classesTable, expression["expression"]);

					if(Object.keys(classes).length == 1){
						if(expression["aggregation"].toLowerCase() == "count") {
							if(distinct == "") aggregationExp = "count(.)";
							else  aggregationExp = "count_distinct(.)";
						}
						var aggregateInfo = {
							"exp":aggregationExp,
							"alias":alias
						}
						for (var clazz in classes){
							classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
							break;
						}
					} else if(Object.keys(classes).length > 1){
						
						for (var clazz in classesTable){
							if(expression["aggregation"].toLowerCase() == "count") {
								if(classesTable[clazz]["variableName"] !== expression["expression"]){
									if(distinct == "") aggregationExp = "count("+expression["expression"].substring(1)+")";
									else  aggregationExp = "count_distinct("+expression["expression"].substring(1)+")";;
								} else {
									if(distinct == "") aggregationExp = "count(.)";
									else  aggregationExp = "count_distinct(.)";
								}
							}
							var aggregateInfo = {
								"exp":aggregationExp,
								"alias":alias
							}
							
							classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);

							break;
						}
					}
					//aggregate on attribute
					else if(Object.keys(findByVariableName(attributeTable, aggregateExpression)).length > 0) {
						var attributes = findByVariableName(attributeTable, aggregateExpression);

						for(var attribute in attributes){
							if(attributeTable[attribute]["alias"] == "" && typeof attributeTable[attribute]["exp"] !== 'undefined') aggregationExp = expression["aggregation"] + "(" +distinct + attributeTable[attribute]["exp"] +")";
							
							var aggregateInfo = {
								"exp":aggregationExp,
								"alias":alias
							}

							var inSameClass = false;
							for (var clazz in classesTable){
								classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);

								if(clazz == attributeTable[attribute]["class"])inSameClass = true;
								break;
							}
							if(((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["local_name"]) || attributeTable[attribute]["alias"] == "" ) && inSameClass == true)attributeTable[attribute]["seen"] = true;
						}
					} else {
						var aggregateInfo = {
								"exp":aggregationExp,
								"alias":alias
							}

						for (var clazz in classesTable){
							classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
							break;
						}
					}
				}
			}
			//operation
			else if(expression["type"] == "operation"){
			
				var temp = await parseSPARQLjsStructureWhere(expression, nodeList, [], classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);

				var attributeInfo = {
					"alias":vq_visual_grammar.parse(variables[key]["variable"])["value"],
					"identification":null,
					"requireValues":false,
					"isInternal":false,
					"groupValues":false,
					"exp":temp["viziQuerExpr"]["exprString"],
					"counter":orderCounter
				} 
				orderCounter++;
				for(var attr in temp["viziQuerExpr"]["exprVariables"]){
					var attribute = temp["viziQuerExpr"]["exprVariables"][attr];
					var inSameClass = false;
					if(attr == 0){
						var attributes = findByVariableName(attributeTable, attribute);
							
						for(var a in attributes){
							for (var clazz in classesTable){
								if(clazz == attributeTable[a]["class"])inSameClass = true;
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								// console.log("5", attributeInfo)
								break;
							}
						}
						if(Object.keys(attributes.length == 0)){
							for (var clazz in classesTable){
								if(clazz == attribute)inSameClass = true;
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								// console.log("6", attributeInfo)
								break;
							}
						}
					}
					var attributes = findByVariableName(attributeTable, attribute);
					for(var attribute in attributes){
						if(((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["local_name"]) || attributeTable[attribute]["alias"] == "") && inSameClass == true)attributeTable[attribute]["seen"] = true;
					}
				}
			}
			//functionCall
			else if(expression["type"] == "functionCall"){
				
				var functionName = "<"+expression["function"]+">"
				// var ignoreFunction = false;
				// if(where["function"] == "http://www.w3.org/2001/XMLSchema#dateTime" || where["function"] == "http://www.w3.org/2001/XMLSchema#date" || where["function"] == "http://www.w3.org/2001/XMLSchema#decimal") ignoreFunction = true;
				//if(where["function"] == "http://www.w3.org/2001/XMLSchema#decimal") functionName = "xsd:decimal";
				
				var shortFunction = await generateInstanceAlias(expression["function"]);
				if(shortFunction != expression["function"]) functionName = shortFunction;
				var viziQuerExpr = {
					"exprString" : "",
					"exprVariables" : []
				};

				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + functionName + "(";
				var args = [];
					
				for(var arg in expression["args"]){
					if(typeof expression["args"][arg] == 'string') {
						var arg1 = generateArgument(expression["args"][arg]);
						if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
						args.push(arg1["value"]);
					}
					else if(typeof expression["args"][arg] == 'object'){
						var temp = await parseSPARQLjsStructureWhere(expression["args"][arg], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						bindTable = temp["bindTable"];
						args.push(temp["viziQuerExpr"]["exprString"]);
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					}
				}
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ");
				// if(ignoreFunction == false) 
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + ")";
				
				var attributeInfo = {
					"alias":vq_visual_grammar.parse(variables[key]["variable"])["value"],
					"identification":null,
					"requireValues":false,
					"isInternal":false,
					"groupValues":false,
					"exp":viziQuerExpr["exprString"],
					"counter":orderCounter
				} 
				
				orderCounter++;
				for(var attr in viziQuerExpr["exprVariables"]){
					var attribute = viziQuerExpr["exprVariables"][attr];
					var inSameClass = false;
					if(attr == 0){
						var attributes = findByVariableName(attributeTable, attribute);
							
						for(var a in attributes){
							for (var clazz in classesTable){
								if(clazz == attributeTable[a]["class"])inSameClass = true;
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								// console.log("7", attributeInfo)
								break;
							}
						}
						if(Object.keys(attributes.length == 0)){
							for (var clazz in classesTable){
								if(clazz == attribute)inSameClass = true;
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								// console.log("8", attributeInfo)
								break;
							}
						}
					}
					var attributes = findByVariableName(attributeTable, attribute);
					for(var attribute in attributes){
						if(((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["local_name"]) || attributeTable[attribute]["alias"] == "") && inSameClass == true)attributeTable[attribute]["seen"] = true;
					}
				}
			}
		}	
	}
	
	for(var key in variables){	
		if(typeof variables[key] === 'string' && serviceLabelLang != "" && 
		((variables[key].endsWith("Label") == true && typeof variableList[variables[key].substring(0, variables[key].length-5)] !== "undefined")
		 || (variables[key].endsWith("AltLabel") == true && typeof variableList[variables[key].substring(0, variables[key].length-8)] !== "undefined")
		 || (variables[key].endsWith("Description") == true && typeof variableList[variables[key].substring(0, variables[key].length-11)] !== "undefined"))
		){
			var classes = findByVariableName(classesTable, variables[key].substring(0, variables[key].length-5));
			var addLabel = false;
			var addAltLabel = false;
			var addDescription = false;
			
			if(variables[key].endsWith("Label") == true && typeof variableList[variables[key].substring(0, variables[key].length-5)] !== "undefined") addLabel = true;
			if(variables[key].endsWith("AltLabel") == true && typeof variableList[variables[key].substring(0, variables[key].length-8)] !== "undefined") addAltLabel = true;
			if(variables[key].endsWith("Description") == true && typeof variableList[variables[key].substring(0, variables[key].length-11)] !== "undefined") addDescription = true;
			
			for(var clazz in classes){
				if(typeof nodeList[classes[clazz]["variableName"]] !== "undefined"){
					var fields = classes[clazz]["fields"];
					var selectThisFound = false;
					for(var field in fields){
						if(fields[field]["exp"] == "(select this)"){
							selectThisFound = true;
							break;
						}
					}
					if(selectThisFound == false){
						var attributeInfo = {
								"alias":"",
								"identification":null,
								"requireValues":false,
								"isInternal":true,
								"groupValues":false,
								"exp":"(select this)",
								"addLabel":addLabel,
								"addAltLabel":addAltLabel,
								"addDescription":addDescription,
								"counter":0
						} 
						orderCounter++;
						classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
						// console.log("9", attributeInfo)
					}	
				}
			}
		}
	}
	
	//internal binds
	for(var bind in bindTable){
		if(typeof bindTable[bind]["seen"] === "undefined"){

			var attributeInfo = {
						"alias":bindTable[bind]["alias"],
						"identification":null,
						"requireValues":false,
						"isInternal":true,
						"groupValues":false,
						"exp":bindTable[bind]["exp"],
						"counter":orderCounter
			}
			orderCounter++;
			for (var clazz in classesTable){
				classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
				// console.log("10", attributeInfo)
				break;
			}
		}
	}

	//internal attributes
	for(var attribute in attributeTable){
		if(attributeTable[attribute]["seen"] != true || variableList["?"+attribute] <= 1 || variableList["?"+attribute] == 4){
			var attributeInfoTemp = attributeTable[attribute];

			var found = false;
			
			//if(typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["identification"]["max_cardinality"] == 1 && attributeInfoTemp["alias"] != ""){
			if(typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["alias"] != "" && (typeof variableList["?"+attributeInfoTemp["alias"]] === "undefined" || variableList["?"+attributeInfoTemp["alias"]] <=1)){
				
				if(variableList["?"+attribute] <= 1 ){
					//conditions
					for(var condition in classesTable[attributeTable[attribute]["class"]]["conditions"]){
						if(!classesTable[attributeTable[attribute]["class"]]["conditions"][condition].includes(attributeInfoTemp["alias"]+")")){
							if(classesTable[attributeTable[attribute]["class"]]["conditions"][condition].includes(attributeInfoTemp["alias"])) found = true;
							if(typeof attributeInfoTemp["exp"] !== 'undefined') classesTable[attributeTable[attribute]["class"]]["conditions"][condition] = classesTable[attributeTable[attribute]["class"]]["conditions"][condition].replace(attributeInfoTemp["alias"], attributeInfoTemp["exp"]);
							else classesTable[attributeTable[attribute]["class"]]["conditions"][condition] = classesTable[attributeTable[attribute]["class"]]["conditions"][condition].replace(attributeInfoTemp["alias"], attributeInfoTemp["identification"]["short_name"]);
						}
					}
					//fields
					for(var field in classesTable[attributeTable[attribute]["class"]]["fields"]){
						if(classesTable[attributeTable[attribute]["class"]]["fields"][field]["alias"] != attributeInfoTemp["alias"] && classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"] != "(select this)"){
							if(classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"].includes(attributeInfoTemp["alias"])) found = true;
							if(typeof attributeInfoTemp["exp"] !== 'undefined') classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"] = classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["exp"])
							else classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"] = classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["identification"]["short_name"]);
						}
					}
				}
				
			}
			if(typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["alias"] != "" && (typeof variableList["?"+attributeInfoTemp["alias"]] === "undefined" || variableList["?"+attributeInfoTemp["alias"]] <=1 || variableList["?"+attribute] == 4)){
				//agregations
				for(var aggregation in classesTable[attributeTable[attribute]["class"]]["aggregations"]){
					if(classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].indexOf("(.)") == -1 && variableList["?"+attribute] <= 1 || (variableList["?"+attribute] == 4 && classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["alias"] == attributeInfoTemp["alias"])){

						if(classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].includes(attributeInfoTemp["alias"])) found = true;
						if(typeof attributeInfoTemp["exp"] !== 'undefined') {
							classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"] = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["exp"])
						}else {
							classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"] = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["identification"]["short_name"]);
						}
						
						for(var field in classesTable[attributeTable[attribute]["class"]]["fields"]){
							if(classesTable[attributeTable[attribute]["class"]]["fields"][field]["alias"] == attributeInfoTemp["alias"]) delete classesTable[attributeTable[attribute]["class"]]["fields"][field];
						}
					}
				}
			}
			if(found == false && attributeTable[attribute]["seen"] != true){
				var exp = attributeInfoTemp["exp"];
				if(typeof exp === 'undefined') exp = attributeInfoTemp["identification"]["short_name"];
				var attributeInfo = {
						"alias":attributeInfoTemp["alias"],
						"identification":attributeInfoTemp["identification"],
						"requireValues":attributeInfoTemp["requireValues"],
						"isInternal":true,
						"groupValues":false,
						"exp":exp,
						"graph":attributeInfoTemp["graph"],
						"graphInstruction":attributeInfoTemp["graphInstruction"],
						"counter":attributeInfoTemp["counter"]
				} 
			
				classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
				// console.log("path", attributeInfo)
			}
		}
	}
	
	//group
	var group = parsedQuery["group"];
	for(var key in group){
		var exp = vq_visual_grammar.parse(group[key]["expression"])["value"];
		var classes = findByVariableName(classesTable, group[key]["expression"]);
		if(Object.keys(classes).length > 0){
			for (var clazz in classes){
				classesTable[clazz]["groupByThis"] = true;
			}
		} 
		else {
			var inSelect = false;
			for(var k in variables){
				if(typeof variables[k] === 'string' && variables[k] == group[key]["expression"]){
					inSelect = true;
				}
			}
			if(inSelect == false) groupTable.push(exp); 
		}

	}

	return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, orderTable:orderTable, groupTable:groupTable, nodeList:nodeList, serviceLabelLang:serviceLabelLang, fullSPARQL:fullSPARQL, fromTable:fromTable};
}

function connectNotConnectedClasses(classesTable, linkTable, nodeList){
	
	for(clazz in classesTable){	
		var clazzFound = false;
		for(link in linkTable){
			if((linkTable[link]["subject"] == clazz && typeof classesTable[linkTable[link]["object"]] !== "undefined") || (linkTable[link]["object"] == clazz && typeof classesTable[linkTable[link]["subject"]] !== "undefined")) {
			//if((linkTable[link]["subject"] == clazz ) || (linkTable[link]["object"] == clazz )) {
				clazzFound = true;
				break;
			}
		}
		if(clazzFound == false){
			var equalClasses = connectEqualClasses(classesTable[clazz]["variableName"], nodeList, linkTable);
			if(equalClasses["linkAdded"] == true) linkTable = equalClasses["linkTable"];
			else{
				for(var clazz2 in classesTable){
					if(clazz != clazz2){
						var link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":clazz,
						"subject":clazz2,
						"isVisited":false,
						"linkType":"REQUIRED",
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"counter":orderCounter
						}
						
						if(typeof classesTable[clazz2]["graphInstruction"] !== "undefined" && typeof classesTable[clazz2]["graph"] !== "undefined"){
							link["graphInstruction"] = classesTable[clazz2]["graphInstruction"];
							link["graph"] = classesTable[clazz2]["graph"];
						}
						
						if(typeof classesTable[clazz]["graphInstruction"] !== "undefined" && typeof classesTable[clazz]["graph"] !== "undefined"){
							link["graphInstruction"] = classesTable[clazz]["graphInstruction"];
							link["graph"] = classesTable[clazz]["graph"];
						}
						
						linkTable.push(link);
						orderCounter++;
						break;
					}
				}
			}
		}
	}
	return linkTable;
}

function connectNotConnectedQueryParts(clazz, linkTable, classesTable){
	if(classesTable[clazz] !== true){
		classesTable[clazz] = true;
		for(var link in linkTable){
			if(linkTable[link]["subject"] == clazz){
				classesTable = connectNotConnectedQueryParts(linkTable[link]["object"], linkTable, classesTable)
			} else if(linkTable[link]["object"] == clazz){
				classesTable = connectNotConnectedQueryParts(linkTable[link]["subject"], linkTable, classesTable)
			} 
		}
	}
	return classesTable
}

function connectEqualClasses(node, nodeList, linkTable){
		var linkAdded = false;
		if(Object.keys(nodeList[node]["uses"].length > 1)){
			var linkNodes = [];
			for(var use in nodeList[node]["uses"]){
				var nodeInLinkTable = false;
				for(var link in linkTable){
					if(linkTable[link]["subject"] == nodeList[node]["uses"][use] || linkTable[link]["object"] == nodeList[node]["uses"][use]) {
						nodeInLinkTable = true;
						break;
					}
				}
				if(nodeInLinkTable == false) linkNodes.push(use);
			}
			if(linkNodes.length > 1) {
				linkAdded = true;
				var subject = linkNodes[0];
				for (i = 1; i < linkNodes.length; i++) {
					if(!subject.includes("[ + ]") && !linkNodes[i].includes("[ + ]")){
						var link = {
							"linkIdentification":{local_name: "==", display_name: "==", short_name: "=="},
							"object":subject,
							"subject":linkNodes[i],
							"isVisited":false,
							"linkType":"REQUIRED",
							"isSubQuery":false,
							"isGlobalSubQuery":false,
							"counter":orderCounter
						}
	
						linkTable.push(link);
						orderCounter++;
					}
				}
			}
		}
	return {"linkTable":linkTable, "linkAdded":linkAdded};
}

// function connectEqualClasses(nodeList, classesTable, linkTable){
	// for(var node in nodeList){
		// if(Object.keys(nodeList[node]["uses"].length > 1)){
			// var linkNodes = [];
			// for(var use in nodeList[node]["uses"]){
				// var nodeInLinkTable = false;
				// for(var link in linkTable){
					// if(linkTable[link]["subject"] == nodeList[node]["uses"][use] || linkTable[link]["object"] == nodeList[node]["uses"][use]) {
						// nodeInLinkTable = true;
						// break;
					// }
				// }
				// if(nodeInLinkTable == false) linkNodes.push(use);
			// }
			// if(linkNodes.length > 1) {
				// var subject = linkNodes[0];
				// for (i = 1; i < linkNodes.length; i++) {
					// var link = {
						// "linkIdentification":{localName: "==", short_name: "=="},
						// "object":subject,
						// "subject":linkNodes[i],
						// "isVisited":false,
						// "linkType":"REQUIRED",
						// "isSubQuery":false,
						// "isGlobalSubQuery":false,
					// }
					// linkTable.push(link);
				// }
			// }
		// }
	// }
	// return linkTable;
// }

function connectAllClasses(classesTable, linkTable, allClasses){
	
	if(Object.keys(classesTable.length > 1)){
		for(var clazz in classesTable){
			if(classesTable[clazz]["variableName"] != "?[ + ]" && typeof allClasses[clazz] === 'undefined'){
				
				var classNotConnected = true;
				for(var link in linkTable){
					if(linkTable[link]["object"] == clazz || linkTable[link]["subject"] == clazz){
						classNotConnected = false;
						break;
					}
				}
				if(classNotConnected == true){
					var classToConnect;
					for(var c in classesTable){
						if(c != clazz && classesTable[c]["variableName"] != "?[ + ]"){
							classToConnect = c;
							break;
						}
					}
					if(typeof classToConnect !== 'undefined'){
						var link = {
								"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
								"object":clazz,
								"subject":classToConnect,
								"isVisited":false,
								"linkType":"REQUIRED",
								"isSubQuery":false,
								"isGlobalSubQuery":false,
								"counter":orderCounter
						}

						linkTable.push(link);
						orderCounter++;
					}
				}
			}
		}
	}
	return linkTable;
}

async function parseSPARQLjsStructureWhere(where, nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression){
	
	var viziQuerExpr = {
		"exprString" : "",
		"exprVariables" : []
	};
	var linkTableAdded = [];
	var classTableAdded = [];
	var attributeTableAdded = [];

	//type=bgp
	if(where["type"] == "bgp"){
		var triples = where["triples"];
		var temp = await generateTypebgp(triples, nodeList, parentNodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
		
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		linkTable = temp["linkTable"];
		filterTable = temp["filterTable"];
		nodeList = temp["nodeList"];
		linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
		classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
		attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
	}
	//type=optional
	if(where["type"] == "optional"){
		
		// bgptype = "optional";
		var patterns = where["patterns"];
		var visited = false;
		//if optional attribute
		if(patterns.length == 1 && patterns[0]["type"] == "bgp" && patterns[0]["triples"].length == 1){
			bgptype = "optional";
		} else if(patterns.length == 2 &&
			patterns[0]["type"] == "bgp" && 
			patterns[1]["type"] == "filter" && 
			typeof patterns[1]["expression"] !== 'undefined' &&
			patterns[1]["expression"]["type"] == "operation" &&
			patterns[1]["expression"]["operator"] == "=" &&
			patterns[1]["expression"]["args"].length == 2 &&
			patterns[1]["expression"]["args"][0]["type"] == "operation" && 
			patterns[1]["expression"]["args"][0]["operator"] == "lang"
		) { 
			visited = true;
			bgptype = "optional";
			var triples = patterns[0]["triples"];
			var temp = await generateTypebgp(triples, nodeList, parentNodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
			
			classesTable = temp["classesTable"];
			attributeTable = temp["attributeTable"];
			classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
			attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
			
			for(var attr in attributeTableAdded){
				
				var isInternal = false;
				if(typeof variableList["?"+attributeTable[attributeTableAdded[attr]]["alias"]] !== 'undefined' && variableList["?"+attributeTable[attributeTableAdded[attr]]["alias"]] > 1){
					isInternal = false;
				} else isInternal = true;
				
				className = attributeTable[attributeTableAdded[attr]]["class"];
				var attributeInfo = {
					"alias":attributeTable[attributeTableAdded[attr]]["alias"],
					"identification":attributeTable[attributeTableAdded[attr]]["identification"],
					"exp": attributeTable[attributeTableAdded[attr]]["identification"]["short_name"]+"@"+ patterns[1]["expression"]["args"][1].replace(/\"/g,''),
					"counter":attributeTable[attributeTableAdded[attr]]["counter"],
					"isInternal":isInternal,
				}

				var classes = findByVariableName(classesTable, "?"+className);
				if(Object.keys(classes).length > 0){
					for(var clazz in classes){
						classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
						// console.log("12", attributeInfo)
					}
				}
				attributeTable[attributeTableAdded[attr]]["seen"] = true;
			}	
		} else if(patterns.length == 1 && patterns[0]["type"] == "blankNode"){
			bgptype = "optional";
		} else {
			bgptype = "optionalLink";
		}
		if(visited == false){
			
			for(var pattern in patterns){
				if(typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] == "bgp"){
					var temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
					classesTable = temp["classesTable"];
					attributeTable = temp["attributeTable"];
					filterTable = temp["filterTable"];
					linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
					classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
					attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
					bindTable = temp["bindTable"];
				}
			}
			
			for(var pattern in patterns){
				if(typeof patterns[pattern]["type"] === "undefined" || (typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] !== "bgp")){
					var temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
					classesTable = temp["classesTable"];
					attributeTable = temp["attributeTable"];
					filterTable = temp["filterTable"];
					linkTable = temp["linkTable"];
					linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
					classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
					attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
					bindTable = temp["bindTable"];	
				}
			}
			
			// count optional links
			var optionalLinkCount = 0;
			for(var link in linkTableAdded){
				if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
					linkTableAdded[link]["linkType"] = "OPTIONAL";
					optionalLinkCount ++;
				}
			}
			
			if(optionalLinkCount > 1){
				// create unit
				var unitClass;
				if(typeof classesTable["[ ]"] === 'undefined' && typeof allClasses["[ ]"] === 'undefined'){
					classesTable["[ ]"] = {
						"variableName":"?[ ]",
						"identification":null,
						"instanceAlias":"",
						"isVariable":false,
						"isUnit":true,
						"isUnion":false
					};
					unitClass = "[ ]";
					classTableAdded.push("[ ]");
					nodeList["?[ ]"]= {uses: {"[ ]": "class"}, count:1};
				}else {
					classesTable["[ ]"+counter] = {
						"variableName":"?[ ]",
						"identification":null,
						"instanceAlias":"",
						"isVariable":false,
						"isUnit":true,
						"isUnion":false
					};
					unitClass = "[ ]"+counter;
					classTableAdded.push("[ ]"+counter);
					if(typeof nodeList["?[ ]"] === 'undefined') nodeList["?[ ]"] = {uses: [], count:1}
					nodeList["?[ ]"]["uses"]["[ ]"+counter] = "class";
					nodeList["?[ ]"]["count"] = nodeList["?[ ]"]["count"]+1;
					counter++;
				}
				
				var parentClass;
					
				for(var link in linkTableAdded){
					if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1){
						parentClass = linkTableAdded[link]["object"];
						linkTableAdded[link]["object"] = unitClass;
						linkTableAdded[link]["linkType"] = "REQUIRED";
						
					}
					if(classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
						parentClass = linkTableAdded[link]["subject"];
						linkTableAdded[link]["subject"] = unitClass;
						linkTableAdded[link]["linkType"] = "REQUIRED";
					}
				}
				
				var link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":unitClass,
						"subject":parentClass,
						"isVisited":false,
						"linkType":"OPTIONAL",
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"counter":orderCounter
				}
				linkTable.push(link);
				linkTableAdded.push(link);
				orderCounter++;
			} else {
				//find optional link
				var optionalLinkFound = false;
				for(var link in linkTableAdded){
					if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
						linkTableAdded[link]["linkType"] = "OPTIONAL";
						optionalLinkFound = true;
						break;
					}
				}
				if(optionalLinkFound == false){
					for(var link in linkTableAdded){
						linkTableAdded[link]["linkType"] = "OPTIONAL";
						break;
					}
				}
			}
			bgptype = "plain";
			
			if(patterns.length == 1 && patterns[0]["type"] == "bgp" && patterns[0]["triples"].length == 1 && linkTableAdded.length == 1){
				if(typeof classesTable[linkTableAdded[0]["object"]] !== "undefined" && typeof classesTable[linkTableAdded[0]["subject"]] !== "undefined" 
				&& linkTableAdded[0]["object"].indexOf("[") == -1 && linkTableAdded[0]["object"].indexOf(":") == -1
				&& linkTableAdded[0]["linkIdentification"]["short_name"].indexOf(".") == -1){

					var childerenClass  = classesTable[linkTableAdded[0]["object"]];
					
					var exp = linkTableAdded[0]["linkIdentification"]["short_name"];
						var requred = true;
						if(linkTableAdded[0]["linkType"] == "OPTIONAL") requred = false;
						var internal = true;
						var addLabel = false;
						var addAltLabel = false;
						var addDescription = false;
						var attrAlias = childerenClass["instanceAlias"];						
						
						if(typeof childerenClass["fields"] !== 'undefined' && childerenClass["fields"].length == 1 && childerenClass["fields"][0]["exp"] == "(select this)"){
							internal = false;
							if(typeof childerenClass["fields"][0]["isInternal"] !== "undefined") internal = childerenClass["fields"][0]["isInternal"];
							addLabel = childerenClass["fields"][0]["addLabel"];
							addAltLabel = childerenClass["fields"][0]["addAltLabel"];
							addDescription = childerenClass["fields"][0]["addDescription"];
						} else if(typeof variableList["?"+attrAlias+"Label"] !== "undefined"){
							addLabel = true;
						}
						var variableName = attrAlias;
						if(attrAlias == exp) attrAlias = "";
						if(selectVariables.indexOf("?"+attrAlias) !== -1)internal = false;
						var attributeInfo = {
							"alias":attrAlias,
							"variableName":variableName,
							"identification":null,
							"exp":exp,
							"requireValues":requred,
							"isInternal":internal,
							"addLabel":addLabel,
							"addAltLabel":addAltLabel,
							"addDescription":addDescription,
							"graph":linkTableAdded[0]["graph"],
							"class":linkTableAdded[0]["subject"],
							"graphInstruction":linkTableAdded[0]["graphInstruction"],
							"seen":true,
							"counter":linkTableAdded[0]["counter"]
						}

						if(typeof attributeTable[variableName] === "undefined") attributeTable[variableName] = attributeInfo;
						
						attributeTableAdded.push(variableName);
						

						classesTable[linkTableAdded[0]["subject"]] = addAttributeToClass(classesTable[linkTableAdded[0]["subject"]], attributeInfo);
						// console.log("13", attributeInfo, selectVariables)
						
						for(var link in linkTable){
							if(linkTable[link]["object"] == linkTableAdded[0]["object"] && linkTable[link]["subject"] == linkTableAdded[0]["subject"] && linkTable[link]["linkIdentification"]["short_name"] == linkTableAdded[0]["linkIdentification"]["short_name"]){
								delete linkTable[link];
							}
						}
						delete classesTable[linkTableAdded[0]["object"]];
						linkTableAdded = [];
				}
			} 
			
			if(linkTable.length == 0) linkTable = linkTableAdded;
			
		}
	}
	
	//type=values
	if(where["type"] == "values" || typeof where["values"] !== 'undefined'){

		var values = [];
		for(var v in where["values"]){
			values = values.concat(Object.keys(where["values"][v]));
			
		}
		var values = values.filter(function (el, i, arr) {
			return arr.indexOf(el) === i;
		});
		
		
		var valueData = [];
		for(var v in where["values"]){
			var vData = {};
			for(var vv in values){
				vData[values[vv]] = "UNDEF";
			}
	
			for(var vv in where["values"][v]){
				var parsedValue = vq_visual_grammar.parse(where["values"][v][vv]);
				
				if(parsedValue["type"] == "iri") {
					var attributeResolved = await dataShapes.resolvePropertyByName({name: where["values"][v][vv]});
					
					if(attributeResolved.complete == true){
						var sn = attributeResolved.data[0].display_name;
						if(schemaName == "wikidata" && attributeResolved.data[0].prefix == "wdt"){}
						else if(attributeResolved.data[0].is_local != true)sn = attributeResolved.data[0].prefix+ ":" + sn;
						vData[vv] = sn;
					} else {
						
						var classResolved = await dataShapes.resolveClassByName({name: where["values"][v][vv]});
						
						if(classResolved.complete == true){
							var sn = classResolved.data[0].display_name;
							if(schemaName == "wikidata" && classResolved.data[0].prefix == "wd"){}
							else if(classResolved.data[0].is_local != true)sn = classResolved.data[0].prefix+ ":" + sn;
							vData[vv] = sn;
						} else {
							var uriResolved = await dataShapes.resolveIndividualByName({name: where["values"][v][vv]})
							
							if(uriResolved.complete == true && uriResolved.data[0].localName != ""){
								uri = uriResolved.data[0].localName;
								vData[vv] = uri;
							} else {
								var cls = await dataShapes.getIndividualName(parsedValue["value"]);
								if(cls != null && cls != ""){
									vData[vv] = cls;
								} else {
									vData[vv] = "<"+parsedValue["value"]+">";
								}
							}
						}
					}
				} else vData[vv] = parsedValue["value"];
			}
			valueData.push(vData);
		}
		
		var alias = "";
		if(values.length == 1) alias = vq_visual_grammar.parse(values[0])["value"];
		else {
			var temp = []
			for(var v in values){
				temp.push(vq_visual_grammar.parse(values[v])["value"]);
				var findByName = findByVariableName(classesTable, values[v]);
			}
			alias = "(" + temp.join(", ") + ")";
		}
		var exp = "";
		if(values.length == 1){
			var temp = []
			
			for(var v in valueData){
				for(var vv in valueData[v]){
					temp.push(valueData[v][vv])
				}
			}
			exp = "{" + temp.join(", ") + "}";
		} else {
			var temp = []
			for(var v in valueData){
				var t = [];
				for(var vv in valueData[v]){		
					t.push(valueData[v][vv])
				}
				temp.push("(" + t.join(", ") + ")")
			}
			exp = "{" + temp.join(", ") + "}";
		}
	
		var isInternal = false;
		if(selectVariables.indexOf("?"+alias) === -1) isInternal = true;
	
		var attributeInfo = {
			"alias":alias,
			"identification":null,
			"requireValues":false,
			"isInternal":isInternal,
			"groupValues":false,
			"exp":exp,
			"counter":orderCounter
		}
		orderCounter++;
				
		var added = false;
		for(var v in values){
			var attributes = findByVariableName(attributeTable, values[v]);
			for (var attribute in attributes){
				classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
				// console.log("14", attributeInfo)
				added = true;
				break;
			}
			if(added == true) break;
		}
		if(added == false){
			var classes = findByVariableName(classesTable, values[v]);
			for(var c in classes){
				classesTable[c] = addAttributeToClass(classesTable[c], attributeInfo);
				// console.log("15", attributeInfo)
				added = true;
				break;
			}
		}
		if(added == false){
			for(var c in classesTable){
				classesTable[c] = addAttributeToClass(classesTable[c], attributeInfo);
				// console.log("16", attributeInfo)
				break;
			}
		}
	}
	
	//type=filter
	if(where["type"] == "filter"){
		
		var temp = await parseSPARQLjsStructureWhere(where["expression"], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, checkIfOrAndInFilter(where["expression"], generateOnlyExpression));
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		filterTable = temp["filterTable"];
		attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
		bindTable = temp["bindTable"];
		
		if(filterTable.length == 0 && temp["viziQuerExpr"]["exprString"] == ""){
			linkTable = linkTable.concat(temp["linkTableAdded"]);
			linkTableAdded = temp["linkTableAdded"];
		}else{
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
			viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			var filterAdded = false;
	
			var className;
			for(var fil in viziQuerExpr["exprVariables"]){
				var classes = [];
				
				if(typeof classesTable["?" + viziQuerExpr["exprVariables"][fil]] !== 'undefined') {
					className = "?" + viziQuerExpr["exprVariables"][fil];
					classes = findByVariableName(classesTable, "?"+className);
				} else if(typeof  attributeTable[viziQuerExpr["exprVariables"][fil]] != 'undefined') {
					className = attributeTable[viziQuerExpr["exprVariables"][fil]]["class"];
					var attributeNames = findByVariableName(attributeTable, viziQuerExpr["exprVariables"][fil]);
					for(var attributeName in attributeNames){
						var classN = attributeTable[attributeName]["class"];
						classes[classN] = classesTable[classN];
					}
					classes[className] = classesTable[className];
					
					
					
					if(classesTable[className]["variableName"].startsWith("?"))className = classesTable[className]["variableName"].substring(1);
					else className = classesTable[className]["variableName"];

				} 
				else if(typeof classesTable[viziQuerExpr["exprVariables"][fil]] !== 'undefined') {
					className = classesTable[viziQuerExpr["exprVariables"][fil]]["variableName"].substring(1);
					classes[viziQuerExpr["exprVariables"][fil]] = classesTable[viziQuerExpr["exprVariables"][fil]];
				}	
				else{
					if(typeof className === 'undefined'){
						for(var clazz in classesTable){
							className = clazz;
							break;
						}
						classes = findByVariableName(classesTable, "?"+className);
					}
				}

				// var classes = findByVariableName(classesTable, "?"+className);
				if(generateOnlyExpression != true){
					for (var clazz in classes){		
						if((typeof nodeList["?"+className] !== 'undefined' && typeof nodeList["?"+className]["uses"][clazz] !== 'undefined') || typeof nodeList[className] !== 'undefined' && typeof nodeList[className]["uses"][clazz] !== 'undefined'){	
							if(typeof classesTable[clazz]["conditions"] === 'undefined') {
								classesTable[clazz]["conditions"] = [];
							}
							classesTable[clazz]["conditions"].push(viziQuerExpr["exprString"]);
							filterAdded = true;
							break;
						} 					
					}
				}	
				if(filterAdded == true) break;
			}
			if(viziQuerExpr["exprVariables"].length == 0){
				for(var n in nodeList){
					classes = findByVariableName(classesTable, n);
					if(generateOnlyExpression != true){
						for (var clazz in classes){		
							if(typeof classesTable[clazz]["conditions"] === 'undefined') {
								classesTable[clazz]["conditions"] = [];
							}
							classesTable[clazz]["conditions"].push(viziQuerExpr["exprString"]);
							filterAdded = true;
							break;
						}
					}	
					break;
				}
			}
			if(typeof className !== 'undefined' &&  typeof classesTable[className] !== 'undefined' && typeof classesTable[className]["conditions"] !== 'undefined') {
				classesTable[className]["conditions"] = classesTable[className]["conditions"].filter(function (el, i, arr) {
					return arr.indexOf(el) === i;
				});
			}
			
			if(typeof filterTable.find(e => e.filterString === viziQuerExpr["exprString"]) === "undefined") filterTable.push({filterString:viziQuerExpr["exprString"], filterVariables:viziQuerExpr["exprVariables"], filterAdded:filterAdded});
		}
	}
	
	if(where["type"] == "blankNode"){
		var nodeLitsTemp = [];
		var collectNodeListTemp  = await collectNodeList({0:{"type": "bgp","triples": where["blankNode"]}}, dataTripleAsObject);
		var temp = collectNodeListTemp["nodeList"];
		// var plainVariables = getWhereTriplesPlainVaribles(unionBlock["patterns"]);
		for(var node in temp){
			nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
		}
		
		var temp = await parseSPARQLjsStructureWhere({"type": "bgp","triples": where["blankNode"]}, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable);
		if(bgptype == "optional"){
			var optionalLinkFound = false;
			for(var link in temp["linkTableAdded"]){
				if(classTableAdded.indexOf(temp["linkTableAdded"][link]["object"]) == -1 || classTableAdded.indexOf(temp["linkTableAdded"][link]["subject"]) == -1){
					temp["linkTableAdded"][link]["linkType"] = "OPTIONAL";
					optionalLinkFound = true;
					break;
				}
			}
			if(optionalLinkFound == false){
				for(var link in temp["linkTableAdded"]){
					temp["linkTableAdded"][link]["linkType"] = "OPTIONAL";
					break;
				}
			}
		}
		
		for(var link in temp["linkTableAdded"]){
			if(!temp["linkTableAdded"][link]["object"].startsWith("_b") && temp["classTableAdded"].indexOf(temp["linkTableAdded"][link]["object"]) == -1 && typeof classesTable[temp["linkTableAdded"][link]["object"]] !== "undefined"){
				classesTable[temp["linkTableAdded"][link]["object"]+counter] = classesTable[temp["linkTableAdded"][link]["object"]];
				classTableAdded.push(temp["linkTableAdded"][link]["object"]+counter);
				temp["linkTableAdded"][link]["object"] = temp["linkTableAdded"][link]["object"]+counter;
				counter++;
			}
			
		}
	}
	
	// type=union														  
	if(where["type"] == "union"){
		// classes in query before union
		isUnderUnion = true;
		var classesBeforeUnion = []
		for(var c in classesTable){
			classesBeforeUnion[c] = classesTable[c];
		}
		
		if(Object.keys(classesBeforeUnion).length == 0){
			for(var c in allClasses){
				classesBeforeUnion[c] = allClasses[c];
			}
		}
		// create [ + ] class
		// union class identification
		var unionClass;
		// if query does not has union class
		if(typeof classesTable["[ + ]"] === 'undefined' && typeof allClasses["[ + ]"] === 'undefined'){
			classesTable["[ + ]"] = {
				"variableName":"?[ + ]",
				"identification":null,
				"instanceAlias":"",
				"isVariable":false,
				"isUnit":false,
				"isUnion":true
			};
			classTableAdded.push("[ + ]");
			nodeList["?[ + ]"]= {uses: {"[ + ]": "class"}, count:1};
			unionClass = "[ + ]";
		}
		// if query has another union class
		else {
			classesTable["[ + ]"+counter] = {
				"variableName":"?[ + ]",
				"identification":null,
				"instanceAlias":"",
				"isVariable":false,
				"isUnit":false,
				"isUnion":true
			};
			classTableAdded.push("[ + ]"+counter);
			if(typeof nodeList["?[ + ]"] === 'undefined') nodeList["?[ + ]"] = {uses: [], count:1}
			nodeList["?[ + ]"]["uses"]["[ + ]"+counter] = "class";
			nodeList["?[ + ]"]["count"] = nodeList["?[ + ]"]["count"]+1;
			unionClass = "[ + ]"+counter;
			counter++;
		}
		
		// bgptype = "plain";
		
		// list with classes under union query part
		var allClassesUnderUnion = [];
		
		// list with nodes under union query part
		var allNodesUnderUnion = [];
		
		// for all union blocks
		
		
		
		for(var u in where["patterns"]){
			var unionBlock = where["patterns"][u];	
			
			// ------------------------------------------------------------------------------------------------
			
			// type=bgp (palin required)
			if(unionBlock["type"] == "bgp"){
				
				var bgptypeTemp = bgptype;
				var dataTripleAsObject = false;
				if(unionBlock["triples"].length == 1)
				{
					dataTripleAsObject = true;
					bgptype = "optionalLink";
				}

				var linkCreated = false;
				var classTableTemp = [];
				var linkTableTemp = [];
				// calculate nodelist for union block
				var nodeLitsTemp = [];
				var collectNodeListTemp  = await collectNodeList({0:unionBlock}, dataTripleAsObject);

				var temp = collectNodeListTemp["nodeList"];
				// var plainVariables = getWhereTriplesPlainVaribles(unionBlock["patterns"]);
				for(var node in temp){
					nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
					allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, temp[node]);
				}

				// for all patterns
				// first bqp then the rest
					var pattern = unionBlock
					if(typeof pattern["type"] !== "undefined" && pattern["type"] == "bgp"){
						var classesTableCopy = [];
						for(var c in classesTable){
							classesTableCopy[c] = classesTable[c];
						}
						
						var temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTableCopy, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						
						for(var c in temp["classesTable"]){
							if(typeof classesTable[c] === 'undefined' 
							|| (typeof classesTable[c] !== 'undefined' && classesTable[c]["identification"] == null)) classesTable[c] = temp["classesTable"][c]
						}
						for(var clazz in temp["classTableAdded"]){
							
							classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
						}
						attributeTable = temp["attributeTable"];
						linkTable = temp["linkTable"];
						filterTable = temp["filterTable"];
						linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
					}
				
				
				// find class from union block to connect to [+] class
				var object = findClassToConnectUnion(classTableTemp, classesBeforeUnion, linkTableTemp, null, "object");
				if(object == null){
					for(var subClass in classTableTemp){
						object = subClass;
						break;
					}
				}
				
				var linktype = "REQUIRED";
				if(unionBlock["type"] == "optional") linktype = "OPTIONAL";
				
				// connect founded class to [+] class with ++ link
				if(linkCreated == false){
					var link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":object,
						"subject":unionClass,
						"isVisited":false,
						"linkType":linktype,
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"counter":orderCounter
					}
					linkTable.push(link);
					linkTableAdded.push(link);
					orderCounter++;
				}
				bgptype = bgptypeTemp;
			}
			// ------------------------------------------------------------------------------------------------
			// type=group (palin required) or
			// type=optional (plain optional)
			else if(unionBlock["type"] == "group" || unionBlock["type"] == "optional"){
				var linkCreated = false;
				var classTableTemp = [];
				var linkTableTemp = [];
				// calculate nodelist for union block
				var nodeLitsTemp = [];
				var collectNodeListTemp  = await collectNodeList(unionBlock["patterns"]);
				var temp = collectNodeListTemp["nodeList"];
				// var plainVariables = getWhereTriplesPlainVaribles(unionBlock["patterns"]);
				for(var node in temp){
					nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
					allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, temp[node]);
				}
				
				// for all patterns
				// first bqp then the rest
				for(var p in unionBlock["patterns"]){
					var pattern = unionBlock["patterns"][p];
					if(typeof pattern["type"] !== "undefined" && pattern["type"] == "bgp"){
						var classesTableCopy = [];
						for(var c in classesTable){
							classesTableCopy[c] = classesTable[c];
						}
						
						var temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTableCopy, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						
						for(var c in temp["classesTable"]){
							if(typeof classesTable[c] === 'undefined' 
							|| (typeof classesTable[c] !== 'undefined' && classesTable[c]["identification"] == null)) classesTable[c] = temp["classesTable"][c]
						}
						// classesTable = temp["classesTable"];
						for(var clazz in temp["classTableAdded"]){
							classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
						}
						attributeTable = temp["attributeTable"];
						linkTable = temp["linkTable"];
						filterTable = temp["filterTable"];
						linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
					}
				}
				
				for(var p in unionBlock["patterns"]){
					var pattern = unionBlock["patterns"][p];
					if(pattern["type"] == "filter" && typeof pattern["expression"] !== "undefined" && 
					pattern["expression"]["type"] == "operation" && pattern["expression"]["operator"] == "notexists"){
						var classesTableCopy = [];
						for(var c in classesTable){
							classesTableCopy[c] = classesTable[c];
							// allClasses[c] = classesTable[c];
						}	
						var negationTemp = await generatePlainNegationUnion(pattern, nodeList, classesTableCopy, filterTable, attributeTable, linkTable, selectVariables, linkTableAdded, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression, allClassesUnderUnion, allNodesUnderUnion, unionClass);
						
						allClassesUnderUnion = negationTemp["allClassesUnderUnion"];
						allNodesUnderUnion = negationTemp["allNodesUnderUnion"];
						for(var c in negationTemp["classesTable"]){
							if(typeof classesTable[c] === 'undefined' 
							|| (typeof classesTable[c] !== 'undefined' && classesTable[c]["identification"] == null)) classesTable[c] = negationTemp["classesTable"][c]
						}
						// classesTable = negationTemp["classesTable"];
						filterTable = negationTemp["filterTable"];
						attributeTable = negationTemp["attributeTable"];
						linkTable = negationTemp["linkTable"];
						linkTableTemp = negationTemp["linkTableTemp"];
						classTableTemp = negationTemp["classTableTemp"];
						linkCreated = true;
					}else if(typeof pattern["type"] === "undefined" || (typeof pattern["type"] !== "undefined" && pattern["type"] !== "bgp")){
						var temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						for(var c in temp["classesTable"]){
							if(typeof classesTable[c] === 'undefined' 
							|| (typeof classesTable[c] !== 'undefined' && classesTable[c]["identification"] == null)) classesTable[c] = temp["classesTable"][c]
						}
						// classesTable = temp["classesTable"];
						for(var clazz in temp["classTableAdded"]){
							classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
						}
						attributeTable = temp["attributeTable"];
						linkTable = temp["linkTable"];
						filterTable = temp["filterTable"];
						linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
					}
				}
				
				// find class from union block to connect to [+] class
				var object = findClassToConnectUnion(classTableTemp, classesBeforeUnion, linkTableTemp, null, "object");
				if(object == null){
					for(var subClass in classTableTemp){
						object = subClass;
						break;
					}
				}
				
				var linktype = "REQUIRED";
				if(unionBlock["type"] == "optional") linktype = "OPTIONAL";
				

				if(unionBlock["patterns"].length == 2){
					if(unionBlock["patterns"][0]["type"] == "optional" && unionBlock["patterns"][1]["type"] == "bgp" && unionBlock["patterns"][1]["triples"].length ==1 && (unionBlock["patterns"][1]["triples"][1]["predicate"] == directClassMembershipRole)){
						for(allClazz in classesBeforeUnion){
							if(unionBlock["patterns"][1]["triples"][1]["subject"] == classesBeforeUnion[allClazz]["variableName"]){
								linktype = "OPTIONAL";
								break;
							}
						}
					}
					if(unionBlock["patterns"][1]["type"] == "optional" && unionBlock["patterns"][0]["type"] == "bgp" && unionBlock["patterns"][0]["triples"].length ==1 && (unionBlock["patterns"][0]["triples"][0]["predicate"] == directClassMembershipRole)){
						for(allClazz in classesBeforeUnion){
							if(unionBlock["patterns"][0]["triples"][0]["subject"] == classesBeforeUnion[allClazz]["variableName"]){
								linktype = "OPTIONAL";
								break;
							}
						}
					}
				}
				
				// connect founded class to [+] class with ++ link
				if(linkCreated == false){
					var link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":object,
						"subject":unionClass,
						"isVisited":false,
						"linkType":linktype,
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"counter":orderCounter
					}
					linkTable.push(link);
					linkTableAdded.push(link);
					orderCounter++;
				}
			}
			// ------------------------------------------------------------------------------------------------

			// type=filter, operator=notexists
			else if(unionBlock["type"] == "filter" && typeof unionBlock["expression"] !== "undefined" && 
			unionBlock["expression"]["type"] == "operation" && unionBlock["expression"]["operator"] == "notexists"){	
				var classesTableNegationTemp = [];
				for(var clazz in classesTable){
					classesTableNegationTemp[clazz] = classesTable[clazz];
				}
				
				var negationTemp = await generatePlainNegationUnion(unionBlock, nodeList, classesTableNegationTemp, filterTable, attributeTable, [], linkTableAdded, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression, allClassesUnderUnion, allNodesUnderUnion, unionClass);

				allClassesUnderUnion = negationTemp["allClassesUnderUnion"];
				allNodesUnderUnion = negationTemp["allNodesUnderUnion"];
				//classesTable = negationTemp["classesTable"];
				filterTable = negationTemp["filterTable"];
				attributeTable = negationTemp["attributeTable"];

				//linkTable = negationTemp["linkTable"];
				linkTableAdded = negationTemp["linkTableAdded"];
				linkTable = linkTable.concat(negationTemp["linkTableAdded"]);
				for(var clazz in negationTemp["classesTable"]){
					if(typeof classesTable[clazz] === 'undefined')classesTable[clazz] = negationTemp["classesTable"][clazz];
				}
			}
			// ------------------------------------------------------------------------------------------------

			// type=query (required / optional subquery)
			else if(unionBlock["type"] == "query"){

				var classTableTemp = [];
				var linkTableTemp = [];
				
				for(var clazz in classesTable){
					allClasses[clazz] = classesTable[clazz];
				}

				var abstractTable = await generateAbstractTable(unionBlock, allClasses, variableList, nodeList);
				
				for(var node in abstractTable["nodeList"]){
					allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, abstractTable["nodeList"][node]);
				}	

				for(var clazz in abstractTable["classesTable"]){
					if(typeof classesTable[clazz] === 'undefined') classesTable[clazz] = abstractTable["classesTable"][clazz];
					classTableTemp[clazz] = abstractTable["classesTable"][clazz];
					allClassesUnderUnion[clazz] = abstractTable["classesTable"][clazz];
				}

				linkTable = linkTable.concat(abstractTable["linkTable"]);
				linkTableTemp = linkTableTemp.concat(abstractTable["linkTable"]);
				
				// find class from union block to connect to [+] class
				var object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");
				if(object == null){
					for(var subClass in classTableTemp){
						object = subClass;
						break;
					}
				}
						
				var linktype = "REQUIRED";
				
				if(typeof  unionBlock["where"] != 'undefined' && unionBlock["where"].length == 1 && unionBlock["where"][0]["type"] == "optional") linktype = "OPTIONAL";
				
				var isSubQuery = true;
				var isGlobalSubQuery = false;
				
				if(abstractTable["orderTable"].length > 0){
					classesTable[object]["orderings"] = abstractTable["orderTable"];
					isGlobalSubQuery = true;
					isSubQuery = false;
				}
				if(abstractTable["groupTable"].length > 0){
					classesTable[object]["groupings"] = abstractTable["groupTable"];
					isGlobalSubQuery = true;
					isSubQuery = false;
				}
				classesTable[object]["graphs"] = abstractTable["fromTable"];
				if(typeof unionBlock["limit"] !== 'undefined') {
					classesTable[object]["limit"] =  unionBlock["limit"];
					isGlobalSubQuery = true;
					isSubQuery = false;
				}
				if(typeof unionBlock["offset"] !== 'undefined') {
					classesTable[object]["offset"] =  unionBlock["offset"];
					isGlobalSubQuery = true;
					isSubQuery = false;
				}
				if(typeof unionBlock["distinct"] !== 'undefined') classesTable[object]["distinct"] =  unionBlock["distinct"];
				if(typeof unionBlock["serviceLabelLang"] !== 'undefined' && unionBlock["serviceLabelLang"] != "") classesTable[object]["serviceLabelLang"] =  unionBlock["serviceLabelLang"];
				if(typeof unionBlock["fullSPARQL"] !== 'undefined' && unionBlock["fullSPARQL"] != "") classesTable[object]["fullSPARQL"] =  unionBlock["fullSPARQL"];
				
				// connect founded class to [+] class with ++ link
				var link = {
					"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
					"object":object,
					"subject":unionClass,
					"isVisited":false,
					"linkType":linktype,
					"isSubQuery":isSubQuery,
					"isGlobalSubQuery":isGlobalSubQuery,
					"counter":orderCounter
				}
				linkTable.push(link);
				linkTableAdded.push(link);
				orderCounter++;
			}
			// ------------------------------------------------------------------------------------------------

			// type=minus (global sybquery, negation)
			else if(unionBlock["type"] == "minus"){
				for(var minusPattern in unionBlock["patterns"]){
					var minusUnionBlock = unionBlock["patterns"][minusPattern];
					if(minusUnionBlock["type"] == "filter" && typeof minusUnionBlock["expression"] !== "undefined" && 
					minusUnionBlock["expression"]["type"] == "operation" && minusUnionBlock["expression"]["operator"] == "notexists"){
						var args = minusUnionBlock["expression"]["args"];
						for(var arg in args){
							if(args[arg]["type"] == "group"){
								var classTableTemp = [];
								var linkTableTemp = [];
								// calculate nodelist for union block
								var nodeLitsTemp = [];
								var collectNodeListTemp  = await collectNodeList(args[arg]["patterns"]);
								var temp = collectNodeListTemp["nodeList"];
								// var plainVariables = getWhereTriplesPlainVaribles(args[arg]["patterns"]);
								for(var node in temp){
									nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
									allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, temp[node]);
								}	
								
								// for all patterns
								// first bqp then the rest
								for(var p in args[arg]["patterns"]){
									var pattern = args[arg]["patterns"][p];
									if(typeof pattern["type"] !== "undefined" && pattern["type"] == "bgp"){
										var temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
										classesTable = temp["classesTable"];
										for(var clazz in temp["classTableAdded"]){
											classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
											allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
										}
										attributeTable = temp["attributeTable"];
										linkTable = temp["linkTable"];
										filterTable = temp["filterTable"];
										linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
									}
								}
								
								for(var p in args[arg]["patterns"]){
									var pattern = args[arg]["patterns"][p];
									if(typeof pattern["type"] === "undefined" || (typeof pattern["type"] !== "undefined" && pattern["type"] !== "bgp")){
										var temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
										classesTable = temp["classesTable"];
										for(var clazz in temp["classTableAdded"]){
											classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
											allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
										}
										attributeTable = temp["attributeTable"];
										linkTable = temp["linkTable"];
										filterTable = temp["filterTable"];
										linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
									}
								}
								
								// find class from union block to connect to [+] class
								var object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");
								if(object == null){
									for(var subClass in classTableTemp){
										object = subClass;
										break;
									}
								}
								
								var linktype = "NOT";
								// connect founded class to [+] class with ++ link
								var link = {
									"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
									"object":object,
									"subject":unionClass,
									"isVisited":false,
									"linkType":linktype,
									"isSubQuery":false,
									"isGlobalSubQuery":true,
									"counter":orderCounter
								}
								linkTable.push(link);
								linkTableAdded.push(link);
								orderCounter++;
							} else {
									//TO DO
									//??????????
							}
						}
					} else {
						// TO DO
						//?????????????????
					}
				}
			}
			for(var clazz in classesTable){
				allClasses[clazz] = classesTable[clazz];
			}
		}
		
		
		// connect [+] class with parrent query (with ++ link) if there is one
			// if parrent query exists
			// find parrent class:
				// if union query part has class from parrent query, use it.
					// if more then one class - ???.
				// otherwise, find parrent query class with no outgoing links.
	
		// if parrent query exists
		if(Object.keys(classesBeforeUnion).length > 0) {
			// find class to connect to
			var unionSubject = null;
			var moreThenOneClassFound = false;
			// if union has parrent query class "copy"
			for(allClazz in classesBeforeUnion){
				// from class boxes under union
				for(clazz in allClassesUnderUnion){
					if(allClassesUnderUnion[clazz]["variableName"] == classesBeforeUnion[allClazz]["variableName"]){
						// if more then one class from parrent query found
						if(unionSubject != null && unionSubject != allClazz){
							moreThenOneClassFound = true;
							break;
						} else unionSubject = allClazz;
					}
				}
				// from node list under union
				for(clazz in allNodesUnderUnion){
					if(clazz == classesBeforeUnion[allClazz]["variableName"]){
						// if more then one class from parrent query found
						if(unionSubject != null && unionSubject != allClazz){
							moreThenOneClassFound = true;
							break;
						} else unionSubject = allClazz;
					}
				}
			}
			
			// if no "copy" class from parrent query part
			if(unionSubject == null){
				// if link between parrent query part class and class under union exists
				for(var l in linkTable){
					var linkk = linkTable[l];

					if(typeof classesBeforeUnion[linkk["subject"]] !== 'undefined' && typeof allClassesUnderUnion[linkk["object"]] !== 'undefined'){
						unionSubject = linkk["subject"];
						break;
					} else if(typeof classesBeforeUnion[linkk["object"]] !== 'undefined' && typeof allClassesUnderUnion[linkk["subject"]] !== 'undefined'){
						unionSubject = linkk["object"];
						break;
					}
				}
				
				// if no class from parrent query part
				if(unionSubject == null){
				// TO DO
				}
			}
			// if more then one class from parrent query found
			if(moreThenOneClassFound == true){
				// TO DO
			} else {
				// creaet ++ link from parrent to [+]
				// TO DO different link types
				var link = {
					"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
					"object":unionClass,
					"subject":unionSubject,
					"isVisited":false,
					"linkType":"REQUIRED",
					"isSubQuery":false,
					"isGlobalSubQuery":false,
					"counter":orderCounter
				}
				
				linkTable.push(link);
				linkTableAdded.push(link);
				orderCounter++;
			}
			
			// replace union ++ links with link properties, remove duplicate parrent classes from union query part
			for(allClazz in classesBeforeUnion){
				// replace ++ links, remove duplicates
				for(clazz in allClassesUnderUnion){
					if(allClassesUnderUnion[clazz]["variableName"] == classesBeforeUnion[allClazz]["variableName"]){
						
						
						// if class is unionSubject
						// if class do not has attributes
						if(unionSubject == allClazz && checkIfClassHasAttributes(clazz, attributeTable) == false){	
							for(var l in linkTable){
								var linkk = linkTable[l];
														
								if(linkk["object"] == clazz && linkk["subject"] != unionClass){
									
									var classUnderUnion = linkk["subject"];
									var linkFound = false;
									for(var ll in linkTable){
										var unionLink = linkTable[ll];
										if((unionLink["object"] == clazz && unionLink["subject"] == unionClass) || (unionLink["subject"] == clazz && unionLink["object"] == unionClass)){
											linkTable.splice(ll, 1);
											linkFound = true;
										}
									}
									if(linkFound == false){
										for(var ll in linkTable){
											var unionLink = linkTable[ll];
											if((unionLink["object"] == classUnderUnion && unionLink["subject"] == unionClass) || (unionLink["subject"] == classUnderUnion && unionLink["object"] == unionClass)){
												linkTable.splice(ll, 1);
												linkFound = true;
											}
										}
									}
									linkk["object"] = unionClass;
									// remove duplicate class
									if(clazz != allClazz) classesTable = removeClass(classesTable, clazz);
								} else if(linkk["subject"] == clazz && linkk["object"] != unionClass){

									var classUnderUnion = linkk["object"];
									for(var ll in linkTable){
										var unionLink = linkTable[ll];
										if((unionLink["object"] == clazz && unionLink["subject"] == unionClass) || (unionLink["subject"] == clazz && unionLink["object"] == unionClass)){
											linkTable.splice(ll, 1);
											linkFound = true;
										}
									}
									if(linkFound == false){
										for(var ll in linkTable){
											var unionLink = linkTable[ll];
											if((unionLink["object"] == classUnderUnion && unionLink["subject"] == unionClass) || (unionLink["subject"] == classUnderUnion && unionLink["object"] == unionClass)){
												linkTable.splice(ll, 1);
												linkFound = true;
											}
										}
									}
									linkk["subject"] = unionClass;
									// remove duplicate class
									if(clazz != allClazz) classesTable = removeClass(classesTable, clazz);
								}
							}
						} else {
							// TO DO
							// if exists link between parent query class (that is not unionSubject) and class under union
							// add condition link?
						}
					}	
				}			
			}
			// if class under union has link to unionSubject
					// link from class to union subject is still ++, rename ++ link, remove other link
					// else use condition link?
			for(clazz in allClassesUnderUnion){
				for(var l in linkTable){
					var linkk = linkTable[l];
					if(linkk["linkIdentification"]["local_name"] == "++"){
						
						var classUnderUnion;
						if(linkk["object"] == clazz) classUnderUnion = linkk["subject"];
						else classUnderUnion = linkk["object"];
						
						if(classUnderUnion != unionClass){
						
							for(var ll in linkTable){
								var unionLink = linkTable[ll];
								if((unionLink["object"] == classUnderUnion || unionLink["subject"] == classUnderUnion) &&
								(unionLink["object"] == unionSubject || unionLink["subject"] == unionSubject)){
									
									linkk["linkIdentification"] = unionLink["linkIdentification"];
									
									if((linkk["isSubQuery"] == true || linkk["isGlobalSubQuery"] == true) 
									&& linkk["linkType"] == "REQUIRED" && unionLink["linkType"] == "OPTIONAL") linkk["linkType"] = "OPTIONAL";
									
									// if link is in inverse direction
									if(linkk["object"] != unionLink["object"]) {
										var t = linkk["object"];
										linkk["object"] = linkk["subject"];
										linkk["subject"] = t;
									}
									
									// remove duplicate link
									if(linkTable[ll]["object"] != unionClass && linkTable[ll]["subject"] != unionClass)linkTable.splice(ll, 1);
									break;
								}	
							}
						}
					}
				}
			}
		}
		
		for(var c in allClassesUnderUnion){
			if(typeof classesTable[c] !== 'undefined' && typeof classesBeforeUnion[c] === 'undefined') classTableAdded.push(c);
		}
		
		for(var c in allNodesUnderUnion){
			if(typeof nodeList[c] === 'undefined') nodeList[c] = allNodesUnderUnion[c];
		}	

		isUnderUnion = false;
	}
	if(where["type"] == "union2"){
		
		var classCount = Object.keys(classesTable).length;
		var unionClass;
		var subject = findClassToConnect(classesTable, linkTable, nodeList, "subject");
		if(subject == null){
				for(var subClass in classesTable){
					subject = subClass;
					break;
				}
		}
			
		if(typeof classesTable["[ + ]"] === 'undefined' && typeof allClasses["[ + ]"] === 'undefined'){
			classesTable["[ + ]"] = {
				"variableName":"?[ + ]",
				"identification":null,
				"instanceAlias":"",
				"isVariable":false,
				"isUnit":false,
				"isUnion":true
			};
			classTableAdded.push("[ + ]");
			nodeList["?[ + ]"]= {uses: {"[ + ]": "class"}, count:1};
			unionClass = "[ + ]";
		}else {
			classesTable["[ + ]"+counter] = {
				"variableName":"?[ + ]",
				"identification":null,
				"instanceAlias":"",
				"isVariable":false,
				"isUnit":false,
				"isUnion":true
			};
			classTableAdded.push("[ + ]"+counter);
			if(typeof nodeList["?[ + ]"] === 'undefined') nodeList["?[ + ]"] = {uses: [], count:1}
			nodeList["?[ + ]"]["uses"]["[ + ]"+counter] = "class";
			nodeList["?[ + ]"]["count"] = nodeList["?[ + ]"]["count"]+1;
			unionClass = "?[ + ]"+counter;
			counter++;
		}
		if(classCount != 0){
			
			var link = {
				"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
				"object":unionClass,
				"subject":subject,
				"isVisited":false,
				"linkType":"REQUIRED",
				"isSubQuery":false,
				"isGlobalSubQuery":false,
				"counter":orderCounter
			}
			linkTable.push(link);
	
			linkTableAdded.push(link);
			orderCounter++;
		} else if (Object.keys(allClasses).length != 0){
			var subject = findClassToConnect(allClasses, linkTable, [], "subject");
			if(subject == null){
					for(var subClass in allClasses){
						subject = subClass;
						break;
					}
			}
			var link = {
				"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
				"object":unionClass,
				"subject":subject,
				"isVisited":false,
				"linkType":"REQUIRED",
				"isSubQuery":true,
				"isGlobalSubQuery":false,
				"counter":orderCounter
			}

			
			linkTable.push(link);
	
			linkTableAdded.push(link);
			orderCounter++;
		}
		for(var pattern in where["patterns"]){
		
			// union subQuery (required, optinal)
			if(typeof where["patterns"][pattern]["queryType"] !== 'undefined'){
				
				for(var clazz in classesTable){
					allClasses[clazz] = classesTable[clazz];
				}
				
				var abstractTable = await generateAbstractTable(where["patterns"][pattern], allClasses, variableList, nodeList);
	
				abstractTable["linkTable"] = connectAllClasses(abstractTable["classesTable"], abstractTable["linkTable"], allClasses);

				for(var clazz in abstractTable["classesTable"]){
					allClasses[clazz] = abstractTable["classesTable"][clazz];
				}
				
				var object = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null, "object");
				if(object == null){
					for(var subClass in abstractTable["classesTable"]){
						object = subClass;
						break;
					}
				}
				var linktype = "REQUIRED";
				if(where["patterns"][pattern]["where"][0]["type"] == "optional")linktype = "OPTIONAL";

				var link = {
					"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
					"object":object,
					"subject":unionClass,
					"isVisited":false,
					"linkType":linktype,
					"isSubQuery":true,
					"isGlobalSubQuery":false,
					"counter":orderCounter
				}

				linkTable.push(link);

				linkTableAdded.push(link);
				orderCounter++;
				
				var subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"object");
				if(subSelectMainClass == null){
					for(var subClass in abstractTable["classesTable"]){
						subSelectMainClass = subClass;
						break;
					}
				}

				abstractTable["classesTable"][subSelectMainClass]["orderings"] = abstractTable["orderTable"];
				abstractTable["classesTable"][subSelectMainClass]["groupings"] = abstractTable["groupings"];
				abstractTable["classesTable"][subSelectMainClass]["graphs"] = abstractTable["fromTable"];
				if(typeof where["patterns"][0]["limit"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["limit"] =  where["patterns"][0]["limit"];
				if(typeof where["patterns"][0]["offset"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["offset"] =  where["patterns"][0]["offset"];
				if(typeof where["patterns"][0]["distinct"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["distinct"] =  where["patterns"][0]["distinct"];
		
				if(typeof unionBlock["serviceLabelLang"] !== 'undefined' && unionBlock["serviceLabelLang"] != "") classesTable[object]["serviceLabelLang"] =  unionBlock["serviceLabelLang"];
				if(typeof unionBlock["fullSPARQL"] !== 'undefined' && unionBlock["fullSPARQL"] != "") classesTable[object]["fullSPARQL"] =  unionBlock["fullSPARQL"];

				for(var subClass in abstractTable["classesTable"]){
					if(typeof classesTable[subClass] === 'undefined')classesTable[subClass] = abstractTable["classesTable"][subClass];
				}

				linkTable = linkTable.concat(abstractTable["linkTable"]);
			} 
			else if(typeof where["patterns"][pattern]["type"] !== 'undefined') {
				// glogal subquery + negation
				if(where["patterns"][pattern]["type"] == 'minus'){
					for(var p in where["patterns"][pattern]["patterns"]){
						var classTableTemp = [];
						var linkTableTemp = [];
						var nodeLitsTemp = [];
						
						var linktype = "NOT";

						var patterns;
						if(where["patterns"][pattern]["patterns"][p]["type"] == 'filter' 
							&& where["patterns"][pattern]["patterns"][p]["expression"]["type"] == "operation"
							&& where["patterns"][pattern]["patterns"][p]["expression"]["operator"] == "notexists") {
								var patterns = where["patterns"][pattern]["patterns"][p]["expression"]["args"][0]["patterns"];
						}

						var collectNodeListTemp  = await collectNodeList(patterns);
						var temp  = collectNodeListTemp["nodeList"];
						for(var node in temp){
							nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						}
						for(var groupPattern in patterns){
							if(typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] == "bgp"){
								var temp = await parseSPARQLjsStructureWhere(patterns[groupPattern], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								for(var clazz in temp["classTableAdded"]){
									classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
								}
								attributeTable = temp["attributeTable"];
								linkTable = temp["linkTable"];
								filterTable = temp["filterTable"];
								linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
							}
						}
						
						for(var groupPattern in patterns){
							if(typeof patterns[groupPattern]["type"] === "undefined" || (typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] !== "bgp")){
								var temp = await parseSPARQLjsStructureWhere(patterns[groupPattern], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								for(var clazz in temp["classTableAdded"]){
									classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
								}
								attributeTable = temp["attributeTable"];
								linkTable = temp["linkTable"];
								filterTable = temp["filterTable"];
								linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
							}
						}
						
						var object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");
						if(object == null){
							for(var subClass in classTableTemp){
								object = subClass;
								break;
							}
						}

						var link = {
							"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
							"object":object,
							"subject":unionClass,
							"isVisited":false,
							"linkType":linktype,
							"isSubQuery":false,
							"isGlobalSubQuery":true,
							"counter":orderCounter
						}
						
						linkTable.push(link);
		
						linkTableAdded.push(link);
						orderCounter++;
					}
				} 
				// simple group 
				else{	
					var classTableTemp = [];
					var linkTableTemp = [];
					var nodeLitsTemp = [];
					
					var linktype = "REQUIRED";
					if(where["patterns"][pattern]["type"] == "optional")linktype = "OPTIONAL";
					
					var patterns;
					if(where["patterns"][pattern]["type"] == 'group' || where["patterns"][pattern]["type"] == "optional") patterns = where["patterns"][pattern]["patterns"];
					else if(where["patterns"][pattern]["type"] == 'filter' 
						&& where["patterns"][pattern]["expression"]["type"] == "operation"
						&& where["patterns"][pattern]["expression"]["operator"] == "notexists") {
							patterns = where["patterns"][pattern]["expression"]["args"][0]["patterns"];
							linktype = "NOT";
					} else if(where["patterns"][pattern]["type"] == 'bgp') patterns = {0:where["patterns"][pattern]};
					
					var collectNodeListTemp  = await collectNodeList(patterns);
					var temp  = collectNodeListTemp["nodeList"];
					for(var node in temp){
						nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
					}
				
					for(var groupPattern in patterns){	
						if(typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] == "bgp"){
							var temp = await parseSPARQLjsStructureWhere(patterns[groupPattern], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
							classesTable = temp["classesTable"];
							for(var clazz in temp["classTableAdded"]){
								classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							}
							attributeTable = temp["attributeTable"];
							linkTable = temp["linkTable"];
							filterTable = temp["filterTable"];
							linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
						}
					}
					
					for(var groupPattern in patterns){	
						if(typeof patterns[groupPattern]["type"] === "undefined" || (typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] !== "bgp")){
							var temp = await parseSPARQLjsStructureWhere(patterns[groupPattern], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
							classesTable = temp["classesTable"];
							for(var clazz in temp["classTableAdded"]){
								classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							}
							attributeTable = temp["attributeTable"];
							linkTable = temp["linkTable"];
							filterTable = temp["filterTable"];
							linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
						}
					}
						
					linkTable = connectAllClasses(classTableTemp, linkTable, allClasses);
					
					var NL = parentNodeList;
					for(var node in nodeList){
						NL[node] = concatNodeListInstance(NL, node, nodeList[node]);
					}
					
					classesTable = removeParrentQueryClasses(NL, classesTable, classTableTemp, linkTableTemp, attributeTable);
					var tempLink = relinkUnionLink(classesTable, linkTable, unionClass);
					linkTable = tempLink["linkTable"];
					
					if(tempLink["relinkt"] == false){
						var object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");
						if(object == null){
							for(var subClass in classTableTemp){
								object = subClass;
								break;
							}
						}

						var link = {
							"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
							"object":object,
							"subject":unionClass,
							"isVisited":false,
							"linkType":linktype,
							"isSubQuery":false,
							"isGlobalSubQuery":false,
							"counter":orderCounter
						}
						linkTable.push(link);
		
						linkTableAdded.push(link);
						orderCounter++;
					}
				}
			}
		}
	}
	// type=bind
	if(where["type"] == "bind"){
		
		var temp = await parseSPARQLjsStructureWhere(where["expression"], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
		
		
		
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		filterTable = temp["filterTable"];
		linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
		classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
		attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
		bindTable = temp["bindTable"];
		viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
		viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
		
		if(typeof where["expression"] === "string" && Object.keys(classesTable).length == 0 && vq_visual_grammar.parse(where["expression"])["type"] == "iri"){
			var subjectNameParsed = vq_visual_grammar.parse(where["expression"]);
			
			var className = await generateInstanceAlias(subjectNameParsed["value"]);

			classesTable[subjectNameParsed["value"]] = {
							"variableName":where["expression"],
							"identification":null,
							"instanceAlias":className,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};
			classTableAdded.push(subjectNameParsed["value"]);
			nodeList[subjectNameParsed["value"]] = [];
			nodeList[subjectNameParsed["value"]]["uses"] = [];
			nodeList[subjectNameParsed["value"]]["uses"][subjectNameParsed["value"]] = "class";
		}
		
		var bindExpr = viziQuerExpr["exprString"];
		if(bindExpr == "" && typeof where["expression"] === "string") bindExpr = "`" + await generateInstanceAlias(where["expression"]);
		
		var isInternal = true;
		// if(typeof variableList[where["variable"]] !== "undefined" && variableList[where["variable"]] <= 1) isInternal = true;
		
		var attributeInfo = {
			"alias":where["variable"].substring(1),
			"identification":null,
			"requireValues":false,
			"isInternal":isInternal,
			"groupValues":false,
			"exp":bindExpr,
			"counter":orderCounter
		}
		orderCounter++;
		bindTable[where["variable"].substring(1)] = attributeInfo;
		
		if(viziQuerExpr["exprString"] != "" && Object.keys(findByVariableName(attributeTable, viziQuerExpr["exprVariables"][0])).length > 0){
			var attributes = findByVariableName(attributeTable, viziQuerExpr["exprVariables"][0]);
			for (var attribute in attributes){
				classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
				// console.log("17", attributeInfo)
				variableList[where["variable"]] = "seen";
				bindTable[where["variable"].substring(1)]["seen"] = true;
				bindTable[where["variable"].substring(1)]["class"] = attributeTable[attribute]["class"];
			}
		}
		if(typeof classesTable[viziQuerExpr["exprVariables"][0]] !== 'undefined'){
			classesTable[viziQuerExpr["exprVariables"][0]] = addAttributeToClass(classesTable[viziQuerExpr["exprVariables"][0]], attributeInfo);
			// console.log("18", attributeInfo)
			variableList[where["variable"]] = "seen";
			bindTable[where["variable"].substring(1)]["seen"] = true;
			bindTable[where["variable"].substring(1)]["class"] = viziQuerExpr["exprVariables"][0];
		}
		
	}
	// type=functionCall
	if(where["type"] == "functionCall"){
		var functionName = "<"+where["function"]+">"
		var ignoreFunction = false;
		if(where["function"] == "http://www.w3.org/2001/XMLSchema#dateTime" || where["function"] == "http://www.w3.org/2001/XMLSchema#date" || where["function"] == "http://www.w3.org/2001/XMLSchema#decimal") ignoreFunction = true;

		var shortFunction = await generateInstanceAlias(where["function"], false);
		if(shortFunction != where["function"]) functionName = shortFunction;
		
		if(ignoreFunction == false) viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + functionName + "(";
		var args = [];
			
		for(var arg in where["args"]){
			if(typeof where["args"][arg] == 'string') {
				var arg1 = generateArgument(where["args"][arg]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				args.push(arg1["value"]);
			}
			else if(typeof where["args"][arg] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				args.push(temp["viziQuerExpr"]["exprString"]);
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ");
		if(ignoreFunction == false) viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + ")";
	}
	// type=operation
	if(where["type"] == "operation"){
		//relation or atithmetic
		if(checkIfRelation(where["operator"]) != -1 || chechIfArithmetic(where["operator"]) != -1){	
				
			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(arg1["type"] == "iri" && checkIfRelation(where["operator"]) != -1) {
					if(argValue.startsWith("http://www.w3.org/2001/XMLSchema#")) argValue = "xsd:" + argValue.substring(33);
					else if(argValue.startsWith("http://www.w3.org/1999/02/22-rdf-syntax-ns#")) argValue = "rdf:" + argValue.substring(43);
					else {
						argValue = await generateInstanceAlias(argValue)
					}
				}
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;	
			}
			else if(typeof where["args"][0] == 'object'){	
				var temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				if((where["operator"] == "*" || where["operator"] == "/") && (typeof where["args"][0]["type"] === 'undefined' || (typeof where["args"][0]["type"] !== 'undefined' && where["args"][0]["type"] != "functionCall"))) viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "(" +temp["viziQuerExpr"]["exprString"] + ")";
				else viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				bindTable = temp["bindTable"];
			}

			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + where["operator"] + " ";
			
			if(typeof where["args"][1] == 'string') {
				var arg2 = generateArgument(where["args"][1]);
				if(arg2["type"] == "varName") viziQuerExpr["exprVariables"].push(arg2["value"]);
				var argValue = arg2["value"];
				
				
				if(arg2["type"] == "iri" && checkIfRelation(where["operator"]) != -1) {
					if(argValue.startsWith("http://www.w3.org/2001/XMLSchema#")) argValue = "xsd:" + argValue.substring(33)
					else if(argValue.startsWith("http://www.w3.org/1999/02/22-rdf-syntax-ns#")) argValue = "rdf:" + argValue.substring(43)
					else {
						argValue = await generateInstanceAlias(argValue)
					}
				} else if(arg2["type"] == "RDFLiteral" && arg2["value"].indexOf("^^") !== -1){
					var uri = arg2["value"].substring(arg2["value"].indexOf("^^")+3, arg2["value"].length-1)
					uri = await generateInstanceAlias(uri, false);	
					argValue = arg2["value"].substring(0, arg2["value"].indexOf("^^")) + "^^" + uri;
				}
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][1], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				if((where["operator"] == "*" || where["operator"] == "/") && (typeof where["args"][1]["type"] === 'undefined' || (typeof where["args"][1]["type"] !== 'undefined' && where["args"][1]["type"] != "functionCall"))) viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "(" +temp["viziQuerExpr"]["exprString"] + ")";
				else viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		//zero argumentFunctions
		else if(where["args"].length == 0){
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "()";
		}//one argumentFunctions
		else if(checkIfOneArgunemtFunctuion(where["operator"]) != -1){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";

			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);		
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";
		}
		//two argumentFunctions
		else if(checkIfTwoArgunemtFunctuion(where["operator"]) != -1){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";

			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				argValue = await generateInstanceAlias(argValue);
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ", ";
			
			if(typeof where["args"][1] == 'string') {
				var arg1 = generateArgument(where["args"][1]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				argValue = await generateInstanceAlias(argValue)
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][1], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";
		}
		//IF
		else if(where["operator"]== "if"){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";

			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ", ";
			
			if(typeof where["args"][1] == 'string') {
				var arg1 = generateArgument(where["args"][1]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(arg1["type"] == "iri"){
					argValue = await generateInstanceAlias(arg1["value"])
				}
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][1], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ", ";
			
			if(typeof where["args"][2] == 'string') {
				var arg1 = generateArgument(where["args"][2]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(arg1["type"] == "iri"){
					argValue = await generateInstanceAlias(arg1["value"])
				}
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][2] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][2], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";
		}
		//coalesce / concat / regex / substr
		else if(where["operator"]== "coalesce" || where["operator"]== "concat" || where["operator"]== "regex" || where["operator"]== "substr" || where["operator"]== "replace"){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";
			var args = [];
			
			for(var arg in where["args"]){
				if(typeof where["args"][arg] == 'string') {
					var arg1 = generateArgument(where["args"][arg]);
					if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
					var argValue = arg1["value"];
					if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
					args.push(argValue);
				}
				else if(typeof where["args"][arg] == 'object'){
					var temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
					bindTable = temp["bindTable"];
					args.push(temp["viziQuerExpr"]["exprString"]);
					viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				}
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ") + ")";
		}
		// !
		else if(where["operator"] == "!"){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] ;

			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		//not exists
		else if(where["operator"] == "notexists"){
			
		
			
			var nodeLitsTemp = [];
			
			if(where["args"].length == 1 && where["args"][0]["type"] == "bgp" && where["args"][0]["triples"].length == 1){
				
				var collectNodeListTemp  = await collectNodeList(where["args"]);
				var temp  = collectNodeListTemp["nodeList"];
				for(var node in temp){
					nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
				}
							
				// var schema = new VQ_Schema();
					
				var dataPropertyResolved = await dataShapes.resolvePropertyByName({name: where["args"][0]["triples"][0]["predicate"]});
				// var dataPropertyResolved = schema.resolveAttributeByName(null, where["args"][0]["triples"][0]["predicate"]);
				// if(dataPropertyResolved == null) dataPropertyResolved = schema.resolveLinkByName(where["args"][0]["triples"][0]["predicate"]);

				if(dataPropertyResolved.complete==true){
					
					var sn = dataPropertyResolved.data[0].display_name;
					if(schemaName == "wikidata" && dataPropertyResolved.data[0].prefix == "wdt"){}
					else if(dataPropertyResolved.data[0].is_local != true)sn = dataPropertyResolved.data[0].prefix+ ":" + sn;
					dataPropertyResolved.data[0].short_name = sn;
					
					if(dataPropertyResolved.data[0].data_cnt == 0 || Object.keys(classesTable).length == 0){
						var classesS = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"])
						var classesO = findByVariableName(classesTable, where["args"][0]["triples"][0]["object"])
						
						if(classesO.length == 0 || classesS.length == 0 ){

							if(Object.keys(classesO).length > 0 && Object.keys(classesS).length > 0){
								var classS;
								var classO;
								
								for (var clazz in classesS){
									classS = clazz;
									break;
								}
								for (var clazz in classesO){
									classO = clazz;
									break;
								}
								
								var link = {
									"linkIdentification":dataPropertyResolved.data[0],
									"object":classO,
									"subject":classS,
									"isVisited":false,
									"linkType":"NOT",
									"isSubQuery":false,
									"isGlobalSubQuery":false,
									"counter":orderCounter
								}

								linkTable.push(link);
								orderCounter++;
							}else {
								
								var temp = await generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
								for(var clazz in temp["classTableAdded"]){
									for(var link in linkTable){
										if(linkTable[link]["subject"] == temp["classTableAdded"][clazz] || linkTable[link]["object"] == temp["classTableAdded"][clazz]) {
											linkTable[link]["linkType"] = "NOT";
										}
									}
								}	
							}							
						} else {
							var classS;
							var classO;
							
							for (var clazz in classesS){
								classS = clazz;
								break;
							}
							for (var clazz in classesO){
								classO = clazz;
								break;
							}
							
							var link = {
								"linkIdentification":dataPropertyResolved.data[0],
								"object":classO,
								"subject":classS,
								"isVisited":false,
								"linkType":"NOT",
								"isSubQuery":false,
								"isGlobalSubQuery":false,
								"counter":orderCounter
							}

							linkTable.push(link);
							orderCounter++;
						}
						
					} else {
						// dataPropertyResolved.data[0]["short_name"] = dataPropertyResolved.data[0]["prefix"]+":"+dataPropertyResolved.data[0]["display_name"];
						exprVariables = [];
						exprVariables.push(dataPropertyResolved.data[0]["short_name"]);
						filterTable.push({filterString:"NOT EXISTS " + dataPropertyResolved.data[0]["short_name"], filterVariables:exprVariables});
						
						var subject = await dataShapes.resolveIndividualByName({name: where["args"][0]["triples"][0]["subject"]});
						var object = await dataShapes.resolveIndividualByName({name: where["args"][0]["triples"][0]["object"]});

						var classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"])
						if(generateOnlyExpression != true){
							for (var clazz in classes){
								if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
								classesTable[clazz]["conditions"].push("NOT EXISTS " + dataPropertyResolved.data[0]["short_name"]);
								break;
								//temp["attributeTable"][temp["attributeTableAdded"][attribute]]["seen"] = true;
							}
						}
						viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + dataPropertyResolved.data[0]["short_name"];
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
					}
				} else if(typeof where["args"][0]["triples"][0]["predicate"] == "object"){	
					var temp = await generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
					exprVariables = [];

					for(var attribute in temp["attributeTableAdded"]){
						exprVariables.push(temp["attributeTable"][temp["attributeTableAdded"][attribute]]["variableName"]);
						filterTable.push({filterString:"NOT EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"], filterVariables:exprVariables});
						
						var classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"])
						if(generateOnlyExpression != true){
							for (var clazz in classes){
								if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
								classesTable[clazz]["conditions"].push("NOT EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]);
								break;
							}
						}
						viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
					}
					
					for(var clazz in temp["classTableAdded"]){
						for(var link in linkTable){
							if(linkTable[link]["subject"] == temp["classTableAdded"][clazz] || linkTable[link]["object"] == temp["classTableAdded"][clazz]) {
								linkTable[link]["linkType"] = "NOT";
							}
						}
					}		
				}
			} else {	
				
				for(var arg in where["args"]){
					if(where["args"][arg]["type"] == 'group'){
						var patterns =  where["args"][arg]["patterns"];
						var tempClassTable = [];
						for(var pattern in patterns){
							var collectNodeListTemp  = await collectNodeList(patterns);
							var temp  = collectNodeListTemp["nodeList"];
							for(var node in temp){
								nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
							}
							 
							if(patterns[pattern]["type"] == "filter" && tempClassTable.length == 0){
								var temp = await parseSPARQLjsStructureWhere(patterns[pattern]["expression"], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);

								for(var attr in attributeTableAdded){
									var addedAttribute = attributeTableAdded[attr];

									// is not defined in attribute table and is schema property
									// if(typeof attributeTable[addedAttribute] !== 'undefined' && (schema.resolveLinkByName(attributeTable[addedAttribute]["variableName"]) != null) || schema.resolveAttributeByName(null, attributeTable[addedAttribute]["variableName"]) != null) attributeTable[addedAttribute]["seen"] = true;
									var propertyResolved = await dataShapes.resolvePropertyByName({name: attributeTable[addedAttribute]["variableName"]});
									if(typeof attributeTable[addedAttribute] !== 'undefined' && propertyResolved.complete == true) attributeTable[addedAttribute]["seen"] = true;
								}
								
								viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + temp["viziQuerExpr"]["exprString"];
								viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
	
							}  else{
								var temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								
								classesTable = temp["classesTable"];
								attributeTable = temp["attributeTable"];
								filterTable = temp["filterTable"];
								linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
								classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
								tempClassTable = classTableAdded.concat(temp["classTableAdded"]);
								attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
								bindTable = temp["bindTable"];
							}
						}
					} else{
						var collectNodeListTemp  = await collectNodeList(where["args"]);
						var temp  = collectNodeListTemp["nodeList"];
						for(var node in temp){
							nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						}
						
						for(var clazz in classesTable){
							allClasses[clazz] = classesTable[clazz];
						}

						var temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						classesTable = temp["classesTable"];
						attributeTable = temp["attributeTable"];
						filterTable = temp["filterTable"];
						linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
						classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
						attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
						bindTable = temp["bindTable"];		
					}
				}
			}

			for(link in linkTableAdded){
				if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
					linkTableAdded[link]["linkType"] = "NOT";
					if(patternType == "minus") linkTableAdded[link]["isGlobalSubQuery"] = true;
					for(attr in attributeTableAdded){
						var attributeInfoTemp = attributeTable[attributeTableAdded[attr]];
						var attributeInfo = {
							"alias":attributeInfoTemp["alias"],
							"identification":attributeInfoTemp["identification"],
							"requireValues":attributeInfoTemp["requireValues"],
							"isInternal":false,
							"groupValues":false,
							"exp":attributeInfoTemp["identification"]["short_name"],
							"counter":attributeInfoTemp["counter"]
						}
						classesTable[attributeTable[attributeTableAdded[attr]]["class"]] = addAttributeToClass(classesTable[attributeTable[attributeTableAdded[attr]]["class"]], attributeInfo);
						// console.log("19", attributeInfo)
						attributeTable[attributeTableAdded[attr]]["seen"] = true;
					}
				}
			}
			linkTable = linkTable.concat(linkTableAdded);

			// console.log("NOT EXISTS", nodeLitsTemp, nodeList, linkTable, linkTableAdded, classTableAdded);
		}
		//exists
		else if(where["operator"] == "exists"){
			var nodeLitsTemp = [];

			if(where["args"].length == 1 && where["args"][0]["type"] == "bgp" && where["args"][0]["triples"].length == 1){
				var collectNodeListTemp  = await collectNodeList(where["args"]);
				var temp  = collectNodeListTemp["nodeList"];
				for(var node in temp){
					nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
				}
				
				// var schema = new VQ_Schema();
				// var dataPropertyResolved = schema.resolveAttributeByName(null, where["args"][0]["triples"][0]["predicate"]);
				var dataPropertyResolved = await dataShapes.resolvePropertyByName({name: where["args"][0]["triples"][0]["predicate"]});
				// if(dataPropertyResolved == null) dataPropertyResolved = schema.resolveLinkByName(where["args"][0]["triples"][0]["predicate"]);
				
				
				
				if(dataPropertyResolved.complete==true){
					exprVariables = [];
					
					var sn = dataPropertyResolved.data[0].display_name;
					if(schemaName == "wikidata" && dataPropertyResolved.data[0].prefix == "wdt"){}
					else if(dataPropertyResolved.data[0].is_local != true)sn = dataPropertyResolved.data[0].prefix+ ":" + sn;
					dataPropertyResolved.data[0].short_name = sn;
					
					// dataPropertyResolved.data[0]["short_name"] = dataPropertyResolved.data[0]["prefix"] +":"+ dataPropertyResolved.data[0]["display_name"];
					exprVariables.push(dataPropertyResolved.data[0]["short_name"]);
					filterTable.push({filterString:"EXISTS " + dataPropertyResolved.data[0]["short_name"], filterVariables:exprVariables});
					
					var classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"])
					if(generateOnlyExpression != true){
						for (var clazz in classes){
							if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
							classesTable[clazz]["conditions"].push("EXISTS " + dataPropertyResolved.data[0]["short_name"]);

							break;
						}
					}
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "EXISTS " + dataPropertyResolved.data[0]["short_name"];
					viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
				}else if(typeof where["args"][0]["triples"][0]["predicate"] == "object"){
					var temp = await generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
					exprVariables = [];
					
					for(var attribute in temp["attributeTableAdded"]){
						exprVariables.push(temp["attributeTable"][temp["attributeTableAdded"][attribute]]["variableName"]);
						filterTable.push({filterString:"EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"], filterVariables:exprVariables});
						
						var classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"])
						if(generateOnlyExpression != true){
							for (var clazz in classes){
								if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
								classesTable[clazz]["conditions"].push("EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]);
								temp["attributeTable"][temp["attributeTableAdded"][attribute]]["seen"] = true;
	
								break;
							}
						}
						viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
					}
					
					for(var clazz in temp["classTableAdded"]){
						for(var link in linkTable){
							if(linkTable[link]["subject"] == temp["classTableAdded"][clazz] || linkTable[link]["object"] == temp["classTableAdded"][clazz]) {
								linkTable[link]["isSubQuery"] = true;
							}
						}
					}
				}
			} else {
				var nodeLitsTemp = [];
				
				for(var arg in where["args"]){
					if(where["args"][arg]["type"] == 'group'){
						var patterns =  where["args"][arg]["patterns"];
						var collectNodeListTemp = await collectNodeList(patterns);
						var temp  = collectNodeListTemp["nodeList"];

						for(var node in temp){
							nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						}
						
						var notBgpOrfilter = false;
						for(var pattern in patterns){
							if(patterns[pattern]["type"] != "bgp" || patterns[pattern]["type"] != "filter") notBgpOrfilter = true;
						}
						if(notBgpOrfilter == true){
							var tempClassTable = [];
							for(var pattern in patterns){
								if( patterns[pattern]["type"] == "bgp"){
									var triples = patterns[pattern]["triples"];
									var temp = await generateTypebgp(triples, nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList);
									tempClassTable = tempClassTable.concat(temp["classTableAdded"]);
		
									if(typeof temp["nodeLits"] !== 'undefined')nodeLitsTemp = temp["nodeLits"];

									for(var attr in temp["attributeTableAdded"]){
										var addedAttribute = temp["attributeTableAdded"][attr];
										// var schema = new VQ_Schema();
										// (if not in attribute table and is schema OP) or (is schema DP)
										var propertyResolved = await dataShapes.resolvePropertyByName({name: attributeTable[addedAttribute]["variableName"]});
										if(typeof attributeTable[addedAttribute] !== 'undefined' && propertyResolved.complete == true && propertyResolved.data[0].object_cnt > 0 || (propertyResolved.complete == true  && propertyResolved.data[0].data_cnt > 0))  attributeTable[addedAttribute]["seen"] = true;
										// if(typeof attributeTable[addedAttribute] !== 'undefined' && (schema.resolveLinkByName(attributeTable[addedAttribute]["variableName"]) != null) || schema.resolveAttributeByName(null, attributeTable[addedAttribute]["variableName"]) != null) attributeTable[addedAttribute]["seen"] = true;
									}
								} else{
									var temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
									viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
									viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
								}
							}
							
							for(var link in linkTable){
								if((tempClassTable.indexOf(linkTable[link]["object"]) != -1 && tempClassTable.indexOf(linkTable[link]["subject"]) == -1) || 
								(tempClassTable.indexOf(linkTable[link]["object"]) == -1 && tempClassTable.indexOf(linkTable[link]["subject"]) != -1)) {
									linkTable[link]["isSubQuery"] = true;
								}
							}
							
						}else{
							for(var pattern in patterns){
								var temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp,  nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								attributeTable = temp["attributeTable"];
								filterTable = temp["filterTable"];
								linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
								classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
								attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
								bindTable = temp["bindTable"];
							}
						}
					} else{ 
						var collectNodeListTemp  = await collectNodeList(where["args"]);
						var temp  = collectNodeListTemp["nodeList"];
						for(var node in temp){
							nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						}
						
						if(where["args"][arg]["type"] == "bgp"){
							// var schema = new VQ_Schema();
							var triples = where["args"][arg]["triples"];
							for(var triple in triples){
								//var dataPropertyResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]);
								var dataPropertyResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]});
									// is schema data property
								if(dataPropertyResolved.complete == true && dataPropertyResolved.data[0].data_cnt> 0 && dataPropertyResolved.data[0].object_cnt == 0){
									
									var sn = dataPropertyResolved.data[0].display_name;
									if(schemaName == "wikidata" && dataPropertyResolved.data[0].prefix == "wdt"){}
									else if(dataPropertyResolved.data[0].is_local != true)sn = dataPropertyResolved.data[0].prefix+ ":" + sn;
									dataPropertyResolved.data[0].short_name = sn;
									
									
									// dataPropertyResolved.data[0]["short_name"] = dataPropertyResolved.data[0]["prefix"] + ":" + dataPropertyResolved.data[0]["display_name"];
									exprVariables = [];
									exprVariables.push(dataPropertyResolved.data[0]["local_name"]);
									filterTable.push({filterString:"EXISTS " + dataPropertyResolved.data[0]["short_name"], filterVariables:exprVariables});
									
									var classes = findByVariableName(classesTable, triples[triple]["subject"])
									if(generateOnlyExpression != true){
										for (var clazz in classes){
											if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
											classesTable[clazz]["conditions"].push("EXISTS " + dataPropertyResolved.data[0]["short_name"]);
											break;
										}
									}
								} else {
									var temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
									classesTable = temp["classesTable"];
									attributeTable = temp["attributeTable"];
									filterTable = temp["filterTable"];
									linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
									classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
									attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
									bindTable = temp["bindTable"];
								}
							}
						} else{
							var temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
							classesTable = temp["classesTable"];
							attributeTable = temp["attributeTable"];
							filterTable = temp["filterTable"];
							linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
							classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
							attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
							bindTable = temp["bindTable"];
						}
					}
				}
			}
			// console.log("FILTER EXISTS", nodeLitsTemp, nodeList);

			for(link in linkTableAdded){
				if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
					linkTableAdded[link]["linkType"] = "REQUIRED";
					linkTableAdded[link]["isSubQuery"] = true;
					for(attr in attributeTableAdded){
						var attributeInfoTemp = attributeTable[attributeTableAdded[attr]];
						var attributeInfo = {
							"alias":attributeInfoTemp["alias"],
							"identification":attributeInfoTemp["identification"],
							"requireValues":attributeInfoTemp["requireValues"],
							"isInternal":false,
							"groupValues":false,
							"exp":attributeInfoTemp["identification"]["short_name"],
							"counter":attributeInfoTemp["counter"]
						}
						classesTable[attributeTable[attributeTableAdded[attr]]["class"]] = addAttributeToClass(classesTable[attributeTable[attributeTableAdded[attr]]["class"]], attributeInfo);
						// console.log("20", attributeInfo)
						attributeTable[attributeTableAdded[attr]]["seen"] = true;

					}
				}
			}
			linkTable = linkTable.concat(linkTableAdded);
		}
		// or / and
		else if(where["operator"] == "||" || where["operator"] == "&&" ){
			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}

			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + where["operator"] + " ";

			if(typeof where["args"][1] == 'string') {
				var arg2 = generateArgument(where["args"][1]);
				if(arg2["type"] == "varName") viziQuerExpr["exprVariables"].push(arg2["value"]);
				var argValue = arg2["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][1], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		// in / not in
		else if(where["operator"] == "in" || where["operator"] == "notin" ){
			if(typeof where["args"][0] == 'string') {
				var arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				var argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				var temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			var operator = "";
			if (where["operator"] == "in") operator = "IN";
			if (where["operator"] == "notin") operator = "NOT IN";
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + operator + "(";

			if(typeof where["args"][1] == 'object'){
				var args = [];
				for(arg in where["args"][1]){
					var argNParsed = generateArgument(where["args"][1][arg]);

					var argN = argNParsed["value"]
					if(argNParsed["type"] == "iri"){
						argN = await generateInstanceAlias(argNParsed["value"])
					}
					
					args.push(argN);
				}
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ");
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + ")";
		}	
	}
	if(where["type"] == "graph" || where["type"] == "service"){
		
		var nodeLitsTemp = nodeList;
		var patterns =  where["patterns"];
		var collectNodeListTemp = await collectNodeList(patterns);
		var temp  = collectNodeListTemp["nodeList"];
		
		var linkTableTemp = [];
		var attributeTableTemp = [];
		
		var nodeLestsMatches = true;
		if(Object.keys(nodeList).length != Object.keys(temp).length) nodeLestsMatches = false;
		else if(Object.keys(nodeList).length > 0 && Object.keys(nodeList).length == Object.keys(temp).length){
			for(var key in temp){
				if(typeof nodeList[key] == "undefined"){
					nodeLestsMatches = false;
					break;
				}
			}
		}
		
		if(nodeLestsMatches == true){
			nodeLitsTemp = parentNodeList;
		}
		if(Object.keys(nodeLitsTemp).length == 0) nodeLitsTemp = nodeList;
		
		var graphName = await generateInstanceAlias(where.name, false);
		
		if(typeof where["patterns"][0]["queryType"] != "undefined"){
		
			// var abstractTable = await generateAbstractTable(where["patterns"][0], allClasses, variableList, nodeList);
			
			// for(var clazz in abstractTable["classesTable"]){
				// allClasses[clazz] = abstractTable["classesTable"][clazz];
				// classesTable[clazz] = abstractTable["classesTable"][clazz];
			// }
			
			var w = {
				"type": "group",
				"patterns": where["patterns"]
			}
			
			var wherePartTemp = await parseSPARQLjsStructureWhere(w, temp, nodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
				linkTableTemp = linkTableTemp.concat(wherePartTemp["linkTableAdded"]);
				attributeTableTemp = attributeTableTemp.concat(wherePartTemp["attributeTableAdded"]);
		} else {
		
			for(var pattern in where["patterns"]){
				for(var clazz in classesTable){
					allClasses[clazz] = classesTable[clazz];
				} 
				var wherePartTemp = await parseSPARQLjsStructureWhere(where["patterns"][pattern], temp, nodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
				linkTableTemp = linkTableTemp.concat(wherePartTemp["linkTableAdded"]);
				attributeTableTemp = attributeTableTemp.concat(wherePartTemp["attributeTableAdded"]);
				classTableAdded = classTableAdded.concat(wherePartTemp["classTableAdded"]);	
				// if(wherePartTemp.attributeTableAdded.length > 0 && wherePartTemp.classTableAdded.length == 0 && linkTableTemp.length == 0){
					// for(var attr in wherePartTemp.attributeTableAdded){
						// attributeTable[wherePartTemp.attributeTableAdded[attr]]["graphInstruction"] = where["type"].toUpperCase();
						// attributeTable[wherePartTemp.attributeTableAdded[attr]]["graph"] = graphName;
					// }
				// }
				
			}
			
			var tempClassTable = [];
			for(var cl in classTableAdded){
				tempClassTable[classTableAdded[cl]] = classesTable[classTableAdded[cl]];
			}
			
			//connect not connected classes
			linkTable = connectNotConnectedClasses(tempClassTable, linkTable, temp);
			linkTableTemp = connectNotConnectedClasses(tempClassTable, linkTableTemp, temp);
			
			if(linkTableTemp.length == 0){
				for(var attr in attributeTableTemp){
					attributeTable[attributeTableTemp[attr]]["graphInstruction"] = where["type"].toUpperCase();
					attributeTable[attributeTableTemp[attr]]["graph"] = graphName;
				}
			}
			
			
			
			// linkTableTemp = connectNotConnectedClasses(classesTable, linkTableTemp, nodeLitsTemp);
			
			var linkFound = false;
			for(var link in linkTableTemp){
				var object = linkTableTemp[link]["object"];
				var subject = linkTableTemp[link]["subject"];
				var objectVarName = classesTable[object]["variableName"];
				var subjectVarName = classesTable[subject]["variableName"];
				
				var graphName = await generateInstanceAlias(where.name, false);
				
				if(typeof nodeLitsTemp[objectVarName] === "undefined" && typeof nodeLitsTemp[subjectVarName] !== "undefined"){
					linkTableTemp[link]["graphInstruction"] = where["type"].toUpperCase();
					linkTableTemp[link]["graph"] = graphName;
					linkFound = true;
				}
				
				if(typeof nodeLitsTemp[objectVarName] !== "undefined" && typeof nodeLitsTemp[subjectVarName] === "undefined"){
					linkTableTemp[link]["graphInstruction"] = where["type"].toUpperCase();
					linkTableTemp[link]["graph"] = graphName;
					linkFound = true;
				}
			}
			if(linkFound == false){
				
				var classesTableTepm = [];
				for(var cl in classTableAdded){
					classesTableTepm[classTableAdded[cl]] = classesTable[classTableAdded[cl]];
				}
				
				// var subSelectMainClass = findClassToConnect(classesTableTepm, linkTableTemp, null,"subject");
				var subSelectMainClass = classTableAdded[0];
				
				var graphName = await generateInstanceAlias(where.name, false);
				classesTable[subSelectMainClass]["graphInstruction"] = where["type"].toUpperCase();
				classesTable[subSelectMainClass]["graph"] = graphName;
				
			}
		}	
	}
	// type=subquery
	if((where["type"] == "group" || where["type"] == "optional") && typeof where["patterns"][0]["queryType"] != "undefined"){
		
		for(var clazz in classesTable){
			allClasses[clazz] = classesTable[clazz];
		}
		// console.log("SUBQUERY", where["patterns"][0], classesTable, allClasses);
		
		var abstractTable = await generateAbstractTable(where["patterns"][0], allClasses, variableList, nodeList);

		for(var clazz in abstractTable["classesTable"]){
			allClasses[clazz] = abstractTable["classesTable"][clazz];
		}

		var linkFound = false;
		var pn = null;
		for(var node in abstractTable["nodeList"]){
			if(typeof nodeList[node] !== 'undefined'){
				
				//find links outside subquery
				for(var subLink in abstractTable["linkTable"]){
					if((typeof classesTable[abstractTable["linkTable"][subLink]["subject"]]!=='undefined' && classesTable[abstractTable["linkTable"][subLink]["subject"]]["variableName"] == node) 
						|| (typeof classesTable[abstractTable["linkTable"][subLink]["object"]] !== 'undefined' && classesTable[abstractTable["linkTable"][subLink]["object"]]["variableName"] == node)){
						if(linkFound==false){
							var subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"subject", nodeList[node]);
							pn = nodeList[node];
							if(subSelectMainClass == null){
								for(var subClass in abstractTable["classesTable"]){
									subSelectMainClass = subClass;
									break;
								}
							 } 
								
							for(var clazz in abstractTable["classesTable"]){
								if(clazz !== subSelectMainClass && (typeof abstractTable["classesTable"][clazz]["aggregations"] !== "undefined" || abstractTable["classesTable"][clazz]["aggregations"] != null)){
									
									var underSubQuery = false;
									for(var l in  abstractTable["linkTable"]){
										if(abstractTable["linkTable"][l]["subject"] == clazz && (abstractTable["linkTable"][l]["isSubQuery"] == true || abstractTable["linkTable"][l]["isGlobalSubQuery"] == true )){
											underSubQuery = true;
											break;
										}
									}
									if(underSubQuery != true){
										var aggregations = abstractTable["classesTable"][clazz]["aggregations"];
										for(var aggr in aggregations){
											if(aggregations[aggr]["exp"].toLowerCase() == "count(.)"){
												var cn = abstractTable["classesTable"][clazz]["instanceAlias"];
												if(typeof cn === 'undefined' || cn == null) cn = abstractTable["classesTable"][clazz]["identification"]["short_name"];
												abstractTable["classesTable"][subSelectMainClass] = addAggrigateToClass(abstractTable["classesTable"][subSelectMainClass], {exp:"count(" + cn + ")", alias:aggregations[aggr]["alias"]});
											} else if(aggregations[aggr]["exp"].toLowerCase() == "count_distinct(.)"){
												var cn = abstractTable["classesTable"][clazz]["instanceAlias"];
												if(typeof cn === 'undefined' || cn == null) cn = abstractTable["classesTable"][clazz]["identification"]["short_name"];
												abstractTable["classesTable"][subSelectMainClass] = addAggrigateToClass(abstractTable["classesTable"][subSelectMainClass], {exp:"count_distinct(" + cn + ")", alias:aggregations[aggr]["alias"]});
											} else {
												abstractTable["classesTable"][subSelectMainClass] = addAggrigateToClass(abstractTable["classesTable"][subSelectMainClass], aggregations[aggr]);
											}
										}
										abstractTable["classesTable"][clazz]["aggregations"] = null;
									}
								}
							}
							
							if(typeof abstractTable["classesTable"][subSelectMainClass]["aggregations"] === 'undefined' && typeof where["patterns"][0]["distinct"] === 'undefined'){
								abstractTable["classesTable"][subSelectMainClass]["selectAll"] = true;
							}
							var isSubQuery = true;
							var isGlobalSubQuery = false;
							if(typeof where["patterns"][0]["limit"] !== 'undefined' || typeof where["patterns"][0]["offset"] !== 'undefined' || typeof where["patterns"][0]["order"] !== 'undefined'){
								isSubQuery = false;
								isGlobalSubQuery = true;
							}	
							abstractTable["linkTable"][subLink]["isSubQuery"] = isSubQuery;
							abstractTable["linkTable"][subLink]["isGlobalSubQuery"] = isGlobalSubQuery;
							if(where["type"] == "optional") abstractTable["linkTable"][subLink]["linkType"] = "OPTIONAL";
							linkFound = true;
						}else{
							abstractTable["linkTable"][subLink]["isConditionLink"] = true;
						}
					}
					linkTable.push(abstractTable["linkTable"][subLink]);
				}
			}
		}
		
		
		// UNIT
		if(Object.keys(nodeList).length == 0){
					
			if(typeof classesTable["[ ]"] === 'undefined' && typeof allClasses["[ ]"] === 'undefined'){
				classesTable["[ ]"] = {
					"variableName":"?[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classTableAdded.push("[ ]");
				nodeList["?[ ]"]= {uses: {"[ ]": "class"}, count:1};
			}else {
				classesTable["[ ]"+counter] = {
					"variableName":"?[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classTableAdded.push("[ ]"+counter);
				if(typeof nodeList["?[ ]"] === 'undefined') nodeList["?[ ]"] = {uses: [], count:1}
				nodeList["?[ ]"]["uses"]["[ ]"+counter] = "class";
				nodeList["?[ ]"]["count"] = nodeList["?[ ]"]["count"]+1;
				counter++;
			}
		}
		if(linkFound == false){
			var linkType = "REQUIRED"
			if(where["type"] == "optional") linkType = "OPTIONAL";
			if(typeof nodeList["?[ ]"] !== 'undefined'){
				for(var unionClass in nodeList["?[ ]"]["uses"]){
					var object = findClassToConnectUNIT(abstractTable["classesTable"], abstractTable["linkTable"], null, "object");
					if(object == null){
						for(var subClass in abstractTable["classesTable"]){
							object = subClass;
							break;
						}
					}
					
					var isSubQuery = true;
					var isGlobalSubQuery = false;
					
					if(typeof where["patterns"][0]["limit"] !== 'undefined' || typeof where["patterns"][0]["offset"] !== 'undefined' || abstractTable["orderTable"].length > 0){
						isGlobalSubQuery = true;
						isSubQuery = false;
					}
					
					var link = {
						"linkIdentification":{local_name: "++", short_name: "++"},
						"object":object,
						"subject":unionClass,
						"isVisited":false,
						"linkType":linkType,
						"isSubQuery":isSubQuery,
						"isGlobalSubQuery":isGlobalSubQuery,
						"counter":orderCounter
					}
					linkTable.push(link);
					linkTableAdded.push(link);
					linkFound = true;
					orderCounter++;
				}
			}
			if(typeof abstractTable["nodeList"]["?[ ]"] !== 'undefined'){
				for(var unionClass in abstractTable["nodeList"]["?[ ]"]["uses"]){
					
					var subject = findClassToConnectUNIT(classesTable, linkTable, nodeList, "subject");
					if(subject == null){
						for(var subClass in classesTable){
							subject = subClass;
							break;
						}
					}
	
					var link = {
						"linkIdentification":{local_name: "++", short_name: "++"},
						"object":unionClass,
						"subject":subject,
						"isVisited":false,
						"linkType":linkType,
						"isSubQuery":true,
						"isGlobalSubQuery":false,
						"counter":orderCounter
					}
	
					linkTable.push(link);
					linkTableAdded.push(link);
					linkFound = true;
					orderCounter++;
				}
			}
			for(var subLink in abstractTable["linkTable"]){
				linkTable.push(abstractTable["linkTable"][subLink]);
			}
		}
		if(linkFound == false){
			var linkType = "REQUIRED"
			if(where["type"] == "optional") linkType = "OPTIONAL";
			
			//if no link found
			// search for equals nodes in nodeList and parentNodeList
			for(var node in abstractTable["nodeList"]){
				if(typeof nodeList[node] !== 'undefined'){
					for(var classNode in abstractTable["nodeList"][node]["uses"]){
						for(var classParentNode in nodeList[node]["uses"]){

							var link = {
								"linkIdentification":{local_name: "==", short_name: "=="},
								"object":classParentNode,
								"subject":classNode,
								"isVisited":false,
								"linkType":linkType,
								"isSubQuery":true,
								"isGlobalSubQuery":false,
								"counter":orderCounter
							}
							
							linkTable.push(link);
							linkTableAdded.push(link);
							orderCounter++;
						}
					}
				}
			}
			
			// if class from parentNodeList in nodeList dont has attributes, except (select this), and nodeList class has link, relink it to parentNodeList and make subquery
			
			// if no equals nodes found, connect subquery main class, with parent query class, without outgoing links
			// TO DO
		}
		
		var subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"subject", pn);
		
		if(subSelectMainClass == null){
			for(var subClass in abstractTable["classesTable"]){
				subSelectMainClass = subClass;
				break;
			}
		}
		var isNotConnectdClass = true;
		while(isNotConnectdClass == true){
			isNotConnectdClass = false;
			var ct = [];
			for(var cl in abstractTable["classesTable"]){
				ct[cl] = false;
			}
			
			var ct = connectNotConnectedQueryParts(subSelectMainClass, abstractTable["linkTable"], ct);
			for(var cl in ct){
				if(ct[cl] == false){
					isNotConnectdClass = true;
					var link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":cl,
						"subject":subSelectMainClass,
						"isVisited":false,
						"linkType":"REQUIRED",
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"isVariable":false,
						"counter":orderCounter
					}
					linkTable.push(link);
					abstractTable["linkTable"].push(link);
					orderCounter++;
					break;
				}
			}
		}
		
		for(var clazz in abstractTable["classesTable"]){
			
			for(var aggr in abstractTable["classesTable"][clazz]["aggregations"]){
				if(subSelectMainClass != clazz && (typeof nodeList[abstractTable["classesTable"][clazz]["variableName"]]!== "undefined" || (Object.keys(nodeList).length == 1 && typeof nodeList["?[ ]"]!== "undefined"))){
					if(abstractTable["classesTable"][clazz]["aggregations"][aggr]["exp"].indexOf("(.)") !== -1){
						abstractTable["classesTable"][clazz]["aggregations"][aggr]["exp"] = abstractTable["classesTable"][clazz]["aggregations"][aggr]["exp"].replace("(.)", "(" + abstractTable["classesTable"][clazz]["instanceAlias"] + ")")
					} 
					abstractTable["classesTable"][subSelectMainClass]["aggregations"].push(abstractTable["classesTable"][clazz]["aggregations"][aggr])	
				}
			}
		
			if(subSelectMainClass != clazz && (typeof nodeList[abstractTable["classesTable"][clazz]["variableName"]]!== "undefined" || (Object.keys(nodeList).length == 1 && typeof nodeList["?[ ]"]!== "undefined")))abstractTable["classesTable"][clazz]["aggregations"] = null;
			
		}
		
		abstractTable["classesTable"][subSelectMainClass]["orderings"] = abstractTable["orderTable"];
		abstractTable["classesTable"][subSelectMainClass]["groupings"] = abstractTable["groupings"];
		if(typeof abstractTable["classesTable"][subSelectMainClass]["groupings"] === "undefined") abstractTable["classesTable"][subSelectMainClass]["groupings"] = [];
		
		//group
		var group = where["patterns"][0]["group"];
		var variables = where["patterns"][0]["variables"];
		for(var key in group){
			var exp = vq_visual_grammar.parse(group[key]["expression"])["value"];
			var classes = findByVariableName(classesTable, group[key]["expression"]);
			if(Object.keys(classes).length > 0){
				for (var clazz in classes){
					classesTable[clazz]["groupByThis"] = true;
				}
			} 
			else {
				var inSelect = false;
				for(var k in variables){
					if(typeof variables[k] === 'string' && variables[k] == group[key]["expression"]){
						inSelect = true;
					}
				}
				if(inSelect == false) abstractTable["classesTable"][subSelectMainClass]["groupings"].push(exp); 
			}

		}
	
		abstractTable["classesTable"][subSelectMainClass]["graphs"] = abstractTable["fromTable"];
		if(typeof where["patterns"][0]["limit"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["limit"] =  where["patterns"][0]["limit"];
		if(typeof where["patterns"][0]["offset"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["offset"] =  where["patterns"][0]["offset"];
		if(typeof where["patterns"][0]["distinct"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["distinct"] =  where["patterns"][0]["distinct"];
		
		abstractTable["classesTable"][subSelectMainClass]["serviceLabelLang"] = abstractTable["serviceLabelLang"];
		abstractTable["classesTable"][subSelectMainClass]["fullSPARQL"] = abstractTable["fullSPARQL"];
		
		for(var subClass in abstractTable["classesTable"]){
			if(typeof classesTable[subClass] === 'undefined')classesTable[subClass] = abstractTable["classesTable"][subClass];
		}
	}
	
	if(where["type"] == "group" && typeof where["patterns"][0]["queryType"] === "undefined"){
		var patterns = where["patterns"];
		var tempN = await collectNodeList(where["patterns"]);
		var nodeListTemp = tempN["nodeList"];						
		
		for(var groupPattern in patterns){	
			if(typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] == "bgp"){
				var wherePartTemp = await parseSPARQLjsStructureWhere(patterns[groupPattern], nodeListTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);						
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
			}
		}
					
		for(var groupPattern in patterns){	
			if(typeof patterns[groupPattern]["type"] === "undefined" || (typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] !== "bgp")){
				var wherePartTemp = await parseSPARQLjsStructureWhere(patterns[groupPattern], nodeListTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
			}
		}
	}
	
	// type = minus
	if(where["type"] == "minus"){
		
		var patterns = where["patterns"];
		var nodeLitsTemp = [];
		var parenNodeLitsTemp;
		if(patterns.length > 1 || (patterns.length == 1 && typeof patterns[0].type !== "undefined" && patterns[0].type == "bgp")){
			parenNodeLitsTemp = nodeList;
			var collectNodeListTemp  = await collectNodeList(patterns, true);
			var temp  = collectNodeListTemp["nodeList"];
			for(var node in temp){
				nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
			}
		} else {
			nodeLitsTemp = nodeList;
			parenNodeLitsTemp = parentNodeList;
		}
			
		var classTableTemp = [];
		var linkTableTemp = [];
		var directClassMembershipRoleTemp = directClassMembershipRole;
		if(patterns.length == 1 && typeof patterns[0].type !== "undefined" && patterns[0].type == "bgp" && patterns[0].triples.length == 1 && patterns[0].triples[0].predicate == directClassMembershipRole){
			directClassMembershipRole = "";
		}
		

		for(var pattern in patterns){
			if(typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] == "bgp"){
				var temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp, parenNodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, selectVariables, "optionalLink", allClasses, variableList, "minus", bindTable, generateOnlyExpression);
				classesTable = temp["classesTable"];
				for(var clazz in temp["classTableAdded"]){
					classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
				}
				attributeTable = temp["attributeTable"];
				filterTable = temp["filterTable"];
				linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
				classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
				attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
				linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
				bindTable = temp["bindTable"];
			}
		}
		
		for(var pattern in patterns){
			if(typeof patterns[pattern]["type"] === "undefined" || (typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] !== "bgp")){
				var temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp, parenNodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, selectVariables, "optionalLink", allClasses, variableList, "minus", bindTable, generateOnlyExpression);
				classesTable = temp["classesTable"];
				for(var clazz in temp["classTableAdded"]){
					classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
				}
				attributeTable = temp["attributeTable"];
				filterTable = temp["filterTable"];
				linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
				classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
				attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
				linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
				bindTable = temp["bindTable"];
			}
		}
		if(patterns.length == 1 && typeof patterns[0].type !== "undefined" && patterns[0].type == "bgp" && patterns[0].triples.length == 1 && patterns[0].triples[0].predicate == directClassMembershipRole){
			directClassMembershipRole = directClassMembershipRoleTemp;
		}
		
		if(patterns.length > 1){
			//find links outside subquery
			for(var link in linkTableAdded){
				for(var node in parenNodeLitsTemp){
					if(typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["subject"]] !== 'undefined' || typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["object"]] !== 'undefined'){
						linkTableAdded[link]["isGlobalSubQuery"] = true;
						linkTableAdded[link]["linkType"] = "NOT";
						break;
					}
				}
			}
		}
		if(patterns.length == 1 && typeof patterns[0].type !== "undefined" && patterns[0].type == "bgp"){
			//find links outside subquery
			for(var link in linkTableAdded){
				for(var node in parenNodeLitsTemp){
					if(typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["subject"]] !== 'undefined' || typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["object"]] !== 'undefined'){
						linkTableAdded[link]["isGlobalSubQuery"] = true;
						linkTableAdded[link]["linkType"] = "NOT";
						break;
					}
				}
			}
		}
		
		linkTable = linkTable.concat(linkTableAdded);
	}

	return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, viziQuerExpr:viziQuerExpr, attributeTableAdded:attributeTableAdded, bindTable:bindTable};
}


function findClassToConnect(classesTable, linkTable, nodeList, type, parentNode){
	
	if(typeof parentNode !== "undefined" && parentNode != null){
			for(var p in parentNode["uses"]){
			for(var link in linkTable){
				if(linkTable[link]["subject"] == p){
					return linkTable[link]["object"];
				};
				if(linkTable[link]["object"] == p){
					return linkTable[link]["subject"];
				}
			}
		}
	}
	if(nodeList != null){
		for(var node in nodeList){
			for(var clazz in nodeList[node]["uses"]){
				var linkFound = false;
				for(var link in linkTable){
					if(linkTable[link][type] == clazz){
						linkFound = true;
						break;
					}
				}
				if(linkFound == false) return clazz;
			}
		}
	} else{
		for(var clazz in classesTable){
			if(typeof classesTable[clazz]["aggregations"] !== 'undefined') return clazz;
		}
		// for class table
		for(var clazz in classesTable){
			var linkFound = false;
			// for link table
			for(var link in linkTable){
				// if link table in subquect or object (based on type parameter) are equal to class, class is not the one
				if(linkTable[link][type] == clazz){
					linkFound = true;
					break;
				}
			}
			if(linkFound == false)  return clazz;
		}
	}
	return null;
}

function findClassToConnectUNIT(classesTable, linkTable, nodeList, type){
	if(nodeList != null){
		for(var node in nodeList){
			for(var clazz in nodeList[node]["uses"]){
				var linkFound = false;
				for(var link in linkTable){
					if(linkTable[link][type] == clazz){
						linkFound = true;
						break;
					}
				}
				if(linkFound == false) return clazz;
			}
		}
	} else{
		for(var clazz in classesTable){
			if(typeof classesTable[clazz]["aggregations"] !== 'undefined') return clazz;
		}
		for(var clazz in classesTable){
			var linkFound = false;
			for(var link in linkTable){
				if(linkTable[link][type] == clazz){
					linkFound = true;
					break;
				}
			}
			
			if(linkFound == false) return clazz;
		}
	}
	return null;
}

function findClassToConnectUnion(classesTable,parentClassesTable, linkTable, nodeList, type){
	if(nodeList != null){
		for(var node in nodeList){
			for(var clazz in nodeList[node]["uses"]){
				var linkFound = false;
				for(var link in linkTable){
					if(linkTable[link][type] == clazz){
						linkFound = true;
						break;
					}
				}
				if(linkFound == false) return clazz;
			}
		}
	} else{
		for(var clazz in classesTable){
			var linkFound = false;
			var fromParantClass = false;
			for(var pClazz in parentClassesTable){
						if(parentClassesTable[pClazz]["variableName"] == classesTable[clazz]["variableName"]){
							fromParantClass = true;
							break;
						}
					}
			for(var link in linkTable){
				if(linkTable[link][type] == clazz){
					linkFound = true;
					break;
				}
			}
			if(linkFound == false && fromParantClass == false) {return clazz;}
		}
	}
	return null;
}

function createNodeListInstance(nodeList, nodeName){
	var nodeListInstance = {};
	if(typeof nodeList[nodeName] === 'undefined'){
		return {count:1, uses:[]}
	} else{
		nodeListInstance = nodeList[nodeName];
		nodeListInstance["count"] = nodeListInstance["count"]+1;
	}
	return nodeListInstance;
}

function concatNodeListInstance(nodeList, nodeName, nodeInstance){
	var nodeListInstance = {};
	if(typeof nodeList[nodeName] === 'undefined'){
		return {count:nodeInstance["count"], uses:[]}
	} else{
		nodeListInstance = nodeList[nodeName];
		nodeListInstance["count"] = nodeListInstance["count"]+nodeInstance["count"];
	}
	return nodeListInstance;
}

// Create a list of nodes in a current query scope 
async function collectNodeList(whereAll, propUnderOptional){
  var nodeList = [];
  var selectStarList = [];
  for(var key in whereAll){
	var where = whereAll[key];
	//type=bgp
	if(where["type"] == "bgp"){
		var triples = where["triples"];
		// var schema = new VQ_Schema();
		for(var triple in triples){
			if(vq_visual_grammar.parse(triples[triple]["subject"])["type"] == "varName") selectStarList.push(triples[triple]["subject"]);
			if(vq_visual_grammar.parse(triples[triple]["object"])["type"] == "varName") selectStarList.push(triples[triple]["object"]);
			if(typeof triples[triple]["predicate"] === "string" && vq_visual_grammar.parse(triples[triple]["predicate"])["type"] == "varName") selectStarList.push(triples[triple]["predicate"]);

			//class definitions
			if(triples[triple]["predicate"] == directClassMembershipRole){
				nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
			} else{
				//if class without definition
				//from data property
				var propertyResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]});
				if(propertyResolved.complete == true && propertyResolved.data[0].data_cnt > 0 && propertyResolved.data[0].object_cnt == 0){
					//subjest
					nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
					//object, dataproperty as objectproperty
					if(propUnderOptional != null && propUnderOptional == true) nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
				}
				//from object property
				else if(propertyResolved.complete == true && propertyResolved.data[0].object_cnt > 0){
					//subjest
					nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
					//object
					nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
				}
				//from property path
				else if(typeof triples[triple]["predicate"] === "object" && triples[triple]["predicate"]["type"] == "path"){
					
					var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
					if(typeof last_element == "object"){
						last_element = last_element["items"][last_element["items"].length - 1];
					}
					var pathPropertyResolved = await dataShapes.resolvePropertyByName({name: last_element});
						
					// object property
					if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt > 0){
						//subjest
						nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
						//object
						nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
					}
					// data property
					if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt == 0 && pathPropertyResolved.data[0].data_cnt > 0){
						//subjest
						nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
					}
					// not in schema, use as object property
					if(pathPropertyResolved.complete == false){
						//subjest
						nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
						//object
						nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
					}
				}
				//from property not in a schema
				else if(propertyResolved.complete != true){
					//subjest
					nodeList[triples[triple]["subject"]] = createNodeListInstance(nodeList, triples[triple]["subject"]);
					//object
					nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
				}
			}
		}
	}
	//bind
	if(where["type"] == "bind"){
		selectStarList.push(where["variable"])
	}
	
	//sub select
	if(where["type"] == "group" && where["patterns"].length == 1 && where["patterns"][0]["type"] == "query"){	
		for(var sel in where["patterns"][0]["variables"]){
			selectStarList.push(where["patterns"][0]["variables"][sel]);
		}
	}
	
	//type=optional
	if(where["type"] == "optional"){
		var patterns = where["patterns"];
		var optionalDataPropAsObjectProp = false;
		for(var pattern in patterns){
			if(typeof patterns[pattern]["type"] !== 'undefined' && patterns[pattern]["type"] != "bgp") optionalDataPropAsObjectProp = true;
		}
		var temp = await collectNodeList(patterns, optionalDataPropAsObjectProp);
		var tempNode = temp["nodeList"];
		for(var node in tempNode){
			nodeList[node] = concatNodeListInstance(nodeList, node, tempNode[node]);
		}
		selectStarList = selectStarList.concat(temp["selectStarList"]);
	}
  }
  return {"nodeList":nodeList, "selectStarList":selectStarList}
}

function findAttributeInAttributeTable(attributeTable, parsedVariableName, variableName, identification){
	//attributes are the same if  equals variableName, identification is null or identification short_name are the equals
	for(var a in attributeTable){
		var attribute = attributeTable[a]
		if(a.startsWith(parsedVariableName) && attribute["variableName"] == variableName &&
		((typeof identification === 'undefined' && typeof attributeTable["identification"] === 'undefined') || 
		(typeof identification !== 'undefined' && typeof attributeTable["identification"] !== 'undefined' && identification["short_name"] == attributeTable["identification"]["short_name"]))) return attribute;
	}
	return null;
}

function findClassInClassTable(classesTable, parsedVariableName, variableName, nodeList, identification){
	//classes are the same if  equals variableName, 
	// identifications are null or identifications short_name are equals or (classesTable identification is not emprty and identification is empty)
	for(var c in classesTable){
		var clazz = classesTable[c];
		if(c.startsWith(parsedVariableName) && clazz["variableName"] == variableName &&
		((typeof identification === 'undefined' && (typeof clazz["identification"] === 'undefined' || clazz["identification"] == null)) || 
		(typeof identification !== 'undefined' && (typeof clazz["identification"] !== 'undefined' && clazz["identification"] != null) && identification["short_name"] == clazz["identification"]["short_name"]) ||
		(typeof identification === 'undefined' && (typeof clazz["identification"] !== 'undefined' && clazz["identification"] != null)))) return clazz;
		
		if(c.startsWith(parsedVariableName) && clazz["variableName"] == variableName &&
		(typeof identification !== 'undefined' && (typeof clazz["identification"] === 'undefined' || clazz["identification"] == null))) return "addToClass";
	}
	return null;
}

function findByVariableName(classesTable, variableName){
	var classes = [];
	for(var c in classesTable){
		var clazz = classesTable[c]
		if(clazz["variableName"] == variableName) classes[c]=clazz;
	}
	return classes;
}

function findByShortName(classesTable, variableName){
	var classes = [];
	for(var c in classesTable){
		var clazz = classesTable[c]
		if(typeof clazz["identification"] !== "undefined" && clazz["identification"] != null && clazz["identification"]["notInSchema"] == "variable" && clazz["identification"]["short_name"] == variableName) classes[c]=clazz;
	}
	return classes;
}

async function generateTypebgp(triples, nodeList, parentNodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList){
	var linkTableAdded = [];
	var classTableAdded = [];
	var attributeTableAdded = [];
	var filterTable = [];

	
	for(var triple in triples){
		//class definitions
		if((triples[triple]["predicate"] == directClassMembershipRole) && typeof allClasses[triples[triple]["subject"]] === 'undefined' && !triples[triple]["object"].startsWith("_:b")
			&& typeof variableList[triples[triple]["object"]+"Label"] === "undefined" && typeof variableList[triples[triple]["object"]+"AltLabel"] === "undefined" && typeof variableList[triples[triple]["object"]+"Description"] === "undefined"){
			var instanceAlias = null;
			//var classResolvedR = await dataShapes.resolveClassByName({name: triples[triple]["object"]});
			var classResolvedR = await dataShapes.resolveClassByName({name: triples[triple]["object"]});
	
			var classResolved = null;
			if(classResolvedR.complete == true) {
				classResolved = classResolvedR.data[0];

				var sn = classResolved.display_name;
				if(schemaName == "wikidata" && classResolved.prefix == "wd"){}
				else if(classResolved.is_local != true)sn = classResolved.prefix+ ":" + sn;
				classResolved.short_name = sn;			
			}
			var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"]);
			
			if(classResolvedR.complete == true && classResolved["local_name"] != subjectNameParsed["value"]){
				instanceAlias = subjectNameParsed["value"];
				if(subjectNameParsed["type"] == "iri") instanceAlias = await generateInstanceAlias(instanceAlias);
			}
	
			if(classResolvedR.complete == false){
				var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"])["value"];
				
				var className = await generateInstanceAlias(objectNameParsed);

				if(triples[triple]["object"].startsWith("?")) {
					className = triples[triple]["object"];
					classResolved = {
						"short_name":"?"+className,
						"display_name":"?"+className,
						"local_name":"?"+className,
						"URI":triples[triple]["object"],
						"notInSchema": "variable"
					}
				} else {
					classResolved = {
						"short_name":className,
						"display_name":className,
						"local_name":className,
						"URI":triples[triple]["object"],
						"notInSchema": "true"
					}
				}
				instanceAlias = subjectNameParsed["value"].replace(/\\,/g, ",");
				if(instanceAlias.indexOf("://") !== -1) instanceAlias = await generateInstanceAlias(instanceAlias);
			}
			if(instanceAlias != null) instanceAlias = instanceAlias.replace(/\\,/g, ",");
			
			if(typeof classesTable[subjectNameParsed["value"]] === 'undefined'){
				if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
					if(typeof allClasses[subjectNameParsed["value"]] === 'undefined'){
						// If class first time used in a query – create new class box
						 // console.log("CLASS 1", subjectNameParsed["value"], classResolved, instanceAlias);
						classesTable[subjectNameParsed["value"]] = {
							"variableName":triples[triple]["subject"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};
						classTableAdded.push(subjectNameParsed["value"]);
						
						nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed["value"]] = "class";
					} else {
						// If class defined in all query scope (higher than a parent scope) - create new class box with different identification.
						 // console.log("CLASS 2", subjectNameParsed["value"]);
						classesTable[subjectNameParsed["value"]+counter] = {
							"variableName":triples[triple]["subject"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};
						classTableAdded.push(subjectNameParsed["value"]+counter);
						nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed["value"]+counter] = "class";
						counter++;
					}
				} else {
					// if class defined in a parent scope
					//create new class if identification short name not equals, or parrent class identification is missing
					// else copy class from parrent
					var createClass = true;
					for(var use in parentNodeList[triples[triple]["subject"]]["uses"]){
						if(typeof allClasses[use] !== 'undefined'
							&& allClasses[use]["identification"] != null 
							&& allClasses[use]["identification"]["short_name"] == classResolved["short_name"]
						){
							createClass = use;
							break;
						}
					}
					if(createClass == true){
						// console.log("CLASS 3", subjectNameParsed["value"]);
						classesTable[subjectNameParsed["value"]+counter] = {
							"variableName":triples[triple]["subject"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};
						classTableAdded.push(subjectNameParsed["value"]+counter);
						nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed["value"]+counter] = "class";
						counter++;
					} else if(nodeList[triples[triple]["subject"]]["count"] > 1){
						// if class used more than once, copy class from parent scope (to decide later whether to build a new class box or not)
						// console.log("CLASS 4", subjectNameParsed["value"]);
						classesTable[createClass] = {
							"variableName":triples[triple]["subject"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false
						};
						classTableAdded.push(createClass);
						nodeList[triples[triple]["subject"]]["uses"][createClass] = "class";
					}
				}
			} else {
				var createClass = true;
				// if class is defined without identification (from object/data property)
				var addToClass = false;
				
				for(var use in nodeList[triples[triple]["subject"]]["uses"]){
					if(typeof classesTable[use] !== 'undefined'
							&& classesTable[use]["identification"] != null 
							&& classesTable[use]["identification"]["short_name"] == classResolved["short_name"]
					){
						createClass = false;
					} else if(typeof classesTable[use] !== 'undefined' && classesTable[use]["identification"] == null) {
						addToClass = use;
						createClass = false;
					}
				}
				// If more than one class within same scope uses the same name, create different class box for each.
				if(createClass == true && nodeList[triples[triple]["subject"]]["count"] > 1){
					// console.log("CLASS 5", subjectNameParsed["value"], nodeList[triples[triple]["subject"]]);
					classesTable[subjectNameParsed["value"]+counter] = {
						"variableName":triples[triple]["subject"],
						"identification":classResolved,
						"instanceAlias":instanceAlias,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false
					};
					classTableAdded.push(subjectNameParsed["value"]+counter);
					nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed["value"]+counter] = "class";
					counter++;
				}
				// 	If class earlier was defined without identification (from object/data property) - add identification to existing class
				if(addToClass != false){
					// console.log("CLASS 6", addToClass);
					classesTable[addToClass]["identification"] = classResolved;
				}
				if(addToClass == false && createClass == true && typeof parentNodeList[triples[triple]["subject"]] !== "undefined" && typeof nodeList[triples[triple]["subject"]] !== "undefined" && nodeList[triples[triple]["subject"]]["count"] <=1){
					classesTable[subjectNameParsed["value"]+counter] = {
						"variableName":triples[triple]["subject"],
						"identification":classResolved,
						"instanceAlias":instanceAlias,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false
					};
					classTableAdded.push(subjectNameParsed["value"]+counter);
					nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed["value"]+counter] = "class";
					counter++;
					// console.log("CLASS 6a", addToClass)
				}
			}
		} else{
			//if class without definition
			//from data property
			var propertyResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]});
			if(propertyResolved.complete == true) {
				//propertyResolved.data[0].short_name = propertyResolved.data[0].prefix + ":" + propertyResolved.data[0].display_name;
				var sn = propertyResolved.data[0].display_name;
				if(schemaName == "wikidata" && propertyResolved.data[0].prefix == "wdt"){}
				else if(propertyResolved.data[0].is_local != true)sn = propertyResolved.data[0].prefix+ ":" + sn;
				propertyResolved.data[0].short_name = sn;
			}
			
			if(propertyResolved.complete == true && propertyResolved.data[0].object_cnt == 0 && propertyResolved.data[0].data_cnt > 0 && bgptype != "optionalLink" && vq_visual_grammar.parse(triples[triple]["object"])["type"] != "iri"){
				//subjest
				var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"])["value"];
				
				var instanceAlias = await generateInstanceAlias(subjectNameParsed);
		
				if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0){
					// if not in parent query part
					if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
						if(typeof allClasses[subjectNameParsed] === 'undefined'){
							// If first time used in a query – create new class box.
							// console.log("CLASS DP 22", subjectNameParsed, allClasses, classesTable);
							classesTable[subjectNameParsed] = {
								"variableName":triples[triple]["subject"],
								"identification":null,
								"instanceAlias":instanceAlias,
								"isVariable":false,
								"isUnit":false,
								"isUnion":false
							};
							classTableAdded.push(subjectNameParsed);
							nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "dataProperty";
							
						} else {
							// If defined in all query scope (two or more scope level up) - create new class box with different identification.
							classesTable[subjectNameParsed+counter] = {
								"variableName":triples[triple]["subject"],
								"identification":null,
								"instanceAlias":instanceAlias,
								"isVariable":false,
								"isUnit":false,
								"isUnion":false
							};
							classTableAdded.push(subjectNameParsed+counter);
							nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "dataProperty";
							counter++;
							// console.log("CLASS DP 23", subjectNameParsed, subjectNameParsed+counter);
						}
					} else {
						// If class defined in a parent scope
						for(var use in parentNodeList[triples[triple]["subject"]]["uses"]){
							if(typeof classesTable[use] === 'undefined'){
								classesTable[use] = {
									"variableName":triples[triple]["subject"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(use);
								nodeList[triples[triple]["subject"]]["uses"][use] = "dataProperty";
								// console.log("CLASS OP 24a", subjectNameParsed, classesTable, parentNodeList, nodeList);
							} else if(vq_visual_grammar.parse(triples[triple]["object"])["type"] == "RDFLiteral" || vq_visual_grammar.parse(triples[triple]["object"])["type"] == "string") {
							// } else {
									classesTable[subjectNameParsed+counter] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed+counter);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OP 24b", subjectNameParsed, classesTable, parentNodeList, nodeList);
								}
						}
						// console.log("CLASS DP 24", subjectNameParsed, classTableAdded, classesTable, allClasses);
						nodeList[triples[triple]["subject"]]["uses"] = parentNodeList[triples[triple]["subject"]]["uses"];
					}
				} 
				
				
			}
			//from object property path
			else if(typeof triples[triple]["predicate"] === "object" && triples[triple]["predicate"]["type"] == "path"){
				
				var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
				if(typeof last_element == "object"){
						last_element = last_element["items"][last_element["items"].length - 1];
				}
				var pathPropertyResolved = await dataShapes.resolvePropertyByName({name: last_element});
				if(pathPropertyResolved.complete == true) {
					// pathPropertyResolved.data[0].short_name = pathPropertyResolved.data[0].prefix + ":" + pathPropertyResolved.data[0].display_name;
					var sn = pathPropertyResolved.data[0].display_name;
					if(schemaName == "wikidata" && pathPropertyResolved.data[0].prefix == "wdt"){}
					else if(pathPropertyResolved.data[0].is_local != true)sn = pathPropertyResolved.data[0].prefix+ ":" + sn;
					pathPropertyResolved.data[0].short_name = sn;
				}

				// last element == OP
				if((pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt >0) || pathPropertyResolved.complete == false || schemaName == "wikidata"){
					//subjest
					var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"])["value"];
					
					var instanceAlias = await generateInstanceAlias(subjectNameParsed);
					
						if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0){
							if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
								if(typeof allClasses[subjectNameParsed] === 'undefined'){
									classesTable[subjectNameParsed] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
									// console.log("CLASS OPP 16a", subjectNameParsed);
								} else {
									classesTable[subjectNameParsed+counter] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed+counter);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OPP 17a", subjectNameParsed);
								}
							} else {
								nodeList[triples[triple]["subject"]]["uses"] = parentNodeList[triples[triple]["subject"]]["uses"];
								// console.log("CLASS OPP 18a", subjectNameParsed);
							}
						} 
					if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0) nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
					
					var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
				
					if(objectNameParsed["type"] != "number" && objectNameParsed["type"] != "string" && objectNameParsed["type"] != "RDFLiteral"){
						objectNameParsed = objectNameParsed["value"];
						if(typeof nodeList[triples[triple]["object"]] === "undefined" || Object.keys(nodeList[triples[triple]["object"]]["uses"]).length == 0 || triples[triple]["subject"].startsWith("_:b")){
							if(typeof nodeList[triples[triple]["object"]] === "undefined") nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
							var instanceAlias = await generateInstanceAlias(objectNameParsed);
							
							if(typeof parentNodeList[triples[triple]["object"]] === 'undefined'){
		
								if(typeof allClasses[objectNameParsed] === 'undefined'){
									classesTable[objectNameParsed] = {
										"variableName":triples[triple]["object"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(objectNameParsed);
									nodeList[triples[triple]["object"]]["uses"][objectNameParsed] = "objectProperty";
									// console.log("CLASS OPP 13", objectNameParsed);
								} else {
									classesTable[objectNameParsed+counter] = {
										"variableName":triples[triple]["object"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(objectNameParsed+counter);
									nodeList[triples[triple]["object"]]["uses"][objectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OPP 14", objectNameParsed);
								}
							} else {
								
								var commonClass = "";
								for(var nClass in nodeList){
									if(typeof parentNodeList[nClass] !== "undefined"){
										commonClass = nClass;
										break;
									}
								}
								var isNotUnionClass = true;
								for(var use in parentNodeList[triples[triple]["object"]]["uses"]){
									if(typeof classesTable[use] === 'undefined'){
										classesTable[use] = {
											"variableName":triples[triple]["object"],
											"identification":null,
											"instanceAlias":instanceAlias,
											"isVariable":false,
											"isUnit":false,
											"isUnion":false
										};
										classTableAdded.push(use);
										nodeList[triples[triple]["object"]]["uses"][use] = "dataProperty";
									} else if(isUnderUnion == true && commonClass !== "" && use != commonClass){
										
										classesTable[use+counter] = {
											"variableName":triples[triple]["object"],
											"identification":null,
											"instanceAlias":instanceAlias,
											"isVariable":false,
											"isUnit":false,
											"isUnion":false
										};
										classTableAdded.push(use+counter);
										nodeList[triples[triple]["object"]]["uses"][use+counter] = "objectProperty";
										counter++;
										isNotUnionClass = false;
										// console.log("CLASS OPP 15a", objectNameParsed, nodeList[triples[triple]["object"]], parentNodeList[triples[triple]["object"]]);
									}
							  }	
								// console.log("CLASS OPP 15", objectNameParsed, nodeList[triples[triple]["object"]], parentNodeList[triples[triple]["object"]]);
								if(isNotUnionClass)nodeList[triples[triple]["object"]]["uses"] = parentNodeList[triples[triple]["object"]]["uses"];
							}
						} 
					}
					////////////////////////////////////////////////////////////////////////////////////////////////////////
				}
				// last element == DP
				if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].data_cnt >0 && pathPropertyResolved.data[0].object_cnt == 0){
					//subjest	
					var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"])["value"];
					var instanceAlias = await generateInstanceAlias(subjectNameParsed);
						if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0){
							if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
								if(typeof allClasses[subjectNameParsed] === 'undefined'){
									classesTable[subjectNameParsed] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
									// console.log("CLASS OPP 16", subjectNameParsed);
								} else {
									classesTable[subjectNameParsed+counter] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed+counter);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OPP 17", subjectNameParsed);
								}
							} else {
								nodeList[triples[triple]["subject"]]["uses"] = parentNodeList[triples[triple]["subject"]]["uses"];
								// console.log("CLASS OPP 18", subjectNameParsed);
							}
						} 
					if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0) nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
				}
			}
			//from object property
			else {//if(schema.resolveLinkByName(triples[triple]["predicate"]) != null || bgptype == "optionalLink"){
				//subjest
				var subjectNameParsed = vq_visual_grammar.parse(triples[triple]["subject"]);
				
				if(subjectNameParsed["type"] != "number" && subjectNameParsed["type"] != "string" && subjectNameParsed["type"] != "RDFLiteral"){
					subjectNameParsed = subjectNameParsed["value"];
					if(Object.keys(nodeList[triples[triple]["subject"]]["uses"]).length == 0){
						var instanceAlias = await generateInstanceAlias(subjectNameParsed);
						if(typeof parentNodeList[triples[triple]["subject"]] === 'undefined'){
							if(typeof allClasses[subjectNameParsed] === 'undefined'){
								classesTable[subjectNameParsed] = {
									"variableName":triples[triple]["subject"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(subjectNameParsed);
								nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed] = "objectProperty";
								// console.log("CLASS OP 10", subjectNameParsed);
							} else {
								classesTable[subjectNameParsed+counter] = {
									"variableName":triples[triple]["subject"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(subjectNameParsed+counter);
								nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "objectProperty";
								counter++;
								// console.log("CLASS OP 11", subjectNameParsed);
							}
						} else {
							for(var use in parentNodeList[triples[triple]["subject"]]["uses"]){
								if(typeof classesTable[use] === 'undefined'){
									classesTable[use] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(use);
									nodeList[triples[triple]["subject"]]["uses"][use] = "dataProperty";
									// console.log("CLASS OP 12", subjectNameParsed, classesTable, parentNodeList, nodeList);
								} else if(vq_visual_grammar.parse(triples[triple]["object"])["type"] == "RDFLiteral" || vq_visual_grammar.parse(triples[triple]["object"])["type"] == "string") {
									classesTable[subjectNameParsed+counter] = {
										"variableName":triples[triple]["subject"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(subjectNameParsed+counter);
									nodeList[triples[triple]["subject"]]["uses"][subjectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OP 12a", subjectNameParsed, classesTable, parentNodeList, nodeList);
								}
							}
							nodeList[triples[triple]["subject"]]["uses"] = parentNodeList[triples[triple]["subject"]]["uses"];	
						}
					}
				} 
				
				//object
				var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
				
				if(objectNameParsed["type"] != "number" && objectNameParsed["type"] != "string" && objectNameParsed["type"] != "RDFLiteral"){
					objectNameParsed = objectNameParsed["value"];
					if(typeof nodeList[triples[triple]["object"]] === "undefined" || Object.keys(nodeList[triples[triple]["object"]]["uses"]).length == 0 || triples[triple]["subject"].startsWith("_:b")){
						if(typeof nodeList[triples[triple]["object"]] === "undefined") nodeList[triples[triple]["object"]] = createNodeListInstance(nodeList, triples[triple]["object"]);
						var instanceAlias = await generateInstanceAlias(objectNameParsed);
						
						if(typeof parentNodeList[triples[triple]["object"]] === 'undefined'){
	
							if(typeof allClasses[objectNameParsed] === 'undefined'){
								classesTable[objectNameParsed] = {
									"variableName":triples[triple]["object"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(objectNameParsed);
								nodeList[triples[triple]["object"]]["uses"][objectNameParsed] = "objectProperty";
								// console.log("CLASS OP 13", objectNameParsed);
							} else {
								classesTable[objectNameParsed+counter] = {
									"variableName":triples[triple]["object"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false
								};
								classTableAdded.push(objectNameParsed+counter);
								nodeList[triples[triple]["object"]]["uses"][objectNameParsed+counter] = "objectProperty";
								counter++;
								// console.log("CLASS OP 14", objectNameParsed);
							}
						} else {
							
							var commonClass = "";
							for(var nClass in nodeList){
								if(typeof parentNodeList[nClass] !== "undefined"){
									commonClass = nClass;
									break;
								}
							}
							var isNotUnionClass = true;
							for(var use in parentNodeList[triples[triple]["object"]]["uses"]){
								if(typeof classesTable[use] === 'undefined'){
									classesTable[use] = {
										"variableName":triples[triple]["object"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(use);
									nodeList[triples[triple]["object"]]["uses"][use] = "dataProperty";
								} else if(isUnderUnion == true && commonClass !== "" && use != commonClass){
									
									classesTable[use+counter] = {
										"variableName":triples[triple]["object"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false
									};
									classTableAdded.push(use+counter);
									nodeList[triples[triple]["object"]]["uses"][use+counter] = "objectProperty";
									counter++;
									isNotUnionClass = false;
									// console.log("CLASS OP 15a", objectNameParsed, nodeList[triples[triple]["object"]], parentNodeList[triples[triple]["object"]]);
								}
						  }	
							// console.log("CLASS OP 15", objectNameParsed, nodeList[triples[triple]["object"]], parentNodeList[triples[triple]["object"]]);
							if(isNotUnionClass)nodeList[triples[triple]["object"]]["uses"] = parentNodeList[triples[triple]["object"]]["uses"];
						}
					} 
				}
			}
			
		}
	}

	for(var triple in triples){ 
		if((triples[triple]["predicate"] != directClassMembershipRole) || ((triples[triple]["predicate"] == directClassMembershipRole) && triples[triple]["object"].startsWith("_:b")) ||
		typeof variableList[triples[triple]["object"]+"Label"] !== "undefined" || typeof variableList[triples[triple]["object"]+"AltLabel"] !== "undefined" || typeof variableList[triples[triple]["object"]+"Description"] !== "undefined"){
			
			//data property
			var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
			var attributeResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]});

			if(attributeResolved.complete == true) {
				
				var sn = attributeResolved.data[0].display_name;
				if(schemaName == "wikidata" && attributeResolved.data[0].prefix == "wdt"){}
				else if(attributeResolved.data[0].is_local != true)sn = attributeResolved.data[0].prefix+ ":" + sn;
				attributeResolved.data[0].short_name = sn;
			}
			if(typeof triples[triple]["predicate"] == "string" && (objectNameParsed["type"] == "number" || objectNameParsed["type"] == "string" || objectNameParsed["type"] == "RDFLiteral") 
			||( bgptype != "optionalLink" 
			&& Object.keys(findByVariableName(classesTable, triples[triple]["subject"])).length > 0 
			&& Object.keys(findByVariableName(classesTable, triples[triple]["object"])).length == 0 
			&& Object.keys(findByVariableName(classesTable, vq_visual_grammar.parse(triples[triple]["object"])["value"])).length == 0 
		    && vq_visual_grammar.parse(triples[triple]["object"])["type"] != "iri"
			//&& schema.resolveAttributeByName(null, triples[triple]["predicate"]) != null && await dataShapes.resolveClassByName({name: vq_visual_grammar.parse(triples[triple]["object"])["value"]}) == null)){
			&& attributeResolved.complete == true && attributeResolved.data[0].data_cnt > 0 && attributeResolved.data[0].object_cnt == 0 && await dataShapes.resolveClassByName({name: vq_visual_grammar.parse(triples[triple]["object"])["value"]}).complete != true)){
				 // console.log("DATA PROPERTY", triples[triple]);
				var alias = "";
				var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);

				// filter as triple
				if(objectNameParsed["type"] == "number" || objectNameParsed["type"] == "string" || objectNameParsed["type"] == "RDFLiteral"){
					exprVariables = [];
					var attrName;
					if(attributeResolved.complete == true) attrName = attributeResolved.data[0]["short_name"];
					else attrName = await generateInstanceAlias(triples[triple]["predicate"]);
					
					if(attrName.indexOf("://") != -1) attrName = "<" + attrName + ">";
					
					exprVariables.push(attrName);
					
					filterTable.push({filterString:attrName+ " = " + objectNameParsed["value"], filterVariables:exprVariables});
					
					var classes = findByVariableName(classesTable, triples[triple]["subject"]);
					
					for (var clazz in classes){
						if(classTableAdded.indexOf(clazz) !== -1){
							if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
							classesTable[clazz]["conditions"].push(attrName+ " = " + objectNameParsed["value"]);
							break;
						}
					}
				} else{
						
					//id identification.localName not equeals to subject - use alias
					if(attributeResolved.data[0]["local_name"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
	
					var requireValues = true;
					if(bgptype == "optional") requireValues = false;
					
					var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];

					for(var sclass in subjectClasses){
						var createAttribute = true;
						//var schema = new VQ_Schema();
						// if class is in the schema, class does not have given attribute -> do not add attribute to this class
						if (classesTable[sclass]["identification"] != null && Object.keys(subjectClasses).length>1) {
							
							var resolvePropertyByNameAndClass = await dataShapes.checkProperty ({name:classesTable[sclass]["identification"]["iri"], propertyName: triples[triple]["predicate"]})
							if(resolvePropertyByNameAndClass.data.length == 0) createAttribute = false
							// var all_attributes = schema.findClassByName(classesTable[sclass]["identification"]["short_name"]).getAllAttributes();

							// attributeInClass = false;
							// for(var attribute in all_attributes){
								// if(all_attributes[attribute]["short_name"] == attributeResolved.data[0]["short_name"]){
									// attributeInClass = true;
									// break;
								// }
							// }
							// if(attributeInClass == false) createAttribute = false;
						};

						if(createAttribute == true){
							if(typeof attributeTable[objectNameParsed["value"]] === 'undefined'){
								attributeTable[objectNameParsed["value"]] = {
									"class":sclass,
									"variableName":objectNameParsed["value"],
									"identification":attributeResolved.data[0],
									"alias":alias,
									"requireValues":requireValues,
									"seen":false,
									"counter":orderCounter
								};
								attributeTableAdded.push(objectNameParsed["value"]);
								orderCounter++;
							} else if(findAttributeInAttributeTable(attributeTable, objectNameParsed["value"], triples[triple]["object"], attributeResolved.data[0]) == null){
								
								attributeTable[objectNameParsed["value"]+counter] = {
									"class":sclass,
									"variableName":objectNameParsed["value"],
									"identification":attributeResolved.data[0],
									"alias":alias,
									"requireValues":requireValues,
									"seen":false,
									"counter":orderCounter
								};
								attributeTableAdded.push(objectNameParsed["value"]+counter);
								orderCounter++;
								counter++;
							}
						}
					}
				}
			}
			//object property
			else {
				// console.log("OBJECT PROPERTY", triples[triple]);
				if (typeof triples[triple]["predicate"] == "string"){
					if(triples[triple]["predicate"].startsWith("?")){
						// for every object usage in nodeList, for elery subject usage in nodeList - create link
						var objectClasses = nodeList[triples[triple]["object"]]["uses"];
						for(var oclass in objectClasses){
							var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
							var linkType = "REQUIRED";
							for(var sclass in subjectClasses){
								var link = {
									"linkIdentification":{local_name: "?"+triples[triple]["predicate"], display_name: "?"+triples[triple]["predicate"], short_name: "?"+triples[triple]["predicate"]},
									"object":oclass,
									"subject":sclass,
									"isVisited":false,
									"linkType":linkType,
									"isSubQuery":false,
									"isGlobalSubQuery":false,
									"isVariable":true,
									"counter":orderCounter
								}
								linkTable.push(link);
								linkTableAdded.push(link);
								orderCounter++;
								// console.log("LINK 1", link);
							}
						}	
					} else {
						// object properties or data properties under optionalLink
						var linkResolved = attributeResolved.data[0];
						
						var attributeResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]});
						if(attributeResolved.complete == true) {
							//attributeResolved.data[0].short_name = attributeResolved.data[0].prefix + ":" + attributeResolved.data[0].display_name;
							var sn = attributeResolved.data[0].display_name;
							if(schemaName == "wikidata" && attributeResolved.data[0].prefix == "wdt"){}
							else if(attributeResolved.data[0].is_local != true )sn = attributeResolved.data[0].prefix+ ":" + sn;
							attributeResolved.data[0].short_name = sn;
						}
						// if not OP and is DP
						// if (bgptype == "optionalLink" && linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]);
						if(linkResolved == null){
			
							var predicateParsed = vq_visual_grammar.parse(triples[triple]["predicate"])["value"];
							var linkName = await generateInstanceAlias(predicateParsed);
							if(linkName.indexOf("://") != -1) linkName = "<"+linkName+">";
							linkResolved = {
								"display_name":linkName,
								"short_name":linkName,
								"local_name":linkName,
								"URI":triples[triple]["predicate"],
								"notInSchema": "true"
							}
						}
						var linkType = "REQUIRED";
						// if(bgptype == "optional" || bgptype == "optionalLink") linkType = "OPTIONAL";
						
						if(typeof unionSubject !== 'undefined' && unionSubject != null && triples[triple]["subject"] == unionSubject){
				
							var link = {
								"linkIdentification":linkResolved,
								"object":triples[triple]["object"],
								"subject":"[ + ]",
								"isVisited":false,
								"linkType":linkType,
								"isSubQuery":false,
								"isGlobalSubQuery":false,
								"counter":orderCounter
							}
							linkTable.push(link);
							linkTableAdded.push(link);
							orderCounter++;
							// console.log("LINK 2", link);
						}
						else{
							// for every object usage in nodeList, for every subject usage in nodeList - create link
							// if object class has identification and does not has link
							// and subject class has identification and does not has link -> do not create link
							
							var objectClasses = nodeList[triples[triple]["object"]]["uses"];
							for(var oclass in objectClasses){
						
								var createAssociation = true;
								var associationCreated = false;
								//var schema = new VQ_Schema();
								
								// if (classesTable[oclass]["identification"] != null) {
									// var all_association = schema.findClassByName(classesTable[oclass]["identification"]["short_name"]).getAllAssociations();
									// var associationInClass = false;
									// for(var association in all_association){
										// if(all_association[association]["short_name"] == linkResolved["short_name"] && all_association[association]["type"] == "<="){
											// associationInClass = true;
											// break;
										// }
									// }
									// var all_association = schema.findClassByName(classesTable[oclass]["identification"]["short_name"]).getAllAttributes();
									// for(var association in all_association){
										// if(all_association[association]["short_name"] == linkResolved["short_name"]){
											// associationInClass = true;
											// break;
										// }
									// }
									// if(associationInClass == false) createAssociation = false;
								// };

								var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];

								//for(var cl in subjectClasses){
								//	if(!cl.startsWith(triples[triple]["subject"].substring(1))) delete subjectClasses[cl];
								//}

								for(var sclass in subjectClasses){
					
									// if multiple links with same name to same object and subject, then create only one
									for(var link in linkTableAdded){
										if(classesTable[linkTableAdded[link]["object"]]["instanceAlias"] == classesTable[oclass]["instanceAlias"] &&
										classesTable[linkTableAdded[link]["subject"]]["instanceAlias"] == classesTable[sclass]["instanceAlias"] &&
										linkTableAdded[link]["linkIdentification"]["short_name"] == linkResolved["short_name"]) {
											associationCreated = true;
			
										}
									}
									if(Object.keys(subjectClasses).length > 1 || Object.keys(objectClasses).length > 1){
		
										if (classesTable[sclass]["identification"] != null) {						
											var resolvePropertyByNameAndClass = await dataShapes.checkProperty({name:classesTable[sclass]["identification"]["iri"], propertyName: linkResolved["iri"]})
										};
									}
									
									if(associationCreated != true && (createAssociation == true || attributeResolved.complete != true)){
										var link = {
											"linkIdentification":linkResolved,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
											"counter":orderCounter
										}
										linkTable.push(link);
										linkTableAdded.push(link);
										orderCounter++;
										// console.log("LINK 3", link);
									}
								}
							}
						}
					}
				} else if(typeof triples[triple]["predicate"] == "object"){
	
					//property path
					if(typeof triples[triple]["predicate"]["type"] !== "undefined" && triples[triple]["predicate"]["type"] == "path"){
						
						
						
						var alias = "";

						if(triples[triple]["predicate"]["pathType"] == "/"){	
							var pathText = [];
							var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
							if(typeof last_element === "object" && typeof last_element["items"][0] !== "undefined")  last_element = last_element["items"][0];
							//link 
							var pathPropertyResolved = await dataShapes.resolvePropertyByName({name: last_element});

							if(pathPropertyResolved.complete == true) {
								// pathPropertyResolved.data[0].short_name = pathPropertyResolved.data[0].prefix + ":" + pathPropertyResolved.data[0].display_name;
								
								var sn = pathPropertyResolved.data[0].display_name;
								if(schemaName == "wikidata" && pathPropertyResolved.data[0].prefix == "wdt"){}
								else if(pathPropertyResolved.data[0].is_local != true)sn = pathPropertyResolved.data[0].prefix+ ":" + sn;
								pathPropertyResolved.data[0].short_name = sn;
							}
							
							
							var objectParsed = vq_visual_grammar.parse(triples[triple]["object"]);
							if((pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt > 0) || pathPropertyResolved.complete == false || schemaName == "wikidata"){
									
								for(var item in triples[triple]["predicate"]["items"]){
									if(typeof triples[triple]["predicate"]["items"][item] == "string"){
										//var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]);
										var linkResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]["items"][item]});
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											var sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
											else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											var predicateParsed = vq_visual_grammar.parse(triples[triple]["predicate"]["items"][item])["value"];
											var alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push(alias);
										}
										
										if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]));
									} 
									// ^
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "^"){
										// var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]["items"][0]);
										var linkResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]["items"][item]["items"][0]});
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											var sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
											else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											var predicateParsed = vq_visual_grammar.parse(triples[triple]["predicate"]["items"][item]["items"][0])["value"];
											var alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push("^" + alias);
										}
										//if(linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]["items"][0])
										if(linkResolved.complete == true)pathText.push("^" + buildPathElement(linkResolved.data[0]));
									}
									// *
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "*"){
										// var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]["items"][0]);
										var linkResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]["items"][item]["items"][0]});
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											var sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
											else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											var predicateParsed = vq_visual_grammar.parse(triples[triple]["predicate"]["items"][item]["items"][0])["value"];
											var alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push(alias +"*");
										}
										//if(linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]["items"][0])
										if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]) +"*");
									}// ?
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "?"){
										// var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]["items"][0]);
										var linkResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]["items"][item]["items"][0]});
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											var sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
											else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											var predicateParsed = vq_visual_grammar.parse(triples[triple]["predicate"]["items"][item]["items"][0])["value"];
											var alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push(alias +"?");
										}
										
										//if(linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]["items"][0])
										if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]) +"?");
									}
								}
								var linkType = "REQUIRED";
								if(bgptype == "optional") linkType = "OPTIONAL"; 
								
								if(indirectClassMembershipRole == pathText.join(".")){ 
									
									if(typeof nodeList[triples[triple]["object"]] !== 'undefined'){
										var objectClasses = nodeList[triples[triple]["object"]]["uses"];
										for(var oclass in objectClasses){
											var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
											for(var sclass in subjectClasses){
												// Indirect Class Membership
												
												var identification = await dataShapes.resolveClassByName({name: classesTable[oclass]["instanceAlias"]})
												if(identification.complete == true) {
													
													var sn = identification.data[0].display_name;
													if(schemaName == "wikidata" && identification.data[0].prefix == "wd"){}
													else if(identification.data[0].is_local != true )sn = identification.data[0].prefix+ ":" + sn;
													classesTable[sclass]["identification"] = identification.data[0];
													classesTable[sclass]["identification"]["short_name"] = sn;
													classesTable[sclass]["indirectClassMembership"] = true;
													
													 delete classesTable[oclass];
												} else if(oclass.indexOf(":/") == -1){													
													classesTable[sclass]["identification"] = {"short_name": "?"+oclass};
													classesTable[sclass]["indirectClassMembership"] = true;
													delete classesTable[oclass];
												} else {
													var linkResolved2 = Object.assign({}, pathPropertyResolved.data[0]);
													linkResolved2["local_name"] = pathText.join(".");
													linkResolved2["display_name"] = pathText.join(".");
													linkResolved2["short_name"] = pathText.join(".");
																
													// for every object usage in nodeList, for elery subject usage in nodeList - create link
													if(typeof nodeList[triples[triple]["object"]] !== 'undefined'){
														var objectClasses = nodeList[triples[triple]["object"]]["uses"];
														for(var oclass in objectClasses){
															var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
															for(var sclass in subjectClasses){
																var link = {
																	"linkIdentification":linkResolved2,
																	"object":oclass,
																	"subject":sclass,
																	"isVisited":false,
																	"linkType":linkType,
																	"isSubQuery":false,
																	"isGlobalSubQuery":false,
																	"counter":orderCounter
																}
																linkTable.push(link);
																linkTableAdded.push(link);
																orderCounter++;
																// console.log("LINK 4", link);
															}
														}
													}
												}
											}
										}
									}
								} else{

									// var linkResolved = pathPropertyResolved.data[0];
									var linkResolved2 = Object.assign({}, pathPropertyResolved.data[0]);
									linkResolved2["local_name"] = pathText.join(".");
									linkResolved2["display_name"] = pathText.join(".");
									linkResolved2["short_name"] = pathText.join(".");
														
									var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
									
									if(objectNameParsed.type === "string"){
										var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
										for(var sclass in subjectClasses){
											var className = "expr";
											if(typeof classesTable[className] !== "undefined") {
												className = className + "_" + counter;
												counter++;
											}
											var expr = className + " = " + triples[triple]["object"];
											var cl = {
												"variableName":"?"+className,
												"name": "",
												"identification":null,
												"instanceAlias":className,
												"isVariable":false,
												"isUnit":false,
												"isUnion":false
											};
											classesTable[className] = cl;
											
											nodeList["?"+className]= {uses: {"expr": "class"}, count:1};
											var link = {
														"linkIdentification":linkResolved2,
														"object":className,
														"subject":sclass,
														"isVisited":false,
														"linkType":linkType,
														"isSubQuery":false,
														"isGlobalSubQuery":false,
														"counter":orderCounter
											}
											linkTable.push(link);
											linkTableAdded.push(link);
											orderCounter++;
											
											// if(typeof classesTable[sclass] !== "undefined"){
												if(typeof classesTable[className]["conditions"] === 'undefined') {
													classesTable[className]["conditions"] = [];
												}
												classesTable[className]["conditions"].push(expr);
												// break;
											// }
										}
									} else {
										// for every object usage in nodeList, for elery subject usage in nodeList - create link
										if(typeof nodeList[triples[triple]["object"]] !== 'undefined'){
											var objectClasses = nodeList[triples[triple]["object"]]["uses"];
											for(var oclass in objectClasses){
												var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
												for(var sclass in subjectClasses){
													var link = {
														"linkIdentification":linkResolved2,
														"object":oclass,
														"subject":sclass,
														"isVisited":false,
														"linkType":linkType,
														"isSubQuery":false,
														"isGlobalSubQuery":false,
														"counter":orderCounter
													}
													linkTable.push(link);
													linkTableAdded.push(link);
													orderCounter++;
													// console.log("LINK 5", link);
												}
											}
										}
									}
								}
							}
							// attribute
							else if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].data_cnt > 0){
								
								for(var item in triples[triple]["predicate"]["items"]){
									if(typeof triples[triple]["predicate"]["items"][item] == "string"){
										
										if(item != triples[triple]["predicate"]["items"].length - 1){
											//var linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]);
											var linkResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]["items"][item]});
											if(linkResolved.complete == true) {
												// linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
												var sn = linkResolved.data[0].display_name;
												if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
												else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
												linkResolved.data[0].short_name = sn;
											}
											//if(linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]);
											if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]));
										}
										//last element
										else {
											var linkResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]["items"][item]});
											if(linkResolved.complete == true) {
												//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
												var sn = linkResolved.data[0].display_name;
												if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
												else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
												linkResolved.data[0].short_name = sn;
											}
											//var linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]);
											if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]));
										}
									} 
									// ^
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "^"){
										if(item != triples[triple]["predicate"]["items"].length - 1){
											var linkResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]["items"][item]["items"][0]});
											if(linkResolved.complete == true) {
												//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
												var sn = linkResolved.data[0].display_name;
												if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
												else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
												linkResolved.data[0].short_name = sn;
											}
											//linkResolved = schema.resolveLinkByName(triples[triple]["predicate"]["items"][item]["items"][0]);
											//if(linkResolved == null) linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]["items"][0]);
											if(linkResolved.complete == true) pathText.push("^" + buildPathElement(linkResolved.data[0]));
										}
										//last element
										else {
											var linkResolved = await dataShapes.resolvePropertyByName({name: triples[triple]["predicate"]["items"][item]["items"][0]});
											if(linkResolved.complete == true) {
												//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
												var sn = linkResolved.data[0].display_name;
												if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
												else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
												linkResolved.data[0].short_name = sn;
											}
											//linkResolved = schema.resolveAttributeByName(null, triples[triple]["predicate"]["items"][item]["items"][0]);
											if(linkResolved.complete == true) pathText.push("^" + buildPathElement(linkResolved.data[0]));
										}
									}
								}
								
								var attrResolved = pathPropertyResolved.data[0];
								
								var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
								//id identification.localName not equeals to subject - use alias
								if(attrResolved["local_name"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
								
								
								
								// filter as triple in property path
								if(objectNameParsed.type === "string"){
									var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
									for(var sclass in subjectClasses){
										var expr = pathText.join(".") + " = " + triples[triple]["object"];
										if(typeof classesTable[sclass] !== "undefined"){
											if(typeof classesTable[sclass]["conditions"] === 'undefined') {
												classesTable[sclass]["conditions"] = [];
											}
											classesTable[sclass]["conditions"].push(expr);
											break;
										}
									}
								}else {
								
									var requireValues = true;
									if(bgptype == "optional") requireValues = false;
					
									var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
									for(var sclass in subjectClasses){
										if(typeof attributeTable[objectNameParsed["value"]] === 'undefined'){
											attributeTable[objectNameParsed["value"]] = {
												"class":sclass,
												"variableName":objectNameParsed["value"],
												"identification":attrResolved,
												"alias":alias,
												"requireValues":requireValues,
												"exp":pathText.join("."),
												"seen":false,
												"counter":orderCounter
											};
											attributeTableAdded.push(objectNameParsed["value"]);
											orderCounter++;
										} else if(findAttributeInAttributeTable(attributeTable, objectNameParsed["value"], triples[triple]["object"], attrResolved) == null){
											attributeTable[objectNameParsed["value"]+counter] = {
												"class":sclass,
												"variableName":objectNameParsed["value"],
												"identification":attrResolved,
												"alias":alias,
												"requireValues":requireValues,
												"exp":pathText.join("."),
												"seen":false,
												"counter":orderCounter
											};
											attributeTableAdded.push(objectNameParsed["value"]+counter);
											orderCounter++;
											counter++;
										}
									}
								}
							}	
						} else if(triples[triple]["predicate"]["pathType"] == "^"){
							var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
							var pahtString = "";
							for(var item in triples[triple]["predicate"]["items"]){
								pahtString = pahtString + triples[triple]["predicate"]["items"][item];
							}
							var attrResolved
							var objectNameParsed = vq_visual_grammar.parse(triples[triple]["object"]);
							//link
							
							//if(schema.resolveLinkByName(last_element) != null){
							if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt > 0){
								var attrResolved2 = Object.assign({}, pathPropertyResolved.data[0]);
								// attrResolved = pathPropertyResolved.data[0];
								attrResolved2["local_name"] = "^" + attrResolved2["local_name"];
								attrResolved2["display_name"] = "^" + attrResolved2["display_name"];
								attrResolved2["short_name"] = "^" + attrResolved2["short_name"];
								
								var requireValues = true;
								if(bgptype == "optional") linkType = "OPTIONAL";
								// for every object usage in nodeList, for elery subject usage in nodeList - create link
								var objectClasses = nodeList[triples[triple]["object"]]["uses"];
								for(var oclass in objectClasses){
									var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
									for(var sclass in subjectClasses){
										var link = {
											"linkIdentification":attrResolved2,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
											"counter":orderCounter
										}
										linkTable.push(link);
										linkTableAdded.push(link);
										orderCounter++;
										// console.log("LINK 6", link);
									}
								}	
							} else if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].data_cnt > 0){
								attrResolved = pathPropertyResolved.data[0];
								
								//id identification.localName not equeals to subject - use alias
								if(attrResolved["local_name"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
								var requireValues = true;
								if(bgptype == "optional") requireValues = false;
								
								var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
								for(var sclass in subjectClasses){
									if(typeof attributeTable[objectNameParsed["value"]] === 'undefined'){
										attributeTable[objectNameParsed["value"]] = {
											"class":sclass,
											"variableName":objectNameParsed["value"],
											"identification":attrResolved,
											"alias":alias,
											"requireValues":requireValues,
											"exp":"^" + buildPathElement(attrResolved),
											"seen":false,
											"counter":orderCounter
										};
										attributeTableAdded.push(objectNameParsed["value"]);
										orderCounter++;
									} else if(findAttributeInAttributeTable(attributeTable, objectNameParsed["value"], triples[triple]["object"], attrResolved) == null){
										attributeTable[objectNameParsed["value"]+counter] = {
											"class":sclass,
											"variableName":objectNameParsed["value"],
											"identification":attrResolved,
											"alias":alias,
											"requireValues":requireValues,
											"exp":"^" + buildPathElement(attrResolved),
											"seen":false,
											"counter":orderCounter
										};
										attributeTableAdded.push(objectNameParsed["value"]+counter);
										counter++;
										orderCounter++;
									}
								}
							}
						} else if(triples[triple]["predicate"]["pathType"] == "+" || triples[triple]["predicate"]["pathType"] == "*" || triples[triple]["predicate"]["pathType"] == "?" || triples[triple]["predicate"]["pathType"] == "!"){
							var propertyPathText = "";
							for(var item in triples[triple]["predicate"]["items"]){
								var temp = await generatePropertyPath(triple, triples[triple]["predicate"]["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
								propertyPathText = propertyPathText + temp;
							}
							if(triples[triple]["predicate"]["pathType"] == "!") propertyPathText = triples[triple]["predicate"]["pathType"] + propertyPathText;
							else propertyPathText = propertyPathText + triples[triple]["predicate"]["pathType"];
							
							var linkType = "REQUIRED";
							if(bgptype == "optional") linkType = "OPTIONAL"; 
							linkResolved = {
								"short_name":propertyPathText,
								"local_name":propertyPathText,
								"notInSchema": "true"
							}
							// for every object usage in nodeList, for elery subject usage in nodeList - create link
							if(typeof nodeList[triples[triple]["object"]] !== 'undefined'){
								var objectClasses = nodeList[triples[triple]["object"]]["uses"];
								for(var oclass in objectClasses){
									var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
									for(var sclass in subjectClasses){
										var link = {
											"linkIdentification":linkResolved,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
											"counter":orderCounter
										}
										linkTable.push(link);
										linkTableAdded.push(link);
										orderCounter++
										// console.log("LINK 7", link);
									}
								}
							}
						} else if(triples[triple]["predicate"]["pathType"] == "|"){
							var propertyPathText = "";
							var propertyPathArray = [];
							for(var item in triples[triple]["predicate"]["items"]){
								var temp = await generatePropertyPath(triple, triples[triple]["predicate"]["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
								propertyPathArray.push(temp)
							}
							propertyPathText = propertyPathText + "("+propertyPathArray.join(" | ") + ")";

							var linkType = "REQUIRED";
							if(bgptype == "optional") linkType = "OPTIONAL"; 
							linkResolved = {
								"short_name":propertyPathText,
								"local_name":propertyPathText,
								"notInSchema": "true"
							}
							// for every object usage in nodeList, for elery subject usage in nodeList - create link
							if(typeof nodeList[triples[triple]["object"]] !== 'undefined'){
								var objectClasses = nodeList[triples[triple]["object"]]["uses"];
								for(var oclass in objectClasses){
									var subjectClasses = nodeList[triples[triple]["subject"]]["uses"];
									for(var sclass in subjectClasses){
										var link = {
											"linkIdentification":linkResolved,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
											"counter":orderCounter
										}
										linkTable.push(link);
										linkTableAdded.push(link);
										orderCounter++;
										// console.log("LINK 8", link);
									}
								}
							}
						}
						
					}
				}
			}
		}
	}

	return {classesTable:classesTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, attributeTableAdded:attributeTableAdded, filterTable:filterTable, nodeList:nodeList};
}

async function generatePropertyPath(triple, predicate, linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList){
	var propertyPathText = "";
	
	if(typeof predicate === "string"){

		var linkResolved = await dataShapes.resolvePropertyByName({name: predicate});
		if(linkResolved.complete == true) {
			
			var sn = linkResolved.data[0].display_name;
			if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
			else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
			linkResolved.data[0].short_name = sn;
		}
		if(linkResolved.complete == true && linkResolved.data[0].object_cnt > 0){
			propertyPathText = propertyPathText + buildPathElement(linkResolved.data[0]);
		} else {
			var predicateParsed = vq_visual_grammar.parse(predicate)["value"];
			var linkName = await generateInstanceAlias(predicateParsed);
			propertyPathText = propertyPathText + linkName;
		}
	} else if(predicate["pathType"] == "/"){
		var pathText = [];
		for(var item in predicate["items"]){
			if(typeof predicate["items"][item] == "string"){
				//var linkResolved = schema.resolveLinkByName(predicate["items"][item]);
				var linkResolved = await dataShapes.resolvePropertyByName({name: predicate["items"][item]});
				if(linkResolved.complete == true) {
					//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;	
					var sn = linkResolved.data[0].display_name;
					if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
					else if(linkResolved.data[0].is_local != true )sn = linkResolved.data[0].prefix+ ":" + sn;
					linkResolved.data[0].short_name = sn;
				}
				if(linkResolved.complete == true && linkResolved.data[0].object_cnt > 0) pathText.push(buildPathElement(linkResolved.data[0]));
				else {
					//var linkResolved = schema.resolveAttributeByName(null, predicate["items"][item]);
					if(linkResolved.complete == true && linkResolved.data[0].data_cnt > 0) pathText.push(buildPathElement(linkResolved.data[0]));
					else {
						var predicateParsed = vq_visual_grammar.parse(predicate)["value"];
						var linkName = await generateInstanceAlias(predicateParsed);
						pathText.push(linkName);
					}
				}
			} 
			// ^
			else if(predicate["items"][item]["type"] == "path" && predicate["items"][item]["pathType"] == "^"){
				//var linkResolved = schema.resolveLinkByName(predicate["items"][item]["items"][0]);
				var linkResolved = await dataShapes.resolvePropertyByName({name: predicate["items"][item]["items"][0]});
				if(linkResolved.complete == true) {
					//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;	
					var sn = linkResolved.data[0].display_name;
					if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
					else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
					linkResolved.data[0].short_name = sn;
				}
				if(linkResolved.complete == true && linkResolved.data[0].object_cnt > 0) pathText.push("^" + buildPathElement(linkResolved.data[0]));
				else {
					//var linkResolved = schema.resolveAttributeByName(null, predicate["items"][item]);
					if(linkResolved.complete == true && linkResolved.data[0].data_cnt > 0) pathText.push("^" + buildPathElement(linkResolved.data[0]));
					else {
						var predicateParsed = vq_visual_grammar.parse(predicate)["value"];
						var linkName = await generateInstanceAlias(predicateParsed);
						pathText.push("^"+linkName);
					}
				}
			}
		}
		propertyPathText = propertyPathText + pathText.join(".")
	
	} else if(predicate["pathType"] == "^"){
		for(var item in predicate["items"]){
			if(typeof predicate["items"][item] == "string"){
				//var linkResolved = schema.resolveLinkByName(predicate["items"][item]);
				var linkResolved = await dataShapes.resolvePropertyByName({name: predicate["items"][item]});
				if(linkResolved.complete == true) {
					//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;	
					var sn = linkResolved.data[0].display_name;
					if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt"){}
					else if(linkResolved.data[0].is_local != true)sn = linkResolved.data[0].prefix+ ":" + sn;
					linkResolved.data[0].short_name = sn;
				}
				if(linkResolved.complete == true && linkResolved.data[0].object_cnt > 0) propertyPathText = propertyPathText + "^" + buildPathElement(linkResolved.data[0]);
				else {
					//var linkResolved = schema.resolveAttributeByName(null, predicate["items"][item]);
					if(linkResolved.complete == true && linkResolved.data[0].data_cnt > 0) propertyPathText = propertyPathText + "^" + buildPathElement(linkResolved.data[0]);
					else {
						var predicateParsed = vq_visual_grammar.parse(predicate)["value"];
						var linkName = await generateInstanceAlias(predicateParsed);
						propertyPathText = propertyPathText + "^" + linkName;
					}
				}
			} 
			else {
				for(var i in predicate["items"][item]){
					var temp = await generatePropertyPath(triple, predicate["items"][item][i], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
					propertyPathText = propertyPathText + temp;
				}
			}
		}
	} else if(predicate["pathType"] == "+" || predicate["pathType"] == "*" || predicate["pathType"] == "?" || predicate["pathType"] == "!"){
		for(var item in predicate["items"]){
			var temp = await generatePropertyPath(triple, predicate["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
			propertyPathText = propertyPathText + temp;
		}
		if(predicate["pathType"] == "!") propertyPathText = predicate["pathType"] + propertyPathText;
		else propertyPathText = propertyPathText + predicate["pathType"];
	} else if(predicate["pathType"] == "|"){
		var propertyPathArray = [];
		for(var item in predicate["items"]){
			var temp = await generatePropertyPath(triple, predicate["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
			propertyPathArray.push(temp);
		}
		propertyPathText = propertyPathText + "("+propertyPathArray.join(" | ") + ")";
	}
	
	return propertyPathText;
	
}

function generateTypeFilter(expression){
	var filterString = "";
	var filterVariables = [];
	if(expression["type"] == "operation"){
		//if is a relational expressin
		if(checkIfRelation(expression["operator"]) != -1){
			var arg1 = generateArgument(expression["args"][0]);
			var arg2 =  generateArgument(expression["args"][1]);

			filterString = arg1["value"] + " " + expression["operator"] + " " + arg2["value"];

			if(arg1["type"] == "varName") filterVariables.push(arg1["value"]);
			if(arg2["type"] == "varName") filterVariables.push(arg2["value"]);
		}
	}
	return {filterString:filterString, filterVariables:filterVariables};
}

function checkIfRelation(value){
	var relations = [ "=" , "!=" , "<>" , "<=" , ">=" ,"<" , ">"]
	return relations.indexOf(value);
}

function chechIfArithmetic(value){
	var arithmetics = [ "+" , "-" , "*" , "/"]
	return arithmetics.indexOf(value);
}

function checkIfOneArgunemtFunctuion(value){
	var functions = ["STR", "LANG", "DATATYPE", "IRI", "URI", "ABS", "CEIL", "FLOOR", "ROUND", "STRLEN",
	"UCASE", "LCASE", "ENCODE_FOR_URI", "YEAR", "MONTH", "DAY", "HOURS", "MINUTES", "SECONDS", "TIMEZONE", "TZ", "BNODE",
	"MD5", "SHA1", "SHA256", "SHA384", "SHA512", "ISIRI", "ISURI", "ISBLANK", "ISLITERAL", "ISNUMERIC", "DATETIME", "DATE", "BOUND"]
	
	return functions.indexOf(value.toUpperCase());
}
function checkIfTwoArgunemtFunctuion(value){
	var functions = ["LANGMATCHES" , "CONTAINS", "STRSTARTS", "STRENDS", "STRBEFORE", "STRAFTER", "STRLANG", "STRDT", "SAMETERM"]
	return functions.indexOf(value.toUpperCase());
}

function generateArgument(argument){
	if(typeof argument == 'string'){
		return  vq_visual_grammar.parse(argument);
	}
}

function addAttributeToClass(classesTable, identification){
	
	// if(typeof identification.counter === "undefined") identification.counter = orderCounter;
	// orderCounter++;
	
	if(typeof classesTable["fields"] === 'undefined')classesTable["fields"] = [];
	
	var fieldExists = false;
	for(var field in classesTable["fields"]){
		if(classesTable["fields"][field]["alias"] == identification["alias"] && classesTable["fields"][field]["exp"] == identification["exp"]){
			fieldExists = true;
			break;
		}
	}
	
	if(fieldExists == false )classesTable["fields"].push(identification);
	return classesTable;
}

function addAggrigateToClass(classesTable, identification){	
	if(typeof classesTable["aggregations"] === 'undefined')classesTable["aggregations"] = [];
	classesTable["aggregations"].push(identification);
	return classesTable;
}

// Generate tree like ViziQuer query structure, from class and link tables 
function generateClassCtructure(clazz, className, classesTable, linkTable, whereTriplesVaribles, visitedClasses, conditionLinks, variableList){

	// In link table find all links with a subject or an object as given the class. Add class from opposite link end and link information, as given class children.
	clazz.c_id = className;
	for(var linkName in linkTable){
		if(typeof linkTable[linkName]["isConditionLink"] === 'undefined'){
			
			if(linkTable[linkName]["subject"] == className && linkTable[linkName]["isVisited"] == false){	

				linkTable[linkName]["isVisited"] = true;
				var tempAddClass = addClass(classesTable[linkTable[linkName]["object"]], linkTable[linkName], linkTable[linkName]["object"], linkTable[linkName]["linkIdentification"], linkTable[linkName]["graph"], linkTable[linkName]["graphInstruction"], false, classesTable, linkTable, whereTriplesVaribles, visitedClasses, conditionLinks, variableList);
				visitedClasses = tempAddClass["visitedClasses"];

				conditionLinks = tempAddClass["conditionLinks"];
				if(typeof visitedClasses[linkTable[linkName]["object"]] === 'undefined' || visitedClasses[linkTable[linkName]["object"]] != true){
					
					
					var childerenClass = tempAddClass["childrenClass"];
		
					// if child and parent are connected with plain link or optional without filters
					// if child has no identification (is not defined class)
					// if child has no attributes or one attribute "(select this)"
					// if child has no aggregation fields
					// if child instance alias is variable, not URI
					// if child variable is used once in a query
					// if child is not blank node
					// if link is not property paht
					// parent class is not init and union
					// transform child class into parent class attribute


					
					if(childerenClass["identification"] == null
					&& clazz["isUnit"] != true
					&& clazz["isUnion"] != true
					&& (typeof whereTriplesVaribles[childerenClass["instanceAlias"]] !== 'undefined' && whereTriplesVaribles[childerenClass["instanceAlias"]] == 1)
					&& (((linkTable[linkName]["linkType"] == "OPTIONAL" && typeof childerenClass["conditions"] === 'undefined') || linkTable[linkName]["linkType"] == "REQUIRED") && linkTable[linkName]["isSubQuery"] == false && linkTable[linkName]["isGlobalSubQuery"] == false)
					&& typeof childerenClass["children"] === 'undefined'
					&& (typeof childerenClass["fields"] === 'undefined' || (childerenClass["fields"].length == 1 && childerenClass["fields"][0]["exp"] == "(select this)"))
					&& typeof childerenClass["aggregations"] === 'undefined'
					&& linkTable[linkName]["linkIdentification"]["short_name"].indexOf(")*") === -1
					&& linkTable[linkName]["linkIdentification"]["short_name"].indexOf("|") === -1
					&& linkTable[linkName]["linkIdentification"]["short_name"].indexOf("+") === -1
					&& !childerenClass["variableName"].startsWith("_:b")
					&& linkTable[linkName]["linkIdentification"]["short_name"].indexOf(".") === -1
					){	
						var exp = linkTable[linkName]["linkIdentification"]["short_name"];
						if(exp.startsWith("http://") || exp.startsWith("https://")) exp = "<" +exp+ ">";
						var requred = true;
						if(linkTable[linkName]["linkType"] == "OPTIONAL") requred = false;
						var internal = true;
						var addLabel = false;
						var addAltLabel = false;
						var addDescription = false;
						var attrAlias = childerenClass["instanceAlias"];
						if(typeof childerenClass["fields"] !== 'undefined' && childerenClass["fields"].length == 1 && childerenClass["fields"][0]["exp"] == "(select this)"){
							internal = false;
							if(typeof childerenClass["fields"][0]["isInternal"] !== "undefined") internal = childerenClass["fields"][0]["isInternal"];
							addLabel = childerenClass["fields"][0]["addLabel"];
							addAltLabel = childerenClass["fields"][0]["addAltLabel"];
							addDescription = childerenClass["fields"][0]["addDescription"];
						} else if(typeof variableList["?"+attrAlias+"Label"] !== "undefined"){
							addLabel = true;
						}
						
						if(attrAlias == exp) attrAlias = "";
						// if(typeof variableList["?"+attrAlias] !== 'undefined' && variableList["?"+attrAlias] <=1 ) attrAlias = "";
						var attributeInfo = {
							"alias":attrAlias,
							"identification":null,
							"exp":exp,
							"requireValues":requred,
							"isInternal":internal,
							"addLabel":addLabel,
							"addAltLabel":addAltLabel,
							"addDescription":addDescription,
							"graph":linkTable[linkName]["graph"],
							"graphInstruction":linkTable[linkName]["graphInstruction"],
							"counter":linkTable[linkName]["counter"]
						}
						
						
						// if(selectVariables.indexOf("?"+attrAlias) !== -1)internal = false;
						// console.log("21", attributeInfo, internal, variableList["?" + attrAlias])
						var createAttribute = true;
						
							for(var condition  in childerenClass["conditions"]){
								if(typeof clazz["conditions"] === 'undefined') clazz["conditions"] = [];
								if(typeof variableList["?" + attrAlias] !== "undefined" && variableList["?" + attrAlias] <=1){
									
									if(typeof variableList["?"+ attrAlias] !== "undefined" && childerenClass["conditions"][condition].indexOf(attrAlias) != -1 && childerenClass["conditions"][condition].indexOf(" != ") === -1) {
										childerenClass["conditions"][condition] = childerenClass["conditions"][condition].replace(attrAlias, exp);
										createAttribute = false;
									}
								}
								if(!clazz["conditions"].includes(childerenClass["conditions"][condition])) clazz["conditions"].push(childerenClass["conditions"][condition]);
							}
						
						if(createAttribute)clazz = addAttributeToClass(clazz, attributeInfo);
						if(typeof childerenClass["groupByThis"] !== 'undefined' && childerenClass["groupByThis"] == true) {
							var group = exp;
							if(childerenClass["instanceAlias"] != null && childerenClass["instanceAlias"] != "") group = childerenClass["instanceAlias"];
							if(typeof clazz["groupings"] === "undefined") clazz["groupings"] = [];
							clazz["groupings"].push(group);
						}
					}
					else {
						clazz["children"] = addChildren(clazz);
						clazz["children"].push(childerenClass);
						// childerenClass["isVisited"] = true;
						visitedClasses[linkTable[linkName]["object"]] = true;
					}
				} else {
					
					// condition links
					if(linkTable[linkName]["subject"] == className){
						linkTable[linkName]["isVisited"] = true;
						var conditinClass = classesTable[linkTable[linkName]["subject"]];
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						var clink = addConditinClass(linkTable[linkName], linkTable[linkName]["object"], true, linkTable[linkName]["linkType"])
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["subject"];
						conditionLinks.push(clink);
					} else if(linkTable[linkName]["object"] == className){
						var conditinClass = classesTable[linkTable[linkName]["object"]];
						linkTable[linkName]["isVisited"] = true;
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						var clink = addConditinClass(linkTable[linkName], linkTable[linkName]["subject"], false, linkTable[linkName]["linkType"]);
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["object"];
						conditionLinks.push(clink);
					}	
				}

			} else if(linkTable[linkName]["object"] == className && linkTable[linkName]["isVisited"] == false){

				linkTable[linkName]["isVisited"] = true;
				clazz["children"] = addChildren(clazz);
				var tempAddClass = addClass(classesTable[linkTable[linkName]["subject"]],linkTable[linkName], linkTable[linkName]["subject"],  linkTable[linkName]["linkIdentification"], linkTable[linkName]["graph"], linkTable[linkName]["graphInstruction"], true, classesTable, linkTable, whereTriplesVaribles, visitedClasses, conditionLinks, variableList)
				visitedClasses = tempAddClass["visitedClasses"];
				conditionLinks = tempAddClass["conditionLinks"];
				
				if(typeof visitedClasses[linkTable[linkName]["subject"]] === 'undefined' || visitedClasses[linkTable[linkName]["subject"]] != true){
					var childerenClass = tempAddClass["childrenClass"];
					
					clazz["children"].push(childerenClass);
					// childerenClass["isVisited"] = true;
					visitedClasses[linkTable[linkName]["subject"]] = true;
					
				}
				else {
					// condition links
					
					if(linkTable[linkName]["subject"] == className){
						linkTable[linkName]["isVisited"] = true;
						var conditinClass = classesTable[linkTable[linkName]["subject"]];
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						var clink = addConditinClass(linkTable[linkName], linkTable[linkName]["object"], true, linkTable[linkName]["linkType"])
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["subject"];
						conditionLinks.push(clink);
					} else if(linkTable[linkName]["object"] == className){
						var conditinClass = classesTable[linkTable[linkName]["object"]];
						linkTable[linkName]["isVisited"] = true;
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);

						var clink = addConditinClass(linkTable[linkName], linkTable[linkName]["subject"], false, linkTable[linkName]["linkType"]);

						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["object"];
						
						conditionLinks.push(clink);
					}	

				}
			}
		} else {
			// condition links
			if(linkTable[linkName]["isVisited"] != true){
				if(linkTable[linkName]["subject"] == className){
						linkTable[linkName]["isVisited"] = true;
						var conditinClass = classesTable[linkTable[linkName]["subject"]];
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						var clink = addConditinClass(linkTable[linkName], linkTable[linkName]["object"], true, linkTable[linkName]["linkType"])
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["subject"];
						conditionLinks.push(clink);
				} else if(linkTable[linkName]["object"] == className){
						var conditinClass = classesTable[linkTable[linkName]["object"]];
						linkTable[linkName]["isVisited"] = true;
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						var clink = addConditinClass(linkTable[linkName], linkTable[linkName]["subject"], false, linkTable[linkName]["linkType"]);
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["object"];
						conditionLinks.push(clink);
				}	
			}
		}
	}
	
	return {clazz:clazz, conditionLinks:conditionLinks};
}

function addChildren(clazz){
	if(typeof clazz["children"] === 'undefined') clazz["children"] = [];
	return clazz["children"];
}
function addConditionLinks(clazz){
	if(typeof clazz["conditionLinks"] === 'undefined') clazz["conditionLinks"] = [];
	return clazz["conditionLinks"];
}

function addClass(childrenClass, linkInformation, childrenClassName, linkIdentification, graph, graphInstruction, isInverse, classesTable, linkTable, whereTriplesVaribles, visitedClasses, conditionLinks, variableList){

	childrenClass["isInverse"] = isInverse;
	childrenClass["linkIdentification"] = linkInformation["linkIdentification"];
	childrenClass["linkType"] = linkInformation["linkType"];
	childrenClass["isSubQuery"] = linkInformation["isSubQuery"];
	childrenClass["isGlobalSubQuery"] = linkInformation["isGlobalSubQuery"];
	childrenClass["graph"] = linkInformation["graph"];
	childrenClass["graphInstruction"] = linkInformation["graphInstruction"];
	generateClassCtructureTemp = generateClassCtructure(childrenClass, childrenClassName, classesTable, linkTable, whereTriplesVaribles, visitedClasses, conditionLinks, variableList);
	childrenClass = generateClassCtructureTemp.clazz;
	return {childrenClass:childrenClass, visitedClasses:visitedClasses, conditionLinks:conditionLinks};
}

function addConditinClass(linkInformation, targetClass, isInverse, isNot){
	var conditionLink = {};
	if(isNot == "NOT") isNot = true;
	conditionLink["isInverse"] = isInverse;
	conditionLink["identification"] = linkInformation["linkIdentification"];
	conditionLink["isNot"] = isNot;
	conditionLink["target"] = targetClass;
	
	return conditionLink;
}

// Decide which class is a query start class
function getStartClass(classesTable, linkTable) {
  
  // If class has aggregation inside and no incoming subquery links or if no aggregations in a query, use first class appeared.
  // collect classes with aggregations inside, from the main query 
  var classesWithAggregations = [];
  for (var clazz in classesTable){
    if(typeof classesTable[clazz]["aggregations"] !== 'undefined' && classesTable[clazz]["aggregations"] != null){
		var underSubQuery = false;
		for (var link in linkTable){
			if((linkTable[link]["object"] == clazz || linkTable[link]["subject"] == clazz) && (linkTable[link]["isSubQuery"] == true || linkTable[link]["isGlobalSubQuery"] == true)){
				underSubQuery = true;
				break;
			}
		}
		if(underSubQuery == false) classesWithAggregations.push({"name":clazz, "class":classesTable[clazz]});
	}
  }
  
  if(classesWithAggregations.length > 1){
	var mainClass = classesWithAggregations[0];
	for (i = 1; i < classesWithAggregations.length; i++) {
		var aggregations = classesWithAggregations[i]["class"]["aggregations"];
		for(var aggr in aggregations){
			if(aggregations[aggr]["exp"].toLowerCase() == "count(.)"){
				// classesTable[mainClass["name"]]["aggregations"].push({exp:"count(" + classesWithAggregations[i]["name"] + ")", alias:aggregations[aggr]["alias"]});
				var cn = classesWithAggregations[i]["class"]["instanceAlias"];
				if(typeof cn === 'undefined' || cn == null) cn = classesWithAggregations[i]["class"]["identification"]["short_name"];
				classesTable[mainClass["name"]] = addAggrigateToClass(classesTable[mainClass["name"]], {exp:"count(" + cn + ")", alias:aggregations[aggr]["alias"]});
			} else if(aggregations[aggr]["exp"].toLowerCase() == "count_distinct(.)"){
				// classesTable[mainClass["name"]]["aggregations"].push({exp:"count(" + classesWithAggregations[i]["name"] + ")", alias:aggregations[aggr]["alias"]});
				var cn = classesWithAggregations[i]["class"]["instanceAlias"];
				if(typeof cn === 'undefined' || cn == null) cn = classesWithAggregations[i]["class"]["identification"]["short_name"];
				classesTable[mainClass["name"]] = addAggrigateToClass(classesTable[mainClass["name"]], {exp:"count_distinct(" + cn + ")", alias:aggregations[aggr]["alias"]});
			} else {
				// classesTable[mainClass["name"]]["aggregations"].push(aggregations[aggr]);
				classesTable[mainClass["name"]] = addAggrigateToClass(classesTable[mainClass["name"]], aggregations[aggr]);
			}
		}
		classesTable[classesWithAggregations[i]["name"]]["aggregations"] = null;
	}
	
	return {startClass:mainClass, classesTable:classesTable}
  }
  
  if(classesWithAggregations.length == 1){
	return {startClass:classesWithAggregations[0], classesTable:classesTable}
  }
  
  for (var clazz in classesTable){ 
	return {startClass:{"name":clazz, "class":classesTable[clazz]}, classesTable:classesTable};
  }
  
			var sc = {
					"variableName":"?[ ]",
					"name": "[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classesTable["[ ]"] = sc;
	return {startClass:{"name":"[ ]", "class":sc}, classesTable:classesTable, emptyClassSet:true};
}

async function getAllVariablesInQuery(expression, variableTable){
	for(var key in expression){
		if(typeof expression[key] === 'object'){
			if(key == 'variables'){
				var variables = expression[key];
				for(var variable in variables){
					
					if(typeof variables[variable] === 'string' && await dataShapes.resolveClassByName({name: vq_visual_grammar.parse(variables[variable])["value"]}) == null){
						variableTable[variables[variable]] = 0;
					} else if(typeof variables[variable] === 'object'){
						variableTable[variables[variable]["variable"]] = 1;
					}
				}
			}
			var temp = await getAllVariablesInQuery(expression[key], variableTable);
			for(var t in temp){
				variableTable[t] = temp[t];
			}
		} else if(typeof expression[key] === 'string' && expression[key].startsWith("?")) {
			
			if(typeof variableTable[expression[key]] !== 'undefined') {
				variableTable[expression[key]] = variableTable[expression[key]] + 1;
			} else {
				variableTable[expression[key]] = 0;
			}
		}
	}
	return variableTable;
}

function getAllVariableCountInQuery(expression, variableTable){	
	for(var key in expression){
		if(typeof expression[key] === 'object' && key != "group"){
			if(key == 'variables'){
				var variables = expression[key];
				for(var variable in variables){
					if(typeof variables[variable] === 'object'){
						
						var temp = getAllVariableCountInQuery(variables[variable], variableTable);
						for(var t in temp){
							variableTable[t] = temp[t];
						}
					}
				}
			} else if(expression["type"] == 'values'){
				for(var value in expression[key]){
					for(var v in expression[key][value]){
						if(typeof variableTable[v] !== 'undefined') {
							variableTable[v] = variableTable[v] + 1;
						} else {
							variableTable[v] = 1;
						}
					}
				}
			} else if(expression["type"] == 'bind'){
				variableTable[expression["variable"]] = 10;
				var temp = getAllVariableCountInQuery(expression[key], variableTable);
				for(var t in temp){
					variableTable[t] = temp[t];
				}
			} else {
				var temp = getAllVariableCountInQuery(expression[key], variableTable);
				for(var t in temp){
					variableTable[t] = temp[t];
				}
			}
		} else if(key == "group"){
			for(var v in expression[key]){
				if(typeof variableTable[expression[key][v]["expression"]] !== 'undefined') {
						variableTable[expression[key][v]["expression"]] = variableTable[expression[key][v]["expression"]] + 1;
					} else {
						variableTable[expression[key][v]["expression"]] = 1;
					}
				
			}
		} else if(key == 'variable' && typeof expression[key] === "string"){
			variableTable[expression["variable"]] = 10;
		} else if(key == 'expression' && typeof expression[key] === "string"){
				if(expression[key].endsWith("Label")) variableTable[expression[key].substring(0, expression[key].length-5)] = 10;
				else if(expression[key].endsWith("AltLabel")) variableTable[expression[key].substring(0, expression[key].length-8)] = 10;
				else if(expression[key].endsWith("Description")) variableTable[expression[key].substring(0, expression[key].length-11)] = 10;
				else {
					if(typeof variableTable[expression[key]] !== 'undefined') {
						variableTable[expression[key]] = variableTable[expression[key]] + 1;
					} else {
						variableTable[expression[key]] = 1;
					}
				}
		} else if(typeof expression[key] === 'string' && expression[key].startsWith("?")) {
			if(typeof variableTable[expression[key]] !== 'undefined') {
				variableTable[expression[key]] = variableTable[expression[key]] + 1;
			} else {
				variableTable[expression[key]] = 1;
			}
		} 
	}
	return variableTable;
}

function transformParsedQuery(expression){
	if(typeof expression === 'object'){
		for(var key in expression){
			if(key == "patterns"){			
				for(var pattern in expression[key]){	
					if(expression[key][pattern]["type"] == "bgp"){		
						var blankNodes = [];
						var triples = expression[key][pattern]["triples"];
						if(triples.length > 1){
							for(var triple in triples){
								
								if(triples[triple]["subject"].startsWith("_:b") || triples[triple]["object"].startsWith("_:b")){
									blankNodes.push(triples[triple]);
									delete triples[triple];
								}
							}
							if(triples.length == 0 || triples.length == blankNodes.length) expression[key][pattern] = {type:"blankNode", blankNode:blankNodes};
							else if(blankNodes.length > 0)expression[key].push({type:"blankNode", blankNode:blankNodes})
						}
					}
				}
			}		
			expression[key] = transformParsedQuery(expression[key]);
		}
	}
	return expression;
}

function checkIfOrAndInFilter(expression, value){
	if(expression["type"] == 'operation' && (expression["operator"] == "||" || expression["operator"] == "&&")){
		value = true;
	}
	for(var key in expression){
		if(typeof expression[key] === 'object'){
			var temp = checkIfOrAndInFilter(expression[key], value);
			if(temp == true) value = true;
		}
	}
	return value;
}

function buildPathElement(pathElement){
	if(pathElement["prefix"] == "" || (schemaName == "wikidata" && pathElement["prefix"] == "wdt")) return pathElement["display_name"];
	else return pathElement["prefix"]+":"+pathElement["display_name"];
}

// Visualize query based on tree structure
async function visualizeQuery(clazz, parentClass, variableList, queryId, queryQuestion ){
	
	//node type
	var nodeType = "condition";
	if(parentClass == null) nodeType = "query";

	//instanceAlias
	var instanceAlias = clazz["instanceAlias"];
	
	if(instanceAlias.startsWith("_b")) instanceAlias = null;

	//name
	var className = "";
	if(clazz["identification"] != null) className = clazz["identification"]["short_name"];


	if(clazz["isVariable"] == true) {
		className = clazz["variableName"]; //false
	}

	if(clazz["isUnit"] == true) {
		className = "[ ]"; //false
	}

	if(clazz["isUnion"] == true) {
		className = "[ + ]"; //fasle
	}

	var newPosition = {x:x,y:y,width:width,height:height};
	if(parentClass != null){
		var d = 30; //distance between boxes
		var oldPosition = parentClass.getCoordinates(); //Old class coordinates and size
		newPosition = parentClass.getNewLocation(d); //New class coordinates and size
	}
	
	var new_elem_id = Create_VQ_Element(function(classBox) {
		if(className != null && className != "") classBox.setName(className);
		classBox.setClassStyle(nodeType);
		if(instanceAlias != null) classBox.setInstanceAlias(instanceAlias);
		if(typeof clazz["indirectClassMembership"] !== "undefined" && clazz["indirectClassMembership"] == true) classBox.setIndirectClassMembership(true);
		else classBox.setIndirectClassMembership(false);
		
		// setIndirectClassMembership

		//class not in a schema 
		if(clazz["identification"] != null && typeof clazz["identification"]["notInSchema"] !== 'undefined' && clazz["identification"]["notInSchema"] != "variable"){
			if((queryId != null && queryId != "") || (queryQuestion != null && queryQuestion != "")){
				var comment = "Class not in the data schema;\n";
				if(queryId != null && queryId != "") comment = comment + "ID = " + queryId;
				if(queryQuestion != null && queryQuestion != "") comment = comment + ",\nQuestion = " + queryQuestion;
				classBox.setComment(comment);
			} else classBox.setComment("Class not in the data schema");
		} else if((queryId != null && queryId != "") || (queryQuestion != null && queryQuestion != "")){
			var comment = "";
			if(queryId != null && queryId != "") comment = "ID = " + queryId;
			if(queryQuestion != null && queryQuestion != "") comment = comment + ",\nQuestion = " + queryQuestion;
			classBox.setComment(comment);
		}

		//attributes	
		if(typeof clazz["fields"] !== "undefined") clazz["fields"] = clazz["fields"].sort(function(a, b) {
			return a["counter"] - b["counter"];
		});
		
		_.each(clazz["fields"],function(field) {
			var alias = field["alias"];
			if(typeof alias !== "undefined" && typeof variableList["?" + field["alias"]] !== "undefined" && variableList["?" + field["alias"]] <=1 && !field["exp"].startsWith("??")) alias = "";
			var expression = field["exp"];
			var requireValues = field["requireValues"];
			var isInternal = field["isInternal"];
			var groupValues = field["groupValues"]; // false
			var addLabel = field["addLabel"];
			var addAltLabel = field["addAltLabel"];
			var addDescription = field["addDescription"];
			var graph = field["graph"];
			var graphInstruction = field["graphInstruction"];
			
			//add attribute to class
			classBox.addField(expression,alias,requireValues,groupValues,isInternal,addLabel,addAltLabel,addDescription,graph,graphInstruction);

		})

		//aggregations
		// remove duplicates
		if(clazz != null && clazz["aggregations"] != null && typeof clazz["aggregations"] !== "undefined"){
			clazz["aggregations"] = clazz["aggregations"].filter((value, index, self) =>
			  index === self.findIndex((t) => (
				t.alias === value.alias && t.exp === value.exp
			  ))
			)
		}
			
		_.each(clazz["aggregations"],function(field) {
			var alias = field["alias"];
			var expression = field["exp"];

			//add aggregation to class
			classBox.addAggregateField(expression, alias,false);
		})

		//conditions
		clazz["conditions"] = removeDuplicateConditions(clazz["conditions"]);
		_.each(clazz["conditions"],function(condition) {
			var expression = condition;

			//add condition to class
			classBox.addCondition(expression);
		})

		//orderBy
		_.each(clazz["orderings"],function(order) {
			var expression = order["exp"];
			var isDescending = order["isDescending"];

			//add order to class
			classBox.addOrdering(expression, isDescending);
		})
		
		//graphs
		_.each(clazz["graphs"],function(graphs) {
			var graph = graphs["graph"];
			var graphInstruction = graphs["graphInstruction"];

			//add graphs to class
			classBox.addGraphs(graph, graphInstruction);
		})
		
		if(typeof clazz["groupByThis"] !== 'undefined') classBox.setGroupByThis(clazz["groupByThis"]);
		
		//groupBy
		_.each(clazz["groupings"],function(group) {
			var expression = group["exp"];
			var isDescending = group["isDescending"];

			//add group to class
			classBox.addGrouping(group);
		})

		//distinct
		var distinct = clazz["distinct"];
		if(typeof distinct !== "undefined" && (typeof clazz["aggregations"] === "undefined" || clazz["aggregations"].length == 0))classBox.setDistinct(distinct);
		
		//serviceLabelLang
		var serviceLabelLang = clazz["serviceLabelLang"];
		if(typeof serviceLabelLang !== "undefined" && serviceLabelLang !== ""){
			if(serviceLabelLang != "[AUTO_LANGUAGE],en")classBox.setLabelServiceLanguages(serviceLabelLang);
		}
		
		//selectAll
		var selectAll = clazz["selectAll"];
		if(typeof selectAll === "undefined") selectAll = false;
		classBox.setSelectAll(selectAll);

		//limit
		var limit = clazz["limit"];
		classBox.setLimit(limit);

		//offset
		var offset = clazz["offset"];
		classBox.setOffset(offset);

		//full SPARQL
		var fullSPARQL = clazz["fullSPARQL"];
		
		classBox.setFullSPARQL(fullSPARQL);

		//link
		if(parentClass != null){
			var linkName = "++";
			if(typeof clazz["linkIdentification"] !== 'undefined') linkName = clazz["linkIdentification"]["short_name"];
			// REQUIRED, NOT, OPTIONAL
			var linkType  = clazz["linkType"];

			// PLAIN, SUBQUERY, GLOBAL_SUBQUERY, CONDITION
			var linkQueryType = "PLAIN";

			var isSubQuery = clazz["isSubQuery"];
			if(isSubQuery == true) linkQueryType = "SUBQUERY";
			var isGlobalSubQuery = clazz["isGlobalSubQuery"];
			if(isGlobalSubQuery == true) linkQueryType = "GLOBAL_SUBQUERY";

			var isInverse = clazz["isInverse"];
			var graph = clazz["graph"];
			var graphInstruction = clazz["graphInstruction"];
			
            //Link Coordinates
            var coordX = newPosition.x + Math.round(newPosition.width/2);
            var coordY = oldPosition.y + oldPosition.height;
            var locLink = [];

			if(isInverse != true){
				locLink = [coordX, coordY, coordX, newPosition.y]; 
				Create_VQ_Element(function(linkLine) {
					linkLine.setName(linkName);
					linkLine.setLinkType(linkType);
					linkLine.setNestingType(linkQueryType);
					if(typeof graph !== "undefined" && typeof graphInstruction !== "undefined" && graph != null && graphInstruction != null && graph != "" && graphInstruction != ""){
						linkLine.setGraph(graph, "{" + graphInstruction + ": " + graph + "}");
						linkLine.setGraphInstruction(graphInstruction);
					}
				}, locLink, true, parentClass, classBox);
			} else {
				locLink = [coordX, newPosition.y, coordX, coordY];
				Create_VQ_Element(function(linkLine) {
					linkLine.setName(linkName);
					linkLine.setLinkType(linkType);
					linkLine.setNestingType(linkQueryType);
					if(typeof graph !== "undefined" && typeof graphInstruction !== "undefined" && graph != null && graphInstruction != null && graph != "" && graphInstruction != ""){
						linkLine.setGraph(graph, "{" + graphInstruction + ": " + graph + "}");
						linkLine.setGraphInstruction(graphInstruction);
					}
				}, locLink, true, classBox, parentClass);
			}
		}
		//subClasses
		_.each(clazz["children"],async function(subclazz) {
			y = y + 100;
			await visualizeQuery(subclazz, classBox, variableList);
		})

		//conditionLinks
		_.each(clazz["conditionLinks"],function(condLink) {
			
			var linkName = condLink["identification"]["local_name"];
			var isNot = condLink["isNot"];
			var isInverse = condLink["isInverse"];
		})
	
	VQ_Elements[clazz.c_id] = classBox.obj._id;
	}, newPosition);
}

async function generateInstanceAlias(uri, resolve){
			
	if(uri.indexOf(":/") != -1 && resolve != false && splitURI(uri).name != ""){
		var uriResolved = await dataShapes.resolveIndividualByName({name: uri})
		if(uriResolved.complete == true && uriResolved.data[0].localName != ""){
			uri = uriResolved.data[0].localName;
			
			if(schemaName == "wikidata" && uri.startsWith("wd:[")){
				uri = uri.substring(3);
			}	
			
		} else {
			var splittedUri = splitURI(uri);
			if(splittedUri == null) return uri;
			
			var prefixes = await dataShapes.getNamespaces()
			for(var key in prefixes){
				if(prefixes[key]["value"] == splittedUri.namespace) {
					if(prefixes[key]["name"].slice(-1) == ":") return prefixes[key]["name"]+splittedUri.name;
					return prefixes[key]["name"]+":"+splittedUri.name;
				}
			}
			return "<" + uri + ">";
		}
	}else {
		var splittedUri = splitURI(uri);
		if(splittedUri == null) return uri;
		
		var prefixes = await dataShapes.getNamespaces()
		for(var key in prefixes){
			if(prefixes[key]["value"] == splittedUri.namespace) {
				if(prefixes[key]["name"].slice(-1) == ":") return prefixes[key]["name"]+splittedUri.name;
				return prefixes[key]["name"]+":"+splittedUri.name;
			}
		}
	}

	return uri;
}

function splitURI(uri){
	if(uri.lastIndexOf("#") != -1){
		return {namespace:uri.substring(0, uri.lastIndexOf("#")+1), name:uri.substring(uri.lastIndexOf("#")+1)}
	} else if (uri.lastIndexOf("/") != -1){
		return {namespace:uri.substring(0, uri.lastIndexOf("/")+1), name:uri.substring(uri.lastIndexOf("/")+1)}
	}
	return null;
}

function removeDuplicateLinks(linkTable){
	var newLinkTable = [];
	for(var link in linkTable){
		var linkExists = false;
		for(var newLink in newLinkTable){
			if(linkTable[link]["object"] == newLinkTable[newLink]["object"] &&
			linkTable[link]["subject"] == newLinkTable[newLink]["subject"] &&
			linkTable[link]["isSubQuery"] == newLinkTable[newLink]["isSubQuery"] &&
			linkTable[link]["isGlobalSubQuery"] == newLinkTable[newLink]["isGlobalSubQuery"] &&
			linkTable[link]["isGlobalSubQuery"] == newLinkTable[newLink]["isGlobalSubQuery"] &&
			((typeof linkTable[link]["linkIdentification"]  === 'undefined' && typeof newLinkTable[newLink]["linkIdentification"] === 'undefined') ||
			typeof linkTable[link]["linkIdentification"]  !== 'undefined' && typeof newLinkTable[newLink]["linkIdentification"] !== 'undefined'
			&& linkTable[link]["linkIdentification"]["short_name"] == newLinkTable[newLink]["linkIdentification"]["short_name"])
			) {
				linkExists = true;
				break;
			}
		}
		if(linkExists == false) newLinkTable.push(linkTable[link]);
	}
	return newLinkTable;
}

function removeParrentQueryClasses(parentNodeList, classesTable, classTableTemp, linkTableTemp, attributeTable){
	var unionClassTable = [];
	for(var clazz in classesTable){
		if(typeof classTableTemp[clazz] === 'undefined') unionClassTable[clazz] = classesTable[clazz];
		else if(typeof parentNodeList[classTableTemp[clazz]["variableName"]] !== 'undefined'){
			var classWithAttribute = false;
			
			for(var attribute in attributeTable){
				if(attributeTable[attribute]["class"] == clazz) {
					classWithAttribute = true;
					break;
				}
			} 
			
			if(classWithAttribute == true) unionClassTable[clazz] = classesTable[clazz];
		} else unionClassTable[clazz] = classesTable[clazz];
	}

	return unionClassTable
}

function relinkUnionLink(classesTable, linkTable, unionClass){
	
	var relinkt = false;
	for(var link in linkTable){
		if(linkTable[link]["subject"] != unionClass && linkTable[link]["object"] != unionClass && typeof classesTable[linkTable[link]["object"]] === "undefined"){
			
			linkTable[link]["object"] = unionClass;
			relinkt = true;
		} else if(linkTable[link]["object"] != unionClass && linkTable[link]["subject"] != unionClass &&  typeof classesTable[linkTable[link]["subject"]] === "undefined"){
			
			linkTable[link]["subject"] = unionClass;
			relinkt = true;
		}
	}
	
	return {linkTable:linkTable, relinkt:relinkt}
}

function checkIfClassHasAttributes(clazz, attributeTable){

	for(attribute in attributeTable){
		if(attributeTable[attribute]["class"] == clazz) return true;
	}
	
	return false;
}

function removeClass(classesTable, clazz){
	var classT = [];
	for(var c in classesTable){
		if(c != clazz) classT[c] = classesTable[c];
	}
	return classT;
}

async function generatePlainNegationUnion(unionBlock, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, linkTableAdded, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression, allClassesUnderUnion, allNodesUnderUnion, unionClass){
	var linkT = [];
	var classT = [];
				var args = unionBlock["expression"]["args"];
				for(var arg in args){
					if(args[arg]["type"] == "group"){
						var classTableTemp = [];
						var linkTableTemp = [];
						// calculate nodelist for union block
						var nodeLitsTemp = [];
						var collectNodeListTemp  = await collectNodeList(args[arg]["patterns"]);
						var temp = collectNodeListTemp["nodeList"];
						// var plainVariables = getWhereTriplesPlainVaribles(args[arg]["patterns"]);
						for(var node in temp){
							nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
							allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, temp[node]);
						}	
						
						// for all patterns
						// first bqp then the rest
						for(var p in args[arg]["patterns"]){
							var pattern = args[arg]["patterns"][p];
							if(typeof pattern["type"] !== "undefined" && pattern["type"] == "bgp"){
								var temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								for(var clazz in temp["classTableAdded"]){
									classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
									classT[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
									allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
								}
								attributeTable = temp["attributeTable"];
								linkTable = temp["linkTable"];
								filterTable = temp["filterTable"];
								linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
								linkT = linkT.concat(temp["linkTableAdded"]);
							}
						}
						
						for(var p in args[arg]["patterns"]){
							var pattern = args[arg]["patterns"][p];
							if(typeof pattern["type"] === "undefined" || (typeof pattern["type"] !== "undefined" && pattern["type"] !== "bgp")){
								var temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								for(var clazz in temp["classTableAdded"]){
									classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
									classT[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
									allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
								}
								attributeTable = temp["attributeTable"];
								linkTable = temp["linkTable"];
								filterTable = temp["filterTable"];
								linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
								linkT = linkT.concat(temp["linkTableAdded"]);
							}
						}
						
						// find class from union block to connect to [+] class
						var object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");

						if(object == null){
							for(var subClass in classTableTemp){
								object = subClass;
								break;
							}
						}
						
						var linktype = "NOT";
						// connect founded class to [+] class with ++ link
						var link = {
							"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
							"object":object,
							"subject":unionClass,
							"isVisited":false,
							"linkType":linktype,
							"isSubQuery":false,
							"isGlobalSubQuery":false,
							"counter":orderCounter
						}
						linkTable.push(link);
						linkTableAdded.push(link);
						orderCounter++;
					} else {
							//TO DO
							//??????????
					}
				}
				
	return {"allClassesUnderUnion":allClassesUnderUnion,
		"allNodesUnderUnion":allNodesUnderUnion, 
		"classesTable":classesTable, 
		"filterTable":filterTable, 
		"attributeTable":attributeTable, 
		"linkTable":linkTable, 
		"linkTableAdded":linkTableAdded,
		"classTableTemp":classT,
		"linkTableTemp":linkT,
		}
}

function getWhereTriplesVaribles(where){
	var variableList = [];
	
	for(var key in where){
		if(typeof where[key]["type"] !== "undefined" && where[key]["type"] == "bgp"){
	
			var triples = where[key]["triples"];
			for(var triple in triples){
				
				var subject = vq_visual_grammar.parse(triples[triple]["subject"]);
				var object = vq_visual_grammar.parse(triples[triple]["object"]);
				if(subject["type"] == "varName"){
					if(typeof variableList[subject["value"]] === "undefined") variableList[subject["value"]] = 1;
					else variableList[subject["value"]] = variableList[subject["value"]] + 1;
				}
				if(object["type"] == "varName"){
					if(typeof variableList[object["value"]] === "undefined") variableList[object["value"]] = 1;
					else variableList[object["value"]] = variableList[object["value"]] + 1;
				}
			}
		}else if(typeof where[key] === 'object'){
			var temp = getWhereTriplesVaribles(where[key]);
			for(var variable in temp){
				if(typeof variableList[variable] === "undefined") variableList[variable] = temp[variable];
					else variableList[variable] = variableList[variable] + temp[variable];
			}
		}
	}
	return variableList;
}

function removeDuplicateConditions(conditions){
	var c = [];
	for(var con in conditions){
		c[conditions[con]] = conditions[con];
	}
	var cc = [];
	for(var con in c){
		cc.push(c[con])
	}
	return cc
}			