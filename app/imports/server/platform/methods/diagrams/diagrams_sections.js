import { is_project_version_admin } from '/imports/libs/platform/user_rights'
import { DiagramFiles } from '/imports/db/platform/collections'

Meteor.methods({

	attachFileToElement: function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {
			list["createdAt"] = new Date();
			DiagramFiles.insert(list);
		}
	},

	detachFileFromElement: function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			DiagramFiles.remove({_id: list["diagramFileId"], projectId: list["projectId"],
										versionId: list["versionId"]});
		}
	},

});
