import { Services, Associations, Attributes, Classes, Schema, TriplesMaps } from '/libs/custom/collections'
import { is_project_member, is_system_admin } from '/libs/platform/user_rights'

Meteor.publish("Ontology", function(list) {
	if (!list || list["noQuery"]) {
		return this.stop();
	}

	if (is_project_member(this.userId, list)) {
		let result = [Associations.find({projectId: list.projectId, versionId: list.versionId}),
						Attributes.find({projectId: list.projectId, versionId: list.versionId}),
						Classes.find({projectId: list.projectId, versionId: list.versionId}),
						//Schema.find({projectId: list.projectId}), //Schema.find({projectId: list.projectId, versionId: list.versionId}),
						TriplesMaps.find({projectId: list.projectId, versionId: list.versionId}),
					];

		if (list.projectId) {
			result.push(Schema.find({projectId: list.projectId}));
		}

		return result;
	}
	else {
		//error_msg();
		return this.stop();
	}
});

Meteor.publish("Services", function(list) {
	if (!list || list["noQuery"]) {
		return this.stop();
	}

	//if (is_project_member(this.userId, list)) { //console.log(Services.find().count()); console.log(Services.findOne({toolId: list.toolId }));
		return [
				Services.find(),//Services.find({toolId: list.toolId }),
			];
	//}
	//else {
		//error_msg();
	//	return this.stop();
	//}
});