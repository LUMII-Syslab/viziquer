

ExportDiagramConfig = function() {
	this.types = [];
	this.presentations = [];
}

ExportDiagramConfig.prototype = {

	export: function() {

		this.exportDiagramTypes();
		this.exportDiagrams();

		return {types: this.types, presentations: this.presentations,};
	},

	exportDiagramTypes: function() {

		var diagram_type = DiagramTypes.findOne({name: {$not: "_ConfiguratorDiagramType"}});
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

		this.types.push(diagram_type_out);
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

	exportDiagrams: function() {

		var self = this;

		var diagram = Diagrams.findOne();
		if (!diagram) {
			console.error("No diagram");
			return;
		}

		var diagram_id = diagram._id;
		self.exportBoxes(diagram_id);
		self.exportLines(diagram_id);

		var diagram_out = {object: diagram,
							boxes: self.exportBoxes(diagram_id),
							lines: self.exportLines(diagram_id),
						};

		self.presentations.push(diagram_out);
	},

	exportBoxes: function(diagram_id) {

		var self = this;

		return Elements.find({type: "Box", diagramId: diagram_id,}).map(function(box) {
			return {object: box,
					compartments: self.exportCompartments(box._id),
				};
		});
	},

	exportLines: function(diagram_id) {

		var self = this;

		return Elements.find({type: "Line", diagramId: diagram_id,}).map(function(line) {
			return {object: line,
					compartments: self.exportCompartments(line._id),
				};
		});
	},

	exportCompartments: function(element_id) {

		var self = this;

		return Compartments.find({elementId: element_id}).map(function(compart) {
			return {object: compart};
		});
	},

}


export_diagram_configuration = function() {

	var config_export = new ExportDiagramConfig();
	var list = {config: config_export.export(),
				toolId: Session.get("toolId"),
				versionId: Session.get("toolVersionId"),
			};

	console.log("list ", list)

	Utilities.callMeteorMethod("importAjooConfiguration", list);

}



