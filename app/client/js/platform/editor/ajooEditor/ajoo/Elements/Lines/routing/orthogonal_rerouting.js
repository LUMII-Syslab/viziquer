
OrthogonalRerouting = {

	recompute: function(line, state) {

		var rerouting = this;
		var editor = line.editor;
		var elem_list = editor.getElements();

		var start_elem = elem_list[line.startElementId];
		var end_elem = elem_list[line.endElementId];

	    //selecting lines
		var lines = {linkedLines: [], draggedLines: [], allLines: []};
		start_elem.collectLinkedLines(lines);
		end_elem.collectLinkedLines(lines);

		//selecting boxes
		var boxes = [start_elem, end_elem];

		//building graph
		var graphInfo = OrthogonalCollectionRerouting.buildGraphInfo(editor, [], lines.linkedLines, lines.draggedLines);

	    var path = graphInfo.infoDataMap[line._id];

		var index = state.index;
	    graphInfo.onDragSegm(path, index / 2);

	    var new_points = rerouting.transformFromLevToPoints(path);
	    line.setPoints(new_points);
	},

	testOrthogonalPoints: function(points, text) {

		var rerouting = OrthogonalRerouting;

	    if (rerouting.has_NaN_value(points)) {
	        console.error("### test_points_orthogonal ###", text, " points has NaN value", points);
	        return false;
	    }

	    var len = points.length - 2;
	    var i = 0;

	    while (i < len && (rerouting.isSegmentVertical(points, i) && rerouting.isSegementHorizontal(points, i))) 
	        i += 2;

	    if (i >= len) {
	        return true;
	    }

	    var dir = (rerouting.isSegmentVertical(points, i)) ? 1 : 0;

	    for (i = i; i < len; i += 2) {
	        if (points[i + dir] != points[i + 2 + dir]) {
	            return false;
	        }
	        dir = 1 - dir;
	    }

	    return true;
	},

	isSegementHorizontal: function(points, i) {
	    return points[i + 1] === points[i + 3];
	},

	isSegmentVertical: function(points, i) {
	    return points[i] === points[i + 2];
	},

	has_NaN_value: function(points) {
	    for (var i = 0; i < points.length; i++)
	        if (isNaN(points[i]))
	            return true;
	        
	    return false;
	},

	transformFromLevToPoints: function(path) {

		var rerouting = OrthogonalRerouting;

	    var new_points = [];

	    var dir = path.dir; 
	    var len = path.lev.length;

	    for (var i = 1; i < len; i++) {
	        new_points.push(path.lev[i - 1 + dir], path.lev[i - dir]);
	        dir = 1 - dir;
	    }

	    rerouting.testOrthogonalPoints(new_points, "transform_from_lev_to_points");
	    return new_points;
	},

	transformPointsToLev: function(points_in) {

		var rerouting = OrthogonalRerouting;

	    rerouting.testOrthogonalPoints(points_in, "transform_points_to_lev");
	    var direction;

	    //if line is horizontal
	    if (rerouting.isSegementHorizontal(points_in, 0)) {
	        direction = 0;
	    }

	    //if line is vertical
	    else if (rerouting.isSegmentVertical(points_in, 0)) {
	        direction = 1;
	    }

	    var lev = [];   
	    var dir = direction;
	    lev.push(points_in[dir]);

	    for (var i=0;i<points_in.length;i=i+2) {

	        dir = 1 - dir;

	        lev.push(points_in[i + dir]);
	    } 

	    return {points: lev, direction: direction};
	},

	addBoxToGraphInfo: function(box_in, graphInfo) {

		var box;
		if (box_in.resizedElement) {
			box = box_in.resizedElement;
		}
		else {
			box = box_in;
		}

    	var size = box.getElementPosition();

    	var start_width = size["width"];
    	var start_height = size["height"];
    	var start_center_x = start_width / 2 + size["x"];
    	var start_center_y = start_height / 2 + size["y"];
 	

    	var type_name = "";
    	if (box.elementTypeId) {
    		var splited_arr = box.elementTypeId.split(".");
    		type_name = splited_arr[splited_arr.length - 1];
    	}

    	return graphInfo.addBox({id: box._id,
								element: box,
								typeName: type_name,
								center: [start_center_x, start_center_y],
								size: [start_width, start_height],

								minX: box_in.minX, minY: box_in.minY,
								maxX: box_in.maxX, maxY: box_in.maxY,
							});
	},	

	addPathToGraphInfo: function(line, line_points, graphInfo, is_linked_line) {

		var rerouting = OrthogonalRerouting;

		var elem_list = line.editor.getElements();

    	var start_elem_id = line.startElementId;
    	var end_elem_id = line.endElementId;

    	var start_elem = elem_list[start_elem_id];
    	var end_elem = elem_list[end_elem_id];

    	//selecting start and end elements
    	rerouting.addBoxToGraphInfo(start_elem, graphInfo);
    	rerouting.addBoxToGraphInfo(end_elem, graphInfo);

    	line.convertToAbsolutePoints(line_points);
	    var lev = rerouting.transformPointsToLev(line_points);

	    graphInfo.addPath({id: line._id,
	    					fromObject: start_elem,	    	
	    					toObject: end_elem,
	    					from: line["startElementId"],
	    					to: line["endElementId"],
	    					dir: lev["direction"],
	    					lev: lev["points"],
	    					isLinkedLine: is_linked_line,
	    				});
	},

}

