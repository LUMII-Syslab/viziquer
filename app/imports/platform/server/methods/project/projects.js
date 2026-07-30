// import { Roles } from 'meteor/alanning:roles'
import { Roles } from "meteor/roles";

import {
  is_project_admin,
  is_project_member,
  build_project_role,
  build_project_admin_role,
  build_project_version_admin_role,
  build_project_version_reader_role,
} from "../../../../libs/platform/user_rights.js";
import { generate_id } from "../../../../libs/platform/lib.js";
import {
  Projects,
  ProjectsUsers,
  ToolVersions,
  Versions,
  UserVersionSettings,
  Users,
  Diagrams,
  Elements,
  Compartments,
  // Posts, ForumPosts,
} from "../../../../db/platform/collections";
// import { Schema } from '../../../../db/custom/vq/collections'
import { get_unknown_public_user_name } from "../../_helpers.js";

//creating a new project version and adds the project creator to the project
Projects.after.insert(async function (user_id, doc) {
  if (!doc) {
    return false;
  }

  await afterInsert(user_id, doc);

  // var proj_id = doc._id;
  // var tool_id = doc.toolId;
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
  // 								toolVersionId: tool_version._id,
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
  if (!doc) return false;

  //var dgr = Diagrams.findOne({projectId: doc._id});
  //if (dgr)
  //	return false;

  //var proj_doc = Documents.findOne({projectId: doc._id});
  //if (proj_doc)
  //	return false;
});
Projects.hookOptions.before.remove = { fetchPrevious: false };

//TODO: needs some cheking if this ok
Projects.after.remove(async function (user_id, doc) {
  var proj_id = doc._id;

  //a transaction is needed
  await ProjectsUsers.removeAsync({ projectId: proj_id });
  await Versions.removeAsync({ projectId: proj_id });

  // Posts.remove({projectId: proj_id});
  // ForumPosts.remove({projectId: proj_id});

  //roles???
});
Projects.hookOptions.after.remove = { fetchPrevious: false };

Meteor.methods({
  insertProject: async function (list) {
    var project_link = null;
    var versionId = null;
    var user_id = Meteor.userId();
    if (user_id) {
      list.createdAt = new Date();
      list.createdBy = user_id;

      if (list.project_link) {
        project_link = list.project_link;
        delete list.project_link;
      }

      await Projects.insertAsync(list);

      var project = await Projects.findOneAsync({
        createdAt: list.createdAt,
        createdBy: user_id,
        name: list.name,
      });
      var projectsUsers = await ProjectsUsers.findOneAsync({
        projectId: project._id,
      });

      if (projectsUsers) {
        versionId = projectsUsers.versionId;
      }

      //console.log(project)
      //console.log(projectsUsers)

      if (project_link) {
        // console.log("Ir projekta links", project_link)
        const list2 = {
          projectId: project._id,
          versionId: versionId,
          url: project_link,
          user_id: user_id,
        };

        await Meteor.callAsync("uploadProjectDataByUrl", list2);
      }
      return project._id;
    }
  },

  updateProject: async function (list) {
    var user_id = Meteor.userId();
    if (await is_project_admin(user_id, list)) {
      await Projects.updateAsync(
        { _id: list.projectId },
        { $set: list.set },
      );
    }
  },

  removeProject: async function (list) {
    var user_id = Meteor.userId();
    if (await is_project_admin(user_id, list)) {
      await Projects.removeAsync({ _id: list.projectId });
    }
  },

  updateUserVersionSettings: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {
      await UserVersionSettings.updateAsync(
        { userSystemId: user_id, versionId: list.versionId },
        list.update,
      );
    }
  },

  duplicateProject: async function (list) {
    const user_id = Meteor.userId();
    // const versionId = null;

    if (await is_project_member(user_id, list)) {
      const old_project_id = list.projectId;
      const old_project = await Projects.findOneAsync({ _id: old_project_id });
      if (!old_project) {
        console.error("No project object");
        return;
      }

      const new_project = Object.assign({}, old_project)
      delete new_project._id
      new_project.name = new_project.name + ' (copy)' // TODO: paskatīties/atrast unikālu vārdu
      new_project.createdBy = user_id
      new_project.createdAt = new Date()

      const new_project_id = await Projects.direct.insertAsync(new_project);
      new_project._id = new_project_id;

      // list.newProjectId = new_project_id;

      const new_version_id = await afterInsert(user_id, new_project);

      await Diagrams.find({ projectId: old_project_id }).forEachAsync(
        async function (d) {
          await duplicateDiagram(d, new_project_id, new_version_id, {
            seenCount: 0,
            createdAt: new Date(),
            createdBy: user_id,
          });
        },
      );
    }
  },

  leaveProject: async function (list) {
    var user_id = Meteor.userId();
    if (await is_project_member(user_id, list)) {
      await ProjectsUsers.removeAsync({
        userSystemId: user_id,
        projectId: list.projectId,
      });
    }
  },
});

