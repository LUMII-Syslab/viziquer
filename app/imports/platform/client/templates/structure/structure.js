import { FlowRouter } from 'meteor/ostrio:flow-router-extra'

import { Projects, ProjectsUsers, Tools } from '../../../../db/platform/collections.js'
import { Services } from '../../../../db/platform/collections.js'
import { Utilities, reset_variable } from '../../js/utilities/utils.js'

import { dataShapes } from '../../../../custom/vq/client/js/DataShapes.js'

import './structure.html'

Template.structureTemplate.helpers({

	categories: function() {

		//selelcts project properties

		var categories = {};

		var active_project = Session.get("activeProject");
		var user_id = Session.get("userSystemId");

		ProjectsUsers.find({userSystemId: Session.get("userSystemId")}).forEach(
			function(user_proj) {
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
				
				if(category === "OWLGrEd"){
					user_proj["styleClass"] = "bg-warning";
					if (proj_id == active_project) {
						user_proj["styleClass"] = "bg-success";
					}
				} else {
					user_proj["styleClass"] = "bg-info";
					if (proj_id == active_project) {
						user_proj["styleClass"] = "bg-danger";
					}
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
		//var height = proj_container.height();

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
		var version_id = await Utilities.changeUserActiveProject(proj_id);
		//await dataShapes.changeActiveProject(proj_id, 'click .project-path');
		FlowRouter.go("diagrams", {projectId: proj_id, versionId: version_id});

		//return;
	},

	'click .project-dropdown-container': function(e) {
		e.stopPropagation();
		$(e.target).closest(".container").find(".project-dropdown-container").addClass("open").removeClass("hidden");
	},

	'click .edit-project-obj': function(e) {
		e.preventDefault();
		e.stopPropagation();

		var proj_id = $(e.target).closest(".project-path").attr("id");
		Session.set("editProjectId", proj_id);

		$(e.target).closest(".container").find(".project-dropdown-container").removeClass("open").addClass("hidden");

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
		Template.createProjectModal.loading.set(false);
		$("#add-project").modal("show");
		return;
	},	
	
	'click #OWLGRED-add': function(e) {
		e.preventDefault();
		Template.createProjectModal.loading.set(false);
		$("#OWLGRED-add-project").modal("show");
		return;
	},

});

Template.createProjectModal.loading = new ReactiveVar(false);
Template.createProjectModal.services = new ReactiveVar("");
Template.createProjectModal.schemas = new ReactiveVar();
Template.createProjectModal.allSchemas = new ReactiveVar();
Template.createProjectModal.schemaTags = new ReactiveVar([{name:"All", display_name: "All schemas"}]);

async function setServices (tool_id) {
	var result = {};

	Meteor.subscribe("Services", {}); // TODO bez šī man reizēm neizdevās tikst klāt

	if ( tool_id != 'undefined')
	{
		//var services = Services.findOne({toolId: tool_id });
    var services = await Services.findOneAsync({toolId: tool_id });

		if (services && services.projects)
		{
			result.projects = [];
      for (const p of services.projects) {
        result.projects.push({caption: "Initialise by " + p.caption, name: p.name, link: p.link});
      }
      /*
      _.each(services.projects, function (p){
					result.projects.push({caption: "Initialise by " + p.caption, name: p.name, link: p.link});
			});
      */
		}
	}

	Template.createProjectModal.services.set(result);
}

Template.createProjectModal.helpers({
	loading: function() {
		return Template.createProjectModal.loading.get();
	},
	schemas: function() {
		return Template.createProjectModal.schemas.get();
	},
	schema_tags:function() {
		return Template.createProjectModal.schemaTags.get();
	},
	tools: async function() {
		//var tools = Tools.find({isDeprecated: {$ne: true},}, {$sort: {name: 1}});
    var tools = await Tools.find({isDeprecated: {$ne: true},}, {$sort: {name: 1}}).fetchAsync();

		var result = {tools:[]};
		var tool_id = "";

    for (const t of tools) {
			var tt = {_id: t._id, name: t.name};
			if ( t.name == "Viziquer" || t.name == "ViziQuer") {
				tt["selected"] = "selected";
				tool_id = t._id;
			}
			result.tools.push(tt);
    }
    /*
		tools.forEach(function(t) {
			var tt = {_id: t._id, name: t.name};
			if ( t.name == "Viziquer" || t.name == "ViziQuer") {
				tt["selected"] = "selected";
				tool_id = t._id;
			}
			result.tools.push(tt);
		});
    */

		if ( tool_id == "" && result.tools.length > 0) {
			result.tools[0]["selected"] = "selected";
			tool_id = result.tools[0]._id;
		}

		if (tool_id != "")
			await setServices (tool_id);

		//if ( tools.count() > 0)
		//	Session.set("tool", result.tools[0]._id);  // !!!!!!

		//else
		//	Session.set("tool", reset_variable());

		return result;
	},
	services: function() {
		return Template.createProjectModal.services.get();
	},

});

Template.createProjectModal.events({

	'click #create-project': async function() {

		var project_name_obj = $('#project-name');
		var icon_name_obj = $("#icon-name");
		var category_obj = $("#category-name");
		var isProject = false;
    //var schema_name = $("#dss-schema").find(":selected").attr("name");
		//var schema_name = $("#dss-schema").val();
    var schema_name = "";
    const selectSchema = document.getElementById("schema-selection");
    const selection = selectSchema.value;

    const selectedSchema = Template.createProjectModal.schemas.get().filter(function(f){ return f.display_name_full == selection;})
    if ( selectedSchema.length > 0 )
      schema_name = selectedSchema[0].display_name;

		var project_name = project_name_obj.val();
		var obj = $('input[name=stack-radio]:checked').closest(".schema");

		if (project_name == "" && obj.attr("name") != undefined && obj.attr("name") != "" && obj.attr("name") != "Def") {
			project_name = obj.attr("name");
			isProject = true;
		}

		if (project_name == "" && schema_name != "") {
			project_name = schema_name;
		}

		if(project_name != ""){

			document.getElementById("project-name-required").style.display = "none";
			document.getElementById("project-name").style.borderColor = "#ccc";

			//$("#add-project").modal("hide");

			var tool_id = $("#tool").find(":selected").attr("id");
			var icon_name = icon_name_obj.val();
			var category_name = category_obj.val();

			//resets tools query
			Session.set("tools", reset_variable());

			var list = {name: project_name,
						icon: icon_name,
						category: category_name,
						toolId: tool_id,
						showPrefixesForAllNames: "true",
						decorateInstancePositionConstants: "true",
					};

			var obj = $('input[name=stack-radio]:checked').closest(".schema");
			list.project_link = obj.attr("link")
			//console.log("Jauna projekta taisīšana");

			if ( schema_name != "" && !isProject) {
				var schemas = Template.createProjectModal.schemas.get();
				var schema_info = _.filter(schemas, function(o){ return o.display_name == schema_name});

				if ( schema_info.length > 0 && schema_info[0].display_name != "") {
					list.schema = schema_name;
					list.endpoint = schema_info[0].sparql_url;
					list.uri = schema_info[0].named_graph;
					list.queryEngineType = schema_info[0].endpoint_type;
					list.directClassMembershipRole = schema_info[0].direct_class_role;
					list.indirectClassMembershipRole = schema_info[0].indirect_class_role;
				}
			}
			//console.log("Jauna projekta taisīšana", list);
			Template.createProjectModal.loading.set(true);
			//Utilities.callMeteorMethod("insertProject", list, function() {
			//	$("#add-project").modal("hide");
			//	Template.createProjectModal.loading.set(false);
			//});
			await Utilities.callMeteorMethodAsync("insertProject", list);
			$("#add-project").modal("hide");
			Template.createProjectModal.loading.set(false);

		} else {

			console.log(document.getElementById("project-name").style.borderColor)

			document.getElementById("project-name").style.borderColor = "red";
			document.getElementById("project-name-required").style.display = "block";
		}
	},
	'change #tool' : async function(){
		var tool_id = $("#tool").find(":selected").attr("id");
		await setServices (tool_id);
		//Session.set("tool", tool_id);
	},
	'change #schema-tags' : function(){
		var tag = $("#schema-tags").val();
		Template.createProjectModal.schemas.set(getSchemas(tag));
		//var tag = $("#schema-tags").find(":selected").attr("id");
	},
});

function getSchemas(tag) {
	let schemas = [];
	const allSchemas = Template.createProjectModal.allSchemas.get() || [];

	for ( const sc of allSchemas ) {
		if ( tag != 'All' && sc.tags.includes(tag))
			schemas.push(sc);
		else if ( tag == 'All' )
			schemas.push(sc);
	}

	schemas.unshift({display_name: "", display_name_full: ""});
	return schemas;
}

function filterSchemas(filter) {
	let schemas = [];
	const allSchemas = Template.createProjectModal.allSchemas.get() || [];

	for ( const sc of allSchemas ) {
    if ( sc.display_name_full.toLowerCase().indexOf(filter) > -1)
			schemas.push(sc);
	}

	schemas.unshift({display_name: ""});
	return schemas;
}

Template.createProjectModal.rendered = async function() {
	// var rr = await dataShapes.getOntologies();
	var rr = await dataShapes.getOntologiesAndTags();
	//var rr = {};
	var tags = rr.tags;

	if (_.size(tags) > 0) {
		tags.unshift({name:"All", display_name: "All schemas"});
		Template.createProjectModal.schemaTags.set(tags);
	}
	Template.createProjectModal.loading.set(false);

	var schemas = rr.schemas;
	if (schemas && schemas.length > 0) {
    for ( const sc of schemas ) {
      sc.display_name_full = `${sc.display_name} (${sc.sparql_url} Class count:${sc.class_count})`;
    }
		Template.createProjectModal.allSchemas.set(schemas);
	}
	Template.createProjectModal.schemas.set(getSchemas('All')); // TODO te varētu būt kāds sākotnējais tags uzstādīts

}

//Template.createProjectModal.onDestroyed(function() {
//	Session.set("tool", reset_variable()) ;
//});

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

// START of OWLGRED_createProjectModal

Template.OWLGRED_createProjectModal.helpers({

	tools: async function() {
		//var tools = Tools.find({isDeprecated: {$ne: true},}, {$sort: {name: 1}});
    var tools = await Tools.find({isDeprecated: {$ne: true},}, {$sort: {name: 1}}).fetchAsync();

		var result = {tools:[]};
		var tool_id = "";

    for (const t of tools) {
			var tt = {_id: t._id, name: t.name};
			if ( t.name == "OWLGrEd" || t.name == "OWLGRED") {
				tt["selected"] = "selected";
				tool_id = t._id;
			}
			result.tools.push(tt);
    }

		if ( tool_id == "" && result.tools.length > 0) {
			result.tools[0]["selected"] = "selected";
			tool_id = result.tools[0]._id;
		}

		return result;
	},

});

Template.OWLGRED_createProjectModal.events({

	'click #OWLGRED-create-project': async function() {

		var project_name_obj = $('#OWLGRED-project-name');
		var icon_name_obj = $("#OWLGRED-icon-name");
		var category_obj = $("#OWLGRED-category-name");

		var project_name = project_name_obj.val();

		if (project_name == "") {
			project_name = "OWLGRED project";
		}

		if(project_name != ""){

			document.getElementById("OWLGRED-project-name-required").style.display = "none";
			document.getElementById("OWLGRED-project-name").style.borderColor = "#ccc";

			//$("#add-project").modal("hide");

			var tool_id = $("#OWLGRED-tool").find(":selected").attr("id");
			
			var icon_name = icon_name_obj.val();
			var category_name = category_obj.val();

			//resets tools query
			Session.set("tools", reset_variable());

			var list = {name: project_name,
						icon: icon_name,
						category: category_name,
						toolId: tool_id,
					};

			await Utilities.callMeteorMethodAsync("insertProject", list);
			$("#OWLGRED-add-project").modal("hide");

		} else {

			console.log(document.getElementById("project-name").style.borderColor)

			document.getElementById("project-name").style.borderColor = "red";
			document.getElementById("project-name-required").style.display = "block";
		}
	},
});

Template.OWLGRED_editProjectModal.helpers({

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

Template.OWLGRED_editProjectModal.events({

	"click #OWLGRED-project-edited": function(e) {
		e.preventDefault();

		$("#OWLGRED-edit-project-form").modal("hide");

		var project_name = $('#OWLGRED-edit-project-name').val();
		var icon_name = $("#OWLGRED-edit-icon-name").val();
		var category_name = $("#OWLGRED-edit-category-name").val();
		var proj_id = Session.get("editProjectId");

		var list = {projectId: proj_id,
					set: {name: project_name, icon: icon_name, category: category_name},
				};

		Utilities.callMeteorMethod("updateProject", list);

		Session.set("editProjectId", reset_variable());

		return;
	},

});

// END of OWLGRED_createProjectModal