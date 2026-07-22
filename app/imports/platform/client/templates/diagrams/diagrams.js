import { Template } from "meteor/templating";

import { FlowRouter } from "meteor/ostrio:flow-router-extra";

import { Interpreter } from "../../../../client/lib/interpreter.js";
import { Utilities } from "../../js/utilities/utils.js";
import {
  UserVersionSettings,
  Projects,
  ProjectsGroups,
  Tools,
  DiagramTypes,
  Diagrams,
  FoundDiagrams,
} from "../../../../db/platform/collections.js";
import { Dialog } from "../../js/interpretator/Dialog.js";
import { Services } from "../../../../db/platform/collections.js";

import { dataShapes } from "../../../../custom/vq/client/js/DataShapes.js";

import "./diagrams.html";
import { joined_date } from "../../js/utilities/time_utilities.js";

// Start of diagramsTemplate template
Template.diagramsTemplate.onCreated(function() {
  const projectId = FlowRouter.getParam('projectId')
  const id = FlowRouter.getParam('_id')
  const diagramTypeId = FlowRouter.getParam('diagramTypeId')
  const versionId = FlowRouter.getParam('versionId')
  const phrase = FlowRouter.getParam('phrase')

  const personality = FlowRouter.getParam('personality')

  const diagrams_query = { projectId, versionId }
  if (phrase) {
    diagrams_query.text = phrase
  }

  console.log('👹 diagrams_query', diagrams_query)
  this.subscribe('Diagrams', diagrams_query)
  this.subscribe('FoundDiagrams', diagrams_query)
  this.subscribe('DiagramTypes_UserVersionSettings', { projectId, versionId })
  this.subscribe('ProjectsGroups', { projectId })

  this.subscribe('Services', {})
});

//calculates the view to render
Template.diagramsTemplate.helpers({
  isDefaultView: function () {
    var user_diagram = UserVersionSettings.findOne({
      versionId: Session.get("versionId"),
    });
    if (user_diagram && user_diagram.view === "Tree") return false;
    else {
      $(".popover").has(".tree-diagram-image").remove();
      return true;
    }
  },

  //sets user mode
  editable: function () {
    return Utilities.isAdmin();
  },

  // adds/removes select by group button
  isAdmin: function () {
    return Utilities.isAdmin();
  },
});

Template.diagramsTemplate.events({
  //searches on every key stroke for diagram title or compartment value
  "keyup #searchDiagrams": function () {
    //searched text
    var text = $("#searchDiagrams").val();
    var filter = {
      text: text,
      projectId: Session.get("activeProject"),
      versionId: Session.get("versionId"),
    };

    Session.set("diagrams", filter);
  },
});

// Start of diagramsRibbon template

Template.diagramsRibbon.events({
  //shows dialog window to enter diagram name
  "click #add": function (e) {
    Dialog.destroyTooltip(e);
    let dt = [];
    for (const d of DiagramTypes.find({}, { $sort: { name: 1 } })) {
      let e = { _id: d._id, name: d.name };
      if (d.name === "Query") e.selected = "selected";
      dt.push(e);
    }
    Template.configuratorDiagramOptions.configuratorDiagrams.set(dt);
    $("#add-diagram").modal("show");
  },

  // //shows button's tooltip on mouse over
  //     'mouseenter .btn-ribbon' : function(e, templ) {
  //     	Dialog.destroyTooltip(e);
  //     	Dialog.showTooltip(e);
  //     },

  // //removes tooltip on mouse leave
  //     'mouseleave .btn-ribbon' : function(e, templ) {
  //     	Dialog.destroyTooltip(e);
  //     },
});

Template.diagramsRibbon.helpers({
  versionId: function () {
    return Session.get("versionId");
  },

  //if the version is editable and there is atleast one diagram type
  is_toolbar_enabled: function () {
    if (is_toolbar_enabled()) {
      Dialog.initTooltip();
      return true;
    }
  },

  project_id: function () {
    return Session.get("activeProject");
  },

  tool: function () {
    var project_id = Session.get("activeProject");
    var project = Projects.findOne({ _id: project_id });

    if (!project) {
      // console.error("No project ", project_id);
      return;
    }

    var tool = Tools.findOne({ _id: project.toolId });
    if (!tool) {
      console.error("No tool", project.toolId);
      return;
    }

    // tool.toolbar = "diagramsToolbar";

    return tool;
  },
});

