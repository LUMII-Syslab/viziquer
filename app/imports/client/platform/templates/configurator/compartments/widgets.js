import { Configurator } from '/client/js/platform/configurator/config_utils'
import { DiagramTypes, ElementTypes, CompartmentTypes, DialogTabs } from '/imports/db/platform/collections'

import './widgets.html'

Template.compartmentDialog.helpers({
	inputType: function() {
		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (compart_type) {
			return compart_type["inputType"];
		}
	},
});

Template.compartmentDialog.events({

	'change #tab' : function(e) {

		var compartment_type_id = get_selected_compartment_type_id();
		if (compartment_type_id != "noSelection") {

			var list = {id: Session.get("compartmentTargetTypeId"),
						attrName: "dialogTabId",
						attrValue: $( "select#tab option:selected").attr("id"),};

			update_input_type_obj(list);
		}
	},

	'change #inputTypes' : function(e) {

		var input_type_list = {};

		var input_type = $("select#inputTypes option:selected").text();
		if (input_type == "input") {
			input_type_list["type"] = input_type;
			input_type_list["inputType"] = "text";

		}
		else if (input_type == "textarea") {
				input_type_list["type"] = input_type;
				input_type_list["rows"] = 3;	
		}
		else if (input_type == "no input") {
			input_type_list["type"] = input_type;
			input_type_list["rows"] = reset_variable();
			input_type_list["inputType"] = reset_variable();				
		}
		else if (input_type == "selection") {
			input_type_list["type"] = input_type;
			input_type_list["rows"] = reset_variable();
			input_type_list["inputType"] = reset_variable();
			input_type_list["values"] = [];	
		}

		else if (input_type == "combobox") {
			input_type_list["type"] = input_type;
			input_type_list["rows"] = reset_variable();
			input_type_list["inputType"] = reset_variable();
			input_type_list["values"] = [];
		}

		else if (input_type == "radio") {
			input_type_list["type"] = input_type;
			input_type_list["rows"] = reset_variable();
			input_type_list["inputType"] = reset_variable();
			input_type_list["values"] = [];	
		}

		else if (input_type == "checkbox") {
			input_type_list["type"] = input_type;
			input_type_list["rows"] = reset_variable();

			input_type_list["values"]  = [
						{value: "false", input: "false",
						elementStyle: "NoStyle", compartmentStyle: "NoStyle"},

						{value: "true", input: "true",
						elementStyle: "NoStyle", compartmentStyle: "NoStyle"}
					];					
		}

		else if (input_type == "cloudFiles") {
			input_type_list["type"] = input_type;
			input_type_list["rows"] = reset_variable();
		}

		else if (input_type == "custom") {
			input_type_list["type"] = input_type;
			input_type_list["rows"] = reset_variable();
		}

		var list = {id: Session.get("compartmentTargetTypeId"),
					attrName: "inputType",
					attrValue: input_type_list,
				};

		update_input_type_obj(list);
	},

	'blur .dialog-input' : function(e) {
		update_comparment_type_field(e);
	},

});

Template.inputOptions.helpers({
	input_type_options: function() {

		//list of input types
		var input_type_options = [
				{name: "text"},
				{name: "number"},
				{name: "url"},
				{name: "email"},
				{name: "datetime"},						
				{name: "password"},	
				{name: "color"},	
			];

		//selects active option
		var compart_type = Configurator.getActiveCompartmentType();
		if (compart_type) {
			var input_type = compart_type["inputType"]["inputType"];
			if (input_type) {
				for (var i=0;i<input_type_options.length;i++) {
					var input_type_option = input_type_options[i];
					if (input_type_option["name"] == input_type) {
						input_type_option["selected"] = "selected";
						break;
					}
				}
			}
		}

		return input_type_options;
	},

	fields: function() {
		var compart_type = Configurator.getActiveCompartmentType();
		if (compart_type) {
			if (compart_type["inputType"] && compart_type["inputType"]["type"]) {
				var type = compart_type["inputType"]["type"];

				return {input: type == "input",
						textarea: type == "textarea",
						selection: type == "selection",
						combobox: type == "combobox",						
						checkbox: type == "checkbox",
						radio: type == "radio",
						custom: type == "custom",
						cloudFiles: type == "cloudFiles",						
					};
			}
		}	
	},

	textarea_rows: function() {

		var compart_type = Configurator.getActiveCompartmentType();
		if (compart_type) {
			return compart_type["inputType"]["rows"];
		}
	},

	placeholder: function() {

		var compart_type = Configurator.getActiveCompartmentType();
		if (compart_type) {
			return compart_type["inputType"]["placeholder"];
		}
	},
});

Template.inputOptions.events({

//updates input field type (text, email, number, etc.)
	'change #inputType' : function(e) {
		var input_type = $("select#inputType option:selected").attr("id");
		var list = {attrName: "inputType.inputType", attrValue: input_type};

		update_input_type(list);
	},

//updates textarea rows field
	'blur #rows' : function(e) {
		var row_count = get_dialog_input_object(e).val();
		var list = {attrName: "inputType.rows", attrValue: row_count};
		
		update_input_type(list);
	},

	'blur .placeholder' : function(e) {
		var placeholder_val = get_dialog_input_object(e).val();
		var list = {attrName: "inputType.placeholder", attrValue: placeholder_val};
		
		update_input_type(list);
	},

});

