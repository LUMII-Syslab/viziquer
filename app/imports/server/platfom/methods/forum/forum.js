import { is_project_member } from '/libs/platform/user_rights'
import { ForumPosts, ForumPostComments, ForumPostTags } from '/libs/platform/collections'
import { generate_id } from '/imports/libs/platform/lib'

Meteor.methods({

	updateSeenCount: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {
			ForumPosts.update({_id: list["postId"], projectId: list["projectId"]},
								{$inc: {seenCount: 1}});
		}
	},

	//inserrt post
	insertPost: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			var time = new Date();
			ForumPosts.insert({title: list["title"],
								text: list["text"], 
								createdAt: time,
								authorId: user_id,
								projectId: list["projectId"],
								tags: list["tags"],
								commentsCount: 0,
								seenCount: 0,
								lastSeen: time,
							});
		}
	},

	editPost: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			ForumPosts.update({_id: list["postId"], projectId: list["projectId"],
								authorId: user_id},
								{$set: {title: list["title"],
										text: list["text"],
										tags: list["tags"],}});
		}
	},

	removePost: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

            if (!list["postId"])
                return;

			ForumPosts.remove({_id: list["postId"], authorId: user_id, projectId: list["projectId"]});
		}
	},

	insertPostComment: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			ForumPostComments.insert({text: list["text"],
									authorId: user_id,
									createdAt: new Date(),
									forumPostId: list["forumPostId"],
									projectId: list["projectId"],
									parentCommentId: list["parentCommentId"],
									replies: [],
								});
		}
	},

	editPostComment: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			//only authors can edit her posts
			ForumPostComments.update({_id: list["commentId"],
										authorId: user_id,
										projectId: list["projectId"]},
									{$set: {text: list["text"]}});
		}
	},

	removePostComment: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

            if (!list["commentId"])
                return;

			//only authors can delete her posts
			ForumPostComments.remove({_id: list["commentId"],
										authorId: user_id,
										projectId: list["projectId"]});
		}
	},

//comment replies
	addCommentReply: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {
			ForumPostComments.update({_id: list["commentId"], projectId: list["projectId"]},
									{$push: {replies: {
											id: generate_id(),
											text: list["comment"],
											authorId: user_id,
											createdAt: new Date(),
										}}});
		}
	},

	editCommentReply: function(list) {

		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			var reply = get_reply_obj(list["commentId"], list["replyId"]);
			if (!reply || !reply["reply"])
				return;

			//checking if the user is the author of the reply
			if (reply["reply"]["authorId"] == user_id) {

				var index = reply["index"];
				var update = {};
				update["replies." + index + ".text"] = list["comment"];

				ForumPostComments.update({_id: list["commentId"], projectId: list["projectId"]},
											{$set: update});
			}
		}
	},

	removeCommentReply: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			var reply = get_reply_obj(list["commentId"], list["replyId"]);
			if (!reply)
				return;

			var reply_obj = reply["reply"];
			if (reply_obj["authorId"] == user_id) {
				ForumPostComments.update({_id: list["commentId"], projectId: list["projectId"]}, 
										{$pull: {replies: reply_obj}});
			}
		}
	},
});


ForumPosts.after.insert(function (user_id, doc) {

	if (!doc)
		return false;

	var tags = doc["tags"];
	_.each(tags, function(tag) {
		add_forum_post_tag(doc["_id"], doc["projectId"], tag);
	});
});
ForumPosts.hookOptions.after.insert = {fetchPrevious: false};

ForumPosts.before.update(function (user_id, doc, fields, modifier, options) {

	if (!modifier)
		return false;

	//updating the tags
	if (modifier.$set && modifier.$set["tags"]) {

		var old_tags = doc["tags"];
		var new_tags = modifier.$set["tags"];

		remove_old_tags(doc);

		var proj_id = doc["projectId"];
		var post_id = doc["_id"];

		_.each(new_tags, function(tag) {
			add_forum_post_tag(post_id, proj_id, tag);
		});
	}
});
ForumPosts.hookOptions.before.update = {fetchPrevious: false};

ForumPosts.after.remove(function (user_id, doc) {

	if (!doc)
		return false;

	//removing all the post comments
	ForumPostComments.remove({forumPostId: doc["_id"]});

	//removing the post tags
	remove_old_tags(doc);
});
ForumPosts.hookOptions.after.remove = {fetchPrevious: false};

//comments
ForumPostComments.after.insert(function (user_id, doc) {

	if (!doc)
		return false;

	ForumPosts.update({_id: doc["forumPostId"]}, {$inc: {commentsCount: 1}});
});
ForumPostComments.hookOptions.after.insert = {fetchPrevious: false};

ForumPostComments.after.update(function (user_id, doc, fields, modifier, options) {

	if (!modifier || !doc)
		return false;

	var inc;

	//if inserting the reply, then incrementing the comments count
	if (modifier.$push && fields.length == 1 && fields[0] == "replies") {
		if (modifier.$push.replies)
			inc = 1;
	}

	//if inserting the reply, then decrementing the comments count
	else if (modifier.$pull && fields.length == 1 && fields[0] == "replies") {
		if (modifier.$pull.replies)
			inc = -1;
	}

	if (inc)
		ForumPosts.update({_id: doc["forumPostId"]}, {$inc: {commentsCount: inc}});
});
//ForumPostComments.hookOptions.after.update = {fetchPrevious: false};

ForumPostComments.after.remove(function (user_id, doc) {

	if (!doc)
		return false;

	//updating the comments count
	var replies_count = 0;
	if (doc["replies"])
		replies_count = doc["replies"].length;

	ForumPosts.update({_id: doc["forumPostId"]}, {$inc: {commentsCount: -1-replies_count}});
});
ForumPostComments.hookOptions.after.remove = {fetchPrevious: false};

function remove_old_tags(doc) {

	var old_tags = doc["tags"];
	var post_id = doc["_id"];
	var proj_id = doc["projectId"];
	
	_.each(old_tags, function(tag) {
		ForumPostTags.update({projectId: proj_id, name: tag},
							{$pull: {forumPosts: post_id}});
	});
}

function add_forum_post_tag(post_id, proj_id, tag) {

	//ForumPostTags.update({projectId: proj_id, name: tag},
	//					{$addToSet: {forumPosts: post_id}}, {upsert: true});

	//This is because of FUCKING ASSHOLES

	var tmp = ForumPostTags.findOne({projectId: proj_id,
									name: tag,
									forumPosts: post_id});
	if (tmp)
		ForumPostTags.update({projectId: proj_id, name: tag},
							{$push: {forumPosts: post_id}});
	else
		ForumPostTags.insert({projectId: proj_id,
								name: tag,
								forumPosts: [post_id],
							});
}
