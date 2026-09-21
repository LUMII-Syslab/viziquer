import { Interpreter } from '/imports/client/lib/interpreter'
import { Utilities } from '/imports/platform/client/js/utilities/utils.js'
import { Elements, ElementTypes, Diagrams } from '/imports/db/platform/collections'
import { Dialog } from '/imports/platform/client/js/interpretator/Dialog'
import * as class_expression_grammar_parser_OWLGrEd from '/imports/custom/owlgred/client/js/class_expression_grammar_parser_OWLGrEd.js'
import * as data_range_grammar_parser_OWLGrEd from '/imports/custom/owlgred/client/js/data_range_grammar_parser_OWLGrEd.js'
import * as export_grammar_parser_OWLGrEd from '/imports/custom/owlgred/client/js/export_grammar_parser_OWLGrEd.js'
import { Create_OWLGrEd_Element } from './OWLGrEd_Element.js';
import { saveOntologyInFormatOwlgred } from './export_OWLGrEd.js';
import {generateN3Syntax} from '/imports/custom/owlgred/client/js/export_N3_OWLGrEd.js'

let generateAxiom = true;
let source = null;
let count = 0;
let namespaceTable = {}

Interpreter.customMethods({

  saveOntologyAsShaclOwlgred: async function(){
	  let ontology = await saveOntologyInSHACLFormatOwlgred();
	  // let ontology = await saveOntologyInFormatOwlgred();
	  // console.log("OOOOOOOOOO", ontology) 
	  generateSHACLRDFLibSyntax(ontology, "text/turtle");
  },
  
});





function generateSHACLRDFLibSyntax(onto,format){

	const cleanObject = JSON.parse(JSON.stringify(onto));
	Meteor.call('generateShaclRDFLib', onto, namespaceTable, format, (err, result) => {
	  if (err) {
		  console.error('Error generating:', err);
		  return;
		}
		// Trigger browser download
		const filename = guessFilename(onto, format);
		const mime = mimeForFormat(format);
		downloadTextAsFile(result, filename, mime);
	});
}

