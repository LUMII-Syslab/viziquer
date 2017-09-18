
// Start of members tab
Template.membersTab.helpers({

	tableView: function() {
		return Session.get("tableView");
	},
});

Template.membersTab.events({

//activates default view
	'click #defaultView' : function(e) {
		e.preventDefault();
		Session.set("tableView", reset_variable());
	},

//activates default view
	'click #tableView' : function(e, templ) {
		e.preventDefault();
		Session.set("tableView", true);
	},	

});
// End of members tab

// Start of members view button
Template.membersViewButton.helpers({
	tableView: function() {
		return Session.get("tableView");
	},
});
// End of members view button

// Start of members filter
Template.membersFilter.events({

//filters project members
    'keyup #findUser' : function(e) {

    	//building the query that filters the project members by the text in the search bar
    	var search_entered = $('#findUser').val();
    	var query;
    	if (search_entered != "")
    		query = build_user_search_query(search_entered);

		Session.set("membersFilter", query);
    },

    "click #add-user-groups": function(e) {
    	e.preventDefault();

    	//show modal
    	$("#user-groups").modal("show");

    	return;
    },

    "click #invite-user": function(e) {
    	$("#invite-user-form").modal("show");
    },

});

// End of members filter

Template.userGroups.helpers({

	groups: function() {
		var is_admin = Utilities.isAdmin();

		var group_id = Session.get("groupId");
		var groups = Utilities.getProjectGroups();

		var i = groups.length + 1;
		_.each(groups, function(group) {
			group["nr"] = i++;

			var count = get_project_users_by_group(group["_id"]);
			group["count"] = count;

			if (is_admin) {
				group["isEditable"] = true;
				if (count > 0) {
					group["isRemovable"] = false;
				}
				else {
					group["isRemovable"] = true;
				}
			}
		});

		return groups;
	},

	isAdmin: function() {
		return Utilities.isAdmin();
	}

});


Template.userGroups.events({

	"click #new-group": function(e) {
		e.preventDefault();

		var group_obj = $("#group-name");
		var group_name = group_obj.val();
		group_obj.val("");

		var all_proj_dgr_obj = $("#allProjectDiagrams");
		var all_proj_dgr = all_proj_dgr_obj.prop('checked');
		all_proj_dgr_obj.prop('checked', false);

		var current_proj_dgr_obj = $("#currentProjectDiagrams");
		var current_proj_dgr = current_proj_dgr_obj.prop('checked');
		current_proj_dgr_obj.prop('checked', false);

		var all_proj_doc_obj = $("#allProjectDocuments");
		var all_proj_doc = all_proj_doc_obj.prop('checked');
		all_proj_doc_obj.prop('checked', false);	

		var current_proj_doc_obj = $("#currentProjectDocuments");
		var current_proj_doc = current_proj_doc_obj.prop('checked');
		current_proj_doc_obj.prop('checked', false);
				

		var list = {name: group_name,
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),

					allProjectDiagrams: all_proj_dgr,
					currentProjectDiagrams: current_proj_dgr,

					allProjectDocuments: all_proj_doc,
					currentProjectDocuments: current_proj_doc,
				};

		Utilities.callMeteorMethod("addGroup", list);

		return;
	},

	"blur .edit-group-name": function(e) {
		e.preventDefault();

		var input = $(e.target);
		var value = input.text();

		var group_id = input.closest(".table-row").attr("id");

		var group = ProjectsGroups.findOne({_id: group_id});
		if (group) {
			if (group["name"] != value)
				input.text("");
		}
		
		var list = {id: group_id, projectId: Session.get("activeProject"), name: value};
		Utilities.callMeteorMethod("editGroup", list);

		return;
	},

	"click .delete-group-button": function(e) {
		e.preventDefault();

		var group_id = $(e.target).closest(".table-row").attr("id");

		var list = {id: group_id, projectId: Session.get("activeProject")};
		Utilities.callMeteorMethod("removeGroup", list);

		return;
	},

});


// Start of members table view
Template.membersTableView.helpers({

	users: render_members,

	editable: function() {
		return Utilities.isAdmin();
	},
});

Template.membersTableView.events(members_tab_events());
// End of members table view

// Start of members default viewusers
Template.membersDefaultView.helpers({
	users: render_members,

	editable: function() {
		return Utilities.isAdmin();
	},

});

Template.membersDefaultView.events(members_tab_events());
// End of members default view

// Start of found users
Template.foundUsers.helpers({

	foundUsers: function() {

		//selects the user ids that are the members of the project
		var user_ids = ProjectsUsers.find({projectId: Session.get("activeProject")}).map(
			function(proj_user) {
				return proj_user["userSystemId"];
			});

		//selecting users that are not in the project and match the entered values
		var search = Session.get("searchUsers");
		var query1 = {noQuery: -1};
		if (search) {
			if (search["text"] && search["text"] != "")
				query1 = build_user_search_query(search["text"]);
			else
				query1 = {noQuery: -1};			
		}

		var query2 = {systemId: {$nin: user_ids}};
		var query = {$and: [query1, query2]};

		var groups = ProjectsGroups.find().fetch();
		return Users.find(query).map(function(user) {
			user["groups"] = groups;
			return user;
		});
	},

	editable: function() {
		return Utilities.isAdmin();
	},
});

