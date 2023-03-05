import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'

import { Elements, ElementTypes } from '/libs/platform/collections'

Interpreter.methods({

	MakeElement: function(list) {
		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");

	},

	ResizeElement: function(list) {
		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");

		Utilities.callMeteorMethod("resizeElement", list);	
	},

	NewBox: function(new_obj_id, elem_type_id, points) {

		//collects the element type object
		var elem_type = ElementTypes.findOne({_id: elem_type_id});

		//creates a new element
		new_element(new_obj_id, elem_type, points);
	},

	NewSwimlane: function() {

		//padding
		var x = 40;

		//collects the element type object
		var elem_type = ElementTypes.findOne({swimlane: {$exists: true}});
		if (!elem_type)
			return;

		var width = elem_type["swimlane"]["horizontalLines"][0][2];		
		var height = elem_type["swimlane"]["verticalLines"][0][3];

		var points = {x: x, y: 20, width: width, height: height};

		var new_obj_id = generate_id();

		//creates a new element
		new_element(new_obj_id, elem_type, points);
	},

	NewLine: function(new_obj_id, elem_type_id, points, start_elem_id, end_elem_id) {

		//collects the element type object
		var line_type = compute_new_line_type([elem_type_id], start_elem_id, end_elem_id);
		
		//removing the line
		if (!line_type) {

			if (new_obj_id) {

				var editor = Interpreter.editor;
				var elem_list = editor.getElements();

				var element = elem_list[new_obj_id];
				element.remove();

				var drag_layer = editor.getLayer("DragLayer");
				drag_layer.draw();
			}
		}

		else {

			//creating a new line	
			new_element(new_obj_id, line_type, points, start_elem_id, end_elem_id);
		}
	},

});



compute_new_line_type = function(elem_types, start_elem, end_elem) {

	//checks if there is start and end element for the line
	if (start_elem && end_elem) {

		//selects start and end element objects
		var start = Elements.findOne({_id: start_elem});
		var end = Elements.findOne({_id: end_elem});
		if (start && end) {

			//finds the allowed line type connecting start and elements
			var line_type = get_line_type(elem_types, start["elementTypeId"], end["elementTypeId"]);

			//if found, creates a new line
			if (line_type) {
				return line_type;
			}

			else {
				new_line_error();
			}
		}

		else {
			new_line_error();
		}
	}
}

function new_element(konva_obj_id, elem_type, points, start_elem, end_elem) {

	if (elem_type) {

		var type = elem_type["type"];

		var list = {};
		if (type == "Line") {
			list = {startElement: start_elem, endElement: end_elem};
		}

		var elem_type_id = elem_type["_id"];
		var res = Interpreter.executeExtensionPoint(elem_type, "beforeCreateElement", list);
		
		if (res != false) {
			var elem_style = elem_type["styles"][0];
			if (!elem_style) {
				Interpreter.showErrorMsg("Internal error: No element style");
				return;
			}

			Interpreter.destroyErrorMsg();

			//element specification
			list["diagramId"] = Session.get("activeDiagram");
			list["diagramTypeId"] = elem_type["diagramTypeId"];			
			list["elementTypeId"] = elem_type["_id"];
			list["style"] = {};
			list["style"]["elementStyle"] = elem_style["elementStyle"];
			list["styleId"] = elem_style["id"];
			list["type"] = type;

			if (elem_type["swimlane"]) {
				list["swimlane"] = elem_type["swimlane"];
			}

			if (type == "Box") {
				list["location"] = points;
			}

			else if (type == "Line") {
				list["points"] = points;
				list["style"]["startShapeStyle"] = elem_style["startShapeStyle"];
				list["style"]["endShapeStyle"] = elem_style["endShapeStyle"];
				list["style"]["lineType"] = elem_type["lineType"];
			}

			var compartments = Dialog.buildCopartmentDefaultValue(list);
			if (_.size(compartments) > 0) {
				list.initialCompartments = compartments;
			}

			//adds some properties to the list
			Interpreter.executeExtensionPoint(elem_type, "createElement", list);

			Utilities.callMeteorMethod("insertElement", list, function(elem_id) {

				if (elem_id) {
          			list["_id"] = elem_id;
          			Interpreter.setActiveElement(elem_id);

					var editor_type = Interpreter.getEditorType();
					if (is_ajoo_editor(editor_type)) {

						// //adding the element id to the kinetic object
						var editor = Interpreter.editor;
						var element_list = editor.getElements();

						var old_elem = element_list[konva_obj_id];
						if (old_elem) {
							//old_elem.presentation.destroy();
							old_elem.remove();

							var drawing_layer = editor.getLayer("DrawingLayer");
							drawing_layer.draw();
						}

						//adding the rendered object
						var new_elem = element_list[elem_id];
						if (new_elem) {
							editor.selectElements([new_elem]);
						}
            
					}

					//renders elements compartments
					//create_compartments(kinetic_obj, elem_id);
        
					Interpreter.executeExtensionPoint(elem_type, "afterCreateElement", list);
				}

			});

		}
		else {
			//TODO: when before create is not allowed, then an error msg should be displayed
			//show_error_msg();
		}
	}
}


