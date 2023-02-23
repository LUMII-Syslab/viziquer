
Link = function(editor) {
	var link = this;
	link.editor = editor;
	link.type = "Line";

}

Link.prototype = {

	create: function(parent, element) {

		var link = this;
		link._id = element["_id"];

		link.render(parent, element);

		var shape_group = link.presentation;

		//adding texts group
		var texts_group = new Konva.Group({});
			texts_group["name"] = "TextsGroup";
		shape_group.add(texts_group);

		//adds element compartments
		link.compartments = new LinkCompartments(link, element["compartments"]);

		//draws hit region
		link.drawHitRegion(parent, element["style"]["lineType"]);

		link.handlers = new ElementHandlers(link);

		link.startElementId = element["startElement"];
		link.endElementId = element["endElement"];
	},

	render: function(parent, list) {
		
		var link = this;

		//shape group stores shape and all its properties in one element
		var shape_group = new Konva.Group({});
			shape_group["name"] = "ShapeGroup";

		var style = list["style"];
		var line_style = style["elementStyle"];
		line_style["points"] = list["points"];
		line_style["perfectDrawEnabled"] = false;

		//box.shapes[0].transformsEnabled('position');
		//line_style.transformsEnabled = "position";

		//draws the line
		var new_line = new Konva.Line(line_style);
			new_line["name"] = "Line";

		//add the shape to the shape group
		shape_group.add(new_line);
		link.line = new_line;		

	//TODO vajag rename, nav labi nosaukumi
		//creates line start and end shape
		link.startElement = new LineEndShape(link, "Start", style["startShapeStyle"]);
		link.endElement = new LineEndShape(link, "End", style["endShapeStyle"]);

		//adding element group
		var texts_group = new Konva.Group({listening: false});
			texts_group["name"] = "TextsGroup";
		shape_group.add(texts_group);

		parent.add(shape_group);

		link.presentation = shape_group;

		link.lineType = style["lineType"];	
		link.elementTypeId = list["elementTypeId"];
		link.data = list.data;
	},

	getPoints: function() {
		var link = this;
		var line = link.line;

		return line.points();
	},

	setPoints: function(points) {

		var link = this;
		var line = link.line;

		//setting new line pointss
		if (line) {
			line.points(points);
		}

		//recomputing line's start shape rotation and position
		link.startElement.computeLineEndShape();
		link.endElement.computeLineEndShape();

		//recomuting line's text label positions
		var compartments = link.compartments;
		if (compartments) {
			compartments.computeGroupsPositions();
		}

		return link;
	},

	rerouteLine: function(line_points, state) {

		var link = this;

		if (link["lineType"] == "Direct") {
			link.setPoints(line_points);
		}

		else if (link["lineType"] == "Orthogonal") {
			link.setPoints(line_points);
			OrthogonalRerouting.recompute(link, state);
		}
	},

	drawHitRegion: function(parent) {

		var link = this;

		var line_type = link.lineType;

		var line = link.line;
		if (!line) {
			return;
		}

		// var context = line.getContext();

		line.hitFunc(function(context) {

		   	function move_point(index, offset, direction) {

				if (link.is_vertical(points, index)) {

					var w = compute_width(index, link.is_up, direction);

					last_x = last_x + w;
					context.lineTo(last_x, last_y);

					last_y = points[index + offset + 1];
					context.lineTo(last_x, last_y);  
				}

				else if (link.is_horizontal(points, index)) {

					var w = compute_width(index, link.is_right, direction);

					last_y = last_y + w;
					context.lineTo(last_x, last_y);

					last_x = points[index + offset]; 
					context.lineTo(last_x, last_y);
				}
		   	}

			function compute_width(index, func, direction) {

				if (func(points, index))
					if (direction == "to")
						return width;
					else
						return -width;
				else
					if (direction == "to")
						return -width;
					else
						return width;
			}

			//console.log("draw hit region")

			var editor = link.editor;
			var zoom = editor.getZoom();
			var zoom_x = zoom.x;
			var zoom_y = zoom.y;

			var points = link.getPoints();
		    var len = points.length;
		    var width = 4;

	    	if (line_type == "Orthogonal") {

	    		var last_x = points[0];
	    		var last_y = points[1];

			    context.beginPath();

			    //starting with the line start point
			    context.moveTo(last_x, last_y);

			    //going to the line end-point
			    for (var i=0;i<len;i=i+2) {
			    	move_point(i, 2, "to");
			    }

			    //setting the line's last point
			    last_x = points[len-2];
			    last_y = points[len-1];

			    context.lineTo(last_x, last_y);

			    //coming back
			    for (var i=len-2;i>=0;i=i-2) {
			    	move_point(i, 0, "back");
			    }

			    context.closePath();
			    context.fillStrokeShape(this);
			}

			else if (line_type == "Direct") {

				context.beginPath();
			    context.moveTo(points[0], points[1]);
			    context.lineTo(points[2], points[3]);
			    context.closePath();

			    var orgWidth = this.getStrokeWidth();
			    this.setStrokeWidth(width * 2);
			    context.fillStrokeShape(this);
			    this.setStrokeWidth(orgWidth);
			}
		});
	},

	setUnselectedStyle: function() {
		var line = this;		
		line.setStyle({elementStyle: {shadowBlur: 0}}, "elementStyle");
	},

	setSelectedStyle: function() {
		var line = this;
		var editor = line.editor;

		var style = {elementStyle: {shadowEnabled: true, shadowColor: "red", shadowBlur: 15}};
		line.setStyle(style, "elementStyle");
	},

	setStyle: function(style_obj, element_part_name) {

		var link = this;

		//if line part is specified, then updating just the part of the line
		if (element_part_name) {
			link.updateStylePart(style_obj, element_part_name);
		}

		//if no end part is specified, then updating all line parts
		else {
			link.updateStylePart(style_obj, "elementStyle");
			link.updateStylePart(style_obj, "startShapeStyle");
			link.updateStylePart(style_obj, "endShapeStyle");
		}
	},

	updateStylePart: function(style_obj, element_part_name) {

		var link = this;
		var element = link.presentation;;

		var style = style_obj[element_part_name];
		if (!style)
			return;

		//updating line
		if (element_part_name == "elementStyle") {
			var presentation_obj = link.line;
			presentation_obj.setAttrs(style);
		}

		//updating end shape
		else {

			var line_end;
			if (element_part_name == "startShapeStyle") {
				line_end = link.startElement;
			}

			else if (element_part_name == "endShapeStyle") {
				line_end = link.endElement;
			}

			if (!line_end)
				return;

			line_end.updateEndShape(style);
		}
	},

	is_vertical: function(points, index) {
		if (points[index] === points[index + 2])
			return true;
		else
			return false;
	},

	is_horizontal: function(points, index) {
		if (points[index + 1] === points[index + 3])
			return true;
		else
			return false;
	},

	is_up: function(points, index) {
		if (points[index + 1] > points[index + 3])
			return true;
		else
			return false;
	},

	is_right: function(points, index) {
		if (points[index] < points[index + 2])
			return true;
		else
			return false;
	},

	remove: function() {
		var link = this;
		link.editor.removeElements([link._id]);
	},

	isSelectedWithBothEnds: function() {

		var link = this;
		var editor = link.editor;

		if (!editor.isEditMode())
			return;

		var start_elem_id = link.startElementId;
		var end_elem_id = link.endElementId;

		var selected = editor.getSelectedElements();
		//if (selected[link._id] && selected[start_elem_id] && selected[end_elem_id])
		if (selected[start_elem_id] && selected[end_elem_id])
			return true;
	},

	convertToAbsolutePoints: function(line_points) {
		var link = this;
		if (link.isSelectedWithBothEnds())
			link.transformLinePointsToSelected(line_points);
	},

	transformLinePointsToSelected: function(line_points) {
		var link = this;
		link.transformLinePoints(line_points, 1);
	},

	transformLinePointsToUnselected: function(line_points) {
		var link = this;

		if (link.isSelectedWithBothEnds())
			link.transformLinePoints(line_points, -1);
	},

	transformLinePoints: function(line_points, direction) {

		var link = this;
		var editor = link.editor;

		var drag_layer = editor.getLayer("DragLayer");
		var drag_group = find_child(drag_layer, "DragGroup");

		var delta_x = drag_group.x();
		var delta_y = drag_group.y();

		_.each(line_points, function(item, i) {
			if (i%2 == 0)
				line_points[i] = line_points[i] + direction * delta_x;
			else
				line_points[i] = line_points[i] + direction * delta_y;
		});
	},

	buildSVG: function() {
		//TODO: needs implementation

	},

}

