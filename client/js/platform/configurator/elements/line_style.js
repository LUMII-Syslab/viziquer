
Template.lineStyle.helpers({

	is_ajoo_editor: function() {
		var editor_type = Interpreter.getEditorType();
		if (is_ajoo_editor(editor_type))
			return true;
		else
			return;
	},

});

Template.lineObjectStyle.helpers({
	elem: function() {
		return Configurator.getActiveElementStyleProperties();
	},
});

Template.lineObjectStyle.events({

	'blur .dialog-input' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromInput(e);
		return false;
	},

});

Template.lineObjectStyle.rendered = function() {
	Dialog.addColorPicker();
}

Template.startShapeStyle.helpers({
	startShape: function() {
		return get_line_shape("startShapeStyle");
	},
});

Template.startShapeStyle.events({
	
	'blur .dialog-input' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromInput(e, "startShapeStyle");
		return false;
	},

	'change .dialog-selection' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromSelection(e, "startShapeStyle");
		return false;		
	},

});

Template.startShapeStyle.rendered = function() {
	Dialog.addColorPicker();
}

Template.endShapeStyle.helpers({
	endShape: function() {
		return get_line_shape("endShapeStyle");
	},
});

Template.endShapeStyle.events({

	'blur .dialog-input' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromInput(e, "endShapeStyle");
		return false;
	},

	'change .dialog-selection' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromSelection(e, "endShapeStyle");
		return false;		
	},
});

Template.endShapeStyle.rendered = function() {
	Dialog.addColorPicker();
}

Template.lineObjectZoomChartStyle.helpers({

	line_style: function() {
		var elem_style = Configurator.getActiveElementStyleProperties();

		if (!elem_style) {
			return;
		}

		elem_style["dashes"] = [{option: "false"}, {option: "true"}];

		var dashed = "false";
		if (elem_style["dashed"]) {
			dashed = "true";
		}

		Configurator.selectItem(elem_style["dashes"], dashed);

		elem_style["fromDecorations"] = [{option: "", value: "--No style--"},
											{option: "circle", value: "circle"},
											{option: "arrow", value: "arrow"},
										];

		Configurator.selectItem(elem_style["fromDecorations"], elem_style["fromDecoration"]);

		elem_style["toDecorations"] = [{option: "", value: "--No style--"},
											{option: "circle", value: "circle"},
											{option: "arrow", value: "arrow"},
										];
										
		Configurator.selectItem(elem_style["toDecorations"], elem_style["toDecoration"]);

		elem_style["directions"] = [{option: "D"}, {option: "U"}, {option: "R"}, {option: "L"}];
		Configurator.selectItem(elem_style["directions"], elem_style["direction"]);

		return elem_style;
	},

});

Template.lineObjectZoomChartStyle.events({

	'blur .dialog-input' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromSelection(e, "elementStyle");
		return;
	},

	'change .dialog-selection' : function(e) {
		e.preventDefault();
		Configurator.updateElementStyleFromSelection(e, "elementStyle");
		return;		
	},

});

Template.lineObjectZoomChartStyle.rendered = function() {
	Dialog.addColorPicker();
}

function get_line_shape(style_name) {

	var style;

	var elem_id = Session.get("activeElement");
	var elem_type = ElementTypes.findOne({elementId: elem_id});
	if (elem_type) {
		var styles = elem_type["styles"];
		if (styles) {
			var index = Configurator.getActiveElementStyleIndex();
			style = styles[index];
		}
	}
	else {
		var element = Elements.findOne({_id: elem_id});
		if (element) {
			style = element["style"];
		}
		else
			return;
	}

	if (style) {
		var shape_style = style[style_name];

		if (!shape_style)
			return;

		//selecting line's end shape
		var shape = shape_style["shape"];
		var shapes = [	
						{option: "None"},
						{option: "Arrow"},
						{option: "Circle"},	
						{option: "Diamond"},
						{option: "Triangle"},
					];
		Configurator.selectItem(shapes, shape);
		shape_style["shapes"] = shapes;

		//selecting fill priorties
		var fill_priority = shape_style["fillPriority"];
		var priorities = fill_priorities();
		Configurator.selectItem(priorities, fill_priority);
		shape_style["fillPriority"] = priorities;

		return shape_style;
	}
}
