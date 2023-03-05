import { Tools, Users, ProjectsUsers} from '/libs/platform/collections'


is_power_user = function(user_id) {
	var role_name = build_power_user_role();
	return Roles.userIsInRole(user_id, [role_name]);
}

is_project_version_reader = function(user_id, doc, role) {

	if (!doc)
		return false;

	if (is_system_admin(user_id))
		return true;

	if (doc["projectId"] && doc["versionId"]) {

		var proj_id = doc["projectId"];
		var version_id = doc["versionId"];

		var roles = [];

		//selecting the user role in the project
		if (!role) {
			var proj_user = ProjectsUsers.findOne({projectId: proj_id, userSystemId: user_id});
			if (proj_user)
				role = proj_user["role"];
		}

		var reader_role;
		if (role == "Admin")
			reader_role = build_project_version_reader_role(proj_id, version_id, "Reader");
		else
			reader_role = build_project_version_reader_role(proj_id, version_id, role);

		roles.push(reader_role);

		var admin_role = build_project_version_admin_role(proj_id, version_id);
		roles.push(admin_role);

		return Roles.userIsInRole(user_id, roles);
	}
}

is_project_version_admin = function(user_id, doc) {

	if (!doc)
		return false;

	if (is_system_admin(user_id))
		return true;

	if (doc["projectId"]) {
		var admin_role = build_project_version_admin_role(doc["projectId"], doc["versionId"]);
		return Roles.userIsInRole(user_id, [admin_role]);
	}
}

//This is to add versionId field in case the doc is from Versions collection
is_project_version_admin_for_version = function(user_id, doc) {

	if (!doc)
		return false;

	doc["versionId"] = doc["_id"];
	return is_project_version_admin(user_id, doc); 
}	

is_project_member = function(user_id, doc) {

	if (!doc)
		return false;

	if (is_system_admin(user_id))
		return true;

	if (doc["projectId"]) {
		var role_name = build_project_role(doc["projectId"]);
		return Roles.userIsInRole(user_id, [role_name]);
	}
}

is_project_admin = function(user_id, doc) {
	if (!doc)
		return false;

	if (is_power_user(user_id))
		return true;

	//if doc is projectUser object
	if (doc["projectId"]) {	
		var role_name = build_project_admin_role(doc["projectId"]);
		return Roles.userIsInRole(user_id, [role_name]);
	}

	//if doc is project object
	if (doc["_id"]) {	
		var role_name = build_project_admin_role(doc["_id"]);
		return Roles.userIsInRole(user_id, [role_name]);
	}

}

//checks if the user is system admin
is_system_admin = function(system_id) {
	
	var user = Users.findOne({systemId: system_id});
	if (user && user["isSystemAdmin"] === true)
		return true;
	else
		return false;
}

is_author = function(user_id, doc) {
	if (doc && doc["authorId"] === user_id)
		return true;
}

is_logged_in = function(user_id) {
	if (user_id)
		return true;
}

is_id_in_array = function(id, array_of_ids) {
	for (var i=0;i<array_of_ids.length;i++) {
		if (array_of_ids[i] == id)
			return true;
	}
}

//generating role names
build_project_role = function(proj_id) {
	if (proj_id)
		return "p_" + proj_id;
}

build_project_admin_role = function(proj_id) {
	if (proj_id)
		return "p_admin_" + proj_id;
}


build_project_version_reader_role = function(proj_id, version_id, role) {
	if (proj_id && version_id) {
		
		if (role == "Admin")
			role = "Reader";

		if (role == "Reader")
			return "p_reader_" + proj_id + "_" + version_id;
		else
			return "p_" + role + "_" + proj_id + "_" + version_id;
	}
}

build_project_version_admin_role = function(proj_id, version_id) {
	if (proj_id && version_id)
		return "p_admin_" + proj_id + "_" + version_id; 	
}

build_power_user_role = function() {
	return "power_user";
}


export {is_power_user,
		is_project_version_reader,
		is_project_version_admin,
		is_project_version_admin_for_version,
		is_project_member,
		is_project_admin,
		is_system_admin,
		is_author,
		is_logged_in,
		is_id_in_array,
		build_project_role,
		build_project_admin_role,
		build_project_version_reader_role,
		build_project_version_admin_role,
		build_power_user_role
}

