
//Start of dialog accordion
Template.dialogAccordion.helpers({
	tabs: function() {

		var dialog_tabs;

		//if there is an active element, then selects its tabs
		if (Session.get("activeElement")) {
			
			//selects active element's target type
			var target_elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
			if (target_elem_type)
				dialog_tabs = DialogTabs.find({elementTypeId: target_elem_type["_id"]},
											{$sort: {index: 1}});
		}
		//if there is no active elements, then selects diagram's tabs
		else {

			var diagram_type = DiagramTypes.findOne({diagramId: Session.get("activeDiagram")});
			if (diagram_type) {
				dialog_tabs = DialogTabs.find({diagramTypeId: diagram_type["_id"],
												elementTypeId: {$exists: false}},
												{$sort: {index: 1}});
			}
		}

		//collects dialog tabs data
		if (dialog_tabs) {

			return dialog_tabs.map(function(dialog_tab) {
					var rows = CompartmentTypes.find({dialogTabId: dialog_tab["_id"]},
													{$sort: {tabIndex: 1}});
					if (rows.count() > 0)
						dialog_tab["_rows"] = rows;
					else
						dialog_tab["_delete"] = true;

					return dialog_tab;
				});
		}
	},
});	

Template.dialogAccordion.events({

	'click .remove-tab' : function(e) {
		var tab_id = $(e.target).closest(".tab").attr("id");
		remove_tab(tab_id);
	},

	'click .edit-tab' : function(e) {
		e.preventDefault();

		var tab = $(e.target).closest(".tab");
		var tab_id = tab.attr("id");

		Session.set("tabId", tab_id);
		$("#edit-tab-form").modal("show");

		return false;
	},

	'blur .tab-name' : function(e) {

		var tab_container = $(e.target).closest(".tab");
		var tab = tab_container.find(".tab-name");
		tab.attr({contentEditable: false});

		var id = tab_container.attr("id");
		var name = tab.text();

		update_tab_name(id, name);
	},

	'click #addTab' : function(e) {
		$("#new-tab-form").modal("show");
	},
});

Template.row.rendered = function() {

	var old_tab_id;
    $(".compartments").sortable({              
        items: ".compartment",
        connectWith: ".compartments",
        distance: 3,

        start: function(event, ui) {  
        	var el = $(ui.item);
        	old_tab_id = el.closest(".tab").attr("id");
        },

        stop: function(event, ui) {
         	var el = $(ui.item[0]);
	    	var id = el.attr("id");
	        if (el.hasClass("compartment")) {
	        	var tab = el.closest(".tab");
	        	if (tab.attr("type")) {
	        		$(".compartments[tabId=" + old_tab_id + "]").sortable("cancel");
	        	}
	        	else {
		        	var before = ui.item.prev().get(0);
		        	var prev_index = -1;
		        	if (before)
		        		prev_index = $(before).attr("index");

		        	var compart_type_id = el.attr("id");
		        	var parent_id =tab.attr("id");
		        	var compart_types = el.closest(".dd-list").find(".dd-item");

		        	var params = {prevIndex: Number(prev_index),
		        				currentIndex: Number(el.attr("index")),
		        				newTabId: parent_id,
		        				oldTabId: old_tab_id,
		        				compartmentTypeId: compart_type_id,
		        				toolId: Session.get("toolId"),
		        				versionId: Session.get("toolVersionId"),
		        			};

		        	//method is used because there is need to update multiple
		        	//compartment types at once 
		        	Meteor.call("reorderCompartmentTypeTabIndexes", params, function(err) {
		        		if (err) {
		        			console.log("Error in reorderCompartments callback", err);
		        		}
		        	});
	        	}
	        }

	        old_tab_id = reset_variable();	        
        },
    });
}

