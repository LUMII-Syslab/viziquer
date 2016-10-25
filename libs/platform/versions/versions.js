
Versions.before.insert(function (user_id, doc) {

	if (!doc)
		return false;

	//if this is not the first version, then perform some checking
	var version = Versions.findOne({projectId: doc["projectId"]});
	if (version) {

		//prevents from adding multiple versions with the status New
		var new_version = Versions.findOne({projectId: doc["projectId"], status: "New"});
		if (new_version)
			return false;
	}

});
Versions.hookOptions.before.insert = {fetchPrevious: false};


Versions.after.insert(function (user_id, doc) {

	if (!doc)
		return false;

	var project_id = doc["projectId"];
	var new_version_id = doc["_id"];

	//the creator's current version is updated to the new one
	ProjectsUsers.update({userSystemId: user_id, projectId: project_id}, 
						{$set: {versionId: new_version_id}});

	//the last published project version
	var last_version = Versions.findOne({projectId: project_id, status: "Published"},
										{sort: {publishedAt: -1}});
	
	//if the inserted version is the first version, then nothing to do
	if (!last_version)
		return;

	//adding admin role in the new version to the project admins
	add_admin_role(project_id, new_version_id);

	var last_version_id = last_version["_id"];

	//copies of diagram things
	var diagrams = Diagrams.find({projectId: project_id, versionId: last_version_id});
	var users_settings = UserVersionSettings.find({projectId: project_id, versionId: last_version_id});
	var elements = Elements.find({projectId: project_id, versionId: last_version_id});
	var compartments = Compartments.find({projectId: project_id, versionId: last_version_id});


	//diagram things
	var diagram_list = {};
	_.each(diagrams.fetch(), function(diagram) {
		diagram["versionId"] = new_version_id;

		var old_id = diagram["_id"];
		delete diagram["_id"];

		if (!diagram["seenCount"])
			diagram["seenCount"] = 0;

		var new_id = Diagrams.insert(diagram, {removeEmptyStrings: false});
		diagram_list[old_id] = new_id;
	});

	_.each(users_settings.fetch(), function(user_settings) {
		user_settings["versionId"] = new_version_id;
		user_settings["diagramId"] = diagram_list[user_settings["diagramId"]];

		var old_user_diagram_id = user_settings["_id"];
		delete user_settings["_id"];

		if (!user_settings["diagramsSortBy"])
			user_settings["diagramsSortBy"] = "alphabetTopDown";

		if (!user_settings["diagramsSelectedGroup"])
			user_settings["diagramsSelectedGroup"] = "none";

		if (!user_settings["documentsSortBy"])
			user_settings["documentsSortBy"] = "alphabetTopDown";

		if (!user_settings["documentsSelectedGroup"])
			user_settings["documentsSelectedGroup"] = "none";

		var new_user_diagram_id = UserVersionSettings.insert(user_settings);
	});

	var element_list = {};
	_.each(elements.fetch(), function(element) {
		element["versionId"] = new_version_id;
		element["diagramId"] = diagram_list[element["diagramId"]];

		var old_elem_id = element["_id"];
		delete element["_id"];	

		if (element["startElement"])
			element["startElement"] = element_list[element["startElement"]];

		if (element["endElement"])
			element["endElement"] = element_list[element["endElement"]];

		var new_elem_id = Elements.insert(element);
		element_list[old_elem_id] = new_elem_id;
	});


	_.each(compartments.fetch(), function(compartment) {
		compartment["versionId"] = new_version_id;

		compartment["diagramId"] = diagram_list[compartment["diagramId"]];

		//if (compartment["elementId"])
		compartment["elementId"] = element_list[compartment["elementId"]];

		delete compartment["_id"];	
		Compartments.insert(compartment, {removeEmptyStrings: false});
	});

		
	var notification = {projectId: project_id,
						isAdminsOnly: true,
						notificationType: "NewVersion",
						userId: user_id,
						versionId: new_version_id
					};

	send_notifications(user_id, notification);
});
Versions.hookOptions.after.insert = {fetchPrevious: false};

Versions.after.update(function (user_id, doc) {

	var version_id = doc["_id"];	
	var project_id = doc["projectId"];

	//sending the notification to the project members that a new version is published
	var notification = {projectId: project_id,
						isAdminsOnly: false,
						notificationType: "PublishVersion",
						userId: user_id,
						versionId: version_id,
					};
	send_notifications(user_id, notification);

	//removing users from the admin role in this version
	remove_from_admin_role(project_id, version_id);

	//assigning readers role to the project members
	add_read_role(project_id, version_id);
});
Versions.hookOptions.after.update = {fetchPrevious: false};

