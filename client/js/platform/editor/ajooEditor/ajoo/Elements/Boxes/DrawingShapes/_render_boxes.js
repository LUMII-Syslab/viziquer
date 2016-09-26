
Box = function(editor) {

	var box = this;
	box.editor = editor;
	box.type = "Box";
	box.settings = editor.boxSettings;

	box.getNodeProperties = function(element) {

		var res = element["style"]["elementStyle"];
		res["perfectDrawEnabled"] = false;

		var delta_x = 0;
		var delta_y = 0;

		box.setFillStyle(res, element["style"], res["width"], res["height"], delta_x, delta_y);
		return res;
	}

	box.setFillStyle = function(res, elem_style, box_width, box_height, offset_x, offset_y) {

		if (elem_style["shape"] == "Ellipse") {
			offset_x = box_width / 2;
			offset_y = box_height / 2;
		}

		else {
			if (!offset_x)
				offset_x = 0;

			if(!offset_y)
				offset_y = 0;
		}

		//possible values: color, linear-gradient, radial-gradient, pattern
		switch (elem_style["fillPriority"]) {
		    case "color":
		        res["fill"] = elem_style["fill"];
		        
		        break;

		    case "linear-gradient":

		    	if (elem_style["shape"] == "Square") {

		    		//var c = Math.sqrt(2) / 4
		    		var c = Math.sqrt(2)
		    		var c2 = Math.sqrt(2) / 2;
		    		//var c1 = -1 - c2;
		    		//var c3 = 1 - c2;
		    		var c3 = c / 4;

		    		//-1.75, -0.75, 0.25, -1.25

					res["fillLinearGradientStartPointX"] = -1.75 * offset_x + box_width * elem_style["fillLinearGradientStartPointX"];
					res["fillLinearGradientStartPointY"] = -0.75 * offset_y + box_height * elem_style["fillLinearGradientStartPointY"];						
					res["fillLinearGradientEndPointX"] = -0.25 * offset_x + box_width * elem_style["fillLinearGradientEndPointX"];
					res["fillLinearGradientEndPointY"] = -1.25 * offset_y + box_height * elem_style["fillLinearGradientEndPointY"];	
		    	}

		    	else if (elem_style["shape"] == "Hexagon") {
					res["fillLinearGradientStartPointX"] = box_height * elem_style["fillLinearGradientStartPointY"] - offset_y;
					res["fillLinearGradientStartPointY"] = box_width * elem_style["fillLinearGradientStartPointX"] - offset_x;							
					res["fillLinearGradientEndPointX"] = box_height * elem_style["fillLinearGradientEndPointY"] - offset_y;	
					res["fillLinearGradientEndPointY"] = box_width * elem_style["fillLinearGradientEndPointX"] - offset_x;
		    	}

		    	else {
					res["fillLinearGradientStartPointX"] = box_width * elem_style["fillLinearGradientStartPointX"] - offset_x;
					res["fillLinearGradientStartPointY"] = box_height * elem_style["fillLinearGradientStartPointY"] - offset_y;								
					res["fillLinearGradientEndPointX"] = box_width * elem_style["fillLinearGradientEndPointX"] - offset_x;
					res["fillLinearGradientEndPointY"] = box_height * elem_style["fillLinearGradientEndPointY"] - offset_y;	
				}

				res["fillLinearGradientColorStops"] = elem_style["fillLinearGradientColorStops"];
		       
		        break;

		    case "radial-gradient":
				res["fillRadialGradientStartPointX"] = box_width * elem_style["fillRadialGradientStartPointX"] - offset_x;
				res["fillRadialGradientStartPointY"] = box_height * elem_style["fillRadialGradientStartPointY"] - offset_y;				
				res["fillRadialGradientEndPointX"] = box_width * elem_style["fillRadialGradientEndPointX"] - offset_x;
				res["fillRadialGradientEndPointY"] = box_height * elem_style["fillRadialGradientEndPointY"] - offset_y;
				res["fillRadialGradientStartRadius"] = box_width * elem_style["fillRadialGradientStartRadius"];
				res["fillRadialGradientEndRadius"] = box_width * elem_style["fillRadialGradientEndRadius"];
				res["fillRadialGradientColorStops"] = elem_style["fillRadialGradientColorStops"];
		       
		        break;

		    case "pattern":
		    	//pattern properties needed
		        break;
		}
	}

	box.resizeGradient = function(element, shape_group, style) {

		var shape = find_child(shape_group, "Shape");
		if (shape) {	

			if (shape["attrs"]["fillPriority"] != "color") {

				//selects element style and the size, then recomputes the gradient
				if (!style) {
					var element = Elements.findOne({_id: shape_group["objId"]})
					if (element)
						style = element["style"]["elementStyle"];
				}

				var size = get_element_size(shape_group);
				var transformed_style = {};

				box.setFillStyle(transformed_style, style, size["width"], size["height"], size["centerX"], size["centerY"]);
				
				shape.setAttrs(transformed_style);
			}
		}
	}
}

