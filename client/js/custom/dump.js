
Template.dump.helpers({

	json: function() {

		var list = {toolId: Session.get("toolId"),};
		Utilities.callMeteorMethod("exportToolConfiguration", list, function(resp) {
			Session.set("json", resp);
		});

		return Session.get("json");
	},

});
