import { is_project_version_admin } from '/imports/libs/platform/user_rights'
import { Projects } from '/imports/db/platform/collections'
import { is_public_diagram } from '/imports/platform/server/_helpers'

Meteor.methods({

	updateProjectOntology: function(list) {
		var user_id = Meteor.userId();

		if (list["projectId"] && is_project_version_admin(user_id, list) || is_public_diagram(list["diagramId"])) {

			Projects.update({_id: list.projectId}, {$set: {
															 endpointUsername: list.endpointUsername,
															 endpointPassword: list.endpointPassword,
										 }});
		}
	},


});
