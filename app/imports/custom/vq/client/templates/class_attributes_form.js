// import { Interpreter } from '/client/lib/interpreter'
import { get_multi_fields_obj } from '../../../../platform/client/templates/diagrams/dialog/subCompartments.js'

import './class_attributes_form.html'

Template.classAttributeField.helpers({

	multi_fields_obj: function() {
		let res = get_multi_fields_obj();
		// TODO: update form name
		_.extend(res, {next_level_form: "AddNewAttribute"});
		return res;
	},
});
