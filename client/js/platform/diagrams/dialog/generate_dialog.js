
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


	'input .dialog-combobox' : function(e) {

		e.stopPropagation();

		var src = $(e.target).closest(".dialog-combobox");
		var parent = src.closest(".parent-compartment");

		if (parent.length > 0) {
			update_compartment_from_sub_fields(parent);
		}

		else {
			var src_id = src.attr("id");
			var src_val = src.val();
			var mapped_value = src.attr("mappedValue");			

			var elem_style_id = src.attr("elementStyleId");
			var compart_style_id = src.attr("compartmentStyleId");

			upsert_compartment_value(e, src_id, src_val, mapped_value, elem_style_id, compart_style_id);
		}

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

		$("#upload-file-form").modal("hide");

  		var meta_context = {projectId: Session.get("activeProject"),
  							versionId: Session.get("versionId"),
  						};	

		var file_list = $("#fileToUpload")[0].files;

        _.each(file_list, function(file_in) {

         	var file = new FS.File(file_in);
          	file.userId = Session.get("userSystemId");
          	_.extend(file, meta_context);

			var fileObj = FileObjects.insert(file);

	  		var list = {projectId: Session.get("activeProject"),
	  					versionId: Session.get("versionId"),
	  					fileId: fileObj._id,
	  					fullName: fileObj.data.blob.name,
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
	  	});

	},

});

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
					return Dialog.renderDialogFields(compart_type, compartment);
			});
		},

	});
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
}

