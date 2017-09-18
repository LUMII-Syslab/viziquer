
Palette = function(editor, palette_obj) {

	var palette = this;

	palette.editor = editor;
	palette.state = {};
	palette.selectedId = undefined;

	var palette_settings = {};
	if (palette_obj && palette_obj.settings)
		palette_settings = palette_obj.settings;

	palette.distanceBetweenButtons = palette_settings.padding || 3;

	var default_width = 40;
	var default_height = 30;

	var width = palette_settings.width || default_width;
	var height = palette_settings.height || default_height;

	//buttons size should be atleast default_width x default_height
	palette.width = Math.max(width, default_width);
	palette.height = Math.max(height, default_height);

	palette.buttonWidth = palette.width - 2 * palette.distanceBetweenButtons;
	palette.buttonHeight = palette.height;

	palette.x = palette.distanceBetweenButtons;
	//palette.x = 0;
	palette.y = 0;

    //adding palette div
    var palette_html = "<div id=" + editor.paletteContainerName + " style='float: left;width:" + palette.width + "px;'></div>";
    $("#" + editor.containerName).append(palette_html);


    var paletteStage = new Konva.Stage({container: editor.paletteContainerName,
                                        width: palette.width ,
                                        height: editor.height,
                                        });

    editor.paletteStage = paletteStage;
    

	//adding palette layer
	var palette_layer = new Konva.Layer();
		palette_layer["name"] = "PaletteLayer";

	var palette_stage = editor.paletteStage;
	palette_stage.add(palette_layer);

    if (!editor.isEditMode()) {
    	palette.hide();
    }

    palette.paletteLayer = palette_layer;

    palette.buttons = [];

	return palette;
}


Palette.prototype = {

	add: function(palette_buttons, is_no_refresh) {

		var palette = this;
		var editor = palette.editor;

		//palette button location and size properties
		var x = palette.x;
		var y = palette.y;

		var height = palette.height;
		var distance_between_buttons = palette.distanceBetweenButtons;

		var button_count = palette.buttons.length;

		palette.buttons = _.map(palette_buttons, function(palette_button, index) {

			//adding index
			palette_button["index"] = button_count + index;

			//computing the button position
			palette_button["x"] = x;
			palette_button["y"] = y + (height + distance_between_buttons) * index; 			

			//building button
			var button = new PaletteButton(palette);

			//rendering button
			button.add(palette_button);

			return button;
		});

		if (!is_no_refresh)
			editor.palette.refresh();

		return palette.buttons;
	},

	remove: function(is_refresh_needed) {

        var palette = this;

        //removing palette group elements
        var palette_layer = palette.paletteLayer;
        if (palette_layer)
            palette_layer.destroyChildren();

        //if needed, refreshing the layer 
        if (is_refresh_needed) {
            palette.refresh();
        }

        palette.state = {};
        palette.buttons = [];
	},

	hide: function() {
		var palette = this;
		var palette_layer = palette.paletteLayer;

    	//palette_layer.hide();

    	palette.editor.getPaletteContainer().css("display", "none");
	},

	show: function() {
		var palette = this;
		var palette_layer = palette.paletteLayer;

    	//palette_layer.show();
    	palette.editor.getPaletteContainer().css("display", "inline");
	},

	isPressed: function() {
		var palette = this;
		var state = palette.state;
		if (state.pressed)
			return true;
	},

	isLinePressed: function() {
		var palette = this;
		var palette_button = palette.getPressedButton();

		if (palette_button)
			return palette_button.type == "Line";
	},

	getPressedButton: function() {
		var palette = this;
		var state = palette.state;
		return state.pressedButton;
	},

	refresh: function() {
		var palette = this;
		palette.paletteLayer.batchDraw();
	},

}