//processes new line error
function new_line_error() {
	Interpreter.showErrorMsg("These elements cannot be connected");
}

//searches for the line type through super types recursively
function get_line_type(elem_type_ids, start_elem_type_id, end_elem_type_id) {

	//iterates through all the allowed element types
	//(there can be multiple element types for single palette button)
	for (var k=0;k<elem_type_ids.length;k++) {
		var elem_type_id = elem_type_ids[k];

		var elem_type_obj = ElementTypes.findOne({_id: elem_type_id});

		//query for direct match
		var query1 = {_id: elem_type_id,
						startElementTypeId: start_elem_type_id,
						endElementTypeId: end_elem_type_id,
					};

		var line_type;
		if (elem_type_obj["direction"] == "Directional") {
			line_type = ElementTypes.findOne(query1);
		}

		else {
			var query2 = {	_id: elem_type_id,
							startElementTypeId: end_elem_type_id,
							endElementTypeId: start_elem_type_id,
						};

			if (elem_type_obj["direction"] == "BiDirectional") {
				line_type = ElementTypes.findOne({$or: [query1, query2]});
			}
			else {
				if (elem_type_obj["direction"] == "ReverseDirectional") {
					line_type = ElementTypes.findOne({$or: [query1, query2]});
				}
			}
		}

		//if there is a direct match, then returns line type
		if (line_type) {
			return line_type;
		}

		//searching through supertypes	
		else { 
			//collecting super types
			var end_elem_type = ElementTypes.findOne({_id: end_elem_type_id});
			var end_elem_super_types = end_elem_type["superTypeIds"];
			if (end_elem_super_types) {
				end_elem_super_types.push(end_elem_type_id);
			}
			else {
				end_elem_super_types = [end_elem_type_id];
			}
			
			//iterates through end element type and its super types (if there are some)
			for (var j=0;j<end_elem_super_types.length;j++) {
				var end_type_id = end_elem_super_types[j];

				//collecting start element type and its super types
				var start_elem_type = ElementTypes.findOne({_id: start_elem_type_id});
				var super_types = start_elem_type["superTypeIds"];
				if (super_types) {
					super_types.push(start_elem_type_id);
				}
				else {
					super_types = [start_elem_type_id];
				}

				//iterates through all start element super types
				for (var i=0;i<super_types.length;i++) {

					if (super_types[i] == start_elem_type_id && end_type_id == end_elem_type_id) {
						continue;
					}

					var tmp_line_type = get_line_type([elem_type_id], super_types[i], end_type_id);

					//if line type is found, then returns it (the first matching line type)
					if (tmp_line_type) {
						return tmp_line_type;
					}

				}
			}
		}
	}
}

