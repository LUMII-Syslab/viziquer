import Event from '../../Editor/events';
import ElementHandlers from '../element_handlers'

var ANewBox = function(editor) {

	var newBox = this;
	newBox.editor = editor;

	newBox.state = {};
}

ANewBox.prototype = {

	startDragging: function(palette_button) {

		var newBox = this;
		var editor = newBox.editor;

		var mouse_state = editor.getMouseState();
		var mouse_x = mouse_state["mouseX"] 
		var mouse_y = mouse_state["mouseY"]

		editor.unSelectElements(undefined, true);

		var drawing_layer = editor.getLayer("DrawingLayer");

		var elem_type_id = palette_button["data"]["elementTypeId"];

		var elem = {style: palette_button.style,
					location: {
						x: mouse_x,
						y: mouse_y,
						width: 2,
						height: 2,
						radius: 1,
					},
					compartments: [],
					elementTypeId: elem_type_id,
					type: "Box",
					_id: $.now(),
				};


		new Event(editor, "newElementStarted", {paletteButton: palette_button, element: elem});

		//creating a new box object
		var shape_name = palette_button["style"]["elementStyle"]["shape"];
		var new_box = editor.elements.createShape(shape_name);
		new_box.render(drawing_layer, elem);

		new_box.presentation.opacity(0.6);

		drawing_layer.draw();
		drawing_layer.moveToTop();

		//saves new box action state
		newBox["state"] = {object: new_box,
							drawingLayer: drawing_layer,
						};
	},

	dragging: function() {
		var newBox = this;
		var editor = newBox.editor;

		//changing the cursor style
		editor.setCursorStyle('crosshair');

		//selects mouse state and its position
		var mouse_state = editor.getMouseState();
		var mouse_x = mouse_state["mouseX"];
		var mouse_y = mouse_state["mouseY"];

		var zoom = editor.getZoom();
		var zoom_x = zoom["x"];
		var zoom_y = zoom["y"];

		//computes delta on mouse move
		var new_width = (mouse_x - mouse_state["mouseStartX"]);
		var new_height = (mouse_y - mouse_state["mouseStartY"]);

		//selects the new box object and applies the new size
		var new_box = newBox["state"]["object"];

		var size = new_box.updateSize(new_width, new_height);
		new_box.compartments.recomputeCompartmentsPosition();

		var drawing_layer = newBox["state"]["drawingLayer"];
		drawing_layer.batchDraw();
	},

	finishDragging: function() {

		var newBox = this;
		var editor = newBox.editor;

		var new_box = newBox["state"]["object"];
		new_box._id = $.now();
		var new_id = new_box._id;
		new_box.presentation.objId = new_id;

		// var element_list = editor.getElements();
		// element_list[new_id] = new_box;

		new_box.handlers = new ElementHandlers(new_box);

		//creates a new box in database
		var new_box_event = new Event(editor, "newBoxCreated", new_box);
		if (!new_box_event.result) {

			new_box.presentation.opacity(1);

			editor.selectElements([new_box]);

			var drawing_layer = newBox["state"]["drawingLayer"];
			drawing_layer.draw();
		}

		var palette_button = editor.palette.getPressedButton();
		palette_button.unPressPaletteButton();

		newBox.state = {};
	},
}

export default ANewBox