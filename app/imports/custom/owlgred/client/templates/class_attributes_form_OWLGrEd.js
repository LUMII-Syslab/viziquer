import { get_multi_fields_obj } from '/imports/platform/client/templates/diagrams/dialog/subCompartments'

import './class_attributes_form_OWLGrEd.html'

Template.classAttributeFieldOWLGrEd.helpers({

	multi_fields_obj: function() {
		let res = get_multi_fields_obj();
		// TODO: update form name
		_.extend(res, {next_level_form: "AddAttribute_OWLGrEd"});
		return res;
	},
});
