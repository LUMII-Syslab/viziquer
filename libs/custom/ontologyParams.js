
Meteor.methods({

	updateProjectOntology: function(list) {

		var user_id = Meteor.userId();
		if (list["projectId"] && is_project_version_admin(user_id, list)) {
			Projects.update({_id: list.projectId}, {$set: {uri: list.uri, endpoint: list.endpoint,}});
		}
	},

});