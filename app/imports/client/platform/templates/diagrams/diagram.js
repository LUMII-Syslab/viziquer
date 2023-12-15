import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'
import { is_system_admin } from '/libs/platform/user_rights'
import { Diagrams, Elements, ElementsSections, DiagramTypes, ElementTypes, Sections, Documents, Users } from '/libs/platform/collections'

import './diagram.html'

Interpreter.methods({

	UpdateDiagram: function(obj_id, list) {
		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");

		return {serverMethod: "updateDiagram"};
	},

});

_.extend(Interpreter, {

	createEditor: function() {

		if ($("#Diagram_Editor").length == 0) {
			console.error("Error: no container")
			return;
		}

		var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
		if (!diagram) {
			console.error("Error: no diagram")
			return;
		} else {
			Interpreter.destroyErrorMsg();
		}

		//selecting an editor type
		var editor_type = diagram["editorType"];
		Session.set("editorType", editor_type);

		//loading an editor
		var editor = Interpreter.loadAjooEditor(diagram);

		Interpreter.editor = editor;

		return editor;
	},

});

Template.noDiagramTemplate.helpers({

	diagram_type: function() {
		return {diagram_size: 10,
				dialog_size: 2,
				is_ajoo_editor: false
			};
	},

})

//Start of sections template

Template.diagramTemplate.onRendered(function() {
	// $("#lockDiagram").trigger("click");

	// YASQE.registerAutocompleter('customClassCompleter', customClassCompleter);
	// YASQE.registerAutocompleter('customPropertyCompleter', customPropertyCompleter);
	// YASQE.defaults.autocompleters = ['customClassCompleter', "customPropertyCompleter", "variables"];

	if (Session.get("editMode")) {
		set_locked_diagram();
	}

});


Template.diagramTemplate.helpers({

	isReady: function() {
		return FlowRouter.subsReady("Diagram_Palette_ElementType");
	},

	plain: function() {
		return Session.get("plain");
	},

	diagram_type: function() {
		var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
		if (!diagram_type) {
			return;
		}

		var header = diagram_type.header;
		var footer = diagram_type.footer;

		if (diagram_type["size"]) {

			return {diagram_size: diagram_type["size"]["diagramSize"],
					dialog_size: diagram_type["size"]["dialogSize"],
					is_ajoo_editor: true,
					header: header,
					footer: footer,
				};
		}

		else {
			return {diagram_size: 10,
					dialog_size: 2,
					is_ajoo_editor: true,
					header: header,
					footer: footer,
				};
		}
	},

	templates: function() {

		var templates = [];

		var get_templates = function(arr) {
			_.each(arr, function(item) {
				if (item.template) {
					templates.push({templateId: item.template});
				}
			});
		}

		var diagram_type = DiagramTypes.findOne();
		if (diagram_type) {

			get_templates(diagram_type.toolbar);
			get_templates(diagram_type.readModeToolbar);

			//contextMenu
			get_templates(diagram_type.noCollectionContextMenu);
			get_templates(diagram_type.collectionContextMenu);

			get_templates(diagram_type.readModeCollectionContextMenu);
			get_templates(diagram_type.readModeNoCollectionContextMenu);

			//keystrokes
			get_templates(diagram_type.noCollectionKeyStrokes);
			get_templates(diagram_type.collectionKeyStrokes);

			get_templates(diagram_type.readModeCollectionKeyStrokes);
			get_templates(diagram_type.readModeNoCollectionKeyStrokes);

			ElementTypes.find().forEach(function(elem_type) {

				//contextMenu
				get_templates(elem_type.contextMenu);
				get_templates(elem_type.readModeContextMenu);

				//keystrokes
				get_templates(elem_type.keyStrokes);
				get_templates(elem_type.readModeKeyStrokes);
			});
		}

		return templates;
	},

});


