import { Configurator } from '/client/js/platform/configurator/config_utils'
import { Utilities } from '/client/js/platform/utilities/utils'
import { DiagramTypes, Diagrams } from '/libs/platform/collections'

// Start of diagram style accordion
Template.diagramStyle.helpers({
	is_edit_mode: function() {
		return Session.get("editMode");
	},

	fill_priority: function() {
		var style = get_diagram_style();
		if (style) {
			var fill_priority = style["fillPriority"];
			return Configurator.computeFillPriority(fill_priority);
		}
	},
});

Template.diagramStyle.events({
	'change .dialog-selection' : function(e) {
		update_diagram_style_from_selection(e);
	},
});

Template.diagramColor.helpers({
	style: function() {
		return get_diagram_style();
	},
});

Template.diagramColor.events({
	'blur .dialog-input' : function(e) {
		e.preventDefault();
		update_diagram_style_from_input(e);
		return false;
	},
});

Template.diagramLinearGradient.events({
	'blur .dialog-input' : function(e) {
		e.preventDefault();
		update_diagram_style_from_input(e);
		return false;
	},
});

Template.diagramLinearGradient.helpers({
	style: function() {
		return get_diagram_style();
	},
});

Template.diagramRadialGradient.events({
	'blur .dialog-input' : function(e) {
		e.preventDefault();
		update_diagram_style_from_input(e);
		return false;
	},
});

Template.diagramRadialGradient.helpers({
	style: function() {
		return get_diagram_style();
	},
});

function get_diagram_style() {
	var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
	if (diagram) {
		return diagram["style"];
	}
}

function update_diagram_style_from_selection(e) {
	var pair = Configurator.selectSelectionValue(e);
	var attr_name = pair["_attr"];
	var attr_value = pair["_value"];

	update_diagram_style(attr_name, attr_value);
}

function update_diagram_style_from_input(e) {
	var pair = Configurator.getInputFieldValue(e);
	var attr_name = pair["_attr"];
	var attr_value = pair["_value"];

	update_diagram_style(attr_name, attr_value);
}


//Update functions

function update_diagram_style(attr_name, attr_value) {

	var target_diagram_type = DiagramTypes.findOne({diagramId: Session.get("activeDiagram")});
	
	//updating the diagram type
	if (target_diagram_type) {

		var list = {id: target_diagram_type["_id"],
					diagramId: Session.get("activeDiagram"),
					toolId: Session.get("toolId"),
					versionId: Session.get("toolVersionId"),
					attrName: attr_name,
					attrValue: attr_value,
				};

		Utilities.callMeteorMethod("updateDiagramTypeStyle", list);
	}
	
	//updating the diagram
	else {
		var list = {id: Session.get("activeDiagram"),
					attrName: attr_name,
					attrValue: attr_value,
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

		Utilities.callMeteorMethod("updateDiagramStyle", list);
	}
}

