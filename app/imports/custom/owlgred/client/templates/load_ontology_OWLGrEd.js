import { Interpreter } from '../../../../client/lib/interpreter.js'
import { loadOntololgyN3OWLGrEd, loadOntololgyFromProjectN3OWLGrEd, loadOntololgyRDFLibOWLGrEd } from '../js/import_OWLGrEd.js'
import './load_ontology_OWLGrEd.html'

Template.loadOntologyOWLGrEd.fromDiagramm = new ReactiveVar("");

Interpreter.customMethods({
	loadOntologyOWLGrEd: function () {
		Template.loadOntologyOWLGrEd.fromDiagramm.set("true");
		$("#load-ontology-form-owlgred").modal("show");

	}
})


Template.loadOntologyOWLGrEd.helpers({
	fromDiagramm: function() {
		return Template.loadOntologyOWLGrEd.fromDiagramm.get();
	},
});


Template.loadOntologyOWLGrEd.events({

	"click #ok-load-ontology-owlgred": function(e) {
		var file = $("#ontologyfileList")[0].files[0];
		let name = file.name.replace(/\.[^/.]+$/, "");

		// console.log("file", file)
		var reader = new FileReader();

		reader.onload = function() {
			// console.log("reader.result", reader.result);
			loadOntololgyN3OWLGrEd(reader.result, name);
			// loadOntololgyRDFLibOWLGrEd(reader.result);
		}

		reader.onerror = function(error) {
			console.error("Error: ", error);
		}
		reader.readAsText(file);

		$("#load-ontology-form-owlgred").modal("hide");
		Template.loadOntologyOWLGrEd.fromDiagramm.set("");
		return;
	},

	"click #ok-load-ontology-from-project-owlgred": function(e) {
		var file = $("#ontologyfileList")[0].files[0];
		let name = file.name.replace(/\.[^/.]+$/, "");
		var reader = new FileReader();

		reader.onload = function() {
			// console.log(reader.result)
			loadOntololgyFromProjectN3OWLGrEd(reader.result, name);
			// console.log("END")
		}

		reader.onerror = function(error) {
			console.error("Error: ", error);
		}
		reader.readAsText(file);

		$("#load-ontology-form-owlgred").modal("hide");
		Template.loadOntologyOWLGrEd.fromDiagramm.set("");
		return;
	},


});
