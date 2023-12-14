import { Meteor } from 'meteor/meteor'
import { 
  Tools, ToolVersions, UserTools, DiagramTypes, ElementTypes, CompartmentTypes, DialogTabs, ImportedTranslets, Diagrams, Elements, Compartments, PaletteButtons 
} from '/imports/db/platform/collections'
import { get_configurator_tool_id } from '/imports/libs/platform/helpers'
import { is_system_admin } from '/imports/libs/platform/user_rights'
import { error_msg } from '/imports/server/platfom/_global_functions'


Meteor.publish("Structure_Tools", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	var user_id = this.userId;
	if (user_id) {

		//removes the configurator from the query
		var query = {_id: {$ne: get_configurator_tool_id()}, isDeprecated: {$ne: true},};
		
		return Tools.find(query, {fields: {name: 1}});
	}
	else {
		error_msg();
		return this.stop();
	}
});

Meteor.publish("Tools", function(list) {
	if (!list || list["noQuery"]) {
		return this.stop();
	}

	var user_id = this.userId;
	if (is_system_admin(user_id)) {

		//removes the configurator from the query
		var query = {_id: {$ne: get_configurator_tool_id()}};
		var fields = {createdBy: 0, documents: 0, forum: 0,
						users: 0, archive: 0, analytics: 0, training: 0, tasks: 0};

		return [Tools.find(query, {sort: {name: 1}, fields: fields}),
				UserTools.find({userSystemId: user_id})];
	}
	else {
		return this.stop();
	}
});

Meteor.publish("ToolVersions_Diagrams_DiagramTypes", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var user_id = this.userId;
	if (is_system_admin(user_id)) {

		var version_id = list["versionId"];

		//if no version is specified, then selects the last version
		if (!version_id) {
			var version = ToolVersions.findOne({toolId: list["toolId"]},
												{sort: {startDate: -1}});
			if (version)
				version_id = version["_id"];
		}

		var tools_query = {_id: {$ne: get_configurator_tool_id()}};

		//var diagram_type_query1 = {toolId: list["toolId"], versionId: version_id};
		var diagram_type_query2 = {toolId: get_configurator_tool_id()};

		return [
				// Tools.find({_id: list["toolId"]}),
				Tools.find(tools_query, {sort: {name: 1},}),
				
				ToolVersions.find({toolId: list["toolId"]},
												{fields: {toolId: 0, createdBy: 0}}),

				// DocumentTypes.find({toolId: list["toolId"], versionId: version_id},
				// 					{fields: {toolId: 0, createdBy: 0, createdAt: 0}}),

				//selecting the cofigurator diagram type
				DiagramTypes.find(diagram_type_query2,
					{fields: {_id: 1, extensionPoints: 1, editorType: 1}}),
				
				UserTools.find({userSystemId: user_id, toolId: list["toolId"]},
															{fields: {userSystemId: 0}}),
				
				Diagrams.find({toolId: list["toolId"], versionId: version_id},
					{fields: {_id: 1, name: 1, imageUrl: 1, editorType: 1, diagramTypeId: 1,
								versionId: 1, toolId: 1}})];

	}
	else {
		error_msg();
		return this.stop();
	}			
});


Meteor.publish("ConfiguratorDiagram", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	if (is_system_admin(this.userId)) {

		var diagram_query = {_id: list["diagramId"],
							toolId: list["toolId"],
							versionId: list["versionId"]};

		var diagram_elems_query = {	diagramId: list["diagramId"],
									toolId: list["toolId"],
									versionId: list["versionId"]};

		var diagram_type_query = {toolId: list["toolId"],
									versionId: list["versionId"],
									diagramId: list["diagramId"]};

		var diagram_type_query2	= {toolId: get_configurator_tool_id(),
									_id: list["diagramTypeId"]};

		//selecting the current tool types						
		//var query1 = {toolId: list["toolId"],
		//				versionId: list["versionId"],
		//				diagramId: list["diagramId"]};

		//selecting the configurator tool's types
		var query2 = {toolId: get_configurator_tool_id(),
						diagramTypeId: list["diagramTypeId"]};

		var diagram_type_query2	= {toolId: get_configurator_tool_id(),
									_id: list["diagramTypeId"]};		



		return [
				Diagrams.find({$or: [diagram_query, query2]}),
				Elements.find({$or: [diagram_elems_query, query2]}),
				Compartments.find({$or: [diagram_elems_query, query2]}),

				DiagramTypes.find({$or: [diagram_type_query, diagram_type_query2]}),

				// CompartmentTypes.find({$or: [query1, query2]}, 
				//  			{fields: {toolId: 0, versionId: 0, diagramId: 0}}),
				// DialogTabs.find({$or: [query1, query2]},
				//  			{fields: {toolId: 0, versionId: 0, diagramId: 0}}),

				ElementTypes.find(query2),
				PaletteButtons.find(query2),

				// ImportedTranslets.find({toolId: list["toolId"], versionId: list["versionId"],
				// 						//diagramTypeId: list["diagramTypeId"]}),
				// }),
				
			];
	}
	else {
		error_msg();
		return this.stop();
	}
});

Meteor.publish("ConfiguratorDiagramTypes", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	if (is_system_admin(this.userId)) {

		var diagram_query = {_id: list["diagramId"],
							toolId: list["toolId"],
							versionId: list["versionId"]};

		var diagram_elems_query = {	diagramId: list["diagramId"],
									toolId: list["toolId"],
									versionId: list["versionId"]};

		// var diagram_type_query = {toolId: list["toolId"],
		// 							versionId: list["versionId"],
		// 							diagramId: list["diagramId"]};

		//selecting the current tool types						
		var query1 = {toolId: list["toolId"],
						versionId: list["versionId"],
						diagramId: list["diagramId"],
					};

		//selecting the configurator tool's types
		var query2 = {toolId: get_configurator_tool_id(),
						diagramTypeId: list["diagramTypeId"]};

		return [
				// Diagrams.find({$or: [diagram_query, query2]},
				//  			{fields: {createdAt: 0, createdBy: 0, toolId: 0, versionId: 0}}),
				
				// Elements.find({$or: [diagram_elems_query, query2]},
				//  			{fields: {toolId: 0, versionId: 0, diagramId: 0, domain: 0}}),
				
				// Compartments.find({$or: [diagram_elems_query, query2]},
				// 			{fields: {toolId: 0, versionId: 0, diagramId: 0}}),

				ElementTypes.find(query1),
				 			// {fields: {toolId: 0, versionId: 0, diagramId: 0}}),
				PaletteButtons.find(query1),
				 			// {fields: {toolId: 0, versionId: 0, diagramId: 0}}),


				CompartmentTypes.find({$or: [query1, query2]}),
				 			// {fields: {toolId: 0, versionId: 0, diagramId: 0}}),
				DialogTabs.find({$or: [query1, query2]}),
				 			// {fields: {toolId: 0, versionId: 0, diagramId: 0}}),


				ImportedTranslets.find({toolId: list["toolId"], versionId: list["versionId"],
										//diagramTypeId: list["diagramTypeId"]}),
				}),
				
			];
	}
	else {
		error_msg();
		return this.stop();
	}
});
