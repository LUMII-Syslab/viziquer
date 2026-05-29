import { is_system_admin } from "../../../libs/platform/user_rights.js";
import { generate_id } from "../../../libs/platform/lib.js";
import {
  Tools,
  DiagramTypes,
  ElementTypes,
  CompartmentTypes,
  Diagrams,
  Elements,
  Compartments,
  DialogTabs,
  PaletteButtons,
} from "../../../db//platform/collections.js";

Meteor.methods({
  importAjooConfiguration: async function (list) {
    const _import = new ImportAjooConfiguration(list.toolId, list.versionId);
    await _import.init();

    const data = list.data;

    await _import.importTool(data.tool);
    await _import.importDiagrams(data.presentations);
    await _import.importDiagramTypes(data.types);
  },

  addConfiguratorExportButtonInToolbar: async function () {
    const user_id = Meteor.userId();
    if (await is_system_admin(user_id)) {
      const diagram_type = await DiagramTypes.findOneAsync({
        name: "_ConfiguratorDiagramType",
      });
      if (!diagram_type) {
        console.error("No configurator diagram type");
        return;
      }

      let toolbar = diagram_type.toolbar;

      const add_export_button = {
        id: generate_id(),
        icon: "fa-download",
        name: "Export configuration",
        procedure: "ExportDiagramConfiguration",
      };

      toolbar = _.union([add_export_button], toolbar);

      await DiagramTypes.updateAsync(
        { _id: diagram_type._id },
        { $set: { toolbar: toolbar } },
      );
    }
  },
});

function ImportAjooConfiguration(tool_id, version_id) {
  this.toolId = tool_id;
  this.versionId = version_id;
  this.obj_type_map = {};
  this.diagram_type = null;
}