Box.prototype = {

	render: function(parent, element) {

		var box = this;

		box.style = element.style;

		//box propeties
		var node_properties = box.getNodeProperties(element);

		//creates the shape
		var new_shape_obj = box.createShape(node_properties);

		//stores all the element components
		var location = element["location"];
		var shape_group = new Konva.Group({x: location["x"], y: location["y"]});
			shape_group["name"] = "ShapeGroup";
			shape_group["objId"] = element["_id"];
			shape_group["type"] = "Box";

		box["inLines"] = {};
		box["outLines"] = {};

		box["minWidth"] = new_shape_obj["minWidth"] || 16;
		box["minHeight"] = new_shape_obj["minHeight"] || 16;

		//applying min limits
		var box_settings = box.settings;		
		if (box_settings.isMaxSizeEnabled) {
			box["maxWidth"] = new_shape_obj["maxWidth"] || 512;
			box["maxHeight"] = new_shape_obj["maxHeight"] || 512;
		}

		else {
			box["maxWidth"] = Infinity;
			box["maxHeight"] = Infinity;

			if (new_shape_obj["maxWidth"])
				box["maxWidth"] = new_shape_obj["maxWidth"];

			if (new_shape_obj["maxHeight"])
				box["maxHeight"] = new_shape_obj["maxHeight"];
		}

		box["name"] = element["style"]["elementStyle"]["shape"];

		box.shapes = new_shape_obj["element"];

		//box.shapes[0].transformsEnabled('position');

		box.presentation = shape_group;

		box.linkShapesToParent(shape_group, new_shape_obj);

		//add shape group to the parent
		parent.add(shape_group);

		box.updateSizeAndCompartments(location["width"], location["height"]);

		//adding texts group
		var texts_group = new Konva.Group({listening: false});
			texts_group["name"] = "TextsGroup";
		shape_group.add(texts_group);
		texts_group.moveToTop();

		//adds element compartments
		var compartments = element["compartments"];
		box.compartments = new BoxCompartments(box, compartments);

		box.data = element.data;

		box.elementTypeId = element.elementTypeId;

		//if (box.style.elementStyle.imageSrc)
		//	box.renderAsImage(box.style.elementStyle.imageSrc);
	},

	create: function(parent, element) {
		var box = this;
		box._id = element["_id"];

		box.render(parent, element);

		box.handlers = new ElementHandlers(box);
	},

	updateShapeSize: function(size) {
		var box = this;
		var shape = box.shapes[0];

		shape.width(size["width"]);
		shape.height(size["height"]);
	},

	computeShapeSize: function(width, height) {
		return {width: width, height: height};
	},

	updateSize: function(new_width, new_height) {
		var box = this;
		var shape = box.shapes[0];

		var resized_size = {width: new_width, height: new_height};
		box.computeMinSize(resized_size);
		box.computeMaxSize(resized_size);

		//updating size
		var new_size = box.computeShapeSize(resized_size.width, resized_size.height);
		box.updateShapeSize(new_size);

		//setting box size
		box.width = new_size["width"] || new_width;
		box.height = new_size["height"] || new_height;

		return new_size;
	},

	updateSizeAndCompartments: function(new_width, new_height) {
		var box = this;
		var shape = box.shapes[0];

		var resized_size = {width: new_width, height: new_height};
		box.computeMinSize(resized_size);
		box.computeMaxSize(resized_size);
		box.computeMinCompartmentArea(resized_size);

		//updating size
		var new_size = box.computeShapeSize(resized_size.width, resized_size.height);

		new_size.width = Math.round(new_size.width);
		new_size.height = Math.round(new_size.height);

		box.updateShapeSize(new_size);

		//setting box size
		box.width = new_size["width"] || new_width;
		box.height = new_size["height"] || new_height;

		//recomputing compartments
		var compartments = box.compartments;
		if (compartments) {
			compartments.recomputeCompartmentsPosition();
		}

		return new_size;
	},

	updateElementSize: function(new_x, new_y, new_x2, new_y2) {
		
		var element = this;

		//element size before update
		var elem_size = element.getSize();

		//computing the new width and height
		var new_width = new_x2 - new_x;
		var new_height = new_y2 - new_y;

		//udpating the size
		var new_size = element.updateSizeAndCompartments(new_width, new_height);
		var shape_group = element.presentation;

		//recomputing the element's x position
		if (elem_size["x"] != new_x)
			shape_group.x(new_x2 - new_size["width"]);

		//recomputing the element's y position
		if (elem_size["y"] != new_y)
			shape_group.y(new_y2 - new_size["height"]);
	},

	getSize: function() {
		var box = this;	
		var shape_group = box.presentation;
		var stage = box.editor.stage;

		return {x: shape_group.x(), y: shape_group.y(),
					width: box.width, height: box.height};
	},

	getElementPosition: function() {

		var box = this;
		var editor = box.editor;

	    var delta_x = 0;
	    var delta_y = 0;

	    var selection = editor.getSelectedElements();
	    if (selection[box._id]) {

        	var drag_layer = editor.getLayer("DragLayer");
            var drag_group = find_child(drag_layer, "DragGroup");

            delta_x = drag_group.x();
            delta_y = drag_group.y();
	    }

	    var pos = box.getSize();
	    return {x: pos["x"] + delta_x, y: pos["y"] + delta_y, width: pos.width, height: pos.height};
	},

	setElementPosition: function(new_x, new_y) {

		var box = this;
		var editor = box.editor;

	    var delta_x = 0;
	    var delta_y = 0;

		var shape_group = box.presentation;

	    var selection = editor.getSelectedElements();
	    if (selection[box._id]) {

        	var drag_layer = editor.getLayer("DragLayer");
            var drag_group = find_child(drag_layer, "DragGroup");

            new_x -= drag_group.x();
            new_y -= drag_group.y();
	    }

    	shape_group.x(new_x);
    	shape_group.y(new_y);
	},

	updateStyle: function(style_obj) {

		var box = this;
		var shape_group = box.presentation;

		var style;
		if (style_obj)
			style = style_obj["elementStyle"];

		//changing box type
		if (style["shape"] && box.name != style["shape"]) {

			var new_elem = box.editor.elements.createShape(style["shape"]);

			var new_style = box.style;
			new_style["shape"] = style.shape;

			var size = box.getSize();

			var box_in = {
							_id: box._id,
							location: {x: size.x, y: size.y, width: size.width, height: size.height,},
							style: new_style,
							compartments: _.map(box.compartments.compartments, function(compartment) {
								return {_id: compartment._id,
										style: compartment.presentation.getAttrs(),
										value: compartment.value,
										input: compartment.input,
									};
							}),
						};

			var parent = box.presentation.getParent();
			new_elem.create(parent, box_in);
			new_elem.inLines = box.inLines;
			new_elem.outLines = box.outLines;

			new_elem.setStyleAttrs(style);

			var editor = box.editor;
			editor.elements.elementList[box._id] = new_elem;

			box.presentation.destroy();

			if (box.resizers)
				box.resizers.remove();

			if (parent["name"] == "ShapesLayer") {
				//var shapes_layer = edito.getLayer("ShapesLayer");
				//shapes_layer.batchDraw();
			}

			else {
				editor.unSelectElements([new_elem]);
				var is_refresh_not_needed = true;
				editor.selectElements([new_elem], is_refresh_not_needed);
			}
		}

		box.setStyleAttrs(style);
	},

	setStyleAttrs: function(style) {
		var box = this;
		var shapes = box.shapes;
		_.each(shapes, function(shape) {
			box.updateShapeStyle(style);
			_.extend(box.style.elementStyle, style);
		});
	},

	updateShapeStyle: function(style) {

		var box = this;
		var shape_group = box.presentation;

		var shapes = box.shapes;
		_.each(shapes, function(shape) {
			shape.setAttrs(style);

			//if shape has gradient
			if (shape["attrs"]["fillPriority"] != "color") {
				//resize_gradient(shape_group);
			}
		});
	},

	setUnselectedStyle: function() {
		var box = this;
		var editor = box.editor;
		
		if (editor.isEditMode())
			box.removeResizers();

		else
			box.updateStyle({elementStyle: {shadowBlur: 0}});
	},

	setSelectedStyle: function() {
		var box = this;
		var editor = box.editor;

		if (editor.isEditMode())
			box.addResizers();
		
		else {
			var style = {elementStyle: {shadowEnabled: true, shadowColor: "red", shadowBlur: 15}};
			box.updateStyle(style);
		}
	},

	addResizers: function() {
		var box = this;
		var resizers = new Resizers(box);
		resizers.addDefaultResizers();
		box.resizers = resizers;
	},

	removeResizers: function() {
		var box = this;
		if (box.resizers)
			box.resizers.remove();

		box.resizers = undefined;
	},

	remove: function() {
		var box = this;
		box.editor.removeElements([box._id]);
	},

	buildSVG: function() {
		var box = this;
		var pos = box.getElementPosition();

		return box.buildSVGSize(pos.x, pos.y);
	},

	buildSVGSize: function(x, y) {
		var box = this;

		var size = box.getSize();

		var path = box.toSVG(x, y, size.width, size.height);
		return new SVGObject(path); 
	},

	compartmentArea: function() {

		var box = this;
        var size = box.getSize();

	    var x1 = 0;
	    var x2 = size["width"] - x1;

	    var y1 = size["height"] + Math.sqrt(size["height"] / 100);
	    var y2 = y1 + size["height"];

		return {x1: x1, x2: x2, y1: y1, y2: y2};
	},

	collectLinkedLines: function(lines) {

		var box = this;
		var editor = box.editor;

		var lines_map = {};

		var selected = editor.getSelectedElements();

		this.collectLinkedLinesByName("inLines", lines, selected, lines_map);
		this.collectLinkedLinesByName("outLines", lines, selected, lines_map);

		return lines;
	},

	collectLinkedLinesByName: function(in_or_out, lines, selected, lines_map) {

		var elem = this;
	    _.each(elem[in_or_out], function(line, id) {
	        
	        //checking if the line was already selected
	    	var line_id = lines_map[id];
	    	if (line_id) {
	    		return;
	    	}

	    	else {
	    		lines_map[id] = true;
	    	}

	        var points = line.getPoints().slice();
	        
	        var index = 0;

	        var start_obj = selected[line.startElementId];
	        var end_obj = selected[line.endElementId];

	       	var line_obj = {line: line, points: points};

	        if ((start_obj && !end_obj) || (!start_obj && end_obj)) {

	        	if (line_obj.line.lineType === "Orthogonal") {

			        if (in_or_out == "inLines") {
			        	index = points.length - 4;
			        }

	        		line_obj.index = index;
	        		lines.orthogonalLines.push(line_obj);
	        	}

	        	else if (line_obj.line.lineType === "Direct") {

			        if (in_or_out == "inLines") {
			        	index = points.length - 2;
			        }

	        		line_obj.index = index;
	        		lines.directLines.push(line_obj);
	        	}

	        }

	        else {
	        	lines.draggedLines.push(line_obj);
	        }
	    });

	},

	linkShapesToParent: function(shape_group, new_shape_obj) {

		var shapes = new_shape_obj["element"];
		_.each(shapes, function(shape) {
			shape_group.add(shape);
		});
	},

	computeMinSize: function(new_size) {

		var box = this;
		var box_settings = box.settings;

		//applying min limits
		new_size.width = Math.max(new_size.width, box["minWidth"]);
		new_size.height = Math.max(new_size.height, box["minHeight"]);
	},

	computeMaxSize: function(new_size) {

		var box = this;
		var box_settings = box.settings;

		//applying max limits
		new_size.width = Math.min(new_size.width, box["maxWidth"]);
		new_size.height = Math.min(new_size.height, box["maxHeight"]);
	},

	computeMinCompartmentArea: function(new_size) {
		var box = this;
		var compartments = box.compartments;

		//applying compartment min limits
		if (compartments && box.settings.isTextFitEnabled) {
			new_size.width = Math.max(new_size.width, compartments["minWidth"]);
			new_size.height = Math.max(new_size.height, compartments["minHeight"]);
		}
	},

	renderAsImage: function(image_src) {

		var box = this;

		//hiding shape icon
		_.each(box.presentation.getChildren(), function(child) {
			child.visible(false);
		});

		var size = box.getSize();
		var konva_img = new Konva.Image({
										width: size.width,
										height: size.height,
								    });
		konva_img.name = "ShapeImage";		
		box.presentation.add(konva_img);

		var imageObj = new Image();
		imageObj.src = image_src;

	    konva_img.image(imageObj);
	},

	computeConnectionPointPositions: function() {

		var box = this;

		var box_svg = box.buildSVG();
		var pos = box.getElementPosition();
		var elem_size = box.getSize();

		var connection_point_positions = {};
		var inf = 1000000;

		//horizontal line intersection
		var x = pos["x"] + elem_size["width"] / 2;
		var v_line_points = [x, -inf, x, inf];

	    var vertical_line_svg = new LineSVGObject(v_line_points, 0);
	    var v_inter_points = vertical_line_svg.computeIntersection(box_svg);

		//top middle point
		var point1_obj = vertical_line_svg.get_closest_point_from_intersections([x, -inf], v_inter_points);
		if (point1_obj.point) {
			var point1 = point1_obj.point;
			connection_point_positions["TopMiddle"] = {x: point1[0], y: point1[1]};
		}

		//bottom middle point
		var point2_obj = vertical_line_svg.get_closest_point_from_intersections([x, inf], v_inter_points);
		if (point2_obj.point) {
			var point2 = point2_obj.point;
			connection_point_positions["BottomMiddle"] = {x: point2[0], y: point2[1]};
		}
							

		//vertical line intersections
		var y = pos["y"] + elem_size["height"] / 2;
		var h_line_points = [-inf, y, inf, y];

	    var horizontal_line_svg = new LineSVGObject(h_line_points, 0);
	    var h_inter_points = horizontal_line_svg.computeIntersection(box_svg);

		//left middle point
		var point3_obj = vertical_line_svg.get_closest_point_from_intersections([-inf, y], h_inter_points);
		if (point3_obj.point) {
			var point3 = point3_obj.point;
			connection_point_positions["LeftMiddle"] = {x: point3[0], y: point3[1]};
		}

		//right middle point
		var point4_obj = vertical_line_svg.get_closest_point_from_intersections([inf, y], h_inter_points);
		if (point4_obj.point) {
			var point4 = point4_obj.point;
			connection_point_positions["RightMiddle"] = {x: point4[0], y: point4[1]};
		}

		//adding radius
		_.each(connection_point_positions, function(connection_point_position) {
			connection_point_position.radius = 5;
			connection_point_position.activeFill = "black";
			connection_point_position.activeStroke = "black";

			connection_point_position.defaultFill = "white";
			connection_point_position.defaultStroke = "black";

		});

		return connection_point_positions;
	},

};

