import { Utilities } from '/imports/client/platform/js/utilities/utils'
import { Interpreter } from '/imports/client/lib/interpreter'
import { analytics } from '/imports/client/lib/global_variables'
import AjooEditor from '/imports/client/platform/js/editor/ajooEditor/ajoo/AjooEditor'

import { DiagramTypes, ElementTypes, CompartmentTypes, Diagrams, Elements, Compartments } from '/imports/db/platform/collections'

import { get_context_menu_list } from '/imports/client/platform/js/interpretator/context_menu.js'
import { compute_new_line_type } from '/imports/client/platform/js/interpretator/NewElement.js'

Interpreter.loadAjooEditor = function(diagram) {

	if (!(diagram && diagram["style"])) {
		console.error("Error: no diagram");
		return;
	}

    var diagram_type = DiagramTypes.findOne({_id: diagram["diagramTypeId"]});
	if (!(diagram_type)) {
		console.error("Error: no diagram type");
		return;
	}

	var is_edit_mode = false;
	if (diagram["editing"] && diagram["editing"]["userId"] == Session.get("userSystemId")) {
		is_edit_mode = true;
	}

    var container_name = "Diagram_Editor";

    var container_width = $("#" + container_name).width();
    var container_height = $(window).height() - $("#" + container_name).offset().top - 200;

	var settings = {
			        container: container_name,
			        width: container_width,
			        height: container_height * 0.9,

	                isEditModeEnabled: is_edit_mode,
	                data: {boxes: [], lines: []},

	                area: {
	                    background: diagram["style"],
	                },

                    boxSettings: {
                    	isMaxSizeEnabled: true,
                    	isTextFitEnabled: false,
                    },

                    lineSettings: {
                    	compartmentLayout: "processOrientedFlow",
                    },

                    isPanningEnabled: false,

	              	palette: {},
	                selectionStyle: diagram_type["selectionStyle"],

	                events: get_event_functions(),
	                eventLogging: event_logging(),
	                isLayoutComputationNeededOnLoad: diagram["isLayoutComputationNeededOnLoad"],

			    };

	return new AjooEditor(settings);
};


