
Meteor.methods({

	updateProjectOntology: function(list) {

		var user_id = Meteor.userId();
		//console.log(list);
		if (list["projectId"] && is_project_version_admin(user_id, list)) {
			Projects.update({_id: list.projectId}, {$set: {uri: list.uri, endpoint: list.endpoint,
				                                             useStringLiteralConversion: list.useStringLiteralConversion,
                                                     queryEngineType: list.queryEngineType,
																										 useDefaultGroupingSeparator: list.useDefaultGroupingSeparator,
																										 defaultGroupingSeparator: list.defaultGroupingSeparator,
																										 directClassMembershipRole: list.directClassMembershipRole,
																										 indirectClassMembershipRole: list.indirectClassMembershipRole,
																										 showCardinalities: list.showCardinalities,
																										 autoHideDefaultPropertyName: list.autoHideDefaultPropertyName,
										 }});
		}
	},




});
