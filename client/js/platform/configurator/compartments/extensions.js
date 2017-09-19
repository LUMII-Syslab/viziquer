
Template.compartmentExtensions.helpers({
	extensions: function() {
		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (compart_type && compart_type["extensionPoints"]) {
			var extension_points = compart_type["extensionPoints"];

			//checking if the compart type widget is selection or radio
			var extensions = {};
			if (compart_type && compart_type["inputType"]) {
				var input_type = compart_type["inputType"]["type"];
				if (input_type === "selection" || input_type === "radio" || input_type === "combobox") {
			 		extensions["isDropDown"] = true;
			 	}
			}

			//transforming from array to object
			_.each(extension_points, function(extension_point) {
				extensions[extension_point["extensionPoint"]] = extension_point["procedure"];
			});

			return extensions;	
		}
	},
});

Template.compartmentExtensions.events({

	'blur .dialog-input' : function(e) {
		update_comparment_type_extension_point(e);
	},

});

function update_comparment_type_extension_point(e) {
	var update = Configurator.getInputFieldValue(e);

	var list = {diagramId: Session.get("activeDiagram"),
				projectId: Session.get("activeProject"),
				toolId: Session.get("toolId"),
				compartmentTypeId: Session.get("compartmentTargetTypeId"),
				update: update};

	Utilities.callMeteorMethod("updateConfiguratorExtension", list);
}
