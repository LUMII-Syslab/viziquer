import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'
import { DiagramTypes, Elements } from '/libs/platform/collections'

Interpreter.methods({

	DeleteCollection: function(e) {
		this.execute("Delete", [e]);
	},

	//deletes element collection
	Delete: function(e) {

		var selection_list;

		var editor_type = Interpreter.getEditorType();
		if (is_ajoo_editor(editor_type)) {
			var editor = Interpreter.editor;
			selection_list = editor.getSelectedElements();
		}

		var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
		var res = Interpreter.executeExtensionPoint(diagram_type, "beforeDeleteCollection", selection_list);
		if (res != false) {

			var selected_elem_ids = _.keys(selection_list);
			
			//selecting the linked line
			var linked_elem_ids = Elements.find({$or: [{startElement: {$in: selected_elem_ids}}, {endElement: {$in: selected_elem_ids}}]}).map(
				function(elem) {
					return elem["_id"];
				});

			var elements = _.union(selected_elem_ids, linked_elem_ids);

			//selecting element names for diagram history logging
			var list = {elements: elements,
						elementNames: build_element_names_array(elements),
						diagramId: Session.get("activeDiagram"),
					};

			Interpreter.executeExtensionPoint(diagram_type, "deleteCollection", list);
			Interpreter.executeExtensionPoint(diagram_type, "afterDeleteCollection", list);
		}
	},

	DeleteElementsCollection: function(list) {
		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");

		Utilities.callMeteorMethod("deleteElements", list);
	},

});

