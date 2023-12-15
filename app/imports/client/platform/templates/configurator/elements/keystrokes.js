import { Configurator } from '/imports/client/platform/templates/configurator/config_utils'

import './keystrokes.html'

// Start of keystrokes tab
Template.editKeystroke.helpers({

	data: function() {
		return {
			collection: "ElementTypes",
			array: "keyStrokes",
			
			keystrokes: Configurator.getKeystrokesOrItems("keyStrokes"),
		};
	},

});

Template.readKeystroke.helpers({
	
	data: function() {
		return {
			collection: "ElementTypes",
			array: "readModeKeyStrokes",

			keystrokes: Configurator.getKeystrokesOrItems("readModeKeyStrokes"),
		};
	},

});


Template.keystroke.events({

	//adds key stroke
	'click #add-keystroke': function(e) {

		e.preventDefault();
		var src_parent = $(e.target).closest(".menu");

		var collection_meta_data = {collection: src_parent.attr("collection"),
									array: src_parent.attr("array"),
									fields: ["keyStroke", "procedure"],
								};

		Configurator.addKeystrokeOrItem(e, "addKeystrokeOrContextMenu", collection_meta_data);
	},

	//removes key stroke
	'click .remove-keystroke': function(e) {

		e.preventDefault();
		var src_parent = $(e.target).closest(".menu");

		var collection = {collection: src_parent.attr("collection"),
							array: src_parent.attr("array"),
						};

		Configurator.deleteKeystrokeOrItem(e, "deleteKeyStrokeOrContextMenu", collection);
	},

	//updates key stroke
	'blur .table-item': function(e) {

		var src = $(e.target).closest(".table-item");
		var src_parent = src.closest(".menu");

		var collection = {collection: src_parent.attr("collection"),
							array: src_parent.attr("array"),
							field: src.attr("attribute"),
						};

		Configurator.updateKeystrokeOrItem(e, "updateKeystrokeOrContextMenu", collection);
	},
});
// End of keystrokes tab


