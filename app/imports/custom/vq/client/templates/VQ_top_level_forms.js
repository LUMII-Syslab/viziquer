import { Template } from 'meteor/templating';
import { Projects, Tools } from '../../../../db/platform/collections.js'
import './VQ_top_level_forms.html'
import { dataShapes } from '../../../../custom/vq/client/js/DataShapes.js'
import { Services } from '../../../../db/platform/collections.js'
import { Utilities, reset_variable } from '../../../../platform/client/js/utilities/utils.js'

const VQToolGroup = 'VQ';
const VQToolGroupName = 'ViziQuer';

Template.VQ_structureRibbon_button.helpers({
  isVQ: function() {
  	const tool = Tools.findOne({toolGroup: VQToolGroup, isDeprecated: {$ne: true}});
    console.log('Template.VQ_structureRibbon_button.helpers -- isVQ')
    //console.log('Iekš Template.VQ_structureRibbon_button.helpers', tool, Tools.findOne({isDeprecated: {$ne: true}}))
	  if ( tool !== undefined ) {
	   return true;
    }
	  else {
      let rez = false;
      Tools.find({ isDeprecated: {$ne: true},}).forEach(
        function(t) {
          if ( t.toolGroup === undefined) {
            rez = true;
          }
        }
      );
		  return rez;
    }
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
//Template.VQcreateProjectModal.schemaTags = new ReactiveVar([{name:"All", display_name: "All schemas", title: "All schemas"}]);
Template.VQcreateProjectModal.schemaTags = new ReactiveVar([{name:"First", display_name: "", title: ""}, {name:"All", display_name: "All schemas", title: "All schemas"}]);

Template.VQcreateProjectModal.rendered = async function() {
  const tool = await Tools.findOneAsync({toolGroup: VQToolGroup, isDeprecated: {$ne: true}});
  console.log('Template.VQcreateProjectModal.rendered')
	const rr = await dataShapes.getOntologiesAndTags();
	const tags = rr.tags;

	if (_.size(tags) > 0) {
		tags.unshift({name:"First", display_name: "", title: ""});
    tags.push({name:"All", display_name: "All schemas", title: "All schemas"});
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
	Template.VQcreateProjectModal.schemas.set(getSchemasP('First')); // TODO te varētu būt kāds sākotnējais tags uzstādīts
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
		Template.VQcreateProjectModal.schemas.set(getSchemasP(tag));
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

function getSchemasP(tag) {
	let schemas = [];
	const allSchemas = Template.VQcreateProjectModal.allSchemas.get() || [];

	for ( const sc of allSchemas ) {
		if ( tag !== 'All' && tag !== 'First' && sc.tags.includes(tag))
			schemas.push(sc);
		else if ( tag === 'All' )
			schemas.push(sc);
    else if ( tag === 'First' && !sc.tags.includes('Extra'))
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

//----------------------------------------------------------------------------------------------

Template.VQ_diagramsToolbar_buttons.helpers({
  isVQProj: function() {
    console.log('VQ_diagramsToolbar_buttons.helpers -  isVQProj')
    const project = Projects.findOne({ _id: Session.get("activeProject") });
  	const tool = Tools.findOne({_id: project.toolId});
    if ( (tool.toolGroup && tool.toolGroup === VQToolGroup) || tool.toolGroup === undefined)
      return true;
    else
      return false;
	},
  shemaName: function() {
    const project = Projects.findOne({ _id: Session.get("activeProject") });
    if (project.schema !== undefined) {
      return ` Schema - ${project.schema}`;
    }
    else {
      return '';
    }
  },
  hasSchema: function () {
    console.log('Template.diagramsToolbar.helpers - hasSchema')
    const project = Projects.findOne({ _id: Session.get("activeProject") });

    if (!project) {
      return false;
    }

    if (project.schema !== undefined) {
      return true;
      // TODO Šeit vispār vajadzētu skatīties, vai pretī ir pareizais DSS serveris un vai ir pareizas rīks (nav tikai VQ)
    }
    return false;
  },
  isPublic: function () {
    return dataShapes.schema.isPublic;
  },

});

Template.VQ_diagramsToolbar_buttons.events({
	'click #VQsettings': function(e) {
    //Dialog.destroyTooltip(e); // TODO Nez kas šis bija un ko darīja
    $("#VQontology-settings-form").modal("show");
	},
});

Template.VQontologySettings.schemas = new ReactiveVar([{ name: "" }]);
Template.VQontologySettings.allSchemas = new ReactiveVar();
Template.VQontologySettings.schemaTags = new ReactiveVar([
  { name: "All", display_name: "All schemas", title:  "All schemas" },
]);
Template.VQontologySettings.uri = new ReactiveVar("");
Template.VQontologySettings.endpoint = new ReactiveVar("");
Template.VQontologySettings.queryEngineType = new ReactiveVar("");
Template.VQontologySettings.directClassMembershipRole = new ReactiveVar("");
Template.VQontologySettings.indirectClassMembershipRole = new ReactiveVar("");
Template.VQontologySettings.graphs = new ReactiveVar([]);
Template.VQontologySettings.selectedSchema = new ReactiveVar("");

Template.VQontologySettings.onCreated(function () {
  Session.set("msg", undefined);
});

Template.VQontologySettings.onDestroyed(function () {
  Session.set("msg", undefined);
});

Template.VQontologySettings.events({
  "click #ok-ontology-settings": async function () {
    let schema_name = "";
    const selectSchema = document.getElementById("schema-selection");
    const selection = selectSchema.value;

    const selectedSchema = Template.VQontologySettings.schemas.get().filter(function(f){ return f.display_name_full === selection;})
    if ( selectedSchema.length > 0 ) {
      schema_name = selectedSchema[0].display_name;
      console.log('Kaaadas vērtības', $("#dss-schema").val(), schema_name)
    }

    var list = {
      projectId: Session.get("activeProject"),
      versionId: Session.get("versionId"),
      diagramId: Session.get("activeDiagram"),
      uri: $("#ontology-uri").val(),
      endpoint: $("#ontology-endpoint").val(),
      schema:schema_name, // vecā vieta $("#dss-schema").val(),
      useStringLiteralConversion: $("#use-string-literal-conversion").val(),
      queryEngineType: $("#query-engine-type").val(),
      useDefaultGroupingSeparator: $("#use-default-grouping-separator").is(
        ":checked",
      ),
      defaultGroupingSeparator: $("#default-grouping-separator").val(),
      directClassMembershipRole: $("#direct-class-membership-role").val(),
      indirectClassMembershipRole: $("#indirect-class-membership-role").val(),
      showCardinalities: $("#show-cardinalities").is(":checked"),
      decorateInstancePositionVariable: $(
        "#decorate-instance-position-variable",
      ).is(":checked"),
      decorateInstancePositionConstants: $(
        "#decorate-instance-position-constants",
      ).is(":checked"),
      simpleConditionImplementation: $("#simple-condition-implementation").is(
        ":checked",
      ),
      // autoHideDefaultPropertyName: $("#auto-hide-default-property-name").is(":checked"),
      showPrefixesForAllNames: $("#show-prefixes-for-all-names").is(":checked"),
      showPrefixesForAllNonLocalNames: $(
        "#show-prefixes-for-all-non-local-names",
      ).is(":checked"),
      completeRDFBoxesInDatetimeFunctions: $(
        "#complete-RDF-boxes-in-datetime-functions",
      ).is(":checked"),
      showGraphServiceCompartments: $("#show-graph-service-compartments").is(
        ":checked",
      ),
      enableWikibaseLabelServices: $("#enable-wikibase-label-services").is(
        ":checked",
      ),
      allowTopDownNamesInBINDs: $("#allow-top-down-names-in-BINDs").is(
        ":checked",
      ),
      schemaDiagramDataLanguage: $("#schema-diagram-data-language").val(),
      keepVariableNames: $("#keep-variable-names").is(":checked"),
      endpointUsername: $("#endpoint-username").val(),
      endpointPassword: $("#endpoint-password").val(),
      // graphsInstructions: JSON.stringify(myRows)
    };

    Utilities.callMeteorMethod("updateProjectOntology", list);
    list._id = Session.get("activeProject");
    dataShapes.clearSchema();
    //await dataShapes.changeActiveProjectFull(list);
    await Template.schemaTree.rendered(); // Šis ir vajadzīgs publiskajām diagrammām
  },

  "click #use-default-grouping-separator": function () {
    $("#default-grouping-separator").prop(
      "disabled",
      !$("#use-default-grouping-separator").is(":checked"),
    );
  },
  "click #auto-hide-default-property-name": function () {},

  "click #cancel-ontology-settings": function () {
    var proj = Projects.findOne({ _id: Session.get("activeProject") });
    if (proj) {
      $("#ontology-uri").val(proj.uri);
      $("#ontology-endpoint").val(proj.endpoint);
      $("#dss-schema").val(proj.schema);
      $("#use-string-literal-conversion").val(proj.useStringLiteralConversion);
      $("#query-engine-type").val(proj.queryEngineType);
      $("#use-default-grouping-separator").prop(
        "checked",
        proj.useDefaultGroupingSeparator,
      );
      $("#default-grouping-separator").prop(
        "disabled",
        proj.useDefaultGroupingSeparator === "false",
      );
      $("#default-grouping-separator").val(proj.defaultGroupingSeparator);
      $("#direct-class-membership-role").val(proj.directClassMembershipRole);
      $("#indirect-class-membership-role").val(
        proj.indirectClassMembershipRole,
      );
      $("#show-cardinalities").prop(
        "checked",
        proj.showCardinalities === "true",
      );
      $("#decorate-instance-position-variable").prop(
        "checked",
        proj.decorateInstancePositionVariable === "true",
      );
      $("#decorate-instance-position-constants").prop(
        "checked",
        proj.decorateInstancePositionConstants === "true",
      );
      $("#simple-condition-implementation").prop(
        "checked",
        proj.simpleConditionImplementation === "true",
      );
      // $("#auto-hide-default-property-name").prop("checked", proj.autoHideDefaultPropertyName=="true");
      $("#show-prefixes-for-all-names").prop(
        "checked",
        proj.showPrefixesForAllNames === "true",
      );
      $("#show-prefixes-for-all-non-local-names").prop(
        "checked",
        proj.showPrefixesForAllNonLocalNames === "true",
      );
      $("#complete-RDF-boxes-in-datetime-functions").prop(
        "checked",
        proj.completeRDFBoxesInDatetimeFunctions === "true",
      );
      $("#show-graph-service-compartments").prop(
        "checked",
        proj.showGraphServiceCompartments === "true",
      );
      $("#enable-wikibase-label-services").prop(
        "checked",
        proj.enableWikibaseLabelServices === "true",
      );
      $("#allow-top-down-names-in-BINDs").prop(
        "checked",
        proj.allowTopDownNamesInBINDs === "true",
      );
      $("#schema-diagram-data-language").prop(
        "checked",
        proj.schemaDiagramDataLanguage,
      );
      $("#keep-variable-names").prop(
        "checked",
        proj.keepVariableNames === "true",
      );
      $("#endpoint-username").val(proj.endpointUsername);
      $("#endpoint-password").val(proj.endpointPassword);
    }

    Template.VQontologySettings.uri.set(proj.uri);
    Template.VQontologySettings.endpoint.set(proj.endpoint);
    Template.VQontologySettings.queryEngineType.set(proj.queryEngineType);
    Template.VQontologySettings.directClassMembershipRole.set(
      proj.directClassMembershipRole,
    );
    Template.VQontologySettings.indirectClassMembershipRole.set(
      proj.indirectClassMembershipRole,
    );

  },

  "click #test-endpoint": async function () {
    const list = {
      projectId: Session.get("activeProject"),
      versionId: Session.get("versionId"),
      uri: $("#ontology-uri").val(),
      endpoint: $("#ontology-endpoint").val(),
      endpointUsername: $("#endpoint-username").val(),
      endpointPassword: $("#endpoint-password").val(),
      // httpRequestProfileName: "P1", // use the specified http request profile for executing SPARQL queries
    };

    const res = await Utilities.callMeteorMethodAsync(
      "testProjectEndpoint",
      list,
    );

    var class_name = "danger";
    var text = "Connection is not ok";

    if (res.status === 200) {
      class_name = "success";
      text = "Connection is ok";
    } else if (res.status === 401) {
      text = "Connection failed; probably wrong credentials";
    }

    var msg = { text: text, class: class_name };

    Session.set("msg", msg);

    setTimeout(function () {
      Session.set("msg", undefined);
    }, 4000);
  },
  // 'click #dss-schema' : function(e) {
  "change #dss-schema": function () {
    var schema = $("#dss-schema").val();
    var schema_info = Template.VQontologySettings.schemas.get().filter(function (o) {
        return o.display_name === schema;
      });
    if (schema_info.length > 0 && schema_info[0].display_name !== "") {
      Template.VQontologySettings.endpoint.set(schema_info[0].sparql_url);
      Template.VQontologySettings.uri.set(schema_info[0].named_graph);
      Template.VQontologySettings.queryEngineType.set(
        schema_info[0].endpoint_type,
      );
      Template.VQontologySettings.directClassMembershipRole.set(
        schema_info[0].direct_class_role,
      );
      Template.VQontologySettings.indirectClassMembershipRole.set(
        schema_info[0].indirect_class_role,
      );
    }
    if (schema_info.length > 0 && schema_info[0].display_name === "") {
      Template.VQontologySettings.endpoint.set("");
      Template.VQontologySettings.uri.set("");
      Template.VQontologySettings.queryEngineType.set("");
      Template.VQontologySettings.directClassMembershipRole.set("");
      Template.VQontologySettings.indirectClassMembershipRole.set("");
    }
  },
  "change #schema-selection": function () {
    const selectSchema = document.getElementById("schema-selection");
    const selection = selectSchema.value;

    const schema_info = Template.VQontologySettings.schemas.get().filter(function(f){ return f.display_name_full === selection;})

    if (schema_info.length > 0 && schema_info[0].display_name !== "") {
      Template.VQontologySettings.endpoint.set(schema_info[0].sparql_url);
      Template.VQontologySettings.uri.set(schema_info[0].named_graph);
      Template.VQontologySettings.queryEngineType.set(
        schema_info[0].endpoint_type,
      );
      Template.VQontologySettings.directClassMembershipRole.set(
        schema_info[0].direct_class_role,
      );
      Template.VQontologySettings.indirectClassMembershipRole.set(
        schema_info[0].indirect_class_role,
      );
    }
    if (schema_info.length > 0 && schema_info[0].display_name === "") {
      Template.VQontologySettings.endpoint.set("");
      Template.VQontologySettings.uri.set("");
      Template.VQontologySettings.queryEngineType.set("");
      Template.VQontologySettings.directClassMembershipRole.set("");
      Template.VQontologySettings.indirectClassMembershipRole.set("");
    }

  },
  "change #schema-tags": function () {
    var tag = $("#schema-tags").val();
    Template.VQontologySettings.schemas.set(getSchemasO(tag));
    //var tag = $("#schema-tags").find(":selected").attr("id");
  },
  //adds context menu item
  "click #add-graph-menu-item": function () {
    var graphs = Template.VQontologySettings.graphs.get();
    graphs.push({ index: graphs.length, Instruction: "", Graph: "" });
    Template.VQontologySettings.graphs.set(graphs);
  },

  //removes context menu item
  "click .remove-graph-menu-item": function (e) {
    var index = e.target.parentElement.parentElement.parentElement.rowIndex;
    if (typeof index === "undefined")
      index =
        e.target.parentElement.parentElement.parentElement.parentElement
          .rowIndex;
    index--;

    var myRows = [];
    var $headers = $("th");
    var $rows = $("tbody tr").each(function (index) {
      let $cells = $(this).find("td");
      myRows[index] = {};
      $cells.each(function (cellIndex) {
        if (
          $($headers[cellIndex]).html() === "Instruction" ||
          $($headers[cellIndex]).html() === "Graph"
        ) {
          myRows[index][$($headers[cellIndex]).html()] = $(this)
            .find("div")
            .text();
        }
      });
      myRows[index].index = index;
    });

    var graphsT = [];
    var i = 0;
    for (var graph in myRows) {
      if (myRows[graph].index !== index) {
        graphsT.push({
          index: i,
          Instruction: myRows[graph].Instruction,
          Graph: myRows[graph].Graph,
        });
        i++;
      }
    }

    Template.VQontologySettings.graphs.set(graphsT);
  },
});

function getSchemasO(tag) {
	let schemas = [];
	const allSchemas = Template.VQontologySettings.allSchemas.get() || [];

	for ( const sc of allSchemas ) {
		if ( tag !== 'All' && sc.tags.includes(tag))
			schemas.push(sc);
		else if ( tag === 'All' )
			schemas.push(sc);
	}

	schemas.unshift({display_name: "", display_name_full: ""});
	return schemas;
}

Template.VQontologySettings.rendered = async function () {
  const rr = await dataShapes.getOntologiesAndTags();
  const tags = rr.tags || [];
  tags.unshift({ name: "All", display_name: "All schemas", title:  "All schemas" });
  Template.VQontologySettings.schemaTags.set(tags);

  let schemas = rr.schemas;
  if (schemas && schemas.length > 0) {
    for ( const sc of schemas ) {
      sc.display_name_full = `${sc.display_name} (${sc.sparql_url} Class count:${sc.class_count})`;
    }
		Template.VQontologySettings.allSchemas.set(schemas);
	}

  schemas = getSchemasO("All");

  // var schemas = await dataShapes.getOntologies();
  var proj = Projects.findOne({ _id: Session.get("activeProject") });

  if (proj) {
    Template.VQontologySettings.uri.set(proj.uri);
    Template.VQontologySettings.endpoint.set(proj.endpoint);
    Template.VQontologySettings.queryEngineType.set(proj.queryEngineType);
    Template.VQontologySettings.directClassMembershipRole.set(
      proj.directClassMembershipRole,
    );
    Template.VQontologySettings.indirectClassMembershipRole.set(
      proj.indirectClassMembershipRole,
    );

    if (proj.schema !== undefined && proj.schema !== "") {
      var selected = schemas.filter(function (o) {
        return o.display_name === proj.schema;
      });
      if (selected.length > 0) {
        selected[0].selected = "selected";
        Template.VQontologySettings.selectedSchema.set(selected[0].display_name_full);
      }
    }
  }

  Template.VQontologySettings.schemas.set(schemas);
};

Template.VQontologySettings.helpers({
  msg: function () {
    return Session.get("msg");
  },

  project: function () {
    return Projects.findOne({ _id: Session.get("activeProject") });
  },

  uri: function () {
    return Template.VQontologySettings.uri.get();
  },

  endpoint: function () {
    return Template.VQontologySettings.endpoint.get();
  },

  schemas: function () {
    return Template.VQontologySettings.schemas.get();
  },

  schema_tags: function () {
    return Template.VQontologySettings.schemaTags.get();
  },

  selected_schema: function () {
    return Template.VQontologySettings.selectedSchema.get();
  },

  useStringLiteralConversionList: function () {
    var proj = Projects.findOne({ _id: Session.get("activeProject") });

    //console.log("useStringLiteralConversionList ", proj)

    var act = "SIMPLE";
    if (proj) {
      act = proj.useStringLiteralConversion;
    }
    var list = [{ name: "SIMPLE" }, { name: "TYPED" }, { name: "OFF" }];
    var selected = list.filter(function (o) {
      return o.name === act;
    });
    if (selected.length > 0) {
      selected[0].selected = "selected";
    }

    return list;
  },
  queryEngineTypeList: function () {
    //var proj = Projects.findOne({_id: Session.get("activeProject")});
    var act = Template.VQontologySettings.queryEngineType.get();
    //if (proj) {
    //	act = proj.queryEngineType;
    //}
    var list = [];
    if (act === "virtuoso" || act === "VIRTUOSO") {
      list.push({ name: "VIRTUOSO", selected: "selected" });
      list.push({ name: "GENERAL" });
    } else {
      list.push({ name: "VIRTUOSO" });
      list.push({ name: "GENERAL", selected: "selected" });
    }
    return list;
  },
  directClassMembershipRole: function () {
    return Template.VQontologySettings.directClassMembershipRole.get();
  },
  indirectClassMembershipRole: function () {
    return Template.VQontologySettings.indirectClassMembershipRole.get();
  },
  graphs: function () {
    return Template.VQontologySettings.graphs.get();
    // return [{instruction:"dbpedia", graph:"http://dbpedia.org"}, {instruction:"wikidata", graph:"http://wikidata.org"}]
  },
});

