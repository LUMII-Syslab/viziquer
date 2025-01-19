import { is_system_admin } from '/imports/libs/platform/user_rights'
import { DocumentTypes } from '/imports/db/platform/collections'

Meteor.methods({

  addDocumentType: async function (list) {
    var user_id = Meteor.userId();
    if (await is_system_admin(user_id) && list) {
      await DocumentTypes.insertAsync({
        createdAt: new Date(),
        createdBy: user_id,
        name: list["name"],
        toolId: list["toolId"],
        versionId: list["versionId"],
        index: list["index"],
      });
    }
  },

  updateDocumentType: async function (list) {
    var user_id = Meteor.userId();
    if (await is_system_admin(user_id) && list) {
      await DocumentTypes.updateAsync({
        _id: list["id"],
        toolId: list["toolId"],
        versionId: list["versionId"],
      }, { $set: { name: list["name"] } });
    }
  },

  updateDocumentTypeIndex: async function (list) {
    var user_id = Meteor.userId();
    if (await is_system_admin(user_id) && list) {

      var prev_index = list["prevIndex"];
      var current_index = list["currentIndex"];
      var doc_type_id = list["documentTypeId"];
      var query = { toolId: list["toolId"], versionId: list["versionId"] };

      if (prev_index < current_index) {
        await DocumentTypes.updateAsync({
          $and: [{ index: { $gt: prev_index } },
          { _id: { $ne: doc_type_id } }, query]
        },
          { $inc: { index: current_index } }, { multi: true });
      }
      else {
        await DocumentTypes.updateAsync({
          $and: [query,
            {
              $or: [{ index: { $gt: prev_index } },
              { _id: doc_type_id }]
            }
          ]
        },
          { $inc: { index: prev_index } }, { multi: true });
      }
    }
  },


  removeDocumentType: async function (list) {
    var user_id = Meteor.userId();
    if (await is_system_admin(user_id) && list) {

      if (!list["id"])
        return;

      await DocumentTypes.removeAsync({
        _id: list["id"],
        toolId: list["toolId"], versionId: list["versionId"]
      });
    }
  },

});