OrthogonalCollectionRerouting = {

	recomputeLines: function(editor, boxes, linkedLines, draggedLines, delta_x, delta_y) {

		var graphInfo = OrthogonalCollectionRerouting.buildGraphInfo(editor, boxes, linkedLines, draggedLines, delta_x, delta_y);
	    graphInfo.onDragBoxes();
		OrthogonalCollectionRerouting.updateMovedDraggedLines(graphInfo, editor);
	},

	buildGraphInfo: function(editor, boxes, linkedLines, draggedLines, delta_x, delta_y) {

		var rerouting = OrthogonalCollectionRerouting;
	    var graphInfo = new GraphInfo();

	    //selecting boxes
	    _.each(boxes, function(box) {
	    	var new_box = rerouting.addBoxToGraphInfo(box, graphInfo);
	    	graphInfo.dragObjects.push(new_box);
	    });

	    rerouting.updateMovedLines(linkedLines, draggedLines, delta_x, delta_y);

		//recoumputes points for the lines, iterates through all lines
		var is_linked_line = true;
		_.each(linkedLines, function(line_obj) {

			var line = line_obj.line;

	    	//adding line to the graph
	    	rerouting.addPathToGraphInfo(line, line.getPoints().slice(), graphInfo, is_linked_line);
	    });

		//selecting dragged element lines
	    _.each(draggedLines, function(line_obj) {

	    	var line = line_obj.line;

	    	//adding line to the graph
	    	rerouting.addPathToGraphInfo(line, line.getPoints().slice(), graphInfo);
	    });

	    //selected elements
	    var selected = editor.getSelectedElements();
	    var elem_list = editor.getElements();

	    //selecting next-level 
	    _.each(linkedLines, function(line_obj) {

	    	var link = line_obj.line;

		   	//selecting the start and end element
		   	var start_elem_id = link.startElementId;
		   	var end_elem_id = link.endElementId;

		    var not_selected_box;
		    if (selected[start_elem_id]) {
		    	not_selected_box = elem_list[end_elem_id];
		    }
		    else {
		    	not_selected_box = elem_list[start_elem_id];
		    }

		    //adding not selected box to the graph
		    rerouting.addBoxToGraphInfo(not_selected_box, graphInfo);  	
		   	
		   	//selecting inLines
		    _.each(not_selected_box.inLines, function(line) {
		    	rerouting.addPathToGraphInfo(line, line.getPoints().slice(), graphInfo);
		    });

		    //selecting outLines
		    _.each(not_selected_box.outLines, function(line) {
		    	rerouting.addPathToGraphInfo(line, line.getPoints().slice(), graphInfo);
		    });

	    });

	    return graphInfo;
	},

	updateMovedDraggedLines: function(graphInfo, editor) {

	    var elem_list = editor.getElements();
	    _.each(graphInfo.infoDataMap, function(graph_elem) {

	    	if (graph_elem.ntype == "path") {
	    		
	    		var new_points = OrthogonalRerouting.transformFromLevToPoints(graph_elem);
	    		var link = elem_list[graph_elem.id];

	    		if (!graph_elem.isLinkedLine) {
		    		link.transformLinePointsToUnselected(new_points);
		    	}

		    	link.setPoints(new_points);
	    	}

	    });

	},

	addBoxToGraphInfo: function(box, graphInfo) {
		return OrthogonalRerouting.addBoxToGraphInfo(box, graphInfo);
	},

	addPathToGraphInfo: function(line, line_points, graphInfo, is_linked_line) {
		return OrthogonalRerouting.addPathToGraphInfo(line, line_points, graphInfo, is_linked_line);
	},

	updateMovedLines: function(linkedLines, draggedLines, delta_x, delta_y) {

		if (!delta_x) {
			delta_x = 0;
		}

		if (!delta_y) {
			delta_y = 0;
		}

		_.each(linkedLines, function(line_obj) {

			//lines graphical represenation
			var line = line_obj.line;

			//selecting the line points			
			var new_points = line_obj.points.slice();

			if (delta_x != 0 || delta_y != 0) {

				var index = line_obj["index"];

				var new_x = new_points[index] + delta_x;
				var new_y = new_points[index + 1] + delta_y;

				//updating segment points by delta
				LineRerouting.prototype.setNewSegmentPoints(new_points, index, new_x, new_y);
			}

			line.setPoints(new_points);
	    });

		_.each(draggedLines, function(line_obj) {

			//lines graphical represenation
			var line = line_obj.line;

			//selecting the line points			
			var new_points = line_obj.points.slice();

			if (delta_x != 0 || delta_y != 0) {

				var index = line_obj["index"];

				var new_x = new_points[index] + delta_x;
				var new_y = new_points[index + 1] + delta_y;

				//updating segment points by delta
				//LineRerouting.prototype.setNewSegmentPoints(new_points, index, new_x, new_y);
			}

			line.setPoints(new_points);
	    });		
	},

}

