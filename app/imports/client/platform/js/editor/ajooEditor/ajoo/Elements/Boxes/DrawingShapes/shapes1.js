// import { _ } from 'vue-underscore';
import Box from './_render_boxes'
import Resizers from '../add_remove_resizers'

import {SVGObject, LineSVGObject} from '../../Lines/routing/svg_collisions'


//Rectangle
var ARectangle = function(editor) {
	Box.call(this, editor);
}

ARectangle.prototype = Object.create(Box.prototype);
ARectangle.prototype.constructor = ARectangle;

ARectangle.prototype.createShape = function(prop_list) {
	var shape = new Konva.Rect(prop_list);
	return {element: [shape]};
}

ARectangle.prototype.compartmentArea = function() {

	var box = this;
	var size = box.getSize();

	var width = size.width;
	var height = size.height;

    var x1 = width / (15 * Math.log(width) / Math.log(2));
    var x2 = width - x1;

    var y1 = 2;
    var y2 = height - 2;

	return {x1: x1, x2: x2, y1: y1, y2: y2};
}

ARectangle.prototype.toSVG = function(x, y, width, height) {

	var box = this;

	var x1 = x;
	var y1 = y;

    var x2 = x1 + width;
    var y2 = y1 + height;

    return  "M" + x1 + "," + y1
	        + " L" + x2 + "," + y1
	        + " L" + x2 + "," + y2
	        + " L" + x1 + "," + y2
	        + " Z";
}


//RoundRectangle
var ARoundRectangle = function(editor) {
	ARectangle.call(this, editor);
}

ARoundRectangle.prototype = Object.create(ARectangle.prototype);
ARoundRectangle.prototype.constructor = ARoundRectangle;

ARoundRectangle.prototype.createShape = function(prop_list) {
	prop_list["cornerRadius"] = prop_list["cornerRadius"] || 7;
	return ARectangle.prototype.createShape.call(this, prop_list);
}

ARoundRectangle.prototype.toSVG = function(x, y, width, height) {

	var box = this;

	var shape = box.shapes[0];
    var corner_radius = shape.cornerRadius();

    var x1 = x + width / 2;
    var y1 = y;

    var x2 = x1 + (width / 2 - corner_radius);
    var y2 = y;

    var x3 = x2 + corner_radius;
    var y3 = y + corner_radius;

    var x4 = x3;
    var y4 = y3 + (height - 2 * corner_radius);

    var x5 = x2;
    var y5 = y + height;

    var x6 = x + corner_radius;
    var y6 = y + height;

    var x7 = x;
    var y7 = y + height - corner_radius;
 
    var x8 = x;
    var y8 = y + corner_radius;

    var x9 = x + corner_radius;
    var y9 = y;

    return "M" + x1 + "," + y
        + " L" + x2 + "," + y2
        + " Q" + x3 + "," + y2 + " " + x3 + "," + y3
        + " L" + x4 + "," + y4
        + " Q" + x4 + "," + y5 + " " + x5 + "," + y5
        + " L" + x6 + "," + y6
        + " Q" + x7 + "," + y6 + " " + x7 + "," + y7         
        + " L" + x8 + "," + y8
        + " Q" + x8 + "," + y9 + " " + x9 + "," + y9 
        + " Z";
}


//HorizontalLine
var HorizontalLine = function(editor) {
	ARectangle.call(this, editor);
}

HorizontalLine.prototype = Object.create(ARectangle.prototype);
HorizontalLine.prototype.constructor = HorizontalLine;

HorizontalLine.prototype.createShape = function(prop_list) {

	var obj = ARectangle.prototype.createShape.call(this, prop_list);
	obj["maxHeight"] = 6; 
	return obj;
}

HorizontalLine.prototype.addResizers = function() {
	var box = this;

	var excluded = {TopMiddle: true, TopLeft: true, TopRight: true,
					BottomMiddle: true, BottomLeft: true, BottomRight: true,};

	var resizers = new Resizers(box);
	resizers.addCustomResizers(excluded);
	box.resizers = resizers;
}

