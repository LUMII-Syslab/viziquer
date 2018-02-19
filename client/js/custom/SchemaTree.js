
ShowSchemaTree = function () {
	$("#schema-tree").modal("show");
};


// Template.schemaTree.onRendered(function() {


// 	var current_elem_sec_id;
//     $("#nestable3").sortable({
//         items: ".section-item",
//        // distance: 3,

//    //     	//selecting the dragged elem-section id
//    //      start: function(event, ui) {

//    //      	var el = $(ui.item);
//    //      	current_elem_sec_id = el.closest(".section-item").attr("id");
//    //      },

//    //      stop: function(event, ui) {

//    //       	var el = $(ui.item[0]);
// 			// if (el.hasClass("section-item")) {

// 			// 	//selecting the before elem-sec index
// 	  //       	var before = ui.item.prev().get(0);
// 	  //       	var prev_index = -1;
// 	  //       	if (before)
// 	  //       		prev_index = $(before).attr("index");

// 	  //       	//update
// 	  //          	var params = {prevIndex: Number(prev_index),
// 		 //    				currentIndex: Number(el.attr("index")),

// 		 //    				elementSectionId: current_elem_sec_id,
// 		 //    				projectId: Session.get("activeProject"),
// 		 //    				versionId: Session.get("versionId"),
// 		 //    				diagramId: Session.get("activeDiagram"),
// 		 //    			};

// 	  //       	Utilities.callMeteorMethod("reoredrSectionToElement", params);
// 	  //       }

//    //      },
//     });


// });


Template.schemaTree.helpers({

	classes: function() {
    var schema = new VQ_Schema();
		if (schema) {
			var classes = _.filter(_.sortBy(_.map(schema.Classes, function(cl) {
				return {localName:cl.localName, attributes: _.sortBy(cl.getAttributes(),"name")}
			}), "localName"), function(c) {return c.localName!=" "});
  //console.log(classes);
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

});
