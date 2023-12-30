import { Interpreter } from '/imports/client/lib/interpreter'
import { Dialog } from '/imports/client/platform/js/interpretator/Dialog'
import { ElementTypes, DiagramTypes } from '/imports/db/platform/collections'
import { _contextMenu } from '/imports/client/lib/global_variables'
import { reset_variable } from '/imports/client/platform/js/utilities/utils'

import { dataShapes } from '/imports/client/custom/vq/js/DataShapes'


_.extend(Interpreter, {
					processContextMenu: function(e, menu, params, isZoomChart) {
										new ContextMenu(e, menu, params, isZoomChart);
									},

					hideContextMenu: function() {
										Session.set("contextMenu", reset_variable());
									},
		});

//Context menu
function ContextMenu(e, menu, params, isZoomChart) {

	this.params = params || [];
	this.isZoomChart = isZoomChart;
	
	this.menu = menu;

	this.createMenu(e, menu);

	_contextMenu = this;
}

ContextMenu.prototype = {

	createMenu: function(e, menu) {

		if (this.isZoomChart) {
			this.showZoomChartMenu(e, {menu: menu});
		}

		else {
			this.showAjooMenu(e, {menu: menu});
		}
	},

	selectMenuItem: function(indexes, procedure = '') {
		if ( procedure != '' && procedure != undefined) {
			Interpreter.execute(procedure);
		}
		else {
			var menu = this.menu[indexes[0]];

			//selecting the menu
			if (_.isNumber(indexes[1])) {
				menu = menu.subMenu[indexes[1]];
			}
			
			if (menu) {

				if (menu["func"]) {
					menu["func"].apply(this, this.params);
				}

				else if (menu["procedure"]) {
					Interpreter.execute(menu["procedure"]);
				}

				else {
					console.error("Error: No context menu function");
				}
			}

			else {
				console.error("Error: No context menu function");
			}		
		}

		this.hide();
	},

	hide: function() {
		Session.set("contextMenu", reset_variable());
		_contextMenu = reset_variable();
	},

	showZoomChartMenu: function(e, obj) {

		var x = e.x;
		var y = e.y;

		var target = $(e.target);

		var parent = target.closest(".context-menu-container");
		var net_chart_container = $("#netChartContainer");

		var delta_x = Math.round(net_chart_container.offset().left - parent.offset().left);
		var delta_y = Math.round(net_chart_container.offset().top - parent.offset().top);

		x += delta_x;
		y += delta_y;

		obj["display"] = "block";
		obj["x"] = x;
		obj["y"] = y;

		obj["left"] = x + "px";
		obj["top"] = y + "px";

		Session.set("contextMenu", obj);
	},

	showAjooMenu: function(e, obj) {

		var editor = Interpreter.editor;
		editor.data.ev = e;

		if (obj) {
	    
	    	var mouse_state_obj = editor.getMouseStateObject();
			var pos = mouse_state_obj.getPageMousePosition(e);

			var x = pos["x"];
			var y = pos["y"]

			obj["display"] = "block";
			obj["x"] = x;
			obj["y"] = y;

			obj["left"] = x + "px";
			obj["top"] = y + "px";

			Session.set("contextMenu", obj);
		}
	},

}

function get_context_menu_list(obj_type, property, extension_point) {
	var prop_name = Interpreter.getExtensionPointProcedure(extension_point, obj_type);
	if (prop_name && prop_name != "") {
		return {menu: Interpreter.execute(prop_name)};
	}
	else {
		return {id: obj_type["_id"], attrName: property};
	}
}

