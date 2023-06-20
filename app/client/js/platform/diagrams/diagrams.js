import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'
import { UserVersionSettings, Projects, ProjectsGroups, Tools, DiagramTypes, Diagrams, FoundDiagrams } from '/libs/platform/collections'


// Start of diagramsTemplate template

//calculates the view to render
Template.diagramsTemplate.helpers({

	isDefaultView: function() {
		var user_diagram = UserVersionSettings.findOne({versionId: Session.get("versionId")});;
		if (user_diagram && user_diagram["view"] == "Tree")
			return false;
		else {
			$(".popover").has(".tree-diagram-image").remove();
			return true;
		}
	},

	//sets user mode
	editable: function() {
		return Utilities.isAdmin();
	},

	// adds/removes select by group button
	isAdmin: function() {
		return Utilities.isAdmin();
	},

});

Template.diagramsTemplate.events({

//searches on every key stroke for diagram title or compartment value
	'keyup #searchDiagrams' : function(e, templ) {

		//searched text
		var text = $("#searchDiagrams").val();
		var filter = {text: text,
						projectId: Session.get("activeProject"),
						versionId: Session.get("versionId")};

	    Session.set("diagrams", filter);
	},

});


// Start of diagramsRibbon template

Template.diagramsRibbon.events({

//shows dialog window to enter diagram name
	'click #add': function(e, templ) {
		Dialog.destroyTooltip(e);
		$('#add-diagram').modal("show");
	},

	'click #download-project': function(e) {
		Dialog.destroyTooltip(e);

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

		Utilities.callMeteorMethod("getProjectJson", list, function(resp) {

			if (resp.diagrams) {
			 //    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resp, 0, 4));
				// var link = $('<a href="data:' + data + '" download="data.json">download JSON</a>');
				// link.appendTo('#download-hack')
				// link[0].click();


				// let csvContent = "";
				// res.forEach(function(rowArray) {
				// 	let row = rowArray.join(",");
				// 	csvContent += row + "\r\n";
				// });

				var link = document.createElement("a");
				link.setAttribute("download", "data.json");
				link.href = URL.createObjectURL(new Blob([JSON.stringify(resp, 0, 4)], {type: "application/json;charset=utf-8;"}));
				document.body.appendChild(link);
				link.click();
			}

		});
	},

	'click #export': function(e) {
		Dialog.destroyTooltip(e);
		$('#export-ontology-form').modal("show");
	},

	'click #upload-project': function(e, templ) {
		// e.preventDefault();
		Dialog.destroyTooltip(e);
		$('#upload-project-form').modal("show");
	},

	'click #import': function(e, templ) {
		Dialog.destroyTooltip(e);
		$('#import-ontology-form').modal("show");
	},

	'click #settings': function(e, templ) {
		Dialog.destroyTooltip(e);
		$('#ontology-settings-form').modal("show");
	},

	'click #migrate' : function(e, templ) {
		Dialog.destroyTooltip(e);
		$("#migrate-form").modal("show");
	},

// //shows button's tooltip on mouse over
//     'mouseenter .btn-ribbon' : function(e, templ) {
//     	Dialog.destroyTooltip(e);
//     	Dialog.showTooltip(e);
//     },

// //removes tooltip on mouse leave
//     'mouseleave .btn-ribbon' : function(e, templ) {
//     	Dialog.destroyTooltip(e);
//     },

});

Template.diagramsRibbon.helpers({

	versionId: function() {
		return Session.get("versionId");
	},

	//if the version is editable and there is atleast one diagram type
	is_toolbar_enabled: function() {
		if (is_toolbar_enabled()) {
			Dialog.initTooltip();
			return true;
		}
	},

	project_id: function() {
		return Session.get("activeProject");
	},

	tool_name: function() {
		var project_id = Session.get("activeProject");
		var project = Projects.findOne({_id: project_id,});

		console.log("prject ", project)


		if (!project) {
			// console.error("No project ", project_id);
			return;
		}

		var tool = Tools.findOne({_id: project.toolId,});
		if (!tool) {
			console.error("No tool", project.toolId);
			return;
		}

		return tool.name;
	}


});

// End of diagramsRibbon template

//calculates view's drop-down element visibility
Template.diagramsViewButton.helpers({
	diagramViews: function() {

		var style = {};
		var user_version_settings = UserVersionSettings.findOne({versionId: Session.get("versionId")});;
		if (user_version_settings && user_version_settings["view"] == "Tree") {
			style["defaultStyle"] = "visibility:hidden;";
			style["treeStyle"] = "";
		}
		else {
			style["defaultStyle"] = "";
			style["treeStyle"] = "visibility:hidden;";
		}

		return style;
	},
});

Template.diagramsViewButton.events({

	'click .view-switch' : function(e) {
		e.preventDefault();
		var view = $(e.target).attr("view");

		//switching the views
		var list = {versionId: Session.get("versionId"),
					update: {$set: {view: view}},
				};

		Utilities.callMeteorMethod("updateUserVersionSettings", list);
	},
});


Template.diagramsSortButton.helpers({

	items: function() {

		//making all the items
		var items = [{name: "A-Z", type: "alphabetTopDown"},
					{name: "Date", type: "dateTopDown"},
					{name: "Popular", type: "popularTopDown"}];

		//setting the active item
		var sort_by_prop = get_panel_type() + "SortBy";
		var sort_by = get_user_settings_property(sort_by_prop);

		if (sort_by) {
			_.each(items, function(item) {
				if (item["type"] == sort_by) {
					item["active"] = true;
				}
			});
		}

		return items;
	},

});

