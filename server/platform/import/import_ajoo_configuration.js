
Meteor.methods({

	importAjooConfiguration: function(list) {

		var config = list.config;

		var _import = new ImportAjooConfiguration(list.toolId, list.versionId);
		_import.importDiagrams(config.presentations);
		_import.importDiagramTypes(config.types);

		console.log("import ended");
	},

});


function ImportAjooConfiguration(tool_id, version_id) {
	this.toolId = tool_id;
	this.versionId = version_id;
	this.obj_type_map = {};
}

ImportAjooConfiguration.prototype = {

	importDiagramTypes: function(diagram_types) {

		var self = this;
		_.each(diagram_types, function(diagram_type) {

			var object = diagram_type.object;
			var diagram_type_id = object._id;
			_.extend(object, {_id: undefined,
								diagramId: self.obj_type_map[object.diagramId],
								toolId: self.toolId,
								versionId: self.versionId,
							});

			var new_diagram_type_id = DiagramTypes.insert(object);
			self.obj_type_map[diagram_type_id] = new_diagram_type_id;

			self.importBoxTypes(diagram_type.boxTypes);
			self.importLineTypes(diagram_type.lineTypes);

			self.importPaletteButtons(diagram_type.paletteButtons);
		});
	},

	importBoxTypes: function(box_types) {

		var self = this;
		_.each(box_types, function(box_type) {

			var object = box_type.object;
			var box_type_id = object._id;

			var x = object.elementId;

			console.log("old box id ", x)
			console.log("new box ic ", self.obj_type_map[x]);

			_.extend(object, {_id: undefined,
								diagramTypeId: self.obj_type_map[object.diagramTypeId],
								diagramId: self.obj_type_map[object.diagramId],
								elementId: self.obj_type_map[object.elementId],
								toolId: self.toolId,
								versionId: self.versionId,
							});

			console.log("obj ", object)


			var new_box_type_id = ElementTypes.insert(object);
			self.obj_type_map[box_type_id] = new_box_type_id;
			self.importCompartmentTypes(box_type.compartmentTypes);
		});
	},

	importLineTypes: function(line_types) {

		var self = this;
		_.each(line_types, function(line_type) {

			var object = line_type.object;
			var line_type_id = object._id;
			_.extend(object, {_id: undefined,
								diagramTypeId: self.obj_type_map[object.diagramTypeId],
								startElementId: self.obj_type_map[object.startElementId],
								endElementId: self.obj_type_map[object.endElementId],
								diagramId: self.obj_type_map[object.diagramId],
								elementId: self.obj_type_map[object.elementId],
								toolId: self.toolId,
								versionId: self.versionId,
							});

			var new_line_type_id = ElementTypes.insert(object);
			self.obj_type_map[line_type_id] = new_line_type_id;
			self.importCompartmentTypes(line_type.compartmentTypes);
		});
	},

	importCompartmentTypes: function(compart_types) {

		var self = this;
		_.each(compart_types, function(compart_type) {

			var object = compart_type.object;
			var compart_type_id = object._id;

			_.extend(object, {_id: undefined,
								diagramTypeId: self.obj_type_map[object.diagramTypeId],
								elementTypeId: self.obj_type_map[object.elementTypeId],

								diagramId: self.obj_type_map[object.diagramId],
								elementId: self.obj_type_map[object.elementId],

								toolId: self.toolId,
								versionId: self.versionId,
							});

			var new_copmart_type_id = CompartmentTypes.insert(object);
			self.obj_type_map[compart_type_id] = new_copmart_type_id;
		});
	},

	importPaletteButtons: function(palette_buttons) {

		var self = this;
		_.each(palette_buttons, function(object) {

			_.extend(object, {_id: undefined,
								diagramTypeId: self.obj_type_map[object.diagramTypeId],
								toolId: self.toolId,
								versionId: self.versionId,
							});

			object.elementTypeIds = _.map(object.elementTypeIds, function(elem_type_id) {
				return self.obj_type_map[elem_type_id];
			});

			var new_palette_button_id = PaletteButtons.insert(object);
		});
	},

	importDiagrams: function(diagrams) {

		var self = this;
		_.each(diagrams, function(diagram) {

			var object = diagram.object;
			var diagram_id = object._id;

			_.extend(object, {_id: undefined,
								toolId: self.toolId,
								versionId: self.versionId,
							});

			var new_diagram_id = Diagrams.insert(object);
			self.obj_type_map[diagram_id] = new_diagram_id;

			self.importBoxes(diagram.boxes);
			self.importLines(diagram.lines);
		});
	},

	importBoxes: function(boxes) {

		var self = this;
		_.each(boxes, function(box) {

			var object = box.object;
			var box_id = object._id;

			_.extend(object, {_id: undefined,
								diagramId: self.obj_type_map[object.diagramId],
								toolId: self.toolId,
								versionId: self.versionId,
							});

			var new_box_id = Elements.insert(object);
			self.obj_type_map[box_id] = new_box_id;

			self.importComparmtents(box.compartments);
		});
	},

	importLines: function(lines) {

		var self = this;	
		_.each(lines, function(line) {

			var object = line.object;
			var line_id = object._id;

			_.extend(object, {_id: undefined,
								diagramId: self.obj_type_map[object.diagramId],
								startElement: self.obj_type_map[object.startElement],
								endElement: self.obj_type_map[object.endElement],
								toolId: self.toolId,
								versionId: self.versionId,
							});

			var new_line_id = Elements.insert(object);
			self.obj_type_map[line_id] = new_line_id;

			self.importComparmtents(line.compartments);

		});
	},

	importComparmtents: function(comparts) {

		var self = this;
		_.each(comparts, function(compart) {

			var object = compart.object;
			var compart_id = object._id;

			_.extend(object, {_id: undefined,
								diagramId: self.obj_type_map[object.diagramId],
								elementId: self.obj_type_map[object.elementId],
								toolId: self.toolId,
								versionId: self.versionId,
							});

			var new_compart_id = Compartments.insert(object);
			self.obj_type_map[compart_id] = new_compart_id;
		});

	},

}