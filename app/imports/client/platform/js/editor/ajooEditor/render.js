import { Interpreter } from '/imports/client/lib/interpreter'
import { DiagramTypes, ElementTypes, PaletteButtons, Diagrams, Elements, Compartments } from '/imports/db/platform/collections'
import { is_ajoo_editor } from '/imports/libs/platform/lib'


//render_ajoo_editor_diagram
Interpreter.renderAjooEditorDiagram = function(editor, template) {

	Session.set("editMode", editor.isEditMode());

	var init = true;

	var palette = [];
   	var palette_handle = PaletteButtons.find({diagramTypeId: Session.get("diagramType")}).observeChanges({
		added: function (id, palette_button) {

			build_palette_button(id, palette_button);

			if (init)
				palette.push(palette_button);

			else {

				//adding palette elements
				rebuild_palette(editor);
				editor.palette.refresh();
			}
		},

		changed: function (id, fields) {
			rebuild_palette(editor);
			editor.palette.paletteGroup.draw();
		},

		removed: function (id) {
			rebuild_palette(editor, true);
		},

    });

	template.paletteHandle = new ReactiveVar(palette_handle);
	//editor.palette.add(palette);

	var diagram_handle = Diagrams.find().observeChanges({

		changed: function(id, fields) {

			//if element style changed, then updating palette's button
			if (fields["style"]) {
				var container = editor.container();
				$(container).css({"background-color": fields["style"]["fill"]});
			}
		}

	});
	template.diagramHandle = new ReactiveVar(diagram_handle);

	var boxes = [];
	var lines = [];

   	var elem_handle = Elements.find({isInVisible: {$ne: true}}).observeChanges({

		added: function (id, elem) {
			elem["_id"] = id;

			//if initializing, then collecting all the data
			if (init) {
				if (elem["type"] == "Box") {
					boxes.push(elem);

				}
				else if (elem["type"] == "Line")
					lines.push(elem);

				var comparts_query = build_comparts_query();
				_.extend(comparts_query, {elementId: elem["_id"]});
				elem["compartments"] = Compartments.find(comparts_query, {sort: {index: 1}}).fetch();
			}

			//if added later
			else {

				var data = {boxes: [], lines: []};
				if (elem["type"] == "Box")
					data.boxes.push(elem);

				else if (elem["type"] == "Line")
					data.lines.push(elem);

				editor.addElements(data);
			}
		},

		changed: function (id, fields) {

			var element_list = editor.getElements();
			if (!element_list) {
				return;
			}

			var element = element_list[id];
			if (!element) {
				return;
			}

			if (fields["style"]) {

				//recomputing box style
				if (element["type"] == "Box") {
					var style_obj = fields.style.elementStyle;

					//if style shape changed, then removing and creating a new element
					if (style_obj["shape"] && element.name != style_obj["shape"]) {

						var new_style = style_obj;

						var pos = element.getElementPosition();
						var size = element.getSize();
						var box_in = {
										_id: id,
										location: {x: pos.x, y: pos.y, width: size.width, height: size.height,},
										style: {elementStyle: new_style},
										compartments: _.map(element.compartments.compartments, function(compartment) {

											var res = {_id: compartment._id,
														value: compartment.value,
														input: compartment.input,
													};

											if (compartment.presentation) {
												res.style = compartment.presentation.getAttrs();
											}

											return res;
										}),
									};


						var parent = element.presentation.getParent();

						var new_elem = element.editor.elements.createShape(new_style["shape"]);
						new_elem.create(parent, box_in);
						new_elem.inLines = element.inLines;
						new_elem.outLines = element.outLines;

						new_elem.setStyleAttrs(new_style);

						var is_selected = false;
						var selected = editor.getSelectedElements();
						if (selected[id])
							is_selected = true;

						element.remove();
						editor.elements.elementList[id] = new_elem;

						if (is_selected) {
							editor.selectElements([new_elem]);
						}

						new_elem.presentation.getLayer().batchDraw();
					}

					else {
						element.updateStyle(fields.style);
						element.presentation.draw();
					}

				}

				//recomputing line style
				else if (element["type"] == "Line") {
					element.setStyle(fields["style"]);

					var parent = element.presentation.getParent();
					if (parent["name"] == "ShapesLayer") {
						parent.batchDraw();
					}

					else {
						var drag_layer = editor.getLayer("DragLayer");
						drag_layer.batchDraw();
						// parent.batchDraw();
					}
				}			
			}

			//if position or size changed
			if (fields["location"]) {

				if (editor.isEditing) {
					return;
				}

				var location = fields["location"];

				element.setElementPosition(location.x, location.y);
				element.updateSizeAndCompartments(location.width, location.height) ;

				var parent_layer = element.presentation.getLayer();	
	
				if (element.type == "Box") {
					var selected = editor.getSelectedElements();
					if (selected[element._id]) {

						if (editor.isEditMode() && element.type == "Box") {
							element.removeResizers();
							element.addResizers();
						}
					}
				}

				parent_layer.batchDraw();
			}

			//if line points changed
			if (fields["points"]) {

				if (editor.isEditing) {
					return;
				}

				var new_points = fields["points"].slice();

				if (editor.isEditMode())
					element.transformLinePointsToUnselected(new_points);

				element.setPoints(new_points);

				var parent_layer = element.presentation.getLayer();
				parent_layer.batchDraw();
			}

			//if swimlane structure changed
			if (fields["swimlane"]) {
				element.rerender_swimlane(fields["swimlane"]);
			}

		},

		removed: function (id) {

			editor.removeElements([id]);

			var shapes_layer = editor.getLayer("ShapesLayer");
			shapes_layer.batchDraw();

			var swimlane_layer = editor.getLayer("SwimlaneLayer");
			if (swimlane_layer)
				swimlane_layer.batchDraw();

			//Note: Not sure if they are needed
			var drag_layer = editor.getLayer("DragLayer");
			drag_layer.batchDraw();

			var drawing_layer = editor.getLayer("DrawingLayer");			
			drawing_layer.batchDraw();
		}
    });

	template.elementHandle = new ReactiveVar(elem_handle);
   	editor.addElements({boxes: boxes, lines: lines});

   //	var compart_handle = Compartments.find({"style.visible": {$nin: ["false", false]}}).observeChanges({
   	var comparts_query = build_comparts_query();
   	var compart_handle = Compartments.find(comparts_query).observeChanges({

   		added: function (id, doc) {

   			if (!init) {

	   			//selecting element object
	   			var elem_id = doc["elementId"];
	   			var element_list = editor.getElements();
	   			var element = element_list[elem_id];

				if (element["type"] == "Swimlane") {
					doc["_id"] = id;

					element.compartments.create([doc]);

	   				var swimlane_layer = element.presentation.getLayer();
	   				swimlane_layer.batchDraw();
				}

	   			else {

	   				element.compartments.removeAllRespresentations();
	   				var compartments = Compartments.find({elementId: elem_id}, {sort: {index: 1}}).fetch();
	   				element.compartments.create(compartments);

	   				var element_presentation = element.presentation;
		   			var parent_layer = element_presentation.getLayer();
		   			if (parent_layer.name == "DragLayer") {

		   				if (element.type == "Box") {
			   				element.removeResizers();
			   				element.addResizers();
			   			}

			   			parent_layer.batchDraw();
		   			}

		   			else {
		   				parent_layer.batchDraw();
		   				// element_presentation.draw();	
		   			}
	   			}
   			}
   		},

   		changed: function(id, fields) {
   			var compart_list = editor.compartmentList;
   			var compartment = compart_list[id];

			var compart_in = Compartments.findOne({_id: id});
			if (!compart_in) {
				return;
			}

			var elem_id = compart_in.elementId;
			var elem = editor.elements.elementList[elem_id];
			if (!elem) {
				console.error("No element for compartment", elem_id, id);
				return;
			}


			elem.compartments.removeAllRespresentations();
			var compartments = Compartments.find({elementId: elem_id}, {sort: {index: 1}}).fetch();

			elem.compartments.create(compartments);


			if (!_.isUndefined(fields["value"])) {
				// var element = compartments.element;
				var element_presentation = elem.presentation;

				//refreshin layer because resizers gets bold after multiple updates
				var parent_layer = element_presentation.getLayer();
				if (parent_layer.name == "DragLayer") {
					parent_layer.draw();
				}

				else {
					parent_layer.draw();
					// element_presentation.draw();
				}

				return;
			}



   			// if (!compartment) {

   			// 	var compart_in = Compartments.findOne({_id: id});
   			// 	if (!compart_in) {
   			// 		return;
   			// 	}

   			// 	var elem_id = compart_in.elementId;
   			// 	var elem = editor.elements.elementList[elem_id];
   			// 	if (!elem) {
   			// 		console.error("No element for compartment", elem_id, id);
   			// 		return;
   			// 	}

   			// 	elem.compartments.create([compart_in]);
   			// 	compartment = compart_list[id];
   			// }


			// if (compartment) {
			// 	var compart_presentation = compartment.presentation;
			// 	var compartments = compartment.compartments

			// 	var element = compartments.element;
			// 	var element_presentation = element.presentation;

			// 	if (!_.isUndefined(fields["value"])) {

			// 		console.log("compart_presentation ", compart_presentation)

			// 		if (compart_presentation) {
			// 			console.log("in setting value", fields["value"])

			// 			compart_presentation.text(fields["value"]);
			// 		}

			// 		if (element.type == "Swimlane") {
			// 			var swimlane_layer = element_presentation.getLayer();
			// 			swimlane_layer.batchDraw();

			// 			return;
			// 		}

			// 		else {

			// 			if (element.type == "Line") {
			// 				compartments.recomputeCompartmentsPosition(compartment);
			// 			}

			// 			else if (element.type == "Box") {
			// 				console.log("recomputeCompartmentsPosition")
			// 				compartments.recomputeCompartmentsPosition();

			// 				console.log("compartments ", compartments)
			// 			}

			// 			//refreshin layer because resizers gets bold after multiple updates
			// 			var parent_layer = element_presentation.getLayer();
			// 			if (parent_layer.name == "DragLayer") {
			// 				console.log("batch draw1")
			// 				parent_layer.draw();
			// 			}

			// 			else {
			// 				console.log("batch draw2")

			// 				parent_layer.draw();
			// 				// element_presentation.draw();
			// 			}

			// 			return;
			// 		}
			// 	}

				if (fields["style"]) {

					if (compart_presentation) {
						compart_presentation.setAttrs(fields["style"]);
					}

					if (element.type == "Line") {

						if (fields.style.placement) {
							var placement = compartments.getPlacementByName(fields.style.placement);

							if (compartment.presentation) {
								compartment.presentation.moveTo(placement.group);
							}

							compartment.placement = placement;
						}

						compartments.recomputeCompartmentsPosition(compartment);
						element_presentation.getLayer().batchDraw();
					}

					else if (element.type == "Box") {
						compartments.recomputeCompartmentsPosition();
						element_presentation.draw();
					}
					
					return;
				}

				if (fields["index"]) {
					if (compartments.removeAllRespresentations) {
						compartments.removeAllRespresentations();
					}

					var comparts_in = Compartments.find({elementId: element._id}, {sort: {index: 1}}).fetch();
					compartments.create(comparts_in);
					element_presentation.draw();

					return;
				}	   	

				if (fields["swimlane"]) {

					var new_compart = fields["swimlane"];
					compartment.row = new_compart.row;
					compartment.column = new_compart.column;

					compartments.reposition_swimlane_compartments();
					var swimlane_layer = element_presentation.getLayer();
					swimlane_layer.batchDraw();
				}
			// }
   		},

   		removed: function(id) {
   			var compart_list = editor.compartmentList;
   			var compartment = compart_list[id];

   			if (!compartment) {
   				console.log("no compartment", id);
   				return;
   			}

			var compartments = compartment.compartments
			var element = compartments.element;
			var element_presentation = element.presentation;

   			// if (compartment && _.size(compartment.compartments) > 0) {
   				var compartments = compartment.compartments;
   				compartments.removeOne(id);

   				console.log("compartment", compartment)

   				if (compartment["placement"] && compartment["placement"]["name"]) {
   					let name = compartment["placement"]["name"];
   					console.log("name ", name)

   					compartments["placements"][name]["height"] -= compartment["textHeight"];

					compartments.computeGroupsPositions();
					compartments.computeTextsPositions();	   					
   				}
   			// }
   		},

   	});

	template.compartmentHandle = new ReactiveVar(compart_handle);

	var elem_type_handle = ElementTypes.find().observeChanges({

		changed: function(id, fields) {

			//if element style changed, then updating palette's button
			if (fields["styles"] || fields["defaultFixedSize"]) {
				rebuild_palette(editor);
				editor.palette.refresh();
			}
		}

	});
	template.elementTypeHandle = new ReactiveVar(elem_type_handle);

	var diagram_type_handle = DiagramTypes.find().observeChanges({

		added: function(id, doc) {
			var palette = doc.palette || {};
			recompute_palette(editor, palette);
		},

		changed: function(id, fields) {

			//if selection style changed, then updating the editor
			if (fields["selectionStyle"]) { 
				editor.selectionStyle.style = fields["selectionStyle"];
			}

			if (fields["layout"]) {

				var editor_type = Interpreter.getEditorType();
				if (is_ajoo_editor(editor_type))
                    editor.lineSettings.compartmentLayout = fields.layout.lineLayoutMode;

				else {
					//TODO
				}
			}

			if (fields["palette"]) {
				var palette = fields.palette;
				recompute_palette(editor, palette)
			}

		}

	});
	template.diagramTypeHandle = new ReactiveVar(diagram_type_handle);

   	init = false;
}