Template.diagramsSortButton.events({

	"click .sort-by-item": function(e) {
		e.preventDefault();
		var item_type = $(e.target).closest(".sort-by-item").attr("type");

		var list = {versionId: Session.get("versionId"),
					update: {$set: set_update_doc_dgr_settings("SortBy", item_type)},
				};

		Utilities.callMeteorMethod("updateUserVersionSettings", list);

		return;
	},

});

Template.diagramsGroupsButton.helpers({

	items: function() {

		//selecting the active group
		var prefix = get_panel_type();
		var group_id = get_user_settings_property(prefix + "SelectedGroup");

		//adding default group
		var item = {name: "Admin/Reader", _id: "Admin", defaultRole: true};
		if (group_id == "Admin") {
			item["active"] = true;
		}

		//array containing project groups
		var items = [item];

		//selecting custom groups
		ProjectsGroups.find().forEach(function(proj_group) {

			if (proj_group["_id"] == group_id) {
				proj_group["active"] = true;
			}

			items.push(proj_group);
		});

		return items;
	},

});

Template.diagramsGroupsButton.events({

	//setting the chosen selection
	"click .select-group-item": function(e) {
		e.preventDefault();
		var group_id = $(e.target).closest(".select-group-item").attr("value");

		var list = {versionId: Session.get("versionId"),
					update: {$set: set_update_doc_dgr_settings("SelectedGroup", group_id)},
				};

		Utilities.callMeteorMethod("updateUserVersionSettings", list);
	},

});


//stores all project diagrams
Template.defaultDiagramsView.helpers({

	diagrams: function() {

		var user_version_settings = UserVersionSettings.findOne({versionId: Session.get("versionId")});
		if (user_version_settings && user_version_settings["view"] == "Default") {
			var query = build_diagrams_query();
			if (!query) {
				return;
			}

			var proj_id = Session.get("activeProject");
			var version_id = Session.get("versionId");
			var is_edit_mode = is_toolbar_enabled();

			var sort_by_str = user_version_settings["diagramsSortBy"];
			var sort_by = get_sort_by_object(sort_by_str);

			return Diagrams.find(query, {$sort: sort_by}).map(function(diagram) {
				diagram["projectId"] = proj_id;
				diagram["versionId"] = version_id;

				diagram["date"] = joined_date(diagram["createdAt"]);

				if (is_edit_mode) {
					diagram["isEditMode"] = true;
				}

				return diagram;
			});
		}
	},
});

Template.defaultDiagramsView.events({

	"mouseover .diagram": function(e) {

		var target = $(e.target);

		var container = target.closest(".diagram");
		var drop_down = container.find(".diagram-dropdown-container");

		var width = container.width();

		drop_down.removeClass("hidden")
		 			.css("left", width);
	},

	"mouseleave .diagram": function(e) {
		var drop_down = $(e.target).closest(".diagram").find(".diagram-dropdown-container");
		drop_down.addClass("hidden");
	},

	"click .rename-diagram": function(e) {
		e.preventDefault();
		e.stopPropagation();

		//adding file value to the field
		var diagram_container = $(e.target).closest(".diagram");
		var diagram_name = diagram_container.find(".diagram-name").text();

		$("#diagram-name-field").val(diagram_name);

		//adding file id to the form
		var form = $("#rename-diagram-form");
		form.attr("diagramId", diagram_container.attr("diagramId"));

		//showing form
		form.modal("show");
	},

	"click .remove-diagram": function(e) {
		e.preventDefault();
		e.stopPropagation();

		var diagram_container = $(e.target).closest(".diagram");

		var diagram_id = diagram_container.attr("diagramId");
		if (!diagram_id) {
			return;
		}

		Interpreter.execute("delete_diagram", [diagram_id]);
	},

	"click .duplicate-diagram": function(e) {

		e.preventDefault();
		e.stopPropagation();

		var diagram_container = $(e.target).closest(".diagram");

		var diagram_id = diagram_container.attr("diagramId");
		if (!diagram_id) {
			return;
		}

		var list = {diagramId: diagram_id};

		list["projectId"] = Session.get("activeProject");
		list["versionId"] =	Session.get("versionId");

		Utilities.callMeteorMethod("duplicateDiagram", list);

		var drop_down = $(e.target).closest(".diagram").find(".diagram-dropdown-container");

		drop_down.addClass("hidden")
					.removeClass("open");
	},

});


Template.treeDiagramsView.helpers({

	diagrams: function() {

		var proj_id = Session.get("activeProject");
		var version_id = Session.get("versionId");
		var is_edit_mode = is_toolbar_enabled();

		var query = build_diagrams_query() || {};

		var parent_query = {"parentDiagrams.0": {$exists: false}};

		var sort_by;

		apply_selected_group_to_query(parent_query);

		var user_version_settings = UserVersionSettings.findOne({versionId: Session.get("versionId")});
		if (user_version_settings && user_version_settings["view"] == "Tree") {
			var sort_by_str = user_version_settings["diagramsSortBy"];
			sort_by = get_sort_by_object(sort_by_str);
		}

		sort_by = sort_by || {name: 1};

		//selecting diagrams that have no parents
		return Diagrams.find(parent_query, {$sort: sort_by}).map(
			function(diagram) {
				return build_diagram_tree(diagram, proj_id, version_id, is_edit_mode, query, sort_by);
		});
	},
});

