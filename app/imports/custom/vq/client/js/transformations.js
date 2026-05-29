import { Template } from 'meteor/templating';
import { Interpreter } from '../../../../client/lib/interpreter.js'
import { Utilities } from '../../../../platform/client/js/utilities/utils.js'
import { Tools, Projects, Elements, Compartments, ElementTypes, CompartmentTypes  } from '../../../../db/platform/collections.js'
import { Dialog } from '../../../../platform/client/js/interpretator/Dialog.js'
import { genAbstractQueryForElementList, resolveTypesAndBuildSymbolTable } from './genAbstractQuery.js'
import { getPathFullGrammarChangeDirection } from './parser.js';
import { Create_VQ_Element_Async, VQ_Element, createVQ_Element } from './VQ_Element.js'
import * as vq_property_path_grammar_parser from './vq_property_path_grammar_parser.js'
import { dataShapes } from './DataShapes.js'

Interpreter.customMethods({
	changeProject: async function(projId){
		console.log("$$$$$$$$$$$$$ transformations  $$$$$$$$$$$$$$ - changeProject", Session.get("activeProject"), projId)
		await dataShapes.changeActiveProject(projId, 'changeProject');
	},
	linkChangeDirection: async function(){
		let elem = await createVQ_Element(Session.get("activeElement"));

		let linkElements =  await elem.getElements();
		let startClass = linkElements.start;
		let endClass = linkElements.end;
		let locLink = elem.obj.points;
		let locLinkTempX1 = locLink[0];
		let locLinkTempY1 = locLink[1];
		let locLinkTempX2 = locLink[2];
		let locLinkTempY2 = locLink[3];

		let name = await elem.getName();
		let parsed_exp = await vq_property_path_grammar_parser.parse(name, {schema:null, schemaName:"", symbol_table:[], context:Session.get("activeElement")});

		let res = getPathFullGrammarChangeDirection(parsed_exp).path;
		name = res.split("!!!!!").reverse().join(".");

		var NestingTypeMap = {"Join":"PLAIN", "Subquery":"SUBQUERY","Subquery + Global":"GLOBAL_SUBQUERY", "Graph to contents":"GRAPH", "Reference":"CONDITION"};
		var nestingType = await elem.getNestingType();
		if(typeof NestingTypeMap[await elem.getNestingType()] !== "undefined") nestingType = NestingTypeMap[await elem.getNestingType()];

		let lintType = "REQUIRED";
		if(await elem.isOptional())lintType = "OPTIONAL";
		else if(await elem.isNegation())lintType = "NOT";
		else if(await elem.isFilterExists())lintType = "FILTER_EXISTS";
		let newLoc = [locLinkTempX2, locLinkTempY2, locLinkTempX1, locLinkTempY1];
		let linkLine = await Create_VQ_Element_Async(newLoc, true, endClass,startClass);

		await linkLine.setName(name);
		await linkLine.setLinkType(lintType);
		await linkLine.setNestingType(nestingType);

	    let list = {
			elements: [ Session.get("activeElement") ],
			elementNames: [ Session.get("activeElement")+'(Link)' ],
			diagramId: Session.get("activeDiagram"),
			projectId: Session.get("activeProject"),
			versionId: Session.get("versionId")
		}
		Utilities.callMeteorMethod("deleteElements", list);
	},

	VQTransformLinkToSubQuery:function(classId){

		// var classObj = new VQ_Element(classId);
        // if (classObj && classObj.isClass()) {
			// if(!classObj.isRoot()){
				// var classUp = classObj.getLinkToRoot();
				// var vq_link_obj = new VQ_Element(classUp.link.obj._id);
				// if(vq_link_obj.isLink() && vq_link_obj.getNestingType() !== "GLOBAL_SUBQUERY" && vq_link_obj.getNestingType() !== "SUBQUERY" && vq_link_obj.getNestingType() !== "CONDITION"){
					// vq_link_obj.setNestingType("SUBQUERY");
				// }
			// }
		// }
	},


	UpdateInstanceCompartment: async function(elem_id, src_id, input, mapped_value, elemStyleId, compartStyleId) {
		let compart_type = this;

		let value = input;

		let elem = await createVQ_Element(Session.get("activeElement"));
		let group_by_value = elem.getCompartmentValue("Group by this");

		if (input !== "" && input !== null) {
			let proj = await Projects.findOneAsync({_id: Session.get("activeProject")});
			if (proj) {
				let comp_val_inst = value;
				Interpreter.destroyErrorMsg();
				if (comp_val_inst!= null && !comp_val_inst.trim().startsWith("?") && !comp_val_inst.trim().startsWith("=")){
					//uri
					if (isURI(comp_val_inst) == 3 || isURI(comp_val_inst) == 4) {
						if(proj.decorateInstancePositionConstants == true) comp_val_inst = "=" + comp_val_inst;
					}
					// number
					else if (!isNaN(comp_val_inst)) {
						if(proj.decorateInstancePositionConstants == true) comp_val_inst = "=" + comp_val_inst;
					}
					// string in quotes
					else if (comp_val_inst.startsWith("'") && comp_val_inst.endsWith("'") || comp_val_inst.startsWith('"') && comp_val_inst.endsWith('"')) {
						if (proj.decorateInstancePositionConstants == true) comp_val_inst = "=" + comp_val_inst;
					}
					//display label
					else if (comp_val_inst.startsWith('[') && comp_val_inst.endsWith(']')) {
						if (proj.decorateInstancePositionConstants == true) comp_val_inst = "=" + comp_val_inst;
					}
					//string
					else if (comp_val_inst.match(/^[0-9a-z_]+$/i)) {
						if (proj.decorateInstancePositionVariable == true) comp_val_inst = "?" + comp_val_inst;
					}
					else Interpreter.showErrorMsg("Instance identification '" + comp_val_inst + "' can not be interpreted as an identifier (variable) or a constant (URI, number, string)", -3);
				}
			}

			if (group_by_value == "true" || group_by_value == true) {
				value = make_group_by_instance_value(input);
			}

			await elem.setCompartmentValue("Group by this", group_by_value, "", false);
		}

		else {
			if (group_by_value == "true") {
				await elem.setCompartmentValue("Group by this", group_by_value, group_by_value, false);
			}
		}

		// elem.setCompartmentValue("Instance", input, value, false);
		return Dialog.updateCompartmentValue(compart_type, elem_id, input, value, src_id);
	},


	UpdateGroupByCompartment: async function(elem_id, src_id, input, mapped_value, elemStyleId, compartStyleId) {
		let compart_type = this;
		let value = input;

		let elem = await createVQ_Element(elem_id);
		let instance_input = elem.getCompartmentValue("Instance") || "";

		// if (instance_input == "") {
			// value = "";
			// if (input !== "true") {
				// value = "";
			// }
		// }
		// else {
			value = "";
			if (input == "true") {
				let instance_new_value = make_group_by_instance_value(instance_input);
				await elem.setCompartmentValue("Instance", instance_input, instance_new_value, false);
			}
			else {
				await elem.setCompartmentValue("Instance", instance_input, instance_input, false);
			}
		// }

		// elem.setCompartmentValue("Group by this", input, value, false);
		return Dialog.updateCompartmentValue(compart_type, elem_id, input, value, src_id);
	},

	VQsetGroupBy: function(params) {
	// 	console.log("params ", params)
	// 	 let act_elem = Session.get("activeElement");
	// 	 let elem = new VQ_Element(act_elem);
	// 	 let comp_val_inst = elem.getCompartmentValue("Instance");
	// 	 // let comp_val_group = elem.getCompartmentValue("Group by this");
	// 	 let comp_val_group = params["input"];
	// 	 if(params.compartmentType.name == "Instance") {
	// 		comp_val_group = elem.getCompartmentValue("Group by this");
	// 		comp_val_inst = params["input"];
	// 	 }

	// 	 // let compartments = Compartments.find({elementId: act_elem}).fetch()

	// 	 if(comp_val_inst !== null && comp_val_inst !== ""){
	// 		 var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 		 if (proj) {
	// 			Interpreter.destroyErrorMsg();
	// 			if(comp_val_inst!= null && !comp_val_inst.trim().startsWith("?") && !comp_val_inst.trim().startsWith("=")){
	// 				//uri
	// 				if(isURI(comp_val_inst) == 3 || isURI(comp_val_inst) == 4) {
	// 					if(proj.decorateInstancePositionConstants == true) comp_val_inst = "=" + comp_val_inst;
	// 				}
	// 				// number
	// 				else if(!isNaN(comp_val_inst)) {
	// 					if(proj.decorateInstancePositionConstants == true) comp_val_inst = "=" + comp_val_inst;
	// 				}
	// 				// string in quotes
	// 				else if(comp_val_inst.startsWith("'") && comp_val_inst.endsWith("'") || comp_val_inst.startsWith('"') && comp_val_inst.endsWith('"')) {
	// 					if(proj.decorateInstancePositionConstants == true) comp_val_inst = "=" + comp_val_inst;
	// 				}
	// 				//display label
	// 				else if(comp_val_inst.startsWith('[') && comp_val_inst.endsWith(']')) {
	// 					if(proj.decorateInstancePositionConstants == true) comp_val_inst = "=" + comp_val_inst;
	// 				}
	// 				//string
	// 				else if(comp_val_inst.match(/^[0-9a-z_]+$/i)) {
	// 					if(proj.decorateInstancePositionVariable == true) comp_val_inst = "?" + comp_val_inst;
	// 				}
	// 				else Interpreter.showErrorMsg("Instance identification '" + comp_val_inst + "' can not be interpreted as an identifier (variable) or a constant (URI, number, string)", -3);
	// 			}
	// 		 }
	// 	 }


 	// 	 if (comp_val_group == "true" || comp_val_group == true){

	// 	   if (comp_val_inst == null ) {
	// 	   		console.log("do nothing")
	// 	     elem.setCompartmentValue("Instance", "", "", false);
	// 	     // elem.setCompartmentValue("Instance", "", "{group}", false);
	// 	   }
	// 	   else {
	// 	     elem.setCompartmentValue("Instance", comp_val_inst, "{group} " + comp_val_inst , false);
	// 	   }
	// 	 }
	// 	 else {
	// 	   if (typeof comp_val_inst === "undefined") {
	// 	     elem.setCompartmentValue("Instance", "", "", false);
	// 	   }
	// 	   else if ( comp_val_inst !== null && comp_val_group == "false") {
	// 	     elem.setCompartmentValue("Instance", comp_val_inst, comp_val_inst, false);
	// 	   }
	// 	 }
 	},

	VQsetDistinct: async function(params) {
		 var act_elem = Session.get("activeElement");
		 var elem = await createVQ_Element(act_elem);
		 // var comp_val_distinct = elem.getCompartmentValue("Distinct");
		 var comp_val_distinct = params["input"];

		 // elem.setCompartmentValue("Distinct", params["input"], params["value"]);
 		 if (comp_val_distinct != "true") {
		   await elem.setCompartmentValue("Distinct", "", "");
		 }
 	},

	TogglePlainMode: function() {

		var plain = Session.get("plain");
		if (plain.showDiagram == "none") {
			_.extend(plain, {showPlain: "none", showDiagram: "inline",});
		}

		else {
			_.extend(plain, {showPlain: "inline", showDiagram: "none",});
		}

		Session.set("plain", plain);
	},

	VQgetGraphInstructions: function() {
	return  [
	{input:"GRAPH",value:"GRAPH"},
	{input:"SERVICE",value:"SERVICE"}
	]
  },

	  VQgetNamedGraphInstructions: function() {
		return  [
		{input:"FROM",value:"FROM"},
		{input:"FROM NAMED",value:"FROM NAMED"},
		]
	  },

	VQgetGraphInstructionsClass: function() {
	 // let act_elem = Session.get("activeElement");
		 // if (!act_elem) {
 			// return [];
 		// }
 	// let elem = new VQ_Element(act_elem);

	// if(elem.getType() === "condition"){
		// return  [
			// {input:"GRAPH",value:"GRAPH"},
			// {input:"SERVICE",value:"SERVICE"}
		// ]
	// }


	return  [
		// {input:"FROM",value:"FROM"},
		// {input:"FROM NAMED",value:"FROM NAMED"},
		{input:"GRAPH",value:"GRAPH"},
		{input:"SERVICE",value:"SERVICE"}
	]
  },

  VQgetSchemaNames: function() {
	let schemaName = dataShapes.getOntologiesSync();
	if(typeof schemaName !== "undefined"){
		schemaName = schemaName.map(function(e) {
		  return {input:e["display_name"],value:e["display_name"]}
		})
	return  schemaName;
	}
	return [];
  },

	VQgetAggregateNames: function() {

		/* var act_elem = Session.get("activeElement");
		 if (!act_elem) {
 			return [];
 		}
 		var act_comp = Compartments.findOne({elementId: act_elem})
 		if (!act_comp) {
 			return [];
 		}

 		var elem_type = ElementTypes.findOne({name: "Class"});
 		if (elem_type && act_comp["elementTypeId"] !== elem_type._id) {
 			return [];
 		}*/

 		//Active element is given as Class type element
 		var atr_names = [];
/*
 		var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid

 		if (act_el) {
 		//check if Class name is defined for active element
 			var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});

 			if (!compart_type) {
 				return [{input:"count(.)",value:"count(.)"},{input:"count_distinct(.)",value:"count_distinct(.)"}];
 			}

 			var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
 			if (!compart) {
 				return [{input:"count(.)",value:"count(.)"},{input:"count_distinct(.)",value:"count_distinct(.)"}];
 			}

 		//Read attribute values from DB

 			var schema = new VQ_Schema();

 			if (schema.classExist(compart["input"])) {
 				var klass = schema.findClassByName(compart["input"]);

 				_.each(klass.getAllAttributes(), function(att){
 					let att_val = "avg("+att["name"]+")";
 					atr_names.push({value: att_val, input: att_val});
					att_val = "min("+att["name"]+")";
 					atr_names.push({value: att_val, input: att_val});
					att_val = "max("+att["name"]+")";
 					atr_names.push({value: att_val, input: att_val});
					att_val = "sum("+att["name"]+")";
 					atr_names.push({value: att_val, input: att_val});
					att_val = "group_concat("+att["name"]+",',')";
 					atr_names.push({value: att_val, input: att_val});
 				})
 			}

			var selected_elem_id = Session.get("activeElement");

			var tempSymbolTable = generateSymbolTable();
			var symbolTable = tempSymbolTable["symbolTable"];
			for (var  key in symbolTable) {
				for (var symbol in symbolTable[key]) {
					if (symbolTable[key][symbol]["upBySubQuery"] == 1 || (typeof symbolTable[key][symbol]["upBySubQuery"] === "undefined" && symbolTable[key][symbol]["kind"] == "CLASS_ALIAS")){
						let att_val = "avg("+key+")";
						atr_names.push({value: att_val, input: att_val});
						att_val = "min("+key+")";
						atr_names.push({value: att_val, input: att_val});
						att_val = "max("+key+")";
						atr_names.push({value: att_val, input: att_val});
						att_val = "sum("+key+")";
						atr_names.push({value: att_val, input: att_val});
						att_val = "group_concat("+key+",',')";
						atr_names.push({value: att_val, input: att_val});
					} else {
						var attributeFromAbstractTable = findAttributeInAbstractTable(symbolTable[key][symbol]["context"], tempSymbolTable["abstractQueryTable"], key);
						if(typeof attributeFromAbstractTable["isInternal"] !== "undefined" && attributeFromAbstractTable["isInternal"] == true){
							let att_val = "avg("+key+")";
							atr_names.push({value: att_val, input: att_val});
							att_val = "min("+key+")";
							atr_names.push({value: att_val, input: att_val});
							att_val = "max("+key+")";
							atr_names.push({value: att_val, input: att_val});
							att_val = "sum("+key+")";
							atr_names.push({value: att_val, input: att_val});
							att_val = "group_concat("+key+",',')";
							atr_names.push({value: att_val, input: att_val});
						}
					}
				}
			}

 		}


 	 	// return atr_names;
 		atr_names = _.sortBy(atr_names, "input");
*/
		atr_names = _.union([{input:"count(.)",value:"count(.)"},{input:"count_distinct(.)",value:"count_distinct(.)"}], atr_names);

 	 	// atr_names = _.uniq(atr_names, false, function(item) {
 	 		// return item["input"];
 	 	// });

 		return atr_names;

	},

	VQsetIsCondition: async function(params) {
		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt ="PLAIN";
			 if (input=="true") { lt="CONDITION"};
			 var elem = await createVQ_Element(c["elementId"]);
			 await elem.setNestingType(lt);
		}
	},

	VQsetIsSubquery: async function(params) {
		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "PLAIN";
			 if (input=="true") { lt="SUBQUERY"};
			 var elem = await createVQ_Element(c["elementId"]);
			 await elem.setNestingType(lt);
		}
	},

	VQsetIsGlobalSubquery: async function(params) {
		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "PLAIN";
			 if (input=="true") { lt="GLOBAL_SUBQUERY"};
			 var elem = await createVQ_Element(c["elementId"]);
			 await elem.setNestingType(lt);
		}
	},

	VQsetIsGraphToContents: async function(params) {
		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "PLAIN";
			 if (input=="true") { lt="GRAPH"};
			 var elem = await createVQ_Element(c["elementId"]);
			 await elem.setNestingType(lt);
		}
	},

	VQsetIsOptional: async function(params) {
		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "REQUIRED";
			 if (input=="true") { lt="OPTIONAL"};
			 var elem = await createVQ_Element(c["elementId"]);
			 await elem.setLinkType(lt);
		}
	},

	VQsetIsNegation: async function(params) {
		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "REQUIRED";
			 if (input=="true") {
			 	lt="NOT"
			 }

			 var elem = await createVQ_Element(c["elementId"]);
			 await elem.setLinkType(lt);
		}
	},

	VQsetIsFilterExists: async function(params) {

		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "REQUIRED";
			 if (input=="true") { lt="FILTER_EXISTS"};
			 var elem = await createVQ_Element(c["elementId"]);
			 await elem.setLinkType(lt);
		}
	},


	VQsetNestingType: async function(params) {
		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			 var nestingType = params["value"];
			 var elem = await createVQ_Element(c["elementId"]);
			 await elem.setNestingType(nestingType);
		}
	},

	VQSetHideDefaultLinkName: async function(params) {
		// var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		// if (c) {
			 // var input = params["input"];
			 // var hide = (input == "true");
			 // var elem = await createVQ_Element(c["elementId"]);
			 // elem.hideDefaultLinkName(hide);
		// }
	},

	VQbeforeCreateLink: async function(params) {
		// console.log(params);
		Interpreter.destroyErrorMsg();
		var startLink = await createVQ_Element(params["startElement"]);
		var endLink = await createVQ_Element(params["endElement"]);

		const startRootId = await startLink.getRootId();
		const endRootId = await endLink.getRootId();

		if (startRootId === endRootId) {
			// console.log("inside one query");
			return true;
		} else if (!(await startLink.isRoot()) && !(await endLink.isRoot()) &&
			 !(await startLink.getLinkToRoot() === undefined) && !(await endLink.getLinkToRoot() === undefined)) {
			//If both condition classes are connected to different query classes
			if (startRootId !== endRootId){
				Interpreter.showErrorMsg("Condition (violet) classes of two queries can not be linked (to avoid two main classes in a query).", -3);
				// To merge two queries, use a query class (orange) at least at one link end.", -3);
				return false;
			}
		} //else if (startLink.isRoot() && !endLink.isRoot() && !(endLink.getLinkToRoot() === undefined)){
		//	Interpreter.showErrorMsg("Can't connect 2 queries this way to avoid two main classes in a query.");
		//	return false;
		//} else if (!startLink.isRoot() && endLink.isRoot() && !(startLink.getLinkToRoot() === undefined)){
		//	Interpreter.showErrorMsg("Can't connect 2 queries this way to avoid two main classes in a query.");
		//	return false;
		//}
		return true;
	},

	VQafterCreateLink: async function(params) {

		// TODO Salaboju, bet sanāk aizture, kamēr meklē propertijas
		var linkName = await VQsetAssociationName(params["startElement"], params["endElement"])
		//console.log(params);
		Interpreter.destroyErrorMsg();
		var link = await createVQ_Element(params["_id"]);

		await link.setName(linkName);

		await link.setLinkType("REQUIRED");
		const startElement = await link.getStartElement();
		const endElement = await link.getEndElement();
		if (await startElement.isRoot() && await endElement.isRoot()){
			let elem = startElement;
			let namedGraphsFromQuery = await findNamedGraphsInQuery(elem, [elem.obj._id]);
			for(let e = 0; e < namedGraphsFromQuery.length; e++){
				await elem.addNamedGraph(namedGraphsFromQuery[e]["graph"], namedGraphsFromQuery[e]["graphInstruction"])
			}
		 	await endElement.setClassStyle("condition");

		} else if (!(await startElement.isRoot()) && await endElement.isRoot()) {
			if (await startElement.getLinkToRoot().start == false){
				console.log("condition class has no connected query class")
			} else {
				await endElement.setClassStyle("condition");
			}
		}
	},

	VQmoveNamedGraphs: async function(params) {
		if(params.input === "query"){
			let c = await Compartments.findOneAsync({_id:params["compartmentId"]});
			if (c) {
				let elem = await createVQ_Element(c["elementId"]);
				let namedGraphsFromQuery = await findNamedGraphsInQuery(elem, [c["elementId"]]);
				for(let e = 0; e < namedGraphsFromQuery.length; e++){
					await elem.addNamedGraph(namedGraphsFromQuery[e]["graph"], namedGraphsFromQuery[e]["graphInstruction"])
				}
			}
		}
	},

	VQgetAssociationIsInverse: function() {
		////arrow ->compartments->Inverse link->extensions->dynamic default value
		//return: String
	},

	VQsetSubQueryInverseLink: function() {
		//arrow ->compartments->Inverse Link->extensions->after Update
		//params: (compartType, compartId)
		/*var ct = CompartmentTypes.findOne({name: "Inverse Link"});
		var ctn = CompartmentTypes.findOne({name: "Name", elementTypeId: Session.get("activeElementType")});
		var act_elem = Session.get("activeElement");

		if (act_elem && ct && ctn) {
			var c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});
			var cn = Compartments.findOne({elementId: act_elem, compartmentTypeId: ctn["_id"]});
			var c_cal = Compartments.findOne({elementId: act_elem, input: {$nin: ["true", "false"]}});

			if (c && cn) {

				if (c["input"] == "true" && String(c_cal["value"]).indexOf("inv") == -1){

					// Dialog.updateCompartmentValue(ct, "true", "<inv>", c["_id"]);
					Dialog.updateCompartmentValue(ctn, act_elem, "inv(".concat(cn["input"], ")"), "inv(".concat(cn["input"], ")"), cn["_id"]);
				}
				else if (c["input"] == "false" && String(c_cal["value"]).indexOf("inv") > -1) {
					var s = cn["value"].indexOf("(");
					var e = cn["value"].lastIndexOf(")");
					var name = cn["value"].substring(s + 1, e);

					// Dialog.updateCompartmentValue(ct, "false", "", c["_id"]);
					Dialog.updateCompartmentValue(ctn, act_elem, name, name, cn["_id"]);
				}
			}
		}*/
	},

	VQsetLinkName: function(params) {
		/*var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var link = new VQ_Element(c["elementId"]);
			 link.hideDefaultLinkName(link.shouldHideDefaultLinkName(), params["input"], params["value"]);

			 // link.setIsInverseLink(c["value"].substring(0,4)=="inv(");
		}*/
	},

	VQsetClassName: async function(params) {
		let elem_name = params["input"];
		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			var elem = await createVQ_Element(c["elementId"]);

			// if (elem.isIndirectClassMembership() && elem.getName() !== null && elem.getName() !== "") {
			if (await elem.isIndirectClassMembership() && elem_name !== null && elem_name !== "") {
				let elem_name_pref = ".. " + elem_name;
				await elem.setNameValue(elem_name_pref, elem_name);
				// elem.setNameValue(".. "+elem.getName());
			}
			else {
				if (elem_name !== null) {
					await elem.setNameValue(elem_name, elem_name);
					// elem.setNameValue(elem.getName());
				}
			}

       		const links = await elem.getLinks(); // links = [{link: VQ_Element, start: bool}, ...]

			// for (const l of links) {
			  // const link = l.link;
			  // const shouldHide = link.shouldHideDefaultLinkName();
			  // await link.hideDefaultLinkName(shouldHide);
			// }
		}
	},

	VQsetClassNameValue: async function(params) {
		let indirectClassMembership = params["input"];
		var c = await Compartments.findOneAsync({_id:params["compartmentId"]});
		if (c) {
			var elem = await createVQ_Element(c["elementId"]);
			let elem_name = await elem.getName();
			if (indirectClassMembership == "true" && elem_name !== null && elem_name !== "") {
				var elem_name_pref = ".. " + elem_name;
				await elem.setNameValue(elem_name_pref, elem_name);
			}
			else {
				if (elem_name !== null) {
					await elem.setNameValue(elem_name, elem_name);
				}
			};
		};
	},

	VQSetHideDefaultLinkValue: function(a,b,c){
		// var proj = Projects.findOne({_id: Session.get("activeProject")});
		// if (proj && proj.autoHideDefaultPropertyName == true) {
			 // return "true";
		// } else {
			 // return "false";
		// };
	},

	VQsetSubQueryNameSuffix: function(val) {
		//arrow ->compartments->extensions->dynamicSuffix
		//params: (value), return: String
		//vards zem bultas (ja neko neatgriez, tad panems vertibu, bet pieliks klat undescribed)
    //  console.log(val);

		return [val.value];
	},

	VQsetSubQueryNamePrefix: function(val) {
		//arrow ->compartments->extensions->dynamicPrefix
		//params: (value), return: String
		//vards zem bultas (ja neko neatgriez, tad panems vertibu, bet pieliks klat undescribed)
   //console.log(val);

		return [val.value];
	},

	// VQsetGraphPrefix: function(val) {
		// var act_elem = Session.get("activeElement");
		// var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
 		// var compart_type = CompartmentTypes.findOne({name: "Graph instruction", elementTypeId: act_el["elementTypeId"]});
		// var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
		// if (compart) return "{"+compart.value+": ";
		// return "{";
	// },

	// VQsetGraphPrefixFromInstructions: function(params) {

			// var act_elem = Session.get("activeElement");
			// var elem = new VQ_Element(act_elem);

            // if (typeof elem.getGraph() !== "undefined" && elem.getGraph() !== null && elem.getGraph() !== "") {
				// var instrunction = params.value;
				// if(instrunction!= null && instrunction != "") instrunction = instrunction+": ";
				// elem.setGraph(elem.getGraph(), "{" + instrunction + elem.getGraph() + "}");
			// }
	// },

	VQsetPrefixNamespace: async function(params, prefixValue) {
		// console.log(params)
		let namespaceInput = document.getElementById(params).parentElement.children[1].getElementsByTagName('input')[0];
		let namespaceInputValue = namespaceInput.value;
		let prefixFound = false;
		let prefixes = await dataShapes.getNamespaces();
		for(let p = 0; p < prefixes.length; p++){
			if(prefixes[p]["name"] === prefixValue){
				namespaceInputValue = prefixes[p]["value"];
				prefixFound = true;
				break;
			}
		}
		let ontologies = dataShapes.getOntologiesSync();
		if(typeof ontologies !== "undefined"){
			for(let o = 0; o < ontologies.length; o++){
				if(prefixFound !== true){
					// dataShapes.schema.schema = ontologies[o]["db_schema_name"];
					// dataShapes.schema.namespaces = [];
					if(typeof ontologies[o]["db_schema_name"] !== "undefined"){
						let prefixes = await dataShapes.getNamespaces({schema:ontologies[o]["db_schema_name"]});
						for(let p = 0; p < prefixes.length; p++){
							if(prefixes[p]["name"] === prefixValue){
								namespaceInputValue = prefixes[p]["value"];
								prefixFound = true;
								break;
							}
						}
					}
				}
			}
		}
		namespaceInput.value = namespaceInputValue;
	},

	VQsetSchemaEndpoint: function(params, schemaValue) {
		// console.log(params, document.getElementById(params).parentElement)
		let namespaceInput = document.querySelectorAll('[id='+params+']')[1].parentElement.children[1].getElementsByTagName('input')[0];
		let namespaceInputValue = namespaceInput.value;
		let ontologies = dataShapes.getOntologiesSync();
		if(typeof ontologies !== "undefined"){
			for(let o = 0; o < ontologies.length; o++){
				if(ontologies[o]["display_name"] === schemaValue){
					namespaceInputValue = ontologies[o]["sparql_url"];
					break;
				}
			}
		}
		namespaceInput.value = namespaceInputValue;
	},

	visualizeSPARQL: function(q) {
		let x = 10;
		let y = 10;
		var queries = q;

		if(typeof q === "undefined"){
			let yasqe3 = Template.sparqlForm.yasqe3.get();
			var query_text = yasqe3.getValue();

			queries = query_text.split("--------------------------------------------\n");

			var editor = Interpreter.editor;

			var e;
				if (editor.data.ev) {
					e = editor.data.ev;
				}

				if (e) {
					var mouse_state_obj = editor.getMouseStateObject();
					var mouse_pos = mouse_state_obj.getMousePosition(e);
					x = mouse_pos["x"];
					y = mouse_pos["y"];
				}
				if(x == 0 && y == 0){
					x = e.evt.layerX;
					y = e.evt.layerY;
				}
		}
		for (const query of queries) {
			Interpreter.customExtensionPoints.generateVisualQuery(query, x, y);
			x = x+170;
		}


		// var query_text = yasqe3.getValue();
		// try {
		    // var queries = JSON.parse(query_text);

			// var jsonText = [];

			// for(var q in queries.questions){
				// var questionJson = {};
				// questionJson["id"] = queries.questions[q]["id"];
				// for(var qq in queries.questions[q]["question"]){
					// if(queries.questions[q]["question"][qq]["language"] == "en"){
						// questionJson["question"] = queries.questions[q]["question"][qq]["string"];
					// }
				// }
				// questionJson["sparql"] = queries.questions[q]["query"]["sparql"];
				// console.log(queries.questions[q]["query"]["sparql"]);
				// jsonText[queries.questions[q]["id"]] = questionJson;
			// }

			// console.log(JSON.stringify(jsonText, 0, 2));


			// Interpreter.customExtensionPoints.generateVisualQueryAll(queries, x, y);
		// } catch (error) {
		  // var x = 10;
		  // Interpreter.customExtensionPoints.generateVisualQuery(query_text, x, y);
		// }


	},

	setIsVisibleFalse: function() {
		return false;
	},

	setIsVisibleTrue: function() {
		return true;
	},

	isAggregateWizardAvailable: function() {
		//console.log("isAggregateWizardAvailable");
		return true;
	},

	AggregateWizard: async function(e) {
		var parent = $(e.target).closest(".compart-type");
		var parent_id = parent.attr("id");
		var compart_type = await CompartmentTypes.findOneAsync({_id: parent_id});

		// more elegant selection for subCompartmentTypes needed
		var expression_compart_type = _.find(compart_type.subCompartmentTypes[0].subCompartmentTypes, function(sub_compart_type) {
											return sub_compart_type.name == "Expression";
										});
		var exression_id = expression_compart_type._id;
		var expression_value = parent.find("." + exression_id).val();

		 Template.AggregateWizard.expressionField.set(await getAggregatedField(e, "Expression"))
		 Template.AggregateWizard.aliasField.set(await getAggregatedField(e, "Field Name"))
		 Template.AggregateWizard.requireField.set(await getAggregatedField(e, "Require Values"))

		var require_compart_type = _.find(compart_type.subCompartmentTypes[0].subCompartmentTypes, function(sub_compart_type) {
											return sub_compart_type.name == "Require Values";
										});
		var require_id = require_compart_type._id;
		var require_value = parent.find("." + require_id)[0].checked;
		if(require_value == true) require_value = "checked";
		else require_value = "";

		Template.AggregateWizard.require.set(require_value);

        var classId = Session.get("activeElement");
        Template.AggregateWizard.endClassId.set(classId);

		var aggregations = {count:1, count_distinct:1, min:1, max:1, avg:1, sum:1, sample:1, group_concat:1}

		if(expression_value !== null && expression_value !== "" &&
		expression_value.slice(-1) == ")" && expression_value.indexOf("(") !=-1
		&& typeof aggregations[expression_value.substring(0, expression_value.indexOf("(")).toLowerCase()] !== "undefined"){

			var aggregation = expression_value.substring(0, expression_value.indexOf("(")).toLowerCase();
			var expression = expression_value.substring(expression_value.indexOf("(")+1, expression_value.length-1);
			if(expression == ".") expression = "";

			if(expression.toLowerCase().startsWith("distinct ")){
				Template.AggregateWizard.distinct.set("checked");
				expression = expression.substring(9);
			} else Template.AggregateWizard.distinct.set("");

			Template.AggregateWizard.aggregation.set(aggregation);
			Template.AggregateWizard.expression.set(expression);
		} else if (expression_value === null || expression_value == ""){
			Template.AggregateWizard.aggregation.set("count");
			Template.AggregateWizard.expression.set("");
		} else {
			classId = null;
		}

		Interpreter.destroyErrorMsg();
		var attr_list = [{attribute: ""}];
        //var schema = new VQ_Schema();

        if (classId) {
            var classObj = await createVQ_Element(classId);
            if (classObj && await classObj.isClass()) {
            	//Display/at least/at most visibility
            	if(await classObj.isRoot()) {
            		Template.AggregateWizard.showDisplay.set("none");
            		Template.AggregateWizard.startClassId.set(classId);
            	}else {
            		var classUp = await classObj.getLinkToRoot();
            		Template.AggregateWizard.showDisplay.set("none");
            		Template.AggregateWizard.linkId.set(classUp.link.obj._id);
            		//console.log("root id = ", getRootId(classObj.obj._id));
            		//Template.AggregateWizard.startClassId.set(getRootId(classObj.obj._id));
            		if (classUp.start) {
        				Template.AggregateWizard.startClassId.set((await classUp.link.getElements()).start.obj._id);
        			} else {
        				Template.AggregateWizard.startClassId.set((await classUp.link.getElements()).end.obj._id);
        			}
            	}

                //Attribute generation
                var class_name = await classObj.getName();
				const classInfo = await dataShapes.resolveClassByName({name: class_name});
                //if (schema.classExist(class_name)) {
				if ( classInfo["complete"] ) {
                    //var klass = schema.findClassByName(class_name);
                    //_.each(klass.getAllAttributes(), function(att){
					//	attr_list.push({attribute: att["name"]});
                    //})
					const prop = await dataShapes.getProperties({propertyKind:'Data'},classObj );
					for (const p of prop.data) {
						attr_list.push({attribute: p.full_name});
					}

					var selected_elem_id = Session.get("activeElement");

					var tempSymbolTable = generateSymbolTable();
					var symbolTable = tempSymbolTable["symbolTable"];
					for (var  key in symbolTable) {
						for (var symbol in symbolTable[key]) {
							// if(symbolTable[key][symbol]["context"] == selected_elem_id){
							if (symbolTable[key][symbol]["upBySubQuery"] == 1 || (typeof symbolTable[key][symbol]["upBySubQuery"] === "undefined" && symbolTable[key][symbol]["kind"] == "CLASS_ALIAS")){
								attr_list.push({attribute: key, });
							}else{
								var attributeFromAbstractTable = findAttributeInAbstractTable(symbolTable[key][symbol]["context"], tempSymbolTable["abstractQueryTable"], key);
								if(typeof attributeFromAbstractTable["isInternal"] !== "undefined" && attributeFromAbstractTable["isInternal"] == true) attr_list.push({attribute: key});
							}
							// }
						}
					}
					attr_list = _.uniq(attr_list, false, function(item) {
						return item["attribute"];
					});

                    attr_list = _.sortBy(attr_list, "attribute");
                }
                // console.log(attr_list);
                Template.AggregateWizard.attList.set(attr_list);

                //Alias name
                // if (class_name) {
                	if (class_name === null) class_name = "";
					var userAlias = $("#479fc64e382dc2d31bdd0855 input").val();
                  	if (typeof userAlias !== "undefined" && userAlias !="") {
                    	Template.AggregateWizard.defaultAlias.set(userAlias);
                 	} else {
						if(Template.AggregateWizard.expression.get() !== "")Template.AggregateWizard.defaultAlias.set("");
						else {
							let defaultAlias = class_name.charAt(0);
							if(class_name.indexOf(":") !== -1) defaultAlias = class_name.charAt(class_name.indexOf(":")+1);
							Template.AggregateWizard.defaultAlias.set(defaultAlias + "_count");
						}

                    }
					Template.AggregateWizard.fromAddLink.set(false);
					Template.AggregateWizard.placeholder.set("("+class_name+")");
                    $("#aggregate-wizard-form").modal("show");
                // } else {
                	// Interpreter.showErrorMsg("No class name is given", -3);
                	// return;
                // }
            }
        }  else {
			Interpreter.showErrorMsg("Aggregate expression too complex for wizard (the wizard supports only aggregate(expression) form)", -3);
		}

    },

	AddAggregate: async function(e) {
		 Template.AggregateWizard.expressionField.set("")
		 Template.AggregateWizard.aliasField.set("")
		 Template.AggregateWizard.requireField.set("")

		Template.AggregateWizard.require.set("");

        var classId = Session.get("activeElement");
        Template.AggregateWizard.endClassId.set(classId);

		Template.AggregateWizard.aggregation.set("count");
		Template.AggregateWizard.expression.set("");

		Interpreter.destroyErrorMsg();
		var attr_list = [{attribute: ""}];
        // var schema = new VQ_Schema();

        if (classId) {
            var classObj = await createVQ_Element(classId);
            if (classObj && await classObj.isClass()) {
            	//Display/at least/at most visibility
            	if(await classObj.isRoot()) {
            		Template.AggregateWizard.showDisplay.set("none");
            		Template.AggregateWizard.startClassId.set(classId);
            	}else {
            		var classUp = await classObj.getLinkToRoot();

            		Template.AggregateWizard.showDisplay.set("block");
            		Template.AggregateWizard.linkId.set(classUp.link.obj._id);
            		//console.log("root id = ", getRootId(classObj.obj._id));
            		//Template.AggregateWizard.startClassId.set(getRootId(classObj.obj._id));
					let isSubQuery = false;
					while(isSubQuery === false){
						let linkO = await createVQ_Element(classUp.link.obj._id);
						let parClass;
						if (classUp.start) {

							parClass = await createVQ_Element((await classUp.link.getElements()).start.obj._id);
							Template.AggregateWizard.startClassId.set((await classUp.link.getElements()).start.obj._id);
						} else {
							Template.AggregateWizard.startClassId.set((await classUp.link.getElements()).end.obj._id);
							parClass = await createVQ_Element((await classUp.link.getElements()).end.obj._id);
						}
						if(await linkO.isSubQuery() === true || await linkO.isGlobalSubQuery() === true) isSubQuery = true;
						else {
							classUp = await parClass.getLinkToRoot();
						}
					}

            	}

                //Attribute generation
                var class_name = await classObj.getName();
				const classInfo = await dataShapes.resolveClassByName({name: class_name});
                //if (schema.classExist(class_name)) {
				if ( classInfo["complete"] ) {
                    //var klass = schema.findClassByName(class_name);
                    //_.each(klass.getAllAttributes(), function(att){
					//	attr_list.push({attribute: att["name"]});
                    //})
					const prop = await dataShapes.getProperties({propertyKind:'Data'},classObj );
					for (const p of prop.data) {
						attr_list.push({attribute: p.full_name});
					}

					var selected_elem_id = Session.get("activeElement");

					var tempSymbolTable = generateSymbolTable();
					var symbolTable = tempSymbolTable["symbolTable"];
					for (var  key in symbolTable) {
						for (var symbol in symbolTable[key]) {
							// if(symbolTable[key][symbol]["context"] == selected_elem_id){
							if (symbolTable[key][symbol]["upBySubQuery"] == 1 || (typeof symbolTable[key][symbol]["upBySubQuery"] === "undefined" && symbolTable[key][symbol]["kind"] == "CLASS_ALIAS")){
								attr_list.push({attribute: key, });
							}else{
								var attributeFromAbstractTable = findAttributeInAbstractTable(symbolTable[key][symbol]["context"], tempSymbolTable["abstractQueryTable"], key);
								if(typeof attributeFromAbstractTable["isInternal"] !== "undefined" && attributeFromAbstractTable["isInternal"] == true) attr_list.push({attribute: key});
							}
							// }
						}
					}
					attr_list = _.uniq(attr_list, false, function(item) {
						return item["attribute"];
					});

                    attr_list = _.sortBy(attr_list, "attribute");
                }

                Template.AggregateWizard.attList.set(attr_list);

                //Alias name
                // if (class_name) {
                	if (class_name === null) class_name = "";
					var userAlias = $("#479fc64e382dc2d31bdd0855 input").val();
                  	if (typeof userAlias !== "undefined" && userAlias !="") {
                    	Template.AggregateWizard.defaultAlias.set(userAlias);
                 	} else {
						if(Template.AggregateWizard.expression.get() !== "")Template.AggregateWizard.defaultAlias.set("");
						else {
							let defaultAlias = class_name.charAt(0);
							if(class_name.indexOf(":") !== -1) defaultAlias = class_name.charAt(class_name.indexOf(":")+1);
							Template.AggregateWizard.defaultAlias.set(defaultAlias + "_count");
						}

                    }
					Template.AggregateWizard.fromAddLink.set(true);
					Template.AggregateWizard.placeholder.set("("+class_name+")");
                    $("#aggregate-wizard-form").modal("show");
                // } else {
                	// Interpreter.showErrorMsg("No class name is given", -3);
                	// return;
                // }
            }
        }  else {
			Interpreter.showErrorMsg("Aggregate expression too complex for wizard (the wizard supports only aggregate(expression) form)", -3);
		}

    },

	isMergeValuesWizardAvailable: function() {
		return true;
	},

	setIsVisibleForIndirectClassMembership: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			if(proj.indirectClassMembershipRole === null) return false;
			  var directClassMembershipRole;
			  var indirectClassMembershipRole;
			  if (proj.directClassMembershipRole) directClassMembershipRole = proj.directClassMembershipRole;
			  else directClassMembershipRole = "";
			  if (proj.indirectClassMembershipRole)indirectClassMembershipRole =  proj.indirectClassMembershipRole;
			  else indirectClassMembershipRole = "";

				console.log("directClassMembershipRole", directClassMembershipRole, indirectClassMembershipRole)

			  if(directClassMembershipRole == indirectClassMembershipRole) return false;
			  return true;
		}
		return false;
	},

	setIsVisibleForIndirectClassMembershipAsync: async function() {
		var proj = await Projects.findOneAsync({_id: Session.get("activeProject")});
		if (proj) {
			  if(proj.indirectClassMembershipRole === null) return false;
			  var directClassMembershipRole;
			  var indirectClassMembershipRole;
			  if (proj.directClassMembershipRole) directClassMembershipRole = proj.directClassMembershipRole;
			  else directClassMembershipRole = "";
			  if (proj.indirectClassMembershipRole)indirectClassMembershipRole =  proj.indirectClassMembershipRole;
			  else indirectClassMembershipRole = "";

			  if(directClassMembershipRole == indirectClassMembershipRole) return false;
			  return true;
		}
		return false;
	},

	setIsVisibleForLabelService: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			if (proj.enableWikibaseLabelServices == true) return true;
		}
		return false;
	},

	setIsVisibleForLabelServiceAsync: async function() {
		var proj = await Projects.findOneAsync({_id: Session.get("activeProject")});
		if (proj) {
			if (proj.enableWikibaseLabelServices == true) return true;
		}
		return false;
	},

	setIsVisibleForGraphFields: function() {
		// var proj = Projects.findOne({_id: Session.get("activeProject")});
		// if (proj) {
			// if (proj.showGraphServiceCompartments == true) return true;
		// }
		// return false;
		return true;
	},

	setIsVisibleForNamedGraphsAsync: async function() {
		let selected_elem_id = Session.get("activeElement");
		const element = await Elements.findOneAsync({ _id: selected_elem_id });

		if (element) { //Because in case of deleted element ID is still "activeElement"

			let vq_obj = await createVQ_Element(selected_elem_id);
			let type = await vq_obj.getType();
			if(type === "query") return true;
		}
		return false;
	},

	setIsVisibleForNamedGraphs: function() {
		// let proj = Projects.findOne({_id: Session.get("activeProject")});
		// if (proj) {
			// if (proj.showGraphServiceCompartments == true) {
				let selected_elem_id = Session.get("activeElement");
				const element = Elements.findOne({ _id: selected_elem_id });

				if (element) { //Because in case of deleted element ID is still "activeElement"

					 let vq_obj = new VQ_Element(selected_elem_id);
					 let type = vq_obj.getType();
					if(type === "query") return true;
				}
			// }
		// }
		return false;
	},

	AddSelectThis: async function(){

		var selected_elem_id = Session.get("activeElement");
		if (await Elements.findOneAsync({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

		 var vq_obj = await createVQ_Element(selected_elem_id);
		 var fields = await vq_obj.getFields();
		 // Šis cikls joprojām strādā pareizi
		 for(let field in fields){
			 if(typeof fields[field] !== "function" && fields[field]["exp"] == "(select this)") return;
		 }
		 await vq_obj.addField("(select this)",null,false,false,false);
		};

		return;
	},

	//Adds outer query as [ ] class with ++ link
	addOuterQuery: async function(){
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
			Interpreter.destroyErrorMsg();

			var currentElement = await createVQ_Element(selected_elem_id);
			if (await currentElement.isClass() && await currentElement.isRoot()) {
				await currentElement.setClassStyle("condition");
				//coordinates to place new Box and create link
				var d = 60; //distance between boxes
				var locClass = await currentElement.getNewLocation(d);
				var coordX = locClass.x + Math.round(locClass.width/2);
				var coordY = locClass["y"] - d;
				var locLink = [coordX, locClass.y, coordX, coordY];

				let cl = await Create_VQ_Element_Async(locClass);
				await cl.setName("[ ]");
				var proj = Projects.findOne({_id: Session.get("activeProject")});
				await cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);

				let lnk = await Create_VQ_Element_Async(locLink, true, cl, currentElement);
				await lnk.setName("++");
				await lnk.setLinkType("REQUIRED");
				await lnk.setNestingType("SUBQUERY");

			} else {
				Interpreter.showErrorMsg("Outer class can be added only to main query class (orange box).", -3);
			}

		} else {
			Interpreter.showErrorMsg("Outer class can be added only to main query class (orange box).", -3);
		}
	},

	setAsMainClass: async function(){
		Interpreter.destroyErrorMsg();
		//Based on "generate SPARQL from component" realisation
        var newMainElementID = Session.get("activeElement");
        var selected_elem = await createVQ_Element(newMainElementID);
        //Check if any action is needed
        if(!(await selected_elem.isClass())){
            console.log("Selected element is not class");
            return;
        }
        if (await selected_elem.isRoot()){
        	return;
        }
        if(await InsideNested(newMainElementID)){
        	Interpreter.showErrorMsg("Can't set class as Main inside Nested query.", -3);
        	return;
        }

        //Get ID of all elements in query
        var visited_elems = {};
        await GetComponentIds(selected_elem);
        var elem_ids = _.keys(visited_elems);
        var class_ids = [];

        //Get ID from selection of classes, that are query and set them as condition
        for (const e of elem_ids) {
			const VQElem = await createVQ_Element(e);
			if (await VQElem.isClass() && await VQElem.isRoot()) {
				await VQElem.setClassStyle("condition");
			}
		}


        await selected_elem.setClassStyle("query");

	    async function InsideNested(id){
        	var vq_elem = await createVQ_Element(id);
        	if (await vq_elem.isRoot()){
        		return false;
        	} else {
        		if (await vq_elem.getLinkToRoot()){
        			const linkToRoot = await vq_elem.getLinkToRoot();
					if (linkToRoot && await linkToRoot.link.isSubQuery()) {
						return true;
					}

        			var elements = await vq_elem.getLinkToRoot().link.getElements();
        			if (await vq_elem.getLinkToRoot().start) {
        				return await InsideNested(elements.start.obj._id);
        			} else {
        				return await InsideNested(elements.end.obj._id);
        			}
        		}
        	}
        }

        async function GetComponentIds(vq_elem) {
			visited_elems[vq_elem._id()] = true;

			const links = await vq_elem.getLinks();
			for (const link of links) {
				if (!visited_elems[link.link._id()]) {
					visited_elems[link.link._id()] = true;

					let next_el;
					if (link.start) {
						next_el = await link.link.getStartElement();
					} else {
						next_el = await link.link.getEndElement();
					}

					if (!visited_elems[next_el._id()]) {
						await GetComponentIds(next_el);
					}
				}
			}
		}

	},

});

