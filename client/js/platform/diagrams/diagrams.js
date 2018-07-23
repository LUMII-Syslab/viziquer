
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
		$('#add-diagram').modal("show");
	},

	'click #download-project': function(e) {

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

		Utilities.callMeteorMethod("getProjectJson", list, function(resp) {

			if (resp.diagrams) {
			    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resp, 0, 4));
				var link = $('<a href="data:' + data + '" download="data.json">download JSON</a>');
				link.appendTo('#download-hack')
				link[0].click();
			}

		});
	},

	'click #upload-project': function(e, templ) {
		// e.preventDefault();

		$('#upload-project-form').modal("show");
	},

	'click #import': function(e, templ) {
		$('#import-ontology-form').modal("show");
	},

	'click #settings': function(e, templ) {
		$('#ontology-settings-form').modal("show");
	},

	'click #migrate' : function(e, templ) {
		$("#migrate-form").modal("show");
	},

//shows button's tooltip on mouse over
    'mouseenter .btn-ribbon' : function(e, templ) {
    	Dialog.destroyTooltip(e);
    	Dialog.showTooltip(e);
    },

//removes tooltip on mouse leave
    'mouseleave .btn-ribbon' : function(e, templ) {
    	Dialog.destroyTooltip(e);
    },

});

Template.diagramsRibbon.helpers({

	versionId: function() {
		return Session.get("versionId");
	},

	//if the version is editable and there is atleast one diagram type
	is_toolbar_enabled: function() {
		return is_toolbar_enabled();
	},

	project_id: function() {
		return Session.get("activeProject");
	},

	tool_name: function() {
		var project_id = Session.get("activeProject");
		var project = Projects.findOne({_id: project_id,});
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

	"click .dublicate-diagram": function(e) {

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

		Utilities.callMeteorMethod("dublicateDiagram", list);
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


Template.importOntology.events({

	'click #ok-import-ontology' : function(e, templ) {

		//hidding the form
		$('#import-ontology-form').modal("hide");

		var fileList = $("#fileList")[0].files;
	    _.each(fileList, function(file) {

		

	        var reader = new FileReader();

	        reader.onload = function(event) {

			//console.log(reader.result);
			//var x=require('n3').Parser().parse(require('fs').readFileSync('UnivExample_hasMarkS2.n3').toString())
			//Utilities.callMeteorMethod("loadTriplesMaps", reader.result);
			
				var data = JSON.parse(reader.result)

				if (data)
				{
					if ( data.Classes ){
						var list = {projectId: Session.get("activeProject"),
									versionId: Session.get("versionId"),
									data: data,
								};
						  Utilities.callMeteorMethod("loadMOntology", list); 					
					}
					else {
						var list = {projectId: Session.get("activeProject"),
									versionId: Session.get("versionId"),
									data: { Data: data },
								};					
						Utilities.callMeteorMethod("loadTriplesMaps", list ); 					
					}
					

					//if ( data.Schema ) {
					//	Utilities.callMeteorMethod("loadMOntology", list); }
					//else {
					//	Utilities.callMeteorMethod("loadOntology", list); }
				}
				//else  Te būs kļūdas ziņojums lietotājam};
	        }

	        reader.onerror = function(error) {
	            console.error("Error: ", error);
	        }
	        reader.readAsText(file);
	    });
		



		

	},

});


Template.uploadProject.events({

	'click #ok-upload-project' : function(e, templ) {

		//hidding the form
		$('#upload-project-form').modal("hide");

		var fileList = $("#projectFileList")[0].files;
	    _.each(fileList, function(file) {

	        var reader = new FileReader();

	        reader.onload = function(event) {
				var diagrams = JSON.parse(reader.result)
	        	var list = {projectId: Session.get("activeProject"),
	        				versionId: Session.get("versionId"),
	                        data: diagrams,
	                    };

				Utilities.callMeteorMethod("uploadProjectData", list);
			}

	        reader.onerror = function(error) {
	            console.error("Error: ", error);
	        }
	        reader.readAsText(file);
	    });

	},

});




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

	'click #ok-ontology-settings' : function(e, templ) {

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					uri: $("#ontology-uri").val(),
					endpoint: $("#ontology-endpoint").val(),
          useStringLiteralConversion: $("#use-string-literal-conversion").val(),
          queryEngineType: $("#query-engine-type").val(),
					useDefaultGroupingSeparator: $("#use-default-grouping-separator").is(":checked"),
					defaultGroupingSeparator: $("#default-grouping-separator").val(),
				};

		Utilities.callMeteorMethod("updateProjectOntology", list);
	},

	'click #use-default-grouping-separator' : function(e, templ) {
						$("#default-grouping-separator").prop('disabled', !$("#use-default-grouping-separator").is(":checked"))

	},

	'click #cancel-ontology-settings' : function(e, templ) {
	 var proj = Projects.findOne({_id: Session.get("activeProject")});
	 if (proj) {
		 $("#ontology-uri").val(proj.uri);
		 $("#ontology-endpoint").val(proj.endpoint);
		 $("#use-string-literal-conversion").val(proj.useStringLiteralConversion);
		 $("#query-engine-type").val(proj.queryEngineType);
		 $("#use-default-grouping-separator").prop("checked", proj.useDefaultGroupingSeparator);
		 $("#default-grouping-separator").prop('disabled', proj.useDefaultGroupingSeparator=="false");
		 $("#default-grouping-separator").val(proj.defaultGroupingSeparator);
	 }

	},

	"click #test-endpoint": function(e) {

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					uri: $("#ontology-uri").val(),
					endpoint: $("#ontology-endpoint").val(),
				};

		Utilities.callMeteorMethod("testProjectEndPoint", list, function(res) {

			var class_name = "danger";
			var text = "Connection is not ok";

			if (res.status == 200) {
				class_name = "success";
				text = "Connection is ok";
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

});

Template.ontologySettings.helpers({

	uri: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			return proj.uri;
		}
	},

	endpoint: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			return proj.endpoint;
		}
	},

	useStringLiteralConversion: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			return proj.useStringLiteralConversion;
		}
	},

	queryEngineType: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			return proj.queryEngineType;
		}
	},

	defaultGroupingSeparator: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			return proj.defaultGroupingSeparator;
		}
	},
	NOTuseDefaultGroupingSeparator: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			return (proj.useDefaultGroupingSeparator=="false");
		}
	},
	useDefaultGroupingSeparator: function() {
		var proj = Projects.findOne({_id: Session.get("activeProject")});
		if (proj) {
			return (proj.useDefaultGroupingSeparator=="true");
		}
	}
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