Template.treeDiagramsView.events({

	'click .treeNodeButton' : function(e) {

		var src = $(e.target);
		var diagram_id = get_diagram_id_from_button(src);
		var update = {};

		if (src.hasClass("expand")) {
			update["$pull"] = {collapsedDiagrams: diagram_id};
		}

		else if (src.hasClass("collapse")) {
			update["$addToSet"] = {collapsedDiagrams: diagram_id};
		}

		var list = {versionId: Session.get("versionId"), update: update};
		Utilities.callMeteorMethod("updateUserVersionSettings", list);
	},

	//show diagram image on a popover
	'mouseover .diagram-title' : function(e) {

		//removes the previous popover
		$(".popover").remove();

		var diagram_container = $(e.target).closest(".diagram");

		var diagram_id = diagram_container.attr("id");
		var diagram = Diagrams.findOne({_id: diagram_id});
		if (diagram) {
			var img_src = diagram["imageUrl"];
			var img = '<img class="tree-diagram-image" src="' + img_src + '">';

			var diagram_obj = diagram_container.find('[diagramId="' + diagram_id + '"]');
			diagram_obj.popover({content: img, html: true});
			diagram_obj.popover("show");
		}
	},

	//destroys the popover on mouse leave
	'mouseleave .diagram' : function(e) {
		// $(".popover").each(function(i, popover) {
		// 	//$(popover).popover("destroy");
		// 	$(popover).remove();
		// });

		$(".popover").remove();
	},

});

Template.treeDiagramsView.onDestroyed(function() {
	$(".popover").remove();
});


Template.diagramsSearchBar.helpers({
	search_phrase: function() {
		var list = Session.get("diagrams");
		if (list) {
			return list["text"];
		}
	},
});

// Start of addDiagram template

Template.addDiagram.events({

	'click #create-diagram' : function(e, templ) {

		$('#add-diagram').attr("OKPressed", true);

		//hidding the form
		$('#add-diagram').modal("hide");
	},

	//if ok was clicked, then starting a new chat
	'hidden.bs.modal #add-diagram' : function(e) {

		var src = $('#add-diagram');
		if (src.attr("OKPressed")) {

			src.removeAttr("OKPressed");

			var diagram_name = $("#diagram-name").val();
			var diagram_type_id = $("#diagramType").find(":selected").attr("id");

			Interpreter.execute("createDiagram", [diagram_name, diagram_type_id]);

		}
	},

});

Template.importOntology.helpers({

	schemas: function() {
		var result = null;

		var project = Projects.findOne({_id: Session.get("activeProject")});

		console.log("project ", project)

		if (project) {
			var tool_id = project.toolId;

		    Meteor.subscribe("Services", {});

			if ( tool_id && tool_id != 'undefined')
			{
				var services = Services.findOne({toolId: tool_id });

				if (services && services.schemas)
				{
					result = [];
					_.each(services.schemas, function (s){
						result.push({caption: "Import " + s.caption, name: s.name, link: s.link});
					});
				}

			}
		}

		console.log("result ", result)

		return result;
	},

});

Template.importOntology.events({

	'click #ok-import-ontology' : function(e, templ) {

		//hidding the form
		$('#import-ontology-form').modal("hide");

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

		var url_value = $("#import-url").val();
		var url_value_from_list = $('input[name=stack-radio]:checked').closest(".schema").attr("link");

		if (url_value) {
			VQ_Schema_copy = null;
			list.url = url_value;
			Utilities.callMeteorMethod("loadMOntologyByUrl", list);
		}
		else if (url_value_from_list) {
			VQ_Schema_copy = null;
			list.url = url_value_from_list;
			Utilities.callMeteorMethod("loadMOntologyByUrl", list);
		}
		else {
			var fileList = $("#fileList")[0].files;
		    _.each(fileList, function(file) {

		        var reader = new FileReader();

		        reader.onload = function(event) {
					var data = JSON.parse(reader.result)

					if (data) {
						if ( data.Classes ) {
							_.each(data.Classes, function(el) {
								if (el.localName)
									el.localName = decodeURIComponent(el.localName);
								if (el.fullName)
									el.fullName = decodeURIComponent(el.fullName);
								var superclasses = [];
								_.each(el.SuperClasses, function (sc){
									superclasses.push(decodeURIComponent(sc));
								});
								el.SuperClasses = superclasses;
							});
							_.each(data.Attributes, function(el) {
								if (el.localName)
									el.localName = decodeURIComponent(el.localName);
								if (el.fullName)
									el.fullName = decodeURIComponent(el.fullName);
								var sourceclasses = [];
								_.each(el.SourceClasses, function (sc){
									sourceclasses.push(decodeURIComponent(sc));
								});
								el.SourceClasses = sourceclasses;
							});
							_.each(data.Associations, function(el) {
								if (el.localName)
									el.localName = decodeURIComponent(el.localName);
								if (el.fullName)
									el.fullName = decodeURIComponent(el.fullName);
								var classpairs = [];
								_.each(el.ClassPairs, function (cp){
									var cp_new = {};
									if ( cp.SourceClass )
										cp_new.SourceClass = decodeURIComponent(cp.SourceClass)
									if ( cp.TargetClass )
										cp_new.TargetClass = decodeURIComponent(cp.TargetClass)
									cp_new.instanceCount = cp.instanceCount
									cp_new.minCardinality = cp.minCardinality
									cp_new.maxCardinality = cp.maxCardinality
									cp_new.inverseRole = cp.inverseRole
									cp_new.tripleCount = cp.tripleCount
  					
									classpairs.push(cp_new);
								});
								el.ClassPairs = classpairs;
							});
							if (data.ExtensionMode)
							{
								if (data.Parameters)
									data.Parameters.push({name:"ExtensionMode",value:data.ExtensionMode})
								else
									data.Parameters = [{name:"ExtensionMode",value:data.ExtensionMode}];
							}
							VQ_Schema_copy = null;
							list.data = data;

							Utilities.callMeteorMethod("loadMOntology", list);
						}
						else {
							VQ_Schema_copy = null;
							list.data = { Data: data };
							Utilities.callMeteorMethod("loadTriplesMaps", list );
						}

					}
					//else  Te būs kļūdas ziņojums lietotājam};
		        }

		        reader.onerror = function(error) {
		            console.error("Error: ", error);
		        }
		        reader.readAsText(file);
		    });
		}
	},

});