Template.foundUsers.events({

//adds user to project
    'click .invite' : function(e, templ) {
    	e.preventDefault();

    	var src = $(e.target);
    	var role = src.closest(".invite").attr("role");
    	var user_id = src.closest(".found-user").attr("id");

    	var list = {projectId: Session.get("activeProject"), role: role, userSystemId: user_id};
		Utilities.callMeteorMethod("insertProjectsUsers", list);

    	return false;
    },

});

// End of found users

Template.usersSearchBar.events({

	'click #searchUser': function(e) {
		e.keyCode = 13;
		search_keyup(e);
	}

});

Template.inviteUserForm.helpers({

	groups: function() {
		return Utilities.getProjectGroups();
	}

});

Template.inviteUserForm.events({

	"click #invite-user-send-button": function(e) {

		var form = $("#invite-user-form");
		form.modal("hide");

		var list = {email: form.find("#email").val(),
					projectId: Session.get("activeProject"),
					role: $("#role option:selected").attr("id"),
				};

		Utilities.callMeteorMethod("enrollUser", list);
	},

});


//Functions

// returns an array of project users
function get_project_members() {

	///building the filter that is entered in the project members search bar
	var members_filter = Session.get("membersFilter");
	var filter_query;
	if (members_filter) {
		var user_ids = Users.find(members_filter).map(function(user) {return user["systemId"]});
		if (user_ids.length > 0)
			filter_query = {systemId: {$in: user_ids}};
		
		//if no user matches the filter, returns nothing
		else
			return;
	}

	//selecting project members
	return ProjectsUsers.find({projectId: Session.get("activeProject")}).map(
		function(proj_user, i) {

			//building the query
			var user_query;
			if (filter_query)
				user_query = {$and: [{systemId: proj_user["userSystemId"]}, filter_query]};
			else
				user_query = {systemId: proj_user["userSystemId"]};

			//selecting the user
			var user = Users.findOne(user_query);

			if (user) {
				user["role"] = proj_user["role"];
				user["status"] = proj_user["status"];

				user["createdAt"] = joined_date(proj_user["createdAt"]);
				//user["href"] = "/project/" + Session.get("activeProject") + "/user/" + user["_id"];
				user["index"] = i+1;

				return user;
			}
	});
}

// returns a list of event hanlers for member tab (same functions for both views)
function members_tab_events() {
	return {
		//changing user's role to admin
			'click .set-as' : function(e) {
				e.preventDefault();
				var role = $(e.target).closest(".set-as").attr("role")
				set_role(e, role);
			},

		//removes user from project
		    'click .decline' : function(e) {
			    e.preventDefault();

				var user_id = $(e.target).closest(".change-button").attr("id");

				var list = {projectId: Session.get("activeProject"), userSystemId: user_id};
				Utilities.callMeteorMethod("removeProjectsUsers", list);

				return;
		    },
		}
}

//changes project members role
function set_role(ev, role) {

	var user_id = $(ev.target).closest(".change-button").attr("id");

	var list = {projectId: Session.get("activeProject"),
				userSystemId: user_id,
				update: {$set: {role: role}}
			};

	Utilities.callMeteorMethod("updateProjectsUsers", list);
}

build_user_search_query = function(search_entered) {
	if (!search_entered)
		return {};

	var search_items = search_entered.split(" ");
	var query = {};
	if (search_items.length == 0)
		query = {};
	else {

		//filters by name, surname or email
    	if (search_items.length == 1) {
    		query = {$or: [{name: {'$regex': "^" + search_items[0], $options: 'i'}}, 
    						{surname: {'$regex': "^" + search_items[0], $options: 'i'}}, 
    						{email: {'$regex': "^" + search_items[0], $options: 'i'}}
    					]};
    	}
    	else 
    		if (search_items.length == 2) {
				query = {$or: [
					{$and: [{name: {'$regex': "^" + search_items[0], $options: 'i'}},
							{surname: {'$regex': "^" + search_items[1], $options: 'i'}}]},

					{$and: [{name: {'$regex': "^" + search_items[1], $options: 'i'}},
							{surname: {'$regex': "^" + search_items[0], $options: 'i'}}]},
				]};   		
    		}
    		else
    			query = Utilities.resetQuery();
   	}

   	return query;
}

function get_project_users_by_group(role) {
	return ProjectsUsers.find({role: role, projectId: Session.get("activeProject")}).count();
}

function render_members() {

	var groups = ProjectsGroups.find().fetch();
	var members = get_project_members();

	return _.map(members, function(member) {

		if (!member)
			return;

		//groups for the change role drop-down
		if (member)
			member["groups"] = groups;


		if (is_default_role(member["role"]))
			member["defaultRole"] = true;

		else {
			var group_id = member["role"];
			var group = ProjectsGroups.findOne({_id: group_id});
			if (group)
				member["roleName"] = group["name"];
		}
		
		var meteor_user = Meteor.users.findOne({_id: member["systemId"]});
		if (meteor_user) {
			var status = meteor_user.status;
				
			//online status online, idle
			if (status) {

				if (status.idle)
					member.idle = true;
				else if (status.online)
					member.online = true;

				//else {
				//}
			}
		}


		return member;
	});
}

is_default_role = function(role) {
	if (role == "Admin" || role == "Reader")
		return true;
}