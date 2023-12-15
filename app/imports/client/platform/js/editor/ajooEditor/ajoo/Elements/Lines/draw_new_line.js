import Link from "./render_lines"
import Event from "../../Editor/events"
import ElementHandlers from "../element_handlers"
import {SVGObject, LineSVGObject} from "./routing/svg_collisions"
import compute_intersection from "./routing/IntersectionUtilities"

var ANewLine = function(editor) {
	var newLine = this;
	newLine.editor = editor;

	newLine.state = {};
}

ANewLine.prototype = {

	startDragging: function(palette_button, start_element) {
		var newLine = this;
		var editor = newLine.editor;

		if (!start_element) {
			console.error("No start element", start_element);
			return;
		}

		editor.unSelectElements();

		//selects the mouse position
		var mouse_state = editor.getMouseState();
		var mouse_x = mouse_state["mouseX"];
		var mouse_y = mouse_state["mouseY"];

		var new_line_points = [mouse_x, mouse_y, mouse_x + 2, mouse_y + 2];

		//creating a new line to indicate the line
		var new_line = new Link(editor);

		var drawing_layer = editor.getLayer("DrawingLayer");

		var elem_type_id = palette_button["data"]["elementTypeId"];

		var elem = {style: palette_button["style"],
					points: new_line_points,
					elementTypeId: elem_type_id,
				};

		new_line.render(drawing_layer, elem);

		drawing_layer.moveToTop();

		//saves the state
		newLine["state"] = {
							object: new_line,
							drawingLayer: drawing_layer,
							start: {
									element: start_element,
									svg: start_element.buildSVG(),
								},
							startPoint: [mouse_x, mouse_y],
							data: palette_button["data"],
						};

		editor.connectionPoints.fixStartElement();
		drawing_layer.batchDraw();
	},

	dragging: function(target) {
		var newLine = this;

		var editor = newLine.editor;
		var state = newLine.state;

		//selects the mouse position
		var mouse_state = editor.getMouseState();
		var mouse_x = mouse_state["mouseX"];
		var mouse_y = mouse_state["mouseY"];

		editor.setCursorStyle("crosshair");

		//selects the line
		var new_line = state["object"];

		var start_point = state.startPoint;
		var line_points = [start_point[0], start_point[1], mouse_x, mouse_y];

		var new_points = [];

		var start = state["start"];
	 	var start_elem = start["element"];

	 	//checking if line is a self loop
	 	var is_not_self_loop = true;
	 	if (target && start_elem._id == target._id) {
	 		is_not_self_loop = false;
	 	}

	 	var new_start_point;
	 	if (is_not_self_loop) {
	 		new_start_point = newLine.getShapeCollisionPoint(start_elem,
	 															[line_points[0], line_points[1]],
	 															[line_points[2], line_points[3]]);
	 	}
	 	
	 	//saving the first point
	 	if (new_start_point) {
			new_points = [new_start_point[0], new_start_point[1]];
	 	}

		else {
			new_points = [line_points[0], line_points[1]];
		}

	 	//if target, then recomputing the last point
	 	var new_end_point;


	 	if (target && target.type === "Box") {

	 		editor.connectionPoints.addEndPoint(target);

	 		//finding collision with end shape
	 		if (is_not_self_loop) {
	 			new_end_point = newLine.getShapeCollisionPoint(target,
	 															[line_points[2], line_points[3]],
	 															[line_points[0], line_points[1]]);
	 		}
	 		else {
	 			new_end_point = [line_points[2], line_points[3]];
	 		}

	 		state.end = target;
	 	}

	 	else if (target && target.type == "Port") {

	 		if (is_not_self_loop) {
	 			new_end_point = newLine.getShapeCollisionPoint(target,
	 															[line_points[2], line_points[3]],
	 															[line_points[0], line_points[1]]);
	 		}
	 		else {
	 			new_end_point = [line_points[2], line_points[3]];
	 		}

	 		state.end = target;
	 	}

	 	else {

	 		editor.connectionPoints.removeEndPoints(true);	

	 		//if user mouse overed connection point
	 		var active_connection_point = editor.connectionPoints.getActiveConnectionPoint();
	 		if (active_connection_point) {
	 			new_end_point = [active_connection_point.x(), active_connection_point.y()];
	 		}

	 		//user didn't mouse overed on connection point
	 		else {
	 			state.end = editor.resetVariable();
	 		}
	 	}

	 	//new Event(editor, "checkingNewLineConstraints", state);

	 	//saving the last point
	 	if (new_end_point) {
	 		new_points.push(new_end_point[0], new_end_point[1]);
	 	}

	 	else {
	 		new_points.push(line_points[2], line_points[3]);
	 	}

	 	//need recomputing
		if (new_line["lineType"] == "Orthogonal") {
			var recomputed_points = new NewOrthogonalLine(new_points, start_elem, target);
			new_line.setPoints(recomputed_points);
		}

		else {
			new_line.setPoints(new_points);
		}

		var drawing_layer = state["drawingLayer"];
		drawing_layer.batchDraw();
	},

	finishDragging: function(target) {
		var newLine = this;
		var editor = newLine.editor;
		var state = newLine.state;
		
		var connection_points = editor.connectionPoints;		
	 	if (!target || target.type == "Line") {
	 		var tmp_target = connection_points.getEndElement();
	 		connection_points.reset();
	 		if (!tmp_target || (target && target.type == "Line")) {
	 			return newLine.destroyNewLine();
	 		}

	 		target = tmp_target;
	 	}

	 	else {
	 		connection_points.reset();
	 	}

		var new_line = state.object;

	 	state.end = target;
		var ev = new Event(editor, "checkingNewLineConstraints", state);

		console.log("ev", ev)

		if (ev.result == false) {
			return newLine.destroyNewLine();
		}

		var new_id = $.now();

		//setting the line properties to process the line after the DB object was created
		var element_list = editor.getElements();
		element_list[new_id] = new_line;

		var start_elem = state.start.element;
		var start_elem_id = start_elem._id;

		var end_elem_id = target._id;

		new_line._id = new_id;
		new_line["startElementId"] = start_elem_id;
		new_line["endElementId"] = end_elem_id;
		new_line["type"] = "Line";
		new_line["inLines"] = {};
		new_line["outLines"] = {};


		if (start_elem_id == end_elem_id) {

			var new_points = newLine.get_loop_points();

			//applying new points
			new_line.setPoints(new_points);
		}

		//adding a line to the start and end elements
		start_elem["outLines"][new_id] = new_line;
		target["inLines"][new_id] = new_line;

		//add handlers
		new_line.handlers = new ElementHandlers(new_line);

		var new_line_event = new Event(editor, "newLineCreated", new_line);
		if (!new_line_event.isSelectionNeeded) {

			var drawing_layer = editor.getLayer("DrawingLayer");
			drawing_layer.batchDraw();

			editor.selectElements([new_line]);

			var drag_layer = editor.getLayer("DragLayer");
			new_line.line.listening(true);

			new_line.drawHitRegion(drag_layer);
			drag_layer.draw();
		}

		//resets palette state
		var palette_button = editor.palette.getPressedButton();
		palette_button.unPressPaletteButton();

		state = {};
	},

	getShapeCollisionPoint: function(elem, point1, point2) {

	 	//creating line svg object
	 	var inf = 10000000;

	 	//line1
	 	var line1 = [-inf, point1[1], inf, point1[1]];
	 	var new_line_svg1 = new LineSVGObject(line1, 0);
	 	
	 	//finding collision with start shape
	 	var new_point_obj1 = new_line_svg1.getIntersectionWithElement(elem, point2);
	 	var new_point1 = new_point_obj1["point"];

	 	//line2
	 	var line2 = [point1[0], -inf, point1[0], inf];
	 	var new_line_svg2 = new LineSVGObject(line2, 0);
	 		
	 	//finding collision with start shape
	 	var new_point_obj2 = new_line_svg2.getIntersectionWithElement(elem, point2);
	 	var new_point2 = new_point_obj2["point"];


	 	var distance1 = Infinity;
	 	if (new_point1) {
	 		distance1 = new_line_svg1.compute_distance_between_points(new_point1, point2);
	 	}

	 	var distance2 = Infinity;
	 	if (new_point2) {
	 		distance2 = new_line_svg2.compute_distance_between_points(new_point2, point2);
	 	}

	 	//selecting the closeset point
	 	if (distance1 < distance2) {
	 		return [Math.round(new_point1[0]), Math.round(new_point1[1])];
	 	}
	 	else {
	 		return [Math.round(new_point2[0]), Math.round(new_point2[1])];
	 	}
	},

	destroyNewLine: function() {

		var newLine = this;
		var state = newLine.state;

		// state.object.presentation.destroy();
		state.object.presentation.remove();
		state.drawingLayer.batchDraw();
	},

	compute_new_start_point: function(start_element_in, mouse_point) {

		//element's position
		var start_element = start_element_in.presentation;
		var pos_x = start_element.x();
		var pos_y = start_element.y();

		var new_point = mouse_point;
		var active_indicator, indicators;

		//selecting indicators
		var indicator_group = find_child(start_element, "Indicators");
		if (indicator_group) {
			indicators = indicator_group["children"];

			for (var i=0;i<indicators.length;i++) {

				//selecting the indicator
				var indicator = indicators[i];

				//computing its position
				var x = indicator.x() + pos_x;
				var y = indicator.y() + pos_y;
				var radius = indicator.radius();

				//cheking if the point is in the indicator's area
				if (is_point_in_area(x - radius, y - radius, x + radius, y + radius, mouse_point)) {
					new_point = [x, y];
					active_indicator = indicator;
					break;
				}
			}
		}

		return {newPoint: new_point, indicators: indicators, activeIndicator: active_indicator};
	},

	get_loop_points: function() {

		var newLine = this;

		//selecting line and points
		var new_line = newLine.state.object;
		var points = new_line.getPoints();
		var inf = LineSVGObject.prototype.get_positive_infinity();

		//processing the start point
		var start_point = [points[0], points[1]];
		var start_element = newLine.state.start.element;

		//building horizontal interscetion
		var h_points = [-inf, start_point[1], inf, start_point[1]];
		var start_line_h = new LineSVGObject(h_points, 0);
		var start_point_obj_h = start_line_h.getIntersectionWithElement(start_element, start_point);

		//building vertical intersection
		var v_points = [start_point[0], -inf, start_point[0], inf];
		var start_line_v = new LineSVGObject(v_points, 0);
		var start_point_obj_v = start_line_v.getIntersectionWithElement(start_element, start_point);


		var loop_points;
		var delta = 20;
		var end_point = [points[2], points[3]];

		var end_point_obj;
		var middle_point1, middle_point2, new_end_point, end_shape_intersection;

		//if horizontal
		if (start_point_obj_v["distance"] < start_point_obj_h["distance"]) {

			new_start_point = start_point_obj_v["point"];

			//computing direction
			if (start_point[1] > new_start_point[1]) {
				delta = delta * -1;
			}

			//middle points
			middle_point1 = [new_start_point[0], new_start_point[1] + delta];
			middle_point2 = [end_point[0], new_start_point[1] + delta];

			//processing the end point
			var end_vertical = [end_point[0], -inf, end_point[0], inf];
			var end_line_v = new LineSVGObject(end_vertical, 0);
			end_point_obj = end_line_v.getIntersectionWithElement(start_element, middle_point2);


			if ((end_point_obj.point[1] > middle_point2[1] && delta > 0) ||
				(end_point_obj.point[1] < middle_point2[1] && delta < 0)) {

				var new_y = end_point_obj.point[1] + delta;
				middle_point1[1] = new_y;
				middle_point2[1] = new_y;
			}

		}

		//if vertical
		else {

			new_start_point = start_point_obj_h["point"];

			//computing direction
			if (start_point[0] > new_start_point[0])
				delta = delta * -1;

			//middle points			
			middle_point1 = [new_start_point[0] + delta, new_start_point[1]];
			middle_point2 = [new_start_point[0] + delta, end_point[1]];

			//processing the end point
			var end_horizontal = [-inf, end_point[1], inf, end_point[1]];
			var end_line_h = new LineSVGObject(end_horizontal, 0);
			end_point_obj = end_line_h.getIntersectionWithElement(start_element, middle_point2);


			if ((end_point_obj.point[0] > middle_point2[0] && delta > 0) ||
				(end_point_obj.point[0] < middle_point2[0] && delta < 0)) {

				var new_x = end_point_obj.point[0] + delta;
				middle_point1[0] = new_x;
				middle_point2[0] = new_x;
			}

		}

		var new_end_point = end_point_obj["point"];

		loop_points = [new_start_point[0], new_start_point[1],
						middle_point1[0], middle_point1[1], 
						middle_point2[0], middle_point2[1],
						new_end_point[0], new_end_point[1]];

		return loop_points;
	},

}

