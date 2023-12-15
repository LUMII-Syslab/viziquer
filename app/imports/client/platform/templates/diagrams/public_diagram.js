import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'
import { is_system_admin } from '/libs/platform/user_rights'
import { Diagrams, Elements, ElementsSections, DiagramTypes, ElementTypes, Sections, Documents } from '/imports/db/platform/collections'

import './public_diagram.html'

Template.publicDiagramTemplate.onRendered(function() {
	// $("#lockDiagram").trigger("click");

	// YASQE.registerAutocompleter('customClassCompleter', customClassCompleter);
	// YASQE.registerAutocompleter('customPropertyCompleter', customPropertyCompleter);
	// YASQE.defaults.autocompleters = ['customClassCompleter', "customPropertyCompleter", "variables"];

	// if (Session.get("editMode")) {
	Session.set("userSystemId", "unknown");
	set_locked_diagram();
	// }

});


Template.publicDiagramTemplate.helpers({

	isReady: function() {
		return FlowRouter.subsReady("Diagram_Palette_ElementType");
	},

	plain: function() {
		return Session.get("plain");
	},

	diagram_type: function() {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
		if (diagram_type && diagram_type["size"]) {

			return {diagram_size: diagram_type["size"]["diagramSize"],
					dialog_size: diagram_type["size"]["dialogSize"],
					is_ajoo_editor: true,
				};
		}

		else {
			return {diagram_size: 10,
					dialog_size: 2,
					is_ajoo_editor: true
				};
		}
	},

	templates: function() {

		var templates = [];

		var get_templates = function(arr) {
			_.each(arr, function(item) {
				if (item.template) {
					templates.push({templateId: item.template});
				}
			});
		}

		var diagram_type = DiagramTypes.findOne();
		if (diagram_type) {

			get_templates(diagram_type.toolbar);
			get_templates(diagram_type.readModeToolbar);

			//contextMenu
			get_templates(diagram_type.noCollectionContextMenu);
			get_templates(diagram_type.collectionContextMenu);

			get_templates(diagram_type.readModeCollectionContextMenu);
			get_templates(diagram_type.readModeNoCollectionContextMenu);

			//keystrokes
			get_templates(diagram_type.noCollectionKeyStrokes);
			get_templates(diagram_type.collectionKeyStrokes);

			get_templates(diagram_type.readModeCollectionKeyStrokes);
			get_templates(diagram_type.readModeNoCollectionKeyStrokes);

			ElementTypes.find().forEach(function(elem_type) {

				//contextMenu
				get_templates(elem_type.contextMenu);
				get_templates(elem_type.readModeContextMenu);

				//keystrokes
				get_templates(elem_type.keyStrokes);
				get_templates(elem_type.readModeKeyStrokes);
			});
		}

		return templates;
	},

});


Template.publicDiagramTemplate.events({

	'click #settings': function(e, templ) {
		Dialog.destroyTooltip(e);
		$('#ontology-settings-form').modal("show");
	},

	'click #download-project': function(e) {
		Dialog.destroyTooltip(e);

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					diagramId: Session.get("activeDiagram"),
				};

		Utilities.callMeteorMethod("getProjectJson", list, function(resp) {

			if (resp.diagrams) {
			 //    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resp, 0, 4));
				// var link = $('<a href="data:' + data + '" download="data.json">download JSON</a>');
				// link.appendTo('#download-hack')
				// link[0].click();


				// let csvContent = "";
				// res.forEach(function(rowArray) {
				// 	let row = rowArray.join(",");
				// 	csvContent += row + "\r\n";
				// });

				var link = document.createElement("a");
				link.setAttribute("download", "data.json");
				link.href = URL.createObjectURL(new Blob([JSON.stringify(resp, 0, 4)], {type: "application/json;charset=utf-8;"}));
				document.body.appendChild(link);
				link.click();
			}

		});
	},
});


function set_locked_diagram() {

	Session.set("editMode", true);
	Session.set("edited", true);

	var list = {diagramId: Session.get("activeDiagram"),
				versionId: Session.get("versionId")};

	if (DiagramTypes.findOne({diagramId: Session.get("activeDiagram")})) {
		list["toolId"] = Session.get("toolId");
	}

	else {
		list["projectId"] = Session.get("activeProject");
	}

	Utilities.callMeteorMethod("lockingDiagram", list);

	var editor = Interpreter.editor;
	if (editor) {
		editor.isEditing = Session.get("userSystemId");
	}
}