async function duplicateDiagram(old_diagram, new_project_id, new_version_id, attr_updates) {
  const old_diagram_id = old_diagram._id;
  const old_project_id = old_diagram.projectId;

  const new_diagram = Object.assign({}, old_diagram, attr_updates, {
    projectId: new_project_id,
    versionId: new_version_id,
  })
  delete new_diagram._id
  const new_diagram_id = await Diagrams.insertAsync(new_diagram);

  const elems_map = {};

  await Elements.find({
    diagramId: old_diagram_id,
    projectId: old_project_id,
    type: "Box",
  }).forEachAsync(async function (old_box) {
    const old_box_id = old_box._id;
    const new_box = Object.assign({}, old_box, {
      diagramId: new_diagram_id,
      projectId: new_project_id,
      versionId: new_version_id,
    })
    delete new_box._id
    const new_box_id = await Elements.insertAsync(new_box);
    elems_map[old_box_id] = new_box_id;
  });

  await Elements.find({
    diagramId: old_diagram_id,
    projectId: old_project_id,
    type: "Line",
  }).forEachAsync(async function (old_line) {
    const old_line_id = old_line._id;
    const new_line = Object.assign({}, old_line, {
      diagramId: new_diagram_id,
      projectId: new_project_id,
      versionId: new_version_id,
      startElement: elems_map[old_line.startElement],
      endElement: elems_map[old_line.endElement],
    })
    delete new_line._id
    const new_line_id = await Elements.insertAsync(new_line);
    elems_map[old_line_id] = new_line_id;
  });

  await Compartments.find({
    diagramId: old_diagram_id,
    projectId: old_project_id,
  }).forEachAsync(async function (old_compart) {
    const old_compart_id = old_compart._id
    const new_compart = Object.assign({}, old_compart, {
      elementId: elems_map[old_compart.elementId],
      diagramId: new_diagram_id,
      projectId: new_project_id,
      versionId: new_version_id,
    })
    delete new_compart._id
    await Compartments.insertAsync(new_compart);
  });
}

async function afterInsert(user_id_in, doc) {
  var user_id = doc.createdBy;
  if (!user_id) {
    user_id = user_id_in;
  }

  var proj_id = doc._id;
  var tool_id = doc.toolId;
  var date = new Date();

  //selects the last tool version
  var tool_version = await ToolVersions.findOneAsync(
    { toolId: tool_id },
    { $sort: { createdAt: -1 } },
  );
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
    toolVersionId: tool_version._id,
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

  await Users.updateAsync(
    { systemId: user_id },
    { $set: { activeProject: proj_id, activeVersion: version_id } },
  );

  //managing roles/permissons
  var project_role = build_project_role(proj_id);
  var project_version_reader_role = build_project_version_reader_role(
    proj_id,
    version_id,
    "Reader",
  );
  var project_admin_role = build_project_admin_role(proj_id);
  var project_version_admin_role = build_project_version_admin_role(
    proj_id,
    version_id,
  );

  await Roles.createRoleAsync(project_role, { unlessExists: true });
  await Roles.createRoleAsync(project_version_reader_role, {
    unlessExists: true,
  });
  await Roles.createRoleAsync(project_admin_role, { unlessExists: true });
  await Roles.createRoleAsync(project_version_admin_role, {
    unlessExists: true,
  });

  console.log("user_id dadfadfdf", user_id);

  await Roles.addUsersToRolesAsync(user_id, [
    project_role,
    project_version_reader_role,
    project_admin_role,
    project_version_admin_role,
  ]);

  return version_id;
}
