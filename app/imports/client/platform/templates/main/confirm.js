import { Interpreter } from '/client/lib/interpreter'
import { reset_variable } from '/imports/client/platform/js/utilities/utils'

Template.delete_confirmation.helpers({
	text: function() {
		return Session.get("confirmationText");
	},
});

Template.delete_confirmation.events({

	'click #cancel' : function(e) {
		e.preventDefault();
		$("#delete-confirm-form").modal("hide");
	},

	'click #confirm' : function(e) {
		e.preventDefault();
		$("#delete-confirm-form").attr("OKPressed", true);
		$("#delete-confirm-form").modal("hide");
	},

	//if ok was clicked, then starting a new chat
	'hidden.bs.modal #delete-confirm-form' : function(e) {
		e.preventDefault();

		var src = $('#delete-confirm-form');
		if (src.attr("OKPressed")) {
			src.removeAttr("OKPressed");
			var proc_name = Session.get("confirmationProcedure");

			Interpreter.execute(proc_name);
		}

		Session.set("confirmationText", reset_variable());
		Session.set("confirmationProcedure", reset_variable());
	},

});

Template.delete_confirmation.destroyed = function() {
	Session.set("confirmationText", reset_variable());
	Session.set("confirmationProcedure", reset_variable());
}