Template.editingMessage.helpers({

	editing: function() {
		var user_id = Session.get("userSystemId");
		if (Utilities.isEditable() || is_system_admin(user_id)) {
			var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});

			//diagram is being edited
			// if (diagram && diagram["editingUserId"] && !diagram.isPublic) {
			if (diagram && diagram["editingUserId"] && !diagram.isPublic) {

				//diagram is being edited by someone else
				if (diagram["editingUserId"] != user_id) {

					var res = {isEdited: true};

					var user = Users.findOne({systemId: diagram["editingUserId"]});
					if (user) {
						res["userName"] = user["name"] + " " + user["surname"];
					}

					remove_sections_sortable();
					return res;
				}

				//diagram is being edited by the user
				else {
					make_sections_sortable();
					return {unLockButton: true};
				}
			}

			//diagram is not being edited
			else {

				console.log("ccc")

				remove_sections_sortable();
				return {lockingButton: true};
			}
		}
	},

});


Template.editingMessage.events({

	"click #lockDiagram": function(e) {
		e.preventDefault();
		set_locked_diagram();
	},

	"click #unLockDiagram": function(e) {
		e.preventDefault();

		Session.set("editMode", reset_variable());

		var list = {diagramId: Session.get("activeDiagram"),
					versionId: Session.get("versionId")};

		if (DiagramTypes.findOne({diagramId: Session.get("activeDiagram")})) {
			list["toolId"] = Session.get("toolId");
		}

		else {
			list["projectId"] = Session.get("activeProject");
		}

		var editor = Interpreter.editor;
		editor.isEditing = reset_variable();

		Utilities.callMeteorMethod("removeLocking", list);

		return;
	},

});


Template.sectionsTemplate.helpers({

	sections: function() {

		var dialog = $("#compartment-forms").first();
		var new_width = dialog.width();

		return ElementsSections.find({elementId: Session.get("activeElement")},
									{sort: {index: 1}}).map(
			function(elem_sec) {
				var item = {};

				item["_id"] = elem_sec["_id"];
				item["documentId"] = elem_sec["documentId"];

				var section = Sections.findOne({_id: elem_sec["sectionId"]});
				if (section) {
					//var html = transform_html(section["text"], new_width);
					var html = section["text"];
					item["text"] = html;
				}

				if (Session.get("editMode"))
					item["sectionsEdit"] = true;

				//sets document name
				var doc_id = elem_sec["documentId"];
				var doc = Documents.findOne({_id: doc_id});
				if (doc) {
					item["documentName"] = doc["name"];
				}

				item["projectId"] = Session.get("activeProject");
				item["versionId"] = Session.get("versionId");
				item["index"] = elem_sec["index"];

				return item;
			});
	},

	editMode: function() {
		return Session.get("editMode");
	},

	addSectionsEnabled: function() {
		if (Session.get("activeElement")) {
			return true;
		}
		else {
			return false;
		}
	},

	editable: function() {
		return Utilities.isAdmin();
	},

});

Template.sectionsTemplate.events({

//removes section attachment to the element
	'click .removeSection' : function(e, templ) {
		e.preventDefault();

		var src = $(e.target);
		var elem_section_id = src.closest('.section-item').attr("id");

		var list = {id: elem_section_id,
					projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
				};

		Utilities.callMeteorMethod("removeSectionToElement", list);

		return false;
	},

//opens element and section mapping dialog
	'click #addSections' : function(e, templ) {

		//sets default selection
		$('#modalDocument').prop('selectedIndex', 0);

		$("#add-sections-form").modal("show");
	},

});

Template.sectionsTemplate.onRendered(function() {

	if (Interpreter.editor.isEditMode()) {
		make_sections_sortable();
	}
});

//End of sections template

Template.addSectionsForm.onRendered(function() {
	var screen_height = 0.85 * $(window).height();

	$(".add-sections-content").css({height: screen_height});
});


Template.addSectionsForm.events({
	'click #modalCloseButton' : function(e) {
		Session.set("activeDocument", reset_variable())
		Session.set("documentSections", Utilities.resetQuery());
	},
})


// // Start of diagram editor
// Template.diagramEditor.helpers({

// 	//THIS is HACK
// 	elements: function() {
// 		var editor_type = Interpreter.getEditorType();
// 		if (is_zoom_chart_editor(editor_type)) {

// 			var elems = Elements.find({isInVisible: {$ne: true}});

// 			var chart = Interpreter.editor;
// 			if (!chart) {
// 				return elems.count();
// 			}

// 			var editor_node_ids = {};
// 			_.each(get_zoomchart_nodes(), function(elem, id) {
// 				editor_node_ids[id] = true;
// 			});

