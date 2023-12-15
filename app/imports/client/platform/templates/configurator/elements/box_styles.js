import { Interpreter } from '/client/lib/interpreter'
import { Configurator } from '/client/js/platform/configurator/config_utils'
import { ElementTypes, Elements } from '/libs/platform/collections'

import './box_styles.html'

//Box style properties

Template.boxColor.helpers({
	elem: function() {
		return Configurator.getActiveElementStyleProperties();
	},
});

Template.boxColor.events({

	'blur .dialog-input' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromInput(e);
		return false;
	},
});

//End of box style properties

// Start of boxLinearGradient
Template.boxLinearGradient.events({

	'blur .dialog-input' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromInput(e);
		return false;
	},
});

Template.boxLinearGradient.helpers({
	style: function() {
		return Configurator.getActiveElementStyleProperties();
	},
});

//End of boxLinearGradient

// Start of boxRadialGradient

Template.boxRadialGradient.events({

	'blur .dialog-input' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromInput(e);
		return false;
	},
});

Template.boxRadialGradient.helpers({
	style: function() {
		return Configurator.getActiveElementStyleProperties();
	},
});
// End of boxRadialGradient

Template.boxStyle.helpers({

	editor_type: function() {

		var editors = {ajooEditor: false, ZoomChart: false};
		var editor_type = Interpreter.getEditorType();
		editors[editor_type] = true;

		return editors;
	},

});

Template.ZoomChartBoxStyle.helpers({

	element: function() {

		var elem_style = Configurator.getActiveElementStyleProperties();

		elem_style["displays"] = [{option: "image"},
									{option: "text"},
									{option: "roundtext"},	
								];
		Configurator.selectItem(elem_style["displays"], elem_style["display"]);

		elem_style["imageCroppings"] = [{option: "false"},
										{option: "crop"},
										{option: "letterbox"},
										{option: "fit"},
										{option: "true"},	
									];
		Configurator.selectItem(elem_style["imageCroppings"], elem_style["imageCropping"]);

		return elem_style;
	},

});

Template.ZoomChartBoxStyle.events({

	'blur .dialog-input' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromInput(e);

		return false;
	},

	'change .dialog-selection' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromSelection(e, "elementStyle");
		return false;		
	},

});


//Box style properties
Template.ajooBoxStyle.helpers({

	element: function() {
		return Configurator.getActiveElementStyleProperties();
	},

	shapes: function() {

		//fill priority value
		var fill_priority = get_active_element_style_property("shape");

		//shape options
		var editor = Interpreter.editor;
		var options = _.map(editor.elements.shapes, function(node_type, key) {
			return {option: key};
		});


		//setting which option is selected
		for (var i=0;i<options.length;i++) {
			var option = options[i];
			if (option["option"] == fill_priority) {
				option["selected"] = "selected";
				break;
			}
		}

		return options;
	},

	fillPriority: function() {

		var style_obj;
		var index = Session.get("activeStyleIndex");
		var elem_id = Session.get("activeElement");

		//if configurator element selected
		var elem_type = ElementTypes.findOne({elementId: elem_id});	
		if (elem_type && elem_type["styles"] && elem_type["styles"][index] && 
			elem_type["styles"][index]["elementStyle"]) {

			style_obj = elem_type["styles"][index]["elementStyle"];
		}

		//if diagram's element selected
		else {
			var elem = Elements.findOne({_id: elem_id});
			if (elem && elem["style"])
				style_obj = elem["style"]["elementStyle"];

			else
				return;
		}

		//computing the selected fill-priority
		var fill_priority = style_obj["fillPriority"];
		return Configurator.computeFillPriority(fill_priority);
	},
});

Template.ajooBoxStyle.events({
	
	'blur .dialog-input' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromInput(e);
		return false;
	},

	'change .dialog-selection' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromSelection(e, "elementStyle");
		return false;		
	},

});

Template.boxStyle.rendered = function() {
	Dialog.addColorPicker();
}

// End of style

function get_active_element_style_property(property) {

	var style = Configurator.getActiveElementStyleProperties();
	if (style) {
		var prop = style[property];
		if (typeof prop == "object") {
			return prop.join(", ");
		}
		else {
			return prop;
		}
	}
}



