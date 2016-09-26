
Meteor.methods({

	insertTab: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {
			DialogTabs.insert(list);
		}
	},

	updateTab: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {
			DialogTabs.update({_id: list["tabId"], toolId: list["toolId"]},
								{$set: {name: list["name"]}});
		}
	},

	removeTab: function(list) {
		var user_id = Meteor.userId();
		if (is_system_admin(user_id) && list) {

			if (!list["id"])
				return;

			DialogTabs.remove({_id: list["id"], toolId: list["toolId"]});
		}
	},
	
});

