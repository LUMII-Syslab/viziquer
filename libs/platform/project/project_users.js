
ProjectsUsers.before.insert(function (user_id, doc) {

	if (!doc)
		return false;

	//cheking if the user is already attached to the project
	var proj_user = ProjectsUsers.findOne({userSystemId: doc["userSystemId"], projectId: doc["projectId"]});
	if (proj_user) {
		console.log("ProjectsUsers error: The user is already attached to the project");
		return false;
	}
});
ProjectsUsers.hookOptions.before.insert = {fetchPrevious: false};

ProjectsUsers.after.insert(function (user_id, doc) {

	if (!doc)
		return false;

	//not sending notifications to the user himself
	if (doc["userSystemId"] != user_id) {

		//adding notification to the user that was invited
		Notifications.insert({
						createdBy: user_id,
						receiver: doc["userSystemId"],
						createdAt: new Date(),
						type: "Invitation",
						status: "new",
						projectId: doc["projectId"],
						data: {
							role: doc["role"],
						}
					});

		//sending email
		var subject = "Invitation";
		var proj_name = get_project_name(doc["projectId"]);
		var text = "You have a new invitation for the project " + proj_name + ".";

		sending_notification_email(doc["userSystemId"], doc["projectId"], subject, text);
	}
});
ProjectsUsers.hookOptions.after.insert = {fetchPrevious: false};

// ProjectsUsers.before.update(function (user_id, doc, fieldName, modifier, options) {
// 	modifier.$set = modifier.$set || {};

// 	//only admins can change the role
// 	if (modifier.$set.role && !is_project_admin(user_id, doc)) {
// 		console.log("Update failed: Only admins can change the role");
// 		return false;
// 	}

// 	//user status can be changed from invited to member only
// 	else if (modifier.$set.status && modifier.$set.status != "Member") {
// 		console.log("Update failed: User status can only be changed to Member");		
// 		return false;
// 	}

// 	//if role is not changed, then stop the update (prevents sending the notification)
// 	else if (modifier.$set.role == doc["role"]) {
// 		if (!modifier.$set.status) {
// 			console.log("Update stoped: Changing role value to the same value");
// 			return false;
// 		}
// 	}
// 	else
// 		modifier.$set.modifiedAt = new Date();
// });

