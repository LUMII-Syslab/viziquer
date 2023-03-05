import { Interpreter } from '/client/lib/interpreter'
import { Elements } from '/libs/platform/collections'

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

});


Template.AddCondition.events({

	"click #ok-add-condition": function(e) {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
			var condition = $('#condition-expression').val();
			if(condition != ""){
				var allowMultiplication = $('input[id=allow-multiplication-check-box]:checked').val();
				if(typeof allowMultiplication !== "undefined" && allowMultiplication == "on") allowMultiplication = true;
				else allowMultiplication = false;
				vq_obj.addCondition(condition, allowMultiplication);
			}
	  };

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

});
