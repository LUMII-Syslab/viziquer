
load_zoom_chart_editor = function(diagram) {

    var diagram_type = DiagramTypes.findOne({_id: diagram["diagramTypeId"]});

    //if no diagram type or no layout, then loading no editor
    if (!(diagram_type && diagram_type["layout"])) {
    	return;
    }

    var container_name = "Diagram_Editor";

    var container_width = 1200;//screen.width;
    var container_height = $(window).height() - $("#" + container_name).offset().top - 30;

	var chart = new NetChart({
		        container: document.getElementById(container_name),
		        height: container_height,
		        width: container_width,	
		            	
	        	advanced: {
			        assets: ["http://sna.oranzais.lumii.lv/GraphExploration/zoomcharts/lib/assets/base.css",
			        		"http://sna.oranzais.lumii.lv/GraphExploration/zoomcharts/lib/assets/netchart.css"],
			    },

			    area: {
			    	style: {
			    		fillColor: diagram["style"]["fill"],
			    	},
			    },

		        layout:{
		            mode: diagram_type["layout"]["mode"],
		            nodeSpacing: diagram_type["layout"]["nodeSpacing"],
		            layoutFreezeTimeout: diagram_type["layout"]["layoutFreezeTimeout"],
		            globalLayoutOnChanges: diagram_type["layout"]["globalLayoutOnChanges"],
		        },

		        events:{
		            onRightClick: right_click,
		            onClick: left_click,
		        },
		    });

	var is_edit_mode = false;
	if (diagram["editing"] && diagram["editing"]["userId"] == Session.get("userSystemId")) {
		chart["isEditMode"] = true;
		Session.set("editMode", true);
	}

	return chart;
}

function right_click(e) {
	e.preventDefault();

	context_menu_hide();

	var node = e.clickNode;
	var edge = e.clickLink;

	var id;

	var chart = Interpreter.editor;

	var selected = chart.selection();

	//if multiple elements are selected
	if (selected.length > 1) {

		if (!diagram_type) {

			var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
			if (!diagram) {
				return;
			}

			diagram_type = DiagramTypes.findOne({_id: diagram["diagramTypeId"]});
			if (!diagram_type) {
				return;
			}
		}

		var menu = get_context_menu_list(diagram_type, "collectionContextMenu", "dynamicCollectionContextMenu");
		var is_zoom_chart = true;
		new ContextMenu(e, menu.menu, is_zoom_chart);
		//context_menu_show_zoom_chart(e, menu);
	}

	//if a click is on the element
	else if (node || edge) {

		var elem;
    	if (node) {
        	id = node["id"];
        	elem = node;
    	}

    	else if (edge) {
        	id = edge["id"];
        	elem = edge;
        }

        var element = Elements.findOne({_id: id});
        if (!element) {
        	return;
        }

		var elem_type = ElementTypes.findOne({_id: element["elementTypeId"]});
		if (!elem_type) {
			return;
		}
			
		var menu = get_context_menu_list(elem_type, "contextMenu");
		var is_zoom_chart = true;
		new ContextMenu(e, menu.menu, is_zoom_chart);

		Interpreter.setActiveElement(id);
		Session.set("activeStyleIndex", reset_variable());
    }

    //if an empty diagram place was clicked
	else {

		if (!diagram_type) {
			var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
			if (!diagram) {
				return;
			}

			var diagram_type = DiagramTypes.findOne({_id: diagram["diagramTypeId"]});
			if (!diagram_type) {
				return;
			}
		}

		var menu = get_context_menu_list(diagram_type, "noCollectionContextMenu");
		var is_zoom_chart = true;
		new ContextMenu(e, menu.menu, is_zoom_chart);
		//context_menu_show_zoom_chart(e, menu);
	}
}

function left_click(e) {
	e.preventDefault();

	context_menu_hide();

	var node = e.clickNode;
	var edge = e.clickLink;

	var id;
	if (node || edge) {

		var elem;
    	if (node) {
        	id = node["id"];
        	elem = node;
        }
        else if (edge) {
        	id = edge["id"];
        	elem = edge;
        }

        Interpreter.setActiveElement(id);
        Session.set("activeStyleIndex", reset_variable());
    }

    else {
		Session.set("activeElement", reset_variable());
		Session.set("activeElementType", reset_variable());
		Session.set("activeStyleIndex", reset_variable());
    }

}


