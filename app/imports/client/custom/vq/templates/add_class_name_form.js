import { Interpreter } from '../../../lib/interpreter'
import { Elements } from '../../../../db/platform/collections'

import { autoCompletionClass, autoCompletionCleanup } from '../../../custom/vq/js/autoCompletion.js'
import { VQ_Element, createVQ_Element } from '../../../custom/vq/js/VQ_Element.js';

import './add_class_name_form.html'

Interpreter.customMethods({
	AddClassName: async function () {
		
		autoCompletionCleanup()

		$("#add-class-name-form").modal("show");
		$('#class-name-field').val('');
		
		var selected_elem_id = Session.get("activeElement");
		if (await Elements.findOneAsync({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = await createVQ_Element(selected_elem_id);
		  const className = await vq_obj.getName()
			$('#class-name-field').val(className);
		};
	}
})


Template.AddClassName.helpers({
	
});


Template.AddClassName.events({

	"click #ok-add-class-name": async function(e) {
		var selected_elem_id = Session.get("activeElement");
		if (await Elements.findOneAsync({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = await createVQ_Element(selected_elem_id);
			var name = $('#class-name-field').val();
			await vq_obj.setName(name);
		};
		return;
	},

	"keydown #class-name-field": function(e) {
		autoCompletionClass(e);
		return;
	},

	"shown.bs.modal #add-class-name-form": function(e) {
		$('#class-name-field').focus();
	},

	"hidden.bs.modal #add-class-name-form": function(e) {
		autoCompletionCleanup();
	},

});
