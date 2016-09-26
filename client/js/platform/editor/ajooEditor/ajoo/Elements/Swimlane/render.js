
Swimlane = function(editor) {

	var swimlane = this;
	swimlane.editor = editor;
	swimlane.type = "Swimlane";
}

Swimlane.prototype = Object.create(Box.prototype);
Swimlane.prototype.constructor = Swimlane;

Swimlane.prototype.render = function(parent, element) {

	var swimlane = this;
	var editor = swimlane.editor;

	//creating a new box object
	element["parent"] = parent;

	var new_swimlane_obj = swimlane.createShape(element);

	var location = element["location"];
	var shape_group = new Konva.Group({x: location["x"], y: location["y"]});
		shape_group["name"] = "ShapeGroup";
		shape_group["objId"] = element["_id"];
		shape_group["type"] = "Box";

	parent.add(shape_group);
	shape_group.moveToBottom();

	swimlane.presentation = shape_group;
	swimlane.linkShapesToParent(shape_group, new_swimlane_obj);
	swimlane.shapes = new_swimlane_obj.element;

	//swimlane properties
	swimlane._id = element._id;
	swimlane.inLines = {};
	swimlane.outLines = {};

	//adding swimlane to the element list
	var element_list = editor.getElements();
	element_list[swimlane._id] = swimlane;

	//rendering swimlane compartments
	var compartments = element["compartments"];
	swimlane.compartments = new SwimlaneCompartments(swimlane, compartments);
}

Swimlane.prototype.create = function(parent, element) {

	var swimlane = this;
	swimlane.layer = parent;

	swimlane._id = element["_id"];

	swimlane.render(parent, element);
	swimlane.addHandlers();

	//refreshin swimlane layer
	swimlane.layer.draw();
}

Swimlane.prototype.createShape = function(prop_list) {

	var swimlane = this;
	var editor = swimlane.editor;

	var element = [];

	//horizontal rows
	var h_group = new Konva.Group({});
		h_group["name"] = "HorizontalLines";
	element.push(h_group);

	var data = prop_list["swimlane"];

	var h_lines = data["horizontalLines"];
	swimlane.addSwimlaneLines(h_lines, "horizontal", h_group);

	//vertical rows
	var v_group = new Konva.Group({});
		v_group["name"] = "VerticalLines";
	element.push(v_group);

	var v_lines = data["verticalLines"];
	swimlane.addSwimlaneLines(v_lines, "vertical", v_group);

	return {element: element};
}

Swimlane.prototype.addSwimlaneLines = function(positions, h_or_w, parent) {

	var swimlane = this;
	_.each(positions, function(points, i) {
		swimlane.addSwimlaneLine(points, h_or_w, parent, i);
	});
}

Swimlane.prototype.addSwimlaneLine = function(points, h_or_w, parent, i) {
	var line = new Konva.Line({points: points, stroke: "black", strokeWidth: 1});

	line["name"] = h_or_w;
	line["index"] = i;

	parent.add(line);
}

Swimlane.prototype.addHandlers = function() {

	var swimlane = this;
	var shape_group = swimlane.presentation;

	var h_lines_group = find_child(shape_group, "HorizontalLines");
	swimlane.addHandlersToLine(h_lines_group.getChildren());

	var v_lines_group = find_child(shape_group, "VerticalLines");
	swimlane.addHandlersToLine(v_lines_group.getChildren());

}

Swimlane.prototype.addHandlersToLine = function(lines) {
	var swimlane = this;

	_.each(lines, function(line, i) {

		//adding line's hit region
		line.hitFunc(function(context) {

			var points = line.points();

			context.beginPath();
		    context.moveTo(points[0], points[1]);
		    context.lineTo(points[2], points[3]);
		    context.closePath();

		    var orgWidth = this.getStrokeWidth();
		    this.setStrokeWidth(2 * 2);
		    context.fillStrokeShape(this);
		    this.setStrokeWidth(orgWidth);
		});

		//intitializing swimlane internal line moving
		line.on('mousedown', function(ev) {
			ev.cancelBubble = true;
			if (ev.evt.which == 1) 
		 		swimlane.editor.actions.startAction("EditingSwimlane", {line: line, swimlane: swimlane});

		});

		line.on('mouseup', function(ev) {
			ev.cancelBubble = true;

			if (ev.evt.which == 3) {
				var editor = swimlane.editor;
				editor.actions.state.mouseUp = true;
				editor.data.line = line;

		 		new Event(swimlane.editor, "rClickedOnElement", {ev: ev, element: swimlane});
			}
		});

		line.on('mouseover', function(ev) {

			if (line["name"] == "horizontal")
				set_cursor_style("n-resize");

			else if (line["name"] == "vertical")
				set_cursor_style("w-resize");
		});

		line.on('mouseleave', function(ev) {
			set_cursor_style("default");
		});

	});
}