// 			var editor_link_ids = {};
// 			_.each(get_zoomchart_links(), function(elem, id) {
// 				editor_link_ids[id] = true;
// 			});

// 			var diagram_type = DiagramTypes.findOne({_id: Session.get("diagramType")});
// 			if (diagram_type && !is_ajoo_editor(diagram_type["editorType"])) {

// 				var nodes = [];
// 				var links = [];

// 				elems.forEach(function(elem) {

// 					var id = elem["_id"];

// 					if (editor_node_ids[id]) {
// 						editor_node_ids[id] = false;
// 						return;
// 					}

// 					if (editor_link_ids[id]) {
// 						editor_link_ids[id] = false;
// 						return;
// 					}

// 					if (elem["type"] == "Box") {
// 						build_zoom_chart_node(id, elem, nodes);
// 					}

// 					else if (elem["type"] == "Line") {
// 						build_zoom_chart_link(id, elem, links);
// 					}
// 				});

// 				var data = {nodes: nodes, links: links};
// 				chart.addData(data);

// 				//data to remove
// 				var nodes_to_remove = [];
// 				_.each(editor_node_ids, function(node_val, node_id) {

// 					if (node_val) {
// 						nodes_to_remove.push({id: node_id});
// 					}
// 				});

// 				var links_to_remove = [];
// 				_.each(editor_link_ids, function(link_val, link_id) {

// 					if (link_val) {
// 						links_to_remove.push({id: link_id});
// 					}
// 				});

// 				var data_to_remove = {nodes: nodes_to_remove, links: links_to_remove};
// 				chart.removeData(data_to_remove);

// 				var active_element_id = Session.get("activeElement");
// 				if (editor_node_ids[active_element_id] || editor_link_ids[active_element_id]) {
// 					Interpreter.resetActiveElement();
// 				}

// 				return elems.count();
// 			}
// 		}
// 	},
// });


var is_mouse_down = false;

Template.diagramEditor.events({

	"mouseover #horizontal-line": function(e) {
		$obj = $(e.target);
		$obj.css('cursor', 'ns-resize');
	},

	"mouseout #horizontal-line": function(e) {
		if (!is_mouse_down) {
			$obj = $(e.target);
			$obj.css('cursor', 'initial');
		}
	},

	"mousedown #horizontal-line": function(e) {
		is_mouse_down = true;
	},

});


Template.diagramEditor.onRendered(function() {

	Session.set("editingDialog", reset_variable());

	//a hack to register keydowns for the editor
    $('body').on('keydown', function(e) {
    	Interpreter.processKeyDown(e);
    });

    $('.padding-md').on('mousemove', function(e) {
    	if (is_mouse_down) {

    		var new_height = e.pageY - Math.round($("#ajoo_scene").offset().top);

    	    $("#ajoo_scene").height(new_height);
    	    $("#ajoo_palette").height(new_height);
    	    editor.size.setSize(editor.size.state.width, new_height);
    	}
    });

    $('.padding-md').on('mouseup', function(e) {
		is_mouse_down = false;
    });


    //adding the graphical editor
	var editor = Interpreter.createEditor();
	if (!editor) {
		console.error("Error: no editor");
		return;
	}

	var editor_type = Interpreter.getEditorType();

	Interpreter.renderAjooEditorDiagram(editor, this);
	// editor.switchEditMode();

	//computing edit mode
	var edit_mode = Diagrams.find({$or: [{editingUserId: Session.get("userSystemId")}, {isPublic: true,}]}).observeChanges({

		added: function(id, fields) {
			Session.set("editMode", true);

			// if (is_ajoo_editor(editor_type)) {
				editor.switchEditMode();
			// }
		},

		removed: function(id) {

			Session.set("editMode", reset_variable());
			// if (is_ajoo_editor(editor_type)) {
			editor.switchReadMode();
			// }
		},

	});

	this.editMode = new ReactiveVar(edit_mode);
});

