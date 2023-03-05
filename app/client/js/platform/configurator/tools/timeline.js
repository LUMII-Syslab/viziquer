import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Utilities } from '/client/js/platform/utilities/utils'
import { ToolVersions, UserTools } from '/libs/platform/collections'


Template.timeline.helpers({

	versions: function() {
		var active_version = Session.get("toolVersionId");

		//if active verion is not specified, then sets the last version as active
		// var user_tools = UserTools.findOne();
		// if (user_tools) {
		// 	active_version = user_tools["versionId"];
		// 	Session.set("toolVersionId", active_version);
		// }

		// //if no version is specified for the user, then selecs the last one
		// else {
		if (!active_version) {
			var version = ToolVersions.findOne({}, {sort: {createdAt: -1}})
			if (version) {
		 		active_version = version["_id"];
		 		Session.set("toolVersionId", active_version);
			}
		}

		return ToolVersions.find({}, {sort: {createdAt: -1}}).map(function(version) {
				
			//transforms the published date in different form
			var date = version["publishedAt"];
			if (date)
				version["date"] = joined_date(date);

			//sets active version
			if (version["_id"] == active_version)
				version["active"] = true;

			version["versionId"] = version["_id"];

			return version;
		});
	},

});

Template.timeline.events({

	'click .pull': function(e) {

		//selects version id
		var src = $(e.target);
		var timeline_panel = src.closest(".timeline-panel");
		var version_id = timeline_panel.attr("id");
		var tool_id = Session.get("toolId");

		Session.set("diagram", {toolId: tool_id, versionId: version_id});	

		var list = {toolId: tool_id, versionId: version_id};
		Meteor.call("upsertUserTool", list, function(err){
			if (err)
				console.log("Error in upsertTool callback", err);
		});

		//if user tools was inserted
		//if (version_id)
			FlowRouter.go("tool", {_id: tool_id, versionId: version_id});

	},
});

//Start of time line

Template.tool_version_buttons.helpers({
	buttons: function() {
		return {
			new_version_disabled: function () {
				var version = ToolVersions.findOne({status: "New"});
				if (version)
					return true;
				else
					return false;
			},

			remove_version_disabled: function() {
				var version_count = ToolVersions.find().count();
				if (version_count > 1)
					return is_publish_bottom_disabled();
				else
					return true		
			},

			publish_version_disabled: is_publish_bottom_disabled(),
		}
	},
});

Template.tool_version_buttons.events({

	'click #new-version': function(e) {

		var new_version = ToolVersions.findOne({status: "New"});
		if (!new_version) {
			var tool_id = Session.get("toolId");

			var list = {toolId: tool_id};
			Meteor.call("newToolVersion", list, function(err){
				if (err)
					console.log("Error in newToolVersion callback", err);

				else {
					if (version_id)
						Router.go("tool", {_id: tool_id, versionId: version_id});
				}
			});
		}
	},

	'click #remove-version-button': function(e) {
		var new_version = ToolVersions.findOne({status: "New"});
		if (new_version) {
			var version_id = new_version["_id"];
			remove_tool_version(version_id);

			var user_tools = UserTools.findOne({versionId: version_id});
			if (user_tools) { 

				if (user_tools["versionId"] === version_id) {

					var last_version = ToolVersions.findOne({}, {sort: {createdAt: -1}});
					if (last_version)
						FlowRouter.go("tool", {_id: Session.get("toolId"), versionId: last_version["_id"]});
					else
						FlowRouter.go("tool", {_id: Session.get("toolId")});
				}
			}
		}
	},

	'click #publish-version-button': function(e) {
		console.log("publish version button ")
		$("#publish-version").modal("show");
	},

});

Template.publishToolVersion.helpers({
	version_number: function() {
		return Session.get("toolVersionId");
	},
});

Template.publishToolVersion.events({

	'click #publish': function(e, templ) {

		$("#publish-version").modal("hide");
		var comment_field = $("#comment");
		var comment = comment_field.val();

		//reseting the field value
		comment_field.val("");

		var new_version = ToolVersions.findOne({status: "New"});
		if (new_version) {

			var list = {toolId: Session.get("toolId"),
						versionId: new_version["_id"],
						comment: comment,
					};
					
			Meteor.call("publishToolVersion", list, function(err){
				if (err)
					console.log("Error in publishToolVersion callback", err);
			});
		}
	},

});

//End of timeline

function is_publish_bottom_disabled() {
	var version = ToolVersions.findOne({toolId: Session.get("toolId"), status: "New"});
	if (version)
		return false;
	else
		return true;
}

function remove_tool_version(version_id) {

	ToolVersions.remove({_id: version_id});

}


