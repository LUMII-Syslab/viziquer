import { is_project_member } from "../../../../libs/platform/user_rights.js";
import { Searches } from "../../../../db/platform/collections.js";
import { error_msg } from "../../_global_functions.js";

Meteor.methods({
  //saves searched phrases for documents, diagrams and users
  searchInProject: async function (list) {
    var user_id = Meteor.userId();
    if (await is_project_member(user_id, list)) {
      if (list.phrase && list.phrase !== "") {
        var update = {};
        update.counter = 1;
        update["users." + user_id] = 1;
        if (list.versionId) update["versions." + list.versionId] = 1;

        if (list.projectId) update["projects." + list.projectId] = 1;

        await Searches.updateAsync(
          { type: list.type, phrase: list.phrase.toLowerCase() },
          { $inc: update },
          { upsert: true },
        );
      }
    } else error_msg();
  },

  searchInContacts: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {
      if (list.phrase && list.phrase !== "") {
        var update = {};
        update.counter = 1;
        update["users." + user_id] = 1;

        await Searches.updateAsync(
          { type: list.type, phrase: list.phrase.toLowerCase() },
          { $inc: update },
          { upsert: true },
        );
      } else error_msg();
    } else error_msg();
  },
});
