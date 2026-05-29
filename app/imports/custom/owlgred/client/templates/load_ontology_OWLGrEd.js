import { Template } from 'meteor/templating';
import { Interpreter } from '../../../../client/lib/interpreter.js'
import { loadOntololgyN3OWLGrEd, loadOntololgyFromProjectN3OWLGrEd, loadOntololgyRDFLibOWLGrEd, loadOntololgyFromProjectRDFLibOWLGrEd } from '../js/import_OWLGrEd.js'
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

	"click #ok-load-ontology-from-project-owlgred": function (e) {
	  var file = $("#ontologyfileList")[0].files[0];
	  let name = file.name.replace(/\.[^/.]+$/, "");
	  var reader = new FileReader();

	  reader.onload = function () {
		const text = reader.result;
		const ct = detectOwlFormat(file.name, text);

		if (isN3Family(ct)) {
		  loadOntololgyFromProjectN3OWLGrEd(text, name);
		} else if (isRDFlibFamily(ct)) {
		  loadOntololgyFromProjectRDFLibOWLGrEd(text, name);
		} else {
		  alert("Unsupported ontology format. Supported: Turtle/N3/N-Triples or RDF/XML or JSON-LD.");
		  console.error("Unsupported format. Detected:", ct);
		}
	  };

	  reader.onerror = function (error) {
		console.error("Error: ", error);
	  };

	  reader.readAsText(file);

	  $("#load-ontology-form-owlgred").modal("hide");
	  Template.loadOntologyOWLGrEd.fromDiagramm.set("");
	  return;
	},
	
	/*"click #ok-load-ontology-from-project-owlgred": function (e) {
	  var file = $("#ontologyfileList")[0].files[0];
	  let name = file.name.replace(/\.[^/.]+$/, "");
	  var reader = new FileReader();

	  reader.onload = function () {
		loadOntololgyFromProjectRDFLibOWLGrEd(reader.result, name);
	  };

	  reader.onerror = function (error) {
		console.error("Error: ", error);
	  };

	  reader.readAsText(file);

	  $("#load-ontology-form-owlgred").modal("hide");
	  Template.loadOntologyOWLGrEd.fromDiagramm.set("");
	  return;
	},*/


});


function detectOwlFormat(fileName, text) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();

  // --- 1) extension-based ---
  const extMap = {
    ttl:  "text/turtle",
    trig: "application/trig",
    n3:   "text/n3",
    nt:   "application/n-triples",
    rdf:  "application/rdf+xml",
    owl:  "application/rdf+xml",
    xml:  "application/rdf+xml",
    json: "application/ld+json",
    jsonld: "application/ld+json",
  };
  if (extMap[ext]) return extMap[ext];

  // --- 2) content sniffing fallback ---
  const s = (text || "").trimStart();

  // JSON-LD usually starts with { or [
  if (s.startsWith("{") || s.startsWith("[")) return "application/ld+json";

  // RDF/XML starts with < and contains rdf:RDF or owl:Ontology etc.
  if (s.startsWith("<") && /<\s*(rdf:RDF|owl:Ontology|rdf:Description)\b/i.test(s)) {
    return "application/rdf+xml";
  }

  // Turtle/N3 markers
  if (/(^|\s)@prefix\s+/i.test(s) || /(^|\s)prefix\s+/i.test(s) ||
      /(^|\s)@base\s+/i.test(s)   || /(^|\s)base\s+/i.test(s) ||
      /(^|\s)\w*:\w+\s+\w*:\w+/i.test(s) || /\ba\s+owl:Class\b/.test(s)) {
    // could be ttl/n3/trig/nt – but for your routing, "n3-family" is enough
    return "text/turtle";
  }

  // N-Triples often has lines like: <s> <p> <o> .
  if (/^\s*<[^>]+>\s+<[^>]+>\s+(.+)\s+\.\s*$/m.test(text)) {
    return "application/n-triples";
  }

  return "unknown";
}

function isN3Family(ct) {
  return ct === "text/turtle" || ct === "text/n3" || ct === "application/n-triples" || ct === "application/trig";
}
function isRDFlibFamily(ct) {
  return ct === "application/rdf+xml" || ct === "application/ld+json";
}