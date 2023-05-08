import { Roles } from 'meteor/alanning:roles'
import { is_project_admin, is_project_member, build_project_role, build_project_admin_role, build_project_version_admin_role, build_project_version_reader_role } from '/libs/platform/user_rights'
import { generate_id } from '/libs/platform/lib'
import { Projects, ProjectsUsers, ToolVersions, Versions, UserVersionSettings, Users, Diagrams, Elements, Compartments, Posts, ForumPosts } from '/libs/platform/collections'
import { Schema } from '/libs/custom/collections'
import { get_unknown_public_user_name } from '/server/platform/_helpers'

//creating a new project version and adds the project creator to the project
Projects.after.insert(function (user_id, doc) {

	if (!doc) {
		return false;
	}

	afterInsert(user_id, doc);

	// var proj_id = doc["_id"];
	// var tool_id = doc["toolId"];
	// var date = new Date();

	// //selects the last tool version
	// var tool_version = ToolVersions.findOne({toolId: tool_id}, {sort: {createdAt: -1}});
	// if (!tool_version) {
	// 	console.log("There is no tool version for tool: ", tool_id);
	// 	return;
	// }

	// //adding the project new version
	// var version_id = Versions.insert({projectId: proj_id,
	// 								createdAt: date,
	// 								createdBy: user_id,
	// 								status: "New",
	// 								toolVersionId: tool_version["_id"],
	// 								toolId: tool_id,
	// 							});

	// //inserting the user in the project
	// ProjectsUsers.insert({
	// 					projectId: proj_id,
	// 					role: "Admin",
	// 					status: "Member",
	// 					createdAt: date,
	// 					modifiedAt: date,
	// 					invitedBy: user_id,
	// 					userSystemId: user_id,
	// 					versionId: version_id,
	// 				});

	// //adding the doc that stores some user stuff
	// UserVersionSettings.insert({
	// 					userSystemId: user_id,
	// 					versionId: version_id,
	// 					projectId: proj_id,
	// 					view: "Default",
	// 					consistencyCheck: false,
	// 					collapsedDiagrams: [],
	// 					diagramsSortBy: "alphabetTopDown",
	// 					diagramsSelectedGroup: "none",
	// 					documentsSortBy: "alphabetTopDown",
	// 					documentsSelectedGroup: "none",
	// 				});

	// Users.update({systemId: user_id}, {$set: {activeProject: proj_id, activeVersion: version_id}});

	// //managing roles/permissons
	// var project_role = build_project_role(proj_id);
	// var project_admin_role = build_project_admin_role(proj_id);
	// var project_version_admin_role = build_project_version_admin_role(proj_id, version_id);

	// Roles.addUsersToRoles(user_id, [project_role, project_admin_role, project_version_admin_role]);
});
Projects.hookOptions.after.insert = {fetchPrevious: false};

//Project deletion is canceled if there is atleast one diagram or document in the project
Projects.before.remove(function (user_id, doc) {

	if (!doc)
		return false;

	//var dgr = Diagrams.findOne({projectId: doc["_id"]});
	//if (dgr)
	//	return false;

	//var proj_doc = Documents.findOne({projectId: doc["_id"]});
	//if (proj_doc)
	//	return false;

});
Projects.hookOptions.before.remove = {fetchPrevious: false};

//TODO: needs some cheking if this ok
Projects.after.remove(function (user_id, doc) {

	var proj_id = doc["_id"]

	//a transaction is needed
	ProjectsUsers.remove({projectId: proj_id});
	Versions.remove({projectId: proj_id});

	Posts.remove({projectId: proj_id});
	ForumPosts.remove({projectId: proj_id});

	//roles???
});
Projects.hookOptions.after.remove = {fetchPrevious: false};

Meteor.methods({

	insertProject: function(list) {
		var schema_link = null;
		var project_link = null;
		var versionId = null;
		var user_id = Meteor.userId();
		if (user_id) {
			list["createdAt"] = new Date();
			list["createdBy"] = user_id;
            
			if (list.schema_link)
			{
				schema_link = list.schema_link;
				delete 	list.schema_link;
			}
			if (list.project_link)
			{
				project_link = list.project_link;
				delete 	list.project_link;
			}
			
		    Projects.insert(list);
			
			var project = Projects.findOne({createdAt: list["createdAt"], createdBy:user_id, name:list["name"] });
			var projectsUsers = ProjectsUsers.findOne({projectId: project._id})
			if ( projectsUsers )
				versionId = projectsUsers.versionId;
			
			//console.log(project)
			//console.log(projectsUsers)
			
			if (schema_link)
			{
				//console.log("Ir shēmas links")
				var list = { projectId: project._id,
							 versionId: versionId, 	
							 url: schema_link,
							};
				Meteor.call("loadMOntologyByUrl", list);
			}
			
			if (project_link)
			{
				//console.log("Ir projekta links")
				var list = { projectId: project._id,
							 versionId: versionId, 	
							 url: project_link,
							};
				Meteor.call("uploadProjectDataByUrl", list);
			}
			return project._id;
		}
	},

	updateProject: function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {
			Projects.update({_id: list["projectId"]}, {$set: list["set"]});
		}
	},

	removeProject: function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {
			Projects.remove({_id: list["projectId"]})
		}
	},

	updateUserVersionSettings: function(list) {

		var user_id = Meteor.userId();
		if (user_id) {
			UserVersionSettings.update({userSystemId: user_id, versionId: list["versionId"]}, list["update"]);
		}
	},


	duplicateProject: function(list) {
		var user_id = Meteor.userId();
		var versionId = null;
		if (is_project_member(user_id, list)) {
			var project_id = list.projectId;
			var project = Projects.findOne({_id: project_id});
			if (!project) {
				console.error("No project object");
				return;
			}

			project._id = generate_id();
			var new_project_id = Projects.direct.insert(project);
			list.newProjectId = new_project_id;

			project._id = new_project_id;
			var new_version_id = afterInsert(user_id, project);

			Diagrams.find({projectId: project_id}).forEach(function(diagram) {
				duplicateDiagram(diagram, new_project_id, new_version_id);
			});
			
			var schema = Schema.findOne({projectId: project_id});
			if (schema) {
				delete schema._id;
				_.extend(schema, {projectId: new_project_id});
				Schema.insert(schema);			
			}

		}

	},

	leaveProject: function(list) {

		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {
			ProjectsUsers.remove({userSystemId: user_id, projectId: list.projectId,});
		}

	},

});



