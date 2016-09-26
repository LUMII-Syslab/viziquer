
Template.editCollectionKeyStrokes.helpers({

	data: function() {
		return {
			collection: "DiagramTypes",
			array: "collectionKeyStrokes",
			
			keystrokes: Configurator.getKeystrokesOrItems("collectionKeyStrokes"),
		};
	},

});

Template.readCollectionKeyStrokes.helpers({

	data: function() {
		return {
			collection: "DiagramTypes",
			array: "readModeCollectionKeyStrokes",
			
			keystrokes: Configurator.getKeystrokesOrItems("readModeCollectionKeyStrokes"),
		};
	},

});
// End of read mode collection key strokes template

//Start of no collection key strokes
Template.editNoCollectionKeyStrokes.helpers({

	data: function() {
		return {
			collection: "DiagramTypes",
			array: "noCollectionKeyStrokes",
			
			keystrokes: Configurator.getKeystrokesOrItems("noCollectionKeyStrokes"),
		};
	},

});

Template.readNoCollectionKeyStrokes.helpers({

	data: function() {
		return {
			collection: "DiagramTypes",
			array: "readModeNoCollectionKeyStrokes",
			
			keystrokes: Configurator.getKeystrokesOrItems("readModeNoCollectionKeyStrokes"),
		};
	},

});
// End of no collection key strokes template
