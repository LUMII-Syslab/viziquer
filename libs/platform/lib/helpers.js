
fill_priorities = function() {
	return [
			{option: "color"},
			{option: "linear-gradient"},
			{option: "radial-gradient"},
			{option: "pattern"}];
}


compute_new_width_height = function(shape_name, new_width, new_height) {

	var radius = Math.max(new_width / 2, new_height / 2);

	var new_x = radius;
	var new_y = radius;
	var new_radius = radius;

	var res = {width: new_width, height: new_height};

	var list_of_node_types = {
		
		RoundRectangle: function() {
			return res;
		},

		Rectangle: function() {
			return res;
		},

		//ellipse
		Ellipse: function() {

			var new_radius = {x: new_width / 2, y: new_height / 2};

			res["centerX"] = new_radius["x"];
			res["centerY"] = new_radius["y"];

			res["radiusX"] = new_radius["x"]
			res["radiusY"] = new_radius["y"];			

			return res;
		},

		//regular polygons	
		Circle: function() {
			return circle(res, new_radius);
		},

		Triangle: function() {

			if (new_width > new_height) {
				new_radius = new_width / Math.sqrt(3);
				new_height = new_radius * 1.5;
			}

			else {
				new_radius = new_height * 2 / 3;
				new_width = new_radius * Math.sqrt(3);
			}

			res["centerX"] = new_width / 2;
			res["centerY"] = new_height * 2 / 3;

			res["radius"] = new_radius;

			res["width"] = new_width;
			res["height"] = new_height;

			return res;
		},

		Diamond: function() {

			var new_side = new_radius * 2;

			res["centerX"] = new_side / 2;
			res["centerY"] = new_side / 2;

			res["radius"] = new_radius;

			res["width"] = new_side;
			res["height"] = new_side;

			return res;
		},

		Square: function(prop_list) {
			new_radius = radius * 1 / (Math.sqrt(2) / 2);

			var new_side = new_radius * Math.sqrt(2);

			res["centerX"] = new_side / 2;
			res["centerY"] = new_side / 2;	

			res["radius"] = new_radius;

			res["width"] = new_side;
			res["height"] = new_side;

			return res;
		},

		Pentagon: function() {

			if (new_width > new_height) {
				new_radius = new_width / (2 * Math.sin(72 * Math.PI / 180));
				new_height = new_radius * (1 + Math.sin(54 * Math.PI / 180));
			}

			else {
				new_radius = new_height / (1 + Math.sin(54 * Math.PI / 180));
				new_width = new_radius * (2 * Math.sin(72 * Math.PI / 180));
			}

			res["centerX"] = new_width / 2;
			res["centerY"] = new_radius;

			res["radius"] = new_radius;

			res["width"] = new_width;
			res["height"] = new_height;

			return res;
		},

		Hexagon: function() {
			if (new_width > new_height) {
				new_radius = new_width / 2;
				new_height = new_radius * Math.sqrt(3);
			}

			else {
				new_radius = radius * 1 / (Math.sqrt(3) / 2);
				new_width = new_radius * 2;
			}				

			res["centerX"] = new_width / 2;
			res["centerY"] = new_height / 2;

			res["radius"] = new_radius;

			res["width"] = new_width;
			res["height"] = new_height;

			return res;
		},

		Octagon: function() {

			var new_side = new_radius * 2;

			res["centerX"] = new_side / 2;
			res["centerY"] = new_side / 2;

			res["radius"] = new_radius;

			res["width"] = new_side;
			res["height"] = new_side;

			return res;
		},

		BPMNTerminate: function() {
			return circle(res, new_radius);
		},

		BPMNCancel: function() {
			return circle(res, new_radius);
		},

		BPMNMultiple: function() {
			return circle(res, new_radius);
		},

		BPMNDiamondPlus: function() {
			return circle(res, new_radius);	
		},

		BPMNDiamondX: function() {
			return circle(res, new_radius);	
		},

		Arrow: function() {
			return res;
		},

	}

	if (list_of_node_types[shape_name])
		return list_of_node_types[shape_name]();

	else
		return res;
}

function circle(res, new_radius) {

	var new_width = new_radius * 2;
	var new_height = new_radius * 2;

	res["centerX"] = new_width / 2;
	res["centerY"] = new_height / 2;

	res["radius"] = new_radius;

	res["width"] = new_width;
	res["height"] = new_height;

	return res;
}

get_diagram_edit_state = function(user_id, type, is_configurator) {
	var item = {userId: user_id,
				action: type,
				time: new Date()};
				
	if (is_configurator)
		item["configurator"] = is_configurator;

	return item;
}

get_configurator_tool_id = function() {
	var configurator = Tools.findOne({isConfigurator: true});
	if (configurator)
		return configurator["_id"];
}


convert_assoc_array_to_array = function(assoc_array) {
	var array = [];
	for (var key in assoc_array) {
		array.push(key);
	}
	return array;
}
