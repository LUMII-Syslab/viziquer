import { is_project_admin } from '/imports/libs/platform/user_rights'
import { ProjectsGroups, ProjectsUsers, Diagrams, Documents } from '/imports/db/platform/collections'

ProjectsGroups.after.remove(async function (user_id, doc) {

  if (!doc)
    return;

  var group_id = doc["_id"];
  var proj_id = doc["projectId"];

  //removing the group from the allowed groups
  await Diagrams.updateAsync({ projectId: proj_id }, { $pull: { allowedGroups: group_id } });
  await Documents.updateAsync({ projectId: proj_id }, { $pull: { allowedGroups: group_id } });
});
ProjectsGroups.hookOptions.after.remove = { fetchPrevious: false };

Meteor.methods({

  addGroup: async function (list) {

    var user_id = Meteor.userId();
    if (is_project_admin(user_id, list)) {

      var date = new Date();
      var group_id = await ProjectsGroups.insertAsync({
        name: list["name"],
        projectId: list["projectId"],
        createdBy: user_id,
        createdAt: date,
        modifiedAt: date,
      });

      if (group_id) {

        //diagrams
        if (list["allProjectDiagrams"]) {
          await Diagrams.updateAsync({ projectId: list["projectId"] },
            { $push: { allowedGroups: group_id } });
        }

        else if (list["currentProjectDiagrams"]) {
          await Diagrams.updateAsync({ projectId: list["projectId"], versionId: list["versionId"] },
            { $push: { allowedGroups: group_id } });
        }

        //documents
        if (list["allProjectDocuments"]) {
          await Documents.updateAsync({ projectId: list["projectId"] },
            { $push: { allowedGroups: group_id } });
        }

        else if (list["currentProjectDocuments"]) {
          await Documents.updateAsync({ projectId: list["projectId"], versionId: list["versionId"] },
            { $push: { allowedGroups: group_id } });
        }

      }
    }
  },

  editGroup: async function (list) {
    var user_id = Meteor.userId();
    if (is_project_admin(user_id, list)) {
      await ProjectsGroups.updateAsync({ _id: list["id"], projectId: list["projectId"] },
        { $set: { name: list["name"] } });
    }
  },

  removeGroup: async function (list) {

    var user_id = Meteor.userId();
    if (is_project_admin(user_id, list)) {

      //if there is atleast one project member with the specified group, then no remove
      var proj_users = await ProjectsUsers.findOneAsync({ role: list["id"], projectId: list["projectId"] });
      if (proj_users)
        return;

      if (!list["id"])
        return;

      await ProjectsGroups.removeAsync({ _id: list["id"], projectId: list["projectId"] });
    }
  },

});