function downloadTextAsFile(text, filename, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function guessFilename(onto, format) {
  // Try to extract ontology IRI or fallback name
  const iri = (onto && (onto.iri || onto.IRI || onto.ontologyIRI || onto.name)) || 'ontology';
  const localName = iri.split(/[\/#]/).filter(Boolean).pop() || 'ontology';

  // Pick file extension by RDF serialization format
  const extMap = {
    'text/turtle': 'ttl',
    'application/rdf+xml': 'owl',
    'application/n-triples': 'nt',
    'text/n3': 'n3',
    'application/ld+json': 'jsonld'
  };

  const ext = extMap[format] || 'owl'; // default fallback
  return `${localName}.${ext}`;
}

function mimeForFormat(format) {
  const mimeMap = {
    'text/turtle': 'text/turtle;charset=utf-8',
    'application/rdf+xml': 'application/rdf+xml;charset=utf-8',
    'application/n-triples': 'application/n-triples;charset=utf-8',
    'text/n3': 'text/n3;charset=utf-8',
    'application/ld+json': 'application/ld+json;charset=utf-8'
  };

  return mimeMap[format] || 'application/octet-stream';
}



async function saveOntologyInSHACLFormatOwlgred(){
	generateAxiom = true;
	namespaceTable = {};
	let ontology = {
			"Ontology": {},
			"Class": {},
			"Classifier": {},
			"ObjectProperty": {},
			"DataProperty": [],
			"DatatypeProperty": {},
			"AnnotationProperty": {},
			"NamedIndividual": {},
			"NegativePropertyAssertion": {},
			"DataType": {},
			"SHACL": {
				"NodeShape": {},
				"PropertyShape": {}
			},
	};


	var diagramId = Session.get("activeDiagram");
	let diagram = Diagrams.findOne({_id:Session.get("activeDiagram")});
	ontology.name = diagram.name;
	var active_diagram_type_id = diagram["diagramTypeId"];
    //get prefix - namespace declarations
    const elem_type_namespaces = ElementTypes.findOne({name:"Namespaces", diagramTypeId:active_diagram_type_id});
    const elem_namespace = Elements.find({diagramId:diagramId, elementTypeId: elem_type_namespaces["_id"]}).map(function(e) {
      return e["_id"]
    });

    for(let namespaceElem = 0; namespaceElem < elem_namespace.length; namespaceElem++){

      const elemOWLGrEd = await Create_OWLGrEd_Element(elem_namespace[namespaceElem]);
      const dafaultNamespace = await elemOWLGrEd.getCompartmentValue("Dafault Namespace") || "http://owlgred.lumii.lv/web/2026#";
      if(dafaultNamespace) ontology.Ontology.iri = dafaultNamespace;
      if(typeof dafaultNamespace !== "undefined" && dafaultNamespace !== null && dafaultNamespace !== "")namespaceTable[":"]=dafaultNamespace;
      const namespaces = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Namespaces declarations",  [{title:"Prefix",name:"Prefix"},
        {title:"Namespace",name:"Namespace"}]);
       for(let ns = 0; ns < namespaces.length; ns++){
         if(namespaces[ns]["Prefix"] !== "" && namespaces[ns]["Namespace"] !== "")namespaceTable[namespaces[ns]["Prefix"]]=namespaces[ns]["Namespace"];
       }
    }
	if(elem_namespace.length === 0){
		ontology.Ontology.iri = "http://owlgred.lumii.lv/web/2026#";
		namespaceTable[":"]="http://owlgred.lumii.lv/web/2026#";
	}
	namespaceTable["ex"]="http://lumii.lv/2011/1.0/extended#";
	let elem_type = ElementTypes.find({diagramTypeId:active_diagram_type_id})
		.map(function(e) {
		  return {name: e.name, id: e["_id"], exportAxioms : e["exportAxioms"]}
	});
	
	let elemTypeClass = ElementTypes.findOne({name:"Class", diagramTypeId:active_diagram_type_id});
	//find classes
	let elemsClasses = Elements.find({diagramId:diagramId, elementTypeId:elemTypeClass["_id"]}).map(function(e) {
		return e["_id"]
	});

	for(let elem = 0; elem < elemsClasses.length; elem++){
		const elemOWLGrEd = await Create_OWLGrEd_Element(elemsClasses[elem]);
		let className = await elemOWLGrEd.getCompartmentValue("Name");
		if(!className){
			const equivalentClasses = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("EquivalentClasses");
			if(equivalentClasses.length> 0) className = equivalentClasses[0].EquivalentClass;
		}
		
		let shape =  await elemOWLGrEd.getCompartmentValue("Shape");
		let cName = className;
		if(className !== ""){
			ontology.Class[className] = [];
		} else if(shape){
			ontology.Class[shape] = [];
			cName = shape;
		}
		//SHACL
		
		if(shape && className && className !== "") ontology.Class[cName].push({"shape_name": shape, "IRI": await getFullName(cName) });
		else if(shape) ontology.Class[cName].push({"shape_name": shape});
		else {ontology.Class[cName].push({"shape_name": cName+"_shape", "IRI": await getFullName(cName) })};
		
	}
	
	elemTypeClass = ElementTypes.findOne({name:"Classifier", diagramTypeId:active_diagram_type_id});
	//find classes
	elemsClasses = Elements.find({diagramId:diagramId, elementTypeId:elemTypeClass["_id"]}).map(function(e) {
		return e["_id"]
	});

	for(let elem = 0; elem < elemsClasses.length; elem++){
		const elemOWLGrEd = await Create_OWLGrEd_Element(elemsClasses[elem]);
		let className = await elemOWLGrEd.getCompartmentValue("Name");
		const exportMode = await elemOWLGrEd.getCompartmentValue("ExportMode");
		
		if(className) ontology.Classifier[className] = exportMode;
	}
	
	for(let elemType = 0; elemType < elem_type.length; elemType++){

		if(typeof elem_type[elemType]["exportAxioms"] !== "undefined"){

			// parse all elemType export axioms to one array
			let parsedExportAxioms = [];
			const stringAxioms = elem_type[elemType]["exportAxioms"];

			if (stringAxioms.length > 0 && stringAxioms[0] !== "") {
				for(let stringAxiom = 0; stringAxiom < stringAxioms.length; stringAxiom++){
					let parsed_exp = export_grammar_parser_OWLGrEd.parse(stringAxioms[stringAxiom], {});
					parsedExportAxioms.push(parsed_exp);
				}
			}
			//find elements with elemType
			const elems = Elements.find({diagramId:diagramId, elementTypeId:elem_type[elemType]["id"]}).map(function(e) {
				return e["_id"]
			});

			for(let elem = 0; elem < elems.length; elem++){
				generateAxiom = true;
				const elemOWLGrEd = await Create_OWLGrEd_Element(elems[elem]);
				let ontologyObject;
				if(elem_type[elemType]["name"] === "Class"){
					let className = await elemOWLGrEd.getCompartmentValue("Name");
					if(!className){
						const equivalentClasses = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("EquivalentClasses");
						if(equivalentClasses.length> 0) className = equivalentClasses[0].EquivalentClass;
					}
					ontologyObject = createExportStructureElement(ontology, "Class", className);
				}else if(elem_type[elemType]["name"] === "Generalization") {
					const subclass = await getElementsFromPath(["start"], elemOWLGrEd);
					let className = await subclass.getCompartmentValue("Name");
					if(!className){
						const equivalentClasses = await subclass.getMultiCompartmentSubCompartmentValues("EquivalentClasses");
						if(equivalentClasses.length> 0) className = equivalentClasses[0].EquivalentClass;
					}
					
					ontologyObject = createExportStructureElement(ontology, "Class", className);
				}else if(elem_type[elemType]["name"] === "GeneralizationProperty") {
					const subclass = await getElementsFromPath(["start"], elemOWLGrEd);
					let className = await subclass.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "ObjectProperty", className);
				}else if(elem_type[elemType]["name"] === "AssocToFork" || elem_type[elemType]["name"] === "ComplementOf" || elem_type[elemType]["name"] === "Disjoint" || elem_type[elemType]["name"] === "EquivalentClass") {
					const subclass = await getElementsFromPath(["start"], elemOWLGrEd);
					let className = await subclass.getCompartmentValue("Name");
					if(!className){
						const equivalentClasses = await subclass.getMultiCompartmentSubCompartmentValues("EquivalentClasses");
						if(equivalentClasses.length> 0) className = equivalentClasses[0].EquivalentClass;
					}
					ontologyObject = createExportStructureElement(ontology, "Class", className);

				}else if(elem_type[elemType]["name"] === "HorizontalFork") {
					// const subclass = await getElementsFromPath(["start", "end"], elemOWLGrEd);
					// const className = await subclass.getCompartmentValue("Name");
					// ontologyObject = createExportStructureElement(ontology, "Class", className);

					// let disjointComplete = await getHorizontalForkDisjointComplete(elemOWLGrEd, subclass.obj._id);
					// const disjoint = await elemOWLGrEd.getCompartmentValue("Disjoint");
					// const complete = await elemOWLGrEd.getCompartmentValue("Complete");

					// if(disjointComplete.length > 1){
						// if(disjoint){
							// let disjointObject = {type: "DisjointClasses", axiom : []}
							// for(let d = 0; d < disjointComplete.length; d++){
								// let disName = await disjointComplete[d].getCompartmentValue("Name");
								// disName = await getFullName(disName);
								// disjointObject.axiom.push({IRI: disName});
							// }
							// ontologyObject.push(disjointObject);
						// }
						// if(complete){

						// }
					// }
				}else if(elem_type[elemType]["name"] === "Association" || elem_type[elemType]["name"] === "ObjectProperty"){
					//Annotations
					const name = await elemOWLGrEd.getCompartmentValue("Name");

					ontologyObject = createExportStructureElement(ontology, "ObjectProperty", name);

					if(elem_type[elemType]["name"] === "ObjectProperty"){

						// let reifiedProperty = await getFullName(name);
						// let subject = await getElementsFromPath(["end","start"], elemOWLGrEd);
						// let object = await getElementsFromPath(["start", "end"], elemOWLGrEd);
						// const subjectName = await getFullName(await subject.getCompartmentValue("Name"));
						// const objectName = await getFullName(await object.getCompartmentValue("Name"));
						// let embeddesTripleString = "'<<" + subjectName + " " + reifiedProperty + " " + objectName + ">>'";

						// let annotations = await getRDFStatements(elemOWLGrEd);

						// let rdfStatementAxiom = {
						  // "type": "AnnotationAssertion",
							// "axiom":[
							// {"axiomSymbol": "rdf:reifies"},
							// {"IRI": reifiedProperty},
							// {"value": embeddesTripleString},
							// {"annotations": annotations}
						  // ]
						// }
						// ontologyObject.push(rdfStatementAxiom);
					}

				} else if(elem_type[elemType]["name"] === "AnnotationProperty"){
					const className = await elemOWLGrEd.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "AnnotationProperty", className);
				}else if(elem_type[elemType]["name"] === "DataType"){
					const className = await elemOWLGrEd.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "DataType", className);
				}else if(elem_type[elemType]["name"] === "ObjectList"){
					const className = await elemOWLGrEd.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "NamedIndividual", className);
				}else if(elem_type[elemType]["name"] === "Object"){
					const className = await elemOWLGrEd.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "NamedIndividual", className);
				}else if(elem_type[elemType]["name"] === "InstanceOf" || elem_type[elemType]["name"] === "SameAsIndivid" || elem_type[elemType]["name"] === "DifferentIndivid"){
					const subclass = await getElementsFromPath(["start"], elemOWLGrEd);
					const className = await subclass.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "NamedIndividual", className);
				} else if(elem_type[elemType]["name"] === "DataProperty"){
					let path = ["end", "start"];
					let clazz = await getElementsFromPath(path, elemOWLGrEd);
					let className;
					if(clazz) className = await clazz.getCompartmentValue("Name");
					else {
						className = await elemOWLGrEd.getCompartmentValue("Domain");
						if(!className)className = "Thing";
					}
					ontologyObject = createExportStructureElement(ontology, "Class", className);
				}else if(elem_type[elemType]["name"] === "Classifier"){
					const exportMode = await elemOWLGrEd.getCompartmentValue("ExportMode");
					if(exportMode === "Datatype_enumeration"){
						const className = await elemOWLGrEd.getCompartmentValue("Name");
						ontologyObject = createExportStructureElement(ontology, "DataType", className);
					} else if(exportMode === "Individual_enumeration"){
						const className = await elemOWLGrEd.getCompartmentValue("Name");
						ontologyObject = createExportStructureElement(ontology, "Class", className);
					} else if(exportMode === "Individual_enumeration_SKOS"){
						const className = await elemOWLGrEd.getCompartmentValue("Name");
						ontologyObject = createExportStructureElement(ontology, "Class", className);
					} else if(exportMode === "SKOS_vocabulary"){
						// const className = await elemOWLGrEd.getCompartmentValue("Name");
						// ontologyObject = createExportStructureElement(ontology, "Class", className);
					}

					// ontologyObject = createExportStructureElement(ontology, "NamedIndividual", className);
				}

				for(let axiom = 0; axiom < parsedExportAxioms.length; axiom++){
					source = elems[elem];
					generateAxiom = true;
					let axiomString = await concatAxiom(parsedExportAxioms[axiom], "", {}, elemOWLGrEd);
					ontologyObject.push(axiomString)
				}
				
				if(elem_type[elemType]["name"] === "Classifier"){


				} else if(elem_type[elemType]["name"] === "Class"){
					let className = await elemOWLGrEd.getCompartmentValue("Name");
					
					let shape = await elemOWLGrEd.getCompartmentValue("Shape");
					let shapeName = shape || className+"_shape";
					let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
					
					ontology.SHACL.NodeShape[shapeNameFull] = {
						name: shapeName,
						IRI: shapeNameFull
					};
					
					if(className && className !== ""){
						ontology.SHACL.NodeShape[shapeNameFull]["owlClass"] = {
							name: className,
							IRI: await getFullName(className)
						}
					}
					
					const equivalentClasses = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("EquivalentClasses", [{title:"EquivalentClass",name:"EquivalentClass"}]);
					if(!className){
						if(equivalentClasses.length> 0) className = equivalentClasses[0].EquivalentClass;
					}
					
					//DISJOINT CLASSES
					const disjointClasses = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("DisjointClasses", [{title:"DisjointClass",name:"DisjointClass"}]);
					if(disjointClasses){
						
						ontology.SHACL.NodeShape[shapeNameFull].disjoint = [];

						for(let axiom = 0; axiom < disjointClasses.length; axiom++){
							ontology.SHACL.NodeShape[shapeNameFull].disjoint.push(await getFullName(disjointClasses[axiom].DisjointClass));
						}
					}
					// subClasses
					const superClasses = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("SuperClasses", [{title:"SuperClass",name:"SuperClass"}]);
					if(superClasses){
						
						ontology.SHACL.NodeShape[shapeNameFull].superClass = [];

						for(let axiom = 0; axiom < superClasses.length; axiom++){
							ontology.SHACL.NodeShape[shapeNameFull].superClass.push(await getFullName(superClasses[axiom].SuperClass));
						}
					}
					

					// Annotations

					const annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Annotation",  [{title:"AnnotationType",name:"AnnotationType"},
					{title:"Value",name:"Value"},
					{title:"Language",name:"Language"}]);
					if(annotations){
						ontology.SHACL.NodeShape[shapeNameFull].annotations = [];
						for(let axiom = 0; axiom < annotations.length; axiom++){
							const annotationType = await getAnnotationPropertyNameSHACL(annotations[axiom]["AnnotationType"]);
							ontology.SHACL.NodeShape[shapeNameFull].annotations.push({
									"annotationType": annotationType,
									"value": annotations[axiom]["Value"],
									"language":annotations[axiom]["Language"]
							})
						}
						
					}
					
					//Comment
					let comment = await elemOWLGrEd.getCompartmentValue("Comment");
					if(comment && comment !==""){
						if(!ontology.SHACL.NodeShape[shapeNameFull].annotations) ontology.SHACL.NodeShape[shapeNameFull].annotations = [];
						const annotationType = await getAnnotationPropertyNameSHACL("comment");
						ontology.SHACL.NodeShape[shapeNameFull].annotations.push({
							"annotationType": annotationType,
							"value": comment,
							"language":""
						})
					}
					
					//Attributes SHACL
					const attributes = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Attributes",  [{title:"Name",name:"Name"},
					{title:"Type",name:"Type"},
					{title:"Multiplicity",name:"Multiplicity"},
					{title:"Annotation",name:"Annotation"},
					{title:"IsFunctional",name:"IsFunctional"},
					{title:"EquivalentProperties",name:"EquivalentProperties"},
					{title:"SuperProperties",name:"SuperProperties"},
					{title:"DisjointProperties",name:"DisjointProperties"},
					{title:"Language",name:"Language"}]);


					for(let axiom = 0; axiom < attributes.length; axiom++){

						const attribute = attributes[axiom];
						const attribuyeType = attribute.Type;
						let propertyType = "Data";
						if(typeof ontology.Class[attribuyeType] !== "undefined" || 
						(typeof ontology.Classifier[attribuyeType] !== "undefined" && ontology.Classifier[attribuyeType] !== "Datatype enumeration (DataOneOf)")) propertyType = "Object";
						
						const attrName = await getFullName(attribute.Name);
						
						let propertyShapeName = (className || shape)+"_"+attribute.Name
						let propertyShapeNameFull = "http://www.w3.org/ns/shacl_local#"+propertyShapeName;
						ontology.SHACL.PropertyShape[propertyShapeNameFull] = {
							name: propertyShapeName,
							IRI: propertyShapeNameFull,
							owlProperty: {
								name: attribute.Name,
								IRI: attrName,
								kind: "DatatypeProperty"
							},
							domain: {
								name: className,
								IRI: (await getFullName(className || "")) || null,
								nodeShapeIRI: shapeNameFull
							},
							range: {
								kind: "datatype",
								name: attribute.Type,
								IRI: await getTypeExpression((attribute.Type || ""), ontology)
							},

						}
						
						// Multiplicity
						if(attribute.Multiplicity){
							let multiplicity = getMultiplicity(attribute.Multiplicity);
							ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity = {};
							if(multiplicity.type === "max") ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.value;
							if(multiplicity.type === "min") ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.value;
							if(multiplicity.type === "exact") {
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.value;
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.value;
							}
							if(multiplicity.type === "range") {
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.max;
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.min;
							}
						}

						// Functional Property
						if(attribute.IsFunctional === "true" || attribute.IsFunctional === true){
							if(!ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity || !ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount){
								if(!ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity) ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity = {};
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = 1;
							}
						}

						// Equivalent Properties
						let properties = JSON.parse(attributes[axiom].EquivalentProperties);
						if (properties && properties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].equals = [];
							for(let prop = 0; prop < properties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].equals.push(await getFullName(properties[prop].value));
							}
						}

						// Disjoint Properties
						properties = JSON.parse(attributes[axiom].DisjointProperties);
						if (properties && properties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].disjoint = [];
							for(let prop = 0; prop < properties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].disjoint.push(await getFullName(properties[prop].value));
							}
						}

						// Sub Properties
						properties = JSON.parse(attributes[axiom].SuperProperties);
						if (properties && properties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].subsetof = [];
							for(let prop = 0; prop < properties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].subsetof.push(await getFullName(properties[prop].value));
							}
						}

						// Annotations
						properties = JSON.parse(attributes[axiom].Annotation);
						if (properties && properties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].annotations = [];
							for(let prop = 0; prop < properties.length; prop++){
								const annotationType = await getAnnotationPropertyNameSHACL(properties[prop]["annotationType"]);
								ontology.SHACL.PropertyShape[propertyShapeNameFull].annotations.push({
									"annotationType": annotationType,
									"value": properties[prop]["value"],
									"language":properties[prop]["language"]
								})
							}
						}
					}
					
					const classIndividuals = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Individuals", [{title:"Individual",name:"Individual"}]);

					for(let axiom = 0; axiom < classIndividuals.length; axiom++){

						let individualProperties = JSON.parse(classIndividuals[axiom].Individual);
						
						
						const IndividualName = individualProperties[0].value;
						ontologyObject = createExportStructureElement(ontology, "NamedIndividual", IndividualName);
						ontologyObject.push({
							"type": "Declaration",
							"axiom": {
								"type": "NamedIndividual",
								"axiom": {
									"IRI": await getFullName(IndividualName)
								}
							}
						})
						ontologyObject.push(
						{
							"type": "ClassAssertion",
							"axiom": [
								{
									"IRI": await getFullName(className)
								},
								{
									"IRI": await getFullName(IndividualName)
								}
							]
						})
						
						// DataPropertyAssertion
						for(let axiom = 1; axiom < individualProperties.length; axiom++){
							let annotationObject = {};
							annotationObject.type = "DataPropertyAssertion";
							annotationObject.axiom = [];
							const PropertyName = await getFullName(individualProperties[axiom]["name"]);

							annotationObject.axiom.push({IRI: PropertyName})
							annotationObject.axiom.push({IRI: await getFullName(IndividualName)})
							annotationObject.axiom.push({value: individualProperties[axiom]["value"]})
							// annotationObject.axiom.push({type: await getTypeExpression(DataPropertyAssertion[axiom]["Type"], ontology)})
							ontologyObject.push(annotationObject);
						}
					}
					
				} else if(elem_type[elemType]["name"] === "Generalization"){
					let start = await getElementsFromPath(["start"], elemOWLGrEd);
					let end = await getElementsFromPath(["end"], elemOWLGrEd);
					
					let className = await start.getCompartmentValue("Name");
					let superClassName = await end.getCompartmentValue("Name");
					
					let shape = await start.getCompartmentValue("Shape");
					let shapeName = shape || className+"_shape";
					let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
					
					if(!ontology.SHACL.NodeShape[shapeNameFull].superClass)ontology.SHACL.NodeShape[shapeNameFull].superClass = [];
					ontology.SHACL.NodeShape[shapeNameFull].superClass.push(await getFullName(superClassName))
					
				} else if(elem_type[elemType]["name"] === "AnnotationProperty"){
					const propertyName = await elemOWLGrEd.getCompartmentValue("Name");
					const domainName = await elemOWLGrEd.getCompartmentValue("Domain");
					const rangeName = await elemOWLGrEd.getCompartmentValue("Range");
					
					
					if(domainName){
						ontology.SHACL.NodeShape["http://www.w3.org/ns/shacl_local#"+propertyName+"_domain"]= {
							IRI:"http://www.w3.org/ns/shacl_local#"+propertyName+"_domain",
							targetSubjectsOf:await getFullName(propertyName || ""),
							class: {
								kind: "class",
								name: domainName,
								IRI: (await getFullName(domainName || "")) || null
							},
						}
					}					
					
					ontologyObject = createExportStructureElement(ontology, "AnnotationProperty", propertyName);
					const annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Annotation",  [{title:"AnnotationType",name:"AnnotationType"},
					{title:"Value",name:"Value"},
					{title:"Language",name:"Language"}]);

					for(let axiom = 0; axiom < annotations.length; axiom++){
						let annotationObject = {};
						annotationObject.type = "AnnotationAssertion";
						annotationObject.axiom = [];
						const annotationType = await getAnnotationPropertyName(annotations[axiom]["AnnotationType"]);
						annotationObject.axiom.push({axiomSymbol: annotationType})

						annotationObject.axiom.push({IRI: await getFullName(propertyName)})
						annotationObject.axiom.push({value: annotations[axiom]["Value"]})
						annotationObject.axiom.push({language: annotations[axiom]["Language"]})
						ontologyObject.push(annotationObject);
					}
				} else if(elem_type[elemType]["name"] === "DataType"){
					const className = await elemOWLGrEd.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "DataType", className);
					// Annotations
					const annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Annotation",  [{title:"AnnotationType",name:"AnnotationType"},
					{title:"Value",name:"Value"},
					{title:"Language",name:"Language"}]);

					for(let axiom = 0; axiom < annotations.length; axiom++){
						let annotationObject = {};
						annotationObject.type = "AnnotationAssertion";
						annotationObject.axiom = [];
						const annotationType = await getAnnotationPropertyName(annotations[axiom]["AnnotationType"]);
						annotationObject.axiom.push({axiomSymbol: annotationType})

						annotationObject.axiom.push({IRI: await getFullName(className)})
						annotationObject.axiom.push({value:  annotations[axiom]["Value"]})
						annotationObject.axiom.push({language: annotations[axiom]["Language"]})
						ontologyObject.push(annotationObject);
					}

					//DataTypeDefinition
					const datatypeDefinition = await elemOWLGrEd.getCompartmentValue("DataTypeDefinition");
					if(datatypeDefinition){
						let annotationObject = {};
						annotationObject.type = "DataTypeDefinition";
						annotationObject.axiom = [];						
						annotationObject.axiom.push({IRI: await getFullName(className)})
						annotationObject.axiom.push({type: await getTypeExpression(datatypeDefinition, ontology)})
						ontologyObject.push(annotationObject);
					}

				} else if(elem_type[elemType]["name"] === "ObjectList"){
					
					const className = await elemOWLGrEd.getCompartmentValue("ClassName");
					ontologyObject = createExportStructureElement(ontology, "NamedIndividual", className);
					const individuals = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Individuals");
					for(let axiom = 0; axiom < individuals.length; axiom++){
						let individual =  JSON.parse(individuals[axiom].Individual);

						for(let i = 0; i < individual.length; i++){
							let ind = individual[i];
							if(ind.id === "IRI"){
							  let annotationObject = {
								"type": "Declaration",
								"axiom": {
									"type": "NamedIndividual",
									"axiom": {
										"IRI": await getFullName(ind.value)
									}
								}
							  }
							  ontologyObject.push(annotationObject);
							  
							  
							  annotationObject = {
								"type": "ClassAssertion",
								"axiom": [
									{"IRI": await getFullName(className)},
									{"IRI": await getFullName(ind.value)}
								]
							  }
							  ontologyObject.push(annotationObject);
							} else if(ind.id.endsWith("_out")){
								let annotationObject = {
									"type": "ObjectPropertyAssertion",
									"axiom": [
										{"IRI": await getFullName(ind.name)},
										{"IRI": await getFullName(className)},
										{"IRI": await getFullName(ind.value)}
									]
								}
								ontologyObject.push(annotationObject);
							} else {
								let annotationObject = {
									"type": "DataPropertyAssertion",
									"axiom": [
										{"IRI": await getFullName(ind.name)},
										{"IRI":  await getFullName(className)},
										{"value": ind.value}
									]
								}
								ontologyObject.push(annotationObject);
							}
						}
					}
					
				} else if(elem_type[elemType]["name"] === "Object"){
					
					const instanceName = await elemOWLGrEd.getCompartmentValue("Name");
					const className = await elemOWLGrEd.getCompartmentValue("ClassName");
					
					let instanceShapeName = instanceName+"_shape";
					let instanceShapeNameFull = "http://www.w3.org/ns/shacl_local#"+instanceShapeName;
						
						
					ontology.SHACL.NodeShape[instanceShapeNameFull] = {
							name: instanceName,
							IRI: instanceShapeNameFull,
							Instance: {
								IRI : await getFullName(instanceName)
							},
					};
						
					if(className && className !== ""){
						ontology.SHACL.NodeShape[instanceShapeNameFull]["Instance"]["onClass"] = await getFullName(className);
					}
						
					const DataPropertyAssertion = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("DataPropertyAssertion");
					if(DataPropertyAssertion){
					  ontology.SHACL.NodeShape[instanceShapeNameFull]["Instance"]["Properties"] = [];
					  for(let axiom = 0; axiom < DataPropertyAssertion.length; axiom++){
						
						ontology.SHACL.NodeShape[instanceShapeNameFull]["Instance"]["Properties"].push(
						{
							path: await getFullName(DataPropertyAssertion[axiom]["Property"]),
							hasValue: DataPropertyAssertion[axiom]["Value"],
							type: await getTypeExpression((DataPropertyAssertion[axiom]["Type"] || ""), ontology)
						})
					  }
					}
					
					

					//Annotations
					const annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Annotation",  [{title:"AnnotationType",name:"AnnotationType"},
					{title:"Value",name:"Value"},
					{title:"Language",name:"Language"}]);

					if(annotations){
						ontology.SHACL.NodeShape[instanceShapeNameFull].annotations = [];
						for(let axiom = 0; axiom < annotations.length; axiom++){
							const annotationType = await getAnnotationPropertyNameSHACL(annotations[axiom]["AnnotationType"]);
							ontology.SHACL.NodeShape[instanceShapeNameFull].annotations.push({
									"annotationType": annotationType,
									"value": annotations[axiom]["Value"],
									"language":annotations[axiom]["Language"]
							})
						}
						
					}	
					
					//Comment
					let comment = await elemOWLGrEd.getCompartmentValue("Comment");
					if(comment && comment !==""){
						if(!ontology.SHACL.NodeShape[instanceShapeNameFull].annotations) ontology.SHACL.NodeShape[instanceShapeNameFull].annotations = [];
						const annotationType = await getAnnotationPropertyNameSHACL("comment");
						ontology.SHACL.NodeShape[instanceShapeNameFull].annotations.push({
							"annotationType": annotationType,
							"value": comment,
							"language":""
						})
					}

					/*
					
					ontologyObject = createExportStructureElement(ontology, "NamedIndividual", className);
					// DataPropertyAssertion
					const DataPropertyAssertion = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("DataPropertyAssertion");
					const NegativeDataPropertyAssertion = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("NegativeDataPropertyAssertion");

					for(let axiom = 0; axiom < DataPropertyAssertion.length; axiom++){
						let annotationObject = {};
						annotationObject.type = "DataPropertyAssertion";
						annotationObject.axiom = [];
						const PropertyName = await getFullName(DataPropertyAssertion[axiom]["Property"]);

						annotationObject.axiom.push({IRI: PropertyName})
						annotationObject.axiom.push({IRI: await getFullName(className)})
						annotationObject.axiom.push({value: DataPropertyAssertion[axiom]["Value"]})
						annotationObject.axiom.push({type: await getTypeExpression(DataPropertyAssertion[axiom]["Type"], ontology)})
						ontologyObject.push(annotationObject);
					}

					for(let axiom = 0; axiom < NegativeDataPropertyAssertion.length; axiom++){
						let annotationObject = {};
						annotationObject.type = "NegativeDataPropertyAssertion";
						annotationObject.axiom = [];
						const PropertyName = await getFullName(NegativeDataPropertyAssertion[axiom]["Property"]);

						annotationObject.axiom.push({IRI: PropertyName})
						annotationObject.axiom.push({IRI: await getFullName(className)})
						annotationObject.axiom.push({value: NegativeDataPropertyAssertion[axiom]["Value"]})
						annotationObject.axiom.push({type: await getTypeExpression(NegativeDataPropertyAssertion[axiom]["Type"], ontology)})
						ontologyObject.push(annotationObject);
					}

					//Annotations
					const annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Annotation",  [{title:"AnnotationType",name:"AnnotationType"},
					{title:"Value",name:"Value"},
					{title:"Language",name:"Language"}]);

					for(let axiom = 0; axiom < annotations.length; axiom++){
						let annotationObject = {};
						annotationObject.type = "AnnotationAssertion";
						annotationObject.axiom = [];
						const annotationType = await getAnnotationPropertyName(annotations[axiom]["AnnotationType"]);
						annotationObject.axiom.push({axiomSymbol: annotationType})

						annotationObject.axiom.push({IRI: await getFullName(className)})
						annotationObject.axiom.push({value: annotations[axiom]["Value"]})
						annotationObject.axiom.push({language: annotations[axiom]["Language"]})
						ontologyObject.push(annotationObject);
					}*/
				} else if(elem_type[elemType]["name"] === "ObjectPropertyAssertion"){
					
					let clazzS = await getElementsFromPath(["end", "start"], elemOWLGrEd);
					let clazzO = await getElementsFromPath(["start", "end"], elemOWLGrEd);
					
					if(clazzS && clazzO){
						let objectName = await clazzS.getCompartmentValue("Name");
						const domain = await getFullName(objectName);
						
						let subjectName = await clazzO.getCompartmentValue("Name");
						const range = await getFullName(subjectName);
						
						let Property = await elemOWLGrEd.getCompartmentValue("Property");
						let IsNegativeAssertion = await elemOWLGrEd.getCompartmentValue("isNegative");

						if(Property){
							let instanceShapeName = objectName+"_shape";
							let instanceShapeNameFull = "http://www.w3.org/ns/shacl_local#"+instanceShapeName;
							
							if(!ontology.SHACL.NodeShape[instanceShapeNameFull]["Instance"]["Properties"])ontology.SHACL.NodeShape[instanceShapeNameFull]["Instance"]["Properties"] = [];
							ontology.SHACL.NodeShape[instanceShapeNameFull]["Instance"]["Properties"].push(
							{
								path: await getFullName(Property),
								hasValue: range,
							})
							
							
							
							
							ontologyObject = createExportStructureElement(ontology, "NamedIndividual", objectName);
							let annotationObject = {};
							if(IsNegativeAssertion === "true")annotationObject.type = "NegativeObjectPropertyAssertion";
							else annotationObject.type = "ObjectPropertyAssertion";
							annotationObject.axiom = [];
							annotationObject.axiom.push({IRI: await getFullName(Property)})
							annotationObject.axiom.push({IRI: domain})
							annotationObject.axiom.push({IRI: range})
							ontologyObject.push(annotationObject);		
							
							let qualifierProperties = [];
							annotationObject.axiom.push({axiom: qualifierProperties})
							//Qualifiers
							let qualifiers = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Qualifiers");
							for(let axiom = 0; axiom < qualifiers.length; axiom++){
								let property = qualifiers[axiom]["Property"];
								let value = qualifiers[axiom]["Value"];
								let type = qualifiers[axiom]["Type"];
								
								if(property && value){
									qualifierProperties.push(
									  {
										"type": "Annotation",
										"axiomSymbol": await getFullName(property),
										"value": value, 
										"type": await getTypeExpression(type, ontology)
									  }	
									)

								}
								
							}
						}
						
					}
				} else if(elem_type[elemType]["name"] === "DataPropertyAssertion"){
					let clazzS = await getElementsFromPath(["end", "start"], elemOWLGrEd);
					if(clazzS){
						let objectName = await clazzS.getCompartmentValue("Name");
						const domain = await getFullName(objectName);

						let Property = await elemOWLGrEd.getCompartmentValue("Property");
						let Value = await elemOWLGrEd.getCompartmentValue("Value");
						let Type = await elemOWLGrEd.getCompartmentValue("Type");
						let IsNegativeAssertion = await elemOWLGrEd.getCompartmentValue("isNegative");

						if(Property && Value){
							ontologyObject = createExportStructureElement(ontology, "NamedIndividual", objectName);
							let annotationObject = {};
							if(IsNegativeAssertion === "true")annotationObject.type = "NegativeDataPropertyAssertion";
							else annotationObject.type = "DataPropertyAssertion";
							annotationObject.axiom = [];
							annotationObject.axiom.push({IRI: await getFullName(Property)})
							annotationObject.axiom.push({IRI: domain})
							annotationObject.axiom.push({value: Value})
							annotationObject.axiom.push({type: await getTypeExpression(Type, ontology)})
							ontologyObject.push(annotationObject); 
							
							
							let qualifierProperties = [];
							annotationObject.axiom.push({axiom: qualifierProperties})
							//Qualifiers
							let qualifiers = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Qualifiers");
							for(let axiom = 0; axiom < qualifiers.length; axiom++){
								let property = qualifiers[axiom]["Property"];
								let value = qualifiers[axiom]["Value"];
								let type = qualifiers[axiom]["Type"];
								
								if(property && value){
									qualifierProperties.push(
									  {
										"type": "Annotation",
										"axiomSymbol": await getFullName(property),
										"value": value, 
										"type": await getTypeExpression(type, ontology)
									  }	
									)

								}
								
							}
						}
					}
				} else if(elem_type[elemType]["name"] === "LinkObject"){
					let clazz = await getElementsFromPath(["start"], elemOWLGrEd);
					let objectName = await clazz.getCompartmentValue("Name");
					const domain = await getFullName(objectName);
					clazz = await getElementsFromPath(["end"], elemOWLGrEd);
					let subjectName = await clazz.getCompartmentValue("Name");
					const range = await getFullName(subjectName);

					let Property = await elemOWLGrEd.getCompartmentValue("Property");
					let IsNegativeAssertion = await elemOWLGrEd.getCompartmentValue("IsNegativeAssertion");

					let InvProperty = await elemOWLGrEd.getCompartmentValue("InvProperty");
					let InvIsNegativeAssertion = await elemOWLGrEd.getCompartmentValue("InvIsNegativeAssertion");

					if(Property){
						
						let instanceShapeName = objectName+"_shape";
						let instanceShapeNameFull = "http://www.w3.org/ns/shacl_local#"+instanceShapeName;
							
						if(!ontology.SHACL.NodeShape[instanceShapeNameFull]["Instance"]["Properties"])ontology.SHACL.NodeShape[instanceShapeNameFull]["Instance"]["Properties"] = [];
						ontology.SHACL.NodeShape[instanceShapeNameFull]["Instance"]["Properties"].push(
						{
							path: await getFullName(Property),
							hasValue: range,
						})
						
						
						
						
						ontologyObject = createExportStructureElement(ontology, "NamedIndividual", objectName);
						let annotationObject = {};
						if(IsNegativeAssertion === "true")annotationObject.type = "NegativeObjectPropertyAssertion";
						else annotationObject.type = "ObjectPropertyAssertion";
						annotationObject.axiom = [];
						annotationObject.axiom.push({IRI: await getFullName(Property)})
						annotationObject.axiom.push({IRI: domain})
						annotationObject.axiom.push({IRI: range})
						ontologyObject.push(annotationObject);
					}

					if(InvProperty){
						ontologyObject = createExportStructureElement(ontology, "NamedIndividual", subjectName);
						let annotationObject = {};
						if(InvIsNegativeAssertion === "true")annotationObject.type = "NegativeObjectPropertyAssertion";
						else annotationObject.type = "ObjectPropertyAssertion";
						annotationObject.axiom = [];
						annotationObject.axiom.push({IRI: await getFullName(InvProperty)})
						annotationObject.axiom.push({IRI: range})
						annotationObject.axiom.push({IRI: domain})
						ontologyObject.push(annotationObject);
					}
				} else if(elem_type[elemType]["name"] === "DataProperty"){
					let path = ["end", "start"];
					let clazz = await getElementsFromPath(path, elemOWLGrEd);
					let className;
					let shape;
					if(clazz) {
						className = await clazz.getCompartmentValue("Name");
						shape = await clazz.getCompartmentValue("Shape");
					} else {
						className = await elemOWLGrEd.getCompartmentValue("Domain");
						if(!className) className = "Thing";
					}
					ontologyObject = createExportStructureElement(ontology, "Class", className);
					let range = await elemOWLGrEd.getCompartmentValue("Range");
					let property = await elemOWLGrEd.getCompartmentValue("Name");
					
					let shapeName = shape || className+"_shape";
					let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
					
					let propertyShapeName = (className || shape)+"_"+property
						let propertyShapeNameFull = "http://www.w3.org/ns/shacl_local#"+propertyShapeName;
						ontology.SHACL.PropertyShape[propertyShapeNameFull] = {
							name: propertyShapeName,
							IRI: propertyShapeNameFull,
							owlProperty: {
								name: property,
								IRI: await getFullName(property || ""),
								kind: "DatatypeProperty"
							},
							domain: {
								name: className,
								IRI: (await getFullName(className || "")) || null,
								nodeShapeIRI: shapeNameFull
							},
							range: {
								kind: "datatype",
								name: range,
								IRI: await getTypeExpression((range || ""), ontology)
							},

						}
						
						if(className){
							ontology.SHACL.NodeShape["http://www.w3.org/ns/shacl_local#"+property+"_domain"]= {
								IRI:"http://www.w3.org/ns/shacl_local#"+property+"_domain",
								targetSubjectsOf:await getFullName(property || ""),
								class: {
									kind: "class",
									name: className,
									IRI: (await getFullName(className || "")) || null
								},
							}
						}else if(shapeName){
							ontology.SHACL.NodeShape["http://www.w3.org/ns/shacl_local#"+property+"_domain"]= {
								IRI:"http://www.w3.org/ns/shacl_local#"+property+"_domain",
								targetSubjectsOf:await getFullName(property || ""),
								node: {
									kind: "node",
									name: shapeName,
									IRI: shapeNameFull
								},
							}
						}	
						
						let Multiplicity = await elemOWLGrEd.getCompartmentValue("Multiplicity");
						
						// Multiplicity
						if(Multiplicity){
							let multiplicity = getMultiplicity(Multiplicity);
							ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity = {};
							if(multiplicity.type === "max") ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.value;
							if(multiplicity.type === "min") ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.value;
							if(multiplicity.type === "exact") {
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.value;
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.value;
							}
							if(multiplicity.type === "range") {
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.max;
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.min;
							}
						}
						
						// Functional Property
						let IsFunctional =  await elemOWLGrEd.getCompartmentValue("IsFunctional");
						if(IsFunctional === "true" || IsFunctional === true){
							if(!ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity || !ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount){
								if(!ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity) ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity = {};
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = 1;
							}
						}

						// Equivalent Properties
						let EquivalentProperties = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("EquivalentProperties");
						if (EquivalentProperties && EquivalentProperties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].equals = [];
							for(let prop = 0; prop < EquivalentProperties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].equals.push(await getFullName(EquivalentProperties[prop].EquivalentProperty));
							}
						}

						// Disjoint Properties
						let DisjointProperties = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("DisjointProperties");
						if (DisjointProperties && DisjointProperties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].disjoint = [];
							for(let prop = 0; prop < DisjointProperties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].disjoint.push(await getFullName(DisjointProperties[prop].DisjointProperty));
							}
						}

						// Sub Properties
						let SuperProperties = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("SuperProperties");
						if (SuperProperties && SuperProperties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].subsetof = [];
							for(let prop = 0; prop < SuperProperties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].subsetof.push(await getFullName(SuperProperties[prop].SuperProperty));
							}
						}

						// Annotations
						let annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Annotation",  [{title:"AnnotationType",name:"AnnotationType"},
						{title:"Value",name:"Value"},
						{title:"Language",name:"Language"}]);
						if (annotations && annotations.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].annotations = [];
							for(let prop = 0; prop < annotations.length; prop++){
								const annotationType = await getAnnotationPropertyNameSHACL(annotations[prop]["AnnotationType"]);
								ontology.SHACL.PropertyShape[propertyShapeNameFull].annotations.push({
									"annotationType": annotationType,
									"value": annotations[prop]["Value"],
									"language":annotations[prop]["Language"]
								})
							}
						}
					
				} else if(elem_type[elemType]["name"] === "Association" || elem_type[elemType]["name"] === "ObjectProperty"){
					let propertyName = await elemOWLGrEd.getCompartmentValue("Name");
					
					let path = ["start"];
					if( elem_type[elemType]["name"] === "ObjectProperty") path = ["end", "start"];
					let clazz = await getElementsFromPath(path, elemOWLGrEd);
					let domainName;
					let domainShape;
						
					if(clazz){
						domainName = await clazz.getCompartmentValue("Name");
						domainShape = await clazz.getCompartmentValue("Shape");
					} else {
						domainName = await elemOWLGrEd.getCompartmentValue("Domain");
					}
					path = ["end"];
					if( elem_type[elemType]["name"] === "ObjectProperty") path = ["start", "end"];
					clazz = await getElementsFromPath(path, elemOWLGrEd);
					let rangeName;
					let rangeShape;
						
					if(clazz){	
						rangeName = await clazz.getCompartmentValue("Name");
						rangeShape = await clazz.getCompartmentValue("Shape");
					} else {
						rangeName = await elemOWLGrEd.getCompartmentValue("Range");
					}
					
					rangeShape = (rangeShape || rangeName)+"_shape";
					let rangeShapeFull = "http://www.w3.org/ns/shacl_local#"+rangeShape;
					
					domainShape = domainShape || domainName+"_shape";
					let domainShapeFull = "http://www.w3.org/ns/shacl_local#"+domainShape;
					
					let propertyShapeName = (domainName || domainShape)+"_"+propertyName
					let propertyShapeNameFull = "http://www.w3.org/ns/shacl_local#"+propertyShapeName;
					ontology.SHACL.PropertyShape[propertyShapeNameFull] = {
						name: propertyShapeName,
						IRI: propertyShapeNameFull,
						owlProperty: {
							name: propertyName,
							IRI: await getFullName(propertyName || "") || null,
							kind: "ObjectProperty"
						},
						domain: {
							name: domainName,
							IRI: (await getFullName(domainName || "")) || null,
							nodeShapeIRI: domainShapeFull
						},
						range: {
							kind: "class",
							name: rangeName,
							IRI: (await getFullName(rangeName || "")) || null
						},
					}
					
					if(elem_type[elemType]["name"] === "ObjectProperty"){
						if(domainName){
							ontology.SHACL.NodeShape["http://www.w3.org/ns/shacl_local#"+propertyName+"_domain"]= {
								IRI:"http://www.w3.org/ns/shacl_local#"+propertyName+"_domain",
								targetSubjectsOf:await getFullName(propertyName || ""),
								class: {
									kind: "class",
									name: domainName,
									IRI: (await getFullName(domainName || "")) || null
								},
							}
						} else if(domainShape){
							ontology.SHACL.NodeShape["http://www.w3.org/ns/shacl_local#"+propertyName+"_domain"]= {
								IRI:"http://www.w3.org/ns/shacl_local#"+propertyName+"_domain",
								targetSubjectsOf:await getFullName(propertyName || ""),
								node: {
									kind: "node",
									name: domainShape,
									IRI: domainShapeFull
								},
							}
						}
						if(rangeName){
							ontology.SHACL.NodeShape["http://www.w3.org/ns/shacl_local#"+propertyName+"_range"]= {
								IRI:"http://www.w3.org/ns/shacl_local#"+propertyName+"_range",
								targetObjectOf:await getFullName(propertyName || ""),
								class: {
									kind: "class",
									name: rangeName,
									IRI: (await getFullName(rangeName || "")) || null
								},
							}
						} else if(rangeShape){
							ontology.SHACL.NodeShape["http://www.w3.org/ns/shacl_local#"+propertyName+"_range"]= {
								IRI:"http://www.w3.org/ns/shacl_local#"+propertyName+"_range",
								targetObjectOf:await getFullName(propertyName || ""),
								node: {
									kind: "node",
									name: rangeShape,
									IRI: rangeShapeFull
								},
							}
						}
					}
						
						// Multiplicity
						let Multiplicity  = await elemOWLGrEd.getCompartmentValue("Multiplicity");
						if(Multiplicity){
							let multiplicity = getMultiplicity(Multiplicity);
							ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity = {};
							if(multiplicity.type === "max") ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.value;
							if(multiplicity.type === "min") ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.value;
							if(multiplicity.type === "exact") {
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.value;
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.value;
							}
							if(multiplicity.type === "range") {
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.max;
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.min;
							}
						}

						// Functional Property
						let IsFunctional = await elemOWLGrEd.getCompartmentValue("Functional");
						if(IsFunctional === "true" || IsFunctional === true){
							if(!ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity || !ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount){
								if(!ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity) ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity = {};
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = 1;
							}
						}

						// Equivalent Properties
						let EquivalentProperties = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("EquivalentProperties");
						if (EquivalentProperties && EquivalentProperties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].equals = [];
							for(let prop = 0; prop < EquivalentProperties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].equals.push(await getFullName(EquivalentProperties[prop].EquivalentProperty));
							}
						}

						// Disjoint Properties
						let DisjointProperties = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("DisjointProperties");
						if (DisjointProperties && DisjointProperties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].disjoint = [];
							for(let prop = 0; prop < DisjointProperties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].disjoint.push(await getFullName(DisjointProperties[prop].DisjointProperty));
							}
						}

						// Sub Properties
						let SuperProperties = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("SuperProperties");
						if (SuperProperties && SuperProperties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].subsetof = [];
							for(let prop = 0; prop < SuperProperties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].subsetof.push(await getFullName(SuperProperties[prop].SuperProperty));
							}
						}

						// Annotations
						let annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Annotation",  [{title:"AnnotationType",name:"AnnotationType"},
						{title:"Value",name:"Value"},
						{title:"Language",name:"Language"}]);
						if (annotations && annotations.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].annotations = [];
							for(let prop = 0; prop < annotations.length; prop++){
								const annotationType = await getAnnotationPropertyNameSHACL(annotations[prop]["AnnotationType"]);
								ontology.SHACL.PropertyShape[propertyShapeNameFull].annotations.push({
									"annotationType": annotationType,
									"value": annotations[prop]["Value"],
									"language":annotations[prop]["Language"]
								})
							}
						}
						
					// INV
					let propertyNameInv = await elemOWLGrEd.getCompartmentValue("NameInv");
					if(propertyNameInv){

						propertyShapeName = rangeName+"_"+propertyNameInv
						propertyShapeNameFull = "http://www.w3.org/ns/shacl_local#"+propertyShapeName;
						ontology.SHACL.PropertyShape[propertyShapeNameFull] = {
							name: propertyShapeName,
							IRI: propertyShapeNameFull,
							owlProperty: {
								name: propertyNameInv,
								IRI: await getFullName(propertyNameInv || "") || null,
								kind: "ObjectProperty"
							},
							domain: {
								name: rangeName,
								IRI: (await getFullName(rangeName || "")) || null,
								nodeShapeIRI: rangeShapeFull
							},
							range: {
								kind: "class",
								name: domainName,
								IRI: (await getFullName(domainName || "")) || null
							},
							inverseProperty:{
								name: propertyName,
								IRI: await getFullName(propertyName)
							}
						}
						
						// Multiplicity
						Multiplicity  = await elemOWLGrEd.getCompartmentValue("MultiplicityInv");
						if(Multiplicity){
							let multiplicity = getMultiplicity(Multiplicity);
							ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity = {};
							if(multiplicity.type === "max") ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.value;
							if(multiplicity.type === "min") ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.value;
							if(multiplicity.type === "exact") {
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.value;
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.value;
							}
							if(multiplicity.type === "range") {
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = multiplicity.max;
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.minCount = multiplicity.min;
							}
						}

						// Functional Property
						IsFunctional = await elemOWLGrEd.getCompartmentValue("FunctionalInv");
						if(IsFunctional === "true" || IsFunctional === true){
							if(!ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity || !ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount){
								if(!ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity) ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity = {};
								ontology.SHACL.PropertyShape[propertyShapeNameFull].multiplicity.maxCount = 1;
							}
						}

						// Equivalent Properties
						EquivalentProperties = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("EquivalentPropertiesInv");
						if (EquivalentProperties && EquivalentProperties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].equals = [];
							for(let prop = 0; prop < EquivalentProperties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].equals.push(await getFullName(EquivalentProperties[prop].EquivalentProperty));
							}
						}

						// Disjoint Properties
						DisjointProperties = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("DisjointPropertiesInv");
						if (DisjointProperties && DisjointProperties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].disjoint = [];
							for(let prop = 0; prop < DisjointProperties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].disjoint.push(await getFullName(DisjointProperties[prop].DisjointProperty));
							}
						}

						// Sub Properties
						SuperProperties = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("SuperPropertiesInv");
						if (SuperProperties && SuperProperties.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].subsetof = [];
							for(let prop = 0; prop < SuperProperties.length; prop++){
								ontology.SHACL.PropertyShape[propertyShapeNameFull].subsetof.push(await getFullName(SuperProperties[prop].SuperProperty));
							}
						}

						// Annotations
						annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("AnnotationInv",  [{title:"AnnotationType",name:"AnnotationType"},
						{title:"Value",name:"Value"},
						{title:"Language",name:"Language"}]);
						if (annotations && annotations.length > 0) {
							ontology.SHACL.PropertyShape[propertyShapeNameFull].annotations = [];
							for(let prop = 0; prop < annotations.length; prop++){
								const annotationType = await getAnnotationPropertyNameSHACL(annotations[prop]["AnnotationType"]);
								ontology.SHACL.PropertyShape[propertyShapeNameFull].annotations.push({
									"annotationType": annotationType,
									"value": annotations[prop]["Value"],
									"language":annotations[prop]["Language"]
								})
							}
						}
					}
		
					
					
				} else if(elem_type[elemType]["name"] === "HorizontalFork"){
					
					let subClasses = await getElementsFromPath2(["end","start"], elemOWLGrEd);
					let subClasses2 = await getElementsFromPath2(["start","end"], elemOWLGrEd);
					
					subClasses = subClasses.concat(subClasses2);
					subClasses = removeDuplicatesById(subClasses);
					
					
					let generalization = await getElementsFromPath(["start"], elemOWLGrEd);
					let disjoint = await generalization.getCompartmentValue("Disjoint");
					let complete = await generalization.getCompartmentValue("Complete");

					const supClass = await getElementsFromPath(["start", "end"], elemOWLGrEd);
					let className = await supClass.getCompartmentValue("Name");
					
					subClasses = subClasses.filter(item => item.obj._id !== supClass.obj._id);
					
					if(!className){
						const equivalentClasses = await supClass.getMultiCompartmentSubCompartmentValues("EquivalentClasses");
						if(equivalentClasses.length> 0) className = equivalentClasses[0].EquivalentClass;
					}

					if(disjoint && complete){
						let shape = await supClass.getCompartmentValue("Shape");
								let superShapeName = shape || className+"_shape";
								let superShapeNameFull = "http://www.w3.org/ns/shacl_local#"+superShapeName;
								ontology.SHACL.NodeShape[superShapeNameFull].xone = []
								for(let d = 0; d < subClasses.length; d++){
									let disName = await subClasses[d].getCompartmentValue("Name");
									let shape = await subClasses[d].getCompartmentValue("Shape");
									let shapeName = shape || disName+"_shape";
									let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
									ontology.SHACL.NodeShape[superShapeNameFull].xone.push(await getFullName(disName))
						}
					}
					else if(disjoint || complete){

						if(subClasses.length > 1){
							if(disjoint === "true"){
								
								for(let d = 0; d < subClasses.length; d++){
									let disName = await subClasses[d].getCompartmentValue("Name");
									let shape = await subClasses[d].getCompartmentValue("Shape");
									let shapeName = shape || disName+"_shape";
									let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
									if(!ontology.SHACL.NodeShape[shapeNameFull].disjoint) ontology.SHACL.NodeShape[shapeNameFull].disjoint = [];

									for(let dd = 0; dd < subClasses.length; dd++){
										if(d!==dd){
											let disName = await subClasses[dd].getCompartmentValue("Name");
											disName = await getFullName(disName);
											ontology.SHACL.NodeShape[shapeNameFull].disjoint.push(disName);
										}
									}
								}

							}
							if(complete === "true"){
								let shape = await supClass.getCompartmentValue("Shape");
								let superShapeName = shape || className+"_shape";
								let superShapeNameFull = "http://www.w3.org/ns/shacl_local#"+superShapeName;
								ontology.SHACL.NodeShape[superShapeNameFull].or = []
								for(let d = 0; d < subClasses.length; d++){
									let disName = await subClasses[d].getCompartmentValue("Name");
									let shape = await subClasses[d].getCompartmentValue("Shape");
									let shapeName = shape || disName+"_shape";
									let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
									ontology.SHACL.NodeShape[superShapeNameFull].or.push(await getFullName(disName))
								}
							}
						}
					}
					
					if(subClasses){
						for(let d = 0; d < subClasses.length; d++){
							let subClassName = await subClasses[d].getCompartmentValue("Name");
							let shape = await subClasses[d].getCompartmentValue("Shape");
							let shapeName = shape || subClassName+"_shape";
							let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
							
							if(!ontology.SHACL.NodeShape[shapeNameFull].superClass) ontology.SHACL.NodeShape[shapeNameFull].superClass = [];
							
							ontology.SHACL.NodeShape[shapeNameFull].superClass.push(await getFullName(className));		
						}
					}
					
					
					
				} else if(elem_type[elemType]["name"] === "Disjoint"){
					let classes = await getElementsFromPath2(["start"], elemOWLGrEd);
					let classes2 = await getElementsFromPath2(["end"], elemOWLGrEd);
					
					classes = classes.concat(classes2);

					if(classes.length > 1){
						let className = await classes[0].getCompartmentValue("Name");

						let disjointObject = {type: elem_type[elemType]["name"], axiom : []}
						for(let d = 0; d < classes.length; d++){
							let disName = await classes[d].getCompartmentValue("Name");

							let shape = await classes[d].getCompartmentValue("Shape");
							let shapeName = shape || disName+"_shape";
							let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
							
							if(!ontology.SHACL.NodeShape[shapeNameFull].disjoint) ontology.SHACL.NodeShape[shapeNameFull].disjoint = [];		
							
							for(let dd = 0; dd < classes.length; dd++){
								if(d!==dd){
									let disName = await classes[dd].getCompartmentValue("Name");
									disName = await getFullName(disName);
									ontology.SHACL.NodeShape[shapeNameFull].disjoint.push(disName);
								}
							}							
						}		
					}
				} else if(elem_type[elemType]["name"] === "DisjointClasses"){
					let classes = await getElementsFromPath2(["start", "end"], elemOWLGrEd)
					let classes2 = await getElementsFromPath2(["end", "start"], elemOWLGrEd)
					classes = classes.concat(classes2);

					if(classes.length > 1){
						let className = await classes[0].getCompartmentValue("Name");

						let disjointObject = {type: elem_type[elemType]["name"], axiom : []}
						for(let d = 0; d < classes.length; d++){
							let disName = await classes[d].getCompartmentValue("Name");

							let shape = await classes[d].getCompartmentValue("Shape");
							let shapeName = shape || disName+"_shape";
							let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
							
							if(!ontology.SHACL.NodeShape[shapeNameFull].disjoint) ontology.SHACL.NodeShape[shapeNameFull].disjoint = [];		
							
							for(let dd = 0; dd < classes.length; dd++){
								if(d!==dd){
									let disName = await classes[dd].getCompartmentValue("Name");
									disName = await getFullName(disName);
									ontology.SHACL.NodeShape[shapeNameFull].disjoint.push(disName);
								}
							}							
						}		
					}
				} else if(elem_type[elemType]["name"] === "EquivalentClasses"){
					// let classes = await getElementsFromPath2(["start", "end"], elemOWLGrEd)
					// let classes2 = await getElementsFromPath2(["end", "start"], elemOWLGrEd)
					// classes = classes.concat(classes2);

					// if(classes.length > 1){
						// let className = await classes[0].getCompartmentValue("Name");

						// let disjointObject = {type: elem_type[elemType]["name"], axiom : []}
						// for(let d = 0; d < classes.length; d++){
							// let disName = await classes[d].getCompartmentValue("Name");

							// let shape = await classes[d].getCompartmentValue("Shape");
							// let shapeName = shape || disName+"_shape";
							// let shapeNameFull = "http://www.w3.org/ns/shacl_local#"+shapeName;
							
							// if(!ontology.SHACL.NodeShape[shapeNameFull].equals) ontology.SHACL.NodeShape[shapeNameFull].equals = [];		
							
							// for(let dd = 0; dd < classes.length; dd++){
								// if(d!==dd){
									// let disName = await classes[dd].getCompartmentValue("Name");
									// disName = await getFullName(disName);
									// ontology.SHACL.NodeShape[shapeNameFull].equals.push(disName);
								// }
							// }							
						// }		
					// }
				} else if(elem_type[elemType]["name"] === "SameAsIndivids" || elem_type[elemType]["name"] === "DifferentIndivids"){
					let classes = await getElementsFromPath2(["start", "end"], elemOWLGrEd)
					let classes2 = await getElementsFromPath2(["end", "start"], elemOWLGrEd)
					classes = classes.concat(classes2);

					if(classes.length > 1){
						const className = await classes[0].getCompartmentValue("Name");
						ontologyObject = createExportStructureElement(ontology, "NamedIndividual", className);
						let disjointObject = {type: elem_type[elemType]["name"], axiom : []}
						for(let d = 0; d < classes.length; d++){
							let disName = await classes[d].getCompartmentValue("Name");
							disName = await getFullName(disName);
							disjointObject.axiom.push({IRI: disName});
						}
						ontologyObject.push(disjointObject);
					}
				} else if(elem_type[elemType]["name"] === "Annotation"){

					let annotationType = await elemOWLGrEd.getCompartmentValue("AnnotationType");
					const property = await elemOWLGrEd.getCompartmentValue("Property");
					const language = await elemOWLGrEd.getCompartmentValue("Language");
					const value = await elemOWLGrEd.getCompartmentValue("Value");
					annotationType = await getAnnotationPropertyName(annotationType);

					let classes = await getElementsFromPath2(["start", "end"], elemOWLGrEd)
					let classes2 = await getElementsFromPath2(["end", "start"], elemOWLGrEd)
					classes = classes.concat(classes2);
					if(typeof value !== "undefined" && value !== null && value !=="" &&
						typeof annotationType !== "undefined" && annotationType !== null && annotationType !==""){
						if(typeof property !== "undefined" && property !== null && property !==""){
							ontologyObject = createExportStructureElement(ontology, "Ontology", "Ontology");
							let annotationObject = {};
							annotationObject.type = "AnnotationAssertion";
							annotationObject.axiom = [];
							annotationObject.axiom.push({axiomSymbol: annotationType})

							annotationObject.axiom.push({IRI: await getFullName(property)})
							annotationObject.axiom.push({value: value})
							if(typeof language !== "undefined" && language !== null && language !=="")annotationObject.axiom.push({language: language})
							ontologyObject.push(annotationObject);
						} else if(classes.length === 0){
							ontologyObject = createExportStructureElement(ontology, "Ontology", "Ontology");
							let annotationObject = {type: "Annotation", axiom : []};

							annotationObject.axiom.push({axiomSymbol: annotationType})
							annotationObject.axiom.push({value: value})
							if(typeof language !== "undefined" && language !== null && language !=="")annotationObject.axiom.push({language: language})
							ontologyObject.push(annotationObject);
						} else {
							// for each box create annatation assertion
							for(let c = 0; c < classes.length; c++){
								
								let className = await classes[c].getCompartmentValue("Name");
								if(!className){
									const equivalentClasses = await classes[c].getMultiCompartmentSubCompartmentValues("EquivalentClasses");
									if(equivalentClasses.length> 0) className = equivalentClasses[0].EquivalentClass;
								}
								const elem_type = ElementTypes.findOne({_id:classes[c].obj.elementTypeId, diagramTypeId:active_diagram_type_id});
								let elemTypeMap = {
									"Class":"Class",
									"Object":"NamedIndividual",
									"AnnotationProperty":"AnnotationProperty",
									"DataType":"DataType"
								}
								ontologyObject = createExportStructureElement(ontology, elemTypeMap[elem_type.name], className);

								let annotationObject = {};
								annotationObject.type = "AnnotationAssertion";
								annotationObject.axiom = [];
								annotationObject.axiom.push({axiomSymbol: annotationType})

								if (className && /^[a-zA-Z0-9\-_:]+$/.test(className)) {
									annotationObject.axiom.push({IRI: await getFullName(className)});
								} else if(className){
									let parsed_exp_data = class_expression_grammar_parser_OWLGrEd.parse(className, {});
									annotationObject.axiom.push({"Expression": parsed_exp_data});
								}
								// annotationObject.axiom.push({IRI: await getFullName(className)})
								annotationObject.axiom.push({value: value})
								if(typeof language !== "undefined" && language !== null && language !=="")annotationObject.axiom.push({language: language})
								ontologyObject.push(annotationObject);

							}
						}
					}

				}
			}
		}
	}

	// console.log("OOOOOOOOOOOOOOO", ontology);
	return ontology;
 }

