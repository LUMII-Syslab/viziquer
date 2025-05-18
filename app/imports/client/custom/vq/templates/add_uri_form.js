import { Interpreter } from '../../../lib/interpreter.js'
import { Elements } from '../../../../db/platform/collections.js'

import { autoCompletionCleanup, autoCompletionInstance } from '../js/autoCompletion.js'
import { VQ_Element, createVQ_Element } from '../../../custom/vq/js/VQ_Element.js';

import './add_uri_form.html'

Interpreter.customMethods({
	AddUriName: async function () {

		autoCompletionCleanup();

		$("#add-uri-form").modal("show");
		$('#uri-name-field').val('');
		
		var selected_elem_id = Session.get("activeElement");
		if (await Elements.findOneAsync({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = await createVQ_Element(selected_elem_id);
		  const instanceAlias = await vq_obj.getInstanceAlias()
		  $('#uri-name-field').val(instanceAlias);
		};
	}
})


Template.AddUri.helpers({

});


Template.AddUri.events({

	"click #ok-add-uri-name": async function(e) {
		var selected_elem_id = Session.get("activeElement");
		if (await Elements.findOneAsync({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = await createVQ_Element(selected_elem_id);
			var name = $('#uri-name-field').val(); //setInstanceAlias
			await vq_obj.setInstanceAlias(name);
		};
		return;
	},

	"keydown #uri-name-field": function(e) {
		autoCompletionInstance(e);
		return;
	},

	"shown.bs.modal #add-uri-form": function(e) {
		$('#uri-name-field').focus();
	},

	"hidden.bs.modal #add-uri-form": function(e) {
		autoCompletionCleanup();
	},

});
