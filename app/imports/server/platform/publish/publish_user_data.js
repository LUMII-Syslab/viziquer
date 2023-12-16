import { Meteor } from 'meteor/meteor'
import { Users, Notifications, Chats, Searches, Tools, Projects, ProjectsUsers, UserChatsAuthors } from '/imports/db/platform/collections'
import { not_loggedin_msg } from '/imports/server/platform/_helpers'



//This is for roles package
Meteor.publish(null, function (){ 
	return Meteor.roles.find({})
});

Meteor.publish("LoginUser", function(list) {
	var user_id = this.userId;
	var limit = user_limit();
	
	return Users.find({systemId: user_id}, limit);
});


Meteor.publish("navbar_user", function(list) {

	if (!list || list["noQuery"]) {
		return this.stop();
	}

	//gets user's id
	var user_id = this.userId;
	if (user_id) {
		var limit = user_limit();
		return Users.find({systemId: user_id}, limit);
	}
	else {
		not_loggedin_msg();
		return this.stop();
	}
});

Meteor.publish("navbar_projects", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var user_id = this.userId;
	if (user_id) {
		var fields = {invitedBy: 0, modifiedAt: 0};
		return 	Meteor.publishWithRelations({
					handle: this,
					collection: ProjectsUsers,
					filter: {userSystemId: user_id, status: "Member"},
					options: {
						fields: fields, 
					},
				    mappings: [
			        	{key: "projectId",
						collection: Projects,
				        mappings: [
				        	{key: 'toolId',
				        	collection: Tools,
				        	fileter: {}
				        	}
				        ]}
				    ]
				});
	}
	else {
		not_loggedin_msg();
		return this.stop();
	}
});

Meteor.publish("Notifications", function(list) {
	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var user_id = this.userId;
	if (user_id) {

		var limit = {sort: {createdAt: -1}};
		//var limit = {};
		//if (list["limit"])
		//	limit["limit"] = list["limit"];

		return 	Meteor.publishWithRelations({
					handle: this,
					collection: Notifications,
					filter: {receiver: user_id},
					options: {
						sort: {createdAt: -1},
						//limit: limit,
					},
					mappings: [
						{key: 'createdBy',
			        	collection: Meteor.users,

			        	mappings: [
							{reverse: true,
				        	key: 'systemId',
				        	collection: Users,
			        		}
			        	]
				        },

						{key: 'projectId',
			        	collection: Projects,
				        },
				    ]
				});
	}
	else {
		not_loggedin_msg();
		return this.stop();
	}
});

Meteor.publish("Chats_Authors", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var system_id = this.userId;
	if (system_id) {

			return	Meteor.publishWithRelations({
						handle: this,
						collection: UserChatsAuthors,
						filter: {userSystemId: system_id},
						mappings: [
							{
				        	key: "userSystemId",
				        	collection: Meteor.users,
				        	mappings: [
								{
					        	reverse: true,
					        	key: 'systemId',
					        	collection: Users,
					        	options: get_user_query_limit(),
					        	},
				        	]
					        },
						]
			    	});
	}
	else {
		not_loggedin_msg();
		return this.stop();
	}	
});


