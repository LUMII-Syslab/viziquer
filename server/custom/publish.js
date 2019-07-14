
Meteor.publish("Ontology", function(list) {
	if (!list || list["noQuery"]) {
		return this.stop();
	}

	if (is_project_member(this.userId, list)) {
		return [
				Associations.find({projectId: list.projectId, versionId: list.versionId}),
				Attributes.find({projectId: list.projectId, versionId: list.versionId}),
				Classes.find({projectId: list.projectId, versionId: list.versionId}),
				Schema.find({projectId: list.projectId, versionId: list.versionId}),
				TriplesMaps.find({projectId: list.projectId, versionId: list.versionId}),
			];
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
console.log("Publicējam");
console.log(list);
	if (is_project_member(this.userId, list)) { console.log(Services.find().count()); console.log(Services.findOne({toolId: list.toolId }));
		return [
				Services.find(),//Services.find({toolId: list.toolId }),
			];
	}
	else {
		//error_msg();
		return this.stop();
	}
});