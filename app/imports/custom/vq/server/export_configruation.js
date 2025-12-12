import { Tools, DiagramTypes, ElementTypes, CompartmentTypes, Diagrams, Elements, Compartments, DialogTabs, PaletteButtons } from '../../../db/platform/collections.js'


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

function ExportDiagramConfig() {
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

	exportTool: async function(tool_id) {
		var tool = await Tools.findOneAsync({_id: tool_id});
		if (tool) {
			_.extend(this.tool, {name: tool.name, toolbar: tool.toolbar})
		}
	},

	exportDiagramTypes: async function(tool_id) {
		var self = this;

		// var diagram_type = DiagramTypes.findOne({toolId: tool_id});
		this.types = await DiagramTypes.find({toolId: tool_id}).mapAsync(function(diagram_type) {

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

	exportBoxTypes: async function(diagram_type_id) {

		var self = this;

		return await ElementTypes.find({diagramTypeId: diagram_type_id, type: "Box"}).mapAsync(function(elem_type) {

			var elem_type_id = elem_type._id

			return {object: elem_type,
					compartmentTypes: self.exportCompartmentTypes(elem_type_id),
					dialog: self.exportElementTypeDialog(diagram_type_id, elem_type_id),
				};
		});
	},

	exportLineTypes: async function(diagram_type_id) {

		var self = this;

		return await ElementTypes.find({diagramTypeId: diagram_type_id, type: "Line"}).mapAsync(function(elem_type) {

			var elem_type_id = elem_type._id

			return {object: elem_type,
					compartmentTypes: self.exportCompartmentTypes(elem_type_id),
					dialog: self.exportElementTypeDialog(diagram_type_id, elem_type_id),
				};
		});

	},

	exportDiagramTypeCompartmentTypes: async function(diagram_type_id) {

		var self = this;

		return await CompartmentTypes.find({diagramTypeId: diagram_type_id, elementTypeId: {$exists: false}}).mapAsync(function(compart_type) {
			return {object: compart_type,};
		});
	},



	exportCompartmentTypes: async function(elem_type_id) {

		var self = this;

		return await CompartmentTypes.find({elementTypeId: elem_type_id}).mapAsync(function(compart_type) {
			return {object: compart_type,};
		});
	},

	exportPalette: async function(diagram_type_id) {
		return await PaletteButtons.find({diagramTypeId: diagram_type_id}).fetchAsync();
	},

	exportDiagramTypeDialog: async function(diagram_type_id) {
		return await DialogTabs.find({diagramTypeId: diagram_type_id, elementTypeId: {$exists: false},}).fetchAsync();
	},

	exportElementTypeDialog: async function(diagram_type_id, elem_type_id) {
		return await DialogTabs.find({elementTypeId: elem_type_id,}).fetchAsync();
	},

	exportDiagrams: async function(tool_id) {

		var self = this;

		self.presentations = await Diagrams.find({toolId: tool_id,}).mapAsync(function(diagram) {

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

	exportBoxes: async function(diagram_id) {

		var self = this;

		return await Elements.find({type: "Box", diagramId: diagram_id,}).mapAsync(function(box) {
			return {object: box,
					compartments: self.exportCompartments(box._id),
				};
		});
	},

	exportLines: async function(diagram_id) {

		var self = this;

		return await Elements.find({type: "Line", diagramId: diagram_id,}).mapAsync(function(line) {
			return {object: line,
					compartments: self.exportCompartments(line._id),
				};
		});
	},

	exportCompartments: async function(element_id) {

		var self = this;

		return await Compartments.find({elementId: element_id}).mapAsync(function(compart) {
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



export {
  ExportDiagramConfig,
}
