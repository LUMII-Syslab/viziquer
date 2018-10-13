
Template.dialogTabContent.helpers({

	compart_types: function() {
		return this;
	},

});

Template.dialogTabContent.events({

	'blur .dialog-input': function(e) {

		e.stopPropagation();

		var src = $(e.target);
		var parent = src.closest(".parent-compartment");
		if (parent.length > 0) {
			update_compartment_from_sub_fields(parent);
		}

		else {
			var src_id = src.attr("id");
			var src_val = src.val();

			upsert_compartment_value(e, src_id, src_val);
		}

		Session.set("editingDialog", reset_variable());

		return false;
	},

	'focus .dialog-input': function(e) {
		Session.set("editingDialog", true);
	},

	'keypress .dialog-input': function(e) {
		e.stopPropagation();
		var compart_id = $(e.target).attr("id");
		var compart = Compartments.findOne({_id: compart_id});
		if (!compart) {
			return;
		}

		var compart_type = CompartmentTypes.findOne({_id: compart.compartmentTypeId,});
		Interpreter.executeExtensionPoint(compart_type, "processKeyStroke", [e, compart]);
	},

	'change .dialog-selection' : function(e) {

		e.stopPropagation();

		var src = $(e.target);
		var parent = src.closest(".parent-compartment");
		if (parent.length > 0) {
			update_compartment_from_sub_fields(parent);
		}

		else {
			var src_id = src.attr("id");
			var selected = src.find("option:selected");
			var src_val = selected.text();
			var mapped_value = selected.attr("mappedValue");			

			var elem_style_id = selected.attr("elementStyleId");
			var compart_style_id = selected.attr("compartmentStyleId");

			upsert_compartment_value(e, src_id, src_val, mapped_value, elem_style_id, compart_style_id);
		}
	},

	'focus .dialog-combobox': function(e) {
		Session.set("editingDialog", true);
	},

	'blur .dialog-combobox': function(e) {
		update_combobox(e);
	},

	'input .dialog-combobox': function(e) {
		update_combobox(e);
		Session.set("editingDialog", true);
	},

	'change .dialog-checkbox' : function(e) {

		e.stopPropagation();

		var src = $(e.target);
		var parent = src.closest(".parent-compartment");
		if (parent.length > 0) {
			update_compartment_from_sub_fields(parent);
		}

		else {
			var src_id = src.attr("id");
			var checkbox_value = src.prop('checked');
			var mapped_value;

			var elem_style_id, compart_style_id;

			if (checkbox_value) {
				mapped_value = src.attr("trueValue");
				elem_style_id = src.attr("trueElementStyle");
				compart_style_id = src.attr("trueCompartmentStyle");
			}
			else {
				mapped_value = src.attr("falseValue");
				elem_style_id = src.attr("falseElementStyle");
				compart_style_id = src.attr("falseCompartmentStyle");				
			}

			upsert_compartment_value(e, src_id, checkbox_value.toString(), mapped_value, elem_style_id, compart_style_id);
		}
	},

	'change .dialog-radio' : function(e) {

		e.stopPropagation();

		var src = $(e.target);
		var parent = src.closest(".parent-compartment");
		if (parent.length > 0) {
			update_compartment_from_sub_fields(parent);
		}

		else {
			var parent = src.closest(".form-group");
			var src_id = parent.attr("compartmentId");

			var radio_value = src.attr("input");
			var mapped_value = src.attr("mappedValue");

			var elem_style_id = src.attr("elementStyleId");
			var compart_style_id = src.attr("compartmentStyleId");

			upsert_compartment_value(e, src_id, radio_value, mapped_value, elem_style_id, compart_style_id);
		}
	},

	"click .attach-file-btn": function(e) {
		e.preventDefault();
		var form = $(e.target).closest(".attach-container").find(".attach-file-form");

		form.modal("show");
	},

	"click .detach-file": function(e) {

		var button = $(e.target).closest(".detach-file");

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					diagramFileId: button.attr("id"),
				};

		Utilities.callMeteorMethod("detachFileFromElement", list);

	},

	"click #upload-file": function(e) {
		e.preventDefault();	
		$("#upload-file-form").modal("show");
	},

	"click .file-link": function(e) {

		e.preventDefault();

		var src = $(e.target);

		var file_container = $(e.target).closest(".file-link");

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					fileName: file_container.attr("initialName"),
				};

		Utilities.callMeteorMethod("getFileUrl", list, function(url) {
			window.open(url, '_blank');
		});

	},

});

Template.attachFiles.events({

	"click .attach-file": function(e) {

		var button = $(e.target).closest(".attach-file");
		
		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					diagramId: Session.get("activeDiagram"),
					elementId: Session.get("activeElement"),
					fileId: button.attr("id"),
					index: DiagramFiles.find({elementId: Session.get("activeElement")}).count() + 1,
				};

		Utilities.callMeteorMethod("attachFileToElement", list);
	},

	"click .attach-file-form-close": function(e) {
		var form = $(e.target).closest(".attach-file-form");
		form.modal("hide");
	},

});

