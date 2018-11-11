Interpreter.customMethods({
	AddLink: function () {
		Interpreter.destroyErrorMsg();
		$("#add-link-form").modal("show");
	},
})


Template.AddLink.helpers({

	associations: function() {
		//start_elem
		var start_elem_id = Session.get("activeElement");
		var startElement = new VQ_Element(start_elem_id);
		if (startElement && startElement.isClass()){ //Because in case of deleted element ID is still "activeElement"
			//Associations
			var asc = [];
			
			var className = startElement.getName();
			var schema = new VQ_Schema();

			if (schema.classExist(className)) {
				asc = schema.findClassByName(className).getAllAssociations();
			}
			
      		asc.push({name: "++", class: "", type: "=>"}); //default value for any case

			return asc;			
		}
	},


});

Template.AddLink.events({
	"click #ok-add-link": function() {

		//Read user's choise
		var obj = $('input[name=stack-radio]:checked').closest(".association");
		var linkType = $('input[name=type-radio]:checked').val();

		var name = obj.attr("name");
		var line_direct = obj.attr("line_direct");
		var class_name = obj.attr("className");

		$("div[id=errorField]").remove();
          
        if (!name || name == "") {
            console.log("Choose valid link");           
            $(".modal-body").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, choose link</div>");				            
        } else {
			//start_elem
			var start_elem_id = Session.get("activeElement");
			Template.AggregateWizard.startClassId.set(start_elem_id);
			var elem_start = Elements.findOne({_id: start_elem_id});

			//Initial coordinate values original box and new box
			var d = 30;
			var x0 = elem_start["location"]["x"];
			var y0 = elem_start["location"]["y"];
			var x1 = x0;
			var y1 = y0 + elem_start["location"]["height"] + d;
			var w = elem_start["location"]["width"];
			var h = elem_start["location"]["height"];


			//If diagram is populated - search for overlap
			//Temporal solution: Put new element as low as possible, no packaging algorithm && elem_list["location"]

			var elem_list = [];
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
			} while (elem_over.length > 0);


			//New elements
			//Create Box; original constructor is used
			var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
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
					Template.AggregateWizard.endClassId.set(elem_id);

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
						if(linkType == "NESTED") vq_line.setNestingType("SUBQUERY")
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
						var proj = Projects.findOne({_id: Session.get("activeProject")});
						if (proj) {
							  console.log(Session.get("activeProject"), proj, proj.autoHideDefaultPropertyName);
							  if (proj.autoHideDefaultPropertyName=="true") {
								vq_line.hideDefaultLinkName(true);
								vq_line.setHideDefaultLinkName("true");
							  };
						}
						
					});

				}

			});

			if (document.getElementById("goto-wizard").checked == true ){

				//Fields
				var attr_list = [{attribute: ""}];
				var schema = new VQ_Schema();

				if (schema.classExist(class_name)) {

					var klass = schema.findClassByName(class_name);

					_.each(klass.getAllAttributes(), function(att){
						attr_list.push({attribute: att["name"]});
					})
					attr_list = _.sortBy(attr_list, "attribute");
				}
				// console.log(attr_list);
				Template.AggregateWizard.attList.set(attr_list);

				//Alias name
				if (class_name) {
					Interpreter.destroyErrorMsg();
					Template.AggregateWizard.defaultAlias.set(class_name.charAt(0) + "_count");
					Template.AggregateWizard.showDisplay.set("block");
					$("#aggregate-wizard-form").modal("show");
				} else {
					//alert("No class selected - wizard may work unproperly");
					Interpreter.showErrorMsg("No proper link-class pair selected to proceed with Aggregate wizard.", -3);
				}
			}

			clearAddLinkInput();
			$("#add-link-form").modal("hide");			
			return;
		}

	},

	"click #cancel-add-link": function() {
		clearAddLinkInput();		
	},

});

//++++++++++++
//Functions
//++++++++++++
function clearAddLinkInput(){
	$('input[name=stack-radio]:checked').attr('checked', false);
	// var defaultList = document.getElementsByName("stack-radio");
	// _.each(defaultList, function(e){
	// 	if (e.value == "++") e.checked = true;
	// 	else e.checked = false;
	// });
	var defaultRadio = document.getElementsByName("type-radio");
	_.each(defaultRadio, function(e){
		if (e.value == "JOIN") e.checked = true;
		else e.checked = false;
	});

	$('input[id=goto-wizard]').attr('checked', false);
	$('input[id=goto-wizard]').attr("disabled","disabled");

	$("div[id=errorField]").remove();
}