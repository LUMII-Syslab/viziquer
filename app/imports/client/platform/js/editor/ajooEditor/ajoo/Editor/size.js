// import { _ } from 'vue-underscore';

var Size = function(editor) {
	var size = this;
	size.editor = editor;
	var stage = editor.getStage();
	size.state = {width: stage.width(), height: stage.height()};
}

Size.prototype = {

	recomputeStageBorders: function() {

		var size = this;
		var editor = size.editor;

		var stage = editor.getStage();

		//max x and max y values of the canvas
		var max_x = 0;
		var max_y = 0;

		//var selected = editor.getSelectedElements();
		//var max_point = size.computeActualSize(selected);

		var max_point = size.computeActualSize();

		var zoom = editor.getZoom();
		//size.resizeStage((max_point.x + max_point.minX) * zoom.x, (max_point.y + max_point.minY) * zoom.y);
		//size.resizeStage((max_point.x) * zoom.x, (max_point.y) * zoom.y);

		size.resizeStage(Math.round(max_point.x * zoom.x + stage.x()), Math.round(max_point.y * zoom.y + stage.y()));
	},

	computeActualSize: function(elements) {

		var size = this;
		var editor = size.editor;

		if (!elements)
			elements = editor.getElements();

		var max_x = 0;
		var max_y = 0;

		var min_x = Infinity;
		var min_y = Infinity;

		_.each(elements, function(elem) {

			if (elem["type"] == "Line")
				return;

			var elem_size = elem.getElementPosition();

			max_x = Math.max((elem_size.x + elem_size.width || 0), max_x);
			max_y = Math.max((elem_size.y + elem_size.height || 0), max_y);

			min_x = Math.min(min_x, elem_size.x);
			min_y = Math.min(min_y, elem_size.y);

		});

		return {x: max_x, y: max_y, minX: min_x, minY: min_y};
	},

	resizeStage: function(max_x, max_y, is_refresh_not_needed) {

		var size = this;
		var editor = size.editor;

		var stage = editor.getStage();

		//the current stage width and height
		var stage_max_x = stage.width();
		var stage_max_y = stage.height();

		const distance = 100;
		var has_changed = false;

		//editor container and its width and height
		if (stage_max_x - max_x < distance) {
			stage_max_x = Math.round(Math.max(max_x + 200, stage_max_x));
			has_changed = true;
		}


		if (stage_max_y - max_y < distance) {
			stage_max_y = Math.round(Math.max(max_y + 200, stage_max_y));
			has_changed = true;
		}


		if (has_changed) {
			size.setSize(stage_max_x, stage_max_y);
		}


		if (has_changed && editor.grid && editor.grid.isGridEnabled) {
			editor.removeGrid();
			editor.showGrid();
		}

	},

	setSize: function(new_width, new_height) {
		var size = this;
		var editor = size.editor;

		var stage = editor.stage;

		var diagram_container = editor.getSceneContainer();
		if (new_width > editor.width) {
			diagram_container.css({"overflow-x": "scroll"});

			if (new_width > stage.width()) {
				editor.stage.width(new_width);
			}
		}

		if (new_height > editor.height) {
			diagram_container.css({"overflow-y": "scroll"});

			if (new_height > stage.height()) {
				editor.stage.height(new_height);
			}
		}

	},

	reset: function() {

		var size = this;
		var editor = size.editor;

		editor.stage.x(0);
		editor.stage.y(0);
		editor.stage.width(editor.width);
		editor.stage.height(editor.height);
	},

}

export default Size