Template.uploadProject.loading = new ReactiveVar(false);

Template.uploadProject.helpers({
	loading: function() {
		return Template.uploadProject.loading.get();
	},
	projects: function() {
		var result = null;
		
		var project = Projects.findOne({_id: Session.get("activeProject")});
		if (project) {
			var tool_id = project.toolId;

		    Meteor.subscribe("Services", {});

			if (tool_id) {
				var services = Services.findOne({toolId: tool_id });

				if (services && services.projects)
				{
					result = [];
					_.each(services.projects, function (p){
						result.push({caption: "Upload " + p.caption, name: p.name, link: p.link});
					});
				}
			}
		}

		return result;
	},

});


Template.uploadProject.events({

	'click #ok-upload-project' : function(e, templ) {

		//hidding the form
		//$('#upload-project-form').modal("hide");

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
		};

		var url_value = $("#import-projecturl").val();
		var url_value_from_list = $('input[name=stack-radio]:checked').closest(".schema").attr("link");;

		if (url_value) {
			VQ_Schema_copy = null;
			list.url = url_value;
			Template.uploadProject.loading.set(true);
			Utilities.callMeteorMethod("uploadProjectDataByUrl", list, function() {
				$('#upload-project-form').modal("hide");
				Template.uploadProject.loading.set(false);
			});
		}
		else if (url_value_from_list) {
			VQ_Schema_copy = null;
			list.url = url_value_from_list;
			Template.uploadProject.loading.set(true);
			Utilities.callMeteorMethod("uploadProjectDataByUrl", list, function() {
				$('#upload-project-form').modal("hide");
				Template.uploadProject.loading.set(false);
			});
		}
		else {
			var fileList = $("#projectfileList")[0].files;
			_.each(fileList, function(file) {

				var reader = new FileReader();

				reader.onload = function(event) {
					var diagrams = JSON.parse(reader.result)
					list.data = diagrams;
					VQ_Schema_copy = null;
					Template.uploadProject.loading.set(true);
					Utilities.callMeteorMethod("uploadProjectData", list,function() {
						$('#upload-project-form').modal("hide");
						Template.uploadProject.loading.set(false);
					});
				}

				reader.onerror = function(error) {
					console.error("Error: ", error);
				}
				reader.readAsText(file);
			});
		}

	},

});


Template.ontologySettings.schemas = new ReactiveVar([{name: ""}]);
Template.ontologySettings.uri = new ReactiveVar("");
Template.ontologySettings.endpoint = new ReactiveVar("");
Template.ontologySettings.queryEngineType = new ReactiveVar("");
Template.ontologySettings.directClassMembershipRole = new ReactiveVar("");
Template.ontologySettings.indirectClassMembershipRole = new ReactiveVar("");
Template.ontologySettings.graphs = new ReactiveVar([]);

Template.ontologySettings.helpers({

	msg: function() {
		return Session.get("msg");
	},

});

Template.ontologySettings.onCreated(function() {
	Session.set("msg", undefined);
});


Template.ontologySettings.onDestroyed(function() {
	Session.set("msg", undefined);
	
});


