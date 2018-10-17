Interpreter.customMethods({
	AddLink: function () {
		$("#add-link-form").modal("show");
	},
	AggregateWizard: function () {
		
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
      asc.push({name: "++", class: "", type: "=>"});

			return asc;

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

var start_elem_id;
var created_element;

Template.AddLink.events({

	"click #ok-add-link": function() {

		//Read user's choise
		var obj = $('input[name=stack-radio]:checked').closest(".association");
		var linkType = $('input[name=type-radio]:checked').val();		

		var name = obj.attr("name");		
		var line_direct = obj.attr("line_direct");
		var class_name = obj.attr("className");

		//start_elem
		start_elem_id = Session.get("activeElement");
		Template.AggregateWizard.startClassId.set(start_elem_id);
		var elem_start = Elements.findOne({_id: start_elem_id});

		//Initial coordinate values original box and new box
		var d = 30;
		var x0 = elem_start["location"]["x"];
		var y0 = elem_start["location"]["y"];
		var x1 = x0;
		var y1 = y0 + elem_start["location"]["height"]+d;
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
				created_element = elem_id;
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
					if(linkType == "NESTED") vq_line.setLinkQueryType("SUBQUERY")
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

		});	

		if (document.getElementById("goto-wizard").checked == true ){			

			//Fields						
			var attr_list = [{attribute: ""}];
			var schema = new VQ_Schema();

			if (schema.classExist(class_name)) {
				Template.AggregateWizard.startClassName.set(class_name);

			// 	var klass = schema.findClassByName(class_name);

			// 	_.each(klass.getAllAttributes(), function(att){
			// 		attr_list.push({attribute: att["name"]});
			// 	})
			// 	attr_list = _.sortBy(attr_list, "attribute");
			}
			// console.log(attr_list);			
			Template.AggregateWizard.attList.set(attr_list);

			//Alias name
			if (class_name) {
				Template.AggregateWizard.defaultAlias.set(class_name.charAt(0) + "_count");
				$("#aggregate-wizard-form").modal("show");
			} else {
				alert("No class selected - wizard may work unproperly");
			}								
		}		

		clearAddLinkInput();
		return;

	},

	"click #cancel-add-link": function() {
		clearAddLinkInput();
	},

});

Template.AggregateWizard.defaultAlias = new ReactiveVar("No_class");
Template.AggregateWizard.attList = new ReactiveVar([{attribute: "No_attribute"}]);
Template.AggregateWizard.startClassId = new ReactiveVar("No start id");
Template.AggregateWizard.startClassName = new ReactiveVar("No start name");
Template.AggregateWizard.endClassId = new ReactiveVar("No end");

Template.AggregateWizard.helpers({
	defaultAlias: function(){
		//console.log("AggregateWizard.helpers");
		return Template.AggregateWizard.defaultAlias.get();
	},

	attList: function(){		
		return Template.AggregateWizard.attList.get();
	},

	startClassId: function(){		
		return Template.AggregateWizard.startClassId.get();
	},

	startClassName: function(){		
		return Template.AggregateWizard.startClassId.get();
	},

	endClassId: function(){		
		return Template.AggregateWizard.endClassId.get();
	},
});

Template.AggregateWizard.events({

	"click #ok-aggregate-wizard": function() {
		// console.log("427: from " + start_elem_id + " to " + created_element);		
		var vq_end_obj = new VQ_Element(Template.AggregateWizard.endClassId.curValue);
		var alias = $('input[id=alias-name]').val();
		var expr = $('option[name=function-name]:selected').val()
		var fld = $('option[name=field-name]:selected').val();
		if (expr == "count") {
			expr = "count(.)";
		} else {
			expr = expr.concat("(", fld, ")");
		}
		//console.log(alias + " " + expr);
		vq_end_obj.addAggregateField(expr,alias);

		var displayCase = document.getElementById("display-results").checked;
		var minValue = $('input[id=results_least]').val();
		var maxValue = $('input[id=results-most]').val();
		console.log(displayCase, minValue, maxValue);
		if (displayCase || (minValue != "") || (maxValue != "")) {
			console.log("display or min/max");
			var vq_start_obj = new VQ_Element(Template.AggregateWizard.startClassId.curValue);
			if (alias == null || alias == "") {
				var cName = Template.AggregateWizard.startClassName.curValue;
				var newFunction = $('option[name=function-name]:selected').val();
				alias = cName.charAt(0) + "_" + newFunction;
			}
			//addField: function(exp,alias,requireValues,groupValues,isInternal)
			if (displayCase) vq_start_obj.addField(alias,);
			if (minValue != "") vq_start_obj.addCondition(alias + ">=" + minValue);
			if (maxValue != "") vq_start_obj.addCondition(alias + "<=" + maxValue);
		} else {console.log("no dismlay or min/max");}

		clearAggregateInput();
		return;
	},

	"click #cancel-aggregate-wizard": function() {
		clearAggregateInput();
		return;
	},

	"change #function-list": function() {
		console.log("changed");
		var vq_obj = new VQ_Element(Template.AggregateWizard.endClassId.curValue);
		var alias = $('input[id=alias-name]').val();
		var newFunction = $('option[name=function-name]:selected').val();
		var fieldName = $('option[name=field-name]:selected').val();		
		var cName = Template.AggregateWizard.startClassName.curValue;
		console.log(cName.charAt(0), fieldName.length);

		//Select suitable atribtes		
		var schema = new VQ_Schema();
		// console.log(schema.resolveAttributeByName(Template.AggregateWizard.startClassId.curValue, fieldName).type);
		var attrArray = Template.AggregateWizard.attList.curValue;
		var newAttrList = [{attribute: ""}];
		if (schema.classExist(cName) && newFunction != "count"){
			var klass = schema.findClassByName(cName);
			_.each(klass.getAllAttributes(), function(att){
				var attrType = schema.resolveAttributeByName(cName, att["name"]).type;
				if (newFunction == "sum" || newFunction == "avg") {
					if ((attrType == "xsd:integer" || attrType == "xsd:decimal")) {
						newAttrList.push({attribute: att["name"]})
					}
				} else {
					newAttrList.push({attribute: att["name"]});
				}
			})	

			newAttrList = _.sortBy(newAttrList, "attribute");					
		}	
		//console.log(attr_list);			
		Template.AggregateWizard.attList.set(newAttrList);			

		//Set default alias
		var functionArray = ["count", "count_distinct", "sum", "avg", "max", "min", "sample", "concat"];		
		_.each(functionArray, function(f) {
			var defaultName = cName.charAt(0) + "_" + f;
			var defaultFieldName = f + "_" + fieldName;
			if (alias == defaultName) {				
				Template.AggregateWizard.defaultAlias.set(cName.charAt(0) + "_" + newFunction);
			} else if (alias == defaultFieldName) {
				if (newAttrList.indexOf(fieldName) > -1) {
					Template.AggregateWizard.defaultAlias.set(newFunction + "_" + fieldName);
				} else {
					Template.AggregateWizard.defaultAlias.set(cName.charAt(0) + "_" + newFunction);					
				}
			}
		})		
		return;
	},

	"change #field-list": function() {
		console.log("changed field");
		var vq_obj = new VQ_Element(Template.AggregateWizard.endClassId.curValue);
		var alias = $('input[id=alias-name]').val();
		var newFunction = $('option[name=function-name]:selected').val();
		var fieldName = $('option[name=field-name]:selected').val();
		var cName = Template.AggregateWizard.startClassName.curValue;
		console.log(cName.charAt(0), fieldName.length);
		var functionArray = Template.AggregateWizard.attList.curValue;
		console.log(functionArray);		
		_.each(functionArray, function(f) {
			var defaultName = cName.charAt(0) + "_" + newFunction;
			var defaultFieldName = newFunction + "_" + f.attribute;
			console.log(alias, defaultName, defaultFieldName, fieldName.length);
			if ((alias == defaultName || alias == defaultFieldName) && fieldName.length == 0) {				
				Template.AggregateWizard.defaultAlias.set(cName.charAt(0) + "_" + newFunction);
			} else if ((alias == defaultName || alias == defaultFieldName) && fieldName.length != 0) {
				Template.AggregateWizard.defaultAlias.set(newFunction + "_" + fieldName);
			}
		})
		return;
	},
});

//++++++++++++
//Functions
//++++++++++++

function clearAddLinkInput(){
	$('input[name=stack-radio]:checked').attr('checked', false);
	var defaultRadio = document.getElementsByName("type-radio");
	_.each(defaultRadio, function(e){
		if (e.value == "JOIN") e.checked = true;
		else e.checked = false;
	});
	
	$('input[id=goto-wizard]').attr('checked', false);
}

function clearAggregateInput(){
	var defaultFunctions = document.getElementsByName("function-name");
	_.each(defaultFunctions, function(e){
		if (e.value == "count") e.selected = true;
		else e.selected = false;
	});

	var defaultFunctions = document.getElementsByName("field-name");
	_.each(defaultFunctions, function(e){
		if (e.value == "") e.selected = true;
		else e.selected = false;
	});

	Template.AggregateWizard.defaultAlias.set("N_count");				
	$('input[id=display-results]:checked').attr('checked', false);
	document.getElementById("results_least").value = "";
	document.getElementById("results-most").value = "";
}

