
//SVGShape(abstract class)
SVGShape = function(editor) {
	Box.call(this, editor);

	this.position = {x: 0, y: 0};
	this.shapesData = [];	
}

SVGShape.prototype = Object.create(Box.prototype);
SVGShape.prototype.constructor = SVGShape;

SVGShape.prototype.createShape = function(prop_list) {

	var box = this;
	var shapes = _.map(box.shapesData, function(shape) {

					prop_list["data"] = shape.path;
					var path = new Konva.Path(prop_list);
						path["name"] = shape["name"];

					return path;
				});

	return {element: shapes};
}

SVGShape.prototype.updateShapeSize = function(res) {

	var box = this;
	var shapes = box.shapes;

	_.each(shapes, function(shape, i) {

		var path_obj = box.shapesData[i];

		var shape_path = path_obj["path"];
		var orginal_width = path_obj["originalWidth"];
		var orginal_height = path_obj["originalHeight"];

		var new_width = res["width"];
		var new_height = res["height"];

		var scale_x = new_width / orginal_width;
		var scale_y = new_height / orginal_height;

		var new_path = box.computeNewPath(shape_path, scale_x, scale_y);

		shape.data(new_path);
	});
}

SVGShape.prototype.computeNewPath = function(shape_path, scale_x, scale_y, x, y) {

	var box = this;

    var res = shape_path.match(/[a-z]|\-?\d*([.]\d*)?/ig);
    var is_x = true;
    var is_relative_command = false;

    var pos = box.position;
    if (!x)
    	x = pos["x"];

    if (!y)
    	y = pos["y"];

    var new_path = _.map(res, function(item, i) {

        if (item == "," || item == "")
            return " ";

        var new_item = Number(item);
        if (!isNaN(new_item)) {
            if (is_x) {
                is_x = false;

                if (is_relative_command)
                    return new_item * scale_x;
                else
                    return new_item * scale_x + x;
            }
            else {
                is_x = true;

                if (is_relative_command)
                    return new_item * scale_y;
                else
                    return new_item * scale_y + y;
            }
        }

        else {

            if (item == "c" || item == "l") {
                is_relative_command = true;
            }

            else {
                is_relative_command = false;
            }
        }

        return item;
    });

    return new_path.join("");
}

SVGShape.prototype.toSVG = function(x, y, width, height) {

	var box = this;
	return _.map(box.shapesData, function(path_obj) {

			var shape_path = path_obj["path"];
			var orginal_width = path_obj["originalWidth"];
			var orginal_height = path_obj["originalHeight"];

			var scale_x = width / orginal_width;
			var scale_y = height / orginal_height;

			return box.computeNewPath(shape_path, scale_x, scale_y, x, y);
	    });
}


//Package
APackage = function(editor) {
	SVGShape.call(this, editor);

	this.shapesData = [{name: "Package",
						path: "M0,18 L0,0 L48,0 L48,18 L0,18 L0,100 L170,100 L170,18 Z",
						originalWidth: 170,
						originalHeight: 100,
					}];
}

APackage.prototype = Object.create(SVGShape.prototype);
APackage.prototype.constructor = APackage;

APackage.prototype.compartmentArea = function() {

	var box = this;

	var size = box.getSize();
    var height = size["height"];

    var res = ARectangle.prototype.compartmentArea.call(box);		
	res["y1"] = res["y1"] + height / 5;

    return res;
}


