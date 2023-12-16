import { Interpreter } from '/client/lib/interpreter'
import { Configurator } from '/imports/client/platform/templates/configurator/config_utils'
import { CompartmentTypes, ElementTypes } from '/imports/db/platform/collections'
import { Utilities, reset_variable } from '/imports/client/platform/js/utilities/utils'
import { is_ajoo_editor } from '/imports/libs/platform/lib'

import './styles.html'

Template.compartmentTypeStyles.events({
	'change #compartmentStyle' : function(e) {
		var src = $(e.target);
		var item = Dialog.getSelectionItem(src);
		var index = Number(item.attr("index"));

		Session.set("activeCompartmentStyleIndex", index);
	},

});

Template.compartmentTypeStyles.rendered = function() {
	Dialog.addColorPicker();
}

Template.compartmentStyleContextMenu.helpers({
	is_remove: function() {
		if (Session.get("activeCompartmentStyleIndex") == 0)
			return "disabled";
	},
});

Template.compartmentStyleContextMenu.events({

	'click #add-compartment-type-style' : function(e) {
		$("#compartment-style-form").modal("show");
	},

	'click #editCompartment' : function(e) {
		Session.set("compartmentStyleEdit", true);
		$("#compartment-style-form").modal("show");
	},

	'click #delete-compartment-type-style' : function(e) {
		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (compart_type) {
			var id = compart_type["_id"];
			
			var selection = $("#compartmentStyle");
			var item = Dialog.getSelectionItem(selection);
			var index = Number(item.attr("index"));

			var styles = compart_type["styles"];
			styles.splice(index, 1);

			var list = {attrName: "styles", attrValue: styles};
			remove_compartment_style(list);

			Session.set("activeCompartmentStyleIndex", index-1);
		}
	},
});

Template.compartmentStyleDropDown.helpers({

	styles: function() {
		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (compart_type) {
			var index = Session.get("activeCompartmentStyleIndex");
			if (!index) {
				index = 0;
				Session.set("activeCompartmentStyleIndex", index);
			}

			return _.map(compart_type["styles"], function(style, i) {
				style["index"] = i;
				if (i == index)
					style["selected"] = "selected";

				return style;
			});
		}
	},
});

Template.compartmentStyleDropDown.destroyed = function() {
	Session.set("activeCompartmentStyleIndex", reset_variable());	
}

Template.compartmentStyleModal.helpers({

	dialog: function() {

		return {
			edit: Session.get("compartmentStyleEdit"),
			name: function() {
				var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
				if (compart_type) {
					var styles = compart_type["styles"];
					if (styles) {
						var index = get_active_style_index();
						return styles[index]["name"];
					}
				}
			}
		}
	},
});

Template.compartmentStyle.helpers({

	editor_type: function() {
		var editors = {ajooEditor: false, ZoomChart: false};
		var editor_type = Interpreter.getEditorType();
		editors[editor_type] = true;

		return editors;
	},
});

// Start of compartment style
Template.ajooCompartmentStyle.helpers({
	style: function() {
		return get_compartment_type_default_style();
	},
});

Template.ajooCompartmentStyle.events({

	'blur .dialog-input' : function(e) {
		var pair = Configurator.getInputFieldValue(e);
		var attr_name = pair["_attr"];
		var attr_value = pair["_value"];

		update_compartment_type_style_field(attr_name, attr_value);
	},

	'change .dialog-select' : function(e) {
		var selection = $(e.target);
		var item = Dialog.getSelectionItem(selection);

		var attr_name = selection.attr("id");
		var attr_value = item.text();

		update_compartment_type_style_field(attr_name, attr_value);
	},

});

Template.ZoomChartCompartmentStyle.helpers({
	style: function() {
		return get_compartment_type_default_style();
	},
});

Template.ZoomChartCompartmentStyle.events({

	'blur .dialog-input' : function(e) {
		var pair = Configurator.getInputFieldValue(e);
		var attr_name = pair["_attr"];
		var attr_value = pair["_value"];

		update_compartment_type_style_field(attr_name, attr_value);
	},

	'change .dialog-select' : function(e) {
		var selection = $(e.target);
		var item = Dialog.getSelectionItem(selection);

		var attr_name = selection.attr("id");
		var attr_value = item.text();

		update_compartment_type_style_field(attr_name, attr_value);
	},

});

