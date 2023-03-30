import { Interpreter } from '/client/lib/interpreter'
import { Elements, Compartments, CompartmentTypes, Projects } from '/libs/platform/collections'

Template.AddMergeValues.expression = new ReactiveVar("");
Template.AddMergeValues.aliasField = new ReactiveVar("");
Template.AddMergeValues.mergeAlias = new ReactiveVar("");
Template.AddMergeValues.cardinality = new ReactiveVar(-1);
Template.AddMergeValues.aggregation = new ReactiveVar("count");
Template.AddMergeValues.distinct = new ReactiveVar("");
Template.AddMergeValues.require = new ReactiveVar("");
Template.AddMergeValues.expressionField = new ReactiveVar("");
Template.AddMergeValues.requireField = new ReactiveVar("");
Template.AddMergeValues.e = new ReactiveVar("");
Template.AddMergeValues.attribute = new ReactiveVar("");
Template.AddMergeValues.isNotRootClass = new ReactiveVar(false);

Interpreter.customMethods({
	AddMergeValues: function (e) {
		
		var expressionField = getExpression(e);
		var requireField = getRequireField(e);//require
		if(requireField[0].checked) Template.AddMergeValues.require.set("checked");
		else Template.AddMergeValues.require.set("");

		var parsedExpression = parsedExpressionField(expressionField.val());
		var expr = parsedExpression["expression"];
		var aggregation = parsedExpression["aggregation"];
		var distinct = parsedExpression["distinct"];
		
		Template.AddMergeValues.expression.set(expr);
		var mergeAlias = getAlais(e).val();
		if(mergeAlias == null || mergeAlias == "") mergeAlias = expr.substring(0,1).toUpperCase();
		Template.AddMergeValues.mergeAlias.set(mergeAlias);
		Template.AddMergeValues.aliasField.set(getAlais(e));
		Template.AddMergeValues.attribute.set(e);
		if(aggregation != null && aggregation != "")Template.AddMergeValues.aggregation.set(aggregation);
		Template.AddMergeValues.distinct.set(distinct);
		
		var card = countCardinality(expr, Session.get("activeElement"))
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj){
      		if (typeof proj.showCardinalities ==='undefined' || proj.showCardinalities!=true){
      			card = -1;
      		}
      	} else card = -1;
		
		if(card == -1)document.getElementById("merge-values-wizard-id").style.display = "none";
		
		
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){
			var vq_obj = new VQ_Element(selected_elem_id);

			var parentClass;
			var links = vq_obj.getLinks();
			for(let key in links) {
				if(typeof links[key] !== "function"){
					if(links[key].link.getRootDirection() == "start" && links[key].link.obj.startElement != selected_elem_id) {
						parentClass = new VQ_Element(links[key].link.obj.startElement);
						links[key].link.setNestingType("SUBQUERY");
					}
					if(links[key].link.getRootDirection() == "end" && links[key].link.obj.endElement != selected_elem_id) {
						parentClass = new VQ_Element(links[key].link.obj.endElement);
						links[key].link.setNestingType("SUBQUERY");
					}
				}
			}
			if(typeof parentClass !== 'undefined')Template.AddMergeValues.isNotRootClass.set(true);
		};
		
		
		
		Template.AddMergeValues.cardinality.set(card);
		Template.AddMergeValues.expressionField.set(expressionField);
		Template.AddMergeValues.requireField.set(requireField);
		
		//Template.AddMergeValues.hideField.set(hideField);
		Template.AddMergeValues.e.set(e.target.parentElement.parentElement.parentElement.parentElement);

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
	
	mergeAlias: function() {
		return Template.AddMergeValues.mergeAlias.get();
	},
	
	distinct: function() {
		return Template.AddMergeValues.distinct.get();
	},
	
	require: function() {
		return Template.AddMergeValues.require.get();
	},
	
	isNotRootClass: function() {
		return Template.AddMergeValues.isNotRootClass.get();
	},

	selectedCount: function() {
		if(Template.AddMergeValues.aggregation.get() == "count") return "checked";
		return "";
	},

	selectedDistinct: function() {
		if(Template.AddMergeValues.aggregation.get() == "count_distinct") return "checked";
		return "";
	},

	selectedSum: function() {
		if(Template.AddMergeValues.aggregation.get() == "sum") return "checked";
		return "";
	},

	selectedAvg: function() {
		if(Template.AddMergeValues.aggregation.get() == "avg") return "checked";
		return "";
	},

	selectedMax: function() {
		if(Template.AddMergeValues.aggregation.get() == "max") return "checked";
		return "";
	},

	selectedMin: function() {
		if(Template.AddMergeValues.aggregation.get() == "min") return "checked";
		return "";
	},

	selectedSample: function() {
		if(Template.AddMergeValues.aggregation.get() == "sample") return "checked";
		return "";
	},

	selectedConcat: function() {
		if(Template.AddMergeValues.aggregation.get() == "group_concat") return "checked";
		return "";
	},
});


