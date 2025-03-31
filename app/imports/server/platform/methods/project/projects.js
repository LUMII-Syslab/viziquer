import { Roles } from 'meteor/alanning:roles'

import { is_project_admin, is_project_member, build_project_role, build_project_admin_role, build_project_version_admin_role, build_project_version_reader_role } from '/imports/libs/platform/user_rights'
import { generate_id } from '/imports/libs/platform/lib'
import { Projects, ProjectsUsers, ToolVersions, Versions, UserVersionSettings, Users, Diagrams, Elements, Compartments, } from '/imports/db/platform/collections'
import { Schema } from '/imports/db/custom/vq/collections'
import { get_unknown_public_user_name } from '/imports/server/platform/_helpers'

//creating a new project version and adds the project creator to the project
Projects.after.insert(async function (user_id, doc) {

  if (!doc) {
    return false;
  }

  await afterInsert(user_id, doc);

  // var proj_id = doc["_id"];
  // var tool_id = doc["toolId"];
  // var date = new Date();

  // //selects the last tool version
  // var tool_version = ToolVersions.findOne({toolId: tool_id}, {sort: {createdAt: -1}});
  // if (!tool_version) {
  // 	console.log("There is no tool version for tool: ", tool_id);
  // 	return;
  // }

  // //adding the project new version
  // var version_id = Versions.insert({projectId: proj_id,
  // 								createdAt: date,
  // 								createdBy: user_id,
  // 								status: "New",
  // 								toolVersionId: tool_version["_id"],
  // 								toolId: tool_id,
  // 							});

  // //inserting the user in the project
  // ProjectsUsers.insert({
  // 					projectId: proj_id,
  // 					role: "Admin",
  // 					status: "Member",
  // 					createdAt: date,
  // 					modifiedAt: date,
  // 					invitedBy: user_id,
  // 					userSystemId: user_id,
  // 					versionId: version_id,
  // 				});

  // //adding the doc that stores some user stuff
  // UserVersionSettings.insert({
  // 					userSystemId: user_id,
  // 					versionId: version_id,
  // 					projectId: proj_id,
  // 					view: "Default",
  // 					consistencyCheck: false,
  // 					collapsedDiagrams: [],
  // 					diagramsSortBy: "alphabetTopDown",
  // 					diagramsSelectedGroup: "none",
  // 					documentsSortBy: "alphabetTopDown",
  // 					documentsSelectedGroup: "none",
  // 				});

  // Users.update({systemId: user_id}, {$set: {activeProject: proj_id, activeVersion: version_id}});

  // //managing roles/permissons
  // var project_role = build_project_role(proj_id);
  // var project_admin_role = build_project_admin_role(proj_id);
  // var project_version_admin_role = build_project_version_admin_role(proj_id, version_id);

  // Roles.addUsersToRoles(user_id, [project_role, project_admin_role, project_version_admin_role]);
});
Projects.hookOptions.after.insert = { fetchPrevious: false };

//Project deletion is canceled if there is atleast one diagram or document in the project
Projects.before.remove(function (user_id, doc) {

  if (!doc)
    return false;

  //var dgr = Diagrams.findOne({projectId: doc["_id"]});
  //if (dgr)
  //	return false;

  //var proj_doc = Documents.findOne({projectId: doc["_id"]});
  //if (proj_doc)
  //	return false;

});

Projects.hookOptions.before.remove = { fetchPrevious: false };

//TODO: needs some cheking if this ok
Projects.after.remove(async function (user_id, doc) {

  var proj_id = doc["_id"]

  //a transaction is needed
  await ProjectsUsers.removeAsync({ projectId: proj_id });
  await Versions.removeAsync({ projectId: proj_id });

  //roles???
});
Projects.hookOptions.after.remove = { fetchPrevious: false };

Meteor.methods({

  insertProject: async function (list) {
    var project_link = null;
    var versionId = null;
    var user_id = Meteor.userId();
    if (user_id) {
      list["createdAt"] = new Date();
      list["createdBy"] = user_id;

      if (list.project_link) {
        project_link = list.project_link;
        delete list.project_link;
      }

      await Projects.insertAsync(list);

      var project = await Projects.findOneAsync({ createdAt: list["createdAt"], createdBy: user_id, name: list["name"] });
      var projectsUsers = await ProjectsUsers.findOneAsync({ projectId: project._id })
      if (projectsUsers)
        versionId = projectsUsers.versionId;

      //console.log(project)
      //console.log(projectsUsers)

      if (project_link) {
        //console.log("Ir projekta links")
        var list = {
          projectId: project._id,
          versionId: versionId,
          url: project_link,
        };
        await Meteor.callAsync("uploadProjectDataByUrl", list);
      }
      return project._id;
    }
  },

  updateProject: async function (list) {
    var user_id = Meteor.userId();
    if (is_project_admin(user_id, list)) {
      await Projects.updateAsync({ _id: list["projectId"] }, { $set: list["set"] });
    }
  },

  removeProject: async function (list) {
    var user_id = Meteor.userId();
    if (is_project_admin(user_id, list)) {
      await Projects.removeAsync({ _id: list["projectId"] })
    }
  },

  updateUserVersionSettings: async function (list) {

    var user_id = Meteor.userId();
    if (user_id) {
      await UserVersionSettings.updateAsync({ userSystemId: user_id, versionId: list["versionId"] }, list["update"]);
    }
  },


  duplicateProject: async function (list) {
    var user_id = Meteor.userId();
    var versionId = null;
    if (is_project_member(user_id, list)) {
      var project_id = list.projectId;
      var project = await Projects.findOneAsync({ _id: project_id });
      if (!project) {
        console.error("No project object");
        return;
      }

      project._id = generate_id();
      var new_project_id = await Projects.direct.insertAsync(project);
      list.newProjectId = new_project_id;

      project._id = new_project_id;
      var new_version_id = await afterInsert(user_id, project);

      await Diagrams.find({ projectId: project_id }).forEachAsync(async function (diagram) {
        await duplicateDiagram(diagram, new_project_id, new_version_id);
      });

    }

  },

  leaveProject: async function (list) {

    var user_id = Meteor.userId();
    if (is_project_member(user_id, list)) {
      await ProjectsUsers.removeAsync({ userSystemId: user_id, projectId: list.projectId, });
    }

  },

});



