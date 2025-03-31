import { is_project_version_admin, is_system_admin } from '/imports/libs/platform/user_rights'
import { Elements } from '/imports/db/platform/collections'
import { resize_element } from '/imports/server/platform/methods/diagrams/elements';

Meteor.methods({

	changeColor : async function(list) {
		var user_id = Meteor.userId();
		if (list["projectId"]) {
			if (is_project_version_admin(user_id, list)) {
				//var query = {projectId: list["projectId"], versionId: list["versionId"]};
				//resize_element(list, query, user_id);
				
				console.log("change color called ", list);
			
				var update = {};
				update["style.elementStyle.fill"] = "orange";
				
				console.log("update color ", update)
				
				Elements.update({_id: list["elementId"], projectId: list["projectId"]},
									{$set: update});
			}
		}
		else if (await is_system_admin(user_id, list)) {
			var query = {toolId: list["toolId"], versionId: list["versionId"]};
			resize_element(list, query, user_id);
		}
	}

});
