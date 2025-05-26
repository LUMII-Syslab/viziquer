import { is_system_admin } from '../../../libs/platform/user_rights.js'
import { Tools, ToolVersions, Versions, DiagramTypes, ElementTypes, CompartmentTypes, Projects, Diagrams, Elements, Compartments } from '../../../db/platform/collections.js'

Meteor.methods({

	migrate: async function(list) {
		var target_tool = await Tools.findOneAsync({name: list.toolName});
		if (!target_tool) {
			console.error("No target tool", list.toolName);
			return;
		}

		await migrateProjectByTool(target_tool, list);
	},

	migrateProject: async function(list) {
		var user_id = Meteor.userId();
		if (await is_system_admin(user_id)) {
			var target_tool = await Tools.findOneAsync({_id: list.targetToolId});
			if (!target_tool) {
				console.error("No target tool", list.targetToolId);
				return;
			}

			await Projects.find({toolId: list.toolId}).forEachAsync(async function(project) {
				await migrateProjectByTool(target_tool, {projectId: project._id,});
			});
		}
	},

	migrateIndexes: async function(projectId) {

		await Diagrams.find({projectId: projectId}).forEachAsync(async function(diagram) {

			var diagram_type = await DiagramTypes.findOneAsync({_id: diagram.diagramTypeId,});

			await Elements.find({diagramId: diagram._id, diagramTypeId: diagram_type._id}).forEachAsync(async function(elem) {

				var elem_type = await ElementTypes.findOneAsync({_id: elem.elementTypeId,});
				await CompartmentTypes.find({elementTypeId:elem_type._id}).forEachAsync(function(compType){
					let compartments = Compartments.find({projectId:projectId, elementId:elem._id, compartmentTypeId:compType._id });
					if (compartments.count() == 1 ){
					    compartments.forEach(async function(c) {
							await Compartments.updateAsync({_id: c._id, projectId:projectId,},{$set: { index: compType.index,}});
						})
					}
					if (compartments.count() > 1 ){
						let comp_ind = compartments.map(function (c) {
							return {_id:c._id, index:c.index, input:c.input};
						});
						comp_ind.sort(function(a, b) { return a.index - b.index; })
						var i = 0;
						comp_ind.forEach(async function(c) {
							await Compartments.updateAsync({_id: c._id, projectId: projectId,},{$set: { index: compType.index+i,}});
							i = i + 1
						})
					}
				});



			});
		});
		console.log("Done");
	},
});


async function migrateProjectByTool(target_tool, list) {

	await Diagrams.find({projectId: list.projectId}).forEachAsync(async function(diagram) {

		var current_diagram_type = await DiagramTypes.findOneAsync({_id: diagram.diagramTypeId,});
		if (!current_diagram_type) {
			console.error("No current digram types ", current_diagram_type);
			return;
		}

		var target_diagram_type = await DiagramTypes.findOneAsync({name: current_diagram_type.name, toolId: target_tool._id,});
		if (!target_diagram_type) {
			console.error("No taget diagram types ", current_diagram_type.name);
			return;
		}

		await Elements.find({diagramId: diagram._id, diagramTypeId: current_diagram_type._id}).forEachAsync(async function(elem) {

			var current_elem_type = await ElementTypes.findOneAsync({_id: elem.elementTypeId,});
			if (!current_elem_type) {
				console.error("No current element type ", current_element_type);
				return;
			}

			var target_elem_type = await ElementTypes.findOneAsync({name: current_elem_type.name, diagramTypeId: target_diagram_type._id,});
			if (!target_elem_type) {
				console.error("No target element type ", current_elem_type.name);
				return;
			}

			await Compartments.find({elementId: elem._id, diagramId: diagram._id, projectId: list.projectId}).forEachAsync(async function(compart) {

				var current_compart_type = await CompartmentTypes.findOneAsync({_id: compart.compartmentTypeId,});
				if (!current_compart_type) {
					console.error("No current compartment type ", current_compart_type);
					return;
				}

				var target_compart_type = await CompartmentTypes.findOneAsync({name: current_compart_type.name, elementTypeId: target_elem_type._id});
				if (!target_compart_type) {
					console.error("No target compartment type ", current_compart_type.name);
					return;
				}

				await Compartments.updateAsync({_id: compart._id, projectId: list.projectId,},
									{$set: {
										compartmentTypeId: target_compart_type._id,
										elementTypeId: target_elem_type._id,
										diagramTypeId: target_diagram_type._id,
										toolId: target_tool._id,
									}});
			});

			await Elements.updateAsync({_id: elem._id, diagramId: diagram._id, projectId: list.projectId,},
							{$set: {
								elementTypeId: target_elem_type._id,
								diagramTypeId: target_diagram_type._id,
								toolId: target_tool._id,
							}});
		});

		await Diagrams.updateAsync({_id: diagram._id, projectId: list.projectId,},
						{$set: {
							diagramTypeId: target_diagram_type._id,
							toolId: target_tool._id,
						}});
	});

	await Projects.updateAsync({_id: list.projectId},
					{$set: {
						toolId: target_tool._id,
					}});

	var tool_version = await ToolVersions.findOneAsync({toolId: target_tool._id});
	if (!tool_version) {
		console.error("No tool version", tool_version);
		return;
	}

	await Versions.updateAsync({projectId: list.projectId},
					{$set: {
						toolId: target_tool._id,
						toolVersionId: tool_version._id,
					}},
					{multi: true}
				);

	console.log("Done");
}