var NewOrthogonalLine = function(points_in, start_elem, end_elem) {

	this.pointsIn = points_in;
	this.startElement = start_elem;
	this.endElement = end_elem;

	this.lineInSvg = new LineSVGObject(this.pointsIn, 0);

	this.newPoints = [];
	this.computeNewPoints();

	return this.newPoints;
}

NewOrthogonalLine.prototype = {

	computeNewPoints: function(points_in, start_elem, end_elem) {

		var points = this.pointsIn;

		//if points make a straight line
		if (points[0] == points[2] || points[1] == points[3]) {
			this.newPoints = points;
		}

		else {
			var start_side = this.getIntersectingSide(this.startElement);
			if (!start_side) {
				this.newPoints = this.pointsIn;
			}

			else {
				var end_side = this.getIntersectingSide(this.endElement);
				var new_points = this.computeLine(start_side, end_side);
				this.newPoints = new_points;
			}
		}

	},

	getIntersectingSide: function(elem) {

		if (!elem || elem.type == "Line") {
			return;
		}

		var size = elem.getElementPosition();

		var sides = [
			{segment: [size.x, size.y, size.x + size.width, size.y],
				name: "top"},

			{segment: [size.x, size.y + size.height, size.x + size.width, size.y + size.height],
				name: "bottom"},

			{segment: [size.x, size.y, size.x, size.y + size.height],
				name: "left"},

			{segment: [size.x + size.width, size.y, size.x + size.width, size.y + size.height],
				name: "right"},
		];

		var side;

		var line, segment_svg, inter_points;
		for (var i=0;i<sides.length;i++) {

			line = sides[i];

			segment_svg = new LineSVGObject(line.segment, 0);

			inter_points = this.isSideIntersecting(segment_svg);
			if (inter_points.points.length > 0) {
				side = line.name;
				break;
			}
		}

		return side;
	},

	isSideIntersecting: function(rect_line_svg_obj) {
		return compute_intersection(this.lineInSvg.svgLine, rect_line_svg_obj.svgLine);
	},

	computeLine: function(start_side, end_side_in) {

		var end_side;
		if (!end_side_in) {
			var opposite = {left: "right", right: "left", top: "bottom", bottom: "top"};
			end_side = opposite[start_side];
		}

		else {
			end_side = end_side_in;
		}

		var points = this.pointsIn;
		var cases = {

				//top
				"top-bottom": function() {
					return [points[0], points[1],
							points[0], (points[1] + points[3]) / 2,
							points[2], (points[1] + points[3]) / 2,
							points[2], points[3],
						];
				},

				"top-left": function() {
					return [points[0], points[1],
							points[0], points[3],
							points[2], points[3],
						];
				},

				"top-right": function() {
					return cases["top-left"]();
				},

				//bottom
				"bottom-top": function() {
					return [points[0], points[1],
							points[0], (points[1] + points[3]) / 2,
							points[2], (points[1] + points[3]) / 2,
							points[2], points[3],
						];
				},

				"bottom-left": function() {
					return [points[0], points[1],
							points[0], points[3],
							points[2], points[3],
						];
				},

				"bottom-right": function() {
					return cases["bottom-left"]();
				},

				//left
				"left-right": function() {
					return [points[0], points[1],
							(points[2] + points[0]) / 2, points[1],
							(points[2] + points[0]) / 2, points[3],
							points[2], points[3],
						];
				},

				"left-top": function() {
					return [points[0], points[1],
							points[2], points[1],
							points[2], points[3],
						];
				},

				"left-bottom": function() {
					return cases["left-top"]();
				},

				//right
				"right-left": function() {
					return [points[0], points[1],
							(points[2] + points[0]) / 2, points[1],
							(points[2] + points[0]) / 2, points[3],
							points[2], points[3],
						];
				},

				"right-top": function() {
					return [points[0], points[1],
							points[2], points[1],
							points[2], points[3],
						];
				},

				"right-bottom": function() {
					return cases["right-top"]();
				},
			};

			var key = start_side + "-" + end_side;
			if (cases[key]) {
				return cases[key]();
			}
	},

}

export {ANewLine, NewOrthogonalLine}
