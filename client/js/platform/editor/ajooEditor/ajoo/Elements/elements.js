
AElements = function(editor) {

    var elements = this;
    elements.editor = editor;
    elements.elementList = {};

    elements.shapes = {

            Rectangle: function() {
                return new ARectangle(editor);
            },

            RoundRectangle: function() {
                return new ARoundRectangle(editor);
            },

            HorizontalLine: function() {
                return new HorizontalLine(editor);
            },

            VerticalLine: function() {
                return new VerticalLine(editor);
            },

            Ellipse: function() {
                return new AEllipse(editor);
            },

            Circle: function() {
                return new ACircle(editor);
            },

            Triangle: function() {
                return new ATriangle(editor);
            },

            Diamond: function() {
                return new ADiamond(editor);
            },

            Square: function() {
                return new ASquare(editor);
            },

            Pentagon: function() {
                return new APentagon(editor);
            },

            Hexagon: function() {
                return new AHexagon(editor);
            },

            Octagon: function() {
                return new AOctagon(editor);
            },

            Arrow: function() {
                return new Arrow(editor);
            },

        //bpmn
            BPMNTerminate: function() {
                return new BPMNTerminate(editor);
            },

            BPMNMultiple: function() {
                return new BPMNMultiple(editor);
            },

            BPMNDiamondPlus: function() {
                return new BPMNDiamondPlus(editor);
            },

            BPMNDiamondX: function() {
                return new BPMNDiamondX(editor);
            },

            BPMNCancel: function() {
                return new BPMNCancel(editor);
            },

        //svg
            Document: function() {
                return new ADocument(editor);
            },

            Document2: function() {
                return new A2Document(editor);
            },

            CALData: function() {
                return new ACALData(editor);
            },

            CALInputData: function() {
                return new ACALInputData(editor);
            },

            CALOutputData: function() {
                return new ACALOutputData(editor);
            },

            AutomataAcceptingState: function() {
                return new AAutomataAcceptingState(editor);
            },
            AutomataAcceptingInitialState: function() {
                return new AAutomataAcceptingInitialState(editor);
            },

            AutomataInitialState: function() {
                return new AAutomataInitialState(editor);
            },

            SandClock: function() {
                return new ASandClock(editor);
            },

            AcceptEvent: function() {
                return new AAcceptEvent(editor);
            },

            TwitterBird: function() {
                return new TwitterBird(editor);
            },

            Package: function() {
                return new APackage(editor);
            },

            StarEmpty: function() {
                return new StarEmpty(editor);
            },
   
            Xex: function() {
                return new Xex(editor);
            },

            Note: function() {
                return new Note(editor);
            },

            Shoes: function() {
                return new Shoes(editor);
            },

            Swimlane: function() {
                return new Swimlane(editor);
            },

        };

    elements.createShape = function(name) {

        var func = elements.shapes[name];
        if (func)
            return func();
        else
            console.error("Shape constructor not found ", name);
    }
}

AElements.prototype = {

    addElements: function(data, is_refresh_not_needed) {

        var elements = this;
        var editor = elements.editor;

        var element_list = elements.elementList;
        var selection = editor.getSelectedElements();

        //computing the max bottom-right point to resize the scene if necessary
        var max_x = 0;
        var max_y = 0;

        var shapes_layer = editor.getLayer("ShapesLayer");
        var swimlane_layer = editor.getLayer("SwimlaneLayer");
        _.each(data["boxes"], function(box_in) {

            var shape_name = box_in["style"]["elementStyle"]["shape"];

            var elem = elements.createShape(shape_name);

            var parent = shapes_layer;
            if (shape_name == "Swimlane")
                parent = swimlane_layer;

            elem.create(parent, box_in);

            element_list[elem._id] = elem;

            //computing the bottom-right element position
            var pos = elem.getElementPosition();
            var size = elem.getSize();

            max_x = Math.max(max_x, (pos["x"] + size["width"] || 0));
            max_y = Math.max(max_y, (pos["y"] + size["height"] || 0));
        });

        _.each(data["lines"], function(link_in) {

            var elem = new Link(editor);
            elem.create(shapes_layer, link_in);

            var elem_id = elem._id;
            element_list[elem_id] = elem;

            var start_elem = element_list[elem.startElementId];
            if (start_elem)
                start_elem.outLines[elem_id] = elem;

            var end_elem = element_list[elem.endElementId];
            if (end_elem)
                end_elem.inLines[elem_id] = elem;

            editor.selection.manageLineLayer(elem);
        });

        //resizing the stage
        editor.size.resizeStage(max_x, max_y, is_refresh_not_needed);

        new Event(editor, "afterElementsLoaded");

        if (!is_refresh_not_needed) {

            //refreshing layers
            shapes_layer.draw();

            var drag_layer = editor.getLayer("DragLayer");
            drag_layer.draw();
        }
    },

    removeElements: function(data, is_refresh_needed) {

        var elements = this;
        var editor = elements.editor;

        var element_list = editor.getElements();
        if (!element_list)
            return;

        _.each(data, function(elem_id) {
            var elem = element_list[elem_id];

            if (elem) {

                if (elem["type"] == "Line") {

                    var start_elem_id = elem["startElementId"];
                    var start_elem = element_list[start_elem_id];

                    if (start_elem != undefined) {
                        if (start_elem["outLines"] && start_elem["outLines"][elem_id]);
                            delete start_elem["outLines"][elem_id];
                    }

                    var end_elem_id = elem["endElementId"];
                    var end_elem = element_list[end_elem_id];

                    if (end_elem != undefined) {
                        if (end_elem["inLines"] && end_elem["inLines"][elem_id]);
                            delete end_elem["inLines"][elem_id];
                    }
                }

                editor.unSelectElements([elem]);

                elem.presentation.destroy();

                delete element_list[elem_id];
            }
        });
    
        if (is_refresh_needed) {

            var shapes_layer = editor.getLayer("ShapesLayer");            
            shapes_layer.batchDraw();

            var drag_layer = editor.getLayer("DragLayer");
            drag_layer.batchDraw();
        }
    }
}
