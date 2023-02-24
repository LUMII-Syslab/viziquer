
Actions = function(editor, action_name) {

	var actions = this;
	actions.editor = editor;

    actions.state = {};

    actions.options = {

                Resizing: {
                    start: function(param) {
                        var resizing_shape = new ResizingShape(editor);

                        var element = param["element"];
                        var resizer_name = param["resizerName"];
                        resizing_shape.startDragging(element, resizer_name);

                        actions.state["object"] = resizing_shape;
                    },

                    move: function() {
                        var object = actions.state["object"];
                        object.dragging();
                    },

                    finish: function() {
                        var object = actions.state["object"];
                        object.finishDragging();
                    },
                },

                NewElement: {
                    start: function(target) {

                        var palette = actions.editor.getPalette();
                        var palette_button = palette.getPressedButton();

                        if (palette_button["type"] == "Box") {

                            //adding box with fixed default size
                            if (palette_button.defaultSize && palette_button.defaultSize.width && palette_button.defaultSize.height) {

                                var new_box = new ANewBox(editor);
                                new_box.startDragging(palette_button);

                                var default_size = palette_button.defaultSize;

                                var box = new_box.state.object;
                                box.updateSize(default_size.width, default_size.height);
                                box.compartments.recomputeCompartmentsPosition();

                                new_box.finishDragging();
                                actions.finish();
                            }

                            //adding box by dragging
                            else {

                                var new_box = new ANewBox(editor);
                                new_box.startDragging(palette_button);

                                actions.state["object"] = new_box;
                            }
                        }

                        else if (palette_button["type"] == "Line") {
                            var new_line = new ANewLine(editor);
                            new_line.startDragging(palette_button, target);

                            actions.state["object"] = new_line;
                        }
                    },

                    move: function() {
                        var object = actions.state["object"];
                        var target = actions.state.target;
                        object.dragging(target);
                    },

                    finish: function() {
                        var object = actions.state["object"];
                        var target = actions.state.target;                        
                        object.finishDragging(target);
                    },
                },

                Selecting: {
                    start: function(e) {

                        new Event(editor, "clickedOnDiagram", e);

                        var selection_rect = new SelectionRect(editor); 
                        actions.state["object"] = selection_rect;
                    },

                    move: function() {
                        var selection_rect = actions.state["object"];
                        selection_rect.dragging();
                    },

                    finish: function() {
                        var selection_rect = actions.state["object"];
                        selection_rect.finishDragging();
                    },
                },

                Dragging: {
                    start: function() {
                        var selection_dragging = new SelectionDragging(editor);
                        selection_dragging.startDragging();
                        actions.state["object"] = selection_dragging;
                    },

                    move: function() {
                        var selection_dragging = actions.state["object"];
                        selection_dragging.dragging();
                    },

                    finish: function() {
                        var selection_dragging = actions.state["object"];
                        selection_dragging.finishDragging();
                    },
                },

                ReRouting: {
                    start: function(target) {

                        if (target.lineType === "Direct") {
                            return;
                        }

                        var line_rerouting = new LineRerouting(target);
                        line_rerouting.startDragging();
                        actions.state["object"] = line_rerouting;
                    },

                    move: function() {
                        var object = actions.state["object"];
                        if (object) {
                            object.dragging();
                        }
                    },

                    finish: function() {
                        var object = actions.state["object"];
                        if (object) {
                            object.finishDragging();
                        }
                    },
                },

                PanningDrag: {
                    start: function(e) {

                        new Event(editor, "clickedOnDiagram", e);

                        var panning_drag = new PanningDrag(editor);
                        panning_drag.startDragging();
                        actions.state["object"] = panning_drag;
                    },

                    finish: function() {
                        var object = actions.state["object"];
                        object.finishDragging();
                    },
                },


                EditingSwimlane: {
                    start: function(params) {

                        var moving = new MovingSwimlane(params.line, params.swimlane);
                        moving.startDragging();
                        actions.state["object"] = moving;
                    },  

                    move: function() {
                        var object = actions.state["object"];
                        object.dragging();
                    },

                    finish: function() {
                        var object = actions.state["object"];
                        object.finishDragging();
                    },
                },

                SwimlaneTextEditing: {
                    start: function(text) {
                        new Event(editor, "dbClickOnSwimlaneText", text);
                    },  
                },

                SwimlaneDbClick: {
                    start: function(params) {
                        new Event(editor, "dbClickOnSwimlane", params); 
                    },  
                },

                ShowConnectionPoints: {
                    start: function(element) {
                        var is_refresh_needed = true;
                        editor.connectionPoints.addStartPoint(element, is_refresh_needed)
                    },

                    move: function() {

                        var target = editor.actions.state.target    
                        if (target)
                            return;

                        else {
                            var active_point = editor.connectionPoints.state.activePoint;
                            if (active_point)
                                return;
                        
                            else { 
                                editor.connectionPoints.removeStartPoints(true);
                                actions.finish();
                            }
                        }
                    },

                },

            };

    actions.handlers = new EditorHandlers(actions);
}

