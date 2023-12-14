import { is_system_admin } from '/libs/platform/user_rights'
import { DocumentTypes } from '/libs/platform/collections'

Meteor.methods({

	addDocumentType: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {
			DocumentTypes.insert({
								createdAt: new Date(),
								createdBy: user_id,
								name: list["name"],
								toolId: list["toolId"],
								versionId: list["versionId"],
								index: list["index"],
							});
		}
	},

	updateDocumentType: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {
			DocumentTypes.update({_id: list["id"],
									toolId: list["toolId"],
									versionId: list["versionId"],
								},{$set: {name: list["name"]}});
		}
	},

	updateDocumentTypeIndex: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {

			var prev_index = list["prevIndex"];
			var current_index = list["currentIndex"];
			var doc_type_id = list["documentTypeId"];
			var query = {toolId: list["toolId"], versionId: list["versionId"]};

        	if (prev_index < current_index) {
	       		DocumentTypes.update({$and: [{index: {$gt: prev_index}},
    										{_id: {$ne: doc_type_id}}, query]},
    								{$inc: {index: current_index}}, {multi: true});
        	}
        	else {
        		DocumentTypes.update({$and: [query,
    										{$or: [{index: {$gt: prev_index}},
    												{_id: doc_type_id}]}
    										]},
    								{$inc: {index: prev_index}}, {multi: true});
        	}
		}
	},


	removeDocumentType: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {

			if (!list["id"])
				return;

			DocumentTypes.remove({_id: list["id"],
								toolId: list["toolId"], versionId: list["versionId"]});
		}
	},

});