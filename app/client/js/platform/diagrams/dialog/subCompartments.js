import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'
import { Compartments, CompartmentTypes } from '/libs/platform/collections'

Template.multiField.helpers({

	multi_fields_obj: function() {

		var data_in = Template.currentData();
		if (!data_in) {
			return;
		}

		var res = {	_id: data_in["_id"], name: data_in["name"], label: data_in["label"], fields: [],};
		var compartments = Compartments.find({compartmentTypeId: data_in["_id"],
												elementId: Session.get("activeElement")}, {sort: {index: 1}});

		res["values"] = compartments.fetch();

		res["compartmentTypeId"] = Session.get("multiRowCompartmentTypeId");

		return res;
	},

});

Template.multiField.events({

	'click .down-multi-field': function(e, templ) {
		e.preventDefault();

		var data = getCurrentCompartment(e);

		var compartments = data.compartments;
		var index = data.index;
		var current_compart = data.currentCompartment;

		var next_index = index + 1;
		if (next_index < compartments.length) {
			var next_compart = compartments[next_index];
			var list = {projectId: Session.get("activeProject"),
						elementId: Session.get("activeElement"),
						prevCompartment: {id: current_compart._id, index: current_compart.index,},
						currentCompartment: {id: next_compart._id, index: next_compart.index,},
					};

			Utilities.callMeteorMethod("swapCompartments", list);
		}
	},


	'click .up-multi-field': function(e, templ) {
		e.preventDefault();

		var data = getCurrentCompartment(e);

		var compartments = data.compartments;
		var index = data.index;
		var current_compart = data.currentCompartment;

		var prev_index = index - 1;
		if (prev_index >= 0) {
			var prev_compart = compartments[prev_index];
			var list = {projectId: Session.get("activeProject"),
						elementId: Session.get("activeElement"),
						prevCompartment: {id: prev_compart._id, index: prev_compart.index,},
						currentCompartment: {id: current_compart._id, index: current_compart.index,},
					};

			Utilities.callMeteorMethod("swapCompartments", list);
		}
	},


	'click .add-multi-field': function(e, templ) {
		
		autoCompletionCleanup()
		
		e.preventDefault();

		var src = $(e.target);
		$('.dialog-input').val('');
		var multi_field = $(src).closest(".multi-field");
		var compart_type_id = multi_field.attr("id");

		Session.set("multiRowCompartmentTypeId", compart_type_id);
		Session.set("multFieldCompartmentId", reset_variable());

		var form = multi_field.find(".row-form");
		form.modal("show");

		execute_extension_point(compart_type_id);

		return;
	},

	'click .edit-multi-field': function(e, templ) {
		
		autoCompletionCleanup()

		e.preventDefault();

		var src = $(e.target);
		var multi_field = $(src).closest(".multi-field");
		var compart_type_id = multi_field.attr("id");

		var id = $(src).closest(".multi-field-row").attr("id");

		Session.set("multFieldCompartmentId", id);
		Session.set("multiRowCompartmentTypeId", compart_type_id)

		var form = multi_field.find(".row-form");
		form.modal("show");

		execute_extension_point(compart_type_id);

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
			sub_compartment = compart["subCompartments"][compart_type["name"]];
			compart_id = compart["_id"];
		}

		//if (compart_type["subCompartmentTypes"] && compart_type["subCompartmentTypes"].length > 0)
		process_sub_compart_types(compart_type["subCompartmentTypes"], fields, sub_compartment);

		var field_obj = {_id: compart_type["_id"],
						compartmentId: compart_id,
						name: compart_type["name"],
						label: compart_type["label"],
						fields: fields,
						// extraButton: extra_button,
					};

		return field_obj;
	},


	extraButton: function(e) {
		return Session.get("extraButton");
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
		
		var input = res;
		var value = input;
		
		if(typeof sub_compart_tree["Attributes"] !== "undefined"){
			var prefixesValue = "";
			var graphPrefixes = "";
			
			if(typeof sub_compart_tree["Attributes"]["Attributes"]["Graph"] !== "undefined" && typeof sub_compart_tree["Attributes"]["Attributes"]["Graph"]["input"] !== "undefined" && sub_compart_tree["Attributes"]["Attributes"]["Graph"]["input"] != "") graphPrefixes = sub_compart_tree["Attributes"]["Attributes"]["Graph"]["input"];
			if(typeof sub_compart_tree["Attributes"]["Attributes"]["Graph instruction"] !== "undefined" && typeof sub_compart_tree["Attributes"]["Attributes"]["Graph instruction"]["input"] !== "undefined" && sub_compart_tree["Attributes"]["Attributes"]["Graph instruction"]["input"] != "") graphPrefixes = sub_compart_tree["Attributes"]["Attributes"]["Graph instruction"]["input"] + ": " + graphPrefixes;
			if(graphPrefixes != "") graphPrefixes = "{" + graphPrefixes + "} ";
			
			if(typeof sub_compart_tree["Attributes"]["Attributes"]["Graph"] !== "undefined" && typeof sub_compart_tree["Attributes"]["Attributes"]["Graph instruction"] !== "undefined" && typeof sub_compart_tree["Attributes"]["Attributes"]["Graph"]["input"] !== "undefined" && typeof sub_compart_tree["Attributes"]["Attributes"]["Graph instruction"]["input"] !== "undefined")value = value.substring((sub_compart_tree["Attributes"]["Attributes"]["Graph"]["input"]+sub_compart_tree["Attributes"]["Attributes"]["Graph instruction"]["input"]).length)
			
			if(typeof sub_compart_tree["Attributes"]["Attributes"]["Graph"] !== "undefined")sub_compart_tree["Attributes"]["Attributes"]["Graph"]["value"] = "";
			if(typeof sub_compart_tree["Attributes"]["Attributes"]["Graph instruction"] !== "undefined")sub_compart_tree["Attributes"]["Attributes"]["Graph instruction"]["value"] = "";
			
			if(typeof sub_compart_tree["Attributes"]["Attributes"]["IsInternal"] !== "undefined" && sub_compart_tree["Attributes"]["Attributes"]["IsInternal"]["input"] == "true") prefixesValue = "h";
			if(typeof sub_compart_tree["Attributes"]["Attributes"]["Require Values"] !== "undefined" && sub_compart_tree["Attributes"]["Attributes"]["Require Values"]["input"] == "true") prefixesValue = prefixesValue + "+";
			if(prefixesValue != "") prefixesValue = "{" + prefixesValue + "} ";
			prefixesValue = graphPrefixes + prefixesValue;
			if(typeof sub_compart_tree["Attributes"]["Attributes"]["Prefixes"] !== "undefined"){
				sub_compart_tree["Attributes"]["Attributes"]["Prefixes"]["value"] = prefixesValue;
				sub_compart_tree["Attributes"]["Attributes"]["Prefixes"]["input"] = prefixesValue;
				value = prefixesValue + value;
			}
		}
		
		var src_id = form.attr("compartmentId");

		var elem_style;
		var compart_style;
		
		if(typeof src_id === "undefined") Interpreter.executeExtensionPoint(compart_type, "createCompartment", [Session.get("activeElement")]);
		

		Dialog.updateCompartmentValue(compart_type, input, value, src_id, compart_style, elem_style, sub_compart_tree);
	},


	"click .yellow-button": function(e) {
		var compart_type_id = $(e.target).closest(".row-form").attr("id");
		var compart_type = CompartmentTypes.findOne({_id: compart_type_id,});

		if (compart_type && _.size(compart_type.subCompartmentTypes) > 0) {
			var extra_button = compart_type.subCompartmentTypes[0].extraButton || {};
			var button_handle_func = extra_button.processButtonClick;

			Interpreter.execute(button_handle_func, [e]);
		}
	},

});