// End of diagramsRibbon template

Template.diagramsToolbar.helpers({
  isOWLGrEd: function () {
    const project = Projects.findOne({ _id: Session.get("activeProject") });
    const tool = Tools.findOne({ _id: project.toolId });
    console.log('helper - isOWlGrEd', project, tool)
    if ( tool.toolGroup && tool.toolGroup === 'OWLGrEd' ) {
      return true;
    }
    else {
      return false;
    }
  },
  hasSchema: function () {
    var project_id = Session.get("activeProject");
    var project = Projects.findOne({ _id: project_id });

    if (!project) {
      return false;
    }

    if (project.schema !== undefined) {
      return true;
      // TODO Šeit vispār vajadzētu skatīties, vai pretī ir pareizais DSS serveris un vai ir pareizas rīks (nav tikai VQ)
    }
    return false;
  },
  isPublic: function () {
    return dataShapes.schema.isPublic;
  },
});

Template.diagramsToolbar.events({
  "click #download-project": function (e) {
    Dialog.destroyTooltip(e);

    var list = {
      projectId: Session.get("activeProject"),
      versionId: Session.get("versionId"),
    };

    Utilities.callMeteorMethod("getProjectJson", list, function (resp) {
      if (resp.diagrams) {
        //    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resp, 0, 4));
        // var link = $('<a href="data:' + data + '" download="data.json">download JSON</a>');
        // link.appendTo('#download-hack')
        // link[0].click();

        // let csvContent = "";
        // res.forEach(function(rowArray) {
        // 	let row = rowArray.join(",");
        // 	csvContent += row + "\r\n";
        // });

        var link = document.createElement("a");
        link.setAttribute("download", "data.json");
        link.href = URL.createObjectURL(
          new Blob([JSON.stringify(resp, 0, 4)], {
            type: "application/json;charset=utf-8;",
          }),
        );
        document.body.appendChild(link);
        link.click();
      }
    });
  },

  "click #upload-project": function (e) {
    // e.preventDefault();
    Dialog.destroyTooltip(e);
    Template.uploadProject.loading.set(false);
    $("#upload-project-form").modal("show");
  },

  "click #import": function (e) {
    Dialog.destroyTooltip(e);
    $("#import-ontology-form").modal("show");
  },

  "click #settings": function (e) {
    Dialog.destroyTooltip(e);
    $("#ontology-settings-form").modal("show");
  },


  "click #migrate": function (e) {
    Dialog.destroyTooltip(e);
    $("#migrate-form").modal("show");
  },
  "click #saveSchema": async function (e) {
    await dataShapes.changeActiveProject(
      Session.get("activeProject"),
      "Pirms Shēmas formas atvēršanas",
    );
    Dialog.destroyTooltip(e);
    await Template.VQ_DSS_schema.rendered("schema");
    $("#VQ-DSS-schema").modal("show");
  },
  "click #schemaFragment": async function (e) {
    await dataShapes.changeActiveProject(
      Session.get("activeProject"),
      "Pirms Fragmenta formas atvēršanas",
    );
    Dialog.destroyTooltip(e);
    await Template.VQ_DSS_schema.rendered("fragment");
    $("#VQ-DSS-schema").modal("show");
  },
  "click #loadOntologyOWLGrEd": function (e) {
    Dialog.destroyTooltip(e);
    $("#load-ontology-form-owlgred").modal("show");
  },
});

//calculates view's drop-down element visibility
Template.diagramsViewButton.helpers({
  diagramViews: function () {
    var style = {};
    var user_version_settings = UserVersionSettings.findOne({
      versionId: Session.get("versionId"),
    });
    if (user_version_settings && user_version_settings.view === "Tree") {
      style.defaultStyle = "visibility:hidden;";
      style.treeStyle = "";
    } else {
      style.defaultStyle = "";
      style.treeStyle = "visibility:hidden;";
    }

    return style;
  },
});

