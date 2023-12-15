import { Interpreter } from '/client/lib/interpreter'

import './explain_link_form.html'

Interpreter.customMethods({
	ExplainLink: function () {
		$("#explain-link-form").modal("show");
	}
})


Template.ExplainLink.helpers({

});


Template.ExplainLink.events({

});
