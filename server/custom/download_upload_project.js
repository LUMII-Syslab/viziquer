

Meteor.methods({	

	getProjectJson: function(list) {

		var user_id = this.userId;
		if (is_project_member(user_id, list)) {

			var project_id = list.projectId;
			var version_id = list.versionId;

			var project = Projects.findOne({_id: project_id,});
			if (!project) {
				console.error("No project ", project_id);
				return;
			}

			var tool = Tools.findOne({_id: project.toolId,});
			if (!tool) {
				console.error("No tool", project.toolId);
				return;
			}

			var tool_name = tool.name;

			var diagrams = Diagrams.find({projectId: project_id, versionId: version_id}).map(function(diagram) {  

				var diagram_type = DiagramTypes.findOne({_id: diagram.diagramTypeId,});
				if (!diagram_type) {
					console.error("No DiagramType ", diagram.diagramTypeId);
					return;
				}

				_.extend(diagram, {diagramTypeName: diagram_type.name, toolName: tool_name,});

				var elems_map = {};

				diagram.elements = Elements.find({diagramId: diagram._id, projectId: project_id, versionId: version_id}).map(function(element) {

					var element_type = ElementTypes.findOne({_id: element.elementTypeId,});
					if (!element_type) {
						console.error("No ElementType ", element.elementTypeId);
						return;
					}

					_.extend(element, {elementTypeName: element_type.name, toolName: tool_name,});

					element.compartments = Compartments.find({elementId: element._id, diagramId: element.diagramId,
															projectId: project_id, versionId: version_id})
														.map(function(compartment) {

															var compartment_type = CompartmentTypes.findOne({_id: compartment.compartmentTypeId,});
															if (!compartment_type) {
																console.error("No CompartmentType ", compartment.compartmentTypeId);
																return;
															}

															_.extend(compartment, {compartmentTypeName: compartment_type.name, toolName: tool_name,});

															return compartment;
														});
					return element;
				});

				return diagram;
			});
			var schema = Schema.findOne({projectId: project_id});
			if (!schema) { schema = {}; }

			return {diagrams: diagrams, project: project, schema:schema };
		}
	},

    uploadProjectDataByUrl: function(list) {

		console.log("in uploadProjectDataByUrl", list)
        var result = HTTP.call('GET', list.url);
		//console.log("result", result.data)
		list.data = result.data;
		
		uploadProject(list);
    },
	
	uploadProjectData: function(list) {

		uploadProject(list)
	},

});

function uploadProject(list) {
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

			var project_data = {endpoint: "",
								uri: "",
								useDefaultGroupingSeparator: "",
								useStringLiteralConversion: "",
								queryEngineType: "",
							};

			_.extend(project_data, data.project);

			Projects.update({_id: project_id,}, {$set: {endpoint: project_data.endpoint,
														uri: project_data.uri,
														useDefaultGroupingSeparator: project_data.useDefaultGroupingSeparator,
														useStringLiteralConversion: project_data.useStringLiteralConversion,
														queryEngineType: project_data.queryEngineType,
													}});


			_.each(data.diagrams, function(diagram) {

				var tool = Tools.findOne({_id: project.toolId,});
				if (!tool) {

					tool = Tools.findOne({name: project.toolName,})
					if (!tool) {
						console.error("No Tool", project.toolId);
						return;
					}
				}

				var tool_id = tool._id;

				var elements = diagram.elements;
				delete diagram.elements;
				delete diagram._id;

				var diagram_type_id = diagram.diagramTypeId;

				var diagram_type = DiagramTypes.findOne({_id: diagram_type_id, toolId: tool_id,});
				if (!diagram_type) {

					diagram_type = DiagramTypes.findOne({_id: diagram_type_id,});
					if (!diagram_type) {

						var diagram_type_name = diagram.diagramTypeName;
						diagram_type = DiagramTypes.findOne({name: diagram_type_name, toolId: tool_id,});
						if (!diagram_type) {
							console.error("No DiagramType", diagram_type_id);
							return;							
						}
					}
				}

				_.extend(diagram, {projectId: project_id,
									versionId: version_id,
									diagramTypeId: diagram_type._id,
									toolId: tool_id,
								});

				var diagram_id = Diagrams.insert(diagram);

				var elem_map = {};

				_.each(elements, function(element) {

					var old_elem_id = element._id;

					var compartments = element.compartments;
					delete element.compartments;
					delete element._id;

					var elem_type_id = element.elementTypeId;

					var element_type = ElementTypes.findOne({_id: elem_type_id, toolId: tool_id,});
					if (!element_type) {

						element_type = ElementTypes.findOne({_id: elem_type_id,});
						if (!element_type) {

							var element_type_name = element.elementTypeName;
							element_type = ElementTypes.findOne({name: element_type_name,
																	toolId: tool_id,
																	diagramTypeId: diagram_type._id,
																});

							if (!element_type) {
								console.error("No ElementType", elem_type_id);
								return;
							}
						}
					}

					_.extend(element, {projectId: project_id,
										versionId: version_id,
										diagramId: diagram_id,
										elementTypeId: element_type._id,
										diagramTypeId: diagram_type._id,
										toolId: tool_id,
									});
					
					if (element.type == "Line") {
						_.extend(element, {startElement: elem_map[element.startElement],
											endElement: elem_map[element.endElement],
										});
					}

					var element_id = Elements.insert(element);
					
					elem_map[old_elem_id] = element_id;

					_.each(compartments, function(compartment) {
						delete compartment._id;

						var compart_type_id = compartment.compartmentTypeId;

						var compart_type = CompartmentTypes.findOne({_id: compart_type_id, toolId: tool_id,});
						if (!compart_type) {

							compart_type = CompartmentTypes.findOne({_id: compart_type_id,});
							if (!compart_type) {

								var compart_type_name = compartment.compartmentTypeName;
								compart_type = CompartmentTypes.findOne({name: compart_type_name,
																			toolId: tool_id,
																			diagramTypeId: diagram_type._id,
																			elementTypeId: element_type._id,
																		});

								if (!compart_type) {
									console.error("No CompartmentType", compart_type_id);
									return;
								}
							}
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
			
			var schema = data.schema;
			if (_.size(schema) > 0 )
			{
				delete schema._id;
				_.extend(schema, {projectId: project_id, versionId: version_id	});
				Schema.insert(schema);

			}

		}
}


