import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'
import { Projects, Diagrams, DiagramTypes } from '/imports/db/platform/collections'
import { is_ajoo_editor } from '/imports/libs/platform/lib'


Interpreter.methods({

	Cut: function() {

		if (Interpreter.editor.isEditMode()) {
			Copy();
			//Delete();
		}
	},

	Copy: function() {
		var diagram_id = Session.get("activeDiagram");
		var diagram = Diagrams.findOne({_id: diagram_id});
		var project = Projects.findOne({_id: Session.get("activeProject")});

		var diagram_type_id = diagram["diagramTypeId"];
		var diagram_type = DiagramTypes.findOne({_id: diagram_type_id});

		if (!diagram || !project || !diagram_type) {
			return;
		}

		var selected_elements;
		var editor = Interpreter.editor;
		
		var editor_type = Interpreter.getEditorType();

		if (is_ajoo_editor(editor_type)) {
			selected_elements = editor.getSelectedElements();

			var left_point = {x: Infinity, y: Infinity};
			_.each(selected_elements, function(elem) {

				if (elem["type"] == "Box") {
					var size = elem.getSize();
					var x = size.x;
					var y = size.y;

					if (x < left_point["x"] && y < left_point["y"]) {
						left_point["x"] = x;
						left_point["y"] = y;
					}
				}
			});

			var drag_layer = editor.getLayer("DragLayer");
			var drag_group = editor.findChild(drag_layer, "DragGroup");
			left_point["x"] = left_point["x"] + drag_group.x();
			left_point["y"] = left_point["y"] + drag_group.y();

			var selected_elem_list = _.keys(selected_elements);

			var res = Interpreter.executeExtensionPoint(diagram_type, "beforeCopyCollection", selected_elements);
			if (res != false) {
				var list = {
							diagramTypeId: diagram_type._id,
							toolId: project.toolId,
							diagramId: diagram_id,
							elements: selected_elem_list,
							leftPoint: left_point,
						};

				Interpreter.executeExtensionPoint(diagram_type, "copyCollection", list);
			}
		}

		else {
			selected_elem_list = _.map(editor.selection(), function(elem) {
				return elem.id;
			});

			var res = Interpreter.executeExtensionPoint(diagram_type, "beforeCopyCollection", selected_elements);
			if (res != false) {
				var list = {
							diagramId: diagram_id,
							elements: selected_elem_list,
						};

				Interpreter.executeExtensionPoint(diagram_type, "copyCollection", list);
			}	
		}
	},

	Paste: function(ev_obj) {

		var editor = Interpreter.editor;

		var diagram_id = Session.get("activeDiagram");
		var diagram = Diagrams.findOne({_id: diagram_id});

		var project = Projects.findOne({_id: Session.get("activeProject")});
		var diagram_type = DiagramTypes.findOne({_id: diagram["diagramTypeId"]});

		if (!diagram || !project || !diagram_type) {
			return;
		}

		var editor_type = Interpreter.getEditorType();
		if (is_ajoo_editor(editor_type)) {

			var e;
			if (editor.data.ev) {
				e = editor.data.ev;
			}

			var x, y;
			if (e) {
				var mouse_state_obj = editor.getMouseStateObject();
				var mouse_pos = mouse_state_obj.getMousePosition(e);
				x = mouse_pos["x"];
				y = mouse_pos["y"];
			}

			var list = {
						diagramTypeId: diagram_type._id,
						toolId: project.toolId,
						diagramId: diagram_id,
						x: x,
						y: y,
					};

			var res = Interpreter.executeExtensionPoint(diagram_type, "pasteCollection", list);
			editor.data = {};
		}

		else {
			var list = {diagramId: diagram_id,};
			var res = Interpreter.executeExtensionPoint(diagram_type, "pasteCollection", list);
		}

	},

	CopyCollection: function(list) {

		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");

		Utilities.callMeteorMethod("copyElements", list);
	},

	PasteCollection: function(list) {
		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");

		Utilities.callMeteorMethod("pasteElements", list, function(res) {

			var editor = Interpreter.editor;

			var editor_elems = editor.getElements();
			var pasted_elems = _.map(_.union(res.boxes, res.lines), function(pasted_elem_id) {
									return editor_elems[pasted_elem_id];
								});

			editor.selection.clearSelection();
			editor.selectElements(pasted_elems);
		});
	},

});

