
Interpreter.methods({

	UpdateCompartment: function(src_id, input, mapped_value, elemStyleId, compartStyleId) {

		var compart_type = this;
		var value = Dialog.buildCompartmentValue(compart_type, input, mapped_value);

		//selecting the element style by id
		var elem_style;
		if (elemStyleId) {
			var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType"), "styles.id": elemStyleId});
			if (elem_type && elem_type["styles"]) {
				elem_style = get_style_by_id(elem_type["styles"], elemStyleId);
			}
		}

		//selecting the compartment style by id
		var compart_style;
		if (compartStyleId) {
			//var compart_type_obj = CompartmentTypes.findOne({_id: compart_type["_id"],
			//											"styles.id": compartStyleId});

			//if (compart_type_obj && compart_type_obj["styles"])
			if (compart_type) {
				compart_style = get_style_by_id(compart_type["styles"], compartStyleId);
			}
		}

		return Dialog.updateCompartmentValue(compart_type, input, value, src_id, compart_style, elem_style);
	},

	TestDynamicDropDown: function() {
		return [
			{value: "item1", input: "item1", elementStyle: "NoStyle"},
			{value: "item2", input: "item2", elementStyle: "NoStyle", compartmentStyle: "NoStyle"},
			{value: "item3", input: "item32", compartmentStyle: "NoStyle"}
		];
	},

	TestDynamicRadio: function() {
		return [
			{value: "item1", input: "item1", elementStyle: "NoStyle"},
			{value: "item2", input: "item2", elementStyle: "NoStyle", compartmentStyle: "NoStyle"},
			{value: "item3", input: "item32", compartmentStyle: "NoStyle"}
		];
	},

	TestGetPrefix: function(value) {
		return "testPREFIX";
	},

	TestGetSuffix: function() {
		return "testSUFFIX";
	},

});



