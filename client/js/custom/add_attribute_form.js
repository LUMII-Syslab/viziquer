Interpreter.customMethods({
	AddAttribute: function () {

		$("#add-attribute-form").modal("show");
		$('input[name=stack-checkbox]').attr('checked',false);
	}
})


Template.AddAttribute.helpers({

	attributes: function() {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"

			var attr_list = [];
			attr_list.push({name:"*"});
			attr_list.push({name:"(select this)"});
			attr_list.push({separator:"line"});

			var vq_obj = new VQ_Element(selected_elem_id);

			var class_name = vq_obj.getName();
			var schema = new VQ_Schema();

			if (schema.classExist(class_name)) {
				attr_list = attr_list.concat(schema.findClassByName(class_name).getAllAttributes());
			};

      var field_list = vq_obj.getFields().map(function(f) {return f.exp});
			attr_list = attr_list.map(function(attr) {
        attr.disabled = (_.indexOf(field_list,attr.name) > -1);
				return attr;
			});
			return attr_list;

		}
	},


});


Template.AddAttribute.events({

	"click #ok-add-attribute": function(e) {

		var selected_elem_id = Session.get("activeElement");
		if (Elements.findOne({_id: selected_elem_id})){ //Because in case of deleted element ID is still "activeElement"
		//Read user's choise
		  var vq_obj = new VQ_Element(selected_elem_id);
		  var checkboxes = $('input[name=stack-checkbox]:checked').closest(".attribute");
      checkboxes.each(function () {
					var name = $(this).attr("name");
					vq_obj.addField(name,null,false,false,false);
		  });
	  };

		return;

	},

});