async function VQsetAssociationName(start, end) {
	const start_element = await createVQ_Element(start);
	const end_element = await createVQ_Element(end);
	const prop = await dataShapes.getProperties({propertyKind:'Connect'}, start_element, end_element);

	if ( prop.data.length == 1 ) {
		let name = prop.data[0].full_name; // TODO vispār te būtu jāskatās arī uz lokāla ns radīšanu/nerādīšanu
		if ( prop.data[0].mark == 'in' ) {
			name = `^${name}`;
		}
		return name;
	}
	else {
		return "";
	}

		/*

		var name_list = [];

		let start_class = await Elements.findOneAsync({_id: start});
		let end_class = await Elements.findOneAsync({_id: end});

		var compart_type = await CompartmentTypes.findOneAsync({name: "Name", elementTypeId: start_class["elementTypeId"]});
		var compart = await Compartments.findOneAsync({compartmentTypeId: compart_type["_id"], elementId: start});
		var compart_type_end = await CompartmentTypes.findOneAsync({name: "Name", elementTypeId: end_class["elementTypeId"]});
		var compart_end = await Compartments.findOneAsync({compartmentTypeId: compart_type_end["_id"], elementId: end});
		var schema = new VQ_Schema();

		if (typeof compart !== "undefined" && typeof compart_end !== "undefined" && schema.classExist(compart["input"]) && schema.classExist(compart_end["input"])) {
			let start_class = schema.findClassByName(compart["input"]);
			let end_class = schema.findClassByName(compart_end["input"]);

			var all_assoc_from_start = start_class.getAllAssociations();
			var all_sub_super_of_end = _.union(end_class.allSuperSubClasses,end_class);
			var possible_assoc_list = _.filter(all_assoc_from_start, function(a) {
				return _.find(all_sub_super_of_end, function(c) {
					return c.localName == a.class && a.type == "=>"
				})
			});

			if(possible_assoc_list.length == 0){
				possible_assoc_list = _.filter(all_assoc_from_start, function(a) {
					return _.find(all_sub_super_of_end, function(c) {
						return c.localName == a.class
					})
				});
			}

			name_list = _.map(possible_assoc_list, function(assoc) {
				var assoc_name = assoc["short_name"];

				if (assoc["type"] == "<=") {
					assoc_name = "^"+assoc_name;
				};
				return assoc_name;
			});
		}

		if(name_list.length == 1) {
			if(!name_list[0].startsWith("^"))return name_list[0];
		}

		return ""
		*/
}


