import { Services } from '../../../db/platform/collections.js'
// import { is_project_member, is_system_admin } from '../../../libs/platform/user_rights.js'

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
