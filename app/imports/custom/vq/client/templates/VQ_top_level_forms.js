import { Template } from 'meteor/templating';
import { Projects, Tools } from '../../../../db/platform/collections.js'
import './VQ_top_level_forms.html'
import { dataShapes } from '../../../../custom/vq/client/js/DataShapes.js'
import { Services } from '../../../../db/platform/collections.js'
import { Utilities, reset_variable } from '../../../../platform/client/js/utilities/utils.js'

const VQToolGroup = 'VQ';
const VQToolGroupName = 'ViziQuer';

Template.VQ_structureRibbon_button.helpers({
  isVQ: async function() {
  	const tool = await Tools.findOneAsync({toolGroup: VQToolGroup, isDeprecated: {$ne: true}});
    console.log('Template.VQ_structureRibbon_button.helpers -- isVQ')
    //console.log('Iekš Template.VQ_structureRibbon_button.helpers', tool, Tools.findOne({isDeprecated: {$ne: true}}))
	  if ( tool !== undefined)
	   return true;
	  else
		  return false;
	},
  toolGroupName: function() {
    return VQToolGroupName;
	},

});

Template.VQ_structureRibbon_button.events({
	'click #VQ_add': function(e) {
		e.preventDefault();
		Template.VQcreateProjectModal.loading.set(false);
		$("#add-project").modal("show");
		return;
	},
});

Template.VQcreateProjectModal.loading = new ReactiveVar(false);
Template.VQcreateProjectModal.services = new ReactiveVar("");
Template.VQcreateProjectModal.schemas = new ReactiveVar();
Template.VQcreateProjectModal.allSchemas = new ReactiveVar();
Template.VQcreateProjectModal.schemaTags = new ReactiveVar([{name:"All", display_name: "All schemas"}]);

Template.VQcreateProjectModal.rendered = async function() {
  const tool = await Tools.findOneAsync({toolGroup: VQToolGroup, isDeprecated: {$ne: true}});
  //console.log('Template.VQcreateProjectModal.rendered')
	const rr = await dataShapes.getOntologiesAndTags();
	const tags = rr.tags;

	if (_.size(tags) > 0) {
		tags.unshift({name:"All", display_name: "All schemas"});
		Template.VQcreateProjectModal.schemaTags.set(tags);
	}
	Template.VQcreateProjectModal.loading.set(false);

	const schemas = rr.schemas;
	if (schemas && schemas.length > 0) {
    for ( const sc of schemas ) {
      sc.display_name_full = `${sc.display_name} (${sc.sparql_url} Class count:${sc.class_count})`;
    }
		Template.VQcreateProjectModal.allSchemas.set(schemas);
	}
	Template.VQcreateProjectModal.schemas.set(getSchemas('All')); // TODO te varētu būt kāds sākotnējais tags uzstādīts
}

Template.VQcreateProjectModal.helpers({
  toolGroupName: function() {
    return VQToolGroupName;
	},
	loading: function() {
		return Template.VQcreateProjectModal.loading.get();
	},
	schemas: function() {
		return Template.VQcreateProjectModal.schemas.get();
	},
	schema_tags:function() {
		return Template.VQcreateProjectModal.schemaTags.get();
	},
	VQtools: async function() {
    console.log('Template.VQcreateProjectModal.helpers VQtools')
    //const tools = await Tools.find({ isDeprecated: {$ne: true},}, {$sort: {name: 1}}).fetchAsync();

    let result = [];
    let resultAll = [];
    let tool_id = "";
    Tools.find({ isDeprecated: {$ne: true},}, {$sort: {name: 1}}).forEach(
      function(t) {
        let tt = {};
        resultAll.push(t);
        if (((t.toolGroup && t.toolGroup === VQToolGroup)|| t.toolGroup === undefined) && t.name !== '_Configurator') {
          tt = {_id: t._id, name: t.name};
          if (t.name ===  VQToolGroupName || t.name === 'Viziquer' || t.name === 'ViziQuer') {
            tt["selected"] = "selected";
            tool_id = t._id;
          }
          result.push(tt);
        }
      }
    );

    if ( tool_id === "" && result.length > 0) {
			result[0]["selected"] = "selected";
			tool_id = result[0]._id;
		}

		if (tool_id !== "") {
			await setServices (tool_id);
    }

    console.log(resultAll, result)
    return result;
	},
	services: function() {
		return Template.VQcreateProjectModal.services.get();
	},

});

