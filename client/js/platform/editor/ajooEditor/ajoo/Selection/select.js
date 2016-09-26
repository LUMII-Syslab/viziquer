
Selection = function(editor) {

	var selection = this;
	selection.editor = editor;

	selection.selected = {};
	selection.unselection = new UnSelection(selection);

	selection.shapesLayer = editor.getLayer("ShapesLayer");
	selection.dragLayer = editor.getLayer("DragLayer");
	selection.dragGroup = find_child(selection.dragLayer, "DragGroup");

	selection.groups = selection.buildGroups();
}

Selection.prototype = {

	select: function(selection_list, is_refresh_not_needed) {
		var selection = this;
		var editor = selection.editor;

		var selected = selection.selected;

		//setting acive elements
		_.each(selection_list, function(obj) {
			selected[obj._id] = obj;
		});

		//selecting selection elements
		_.each(selection_list, function(elem) {

			if (elem["type"] == "Box") {
				selection.selectBox(elem);
			}

			else if (elem["type"] == "Line") {
				selection.selectLine(elem);	
			}
		});

		if (is_refresh_not_needed || _.isEmpty(selected)) {
			return;
		}

		//refreshing layers
		var drag_layer = editor.getLayer("DragLayer");		
		drag_layer.draw();

		var shapes_layer = editor.getLayer("ShapesLayer");
		shapes_layer.draw();
	},

	selectAll: function() {
		var selection = this;
		var elements = selection.editor.getElements();
		selection.select(elements);
	},

	clearSelection: function(elems) {
		var selection = this;
		var selected = selection.selected;

		//removing specific elements
		if (elems) {
			_.each(elems, function(elem){
				delete selected[elem._id];
			});
		}

		//reseting
		else {
			selection.selected = {};
		}
	},

	isEmpty: function() {
		var selection = this;
		return _.isEmpty(selection.selected);
	},

	isSingleElementSelection: function() {
		var selection = this;
		
		if (_.size(selection.selected) === 1) {
			return true;
		}
	},

	unselect: function(elem_list, is_refresh_needed) {
		var selection = this;
		selection.unselection.unselect(elem_list, is_refresh_needed);
	},

	manageLinkedLinesLayer: function(element, is_refresh_needed) {

		var selection = this;

		_.each(element["inLines"], function(line) {
			selection.manageLineLayer(line);
		});

		_.each(element["outLines"], function(line) {
			selection.manageLineLayer(line);
		});
	},

	manageLineLayer: function(line) {

		var selection = this;
		var selected = selection.selected;

		var editor = selection.editor;

		var start_elem_id = line["startElementId"];
		var end_elem_id = line["endElementId"];

		var groups = selection.groups;
		var drag_group = selection.dragGroup;

		var is_parent_drag_group = false;

		var line_presentation = line.presentation;

		//if line was in the DragGroup, then point transformation is needed
		var parent = line_presentation.getParent();
		if (parent && parent.name == "DragGroup") {
			selection.transformLinePointsToShapesLayer(line);
		}

		//if both line ends are selected, then moving line to the drag group
		if (selected[start_elem_id] && selected[end_elem_id]) {
			selection.transformLinePointsToDragGroup(line);
			line_presentation.moveTo(drag_group);
		}
		
		//if a line start element is selected
		else if (selected[start_elem_id]) {
			var out_lines_group = groups["OutLinesGroup"];				
			line_presentation.moveTo(out_lines_group);
		}

		//if a line end element is selected
		else if (selected[end_elem_id]) {
			var in_lines_group = groups["InLinesGroup"];				
			line_presentation.moveTo(in_lines_group);	
		}

		//if a line is selected but its end points are not selected
		else if (selected[line._id]) {
			var no_end_group = groups["NoEndLinesGroup"];				
			line_presentation.moveTo(no_end_group);
		}

		//if a line is not selected and its end-points are not selected
		else  {
			line_presentation.moveTo(selection.shapesLayer);
		}

	},

	selectBox: function(box) {

		var selection = this;
		var editor = selection.editor;

		var shape_group = box.presentation;

		//if editor is in edit mode
		if (editor.isEditMode()) {

			//moving element to the drag layer
			var drag_group = selection.dragGroup;
			shape_group.x(shape_group.x() - drag_group.x());
			shape_group.y(shape_group.y() - drag_group.y());
			
			shape_group.moveTo(drag_group);

			//moving lines
			selection.manageLinkedLinesLayer(box);
		}

		box.setSelectedStyle();
	},

	selectLine: function(element) {

		var selection = this;
		var editor = selection.editor;

		//if editor is in edit mode
		if (editor.isEditMode()) {
			
			//manage the line
			selection.manageLineLayer(element);

			//moving linked lines
			selection.manageLinkedLinesLayer(element);
		}

		//updating element style
		element.setSelectedStyle();
	},

   	buildGroups: function() {

   		var selection = this;
   		var drag_layer = selection.dragLayer;

        return {InLinesGroup: find_child(drag_layer, "InLinesGroup"),
                OutLinesGroup: find_child(drag_layer, "OutLinesGroup"),
                NoEndLinesGroup: find_child(drag_layer, "NoEndLinesGroup"),
                DragGroup: selection.dragGroup,
            };
    },

    transformLinePointsToDragGroup: function(line) {
    	var points = line.getPoints().slice();
    	line.transformLinePoints(points, -1);
    	line.setPoints(points);
    },

    transformLinePointsToShapesLayer: function(line) {
    	var points = line.getPoints().slice();
    	line.transformLinePoints(points, 1);
    	line.setPoints(points);
    },

    align: function(ha, va) {

		var selection = this;
		var editor = selection.editor;

		//avg function
		var avg = function(list) {
			if (!list || !list.length || list.length === 0) {
				return 0;
			}

    		var sum = _.reduce(list, function(memo, num) {
    			return memo + num;
    		}, 0);

      		return sum / list.length;
    	};


    	//selecting boxes
		var sel = _.select(editor.getSelectedElements(), function(el) {
			return el.type === "Box";
		});

		if (!sel || sel.length < 2) return;

		var m;
		if (ha === -1) {

			m = _.min(_.map(_.values(sel), function(arect) {
				return arect.getElementPosition().x;
			}));
			
			_.each(sel, function(arect) { 
				var pos = arect.getElementPosition();
				arect.setElementPosition(m, pos.y);
			});
		}

		if (ha === 0) {
			
			m = avg(_.map(_.values(sel), function(arect) {
				var pos = arect.getElementPosition();
				var size = arect.getSize();
				return Math.round(pos.x + size.width / 2);
			}));
			
			_.each(sel, function(arect) {
				var pos = arect.getElementPosition();
				var size = arect.getSize();
				arect.setElementPosition(Math.round(m - size.width / 2), pos.y);
			});
		}

		if (ha === 1) {
			
			m = _.max(_.map(_.values(sel), function(arect) {
				var pos = arect.getElementPosition();
				var size = arect.getSize();
				return pos.x + size.width;
			}));
				
			_.each(sel, function(arect) { 
				var pos = arect.getElementPosition();
				var size = arect.getSize();
				arect.setElementPosition(m - size.width, pos.y);
			});
		}

		if (va === -1) {

			m = _.min(_.map(_.values(sel), function(arect) {
				return arect.getElementPosition().y;
			}));
			
			_.each(sel, function(arect) { 
				var pos = arect.getElementPosition();
				arect.setElementPosition(pos.x, m);
			});
		}

		if (va === 0) {

			m = avg(_.map(_.values(sel), function(arect) {
				var pos = arect.getElementPosition();
				var size = arect.getSize();
				return Math.round(pos.y + size.height / 2);
			}));
			
			_.each(sel, function(arect) { 
				var pos = arect.getElementPosition();
				var size = arect.getSize();
				arect.setElementPosition(pos.x, Math.round(m - size.height / 2));
			});
		}

		if (va === 1) {
			
			m = _.max(_.map(_.values(sel), function(arect) {
				var pos = arect.getElementPosition();
				var size = arect.getSize();
				return pos.y + size.height;
			}));
			
			_.each(sel, function(arect) { 					
				var pos = arect.getElementPosition();
				var size = arect.getSize();
				arect.setElementPosition(pos.x, m - size.height);
			});
		}

		// TODO piekoriģēt ar šīm kastēm saistītās līnijas
		selection.recomputeLines();

		//editor.stage.draw();

		var drag_layer = editor.getLayer("DragLayer");
		drag_layer.batchDraw();

    },

    adjustSize: function(ha, va) {

		var selection = this;
		var editor = selection.editor;


    	//selecting boxes
		var sel = _.select(editor.getSelectedElements(), function(el) {
			return el.type === "Box";
		});

		if (!sel || sel.length < 2) {
			return;
		}

		var m;
		if (ha === -1) {

			m = _.min(_.map(_.values(sel), function(arect) {
				return arect.getSize().width;
			}));
			
			_.each(sel, function(arect) { 
				var size = arect.getSize();
				arect.updateSizeAndCompartments(m, size.height);
			});
		}

		if (ha === 1) {
			
			m = _.max(_.map(_.values(sel), function(arect) {
				return arect.getSize().width;
			}));
				
			_.each(sel, function(arect) { 
				var size = arect.getSize();
				arect.updateSizeAndCompartments(m, size.height);
			});
		}

		if (va === -1) {

			m = _.min(_.map(_.values(sel), function(arect) {
				return arect.getSize().height;
			}));
			
			_.each(sel, function(arect) { 
				var size = arect.getSize();
				arect.updateSizeAndCompartments(size.width, m);
			});
		}

		if (va === 1) {
			
			m = _.max(_.map(_.values(sel), function(arect) {
				return arect.getSize().height;
			}));
			
			_.each(sel, function(arect) { 					
				var size = arect.getSize();
				arect.updateSizeAndCompartments(size.width, m);
			});
		}

		//adjusting handles
		_.each(sel, function(arect) { 					
			arect.removeResizers();
			arect.addResizers();
		});

		//recomputing lines
		selection.recomputeLines();

		//editor.stage.draw();

		var drag_layer = editor.getLayer("DragLayer");
		drag_layer.batchDraw();
    },

    adjustSpacing: function(ha, va) {

		var selection = this;
		var editor = selection.editor;


    	//selecting boxes
		var sel = _.select(editor.getSelectedElements(), function(el) {
			return el.type === "Box";
		});

		if (!sel || sel.length < 3) {
			return;
		}

		var v1, v2, space, used, tot;

		if (ha === 1) {
			v1 = _.min(_.map(_.values(sel), function(arect) {
				return arect.getElementPosition().x;
			}));
			v2 = _.max(_.map(_.values(sel), function(arect) {
				return arect.getElementPosition().x + arect.getSize().width;
			}));
			tot = _.reduce(sel, function(memo, b) {
				return memo + b.getSize().width;
			}, 0);
			space = Math.round((v2 - v1 - tot) / (sel.length - 1));
			sel = _.sortBy(sel, function(b) { return b.getElementPosition().x; });
			used = sel[0].getElementPosition().x;
			_.each(sel, function(b, i) {
				if (i > 0) {
					b.setElementPosition(used, b.getElementPosition().y);
				}
				used += b.getSize().width + space;
			});
		}

		if (va === 1) {
			v1 = _.min(_.map(_.values(sel), function(arect) {
				return arect.getElementPosition().y;
			}));
			v2 = _.max(_.map(_.values(sel), function(arect) {
				return arect.getElementPosition().y + arect.getSize().height;
			}));
			tot = _.reduce(sel, function(memo, b) {
				return memo + b.getSize().height;
			}, 0);
			space = Math.round((v2 - v1 - tot) / (sel.length - 1));
			sel = _.sortBy(sel, function(b) { return b.getElementPosition().y; });
			used = sel[0].getElementPosition().y;
			_.each(sel, function(b, i) {
				if (i > 0) {
					b.setElementPosition(b.getElementPosition().x, used);
				}
				used += b.getSize().height + space;
			});
		}

		// TODO piekoriģēt ar šīm kastēm saistītās līnijas
		selection.recomputeLines();
		//editor.stage.draw();

		var drag_layer = editor.getLayer("DragLayer");
		drag_layer.batchDraw();
    },

    avoidCrossings: function() {

		var selection = this;
		var editor = selection.editor;

		var dragged_boxes = [];
		var lines = {linkedLines: [], draggedLines: [], allLines: []};

		_.each(selection.selected, function(drag_elem) {

			if (drag_elem["type"] == "Box") {
				drag_elem.collectLinkedLines(lines);
				dragged_boxes.push(drag_elem);
			}
		});

		var graphInfo = OrthogonalCollectionRerouting.buildGraphInfo(editor, dragged_boxes, lines.linkedLines, lines.draggedLines);
	    graphInfo.onSimplifyBox();
		OrthogonalCollectionRerouting.updateMovedDraggedLines(graphInfo, editor);

		editor.stage.draw();
    },

    recomputeLines: function() {

		var selection = this;
		var editor = selection.editor;

		var dragged_boxes = [];
		var lines = {linkedLines: [], draggedLines: [], allLines: []};

		//set unselected style for selected elements and select linked lines
		_.each(selection.selected, function(drag_elem) {
			if (drag_elem["type"] == "Box") {
				drag_elem.collectLinkedLines(lines);
				dragged_boxes.push(drag_elem);
			}			
		});

		OrthogonalCollectionRerouting.recomputeLines(editor, dragged_boxes, lines.linkedLines, lines.draggedLines, 0, 0);
    },

}

SelectAll = function() {
	var editor = get_editor();
	editor.selection.selectAll();
}
