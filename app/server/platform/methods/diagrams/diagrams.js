import { is_system_admin, is_project_admin, is_project_version_admin, is_project_version_reader } from '/libs/platform/user_rights'
import { is_public_diagram, get_unknown_public_user_name } from '/server/platform/_helpers'
import { Tools, DiagramTypes, Projects, Versions, Diagrams, Elements, Compartments } from '/libs/platform/collections'
import { generate_id } from '/libs/platform/lib'

Diagrams.after.remove(function (user_id, doc) {
	if (!doc)
		return false;

	Elements.remove({diagramId: doc["_id"]});
	DiagramTypes.remove({diagramId: doc["_id"]});
});
Diagrams.hookOptions.after.remove = {fetchPrevious: false};

Meteor.methods({

	insertDiagram: function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			build_diagram(list, user_id);
			list["editingUserId"] = user_id;
			list["editingStartedAt"] = new Date();

			var id = Diagrams.insert(list);

			return id;
		}
	},

	addPublicDiagram: function(list_in) {
		const user_id = get_unknown_public_user_name();

		const tool = Tools.findOne({"$or": [{name: "Viziquer"}, {name: "ViziQuer",},]});
		if (!tool) {
			console.error("No Viziquer tool");
			return;
		}

		const schema_server = Meteor.call("getEnvVariable", "SCHEMA_SERVER_URL");
		const response = HTTP.call('GET', `${schema_server}/info`, {}) || {};

		// let schema = {};
		// if (response && response.data) {
		const schema = _.find(response.data, function(item) {
							return item.display_name == list_in.schema;
						});
		// }


		// let project_id;
		let public_project_name = "__publicVQ" + tool._id;
		const project_obj = {name: public_project_name,	
							toolId: tool._id,		
							createdAt: new Date(),
							createdBy: user_id,
						};

		if (schema) {
			_.extend(project_obj, {schema: list_in.schema,
									endpoint: schema.sparql_url,
									uri: schema.named_graph,
									queryEngineType: schema.endpoint_type,
									directClassMembershipRole: schema.direct_class_role,
									indirectClassMembershipRole: schema.indirect_class_role,
									showPrefixesForAllNames: false
									// query: list_in.query,
								});
		}

		let project_id = Projects.insert(project_obj);

		var version = Versions.findOne({projectId: project_id,});
		if (!version) {
			console.error("No project version by project id", project_id);
			return;
		}

		var diagram_type = DiagramTypes.findOne({toolId: tool._id});
		if (!diagram_type) {
			console.error("No diagram type by tool id", tool._id);
			return;
		}

		let list = {};
		build_diagram(list, user_id);
		list["editingUserId"] = user_id;
		list["editingStartedAt"] = new Date();
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

		var id = Diagrams.insert(list);
		list._id = id;

		return list;
	},


	updateDiagram: function(list) {
		var user_id = Meteor.userId() || is_public_diagram(list["diagramId"]);

		var update = {};
		update[list["attrName"]] = list["attrValue"];

		if (is_project_version_admin(user_id, list) || get_unknown_public_user_name()) {

			Diagrams.update({_id: list["diagramId"], projectId: list["projectId"],
							versionId: list["versionId"]},
							{$set: update});
		}

		else if (is_system_admin(user_id, list)) {

			Diagrams.update({_id: list["diagramId"], toolId: list["toolId"],
							versionId: list["versionId"]},
							{$set: update});
		}

	},

	removeDiagram: function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {
			Diagrams.remove({_id: list["id"], projectId: list["projectId"], versionId: list["versionId"]});
		}

		else if (is_system_admin(user_id, list)) {
			Diagrams.remove({_id: list["id"], toolId: list["toolId"], versionId: list["versionId"]});
		}
	},

	addTargetDiagram: function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			var diagram = list["diagram"];
			build_diagram(diagram, user_id);

			//overriding the default values
			diagram["parentDiagrams"] = [list["parentDiagram"]];

			//selecting the element
			var elem = list["element"];

			var id = Diagrams.insert(diagram);
			Elements.update({_id: element["id"], projectId: elem["projectId"], versionId: elem["versionId"]},
							{$set: {targetId: id}});
		}
	},

	addDiagramPermission: function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {

			Diagrams.update({_id: list["diagramId"], projectId: list["projectId"]},
							{$push: {allowedGroups: list["groupId"]}});
		}
	},

	removeDiagramPermission: function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {
			Diagrams.update({_id: list["diagramId"], projectId: list["projectId"]},
							{$pull: {allowedGroups: list["groupId"]}});
		}
	},

	updateDiagramsSeenCount: function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_reader(user_id, list)) {
			Diagrams.update({_id: list["diagramId"], projectId: list["projectId"]},
							{$inc: {seenCount: 1}});
		}
	},


	lockingDiagram: function(list) {
		var user_id = Meteor.userId() || get_unknown_public_user_name();
		if (list["toolId"] && is_system_admin(user_id)) {
			Diagrams.update({_id: list["diagramId"],
							toolId: list["toolId"]},

							{$set: {"editingUserId": user_id,
									"editingStartedAt": new Date(),}
							});

		}

		else if (is_project_version_admin(user_id, list) || is_public_diagram(list["diagramId"])) {
			Diagrams.update({_id: list["diagramId"],
							projectId: list["projectId"], versionId: list["versionId"],},
							
							{$set: {"editingUserId": user_id,
									"editingStartedAt": new Date(),}
							});
		}
	},

	removeLocking: function(list) {
		var user_id = Meteor.userId() || get_unknown_public_user_name();
		if (list["toolId"] && is_system_admin(user_id)) {
			Diagrams.update({_id: list["diagramId"], toolId: list["toolId"]},
							{$unset: {editingUserId: "", editingStartedAt: ""}});
		}

		else if (is_project_version_admin(user_id, list) || is_public_diagram(list["diagramId"])) {
			Diagrams.update({_id: list["diagramId"],
							projectId: list["projectId"], versionId: list["versionId"]},
							{$unset: {editingUserId: "", editingStartedAt: ""}});
		}

	},


	duplicateDiagram: function(list) {

		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			var diagram_id = list.diagramId;
			var project_id = list.projectId;

			var diagram = Diagrams.findOne({_id: diagram_id, projectId: project_id,});
			if (!diagram) {
				console.error("No diagram ", diagram);
				return;
			}

			// diagram._id = undefined;
			delete diagram._id;
			var new_diagram_id = Diagrams.insert(diagram);


			var elems_map = {};
			Elements.find({diagramId: diagram_id, projectId: project_id, type: "Box"}).forEach(function(box) {

				var old_box_id = box._id;
				// box._id = undefined;
				delete box._id;
				box.diagramId = new_diagram_id;

				var new_box_id = Elements.insert(box);
				elems_map[old_box_id] = new_box_id;
			});


			Elements.find({diagramId: diagram_id, projectId: project_id, type: "Line"}).forEach(function(line) {

				var old_line_id = line._id;

				// line._id = undefined;
				delete line._id;
				line.startElement = elems_map[line.startElement];
				line.endElement = elems_map[line.endElement];
				line.diagramId = new_diagram_id;

				var new_line_id = Elements.insert(line);
				elems_map[old_line_id] = new_line_id;
			});


			Compartments.find({diagramId: diagram_id, projectId: project_id}).forEach(function(compart) {

				// compart._id = undefined;
				delete compart._id;
				compart.elementId = elems_map[compart.elementId];
				compart.diagramId = new_diagram_id;

				Compartments.insert(compart);
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
