import { Utilities } from '/imports/client/platform/js/utilities/utils'

import './dump.html'

Template.dump.helpers({

	json: async function() {

		var list = {toolId: Session.get("toolId"),};
		let resp = await Utilities.callMeteorMethodAsync("exportToolConfiguration", list);
			Session.set("json", resp);
	

		return Session.get("json");
	},

});
