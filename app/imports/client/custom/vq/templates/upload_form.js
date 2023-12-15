import { Interpreter } from '/client/lib/interpreter'
import { Utilities } from '/client/js/platform/utilities/utils'

import './upload_form.html'

Interpreter.customMethods({

	UploadOntology: function() {
		$("#upload-ontology-form").modal("show");
	},
	
});

Template.uploadOntology.events({

	"click #ok-upload-ontology": function(e) {

		var fileList = $("#fileList")[0].files;
	    _.each(fileList, function(file) {

	        var reader = new FileReader();
	        reader.onload = function(event) {

	        	var list = {projectId: Session.get("activeProject"),
	        				versionId: Session.get("versionId"),
	                        data: JSON.parse(reader.result),
	                    };

	            //Utilities.callMeteorMethod("loadOntology", list);
	            Utilities.callMeteorMethod("loadOntology", list);
	        }

	        reader.onerror = function(error) {
	            console.error("Error: ", error);
	        }

	        reader.readAsText(file);
	    });
	},

});

Template.diagramTemplate.onRendered(function() {

	var list = {projectId: Session.get("activeProject"),
				versionId: Session.get("versionId"),
			};

	var ontology_handle = Meteor.subscribe("Ontology", list);
	this.ontologyHandle = new ReactiveVar(ontology_handle);
});


Template.diagramTemplate.onDestroyed(function() {
	if (this.ontologyHandle) {
		var ontology_handle = this.ontologyHandle.get();
		ontology_handle.stop();		
	}
});
