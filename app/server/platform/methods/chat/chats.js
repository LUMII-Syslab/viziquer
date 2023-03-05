import { Chats, Contacts } from '/libs/platform/collections'

Meteor.methods({

	insertChat: function(list) {
		var user_id = Meteor.userId();
		if (user_id) {

			var date = new Date();

			list["createdAt"] = date;
			list["lastModified"] = date;
			list["messageCount"] = 0;
			list["seen"] = [user_id];
			list["messages"] = [];
			list["messagesLC"] = [];
      		list["authorId"] = user_id;

      		var id = Chats.insert(list);
			return id;
		}
	},

	updateChat: function(list) {
		var user_id = Meteor.userId();
		if (user_id) {
			Chats.update({_id: list["chatId"], users: user_id}, list["update"]);			
		}
	},

	addChatMessage: function(list) {
		var user_id = Meteor.userId();
		if (user_id) {

			var date = new Date();
			var msg_val = list["message"];

			if (msg_val) {

				Chats.update({_id: list["chatId"]},
							{$set: {lastModified: date,
									seen: [user_id],
									lastMessage: msg_val,
									lastAuthorId: user_id
									},
							$inc: {messageCount: 1},	
							$push: {messages: {sender: user_id,
												date: date,
												message: msg_val,
											},
									messagesLC: msg_val.toLowerCase()}
							});
			}
		}
	},

	//this function remove multiple chats at once
	deleteChats: function(list) {

		var user_id = Meteor.userId();
		if (user_id) {
			Chats.remove({_id: {$in: list["chatIds"]}, users: user_id});
		}
		else {
			user_not_logged_in();
		}
	},

	insertContact: function(list) {
		var user_id = Meteor.userId();
		if (user_id) {
			list["userSystemId"] = user_id;
			Contacts.insert(list);
		}
	},

	removeContact: function(list) {
		var user_id = Meteor.userId();
		if (user_id) {
			Contacts.remove({_id: list["id"], userSystemId: user_id});
		}
	},

	insertUserChatAuthor: function(list) {


	},

	updateUserChatAuthor: function(list) {


	},

	removeUserChatAuthor: function(list) {


	},

});

