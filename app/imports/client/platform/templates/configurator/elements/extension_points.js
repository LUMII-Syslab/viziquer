import { Configurator } from '/imports/client/platform/templates/configurator/config_utils'

import './extension_points.html'

// Start of element extensions
Template.elementExtensions.helpers({
	beforeCreateElement: function() {
		return Configurator.getActiveElementExtension("beforeCreateElement");
	},

	afterCreateElement: function() {
		return Configurator.getActiveElementExtension("afterCreateElement");
	},

	createElement: function() {
		return Configurator.getActiveElementExtension("createElement");
	},

	resizeElement: function() {
		return Configurator.getActiveElementExtension("resizeElement");
	},
});

Template.elementExtensions.events({

	'blur .dialog-input': function(e) {
		Configurator.updateElementFromInput(e, "updateConfiguratorExtension");
	},

});

