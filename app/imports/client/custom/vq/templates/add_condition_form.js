import { Interpreter } from '/imports/client/lib/interpreter'
import { Elements, Compartments, CompartmentTypes} from '/imports/db/platform/collections'
import { process_sub_compart_types } from '/imports/client/platform/templates/diagrams/dialog/subCompartments'
import { Dialog } from '/imports/client/platform/js/interpretator/Dialog'

import { autoCompletionAddCondition, autoCompletionCleanup } from '/imports/client/custom/vq/js/autoCompletion.js'

import './add_condition_form.html'
import { VQ_Element, createVQ_Element } from '../js/VQ_Element'

Interpreter.customMethods({
	AddCondition: function () {
		
		autoCompletionCleanup()

		$("#add-condition-form").modal("show");
		$('#condition-expression').val('');
		//$('#aggregate-expression').val('');
	//	$('input[name=stack-checkbox-req]').attr('checked',false);
	}
})


Template.AddCondition.helpers({
	field_obj: async function() {
		var data_in = Template.currentData();
		if (!data_in) {
			return;
		}

		//var compart_type_id = $(this).$(".multi-field").attr("id");
		//var compart_type_id = Session.get("multiRowCompartmentTypeId");

		var compart_type_id = data_in["compartmentTypeId"];
		var compart = await Compartments.findOneAsync({_id: Session.get("multFieldCompartmentId")});

		var fields = [];

		var compart_type = await CompartmentTypes.findOneAsync({_id: compart_type_id});
		if (!compart_type) {
			return {fields: fields};
		}

		var sub_compartment;
		var compart_id;
		if (compart) {
			sub_compartment = compart["subCompartments"][compart_type["name"]];
			compart_id = compart["_id"];
		}

		process_sub_compart_types(compart_type["subCompartmentTypes"], fields, sub_compartment);

		var field_obj = {_id: compart_type["_id"],
						compartmentId: compart_id,
						name: compart_type["name"],
						label: compart_type["label"],
						fields: fields,
					};
		return field_obj;
	},
});


Template.AddCondition.events({

	"click #ok-add-condition": async function(e) {		
		var selected_elem_id = Session.get("activeElement");
		var elem = document.getElementById("add-condition-form");
		var act_el = await Elements.findOneAsync({_id: selected_elem_id}); 
		if(elem.getAttribute("compartmentId") === null){
			if (await Elements.findOneAsync({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
			//Read user's choise
			  var vq_obj = await createVQ_Element(selected_elem_id);
				let condition = $('#condition-expression').val();
				if(condition != ""){
					let allowMultiplication = $('input[id=allow-multiplication-check-box]:checked').val();
					if(typeof allowMultiplication !== "undefined" && allowMultiplication == "on") allowMultiplication = true;
					else allowMultiplication = false;
					await vq_obj.addCondition(condition, allowMultiplication);
				}
			};
		} else {
			var compart_type = await CompartmentTypes.findOneAsync({name: "Conditions", elementTypeId: act_el["elementTypeId"]});
			var compart = await Compartments.findOneAsync({compartmentTypeId: compart_type["_id"], elementId: selected_elem_id});
			if(typeof compart !== "undefined"){
				let condition = $('#condition-expression').val();
				if(condition != ""){
					var fullText = condition;
					let allowMultiplication = $('input[id=allow-multiplication-check-box]:checked').val();
					var allowMultiplicationInput = "";
					
					if(typeof allowMultiplication !== "undefined" && allowMultiplication == "on") {
						allowMultiplication = "true";
						// allowMultiplicationInput = "\u269F ";
						// allowMultiplicationInput = "\u20AD ";
						// allowMultiplicationInput = "\u2630 ";
						// allowMultiplicationInput = "\uD83D\uDF57 ";
						// allowMultiplicationInput = "\u21DA ";
						// allowMultiplicationInput = "\u26A0 ";
						// allowMultiplicationInput = "\u272A ";
						// allowMultiplicationInput = "\u2731 ";
						// allowMultiplicationInput = "\u274B ";
						// allowMultiplicationInput = "\u22D4 ";
						// allowMultiplicationInput = "\uf070 ";
						allowMultiplicationInput = "* ";
						fullText = allowMultiplicationInput + fullText;
					}
					else allowMultiplication = "false";
					
					// fullText = "\uD83D\uDD05 " + fullText;
					let prefix = compart_type["prefix"] || "";
					let sufix = compart_type["sufix"] || "";
					fullText = prefix + fullText + sufix;
					compart.subCompartments.Conditions.Conditions["Allow result multiplication"].input = allowMultiplication;
					compart.subCompartments.Conditions.Conditions["Allow result multiplication"].value = allowMultiplicationInput;
					compart.subCompartments.Conditions.Conditions.Expression.value = condition;
					compart.subCompartments.Conditions.Conditions.Expression.input = condition;
					Dialog.updateCompartmentValue(compart_type, selected_elem_id, condition, fullText, elem.getAttribute("compartmentId"), null, null, compart.subCompartments);
				}
			}
		}
		
		document.getElementById("condition-extra-options").style.display = "none";
		// document.getElementById("condition-expression").value = "";
		// document.getElementById("allow-multiplication-check-box").checked=false;
		
		// $("#condition-expression").val("");

		return;

	},
	
	"click #cancel-add-condition": function(e) {
		document.getElementById("condition-extra-options").style.display = "none";

		// $("#condition-expression").val("");

		// document.getElementById("condition-expression").value = "";
		// document.getElementById("allow-multiplication-check-box").checked=false;
		return;
	},

	"keydown #condition-expression": function(e) {
		autoCompletionAddCondition(e);
		return;
	},

	"shown.bs.modal #add-condition-form": function(e) {
		$('#condition-expression').focus();
	},

	"hidden.bs.modal #add-condition-form": function(e) {
		autoCompletionCleanup();
	},
	
	'click #extra-options-attribute-button': function(e) {
		if(document.getElementById("condition-extra-options").style.display == "none") document.getElementById("condition-extra-options").style.display = "block";
		else document.getElementById("condition-extra-options").style.display = "none";
		return;
	},

});
