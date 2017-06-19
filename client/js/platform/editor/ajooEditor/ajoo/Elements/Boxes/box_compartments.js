
BoxCompartments = function(element, comparts_in) {

	var compartments = this;
	compartments.element = element;	
	compartments.editor = element.editor;

	compartments.textsGroup = find_child(element.presentation, "TextsGroup");

	compartments.minWidth = 0;
	compartments.minHeight = 0;

	compartments.compartments = [];
	if (comparts_in && comparts_in.length > 0)
		compartments.create(comparts_in);

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

			if (compart_in["value"] == undefined || compart_in["value"] == "") {
				return;
			}

			if (compart_in["style"]) {
				compart_in["style"]["visible"] = (compart_in["style"]["visible"] == "true");
			}

			var compart = new Compartment(compartments, compart_in, compartments.textsGroup);
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

			var text = compart.presentation;

			text.width(text_width);
			text.y(total_height);	

			var text_height = text.getHeight();
			total_height = total_height + text_height;

			compart.textWidth = text_width;
			compart.textHeight = text_height;

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
			if (compart._id != compart_id)
				return true;
		});

		compartments.recomputeCompartmentsPosition();
		compartments.element.presentation.draw();
	},

}

Compartment = function(compartments, compart_in, parent) {

	var compart = this;
	compart.compartments = compartments;

	compart._id = compart_in["_id"];

	compart.textsParent = parent;
	var text = compart.createText(compart_in);

	compart.presentation = text;

	compart.textWidth = text.getTextWidth();
	compart.textHeight = text.getHeight();

	compart.value = compart_in.value;
	compart.input = compart_in.input;

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
		texts_group.add(text);

		return text;
	},

	remove: function() {
		var compart = this;
		var text = compart.presentation;
		if (text)
			text.destroy();

		compart.presentation = undefined;
	},

}