Template.ontologySettings.events({

	'click #ok-ontology-settings' : async function(e, templ) {
		
		var myRows = [];
		var $headers = $("th");
		var $rows = $("tbody tr").each(function(index) {
		  $cells = $(this).find("td");
		  myRows[index] = {};
		  $cells.each(function(cellIndex) {
			  if($($headers[cellIndex]).html() == "Graph/Service shorthand" || $($headers[cellIndex]).html() == "Expansion (e.g., URI)"){
				  myRows[index][$($headers[cellIndex]).html()] = $(this).find("div").text();
			  }
		  });
		  myRows[index]["index"] = index;
		});

		
		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					diagramId: Session.get("activeDiagram"),
					uri: $("#ontology-uri").val(),
					endpoint: $("#ontology-endpoint").val(),
					schema: $("#dss-schema").val(),
		          	useStringLiteralConversion: $("#use-string-literal-conversion").val(),
		          	queryEngineType: $("#query-engine-type").val(),
					useDefaultGroupingSeparator: $("#use-default-grouping-separator").is(":checked"),
					defaultGroupingSeparator: $("#default-grouping-separator").val(),
					directClassMembershipRole: $("#direct-class-membership-role").val(),
					indirectClassMembershipRole: $("#indirect-class-membership-role").val(),
					showCardinalities: $("#show-cardinalities").is(":checked"),
					decorateInstancePositionVariable: $("#decorate-instance-position-variable").is(":checked"),
					decorateInstancePositionConstants: $("#decorate-instance-position-constants").is(":checked"),
					simpleConditionImplementation: $("#simple-condition-implementation").is(":checked"),
					autoHideDefaultPropertyName: $("#auto-hide-default-property-name").is(":checked"),
					showPrefixesForAllNames: $("#show-prefixes-for-all-names").is(":checked"),
					showPrefixesForAllNonLocalNames: $("#show-prefixes-for-all-non-local-names").is(":checked"),
					completeRDFBoxesInDatetimeFunctions: $("#complete-RDF-boxes-in-datetime-functions").is(":checked"),
					showGraphServiceCompartments: $("#show-graph-service-compartments").is(":checked"),
					enableWikibaseLabelServices: $("#enable-wikibase-label-services").is(":checked"),
					allowTopDownNamesInBINDs: $("#allow-top-down-names-in-BINDs").is(":checked"),
					keepVariableNames: $("#keep-variable-names").is(":checked"),
					endpointUsername: $("#endpoint-username").val(),
					endpointPassword: $("#endpoint-password").val(),
					graphsInstructions: JSON.stringify(myRows)
				};


		Utilities.callMeteorMethod("updateProjectOntology", list);
		list._id = Session.get("activeProject");
		dataShapes.clearSchema();
		await dataShapes.changeActiveProjectFull(list);
		await Template.schemaTree.rendered();
		
	},

	'click #use-default-grouping-separator' : function(e, templ) {
						$("#default-grouping-separator").prop('disabled', !$("#use-default-grouping-separator").is(":checked"))

	},
	'click #auto-hide-default-property-name' : function(e, templ) {
		// var parent_query = {"parentDiagrams.0": {$exists: false}};

		// Diagrams.find(parent_query, {$sort: 1}).map(
			// function(diagram) {
				// console.log("rrrrrrr", diagram);
				// autoHideDefaultPropertyNameForDiagrams(diagram, 1);
		// });

	},

	'click #cancel-ontology-settings' : function(e, templ) {
	 var proj = Projects.findOne({_id: Session.get("activeProject")});
	 if (proj) {
		 $("#ontology-uri").val(proj.uri);
		 $("#ontology-endpoint").val(proj.endpoint);
		 $("#dss-schema").val(proj.schema);
		 $("#use-string-literal-conversion").val(proj.useStringLiteralConversion);
		 $("#query-engine-type").val(proj.queryEngineType);
		 $("#use-default-grouping-separator").prop("checked", proj.useDefaultGroupingSeparator);
		 $("#default-grouping-separator").prop('disabled', proj.useDefaultGroupingSeparator=="false");
		 $("#default-grouping-separator").val(proj.defaultGroupingSeparator);
		 $("#direct-class-membership-role").val(proj.directClassMembershipRole);
		 $("#indirect-class-membership-role").val(proj.indirectClassMembershipRole);
		 $("#show-cardinalities").prop("checked", proj.showCardinalities=="true");
		 $("#decorate-instance-position-variable").prop("checked", proj.decorateInstancePositionVariable=="true");
		 $("#decorate-instance-position-constants").prop("checked", proj.decorateInstancePositionConstants=="true");
		 $("#simple-condition-implementation").prop("checked", proj.simpleConditionImplementation=="true");
		 $("#auto-hide-default-property-name").prop("checked", proj.autoHideDefaultPropertyName=="true");
		 $("#show-prefixes-for-all-names").prop("checked", proj.showPrefixesForAllNames=="true");
		 $("#show-prefixes-for-all-non-local-names").prop("checked", proj.showPrefixesForAllNonLocalNames=="true");
		 $("#complete-RDF-boxes-in-datetime-functions").prop("checked", proj.completeRDFBoxesInDatetimeFunctions=="true");
		 $("#show-graph-service-compartments").prop("checked", proj.showGraphServiceCompartments=="true");
		 $("#enable-wikibase-label-services").prop("checked", proj.enableWikibaseLabelServices=="true");
		 $("#allow-top-down-names-in-BINDs").prop("checked", proj.allowTopDownNamesInBINDs=="true");
		 $("#keep-variable-names").prop("checked", proj.keepVariableNames=="true");
		 $("#endpoint-username").val(proj.endpointUsername);
		 $("#endpoint-password").val(proj.endpointPassword);
	 }
	 Template.ontologySettings.uri.set(proj.uri);
	 Template.ontologySettings.endpoint.set(proj.endpoint);
	 Template.ontologySettings.queryEngineType.set(proj.queryEngineType);
	 Template.ontologySettings.directClassMembershipRole.set(proj.directClassMembershipRole);
	 Template.ontologySettings.indirectClassMembershipRole.set(proj.indirectClassMembershipRole);
	 Template.ontologySettings.graphs.set(JSON.parse(proj.graphsInstructions));

	},

	"click #test-endpoint": function(e) {

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					uri: $("#ontology-uri").val(),
					endpoint: $("#ontology-endpoint").val(),
					endpointUsername: $("#endpoint-username").val(),
					endpointPassword: $("#endpoint-password").val(),
					// httpRequestProfileName: "P1", // use the specified http request profile for executing SPARQL queries
				};

		Utilities.callMeteorMethod("testProjectEndPoint", list, function(res) {

			var class_name = "danger";
			var text = "Connection is not ok";

			if (res.status == 200) {
				class_name = "success";
				text = "Connection is ok";
			} else if (res.status === 401) {
				text = "Connection failed; probably wrong credentials";
			}

			var msg = {text: text,
						class: class_name,
					};

			Session.set("msg", msg);

			setTimeout(function() {
				Session.set("msg", undefined);
			}, 4000);

		});

	},
	'click #dss-schema' : function(e) {
		var schema = $("#dss-schema").val();
		var schema_info = Template.ontologySettings.schemas.get().filter(function(o){ return o.display_name == schema});
		if ( schema_info.length > 0 && schema_info[0].display_name != "") {
			Template.ontologySettings.endpoint.set(schema_info[0].sparql_url);
			Template.ontologySettings.uri.set(schema_info[0].named_graph);
			Template.ontologySettings.queryEngineType.set(schema_info[0].endpoint_type);
			Template.ontologySettings.directClassMembershipRole.set(schema_info[0].direct_class_role);
			Template.ontologySettings.indirectClassMembershipRole.set(schema_info[0].indirect_class_role);
		}
		if ( schema_info.length > 0 && schema_info[0].display_name == "") {
			Template.ontologySettings.endpoint.set("");
			Template.ontologySettings.uri.set("");
			Template.ontologySettings.queryEngineType.set("");
			Template.ontologySettings.directClassMembershipRole.set("");
			Template.ontologySettings.indirectClassMembershipRole.set("");
		}
	},
	
	//adds context menu item
	'click #add-graph-menu-item': function(e) {
		var graphs = Template.ontologySettings.graphs.get();
		graphs.push({index: graphs.length, Instruction: "", Graph: ""});
		Template.ontologySettings.graphs.set(graphs);
	},

	//removes context menu item
	'click .remove-graph-menu-item': function(e) {
		
		var index = e.target.parentElement.parentElement.parentElement.rowIndex;
		if(typeof index === "undefined") index = e.target.parentElement.parentElement.parentElement.parentElement.rowIndex;
		index--;
		
		var myRows = [];
		var $headers = $("th");
		var $rows = $("tbody tr").each(function(index) {
		  $cells = $(this).find("td");
		  myRows[index] = {};
		  $cells.each(function(cellIndex) {
			  if($($headers[cellIndex]).html() == "Instruction" || $($headers[cellIndex]).html() == "Graph"){
				  myRows[index][$($headers[cellIndex]).html()] = $(this).find("div").text();
			  }
		  });
		  myRows[index]["index"] = index;
		});
		
		var graphsT = [];
		var i = 0;
		for(var graph in myRows){
			if(myRows[graph]["index"] !== index) {
				graphsT.push({index:i, Instruction:myRows[graph]["Instruction"], Graph:myRows[graph]["Graph"]})
				i++;
			}
		}
		
		Template.ontologySettings.graphs.set(graphsT);
	},

});


