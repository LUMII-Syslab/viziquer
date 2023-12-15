import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Users, Searches } from '/imports/db/platform/collections'
import { reset_variable } from '/imports/client/platform/js/utilities/utils'

//Binding data to render the search drop-down depending on search type
Template.searchMenu.helpers({

	searches: function() {

		var search_type = Session.get("search_type");
		var search_functions = {

			diagrams: function() {
				return selecting_searches();
			},

			documents: function() {
				return selecting_searches();
			},

			chats: function() {

				var search = Session.get("chatsSearch");
				if(!search)
					return;

				//selects users
				var query = build_user_search_query(search["text"]);
				var users = Users.find(query);					
				var res = users.map(function(user, i) {
					var item = {};
					item["index"] = i;
					item["phrase"] = true;

					item["id"] = user["systemId"];
					item["name"] = user["name"] + " " + user["surname"];
					item["phrase"] = item["name"];
					item["profileImage"] = user["profileImage"];
					item["email"] = user["email"];

					return item;
				});

				//if users are less then 10, then adding also some search phrases
				var users_count = users.count();
				if (users_count <= 10) {
					var limit = 10 - users_count;
					var searches = Searches.find({}, {$sort: {counter: -1}, limit: limit});
					searches.forEach(function(search, i) {
						
						var item = {};
						item["id"] = search["_id"];
						item["index"] = users_count + i;
						item["phrase"] = search["phrase"];

						res.push(item);
					});
				}

				res["count"] = res.length;
				res["style"] = get_display_mode(res.length);

				return res;
			},

			users: function() {

				var query = {};
				query["users." + Session.get("userSystemId")] = {$exists: true};

				var sort = {};
				sort["users." + Session.get("userSystemId")] = -1;

				var limit = {$sort: sort, $limit: 10};

				return selecting_searches(query, limit);
			},

			contacts: function() {
				return selecting_searches();
			}
		};

		if (search_functions[search_type])
			return search_functions[search_type]();
	},
});

function selecting_searches(query, limit) {

	if (!query)
		query = {};

	if (!limit)
		limit = {$sort: {counter: -1}, limit: 10};

	var searches = Searches.find(query, limit);
	var res = searches.map(function(search, i) {
		search["index"] = i;
		return search;
	});

	var count = searches.count();
	res["count"] = count;
	res["style"] = get_display_mode(count);

	return res;	
}

Template.searchMenu.rendered = function() {
	initalize_search();
}

Template.searchMenu.events({

	'mousedown .search-item' : function(e) {
		e.preventDefault();
		var src = $(e.target).closest(".search-item");

		$("#searchField").val(src.attr("item"))
						.attr({itemid: src.attr("id")});

		search_object(e, src.attr("item"));
		return false;
	},

	'mouseover .search-item' : function(e) {
		var new_item = $(e.target).closest(".search-item");
		reset_selected_item(new_item);
	},

	'mouseleave .search-item' : function(e) {
		remove_selected_item();
	},

});


function build_search_events_list(list) {
	return {

	//searches documents and its sections on each key stroke

		'focus #searchField' : function(e) {
			initalize_search();
		},

		'keyup #searchField' : function(e) {
			search_keyup(e);
		},

		'keydown #searchField' : function(e) {
			remove_caret_move_on_keyup(e);
		},

		'blur #searchField' : function(e) {
			reset_search_query(e);
		},

		'mousedown #searchButton' : function(e) {
			search_object(e);
		},

	};
}

function search_object(e, text) {

	if (text)
		$("#searchField").val(text);
	else
		text = $("#searchField").val();

	text = text.toLowerCase();

	var src = get_search_bar(e);
	var collection_type = src.attr("collectionType");

	var search_type = Session.get("search_type");
	var search_type_func = {

		diagrams : function() {
			search_project_objects("diagrams", collection_type, text);
		},

		documents: function() {
			search_project_objects("documents", collection_type, text);
		},

		users: function() {

			//query for users	
			var filter = {text: text,
							projectId: Session.get("activeProject"),
							versionId: Session.get("versionId")};

		    Session.set("searchUsers", filter);
		    save_query(collection_type, text);
		},

		chats: function() {

			var user_id = $("#searchField").attr("itemid")
		    var list = {
		    			userId: user_id,
						phrase: text,
					};

			var query = Session.get("userChats");
			query["page"] = 1;
			
			if (text == "")
				query["userId"] = undefined;
			else
				query["userId"] = user_id;

			Session.set("userId", query["userId"]);

			Session.set("phrase", text);
			query["phrase"] = text;

			//stores the searched user
			Meteor.call("searchInChats", list, function(err){
				if (err) {
					console.log("Error in searchInChats", err);
				}
			});

			Session.set("userChats", query);

			var path = build_path_to_chat_page(1);

			FlowRouter.go(path);
		},

		contacts: function() {

			Session.set("searchContacts", {phrase: text});

		    var list = {
						phrase: text,
						type: collection_type,
					};

			//stores the searched user
			Meteor.call("searchInContacts", list, function(err){
				if (err) {
					console.log("Error in searchInContacts", err);
				}
			});

		},
	};

	if (search_type_func[search_type])
		search_type_func[search_type]();

//resets the query
	reset_search_query(e);
}

