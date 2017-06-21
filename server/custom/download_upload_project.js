

Meteor.methods({	

	getProjectJson: function(list) {

		var user_id = this.userId;
		if (is_project_member(user_id, list)) {

			var project_id = list.projectId;
			var version_id = list.versionId;

			var diagrams = Diagrams.find({projectId: project_id, versionId: version_id}).map(function(diagram) {

				diagram.elements = Elements.find({diagramId: diagram._id, projectId: project_id, versionId: version_id}).map(function(element) {

					element.compartments = Compartments.find({elementId: element._id,
																diagramId: element.diagramId,
																projectId: project_id,
																versionId: version_id}).fetch();

					return element;
				});

				return diagram;
			});

			return {"diagrams": diagrams};
		}
	},

	uploadProjectData: function(list) {

		var user_id = this.userId;
		if (is_project_member(user_id, list)) {

			var project_id = list.projectId;
			var version_id = list.versionId;

			var data = list.data;
			if (!data) {
				return;
			}

			_.each(data.diagrams, function(diagram) {

				var elements = diagram.elements;
				delete diagram.elements;
				delete diagram._id;
				_.extend(diagram, {projectId: project_id, versionId: version_id,});

				var diagram_id = Diagrams.insert(diagram);

				_.each(elements, function(element) {

					var compartments = element.compartments;
					delete element.compartments;
					delete element._id;
					_.extend(element, {projectId: project_id, versionId: version_id, diagramId: diagram_id});
					
					var element_id = Elements.insert(element);

					_.each(compartments, function(compartment) {
						delete compartment._id;
						_.extend(compartment, {projectId: project_id, versionId: version_id, diagramId: diagram_id, elementId: element_id,});

						Compartments.insert(compartment);
					});
				
				});
			});
		}
	},

});


