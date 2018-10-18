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
			if(typeof compart !== 'undefined') return compart["input"];
		}
		return "";
	},
	
	expression: function() {
		return "takes.courseName";
	},


});


Template.AddMergeValues.events({
	
	"click #ok-merge-values": function(e) {

		var mergeType = $('input[name=type-radio-merge]:checked').val();	

		if((typeof mergeType !== 'undefined' && mergeType == "MULTIPLE") || typeof mergeType === 'undefined'){
			// var selected_elem_id = Session.get("activeElement");
			// if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
				// var vq_obj = new VQ_Element(selected_elem_id);
				// var alias = "alias";//$('#aggregate-alias').val();
				// var expr =	"expr";// $('#aggregate-expression').val();
				// var aggregation = $('option[name=function-name-merge]:selected').val();
				// expr = aggregation + "(" + expr + ")";
			    // vq_obj.addAggregateField(expr,alias);
				/*TODO close Attributes form, remove attribute if existed*/
			// };
		} else {
			
		}
		return;

	},

});

function parsExpressionField(expression){
	if(expression.indexOf("(") != -1 && expression.endsWith(")") == true ){
		var aggregation = expression.substring(0, expression.indexOf("("));
		var aggregationList = ["count", "count_distinct", "sum", "avg", "max", "min", "sample", "concat"];
		if(aggregationList.indexOf(aggregation.toLowerCase()) != -1) return {expression:expression.substring(expression.indexOf("(")+1, expression.length-1), aggregation:aggregation.toLowerCase()}
	}
	return {expression:expression, aggregation:""}
}