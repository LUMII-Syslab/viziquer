
Template.SPARQL.helpers({

	text: function() {
		var arr = Session.get("SPARQL");
		if (arr) {
			// return arr.join("\n");
			return arr;
		}
	},
	

});


Template.SPARQL.events({



});