HorizontalLine.prototype.toSVG = function(x, y, width, height) {
	return ARectangle.prototype.toSVG.call(this, x, y, width, height);
}

//VerticalLine
var VerticalLine = function(editor) {
	ARectangle.call(this, editor);
}

VerticalLine.prototype = Object.create(ARectangle.prototype);
VerticalLine.prototype.constructor = VerticalLine;

VerticalLine.prototype.createShape = function(prop_list) {
	var obj = ARectangle.prototype.createShape.call(this, prop_list);
	obj["maxWidth"] = 6; 

	return obj;
}

VerticalLine.prototype.addResizers = function() {

	var excluded = {LeftMiddle: true, TopLeft: true, TopRight: true,
					RightMiddle: true, BottomLeft: true, BottomRight: true};

	var box = this;
	var resizers = new Resizers(box);
	resizers.addCustomResizers(excluded);
	box.resizers = resizers;
}

VerticalLine.prototype.toSVG = function(x, y, width, height) {
	return ARectangle.prototype.toSVG.call(this, x, y, width, height);
}


//Regular polygon
var RPolygon = function(editor, sides) {
	Box.call(this, editor);
	this.sides = sides;
	this.isRegularPolygon = true;
}

RPolygon.prototype = Object.create(Box.prototype);
RPolygon.prototype.constructor = RPolygon;

RPolygon.prototype.createShape = function(prop_list) {
	prop_list["sides"] = this.sides;
	var shape = new Konva.RegularPolygon(prop_list);

	return {element: [shape]};
}

RPolygon.prototype.addResizers = function() {
	var box = this;
	var resizers = new Resizers(box);
	resizers.addRegularShapeResizers();
	box.resizers = resizers;
}

RPolygon.prototype.buildSVGSize = function(x, y) {
	var box = this;
 
    var shape = box.shapes[0];
    var radius = shape.radius();

	var path = box.toSVG(x, y, radius);
	return new SVGObject(path);
}


//Triangle
var ATriangle = function(editor) {
	Box.call(this, editor);
	this.sides = 3;
}

ATriangle.prototype = Object.create(RPolygon.prototype);
ATriangle.prototype.constructor = ATriangle;

ATriangle.prototype.toSVG = function(x, y, radius) {

	var x1 = x + Math.sqrt(3) * radius / 2;
	var y1 = y + 1.5 * radius;

	var x2 = x + Math.sqrt(3) * radius;

    return "M" + x1 + "," + y
        + " L" + x2 + "," + y1
        + " L" + x + "," + y1
       	+ " Z";
}

ATriangle.prototype.compartmentArea = function() {

	var box = this;
	var size = box.getSize();

	var width = size.width;
	var height = size.height;

	var x1 = width / 4;
    var x2 = width * 0.75;

    var y1 = height / 2;
    var y2 = height;

    return {x1: x1, x2: x2, y1: y1, y2: y2};
}


//Square
var ASquare = function(editor) {
	Box.call(this, editor);
	this.sides = 4;
}

ASquare.prototype = Object.create(RPolygon.prototype);
ASquare.prototype.constructor = ASquare;

ASquare.prototype.createShape = function(prop_list) {
	prop_list["rotation"] = 45;
	return RPolygon.prototype.createShape.call(this, prop_list)
}

ASquare.prototype.toSVG = function(x, y, radius) {

	var box = this;
	var shape = box.shapes[0];
    var radius = shape.radius();

    var width = Math.sqrt(2) * radius;
    return ARectangle.prototype.toSVG.call(box, x, y, width, width);
}

ASquare.prototype.compartmentArea = function() {
	return ARectangle.prototype.compartmentArea.call(this);
}


//Pentagon
var ADiamond = function(editor) {
	Box.call(this, editor);
	this.sides = 4;
}

