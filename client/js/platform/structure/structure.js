

Template.structureTemplate.helpers({

	categories: function() {

	    //selelcts project properties

	    var categories = {};

	    var active_project = Session.get("activeProject");
	    var user_id = Session.get("userSystemId");

		ProjectsUsers.find({userSystemId: Session.get("userSystemId")}).forEach(

			function(user_proj, i) {
				var proj_id = user_proj["projectId"];

				var project = Projects.findOne({_id: proj_id});
				
				var category = "";
				if (project) {
					user_proj["name"] = project["name"];
					user_proj["icon"] = project["icon"];

					if (project.createdBy == user_id) {
						user_proj.isOwner = true;
					}

					category = project["category"] || "";
				}

				user_proj["styleClass"] = "bg-info";
				if (proj_id == active_project) {
					user_proj["styleClass"] = "bg-danger";
				}

				if (user_proj["role"] == "Admin" && user_proj["status"] == "Member") {
					user_proj["isEditable"] = true;
				}

				if (user_proj["role"] == "Admin" || user_proj["role"] == "Reader") {
					user_proj["isDefault"] = true;
				}

				if (categories[category]) {
					categories[category].push(user_proj);
				}
				else {
					categories[category] = [user_proj];
				}
		});

		var res = [];

		//if no category name, then these projects are rendered at the begining
		if (categories[""]) {
			res.push({name: "", projects: categories[""]});
		}

		//selecting all the proceses that are have category name
		_.each(categories, function(projects, category_name) {
			if (category_name) {
				res.push({name: category_name, projects: projects});
			}
		});

		return res;
	},

});

Template.structureTemplate.events({

	'mouseover .container': function(e) {
		var container = $(e.target).closest(".project-path");

		var proj_container = $(e.target).closest(".container");
		var width = proj_container.width();
		var height = proj_container.height();

		container.find(".project-dropdown-container").removeClass("hidden")
														.css("left", width-10);
	},

	'mouseleave .project-container': function(e) {
		$(e.target).closest(".container").find(".project-dropdown-container").addClass("hidden");								
	},

	'click .project-path': async function(e) {
		e.preventDefault();
		
		var src = $(e.target).closest(".project-path");
		var proj_id = src.attr("id");
		var version_id = Utilities.changeUserActiveProject(proj_id);
		dataShapes.changeActiveProject(proj_id);
    	Router.go("diagrams", {projectId: proj_id, versionId: version_id});

		//return;
	},
  
  	'click .project-dropdown-container': function(e) {
		e.stopPropagation();
		$(e.target).closest(".container").find(".project-dropdown-container").addClass("open")
		                                                                  	.removeClass("hidden");
	},

	'click .edit-project-obj': function(e) {
		e.preventDefault();
		e.stopPropagation();

		var proj_id = $(e.target).closest(".project-path").attr("id");
		Session.set("editProjectId", proj_id);

		$(e.target).closest(".container").find(".project-dropdown-container").removeClass("open")
		                                                                  		.addClass("hidden");

		$("#edit-project-form").modal("show");

		return;
	},

	'click .remove-project-obj': function(e) {
		e.preventDefault();
		//e.stopPropagation();

		var proj_id = $(e.target).closest(".project-path").attr("id");

		var list = {projectId: proj_id};
		Utilities.callMeteorMethod("removeProject", list);

		return;
	},


	'click .duplicate-project-obj': function(e) {
		e.preventDefault();
		//e.stopPropagation();

		var proj_id = $(e.target).closest(".project-path").attr("id");
		var list = {projectId: proj_id};

		Utilities.callMeteorMethod("duplicateProject", list);

		return;
	},


	'click .leave-project': function(e) {
		e.preventDefault();
		//e.stopPropagation();

		console.log("leave project")

		var proj_id = $(e.target).closest(".project-path").attr("id");
		var list = {projectId: proj_id};

		Utilities.callMeteorMethod("leaveProject", list);

		
		

		return;
	},

});

