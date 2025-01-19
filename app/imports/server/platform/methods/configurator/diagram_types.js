import { DiagramTypes, ElementTypes, CompartmentTypes, DialogTabs, PaletteButtons, Diagrams, ImportedTranslets } from '/imports/db/platform/collections';
import { is_system_admin } from '/imports/libs/platform/user_rights'
import { diagram_default_style, build_initial_diagram_type } from './initialTypes/diagram_types'
import { error_msg } from '../../_global_functions';


DiagramTypes.after.update(async function (user_id, doc, fields, modifier, options) {

  if (!modifier || !modifier.$set)
    return false;

  //if updated the configurator diagram type's name, then updating the diagram's name as well
  if (fields && fields.length == 1 && fields[0] == "name")
    await Diagrams.updateAsync({ _id: doc["diagramId"] }, modifier);
});

DiagramTypes.after.remove(async function (user_id, doc) {
  if (!doc)
    return false;

  await ElementTypes.removeAsync({ diagramTypeId: doc["_id"] });
  await Diagrams.removeAsync({ diagramTypeId: doc["_id"] });
  await ImportedTranslets.removeAsync({ diagramTypeId: doc["_id"] });

});


Meteor.methods({

  insertDiagramType: async function (list) {

    var user_id = Meteor.userId();
    if (is_system_admin(user_id) && list) {

      var time = new Date();
      var style = diagram_default_style();

      var dgr_list = {};
      dgr_list["name"] = list["name"];
      dgr_list["diagramTypeId"] = list["diagramTypeId"];
      dgr_list["toolId"] = list["toolId"];
      dgr_list["versionId"] = list["versionId"];
      dgr_list["style"] = style;

      dgr_list["createdAt"] = time;
      dgr_list["createdBy"] = user_id;
      dgr_list["editorType"] = list["editorType"];

      dgr_list["imageUrl"] = "http://placehold.it/770x347";
      //dgr_list["edit"] = {action: "new", time: time, userId: user_id};
      dgr_list["parentDiagrams"] = [];
      dgr_list["allowedGroups"] = [];
      dgr_list["editing"] = { userId: user_id, startedAt: new Date() };
      dgr_list["seenCount"] = 0;

      var diagram_id = await Diagrams.insertAsync(dgr_list);

      var type_list = {};
      build_initial_diagram_type(type_list, list["editorType"]);
      type_list["versionId"] = list["versionId"];
      type_list["toolId"] = list["toolId"];
      type_list["createdAt"] = time;
      type_list["createdBy"] = user_id;
      type_list["diagramId"] = diagram_id;
      type_list["style"] = style;
      type_list["name"] = list["name"];
      type_list["editorType"] = list["editorType"];
      type_list["size"] = { diagramSize: 9, dialogSize: 3 };

      var dgr_type_id = await DiagramTypes.insertAsync(type_list);

      //adding the default dialog tab
      await DialogTabs.insertAsync({
        toolId: list["toolId"],
        versionId: list["versionId"],
        diagramTypeId: dgr_type_id,
        diagramId: diagram_id,
        name: "Diagram",
        index: 1,
      });


      return { diagramId: diagram_id, diagramTypeId: dgr_type_id };
    }
  },

  updateConfiguratorExtension: async function (list) {

    var system_id = Meteor.userId();
    if (is_system_admin(system_id, list) && list && list["update"]) {

      //attribute pair storing attribute name and its value
      var attr_name = list["update"]["_attr"];
      var attr_value = list["update"]["_value"];

      //query for object
      var query = {};
      query["toolId"] = list["toolId"];
      query["extensionPoints.extensionPoint"] = attr_name;

      //update for extension point
      var update = {};
      update['extensionPoints.$.procedure'] = attr_value;

      //updating the object type
      if (list["compartmentTypeId"]) {
        query["_id"] = list["compartmentTypeId"];
        await CompartmentTypes.updateAsync(query, { $set: update }, async function (err, res) {

          if (err) {
            console.error("Error in update compartmentType");
          } else if (res == 0) {

            var query2 = { toolId: list["toolId"], _id: list["compartmentTypeId"] };
            var extension_point = { extensionPoint: attr_name, procedure: attr_value };

            await CompartmentTypes.updateAsync(query2, { $push: { extensionPoints: extension_point } });
          }

        });
      } else if (list["elementId"]) {
        query["elementId"] = list["elementId"];
        await ElementTypes.updateAsync(query, { $set: update }, async function (err, res) {

          if (err) {
            console.error("Error in update elementType");
          } else if (res == 0) {

            var query2 = { toolId: list["toolId"], elementId: list["elementId"] };
            var extension_point = { extensionPoint: attr_name, procedure: attr_value };

            await ElementTypes.updateAsync(query2, { $push: { extensionPoints: extension_point } });
          }
        });

      }
      else if (list["diagramId"]) {
        query["diagramId"] = list["diagramId"];

        await DiagramTypes.updateAsync(query, { $set: update }, async function (err, res) {

          if (err) {
            console.error("Error in update diagramType");
          }

          else if (res == 0) {

            var query2 = { toolId: list["toolId"], diagramId: list["diagramId"] };
            var extension_point = { extensionPoint: attr_name, procedure: attr_value };

            await DiagramTypes.updateAsync(query2, { $push: { extensionPoints: extension_point } });
          }

        });
      }
    }
    else
      error_msg();
  },

  reorderTabIndexes: async function (list) {
    var user_id = Meteor.userId();
    if (is_system_admin(user_id, list)) {

      var prev_index = list["prevIndex"];
      var current_index = list["currentIndex"];
      var tab_id = list["dialogTabId"];
      var query = { toolId: list["toolId"], diagramTypeId: list["diagramTypeId"] };

      if (list["elementTypeId"]) {
        query["elementTypeId"] = list["elementTypeId"];
      } else {
        query["elementTypeId"] = { $exists: false };
      }
      
      if (prev_index < current_index) {
        await DialogTabs.updateAsync({
          $and: [{ index: { $gt: prev_index } },
          { _id: { $ne: tab_id } }, query]
        },
          { $inc: { index: current_index } }, { multi: true });
      } else {
        await DialogTabs.updateAsync({
          $and: [query,
            {
              $or: [{ index: { $gt: prev_index } },
              { _id: tab_id }]
            }
          ]
        },
          { $inc: { index: prev_index } },
          { multi: true });
      }
    }
  },

  reorderPaletteButtonIndexes: async function (list) {

    var user_id = Meteor.userId();
    if (is_system_admin(user_id, list)) {

      var prev_index = list["prevIndex"];
      var current_index = list["currentIndex"];
      var button_id = list["buttonId"];
      var query = { toolId: list["toolId"], diagramTypeId: list["diagramTypeId"] };

      if (prev_index < current_index) {

        await PaletteButtons.updateAsync({
          $and: [{ index: { $gt: prev_index } },
          { _id: { $ne: button_id } }, query]
        },
          { $inc: { index: current_index } }, { multi: true });
      } else {

        await PaletteButtons.updateAsync({
          $and: [query,
            {
              $or: [{ index: { $gt: prev_index } },
              { _id: button_id }]
            }
          ]
        },
          { $inc: { index: prev_index } },
          { multi: true });
      }
    }
  },

  addDiagramTypeKeystrokeOrItem: async function (list) {
    var user_id = Meteor.userId();
    if (is_system_admin(user_id, list)) {
      await DiagramTypes.updateAsync({ _id: list["id"] }, { $push: list["push"] });
    }
  },

  deleteDiagramTypeKeystrokeOrItem: async function (list) {
    var user_id = Meteor.userId();
    if (is_system_admin(user_id, list)) {

      var update = {};
      update[list.array] = list.data;

      await DiagramTypes.updateAsync({ _id: list["id"] }, { $set: update });
    }
  },

  updateDiagramTypeKeystrokeOrItem: async function (list) {
    var user_id = Meteor.userId();
    if (is_system_admin(user_id, list)) {
      await DiagramTypes.updateAsync({ _id: list["id"] }, { $set: list["field"] });
    }
  },

  updateDiagramSize: async function (list) {
    var user_id = Meteor.userId();
    if (is_system_admin(user_id, list)) {

      var dialog_size, diagram_size;
      if (list["attrName"] == "size.dialogSize") {
        dialog_size = list["attrValue"];
        diagram_size = 12 - dialog_size;
      }

      else {
        diagram_size = list["attrValue"];
        dialog_size = 12 - diagram_size;
      }

      var update = {};
      update["size.diagramSize"] = diagram_size;
      update["size.dialogSize"] = dialog_size;

      await DiagramTypes.updateAsync({ _id: list["id"] }, { $set: update });
    }
  },

  updateDiagramType: async function (list) {
    var user_id = Meteor.userId();

    if (is_system_admin(user_id, list)) {

      var update = {};
      update[list["attrName"]] = list["attrValue"];

      await DiagramTypes.updateAsync({ _id: list["id"] }, { $set: update });
    }
  },

  updateDiagramTypeStyle: async function (list) {
    var user_id = Meteor.userId();
    if (is_system_admin(user_id, list)) {

      var update = {};
      update['style.' + list["attrName"]] = list["attrValue"];

      await DiagramTypes.updateAsync({ _id: list["id"] }, { $set: update });

      await Diagrams.updateAsync({ $or: [{ _id: list["diagramId"] }, { diagramTypeId: list["id"] }] },
        { $set: update }, { multi: true });
    }
  },

  addToolbarItem: async function (list) {
    var user_id = Meteor.userId();
    if (is_system_admin(user_id, list)) {

      var update = {};
      update[list["attrName"]] = list["push"];

      await DiagramTypes.updateAsync({ _id: list["id"] }, { $push: update });
    }
  },

  removeToolbarItem: async function (list) {
    var user_id = Meteor.userId();
    if (is_system_admin(user_id, list)) {

      var update = {};
      update[list["attrName"]] = list["pull"];

      await DiagramTypes.updateAsync({ _id: list["id"] }, { $pull: update });
    }
  },

});