ADiamond.prototype = Object.create(RPolygon.prototype);
ADiamond.prototype.constructor = ADiamond;

ADiamond.prototype.toSVG = function(x, y, radius) {

    var x_middle = x + radius;
    var y_middle = y + radius;

    var x_end = x + 2 * radius;
    var y_end = y + 2 * radius;

    return "M" + x_middle + "," + y
        + " L" + x_end + "," + y_middle
        + " L" + x_middle + "," + y_end
        + " L" + x + "," + y_middle
        + " Z";
}

ADiamond.prototype.computeShapeSize = function(new_width, new_height) {

	var radius = Math.max(new_width / 2, new_height / 2);

	var new_x = radius;
	var new_y = radius;

	var res = {width: new_width, height: new_height};

	var new_width = radius * 2;
	var new_height = radius * 2;

	res["centerX"] = new_width / 2;
	res["centerY"] = new_height / 2;

	res["radius"] = radius;

	res["width"] = new_width;
	res["height"] = new_height;

	return res;
}

ADiamond.prototype.updateShapeSize = function(res) {

	var box = this;
	var shape = box.shapes[0];

	shape.width(res["width"]);
	shape.height(res["height"]);

	shape.radius(res["radius"]);

	if (res["centerX"] && res["centerY"]) {
		shape.x(res["centerX"]);
		shape.y(res["centerY"]);
	}
}

ADiamond.prototype.compartmentArea = function() {

	var box = this;
	var shape = box.shapes[0];

    var radius = shape.radius();

	var x1 = radius / 4;
    var x2 = x1 + radius;

    var y1 = radius / 2;
    var y2 = y1 + radius;

    return {x1: x1, x2: x2, y1: y1, y2: y2};
}


//Pentagon
var APentagon = function(editor) {
	Box.call(this, editor);
	this.sides = 5;
}

APentagon.prototype = Object.create(RPolygon.prototype);
APentagon.prototype.constructor = APentagon;

APentagon.prototype.toSVG = function(x, y, radius) {

	var box = this;
    var side = box.side(radius);

    var delta_x1 = side * Math.sin(54 * Math.PI / 180); 
    var delta_y1 = side * Math.sin(36 * Math.PI / 180);

    var x_middle = x + delta_x1;

    var x2 = x_middle + delta_x1;
    var y2 = y + delta_y1;

    var delta_x2 = (x2 - x - side) / 2;

    var x3 = x + delta_x2 + side;
    var x4 = x + delta_x2;

    var y3 = y + radius * (1 + Math.sin(54 * Math.PI / 180));

    return "M" + x_middle + "," + y
	        + " L" + x2 + "," + y2
	        + " L" + x3  + "," + y3
	        + " L" + x4 + "," + y3
	        + " L" + x + "," + y2        
	        + " Z";
}

APentagon.prototype.compartmentArea = function() {

	var box = this;
	var shape = box.shapes[0];

    var radius = shape.radius();
    var sides = shape.sides();

	var side = box.side(radius);

    var delta_x1 = side * Math.sin(54 * Math.PI / 180); 
    var delta_y1 = side * Math.sin(36 * Math.PI / 180);

	var x1 = delta_x1 / 2;
    var x2 = width - x1;

    var y1 = delta_y1 / 2;
    var y2 = height - y1;

    return {x1: x1, x2: x2, y1: y1, y2: y2};
}

APentagon.prototype.side = function(radisu) {
	return radius * Math.sin(72 * Math.PI / 180) / Math.sin(54 * Math.PI / 180);
}


//Xexagon
var AHexagon = function(editor) {
	Box.call(this, editor);
	this.sides = 6;
}

AHexagon.prototype = Object.create(RPolygon.prototype);
AHexagon.prototype.constructor = AHexagon;

