
// Start of element accordion
Template.elementAccordion.helpers({

	activeElement: function() {
		if (Session.get("activeElement")) {
			return true;
		}
	},

	diagramName: function() {
		var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
		if (diagram) {
			return diagram["name"];
		}
	},
});
// End of element accordion

// Start of element main
Template.elementMain.helpers({

	active_elem_type: function() {
		var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		if (!elem_type) {
			return;
		}

		else {
			return {
				_id: elem_type["_id"],
				name: elem_type["name"],
				
				is_line: function() {
					if (elem_type["type"] == "Line") {
						return true;
					}
				},

				directions: function() {
					var options = [{option: "Directional"},
									{option: "BiDirectional"},
									{option: "ReverseDirectional"}];

					//sets which option is selected
					for (var i=0;i<options.length;i++) {
						var option = options[i];
						if (option["option"] == elem_type["direction"]) {
							option["selected"] = "selected";
							break;
						}
					}

					return options;
				},

				lineTypes: function() {
					var options = [{option: "Orthogonal"},
									{option: "Direct"},];

					//sets which option is selected
					for (var i=0;i<options.length;i++) {
						var option = options[i];
						if (option["option"] == elem_type["lineType"]) {
							option["selected"] = "selected";
							break;
						}
					}

					return options;
				},

				checked: function() {
					if (elem_type["isAbstract"])
						return "checked";
					else
						return "";
				},

				defaultFixedSize: function() {
					return elem_type.defaultFixedSize

				},

			}
		}
	},
});

Template.elementMain.events({

	//updates element fields
	'blur .dialog-input' : function(e) {
		Configurator.updateObjectType(e);
	},

	'change .dialog-selection' : function(e) {
		var pair = Configurator.selectSelectionValue(e);
		Configurator.updateObjectTypeObj(pair["_attr"], pair["_value"]);
	},

	'change .dialog-checkbox' : function(e) {
		var src = $(e.target);
		Configurator.updateObjectTypeObj(src.attr("id"), src.prop('checked'));
	},

});
// End of element main

