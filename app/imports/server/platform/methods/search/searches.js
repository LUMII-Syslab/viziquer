import { is_project_member } from '/imports/libs/platform/user_rights'
import { Searches } from '/imports/db/platform/collections'
import { error_msg } from '../../_global_functions';


Meteor.methods({

	//saves searched phrases for documents, diagrams and users
	searchInProject: async function(list) {

		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			if (list["phrase"] && list["phrase"] != "") {

				var update = {};
				update["counter"] = 1;
				update["users." + user_id] = 1;
				if (list["versionId"])
					update["versions." + list["versionId"]] = 1;

				if (list["projectId"])
					update["projects." + list["projectId"]] = 1;

				await Searches.updateAsync({type: list["type"],
								phrase: list["phrase"].toLowerCase()},
							{$inc: update}, {upsert: true});
			}
		}
		else
			error_msg();	
	},

	searchInChats: async function(list) {

		var user_id = Meteor.userId();
		if (user_id) {
			var type = "Chats";

			//if user was searched, then does not save anything
			if (list["userId"])
				return;

			if (list["phrase"] && list["phrase"] != "") {

				await Searches.updateAsync({type: type,
							userSystemId: user_id,
							phrase: list["phrase"].toLowerCase()},
							{$inc: {counter: 1}}, {upsert: true});
			}
			else
				error_msg();
		}
		else
			error_msg();
	},

	searchInContacts: async function(list) {

		var user_id = Meteor.userId();
		if (user_id) {

			if (list["phrase"] && list["phrase"] != "") {
				var update = {};
				update["counter"] = 1;
				update["users." + user_id] = 1;

				await Searches.updateAsync({type: list["type"],
								phrase: list["phrase"].toLowerCase(),},
								{$inc: update}, {upsert: true});
			}
			else
				error_msg();
		}
		else
			error_msg();
	},
});
