// import { _ } from 'vue-underscore';
import Box from './_render_boxes';
import {BoxCompartments} from '../box_compartments';
import Resizers from '../add_remove_resizers'
import {ACircle, ADiamond } from './shapes1';
import { reset_variable } from '/imports/client/platform/js/utilities/utils'

import {SVGObject, LineSVGObject} from '../../Lines/routing/svg_collisions'

//BPMNShape(abstract class)
var BPMNShape = function(editor) {
	Box.call(this, editor);
}

BPMNShape.prototype = Object.create(Box.prototype);
BPMNShape.prototype.constructor = BPMNShape;

BPMNShape.prototype.updateShapesStyle = function(style) {

	var box = this;
	var shapes = box.shapes;

	_.each(shapes, function(shape) {

		if (shape["name"] == "Inner") {

			//if inner shape, then updating only its fill or stroke
			if (style["fill"]) {
				
				var new_style = {};

				//if shape is a line, then fill has to be trnasformed to stroke
				if (shape["className"] == "Line") {
					new_style["stroke"] = style["fill"];
				}

				else {
					new_style = {fill: style["fill"]};
				}

				shape.setAttrs(new_style);

				//if shape has gradient
				if (shape.fillPriority() != "color") {
					//resize_gradient(shape_group);
				}
			}
		}

		//if outter element, then not updating its fill (always white)
		else {

			var fill = style["fill"];
			style["fill"] = "white";

			shape.setAttrs(style);

			//if shape has gradient
			if (shape["attrs"]["fillPriority"] != "color") {
				//resize_gradient(shape_group);
			}

			style["fill"] = fill;
		}

	});
}


//BPMNTerminate
var BPMNTerminate = function(editor) {
	ACircle.call(this, editor);
}

BPMNTerminate.prototype = Object.create(ACircle.prototype);
BPMNTerminate.prototype.constructor = BPMNTerminate;

BPMNTerminate.prototype.createShape = function(prop_list) {

	var fill = prop_list["fill"];

	//outter circle
	prop_list["fill"] = "white";
	var outer_circle = new Konva.Circle(prop_list);
		outer_circle["name"] = "Circle";
		outer_circle["allowed"] = {stroke: true,
									strokeWidth: true,
									dash: true,
								};

	//inner circle
	prop_list["fill"] = fill;
	prop_list["stroke"] = reset_variable();

	var inner_circle = new Konva.Circle(prop_list);
		inner_circle["name"] = "Inner";

		inner_circle["denied"] = {stroke: true,
									strokeWidth: true,
									dash: true,
								};

	return {element: [outer_circle, inner_circle]};
}

BPMNTerminate.prototype.updateShapeSize = function(res) {

	var box = this;
	var shapes = box.shapes;

	var outer_circle = shapes[0];

	outer_circle.radius(res["radius"]);
	outer_circle.x(res["centerX"]);
	outer_circle.y(res["centerY"]);

	var inner_circle = shapes[1];

	inner_circle.radius(res["radius"] * 0.6);
	inner_circle.x(res["centerX"]);
	inner_circle.y(res["centerY"]);
}

BPMNTerminate.prototype.updateShapeStyle = function(style) {
	BPMNShape.prototype.updateShapesStyle.call(this, style);
}


//BPMNMultiple
var BPMNMultiple = function(editor) {
	ACircle.call(this, editor);
}

BPMNMultiple.prototype = Object.create(ACircle.prototype);
BPMNMultiple.prototype.constructor = BPMNMultiple;

BPMNMultiple.prototype.createShape = function(prop_list) {

	var fill = prop_list["fill"];

	//outter circle
	prop_list["fill"] = "white";
	var outer_circle = new Konva.Circle(prop_list);
		outer_circle["name"] = "Circle";
		outer_circle["allowed"] = {stroke: true,
									strokeWidth: true,
									dash: true,
								};
	//inner star
	prop_list["fill"] = fill;
	prop_list["stroke"] = reset_variable();
	prop_list["numPoints"] = 6;

	var inner_star = new Konva.Star(prop_list);
		inner_star["name"] = "Inner";
		inner_star["denied"] = {stroke: true,
								strokeWidth: true,
								dash: true,
							};

	return {element: [outer_circle, inner_star]};
}

BPMNMultiple.prototype.updateShapeSize = function(res) {

	var box = this;
	var shapes = box.shapes;

	//outer circle
	var outer_circle = shapes[0];
	outer_circle.radius(res["radius"]);

	var inner_radius = res["radius"] * 0.5;
	var outer_radius = res["radius"] * 0.7;;

	//inner star
	var inner_star = shapes[1];
	inner_star.innerRadius(inner_radius);
	inner_star.outerRadius(outer_radius);

	outer_circle.x(res["centerX"]);
	outer_circle.y(res["centerY"]);

	inner_star.x(res["centerX"]);
	inner_star.y(res["centerY"]);
}

BPMNMultiple.prototype.updateShapeStyle = function(style) {
	BPMNShape.prototype.updateShapesStyle.call(this, style);
}


//BPMNMultiple
var BPMNDiamondPlus = function(editor) {
	ACircle.call(this, editor);
}

BPMNDiamondPlus.prototype = Object.create(ACircle.prototype);
BPMNDiamondPlus.prototype.constructor = BPMNDiamondPlus;

