import { Configurator } from '/client/js/platform/configurator/config_utils'
import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'
import { ElementTypes, CompartmentTypes, DialogTabs } from '/libs/platform/collections'

Template.compartmentsAccordion.helpers({
	element: function() {
		return Session.get("activeElement");
	},

	selectedCompartmentType: function() {
		var compart_type = CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (compart_type) {
			return compart_type["_id"];
		}
	},
});

Template.compartmentsAccordion.rendered = function() {
	if (Session.get("compartmentTargetTypeId")) {
		$("option#" + Session.get("compartmentTargetTypeId")).prop("selected", "selected");
	}
	else {
		$("option#noSelection").prop("selected", "selected");
	}
}

Template.compartmentMain.events({

	'click #addCompartment' : function(e) {

		var args = {editorType: Interpreter.getEditorType()};

		var list = {toolId: Session.get("toolId"),
					versionId: Session.get("toolVersionId"),
					diagramTypeId: Session.get("targetDiagramType"),
					diagramId: Session.get("activeDiagram"),
				};

		var compart_types_count, last_compart_type, tab;

		//if the new compartment type is attached to the element type
		if (Session.get("activeElement")) {
			var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
			if (!elem_type) {
				return;
			}

			//adding the element type type
			args["type"] = elem_type["type"];

			//addging specific properties for the elmement compartment type
			list["elementTypeId"] = elem_type["_id"];
			list["elementId"] = Session.get("activeElement");

			//selecting the compartment type count
			compart_types_count = CompartmentTypes.find({elementTypeId: list["elementTypeId"]}).count();

			//selecting the last compartment type
			last_compart_type = CompartmentTypes.findOne({elementTypeId: list["elementTypeId"]}, {sort: {tabIndex: -1}});

			//selecting the tab
			tab = DialogTabs.findOne({elementTypeId: elem_type["_id"], type: {$exists: false}}, {sort: {index: -1}});
		}

		//if the new compartment type is attached to the diagram type
		else {

			//selecting the compartment type count
			compart_types_count = CompartmentTypes.find({diagramTypeId: list["diagramTypeId"], elementTypeId: {$exists: false}}).count();

			//selecting the last compartment type
			last_compart_type = CompartmentTypes.findOne({diagramTypeId: list["diagramTypeId"], elementTypeId: {$exists: false}}, {sort: {tabIndex: -1}});

			//selecting the tab
			tab = DialogTabs.findOne({elementTypeId: {$exists: false}, type: {$exists: false}}, {sort: {index: -1}});
		}

		//setting the compartment type index in the diagram 
		list["index"] = compart_types_count;

		//if the compartment type is the first one
		if (compart_types_count == 0) {
			list["noRepresentation"] = true;
		}
		else {
			list["noRepresentation"] = false;
		}

		//setting the comparment index the last on the dialog tab
		if (last_compart_type) {
			list["tabIndex"] = last_compart_type["tabIndex"] + 1;
		}
		else {
			list["tabIndex"] = 1;
		}

		//if there is a tab, then assigning the tab
		if (tab) {
			list["dialogTabId"] = tab["_id"];
		}

		args["compartmentType"] = list;

		//adding a new compartment type
		Utilities.callMeteorMethod("insertCompartmentType", args, function(id) {
			Session.set("compartmentTargetTypeId", id);
			Session.set("activeCompartmentStyleIndex", 0);
		});
	},

	'click #deleteCompartment' : function(e) {
		var list = {id: Session.get("compartmentTargetTypeId")};
		Utilities.callMeteorMethod("removeCompartmentType", list);

		Session.set("compartmentTargetTypeId", undefined);
		Session.set("activeCompartmentStyleIndex", 0);		
	},

	'change #compartment' : function(e) {
		var id = $( "select#compartment option:selected").attr("id");
		Session.set("compartmentTargetTypeId", id);
		Session.set("activeCompartmentStyleIndex", 0);		
	},

});

// Start of compartment type body
Template.compartmentTypeBody.created = function() {
	var compart_type = CompartmentTypes.findOne({elementId: Session.get("activeElement")});
	if (compart_type) {
		Session.set("compartmentTargetTypeId", compart_type["_id"]);
	}
}

Template.compartmentTypeBody.helpers({
	existsCompartemnts: function() {
		if (get_active_compartment_types().count() > 0) {
			return true;
		}
	},

	isDiagram: function() {
		if (!Session.get("activeElement")) {
			return true;
		}
	},
});

Template.compartmentTypeDropDown.helpers({
	compartmentTypes: function() {
		var compart_types = get_active_compartment_types();

		//adds which compartment type is selected
		if (compart_types.count() > 0) {
			var selected = false;
			var compart_types_fetch = compart_types.fetch();
			
			for (var i=0;i<compart_types_fetch.length;i++) {
				var compart_type = compart_types_fetch[i];
				if (compart_type["_id"] == Session.get("compartmentTargetTypeId")) {
					compart_type["selected"] = "selected";
					selected = true;
					break;
				}
			}

			//if no compartment type is not selected, sets the first selected
			if (!selected) {
				Session.set("compartmentTargetTypeId", compart_types_fetch[0]["_id"]);
			}

			return compart_types_fetch;
		}
	},
});

Template.compartmentTypeDropDown.created = function() {
	var compart_types = get_active_compartment_types();
	if (compart_types.count() > 0) {
		Session.set("compartmentTargetTypeId", compart_types.fetch()[0]["_id"]);
	}
}

Template.compartmentTypeDropDown.destroyed = function() {
	Session.set("compartmentTargetTypeId", reset_variable());
}

Template.compartmentProperties.helpers({
	property: function() {
		var compart_type =  CompartmentTypes.findOne({_id: Session.get("compartmentTargetTypeId")});
		if (compart_type) {
			if (compart_type["isObjectRepresentation"]) {
				compart_type["isObjectRepresentationChecked"] = "checked";
			}

			if (Session.get("activeElement")) {
				compart_type["isNoRepresentation"] = true;
				if (compart_type["noRepresentation"]) {
					compart_type["noRepresentationChecked"] = "checked";	
				}
			}

			return compart_type;
		}
	},
});

Template.compartmentProperties.events({

	'blur .dialog-input' : function(e) {
		update_comparment_type_input_field(e);
	},

	'change .dialog-checkbox' : function(e) {
		update_comparment_type_checkbox_field(e);
	},
});

//returns active element's target compartment types
function get_active_compartment_types() {
	if (Session.get("activeElement")) {
		return CompartmentTypes.find({elementId: Session.get("activeElement")},
									{sort: {tabIndex: 1}});
	}
	else {
		return CompartmentTypes.find({diagramTypeId: Session.get("targetDiagramType"),
									elementTypeId: {$exists: false}}, {sort: {tabIndex: 1}});
	}
}

function update_comparment_type_input_field(e) {
	var pair = Configurator.getInputFieldValue(e);
	var list = {attrName: pair["_attr"], attrValue: pair["_value"]};

	Configurator.updateCompartmentType(list);
}

function update_comparment_type_checkbox_field(e) {
	var src = $(e.target);
	var list = {attrName: src.attr("id"), attrValue: src.prop('checked')};

	Configurator.updateCompartmentType(list);
}