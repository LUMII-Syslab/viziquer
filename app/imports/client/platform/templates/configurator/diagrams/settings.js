import { Configurator } from '/imports/client/platform/templates/configurator/config_utils'
import { Utilities } from '/imports/client/platform/js/utilities/utils'
import { Interpreter } from '/imports/client/lib/interpreter'
import { DiagramTypes } from '/imports/db/platform/collections'
import { is_ajoo_editor } from '/imports/libs/platform/lib'

import './settings.html'
import { Dialog } from '../../../js/interpretator/Dialog'

Template.diagramAdanced.helpers({

	settings: function() {

		var editor_type = Interpreter.getEditorType();
		return {
				diagramSize: true,
				globalKeyStokes: true,
				selection: true,
				isPalette: is_ajoo_editor(editor_type),
				isLayout: true,
			};
	},

});

//Start of global keystrokes
Template.diagramSize.helpers({
	size: function() {
		var diagram_type = DiagramTypes.findOne({diagramId: Session.get("activeDiagram")});
		if (diagram_type && diagram_type["size"]) {
			return {diagramSize: diagram_type["size"]["diagramSize"],
					dialogSize: diagram_type["size"]["dialogSize"]};
		}
	},
});

Template.diagramSize.events({

	'change .dialog-input' : function(e) {
		var pair = Configurator.getInputFieldValue(e);
		var attr_name = pair["_attr"];
		var attr_value = pair["_value"];
		 
		var list = {attrName: attr_name, attrValue: attr_value};
		update_diagram_size(list);
	},
});

Template.globalKeyStokes.helpers({
	keyStrokes: function() {
		return Configurator.getKeystrokesOrItems("globalKeyStrokes");
	},
});

Template.globalKeyStokes.events({

//add key stroke
	'click #add-global-keystroke' : function(e) {
		var collection_meta_data = {collection: "DiagramTypes",
									array: "globalKeyStrokes",
									fields: ["keyStroke", "procedure"]};

		Configurator.addKeystrokeOrItem(e, "addKeystrokeOrContextMenu", collection_meta_data);
	},

//remove key stroke
	'click .remove-global-keystroke' : function(e) {
		var collection = {collection: "DiagramTypes", array: "globalKeyStrokes"};

		Configurator.deleteKeystrokeOrItem(e, "deleteKeyStrokeOrContextMenu", collection);
	},

//updates key stroke
	'blur .global-keystroke': function(e) {
		var collection = {collection: "DiagramTypes",
							array: "globalKeyStrokes",
							field: "keyStroke"};
							
		Configurator.updateKeystrokeOrItem(e, "updateKeystrokeOrContextMenu", collection);
	},

//updates key stroke procedure
	'blur .global-keystroke-procedure': function(e) {
		var collection = {collection: "DiagramTypes",
							array: "globalKeyStrokes",
							field: "procedure"};

		Configurator.updateKeystrokeOrItem(e, "updateKeystrokeOrContextMenu", collection);
	},

});
//End of global keystrokes

Template.SelectionStyle.helpers({
	styles: function() {
		return Configurator.getDiagramTypeProperty("selectionStyle");
	}
});

Template.SelectionStyle.events({

	'blur .dialog-input' : function(e) {
		update_selection_or_new_line_style(e, "selectionStyle");
	},

});

Template.SelectionStyle.rendered = function() {
	Dialog.addColorPicker();
}

Template.PaletteSettings.events({

	'blur .dialog-input' : function(e) {
		update_selection_or_new_line_style(e, "palette");
	},

});

Template.PaletteSettings.helpers({

	palette: function() {
		return Configurator.getDiagramTypeProperty("palette") || {};
	},
	
});

Template.layoutSettings.helpers({

	layout_settings: function() {

		var layout = Configurator.getDiagramTypeProperty("layout");

		var editor_type = Interpreter.getEditorType();
		if (is_ajoo_editor(editor_type)) {

			//adding selection values
			var layouts = [{name: "lineOrientedFlow"},
							{name: "processOrientedFlow"},
							{name: "owlGrEdLayout"},
						];

			var line_layout_mode;
			if (!layout) {
				line_layout_mode = "lineOrientedFlow";
			}
			else {
				line_layout_mode = layout.lineLayoutMode;
			}
	
			build_selection(layouts, line_layout_mode);

			return {isAjooEditor: true, layouts: layouts};
		}

		else {

			if (!layout) {
				return;
			}

			//adding mode selection values
			var mode = layout["mode"];
			var modes = [{name: "dynamic"},
							{name: "radial"},
							{name: "static"},
						];
			build_selection(modes, mode);
			layout["modes"] = modes;

			//adding selection values
			var global_layout_on_change = layout["globalLayoutOnChanges"];
			var options = [{name: "true"},
							{name: "false"},
						];
			build_selection(options, global_layout_on_change);
			layout["globalLayoutOnChanges"] = options;

			return layout;
		}
	},

});

Template.layoutSettings.events({

	'change .dialog-input' : function(e) {
		Configurator.updateElementStyleFromSelection(e);
	},

	'change .dialog-selection' : function(e) {

		var pair = Configurator.selectSelectionValue(e);
		var id = pair["_attr"];
		var value = pair["_value"];

		Configurator.updateObjectTypeObj(id, value);
	},

});

function build_selection(list, name) {

	return _.map(list, function(item) {
		if (item["name"] == name) {
			item["selected"] = "selected";
		}

		return item;
	});
}


function update_diagram_size(list) {
	list["id"] = Session.get("targetDiagramType");
	list["toolId"] = Session.get("toolId");

	Utilities.callMeteorMethod("updateDiagramSize", list);
}

function update_selection_or_new_line_style(e, selection_or_line) {
	var pair = Configurator.getInputFieldValue(e);
	var attr_name = pair["_attr"];
	var attr_value = pair["_value"];
	
	var list = {id: Session.get("targetDiagramType"),
				attrName: selection_or_line + '.' + attr_name,
				attrValue: attr_value,
				toolId: Session.get("toolId"),
			};

	Utilities.callMeteorMethod("updateDiagramType", list);
}