Template.diagramsViewButton.events({
  "click .view-switch": function (e) {
    e.preventDefault();
    var view = $(e.target).attr("view");

    //switching the views
    var list = {
      versionId: Session.get("versionId"),
      update: { $set: { view: view } },
    };

    Utilities.callMeteorMethod("updateUserVersionSettings", list);
  },
});

Template.diagramsSortButton.helpers({
  items: function () {
    //making all the items
    var items = [
      { name: "A-Z", type: "alphabetTopDown" },
      { name: "Date", type: "dateTopDown" },
      { name: "Popular", type: "popularTopDown" },
    ];

    //setting the active item
    var sort_by_prop = get_panel_type() + "SortBy";
    var sort_by = get_user_settings_property(sort_by_prop);

    if (sort_by) {
      _.each(items, function (item) {
        if (item.type === sort_by) {
          item.active = true;
        }
      });
    }

    return items;
  },
});

Template.diagramsSortButton.events({
  "click .sort-by-item": function (e) {
    e.preventDefault();
    var item_type = $(e.target).closest(".sort-by-item").attr("type");

    var list = {
      versionId: Session.get("versionId"),
      update: { $set: set_update_doc_dgr_settings("SortBy", item_type) },
    };

    Utilities.callMeteorMethod("updateUserVersionSettings", list);

    return;
  },
});

Template.diagramsGroupsButton.helpers({
  items: function () {
    //selecting the active group
    var prefix = get_panel_type();
    var group_id = get_user_settings_property(prefix + "SelectedGroup");

    //adding default group
    var item = { name: "Admin/Reader", _id: "Admin", defaultRole: true };
    if (group_id === "Admin") {
      item.active = true;
    }

    //array containing project groups
    var items = [item];

    //selecting custom groups
    ProjectsGroups.find().forEach(function (proj_group) {
      if (proj_group._id === group_id) {
        proj_group.active = true;
      }

      items.push(proj_group);
    });

    return items;
  },
});

Template.diagramsGroupsButton.events({
  //setting the chosen selection
  "click .select-group-item": function (e) {
    e.preventDefault();
    var group_id = $(e.target).closest(".select-group-item").attr("value");

    var list = {
      versionId: Session.get("versionId"),
      update: { $set: set_update_doc_dgr_settings("SelectedGroup", group_id) },
    };

    Utilities.callMeteorMethod("updateUserVersionSettings", list);
  },
});

//stores all project diagrams
Template.defaultDiagramsView.helpers({
  diagrams: function () {
    var user_version_settings = UserVersionSettings.findOne({
      versionId: Session.get("versionId"),
    });
    if (user_version_settings && user_version_settings.view === "Default") {
      var query = build_diagrams_query();
      if (!query) {
        return;
      }

      var proj_id = Session.get("activeProject");
      var version_id = Session.get("versionId");
      var is_edit_mode = is_toolbar_enabled();

      var sort_by_str = user_version_settings.diagramsSortBy;
      var sort_by = get_sort_by_object(sort_by_str);

      return Diagrams.find(query, { $sort: sort_by }).map(function (diagram) {
        diagram.projectId = proj_id;
        diagram.versionId = version_id;

        diagram.date = joined_date(diagram.createdAt);

        if (is_edit_mode) {
          diagram.isEditMode = true;
        }

        return diagram;
      });
    }
  },
});

Template.defaultDiagramsView.events({
  "mouseover .diagram": function (e) {
    var target = $(e.target);

    var container = target.closest(".diagram");
    var drop_down = container.find(".diagram-dropdown-container");

    var width = container.width();

    drop_down.removeClass("hidden").css("left", width);
  },

  "mouseleave .diagram": function (e) {
    var drop_down = $(e.target)
      .closest(".diagram")
      .find(".diagram-dropdown-container");
    drop_down.addClass("hidden");
  },

  "click .edit-diagram-info": function (e) {
    e.preventDefault();
    e.stopPropagation();

    //adding file value to the field
    var diagram_container = $(e.target).closest(".diagram");

    var diagram_name = diagram_container.find(".diagram-name").text();
    $("#diagram-name-field").val(diagram_name);

    var diagram_comment = diagram_container.find(".diagram-comment").text().trim();
    $("#diagram-comment-field").val(diagram_comment);

    //adding file id to the form
    var form = $("#edit-diagram-info-form");
    form.attr("diagramId", diagram_container.attr("diagramId"));

    //showing form
    form.modal("show");
  },

  "click .remove-diagram": function (e) {
    e.preventDefault();
    e.stopPropagation();

    var diagram_container = $(e.target).closest(".diagram");

    var diagram_id = diagram_container.attr("diagramId");
    if (!diagram_id) {
      return;
    }

    Interpreter.execute("delete_diagram", [diagram_id]);
  },

  "click .duplicate-diagram": function (e) {
    e.preventDefault();
    e.stopPropagation();

    var diagram_container = $(e.target).closest(".diagram");

    var diagram_id = diagram_container.attr("diagramId");
    if (!diagram_id) {
      return;
    }

    var list = { diagramId: diagram_id };

    list.projectId = Session.get("activeProject");
    list.versionId = Session.get("versionId");

    Utilities.callMeteorMethod("duplicateDiagram", list);

    var drop_down = $(e.target)
      .closest(".diagram")
      .find(".diagram-dropdown-container");

    drop_down.addClass("hidden").removeClass("open");
  },
});

