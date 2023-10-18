import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'
import { Elements, Diagrams, DiagramTypes } from '/libs/platform/collections'


Interpreter.methods({

	createDiagram: function(diagram_name, diagram_type_id) {

		var diagram_type = DiagramTypes.findOne({_id: diagram_type_id});
		if (!diagram_type) {
			return;
		}

		var list = {name: diagram_name};
		var res = Interpreter.executeExtensionPoint(diagram_type, "beforeCreateDiagram", list);

		if (res != false) {
			Interpreter.executeExtensionPoint(diagram_type, "createDiagram", list);

			Utilities.callMeteorMethod("insertDiagram", list, function(id) {

				list["diagramId"] = id;
				Interpreter.executeExtensionPoint(diagram_type, "afterCreateDiagram", list);

				if (id) {
					FlowRouter.go("diagram", {projectId: list["projectId"],
											_id: id,
											diagramTypeId: list["diagramTypeId"],
											versionId: list["versionId"],
										});
				}

			});
		}
	},

	delete_diagram: function(diagram_id) {

		if (!diagram_id) {
			diagram_id = Session.get("activeDiagram");
		}

		var diagram = Diagrams.findOne({_id: diagram_id});
		if (diagram) {
			var diagram_type_id = diagram["diagramTypeId"];
			var diagram_type = DiagramTypes.findOne({_id: diagram_type_id});
			if (!diagram_type) {
				diagram_type = DiagramTypes.findOne({});
				if (!diagram_type) {
					return;
				}
			}

			var list = {id: diagram_id};
			var res = Interpreter.executeExtensionPoint(diagram_type, "beforeDeleteDiagram", list);
			if (res != false) {
				Interpreter.executeExtensionPoint(diagram_type, "deleteDiagram", list);
				Interpreter.executeExtensionPoint(diagram_type, "afterDeleteDiagram", list);
			}
		}
	},

	CreateDiagram: function(list) {

		var obj_type = this;

		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");
		list["style"] = obj_type["style"];
		list["diagramTypeId"] = obj_type["_id"];
		list["editorType"] = obj_type["editorType"];
	},

	DeleteDiagramObject: function(list) {

		var obj_type = this;

		list["projectId"] = Session.get("activeProject");
		list["versionId"] =	Session.get("versionId");

		Utilities.callMeteorMethod("removeDiagram", list);
		FlowRouter.go("diagrams", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")});
	},

	AddTargetDiagram: function() {

		var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
		if (elem_type) {

			//vajag new diagram type
			var diagram_type = DiagramTypes.findOne({_id: elem_type["targetDiagramTypeId"]});
			if (!diagram_type) {
				return;
			}

			var elem_id = Session.get("activeElement");
			var compart = Compartments.findOne({elementId: elem_id, isObjectRepresentation: true});
			if (!compart) {
				compart = Compartments.findOne({elementId: elem_id});
			}

			var diagram = {projectId: Session.get("activeProject"),
							versionId: Session.get("versionId"),
							name: compart["value"] || "Diagram",
							diagramTypeId: diagram_type["_id"],
							style: diagram_type["style"],
						};

			var element = {projectId: Session.get("activeProject"),
							versionId: Session.get("versionId"),
							id: elem_id,
						};	

			var list = {parentDiagram: Session.get("activeDiagram"), diagram: diagram, element: element};

			Utilities.callMeteorMethod("addTargetDiagram", list);
		}
	},

	Navigate: function() {
		var elem = Elements.findOne({_id: Session.get("activeElement")});
		if (elem) {
			var target_id = elem["targetId"];
			if (target_id) {

				var stage = Interpreter.editor;
				stage["selection"] = [];
				stage["selected"] = {};

				FlowRouter.go("diagram", {projectId: Session.get("activeProject"),
										_id: target_id,
										diagramTypeId: Session.get("diagramType"),
										versionId: Session.get("versionId"),
										editMode: "edit",
									});
			}
		}
	},

	ChangeCollectionPosition: function(list) {
	    list["projectId"] = Session.get("activeProject");
	    list["versionId"] = Session.get("versionId");

	    Utilities.callMeteorMethod("changeCollectionPosition", list);
	},


	align_selected_boxes: function(list) {
		console.log("align selected boxes")
		// Interpreter.editor.alignSelection(0, 1);
	    
	 //    list["projectId"] = Session.get("activeProject");
	 //    list["versionId"] = Session.get("versionId");

	 //    Utilities.callMeteorMethod("changeCollectionPosition", list);
	},


	ComputeLayout: function(boxes, lines) {
		let editor = Interpreter.editor;
		let layoutEngine = editor.layoutEngine();

		let elements_to_map = {};
		let elements_from_map = {};

		let elements = editor.getElements();
		if(boxes == null){
			boxes = _.filter(elements, function(elem) {
						return elem.type == "Box";
					});
		}
		if(lines == null){
		let lines = _.filter(elements, function(elem) {
						return elem.type == "Line";
					});
		}
		_.each(boxes, function(box, i) {
			let position = box.getElementPosition();

			layoutEngine.addBox(i, position.x, position.y, position.width, position.height);

			let box_id = box._id;
			if (!_.isNumber(elements_to_map[box_id])) {
				elements_to_map[box_id] = i;
				elements_from_map[i] = box;
			}
		});

		_.each(lines, function(line, j) {
			let i = _.size(boxes) + j;
			layoutEngine.addLine(i, elements_to_map[line.startElementId], elements_to_map[line.endElementId], {lineType: "ORTHOGONAL"})

			let line_id = line._id;
			if (!_.isNumber(elements_to_map[line_id])) {
				elements_to_map[line_id] = i;
				elements_from_map[i] = line;
			}
		});

    	// let new_layout = layoutEngine.arrangeFromScratch()
    	let new_layout = layoutEngine.arrangeIncrementally()

		let moved_boxes = _.map(new_layout.boxes, function(box_in, key) {
							let box = elements_from_map[key];
							if (!box) {
								console.error("No box", key, elements_from_map);
								return;
							}

							box.setElementPosition(box_in.x, box_in.y);
							box.updateSize(box_in.width, box_in.height);

							return {id: box._id, position: {x: box_in.x,
															y: box_in.y,
															width: box_in.width,
															height: box_in.height,
														},};
						});

    	let new_lines = _.map(new_layout.lines, function(line_in, key) {
				    		let line_new_points = [];
				    		_.each(line_in, function(line) {
				    			line_new_points.push(line.x);
				    			line_new_points.push(line.y);
				    		});

				    		let line = elements_from_map[key];
				    		if (!line) {
								console.error("No line", key, elements_from_map);
								return;
							}

			    			line.setPoints(line_new_points);
							// link.setPoints(line_points);
							// OrthogonalRerouting.recompute(link, state);

				    		return {id: line._id, points: line_new_points};
				    	});

		let list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					lines: new_lines,
					movedBoxes: moved_boxes,
				};

		Utilities.callMeteorMethod("changeCollectionPosition", list);

	},

});

