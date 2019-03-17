
ShowSchemaTree = function () {
	$("#schema-tree").modal("show");
};


Template.schemaTree.helpers({

	classes: function() {
    	var schema = new VQ_Schema();
		return schema.Tree;

		if (schema) {
			var classes = _.filter(_.sortBy(_.map(schema.Classes, function(cl) {
				return {localName:cl.localName, attributes: _.sortBy(cl.getAttributes(),"name")}
			}), "localName"), function(c) {return c.localName != " "});

			return classes;
		}
	},

});


Template.schemaTree.events({

	"click .toggle-tree-button": function(e) {
		var toggle_button = $(e.target);
		var class_item = toggle_button.closest(".class-item");
		var tree_node_id = toggle_button[0].attributes["node-id"].value;
		
		if (toggle_button.hasClass("expand")) {
			//class_item.find(".attributes-list").css({display: "block"});
			class_item.children().css({display: "block"});
			
			toggle_button.removeClass("expand")
						.addClass("collapse")
						.text("Collapse");
						
			if ( VQ_Shema_copy && VQ_Shema_copy.TreeList[tree_node_id])
				VQ_Shema_copy.TreeList[tree_node_id].display = "block";
		}

		else {
			class_item.find(".attributes-list").css({display: "none"});
			//class_item.children().css({display: "none"});
			toggle_button.removeClass("collapse")
						.addClass("expand")
						.text("Expand");
					
			if ( VQ_Shema_copy && VQ_Shema_copy.TreeList[tree_node_id])	
				VQ_Shema_copy.TreeList[tree_node_id].display = "none";	
		}
	},


	"dblclick .class-body": function(e) {
		var class_name = $(e.target).closest(".class-body").attr("value");
		//console.log($(e.target).closest(".class-body"))
		//var class_name = $(e.target).closest(".class-body").attr("data-id");
		if ( class_name != "" )
		{
			const BLACK_HEADER_HEIGHT = 45;
			const DEFAULT_BOX_WIDTH = 194;
			const DEFAULT_BOX_HEIGHT = 66;
			const DEFAULT_OFFSET = 10;
			// get location of the editor
			var ajoo_scene_attrs = Interpreter.editor.stage.attrs;
			var attrs = {scroll_h: ajoo_scene_attrs.container.scrollTop,
			scroll_w: ajoo_scene_attrs.container.scrollLeft,
			visible_h: ajoo_scene_attrs.container.clientHeight,
			visible_w: ajoo_scene_attrs.container.clientWidth,
			total_h: ajoo_scene_attrs.height,
			y_relative_top: ajoo_scene_attrs.container.getBoundingClientRect().top,
			y_relative_bottom: ajoo_scene_attrs.container.getBoundingClientRect().bottom,
		};
		//console.log(attrs);
		//// Place in bottom right corner of visible area
			var loc = {x: attrs.visible_w + attrs.scroll_w - DEFAULT_OFFSET- DEFAULT_BOX_WIDTH,
								 y: attrs.scroll_h + attrs.visible_h-DEFAULT_OFFSET-DEFAULT_BOX_HEIGHT,
								 width: DEFAULT_BOX_WIDTH,
								 height: DEFAULT_BOX_HEIGHT};
	  //console.log(loc);
			var schema = new VQ_Schema;
			class_name =  schema.findClassByName(class_name).getElementShortName();
			Create_VQ_Element(function(boo) {
				boo.setName(class_name);
				var proj = Projects.findOne({_id: Session.get("activeProject")});
				boo.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
			}, loc);
		}	

	},

});
