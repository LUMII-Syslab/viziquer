import { Utilities } from '../../../../platform/client/js/utilities/utils.js'

import './dump.html'

Template.dump.helpers({

	json: function() {

		var list = {toolId: Session.get("toolId"),};
		Utilities.callMeteorMethod("exportToolConfiguration", list, function(resp) {
			Session.set("json", resp);
		});

		return Session.get("json");
	},

});
