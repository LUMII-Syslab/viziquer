
Meteor.methods({

	importAjooConfiguration: function(list) {

		var _import = new ImportAjooConfiguration(list.toolId, list.versionId);

		var data = list.data;
		_import.importDiagrams(data.presentations);
		_import.importDiagramTypes(data.types);
	},


	addConfiguratorExportButtonInToolbar: function() {

		var user_id = Meteor.userId();
		if (is_system_admin(user_id)) {

			var diagram_type = DiagramTypes.findOne({name: "_ConfiguratorDiagramType"});
			if (!diagram_type) {
				console.error("No configurator diagram type");
				return;
			}

			var toolbar = diagram_type.toolbar;

			var add_export_button = {id: generate_id(),
									icon: "fa-download",
									name: "Export configuration",
									procedure: "ExportDiagramConfiguration",
								};

			toolbar = _.union([add_export_button], toolbar);

			DiagramTypes.update({_id: diagram_type._id}, {$set: {toolbar: toolbar}});
		}

	},

});



function ImportAjooConfiguration(tool_id, version_id) {
	this.toolId = tool_id;
	this.versionId = version_id;
	this.obj_type_map = {};

	var diagram_type = DiagramTypes.findOne({name: "_ConfiguratorDiagramType"});
	if (!diagram_type) {
		console.error("No configurator diagram type");
		return;
	}

	this.diagram_type = diagram_type;

}

ImportAjooConfiguration.prototype = {

	importDiagramTypes: function(diagram_types) {

		var self = this;
		_.each(diagram_types, function(diagram_type_in) {

			var diagram_type = JSON.parse(JSON.stringify(diagram_type_in));

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


			self.importSuperTypes(diagram_type_in.boxTypes);
			self.importSuperTypes(diagram_type_in.lineTypes);
		});
	},

	importBoxTypes: function(box_types) {

		var self = this;

		_.each(box_types, function(box_type) {

			var object = box_type.object;
			var box_type_id = object._id;

			_.extend(object, {_id: undefined,
								diagramTypeId: self.obj_type_map[object.diagramTypeId],
								diagramId: self.obj_type_map[object.diagramId],
								elementId: self.obj_type_map[object.elementId],
								toolId: self.toolId,
								versionId: self.versionId,

								targetDiagramTypeId: self.obj_type_map[object.diagramTypeId],
							});

			var new_box_type_id = ElementTypes.insert(object);
			self.obj_type_map[box_type_id] = new_box_type_id;

			self.importDialogTypes(box_type);
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
								startElementTypeId: self.obj_type_map[object.startElementTypeId],
								endElementTypeId: self.obj_type_map[object.endElementTypeId],

								startElementId: self.obj_type_map[object.startElementId],
								endElementId: self.obj_type_map[object.endElementId],
								diagramId: self.obj_type_map[object.diagramId],
								elementId: self.obj_type_map[object.elementId],
								toolId: self.toolId,
								versionId: self.versionId,
							});

			var new_line_type_id = ElementTypes.insert(object);
			self.obj_type_map[line_type_id] = new_line_type_id;

			self.importDialogTypes(line_type);
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

								dialogTabId: self.obj_type_map[object.dialogTabId],

								toolId: self.toolId,
								versionId: self.versionId,

								label: object.label || object.name,
							});

			if (_.size(object.subCompartmentTypes) > 0) {
				object.subCompartmentTypes = self.recomputeSubCompartmentTypeLabels(object.subCompartmentTypes);
			}

			var new_copmart_type_id = CompartmentTypes.insert(object, {trimStrings: false});
			self.obj_type_map[compart_type_id] = new_copmart_type_id;
		});
	},


	recomputeSubCompartmentTypeLabels: function(sub_compart_types) {

		var self = this;

		return _.map(sub_compart_types, function(sub_compart_type) {
					_.extend(sub_compart_type, {label: sub_compart_type.label || sub_compart_type.name},)

					if (_.size(sub_compart_type.subCompartmentTypes) > 0) {
						sub_compart_type.subCompartmentTypes = self.recomputeSubCompartmentTypeLabels(sub_compart_type.subCompartmentTypes);
					}

					return sub_compart_type; 
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

	importDialogTypes: function(box_type) {

		var self = this;

		_.each(box_type.dialog, function(dialog) {

			var dialog_tab_id = dialog._id;
			_.extend(dialog, {_id: undefined,
								elementTypeId: self.obj_type_map[dialog.elementTypeId],
								diagramTypeId: self.obj_type_map[dialog.diagramTypeId],
								diagramId: self.obj_type_map[dialog.diagramId],
								toolId: self.toolId,
								versionId: self.versionId,
							});

			var new_dialog_tab_id = DialogTabs.insert(dialog);
			self.obj_type_map[dialog_tab_id] = new_dialog_tab_id;
		});
	},

	importSuperTypes: function(elem_type) {

		var self = this;
		var super_types = _.map(elem_type.superTypeIds, function(super_type_id) {
								return self.obj_type_map[super_type_id];
							});

		if (_.size(super_types)) {

			var elem_id = box_type.object._id;
			ElementTypes.update({_id: elem_id}, {superTypeIds: super_types});
		}

	},

	importDiagrams: function(diagrams) {

		var self = this;

		_.each(diagrams, function(diagram) {

			var object = diagram.object;
			var diagram_id = object._id;

			_.extend(object, {_id: undefined,
								toolId: self.toolId,
								versionId: self.versionId,
								diagramTypeId: self.diagram_type._id,
							});

			var new_diagram_id = Diagrams.insert(object);
			self.obj_type_map[diagram_id] = new_diagram_id;

			self.importBoxes(diagram.boxes);
			self.importLines(diagram.lines);
		});
	},

	importBoxes: function(boxes) {

		var self = this;

		var box_type = ElementTypes.findOne({type: "Box", diagramTypeId: self.diagram_type._id});
		if (!box_type) {
			console.error("No box type");
			return;
		}

		_.each(boxes, function(box) {

			var object = box.object;
			var box_id = object._id;

			_.extend(object, {_id: undefined,
								diagramId: self.obj_type_map[object.diagramId],
								toolId: self.toolId,
								versionId: self.versionId,
								diagramTypeId: self.diagram_type._id,
								elementTypeId: box_type._id,
							});

			var new_box_id = Elements.insert(object);
			self.obj_type_map[box_id] = new_box_id;

			self.importComparmtents(box.compartments);
		});
	},

	importLines: function(lines) {

		var self = this;

		var line_type = ElementTypes.findOne({type: "Line", name: "Line", diagramTypeId: self.diagram_type._id});
		if (!line_type) {
			console.error("No line types");
			return;
		}


		_.each(lines, function(line) {

			var object = line.object;
			var line_id = object._id;

			_.extend(object, {_id: undefined,
								diagramId: self.obj_type_map[object.diagramId],
								startElement: self.obj_type_map[object.startElement],
								endElement: self.obj_type_map[object.endElement],
								toolId: self.toolId,
								versionId: self.versionId,

								diagramTypeId: self.diagram_type._id,
								elementTypeId: line_type._id,
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

								diagramTypeId: self.diagram_type._id,
							});

			var new_compart_id = Compartments.insert(object);
			self.obj_type_map[compart_id] = new_compart_id;
		});

	},

}