function duplicateDiagram(diagram, new_project_id, new_version_id) {

	var diagram_id = diagram._id;
	var project_id = diagram.projectId;

	diagram._id = undefined;

	_.extend(diagram, {_id: undefined, projectId: new_project_id, versionId: new_version_id,});
	var new_diagram_id = Diagrams.insert(diagram);


	var elems_map = {};
	Elements.find({diagramId: diagram_id, projectId: project_id, type: "Box"}).forEach(function(box) {

		var old_box_id = box._id;
		_.extend(box, {_id: undefined, diagramId: new_diagram_id, projectId: new_project_id, versionId: new_version_id,});

		var new_box_id = Elements.insert(box);
		elems_map[old_box_id] = new_box_id;
	});


	Elements.find({diagramId: diagram_id, projectId: project_id, type: "Line"}).forEach(function(line) {

		var old_line_id = line._id;

		line._id = undefined;
		_.extend(line, {_id: undefined, diagramId: new_diagram_id, projectId: new_project_id, versionId: new_version_id,
						startElement: elems_map[line.startElement], endElement: elems_map[line.endElement],});

		var new_line_id = Elements.insert(line);
		elems_map[old_line_id] = new_line_id;
	});


	Compartments.find({diagramId: diagram_id, projectId: project_id}).forEach(function(compart) {

		_.extend(compart, {_id: undefined, elementId: elems_map[compart.elementId], diagramId: new_diagram_id, projectId: new_project_id, versionId: new_version_id, });

		Compartments.insert(compart);
	});
}


function afterInsert(user_id_in, doc) {

	var user_id = doc["createdBy"];
	if (!user_id) {
		user_id = user_id_in;
	}

	var proj_id = doc["_id"];
	var tool_id = doc["toolId"];
	var date = new Date();

	//selects the last tool version
	var tool_version = ToolVersions.findOne({toolId: tool_id}, {$sort: {createdAt: -1}});
	if (!tool_version) {
		// console.error("There is no tool version for tool: ", tool_id);
		return;
	}

	//adding the project new version
	var version_id = Versions.insert({projectId: proj_id,
									createdAt: date,
									createdBy: user_id,
									status: "New",
									toolVersionId: tool_version["_id"],
									toolId: tool_id,
								});

	//inserting the user in the project
	ProjectsUsers.insert({
						projectId: proj_id,
						role: "Admin",
						status: "Member",
						createdAt: date,
						modifiedAt: date,
						invitedBy: user_id,
						userSystemId: user_id,
						versionId: version_id,
					});

	//adding the doc that stores some user stuff
	UserVersionSettings.insert({
						userSystemId: user_id,
						versionId: version_id,
						projectId: proj_id,
						view: "Default",
						consistencyCheck: false,
						collapsedDiagrams: [],
						diagramsSortBy: "alphabetTopDown",
						diagramsSelectedGroup: "none",
						documentsSortBy: "alphabetTopDown",
						documentsSelectedGroup: "none",
					});

	Users.update({systemId: user_id}, {$set: {activeProject: proj_id, activeVersion: version_id}});

	//managing roles/permissons
	var project_role = build_project_role(proj_id);	
	var project_version_reader_role = build_project_version_reader_role(proj_id, version_id, "Reader");
	var project_admin_role = build_project_admin_role(proj_id);
	var project_version_admin_role = build_project_version_admin_role(proj_id, version_id);

	Roles.createRole(project_role, {unlessExists: true});
	Roles.createRole(project_version_reader_role, {unlessExists: true});
	Roles.createRole(project_admin_role, {unlessExists: true});
	Roles.createRole(project_version_admin_role, {unlessExists: true});


	console.log("user_id dadfadfdf", user_id)


	Roles.addUsersToRoles(user_id, [project_role, project_version_reader_role, project_admin_role, project_version_admin_role]);

	return version_id;
}