
SwimlaneCompartments = function(element, comparts_in) {

	var compartments = this;
	compartments.element = element;
	compartments.editor = element.editor;

	compartments.padding = 5;

	compartments.compartments = {};
	compartments.create(comparts_in);

	return compartments;
}

SwimlaneCompartments.prototype = {

	create: function(comparts_in) {

		var compartments = this;
		var editor = compartments.editor;

		//adding compartments
		var comparts = compartments.compartments;	
		_.each(comparts_in, function(compart_in) {

			if (!compart_in["value"])
				return;

			var compart = new Compartment(compartments, compart_in, compartments.element.presentation);

			var position = compart_in["swimlane"];
			compart["row"] = position["row"];
			compart["column"] = position["column"];
			compart["type"] = position["type"];

			compartments.add_text_handlers(compart);

			comparts[compart._id] = compart;
			editor.compartmentList[compart._id] = compart;			
			
			compart.presentation.moveToBottom();
		});

		//computing text position
		compartments.reposition_swimlane_compartments();
	},

	recomputeCompartmentsPosition: function() {
	},

	reposition_swimlane_compartments: function() {

		var compartments = this;
		var swimlane = compartments.element;
		var shape_group = swimlane.presentation;

		var cells = compartments.build_cells();

		var padding = compartments.padding;

		_.each(compartments.compartments, function(compartment) {

			var row = compartment["row"];
			var column = compartment["column"];

			var key = row + "," + column;
			var cell = cells[key];

			var text = compartment.presentation;

			if (column == 0) {

				var x = cell["x1"];
				var y = cell["y2"] - padding;

				text.x(x);
				text.y(y);

				var height = cell["x2"] - cell["x1"];
				var width = cell["y2"] - cell["y1"];

				text.width(width - (2 * padding));
				text.rotation(270);
			}

			else {

				var x = cell["x1"];
				var y = cell["y1"];

				text.x(x + padding);
				text.y(y);

				var width = cell["x2"] - cell["x1"];
				var height = cell["y2"] - cell["y1"];

				text.width(width - (2 * padding));
			}
		});
	},

	build_cells: function() {

		var compartments = this;
		var swimlane = compartments.element;
		var shape_group = swimlane.presentation;

		var h_lines_group = find_child(shape_group, "HorizontalLines");
		var h_lines = h_lines_group.children;
		var h_length = h_lines.length;

		var v_lines_group = find_child(shape_group, "VerticalLines");
		var v_lines = v_lines_group.children;
		var v_length = v_lines.length;

		var cells = {};
		_.each(h_lines, function(h_line, i) {

			var h_points = h_line.points();

			if (i == h_length-1)
				return;

			_.each(v_lines, function(v_line, j) {

				var v_points = v_line.points();

				var key = i + "," + j;

				if (j == v_length-1)
					return;

				var next_y = h_lines[i+1].points()[1];
				var next_x = v_lines[j+1].points()[0];

				cells[key] = {x1: v_points[0], x2: next_x,
								y1: h_points[3], y2: next_y,
								row: i, column: j,
							};
			});

		});

		return cells;
	},

	get_cell_key: function(swimlane) {

		var compartments = this;
		var editor = swimlane.editor;

		var mouse_state = editor.getMouseState();
		var mouse_x = mouse_state.mouseX;
		var mouse_y = mouse_state.mouseY;

		var cells = swimlane.compartments.build_cells();

		var size = swimlane.getSize();
		var x = size["x"];
		var y = size["y"];

		for (var key in cells) {

			var cell = cells[key];

			//building the cell rectangle (absolute position)
			var cell_rect = {x1: cell["x1"] + x,
							x2: cell["x2"] + x,
							y1: cell["y1"] + y,
							y2: cell["y2"] + y,
						};

			//checking if the mouse was clicked in this cell
			if (cell_rect["x1"] <= mouse_x && mouse_x <= cell_rect["x2"] && 
				cell_rect["y1"] <= mouse_y && mouse_y <= cell_rect["y2"]) {

				return {row: cell["row"], column: cell["column"]};
			}
		}
	},

	add_text_handlers: function(compartment) {

		var compartments = this;
		var editor = compartments.element.editor;

		var text = compartment.presentation;
		text.listening(true);

		text.on("dblclick", function(ev) {
	        editor.actions.startAction("SwimlaneTextEditing", compartment);
		});
	},

	removeOne: function(compart_id) {

		var compartments = this;
		var editor = compartments.editor;

		//refreshing the element
		var comparts_list = compartments.compartments;
		var compart = comparts_list[compart_id];
		if (compart)
			compart.remove();

		delete comparts_list[compart_id];
		delete editor.compartmentList[compart_id];

		var layer = compartments.element.presentation.getLayer();
		if (layer)
			layer.batchDraw();
	},

}