Swimlane.prototype.getSwimlaneMaxTextSize = function(row, column) {

	var swimlane = this;
	var compartments = swimlane.compartments;

	var max_width = 0;
	var max_height = 0;

	_.each(compartments.compartments, function(compartment) {

		var text = compartment.presentation;

		if (compartment["row"] == row || compartment["column"] == column) {

			//if the text is not rotated
			if (text.rotation() == 0) {

				max_width = Math.max(max_width, text.getTextWidth());
				max_height = Math.max(max_height, text.getTextHeight());
			}

			//if the text is rotated
			else if (text.rotation() == 270) {

				max_height = Math.max(max_height, text.getTextWidth());
				max_width = Math.max(max_width, text.getTextHeight());
			}
		}

	});

	return {width: max_width, height: max_height};
}
	
Swimlane.prototype.add_swimlane_row = function(line_index) {
	this.add_swimlane_row_or_column(line_index, 1, "HorizontalLines", "VerticalLines");	
}

Swimlane.prototype.add_swimlane_column = function(line_index) {
	this.add_swimlane_row_or_column(line_index, 0, "VerticalLines", "HorizontalLines");
}

Swimlane.prototype.add_swimlane_row_or_column = function(line_index, index, lines_group1, lines_group2) {

	var swimlane = this;

	//size for the new row or column
	var delta = 150;

	var new_line_positions = [];

	//reposition horizontal lines
	var shape_group = swimlane.presentation;
	var vertical_lines_group = find_child(shape_group, lines_group1);
	_.each(vertical_lines_group.getChildren(), function(line, i) {

		var points = line.points();

		//inserting a new line
		if (i == line_index) {

			//if vertical line
			if (index == 0) {
				var x = points[0];
				new_line_positions.push([x, 0, x, points[3]]);
			}

			//if horizontal line
			else {
				var y = points[1];
				new_line_positions.push([0, y, points[2], y]);	
			}
		}

		//moving each line by delta
		if (i >= line_index) {
			points[index] = points[index] + delta;
			points[index + 2] = points[index + 2] + delta;
		}

		//collecting lines
		new_line_positions.push(points);
	});

	//recomputing compartments
	swimlane.recompute_compartments(lines_group2, line_index);

	swimlane.replacing_swimlane(new_line_positions, lines_group2, index);
}

Swimlane.prototype.replacing_swimlane = function(new_line_positions, lines_group_name, index) {

	var swimlane = this;

	//selecting the first line's position
	var first_pos = new_line_positions[0][index];

	//selecting the last line's position
	var last_pos = new_line_positions[new_line_positions.length-1][index + 2];

	var new_points = [{index: index, value: first_pos},
						{index: index + 2, value: last_pos}];

	var shape_group = swimlane.presentation;
	var lines_group = find_child(shape_group, lines_group_name);

	var data;

	//selecting orthogonal lines
	if (lines_group_name == "VerticalLines") {
		data = {horizontalLines: new_line_positions,
				verticalLines: swimlane.select_lines_position(lines_group, new_points)}
	}

	else {
		data = {horizontalLines: swimlane.select_lines_position(lines_group, new_points),
				verticalLines: new_line_positions};
	}

	swimlane.buildSwimlaneObject(data);
}

Swimlane.prototype.select_lines_position = function(lines_group, new_points) {

	return _.map(lines_group.getChildren(), function(line, i) {

		var points = line.points();

		//updating line's length
		_.each(new_points, function(item) {
			points[item["index"]] = item["value"];
		});

		return points;
	});

}

Swimlane.prototype.recompute_compartments = function(lines_group_name, line_index) {
	var swimlane = this;

	var index_obj = {};
	if (lines_group_name == "VerticalLines") 
		index_obj = {rows: line_index};
	else
		index_obj = {columns: line_index};

	return swimlane.recompute_compartments_by_index(index_obj);
}

Swimlane.prototype.recompute_compartments_by_index = function(line_index) {

	var swimlane = this;

	var r_index = line_index["rows"];
	var c_index = line_index["columns"];

	_.each(swimlane.compartments.compartments, function(compartment) {

		//increasing row index
		var row = compartment.row;		
		if (row >= r_index)
			row = row + 1;

		//increasing column index
		var column = compartment.column;		
		if (column >= c_index)
			column = column + 1;

		compartment.row = row;
		compartment.column = column;
	});

}

