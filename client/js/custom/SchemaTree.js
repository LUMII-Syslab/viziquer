
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

		var loc = {x: 400, y: 400, width: 88, height: 66};
		Create_VQ_Element(function(boo) {
			boo.setName(class_name)
		}, loc);

	},

});
