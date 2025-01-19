import { is_project_member } from '/imports/libs/platform/user_rights'
import { Posts, Likers } from '/imports/db/platform/collections'


Posts.after.remove(function (user_id, doc) {

  //if the deleted post was parent, then removes all its replies
  Posts.remove({ parentId: doc["_id"] });

  //removing post likers
  Likers.remove({ postId: doc["_id"] });
});
Posts.hookOptions.after.remove = { fetchPrevious: false };


Likers.before.insert(async function (user_id, doc) {

  //user is not allowed to like one post more than one time
  var is_liker = await Likers.findOneAsync({ userSystemId: user_id, postId: doc["postId"] });
  if (is_liker)
    return false;
});
Likers.hookOptions.before.insert = { fetchPrevious: false };

//updating likes count
Likers.after.insert(function (user_id, doc) {
  Posts.update({ _id: doc["postId"] }, { $inc: { likesCount: 1 } })
});
Likers.hookOptions.after.insert = { fetchPrevious: false };

//updating likes count
Likers.after.remove(function (user_id, doc) {
  Posts.update({ _id: doc["postId"] }, { $inc: { likesCount: -1 } })
});
Likers.hookOptions.after.remove = { fetchPrevious: false };

Meteor.methods({

  insertFeedPost: async function (list) {
    var user_id = Meteor.userId();
    if (is_project_member(user_id, list)) {

      list["likesCount"] = 0;
      list["createdAt"] = new Date();
      list["authorId"] = user_id;

      await Posts.insertAsync(list);
    }
  },

  updateFeedPost: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {
      await Posts.updateAsync({ _id: list["postId"], authorId: user_id },
        { $set: { text: list["text"] } });
    }
  },

  removeFeedPost: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {

      if (!list["postId"])
        return;

      await Posts.removeAsync({ _id: list["postId"], authorId: user_id });
    }
  },

  likePost: async function (list) {
    var user_id = Meteor.userId();
    if (user_id) {

      list["userSystemId"] = user_id;
      list["createdAt"] = new Date();

      await Likers.insertAsync(list);
    }
  },

  unLikePost: function (list) {
    var user_id = Meteor.userId();
    if (user_id) {

      if (!list["postId"])
        return;

      Likers.remove({ postId: list["postId"], userSystemId: user_id });
    }
  },

});
