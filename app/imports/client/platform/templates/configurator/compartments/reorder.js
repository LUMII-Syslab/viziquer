import { Utilities } from '/imports/client/platform/js/utilities/utils'
import { CompartmentTypes, ElementTypes } from '/imports/db/platform/collections'

import './reorder.html'

Template.compartmentReorder.helpers({

	compartment_types: function() {
		if (Session.get("activeElement")) {
			var elem_type = ElementTypes.findOne({elementId: Session.get("activeElement")});
			if (elem_type)
				return CompartmentTypes.find({elementTypeId: elem_type["_id"]}, {sort: {index: 1}});
		}
	},
});

Template.compartmentReorder.rendered = function() {

	//adding dialog tab sorting
    $(".compartmentTypes").sortable({              
        items: ".compartmentType",
        distance: 3,

        stop: function(event, ui) {
         	var el = $(ui.item);
	    	var id = el.attr("id");
	    	var elem_type_id = el.attr("elementTypeId");

        	var before = ui.item.prev().get(0);
        	var prev_index = -1;
        	if (before)
        		prev_index = $(before).attr("index");

        	var list = {prevIndex: Number(prev_index),
        				currentIndex: Number(el.attr("index")),
        				compartmentTypeId: id,
        				diagramTypeId: Session.get("targetDiagramType"),
        				toolId: Session.get("toolId"),
        				versionId: Session.get("toolVersionId"),
        			};

        	if (elem_type_id)
        		list["elementTypeId"] = elem_type_id;

            Utilities.callMeteorMethod("reorderCompartmentTypeIndexes", list);
        },
    });
}