function createExportStructureElement(object, topLeveName, name) {
    if(typeof object[topLeveName][name] === "undefined"){
		object[topLeveName][name] = [];
	}

    return object[topLeveName][name];
}

async function getRDFStatements(elemOWLGrEd){
	let statements = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Statements",  [{title:"Property",name:"Property"},
    {title:"Value",name:"Value"},
	{title:"formObject",name:"formObject"}]);
	let statementList = [];
	for(let st = 0; st < statements.length; st++){
		let formObjectMark = "";
		if(statements[st]["formObject"] === "true") formObjectMark = {
			"IRI": "rdfs:domain",
			"value":"true",
			"isIRI": false
		}
		// statementList.push("Annotation("+formObjectMark+ await getFullName(statements[st]["Property"]) + " " + await getFullName(statements[st]["Value"]) +")")
		statementList.push({
			"IRI":await getFullName(statements[st]["Property"]),
			"value":await getFullName(statements[st]["Value"]),
			"annotations": formObjectMark,
			"isIRI": true
		})
	}

	return statementList;
}


async function getFilters(parseResult, elemOWLGrEd) {
    let result = false;

    for (const key of Object.keys(parseResult)) {
        if (await getFilter(parseResult[key], elemOWLGrEd) === true) {
            result = true;
        }
    }
    return result;
}


