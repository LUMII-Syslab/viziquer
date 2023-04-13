// import { _ } from 'vue-underscore';
import {BoxCompartments, Compartment} from '../Boxes/box_compartments'


var LinkCompartments = function(element, comparts_in) {

	var compartments = this;
	compartments.element = element;
	compartments.editor = element.editor;

	compartments.textsGroup = compartments.editor.findChild(element.presentation, "TextsGroup");

	compartments.compartments = [];
	compartments.placements = {};

	compartments.functions = {north: compartments.vertical_right_end,
								south: compartments.vertical_left_start,
								east: compartments.horizontal_left_start,
								west: compartments.horizontal_right_end,
							};

	compartments.create(comparts_in);

	return compartments;
}

LinkCompartments.prototype = {

	create: function(comparts_in) {

		var compartments = this;
		var line = compartments.element;
		var editor = compartments.editor;

		var shape_group = line.presentation;

		var elem_id = line._id;

		var x = 0;
		var y = 0;

		var points = line.getPoints();

		var text_positions = {};

		var texts = {};
		var sizes = {};

		//adding compartments
		compartments.placements = {};
		var comparts = compartments.compartments;	
		_.each(comparts_in, function(compart_in) {

			if ((compart_in && (compart_in["value"] == "" || _.isUndefined(compart_in["value"]))) ||
				(compart_in["style"] && compart_in["style"]["visible"] == false)) {
				return;
			}

			var compart_style = compart_in["style"];
			
			compart_in["x"] = 10;
			compart_in.y = 20;

			var placement_name = compart_style["placement"];
			var placement = compartments.getPlacementByName(placement_name);
			var parent = placement.group;

			var compart = new Compartment(compartments, compart_in, parent);
			//comparts[compart._id] = compart;
			comparts.push(compart);
			editor.compartmentList[compart._id] = compart;

			compart.placement = placement;
			placement.width = Math.max(placement.width, compart.textWidth);
			placement.height += compart.textHeight;
		});
		
		compartments.computeGroupsPositions();
		compartments.computeTextsPositions();
	},

	getPlacementByName: function(placement_name) {

		var compartments = this;
		var texts_group = compartments.textsGroup;

		var placements = compartments.placements;
		if (!placements[placement_name]) {

			var group = new Konva.Group({listening: false});
			 	group["name"] = "Texts";
			 	group["type"] = placement_name;

			texts_group.add(group);

			placements[placement_name] = {name: placement_name,
											group: group,
											width: 0,
											height: 0,
										};
		}

		return placements[placement_name];
	},

	computeGroupsPositions: function() {

		var compartments = this;
		var placements = compartments.placements;

		_.each(placements, function(placement) {
			compartments.computeGroupPosition(placement);
		});

	},

	computeGroupPosition: function(placement) {

		var compartments = this;
		
		var line = compartments.element;
		var points = line.getPoints();

    	var width = placement.width;
    	var height = placement.height;

		var placements = {

					"start-left": function() {
				    	var size = compartments.get_end_shape_size("Start");
				        return compartments.compute_start_left_position(width, height, size);
					},

					"start-right": function() {
		    			var size = compartments.get_end_shape_size("Start");
						return compartments.compute_start_right_position(width, height, size);
					},				

					"middle-left": function() {

						var res = compartments.computeMiddlePoint();

						var point = res.point;
						var index = res.index;

						var position = compartments.buildPositionPath(index, index+1, index+2, index+3);

						position += "middle-left";
						var size = {};

						return compartments.labelLayout(position, width, height, size, point.x, point.y);
					},

					"middle-right": function() {

						var res = compartments.computeMiddlePoint();

						var point = res.point;
						var index = res.index;

						var position = compartments.buildPositionPath(index, index+1, index+2, index+3);

						position += "middle-right";
						var size = {};

						return compartments.labelLayout(position, width, height, size, point.x, point.y);
					},	

					"end-left": function() {
				    	var size = compartments.get_end_shape_size("End");
				        return compartments.compute_end_left_position(width, height, size);
					},

					"end-right": function() {
				    	var size = compartments.get_end_shape_size("End");
				    	return compartments.compute_end_right_position(width, height, size);
					},	

					"middle": function() {
					},	

				};

		var func = placements[placement.name];
		if (func) {
			var pos = func(placement);
			var group = placement.group;

			if (!pos)
				return;

			group.x(pos.x);
			group.y(pos.y);
		}
	},

	computeTextsPositions: function() {

		var compartments = this;
		var placements = compartments.placements;

		_.each(placements, function(placement) {
			compartments.computeTextPositions(placement);
		});

	},

	computeTextPositions: function(placement) {

		//assigning texts to the group
		var text_x = 0;
		var text_y = 0;
		_.each(placement.group.getChildren(), function(text) {
			text.setAttrs({x: text_x, y: text_y});
			text_y += text.height();
		});
	},

	compute_start_left_position: function(width, height, size) {
		var compartments = this;
		return compartments.compute_line_text_position(width, height, size, "start", "right");
	},

	compute_start_right_position: function(width, height, size) {
		var compartments = this;
		return compartments.compute_line_text_position(width, height, size, "start", "left");
	},

	compute_end_left_position: function(width, height, size) {
		var compartments = this;
		return compartments.compute_line_text_position(width, height, size, "end", "left");
	},

	compute_end_right_position: function(width, height, size) {
		var compartments = this;
		return compartments.compute_line_text_position(width, height, size, "end", "right");
	},

	compute_line_text_position: function(width, height, size, direction, location) {

		var compartments = this;
		var functions = compartments.functions;

		var position = "";

		var points = compartments.element.getPoints();

		var x1, y1, x2, y2;
		if (direction == "start") {
			x1 = 0;
			y1 = 1;
			x2 = 2;
			y2 = 3;
		}

		else if (direction == "end") {
			var len = points.length;
			x1 = len - 2;
			y1 = len - 1;
			x2 = len - 4;
			y2 = len - 3;
		}

		var x = points[x1];
		var y = points[y1];


		if (points[x1] == points[x2] || points[y1] == points[y2]) {

			var position = compartments.buildPositionPath(x1, y1, x2, y2);

		    position += location;

		    return compartments.labelLayout(position, width, height, size, x, y);
		}

	    else {
	    	var end_point_x = points[x1];
	    	var end_point_y = points[y1];

			var rotation = compartments.compute_rotation(points, x1, y1, x2, y2, end_point_x, end_point_y);
		    if (0 < rotation["rotation"] && rotation["rotation"] < 45) {
				return functions["south"](points, x1, y1, width, height, size);
		    }

		    else if (45 < rotation["rotation"] && rotation["rotation"] < 90) {
				return functions["west"](points, x1, y1, width, height, size);
		  	}

		    else if (90 < rotation["rotation"] && rotation["rotation"] < 135) {
				return functions["north"](points, x1, y1, width, height, size);
		  	}

		    else if (135 < rotation["rotation"] && rotation["rotation"] < 180) {
				return functions["north"](points, x1, y1, width, height, size);
		    }

		    else if (180 < rotation["rotation"] && rotation["rotation"] < 225) {
				return functions["north"](points, x1, y1, width, height, size);
		    }

		    else if (225 < rotation["rotation"] && rotation["rotation"] < 315) {
				return functions["east"](points, x1, y1, width, height, size);
		    }

		    else if (315 < rotation["rotation"] && rotation["rotation"] < 360) {
				return functions["south"](points, x1, y1, width, height, size);
		    }
	    }
	},

	buildPositionPath: function(x1, y1, x2, y2) {

		var compartments = this;

		var position = "";
		var points = compartments.element.getPoints();

		//if vertical
	    if (points[x1] == points[x2]) {

	    	position += "vertical";

			if (points[y1] < points[y2])
				position += "-south-";
	    	else 
	    		position += "-north-";
	    }

	    //if horizontal
	    else if (points[y1] == points[y2]) {

	    	position += "horizontal";

			if (points[x1] < points[x2])
				position += "-east-";
	    	else 
	    		position += "-west-";
	    }

	    return position;

	},


	// horizontal (direction: ->)
	// left start  || left end
	// right start || right end

	horizontal_left_start: function(x, y, width, height, size) {

		var padding = {width: 3, height: 0};
		if (size["width"] == 0 && size["height"] == 0)
			padding["height"] = 4;

		return {x: x + padding["width"],
				y: y - (height + padding["height"] + size["width"])};
	},

	horizontal_right_start: function(x, y, width, height, size) {

		var padding = {width: 3, height: 0};
		if (size["width"] == 0 && size["height"] == 0)
			padding["height"] = 3;

	    return {x: x + padding["width"],
	    		y: y + padding["height"] + size["width"]}
	},

	horizontal_left_end: function(x, y, width, height, size) {
		
		var padding = {width: 3, height: 0};
		if (size["width"] == 0 && size["height"] == 0)
			padding["height"] = 3;
		
	    return {x: x - (width + padding["width"]),
	    		y: y - (height + padding["height"] + size["width"])};

	},

	horizontal_right_end: function(x, y, width, height, size) {
		
		var padding = {width: 3, height: 0};
		if (size["width"] == 0 && size["height"] == 0)
			padding["height"] = 4;

	    return {x: x - (width + padding["width"]),
	    		y: y + padding["height"] + size["width"]}
	},

	horizontal_left_middle: function(x, y, width, height, size) {
		var compartments = this;
		return {x: x - width / 2, y: y - height - 2};

	},

	horizontal_right_middle: function(x, y, width, height, size) {
		var compartments = this;
		return {x: x - width / 2, y: y + 2};
	},



	// vertical (direction: down)
	// right start || left start
	// right end   || left end

	vertical_left_start: function(x, y, width, height, size) {
		
		var padding = {width: 2, height: 3};
		if (size["width"] == 0 && size["height"] == 0)
			padding["width"] = 4;

		return {x: x + padding["width"] + size["width"],
				y: y + padding["height"]};
	},

	vertical_right_start: function(x, y, width, height, size) {

		var padding = {width: 2, height: 3};
		if (size["width"] == 0 && size["height"] == 0)
			padding["width"] = 5;

	    return {x: x - (width + padding["width"] + size["width"]),
	    		y: y + padding["height"]}
	},

	vertical_left_end: function(x, y, width, height, size) {

		var padding = {width: 3, height: 3};
		if (size["width"] == 0 && size["height"] == 0)
			padding["width"] = 4;

	    return {x: x + padding["width"] + size["width"],
	    		y: y - (height + padding["height"])}
	},

	vertical_right_end: function(x, y, width, height, size) {

		var padding = {width: 3, height: 3};
		if (size["width"] == 0 && size["height"] == 0)
			padding["width"] = 4;

	    return {x: x - (width + padding["width"] + size["width"]),
	    		y: y - (height + padding["height"])}
	},

	vertical_left_middle: function(x, y, width, height, size) {
		var compartments = this;
		return {x: x - width - 2, y: y - height / 2};
	},

	vertical_right_middle: function(x, y, width, height, size) {
		var compartments = this;
		return {x: x + 4, y: y - height / 2};
	},

	get_end_shape_size: function(name) {

		var compartments = this;
		var line = compartments.element;

		var end_shape_obj;
		if (name == "Start")
			end_shape_obj = line.startElement;
		else
			end_shape_obj = line.endElement;

		var shapes = end_shape_obj.presentation;
		if (!shapes)
			return {width: 0, height: 0};

		else {
			var shape = shapes[0];
			if (!shape)
				return {width: 0, height: 0};

			return compartments.get_shape_size(shape);
		}
	},

	get_shape_size: function(shape) {

		if (shape["name"] == "Arrow") {
			return {width: shape.width() / 2, height: shape.height()};
		}

		else if (shape["className"] == "RegularPolygon" || shape["className"] == "Circle") {
			var radius = shape.radius();
			if (!radius)
				return {width: 0, height: 0};
			else
				return {width: radius * 2, height: radius * 2};
		}
	},

	compute_rotation: function(points, x1_index, y1_index, x2_index, y2_index, end_point_x, end_point_y) {

		var x1 = points[x1_index];
		var y1 = points[y1_index];

		var x2 = points[x2_index];
		var y2 = points[y2_index];

		var x_delta = (x2 - x1);
		var y_delta = (y2 - y1);

		var rotation;
		if (x_delta != 0) {

			//if horizontal line
			if (y_delta == 0) {
				if (x1 > x2)
					rotation = 0;
				else
					rotation = 180;
			}
			else {

				// a formula: k = (y2-y1) / (x2-x1)
				var k = y_delta / x_delta;
				rotation = Math.atan(k) * (180 / Math.PI);
				if (x1 < x2) {
					rotation = 180 + rotation; 
				}
			}
		}

		//if vertical line
		else {
			if (y1 > y2)
				rotation = 90;
			else
				rotation = 270;
		}

		return {rotation: rotation + 90};
	},

	move_center: function(shape, points, end_point_x_index, end_point_y_index, rotation_obj) {

		var x = points[end_point_x_index];
		var y = points[end_point_y_index];

		var move_func;
		if (shape["className"] == "Line")
			move_func = "moveArrowCenter";

		else if (shape["className"] == "RegularPolygon" || shape["className"] == "Circle")
			move_func = "movePolygonCenter";

		var move_center_func = {

			moveArrowCenter: function() {

				var rotation = rotation_obj["rotation"];
				var points = shape.points();

				var x_middle = (points[0] + points[points.length-2]) / 2;
				var y_middle = (points[1] + points[points.length-1]) / 4;			

				//left-right
				if (rotation == 90) {
					y = y - y_middle;
				}

				//top-down
				else if (rotation == 180) {
					x = x + x_middle;
				}

				//right-left
				else if (rotation == 270) {
					y = y + y_middle;
				}

				//bottom-up
				else if (rotation == 360 || rotation == 0) {
					x = x - x_middle;
				}

				return {x: x, y: y};
			},

			movePolygonCenter: function() {
				var radius = shape.radius();
				var rotation = rotation_obj["rotation"];

				if (!radius)
					radius = 5;

				//var width = shape.width() / 2 || 0;
				var offset_x = radius * Math.cos((rotation - 90) * Math.PI / 180);
				x = x - offset_x;

				//var height = shape.height() / 2 || 0;
				var offset_y = radius * Math.sin((rotation - 90) * Math.PI / 180);
				y = y - offset_y;

				return {x: x, y: y};
			},

		};

		if (move_func)
			return move_center_func[move_func]();
		else {
			return {x: x, y: y};
		}
	},

	recomputeCompartmentsPosition: function(compartment) {

		var compartments = this;

		var placement_in = compartment.placement;
		var placement_name = placement_in.name;

		var placment_obj = compartments.placements[placement_name];

		var new_width = 0;
		var new_height = 0;

		var parent_group = compartments.placements[placement_name].group;
		_.each(parent_group.getChildren(), function(text) {
			new_width = Math.max(new_width, text.getTextWidth());
			new_height += text.getHeight();
		});

		placment_obj.width = new_width;
		placment_obj.height = new_height;

		compartments.computeTextsPositions(placement_in);
		compartments.computeGroupPosition(placement_in);		
	},

	removeAllRespresentations: function() {

		var compartments = this;
		var texts_group = compartments.textsGroup;

		_.each(texts_group.getChildren(), function(group) {
			group.destroyChildren();
		});
		
		_.each(compartments.compartments, function(compart) {
			compart.remove(compart._id, true);
		})

		//delete comparts_list[compart_id];
		//delete editor.compartmentList[compart_id];

		compartments.compartments = [];

		//compartments.recomputeCompartmentsPosition();
		//compartments.element.presentation.getLayer().batchDraw();
	},

	removeOne: function(compart_id, is_refresh_not_needed) {

		var compartments = this;
		var editor = compartments.editor;

		//refreshing the element
		var comparts_list = editor.compartmentList;
		var compart = comparts_list[compart_id];
		var placement = compart.placement;

		compart.remove();

		//delete comparts_list[compart_id];
		//compartments.compartments.splice(x,1);
		delete comparts_list[compart_id];
		compartments.compartments = _.filter(compartments.compartments, function(compart) {
			if (compart._id != compart_id)
				return true;
		});

		compartments.computeTextPositions(placement);

		if (!is_refresh_not_needed) {
			compartments.element.presentation.getLayer().batchDraw();
			//not working
			//compartments.element.presentation.draw();
		}
	},

	computeMiddlePoint: function() {

		var compartments = this;
		var editor = compartments.editor;

		var line = compartments.element;
		var points = line.getPoints();

		var line_length = 0;

		//computing line length
		for (var i=0;i<points.length-2;i=i+2) {

			if (points[i] == points[i+2])
				line_length += Math.abs(points[i+1] - points[i+3]);

			else
				line_length += Math.abs(points[i] - points[i+2]);	
		}

		//computing middle point distance form start point
		var middle_point = Math.round(line_length / 2);

		var index = 0;
		var point = {x: 0, y: 0};

		var tmp_len = 0;
		var tmp_distance = 0;

		//computing the middle point
		for (var i=0;i<points.length-2;i=i+2) {

			if (points[i] == points[i+2])
				tmp_distance = points[i+1] - points[i+3];
			else
				tmp_distance = points[i] - points[i+2];

			tmp_distance = Math.abs(tmp_distance);

			//if the middle point segment found
			if ((tmp_len + tmp_distance) >= middle_point) {

				//if vertical
				if (points[i] == points[i+2]) {

					if (points[i+1] < points[i+3])
						point = {x: points[i], y: points[i+1] + (middle_point - tmp_len)};
					else
						point = {x: points[i], y: points[i+1] - (middle_point - tmp_len)};
				}

				//if horizontal
				else {

					if (points[i] < points[i+2])
						point = {x: points[i] + (middle_point - tmp_len), y: points[i+1]};
					else
						point = {x: points[i] - (middle_point - tmp_len), y: points[i+1]};
				}

				return {point: point, index: i};
			}

			else
				tmp_len += tmp_distance;
		}
	},


	labelLayout: function(position, width, height, size, x1, y1, name) {

		var compartments = this;

		if (!name)
			name = compartments.editor.lineSettings.compartmentLayout || "lineOrientedFlow";

		var points = compartments.element.getPoints();

		var layouts = {

				lineOrientedFlow: {

				//horizontal
					"horizontal-west-left": function() {
						return compartments.horizontal_left_end(x1, y1, width, height, size);
					},

					"horizontal-west-right": function() {
						return compartments.horizontal_right_end(x1, y1, width, height, size);
					},

					"horizontal-east-left": function() {
						return compartments.horizontal_right_start(x1, y1, width, height, size);			
					},

					"horizontal-east-right": function() {
						return compartments.horizontal_left_start(x1, y1, width, height, size);	
					},


					"horizontal-west-middle-left": function() {
						return compartments.horizontal_right_middle(x1, y1, width, height, size);		
					},

					"horizontal-west-middle-right": function() {
						return compartments.horizontal_left_middle(x1, y1, width, height, size);										
					},

					"horizontal-east-middle-left": function() {
						return compartments.horizontal_left_middle(x1, y1, width, height, size);
					},

					"horizontal-east-middle-right": function() {
						return compartments.horizontal_right_middle(x1, y1, width, height, size);
					},


				//vertical
					"vertical-north-left": function() {
						return compartments.vertical_left_end(x1, y1, width, height, size);
					},

					"vertical-north-right": function() {
						return compartments.vertical_right_end(x1, y1, width, height, size);					
					},


					"vertical-south-left": function() {
						return compartments.vertical_right_start(x1, y1, width, height, size);	
					},
				
					"vertical-south-right": function() {
						return compartments.vertical_left_start(x1, y1, width, height, size);						
					},


					"vertical-north-middle-left": function() {
						return compartments.vertical_left_middle(x1, y1, width, height, size);
					},

					"vertical-north-middle-right": function() {
						return compartments.vertical_right_middle(x1, y1, width, height, size);
					},

					"vertical-south-middle-left": function() {
						return compartments.vertical_right_middle(x1, y1, width, height, size);											
					},

					"vertical-south-middle-right": function() {
						return compartments.vertical_left_middle(x1, y1, width, height, size);											
					},

				},

				processOrientedFlow: {

				//horizontal
					"horizontal-west-left": function() {
						return compartments.horizontal_right_end(x1, y1, width, height, size);
					},

					"horizontal-west-right": function() {
						return compartments.horizontal_left_end(x1, y1, width, height, size);			
					},


					"horizontal-east-left": function() {
						return compartments.horizontal_right_start(x1, y1, width, height, size);												
					},

					"horizontal-east-right": function() {
						return compartments.horizontal_left_start(x1, y1, width, height, size);		
					},


					"horizontal-west-middle-left": function() {
						return compartments.horizontal_left_middle(x1, y1, width, height, size);
					},

					"horizontal-west-middle-right": function() {
						return compartments.horizontal_right_middle(x1, y1, width, height, size);											
					},


					"horizontal-east-middle-left": function() {
						return compartments.horizontal_left_middle(x1, y1, width, height, size);
					},

					"horizontal-east-middle-right": function() {
						return compartments.horizontal_right_middle(x1, y1, width, height, size);
					},

				//vertical
					"vertical-north-left": function() {
						return compartments.vertical_left_end(x1, y1, width, height, size);
					},

					"vertical-north-right": function() {
						return compartments.vertical_right_end(x1, y1, width, height, size);											
					},

					"vertical-south-left": function() {
						return compartments.vertical_left_start(x1, y1, width, height, size);		
					},
				
					"vertical-south-right": function() {
						return compartments.vertical_right_start(x1, y1, width, height, size);
					},


					"vertical-north-middle-left": function() {
						return compartments.vertical_left_middle(x1, y1, width, height, size);
					},

					"vertical-north-middle-right": function() {
						return compartments.vertical_right_middle(x1, y1, width, height, size);
					},

					"vertical-south-middle-left": function() {
						return compartments.vertical_left_middle(x1, y1, width, height, size);											
					},

					"vertical-south-middle-right": function() {
						return compartments.vertical_right_middle(x1, y1, width, height, size);											
					},

				},

			owlGrEdLayout: {

				//horizontal
					"horizontal-west-left": function() {
						return compartments.horizontal_right_end(x1, y1, width, height, size);
					},

					"horizontal-west-right": function() {
						return compartments.horizontal_left_end(x1, y1, width, height, size);			
					},


					"horizontal-east-left": function() {
						return compartments.horizontal_right_start(x1, y1, width, height, size);												
					},

					"horizontal-east-right": function() {
						return compartments.horizontal_left_start(x1, y1, width, height, size);		
					},


					"horizontal-west-middle-left": function() {
						return compartments.horizontal_left_middle(x1, y1, width, height, size);
					},

					"horizontal-west-middle-right": function() {
						return compartments.horizontal_right_middle(x1, y1, width, height, size);											
					},


					"horizontal-east-middle-left": function() {
						return compartments.horizontal_left_middle(x1, y1, width, height, size);
					},

					"horizontal-east-middle-right": function() {
						return compartments.horizontal_right_middle(x1, y1, width, height, size);
					},

				//vertical
					"vertical-north-left": function() {
						return compartments.vertical_right_end(x1, y1, width, height, size);
					},

					"vertical-north-right": function() {
						return compartments.vertical_left_end(x1, y1, width, height, size);											
					},

					"vertical-south-left": function() {
						return compartments.vertical_left_start(x1, y1, width, height, size);		
					},
				
					"vertical-south-right": function() {
						return compartments.vertical_right_start(x1, y1, width, height, size);
					},


					"vertical-north-middle-left": function() {
						return compartments.vertical_left_middle(x1, y1, width, height, size);
					},

					"vertical-north-middle-right": function() {
						return compartments.vertical_right_middle(x1, y1, width, height, size);
					},

					"vertical-south-middle-left": function() {
						return compartments.vertical_left_middle(x1, y1, width, height, size);											
					},

					"vertical-south-middle-right": function() {
						return compartments.vertical_right_middle(x1, y1, width, height, size);											
					},

				},

			};

		return layouts[name][position]();
	},

};

export default LinkCompartments