Template.structureRibbon.events({

	'click #add': function(e) {
		e.preventDefault();

		$("#add-project").modal("show");
		return;
	},

});

Template.createProjectModal.helpers({

	tools: function() {
		var tools = Tools.find({isDeprecated: {$ne: true},}, {$sort: {name: 1}}); 
		var result = {tools:[]};

		tools.forEach(function(t) {
			result.tools.push({_id: t._id, name: t.name}); 
		});
		
		if ( tools.count() > 0)
			Session.set("tool", result.tools[0]._id);
	
		else
			Session.set("tool", reset_variable());
		
		return result;
	},
	services: function() {
		var result = {};
	    var tool_id = Session.get("tool");
	    Meteor.subscribe("Services", {});	
		
		if ( tool_id != 'undefined')
		{
			var services = Services.findOne({toolId: tool_id });
			if (services && services.schemas)
			{
				result.schemas = [];
				_.each(services.schemas, function (s){
					result.schemas.push({caption: "Initialise project by " + s.caption, name: s.name, link: s.link});
				});
			}
			
			if (services && services.projects)
			{
				result.projects = [];
				_.each(services.projects, function (p){
					result.projects.push({caption: "Initialise by " + p.caption, name: p.name, link: p.link});
				});
			}			
		}
					
		return result;
	},

});

Template.createProjectModal.events({

	'click #create-project': function(e) {

		var project_name_obj = $('#project-name');
		var icon_name_obj = $("#icon-name");
		var category_obj = $("#category-name");

		var project_name = project_name_obj.val();
		
		if(project_name != ""){
			
			document.getElementById("project-name-required").style.display = "none";
			document.getElementById("project-name").style.borderColor = "#ccc";
			
			$("#add-project").modal("hide");
			
			var tool_id = $("#tool").find(":selected").attr("id");
			var icon_name = icon_name_obj.val();
			var category_name = category_obj.val();

			//console.log(tool_id);
			//console.log(Services.find().count())
			//console.log(Services.findOne({toolId: tool_id }));

			//resets tools query
			Session.set("tools", reset_variable());

			var list = {name: project_name,
						icon: icon_name,
						category: category_name,
						toolId: tool_id,
						showPrefixesForAllNames: "true",
					};

			var obj = $('input[name=stack-radio]:checked').closest(".schema");
			var type = obj.attr("type");
			if ( type == "schema" )
				list.schema_link = obj.attr("link")
			if ( type == "project" )
				list.project_link = obj.attr("link")	
			//console.log("Jauna projekta taisīšana");

			Utilities.callMeteorMethod("insertProject", list);
		} else {
			
			console.log(document.getElementById("project-name").style.borderColor)
			
			document.getElementById("project-name").style.borderColor = "red";
			document.getElementById("project-name-required").style.display = "block";
		}
	},
	'click #tool' : function(e){
		var tool_id = $("#tool").find(":selected").attr("id");
		Session.set("tool", tool_id)
	},
});

Template.createProjectModal.onDestroyed(function() {
	Session.set("tool", reset_variable()) ;  
});

Template.editProjectModal.helpers({

	data: function() {
		var proj = Projects.findOne({_id: Session.get("editProjectId")});
		if (proj) {
			return {name: proj["name"] || "",
						icon: proj["icon"] || "",
						category: proj["category"] || "",
					};
		}
	},
});

Template.editProjectModal.events({

	"click #project-edited": function(e) {
		e.preventDefault();

		$("#edit-project-form").modal("hide");

		var project_name = $('#edit-project-name').val();
		var icon_name = $("#edit-icon-name").val();
		var category_name = $("#edit-category-name").val();
		var proj_id = Session.get("editProjectId");
		
		var list = {projectId: proj_id,
					set: {name: project_name, icon: icon_name, category: category_name},
				};

		Utilities.callMeteorMethod("updateProject", list);

		Session.set("editProjectId", reset_variable());

		return;
	},

});

//End of createProjectModal