Versions.after.remove(function(user_id, doc) {

	var new_version_id = doc["_id"];
	var project_id = doc["projectId"];

	//values for the notifictions
	var notification = {projectId: project_id,
						isAdminsOnly: true,
						notificationType: "DeleteVersion",
						userId: user_id,
						versionId: new_version_id};

	//selects the last published version to assign it to the users who had the removed version
	var last_version = Versions.findOne({projectId: project_id, status: "Published"},
										{sort: {publishedAt: -1}});
	var last_version_id;
	if (last_version)
		last_version_id = last_version["_id"];

	//a transaction needed
	if (last_version_id)
		ProjectsUsers.update({projectId: project_id, versionId: new_version_id}, 
							{$set: {versionId: last_version_id}});

	send_notifications(user_id, notification);

	//deleting diagrams, elements, compartments, ...
	Diagrams.remove({projectId: project_id, versionId: new_version_id});

	UserVersionSettings.remove({projectId: project_id, versionId: new_version_id});

	//removing roles
	remove_from_admin_role(project_id, new_version_id, true);
});
Versions.hookOptions.after.remove = {fetchPrevious: false};

Meteor.methods({

	insertVersion: function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {
			list["createdAt"] = new Date();
			list["createdBy"] = user_id;
			list["status"] = "New";

			Versions.insert(list);
		}
	},

	publishVersion: function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

			Versions.update({_id: list["versionId"], projectId: list["projectId"], status: "New"},
							{$set: {
									publishedAt: new Date(),
									publishedBy: user_id,
									comment: list["comment"],
									status: "Published",
								}
							});
		}
	},

	removeVersion: function(list) {
		var user_id = Meteor.userId();
		if (is_project_version_admin(user_id, list)) {

            if (!list["versionId"])
                return;

			Versions.remove({_id: list["versionId"],
							projectId: list["projectId"],
							status: "New",
						});
		}
	},

});

function add_admin_role(proj_id, version_id) {
	
	//building role name
	var admin_role = build_project_version_admin_role(proj_id, version_id);

	//selecting project admins
	var project_admin_role = build_project_admin_role(proj_id);
	var admins = Roles.getUsersInRole(project_admin_role).fetch();

	//adding admin and read roles in the new version to the admins
	Roles.addUsersToRoles(admins, admin_role);
}

function add_read_role(proj_id, version_id) {

	var users_by_roles = {};

	//selecting project users and classifying them by their roles
	ProjectsUsers.find({projectId: proj_id}).forEach(
		function(proj_user) {

			var role = proj_user["role"];
			var user_id = proj_user["userSystemId"];
			if (users_by_roles[role])
				users_by_roles[role].push(user_id);

			else
				users_by_roles[role] = [user_id];
	});

	//building role name and assigning the specified role for the users
	for (var role in users_by_roles) {
		var users = users_by_roles[role];
		var reader_role = build_project_version_reader_role(proj_id, version_id, role);

		Roles.addUsersToRoles(users, reader_role);	
	}
}

function remove_from_admin_role(proj_id, version_id, is_remove_role) {

	//selecting admins
	var admin_role = build_project_version_admin_role(proj_id, version_id);
	var users = Roles.getUsersInRole(admin_role).fetch();

	//removing users from the roles
	Roles.removeUsersFromRoles(users, admin_role);

	//if the version is remove, then all the roles are deleted
	if (is_remove_role)
		Roles.deleteRole(admin_role);
}

function send_notifications(user_id, list) {

	var proj_id = list["projectId"];
	var query = {projectId: proj_id, status: "Member"};

	if (list["isAdminsOnly"])
		query["role"] = "Admin";

	var date = new Date();

	var proj_name = "";
	var project = Projects.findOne({_id: proj_id});
	if (project)
		proj_name = project["name"];

	ProjectsUsers.find(query).forEach(
		function(project_user) {

			var receiver_id = project_user["userSystemId"];
			if (receiver_id != user_id) {

				var notification = {
									projectId: proj_id,
									createdBy: list["userId"],
									status: "new",
									receiver: receiver_id,
									type: list["notificationType"],
									createdAt: date,
									data: {versionId: list["versionId"]},
								};

				Notifications.insert(notification);

				sending_notification_email(list["notificationType"], receiver_id, proj_name); 
			}
	});
}

function sending_notification_email(notification_type, user_id, proj_name) {

	var receiver_user = Users.findOne({systemId: user_id})
	if (receiver_user) {

		var subject = "";
		var text = "";
		if (notification_type == "NewVersion") {
			subject = "New version";
			text = "A new version in project " + proj_name + " was created.";
		}

		else if (notification_type == "PublishVersion") {
			subject = "Published version";
			text = "The latest version in project " + proj_name + " was published.";
		}

		else if (notification_type == "DeleteVersion") {
			subject = "Deleted version";
			text = "The latest version in project " + proj_name + " was deleted.";
		}

		var email = {email: receiver_user["email"],
					subject: subject,
					text: text,
					//html: '<body></body>'
				};

		send_email(email);
	}
}
