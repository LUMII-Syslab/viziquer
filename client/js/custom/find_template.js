Template.findResult.helpers({

	json1: function() {
      return JSON.stringify(Session.get("json"), null, 2);

	},

	json2: function() {
		return Session.get("json");
	},
	json2_count: function() { // helpers skaitam
		var objects = Session.get("json");
		return objects.length; // atgriežam masīva lielumu, kas atbilst atrasto diagramu skaitam
		},

	diagramCount: function()
	{
		return Session.get("json").length;
	},

	Potential: function() {
		return Session.get("PotentialResults");
	},

	ViolatedConstiants: function() {
		return Session.get("ViolatedConstiants");
	},
	queryDiagData: function() {
        return Session.get("QueryDiagData");
    },
    notQueryDiagram: function() {
        const queryDiagData = Session.get("QueryDiagData");
        return queryDiagData.diagramId != Session.get("activeDiagram");
    }
});

Template.findResult.events({
	'click .delete': function(e) {            
				var list = {compartmentId: this.compartmentId,
					  diagramId: Session.get("activeDiagram"),
					   projectId: Session.get("activeProject"), 
					   versionId: Session.get("versionId")}
				Utilities.callMeteorMethod("RemoveConstraintAndFind", list, function(resp) {
							  Session.set("json", resp.result);
							  Session.set("PotentialResults", resp.potentialDiagIds);
							  Session.set("ViolatedConstiants", resp.violatedConstraints);
				}); 
			},
	'click #clearResults' : function() {
				// clear all tables and messages
				Session.set('json', [] );
				Session.set("PotentialResults", []);
				Session.set('ViolatedConstiants', []);
			},
	})
