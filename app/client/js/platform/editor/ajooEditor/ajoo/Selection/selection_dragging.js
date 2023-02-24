
SelectionDragging = function(editor) {

	var selection_dragging = this;
	selection_dragging.editor = editor;

	selection_dragging.shapesLayer = editor.getLayer("ShapesLayer");
	selection_dragging.dragLayer = editor.getLayer("DragLayer"); 
	selection_dragging.dragGroup = find_child(selection_dragging.dragLayer, "DragGroup");

	selection_dragging.inLinesGroup = find_child(selection_dragging.dragLayer, "InLinesGroup");
	selection_dragging.outLinesGroup = find_child(selection_dragging.dragLayer, "OutLinesGroup");

	selection_dragging.state = {};
}

SelectionDragging.prototype = {

	startDragging: function() {

		var selection_dragging = this;
		var editor = selection_dragging.editor;
		var state = selection_dragging.state;

		// selection_dragging.dragLayer.disableHitGraph();
		selection_dragging.dragLayer.listening(false);
		selection_dragging.dragLayer.opacity(0.6);

		var dragged_boxes = [];
		var lines = {directLines: [], orthogonalLines: [], draggedLines: [], allLines: []};

		//set unselected style for selected elements and select linked lines
		var selected_elems = editor.getSelectedElements();
		_.each(selected_elems, function(drag_elem) {
			drag_elem.setUnselectedStyle();

			if (drag_elem["type"] == "Box") {

				selection_dragging.adjustShapeToGrid(drag_elem);

				drag_elem.collectLinkedLines(lines);
				dragged_boxes.push(drag_elem);
			}
		});

		//initializes the dragging state
		selection_dragging.state = {
									dragGroup: selection_dragging.dragGroup,
									dragLayer: selection_dragging.dragLayer,
									dragStartX: editor.selectionPosition.x,
									dragStartY: editor.selectionPosition.y,

									draggedBoxes: dragged_boxes,
									draggedLines: lines.draggedLines,
									linkedOrthogonalLines: lines.orthogonalLines,
									linkedDirectLines: lines.directLines,
								};

		//selection_dragging.adjustDraggedLines();
		// selection_dragging.dragLayer.disableHitGraph();
		selection_dragging.dragLayer.listening(false);

		//refreshing the layer
		//selection_dragging.shapesLayer.disableHitGraph();
		//selection_dragging.shapesLayer.draw();
	},

	dragging: function() {

		var selection_dragging = this;

		set_cursor_style("move");

		var state = selection_dragging.state;
        var mouse_state = selection_dragging.editor.getMouseState();

        var stage = selection_dragging.editor.stage;
        var zoom = selection_dragging.editor.zoom;

        var param = {object: state.dragGroup,
        			newX: state.dragStartX,
        			newY: state.dragStartY,

        			deltaX: mouse_state.mouseX - mouse_state.mouseStartX,
        			deltaY: mouse_state.mouseY - mouse_state.mouseStartY,

        			deltaOriginalX: mouse_state.originalX - mouse_state.originalStartX,
        			deltaOriginalY: mouse_state.originalY - mouse_state.originalStartY,

					stageX: stage.x(),
					stageY: stage.y(),
        		};

        var delta_obj = selection_dragging.adjustDragGroupToGrid(param);

		//moves lines that are linked to the selection elements

		//var time11 = $.now();
		selection_dragging.moveLinesEndPoints(delta_obj);

		//var time21 = $.now();
		//console.log("Move lines: ", time21-time11);

		//var time1 = $.now();


		state.dragLayer.batchDraw();

		//var time2 = $.now();
		//console.log("Batch Draw: ", time2-time1);
	},

	finishDragging: function() {

		var selection_dragging = this;
		var editor = selection_dragging.editor;

		var list = {};

		selection_dragging.dragGroup.draggable(true);

		//collecting dragged elements
		selection_dragging.selectDraggedElements(list);

		//restoring the initial state
		selection_dragging.restoreInitialState(list);

		//if stage borders have to be resized
		editor.size.recomputeStageBorders();

		//updating the state
		new Event(editor, "collectionPositionChanged", list);
	},

	moveLinesEndPoints: function(delta_obj) {

		var selection_dragging = this;
		var state = selection_dragging.state;

		if (!delta_obj.isMoved) {
			return;
		}

		//recomputing lines
		selection_dragging.recomputeDirectLines(delta_obj);		
		selection_dragging.buildGraphInfo(delta_obj);
	},

	restoreInitialState: function(list, stage, drag_x, drag_y) {

		var selection_dragging = this;
		var editor = selection_dragging.editor;
		var state = selection_dragging.state;

		//restoring style
		_.each(editor.getSelectedElements(), function(selected_elem) {
			selected_elem.setSelectedStyle();
		});

		//refreshing layers
		var drag_layer = selection_dragging.dragLayer;
		drag_layer.opacity(1);
		// drag_layer.enableHitGraph();
		drag_layer.listening(true);

		drag_layer.draw();
	},

	selectDraggedElements: function(list) {

		var selection_dragging = this;
		var editor = selection_dragging.editor;
		var state = selection_dragging.state;

		//computes the delta
		var drag_group = selection_dragging.dragGroup;
		var delta_x = drag_group.x() - state["dragStartX"];
		var delta_y = drag_group.y() - state["dragStartY"];

		var box_collection_type;
		if (editor.isGridEnabled())
			box_collection_type = "movedBoxes";

		else {
			list.deltaX = delta_x;
			list.deltaY = delta_y;
			box_collection_type = "boxes";
		}

		list[box_collection_type] = [];
		list["lines"] = [];

		//selecting dragged element positions
		_.each(selection_dragging.state.draggedBoxes, function(drag_elem) {

			if (box_collection_type == "boxes")
				list[box_collection_type].push(drag_elem._id);

			else {
				var pos = drag_elem.getElementPosition();
				list[box_collection_type].push({id: drag_elem._id, position: {x: pos.x, y: pos.y}});
			}
		});

		//selecting dragged element positions
		_.each(selection_dragging.state.draggedLines, function(line_obj) {

			var link = line_obj.line;
			var line_points = link.getPoints().slice();
			link.transformLinePoints(line_points, 1);

			list["lines"].push({id: link._id,
								points: line_points,
							});

			link.line.listening(true);
		});

		//selecting linked lines
		_.each(selection_dragging.state.linkedOrthogonalLines, function(line_obj) {

			var line = line_obj.line;
			list["lines"].push({id: line._id, points: line.getPoints()});

			line.line.listening(true);
		});


		_.each(selection_dragging.state.linkedDirectLines, function(line_obj) {

			var line = line_obj.line;
			list["lines"].push({id: line._id, points: line.getPoints()});

			line.line.listening(true);
		});

	},

	adjustShapeToGrid: function(elem) {

		var selection_dragging = this;
		var editor = selection_dragging.editor;

		var new_delta_x = 0;
		var new_delta_y = 0;

		if (editor.grid.isGridEnabled) {

			//selecting size
			var size = elem.getSize();
			var newX = size.x;
			var newY = size.y;

			//selecting zoom
			var zoom = editor.getZoom();
			var zoom_x = zoom.x;
			var zoom_y = zoom.y;

			var divider = editor.grid.step;
			var stage = editor.stage;

			var new_x = Math.round((newX + stage.x() % divider) * zoom_x);
			var new_y = Math.round((newY + stage.y() % divider) * zoom_y);

			var new_point = selection_dragging.computeAdjustedPoint(new_x, new_y);

			var presentation = elem.presentation;
			presentation.x(new_point.x - Math.round((stage.x() % divider) / zoom.x));
			presentation.y(new_point.y - Math.round((stage.y() % divider) / zoom.y));
		}

		return {deltaX: new_delta_x, deltaY: new_delta_y};
	},

	adjustDragGroupToGrid: function(param) {

		var selection_dragging = this;
		var editor = selection_dragging.editor;

		var drag_obj = param.object;

		var new_delta_x = 0;
		var new_delta_y = 0;

		var isMoved = false;

		if (editor.grid.isGridEnabled) {

			var zoom = editor.getZoom();
			var zoom_x = zoom.x;
			var zoom_y = zoom.y;

			var new_x = Math.round(param.newX * zoom_x + param.deltaOriginalX);
			var new_y = Math.round(param.newY * zoom_y + param.deltaOriginalY);

			var new_point = selection_dragging.computeAdjustedPoint(new_x, new_y);


			var divider = editor.grid.step;

			if (drag_obj.x() != new_point.x || drag_obj.y() != new_point.y) {

				new_delta_x = param.deltaX - param.newX + new_point.x - param.deltaX;
				drag_obj.x(new_point.x);


				new_delta_y = param.deltaY - param.newY + new_point.y - param.deltaY;
				drag_obj.y(new_point.y);

				isMoved = true;
			}
		}

		else {

			var new_x = Math.round(param.newX + param.deltaX);
			var new_y = Math.round(param.newY + param.deltaY);

			drag_obj.x(new_x);
			drag_obj.y(new_y);

			new_delta_x = param.deltaX;
			new_delta_y = param.deltaY;

			isMoved = true;
		}

		return {deltaX: Math.round(new_delta_x), deltaY: Math.round(new_delta_y), isMoved: isMoved};
	},

	computeAdjustedPoint: function(new_x, new_y) {

		var selection_dragging = this;
		var editor = selection_dragging.editor;

		var zoom = editor.getZoom();
		var zoom_x = zoom.x;
		var zoom_y = zoom.y;

		var divider = editor.grid.step; //adjusted zoom step

		var rest_x = new_x % divider; // mod x
		var rest_y = new_y % divider; // mod y

		var koef_x = Math.round(rest_x / divider); // zero or 1
		var koef_y = Math.round(rest_y / divider); // zero or 1

		var d_x = koef_x * divider; //delta x is zero or step
		var d_y = koef_y * divider; //delta y is zero or step

		var x_mult, y_mult;
		if (new_x < 0) {
			x_mult = Math.ceil(new_x / divider);
		}
		else {
			x_mult = Math.floor(new_x / divider);
		}

		if (new_y < 0) {
			y_mult = Math.ceil(new_y / divider);
		}
		else {
			y_mult = Math.floor(new_y / divider);
		}


		return {
				x: Math.round((x_mult * divider + d_x) / zoom_x),
				y: Math.round((y_mult * divider + d_y) / zoom_y),
				deltaX: d_x,
				deltaY: d_y,
			};
	},

	adjustDraggedLines: function() {
		var selection_dragging = this;
		var editor = selection_dragging.editor;

		if (editor.grid.isGridEnabled) {
			selection_dragging.buildGraphInfo({});
		}
	},

	buildGraphInfo: function(delta_obj) {
		var selection_dragging = this;
		var editor = selection_dragging.editor;

		var state = selection_dragging.state;

		OrthogonalCollectionRerouting.recomputeLines(editor, state.draggedBoxes, state.linkedOrthogonalLines, state.draggedLines, delta_obj.deltaX, delta_obj.deltaY);
	},

	recomputeDirectLines: function(delta_obj) {

		var selection_dragging = this;
		var editor = selection_dragging.editor;

		var elem_list = editor.getElements();

		var state = selection_dragging.state;
		_.each(state.linkedDirectLines, function(line_obj) {

			var line = line_obj.line;
			var points = line_obj.points.slice();

			var index = line_obj.index;

			points[index] += delta_obj.deltaX;
			points[index + 1] += delta_obj.deltaY;

		    var k = (points[3] - points[1]) / (points[2] - points[0]);
		    if (!_.isFinite(k)) {
		    	k = 1;
		    }

		    var c = points[1] - k * points[0];

		    var x3 = 10000;
		    var y3 = k * x3 + c;

		    var x4 = -10000;
		    var y4 = k * x4 + c;

		    var straight_line = [x3, y3, x4, y4];
		    var line_svg = new LineSVGObject(straight_line, 0);

		    //computing start point
		    var start_elem = elem_list[line_obj.line.startElementId];
		    var new_start_point_obj = line_svg.getIntersectionWithElement(start_elem, [points[2], points[3]]);
		    if (!new_start_point_obj.point) {

		    	var pos = start_elem.getElementPosition();
		    	var size = start_elem.getSize();
		    	var start_line = [pos.x + size.width / 2, pos.y + size.height / 2, x4, y4];

		    	var line_svg1 = new LineSVGObject(start_line, 0);
			    new_start_point_obj = line_svg1.getIntersectionWithElement(start_elem, [start_line[2], start_line[3]]);

		    }

		    //computing end point
		    var end_elem = elem_list[line_obj.line.endElementId];
		    var new_end_point_obj = line_svg.getIntersectionWithElement(end_elem, [points[0], points[1]]);   

		    if (!new_end_point_obj.point) {

		    	var pos = end_elem.getElementPosition();
		    	var size = end_elem.getSize();
		    	var end_line = [x3, y3, pos.x + size.width / 2, pos.y + size.height / 2];

		    	var line_svg2 = new LineSVGObject(end_line, 0);
			    new_end_point_obj = line_svg2.getIntersectionWithElement(end_elem, [end_line[0], end_line[1]]);
		    }



		    if (new_start_point_obj.point && new_end_point_obj.point) {
				line.setPoints([new_start_point_obj.point[0], new_start_point_obj.point[1],
								new_end_point_obj.point[0], new_end_point_obj.point[1],
							]);
		    }

		});


	},

}

