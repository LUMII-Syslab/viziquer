import { is_project_version_admin } from '/imports/libs/platform/user_rights'
import { Projects } from '/imports/db/platform/collections'
import { is_public_diagram } from '/imports/server/platform/_helpers'

Meteor.methods({

	updateProjectOntology: function(list) {
		var user_id = Meteor.userId();

		if (list["projectId"] && is_project_version_admin(user_id, list) || is_public_diagram(list["diagramId"])) {

			Projects.update({_id: list.projectId}, {$set: {uri: list.uri, endpoint: list.endpoint, schema: list.schema,
				                                             useStringLiteralConversion: list.useStringLiteralConversion,
	                                                     	 queryEngineType: list.queryEngineType,
															 useDefaultGroupingSeparator: list.useDefaultGroupingSeparator,
															 defaultGroupingSeparator: list.defaultGroupingSeparator,
															 directClassMembershipRole: list.directClassMembershipRole,
															 indirectClassMembershipRole: list.indirectClassMembershipRole,
															 showCardinalities: list.showCardinalities,
															 decorateInstancePositionVariable: list.decorateInstancePositionVariable,
															 decorateInstancePositionConstants: list.decorateInstancePositionConstants,
															 autoHideDefaultPropertyName: list.autoHideDefaultPropertyName,
															 showPrefixesForAllNames: list.showPrefixesForAllNames,
															 showPrefixesForAllNonLocalNames: list.showPrefixesForAllNonLocalNames,
															 completeRDFBoxesInDatetimeFunctions: list.completeRDFBoxesInDatetimeFunctions,
															 // graphsInstructions: list.graphsInstructions,
															 showGraphServiceCompartments: list.showGraphServiceCompartments,
															 enableWikibaseLabelServices: list.enableWikibaseLabelServices,
															 allowTopDownNamesInBINDs: list.allowTopDownNamesInBINDs,
															 keepVariableNames: list.keepVariableNames,
															 simpleConditionImplementation: list.simpleConditionImplementation,
															 endpointUsername: list.endpointUsername,
															 endpointPassword: list.endpointPassword,
										 }});
		}
	},


});