Template.uploadFileFormInDiagram.events({

	"click #upload-file-form-ok": function(e) {
		e.preventDefault();

		//insert file and attach it to the elmeent
  		var meta_context = {projectId: Session.get("activeProject"),
  							versionId: Session.get("versionId"),
  						};

  		//selecting file
		var uploader = new Slingshot.Upload("myFileUploads", meta_context);
		var file = document.getElementById('fileToUpload').files[0];

		//hiding hte form
		$("#upload-file-form").modal("hide");

		uploader.send(file, function (error, file_url) {
		  	
			if (error) {
				console.error('Error uploading', uploader.xhr.response);
			}

			else {

				document.getElementById("fileToUpload").value = "";

		  		var list = {projectId: Session.get("activeProject"),
		  					versionId: Session.get("versionId"),
		  					url: file_url,
		  					name: file_url,
		  				};

		  		//inserting a file
		  		Utilities.callMeteorMethod("insertFile", list,

		  			//attaching a file
		  			function(file_id) {

			  			var list2 = {projectId: Session.get("activeProject"),
									versionId: Session.get("versionId"),
									diagramId: Session.get("activeDiagram"),
									elementId: Session.get("activeElement"),
									fileId: file_id,
									index: DiagramFiles.find({elementId: Session.get("activeElement")}).count() + 1,
								};

						Utilities.callMeteorMethod("attachFileToElement", list2);

			  	});
		  	}

		});
	},

});

function update_combobox(e) {

	e.stopPropagation();

	var src = $(e.target);
	var parent = src.closest(".parent-compartment");
	if (parent.length > 0) {
		update_compartment_from_sub_fields(parent);
	}

	else {
		var src_id = src.attr("id");
		var src_val = src.val();

		var selected = src.closest(".compart-type").find('option[input="'+src_val+'"]');
		var mapped_value = selected.attr("mappedValue");			

		var elem_style_id = selected.attr("elementStyleId");
		var compart_style_id = selected.attr("compartmentStyleId");

		upsert_compartment_value(e, src_id, src_val, mapped_value, elem_style_id, compart_style_id);
	}

	Session.set("editingDialog", reset_variable());

	return false;
}


//Generating new dialog templates
function define_dialog_tab_template(id) {

	var template_structure = '{{> Template.dynamic template="dialogTabContent" data=compart_types}}';

	compileTemplate(id, template_structure);
}

function compileTemplate(name, html_text) { 
    try { 
        var compiled = SpacebarsCompiler.compile(html_text, {isTemplate: true}); 
        var renderer = eval(compiled);
        UI.Template.__define__(name, renderer);

        add_template_helpers(name);
    } 

    catch (err){ 
        console.error('Error compiling template:' + html_text); 
        console.error(err.message); 
    } 
}; 

function add_template_helpers(id) {

	//helpers
	Template[id].helpers({

		compart_types: function() {

			return CompartmentTypes.find({dialogTabId: id}, {sort: {tabIndex: 1}}).map(
				function(compart_type) {

					var compartment = Compartments.findOne({compartmentTypeId: compart_type["_id"],
						 									elementId: Session.get("activeElement")});

					var is_visible = check_compartment_visibility(compart_type, compartment);
					if (is_visible) {
						return render_dialog_fields(compart_type, compartment);
					}
			});
		},

	});
}


build_sub_compartment_tree = function(parent, compart_type, compart_tree) {

	var sub_compart_types = compart_type["subCompartmentTypes"];
	var len = sub_compart_types.length;
	var concat_style = compart_type["concatStyle"];

	var res = [];

	compart_tree[compart_type["label"]] = {};
	var sub_compart_tree = compart_tree[compart_type["label"]];

	var sub_compartments = [];
	_.each(sub_compart_types, function(sub_compart_type, i) {

		var sub_sub_compart_types = sub_compart_type["subCompartmentTypes"];
		if (sub_sub_compart_types.length == 0) {

			var input_value, mapped_value;		
			var input_control = parent.find("." + sub_compart_type["_id"]);
			if (input_control.hasClass("dialog-input")) {
				input_value = input_control.val();
			}

			else if (input_control.hasClass("textarea")) {
				input_value = input_control.val();
			}

			else if (input_control.hasClass("dialog-selection")) {
				var selected = input_control.find("option:selected");
				input_value = selected.text();
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

				var elem_style_id, compart_style_id;
				if (input_value) {
					mapped_value = input_control.attr("trueValue");
					elem_style_id = input_control.attr("trueElementStyle");
					compart_style_id = input_control.attr("trueCompartmentStyle");
				}
				else {
					mapped_value = input_control.attr("falseValue");
					elem_style_id = input_control.attr("falseElementStyle");
					compart_style_id = input_control.attr("falseCompartmentStyle");				
				}
			}
				
			var value = build_compartment_value(sub_compart_type, input_value, mapped_value);
			sub_compart_tree[sub_compart_type["label"]] = {value: value, input: input_value};
			res.push(value);
		}
		
		else {

			var val = build_sub_compartment_tree(parent, sub_compart_type, sub_compart_tree);
			if (val) {

				if (sub_compart_type["prefix"])
					val = sub_compart_type["prefix"] + val;

				if (sub_compart_type["suffix"])
					val = val + sub_compart_type["suffix"];
			}

			res.push(val);
	
		}

		//if there are more then one compartment; checking the last compartment
		if (len > 1 && i < len-1)
			res.push(concat_style);

	});

	return res.join("");
}


