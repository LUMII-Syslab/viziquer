Template.forumPosts.helpers({

	forum_posts: function() {

		var user_id = Session.get("userSystemId");

		var query = {};
		var proj_id = Session.get("selectedProject");
		if (proj_id)
			query["projectId"] = proj_id;

		return ForumPosts.find(query, {sort: {createdAt: -1}, limit: Session.get("postsPerPage")}).map(
			function(post) {

				//TODO: Need more advnaced processing
				var text = post["text"] || "";
				if (text.length < 300)
					post["shortText"] = text;
				else
					post["shortText"] = post["text"].substring(1, 300) + "...";

				//post["time"] = joined_date(post["createdAt"]);
				post["time"] = time_interval_from_given_date(post["createdAt"]);

				var user = Users.findOne({systemId: post["authorId"]});
				if (user)
					post["author"] = user["name"] + " " + user["surname"];

				var project = Projects.findOne({_id: post["projectId"]});
				if (project)
					post["projectName"] = project["name"];

				if (post["authorId"] == user_id)
					post["isAuthor"] = true;

				return post;
			});
	},
});

Template.forumPosts.events({

//searches on every key stroke for diagram title or compartment value
	'click #new-topic' : function(e, templ) {
		$("#add-forum-post").modal("show");
	},

	'click .remove-forum-post': function(e) {
		e.preventDefault();

		var button = $(e.target).closest(".remove-button"); 
		var post_id = button.attr("id");
		var project_id = button.attr("projectId");

		var list = {postId: post_id, projectId: project_id};
		Meteor.call("removePost", list, function(err) {
			if (err)
				console.log("Error in removePost callback", err);
		});

		return;
	},

	'mouseover .blog-container': function(e) {

		var container = $(e.target).closest(".blog-container");
		var width = container.width();

		container.find(".remove-button").removeClass("hidden")
										.css("left", width-20);
	},

	'mouseleave .blog-container': function(e) {
		$(e.target).closest(".blog-container").find(".remove-button").addClass("hidden");								
	},

});

Template.addForumPost.events({

	'click #add-post': function() {

		$("#add-forum-post").modal("hide");

		var is_cleaning_needed = true;
		var res = get_post_form_values(is_cleaning_needed);

		var list = {title: res["title"],
					text: res["text"], 
					projectId: Session.get("activeProject"),
					tags: res["tags"],
					commentsCount: 0,
					seenCount: 0,
				};

		Meteor.call("insertPost", list, function(err) {
			if (err)
				console.log("Error in insertPost callback", err);
		});

	},

});

Template.forumTags.helpers({

	tags: function() {

		var tags = [];
		var selected_proj = Session.get("selectedProject");

		var tag_dictionary = {};
		ForumPostTags.find({}, {sort: {name: 1}}).map(function(tag) {
			var tag_name = tag["name"];

			//checking if the tag was not removed or if it is not already in the list
			if (tag["forumPosts"].length > 0 && !tag_dictionary[tag_name]) {
				
				//adding the tag to the list, so it was not repeated in the list
				tag_dictionary[tag_name] = true;
		
				tags.push({name: tag_name,
							nr: 1,
							tag: build_hash_tag(tag_name),
							project: selected_proj,
						});
			}
		});

		return tags;
	},
});

Template.forumTagSearch.helpers({

	searched_tag: function() {
		return Session.get("tag");
	},

});

Template.forumTagSearch.events({

	"keypress #search-tag": function(e) {
		search_by_tag(e);
	},

	"click #forum-search-btn": function(e) {
		e.keyCode = 13;
		search_by_tag(e);
	},

});

