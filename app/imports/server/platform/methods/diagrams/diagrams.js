import { is_system_admin, is_project_admin, is_project_version_admin, is_project_version_reader } from '../../../../libs/platform/user_rights.js'
import { is_public_diagram, get_unknown_public_user_name } from '../../_helpers.js'
import { Tools, DiagramTypes, Projects, Versions, Diagrams, Elements, Compartments } from '../../../../db/platform/collections.js'
import { generate_id } from '../../../../libs/platform/lib.js'

Diagrams.after.remove(async function(user_id, doc) {
	if (!doc)
		return false;

	await Elements.removeAsync({diagramId: doc["_id"]});
	await DiagramTypes.removeAsync({diagramId: doc["_id"]});
});
Diagrams.hookOptions.after.remove = {fetchPrevious: false};

Meteor.methods({

	insertDiagram: async function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			build_diagram(list, user_id);
			list["editingUserId"] = user_id;
			list["editingStartedAt"] = new Date();

			var id = await Diagrams.insertAsync(list);

			return id;
		}
	},

	addPublicDiagram: async function(list_in) {

    if (!list_in["query"]) {
      list_in["query"] = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX dbo: <http://dbpedia.org/ontology/>\nPREFIX dbr: <http://dbpedia.org/resource/>\nSELECT ?areaCode ?City WHERE{\n  ?City rdf:type dbo:City.\n  OPTIONAL{?City dbo:areaCode ?areaCode.}\n  FILTER(?City = dbr:Riga)\n}";
    }

		//list_in["isVisualizationNeeded"] = true;

    if (!list_in["endpoint"]) {
      list_in["endpoint"] = "https://dbpedia.org/sparql"; 
    }

		// ******************************
		const user_id = get_unknown_public_user_name();
		
		const tool = await Tools.findOneAsync({"$or": [{name: "Viziquer"}, {name: "ViziQuer",},]});
		if (!tool) {
			console.error("No Viziquer tool");
			return;
		}

		const schema_server = await Meteor.callAsync("getEnvVariable", "SCHEMA_SERVER_URL");
		const response = HTTP.call('GET', `${schema_server}/info`, {}) || {};

		let schema;
	
		if ( list_in.schema !== undefined && list_in.schema !== '') {
			schema = _.find(response.data, function(item) {
							return item.display_name == list_in.schema;
						});			
		}
		else if (list_in.endpoint !== undefined && list_in.endpoint !== '') {
			let schemas = _.filter(response.data, function(item) { 
							return item.sparql_url == list_in.endpoint;
						});	
			if (schemas.length > 1) {
				schema = _.find(response.data, function(item) { 
							return item.sparql_url == list_in.endpoint && item.is_default_for_endpoint;
						});	
				if ( schema == undefined) {
					schema = _.find(response.data, function(item) { 
							return item.sparql_url == list_in.endpoint;
						});
				}		
			}
			else if (schemas.length == 1) {
				schema = schemas[0];
			}
	
		}


		// let project_id;
		let public_project_name = "__publicVQ" + tool._id;
		const project_obj = {name: public_project_name,	
							toolId: tool._id,		
							createdAt: new Date(),
							createdBy: user_id,
							newPublicProject: true,
						};

		let default_obj_values = {isInitialized: false,
									isVisualizationNeeded: list_in.isVisualizationNeeded || false,
									endpoint: list_in.endpoint || "",
								};

		_.extend(project_obj, default_obj_values);

		let schema_obj = {};
		if (schema) {
			schema_obj = {schema: schema.display_name,
							endpoint: schema.sparql_url,
							uri: schema.named_graph,
							queryEngineType: schema.endpoint_type,
							directClassMembershipRole: schema.direct_class_role,
							indirectClassMembershipRole: schema.indirect_class_role,
							showPrefixesForAllNames: false
						};

			_.extend(project_obj, schema_obj);
		}
		else if (list_in.endpoint !== undefined && list_in.endpoint !== '') {
			schema_obj = {	endpoint: list_in.endpoint,
							directClassMembershipRole: 'rdf:type',
							indirectClassMembershipRole: '',
							showPrefixesForAllNames: false
						};

			_.extend(project_obj, schema_obj);			
		}


		let query_obj = {};
		if (list_in.query) {
			query_obj = {query: list_in.query,};
			_.extend(project_obj, query_obj);

		}


		let project_id = await Projects.insertAsync(project_obj);

		var version = await Versions.findOneAsync({projectId: project_id,});
		if (!version) {
			console.error("No project version by project id", project_id);
			return;
		}

		var diagram_type = await DiagramTypes.findOneAsync({toolId: tool._id});
		if (!diagram_type) {
			console.error("No diagram type by tool id", tool._id);
			return;
		}

		let list = {};
		build_diagram(list, user_id);
		list["editingUserId"] = user_id;
		list["editingStartedAt"] = new Date();

		_.extend(list, schema_obj);
		_.extend(list, query_obj);
		_.extend(list, default_obj_values);

		_.extend(list, {name: generate_id(),
						projectId: project_id,
						versionId: version._id,
						style: {
							fillPriority: 'color',
							fill: '#ffffff',
							fillLinearGradientStartPointX: 0.5,
							fillLinearGradientStartPointY: 0,
							fillLinearGradientEndPointX: 0.5,
							fillLinearGradientEndPointY: 1,
							fillLinearGradientColorStops: [ 0, 'white', 1, 'black' ],
							fillRadialGradientStartPointX: 0.5,
							fillRadialGradientStartPointY: 0.5,
							fillRadialGradientEndPointX: 0.5,
							fillRadialGradientEndPointY: 0.5,
							fillRadialGradientStartRadius: 0,
							fillRadialGradientEndRadius: 1,
							fillRadialGradientColorStops: [ 0, 'white', 1, 'black' ]
						},
						diagramTypeId: diagram_type._id,
						editorType: 'ajooEditor',
						isPublic: true,
		});

		var id = await Diagrams.insertAsync(list);
		list._id = id;

		return list;
	},


	updateDiagram: async function(list) {
		var user_id = Meteor.userId() || is_public_diagram(list["diagramId"]);
		var update = {};
		update[list["attrName"]] = list["attrValue"];

		if (is_project_version_admin(user_id, list) || get_unknown_public_user_name()) {
			await Diagrams.updateAsync({_id: list["diagramId"], projectId: list["projectId"],
							versionId: list["versionId"]},
							{$set: update});
		}

		else if (is_system_admin(user_id, list)) {
			await Diagrams.updateAsync({_id: list["diagramId"], toolId: list["toolId"],
							versionId: list["versionId"]},
							{$set: update});
		}

	},

	removeDiagram: async function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {
			await Diagrams.removeAsync({_id: list["id"], projectId: list["projectId"], versionId: list["versionId"]});
		}

		else if (is_system_admin(user_id, list)) {
			await Diagrams.removeAsync({_id: list["id"], toolId: list["toolId"], versionId: list["versionId"]});
		}
	},

	addTargetDiagram: async function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			var diagram = list["diagram"];
			build_diagram(diagram, user_id);

			//overriding the default values
			diagram["parentDiagrams"] = [list["parentDiagram"]];

			//selecting the element
			var elem = list["element"];

			var id = await Diagrams.insertAsync(diagram);
			await Elements.updateAsync({_id: element["id"], projectId: elem["projectId"], versionId: elem["versionId"]},
							{$set: {targetId: id}});
		}
	},

	addDiagramPermission: async function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {

			await Diagrams.updateAsync({_id: list["diagramId"], projectId: list["projectId"]},
							{$push: {allowedGroups: list["groupId"]}});
		}
	},

	removeDiagramPermission: async function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {
			await Diagrams.updateAsync({_id: list["diagramId"], projectId: list["projectId"]},
							{$pull: {allowedGroups: list["groupId"]}});
		}
	},

	updateDiagramsSeenCount: async function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_reader(user_id, list)) {
			await Diagrams.updateAsync({_id: list["diagramId"], projectId: list["projectId"]},
							{$inc: {seenCount: 1}});
		}
	},


	lockingDiagram: async function(list) {
		var user_id = Meteor.userId() || get_unknown_public_user_name();
		if (list["toolId"] && is_system_admin(user_id)) {
			await Diagrams.updateAsync({_id: list["diagramId"],
							toolId: list["toolId"]},

							{$set: {"editingUserId": user_id,
									"editingStartedAt": new Date(),}
							});

		}

		else if (is_project_version_admin(user_id, list) || is_public_diagram(list["diagramId"])) {
			await Diagrams.updateAsync({_id: list["diagramId"],
							projectId: list["projectId"], versionId: list["versionId"],},
							
							{$set: {"editingUserId": user_id,
									"editingStartedAt": new Date(),}
							});
		}
	},

	removeLocking: async function(list) {
		var user_id = Meteor.userId() || get_unknown_public_user_name();
		if (list["toolId"] && is_system_admin(user_id)) {
			await Diagrams.updateAsync({_id: list["diagramId"], toolId: list["toolId"]},
							{$unset: {editingUserId: "", editingStartedAt: ""}});
		}

		else if (is_project_version_admin(user_id, list) || is_public_diagram(list["diagramId"])) {
			await Diagrams.updateAsync({_id: list["diagramId"],
							projectId: list["projectId"], versionId: list["versionId"]},
							{$unset: {editingUserId: "", editingStartedAt: ""}});
		}

	},


	duplicateDiagram: async function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			var diagram_id = list.diagramId;
			var project_id = list.projectId;

			var diagram = await Diagrams.findOneAsync({_id: diagram_id, projectId: project_id,});
			if (!diagram) {
				console.error("No diagram ", diagram);
				return;
			}

			// diagram._id = undefined;
			delete diagram._id;
			var new_diagram_id = await Diagrams.insertAsync(diagram);


			var elems_map = {};
			await Elements.find({diagramId: diagram_id, projectId: project_id, type: "Box"}).forEachAsync(async function(box) {

				var old_box_id = box._id;
				// box._id = undefined;
				delete box._id;
				box.diagramId = new_diagram_id;

				var new_box_id = await Elements.insertAsync(box);
				elems_map[old_box_id] = new_box_id;
			});


			await Elements.find({diagramId: diagram_id, projectId: project_id, type: "Line"}).forEachAsync(async function(line) {

				var old_line_id = line._id;

				// line._id = undefined;
				delete line._id;
				line.startElement = elems_map[line.startElement];
				line.endElement = elems_map[line.endElement];
				line.diagramId = new_diagram_id;

				var new_line_id = await Elements.insertAsync(line);
				elems_map[old_line_id] = new_line_id;
			});


			await Compartments.find({diagramId: diagram_id, projectId: project_id}).forEachAsync(async function(compart) {

				// compart._id = undefined;
				delete compart._id;
				compart.elementId = elems_map[compart.elementId];
				compart.diagramId = new_diagram_id;

				await Compartments.insertAsync(compart);
			});

		}

	},

});

function build_diagram(list, user_id) {

	var time = new Date();
	list["createdAt"] = time;
	list["createdBy"] = user_id;
	list["imageUrl"] = "http://placehold.it/770x347";
	list["edit"] = {action: "new", time: time, userId: user_id},
	list["parentDiagrams"] = [];
	list["allowedGroups"] = [];
	//list["editing"] = {},
	list["seenCount"] = 0;
}
