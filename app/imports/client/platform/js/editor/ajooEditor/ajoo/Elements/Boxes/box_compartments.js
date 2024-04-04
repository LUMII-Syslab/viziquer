// import { _ } from 'vue-underscore';

import html2canvas from 'html2canvas';

var BoxCompartments = function(element, comparts_in) {

	var compartments = this;
	compartments.element = element;	
	compartments.editor = element.editor;

	compartments.textsGroup = compartments.editor.findChild(element.presentation, "TextsGroup");

	compartments.minWidth = 0;
	compartments.minHeight = 0;

	compartments.compartments = [];
	if (comparts_in && comparts_in.length > 0) {
		compartments.create(comparts_in);
	}

	return compartments;
}

BoxCompartments.prototype = {

	create: function(comparts_in) {
	
		var compartments = this;
		var element = compartments.element;
		var editor = compartments.editor;

		var pos = element.compartmentArea();
		var area_width = pos.x2 - pos.x1;
		var area_height = pos.y2 - pos.y1;

		//adding compartments
		compartments.addCompartments(comparts_in);
		var min_size = compartments.computeCompartmentsArea();

		if (element.settings.isTextFitEnabled) {

			//selecting element size
			var size = element.getSize();
			var relative_size = compartments.computeRelativeCompartmentArea(size, area_width, area_height, min_size);

			var min_shape_width = min_size.width;
			var min_shape_height = min_size.height;

			//setting min width and height
			compartments.minWidth = min_shape_width;
			compartments.minHeight = min_shape_height;

			if (min_shape_width > size.width || min_shape_height > size.height) {
				
				var new_width = Math.max(size.width, min_shape_width);
				var new_height = Math.max(size.height, min_shape_height);

				element.updateSize(new_width, new_height);
			}

			compartments.recomputeCompartmentsPosition();
		}

		else {
			compartments.recomputeCompartmentsPosition();

			//setting position for the Texts group
			var text_group = compartments.textsGroup;
			text_group.x(pos.x1);
			text_group.y(pos.y1);

			//setting min width and height
			compartments.minWidth = area_width || 0;
			compartments.minHeight = area_height || 0;
		}

	},

	addCompartments: function(comparts_in) {

		var compartments = this;
		var element = compartments.element;
		var editor = compartments.editor;

		var comparts = compartments.compartments;	
		_.each(comparts_in, function(compart_in) {
			
			compart_in.type = compart_in.type || "text";
			
			if ((compart_in && compart_in["type"] == "text" && compart_in["value"] == "") ||
				(compart_in["style"] && compart_in["style"]["visible"] == false)) {
				return;
			}

			var compart = new Compartment(compartments, compart_in, compartments.textsGroup)
			comparts.push(compart);

			editor.compartmentList[compart._id] = compart;
		});
	},

	computeCompartmentsArea: function() {

		var compartments = this;

		var min_width = 0;
		var total_height = 0;

		var comparts = compartments.compartments;	
		_.each(compartments.compartments, function(compart) {

			min_width = Math.max(min_width, compart.textWidth);
			total_height = total_height + compart.textHeight;
		});

		return {width: Math.round(1.03 * min_width), height: Math.round(1.03 * total_height)};
	},

	getCompartmentsArea: function(comparts_in) {
		var compartments = this;

		compartments.addCompartments(comparts_in);
		return compartments.computeCompartmentsArea();
	},

	computeRelativeCompartmentArea: function(size, area_width, area_height, min_size) {

		var compartments = this;

		var min_width = min_size.width;
		var total_height = min_size.height;

		//computing the minimal allowed shape width for the given text width
		var prop_w = area_width / size.width;
		var min_shape_width = min_width / prop_w;

		//computing the minimal allowed shape height for the given text height
		var prop_h = area_height / size.height;
		var min_shape_height = total_height / prop_h;

		return {width: Math.max(area_width, min_shape_width), 
				height: Math.max(area_height, min_shape_height)};
	},

	recomputeCompartmentsPosition: function() {

		var compartments = this;
		var comparts = compartments.compartments;

		var box = compartments.element;
		var size = box.getSize();

		//selecting element's compartments and recomputes their width
		var pos = box.compartmentArea();
		var text_width = pos["x2"] - pos["x1"];
		var text_height = pos.y2 - pos.y1;
		//var text_width = compartments.minWidth

		var total_height = 0;
		var max_width = 0;

		//updating each texts group label
		_.each(comparts, function(compart) {
			var presentation = compart.presentation;			
			if (compart.type == "text") {
				var text = presentation;

				text.width(text_width);
				text.y(total_height);	

				var text_height = text.getHeight() || 20;
				total_height = total_height + text_height;

				compart.textWidth = text_width;
				compart.textHeight = text_height;

				var underline = compart.underline;
				if (underline) {
					var underline_y_padding = 5;
					var undeline_y = total_height + underline_y_padding;

					var x_padding = 1
					underline.points([-x_padding, undeline_y, text_width + x_padding, undeline_y,]);

					total_height += 2 * underline_y_padding;
				}

			}

			else {
				if (compart.type == "horizontalLine") {
					var line = presentation;
					var padding = 2;
					line.points([0, total_height + padding, text_width, total_height + padding,]);
					total_height += 2 * padding;
				}
			}

			//max_width = Math.max(text.getTextWidth(), max_width);
		});

		//selecting text group
		var texts_group = compartments.textsGroup;		
		//texts_group.x(pos.x1 + (pos.x2 - pos.x1) / 2 - min_width / 2)
		//texts_group.y(pos.y1 + (pos.y2 - pos.y1) / 2 - min_height / 2);

		texts_group.x(pos.x1);
		texts_group.y(pos.y1);
	},

	removeAllRespresentations: function() {

		var compartments = this;
		var texts_group = compartments.textsGroup;

		compartments.compartments = [];
		texts_group.destroyChildren();

		compartments.recomputeCompartmentsPosition();		
	},

	removeOne: function(compart_id) {

		var compartments = this;
		var editor = compartments.editor;

		//refreshing the element
		//var comparts_list = compartments.compartments;
		var comparts_list = editor.compartmentList;
		var compart = comparts_list[compart_id];
		compart.remove();

		//delete comparts_list[compart_id];
		delete editor.compartmentList[compart_id];
		compartments.compartments = _.filter(compartments.compartments, function(compart) {
			if (compart._id != compart_id) {
				return true;
			}
		});

		compartments.recomputeCompartmentsPosition();
		if (compartments.element.presentation && compartments.element.presentation.parent) {
			compartments.element.presentation.draw();
		}
	},

}