Template.ontologySettings.rendered = async function() {
	var rr = await dataShapes.getOntologies(); 
	Template.ontologySettings.schemas.set(rr);
	var proj = Projects.findOne({_id: Session.get("activeProject")});
	if (proj) {
		Template.ontologySettings.uri.set(proj.uri);
		Template.ontologySettings.endpoint.set(proj.endpoint);
		Template.ontologySettings.queryEngineType.set(proj.queryEngineType);
		Template.ontologySettings.directClassMembershipRole.set(proj.directClassMembershipRole);
		Template.ontologySettings.indirectClassMembershipRole.set(proj.indirectClassMembershipRole);
		
		if(typeof proj.graphsInstructions !== "undefined") Template.ontologySettings.graphs.set(JSON.parse(proj.graphsInstructions));
		else Template.ontologySettings.graphs.set([]);
	}
}

Template.ontologySettings.helpers({

	project: function() {
		return Projects.findOne({_id: Session.get("activeProject")});
	},

	uri: function() {
		return Template.ontologySettings.uri.get();
		// var proj = Projects.findOne({_id: Session.get("activeProject")});
		// if (proj) {
		//	return proj.uri;
		// }
	},

	endpoint: function() {
		return Template.ontologySettings.endpoint.get();
		// var proj = Projects.findOne({_id: Session.get("activeProject")});
		// if (proj) {
		//	return endpoint;
		// }
	},
	
	schemas: function() {
		var ss = Template.ontologySettings.schemas.get();
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		var s = "";
		if (proj) { s = proj.schema; } ;		
		for (var i=0;i<ss.length;i++) {
			if (ss[i]["display_name"] == s ) {
				ss[i]["selected"] = "selected";
				break;
			}
		}
		return ss;
	},
	
	useStringLiteralConversionList: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});

		console.log("useStringLiteralConversionList ", proj)

		var act = 'SIMPLE';
		if (proj) {
			act = proj.useStringLiteralConversion;
		}
		var list = [{name:'SIMPLE'}, {name:'TYPED'}, {name:'OFF'}];
		var selected = list.filter(function(o){ return o.name == act});
		if ( selected.length > 0 ) {
			selected[0]["selected"] = "selected";
		}

		return list;
	},

	queryEngineTypeList: function() {
		//var proj = Projects.findOne({_id: Session.get("activeProject")});
		var act = Template.ontologySettings.queryEngineType.get();
		//if (proj) {
		//	act = proj.queryEngineType;
		//}
		var list = [];
		if ( act == 'virtuoso' || act == 'VIRTUOSO') {
			list.push({name: 'VIRTUOSO', selected: 'selected'});
			list.push({name: 'GENERAL'});
		}
		else
		{
			list.push({name: 'VIRTUOSO'});
			list.push({name: 'GENERAL', selected: 'selected'});
		}
		return list;
	},

	// defaultGroupingSeparator: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return proj.defaultGroupingSeparator;
	// 	}
	// },
	// NOTuseDefaultGroupingSeparator: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.useDefaultGroupingSeparator=="false" || proj.useDefaultGroupingSeparator==false);
	// 	}
	// },
	// useDefaultGroupingSeparator: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.useDefaultGroupingSeparator=="true" || proj.useDefaultGroupingSeparator==true);
	// 	}
	// },
	directClassMembershipRole: function() {
		return Template.ontologySettings.directClassMembershipRole.get();
		// var proj = Projects.findOne({_id: Session.get("activeProject")});
		// if (proj) {
		// 	return proj.directClassMembershipRole;
		// }
	},
	indirectClassMembershipRole: function() {
		return Template.ontologySettings.indirectClassMembershipRole.get();
		//var proj = Projects.findOne({_id: Session.get("activeProject")});
		//if (proj) {
		//	return proj.indirectClassMembershipRole;
		// }
	},
	// showCardinalities: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		console.log("adsf afafs", proj.showCardinalities, (proj.showCardinalities=="true"))
	// 		console.log("")

	// 		return (proj.showCardinalities=="true" || proj.showCardinalities==true);
	// 	}
	// },
	// decorateInstancePositionVariable: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.decorateInstancePositionVariable=="true" || proj.decorateInstancePositionVariable==true);
	// 	}
	// },
	// decorateInstancePositionConstants: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.decorateInstancePositionConstants=="true" || proj.decorateInstancePositionConstants==true);
	// 	}
	// },
	// simpleConditionImplementation: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.simpleConditionImplementation=="true" || proj.simpleConditionImplementation==true);
	// 	}
	// },
	// autoHideDefaultPropertyName: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.autoHideDefaultPropertyName=="true" || proj.autoHideDefaultPropertyName==true);
	// 	}
	// },
	// showPrefixesForAllNonLocalNames: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.showPrefixesForAllNonLocalNames==true );
	// 	}
	// },
	// showPrefixesForAllNames: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.showPrefixesForAllNames=="true");
	// 	}
	// },
	// completeRDFBoxesInDatetimeFunctions: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.completeRDFBoxesInDatetimeFunctions=="true");
	// 	}
	// },
	// showGraphServiceCompartments: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.showGraphServiceCompartments=="true");
	// 	}
	// },
	graphs: function() {
		// var proj = Projects.findOne({_id: Session.get("activeProject")});
		// if (proj) {
			// return (proj.showGraphServiceCompartments=="true");
		// }
		return Template.ontologySettings.graphs.get();
		// return [{instruction:"dbpedia", graph:"http://dbpedia.org"}, {instruction:"wikidata", graph:"http://wikidata.org"}]
	},
	// enableWikibaseLabelServices: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.enableWikibaseLabelServices=="true");
	// 	}
	// },
	// keepVariableNames: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return (proj.keepVariableNames=="true");
	// 	}
	// },
	// endpointUsername: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return proj.endpointUsername;
	// 	}
	// },
	// endpointPassword: function() {
	// 	var proj = Projects.findOne({_id: Session.get("activeProject")});
	// 	if (proj) {
	// 		return proj.endpointPassword;
	// 	}
	// },
});