//TwitterBird
TwitterBird = function(editor) {
	SVGShape.call(this, editor);

	var path = "M512,97.209c-18.838,8.354-39.082,14.001-60.33,16.54c21.687-13,38.343-33.585,46.187-58.115" +
						"c-20.299,12.039-42.778,20.78-66.705,25.49c-19.16-20.415-46.461-33.17-76.674-33.17c-58.011,0-105.043,47.029-105.043,105.039" +
						"c0,8.233,0.929,16.25,2.72,23.939c-87.3-4.382-164.701-46.2-216.509-109.753c-9.042,15.514-14.223,33.558-14.223,52.809" +
						"c0,36.444,18.544,68.596,46.73,87.433c-17.219-0.546-33.416-5.271-47.577-13.139c-0.01,0.438-0.01,0.878-0.01,1.321" +
						"c0,50.894,36.209,93.348,84.261,103c-8.813,2.399-18.094,3.686-27.674,3.686c-6.769,0-13.349-0.66-19.764-1.887" +
						"c13.368,41.73,52.16,72.104,98.126,72.949c-35.95,28.175-81.243,44.967-130.458,44.967c-8.479,0-16.84-0.497-25.058-1.471" +
						"c46.486,29.806,101.701,47.197,161.021,47.197c193.211,0,298.868-160.062,298.868-298.872c0-4.554-0.103-9.084-0.305-13.59" +
						"C480.11,136.773,497.918,118.273,512,97.209z";

	this.shapesData = [{name: "TwitterBird",
						path: path,
						originalWidth: 512,
						originalHeight: 512,
					}];	
}

TwitterBird.prototype = Object.create(SVGShape.prototype);
TwitterBird.prototype.constructor = TwitterBird;


//Document
ADocument = function(editor) {
	SVGShape.call(this, editor);

	this.shapesData = [{name: "Document",
						path: "M0 0 L0 60 C15,80 45,40 60,40 L60 0 Z",
						originalWidth: 60,
						originalHeight: 65,
					}];
}

ADocument.prototype = Object.create(SVGShape.prototype);
ADocument.prototype.constructor = ADocument;

ADocument.prototype.compartmentArea = function() {
	return ARectangle.prototype.compartmentArea.call(this);
}


//CALData
ACALData = function(editor) {
	SVGShape.call(this, editor);

	this.shapesData = [{name: "CALData",
						path: "M 0 0 100 50 0 100 Z M 0 0 H 100 V 100 H 0 H 100 V 0",
						originalWidth: 100,
						originalHeight: 100,
					}];
}

ACALData.prototype = Object.create(SVGShape.prototype);
ACALData.prototype.constructor = ACALData;

ACALData.prototype.compartmentArea = function() {
	return ASquare.prototype.compartmentArea.call(this);
}

//CALInputData
ACALInputData = function(editor) {
	SVGShape.call(this, editor);

	this.shapesData = [{name: "CALInputData",
						path: "M 0 0 H 20 V 100 L 0 100 Z M 20 0 L 120 50 M 120 50 20 100 Z H 120 M 120 0 V 100 M 120 100 L 0 100",
						originalWidth: 120,
						originalHeight: 100,
					}];
}

ACALInputData.prototype = Object.create(SVGShape.prototype);
ACALInputData.prototype.constructor = ACALInputData;

ACALInputData.prototype.compartmentArea = function() {
	return ARectangle.prototype.compartmentArea.call(this);
}

//CALOutputData
ACALOutputData = function(editor) {
	SVGShape.call(this, editor);

	this.shapesData = [{name: "CALOutputData",
						path: "M 100 0 H 120 V 100 H 100 Z M 0 0 L 100 50 M 100 50 0 100 M 0 100 L 0 0 M 0 0 H 100 M 0 100 H 100",
						originalWidth: 120,
						originalHeight: 100,
					}];
}

ACALOutputData.prototype = Object.create(SVGShape.prototype);
ACALOutputData.prototype.constructor = ACALOutputData;

ACALOutputData.prototype.compartmentArea = function() {
	return ARectangle.prototype.compartmentArea.call(this);
}

//----------Elīna piemēri --------------

//SandClock //Timer
ASandClock = function(editor) {
	SVGShape.call(this, editor);

	var path = "M 0 0 H 40 L 20 25 L 40 50 H 0 L 20 25 Z";

	this.shapesData = [{name: "SandClock",
						path: path,
						originalWidth: 40,
						originalHeight: 50,
					}];	
}

