
Meteor.methods({

	migrate: function(list) {

		console.log("migrate ", list);

		var target_tool = Tools.findOne({name: list.toolName});
		if (!target_tool) {
			console.error("No target tool", list.toolName);
			return;
		}

		Diagrams.find({projectId: list.projectId}).forEach(function(diagram) {

			var current_diagram_type = DiagramTypes.findOne({_id: diagram.diagramTypeId,});
			if (!current_diagram_type) {
				console.error("No current digram types ", current_diagram_type);
				return;
			}

			var target_diagram_type = DiagramTypes.findOne({name: current_diagram_type.name, toolId: target_tool._id,});
			if (!target_diagram_type) {
				console.error("No taget diagram types ", current_diagram_type.name);
				return;
			}

			Elements.find({diagramId: diagram._id, diagramTypeId: current_diagram_type._id}).forEach(function(elem) {

				var current_elem_type = ElementTypes.findOne({_id: elem.elementTypeId,});
				if (!current_elem_type) {
					console.error("No current element type ", current_element_type);
					return;
				}

				var target_elem_type = ElementTypes.findOne({name: current_elem_type.name, diagramTypeId: target_diagram_type._id,});
				if (!target_elem_type) {
					console.error("No target element type ", current_elem_type.name);
					return;
				}

				Compartments.find({elementId: elem._id, diagramId: diagram._id, projectId: list.projectId}).forEach(function(compart) {

					var current_compart_type = CompartmentTypes.findOne({_id: compart.compartmentTypeId,});
					if (!current_compart_type) {
						console.error("No current compartment type ", current_compart_type);
						return;
					}

					var target_compart_type = CompartmentTypes.findOne({name: current_compart_type.name, elementTypeId: target_elem_type._id});
					if (!target_compart_type) {
						console.error("No target compartment type ", current_compart_type.name);
						return;
					}

					Compartments.update({_id: compart._id, projectId: list.projectId,},
										{$set: {
											compartmentTypeId: target_compart_type._id,
											elementTypeId: target_elem_type._id,
											diagramTypeId: target_diagram_type._id,
											toolId: target_tool._id,
										}});
				});

				Elements.update({_id: elem._id, diagramId: diagram._id, projectId: list.projectId,},
								{$set: {
									elementTypeId: target_elem_type._id,
									diagramTypeId: target_diagram_type._id,
									toolId: target_tool._id,
								}});
			});

			Diagrams.update({_id: diagram._id, projectId: list.projectId,},
							{$set: {
								diagramTypeId: target_diagram_type._id,
								toolId: target_tool._id,
							}});
		});

		Projects.update({_id: list.projectId},
						{$set: {
							toolId: target_tool._id,
						}});

		var tool_version = ToolVersions.findOne({toolId: target_tool._id});
		if (!tool_version) {
			console.error("No tool version", tool_version);
			return;
		}

		Versions.update({projectId: list.projectId},
						{$set: {
							toolId: target_tool._id,
							toolVersionId: tool_version._id,
						}},
						{multi: true}
					);

		console.log("Done");
	},

});
