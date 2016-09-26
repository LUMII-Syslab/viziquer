
// Start of collection context menu template
Template.editCollectionContextMenu.helpers({

	menu: function() {
		return {
			collection: "DiagramTypes",
			array: "collectionContextMenu",

			items: Configurator.getKeystrokesOrItems("collectionContextMenu"),
			dynamicContextMenu: {name: "dynamicCollectionContextMenu",
								value: get_diagram_type_extension_point("dynamicCollectionContextMenu"),
							}
		};
	},

});

// Start of collection context menu template
Template.readCollectionContextMenu.helpers({

	menu: function() {
		return {
			collection: "DiagramTypes",
			array: "readModeCollectionContextMenu",

			items: Configurator.getKeystrokesOrItems("readModeCollectionContextMenu"),
			dynamicContextMenu: {name: "dynamicReadModeCollectionContextMenu",
								value: get_diagram_type_extension_point("dynamicReadModeCollectionContextMenu"),
							}
		};
	},
});


//Start of no collection context menu template
Template.editNoCollectionContextMenu.helpers({

	menu: function() {
		return {
			collection: "DiagramTypes",
			array: "noCollectionContextMenu",

			items: Configurator.getKeystrokesOrItems("noCollectionContextMenu"),
			dynamicContextMenu: {name: "dynamicNoCollectionContextMenu",
								value: get_diagram_type_extension_point("dynamicNoCollectionContextMenu"),
							}
		};
	},

});

//Start of read no collection context menu template
Template.readNoCollectionContextMenu.helpers({

	menu: function() {
		return {
			collection: "DiagramTypes",
			array: "readModeNoCollectionContextMenu",

			items: Configurator.getKeystrokesOrItems("readModeNoCollectionContextMenu"),
			dynamicContextMenu: {name: "dynamicReadModeNoCollectionContextMenu",
								value: get_diagram_type_extension_point("dynamicReadModeNoCollectionContextMenu"),
							}
		};
	},

});
//End of read no collection context menu template

function get_diagram_type_extension_point(extension_point_name) {
	var diagram_type = DiagramTypes.findOne({diagramId: Session.get("activeDiagram")});
	if (diagram_type) {
		var res = _.find(diagram_type["extensionPoints"], function(extensionPoint) {
			return extensionPoint["extensionPoint"] === extension_point_name;
		});

		if (res) {
			return res.procedure;
		}
		else {
			return "";
		}

	}
}