async function getFilter(value, elemOWLGrEd) {
    let filterItem1 = await getFilterItem(value["filterItem1"], elemOWLGrEd);
    let filterItem2 = await getFilterItem(value["filterItem2"], elemOWLGrEd);
    let filterOp = value["filterOp"];
	let compare = await compareFilterItems(filterItem1, filterItem2, filterOp);
    return compare
}

async function getFilterItem(filterItemTable,elemOWLGrEd) {

    if (filterItemTable.function !== undefined) {
        return await createFunctionAxiom(filterItemTable.function, {}, elemOWLGrEd);
    } else if (filterItemTable.string !== undefined) {
        return filterItemTable.string;
	} else if (filterItemTable[0] === "'" && filterItemTable[2] === "'") {
        return filterItemTable[1];
    } else if (filterItemTable.number !== undefined) {
        return filterItemTable.number;
    } else if (filterItemTable.boolean !== undefined) {
        return filterItemTable.boolean;
    } else if (filterItemTable.path !== undefined) {
        return getValueFromPath(filterItemTable.path, elemOWLGrEd);
	} else if (Array.isArray(filterItemTable)) {
    } else if (filterItemTable.pathFunction !== undefined) {

		if(filterItemTable.pathFunction.function !== undefined && filterItemTable.pathFunction.function.functionType !== undefined &&
            filterItemTable.pathFunction.function.functionType === "value"
        ){
			if(filterItemTable.pathFunction.path !== undefined){
			   let compartmentsObjects = [];
               let compartment = await getCompartmentsFromPathSimple(filterItemTable.pathFunction.path, elemOWLGrEd);
               return compartment;
			}
        }else if (
            filterItemTable.pathFunction.function !== undefined &&
            filterItemTable.pathFunction.function === "isEmpty"
        ) {
            let elements;
            if (/^[a-z]/.test(filterItemTable.pathFunction.path[0])) {//?????
                elements = await getElementsFromPath(filterItemTable.pathFunction.path);
            } else {
                elements = await getCompartmentsFromPath(filterItemTable.pathFunction.path);
            }
			// TO DO
			return "";
            // return elements === null || elements.attr("value") === "" ? "true" : "false";
        } else if (
            filterItemTable.pathFunction.function !== undefined &&
            filterItemTable.pathFunction.function === "isURI"
        ) {
            let comp = await getCompartmentsFromPath(filterItemTable.pathFunction.path);
            // let parseResult = URIgrammar().test(comp.attr("value")) ? comp.attr("value") : "NOT";
            // return parseResult !== "NOT" ? "true" : "false";
			//TO DO
			return "false"
        } else if (
            filterItemTable.pathFunction.function !== undefined &&
            filterItemTable.pathFunction.function === "elemType"
        ) {
            // let elements = await getElementsFromPath(filterItemTable.pathFunction.path);
            // return elements.find("/elemType").attr("id");
			// TO DO
			return null;
        }
    }
}

