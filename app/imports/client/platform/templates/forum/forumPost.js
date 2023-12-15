import './forumPost.html'

Template.forumPostMessage.helpers({

	forum_post: function() {

		var forum_post = ForumPosts.findOne({_id: Session.get("forumPostId")});
		if (!forum_post)
			return;

		//forum_post["time"] = joined_date(forum_post["createdAt"]);
		forum_post["time"] = time_interval_from_given_date(forum_post["createdAt"]);
		add_user_data(forum_post);

		var user_id = Session.get("userSystemId");
		add_is_post_author(forum_post, user_id);

		return forum_post;
	},
});

Template.forumPostMessage.events({

	'click .edit-forum-post' : function(e) {
		e.preventDefault();

		$("#edit-forum-post").modal("show");

		return;
	},

	'mouseover .blog-container': function(e) {

		var container = $(e.target).closest(".blog-container");
		var width = container.width();

		container.find(".edit-button").removeClass("hidden")
										.css("left", width-20);
	},

	'mouseleave .blog-container': function(e) {
		$(e.target).closest(".blog-container").find(".edit-button").addClass("hidden");								
	},

});

Template.forumPostMessage.rendered = function() {

	var forum_post = ForumPosts.findOne({_id: Session.get("forumPostId")});
	if (forum_post) {

		var list = {projectId: forum_post["projectId"], postId: forum_post["_id"]};
		Meteor.call("updateSeenCount", list, function(err) {
			if (err)
				console.log("Error in updateSeenCount callback", err);
		});
	}
}

Template.forumPostLeftSide.helpers({

	tags: function() {
		var forum_post = ForumPosts.findOne({_id: Session.get("forumPostId")});
		if (forum_post)
			return forum_post["tags"];
	},
});

Template.forumPostComments.helpers({

	commentsCount: function() {
		var forum_post = ForumPosts.findOne({_id: Session.get("forumPostId")});
		if (forum_post)
			return forum_post["commentsCount"];
	},

	comments: function() {

		var user_id = Session.get("userSystemId");
		return ForumPostComments.find({parentCommentId: {$exists: false}}, {sort: {createdAt: 1}}).map(
			function(post) {

				//post["time"] = joined_date(post["createdAt"]);
				post["time"] = time_interval_from_given_date(post["createdAt"]);
				add_user_data(post);

				_.each(post["replies"], function(reply) {	
					add_user_data(reply);
					add_is_post_author(reply, user_id); 
					reply["time"] = time_interval_from_given_date(reply["createdAt"]);
				});

				add_is_post_author(post, user_id);

				return post;
			});
	},

});

Template.addForumPostComment.events({

	"click #post-comment": function(e) {
		e.preventDefault();

		show_comment_form("#add-forum-post-comment");
		return;
	},
});

Template.comment.events({

	"click .reply": function(e) {
		e.preventDefault();

		var parent_id = get_post_id(e);
		show_comment_form("#add-forum-post-comment", parent_id);

		return;
	},

	"click .edit": function(e) {
		e.preventDefault();

		var comment_id = $(e.target).closest(".post-comment").attr("id");
		Session.set("formInEditMode", {commentId: comment_id});

		show_comment_form("#edit-forum-post-comment");

		return;
	},

	"click .edit-reply": function(e) {
		e.preventDefault();

		var comment_id = $(e.target).closest(".comment-reply").attr("id");
		var parent_id = $(e.target).closest(".post-comment").attr("id");

		Session.set("formInEditMode", {replyId: comment_id, commentId: parent_id});

		show_comment_form("#edit-forum-post-comment", parent_id);

		return;
	},

	"click .delete": function(e) {
		e.preventDefault();

		var list = {commentId: get_post_id(e),
					projectId: Session.get("forumPostProjectId")};

		Meteor.call("removePostComment", list, function(err) {
			if (err)
				console.log("Error in removePostComment callback", err);
		});

		return;
	},

	"click .delete-reply": function(e) {
		e.preventDefault();

		var post_id = get_post_id(e);
		var reply_id = $(e.target).closest(".comment-reply").attr("id");

		var list = {commentId: post_id,
					replyId: reply_id,
					projectId: Session.get("forumPostProjectId")};

		Meteor.call("removeCommentReply", list, function(err) {
			if (err)
				console.log("Error in removeCommentReply callback", err);
		});

		return;
	},

});

