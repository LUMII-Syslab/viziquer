import { is_project_version_admin } from '../../../libs/platform/user_rights.js'
import { Projects } from '../../../db/platform/collections.js'
import { is_public_diagram } from '../../../platform/server/_helpers.js'

Meteor.methods({

	OWLGrEdupdateProjectOntology: async function(list) {
		var user_id = Meteor.userId();

		if (list["projectId"] && is_project_version_admin(user_id, list) || is_public_diagram(list["diagramId"])) {

			await Projects.updateAsync({_id: list.projectId}, {$set: {
															 OWLGrEdimportParameters: list.OWLGrEdimportParameters,
										 }});
		}
	},


});
