import { is_project_version_admin } from '/imports/libs/platform/user_rights'
import { ElementsSections } from '/imports/db/platform/collections'


Meteor.methods({

	addSectionToElement: function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {
			list["createdAt"] = new Date();
			ElementsSections.insert(list);
		}
	},

	removeSectionToElement: function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			if (!list["id"])
				return;

			ElementsSections.remove({_id: list["id"], projectId: list["projectId"],
										versionId: list["versionId"]});
		}
	},

	reoredrSectionToElement: function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			console.log("in reorder sectiont o elmeen ", list)

			var prev_index = list["prevIndex"];
			var current_index = list["currentIndex"];

			var elem_sec_id = list["elementSectionId"];

			var query = {projectId: list["projectId"],
						versionId: list["versionId"],
						diagramId: list["diagramId"]
					};

        	if (prev_index < current_index) {
	       		ElementsSections.update({$and: [{index: {$gt: prev_index}},
        										{_id: {$ne: elem_sec_id}}, query]},
        								{$inc: {index: current_index}}, {multi: true});
        	}
        	else {
        		ElementsSections.update({$and: [query,
        										{$or: [{index: {$gt: prev_index}},
        												{_id: elem_sec_id}]}
        										]},
        								{$inc: {index: prev_index}},
        								{multi: true});
        	}

		}
	},

});
