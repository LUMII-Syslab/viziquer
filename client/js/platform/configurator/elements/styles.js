
// Start of style

Template.configuratorElementStyleAccordion.helpers({
	box: function() {
		var elem = Elements.findOne({_id: Session.get("activeElement")});
		if (elem) {
			if (elem["type"] == "Box") {
				return true;
			}
		}
	},
});

Template.elementStyleDropDown.helpers({
	elementStyles: function() {
		var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		if (elem_type) {
			var index = Configurator.getActiveElementStyleIndex();

			return _.map(elem_type["styles"], function(style, i) {
				style["index"] = i;			
				if (index === i) {
					style["selected"] = "selected";
				}

				return style;
			});
		}
	},
});

Template.elementStyleDropDown.destroyed = function() {
	Session.set("activeStyleIndex", reset_variable());
}

Template.elementTypeStyles.helpers({
	is_remove: function() {
		if (Session.get("activeStyleIndex") == 0)
			return "disabled";
	},
});

Template.elementTypeStyles.events({

	'change #elementStyle' : function(e) {
		var src = $(e.target);
		var item = Dialog.getSelectionItem(src);
		var index = item.attr("index");

		Session.set("activeStyleIndex", index);

		apply_selected_style(index);
	},

	'click #add-element-type-style' : function(e) {
		$("#element-style-form").modal("show");
	},

	'click #edit-element-type-style' : function(e) {
		Session.set("elementStyleEdit", true);
		$("#element-style-form").modal("show");		
	},

	'click #delete-element-type-style' : function(e) {
		var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		if (elem_type) {
			var id = elem_type["_id"];
			
			var selection = $("#elementStyle");
			var item = Dialog.getSelectionItem(selection);
			var index = item.attr("index");

			var styles = elem_type["styles"];
			styles.splice(index, 1);				

			var list = {id: id,
						toolId: Session.get("toolId"),
						attrName: "styles",
						attrValue: styles,
					};

			update_element_type(list);

			Session.set("activeStyleIndex", index-1);
		}
	},	

});

Template.elementStyleModal.helpers({
	dialog: function() {

		var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		if (!elem_type) {
			return;
		}

		else {
			var styles = elem_type["styles"];
			var index = Configurator.getActiveElementStyleIndex();
			if (styles && styles[index]) {

				return {
					edit: Session.get("elementStyleEdit"),
					name: styles[index]["name"],
				};
			}
		}
	},
});

Template.elementStyleModal.events({

	'click #ok-element-style' : function(e) {

		var name = $("#element-style-name").val();
		$("#element-style-form").modal("hide");

		var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
		if (!elem_type) {
			return;
		}

		var elem_type_id = elem_type["_id"];	

		var list = {id: elem_type_id,
					editorType: Interpreter.getEditorType(),
					name: name,
					toolId: Session.get("toolId"),
				};

		//if editing element style name
		if (Session.get("elementStyleEdit")) {
			list["styleIndex"] = Configurator.getActiveElementStyleIndex();

			list["attrName"] = "styles." + list["styleIndex"] + ".name";
			list["attrValue"] = name;

			update_element_type(list);
		}

		//if creating a new style
		else {
			if (elem_type["type"] == "Box") {		
				list["type"] = "Box";
			}

			else {
				list["type"] = "Line";
			}

			list["name"] = name;

			//setting the active style index
			var element_type = ElementTypes.findOne({_id: elem_type_id});
			if (element_type && element_type["styles"]) {
				Session.set("activeStyleIndex", element_type["styles"].length);
			}

			Utilities.callMeteorMethod("addElementTypeStyle", list);
		}
	},

	'hidden.bs.modal #element-style-form' : function(e) {
		Session.set("elementStyleEdit", reset_variable());
	},

});

function update_element_type(list) {
	Utilities.callMeteorMethod("updateElementType", list);
}

function apply_selected_style(index) {

	var elem_id = Session.get("activeElement");
	if (elem_id) {

		var selection_elems = get_selection_elements();
		if (selection_elems && selection_elems.length == 1) {

			var elem_type = ElementTypes.findOne({elementId: elem_id});
			if (!elem_type || !elem_type["styles"] || !elem_type["styles"][index]) {
				return;
			}

			var style_obj = elem_type["styles"][index];
			var kinetic_obj = selection_elems[0];

			set_element_style(kinetic_obj, style_obj);

			if (elem_type["type"] == "Box") {
				kinetic_obj.draw();
			}
			else {
				var shapes_layer = get_shapes_layer();
				shapes_layer.draw();
			}

		}
	}
}