Template.VQcreateProjectModal.events({

	'click #create-project': async function() {

		const project_name_obj = $('#project-name');
		const icon_name_obj = $("#icon-name");
		const category_obj = $("#category-name");
		let isProject = false;
    let schema_name = "";
    const selectSchema = document.getElementById("schema-selection");
    const selection = selectSchema.value;

    const selectedSchema = Template.VQcreateProjectModal.schemas.get().filter(function(f){ return f.display_name_full === selection;})
    if ( selectedSchema.length > 0 )
      schema_name = selectedSchema[0].display_name;

		let project_name = project_name_obj.val();
		const o = $('input[name=stack-radio]:checked').closest(".schema");

		if (project_name === "" && o.attr("name") !== undefined && o.attr("name") !== "" && o.attr("name") !== "Def") {
			project_name = o.attr("name");
			isProject = true;
		}

		if (project_name === "" && schema_name !== "") {
			project_name = schema_name;
		}

		if(project_name !== "") {

			document.getElementById("project-name-required").style.display = "none";
			document.getElementById("project-name").style.borderColor = "#ccc";

			const tool_id = $("#tool").find(":selected").attr("id");
			const icon_name = icon_name_obj.val();
			const category_name = category_obj.val();

			//resets tools query
			Session.set("tools", reset_variable());

			let list = {name: project_name,
						icon: icon_name,
						category: category_name,
						toolId: tool_id,
						showPrefixesForAllNames: "true",
						decorateInstancePositionConstants: "true",
					};

			const o = $('input[name=stack-radio]:checked').closest(".schema");
			list.project_link = o.attr("link")
			//console.log("Jauna projekta taisīšana");

			if ( schema_name !== "" && !isProject) {
				const schemas = Template.VQcreateProjectModal.schemas.get();
				const schema_info = _.filter(schemas, function(o){ return o.display_name === schema_name});

				if ( schema_info.length > 0 && schema_info[0].display_name !== "") {
					list.schema = schema_name;
					list.endpoint = schema_info[0].sparql_url;
					list.uri = schema_info[0].named_graph;
					list.queryEngineType = schema_info[0].endpoint_type;
					list.directClassMembershipRole = schema_info[0].direct_class_role;
					list.indirectClassMembershipRole = schema_info[0].indirect_class_role;
				}
			}
			//console.log("Jauna projekta taisīšana", list);
			Template.VQcreateProjectModal.loading.set(true);
			await Utilities.callMeteorMethodAsync("insertProject", list);
			$("#add-project").modal("hide");
			Template.VQcreateProjectModal.loading.set(false);

		} else {

			console.log(document.getElementById("project-name").style.borderColor)
			document.getElementById("project-name").style.borderColor = "red";
			document.getElementById("project-name-required").style.display = "block";
		}
	},
	'change #tool' : async function(){
		const tool_id = $("#tool").find(":selected").attr("id");
		await setServices (tool_id);
	},
	'change #schema-tags' : function(){
		const tag = $("#schema-tags").val();
		Template.VQcreateProjectModal.schemas.set(getSchemas(tag));
	},
});


async function setServices (tool_id) {
	let result = {};

	Meteor.subscribe("Services", {}); // TODO bez šī man reizēm neizdevās tikt klāt

	if ( tool_id !== 'undefined')
	{
    const services = await Services.findOneAsync({toolId: tool_id });

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

	Template.VQcreateProjectModal.services.set(result);
}

function getSchemas(tag) {
	let schemas = [];
	const allSchemas = Template.VQcreateProjectModal.allSchemas.get() || [];

	for ( const sc of allSchemas ) {
		if ( tag !== 'All' && sc.tags.includes(tag))
			schemas.push(sc);
		else if ( tag === 'All' )
			schemas.push(sc);
	}

	schemas.unshift({display_name: "", display_name_full: ""});
	return schemas;
}

function filterSchemas(filter) {
	let schemas = [];
	const allSchemas = Template.VQcreateProjectModal.allSchemas.get() || [];

	for ( const sc of allSchemas ) {
    if ( sc.display_name_full.toLowerCase().indexOf(filter) > -1)
			schemas.push(sc);
	}

	schemas.unshift({display_name: ""});
	return schemas;
}
