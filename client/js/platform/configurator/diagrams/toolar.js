
//Start of toolbar
Template.toolbarButtons.helpers({

	toolbar_buttons: function() {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("targetDiagramType")});
		if (diagram_type) {
			return _.map(diagram_type["toolbar"], function(item, i) {
				item["index"] = i;
				return item;
			});
		}
	},
});

Template.toolbarButtons.events({

	'click #add-toolbar-button' : function(e) {
		var toolbar_button = {id: generate_id(), icon: "fa-plus", name: "item", procedure: ""};

		var diagram_type = DiagramTypes.findOne({_id: Session.get("targetDiagramType")});
		if (diagram_type && diagram_type["toolbar"])
			Session.set("activeToolbarButton", diagram_type["toolbar"].length);	

		add_toolbar_item("toolbar", toolbar_button);
	},

	'click #remove-toolbar-button' : function(e) {

		//selecting the toolbar button that is deleted
		var src = $(".toolbar-button[index=" + Session.get("activeToolbarButton") + "]");

		var toolbar_button = {id: src.attr("id"),
								icon: src.attr("icon") || "",
								name: src.attr("name") || "",
								procedure: src.attr("procedure") || "",
							};

		var pull;
		var src = $(".toolbar-tab.active");

		//if edit mode 
		if (src.attr("type") == "edit-mode") {
			remove_toolbar_item("toolbar", toolbar_button);
		}

		//read mode
		else {
			toolbar_button["isInEditableVersion"] = Boolean(src.attr("isInEditableVersion"));
			toolbar_button["isForAdminOnly"] = Boolean(src.attr("isForAdminOnly"));

			remove_toolbar_item("readModeToolbar", toolbar_button);
		}

		Session.set("activeToolbarButton", 0);
	},

	'click .toolbar-button' : function(e) {
		var src = $(e.target).closest(".toolbar-button");
		var index = src.attr("index");

		Session.set("activeToolbarButton", index);
	},
});

Template.toolbarButtonFields.helpers({
	toolbar_button: function() {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("targetDiagramType")});
		if (diagram_type && diagram_type["toolbar"] ) {
			var index = Session.get("activeToolbarButton");
			return diagram_type["toolbar"][index];
		}
	},
});

Template.toolbarButtonFields.events({

	'blur .dialog-input' : function(e) {
		update_toolbar_field(e, "activeToolbarButton", "toolbar");
	},
});

Template.readModeToolbarButtonFields.helpers({
	toolbar_button: function() {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("targetDiagramType")});
		if (diagram_type && diagram_type["readModeToolbar"]) {
			var index = Session.get("activeReadModeToolbarButton");
			var toolbar_button = diagram_type["readModeToolbar"][index];
			
			if (toolbar_button && toolbar_button["isInEditableVersion"])
				toolbar_button["isInEditableVersionChecked"] = "checked";

			if (toolbar_button && toolbar_button["isForAdminOnly"])
				toolbar_button["isForAdminOnlyChecked"] = "checked";

			return toolbar_button;
		}	
	},
});

Template.readModeToolbarButtonFields.events({

	'blur .dialog-input' : function(e) {
		update_toolbar_field(e, "activeReadModeToolbarButton", "readModeToolbar");
	},

	'change .dialog-checkbox' : function(e) {
		var src = $(e.target);
		var index = Session.get("activeReadModeToolbarButton");
		var attr_name = "readModeToolbar." + index + "." + src.attr("id");
		var value = src.prop('checked');

		update_toolbar_item(attr_name, value);
	},
});

Template.readModeToolbarButtons.helpers({
	toolbar_buttons: function() {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("targetDiagramType")});
		if (diagram_type)
			return _.map(diagram_type["readModeToolbar"], function(item, i) {
				item["index"] = i;
				return item;
			});
	},
});