PaletteButton = function(palette) {

	var paletteButton = this;

	paletteButton.palette = palette;

	var width = palette.buttonWidth;
	var height = palette.buttonHeight;

	//structure:
	//			-palette_layer
	//				- button_container
	//					-palette_button_rect
	//					-palette_button_shape
	//					-palette_button_overlay

	paletteButton.build_button_container = function(palette_layer, palette_button) {

		var button_container = new Konva.Group({x: palette_button["x"],
												y: palette_button["y"]});
			button_container["name"] = "PaletteButtonGroup";

		palette_layer.add(button_container);

		return button_container;
	}

	paletteButton.build_button_rect = function(button_container, palette_button) {

		//creates group for palette button
		var palette_button_id = palette_button["_id"];

		// palette button icon style
		var button_style = paletteButton.backgroundRectStyle();
		button_style["perfectDrawEnabled"] = false;
		button_style["listening"] = false;
		
		var palette_button_rect = new Konva.Rect(button_style);
			palette_button_rect["name"] = "ButtonRect";

		button_container.add(palette_button_rect);

		return palette_button_rect
	}

	paletteButton.backgroundRectStyle = function() {
		return {x: 0,
				y: 0,
				width: width,
				height: height,
			    stroke: "#ccc",
			    strokeWidth: 1,
			    cornerRadius: 3,
			    opacity: 1,
			    fill: "#fff",
			}
	}

	paletteButton.addBox = function(button_container, palette_button) {

		var paletteButton = this;

		var style = palette_button["style"];
		var elem_style = process_style_attributes(style["elementStyle"]);

		var x = 5;
		var y = 7;

		var button_width = width - 2 * x;
		var button_height = height - 2 * y;

		//draws palette icon
		var properties = {style: {elementStyle: elem_style},
							location: {
								width: button_width,
								height: button_height,
								x: x,
								y: y,
							},
						};

		var palette = paletteButton.palette;
		var editor = palette.editor;

		//This is a hack
		var image_src = elem_style.imageSrc;
		delete elem_style.imageSrc;

		var box = editor.elements.createShape(elem_style["shape"]);
		box.render(button_container, properties);

		if (image_src)
			box.renderAsImage(image_src);

		//recomputing the shape position for regular shapes
		if (box.isRegularPolygon) {

			var radius = button_width;
			var new_y = (height - radius) / 2;

			box.setElementPosition(x, new_y);
		}

		var palette_icon = box.presentation;
			palette_icon["name"] = "PaletteIcon";
	},

	paletteButton.addLine = function(button_container, palette_button) {

		var paletteButton = this;
		var palette = paletteButton.palette;

		var style = palette_button["style"];

		var elem_style = style["elementStyle"];
		elem_style["perfectDrawEnabled"] = false;
		elem_style["listening"] = false;
		if (elem_style) {
			if (elem_style["strokeWidth"])
				elem_style["strokeWidth"] = Math.sqrt(elem_style["strokeWidth"]);
		}

		var start_shape_style = style["startShapeStyle"];
		start_shape_style["perfectDrawEnabled"] = false;
		start_shape_style["listening"] = false;
		if (start_shape_style) {

			if (start_shape_style["radius"])
				start_shape_style["radius"] = compute_palette_line_end_shape_radius(start_shape_style["radius"]);

			if (start_shape_style["width"])
				start_shape_style["width"] = compute_palette_line_end_shape_radius(start_shape_style["width"]);

			if (start_shape_style["height"])
				start_shape_style["height"] = compute_palette_line_end_shape_radius(start_shape_style["height"]);		
		}

		var end_shape_style = style["endShapeStyle"];
		end_shape_style["perfectDrawEnabled"] = false;
		end_shape_style["listening"] = false;
		if (end_shape_style) {
			//if (end_shape_style["radius"] > max_radius)
			//	end_shape_style["radius"] = max_radius;

			end_shape_style["radius"] = compute_palette_line_end_shape_radius(end_shape_style["radius"]);

			//if (end_shape_style["width"] > max_width)
			// 	end_shape_style["width"] = max_width;

			//if (end_shape_style["height"] > max_height)
			// 	end_shape_style["height"] = max_height;				
		}

		var x1 = 5;
		var x2 = width - x1;
		var y = height / 2;

		var properties = {style: {elementStyle: elem_style,
									startShapeStyle: start_shape_style,
									endShapeStyle: end_shape_style,
									lineType: style["lineType"],
								},

							points: [x1, y, x2, y],
						};

		var palette = paletteButton.palette;
		var editor = palette.editor;

		var link = new Link(editor);
		link.render(button_container, properties);

		var palette_icon = link.presentation;
			palette_icon["name"] = "PaletteIcon";
	}

	paletteButton.add_palette_button_overlay = function(button_container) {

		//palette button overlay to catch the palette button events
		var palette_button_overlay = new Konva.Rect({
													width: width,
												    height: height,
												    strokeWidth: 1,
												    opacity: 0,
												    perfectDrawEnabled: false,
												});
			palette_button_overlay["name"] = "Overlay";	

		button_container.add(palette_button_overlay);
		palette_button_overlay.moveToTop();

		return palette_button_overlay;
	}

	paletteButton.getBackgroundRect = function() {
		var button_container = paletteButton.presentation;
		return find_child(button_container, "ButtonRect");
	}

	paletteButton.setActiveStyle = function() {
		var palette_button_rect = paletteButton.getBackgroundRect();
		var fill = "#eee";
		palette_button_rect.fill(fill);

		paletteButton.refresh();
	}

	paletteButton.setDefaultStyle = function(is_no_refresh) {
		var palette_button_rect = paletteButton.getBackgroundRect();
		var fill = "#fff";
		palette_button_rect.fill(fill);

		if (is_no_refresh)
			return;

		paletteButton.refresh();
	}

	paletteButton.refresh = function() {
		palette.refresh();
	}
}

