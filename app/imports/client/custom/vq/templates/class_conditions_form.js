// import { Interpreter } from '/client/lib/interpreter'
import { get_multi_fields_obj } from '/imports/client/platform/templates/diagrams/dialog/subCompartments'

import './class_conditions_form.html'

Template.classConditionsField.helpers({

	multi_fields_obj: function() {
		let res = get_multi_fields_obj();
		
		// TODO: update form name
		_.extend(res, {next_level_form: "AddCondition"});
		return res;
	},
});
