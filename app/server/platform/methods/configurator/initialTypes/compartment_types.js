
get_default_compartment_style = function(type, editor_type) {
	if (type == "Box") {
		return build_box_compartment_style(editor_type);
	}

	else if (type == "Line")
		return build_line_compartment_style(editor_type);
}

build_initial_compartment_type = function(list, elem_type, editor_type) {

	list["name"] = "NewCompartment";
	list["description"] = "";
	list["prefix"] = "";
	list["suffix"] = "";
	list["defaultValue"] = "";

	if (!list["isObjectRepresentation"])
		list["isObjectRepresentation"] = false;

	if (!list["noRepresentation"])
		list["noRepresentation"] = false;

	list["inputType"] =  {type: "input",
							inputType: "text",
							placeholder: "",
						};

	//compartment styles are added only for elements (not diagrams)
	if (list["elementTypeId"]) {
		list["styles"] =  [{name: "Default",
							id: generate_id(),
							style: get_default_compartment_style(elem_type, editor_type)}
						];
	}

	list["extensionPoints"] = [
								{extensionPoint: "beforeUpdate", procedure: ""},
								{extensionPoint: "update", procedure: "UpdateCompartment"},
								{extensionPoint: "afterUpdate", procedure: ""},
								{extensionPoint: "dynamicPrefix", procedure: ""},
								{extensionPoint: "dynamicSuffix", procedure: ""},
								{extensionPoint: "dynamicDefaultValue", procedure: ""},					
								{extensionPoint: "dynamicDropDown", procedure: ""},
							];
}

build_box_compartment_style = function(editor_type) {
	if (is_ajoo_editor(editor_type)) {
		return {
				align: "center",
				fill: "white",
				padding: 0,
				placement: "start-left",
				visible: true,

				fontSize: 14,
				fontStyle: "normal",
				fontFamily: "Arial",
				fontVariant: "normal",
			};
	}
}

build_line_compartment_style = function(editor_type) {

	if (is_ajoo_editor(editor_type)) {
		return {
				align: "center",
				fill: "rgb(65,113,156)",
				padding: 0,
				placement: "inside",
				visible: true,

				fontSize: 17,
				fontStyle: "normal",
				fontFamily: "Arial",
				fontVariant: "normal",
			};
	}

}


export { build_initial_compartment_type, get_default_compartment_style, build_box_compartment_style, build_line_compartment_style }