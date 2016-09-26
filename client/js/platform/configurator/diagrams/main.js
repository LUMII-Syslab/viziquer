
Template.configuratorDiagramTemplate.helpers({
	activeElementType: function() {
		var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
		if (elem_type && elem_type["name"] != "Specialization") {
			return true;
		}
	},

	activeDiagramType: function() {
		return !Session.get("activeElementType");
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

