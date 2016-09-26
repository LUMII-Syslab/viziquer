
//creating a new project version and adds the project creator to the project
Projects.after.insert(function (user_id, doc) {

	if (!doc)
		return false;

	var proj_id = doc["_id"];
	var tool_id = doc["toolId"];
	var date = new Date();

	//selects the last tool version
	var tool_version = ToolVersions.findOne({toolId: tool_id}, {sort: {createdAt: -1}});
	if (!tool_version) {
		console.log("There is no tool version for tool: ", tool_id);
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
	var project_admin_role = build_project_admin_role(proj_id);
	var project_version_admin_role = build_project_version_admin_role(proj_id, version_id);

	Roles.addUsersToRoles(user_id, [project_role, project_admin_role, project_version_admin_role]);
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

		var user_id = Meteor.userId();
		if (user_id) {
			list["createdAt"] = new Date();
			list["createdBy"] = user_id;

		    Projects.insert(list);
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

});