function search_project_objects(query, collection_type, text) {

	save_query(collection_type, text);

	FlowRouter.go(query, {projectId: Session.get("activeProject"),
						versionId: Session.get("versionId"),
						phrase: text});
}

function save_query(collection_type, text) {

//stores in the DB the searched phrase
    var list = {
				projectId: Session.get("activeProject"),
				versionId: Session.get("versionId"),
				phrase: text,
				type: collection_type,
			};

	Meteor.call("searchInProject", list, function(err){
		if (err) {
			console.log("Error in searchInProject", err);
		}
	});	
}

search_keyup = function(e) {

	//if enter, then searching
	if (e.keyCode == 13)
		search_object(e);
	
	//arrow down
	else if (e.keyCode == 40) 
		process_arrow_button("down");
	
	//arrow up
	else if (e.keyCode == 38) {
		process_arrow_button("up");
	}

	//on "normal" keypress queries the DB
	else {
		remove_selected_item();

		//selects the search bar
		var src = get_search_bar(e);

		//selects the value from the search field
		var text = $("#searchField").val();
		var collection_type = src.attr("collectionType");
		var query = src.attr("suggestionsQuery");

		//if the text is empty string, then resets the search drop-down
		if (text == "")
			reset_search_query(e);
		else {

			var search_type = Session.get("search_type");
			var search_type_func = {

				chats: function() {
					var filter = {text: text,
									type: collection_type};
					
				    Session.set(query, filter);
				},

				contacts: function() {
					var filter = {text: text,
									type: collection_type};
					
				    Session.set(query, filter);
				},

				users: function() {
					exec_search_keyup(query, collection_type, text);
				},

				diagrams: function() {
					exec_search_keyup(query, collection_type, text);
				},

				documents: function() {
					exec_search_keyup(query, collection_type, text);
				},
			};

			if (search_type_func[search_type]) {
				search_type_func[search_type]();
			}

		}
	}
}

function exec_search_keyup(query, collection_type, text) {

	var filter = {text: text,
					projectId: Session.get("activeProject"),
					type: collection_type};
	
    Session.set(query, filter);
}

function reset_search_query(e) {
	var src = get_search_bar(e);
	var query = src.attr("suggestionsQuery");
	$("#searchField").removeAttr("itemid");

	Session.set(query, reset_variable());
}

function get_search_bar(e) {
	return $(e.target).closest(".search-bar");
}

function process_arrow_button(arrow_type) {
			
	var count = $("#searchList").attr("count");
	var index = compute_index(arrow_type, count, function() {
		var item = get_selected_elem();
		var index = item.attr("index");

		return index;
	});

	//selects the selected item
	var item = $('[index = ' + index + ']');
	var text = item.attr("item");
	var item_id = item.attr("id");

	reset_selected_item(item);

	//sets the selected value in the searchbar
	$("#searchField").val(text)
					.attr({itemid: item_id, phrase: text});
}

function get_selected_elem() {
	return $(".search-item.selected-item");
}

function reset_selected_item(new_item) {
	remove_selected_item()
	new_item.addClass("selected-item");
}

function remove_selected_item() {
	get_selected_elem().removeClass("selected-item");
}

compute_index = function(arrow_type, count, compute_index_fn) {

	if (arrow_type == "up") {
		var step_direction = -1;
		var initial_value = count-1;
		var end_index = 0;
	}
	else if (arrow_type == "down") {
		var step_direction = 1;
		var initial_value = 0;
		var end_index = count-1;
	}
	
	var index = compute_index_fn();
	if (typeof index == "undefined") {
		index = initial_value;
	}
	else {
		//if index is the last, then starts from the begining
		if (index == end_index)
			index = initial_value;
		else
			index = Number(index) + step_direction;
	}
	return index;
}

get_display_mode = function(count) {
	if (count && count > 0)
		return "display:block;";
	else	
		return "display:none;";
}

remove_caret_move_on_keyup = function(e) {

	//avoids the caret move in the input field
	if (e.keyCode == 38) {
		e.preventDefault();
	    e.stopPropagation();
	    return false;
	}
}

function initalize_search() {
	var search_bar = $(".search-bar");
	Session.set("search_type", search_bar.attr("type"));	
}

//Adding search bar properties to the search bars in diagrams, documents, users, chats pages

function diagrams_search() {
	var events = build_search_events_list();
	Template.diagramsSearchBar.events(events);
}

function users_search() {
	var events = build_search_events_list();
	Template.usersSearchBar.events(events);	
}

function contacts_search() {
	var events = build_search_events_list();
	// Template.contactsSearchBar.events(events);
}

diagrams_search();
users_search();
contacts_search();