PaletteButton.prototype = {

	add: function(palette_button) {

		var paletteButton = this;

		paletteButton._id = palette_button._id;
		paletteButton.type = palette_button.type;
		paletteButton.style = palette_button.style;
		paletteButton.data = palette_button.data;
		paletteButton.defaultSize = palette_button.defaultSize;

		var button_x = palette_button.x;
		var button_y = palette_button.y;

		var palette_layer = paletteButton.palette.paletteLayer;

		var button_container = paletteButton.build_button_container(palette_layer, palette_button);

		paletteButton.presentation = button_container;

		paletteButton.build_button_rect(button_container, palette_button);

		//if element is Box
		if (palette_button["type"] == "Box") {
			var style = {};
			paletteButton.addBox(button_container, palette_button);
			paletteButton.type = "Box";
		}

		//creates line
		else {
			paletteButton.addLine(button_container, palette_button);
			paletteButton.type = "Line";
		}

		paletteButton.add_palette_button_overlay(button_container);

		//adding palette button handlers
		new PaletteButtonHandlers(paletteButton);	
	},

	remove: function() {

		var paletteButton = this;

		var palette = paletteButton.palette;
		delete palette.buttons[paletteButton["_id"]];
	},

	//sets the given palette button active
	pressPaletteButton: function() {
		var paletteButton = this;
		var palette = paletteButton.palette;

		//selecting pressed palette button id
		palette.state = {pressed: true,
						pressedButton: paletteButton,
					};

		//changing style
		paletteButton.setActiveStyle();
	}, 

	unPressPaletteButton: function(is_no_refresh) {
		var paletteButton = this;
		var palette = paletteButton.palette;

		paletteButton.setDefaultStyle(is_no_refresh);

		//resseting the palette state
		palette.state = {};
	},

};

function PaletteButtonHandlers(paletteButton) {

	var palette = paletteButton.palette;

	var button_container = paletteButton.presentation;
	var palette_button_overlay = find_child(button_container, "Overlay");

	//mouser over on the palette button
	palette_button_overlay.on("mouseover", function(e) {

		set_cursor_style("pointer");
		paletteButton.setActiveStyle();

		e.cancelBubble = true;
	});

	//mouse leave on palette button
	palette_button_overlay.on("mouseleave", function(e) {

		var palette_state = palette["state"];
		var pressed_button = palette_state["pressedButton"];

		//if the button was not pressed (was just mouse-overed and then leaved),
		//then sets the default cursor and the default fill
		if (!pressed_button) {
			set_cursor_style("default");
			paletteButton.setDefaultStyle();
		}

		else {

			//if the pressed button is not the same with the current button,
			//then sets the default fill
			if (pressed_button._id != paletteButton._id) {
				paletteButton.setDefaultStyle();
			}
		}
		e.cancelBubble = true;
	});

	//if palette button is pressed, then sets the button selected or
	//unselected (if it is pressed for the 2nd time)
	palette_button_overlay.on("mousedown touchstart", function(e) {

		//palette.editor.mouseState.mouseDown(e);

		var palette_state = palette["state"];
		var pressed_button = palette_state["pressedButton"];

		//if no palette button was pressed, then setting as pressed
		if (!pressed_button) {
			paletteButton.pressPaletteButton();
		}

		else {

			//if clicked the pressed button, then unpressing it
			if (pressed_button._id == paletteButton._id) {

				pressed_button.unPressPaletteButton();
			}

			//a different button was pressed, then unpresssing it and pressing the current button
			else {
				var is_no_refresh = true;
				pressed_button.unPressPaletteButton(is_no_refresh);
				paletteButton.pressPaletteButton();
			}
		}

		e.cancelBubble = true;
	});

}


//TODO: Need to remove this
function compute_palette_line_end_shape_radius(radius) {
	return Math.sqrt(radius + 8);
}


function process_style_attributes(style) {

	if (style.shape == "RoundRectangle") 
		style["cornerRadius"] = Math.sqrt(Math.sqrt(style["cornerRadius"])) || 5;

	if (style["strokeWidth"])
		style["strokeWidth"] = Math.sqrt(style["strokeWidth"]);

	style["perfectDrawEnabled"] = false;

	return style;
}


