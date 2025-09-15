import { Meteor } from 'meteor/meteor'
import { Tools, ToolVersions, UserTools, Projects } from '../../../../db/platform/collections.js'
import { is_system_admin } from '../../../../libs/platform/user_rights.js'
import { generate_id } from '../../../../libs/platform/lib.js'


Tools.after.remove(async function(user_id, doc) {
	var tool_id = doc["_id"];

	await Projects.removeAsync({toolId: tool_id});

	await ToolVersions.removeAsync({toolId: tool_id});
	await UserTools.removeAsync({toolId: tool_id});

});

Meteor.methods({

	insertTool: async function(list) {
		var user_id = Meteor.userId();
		if (await is_system_admin(user_id) && list) {

			var time = new Date();
			list["createdAt"] = time;
			list["createdBy"] = user_id;

			list["documents"] = true;
			list["archive"] = true;
			list["analytics"] = true;
			list["users"] = true;
			// list["forum"] = true;

			list["tasks"] = false;
			list["training"] = false;

			list["toolbar"] = [
				{id: generate_id(), name: "Download .png", procedure: "DownloadPng", icon: "fa-download"},	
				// {id: generate_id(), name: "Toggle Dialog", procedure: "ToggleDialog", icon: "fa-plus"},
				// {id: generate_id(), name: "Toggle Footer", procedure: "ToggleFooter", icon: "fa-minus"},	

				{id: generate_id(), name: "Toggle Grid", procedure: "ToggleGrid", icon: "fa-th"},
			];

			var id = await Tools.insertAsync(list);

			await ToolVersions.insertAsync({
								createdAt: time,
								createdBy: user_id,
								status: "New",
								toolId: id,
							});

			return id;
		}
	},

	updateTool: async function(list) {
		var user_id = Meteor.userId();
		if (await is_system_admin(user_id) && list) {
			await Tools.updateAsync({_id: list["toolId"]}, {$set: list["set"]});
		}
	},

	removeTool: async function(list) {
		var user_id = Meteor.userId();
		if (await is_system_admin(user_id) && list) {

			// checking if atleast one project exitst, then no delete
			var project = await Projects.findOneAsync({toolId: list.toolId,});
			if (project) {
				return 0;
			}

			await Tools.removeAsync({_id: list["toolId"]});

			return 1;
		}
	},

	upsertUserTool: async function(list) {
		var user_id = Meteor.userId();
		if (await is_system_admin(user_id) && list) {
			await UserTools.updateAsync({toolId: list["toolId"], userSystemId: user_id},
							{$set: {versionId: list["versionId"]}}, {upsert: true});
		}
	},

	newToolVersion: async function(list) {
		var user_id = Meteor.userId();
		if (await is_system_admin(user_id) && list) {

			var version_id = await ToolVersions.insertAsync({toolId: list["toolId"],
													status: "New",
													createdAt: new Date(),
													createdBy: user_id,
												});

			return version_id;
		}
	},

	publishToolVersion: async function(list) {
		var user_id = Meteor.userId();
		if (await is_system_admin(user_id) && list) {

			await ToolVersions.updateAsync({_id: list["versionId"], status: "New", toolId: list["toolId"]},
								{$set: {status: "Published",
										comment: list["comment"],
										publishedAt: new Date(),
										publishedBy: user_id,}
								});

			await UserTools.updateAsync({userSystemId: user_id, toolId: list["toolId"]},
							{$set: {versionId: list["versionId"]}});
		}
	},

	removeToolVersion: async function(list) {
		var user_id = Meteor.userId();
		if (await is_system_admin(user_id) && list) {
			await ToolVersions.removeAsync({toolId: list["toolId"],
								versionId: list["versionId"],
								status: "New"});

			return version_id;
		}
	},
});