AHexagon.prototype.toSVG = function(x, y, width, height) {

	var radius = Math.max(width, height) / 2;

	var x1 = x + radius / 2;

	var x2 = x1 + radius;
	var x3 = x2 + radius / 2;

	var y2 = y + radius * Math.sqrt(3) / 2;
	var y3 = y2 + radius * Math.sqrt(3) / 2;

    return "M" + x1 + "," + y
			+ " L" + x2 + "," + y
	        + " L" + x3 + "," + y2
	        + " L" + x2 + "," + y3
	        + " L" + x1 + "," + y3
	        + " L" + x + "," + y2
	       	+ " Z";
}

AHexagon.prototype.compartmentArea = function() {

	var box = this;
	var shape = box.shapes[0];

    var radius = shape.radius();

	var x1 = radius / 4;
    var x2 = 2 * radius - x1;

    var y1 = radius * Math.sqrt(3) / 4;
    var y2 = height - y1;

    return {x1: x1, x2: x2, y1: y1, y2: y2};
}


//Pentagon
var AOctagon = function(editor) {
	Box.call(this, editor);
	this.sides = 8;
}

AOctagon.prototype = Object.create(RPolygon.prototype);
AOctagon.prototype.constructor = AOctagon;

AOctagon.prototype.toSVG = function(x, y, radius) {

	var box = this;

	var side = box.side();
	var delta_x1 = side * Math.sin(67.5 * Math.PI / 180);

	var x1 = x + radius;
	var x2 = x1 + delta_x1;
	var x3 = x1 + radius;
	var x5 = x1 - delta_x1;

	var delta_y1 = side * Math.sin(22.5 * Math.PI / 180);
	var y2 = y + delta_y1;
	var y3 = y + radius;
	var y4 = y + 2 * radius - delta_y1;
	var y5 = y + 2 * radius;	

    return "M" + x1 + "," + y
	        + " L" + x2 + "," + y2
	        + " L" + x3 + "," + y3
	        + " L" + x2 + "," + y4
	        + " L" + x1 + "," + y5
	        + " L" + x5 + "," + y4
	        + " L" + x + "," + y3     
	        + " L" + x5 + "," + y2   
	       	+ " Z";
}

AOctagon.prototype.compartmentArea = function() {

	var box = this;
	var shape = box.shapes[0];

    var radius = shape.radius();

	var side = box.side(radius);
	var delta_x1 = side * Math.sin(67.5 * Math.PI / 180);

	var x1 = radius - delta_x1;
    var x2 = radius + delta_x1;

    var y1 = x1;
    var y2 = x2;

    return {x1: x1, x2: x2, y1: y1, y2: y2};
}

AOctagon.prototype.side = function(radius) {
	return radius * Math.sin(45 * Math.PI / 180) / Math.sin(67.5 * Math.PI / 180);
}


//Circle
var ACircle = function(editor) {
	RPolygon.call(this, editor);
}

ACircle.prototype = Object.create(RPolygon.prototype);
ACircle.prototype.constructor = ACircle;

ACircle.prototype.createShape = function(prop_list) {
	// _.extend(prop_list, {width: prop_list.radius, height: prop_list.radius,});

	var shape = new Konva.Circle(prop_list);
	return {element: [shape]};
}

ACircle.prototype.computeShapeSize = function(new_width, new_height) {

	var radius = Math.max(new_width / 2, new_height / 2);

	var radius = Math.max(new_width, new_height);

	var new_x = radius;
	var new_y = radius;

	var res = {width: new_width, height: new_height};

	// var new_width = radius * 2;
	// var new_height = radius * 2;

	// res["centerX"] = radius / 2;
	// res["centerY"] = radius / 2;

	res["centerX"] = radius;
	res["centerY"] = radius;

	res["radius"] = radius;

	res["width"] = radius;
	res["height"] = radius;

	return res;
}

