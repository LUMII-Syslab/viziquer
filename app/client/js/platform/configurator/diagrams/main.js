import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Configurator } from '/client/js/platform/configurator/config_utils'
import { ElementTypes } from '/libs/platform/collections'


Template.configuratorDiagramTemplate.helpers({
	isReady: function() {
		return FlowRouter.subsReady("ConfiguratorDiagram");
	},

	activeElementType: function() {
		var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
		if (elem_type && elem_type["name"] != "Specialization")
			return true;
		else
			return;
	},

	activeDiagramType: function() {
		if (Session.get("activeElementType"))
			return;
		else
			return true;
	},
});

Template.configuratorDiagramDialog.helpers({

	is_palette_needed: function() {
		return is_ajoo_editor();
	},

});


// Start of diagram accordion
Template.diagramMain.helpers({

	diagramName: function() {
		return Configurator.getDiagramTypeProperty("name");
	},
});

Template.diagramMain.events({

	'blur .dialog-input' : function(e) {
		Configurator.updateObjectType(e);	
	},
});
//End of diagram accordion