async function getAggregatedField(e, fieldName){
		var parent = $(e.target).closest(".compart-type");
		var parent_id = parent.attr("id");
		var compart_type = await CompartmentTypes.findOneAsync({_id: parent_id});

		// more elegant selection for subCompartmentTypes needed
		var expression_compart_type = _.find(compart_type.subCompartmentTypes[0].subCompartmentTypes, function(sub_compart_type) {
											return sub_compart_type.name == fieldName;
										});

		var exression_id = expression_compart_type._id

		var expression_value = parent.find("." + exression_id).val();

		return parent.find("." + exression_id);
}

function findAttributeInAbstractTable(context, clazz, fieldValue) {
  let fieldInContext = {};

  if (clazz["identification"]["_id"] === context) {
    // attributes
    for (let field of clazz["fields"]) {
      if (field["alias"] === fieldValue || field["exp"] === fieldValue) {
        fieldInContext = field;
        break; // optional: stop once found
      }
    }
  } else {
    for (let subclazz of clazz["children"]) {
      fieldInContext = findAttributeInAbstractTable(context, subclazz, fieldValue);
      if (Object.keys(fieldInContext).length !== 0) {
        break; // optional: stop once a match is found in children
      }
    }
  }

  return fieldInContext;
}


async function generateSymbolTable(notResolveTable, selectedElementIdFromDataSchema) {

	var editor = Interpreter.editor;
	var elem = _.keys(editor.getSelectedElements());
	var abstractQueryTable = {}
    // now we should find the connected classes ...
    if (elem) {
       var selected_elem = await createVQ_Element(elem[0]);
	   if(selected_elem.obj.type === "Line") selected_elem = await selected_elem.getStartElement();
       var visited_elems = {};
       async function GetComponentIds(vq_elem) {
			visited_elems[vq_elem._id()] = true;

			const links = await vq_elem.getLinks();
			for (const link of links) {
				if (!visited_elems[link.link._id()]) {
					visited_elems[link.link._id()] = true;

					let next_el;
					if (link.start) {
						next_el = await link.link.getStartElement();
					} else {
						next_el = await link.link.getEndElement();
					}

					if (!visited_elems[next_el._id()]) {
						await GetComponentIds(next_el);
					}
				}
			}
	  }


       await GetComponentIds(selected_elem);

		var elem_ids = _.keys(visited_elems);
		var queries = await genAbstractQueryForElementList(elem_ids, [selectedElementIdFromDataSchema]);
		if (!notResolveTable) {
			for (const q of queries) {
				//_.each(queries,async function(q) {
				abstractQueryTable = await resolveTypesAndBuildSymbolTable(q);
			}
		} else {
			abstractQueryTable = queries[0];
		}
		//)
	} else {
		// nothing selected
	}

	if(Session.get("activeElement") !== null && typeof abstractQueryTable["symbolTable"] !== 'undefined' && typeof abstractQueryTable["symbolTable"][Session.get("activeElement")] !== 'undefined')return {symbolTable:abstractQueryTable["symbolTable"][Session.get("activeElement")], rootSymbolTable:abstractQueryTable["symbolTable"]["root"], abstractQueryTable:abstractQueryTable["root"], symbolTableFull:abstractQueryTable["symbolTable"]};
    return {symbolTable:{}, rootSymbolTable:{}, abstractQueryTable:abstractQueryTable["root"], symbolTableFull:abstractQueryTable["symbolTable"]};
  }

  // string -> int
