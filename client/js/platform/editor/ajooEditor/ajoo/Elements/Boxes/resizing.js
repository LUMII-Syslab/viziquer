
ResizingShape = function(editor) {

	var resizingShape = this;
	resizingShape.editor = editor;

	resizingShape.state = {};
}

ResizingShape.prototype = {

	startDragging: function(element, resizer_name) {

		var resizingShape = this;
		var editor = element.editor;
		var state = resizingShape.state;

		//transforming the element position
		var pos = element.getElementPosition();

		var new_x = pos["x"];
		var new_y = pos["y"];

		var shape_group = element.presentation;
		shape_group.x(new_x);
		shape_group.y(new_y);

		//saving the action state
		var drawingLayer = editor.getLayer("DrawingLayer");
		var dragLayer = editor.getLayer("DragLayer");
		var drag_group = find_child(dragLayer, "DragGroup");

		var shapesLayer = editor.getLayer("ShapesLayer");

		var lines = {directLines: [], orthogonalLines: [], draggedLines: [], allLines: []};
		element.collectLinkedLines(lines);

		var size = element.getSize();
		resizingShape.state = {name: "Resizing",
								element: element,
								resizerName: resizer_name,

								linkedOrthogonalLines: lines.orthogonalLines,
								linkedDirectLines: lines.directLines,

								draggedLines: lines.draggedLines,

								x1: new_x,
								y1: new_y,
								x2: new_x + size["width"],
								y2: new_y + size["height"],

								drawingLayer: drawingLayer,
								dragLayer: dragLayer,
								dragGroup: drag_group, 
								shapesLayer: shapesLayer,
							};
							
		if (element.resizers)					
			element.resizers.remove();

		//moving element to the drawing layer
		shape_group.moveTo(drawingLayer);

		dragLayer.disableHitGraph();
		dragLayer.listening(false);
		drawingLayer.listening(false);

		//refreshing layers
		//drawingLayer.draw();
		//dragLayer.draw();
		//shapesLayer.listening(false);
		//shapesLayer.draw();
	},

	dragging: function() {

		//changing the cursor style
		set_cursor_style('crosshair');

		var resizingShape = this;
		var editor = resizingShape.editor;
		var state = resizingShape.state;
		var element = state.element;

		//element being resized
		var element = state["element"];

		//resizers name topleft, bottomright, etc.
		var resizer_name = state["resizerName"];

		//mouse position and delta state
		var mouse_state = editor.getMouseState();
		var mouse_x, mouse_y;

		//if grid enabled then recomputing point to adjust grid
		if (editor.grid.isGridEnabled) {

			var zoom = editor.getZoom();

			var new_x = Math.round(mouse_state["mouseX"] * zoom.x);
			var new_y = Math.round(mouse_state["mouseY"] * zoom.y);

			//var delta = resizingShape.adjustShapeToGrid(element);
			var transformed_point = resizingShape.computeAdjustedPoint(new_x, new_y);

			//recomputed mouse points mouse points
			mouse_x = transformed_point.x;
			mouse_y = transformed_point.y;
		}

		else {
			mouse_x = mouse_state["mouseX"];
			mouse_y = mouse_state["mouseY"];
		}


		var x1 = state["x1"];
		var y1 = state["y1"];

		var x2 = state["x2"];
		var y2 = state["y2"];

		//resizes width and height, also x and y
		if (resizer_name == "TopLeft") {
			element.updateElementSize(mouse_x, mouse_y, x2, y2);
		}

		else if (resizer_name == "TopMiddle") {
			element.updateElementSize(x1, mouse_y, x2, y2);
		}

		else if (resizer_name == "LeftMiddle") {
			element.updateElementSize(mouse_x, y1, x2, y2);
		}

		//resizes width, height and x, no y 
		else if (resizer_name == "BottomLeft") {
			element.updateElementSize(mouse_x, y1, x2, mouse_y);
		}

		//resizes width, height and x, no y 
		else if (resizer_name == "TopRight") {
			element.updateElementSize(x1, mouse_y, mouse_x, y2);
		}

		//resizers width and height (no x and y changes)
		else if (resizer_name == "BottomRight") {
			element.updateElementSize(x1, y1, mouse_x, mouse_y);	
		}

		else if (resizer_name == "BottomMiddle") {
			element.updateElementSize(x1, y1, x2, mouse_y);
		}

		else if (resizer_name == "RightMiddle") {
			element.updateElementSize(x1, y1, mouse_x, y2);
		}

		resizingShape.recomputeLinkedLines(element);

		//if the element has gradient, then recomputes its proportions
		//resize_gradient(shape_group);

		//refreshes the layer holding the resizing element
		state.drawingLayer.batchDraw();
		state.dragLayer.batchDraw();
	},

	finishDragging: function() {

		var resizingShape = this;
		var editor = resizingShape.editor;
		var state = resizingShape.state;

		//resizing element
		var element = state.element;
		var resizing_shape = element.presentation;

		//resizing element size
		var element_size = element.getSize();

		//returns the base state
		element.addResizers();

		//moves element back to the drag_layer
		var drag_group = find_child(state["dragLayer"], "DragGroup");

		var new_shape_x = resizing_shape.x();
		var new_shape_y = resizing_shape.y();

		var selection_x = drag_group.x();
		var selection_y = drag_group.y();

		var new_x = resizing_shape.x() - selection_x;
		var new_y = resizing_shape.y() - selection_y;

		resizing_shape.x(new_x);
		resizing_shape.y(new_y);

		resizing_shape.moveTo(drag_group);

		var lines = [];
		_.each(state.linkedDirectLines, function(line_obj) {
			var link = line_obj.line;
			var line_points = link.getPoints().slice();

			link.transformLinePointsToUnselected(line_points);

			lines.push({_id: link._id, points: line_points});
		});

		_.each(state.linkedOrthogonalLines, function(line_obj) {
			var link = line_obj.line;
			var line_points = link.getPoints().slice();

			link.transformLinePointsToUnselected(line_points);

			lines.push({_id: link._id, points: line_points});
		});


		//execute the reiszeelement extension point
		var list = {
				elementId: element._id,
				x: new_shape_x,
				y: new_shape_y,
				width: element_size["width"],
				height: element_size["height"],
				lines: lines,
			};

		editor.size.recomputeStageBorders();

		new Event(editor, "elementResized", list);

		var dragLayer = state["dragLayer"];

		dragLayer.enableHitGraph();
		dragLayer.listening(true);

		state["drawingLayer"].listening(true);

		//refreshing layers
		state["shapesLayer"].draw();
		state["dragLayer"].draw();
		state["drawingLayer"].draw();
	},

	recomputeLinkedLines: function(element) {

		var resizingShape = this;
		var state = resizingShape.state;

		var drag_group = state.dragGroup;
		var selection_x = drag_group.x();
		var selection_y = drag_group.y();

		element.presentation.x(element.presentation.x() - selection_x);
		element.presentation.y(element.presentation.y() - selection_y);

		//recomputing lines
		resizingShape.recomputeDirectLines();
		resizingShape.buildGraphInfo();

		element.presentation.x(element.presentation.x() + selection_x);
		element.presentation.y(element.presentation.y() + selection_y);
	},

	buildGraphInfo: function() {
		var resizingShape = this;
		var editor = resizingShape.editor;

		var state = resizingShape.state;

		var box_obj = {resizedElement: state.element, minX: state.x1, minY: state.y1, maxX: state.x2, maxY: state.y2};
		OrthogonalCollectionRerouting.recomputeLines(editor, [box_obj], state.linkedOrthogonalLines, state.draggedLines);
	},

	computeAdjustedPoint: function(new_x, new_y) {
		return SelectionDragging.prototype.computeAdjustedPoint.call(this, new_x, new_y);
	},

	recomputeDirectLines: function() {
		SelectionDragging.prototype.recomputeDirectLines.call(this, {deltaX: 0, deltaY: 0});
	},

}

