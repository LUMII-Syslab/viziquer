import { Projects, Tools } from '../../../../db/platform/collections.js'
import './VQ_top_level_forms.html'
import { dataShapes } from '../../../../custom/vq/client/js/DataShapes.js'
import { Services } from '../../../../db/platform/collections.js'
import { Utilities, reset_variable } from '../../../../platform/client/js/utilities/utils.js'

const VQToolGroup = 'VQ';

Template.VQ_structureRibbon_button.helpers({
  isVQ: function() {
  	var tool = Tools.findOne({toolGroup: VQToolGroup,isDeprecated: {$ne: true}});
    //console.log('Iekš Template.VQ_structureRibbon_button.helpers', tool)
	  if ( tool != undefined)
	   return true;
	  else
		  return false;
	},

});

Template.VQ_structureRibbon_button.events({
	'click #VQ_add': function(e) {
		e.preventDefault();
		Template.createProjectModal.loading.set(false);
		$("#add-project").modal("show");
		return;
	},
});

Template.createProjectModal.loading = new ReactiveVar(false);
Template.createProjectModal.services = new ReactiveVar("");
Template.createProjectModal.schemas = new ReactiveVar();
Template.createProjectModal.allSchemas = new ReactiveVar();
Template.createProjectModal.schemaTags = new ReactiveVar([{name:"All", display_name: "All schemas"}]);

Template.createProjectModal.rendered = async function() {
	var rr = await dataShapes.getOntologiesAndTags();
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
    var tools = await Tools.find({ isDeprecated: {$ne: true},}, {$sort: {name: 1}}).fetchAsync();

		var result = {tools:[]};
		var tool_id = "";

    for (const t of tools) {
      var tt = {};
      if ( t.toolGroup && t.toolGroup == VQToolGroup)
        tt = {_id: t._id, name: t.name};
      else if ( t.toolGroup == undefined)
        tt = {_id: t._id, name: t.name};

      if ( tt._id != undefined) {
        if ( t.name == "Viziquer" || t.name == "ViziQuer") {
          tt["selected"] = "selected";
          tool_id = t._id;
        }
         result.tools.push(tt);
      }
    }

		if ( tool_id == "" && result.tools.length > 0) {
			result.tools[0]["selected"] = "selected";
			tool_id = result.tools[0]._id;
		}

		if (tool_id != "")
			await setServices (tool_id);

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
	},
	'change #schema-tags' : function(){
		var tag = $("#schema-tags").val();
		Template.createProjectModal.schemas.set(getSchemas(tag));
	},
});


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

//End of createProjectModal

