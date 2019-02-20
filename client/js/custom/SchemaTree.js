
ShowSchemaTree = function () {
	$("#schema-tree").modal("show");
};


Template.schemaTree.helpers({

	classes: function() {
    	var schema = new VQ_Schema();
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

		if (toggle_button.hasClass("expand")) {
			class_item.find(".attributes-list").css({display: "block"});
			toggle_button.removeClass("expand")
						.addClass("collapse")
						.text("Collapse");
		}

		else {
			class_item.find(".attributes-list").css({display: "none"});
			toggle_button.removeClass("collapse")
						.addClass("expand")
						.text("Expand");
		}
	},


	"dblclick .class-body": function(e) {
		var class_name = $(e.target).closest(".class-body").attr("value");
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
		Create_VQ_Element(function(boo) {
			boo.setName(class_name);
			var proj = Projects.findOne({_id: Session.get("activeProject")});
			boo.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
		}, loc);

	},

});
