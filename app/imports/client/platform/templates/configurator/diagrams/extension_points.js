import { Configurator } from '/client/js/platform/configurator/config_utils'
import { DiagramTypes } from '/libs/platform/collections'

//Start of diagram extensions

Template.diagramExtensions.helpers({

	extensions: function() {
		return get_diagram_type_extension_points();
	},
});

Template.diagramExtensions.events({

	'blur .dialog-input' : function(e) {

		Configurator.updateDiagramFromInput(e, "updateConfiguratorExtension");
	},
});

//End of diagram extensions

Template.collectionExtensions.helpers({
	extensions: function() {
		return get_diagram_type_extension_points();
	},
});

Template.collectionExtensions.events({

	'blur .dialog-input' : function(e) {
		Configurator.updateDiagramFromInput(e, "updateConfiguratorExtension");
	},
});

function get_diagram_type_extension_points() {
	var diagram_type = DiagramTypes.findOne({diagramId: Session.get("activeDiagram")});
	if (diagram_type) {
		var res = {};
		
		_.each(diagram_type["extensionPoints"], function(extension_point) {
			res[extension_point["extensionPoint"]] = extension_point["procedure"];
		});

		return res;
	}
}
