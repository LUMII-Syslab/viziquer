
function generateFunctionalSyntax(onto){
	let ontology = onto.Ontology;
	let classes = onto.Class;
	let annotationProperties = onto.AnnotationProperty;
	let dataTypes = onto.DataType;
	let objectProperties = onto.ObjectProperty;
	let datatypeProperty = onto.DatatypeProperty;
	let namedIndividual = onto.NamedIndividual;
	let negativePropertyAssertion = onto.NegativePropertyAssertion;
	
	let functionaFyntaxOntology = [];
	
	for (const key of Object.keys(classes)) {
       for (const clazz of Object.keys(classes[key])) {
		   functionaFyntaxOntology.push(createFunctionalAxiom(classes[key][clazz]));   
		}
    }
	for (const key of Object.keys(annotationProperties)) {
       for (const annotationProperty of Object.keys(annotationProperties[key])) {
		   functionaFyntaxOntology.push(createFunctionalAxiom(annotationProperties[key][annotationProperty]));   
		}
    }
	for (const key of Object.keys(dataTypes)) {
       for (const dt of Object.keys(dataTypes[key])) {
		   functionaFyntaxOntology.push(createFunctionalAxiom(dataTypes[key][dt]));   
		}
    }
	for (const key of Object.keys(objectProperties)) {
       for (const op of Object.keys(objectProperties[key])) {
		   functionaFyntaxOntology.push(createFunctionalAxiom(objectProperties[key][op]));   
		}
    }
  for (const key of Object.keys(namedIndividual)) {
       for (const op of Object.keys(namedIndividual[key])) {
		   functionaFyntaxOntology.push(createFunctionalAxiom(namedIndividual[key][op]));   
		}
    }
	
	console.log("functionaFyntaxOntology", functionaFyntaxOntology.join("\n"));
}

function createFunctionalAxiom(axiomTable){
	let axiomString ="";
	let axiomsArray = [];
	if(typeof axiomTable.axiom !== "undefined"){
		if(axiomTable.axiom.length> 1){
			axiomString = axiomString + axiomTable.type  + "(";
			for(let ax = 0; ax < axiomTable.axiom.length; ax++){
				if(axiomTable.axiom[ax].length > 1 || typeof axiomTable.axiom[ax][0] !== "undefined"){
					for(let a = 0; a < axiomTable.axiom[ax].length; a++){
						axiomsArray.push(axiomString + createFunctionalAxiom(axiomTable.axiom[ax][a]) + " )")
					}
				} else axiomString = axiomString + createFunctionalAxiom(axiomTable.axiom[ax]) + " ";
			}
			axiomString = axiomString + ")";
		}
		else axiomString = axiomString + axiomTable.type  + "(" + createFunctionalAxiom(axiomTable.axiom) + ")";
		
	} else if(typeof axiomTable.IRI !== "undefined") axiomString = axiomString + "<"+axiomTable.IRI+">";
	else if(typeof axiomTable.axiomSymbol !== "undefined")  axiomString = axiomString + axiomTable.axiomSymbol +" ";
	else if(typeof axiomTable.value !== "undefined")  axiomString = axiomString + axiomTable.value;
	else if(typeof axiomTable.language !== "undefined" && axiomTable.language !== "")  {
		axiomString = axiomString.trimEnd() + "@" + axiomTable.language +" ";
	}
	if(axiomsArray.length>0) return axiomsArray.join("\n");
	return axiomString;
}

export {
}