// function checks if the text is uri
// 0 - not URI, 3 - full form, 4 - short form
 function isURI(text) {
  if(text.indexOf("://") !== -1)
    return 3;
  else
    if(text.indexOf(":") !== -1) return 4;
  return 0;
};


function make_group_by_instance_value(input) {
	return "{group} " + input;
}

async function findNamedGraphsInQuery(elem, visitedClasses){
	let namedGraphs = [];
	let elemLinks = await elem.getLinks();
	for(let e = 0; e < elemLinks.length; e++){
		let clazzId;
		if(elemLinks[e]["start"] === false){
			clazzId = elemLinks[e]["link"]["obj"]["endElement"];
		} else {
			clazzId = elemLinks[e]["link"]["obj"]["startElement"];
		}
		let clazz = await createVQ_Element(clazzId);
		if(visitedClasses.indexOf(clazzId) === -1) {
			visitedClasses.push(clazzId);
			let nGraphs = await clazz.getNamedGraphs();
			for(let ng = 0; ng < nGraphs.length; ng++){
				namedGraphs.push({graph:nGraphs[ng].graph, graphInstruction: nGraphs[ng].graphInstruction})
				var list = {compartmentId: nGraphs[ng]["_id"],
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};
				await Utilities.callMeteorMethodAsync("removeCompartment", list);
			}
			namedGraphs = namedGraphs.concat(await findNamedGraphsInQuery(clazz, visitedClasses))
		}
	}

	return namedGraphs;
}