ACircle.prototype.updateShapeSize = function(res) {

	var box = this;
	var shape = box.shapes[0];

	shape.width(res["width"]);
	shape.height(res["height"]);

	shape.radius(res["radius"]);

	if (res["centerX"] && res["centerY"]) {
		shape.x(res["centerX"]);
		shape.y(res["centerY"]);
	}
}

ACircle.prototype.toSVG = function(x, y, radius) {
	return AEllipse.prototype.toSVGWithRadius.call(this, x, y, radius, radius);
}

ACircle.prototype.compartmentArea = function() {

	var box = this;
	var shape = box.shapes[0];

	var radius = shape.radius();

	var x1 = radius - radius * Math.sqrt(2) / 2;
    var x2 = radius + radius * Math.sqrt(2) / 2;

    var y1 = radius - radius * Math.sqrt(2) / 2;
    var y2 = radius + radius * Math.sqrt(2) / 2;

	return {x1: x1, x2: x2, y1: y1, y2: y2};
}


//Ellipse
var AEllipse = function(editor) {
	Box.call(this, editor);
}

AEllipse.prototype = Object.create(Box.prototype);
AEllipse.prototype.constructor = AEllipse;

AEllipse.prototype.createShape = function(prop_list) {

	var shape = new Konva.Ellipse(prop_list);
		shape["name"] = "Ellipse";

	return {element: [shape]};
}

AEllipse.prototype.computeShapeSize = function(new_width, new_height) {

	var x = new_width / 2;
	var y = new_height / 2;

	return {radiusX: x, radiusY: y, width: new_width, height: new_height};
}

AEllipse.prototype.updateShapeSize = function(size) {

	var box = this;
	var shape = box.shapes[0];

	shape.radius({x: size["radiusX"], y: size["radiusY"]});

	shape.x(size["radiusX"]);
	shape.y(size["radiusY"]);
}

AEllipse.prototype.toSVG = function(x, y) {

	var box = this;
	var shape = box.shapes[0];
    var radius = shape.radius();

    return box.toSVGWithRadius(x, y, radius["x"], radius["y"]);
}

AEllipse.prototype.toSVGWithRadius = function(x, y, radius0, radius1) {
	var x1 = x + radius0;
	var y2 = y + 2 * radius1;

    return "M" + x1 + "," + y
        + " A " + radius0 + " " + radius1 + ", 0, 0, 1, " + x1 + " " + y2
        + " A " + radius0 + " " + radius1 + ", 0, 0, 1, " + x1 + " " + y;
}

AEllipse.prototype.compartmentArea = function() {

	var box = this;
	var shape = box.shapes[0];

    var radius = shape.radius();

    var x_radius = radius["x"];
    var y_radius = radius["y"];

	var x1 = x_radius - x_radius * Math.sqrt(2) / 2;
    var x2 = x_radius + x_radius * Math.sqrt(2) / 2;

    var y1 = y_radius - y_radius * Math.sqrt(2) / 2;
    var y2 = y_radius + y_radius * Math.sqrt(2) / 2;

	return {x1: x1, x2: x2, y1: y1, y2: y2};
}


//Arrow
var Arrow = function(editor) {
	Box.call(this, editor);
}

Arrow.prototype = Object.create(Box.prototype);
Arrow.prototype.constructor = Arrow;

Arrow.prototype.createShape = function(prop_list) {

	var line = new Konva.Line(prop_list);
		line["name"] = "Arrow";

	return {element: [line]};
}

Arrow.prototype.updateShapeSize = function(res) {

	var box = this;
	var line = box.shapes[0];

	var width = res["width"];
	var height = res["height"];

	line.points([0, height, width / 2, 0, width, height]);
}

//TODO: toSVG

export {ARectangle,
		ARoundRectangle,
		HorizontalLine,
		VerticalLine,
		RPolygon,
		ATriangle,
		ASquare,
		ADiamond,
		APentagon,
		AHexagon,
		AOctagon,
		ACircle,
		AEllipse,
		Arrow,
	}
