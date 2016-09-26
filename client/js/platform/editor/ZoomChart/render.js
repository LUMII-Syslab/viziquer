

render_zoom_chart_diagram = function(chart, template) {

	var init = true;

	var nodes = [];
	var links = [];


   	var elem_handle = Elements.find({isInVisible: {$ne: true}}).observeChanges({
   		
		added: function (id, elem) {

			if (init) {

				if (elem["type"] == "Box")	
					build_zoom_chart_node(id, elem, nodes);

				else if (elem["type"] == "Line")
					build_zoom_chart_link(id, elem, links);	
			}
		},

		changed: function (id, fields) {

			if (fields["style"]) {

      			var style_in = fields["style"];
				var nodes = get_zoomchart_nodes();
				var links = get_zoomchart_links();

				var node = nodes[id];
				var link = links[id];

				var elem;
				if (node) {
					elem = node;
				}

				else if (link)
					elem = link;

				else {
					console.log("Error: no such element");
					return;
				}

				var elem_style = get_zoom_chart_elem_style(elem);

				var elem_style_in = style_in["elementStyle"];
				_.each(elem_style_in, function(val, key) {
					elem_style[key] = val;
 				});

				chart.updateStyle();
			}
		},

     });

	template.elementHandle = new ReactiveVar(elem_handle);
   	chart.addData({nodes: nodes, links: links});

   	var compart_handle = Compartments.find({isObjectRepresentation: true}).observeChanges({

   		changed: function(id, fields) {
              
            if (fields["style"] || fields["value"]) {
          
                var compart = Compartments.findOne({_id: id});
                if (!compart) {
                    return;        
                }

                var elem_id = compart["elementId"];
              
                var value = fields["value"] || compart["value"];
                var style = fields["style"] || compart["style"];

                render_compartment(elem_id, value, style);
            }
   		},

   		removed: function(id) {

            var compart = Compartments.findOne({_id: id});
            if (!compart) {
                return;
            }
            
            var elem_id = compart["elementId"];
            var value = "";
            var style = compart["style"];
        
   			render_compartment(elem_id, value, style);
   		},

   	});

	template.compartmentHandle = new ReactiveVar(compart_handle);

   	init = false;
}

build_zoom_chart_node = function(id, box, nodes) {
	var new_box_obj = build_zoom_chart_element(id, box);
	new_box_obj["loaded"] = true;

	nodes.push(new_box_obj);
}

build_zoom_chart_link = function(id, line, links) {
	var new_line_obj = build_zoom_chart_element(id, line);
	new_line_obj["from"] = line["startElement"];
	new_line_obj["to"] = line["endElement"];

	links.push(new_line_obj);
}

//THIS is kind of hack, couldn't find a better way to get all nodes and links
get_zoomchart_nodes = function() {
	var chart = Interpreter.editor;

	//return chart["_impl"]["data"]["default"]["nodes"];
	return chart["_impl"]["graph"]["idToNode"] || {};	
}

get_zoomchart_links = function() {
	var chart = Interpreter.editor;

	//return chart["_impl"]["data"]["default"]["links"];
	return chart["_impl"]["graph"]["idToLink"] || {};
}

function build_zoom_chart_element(id, elem) {

	var elem_out = {id: id};

	var name = "";
	var label_style;
	var compart = Compartments.findOne({elementId: elem_out["id"], isObjectRepresentation: true});

	if (compart) {
		name = compart["value"];
		label_style = compart["style"];
	}

	var style = elem["style"]["elementStyle"];
	style["label"] = name;
	style["labelStyle"] = label_style;

	elem_out["style"] = style;

	return elem_out;
}

function render_compartment(elem_id, value_in, style_in) {

    var nodes = get_zoomchart_nodes();
    var links = get_zoomchart_links();

    var elem;
    if (nodes[elem_id]) {
    	elem = nodes[elem_id];
    }

    else if (links[elem_id]) {
    	elem = links[elem_id];
    }

    else {
    	console.error("Error: no element");
    	return;
    }

    var elem_style = get_zoom_chart_elem_style(elem);

    elem_style["label"] = value_in;
    elem_style["labelStyle"] = style_in;

    var chart = Interpreter.editor;
	chart.updateStyle();
}

//var editor_data = chart["_impl"]["data"]["default"];
//var editor_links = editor_data["links"];
//var editor_nodes = editor_data["nodes"];

function get_zoom_chart_elem_style(elem) {
	return elem["data"]["style"];
}