Template.treeDiagramsView.helpers({
  diagrams: function () {
    var proj_id = Session.get("activeProject");
    var version_id = Session.get("versionId");
    var is_edit_mode = is_toolbar_enabled();

    var query = build_diagrams_query() || {};

    var parent_query = { "parentDiagrams.0": { $exists: false } };

    var sort_by;

    apply_selected_group_to_query(parent_query);

    var user_version_settings = UserVersionSettings.findOne({
      versionId: Session.get("versionId"),
    });
    if (user_version_settings && user_version_settings.view === "Tree") {
      var sort_by_str = user_version_settings.diagramsSortBy;
      sort_by = get_sort_by_object(sort_by_str);
    }

    sort_by = sort_by || { name: 1 };

    //selecting diagrams that have no parents
    return Diagrams.find(parent_query, { $sort: sort_by }).map(
      function (diagram) {
        return build_diagram_tree(
          diagram,
          proj_id,
          version_id,
          is_edit_mode,
          query,
          sort_by,
        );
      },
    );
  },
});

Template.treeDiagramsView.events({
  "click .treeNodeButton": function (e) {
    var src = $(e.target);
    var diagram_id = get_diagram_id_from_button(src);
    var update = {};

    if (src.hasClass("expand")) {
      update["$pull"] = { collapsedDiagrams: diagram_id };
    } else if (src.hasClass("collapse")) {
      update["$addToSet"] = { collapsedDiagrams: diagram_id };
    }

    var list = { versionId: Session.get("versionId"), update: update };
    Utilities.callMeteorMethod("updateUserVersionSettings", list);
  },

  //show diagram image on a popover
  "mouseover .diagram-title": function (e) {
    //removes the previous popover
    $(".popover").remove();

    var diagram_container = $(e.target).closest(".diagram");

    var diagram_id = diagram_container.attr("id");
    var diagram = Diagrams.findOne({ _id: diagram_id });
    if (diagram) {
      var img_src = diagram.imageUrl;
      var img = '<img class="tree-diagram-image" src="' + img_src + '">';

      var diagram_obj = diagram_container.find(
        '[diagramId="' + diagram_id + '"]',
      );
      diagram_obj.popover({ content: img, html: true });
      diagram_obj.popover("show");
    }
  },

  //destroys the popover on mouse leave
  "mouseleave .diagram": function () {
    // $(".popover").each(function(i, popover) {
    // 	//$(popover).popover("destroy");
    // 	$(popover).remove();
    // });

    $(".popover").remove();
  },
});

Template.treeDiagramsView.onDestroyed(function () {
  $(".popover").remove();
});

Template.diagramsSearchBar.helpers({
  search_phrase: function () {
    var list = Session.get("diagrams");
    if (list) {
      return list.text;
    }
  },
});

// Start of addDiagram template

