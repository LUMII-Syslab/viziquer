
var MouseState = function(editor) {

	var mouseState = this;
	mouseState.editor = editor;

	mouseState.state = {};
}

MouseState.prototype = {

	mouseDown: function(e) {
		var mouseState = this;
		var editor = mouseState.editor;

		var mouse_pos = mouseState.mouseAbsolutePosition(e);
        mouseState.state = {mouseDown: true,
			                mouseX: mouse_pos.x,
			                mouseY: mouse_pos.y,
			                mouseStartX: mouse_pos.x,
			                mouseStartY: mouse_pos.y,

			                originalX: mouse_pos.originalX,
			                originalY: mouse_pos.originalY,

			                originalStartX: mouse_pos.originalX,
			                originalStartY: mouse_pos.originalY,
			            };
	},

	mouseMove: function(e) {
		var mouseState = this;
		var state = mouseState.state;
		var editor = mouseState.editor;

		if (mouseState.state.mouseDown) {

			var mouse_pos = mouseState.mouseAbsolutePosition(e);
	        state["mouseX"] = mouse_pos.x;
	        state["mouseY"] = mouse_pos.y;

	        state["originalX"] = mouse_pos.originalX;
	        state["originalY"] = mouse_pos.originalY;  
	    }

	},

	mouseAbsolutePosition: function(e) {

		var mouseState = this;
		var editor = mouseState.editor;
		var stage = editor.stage;
		var zoom = editor.getZoom(); 

		var original_mouse_x = mouseState.getEditorMouseX(e);
		var original_mouse_y = mouseState.getEditorMouseY(e);

		var mouse_x, mouse_y;
		if (e.evt) {

			mouse_x = (original_mouse_x - stage.x()) / zoom.x;
			mouse_y = (original_mouse_y - stage.y()) / zoom.y;
		}

		else {
			mouse_x = (original_mouse_x - stage.x()) / zoom.x;
			mouse_y = (original_mouse_y - stage.y()) / zoom.y;
		}	

		return {x: mouse_x, y: mouse_y, originalX: original_mouse_x, originalY: original_mouse_y};
	},

	reset: function() {
		var mouseState = this;
		mouseState.state = {};
	},

	getCursorPosition: function(e) {
		var mouseState = this;

		if (mouseState.isTouchEvent(e)) {
			return mouseState.getTouchPosition(e);
		}
		else {
			return mouseState.getMousePosition(e);
		}
	},

	getTouchPosition: function(ev) {

		var mouseState = this;
		var touch = mouseState.getEvent(ev);

		return {x: touch.clientX, y: touch.clientY};
	},

	getMousePosition: function(e) {

		var x, y;
		if (e.originalEvent) {
			var ev = e.originalEvent;
								
			x = ev.offsetX;
			y = ev.offsetY;
		}

		else {
			if (e["evt"]) {
				// x = e["evt"]["layerX"];
				// y = e["evt"]["layerY"];

				x = e["evt"]["offsetX"];
				y = e["evt"]["offsetY"];
			}

			else if (e["offsetX"]) {
				x = e["offsetX"];
				y = e["offsetY"];
			}

			else {
				x = e["x"];
				y = e["y"];
			}
		}

		return {x: x, y: y};
	},

	getEditorMouseX: function(e) {
		return this.getCursorPosition(e)["x"];
	},

	getEditorMouseY: function(e) {
		return this.getCursorPosition(e)["y"];
	},

	getEvent: function(e) {

		var mouseState = this;

		if (mouseState.isTouchEvent(e)) {

			var ev;
			if (e.evt) {
				ev = e.evt;
			}
			else {
				ev = e;
			}

			if (ev.originalEvent) {
				return ev.originalEvent.targetTouches[0];
			}

			else if (ev.targetTouches) {
				return ev.targetTouches[0];
			}
		}

		else {
			if (e["evt"]) {
				return e["evt"];
			}
			else {
				return e;
			}
		}
	},

	//get_page_mouse_position: function(ev) {
	getPageMousePosition: function(ev) {
		var mouseState = this;
		var editor = mouseState.editor;

		var editor_position = editor.getSceneContainer().parent().parent().offset();

		if (mouseState.isTouchEvent(ev)) {

			var e = mouseState.getEvent(ev);
			return {x: $(e).attr("pageX") - editor_position["left"],
					y: $(e).attr("pageY") - editor_position["top"]};

		}

		else {
			var e = mouseState.getEvent(ev);
			return {x: $(e).attr("pageX") - editor_position["left"],
					y: $(e).attr("pageY") - editor_position["top"]};
		}

	},

	isLeftClick: function(e) {

		var mouseState = this;

		if (mouseState.isTouchEvent(e)) {
			if (e.evt) {
				return e.evt.which === 0;
			}
			else {
				return e.which === 0;
			}
		}
		else {
			var ev = mouseState.getEvent(e);
			return ev.which === 1;
		}
	},

	isRightClick: function(e) {

		var mouseState = this;

		var ev = mouseState.getEvent(e);
		if (mouseState.isTouchEvent(e))
			if (e.evt) {
				return e.evt.which === 1;
			}
			else {
				return e.which === 1;
			}
		else {
			return ev.which === 3;
		}
	},

	getTarget: function(e) {

		var mouseState = this;

		if (mouseState.isTouchEvent(e)) {
			if (e.evt) {
				return e.evt.which === 0;
			}
			else {
				return e.which === 0;
			}
		}
		else {
			var ev = mouseState.getEvent(e);
			return ev.target;
		}
	},

	isTouchEvent: function(e) {
		return e.type == "touchstart" ||
				e.type == "touchmove" ||
				e.type == "touchend" ||

				e.type == "contentTouchstart" ||	
				e.type == "contentTouchmove" ||
				e.type == "contentTouchend";
	},

}


export default MouseState