Template.forumPagination.helpers({

	paginations: function() {

		var tag = Session.get("tag");
		var nr = Session.get("nr");

		//computing the total count of pagination pages
		var paginations_count = compute_pagination_count();

		//getting the count of pagination page
		var paginations_per_page = get_paginations_per_page();

		var first_pagination = 1;

		//computing the last pagination number
		var last_pagination = paginations_per_page;
		if (nr > paginations_per_page-1)
			last_pagination = nr + 1;

		last_pagination = Math.min(paginations_count, last_pagination);

		//computing the first pagination number
		first_pagination = last_pagination - paginations_per_page + 1;
		first_pagination = Math.max(1, first_pagination);

		var paginations = [];
		var selected_proj = Session.get("selectedProject");
		for (var i=first_pagination;i<=last_pagination;i++) {
			if (!tag)
				tag = "no-tag";

			var item = {nr: i, tag: tag, value: i, project: selected_proj};
			if (i == nr) {
				item["active"] = "active";
			}

			paginations.push(item);
		}

		return paginations;
	},
});

Template.forumPagination.events({

	"click #previous": function(e) {
		e.preventDefault();

		var nr = Session.get("nr");
		var new_nr = Math.max(nr-1, 1);

		go_to_forum(new_nr);

		return;
	},

	"click #next": function(e) {
		e.preventDefault();

		var nr = Session.get("nr");

		var paginations_count = compute_pagination_count();
		var new_nr = Math.min(nr+1, paginations_count);

		go_to_forum(new_nr);

		return;
	},

});

Template.forumProjectsSelection.helpers({

	projects: function() {

		var active_project = Session.get("selectedProject");
		var item = {name: "--All projects --", isDefault: true};
		if (!active_project) {
			item["selected"] = "selected";
		}

		//setting the first item
		var projects = [item];
		
		//selecting projects
		ProjectsUsers.find({status: "Member"}).forEach(function(project) {

			var proj_id = project["projectId"];
			if (proj_id == active_project)
				project["selected"] = "selected";

			var proj = Projects.findOne({_id: proj_id});
			if (proj)
				project["name"] = proj["name"];

		 	projects.push(project);
		});

		return projects;
	},

});

Template.forumProjectsSelection.events({

	"change #project-selection": function(e) {

		var option = Dialog.getSelectionItem($("#project-selection"));
		var proj_id = option.attr("projectId");

		if (!proj_id)
			proj_id = "all-projects";

		go_to_forum(1, undefined, proj_id);
	},
});


function compute_pagination_count() {

	var post_count_obj = ForumPostsCount.findOne();
	if (!post_count_obj)
		return;

	var post_count = post_count_obj["count"];
	var posts_per_page = Session.get("postsPerPage");

	return Math.ceil(post_count / posts_per_page);
}

get_post_form_values = function(is_cleaning_needed) {

	var title = $("#title").val();
	var message = $("#message").val();

	if (is_cleaning_needed) {
		$("#title").val("");
		$("#message").val("");			
	}

	var hash_tags = message.match(/#\S*/ig);

	var tags = _.map(hash_tags, function(hash_tag) {
		return remove_hash_tag(hash_tag);
	});

	if (!tags)
		tags = [];

	return {title: title, text: message, tags: tags};
}

remove_hash_tag = function(hash_tag) {
	if (hash_tag)
		return hash_tag.substring(1, hash_tag.length);
}

function build_hash_tag(tag) {
	if (tag && tag != "")
		return "#" + tag;
	else
		return "no-tag";
}

function get_paginations_per_page() {
	return 10;
}

function go_to_forum(nr, tag, proj) {

	if (!nr)
		nr = Session.get("nr");

	if (tag == "no-tag")
		tag = reset_variable();
	else
		if (!tag)
			tag = Session.get("tag");

	if (proj == 'all-projects')
		proj = reset_variable();
	else
		if (!proj)
			proj = Session.get("selectedProject");

	Router.go("forum", {nr: nr, tag: build_hash_tag(tag), project: proj});
}

function search_by_tag(e) {

	if (e.keyCode == 13) {
		var tag = $("#search-tag").val();

		if (!tag)
			tag = "no-tag";

		go_to_forum(undefined, tag, undefined);
	}
}
