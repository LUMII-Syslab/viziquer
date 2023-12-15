import { Utilities } from '/client/js/platform/utilities/utils'
import { DocumentTypes } from '/imports/db/platform/collections'

Template.toolDocuments.helpers({

	document_type: function() {
		return DocumentTypes.find({}, {sort: {index: 1}});
	},

});

Template.toolDocuments.events({

	"click #add-document-type": function(e) {
		e.preventDefault();

		$("#new-document-type-form").modal("show");

		return;
	},

	"click .edit-document-type": function(e) {
		e.preventDefault();

		//selecting the document type
		var doc_type_id = $(e.target).closest(".tab").attr("id");
		var doc_type = DocumentTypes.findOne({_id: doc_type_id});
		if (!doc_type)
			return;

		//assigning the document type name to the field
		var edit_field = $("#edit-document-type-name");
		edit_field.val(doc_type["name"]); 

		//adding the document type id to the form
		var form = $("#edit-document-type-form");
		form.attr("doc-id", doc_type_id);
		form.modal("show");

		return;
	},

	"click .remove-document-type": function(e) {
		e.preventDefault();

		var src = $(e.target);
		var doc_type_id = src.closest(".tab").attr("id");

		var list = {toolId: Session.get("toolId"),
					versionId: Session.get("toolVersionId"),
					id: doc_type_id,
				};

		Meteor.call("removeDocumentType", list, function(err) {
			if (err)
				console.log("Error in removeDocumentType callback", err);
		});

		return;
	},

});

Template.toolDocuments.rendered = function() {

	//adding sorting functionality to the document list 
    $("#document-types").sortable({              
		items: ".tab",

        stop: function(event, ui) {

		   	var el = $(ui.item[0]);
	    	var id = el.attr("id");
	        if (el.hasClass("tab")) {

	        	var before = ui.item.prev().get(0);
	        	var prev_index = -1;
	        	if (before)
	        		prev_index = $(before).attr("index");

	        	var params = {prevIndex: Number(prev_index),
	        				currentIndex: Number(el.attr("index")),
	        				documentTypeId: id,
	        				toolId: Session.get("toolId"),
	        				diagramTypeId: Session.get("targetDiagramType"),
	        				versionId: Session.get("toolVersionId"),
	        			};

	        	Meteor.call("updateDocumentTypeIndex", params, function(err) {
	        		if (err)
	        			console.log("Error in updateDocumentTypeIndex callback", err);
	        	});
	        }    
        },
    });

}

Template.newDocumentType.events({

	"click #insert-new-document-type": function(e) {
		e.preventDefault();

		$("#new-document-type-form").modal("hide");

		var list = {toolId: Session.get("toolId"),
					versionId: Session.get("toolVersionId"),
					name: $("#document-type-name").val(),
					index: DocumentTypes.find().count() + 1,
				};

		Meteor.call("addDocumentType", list, function(err) {
			if (err)
				console.log("Error in addDocumentType callback", err);
		});

		return;
	}
});

Template.editDocumentType.events({

	"click #edit-new-document-type": function(e) {
		e.preventDefault();

		var form = $("#edit-document-type-form");
		form.modal("hide");

		var src = $(e.target);
		var doc_type_id = form.attr("doc-id");

		var list = {toolId: Session.get("toolId"),
					versionId: Session.get("toolVersionId"),
					name: $("#edit-document-type-name").val(),
					id: doc_type_id,
				};

		Meteor.call("updateDocumentType", list, function(err) {
			if (err)
				console.log("Error in updateDocumentType callback", err);
		});

		return;
	}

});
