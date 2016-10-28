

ExportDiagramConfig = function() {


	this.result = [];
}


ExportDiagramConfig.prototype = {

	export: function() {

		this.exportDiagramType();

		console.log("Result: ", this.result);

	},

	exportDiagramType: function() {

		var diagram_type = DiagramTypes.findOne({});
		// diagram_type._id = undefined;

		if (!diagram_type) {
			console.error("No diagram type");
			return;
		}

		var diagram_type_id = diagram_type._id;
			
		var diagram_type_out = {object: diagram_type,
								boxTypes: this.exportBoxTypes(diagram_type_id),
								lineTypes: this.exportLineTypes(diagram_type_id),
								paletteButtons: this.exportPalette(diagram_type_id),
								dialog: this.exportDiagramTypeDialog(diagram_type_id),
							};

		this.result.push(diagram_type_out);
	},

	exportBoxTypes: function(diagram_type_id) {

		var self = this;

		return ElementTypes.find({diagramTypeId: diagram_type_id, type: "Box"}).map(function(elem_type) {

			var elem_type_id = elem_type._id

			return {object: elem_type,
					compartmentTypes: self.exportCompartmentTypes(elem_type_id),
					dialog: self.exportElementTypeDialog(diagram_type_id, elem_type_id),
				};
		});
	},

	exportLineTypes: function(diagram_type_id) {

		var self = this;

		return ElementTypes.find({diagramTypeId: diagram_type_id, type: "Line"}).map(function(elem_type) {

			var elem_type_id = elem_type._id

			return {object: elem_type,
					compartmentTypes: self.exportCompartmentTypes(elem_type_id),
					dialog: self.exportElementTypeDialog(diagram_type_id, elem_type_id),
				};
		});

	},

	exportCompartmentTypes: function(elem_type_id) {

		var self = this;

		return CompartmentTypes.find({elementTypeId: elem_type_id}).map(function(compart_type) {
			return {object: compart_type};
		});
	},

	exportPalette: function(diagram_type_id) {
		return PaletteButtons.find({diagramTypeId: diagram_type_id}).fetch();
	},

	exportDiagramTypeDialog: function(diagram_type_id) {
		return DialogTabs.find({diagramTypeId: diagram_type_id, elementTypeId: {$exists: false},}).fetch();
	},

	exportElementTypeDialog: function(diagram_type_id, elem_type_id) {
		return DialogTabs.find({elementTypeId: elem_type_id,}).fetch();
	},

}