//returns diagram types for drop down when user creates a new diagram

Template.configuratorDiagramOptions.helpers({
	configuratorDiagrams: function() {
		return DiagramTypes.find({}, {$sort: {name: 1}});
	},
});

Template.renameDiagramForm.events({

	"click #rename-diagram-form-ok": function(e) {

		var form = $("#rename-diagram-form");
		var diagram_id = form.attr("diagramId");

		form.modal("hide");

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					diagramId: diagram_id,
					attrName: "name",
					attrValue: $("#diagram-name-field").val(),
				};

		Utilities.callMeteorMethod("updateDiagram", list);
	},

});

Template.exportOntology.helpers({
	parameters: function() {
		var parameters = {schema:"true"};
		//console.log("exportOntology.helpers")
		//console.log(Session.get("activeProject"))
		if (Session.get("activeProject"))
		{
			var list = {projectId: Session.get("activeProject")};

			if (VQ_Schema_copy && VQ_Schema_copy.projectID == Session.get("activeProject")) {
				//console.log("Ir jau pareizā shēma gatava")
				parameters.label = "Schema contains " + _.size(VQ_Schema_copy.Data.Classes) + " classes."
			}
		}
		//console.log(parameters)
		return parameters;
	},
});

Template.exportOntology.events({

	'click #ok-export-ontology' : function(e) {
		$('#export-ontology-form').modal("hide");
		//console.log("exportOntology.events")
		var choice = $('input[name=stack-radio]:checked').closest(".choice").attr("name");
		//console.log(choice)

		var list = {projectId: Session.get("activeProject")};

		var schema_full = {};
		var schema_data = {};

		if (VQ_Schema_copy && VQ_Schema_copy.projectID == Session.get("activeProject")) {
			schema_full = VQ_Schema_copy;
			schema_data = VQ_Schema_copy.Data;
			if ( choice == "Ch2" )
				schema_full.printOwlFormat(1);
			if ( choice == "Ch3" )
				schema_full.printOwlFormat(2);
			if ( choice == "Ch4" )
				schema_full.printOwlFormat(3);
			if ( choice == "Ch1a" )
				schema_full.getSHACL();
			if ( choice == "Ch1" ) {
				delete schema_data._id;
				delete schema_data.projectId;
				delete schema_data.versionId;
				var link = document.createElement("a");
				var file_name = Projects.findOne({_id: Session.get("activeProject")}).name.concat(".json")
				link.setAttribute("download", file_name);
				link.href = URL.createObjectURL(new Blob([JSON.stringify(schema_data, 0, 4)], {type: "application/json;charset=utf-8;"}));
				document.body.appendChild(link);
				link.click();
			}
		}

		if (_.size(schema_full) == 0 ) {
			Utilities.callMeteorMethod("getProjectSchema", list, function(resp) {
				if (_.size(resp.schema) > 0 ) {
					schema_data = resp.schema;
					if ( choice == "Ch2" || choice == "Ch3" || choice == "Ch4" ) {
						schema_full = new VQ_Schema(schema_data);
						if ( choice == "Ch2" )
							schema_full.printOwlFormat(1);
						if ( choice == "Ch3" )
							schema_full.printOwlFormat(2);
						if ( choice == "Ch4" )
							schema_full.printOwlFormat(2);
					}
					if ( choice == "Ch1" ) {
						delete schema_data._id;
						delete schema_data.projectId;
						delete schema_data.versionId;
						var link = document.createElement("a");
						var file_name = Projects.findOne({_id: Session.get("activeProject")}).name.concat(".json")
						link.setAttribute("download", file_name);
						link.href = URL.createObjectURL(new Blob([JSON.stringify(schema_data, 0, 4)], {type: "application/json;charset=utf-8;"}));
						document.body.appendChild(link);
						link.click();
					}
				}
			});
		}



	},
});