BPMNDiamondPlus.prototype.createShape = function(prop_list) {

	var fill = prop_list["fill"];

	//outter circle
	prop_list["fill"] = "white";
	prop_list["sides"] = 4;
	var outer_shape = new Konva.RegularPolygon(prop_list);
		outer_shape["name"] = "Diamond";
		outer_shape["allowed"] = {stroke: true,
									strokeWidth: true,
									dash: true,
								};

	prop_list["fill"] = fill;
	var stroke_width = 2;

	//line1
	var horizontal_line = new Konva.Line({strokeWidth: stroke_width,
											stroke: prop_list["fill"],
										});
		horizontal_line["name"] = "Inner";

	//line2
	var vertical_line = new Konva.Line({strokeWidth: stroke_width,
										stroke: prop_list["fill"],
									});
		vertical_line["name"] = "Inner";

	return {element: [outer_shape, horizontal_line, vertical_line]};
}

BPMNDiamondPlus.prototype.updateShapeSize = function(res) {

	var box = this;
	var shapes = box.shapes;

	//outer circle
	var outer_shape = shapes[0];
	outer_shape.radius(res["radius"]);

	outer_shape.x(res["centerX"]);
	outer_shape.y(res["centerY"]);

	var padding = 0.3;	
	var radius = res["radius"];

	var horizontal_line = shapes[1];
	horizontal_line.points([2 * radius * padding, radius,
							2 * radius * (1 - padding), radius]);

	var vertical_line = shapes[2];
	vertical_line.points([radius, 2 * radius * padding,
							radius, 2 * radius * (1 - padding)]);
}

BPMNDiamondPlus.prototype.buildSVGSize = function(x, y) {
	return ADiamond.prototype.buildSVGSize.call(this, x, y);
}

BPMNDiamondPlus.prototype.toSVG = function(x, y, width, height) {
	return ADiamond.prototype.toSVG.call(this, x, y, width, height);
}

BPMNDiamondPlus.prototype.updateShapeStyle = function(style) {
	BPMNShape.prototype.updateShapesStyle.call(this, style);
}

//BPMNX
var BPMNCancel = function(editor) {
	ACircle.call(this, editor);

	this.name = "BPMNCancel";
	this.padding = 0.5;
	this.outerFuncName = "Circle";
}

BPMNCancel.prototype = Object.create(ACircle.prototype);
BPMNCancel.prototype.constructor = BPMNCancel;

BPMNCancel.prototype.createShape = function(prop_list) {

	var outer_shape_func = this.outerFuncName;

	var fill = prop_list["fill"];

	//outter circle
	prop_list["fill"] = "white";
	var outer_shape = new Konva[outer_shape_func](prop_list);
		outer_shape["name"] = outer_shape_func;
		outer_shape["allowed"] = {stroke: true,
								strokeWidth: true,
								dash: true,
							};

	prop_list["fill"] = fill;

	var stroke_width = 2;

	var horizontal_line = new Konva.Line({								
										strokeWidth: stroke_width,
										stroke: prop_list["fill"],
									});
		horizontal_line["name"] = "Inner";
		horizontal_line["isInner"] = true;

	var vertical_line = new Konva.Line({
										strokeWidth: stroke_width,
										stroke: prop_list["fill"],
									});
		vertical_line["name"] = "Inner";
		vertical_line["isInner"] = true;

	return {element: [outer_shape, horizontal_line, vertical_line]};
}

BPMNCancel.prototype.updateShapeSize = function(res) {

	var box = this;
	var padding = box.padding;	
	var shapes = box.shapes;

	//outer circle
	var outer_shape = shapes[0];
	outer_shape.radius(res["radius"]);

	outer_shape.x(res["centerX"]);
	outer_shape.y(res["centerY"]);

	var radius = res["radius"];

	var horizontal_line = shapes[1];
	horizontal_line.points([radius * padding, radius * padding,
							radius + radius * (1 - padding), radius + radius * (1 - padding)]);

	var vertical_line = shapes[2];
	vertical_line.points([radius + radius * (1 - padding), radius * padding,
							radius * padding, radius + radius * (1 - padding)]);
}

BPMNCancel.prototype.updateShapeStyle = function(style) {
	BPMNShape.prototype.updateShapesStyle.call(this, style);
}


//BPMNDiamondX
var BPMNDiamondX = function(editor) {
	ACircle.call(this, editor);

	this.name = "BPMNDiamondX";
	this.padding = 0.75;
	this.outerFuncName = "RegularPolygon";
}

BPMNDiamondX.prototype = Object.create(BPMNCancel.prototype);
BPMNDiamondX.prototype.constructor = BPMNCancel;

BPMNDiamondX.prototype.createShape = function(prop_list) {
	prop_list["sides"] = 4;
	return BPMNCancel.prototype.createShape.call(this, prop_list);
}

BPMNDiamondX.prototype.buildSVGSize = function(x, y) {
	return ADiamond.prototype.buildSVGSize.call(this, x, y);
}

BPMNDiamondX.prototype.toSVG = function(x, y, width, height) {
	return ADiamond.prototype.toSVG.call(this, x, y, width, height);
}

BPMNDiamondX.prototype.updateShapeStyle = function(style) {
	BPMNShape.prototype.updateShapesStyle.call(this, style);
}

export {BPMNShape, BPMNTerminate, BPMNMultiple, BPMNDiamondPlus, BPMNCancel, BPMNDiamondX,}
