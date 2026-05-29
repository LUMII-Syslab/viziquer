import {
  build_project_version_reader_role,
  build_project_role,
  build_project_admin_role,
  build_project_version_admin_role,
} from "../../../../libs/platform/user_rights.js";
import {
  Notifications,
  ProjectsUsers,
  Users,
  UserVersionSettings,
  Versions,
} from "../../../../db/platform/collections.js";
import { user_not_logged_in } from "../../_helpers.js";

import { Roles } from "meteor/roles";

Notifications.after.update(
  async function (user_id, doc, fieldNames, modifier, options) {
    if (!doc || !modifier || !modifier.$set) return false;

    var proj_id = doc.projectId;

    if (modifier.$set.status === "confirmed") {
      var role = doc.data.role;

      //selecting the versions that are allowed for the user
      // var versions;
      // if (role === "Admin")
      // 	versions = Versions.find({projectId: proj_id}, {sort: {createdAt: -1}});
      // 	//versions = Versions.find({projectId: proj_id}, {sort: {publishedAt: -1}});

      // else //if (doc.data.role === "Reader")
      // 	versions = Versions.find({projectId: proj_id, status: "Published"},
      // 								{sort: {publishedAt: -1}});

      var versions = Versions.find(
        { projectId: proj_id },
        { sort: { createdAt: -1 } },
      );

      //building reader roles for admin
      var tmp_role = role;
      if (role === "Admin") tmp_role = "Reader";

      //generating project reader roles for all the versions
      var roles = await versions.mapAsync(function (version) {
        //generating role names for all the project versions
        return build_project_version_reader_role(
          proj_id,
          version._id,
          tmp_role,
        );
      });

      //adding the project member role
      roles.push(build_project_role(proj_id));

      //adding the project admin role, if admin
      if (role === "Admin") {
        roles.push(build_project_admin_role(proj_id));

        var version_fetch = await versions.fetchAsync();
        if (versions && version_fetch) {
          var last_version = version_fetch[0];
          if (last_version && last_version.status === "New")
            roles.push(
              build_project_version_admin_role(proj_id, last_version._id),
            );
        }
      }

      //selecting the first version's id
      if (versions && (await versions.countAsync()) > 0) {
        var active_version = (await versions.fetchAsync())[0]._id;

        //adding the user to the project
        await ProjectsUsers.updateAsync(
          { projectId: proj_id, userSystemId: user_id },
          { $set: { status: "Member", versionId: active_version } },
        );

        //setting the new project and its version as active for the user
        await Users.updateAsync(
          { systemId: user_id },
          { $set: { activeProject: proj_id, activeVersion: active_version } },
        );

        //adding the doc that stores some user stuff
        await UserVersionSettings.insertAsync({
          userSystemId: user_id,
          versionId: active_version,
          projectId: proj_id,
          view: "Default",
          consistencyCheck: false,
          collapsedDiagrams: [],
          diagramsSortBy: "alphabetTopDown",
          diagramsSelectedGroup: "none",
          documentsSortBy: "alphabetTopDown",
          documentsSelectedGroup: "none",
        });
      }

      //setting the active project without active version (there is no version for this user yet)
      else {
        //adding the user to the project
        await ProjectsUsers.updateAsync(
          { projectId: proj_id, userSystemId: user_id },
          { $set: { status: "Member" } },
        );

        //setting the new project and its version as active for the user
        await Users.updateAsync(
          { systemId: user_id },
          { $set: { activeProject: proj_id } },
        );
      }

      //roles
      await Roles.addUsersToRolesAsync(user_id, roles);
    } else if (modifier.$set.status === "rejected") {
      await ProjectsUsers.removeAsync({
        projectId: doc.projectId,
        userSystemId: user_id,
      });
    }
  },
);
//Notifications.hookOptions.after.update = {fetchPrevious: false};

Meteor.methods({
  setNotifcationsSeen: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {
      await Notifications.updateAsync(
        { receiver: user_id, status: "new" },
        { $set: { status: "seen" } },
        { multi: true },
      );
    } else {
      user_not_logged_in();
    }
  },

  updateNotification: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {
      await Notifications.updateAsync(
        { _id: list.id, receiver: user_id },
        list.update,
      );
    }
  },

  removeNotification: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {
      if (!list.id) {
        return;
      }

      await Notifications.removeAsync({ _id: list.id, receiver: user_id });
    }
  },
});