render_dialog_fields = function(compart_type, compartment) {

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

		if (!is_editor_in_edit_mode_reactive()) {
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

							call_meteor_method("getFileUrl", list, function(url) {

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
}

//helpers
Template.dialog.helpers({

	tabs: function() {

		var tabs;

		//selecting element's tabs
		if (Session.get("activeElementType")) {
			var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
			if (elem_type) {
				tabs = DialogTabs.find({elementTypeId: elem_type["_id"]}, {sort: {index: 1}});
			}
		}

		//selecting diagram's tabs
		else {
			var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
			if (diagram) {
				tabs = DialogTabs.find({diagramTypeId: diagram["diagramTypeId"],
										elementTypeId: {$exists: false}},
										{sort: {index: 1}});
			}
		}

		if (!tabs) {
			return;
		}

		var isOpen = true;
		return tabs.map(function(tab) {

			var tab_id = tab["_id"];
			var type = tab["type"];

			if (isOpen) {
				tab["isOpen"] = true;
				isOpen = false;
			}

			//if there is specified the type, then uses the existing template
			if (type) {
				tab["templateId"] = type;
			}

			else {

				//if there is no template, then compiles it
				if (!Template[tab_id]) {
					define_dialog_tab_template(tab_id);
				}

				//adds template id
				tab["templateId"] = tab_id;	
			}

			return tab;
		});
	},

});


//Generating new dialog templates
function define_dialog_tab_template(id) {

	var template_structure = '{{> Template.dynamic template="dialogTabContent" data=compart_types}}';

	compileTemplate(id, template_structure);
}

function compileTemplate(name, html_text) { 
    try { 
        var compiled = SpacebarsCompiler.compile(html_text, {isTemplate: true}); 
        var renderer = eval(compiled);
        UI.Template.__define__(name, renderer);

        add_template_helpers(name);
    } 

    catch (err){ 
        console.error('Error compiling template:' + html_text); 
        console.error(err.message); 
    } 
}; 

function add_template_helpers(id) {

	//helpers
	Template[id].helpers({

		compart_types: function() {

			return CompartmentTypes.find({dialogTabId: id}, {sort: {tabIndex: 1}}).map(
				function(compart_type) {
					var compartment = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: Session.get("activeElement")});

					var is_visible = check_compartment_visibility(compart_type, compartment);
					if (is_visible) {
						return Dialog.renderDialogFields(compart_type, compartment);
					}
			});
		},

	});
}



function check_compartment_visibility(compart_type, compartment) {
	var is_visible = true;
	var extension_point_name = "isVisible";

	var is_visible_extension_point = _.find(compart_type.extensionPoints, function(extension_point) {
										return extension_point.extensionPoint == extension_point_name;
									});

	if (is_visible_extension_point) {
		is_visible = Interpreter.executeExtensionPoint(compart_type, extension_point_name, [compartment]);
	}

	return is_visible;
}



function update_compartment_from_sub_fields(parent) {

	var compart_type_id = parent.attr("id");

	var compart_type = CompartmentTypes.findOne({_id: compart_type_id});
	if (!compart_type) {
		return;
	}

	var sub_compart_tree = {};
	var res = Dialog.buildSubCompartmentTree(parent, compart_type, sub_compart_tree);

	var src_id = parent.attr("compartmentId");
	var input = res;
	var value = input;

	var compart_style, elem_style;

	Dialog.updateCompartmentValue(compart_type, input, value, src_id, compart_style, elem_style, sub_compart_tree);
}


function upsert_compartment_value(e, src_id, src_val, mapped_value, elemStyleId, compartStyleId) {

	//selecting the compartment type
	var compart_type_id = $(e.target).closest(".compart-type").attr("id");
	var compart_type = CompartmentTypes.findOne({_id: compart_type_id});

	if (!compart_type) {
		return; 
	}

	Interpreter.executeExtensionPoint(compart_type, "beforeUpdate", [src_id, src_val]);
	var update_res = Interpreter.executeExtensionPoint(compart_type, "update", [src_id, src_val, mapped_value, elemStyleId, compartStyleId]) || {};

	//after
	var after_update = Interpreter.getExtensionPointProcedure("afterUpdate", compart_type);
	if (after_update) {
		var params = {compartmentType: compart_type,
						compartmentId: src_id,
						input: update_res["input"],
						value: update_res["value"],
					};

		Interpreter.execute(after_update, [params], compart_type);

	}

	$(e.target).val();
}