function get_event_functions() {

	return {

	    collectionPositionChanged: function(list) {
	    	var diagram_id = Session.get("activeDiagram");
	    	list["diagramId"] = diagram_id;

			var obj_type = get_object_type(diagram_id);
			Interpreter.executeExtensionPoint(obj_type, "changeCollectionPosition", list);
	    },

	    elementResized: function(list) {
	    	list["diagramId"] = Session.get("activeDiagram");

	        var obj_type = get_object_type(list["elementId"]);
	        Interpreter.executeExtensionPoint(obj_type, "resizeElement", list);
	    },

	  	//Clicks
	    clickedOnDiagram: function(list) {
	       	Interpreter.hideContextMenu();
	       	Interpreter.resetActiveElement();
	    },

	    clickedOnElement: function(data) {
	       	Interpreter.hideContextMenu();

	       	var element = data.element;
			Interpreter.setActiveElement(element._id);
	    },

	  	//RClicks
	    rClickedOnDiagram: function(data) {

	    	var editor = this;

			if (editor.isSelectionEmpty()) {
				var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});

		        //selecting active diagram type object
		       	if (!diagram_type) {
		       		console.error("Error: No diagram type");
		       		return;
		       	}

				var menu;
				if (Session.get("editMode")) {
					menu = get_context_menu_list(diagram_type, "noCollectionContextMenu", "dynamicNoCollectionContextMenu");
				}
				else {
					menu = get_context_menu_list(diagram_type, "readModeNoCollectionContextMenu", "dynamicReadModeNoCollectionContextMenu");
				}

				Interpreter.processContextMenu(data.ev, diagram_type[menu.attrName]);
			}

			Interpreter.resetActiveElement();
	    },

	    rClickedOnElement: function(data) {

	    	var element = data.element;
	    	var elem_id = element._id;

	    	Interpreter.setActiveElement(elem_id);

	        //selecting  active element type object
	       	var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
	       	if (!elem_type) {
	       		console.error("Error: No element type");
	       		return;
	       	}

	        //showing the context menu depending on the edit/read mode
	        var menu;
	        if (Interpreter.editor.isEditMode()) {
	        	menu = get_context_menu_list(elem_type, "contextMenu", "dynamicContextMenu");
	        }
	        else {
	        	menu = get_context_menu_list(elem_type, "readModeContextMenu", "dynamicReadModeContextMenu");
	        };

			Interpreter.processContextMenu(data.ev, elem_type[menu.attrName]);
	    },

	    rClickedOnCollection: function(data) {

	    	var element = data.element;

	        var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
	        if (!diagram_type) {
	        	console.error("Error: No diagram type");
	        	return;
	        }

	        //showing the context menu depending on the edit/read mode
	        var menu;
	        if (Interpreter.editor.isEditMode()) {
	        	menu = get_context_menu_list(diagram_type, "collectionContextMenu", "dynamicCollectionContextMenu");
	        }
	        else {
	        	menu = get_context_menu_list(diagram_type, "readModeCollectionContextMenu", "dynamicReadModeCollectionContextMenu");
	        };

	        var ev = data.ev;

	    	Interpreter.processContextMenu(data.ev, diagram_type[menu.attrName]);
	    	Interpreter.resetActiveElement();
	    },

	    keystrokes: function() {
	        //console.log("keystroke pressed")
	    },

	    newElementStarted: function(data) {

	    	var palette_button = data.paletteButton;
	    	var elem_type_id = palette_button.data.elementTypeId;

			var comparts_with_defaults = _.filter(CompartmentTypes.find({elementTypeId: elem_type_id, defaultValue: {$ne: ""}}).fetch(),
												function(compart_type) {
													return compart_type.defaultValue;
												});

			data.element.compartments = _.map(comparts_with_defaults, function(compart_type) {

				var prefix = compart_type["prefix"] || "";
				var suffix = compart_type["suffix"] || "";
				var value = prefix + compart_type["defaultValue"] + suffix;

				return {value: value,
						style: compart_type["styles"][0]["style"],
						index: compart_type["index"],
						objId: $.now(),
					};
			});

	    },

		newBoxCreated: function(data) {

	       	if (!(data && data.elementTypeId)) {
	       		console.error("Error: no data specified in palette button");
	       		return;
	       	}

	       	var presentation = data.presentation;
	       	var location = {x: presentation.x(), y: presentation.y(),
	       					width: data.width, height: data.height};

	        Interpreter.execute("NewBox", [data._id, data.elementTypeId, location]);

	        // return true;
	        return false;
	    },

	    newLineCreated: function(data) {

	    	var elem_type_id = data.elementTypeId;

	       	if (!(data && elem_type_id)) {
	       		console.error("Error: no data specified in palette button");
	       		return;
	       	}

	       	var new_line_id = data._id;

	       	var points = data.line.points();
	       	var start_elem_id = data.startElementId;
	       	var end_elem_id = data.endElementId;

	        Interpreter.execute("NewLine", [new_line_id, elem_type_id, points, start_elem_id, end_elem_id]);

	        return true;
	    },

		//return true if needs canceling the new line
		checkingNewLineConstraints: function(state) {

			var is_allowed = is_new_line_allowed(state);
			if (!is_allowed) {
				return true;
			}
		},

		selectionFinshed: function(data) {

			var editor = this;

			if (editor.selection.isSingleElementSelection()) {
				var selection = editor.getSelectedElements();

				var ids = _.keys(selection);
				var elem_id = ids[0];
			}

			else {
				Interpreter.resetActiveElement();
			}
		},

	    deleteElements: function(elements) {

	    	var editor = this;

			var selection = editor.getSelectedElements();
			_.each(elements, function(elem_id) {
				selection[elem_id] = undefined;
				//delete selection[elem_id];
			});

			//removing elements from the scene and from the editor element list
			var element_list = editor.getElements();

			var length = elements.length-1;
			for (var i=length;i>=0;i--) {

				var elem_id = elements[i];
				var element = element_list[elem_id];

				if (!element) {
					continue;
				}

				//if element has start and end elements, it is a line
				var start_elem_id = element["startElement"];
				var end_elem_id = element["endElement"];

				//removing line from the inLines and outLines collections
				if (start_elem_id && end_elem_id) {
					var start_elem = element_list[start_elem_id];
					if (start_elem) {
						start_elem["outLines"][elem_id] = undefined;
						//delete start_elem["outLines"][elem_id];
					}

					var end_elem = element_list[end_elem_id];
					if (end_elem) {
						end_elem["inLines"][elem_id] = undefined;
						//delete end_elem["inLines"][elem_id];
					}
				}

				//destroying the element
				element.remove();
			}

			_.each(elements, function(elem) {
				//delete element_list[elem];
				element_list[elem] = undefined;
			});

			//refreshing layers
			var drag_layer = editor.getLayer("DragLayer");
			drag_layer.batchDraw();

			var shapes_layer = editor.getLayer("ShapesLayer");
			shapes_layer.batchDraw();
	    },

		swimlaneEdited: function(swimlane) {

			var editor = this;

			var swimlane_presentation = swimlane.presentation;

			var h_lines_group = find_child(swimlane_presentation, "HorizontalLines");
			var h_lines = swimlane.select_lines_position(h_lines_group);

			var v_lines_group = find_child(swimlane_presentation, "VerticalLines");
			var v_lines = swimlane.select_lines_position(v_lines_group);

			var size = swimlane.getSize();
			var max_x = size.x + size.width;
			var max_y = size.y + size.height;

			editor.size.resizeStage(max_x, max_y);

			var list = {diagramId: Session.get("activeDiagram"),
						elementId: swimlane._id,
						horizontalLines: h_lines,
						verticalLines: v_lines,
					};

			Utilities.addingProjectOrToolParams(list);

			Utilities.callMeteorMethod("updateSwimlaneLines", list);
		},

		dbClickOnSwimlane: function() {

			var editor = this;

			var swimlane = editor.getSwimlane();
			if (!swimlane) {
				return;
			}

			var cell_pos = swimlane.compartments.get_cell_key(swimlane);

	        if (cell_pos) {
	            Session.set("swimlaneCell", cell_pos);
	            Interpreter.setActiveElement(swimlane._id);
	        }

		},

		dbClickOnSwimlaneText: function(compartment) {
			Session.set("swimlaneCell", {row: compartment["row"], column: compartment["column"]});

			Interpreter.setActiveElement(compartment.compartments.element._id);
		},

	};
}