Template.checkboxTable.helpers({
	items: function() {

		var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (!compart_type || !elem_type) {
			return;
		}

		var input_type = compart_type["inputType"];
		if (!input_type || input_type["type"] != "checkbox") {
			return;
		}

		var values = input_type["values"];
		if (!values || values.length != 2) {
			return;
		}

		var i = 0;
		return _.map(values, function(item) {

			item["index"] = i;
			item["elementStyles"] = select_element_type_styles(elem_type, values[i]);
			item["compartmentStyles"] = select_element_type_styles(compart_type, values[i]);

			i++;

			return item;
		});

		// var false_value = values[0];
		// var true_value = values[1];

		// if (!true_value || !false_value)
		// 	return;

		// return [{input: "false",
		// 		value: false_value["value"],
		// 		index: 0,
		// 		elementStyles: select_element_type_styles(elem_type, values[0]),
		// 		compartmentStyles: select_compartment_type_styles(compart_type, values[0]),
		// 	},

		// 		{input: "true",
		// 		value: true_value["value"],
		// 		index: 1,
		// 		elementStyles: select_element_type_styles(elem_type, values[1]),
		// 		compartmentStyles: select_compartment_type_styles(compart_type, values[1]),
		// 	}];
	},
});

Template.checkboxTable.events({

	'blur .checkbox-item' : function(e) {
		update_selection_table_input_field(e);
	},

	'change .style-input' : function(e) {
		update_selection_table_selection_field(e);
	},

});

Template.selectionTable.helpers({
	items: function() {

		var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (!compart_type || !elem_type) {
			return;
		}

		if (!compart_type["inputType"]) {
			return;
		}

		return _.map(compart_type["inputType"]["values"], function(value, i) {
				return {
					input: value["input"],
					value: value["value"],
					index: i,
					elementStyles: select_element_type_styles(elem_type, value),
					compartmentStyles: select_compartment_type_styles(compart_type, value),
				};
			});
	},
});

Template.selectionTable.events({

	'blur .item-input' : function(e) {
		update_selection_table_input_field(e);
	},

	'change .style-input' : function(e) {
		update_selection_table_selection_field(e);
	},

	'click #add-selection-item' : function(e) {

		var list = {id: Session.get("compartmentTargetTypeId"),
					attrName: "inputType.values",
					attrValue: {input: "item",
								value: "item",
								elementStyle: "NoStyle",
								compartmentStyle: "NoStyle",
							},
				};

		add_selection_item(list);
	},

	//this is brutal, but it was the only way I could make it
	'click .remove-selection-item' : function(e) {

		var src = $(e.target).closest(".table-row");
		var index = src.attr("index");

		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (compart_type && compart_type["inputType"]) {
			var input_type = compart_type["inputType"];
			var values = input_type["values"];
			values.splice(index, 1);

			var list = {id: Session.get("compartmentTargetTypeId"),
						attrName: "inputType.values",
						attrValue: values,
					};

			update_input_type_obj(list);
		}
	},
});

Template.inputDropDown.helpers({
	inputs: function() {

		var input_types = [
					{name: "no input"},
					{name: "input"},
					{name: "textarea"},
					{name: "selection"},
					{name: "combobox"},
					{name: "checkbox"},
					{name: "radio"},
					{name: "cloudFiles"},
					{name: "custom"},
				];

		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (compart_type && compart_type["inputType"]) {
			var compart_input = compart_type["inputType"];
			if (compart_input) {
				
				var type_name = compart_input["type"];
				_.each(input_types, function(input_type) {
					if (input_type["name"] == type_name) {
						input_type["selected"] = "selected";
					}
				});
			}
		}

		return input_types;
	},

});

Template.customField.helpers({

	templateName: function() {

		var compart_type = Configurator.getActiveCompartmentType();
		if (compart_type) {
			return compart_type["inputType"]["templateName"];
		}
	},

});

Template.tabDropDown.helpers({
	tabs: function() {
		
		var tabs;
		if (Session.get("activeElement")) {

			//selectes target element type and its dialog tabs
			var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
			if (elem_type) {
				tabs = DialogTabs.find({elementTypeId: elem_type["_id"],
										type: {$exists: false}});
			}
		}
		else {

			//selectes target element type and its dialog tabs
			var diagram_type = DiagramTypes.findOne({diagramId: Session.get("activeDiagram")});
			if (diagram_type) {
				tabs = DialogTabs.find({diagramTypeId: diagram_type["_id"],
										elementTypeId: {$exists: false},
										type: {$exists: false}});
			}
		}

		if (tabs) {

			//selects active target compartment type
			var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")},
														{sort: {tabIndex: 1}});
			if (compart_type) {

				//selects tab
				var tab_id = compart_type["dialogTabId"];

				return tabs.map(function(tab) {
					if (tab["_id"] == tab_id) {
						tab["selected"] = "selected";
					}

					return tab;
				});
			}
		}
	},
});
// End of tab drop down

