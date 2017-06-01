
LineEndShape = function(link, direction, style) {
	var line_end = this;

	line_end.link = link;
	line_end.name = direction;

	line_end.create(style);
}

LineEndShape.prototype.create = function(style) {

	var line_end = this;

	var shape_name = style["shape"]
	if (shape_name && shape_name != "None") {

		//regular shapes, circle and arrow
		if (!style["width"])
			style["width"] = style["radius"];

		if (!style["height"])
			style["height"] = style["radius"];

		//adding the shape
		line_end.addEndShapeRepresentation(style);
	}
}

LineEndShape.prototype.addEndShapeRepresentation = function(style) {

	var line_end = this;

	//adding the shape
	var shape_obj = line_end.addEndShapeRepresentationElement(style);

	var shapes = shape_obj["element"];
	line_end.presentation = shapes;

	line_end.computeLineEndShape(shapes);

	var parent = line_end.link.line.getParent();
	_.each(shapes, function(shape) {
		parent.add(shape);
	});
}

LineEndShape.prototype.addEndShapeRepresentationElement = function(style) {

	style["perfectDrawEnabled"] = false;
	style["listening"] = false;
	var shape_name = style["shape"];

	var end_shapes = {
		Triangle: function() {
			var self = {sides: 3};
			return ATriangle.prototype.createShape.call(self, style);
		},

		Arrow: function() {
			var arrow = Arrow.prototype.createShape(style);
			var self = {shapes: arrow["element"]};

			Arrow.prototype.updateShapeSize.call(self, {width: style["width"], height: style["height"]});

			return arrow;
		},

		Circle: function() {
			return ACircle.prototype.createShape(style);
		},

		Diamond: function() {
			var self = {sides: 4};
			return ADiamond.prototype.createShape.call(self, style);
		},
	};

	var func = end_shapes[shape_name];
	if (func)
		return func();
}


LineEndShape.prototype.computeLineEndShape = function() {

	var line_end = this;
	var name = line_end.name;

	var shapes = line_end.presentation;
	if (!shapes)
		return;

	var points = line_end.link.getPoints();

	_.each(shapes, function(shape) {

		var end_shape;
		var end_points;
		var length = points.length;

		var x_delta;
		var x1, x2, y1, y2;
		var end_point_x, end_point_y;
		if (name == "Start") {
			end_point_x = 0;
			end_point_y = 1;

			x1 = 0;
			y1 = 1;

			x2 = 2;
			y2 = 3;
		}

		else if (name == "End") {
			end_point_x = length-2;
			end_point_y = length-1;

			x1 = length-2;
			y1 = length-1;

			x2 = length-4;
			y2 = length-3;
		}

		//computing the end shape's rotation and position
		var rotation = line_end.computeRotation(points, x1, y1, x2, y2, end_point_x, end_point_y);
		shape.rotation(rotation["rotation"]);

		var center = line_end.moveCenter(shape, points, end_point_x, end_point_y, rotation);

		shape.position({x: center["x"], y: center["y"]});
	});
}

LineEndShape.prototype.computeRotation = function(points, x1_index, y1_index, x2_index, y2_index, end_point_x, end_point_y) {

	var x1 = points[x1_index];
	var y1 = points[y1_index];

	var x2 = points[x2_index];
	var y2 = points[y2_index];

	var x_delta = (x2 - x1);
	var y_delta = (y2 - y1);

	var rotation;
	if (x_delta != 0) {

		//if horizontal line
		if (y_delta == 0) {
			if (x1 > x2)
				rotation = 0;
			else
				rotation = 180;
		}
		else {

			// a formula: k = (y2-y1) / (x2-x1)
			var k = y_delta / x_delta;
			rotation = Math.atan(k) * (180 / Math.PI);
			if (x1 < x2) {
				rotation = 180 + rotation;
			}
		}
	}

	//if vertical line
	else {
		if (y1 > y2)
			rotation = 90;
		else
			rotation = 270;
	}

	return {rotation: rotation + 90};
}

LineEndShape.prototype.moveCenter = function(shape, points, end_point_x_index, end_point_y_index, rotation_obj) {

	var x = points[end_point_x_index];
	var y = points[end_point_y_index];

	var move_func;
	if (shape["className"] == "Line")
		move_func = "moveArrowCenter";

	else if (shape["className"] == "RegularPolygon" || shape["className"] == "Circle")
		move_func = "movePolygonCenter";

	var move_center_func = {

		moveArrowCenter: function() {

			var rotation = rotation_obj["rotation"];
			var points = shape.points();

			var x_middle = (points[0] + points[points.length-2]) / 2;
			var y_middle = (points[1] + points[points.length-1]) / 4;

			//left-right
			if (rotation == 90) {
				y = y - y_middle;
			}

			//top-down
			else if (rotation == 180) {
				x = x + x_middle;
			}

			//right-left
			else if (rotation == 270) {
				y = y + y_middle;
			}

			//bottom-up
			else if (rotation == 360 || rotation == 0) {
				x = x - x_middle;
			}

			return {x: x, y: y};
		},

		movePolygonCenter: function() {
			var radius = shape.radius();
			var rotation = rotation_obj["rotation"];

			if (!radius)
				radius = 5;

			//var width = shape.width() / 2 || 0;
			var offset_x = radius * Math.cos((rotation - 90) * Math.PI / 180);
			x = x - offset_x;

			//var height = shape.height() / 2 || 0;
			var offset_y = radius * Math.sin((rotation - 90) * Math.PI / 180);
			y = y - offset_y;

			return {x: x, y: y};
		},

	};

	if (move_func)
		return move_center_func[move_func]();
	else {
		return {x: x, y: y};
	}
}

LineEndShape.prototype.getLineEndShapeSize = function(shape) {

	//var endShape = this;
	if (shape["type"] == "Arrow") {
		return {width: shape.width() / 2, height: shape.height()};
	}

	else if (shape["className"] == "RegularPolygon" || shape["className"] == "Circle") {
		var radius = shape.radius();
		if (!radius)
			return {width: 0, height: 0};
		else
			return {width: radius * 2, height: radius * 2};
	}
}

LineEndShape.prototype.updateEndShape = function(style) {

	var line_end = this;

	if (!style)
		return;

	//if no end shape is specified, then removing the end shape
	if (style["shape"] == "None") {
		line_end.removePresentation();
	}

	//if shape was changed
	else if (style["shape"] && style["shape"] != "None") {

		var shapes = line_end.presentation;

		//computing the style
		var base_style = {};
		if (shapes && shapes.length > 0) {
			base_style = shapes[0].getAttrs();
		}

		_.extend(base_style, style);

		//removing the shape
		line_end.removePresentation();

		//adding the  new shape
		line_end.addEndShapeRepresentation(base_style);
	}

	else {
		line_end.updateLineEndShapeStyle(style);
		line_end.computeLineEndShape();
	}
}

LineEndShape.prototype.removePresentation = function() {
	var line_end = this;

	_.each(line_end.presentation, function(shape) {
		shape.destroy();
	});

	line_end.presentation = [];
}

LineEndShape.prototype.updateLineEndShapeStyle = function(style) {
	var line_end = this;

	_.each(line_end.presentation, function(shape) {
		shape.setAttrs(style);
	});

}
