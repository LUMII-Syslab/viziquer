import { Interpreter } from '/client/lib/interpreter'
import { Projects, Elements, Compartments, ElementTypes, CompartmentTypes  } from '/libs/platform/collections'

Interpreter.customMethods({
	
	VQTransformLinkToSubQuery:function(classId){
		
		// var classObj = new VQ_Element(classId);
        // if (classObj && classObj.isClass()) {
			// if(!classObj.isRoot()){
				// var classUp = classObj.getLinkToRoot();    
				// var vq_link_obj = new VQ_Element(classUp.link.obj._id);
				// if(vq_link_obj.isLink() && vq_link_obj.getNestingType() != "GLOBAL_SUBQUERY" && vq_link_obj.getNestingType() != "SUBQUERY" && vq_link_obj.getNestingType() != "CONDITION"){
					// vq_link_obj.setNestingType("SUBQUERY");
				// }
			// }	
		// }
	},
	

	UpdateInstanceCompartment: function(src_id, input, mapped_value, elemStyleId, compartStyleId) {
		let compart_type = this;

		let value = input;

		let elem = new VQ_Element(Session.get("activeElement"));
		let group_by_value = elem.getCompartmentValue("Group by this");

		if (input != "" && input != null) {
			let proj = Projects.findOne({_id: Session.get("activeProject")});
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

			elem.setCompartmentValue("Group by this", group_by_value, "", false);
		}

		else {
			if (group_by_value == "true") {
				elem.setCompartmentValue("Group by this", group_by_value, group_by_value, false);
			}
		}

		// elem.setCompartmentValue("Instance", input, value, false);
		return Dialog.updateCompartmentValue(compart_type, input, value, src_id);
	},


	UpdateGroupByCompartment: function(src_id, input, mapped_value, elemStyleId, compartStyleId) {
		let compart_type = this;
		let value = input;

		let elem = new VQ_Element(Session.get("activeElement"));
		let instance_input = elem.getCompartmentValue("Instance") || "";

		// if (instance_input == "") {
			// value = "";
			// if (input != "true") {
				// value = "";
			// }
		// }
		// else {
			value = "";
			if (input == "true") {
				instance_new_value = make_group_by_instance_value(instance_input);
				elem.setCompartmentValue("Instance", instance_input, instance_new_value, false);
			}
			else {
				elem.setCompartmentValue("Instance", instance_input, instance_input, false);
			}
		// }
	
		// elem.setCompartmentValue("Group by this", input, value, false);
		return Dialog.updateCompartmentValue(compart_type, input, value, src_id);
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

	// 	 if(comp_val_inst != null && comp_val_inst != ""){
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
	// 	   else if ( comp_val_inst != null && comp_val_group == "false") {
	// 	     elem.setCompartmentValue("Instance", comp_val_inst, comp_val_inst, false);
	// 	   }
	// 	 }
 	},
	
	VQsetDistinct: function(params) {
		 var act_elem = Session.get("activeElement");
		 var elem = new VQ_Element(act_elem);
		 // var comp_val_distinct = elem.getCompartmentValue("Distinct");
		 var comp_val_distinct = params["input"];

		 // elem.setCompartmentValue("Distinct", params["input"], params["value"]);
 		 if (comp_val_distinct != "true") {
		   elem.setCompartmentValue("Distinct", "", "");
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
  
	VQgetGraphInstructionsClass: function() {
	return  [
	{input:"FROM",value:"FROM"},
	{input:"FROM NAMED",value:"FROM NAMED"},
	{input:"GRAPH",value:"GRAPH"},
	{input:"SERVICE",value:"SERVICE"}
	]
  },
  
	VQgetAggregateNames: function() {

		 var act_elem = Session.get("activeElement");
		 if (!act_elem) {
 			return [];
 		}
 		var act_comp = Compartments.findOne({elementId: act_elem})
 		if (!act_comp) {
 			return [];
 		}

 		var elem_type = ElementTypes.findOne({name: "Class"});
 		if (elem_type && act_comp["elementTypeId"] != elem_type._id) {
 			return [];
 		}

 		//Active element is given as Class type element
 		var atr_names = [];

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
 					var att_val = "avg("+att["name"]+")";
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
						var att_val = "avg("+key+")";
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
							var att_val = "avg("+key+")";
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

		atr_names = _.union([{input:"count(.)",value:"count(.)"},{input:"count_distinct(.)",value:"count_distinct(.)"}], atr_names);

 	 	atr_names = _.uniq(atr_names, false, function(item) {
 	 		return item["input"];
 	 	});

 		return atr_names;

	},
	
	VQsetIsCondition: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt ="PLAIN";
			 if (input=="true") { lt="CONDITION"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setNestingType(lt);
		}
	},

	VQsetIsSubquery: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "PLAIN";
			 if (input=="true") { lt="SUBQUERY"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setNestingType(lt);
		}
	},

	VQsetIsGlobalSubquery: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "PLAIN";
			 if (input=="true") { lt="GLOBAL_SUBQUERY"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setNestingType(lt);
		}
	},
	
	VQsetIsGraphToContents: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "PLAIN";
			 if (input=="true") { lt="GRAPH"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setNestingType(lt);
		}
	},

	VQsetIsOptional: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "REQUIRED";
			 if (input=="true") { lt="OPTIONAL"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setLinkType(lt);
		}
	},

	VQsetIsNegation: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "REQUIRED";
			 if (input=="true") {
			 	lt="NOT"
			 }

			 var elem = new VQ_Element(c["elementId"]);
			 elem.setLinkType(lt);
		}
	},
	
	VQsetIsFilterExists: function(params) {

		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "REQUIRED";
			 if (input=="true") { lt="FILTER_EXISTS"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setLinkType(lt);
		}
	},

	VQsetNestingType: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var nestingType = params["value"];
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setNestingType(nestingType);
		}
	},

	VQSetHideDefaultLinkName: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var hide = (input == "true");
			 var elem = new VQ_Element(c["elementId"]);
			 elem.hideDefaultLinkName(hide);
		}
	},

	VQbeforeCreateLink: function(params) {
		console.log("VQbeforeCreateLink");
		// console.log(params);
		Interpreter.destroyErrorMsg();
		var startLink = new VQ_Element(params["startElement"]);
		var endLink = new VQ_Element(params["endElement"]);	 

		if (startLink.getRootId() == endLink.getRootId()) {
			// console.log("inside one query");
			return true;
		} else if (!startLink.isRoot() && !endLink.isRoot() &&
			 !(startLink.getLinkToRoot() === undefined) && !(endLink.getLinkToRoot() === undefined)) {
			//If both condition classes are connected to different query classes
			if (startLink.getRootId() != endLink.getRootId()){
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

	VQafterCreateLink: function(params) {
		var linkName = VQsetAssociationName(params["startElement"], params["endElement"])
		console.log("VQafterCreateLink", params, linkName);
		//console.log(params);
		Interpreter.destroyErrorMsg();
		var link = new VQ_Element(params["_id"]);
		
		link.setName(linkName);
		
		link.setLinkType("REQUIRED");		 
		if (link.getStartElement().isRoot() && link.getEndElement().isRoot()){
		 	link.getEndElement().setClassStyle("condition");
		} else if (!link.getStartElement().isRoot() && link.getEndElement().isRoot()) {
			if (link.getStartElement().getLinkToRoot().start == false){
				console.log("condition class has no connected query class")
			} else {
				link.getEndElement().setClassStyle("condition");
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
		// console.log("SSSAAASSS");
		var ct = CompartmentTypes.findOne({name: "Inverse Link"});
		var ctn = CompartmentTypes.findOne({name: "Name", elementTypeId: Session.get("activeElementType")});
		var act_elem = Session.get("activeElement");

		if (act_elem && ct && ctn) {
			var c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});
			var cn = Compartments.findOne({elementId: act_elem, compartmentTypeId: ctn["_id"]});
			var c_cal = Compartments.findOne({elementId: act_elem, input: {$nin: ["true", "false"]}});

			if (c && cn) {

				if (c["input"] == "true" && String(c_cal["value"]).indexOf("inv") == -1){

					// Dialog.updateCompartmentValue(ct, "true", "<inv>", c["_id"]);
					Dialog.updateCompartmentValue(ctn, "inv(".concat(cn["input"], ")"), "inv(".concat(cn["input"], ")"), cn["_id"]);
				}
				else if (c["input"] == "false" && String(c_cal["value"]).indexOf("inv") > -1) {
					var s = cn["value"].indexOf("(");
					var e = cn["value"].lastIndexOf(")");
					var name = cn["value"].substring(s + 1, e);

					// Dialog.updateCompartmentValue(ct, "false", "", c["_id"]);
					Dialog.updateCompartmentValue(ctn, name, name, cn["_id"]);
				}
			}
		}
	},

	VQsetLinkName: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var link = new VQ_Element(c["elementId"]);
			 link.hideDefaultLinkName(link.shouldHideDefaultLinkName(), params["input"], params["value"]);

			 // link.setIsInverseLink(c["value"].substring(0,4)=="inv(");
		}
	},

	VQsetClassName: function(params) {
		let elem_name = params["input"];
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			var elem = new VQ_Element(c["elementId"]);

			// if (elem.isIndirectClassMembership() && elem.getName() !== null && elem.getName() !== "") {
			if (elem.isIndirectClassMembership() && elem_name !== null && elem_name !== "") {
				let elem_name_pref = ".. " + elem_name;
				elem.setNameValue(elem_name_pref, elem_name);
				// elem.setNameValue(".. "+elem.getName());
			}
			else {
				if (elem_name !== null) {
					elem.setNameValue(elem_name, elem_name);
					// elem.setNameValue(elem.getName());
				}
			}

       		_.each(elem.getLinks().map(function(l) {return l.link}), function(link) {
				link.hideDefaultLinkName(link.shouldHideDefaultLinkName());
			});
		}
	},

	VQsetClassNameValue: function(params) {
		let indirectClassMembership = params["input"];
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			var elem = new VQ_Element(c["elementId"]);
			let elem_name = elem.getName();
			if (indirectClassMembership == "true" && elem_name !== null && elem_name !== "") {
				var elem_name_pref = ".. " + elem_name;
				elem.setNameValue(elem_name_pref, elem_name);	
			}
			else {
				if (elem_name !== null) {
					elem.setNameValue(elem_name, elem_name);
				}
			};
		};
	},

	VQSetHideDefaultLinkValue: function(a,b,c){
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj && proj.autoHideDefaultPropertyName == true) {
			 return "true";
		} else {
			 return "false";
		};
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
	
	VQsetGraphPrefix: function(val) {
		var act_elem = Session.get("activeElement");
		var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid
 		var compart_type = CompartmentTypes.findOne({name: "Graph instruction", elementTypeId: act_el["elementTypeId"]});
		var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});	
		if (compart) return "{"+compart.value+": ";
		return "{";
	},
	
	VQsetGraphPrefixFromInstructions: function(params) {

			var act_elem = Session.get("activeElement");
			var elem = new VQ_Element(act_elem);

            if (typeof elem.getGraph() !== "undefined" && elem.getGraph() !== null && elem.getGraph() !== "") {
				var instrunction = params.value;
				if(instrunction!= null && instrunction != "") instrunction = instrunction+": ";
				elem.setGraph(elem.getGraph(), "{" + instrunction + elem.getGraph() + "}");
			} 
	},
		
	visualizeSPARQL: function(q) {
		var x = 10;
		var y = 10;
		var queries = q;
		if(typeof q === "undefined"){
			let yasqe3 = Template.sparqlForm.yasqe3.get();
			var query_text = yasqe3.getValue();
			
			var queries = query_text.split("--------------------------------------------\n");
		
			var editor = Interpreter.editor;
			
			var e;
				if (editor.data.ev) {
					e = editor.data.ev;
				}

				var x, y;
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

	AggregateWizard: function(e) {
		var parent = $(e.target).closest(".compart-type");
		var parent_id = parent.attr("id");
		var compart_type = CompartmentTypes.findOne({_id: parent_id});

		// more elegant selection for subCompartmentTypes needed
		var expression_compart_type = _.find(compart_type.subCompartmentTypes[0].subCompartmentTypes, function(sub_compart_type) {
											return sub_compart_type.name == "Expression";
										});
		var exression_id = expression_compart_type._id;
		var expression_value = parent.find("." + exression_id).val();
		
		 Template.AggregateWizard.expressionField.set(getAggregatedField(e, "Expression"))
		 Template.AggregateWizard.aliasField.set(getAggregatedField(e, "Field Name"))
		 Template.AggregateWizard.requireField.set(getAggregatedField(e, "Require Values"))

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

		if(expression_value !== null && expression_value != "" &&
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
        var schema = new VQ_Schema();

        if (classId) {
            var classObj = new VQ_Element(classId);
            if (classObj && classObj.isClass()) {
            	//Display/at least/at most visibility
            	if(classObj.isRoot()) {
            		Template.AggregateWizard.showDisplay.set("none");
            		Template.AggregateWizard.startClassId.set(classId);
            	}else {
            		var classUp = classObj.getLinkToRoot();
            		Template.AggregateWizard.showDisplay.set("none");
            		Template.AggregateWizard.linkId.set(classUp.link.obj._id);
            		//console.log("root id = ", getRootId(classObj.obj._id));
            		//Template.AggregateWizard.startClassId.set(getRootId(classObj.obj._id));
            		if (classUp.start) {
        				Template.AggregateWizard.startClassId.set(classUp.link.getElements().start.obj._id);
        			} else {
        				Template.AggregateWizard.startClassId.set(classUp.link.getElements().end.obj._id);
        			}            		
            	}

                //Attribute generation
                var class_name = classObj.getName();
                if (schema.classExist(class_name)) {
                    var klass = schema.findClassByName(class_name);

                    _.each(klass.getAllAttributes(), function(att){
						attr_list.push({attribute: att["name"]});
                    })
					
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
						if(Template.AggregateWizard.expression.get() != "")Template.AggregateWizard.defaultAlias.set("");             
						else Template.AggregateWizard.defaultAlias.set(class_name.charAt(0) + "_count");
						
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
	
	AddAggregate: function(e) {

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
        var schema = new VQ_Schema();

        if (classId) {
            var classObj = new VQ_Element(classId);
            if (classObj && classObj.isClass()) {
            	//Display/at least/at most visibility
            	if(classObj.isRoot()) {
            		Template.AggregateWizard.showDisplay.set("none");
            		Template.AggregateWizard.startClassId.set(classId);
            	}else {
            		var classUp = classObj.getLinkToRoot();
            		Template.AggregateWizard.showDisplay.set("block");
            		Template.AggregateWizard.linkId.set(classUp.link.obj._id);
            		//console.log("root id = ", getRootId(classObj.obj._id));
            		//Template.AggregateWizard.startClassId.set(getRootId(classObj.obj._id));
            		if (classUp.start) {
        				Template.AggregateWizard.startClassId.set(classUp.link.getElements().start.obj._id);
        			} else {
        				Template.AggregateWizard.startClassId.set(classUp.link.getElements().end.obj._id);
        			}            		
            	}

                //Attribute generation
                var class_name = classObj.getName();
                if (schema.classExist(class_name)) {
                    var klass = schema.findClassByName(class_name);

                    _.each(klass.getAllAttributes(), function(att){
						attr_list.push({attribute: att["name"]});
                    })
					
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
						if(Template.AggregateWizard.expression.get() != "")Template.AggregateWizard.defaultAlias.set("");             
						else Template.AggregateWizard.defaultAlias.set(class_name.charAt(0) + "_count");
						
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
	
	setIsVisibleForGraphFields: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});	
		if (proj) {	
			if (proj.showGraphServiceCompartments == true) return true;
		}
		return false;
	},
	
	AddSelectThis: function(){
		
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

		 var vq_obj = new VQ_Element(selected_elem_id);
		 var fields = vq_obj.getFields();
		 // Šis cikls joprojām strādā pareizi
		 for(let field in fields){
			 if(typeof fields[field] !== "function" && fields[field]["exp"] == "(select this)") return; 
		 }
		 vq_obj.addField("(select this)",null,false,false,false);
		};

		return;
	},
	
	//Adds outer query as [ ] class with ++ link
	addOuterQuery: function(){
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
			Interpreter.destroyErrorMsg();

			var currentElement = new VQ_Element(selected_elem_id);
			if (currentElement.isClass() && currentElement.isRoot()) {
				currentElement.setClassStyle("condition");
				//coordinates to place new Box and create link
				var d = 60; //distance between boxes
				var locClass = currentElement.getNewLocation(d); console.log(locClass);
				var coordX = locClass.x + Math.round(locClass.width/2);
				var coordY = locClass["y"] - d; 
				var locLink = [coordX, locClass.y, coordX, coordY];
				
				Create_VQ_Element(function(cl){
					cl.setName("[ ]");
					var proj = Projects.findOne({_id: Session.get("activeProject")});
					cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);					
					Create_VQ_Element(function(lnk) {
						lnk.setName("++");
						lnk.setLinkType("REQUIRED");
						lnk.setNestingType("SUBQUERY");
						// var proj = Projects.findOne({_id: Session.get("activeProject")});
						// lnk.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
				 	}, locLink, true, cl, currentElement);
				 	
				 	var proj = Projects.findOne({_id: Session.get("activeProject")});
					cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
				}, locClass);											
			} else {
				Interpreter.showErrorMsg("Outer class can be added only to main query class (orange box).", -3);
			}

		} else {
			Interpreter.showErrorMsg("Outer class can be added only to main query class (orange box).", -3);
		}
	},

	setAsMainClass: function(){
		Interpreter.destroyErrorMsg();
		//Based on "generate SPARQL from component" realisation
        var newMainElementID = Session.get("activeElement");        
        var selected_elem = new VQ_Element(newMainElementID);
        //Check if any action is needed
        if(!selected_elem.isClass()){
            console.log("Selected element is not class");
            return;
        }
        if (selected_elem.isRoot()){
        	return;
        }
        if(InsideNested(newMainElementID)){
        	Interpreter.showErrorMsg("Can't set class as Main inside Nested query.", -3);
        	return;
        }         
                       
        //Get ID of all elements in query
        var visited_elems = {};
        GetComponentIds(selected_elem);       
        var elem_ids = _.keys(visited_elems);
        var class_ids = [];

        //Get ID from selection of classes, that are query and set them as condition
        _.each(elem_ids, function(e){
            var VQElem = new VQ_Element(e);         
            if (VQElem.isClass() && VQElem.isRoot()){
            	VQElem.setClassStyle("condition");
            }
        })

        selected_elem.setClassStyle("query");

	    function InsideNested(id){
        	var vq_elem = new VQ_Element(id);
        	if (vq_elem.isRoot()){
        		return false;
        	} else {
        		if (vq_elem.getLinkToRoot()){
        			if (vq_elem.getLinkToRoot().link.isSubQuery()) {
        				return true;
        			}

        			var elements = vq_elem.getLinkToRoot().link.getElements();
        			if (vq_elem.getLinkToRoot().start) {
        				return InsideNested(elements.start.obj._id);
        			} else {
        				return InsideNested(elements.end.obj._id);
        			}
        		}
        	}
        }

        function GetComponentIds(vq_elem) {
            visited_elems[vq_elem._id()] = true;
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
	},
	
});

VQsetAssociationName = function(start, end) {
		var start_element = new VQ_Element(start);
		var end_element = new VQ_Element(end);
		
		var name_list = [];
		
		var start_class = Elements.findOne({_id: start});
		var end_class = Elements.findOne({_id: end});

		var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: start_class["elementTypeId"]});
		var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: start});
		var compart_type_end = CompartmentTypes.findOne({name: "Name", elementTypeId: end_class["elementTypeId"]});
		var compart_end = Compartments.findOne({compartmentTypeId: compart_type_end["_id"], elementId: end});
		var schema = new VQ_Schema();

		if (typeof compart !== "undefined" && typeof compart_end !== "undefined" && schema.classExist(compart["input"]) && schema.classExist(compart_end["input"])) {
			var start_class = schema.findClassByName(compart["input"]);
			var end_class = schema.findClassByName(compart_end["input"]);
				
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
}


getAggregatedField = function(e, fieldName){
		var parent = $(e.target).closest(".compart-type");
		var parent_id = parent.attr("id");
		var compart_type = CompartmentTypes.findOne({_id: parent_id});

		// more elegant selection for subCompartmentTypes needed
		var expression_compart_type = _.find(compart_type.subCompartmentTypes[0].subCompartmentTypes, function(sub_compart_type) {
											return sub_compart_type.name == fieldName;
										});

		var exression_id = expression_compart_type._id

		var expression_value = parent.find("." + exression_id).val();

		return parent.find("." + exression_id);
}

findAttributeInAbstractTable = function(context, clazz, fieldValue){
	var fieldInContext = {};

	if(clazz["identification"]["_id"] == context){
		//attributes
		_.each(clazz["fields"],function(field) {
			if(field["alias"] == fieldValue || field["exp"] == fieldValue){
				fieldInContext = field;
			}
		})
	} else{

		_.each(clazz["children"],function(subclazz) {
			fieldInContext = findAttributeInAbstractTable(context, subclazz, fieldValue);
		})
	}

	return fieldInContext;

}

generateSymbolTable = async function() {
 // console.log("    generateSymbolTable")
	var editor = Interpreter.editor;
	var elem = _.keys(editor.getSelectedElements());
	var abstractQueryTable = {}
		
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
       var queries = await genAbstractQueryForElementList(elem_ids, null); 
	  
	  
	   for (const q of queries) {
	    //_.each(queries,async function(q) {
		abstractQueryTable = await resolveTypesAndBuildSymbolTable(q);	
       }
	   //)
    } else {
      // nothing selected
    }

	// console.log(abstractQueryTable);
	if(Session.get("activeElement") != null && typeof abstractQueryTable["symbolTable"] !== 'undefined' && typeof abstractQueryTable["symbolTable"][Session.get("activeElement")] !== 'undefined')return {symbolTable:abstractQueryTable["symbolTable"][Session.get("activeElement")], rootSymbolTable:abstractQueryTable["symbolTable"]["root"], abstractQueryTable:abstractQueryTable["root"], symbolTableFull:abstractQueryTable["symbolTable"]};
    return {symbolTable:{}, rootSymbolTable:{}, abstractQueryTable:abstractQueryTable["root"], symbolTableFull:abstractQueryTable["symbolTable"]};
  }
  
  // string -> int
// function checks if the text is uri
// 0 - not URI, 3 - full form, 4 - short form
isURI = function(text) {
  if(text.indexOf("://") != -1)
    return 3;
  else
    if(text.indexOf(":") != -1) return 4;
  return 0;
};


function make_group_by_instance_value(input) {
	return "{group} " + input;
}

