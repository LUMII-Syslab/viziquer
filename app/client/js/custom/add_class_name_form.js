Interpreter.customMethods({
	AddClassName: function () {
		
		autoCompletionCleanup()

		$("#add-class-name-form").modal("show");
		$('#class-name-field').val('');
		
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
			$('#class-name-field').val(vq_obj.getName());
		};
	}
})


Template.AddClassName.helpers({
	
});


Template.AddClassName.events({

	"click #ok-add-class-name": function(e) {
		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
			var name = $('#class-name-field').val();
			vq_obj.setName(name);
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
