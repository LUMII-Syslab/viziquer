import { is_system_admin } from '/libs/platform/user_rights'
import { Tools, ToolVersions, Versions, DiagramTypes, ElementTypes, CompartmentTypes, Projects, Diagrams, Elements, Compartments } from '/libs/platform/collections'

Meteor.methods({

	migrate: function(list) {
		var target_tool = Tools.findOne({name: list.toolName});
		if (!target_tool) {
			console.error("No target tool", list.toolName);
			return;
		}

		migrateProjectByTool(target_tool, list);
	},	

	migrateProject: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id)) {
			var target_tool = Tools.findOne({_id: list.targetToolId});
			if (!target_tool) {
				console.error("No target tool", list.targetToolId);
				return;
			}

			Projects.find({toolId: list.toolId}).forEach(function(project) {
				migrateProjectByTool(target_tool, {projectId: project._id,});
			});
		}
	},
	
	migrateIndexes: function(projectId) {

		Diagrams.find({projectId: projectId}).forEach(function(diagram) {

			var diagram_type = DiagramTypes.findOne({_id: diagram.diagramTypeId,});

			Elements.find({diagramId: diagram._id, diagramTypeId: diagram_type._id}).forEach(function(elem) {

				var elem_type = ElementTypes.findOne({_id: elem.elementTypeId,});
				CompartmentTypes.find({elementTypeId:elem_type._id}).forEach(function(compType){
					compartments = Compartments.find({projectId:projectId, elementId:elem._id, compartmentTypeId:compType._id });
					if (compartments.count() == 1 ){
					    compartments.forEach(function(c){
							Compartments.update({_id: c._id, projectId:projectId,},{$set: { index: compType.index,}});
						})  
					}
					if (compartments.count() > 1 ){
						comp_ind = compartments.map(function (c) {
							return {_id:c._id, index:c.index, input:c.input};
						});
						comp_ind.sort(function(a, b) { return a.index - b.index; })
						var i = 0; 
						comp_ind.forEach(function(c)
						{
							Compartments.update({_id: c._id, projectId: projectId,},{$set: { index: compType.index+i,}});					   
							i = i + 1
						})		   
					}
				});
				
						

			});
		});
		console.log("Done");
	}, 
});


function migrateProjectByTool(target_tool, list) {

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
}
