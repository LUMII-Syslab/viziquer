Interpreter.customMethods({
	AddLink: function () {
		Interpreter.destroyErrorMsg();
		Template.AddLink.fullList.set(getAllAssociations());
		Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);		
		$("#add-link-form").modal("show");
	},
})

Template.AddLink.fullList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);
Template.AddLink.shortList = new ReactiveVar([{name: "++", class: " ", type: "=>", card: "", clr: ""}]);

Template.AddLink.helpers({

	fullList: function(){
		return Template.AddLink.fullList.get();
	},

	shortList: function(){
		return Template.AddLink.shortList.get();
	},

	/*associations: function() {
		asc = getAllAssociations();		
		console.log(asc);
		return asc;
	},*/

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
        	var value = $("#mySearch").val();
        	if (!value){
	            console.log("Choose valid link");
	            $(".searchBox").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, choose link</div>");
	        } else {
	        	Template.AddLink.fullList.set(getAllAssociations());
	        	$(".searchBox").append("<div id='errorField' style='color:red; margin-top: 0px;'>Please, choose link. <br> Path deffinition will be added later</div>");
	        }
        } else {
			//start_elem
			var start_elem_id = Session.get("activeElement");			
			Template.AggregateWizard.startClassId.set(start_elem_id);
			// var elem_start = Elements.findOne({_id: start_elem_id});

			var currentElement = new VQ_Element(start_elem_id);
			if (currentElement == null) {
				console.log("Unknown error - active element does not exist.");
				return;
			}

            var d = 30; //distance between boxes
            var oldPosition = currentElement.getCoordinates(); //Old class coordinates and size
            var newPosition = currentElement.getNewLocation(d); //New class coordinates and size
            //Link Coordinates
            var coordX = newPosition.x + Math.round(newPosition.width/2);
            var coordY = oldPosition.y + oldPosition.height;
            var locLink = [];
            
            Create_VQ_Element(function(cl){
                cl.setName(class_name);
                var proj = Projects.findOne({_id: Session.get("activeProject")});
                cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
                cl.setClassStyle("condition");
                if (line_direct == "=>") {
                	locLink = [coordX, coordY, coordX, newPosition.y];                 
	                Create_VQ_Element(function(lnk) {
	                    lnk.setName(name);
	                    lnk.setLinkType("REQUIRED");
	                    if (linkType == "JOIN") lnk.setNestingType("PLAIN");
						else if (linkType == "NESTED") lnk.setNestingType("SUBQUERY");
						if (proj && proj.autoHideDefaultPropertyName=="true") { 
							lnk.hideDefaultLinkName(true);
							lnk.setHideDefaultLinkName("true");
						}
	                }, locLink, true, currentElement, cl);
	            } else {
	            	locLink = [coordX, newPosition.y, coordX, coordY];
	            	Create_VQ_Element(function(lnk) {
	                    lnk.setName(name);
	                    lnk.setLinkType("REQUIRED");
	                    if (linkType == "JOIN") lnk.setNestingType("PLAIN");
						else if (linkType == "NESTED") lnk.setNestingType("SUBQUERY");
						if (proj && proj.autoHideDefaultPropertyName=="true") {
							lnk.hideDefaultLinkName(true);
							lnk.setHideDefaultLinkName("true");
						}
	                }, locLink, true, cl, currentElement);
	            }
                Template.AggregateWizard.endClassId.set(cl.obj._id);
            }, newPosition);

/* O L D   V E R S I O N

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
						if (linkType == "JOIN") vq_line.setNestingType("PLAIN");
						else if (linkType == "NESTED") vq_line.setNestingType("SUBQUERY");
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

			});*/

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

	"change #type-choice": function() {
		var checkedName = $('input[name=type-radio]').filter(':checked').val(); // console.log(checkedName);
        if (checkedName === 'JOIN') {
            $('#goto-wizard:checked').attr('checked', false);
            $('#goto-wizard').attr('disabled',"disabled");
        } else {
            $('#goto-wizard').removeAttr("disabled");
        } 
	},

	"click #link-list-form": function() {
		$("div[id=errorField]").remove();
		var proj = Projects.findOne({_id: Session.get("activeProject")});
        if (proj) {
            if(proj.showCardinalities=="true"){            
                $('#link-list-form').change(function(){
                    var checkedName = $('input[name=stack-radio]').filter(':checked').attr("card"); //console.log(checkedName);
                    if (checkedName.indexOf("[*]") == -1){//max cardinality not [*]
                        $('input[value=JOIN]').prop('checked', true);
                        $('input[value=NESTED]').prop('checked', false);
                        $('input[value=NESTED]').attr('disabled',"disabled");
                        $('#goto-wizard:checked').attr('checked', false);
                        $('#goto-wizard').attr('disabled',"disabled");
                    } else {
                        $('input[value=NESTED]').removeAttr('disabled');
                        $('input[value=NESTED]').prop('checked', true);
                        $('#goto-wizard').removeAttr('disabled');
                    }                
                });
            }
        }
	},

	"keyup #mySearch": function(){
		$("div[id=errorField]").remove();
		var value = $("#mySearch").val().toLowerCase();
		if (value == "" || value.indexOf(' ') > -1) {//empty or contains space
			Template.AddLink.shortList.set(Template.AddLink.fullList.curValue);
		} else {
			var ascList = Template.AddLink.fullList.curValue;
			ascList = ascList.filter(function(e){ //{name: "++", class: " ", type: "=>", card: "", clr: ""}				
				return e.name.toLowerCase().indexOf(value) > -1 || e.class.toLowerCase().indexOf(value) > -1;
			})
			Template.AddLink.shortList.set(ascList);
		}
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
	$("#mySearch")[0].value = "";
	$("div[id=errorField]").remove();
}

function getAllAssociations(){
	//start_elem
		var start_elem_id = Session.get("activeElement");
		var startElement = new VQ_Element(start_elem_id);
		if (!_.isEmpty(startElement) && startElement.isClass()){ //Because in case of deleted element ID is still "activeElement"
			//Associations
			var asc = [];
			var ascReverse = [];
			// var ascDetails = getDetailedAttributes(); 
			// //check if max cardinality exists 
			// var hasCardinalities = false;
			// _.each(ascDetails, function(e){
			// 	if (e.max) hasCardinalities = true;
			// })

			var className = startElement.getName(); 
			var schema = new VQ_Schema();
			var proj = Projects.findOne({_id: Session.get("activeProject")});

			if (startElement.isUnion() && !startElement.isRoot()) { // [ + ] element, that has link to upper class 
				if (startElement.getLinkToRoot()){
					var element = startElement.getLinkToRoot().link.getElements();
					if (startElement.getLinkToRoot().start) {
						var newStartClass = new VQ_Element(element.start.obj._id);						
        				className = newStartClass.getName();
        			} else {
        				var newStartClass = new VQ_Element(element.end.obj._id);						
        				className = newStartClass.getName();
        			}						
				}					
			} 

			if (schema.classExist(className)) {
				
				var allAssociations = schema.findClassByName(className).getAllAssociations();

				//remove duplicates
				allAssociations = allAssociations.filter(function(obj, index, self) { 
					return index === self.findIndex(function(t) { return t['name'] === obj['name'] &&  t['type'] === obj['type'] &&  t['class'] === obj['class'] });
				});
				_.each(allAssociations, function(e){
					var cardinality = "";
					var colorLetters = ""; 				
					if (proj) {				
						if (proj.showCardinalities=="true"){ 
							if (e.type == "<=") {
								cardinality = cardinality.concat("[*]");
								colorLetters = colorLetters.concat("color: purple");
							} else {
								//var maxCard = schema.resolveSchemaRoleByName(e.name,className,e.class).maxCardinality; maxCard tiek padota uzreiz LL
								var maxCard = e.maxCard;
								if (maxCard == null || !maxCard || maxCard == -1 || maxCard > 1) {
									cardinality = cardinality.concat("[*]");
									colorLetters = colorLetters.concat("color: purple");
								}
							}
							/*if (!hasCardinalities || e.type == "<=") { 
								cardinality = cardinality.concat("[*]");
								colorLetters = colorLetters.concat("color: purple");
							} else {
								_.each(ascDetails, function(d){
									//if (d.name == e.name && ((d.from == className && d.to == e.class && e.type == "=>") || (d.from == e.class && d.to == className && e.type == "<="))) { 
									if (d.name == e.name && (d.from == className && d.to == e.class && e.type == "=>") 
										&& d.max == -1) {
										cardinality = cardinality.concat("[*]");
										colorLetters = colorLetters.concat("color: purple");
									}
									//}
								});
								
							}*/
						}
					} //console.log(e.type, schema.resolveLinkByName(e.name).maxCardinality, cardinality, colorLetters);				
					
					
					//prefix:name
					var eName = e.short_name
					
					
					if(e.type == "=>") asc.push({name: eName, class: e.short_class_name, type: e.type, card: cardinality, clr: colorLetters});
					else ascReverse.push({name: eName, class: e.short_class_name, type: e.type, card: cardinality, clr: colorLetters});
					
					if (e.class == className) //Link to itself
						if (e.type == "=>")
							ascReverse.push({name: e.name, class: e.short_class_name, type: "<=", card: cardinality, clr: colorLetters});
						else
							asc.push({name: e.name, class: e.short_class_name, type: "=>", card: cardinality, clr: colorLetters});
				});
			}

			//default value for any case
			if (proj){
      			if (proj.showCardinalities=="true")
      				ascReverse.push({name: "++", class: " ", text: "(empty link)", type: "=>", card: "[*]", clr: "color: purple"}); 
				else {
      				ascReverse.push({name: "++", class: " ", text: "(empty link)", type: "=>", card: "", clr: ""});
      			}
      		}
      		asc = asc.concat(ascReverse);

      		if (proj){
      			var selfName = "";
      			if (className.indexOf("[") == -1) {      				
      				selfName = className;
      			} else {
					var linkUp = startElement.getLinkToRoot(); 
					if (!linkUp || linkUp == undefined) {
						selfName = "";
					} else {
						linkUp = linkUp.link.obj;
						var previousClassId = "";		
						if (linkUp.startElement == start_elem_id) {
							previousClassId = linkUp.endElement;
						} else if (linkUp.endElement == start_elem_id) {
							previousClassId = linkUp.startElement;
						} else {
							console.log(73, ": error with previous element");
							return;
						}

						var previousVQelement = new VQ_Element(previousClassId);
						selfName = previousVQelement.getName();
					}
				}
      			if (proj.showCardinalities=="true")
      				asc.push({name: "==", class: selfName, text: "(same instance)", type: "=>", card: "", clr: ""}); 
				else {
      				asc.push({name: "==", class: selfName, text: "(same instance)", type: "=>", card: "", clr: ""});
      			}
      		}  		
			return asc;
		}
}

// function getDetailedAttributes() {
// 	var schema = new VQ_Schema();
// 	var detailedList = [];

// 	_.each(schema.Associations, function(e) {
// 		_.each(e.schemaRole, function(r){
// 			if (e.localName && e.localName != " ")
// 				detailedList.push({name: e.localName, min: r.minCardinality, max: r.maxCardinality, 
// 									from: r.sourceClass.localName, to: r.targetClass.localName});
// 		})				
// 	})
// 	return detailedList;
// }

