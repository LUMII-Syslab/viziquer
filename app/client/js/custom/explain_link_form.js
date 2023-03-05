import { Interpreter } from '/client/lib/interpreter'

Interpreter.customMethods({
	ExplainLink: function () {
		$("#explain-link-form").modal("show");
	}
})


Template.ExplainLink.helpers({

});


Template.ExplainLink.events({

});
