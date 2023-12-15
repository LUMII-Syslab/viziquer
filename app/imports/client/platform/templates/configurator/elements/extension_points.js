import { Configurator } from '/client/js/platform/configurator/config_utils'

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

