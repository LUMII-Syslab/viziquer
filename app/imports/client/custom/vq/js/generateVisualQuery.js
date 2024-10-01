// SPARQL Query Visualization

// Software Module to generate visual queries in ViziQuer from their SPARQL textual form.

// Authors: Jūlija Ovčiņņikova

// The module has been developed with partial support from Latvian Science Council project lzp-2021/1-0389 "Visual Queries in Distributed Knowledge Graphs" (since 2022).

import { Interpreter } from '/imports/client/lib/interpreter'
import { Utilities } from '/imports/client/platform/js/utilities/utils'

import { Projects, Compartments, Elements, ElementTypes, Diagrams} from '/imports/db/platform/collections'
import {OrthogonalCollectionRerouting} from '/imports/client/platform/js/editor/ajooEditor/ajoo/Elements/Lines/routing/orthogonal_rerouting';

import { dataShapes } from '/imports/client/custom/vq/js/DataShapes'
import { Create_VQ_Element, VQ_Element, Create_VQ_Element_Declaration } from './VQ_Element.js';
import { getDeclarations } from './genAbstractQuery.js';

import { isURI } from '/imports/client/custom/vq/js/transformations.js'

import * as vq_visual_grammar_parser from '/imports/client/custom/vq/js/vq_visual_grammar_parser.js'


// meteor npm install sparqljs

var x = 10;
var y = 10;
var width = 500;
var height = 60;
var counter = 0;
var VQ_Elements = {};
var VQ_Links = {};
var link_count = 0;
var showPrefixesForAllNames = false;

var directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
var indirectClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
var schemaName = null;
var isUnderUnion = false;
var orderCounter = 1;
var useRef = false;
var boxMoveY = 0;
var MinY = 10;
var MaxY = 10;
var classifiers = [];
var usedPrefixes = [];
var allPrefixes = [];
var starInSelect = false;

const async_Create_VQ_Element = async (location, isLink, target, source) => new Promise(resolve => {
    Create_VQ_Element(newElem => { resolve(newElem) }, location, isLink, target, source);
});

Interpreter.customMethods({
  // These method can be called by ajoo editor, e.g., context menu

generateVisualQueryAll: async function(queries, xx, yy, queryId, queryQuestion){
	  usedPrefixes = [];
	  allPrefixes = [];
	  x = xx;
	  y = yy;
	  MinY = yy;
	  MaxY = yy+120;
	  boxMoveY = 0;
	  orderCounter = 1;
	  useRef = false;
	  var prefixesText = [];
	  starInSelect = false;
	  schemaName = dataShapes.schema.schema;
	  // schemaName = "wikidata";
	   
	  directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
	  indirectClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
		allPrefixes = parsedQuery.prefixes;
		let proj = Projects.findOne({_id: Session.get("activeProject")});
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
			  
			  if(proj.showPrefixesForAllNames == true || proj.showPrefixesForAllNames == "true") showPrefixesForAllNames = true;
  
		 }
		 
		let prefixes = await dataShapes.getNamespaces();
		prefixes = combineKnownPrefixesWithDefinedPrefixes(prefixes);

		if(typeof prefixes["complete"] === "undefined"){
			prefixesText = [];
			for (const p of prefixes) {
				prefixesText.push("PREFIX " + p["name"] + ": <" + p["value"] + ">");
			}
		}
		var classif = await dataShapes.getClassifiers();
	
		if(classif["data"].length > 0){
			for(let c = 0; c < classif["data"].length; c++){	
				classifiers[classif["data"][c]["iri"]] = "("+ classif["data"][c]["classif_prefix"] + ") ";
			}
		}

	  // for(let query in queries){
     for (let query = 0; query < queries.length; query++) {
		 isUnderUnion = false;
		var text = queries[query]["sparql"];
		text = prefixesText.join("\n") + text;
		
		text = prefixesText.join("\n") + text;
		text = text.replace(/!(\s)*EXISTS/g, "NOT EXISTS")
	  // Utilities.callMeteorMethod("parseExpressionForCompletions", text);
	  Utilities.callMeteorMethod("parseSPARQLText", text, async function(parsedQuery) {
		// x = xx;
		y = yy;
		counter = 0;
		
		console.log("queryId:", queries[query]["id"], "--------------------------");
		
		parsedQuery = transformParsedQuery(parsedQuery, 0).expression;		
		// console.log(JSON.stringify(parsedQuery, 0, 2));

		// Get all variables (except class names) from a query SELECT statements, including subqueries.
		var variableList = await getAllVariablesInQuery(parsedQuery, []);
		var variableListAlias = await getAllVariablesForAlias(parsedQuery, []);
		
		// console.log("variableList", variableList);

		// Generate ViziQuer query abstract syntax tables
		let abstractTable = await generateAbstractTable(parsedQuery, [], variableList, []);
		abstractTable["linkTable"] = removeDuplicateLinks(abstractTable["linkTable"]);
		
		// console.log(JSON.stringify(abstractTable["classesTable"], 0, 2));
		// console.log("abstractTable", abstractTable);
		
		var classesTable = abstractTable["classesTable"];
		var classCount = Object.keys(classesTable).length;											
		// /*
		var whereTriplesVaribles = getWhereTriplesVaribles(parsedQuery["where"]);
		// Decide which class is a query start class
		
		// console.log("whereTriplesVaribles", whereTriplesVaribles);
		
		var tempN = await collectNodeList(parsedQuery["where"]);
		var nodeList = tempN["nodeList"];
		
		var tempGetStartClass = getStartClass(classesTable, abstractTable["linkTable"], nodeList);
		var startClass = tempGetStartClass["startClass"];
		classesTable = tempGetStartClass["classesTable"];
		
		for(let fil = 0; fil < abstractTable["filterTable"].length; fil++){
			if((typeof abstractTable["filterTable"][fil]["filterAdded"] !== "undefined" && abstractTable["filterTable"][fil]["filterAdded"] == false) || typeof tempGetStartClass.emptyClassSet !== "undefined"){
				if(typeof startClass["class"]["conditions"] === 'undefined') {
					startClass["class"]["conditions"] = [];
				}
				startClass["class"]["conditions"].push(abstractTable["filterTable"][fil]["filterString"])
				//console.log("condition 5", abstractTable["filterTable"][fil]["filterString"])
			}
		}

		var isNotConnectdClass = true;
		while(isNotConnectdClass == true){
			isNotConnectdClass = false;
			let ct = [];
			for(let cl in abstractTable["classesTable"]){
				if(typeof abstractTable["classesTable"][cl] !== "function"){
					ct[cl] = false;
				}
			}
			
			ct = connectNotConnectedQueryParts(startClass["name"], abstractTable["linkTable"], ct);
			for(let cl in ct){
				if(ct[cl] == false){
					isNotConnectdClass = true;
					let link = {
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
					"variableName":"[ ]",
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
					"variableName":"[ ]",
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
			let link = {
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
				for(let aggr = 0; aggr < startClass.class.aggregations.length; aggr++){
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
		for(let clazz in classesTable){
			if(typeof classesTable[clazz] !== "function"){
				visitedClasses[clazz] = false;
			}
		}
		visitedClasses[ startClass["name"]] = true;
		
		
		// Generate tree ViziQuer query structure, from class and link tables 
		var generateClassCtructuretemp = generateClassCtructure(startClass["class"], startClass["name"], classesTable, abstractTable["linkTable"], whereTriplesVaribles, visitedClasses, [], variableList);
		generateClassCtructuretemp = optimizeAggregationInStartClass(generateClassCtructuretemp);
		
		classesTable = generateClassCtructuretemp.clazz;
		let conditionLinks = generateClassCtructuretemp.conditionLinks;													 
		classesTable["orderings"] = abstractTable["orderTable"];
		classesTable["graphs"] = abstractTable["fromTable"];
		if(typeof classesTable["groupings"] !== "undefined") classesTable["groupings"] = classesTable["groupings"].concat( abstractTable["groupTable"]);
		else classesTable["groupings"] = abstractTable["groupTable"];
		if(typeof parsedQuery["limit"] !== 'undefined') classesTable["limit"] =  parsedQuery["limit"];
		else if(parsedQuery["queryType"] == "ASK") {
			classesTable["limit"] = 1;
			let attributeInfo = {
					"alias":"",
					"identification":null,
					"exp":"(select this)",
					"addLabel":false,
					"addAltLabel":false,
					"addDescription":false,
					"counter":0,
					"orderCounter":0
				}
			startClass["class"] = addAttributeToClass(startClass["class"], attributeInfo);
		};
		if(typeof parsedQuery["offset"] !== 'undefined' && parsedQuery["offset"] != 0) classesTable["offset"] =  parsedQuery["offset"];
		if(typeof parsedQuery["distinct"] !== 'undefined') classesTable["distinct"] =  parsedQuery["distinct"];
		if(abstractTable["serviceLabelLang"] !== '') classesTable["serviceLabelLang"] =  abstractTable["serviceLabelLang"];
		if(abstractTable["fullSPARQL"] !== '') classesTable["fullSPARQL"] =  abstractTable["fullSPARQL"];

		// Visualize query based on tree structure
		var queryId = queries[query]["id"];
		var queryQuestion = queries[query]["question"];
		
		VQ_Elements = {};
		VQ_Links = {};
		
		var variableListCount = getAllVariableCountInQuery(parsedQuery, []);

		await visualizeQuery(classesTable, variableListAlias, null, null, variableListCount, queryId, queryQuestion, usedPrefixes, starInSelect);

		for (let condLink of conditionLinks) {
			const linkName = condLink.identification.display_name ?? condLink.identification.short_name;
			const linkType = condLink.isNot ? "NOT" : "REQUIRED";
			const isInverse = condLink["isInverse"];
			const target = new VQ_Element(VQ_Elements[condLink.target]);
			const source = new VQ_Element(VQ_Elements[condLink.source]);
			 
			 var tCoordinates = target.getCoordinates();
			 var sCoordinates = source.getCoordinates();
			 
			var coordX = tCoordinates.x + tCoordinates.width - 20;
			let sourceAboveTarget = sCoordinates.y < tCoordinates.y;
			let coordY1 = sourceAboveTarget ? sCoordinates.y + sCoordinates.height : tCoordinates.y + tCoordinates.height;
			let coordY2 = sourceAboveTarget ? tCoordinates.y : sCoordinates.y;

			let linkLine;
			if (condLink.isInverse) {
			// locLink = [coordX, tCoordinates.y, coordX, coordY];
				const locLink = [coordX, coordY1, coordX, coordY2];
				linkLine = await async_Create_VQ_Element(locLink, true, source, target);
			} else {
			// locLink = [coordX, coordY, coordX, tCoordinates.y];
				const locLink = [coordX, coordY2, coordX, coordY1];
				linkLine = await async_Create_VQ_Element(locLink, true, target, source);
			}
			linkLine.setName(linkName);
			linkLine.setLinkType(linkType);
			linkLine.setNestingType("CONDITION");
			
		}

		// await delay(100);
		// var lines = {linkedLines: [], draggedLines: [], allLines: []};
		
		let editor = Interpreter.editor;
		
		let element_list = editor.getElements();
		var boxes = [];
		var lines = [];
		for(let elem_id in VQ_Elements){
			let element  = element_list[VQ_Elements[elem_id]];
			boxes.push(element)
		}
		
		for(let elem_id in VQ_Links){
			let element  = element_list[VQ_Links[elem_id]];
			lines.push(element)
		}
		
		await delay(500);
		Interpreter.execute("ComputeLayout", [x, yy, boxes, lines]);

	  });
	  
		await delay(5000);
		var idNumb = parseInt(queries[query]["id"], 10);
		if(idNumb % 10 === 0) {
			x = 10;
			yy = yy + 1000;
			y = yy;
		} else {
			x = x+800;
			y = yy;
		}
	  }
  },
  
generateVisualQuery: async function(text, xx, yy, queryId, queryQuestion){
	usedPrefixes = [];
	allPrefixes = [];
	starInSelect = false;
	orderCounter = 1;
	boxMoveY = 0;
	useRef = false;
	isUnderUnion = false;
	let prefixes = [];
	if(typeof dataShapes.schema.schema !== "undefined") prefixes = await dataShapes.getNamespaces();
	prefixes = combineKnownPrefixesWithDefinedPrefixes(prefixes);
	

	var classif = await dataShapes.getClassifiers();
	
	if(classif["data"].length > 0){
		for(let c = 0; c < classif["data"].length; c++){	
			classifiers[classif["data"][c]["iri"]] = "("+ classif["data"][c]["classif_prefix"] + ") ";
		}
	}

	if(typeof prefixes["complete"] === "undefined"){
		let prefixesText = [];

		for (const p of prefixes) {
			prefixesText.push("PREFIX " + p["name"] + ": <" + p["value"] + ">");
		}

		text  = prefixesText.join('\n') + text;
	}
	
	
	text = text.replace(/!(\s)*EXISTS/g, "NOT EXISTS")
	  // Utilities.callMeteorMethod("parseExpressionForCompletions", text);
	  Utilities.callMeteorMethod("parseSPARQLText", text, async function(parsedQuery) {
		Interpreter.destroyErrorMsg();
		if(parsedQuery.status === "ERROR")  {
			if(typeof dataShapes.schema.schema === "undefined"){
				if(parsedQuery.error.startsWith("Error: Unknown prefix: ")) {
					let prefix = parsedQuery.error.substring(23);
					prefixes = await dataShapes.getNamespaces();
					let prefixFound = false;
					for(let p = 0; p < prefixes.length; p++){
						if(prefixes[p]["name"] === prefix){
							text = "PREFIX " + prefix + ": <" + prefixes[p]["value"] + ">\n" + text;
							prefixFound = true;
							Interpreter.customExtensionPoints.generateVisualQuery(text, xx, yy);
							break;
						}
					}
					if(prefixFound === false) Interpreter.showErrorMsg(parsedQuery.error, -3);
				}
			}
			else Interpreter.showErrorMsg(parsedQuery.error, -3);
		}
		else {
		parsedQuery = parsedQuery.parsedQuery;
		schemaName = dataShapes.schema.schema;
		allPrefixes = parsedQuery.prefixes;
		x = xx;
		y = yy;
		MinY = yy;
		MaxY = y+120;
		counter = 0;
				  // console.log(JSON.stringify(parsedQuery, 0, 2));
		parsedQuery = transformParsedQuery(parsedQuery, 0).expression;
		// console.log(JSON.stringify(parsedQuery, 0, 2));

		directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
		indirectClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
		
		let proj = Projects.findOne({_id: Session.get("activeProject")});
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
			   if(proj.showPrefixesForAllNames == true || proj.showPrefixesForAllNames == "true" ) showPrefixesForAllNames = true;
			  
		 }

		// Get all variables (except class names) from a query SELECT statements, including subqueries.
		var variableList = await getAllVariablesInQuery(parsedQuery, []);
		var variableListAlias = await getAllVariablesForAlias(parsedQuery, []);
		
		// Generate ViziQuer query abstract syntax tables
		let abstractTable = await generateAbstractTable(parsedQuery, [], variableList, []);
		
		abstractTable["linkTable"] = removeDuplicateLinks(abstractTable["linkTable"]);
		
		// console.log(JSON.stringify(abstractTable["classesTable"], 0, 2));
		// console.log("abstractTable", abstractTable);
		
		var classesTable = abstractTable["classesTable"];
		
		var classCount = Object.keys(classesTable).length;

		var whereTriplesVaribles = getWhereTriplesVaribles(parsedQuery["where"]);
		// Decide which class is a query start class 
		
		var tempN = await collectNodeList(parsedQuery["where"]);
		var nodeList = tempN["nodeList"];

		var tempGetStartClass = getStartClass(classesTable, abstractTable["linkTable"], nodeList);

		var startClass = tempGetStartClass["startClass"];
		classesTable = tempGetStartClass["classesTable"];
			
		for(let fil = 0; fil < abstractTable["filterTable"].length; fil++){
			if((typeof abstractTable["filterTable"][fil]["filterAdded"] !== "undefined" && abstractTable["filterTable"][fil]["filterAdded"] == false) || typeof tempGetStartClass.emptyClassSet !== "undefined"){
				let _ = false;
				for(let v = 0; v < abstractTable["filterTable"][fil]["filterVariables"].length; v++){
					let filterVariable = abstractTable["filterTable"][fil]["filterVariables"][v];
					if(filterVariable.startsWith("@")) filterVariable = filterVariable.substring(1, filterVariable.length);
					if(typeof nodeList[filterVariable] !== "undefined"){
						// && Object.keys(findByVariableName(classesTable, triples[triple]["subject"]["value"])).length > 0 
						let classes = findByVariableName(classesTable, filterVariable);
						for(let cl in classes){
							if(typeof classes[cl] !== "function"){
								if(typeof classes[cl]["conditions"] === 'undefined') {
									classes[cl]["conditions"] = [];									
								}
								classes[cl]["conditions"].push(abstractTable["filterTable"][fil]["filterString"]);
								filterAdded = true;
								break;
							}
						}
					}
				}
				if(filterAdded === false){
					if(typeof startClass["class"]["conditions"] === 'undefined') {
						startClass["class"]["conditions"] = [];
					}
					startClass["class"]["conditions"].push(abstractTable["filterTable"][fil]["filterString"])
				}
				// console.log("condition 6", abstractTable["filterTable"][fil])
			}
		}
			
		var isNotConnectdClass = true;
		while(isNotConnectdClass == true){
			isNotConnectdClass = false;
			let ct = [];
			for(let cl in abstractTable["classesTable"]){
				if(typeof abstractTable["classesTable"][cl] !== "function"){
					ct[cl] = false;
				}
			}
			
			ct = connectNotConnectedQueryParts(startClass["name"], abstractTable["linkTable"], ct);

			for(let cl in ct){
				if(ct[cl] == false){
					isNotConnectdClass = true;
					let link = {
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
					"variableName":"[ ]",
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
					"variableName":"[ ]",
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
			let link = {
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
				if(typeof startClass.class.aggregations !== "undefined"){
					for(let aggr = 0; aggr < startClass.class.aggregations.length; aggr++){
						if(startClass.class.aggregations[aggr]["exp"].indexOf("(.)") !== -1){
							startClass.class.aggregations[aggr]["exp"] = startClass.class.aggregations[aggr]["exp"].replace("(.)", "(" + startClass.name + ")")
						} 
						unit["aggregations"].push(startClass.class.aggregations[aggr])	
					}
				}
				// unit["aggregations"] = startClass.class.aggregations;
				startClass.class.aggregations = null;
			}
			
			startClass = {"name": unit.name, "class":unit};
		}

		var visitedClasses = [];
		for(let clazz in classesTable){
			if(typeof classesTable[clazz] !== "function"){
				visitedClasses[clazz] = false;
			}
		}
		visitedClasses[ startClass["name"]] = true;

		// Generate tree ViziQuer query structure, from class and link tables 
		let generateClassCtructuretemp = generateClassCtructure(startClass["class"], startClass["name"], classesTable, abstractTable["linkTable"], whereTriplesVaribles, visitedClasses, [], variableList);

		generateClassCtructuretemp = optimizeAggregationInStartClass(generateClassCtructuretemp);
		

		classesTable = generateClassCtructuretemp.clazz;
		let conditionLinks = generateClassCtructuretemp.conditionLinks;
		classesTable["orderings"] = abstractTable["orderTable"];
		classesTable["graphs"] = abstractTable["fromTable"];
		
		if(typeof classesTable["groupings"] !== "undefined") classesTable["groupings"] = classesTable["groupings"].concat( abstractTable["groupTable"]);
		else classesTable["groupings"] = abstractTable["groupTable"];
		
		if(typeof parsedQuery["limit"] !== 'undefined') classesTable["limit"] =  parsedQuery["limit"];
		else if(parsedQuery["queryType"] == "ASK"){ 
			classesTable["limit"] = 1;
			let attributeInfo = {
					"alias":"",
					"identification":null,
					"exp":"(select this)",
					"addLabel":false,
					"addAltLabel":false,
					"addDescription":false,
					"counter":0,
					"orderCounter":0
				}
			startClass["class"] = addAttributeToClass(startClass["class"], attributeInfo);
		}

		if(typeof parsedQuery["offset"] !== 'undefined'  && parsedQuery["offset"] != 0) classesTable["offset"] =  parsedQuery["offset"];
		if(typeof parsedQuery["distinct"] !== 'undefined') classesTable["distinct"] =  parsedQuery["distinct"];
		if(abstractTable["serviceLabelLang"] !== '') classesTable["serviceLabelLang"] =  abstractTable["serviceLabelLang"];
		if(abstractTable["fullSPARQL"] !== '') classesTable["fullSPARQL"] =  abstractTable["fullSPARQL"];
		
		// Visualize query based on tree structure
		VQ_Elements = {};
		VQ_Links = {};
		var link_count2 = abstractTable["linkTable"].length;
		var variableListCount = getAllVariableCountInQuery(parsedQuery, []);
		await visualizeQuery(classesTable, variableListAlias, null, null, variableListCount, queryId, queryQuestion, usedPrefixes, starInSelect);
		// var i = 0;
		// while((Object.keys(VQ_Elements).length < classCount || link_count < link_count2)&& i < 100){
			// await delay(100);
			// i++;
		// }

		for (let condLink of conditionLinks) {
			const linkName = condLink.identification.display_name ?? condLink.identification.short_name;
			const linkType = condLink.isNot ? "NOT" : "REQUIRED";
			const isInverse = condLink["isInverse"];
			const target = new VQ_Element(VQ_Elements[condLink.target]);
			const source = new VQ_Element(VQ_Elements[condLink.source]);
			 
			 var tCoordinates = target.getCoordinates();
			 var sCoordinates = source.getCoordinates();
			 
			var coordX = tCoordinates.x + tCoordinates.width - 20;
			let sourceAboveTarget = sCoordinates.y < tCoordinates.y;
			let coordY1 = sourceAboveTarget ? sCoordinates.y + sCoordinates.height : tCoordinates.y + tCoordinates.height;
			let coordY2 = sourceAboveTarget ? tCoordinates.y : sCoordinates.y;

			let linkLine;
			if (condLink.isInverse) {
			// locLink = [coordX, tCoordinates.y, coordX, coordY];
				const locLink = [coordX, coordY1, coordX, coordY2];
				linkLine = await async_Create_VQ_Element(locLink, true, source, target);
			} else {
			// locLink = [coordX, coordY, coordX, tCoordinates.y];
				const locLink = [coordX, coordY2, coordX, coordY1];
				linkLine = await async_Create_VQ_Element(locLink, true, target, source);
			}
			linkLine.setName(linkName);
			linkLine.setLinkType(linkType);
			linkLine.setNestingType("CONDITION");
			
		}
		
		await delay(500); // TODO - kaut kā savādāk būtu jānoķer kompartmentu izveidošana
		// var lines = {linkedLines: [], draggedLines: [], allLines: []};
	
		let editor = Interpreter.editor;
		
		let element_list = editor.getElements();
		var boxes = [];
		var lines = [];
		for(let elem_id in VQ_Elements){
			let element  = element_list[VQ_Elements[elem_id]];
			boxes.push(element)
		}
		
		for(let elem_id in VQ_Links){
			let element  = element_list[VQ_Links[elem_id]];
			lines.push(element)
		}
		
		/*for(let elem_id in VQ_Elements){

			let element_list = editor.getElements();
			let element  = element_list[VQ_Elements[elem_id]];
			
			var elem_type = ElementTypes.findOne({name: "Class"});
			
			let compartments = element.compartments.compartments;
			
			var height = 10;
			
			var longes_compartment_lenght = 100;
			for(let compartment of compartments){
				if(longes_compartment_lenght<compartment.getTextWidth()) longes_compartment_lenght = compartment.getTextWidth();
				var num = ~~(compartment.getTextWidth() / 450)+1;
				height = height + ((compartment.getTextHeight()+5) * num) ;
			}
			if(height < 30) height = 30;
			var element_size = element.getSize();

			element_size.width = longes_compartment_lenght + 20;
			
			var box_obj = {resizedElement: element, minX: element_size.x, minY: MinY, maxX: element_size.x+longes_compartment_lenght + 20, maxY: height+MinY};

			element.updateElementSize(element_size.x, element_size.y, element_size.x+longes_compartment_lenght + 20, height+element_size.y);
			// var lines2 = {directLines: [], orthogonalLines: [], draggedLines: [], allLines: []};
			// element.collectLinkedLines(lines2, {});
			// OrthogonalCollectionRerouting.recomputeLines(editor, [box_obj], [], [], lines2.linkedOrthogonalLines, lines2.draggedLines);

			// var lines = [];
			
			// _.each(lines2.draggedLines, function(line_obj) {
				// var link = line_obj.line;
				// var line_points = link.getPoints().slice();
				// line_points[3] = MinY;
				// lines.push({_id: link._id, points: line_points});
			// });

			var list = {
				elementId: element._id,
				x: element_size.x,
				y: MinY,
				width: element_size["width"],
				height: height,
				lines: [],
				ports: [],
			};

			var resizing_shape = element.presentation;
			list["diagramId"] = Session.get("activeDiagram");
			Interpreter.executeExtensionPoint(elem_type, "resizeElement", list);
			MinY = MinY + height + 60;
		}*/

		Interpreter.execute("ComputeLayout", [xx, yy, boxes, lines]);
//
	  }
	  });
  },
});

const delay = ms => new Promise(res => setTimeout(res, ms));

// Generate ViziQuer query abstract syntax tables
async function generateAbstractTable(parsedQuery, allClasses, variableList, parentNodeList){
	// x = 200;
	// y = 10;
	//console.log("generateAbstractTable", parsedQuery, allClasses, variableList, parentNodeList)

	var selectVariables = transformSelectVariables(parsedQuery["variables"]);
	
	let abstractTable = [];
	//table with textual SPARQL query prefixes
	let prefixes = parsedQuery["prefixes"];

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
	var tempNS = await collectNodeListWithService(nodeWhere);

	var nodeList = tempN["nodeList"];
													  
	// For every structure in query WHERE part, create abstract tables instances. First triples, then the rest.
	for(let key = 0; key < where.length; key++){
		if(typeof where[key]["type"] !== "undefined" && where[key]["type"] == "bgp"){
			let wherePartTemp = await parseSPARQLjsStructureWhere(where[key], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
			classesTable = wherePartTemp["classesTable"];
			attributeTable = wherePartTemp["attributeTable"];
			linkTable = wherePartTemp["linkTable"];
			filterTable = wherePartTemp["filterTable"];
			bindTable = wherePartTemp["bindTable"];
		}
	}
	for(let key = 0; key < where.length; key++){
		if(where[key]["type"] != "group"){
			if(where[key]["type"] == "service" && where[key]["name"]["value"] == "http://wikiba.se/ontology#label"){

			}
			else if(typeof where[key]["type"] === "undefined" || (typeof where[key]["type"] !== "undefined" && where[key]["type"] !== "bgp" && where[key]["type"] !== "service")){
				let wherePartTemp = await parseSPARQLjsStructureWhere(where[key], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
			}
		}
	}
	
	for(let key = 0; key < where.length; key++){
		if(where[key]["type"] == "group" || where[key]["type"] == "service"){
			if(where[key]["type"] == "service" && where[key]["name"]["value"] == "http://wikiba.se/ontology#label"){
				
				for(let pattern = 0; pattern < where[key]["patterns"].length; pattern++){
					if(where[key]["patterns"][pattern]["triples"].length == 1 && where[key]["patterns"][pattern]["triples"][0]["subject"]["value"] == "http://www.bigdata.com/rdf#serviceParam"){
						for(let triple = 0; triple < where[key]["patterns"][pattern]["triples"].length; triple++){
							serviceLabelLang = where[key]["patterns"][pattern]["triples"][triple]["object"]["value"].replace(/"/g, "");
						}
					} else {
						 Utilities.callMeteorMethod("parseService", where[key], async function(parsedQuery) {
							 fullSPARQL = fullSPARQL + parsedQuery
						 })
					}
					await delay(20)
					console.log("fullSPARQL", fullSPARQL)
				}
			}
			else if(typeof where[key]["type"] === "undefined" || (typeof where[key]["type"] !== "undefined" && where[key]["type"] !== "bgp")){
				let wherePartTemp = await parseSPARQLjsStructureWhere(where[key], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
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
	if(typeof from !== "undefined"){
		for(let f = 0; f < from.default.length; f++){		
			let graphInstruction = "FROM";
			let graph = from.default[f]["value"];
			fromTable.push({
				"graph":graph,
				"graphInstruction":graphInstruction
			})
		}
		for(let f = 0; f < from.named.length; f++){	
			let graphInstruction = "FROM NAMED";
			let graph = from.named[f]["value"];
			fromTable.push({
				"graph":graph,
				"graphInstruction":graphInstruction
			})
		}
	}
	
	//order
	var order = parsedQuery["order"];
	if(typeof order !== "undefined"){
	for(let key = 0; key < order.length; key++){
		if(typeof order[key]["expression"]["termType"] !== "undefined"){
			let exp = getVariable(order[key]["expression"])["value"];
			
			var isSeen = false;
			let isDescending = false;
			if(typeof order[key]["descending"] !== 'undefined') isDescending = order[key]["descending"];
			if(typeof attributeTable[exp] !== 'undefined' && selectVariables.indexOf(exp) == -1 && (attributeTable[exp]["alias"] == "" || (attributeTable[exp]["identification"] != null && attributeTable[exp]["identification"]["local_name"] == attributeTable[exp]["alias"]))) {
				
				attributeTable[exp]["seen"] = true;
				isSeen = true;
			}

			orderTable.push({
				"exp":exp,
				"isDescending":isDescending
			})
		} else {
			let isDescending = false;
			if(typeof order[key]["descending"] !== 'undefined') isDescending = order[key]["descending"];
			
			useRef = true;
			
			var orderTemp = await parseSPARQLjsStructureWhere(order[key]["expression"], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
			
			if(orderTemp["viziQuerExpr"]["exprString"] != ""){
				let aggregateExpression = orderTemp.viziQuerExpr.exprString;

				orderTable.push({
					"exp":aggregateExpression,
					"isDescending":isDescending
				})
			} else if(order[key]["expression"]["type"] == "aggregate"){	
				let distinct = "";
				if(order[key]["expression"]["distinct"] == true)distinct = "DISTINCT ";
				
				let aggregateExpression;
				
				//agregate on expression
				if(typeof order[key]["expression"]["expression"]["termType"] === "undefined"){
					
					let temp = await parseSPARQLjsStructureWhere(order[key]["expression"]["expression"], nodeList, [], classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
					aggregateExpression = temp.viziQuerExpr.exprString;
					
					let aggregationExp = order[key]["expression"]["aggregation"] + "(" +distinct + aggregateExpression +")";
					orderTable.push({
						"exp":aggregationExp,
						"isDescending":isDescending
					})
				} else {
					let aggregateExpressionRes = getVariable(order[key]["expression"]["expression"])
					aggregateExpression = aggregateExpressionRes["value"];

					if(aggregateExpressionRes["type"] == "varName")aggregateExpression = "@"+aggregateExpression;
					
					let aggregationExp = order[key]["expression"]["aggregation"] + "(" +distinct + aggregateExpression +")";
					orderTable.push({
						"exp":aggregationExp,
						"isDescending":isDescending
					}) 
					
				}
				
			}
			useRef = false;
		}
	}
  }
	
	//select
	var variables = transformSelectVariables(parsedQuery["variables"], false);

	starInSelect = false;
	for(let key = 0; key < variables.length; key++){
		
		if(typeof variables[key] === 'string' && variables[key] == "*"){
			starInSelect = true;
			break;
			
		}
	}
	
	if(starInSelect == true){
		variables = variables.concat(tempNS["selectStarList"]);
		variables = variables.filter(function (el, i, arr) {
			return typeof el === "undefined" || (arr.indexOf(el) === i && el !== "*" && el.startsWith("g_") != true);
		});
	}
	
	var aggregationInSelect = false;
	
	
	for(let key = 0; key < variables.length; key++){
		let proj = Projects.findOne({_id: Session.get("activeProject")});
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
		
		//if(Object.keys(variables[key]).length != 0)
		if(typeof variables[key] === 'string'){
			if((serviceLabelLang != "" && 
			(variables[key].endsWith("Label") == true && typeof variableList[variables[key].substring(0, variables[key].length-5)] !== "undefined")
			|| (variables[key].endsWith("AltLabel") == true && typeof variableList[variables[key].substring(0, variables[key].length-8)] !== "undefined")
			|| (variables[key].endsWith("Description") == true && typeof variableList[variables[key].substring(0, variables[key].length-11)] !== "undefined")
			) || variables.indexOf("_"+variables[key]) !== -1){
				
			} else {
				let addVariable = true;
				for(let clazz in classesTable){
					if(typeof classesTable[clazz] !== "function" && typeof classesTable[clazz]["identification"] !== "undefined" && classesTable[clazz]["identification"] !== null){
						if(classesTable[clazz]["identification"]["short_name"] === "?" + variables[key]){
							addVariable = false;
						}
					}
					
				}
				
				// for(let clazz in nodeList){
					// if(typeof nodeList[clazz] !== "undefined"){
						// if(clazz ===  variables[key]){
							// addVariable = false;
						// }
					// }
					
				// }
				
				if(addVariable === true){
					var isVariable = false;
					for(let link = 0; link< linkTable.length; link++){
						if( typeof linkTable[link] !== "undefined" && typeof linkTable[link]["isVariable"] !== "undefined" && linkTable[link]["isVariable"] == true && (linkTable[link]["linkIdentification"]["short_name"] == variables[key] || starInSelect == true)){
							isVariable = true;
							if(linkTable[link]["linkIdentification"]["short_name"].startsWith("??")){
								linkTable[link]["linkIdentification"]["local_name"] = linkTable[link]["linkIdentification"]["local_name"].substring(1);
								linkTable[link]["linkIdentification"]["short_name"] = linkTable[link]["linkIdentification"]["short_name"].substring(1);
							}
							
							break;
						}
					}
					
					
					if(typeof bindTable[variables[key]] !== "undefined" && typeof bindTable[variables[key]]["class"] !== "undefined"){	
						var cl = classesTable[bindTable[variables[key]]["class"]];
						if(typeof cl["fields"] !== "undefined"){
							for(let field = 0; field < cl["fields"].length; field++){							
								if(typeof bindTable[cl["fields"][field]["alias"]] !== "undefined") cl["fields"][field]["isInternal"] = false;
							}
						}
					}
					
					//check kind (Class, reference or Property)
					//class
					
					
					// var classes2 = findByShortName(classesTable, variables[key]);
					// for(let clazz in classes2){
						// if(typeof classes2[clazz] !== "function"){
							// classesTable[clazz]["identification"]["short_name"] = classesTable[clazz]["identification"]["short_name"];
						// }
					// }		
					
					let classes = findByVariableName(classesTable, variables[key]);
					
					let nodeListService = await collectNodeListWithService(nodeWhere);
					let selectStarList = nodeListService.selectStarList;
					nodeListService = nodeListService.nodeList;
					// if(Object.keys(classes).length > 0 && typeof nodeList[variables[key]] !== "undefined"){
					if(Object.keys(classes).length > 0 && typeof nodeListService[variables[key]] !== "undefined"){
						
						//add class as attribute
						var parsedClass = getVariable(variables[key])["value"];
						let params = {name: parsedClass};
						if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
						var identification = await dataShapes.resolveClassByName(params);

						let addLabel = false;
						if(typeof variableList[variables[key]+"Label"] !== "undefined" && serviceLabelLang != "")addLabel = true;
						let addAltLabel = false;
						if(typeof variableList[variables[key]+"AltLabel"] !== "undefined" && serviceLabelLang != "")addAltLabel = true;
						let addDescription = false;
						if(typeof variableList[variables[key]+"Description"] !== "undefined" && serviceLabelLang != "")addDescription = true;
			
						let attributeInfo = {
							"alias":"",
							"identification":identification.data[0],
							"exp":"(select this)",
							"addLabel":addLabel,
							"addAltLabel":addAltLabel,
							"addDescription":addDescription,
							"counter":0,
							"orderCounter":0
						}

						orderCounter++;
						if(identification.complete == true) {
							let sn = identification.data[0].display_name;
							
							if(schemaName == "wikidata" && identification.data[0].prefix == "wd" && showPrefixesForAllNames !== true){}
							else if(identification.data[0].is_local != true || showPrefixesForAllNames == true)sn = identification.data[0].prefix+ ":" + sn;
							attributeInfo.identification.short_name = sn;	
						}
						for(let clazz in classes){
							if(typeof classes[clazz] !== "function"){
								classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
								// console.log("1", attributeInfo, classesTable[clazz])
							}
						}
						
						// let nodeListService = await collectNodeListWithService(nodeWhere);
						// let selectStarList = nodeListService.selectStarList;
						// nodeListService = nodeListService.nodeList;
						if(typeof nodeListService[variables[key]] === "undefined" && selectStarList.indexOf(variables[key]) === 0){
							let parsedAttributeRes = getVariable(variables[key]);	
							let parsedAttribute = parsedAttributeRes["value"];	
							if(typeof bindTable[parsedAttribute] === 'undefined'){		
								if(isVariable == false && variableList[variables[key]] != 1){
									let addLabel = false;
									let addAltLabel = false;
									let addDescription = false;
									for(let k = 0; k < variables.length; k++){
										if(typeof variables[k] === "string"){
											if(variables[k].endsWith("Label") == true && variables[k].startsWith(variables[key])) addLabel = true;
											if(variables[k].endsWith("AltLabel") == true && variables[k].startsWith(variables[key])) addAltLabel = true;
											if(variables[k].endsWith("Description") == true && variables[k].startsWith(variables[key])) addDescription = true;
										}
									}
									
									if(parsedAttributeRes["type"] == "varName")parsedAttribute = "@"+ parsedAttribute

									let attributeInfo = {
										"alias":"",
										"identification":null,
										"requireValues":false,
										"isInternal":false,
										"groupValues":false,
										"exp":parsedAttribute,
										"addLabel":addLabel,
										"addAltLabel":addAltLabel,
										"addDescription":addDescription,
										"counter":orderCounter,
										"orderCounter":orderCounter
									}
								
									orderCounter++;

									for(let clazz in classesTable){
										if(typeof classesTable[clazz] !== "function"){
											classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
											// console.log("1,5", attributeInfo, nodeList, variables[key]);
											break;
										}
									}
								} else if(variableList[variables[key]] == 1) {
									// Interpreter.showErrorMsg("Unbound variable '" + variables[key] + "' excluded from the visual presentation", -3);
								}
							}
						}
					} else if (Object.keys(findByShortName(classesTable, variables[key])).length > 0){
						
					}
					//reference
					else if(typeof variableList[variables[key]] !== 'undefined' && typeof attributeTable[variables[key]] === 'undefined' && variableList[variables[key]] > 0){	
						let parsedAttributeRes = getVariable(variables[key]);	
						let parsedAttribute = parsedAttributeRes["value"];	
						if(typeof bindTable[parsedAttribute] === 'undefined'){		
							if(isVariable == false){
								let addLabel = false;
								let addAltLabel = false;
								let addDescription = false;
								for(let k = 0; k < variables.length; k++){
									if(typeof variables[k] === "string"){
										if(variables[k].endsWith("Label") == true && variables[k].startsWith(variables[key])) addLabel = true;
										if(variables[k].endsWith("AltLabel") == true && variables[k].startsWith(variables[key])) addAltLabel = true;
										if(variables[k].endsWith("Description") == true && variables[k].startsWith(variables[key])) addDescription = true;
									}
								}
								
								if(parsedAttributeRes["type"] == "varName")parsedAttribute = "@"+ parsedAttribute
								
								let attributeInfo = {
									"alias":"",
									"identification":null,
									"requireValues":false,
									"isInternal":false,
									"groupValues":false,
									"exp":parsedAttribute,
									"addLabel":addLabel,
									"addAltLabel":addAltLabel,
									"addDescription":addDescription,
									"counter":orderCounter,
									"orderCounter":orderCounter
								}
							
								orderCounter++;
								
								for(let attr in attributeTable){
									
									if(typeof attributeTable[attr] !== "function" && attributeTable[attr]["exp"] === "?"+ variables[key]){
										addVariable = false;
									}
								}
								if(addVariable === true){
									for(let clazz in classesTable){
										if(typeof classesTable[clazz] !== "function"){
											classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
											// console.log("2", attributeInfo, classesTable[clazz], attributeTable)
											break;
										}
									}
								}
							} else if(variableList[variables[key]] == 1) {
								// Interpreter.showErrorMsg("Unbound variable '" + variables[key] + "' excluded from the visual presentation", -3);
							}
						} else if(variableList[parsedAttribute] != "seen") {
			
							let attributeInfo = {
								"alias":bindTable[parsedAttribute]["alias"],
								"identification":null,
								"requireValues":false,
								"isInternal":false,
								"groupValues":false,
								"exp":bindTable[parsedAttribute]["exp"],
								"counter":orderCounter,
								"orderCounter":orderCounter
							}
			
							orderCounter++;
							bindTable[parsedAttribute]["seen"] = true;

							for(let clazz in classesTable){
								if(typeof classesTable[clazz] !== "function"){
									classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
									// console.log("3", attributeInfo)
									break;
								}
							}
						}
					}
					
					
					//property
					
					if(typeof attributeTable[getVariable(variables[key])["value"]] !== 'undefined') {
						// add attribute
						let parsedAttribute = getVariable(variables[key])["value"];	
						let attributes = findByVariableName(attributeTable, parsedAttribute);
						
						for(let attribute in attributes){
						  if(typeof attributes[attribute] !== "function"){
							if(attributeTable[attribute]["seen"] != true){
								let attributeInfoTemp = attributeTable[attribute];
								let exp = attributeInfoTemp["identification"]["short_name"];
								if(typeof attributeInfoTemp.exp !== 'undefined') exp = attributeInfoTemp.exp;
								
								var attrAlias = attributeInfoTemp["alias"];
								if(attrAlias == "" && typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["identification"]["short_name"].indexOf(":")!= -1) attrAlias = attributeInfoTemp["identification"]["local_name"];
								
								let addLabel = false;
								if(typeof variableList[attrAlias+"Label"] !== "undefined" && serviceLabelLang != "")addLabel = true;
								let addAltLabel = false;
								if(typeof variableList[attrAlias+"AltLabel"] !== "undefined" && serviceLabelLang != "")addAltLabel = true;
								let addDescription = false;
								if(typeof variableList[attrAlias+"Description"] !== "undefined" && serviceLabelLang != "")addDescription = true;
								
								// if(typeof variableList[attrAlias] !== 'undefined' && variableList[attrAlias] <=1 ) attrAlias = "";
								var attributeConditionSelection = attributeInfoTemp["attributeCondition"];
								var attributeCondition = true;
								if(typeof attributeConditionSelection == "undefined") {
									attributeConditionSelection = "";
									attributeCondition = false;
								};
								let attributeInfo = {
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
									"counter":attributeInfoTemp["counter"],
									"orderCounter":attributeInfoTemp["orderCounter"],
									"attributeConditionSelection": attributeConditionSelection,
									"attributeCondition":attributeCondition
								}
								
								if(typeof attributeInfoTemp.bgp === "undefined") exp = "@"+exp;

								if(attributeTable[attribute]["class"] != attribute){
									classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
									// console.log("4", attributeInfoTemp,attributeInfo, variableList)
									attributeTable[attribute]["seen"] = true;
								}
							} else {
								attributeTable[attribute]["isInternal"] = false;
							}
							}
						}
					}
				}
			}
			
		} else if(typeof variables[key] === 'object' && typeof variables[key]["tableCounter"] === "undefined"){
			// if attribute with same name exists, use name_expr
			if(typeof attributeTable[variables[key]["variable"]] != "undefined" && typeof variableList[variables[key]["variable"]] !== "undefined" && variableList[variables[key]["variable"]] > 3) {	
				variableList[variables[key]["variable"]] = variableList[variables[key]["variable"]] - 3;
				variables[key]["variable"] = variables[key]["variable"]+"_expr";
				
				variableList[variables[key]["variable"]] = 2;
				
			}
			let alias = getVariable(variables[key]["variable"])["value"];
			var expression = variables[key]["expression"];
			//aggregation
			if(expression["type"] == "aggregate"){
				let distinct = "";
				if(expression["distinct"] == true)distinct = "DISTINCT ";
				
				let aggregateExpression;
				
				//agregate on expression
				// if(typeof expression["expression"] == "object"){
				if(typeof expression["expression"]["termType"] === "undefined" || expression["expression"]["termType"] != "Variable"){
					let temp = await parseSPARQLjsStructureWhere(expression["expression"], nodeList, [], classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
					
					aggregateExpression = temp.viziQuerExpr.exprString;
					if(aggregateExpression == "" && Object.keys(expression["expression"]).length == 0) aggregateExpression = "*";
					
					let aggregationExp = expression["aggregation"] + "(" +distinct + aggregateExpression +")";
					let aggregateInfo = {
						"exp":aggregationExp,
						"alias":alias
					}
					
					if(aggregateExpression == "*"){
						for(let clazz in classesTable){
							if(typeof classesTable[clazz] !== "function"){
								classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
								break;
							}
						}
					}
					
					for(let attr = 0; attr < temp["viziQuerExpr"]["exprVariables"].length; attr++){
						let attribute = temp["viziQuerExpr"]["exprVariables"][attr];
						if(attribute.startsWith("@")) attribute = attribute.substring(1)
						let inSameClass = false;
						if(attr == 0){
							let attributes = findByVariableName(attributeTable, attribute);
							for(let a in attributes){
								if(typeof attributes[a] !== "function"){
									for(let clazz in classesTable){
										if(typeof classesTable[clazz] !== "function"){
											if(clazz == attributeTable[a]["class"])inSameClass = true;
											classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
											break;
										}
									}
								}
							}
						}
						let attributes = findByVariableName(attributeTable, attribute);
						for(let attribute in attributes){
							if(typeof attributes[attribute] !== "function" &&((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["local_name"]) || attributeTable[attribute]["alias"] == "") && inSameClass == true)attributeTable[attribute]["seen"] = true;
						}
					}
					
					
				} else {
					let aggregateExpressionRes = getVariable(expression["expression"]);
					aggregateExpression = aggregateExpressionRes["value"];
					
					if(aggregateExpressionRes["type"] == "varName" && aggregateExpression != "*") aggregateExpression = "@"+aggregateExpression;

					let aggregationExp = expression["aggregation"] + "(" +distinct + aggregateExpression +")";
					
					//aggregate on class  
					let classes = findByVariableName(classesTable, expression["expression"]["value"]);

					if(Object.keys(classes).length == 1){
						if(expression["aggregation"].toLowerCase() == "count") {
							if(distinct == "") aggregationExp = "count(.)";
							else  aggregationExp = "count_distinct(.)";
						}
						let aggregateInfo = {
							"exp":aggregationExp,
							"alias":alias
						}
						for(let clazz in classes){
							if(typeof classes[clazz] !== "function"){
								classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
								break;
							}
						}
					} else if(Object.keys(classes).length > 1){
						
						for(let clazz in classesTable){
							if(typeof classesTable[clazz] !== "function"){
								if(expression["aggregation"].toLowerCase() == "count") {
									if(classesTable[clazz]["variableName"] !== expression["expression"]["value"]){
										if(distinct == "") aggregationExp = "count("+expression["expression"]["value"]+")";
										else  aggregationExp = "count_distinct("+expression["expression"]["value"]+")";;
									} else {
										if(distinct == "") aggregationExp = "count(.)";
										else  aggregationExp = "count_distinct(.)";
									}
								}
								let aggregateInfo = {
									"exp":aggregationExp,
									"alias":alias
								}
								
								classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);

								break;
							}
						}
					}
					//aggregate on attribute
					else if(Object.keys(findByVariableName(attributeTable, aggregateExpression)).length > 0) {
						let attributes = findByVariableName(attributeTable, aggregateExpression);
						for(let attribute in attributes){
							if(typeof attributes[attribute] !== "function"){
								if(attributeTable[attribute]["alias"] == "" && typeof attributeTable[attribute]["exp"] !== 'undefined') aggregationExp = expression["aggregation"] + "(" +distinct + attributeTable[attribute]["exp"] +")";
								
								let aggregateInfo = {
									"exp":aggregationExp,
									"alias":alias
								}

								let inSameClass = false;
								for(let clazz in classesTable){
									if(typeof classesTable[clazz] !== "function"){
										if(clazz == attributeTable[attribute]["class"]){
											inSameClass = true;
											classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
											break;
										}	
									}
								}
								if(inSameClass == false){
									for(let clazz in classesTable){
										if(typeof classesTable[clazz] !== "function"){
											classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
											break;
										}
									}
								}
								if(((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["local_name"]) || attributeTable[attribute]["alias"] == "" ) && inSameClass == true)attributeTable[attribute]["seen"] = true;
							}
						}
					} else {
						let aggregateInfo = {
								"exp":aggregationExp,
								"alias":alias
							}

						for(let clazz in classesTable){
							if(typeof classesTable[clazz] !== "function"){
								classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregateInfo);
								break;
							}
						}
					}
				}
			}
			//operation
			else if(expression["type"] == "operation"){
			
				let temp = await parseSPARQLjsStructureWhere(expression, nodeList, [], classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
				let operationExpression = temp["viziQuerExpr"]["exprString"];

				let attributeInfo = {
					"alias":getVariable(variables[key]["variable"])["value"],
					"identification":null,
					"requireValues":false,
					"isInternal":false,
					"groupValues":false,
					"exp":operationExpression,
					"counter":orderCounter,
					"orderCounter":orderCounter
				} 
				orderCounter++;
				for(let attr = 0; attr < temp["viziQuerExpr"]["exprVariables"].length; attr++){
					let attribute = temp["viziQuerExpr"]["exprVariables"][attr];
					let inSameClass = false;
					if(attr == 0){
						let attributes = findByVariableName(attributeTable, attribute);
							
						for(let a in attributes){
							if(typeof attributes[a] !== "function"){
								for(let clazz in classesTable){
									if(typeof classesTable[clazz] !== "function"){
										if(clazz == attributeTable[a]["class"])inSameClass = true;
										classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
										// console.log("5", attributeInfo)
										break;
									}
								}
							}
						}
						if(Object.keys(attributes.length == 0)){
							for(let clazz in classesTable){
								if(typeof classesTable[clazz] !== "function"){
									if(clazz == attribute)inSameClass = true;
									classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
									// console.log("6", attributeInfo)
									break;
								}
							}
						}
					}
					let attributes = findByVariableName(attributeTable, attribute);
					for(let attribute in attributes){
						if(typeof attributes[attribute] !== "function" && ((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["local_name"]) || attributeTable[attribute]["alias"] == "") && inSameClass == true)attributeTable[attribute]["seen"] = true;
					}
				}
			}
			//functionCall
			else if(expression["type"] == "functionCall"){
				 var exprFunction = expression["function"]["value"];
				var functionName = "<"+exprFunction+">"

				var shortFunction = await generateInstanceAlias(exprFunction);
				if(shortFunction != exprFunction) functionName = shortFunction;
				var viziQuerExpr = {
					"exprString" : "",
					"exprVariables" : []
				};

				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + functionName + "(";
				let args = [];
					
				for(let arg = 0; arg < expression["args"].length; arg++){
					if(typeof expression["args"][arg]["termType"] !== 'undefined') {
						let arg1 = generateArgument(expression["args"][arg]);
						if(arg1["type"] == "varName") {
							viziQuerExpr["exprVariables"].push(arg1["value"]);
						}
						args.push(arg1["value"]);
					}
					else if(typeof expression["args"][arg] == 'object'){
						let temp = await parseSPARQLjsStructureWhere(expression["args"][arg], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable, null);
						
						bindTable = temp["bindTable"];
						args.push(temp["viziQuerExpr"]["exprString"]);
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					}
				}
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ");
				// if(ignoreFunction == false) 
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + ")";
				
				let operationExpression = viziQuerExpr["exprString"];
				
				let attributeInfo = {
					"alias":getVariable(variables[key]["variable"])["value"],
					"identification":null,
					"requireValues":false,
					"isInternal":false,
					"groupValues":false,
					"exp":operationExpression,
					"counter":orderCounter,
					"orderCounter":orderCounter
				} 
				
				orderCounter++;
				for(let attr = 0; attr < viziQuerExpr["exprVariables"].length; attr++){
					let attribute = viziQuerExpr["exprVariables"][attr];
					let inSameClass = false;
					if(attr == 0){
						let attributes = findByVariableName(attributeTable, attribute);
							
						for(let a in attributes){
							if(typeof attributes[a] !== "function"){
								for(let clazz in classesTable){
									if(typeof classesTable[clazz] !== "function"){
										if(clazz == attributeTable[a]["class"])inSameClass = true;
										classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
										// console.log("7", attributeInfo)
										break;
									}
								}
							}
						}
						if(Object.keys(attributes.length == 0)){
							for(let clazz in classesTable){
								if(typeof classesTable[clazz] !== "function"){
									if(clazz == attribute)inSameClass = true;
									classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
									// console.log("8", attributeInfo)
									break;
								}
							}
						}
					}
					let attributes = findByVariableName(attributeTable, attribute);
					for(let attribute in attributes){
						if(typeof attributes[attribute] !== "function" && ((attributeTable[attribute]["identification"]!= null && attributeTable[attribute]["alias"] == attributeTable[attribute]["identification"]["local_name"]) || attributeTable[attribute]["alias"] == "") && inSameClass == true)attributeTable[attribute]["seen"] = true;
					}
				}
			}
		}	
	}
	
	for(let key = 0; key < variables.length; key++){	
		if(typeof variables[key]=== 'string' && serviceLabelLang != "" && 
		((variables[key].endsWith("Label") == true && typeof variableList[variables[key].substring(0, variables[key].length-5)] !== "undefined")
		 || (variables[key].endsWith("AltLabel") == true && typeof variableList[variables[key].substring(0, variables[key].length-8)] !== "undefined")
		 || (variables[key].endsWith("Description") == true && typeof variableList[variables[key].substring(0, variables[key].length-11)] !== "undefined"))
		){
			let classes = findByVariableName(classesTable, variables[key].substring(0, variables[key].length-5));
			let addLabel = false;
			let addAltLabel = false;
			let addDescription = false;
			
			if(variables[key].endsWith("Label") == true && typeof variableList[variables[key].substring(0, variables[key].length-5)] !== "undefined") addLabel = true;
			if(variables[key].endsWith("AltLabel") == true && typeof variableList[variables[key].substring(0, variables[key].length-8)] !== "undefined") addAltLabel = true;
			if(variables[key].endsWith("Description") == true && typeof variableList[variables[key].substring(0, variables[key].length-11)] !== "undefined") addDescription = true;
			
			for(let clazz in classes){
				if(typeof classes[clazz] !== "function"){
					if(typeof nodeList[classes[clazz]["variableName"]] !== "undefined"){
						var fields = classes[clazz]["fields"];
						var selectThisFound = false;
						if(typeof fields !== "undefined"){
							for(let field = 0; field < fields.length; field++){
								if(fields[field]["exp"] == "(select this)"){
									selectThisFound = true;
									break;
								}
							}
						}
						if(selectThisFound == false){
							let attributeInfo = {
									"alias":"",
									"identification":null,
									"requireValues":false,
									"isInternal":true,
									"groupValues":false,
									"exp":"(select this)",
									"addLabel":addLabel,
									"addAltLabel":addAltLabel,
									"addDescription":addDescription,
									"counter":0,
									"orderCounter":0
							} 
							orderCounter++;
							classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
							// console.log("9", attributeInfo)
						}	
					}
				}
			}
		}
	}
	
	
	//internal binds
	for(let bind in bindTable){
		if(typeof bindTable[bind] !== "function"){
			if(typeof bindTable[bind]["seen"] === "undefined"){
				let attributeInfo = {
							"alias":bindTable[bind]["alias"],
							"identification":null,
							"requireValues":false,
							"isInternal":true,
							"groupValues":false,
							"exp":bindTable[bind]["exp"],
							"counter":bindTable[bind]["counter"],
							"orderCounter":bindTable[bind]["orderCounter"]
				}
				// orderCounter++;
				for(let clazz in classesTable){
					if(typeof classesTable[clazz] !== "function"){
						classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
						// console.log("10", attributeInfo)
						break;
					}
				}
			}
		}
	}

	//internal attributes
	for(let attribute in attributeTable){
	  if(typeof attributeTable[attribute] !== "function"){
		 
		if(attributeTable[attribute]["seen"] != true || variableList[attribute] <= 1 || variableList[attribute] == 3){
			let attributeInfoTemp = attributeTable[attribute];
			var found = false;
			
			
			//if(typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["identification"]["max_cardinality"] == 1 && attributeInfoTemp["alias"] != ""){
			if(typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["alias"] != "" && (typeof variableList[attributeInfoTemp["alias"]] === "undefined" || variableList[attributeInfoTemp["alias"]] <=1)){
				
				if(variableList[attribute] <= 1 && typeof variableList["*"] == "undefined"){

					//orders
					if(attributeInfoTemp["requireValues"] == true){
						for(let order in orderTable){
							if(typeof orderTable[order] !== "function"){
								if((orderTable[order]["exp"] == attribute || orderTable[order]["exp"] == "@"+ attribute) && typeof attributeInfoTemp["exp"] === 'undefined'){
									found = true;
									orderTable[order]["exp"] = attributeInfoTemp["identification"]["short_name"];
									// console.log("REPLACE ORDER {h}", orderTable[order]["exp"]);
								}
							}
						}
					}
					//conditions
					if(typeof classesTable[attributeTable[attribute]["class"]]["conditions"] !== "undefined"){
						for(let condition = 0; condition < classesTable[attributeTable[attribute]["class"]]["conditions"].length; condition++){
							// if(!classesTable[attributeTable[attribute]["class"]]["conditions"][condition].includes(attributeInfoTemp["alias"]+")")){
								// if(classesTable[attributeTable[attribute]["class"]]["conditions"][condition].includes(attributeInfoTemp["alias"])) found = true;
								// if(typeof attributeInfoTemp["exp"] !== 'undefined') classesTable[attributeTable[attribute]["class"]]["conditions"][condition] = classesTable[attributeTable[attribute]["class"]]["conditions"][condition].replace(attributeInfoTemp["alias"], attributeInfoTemp["exp"]);
								// else classesTable[attributeTable[attribute]["class"]]["conditions"][condition] = classesTable[attributeTable[attribute]["class"]]["conditions"][condition].replace(attributeInfoTemp["alias"], attributeInfoTemp["identification"]["short_name"]);
							// }
							
							let attributeNameSplit = classesTable[attributeTable[attribute]["class"]]["conditions"][condition].split(/([\w|:]+)/)
						
							let replaceIndex = attributeNameSplit.indexOf(attributeInfoTemp["alias"])
							if(replaceIndex != -1) {
								// console.log("attributeNameSplit", attributeNameSplit, attributeNameSplit[replaceIndex-1].slice(-1))
								if(replaceIndex > 0 && attributeNameSplit[replaceIndex-1].slice(-1) == "@") attributeNameSplit[replaceIndex-1] = attributeNameSplit[replaceIndex-1].substring(0, attributeNameSplit[replaceIndex-1].length-1)
								found = true;
								if(typeof attributeInfoTemp["exp"] !== 'undefined') attributeNameSplit[replaceIndex] = attributeInfoTemp["exp"];
								else attributeNameSplit[replaceIndex] = attributeInfoTemp["identification"]["short_name"];
								classesTable[attributeTable[attribute]["class"]]["conditions"][condition] = attributeNameSplit.join("");
							}
						}
					}
					//fields
					if(typeof classesTable[attributeTable[attribute]["class"]]["fields"] !== "undefined"){
						for(let field = 0; field < classesTable[attributeTable[attribute]["class"]]["fields"].length; field++){
							
							if(classesTable[attributeTable[attribute]["class"]]["fields"][field]["alias"] != attributeInfoTemp["alias"] && classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"] != "(select this)"){
		
								let attributeNameSplit = classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"].split(/([\w|:]+)/)
								
								let replaceIndex = attributeNameSplit.indexOf(attributeInfoTemp["alias"]);	

								if(replaceIndex != -1) {
									if(replaceIndex > 0 && attributeNameSplit[replaceIndex-1].slice(-1) == "@") attributeNameSplit[replaceIndex-1] = attributeNameSplit[replaceIndex-1].substring(0, attributeNameSplit[replaceIndex-1].length-1)
									 found = true;
									 if(typeof attributeInfoTemp["exp"] !== 'undefined') attributeNameSplit[replaceIndex] = attributeInfoTemp["exp"];
									 else attributeNameSplit[replaceIndex] = attributeInfoTemp["identification"]["short_name"];
									 classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"] = attributeNameSplit.join("");
									 // if(attributeInfoTemp.requireValues == true) classesTable[attributeTable[attribute]["class"]]["fields"][field]["requireValues"] = true;
								}
							}
						}
					}
				}
				
			}
			if(typeof attributeInfoTemp["identification"] !== 'undefined' && attributeInfoTemp["alias"] != "" && (typeof variableList[attributeInfoTemp["alias"]] === "undefined" || variableList[attributeInfoTemp["alias"]] <=1 || variableList[attribute] == 3)){
				//agregations
				if(typeof classesTable[attributeTable[attribute]["class"]]["aggregations"] !== "undefined"){
					
					

					for(let aggregation = 0; aggregation < classesTable[attributeTable[attribute]["class"]]["aggregations"].length; aggregation++){
						if(classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].indexOf("(.)") == -1 && variableList[attribute] <= 1 || (variableList[attribute] == 4 && classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["alias"] == attributeInfoTemp["alias"])){
							
							var isRequire = false;
							if(attributeInfoTemp["requireValues"]== true) isRequire = true;
							if(classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].includes(attributeInfoTemp["alias"])) found = true;
							if(typeof attributeInfoTemp["exp"] !== 'undefined') {
								classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"] = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["exp"])
								if(classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].indexOf(attributeInfoTemp["alias"]) !== -1) classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["requireValues"] = isRequire;
								
							}else {
								//classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"] = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].replace(attributeInfoTemp["alias"], attributeInfoTemp["identification"]["short_name"]);
								if(classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].indexOf(attributeInfoTemp["alias"]) !== -1) classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["requireValues"] = isRequire;	

								let attributeNameSplit = classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"].split(/([\w|:]+)/)
								let replaceIndex = attributeNameSplit.indexOf(attributeInfoTemp["alias"]);	

								if(replaceIndex != -1) {
									if(replaceIndex > 0 && attributeNameSplit[replaceIndex-1].slice(-1) == "@") attributeNameSplit[replaceIndex-1] = attributeNameSplit[replaceIndex-1].substring(0, attributeNameSplit[replaceIndex-1].length-1)
									if(typeof attributeInfoTemp["exp"] !== 'undefined') attributeNameSplit[replaceIndex] = attributeInfoTemp["exp"];
									else attributeNameSplit[replaceIndex] = attributeInfoTemp["identification"]["short_name"];
									classesTable[attributeTable[attribute]["class"]]["aggregations"][aggregation]["exp"] = attributeNameSplit.join("");
								}
							}
							if(typeof classesTable[attributeTable[attribute]["class"]]["fields"] !== "undefined"){
								for(let field = 0; field < classesTable[attributeTable[attribute]["class"]]["fields"].length; field++){
									if(classesTable[attributeTable[attribute]["class"]]["fields"][field]["alias"] == attributeInfoTemp["alias"]) delete classesTable[attributeTable[attribute]["class"]]["fields"][field];
								}
							}
						}
					}
				}
				if(typeof classesTable[attributeTable[attribute]["class"]]["fields"] !== "undefined"){
				//fields
				  if(typeof classesTable[attributeTable[attribute]["class"]]["fields"] !== "undefined"){
					for(let field = 0; field < classesTable[attributeTable[attribute]["class"]]["fields"].length; field++){
					  if(typeof classesTable[attributeTable[attribute]["class"]]["fields"][field] !== "undefined"){
						if(classesTable[attributeTable[attribute]["class"]]["fields"][field]["alias"] == attributeTable[attribute]["alias"] &&
						   classesTable[attributeTable[attribute]["class"]]["fields"][field]["counter"] == attributeTable[attribute]["counter"]
						){
							
						} else {
							if(classesTable[attributeTable[attribute]["class"]]["fields"][field]["alias"] == attributeInfoTemp["alias"] && classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"] != "(select this)"){
		
								let attributeNameSplit = classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"].split(/([\w|:]+)/)
								
								let replaceIndex = attributeNameSplit.indexOf(attributeInfoTemp["alias"]);	

								if(replaceIndex != -1) {
									if(replaceIndex > 0 && attributeNameSplit[replaceIndex-1].slice(-1) == "@") attributeNameSplit[replaceIndex-1] = attributeNameSplit[replaceIndex-1].substring(0, attributeNameSplit[replaceIndex-1].length-1)
									 found = true;
									 if(typeof attributeInfoTemp["exp"] !== 'undefined') attributeNameSplit[replaceIndex] = attributeInfoTemp["exp"];
									 else attributeNameSplit[replaceIndex] = attributeInfoTemp["identification"]["short_name"];
									 classesTable[attributeTable[attribute]["class"]]["fields"][field]["exp"] = attributeNameSplit.join("");
								}
							}
						}
					  }
					}
				  }
				}
			}
			if(found == false && attributeTable[attribute]["seen"] != true){
				let exp = attributeInfoTemp["exp"];
				if(typeof exp === 'undefined') exp = attributeInfoTemp["identification"]["short_name"];
				let attributeInfo = {
						"alias":attributeInfoTemp["alias"],
						"identification":attributeInfoTemp["identification"],
						"requireValues":attributeInfoTemp["requireValues"],
						"isInternal":true,
						"groupValues":false,
						"exp":exp,
						"graph":attributeInfoTemp["graph"],
						"graphInstruction":attributeInfoTemp["graphInstruction"],
						"counter":attributeInfoTemp["counter"],
						"orderCounter":attributeInfoTemp["orderCounter"]
				} 
			
				classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
				// console.log("path", attributeInfo, attributeTable[attribute], attributeTable[attribute]["seen"])
			}
		}
	  }
	}
	
	//group
	var group = parsedQuery["group"];
	for(let key in group){
		if(typeof group[key] !== "function"){
			let exp = getVariable(group[key]["expression"])["value"];
			let classes = findByVariableName(classesTable, group[key]["expression"]["value"]);
			
			if(Object.keys(classes).length > 0){
				for(let clazz in classes){
					if(typeof classes[clazz] !== "function" && (typeof classesTable[clazz]["identification"] === "undefined" || classesTable[clazz]["identification"] == null)){
						classesTable[clazz]["groupByThis"] = true;
					}
				}
			} 
			else {
				var inSelect = false;
				for(let k in variables){	
					if(typeof variables[k] === 'string' && variables[k] == group[key]["expression"]["value"]){
						inSelect = true;
					}
				}
				if(inSelect == false) {
					groupTable.push(exp); 
				}
			}
		}

	}

	return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, orderTable:orderTable, groupTable:groupTable, nodeList:nodeList, serviceLabelLang:serviceLabelLang, fullSPARQL:fullSPARQL, fromTable:fromTable};
}

function connectNotConnectedClasses(classesTable, linkTable, nodeList){
	for(let clazz in classesTable){
		if(typeof classesTable[clazz] !== "function"){
			var clazzFound = false;
			for(let link = 0; link< linkTable.length; link++){
			  if(typeof linkTable[link] !== "undefined"){
				if((linkTable[link]["subject"] == clazz && typeof classesTable[linkTable[link]["object"]] !== "undefined") || (linkTable[link]["object"] == clazz && typeof classesTable[linkTable[link]["subject"]] !== "undefined")) {
				//if((linkTable[link]["subject"] == clazz ) || (linkTable[link]["object"] == clazz )) {
					clazzFound = true;
					break;
				}
			  }
			}
			if(clazzFound == false){
				
				var equalClasses = connectEqualClasses(classesTable[clazz]["variableName"], nodeList, linkTable);
		
				if(equalClasses["linkAdded"] == true) linkTable = equalClasses["linkTable"];
				else{
					for(let clazz2 in classesTable){
						if(typeof classesTable[clazz2] !== "function"){
							if(clazz != clazz2){
								let link = {
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
									link["serviceSchemaName"] = classesTable[clazz2]["serviceSchemaName"];
								}
								
								if(typeof classesTable[clazz]["graphInstruction"] !== "undefined" && typeof classesTable[clazz]["graph"] !== "undefined"){
									link["graphInstruction"] = classesTable[clazz]["graphInstruction"];
									link["graph"] = classesTable[clazz]["graph"];
									link["serviceSchemaName"] = classesTable[clazz]["serviceSchemaName"];
								}
								
								linkTable.push(link);
								orderCounter++;
								break;
							}
						}
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
		for(let link = 0; link< linkTable.length; link++){
		  if(typeof linkTable[link] !== "undefined"){
			if(linkTable[link]["subject"] == clazz){
				classesTable = connectNotConnectedQueryParts(linkTable[link]["object"], linkTable, classesTable)
			} else if(linkTable[link]["object"] == clazz){
				classesTable = connectNotConnectedQueryParts(linkTable[link]["subject"], linkTable, classesTable)
			} 
		  }
		}
	}
	return classesTable
}

function connectEqualClasses(node, nodeList, linkTable){
		var linkAdded = false;		
		if(typeof nodeList[node] !== "undefined" && Object.keys(nodeList[node]["uses"].length > 1)){
			
			var linkNodes = [];
			for(let use in nodeList[node]["uses"]){
				if(typeof nodeList[node]["uses"][use] !== "function"){
					
					var nodeInLinkTable = false;
					for(let link = 0; link< linkTable.length; link++){
					 if(typeof linkTable[link] !== "undefined"){
						if(linkTable[link]["subject"] == nodeList[node]["uses"][use] || linkTable[link]["object"] == nodeList[node]["uses"][use]) {
							nodeInLinkTable = true;
							break;
						}
					 }
					}
					if(nodeInLinkTable == false) linkNodes.push(use);
				}
			}
			if(linkNodes.length > 1) {
				linkAdded = true;
				let subject = linkNodes[0];
				for (let i = 1; i < linkNodes.length; i++) {
					if(!subject.includes("[ + ]") && !linkNodes[i].includes("[ + ]")){
						let link = {
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

function connectAllClasses(classesTable, linkTable, allClasses){
	
	if(Object.keys(classesTable.length > 1)){
		for(let clazz in classesTable){
			if(typeof classesTable[clazz] !== "function"){
				if(classesTable[clazz]["variableName"] != "[ + ]" && typeof allClasses[clazz] === 'undefined'){
					
					var classNotConnected = true;
					for(let link = 0; link< linkTable.length; link++){
					 if(typeof linkTable[link] !== "undefined"){
						if(linkTable[link]["object"] == clazz || linkTable[link]["subject"] == clazz){
							classNotConnected = false;
							break;
						}
					 }
					}
					if(classNotConnected == true){
						var classToConnect;
						for(let c in classesTable){
							if(typeof classesTable[c] !== "function"){
								if(c != clazz && classesTable[c]["variableName"] != "[ + ]"){
									classToConnect = c;
									break;
								}
							}
						}
						if(typeof classToConnect !== 'undefined'){
							let link = {
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
		let triples = where["triples"];
		let temp = await generateTypebgp(triples, nodeList, parentNodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList, selectVariables);
		
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
		let patterns = where["patterns"];
		var visited = false;
		//if optional attribute
		if(patterns.length == 1 && patterns[0]["type"] == "bgp" && patterns[0]["triples"].length == 1){
			bgptype = "optional";
		} //rdfs:label@en
		else if(patterns.length == 2 &&
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
			let triples = patterns[0]["triples"];
			let temp = await generateTypebgp(triples, nodeList, parentNodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList, selectVariables);
			classesTable = temp["classesTable"];
			attributeTable = temp["attributeTable"];
			classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
			attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
			linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
			
			for(let attr = 0; attr < attributeTableAdded.length; attr++){
				
				let isInternal = false;
				if(typeof variableList[attributeTable[attributeTableAdded[attr]]["alias"]] !== 'undefined' && variableList[attributeTable[attributeTableAdded[attr]]["alias"]] > 1){
					isInternal = false;
				} else isInternal = true;
				
				let className = attributeTable[attributeTableAdded[attr]]["class"];
				let attributeInfo = {
					"alias":attributeTable[attributeTableAdded[attr]]["alias"],
					"identification":attributeTable[attributeTableAdded[attr]]["identification"],
					"exp": attributeTable[attributeTableAdded[attr]]["identification"]["short_name"]+"@"+ patterns[1]["expression"]["args"][1]["value"].replace(/\"/g,''),
					// "exp": attributeTable[attributeTableAdded[attr]]["identification"]["short_name"]+ patterns[1]["expression"]["args"][1].replace(/\"/g,''),
					"counter":attributeTable[attributeTableAdded[attr]]["counter"],
					"orderCounter":attributeTable[attributeTableAdded[attr]]["orderCounter"],
					"isInternal":isInternal,
				}

				let classes = findByVariableName(classesTable, className);
				if(Object.keys(classes).length > 0){
					for(let clazz in classes){
						if(typeof classes[clazz] !== "function"){
							classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
							// console.log("12", attributeInfo, attributeTable[attributeTableAdded[attr]])
						}
					}
				}
				attributeTable[attributeTableAdded[attr]]["seen"] = true;
			}
			
			for(let attr = 0; attr < linkTableAdded.length; attr++){
				
				let className;
				if(typeof classTableAdded[linkTableAdded[attr]["object"]] !== "undefined") className = linkTableAdded[attr]["object"];
				else className = linkTableAdded[attr]["subject"];
				
				let isInternal = false;
				if(typeof variableList[classesTable[classTableAdded[attr]]["variableName"]] !== 'undefined' && variableList[classesTable[classTableAdded[attr]]["variableName"]] > 1){
					isInternal = false;
				} else isInternal = true;
				
	
				let attributeInfo = {
					"alias":classesTable[classTableAdded[attr]]["instanceAlias"],
					"identification":linkTableAdded[attr]["linkIdentification"],
					"exp": linkTableAdded[attr]["linkIdentification"]["short_name"]+"@"+ patterns[1]["expression"]["args"][1]["value"].replace(/\"/g,''),
					// "exp": attributeTable[attributeTableAdded[attr]]["identification"]["short_name"]+ patterns[1]["expression"]["args"][1].replace(/\"/g,''),
					"counter":orderCounter,
					"orderCounter":linkTableAdded[attr]["orderCounter"],
					"isInternal":isInternal,
				}
				orderCounter ++;
				let classes = findByVariableName(classesTable, className);
				if(Object.keys(classes).length > 0){
					for(let clazz in classes){
						if(typeof classes[clazz] !== "function"){
							classesTable[clazz] = addAttributeToClass(classesTable[clazz], attributeInfo);
							// console.log("12a", attributeInfo, attributeTable[attributeTableAdded[attr]])
						}
					}
				}
				attributeTable[classTableAdded[attr]] = [];
				attributeTable[classTableAdded[attr]]["seen"] = true;
				delete classesTable[classTableAdded[attr]];
			}
			linkTableAdded = [];
			classTableAdded = [];
	
		} else if(patterns.length == 1 && patterns[0]["type"] == "blankNode"){
			bgptype = "optional";
		} else {
			bgptype = "optionalLink";
		}
		
		if(patterns.length == 2 && patterns[0]["type"] == "bgp" && patterns[1]["type"] == "filter" && visited == false){
									  
			bgptype = "optional";
			let temp = await parseSPARQLjsStructureWhere(patterns[0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
			if(temp["attributeTableAdded"].length == 1){		
				attributeTable = temp["attributeTable"];
				attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
				if(patterns[1]["expression"]["args"].length == 2 && temp["attributeTableAdded"][0] == patterns[1]["expression"]["args"][0]["value"]){
					var operators = ["=", "!=" , "<=" , ">=" ,"<" , ">"]
					if(patterns[1]["expression"]["type"] == "operation" && operators.indexOf(patterns[1]["expression"]["operator"]) != -1 && patterns[1]["expression"]["args"][1]["termType"] == "Literal" && patterns[1]["expression"]["args"][1]["language"] == ""){
						var attributeCondition = patterns[1]["expression"]["operator"] + patterns[1]["expression"]["args"][1]["value"];
						attributeTable[temp["attributeTableAdded"][0]]["attributeCondition"] = attributeCondition;
					}
				}
				visited = true;
			}
		}
		
		if(visited == false){
			for(let pattern  = 0; pattern < patterns.length; pattern++) {
				if(typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] == "bgp"){
					let temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
					classesTable = temp["classesTable"];
					attributeTable = temp["attributeTable"];
					filterTable = temp["filterTable"];
					linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
					classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
					attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
					bindTable = temp["bindTable"];
				}
			}
			
			for(let pattern  = 0; pattern < patterns.length; pattern++) {
				if(typeof patterns[pattern]["type"] === "undefined" || (typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] !== "bgp")){
					let temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
			for(let link = 0; link< linkTableAdded.length; link++){
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
						"variableName":"[ ]",
						"identification":null,
						"instanceAlias":"",
						"isVariable":false,
						"isUnit":true,
						"isUnion":false
					};
					unitClass = "[ ]";
					classTableAdded.push("[ ]");
					nodeList["[ ]"]= {uses: {"[ ]": "class"}, count:1};
				}else {
					classesTable["[ ]"+counter] = {
						"variableName":"[ ]",
						"identification":null,
						"instanceAlias":"",
						"isVariable":false,
						"isUnit":true,
						"isUnion":false
					};
					unitClass = "[ ]"+counter;
					classTableAdded.push("[ ]"+counter);
					if(typeof nodeList["[ ]"] === 'undefined') nodeList["[ ]"] = {uses: [], count:1}
					nodeList["[ ]"]["uses"]["[ ]"+counter] = "class";
					nodeList["[ ]"]["count"] = nodeList["[ ]"]["count"]+1;
					counter++;
				}
				
				var parentClass;
					
				for(let link = 0; link< linkTableAdded.length; link++){
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
				
				let link = {
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
				let optionalLinkFound = false;
				for(let link = 0; link< linkTableAdded.length; link++){
					if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
						linkTableAdded[link]["linkType"] = "OPTIONAL";
						optionalLinkFound = true;
						break;
					}
				}
				if(optionalLinkFound == false){
					for(let link = 0; link< linkTableAdded.length; link++){
						linkTableAdded[link]["linkType"] = "OPTIONAL";
						break;
					}
				}
			}
			bgptype = "plain";
			
			// Ja zem optional ir viens objektu propertijas trijnieks, kur trijnieka object virsotne ir tukša (vai ar (select this) atribūtu), bez izejošām saitēm, pārveido saiti par subject klases atribūtu.
			if(patterns.length == 1 && patterns[0]["type"] == "bgp" && patterns[0]["triples"].length == 1 && linkTableAdded.length == 1){
				if(typeof classesTable[linkTableAdded[0]["object"]] !== "undefined" && typeof classesTable[linkTableAdded[0]["subject"]] !== "undefined" 
				&& linkTableAdded[0]["object"].indexOf("[") == -1 && linkTableAdded[0]["object"].indexOf(":") == -1
				&& linkTableAdded[0]["linkIdentification"]["short_name"].indexOf("|") == -1
				&& linkTableAdded[0]["linkIdentification"]["short_name"].indexOf(".") == -1){

					let childerenClass  = classesTable[linkTableAdded[0]["object"]];

					let exp = linkTableAdded[0]["linkIdentification"]["short_name"];
						var requred = true;
						if(linkTableAdded[0]["linkType"] == "OPTIONAL") requred = false;
						var internal = true;
						let addLabel = false;
						let addAltLabel = false;
						let addDescription = false;
						var attrAlias = childerenClass["instanceAlias"];						
						
						if(typeof childerenClass["fields"] !== 'undefined' && childerenClass["fields"].length == 1 && childerenClass["fields"][0]["exp"] == "(select this)"){
							internal = false;
							if(typeof childerenClass["fields"][0]["isInternal"] !== "undefined") internal = childerenClass["fields"][0]["isInternal"];
							addLabel = childerenClass["fields"][0]["addLabel"];
							addAltLabel = childerenClass["fields"][0]["addAltLabel"];
							addDescription = childerenClass["fields"][0]["addDescription"];
						} else if(typeof variableList[attrAlias+"Label"] !== "undefined"){
							addLabel = true;
						}
						var variableName = attrAlias;
						if(attrAlias == exp) attrAlias = "";
						if(selectVariables.indexOf(attrAlias) !== -1)internal = false;
						let attributeInfo = {
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
							"serviceSchemaName":linkTableAdded[0]["serviceSchemaName"],
							"seen":true,
							"counter":linkTableAdded[0]["counter"],
							"orderCounter":linkTableAdded[0]["orderCounter"]
						}

						if(typeof attributeTable[variableName] === "undefined") attributeTable[variableName] = attributeInfo;
						
						attributeTableAdded.push(variableName);
						

						classesTable[linkTableAdded[0]["subject"]] = addAttributeToClass(classesTable[linkTableAdded[0]["subject"]], attributeInfo);
						// console.log("13", attributeInfo, selectVariables)
						
						for(let link = 0; link< linkTable.length; link++){
							if(typeof linkTable[link] !== "undefined"){
								if(linkTable[link]["object"] == linkTableAdded[0]["object"] && linkTable[link]["subject"] == linkTableAdded[0]["subject"] && linkTable[link]["linkIdentification"]["short_name"] == linkTableAdded[0]["linkIdentification"]["short_name"]){
									
									delete linkTable[link];
								}
							}
						}
	
						var linkCount = 0;
						
						for(let link = 0; link< linkTable.length; link++){
							if(typeof linkTable[link] !== "undefined"){
								if(linkTable[link]["object"] == linkTableAdded[0]["object"] || linkTable[link]["subject"] == linkTableAdded[0]["object"]) {
									linkCount++
								}
							}
						}
						
						if(linkCount <= 1) {
							// delete classesTable[linkTableAdded[0]["object"]];
							classesTable[linkTableAdded[0]["object"]]["toBeDeleted"] = true;
						}
						
						linkTableAdded = [];
				}
			} 
			
			if(linkTable.length == 0) linkTable = linkTableAdded;
			
		}
	}
	
	//type=values
	if(where["type"] == "values" || typeof where["values"] !== 'undefined'){
		
		let values = [];
		for(let v = 0; v < where["values"].length; v++){
			values = values.concat(Object.keys(where["values"][v]));
			if(values.indexOf("tableCounter") !== -1) delete values[values.indexOf("tableCounter")];
		}
		values = values.filter(function (el, i, arr) {
			return arr.indexOf(el) === i;
		});
		
		var valueData = [];
		for(let v = 0; v < where["values"].length; v++){
			var vData = {};
			for(let vv = 0; vv < values.length; vv++){
				vData[values[vv]] = "UNDEF";
			}
			for(let vv in where["values"][v]){
			  if(typeof where["values"][v][vv] !== "function" && vv !== "tableCounter"){
				  
				var parsedValue = getVariable(where["values"][v][vv]);

				if(parsedValue["type"] == "iri") {
					let params = {name: where["values"][v][vv]["value"]};
					if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
					let attributeResolved = await dataShapes.resolvePropertyByName(params);
					
					if(attributeResolved.complete == true){
						let sn = attributeResolved.data[0].display_name;
						if(schemaName == "wikidata" && attributeResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
						else if(attributeResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = attributeResolved.data[0].prefix+ ":" + sn;
						vData[vv] = sn;
					} else {
						let params = {name: where["values"][v][vv]["value"]};
						if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
						let classResolved = await dataShapes.resolveClassByName(params);
						
						if(classResolved.complete == true){
							let sn = classResolved.data[0].display_name;
							if(schemaName == "wikidata" && classResolved.data[0].prefix == "wd" && showPrefixesForAllNames !== true){}
							else if(classResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = classResolved.data[0].prefix+ ":" + sn;
							vData[vv] = sn;
						} else {
							
							var uriResolved;
							if(schemaName == "wikidata") {
								let uriResolvedTemp = await dataShapes.getTreeIndividualsWD(where["values"][v][vv]["value"]);
								uriResolved = {"data": uriResolvedTemp};
								if(uriResolvedTemp.length > 0) uriResolved.complete = true; 
								
							} else {
								params.name = where["values"][v][vv]["value"];
								uriResolved = await dataShapes.resolveIndividualByName(params)
							}
							
							if(uriResolved.complete == true && uriResolved.data[0].localName != ""){
								uri = uriResolved.data[0].localName;
								if(uri.startsWith("https://") || uri.startsWith("http://")){
									uri = "<" + uri +">";
								}
								vData[vv] = uri;
							} else {
								var cls = await dataShapes.getIndividualName(parsedValue["value"]);
								if(cls != null && cls != ""){
									if(cls.startsWith("https://") || cls.startsWith("http://")){
										cls = "<" + cls +">";
									}
									vData[vv] = cls;
								} else {
									vData[vv] = "<"+parsedValue["value"]+">";
								}
							}
						}
					}
				} else {
					vData[vv] = parsedValue["value"];
				}
			  }
			}
			valueData.push(vData);
		}
		
		let alias = "";
		if(values.length == 1) alias = getVariable(values[0])["value"];
		else {
			let temp = []
			for(let v = 0; v < values.length; v++){
				temp.push(getVariable(values[v])["value"]);
				var findByName = findByVariableName(classesTable, values[v]);
			}
			alias = "(" + temp.join(", ") + ")";
		}
		let exp = "";
		
		if(values.length == 1){
			let temp = []
			
			for(let v = 0; v < valueData.length; v++){
				for(let vv in valueData[v]){
					temp.push(valueData[v][vv])
				}
			}
			exp = "{" + temp.join(", ") + "}";
		} else {
			let temp = []
			for(let v = 0; v < valueData.length; v++){
				let t = [];
				for(let vv in valueData[v]){		
					t.push(valueData[v][vv])
				}
				temp.push("(" + t.join(", ") + ")")
			}
			exp = "{" + temp.join(", ") + "}";
		}
	
		let isInternal = false;
		if(selectVariables.indexOf(alias) === -1) isInternal = true;
		if(alias.startsWith("?")) alias = alias.substring(1);
		let attributeInfo = {
			"alias":alias,
			"identification":null,
			"requireValues":false,
			"isInternal":isInternal,
			"groupValues":false,
			"exp":exp,
			"counter":orderCounter,
			"orderCounter":where["values"]["tableCounter"]
		}
		orderCounter++;
			
		var added = false;
		for(let v = 0; v < values.length; v++){
			let attributes = findByVariableName(attributeTable, values[v]);
			for(let attribute in attributes){
				if(typeof attributes[attribute] !== "function"){
					classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
					// console.log("14", attributeInfo)
					added = true;
					break;
				}
			}
			if(added == true) break;
		}
		
		if(added == false){
			let classes = findByVariableName(classesTable, values[0]);
			for(let c in classes){
				if(typeof classes[c] !== "function"){
					classesTable[c] = addAttributeToClass(classesTable[c], attributeInfo);
					// console.log("15", attributeInfo)
					added = true;
					break;
				}
			}
		}
		if(added == false){
			for(let c in classesTable){
				if(typeof classesTable[c] !== "function"){
					classesTable[c] = addAttributeToClass(classesTable[c], attributeInfo);
					// console.log("16", attributeInfo)
					break;
				}
			}
		}
	}
	
	//type=filter
	if(where["type"] == "filter"){
		
		let generateFilter = true;
		if(where["expression"]["type"] === "operation" && where["expression"]["operator"] === "="){
			let arg1 = where["expression"]["args"][0];
			let arg2 = where["expression"]["args"][1];
			if(arg1["termType"] === "Variable" && typeof classesTable[arg1["value"]] !== "undefined"
			&& arg2["termType"] === "NamedNode" && classesTable[arg1["value"]]["instanceAlias"] === null){
				
				let uriResolved = null;
				if(schemaName == "wikidata") {
					let uriResolvedTemp = await dataShapes.getTreeIndividualsWD(arg2["value"]);
					uriResolved = {"data": uriResolvedTemp};
					if(uriResolvedTemp.length > 0) uriResolved.complete = true; 
				}else  {
					let params = {name: arg2["value"]};
					if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
					uriResolved = await dataShapes.resolveIndividualByName(params);
				}
				
				if(uriResolved.complete === true) {
					classesTable[arg1["value"]]["instanceAlias"] = uriResolved["data"][0]["localName"];
					generateFilter = false;
				}
			}
		}
		if(generateFilter === true){
			let temp = await parseSPARQLjsStructureWhere(where["expression"], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, checkIfOrAndInFilter(where["expression"], generateOnlyExpression));
			
			let allowMul = "";
			let relations = ["=", "!=", "<", ">", "<=", ">="];
			if(where["expression"]["type"] == "operation" && relations.indexOf(where["expression"]["operator"]) !== -1) {allowMul = "* ";}
			
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
				let filterAdded = false;
				
				let className;

				for(let fil = 0; fil < viziQuerExpr["exprVariables"].length; fil++){
					let classes = [];
					// class name as property
					var conditionExpr = viziQuerExpr["exprVariables"][fil];
					if(conditionExpr.startsWith("@")) conditionExpr = conditionExpr.substring(1);
					if(typeof classesTable[conditionExpr] !== 'undefined') {
						className = viziQuerExpr["exprVariables"][fil];
						classes = findByVariableName(classesTable, className);
					} 
					// attribute
					else if(typeof  attributeTable[conditionExpr] != 'undefined') {
						
						className = attributeTable[conditionExpr]["class"];
						var attributeNames = findByVariableName(attributeTable, conditionExpr);
						for(let attributeName in attributeNames){
							if(typeof attributeTable[attributeName] !== "function"){
								var classN = attributeTable[attributeName]["class"];
								classes[classN] = classesTable[classN];
							}
						}
						classes[className] = classesTable[className];

						if(classesTable[className]["variableName"].startsWith("?"))className = classesTable[className]["variableName"];
						else className = classesTable[className]["variableName"];

						if(where["expression"]["type"] == "operation" &&
						where["expression"]["operator"] == "=" &&
						where["expression"]["args"].length == 2 &&
						where["expression"]["args"][0]["type"] == "operation" && 
						where["expression"]["args"][0]["operator"] == "lang"){
							attributeTable[conditionExpr]["exp"] = attributeTable[conditionExpr]["identification"]["short_name"] + "@" + where["expression"]["args"][1]["value"];
							generateOnlyExpression = true;
							filterAdded = true;
						}

					} 
					//class name
					/*else if(typeof classesTable[conditionExpr] !== 'undefined') {
						className = classesTable[conditionExpr]["variableName"];
						// classes[viziQuerExpr["exprVariables"][fil]] = classesTable[viziQuerExpr["exprVariables"][fil]];

						let classUnderOptional = false;
						if(bgptype == "plain"){
							for(let link = 0; link< linkTable.length; link++){
								if( linkTable[link] !== "undefined" && linkTable[link]["linkType"] == "OPTIONAL" && linkTable[link]["object"] == className) {
									classUnderOptional = true;
									break;
								}
							}
						}
						if(classUnderOptional != true){
							classes[conditionExpr] = classesTable[conditionExpr];
						} else {
							for(let clazz in classesTable){
								if(typeof classesTable[clazz] !== "function"){
									className = clazz;
									break;
								}
							}
							classes = findByVariableName(classesTable, className);
						}
					}*/
					// bind attribute
					else if(typeof bindTable[conditionExpr]  !== 'undefined'){
						className = bindTable[conditionExpr]["class"];
						let classUnderOptional = false;
						if(bgptype == "plain"){
							for(let link = 0; link< linkTable.length; link++){
								if( typeof linkTable[link] !== "undefined" && linkTable[link]["linkType"] == "OPTIONAL" && linkTable[link]["object"] == className) {
									classUnderOptional = true;
									break;
								}
							}
						}
						if(classUnderOptional != true){
							classes[conditionExpr] = classesTable[conditionExpr];
							
						} else {
							for(let clazz in classesTable){
								if(typeof classesTable[clazz] !== "function"){
									className = clazz;
									break;
								}
							}
							classes = findByVariableName(classesTable, className);
						}
					}
					else{
						if(typeof className === 'undefined'){
							for(let clazz in classesTable){
								if(typeof classesTable[clazz] !== "function"){
									className = clazz;
									break;
								}
							}
							classes = findByVariableName(classesTable, className);
						}
					}
					

					// var classes = findByVariableName(classesTable, className);
					if(generateOnlyExpression != true){
						for(let clazz in classes){
							if(typeof classes[clazz] !== "function"){
								if((typeof nodeList[className] !== 'undefined' && typeof nodeList[className]["uses"][clazz] !== 'undefined') || typeof nodeList[className] !== 'undefined' && typeof nodeList[className]["uses"][clazz] !== 'undefined'){	
										if(typeof classesTable[clazz]["conditions"] === 'undefined') {
											classesTable[clazz]["conditions"] = [];
										}
										let conditionString = allowMul + viziQuerExpr["exprString"];
										if(allowMul == "" && conditionString.indexOf("* ") !== -1) {
											conditionString = conditionString.substring(2);
										};
										if(allowMul == ""){
											if(classesTable[clazz]["conditions"].indexOf("* "+ viziQuerExpr["exprString"]) !== -1) {
												classesTable[clazz]["conditions"][classesTable[clazz]["conditions"].indexOf("* "+ viziQuerExpr["exprString"])] = classesTable[clazz]["conditions"][classesTable[clazz]["conditions"].indexOf("* "+ viziQuerExpr["exprString"])].substring(2)
											}
										}
										classesTable[clazz]["conditions"].push(conditionString);
										
										// console.log("condition 7", conditionString, viziQuerExpr["exprString"], classesTable[clazz]["conditions"].indexOf(conditionString))
										
										filterAdded = true;
										break;
								} 
							}
						}
					}	
					if(filterAdded == true) break;
				}
				if(viziQuerExpr["exprVariables"].length == 0){
					for(let n in nodeList){
						if(typeof nodeList[n] !== "function"){
							let classes = findByVariableName(classesTable, n);
							if(generateOnlyExpression != true){
								for(let clazz in classes){
									if(typeof classes[clazz] !== "function"){							
										if(typeof classesTable[clazz]["conditions"] === 'undefined') {
											classesTable[clazz]["conditions"] = [];
										}
										let conditionString = allowMul + viziQuerExpr["exprString"];
										if(allowMul == "" && conditionString.indexOf("* ") !== -1) {
											conditionString = conditionString.substring(2);
										};
										if(allowMul == ""){
											if(classesTable[clazz]["conditions"].indexOf("* "+ viziQuerExpr["exprString"]) !== -1) {
												classesTable[clazz]["conditions"][classesTable[clazz]["conditions"].indexOf("* "+ viziQuerExpr["exprString"])] = classesTable[clazz]["conditions"][classesTable[clazz]["conditions"].indexOf("* "+ viziQuerExpr["exprString"])].substring(2)
											}
										}
										classesTable[clazz]["conditions"].push(conditionString);
										// console.log("condition 8", conditionString, viziQuerExpr["exprString"])
										filterAdded = true;
										break;
									}
								}
							}	
							break;
						}
					}
				}
				if(typeof className !== 'undefined' &&  typeof classesTable[className] !== 'undefined' && typeof classesTable[className]["conditions"] !== 'undefined') {
					classesTable[className]["conditions"] = classesTable[className]["conditions"].filter(function (el, i, arr) {
						return arr.indexOf(el) === i;
					});
				}
				
				if(typeof filterTable.find(e => e.filterString === viziQuerExpr["exprString"]) === "undefined"){
					filterTable.push({filterString:viziQuerExpr["exprString"], filterVariables:viziQuerExpr["exprVariables"], filterAdded:filterAdded});
				}
			}
		}
	}
	
	if(where["type"] == "blankNode"){
	
		let nodeLitsTemp = [];
		let collectNodeListTemp  = await collectNodeList({0:{"type": "bgp","triples": where["blankNode"]}}, dataTripleAsObject);
		let temp = collectNodeListTemp["nodeList"];
		// var plainVariables = getWhereTriplesPlainVaribles(unionBlock["patterns"]);
		for(let node in temp){
			if(typeof temp[node] !== "function"){
				nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
			}
		}
		
		temp = await parseSPARQLjsStructureWhere({"type": "bgp","triples": where["blankNode"]}, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable);
		if(bgptype == "optional"){
			let optionalLinkFound = false;
			for(let link = 0; link < temp["linkTableAdded"].length; link++){
				if(classTableAdded.indexOf(temp["linkTableAdded"][link]["object"]) == -1 || classTableAdded.indexOf(temp["linkTableAdded"][link]["subject"]) == -1){
					temp["linkTableAdded"][link]["linkType"] = "OPTIONAL";
					optionalLinkFound = true;
					break;
				}
			}
			if(optionalLinkFound == false){
				for(let link = 0; link < temp["linkTableAdded"].length; link++){
					temp["linkTableAdded"][link]["linkType"] = "OPTIONAL";
					break;
				}
			}
		}
		
		for(let link = 0; link < temp["linkTableAdded"].length; link++){
			if(!temp["linkTableAdded"][link]["object"].startsWith("g_") && temp["classTableAdded"].indexOf(temp["linkTableAdded"][link]["object"]) == -1 && typeof classesTable[temp["linkTableAdded"][link]["object"]] !== "undefined"){
				classesTable[temp["linkTableAdded"][link]["object"]+counter] = classesTable[temp["linkTableAdded"][link]["object"]];
				classTableAdded.push(temp["linkTableAdded"][link]["object"]+counter);
				temp["linkTableAdded"][link]["object"] = temp["linkTableAdded"][link]["object"]+counter;
				counter++;
			}
			
		}
	}
	
	// type=union														  
	if(where["type"] == "union"){
		var onlybgp = true;
		let subject = null;
		let object = null;
		
		for(let u = 0; u < where["patterns"].length; u++){
			let unionBlock = where["patterns"][u];	
			var subjectCount = 0;
			if(unionBlock["type"] != "bgp"){
				onlybgp = false;
			} else {
				
				if(subject == null){
					subject = unionBlock["triples"][0]["subject"]["value"];
				} else {
					if(subject != unionBlock["triples"][0]["subject"]["value"]) onlybgp = false;
				}
				if(object == null){
					object = unionBlock["triples"][unionBlock["triples"].length-1]["object"]["value"];
				} else {
					if(object != unionBlock["triples"][unionBlock["triples"].length-1]["object"]["value"]) onlybgp = false;
				}
				if(typeof unionBlock["triples"][unionBlock["triples"].length-1]["predicate"]["termType"] !== "undefined" && unionBlock["triples"][unionBlock["triples"].length-1]["predicate"]["termType"] === "Variable")onlybgp = false;
			}
			
			if(typeof unionBlock["triples"] !== "undefined"){
				for(let triple = 0; triple < unionBlock["triples"].length; triple++){
					if(unionBlock["triples"][triple]["subject"]["value"] == subject && unionBlock["triples"][triple]["predicate"]["value"] != directClassMembershipRole && typeof classifiers[unionBlock["triples"][triple]["predicate"]["value"]] === "undefined") subjectCount++;
				}
			}

			if(subjectCount > 1) onlybgp = false;
		}
		if(onlybgp == true){
			// console.log("UNION OPTIMIZATION")

			var pathExpression = [];
			for(let u = 0; u < where["patterns"].length; u++){
				let unionBlock = where["patterns"][u];
				
				var pathExpressionbgp = []
				for(let triple = 0; triple < unionBlock["triples"].length; triple++){
					let params = {name: unionBlock["triples"][triple]["predicate"]["value"]};
					if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
					let dataPropertyResolved = await dataShapes.resolvePropertyByName(params);
					if(unionBlock["triples"][triple]["predicate"]["type"] == "path"){
						
						var pathText = [];
						if(unionBlock["triples"][triple]["predicate"]["pathType"] == "/"){
	
						/////////////////////////////////////////////
						for(let item = 0; item < unionBlock["triples"][triple]["predicate"]["items"].length; item++){
									if(typeof unionBlock["triples"][triple]["predicate"]["items"][item]["termType"] !== "undefined"){
										params.name = unionBlock["triples"][triple]["predicate"]["items"][item]["value"];
										let linkResolved = await dataShapes.resolvePropertyByName(params);
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											let sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
											else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											let predicateParsed = getVariable(unionBlock["triples"][triple]["predicate"]["items"][item])["value"];
											let alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push(alias);
										}
										
										if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]));
									} 
									// ^
									else if(unionBlock["triples"][triple]["predicate"]["items"][item]["type"] == "path" && unionBlock["triples"][triple]["predicate"]["items"][item]["pathType"] == "^"){
										params.name = unionBlock["triples"][triple]["predicate"]["items"][item]["items"][0];
										let linkResolved = await dataShapes.resolvePropertyByName(params);
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											let sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
											else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											let predicateParsed = getVariable(unionBlock["triples"][triple]["predicate"]["items"][item]["items"][0])["value"];
											let alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push("^" + alias);
										}
										if(linkResolved.complete == true)pathText.push("^" + buildPathElement(linkResolved.data[0]));
									}
									// *
									else if(unionBlock["triples"][triple]["predicate"]["items"][item]["type"] == "path" && unionBlock["triples"][triple]["predicate"]["items"][item]["pathType"] == "*"){
										params.name = unionBlock["triples"][triple]["predicate"]["items"][item]["items"][0];
										let linkResolved = await dataShapes.resolvePropertyByName(params);
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											let sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
											else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											let predicateParsed = getVariable(unionBlock["triples"][triple]["predicate"]["items"][item]["items"][0])["value"];
											let alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push(alias +"*");
										}
										if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]) +"*");
									}// ?
									else if(unionBlock["triples"][triple]["predicate"]["items"][item]["type"] == "path" && unionBlock["triples"][triple]["predicate"]["items"][item]["pathType"] == "?"){
										params.name = unionBlock["triples"][triple]["predicate"]["items"][item]["items"][0];
										let linkResolved = await dataShapes.resolvePropertyByName(params);
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											let sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
											else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											let predicateParsed = getVariable(unionBlock["triples"][triple]["predicate"]["items"][item]["items"][0])["value"];
											let alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push(alias +"?");
										}
										
										if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]) +"?");
									}
								}
								
								pathExpressionbgp.push(pathText.join("."))
						}
						/////////////////////////////////////////////

					}
					else if(dataPropertyResolved.complete==true){
						let sn = dataPropertyResolved.data[0].display_name;
						if(schemaName == "wikidata" && dataPropertyResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
						else if(dataPropertyResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = dataPropertyResolved.data[0].prefix+ ":" + sn;
						pathExpressionbgp.push(sn)

					} else {
						if(unionBlock["triples"][triple]["predicate"]["value"].indexOf("://") != -1) {
							var pathExpr = "<"+unionBlock["triples"][triple]["predicate"]["value"]+">";
							let splittedUri = splitURI(unionBlock["triples"][triple]["predicate"]["value"]);
							if(splittedUri == null) pathExpr = "<"+unionBlock["triples"][triple]["predicate"]["value"]+">";
							else {
								let prefixes = await dataShapes.getNamespaces();
								prefixes = combineKnownPrefixesWithDefinedPrefixes(prefixes);
	
								for(let key = 0; key < prefixes.length; key++){
									if(prefixes[key]["value"] == splittedUri.namespace) {
										if(prefixes[key]["name"].slice(-1) == ":") return prefixes[key]["name"]+splittedUri.name;
										pathExpr = prefixes[key]["name"]+":"+splittedUri.name;
										usedPrefixes[prefixes[key]["name"]] = prefixes[key]["value"];
									}
								}
								pathExpressionbgp.push(pathExpr);
							}
						}else pathExpressionbgp.push(unionBlock["triples"][triple]["predicate"]["value"]);
					}
				}
				pathExpression.push(pathExpressionbgp.join("."));				
			}
			
			var subjectClass = findByVariableName(classesTable, subject);
			if(subject.startsWith("?")) subject = subject.substring(1);

			if(Object.keys(subjectClass).length == 0){
				//create class;
				let params = {name: subject};
				if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
				let classResolved = await dataShapes.resolveClassByName(params);
				let objectResolved = await generateInstanceAlias(subject);
				if(typeof classesTable[subject] === 'undefined' && typeof allClasses[subject] === 'undefined'){
					classesTable[subject] = {
						"variableName":subject,
						"identification":classResolved,
						"instanceAlias":objectResolved,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false
					};
					classTableAdded.push(subject);
					nodeList[subject]= {uses: {[subject]: "class"}, count:1};
					subjectClass = subject;
				}
				// if query has another union class
				else {
					classesTable[subject+counter] = {
						"variableName":subject,
						"identification":classResolved,
						"instanceAlias":objectResolved,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false
					};
					classTableAdded.push(subject+counter);
					if(typeof nodeList[subject] === 'undefined') nodeList[subject] = {uses: [], count:1}
					nodeList[subject]["uses"][subject+counter] = "class";
					nodeList[subject]["count"] = nodeList[subject]["count"]+1;
					subjectClass = subject+counter;
					counter++;
				}
			} else {
				for(let k in subjectClass){
					if(typeof subjectClass[k] !== "function"){
						subjectClass = k;
						break;
					}
				}
			}
			var objectClass = findByVariableName(classesTable, object);

			if(object.startsWith("?")) object = object.substring(1);
			var createLink = true;
			if(Object.keys(objectClass).length == 0){
				//create class;
				let params = {name: object};
				if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
				let classResolved = await dataShapes.resolveClassByName(params);
				let objectResolved = await generateInstanceAlias(object);
				
				if(isURI(object) != 3 && isURI(object) !== 4) {
					
					if(typeof variableList[object] !== "undefined")variableList[object] = "seen";
					let attributeInfo = {
							"alias":object,
							"identification":null,
							"requireValues":true,
							"isInternal":false,
							"groupValues":false,
							"exp":"[["+ pathExpression.join(" | ")+ "]]",
							"counter":orderCounter,
							"orderCounter":orderCounter
						}
						orderCounter++;
						classesTable[subjectClass] = addAttributeToClass(classesTable[subjectClass], attributeInfo);
						createLink = false;
				}

				else if(typeof classesTable[object] === 'undefined' && typeof allClasses[object] === 'undefined'){
					classesTable[object] = {
						"variableName":object,
						"identification":classResolved,
						"instanceAlias":objectResolved,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false,
						"orderCounter":orderCounter
					};
					classTableAdded.push(object);
					nodeList[object]= {uses: {[object]: "class"}, count:1};
					objectClass = object;
				}
				// if query has another union class
				else {
					classesTable[object+counter] = {
						"variableName":object,
						"identification":classResolved,
						"instanceAlias":objectResolved,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false,
						"orderCounter":orderCounter
					};
					classTableAdded.push(object+counter);
					if(typeof nodeList[object] === 'undefined') nodeList[object] = {uses: [], count:1}
					nodeList[object]["uses"][object+counter] = "class";
					nodeList[object]["count"] = nodeList[object]["count"]+1;
					objectClass = object+counter;
					counter++;
				}
			} else {
				for(let k in objectClass){
					if(typeof objectClass[k] !== "function"){
						objectClass = k;
						break;
					}
				}
			}
			
			
			if(createLink == true){
				let link = {
						"linkIdentification":{local_name: pathExpression.join(" | "), display_name: pathExpression.join(" | "), short_name: pathExpression.join(" | ")},
						"object":objectClass,
						"subject":subjectClass,
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
		} else{
		
		// classes in query before union
		isUnderUnion = true;
		var classesBeforeUnion = []
		for(let c in classesTable){
			if(typeof classesTable[c] !== "function"){
				classesBeforeUnion[c] = classesTable[c];
			}
		}
		
		if(Object.keys(classesBeforeUnion).length == 0){
			for(let c in allClasses){
				if(typeof allClasses[c] !== "function"){
					classesBeforeUnion[c] = allClasses[c];
				}
			}
		}
		// create [ + ] class
		// union class identification
		let unionClass;
		// if query does not has union class
		if(typeof classesTable["[ + ]"] === 'undefined' && typeof allClasses["[ + ]"] === 'undefined'){
			classesTable["[ + ]"] = {
				"variableName":"[ + ]",
				"identification":null,
				"instanceAlias":"",
				"isVariable":false,
				"isUnit":false,
				"isUnion":true
			};
			classTableAdded.push("[ + ]");
			nodeList["[ + ]"]= {uses: {"[ + ]": "class"}, count:1};
			unionClass = "[ + ]";
		}
		// if query has another union class
		else {
			classesTable["[ + ]"+counter] = {
				"variableName":"[ + ]",
				"identification":null,
				"instanceAlias":"",
				"isVariable":false,
				"isUnit":false,
				"isUnion":true
			};
			classTableAdded.push("[ + ]"+counter);
			if(typeof nodeList["[ + ]"] === 'undefined') nodeList["[ + ]"] = {uses: [], count:1}
			nodeList["[ + ]"]["uses"]["[ + ]"+counter] = "class";
			nodeList["[ + ]"]["count"] = nodeList["[ + ]"]["count"]+1;
			unionClass = "[ + ]"+counter;
			counter++;
		}
		
		// bgptype = "plain";
		
		// list with classes under union query part
		var allClassesUnderUnion = [];
		
		// list with nodes under union query part
		var allNodesUnderUnion = [];
		
		// for all union blocks
		for(let u = 0; u < where["patterns"].length; u++){
			
			let unionBlock = where["patterns"][u];	
			
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

				let linkCreated = false;
				let classTableTemp = [];
				let linkTableTemp = [];
				// calculate nodelist for union block
				let nodeLitsTemp = [];
				let collectNodeListTemp  = await collectNodeList({0:unionBlock}, dataTripleAsObject);

				let temp = collectNodeListTemp["nodeList"];
				// var plainVariables = getWhereTriplesPlainVaribles(unionBlock["patterns"]);
				for(let node in temp){
					if(typeof temp[node] !== "function"){
						nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, temp[node]);
					}
				}

				// for all patterns
				// first bqp then the rest
					let pattern = unionBlock
					if(typeof pattern["type"] !== "undefined" && pattern["type"] == "bgp"){
						let classesTableCopy = [];
						for(let c in classesTable){
							if(typeof classesTable[c] !== "function"){
								classesTableCopy[c] = classesTable[c];
							}
						}
						
						let temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTableCopy, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						
						for(let c in temp["classesTable"]){
							if(typeof temp["classesTable"][c] !== "function"){
								if(typeof classesTable[c] === 'undefined' 
								|| (typeof classesTable[c] !== 'undefined' && classesTable[c]["identification"] == null)) classesTable[c] = temp["classesTable"][c]
							}
						}

						for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
							if(typeof temp["classTableAdded"][clazz] !== "function"){
								classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
								allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							}
						}
						attributeTable = temp["attributeTable"];
						linkTable = temp["linkTable"];
						filterTable = temp["filterTable"];
						linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
					}
				
				
				// find class from union block to connect to [+] class
				let object = findClassToConnectUnion(classTableTemp, classesBeforeUnion, linkTableTemp, null, "object");
				if(object == null){
					for(let subClass in classTableTemp){
						if(typeof classTableTemp[subClass] !== "function"){
							object = subClass;
							break;
						}
					}
				}
				
				let linktype = "REQUIRED";
				if(unionBlock["type"] == "optional") linktype = "OPTIONAL";
				
				// connect founded class to [+] class with ++ link
				if(linkCreated == false){
					let link = {
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
				let linkCreated = false;
				let classTableTemp = [];
				let linkTableTemp = [];
				// calculate nodelist for union block
				let nodeLitsTemp = [];
				let collectNodeListTemp  = await collectNodeList(unionBlock["patterns"]);
				let temp = collectNodeListTemp["nodeList"];
				// var plainVariables = getWhereTriplesPlainVaribles(unionBlock["patterns"]);
				for(let node in temp){
					if(typeof temp[node] !== "function"){
						nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
						allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, temp[node]);
					}
				}
				
				// for all patterns
				// first bqp then the rest
				for(let p = 0; p < unionBlock["patterns"].length; p++){
					let pattern = unionBlock["patterns"][p];
					if(typeof pattern["type"] !== "undefined" && pattern["type"] == "bgp"){
						let classesTableCopy = [];
						for(let c in classesTable){
							if(typeof classesTable[c] !== "function"){
								classesTableCopy[c] = classesTable[c];
							}
						}
						
						let temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTableCopy, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						
						for(let c in temp["classesTable"]){
							if(typeof temp["classesTable"][c] !== "function"){
								if(typeof classesTable[c] === 'undefined' 
								|| (typeof classesTable[c] !== 'undefined' && classesTable[c]["identification"] == null)) classesTable[c] = temp["classesTable"][c]
							}
						}
						// classesTable = temp["classesTable"];
						for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
							if(typeof temp["classTableAdded"][clazz] !== "function"){
								classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
								allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							}
						}
						attributeTable = temp["attributeTable"];
						linkTable = temp["linkTable"];
						filterTable = temp["filterTable"];
						linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
					}
				}
				
				for(let p = 0; p < unionBlock["patterns"].length; p++){
					let pattern = unionBlock["patterns"][p];
					if(pattern["type"] == "filter" && typeof pattern["expression"] !== "undefined" && 
					pattern["expression"]["type"] == "operation" && pattern["expression"]["operator"] == "notexists"){
						let classesTableCopy = [];
						for(let c in classesTable){
							if(typeof classesTable[c] !== "function"){
								classesTableCopy[c] = classesTable[c];
							}
							// allClasses[c] = classesTable[c];
						}	
						let negationTemp = await generatePlainNegationUnion(pattern, nodeList, classesTableCopy, filterTable, attributeTable, linkTable, selectVariables, linkTableAdded, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression, allClassesUnderUnion, allNodesUnderUnion, unionClass);
						
						allClassesUnderUnion = negationTemp["allClassesUnderUnion"];
						allNodesUnderUnion = negationTemp["allNodesUnderUnion"];
						for(let c in negationTemp["classesTable"]){
							if(typeof negationTemp["classesTable"][c] !== "function"){
								if(typeof classesTable[c] === 'undefined' 
								|| (typeof classesTable[c] !== 'undefined' && classesTable[c]["identification"] == null)) classesTable[c] = negationTemp["classesTable"][c]
							}
						}
						// classesTable = negationTemp["classesTable"];
						filterTable = negationTemp["filterTable"];
						attributeTable = negationTemp["attributeTable"];
						linkTable = negationTemp["linkTable"];
						linkTableTemp = negationTemp["linkTableTemp"];
						classTableTemp = negationTemp["classTableTemp"];
						linkCreated = true;
					}else if(typeof pattern["type"] === "undefined" || (typeof pattern["type"] !== "undefined" && pattern["type"] !== "bgp")){
						let temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						for(let c in temp["classesTable"]){
							if(typeof temp["classesTable"][c] !== "function"){
								if(typeof classesTable[c] === 'undefined' 
								|| (typeof classesTable[c] !== 'undefined' && classesTable[c]["identification"] == null)) classesTable[c] = temp["classesTable"][c]
							}
						}
						// classesTable = temp["classesTable"];
						for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
							if(typeof temp["classTableAdded"][clazz] !== "function"){
								classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
								allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
							}
						}
						attributeTable = temp["attributeTable"];
						linkTable = temp["linkTable"];
						filterTable = temp["filterTable"];
						linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
					}
				}
				
				// find class from union block to connect to [+] class
				let object = findClassToConnectUnion(classTableTemp, classesBeforeUnion, linkTableTemp, null, "object");
				if(object == null){
					for(let subClass in classTableTemp){
						if(typeof classTableTemp[subClass] !== "function"){
							object = subClass;
							break;
						}
					}
				}
				
				let linktype = "REQUIRED";
				if(unionBlock["type"] == "optional") linktype = "OPTIONAL";
				

				if(unionBlock["patterns"].length == 2){
					if(unionBlock["patterns"][0]["type"] == "optional" && unionBlock["patterns"][1]["type"] == "bgp" && unionBlock["patterns"][1]["triples"].length ==1 && (unionBlock["patterns"][1]["triples"][1]["predicate"]["value"] == directClassMembershipRole || typeof classifiers[unionBlock["patterns"][1]["triples"][1]["predicate"]["value"]] !== "undefined")){
						for(let allClazz in classesBeforeUnion){
							if(unionBlock["patterns"][1]["triples"][1]["subject"]["value"] == classesBeforeUnion[allClazz]["variableName"]){
								linktype = "OPTIONAL";
								break;
							}
						}
					}
					if(unionBlock["patterns"][1]["type"] == "optional" && unionBlock["patterns"][0]["type"] == "bgp" && unionBlock["patterns"][0]["triples"].length ==1 && (unionBlock["patterns"][0]["triples"][0]["predicate"]["value"] == directClassMembershipRole || typeof classifiers[unionBlock["patterns"][0]["triples"][0]["predicate"]["value"]] !== "undefined")){
						for(let allClazz in classesBeforeUnion){
							if(unionBlock["patterns"][0]["triples"][0]["subject"]["value"] == classesBeforeUnion[allClazz]["variableName"]){
								linktype = "OPTIONAL";
								break;
							}
						}
					}
				}
				
				// connect founded class to [+] class with ++ link
				if(linkCreated == false){
					let link = {
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
				for(let clazz in classesTable){
					if(typeof classesTable[clazz] !== "function"){
						classesTableNegationTemp[clazz] = classesTable[clazz];
					}
				}
				
				let negationTemp = await generatePlainNegationUnion(unionBlock, nodeList, classesTableNegationTemp, filterTable, attributeTable, [], linkTableAdded, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression, allClassesUnderUnion, allNodesUnderUnion, unionClass);

				allClassesUnderUnion = negationTemp["allClassesUnderUnion"];
				allNodesUnderUnion = negationTemp["allNodesUnderUnion"];
				//classesTable = negationTemp["classesTable"];
				filterTable = negationTemp["filterTable"];
				attributeTable = negationTemp["attributeTable"];

				//linkTable = negationTemp["linkTable"];
				linkTableAdded = negationTemp["linkTableAdded"];
				linkTable = linkTable.concat(negationTemp["linkTableAdded"]);
				for(let clazz in negationTemp["classesTable"]){
					if(typeof negationTemp["classesTable"][clazz] !== "function"){
						if(typeof classesTable[clazz] === 'undefined')classesTable[clazz] = negationTemp["classesTable"][clazz];
					}
				}
			}
			// ------------------------------------------------------------------------------------------------

			// type=query (required / optional subquery)
			else if(unionBlock["type"] == "query"){

				let classTableTemp = [];
				let linkTableTemp = [];
				
				for(let clazz in classesTable){
					if(typeof classesTable[clazz] !== "function"){
						allClasses[clazz] = classesTable[clazz];
					}
				}

				let abstractTable = await generateAbstractTable(unionBlock, allClasses, variableList, nodeList);
				
				for(let node in abstractTable["nodeList"]){
					if(typeof abstractTable["nodeList"][node] !== "function"){
						allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, abstractTable["nodeList"][node]);
					}
				}	

				for(let clazz in abstractTable["classesTable"]){
					if(typeof abstractTable["classesTable"][clazz] !== "function"){
						if(typeof classesTable[clazz] === 'undefined') classesTable[clazz] = abstractTable["classesTable"][clazz];
						classTableTemp[clazz] = abstractTable["classesTable"][clazz];
						allClassesUnderUnion[clazz] = abstractTable["classesTable"][clazz];
					}
				}

				linkTable = linkTable.concat(abstractTable["linkTable"]);
				linkTableTemp = linkTableTemp.concat(abstractTable["linkTable"]);
				
				// find class from union block to connect to [+] class
				let object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");
				if(object == null){
					for(let subClass in classTableTemp){
						if(typeof classTableTemp[subClass] !== "function"){
							object = subClass;
							break;
						}
					}
				}
						
				let linktype = "REQUIRED";
				
				if(typeof  unionBlock["where"] != 'undefined' && unionBlock["where"].length == 1 && unionBlock["where"][0]["type"] == "optional") linktype = "OPTIONAL";
				
				let isSubQuery = true;
				let isGlobalSubQuery = false;
				
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
				if(typeof unionBlock["offset"] !== 'undefined'  && unionBlock["offset"] != 0) {
					classesTable[object]["offset"] =  unionBlock["offset"];
					isGlobalSubQuery = true;
					isSubQuery = false;
				}
				if(typeof unionBlock["distinct"] !== 'undefined') classesTable[object]["distinct"] =  unionBlock["distinct"];
				if(typeof unionBlock["serviceLabelLang"] !== 'undefined' && unionBlock["serviceLabelLang"] != "") classesTable[object]["serviceLabelLang"] =  unionBlock["serviceLabelLang"];
				if(typeof unionBlock["fullSPARQL"] !== 'undefined' && unionBlock["fullSPARQL"] != "") classesTable[object]["fullSPARQL"] =  unionBlock["fullSPARQL"];
				
				// connect founded class to [+] class with ++ link
				let link = {
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
				for(let minusPattern = 0; minusPattern < unionBlock["patterns"].length; minusPattern++){
					
					var minusUnionBlock = unionBlock["patterns"][minusPattern];
					
					if(minusUnionBlock["type"] == "filter" && typeof minusUnionBlock["expression"] !== "undefined" && 
					minusUnionBlock["expression"]["type"] == "operation" && minusUnionBlock["expression"]["operator"] == "notexists"){
						let args = minusUnionBlock["expression"]["args"];

						for(let arg = 0; arg < args.length; arg++){
							if(args[arg]["type"] == "group"){
								let classTableTemp = [];
								let linkTableTemp = [];
								// calculate nodelist for union block
								let nodeLitsTemp = [];
								let collectNodeListTemp  = await collectNodeList(args[arg]["patterns"]);
								let temp = collectNodeListTemp["nodeList"];
								// var plainVariables = getWhereTriplesPlainVaribles(args[arg]["patterns"]);
								for(let node in temp){
									if(typeof temp[node] !== "function"){
										nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
										allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, temp[node]);
									}
								}	
								
								// for all patterns
								// first bqp then the rest
								for(let p = 0; p < args[arg]["patterns"].length; p++){
									let pattern = args[arg]["patterns"][p];
									if(typeof pattern["type"] !== "undefined" && pattern["type"] == "bgp"){
										let temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
										classesTable = temp["classesTable"];
										for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
											if(typeof temp["classTableAdded"][clazz] !== "function"){
												classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
												allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
											}
										}
										attributeTable = temp["attributeTable"];
										linkTable = temp["linkTable"];
										filterTable = temp["filterTable"];
										linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
									}
								}
								
								for(let p = 0; p < args[arg]["patterns"].length; p++){
									let pattern = args[arg]["patterns"][p];
									if(typeof pattern["type"] === "undefined" || (typeof pattern["type"] !== "undefined" && pattern["type"] !== "bgp")){
										let temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
										classesTable = temp["classesTable"];
										for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
											if(typeof temp["classTableAdded"][clazz] !== "function"){
												classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
												allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
											}
										}
										attributeTable = temp["attributeTable"];
										linkTable = temp["linkTable"];
										filterTable = temp["filterTable"];
										linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
									}
								}
								
								// find class from union block to connect to [+] class
								let object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");
								if(object == null){
									for(let subClass in classTableTemp){
										if(typeof classTableTemp[subClass] !== "function"){
											object = subClass;
											break;
										}
									}
								}
								
								let linktype = "NOT";
								// connect founded class to [+] class with ++ link
								let link = {
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
			for(let clazz in classesTable){
				if(typeof classesTable[clazz] !== "function"){
					allClasses[clazz] = classesTable[clazz];
				}
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
			let unionSubject = null;
			var moreThenOneClassFound = false;
			// if union has parrent query class "copy"
			for(let allClazz in classesBeforeUnion){
				// from class boxes under union
				for(let clazz in allClassesUnderUnion){
					if(allClassesUnderUnion[clazz]["variableName"] == classesBeforeUnion[allClazz]["variableName"]){
						// if more then one class from parrent query found
						if(unionSubject != null && unionSubject != allClazz){
							moreThenOneClassFound = true;
							break;
						} else unionSubject = allClazz;
					}
				}
				// from node list under union
				for(let clazz in allNodesUnderUnion){
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
				for(let l = 0; l < linkTable.length; l++){
					let linkk = linkTable[l];

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
				let link = {
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
			for(let allClazz in classesBeforeUnion){
				// replace ++ links, remove duplicates
				for(let clazz in allClassesUnderUnion){
					if(allClassesUnderUnion[clazz]["variableName"] == classesBeforeUnion[allClazz]["variableName"]){
						
						
						// if class is unionSubject
						// if class do not has attributes
						if(unionSubject == allClazz && checkIfClassHasAttributes(clazz, attributeTable) == false){	
							for(let l = 0; l < linkTable.length; l++){
								let linkk = linkTable[l];
														
								if(linkk["object"] == clazz && linkk["subject"] != unionClass){
									
									let classUnderUnion = linkk["subject"];
									let linkFound = false;
									for(let ll = 0; ll < linkTable.length; ll++){
										let unionLink = linkTable[ll];
										if((unionLink["object"] == clazz && unionLink["subject"] == unionClass) || (unionLink["subject"] == clazz && unionLink["object"] == unionClass)){
											linkTable.splice(ll, 1);
											linkFound = true;
										}
									}
									if(linkFound == false){
										for(let ll = 0; ll < linkTable.length; ll++){
											let unionLink = linkTable[ll];
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
									let classUnderUnion = linkk["object"];
									let linkFound = false;
									for(let ll = 0; ll < linkTable.length; ll++){
										let unionLink = linkTable[ll];
										if((unionLink["object"] == clazz && unionLink["subject"] == unionClass) || (unionLink["subject"] == clazz && unionLink["object"] == unionClass)){
											linkTable.splice(ll, 1);
											linkFound = true;
										}
									}
									if(linkFound == false){
										for(let ll = 0; ll < linkTable.length; ll++){
											let unionLink = linkTable[ll];
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
			for(let clazz in allClassesUnderUnion){
				for(let l = 0; l < linkTable.length; l++){
					let linkk = linkTable[l];
					if(linkk["linkIdentification"]["local_name"] == "++"){
						
						let classUnderUnion;
						if(linkk["object"] == clazz) classUnderUnion = linkk["subject"];
						else classUnderUnion = linkk["object"];
						
						if(classUnderUnion != unionClass){
						
							for(let ll = 0; ll < linkTable.length; ll++){
								let unionLink = linkTable[ll];
								if((unionLink["object"] == classUnderUnion || unionLink["subject"] == classUnderUnion) &&
								(unionLink["object"] == unionSubject || unionLink["subject"] == unionSubject)){
									
									linkk["linkIdentification"] = unionLink["linkIdentification"];
									
									if((linkk["isSubQuery"] == true || linkk["isGlobalSubQuery"] == true) 
									&& linkk["linkType"] == "REQUIRED" && unionLink["linkType"] == "OPTIONAL") linkk["linkType"] = "OPTIONAL";
									
									// if link is in inverse direction
									if(linkk["object"] != unionLink["object"]) {
										let t = linkk["object"];
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
		}
		for(let c in allClassesUnderUnion){
			if(typeof allClassesUnderUnion[c] !== "function"){
				if(typeof classesTable[c] !== 'undefined' && typeof classesBeforeUnion[c] === 'undefined') classTableAdded.push(c);
			}
		}
		
		for(let c in allNodesUnderUnion){
			if(typeof allNodesUnderUnion[c] !== "function"){
				if(typeof nodeList[c] === 'undefined') nodeList[c] = allNodesUnderUnion[c];
			}
		}	

		isUnderUnion = false;
	}
	// type=bind
	if(where["type"] == "bind"){
		
		let temp = await parseSPARQLjsStructureWhere(where["expression"], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
		classesTable = temp["classesTable"];
		attributeTable = temp["attributeTable"];
		filterTable = temp["filterTable"];
		linkTableAdded = linkTableAdded.concat(temp["linkTableAdded"]);
		classTableAdded = classTableAdded.concat(temp["classTableAdded"]);
		attributeTableAdded = attributeTableAdded.concat(temp["attributeTableAdded"]);
		bindTable = temp["bindTable"];
		viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
		viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
		
		for(let variable = 0; variable < viziQuerExpr["exprVariables"].length; variable++){
			if(viziQuerExpr["exprVariables"][variable].startsWith("@")) viziQuerExpr["exprVariables"][variable] = viziQuerExpr["exprVariables"][variable].substring(1);
		}

		if(typeof where["expression"]["termType"] !== "undefined" && Object.keys(classesTable).length == 0 && getVariable(where["expression"])["type"] == "iri"){
			let subjectNameParsed = getVariable(where["expression"]);
			
			let className = await generateInstanceAlias(subjectNameParsed["value"]);

			classesTable[subjectNameParsed["value"]] = {
							"variableName":where["expression"]["value"],
							"identification":null,
							"instanceAlias":className,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false,
							"orderCounter":where["tableCounter"]
						};
			classTableAdded.push(subjectNameParsed["value"]);
			nodeList[subjectNameParsed["value"]] = [];
			nodeList[subjectNameParsed["value"]]["uses"] = [];
			nodeList[subjectNameParsed["value"]]["uses"][subjectNameParsed["value"]] = "class";
		} else if(where["expression"]["termType"] === "undefined"){
			let temp = await parseSPARQLjsStructureWhere( where["expression"], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
			bindTable = temp["bindTable"];
			viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
		}
		
		var bindExpr = viziQuerExpr["exprString"];
		
		if(bindExpr == "" && typeof where["expression"]["termType"] !== "undefined" && where["expression"]["termType"] !== "Variable") bindExpr = "`" + await generateInstanceAlias(where["expression"]["value"]);
		else if(bindExpr == "") bindExpr = await generateInstanceAlias(where["expression"]["value"]);
		if(typeof where["expression"]["termType"] !== "undefined"){
			var bindExprParse = getVariable(where["expression"]);
			if(bindExprParse["type"] == "number") bindExpr = bindExprParse["value"];
		}
		let isInternal = true;
		// if(typeof variableList[where["variable"]] !== "undefined" && variableList[where["variable"]] <= 1) isInternal = true;
		let attributeInfo = {
			"alias":where["variable"]["value"],
			"identification":null,
			"requireValues":true,
			"isInternal":isInternal,
			"groupValues":false,
			"exp":bindExpr,
			"counter":orderCounter,
			"orderCounter":where["variable"]["tableCounter"]
			
		}
		orderCounter++;
		bindTable[where["variable"]["value"]] = attributeInfo;
		
		if(viziQuerExpr["exprString"] != "" && Object.keys(findByVariableName(attributeTable, viziQuerExpr["exprVariables"][0])).length > 0){
			let attributes = findByVariableName(attributeTable, viziQuerExpr["exprVariables"][0]);
			for(let attribute in attributes){
				if(typeof attributes[attribute] !== "function"){
					classesTable[attributeTable[attribute]["class"]] = addAttributeToClass(classesTable[attributeTable[attribute]["class"]], attributeInfo);
					// console.log("17", attributeInfo)
					variableList[where["variable"]["value"]] = "seen";
					bindTable[where["variable"]["value"]]["seen"] = true;
					bindTable[where["variable"]["value"]]["class"] = attributeTable[attribute]["class"];
				}
			}
		}
		
		
		
		if(typeof classesTable[viziQuerExpr["exprVariables"][0]] !== 'undefined' && typeof nodeList[viziQuerExpr["exprVariables"][0]] !== "undefined"){		
			let className = viziQuerExpr["exprVariables"][0];
			let classUnderOptional = false;
			if(bgptype == "plain"){
				for(let link = 0; link< linkTable.length; link++){
					if( typeof linkTable[link] !== "undefined" && linkTable[link]["linkType"] == "OPTIONAL" && linkTable[link]["object"] == className) {
						classUnderOptional = true;
						break;
					}
				}
			}

			if(classUnderOptional != true){
				classesTable[viziQuerExpr["exprVariables"][0]] = addAttributeToClass(classesTable[viziQuerExpr["exprVariables"][0]], attributeInfo);
				// console.log("18", attributeInfo, bgptype, viziQuerExpr["exprVariables"][0])
				variableList[where["variable"]["value"]] = "seen";
				bindTable[where["variable"]["value"]]["seen"] = true;
				bindTable[where["variable"]["value"]]["class"] = viziQuerExpr["exprVariables"][0];
			} 
		} else if(Object.keys(nodeList).length === 1 && Object.keys(nodeList[Object.keys(nodeList)[0]]["uses"]).length === 1){
			let className = Object.keys(nodeList)[0];
			let classID = Object.keys(nodeList[className]["uses"])[0];
			
			classesTable[classID] = addAttributeToClass(classesTable[classID], attributeInfo);
				// console.log("18,5", className, classID, attributeInfo, bgptype, viziQuerExpr["exprVariables"][0])
				variableList[where["variable"]["value"]] = "seen";
				bindTable[where["variable"]["value"]]["seen"] = true;
				bindTable[where["variable"]["value"]]["class"] = classID;
		}
	}
	// type=functionCall
	if(where["type"] == "functionCall"){
		var whereFunction = where["function"]["value"]
		var functionName = "<"+whereFunction+">"
		var ignoreFunction = false;
		//if(where["function"] == "http://www.w3.org/2001/XMLSchema#dateTime" || where["function"] == "http://www.w3.org/2001/XMLSchema#date" || where["function"] == "http://www.w3.org/2001/XMLSchema#decimal") ignoreFunction = true;
		if(whereFunction == "http://www.w3.org/2001/XMLSchema#decimal") ignoreFunction = true;
			
		var shortFunction = await generateInstanceAlias(whereFunction, false);
		
		if(shortFunction != whereFunction) functionName = shortFunction;
		
		if(ignoreFunction == false) viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + functionName + "(";
		let args = [];
		
		for(let arg = 0; arg < where["args"].length; arg++){		
			if(typeof where["args"][arg]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][arg]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				args.push(arg1["value"]);
			}
			else if(typeof where["args"][arg] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
			if(typeof where["args"][0]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
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
				let temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				if((where["operator"] == "*" || where["operator"] == "/") && (typeof where["args"][0]["type"] === 'undefined' || (typeof where["args"][0]["type"] !== 'undefined' && where["args"][0]["type"] != "functionCall"))) viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "(" +temp["viziQuerExpr"]["exprString"] + ")";
				else viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				bindTable = temp["bindTable"];
			}

			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + where["operator"] + " ";
			
			if(typeof where["args"][1]["termType"] !== 'undefined') {
				let arg2 = generateArgument(where["args"][1]);
				if(arg2["type"] == "varName") viziQuerExpr["exprVariables"].push(arg2["value"]);
				let argValue = arg2["value"];
				
				
				if(arg2["type"] == "iri" && checkIfRelation(where["operator"]) != -1) {
					if(argValue.startsWith("http://www.w3.org/2001/XMLSchema#")) argValue = "xsd:" + argValue.substring(33)
					else if(argValue.startsWith("http://www.w3.org/1999/02/22-rdf-syntax-ns#")) argValue = "rdf:" + argValue.substring(43)
					else {
						argValue = await generateInstanceAlias(argValue)
					}
				} else if(arg2["type"] == "RDFLiteral" && arg2["value"].indexOf("^^") !== -1){	
					var uri = arg2["value"].substring(arg2["value"].indexOf("^^")+2, arg2["value"].length)
					uri = await generateInstanceAlias(uri, false);	
					argValue = arg2["value"].substring(0, arg2["value"].indexOf("^^")) + "^^" + uri;
				}
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][1], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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

			if(typeof where["args"][0]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][0]);
				
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined' && where["operator"] != "bound" && variableList[argValue] <= 1) argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);		
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";
		}
		//two argumentFunctions
		else if(checkIfTwoArgunemtFunctuion(where["operator"]) != -1){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";

			if(typeof where["args"][0]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
				argValue = await generateInstanceAlias(argValue);
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ", ";
			
			if(typeof where["args"][1]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][1]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
				if(arg1["type"] !== "string") argValue = await generateInstanceAlias(argValue);
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][1], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";
		}
		//IF
		else if(where["operator"]== "if"){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";

			if(typeof where["args"][0]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ", ";
			
			if(typeof where["args"][1]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][1]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
				if(arg1["type"] == "iri"){
					argValue = await generateInstanceAlias(arg1["value"])
				}
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][1], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ", ";
			
			if(typeof where["args"][2]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][2]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
				if(arg1["type"] == "iri"){
					argValue = await generateInstanceAlias(arg1["value"])
				}
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][2] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][2], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + ")";
		}
		//coalesce / concat / substr
		else if(where["operator"]== "coalesce" || where["operator"]== "concat"  || where["operator"]== "substr" || where["operator"]== "replace"){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";
			let args = [];
			
			for(let arg = 0; arg < where["args"].length; arg++){	
				if(typeof where["args"][arg]["termType"] !== 'undefined') {
					let arg1 = generateArgument(where["args"][arg]);
					if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
					let argValue = arg1["value"];
					if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
					args.push(argValue);
				}
				else if(typeof where["args"][arg] == 'object'){
					let temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
					bindTable = temp["bindTable"];
					args.push(temp["viziQuerExpr"]["exprString"]);
					viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
				}
			}
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ") + ")";
		}
		else if(where["operator"]== "regex"){
			let args = [];
			
			if(where["args"].length == 2 && typeof where["args"][1]["termType"] !== 'undefined'){
				let arg1;
				let arg2 = generateArgument(where["args"][1]);
				if(arg2["type"] == "string"){
					arg2 = arg2["value"];
					if(typeof where["args"][0]["termType"] !== 'undefined') {
						arg1 = generateArgument(where["args"][0]);
						let argValue = arg1["value"];
						if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
						arg1 = argValue;
					}
					else if(typeof where["args"][0] == 'object'){
						let temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						bindTable = temp["bindTable"];
						arg1 = temp["viziQuerExpr"]["exprString"];
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					}
					
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + arg1 + " ~ " + arg2;
				} else {
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";		
					for(let arg = 0; arg < where["args"].length; arg++){
						if(typeof where["args"][arg]["termType"] !== 'undefined') {
							let arg1 = generateArgument(where["args"][arg]);
							if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
							let argValue = arg1["value"];
							if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
							args.push(argValue);
						}
						else if(typeof where["args"][arg] == 'object'){
							let temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
							bindTable = temp["bindTable"];
							args.push(temp["viziQuerExpr"]["exprString"]);
							viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
						}
					}
					viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ") + ")";
				}
				
			} else {	
			    viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] + "(";		
				for(let arg = 0; arg < where["args"].length; arg++){
					if(typeof where["args"][arg]["termType"] !== 'undefined') {
						let arg1 = generateArgument(where["args"][arg]);
						if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
						let argValue = arg1["value"];
						if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
						args.push(argValue);
					}
					else if(typeof where["args"][arg] == 'object'){
						let temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
						bindTable = temp["bindTable"];
						args.push(temp["viziQuerExpr"]["exprString"]);
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
					}
				}
				if(args[1].startsWith('"') && args[1].endsWith('"') && args[2] == '"i"' && where["args"][0]["termType"] == "Variable"){
					viziQuerExpr["exprString"] = args[0] + " ~* " + args[1];
				}
				else viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + args.join(", ") + ")";
			}
		}
		// !
		else if(where["operator"] == "!"){
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"]  + where["operator"] ;

			if(typeof where["args"][0]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		//not exists
		else if(where["operator"] == "notexists"){
			
			
			let nodeLitsTemp = [];
			
			if(where["args"].length == 1 && where["args"][0]["type"] == "bgp" 
				&& where["args"][0]["triples"].length == 1 
				&& where["args"][0]["triples"][0]["object"]["termType"] !== "BlankNode"
				&& where["args"][0]["triples"][0]["subject"]["termType"] !== "BlankNode" ){
		
				let collectNodeListTemp  = await collectNodeList(where["args"]);
				let temp  = collectNodeListTemp["nodeList"];
				for(let node in temp){
					if(typeof temp[node] !== "function"){
						nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
					}
				}
				let params = {name: where["args"][0]["triples"][0]["predicate"]["value"]};
				if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
				let dataPropertyResolved = await dataShapes.resolvePropertyByName(params);
				
				
				
				if(dataPropertyResolved.complete==true){
					
					let sn = dataPropertyResolved.data[0].display_name;
					if(schemaName == "wikidata" && dataPropertyResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
					else if(dataPropertyResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = dataPropertyResolved.data[0].prefix+ ":" + sn;
					dataPropertyResolved.data[0].short_name = sn;
					
					if(dataPropertyResolved.data[0].data_cnt == 0 || Object.keys(classesTable).length == 0){
						var classesS = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"]["value"])
						var classesO = findByVariableName(classesTable, where["args"][0]["triples"][0]["object"]["value"])
						
						
						if(classesO.length == 0 || classesS.length == 0 ){
 
							if(Object.keys(classesO).length > 0 && Object.keys(classesS).length > 0){
								let classS;
								let classO;
								
								for(let clazz in classesS){
									if(typeof classesS[clazz] !== "function"){
										classS = clazz;
										break;
									}
								}
								for(let clazz in classesO){
									if(typeof classesO[clazz] !== "function"){
									classO = clazz;
									break;
									}
								}
								
								let link = {
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
								let linkFound = false;
								let temp = await generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList, selectVariables);
								for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
									if(typeof temp["classTableAdded"][clazz] !== "function"){
										for(let link = 0; link< linkTable.length; link++){
										 if(typeof linkTable[link] !== "undefined"){
											if(linkTable[link]["subject"] == temp["classTableAdded"][clazz] || linkTable[link]["object"] == temp["classTableAdded"][clazz]) {
												linkTable[link]["linkType"] = "NOT";
												linkFound == true;
											}
										 }
										}
									}
								}
								if(linkFound == false){
									
									linkTable = connectNotConnectedClasses(classesTable, linkTable, nodeLitsTemp);

									for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
										if(typeof temp["classTableAdded"][clazz] !== "function"){
											let linkFound = false;
											for(let link = 0; link< linkTable.length; link++){
											 if(typeof linkTable[link] !== "undefined"){
												if(linkTable[link]["subject"] == temp["classTableAdded"][clazz] || linkTable[link]["object"] == temp["classTableAdded"][clazz]) {
													linkTable[link]["linkType"] = "NOT";
													linkFound == true;
												}
											 }
											}
										}
									}
								}
							}							
						} else {
							let classS;
							let classO;
							
							for(let clazz in classesS){
								if(typeof classesS[clazz] !== "function"){
									classS = clazz;
									break;
								}
							}
							for(let clazz in classesO){
								if(typeof classesO[clazz] !== "function"){
								classO = clazz;
								break;
								}
							}
							
							let link = {
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
						let exprVariables = [];
						exprVariables.push(dataPropertyResolved.data[0]["short_name"]);
						filterTable.push({filterString:"NOT EXISTS " + dataPropertyResolved.data[0]["short_name"], filterVariables:exprVariables});
						
						let subject;
						let object;
						
						if(schemaName == "wikidata") {
							var subjectTemp = await dataShapes.getTreeIndividualsWD(where["args"][0]["triples"][0]["subject"]["value"]);
							var objectTemp = await dataShapes.getTreeIndividualsWD(where["args"][0]["triples"][0]["object"]["value"]);
							subject = {"data": subjectTemp};
							if(subjectTemp.length > 0) subject.complete = true; 
							object = {"data": objectTemp};
							if(objectTemp.length > 0) object.complete = true; 							
						} else {
							let params = {name: where["args"][0]["triples"][0]["subject"]["value"]};
							if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
							subject = await dataShapes.resolveIndividualByName(params);
							params.name = where["args"][0]["triples"][0]["object"]["value"];
							object = await dataShapes.resolveIndividualByName(params);
						}

						let filterAdded = false;
						
						let classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"]["value"])
						if(generateOnlyExpression != true){
							for(let clazz in classes){
								if(typeof classes[clazz] !== "function"){
									if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
									classesTable[clazz]["conditions"].push("NOT EXISTS " + dataPropertyResolved.data[0]["short_name"]);
									
									filterAdded = true;
									break;
									//temp["attributeTable"][temp["attributeTableAdded"][attribute]]["seen"] = true;
								}
							}
						}
						if(filterAdded == false){
							viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + dataPropertyResolved.data[0]["short_name"];
							viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
						}
					}
				} else if(typeof where["args"][0]["triples"][0]["predicate"] == "object"){	
					let temp = await generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList, selectVariables);
					let exprVariables = [];

					for(let attribute = 0; attribute < temp["attributeTableAdded"].length; attribute++){						
						exprVariables.push(temp["attributeTable"][temp["attributeTableAdded"][attribute]]["variableName"]);
						filterTable.push({filterString:"NOT EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"], filterVariables:exprVariables});
						
						let classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"]["value"])
						if(generateOnlyExpression != true){
							for(let clazz in classes){
								if(typeof classes[clazz] !== "function"){
									if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
									classesTable[clazz]["conditions"].push("NOT EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]);
									break;
								}
							}
						}
						viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
					}
					
					for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
						if(typeof temp["classTableAdded"][clazz] !== "function"){
							for(let link = 0; link< linkTable.length; link++){
							 if(typeof linkTable[link] !== "undefined"){
								if(linkTable[link]["subject"] == temp["classTableAdded"][clazz] || linkTable[link]["object"] == temp["classTableAdded"][clazz]) {
									linkTable[link]["linkType"] = "NOT";
								}
							 }
							}
						}
					}		
				}
			}else if(where["args"].length == 1 && where["args"][0]["type"] == "bgp" 
				&& where["args"][0]["triples"].length == 1 
				&& (where["args"][0]["triples"][0]["object"]["termType"] === "BlankNode"
				|| where["args"][0]["triples"][0]["subject"]["termType"] === "BlankNode") ){
				let collectNodeListTemp  = await collectNodeList(where["args"]);
							let temp  = collectNodeListTemp["nodeList"];
							for(let node in temp){
								if(typeof temp[node] !== "function"){
									nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
								}
							}
				temp = await generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, "optionalLink", allClasses, false, variableList, selectVariables);
				for(let l = 0; l < temp["linkTableAdded"].length; l++){
					temp["linkTableAdded"][l]["linkType"] = "NOT";
				}
					
			} else {	
				
				for(let arg = 0; arg < where["args"].length; arg++){
					
					if(where["args"][arg]["type"] == 'group'){
						let patterns =  where["args"][arg]["patterns"];
						let tempClassTable = [];
						for(let pattern  = 0; pattern < patterns.length; pattern++) {
							let collectNodeListTemp  = await collectNodeList(patterns);
							let temp  = collectNodeListTemp["nodeList"];
							for(let node in temp){
								if(typeof temp[node] !== "function"){
									nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
								}
							}
							 
							if(patterns[pattern]["type"] == "filter" && tempClassTable.length == 0){
								let temp = await parseSPARQLjsStructureWhere(patterns[pattern]["expression"], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);

								for(let attr = 0; attr < attributeTableAdded.length; attr++){ 
									let addedAttribute = attributeTableAdded[attr];

									// is not defined in attribute table and is schema property
									let params = {name: attributeTable[addedAttribute]["variableName"]};
									if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
									let propertyResolved = await dataShapes.resolvePropertyByName(params);
									if(typeof attributeTable[addedAttribute] !== 'undefined' && propertyResolved.complete == true) attributeTable[addedAttribute]["seen"] = true;
								}
								
								viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "NOT EXISTS " + temp["viziQuerExpr"]["exprString"];
								viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
	
							}  else{
								let temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								
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
						let collectNodeListTemp  = await collectNodeList(where["args"]);
						let temp  = collectNodeListTemp["nodeList"];
						for(let node in temp){
							if(typeof temp[node] !== "function"){
								nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
							}
						}
						
						for(let clazz in classesTable){
							if(typeof classesTable[clazz] !== "function"){
								allClasses[clazz] = classesTable[clazz];
							}
						}

						temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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

			for(let link = 0; link < linkTableAdded.length; link++){
				if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
					linkTableAdded[link]["linkType"] = "NOT";
					if(patternType == "minus") linkTableAdded[link]["isGlobalSubQuery"] = true;
					
					for(let attr = 0; attr < attributeTableAdded.length; attr++){
						let addAttribute = true;
						for(let filter = 0; filter < filterTable.length; filter++){
							if(filterTable[filter]["filterVariables"].indexOf("@" + attributeTableAdded[attr]) !== -1) addAttribute = false;
						}
						let attributeInfoTemp = attributeTable[attributeTableAdded[attr]];
						let attributeInfo = {
							"alias":attributeInfoTemp["alias"],
							"identification":attributeInfoTemp["identification"],
							"requireValues":attributeInfoTemp["requireValues"],
							"isInternal":false,
							"groupValues":false,
							"exp":attributeInfoTemp["identification"]["short_name"],
							"counter":attributeInfoTemp["counter"],
							"orderCounter":attributeInfoTemp["orderCounter"]
						}
						
						if(addAttribute === true)classesTable[attributeTable[attributeTableAdded[attr]]["class"]] = addAttributeToClass(classesTable[attributeTable[attributeTableAdded[attr]]["class"]], attributeInfo);
						// console.log("19", attributeInfo, attributeTable[attributeTableAdded[attr]], filterTable)
						attributeTable[attributeTableAdded[attr]]["seen"] = true;
					}
				}
			}
			linkTable = linkTable.concat(linkTableAdded);

			// console.log("NOT EXISTS", nodeLitsTemp, nodeList, linkTable, linkTableAdded, classTableAdded);
		}
		//exists
		else if(where["operator"] == "exists"){
			let nodeLitsTemp = [];

			if(where["args"].length == 1 && where["args"][0]["type"] == "bgp" && where["args"][0]["triples"].length == 1){
				let collectNodeListTemp  = await collectNodeList(where["args"]);
				let temp  = collectNodeListTemp["nodeList"];
				for(let node in temp){
					if(typeof temp[node] !== "function"){
						nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
					}
				}
				let params = {name: where["args"][0]["triples"][0]["predicate"]["value"]};
				if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
				let dataPropertyResolved = await dataShapes.resolvePropertyByName(params);
				
				
				if(dataPropertyResolved.complete==true){
					let exprVariables = [];
					
					let sn = dataPropertyResolved.data[0].display_name;
					if(schemaName == "wikidata" && dataPropertyResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
					else if(dataPropertyResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = dataPropertyResolved.data[0].prefix+ ":" + sn;
					dataPropertyResolved.data[0].short_name = sn;
					
					// dataPropertyResolved.data[0]["short_name"] = dataPropertyResolved.data[0]["prefix"] +":"+ dataPropertyResolved.data[0]["display_name"];
					exprVariables.push(dataPropertyResolved.data[0]["short_name"]);

					let classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"]["value"])
					filterTable.push({filterString:"EXISTS " + dataPropertyResolved.data[0]["short_name"], filterVariables:exprVariables});
					if(where["args"][0]["triples"][0]["object"]["termType"] == "Literal"){
						temp = await generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, false, variableList, selectVariables);
						
						filterTable = temp["filterTable"];
						for(let filter = 0; filter < temp["filterTable"].length; filter++){
							if(generateOnlyExpression != true){
								for(let clazz in classes){
									if(typeof classes[clazz] !== "function"){
										if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
										classesTable[clazz]["conditions"].push(temp["filterTable"][filter]["filterString"]);
										break;
									}
								}
							}
						}
					}
					else{
						if(generateOnlyExpression != true){
							for(let clazz in classes){
								if(typeof classes[clazz] !== "function"){
									if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
									classesTable[clazz]["conditions"].push("EXISTS " + dataPropertyResolved.data[0]["short_name"]);

									break;
								}
							}
						}
						viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "EXISTS " + dataPropertyResolved.data[0]["short_name"];
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
					}
				}else if(typeof where["args"][0]["triples"][0]["predicate"] == "object"){
					let temp = await generateTypebgp(where["args"][0]["triples"], nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList, selectVariables);
					let exprVariables = [];
					
					for(let attribute = 0; attribute < temp["attributeTableAdded"].length; attribute++){
						exprVariables.push(temp["attributeTable"][temp["attributeTableAdded"][attribute]]["variableName"]);
						filterTable.push({filterString:"EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"], filterVariables:exprVariables});
						
						let classes = findByVariableName(classesTable, where["args"][0]["triples"][0]["subject"]["value"])
						if(generateOnlyExpression != true){
							for(let clazz in classes){
								if(typeof classes[clazz] !== "function"){
									if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
									classesTable[clazz]["conditions"].push("EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]);
									temp["attributeTable"][temp["attributeTableAdded"][attribute]]["seen"] = true;
		
									break;
								}
							}
						}
						viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ "EXISTS " + temp["attributeTable"][temp["attributeTableAdded"][attribute]]["exp"]
						viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(exprVariables);
					}
					
					for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
						if(typeof temp["classTableAdded"][clazz] !== "function"){
							for(let link = 0; link< linkTable.length; link++){
							 if(typeof linkTable[link] !== "undefined"){
								if(linkTable[link]["subject"] == temp["classTableAdded"][clazz] || linkTable[link]["object"] == temp["classTableAdded"][clazz]) {
									linkTable[link]["isSubQuery"] = true;
									linkTable[link]["linkType"] = "FILTER_EXISTS";
								}
							 }
							}
						}
					}
				}
			} else {
				let nodeLitsTemp = [];
				
				for(let arg = 0; arg < where["args"].length; arg++){
					if(where["args"][arg]["type"] == 'group'){
						let patterns =  where["args"][arg]["patterns"];
						let collectNodeListTemp = await collectNodeList(patterns);
						let temp  = collectNodeListTemp["nodeList"];

						for(let node in temp){
							if(typeof temp[node] !== "function"){
								nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
							}
						}
						
						var notBgpOrfilter = false;
						for(let pattern  = 0; pattern < patterns.length; pattern++) {
							if(patterns[pattern]["type"] != "bgp" || patterns[pattern]["type"] != "filter") notBgpOrfilter = true;
						}
						if(notBgpOrfilter == true){
							let tempClassTable = [];
							for(let pattern  = 0; pattern < patterns.length; pattern++) {
								if( patterns[pattern]["type"] == "bgp"){
									let triples = patterns[pattern]["triples"];
									temp = await generateTypebgp(triples, nodeLitsTemp, nodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList, selectVariables);
									tempClassTable = tempClassTable.concat(temp["classTableAdded"]);
		
									if(typeof temp["nodeLits"] !== 'undefined')nodeLitsTemp = temp["nodeLits"];

									for(let attr = 0; attr < temp["attributeTableAdded"].length; attr++) {
										let addedAttribute = temp["attributeTableAdded"][attr];
										// (if not in attribute table and is schema OP) or (is schema DP)
										let params = {name: attributeTable[addedAttribute]["variableName"]};
										if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
										let propertyResolved = await dataShapes.resolvePropertyByName(params);
										if(typeof attributeTable[addedAttribute] !== 'undefined' && propertyResolved.complete == true && propertyResolved.data[0].object_cnt > 0 || (propertyResolved.complete == true  && propertyResolved.data[0].data_cnt > 0))  attributeTable[addedAttribute]["seen"] = true;
									}
								} else{
									temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
									viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
									viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
								}
							}
							
							for(let link = 0; link< linkTable.length; link++){
							 if(typeof linkTable[link] !== "undefined"){
								if((tempClassTable.indexOf(linkTable[link]["object"]) != -1 && tempClassTable.indexOf(linkTable[link]["subject"]) == -1) || 
								(tempClassTable.indexOf(linkTable[link]["object"]) == -1 && tempClassTable.indexOf(linkTable[link]["subject"]) != -1)) {
									linkTable[link]["isSubQuery"] = true;
									linkTable[link]["linkType"] = "FILTER_EXISTS";
								}
							 }
							}
							
						}else{
							for(let pattern  = 0; pattern < patterns.length; pattern++) {
								let temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp,  nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
						let collectNodeListTemp  = await collectNodeList(where["args"]);
						let temp  = collectNodeListTemp["nodeList"];
						for(let node in temp){
							if(typeof temp[node] !== "function"){
								nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
							}
						}
						
						if(where["args"][arg]["type"] == "bgp"){
							let triples = where["args"][arg]["triples"];
							for(let triple = 0; triple < triples.length; triple++) {
							  if(typeof triples[triple] !== "undefined"){
								let params = {name: triples[triple]["predicate"]["value"]};
								if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
								let dataPropertyResolved = await dataShapes.resolvePropertyByName(params);
									// is schema data property
								if(dataPropertyResolved.complete == true && dataPropertyResolved.data[0].data_cnt> 0 && dataPropertyResolved.data[0].object_cnt == 0){
									
									let sn = dataPropertyResolved.data[0].display_name;
									if(schemaName == "wikidata" && dataPropertyResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
									else if(dataPropertyResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = dataPropertyResolved.data[0].prefix+ ":" + sn;
									dataPropertyResolved.data[0].short_name = sn;
									
									
									// dataPropertyResolved.data[0]["short_name"] = dataPropertyResolved.data[0]["prefix"] + ":" + dataPropertyResolved.data[0]["display_name"];
									let exprVariables = [];
									exprVariables.push(dataPropertyResolved.data[0]["local_name"]);
									filterTable.push({filterString:"EXISTS " + dataPropertyResolved.data[0]["short_name"], filterVariables:exprVariables});
									
									let classes = findByVariableName(classesTable, triples[triple]["subject"]["value"])
									if(generateOnlyExpression != true){
										for(let clazz in classes){
											if(typeof classes[clazz] !== "function"){
												if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
												classesTable[clazz]["conditions"].push("EXISTS " + dataPropertyResolved.data[0]["short_name"]);
												break;
											}
										}
									}
								} else {
									temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
						} else{
							let temp = await parseSPARQLjsStructureWhere(where["args"][arg], nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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

			for(let link = 0; link < linkTableAdded.length; link++){
				if(classTableAdded.indexOf(linkTableAdded[link]["object"]) == -1 || classTableAdded.indexOf(linkTableAdded[link]["subject"]) == -1){
					linkTableAdded[link]["linkType"] = "FILTER_EXISTS";
					linkTableAdded[link]["isSubQuery"] = true;
					for(let attr = 0; attr < attributeTableAdded.length; attr++){
						let attributeInfoTemp = attributeTable[attributeTableAdded[attr]];
						let attributeInfo = {
							"alias":attributeInfoTemp["alias"],
							"identification":attributeInfoTemp["identification"],
							"requireValues":attributeInfoTemp["requireValues"],
							"isInternal":false,
							"groupValues":false,
							"exp":attributeInfoTemp["identification"]["short_name"],
							"counter":attributeInfoTemp["counter"],
							"orderCounter":attributeInfoTemp["orderCounter"]
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
			if(typeof where["args"][0]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}

			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + where["operator"] + " ";

			if(typeof where["args"][1]["termType"] !== 'undefined') {
				let arg2 = generateArgument(where["args"][1]);
				if(arg2["type"] == "varName") viziQuerExpr["exprVariables"].push(arg2["value"]);
				let argValue = arg2["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][1] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][1], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
		}
		// in / not in
		else if(where["operator"] == "in" || where["operator"] == "notin" ){
			if(typeof where["args"][0]["termType"] !== 'undefined') {
				let arg1 = generateArgument(where["args"][0]);
				if(arg1["type"] == "varName") viziQuerExpr["exprVariables"].push(arg1["value"]);
				let argValue = arg1["value"];
				if(typeof attributeTable[argValue] !== 'undefined' && typeof attributeTable[argValue]["exp"] !== 'undefined') argValue = attributeTable[argValue]["exp"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + argValue;
			}
			else if(typeof where["args"][0] == 'object'){
				let temp = await parseSPARQLjsStructureWhere(where["args"][0], nodeList, parentNodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, patternType, bindTable, generateOnlyExpression);
				bindTable = temp["bindTable"];
				viziQuerExpr["exprString"] = viziQuerExpr["exprString"]+ temp["viziQuerExpr"]["exprString"];
				viziQuerExpr["exprVariables"] = viziQuerExpr["exprVariables"].concat(temp["viziQuerExpr"]["exprVariables"]);
			}
			var operator = "";
			if (where["operator"] == "in") operator = "IN";
			if (where["operator"] == "notin") operator = "NOT IN";
			
			viziQuerExpr["exprString"] = viziQuerExpr["exprString"] + " " + operator + "(";

			if(typeof where["args"][1] == 'object'){
				let args = [];
				for(let arg = 0; arg < where["args"][1].length; arg++){
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
	if(where["type"] == "service"){
		let serviceSchemaName = "";
		let tempSchemaName = schemaName;
		let tempShowPrefixesForAllNames = showPrefixesForAllNames;
		let tempDirectClassMembershipRole = directClassMembershipRole;
		let tempInDirectClassMembershipRole = indirectClassMembershipRole;
		let ontologies = await dataShapes.getOntologies();
		for(onto = 0; onto < ontologies.length; onto++){
			if(ontologies[onto]["sparql_url"] === where["name"]["value"]){
				
				directClassMembershipRole = ontologies[onto]["direct_class_role"];
				indirectClassMembershipRole = ontologies[onto]["indirect_class_role"];
				schemaName = ontologies[onto]["db_schema_name"];
				serviceSchemaName = ontologies[onto]["display_name"];
				showPrefixesForAllNames = true;
				if(directClassMembershipRole == "" || directClassMembershipRole == "a" || directClassMembershipRole == "rdf:type") directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
				else if(directClassMembershipRole == "wdt:P31") directClassMembershipRole = "http://www.wikidata.org/prop/direct/P31";
				else directClassMembershipRole = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
				
				if(indirectClassMembershipRole == "wdt:P31/wdt:P279*") indirectClassMembershipRole = "[instance of (P31)].[subclass of (P279)]*";
				if(indirectClassMembershipRole == "wdt:P31.wdt:P279*") indirectClassMembershipRole = "[instance of (P31)].[subclass of (P279)]*";
				
				break;
			}
		}
		
		let nodeLitsTemp = nodeList;
		let patterns =  where["patterns"];
		let linkType = "REQUIRED";
		if(patterns.length === 1 && patterns[0]["type"] === "optional"){
			patterns = patterns[0]["patterns"];
			linkType = "OPTIONAL";
		} 
		
	
		let collectNodeListTemp = await collectNodeList(patterns);
		let temp  = collectNodeListTemp["nodeList"];
		
		let graphName = await generateInstanceAlias(where.name.value, false);
		let wherePattern = {where:patterns};
		let allClassesTemp = allClasses;
		let parentNodeListTemp = [];
		
		if(patterns.length === 1 && patterns[0]["type"] === "query"){
			wherePattern = patterns[0];
		}
		if(patterns.length === 1 && patterns[0]["type"] === "group" && patterns[0]["patterns"].length === 1 && patterns[0]["patterns"][0]["type"] === "query"){
			allClassesTemp = classesTable;
			parentNodeListTemp = nodeLitsTemp;
		}
		// console.log("SERVICE", allClasses, nodeLitsTemp)
		// let abstractTable = await generateAbstractTable(wherePattern, allClasses, variableList, []);	
		let abstractTable = await generateAbstractTable(wherePattern, allClassesTemp, variableList, parentNodeListTemp);
	
				
		for(let clazz in abstractTable["classesTable"]){
			if(typeof abstractTable["classesTable"][clazz] !== "function"){
				allClasses[clazz] = abstractTable["classesTable"][clazz];
			}
		}
		
		let linkFound = false;
		var pn = null;
		for(let node in abstractTable["nodeList"]){
			if(typeof nodeList[node] !== 'undefined' && typeof nodeList[node] !== 'function'){
				//find links outside subquery
				for(let subLink = 0; subLink < abstractTable["linkTable"].length; subLink++){
					if(typeof abstractTable["linkTable"][subLink] !== "undefined"){
						if((typeof classesTable[abstractTable["linkTable"][subLink]["subject"]]!=='undefined' && classesTable[abstractTable["linkTable"][subLink]["subject"]]["variableName"] == node) 
							|| (typeof classesTable[abstractTable["linkTable"][subLink]["object"]] !== 'undefined' && classesTable[abstractTable["linkTable"][subLink]["object"]]["variableName"] == node)){
							if(linkFound==false){
								// let subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"subject", nodeList[node]);
								// pn = nodeList[node];
								// if(subSelectMainClass == null){
									// for(let subClass in abstractTable["classesTable"]){
										// if(typeof abstractTable["classesTable"][subClass] !== "function"){
											// subSelectMainClass = subClass;
											// break;
										// }
									// }
								 // } 

								abstractTable["linkTable"][subLink]["graphInstructionLink"] = where["type"].toUpperCase();
								abstractTable["linkTable"][subLink]["graphLink"] = graphName;
								abstractTable["linkTable"][subLink]["serviceSchemaName"] = serviceSchemaName;
								abstractTable["linkTable"][subLink]["linkType"] = linkType;
								
								let subSelectMainClass = abstractTable["linkTable"][subLink]["object"];
								if(subSelectMainClass === node) subSelectMainClass = abstractTable["linkTable"][subLink]["subject"];
								
								// abstractTable["linkTable"][subLink]["isSubQuery"] = isSubQuery;
								// abstractTable["linkTable"][subLink]["isGlobalSubQuery"] = isGlobalSubQuery;
								// if(where["type"] == "optional") abstractTable["linkTable"][subLink]["linkType"] = "OPTIONAL";
								linkFound = true;
								
								
								
								for(let subLink2 = 0; subLink2 < abstractTable["linkTable"].length; subLink2++){
									if(typeof abstractTable["linkTable"][subLink2] !== "undefined"){
										if((abstractTable["linkTable"][subLink2]["subject"] === node || abstractTable["linkTable"][subLink2]["object"] === node) && abstractTable["linkTable"][subLink2] !== abstractTable["linkTable"][subLink]){
											if(abstractTable["linkTable"][subLink2]["linkIdentification"]["short_name"] === "++"){
												if(abstractTable["linkTable"][subLink2]["subject"] === node) abstractTable["linkTable"][subLink2]["subject"] = subSelectMainClass;
												else abstractTable["linkTable"][subLink2]["object"] = subSelectMainClass;
											} else {
												
											}
										}
									}
								}
							}
						}
						linkTable.push(abstractTable["linkTable"][subLink]);
					}

				}
			}
		}
		
		// UNIT
		if(Object.keys(nodeList).length == 0){
					
			if(typeof classesTable["[ ]"] === 'undefined' && typeof allClasses["[ ]"] === 'undefined'){
				classesTable["[ ]"] = {
					"variableName":"[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classTableAdded.push("[ ]");
				nodeList["[ ]"]= {uses: {"[ ]": "class"}, count:1};
			}else {
				classesTable["[ ]"+counter] = {
					"variableName":"[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classTableAdded.push("[ ]"+counter);
				if(typeof nodeList["[ ]"] === 'undefined') nodeList["[ ]"] = {uses: [], count:1}
				nodeList["[ ]"]["uses"]["[ ]"+counter] = "class";
				nodeList["[ ]"]["count"] = nodeList["[ ]"]["count"]+1;
				counter++;
			}
		}
		if(linkFound == false){
			// let linkType = "REQUIRED"
			if(where["type"] == "optional") linkType = "OPTIONAL";
			if(typeof nodeList["[ ]"] !== 'undefined'){
				for(let unionClass in nodeList["[ ]"]["uses"]){
					let object;
					if(typeof nodeList["[ ]"]["uses"][unionClass] !== "function"){
						object = findClassToConnectUNIT(abstractTable["classesTable"], abstractTable["linkTable"], null, "object");
						if(object == null){
							for(let subClass in abstractTable["classesTable"]){
								if(typeof abstractTable["classesTable"][subClass] !== "function"){
									object = subClass;
									break;
								}
							}
						}
					}
					let isSubQuery = false;
					let isGlobalSubQuery = false;
					let graphInstructionLink = where["type"].toUpperCase();
					let graphLink = graphName;
					if(patterns.length === 1 && patterns[0]["type"] === "query"){
						isSubQuery = true
						if(typeof where["patterns"][0]["limit"] !== 'undefined' || typeof where["patterns"][0]["offset"] !== 'undefined' || abstractTable["orderTable"].length > 0){
							isGlobalSubQuery = true;
							isSubQuery = false;
							if(typeof where["patterns"][0]["limit"] !== 'undefined') abstractTable["classesTable"][object]["limit"] =  where["patterns"][0]["limit"];
							if(typeof where["patterns"][0]["offset"] !== 'undefined' && where["patterns"][0]["offset"] != 0) abstractTable["classesTable"][object]["offset"] =  where["patterns"][0]["offset"];
							if(typeof where["patterns"][0]["distinct"] !== 'undefined') abstractTable["classesTable"][object]["distinct"] =  where["patterns"][0]["distinct"];
						}
						let tempObject = object;
						if(typeof classesTable["[ ]"] === 'undefined' && typeof allClasses["[ ]"] === 'undefined'){
							classesTable["[ ]"] = {
								"variableName":"[ ]",
								"identification":null,
								"instanceAlias":"",
								"isVariable":false,
								"isUnit":true,
								"isUnion":false
							};
							classTableAdded.push("[ ]");
							nodeList["[ ]"]= {uses: {"[ ]": "class"}, count:1};
							object = "[ ]";
						}else {
							classesTable["[ ]"+counter] = {
								"variableName":"[ ]",
								"identification":null,
								"instanceAlias":"",
								"isVariable":false,
								"isUnit":true,
								"isUnion":false
							};
							classTableAdded.push("[ ]"+counter);
							if(typeof nodeList["[ ]"] === 'undefined') nodeList["[ ]"] = {uses: [], count:1}
							nodeList["[ ]"]["uses"]["[ ]"+counter] = "class";
							nodeList["[ ]"]["count"] = nodeList["[ ]"]["count"]+1;
							object = "[ ]"+counter;
							counter++;
						}
						
						let link = {
							"linkIdentification":{local_name: "++", short_name: "++"},
							"object":tempObject,
							"subject":object,
							"isVisited":false,
							"linkType":linkType,
							"isSubQuery":isSubQuery,
							"isGlobalSubQuery":isGlobalSubQuery,
							"counter":orderCounter,
						}
						isSubQuery = false;
						isGlobalSubQuery = false;

						linkTable.push(link);
						linkTableAdded.push(link);
						
					}
					
					
					let link = {
						"linkIdentification":{local_name: "++", short_name: "++"},
						"object":object,
						"subject":unionClass,
						"isVisited":false,
						"linkType":linkType,
						"isSubQuery":isSubQuery,
						"isGlobalSubQuery":isGlobalSubQuery,
						"counter":orderCounter,
						"serviceSchemaName":serviceSchemaName,
						"graphInstructionLink":graphInstructionLink,
						"graphLink": graphLink
					}

					linkTable.push(link);
					linkTableAdded.push(link);
					linkFound = true;
					orderCounter++;
				}
			}
			if(typeof abstractTable["nodeList"]["[ ]"] !== 'undefined'){
				for(let unionClass in abstractTable["nodeList"]["[ ]"]["uses"]){
				  if(typeof abstractTable["nodeList"]["[ ]"]["uses"][unionClass] !== "function"){
					let subject = findClassToConnectUNIT(classesTable, linkTable, nodeList, "subject");
					if(subject == null){
						for(let subClass in classesTable){
							if(typeof classesTable[subClass] !== "function"){
								subject = subClass;
								break;
							}
						}
					}
	
					let link = {
						"linkIdentification":{local_name: "++", short_name: "++"},
						"object":unionClass,
						"subject":subject,
						"isVisited":false,
						"linkType":linkType,
						"isSubQuery":false,
						"isGlobalSubQuery":false,
						"counter":orderCounter,
						"serviceSchemaName":serviceSchemaName,
						"graphInstructionLink":where["type"].toUpperCase(),
						"graphLink": graphName
					}
	
					linkTable.push(link);
					linkTableAdded.push(link);
					linkFound = true;
					orderCounter++;
					
				  }
				}
			}
			for(let subLink = 0; subLink < abstractTable["linkTable"].length; subLink++){
				linkTable.push(abstractTable["linkTable"][subLink]);
			}
		}
		
		
		
		if(linkFound == false){
			// let linkType = "REQUIRED"
			if(where["type"] == "optional") linkType = "OPTIONAL";
			
			//if no link found
			// search for equals nodes in nodeList and parentNodeList
			for(let node in abstractTable["nodeList"]){
				if(typeof nodeList[node] !== 'undefined' && typeof nodeList[node] !== 'function'){
					for(let classNode in abstractTable["nodeList"][node]["uses"]){
						if(typeof abstractTable["nodeList"][node]["uses"][classNode] !== "function"){
							for(let classParentNode in nodeList[node]["uses"]){
								if(typeof nodeList[node]["uses"][classParentNode] !== "function"){
									if(typeof abstractTable["classesTable"][classNode]["fields"] !== "undefined"){
										let fields = abstractTable["classesTable"][classNode]["fields"];
										for(let field = 0; field < fields.length; field++){
											let className = "";
											if(typeof classesTable[fields[field]["alias"]] === "undefined"){
												classesTable[fields[field]["alias"]] = {
													"variableName":"",
													"identification":null,
													"instanceAlias":fields[field]["alias"],
													"isVariable":false,
													"isUnit":false,
													"isUnion":false
												};
												classTableAdded.push(fields[field]["alias"]);
												className = fields[field]["alias"];
											} else {
												classesTable[fields[field]["alias"]+counter] = {
													"variableName":"",
													"identification":null,
													"instanceAlias":fields[field]["alias"],
													"isVariable":false,
													"isUnit":false,
													"isUnion":false
												};
												classTableAdded.push(fields[field]["alias"]);
												className = fields[field]["alias"]+counter;
											}
											
											let link = {
												"linkIdentification":{local_name: fields[field]["exp"], short_name: fields[field]["exp"]},
												"object":className,
												"subject":classParentNode,
												"isVisited":false,
												"linkType":linkType,
												"isSubQuery":false,
												"isGlobalSubQuery":false,
												"counter":orderCounter,
												"serviceSchemaName":serviceSchemaName,
												"graphLink":graphName,
												"graphInstructionLink":where["type"].toUpperCase()
											}
											linkTable.push(link);
											linkTableAdded.push(link);
											orderCounter++;
		
											delete abstractTable["attributeTable"][fields[field]["alias"]];
										}
									}
									abstractTable["classesTable"][classNode]["fields"] = [];
									
									abstractTable["classesTable"][classParentNode] = abstractTable["classesTable"][classNode];
									classesTable[classParentNode] = abstractTable["classesTable"][classNode];
									
									delete abstractTable["classesTable"][classNode];
									classesTable[classParentNode]["graph"] = graphName;
									classesTable[classParentNode]["graphInstruction"] = where["type"].toUpperCase();
									classesTable[classParentNode]["serviceSchemaName"] = serviceSchemaName;
									
								}
							}
						}
					}
				}
			}
			
		}
		
		let subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"subject", pn);
		
		if(subSelectMainClass == null){
			for(let subClass in abstractTable["classesTable"]){
				if(typeof abstractTable["classesTable"][subClass] !== "function"){
					subSelectMainClass = subClass;
					break;
				}
			}
		}
		
		abstractTable["classesTable"][subSelectMainClass]["fullSPARQL"] = abstractTable["fullSPARQL"];
		
		if(linkFound == false){
			
			let parentSelectMainClass = findClassToConnect(classesTable, linkTable, null,"object", pn);
		
			if(parentSelectMainClass == null){
				for(let subClass in classesTable){
					if(typeof classesTable[subClass] !== "function"){
						parentSelectMainClass = subClass;
						break;
					}
				}
			}
			let isGlobalSubQuery = false;
			let isSubQuery = false;
			if(patterns.length === 1 && patterns[0]["type"] === "query"){
				isSubQuery = true
				if(typeof where["patterns"][0]["limit"] !== 'undefined' || typeof where["patterns"][0]["offset"] !== 'undefined' || abstractTable["orderTable"].length > 0){
					isGlobalSubQuery = true;
					isSubQuery = false;
					if(typeof where["patterns"][0]["limit"] !== 'undefined') abstractTable["classesTable"][object]["limit"] =  where["patterns"][0]["limit"];
					if(typeof where["patterns"][0]["offset"] !== 'undefined' && where["patterns"][0]["offset"] != 0) abstractTable["classesTable"][object]["offset"] =  where["patterns"][0]["offset"];
					if(typeof where["patterns"][0]["distinct"] !== 'undefined') abstractTable["classesTable"][object]["distinct"] =  where["patterns"][0]["distinct"];
				}
				let tempObject = subSelectMainClass;
				if(typeof classesTable["[ ]"] === 'undefined' && typeof allClasses["[ ]"] === 'undefined'){
							classesTable["[ ]"] = {
								"variableName":"[ ]",
								"identification":null,
								"instanceAlias":"",
								"isVariable":false,
								"isUnit":true,
								"isUnion":false
							};
							classTableAdded.push("[ ]");
							nodeList["[ ]"]= {uses: {"[ ]": "class"}, count:1};
							subSelectMainClass = "[ ]";
				}else {
							classesTable["[ ]"+counter] = {
								"variableName":"[ ]",
								"identification":null,
								"instanceAlias":"",
								"isVariable":false,
								"isUnit":true,
								"isUnion":false
							};
							classTableAdded.push("[ ]"+counter);
							if(typeof nodeList["[ ]"] === 'undefined') nodeList["[ ]"] = {uses: [], count:1}
							nodeList["[ ]"]["uses"]["[ ]"+counter] = "class";
							nodeList["[ ]"]["count"] = nodeList["[ ]"]["count"]+1;
							subSelectMainClass = "[ ]"+counter;
							counter++;
				}
						
				let link = {
							"linkIdentification":{local_name: "++", short_name: "++"},
							"object":tempObject,
							"subject":subSelectMainClass,
							"isVisited":false,
							"linkType":linkType,
							"isSubQuery":isSubQuery,
							"isGlobalSubQuery":isGlobalSubQuery,
							"counter":orderCounter,
				}
				isSubQuery = false;
				isGlobalSubQuery = false;

				abstractTable["linkTable"].push(link);
				linkTable.push(link);
				linkTableAdded.push(link);
						
			}
			
			let link = {
				"linkIdentification":{local_name: "++", short_name: "++"},
				"object":subSelectMainClass,
				"subject":parentSelectMainClass,
				"isVisited":false,
				"linkType": linkType,
				"isSubQuery":false,
				"isGlobalSubQuery":false,
				"counter":orderCounter,
				"serviceSchemaName":serviceSchemaName,
				"graphInstructionLink":where["type"].toUpperCase(),
				"graphLink": graphName
			}
			if(subSelectMainClass !== null && parentSelectMainClass !== null){
				linkTable.push(link);
				linkTableAdded.push(link);
				orderCounter++;
				linkFound = true;
			}
		}
		
		var isNotConnectdClass = true;
		while(isNotConnectdClass == true){
			isNotConnectdClass = false;
			let ct = [];
			for(let cl in abstractTable["classesTable"]){
				if(typeof abstractTable["classesTable"][cl] !== "function"){
					ct[cl] = false;
				}
			}
			
			ct = connectNotConnectedQueryParts(subSelectMainClass, abstractTable["linkTable"], ct);
			for(let cl in ct){
				if(ct[cl] == false){
					isNotConnectdClass = true;
					let link = {
						"linkIdentification":{local_name: "++", display_name: "++", short_name: "++"},
						"object":cl,
						"subject":subSelectMainClass,
						"isVisited":false,
						"linkType":linkType,
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
		
		if(linkFound === false && Object.keys(classesTable).length === 0){
			let subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"object", pn);
			let graphName = await generateInstanceAlias(where.name.value, false);
			if(!graphName.startsWith("https://") && !graphName.startsWith("http://") && graphName.indexOf(":") === -1) graphName = "?" + graphName;
			abstractTable["classesTable"][subSelectMainClass]["graphInstruction"] = where["type"].toUpperCase();
			abstractTable["classesTable"][subSelectMainClass]["graph"] = graphName;
			abstractTable["classesTable"][subSelectMainClass]["serviceSchemaName"] = serviceSchemaName;
		}
		
		for(let clazz in abstractTable["classesTable"]){
			if(typeof abstractTable["classesTable"][clazz] !== "function" && typeof classesTable[clazz] === "undefined"){
				classesTable[clazz] = abstractTable["classesTable"][clazz];
			}
		}
		
		for(let clazz in abstractTable["attributeTable"]){
			if(typeof abstractTable["attributeTable"][clazz] !== "function" && typeof attributeTable[clazz] === "undefined"){
				attributeTable[clazz] = abstractTable["attributeTable"][clazz];
			}
		}
		
		
		for(let filter in abstractTable["filterTable"]){
			if(typeof abstractTable["filterTable"][filter] !== "function" && abstractTable["filterTable"][filter]["filterAdded"] === false){
				let subSelectMainClass = getStartClass(abstractTable["classesTable"], abstractTable["linkTable"], nodeList).startClass.class;
				if(typeof subSelectMainClass["conditions"] === 'undefined') {
					subSelectMainClass["conditions"] = [];
				}
				subSelectMainClass["conditions"].push(abstractTable["filterTable"][filter]["filterString"]);
			}
		}
		directClassMembershipRole = tempDirectClassMembershipRole;
		indirectClassMembershipRole = tempInDirectClassMembershipRole;
		schemaName = tempSchemaName;
		showPrefixesForAllNames = tempShowPrefixesForAllNames;
	}
	if(where["type"] == "graph" ){
		
		let nodeLitsTemp = nodeList;
		let patterns =  where["patterns"];
		let collectNodeListTemp = await collectNodeList(patterns);
		let temp  = collectNodeListTemp["nodeList"];
		
		let linkTableTemp = [];
		var attributeTableTemp = [];
		
		var nodeLestsMatches = true;
		if(Object.keys(nodeList).length != Object.keys(temp).length) nodeLestsMatches = false;
		else if(Object.keys(nodeList).length > 0 && Object.keys(nodeList).length == Object.keys(temp).length){
			for(let key in temp){
				if(typeof nodeList[key] === "undefined"){
					nodeLestsMatches = false;
					break;
				}
			}
		}
		
		if(nodeLestsMatches == true){
			nodeLitsTemp = parentNodeList;
		}
		if(Object.keys(nodeLitsTemp).length == 0) nodeLitsTemp = nodeList;

		let graphName = await generateInstanceAlias(where.name.value, false);
		
		if(typeof where["patterns"][0]["queryType"] != "undefined"){
		
			// var abstractTable = await generateAbstractTable(where["patterns"][0], allClasses, variableList, nodeList);
			
			// for(let clazz in abstractTable["classesTable"]){
				// allClasses[clazz] = abstractTable["classesTable"][clazz];
				// classesTable[clazz] = abstractTable["classesTable"][clazz];
			// }
			
			var w = {
				"type": "group",
				"patterns": where["patterns"]
			}
			
			let wherePartTemp = await parseSPARQLjsStructureWhere(w, temp, nodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
				linkTableTemp = linkTableTemp.concat(wherePartTemp["linkTableAdded"]);
				attributeTableTemp = attributeTableTemp.concat(wherePartTemp["attributeTableAdded"]);
		} else {
		
			for(let pattern = 0; pattern < where["patterns"].length; pattern++){
				for(let clazz in classesTable){
					if(typeof classesTable[clazz] !== "function"){
						allClasses[clazz] = classesTable[clazz];
					}
				} 
				let wherePartTemp = await parseSPARQLjsStructureWhere(where["patterns"][pattern], temp, nodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, selectVariables, "plain", allClasses, variableList, null, bindTable);
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
				linkTableTemp = linkTableTemp.concat(wherePartTemp["linkTableAdded"]);
				attributeTableTemp = attributeTableTemp.concat(wherePartTemp["attributeTableAdded"]);
				classTableAdded = classTableAdded.concat(wherePartTemp["classTableAdded"]);	
				// if(wherePartTemp.attributeTableAdded.length > 0 && wherePartTemp.classTableAdded.length == 0 && linkTableTemp.length == 0){
					// for(let attr in wherePartTemp.attributeTableAdded){
						// attributeTable[wherePartTemp.attributeTableAdded[attr]]["graphInstruction"] = where["type"].toUpperCase();
						// attributeTable[wherePartTemp.attributeTableAdded[attr]]["graph"] = graphName;
					// }
				// }
				
			}
			
			let tempClassTable = [];
			for(let cl = 0; cl < classTableAdded.length; cl++){
				tempClassTable[classTableAdded[cl]] = classesTable[classTableAdded[cl]];
			}
			
			//connect not connected classes
			linkTable = connectNotConnectedClasses(tempClassTable, linkTable, temp);
			linkTableTemp = connectNotConnectedClasses(tempClassTable, linkTableTemp, temp);
			
			if(linkTableTemp.length == 0){
				for(let attr = 0; attr < attributeTableTemp.length; attr++){
					attributeTable[attributeTableTemp[attr]]["graphInstruction"] = where["type"].toUpperCase();
					attributeTable[attributeTableTemp[attr]]["graph"] = graphName;
				}
			}
			
			
			
			// linkTableTemp = connectNotConnectedClasses(classesTable, linkTableTemp, nodeLitsTemp);
			
			let linkFound = false;
			for(let link = 0; link < linkTableTemp.length; link++){
				let object = linkTableTemp[link]["object"];
				let subject = linkTableTemp[link]["subject"];
				
				var objectVarName = classesTable[object]["variableName"];
				var subjectVarName = classesTable[subject]["variableName"];
				
				let graphName = await generateInstanceAlias(where.name.value, false);
				
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
				for(let cl = 0; cl < classTableAdded.length; cl++){
					classesTableTepm[classTableAdded[cl]] = classesTable[classTableAdded[cl]];
				}
				
				// var subSelectMainClass = findClassToConnect(classesTableTepm, linkTableTemp, null,"subject");
				let subSelectMainClass = classTableAdded[0];
				
				let graphName = await generateInstanceAlias(where.name.value, false);
				classesTable[subSelectMainClass]["graphInstruction"] = where["type"].toUpperCase();
				classesTable[subSelectMainClass]["graph"] = graphName;
				
			}
		}	
	}
	// type=subquery
	if((where["type"] == "group" || where["type"] == "optional") && typeof where["patterns"][0]["queryType"] != "undefined"){
		
		for(let clazz in classesTable){
			if(typeof classesTable[clazz] !== "function"){
				allClasses[clazz] = classesTable[clazz];
			}
		}
		var subSel = where["patterns"][0];

		var isLocalAggregation = false;
		
		//local aggregation
		if((subSel["variables"].length == 1 && typeof subSel["variables"][0]["expression"] !== "undefined" && typeof subSel["variables"][0]["expression"]["aggregation"] !== "undefined") || 
		(subSel["variables"].length == 2 &&
		((typeof subSel["variables"][0]["expression"] !== "undefined" && typeof subSel["variables"][0]["expression"]["aggregation"] !== "undefined" && typeof subSel["variables"][1]["termType"] !== "undefined" && subSel["variables"][1]["termType"] == "Variable" && typeof allClasses[subSel["variables"][1]["value"]] !== "undefined") 
			|| 
		 (typeof subSel["variables"][1]["expression"] !== "undefined" && typeof subSel["variables"][1]["expression"]["aggregation"] !== "undefined" && typeof subSel["variables"][0]["termType"] !== "undefined" && subSel["variables"][0]["termType"] == "Variable" && typeof allClasses[subSel["variables"][0]["value"]] !== "undefined")
		))){
			let aggregateExpression = null;
			let alias = "";
			let propertyAlias = "@@@";
				
			if(subSel["variables"].length == 1){
					propertyAlias = getVariable(subSel["variables"][0]["expression"]["expression"])["value"];
					aggregateExpression = subSel["variables"][0]["expression"]["aggregation"]+ "(" + propertyAlias + ")";
					alias = subSel["variables"][0]["variable"]["value"];

			} else if (subSel["variables"].length == 2){
					if(typeof subSel["variables"][0]["expression"] !== "undefined"){
						let distinct = "";
						propertyAlias = getVariable(subSel["variables"][0]["expression"]["expression"])["value"];
						if(subSel["variables"][0]["expression"]["distinct"] === true) distinct = "DISTINCT ";
						aggregateExpression = subSel["variables"][0]["expression"]["aggregation"]+ "("+ distinct + propertyAlias + ")";
						alias = subSel["variables"][0]["variable"]["value"];
					}else {
						let distinct = "";
						propertyAlias = getVariable(subSel["variables"][1]["expression"]["expression"])["value"];
						if(subSel["variables"][1]["expression"]["distinct"] === true) distinct = "DISTINCT ";
						aggregateExpression = subSel["variables"][1]["expression"]["aggregation"]+ "(" + distinct+ propertyAlias + ")";	
						alias = subSel["variables"][1]["variable"]["value"];
					}
			}	

			if(subSel["where"].length == 1){
				let wherePattern = subSel["where"][0];
				let params = {};
				if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
				if(wherePattern["type"] == "bgp" ){
					if(typeof wherePattern["triples"] !== "undefined" && wherePattern["triples"].length == 1){	
						let triple = wherePattern["triples"][0];
						params.name= triple["predicate"]["value"];
						if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
						let propertyResolved = await dataShapes.resolvePropertyByName(params);
						if(propertyResolved.complete == true && typeof classesTable[triple["subject"]["value"]] !== "undefined"){
							let data = propertyResolved["data"][0];
							aggregateExpression = aggregateExpression.replace(propertyAlias, data["full_name"]);
							isLocalAggregation = true;
							let attributeInfo = {
								"alias":alias,
								"identification":null,
								"exp":aggregateExpression,
								"requireValues":true,
								"isInternal":false,
								"addLabel":false,
								"addAltLabel":false,
								"addDescription":false,
								"counter":orderCounter,
								"orderCounter":orderCounter
							}
							attributeTable[alias] = {
								"seen":true,
							};
							orderCounter++
							variableList[alias] = 100;
							classesTable[triple["subject"]["value"]] = addAttributeToClass(classesTable[triple["subject"]["value"]], attributeInfo);
						}
					} else if (typeof wherePattern["triples"] !== "undefined" && wherePattern["triples"].length == 2){
						for(let t = 0; t < 2; t++){
							let triple = wherePattern["triples"][t];
							if(triple["object"]["termType"] === "Variable" && triple["subject"]["termType"] !== "Variable"){
								params.name= triple["predicate"]["value"];
								let propertyResolved = await dataShapes.resolvePropertyByName(params);
								if(propertyResolved.complete == true && typeof classesTable[triple["subject"]["value"]] !== "undefined"){
									let data = propertyResolved["data"][0];
									aggregateExpression = aggregateExpression.replace(propertyAlias, data["full_name"]);
									isLocalAggregation = true;
									let attributeInfo = {
										"alias":alias,
										"identification":null,
										"exp":aggregateExpression,
										"requireValues":true,
										"isInternal":false,
										"addLabel":false,
										"addAltLabel":false,
										"addDescription":false,
										"counter":orderCounter,
										"orderCounter":orderCounter
									}
									orderCounter++
									attributeTable[alias] = {
										"seen":true,
									};
									variableList[alias] = 100;									
									classesTable[triple["subject"]["value"]] = addAttributeToClass(classesTable[triple["subject"]["value"]], attributeInfo);
								}
							}
						}	
					}
				} else if (wherePattern["type"] == "optional" && typeof wherePattern["patterns"] !== "undefined" && wherePattern["patterns"].length == 1
				&& wherePattern["patterns"][0]["type"] == "bgp" && typeof wherePattern["patterns"][0]["triples"] !== "undefined" && wherePattern["patterns"][0]["triples"].length ==1){
					let triple = wherePattern["patterns"][0]["triples"][0];
					params.name= triple["predicate"]["value"];
					let propertyResolved = await dataShapes.resolvePropertyByName(params);
					if(propertyResolved.complete == true && typeof classesTable[triple["subject"]["value"]] !== "undefined"){
						let data = propertyResolved["data"][0];
						aggregateExpression = aggregateExpression.replace(propertyAlias, data["full_name"]);
						isLocalAggregation = true;
						let attributeInfo = {
							"alias":alias,
							"identification":null,
							"exp":aggregateExpression,
							"requireValues":false,
							"isInternal":false,
							"addLabel":false,
							"addAltLabel":false,
							"addDescription":false,
							"counter":orderCounter,
							"orderCounter":orderCounter
						}
						orderCounter++
						attributeTable[alias] = {
							"seen":true,
						};		
						variableList[alias] = 100;							
						classesTable[triple["subject"]["value"]] = addAttributeToClass(classesTable[triple["subject"]["value"]], attributeInfo);
					}
				}
				
			} else if (subSel["where"].length == 2){
				for(let w = 0; w < 2; w++){
					let wherePattern = subSel["where"][w];
					if (wherePattern["type"] == "optional" && typeof wherePattern["patterns"] !== "undefined" && wherePattern["patterns"].length == 1
					&& wherePattern["patterns"][0]["type"] == "bgp" && typeof wherePattern["patterns"][0]["triples"] !== "undefined" && wherePattern["patterns"][0]["triples"].length ==1){
						
						let triple = wherePattern["patterns"][0]["triples"][0];
						let params = {name: triple["predicate"]["value"]};
						if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
						let propertyResolved = await dataShapes.resolvePropertyByName(params);
						
						if(propertyResolved.complete == true && typeof classesTable[triple["subject"]["value"]] !== "undefined"){
							let data = propertyResolved["data"][0];
							aggregateExpression = aggregateExpression.replace(propertyAlias, data["full_name"]);
							isLocalAggregation = true;
							let attributeInfo = {
								"alias":alias,
								"identification":null,
								"exp":aggregateExpression,
								"requireValues":false,
								"isInternal":false,
								"addLabel":false,
								"addAltLabel":false,
								"addDescription":false,
								"counter":orderCounter,
								"orderCounter":orderCounter
							}
							orderCounter++
												
							attributeTable[alias] = {
								"seen":true,
							};
							variableList[alias] = 100;	
							classesTable[triple["subject"]["value"]] = addAttributeToClass(classesTable[triple["subject"]["value"]], attributeInfo);
						}
					}	
				}
			}
		}
		
	if(isLocalAggregation == false){

		// console.log("SUBQUERY", where, where["patterns"][0], classesTable, allClasses);
		
		let abstractTable = await generateAbstractTable(where["patterns"][0], allClasses, variableList, nodeList);

		for(let clazz in abstractTable["classesTable"]){
			if(typeof abstractTable["classesTable"][clazz] !== "function"){
				allClasses[clazz] = abstractTable["classesTable"][clazz];
			}
		}

		let linkFound = false;
		var pn = null;
		for(let node in abstractTable["nodeList"]){
			if(typeof nodeList[node] !== 'undefined' && typeof nodeList[node] !== 'function'){
				
				//find links outside subquery
				for(let subLink = 0; subLink < abstractTable["linkTable"].length; subLink++){
					if((typeof classesTable[abstractTable["linkTable"][subLink]["subject"]]!=='undefined' && classesTable[abstractTable["linkTable"][subLink]["subject"]]["variableName"] == node) 
						|| (typeof classesTable[abstractTable["linkTable"][subLink]["object"]] !== 'undefined' && classesTable[abstractTable["linkTable"][subLink]["object"]]["variableName"] == node)){
						if(linkFound==false){
							let subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"subject", nodeList[node]);
							pn = nodeList[node];
							if(subSelectMainClass == null){
								for(let subClass in abstractTable["classesTable"]){
									if(typeof abstractTable["classesTable"][subClass] !== "function"){
										subSelectMainClass = subClass;
										break;
									}
								}
							 } 
								
							for(let clazz in abstractTable["classesTable"]){
								if(typeof abstractTable["classesTable"][clazz] !== "function"){
									if(clazz !== subSelectMainClass && (typeof abstractTable["classesTable"][clazz]["aggregations"] !== "undefined" || abstractTable["classesTable"][clazz]["aggregations"] != null)){
										var underSubQuery = false;
										for(let l = 0; l < abstractTable["linkTable"].length; l++){
											if(abstractTable["linkTable"][l]["subject"] == clazz && (abstractTable["linkTable"][l]["isSubQuery"] == true || abstractTable["linkTable"][l]["isGlobalSubQuery"] == true )){
												underSubQuery = true;
												break;
											}
										}
										if(underSubQuery != true){
											var aggregations = abstractTable["classesTable"][clazz]["aggregations"];
											for(let aggr = 0; aggr < aggregations.length; aggr++){
												if(aggregations[aggr]["exp"].toLowerCase() == "count(.)"){
													let cn = abstractTable["classesTable"][clazz]["instanceAlias"];
													if(typeof cn === 'undefined' || cn == null) cn = abstractTable["classesTable"][clazz]["identification"]["short_name"];
													abstractTable["classesTable"][subSelectMainClass] = addAggrigateToClass(abstractTable["classesTable"][subSelectMainClass], {exp:"count(" + cn + ")", alias:aggregations[aggr]["alias"]});
												} else if(aggregations[aggr]["exp"].toLowerCase() == "count_distinct(.)"){
													let cn = abstractTable["classesTable"][clazz]["instanceAlias"];
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
							}
							
							if(typeof abstractTable["classesTable"][subSelectMainClass]["aggregations"] === 'undefined' && typeof where["patterns"][0]["distinct"] === 'undefined'){
								abstractTable["classesTable"][subSelectMainClass]["selectAll"] = true;
							}
							let isSubQuery = true;
							let isGlobalSubQuery = false;
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
		let subSelectMainClass = null;
		if(Object.keys(nodeList).length == 0){
			if(typeof classesTable["[ ]"] === 'undefined' && typeof allClasses["[ ]"] === 'undefined'){
				classesTable["[ ]"] = {
					"variableName":"[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classTableAdded.push("[ ]");
				nodeList["[ ]"]= {uses: {"[ ]": "class"}, count:1};
			}else {
				classesTable["[ ]"+counter] = {
					"variableName":"[ ]",
					"identification":null,
					"instanceAlias":"",
					"isVariable":false,
					"isUnit":true,
					"isUnion":false
				};
				classTableAdded.push("[ ]"+counter);
				if(typeof nodeList["[ ]"] === 'undefined') nodeList["[ ]"] = {uses: [], count:1}
				nodeList["[ ]"]["uses"]["[ ]"+counter] = "class";
				nodeList["[ ]"]["count"] = nodeList["[ ]"]["count"]+1;
				counter++;
			}
		}
		if(linkFound == false){
			// where["patterns"][0]
			let graphLink = null;
			let graphInstructionLink = null;
			let serviceSchemaName = "";
			if(where["patterns"][0]["where"].length === 1 && where["patterns"][0]["where"][0]["type"] === "service"){
				graphLink = await generateInstanceAlias(where["patterns"][0]["where"][0].name.value, false);
				graphInstructionLink = where["patterns"][0]["where"][0]["type"].toUpperCase();
			}
			
			
			let linkType = "REQUIRED"
			if(where["type"] == "optional") linkType = "OPTIONAL";
			if(typeof nodeList["[ ]"] !== 'undefined'){
				for(let unionClass in nodeList["[ ]"]["uses"]){
					let object;
					if(typeof nodeList["[ ]"]["uses"][unionClass] !== "function"){
						object = findClassToConnectUNIT(abstractTable["classesTable"], abstractTable["linkTable"], null, "object");
						subSelectMainClass = object;
						if(object == null){
							for(let subClass in abstractTable["classesTable"]){
								if(typeof abstractTable["classesTable"][subClass] !== "function"){
									object = subClass;
									break;
								}
							}
						}
					}
					let isSubQuery = true;
					let isGlobalSubQuery = false;
					
					if(typeof where["patterns"][0]["limit"] !== 'undefined' || typeof where["patterns"][0]["offset"] !== 'undefined' || abstractTable["orderTable"].length > 0){
						isGlobalSubQuery = true;
						isSubQuery = false;
					}
					
					let link = {
						"linkIdentification":{local_name: "++", short_name: "++"},
						"object":object,
						"subject":unionClass,
						"isVisited":false,
						"linkType":linkType,
						"isSubQuery":isSubQuery,
						"isGlobalSubQuery":isGlobalSubQuery,
						"counter":orderCounter,
						"graphLink":graphLink,
						"serviceSchemaName":serviceSchemaName,
						"graphInstructionLink":graphInstructionLink
						
					}
					linkTable.push(link);
					linkTableAdded.push(link);
					linkFound = true;
					orderCounter++;
				}
			}
			if(typeof abstractTable["nodeList"]["[ ]"] !== 'undefined'){
				for(let unionClass in abstractTable["nodeList"]["[ ]"]["uses"]){
				  if(typeof abstractTable["nodeList"]["[ ]"]["uses"][unionClass] !== "function"){
					let subject = findClassToConnectUNIT(classesTable, linkTable, nodeList, "subject");
					subSelectMainClass = subject;
					if(subject == null){
						for(let subClass in classesTable){
							if(typeof classesTable[subClass] !== "function"){
								subject = subClass;
								break;
							}
						}
					}
	
					let link = {
						"linkIdentification":{local_name: "++", short_name: "++"},
						"object":unionClass,
						"subject":subject,
						"isVisited":false,
						"linkType":linkType,
						"isSubQuery":true,
						"isGlobalSubQuery":false,
						"counter":orderCounter,
						"serviceSchemaName":serviceSchemaName,
						"graphLink":graphLink,
						"graphInstructionLink":graphInstructionLink
					}
	
					linkTable.push(link);
					linkTableAdded.push(link);
					linkFound = true;
					orderCounter++;
				  }
				}
			}
			for(let subLink = 0; subLink < abstractTable["linkTable"].length; subLink++){
				linkTable.push(abstractTable["linkTable"][subLink]);
			}
		}
		if(linkFound == false){
			let linkType = "REQUIRED"
			if(where["type"] == "optional") linkType = "OPTIONAL";
			
			//if no link found
			// search for equals nodes in nodeList and parentNodeList
			for(let node in abstractTable["nodeList"]){
				if(typeof nodeList[node] !== 'undefined' && typeof nodeList[node] !== 'function'){
					for(let classNode in abstractTable["nodeList"][node]["uses"]){
						if(typeof abstractTable["nodeList"][node]["uses"][classNode] !== "function"){
							for(let classParentNode in nodeList[node]["uses"]){
								if(typeof nodeList[node]["uses"][classParentNode] !== "function"){
									let link = {
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
				}
			}
			
			// if class from parentNodeList in nodeList dont has attributes, except (select this), and nodeList class has link, relink it to parentNodeList and make subquery
			
			// if no equals nodes found, connect subquery main class, with parent query class, without outgoing links
			// TO DO
		}
		
		if(subSelectMainClass === null) subSelectMainClass = findClassToConnect(abstractTable["classesTable"], abstractTable["linkTable"], null,"subject", pn);

		
		if(subSelectMainClass == null){
			for(let subClass in abstractTable["classesTable"]){
				if(typeof abstractTable["classesTable"][subClass] !== "function"){
					subSelectMainClass = subClass;
					break;
				}
			}
		}
		var isNotConnectdClass = true;
		while(isNotConnectdClass == true){
			isNotConnectdClass = false;
			let ct = [];
			for(let cl in abstractTable["classesTable"]){
				if(typeof abstractTable["classesTable"][cl] !== "function"){
					ct[cl] = false;
				}
			}
			
			ct = connectNotConnectedQueryParts(subSelectMainClass, abstractTable["linkTable"], ct);
			for(let cl in ct){
				if(ct[cl] == false){
					isNotConnectdClass = true;
					let link = {
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
		
		for(let clazz in abstractTable["classesTable"]){
			if(typeof abstractTable["classesTable"][clazz] !== "function"){
				for(let aggr in abstractTable["classesTable"][clazz]["aggregations"]){
					if(typeof abstractTable["classesTable"][clazz]["aggregations"][aggr] !== "function"){
						if(subSelectMainClass != clazz && (typeof nodeList[abstractTable["classesTable"][clazz]["variableName"]]!== "undefined" || (Object.keys(nodeList).length == 1 && typeof nodeList["[ ]"]!== "undefined"))){
							if(abstractTable["classesTable"][clazz]["aggregations"][aggr]["exp"].indexOf("(.)") !== -1){
								abstractTable["classesTable"][clazz]["aggregations"][aggr]["exp"] = abstractTable["classesTable"][clazz]["aggregations"][aggr]["exp"].replace("(.)", "(" + abstractTable["classesTable"][clazz]["instanceAlias"] + ")")
							} 
							abstractTable["classesTable"][subSelectMainClass]["aggregations"].push(abstractTable["classesTable"][clazz]["aggregations"][aggr])	
						}
					}
				}
			
				if(subSelectMainClass != clazz && (typeof nodeList[abstractTable["classesTable"][clazz]["variableName"]]!== "undefined" || (Object.keys(nodeList).length == 1 && typeof nodeList["[ ]"]!== "undefined")))abstractTable["classesTable"][clazz]["aggregations"] = null;
			}
		}
		
		abstractTable["classesTable"][subSelectMainClass]["orderings"] = abstractTable["orderTable"];
		abstractTable["classesTable"][subSelectMainClass]["groupings"] = abstractTable["groupings"];
		if(typeof abstractTable["classesTable"][subSelectMainClass]["groupings"] === "undefined") abstractTable["classesTable"][subSelectMainClass]["groupings"] = [];
		
		//group
		var group = where["patterns"][0]["group"];
		var variables = transformSelectVariables(where["patterns"][0]["variables"]);
		if(typeof group !== "undefined"){
			for(let key = 0; key < group.length; key++){
				let exp = getVariable(group[key]["expression"])["value"];
				let classes = findByVariableName(classesTable, group[key]["expression"]["value"]);
				if(Object.keys(classes).length > 0){
					for(let clazz in classes){
						if(typeof classes[clazz] !== "function"){
							classesTable[clazz]["groupByThis"] = true;
						}
					}
				} 
				else {
					var inSelect = false;
					for(let k in variables){
						if(typeof variables[k] !== "function" && typeof variables[k]["termType"] !== 'undefined' && variables[k]["value"] == group[key]["expression"]["value"]){
							inSelect = true;
						}
					}
					if(inSelect == false) abstractTable["classesTable"][subSelectMainClass]["groupings"].push(exp); 
				}

			}
		}
	
		abstractTable["classesTable"][subSelectMainClass]["graphs"] = abstractTable["fromTable"];
		if(typeof where["patterns"][0]["limit"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["limit"] =  where["patterns"][0]["limit"];
		if(typeof where["patterns"][0]["offset"] !== 'undefined' && where["patterns"][0]["offset"] != 0) abstractTable["classesTable"][subSelectMainClass]["offset"] =  where["patterns"][0]["offset"];
		if(typeof where["patterns"][0]["distinct"] !== 'undefined') abstractTable["classesTable"][subSelectMainClass]["distinct"] =  where["patterns"][0]["distinct"];
		
		abstractTable["classesTable"][subSelectMainClass]["serviceLabelLang"] = abstractTable["serviceLabelLang"];
		abstractTable["classesTable"][subSelectMainClass]["fullSPARQL"] = abstractTable["fullSPARQL"];
		
		for(let subClass in abstractTable["classesTable"]){
			if(typeof abstractTable["classesTable"][subClass] !== "function"){
				if(typeof classesTable[subClass] === 'undefined')classesTable[subClass] = abstractTable["classesTable"][subClass];
				else {
					
					if(typeof abstractTable["classesTable"][subClass]["fields"] !== "undefined" && abstractTable["classesTable"][subClass]["fields"].length > 0){
						var fields = abstractTable["classesTable"][subClass]["fields"];
						for(let f = 0; f < fields.length; f++){
							
							if(fields[f].exp !== "(select this)" && abstractTable["classesTable"][subClass]["instanceAlias"] !== null && abstractTable["classesTable"][subClass]["instanceAlias"] !== "") {
								fields[f].exp = abstractTable["classesTable"][subClass]["instanceAlias"] + "." + fields[f].exp;
								abstractTable["classesTable"][subSelectMainClass] = addAttributeToClass(abstractTable["classesTable"][subSelectMainClass], fields[f]);
							}
						}
					}
				}
			}
		}
		
	}
		
	}
	
	if(where["type"] == "group" && typeof where["patterns"][0]["queryType"] === "undefined"){
		let patterns = where["patterns"];
		var tempN = await collectNodeList(where["patterns"]);
		var nodeListTemp = tempN["nodeList"];						
		
		for(let groupPattern = 0; groupPattern < patterns.length; groupPattern++){	
			if(typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] == "bgp"){
				let wherePartTemp = await parseSPARQLjsStructureWhere(patterns[groupPattern], nodeListTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);						
				classesTable = wherePartTemp["classesTable"];
				attributeTable = wherePartTemp["attributeTable"];
				linkTable = wherePartTemp["linkTable"];
				filterTable = wherePartTemp["filterTable"];
				bindTable = wherePartTemp["bindTable"];
			}
		}
					
		for(let groupPattern = 0; groupPattern < patterns.length; groupPattern++){	
			if(typeof patterns[groupPattern]["type"] === "undefined" || (typeof patterns[groupPattern]["type"] !== "undefined" && patterns[groupPattern]["type"] !== "bgp")){
				let wherePartTemp = await parseSPARQLjsStructureWhere(patterns[groupPattern], nodeListTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
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
		
		let patterns = where["patterns"];
		let nodeLitsTemp = [];
		var parenNodeLitsTemp;
		if(patterns.length > 1 || (patterns.length == 1 && typeof patterns[0].type !== "undefined" && patterns[0].type == "bgp")){
			parenNodeLitsTemp = nodeList;
			let collectNodeListTemp  = await collectNodeList(patterns, true);
			let temp  = collectNodeListTemp["nodeList"];
			for(let node in temp){
				if(typeof temp[node] !== "function"){
					nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
				}
			}
		} else {
			nodeLitsTemp = nodeList;
			parenNodeLitsTemp = parentNodeList;
		}
		
		let classTableTemp = [];
		let linkTableTemp = [];
		var directClassMembershipRoleTemp = directClassMembershipRole;
		
		
		
		if(patterns.length == 1 && typeof patterns[0].type !== "undefined" && patterns[0].type == "bgp" && patterns[0].triples.length == 1 && (patterns[0].triples[0].predicate["value"] == directClassMembershipRole || typeof classifiers[patterns[0].triples[0].predicate["value"]] !== "undefined")){
			directClassMembershipRole = "";
		}
		

		for(let pattern  = 0; pattern < patterns.length; pattern++) {
			if(typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] == "bgp"){
				let temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp, parenNodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, selectVariables, "optionalLink", allClasses, variableList, "minus", bindTable, generateOnlyExpression);
				classesTable = temp["classesTable"];
				for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
					if(typeof temp["classTableAdded"][clazz] !== "function"){
						classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
					}
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
		
		for(let pattern  = 0; pattern < patterns.length; pattern++) {
			if(typeof patterns[pattern]["type"] === "undefined" || (typeof patterns[pattern]["type"] !== "undefined" && patterns[pattern]["type"] !== "bgp")){
				let temp = await parseSPARQLjsStructureWhere(patterns[pattern], nodeLitsTemp, parenNodeLitsTemp, classesTable, filterTable, attributeTable, linkTable, selectVariables, "optionalLink", allClasses, variableList, "minus", bindTable, generateOnlyExpression);
				classesTable = temp["classesTable"];
				for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
					if(typeof temp["classTableAdded"][clazz] !== "function"){
						classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
					}
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
		if(patterns.length == 1 && typeof patterns[0].type !== "undefined" && patterns[0].type == "bgp" && patterns[0].triples.length == 1 && (patterns[0].triples[0].predicate == directClassMembershipRole || typeof classifiers[patterns[0].triples[0].predicate["value"]] !== "undefined")){
			directClassMembershipRole = directClassMembershipRoleTemp;
		}
		
		if(patterns.length > 1){
			//find links outside subquery
			for(let link = 0; link< linkTableAdded.length; link++){
				for(let node in parenNodeLitsTemp){
					if(typeof parenNodeLitsTemp[node] !== "function"){
						if(typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["subject"]] !== 'undefined' || typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["object"]] !== 'undefined'){
							linkTableAdded[link]["isGlobalSubQuery"] = true;
							linkTableAdded[link]["linkType"] = "NOT";
							break;
						}
					}
				}
			}
		}
		if(patterns.length == 1 && typeof patterns[0].type !== "undefined" && patterns[0].type == "bgp"){
			//find links outside subquery
			let linkFound = false;
			
			for(let link = 0; link< linkTableAdded.length; link++){
				for(let node in parenNodeLitsTemp){
					if(typeof parenNodeLitsTemp[node] !== "function"){
						if(typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["subject"]] !== 'undefined' || typeof parenNodeLitsTemp[node]["uses"][linkTableAdded[link]["object"]] !== 'undefined'){
							linkTableAdded[link]["isGlobalSubQuery"] = true;
							linkTableAdded[link]["linkType"] = "NOT";
							linkFound = true;
							break;
						}
					}
				}
			}
			if(linkFound === false && linkTableAdded.length === 1){
				if(parenNodeLitsTemp.length == 0){
					if(classTableAdded.indexOf(linkTableAdded[0]["subject"]) !== -1 && typeof allClasses[linkTableAdded[0]["subject"]] === "undefined"){
						classesTable[linkTableAdded[0]["subject"]+ counter] = {
							"variableName":classesTable[linkTableAdded[0]["subject"]]["variableName"],
							"identification":classesTable[linkTableAdded[0]["subject"]]["identification"],
							"instanceAlias":classesTable[linkTableAdded[0]["subject"]]["instanceAlias"],
							"isVariable":false,
							"isUnit":false,
							"isUnion":false,
							"orderCounter":classesTable[linkTableAdded[0]["subject"]]["orderCounter"]
						};
						linkTableAdded[0]["isGlobalSubQuery"] = true;
						linkTableAdded[0]["linkType"] = "NOT";
						
						linkTableAdded[0]["subject"] = linkTableAdded[0]["subject"]+ counter;
						counter++;
					}
				} else {
					linkTableAdded[0]["isGlobalSubQuery"] = true;
					linkTableAdded[0]["linkType"] = "NOT";
				}
			}
		}
		
		linkTable = linkTable.concat(linkTableAdded);
	}

	return {classesTable:classesTable, filterTable:filterTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, viziQuerExpr:viziQuerExpr, attributeTableAdded:attributeTableAdded, bindTable:bindTable};
}


function findClassToConnect(classesTable, linkTable, nodeList, type, parentNode){
	
	if(typeof parentNode !== "undefined" && parentNode != null){
		for(let p in parentNode["uses"]){
			if(typeof parentNode["uses"][p] !== "function"){
				for(let link = 0; link< linkTable.length; link++){
				 if(typeof linkTable[link] !== "undefined"){
					if(linkTable[link]["subject"] == p){
						return linkTable[link]["object"];
					};
					if(linkTable[link]["object"] == p){
						return linkTable[link]["subject"];
					}
				 }
				}
			}
		}
	}
	if(nodeList != null){
		for(let node in nodeList){
			if(typeof nodeList[node] !== "function"){
				for(let clazz in nodeList[node]["uses"]){
					if(typeof nodeList[node]["uses"][clazz] !== "function"){
						let linkFound = false;
						for(let link = 0; link< linkTable.length; link++){
						 if(typeof linkTable[link] !== "undefined"){
							if(linkTable[link][type] == clazz){
								linkFound = true;
								break;
							}
						 }
						}
						if(linkFound == false) return clazz;
					}
				}
			}
		}
	} else{
		for(let clazz in classesTable){
			if(typeof classesTable[clazz] !== "function"){
				if(typeof classesTable[clazz]["aggregations"] !== 'undefined') return clazz;
			}
		}
		// for class table
		for(let clazz in classesTable){
			if(typeof classesTable[clazz] !== "function"){
				let linkFound = false;
				// for link table
				for(let link = 0; link< linkTable.length; link++){
				 if(typeof linkTable[link] !== "undefined"){
					// if link table in subquect or object (based on type parameter) are equal to class, class is not the one
					if(linkTable[link][type] == clazz){
						linkFound = true;
						break;
					}
				 }
				}
				if(linkFound == false)  return clazz;
			}
		}
	}
	return null;
}

function findClassToConnectUNIT(classesTable, linkTable, nodeList, type){
	if(nodeList != null){
		for(let node in nodeList){
			if(typeof nodeList[node] !== "function"){
				for(let clazz in nodeList[node]["uses"]){
					if(typeof nodeList[node]["uses"][clazz] !== "function"){
						let linkFound = false;
						for(let link = 0; link< linkTable.length; link++){
						 if(typeof linkTable[link] !== "undefined"){
							if(linkTable[link][type] == clazz){
								linkFound = true;
								break;
							}
						 }
						}
						if(linkFound == false) return clazz;
					}
				}
			}
		}
	} else{
		for(let clazz in classesTable){
			if(typeof classesTable[clazz] !== "function"){
				if(typeof classesTable[clazz]["aggregations"] !== 'undefined') return clazz;
			}
		}
		for(let clazz in classesTable){
			if(typeof classesTable[clazz] !== "function"){
				let linkFound = false;
				for(let link = 0; link< linkTable.length; link++){
				 if(typeof linkTable[link] !== "undefined"){
					if(linkTable[link][type] == clazz){
						linkFound = true;
						break;
					}
				 }
				}
				
				if(linkFound == false) return clazz;
			}
		}
	}
	return null;
}

function findClassToConnectUnion(classesTable,parentClassesTable, linkTable, nodeList, type){
	if(nodeList != null){
		for(let node in nodeList){
			if(typeof nodeList[node] !== "function"){
				for(let clazz in nodeList[node]["uses"]){
					if(typeof nodeList[node]["uses"][clazz] !== "function"){
						let linkFound = false;
						for(let link = 0; link< linkTable.length; link++){
						 if(typeof linkTable[link] !== "undefined"){
							if(linkTable[link][type] == clazz){
								linkFound = true;
								break;
							}
						 }
						}
						if(linkFound == false) return clazz;
					}
				}
			}
		}
	} else{
		for(let clazz in classesTable){
			if(typeof classesTable[clazz] !== "function"){
				let linkFound = false;
				var fromParantClass = false;
				for(let pClazz in parentClassesTable){
					if(typeof parentClassesTable[pClazz] !== "function"){
							if(parentClassesTable[pClazz]["variableName"] == classesTable[clazz]["variableName"]){
								fromParantClass = true;
								break;
							}
					}
				}
				for(let link = 0; link< linkTable.length; link++){
				 if(typeof linkTable[link] !== "undefined"){
					if(linkTable[link][type] == clazz){
						linkFound = true;
						break;
					}
				 }
				}
				if(linkFound == false && fromParantClass == false) {return clazz;}
			}
		}
	}
	return null;
}

function createNodeListInstance(nodeList, nodeName){
	var nodeListInstance = {};
	if(typeof nodeList[nodeName] === 'undefined' || typeof nodeList[nodeName] === 'function'){
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
  for(let key in whereAll){
	var where = whereAll[key];
	//type=bgp
	if(where["type"] == "bgp"){
		let triples = where["triples"];
		
		for(let triple = 0; triple < triples.length; triple++) {
		  if(typeof triples[triple] !== "undefined"){
			if(getVariable(triples[triple]["subject"])["type"] == "varName") selectStarList.push(triples[triple]["subject"]["value"]);
			if(getVariable(triples[triple]["object"])["type"] == "varName") selectStarList.push(triples[triple]["object"]["value"]);
			if(getVariable(triples[triple]["predicate"])["type"] == "varName") selectStarList.push(triples[triple]["predicate"]["value"]);

			//class definitions
			if((triples[triple]["predicate"]["value"] == directClassMembershipRole || typeof classifiers[triples[triple]["predicate"]["value"]] !== "undefined")){
				nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
			} else{
				//if class without definition
				//from data property
				let params = {name: triples[triple]["predicate"]["value"]};
				if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
				let propertyResolved = await dataShapes.resolvePropertyByName(params);
				if(propertyResolved.complete == true && propertyResolved.data[0].data_cnt > 0 && propertyResolved.data[0].object_cnt == 0){
					//subjest
					nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
					//object, dataproperty as objectproperty
					if(propUnderOptional != null && propUnderOptional == true) nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
				}
				//from object property
				else if(propertyResolved.complete == true && propertyResolved.data[0].object_cnt > 0){
					//subjest
					nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
					//object
					nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
				}
				//from property path
				else if(typeof triples[triple]["predicate"] === "object" && triples[triple]["predicate"]["type"] == "path"){
					
					let last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
					if(typeof last_element["termType"] === "undefined"){
						last_element = last_element["items"][last_element["items"].length - 1];
					}
					last_element = last_element["value"];
					params.name = last_element;
					let pathPropertyResolved = await dataShapes.resolvePropertyByName(params);
						
					// object property
					if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt > 0){
						//subjest
						nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
						//object
						nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
					}
					// data property
					if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt == 0 && pathPropertyResolved.data[0].data_cnt > 0){
						//subjest
						nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
					}
					// not in schema, use as object property
					if(pathPropertyResolved.complete == false){
						//subjest
						nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
						//object
						nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
					}
				}
				//from property not in a schema
				else if(propertyResolved.complete != true){
					//subjest
					nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
					//object
					nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
				}
			}
		  }
		}
	}
	//bind
	if(where["type"] == "bind"){
		selectStarList.push(where["variable"]["value"])
	}
	
	//sub select
	if(where["type"] == "group" && where["patterns"].length == 1 && where["patterns"][0]["type"] == "query"){	
		var variables = transformSelectVariables(where["patterns"][0]["variables"])
		for(let sel = 0; sel < variables.length; sel++){
			selectStarList.push(variables[sel]);
		}
	}
	
	if(where["type"] == "service" && typeof where["patterns"] !== "undefined" && where["patterns"].length === 1 && where["patterns"][0]["type"] === "group"){
		let patterns = where["patterns"][0]["patterns"];
		if(patterns.length == 1  && patterns[0]["type"] === "bgp"){
		let triples = patterns[0]["triples"];
			for(let triple = 0; triple < triples.length; triple++) {
				  if(typeof triples[triple] !== "undefined"){
					if(getVariable(triples[triple]["subject"])["type"] == "varName") selectStarList.push(triples[triple]["subject"]["value"]);
					if(getVariable(triples[triple]["object"])["type"] == "varName") selectStarList.push(triples[triple]["object"]["value"]);
					if(getVariable(triples[triple]["predicate"])["type"] == "varName") selectStarList.push(triples[triple]["predicate"]["value"]);
				}
			}
		}
	}
	
	//type=optional
	if(where["type"] == "optional"){
		let patterns = where["patterns"];
		var optionalDataPropAsObjectProp = false;
		for(let pattern  = 0; pattern < patterns.length; pattern++) {
			if(typeof patterns[pattern]["type"] !== 'undefined' && patterns[pattern]["type"] != "bgp") optionalDataPropAsObjectProp = true;
		}
		let temp = await collectNodeList(patterns, optionalDataPropAsObjectProp);
		var tempNode = temp["nodeList"];
		for(let node in tempNode){
			if(typeof tempNode[node] !== "function"){
				nodeList[node] = concatNodeListInstance(nodeList, node, tempNode[node]);
			}
		}
		selectStarList = selectStarList.concat(temp["selectStarList"]);
	}
  }
  return {"nodeList":nodeList, "selectStarList":selectStarList}
}

async function collectNodeListWithService(whereAll, propUnderOptional){
  var nodeList = [];
  var selectStarList = [];
  for(let key in whereAll){
	var where = whereAll[key];
	//type=bgp
	if(where["type"] == "bgp"){
		let triples = where["triples"];
		
		for(let triple = 0; triple < triples.length; triple++) {
		  if(typeof triples[triple] !== "undefined"){
			if(getVariable(triples[triple]["subject"])["type"] == "varName") selectStarList.push(triples[triple]["subject"]["value"]);
			if(getVariable(triples[triple]["object"])["type"] == "varName") selectStarList.push(triples[triple]["object"]["value"]);
			if(getVariable(triples[triple]["predicate"])["type"] == "varName") selectStarList.push(triples[triple]["predicate"]["value"]);

			//class definitions
			if((triples[triple]["predicate"]["value"] == directClassMembershipRole || typeof classifiers[triples[triple]["predicate"]["value"]] !== "undefined")){
				nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
			} else{
				//if class without definition
				//from data property
				let params = {name: triples[triple]["predicate"]["value"]};
				if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
				let propertyResolved = await dataShapes.resolvePropertyByName(params);
				if(propertyResolved.complete == true && propertyResolved.data[0].data_cnt > 0 && propertyResolved.data[0].object_cnt == 0){
					//subjest
					nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
					//object, dataproperty as objectproperty
					if(propUnderOptional != null && propUnderOptional == true) nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
				}
				//from object property
				else if(propertyResolved.complete == true && propertyResolved.data[0].object_cnt > 0){
					//subjest
					nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
					//object
					nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
				}
				//from property path
				else if(typeof triples[triple]["predicate"] === "object" && triples[triple]["predicate"]["type"] == "path"){
					
					let last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
					if(typeof last_element["termType"] === "undefined"){
						last_element = last_element["items"][last_element["items"].length - 1];
					}
					last_element = last_element["value"];
					params.name = last_element;
					let pathPropertyResolved = await dataShapes.resolvePropertyByName(params);
						
					// object property
					if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt > 0){
						//subjest
						nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
						//object
						nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
					}
					// data property
					if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt == 0 && pathPropertyResolved.data[0].data_cnt > 0){
						//subjest
						nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
					}
					// not in schema, use as object property
					if(pathPropertyResolved.complete == false){
						//subjest
						nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
						//object
						nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
					}
				}
				//from property not in a schema
				else if(propertyResolved.complete != true){
					//subjest
					nodeList[triples[triple]["subject"]["value"]] = createNodeListInstance(nodeList, triples[triple]["subject"]["value"]);
					//object
					nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
				}
			}
		  }
		}
	}
	//bind
	if(where["type"] == "bind"){
		selectStarList.push(where["variable"]["value"])
	}
	
	//sub select
	
	if(where["type"] == "group" && where["patterns"].length == 1 && where["patterns"][0]["type"] === "query"){
		var variables = transformSelectVariables(where["patterns"][0]["variables"])
		for(let sel = 0; sel < variables.length; sel++){
			selectStarList.push(variables[sel]);
		}
	}
	
	//type=optional
	if(where["type"] == "optional" || where["type"] == "service"){
		let patterns = where["patterns"];
		let underService = false;
		if(where["type"] == "service") underService = true;
		var optionalDataPropAsObjectProp = false;
		for(let pattern  = 0; pattern < patterns.length; pattern++) {
			if(typeof patterns[pattern]["type"] !== 'undefined' && patterns[pattern]["type"] != "bgp") optionalDataPropAsObjectProp = true;
		}
		let temp = await collectNodeListWithService(patterns, optionalDataPropAsObjectProp, underService);
		var tempNode = temp["nodeList"];
		for(let node in tempNode){
			if(typeof tempNode[node] !== "function"){
				nodeList[node] = concatNodeListInstance(nodeList, node, tempNode[node]);
			}
		}
		
		if(where["type"] == "service" && typeof where["patterns"] !== "undefined" && where["patterns"].length === 1 && where["patterns"][0]["type"] === "group"){
			let patterns = where["patterns"][0]["patterns"];
			if(patterns.length == 1  && patterns[0]["type"] === "bgp"){
			let triples = patterns[0]["triples"];
				for(let triple = 0; triple < triples.length; triple++) {
					  if(typeof triples[triple] !== "undefined"){
						if(getVariable(triples[triple]["subject"])["type"] == "varName") selectStarList.push(triples[triple]["subject"]["value"]);
						if(getVariable(triples[triple]["object"])["type"] == "varName") selectStarList.push(triples[triple]["object"]["value"]);
						if(getVariable(triples[triple]["predicate"])["type"] == "varName") selectStarList.push(triples[triple]["predicate"]["value"]);
					}
				}
			}
		}
		
		selectStarList = selectStarList.concat(temp["selectStarList"]);
	}
  }
  return {"nodeList":nodeList, "selectStarList":selectStarList}
}

function findAttributeInAttributeTable(attributeTable, parsedVariableName, variableName, identification){
	//attributes are the same if  equals variableName, identification is null or identification short_name are the equals
	for(let a in attributeTable){
		if(typeof attributeTable[a] !== "function"){
			let attribute = attributeTable[a]
			if(a.startsWith(parsedVariableName) && attribute["variableName"] == variableName &&
			((typeof identification === 'undefined' && typeof attributeTable["identification"] === 'undefined') || 
			(typeof identification !== 'undefined' && typeof attributeTable["identification"] !== 'undefined' && identification["short_name"] == attributeTable["identification"]["short_name"]))) return attribute;
		}
	}
	return null;
}

function findByVariableName(classesTable, variableName){
	if(typeof variableName !== "undefined" && variableName.startsWith("@")) variableName = variableName.substring(1);
	let classes = [];
	for(let c in classesTable){
		if(typeof classesTable[c] !== "function"){
			var clazz = classesTable[c]
			if(clazz["variableName"] == variableName) classes[c]=clazz;
			if(clazz["variableName"] == "?"+variableName) classes[c]=clazz;
			if("?"+clazz["variableName"] == variableName) classes[c]=clazz;
		}
	}
	return classes;
}

function findByShortName(classesTable, variableName){
	let classes = [];
	for(let c in classesTable){
		if(typeof classesTable[c] !== "function"){
			var clazz = classesTable[c]
			if(typeof clazz["identification"] !== "undefined" && clazz["identification"] != null && clazz["identification"]["notInSchema"] == "variable" && clazz["identification"]["short_name"] == variableName) classes[c]=clazz;
		}
	}
	return classes;
}

async function generateTypebgp(triples, nodeList, parentNodeList, classesTable, attributeTable, linkTable, bgptype, allClasses, generateOnlyExpression, variableList, selectVariables){
	var linkTableAdded = [];
	var classTableAdded = [];
	var attributeTableAdded = [];
	var filterTable = [];
	
	for(let triple = 0; triple < triples.length; triple++) {
	  if(typeof triples[triple] !== "undefined"){

		//class definitions
		
		if(((triples[triple]["predicate"]["value"] == directClassMembershipRole || typeof classifiers[triples[triple]["predicate"]["value"]] !== "undefined")) && (typeof allClasses[triples[triple]["subject"]["value"]] === 'undefined' || isUnderUnion === true) && triples[triple]["object"]["termType"] !== "BlankNode"
			&& typeof variableList[triples[triple]["object"]["value"]+"Label"] === "undefined" && typeof variableList[triples[triple]["object"]["value"]+"AltLabel"] === "undefined" && typeof variableList[triples[triple]["object"]["value"]+"Description"] === "undefined"){
			let instanceAlias = null;
			//var classResolvedR = await dataShapes.resolveClassByName({name: triples[triple]["object"]});
			let params = {name: triples[triple]["object"]["value"]};
			if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
			var classResolvedR = await dataShapes.resolveClassByName(params);
	
			let classResolved = null;
			if(classResolvedR.complete == true) {
				classResolved = classResolvedR.data[0];

				let sn = classResolved.full_name;
				if(schemaName == "wikidata" && classResolved.prefix == "wd"  && showPrefixesForAllNames !== true){sn = classResolved.display_name}
				// else if(classResolved.is_local != true)sn = classResolved.prefix+ ":" + sn;	
				classResolved.short_name = sn;	
					
			}
			let subjectNameParsed = getVariable(triples[triple]["subject"]);
			
			if(classResolvedR.complete == true && classResolved["local_name"] != subjectNameParsed["value"]){
				instanceAlias = subjectNameParsed["value"];
				if(subjectNameParsed["type"] == "iri") instanceAlias = await generateInstanceAlias(instanceAlias);
			}
	
			if(classResolvedR.complete == false){
				let objectNameParsed = getVariable(triples[triple]["object"])["value"];
				
				let className = await generateInstanceAlias(objectNameParsed);
				if(typeof triples[triple]["object"]["termType"] !== "undefined" && triples[triple]["object"]["termType"] == "Variable") {
				// if(triples[triple]["object"].startsWith("?")) {
					className = triples[triple]["object"]["value"];
					if(selectVariables.indexOf(className) === -1) className = "?"+ className;
					classResolved = {
						"short_name":"?"+className,
						"display_name":"?"+className,
						"local_name":"?"+className,
						"URI":triples[triple]["object"]["value"],
						"notInSchema": "variable"
					}
				} else {
					if(typeof classifiers[triples[triple]["predicate"]["value"]] !== "undefined" && triples[triple]["predicate"]["value"] !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") className = classifiers[triples[triple]["predicate"]["value"]] + className;
					classResolved = {
						"short_name":className,
						"display_name":className,
						"local_name":className,
						"URI":triples[triple]["object"]["value"],
						"notInSchema": "true"
					}
				}
				instanceAlias = subjectNameParsed["value"].replace(/\\,/g, ",");
				if(instanceAlias.indexOf("://") !== -1) instanceAlias = await generateInstanceAlias(instanceAlias);
			}
			if(instanceAlias != null) instanceAlias = instanceAlias.replace(/\\,/g, ",");
			
			if(typeof classesTable[subjectNameParsed["value"]] === 'undefined'){
				if(typeof parentNodeList[triples[triple]["subject"]["value"]] === 'undefined'){
					if(typeof allClasses[subjectNameParsed["value"]] === 'undefined'){
						// If class first time used in a query – create new class box
						 // console.log("CLASS 1", subjectNameParsed["value"], classResolved, instanceAlias, triples[triple]);
						classesTable[subjectNameParsed["value"]] = {
							"variableName":triples[triple]["subject"]["value"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false,
							"orderCounter":triples[triple]["tableCounter"]
						};
						classTableAdded.push(subjectNameParsed["value"]);
						
						nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed["value"]] = "class";
					} else {
						// If class defined in all query scope (higher than a parent scope) - create new class box with different identification.
						 // console.log("CLASS 2", subjectNameParsed["value"]);
						classesTable[subjectNameParsed["value"]+counter] = {
							"variableName":triples[triple]["subject"]["value"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false,
							"orderCounter":triples[triple]["tableCounter"]
						};
						classTableAdded.push(subjectNameParsed["value"]+counter);
						nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed["value"]+counter] = "class";
						counter++;
					}
				} else {
					// if class defined in a parent scope
					//create new class if identification short name not equals, or parrent class identification is missing
					// else copy class from parrent
					let createClass = true;
					for(let use in parentNodeList[triples[triple]["subject"]["value"]]["uses"]){
					  if(typeof parentNodeList[triples[triple]["subject"]["value"]]["uses"][use] !== "function"){
						if(typeof allClasses[use] !== 'undefined'
							&& allClasses[use]["identification"] != null 
							&& allClasses[use]["identification"]["short_name"] == classResolved["short_name"]
						){
							createClass = use;
							break;
						}
					  }
					}
					if(createClass == true){
						// console.log("CLASS 3", subjectNameParsed["value"]);
						classesTable[subjectNameParsed["value"]+counter] = {
							"variableName":triples[triple]["subject"]["value"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false,
							"orderCounter":triples[triple]["tableCounter"]
						};
						classTableAdded.push(subjectNameParsed["value"]+counter);
						nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed["value"]+counter] = "class";
						counter++;
					} else if(nodeList[triples[triple]["subject"]["value"]]["count"] > 1){
						// if class used more than once, copy class from parent scope (to decide later whether to build a new class box or not)
						// console.log("CLASS 4", subjectNameParsed["value"]);
						classesTable[createClass] = {
							"variableName":triples[triple]["subject"]["value"],
							"identification":classResolved,
							"instanceAlias":instanceAlias,
							"isVariable":false,
							"isUnit":false,
							"isUnion":false,
							"orderCounter":triples[triple]["tableCounter"]
						};
						classTableAdded.push(createClass);
						nodeList[triples[triple]["subject"]["value"]]["uses"][createClass] = "class";
					}
				}
			} else {
				let createClass = true;
				// if class is defined without identification (from object/data property)
				var addToClass = false;
				
				for(let use in nodeList[triples[triple]["subject"]["value"]]["uses"]){
				  if(typeof nodeList[triples[triple]["subject"]["value"]]["uses"][use] !== "function"){
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
				}
				// If more than one class within same scope uses the same name, create different class box for each.
				if(createClass == true && nodeList[triples[triple]["subject"]["value"]]["count"] > 1){
					// console.log("CLASS 5", subjectNameParsed["value"], nodeList[triples[triple]["subject"]]);
					classesTable[subjectNameParsed["value"]+counter] = {
						"variableName":triples[triple]["subject"]["value"],
						"identification":classResolved,
						"instanceAlias":instanceAlias,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false,
						"orderCounter":triples[triple]["tableCounter"]
					};
					classTableAdded.push(subjectNameParsed["value"]+counter);
					nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed["value"]+counter] = "class";
					counter++;
				}
				
				// 	If class earlier was defined without identification (from object/data property) - add identification to existing class
				if(addToClass != false){
					// console.log("CLASS 6", addToClass, classResolved, classesTable[addToClass]);
					classesTable[addToClass]["identification"] = classResolved;
					if(classesTable[addToClass]["instanceAlias"] == classesTable[addToClass]["identification"]["local_name"])  classesTable[addToClass]["instanceAlias"] = null;
				}
				if(addToClass == false && createClass == true && typeof parentNodeList[triples[triple]["subject"]["value"]] !== "undefined" && typeof nodeList[triples[triple]["subject"]["value"]] !== "undefined" && nodeList[triples[triple]["subject"]["value"]]["count"] <=1){
					classesTable[subjectNameParsed["value"]+counter] = {
						"variableName":triples[triple]["subject"]["value"],
						"identification":classResolved,
						"instanceAlias":instanceAlias,
						"isVariable":false,
						"isUnit":false,
						"isUnion":false,
						"orderCounter":triples[triple]["tableCounter"]
					};
					classTableAdded.push(subjectNameParsed["value"]+counter);
					nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed["value"]+counter] = "class";
					counter++;
					// console.log("CLASS 6a", addToClass)
				}
			}
		} else{
			//if class without definition
			//from data property
			let params = {name: triples[triple]["predicate"]["value"]};
			if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
			let propertyResolved = await dataShapes.resolvePropertyByName(params);
			if(propertyResolved.complete == true) {
				//propertyResolved.data[0].short_name = propertyResolved.data[0].prefix + ":" + propertyResolved.data[0].display_name;
				let sn = propertyResolved.data[0].display_name;
				if(schemaName == "wikidata" && propertyResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true && showPrefixesForAllNames !== true){}
				else if(propertyResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = propertyResolved.data[0].prefix+ ":" + sn;
				propertyResolved.data[0].short_name = sn;
			}
			
			if(propertyResolved.complete == true && propertyResolved.data[0].object_cnt == 0 && propertyResolved.data[0].data_cnt > 0 && bgptype != "optionalLink" && getVariable(triples[triple]["object"])["type"] != "iri"){
				//subjest
				let subjectNameParsed = getVariable(triples[triple]["subject"])["value"];
				
				let instanceAlias = await generateInstanceAlias(subjectNameParsed);
		
				if(Object.keys(nodeList[triples[triple]["subject"]["value"]]["uses"]).length == 0){
					// if not in parent query part
					if(typeof parentNodeList[triples[triple]["subject"]["value"]] === 'undefined'){
						if(typeof allClasses[subjectNameParsed] === 'undefined'){
							// If first time used in a query – create new class box.
							// console.log("CLASS DP 22", subjectNameParsed, allClasses, classesTable);
							classesTable[subjectNameParsed] = {
								"variableName":triples[triple]["subject"]["value"],
								"identification":null,
								"instanceAlias":instanceAlias,
								"isVariable":false,
								"isUnit":false,
								"isUnion":false,
								"orderCounter":triples[triple]["tableCounter"]
							};
							classTableAdded.push(subjectNameParsed);
							nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed] = "dataProperty";
							
						} else {
							// If defined in all query scope (two or more scope level up) - create new class box with different identification.
							classesTable[subjectNameParsed+counter] = {
								"variableName":triples[triple]["subject"]["value"],
								"identification":null,
								"instanceAlias":instanceAlias,
								"isVariable":false,
								"isUnit":false,
								"isUnion":false,
								"orderCounter":triples[triple]["tableCounter"]
							};
							classTableAdded.push(subjectNameParsed+counter);
							nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed+counter] = "dataProperty";
							counter++;
							// console.log("CLASS DP 23", subjectNameParsed, subjectNameParsed+counter);
						}
					} else {
						// If class defined in a parent scope
						for(let use in parentNodeList[triples[triple]["subject"]["value"]]["uses"]){
						  if(typeof parentNodeList[triples[triple]["subject"]["value"]]["uses"][use] !== "function"){
							if(typeof classesTable[use] === 'undefined'){
								classesTable[use] = {
									"variableName":triples[triple]["subject"]["value"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false,
									"orderCounter":triples[triple]["tableCounter"]
								};
								classTableAdded.push(use);
								nodeList[triples[triple]["subject"]["value"]]["uses"][use] = "dataProperty";
								// console.log("CLASS OP 24a", subjectNameParsed, classesTable, parentNodeList, nodeList);
							} else if(getVariable(triples[triple]["object"])["type"] == "RDFLiteral" || getVariable(triples[triple]["object"])["type"] == "string") {
							// } else {
									classesTable[subjectNameParsed+counter] = {
										"variableName":triples[triple]["subject"]["value"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false,
									"orderCounter":triples[triple]["tableCounter"]
									};
									classTableAdded.push(subjectNameParsed+counter);
									nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OP 24b", subjectNameParsed, classesTable, parentNodeList, nodeList);
								}
						  }
						}
						// console.log("CLASS DP 24", subjectNameParsed, classTableAdded, classesTable, allClasses);
						nodeList[triples[triple]["subject"]["value"]]["uses"] = parentNodeList[triples[triple]["subject"]["value"]]["uses"];
					}
				} 
				
				
			}
			//from object property path
			else if(typeof triples[triple]["predicate"] === "object" && triples[triple]["predicate"]["type"] == "path"){

				let last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
				if(typeof last_element["termType"] === "undefined"){
						last_element = last_element["items"][last_element["items"].length - 1];
				}
				last_element = last_element["value"];
				params.name = last_element;
				let pathPropertyResolved = await dataShapes.resolvePropertyByName(params);
				if(pathPropertyResolved.complete == true) {
					// pathPropertyResolved.data[0].short_name = pathPropertyResolved.data[0].prefix + ":" + pathPropertyResolved.data[0].display_name;
					let sn = pathPropertyResolved.data[0].display_name;
					if(schemaName == "wikidata" && pathPropertyResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
					else if(pathPropertyResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = pathPropertyResolved.data[0].prefix+ ":" + sn;
					pathPropertyResolved.data[0].short_name = sn;
				}

				// last element == OP
				if((pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt >0) || pathPropertyResolved.complete == false || schemaName == "wikidata"){
					//subjest
					let subjectNameParsed = getVariable(triples[triple]["subject"])["value"];
					
					let instanceAlias = await generateInstanceAlias(subjectNameParsed);
					
						if(Object.keys(nodeList[triples[triple]["subject"]["value"]]["uses"]).length == 0){
							if(typeof parentNodeList[triples[triple]["subject"]["value"]] === 'undefined'){
								if(typeof allClasses[subjectNameParsed] === 'undefined'){
									classesTable[subjectNameParsed] = {
										"variableName":triples[triple]["subject"]["value"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false,
										"orderCounter":triples[triple]["tableCounter"]
									};
									classTableAdded.push(subjectNameParsed);
									nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed] = "objectProperty";
									// console.log("CLASS OPP 16a", subjectNameParsed);
								} else {
									classesTable[subjectNameParsed+counter] = {
										"variableName":triples[triple]["subject"]["value"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false,
										"orderCounter":triples[triple]["tableCounter"]
									};
									classTableAdded.push(subjectNameParsed+counter);
									nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OPP 17a", subjectNameParsed);
								}
							} else {
								nodeList[triples[triple]["subject"]["value"]]["uses"] = parentNodeList[triples[triple]["subject"]["value"]]["uses"];
								// console.log("CLASS OPP 18a", subjectNameParsed);
							}
						} 
					if(Object.keys(nodeList[triples[triple]["subject"]["value"]]["uses"]).length == 0) nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed] = "objectProperty";
					
					let objectNameParsed = getVariable(triples[triple]["object"]);
				
					if(objectNameParsed["type"] != "number" && objectNameParsed["type"] != "string" && objectNameParsed["type"] != "RDFLiteral"){
						objectNameParsed = objectNameParsed["value"];
						if(typeof nodeList[triples[triple]["object"]["value"]] === "undefined" || Object.keys(nodeList[triples[triple]["object"]["value"]]["uses"]).length == 0 || triples[triple]["subject"]["termType"] === "BlankNode"){
							if(typeof nodeList[triples[triple]["object"]["value"]] === "undefined") nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
							let instanceAlias = await generateInstanceAlias(objectNameParsed);
							
							if(typeof parentNodeList[triples[triple]["object"]["value"]] === 'undefined'){

								if(typeof allClasses[objectNameParsed] === 'undefined'){
									classesTable[objectNameParsed] = {
										"variableName":triples[triple]["object"]["value"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false,
										"orderCounter":triples[triple]["tableCounter"]
									};
									classTableAdded.push(objectNameParsed);
									nodeList[triples[triple]["object"]["value"]]["uses"][objectNameParsed] = "objectProperty";
									// console.log("CLASS OPP 13", objectNameParsed);
								} else {
									classesTable[objectNameParsed+counter] = {
										"variableName":triples[triple]["object"]["value"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false,
										"orderCounter":triples[triple]["tableCounter"]
									};
									classTableAdded.push(objectNameParsed+counter);
									nodeList[triples[triple]["object"]["value"]]["uses"][objectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OPP 14", objectNameParsed);
								}
							} else {
								
								let commonClass = "";
								for(let nClass in nodeList){
									if(typeof parentNodeList[nClass] !== "undefined" && typeof parentNodeList[nClass] !== "function"){
										commonClass = nClass;
										break;
									}
								}
								let isNotUnionClass = true;
								for(let use in parentNodeList[triples[triple]["object"]["value"]]["uses"]){
									if(typeof parentNodeList[triples[triple]["object"]["value"]]["uses"][use] !== "function"){
										if(typeof classesTable[use] === 'undefined'){
											classesTable[use] = {
												"variableName":triples[triple]["object"]["value"],
												"identification":null,
												"instanceAlias":instanceAlias,
												"isVariable":false,
												"isUnit":false,
												"isUnion":false,
												"orderCounter":triples[triple]["tableCounter"]
											};
											classTableAdded.push(use);
											nodeList[triples[triple]["object"]["value"]]["uses"][use] = "dataProperty";
										} else if(isUnderUnion == true && commonClass !== "" && use != commonClass){
											
											classesTable[use+counter] = {
												"variableName":triples[triple]["object"]["value"],
												"identification":null,
												"instanceAlias":instanceAlias,
												"isVariable":false,
												"isUnit":false,
												"isUnion":false,
												"orderCounter":triples[triple]["tableCounter"]
											};
											classTableAdded.push(use+counter);
											nodeList[triples[triple]["object"]["value"]]["uses"][use+counter] = "objectProperty";
											counter++;
											isNotUnionClass = false;
											// console.log("CLASS OPP 15a", objectNameParsed, nodeList[triples[triple]["object"]], parentNodeList[triples[triple]["object"]]);
										}
									}
							  }	
								// console.log("CLASS OPP 15", objectNameParsed, nodeList[triples[triple]["object"]], parentNodeList[triples[triple]["object"]]);
								if(isNotUnionClass)nodeList[triples[triple]["object"]["value"]]["uses"] = parentNodeList[triples[triple]["object"]["value"]]["uses"];
							}
						} 
					}
					////////////////////////////////////////////////////////////////////////////////////////////////////////
				}
				// last element == DP
				if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].data_cnt >0 && pathPropertyResolved.data[0].object_cnt == 0){
					//subjest	
					let subjectNameParsed = getVariable(triples[triple]["subject"])["value"];
					let instanceAlias = await generateInstanceAlias(subjectNameParsed);
						if(Object.keys(nodeList[triples[triple]["subject"]["value"]]["uses"]).length == 0){
							if(typeof parentNodeList[triples[triple]["subject"]["value"]] === 'undefined'){
								if(typeof allClasses[subjectNameParsed] === 'undefined'){
									classesTable[subjectNameParsed] = {
										"variableName":triples[triple]["subject"]["value"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false,
										"orderCounter":triples[triple]["tableCounter"]
									};
									classTableAdded.push(subjectNameParsed);
									nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed] = "objectProperty";
									// console.log("CLASS OPP 16", subjectNameParsed);
								} else {
									classesTable[subjectNameParsed+counter] = {
										"variableName":triples[triple]["subject"]["value"],
										"identification":null,
										"instanceAlias":instanceAlias,
										"isVariable":false,
										"isUnit":false,
										"isUnion":false,
										"orderCounter":triples[triple]["tableCounter"]
									};
									classTableAdded.push(subjectNameParsed+counter);
									nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed+counter] = "objectProperty";
									counter++;
									// console.log("CLASS OPP 17", subjectNameParsed);
								}
							} else {
								nodeList[triples[triple]["subject"]["value"]]["uses"] = parentNodeList[triples[triple]["subject"]["value"]]["uses"];
								// console.log("CLASS OPP 18", subjectNameParsed);
							}
						} 
					if(Object.keys(nodeList[triples[triple]["subject"]["value"]]["uses"]).length == 0) nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed] = "objectProperty";
				}
			}
			//from object property
			else {
				//subjest
								
				let subjectNameParsed = getVariable(triples[triple]["subject"]);
				
				if(subjectNameParsed["type"] != "number" && subjectNameParsed["type"] != "string" && subjectNameParsed["type"] != "RDFLiteral"){
					subjectNameParsed = subjectNameParsed["value"];
					if(Object.keys(nodeList[triples[triple]["subject"]["value"]]["uses"]).length == 0){
						let instanceAlias = await generateInstanceAlias(subjectNameParsed);
						if(typeof parentNodeList[triples[triple]["subject"]["value"]] === 'undefined'){
							if(typeof allClasses[subjectNameParsed] === 'undefined'){
								classesTable[subjectNameParsed] = {
									"variableName":triples[triple]["subject"]["value"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false,
									"orderCounter":triples[triple]["tableCounter"]
								};
								classTableAdded.push(subjectNameParsed);
								nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed] = "objectProperty";
								// console.log("CLASS OP 10", subjectNameParsed);
							} else {
								classesTable[subjectNameParsed+counter] = {
									"variableName":triples[triple]["subject"]["value"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false,
									"orderCounter":triples[triple]["tableCounter"]
								};
								classTableAdded.push(subjectNameParsed+counter);
								nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed+counter] = "objectProperty";
								counter++;
								// console.log("CLASS OP 11", subjectNameParsed);
							}
						} else {
							for(let use in parentNodeList[triples[triple]["subject"]["value"]]["uses"]){
								if(typeof parentNodeList[triples[triple]["subject"]["value"]]["uses"][use] !== "function"){
									if(typeof classesTable[use] === 'undefined'){
										classesTable[use] = {
											"variableName":triples[triple]["subject"]["value"],
											"identification":null,
											"instanceAlias":instanceAlias,
											"isVariable":false,
											"isUnit":false,
											"isUnion":false,
											"orderCounter":triples[triple]["tableCounter"]
										};
										classTableAdded.push(use);
										nodeList[triples[triple]["subject"]["value"]]["uses"][use] = "dataProperty";
										// console.log("CLASS OP 12", subjectNameParsed, classesTable, parentNodeList, nodeList);
									} else if(getVariable(triples[triple]["object"])["type"] == "RDFLiteral" || getVariable(triples[triple]["object"])["type"] == "string") {
										classesTable[subjectNameParsed+counter] = {
											"variableName":triples[triple]["subject"]["value"],
											"identification":null,
											"instanceAlias":instanceAlias,
											"isVariable":false,
											"isUnit":false,
											"isUnion":false,
											"orderCounter":triples[triple]["tableCounter"]
										};
										classTableAdded.push(subjectNameParsed+counter);
										nodeList[triples[triple]["subject"]["value"]]["uses"][subjectNameParsed+counter] = "objectProperty";
										counter++;
										// console.log("CLASS OP 12a", subjectNameParsed, classesTable, parentNodeList, nodeList);
									}
								}
							}
							nodeList[triples[triple]["subject"]["value"]]["uses"] = parentNodeList[triples[triple]["subject"]["value"]]["uses"];	
						}
					}
				} 
				
				//object
				let objectNameParsed = getVariable(triples[triple]["object"]);
					
				
				if(objectNameParsed["type"] != "number" && objectNameParsed["type"] != "string" && objectNameParsed["type"] != "RDFLiteral" && (triples[triple]["predicate"]["value"] != directClassMembershipRole && typeof classifiers[triples[triple]["predicate"]["value"]] === "undefined")){
					objectNameParsed = objectNameParsed["value"];
					if(typeof nodeList[triples[triple]["object"]["value"]] === "undefined" || typeof nodeList[triples[triple]["object"]["value"]] === "function" || (typeof nodeList[triples[triple]["object"]["value"]] !== "function" && Object.keys(nodeList[triples[triple]["object"]["value"]]["uses"]).length == 0) || triples[triple]["subject"]["termType"] == "BlankNode"){
						if(typeof nodeList[triples[triple]["object"]["value"]] === "undefined" || typeof nodeList[triples[triple]["object"]["value"]] === "function") nodeList[triples[triple]["object"]["value"]] = createNodeListInstance(nodeList, triples[triple]["object"]["value"]);
						let instanceAlias = await generateInstanceAlias(objectNameParsed);
						
						if(triples[triple]["object"]["termType"] == "BlankNode"){
							instanceAlias = "";
						}
						
						if(typeof parentNodeList[triples[triple]["object"]["value"]] === 'undefined' || typeof parentNodeList[triples[triple]["object"]["value"]] === 'function'){
							if(typeof allClasses[objectNameParsed] === 'undefined' || typeof allClasses[objectNameParsed] === 'function'){
								
								classesTable[objectNameParsed] = {
									"variableName":triples[triple]["object"]["value"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false,
									"orderCounter":triples[triple]["tableCounter"]
								};
								classTableAdded.push(objectNameParsed);
								nodeList[triples[triple]["object"]["value"]]["uses"][objectNameParsed] = "objectProperty";
								// console.log("CLASS OP 13", objectNameParsed, triples[triple]["object"], triples[triple], directClassMembershipRole, classifiers);
							} else {
								classesTable[objectNameParsed+counter] = {
									"variableName":triples[triple]["object"]["value"],
									"identification":null,
									"instanceAlias":instanceAlias,
									"isVariable":false,
									"isUnit":false,
									"isUnion":false,
									"orderCounter":triples[triple]["tableCounter"]
								};
								classTableAdded.push(objectNameParsed+counter);
								nodeList[triples[triple]["object"]["value"]]["uses"][objectNameParsed+counter] = "objectProperty";
								counter++;
								// console.log("CLASS OP 14", objectNameParsed);
							}
						} else {
							
							let commonClass = "";
							for(let nClass in nodeList){
								if(typeof parentNodeList[nClass] !== "undefined" && typeof nodeList[nClass] !== "function" && typeof parentNodeList[nClass] !== "function"){
									commonClass = nClass;
									break;
								}
							}
							let isNotUnionClass = true;
							for(let use in parentNodeList[triples[triple]["object"]["value"]]["uses"]){
								if(typeof parentNodeList[triples[triple]["object"]["value"]]["uses"][use] !== "function"){
									if(typeof classesTable[use] === 'undefined'){
										classesTable[use] = {
											"variableName":triples[triple]["object"]["value"],
											"identification":null,
											"instanceAlias":instanceAlias,
											"isVariable":false,
											"isUnit":false,
											"isUnion":false,
											"orderCounter":triples[triple]["tableCounter"]
										};
										classTableAdded.push(use);
										nodeList[triples[triple]["object"]["value"]]["uses"][use] = "dataProperty";
									} else if(isUnderUnion == true && commonClass !== "" && use != commonClass){
										
										classesTable[use+counter] = {
											"variableName":triples[triple]["object"]["value"],
											"identification":null,
											"instanceAlias":instanceAlias,
											"isVariable":false,
											"isUnit":false,
											"isUnion":false,
											"orderCounter":triples[triple]["tableCounter"]
										};
										classTableAdded.push(use+counter);
										nodeList[triples[triple]["object"]["value"]]["uses"][use+counter] = "objectProperty";
										counter++;
										isNotUnionClass = false;
										// console.log("CLASS OP 15a", objectNameParsed, nodeList[triples[triple]["object"]], parentNodeList[triples[triple]["object"]]);
									}
								}
						  }	
							// console.log("CLASS OP 15", objectNameParsed, nodeList[triples[triple]["object"]], parentNodeList[triples[triple]["object"]]);
							if(isNotUnionClass)nodeList[triples[triple]["object"]["value"]]["uses"] = parentNodeList[triples[triple]["object"]["value"]]["uses"];
						}
					} 
				}
			}
			
		}
	  }
	}

	for(let triple = 0; triple < triples.length; triple++) {
	  if(typeof triples[triple] !== "undefined"){
		if((triples[triple]["predicate"]["value"] != directClassMembershipRole) || ((triples[triple]["predicate"]["value"] == directClassMembershipRole) && triples[triple]["object"]["termType"] === "BlankNode") ||
		typeof variableList[triples[triple]["object"]["value"]+"Label"] !== "undefined" || typeof variableList[triples[triple]["object"]["value"]+"AltLabel"] !== "undefined" || typeof variableList[triples[triple]["object"]["value"]+"Description"] !== "undefined"){
			//data property
			let objectNameParsed = getVariable(triples[triple]["object"]);
			let params = {name: triples[triple]["predicate"]["value"]};
			if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
			let attributeResolved = await dataShapes.resolvePropertyByName(params);

			if(attributeResolved.complete == true) {
				
				let sn = attributeResolved.data[0].display_name;
				if(schemaName == "wikidata" && attributeResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
				else if(attributeResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = attributeResolved.data[0].prefix+ ":" + sn;
				attributeResolved.data[0].short_name = sn;
			}
			
			params = {name: getVariable(triples[triple]["object"])["value"]};
			// if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
			
			if(typeof triples[triple]["predicate"]["termType"] !== "undefined" && (objectNameParsed["type"] == "number" || objectNameParsed["type"] == "string" || objectNameParsed["type"] == "RDFLiteral") 
			||( bgptype != "optionalLink" 
			&& Object.keys(findByVariableName(classesTable, triples[triple]["subject"]["value"])).length > 0 
			&& Object.keys(findByVariableName(classesTable, triples[triple]["object"]["value"])).length == 0 
			&& Object.keys(findByVariableName(classesTable, getVariable(triples[triple]["object"])["value"])).length == 0 
		    && getVariable(triples[triple]["object"])["type"] != "iri"
			&& attributeResolved.complete == true && attributeResolved.data[0].data_cnt > 0 && attributeResolved.data[0].object_cnt == 0 && await dataShapes.resolveClassByName(params).complete != true)){
				 // console.log("DATA PROPERTY", triples[triple]);
				let alias = "";
				let objectNameParsed = getVariable(triples[triple]["object"]);

				// filter as triple
				if((objectNameParsed["type"] == "number" || objectNameParsed["type"] == "string" || objectNameParsed["type"] == "RDFLiteral") && typeof classifiers[triples[triple]["predicate"]["value"]] === "undefined"){
					let exprVariables = [];
					var attrName;
					if(attributeResolved.complete == true) attrName = attributeResolved.data[0]["short_name"];
					else attrName = await generateInstanceAlias(triples[triple]["predicate"]["value"]);
					
					if(attrName.indexOf("://") != -1 && attrName.indexOf("<") == -1) attrName = "<" + attrName + ">";
					
					exprVariables.push(attrName);
					
					filterTable.push({filterString:attrName+ " -> " + objectNameParsed["value"], filterVariables:exprVariables});
					
					let classes = findByVariableName(classesTable, triples[triple]["subject"]["value"]);
					
					for(let clazz in classes){
						if(typeof classes[clazz] !== "function"){
							if(classTableAdded.indexOf(clazz) !== -1){
								if(typeof classesTable[clazz]["conditions"] === 'undefined') classesTable[clazz]["conditions"] = [];
								classesTable[clazz]["conditions"].push(attrName+ " -> " + objectNameParsed["value"]);
								break;
							}
						}
					}
				} else if (typeof classifiers[triples[triple]["predicate"]["value"]] === "undefined"){
						
					//id identification.localName not equeals to subject - use alias
					// if(attributeResolved.data[0]["local_name"] != objectNameParsed["value"]) 
						alias = objectNameParsed["value"];
	
					let requireValues = true;
					if(bgptype == "optional") requireValues = false;
					
					let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
					
					for(let sclass in subjectClasses){
					  if(typeof subjectClasses[sclass] !== "function"){
						 
						var createAttribute = true;
						// if class is in the schema, class does not have given attribute -> do not add attribute to this class
						if (classesTable[sclass]["identification"] != null && Object.keys(subjectClasses).length>1) {
							
							let resolvePropertyByNameAndClass = await dataShapes.checkProperty ({name:classesTable[sclass]["identification"]["iri"], propertyName: triples[triple]["predicate"]["value"]})
							if(resolvePropertyByNameAndClass.data.length == 0) createAttribute = false

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
									"counter":orderCounter,
									"bgp":true,
									"orderCounter":triples[triple]["tableCounter"]
								};
								attributeTableAdded.push(objectNameParsed["value"]);
								orderCounter++;
							} else if(findAttributeInAttributeTable(attributeTable, objectNameParsed["value"], triples[triple]["object"]["value"], attributeResolved.data[0]) == null){
								attributeTable[objectNameParsed["value"]+counter] = {
									"class":sclass,
									"variableName":objectNameParsed["value"],
									"identification":attributeResolved.data[0],
									"alias":alias,
									"requireValues":requireValues,
									"seen":false,
									"counter":orderCounter,
									"bgp":true,
									"orderCounter":triples[triple]["tableCounter"]
								};
								attributeTableAdded.push(objectNameParsed["value"]+counter);
								orderCounter++;
								counter++;
							}
		
						}
					  }
					}
				}
			}
			//object property
			else {
				// console.log("OBJECT PROPERTY", triples[triple]);
				if (typeof triples[triple]["predicate"]["value"] == "string"){
					// if(triples[triple]["predicate"]["value"].startsWith("?")){
					if(typeof triples[triple]["predicate"]["termType"] !== "undefined" && triples[triple]["predicate"]["termType"] == "Variable") {
						// for every object usage in nodeList, for elery subject usage in nodeList - create link
						let objectClasses = nodeList[triples[triple]["object"]["value"]]["uses"];
						for(let oclass in objectClasses){
						  if(typeof objectClasses[oclass] !== "function"){
							let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
							let linkType = "REQUIRED";
							for(let sclass in subjectClasses){
							  if(typeof subjectClasses[sclass] !== "function"){
								let linkName = "?"+triples[triple]["predicate"]["value"];
								if(selectVariables.indexOf(triples[triple]["predicate"]["value"]) === -1) linkName = "?"+linkName;
								let link = {
									"linkIdentification":{local_name: linkName, display_name: linkName, short_name: linkName},
									"object":oclass,
									"subject":sclass,
									"isVisited":false,
									"linkType":linkType,
									"isSubQuery":false,
									"isGlobalSubQuery":false,
									"isVariable":true,
									"counter":orderCounter,
									"orderCounter":triples[triple]["tableCounter"]
								}
								linkTable.push(link);
								linkTableAdded.push(link);
								orderCounter++;
								// console.log("LINK 1", link, selectVariables.indexOf(triples[triple]["predicate"]["value"]));
							  }
							}
						  }
						}	
					} else {
						// object properties or data properties under optionalLink
						let linkResolved = attributeResolved.data[0];
						let params = {name: triples[triple]["predicate"]["value"]};
						if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
						attributeResolved = await dataShapes.resolvePropertyByName(params);
						if(attributeResolved.complete == true) {
							//attributeResolved.data[0].short_name = attributeResolved.data[0].prefix + ":" + attributeResolved.data[0].display_name;
							let sn = attributeResolved.data[0].display_name;
							if(schemaName == "wikidata" && attributeResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
							else if(attributeResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = attributeResolved.data[0].prefix+ ":" + sn;
							attributeResolved.data[0].short_name = sn;
						}

						// if not OP and is DP
						if(linkResolved == null){
			
							let predicateParsed = getVariable(triples[triple]["predicate"])["value"];
							let linkName = await generateInstanceAlias(predicateParsed);
							if(linkName.indexOf("://") != -1 && linkName.indexOf("<") == -1) linkName = "<"+linkName+">";
							linkResolved = {
								"display_name":linkName,
								"short_name":linkName,
								"local_name":linkName,
								"URI":triples[triple]["predicate"]["value"],
								"notInSchema": "true"
							}
						}
						let linkType = "REQUIRED";
						// if(bgptype == "optional" || bgptype == "optionalLink") linkType = "OPTIONAL";
						
						/*if(typeof unionSubject !== 'undefined' && unionSubject != null && triples[triple]["subject"]["value"] == unionSubject){
				
							let link = {
								"linkIdentification":linkResolved,
								"object":triples[triple]["object"]["value"],
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
						else{*/
							// for every object usage in nodeList, for every subject usage in nodeList - create link
							// if object class has identification and does not has link
							// and subject class has identification and does not has link -> do not create link
							
							
							let objectClasses;
							if(typeof nodeList[triples[triple]["object"]["value"]] !== "undefined") objectClasses = nodeList[triples[triple]["object"]["value"]]["uses"];
	
							for(let oclass in objectClasses){
							  if(typeof objectClasses[oclass] !== "function"){
								var createAssociation = true;
								var associationCreated = false;

								let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];

								for(let sclass in subjectClasses){
								  if(typeof subjectClasses[sclass] !== "function"){
									// if multiple links with same name to same object and subject, then create only one
									for(let link = 0; link< linkTableAdded.length; link++){
										if(classesTable[linkTableAdded[link]["object"]]["instanceAlias"] == classesTable[oclass]["instanceAlias"] &&
										classesTable[linkTableAdded[link]["subject"]]["instanceAlias"] == classesTable[sclass]["instanceAlias"] &&
										linkTableAdded[link]["linkIdentification"]["short_name"] == linkResolved["short_name"]) {
											associationCreated = true;
			
										}
									}
									if(Object.keys(subjectClasses).length > 1 || Object.keys(objectClasses).length > 1){
		
										if (classesTable[sclass]["identification"] != null) {						
											let resolvePropertyByNameAndClass = await dataShapes.checkProperty({name:classesTable[sclass]["identification"]["iri"], propertyName: linkResolved["iri"]})
										};
									}
									
									if(associationCreated != true && (createAssociation == true || attributeResolved.complete != true)){
										let link = {
											"linkIdentification":linkResolved,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
											"counter":orderCounter,
											"orderCounter":triples[triple]["tableCounter"]
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
						// }
					}
				} else if(typeof triples[triple]["predicate"] == "object"){
	
					//property path
					if(typeof triples[triple]["predicate"]["type"] !== "undefined" && triples[triple]["predicate"]["type"] == "path"){
						let alias = "";
						let params = {};
						if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
						if(triples[triple]["predicate"]["pathType"] == "/"){	
							var pathText = [];
							let last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
							if(typeof last_element["termType"] === "undefined" && typeof last_element["items"][0] !== "undefined")  last_element = last_element["items"][0];
							last_element = last_element["value"];
							//link 
							params.name = last_element;
							let pathPropertyResolved = await dataShapes.resolvePropertyByName(params);

							if(pathPropertyResolved.complete == true) {
								// pathPropertyResolved.data[0].short_name = pathPropertyResolved.data[0].prefix + ":" + pathPropertyResolved.data[0].display_name;
								
								let sn = pathPropertyResolved.data[0].display_name;
								if(schemaName == "wikidata" && pathPropertyResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
								else if(pathPropertyResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = pathPropertyResolved.data[0].prefix+ ":" + sn;
								pathPropertyResolved.data[0].short_name = sn;
							}
							
							
							var objectParsed = getVariable(triples[triple]["object"]);
							if((pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt > 0) || pathPropertyResolved.complete == false || schemaName == "wikidata"){
								for(let item = 0; item < triples[triple]["predicate"]["items"].length; item++){
									if(typeof triples[triple]["predicate"]["items"][item]["termType"] !== "undefined"){
										params.name = triples[triple]["predicate"]["items"][item]["value"];
										let linkResolved = await dataShapes.resolvePropertyByName(params);
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											let sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
											else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											let predicateParsed = getVariable(triples[triple]["predicate"]["items"][item])["value"];
											let alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push(alias);
										}
										
										if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]));
									} 
									// ^
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "^"){
										params.name = triples[triple]["predicate"]["items"][item]["items"][0]["value"];
										let linkResolved = await dataShapes.resolvePropertyByName(params);
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											let sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
											else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											let predicateParsed = getVariable(triples[triple]["predicate"]["items"][item]["items"][0])["value"];
											let alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push("^" + alias);
										}
										if(linkResolved.complete == true)pathText.push("^" + buildPathElement(linkResolved.data[0]));
									}
									// *
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "*"){
										params.name = triples[triple]["predicate"]["items"][item]["items"][0]["value"];
										let linkResolved = await dataShapes.resolvePropertyByName(params);
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											let sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
											else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											let predicateParsed = getVariable(triples[triple]["predicate"]["items"][item]["items"][0])["value"];
											let alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push(alias +"*");
										}
										if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]) +"*");
									}// ?
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "?"){
										params.name = triples[triple]["predicate"]["items"][item]["items"][0]["value"];
										let linkResolved = await dataShapes.resolvePropertyByName(params);
										
										if(linkResolved.complete == true) {
											//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
											let sn = linkResolved.data[0].display_name;
											if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
											else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
											linkResolved.data[0].short_name = sn;
										}else {
											let predicateParsed = getVariable(triples[triple]["predicate"]["items"][item]["items"][0])["value"];
											let alias = await generateInstanceAlias(predicateParsed, false)
											pathText.push(alias +"?");
										}
										
										if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]) +"?");
									}
								}
								let linkType = "REQUIRED";
								if(bgptype == "optional") linkType = "OPTIONAL"; 

								if(indirectClassMembershipRole == pathText.join(".")){ 
									
									if(typeof nodeList[triples[triple]["object"]["value"]] !== 'undefined'){
										let objectClasses = nodeList[triples[triple]["object"]["value"]]["uses"];
										for(let oclass in objectClasses){
										  if(typeof objectClasses[oclass] !== "function"){
											let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
											for(let sclass in subjectClasses){
											  if(typeof subjectClasses[sclass] !== "function"){
												// Indirect Class Membership
												let params = {name: classesTable[oclass]["instanceAlias"]};
												if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
												var identification = await dataShapes.resolveClassByName(params);
												if(identification.complete == true) {
													
													
													let sn = identification.data[0].display_name;
													if(schemaName == "wikidata" && identification.data[0].prefix == "wd" && showPrefixesForAllNames !== true){}
													else if(identification.data[0].is_local != true || showPrefixesForAllNames == true)sn = identification.data[0].prefix+ ":" + sn;
													classesTable[sclass]["identification"] = identification.data[0];
													classesTable[sclass]["identification"]["short_name"] = sn;
													classesTable[sclass]["indirectClassMembership"] = true;
													
													 delete classesTable[oclass];

												} else if(oclass.indexOf(":/") == -1){												
													classesTable[sclass]["identification"] = {"short_name": "?"+oclass};
													classesTable[sclass]["indirectClassMembership"] = true;
													
													if(typeof triples[triple]["object"]["termType"]!== "undefined" && triples[triple]["object"]["termType"] == "Variable" && (typeof variableList[classesTable[sclass]["identification"]["short_name"]] === "undefined" || variableList[classesTable[sclass]["identification"]["short_name"]] == 0)) classesTable[sclass]["identification"]["short_name"] = "?"+ classesTable[sclass]["identification"]["short_name"]
													delete classesTable[oclass];
		
												} else {
													let linkResolved2 = Object.assign({}, pathPropertyResolved.data[0]);
													linkResolved2["local_name"] = pathText.join(".");
													linkResolved2["display_name"] = pathText.join(".");
													linkResolved2["short_name"] = pathText.join(".");
																
													// for every object usage in nodeList, for elery subject usage in nodeList - create link
													if(typeof nodeList[triples[triple]["object"]["value"]] !== 'undefined'){
														let objectClasses = nodeList[triples[triple]["object"]["value"]]["uses"];
														for(let oclass in objectClasses){
														  if(typeof objectClasses[oclass] !== "function"){
															let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
															for(let sclass in subjectClasses){
															  if(typeof subjectClasses[sclass] !== "function"){
																let link = {
																	"linkIdentification":linkResolved2,
																	"object":oclass,
																	"subject":sclass,
																	"isVisited":false,
																	"linkType":linkType,
																	"isSubQuery":false,
																	"isGlobalSubQuery":false,
																	"counter":orderCounter,
																	"orderCounter":triples[triple]["tableCounter"]
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
											}
										  }
										}
									}
								} else{

									// var linkResolved = pathPropertyResolved.data[0];
									let linkResolved2 = Object.assign({}, pathPropertyResolved.data[0]);
									linkResolved2["local_name"] = pathText.join(".");
									linkResolved2["display_name"] = pathText.join(".");
									linkResolved2["short_name"] = pathText.join(".");
														
									let objectNameParsed = getVariable(triples[triple]["object"]);
									
									if(objectNameParsed.type === "string"){
										let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
										for(let sclass in subjectClasses){
										  if(typeof subjectClasses[sclass] !== "function"){
											let className = "expr";

											if(typeof classesTable[className] !== "undefined") {
												className = className + "_" + counter;
												counter++;
											}
											
											let attributeInfo = {
												"alias":"expr",
												"identification":null,
												"exp":pathText.join("."),
												"requireValues":true,
												"isInternal":true,
												"addLabel":false,
												"addAltLabel":false,
												"addDescription":false,
												"counter":orderCounter,
												"orderCounter":triples[triple]["tableCounter"]
											}
											
											classesTable[sclass] = addAttributeToClass(classesTable[sclass], attributeInfo);
											
											let expr = className + " = " + getVariable(triples[triple]["object"])["value"];
											
											if(typeof classesTable[sclass]["conditions"] === 'undefined') {
													classesTable[sclass]["conditions"] = [];
											}
											classesTable[sclass]["conditions"].push(expr);
											// console.log("conditions 9", expr);
										  }
										}
									} else {
										// for every object usage in nodeList, for elery subject usage in nodeList - create link
										if(typeof nodeList[triples[triple]["object"]["value"]] !== 'undefined'){
											let objectClasses = nodeList[triples[triple]["object"]["value"]]["uses"];
											for(let oclass in objectClasses){
											  if(typeof objectClasses[oclass] !== "function"){
												let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
												for(let sclass in subjectClasses){
													if(typeof subjectClasses[sclass] !== "function"){
														let link = {
															"linkIdentification":linkResolved2,
															"object":oclass,
															"subject":sclass,
															"isVisited":false,
															"linkType":linkType,
															"isSubQuery":false,
															"isGlobalSubQuery":false,
															"counter":orderCounter,
															"orderCounter":triples[triple]["tableCounter"]
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
								}
							}
							// attribute
							else if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].data_cnt > 0){
								let params = {};
								if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
								for(let item = 0; item < triples[triple]["predicate"]["items"].length; item++){
									// if(typeof triples[triple]["predicate"]["items"][item] == "string"){
									if(triples[triple]["predicate"]["items"][item]["termType"] == "NamedNode"){
										if(item != triples[triple]["predicate"]["items"].length - 1){
											params.name = triples[triple]["predicate"]["items"][item]["value"];
											let linkResolved = await dataShapes.resolvePropertyByName(params);
											if(linkResolved.complete == true) {
												// linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
												let sn = linkResolved.data[0].display_name;
												if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
												else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
												linkResolved.data[0].short_name = sn;
											}
											if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]));
										}
										//last element
										else {
											params.name = triples[triple]["predicate"]["items"][item]["value"];
											let linkResolved = await dataShapes.resolvePropertyByName(params);
											if(linkResolved.complete == true) {
												//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
												let sn = linkResolved.data[0].display_name;
												if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
												else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
												linkResolved.data[0].short_name = sn;
											}
											if(linkResolved.complete == true)pathText.push(buildPathElement(linkResolved.data[0]));
										}
									} 
									// ^
									else if(triples[triple]["predicate"]["items"][item]["type"] == "path" && triples[triple]["predicate"]["items"][item]["pathType"] == "^"){
										if(item != triples[triple]["predicate"]["items"].length - 1){
											params.name = triples[triple]["predicate"]["items"][item]["items"][0];
											let linkResolved = await dataShapes.resolvePropertyByName(params);
											if(linkResolved.complete == true) {
												//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
												let sn = linkResolved.data[0].display_name;
												if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
												else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
												linkResolved.data[0].short_name = sn;
											}
											if(linkResolved.complete == true) pathText.push("^" + buildPathElement(linkResolved.data[0]));
										}
										//last element
										else {
											params.name = triples[triple]["predicate"]["items"][item]["items"][0];
											let linkResolved = await dataShapes.resolvePropertyByName(params);
											if(linkResolved.complete == true) {
												//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;
												let sn = linkResolved.data[0].display_name;
												if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
												else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
												linkResolved.data[0].short_name = sn;
											}
													if(linkResolved.complete == true) pathText.push("^" + buildPathElement(linkResolved.data[0]));
										}
									}
								}
								
								let attrResolved = pathPropertyResolved.data[0];
								
								let objectNameParsed = getVariable(triples[triple]["object"]);
								//id identification.localName not equeals to subject - use alias
								if(attrResolved["local_name"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
								// filter as triple in property path
								if(objectNameParsed.type === "string"){
									let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
									for(let sclass in subjectClasses){
										if(typeof subjectClasses[sclass] !== "function"){
											let expr = pathText.join(".") + " = " + triples[triple]["object"]["value"];
											if(typeof classesTable[sclass] !== "undefined"){
												if(typeof classesTable[sclass]["conditions"] === 'undefined') {
													classesTable[sclass]["conditions"] = [];
												}
												classesTable[sclass]["conditions"].push(expr);
												break;
											}
										}
									}
								}else {
								
									let requireValues = true;
									if(bgptype == "optional") requireValues = false;
					
									let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
									for(let sclass in subjectClasses){
									  if(typeof subjectClasses[sclass] !== "function"){
										if(typeof attributeTable[objectNameParsed["value"]] === 'undefined'){
											attributeTable[objectNameParsed["value"]] = {
												"class":sclass,
												"variableName":objectNameParsed["value"],
												"identification":attrResolved,
												"alias":alias,
												"requireValues":requireValues,
												"exp":pathText.join("."),
												"seen":false,
												"counter":orderCounter,
												"bgp":true,
												"orderCounter":triples[triple]["tableCounter"]
											};
											attributeTableAdded.push(objectNameParsed["value"]);
											orderCounter++;
										} else if(findAttributeInAttributeTable(attributeTable, objectNameParsed["value"], triples[triple]["object"]["value"], attrResolved) == null){
											attributeTable[objectNameParsed["value"]+counter] = {
												"class":sclass,
												"variableName":objectNameParsed["value"],
												"identification":attrResolved,
												"alias":alias,
												"requireValues":requireValues,
												"exp":pathText.join("."),
												"seen":false,
												"counter":orderCounter,
												"bgp":true,
												"orderCounter":triples[triple]["tableCounter"]
											};
											attributeTableAdded.push(objectNameParsed["value"]+counter);
											orderCounter++;
											counter++;
										}
									  }
									}
								}
							}	
						} else if(triples[triple]["predicate"]["pathType"] == "^"){
							//var last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
							var pahtString = "";
							for(let item = 0; item < triples[triple]["predicate"]["items"].length; item++){
								pahtString = pahtString + triples[triple]["predicate"]["items"][item];
							}
							// var attrResolved
							let objectNameParsed = getVariable(triples[triple]["object"]);
							//link
							let last_element = triples[triple]["predicate"]["items"][triples[triple]["predicate"]["items"].length - 1];
							if(typeof last_element["termType"] === "undefined" && typeof last_element["items"][0] !== "undefined")  last_element = last_element["items"][0];
							last_element = last_element["value"];
							//link 
							let params = {name: last_element};
							if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
							let pathPropertyResolved = await dataShapes.resolvePropertyByName(params);

								
							if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].object_cnt > 0){
								var attrResolved2 = Object.assign({}, pathPropertyResolved.data[0]);
								// attrResolved = pathPropertyResolved.data[0];
								attrResolved2["local_name"] = "^" + attrResolved2["local_name"];
								attrResolved2["display_name"] = "^" + attrResolved2["display_name"];
								attrResolved2["short_name"] = "^" + attrResolved2["short_name"];
								
								let requireValues = true;
								let linkType = "REQUIRED";
								if(bgptype == "optional") linkType = "OPTIONAL";
								// for every object usage in nodeList, for elery subject usage in nodeList - create link
								let objectClasses = nodeList[triples[triple]["object"]["value"]]["uses"];
								for(let oclass in objectClasses){
								  if(typeof objectClasses[oclass] !== "function"){
									let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
									for(let sclass in subjectClasses){
										if(typeof subjectClasses[sclass] !== "function"){
											let link = {
												"linkIdentification":attrResolved2,
												"object":oclass,
												"subject":sclass,
												"isVisited":false,
												"linkType":linkType,
												"isSubQuery":false,
												"isGlobalSubQuery":false,
												"counter":orderCounter,
												"orderCounter":triples[triple]["tableCounter"]
											}
											linkTable.push(link);
											linkTableAdded.push(link);
											orderCounter++;
										}
									}
								  }
								}	
							} else if(pathPropertyResolved.complete == true && pathPropertyResolved.data[0].data_cnt > 0){
								let attrResolved = pathPropertyResolved.data[0];
								
								//id identification.localName not equeals to subject - use alias
								if(attrResolved["local_name"] != objectNameParsed["value"]) alias = objectNameParsed["value"];
								let requireValues = true;
								if(bgptype == "optional") requireValues = false;
								
								let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
								for(let sclass in subjectClasses){
								  if(typeof subjectClasses[sclass] !== "function"){
									if(typeof attributeTable[objectNameParsed["value"]] === 'undefined'){
										attributeTable[objectNameParsed["value"]] = {
											"class":sclass,
											"variableName":objectNameParsed["value"],
											"identification":attrResolved,
											"alias":alias,
											"requireValues":requireValues,
											"exp":"^" + buildPathElement(attrResolved),
											"seen":false,
											"counter":orderCounter,
											"bgp":true,
											"orderCounter":triples[triple]["tableCounter"]
										};
										attributeTableAdded.push(objectNameParsed["value"]);
										orderCounter++;
									} else if(findAttributeInAttributeTable(attributeTable, objectNameParsed["value"], triples[triple]["object"]["value"], attrResolved) == null){
										attributeTable[objectNameParsed["value"]+counter] = {
											"class":sclass,
											"variableName":objectNameParsed["value"],
											"identification":attrResolved,
											"alias":alias,
											"requireValues":requireValues,
											"exp":"^" + buildPathElement(attrResolved),
											"seen":false,
											"counter":orderCounter,
											"bgp":true,
											"orderCounter":triples[triple]["tableCounter"]
										};
										attributeTableAdded.push(objectNameParsed["value"]+counter);
										counter++;
										orderCounter++;
									}
								  }
								}
							}
						} else if(triples[triple]["predicate"]["pathType"] == "+" || triples[triple]["predicate"]["pathType"] == "*" || triples[triple]["predicate"]["pathType"] == "?" || triples[triple]["predicate"]["pathType"] == "!"){
							let propertyPathText = "";
							for(let item = 0; item < triples[triple]["predicate"]["items"].length; item++){
								let temp = await generatePropertyPath(triple, triples[triple]["predicate"]["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
								propertyPathText = propertyPathText + temp;
							}
							if(triples[triple]["predicate"]["pathType"] == "!") propertyPathText = triples[triple]["predicate"]["pathType"] + propertyPathText;
							else propertyPathText = propertyPathText + triples[triple]["predicate"]["pathType"];
							
							let linkType = "REQUIRED";
							if(bgptype == "optional") linkType = "OPTIONAL"; 
							let linkResolved = {
								"short_name":propertyPathText,
								"local_name":propertyPathText,
								"notInSchema": "true"
							}
							// for every object usage in nodeList, for elery subject usage in nodeList - create link
							if(typeof nodeList[triples[triple]["object"]["value"]] !== 'undefined'){
								let objectClasses = nodeList[triples[triple]["object"]["value"]]["uses"];
								for(let oclass in objectClasses){
								  if(typeof objectClasses[oclass] !== "function"){
									let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
									for(let sclass in subjectClasses){
									  if(typeof subjectClasses[sclass] !== "function"){
										let link = {
											"linkIdentification":linkResolved,
											"object":oclass,
											"subject":sclass,
											"isVisited":false,
											"linkType":linkType,
											"isSubQuery":false,
											"isGlobalSubQuery":false,
											"counter":orderCounter,
											"orderCounter":triples[triple]["tableCounter"]
										}
										linkTable.push(link);
										linkTableAdded.push(link);
										orderCounter++
										// console.log("LINK 7", link);
									  }
									}
								  }
								}
							}
						} else if(triples[triple]["predicate"]["pathType"] == "|"){
							let propertyPathText = "";
							var propertyPathArray = [];
							for(let item = 0; item < triples[triple]["predicate"]["items"].length; item++){
								let temp = await generatePropertyPath(triple, triples[triple]["predicate"]["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
								propertyPathArray.push(temp)
							}
							propertyPathText = propertyPathText + "("+propertyPathArray.join(" | ") + ")";

							let linkType = "REQUIRED";
							if(bgptype == "optional") linkType = "OPTIONAL"; 
							let linkResolved = {
								"short_name":propertyPathText,
								"local_name":propertyPathText,
								"notInSchema": "true"
							}
							// for every object usage in nodeList, for elery subject usage in nodeList - create link
							if(typeof nodeList[triples[triple]["object"]["value"]] !== 'undefined'){
								let objectClasses = nodeList[triples[triple]["object"]["value"]]["uses"];
								for(let oclass in objectClasses){
								  if(typeof objectClasses[oclass] !== "function"){
									let subjectClasses = nodeList[triples[triple]["subject"]["value"]]["uses"];
									for(let sclass in subjectClasses){
										if(typeof subjectClasses[sclass] !== "function"){
											let link = {
												"linkIdentification":linkResolved,
												"object":oclass,
												"subject":sclass,
												"isVisited":false,
												"linkType":linkType,
												"isSubQuery":false,
												"isGlobalSubQuery":false,
												"counter":orderCounter,
												"orderCounter":triples[triple]["tableCounter"]
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
		}
	  }
	}

	return {classesTable:classesTable, attributeTable:attributeTable, linkTable:linkTable, linkTableAdded:linkTableAdded, classTableAdded:classTableAdded, attributeTableAdded:attributeTableAdded, filterTable:filterTable, nodeList:nodeList};
}

async function generatePropertyPath(triple, predicate, linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList){
	let propertyPathText = "";
	let params = {};
	if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
	if(typeof predicate["termType"] !== "undefined"){
		params.name = predicate.value;
		let linkResolved = await dataShapes.resolvePropertyByName(params);
		if(linkResolved.complete == true) {
			
			let sn = linkResolved.data[0].display_name;
			if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
			else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
			linkResolved.data[0].short_name = sn;
		}
		
		if(linkResolved.complete == true && linkResolved.data[0].object_cnt > 0){
			propertyPathText = propertyPathText + buildPathElement(linkResolved.data[0]);
		} else {
			let predicateParsed = getVariable(predicate)["value"];
			let linkName = await generateInstanceAlias(predicateParsed);
			propertyPathText = propertyPathText + linkName;
		}
	} else if(predicate["pathType"] == "/"){
		var pathText = [];
		for(let item = 0; item < predicate["items"].length; item++){
			if(typeof predicate["items"][item]["termType"] !== "undefined"){
				params.name = predicate["items"][item]["value"];
				let linkResolved = await dataShapes.resolvePropertyByName(params);
				if(linkResolved.complete == true) {
					//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;	
					let sn = linkResolved.data[0].display_name;
					if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
					else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
					linkResolved.data[0].short_name = sn;
				}
				if(linkResolved.complete == true && linkResolved.data[0].object_cnt > 0) pathText.push(buildPathElement(linkResolved.data[0]));
				else {
					if(linkResolved.complete == true && linkResolved.data[0].data_cnt > 0) pathText.push(buildPathElement(linkResolved.data[0]));
					else {
						let predicateParsed = getVariable(predicate)["value"];
						let linkName = await generateInstanceAlias(predicateParsed);
						pathText.push(linkName);
					}
				}
			} 
			// ^
			else if(predicate["items"][item]["type"] == "path" && predicate["items"][item]["pathType"] == "^"){
				params.name = predicate["items"][item]["items"][0]["value"];
				let linkResolved = await dataShapes.resolvePropertyByName(params);
				if(linkResolved.complete == true) {
					//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;	
					let sn = linkResolved.data[0].display_name;
					if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
					else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
					linkResolved.data[0].short_name = sn;
				}
				if(linkResolved.complete == true && linkResolved.data[0].object_cnt > 0) pathText.push("^" + buildPathElement(linkResolved.data[0]));
				else {
					if(linkResolved.complete == true && linkResolved.data[0].data_cnt > 0) pathText.push("^" + buildPathElement(linkResolved.data[0]));
					else {
						let predicateParsed = getVariable(predicate)["value"];
						let linkName = await generateInstanceAlias(predicateParsed);
						pathText.push("^"+linkName);
					}
				}
			}
		}
		propertyPathText = propertyPathText + pathText.join(".")
	
	} else if(predicate["pathType"] == "^"){
		for(let item = 0; item < predicate["items"].length; item++){
			if(typeof predicate["items"][item]["termType"] !== "undefined"){
				params.name = predicate["items"][item]["value"];
				let linkResolved = await dataShapes.resolvePropertyByName(params);
				if(linkResolved.complete == true) {
					//linkResolved.data[0].short_name = linkResolved.data[0].prefix + ":" + linkResolved.data[0].display_name;	
					let sn = linkResolved.data[0].display_name;
					if(schemaName == "wikidata" && linkResolved.data[0].prefix == "wdt" && showPrefixesForAllNames !== true){}
					else if(linkResolved.data[0].is_local != true || showPrefixesForAllNames == true)sn = linkResolved.data[0].prefix+ ":" + sn;
					linkResolved.data[0].short_name = sn;
				}
				if(linkResolved.complete == true && linkResolved.data[0].object_cnt > 0) propertyPathText = propertyPathText + "^" + buildPathElement(linkResolved.data[0]);
				else {
					if(linkResolved.complete == true && linkResolved.data[0].data_cnt > 0) propertyPathText = propertyPathText + "^" + buildPathElement(linkResolved.data[0]);
					else {
						let predicateParsed = getVariable(predicate)["value"];
						let linkName = await generateInstanceAlias(predicateParsed);
						propertyPathText = propertyPathText + "^" + linkName;
					}
				}
			} 
			else {
				for(let i = 0; i < predicate["items"].length; i++){
					let temp = await generatePropertyPath(triple, predicate["items"][item][i], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
					propertyPathText = propertyPathText + temp;
				}
			}
		}
	} else if(predicate["pathType"] == "+" || predicate["pathType"] == "*" || predicate["pathType"] == "?" || predicate["pathType"] == "!"){
		for(let item = 0; item < predicate["items"].length; item++){
			let temp = await generatePropertyPath(triple, predicate["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
			propertyPathText = propertyPathText + temp;
		}
		if(predicate["pathType"] == "!") propertyPathText = predicate["pathType"] + propertyPathText;
		else propertyPathText = propertyPathText + predicate["pathType"];
	} else if(predicate["pathType"] == "|"){
		var propertyPathArray = [];
		for(let item = 0; item < predicate["items"].length; item++){
			let temp = await generatePropertyPath(triple, predicate["items"][item], linkTable, linkTableAdded, attributeTable, attributeTableAdded, bgptype, nodeList);
			propertyPathArray.push(temp);
		}
		propertyPathText = propertyPathText + "("+propertyPathArray.join(" | ") + ")";
	}
	
	return propertyPathText;
	
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
	if(typeof argument["termType"] !== 'undefined'){
		var result = getVariable(argument);
		if(result["type"] == "varName") result["value"] = "@" + result["value"]
		return  result;
	}
}

function addAttributeToClass(classesTable, identification){

	if(typeof classesTable["fields"] === 'undefined')classesTable["fields"] = [];
	
	var fieldExists = false;
	for(let field = 0; field < classesTable["fields"].length; field++){
	 if(typeof classesTable["fields"][field] !== "undefined"){
		if(classesTable["fields"][field]["alias"] == identification["alias"] && classesTable["fields"][field]["exp"] == identification["exp"]){
			fieldExists = true;
			classesTable["fields"][field]["isInternal"] = identification["isInternal"];
			break;
		}
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

function optimizeAggregationInStartClass(generateClassCtructuretemp){
	
	let instanceAlias = generateClassCtructuretemp.clazz.instanceAlias;
	if(generateClassCtructuretemp.clazz.identification == null &&
	   (typeof generateClassCtructuretemp.clazz.fields === "undefined" || generateClassCtructuretemp.clazz.fields.length == 0) &&
	   typeof generateClassCtructuretemp.clazz.aggregations !== "undefined" && generateClassCtructuretemp.clazz.aggregations.length == 1 &&
	   (generateClassCtructuretemp.clazz.aggregations[0].exp.indexOf("("+instanceAlias+")") != -1 || generateClassCtructuretemp.clazz.aggregations[0].exp.indexOf("(@"+instanceAlias+")") != -1 || generateClassCtructuretemp.clazz.aggregations[0].exp.indexOf("(.)") != -1) &&
	   typeof generateClassCtructuretemp.clazz.children !== "undefined" && generateClassCtructuretemp.clazz.children.length == 1 &&
	   generateClassCtructuretemp.clazz.children[0].linkType != "NOT" &&
	   generateClassCtructuretemp.clazz.children[0].isSubQuery == false &&
	   generateClassCtructuretemp.clazz.children[0].isGlobalSubQuery == false &&
	   generateClassCtructuretemp.clazz.children[0].isInverse == true
	){
		if(generateClassCtructuretemp.clazz.aggregations[0].exp.indexOf("(.)") != -1) generateClassCtructuretemp.clazz.aggregations[0].exp = generateClassCtructuretemp.clazz.aggregations[0].exp.replace("(.)", "(@" + instanceAlias + ")") 
		if(typeof generateClassCtructuretemp.clazz.children[0].aggregations === "undefined") generateClassCtructuretemp.clazz.children[0].aggregations = [];
		generateClassCtructuretemp.clazz.children[0].aggregations.push(generateClassCtructuretemp.clazz.aggregations[0])
		if(typeof generateClassCtructuretemp.clazz.children[0].fields === "undefined") generateClassCtructuretemp.clazz.children[0].fields = [];
		let requireValues = true;
		let exp = generateClassCtructuretemp.clazz.children[0].linkIdentification.short_name;
		if(exp.indexOf(".") !== -1 || exp.indexOf("*") !== -1 || exp.indexOf("|") !== -1) exp = "[[" + exp + "]]";
		if(generateClassCtructuretemp.clazz.children[0].linkType == "OPTIONAL") requireValues = false;
		let attribute = {
			addAltLabel:false,
			addDescription: false,
			addLabel: false,
			alias: instanceAlias,
			counter: 0,
			isInternal: true,
			exp: exp,
			requireValues:requireValues,
			identification: undefined
		}
		generateClassCtructuretemp.clazz.children[0].fields.unshift(attribute);
		generateClassCtructuretemp.clazz = generateClassCtructuretemp.clazz.children[0];
	}
	
	return generateClassCtructuretemp;
}

// Generate tree like ViziQuer query structure, from class and link tables 
function generateClassCtructure(clazz, className, classesTable, linkTable, whereTriplesVaribles, visitedClasses, conditionLinks, variableList){
	// In link table find all links with a subject or an object as given the class. Add class from opposite link end and link information, as given class children.

	clazz.c_id = className;
	for(let linkName = 0; linkName < linkTable.length; linkName++){
		if(typeof linkTable[linkName]["isConditionLink"] === 'undefined'){
			if(linkTable[linkName]["subject"] == className && linkTable[linkName]["isVisited"] == false && typeof classesTable[linkTable[linkName]["object"]] !== "undefined" && classesTable[linkTable[linkName]["object"]]["toBeDeleted"] !== true && classesTable[linkTable[linkName]["subject"]]["toBeDeleted"] != true){	
				linkTable[linkName]["isVisited"] = true;
				linkTable[linkName]["linkIdentification"]["orderCounter"] = linkTable[linkName]["orderCounter"];
				let tempAddClass = addClass(classesTable[linkTable[linkName]["object"]], linkTable[linkName], linkTable[linkName]["object"], linkTable[linkName]["linkIdentification"], linkTable[linkName]["graph"], linkTable[linkName]["graphInstruction"], false, classesTable, linkTable, whereTriplesVaribles, visitedClasses, conditionLinks, variableList);
				
				visitedClasses = tempAddClass["visitedClasses"];

				conditionLinks = tempAddClass["conditionLinks"];
				if(typeof visitedClasses[linkTable[linkName]["object"]] === 'undefined' || visitedClasses[linkTable[linkName]["object"]] != true){
					
					let childerenClass = tempAddClass["childrenClass"];
		
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

					
					var sameFieldInClass = false;
					if(typeof clazz["fields"] !== "undefined"){
						for(let f = 0; f < clazz["fields"].length; f++){
							if(clazz["fields"][f]["alias"] == childerenClass["instanceAlias"] && childerenClass["instanceAlias"] !== "" && childerenClass["instanceAlias"] != null){
								sameFieldInClass = true;
								break;
							}
						}
					}
					
					if(childerenClass["identification"] == null
					&& clazz["isUnit"] != true
					&& clazz["isUnion"] != true
					&& typeof linkTable[linkName]["graphLink"] === "undefined"
					&& (typeof whereTriplesVaribles[childerenClass["instanceAlias"]] !== 'undefined' && (whereTriplesVaribles[childerenClass["instanceAlias"]] == 1 || (whereTriplesVaribles[childerenClass["instanceAlias"]] == 2 && sameFieldInClass == true)))
					&& (((linkTable[linkName]["linkType"] == "OPTIONAL" && typeof childerenClass["conditions"] === 'undefined') || linkTable[linkName]["linkType"] == "REQUIRED") && linkTable[linkName]["isSubQuery"] == false && linkTable[linkName]["isGlobalSubQuery"] == false)
					&& typeof childerenClass["children"] === 'undefined'
					&& (typeof childerenClass["fields"] === 'undefined' || (childerenClass["fields"].length == 1 && childerenClass["fields"][0]["exp"] == "(select this)"))
					&& typeof childerenClass["aggregations"] === 'undefined'
					&& isURI(childerenClass["linkIdentification"]["short_name"]) != 3
					// && linkTable[linkName]["linkIdentification"]["short_name"].indexOf(")*") === -1
					// && linkTable[linkName]["linkIdentification"]["short_name"].indexOf("|") === -1
					// && linkTable[linkName]["linkIdentification"]["short_name"].indexOf("+") === -1
					&& !childerenClass["variableName"].startsWith("g_")
					// && linkTable[linkName]["linkIdentification"]["short_name"].indexOf(".") === -1
					){	
						let exp = linkTable[linkName]["linkIdentification"]["short_name"];
						if(exp.startsWith("http://") || exp.startsWith("https://")) exp = "<" +exp+ ">";
						if(linkTable[linkName]["linkIdentification"]["short_name"].indexOf(")*") !== -1 ||
						linkTable[linkName]["linkIdentification"]["short_name"].indexOf("|") !== -1 || 
						linkTable[linkName]["linkIdentification"]["short_name"].indexOf(".") !== -1) exp = "[[" + exp + "]]";
						var requred = true;
						if(linkTable[linkName]["linkType"] == "OPTIONAL") requred = false;
						var internal = true;
						let addLabel = false;
						let addAltLabel = false;
						let addDescription = false;
						var attrAlias = childerenClass["instanceAlias"];
						if(typeof childerenClass["fields"] !== 'undefined' && childerenClass["fields"].length == 1 && childerenClass["fields"][0]["exp"] == "(select this)"){
							internal = false;
							if(typeof childerenClass["fields"][0]["isInternal"] !== "undefined") internal = childerenClass["fields"][0]["isInternal"];
							addLabel = childerenClass["fields"][0]["addLabel"];
							addAltLabel = childerenClass["fields"][0]["addAltLabel"];
							addDescription = childerenClass["fields"][0]["addDescription"];
						} else if(typeof variableList[attrAlias+"Label"] !== "undefined"){
							addLabel = true;
						}
			
						if(attrAlias == exp) attrAlias = "";
						// if(typeof variableList[attrAlias] !== 'undefined' && variableList[attrAlias] <=1 ) attrAlias = "";
						let attributeInfo = {
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
							"serviceSchemaName":linkTable[linkName]["serviceSchemaName"],
							"counter":linkTable[linkName]["counter"],
							"orderCounter":linkTable[linkName]["orderCounter"]
						}
						
						
						
						// if(selectVariables.indexOf("?"+attrAlias) !== -1)internal = false;
						// console.log("21", attributeInfo, internal, variableList["?" + attrAlias], linkTable[linkName], childerenClass)
						var createAttribute = true;
						
							if(typeof childerenClass["conditions"] !== "undefined"){
								for(let condition = 0; condition< childerenClass["conditions"].length; condition++){
									let filterCreated = false;
									if(childerenClass["conditions"][condition].startsWith("lang(@" + childerenClass["instanceAlias"] + ") = ")){
										let l = "lang(@" + childerenClass["instanceAlias"] + ") = ";
										let lang = childerenClass["conditions"][condition].substring(l.length+1, childerenClass["conditions"][condition].length-1)
										attributeInfo.exp = attributeInfo.exp + "@" + lang;
										filterCreated = true;
									}
									if(filterCreated === false){
										if(typeof clazz["conditions"] === 'undefined') clazz["conditions"] = [];
										if(typeof variableList[attrAlias] !== "undefined" && variableList[attrAlias] <=1){
											if(!exp.startsWith("?") && typeof variableList[ attrAlias] !== "undefined" && childerenClass["conditions"][condition].indexOf(attrAlias) != -1 && childerenClass["conditions"][condition].indexOf(" != ") === -1) {
												childerenClass["conditions"][condition] = childerenClass["conditions"][condition].replace(attrAlias, exp);
												createAttribute = false;
											}
										}
										if(!clazz["conditions"].includes(childerenClass["conditions"][condition])) {
											clazz["conditions"].push(childerenClass["conditions"][condition]);
										}
									}
								}
							}
						
						if(createAttribute)clazz = addAttributeToClass(clazz, attributeInfo);
						if(createAttribute === true && attributeInfo["isInternal"] === true && typeof childerenClass["groupByThis"] !== 'undefined' && childerenClass["groupByThis"] == true) {
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
						let conditinClass = classesTable[linkTable[linkName]["subject"]];
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						let clink = addConditinClass(linkTable[linkName], linkTable[linkName]["object"], true, linkTable[linkName]["linkType"])
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["subject"];
						conditionLinks.push(clink);
	
					} else if(linkTable[linkName]["object"] == className){
						let conditinClass = classesTable[linkTable[linkName]["object"]];
						linkTable[linkName]["isVisited"] = true;
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						let clink = addConditinClass(linkTable[linkName], linkTable[linkName]["subject"], false, linkTable[linkName]["linkType"]);
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["object"];
						conditionLinks.push(clink);
			
					}	
				}

			} else if(linkTable[linkName]["object"] == className && linkTable[linkName]["isVisited"] == false && typeof classesTable[linkTable[linkName]["subject"]] !== "undefined" && classesTable[linkTable[linkName]["subject"]]["toBeDeleted"] !== true && classesTable[linkTable[linkName]["object"]]["toBeDeleted"] != true){

				linkTable[linkName]["isVisited"] = true;
				clazz["children"] = addChildren(clazz);
				let tempAddClass = addClass(classesTable[linkTable[linkName]["subject"]],linkTable[linkName], linkTable[linkName]["subject"],  linkTable[linkName]["linkIdentification"], linkTable[linkName]["graph"], linkTable[linkName]["graphInstruction"], true, classesTable, linkTable, whereTriplesVaribles, visitedClasses, conditionLinks, variableList)
				visitedClasses = tempAddClass["visitedClasses"];
				conditionLinks = tempAddClass["conditionLinks"];
				
				if(typeof visitedClasses[linkTable[linkName]["subject"]] === 'undefined' || visitedClasses[linkTable[linkName]["subject"]] != true){
					let childerenClass = tempAddClass["childrenClass"];
					
					clazz["children"].push(childerenClass);
					// childerenClass["isVisited"] = true;
					visitedClasses[linkTable[linkName]["subject"]] = true;
					
				}
				else {
					// condition links
					
					if(linkTable[linkName]["subject"] == className){
						linkTable[linkName]["isVisited"] = true;
						let conditinClass = classesTable[linkTable[linkName]["subject"]];
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						let clink = addConditinClass(linkTable[linkName], linkTable[linkName]["object"], true, linkTable[linkName]["linkType"])
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["subject"];
						conditionLinks.push(clink);
			
					} else if(linkTable[linkName]["object"] == className){
						let conditinClass = classesTable[linkTable[linkName]["object"]];
						linkTable[linkName]["isVisited"] = true;
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);

						let clink = addConditinClass(linkTable[linkName], linkTable[linkName]["subject"], false, linkTable[linkName]["linkType"]);

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
					// console.log("CL 1", className, linkTable[linkName]["isVisited"], linkTable[linkName])
						linkTable[linkName]["isVisited"] = true;
						let conditinClass = classesTable[linkTable[linkName]["subject"]];
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						let clink = addConditinClass(linkTable[linkName], linkTable[linkName]["object"], true, linkTable[linkName]["linkType"])
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["subject"];
						conditionLinks.push(clink);
			
				} else if(linkTable[linkName]["object"] == className){
					// console.log("CL 1", className)
						let conditinClass = classesTable[linkTable[linkName]["object"]];
						linkTable[linkName]["isVisited"] = true;
						conditinClass["conditionLinks"] = addConditionLinks(conditinClass);
						let clink = addConditinClass(linkTable[linkName], linkTable[linkName]["subject"], false, linkTable[linkName]["linkType"]);
						conditinClass["conditionLinks"].push(clink);
						clink.source = linkTable[linkName]["object"];
						conditionLinks.push(clink);
		
				}	
			}
		}
	}
	clazz.orderCounterDelayed = 10000;
	if(typeof clazz["fields"] !== "undefined"){
		for(let field = 0; field < clazz["fields"].length; field++){
			if(clazz["fields"][field].exp !== "(select this)"){
				if(clazz.orderCounterDelayed > clazz["fields"][field].orderCounter) clazz.orderCounterDelayed = clazz["fields"][field].orderCounter;
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
	childrenClass["graph"] = graph;
	childrenClass["graphLink"] = linkInformation["graphLink"];
	childrenClass["graphInstruction"] = graphInstruction;
	childrenClass["graphInstructionLink"] = linkInformation["graphInstructionLink"];
	childrenClass["serviceSchemaName"] = linkInformation["serviceSchemaName"];
	let generateClassCtructureTemp = generateClassCtructure(childrenClass, childrenClassName, classesTable, linkTable, whereTriplesVaribles, visitedClasses, conditionLinks, variableList);
	childrenClass = generateClassCtructureTemp.clazz;
	return {childrenClass:childrenClass, visitedClasses:visitedClasses, conditionLinks:conditionLinks};
}

function addConditinClass(linkInformation, targetClass, isInverse, isNot){
	var conditionLink = {};
	if(isNot == "NOT") isNot = true;
	else isNot = false;
	conditionLink["isInverse"] = isInverse;
	conditionLink["identification"] = linkInformation["linkIdentification"];
	conditionLink["isNot"] = isNot;
	conditionLink["target"] = targetClass;
	return conditionLink;
}

// Decide which class is a query start class
function getStartClass(classesTable, linkTable, nodeList) {
	
  // If class has aggregation inside and no incoming subquery links or if no aggregations in a query, use first class appeared.
  // collect classes with aggregations inside, from the main query 
  var classesWithAggregations = [];
  for(let clazz in classesTable){
	if(typeof classesTable[clazz] !== "function"){
		if(Object.keys(nodeList).length === 0 && (classesTable[clazz]["isUnit"] === true || classesTable[clazz]["isUnion"] === true)){
			return {startClass:{"name":clazz, "class":classesTable[clazz]}, classesTable:classesTable}
		}
		let underService = false;
		for(let link = 0; link< linkTable.length; link++){
			 if(typeof linkTable[link] !== "undefined"){
				 
				if((linkTable[link]["object"] == clazz || linkTable[link]["subject"] == clazz) && (typeof linkTable[link]["graphInstructionLink"] !== "undefined")){
					underService = true;
					break;
				}
			 }
		}
	
		if(underService === false && typeof classesTable[clazz]["fields"] !== "undefined" && typeof nodeList[classesTable[clazz]["variableName"]] !== "undefined"){
			for(let field = 0; field< classesTable[clazz]["fields"].length; field++){
				let f = classesTable[clazz]["fields"][field];
				if((typeof f["isInternal"] === "undefined" || f["isInternal"] == false) && f["exp"] != "(select this)") {return {startClass:{"name":clazz, "class":classesTable[clazz]}, classesTable:classesTable}}
			}
		}
		if(typeof classesTable[clazz]["aggregations"] !== 'undefined' && classesTable[clazz]["aggregations"] != null){
			var underSubQuery = false;
			for(let link = 0; link< linkTable.length; link++){
			 if(typeof linkTable[link] !== "undefined"){
				if((linkTable[link]["object"] == clazz || linkTable[link]["subject"] == clazz) && (linkTable[link]["isSubQuery"] == true || linkTable[link]["isGlobalSubQuery"] == true)){
					underSubQuery = true;
					break;
				}
			 }
			}
			if(underSubQuery == false) classesWithAggregations.push({"name":clazz, "class":classesTable[clazz]});
		}
	}
  }
  
  if(classesWithAggregations.length > 1){
	var mainClass = classesWithAggregations[0];
	/*for (i = 1; i < classesWithAggregations.length; i++) {
		var aggregations = classesWithAggregations[i]["class"]["aggregations"];
		console.log("IIIIIIIIIIIIIIIIIIIIIIIII", aggregations)
		for(let aggr = 0; aggr < aggregations.length; aggr++){
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
	}*/
	
	return {startClass:mainClass, classesTable:classesTable}
  }
  
  if(classesWithAggregations.length == 1){
	  
	let classUnderOptional = false;
	for(let link = 0; link< linkTable.length; link++){
	 if(typeof linkTable[link] !== "undefined"){
		if(linkTable[link]["linkType"] == "OPTIONAL" && linkTable[link]["object"] == classesWithAggregations[0]["name"]) {
			classUnderOptional = linkTable[link]["subject"];
			break;
		}
	 }
	}
	if(classUnderOptional != false){
	  for(let clazz in classesTable){ 
	   if(typeof classesTable[clazz] !== "function"){
		var aggregations = classesWithAggregations[0]["class"]["aggregations"];
		for(let aggr = 0; aggr < aggregations.length; aggr++){
			if(aggregations[aggr]["exp"].toLowerCase() == "count(.)"){
				// classesTable[mainClass["name"]]["aggregations"].push({exp:"count(" + classesWithAggregations[i]["name"] + ")", alias:aggregations[aggr]["alias"]});
				let cn = classesWithAggregations[0]["class"]["instanceAlias"];
				if(typeof cn === 'undefined' || cn == null) cn = classesWithAggregations[0]["class"]["identification"]["short_name"];
				classesTable[clazz] = addAggrigateToClass(classesTable[clazz], {exp:"count(" + cn + ")", alias:aggregations[aggr]["alias"]});
			} else if(aggregations[aggr]["exp"].toLowerCase() == "count_distinct(.)"){
				// classesTable[mainClass["name"]]["aggregations"].push({exp:"count(" + classesWithAggregations[i]["name"] + ")", alias:aggregations[aggr]["alias"]});
				let cn = classesWithAggregations[0]["class"]["instanceAlias"];
				if(typeof cn === 'undefined' || cn == null) cn = classesWithAggregations[0]["class"]["identification"]["short_name"];
				classesTable[clazz] = addAggrigateToClass(classesTable[clazz], {exp:"count_distinct(" + cn + ")", alias:aggregations[aggr]["alias"]});
			} else {
				// classesTable[mainClass["name"]]["aggregations"].push(aggregations[aggr]);
				classesTable[clazz] = addAggrigateToClass(classesTable[clazz], aggregations[aggr]);
			}
		}
		classesTable[classesWithAggregations[0]["name"]]["aggregations"] = null;
		return {startClass:{"name":clazz, "class":classesTable[clazz]}, classesTable:classesTable};
	   }
	  }
	}


	return {startClass:classesWithAggregations[0], classesTable:classesTable}
  }
  
  for(let clazz in classesTable){
	if(typeof classesTable[clazz] !== "function"){	 
		return {startClass:{"name":clazz, "class":classesTable[clazz]}, classesTable:classesTable};
	}
  }
  
			var sc = {
					"variableName":"[ ]",
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

async function getAllVariablesForAlias(expression, variableAliasTable, underUnion){
	for(let key in expression){
		if(typeof expression[key] === 'object'){
			if(expression[key]["type"] == "bgp"){		
				let triples = expression[key]["triples"];
				for(let triple = 0; triple < triples.length; triple++) {
					if(typeof triples[triple] !== "undefined"){
						if(triples[triple]["subject"]["termType"] == "Variable" && variableAliasTable[triples[triple]["subject"]["value"]] != false && underUnion !== true) {
							variableAliasTable[triples[triple]["subject"]["value"]] = true;
						} else if(triples[triple]["subject"]["termType"] == "Variable" && underUnion === true){
							variableAliasTable[triples[triple]["subject"]["value"]] = false;
						}
					}
				}
			} else {
				
				if(key != "variables" && key != "group"){
					if(expression[key]["termType"] == "Variable"){
						variableAliasTable[expression[key]["value"]] = false;
					}
					let underUnionTemp = underUnion;
					if(expression[key]["type"] === "union"){
						
						underUnionTemp = true;
					}
					let temp = await getAllVariablesForAlias(expression[key], variableAliasTable, underUnionTemp);
					for(let t in temp){
						if(typeof temp[t] !== "function"){
							variableAliasTable[t] = temp[t];
						}
					}
				} else if(key == "variables"){
					for(let variable = 0; variable < expression[key].length; variable++){
						if(typeof expression[key][variable]["expression"] !== "undefined" && typeof expression[key][variable]["expression"]["aggregation"] !== "undefined"){
							variableAliasTable[expression[key][variable]["expression"]["expression"]["value"]] = false;
						}
					}
					
				}
			}
		} 
	}
	return variableAliasTable;
}

async function getAllVariablesInQuery(expression, variableTable){
	for(let key in expression){
		if(typeof expression[key] === 'object'){	
			if(key == 'variables'){
				var variables = expression[key];
				starInSelect = false;
				
				for(let variable = 0; variable < variables.length; variable++){
					if(Object.keys(variables[variable]).length == 0) variableTable["*"] = 10;
					if(typeof variables[variable]["termType"] !== 'undefined'){
					  let params = {name: getVariable(variables[variable])["value"]};
					  if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
					  var resolved = await dataShapes.resolveClassByName(params);
					}
					//if(typeof variables[variable]["termType"] !== 'undefined' && await dataShapes.resolveClassByName({name: getVariable(variables[variable])["value"]}).complete == false){
					if(typeof variables[variable]["termType"] !== 'undefined'){
						variableTable[variables[variable]["value"]] = 0;
					} else if(typeof variables[variable]["variable"] !== 'undefined'){
						variableTable[variables[variable]["variable"]["value"]] = 1;
						let temp = await getAllVariablesInQuery(variables[variable]["expression"], variableTable);
						for(let t in temp){
							if(typeof temp[t] !== "function"){
								variableTable[t] = temp[t];
							}
						}
					} 
				}
			}
			
			else if(typeof expression[key]["termType"] !== 'undefined' && expression[key]["termType"] == "Variable"){
				
				if(typeof variableTable[expression[key]["value"]] !== 'undefined') {
					variableTable[expression[key]["value"]] = variableTable[expression[key]["value"]] + 1;
				} else {
					variableTable[expression[key]["value"]] = 0;
				}
			} else {
				let temp = await getAllVariablesInQuery(expression[key], variableTable);
				for(let t in temp){
					if(typeof temp[t] !== "function"){
						variableTable[t] = temp[t];
					}
				}
			}
		} 
	}
	return variableTable;
}

function getAllVariableCountInQuery(expression, variableTable){	
	for(let key in expression){
		
	  if(typeof expression[key] !== "function" && expression[key] != null){
		
		if(typeof expression[key] === 'object'  && key != "group" && typeof  expression[key]["termType"] === 'undefined'){
			if(key == 'variables'){
				var variables = expression[key];
				for(let variable = 0; variable < variables.length; variable++){
					// if(typeof variables[variable] === 'object'){
					if(typeof variables[variable]["termType"] === 'undefined'){
						
						let temp = getAllVariableCountInQuery(variables[variable], variableTable);
						for(let t in temp){
							if(typeof temp[t] !== "function"){
								variableTable[t] = temp[t];
							}
						}
					}
				}
			} else if(expression["type"] == 'values'){
				for(let value in expression[key]){
					if(typeof expression[key][value] !== "function"){
						for(let v in expression[key][value]){
							if(typeof expression[key][value][v] !== "function"){
								if(typeof variableTable[v.substring(1)] !== 'undefined') {
									variableTable[v.substring(1)] = variableTable[v.substring(1)] + 1;
								} else {
									variableTable[v.substring(1)] = 1;
								}
							}
						}
					}
				}
			} else if(expression["type"] == 'bind'){
				variableTable[expression["variable"]["value"]] = 10;
				let temp = getAllVariableCountInQuery(expression[key], variableTable);
				for(let t in temp){
					if(typeof temp[t] !== "function"){
						variableTable[t] = temp[t];
					}
				}
			} else {
				let temp = getAllVariableCountInQuery(expression[key], variableTable);
				for(let t in temp){
					if(typeof temp[t] !== "function"){
						variableTable[t] = temp[t];
					}
				}
			}
		} else if(key == "group"){
			for(let v = 0; v < expression[key].length; v++){
				if(typeof variableTable[expression[key][v]["expression"]["value"]] !== 'undefined') {
						variableTable[expression[key][v]["expression"]["value"]] = variableTable[expression[key][v]["expression"]["value"]] + 1;
					} else {
						variableTable[expression[key][v]["expression"]["value"]] = 1;
					}
				
			}
		} else if(key == 'variable' && typeof expression[key]["termType"] !== "undefined" && expression[key]["termType"] == "Variable"){
			variableTable[expression["variable"]["value"]] = 10;
		} else if(key == 'expression' && typeof expression["termType"] !== "undefined" && expression["termType"] == "Variable"){
				if(expression[key]["value"].endsWith("Label")) variableTable[expression[key]["value"].substring(0, expression[key]["value"].length-5)] = 10;
				else if(expression[key]["value"].endsWith("AltLabel")) variableTable[expression[key]["value"].substring(0, expression[key]["value"].length-8)] = 10;
				else if(expression[key]["value"].endsWith("Description")) variableTable[expression[key]["value"].substring(0, expression[key]["value"].length-11)] = 10;
				else {
					if(typeof variableTable[expression[key]["value"]] !== 'undefined') {
						variableTable[expression[key]["value"]] = variableTable[expression[key]["value"]] + 1;
					} else {
						variableTable[expression[key]["value"]] = 1;
					}
				}
		// } else if(typeof expression[key] === 'string' && expression[key].startsWith("?")) {
		} else if(typeof expression[key]["termType"] !== 'undefined' && expression[key]["termType"] == "Variable") {
			if(typeof variableTable[expression[key]["value"]] !== 'undefined') {
				variableTable[expression[key]["value"]] = variableTable[expression[key]["value"]] + 1;
			} else {
				variableTable[expression[key]["value"]] = 1;
			}
		} 
	  }
	}
	return variableTable;
}

function transformParsedQuery(expression, tableCounter){
	if(typeof expression === 'object'){
		if(Object.keys(expression).length > 0)expression["tableCounter"] = tableCounter;
		tableCounter++;
		for(let key in expression){
		  if(typeof expression[key] !== 'function'){
			if(key == "patterns"){			
				for(let pattern = 0; pattern < expression[key].length; pattern++){
					if(expression[key][pattern]["type"] == "bgp"){		
						var blankNodes = [];
						let triples = expression[key][pattern]["triples"];
						if(triples.length > 1){
							for(let triple = 0; triple < triples.length; triple++) {
							  if(typeof triples[triple] !== "undefined"){
								if(triples[triple]["subject"]["termType"] === "BlankNode" || triples[triple]["object"]["termType"] === "BlankNode"){
									blankNodes.push(triples[triple]);
									delete triples[triple];
								}
							  }
							}
							if(triples.length == 0 || triples.length == blankNodes.length) expression[key][pattern] = {type:"blankNode", blankNode:blankNodes};
							else if(blankNodes.length > 0)expression[key].push({type:"blankNode", blankNode:blankNodes})
						}
					}
				}
			}
			let tempTransformParsedQuery = transformParsedQuery(expression[key],tableCounter);
			expression[key] = tempTransformParsedQuery.expression;
			tableCounter = tempTransformParsedQuery.tableCounter;
		  }
		}
	}
	return {expression:expression, tableCounter:tableCounter};
}

function checkIfOrAndInFilter(expression, value){
	if(expression["type"] == 'operation' && (expression["operator"] == "||" || expression["operator"] == "&&")){
		value = true;
	}
	for(let key in expression){
		if(typeof expression[key] === 'object'){
			let temp = checkIfOrAndInFilter(expression[key], value);
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
async function visualizeQuery(clazz, variableListAlias, parentClass, parentClassOrderCounter, variableList, queryId, queryQuestion, usedPrefixesinQuery, starInSelectQuery){
	
	//used prefixes
	if(usedPrefixesinQuery && Object.keys(usedPrefixesinQuery).length > 0){
		
		 var diagramId = Session.get("activeDiagram");
		 var active_diagram_type_id = Diagrams.findOne({_id:Session.get("activeDiagram")})["diagramTypeId"];
	 
		let elem_type = ElementTypes.findOne({name:"Declaration", diagramTypeId:active_diagram_type_id});
		var elems_in_diagram_ids = Elements.find({diagramId:diagramId, type:"Box", elementTypeId:elem_type._id })
		
		.map(function(e) {
		  return e["_id"]
		});
			
		 if(elems_in_diagram_ids.length > 0){
			  let cl = new VQ_Element(elems_in_diagram_ids[0]);
			  let prefixDeclarations = cl.getPrefixDeclarations();
			  for(let p in usedPrefixesinQuery){
				  if(typeof usedPrefixesinQuery[p] !== "function"){	  
					let addPrefix = false;
					let pDeclaration = usedPrefixesinQuery[p];
					let prefixName = p;
					if(prefixName.endsWith(":")) prefixName = prefixName.substring(0, prefixName.length - 1)
					if(pDeclaration.startsWith("<") && pDeclaration.endsWith(">")) pDeclaration = pDeclaration.substring(1,  pDeclaration.length - 1);
					let createPrefix = false;
					for(let key = 0; key < prefixDeclarations.length; key++){
					  if(prefixDeclarations[key]["prefix"] === prefixName && prefixDeclarations[key]["namespace"] === pDeclaration){
						  createPrefix = true;
						  break;
					  }
					}
					if(createPrefix === false) cl.addPrefixDeclarations(prefixName, pDeclaration);
				  }
			  }
		 } else {
			let xTemp = x+300;
			let newPosition = { xTemp, y, width, height };
			Create_VQ_Element_Declaration(function(cl){
				for(let p in usedPrefixesinQuery){
				  if(typeof usedPrefixesinQuery[p] !== "function"){
					let addPrefix = false;
					let pDeclaration = usedPrefixesinQuery[p];
					let prefixName = p;
					if(prefixName.endsWith(":")) prefixName = prefixName.substring(0, prefixName.length - 1)
					if(pDeclaration.startsWith("<") && pDeclaration.endsWith(">")) pDeclaration = pDeclaration.substring(1,  pDeclaration.length - 1);
					cl.addPrefixDeclarations(prefixName, pDeclaration);
					
				  }
			  }
				VQ_Elements[cl.obj._id] = cl.obj._id;
		   }, newPosition);
		 }
	}
	
	//node type
	let nodeType = parentClass ? "condition" : "query";
	if(parentClass == null) nodeType = "query";

	//instanceAlias
	let instanceAlias = clazz["instanceAlias"];
	
	if(instanceAlias != null && instanceAlias.startsWith("g_")) instanceAlias = null;	
	if(instanceAlias != null && instanceAlias.trim() != ""){	
		let proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			//uri
			if(isURI(instanceAlias) == 3 || isURI(instanceAlias) == 4) {
				if(proj.decorateInstancePositionConstants == true) instanceAlias = "=" + instanceAlias;
			}
			// number
			else if(!isNaN(instanceAlias)) {
				if(proj.decorateInstancePositionConstants == true) instanceAlias = "=" + instanceAlias;
			}
			// string in quotes
			else if(instanceAlias.startsWith("'") && instanceAlias.endsWith("'") || instanceAlias.startsWith('"') && instanceAlias.endsWith('"')) {
				if(proj.decorateInstancePositionConstants == true) instanceAlias = "=" + instanceAlias;
			}
			//display label
			else if(instanceAlias.startsWith('[') && instanceAlias.endsWith(']')) {
				if(proj.decorateInstancePositionConstants == true) instanceAlias = "=" + instanceAlias;
			}
			//string
			else if(instanceAlias.match(/^[0-9a-z_]+$/i)) {
				if(proj.decorateInstancePositionVariable == true) instanceAlias = "?" + instanceAlias;
			}
			else Interpreter.showErrorMsg("Instance identification '" + instanceAlias + "' can not be interpreted as an identifier (variable) or a constant (URI, number, string)", -3);
		}
	}
	
	//name
	let className = "";
	if(clazz.identification) className = clazz.identification.short_name;


	if(clazz["isVariable"] == true) {
		className = clazz["variableName"]; //false
	}

	if(clazz["isUnit"] == true) {
		className = "[ ]"; //false
	}

	if(clazz["isUnion"] == true) {
		className = "[ + ]"; //fasle
	}

	var newPosition = { x, y, width, height };
	if(parentClass){
		var d = 30; //distance between boxes
		var oldPosition = parentClass.getCoordinates(); //Old class coordinates and size
																				  
	}
	
	const classBox = await async_Create_VQ_Element(newPosition);

	var indirectClassMembership = false;
	if(typeof clazz["indirectClassMembership"] !== "undefined" && clazz["indirectClassMembership"] == true) indirectClassMembership = true;
		
	if(className != null && className != "") classBox.setNameAndIndirectClassMembership(className, indirectClassMembership);
	classBox.setClassStyle(nodeType);
		
	// if(typeof clazz["groupByThis"] !== 'undefined' && typeof clazz.aggregations !== "undefined"){
		// if(instanceAlias != null) classBox.setCompartmentValue("Instance", instanceAlias, "{group} " + instanceAlias , false);
		// else  classBox.setCompartmentValue("Instance", "", "{group} ", false);
	// } else

	if(instanceAlias != null ) {
		// console.log("parentClass", parentClass, variableListAlias);
		// if(typeof variableListAlias[clazz["instanceAlias"]] !== "undefined" && variableListAlias[clazz["instanceAlias"]] == true && className != "") {}
		// else 
			classBox.setInstanceAlias(instanceAlias);
	}

	// setIndirectClassMembership
	//class not in a schema 
	if(clazz["identification"] != null && typeof clazz["identification"]["notInSchema"] !== 'undefined' && clazz["identification"]["notInSchema"] != "variable"){
		if((queryId != null && queryId != "") || (queryQuestion != null && queryQuestion != "")){
		let comment = "";
		// let comment = "Class not in the data schema;\n";
		if(queryId != null && queryId != "") comment = comment + "ID = " + queryId;
		if(queryQuestion != null && queryQuestion != "") comment = comment + ",\nQuestion = " + queryQuestion;
		classBox.setComment(comment);
		} //else classBox.setComment("Class not in the data schema");
	} else if((queryId != null && queryId != "") || (queryQuestion != null && queryQuestion != "")){
		let comment = "";
		if(queryId != null && queryId != "") comment = "ID = " + queryId;
		if(queryQuestion != null && queryQuestion != "") comment = comment + ",\nQuestion = " + queryQuestion;
		classBox.setComment(comment);
	}

	//attributes	
	if (clazz.fields) {
      clazz.fields = clazz.fields.sort((a, b) =>  a.orderCounter - b.orderCounter);
 
      for (const field of clazz.fields) {
        let alias = field["alias"];		
		let proj = Projects.findOne({_id: Session.get("activeProject")});
	
		if(((proj && proj.keepVariableNames == false) || typeof proj.keepVariableNames === "undefined") 
				&& typeof alias !== "undefined" 
				&& typeof variableList[field["alias"]] !== "undefined" 
				&& variableList[field["alias"]] <=1 
				&& typeof variableList[field["alias"]+"Label"] === "undefined" 
				&& typeof variableList[field["alias"]+"AltLabel"] === "undefined" 
				&& typeof variableList[field["alias"]+"Description"] === "undefined" 
				&& !field["exp"].startsWith("?")
		){
			alias = "";
		}
		if(alias == field["exp"]){
			alias = "";
		}

		let { exp, requireValues, isInternal, groupValues, addLabel, addAltLabel, addDescription, graph, graphInstruction } = field;
		let condition = field.attributeConditionSelection;
		let attributeCondition = field.attributeCondition;
		
		if(starInSelectQuery === true) isInternal = false;
        classBox.addField(exp,alias,requireValues,groupValues,isInternal,addLabel,addAltLabel,addDescription,null, null,condition,attributeCondition);
      }
    }

	//aggregations
	// remove duplicates
	if(clazz != null && clazz["aggregations"] != null && typeof clazz["aggregations"] !== "undefined"){
		clazz["aggregations"] = clazz["aggregations"].filter((value, index, self) =>
		  index === self.findIndex((t) => (
		t.alias === value.alias && t.exp === value.exp
		  ))
		)
	}
	
	if (clazz.aggregations) {
      for (const field of clazz.aggregations) {	
		let alias = field["alias"];
			var expression = field["exp"];
			let requireValues = false;
			if(typeof field["requireValues"] !== "undefined")requireValues = field["requireValues"] 
			//add aggregation to class
			classBox.addAggregateField(expression, alias, requireValues);
      }
    }

	//conditions
	clazz["conditions"] = removeDuplicateConditions(clazz["conditions"]);
	
	if (clazz.conditions) {
      for (const condition of clazz.conditions) {	
		//add condition to class
		let conditionName = condition;
		let allowMul = false;
		if(conditionName.startsWith("* ")){
			allowMul = true;
			conditionName = conditionName.substring(2);
		}
		if(typeof condition !== "undefined" && condition != null && condition != "")classBox.addCondition(conditionName, allowMul);
      }
    }
	
	//orderBy
	if (clazz.orderings) {
      for (const order of clazz.orderings) {	
		const { exp, isDescending } = order;
		//add order to class
		classBox.addOrdering(exp, isDescending);
      }
    }
		
	//from
	if (clazz.graphs) {
      for (const gr of clazz.graphs) {	
		const { graph, graphInstruction } = gr;
		classBox.addGraphsServices(graph, graphInstruction);
      }
    }
	//graphs
	if (clazz.graph && clazz.graphInstruction) {
		classBox.addGraphsServices(clazz.graph, clazz.graphInstruction, clazz.serviceSchemaName);
    }
	
		
	// if(typeof clazz["groupByThis"] !== 'undefined') classBox.setGroupByThis(clazz["groupByThis"]);
		
	//groupBy	
	if(typeof clazz.groupings !== "undefined"){
		for (const group of clazz.groupings) {	
			const expression = group["exp"];
			//add group to class
			classBox.addGrouping(group);
		}
	}
	//distinct
	let distinct = clazz["distinct"];

	if(typeof distinct !== "undefined" && (typeof clazz["aggregations"] === "undefined" || clazz["aggregations"] == null || clazz["aggregations"].length == 0))classBox.setDistinct(distinct);
	
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
	if(offset != 0) classBox.setOffset(offset);

	//full SPARQL
	var fullSPARQL = clazz["fullSPARQL"];

	classBox.setFullSPARQL(fullSPARQL);
		
	//link
	if(parentClass){
		let linkName = "++";
		if(typeof clazz.linkIdentification !== 'undefined') linkName = clazz.linkIdentification.short_name;
		// REQUIRED, NOT, OPTIONAL
		let linkType  = clazz.linkType;

		// PLAIN, SUBQUERY, GLOBAL_SUBQUERY, CONDITION
		var linkQueryType = "PLAIN";
			
		let isSubQuery = clazz["isSubQuery"];
		if(isSubQuery == true) linkQueryType = "SUBQUERY";
		let isGlobalSubQuery = clazz["isGlobalSubQuery"];
		if(isGlobalSubQuery == true) linkQueryType = "GLOBAL_SUBQUERY";

		var isInverse = clazz["isInverse"];
		var graph = clazz["graphLink"];
		var graphInstruction = clazz["graphInstructionLink"];
		var serviceSchemaName = clazz["serviceSchemaName"];
	
        //Link Coordinates
        // var coordX = newPosition.x + Math.round(newPosition.width/2);
        var coordX = newPosition.x + 10;
		var coordY = oldPosition.y + oldPosition.height;
		var locLink = [];

		if (!isInverse){
			locLink = [coordX, coordY, coordX, newPosition.y]; 
			let linkLine = await async_Create_VQ_Element(locLink, true, parentClass, classBox);
			linkLine.setName(linkName);
			linkLine.setLinkType(linkType);
			linkLine.setNestingType(linkQueryType);
			if(typeof graph !== "undefined" && typeof graphInstruction !== "undefined" && graph != null && graphInstruction != null && graph != "" && graphInstruction != ""){
				// linkLine.setGraph(graph, "{" + graphInstruction + ": " + graph + "}");
				// linkLine.setGraphInstruction(graphInstruction);
				linkLine.addGraphsServices(graph, graphInstruction, serviceSchemaName);
			}
			if((isSubQuery === true || isGlobalSubQuery === true || linkType === "OPTIONAL" || linkType === "NOT" || typeof graph !== "undefined") && parentClassOrderCounter<clazz.linkIdentification.orderCounter){
				linkLine.setIsDelayedLink(true);
			} else if(linkQueryType === "PLAIN" && linkType === "REQUIRED" && typeof graph === "undefined" && parentClassOrderCounter<clazz.orderCounterDelayed) clazz.orderCounterDelayed = parentClassOrderCounter;
			

			link_count = link_count + 1;
			VQ_Links[linkLine.obj._id] = linkLine.obj._id;
		} else {
			locLink = [coordX, newPosition.y, coordX, coordY];
			let linkLine = await async_Create_VQ_Element(locLink, true, classBox, parentClass);
			linkLine.setName(linkName);
			linkLine.setLinkType(linkType);
			linkLine.setNestingType(linkQueryType);
			if(typeof graph !== "undefined" && typeof graphInstruction !== "undefined" && graph != null && graphInstruction != null && graph != "" && graphInstruction != ""){
				// linkLine.setGraph(graph, "{" + graphInstruction + ": " + graph + "}");
				// linkLine.setGraphInstruction(graphInstruction);
				linkLine.addGraphsServices(graph, graphInstruction, serviceSchemaName);
			}
			if((isSubQuery === true || isGlobalSubQuery === true || linkType === "OPTIONAL" || linkType === "NOT" || typeof graph !== "undefined") && parentClassOrderCounter<clazz.linkIdentification.orderCounter){
				linkLine.setIsDelayedLink(true);
			} else if(linkQueryType === "PLAIN" && linkType === "REQUIRED" && typeof graph === "undefined" && parentClassOrderCounter<clazz.orderCounterDelayed) clazz.orderCounterDelayed = parentClassOrderCounter;
			
			link_count = link_count + 1;
			VQ_Links[linkLine.obj._id] = linkLine.obj._id;
		}
	}
	//subClasses
	if (clazz.children) {
		for (const subclazz of clazz.children) {
			y = y + 100;
			if(subclazz.isSubQuery === true || subclazz.isGlobalSubQuery === true || subclazz.linkType === "NOT") starInSelectQuery = false;
			// vizualizējām klases apakšklases
			await visualizeQuery(subclazz, variableListAlias, classBox, clazz.orderCounterDelayed, variableList, null, null, null, starInSelectQuery);		 
		}
	}
	VQ_Elements[clazz.c_id] = classBox.obj._id;
}

async function generateInstanceAlias(uri, resolve){
	if(uri.indexOf(":/") != -1 && resolve != false && splitURI(uri).name != ""){
		var uriResolved;
		
		if(schemaName == "wikidata") {
			let uriResolvedTemp = await dataShapes.getTreeIndividualsWD(uri);
			uriResolved = {"data": uriResolvedTemp};
			if(uriResolvedTemp.length > 0) uriResolved.complete = true; 
		}else {
			let params = {name: uri};
			if(schemaName !== dataShapes.schema.schema) params.schema = schemaName;
			uriResolved = await dataShapes.resolveIndividualByName(params);
		}
		// console.log("uriResolved", uri, uriResolved)
		if(uriResolved.complete == true && uriResolved.data[0].localName != ""){
			uri = uriResolved.data[0].localName;
			
			if(schemaName == "wikidata" && uri.startsWith("wd:[")){
				uri = uri.substring(3);
			}	
			
		} else {
			let splittedUri = splitURI(uri);
			if(splittedUri == null) return uri;
			
			let prefixes = await dataShapes.getNamespaces();
			prefixes = combineKnownPrefixesWithDefinedPrefixes(prefixes);
	
			for(let key = 0; key < prefixes.length; key++){
				if(prefixes[key]["value"] == splittedUri.namespace) {
					if(prefixes[key]["name"].slice(-1) == ":") return prefixes[key]["name"]+splittedUri.name;
					usedPrefixes[prefixes[key]["name"]] = prefixes[key]["value"];
					return prefixes[key]["name"]+":"+splittedUri.name;
				}
			}
			
			usedPrefixes["n_"+counter] = splittedUri.namespace;
			let	newShortName = "n_"+counter + ":"+splittedUri.name
			counter++;
			return newShortName;
			
			return "<" + uri + ">";
		}
	}else {
		let splittedUri = splitURI(uri);
		if(splittedUri == null) {
			return uri;
		}
		
		let prefixes = await dataShapes.getNamespaces();
		prefixes = combineKnownPrefixesWithDefinedPrefixes(prefixes);

		for(let key = 0; key < prefixes.length; key++){
			if(prefixes[key]["value"] == splittedUri.namespace) {
				if(prefixes[key]["name"].slice(-1) == ":") return prefixes[key]["name"]+splittedUri.name;
				usedPrefixes[prefixes[key]["name"]] = prefixes[key]["value"];
				return prefixes[key]["name"]+":"+splittedUri.name;
			}
		}
	}

	return uri;
}

function splitURI(uri){
	if(uri.lastIndexOf(":") != -1 && uri.lastIndexOf("/") < uri.lastIndexOf(":") && uri.lastIndexOf("#") < uri.lastIndexOf(":")){
		return {namespace:uri.substring(0, uri.lastIndexOf(":")+1), name:uri.substring(uri.lastIndexOf(":")+1)}
	} else 
	if(uri.lastIndexOf("#") != -1){
		return {namespace:uri.substring(0, uri.lastIndexOf("#")+1), name:uri.substring(uri.lastIndexOf("#")+1)}
	} else if (uri.lastIndexOf("/") != -1){
		return {namespace:uri.substring(0, uri.lastIndexOf("/")+1), name:uri.substring(uri.lastIndexOf("/")+1)}
	}
	return null;
}

function removeDuplicateLinks(linkTable){
	var newLinkTable = [];
	for(let link = 0; link< linkTable.length; link++){
	 if(typeof linkTable[link] !== "undefined"){
		var linkExists = false;
		for(let newLink = 0; newLink< newLinkTable.length; newLink++){
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
	}
	return newLinkTable;
}

function removeParrentQueryClasses(parentNodeList, classesTable, classTableTemp, linkTableTemp, attributeTable){
	var unionClassTable = [];
	for(let clazz in classesTable){
		if(typeof classesTable[clazz] !== "function"){
			if(typeof classTableTemp[clazz] === 'undefined') unionClassTable[clazz] = classesTable[clazz];
			else if(typeof parentNodeList[classTableTemp[clazz]["variableName"]] !== 'undefined'){
				var classWithAttribute = false;
				
				for(let attribute in attributeTable){
					if(typeof attributeTable[attribute] !== "function"){
						if(attributeTable[attribute]["class"] == clazz) {
							classWithAttribute = true;
							break;
						}
					}
				} 
				
				if(classWithAttribute == true) unionClassTable[clazz] = classesTable[clazz];
			} else unionClassTable[clazz] = classesTable[clazz];
		}
	}

	return unionClassTable
}

function relinkUnionLink(classesTable, linkTable, unionClass){
	
	var relinkt = false;
	for(let link = 0; link< linkTable.length; link++){
	 if(typeof linkTable[link] !== "undefined"){
		if(linkTable[link]["subject"] != unionClass && linkTable[link]["object"] != unionClass && typeof classesTable[linkTable[link]["object"]] === "undefined"){
			
			linkTable[link]["object"] = unionClass;
			relinkt = true;
		} else if(linkTable[link]["object"] != unionClass && linkTable[link]["subject"] != unionClass &&  typeof classesTable[linkTable[link]["subject"]] === "undefined"){
			
			linkTable[link]["subject"] = unionClass;
			relinkt = true;
		}
	 }
	}
	
	return {linkTable:linkTable, relinkt:relinkt}
}

function checkIfClassHasAttributes(clazz, attributeTable){

	for(let attribute in attributeTable){
		if(attributeTable[attribute]["class"] == clazz) return true;
	}
	
	return false;
}

function removeClass(classesTable, clazz){
	var classT = [];
	for(let c in classesTable){
		if(typeof classesTable[c] !== "function"){
			if(c != clazz) classT[c] = classesTable[c];
		}
	}
	return classT;
}

async function generatePlainNegationUnion(unionBlock, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, linkTableAdded, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression, allClassesUnderUnion, allNodesUnderUnion, unionClass){
	var linkT = [];
	var classT = [];
				let args = unionBlock["expression"]["args"];
				for(let arg = 0; arg < args.length; arg++){
					if(args[arg]["type"] == "group"){
						let classTableTemp = [];
						let linkTableTemp = [];
						// calculate nodelist for union block
						let nodeLitsTemp = [];
						let collectNodeListTemp  = await collectNodeList(args[arg]["patterns"]);
						let temp = collectNodeListTemp["nodeList"];
						// var plainVariables = getWhereTriplesPlainVaribles(args[arg]["patterns"]);
						for(let node in temp){
							if(typeof temp[node] !== "function"){
								nodeLitsTemp[node] = concatNodeListInstance(nodeLitsTemp, node, temp[node]);
								allNodesUnderUnion[node] = concatNodeListInstance(allNodesUnderUnion, node, temp[node]);
							}
						}	
						
						// for all patterns
						// first bqp then the rest
						for(let p = 0; p < args[arg]["patterns"].length; p++){
							let pattern = args[arg]["patterns"][p];
							if(typeof pattern["type"] !== "undefined" && pattern["type"] == "bgp"){
								let temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
									if(typeof temp["classTableAdded"][clazz] !== "function"){
										classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
										classT[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
										allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
									}
								}
								attributeTable = temp["attributeTable"];
								linkTable = temp["linkTable"];
								filterTable = temp["filterTable"];
								linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
								linkT = linkT.concat(temp["linkTableAdded"]);
							}
						}
						
						for(let p = 0; p < args[arg]["patterns"].length; p++){
							let pattern = args[arg]["patterns"][p];
							if(typeof pattern["type"] === "undefined" || (typeof pattern["type"] !== "undefined" && pattern["type"] !== "bgp")){
								let temp = await parseSPARQLjsStructureWhere(pattern, nodeLitsTemp, nodeList, classesTable, filterTable, attributeTable, linkTable, selectVariables, bgptype, allClasses, variableList, patternType, bindTable, generateOnlyExpression);
								classesTable = temp["classesTable"];
								for(let clazz = 0; clazz < temp["classTableAdded"].length; clazz++){
									if(typeof temp["classTableAdded"][clazz] !== "function"){
										classTableTemp[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
										classT[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
										allClassesUnderUnion[temp["classTableAdded"][clazz]] = temp["classesTable"][temp["classTableAdded"][clazz]];
									}
								}
								attributeTable = temp["attributeTable"];
								linkTable = temp["linkTable"];
								filterTable = temp["filterTable"];
								linkTableTemp = linkTableTemp.concat(temp["linkTableAdded"]);
								linkT = linkT.concat(temp["linkTableAdded"]);
							}
						}
						
						// find class from union block to connect to [+] class
						let object = findClassToConnect(classTableTemp, linkTableTemp, null, "object");

						if(object == null){
							for(let subClass in classTableTemp){
								if(typeof classTableTemp[subClass] !== "function"){
									object = subClass;
									break;
								}
							}
						}
						
						let linktype = "NOT";
						// connect founded class to [+] class with ++ link
						let link = {
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
	
	for(let key in where){
		if(typeof where[key]["type"] !== "function"){
			if(typeof where[key]["type"] !== "undefined" && where[key]["type"] == "bgp"){	
				let triples = where[key]["triples"];
				for(let triple = 0; triple < triples.length; triple++) {
				  if(typeof triples[triple] !== "undefined"){
					let subject = getVariable(triples[triple]["subject"]);
					let object = getVariable(triples[triple]["object"]);
					if(subject["type"] == "varName"){
						if(typeof variableList[subject["value"]] === "undefined") variableList[subject["value"]] = 1;
						else variableList[subject["value"]] = variableList[subject["value"]] + 1;
					}
					if(object["type"] == "varName"){
						if(typeof variableList[object["value"]] === "undefined") variableList[object["value"]] = 1;
						else variableList[object["value"]] = variableList[object["value"]] + 1;
					}
				  }
				}
			}else if(typeof where[key] === 'object'){
				let temp = getWhereTriplesVaribles(where[key]);
				for(let variable in temp){
					if(typeof variable[temp] !== "function"){
						if(typeof variableList[variable] === "undefined") variableList[variable] = temp[variable];
						else variableList[variable] = variableList[variable] + temp[variable];
					}
				}
			}
		}
	}
	
	return variableList;
}

function removeDuplicateConditions(conditions){
	var c = [];
	for(let con in conditions){
		if(typeof conditions[con] !== "function"){
			c[conditions[con]] = conditions[con];
		}
	}
	var cc = [];
	for(let con in c){
		if(typeof c[con] !== "function"){
			cc.push(c[con])
		}
	}
	return cc
}			

function transformSelectVariables(variables, withVar){
	var selectVariables = [];
	if(typeof variables !== "undefined"){
		for(let variable = 0; variable < variables.length; variable++){
			if(Object.keys(variables[variable]).length == 0){
				selectVariables.push("*");
			}
			 else if(typeof variables[variable]["value"] !== "undefined") {
				if(withVar != null) selectVariables.push(variables[variable]["value"]);
				else selectVariables.push(variables[variable]["value"]);
			} else {
				selectVariables.push(variables[variable]);
			}
		}
	}
	
	return selectVariables;
}

function getVariable(variable){
	if(typeof variable !== "undefined" && typeof variable.termType !== "undefined"){
		if(variable.termType == "Variable"){
			return {value:variable.value, type:"varName"}
		}
		if(variable.termType == "NamedNode"){
			return {value:variable.value, type:"iri"}
		}
		if(variable.termType == "BlankNode"){
			return {value:variable.value, type:"varName", isBlankNode:"true"}
		}
		if(variable.termType == "Literal"){

			if(typeof variable.datatype !== "undefined"){
				if(variable.datatype.termType == "NamedNode" && variable.datatype.value === "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString" && variable.language !== ""){
					return {value:'"'+variable.value+ '"@'+variable.language, type:"RDFLiteral"}
				}
				if(variable.datatype.termType == "NamedNode" && variable.datatype.value === "http://www.w3.org/2001/XMLSchema#date"){
					return {value:'"'+variable.value+ '"^^xsd:date', type:"RDFLiteral"}
				}
				if(variable.datatype.termType == "NamedNode" && variable.datatype.value === "http://www.w3.org/2001/XMLSchema#dateTime"){
					return {value:'"'+variable.value+ '"^^xsd:dateTime', type:"RDFLiteral"}
				}
				var IntegerIRI = ["http://www.w3.org/2001/XMLSchema#integer", "http://www.w3.org/2001/XMLSchema#double", "http://www.w3.org/2001/XMLSchema#decimal"];
				if(variable.datatype.termType == "NamedNode" && IntegerIRI.indexOf(variable.datatype.value) !== -1){
					return {value:variable.value, type:"number"}
				}
				if(variable.datatype.termType == "NamedNode" && variable.datatype.value === "http://www.w3.org/2001/XMLSchema#boolean"){
					return {value:variable.value, type:"boolean"}
				}
				if(variable.datatype.termType == "NamedNode" && variable.datatype.value === "http://www.w3.org/2001/XMLSchema#string"){
					return {value:'"'+variable.value+ '"', type:"string"}
				}
				if(variable.datatype.termType == "NamedNode"){
					var iri = variable.datatype.value;
					if(iri.startsWith("http://www.w3.org/1999/02/22-rdf-syntax-ns#")) iri = "rdf:" + iri.substring(43);
					else if(iri.startsWith("http://www.w3.org/2001/XMLSchema#")) iri =  "xsd:" + iri.substring(33);
					else iri = "<"+iri+">";
					return {value:'"'+variable.value+ '"^^'+iri, type:"RDFLiteral"}
				}
				
			}
			
		}
		return vq_visual_grammar_parser.parse(variable.value)
	}
	// return vq_visual_grammar.parse(variable)
	return {value:variable, type:"varName"}
}


function combineKnownPrefixesWithDefinedPrefixes(knownPrefixes){
	let declaredPrefixes = getDeclarations();
	let prefixDeclarations = declaredPrefixes.prefixes;
	for(let pr in prefixDeclarations){
		if(typeof prefixDeclarations[pr] !== "function"){
			let prefixExists = false;
			for(let kpr = 0; kpr < knownPrefixes.length; kpr++){
				if(knownPrefixes[kpr]["name"] === pr && knownPrefixes[kpr]["value"] !== prefixDeclarations[pr]){
					prefixExists = true;
					break;
				} else if(knownPrefixes[kpr]["name"] === pr && knownPrefixes[kpr]["value"] === prefixDeclarations[pr]){
					prefixExists = true;
					break;
				}
			}
			if(prefixExists === false){
				knownPrefixes.push({
					is_local: false,
					name: pr,
					value: prefixDeclarations[pr]
				})
			}
		}
	}
	for(let pr in allPrefixes){
		if(typeof allPrefixes[pr] !== "function"){
			let prefixExists = false;
			for(let kpr = 0; kpr < knownPrefixes.length; kpr++){
				if(knownPrefixes[kpr]["name"] === pr && knownPrefixes[kpr]["value"] !== allPrefixes[pr]){
					prefixExists = true;
					break;
				} else if(knownPrefixes[kpr]["name"] === pr && knownPrefixes[kpr]["value"] === allPrefixes[pr]){
					prefixExists = true;
					break;
				}
			}
			if(prefixExists === false){
				knownPrefixes.push({
					is_local: false,
					name: pr,
					value: allPrefixes[pr]
				})
			}
		}
	}
	for(let pr in usedPrefixes){
		if(typeof usedPrefixes[pr] !== "function"){
			let prefixExists = false;
			for(let kpr = 0; kpr < knownPrefixes.length; kpr++){
				if(knownPrefixes[kpr]["name"] === pr && knownPrefixes[kpr]["value"] !== usedPrefixes[pr]){
					prefixExists = true;
					break;
				} else if(knownPrefixes[kpr]["name"] === pr && knownPrefixes[kpr]["value"] === usedPrefixes[pr]){
					prefixExists = true;
					break;
				}
			}
			if(prefixExists === false){
				knownPrefixes.push({
					is_local: false,
					name: pr,
					value: usedPrefixes[pr]
				})
			}
		}
	}
	return knownPrefixes;
}
