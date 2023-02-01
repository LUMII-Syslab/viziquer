

//checks whether user is allowed to access the project
get_user_rights_to_access_project = function(list, user_system_id) {
	if (list) {
		var proj_id = list["projectId"];
		
		//checks if user has logged in
		if (user_system_id) {
			var user = ProjectsUsers.findOne({userSystemId: user_system_id, projectId: proj_id});
			if (user) {

				//if version is specified,
				//then checks if the user has rights to access the specified version
				if (list["versionId"]) {

					var version_query;
					if (list["projectId"]) {

						//selects the project version
						var version_id = list["versionId"];
						version_query = {_id: version_id, projectId: proj_id};
					}

					else if (list["toolId"]) {
						var tool_id = list["toolId"];

						//checking if the project uses the specified too
						var project = Projects.findOne({_id: proj_id, toolId: tool_id});
						if (project) {

							//selects the tool version
							var version_id = list["versionId"];
							version_query = {toolVersionId: version_id, projectId: proj_id};
						}
						else {
							return {isValidUser: false,
								error: "There is not such a project with the specified tool"};	
						}
					}
					
					var version = Versions.findOne(version_query);
					if (version) {

						//Only the published versions are available for every project member
						if (version["status"] == "Published" && user["status"] == "Member")
							return {isValidUser: true,
									role: user["role"]};

						//New versions are availabe only for the admins and system admins 
						//TODO: If user is a system admin, 
						//then he also has rights to access the project
						else if (version["status"] == "New" && (user["role"] == "Admin")) {

								return {isValidUser: true,
										role: user["role"]};
						}
						else
							return {isValidUser: false,
									error: "User has no rights to access the specified project version"};
					}
					else {
						return {isValidUser: false,
								error: "There is not such a version in the project"};	
					}
				}

				//if no version is specified, then user has to be the member of the project
				else if (user["status"] == "Member") {
					return {isValidUser: true,
							role: user["role"]};
					}
					else
						return {isValidUser: false,
								error: "User has no rights to access the project"};
			}
			else
				return {isValidUser: false, error: "User has no rights to access the project"};	
		}
		else
			return {isValidUser: false, error: "User is not logged in"};
	}
	else
		return {isValidUser: false, error: "No arguments specified"};
}

check_user_rights = function(user_rights, privacy_level) {
	if (user_rights["isValidUser"]) {
		if (privacy_level == "All")
			return true;
		else
			if (privacy_level == user_rights["role"])
				return true;
			else
				return false;
	}
	else {
		return false;
	}
}

//checks if the project version is in the state that can be edited
is_allowed_version = function(list) {
	var version = Versions.findOne({_id: list["versionId"],
									projectId: list["projectId"],
									status: "New"});
	
	if (version && list["versionId"] == version["_id"])
		return true;
	else
		return false;
}

error_msg = function(err) {
	if (err)
		console.log(err["error"]);
	else
		console.log("Unspecified error");
}

is_version_not_published = function(list) {
	var tool_version = ToolVersions.findOne({_id: list["versionId"],
											toolId: list["toolId"],
											status: "New",
										});
	if (tool_version)
		return true;
	else
		return false;
}

build_user_search_query = function(text) {
	var search_entered = text.toLowerCase();
	var search_items = search_entered.split(" ");
	var query = {};
	if (search_items.length == 0)
		return;
	else {

		//filters by name, surname or email
    	if (search_items.length == 1) {
    		query = {$or: [{nameLC: {'$regex': "^" + search_items[0]}}, 
    						{surnameLC: {'$regex': "^" + search_items[0]}}, 
    						{email: {'$regex': "^" + search_items[0]}}
    					]};
    	}
    	else 
    		if (search_items.length == 2) {
				query = {$or: [
					{$and: [{nameLC: {'$regex': "^" + search_items[0]}},
							{surnameLC: {'$regex': "^" + search_items[1]}}]},

					{$and: [{nameLC: {'$regex': "^" + search_items[1]}},
							{surnameLC: {'$regex': "^" + search_items[0]}}]},
				]};   		
    		}
    		else
    			query = reset_query();
   	}

   	return query;
}

get_user_query_limit = function() {
	return {fields: {lastModified: 0,
					date: 0,
					activeProject: 0,
					projects: 0,
					nameLC: 0,
					surnameLC: 0,
					toolId: 0,
					toolVersions: 0,
					versionId: 0,
					}
			};
}

get_maximal_user_query_limit = function() {
	var limit = get_user_query_limit();
	var fields = limit["fields"];
	fields["tags"] = 0;
	//fields["email"] = 0;

	return limit;
}

build_site_name = function() {
	return "viziquer";
}

build_from_address = function() {
	return 'ajoo <no-reply-viziquer@lumii.lv>';
}

is_test_user = function(email) {

	var test_email = "@test.com";
	var test_email_len = test_email.length;

	if (email) {

		var email_len = email.length;

		//if email ends with the test email, then this is test email
		if (email.substring(email_len - test_email_len) == test_email)
			return true;
	}
}