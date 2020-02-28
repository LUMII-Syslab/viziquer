Template.findResult.helpers({

	json1: function() {
      return JSON.stringify(Session.get("json"), null, 2);

	},

	json2: function() {
		console.log(Session.get("json"))
		return Session.get("json");
	},

	Potential: function() {
		console.log(Session.get("PotentialResults"))
		return Session.get("PotentialResults");
	},
});