Meteor.publish("Chats", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	var system_id = this.userId;
	if (system_id) {

		//selects chats that have more then one message
		var query = {};

		var msg_count = 0;

		//if the query is for unseen mesages in the navbar
		if (list["unseen"])
			query["seen"] = {$ne: system_id};

		//if the specific user's chats are searched
		if (list["userId"]) {
			query["$and"] = [{users: system_id}, {users: list["userId"]}];
		}
		//if no specific user is specified, selects the user's chats
		else {
			query["users"] = system_id;
		}

		build_chats_query_by_phrase(query, list)

		//removes unnecessary chat fields
		var limit = {};
		limit["fields"] = {authorId: 0, createdAt: 0, messageCount: 0, messagesLC: 0};

		//returns the last message of the chat
		var msg_options = {
						sort: {date: -1},
						limit: 1,
					};

		//if the chat id is specified, then selects the specified chat and all its messages	
		if (list["chatId"]) {
			query["_id"] = list["chatId"];
			msg_options = {sort: {date: -1}};
			msg_count = -1;
			limit["fields"]["lastMessage"] = 0;	
		}

		//if there is not specified one chat, then selects chats for the specified chats page
		if (list["page"] && list["step"]) {
			var step = Number(list["step"]);
			var page = Number(list["page"]);
			
			limit["sort"] = {lastModified: -1};
			limit["skip"] = (page - 1) * step;
			limit["limit"] = step;
			limit["fields"]["messages"] = 0;
		}

		//sets the minimum message count
		query["messageCount"] = {$gt: msg_count};

		return 	Meteor.publishWithRelations({
					handle: this,
					collection: Chats,
					filter: query,
					options: limit,
					mappings: [
						{collection: Meteor.users,
						key: "users",

			        	mappings: [{
			        		reverse: true,
				        	key: 'systemId',
				        	collection: Users,
				        	options: get_maximal_user_query_limit(),
				        	},
				       	],
				       	},
					],
		    	});
	}
	else {
		not_loggedin_msg();
		return this.stop();
	}
});

//returns the latest chat's time, to be able to sort chats in the page
Meteor.publish("maxChatDatePerPage", function (list) {

	var system_id = this.userId;
	if (system_id) {

		var self = this;
		var count = 0;
		var initializing = true;

		if (list["page"] && list["step"]) {
			var step = Number(list["step"]);
			var page = Number(list["page"]);
			
			limit = {sort: {lastModified: -1}};
			var skip = (page - 1) * step;
			var limit = step;

			var max_date;
			var list = [];
			var id_date_map = {};

			var query = build_chats_query(system_id, list);

			var chats = Chats.find(query,
									{sort: {lastModified: -1},
									skip: skip,
									limit: step});

			var handle = chats.observeChanges({
				added: function (id, obj) {

					var date = obj["lastModified"];
					list.push(date);
					id_date_map[id] = date;
					if (!initializing) {
						list.sort(function(a, b) {return b-a});
						self.changed("ChatsSettings", system_id,
												{maxDate: list[0]});
					}
				},
				removed: function (id) {

					var date = id_date_map[id];
					remove_date(date);
					delete id_date_map[id];
					list.sort(function(a, b) {return b-a});
					self.changed("ChatsSettings", system_id, 
												{maxDate: list[0]});
				},

				changed: function(id, obj) {
					
					var date = id_date_map[id];

					remove_date(date);

					var new_date = obj["lastModified"];

					list.push(new_date);
					id_date_map[id] = new_date;

					if (!initializing) {
						list.sort(function(a, b) {return b-a});
						self.changed("ChatsSettings", system_id, 
														{maxDate: list[0]});
					}
				},

				// addedAt: function(doc, atIndex, before) {

				// 	console.log("add at ", atIndex)
				// 	console.log("before ", before)
				// 	if (atIndex == 0)
				// 		self.changed("ChatsSettings", system_id, {maxDate: doc["lastModified"]});
				// },

				// changedAt: function(new_doc, old_doc, atIndex) {

				// 	console.log("changed at ", atIndex)
				// 	if (atIndex == 0)
				// 		self.changed("ChatsSettings", system_id, {maxDate: new_doc["lastModified"]});
				// },

				// removedAt: function(doc, atIndex) {


				// 	console.log("removed at chats  ", atIndex)
				// 	console.log("removed doc ", doc)


				// },

				// movedTo: function(doc, fromIndex, toIndex, before) {
				// 	console.log("moved to ", doc)

				// 	if (toIndex == 0)
				// 		self.changed("ChatsSettings", system_id, {maxDate: doc["lastModified"]});
				// },

			});

			initializing = false;

			self.added("ChatsSettings", system_id, {maxDate: list[0]});
			self.ready();

			self.onStop(function () {
				handle.stop();
			});

			function remove_date(date) {
				if (!date)
					return;
				else {
					date.getTime();
					list = _.map(list, function(i) {
											if (i.getTime() == date)
												return new Date(0);
											else
												return i;
					});
				}
			}

		}
	}
});