async function compareFilterItems(filterItem1, filterItem2, filterOp) {
    // "==" / "!=" / ">"
    if (filterItem1 !== null && filterItem2 !== null && filterOp !== null) {
        if (filterOp === "==" && filterItem1 === filterItem2) return true;
        else if (filterOp === "!=" && filterItem1 !== filterItem2) return true;
        else if (filterOp === ">" && filterItem1 > filterItem2) return true;
    } else if (filterOp === "!=" && (filterItem1 === null || filterItem2 === null)) {
        return true;
    }
    return false;
}

async function getCompartmentsFromPath(pathTable, elemOWLGrEd){
	let compartments = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues(pathTable[0]);
	return compartments
}

async function getCompartmentsFromPathSimple(pathTable, elemOWLGrEd){
	let compartments = await elemOWLGrEd.getCompartmentValue(pathTable[0])
	return compartments
}

async function getObjectExpression(elem){
	const elemName = await elem.getCompartmentValue("Name");
  return elemName;
  return "TO DO getObjectExpression"
}

async function concatAxiom(parseResult, axiom, ontologyObject, elemOWLGrEd) {
    if (typeof parseResult === "object" && parseResult !== null && typeof parseResult !== "function") {
        let ontologyObjects = [];
		for (let key in parseResult) {
		  if(typeof parseResult[key] !== "function"){
            let value = parseResult[key];
            if (key === "function") {
                ontologyObject =  await createFunctionAxiom(value, {}, elemOWLGrEd);
            } else if(key === "axiomSymbol"){
				ontologyObject["axiomSymbol"] = value;
			} else if(key === "axiom"){
				ontologyObject["type"] = value.string;
				let axiomObject =  await concatAxiom({expressions: value.expressions}, "", {}, elemOWLGrEd);
				ontologyObject["axiom"] = axiomObject;
				// axiom = value.string + "("+ await concatAxiom({expressions: value.expressions}, axiom) + ")";
			} else if (key === "pathFunction" && value["path"] !== undefined) {
				let compartmentsObjects = [];
                let compartments = await getCompartmentsFromPath(value["path"], elemOWLGrEd);
                for (const compartment of compartments) {
					if (value["function"] !== undefined) {
						compartmentsObjects.push(await createFunctionAxiom(value["function"], {}, null, compartment));
					}
				}
				ontologyObject = compartmentsObjects;
            } else if (key === "filter") {
                let filterResult = await getFilters(value, elemOWLGrEd);
				if (!filterResult) generateAxiom = false;
            } else if (key === "optional") {
                let tempA = axiom;
                let tempG = generateAxiom;
                axiom = "";
                generateAxiom = true;
                axiom = await concatAxiom(value, axiom);
                if (generateAxiom) {
					axiom = tempA + axiom;
				} else {
					axiom = tempA;
				}
                generateAxiom = tempG;
            } else if (key === "mandatory") {
                let count = 0;
                let tempA = axiom;
                let tempG = generateAxiom;
                axiom = "";
                generateAxiom = true;
                 axiom = await concatAxiom({ mandatoryExpressions: value["mandatoryExpressions"] }, axiom);
                if (value["filter"] !== undefined && value["filter"]["filterItem1"]["function"] === "count") {
                    let filterItem1 = count;
                    let filterItem2 = Number(await getFilterItem(value["filter"]["filterItem2"]));
                    let filterOp = value["filter"]["filterOp"];
                    generateAxiom = await compareFilterItems(filterItem1, filterItem2, filterOp) ? true : false;
                } else if (count > 0 && axiom !== "" && generateAxiom !== false) {
                    axiom = tempA + axiom;
                } else {
                    generateAxiom = false;
                }
                if (generateAxiom) generateAxiom = tempG;
            } else if ((key === "expression" || key === "mandatoryExpressions") && value["path"] !== undefined) {
                let compartments = await getCompartmentsFromPath(value["path"]);
                let tempSource = source;
                let tempG = generateAxiom;
                for (const compartment of compartments) {
                    let tempA = axiom;
                    axiom = "";
                    source = compartment;
                    generateAxiom = true;
                    delete value["path"];
                    axiom = await concatAxiom(value, axiom);
                    if (generateAxiom) {
						axiom = tempA + axiom;
					} else {
						axiom = tempA;
					}
                };
                generateAxiom = tempG;
                source = tempSource;
            } else {
				ontologyObject = await concatAxiom(value, "", ontologyObject, elemOWLGrEd);

            }
		  }
		ontologyObjects.push(ontologyObject);
        }
		ontologyObjects = ontologyObjects.filter(function (el, i, arr) {
			return arr.indexOf(el) === i;
		});
		if(ontologyObjects.length > 1) ontologyObject = ontologyObjects;
    } else {
        axiom += parseResult;
    }
    return ontologyObject;
}