ImportAjooConfiguration.prototype = {
  init: async function () {
    const diagram_type = await DiagramTypes.findOneAsync({
      name: "_ConfiguratorDiagramType",
    });
    if (!diagram_type) {
      console.error("No configurator diagram type");
      return;
    }

    this.diagram_type = diagram_type;
  },

  importTool: async function (tool) {
    await Tools.updateAsync(
      { _id: this.toolId },
      {
        $set: {
          toolbar: tool.toolbar,
          toolGroup: tool.toolGroup,
          extensionPoints: tool.extensionPoints,
        },
        // {$set: {name: tool.name, toolbar: tool.toolbar,}
      },
    );
  },

  importDiagramTypes: async function (diagram_types) {
    const self = this;

    for (const diagram_type_in of diagram_types) {
      const diagram_type = JSON.parse(JSON.stringify(diagram_type_in));
      const object = diagram_type.object;
      const diagram_type_id = object._id;

      Object.assign(object, {
        diagramId: self.obj_type_map[object.diagramId],
        toolId: self.toolId,
        versionId: self.versionId,
      });

      delete object._id;

      const new_diagram_type_id = await DiagramTypes.insertAsync(object);
      self.obj_type_map[diagram_type_id] = new_diagram_type_id;

      await self.importBoxTypes(diagram_type.boxTypes);
      await self.importLineTypes(diagram_type.lineTypes);
      await self.importPaletteButtons(diagram_type.paletteButtons);
      await self.importDiagramTypeDialogTypes(diagram_type);
      await self.importDiagramTypeCompartmentTypes(
        diagram_type.compartmentTypes,
      );
      await self.importSuperTypes(diagram_type_in.boxTypes);
      await self.importSuperTypes(diagram_type_in.lineTypes);
	  await self.importSubTypes(diagram_type_in.boxTypes);
    }
  },

  importBoxTypes: async function (box_types) {
    const self = this;

    for (const box_type of box_types) {
      const object = box_type.object;
      const box_type_id = object._id;

      Object.assign(object, {
        diagramTypeId: self.obj_type_map[object.diagramTypeId],
        diagramId: self.obj_type_map[object.diagramId],
        elementId: self.obj_type_map[object.elementId],
        toolId: self.toolId,
        versionId: self.versionId,
        targetDiagramTypeId: self.obj_type_map[object.diagramTypeId],
      });

      delete object._id;

      const new_box_type_id = await ElementTypes.insertAsync(object);
      self.obj_type_map[box_type_id] = new_box_type_id;

      // If these are async, use await:
      await self.importDialogTypes(box_type);
      await self.importCompartmentTypes(box_type.compartmentTypes);
    }
  },

  importLineTypes: async function (line_types) {
    const self = this;

    for (const line_type of line_types) {
      const object = line_type.object;
      const line_type_id = object._id;

      Object.assign(object, {
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

      delete object._id;

      const new_line_type_id = await ElementTypes.insertAsync(object);
      self.obj_type_map[line_type_id] = new_line_type_id;

      // If these are async, use await:
      await self.importDialogTypes(line_type);
      await self.importCompartmentTypes(line_type.compartmentTypes);
    }
  },

  importCompartmentTypes: async function (compart_types) {
    const self = this;

    for (const compart_type of compart_types) {
      const object = compart_type.object;
      const compart_type_id = object._id;

      Object.assign(object, {
        diagramTypeId: self.obj_type_map[object.diagramTypeId],
        elementTypeId: self.obj_type_map[object.elementTypeId],
        diagramId: self.obj_type_map[object.diagramId],
        elementId: self.obj_type_map[object.elementId],
        dialogTabId: self.obj_type_map[object.dialogTabId],
        toolId: self.toolId,
        versionId: self.versionId,
        label: object.label || object.name,
      });

      delete object._id;

      if (_.size(object.subCompartmentTypes) > 0) {
        object.subCompartmentTypes = self.recomputeSubCompartmentTypeLabels(
          object.subCompartmentTypes,
        );
      }

      const new_compart_type_id = await CompartmentTypes.insertAsync(object);
      // const new_compart_type_id = CompartmentTypes.insert(object, {trimStrings: false});
      self.obj_type_map[compart_type_id] = new_compart_type_id;
    }
  },

  importDiagramTypeCompartmentTypes: async function (compart_types) {
    const self = this;

    for (const compart_type of compart_types) {
      const object = compart_type.object;
      const compart_type_id = object._id;

      Object.assign(object, {
        diagramTypeId: self.obj_type_map[object.diagramTypeId],
        diagramId: self.obj_type_map[object.diagramId],
        elementId: self.obj_type_map[object.elementId],
        dialogTabId: self.obj_type_map[object.dialogTabId],
        toolId: self.toolId,
        versionId: self.versionId,
        label: object.label || object.name,
      });

      delete object._id;

      const new_compart_type_id = await CompartmentTypes.insertAsync(object);
      // const new_compart_type_id = CompartmentTypes.insert(object, {trimStrings: false});
      self.obj_type_map[compart_type_id] = new_compart_type_id;
    }
  },

  recomputeSubCompartmentTypeLabels: function (sub_compart_types) {
    const self = this;
    return _.map(sub_compart_types, function (sub_compart_type) {
      Object.assign(sub_compart_type, {
        label: sub_compart_type.label || sub_compart_type.name,
      });
      if (_.size(sub_compart_type.subCompartmentTypes) > 0) {
        sub_compart_type.subCompartmentTypes =
          self.recomputeSubCompartmentTypeLabels(
            sub_compart_type.subCompartmentTypes,
          );
      }
      return sub_compart_type;
    });
  },

  importPaletteButtons: async function (palette_buttons) {
    const self = this;

    for (const object of palette_buttons) {
      Object.assign(object, {
        diagramTypeId: self.obj_type_map[object.diagramTypeId],
        toolId: self.toolId,
        versionId: self.versionId,
      });

      delete object._id;

      object.elementTypeIds = _.map(
        object.elementTypeIds,
        function (elem_type_id) {
          return self.obj_type_map[elem_type_id];
        },
      );

      const count = await ElementTypes.find({
        _id: { $in: object.elementTypeIds },
        isAbstract: true,
      }).countAsync();

      if (count === 0) {
        const new_palette_button_id = await PaletteButtons.insertAsync(object);
      }
    }
  },

  importDiagramTypeDialogTypes: async function (diagram_type) {
    const self = this;

    for (const dialog of diagram_type.dialog) {
      const dialog_tab_id = dialog._id;
      Object.assign(dialog, {
        diagramTypeId: self.obj_type_map[dialog.diagramTypeId],
        diagramId: self.obj_type_map[dialog.diagramId],
        toolId: self.toolId,
        versionId: self.versionId,
      });

      delete dialog._id;

      const new_dialog_tab_id = await DialogTabs.insertAsync(dialog);
      self.obj_type_map[dialog_tab_id] = new_dialog_tab_id;
    }
  },

  importDialogTypes: async function (box_type) {
    const self = this;

    for (const dialog of box_type.dialog) {
      const dialog_tab_id = dialog._id;
      Object.assign(dialog, {
        elementTypeId: self.obj_type_map[dialog.elementTypeId],
        diagramTypeId: self.obj_type_map[dialog.diagramTypeId],
        diagramId: self.obj_type_map[dialog.diagramId],
        toolId: self.toolId,
        versionId: self.versionId,
      });

      delete dialog._id;

      const new_dialog_tab_id = await DialogTabs.insertAsync(dialog);
      self.obj_type_map[dialog_tab_id] = new_dialog_tab_id;
    }
  },

  //Elina modified, elem_type is list of BoxTypes or LineTypes from json
  //uses self.obj_type_map dictionary jsonIds to DB Ids
  //et.object.superTypeIds in json are replaced with corresponding element Ids in DB
  importSuperTypes: function (elem_type) {
    const self = this;
    _.each(elem_type, async function (et) {
      const super_types = _.map(
        et.object.superTypeIds,
        function (super_type_id) {
          return self.obj_type_map[super_type_id];
        },
      );

      if (_.size(super_types)) {
        const elem_id_json = et.object._id;
        const elem_id = self.obj_type_map[elem_id_json];
        await ElementTypes.updateAsync(
          { _id: elem_id },
          { $set: { superTypeIds: super_types } },
        );
      }
    });
  },
  
  importSubTypes: function (elem_type) {
    const self = this;
    _.each(elem_type, async function (et) {
      const sub_types = _.map(
        et.object.subTypeIds,
        function (sub_type_id) {
          return self.obj_type_map[sub_type_id];
        },
      );

      if (_.size(sub_types)) {
        const elem_id_json = et.object._id;
        const elem_id = self.obj_type_map[elem_id_json];
        await ElementTypes.updateAsync(
          { _id: elem_id },
          { $set: { subTypeIds: sub_types } },
        );
      }
    });
  },

  importDiagrams: async function (diagrams) {
    const self = this;

    for (const diagram of diagrams) {
      const object = diagram.object;
      const diagram_id = object._id;

      Object.assign(object, {
        toolId: self.toolId,
        versionId: self.versionId,
        diagramTypeId: self.diagram_type._id,
      });

      delete object._id;

      const new_diagram_id = await Diagrams.insertAsync(object);
      self.obj_type_map[diagram_id] = new_diagram_id;

      await self.importBoxes(diagram.boxes);
      await self.importLines(diagram.lines);
    }
  },

  importBoxes: async function (boxes) {
    const self = this;

    const box_type = await ElementTypes.findOneAsync({
      type: "Box",
      diagramTypeId: self.diagram_type._id,
    });
    if (!box_type) {
      console.error("No box type");
      return;
    }

    for (const box of boxes) {
      const object = box.object;
      const box_id = object._id;

      Object.assign(object, {
        diagramId: self.obj_type_map[object.diagramId],
        toolId: self.toolId,
        versionId: self.versionId,
        diagramTypeId: self.diagram_type._id,
        elementTypeId: box_type._id,
      });

      delete object._id;

      const new_box_id = await Elements.insertAsync(object);
      self.obj_type_map[box_id] = new_box_id;

      await self.importCompartments(box.compartments);
    }
  },

  importLines: async function (lines) {
    const self = this;

    const line_type = await ElementTypes.findOneAsync({
      type: "Line",
      name: "Line",
      diagramTypeId: self.diagram_type._id,
    });
    if (!line_type) {
      console.error("No line types");
      return;
    }

    for (const line of lines) {
      const object = line.object;
      const line_id = object._id;

      Object.assign(object, {
        diagramId: self.obj_type_map[object.diagramId],
        startElement: self.obj_type_map[object.startElement],
        endElement: self.obj_type_map[object.endElement],
        toolId: self.toolId,
        versionId: self.versionId,
        diagramTypeId: self.diagram_type._id,
        elementTypeId: line_type._id,
      });

      delete object._id;

      const new_line_id = await Elements.insertAsync(object);
      self.obj_type_map[line_id] = new_line_id;

      await self.importCompartments(line.compartments);
    }
  },

  importCompartments: async function (comparts) {
    const self = this;

    for (const compart of comparts) {
      const object = compart.object;
      const compart_id = object._id;

      Object.assign(object, {
        diagramId: self.obj_type_map[object.diagramId],
        elementId: self.obj_type_map[object.elementId],
        toolId: self.toolId,
        versionId: self.versionId,
        diagramTypeId: self.diagram_type._id,
      });

      delete object._id;

      const new_compart_id = await Compartments.insertAsync(object);
      self.obj_type_map[compart_id] = new_compart_id;
    }
  },
};

export { ImportAjooConfiguration };