// End of addDiagram template

function build_diagrams_query() {

	var found_diagrams = FoundDiagrams.findOne({_id: Session.get("userSystemId")});

	//if no diagrams found, then displays nothing
	if (found_diagrams && found_diagrams["noDiagrams"] == 1) {
		return;
	}

	else {
		//selecting diagram ids in array
		var diagrams = [];
		for (var key in found_diagrams) {
			if (key == "_id" || found_diagrams[key] == 0) {
				continue;
			}
			else {
				diagrams.push(key);
			}
		}

		var query = {};

		//if there is no search, then selects all the diagrams
		//else selects diagrams that are in the diagrams array
		if (diagrams.length > 0) {
			query = {_id: {$in: diagrams}};
		}

		apply_selected_group_to_query(query);

		return query;
	}
}

function get_diagram_id_from_button(src) {
	return src.closest(".diagram").attr("id");
}

function is_toolbar_enabled() {
	return Utilities.isEditable() && DiagramTypes.findOne();
}

function apply_selected_group_to_query(query) {
	var selected_group = get_user_settings_property("diagramsSelectedGroup");
	if (selected_group && selected_group != "Admin" && selected_group != "none") {
		query["allowedGroups"] = selected_group;
	}
}


function get_user_settings_property(prop_name) {

	var user_settings = UserVersionSettings.findOne({versionId: Session.get("versionId")});
	if (user_settings) {

		if (user_settings[prop_name]) {
			return user_settings[prop_name];
		}

		else {

			var full_prop_name = "diagrams" + prop_name;
			return user_settings[full_prop_name];
		}
	}
}

function set_update_doc_dgr_settings(prop_name, prop_value) {

	var prefix = get_panel_type();
	if (prefix) {
		var full_prop = prefix + prop_name;
		var set = {};
		set[full_prop] = prop_value;

		return set;
	}
}

function get_panel_type() {
	if (Session.get("activePanelItem") == "documents") {
		return "documents";
	}

	else if (Session.get("activePanelItem") == "diagrams") {
		return "diagrams";
	}

	else {
		return "";
	}
}

function get_sort_by_object(item_type) {

	var items = {
				alphabetTopDown: {name: 1},
				dateTopDown: {createdAt: -1},
				popularTopDown: {seenCount: -1},
			};

	return items[item_type];
}

function build_diagram_tree(diagram, proj_id, version_id, is_edit_mode, query, sort_by) {

	var id = diagram["_id"];

	//selecting child diagrams
	diagram["children"] = Diagrams.find({parentDiagrams: id}, {sort: sort_by}).map(
		function(child_diagram) {
			var new_child_diagram = build_diagram_tree(child_diagram, proj_id, version_id, is_edit_mode, query, sort_by);
			return new_child_diagram;
		});

	var is_collapsed = UserVersionSettings.findOne({collapsedDiagrams: diagram["_id"], versionId: Session.get("versionId")});

	//collapsed
	if (is_collapsed) {
		diagram["collapsed"] = "display: none; visibility: visible;";
		diagram["expanded"] = "display: block; visibility: visible;";
		diagram["childrenList"] = "display: none;";
	}

	//expanded
	else {
		diagram["collapsed"] = "display: block; visibility: visible;";
		diagram["expanded"] = "display: none; visibility: visible;";
		diagram["childrenList"] = "";
	}

	//checks if there was a search
	if (query && query["_id"]) {
		var is_searched_diagram = Diagrams.findOne({$and: [{_id: diagram["_id"]}, query]});
		if (is_searched_diagram) {
			diagram["colorClass"] = "bg-info";
		}
	}

	diagram["projectId"] = proj_id;
	diagram["versionId"] = version_id;
	if (is_edit_mode) {
		diagram["editMode"] = "edit";
	}

	return diagram;
}

function autoHideDefaultPropertyNameForDiagrams(diagram, sort_by){
	var id = diagram["_id"];

	//selecting child diagrams
	Diagrams.find({parentDiagrams: id}, {sort: sort_by}).map(
		function(child_diagram) {
			autoHideDefaultPropertyNameForDiagrams(child_diagram, sort_by);
	});
}

Template.migrateForm.helpers({

	tools: function() {
		return Tools.find({isDeprecated: {$ne: true},});
	},

});


Template.migrateForm.events({

	'click #migrate-to': function(e, templ) {

		$('#migrate-form').modal("hide");
		var tool_name = $("#migrate-tools").find(":selected").attr("value");
		Meteor.call("migrate", {projectId: Session.get("activeProject"), toolName: tool_name,})
	},

});
