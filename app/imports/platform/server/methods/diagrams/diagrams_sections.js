import { is_project_version_admin } from "../../../../libs/platform/user_rights.js";
import { DiagramFiles } from "../../../../db/platform/collections.js";

Meteor.methods({
  attachFileToElement: async function (list) {
    var user_id = Meteor.userId();
    if (await is_project_version_admin(user_id, list)) {
      list["createdAt"] = new Date();
      await DiagramFiles.insertAsync(list);
    }
  },

  detachFileFromElement: async function (list) {
    var user_id = Meteor.userId();
    if (await is_project_version_admin(user_id, list)) {
      await DiagramFiles.removeAsync({
        _id: list["diagramFileId"],
        projectId: list["projectId"],
        versionId: list["versionId"],
      });
    }
  },
});
