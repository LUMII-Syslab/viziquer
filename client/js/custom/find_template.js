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

	ViolatedConstiants: function() {
		console.log(Session.get("ViolatedConstiants"))
		return Session.get("ViolatedConstiants");
	},
});

Template.findResult.events({
	'click .delete': function(e) {            
				console.log("Click delete", this);
				var list = {compartmentId: this.compartmentId,
					  diagramId: Session.get("activeDiagram"),
					   projectId: Session.get("activeProject"), 
					   versionId: Session.get("versionId")}
				Utilities.callMeteorMethod("RemoveConstraintAndFind", list, function(resp) {
							  Session.set("json", resp.result);
							  Session.set("PotentialResults", resp.potentialDiagIds);
							  Session.set("ViolatedConstiants", resp.violatedConstraints);
				}); 

			//	Compartments.remove(this.compartmentId);
		
				}
	})