// Start of compartmentDialogTab
Template.compartmentDialogTab.helpers({
	newTab: function() {
		return Session.get("newTab");
	},

	new_tab_toggle: function() {
		if (Session.get("newTab")) {
			return "fa-angle-up";
		}
		else {
			return "fa-angle-down";
		}
	},
});

Template.compartmentDialogTab.destroyed = function() {
	Session.set("newTab", reset_variable());
}

Template.compartmentDialogTab.events({

	'click #addTab': function(e) {
		if (Session.get("newTab")) {
			Session.set("newTab", reset_variable());
		}
		else {
			Session.set("newTab", true);
		}
	},

	'blur #newTab': function(e) {
		//Session.set("newTab", reset_variable());

		var field = $("#newTab");
		var tab_name = field.val();
		if (tab_name && tab_name != "") {
			field.val("");

			var list = {name: tab_name,
						toolId: Session.get("toolId"),
						versionId: Session.get("toolVersionId"),
						diagramTypeId: Session.get("targetDiagramType"),
						diagramId: Session.get("activeDiagram"),
					};

			var dialog_tab
			if (Session.get("activeElement")) {
				var elem_type = ElementTypes.findOne({$and: [{elementId: Session.get("activeElement")},
															{elementId: {$exists: true}}]});
				list["elementTypeId"] = elem_type["_id"];
				list["elementId"] = Session.get("activeElement");

				dialog_tab = DialogTabs.findOne({elementTypeId: elem_type["_id"],
													elementTypeId: {$exists: true}},
													{sort: {index: 1}});
			}
			else {
				dialog_tab = DialogTabs.findOne({diagramTypeId: Session.get("targetDiagramType"),
													elementTypeId: {$exists: false}},
													{sort: {index: 1}});
			}

			if (dialog_tab) {
				list["index"] = dialog_tab["index"] + 1;
			}
			else {
				list["index"] = 1;
			}

			insert_tab(list);
		}
	},
});

function update_selection_table_input_field(e) {
	var src = $(e.target);

	var attr_name = src.attr("attr");
	var input_value = src.text();

	var row = src.closest(".table-row");
	var index = row.attr("index");
	var input = row.attr("input");

	update_selection_table_field(attr_name, input_value, index, input);
}

function get_input_type_by_name(name) {
	var compart_type = Configurator.getActiveCompartmentType();
	if (compart_type) {
		if (compart_type["inputType"] && compart_type["inputType"]["type"] == name) {
			return true;
		}
	}	
}

function update_selection_table_selection_field(e) {
	var selection = $(e.target);
	var item = get_selection_item(selection);
	var style_id = item.attr("id");

	var row = selection.closest(".table-row");
	var index = row.attr("index");
	var input = row.attr("input");

	update_selection_table_field(selection.attr("id"), style_id, index, input);
}

function update_selection_table_field(attr_name, input_value, index, input) {

	var list = {id: Session.get("compartmentTargetTypeId"),
				toolId: Session.get("toolId"),
				versionId: Session.get("toolVersionId"),
				elementId: Session.get("activeElement"),
				index: index,
				attrName: attr_name,
				attrValue: input_value,
				input: input,
			};

	update_selection_object(list);
}

function get_selected_compartment_type_id() {
	var selection = $("select#compartment");
	var item = get_selection_item(selection);

	return item.attr("id");
}

function select_element_type_styles(elem_type, value) {
	return get_style_list(elem_type, value, "elementStyle");
}

function select_compartment_type_styles(compart_type, value) {
	return get_style_list(compart_type, value, "compartmentStyle");
}

function get_style_list(obj_type, value, attr) {
	var styles = [{name: "--No style--", id: "NoStyle"}];

	_.each(obj_type["styles"], function(style, i) {
		var item = {name: style["name"], id: style["id"]};
		if (value[attr] == item["id"])
			item["selected"] = "selected";

		styles.push(item);
	});

	return styles;
}

//Update functions

function update_input_type(list) {
	list["id"] = Session.get("compartmentTargetTypeId");
	Utilities.callMeteorMethod("updateInputType", list);
}

function insert_tab(tab_list) {
	var list = {tab: tab_list, compartmentTypeId: Session.get("compartmentTargetTypeId")};
	Utilities.callMeteorMethod("insertTabWIthCompartmentType", list);
}

function update_input_type_obj(list) {

	Configurator.updateCompartmentType(list);
}

function add_selection_item(list) {
	Utilities.callMeteorMethod("addSelectionItem", list);
}

function update_selection_object(list) {
	Utilities.callMeteorMethod("updateSelectionItem", list);
}

function update_comparment_type_field(e) {
	var pair = Configurator.getInputFieldValue(e);
	var list = {attrName: pair["_attr"], attrValue: pair["_value"]};

	Configurator.updateCompartmentType(list);
}
