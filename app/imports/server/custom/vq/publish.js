import { Services } from '/imports/db/custom/vq/collections'
import { is_project_member, is_system_admin } from '/imports/libs/platform/user_rights'

Meteor.publish("Services", function(list) {
	if (!list || list["noQuery"]) {
		return this.stop();
	}

	//if (is_project_member(this.userId, list)) { //console.log(Services.find().count()); console.log(Services.findOne({toolId: list.toolId }));
		return [
				Services.find(),//Services.find({toolId: list.toolId }),
			];
	//}
	//else {
		//error_msg();
	//	return this.stop();
	//}
});
