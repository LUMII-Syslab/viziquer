Template.AddMergeValues.expression = new ReactiveVar("");
Template.AddMergeValues.alias = new ReactiveVar("");
Template.AddMergeValues.cardinality = new ReactiveVar(-1);
Template.AddMergeValues.aggregation = new ReactiveVar("count");
Template.AddMergeValues.expressionField = new ReactiveVar("");

Interpreter.customMethods({
	AddMergeValues: function (e) {
		var expressionField = getExpression(e);
		var parsedExpression = parsedExpressionField(expressionField.val());
		var expr = parsedExpression["expression"];
		var aggregation = parsedExpression["aggregation"];
		Template.AddMergeValues.expression.set(expr);
		Template.AddMergeValues.alias.set(getAlais(e).val());
		Template.AddMergeValues.aggregation.set(aggregation);
		Template.AddMergeValues.cardinality.set(countCardinality(expr));
		Template.AddMergeValues.expressionField.set(expressionField);

		if(expr != null && expr != "")$("#merge-values-form").modal("show");
		else Interpreter.showErrorMsg("Please specify expression", -3);
	}
})



Template.AddMergeValues.helpers({

	isMultiple: function() {
		var cardinality = Template.AddMergeValues.cardinality.get();
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
		return Template.AddMergeValues.expression.get();
	},

	selectedCount: function() {
		if(Template.AddMergeValues.aggregation.get() == "count") return "selected";
		return "";
	},

	selectedDistinct: function() {
		if(Template.AddMergeValues.aggregation.get() == "count_distinct") return "selected";
		return "";
	},

	selectedSum: function() {
		if(Template.AddMergeValues.aggregation.get() == "sum") return "selected";
		return "";
	},

	selectedAvg: function() {
		if(Template.AddMergeValues.aggregation.get() == "avg") return "selected";
		return "";
	},

	selectedMax: function() {
		if(Template.AddMergeValues.aggregation.get() == "max") return "selected";
		return "";
	},

	selectedMin: function() {
		if(Template.AddMergeValues.aggregation.get() == "min") return "selected";
		return "";
	},

	selectedSample: function() {
		if(Template.AddMergeValues.aggregation.get() == "sample") return "selected";
		return "";
	},

	selectedConcat: function() {
		if(Template.AddMergeValues.aggregation.get() == "concat") return "selected";
		return "";
	},
});


Template.AddMergeValues.events({

	"click #ok-merge-values": function(e) {

		var mergeType = $('input[name=type-radio-merge]:checked').val();

		var alias = Template.AddMergeValues.alias.get();
		var expr = $('input[name=expression-merge]').val();
		var aggregation = $('option[name=function-name-merge]:selected').val();
		expr = aggregation + "(" + expr + ")";

		if((typeof mergeType !== 'undefined' && mergeType == "MULTIPLE") || typeof mergeType === 'undefined'){
			var selected_elem_id = Session.get("activeElement");
			if (Elements.findOne({_id: selected_elem_id})){
				var vq_obj = new VQ_Element(selected_elem_id);
				vq_obj.addAggregateField(expr,alias);
				/*TODO close Attributes form, remove attribute if existed*/
			};
		} else {
			Template.AddMergeValues.expressionField.get().val(expr);
		}
		clearMergeValuesInput();
		return;

	},

	"click #cancel-add-link": function() {
		clearMergeValuesInput();
	},

});

function parsedExpressionField(expression){
	if(expression.indexOf("(") != -1 && expression.endsWith(")") == true ){
		var aggregation = expression.substring(0, expression.indexOf("("));
		var aggregationList = ["count", "count_distinct", "sum", "avg", "max", "min", "sample", "concat"];
		if(aggregationList.indexOf(aggregation.toLowerCase()) != -1) return {expression:expression.substring(expression.indexOf("(")+1, expression.length-1), aggregation:aggregation.toLowerCase()}
	}
	return {expression:expression, aggregation:""}
}

function clearMergeValuesInput(){
	var defaultFunctions = document.getElementsByName("function-name-merge");
	_.each(defaultFunctions, function(e){
		if (e.value == "count") e.selected = true;
		else e.selected = false;
	});

	var defaultRadio = document.getElementsByName("type-radio-merge");
	_.each(defaultRadio, function(e){
		if (e.value == "SINGLE") e.checked = true;
		else e.checked = false;
	});

}

function getExpression(e){
	return getField(e, "Expression");
}

function getAlais(e){
	return getField(e, "Field Name");
}

function getField(e, fieldName){

		var parent = $(e.target).closest(".compart-type");
		var parent_id = parent.attr("id");
		var compart_type = CompartmentTypes.findOne({_id: parent_id});

		// more elegant selection for subCompartmentTypes needed
		var expression_compart_type = _.find(compart_type.subCompartmentTypes[0].subCompartmentTypes, function(sub_compart_type) {
											return sub_compart_type.name == fieldName;
										});

		var exression_id = expression_compart_type._id

		var expression_value = parent.find("." + exression_id).val();

		return parent.find("." + exression_id);
}
