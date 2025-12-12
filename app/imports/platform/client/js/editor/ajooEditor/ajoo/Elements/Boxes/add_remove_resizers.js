// import { _ } from 'vue-underscore';

var Resizers = function(element) {
	var resizers = this;
	resizers.element = element;

	//resizer's edge length
	resizers.edge = 6;
	resizers.array = [];

	resizers.cursorEntered = "default";
}

Resizers.prototype = {

	addDefaultResizers: function() {
		var resizers = this;
		var excluded = {};
		resizers.addCustomResizers(excluded);
	},

	addRegularShapeResizers: function() {
		var resizers = this;
		var excluded = {TopMiddle: true, BottomMiddle: true,
							LeftMiddle: true, RightMiddle: true};

		resizers.addCustomResizers(excluded);
	},

	addCustomResizers: function(excluded) {

		var resizers = this;
		var element = resizers.element;
		var editor = element.editor;

		if (!editor.isEditMode()) {
			return;
		}

		var shape_group = element.presentation;
		var edge = resizers.edge;

		//stores resizers positions
		var resizers_positions = {};

		//selection rectangles width and height
		var size = element.getSize();

		var shape_width = size["width"];
		var shape_height = size["height"];

		resizers_positions["TopLeftX"] = -edge/2;
		resizers_positions["TopLeftY"] = -edge/2;

		resizers_positions["TopMiddleX"] = shape_width / 2 - edge / 2;
		resizers_positions["TopMiddleY"] = - edge/2;

		resizers_positions["TopRightX"] = shape_width - edge / 2;
		resizers_positions["TopRightY"] = -edge/2;

		resizers_positions["BottomLeftX"] = -edge/2;
		resizers_positions["BottomLeftY"] = shape_height - edge / 2;

		resizers_positions["BottomMiddleX"] = shape_width / 2 - edge / 2;
		resizers_positions["BottomMiddleY"] = shape_height - edge / 2;

		resizers_positions["BottomRightX"] = shape_width - edge / 2;
		resizers_positions["BottomRightY"] = shape_height - edge / 2;

		resizers_positions["LeftMiddleX"] = -edge/2;
		resizers_positions["LeftMiddleY"] = shape_height / 2 - edge / 2;	

		resizers_positions["RightMiddleX"] = shape_width - edge / 2;
		resizers_positions["RightMiddleY"] = shape_height / 2 - edge / 2;

		//adding resizers group
		var resizers_group = new Konva.Group({});
		resizers_group["name"] = "Resizers";

		shape_group.add(resizers_group);
		resizers.presentation = resizers_group;

		//top left
		if (!excluded["TopLeft"])
			resizers.array.push(new Resizer({
											name: "TopLeft",
											mouseStyle:'nw-resize',
											x: resizers_positions["TopLeftX"],
											y: resizers_positions["TopLeftY"],
										}, resizers));

		//top middle
		if (!excluded["TopMiddle"])
			resizers.array.push(new Resizer({
											name: "TopMiddle",
											mouseStyle:'n-resize',
											x: resizers_positions["TopMiddleX"],
											y: resizers_positions["TopMiddleY"],
										}, resizers));

		//top right
		if (!excluded["TopRight"])	
			resizers.array.push(new Resizer({
											name: "TopRight",
											mouseStyle:'ne-resize',
											x: resizers_positions["TopRightX"],
											y: resizers_positions["TopRightY"],
										}, resizers));

		//bottom left
		if (!excluded["BottomLeft"])	
			resizers.array.push(new Resizer({
											name: "BottomLeft",
											mouseStyle:'sw-resize',
											x: resizers_positions["BottomLeftX"],
											y: resizers_positions["BottomLeftY"],
										}, resizers));

		//bottom middle
		if (!excluded["BottomMiddle"])
			resizers.array.push(new Resizer({
											name: "BottomMiddle",
											mouseStyle:'s-resize',
											x: resizers_positions["BottomMiddleX"],
											y: resizers_positions["BottomMiddleY"],
										}, resizers));

		//bottom right
		if (!excluded["BottomRight"])	
			resizers.array.push(new Resizer({
											name: "BottomRight",
											mouseStyle:'se-resize',
											x: resizers_positions["BottomRightX"],
											y: resizers_positions["BottomRightY"],
										}, resizers));

		//left middle
		if (!excluded["LeftMiddle"])
			resizers.array.push(new Resizer({
											name: "LeftMiddle",
											mouseStyle:'w-resize',
											x: resizers_positions["LeftMiddleX"],
											y: resizers_positions["LeftMiddleY"],
										}, resizers));

		//right middle
		if (!excluded["RightMiddle"])
			resizers.array.push(new Resizer({
											name: "RightMiddle",
											mouseStyle:'e-resize',
											x: resizers_positions["RightMiddleX"],
											y: resizers_positions["RightMiddleY"],
										}, resizers));
	},

	remove: function(is_refresh_needed) {
	
		var resizers = this;
		var resizers_group = resizers.presentation;
		if (resizers_group) {

			var layer = resizers_group.getLayer();

			// resizers_group.destroy();
			// this is a hack because for some reason destroy does not work
			resizers_group.visible(false);

			if (is_refresh_needed) {
				layer.draw();	
			}
		}

		resizers.array = [];
	},
}


var Resizer = function(list, resizers) {

	var resizer = this;
	resizer.resizers = resizers;
	resizer.mouseStyle = list["mouseStyle"];

	var resizers_group = resizers.presentation;
	var edge = resizers.edge;

	//resizer's properties	
	var properties = {
				width: edge,
				height: edge,
				fill: 'white',
				stroke: 'black',
				strokeWidth: 0.4,
				perfectDrawEnabled: false,
			};

	properties["x"] = list["x"];
	properties["y"] = list["y"];

	//creates resizer rect
	var resizer_presentation = new Konva.Rect(properties);
		resizer_presentation["name"] = list["name"];
		resizer_presentation["class"] = "Resizer";

	resizers_group.add(resizer_presentation);

	resizer.presentation = resizer_presentation;
	resizer.handlers = new ResizerHanlders(resizer);
}

function ResizerHanlders(resizer) {

	var resizer_presentation = resizer.presentation;
	var element = resizer.resizers.element
	var editor = element.editor;

	resizer_presentation.on('mouseenter', function(e) {
		editor.setCursorStyle(resizer.mouseStyle);
		e.cancelBubble = true;
	});

	resizer_presentation.on('mouseleave', function(e) {
		editor.setCursorStyle("default");
	});

	resizer_presentation.on('mousedown touchstart', function(e) {

		e.cancelBubble = true;	

		var mouse_state_obj = editor.getMouseStateObject();
		if (!mouse_state_obj.isLeftClick(e)) {
			return;
		}

		//if the diagram is not in the edit mode, then resizing is not allowed
		if (!editor.isEditMode())
			return;

		editor.mouseState.mouseDown(e);

		var resizer_name = resizer_presentation.name;

		editor.actions.startAction("Resizing", {element: element, resizerName: resizer_name});
	});
}

export default Resizers