Template.readModeToolbarButtons.events({

	'click #add-read-mode-toolbar-button' : function(e) {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("targetDiagramType")});
		if (diagram_type && diagram_type["readModeToolbar"])
			Session.set("activeReadModeToolbarButton", diagram_type["readModeToolbar"].length);

		var toolbar_button = {id: generate_id(), icon: "fa-plus", name: "item",
							procedure: "", isInEditableVersion: false, isForAdminOnly: false};

		add_toolbar_item("readModeToolbar", toolbar_button);
	},

	'click #remove-read-mode-toolbar-button' : function(e) {

		var src = $(".toolbar-button[index=" + Session.get("activeReadModeToolbarButton") + "]");

		var toolbar_button = {id: src.attr("id"),
								icon: src.attr("icon") || "",
								name: src.attr("name") || "",
								procedure: src.attr("procedure") || "",
								//isOnlyEditMode: 
							};

		remove_toolbar_item("readModeToolbar", toolbar_button) 

		Session.set("activeReadModeToolbarButton", 0);
	},

	'click .toolbar-button' : function(e) {
		var src = $(e.target).closest(".toolbar-button");
		var index = src.attr("index");

		Session.set("activeReadModeToolbarButton", index);
	},
});

Template.diagramToolbar.rendered = function() {
	Session.set("activeToolbarButton", 0);
	Session.set("activeReadModeToolbarButton", 0);
}

Template.diagramToolbar.destroyed = function() {
	Session.set("activeToolbarButton", reset_variable());
	Session.set("activeReadModeToolbarButton", reset_variable());
}

Template.diagramToolbar.helpers({
	toolbarItems: function() {
		return Configurator.getKeystrokesOrItems("toolbar");
	},
});

Template.diagramToolbar.events({

//add toolbar item
	'click #add-toolbar-item' : function(e) {

		var collection_meta_data = {collection: "DiagramTypes",
									array: "toolbar",
									fields: ["item", "procedure", "icon"]};

		Configurator.addKeystrokeOrItem(e, "addKeystrokeOrContextMenu", collection_meta_data);
	},

//remove toolbar item
	'click .remove-toolbar-item' : function(e) {
		var collection = {collection: "DiagramTypes", array: "toolbar"};
		Configurator.deleteKeystrokeOrItem(e, "deleteKeyStrokeOrContextMenu", collection);
	},

//updates toolbar item
	'blur .toolbar-item': function(e) {
		var collection = {collection: "DiagramTypes",
							array: "toolbar",
							field: "item"};
		Configurator.updateKeystrokeOrItem(e, "updateKeystrokeOrContextMenu", collection);
	},

//updates toolbar procedure
	'blur .toolbar-procedure': function(e) {
		var collection = {collection: "DiagramTypes",
							array: "toolbar",
							field: "procedure"};
		Configurator.updateKeystrokeOrItem(e, "updateKeystrokeOrContextMenu", collection);
	},

//updates toolbar item icon
	'blur .toolbar-icon': function(e) {
		var collection = {collection: "DiagramTypes",
							array: "toolbar",
							field: "icon"};
		Configurator.updateKeystrokeOrItem(e, "updateKeystrokeOrContextMenu", collection);
	},
});

//End of toolbar

function update_toolbar_field(e, var_name, toolbar_type_name) {
	var src = $(e.target);
	var index = Session.get(var_name);
	var id = src.attr("id");
	var value = src.val();

	var attr_name = toolbar_type_name + "." + index + "." + id;
	update_toolbar_item(attr_name, value);
}

//Updating functions

function add_toolbar_item(attr_name, toolbar_button) {
	var list = {id: Session.get("targetDiagramType"), attrName: attr_name, push: toolbar_button};
	Utilities.callMeteorMethod("addToolbarItem", list);
}

function remove_toolbar_item(attr_name, toolbar_button) {
	var list = {id: Session.get("targetDiagramType"), attrName: attr_name, pull: toolbar_button};
	Utilities.callMeteorMethod("removeToolbarItem", list);
}

function update_toolbar_item(attr_name, attr_value) {
	var list = {id: Session.get("targetDiagramType"), attrName: attr_name, attrValue: attr_value};
	Utilities.callMeteorMethod("updateDiagramType", list);
}
