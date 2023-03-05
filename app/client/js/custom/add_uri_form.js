import { Interpreter } from '/client/lib/interpreter'
import { Elements } from '/libs/platform/collections'


Interpreter.customMethods({
	AddUriName: function () {

		autoCompletionCleanup();

		$("#add-uri-form").modal("show");
		$('#uri-name-field').val('');
		
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
		  $('#uri-name-field').val(vq_obj.getInstanceAlias());
		};
	}
})


Template.AddUri.helpers({

});


Template.AddUri.events({

	"click #ok-add-uri-name": function(e) {
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
			var name = $('#uri-name-field').val(); //setInstanceAlias
			vq_obj.setInstanceAlias(name);
		};
		return;
	},

	"keydown #uri-name-field": function(e) {
		autoCompletionInstance(e);
		return;
	},

	"shown.bs.modal #add-uri-form": function(e) {
		$('#uri-name-field').focus();
	},

	"hidden.bs.modal #add-uri-form": function(e) {
		autoCompletionCleanup();
	},

});