function get_shape_group_from_text(text) {
	var text_parent = get_parent(text);
	if (!text_parent)
		return;

	var texts_group
	if (text_parent["name"] != "TextsGroup")
		texts_group = get_parent(text_parent);
	else
		texts_group = text_parent;

	var shape_group = get_parent(texts_group);
	return shape_group;
}

function rebuild_labels(element) {

	//selecting element compartments
	var elem_id = element._id;
	var compartments = Compartments.find({elementId: elem_id}, {sort: {index: 1}}).fetch();

	//adding compartments
	create_compartments(shape_group, compartments);

	var layer = element.presentation.getLayer();
	layer.batchDraw();
}

function recompute_palette(editor, palette) {

	editor.palette.buttonWidth = palette.buttonWidth || 35;
	editor.palette.buttonHeight = palette.buttonHeight || 30;
	editor.palette.distanceBetweenButtons = palette.padding || 3;

	rebuild_palette(editor, true);
}

function rebuild_palette(editor, is_refresh_needed) {

	var new_palette = compute_palette();

	editor.palette.remove();

	//adding palette elements
	editor.palette.add(new_palette);

	if (is_refresh_needed) {
		editor.palette.refresh();
	}
}


function build_palette_button(id, palette_button) {

	palette_button["_id"] = id;

	var elem_type = ElementTypes.findOne({_id: {$in: palette_button["elementTypeIds"]}});
	if (!elem_type)
		return;

	var complex_style;
	if (elem_type["styles"] && elem_type["styles"][0]) {

		var style_obj = elem_type["styles"][0];

		complex_style = {elementStyle: style_obj["elementStyle"]};

		if (style_obj["startShapeStyle"])
			complex_style["startShapeStyle"] = style_obj["startShapeStyle"];

		if (style_obj["endShapeStyle"])
			complex_style["endShapeStyle"] = style_obj["endShapeStyle"];
	}

	if (elem_type["lineType"])
		complex_style["lineType"] = elem_type["lineType"];


	if (elem_type.defaultFixedSize) {
		palette_button.defaultSize = {};

		if (elem_type.defaultFixedSize.defaultFixedWidth)
			palette_button.defaultSize.width = elem_type.defaultFixedSize.defaultFixedWidth;

		if (elem_type.defaultFixedSize.defaultFixedHeight)
			palette_button.defaultSize.height = elem_type.defaultFixedSize.defaultFixedHeight;
	}

	palette_button["style"] = complex_style;

	palette_button["data"] = {elementTypeId: elem_type["_id"]};
}

function compute_palette() {

	var palette = PaletteButtons.find({diagramTypeId: Session.get("diagramType")}).map(
		function(palette_button) {

			build_palette_button(palette_button["_id"], palette_button);

			return palette_button;
		});

	return palette;
}

function build_comparts_query() {
	return {$or: [{"style.visible": true}, {"style.visible": "true"}]};
}