Template.diagramEditor.onDestroyed(function() {

	//console.log("on destroy diagram editor")


	var list = {diagramId: Session.get("activeDiagram")};
	Utilities.addingProjectOrToolParams(list);

	var editor = Interpreter.editor;

	if (this.editMode) {
		var edit_mode = this.editMode.get();
		edit_mode.stop();
	}

	var editor_type = Interpreter.getEditorType();
	if (is_ajoo_editor(editor_type)) {

		var palette_handle = this.paletteHandle.get();
		palette_handle.stop();

		var diagram_handle = this.diagramHandle.get();
		diagram_handle.stop();

		var elem_handle = this.elementHandle.get();
		elem_handle.stop();

		var compart_handle = this.compartmentHandle.get();
		compart_handle.stop();

		var elem_type_handle = this.elementTypeHandle.get();
		elem_type_handle.stop();

		var diagram_type_handle = this.diagramTypeHandle.get();
		diagram_type_handle.stop();


		//if the diagram was in edit mode, then refreshing the diagram image
		if (Session.get("edited")) {
			canvas_to_image(list);
		}

		//if the diagram can be edited by the user
		if (Utilities.isEditable()) {

			//checking if someone is not already editing
			var diagram = Diagrams.findOne({_id: list["diagramId"]});
			if (diagram && diagram["editingUserId"] == Session.get("userSystemId")) {

				//unlocking the diagram
				Utilities.callMeteorMethod("removeLocking", list);
			}
		}

		editor.stage.destroy();
	}

	else if (is_zoom_chart_editor(editor_type)) {

		var elem_handle = this.elementHandle.get();
		elem_handle.stop();

		var compart_handle = this.compartmentHandle.get();
		compart_handle.stop();

		if (Session.get("edited")) {
			zoom_chart_canvas_to_image(editor, list);
		}

		editor.remove();
	}

	else {
		console.error("Error: no editor type");
	}

	update_seen_count(list);

	//unbinds keydown of body
	$('body').unbind("keydown");

	Session.set("editorType", reset_variable());

	//reseting editor's variable
	Interpreter.ediotr = reset_variable();

	_EDITOR = reset_variable();

	Session.set("editMode", reset_variable());
	Session.set("editingDialog", reset_variable())
	Session.set("edited", reset_variable());
	Session.set("activeDiagram", reset_variable());
	Session.set("activeElement", reset_variable());

	Session.set("activeElementType", reset_variable());
	Session.set("documentSections", reset_variable());
	Session.set("activeDocument", reset_variable());
	Session.set("diagramType", reset_variable());
	Session.set("logsCount", reset_variable());

	Session.set("toolId", reset_variable());
	Session.set("targetDiagramType", reset_variable());
	Session.set("toolVersionId", reset_variable());

});

// End of diagram editor

//selects sections that are not linked to the active element to display in mapping dialog
Template.docSections.helpers({

	documentSections: function() {
		var sections_ids = get_element_section_ids();

		Session.set("sections", {sectionCollection: sections_ids,
								projectId: Session.get("activeProject"),
								versionId: Session.get("versionId")});

		var new_width = $("#sections-dialog").width();

		return Sections.find({documentId: Session.get("activeDocument"), _id: {$nin: sections_ids}});
	},
});

Template.docSections.events({

//adds section to the list
	'click .sectionAddRemove' : function(e, templ) {
		e.preventDefault();
		var src = $(e.target);

	//saves changes for database
		var section = src.closest(".modal-section")
		var section_id = section.attr("id");

		var elem_id = Session.get("activeElement");

		var index = ElementsSections.find({elementId: elem_id}).count() + 1;

		var list = {projectId: Session.get("activeProject"),
					versionId: Session.get("versionId"),
					sectionId: section_id,
					elementId: elem_id,
					diagramId: Session.get("activeDiagram"),
					documentId: Session.get("activeDocument"),
					index: index,
				};

		Utilities.callMeteorMethod("addSectionToElement", list);
	},
});

/* End of doc sections */

/* Start of sections from drop down */

Template.sectionsFormDropDown.helpers({
	documents: function() {
		return Documents.find({});
	},
});

Template.sectionsFormDropDown.events({

	'change #modalDocument' : function(e) {
		var option = $("select#modalDocument option:selected");
		var id = option.attr("id");

		Session.set("activeDocument", id);
		Session.set("documentSections", {projectId: Session.get("activeProject"),
										versionId: Session.get("versionId"),
										id: Session.get("activeDocument")});
	},
})

