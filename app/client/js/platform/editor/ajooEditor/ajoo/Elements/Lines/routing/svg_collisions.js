
SVGObject = function(shape_path) {

    if (!shape_path)
        return;

    var pathes_in;
    if (typeof shape_path == "string") {
        pathes_in = [shape_path];
    }

    else {
        pathes_in = shape_path;
    }

    var path_nodes = [];
    _.each(pathes_in, function(path) {

        var svg = document.createElement('svg');
        var path_node = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        path_node.setAttribute("d", path);

        path_nodes.push(path_node);
    });

    return path_nodes;
}


LineSVGObject = function(points, index) {

	var line_svg = this;
	line_svg.points = points;
	line_svg.svgLine = line_svg.buildSVGLine(points, index);

	return line_svg;
}

LineSVGObject.prototype = {

	buildSVGLine: function(points, index) {

		var line_svg = this;
		var x1, y1, x2, y2;

		var line_path = line_svg.build_line_path(points);
		return new SVGObject(line_path);
	},

	getIntersectionWithElement: function(element, line_point) {
		var line_svg = this;

		var line_svg_obj = line_svg.svgLine;
		var shape_svg_obj = element.buildSVG();

		if (line_svg_obj && shape_svg_obj) {
			var inter_points = line_svg.computeIntersection(shape_svg_obj, line_svg_obj);
			return line_svg.get_closest_point_from_intersections(line_point, inter_points);
		}
			
		else {
			return {points: []};
		}

	},

	computeIntersection: function(shape_svg_obj) {
		var line_svg = this;
		return compute_intersection(shape_svg_obj, line_svg.svgLine)["points"];
	},


	isIntersectionWithElement: function(element) {
		var line_svg = this;
	},

	get_negative_infinity: function() {
		var line_svg = this;
		return -line_svg.get_positive_infinity();
	},

	get_positive_infinity: function() {
		return 100000;
	},

	get_closest_point_from_intersections: function(segment_start_point, inter_points) {
		
		var line_svg = this;

		var min_distance = Infinity;
		var closest_point;
		_.each(inter_points, function(inter_point) {

			var tmp_point = [inter_point["x"], inter_point["y"]];

			var distance = line_svg.compute_distance_between_points(segment_start_point, tmp_point);
			if (distance < min_distance) {
				min_distance = distance;
				closest_point = tmp_point;
			}
		});

		return {point: closest_point, distance: min_distance};
	},

	compute_distance_between_points: function(point1, point2) {
		var a = point1[0] - point2[0];
		var b = point1[1] - point2[1];

		return Math.sqrt(a * a + b * b);
	},

	build_line_path: function(points) {

	    var path = "";

	    //building the path
	    for (var i=0;i<points.length;i=i+2) {
	        if (i == 0)
	            path = "M" + points[i] + "," + points[i+1];

	        else
	            path = path + " L" + points[i] + "," + points[i+1];
	    }

	    return [path];
	},

}

