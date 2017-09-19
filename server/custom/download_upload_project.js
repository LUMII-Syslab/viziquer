

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
				console.error("No data ", data);
				return;
			}

			var project = Projects.findOne({_id: project_id,});
			if (!project) {
				console.error("No project ", project_id);
				return;
			}

			var tool_id = project.toolId;
			_.each(data.diagrams, function(diagram) {

				var elements = diagram.elements;
				delete diagram.elements;
				delete diagram._id;

				var diagram_type_id = diagram.diagramTypeId;

				var diagram_type = DiagramTypes.findOne({_id: diagram_type_id, toolId: tool_id,});
				if (!diagram_type) {

					diagram_type = DiagramTypes.findOne({_id: diagram_type_id,});
					if (!diagram_type) {
						console.error("No DiagramType", diagram_type_id);
						return;
					}

					var diagram_type_name = diagram_type.name;
					diagram_type = DiagramTypes.findOne({name: diagram_type_name, toolId: tool_id,});
				}

				_.extend(diagram, {projectId: project_id,
									versionId: version_id,
									diagramTypeId: diagram_type._id,
									toolId: tool_id,
								});

				var diagram_id = Diagrams.insert(diagram);

				_.each(elements, function(element) {

					var compartments = element.compartments;
					delete element.compartments;
					delete element._id;

					var elem_type_id = element.elementTypeId;


					var element_type = ElementTypes.findOne({_id: elem_type_id, toolId: tool_id,});
					if (!element_type) {

						element_type = ElementTypes.findOne({_id: elem_type_id,});
						if (!element_type) {
							console.error("No ElementType", elem_type_id);
							return;
						}

						var element_type_name = element_type.name;
						element_type = ElementTypes.findOne({name: element_type_name,
																toolId: tool_id,
																diagramTypeId: diagram_type._id,
															});
					}

					_.extend(element, {projectId: project_id,
										versionId: version_id,
										diagramId: diagram_id,
										elementTypeId: element_type._id,
										diagramTypeId: diagram_type._id,
										toolId: tool_id,
									});
					
					var element_id = Elements.insert(element);

					_.each(compartments, function(compartment) {
						delete compartment._id;

						var compart_type_id = compartment.compartmentTypeId;

						var compart_type = CompartmentTypes.findOne({_id: compart_type_id, toolId: tool_id,});
						if (!compart_type) {

							compart_type = CompartmentTypes.findOne({_id: compart_type_id,});
							if (!compart_type) {
								console.error("No CompartmentType", compart_type_id);
								return;
							}

							var compart_type_name = compart_type.name;
							compart_type = CompartmentTypes.findOne({name: compart_type_name,
																		toolId: tool_id,
																		diagramTypeId: diagram_type._id,
																		elementTypeId: element_type._id,
																	});
						}

						_.extend(compartment, {projectId: project_id,
												versionId: version_id,
												diagramId: diagram_id,
												elementId: element_id,
												compartmentTypeId: compart_type._id,

												elementTypeId: element_type._id,
												diagramTypeId: diagram_type._id,
												toolId: tool_id,
											});

						Compartments.insert(compartment);
					});
				
				});
			});
		}
	},

});


