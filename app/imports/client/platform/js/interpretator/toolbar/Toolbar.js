import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '/imports/client/lib/interpreter'
import { Dialog } from '/imports/client/platform/js/interpretator/Dialog'
import { Utilities } from '/imports/client/platform/js/utilities/utils.js'

import { Diagrams, Elements, Compartments, DiagramTypes, ElementTypes, DiagramLogs, ImportedTranslets, Users } from '/imports/db/platform/collections'
import { generate_id } from '/imports/libs/platform/lib'
import { reset_variable } from '/imports/client/platform/js/utilities/utils'
import { joined_date } from '../../utilities/time_utilities'

//Start of diagram ribbon
Interpreter.methods({

	ShowDiagramLog: function() {

		Session.set("logs", {diagramId: Session.get("activeDiagram"), versionId: Session.get("versionId"),
		                		projectId: Session.get("activeProject"), logsCount: 5});

		$("#diagram-log-form").modal("show");
	},

	ToggleGrid: function() {

		var editor = Interpreter.editor;

		if (editor.grid.isGridEnabled) {
			editor.removeGrid();
		}
		else {
			editor.showGrid();
		}
	},

	ShowDiagramSettings: function() {
		$("#diagram-settings-form").modal("show");
	},

	Permissions: function() {
		$("#permissions-form").modal("show");
	},

	SwitchToReadMode: function() {

		var path = {projectId: Session.get("activeProject"),
					_id: Session.get("activeDiagram"),
					diagramTypeId: Session.get("diagramType"),
					versionId: Session.get("versionId"),
				};

		FlowRouter.go("diagram", path);
	},

	SwitchToEditMode: function() {

		var path = {projectId: Session.get("activeProject"),
					_id: Session.get("activeDiagram"),
					diagramTypeId: Session.get("diagramType"),
					versionId: Session.get("versionId"),
					editMode: "edit",
				};

		FlowRouter.go("diagram", path);
	},

	ShowFileDownloadForm: function() {
		$("#download-file-form").modal("show");
	},

	ShowImportedTranslets: function() {
		$("#imported-translets-form").modal("show");
	},

	DeleteDiagram: function() {
		Session.set("confirmationText", "ConfirmDeleteDiagram");
		Session.set("confirmationProcedure", "delete_diagram");
		$("#delete-confirm-form").modal("show");
	},

	ZoomingIn: function() {
		var editor = Interpreter.editor;
		editor.zoomIn();
	},

	ZoomingOut: function() {
		var editor = Interpreter.editor;
		editor.zoomOut();
	},

	TestDynamicContextMenu: function() {

		console.log("test dynamic context menu")

		return [{item: "AAA", procedure: "aaa"},
				{item: "BBB", procedure: "bbb"},
				{item: "CCC", procedure: "ccc", subMenu: [{item: "DELETE", procedure: "Delete"},
															{item: "submenu2", procedure: "submenu2"},
															{item: "submenu3", procedure: "submenu3"},
														]},

				{item: "DDD", subMenu: [{item: "submenu11", procedure: "submenu11"},
										{item: "submenu21", procedure: "submenu21"},
										{item: "submenu31", procedure: "submenu31"},
									]},
			];
	},

	ExportDiagramConfiguration: function() {

		var config_export = new ExportDiagramConfig();
		var list = {config: config_export.export(),
					toolId: Session.get("toolId"),
					versionId: Session.get("toolVersionId"),
				};

		console.log("list ", list)

		// Utilities.callMeteorMethod("importAjooConfiguration", list);

	},

});


//returns acive diagram name
Template.diagramRibbon.helpers({

	is_toolbar_buttons: function() {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
		if (diagram_type) {
			return true;
		}
	},

	diagramName: function() {
		var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
		if (diagram) {
			return diagram["name"];
		}
	},

});


Template.diagramRibbon.events({

	'click .toolbar-button' : function(e) {
		Dialog.destroyTooltip(e);
		var src = $(e.target).closest(".toolbar-button");
		var proc = src.attr("procedure");

		Interpreter.execute(proc);
	},

});

/* End of diagram ribbon */


Template.diagram_toolbar.onRendered(function(argument) {
	Dialog.initTooltip();
})


