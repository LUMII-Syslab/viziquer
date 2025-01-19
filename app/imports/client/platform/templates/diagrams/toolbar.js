import { Utilities } from '/imports/client/platform/js/utilities/utils'
import { Tools, Projects, DiagramTypes, Diagrams, Elements } from '/imports/db/platform/collections'

import './toolbar.html'

Template.diagram_settings.helpers({

	project_name: function() {
		var project = Projects.findOne({_id: Session.get("activeProject")});
		if (project) {
			return project["name"];
		}
	},

	tool_name: function() {
		var project = Projects.findOne({_id: Session.get("activeProject")});
		if (project) {
			var tool = Tools.findOne({_id: project["toolId"]});
			if (tool) {
				return tool["name"];
			}
		}
	},
});

Template.diagram_settings.helpers({

	diagram_type: function() {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
		if (diagram_type) {
			return diagram_type["name"];
		}
	},

	version: function() {
		return Session.get("versionId");
	},

	boxes: function() {
		return Elements.find({type: "Box"}).count();
	},

	lines: function() {
		return Elements.find({type: "Line"}).count();
	},

	total: function() {
		return Elements.find().count();
	},

});

Template.diagramPermissions.helpers({

	groups: function() {
		
		var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
		var allowed_groups = {};
		if (diagram && diagram["allowedGroups"]) {
			_.each(diagram["allowedGroups"], function(group_id) {
				allowed_groups[group_id] = true;
			});
		}

		var groups = Utilities.getProjectGroups();
		return _.map(groups, function(group) {

			if (allowed_groups[group["_id"]]) {
				group["checked"] = "checked";
			}

			if (group["_id"] == "Admin" || group["_id"] == "Reader") {
				group["checked"] = "checked";
				group["disabled"] = "disabled";
				group["isDefault"] = true;
			}

			return group;
		});

	},

});

Template.diagramPermissions.events({

	"click .permission-checkbox": function(e) {
		e.preventDefault();

		var check_box = $(e.target);
		var checked = check_box.prop('checked');
		var group_id = check_box.closest(".group-container").attr("id");

		var list = {projectId: Session.get("activeProject"),
					diagramId: Session.get("activeDiagram"),
					groupId: group_id};

		//if checked, adding to the allowedGroups list
		if (checked) {
			Meteor.call("addDiagramPermission", list, function(err) {
				if (err) {
					console.log("Error in addDiagramPermission callback", err);
				}
			});
		}

		//if not checked, removing from the allowedGroups list
		else {
			Meteor.call("removeDiagramPermission", list, function(err) {
				if (err) {
					console.log("Error in removeDiagramPermission callback", err);
				}
			});
		}

		return;
	},

});


