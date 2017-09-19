
Layers = function(editor, area) {

	var layers = this;
	layers.editor = editor;

	layers.GridLayer = function() {
		var is_fast_layer = true;

		var layer = layers.createLayer("GridLayer", is_fast_layer);
		layer.visible(false);

		return layer;
	}();

	layers.SwimlaneLayerF = function() {
	    var layer = layers.createLayer("SwimlaneLayer");
	    return layer;
	}();

	layers.ShapesLayerF = function(background_style) {
	    var layer = layers.createLayer("ShapesLayer");

	    editor.getSceneContainer().css({background: background_style["fill"]});
	    return layer;
	    
	}(area["background"]);

	layers.DragLayerF = function() {
	    var drag_layer = layers.createLayer("DragLayer");
	    //drag_layer["draggable"] = true;

	    var drag_group = new Konva.Group({dragDistance: 0, draggable: true});
	        drag_group["name"] = "DragGroup";
	        drag_layer.add(drag_group);

	    drag_group.on("dragstart", function() {

			layers.editor.actions.startAction("Dragging");
			drag_group.draggable(false);
			layers.editor.dragging = true;
	    });

	    var in_lines_group = new Konva.Group({});
	        in_lines_group["name"] = "InLinesGroup";
	        drag_layer.add(in_lines_group);

	    var out_lines_group = new Konva.Group({});
	        out_lines_group["name"] = "OutLinesGroup";
	        drag_layer.add(out_lines_group);

	    //var no_end_lines_group = new Konva.Group({dragDistance: 2, draggable: true});
	    var no_end_lines_group = new Konva.Group({});
	        no_end_lines_group["name"] = "NoEndLinesGroup";
	        drag_layer.add(no_end_lines_group);

	    no_end_lines_group.on("dragstart", function() {
	    	layers.editor.actions.startAction("Dragging");
	    });

	    return drag_layer;
	}();

	layers.DrawingLayerF = function() {
	    var layer = layers.createLayer("DrawingLayer");
	        layer.disableHitGraph();

	    var in_lines_group = new Konva.Group({});
	        in_lines_group["name"] = "InLinesGroup";
	        layer.add(in_lines_group);

	    var out_lines_group = new Konva.Group({});
	        out_lines_group["name"] = "OutLinesGroup";
	        layer.add(out_lines_group);

	    return layer;
	}();

}

Layers.prototype = {

	getLayer: function(name) {
		var layers = this;
		return layers[name];
	},

	createLayer: function(name, is_fast_layer) {

		var layers = this;
		var editor = layers.editor;

		var stage = editor.getStage();

		var layer;
		if (is_fast_layer)
			layer = new Konva.FastLayer();
		else
		    layer = new Konva.Layer();

		layer["name"] = name;
	    stage.add(layer);

	    layers[name] = layer;

	    return layer;
	},
}


