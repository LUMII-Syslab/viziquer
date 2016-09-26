
UnSelection = function(selection) {

	var unselection = this;
	unselection.selection = selection;

	unselection.shapes_layer = selection.editor.getLayer("ShapesLayer");
	unselection.drag_layer = selection.editor.getLayer("DragLayer");
	unselection.drag_group = find_child(unselection.drag_layer, "DragGroup");

	unselection.unselectSpecificElements = function(elem_list) {

		//udpating style
		_.each(elem_list, function(elem) {
			elem.setUnselectedStyle();
		});

		//if edit mode, then managing layers
		if (selection.editor.isEditMode()) {

			 _.each(elem_list, function(elem) {
				unselection.unselectEditModeElement(elem);
			});
		}
	}

	unselection.unselectEditModeElement = function(element) {	
		var shape_group = element.presentation;

		//selection relative position
		var selection_x = unselection.drag_group.x();
		var selection_y = unselection.drag_group.y();

		selection.clearSelection([element]);

		if (element["type"] == "Box") {

			//transforms x and y coordinates to be relative to the layer
			shape_group.x(shape_group.x() + selection_x);
			shape_group.y(shape_group.y() + selection_y);

			//moves element to shape layer
			shape_group.moveTo(unselection.shapes_layer);
		}

		else if (element["type"] == "Line") {
			selection.manageLineLayer(element);
		}

		selection.manageLinkedLinesLayer(element);
	}

	unselection.unselectDragLayerLines = function(line) {

		var _id = elem_in["objId"];
		var element_list = selection.editor.getElements();
		var element = element_list[_id];

		element.moveTo(unselection.shapes_layer);
		element.setUnselectedStyle();
	}
}

UnSelection.prototype = {

	unselect: function(elem_list, is_refresh_needed) {

		var unselection = this;
		var selection = unselection.selection;

		if (!selection.isEmpty()) {

			//if element list is specified, then unselecting specific elements
			if (elem_list) {
				unselection.unselectSpecificElements(elem_list);
				selection.clearSelection(elem_list);
			}

			//if no elements specified, then unselecting all
			else {
				unselection.unselectSpecificElements(selection.selected);
				selection.clearSelection();
			}

			//executes layer's refresh if needed
			if (is_refresh_needed) {
				unselection.shapes_layer.draw();
				unselection.drag_layer.draw();
			}
		}
	},
}

