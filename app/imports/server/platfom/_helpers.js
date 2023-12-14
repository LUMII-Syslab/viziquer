import { Diagrams } from '/imports/db/platform/collections'
import { is_not_empty } from '/imports/libs/platform/lib'

function convert_dictionary_to_array(list) {
	var element_list = [];
	for (var key in list)
		element_list.push(key);
	return element_list;
}

function get_current_time() {
	return new Date;
}

function user_not_logged_in() {
	console.log("User is not logged in");
}

function add_date_to_list(list) {
	var date = get_current_time();
	list["createdAt"] = date;
	list["lastModified"] = date;
}

function no_rights_to_access_msg() {
	var msg = "You have no rights to perform the specified operation";
	console.log(msg);
	return msg;
}

function get_attr_name(list_item) {
	for (var key in list_item) {
		return key;
	}
}

// get_default_compartment_style = function(x_y_positions) {
// 	return {
// 			adjustment: "0",
// 			adornment: "0",
// 			alignment: "0",
// 			breakAtSpace: "0",
// 			caption: "Default",
// 			compactVisible: "0",
// 			dynamicTooltip: "0",
// 			fontCharSet: "186",
// 			fontColor: "#000000",
// 			fontPitch: "0",
// 			fontSize: "-12",
// 			fontStyle: "0",
// 			fontTypeFace: "Arial",
// 			height: "15",
// 			isVisible: "1",
// 			textDirection: "0",
// 			width: "104",
// 			xPos: x_y_positions.x,
// 			yPos: x_y_positions.y,};
// }



function create_compartment_list(compart_type, list) {
	
	// computes compartment value
	var value = compart_type["defaultValue"];
	//var default_value_procedure = get_translet_by_name("defaultValue", compart_type);
	//if (default_value_procedure) {
		//vajag execute un ielikt value
	//}

	// computes compartment prefix
	var prefix = compart_type["prefix"];
	//var prefix_value_procedure = get_translet_by_name("prefix", compart_type);
	//if (prefix_value_procedure) {
		//vajag execute un ielikt value
	//}

	// computes compartment suffix
	var suffix = compart_type["suffix"];
	//var suffix_value_procedure = get_translet_by_name("suffix", compart_type);
	//if (suffix_value_procedure) {
		//vajag execute un ielikt value
	//}

	var full_value = value;
	if (is_not_empty(prefix))
		full_value = prefix + full_value;

	if (is_not_empty(suffix))
		full_value = suffix + full_value;


	var compart_type_list = {
							value: full_value,
							input: compart_type["defaultValue"],
							style: compart_type["styles"][0],	
							compartmentTypeId: compart_type["_id"],
							elementId: list["elementId"],	
							diagramId: list["diagramId"],
							elementTypeId: list["elementTypeId"],
							diagramTypeId: list["diagramTypeId"],
							projectId: list["projectId"],
							toolId: list["toolId"],
							versionId: list["versionId"],
						};

	return compart_type_list;
}

function not_loggedin_msg() {
	console.log("User is not logged in");
}

function empty_query() {
	return {_id: -1};
}


function is_public_diagram(diagram_id) {
	let diagram = Diagrams.findOne({_id: diagram_id});
	if (diagram) {
		return diagram.isPublic;
	}
}

function get_unknown_public_user_name() {
	return "unknown";
}


export {
	convert_dictionary_to_array,
	get_current_time,
	user_not_logged_in,
	add_date_to_list,
	no_rights_to_access_msg,
	get_attr_name,
	create_compartment_list,
	not_loggedin_msg,
	empty_query,
	is_public_diagram,
	get_unknown_public_user_name,
}
