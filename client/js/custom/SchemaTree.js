
ShowSchemaTree = function () {
	$("#schema-tree").modal("show");
};


Template.schemaTree.onRendered(function() {


	var current_elem_sec_id;
    $("#nestable3").sortable({
        items: ".section-item",
       // distance: 3,

   //     	//selecting the dragged elem-section id
   //      start: function(event, ui) {

   //      	var el = $(ui.item);
   //      	current_elem_sec_id = el.closest(".section-item").attr("id");
   //      },

   //      stop: function(event, ui) {

   //       	var el = $(ui.item[0]);
			// if (el.hasClass("section-item")) {

			// 	//selecting the before elem-sec index
	  //       	var before = ui.item.prev().get(0);
	  //       	var prev_index = -1;
	  //       	if (before)
	  //       		prev_index = $(before).attr("index");

	  //       	//update
	  //          	var params = {prevIndex: Number(prev_index),
		 //    				currentIndex: Number(el.attr("index")),

		 //    				elementSectionId: current_elem_sec_id,
		 //    				projectId: Session.get("activeProject"),
		 //    				versionId: Session.get("versionId"),
		 //    				diagramId: Session.get("activeDiagram"),
		 //    			};

	  //       	Utilities.callMeteorMethod("reoredrSectionToElement", params);
	  //       }

   //      },
    });


});


Template.schemaTree.helpers({

	classes: function() {
		var schema = Schema.findOne();
		if (schema) {

			var attributes = schema.Attributes;
			var classes = _.sortBy(schema.Classes, "localName");

			_.each(classes, function(cl) {

				var full_name = cl.fullName;

				cl.attributes = _.filter(attributes, function(attr) {
									return _.find(attr.SourceClasses, function(source_class) {
										return source_class == full_name;
									});
								});
			});

			return classes;
		}
	},

});