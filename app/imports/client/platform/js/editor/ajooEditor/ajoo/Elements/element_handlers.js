// import { _ } from 'vue-underscore';
import Event from '../Editor/events';

var ElementHandlers = function(element) {

	var handlers = this;
	handlers.element = element;

	new ElementMouseDown(element);
	new ElementMouseMove(element);
	new ElementMouseUp(element);

	new ElementMouseEnter(element);
	new ElementMouseLeave(element);
}

function ElementMouseDown(element) {
	var elementMouseDown = this;
	elementMouseDown.element = element;

	var editor = element.editor;
	var shape_group = element.presentation;

	var drag_layer = editor.getLayer("DragLayer");
	var drag_group = editor.findChild(drag_layer, "DragGroup");

	var zoom = editor.zoom;

	editor.selectionPosition = {x: drag_group.x() / zoom.x, y: drag_group.y() / zoom.y,};

	elementMouseDown.leftClick = function(e) {
		if (!editor.mode.isEditMode) {
			e.cancelBubble = true;
		}

		editor.mouseState.mouseDown(e);

		var selected = editor.getSelectedElements();
		var id = element._id;

		//if palette button is pressed
		var palette = editor.getPalette();
		if (palette.isPressed()) {

			//lines don't start in lines
			if (palette.isLinePressed() && element.type == "Line") {
				return;
			}
			
			editor.actions.reset();
	    	editor.actions.startAction("NewElement", element);
		}
		
		else {

			//if ctrl key is used to add elements to the selected
			var evt = e["evt"];
			if (evt.ctrlKey || evt.shiftKey) {

				//removes element from selected
				if (selected[id]) {
					editor.unSelectElements([element], true);
				}

				else {

					if (!selected[id]) {
						editor.selectElements([element]);
					}

					elementMouseDown.intitLineReRouting(element);
				}
			}

			else {

				//if the element already exists in the selected, selected is not changed 
				if (selected[id]) {

					elementMouseDown.intitLineReRouting(element);
					if (!editor.selection.isSingleElementSelection()) {
						var params = {ev: e, selection: selected};
						new Event(editor, "clickedOnCollection", params);
					}

					return;
				}

				//selecting the element
				else {
					elementMouseDown.selectElement();
					elementMouseDown.intitLineReRouting(element);
					var params = {ev: e, element: element};

					new Event(editor, "clickedOnElement", params);
			    }
		    }
		}	
	}

	elementMouseDown.intitLineReRouting = function(element) {

		//checking if line
		if (element["type"] == "Line") {
			var element = elementMouseDown.element;
			var selection = element.editor.selection;

			//checking it the line is the only element in the selection
			if (selection.isSingleElementSelection() && editor.isEditMode()) {
				editor.actions.startAction("ReRouting", element);
			}
		}
	}

	elementMouseDown.rightClick = function(e) {

		var id = element._id;
		var selected = editor.getSelectedElements();

		//if the element is not in the selection, then selects the element
		if (!selected[id]) {
			editor.unSelectElements();
			editor.selectElements([element]);
		}

		drag_group.draggable(false);

        var mouse_state = editor.getMouseState();
        mouse_state["mouseDown"] = true;
	}

	//if there are elements in the selection, then removes them and select the element
	elementMouseDown.selectElement = function() {
		editor.unSelectElements();
		editor.selectElements([element]);
	}

	//on mouse down shape group is added or removed from the selection
	shape_group.on('mousedown touchstart', function(ev) {

		if (editor.isAction() && editor.actions.state.name == "NewElement") {
			return;
		}

		var mouse_state_obj = editor.getMouseStateObject();
		editor.selectionPosition = {x: drag_group.x(), y: drag_group.y()};

		//if mouse left button clicked
		if (mouse_state_obj.isLeftClick(ev)) {
			elementMouseDown.leftClick(ev);
		}

		else {
			elementMouseDown.rightClick(ev);
		}

	});
}

function ElementMouseMove(element) {
	var shape_group = element.presentation;
	var editor = element.editor;

	shape_group.on('mousemove touchmove', function(e) {
		e.cancelBubble = true;
		
		if (editor.getCursorStyle() == "default") {
			editor.setCursorStyle("move");
		}

		element.editor.mouseState.mouseMove(e);
		editor.actions.state.cancelMove = true;
		editor.actions.state.target = element;
		editor.actions.move();
	});
}

function ElementMouseUp(element) {

	var editor = element.editor;

	var drag_layer = editor.getLayer("DragLayer");
	var drag_group = editor.findChild(drag_layer, "DragGroup");

	var shape_group = element.presentation;

	shape_group.on("mouseup touchend", function(ev) {

		//if right click on the element, then displaying a context menu
		var mouse_state_obj = editor.getMouseStateObject();
		if (mouse_state_obj.isRightClick(ev)) {

			drag_group.draggable(true);

			//selects the element selection
			var selection_group_elems = editor.getSelectedElements();
			if (selection_group_elems) {

				//if the collection has exactly one element, then this is a single element collection
				if (editor.selection.isSingleElementSelection()) {
					var params = {ev: ev, element: element};
					new Event(editor, "rClickedOnElement", params);
				}

				//if there are more than one element in the collection,
				//the this is a multi element collection
				else {
					if (!editor.selection.isEmpty()) {
						var params = {ev: ev, selection: selection_group_elems};
						new Event(editor, "rClickedOnCollection", params);
					}
				}

				return;
			}
		}
		
	});
}

function ElementMouseEnter(element) {

	var shape_group = element.presentation;
	var editor = element.editor;

	shape_group.on('mouseenter', function(e) {
		e.cancelBubble = true;

		editor.setCursorStyle("move");

		if (editor.palette.isLinePressed()) {

			if (element.type == "Box") {

				if (!editor.actions.state.object) {
					editor.actions.startAction("ShowConnectionPoints", element);
					editor.actions.state.cancelMove = true;
				}
				else {
					editor.connectionPoints.addEndPoint(element);
					editor.actions.state.target = element;
					editor.actions.state.cancelMove = true;
				}
			}
		}

	});
}

function ElementMouseLeave(element) {

	var shape_group = element.presentation;

	shape_group.on('mouseleave', function(e) {

		var editor = element.editor;

		editor.actions.state.cancelMove = false;
		editor.actions.state.target = undefined;

		if (editor.getCursorStyle() == "move") {
			editor.setCursorStyle("default");
		}
	});
}


export default ElementHandlers