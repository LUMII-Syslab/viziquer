// import { _ } from 'vue-underscore';
import Link from './Lines/render_lines';
import Event from '../Editor/events';
import {ARectangle, ARoundRectangle, HorizontalLine, VerticalLine, RPolygon, ATriangle, ASquare, ADiamond, APentagon, AXexagon, AOctagon, ACircle, AEllipse, Arrow,} from './Boxes/DrawingShapes/shapes1' 
import {BPMNShape, BPMNTerminate, BPMNMultiple, BPMNDiamondPlus, BPMNCancel, BPMNDiamondX,} from './Boxes/DrawingShapes/shapes2'

import {Shoes, StarEmpty, Xex, Note, ADocument, TwitterBird, APackage, 
        ComputedDataPinSingle, ComputedDataPinMultiple, 
        PortIn, PortOut, PortInMultiple, PortOutMultiple, 
        DeclaredProvidedMultiplePin, DeclaredRequiredMultiplePin,
        ThreeTrianglesAndRectangle, ThreeFilledTrianglesAndRectangle, RectangleAndThreeTriangles, ThreeTriangles, RectangleAndThreeFilledTriangles
} from './Boxes/DrawingShapes/shapes3'


import { Interpreter } from '/imports/client/lib/interpreter'


var AElements = function(editor, parent) {

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

            TwitterBird: function() {
                return new TwitterBird(editor);
            },

            ComputedDataPinSingle: function() {
                return new ComputedDataPinSingle(editor);
            },

            ComputedDataPinMultiple: function() {
                return new ComputedDataPinMultiple(editor);
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

            PortIn: function() {
                return new PortIn(editor);
            },

            PortOut: function() {
                return new PortOut(editor);
            },
            PortInMultiple: function() {
                return new PortInMultiple(editor);
            },

            PortOutMultiple: function() {
                return new PortOutMultiple(editor);
            },
            DeclaredProvidedMultiplePin: function() {
                return new DeclaredProvidedMultiplePin(editor);
            },
            
            DeclaredRequiredMultiplePin: function() {
                return new DeclaredRequiredMultiplePin(editor);
            },
            //ThreeTrianglesAndRectangle, RectangleAndThreeTriangles, ThreeTriangles
            ThreeTriangles: function() {
                return new ThreeTriangles(editor);
            },
            RectangleAndThreeTriangles: function() {
                return new RectangleAndThreeTriangles(editor);
            },
            ThreeTrianglesAndRectangle: function() {
                return new ThreeTrianglesAndRectangle(editor);
            },
            
            ThreeFilledTrianglesAndRectangle: function() {
                return new ThreeFilledTrianglesAndRectangle(editor);
            },
            RectangleAndThreeFilledTriangles: function() {
                return new RectangleAndThreeFilledTriangles(editor);
            },
        };

    elements.createShape = function(name) {

        var func = elements.shapes[name];
        if (func) {
            return func();
        }
        else {
            console.error("Shape constructor not found ", name);
        }
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
        // var swimlane_layer = editor.getLayer("SwimlaneLayer");
        _.each(data["boxes"], function(box_in) {

            var shape_name = box_in["style"]["elementStyle"]["shape"];

            var elem = elements.createShape(shape_name);

            var parent = shapes_layer;
            elem.create(parent, box_in);

            element_list[elem._id] = elem;

            //computing the bottom-right element position
            var pos = elem.getElementPosition();
            var size = elem.getSize();

            max_x = Math.max(max_x, (pos["x"] + size["width"] || 0));
            max_y = Math.max(max_y, (pos["y"] + size["height"] || 0));
        });


        _.each(data["ports"], function(port_in) {

            var parent_node = element_list[port_in.parentId];

            var shape_name = port_in["style"]["elementStyle"]["shape"];
            var elem = elements.createShape(shape_name);
            elem.updateShapeSize({width: 20, height: 20,});
            _.extend(elem, {type: "Port",
                            settings: editor.portSettings,
                            parent: parent_node,
                        });

            var node_properties = port_in["style"]["elementStyle"];
            elem.create(parent_node.presentation, port_in);
            elem.presentation.moveToTop();

            parent_node.ports.push(elem);

            var elem_id = elem._id;
            element_list[elem_id] = elem;
        });


        _.each(data["lines"], function(link_in) {

            var elem = new Link(editor);
            elem.create(shapes_layer, link_in);

            var elem_id = elem._id;
            element_list[elem_id] = elem;

            var start_elem = element_list[elem.startElementId];
            if (start_elem) {
                start_elem.outLines[elem_id] = elem;
            }

            var end_elem = element_list[elem.endElementId];
            if (end_elem) {
                end_elem.inLines[elem_id] = elem;
            }

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

        if (editor.isLayoutComputationNeededOnLoad == 1) {
            Interpreter.execute("ComputeLayout");
            editor.isLayoutComputationNeededOnLoad = 0;
        }

    },

    removeElements: function(data, is_refresh_needed) {
        var elements = this;
        var editor = elements.editor;

        var element_list = editor.getElements();
        if (!element_list) {
            return;
        }

        _.each(data, function(elem_id) {
            var elem = element_list[elem_id];

            if (elem) {

                if (elem["type"] == "Line") {
                    var start_elem_id = elem["startElementId"];
                    var start_elem = element_list[start_elem_id];

                    if (start_elem != undefined) {
                        if (start_elem["outLines"] && start_elem["outLines"][elem_id]) {
                            delete start_elem["outLines"][elem_id];
                        }
                    }

                    var end_elem_id = elem["endElementId"];
                    var end_elem = element_list[end_elem_id];
                    if (end_elem != undefined) {
                        if (end_elem["inLines"] && end_elem["inLines"][elem_id]) {
                            delete end_elem["inLines"][elem_id];
                        }
                    }
                }

                editor.unSelectElements([elem]);
                elem.presentation.remove();

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


export default AElements
