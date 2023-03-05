import { Interpreter } from '/client/lib/interpreter'

Interpreter.customMethods({
	ExplainField: function () {
		$("#explain-field-form").modal("show");
	}
})


Template.ExplainLink.helpers({

});


Template.ExplainLink.events({

});
