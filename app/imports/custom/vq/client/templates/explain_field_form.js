import { Interpreter } from '../../../../client/lib/interpreter.js'

import './explain_field_form.html'

Interpreter.customMethods({
	ExplainField: function () {
		$("#explain-field-form").modal("show");
	}
})


Template.ExplainField.helpers({

});


Template.ExplainField.events({

});
