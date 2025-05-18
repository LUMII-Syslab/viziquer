import { Tools, DiagramTypes, ElementTypes, CompartmentTypes, Projects, Diagrams, Elements, Compartments } from '../../../db/platform/collections.js'
import { is_project_member } from '../../../libs/platform/user_rights.js'
import { is_public_diagram } from '../../platform/_helpers.js'

Meteor.methods({	

	getProjectJson: async function(list) {

		console.log("zzz")
		console.log("getProjectJson", list)
		console.log("")

		console.log("adsfaf ", is_public_diagram(list["diagramId"]))
		console.log("")


		var user_id = this.userId;
		if (is_project_member(user_id, list) || is_public_diagram(list["diagramId"])) {

			console.log("adsfasf1")


			var project_id = list.projectId;
			var version_id = list.versionId;

			var project = await Projects.findOneAsync({_id: project_id,});
			if (!project) {
				console.error("No project ", project_id);
				return;
			}

			var tool = await Tools.findOneAsync({_id: project.toolId,});
			if (!tool) {
				console.error("No tool", project.toolId);
				return;
			}

			var tool_name = tool.name;

			var diagrams = await Diagrams.find({projectId: project_id, versionId: version_id}).mapAsync(async function(diagram) {  

				var diagram_type = await DiagramTypes.findOneAsync({_id: diagram.diagramTypeId,});
				if (!diagram_type) {
					console.error("No DiagramType ", diagram.diagramTypeId);
					return;
				}

				_.extend(diagram, {diagramTypeName: diagram_type.name, toolName: tool_name,});

				var elems_map = {};

				diagram.elements = await Elements.find({diagramId: diagram._id, projectId: project_id, versionId: version_id}).mapAsync(async function(element) {

					var element_type = await ElementTypes.findOneAsync({_id: element.elementTypeId,});
					if (!element_type) {
						console.error("No ElementType ", element.elementTypeId);
						return;
					}

					_.extend(element, {elementTypeName: element_type.name, toolName: tool_name,});

					element.compartments = await Compartments.find({elementId: element._id, diagramId: element.diagramId,
															projectId: project_id, versionId: version_id})
														.mapAsync(async function(compartment) {

															var compartment_type = await CompartmentTypes.findOneAsync({_id: compartment.compartmentTypeId,});
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

			return {diagrams: diagrams, project: project};
		}
	},

    uploadProjectDataByUrl: async function(list) {

		//console.log("in uploadProjectDataByUrl", list)
        var result = HTTP.call('GET', list.url);
		//console.log("result", result.data)
		list.data = result.data;
		
		await uploadProject(list);
    },
	
	uploadProjectData: async function(list) {

		await uploadProject(list)
	},

});

async function uploadProject(list) {
		var user_id = this.userId;
		if (is_project_member(user_id, list)) {

			var project_id = list.projectId;
			var version_id = list.versionId;

			var data = list.data;
			if (!data) {
				console.error("No data ", data);
				return;
			}

			var project = await Projects.findOneAsync({_id: project_id,});
			if (!project) {
				console.error("No project ", project_id);
				return;
			}

			var project_data = {endpoint: "",
								uri: "",
								useDefaultGroupingSeparator: "",
								useStringLiteralConversion: "",
								queryEngineType: "",
								defaultGroupingSeparator: "",
								directClassMembershipRole: "",
								indirectClassMembershipRole: "",
								showCardinalities: "",
								decorateInstancePositionVariable: "",
								decorateInstancePositionConstants: "",
								// autoHideDefaultPropertyName: "",
								showPrefixesForAllNames: "",
								showPrefixesForAllNonLocalNames: "",
								// graphsInstructions: "",
								completeRDFBoxesInDatetimeFunctions: "",
								enableWikibaseLabelServices: "",
								allowTopDownNamesInBINDs: "",
								keepVariableNames: "",
								showGraphServiceCompartments: "",
								simpleConditionImplementation: "",
								endpointUsername: "",
								endpointPassword: "",
								schema: "",
							};

			_.extend(project_data, data.project);

			await Projects.updateAsync({_id: project_id,}, {$set: {endpoint: project_data.endpoint,
														uri: project_data.uri,
														useDefaultGroupingSeparator: project_data.useDefaultGroupingSeparator,
														useStringLiteralConversion: project_data.useStringLiteralConversion,
														queryEngineType: project_data.queryEngineType,
														defaultGroupingSeparator: project_data.defaultGroupingSeparator,
														directClassMembershipRole: project_data.directClassMembershipRole,
														indirectClassMembershipRole: project_data.indirectClassMembershipRole,
														showCardinalities: project_data.showCardinalities,
														decorateInstancePositionConstants: project_data.decorateInstancePositionConstants,
														decorateInstancePositionVariable: project_data.decorateInstancePositionVariable,
														simpleConditionImplementation: project_data.simpleConditionImplementation,
														// autoHideDefaultPropertyName: project_data.autoHideDefaultPropertyName,
														showPrefixesForAllNames: project_data.showPrefixesForAllNames,
														showPrefixesForAllNonLocalNames: project_data.showPrefixesForAllNonLocalNames,
														completeRDFBoxesInDatetimeFunctions: project_data.completeRDFBoxesInDatetimeFunctions,
														// graphsInstructions: project_data.graphsInstructions,
														enableWikibaseLabelServices: project_data.enableWikibaseLabelServices,
														allowTopDownNamesInBINDs: project_data.allowTopDownNamesInBINDs,
														keepVariableNames: project_data.keepVariableNames,
														showGraphServiceCompartments: project_data.showGraphServiceCompartments,
														endpointUsername: project_data.endpointUsername,
														endpointPassword: project_data.endpointPassword,
														schema: project_data.schema,
													}});

			_.each(data.diagrams, async function(diagram) {

				var tool = await Tools.findOneAsync({_id: project.toolId,});
				if (!tool) {

					tool = await Tools.findOneAsync({name: project.toolName,})
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

				var diagram_type = await DiagramTypes.findOneAsync({_id: diagram_type_id, toolId: tool_id,});
				if (!diagram_type) {
					//diagram_type = DiagramTypes.findOne({_id: diagram_type_id,});
					if (!diagram_type) {
						var diagram_type_name = diagram.diagramTypeName;
						diagram_type = await DiagramTypes.findOneAsync({name: diagram_type_name, toolId: tool_id,});
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

				var diagram_id = await Diagrams.insertAsync(diagram);

				var elem_map = {};

				_.each(elements, async function(element) {

					var old_elem_id = element._id;

					var compartments = element.compartments;
					delete element.compartments;
					delete element._id;

					var elem_type_id = element.elementTypeId;

					var element_type = await ElementTypes.findOneAsync({_id: elem_type_id, toolId: tool_id,});
					if (!element_type) {

						//element_type = ElementTypes.findOne({_id: elem_type_id,});
						if (!element_type) {

							var element_type_name = element.elementTypeName;
							element_type = await ElementTypes.findOneAsync({name: element_type_name,
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

					var element_id = await Elements.insertAsync(element);
					
					elem_map[old_elem_id] = element_id;

					_.each(compartments, async function(compartment) {
						delete compartment._id;

						var compart_type_id = compartment.compartmentTypeId;

						var compart_type = await CompartmentTypes.findOneAsync({_id: compart_type_id, toolId: tool_id,});
						if (!compart_type) {

							//compart_type = CompartmentTypes.findOne({_id: compart_type_id,});
							if (!compart_type) {

								var compart_type_name = compartment.compartmentTypeName;
								compart_type = await CompartmentTypes.findOneAsync({name: compart_type_name,
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

						await Compartments.insertAsync(compartment);
					});
				
				});
			});
			
		}
}


