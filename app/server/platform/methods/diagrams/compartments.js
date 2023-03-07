import { is_project_member } from '/libs/platform/user_rights'
import { DiagramLogs, Diagrams, Elements, Compartments, CompartmentTypes  } from '/libs/platform/collections'

Compartments.after.update(function (user_id, doc, fields, modifier, options) {

	if (!doc)
		return;

	update_compartment(user_id, doc);

	//if element compartment was updated
	if (doc["elementId"]) {

		var prev_doc = this.previous;

		var edit = {action: "updated", time: new Date(),
					actionData: {oldValue: prev_doc["value"],
								newValue: doc["value"],
								elementId: doc["elementId"]}
					};

		var action = build_diagram_notification(user_id, doc, edit);

		DiagramLogs.insert(action);
	}

});

Compartments.hookOptions.after.insert = {fetchPrevious: false};
Compartments.after.insert(function (user_id, doc) {
	if (!doc)
		return;

	if (doc["isObjectRepresentation"])
		update_compartment(user_id, doc);
});

Meteor.methods({

	insertCompartment: function(list) {
		var user_id = Meteor.userId();

		var compart_in = list.compartment;
		if (is_project_member(user_id, compart_in)) {

			if (!_.isUndefined(compart_in["value"]) && !_.isUndefined(compart_in["input"] && compart_in.input !== "")) {

				compart_in["valueLC"] = compart_in["value"].toLowerCase();
				Compartments.insert(compart_in);
				// Compartments.insert(compart_in, {trimStrings: false});

				if (list["elementStyleUpdate"]) {
					Elements.update({_id: compart_in.elementId, projectId: compart_in.projectId, versionId: compart_in.versionId},
									{$set: list["elementStyleUpdate"]});
				}
			}
		}
	},

	updateCompartment: function(list) {

		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			if (list["value"] || list["value"] == "") {

				var update = {};
				if (list["compartmentStyleUpdate"]) {
					update = list["compartmentStyleUpdate"];
				}

				if (list["subCompartments"]) {
					update["subCompartments"] = list["subCompartments"];
				}

				update["value"] = list["value"];
				update["input"] = list["input"];
				update["valueLC"] = list["value"].toLowerCase();

				if (list["value"] == "" && list["input"] == "") {
					Compartments.remove({_id: list["id"], projectId: list["projectId"],
															versionId: list["versionId"]});
				}

				else {

					Compartments.update({_id: list["id"], projectId: list["projectId"],
										versionId: list["versionId"]},
										{$set: update});
									// {$set: update}, {trimStrings: false, removeEmptyStrings: false,});
				}

				if (list["elementStyleUpdate"]) {
					var elem_update = list["elementStyleUpdate"]
					Elements.update({_id: list["elementId"]}, {$set: elem_update});
				}

			}
		}
	},

	removeCompartment: function(list) {

		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {

			if (!list["compartmentId"])
				return;

			Compartments.remove({_id: list["compartmentId"],
								projectId: list["projectId"],
								versionId: list["versionId"],
							});

		}
	},

	swapCompartments: function(list) {
		var user_id = Meteor.userId();
		if (is_project_member(user_id, list)) {
			var prev_compart = list.prevCompartment;
			var current_compart = list.currentCompartment;

			Compartments.update({_id: prev_compart.id}, {$set: {index: current_compart.index}});
			Compartments.update({_id: current_compart.id}, {$set: {index: prev_compart.index}});
		}
	},

});

function update_compartment(user_id, doc) {
	var update = {};

	if (!doc["elementId"] && doc["isObjectRepresentation"]) {
		update["name"] = doc["value"];

		Diagrams.update({_id: doc["diagramId"]}, {$set: update});
	}
}

add_compartments_by_values = function(list, compartments) {

	var compart_ids = _.map(compartments, function(item) {
							return item.compartmentTypeId;
						});
		
	CompartmentTypes.find({_id: {$in: compart_ids,}}, {$sort: {index: 1}}).forEach(function(compart_type, i) {
		add_compartment(compart_type, list,  _.find(compartments, function(c) { return c.compartmentTypeId == compart_type._id }));
	});

}


//adding compartments in the DB
add_compartments = function(list) {

	CompartmentTypes.find({elementTypeId: list["elementTypeId"]}, {$sort: {index: 1}}).forEach(
		function(compart_type) {
			if (compart_type["inputType"] && compart_type["inputType"]["templateName"] == "multiField") {
				return;
			}
			else if (compart_type["defaultValue"]) {
				add_compartment(compart_type, list);
			}
		});
}

add_compartment = function(compart_type, list, compart_in) {
	var compart = build_compartment(compart_type, list, compart_in);
	Compartments.insert(compart);
}

build_compartment = function(compart_type, list, compart_in) {

	if (compart_type["styles"] && compart_type["styles"][0]) {

		var input = "";
		var value = "";
		if (compart_in) {
			input = compart_in.input;
			value = compart_in.value;
		}
		else {
			default_value = get_default_value(compart_type);
			var prefix = get_prefix(compart_type, default_value);
			var suffix = get_suffix(compart_type, default_value);

			if (default_value && default_value != "") {
				value = prefix + default_value + suffix;
			}
		}

		var style_obj = compart_type["styles"][0];
		var style = style_obj["style"];

		var compart = {
			elementId: list["id"],
			diagramId: list["diagramId"],
			diagramTypeId: list["diagramTypeId"],
			elementTypeId: list["elementTypeId"],
			versionId: list["versionId"],
			compartmentTypeId: compart_type["_id"],

			input: input,
			index: compart_type["index"],

			styleId: style_obj["id"],
			style: style,

			isObjectRepresentation: compart_type["isObjectRepresentation"],
		};

		if (value || value == "") {
			compart["value"] = value;
			compart["valueLC"] = value.toLowerCase();
		}
		if (list["projectId"]) {
			compart["projectId"] = list["projectId"];
		}
		else if (list["toolId"]) {
			compart["toolId"] = list["toolId"];
		}

		return compart;
	}
}

//TODO: Needs extension points executions
function get_default_value(compart_type) {

	//
	return compart_type["defaultValue"];
}


function get_prefix(compart_type, default_value) {
	return compart_type["prefix"] || "";
}

function get_suffix(compart_type, default_value) {
	return compart_type["suffix"] || "";
}
