import { is_project_version_admin } from '../../../../libs/platform/user_rights.js'
import { ElementsSections } from '../../../../db/platform/collections.js'


Meteor.methods({

	addSectionToElement: async function(list) {

		var user_id = Meteor.userId();
		if (await is_project_version_admin(user_id, list)) {
			list["createdAt"] = new Date();
			await ElementsSections.insertAsync(list);
		}
	},

	removeSectionToElement: async function(list) {

		var user_id = Meteor.userId();
		if (await is_project_version_admin(user_id, list)) {

			if (!list["id"])
				return;

			await ElementsSections.removeAsync({_id: list["id"], projectId: list["projectId"],
										versionId: list["versionId"]});
		}
	},

	reoredrSectionToElement: async function(list) {
		var user_id = Meteor.userId();
		if (await is_project_version_admin(user_id, list)) {

			console.log("in reorder sectiont o elmeen ", list)

			var prev_index = list["prevIndex"];
			var current_index = list["currentIndex"];

			var elem_sec_id = list["elementSectionId"];

			var query = {projectId: list["projectId"],
						versionId: list["versionId"],
						diagramId: list["diagramId"]
					};

        	if (prev_index < current_index) {
	       		await ElementsSections.updateAsync({$and: [{index: {$gt: prev_index}},
        										{_id: {$ne: elem_sec_id}}, query]},
        								{$inc: {index: current_index}}, {multi: true});
        	}
        	else {
        		await ElementsSections.updateAsync({$and: [query,
        										{$or: [{index: {$gt: prev_index}},
        												{_id: elem_sec_id}]}
        										]},
        								{$inc: {index: prev_index}},
        								{multi: true});
        	}

		}
	},

});