async function createFunctionAxiom(value, ontologyObject, elemOWLGrEd, compartment, currentComp) {
    if (!currentComp) currentComp = source;
    let axiomPart = "";
    if (generateAxiom) {
        if (value.functionType === "getUri" || value.functionType === "getDataTypeRestrictionName" ) {
            let [name, namespace] = await getNameAndNamespace(value, elemOWLGrEd, currentComp);
            if (name) {
                ontologyObject = {"IRI": await getFullName(name, namespace)}
                // axiomPart += ;
                count++;
            } else {
                // generateAxiom = false;
            }
        } else if (value.functionType === "getAnnotationProperty") {
            let [name, namespace] = await getNameAndNamespace(value, elemOWLGrEd, currentComp);
			
			// let rangeType = await getTypeExpression(name);
			// if(rangeType){
				// ontologyObject = {"IRI": rangeType}
            // } else 
			if (name) {
                ontologyObject = {"IRI": await getFullName(name, namespace)}
                // count++;
            }
        } else if (value.functionType === "getClassExpr") {
            if (!value.pathFilter && !value.path) {
                // ontologyObject = {"IRI": await getFullName(name, namespace)}
                 let classExpr = await getClassExpression(elemOWLGrEd);
				 if (typeof classExpr === "undefined" || classExpr === null || classExpr === "") generateAxiom = false;
                 else if(typeof classExpr === "string")ontologyObject = {"IRI": await getFullName(classExpr)};
				 else {
					 ontologyObject = {"Expression": classExpr};
				 }
                 count++;
            } else if (value.path && !value.path.filter) {
               let clazz = await getElementsFromPath(value.path.path, elemOWLGrEd);
               let classExpr = await getClassExpression(clazz);
                if (typeof classExpr === "undefined" || classExpr === null || classExpr === "") generateAxiom = false;
                else if(typeof classExpr === "string")ontologyObject = {"IRI": await getFullName(classExpr)};
				 else {
					 ontologyObject = {"Expression": classExpr};
				 }
			} else if(value.path && value.path.filter){
				let clazz = await getElementsFromPath(value.path.path.path, elemOWLGrEd);
            } else if (value.pathFilter) {
                let classes = await getElementsFromPath(value.pathFilter.path);
                if (
                    value.pathFilter.filter.filterItem1.function &&
                    value.pathFilter.filter.filterItem1.function === "count"
                ) {
                    let filterItem1 = classes.length;
                    let filterItem2 = Number(await getFilterItem(value.pathFilter.filter.filterItem2));
                    let filterOp = value.pathFilter.filter.filterOp;
                    if (await compareFilterItems(filterItem1, filterItem2, filterOp)) {
                        for (const cls of classes) {
                          axiomPart += await getClassExpression(cls);
                          count++;
                        }
                    } else {
                        generateAxiom = false;
                    }
                } else {
                    // TODO: handle path case
                }
            }
        } else if (value.functionType === "getClassName") {
            if (!value.pathFilter && !value.path) {
                axiomPart += await getClassExpressionShort();
                count++;
            } else if (value.path) {
                let classes = await getElementsFromPath(value.path);
				for (const cls of classes) {
					axiomPart += await getClassExpressionShort(cls);
					count++;
				}

                if (!classes.length) generateAxiom = false;
            } else if (value.pathFilter) {
                let classes = await getElementsFromPath(value.pathFilter.path);
                if (
                    value.pathFilter.filter.filterItem1.function &&
                    value.pathFilter.filter.filterItem1.function === "count"
                ) {
                    let filterItem1 = classes.length;
                    let filterItem2 = Number(await getFilterItem(value.pathFilter.filter.filterItem2));
                    let filterOp = value.pathFilter.filter.filterOp;
                    if (await compareFilterItems(filterItem1, filterItem2, filterOp)) {
						for (const cls of classes) {
							axiomPart += await getClassExpression(cls);
							count++;
						}
                    } else {
                        generateAxiom = false;
                    }
                } else {
                    // TODO: handle path case
                }
            }
        } else if (value.functionType === "getDomainOrRange") {

          if (!value.pathFilter && !value.path) {
                let domainOrRange = await getFullName(await getDomainOrRange(elemOWLGrEd));
                ontologyObject = {"IRI": domainOrRange}
                count++;
          } else if (value.path) {
                let clazz2 = await getElementsFromPath(value.path, elemOWLGrEd);
                let clazz = await getElementsFromPath2(value.path, elemOWLGrEd);

				let diagram = Diagrams.findOne({_id:Session.get("activeDiagram")});
				let active_diagram_type_id = diagram["diagramTypeId"];
				const elemTypeClass = ElementTypes.findOne({name:"Class", diagramTypeId:active_diagram_type_id});
				
				clazz = clazz.filter(item =>
				  item.obj?.elementTypeId === elemTypeClass._id
				);
				
				clazz = clazz[0];
				
				if(clazz !== null && typeof clazz !== "undefined"){

						let domainOrRangeName = await getDomainOrRange(clazz);
						
						if (domainOrRangeName && /^[a-zA-Z0-9\-_:]+$/.test(domainOrRangeName)) {
							let domainOrRange = await getFullName(domainOrRangeName);
							ontologyObject = {"IRI": domainOrRange}
						} else if(domainOrRangeName){
							let parsed_exp_data = class_expression_grammar_parser_OWLGrEd.parse(domainOrRangeName, {});
							ontologyObject = {"Expression": parsed_exp_data}
						} 
				}
                // if (!classes.length) generateAxiom = false;
          }

        } else if (value.functionType === "getObjectExpr") {
            if (!value.pathFilter && !value.path) {
                let objectName = await getObjectExpression(elemOWLGrEd);
                objectName = await getFullName(objectName);
                ontologyObject = {"IRI": objectName}
                count++;
            } else if (value.path) {
			  let clazz = await getElementsFromPath(value.path.path, elemOWLGrEd);
              let objectName = await getObjectExpression(clazz);
              objectName = await getFullName(objectName);
              ontologyObject = {"IRI": objectName}
            }
        } else if (value.functionType === "getRoleExpr") {
            axiomPart += getRoleExpression();
            count++;
        } else if (value.functionType === "getContainer") {
            axiomPart += getContainerName();
            count++;
        } else if (value.functionType === "getDataTypeRestriction") {
            // axiomPart += getDataTypeRestrictionName();
			// ontologyObject = {"IRI": await getTypeExpression(name, namespace)}
            count++;
        } else if (value.functionType === "getDataTypeExpression") {
            axiomPart += getAttributeDataTypeExpression();
            count++;
		} else if (value.functionType === "getExpression") {
			let [name, namespace] = await getNameAndNamespace(value, null, compartment, currentComp);

			if (name && /^[a-zA-Z0-9\-_:]+$/.test(name)) {
				ontologyObject = {"IRI": await getFullName(name, namespace)}
				count++;
			} else if(name && !namespace){
				let parsed_exp_data = class_expression_grammar_parser_OWLGrEd.parse(name, {});
				ontologyObject = {"Expression": parsed_exp_data}
			} else {
				generateAxiom = false;
			}
      // let a = name.replace(/\\n/g, "\n");
			// TO DO MP.parseClassExpression
		  let expr = "MP.parseClassExpression";
		   // let expr = MP.parseClassExpression(a, diagram, t, classList, datatypeList);
            // if (!expr) {
                // UnParsedExpressions[a] = a;
            // }
			// TO DO /compartType
            // if (currentComp.find("/compartType").attr("id") === "ClassName") {
                // axiomPart += expr;
                // count++;
            // } else
			// if (await getClassExpression() !== expr && expr !== null) {
                // axiomPart += expr;
                // count++;
            // } else {
                // generateAxiom = false;
            // }
   } else if (value.functionType === "getHasKeyProperties") {
       axiomPart = "TO DO getHasKeyProperties";
   } else if (value.functionType === "value") {
            if (value["path"] !== null && value["path"] !== undefined) {
				let compValue = await getValueFromPath(value["path"], elemOWLGrEd);
				if (typeof compValue!== "undefined" && compValue !== null && compValue !== "") {
					if (value["inQuotes"] === true) {
						let campValue = compValue.replace(/\\n/g, "\n").replace(/"/g, '\\"');
						axiomPart += `"${campValue}"`;
					} else {
						axiomPart += compValue;
					}
					count += 1;
				}
				ontologyObject = {"value": axiomPart};



				// let valueValue =
				// compartments.forEach(compartment => {
					// const compValue = compartment.getAttribute("value"); // assuming DOM-like API or similar
					// if (compValue !== "") {
						// if (value["inQuotes"] === "true") {
							// let campValue = compValue.replace(/\\n/g, "\n").replace(/"/g, '\\"');
							// axiomPart += `"${campValue}"`;
						// } else {
							// axiomPart += compValue;
						// }
						// count += 1;
					// }
				// });

				// if (compartments.length === 0 || axiomPart === "") {
					// generateAxiom = false;
				// }
			} else {
				const sourceValue = source.getAttribute("value"); // again, assuming a DOM-like API
				if (sourceValue !== "") {
					if (value["inQuotes"] === "true") {
						let campValue = sourceValue.replace(/\\n/g, "\n").replace(/"/g, '\\"');
						axiomPart += `"${campValue}"`;
					} else {
						axiomPart += sourceValue;
					}
					count += 1;
				} else {
					generateAxiom = false;
				}
			}

			axiomPart = "TO DO value";
        } else if (value.functionType === "getAttributeType") {
            let isObjectAttribute = await getCompartmentsFromPath(value.isObjectAttribute);
            let typeComp = await getValueFromPath(value.type, currentComp);
            axiomPart = typeComp ? MP.generateAttributeType(typeComp, diagram, t, classList, datatypeList, isObjectAttribute)[1] || "DataProperty" : "DataProperty";
        } else if (value.functionType === "getTypeExpression") {
            let isObjectAttribute = await getCompartmentsFromPath(value.isObjectAttribute);
            // core.split_compart_value(currentComp, true);
            let typeComp = await getValueFromPath(value.type, currentComp);
            let typeExpr = MP.generateAttributeType(currentComp.attr("value"), diagram, t, classList, datatypeList, isObjectAttribute)[0] || "";
            if (!typeExpr) generateAxiom = false;
            else count++;
            axiomPart += typeExpr;
        } else if (value.functionType === "getMultiplicity") {
            axiomPart += await getMultiplicity(value);
            count++;
        }
    }
    return ontologyObject; 
}

async function getNameAndNamespace(nameNamespaceTable, elemOWLGrEd, compartment, currentComp) {
    if (!currentComp) currentComp = source;
    let name = null, namespace = null;

    if (nameNamespaceTable.name) {
        if (nameNamespaceTable.name.path) {
            name = await getValueFromPath(nameNamespaceTable.name.path, elemOWLGrEd, compartment, currentComp);
        } else if (nameNamespaceTable.name.string) {
            name = nameNamespaceTable.name.string;
        } else if (nameNamespaceTable.name.value) {
            //name = currentComp.attr("value");
            name = 'TO DO currentComp.attr("value")';
        } else if (nameNamespaceTable.name.function) {
            name = await createFunctionAxiom(nameNamespaceTable.name.function);
        }
    }

    if(typeof name !== "undefined" && name !== null && name.indexOf(":") !== -1){
      [namespace, name] = name.split(":");
    }

    if (nameNamespaceTable.namespace) {
        if (nameNamespaceTable.namespace.path) {
            namespace = await getValueFromPath(nameNamespaceTable.namespace.path, elemOWLGrEd, currentComp);
        }
    }
	// return ["name", "namespace"];
    return [name, namespace];
}

async function getFullName(name, namespace) {
    if(name.indexOf(":") !== -1 && typeof namespace === "undefined"){
		[namespace, name] = name.split(":");
	}
	if (name === "Thing") {
        namespace = "owl";
    }

    if (namespace && namespace !== "") {
        if(typeof namespaceTable[namespace] !== "undefined"){
          return namespaceTable[namespace] + name;
        }
        // TO DO ns_uri_table
        // if (ns_uri_table[namespace]) {
        //     return "<" + ns_uri_table[namespace] + name + ">";
        // }
        // if (namespace.startsWith("http") || namespace.startsWith("www")) {
            // return namespace + "#" + name ;
        // }
        return await getCurrentUri() + name ;
    } else {
        return await getCurrentUri() + name ;
    }
}

async function getAnnotationPropertyName(name, namespace) {
    let ns_uri_table_annot = [];
	ns_uri_table_annot["backwardcompatiblewith"] = "owl:backwardCompatibleWith"
	ns_uri_table_annot["deprecated"] = "owl:deprecated"
	ns_uri_table_annot["comment"] = "rdfs:comment"
	ns_uri_table_annot["incompatiblewith"] = "owl:incompatibleWith"
	ns_uri_table_annot["isdefinedby"] = "rdfs:isDefinedBy"
	ns_uri_table_annot["label"] = "rdfs:label"
	ns_uri_table_annot["Label"] = "rdfs:label"
	ns_uri_table_annot["priorversion"] = "owl:priorVersion"
	ns_uri_table_annot["seealso"] = "rdfs:seeAlso"
	ns_uri_table_annot["versioninfo"] = "owl:versionInfo"
	ns_uri_table_annot["date"] = "<http://purl.org/dc/elements/1.1/date>"

	// get annotation properties
	// for k, v in pairs(getAnnotationPropertyNS(diagram, ns_uri_table)) do
		// ns_uri_table_annot[string.lower(k)] = v
	// end
   if (namespace && namespace !== "") {
		// TO DO ns_uri_table
        // if (ns_uri_table[namespace]) {
            // return "<" + ns_uri_table[namespace] + name + ">";
        // }
        if (namespace.startsWith("http") || namespace.startsWith("www")) {
            return "<" + namespace + "#" + name + ">";
        }
        return "<" + await getCurrentUri() + name + ">";
    } else {
		// TO DO ns_uri_table_annot
        if (ns_uri_table_annot[name.toLowerCase()]) {
            return ns_uri_table_annot[name.toLowerCase()];
        }
        return  await getCurrentUri() + name ;
    }
}
async function getAnnotationPropertyNameSHACL(name, namespace) {
    let ns_uri_table_annot = [];
	ns_uri_table_annot["backwardcompatiblewith"] = "http://www.w3.org/2002/07/owl#backwardCompatibleWith"
	ns_uri_table_annot["deprecated"] = "http://www.w3.org/2002/07/owl#deprecated"
	ns_uri_table_annot["comment"] = "http://www.w3.org/2000/01/rdf-schema#comment"
	ns_uri_table_annot["incompatiblewith"] = "http://www.w3.org/2002/07/owl#incompatibleWith"
	ns_uri_table_annot["isdefinedby"] = "http://www.w3.org/2000/01/rdf-schema#isDefinedBy"
	ns_uri_table_annot["label"] = "http://www.w3.org/2000/01/rdf-schema#label"
	ns_uri_table_annot["Label"] = "http://www.w3.org/2000/01/rdf-schema#label"
	ns_uri_table_annot["priorversion"] = "http://www.w3.org/2002/07/owl#priorVersion"
	ns_uri_table_annot["seealso"] = "http://www.w3.org/2000/01/rdf-schema#seeAlso"
	ns_uri_table_annot["versioninfo"] = "http://www.w3.org/2002/07/owl#versionInfo"

	// get annotation properties
	// for k, v in pairs(getAnnotationPropertyNS(diagram, ns_uri_table)) do
		// ns_uri_table_annot[string.lower(k)] = v
	// end
   if (namespace && namespace !== "") {
		// TO DO ns_uri_table
        // if (ns_uri_table[namespace]) {
            // return "<" + ns_uri_table[namespace] + name + ">";
        // }
        if (namespace.startsWith("http") || namespace.startsWith("www")) {
            return "<" + namespace + "#" + name + ">";
        }
        return "<" + await getCurrentUri() + name + ">";
    } else {
		// TO DO ns_uri_table_annot
        if (ns_uri_table_annot[name.toLowerCase()]) {
            return ns_uri_table_annot[name.toLowerCase()];
        }
        return  await getCurrentUri() + name ;
    }
}

async function getCurrentUri(pathTable, currentComp){
  return namespaceTable[":"] || "http://owlgred.lumii.lv/web/2026#"
}

async function getClassExpression(elem) {
  const elemName = await elem.getCompartmentValue("Name");
  if(elemName) return elemName;
  else {
	let equivalentClasses = await elem.getMultiCompartmentSubCompartmentValues("EquivalentClasses");
	if(equivalentClasses.length > 0){
		let classExpression = equivalentClasses[0].EquivalentClass;

		return class_expression_grammar_parser_OWLGrEd.parse(classExpression, {});
	}

  }

	return "TO DO getClassExpression";
    generateAxiom = false;
    return "";
}

async function getClassExpressionShort(elem) {
    // if (!elem) elem = utilities.getElementFromCompartment(source);

    // if (elem.find("/elemType").attr("id") === "Class") {
        // let name = elem.find("/compartment/subCompartment:has(/compartType[id='Name'])").attr("value");

        // if (name && name !== "") {
            // let namespace = elem.find("/compartment/subCompartment:has(/compartType[id='Namespace'])").attr("value");
            // return name;
        // }
    // }
	return "TO DO getClassExpressionShort";
    generateAxiom = false;
    return "";
}

async function getDomainOrRange(elem){
	let name = await elem.getCompartmentValue("Name");
	if(name) return name;
	else{
		const equivalentClasses = await elem.getMultiCompartmentSubCompartmentValues("EquivalentClasses");
		if(equivalentClasses.length> 0) return equivalentClasses[0].EquivalentClass;
	}
}

// async function getMultiplicity(value){
	// console.log("TO DO getMultiplicity")
	// return -1
// }

function getMultiplicity(str) {
  str = str.toString().trim();

  // Case 1: unlimited (*)
  if (str === "*") {
    return { type: "unbounded" };
  }

  // Case 2: exact number (no "..")
  if (!str.includes("..")) {
    const num = parseInt(str, 10);
    if (isNaN(num)) throw new Error("Invalid cardinality: " + str);
    return { type: "exact", value: num };
  }

  // Case 3: has ".."
  const [minStr, maxStr] = str.split("..").map(s => s.trim());

  const min = minStr === "*" ? null : parseInt(minStr, 10);
  const max = maxStr === "*" ? null : parseInt(maxStr, 10);

  if (isNaN(min) && min !== null) throw new Error("Invalid min cardinality: " + minStr);
  if (isNaN(max) && max !== null) throw new Error("Invalid max cardinality: " + maxStr);

  // Patterns
  if (min === 0 && max !== null) {
    return { type: "max", value: max };
  }
  if (max === null && min !== null) {
    return { type: "min", value: min };
  }
  if (min !== null && max !== null) {
    return { type: "range", min, max };
  }

  // Edge case: "..*" only
  return { type: "unboundedRange" };
}

async function getValueFromPath(pathTable, elemOWLGrEd, compartment, currentComp) {
  let object = currentComp || source;
  // const elemOWLGrEd = await Create_OWLGrEd_Element(object);

  let returnValue = null;
  for (const v of pathTable) {
    if (v === "..") {
      // object = object.find("/parentCompartment, /element");
    } else {
	  if(elemOWLGrEd !== null) returnValue = await elemOWLGrEd.getCompartmentValue(v);
	  else {
		  returnValue = compartment[v];
	  }
      // object = object
        // .find("/compartment, /subCompartment")
        // .filter(com => com.find("/compartType").attr("id") === v);
    }
  }
  return returnValue;
}


async function getElementsFromPath(pathTable, elemOWLGrEd){
  let elementFromPath;
  for (const v of pathTable) {
	if(v === "start") {
		if(elemOWLGrEd.obj.type === "Line") {
			elementFromPath = await elemOWLGrEd.getStartElement();
			elemOWLGrEd = elementFromPath;
		}else {
			elementFromPath = await elemOWLGrEd.getStartLinks();
			
			if(elementFromPath.length>0){
				elemOWLGrEd = elementFromPath[0]["link"];
				elementFromPath = elemOWLGrEd;
			} else return null;
		}
	} else if(v === "end") {
		if(elemOWLGrEd.obj.type === "Line") {
			elementFromPath = await elemOWLGrEd.getEndElement();
			elemOWLGrEd = elementFromPath;
		}else {
			elementFromPath = await elemOWLGrEd.getEndLinks();
			
			if(elementFromPath.length>0){
				elemOWLGrEd = elementFromPath[0]["link"];
				elementFromPath = elemOWLGrEd;
			}else return null;
		}
	} else {
		elementFromPath = null;
	}

  }
  return elementFromPath
}

async function getElementsFromPathForDomainOrRange(pathTable, elemOWLGrEd){
// const elemType = ElementTypes.findOne({_id:clazz.obj.elementTypeId});
  let elementFromPath;
  for (const v of pathTable) {
	if(v === "start") {
		if(elemOWLGrEd.obj.type === "Line") {
			elementFromPath = await elemOWLGrEd.getStartElement();
			elemOWLGrEd = elementFromPath;
		}else {
			elementFromPath = await elemOWLGrEd.getStartLinks();

			if(elementFromPath.length>0){
				elemOWLGrEd = elementFromPath[0]["link"];
				elementFromPath = elemOWLGrEd;
			} else return null;
		}
	} else if(v === "end") {
		if(elemOWLGrEd.obj.type === "Line") {
			elementFromPath = await elemOWLGrEd.getEndElement();
			elemOWLGrEd = elementFromPath;
		}else {
			elementFromPath = await elemOWLGrEd.getEndLinks();

			if(elementFromPath.length>0){
				elemOWLGrEd = elementFromPath[0]["link"];
				elementFromPath = elemOWLGrEd;
			}else return null;
		}
	} else {
		elementFromPath = null;
	}

  }
  return elementFromPath
}

// Helper: dedupe by a stable id if available (obj.id → id → fallback to object ref)
function dedupe(elements) {
  const seen = new Set();
  const out = [];
  for (const e of elements) {
    if (!e) continue;
    const key = e?.obj?.id ?? e?.id ?? e; // best-effort
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

// Helper: normalize start/end "Links" result to an array of elements (link targets)
function normalizeLinks(links) {
  if (!links) return [];
  // Links can be array of objects with { link: <elem> } or already elements
  const arr = Array.isArray(links) ? links : [links];
  return arr
    .map(x => (x && typeof x === "object" && "link" in x ? x.link : x))
    .filter(Boolean);
}

/**
 * Walk a path like ["start","end","start", ...] through the model,
 * exploring all branches. Returns ALL elements reached at the end.
 *
 * @param {string[]} pathTable - each step is "start" or anything else ("end")
 * @param {*} elemOWLGrEd - starting element (node or line)
 * @returns {Promise<array>} - array of reached elements (deduped)
 */
async function getElementsFromPath2(pathTable, elemOWLGrEd) {
  // frontier starts with the initial element
  let frontier = [elemOWLGrEd];

  for (const step of pathTable) {
    const next = [];

    // Expand each element in the current frontier
    for (const el of frontier) {
      const isLine = el?.obj?.type === "Line";

      if (step === "start") {
        if (isLine) {
          // single element
          const startEl = await el.getStartElement();
          if (startEl) next.push(startEl);
        } else {
          // possibly many links
          const links = await el.getStartLinks();
          next.push(...normalizeLinks(links));
        }
      } else { // treat anything not "start" as "end"
        if (isLine) {
          const endEl = await el.getEndElement();
          if (endEl) next.push(endEl);
        } else {
          const links = await el.getEndLinks();
          next.push(...normalizeLinks(links));
        }
      }
    }

    // Prepare next layer (dedup to avoid explosions / cycles)
    frontier = dedupe(next);

    // Early exit if nothing more to traverse
    if (frontier.length === 0) break;
  }

  // Return ALL elements reached after the last step
  return dedupe(frontier);
}

async function getHorizontalForkDisjointComplete(elem, superClassId){
	let disjoint = [];

	let e = await elem.getEndLinks();
	for(let l = 0; l < e.length; l++){
		let ss = await e[l]["link"].getStartElement();
		if(ss.obj._id !== superClassId) disjoint.push(ss);
	}
	let s = await elem.getStartLinks();
	for(let l = 0; l < s.length; l++){
		let ee = await s[l]["link"].getEndElement();
		if(ee.obj._id !== superClassId) disjoint.push(ee);
	}

	return disjoint
}


async function getTypeExpression(dataType, ontology) {

  const builtInDatatypePrefixes = {
	  Literal: "http://www.w3.org/2000/01/rdf-schema#",
	  NCName: "http://www.w3.org/2001/XMLSchema#",
	  NMTOKEN: "http://www.w3.org/2001/XMLSchema#",
	  Name: "http://www.w3.org/2001/XMLSchema#",
	  PlainLiteral: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	  XMLLiteral: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	  anyURI: "http://www.w3.org/2001/XMLSchema#",
	  base64Binary: "http://www.w3.org/2001/XMLSchema#",
	  boolean: "http://www.w3.org/2001/XMLSchema#",
	  byte: "http://www.w3.org/2001/XMLSchema#",
	  dateTime: "http://www.w3.org/2001/XMLSchema#",
	  dateTimeStamp: "http://www.w3.org/2001/XMLSchema#",
	  decimal: "http://www.w3.org/2001/XMLSchema#",
	  double: "http://www.w3.org/2001/XMLSchema#",
	  float: "http://www.w3.org/2001/XMLSchema#",
	  hexBinary: "http://www.w3.org/2001/XMLSchema#",
	  int: "http://www.w3.org/2001/XMLSchema#",
	  integer: "http://www.w3.org/2001/XMLSchema#",
	  language: "http://www.w3.org/2001/XMLSchema#",
	  long: "http://www.w3.org/2001/XMLSchema#",
	  negativeInteger: "http://www.w3.org/2001/XMLSchema#",
	  nonNegativeInteger: "http://www.w3.org/2001/XMLSchema#",
	  nonPositiveInteger: "http://www.w3.org/2001/XMLSchema#",
	  normalizedString: "http://www.w3.org/2001/XMLSchema#",
	  positiveInteger: "http://www.w3.org/2001/XMLSchema#",
	  rational: "http://www.w3.org/2002/07/owl#",
	  real: "http://www.w3.org/2002/07/owl#",
	  short: "http://www.w3.org/2001/XMLSchema#",
	  string: "http://www.w3.org/2001/XMLSchema#",
	  token: "http://www.w3.org/2001/XMLSchema#",
	  unsignedByte: "http://www.w3.org/2001/XMLSchema#",
	  unsignedInt: "http://www.w3.org/2001/XMLSchema#",
	  unsignedLong: "http://www.w3.org/2001/XMLSchema#",
	  unsignedShort: "http://www.w3.org/2001/XMLSchema#",
	  date: "http://www.w3.org/2001/XMLSchema#",
	  time: "http://www.w3.org/2001/XMLSchema#"
	};


  if (!dataType) return null;

  // Case-insensitive lookup
  const foundKey = Object.keys(builtInDatatypePrefixes)
    .find(k => k.toLowerCase() === dataType.toLowerCase());

  if (foundKey) {
	return builtInDatatypePrefixes[foundKey] + foundKey;
  } else if(typeof ontology !== "undefined" && typeof ontology.DataType[dataType] !== "undefined"){
	let name;
	let namespace;
	if(dataType !== null && dataType.indexOf(":") !== -1){
      [namespace, name] = dataType.split(":");
    }
	let prefixedName = await getFullName(name, namespace);
	return prefixedName;
  } else {
	 return parsed_exp_data = data_range_grammar_parser_OWLGrEd.parse(dataType, {});
  }

  return null; // or just return dataType if you prefer
}

function removeDuplicatesById(elements) {
  const seen = new Set();
  const unique = [];

  for (const el of elements) {
    const id = el?.obj?._id;
    if (!id) continue; // skip if invalid object

    if (!seen.has(id)) {
      seen.add(id);
      unique.push(el);
    }
  }

  return unique;
}

export {
}
