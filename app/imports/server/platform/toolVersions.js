import {
  UserTools, Tools, ToolVersions, Versions, DialogTabs, PaletteButtons, DiagramTypes, ElementTypes, CompartmentTypes, Diagrams, Elements, Compartments
} from '/imports/db/platform/collections'


ToolVersions.after.insert(async function (user_id, doc) {

  if (!doc) {
    return false;
  }

  var tool_id = doc["toolId"];
  var _id = this._id;


  //the creator's current version is updated to the new one
  var user_tool = await UserTools.findOneAsync({ userSystemId: user_id, toolId: doc["toolId"] });
  if (user_tool) {
    UserTools.update({ userSystemId: user_id, toolId: doc["toolId"] }, { $set: { versionId: _id, } });
  } else {
    if (!user_id) {
      var configurator = await Tools.findOneAsync({ _id: doc["toolId"] });
      if (configurator) {
        user_id = configurator["createdBy"];
      }
    }

    await UserTools.insertAsync({ userSystemId: user_id, toolId: doc["toolId"], versionId: _id });
  }


  //the last published project version
  var last_version = await ToolVersions.findOneAsync({ toolId: tool_id, status: "Published" },
    { sort: { publishedAt: -1 } });
  
  if (!last_version)
    return;

  var last_version_id = last_version["_id"];

  //copies of diagram things
  var diagrams = Diagrams.find({ toolId: tool_id, versionId: last_version_id });
  var elements = Elements.find({ toolId: tool_id, versionId: last_version_id });
  var compartments = Compartments.find({ toolId: tool_id, versionId: last_version_id });

  var diagram_types = DiagramTypes.find({ toolId: tool_id, versionId: last_version_id });
  var element_types = ElementTypes.find({ toolId: tool_id, versionId: last_version_id });
  var compartment_types = CompartmentTypes.find({ toolId: tool_id, versionId: last_version_id });
  var palette_buttons = PaletteButtons.find({ toolId: tool_id, versionId: last_version_id });
  var dialog_tabs = DialogTabs.find({ toolId: tool_id, versionId: last_version_id });

  //diagram things
  //presentation things
  var diagram_list = {};
  _.each(await diagrams.fetchAsync(), async function (diagram) {
    diagram["versionId"] = new_version_id;

    var old_id = diagram["_id"];
    delete diagram["_id"];
    var new_id = await Diagrams.insertAsync(diagram);
    diagram_list[old_id] = new_id;
  });

  var element_list = {};
  _.each(await elements.fetchAsync(), async function (element) {
    element["versionId"] = new_version_id;
    element["diagramId"] = diagram_list[element["diagramId"]];

    var old_id = element["_id"];
    delete element["_id"];
    var new_id = await Elements.insertAsync(element);
    element_list[old_id] = new_id;
  });

  var compartment_list = {};
  _.each(await compartments.fetchAsync(), async function (compartment) {
    compartment["versionId"] = new_version_id;
    compartment["diagramId"] = diagram_list[compartment["diagramId"]];
    compartment["elementId"] = element_list[compartment["elementId"]];;

    var old_id = compartment["_id"];
    delete compartment["_id"];
    var new_id = await Compartments.insertAsync(compartment);
    compartment_list[old_id] = new_id;
  });


  var diagram_type_list = {};
  _.each(await diagram_types.fetchAsync(), async function (diagram_type) {
    diagram_type["versionId"] = new_version_id;
    diagram_type["diagramId"] = diagram_list[diagram_type["diagramId"]];

    var old_id = diagram_type["_id"];
    delete diagram_type["_id"];
    var new_id = await DiagramTypes.insertAsync(diagram_type);
    diagram_type_list[old_id] = new_id;
  });

  var element_type_list = {};
  _.each(await element_types.fetchAsync(), async function (element_type) {
    element_type["versionId"] = new_version_id;
    element_type["diagramTypeId"] = diagram_type_list[element_type["diagramTypeId"]];

    var old_elem_id = element_type["_id"];
    delete element_type["_id"];
    var new_elem_id = await ElementTypes.insertAsync(element_type);
    element_type_list[old_elem_id] = new_elem_id;
  });

  _.each(await compartment_types.fetchAsync(), async function (compartment_type) {
    compartment_type["versionId"] = new_version_id;
    compartment_type["diagramTypeId"] = element_list[compartment_type["diagramTypeId"]];
    compartment_type["elementTypeId"] = element_list[compartment_type["elementTypeId"]];

    delete compartment_type["_id"];
    await CompartmentTypes.insertAsync(compartment_type);
  });

  var palette_button_list = {};
  _.each(await palette_buttons.fetchAsync(), async function (palette_button) {
    palette_button["versionId"] = new_version_id;

    var old_palette_button_id = palette_button["_id"];
    delete palette_button["_id"];
    var new_palette_button_id = await PaletteButtons.insertAsync(palette_button);
    palette_button_list[old_palette_button_id] = new_palette_button_id;
  });

  var dialog_tab_list = {};
  _.each(await dialog_tabs.fetchAsync(), async function (dialog_tab) {
    dialog_tab["versionId"] = new_version_id;

    var old_tab = dialog_tab["_id"];
    delete dialog_tab["_id"];
    var new_tab = await DialogTabs.insertAsync(dialog_tab);
    dialog_tab_list[old_tab] = new_tab;
  });

});

ToolVersions.after.remove(async function (user_id, doc) {
  var tool_id = doc["toolId"];
  var version_id = doc["_id"];

  //removeNewToolVersion
  await Versions.removeAsync({ toolId: tool_id, toolVersionId: version_id });
  await DiagramTypes.removeAsync({ toolId: tool_id, versionId: version_id });

  var last_tool_version = await ToolVersions.findOneAsync({ toolId: tool_id }, { sort: { createdAt: -1 } });
  if (!last_tool_version)
    return false;

  var last_tool_version_id = last_tool_version["_id"];

  //the creator's current version is updated to the new one
  var user_tool = await UserTools.findOneAsync({ userSystemId: user_id, toolId: tool_id, versionId: version_id });
  if (user_tool)
    await UserTools.updateAsync({ _id: user_tool["_id"] }, { $set: { versionId: last_tool_version_id } });
  //else
  //	UserTools.insert({userSystemId: user_id, toolId: tool_id, versionId: last_tool_version_id});
});