// Start of context menu template which is diagram.html
Template.contextMenuTemplate.helpers({
	context_menu_item: function() {

		var properties = Session.get("contextMenu");
		if (properties) {

			var menu = properties["menu"];

			//if the object type id is specified
			var obj_type_id = properties["id"];
			if (obj_type_id) {

				var attr_name = properties["attrName"];

				//selecting diagram type context menu
				var diagram_type = DiagramTypes.findOne({_id: obj_type_id});
				if (diagram_type) {
					menu = diagram_type[attr_name];
				}

				//selecting element type context menu
				else {
					var elem_type = ElementTypes.findOne({_id: obj_type_id});
					if (elem_type) {
						menu = elem_type[attr_name];
					}
				}
			}

			//if menu
			if (menu && menu.length > 0) {

				properties["menu"] = _.map(menu, function(item, i) {
										item.index = i;
										
										if (item.subMenu) {
											item.subMenu = _.map(item.subMenu, function(menu_item, i) {
													menu_item.index = i;
													
													if (menu_item.subMenu) {
														if (dataShapes.schema.hide_individuals == true) {
															menu_item.subMenu = menu_item.subMenu.filter(function(m){ return m.procedure != 'AddUriName'; });
														}
								
														menu_item.subMenu = _.map(menu_item.subMenu, function(menu_item_3, i) {
																menu_item_3.index = i;
																return menu_item_3;
															});
													}
											
													return menu_item;
												});
										}

										return item;
									});

				return properties;
			}
		}

		//if no menu, then reseting the context menu
		return {display: "none", left: "0px", top: "0px", x: 0, y: 0};		
	},
});

Template.contextMenuTemplate.events({

//executes the procedure by name that is attached to the context menu item
	'click .context-menu-item': function(e) {

		e.preventDefault();
		var menu_item = $(e.target);

		var sub_menu = menu_item.closest(".sub-menu");

		var indexes = [];
		if (sub_menu.length > 0) {
			var parent_menu_parent = sub_menu.closest(".context-menu-item-li");
			var parent_menu = parent_menu_parent.find(".context-menu-item");
			var parent_index = Number(parent_menu.attr("index"));
			indexes.push(parent_index);
			
		}

		var index = Number(menu_item.attr("index"));

		if (_.isNumber(index)) {
			indexes.push(index);
			_contextMenu.selectMenuItem(indexes, menu_item.attr("procedure"));
		}
	},

	'mouseover .context-menu-item': function(e) {
		var context_menu_item = $(e.target).closest(".context-menu-item");

		var context_menu_obj = $("#contextMenu");
		var context_menu_pos = context_menu_obj.position();
		var context_menu_width = context_menu_obj.width();

		var sub_menu_pos_x = context_menu_width - 5;
		var sub_menu_pos_y = context_menu_item.position().top - 8;
		if ( context_menu_item.attr("level") == '2') 
			sub_menu_pos_x = sub_menu_pos_x -15;

		//sub-menu class name
		var sub_menu_name = "sub-menu";
		var sub_sub_menu_name = "sub-sub-menu";
		if ( context_menu_item.attr("level") == '2') 
			sub_menu_name = "sub-sub-menu";

		var parent_context_menu = context_menu_item.closest("." + sub_menu_name);

		//hiding all the sub-menus, except if the sub-menu is mouse overed
		$("." + sub_menu_name).each(function(i, obj) {

			var j_obj = $(obj)
			if (j_obj.is(parent_context_menu)) {
				return;
			}
			j_obj.css({display: "none"});  
		});
		
		if (( context_menu_item.attr("level") == '1') ) {
			$("." + sub_sub_menu_name).each(function(i, obj) {
				var j_obj = $(obj)
				j_obj.css({display: "none"});  
			});		
		}
		
		//if there is a sub-menu, then computing its position
		var child_menu = context_menu_item.closest(".context-menu-item-li").find("." + sub_menu_name);

		if (child_menu.length > 0) {
			child_menu.css({left: sub_menu_pos_x, top: sub_menu_pos_y, display: "inline"});
		}			

	},

});
// End of context menu template

Template.contextMenuTemplate.rendered = function() {
	//context_menu_hide();

	if (_contextMenu) {
		_contextMenu.hide();
	}

}

Template.contextMenuTemplate.destroyed = function() {
	//context_menu_hide();

	if (_contextMenu) {
		_contextMenu.hide();
	}
}

//hides the context menu
function context_menu_hide() {
	Session.set("contextMenu", reset_variable());
} 


export {
  ContextMenu, 
  context_menu_hide,
  get_context_menu_list,
}
