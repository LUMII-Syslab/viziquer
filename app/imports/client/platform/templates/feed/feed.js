import './feed.html'

//Start of postsT

Template.postsT.helpers({

	posts: function() {

		var current_date = get_current_time();

		return Posts.find({parentId: {$exists: false}}, {sort: {createdAt: -1}}).map(
			function(post) {

				var item = {};
				make_post(item, post, current_date);

				//collecting the post replies
				item["replies"] = Posts.find({parentId: post["_id"]}, {sort: {createdAt: 1}}).map(
					function(reply) {

						var reply_item = {};
						make_post(reply_item, reply, current_date);

						return reply_item;
				});

			return item;
		});
	},
});

Template.postReply.events({

//posts a reply to the main post
	'keypress .reply-input' : function(e, templ) {
		if (e.keyCode == 13) {

			var reply_input = $(e.target);
			var text = reply_input.val();
			var post_id = get_first_post_id(reply_input);

			var list = {text: text,
						projectId: Session.get("activeProject"),
						parentId: post_id,
					};

			Utilities.callMeteorMethod("insertFeedPost", list);

			reply_input.val("");
		}
	}
});

Template.post.events({

//post a like or unlike the previously posted like
	'click .like' : function(e, templ) {
		e.preventDefault();
		var src = $(e.target);
		var id = get_post_id(src);
		var user_id = Session.get("userSystemId");

		var like_type = src.attr("like");
		if (like_type == "Like") {

			var list = {projectId: Session.get("activeProject"),
						postId: id,
					};

			Utilities.callMeteorMethod("likePost", list);

			analytics.track("Like clicked", {
			  eventName: "Tsting like Wine Tasting",
			  couponValue: 50,
			});

		}
		else if (like_type == "Unlike") {

			var list = {postId: id};
			Utilities.callMeteorMethod("unLikePost", list);
		}
	},

//shows a window with all the likers
	'click .likeCount' : function(e, templ) {
		e.preventDefault();
		var post_id = get_post_id($(e.target));
		Session.set("activePost", post_id);

		$('#likers-form').modal("show");

		return false;
	},	

//makes a post editable
	'click .editPost' : function(e, templ) {
		e.preventDefault();		
		var id = $(e.target).closest(".feed-message").attr("id");
		Session.set("editPostId", id);
	},	

//delete a post
	'click .deletePost' : function(e, templ) {
		e.preventDefault();
		var id = get_post_id($(e.target));

		var list = {postId: id};
		Utilities.callMeteorMethod("removeFeedPost", list);

		return false;
	},

//saves the edit post when enter pressed
	'keypress, blur .edit-post' : function(e, templ) {
		if (e.keyCode == 13 || e.type == "focusout") {

			var edit_post = $(e.target);
			var edited_post = edit_post.val();
			var id = get_post_id(edit_post);

			//updating the post
			if (edited_post != "") {

				var list = {postId: id, text: edited_post};
				Utilities.callMeteorMethod("updateFeedPost", list);
			}

			//if entered text is empty, then removes the post
			else {

				var list = {postId: id};
				Utilities.callMeteorMethod("removeFeedPost", list);
			}

			Session.set("editPostId", reset_variable());	
		}
	},

});

//adds author name and profile image to the post
function add_author_details(item) {
	//sets user name from its id and its profile image
	var user = Users.findOne({systemId: item["authorId"]});
	if (user) {
		var name = user["name"];
		var surname = user["surname"];
		item["fullName"] = name + " " + surname;
		item["profileImage"] = user["profileImage"];
	}
}

//adds like or unlike to the post depending of the user has liked the post
function set_like_or_unlike(post_id) {
	var is_liker = Likers.findOne({postId: post_id, userSystemId: Session.get("userSystemId")});
	if (is_liker)
		return "Unlike";
	else
		return "Like";
}

//adds edit and delete buttons if user has rights to perform these actions
function set_edit_delete_post(post) {
	if (post["authorId"] == Session.get("userSystemId"))
		return true;
}

// End of postsT

Template.projectTemplate.helpers({
	is_posts: function() {
		var posts_count = Posts.find().count();
		var total_posts = Counts.findOne({_id: Session.get("activeProject")});
		if (posts_count > 0 && total_posts && total_posts["count"] > posts_count) {
			return true;
		}
	},
});

Template.projectTemplate.events({

//posts a post on the wall
	'click #post': function(e, templ) {
		var post_msg = $("#post-msg");
		var text = post_msg.val();

		var list = {text: text,
					projectId: Session.get("activeProject"),
				};

		Utilities.callMeteorMethod("insertFeedPost", list);

		post_msg.val("");
	},

	'click #loadMore' : function(e) {

		var posts = Session.get("posts");
		var count = Number(posts["count"]) + 50;

		Session.set("posts", posts);
	},

});

/* End of projectTemplate */

/* Start of likersFormTemplate */

Template.likersT.helpers({
	likers: function() {

		var current_date = get_current_time();
		var post_id = Session.get("activePost");

		return Likers.find({postId: post_id}).map(function(like) {

			like["time"] = time_interval_from_given_date(like["createdAt"], current_date);
			var user = Users.findOne({systemId: like["userSystemId"]});
			if (user) {
				like["name"] = user["name"] + " " + user["surname"];
				like["profileImage"] = user["profileImage"];
			}

			return like;
		});
	},
});

/* End of likersFormTemplate */

function make_post(item, post, current_date) {

	copy_post_properties(item, post);

	//sets "beautiful" date form from the post
	item["postTime"] = time_interval_from_given_date(post["createdAt"], current_date); 
	item["createdAt"] = post["createdAt"];

	//set like or unlike to the post
	item["likeUnlike"] = set_like_or_unlike(post["_id"]);

	item["editDelete"] = set_edit_delete_post(post);

	//sets author details
	item["authorId"] = post["authorId"];
	add_author_details(item);

	//item["likers"] = [];
	item["likesCount"] = post["likesCount"];
	item["projectId"] = Session.get("activeProject");

	if (item["_id"] == Session.get("editPostId")) {
		item["editPost"] = true;
	}
}

function copy_post_properties(item, post) {
	item["_id"] = post["_id"];
	item["text"] = post["text"];
	item["authorSystemId"] = post["authorSystemId"];
	item["likeType"] = post["likeType"];
}

//gets first post's id from any post's or sub-post's item
function get_first_post_id(src) {
	return src.closest(".profile-message").find(".post").attr("id");
}

//gets the closest post's id from its items
function get_post_id(src) {
	return get_post(src).attr("id");
}

//gets the closest post
function get_post(src) {
	return src.closest(".message"); 
}
