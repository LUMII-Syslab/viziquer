import { Template } from 'meteor/templating';
import { get_multi_fields_obj } from '../../../../platform/client/templates/diagrams/dialog/subCompartments.js'

import './class_keys_form_OWLGrEd.html'

Template.classKeysFieldOWLGrEd.helpers({

	multi_fields_obj: function() {
		let res = get_multi_fields_obj();
		// TODO: update form name
		_.extend(res, {next_level_form: "AddKeys_OWLGrEd"});
		return res;
	},
});
