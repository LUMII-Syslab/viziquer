
MovingSwimlane = function(line, swimlane) {

	var moving = this;
	moving.line = line;
	moving.swimlane = swimlane;

	moving.state = {};
}

MovingSwimlane.prototype = {

	startDragging: function() {

		var moving = this;
		var line = moving.line;
		var swimlane = moving.swimlane;

		var index = line["index"];
		var prev_line, next_line;

		//selecting the previous and the next line
		var line_parent = line.parent;
		_.each(line_parent.children, function(tmp_line) {

			if (tmp_line["index"] == index-1) 
				prev_line = tmp_line;

			else if (tmp_line["index"] == index + 1)
				next_line = tmp_line;
		});

		var prev_size, next_size;
	    if (line["name"] == "horizontal") {

	    	var row = line["index"];
		 	prev_size = swimlane.getSwimlaneMaxTextSize(row-1);
		 	next_size = swimlane.getSwimlaneMaxTextSize(row);
	 	}

	 	else if (line["name"] == "vertical") {

	    	var column = line["index"];
		 	prev_size = swimlane.getSwimlaneMaxTextSize(undefined, column-1);
		 	next_size = swimlane.getSwimlaneMaxTextSize(undefined, column);
	 	}

	 	moving.state = {
						prevLine: prev_line,
						nextLine: next_line,

						prevSize: prev_size,
						newxtSize: next_size,
					};
	},

	dragging: function() {

		var moving = this;
		var swimlane = moving.swimlane;
		var editor = swimlane.editor;
		var line = moving.line;

		//selecting lines
		var state = moving.state;
		var prev_line = state["prevLine"];
		var next_line = state["nextLine"];

	 	var prev_size = state["prevSize"];
	 	var next_size = state["newxtSize"];	

		var element = state["element"];
		var size = swimlane.getSize();

		//computing mouse position
		var mouse_state = editor.getMouseState();
	    var mouse_x = mouse_state["mouseX"] - size["x"];
	    var mouse_y = mouse_state["mouseY"] - size["y"];

	    var points = line.points();

	    //computing the limits
		var prev_size, next_size, mouse_pos, index;
	    if (line["name"] == "horizontal") {
	    	index = 1;
	    	mouse_pos = mouse_y;
	 	}

	 	else if (line["name"] == "vertical") {
	 		index = 0;
	 		mouse_pos = mouse_x;
	 	}

	 	var PADDING = 10;

	 	//computing the allowed previous line position
		var prev;
		if (prev_line) {
			prev = prev_line.points()[index];
		
			if (prev_line["name"] == "vertical")
				prev = prev + prev_size["width"] + PADDING;

			else if (prev_line["name"] == "horizontal")
				prev = prev + prev_size["height"] + PADDING;
		}

		else {
			prev = Number.NEGATIVE_INFINITY;
		}

		//computing the next line position
		var next;
		if (next_line) {
			next = next_line.points()[index];

			if (next_line["name"] == "vertical")
				next = next - next_size["width"] - PADDING;

			else if (next_line["name"] == "horizontal")
				next = next - next_size["height"] - PADDING;
		}

		else {
			next = Number.POSITIVE_INFINITY;
		}

		//computing the new position
	 	var new_pos = moving.compute_line_position(prev, next, mouse_pos);

	 	//recomputing the line
		var new_points = moving.recompute_line_points(index, points, new_pos);

		//adding new points
	    line.points(new_points);

	    //if the moved line is outer line, then managing other lines length
	   	moving.move_outer_line(new_points, prev_line, next_line);

	    //recomputing compartment position
		moving.swimlane.compartments.reposition_swimlane_compartments();

	    var swimlane_layer = editor.getLayer("SwimlaneLayer");
	    swimlane_layer.batchDraw();
	},

	finishDragging: function() {

		var moving = this;
		var swimlane = moving.swimlane;
		var editor = swimlane.editor;
		
		new Event(editor, "swimlaneEdited", swimlane);

		moving.state = {};
	},

	compute_line_position: function(prev, next, mouse_pos) {

		if (!mouse_pos)
			mouse_pos = 0;

		var new_pos;

		//if mouse is between prev and next line
		if (prev <= mouse_pos && mouse_pos <= next) 
			new_pos = mouse_pos;

		//if mouse is before prev line
		else if (prev > mouse_pos)
			new_pos = prev;

		//if mouse is after next line 
		else if (next < mouse_pos)
			new_pos = next;

		return new_pos;
	},

	move_outer_line: function(new_points, prev_line, next_line) {

		var moving = this;
		var line = moving.line;

		//if the first line is moved
	    if (!prev_line) {

	   		if (line["name"] == "horizontal")
	   			moving.move_outer_line_obj(new_points, "VerticalLines", 1);

	   		else if (line["name"] == "vertical")
	   			moving.move_outer_line_obj(new_points, "HorizontalLines", 0);
	    }

	    //if the last line is moved
	   	if (!next_line) {

	   		if (line["name"] == "horizontal")
	   			moving.move_outer_line_obj(new_points, "VerticalLines", 3);
	 
	   		else if (line["name"] == "vertical")
				moving.move_outer_line_obj(new_points, "HorizontalLines", 2);
	   	}
	},

	move_outer_line_obj: function(new_points, line_group_name, index) {

		var moving = this;
		var line = moving.line;
		var swimlane = moving.swimlane;
		var shape_group = swimlane.presentation;

		//adjusting lines length
		var lines_group = find_child(shape_group, line_group_name);
		_.each(lines_group.getChildren(), function(line) {
			var points = line.points();
			points[index] = new_points[index];
			line.points(points);
		});
	},

	recompute_line_points: function(index, points, new_pos) {

		//setting the new points
	    points[index] = new_pos;
	    points[index + 2] = new_pos;

		return points;
	},

}