ASandClock.prototype = Object.create(SVGShape.prototype);
ASandClock.prototype.constructor = ASandClock;
ASandClock.prototype.updateShapeSize = function(res) {

	console.log(res);
	/* var size = box.getSize();
	var width = size["width"];
	var height = size["height"];
	console.log ("Sand Clock resize" , height, width, res);
	var height = height - (heigt % 5);
	size["height"] = height;
	size["width"] = height *4 / 5;
	console.log ("Sand Clock new size" , size["height"], size["width"], res); */
}

//AcceptEvent //Accept Event Action
AAcceptEvent = function(editor) {
	SVGShape.call(this, editor);

	var path = "M 0 0 H 100 V 70 H 0 L 20 35 L 0 0 Z";

	this.shapesData = [{name: "AcceptEvent",
						path: path,
						originalWidth: 100,
						originalHeight: 70,
					}];	
}

AAcceptEvent.prototype = Object.create(SVGShape.prototype);
AAcceptEvent.prototype.constructor = AAcceptEvent;

//AutomataAcceptingState
AAutomataAcceptingState = function(editor) {
	ACircle.call(this, editor);
}

AAutomataAcceptingState.prototype = Object.create(ACircle.prototype);
AAutomataAcceptingState.prototype.constructor = AAutomataAcceptingState;

AAutomataAcceptingState.prototype.createShape = function(prop_list) {

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
	
	var inner_circle = new Konva.Circle(prop_list);
		inner_circle["name"] = "Inner";

		inner_circle["denied"] = {stroke: true,
									strokeWidth: true,
									dash: true,
								};

	return {element: [outer_circle, inner_circle]};
}

