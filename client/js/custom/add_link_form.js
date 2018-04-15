Interpreter.customMethods({
	AddLink: function () {
		$("#add-link-form").modal("show");
	}
})


Template.AddLink.helpers({

	associations: function() {
		//start_elem
		var start_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: start_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			//Associations
			var asc_all = [];
			var asc = [];
			var atr = [];
			var atrNameArray = [];
			var asoc = [];
			//Class Name - direct
			var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: Elements.findOne({_id: start_elem_id})["elementTypeId"]});
			if (!compart_type) {
				return [{name: "++", class: "", type: "=>"}];
			}

			var act_comp = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: start_elem_id});
			if (!act_comp) {
				return [{name: "++", class: "", type: "=>"}];
			}

			var className = act_comp["input"];
			var schema = new VQ_Schema();

			if (!schema.classExist(className)) {
				return [{name: "++", class: "", type: "=>"}];
			}

			asc = schema.findClassByName(className).getAllAssociations();
			asoc = asc.map(function(elem){
				atrNameArray = [];				
				atr = schema.findClassByName(elem.class).getAllAttributes();
				atr.map(function(a){					
					atrNameArray.push(a.name);
				})
				//console.log(atrNameArray);								
				return ({name: elem.name, class: elem.class, type: elem.type, attributes: atrNameArray});
			})
			asoc.push({name: "++", class: "", type: "=>", attributes: []});
			//console.log(asoc);

			atr = schema.findClassByName(className).getAllAttributes();	
      		//asc.push({name: "++", class: "", type: "=>", attributes: "(-)"});

			return asoc;

			/*
			var cls_value = [{name: act_comp["input"], type: "direct"}];
			//Read all asociations' name, from&to elements
			var cls = Associations.find();
			if (cls){
				asc_all = cls.map(function (use) {
				      return [{assoc: use.name, start: use.ClassPairs["0"].SourceClass["localName"], end: use.ClassPairs["0"].TargetClass["localName"]}];
				})
			} else {
				return [{name: "empty", class: "-"}];
			}
			//List of all the classes, that could leave association direct (original class) and through sub_super class relation
			var cls_list = Classes.findOne({name: cls_value["0"]["name"]});
			if (cls_list) {
				//Classes from Super Class
				_.each(cls_list.AllSuperClasses, function(supC){
					cls_value.push({name: supC["localName"], type: "super"});
				})
				//Classes from Sub Class
				_.each(cls_list.AllSubClasses, function(supC){
					cls_value.push({name: supC["localName"], type: "sub"})
				})
			}
			//Create list of unique associations
			var exists = false;
			_.each(asc_all, function(a){
				_.each(cls_value, function(c){
					// if direct association
					exists = false;
					if(c["name"] == a["0"]["start"]){
						_.each(asc, function(e){
							if (e["name"] == a["0"]["assoc"]) {exists = true;}
						})
						if (!exists) {
							asc.push({name: a["0"]["assoc"], class: a["0"]["end"], type: "=>"});
						}
					}
					//if inverse association
					exists = false;
					if(c["name"] == a["0"]["end"]){
						_.each(asc, function(e){
							if (e["name"] == a["0"]["assoc"]) {exists = true;}
						})
						if (!exists) {
							asc.push({name: a["0"]["assoc"], class: a["0"]["start"], type: "<="});
						}
					}
				})
			})
			if (asc.length == 0) {
				return [{name: "empty", class: "-", type: "-"}];
			}
			return asc; */
		}
	},


});