Template.diagram_toolbar.helpers({

	toolbar_buttons: function() {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
		if (!diagram_type) {
			return;
		}

		if (!Session.get("editMode")) {
			var editable = Utilities.isEditable();

			var is_admin = Utilities.isAdmin();
			var res = [];

			_.each(diagram_type["readModeToolbar"], function(toolbar_item) {

				if (toolbar_item["isForAdminOnly"]) {
					if (is_admin) {
						add_toolbar_button(res, toolbar_item, editable);
					}
				}
				else {
					add_toolbar_button(res, toolbar_item, editable);
				}
			});

			return res;
		}
		else {

			//this is a hack to show the imported translet button in the toolbar
			var imported_translets = ImportedTranslets.findOne();
			if (imported_translets) {
				var res = [];
				var item = {icon: "fa-tasks",
							id: generate_id(),
							name: "Imported Translets",
							procedure: "ShowImportedTranslets",
						};

				res.push(item);

				_.each(diagram_type["toolbar"], function(item) {
					res.push(item);
				});

				return res;
			}

			//if on imported translets, then showing the toolbar as-is
			else {
				return diagram_type["toolbar"];
			}

		}
	},

});



Template.diagram_log.helpers({

	logs: function() {

		var build_element_names = function(elementIds, delimiter) {

			var names = build_element_names_array(elementIds);
			delimiter = delimiter || "";

			return names.join(delimiter);
		}

		return DiagramLogs.find({diagramId: Session.get("activeDiagram")}, {$sort: {createdAt: -1}}).map(function(diagram_log) {

			var user = Users.findOne({systemId: diagram_log["authorId"]});
			if (user) {
				diagram_log["fullName"] = user["name"] + " " + user["surname"];	
				diagram_log["image"] = user["profileImage"];
			}

			diagram_log["time"] = joined_date(diagram_log["createdAt"]);

			var action_data = diagram_log["actionData"];

			var text = "";
			if (diagram_log["action"] == "added") {

				var name = ""
				var elem_type = ElementTypes.findOne({_id: action_data["elementTypeId"]});
				if (elem_type)
					name = elem_type["name"];

				text = "Added element " + name;
			}

			else if (diagram_log["action"] == "resized") {

				var elem_id = action_data["elementId"];
				var name = build_element_names([elem_id]);

				text = "Resized element " + name;
			}

			else if (diagram_log["action"] == "moved") {

				var boxes = build_element_names(action_data["boxes"], "<br>- ");
				var lines = build_element_names(action_data["lines"], "<br>- ");

				text = "Moved elements: <br>- " + boxes + lines;
			}

			else if (diagram_log["action"] == "deleted") {
				var elements = action_data["elementNames"].join("<br>- ");

				text = "Deleted elements: <br>- " + elements;
			}

			else if (diagram_log["action"] == "style") {

				var elem_id = action_data["elementId"];
				var name = build_element_names([elem_id]);

				text = "Updated style " + name;
			}

			else if (diagram_log["action"] == "updated") {

				text = "Updated attribute:<br>" + 
						"old value: " + action_data["oldValue"] + "<br>" +
						"new value: " + action_data["newValue"];
			}

			diagram_log["text"] = text;

			return diagram_log;
		});
	},

});

Template.diagram_log.events({

	"click #load-more-logs": function() {

		var logs = Session.get("logs");
		var logs_count = logs["logsCount"];
		logs["logsCount"] = logs_count + 5;

		Session.set("logs", logs);
	},

	"click #diagram-log-modalCloseButton": function() {
		Session.set("logs", reset_variable());
	},

});


function add_toolbar_button(res, toolbar_item, editable) {

	if (editable) {
		res.push(toolbar_item);
	}
	else {
		if (!toolbar_item["isInEditableVersion"]) {
			res.push(toolbar_item);
		}
	}
}


function build_element_names_array(elementIds) {

	return _.map(elementIds, function(elem_id) {

		var name = elem_id;

		var compart = Compartments.findOne({isObjectRepresentation: true, elementId: elem_id});
		if (compart) {
			name = compart["value"];
		}

		else {
			var elem = Elements.findOne({_id: elem_id});

			//if there is no element object, then element is deleted
			if (!elem) {
				name = elem_id + "(deleted)";
			}

			//if there is an element, then adding its type
			else {

				var elem_type = ElementTypes.findOne({_id: elem["elementTypeId"]});
				if (elem_type) {
					name = elem_id + "(" + elem_type["name"] + ")";
				}
			}
		}

		return name
	});

}

export {
  build_element_names_array,
}