function setSchemaNamesForQuery(abstractQueryTable, schemaNamesTable, parentSchemaName){
	let schemaName = parentSchemaName;
	// console.log("setSchemaNamesForQuery", abstractQueryTable, abstractQueryTable["graphsService"], parentSchemaName)
	if(typeof abstractQueryTable["graphsService"] !== "undefined" && abstractQueryTable["graphsService"] !== null && typeof abstractQueryTable["graphsService"]["schema"] !== "undefined" && abstractQueryTable["graphsService"]["schema"] !== null && abstractQueryTable["graphsService"]["schema"] !== ""){
		schemaNamesTable[abstractQueryTable.identification._id] = abstractQueryTable["graphsService"]["schema"];
		schemaName = abstractQueryTable["graphsService"]["schema"];
	} else {
		schemaNamesTable[abstractQueryTable.identification._id] = parentSchemaName;
	}
	if(typeof abstractQueryTable["graphsServiceLink"] !== "undefined" && abstractQueryTable["graphsServiceLink"] !== null && typeof abstractQueryTable["graphsServiceLink"]["schema"] !== "undefined" && abstractQueryTable["graphsServiceLink"]["schema"] !== null && abstractQueryTable["graphsServiceLink"]["schema"] !== ""){
		schemaNamesTable[abstractQueryTable.linkIdentification._id] = abstractQueryTable["graphsServiceLink"]["schema"];
		schemaNamesTable[abstractQueryTable.identification._id] = abstractQueryTable["graphsServiceLink"]["schema"];
		schemaName = abstractQueryTable["graphsServiceLink"]["schema"];
	} else {
		schemaNamesTable[abstractQueryTable.identification._id] = schemaName;
		if(typeof abstractQueryTable.linkIdentification !== "undefined")schemaNamesTable[abstractQueryTable.linkIdentification._id] = parentSchemaName;
	}
	for(let c = 0; c < abstractQueryTable.children.length; c++){
		schemaNamesTable = setSchemaNamesForQuery(abstractQueryTable.children[c], schemaNamesTable, schemaName)
	}
	return schemaNamesTable;
}

async function getSchemaNameForElement(elem_id, is_data_schema = false) {
	let selected_elem_id = elem_id;
	if (typeof selected_elem_id === "undefined" || selected_elem_id === null) selected_elem_id = Session.get("activeElement");
	let tempSymbolTable = await generateSymbolTable(true, is_data_schema ? selected_elem_id : null);
	let sc = await dataShapes.schema.schema;
	let schemaNames = setSchemaNamesForQuery(tempSymbolTable["abstractQueryTable"], [], sc);
	let schemaNameFromABS = schemaNames[selected_elem_id];

	let ontologies = dataShapes.getOntologiesSync();
	if(typeof ontologies !== "undefined"){
		for(let o = 0; o < ontologies.length; o++){
			if(ontologies[o]["display_name"] === schemaNameFromABS) {
				schemaNameFromABS = ontologies[o]["db_schema_name"];
				break;
			}
		}
	}

	return schemaNameFromABS;
}


export {
  generateSymbolTable,
  findAttributeInAbstractTable,
  isURI,
  setSchemaNamesForQuery,
  getSchemaNameForElement,
}
