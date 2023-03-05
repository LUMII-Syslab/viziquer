import { Configurator } from '/client/js/platform/configurator/config_utils'

// Start of context menu
Template.editContextMenu.helpers({

	menu: function() {
		return {
			collection: "ElementTypes",
			array: "contextMenu",

			items: Configurator.getKeystrokesOrItems("contextMenu"),
			dynamicContextMenu: {name: "dynamicContextMenu",
								value: Configurator.getActiveElementExtension("dynamicContextMenu"),
							}
		};
	},

});

// Start of context menu
Template.readContextMenu.helpers({

	menu: function() {
		return {
			collection: "ElementTypes",
			array: "readModeContextMenu",

			items: Configurator.getKeystrokesOrItems("readModeContextMenu"),
			dynamicContextMenu: {name: "dynamicReadModeContextMenu",
								value: Configurator.getActiveElementExtension("dynamicReadModeContextMenu"),
							}
		};
	},

});

Template.contextMenu.events({

	//adds context menu item
	'click #add-context-menu-item': function(e) {
		e.preventDefault();
		var src_parent = $(e.target).closest(".menu");

		var collection_meta_data = {collection: src_parent.attr("collection"),
									array: src_parent.attr("array"),
									fields: ["item", "procedure",]
								};

		Configurator.addKeystrokeOrItem(e, "addKeystrokeOrContextMenu", collection_meta_data);
	},

	//removes context menu item
	'click .remove-context-menu-item': function(e) {
		e.preventDefault();
		var src_parent = $(e.target).closest(".menu");

		var collection = {collection: src_parent.attr("collection"),
							array: src_parent.attr("array"),
						};

		Configurator.deleteKeystrokeOrItem(e, "deleteKeyStrokeOrContextMenu", collection);
	},

	//update context menu item name
	'blur .table-item': function(e) {
		var src = $(e.target).closest(".table-item");
		var src_parent = src.closest(".menu");

		var collection = {collection: src_parent.attr("collection"),
							array: src_parent.attr("array"),
							field: src.attr("attribute"),
						};

		Configurator.updateKeystrokeOrItem(e, "updateKeystrokeOrContextMenu", collection);
	},

	//updates dynamic context menu procedure	
	'blur .dialog-input' : function(e) {
		Configurator.updateElementFromInput(e, "updateConfiguratorExtension");
	},

});
// End of context menu