Template.show_multi_field_form.onDestroyed(function() {
	Session.set("extraButton", undefined);
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
		var is_visible = Dialog.checkCompartmentVisibility(sub_compart_type);
		if (!is_visible) {
			return;
		}

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


function getCurrentCompartment(e) {

	var src = $(e.target);
	var multi_field = $(src).closest(".multi-field");
	var compart_type_id = multi_field.attr("id");

	var compartments = Compartments.find({compartmentTypeId: compart_type_id, elementId: Session.get("activeElement"), }, {sort: {index: 1}}).fetch();
	var compart_id = $(src).closest(".multi-field-row").attr("id");

	var index = -1;
	var current_compart = {};

	for (var i=0;i<compartments.length;i++) {
		var compart = compartments[i];
		if (compart._id == compart_id) {
			current_compart = compart;
			index = i;
			break;
		}
	}

	return {compartments: compartments, index: index, currentCompartment: current_compart,};
}


function execute_extension_point(compart_type_id) {
	var extra_button = {};
	var compart_type = CompartmentTypes.findOne({_id: compart_type_id,});
	if (_.size(compart_type.subCompartmentTypes) > 0) {
		extra_button = compart_type.subCompartmentTypes[0].extraButton || {};

		var is_available = false;

		var is_available_func = extra_button.isAvailable;
		if (is_available_func && extra_button.processButtonClick) {
			is_available = Interpreter.execute(is_available_func, [compart_type]);
		}

		_.extend(extra_button, {isAvailable: is_available,});
	}

	Session.set("extraButton", extra_button);
}