Template.AddLink.events({

	"click #ok-add-link": function(e) {
		//Read user's choise
		var obj = $('input[name=stack-radio]:checked').closest(".association");
		//console.log("obj = ", obj);

		var name = obj.attr("name");
		var line_direct = obj.attr("line_direct");
		var class_name = obj.attr("className");
		/*var attributeList = obj.attr("attributes");
		var attributeChecked = $('input[name=stack-checkbox]:checked').closest(".attribute");
		console.log("on ok", attributeList, " VS", attributeChecked.attr("attribut"));
		$('input[name=stack-checkbox]:checked').each(function(){
			console.log(this);
		})
		var attributeArray = [];
		attributeChecked.each(function(a){
			console.log(a, attributeChecked[a]);
			//var name = a["attributes"];
			if(attributeList.includes(a.)) {
				attributeArray.push(a.attr("attributes"));
			}
		});
		console.log(attributeArray);
		$('input[name=stack-checkbox]:checked').each(function(){
			var attrName = this.attr("attributes");
			console.log(this, "=>", attrName);
		})*/


		//start_elem
		var start_elem_id = Session.get("activeElement");
		var elem_start = Elements.findOne({_id: start_elem_id});
		if (!elem_start){
			console.log("Error - no element with ID exists");
			return;
		}

		//Initial coordinate values original box and new box
		// var d = 30;
		//var x0 = elem_start["location"]["x"];
		//var y0 = elem_start["location"]["y"];		
		//var w = elem_start["location"]["width"];
		//var h = elem_start["location"]["height"];

		//var schemaTest = new VQ_Element(start_elem_id);
		//console.log(schemaTest.drawAddLink());

	//If diagram is populated - search for overlap
	//Temporal solution: Put new element as low as possible, no packaging algorithm && elem_list["location"]
		var startElement = new VQ_Element(start_elem_id);
		// var x1 = elem_start["location"]["x"];
		// var boxGeometry = startElement.getCoordinateY(d);
		// var y1 = boxGeometry["y"];		
		//console.log("Coordinates from", boxGeometry, " are ", x1, y1);

		var end_elem_id = startElement.drawLinkedClass(class_name, name, line_direct);

		/*var elem_list = [];
		var elem_over = []; //Potentionally - for more complex search for a better place
		var max_y;

		Elements.find({type: "Box"}).forEach(function(el) {
			elem_list.push(el);
		})

		do{
			elem_over.length = 0;

			_.each(elem_list, function(el) {
				//Check, if start point of existing element could lead to overlap withexisting elements
				if (el["location"]["x"] < (x1+w)){
					if (el["location"]["y"] < (y1+h)){
						//Check, if end point of existing element could lead to overlap
						if((el["location"]["x"]+el["location"]["width"]) > x1){
							if((el["location"]["y"])+el["location"]["height"] > y1){
								elem_over.push({
									_id: el["_id"],
									x: el["location"]["x"],
									y: el["location"]["y"],
									w: el["location"]["width"],
									h: el["location"]["height"]
								});
							}
						}
					}
				}
			})

			if (elem_over.length > 0){
				max_y = 0;

				_.each(elem_over, function(el){
					if (max_y < (el["y"]+el["h"])) {
						max_y = el["y"]+el["h"];
					}
				})

				y1 = max_y + d;
			}
		} while (elem_over.length > 0);*/


		//New elements
		//Create Box; original constructor is used
		/*var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
		var elem_style = _.find(elem_type.styles, function(style) {
								return style.name === "ConditionClass";
							});

		if (!elem_style) {
			show_error_msg("Internal error: No element style");
			return;
		}

		var new_box = {
						projectId: Session.get("activeProject"),
						versionId: Session.get("versionId"),

						diagramId: Session.get("activeDiagram"),
						diagramTypeId: elem_type["diagramTypeId"],
						elementTypeId: elem_type["_id"],
						style: {elementStyle: elem_style["elementStyle"]},
						styleId: elem_style["id"],
						type: "Box",
						location:  {x: x1, y: y1, width: w, height: h}
					};

		Utilities.callMeteorMethod("insertElement", new_box, function(elem_id) {

			//If elements is created
			if (elem_id) {

				var end_elem_id = elem_id;

				//New element: Name compartment
				var end_elem = Elements.findOne({_id: end_elem_id});
				var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: end_elem.elementTypeId});

				if (compart_type){

					var condition_compartment = {
										compartment: {

											projectId: Session.get("activeProject"),
											versionId: Session.get("versionId"),

											diagramId: Session.get("activeDiagram"),
											diagramTypeId: compart_type["diagramTypeId"],
											elementTypeId: compart_type["elementTypeId"],

											compartmentTypeId: compart_type._id,
											elementId: end_elem_id,

											index: compart_type.index,
											input: class_name,
											value: class_name,
											isObjectRepresentation: false,

											style: compart_type.styles[0]["style"],
											styleId: compart_type.styles[0]["id"],
										},
									};

					Utilities.callMeteorMethod("insertCompartment", condition_compartment);

					//Change type from query to condition
					var ct = CompartmentTypes.findOne({name: "ClassType"});

					if (ct) {
						var c = Compartments.findOne({elementId: end_elem_id, compartmentTypeId: ct["_id"]});

						if (c) {
							var compart_id = c["_id"];
							Dialog.updateCompartmentValue(ct, "condition", "condition", compart_id);
						}
					}

				}
				
				// schema.sleep(1000);				
				//var lineDone = schema.drawAssocLine(name, y1, end_elem_id, line_direct);
				
				//New line
				var line_type = ElementTypes.findOne({name: "Link"});

				var line_style = line_type["styles"][0];
				if (!line_style) {
					show_error_msg("Internal error: No element style");
					return;
				}

//coordinates for 2 boxes one below other
				var ix = x0+Math.round(w/2);
				var a = y0+h;
				var b = y1;

				if (line_direct == "=>") {

					var new_line = {
							projectId: Session.get("activeProject"),
							versionId: Session.get("versionId"),

							diagramId: Session.get("activeDiagram"),
							diagramTypeId: line_type["diagramTypeId"],
							elementTypeId: line_type["_id"],

							style: {startShapeStyle: line_style["startShapeStyle"],
									endShapeStyle: line_style["endShapeStyle"],
									elementStyle: line_style["elementStyle"],
									lineType: line_type["lineType"],
								},

							styleId: line_style["id"],
							type: "Line",
							points: [ix, a, ix, b],
							startElement: start_elem_id,
							endElement: end_elem_id,
						};

				} else {

						var new_line = {
								projectId: Session.get("activeProject"),
								versionId: Session.get("versionId"),

								diagramId: Session.get("activeDiagram"),
								diagramTypeId: line_type["diagramTypeId"],
								elementTypeId: line_type["_id"],

								style: {startShapeStyle: line_style["startShapeStyle"],
										endShapeStyle: line_style["endShapeStyle"],
										elementStyle: line_style["elementStyle"],
										lineType: line_type["lineType"],
									},

								styleId: line_style["id"],
								type: "Line",
								points: [ix, b, ix, a],
								startElement: end_elem_id,
								endElement: start_elem_id,

							};
				}

				Utilities.callMeteorMethod("insertElement", new_line, function(new_line_id) {

					var line_id = new_line_id;
					var line_elem = Elements.findOne({_id: line_id});
					var vq_line = new VQ_Element(line_id);
					vq_line.setLinkType("REQUIRED");
					//vq_line.setName(name);
					var line_compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: line_elem["elementTypeId"]})
					if (line_compart_type) {

						var name_compartment = {
											compartment: {

												projectId: Session.get("activeProject"),
												versionId: Session.get("versionId"),

												diagramId: Session.get("activeDiagram"),
												diagramTypeId: line_compart_type["diagramTypeId"],
												elementTypeId: line_compart_type["elementTypeId"],

												compartmentTypeId: line_compart_type["_id"],
												elementId: line_id,
												index: line_compart_type.index,
												input: name,
												value: name,
												isObjectRepresentation: false,

												style: line_compart_type.styles[0]["style"],
												styleId: line_compart_type.styles[0]["id"],
											},
											elementStyleUpdate: undefined,
										};

						Utilities.callMeteorMethod("insertCompartment", name_compartment);


					}

				});

			}

		});*/



		return;

	},


});