var Compartment = function(compartments, compart_in, parent) {

	var compart = this;
	compart.compartments = compartments;

	compart._id = compart_in["_id"];

	compart_in.type = compart_in.type || "text";
	compart.type = compart_in.type;

	compart.textsParent = parent;
	if (compart_in.type == "text") {
		var text = compart.createText(compart_in);

		compart.presentation = text;

		// compart.textWidth = 20;
		compart.textWidth = text.getTextWidth() || 20;
		compart.textHeight = text.getHeight();

		compart.value = compart_in.value;
		compart.input = compart_in.input;
	}

	else {
		if (compart_in.type == "horizontalLine") {
				var line = compart.createHorizontalLine(compart_in);
				compart.presentation = line;
		}
		else {
			console.log("No type specified", compart_in.type)
		}

	}


	compart.compartmentTypeId = compart_in.compartmentTypeId;

	return compart;
}

Compartment.prototype = {

	createText: function(compart_in) {

		var compart = this;
		var texts_group = compart.textsParent;

		var attr_list = compart_in["style"];
		attr_list["text"] = compart_in["value"] || "";
		attr_list["listening"] = false;
		attr_list["perfectDrawEnabled"] = false;

		var text = new Konva.Text(attr_list);

		// 	text = new Konva.Image({
		// 								// x: 0,
		// 						        // y: 10,
		// 						        // draggable: false,
		// 						        // stroke: 'red',
		// 						        // scaleX: 1 / 1,
		// 						        // scaleY: 1 / 1,

		// 						        // scaleX: 1 / window.devicePixelRatio,
		// 						        // scaleY: 1 / window.devicePixelRatio,
		// 						      });


		texts_group.add(text);
		// compart.renderText(compart_in, text);


		if ((compart_in.underline == true) || (compart_in.compartmentType && compart_in.compartmentType.underline)) {
			var red_line = new Konva.Line({points: [0, 0, 0, 0],
											stroke: 'black',
											strokeWidth: 1,
										});

			texts_group.add(red_line);
			compart.underline = red_line;
		}

		return text;
	},


	createHorizontalLine: function(compart_in) {
			var compart = this;
			var texts_group = compart.textsParent;

			var style = compart_in.style || {};

      var line = new Konva.Line({
        points: [0, 0, 0, 0,],
        stroke: style.stroke || "white",
        strokeWidth: style.strokeWidth || 1,
      });

      texts_group.add(line);

      return line;
	},

	getTextWidth() {
		var width = 0;
		var presentation = this.presentation;
		if (presentation) {
			width = presentation.getTextWidth();
		}

		return width;
	},

	getTextHeight() {
		var height = 0;
		var presentation = this.presentation;
		if (presentation) {
			height = presentation.getTextHeight();
		}

		return height;
	},

	remove: function() {
		var compart = this;
		var text = compart.presentation;
		if (text) {
			text.destroy();
		}

		compart.presentation = undefined;
	},


    renderText: function(compart_in, item) {
        // convert DOM into image

    	$("#render-compart-value").text(compart_in.value);

        html2canvas(document.querySelector('#very-good'), {
        	imageTimeout: 0,
        	scale: 1,
        	backgroundColor: null,
          // backgroundColor: 'rgba(0,0,0,0)',
        }).then((canvas) => {

        	// console.log("canvas", compart_in, canvas)

          // show it inside Konva.Image
          item.image(canvas);
        });
    }

}

// export default BoxCompartments
export {BoxCompartments, Compartment,}