Template.addForumPostCommentForm.events({

	"click #add-post-comment": function(e) {

		var form = $("#add-forum-post-comment");
		form.modal("hide");

		var parent_id = form.attr("parentId");
		form.removeAttr("parentId");

		var comment = $("#comment-field").val();
		$("#comment-field").val("");

		//if the comment was edited
		var forum_post = ForumPosts.findOne({_id: Session.get("forumPostId")});
		if (forum_post) {

			//the comment is a reply
			if (parent_id) {

				var list = {commentId: parent_id,
							projectId: forum_post["projectId"],
							comment: comment,
						};

				Meteor.call("addCommentReply", list, function(err) {
					if (err)
						console.log("Error in addCommentReply callback", err);
				});
			}

			//new comment
			else {

				var list = {text: comment,
							forumPostId: forum_post["_id"],
							projectId: forum_post["projectId"],
							parentCommentId: parent_id,
						};

				Meteor.call("insertPostComment", list, function(err) {
					if (err)
						console.log("Error in insertPostComment callback", err);
				});

			}
		}
	},

});

Template.editForumPostCommentForm.helpers({

	comment: function() {

		var comment_obj = Session.get("formInEditMode");
		if (comment_obj) {

			//if the comment is reply to the comment
			if(comment_obj["replyId"]) {

				var comment_id = comment_obj["commentId"];
				var reply_id = comment_obj["replyId"];

				var reply = get_reply_obj(comment_id, reply_id);
				if (reply && reply["reply"])
					return reply["reply"]["text"];
			}

			//if comment is "normal" comment (not a reply)
			else {
				var comment_id = comment_obj["commentId"];

				var comment = ForumPostComments.findOne({_id: comment_id});
				if (comment)
					return comment["text"];
			}
		}
		else
			return "";
	},
});


Template.editForumPostCommentForm.events({

	"click #edit-post-comment": function(e) {

		var form = $("#edit-forum-post-comment");
		form.modal("hide");

		var parent_id = form.attr("parentId");
		form.removeAttr("parentId");

		var comment = $("#edit-comment-field").val();
		$("#edit-comment-field").val("");

		var comment_obj = Session.get("formInEditMode");
		if (!comment_obj)
			return;

		var comment_id = comment_obj["commentId"];
		if (comment_obj["replyId"]) {

			var reply_id = comment_obj["replyId"];

			var post_comment = ForumPostComments.findOne({_id: comment_id});
			if (post_comment) {
				var list = {replyId: reply_id,
							commentId: comment_id,
							projectId: post_comment["projectId"],
							comment: comment,
						};

				Meteor.call("editCommentReply", list, function(err) {
					if (err)
						console.log("Error in editCommentReply callback", err);
				});
			}
		}

		else {

			var list = {commentId: comment_obj["commentId"],
						projectId: Session.get("forumPostProjectId"),
						text: comment};

			Meteor.call("editPostComment", list, function(err) {
				if (err)
					console.log("Error in editPostComment callback", err);
			});
		}

		Session.set("formInEditMode", reset_variable());
	},

});

Template.editForumPost.helpers({

	post: function() {
		return ForumPosts.findOne();
	},

});

Template.editForumPost.events({

	'click #edit-post' : function(e) {
		e.preventDefault();

		$("#edit-forum-post").modal("hide");

		var res = get_post_form_values();

		var list = {postId: Session.get("forumPostId"),
					projectId: Session.get("forumPostProjectId"),
					text: res["text"],
					title: res["title"],
					tags: res["tags"],
					};

		Meteor.call("editPost", list, function(err) {
			if (err)
				console.log("Error in editPost callback", err);
		});

		return;
	},
});

function show_comment_form(form_id, parent_id) {
	var form = $(form_id);

	if (parent_id)
		form.attr("parentId", parent_id);

	form.modal("show");
}

function add_user_data(post) {
	var user = Users.findOne({systemId: post["authorId"]});
	if (user) {
		post["author"] = user["name"] + " " + user["surname"];
		post["image"] = user["profileImage"];
	}
}

function add_is_post_author(comment, user_id) {
	if (comment["authorId"] == user_id)
		comment["isAuthor"] = true;
}

function get_post_id(e) {
	var source = $(e.target).closest(".post-comment");
	return source.attr("id");
}
