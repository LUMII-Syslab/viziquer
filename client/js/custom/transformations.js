Interpreter.customMethods({

	setParameters: function(list) {

		console.log("SetParametrs called, not implemented");
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
		var cls = Classes.find();

		if (cls.count() > 0){
			//Create array of needed structure from class' names
			var class_names = [{value: " ", input: " ", }];

			var class_val = cls.forEach(function (user) {
				class_names.push({value: user["name"], input: user["name"], });
			});

			/* If atributes from drop-down are fixed 
			//If Class name is changed
			//check for existing attributes and delete unpropriate if neccessary - 09.05.2016. changed to keep any user text	
			var act_elem = Session.get("activeElement");

			if (act_elem){
				var act_el = Elements.findOne({_id: act_elem});
				var act_comp = CompartmentTypes.findOne({name: "Name", elementTypeId: Session.get("activeElementType")})
				
				if (act_comp && act_el) {				
					var act_class = Compartments.findOne({ elementId: act_elem, compartmentTypeId: act_comp["_id"] });
					
					if (act_class) {		
						var cls_value = act_class["input"]; // Class name
						
						if (cls_value){ 
							
							var known_class = _.find(class_names, function(cn){ 
								return cn["value"] === cls_value;
							})

							if (!known_class) {
								console.error("VQgetClassNames: Unknown Class Name");
							} else {
								//Search for all given atributes of active element
								var att_val = [];

								var compart_type = CompartmentTypes.findOne({name: "Attributes", elementTypeId: Session.get("activeElementType")})
								var att = Compartments.find({ elementId: act_elem, compartmentTypeId: compart_type["_id"] });
								
								att.forEach(function (user) {
									att_val.push({name: user["subCompartments"]["Attributes"]["Attributes"]["Name"]["input"], id: user["_id"]});
								});


								//If some attributes are mentioned
								if (att_val.length > 0){				
									var exist;		
									var atr_name = [];

									//Read attribute values from DB					
									if (cls_value != " "){
										//direct
										_.each(Classes.findOne({name: cls_value})["Attributes"], function(e){
											atr_name.push({name: e["localName"]});
										})			
										
										//from Super Class						
										_.each(Classes.findOne({name: cls_value})["AllSuperClasses"], function(e){

											_.each(Classes.findOne({name: e["localName"]})["Attributes"], function(el){
												atr_name.push({name: el["localName"]});
											})
										});

										//from Sub Class						
										_.each(Classes.findOne({name: cls_value})["AllSubClasses"], function(e){

											_.each(Classes.findOne({name: e["localName"]})["Attributes"], function(el){
												atr_name.push({name: el["localName"]});
											})
										});
									}
									
									//Compare existing atribute with all possible Class atributes
									_.each(att_val, function(aname){

										var exist = _.find(atr_name, function(all) {
											return  all["name"].includes(aname["name"]); 
										});

										//Delete attribute if it does not exists for given Class
										if (!exist) {
											Utilities.callMeteorMethod("removeCompartment", {projectId: Session.get("activeProject"), 
												versionId: Session.get("versionId"), compartmentId: aname["id"]});
										}
									})	
								}
							}
						}
					}
				}	
			
			}	*/

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

	VQgetAttributeNames: function() {
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

		if (act_comp["elementTypeId"] != ElementTypes.findOne({name: "Class"})["_id"]) {
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
			var att_val; 

			var klass = Classes.findOne({name: compart["input"]});			

			if (!klass) {
				console.error("VQgetAttributeNames: No Classs with such Name");
				return ;
			}

			_.each(klass["Attributes"], function(att){
				att_val = att["localName"];
				atr_names.push({value: att_val, input: att_val});
			})
				
			//from Super Class
			var cs_val;
			var cs_list;	

			_.each(klass["AllSuperClasses"], function(supC){

				cs_val = supC["localName"];
				cs_list = Classes.findOne({name: cs_val});

				if (cs_list) {

					_.each(cs_list["Attributes"], function(sca){
						att_val = sca["localName"];
						atr_names.push( {value: att_val, input: att_val} );
					})
				}
			})

			//from Sub Class		
			_.each(klass["AllSubClasses"], function(supC){

				cs_val = supC["localName"];
				cs_list = Classes.findOne({name: cs_val});

				if (cs_list) {

					_.each(cs_list["Attributes"], function(sca){
						att_val = sca["localName"];
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
	 	var is_sorted = false;

	 	return _.uniq(atr_names, is_sorted, function(item) {
	 		return item["input"];
	 	});

		
	},

	VQsetIsGroup: function() {
		//arrow ->compartments->"Subquery Link"->extensions->after Update
		//params: (compartType, compartId)
	},

	VQsetIsCondition: function() {
		//arrow ->compartments->Conditional Link->extensions->after Update
		//params: (compartType, compartId)
	},

	VQsetIsOptional: function() {
		//arrow ->compartments->Optional Link->extensions->after Update
		//params: (compartType, compartId)		
	},

	VQsetIsNegation: function() {
		//arrow ->compartments->Inverse Link->extensions->after Update
		//params: (compartType, compartId)				
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

			if (c && cn) {

				if (c["input"] == "true"){

					// Dialog.updateCompartmentValue(ct, "true", "<inv>", c["_id"]);
					Dialog.updateCompartmentValue(ctn, "inv(".concat(cn["input"], ")"), "inv(".concat(cn["input"], ")"), cn["_id"]);
				} else {
					var s = cn["input"].indexOf("(");
					var e = cn["input"].lastIndexOf(")");
					var name = cn["input"].substring(s + 1, e)

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

	VQsetIsInverse: function() {
		//arrow ->compartments->Name->extensions->after update
		//params: (compartType, compartId)
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

		//If start and end elements both exist
		var comp_start = Compartments.findOne({elementId: elem_strt, compartmentTypeId: CompartmentTypes.findOne({name: "Name"})._id});
		var comp_end = Compartments.findOne({elementId: elem_end, compartmentTypeId: CompartmentTypes.findOne({name: "Name"})._id})

		if(comp_start && comp_end){
			//Start element
			var elemS_name = [];
			elemS_name.push(comp_start["input"]);		
				
				//If Super/SubClass exists - add to possible start elements
			_.each(Classes.findOne({name: elemS_name[0]})["AllSubClasses"], function(nm){
				elemS_name.push(nm["localName"]);
			})

			_.each(Classes.findOne({name: elemS_name[0]})["AllSuperClasses"], function(nm){
				elemS_name.push(nm["localName"]);
			})
			
			//End elem
			var elemE_name = [];
			elemE_name.push(comp_end["input"]);
			
				//If Super/SubClass exists - add to possible end elements
			_.each(Classes.findOne({name: elemE_name[0]})["AllSubClasses"], function(nm){
				elemS_name.push(nm["localName"]);
			})

			_.each(Classes.findOne({name: elemE_name[0]})["AllSuperClasses"], function(nm){
				elemS_name.push(nm["localName"]);
			})
		
			//Read Associations from DB and make unique
			var asc = [];
			var asc_inv = []; 
			var asc_all = [];
			var i; 
			var exists;
			
			asc_all.push({value: " ", input: " ", });	

			//Read all asociations' name, from&to elements
			cls = Associations.find();

			if (cls){
				var asc_val = [];

				cls.forEach(function (use) {

				      asc_val.push({
				      	assoc: use["name"], 
				      	start: use.ClassPairs["0"].SourceClass["localName"], 
				      	end: use.ClassPairs["0"].TargetClass["localName"]
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
					asc_all.push({value: "inv("+el+")", input: "inv("+el+")", })
				}
			})

			//Additional options - inverse, negation, condition, group visual representation
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
							
							if (String(c_cal["input"]).indexOf("inv") > -1){
								Dialog.updateCompartmentValue(ct, "true", "<inv>", compart_id);
							} else if (Compartments.findOne({elementId: act_elem, value: "<inv>"})){
								Dialog.updateCompartmentValue(ct, "false", "", compart_id);
							}
						}
					}
				}
				
				//Negation Link
				ct = CompartmentTypes.findOne({name: "Negation Link"});

				if (ct) {
					c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});

					if (c) {
						compart_id = c["_id"];	

						if (c["input"] == "true" && c["value"] != "{not}"){
							Dialog.updateCompartmentValue(ct, "true", "{not}", compart_id);

							//Remove Optional link
							ct = CompartmentTypes.findOne({name: "Optional Link"});

							if (ct) {
								c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});

								if (c) {
									compart_id = c["_id"];	

									if (compart_id) {
										Dialog.updateCompartmentValue(ct, "false", " ", compart_id);
									}
								}
							}
						} else if (c["input"] == "false" && c["value"] == "{not}") {
							Dialog.updateCompartmentValue(ct, "false", " ", compart_id);							
						}
					}
				}


				// Optional link - remove negation link
				ct = CompartmentTypes.findOne({name: "Optional Link"});

				if (ct) {
					c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});

					if (c) {
						compart_id = c["_id"];	

						if (c["input"] == "true"){							
							ct = CompartmentTypes.findOne({name: "Negation Link"});

							if (ct) {
								c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});

								if (c && c["input"] == "true") {
									compart_id = c["_id"];	

									if (compart_id) {
										Dialog.updateCompartmentValue(ct, "false", " ", compart_id);
									}
								}
							}
						}
					}
				}


				//Condition Link
				ct = CompartmentTypes.findOne({name: "Condition Link"});

				if (ct) {
					c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});

					if (c) {
						compart_id = c["_id"];	

						if (c["input"] == "true" && c["value"] != "{condition}") {
							Dialog.updateCompartmentValue(ct, "true", "{condition}", compart_id);
							//Remove Subquery if exists
							ct = CompartmentTypes.findOne({name: "Subquery Link"});
							if (ct) {
								c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});

								if (c) {
									compart_id = c["_id"];
									Dialog.updateCompartmentValue(ct, "false", "", compart_id);
								}
							}

						} else if (c["input"] == "false" && c["value"] == "{condition}") {
							Dialog.updateCompartmentValue(ct, "false", "", compart_id);
						}
					}
				}
				
				//"Subquery Link"
				ct = CompartmentTypes.findOne({name: "Subquery Link"});

				if (ct) {
					c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});

					if (c) {
						compart_id = c["_id"];

						if (c["input"] == "true" && c["value"] != "{subquery}") {
							Dialog.updateCompartmentValue(ct, "true", "{subquery}", compart_id);
							//Remove Condition if exists
							ct = CompartmentTypes.findOne({name: "Condition Link"});
							if (ct) {
								c = Compartments.findOne({elementId: act_elem, compartmentTypeId: ct["_id"]});

								if (c) {
									compart_id = c["_id"];
									Dialog.updateCompartmentValue(ct, "false", "", compart_id);
								}
							}
						} else if (c["input"] == "false" && c["value"] == "{subquery}"){
							Dialog.updateCompartmentValue(ct, "false", "", compart_id);
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


});