// server: publish the current size of a collection
Meteor.publish("chatMessageCount", function (list) {

	var system_id = this.userId;
	if (system_id) {

		var self = this;
		var count = 0;
		var initializing = true;

		var query = build_chats_query(system_id, list);

		var handle = Chats.find(query).observeChanges({
			added: function (id) {

				count++;
				if (!initializing)
					self.changed("ChatsSettings", system_id, {count: count});

			},
			removed: function (ids) {
				count--;
				self.changed("ChatsSettings", system_id, {count: count});
			}
			// don't care about changed
		});

		initializing = false;
		self.added("ChatsSettings", system_id, {count: count});
		self.ready();

		self.onStop(function () {
			handle.stop();
		});
	}
});

Meteor.publish("Contacts_Users", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var system_id = this.userId;
	if (system_id) {

		return 	Meteor.publishWithRelations({
					handle: this,
					collection: Contacts,
					filter: {userSystemId: system_id},
					mappings: [
						{collection: Meteor.users,
						key: "contactId",

			        	mappings: [{
			        		reverse: true,
				        	key: 'systemId',
				        	collection: Users,
				        	options: get_maximal_user_query_limit(),
				        	},
				        ],
				        },
					]
		    	});
	}
	else {
		not_loggedin_msg();
		return this.stop();
	}	
});


Meteor.publish("SearchNewContacts", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var system_id = this.userId;
	if (system_id) {

		if (list["phrase"] && list["phrase"] != "") {
			var query = build_user_search_query(list["phrase"]);
			var limit = get_user_query_limit();

			return Users.find(query, limit);
		}
		else
			return this.stop();
	}
	else {
		error_msg();
		return this.stop();
	}
});

Meteor.publish("ContactsSuggestions", function(list) {

	if (!list || list["noQuery"])
		return this.stop();

	//gets user's id
	var system_id = this.userId;
	if (system_id) {

		if (list["text"] && list["text"] != "") {
			var query = {type: "Users", phrase: {$regex: "^" + list["text"].toLowerCase()}};
			query["users." + system_id] = {$exists: true};

			//sorting by the count the user seached the phrase
			var user_count = {};
			user_count["users." + system_id] = -1;

			return Searches.find(query, {sort: user_count, limit: 10});
		}
		//if there is no text or the text is empty string
		else
			return this.stop();
	}
	else {
		error_msg();
		return this.stop();
	}
});


//the search by phrase in chats is NOT REACTIVE and NOT EFFECTIVE
function build_chats_query_by_phrase(query, list) {

	if (list["phrase"] && !list["userId"]) {

		//selects the chat id's that contain the message having the searched phrase
		var chat_ids = Chats.find({messagesLC: {'$regex': ".*" + list["phrase"].toLowerCase() + ".*"}}).map(
								function(chat) {return chat["_id"]});

		//adding found chat ids to the query
		query["_id"] = {$in: chat_ids};
	}
}

function build_chats_query(system_id, list) {

	var query = {messageCount: {$gt: 0}};

	//if the specific user's chats are searched
	if (list["userId"]) {
		query["$and"] = [{users: system_id}, {users: list["userId"]}];
	}
	//if no specific user is specified, selects the user's chats
	else {
		query["users"] = system_id;
	}

	build_chats_query_by_phrase(query, list);

	return query;
}

function user_limit() {
	return {fields: {date: 0, nameLC: 0, surnameLC: 0,
					loginFails: 0, loginFailsCount: 0, logins: 0}};
}