//Dialog methods
Dialog = {

	updateCompartmentValue: function(compart_type, input, value, src_id, compart_style, elem_style, sub_comparts) {

		var list = Dialog.buildCompartmentList(compart_type, input, value);

		if (sub_comparts) {
			list["subCompartments"] = sub_comparts;
		}

		//setting the compartment style delta
		var compart_style_out = override_compartment_style(compart_style);
		var elem_style_out = override_element_style(elem_style);

		//if there is a compartment, then updating it
		if (src_id) {

			var tmp_list = {id: src_id,
							compartmentStyleUpdate: compart_style_out,
							elementStyleUpdate: elem_style_out,
						};

			_.extend(list, tmp_list);

			//updating the compartment
			update_compartment(list);
		}

		//if there is not a compartment, then creating one
		else {

			if (compart_type["styles"]) {

				var compart_style_obj = compart_type["styles"][0];

				list["styleId"] = compart_style_obj["id"];
				list["style"] = compart_style_obj["style"];
			}

			var list_in = {compartment: list,
							//compartmentStyleUpdate: compart_style_out,
							elementStyleUpdate: elem_style_out,
						};

			//inserting the compartment
			insert_compartment(list_in);
		}

		return {input: list["input"], value: list["value"]};
	},

	buildCompartmentList: function(compart_type, input, value) {

		var compart = {
				projectId: Session.get("activeProject"),
				elementId: Session.get("activeElement"),
				diagramId: Session.get("activeDiagram"),
				diagramTypeId: compart_type["diagramTypeId"],
				elementTypeId: compart_type["elementTypeId"],
				versionId: Session.get("versionId"),
				compartmentTypeId: compart_type["_id"],

				input: input,
				value: value,
				index: compart_type["index"],
				isObjectRepresentation: compart_type["isObjectRepresentation"],
			};

		// if multifield
		if (compart_type.inputType.type == "custom" && compart_type.inputType.templateName == "multiField") {
			var ct_comparts_indexes = Compartments.find({compartmentTypeId: compart_type._id, elementId: compart.elementId }, {sort: {index: 1}})
														.map(function(c) {return c.index; });
			// search for hole in the array of indexes
		 for (var idx of ct_comparts_indexes) {
					if (idx > compart.index) { break; };
				  compart.index += 1;
		 }
		}

		return compart;
	},

	buildCompartmentValue: function(compart_type, input, mapped_value, elemStyleId, compartStyleId) {

		//if there is no mapped values, then value <== input
		var value;
		if (mapped_value || mapped_value == "") {
			value = mapped_value;
		}

		else {
			if (input || input === "") {
				value = input;
			}
			else {
				// var default_value = compart_type["defaultValue"];
				var default_value = get_default_value(compart_type, value);
				value = default_value;
			}
		}

		var prefix = get_prefix(compart_type, value);
		var suffix = get_suffix(compart_type, value);

		//adding the prefix and suffix to the value
		if (value) {
			value = prefix + value + suffix;
		}

		return value;
	},

	buildSubCompartmentTree: function(parent, compart_type, compart_tree) {

		var sub_compart_types = compart_type["subCompartmentTypes"];

		var len = sub_compart_types.length;
		var concat_style = compart_type["concatStyle"];

		var res = [];

		compart_tree[compart_type["name"]] = {};
		var sub_compart_tree = compart_tree[compart_type["name"]];

		var sub_compartments = [];
		_.each(_.sortBy(sub_compart_types, function(sc) {return sc["index"];} ), function(sub_compart_type, i) {

			var sub_sub_compart_types = sub_compart_type["subCompartmentTypes"];
			if (sub_sub_compart_types.length == 0) {

				var input_value, mapped_value;
				var elem_style_id, compart_style_id;
				var input_control = parent.find("." + sub_compart_type["_id"]);
				if (input_control.hasClass("dialog-input")) {
					input_value = input_control.val();
					input_control.val("");
				}

				else if (input_control.hasClass("textarea")) {
					input_value = input_control.val();
					input_control.val("");
				}

				else if (input_control.hasClass("dialog-selection")) {
					var selected = input_control.find("option:selected");
					input_value = selected.text();
				}

				else if (input_control.hasClass("dialog-combobox")) {
					input_value = input_control.val();

					mapped_value = input_control.attr("mappedValue");
					elem_style_id = input_control.attr("elementStyleId");
					compart_style_id = input_control.attr("compartmentStyleId");

					input_control.val("");
				}


				else if (input_control.hasClass("dialog-radio")) {
					input_value = input_control.attr("input");
				}

				else if (input_control.hasClass("dialog-checkbox")) {

					var tmp_val = input_control.prop('checked');
					if (tmp_val === true) {
						input_value = "true";
					}

					else {
					 	input_value = "false";
					}

					if (tmp_val) {
						mapped_value = input_control.attr("trueValue");
						elem_style_id = input_control.attr("trueElementStyle");
						compart_style_id = input_control.attr("trueCompartmentStyle");
					}
					else {
						mapped_value = input_control.attr("falseValue");
						elem_style_id = input_control.attr("falseElementStyle");
						compart_style_id = input_control.attr("falseCompartmentStyle");
					}

					input_control.prop('checked', false);
				}

				var value = Dialog.buildCompartmentValue(sub_compart_type, input_value, mapped_value);
				sub_compart_tree[sub_compart_type["name"]] = {value: value, input: input_value};
				res.push(value);
			}

			else {

				var val = Dialog.buildSubCompartmentTree(parent, sub_compart_type, sub_compart_tree);
				if (val) {

					if (sub_compart_type["prefix"]) {
						val = sub_compart_type["prefix"] + val;
					}

					if (sub_compart_type["suffix"]) {
						val = val + sub_compart_type["suffix"];
					}
				}

				res.push(val);

			}

			//if there are more then one compartment; checking the last compartment
			if (len > 1 && i < len-1) {
				res.push(concat_style);
			}

		});

		return res.join("");
	},

	renderDialogFields: function(compart_type, compartment) {

		if (compartment) {
	 		compart_type["field_value"] = compartment["input"];
	 		compart_type["compartmentId"] = compartment["_id"];
		}
		else {
	 		compart_type["field_value"] = "";
	 		compart_type["compartmentId"] = reset_variable();
		}

		if (compart_type["inputType"]) {
			//compart_type["fieldType"] = compart_type["inputType"]["type"];

			compart_type[compart_type["inputType"]["type"]] = true;
			compart_type["input_type"] = compart_type["inputType"]["inputType"];
			compart_type["_rows"] = compart_type["inputType"]["rows"];
			compart_type["_placeholder"] = compart_type["inputType"]["placeholder"];

			if (!Session.get("editMode")) {
				compart_type["disabled"] = true;
			}

			var compart_input, compart_id;
			if (compartment) {
				compart_input = compartment["input"];
				compart_id = compartment["_id"];
			}

			var dynamic_drop_down = Interpreter.getExtensionPointProcedure("dynamicDropDown", compart_type);
			var values;

			//building drop down dynamically
			if (dynamic_drop_down && dynamic_drop_down != "") {
				values = Interpreter.execute(dynamic_drop_down);
			}

			else {
				values = compart_type["inputType"]["values"];
			}

			compart_type["values"] = _.map(values,
				function(value_item) {

					if (compart_input === value_item["input"]) {
						value_item["selected"] = true;
						value_item["checked"] = "checked";
					}

					value_item["compartmentTypeId"] = compart_type["_id"];
					value_item["compartemntId"] = compart_id;
					value_item["disabled"] = compart_type["disabled"];

					return value_item;
				}
			);
		}

		if (compart_type["checkbox"]) {

			var cbx_values = compart_type["values"];
			var false_value, false_elem_style, false_compart_style,
				true_value, true_elem_style, true_compart_style;

			if (cbx_values && cbx_values.length == 2) {

				_.each(cbx_values, function(cbx_value) {

					if (cbx_value["input"] == "true") {
						true_value = cbx_value["value"];
						true_elem_style = cbx_value["elementStyle"];
						true_compart_style = cbx_value["compartmentStyle"];
					}

					else {
						false_value = cbx_value["value"];
						false_elem_style = cbx_value["elementStyle"];
						false_compart_style = cbx_value["compartmentStyle"];
					}
				});
			}

			else {
				console.error("Error in generating checkbox field");
				return;
			}

			compart_type["false_value"] = false_value;
			compart_type["false_elem_style"] = false_elem_style;
			compart_type["false_compart_style"] = false_compart_style;

			compart_type["true_value"] = true_value;
			compart_type["true_elem_style"] = true_elem_style;
			compart_type["true_compart_style"] = true_compart_style;

			if (compart_type["field_value"] == "true") {
				compart_type["checked"] = true;
			}
			else {
				compart_type["checked"] = false;
			}
		}

		if (compart_type["cloudFiles"]) {

			var added_files_ids = [];

			var extensions = {
							jpg: "image",
							jpeg: "image",
							mp4: "video",
						};

			var is_disabled = compart_type["disabled"];
			compart_type["addedFiles"] = DiagramFiles.find({elementId: Session.get("activeElement")}).map(
				function(diagram_file) {

					var file = CloudFiles.findOne({_id: diagram_file["fileId"]});
					diagram_file.fileId = file._id;


					if (file) {

						if (file["extension"]) {
							diagram_file["fullName"] = file["name"] + "." + file["extension"];

							if (extensions[file["extension"]]) {

								var file_type = extensions[file["extension"]];
								diagram_file[file_type] = true;


								var list = {projectId: Session.get("activeProject"),
											versionId: Session.get("versionId"),
											fileName: diagram_file.fullName,
										};

								Utilities.callMeteorMethod("getFileUrl", list, function(url) {

									var obj = $("[file-id=" + diagram_file.fileId  + "]");

									//HACK: adding/removing source element to make video playing
									if (obj.attr("video")) {
										var parent = obj.parent();
										obj.remove();
										$('<source video="video" type="video/mp4">').appendTo(parent)
																					.attr("file-id",  diagram_file.fileId)
																					.attr("src",  url);
									}

									else {
										$("[file-id=" + diagram_file.fileId  + "]").attr("src", url);
									}
								});

							}

							else {
								diagram_file["url"] = file["url"];
							}
						}

						else {
							diagram_file["fullName"] = file["name"];
							diagram_file["url"] = file["url"];
						}

						diagram_file["initialName"] = file["initialName"];
						diagram_file["disabled"] = is_disabled;
					}

					added_files_ids.push(diagram_file.fileId);
					return diagram_file;
				});

			compart_type["filesList"] = CloudFiles.find({_id: {$nin: added_files_ids}}).map(
				function(file) {

					if (file["extension"]) {
						file["fullName"] = file["name"] + "." + file["extension"];
					}
					else {
						file["fullName"] = file["name"];
					}

					return file;
				});
		}

		if (compart_type["inputType"]["type"] == "custom") {
			compart_type["templateName"] = compart_type["inputType"]["templateName"];
		}

		return compart_type;
	},

	getSelectionItem: function(selection_jquery) {
		return selection_jquery.find("option:selected");
	},

	pickFile: function(settings_in, callback) {

		//defaults
		var settings = {extension: ".json", folders: true, multiple: false, access: 'private'};

		//overriding defaults
		if (settings_in) {
			for (var key in settings_in) {

				//extension and mimeType both are not allowed in filepicker
				if (key == "mimetype") {
					delete settings["extension"];
				}

				settings[key] = settings_in[key];
			}
		}

		//loading file picker
	    filepicker.setKey("A00tvF7rHTgmD7EosBpZTz");
	    filepicker.pickAndStore(settings, {location:"S3"}, callback);
	},

	addColorPicker: function() {
		$(".color-picker").colorpicker();
	},

	showTooltip: function(e, placement) {

		//checks if tootip is already open
		if (Session.get("tooltip")) {
			return false;
		}

		if (!placement) {
			placement = "bottom";
		}

		//opens tooltip
	    var elem = $(e.target).closest(".btn-ribbon");
	    var title = elem.attr("data-title");
	    elem.tooltip('destroy')
	    	.tooltip({title: title, placement: placement})
	        .tooltip('show');

		//sets tooltip open
		Session.set("tooltip", true);
	},

	destroyTooltip: function(e, callback) {

	    //resets tooltip variable
	    Session.set("tooltip", false);

	    //destroys toolip
	    $(e.target).tooltip('destroy');
	},


	checkCompartmentVisibility: function(compart_type, compartment) {
		var is_visible = true;
		var extension_point_name = "isVisible";

		var is_visible_extension_point = _.find(compart_type.extensionPoints, function(extension_point) {
											return extension_point.extensionPoint == extension_point_name;
										});

		if (is_visible_extension_point) {
			is_visible = Interpreter.executeExtensionPoint(compart_type, extension_point_name, [compartment]);
		}

		return is_visible;
	},

	buildCopartmentDefaultValue(list) {
		var compartments = [];
		CompartmentTypes.find({elementTypeId: list["elementTypeId"]}, {$sort: {index: 1}}).forEach(
			function(compart_type) {

				if (compart_type["inputType"] && compart_type["inputType"]["templateName"] == "multiField") {
					return;
				}
				else {
					var proc_name = Interpreter.getExtensionPointProcedure("dynamicDefaultValue", compart_type);
					if (proc_name && proc_name != "") {
						compartments.push({input: Interpreter.execute(proc_name, [""]),
											value: Interpreter.execute(proc_name, [""]),
											compartmentTypeId: compart_type._id,
										});
					}
					else {
						if (compart_type["defaultValue"]) {
							compartments.push({input: (compart_type["defaultValue"] || ""),
												value: (compart_type["defaultValue"] || ""),
												compartmentTypeId: compart_type._id,
											});
						}
					}
				}
			});

		return compartments;
	},

};