Template.addDiagram.events({
  "submit form"(event, template) {
    event.preventDefault();
    $("#create-diagram").click();
  },

  "click #create-diagram": function () {
    $("#add-diagram").attr("OKPressed", true);

    //hidding the form
    $("#add-diagram").modal("hide");
  },

  //if ok was clicked, then starting a new chat
  "hidden.bs.modal #add-diagram": function () {
    var src = $("#add-diagram");
    if (src.attr("OKPressed")) {
      src.removeAttr("OKPressed");

      var diagram_name = $("#diagram-name").val();
      var diagram_type_id = $("#diagramType").find(":selected").attr("id");

      Interpreter.execute("createDiagram", [diagram_name, diagram_type_id]);
    }
  },

  "keydown #diagram-name, keydown #diagramType"(event, template) {
    if (event.key === "Enter") {
      event.preventDefault(); // stop form submission
      $("#create-diagram").click(); // simulate OK button click
    }
  },
});

Template.uploadProject.loading = new ReactiveVar(false);

Template.uploadProject.onCreated(function() {
  this.subscribe('Services', {})
})

Template.uploadProject.helpers({
  loading: function () {
    return Template.uploadProject.loading.get();
  },
  projects: function () {
    var result = [];

    var project = Projects.findOne({ _id: Session.get("activeProject") });
    if (project) {
      var tool_id = project.toolId;
      // Meteor.subscribe("Services", {});

      if (tool_id) {
        var services = Services.findOne({ toolId: tool_id });

        if (services && services.projects) {
          _.each(services.projects, function (p) {
            result.push({
              caption: "Upload " + p.caption,
              name: p.name,
              link: p.link,
            });
          });
        }
      }
    }

    return result;
  },
});

Template.uploadProject.events({
  "click #ok-upload-project": function () {
    //hidding the form
    //$('#upload-project-form').modal("hide");

    var list = {
      projectId: Session.get("activeProject"),
      versionId: Session.get("versionId"),
    };

    var url_value = $("#import-projecturl").val();
    var url_value_from_list = $("input[name=stack-radio]:checked")
      .closest(".schema")
      .attr("link");

    if (url_value) {
      list.url = url_value;
      Template.uploadProject.loading.set(true);
      Utilities.callMeteorMethod("uploadProjectDataByUrl", list, function () {
        $("#upload-project-form").modal("hide");
        Template.uploadProject.loading.set(false);
      });
    } else if (url_value_from_list) {
      list.url = url_value_from_list;
      Template.uploadProject.loading.set(true);
      Utilities.callMeteorMethod("uploadProjectDataByUrl", list, function () {
        $("#upload-project-form").modal("hide");
        Template.uploadProject.loading.set(false);
      });
    } else {
      var fileList = $("#projectfileList")[0].files;
      _.each(fileList, function (file) {
        var reader = new FileReader();

        reader.onload = function () {
          var diagrams = JSON.parse(reader.result);
          list.data = diagrams;
          Template.uploadProject.loading.set(true);
          Utilities.callMeteorMethod("uploadProjectData", list, function () {
            $("#upload-project-form").modal("hide");
            Template.uploadProject.loading.set(false);
          });
        };

        reader.onerror = function (error) {
          console.error("Error: ", error);
        };
        reader.readAsText(file);
      });
    }
  },
});


//returns diagram types for drop down when user creates a new diagram
Template.configuratorDiagramOptions.configuratorDiagrams = new ReactiveVar();

Template.configuratorDiagramOptions.helpers({
	configuratorDiagrams: function() {
		return Template.configuratorDiagramOptions.configuratorDiagrams.get();
		//return DiagramTypes.find({}, {$sort: {name: 1}});
	},
});

Template.editDiagramInfoForm.events({
  "click #edit-diagram-info-form-ok": function () {
    var form = $("#edit-diagram-info-form");
    var diagram_id = form.attr("diagramId");

    form.modal("hide");

    var list1 = {
      projectId: Session.get("activeProject"),
      versionId: Session.get("versionId"),
      diagramId: diagram_id,
      attrName: "name",
      attrValue: $("#diagram-name-field").val(),
    };

    Utilities.callMeteorMethod("updateDiagram", list1);

    var list2 = {
      projectId: Session.get("activeProject"),
      versionId: Session.get("versionId"),
      diagramId: diagram_id,
      attrName: "comment",
      attrValue: $("#diagram-comment-field").val(),
    };
    Utilities.callMeteorMethod("updateDiagram", list2);
  },
});

// End of addDiagram template

