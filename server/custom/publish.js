
Meteor.publish("Ontology", function(list) {

	if (!list || list["noQuery"]) {
		return this.stop();
	}

	if (is_project_admin(this.userId, list)) {

		console.log("in publish Ontology");

		return [
				Associations.find({projectId: list.projectId, versionId: list.versionId}),
				Attributes.find({projectId: list.projectId, versionId: list.versionId}),
				Classes.find({projectId: list.projectId, versionId: list.versionId}),
			];
	}
	else {
		//error_msg();
		return this.stop();
	}
});