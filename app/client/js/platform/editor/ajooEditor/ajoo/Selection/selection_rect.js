
SelectionRect = function(editor) {

	var selectionRect = this;

	selectionRect.editor = editor;
	selectionRect.presentation = undefined;

	selectionRect.getRectPoints = function() {

		var rectangle = selectionRect.presentation;
		if (!rectangle)
			console.error("Error in: selectionRect.getRectPoints");

		var x1 = rectangle.x();
		var y1 = rectangle.y();
		var x2 = x1 + rectangle.width();
		var y2 = y1 + rectangle.height();

		return order_shape_points(x1, y1, x2, y2);
	}

	selectionRect.detectIntersection = function(selection_points) {

		var is_selection = false;

		var selection_elems = _.filter(selectionRect.editor.getElements(), function(element) {

			//selecting boxes
			if (element["type"] == "Box") {

				var shape_size = element.getSize();
				var shape_points = order_shape_points(shape_size["x"],
														shape_size["y"],
														shape_size["x"] + shape_size["width"],
														shape_size["y"] + shape_size["height"]);

				//checking if the box is inside the selection rectangle
				if (selection_points["x1"] < shape_points["x1"] && selection_points["x2"] > shape_points["x1"] &&
					selection_points["x1"] < shape_points["x2"] && selection_points["x2"] > shape_points["x2"] &&
					selection_points["y1"] < shape_points["y1"] && selection_points["y2"] > shape_points["y1"] &&
					selection_points["y1"] < shape_points["y2"] && selection_points["y2"] > shape_points["y2"]) {

						return true;
				}
			}

			//selecting lines
			else if (element["type"] == "Line") {

				var points = element.getPoints();
				if (points) {

					//checking if the line is inside the selection rectangle
					var res = _.find(points, function(point, j) {
						if (j%2 == 0) {
							if (point < selection_points["x1"] || selection_points["x2"] < point)
								return true;
						}
						else {
							if (point < selection_points["y1"] || selection_points["y2"] < point)
								return true;
						}
					});

					return _.isNumber(res) !== true;
				}
			}
		});

		editor.selectElements(selection_elems);
	}

	function order_shape_points(x1, y1, x2, y2) {

		return {x1: Math.min(x1, x2),
				y1: Math.min(y1, y2),
				x2: Math.max(x1, x2),
				y2: Math.max(y1, y2),
			};
	}
}

SelectionRect.prototype = {

	dragging: function() {

		var selectionRect = this;
		var editor = selectionRect.editor;

		var drawing_layer = editor.getLayer("DrawingLayer");

		//selects the mouse position
		var mouse_state = editor.getMouseState();
		var mouse_x = mouse_state["mouseX"];
		var mouse_y = mouse_state["mouseY"];

		//selects rect and sets a new size
		var selection_rectangle = selectionRect.presentation;

		//if there is a rectangle, then resizing it
		if (selection_rectangle) {

			//computes rect new size
			var new_width = (mouse_x - mouse_state["mouseStartX"]);
			var new_height = (mouse_y - mouse_state["mouseStartY"]);

			selection_rectangle.width(new_width);
			selection_rectangle.height(new_height);

			drawing_layer.batchDraw();
		}

		//if no rectangle, then creating one
		else {

			var drag_distance = 3;

			var delta_x = Math.abs(mouse_x - mouse_state["mouseStartX"]);
			var delta_y = Math.abs(mouse_y - mouse_state["mouseStartY"]);

			if (delta_x > drag_distance || delta_y > drag_distance) {

				//selection properties with default properties
				var selection_propeties = editor.getSelectionStyle();
				selection_propeties["x"] = mouse_state["mouseStartX"];
				selection_propeties["y"] = mouse_state["mouseStartY"];			

				selection_propeties["height"] = Math.min(delta_x, drag_distance);
				selection_propeties["width"] = Math.min(delta_y, drag_distance);

				selection_propeties["perfectDrawEnabled"] = false;

				//creates the selection rect
				var rect = new Konva.Rect(selection_propeties);
				drawing_layer.add(rect);
				drawing_layer.batchDraw();

				selectionRect.presentation = rect;				
			}
		}
	},

	finishDragging: function() {

		var selectionRect = this;
		var editor = selectionRect.editor;

		//selection points
		var selection_rectangle = selectionRect.presentation;
		if (selection_rectangle) {

			var selection_points = selectionRect.getRectPoints();

			//removing the selection rect
			selection_rectangle.destroy();

			var drawing_layer = editor.getLayer("DrawingLayer");
			drawing_layer.draw();

			//detects elements that intersect with the selection rectangle and
			//stores them in the selection collection
			selectionRect.detectIntersection(selection_points);

			new Event(editor, "selectionFinshed", {});
		}

	},
};


