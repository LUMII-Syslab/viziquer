import { Tools, DiagramTypes, ElementTypes, CompartmentTypes, Diagrams, Elements, Compartments, DialogTabs, PaletteButtons } from '/libs/platform/collections'


Meteor.methods({

	exportToolConfiguration: function(list) {

		var export_tool = new ExportDiagramConfig();
		var res = export_tool.export(list.toolId);

		return JSON.stringify(res, null, 2);

		// var path = process.env.PWD;
		// var fs = Npm.require('fs');
		// fs.writeFile(path + '/jsons/confguration_dump.json', json, 'utf8');
	},

});

ExportDiagramConfig = function() {
	this.tool = {};
	this.types = [];
	this.presentations = [];
}

ExportDiagramConfig.prototype = {

	export: function(tool_id) {

		this.exportTool(tool_id);
		this.exportDiagramTypes(tool_id);
		this.exportDiagrams(tool_id);

		return {tool: this.tool, types: this.types, presentations: this.presentations,};
	},

	exportTool: function(tool_id) {
		var tool = Tools.findOne({_id: tool_id});
		if (tool) {
			_.extend(this.tool, {name: tool.name, toolbar: tool.toolbar})
		}
	},

	exportDiagramTypes: function(tool_id) {
		var self = this;

		// var diagram_type = DiagramTypes.findOne({toolId: tool_id});
		this.types = DiagramTypes.find({toolId: tool_id}).map(function(diagram_type) {

						if (!diagram_type) {
							console.error("No diagram type");
							return;
						}

						var diagram_type_id = diagram_type._id;
							
						var diagram_type_out = {object: diagram_type,
												dialog: self.exportDiagramTypeDialog(diagram_type_id),
												compartmentTypes: self.exportDiagramTypeCompartmentTypes(diagram_type_id),
												boxTypes: self.exportBoxTypes(diagram_type_id),
												lineTypes: self.exportLineTypes(diagram_type_id),
												paletteButtons: self.exportPalette(diagram_type_id),
											};

						return diagram_type_out;
					});

			// this.types.push(diagram_type_out);
		// }
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

	exportDiagramTypeCompartmentTypes: function(diagram_type_id) {

		var self = this;

		return CompartmentTypes.find({diagramTypeId: diagram_type_id, elementTypeId: {$exists: false}}).map(function(compart_type) {
			return {object: compart_type,};
		});
	},



	exportCompartmentTypes: function(elem_type_id) {

		var self = this;

		return CompartmentTypes.find({elementTypeId: elem_type_id}).map(function(compart_type) {
			return {object: compart_type,};
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

	exportDiagrams: function(tool_id) {

		var self = this;

		self.presentations = Diagrams.find({toolId: tool_id,}).map(function(diagram) {

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

			return diagram_out;
		});

		// self.presentations.push(diagram_out);
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


// export_diagram_configuration = function() {

// 	var config_export = new ExportDiagramConfig();
// 	var list = {config: config_export.export(),
// 				toolId: Session.get("toolId"),
// 				versionId: Session.get("toolVersionId"),
// 			};

// 	console.log("list ", list)

// 	Utilities.callMeteorMethod("importAjooConfiguration", list);

// }



