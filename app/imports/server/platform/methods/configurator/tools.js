import { Meteor } from 'meteor/meteor'
import { Tools, ToolVersions, UserTools, Projects } from '/imports/db/platform/collections'
import { is_system_admin } from '/imports/libs/platform/user_rights'


Tools.after.remove(function (user_id, doc) {
	var tool_id = doc["_id"];

	Projects.remove({toolId: tool_id});

	ToolVersions.remove({toolId: tool_id});
	UserTools.remove({toolId: tool_id});

});

Meteor.methods({

	insertTool: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {

			var time = new Date();
			list["createdAt"] = time;
			list["createdBy"] = user_id;

			list["documents"] = true;
			list["archive"] = true;
			list["analytics"] = true;
			list["users"] = true;
			list["forum"] = true;	

			list["tasks"] = false;
			list["training"] = false;

			var id = Tools.insert(list);

			ToolVersions.insert({
								createdAt: time,
								createdBy: user_id,
								status: "New",
								toolId: id,
							});

			return id;
		}
	},

	updateTool: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {
			Tools.update({_id: list["toolId"]}, {$set: list["set"]});
		}
	},

	removeTool: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {

			// checking if atleast one project exitst, then no delete
			var project = Projects.findOne({toolId: list.toolId,});
			if (project) {
				return 0;
			}

			Tools.remove({_id: list["toolId"]});

			return 1;
		}
	},

	upsertUserTool: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {
			UserTools.update({toolId: list["toolId"], userSystemId: user_id},
							{$set: {versionId: list["versionId"]}}, {upsert: true});
		}
	},

	newToolVersion: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {

			var version_id = ToolVersions.insert({toolId: list["toolId"],
													status: "New",
													createdAt: new Date(),
													createdBy: user_id,
												});

			return version_id;
		}
	},

	publishToolVersion: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {

			ToolVersions.update({_id: list["versionId"], status: "New", toolId: list["toolId"]},
								{$set: {status: "Published",
										comment: list["comment"],
										publishedAt: new Date(),
										publishedBy: user_id,}
								});

			UserTools.update({userSystemId: user_id, toolId: list["toolId"]},
							{$set: {versionId: list["versionId"]}});			
		}
	},

	removeToolVersion: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {
			ToolVersions.remove({toolId: list["toolId"],
								versionId: list["versionId"],
								status: "New"});

			return version_id;
		}
	},
});
