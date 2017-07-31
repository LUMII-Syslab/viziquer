Interpreter.customMethods({

	setParameters: function(list) {

		console.log("SetParametrs called, not implemented");
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
	VQgetAssociationIsInverse: function() {
		////arrow ->compartments->Inverse link->extensions->dynamic default value
		//return: String
	},

	VQsetSubQueryInverseLink: function() {
		//arrow ->compartments->Inverse Link->extensions->after Update
		//params: (compartType, compartId)
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
		//No active Element or unpropriate type
		if (!act_elem) {return [{value: " ", input: " ", }];}
		if (Elements.findOne({_id: act_elem})["type"] != "Line") {return [{value: " ", input: " ", }];}

		//Start and end elements - ID and no-end-check
		var elem_strt = Elements.findOne({_id: act_elem})["startElement"];
		var elem_end = Elements.findOne({_id: act_elem})["endElement"];


		if (!elem_strt || !elem_end) {
			return [{value: " ", input: " ", }];
		}
		//End-elemen - Name direct + Super_Sub Classes
		//All possible Classes
		var cls = Classes.find();
		var class_type = ElementTypes.findOne({name:"Class"});
		var comp_type = CompartmentTypes.findOne({name: "Name", elementTypeId: class_type._id});

		//If start and end elements both exist
		var comp_start = Compartments.findOne({elementId: elem_strt, compartmentTypeId: CompartmentTypes.findOne({name: "Name", elementTypeId: class_type._id})._id});
		var comp_end = Compartments.findOne({elementId: elem_end, compartmentTypeId: CompartmentTypes.findOne({name: "Name", elementTypeId: class_type._id})._id})

		var schema = new VQ_Schema();

		if(comp_start && comp_end){
			//Start element
			var elemS_name = [];
			elemS_name.push(comp_start["input"]);

			//If Super/SubClass exists - add to possible start elements
      if (schema.findClassByName(elemS_name[0])) {
			_.each(schema.findClassByName(elemS_name[0]).allSuperSubClasses, function(nm){
				elemS_name.push(nm["localName"]);
			})};


			//End elem
			var elemE_name = [];
			elemE_name.push(comp_end["input"]);

				//If Super/SubClass exists - add to possible end elements
      if (schema.findClassByName(elemE_name[0])) {
			_.each(schema.findClassByName(elemE_name[0]).allSuperSubClasses, function(nm){
				elemE_name.push(nm["localName"]);
			})};

			//Read Associations from DB and make unique
			var asc = [];
			var asc_inv = [];
			var asc_all = [];
			var i;
			var exists;

			asc_all.push({value: " ", input: " ", });

			//Read all asociations' name, from&to elements
			var roles = schema.SchemaRoles;

			if (roles){
				var asc_val = [];

				_.each(roles, function (use) {

				      asc_val.push({
				      	assoc: use["localName"],
				      	start: use.sourceClass["localName"],
				      	end: use.targetClass["localName"]
				      });
				})
			} else {
				return [{value: " ", input: " ", }];
			}

			//Direct
			_.each(asc_val, function(v){
				exists = false;

				_.each(elemS_name, function(ns){
					_.each(elemE_name, function (ne){
						if (v["start"] == ns && v["end"] == ne) {exists = true;}
					})
				})

				if (exists) {
					asc.push(v["assoc"]);
				}
			})


				//Add unique
			_.each(asc, function(el){
				exists = false;

				_.each(asc_all, function(ea){
					if(ea["input"] == el) {exists = true;}
				})

				if(!exists) {
					asc_all.push({value: el, input: el, })
				}
			})

			//Inverse
			_.each(asc_val, function(v){
				exists = false;

				_.each(elemS_name, function(ns){

					_.each(elemE_name, function (ne){
						if (v["start"] == ne && v["end"] == ns) {exists = true;}
					})
				})

				if (exists) {
					asc_inv.push(v["assoc"]);
				}
			})

				//Add unique
			_.each(asc_inv, function(el){
				exists = false;

				_.each(asc_all, function(ea){
					if(ea["input"] == ("inv("+el+")")) {exists = true;}
				})

				if(!exists) {
					asc_all.push({value: "inv("+el+")", input: el})
				}
			})

			//Additional options - inverse, negation, condition, group visual representation
			// TODO: Why it is here? It should not be here :( )
				var ct = null;
				var c = null;
				var compart_id = null;
				var c_cal = null;
				//Inverse Link value - from chosen association
				ct = CompartmentTypes.findOne({name: "Inverse Link"});

				if (ct) {
					c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});

					if (c) {
						compart_id = c["_id"];
						c_cal = Compartments.findOne({elementId: act_elem, input: {$nin: ["true", "false"]}});

						if (c_cal) {

							if (String(c_cal["value"]).indexOf("inv") > -1){
								//Dialog.updateCompartmentValue(ct, "true", "<inv>", compart_id);
							} else if (Compartments.findOne({elementId: act_elem, value: "<inv>"})){
								//Dialog.updateCompartmentValue(ct, "false", "", compart_id);
							}
						}
					}
				}
		} else {
			return [{value: " ", input: " ", }];
		}

		return asc_all;


	},

	VQsetSubQueryNameSuffix: function(val) {
		//arrow ->compartments->extensions->dynamicSuffix
		//params: (value), return: String
		//vards zem bultas (ja neko neatgriez, tad panems vertibu, bet pieliks klat undescribed)

			return [val.value]
	},

	VQsetSubQueryNamePrefix: function(val) {
		//arrow ->compartments->extensions->dynamicPrefix
		//params: (value), return: String
		//vards zem bultas (ja neko neatgriez, tad panems vertibu, bet pieliks klat undescribed)

			return [val.value]
	},


});