Swimlane.prototype.remove_swimlane_row = function(line_index) {
	this.remove_swimlane_row_or_column(line_index, 1, "HorizontalLines", "VerticalLines");
}

Swimlane.prototype.remove_swimlane_column = function(line_index) {
	this.remove_swimlane_row_or_column(line_index, 0, "VerticalLines", "HorizontalLines");
}

Swimlane.prototype.remove_swimlane_row_or_column = function(line_index, index, lines_group1, lines_group2) {

	var swimlane = this;
	
	//reposition horizontal lines
	var shape_group = swimlane.presentation;

	//selecting lines
	var lines_group = find_child(shape_group, lines_group1);
	var lines = lines_group.getChildren();

	//there should be atleast 2 lines
	if (lines.length <= 2)
		return;

	var new_line_positions = [];

	var delta;
	_.each(lines, function(line, i) {

		var points = line.points();

		//removing a line
		if (i == line_index) {

			//if removing the last line
			var next_line = lines[line_index + 1];
			if (!next_line)
				return;

			var next_points = next_line.points();

			//if vertical line
			if (index == 0) {
				delta = next_points[0] - points[0];
			}

			//if horizontal line
			else {
				delta = next_points[1] - points[1];
			}

			return;
		}

		//moving each line by delta
		if (i >= line_index) {
			points[index] = points[index] - delta;
			points[index + 2] = points[index + 2] - delta;
		}

		//collecting lines
		new_line_positions.push(points);
	});

	//recomputing compartments
	swimlane.recompute_compartments_after_remove(lines_group2, line_index);	

	swimlane.replacing_swimlane(new_line_positions, lines_group2, index);
}

Swimlane.prototype.recompute_compartments_after_remove = function(lines_group, line_index) {

	var swimlane = this;

	//selecting which row or column was removed
	var r_index, c_index;
	if (lines_group == "VerticalLines")
		r_index = line_index;

	else
		c_index = line_index;


	//recomputing all the texts
	var compartments = swimlane.compartments.compartments;
	_.each(compartments, function(compartment) {

		var row = compartment["row"];
		var column = compartment["column"];

		//removing compartment
		if (row == r_index || column == c_index) {
			delete compartments[compartment._id];
			return;
		}

		//decreasing row or column index for the following compartments
		if (row > r_index)
			row = row - 1;

		if (column > c_index)
			column = column - 1;

		compartment.row = row;
		compartment.column = column;

		compartments[compartment._id] = compartment;
	});

}

Swimlane.prototype.buildSwimlaneObject = function(data) {

	var swimlane = this;

	var style = {elementStyle: {shape: "Swimlane"}};

	//selecting the size and position of the swimlane
	var size = swimlane.getSize();

	var compartments = _.map(swimlane.compartments.compartments, function(compart) {

		return {_id: compart._id,
				input: compart.input,
				value: compart.value,
				swimlane: {row: compart.row,
							column: compart.column,
							type: compart.type,
						},
				style: compart.presentation.getAttrs(),
			};
	});

	//the new swimlane object
	var new_swimlane_prop = { 
							style: style,
							location: {
								x: size["x"],
								y: size["y"],
								width: size["width"],
								height: size["height"],
							},
							compartments: compartments,
							type: "Box",
							_id: swimlane._id,

							swimlane: data,
						};

	//adding new swimlane
	var new_swimlane = new Swimlane(swimlane.editor);

	var layer = swimlane.presentation.getParent();
	new_swimlane.create(layer, new_swimlane_prop);

	//removing old swimlane
	swimlane.presentation.destroy();

	layer.draw();
}

Swimlane.prototype.rerender_swimlane = function(line_obj) {

	var swimlane = this;

	swimlane.buildSwimlaneObject(line_obj);
}

Swimlane.prototype.getSize = function() {

	var swimlane = this;
	var swimlane_presentation = swimlane.presentation;

	var h_lines_group = find_child(swimlane_presentation, "HorizontalLines");
	var h_lines = h_lines_group.children;

	var v_lines_group = find_child(swimlane_presentation, "VerticalLines");
	var v_lines = v_lines_group.children;

	var x = swimlane_presentation.x();
	var y = swimlane_presentation.y();

	//x points
	var h_line = h_lines[0].points();
	var x1 = h_line[0] + x;
	var x2 = h_line[2] + x;

	//y points
	var v_line = v_lines[0].points();
	var y1 = v_line[1] + y;
	var y2 = v_line[3] + y;

	return {x: x1, y: y1, width: (x2 - x1), height: (y2 - y1), x2: x2, y2: y2};
}

