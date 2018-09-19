Interpreter.customMethods({

	setParameters: function(list) {

		console.log("SetParametrs called, not implemented");
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

	TestPr: function() {

		var schema = new VQ_Schema();
  		//console.log(schema);
		//console.log(schema.findClassByName("Course").getAllAssociations());
		//console.log(schema.findClassByName("Student").getAllAttributes());
		//console.log(schema.getAllClasses());
		//console.log(schema.findClassByName("Teacher3"));
		//console.log(schema.resolveClassByName("Teacher3"));
		//console.log(schema.resolveLinkByName("teaches"));
		//console.log(schema.resolveAttributeByName("Nationality" ,"nCode"));
	},

	VQsetClassTypeValue: function(list) {
		//class->element->extensions->after create elements
	},

	VQsetEnabledFieldsFromClassTypeChange: function() {
		//class->compartments->ClassType->extensions->after update
		//params: (compartType, compartId)
	},
	VQgetClassNames: function() {
		//Class -> compartments->Name->extension->dynamicDropDown
		var schema = new VQ_Schema();
		var cls = schema.getAllClasses();
		var class_names = [];
		if (_.size(cls) > 0) {

			//Create array of needed structure from class' names
			class_names = cls.map(function (c) {
				return {value: c["name"], input: c["name"]};
			});

			class_names = _.sortBy(class_names, "input");

		 	class_names =  _.uniq(class_names, false, function(c) {
		 		return c["input"];
		 	});
	 	};

		class_names.push({input:"[ ]", value:"[ ]"});
		class_names.push({input:"[ + ]", value:"[ + ]"});

		return class_names;

	},

	VQgetClassNamesOld: function() {
		//Class -> compartments->Name->extension->dynamicDropDown
		var cls = Classes.find();

		if (cls.count() > 0) {

			//Create array of needed structure from class' names
			var class_names = cls.map(function (user) {
				return {value: user["name"], input: user["name"],};
			});

			class_names = _.union([{value: " ", input: " ", }], class_names);
			class_names = _.sortBy(class_names, "input");

		 	var is_sorted = false;
		 	return _.uniq(class_names, is_sorted, function(item) {
		 		return item["input"];
		 	});
	 	}

	},

	VQsetInstance: function() {
		//class -> compartments->Name->extension->AfterUpdate
		//params: (compartType, compartId)
	},

	VQsetShowInstanceName: function() {
		//class -> compartments->Instance->extension->AfterUpdate
		//params: (compartType, compartId)
	},

	VQattributeGrammar: function() {
	},

	VQsetIsNegationAttribute: function() {

	console.log("is negations enetered");

	},

	VQsetIsOptionalAttribute: function() {
		console.log("is optional enetered");
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



 		}


 	 	// return atr_names;
 		atr_names = _.sortBy(atr_names, "input");

		atr_names = _.union([{input:"count(.)",value:"count(.)"},{input:"count_distinct(.)",value:"count_distinct(.)"}], atr_names);

 	 	atr_names = _.uniq(atr_names, false, function(item) {
 	 		return item["input"];
 	 	});

 		return atr_names;

	},
	VQgetAttributeNames: function() {

		//console.log("VQgetAttributeNames executed");

		//atribute value for class
		var act_elem = Session.get("activeElement");
		//Active element does not exist OR has no Name OR is of an unpropriate type
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
		var atr_names = [{value: " ", input: " ", }];

		var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid

		if (act_el) {
		//check if Class name is defined for active element
			var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});

			if (!compart_type) {
				return atr_names;
			}

			var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
			if (!compart) {
				return atr_names;
			}

		//Read attribute values from DB

			var schema = new VQ_Schema();

			if (schema.classExist(compart["input"])) {
				var klass = schema.findClassByName(compart["input"]);

				_.each(klass.getAllAttributes(), function(att){
					var att_val = att["name"];
					atr_names.push({value: att_val, input: att_val});
				})
			}



		}


	 	// return atr_names;
		atr_names = _.sortBy(atr_names, "input");

	 	atr_names = _.uniq(atr_names, false, function(item) {
	 		return item["input"];
	 	});

		atr_names.push({input:"(.)",value:"(.)"});
		atr_names.push({input:"*",value:"*"});
		atr_names.push({input:"**",value:"**"});

		return atr_names;


	},

	VQgetAttributeNamesOld: function() {

		console.log("VQgetAttributeNames executed");

		//atribute value for class
		var act_elem = Session.get("activeElement");
		//Active element does not exist OR has no Name OR is of an unpropriate type
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
		var atr_names = [{value: " ", input: " ", }];

		var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid

		if (act_el) {
		//check if Class name is defined for active element
			var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});

			if (!compart_type) {
				return atr_names;
			}

			var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});
			if (!compart) {
				return atr_names;
			}

		//Read attribute values from DB
			//direct
			var klass = Classes.findOne({name: compart["input"]});

			if (!klass) {
				console.error("VQgetAttributeNames: No Classs with such Name");
				return ;
			}

			_.each(klass["Attributes"], function(att){
				var att_val = att["localName"];
				atr_names.push({value: att_val, input: att_val});
			})

			//from Super Class
			_.each(klass["AllSuperClasses"], function(supC){

				var cs_val = supC["localName"];
				var cs_list = Classes.findOne({name: cs_val});

				if (cs_list) {

					_.each(cs_list["Attributes"], function(sca){
						var att_val = sca["localName"];
						atr_names.push( {value: att_val, input: att_val} );
					})
				}
			})

			//from Sub Class
			_.each(klass["AllSubClasses"], function(supC){

				var cs_val = supC["localName"];
				var cs_list = Classes.findOne({name: cs_val});

				if (cs_list) {

					_.each(cs_list["Attributes"], function(sca){
						var att_val = sca["localName"];
						atr_names.push( {value: att_val, input: att_val} );
					})
				}
			})
		}

	 	//Chech for Optional-Negation check-boxes simultaneous active
	 	compart_type = CompartmentTypes.findOne({name: "Attributes", elementTypeId: act_el["elementTypeId"]});
	 	if (compart_type) {

	 		Compartments.find({compartmentTypeId: compart_type["_id"], elementId: Session.get("activeElement")}).forEach(function(c){
	 			if(c["subCompartments"]["Attributes"]["Attributes"]["IsNegation"]["input"] == "true" &&
	 				c["subCompartments"]["Attributes"]["Attributes"]["IsOptional"]["input"] == "true") {


	 				console.error("Choose optional OR negation type");

	 				// c["subCompartments"]["Attributes"]["Attributes"]["IsNegation"]["input"] =  "false";
	 				// c["subCompartments"]["Attributes"]["Attributes"]["IsOptional"]["input"] = "false";
	 				// Dialog.updateCompartmentValue(ct, "false", "", compart_id);
	 			}
	 		})
	 	}

	 	// return atr_names;
		atr_names = _.sortBy(atr_names, "input");
	 	var is_sorted = false;

	 	return _.uniq(atr_names, is_sorted, function(item) {
	 		return item["input"];
	 	});


	},

	VQsetIsGroup: function() {
		//arrow ->compartments->"Subquery Link"->extensions->after Update
		//params: (compartType, compartId)
	},

	VQsetIsCondition: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt ="PLAIN";
			 if (input=="true") { lt="CONDITION"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setLinkQueryType(lt);
		}
	},

	VQsetIsSubquery: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "PLAIN";
			 if (input=="true") { lt="SUBQUERY"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setLinkQueryType(lt);
		}
	},

	VQsetIsGlobalSubquery: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var input = params["input"];
			 var lt = "PLAIN";
			 if (input=="true") { lt="GLOBAL_SUBQUERY"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setLinkQueryType(lt);
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
			 if (input=="true") { lt="NOT"};
			 var elem = new VQ_Element(c["elementId"]);
			 elem.setLinkType(lt);
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

	VQafterCreateLink: function(params) {
		 //console.log(params);
		 var link = new VQ_Element(params["_id"]);
		 link.setLinkType("REQUIRED");
	},
	VQgetAssociationIsInverse: function() {
		////arrow ->compartments->Inverse link->extensions->dynamic default value
		//return: String
	},

	VQsetSubQueryInverseLink: function() {
		//arrow ->compartments->Inverse Link->extensions->after Update
		//params: (compartType, compartId)
		console.log("SSSAAASSS");
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

	VQgetAssociationName: function() {
		//arrow ->compartments->extensions->dynamic default value
		//return: String
	},

	VQsetLinkName: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var link = new VQ_Element(c["elementId"]);
			 link.hideDefaultLinkName(link.shouldHideDefaultLinkName());

			 link.setIsInverseLink(c["value"].substring(0,4)=="inv(");
		}
	},

	VQsetClassName: function(params) {
		var c = Compartments.findOne({_id:params["compartmentId"]});
		if (c) {
			 var elem = new VQ_Element(c["elementId"]);
       _.each(elem.getLinks().map(function(l) {return l.link}), function(link) {
					link.hideDefaultLinkName(link.shouldHideDefaultLinkName());
			 });
		}
	},

	VQgetAssociationNames: function() {
		//arrow ->compartments->extensions-> dynamic drop down
		var act_elem = Session.get("activeElement");
		var name_list = [{value: " ", input: " ", }];
		if (act_elem) {
			var vq_link = new VQ_Element(act_elem["_id"]);
			if (vq_link.isLink()) {
  			var myschema = new VQ_Schema();
				var start_class = myschema.findClassByName(vq_link.getStartElement().getName());
				var end_class = myschema.findClassByName(vq_link.getEndElement().getName());
				if (start_class && end_class) {
					var all_assoc_from_start = start_class.getAllAssociations();
					var all_sub_super_of_end = _.union(end_class.allSuperSubClasses,end_class);
					var possible_assoc_list = _.filter(all_assoc_from_start, function(a) {
					 	return _.find(all_sub_super_of_end, function(c) {
							 	return c.localName == a.class
					 	})
			  	});
					name_list = _.union(name_list, _.map(possible_assoc_list, function(assoc) {
						var assoc_name = assoc["name"];
						if (assoc["type"] == "<=") {
							assoc_name = "inv("+assoc_name+")";
						};
						return {value:assoc_name, input:assoc_name};
					}))
				};
			};
		};
		return name_list;
	},

	VQsetSubQueryNameSuffix: function(val) {
		//arrow ->compartments->extensions->dynamicSuffix
		//params: (value), return: String
		//vards zem bultas (ja neko neatgriez, tad panems vertibu, bet pieliks klat undescribed)
    //  console.log(val);
			return [val.value]
	},

	VQsetSubQueryNamePrefix: function(val) {
		//arrow ->compartments->extensions->dynamicPrefix
		//params: (value), return: String
		//vards zem bultas (ja neko neatgriez, tad panems vertibu, bet pieliks klat undescribed)
   //console.log(val);
		return [val.value]
	},

  // TODO: Dynamic Context Menus dont work
	getVQ_Class_ContextMenuEditMode: function() {
		var menu = [{item:"AddLink", procedure:"AddLink"},{item:"Copy", procedure:"Copy"},{item:"Delete", procedure:"Delete"},
		            {item:"Generate SPARQL from single class",procedure:"GenerateSPARQL_from_selection"},
							  {item:"Execute SPARQL from single class",procedure:"ExecuteSPARQL_from_selection"},
						    {item:"Generate SPARQL from component",procedure:"GenerateSPARQL_from_component"},
								{item:"Execute SPARQL from component",procedure:"ExecuteSPARQL_from_component"},
							];

		return menu;
	},

	createNewVQ_Element: function()  {
		var loc = {x:400,y:400,width:250,height:250};
		Create_VQ_Element(function(boo) {
			 boo.setName("Boo");
			 boo.addCondition("boo > voo");
			 boo.addCondition("zoo is not here");
			 boo.addField("kvak","a",true,true,true);
			 boo.addField("mooh","b",true,false,true);
			 boo.setDistinct(true);
			 boo.setOffset("333");
			 boo.setLimit("777");
			 boo.setFullSPARQL("Full SPARQL");
			 var loc2 = {x:400,y:800,width:200,height:200};
			 Create_VQ_Element(function(voo) {
				 voo.setName("Voo");
				 voo.setClassType("condition");
				 voo.addAggregateField("count(.)","zumzum");
				 voo.addAggregateField("sum(fum)","foo");
				 voo.addOrdering("cockoo",true);
				 voo.addOrdering("sparrow",false);
				 var points = [444, 800, 444, 650];
				 Create_VQ_Element(function(coo) {
					 coo.setName("Coo");
					 coo.setLinkType("REQUIRED");
					 coo.setLinkQueryType("SUBQUERY");
				 }, points, true, voo, boo);
			 }, loc2);
		}, loc);
		//boo.setName("Boo");

	},

	visualizeSPARQL: function() {
		var query_text = yasqe3.getValue();
		// Interpreter.customExtensionPoints.generateVisualQuery(query_text)
		Interpreter.customExtensionPoints.testAutoCompletionSPARQL(query_text)
	}

});
