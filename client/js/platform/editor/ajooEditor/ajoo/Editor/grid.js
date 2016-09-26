
Grid = function(editor) {

	var grid = this;
	grid.editor = editor;
	grid.isGridEnabled = false;

	grid.layer = editor.getLayer("GridLayer");

	grid.initialStep = 16;
	grid.step = grid.initialStep;
	grid.buildGrid();
}

Grid.prototype = {

	buildGrid: function(params) {

		var grid = this;
		var editor = grid.editor;

	    if (!params)
	        params = {};

	    if (params["step"])
	        grid.step = params["step"];

	    var step = grid.step;

	    var stage = editor.stage;
	    var height = stage.height();
	    var width = stage.width();

		var layer = grid.layer;

	    var line_props = {
	                    stroke: 'grey',
	                    strokeWidth: 0.3,
	                    //dash: [2, 7],
	                    perfectDrawEnabled: false,  
	                };

	    for (var i=0;i<width;i=i+step) {

	        line_props["points"] = [i, 0, i, height];
	        var line = new Konva.Line(line_props);

	        layer.add(line);
	    }

	    for (var i=0;i<height;i=i+step) {

	        line_props["points"] = [0, i, width, i];
	        var line = new Konva.Line(line_props);

	        layer.add(line);
	    }

	    layer.draw();  
	},

	showGrid: function(is_refresh_not_needed) {

		var grid = this;
		var editor = grid.editor;

        //if grid is already enabled, then no building
        if (grid["isGridEnabled"])
            return;

        grid["isGridEnabled"] = true;

        grid.layer.destroyChildren();
        grid.buildGrid();

        grid.layer.visible(true);

        if (!is_refresh_not_needed)
        	grid.layer.draw();

        //grid.alignElements();

	},

	removeGrid: function() {

        var grid = this;
        var editor = grid.editor;

        //if grid is enabled, then removing it
        if (grid["isGridEnabled"]) {

            grid["isGridEnabled"] = false;
        	grid.layer.visible(false);
        }

	},

	alignElements: function() {

		var grid = this;
		var editor = grid.editor;

		var selected_elems = _.map(editor.getSelectedElements(), function(elem) {
			return elem;
		});

		editor.unSelectElements();


	    var graphInfo = new GraphInfo();
		var initial_pos = {
							deltaX: 0,
							deltaY: 0, 
							stageX: 0,
							stageY: 0,
						};

		
		var self = {editor: editor};


		var lines = [];

		var elements = editor.getElements();
		_.each(elements, function(element) {

			if (element.type == "Box") {
				initial_pos.object = element.presentation;
				initial_pos.newX = element.presentation.x();
				initial_pos.newY = element.presentation.y();

				SelectionDragging.prototype.adjustGridPosition.call(self, initial_pos);

		    	var new_box = SelectionDragging.prototype.addBoxToGraphInfo(element, graphInfo, 0, 0);  	
		    	graphInfo.dragObjects.push(new_box);
			}

			else
				lines.push(element);
		});


		_.each(lines, function(line) {
			OrthogonalRerouting.prototype.addPathToGraphInfo(line, line.getPoints(), graphInfo);
		});


		//recomputing lines
	   	graphInfo.onDragBoxes();
	   	SelectionDragging.prototype.updateMovedDraggedLines.call(self, graphInfo);


		var list = {movedBoxes: [], lines: [],};
		_.each(elements, function(element) {

			if (element.type == "Box")
				list.movedBoxes.push({id: element._id, location: element.getSize()});
			else 
				list.lines.push({id: element._id, points: element.getPoints()});
		});

		//updating the state
		new Event(editor, "collectionPositionChanged", list);

	   	//reselecting elements
		editor.selectElements(selected_elems);
	},

}


