import { Template } from "meteor/templating";
import { FlowRouter } from "meteor/ostrio:flow-router-extra";

import {
  Projects,
  ProjectsUsers,
  Tools,
} from "../../../../db/platform/collections.js";
import { Services } from "../../../../db/platform/collections.js";
import { Utilities, reset_variable } from "../../js/utilities/utils.js";

import "./structure.html";

Template.structureTemplate.onCreated(function() {
  this.subscribe('Structure_Tools', {});
});

Template.structureTemplate.helpers({
  categories: function () {
    //selelcts project properties

    var categories = {};

    var active_project = Session.get("activeProject");
    var user_id = Session.get("userSystemId");

    ProjectsUsers.find({ userSystemId: Session.get("userSystemId") }).forEach(
      function (user_proj) {
        var proj_id = user_proj.projectId;
        var project = Projects.findOne({ _id: proj_id });

        var category = "";
        if (project) {
          user_proj.name = project.name;
          user_proj.icon = project.icon;
          user_proj.comment = project.comment;

          if (project.createdBy === user_id) {
            user_proj.isOwner = true;
          }

          category = project.category || "";
        }

        if (category === "OWLGrEd") {
          user_proj.styleClass = "bg-warning";
          if (proj_id === active_project) {
            user_proj.styleClass = "bg-success";
          }
        } else {
          user_proj.styleClass = "bg-info";
          if (proj_id === active_project) {
            user_proj.styleClass = "bg-danger";
          }
        }

        if (user_proj.role === "Admin" && user_proj.status === "Member") {
          user_proj.isEditable = true;
        }

        if (user_proj.role === "Admin" || user_proj.role === "Reader") {
          user_proj.isDefault = true;
        }

        if (categories[category]) {
          categories[category].push(user_proj);
        } else {
          categories[category] = [user_proj];
        }
      },
    );

    var res = [];

    //if no category name, then these projects are rendered at the begining
    if (categories[""]) {
      res.push({ name: "", projects: categories[""] });
    }

    //selecting all the proceses that are have category name
    _.each(categories, function (projects, category_name) {
      if (category_name) {
        res.push({ name: category_name, projects: projects });
      }
    });

    return res;
  },
});

Template.structureTemplate.events({
  "mouseover .container": function (e) {
    var container = $(e.target).closest(".project-path");

    var proj_container = $(e.target).closest(".container");
    var width = proj_container.width();
    //var height = proj_container.height();

    container
      .find(".project-dropdown-container")
      .removeClass("hidden")
      .css("left", width - 10);
  },

  "mouseleave .project-container": function (e) {
    $(e.target)
      .closest(".container")
      .find(".project-dropdown-container")
      .addClass("hidden");
  },

  "click .project-path": async function (e) {
    e.preventDefault();

    var src = $(e.target).closest(".project-path");
    var proj_id = src.attr("id");
    var version_id = await Utilities.changeUserActiveProject(proj_id);
    FlowRouter.go("diagrams", { projectId: proj_id, versionId: version_id });

    //return;
  },

  "click .project-dropdown-container": function (e) {
    e.stopPropagation();
    $(e.target)
      .closest(".container")
      .find(".project-dropdown-container")
      .addClass("open")
      .removeClass("hidden");
  },

  "click .edit-project-obj": function (e) {
    e.preventDefault();
    e.stopPropagation();

    var proj_id = $(e.target).closest(".project-path").attr("id");
    Session.set("editProjectId", proj_id);

    $(e.target)
      .closest(".container")
      .find(".project-dropdown-container")
      .removeClass("open")
      .addClass("hidden");

    $("#edit-project-form").modal("show");

    return;
  },

  "click .remove-project-obj": function (e) {
    e.preventDefault();
    //e.stopPropagation();

    var proj_id = $(e.target).closest(".project-path").attr("id");

    var list = { projectId: proj_id };
    Utilities.callMeteorMethod("removeProject", list);

    return;
  },

  "click .duplicate-project-obj": async function (e) {
    e.preventDefault();
    //e.stopPropagation();

    var proj_id = $(e.target).closest(".project-path").attr("id");
    var list = { projectId: proj_id };

    await Utilities.callMeteorMethodAsync("duplicateProject", list);

    return;
  },

  "click .leave-project": function (e) {
    e.preventDefault();
    //e.stopPropagation();

    console.log("leave project");

    var proj_id = $(e.target).closest(".project-path").attr("id");
    var list = { projectId: proj_id };

    Utilities.callMeteorMethod("leaveProject", list);

    return;
  },
});

Template.structureRibbon.events({});

Template.editProjectModal.helpers({
  data: function () {
    var proj = Projects.findOne({ _id: Session.get("editProjectId") });
    if (proj) {
      console.log('😍😍', proj)
      return {
        name: proj.name || "",
        icon: proj.icon || "",
        category: proj.category || "",
        comment: proj.comment || "",
      };
    }
  },
});

Template.editProjectModal.events({
  "click #project-edited": function (e) {
    e.preventDefault();

    $("#edit-project-form").modal("hide");

    var project_name = $("#edit-project-name").val();
    var icon_name = $("#edit-icon-name").val();
    var category_name = $("#edit-category-name").val();
    var comment = $("#edit-project-comment").val();
    var proj_id = Session.get("editProjectId");

    var list = {
      projectId: proj_id,
      set: { name: project_name, icon: icon_name, category: category_name, comment },
    };
    console.log('😍', list)
    Utilities.callMeteorMethod("updateProject", list);

    Session.set("editProjectId", reset_variable());

    return;
  },
});

//End of createProjectModal
