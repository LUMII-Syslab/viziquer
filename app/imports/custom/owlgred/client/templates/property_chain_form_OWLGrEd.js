import { get_multi_fields_obj } from '../../../../platform/client/templates/diagrams/dialog/subCompartments.js'

import './property_chain_form_OWLGrEd.html'

Template.propertyChainFieldOWLGrEd.helpers({

	multi_fields_obj: function() {
		let res = get_multi_fields_obj();
		// TODO: update form name
		_.extend(res, {next_level_form: "AddPropertyChain_OWLGrEd"});
		return res;
	},
});
