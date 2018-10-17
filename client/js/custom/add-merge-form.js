Interpreter.customMethods({
	AddMergeValues: function (e) {
		$("#merge-values-form").modal("show");
	}
})


Template.AddMergeValues.helpers({

	isMultiple: function() {

		var cardinality = countCardinality("takes.courseName");
		// var cardinality = countCardinality("studentName");
		if(cardinality == -1) return true;
		return false;
	},

	className: function() {
		var act_elem = Session.get("activeElement");
		var act_el = Elements.findOne({_id: act_elem}); //Check if element ID is valid

		if(typeof act_el !== 'undefined'){
			var compart_type = CompartmentTypes.findOne({name: "Name", elementTypeId: act_el["elementTypeId"]});
			var compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: act_elem});	
			return compart["input"];
		}
		return "";
	},
	
	expression: function() {
		return "takes.courseName";
	},


});


Template.AddMergeValues.events({
	
	"click #ok-merge-values": function(e) {

		
		return;

	},

});