Template.dialogAccordion.rendered = function(){

    $("#tabs").sortable({              
		items: ".tab",

        stop: function(event, ui) {
         	var el = $(ui.item[0]);
	    	var id = el.attr("id");
			if (el.hasClass("tab")) {

	        	var before = ui.item.prev().get(0);
	        	var prev_index = -1;
	        	if (before) {
	        		prev_index = $(before).attr("index");
	        	}

	        	var tab_id = el.attr("id");
	        	var tabs = el.closest(".dd-list").find(".dd-item");

	        	//update 
	           	var params = {prevIndex: Number(prev_index),
		    				currentIndex: Number(el.attr("index")),
		    				dialogTabId: tab_id,
		    				toolId: Session.get("toolId"),
		    				diagramTypeId: Session.get("targetDiagramType"),
		    				versionId: Session.get("toolVersionId"),
		    			}; 	

		    	if (Session.get("activeElement")) {
		    		var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		    		if (elem_type) {
		    			params["elementTypeId"] = elem_type["_id"];
		    		}
		    	}

	        	//method is used because there is need to update multiple compartment types at once 
	        	Meteor.call("reorderTabIndexes", params, function(err) {
	        		if (err)
	        			console.log("Error in reorderTabIndexes callback", err);
	        	});
	        }
        }
    });
};
//End of dialog accordion

Template.newTab.events({

	'click #add-tab' : function(e) {
		var name = $("#tab-name").val();
		var tab_name = $("#tab-type").find(":selected").attr("id");

		$("#new-tab-form").modal("hide");

		var list = {toolId: Session.get("toolId"),
					versionId: Session.get("toolVersionId"),
					diagramTypeId: Session.get("targetDiagramType"),
					diagramId: Session.get("activeDiagram"),
					type: tab_name,
					name: name,
				};
				
		var elem_type = ElementTypes.findOne({$and: [{elementId: Session.get("activeElement")},
													{elementId: {$exists: true}}]});
		if (elem_type) {
			list["elementTypeId"] = elem_type["_id"];

			var dialog_tab = DialogTabs.findOne({elementTypeId: elem_type["_id"]},
												{$sort: {index: -1}});
			if (dialog_tab) {
				list["index"] = dialog_tab["index"] + 1;
			}
			else {
				list["index"] = 1;
			}
		}
		else {
			var dialog_tab = DialogTabs.findOne({diagramTypeId: Session.get("targetDiagramType"),
												elementTypeId: {$exists: false}},
												{$sort: {index: -1}});
			if (dialog_tab) {
				list["index"] = dialog_tab["index"] + 1;
			}
			else {
				list["index"] = 1;
			}
		}

		insert_tab(list);
	}
});

Template.newTab.helpers({
	options: function() {

		var list = [{name: "--New tab--"}]
		if (Session.get("activeElement")) {
			list.push({id: "sectionsTemplate", name: "Documents"});
			list.push({id: "elementStyleAccordion", name: "Style"});
		}
		else {
			//list.push({id: "diagramAccordion", name: "Diagram"});
			list.push({id: "diagramStyle", name: "Style"});
		}

		return list;
	},
});

Template.editTab.helpers({

	name: function() {
		var tab = DialogTabs.findOne({_id: Session.get("tabId")});
		if (tab) {
			return tab["name"]
		}
	},
});

Template.editTab.events({

	//closing the dialog
	'click #edit-tab' : function(e, templ) {
		$('#edit-tab-form').attr("OKPressed", true);
		$("#edit-tab-form").modal("hide");		
	},

	//if ok was clicked, then updating the DB
	'hidden.bs.modal #edit-tab-form' : function(e) {

		var src = $('#edit-tab-form');
		if (src.attr("OKPressed")) {
			src.removeAttr("OKPressed");

			var id = Session.get("tabId");
			var name = $("#edit-tab-name").val();
			update_tab_name(id, name);	

			Session.set("tabId", reset_variable());	
		}
	},
});

function insert_tab(list) {
	Utilities.callMeteorMethod("insertTab", list);	
}

function update_tab_name(id, name) {

	var list = {tabId: id,
				toolId: Session.get("toolId"),
				name: name,
			};

	Utilities.callMeteorMethod("updateTab", list);		
}

function remove_tab(tab_id) {
	var list = {id: tab_id, toolId: Session.get("toolId")};
	Utilities.callMeteorMethod("removeTab", list);
}

