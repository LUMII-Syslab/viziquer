import { is_project_admin } from '/imports/libs/platform/user_rights'
import { ProjectsGroups, ProjectsUsers, Diagrams, Documents } from '/imports/db/platform/collections'

ProjectsGroups.after.remove(function (user_id, doc) {

	if (!doc)
		return;

	var group_id = doc["_id"];
	var proj_id = doc["projectId"];

	//removing the group from the allowed groups
	Diagrams.update({projectId: proj_id}, {$pull: {allowedGroups: group_id}});
	Documents.update({projectId: proj_id},{$pull: {allowedGroups: group_id}});
});
ProjectsGroups.hookOptions.after.remove = {fetchPrevious: false};

Meteor.methods({

	addGroup: function(list) {

		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {

			var date = new Date();
			var group_id = ProjectsGroups.insert({	name: list["name"],
									projectId: list["projectId"],
									createdBy: user_id,
									createdAt: date,
									modifiedAt: date,
								});
			
			if (group_id) {

				//diagrams
				if (list["allProjectDiagrams"]) {
					Diagrams.update({projectId: list["projectId"]},
									{$push: {allowedGroups: group_id}});
				}

				else if (list["currentProjectDiagrams"]) {
					Diagrams.update({projectId: list["projectId"], versionId: list["versionId"]},
									{$push: {allowedGroups: group_id}});
				}

				//documents
				if (list["allProjectDocuments"]) {
					Documents.update({projectId: list["projectId"]},
									{$push: {allowedGroups: group_id}});
				}

				else if (list["currentProjectDocuments"]) {
					Documents.update({projectId: list["projectId"], versionId: list["versionId"]},
									{$push: {allowedGroups: group_id}});
				}

			}
		}
	},

	editGroup: function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {
			ProjectsGroups.update({_id: list["id"], projectId: list["projectId"]},
									{$set: {name: list["name"]}});
		}
	},

	removeGroup: function(list) {

		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {

			//if there is atleast one project member with the specified group, then no remove
			var proj_users = ProjectsUsers.findOne({role: list["id"], projectId: list["projectId"]});
			if (proj_users)
				return;

            if (!list["id"])
                return;

			ProjectsGroups.remove({_id: list["id"], projectId: list["projectId"]});
		}
	},

});