function build_diagrams_query() {
  var found_diagrams = FoundDiagrams.findOne({
    _id: Session.get("userSystemId"),
  });

  //if no diagrams found, then displays nothing
  if (found_diagrams && found_diagrams.noDiagrams === 1) {
    return;
  } else {
    //selecting diagram ids in array
    var diagrams = [];
    for (var key in found_diagrams) {
      if (key === "_id" || found_diagrams[key] === 0) {
        continue;
      } else {
        diagrams.push(key);
      }
    }

    var query = {};

    //if there is no search, then selects all the diagrams
    //else selects diagrams that are in the diagrams array
    if (diagrams.length > 0) {
      query = { _id: { $in: diagrams } };
    }

    apply_selected_group_to_query(query);

    return query;
  }
}

function get_diagram_id_from_button(src) {
  return src.closest(".diagram").attr("id");
}

function is_toolbar_enabled() {
  return Utilities.isEditable() && DiagramTypes.findOne();
}

function apply_selected_group_to_query(query) {
  var selected_group = get_user_settings_property("diagramsSelectedGroup");
  if (
    selected_group &&
    selected_group !== "Admin" &&
    selected_group !== "none"
  ) {
    query.allowedGroups = selected_group;
  }
}

function get_user_settings_property(prop_name) {
  var user_settings = UserVersionSettings.findOne({
    versionId: Session.get("versionId"),
  });
  if (user_settings) {
    if (user_settings[prop_name]) {
      return user_settings[prop_name];
    } else {
      var full_prop_name = "diagrams" + prop_name;
      return user_settings[full_prop_name];
    }
  }
}

function set_update_doc_dgr_settings(prop_name, prop_value) {
  var prefix = get_panel_type();
  if (prefix) {
    var full_prop = prefix + prop_name;
    var set = {};
    set[full_prop] = prop_value;

    return set;
  }
}

function get_panel_type() {
  if (Session.get("activePanelItem") === "documents") {
    return "documents";
  } else if (Session.get("activePanelItem") === "diagrams") {
    return "diagrams";
  } else {
    return "";
  }
}

function get_sort_by_object(item_type) {
  var items = {
    alphabetTopDown: { name: 1 },
    dateTopDown: { createdAt: -1 },
    popularTopDown: { seenCount: -1 },
  };

  return items[item_type];
}

function build_diagram_tree(
  diagram,
  proj_id,
  version_id,
  is_edit_mode,
  query,
  sort_by,
) {
  var id = diagram._id;

  //selecting child diagrams
  diagram.children = Diagrams.find(
    { parentDiagrams: id },
    { sort: sort_by },
  ).map(function (child_diagram) {
    var new_child_diagram = build_diagram_tree(
      child_diagram,
      proj_id,
      version_id,
      is_edit_mode,
      query,
      sort_by,
    );
    return new_child_diagram;
  });

  var is_collapsed = UserVersionSettings.findOne({
    collapsedDiagrams: diagram._id,
    versionId: Session.get("versionId"),
  });

  //collapsed
  if (is_collapsed) {
    diagram.collapsed = "display: none; visibility: visible;";
    diagram.expanded = "display: block; visibility: visible;";
    diagram.childrenList = "display: none;";
  }

  //expanded
  else {
    diagram.collapsed = "display: block; visibility: visible;";
    diagram.expanded = "display: none; visibility: visible;";
    diagram.childrenList = "";
  }

  //checks if there was a search
  if (query && query._id) {
    var is_searched_diagram = Diagrams.findOne({
      $and: [{ _id: diagram._id }, query],
    });
    if (is_searched_diagram) {
      diagram.colorClass = "bg-info";
    }
  }

  diagram.projectId = proj_id;
  diagram.versionId = version_id;
  if (is_edit_mode) {
    diagram.editMode = "edit";
  }

  return diagram;
}

Template.migrateForm.helpers({
  tools: function () {
    return Tools.find({ isDeprecated: { $ne: true }, name: { $ne: '_Configurator' } });
  },
});

Template.migrateForm.events({
  "click #migrate-to": function () {
    $("#migrate-form").modal("hide");
    var tool_name = $("#migrate-tools").find(":selected").attr("value");
    Meteor.call("migrate", {
      projectId: Session.get("activeProject"),
      toolName: tool_name,
    });
  },
});