Template.AddMergeValues.events({

	"click #ok-merge-values": function(e) {
		var mergeType = $('input[name=type-radio-merge]:checked').val();

		// var alias = Template.AddMergeValues.alias.get();
		var expr = $('input[name=expression-merge]').val();
		// var aggregation = $('option[name=function-name-merge]:selected').val();
		var aggregation = $('input[name=radio-function]:checked').val();

		var diaplay = $('input[id=distinct-merge-check-box]:checked').val();	
		if(typeof diaplay !== "undefined" && diaplay == "on") diaplay = "DISTINCT ";
		else diaplay = "";
		
		expr = aggregation + "("+diaplay + expr + ")";
		var mergeAliasName = $('input[id=merge-alias-name]').val();
		
		if((typeof mergeType !== 'undefined' && mergeType == "MULTIPLE") || typeof mergeType === 'undefined'){
			var selected_elem_id = Session.get("activeElement");
			if (Elements.findOne({_id: selected_elem_id})){
				var vq_obj = new VQ_Element(selected_elem_id);

				var parentClass;
				var links = vq_obj.getLinks();
				for(let key in links) {
					if(typeof links[key] !== "function"){
						if(links[key].link.getRootDirection() == "start" && links[key].link.obj.startElement != selected_elem_id) {
							parentClass = new VQ_Element(links[key].link.obj.startElement);
							links[key].link.setNestingType("SUBQUERY");
						}
						if(links[key].link.getRootDirection() == "end" && links[key].link.obj.endElement != selected_elem_id) {
							parentClass = new VQ_Element(links[key].link.obj.endElement);
							links[key].link.setNestingType("SUBQUERY");
						}
					}
				}
				
				if(typeof parentClass !== 'undefined'){
					
					var displayCase = document.getElementById("merge-display-results").checked;
					var minValue = $('input[id=merge-results-least]').val();
					var maxValue = $('input[id=merge-results-most]').val();
					
					if(displayCase) parentClass.addField(mergeAliasName,"",false,false,false);
					if (minValue != "") parentClass.addCondition(mergeAliasName + ">=" + minValue, false);
					if (maxValue != "") parentClass.addCondition(mergeAliasName + "<=" + maxValue, false);
					
					//if(alias != null && alias !="") expr =  aggregation + "(" + alias + ")";
				}
				
				var requireValues = $('input[id=require-merge-check-box]:checked').val();	
				if(typeof requireValues !== "undefined" && requireValues == "on") requireValues = true;
				else requireValues = false;

				vq_obj.addAggregateField(expr,mergeAliasName,requireValues);
				//Template.AddMergeValues.hideField.get().prop("checked", true);
				Template.AddMergeValues.expressionField.get().val("");
				Template.AddMergeValues.aliasField.get().val("");
				
				var list = {compartmentId: document.getElementById($(Template.AddMergeValues.attribute.get().target).closest(".multi-field").attr("id")).getAttribute("compartmentid"),
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

				Utilities.callMeteorMethod("removeCompartment", list);
				
				var form = $(Template.AddMergeValues.attribute.get().target).closest(".row-form")
				form.modal("hide");
			};
		} else {
			Template.AddMergeValues.expressionField.get().val(expr);
			var requireValues = $('input[id=require-merge-check-box]:checked').val();	
			if(typeof requireValues !== "undefined" && requireValues == "on") requireValues = true;
			else requireValues = false;
			Template.AddMergeValues.requireField.get()[0].checked = requireValues;
		}
		clearMergeValuesInput();
		return;

	},

	"click #cancel-merge-values": function() {
		clearMergeValuesInput();
		$(Template.AddMergeValues.e.get()).modal('toggle');
	},
	
	"change #merge-choice": function() {
		var checkedName = $('input[name=type-radio-merge]').filter(':checked').val();
        if (checkedName === 'SINGLE') {
           document.getElementById("merge-values-wizard-id").style.display = "none";
        } else {
           document.getElementById("merge-values-wizard-id").style.display = "inline-block";
        } 
	},
	
	"change #radio-function-form": function() {
		// var newFunction = $('option[name=function-name-merge]:selected').val();
		var newFunction = $('input[name=radio-function]:checked').val();

		if(newFunction == "count_distinct"){
			document.getElementById("distinct-merge").style.display = "none";
		} else {
			document.getElementById("distinct-merge").style.display = "inline-block";
		}
		
		//Set at least/at most
		if (newFunction == "count" || newFunction == "sum" || newFunction == "avg" || newFunction == "count_distinct"){
			$('input[id=merge-results-least]').attr('disabled', false);
			$('input[id=merge-results-most]').attr('disabled', false);
		} else {
			$('input[id=merge-results-least]').attr('disabled', true);
			$('input[id=merge-results-most]').attr('disabled', true);
		}
		return;
	},
	
	'click #extra-options-button-merge': function(e) {
		if(document.getElementById("extra-options-merge").style.display == "none") document.getElementById("extra-options-merge").style.display = "block";
		else document.getElementById("extra-options-merge").style.display = "none";
		return;
	},

});

function parsedExpressionField(expression){
	if(expression.indexOf("(") != -1 && expression.endsWith(")") == true ){
		var aggregation = expression.substring(0, expression.indexOf("("));
		var aggregationList = ["count", "count_distinct", "sum", "avg", "max", "min", "sample", "group_concat"];
		if(aggregationList.indexOf(aggregation.toLowerCase()) != -1) {
			var expression = expression.substring(expression.indexOf("(")+1, expression.length-1)
			var distinct = "";
			if(expression.toLowerCase().startsWith("distinct ")) {		
				distinct = "checked";
				expression = expression.substring(9, expression.length+1)
			}
			
			return {expression:expression, aggregation:aggregation.toLowerCase(), distinct:distinct}
		
		}
	}
	return {expression:expression, aggregation:""}
}

function clearMergeValuesInput(){
	var defaultFunctions = document.getElementsByName("radio-function");
	_.each(defaultFunctions, function(e){
		if (e.value == "count") e.checked = true;
		else e.checked = false;
	});

	var defaultRadio = document.getElementsByName("type-radio-merge");
	_.each(defaultRadio, function(e){
		if (e.value == "SINGLE") e.checked = true;
		else e.checked = false;
	});
	
	document.getElementById("merge-alias-name").value = Template.AddMergeValues.mergeAlias.get();
	document.getElementById("merge-display-results").checked = false;
	document.getElementById("require-merge-check-box").checked = false;
	document.getElementById("distinct-merge-check-box").checked = false;
	document.getElementById("merge-results-least").value = "";
	document.getElementById("merge-results-most").value = "";
	document.getElementById("extra-options-merge").style.display = "none";
}

function getExpression(e){
	return getField(e, "Expression");
}

function getAlais(e){
	return getField(e, "Field Name");
	
}

function getRequireField(e){
	return getField(e, "Require Values");
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
