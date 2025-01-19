import { is_system_admin } from '/imports/libs/platform/user_rights'
import { DialogTabs } from '/imports/db/platform/collections'

Meteor.methods({

  insertTab: async function (list) {
    var user_id = Meteor.userId();
    if (await is_system_admin(user_id) && list) {
      await DialogTabs.insertAsync(list);
    }
  },

  updateTab: async function (list) {
    var user_id = Meteor.userId();
    if (await is_system_admin(user_id) && list) {
      await DialogTabs.updateAsync({ _id: list["tabId"], toolId: list["toolId"] },
        { $set: { name: list["name"] } });
    }
  },

  removeTab: async function (list) {
    var user_id = Meteor.userId();
    if (await is_system_admin(user_id) && list) {

      if (!list["id"])
        return;

      await DialogTabs.removeAsync({ _id: list["id"], toolId: list["toolId"] });
    }
  },

});