/* End of sections from drop down */

Template.errorMessages.helpers({

	error_msg: function() {
		return Session.get("errorMsg");
	},

});


//Functions
function get_element_section_ids() {
	return ElementsSections.find({elementId: Session.get("activeElement")}).map(
		function(elem_sec) {
			return elem_sec["sectionId"];
		});
}

function get_active_element_style_property(property) {
	var element = Elements.findOne({_id: Session.get("activeElement")});
	if (element && element["style"]) {
		return element["style"][property];
	}
}

function update_seen_count(list) {
	Utilities.callMeteorMethod("updateDiagramsSeenCount", list);
}

function make_sections_sortable() {

	var current_elem_sec_id;
    $("#sections").sortable({
        items: ".section-item",
       // distance: 3,

       	//selecting the dragged elem-section id
        start: function(event, ui) {

        	var el = $(ui.item);
        	current_elem_sec_id = el.closest(".section-item").attr("id");
        },

        stop: function(event, ui) {

         	var el = $(ui.item[0]);
			if (el.hasClass("section-item")) {

				//selecting the before elem-sec index
	        	var before = ui.item.prev().get(0);
	        	var prev_index = -1;
	        	if (before)
	        		prev_index = $(before).attr("index");

	        	//update
	           	var params = {prevIndex: Number(prev_index),
		    				currentIndex: Number(el.attr("index")),

		    				elementSectionId: current_elem_sec_id,
		    				projectId: Session.get("activeProject"),
		    				versionId: Session.get("versionId"),
		    				diagramId: Session.get("activeDiagram"),
		    			};

	        	Utilities.callMeteorMethod("reoredrSectionToElement", params);
	        }

        },
    });
}

function remove_sections_sortable() {
	 $("#sections").sortable("destroy");
}

function canvas_to_image(list_in, quality) {

	var editor = Interpreter.editor;
	var stage = editor.stage;
	if (!stage) {
		return;
	}

	quality = quality || 0.5;

	//hiding the palette
	editor.palette.hide();

	//unselecting all selected elements
	editor.unSelectElements();

	//refreshing layers
	var shapes_layer = editor.getLayer("ShapesLayer");

	var background_rect = new Konva.Rect({x: 0, y: 0,
										width: stage.getWidth(),
										height: stage.getHeight(),
										fill: $(stage.container()).css("background-color"),
									});

	var swimlane_layer = editor.getLayer("SwimlaneLayer");
	if (swimlane_layer) {

		swimlane_layer.add(background_rect);
		background_rect.moveToBottom();

		swimlane_layer.draw();
	}

	else {
		shapes_layer.add(background_rect);
		background_rect.moveToBottom();
	}

	shapes_layer.draw();

	var drag_layer = editor.getLayer("DragLayer");
	drag_layer.draw();

	editor.removeGrid();

	stage.toDataURL({
        mimeType: "image/jpeg",
        quality: quality,
        callback: function(data_url) {

        	list_in["attrName"] = "imageUrl";
        	list_in["attrValue"] = data_url;

        	Utilities.callMeteorMethod("updateDiagram", list_in);
		}
    });
}

function zoom_chart_canvas_to_image(chart, list) {

	if (!chart) {
		console.log("Error in zoom chart canvas to image: no editor");
		return;
	}

	var data_url = chart.exportImageAsString(".gif", 2, 1);

	list["id"] = list["diagramId"];
	list["attrName"] = "imageUrl";
	list["attrValue"] = data_url;

	Utilities.callMeteorMethod("updateDiagram", list);
}


function set_locked_diagram() {

	Session.set("editMode", true);
	Session.set("edited", true);

	var list = {diagramId: Session.get("activeDiagram"),
				versionId: Session.get("versionId")};

	if (DiagramTypes.findOne({diagramId: Session.get("activeDiagram")})) {
		list["toolId"] = Session.get("toolId");
	}

	else {
		list["projectId"] = Session.get("activeProject");
	}

	Utilities.callMeteorMethod("lockingDiagram", list);

	var editor = Interpreter.editor;
	if (editor) {
		editor.isEditing = Session.get("userSystemId");
	}

}