function get_style_by_id(styles, id) {

	if (id === "NoStyle") {
		return;
	}

	return _.find(styles, function(style) {
						return style.id === id;
					});
}

function override_element_style(style_obj_in) {
	if (!style_obj_in) {
		return;
	}

	var style_obj_out = {};
	var is_overriden1 = override_style_properties(style_obj_in["elementStyle"], style_obj_out, "elementStyle");
	var is_overriden2 = override_style_properties(style_obj_in["startShapeStyle"], style_obj_out, "startShapeStyle");
	var is_overriden3 = override_style_properties(style_obj_in["endShapeStyle"], style_obj_out, "endShapeStyle");

	if (is_overriden1 || is_overriden2 || is_overriden3) {
		style_obj_out["styleId"] = style_obj_in["id"];
		return style_obj_out;
	}
}

function override_compartment_style(style_obj_in) {
	if (!style_obj_in) {
		return;
	}

	var style_obj_out = {};
	var is_overriden = override_style_properties(style_obj_in["style"], style_obj_out);

	if (is_overriden) {
		style_obj_out["styleId"] = style_obj_in["id"];
		return style_obj_out;
	}
}

function override_style_properties(style_in, style_obj_out, name) {

	//selecting the style name (only elements have a style name)
	var style_name = "";
	if (name) {
		style_name = "." + name;
	}

	//iterates over the style properties
	var is_overriden = false;
	_.each(style_in, function(val, key) {

		//if empty value or not defined, then not setting
		if (!val) {
			return;
		}

		//collecting the values
 		style_obj_out["style" + style_name + "." + key] = style_in[key];

 		//atleast one property was overriden
		is_overriden = true;
	});

	//if atleast one property was overriden
	return is_overriden;
}

function get_prefix(compart_type, value) {
	return get_object_type_property(compart_type, "prefix", "dynamicPrefix", value);
}

function get_suffix(compart_type, value) {
	return get_object_type_property(compart_type, "suffix", "dynamicSuffix", value);
}

function get_default_value(compart_type, value) {
	return get_object_type_property(compart_type, "defaultValue", "dynamicDefaultValue", value);
}


function get_object_type_property(compart_type, property, proc_name, value) {
	var dynamic_suffix = Interpreter.getExtensionPointProcedure(proc_name, compart_type);
	if (dynamic_suffix && dynamic_suffix != "") {
		return Interpreter.execute(dynamic_suffix, [value]);
	}

	else {
		return compart_type[property] || "";
	}
}

//Updating functions
function insert_compartment(list) {
	Utilities.callMeteorMethod("insertCompartment", list);
}

function update_compartment(list) {
	Utilities.callMeteorMethod("updateCompartment", list);
}