Actions.prototype = {

    isAction: function() {
        var actions = this;
        if (actions["state"]["name"])
            return true;
    },

    startAction: function(action_name, param) {
        var actions = this;

        //reseting actions sate
        actions["state"] = {};

        actions["state"]["name"] = action_name;
        actions.options[action_name]["start"](param);
    },

    start: function(ev) {

        var actions = this;
        var editor = actions.editor;

        editor.unSelectElements(undefined, true);

        //if the mouse left button is clicked
        var mouse_state_obj = editor.getMouseStateObject();
        if (mouse_state_obj.isLeftClick(ev)) {

            //saves mouse state
            mouse_state_obj.mouseDown(ev);

            //if palette button is pressed, then starts creating a new element
            var palette = editor.getPalette();
            if (palette.isPressed()) {

                var pressed_button = palette.getPressedButton();
                if (pressed_button.type == "Box") {
                    var target = mouse_state_obj.getTarget(ev);
                    actions.startAction("NewElement", target);
                }

            }

            //starts creating the selection rect
            else if (!editor.isAction()) {

                if (editor.isSelectionEmpty()) { 

                    if (editor.isPanningEnabled())
                        actions.startAction("PanningDrag", ev);
                    else
                        actions.startAction("Selecting", ev);
                }
            }
        }

    },

    move: function(params) {
        var actions = this;

        if (actions.isAction()) {
            var action_name = actions["state"]["name"];
            var func = actions.options[action_name]["move"];
            if (func) {
                func();
            }
        }
    },

    finish: function(e) {

        var actions = this;
        var editor = actions.editor;

        var mouse_state_obj = editor.getMouseStateObject();
        if (e) {

            //if mouse left button is clicked
            if (mouse_state_obj.isLeftClick(e)) {

                var mouse_state = editor.getMouseState();
                if (mouse_state.mouseDown) {

                    var action_name = actions["state"]["name"];
                    if (action_name) {
                        var func = actions.options[action_name]["finish"];
                        if (func)
                            func();
                    }
                }
            }

            //if mouse right button is clicked
            else {

                if (mouse_state_obj.isRightClick(e) && !actions.state.mouseUp) {
                    if (editor.isSelectionEmpty()) {
                        editor.unSelectElements(undefined, true);
                        new Event(editor, "rClickedOnDiagram", {ev: e});
                    }
                }
            }
        }

        mouse_state_obj.reset();
        actions.reset();
        set_cursor_style('default');
    },

    reset: function() {
        var actions = this;
        actions.state = {};
    },
}


EditorHandlers = function(actions) {

    var editor = actions.editor;
    var stage = editor.getStage();

    stage.on("mousedown touchstart contentMousedown contentTouchstart", function(ev) {
        var mouse_state = editor.getMouseState();

        //if there was a click on element, then don't start a new action
        if (mouse_state.mouseDown)
            return;

        actions.start(ev);
    });

    //stage.on("contentMousemove", function(e) {     
    editor.getSceneContainer().on("mousemove touchmove", function(e) {

        editor.mouseState.mouseMove(e);

        if (editor.actions.state.cancelMove)
            return;

        editor.actions.state.target = reset_variable();
        editor.actions.move();
    });

    //finishes on mouse down and mouse move started actions
    stage.on("mouseup touchend contentMouseup contentTouchend", function(e) {

        if (actions.state.name != "SwimlaneTextEditing")
            actions.finish(e);
    });

    //if mouse leaves the editor and the selection was started
    stage.on("mouseleave touchend contentMouseleave", function(e) { 
        set_cursor_style("default");

        if (editor["actions"]["name"] == "Selecting") {
            actions.finish(e);
            return;
        }
    });

    stage.on("dblclick dbltap contentDblclick contentDblTap", function(ev) {

        if (actions.state.name != "SwimlaneTextEditing") {
            editor.mouseState.mouseDown(ev);
            actions.startAction("SwimlaneDbClick");
        }

        actions.finish();
    });
}
