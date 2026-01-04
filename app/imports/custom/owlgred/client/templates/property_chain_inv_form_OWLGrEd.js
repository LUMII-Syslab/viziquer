import { get_multi_fields_obj } from '../../../../platform/client/templates/diagrams/dialog/subCompartments.js'

import './property_chain_inv_form_OWLGrEd.html'

Template.propertyChainInvFieldOWLGrEd.helpers({

	multi_fields_obj: function() {
		let res = get_multi_fields_obj();
		// TODO: update form name
		_.extend(res, {next_level_form: "AddPropertyChainInv_OWLGrEd"});
		return res;
	},
});