async function duplicateDiagram(diagram, new_project_id, new_version_id) {

  var diagram_id = diagram._id;
  var project_id = diagram.projectId;

  diagram._id = undefined;

  _.extend(diagram, { _id: undefined, projectId: new_project_id, versionId: new_version_id, });
  var new_diagram_id = await Diagrams.insertAsync(diagram);


  var elems_map = {};
  await Elements.find({ diagramId: diagram_id, projectId: project_id, type: "Box" }).forEachAsync(async function (box) {

    var old_box_id = box._id;
    _.extend(box, { _id: undefined, diagramId: new_diagram_id, projectId: new_project_id, versionId: new_version_id, });

    var new_box_id = await Elements.insertAsync(box);
    elems_map[old_box_id] = new_box_id;
  });


  await Elements.find({ diagramId: diagram_id, projectId: project_id, type: "Line" }).forEachAsync(async function (line) {

    var old_line_id = line._id;

    line._id = undefined;
    _.extend(line, {
      _id: undefined, diagramId: new_diagram_id, projectId: new_project_id, versionId: new_version_id,
      startElement: elems_map[line.startElement], endElement: elems_map[line.endElement],
    });

    var new_line_id = await Elements.insertAsync(line);
    elems_map[old_line_id] = new_line_id;
  });


  await Compartments.find({ diagramId: diagram_id, projectId: project_id }).forEachAsync(async function (compart) {

    _.extend(compart, { _id: undefined, elementId: elems_map[compart.elementId], diagramId: new_diagram_id, projectId: new_project_id, versionId: new_version_id, });

    await Compartments.insertAsync(compart);
  });
}


async function afterInsert(user_id_in, doc) {

  var user_id = doc["createdBy"];
  if (!user_id) {
    user_id = user_id_in;
  }

  var proj_id = doc["_id"];
  var tool_id = doc["toolId"];
  var date = new Date();

  //selects the last tool version
  var tool_version = await ToolVersions.findOneAsync({ toolId: tool_id }, { $sort: { createdAt: -1 } });
  if (!tool_version) {
    // console.error("There is no tool version for tool: ", tool_id);
    return;
  }

  //adding the project new version
  var version_id = await Versions.insertAsync({
    projectId: proj_id,
    createdAt: date,
    createdBy: user_id,
    status: "New",
    toolVersionId: tool_version["_id"],
    toolId: tool_id,
  });

  //inserting the user in the project
  await ProjectsUsers.insertAsync({
    projectId: proj_id,
    role: "Admin",
    status: "Member",
    createdAt: date,
    modifiedAt: date,
    invitedBy: user_id,
    userSystemId: user_id,
    versionId: version_id,
  });

  //adding the doc that stores some user stuff
  await UserVersionSettings.insertAsync({
    userSystemId: user_id,
    versionId: version_id,
    projectId: proj_id,
    view: "Default",
    consistencyCheck: false,
    collapsedDiagrams: [],
    diagramsSortBy: "alphabetTopDown",
    diagramsSelectedGroup: "none",
    documentsSortBy: "alphabetTopDown",
    documentsSelectedGroup: "none",
  });

  await Users.updateAsync({ systemId: user_id }, { $set: { activeProject: proj_id, activeVersion: version_id } });

  //managing roles/permissons
  var project_role = build_project_role(proj_id);
  var project_version_reader_role = build_project_version_reader_role(proj_id, version_id, "Reader");
  var project_admin_role = build_project_admin_role(proj_id);
  var project_version_admin_role = build_project_version_admin_role(proj_id, version_id);

  Roles.createRole(project_role, { unlessExists: true });
  Roles.createRole(project_version_reader_role, { unlessExists: true });
  Roles.createRole(project_admin_role, { unlessExists: true });
  Roles.createRole(project_version_admin_role, { unlessExists: true });


  console.log("user_id dadfadfdf", user_id)


  Roles.addUsersToRoles(user_id, [project_role, project_version_reader_role, project_admin_role, project_version_admin_role]);

  return version_id;
}
