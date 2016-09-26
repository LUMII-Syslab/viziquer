
Zoom = function(editor) {

    var zoom = this;
    zoom.editor = editor;

    zoom.x = 1;
    zoom.y = 1;
    zoom.step = 0.1;

    zoom.min = 0.3;
    zoom.max = 2.5;
}

Zoom.prototype = {

    zoomIn: function() {
        var zoom = this;
        zoom.zooming(1);
    },

    zoomOut: function() {
        var zoom = this;
        zoom.zooming(-1);
    },

    zooming: function(zoom_direction, step) {
        var zoom = this;
        var editor = zoom.editor;

        var zoom_x = zoom["x"];
        var zoom_y = zoom["y"];

        var zoom_step = zoom["step"];
        if (step)
            zoom_step = step;


        var new_x = zoom_x + zoom_step * zoom_direction;
        var new_y = zoom_y + zoom_step * zoom_direction;

        zoom.scale(new_x, new_y);
    },

    scale: function(new_x, new_y, is_refresh_not_needed) {
        var zoom = this;
        var editor = zoom.editor;

        if (!new_x)
            new_x = zoom.x;

        if (!new_y)
            new_y = zoom.y;

        if (new_x > zoom.max || new_y > zoom.max) {
            return;
        }

        else if (new_x < zoom.min || new_y < zoom.min) {
            return;
        }


        editor.grid.step = Math.round(editor.grid.initialStep * new_x);

        //shapes layer
        var shapes_layer = editor.getLayer("ShapesLayer");
        shapes_layer.setScale({x: new_x, y: new_y});

        //drag layer
        var drag_layer = editor.getLayer("DragLayer");
        drag_layer.setScale({x: new_x, y: new_y});


        //drawing layer
        var drawing_layer = editor.getLayer("DrawingLayer");
        drawing_layer.setScale({x: new_x, y: new_y});

        if (!is_refresh_not_needed) {
            shapes_layer.draw();
            drag_layer.draw();
            drawing_layer.draw();
        }     

        var size = editor.size;
        size.recomputeStageBorders();

        if (editor.grid.isGridEnabled) {

            editor.grid.removeGrid();
            editor.grid.showGrid();
        }

        editor["zoom"]["x"] = new_x;
        editor["zoom"]["y"] = new_y;
    }, 

    reset: function() {
        var zoom = this;
        zoom.x = 1;
        zoom.y = 1;

        zoom.scale(1, 1);
    },

}