function is_new_line_allowed(state) {

	if (state["end"]) {

		var elem_type_id = state["data"]["elementTypeId"];
		var start_elem_id = state.start.element._id;
		var end_elem_id = state.end._id;

		var line_type = compute_new_line_type([elem_type_id], start_elem_id, end_elem_id);

		if (!line_type) {
			Interpreter.showErrorMsg("These elements cannot be connected", -1);
			return false;
		}

		else {
			Interpreter.destroyErrorMsg();
		}
	}

	else {
		Interpreter.destroyErrorMsg();
	}

	return true;
}

function get_object_type(obj_id) {

	var diagram = Diagrams.findOne({_id: obj_id});
	if (diagram) {
		return DiagramTypes.findOne({_id: diagram["diagramTypeId"]});
	}

	else {

		var element = Elements.findOne({_id: obj_id});
		if (element) {
			return ElementTypes.findOne({_id: element["elementTypeId"]});
		}

		else {

			var compartment = Compartments.findOne({_id: obj_id});
			if (compartment) {
				return CompartmentTypes.findOne({_id: compartment["compartmentTypeId"]});
			}

			else {
				console.error("Error: no object with the given id ", obj_id);
				return;
			}
		}

	}
}

function event_logging() {

	return {

		collectionPositionChanged: function(data) {

			analytics.track("ajooEditor", {
				eventName: "collectionPositionChanged",
				value: {},
			});
		},

		clickedOnDiagram: function(data) {

			analytics.track("ajooEditor", {
				eventName: "clickedOnDiagram",
				value: {},
			});
		},

		clickedOnElement: function(data) {

			analytics.track("ajooEditor", {
				eventName: "clickedOnElement",
				value: {},
			});
		},

		clickedOnCollection: function(data) {

			analytics.track("ajooEditor", {
				eventName: "clickedOnCollection",
				value: {},
			});
		},

		//RClicks
		rClickedOnDiagram: function(data) {

			analytics.track("ajooEditor", {
				eventName: "rClickedOnDiagram",
				value: {},
			});
		},

		rClickedOnElement: function(data) {

			analytics.track("ajooEditor", {
				eventName: "rClickedOnElement",
				value: {},
			});
		},

		rClickedOnCollection: function(data) {

			analytics.track("ajooEditor", {
				eventName: "rClickedOnCollection",
				value: {},
			});
		},

		keystrokes: function() {
			//console.log("keystroke pressed")
		},

		newBoxCreated: function(data) {

			analytics.track("ajooEditor", {
				eventName: "newBoxCreated",
				value: {},
			});
		},

		newLineCreated: function(data) {

			analytics.track("ajooEditor", {
				eventName: "newLineCreated",
				value: {},
			});
		},

		creatingNewLine: function(data) {

			analytics.track("ajooEditor", {
				eventName: "creatingNewLine",
				value: {},
			});
		},

		deleteElements: function(data) {

			analytics.track("ajooEditor", {
				eventName: "deleteElements",
				value: {},
			});
		},

		elementResized: function(data) {

			analytics.track("ajooEditor", {
				eventName: "elementResized",
				value: {},
			});
		},

		swimlaneEdited: function(data) {

			analytics.track("ajooEditor", {
				eventName: "swimlaneEdited",
				value: {},
			});
		},

		dbClickOnSwimlane: function(data) {

			analytics.track("ajooEditor", {
				eventName: "dbClickOnSwimlane",
				value: {},
			});
		},

	};
}