ProjectsUsers.after.update(function (user_id, doc, fieldNames, modifier, options) {

	//if not changing the role, then no notifications are sent
	if (!doc || !modifier.$set)
		return false;

	var proj_id = doc["projectId"];
	var version_id = doc["versionId"];
	var target_user = doc["userSystemId"];

	if (modifier.$set.role) {

		var role = modifier.$set.role;
		
		var old_doc = this.previous;
		var prev_role;
		if (old_doc)
			prev_role = old_doc["role"];

		if (prev_role == role)
			return;

		var proj_versions = Versions.find({projectId: proj_id});

		//removing old role rights
		if (prev_role) {

			var old_roles = [build_project_admin_role(proj_id)];

			//removing admins rights from any project version
			proj_versions.forEach(function(version) {
				old_roles.push(build_project_version_admin_role(proj_id, version["_id"]));
				old_roles.push(build_project_version_reader_role(proj_id, version["_id"], prev_role));
			});

			Roles.removeUsersFromRoles(target_user, old_roles);
		}

		var roles = [];

		//if the role was modified to the admin, then adding admin rights
		if (role == "Admin") {
			var roles = [build_project_admin_role(proj_id)];

			var last_new_version = Versions.findOne({projectId: proj_id, status: "New"});
			if (last_new_version)
				roles.push(build_project_version_admin_role(proj_id, version_id));
		}

		//adding reading rights
		proj_versions.forEach(function(version) {
			roles.push(build_project_version_reader_role(proj_id, version["_id"], role)); 
		});

		Roles.addUsersToRoles(target_user, roles);
	}

	if (modifier.$set.versionId) {
		var version_id = modifier.$set.versionId;
		var settings_id = UserVersionSettings.findOne({userSystemId: user_id, projectId: proj_id,
														versionId: version_id});
		if (!settings_id) {
			settings_id = UserVersionSettings.insert({
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
		}

		Users.update({systemId: user_id, activeProject: proj_id}, {$set: {activeVersion: version_id}});

	}


	//prevent sending notifications to the user himself
	if (doc && doc["userSystemId"] === user_id)
		return false;

	var role = doc["role"];
	var date = new Date();

	var notification = Notifications.findOne({receiver: doc["userSystemId"],
												projectId: doc["projectId"],
												type: "Invitation",
												});

	//if there is an invitation that is confirmed or there is no notification, then creates one
	if (!notification || (notification && notification["status"] == "confirmed")) {

		Notifications.insert({createdBy: user_id,
							receiver: doc["userSystemId"],
							createdAt: date,
							type: "ChangeRole",
							status: "new",
							projectId: doc["projectId"],
							data: {
								role: role,
							}
						});

		//sending email
		var subject = "Role changed";
		var proj_name = get_project_name(doc["projectId"]);
		var text = "Your role in project " + proj_name + " was changed to the " + role + "."

		sending_notification_email(doc["userSystemId"], doc["projectId"], subject, text);
	}
	
	//if there is an invitation that is new or seen, then updates it
	else if (notification["status"] == "seen" || notification["status"] == "new") {

		Notifications.update({receiver: doc["userSystemId"],
							projectId: doc["projectId"],
							type: "Invitation"}, 
							{$set: {"data.role": role,
									sender: user_id,
									status: "new",
							}});
	}
});
//ProjectsUsers.hookOptions.after.update = {fetchPrevious: false};

ProjectsUsers.after.remove(function (user_id, doc) {

	if (!doc)
		return false;

	var target_user = doc["userSystemId"];
	var role = doc["role"];

	//removing all the project related notifications
	Notifications.remove({receiver: target_user, projectId: doc["projectId"], status: {$ne: "rejected"}});

	//remove any user rights from the project
	var proj_id = doc["projectId"];
	var roles = [build_project_admin_role(proj_id), build_project_role(proj_id)];

	//removing admin and reader rights from any project version
	Versions.find({projectId: proj_id}).forEach(function(version) {
		roles.push(build_project_version_admin_role(proj_id, version["_id"]));
		roles.push(build_project_version_reader_role(proj_id, version["_id"], role)); 		
	});

	Roles.removeUsersFromRoles(target_user, roles);

	//removing user's project settings
	UserVersionSettings.remove({projectId: proj_id, userSystemId: target_user});

	//removing the active project
	Users.update({systemId: target_user, activeProject: proj_id}, {$set: {activeProject: "no-project"}});

	if (target_user != user_id) {

		//creates the new messages to inform that user is removed
		Notifications.insert({createdBy: user_id,
							receiver: target_user,
							createdAt: new Date(),
							type: "Removed",
							status: "new",
							projectId: doc["projectId"],							
							data: {}
						});

		var receiver_user = Users.findOne({systemId: doc["userSystemId"]})
		if (receiver_user) {

			var proj_name = get_project_name(proj_id);
			var email = {email: receiver_user["email"],
						subject: "Deletion",
						text: "You have been removed from the project " + proj_name,
						//html: '<body></body>'
					};
		}

		//sending email
		var subject = "Deletion";
		var proj_name = get_project_name(doc["projectId"]);
		var text = "You have been removed from the project " + proj_name + ".";

		sending_notification_email(target_user, doc["projectId"], subject, text);
	}
});
ProjectsUsers.hookOptions.after.remove = {fetchPrevious: false};

Meteor.methods({

	insertProjectsUsers: function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list)) {

			var date = new Date();

			list["status"] = "Invited";
			list["invitedBy"] = user_id;

			list["createdAt"] = date;
			list["modifiedAt"] = date;

			ProjectsUsers.insert(list);

		}
	},

	updateProjectsUsers: function(list) {

		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list) || list["userSystemId"] == user_id) {
			ProjectsUsers.update({projectId: list["projectId"], userSystemId: list["userSystemId"]},
									list["update"]);
		}
	},

	removeProjectsUsers: function(list) {
		var user_id = Meteor.userId();
		if (is_project_admin(user_id, list) || list["userSystemId"] == user_id) {

			ProjectsUsers.remove(list);
		}
	},	

});

function get_project_name(proj_id) {

	var project = Projects.findOne({_id: proj_id});
	var proj_name = "";
	if (project)
		proj_name = project["name"];

	return proj_name;
}

function sending_notification_email(user_id, proj_id, subject, text) {

	var receiver_user = Users.findOne({systemId: user_id})
	if (receiver_user) {
		var proj_name = get_project_name(proj_id);
		var email = {email: receiver_user["email"],
					subject: subject,
					text: text,
					//html: '<body></body>'
				};

		send_email(email);
	}
}