Template.compartmentStyleModal.events({

	'click #ok-compart-style' : function(e) {
		
		var form = $("#compartment-style-form");
		form.modal("hide");

		var list = {id: Session.get("compartmentTargetTypeId"),
					styleIndex: get_active_style_index(),
					attrName: "name",
					attrValue: $("#compart-style-name").val(),
				};

		if (Session.get("compartmentStyleEdit")) {

			//updating the compartment style name
			update_compartment_style(list);
		}

		else {		

			list["elementType"] = get_element_type_type();
			list["editorType"] = Interpreter.getEditorType();
 
			//adding the compartment style
			add_compartment_style(list);
		}
	},

	'hidden.bs.modal #compartment-style-form' : function(e) {
		Session.set("compartmentStyleEdit", reset_variable());
	},

});

function get_active_style_index() {
	var index = Session.get("activeCompartmentStyleIndex");
	if (!index) {
		index = 0;
		Session.set("activeCompartmentStyleIndex", index);
	}

	return index;
}

function get_compartment_type_default_style() {
	var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
	if (compart_type && compart_type["styles"]) {
		var index = get_active_style_index();

		if (!compart_type["styles"][index]) {
			return;
		}

		var style = compart_type["styles"][index]["style"];
		var elem_type = ElementTypes.findOne({_id: compart_type["elementTypeId"]});

		var editor_type = Interpreter.getEditorType();
		if (is_ajoo_editor(editor_type)) {

			//placements for boxes
			if (elem_type["type"] == "Box")	{
				set_selection_value(style, "placement", [{value: "inside"}]);	
			}

			//placements for lines
			else {
				set_selection_value(style, "placement",
								[{value: "start-left"}, {value: "start-right"},
								{value: "middle-left"}, {value: "middle-right"},
								{value: "end-left"}, {value: "end-right"},
								{value: "middle"}
							]);			
			}

			set_selection_value(style, "align", [{value: "left"}, {value: "center"}, {value: "right"}]);

			set_selection_value(style, "fontStyle", [{value: "normal"}, {value: "bold"}, {value: "italic"}]);

			set_selection_value(style, "fontVariant", [{value: "normal"}, {value: "small-caps"}]);

			set_selection_value(style, "visible", [{value: "true"}, {value: "false"}]);
		}

		else if (is_zoom_chart_editor(editor_type)) {

			set_selection_value(style["textStyle"], "align", [{value: "left"}, {value: "center"}, {value: "right"}], "center"); 
		}

		return style;
	}
}

function set_selection_value(style, attr_name, list, default_value) {

	var value = style[attr_name];

	if (!value) {
		value = default_value;
	}

	if (!value) {
		return;
	}

	var attr_name_list = attr_name + "List";
	style[attr_name_list] = _.map(list, function(item) {
		if (item["value"] === value) {
			item["selected"] = "selected";
		}

		return item;
	});
}

function get_element_type_type() {
	var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
	if (elem_type) {
		return elem_type["type"];
	}
}

//Updating functions

function add_compartment_style(list) {
	Utilities.callMeteorMethod("addCompartmentTypeStyle", list, function() {

		//setting the active style index
		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (compart_type && compart_type["styles"]) {
			Session.set("activeCompartmentStyleIndex", compart_type["styles"].length-1);
		}
	});
}

function update_compartment_style(list) {
	Utilities.callMeteorMethod("updateCompartmentTypeStyle", list);
}

function remove_compartment_style(list) {
	Configurator.updateCompartmentType(list);
}

function update_compartment_type_style_field(attr_name, attr_value) {

	var list = {id: Session.get("compartmentTargetTypeId"),
				styleIndex: get_active_style_index(),
				attrName: "style." + attr_name,
				attrValue: attr_value,
			};

	//selecting the style id
	var compart_type = CompartmentTypes.findOne({_id: list["id"]});
	if (!compart_type) {
		return;	
	}

	//selecting the style's id
	var style = compart_type["styles"][list["styleIndex"]];
	list["styleId"] = style["id"];

	//updating the style
	Utilities.callMeteorMethod("updateCompartmentTypeStyle", list);
}
