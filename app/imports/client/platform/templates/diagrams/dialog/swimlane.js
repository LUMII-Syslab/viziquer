import './swimlane.html'

import { Dialog } from '/imports/client/platform/js/interpretator/Dialog'

import {
  CompartmentTypes,
  Compartments,
} from '/imports/db/platform/collections.js'
import { Utilities } from '/imports/client/platform/js/utilities/utils.js'

Template.swimlane_TopLine.helpers({

	compartment: function() {
		return render_swimlane_compartment("TopLine");
	},

});

Template.swimlane_LeftLine.helpers({

	compartment: function() {
		return render_swimlane_compartment("LeftLine");
	},

});

Template.swimlane_Middle.helpers({

	compartment: function() {
		return render_swimlane_compartment("Middle");
	},

});

//events
Template.swimlane_TopLine.events({

	'blur .dialog-input': function(e) {
		update_swimlane_compartment(e);
	},

});

Template.swimlane_LeftLine.events({

	'blur .dialog-input': function(e) {
		update_swimlane_compartment(e);
	},

});

Template.swimlane_Middle.events({

	'blur .dialog-input': function(e) {
		update_swimlane_compartment(e);
	},

});


function render_swimlane_compartment(name) {

	var cell = Session.get("swimlaneCell");
	if (!cell) {
		return;
	}

	var elem_id = Session.get("activeElement");
	if (!elem_id) {
		return;
	}

	var res = {name: "Value", _rows: 3,};

	if (!Session.get("editMode")) {
		res["disabled"] = "disabled";
	}

	var row = cell["row"];
	var column = cell["column"];

	var elem_type_id = Session.get("activeElementType");

	var tmp_name;

	if (column == 0) {
		tmp_name = "LeftLine";
	}

	else if (row == 0) {
		tmp_name = "TopLine";
	}

	else if (column != 0 && row != 0) {
		tmp_name = "Middle";
	}

	if (name != tmp_name) {
		return;
	}

	var compart_type = CompartmentTypes.findOne({elementTypeId: elem_type_id, name: name});
	if (!compart_type) {
		return;
	}

	res["compartment_type_id"] = compart_type["_id"];
	var compart = Compartments.findOne({elementId: elem_id,
										"swimlane.row": row, "swimlane.column": column});

	if (compart) {
		res["_id"] = compart["_id"];
		res["value"] = compart["input"];
	}
	
	return res;
}

function update_swimlane_compartment(e) {

	e.stopPropagation();

	var src = $(e.target);

	var src_id = src.attr("id");
	var src_val = src.val();

	var name;

	var cell = Session.get("swimlaneCell");
	if (!cell) {
		return;
	}

	var compart_type_id = src.attr("compartment-type-id")

	var compart_type = CompartmentTypes.findOne({_id: compart_type_id, elementTypeId: Session.get("activeElementType")});
	if (!compart_type) {
		return;
	}

	//computing the value
	var value = Dialog.buildCompartmentValue(compart_type, src_val);

	//making the compartment object
	var list = Dialog.buildCompartmentList(compart_type, src_val, value);

	//if no compartment, then inserting
	if (!src_id) {

		//adding style to the compartment object
		var compart_style_obj = compart_type["styles"][0];

		list["styleId"] = compart_style_obj["id"];
		list["style"] = compart_style_obj["style"];

		list["swimlane"] = cell;

		Utilities.callMeteorMethod("insertCompartment", list);
	}

	//if compartment exists, then updating it
	else {

		var compart = Compartments.findOne({compartmentTypeId: compart_type_id,
											elementId: Session.get("activeElement"),
											"swimlane.row": cell["row"],
											"swimlane.column": cell["column"]});

		list["id"] = compart["_id"];

		Utilities.callMeteorMethod("updateCompartment", list);
	}

	return false;
}

