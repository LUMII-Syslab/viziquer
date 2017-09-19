
ConnectionPoints = function(editor) {
	var connectionPoints = this;
	connectionPoints.editor = editor;

	var layer = editor.getLayer("DrawingLayer");
	layer.hitGraphEnabled(true);

	connectionPoints.layer = layer;

	//adding start connection points parent
	var start_parent = new Konva.Group();
	layer.add(start_parent);
	connectionPoints.startParent = start_parent;

	//adding end connection points parent
	var end_parent = new Konva.Group();
	layer.add(end_parent);
	connectionPoints.endParent = end_parent;

	//connection points state
	connectionPoints.state = {};
}

ConnectionPoints.prototype = {

	addStartPoint: function(element) {
		var connectionPoints = this;	
		var state = connectionPoints.state;

		if (element.type != "Box")
			return;

		if (state.fixedStartElement)
			return;

		if (state.start && state.start.element && state.start.element._id == element._id)
			return;

		var points = connectionPoints.addConnectionPoints(element, connectionPoints.startParent);
		state.start = {element: element, points: points};
	},

	fixStartElement: function() {
		var connectionPoints = this;	
		var state = connectionPoints.state;

		state.fixedStartElement = state.start.element;
		state.activePoint = undefined;

		connectionPoints.removeStartPoints(true);
	},

	addEndPoint: function(element) {
		var connectionPoints = this;
		var state = connectionPoints.state;

		if (element.type != "Box")
			return;

		var fixed_start_elem = state.fixedStartElement;
		if (fixed_start_elem && fixed_start_elem._id == element._id)
			return;

		if (state.end && state.end.element && state.end.element._id == element._id)
			return;

		var points = connectionPoints.addConnectionPoints(element, connectionPoints.endParent);
		state.end = {element: element, points: points};
	},

	getEndElement: function() {
		var connectionPoints = this;
		if (connectionPoints.state && connectionPoints.state.end)
			return connectionPoints.state.end.element;
	},

	removeStartPoints: function(is_refresh_neeeded) {
		var connectionPoints = this;
		var state = connectionPoints.state;

		var direction = "start";
		connectionPoints.removeConnectionPoints(direction, is_refresh_neeeded);
	},

	removeEndPoints: function(is_refresh_neeeded) {
		var connectionPoints = this;
		var state = connectionPoints.state;

		var direction = "end";
		connectionPoints.removeConnectionPoints(direction, is_refresh_neeeded);
	},

	removeConnectionPoints: function(direction, is_refresh_neeeded) {

		var connectionPoints = this;
		var state = connectionPoints.state;

		if (!state[direction])
			return;

		//if mouse overed on one of the connection points
		if (connectionPoints.state.activePoint)
			return;

		connectionPoints[direction + "Parent"].destroyChildren();
		connectionPoints[direction + "Parent"].draw();
		
		if (state[direction])
			state[direction] = {};

		if (is_refresh_neeeded)
			connectionPoints.layer.batchDraw();
	},

	reset: function() {
		var connectionPoints = this;
		var state = connectionPoints.state;

		//removing all connection points
		connectionPoints.startParent.destroyChildren();		
		connectionPoints.endParent.destroyChildren();
		
		connectionPoints.state = {};
	},

	addConnectionPoints: function(box, parent) {

		var connectionPoints = this;
		var connection_point_positions = box.computeConnectionPointPositions();
		
		return connectionPoints.addConnectionPointsFromList(box, connection_point_positions, parent);
	},

	addConnectionPointsFromList: function(box, positions, parent) {
		var connectionPoints = this;

		return _.map(positions, function(position) {
			return connectionPoints.addConnectionPoint(position, parent);
		});
	},

	addConnectionPoint: function(list, parent) {

		var connectionPoints = this;

		//creates resizer rect
		var connection_point = new Konva.Circle({
												x: list["x"],
												y: list["y"],
												radius: list["radius"],

												fill: list["defaultFill"],
												stroke: list["defaultStroke"],
												strokeWidth: 0.4,
												perfectDrawEnabled: false,
											});
		parent.add(connection_point);

		connection_point.moveToTop();

		connection_point.on('mouseover', function(e) {

			set_cursor_style("move");

			var editor = connectionPoints.editor;
			connectionPoints.state.activePoint = connection_point;

			connection_point.fill(list["activeFill"]);
			connection_point.stroke(list["activeStroke"]);

			connectionPoints.layer.batchDraw();
		});

		connection_point.on('mouseleave', function(e) {

			connectionPoints.state.activePoint = undefined;

			connection_point.fill(list["defaultFill"]);
			connection_point.stroke(list["defaultStroke"]);

			connectionPoints.layer.batchDraw();

			var editor = connectionPoints.editor;
			editor.actions.state.cancelMove = false;
		});
	
		connection_point.on('mousedown', function(e) {

			var editor = connectionPoints.editor;

			set_cursor_style('crosshair');

			editor.actions.reset();
			editor.mouseState.mouseDown(e);

			var mouse_state = editor.getMouseState();
			mouse_state.mouseX = connection_point.x();
			mouse_state.mouseY = connection_point.y();

			var element = connectionPoints.state.start.element;
			editor.actions.startAction("NewElement", element);
		});

		parent.draw();

		return connection_point;
	},

	getActiveConnectionPoint: function() {
		var connectionPoints = this;

		var state = connectionPoints.state;
		var end_elem = state.end;

		//if (end_elem && end_elem.element) {
			return state.activePoint;
		//}

		return;
	},

}

// function is_line_end_in_indicator2_area(radius, list) {

// 	var stage = get_editor();
// 	var action = stage["action"];
// 	if (!action)
// 		return;

// 	var new_line = action["element"];
// 	if (!new_line)
// 		return;

// 	var points = get_line_points(new_line);
// 	var len = points.length;
		
// 	var last_point = [points[len-2] - list["elementX"], points[len-1] - list["elementY"]];

// 	return is_point_in_area(list["x"] - radius, list["y"] - radius,
// 							list["x"] + radius, list["y"] + radius, last_point);

// }



// is_point_in_area = function(x1, y1, x2, y2, point) {

// 	if (x1 < point[0] && point[0] < x2 && y1 < point[1] && point[1] < y2) {
// 		return true;
// 	}

// }