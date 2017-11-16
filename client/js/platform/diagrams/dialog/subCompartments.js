

Template.multiField.helpers({

	multi_fields_obj: function() {

		var data_in = Template.currentData();
		if (!data_in)
			return;

		var res = {	_id: data_in["_id"], name: data_in["name"], fields: [],};
		var compartments = Compartments.find({compartmentTypeId: data_in["_id"],
												elementId: Session.get("activeElement")});

		res["values"] = compartments.fetch();

		res["compartmentTypeId"] = Session.get("multiRowCompartmentTypeId");

		return res;
	},

});

Template.multiField.events({

	'click .add-multi-field': function(e, templ) {

		e.preventDefault();

		var src = $(e.target);
		var multi_field = $(src).closest(".multi-field");
		var compart_type_id = multi_field.attr("id");

		Session.set("multiRowCompartmentTypeId", compart_type_id);
		Session.set("multFieldCompartmentId", reset_variable());

		var form = multi_field.find(".row-form");
		form.modal("show");

		return;
	},

	'click .edit-multi-field': function(e, templ) {

		e.preventDefault();

		var src = $(e.target);
		var multi_field = $(src).closest(".multi-field");
		var compart_type_id = multi_field.attr("id");

		var id = $(src).closest(".multi-field-row").attr("id");

		Session.set("multFieldCompartmentId", id);
		Session.set("multiRowCompartmentTypeId", compart_type_id)

		var form = multi_field.find(".row-form");
		form.modal("show");

		return;
	},

	'click .remove-multi-field': function(e) {

		var src = $(e.target);
		var compart_id = $(src).closest(".multi-field-row").attr("id");

		var list = {compartmentId: compart_id,
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

		Utilities.callMeteorMethod("removeCompartment", list);
	},

});

Template.show_multi_field_form.helpers({

	field_obj: function() {

		var data_in = Template.currentData();
		if (!data_in) {
			return;
		}

		//var compart_type_id = $(this).$(".multi-field").attr("id");
		//var compart_type_id = Session.get("multiRowCompartmentTypeId");
		
		var compart_type_id = data_in["compartmentTypeId"];
		var compart = Compartments.findOne({_id: Session.get("multFieldCompartmentId")});

		var fields = [];

		var compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		if (!compart_type) {
			return {fields: fields};
		}

		var sub_compartment;
		var compart_id;
		if (compart) {
			sub_compartment = compart["subCompartments"][compart_type["label"]];
			compart_id = compart["_id"];
		}

		//if (compart_type["subCompartmentTypes"] && compart_type["subCompartmentTypes"].length > 0)
		process_sub_compart_types(compart_type["subCompartmentTypes"], fields, sub_compartment);

		var field_obj = {_id: compart_type["_id"],
						compartmentId: compart_id,
						name: compart_type["label"],
						fields: fields,
					};

		return field_obj;
	},

});


Template.show_multi_field_form.events({

	'click .new-multi-row': function(e, templ) {

		var src = $(e.target);

		var form = templ.$(".row-form");
		form.modal("hide");

		var compart_type_id = form.attr("id");

		var compart_type = CompartmentTypes.findOne({_id: compart_type_id});
		if (!compart_type) {
			return;
		}

		var sub_compart_tree = {};

		var multi_field = form.find(".multi-field");
		var res = Dialog.buildSubCompartmentTree(multi_field, compart_type, sub_compart_tree);

		var src_id = form.attr("compartmentId");

		var input = res;
		var value = input;

		var elem_style;
		var compart_style;

		Dialog.updateCompartmentValue(compart_type, input, value, src_id, compart_style, elem_style, sub_compart_tree);
	},

});

Template.value_from_subcompartments.helpers({

	fields: function() {

		var data_in = Template.currentData();
		if (!data_in)
			return;

		var fields = [];

		var compart = Compartments.findOne({_id: data_in["compartmentId"]});
		var sub_compartments;
		if (compart) {
			var tmp_sub_compartments = compart["subCompartments"];
			if (tmp_sub_compartments) {
				sub_compartments = tmp_sub_compartments[data_in["name"]];
			}
		}

		process_sub_compart_types(data_in["subCompartmentTypes"], fields, sub_compartments);

		return fields;
	},

});

function process_sub_compart_types(subCompartmentTypes, fields, sub_compartments) {

	_.each(subCompartmentTypes, function(sub_compart_type) {

		var sub_sub_compartments;
		if (sub_compartments) {
			sub_sub_compartments = sub_compartments[sub_compart_type["name"]];
		}
		
		//if compartment has an input type
		if (sub_compart_type["inputType"] && sub_compart_type["inputType"]["type"]) {

			var field = Dialog.renderDialogFields(sub_compart_type, sub_sub_compartments);
			field["subCompartmentTypeId"] = sub_compart_type["_id"];

			field["isSubCompartmentType"] = true;

			fields.push(field);

			return;
		}

		if (sub_compart_type["subCompartmentTypes"] && sub_compart_type["subCompartmentTypes"].length > 0) {
			process_sub_compart_types(sub_compart_type["subCompartmentTypes"], fields, sub_sub_compartments);
		}

	});
}
