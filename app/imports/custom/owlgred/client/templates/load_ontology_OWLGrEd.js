import { Interpreter } from '../../../../client/lib/interpreter.js'
import { loadOntololgyN3OWLGrEd, loadOntololgyRDFLibOWLGrEd } from '../js/import_OWLGrEd.js'
import './load_ontology_OWLGrEd.html'

Interpreter.customMethods({
	loadOntologyOWLGrEd: function () {
		console.log("ggggggggggggggggggg")
		$("#load-ontology-form-owlgred").modal("show");

	}
})


Template.loadOntologyOWLGrEd.helpers({

});


Template.loadOntologyOWLGrEd.events({

	"click #ok-load-ontology-owlgred": function(e) {
		var file = $("#projectfileList")[0].files[0]

		console.log("file", file)
		var reader = new FileReader();

		reader.onload = function() {
			console.log("reader.result", reader.result);
			loadOntololgyN3OWLGrEd(reader.result);
			// loadOntololgyRDFLibOWLGrEd(reader.result);
		}

		reader.onerror = function(error) {
			console.error("Error: ", error);
		}
		reader.readAsText(file);

		$("#load-ontology-form-owlgred").modal("hide");
		return;
	},


});