AAutomataAcceptingState.prototype.updateShapeSize = function(res) {

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

AAutomataAcceptingState.prototype.updateShapeStyle = function(style) {
	BPMNShape.prototype.updateShapesStyle.call(this, style);
}

//AutomataAcceptingInitialState
AAutomataAcceptingInitialState = function(editor) {
	ACircle.call(this, editor);
}

AAutomataAcceptingInitialState.prototype = Object.create(ACircle.prototype);
AAutomataAcceptingInitialState.prototype.constructor = AAutomataAcceptingInitialState;

AAutomataAcceptingInitialState.prototype.createShape = function(prop_list) {

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
	
	var inner_circle = new Konva.Circle(prop_list);
		inner_circle["name"] = "Inner";

		inner_circle["denied"] = {stroke: true,
									strokeWidth: true,
									dash: true,
								};
	console.log("prop_list", prop_list);
	prop_list["points"] = [0, outer_circle.y, 20, outer_circle.y];
	var arrow_line1 = new Konva.Line(prop_list);
	arrow_line1["name"] = "Inner";
	prop_list["points"] = [10, outer_circle.y-10, 20, outer_circle.y];
	var arrow_line2 = new Konva.Line(prop_list);
	arrow_line2["name"] = "Inner";
	prop_list["points"] = [10, outer_circle.y+10, 20, outer_circle.y];
	var arrow_line3 = new Konva.Line(prop_list);
	arrow_line3	["name"] = "Inner";

	return {element: [outer_circle, inner_circle, arrow_line1, arrow_line2, arrow_line3]};
}

AAutomataAcceptingInitialState.prototype.updateShapeSize = function(res) {

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

	var arrow_line1 = shapes[2];
	arrow_line1.points( [-20, res["centerY"], 0, res["centerY"]])
	var arrow_line2 = shapes[3];
	arrow_line2.points( [-10, res["centerY"]-10, 0, res["centerY"]])
	var arrow_line3 = shapes[4];
	arrow_line3.points( [-10, res["centerY"]+10, 0, res["centerY"]])
}

AAutomataAcceptingInitialState.prototype.updateShapeStyle = function(style) {
	BPMNShape.prototype.updateShapesStyle.call(this, style);
}

//AutomataInitialState not accepting
AAutomataInitialState = function(editor) {
	ACircle.call(this, editor);
}

AAutomataInitialState.prototype = Object.create(ACircle.prototype);
AAutomataInitialState.prototype.constructor = AAutomataInitialState;

AAutomataInitialState.prototype.createShape = function(prop_list) {


	var outer_circle = new Konva.Circle(prop_list);
		outer_circle["name"] = "Circle";
		outer_circle["allowed"] = {stroke: true,
									strokeWidth: true,
									dash: true,
								};

	prop_list["points"] = [-20, outer_circle.y, 0, outer_circle.y];
	var arrow_line1 = new Konva.Line(prop_list);
	arrow_line1["name"] = "Inner";
	prop_list["points"] = [-10, outer_circle.y-10, 0, outer_circle.y];
	var arrow_line2 = new Konva.Line(prop_list);
	arrow_line2["name"] = "Inner";
	prop_list["points"] = [-10, outer_circle.y+10, 0, outer_circle.y];
	var arrow_line3 = new Konva.Line(prop_list);
	arrow_line3	["name"] = "Inner";

	return {element: [outer_circle, arrow_line1, arrow_line2, arrow_line3]};
}

AAutomataInitialState.prototype.updateShapeSize = function(res) {

	var box = this;
	var shapes = box.shapes;

	var outer_circle = shapes[0];

	outer_circle.radius(res["radius"]);
	outer_circle.x(res["centerX"]);
	outer_circle.y(res["centerY"]);


	var arrow_line1 = shapes[1];
	arrow_line1.points( [-20, res["centerY"], 0, res["centerY"]])
	var arrow_line2 = shapes[2];
	arrow_line2.points( [-10, res["centerY"]-10, 0, res["centerY"]])
	var arrow_line3 = shapes[3];
	arrow_line3.points( [-10, res["centerY"]+10, 0, res["centerY"]])
}

AAutomataInitialState.prototype.updateShapeStyle = function(style) {
	BPMNShape.prototype.updateShapesStyle.call(this, style);
}

//-----------------------


//Document
A2Document = function(editor) {
	SVGShape.call(this, editor);

	this.shapesData = [{name: "Document2",
						path: "M0 0 L0 60 C15,80 45,40 60,40 L60 0 Z",
						originalWidth: 60,
						originalHeight: 65,
					}];
}

A2Document.prototype = Object.create(SVGShape.prototype);
A2Document.prototype.constructor = A2Document;

A2Document.prototype.compartmentArea = function() {
	return ARectangle.prototype.compartmentArea.call(this);
}


//Note
Note = function(editor) {
	SVGShape.call(this, editor);

	this.shapesData = [{name: "Note",
						path: "M 126 0 126 17 144 17 126 0 0 0 0 75 144 75 144 17 Z",
						originalWidth: 144,
						originalHeight: 75,
					}];
}

Note.prototype = Object.create(SVGShape.prototype);
Note.prototype.constructor = Note;

Note.prototype.compartmentArea = function() {

	var box = this;

    var size = box.getSize();
    var width = size["width"];

    var res = ARectangle.prototype.compartmentArea.call(box);		
	res["x2"] = res["x2"] - width / 10;

    return res;
}


//Xex
Xex = function(editor) {
	SVGShape.call(this, editor);

	this.shapesData = [{name: "Xex",
						path: "M0 25 L10 50 L50 50 L60 25 L50 0 L10 0 Z",
						originalWidth: 60,
						originalHeight: 50,
					}];
}

Xex.prototype = Object.create(SVGShape.prototype);
Xex.prototype.constructor = Xex;

Xex.prototype.compartmentArea = function() {

	var box = this;

    var size = box.getSize();
    var width = size["width"];
    var height = size["height"];

    var res = ARectangle.prototype.compartmentArea.call(box);
	
	var delta_x = width / 8;
	res["x1"] = res["x1"] + delta_x;
	res["x2"] = res["x2"] - delta_x;

	var delta_y = height / 8;
	res["y1"] = res["y1"] + delta_y;
	res["y2"] = res["y2"] - delta_y;

    return res;
}


//StarEmpty
StarEmpty = function(editor) {
	SVGShape.call(this, editor);

	this.shapesData = [{name: "StarEmpty",
						path: "M611.027,234.153c-1.719-5.078-6.718-14.374-22.811-16.874l-179.678-26.171L330.104,32.523   c-7.578-15.155-16.874-17.733-24.452-17.733c-15.156,0-23.593,15.155-25.311,17.733l-78.434,158.586L24.729,216.42   c-11.796,1.719-21.093,8.437-23.593,17.733c-3.359,10.156,0.859,20.233,10.937,30.389L138.629,386.88L109.1,561.559   c-0.859,4.219-3.359,17.733,5.078,27.03c6.718,8.437,18.593,10.156,31.248,4.219c0,0,0.859,0,0.859-0.859l159.445-84.371   l159.445,84.371c5.937,3.359,11.796,5.078,16.874,5.078c6.718,0,11.796-2.5,16.015-6.718c3.359-3.359,6.718-10.156,5.078-22.811   L472.675,386.88l129.056-125.697C612.668,250.168,612.668,240.95,611.027,234.153z M444.785,370.865   c-3.359,3.359-5.078,8.437-4.219,13.515l30.389,175.46l-157.804-82.652c-4.219-2.5-10.156-2.5-14.374,0L140.973,559.84   l30.389-175.46c0.859-5.078-0.859-10.156-4.219-13.515L38.947,246.809l176.319-25.311c5.078-0.859,9.296-4.219,11.796-8.437   l78.434-159.445l78.433,159.445c2.5,4.219,6.718,7.578,11.796,8.437l176.319,25.311L444.785,370.865z",
						originalWidth: 611.85,
						originalHeight: 611.85,
					}];
}

StarEmpty.prototype = Object.create(SVGShape.prototype);
StarEmpty.prototype.constructor = StarEmpty;


//Shoes
Shoes = function(editor) {
	SVGShape.call(this, editor);

	var path1 = "M18.626,50.494c-2.461,0-4.859,0.253-7.206,0.652c-0.163,4.019-0.183,9.874,1.743,12.148    c2.712,3.203,8.699,3.203,11.106-0.444c2.387-3.62,0.804-8.826,0.136-11.924C22.508,50.674,20.591,50.494,18.626,50.494z";
	var path2 = "M20.182,14.017C13.978,14.236,7.7,28.76,9.378,36.207c0.604,2.669,2.191,8.176,2.191,11.388    c0,0.39-0.03,0.999-0.065,1.735c2.327-0.374,4.694-0.622,7.124-0.622c1.858,0,3.68,0.15,5.478,0.369    c-0.178-1.738-0.229-4.428,0.386-7.179c0.829-3.721,2.569-7.591,3.284-9.562C29.233,28.324,26.386,13.797,20.182,14.017z";
	var path3 = "M47.016,37.062c-2.01,0-3.972,0.188-5.906,0.452c-0.718,3.144-1.971,7.934,0.263,11.32    c2.406,3.647,8.395,3.647,11.106,0.445c1.832-2.165,1.902-7.582,1.766-11.565C51.891,37.318,49.484,37.062,47.016,37.062z";
	var path4 = "M45.46,0.002c-6.205-0.22-9.052,14.307-7.592,18.321c0.717,1.969,2.455,5.842,3.283,9.563    c0.687,3.076,0.545,6.098,0.319,7.77c1.82-0.226,3.661-0.381,5.545-0.381c2.44,0,4.815,0.249,7.151,0.628    c-0.048-1.009-0.094-1.832-0.094-2.324c0-3.212,1.588-8.719,2.192-11.388C57.942,14.748,51.663,0.221,45.46,0.002z";

	var shapes_data = [
						{name: "A",
							path: path1,
							originalWidth: 65.644,
							originalHeight: 65.645,
						},

						{name: "B",
							path: path2,
							originalWidth: 65.644,
							originalHeight: 65.645,
						},

						{name: "C",
							path: path3,
							originalWidth: 65.644,
							originalHeight: 65.645,
						},

						{name: "D",
							path: path4,
							originalWidth: 65.644,
							originalHeight: 65.645,
						},
					];

	this.shapesData = shapes_data;
}

Shoes.prototype = Object.create(SVGShape.prototype);
Shoes.prototype.constructor = Shoes;

