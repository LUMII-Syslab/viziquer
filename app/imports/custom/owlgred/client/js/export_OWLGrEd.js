import { Interpreter } from '/imports/client/lib/interpreter'
import { Utilities } from '/imports/platform/client/js/utilities/utils.js'
import { Projects, Elements, Compartments, ElementTypes, CompartmentTypes, Diagrams } from '/imports/db/platform/collections'
import { Dialog } from '/imports/platform/client/js/interpretator/Dialog'
import * as export_grammar_parser_OWLGrEd from '/imports/custom/owlgred/client/js/export_grammar_parser_OWLGrEd.js'
import { Create_New_OWLGrEd_Element, Create_OWLGrEd_Element } from './OWLGrEd_Element.js';
import { DataFactory, Writer } from 'n3';
const { namedNode, literal, quad, blankNode } = DataFactory;

let generateAxiom = true;
let source = null;
let count = 0;
let namespaceTable = {}

Interpreter.customMethods({

  saveOntologyOwlgred: async function(){
	let ontology = saveOntologyInFormatOwlgred();
	console.log("OOOOOOOOOOOOOOO", ontologyStructure)
  },

  saveOntologyN3TurtleOwlgred: async function(){
	  let ontology = await saveOntologyInFormatOwlgred();
	  generateN3Syntax(ontology, "text/turtle");

  },
  saveOntologyN3n3Owlgred: async function(){
	  let ontology = await saveOntologyInFormatOwlgred();
	  generateN3Syntax(ontology, "text/n3");

  },
  saveOntologyN3ntriplesOwlgred: async function(){
	  let ontology = await saveOntologyInFormatOwlgred();
	  generateN3Syntax(ontology, "application/n-triples");

  },
  saveOntologyN3trigOwlgred: async function(){
	  let ontology = await saveOntologyInFormatOwlgred();
	  generateN3Syntax(ontology, "application/trig");
  },

  saveOntologyRDFLibTurtleOwlgred: async function(){
	  let ontology = await saveOntologyInFormatOwlgred();
	  generateRDFLibSyntax(ontology, "text/turtle");
  },
  saveOntologyRDFLibrdfxmlOwlgred: async function(){
	  let ontology = await saveOntologyInFormatOwlgred();
	  generateRDFLibSyntax(ontology, "application/rdf+xml");
  },
  saveOntologyRDFLibntriplesOwlgred: async function(){
	  let ontology = await saveOntologyInFormatOwlgred();
	  generateRDFLibSyntax(ontology, "application/n-triples");
  },
  saveOntologyRDFLibn3Owlgred: async function(){
	  let ontology = await saveOntologyInFormatOwlgred();
	  generateRDFLibSyntax(ontology, "text/n3");
  },
  saveOntologyRDFLibldjsonOwlgred: async function(){
	  let ontology = await saveOntologyInFormatOwlgred();
	  generateRDFLibSyntax(ontology, "application/ld+json");
  },

  saveOntologyOwlgred2: async function(){
		let textInvalid = [
		'Annotation($getAnnotationProperty(/AnnotationType /Namespace) "$value(/ValueLanguage/Value)" ?(@$value(/Annotation/ValueLanguage/Language)))',
		"DataPropertyAssertion($getUri(/Property) $getObjectExpr \"$value(/Value)\" ?(^^$getUri(/Type)))",
		 "NegativeDataPropertyAssertion($getUri(/Property) $getObjectExpr \"$value(/Value)\" ?(^^$getUri(/Type)))",
"SubClassOf($getClassExpr !(?(ObjectExactCardinality([$getMultiplicity('Exact') > -1][$getAttributeType(/../Type/Type /../isObjectAttribute) == 'ObjectProperty'] $getMultiplicity('Exact') /../Name:$getUri(/Name /Namespace) ?(/../Type:$getTypeExpression(/Type  /Namespace)))) ?(DataExactCardinality([$getMultiplicity('Exact') > -1] [$getAttributeType(/../Type/Type /../isObjectAttribute)  == 'DataProperty'] $getMultiplicity('Exact') /../Name:$getUri(/Name /Namespace) ?(/../Type:$getTypeExpression(/Type /Namespace)))))))",
    "SubClassOf($getClassExpr !(?(ObjectMinCardinality([$getMultiplicity('Min') > -1][$getAttributeType(/../Type/Type /../isObjectAttribute) == 'ObjectProperty'] $getMultiplicity('Min') /../Name:$getUri(/Name /Namespace) ?(/../Type:$getTypeExpression(/Type /Namespace)))) ?(DataMinCardinality([$getMultiplicity('Min') > -1] [$getAttributeType(/../Type/Type /../isObjectAttribute)  == 'DataProperty'] $getMultiplicity('Min') /../Name:$getUri(/Name /Namespace) ?(/../Type:$getTypeExpression(/Type /Namespace)))))))",
    "SubClassOf($getClassExpr !(?(ObjectMaxCardinality([$getMultiplicity('Max') > -1][$getAttributeType(/../Type/Type /../isObjectAttribute) == 'ObjectProperty'] $getMultiplicity('Max') /../Name:$getUri(/Name /Namespace) ?(/../Type:$getTypeExpression(/Type /Namespace)))) ?(DataMaxCardinality([$getMultiplicity('Max') > -1] [$getAttributeType(/../Type/Type /../isObjectAttribute)  == 'DataProperty'] $getMultiplicity('Max') /../Name:$getUri(/Name /Namespace) ?(/../Type:$getTypeExpression(/Type /Namespace)))))))",
		"AnnotationAssertion($getAnnotationProperty(/AnnotationType /Namespace) /../../Name:$getUri(/Name /Namespace) \"$value(/ValueLanguage/Value)\" ?(@$value(/ValueLanguage/Language)))",
    "AnnotationAssertion($getAnnotationProperty(/AnnotationType /Namespace) $getObjectExpr \"$value(/ValueLanguage/Value)\" ?(@$value(/ValueLanguage/Language)))"
		]
		const stringAxioms = [
    "FunctionalObjectProperty([$getAttributeType(/../Type/Type /../isObjectAttribute) == 'ObjectProperty'][$value == 'true'] /../Name:$getUri(/Name /Namespace))",
    "FunctionalDataProperty([$getAttributeType(/../Type/Type /../isObjectAttribute) == 'DataProperty'][$value == 'true'] /../Name:$getUri(/Name /Namespace))",
    "EquivalentDataProperties([$getAttributeType(/../../../Type/Type /../../../isObjectAttribute) == 'DataProperty'] /../../../Name:$getUri(/Name /Namespace) $getExpression(/Expression))",
    "EquivalentObjectProperties([$getAttributeType(/../../../Type/Type /../../../isObjectAttribute) == 'ObjectProperty'] /../../../Name:$getUri(/Name /Namespace) $getExpression(/Expression))",
    "SubDataPropertyOf([$getAttributeType(/../../../Type/Type /../../../isObjectAttribute) == 'DataProperty'] /../../../Name:$getUri(/Name /Namespace) $getExpression(/Expression))",
    "SubObjectPropertyOf([$getAttributeType(/../../../Type/Type /../../../isObjectAttribute)  == 'ObjectProperty'] /../../../Name:$getUri(/Name /Namespace) $getExpression(/Expression))",
    "DisjointDataProperties([$getAttributeType(/../../../Type/Type /../../../isObjectAttribute) == 'DataProperty'] /../../../Name:$getUri(/Name /Namespace) $getExpression(/Expression))",
    "DisjointObjectProperties([$getAttributeType(/../../../Type/Type /../../../isObjectAttribute)  == 'ObjectProperty'] /../../../Name:$getUri(/Name /Namespace) $getExpression(/Expression))",
    "DisjointClasses([$value == 'true'] $getClassExpr(/eEnd/start[$count > 1]))",
    "EquivalentClasses([$value == 'true'] $getClassExpr(/eStart/end) ObjectUnionOf($getClassExpr(/eEnd/start[$count > 1])))",
    "AnnotationAssertion([/container:$isEmpty != true]<http://lumii.lv/2011/1.0/owlgred#Container> /Title/Name:$getUri(/Name /Namespace) $getContainer)",
    "Declaration(NamedIndividual($getObjectExpr))",
    "ClassAssertion($getExpression($value) $getObjectExpr)",
    "AnnotationAssertion(rdfs:comment $getObjectExpr \"$value\")",
    "SameIndividual($getUri($value) $getObjectExpr)",
    "DifferentIndividuals($getUri($value) $getObjectExpr)",
];

	for(let stringAxiom = 0; stringAxiom < stringAxioms.length; stringAxiom++){
		generateAxiom = true;
		// console.log("stringAxioms",stringAxioms[stringAxiom]);
		let parsed_exp = export_grammar_parser_OWLGrEd.parse(stringAxioms[stringAxiom], {});
		// console.log("parsed_exp",parsed_exp);
		let axiom = await concatAxiom(parsed_exp, "");
		// console.log("axiom",axiom);
		// console.log("-------------------------------------------");
	}


		// let parsed_exp = export_grammar_parser_OWLGrEd.parse(text, {});
		// console.log("parsed_exp",parsed_exp);

		// let axiom = await concatAxiom(parsed_exp, "");
		// console.log("axiom",axiom);

		var diagramId = Session.get("activeDiagram");
		 var active_diagram_type_id = Diagrams.findOne({_id:Session.get("activeDiagram")})["diagramTypeId"];

		let elem_type = ElementTypes.find({diagramTypeId:active_diagram_type_id})
		.map(function(e) {
		  return {name: e.name, id: e["_id"]}
		});

		for(let elemType = 0; elemType < elem_type.length; elemType++){

			if(elem_type[elemType]["name"] === "Class"){
				var elems = Elements.find({diagramId:diagramId, elementTypeId:elem_type[elemType]["id"]}).map(function(e) {
				  return e["_id"]
				});
				for(let elem = 0; elem < elems.length; elem++){
					const compart_type = CompartmentTypes.findOne({name: "Attributes", elementTypeId: elem_type[elemType]["id"]});
					const compart = Compartments.findOne({compartmentTypeId: compart_type["_id"], elementId: elems[elem]});

					let sub_compart_type = CompartmentTypes.findOne({name: "DisjointProperties"});
					let ct= CompartmentTypes.find({}).map(function(e) {
					  return {name: e.name, id: e["_id"]}
					});
				}
			} else if(elem_type[elemType]["name"] === "Association"){
				var elems = Elements.find({diagramId:diagramId, elementTypeId:elem_type[elemType]["id"]}).map(function(e) {
				  return {startElement: e.startElement, endElement: e.endElement, id: e["_id"]}
				});
			}
		}

	},
});

async function saveOntologyInFormatOwlgred(){
	generateAxiom = true;
	namespaceTable = {};
	let ontology = {
			"Ontology": {},
			"Class": {},
			"ObjectProperty": {},
			"DatatypeProperty": {},
			"AnnotationProperty": {},
			"NamedIndividual": {},
			"NegativePropertyAssertion": {},
			"DataType": {}
	};


	var diagramId = Session.get("activeDiagram");
	var active_diagram_type_id = Diagrams.findOne({_id:Session.get("activeDiagram")})["diagramTypeId"];

    //get prefix - namespace declarations
    const elem_type_namespaces = ElementTypes.findOne({name:"Namespaces", diagramTypeId:active_diagram_type_id});
    const elem_namespace = Elements.find({diagramId:diagramId, elementTypeId: elem_type_namespaces["_id"]}).map(function(e) {
      return e["_id"]
    });

    for(let namespaceElem = 0; namespaceElem < elem_namespace.length; namespaceElem++){

      const elemOWLGrEd = await Create_OWLGrEd_Element(elem_namespace[namespaceElem]);
      const dafaultNamespace = await elemOWLGrEd.getCompartmentValue("Dafault Namespace");
      if(dafaultNamespace) ontology.Ontology.iri = dafaultNamespace;
      if(typeof dafaultNamespace !== "undefined" && dafaultNamespace !== null && dafaultNamespace !== "")namespaceTable[":"]=dafaultNamespace;
      const namespaces = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Namespaces declarations",  [{title:"Prefix",name:"Prefix"},
        {title:"Namespace",name:"Namespace"}]);
       for(let ns = 0; ns < namespaces.length; ns++){
         if(namespaces[ns]["Prefix"] !== "" && namespaces[ns]["Namespace"] !== "")namespaceTable[namespaces[ns]["Prefix"]]=namespaces[ns]["Namespace"];
       }
    }

	let elem_type = ElementTypes.find({diagramTypeId:active_diagram_type_id})
		.map(function(e) {
		  return {name: e.name, id: e["_id"], exportAxioms : e["exportAxioms"]}
	});

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
					const className = await elemOWLGrEd.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "Class", className);
				}else if(elem_type[elemType]["name"] === "Generalization") {
					const subclass = await getElementsFromPath(["start"], elemOWLGrEd);
					const className = await subclass.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "Class", className);
				}else if(elem_type[elemType]["name"] === "AssocToFork" || elem_type[elemType]["name"] === "ComplementOf" || elem_type[elemType]["name"] === "Disjoint" || elem_type[elemType]["name"] === "EquivalentClass") {
					const subclass = await getElementsFromPath(["start"], elemOWLGrEd);
					const className = await subclass.getCompartmentValue("Name");
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

						let reifiedProperty = await getFullName(name);
						let subject = await getElementsFromPath(["end","start"], elemOWLGrEd);
						let object = await getElementsFromPath(["start", "end"], elemOWLGrEd);
						const subjectName = await getFullName(await subject.getCompartmentValue("Name"));
						const objectName = await getFullName(await object.getCompartmentValue("Name"));
						let embeddesTripleString = "'<<" + subjectName + " " + reifiedProperty + " " + objectName + ">>'";

						let annotations = await getRDFStatements(elemOWLGrEd);

						let rdfStatementAxiom = {
						  "type": "AnnotationAssertion",
							"axiom":[
							{"axiomSymbol": "rdf:reifies"},
							{"IRI": reifiedProperty},
							{"value": embeddesTripleString},
							{"annotations": annotations}
						  ]
						}
						ontologyObject.push(rdfStatementAxiom);
					}

				} else if(elem_type[elemType]["name"] === "AnnotationProperty"){
						const className = await elemOWLGrEd.getCompartmentValue("Name");
						ontologyObject = createExportStructureElement(ontology, "AnnotationProperty", className);
				}else if(elem_type[elemType]["name"] === "DataType"){
						const className = await elemOWLGrEd.getCompartmentValue("Name");
						ontologyObject = createExportStructureElement(ontology, "DataType", className);
				}else if(elem_type[elemType]["name"] === "Object"){
						const className = await elemOWLGrEd.getCompartmentValue("Name");
						ontologyObject = createExportStructureElement(ontology, "NamedIndividual", className);
				}else if(elem_type[elemType]["name"] === "InstanceOf" || elem_type[elemType]["name"] === "SameAsIndivid" || elem_type[elemType]["name"] === "DifferentIndivid"){
						const subclass = await getElementsFromPath(["start"], elemOWLGrEd);
						const className = await subclass.getCompartmentValue("Name");
						ontologyObject = createExportStructureElement(ontology, "NamedIndividual", className);
				}

				for(let axiom = 0; axiom < parsedExportAxioms.length; axiom++){
					source = elems[elem];
					generateAxiom = true;
					let axiomString = await concatAxiom(parsedExportAxioms[axiom], "", {}, elemOWLGrEd);
					ontologyObject.push(axiomString)
				}

				if(elem_type[elemType]["name"] === "Class"){
					const className = await elemOWLGrEd.getCompartmentValue("Name");

					const keys = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Keys");

					for(let axiom = 0; axiom < keys.length; axiom++){

						let properties = JSON.parse(keys[axiom].Key);
						if (properties && properties.length > 0) {
							let keysObject = {};
							keysObject.type = "HasKey";
							keysObject.axiom = [];
							keysObject.axiom.push({IRI:  await getFullName(className)});
							let axiomObjectect = [];
							for(let prop = 0; prop < properties.length; prop++){
								axiomObjectect.push({IRI: await getFullName(properties[prop].value), inverseOf: properties[prop].subCompartments[1].value});
							}
							keysObject.axiom.push({axiom:  axiomObjectect});
							ontologyObject.push(keysObject);
						}
					}

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
						annotationObject.axiom.push({value: annotations[axiom]["Value"]})
						annotationObject.axiom.push({language: annotations[axiom]["Language"]})
						ontologyObject.push(annotationObject);
					}

					//Attributes
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
						const attrName = await getFullName(attribute.Name);
						//Name
						let attributeObject = {};
						attributeObject.type = "Declaration";
						attributeObject.axiom = {type: "DataProperty", axiom: {IRI: attrName}};
						ontologyObject.push(attributeObject);

						//Domain
						attributeObject = {};
						attributeObject.type = "DataPropertyDomain";
						attributeObject.axiom = [];
						attributeObject.axiom.push({IRI: attrName});
						attributeObject.axiom.push({IRI: await getFullName(className)});
						ontologyObject.push(attributeObject);

						//Range type
						if(attribute.Type){
							attributeObject = {};
							attributeObject.type = "DataPropertyRange";
							attributeObject.axiom = [];
							attributeObject.axiom.push({IRI: attrName});
							attributeObject.axiom.push({IRI: getTypeExpression(attribute.Type)});
							ontologyObject.push(attributeObject);
						}
						// Multiplicity
						if(attribute.Multiplicity){
							let multiplicity = getMultiplicity(attribute.Multiplicity);
							attributeObject = {};
							attributeObject.type = "SubClassOf";
							attributeObject.axiom = [];
							attributeObject.axiom.push({IRI: await getFullName(className)});

							if(multiplicity.type === "max") attributeObject.axiom.push({type: "DataMaxCardinality", axiom: [{Number : multiplicity.value}, {IRI: attrName}, {IRI: getTypeExpression(attribute.Type)}]});
							if(multiplicity.type === "min") attributeObject.axiom.push({type: "DataMinCardinality", axiom: [{Number : multiplicity.value}, {IRI: attrName}, {IRI: getTypeExpression(attribute.Type)}]});
							if(multiplicity.type === "exact") attributeObject.axiom.push({type: "DataExactCardinality", axiom: [{Number : multiplicity.value}, {IRI: attrName}, {IRI: getTypeExpression(attribute.Type)}]});
							if(multiplicity.type === "range") {
								attributeObject.axiom.push({type: "DataMaxCardinality", axiom: [{Number : multiplicity.max}, {IRI: attrName}, {IRI: getTypeExpression(attribute.Type)}]});
								ontologyObject.push(attributeObject);
								attributeObject = {};
								attributeObject.type = "SubClassOf";
								attributeObject.axiom = [];
								attributeObject.axiom.push({IRI: await getFullName(className)});
								attributeObject.axiom.push({type: "DataMinCardinality", axiom: [{Number : multiplicity.min}, {IRI: attrName}, {IRI: getTypeExpression(attribute.Type)}]});
							}
							ontologyObject.push(attributeObject);
						}
						// FunctionalDataProperty( /../Name:$getUri(/Name /Namespace))
						// Functional Property
						if(attribute.IsFunctional === "true" || attribute.IsFunctional === true){
						attributeObject = {};
						attributeObject.type = "FunctionalDataProperty";
						attributeObject.axiom = {IRI: attrName};
						ontologyObject.push(attributeObject);
						}

						// Equivalent Properties
						let properties = JSON.parse(attributes[axiom].EquivalentProperties);
						if (properties && properties.length > 0) {
							attributeObject = {};
							attributeObject.type = "EquivalentDataProperties";
							attributeObject.axiom = [];
							attributeObject.axiom.push({IRI: attrName});
							for(let prop = 0; prop < properties.length; prop++){
								attributeObject.axiom.push({IRI: await getFullName(properties[prop].value)});
							}
							ontologyObject.push(attributeObject);
						}

						// Disjoint Properties
						properties = JSON.parse(attributes[axiom].DisjointProperties);
						if (properties && properties.length > 0) {
							attributeObject = {};
							attributeObject.type = "DisjointDataProperties";
							attributeObject.axiom = [];
							attributeObject.axiom.push({IRI: attrName});
							for(let prop = 0; prop < properties.length; prop++){
								attributeObject.axiom.push({IRI: await getFullName(properties[prop].value)});
							}
							ontologyObject.push(attributeObject);
						}

						// Sub Properties
						properties = JSON.parse(attributes[axiom].SuperProperties);

						if (properties && properties.length > 0) {
						  attributeObject = {};
						  attributeObject.type = "SubDataPropertyOf";
						  attributeObject.axiom = [];
						  attributeObject.axiom.push({ IRI: attrName });

						  for (let prop = 0; prop < properties.length; prop++) {
							attributeObject.axiom.push({IRI: await getFullName(properties[prop].value)});
						  }

						  ontologyObject.push(attributeObject);
						}

						// Annotations
						properties = JSON.parse(attributes[axiom].Annotation);
						if (properties && properties.length > 0) {
							for(let prop = 0; prop < properties.length; prop++){
								let attributeObject = {};
								attributeObject.type = "AnnotationAssertion";
								attributeObject.axiom = [];
								const annotationType = await getAnnotationPropertyName(properties[prop]["annotationType"]);
								attributeObject.axiom.push({axiomSymbol: annotationType})

								attributeObject.axiom.push({IRI: attrName})
								attributeObject.axiom.push({value: '"'+ properties[prop]["value"]+ '"'})
								attributeObject.axiom.push({language: properties[prop]["language"]})
								ontologyObject.push(attributeObject);
							}
						}
					}
				} else if(elem_type[elemType]["name"] === "Restriction"){
					const Role = await elemOWLGrEd.getCompartmentValue("Role");
					const IsInverse = await elemOWLGrEd.getCompartmentValue("IsInverse");
					const Only = await elemOWLGrEd.getCompartmentValue("Only");
					const Some = await elemOWLGrEd.getCompartmentValue("Some");
					const Multiplicity = await elemOWLGrEd.getCompartmentValue("Multiplicity");

					// getDomainOrRange(/end/start)

					let clazz = await getElementsFromPath(["start"], elemOWLGrEd);
					const domain = await getFullName(await getDomainOrRange(clazz));
					clazz = await getElementsFromPath(["end"], elemOWLGrEd);
					const range = await getFullName(await getDomainOrRange(clazz));

					ontologyObject = createExportStructureElement(ontology, "ObjectProperty", Role);


					attributeObject = {};
					attributeObject.type = "SubClassOf";
					attributeObject.axiom = [];
					attributeObject.axiom.push({IRI: domain});

					if(Only === "true") {
						if(IsInverse === "true") attributeObject.axiom.push({type: "ObjectAllValuesFrom", axiom: [ {axiom: {type: "ObjectInverseOf", axiom: {IRI: await getFullName(Role)}}}, {IRI: range}]});
						else attributeObject.axiom.push({type: "ObjectAllValuesFrom", axiom: [{IRI: await getFullName(Role)}, {IRI: range}]});
					} else {
						if(IsInverse === "true") attributeObject.axiom.push({type: "ObjectSomeValuesFrom", axiom: [ {axiom: {type: "ObjectInverseOf", axiom: {IRI: await getFullName(Role)}}}, {IRI: range}]});
						else attributeObject.axiom.push({type: "ObjectSomeValuesFrom", axiom: [{IRI: await getFullName(Role)}, {IRI: range}]});
					}
					ontologyObject.push(attributeObject);

					// Multiplicity
					if(Multiplicity){
						let multiplicity = getMultiplicity(Multiplicity);
						attributeObject = {};
						attributeObject.type = "SubClassOf";
						attributeObject.axiom = [];
						attributeObject.axiom.push({IRI: domain});
						let attrName = await getFullName(Role);
						if(multiplicity.type === "max") attributeObject.axiom.push({type: "ObjectMaxCardinality", axiom: [{Number : multiplicity.value}, {IRI: attrName}, {IRI: range}]});
						if(multiplicity.type === "min") attributeObject.axiom.push({type: "ObjectMinCardinality", axiom: [{Number : multiplicity.value}, {IRI: attrName}, {IRI: range}]});
						if(multiplicity.type === "exact") attributeObject.axiom.push({type: "ObjectExactCardinality", axiom: [{Number : multiplicity.value}, {IRI: attrName}, {IRI: range}]});
						if(multiplicity.type === "range") {
							attributeObject.axiom.push({type: "ObjectMaxCardinality", axiom: [{Number : multiplicity.max}, {IRI: attrName}, {IRI: range}]});
							ontologyObject.push(attributeObject);
							attributeObject = {};
							attributeObject.type = "SubClassOf";
							attributeObject.axiom = [];
							attributeObject.axiom.push({IRI: domain});
							attributeObject.axiom.push({type: "ObjectMinCardinality", axiom: [{Number : multiplicity.min}, {IRI: attrName}, {IRI: range}]});
						}
						ontologyObject.push(attributeObject);
					}
				} else if(elem_type[elemType]["name"] === "AnnotationProperty"){
					const className = await elemOWLGrEd.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "AnnotationProperty", className);
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
						annotationObject.axiom.push({type: getTypeExpression(datatypeDefinition)})
						ontologyObject.push(annotationObject);
					}

				} else if(elem_type[elemType]["name"] === "Object"){

					const className = await elemOWLGrEd.getCompartmentValue("Name");
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
						annotationObject.axiom.push({type: getTypeExpression(DataPropertyAssertion[axiom]["Type"])})
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
						annotationObject.axiom.push({type: getTypeExpression(NegativeDataPropertyAssertion[axiom]["Type"])})
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
				} else if(elem_type[elemType]["name"] === "Association" || elem_type[elemType]["name"] === "ObjectProperty"){
					let propertyName = await elemOWLGrEd.getCompartmentValue("Name");
					ontologyObject = createExportStructureElement(ontology, "ObjectProperty", propertyName);
					let annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("Annotation",  [{title:"AnnotationType",name:"AnnotationType"},
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

					let Multiplicity  = await elemOWLGrEd.getCompartmentValue("Multiplicity");

					// Multiplicity
					if(Multiplicity && Multiplicity !== "*"){

						let clazz = await getElementsFromPath(["start"], elemOWLGrEd);
						const domain = await getFullName(await getDomainOrRange(clazz));
						clazz = await getElementsFromPath(["end"], elemOWLGrEd);
						const range = await getFullName(await getDomainOrRange(clazz));

						let multiplicity = getMultiplicity(Multiplicity);
						attributeObject = {};
						attributeObject.type = "SubClassOf";
						attributeObject.axiom = [];
						attributeObject.axiom.push({IRI: domain});

						if(multiplicity.type === "max") attributeObject.axiom.push({type: "ObjectMaxCardinality", axiom: [{Number : multiplicity.value}, {IRI: await getFullName(propertyName)}, {IRI: range}]});
						if(multiplicity.type === "min") attributeObject.axiom.push({type: "ObjectMinCardinality", axiom: [{Number : multiplicity.value}, {IRI: await getFullName(propertyName)}, {IRI: range}]});
						if(multiplicity.type === "exact") attributeObject.axiom.push({type: "ObjectExactCardinality", axiom: [{Number : multiplicity.value}, {IRI: await getFullName(propertyName)}, {IRI: range}]});
						if(multiplicity.type === "range") {
							attributeObject.axiom.push({type: "ObjectMaxCardinality", axiom: [{Number : multiplicity.max}, {IRI: await getFullName(propertyName)}, {IRI: getTypeExpression(attribute.Type)}]});
							ontologyObject.push(attributeObject);
							attributeObject = {};
							attributeObject.type = "SubClassOf";
							attributeObject.axiom = [];
							attributeObject.axiom.push({IRI: domain});
							attributeObject.axiom.push({type: "ObjectMinCardinality", axiom: [{Number : multiplicity.min}, {IRI: await getFullName(propertyName)}, {IRI: getTypeExpression(attribute.Type)}]});
						}
						ontologyObject.push(attributeObject);
					}



					propertyName = await elemOWLGrEd.getCompartmentValue("NameInv");
					annotations = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("AnnotationInv",  [{title:"AnnotationType",name:"AnnotationType"},
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

					Multiplicity  = await elemOWLGrEd.getCompartmentValue("MultiplicityInv");
					// MultiplicityInv
					if(Multiplicity){

						let clazz = await getElementsFromPath(["start"], elemOWLGrEd);
						const domain = await getFullName(await getDomainOrRange(clazz));
						clazz = await getElementsFromPath(["end"], elemOWLGrEd);
						const range = await getFullName(await getDomainOrRange(clazz));

						let multiplicity = getMultiplicity(Multiplicity);
						attributeObject = {};
						attributeObject.type = "SubClassOf";
						attributeObject.axiom = [];
						attributeObject.axiom.push({IRI: domain});

						if(multiplicity.type === "max") attributeObject.axiom.push({type: "ObjectMaxCardinality", axiom: [{Number : multiplicity.value}, {IRI: await getFullName(propertyName)}, {IRI: range}]});
						if(multiplicity.type === "min") attributeObject.axiom.push({type: "ObjectMinCardinality", axiom: [{Number : multiplicity.value}, {IRI: await getFullName(propertyName)}, {IRI: range}]});
						if(multiplicity.type === "exact") attributeObject.axiom.push({type: "ObjectExactCardinality", axiom: [{Number : multiplicity.value}, {IRI: await getFullName(propertyName)}, {IRI: range}]});
						if(multiplicity.type === "range") {
							attributeObject.axiom.push({type: "ObjectMaxCardinality", axiom: [{Number : multiplicity.max}, {IRI: await getFullName(propertyName)}, {IRI: getTypeExpression(attribute.Type)}]});
							ontologyObject.push(attributeObject);
							attributeObject = {};
							attributeObject.type = "SubClassOf";
							attributeObject.axiom = [];
							attributeObject.axiom.push({IRI: domain});
							attributeObject.axiom.push({type: "ObjectMinCardinality", axiom: [{Number : multiplicity.min}, {IRI: await getFullName(propertyName)}, {IRI: getTypeExpression(attribute.Type)}]});
						}
						ontologyObject.push(attributeObject);
					}


					//propertyChain
					let propertyChains = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("PropertyChains");
					for(let axiom = 0; axiom < propertyChains.length; axiom++){
						let propertyName = await elemOWLGrEd.getCompartmentValue("Name");
						let properties = JSON.parse(propertyChains[axiom].PropertyChain);
						if (properties && properties.length > 0) {
							let keysObject = {};
							keysObject.type = "SubObjectPropertyOf";
							keysObject.axiom = [];
							keysObject.axiom.push({IRI:  await getFullName(propertyName)});

							let axiomObjectect = [];
							for(let prop = 0; prop < properties.length; prop++){
								axiomObjectect.push({IRI: await getFullName(properties[prop].value), inverseOf: properties[prop].subCompartments[1].value});
							}
							keysObject.axiom.push({axiom: {type: "ObjectPropertyChain", axiom:axiomObjectect}});
							ontologyObject.push(keysObject);
						}
					}

					propertyChains = await elemOWLGrEd.getMultiCompartmentSubCompartmentValues("PropertyChainsInv");
					for(let axiom = 0; axiom < propertyChains.length; axiom++){
						let propertyName = await elemOWLGrEd.getCompartmentValue("NameInv");
						let properties = JSON.parse(propertyChains[axiom].PropertyChain);
						if (properties && properties.length > 0) {
							let keysObject = {};
							keysObject.type = "SubObjectPropertyOf";
							keysObject.axiom = [];
							keysObject.axiom.push({IRI:  await getFullName(propertyName)});

							let axiomObjectect = [];
							for(let prop = 0; prop < properties.length; prop++){
								axiomObjectect.push({IRI: await getFullName(properties[prop].value), inverseOf: properties[prop].subCompartments[1].value});
							}
							keysObject.axiom.push({axiom: {type: "ObjectPropertyChain", axiom:axiomObjectect}});

							ontologyObject.push(keysObject);
						}
					}

				} else if(elem_type[elemType]["name"] === "HorizontalFork"){
					let disjoint = await elemOWLGrEd.getCompartmentValue("Disjoint");
					let complete = await elemOWLGrEd.getCompartmentValue("Complete");
					let subClasses = await getElementsFromPath2(["end","start"], elemOWLGrEd);
					subClasses = removeDuplicatesById(subClasses);
					const supClass = await getElementsFromPath(["start", "end"], elemOWLGrEd);
					const className = await supClass.getCompartmentValue("Name");

					if(disjoint || complete){

						ontologyObject = createExportStructureElement(ontology, "Class", className);
						if(subClasses.length > 1){
							if(disjoint === "true"){
								let disjointObject = {type: "DisjointClasses", axiom : []}
								for(let d = 0; d < subClasses.length; d++){
									let disName = await subClasses[d].getCompartmentValue("Name");
									disName = await getFullName(disName);
									disjointObject.axiom.push({IRI: disName});
								}
								ontologyObject.push(disjointObject);

							}
							if(complete === "true"){
								let disjointObject = {type: "EquivalentClasses", axiom : []}
								disjointObject.axiom.push({IRI: await getFullName(className)});
								let ObjectUnionOf = {type: "ObjectUnionOf", axiom: []}
								disjointObject.axiom.push(ObjectUnionOf);
								for(let d = 0; d < subClasses.length; d++){
									let disName = await subClasses[d].getCompartmentValue("Name");
									disName = await getFullName(disName);
									ObjectUnionOf.axiom.push({IRI: disName});
								}
								ontologyObject.push(disjointObject);
							}
						}

						// const className1 = await subject.getCompartmentValue("Name");
						// const className3 = await object.getCompartmentValue("Name");
					}
					for(let d = 0; d < subClasses.length; d++){
							const subClassName = await subClasses[d].getCompartmentValue("Name");
							ontologyObject = createExportStructureElement(ontology, "Class", subClassName);
							let subClassObject = {type: "SubClassOf", axiom : []}
							subClassObject.axiom.push({IRI:  await getFullName(subClassName)})
							subClassObject.axiom.push({IRI:  await getFullName(className)})
							ontologyObject.push(subClassObject);
					}
				} else if(elem_type[elemType]["name"] === "EquivalentClasses" || elem_type[elemType]["name"] === "DisjointClasses"){
					let classes = await getElementsFromPath2(["start", "end"], elemOWLGrEd)
					let classes2 = await getElementsFromPath2(["end", "start"], elemOWLGrEd)
					classes = classes.concat(classes2);

					if(classes.length > 1){
						const className = await classes[0].getCompartmentValue("Name");
						ontologyObject = createExportStructureElement(ontology, "Class", className);
						let disjointObject = {type: elem_type[elemType]["name"], axiom : []}
						for(let d = 0; d < classes.length; d++){
							let disName = await classes[d].getCompartmentValue("Name");
							disName = await getFullName(disName);
							disjointObject.axiom.push({IRI: disName});
						}
						ontologyObject.push(disjointObject);
					}
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
								const className = await classes[c].getCompartmentValue("Name");
								ontologyObject = createExportStructureElement(ontology, "Ontology", "Ontology");
								let annotationObject = {};
								annotationObject.type = "AnnotationAssertion";
								annotationObject.axiom = [];
								annotationObject.axiom.push({axiomSymbol: annotationType})

								annotationObject.axiom.push({IRI: await getFullName(className)})
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

	console.log("OOOOOOOOOOOOOOO", ontology);
	return ontology;
	// generateFunctionalSyntax(ontology);
	// generateN3Syntax(ontology, "text/turtle");
	// generateN3Syntax(ontology, "text/n3");
	// generateN3Syntax(ontology, "application/n-triples");
	// generateN3Syntax(ontology, "application/trig");
	// const mimeMap = {
		// 'text/turtle': 'text/turtle;charset=utf-8',
		// 'application/rdf+xml': 'application/rdf+xml;charset=utf-8',
		// 'application/n-triples': 'application/n-triples;charset=utf-8',
		// 'text/n3': 'text/n3;charset=utf-8',
		// 'application/ld+json': 'application/ld+json;charset=utf-8'
	// };
	// generateRDFLibSyntax(ontology, "application/ld+json");
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
  const iri = (onto && (onto.iri || onto.IRI || onto.ontologyIRI)) || 'ontology';
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

function guessFilenameN3(onto, format) {
  const iri = (onto && (onto.iri || onto.IRI || onto.ontologyIRI)) || 'ontology';
  const localName = iri.split(/[\/#]/).filter(Boolean).pop() || 'ontology';

  const extMap = {
    'text/turtle': 'ttl',
    'text/n3': 'n3',
    'application/n-triples': 'nt',
    'application/trig': 'trig'
  };

  const ext = extMap[format] || 'ttl';
  return `${localName}.${ext}`;
}

function mimeForFormatN3(format) {
  const mimeMap = {
    'text/turtle': 'text/turtle;charset=utf-8',
    'text/n3': 'text/n3;charset=utf-8',
    'application/n-triples': 'application/n-triples;charset=utf-8',
    'application/trig': 'application/trig;charset=utf-8'
  };

  return mimeMap[format] || 'text/turtle;charset=utf-8';
}

function generateRDFLibSyntax(onto,format){

	const cleanObject = JSON.parse(JSON.stringify(onto));
	Meteor.call('generateOwlRDFLib', onto, namespaceTable, format, (err, result) => {
	  if (err) {
		  console.error('Error generating:', err);
		  return;
		}

		console.log('Output:\n', result);

		// Trigger browser download
		const filename = guessFilename(onto, format);
		const mime = mimeForFormat(format);
		downloadTextAsFile(result, filename, mime);
	});
}

function generateN3Syntax(onto, format){
	let ontology = onto.Ontology;
	let classes = onto.Class;
	let annotationProperties = onto.AnnotationProperty;
	let dataTypes = onto.DataType;
	let objectProperties = onto.ObjectProperty;
	let datatypeProperty = onto.DatatypeProperty;
	let namedIndividual = onto.NamedIndividual;
	let negativePropertyAssertion = onto.NegativePropertyAssertion;

	const annotationPropertyTypes = {
	  "rdfs:label": "http://www.w3.org/2000/01/rdf-schema#label",
	  "rdfs:comment": "http://www.w3.org/2000/01/rdf-schema#comment",
	  "rdfs:seeAlso": "http://www.w3.org/2000/01/rdf-schema#seeAlso",
	  "rdfs:isDefinedBy": "http://www.w3.org/2000/01/rdf-schema#isDefinedBy",

	  "owl:versionInfo": "http://www.w3.org/2002/07/owl#versionInfo",
	  "owl:priorVersion": "http://www.w3.org/2002/07/owl#priorVersion",
	  "owl:backwardCompatibleWith": "http://www.w3.org/2002/07/owl#backwardCompatibleWith",
	  "owl:incompatibleWith": "http://www.w3.org/2002/07/owl#incompatibleWith",

	  "dc:title": "http://purl.org/dc/elements/1.1/title",
	  "dc:creator": "http://purl.org/dc/elements/1.1/creator",
	  "dc:description": "http://purl.org/dc/elements/1.1/description",

	  "skos:definition": "http://www.w3.org/2004/02/skos/core#definition",
	  "skos:altLabel": "http://www.w3.org/2004/02/skos/core#altLabel",
	  "skos:prefLabel": "http://www.w3.org/2004/02/skos/core#prefLabel",

	  "owl:annotatedSource": "http://www.w3.org/2002/07/owl#annotatedSource",
	  "owl:annotatedProperty": "http://www.w3.org/2002/07/owl#annotatedProperty",
	  "owl:annotatedTarget": "http://www.w3.org/2002/07/owl#annotatedTarget",

	  "rdf:reifies": "http://www.w3.org/1999/02/22-rdf-syntax-ns#reifies"
	};



	const { namedNode, quad, blankNode } = DataFactory;

		// Create a Turtle writer
		const writer = new Writer({ format: format, prefixes: {
		  owl: 'http://www.w3.org/2002/07/owl#',
		  rdfs: 'http://www.w3.org/2000/01/rdf-schema#'
		}});

		// writer.addPrefix('foaf', 'http://xmlns.com/foaf/0.1/');
    for (const key of Object.keys(namespaceTable)){
      if(key === ":")  writer.addPrefix("", namespaceTable[key]);
      else writer.addPrefix(key, namespaceTable[key]);
    }


	for (const key of Object.keys(ontology)) {
		if(key === "iri"){
			writer.addQuad(
				quad(
				  namedNode(ontology[key]),
				  namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
				  namedNode("http://www.w3.org/2002/07/owl#Ontology")
				)
			);
		}else{
		  for (const clazz of Object.keys(ontology[key])) {
			let axiomObject = ontology[key][clazz];

			if (axiomObject.type === "Annotation") {

			  let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol];
			  let annotationValue = axiomObject.axiom[1]?.value;
			  let annotationLanguage = axiomObject.axiom[2]?.language;
			  if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;

			  if (annotationType && annotationValue) {
				writer.addQuad(
				  quad(
					namedNode(namespaceTable[":"]),
					namedNode(annotationType),
					literal(annotationValue)
				  )
				);
			  }
			}else if (axiomObject.type === "AnnotationAssertion") {
			  let classIRI = axiomObject.axiom[1]?.IRI;
			  let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol];
			  let annotationValue = axiomObject.axiom[2]?.value;
			  let annotationLanguage = axiomObject.axiom[3]?.language;
			  if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;

			  if (classIRI && annotationType && annotationValue) {
				writer.addQuad(
				  quad(
					namedNode(classIRI),
					namedNode(annotationType),
					literal(annotationValue)
				  )
				);
			  }
			}
		  }
		}
	}

	for (const key of Object.keys(classes)) {
	  for (const clazz of Object.keys(classes[key])) {
		let axiomObject = classes[key][clazz];

		if (axiomObject.type === "Declaration" && axiomObject.axiom.type === "Class") {
		  const classIRI = axiomObject.axiom.axiom.IRI;
		  writer.addQuad(
			quad(
			  namedNode(classIRI),
			  namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
			  namedNode('http://www.w3.org/2002/07/owl#Class')
			)
		  );
		} else if (axiomObject.type === "Declaration" && axiomObject.axiom.type === "DataProperty") {
		  const classIRI = axiomObject.axiom.axiom.IRI;
		  writer.addQuad(
			quad(
			  namedNode(classIRI),
			  namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
			  namedNode('http://www.w3.org/2002/07/owl#DatatypeProperty')
			)
		  );
		} else if (axiomObject.type === "DataPropertyDomain") {
		  const attrIRI = axiomObject.axiom[0].IRI;
		  const classIRI = axiomObject.axiom[1].IRI;
		  writer.addQuad(
			quad(
			  namedNode(attrIRI),
			  namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
			  namedNode(classIRI)
			)
		  );
		} else if (axiomObject.type === "DataPropertyRange") {
		  const attrIRI = axiomObject.axiom[0].IRI;
		  const classIRI = axiomObject.axiom[1].IRI;
		  writer.addQuad(
			quad(
			  namedNode(attrIRI),
			  namedNode('http://www.w3.org/2000/01/rdf-schema#range'),
			  namedNode(classIRI)
			)
		  );
		} else if (axiomObject.type === "FunctionalDataProperty") {
		  const classIRI = axiomObject.axiom.IRI;
		  writer.addQuad(
			quad(
			  namedNode(classIRI),
			  namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
			  namedNode('http://www.w3.org/2002/07/owl#FunctionalProperty')
			)
		  );
		}else if(axiomObject.type === "EquivalentDataProperties" || axiomObject.type === "DisjointDataProperties" || axiomObject.type === "SubDataPropertyOf"){

			let typeList = {
				"EquivalentDataProperties":'http://www.w3.org/2002/07/owl#equivalentProperty',
				"SubDataPropertyOf":'http://www.w3.org/2000/01/rdf-schema#subPropertyOf',
				"DisjointDataProperties":'http://www.w3.org/2002/07/owl#propertyDisjointWith'

			}
			// Base property (the first one)
			const axiom = axiomObject.axiom;
			const base = namedNode(axiom[0].IRI);
			let predicate = typeList[axiomObject.type]
			// Add owl:equivalentProperty triples for the rest
			for (let i = 1; i < axiom.length; i++) {

			  writer.addQuad(
				quad(base, namedNode(predicate), namedNode(axiom[i].IRI))
			  );
			}

		}
		else if (
		  axiomObject.type === "EquivalentClasses" ||
		  axiomObject.type === "DisjointClasses" ||
		  axiomObject.type === "SubClassOf"
		) {

		  let typeList = {
			EquivalentClasses: 'http://www.w3.org/2002/07/owl#equivalentClass',
			SubClassOf: 'http://www.w3.org/2000/01/rdf-schema#subClassOf',
			DisjointClasses: 'http://www.w3.org/2002/07/owl#disjointWith'
		  };
		  // complementOf
		  if (
			typeof axiomObject.axiom.type !== "undefined" &&
			axiomObject.axiom.type === "ObjectComplementOf"
		  ) {
			const complement = blankNode();

			writer.addQuad(
			  quad(
				complement,
				namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
				namedNode('http://www.w3.org/2002/07/owl#Class')
			  )
			);
			writer.addQuad(
			  quad(
				complement,
				namedNode('http://www.w3.org/2002/07/owl#complementOf'),
				namedNode(axiomObject.axiom.axiom.IRI)
			  )
			);
			writer.addQuad(
			  quad(
				namedNode(axiomObject.axiom.IRI),
				namedNode('http://www.w3.org/2002/07/owl#equivalentClass'),
				complement
			  )
			);
		  } else if(typeof axiomObject.axiom[1] !== "undefined" && typeof axiomObject.axiom[1].type !== "undefined" && axiomObject.axiom[1].type.indexOf("Cardinality") !== -1){
			  const clsIRI   = axiomObject.axiom[0].IRI;
			  const part     = axiomObject.axiom[1];
			  const n        = part.axiom[0].Number;
			  const propIRI  = part.axiom[1].IRI;
			  const dtypeIRI = part.axiom[2]?.IRI; // may be undefined

			  // SubClassOf(:Class _:r)
			  const r = blankNode();
			  writer.addQuad(quad(namedNode(clsIRI), namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf"), r));
			  writer.addQuad(quad(r, namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), namedNode("http://www.w3.org/2002/07/owl#Restriction")));
			  writer.addQuad(quad(r, namedNode("http://www.w3.org/2002/07/owl#onProperty"), namedNode(propIRI)));

			  // number literal must be xsd:nonNegativeInteger
			  const nLit = literal(String(n), namedNode("http://www.w3.org/2001/XMLSchema#nonNegativeInteger"));

			  // Map FS keywords to RDF predicates (qualified/unqualified)
			  const predUnq = {
				DataMinCardinality:  "http://www.w3.org/2002/07/owl#minCardinality",
				DataMaxCardinality:  "http://www.w3.org/2002/07/owl#maxCardinality",
				DataExactCardinality: "http://www.w3.org/2002/07/owl#cardinality"
			  };
			  const predQ = {
				DataMinCardinality:  "http://www.w3.org/2002/07/owl#minQualifiedCardinality",
				DataMaxCardinality:  "http://www.w3.org/2002/07/owl#maxQualifiedCardinality",
				DataExactCardinality: "http://www.w3.org/2002/07/owl#qualifiedCardinality"
			  };

			  if (dtypeIRI) {
				// Qualified cardinality
				writer.addQuad(quad(r, namedNode(predQ[part.type]), nLit));
				writer.addQuad(quad(r, namedNode("http://www.w3.org/2002/07/owl#onDataRange"), namedNode(dtypeIRI)));
			  } else {
				// Unqualified cardinality
				writer.addQuad(quad(r, namedNode(predUnq[part.type]), nLit));
				// no owl:onDataRange
			  }
		  } else if(axiomObject.type === "EquivalentClasses" && typeof axiomObject.axiom[1] !== "undefined" && axiomObject.axiom[1].type === "ObjectUnionOf"){
			  // left side class
			  const left = namedNode(axiomObject.axiom[0].IRI);

			  // union operands (any count)
			  const unionPart = axiomObject.axiom[1];
			  if (unionPart.type !== "ObjectUnionOf") {
				throw new Error("Expected ObjectUnionOf in axiomObject.axiom[1]");
			  }
			  const members = unionPart.axiom.map(x => namedNode(x.IRI));

			  // create a blank node for the class expression (union)
			  const unionBNode = blankNode();

			  // _:u a owl:Class ; owl:unionOf ( members... )
			  writer.addQuad(quad(unionBNode, namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), namedNode("http://www.w3.org/2002/07/owl#Class")));

			  const listTerm = rdfList(writer, members); // or: writer.list(members)

			  writer.addQuad(quad(unionBNode, namedNode("http://www.w3.org/2002/07/owl#unionOf"), listTerm));

			  // :C owl:equivalentClass _:u
			  writer.addQuad(quad(left, namedNode("http://www.w3.org/2002/07/owl#equivalentClass"), unionBNode));
		  } else {
			let classIRI = axiomObject.axiom[0].IRI;

			if (typeof axiomObject.axiom[1].IRI === "undefined") {
			  for (let i = 0; i < axiomObject.axiom[1].length; i++) {
				writer.addQuad(
				  quad(
					namedNode(classIRI),
					namedNode(typeList[axiomObject.type]),
					namedNode(axiomObject.axiom[1][i].IRI)
				  )
				);
			  }
			} else if(axiomObject.axiom.length > 2){
				// Create a blank node for the disjoint classes collection
				const disjointCollection = blankNode();

				// 1. Declare AllDisjointClasses
				writer.addQuad(
				  disjointCollection,
				  namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
				  namedNode('http://www.w3.org/2002/07/owl#AllDisjointClasses')
				);

				// 2. Build RDF list of classes
				const nil = namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil');
				let list = nil;

				// Process in reverse order to build list properly
				for (let i = axiomObject.axiom.length - 1; i >= 0; i--) {
				  const listNode = blankNode();
				  const classIRI = namedNode(axiomObject.axiom[i].IRI);

				  writer.addQuad(listNode, namedNode('rdf:first'), classIRI);
				  writer.addQuad(listNode, namedNode('rdf:rest'), list);
				  list = listNode;
				}

				// 3. Connect list to AllDisjointClasses
				writer.addQuad(
				  disjointCollection,
				  namedNode('http://www.w3.org/2002/07/owl#members'),
				  list
				);

			} else {
			  writer.addQuad(
				quad(
				  namedNode(classIRI),
				  namedNode(typeList[axiomObject.type]),
				  namedNode(axiomObject.axiom[1].IRI)
				)
			  );
			}
		  }
		} else if (axiomObject.type === "AnnotationAssertion") {
		  let classIRI = axiomObject.axiom[1]?.IRI;
		  let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol];
		  let annotationValue = axiomObject.axiom[2]?.value;
		  let annotationLanguage = axiomObject.axiom[3]?.language;
		  if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;

		  if (classIRI && annotationType && annotationValue) {
			writer.addQuad(
			  quad(
				namedNode(classIRI),
				namedNode(annotationType),
				literal(annotationValue)
			  )
			);
		  }
		} else if (axiomObject.type === "HasKey") {
			  const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
			  const OWL = 'http://www.w3.org/2002/07/owl#';
			  const [cls, propsBox] = axiomObject.axiom;
			  if (!cls?.IRI) throw new Error('HasKey: missing class IRI');
			  if (!propsBox || !Array.isArray(propsBox.axiom) || propsBox.axiom.length === 0) {
				throw new Error('HasKey: properties list is empty');
			  }

			  // Build list members
			  const members = propsBox.axiom.map(p => {
				if (p.inverseOf) {
				  const inv = blankNode();
				  writer.addQuad(inv, namedNode(OWL + 'inverseOf'), namedNode(p.IRI));
				  return inv;
				} else {
				  return namedNode(p.IRI);
				}
			  });

			  // Build RDF list in reverse
			  let listHead = namedNode(RDF + 'nil');
			  for (let i = members.length - 1; i >= 0; i--) {
				const cell = blankNode();
				writer.addQuad(cell, namedNode(RDF + 'first'), members[i]);
				writer.addQuad(cell, namedNode(RDF + 'rest'), listHead);
				listHead = cell;
			  }

			  // <Class> owl:hasKey ( ... )
			  writer.addQuad(namedNode(cls.IRI), namedNode(OWL + 'hasKey'), listHead);
		}
	  }
	}

	for (const key of Object.keys(dataTypes)) {
       for (const clazz of Object.keys(dataTypes[key])) {
		let axiomObject = dataTypes[key][clazz];
		if (axiomObject.type === "Declaration" && axiomObject.axiom.type === "Datatype") {
			const subject = axiomObject.axiom.axiom.IRI;
			writer.addQuad(
				quad(
					namedNode(subject),
					namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
					namedNode('http://www.w3.org/2000/01/rdf-schema#Datatype')
				)
			);
		}else if(axiomObject.type === "AnnotationAssertion"){
			let classIRI = axiomObject.axiom[1]?.IRI;
			let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol];
			let annotationValue = axiomObject.axiom[2]?.value;
			let annotationLanguage = axiomObject.axiom[3]?.language;
		    if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;

			if (classIRI && annotationType && annotationValue) {
			 writer.addQuad(
				quad(
				  namedNode(classIRI),
				  namedNode(annotationType),
				  literal(annotationValue)
				)
			  );
			}
		} else if (axiomObject.type === "DataTypeDefinition") {
		  const dt = axiomObject.axiom[0].IRI;
		  const dtdefinition = axiomObject.axiom[1].type;
		  writer.addQuad(
			quad(
			  namedNode(dt),
			  namedNode('http://www.w3.org/2002/07/owl#onDatatype'),
			  namedNode(dtdefinition)
			)
		  );
		}
	}
 }

 for (const key of Object.keys(annotationProperties)) {
   for (const clazz of Object.keys(annotationProperties[key])) {
		let axiomObject = annotationProperties[key][clazz];
		if (axiomObject.type === "Declaration" && axiomObject.axiom.type === "AnnotationProperty") {
			const classIRI = axiomObject.axiom.axiom.IRI;
			writer.addQuad(
				quad(
					namedNode(classIRI),
					namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
					namedNode('http://www.w3.org/2002/07/owl#AnnotationProperty')
				)
			);
		} else if(axiomObject.type === "AnnotationPropertyDomain" || axiomObject.type === "AnnotationPropertyRange"){
        if(typeof axiomObject.axiom[1].IRI !== "undefined"){
			let typeList = {
					"AnnotationPropertyDomain":'http://www.w3.org/2000/01/rdf-schema#domain',
					"AnnotationPropertyRange":'http://www.w3.org/2000/01/rdf-schema#range'
				 }
		   writer.addQuad(
			quad(
			  namedNode(axiomObject.axiom[0].IRI),
			  namedNode(typeList[axiomObject.type]),
			  namedNode(axiomObject.axiom[1].IRI)
			)
			);
		}
    } else if(axiomObject.type === "SubAnnotationPropertyOf"){
        let subject = axiomObject.axiom[0].IRI;
        for (let i = 0; i < axiomObject.axiom[1].length; i++) {
          let predicate = "http://www.w3.org/2000/01/rdf-schema#subPropertyOf";
          let object = axiomObject.axiom[1][i].IRI;
          writer.addQuad(
          quad(
            namedNode(subject),
            namedNode(predicate),
            namedNode(object)
          )
          );
        }

    } else if(axiomObject.type === "AnnotationAssertion"){
			let classIRI = axiomObject.axiom[1]?.IRI;
			let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol];
			let annotationValue = axiomObject.axiom[2]?.value;
			let annotationLanguage = axiomObject.axiom[3]?.language;
		    if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;

			if (classIRI && annotationType && annotationValue) {
			 writer.addQuad(
				quad(
				  namedNode(classIRI),
				  namedNode(annotationType),
				  literal(annotationValue)
				)
			  );
			}
		}
	 }
  }

  for (const key of Object.keys(namedIndividual)) {
    for (const clazz of Object.keys(namedIndividual[key])) {
		  let axiomObject = namedIndividual[key][clazz];
		  if (axiomObject.type === "Declaration" && axiomObject.axiom.type === "NamedIndividual") {
        const classIRI = axiomObject.axiom.axiom.IRI;
        writer.addQuad(
          quad(
            namedNode(classIRI),
            namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
            namedNode('http://www.w3.org/2002/07/owl#NamedIndividual')
          )
        );
      } else if (axiomObject.type === "ClassAssertion") {
        const subject = axiomObject.axiom[0].IRI;
        const object = axiomObject.axiom[1].IRI;
		if(typeof subject !== "undefined" && typeof object !== "undefined"){
			writer.addQuad(
			  quad(
				namedNode(object),
				namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
				namedNode(subject)
			  )
			);
		}
      } else if(axiomObject.type === "AnnotationAssertion"){
        let classIRI = axiomObject.axiom[1]?.IRI;
        let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol];
        let annotationValue = axiomObject.axiom[2]?.value;
		let annotationLanguage = axiomObject.axiom[3]?.language;
		if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;

        if (classIRI && annotationType && annotationValue) {
         writer.addQuad(
          quad(
            namedNode(classIRI),
            namedNode(annotationType),
            literal(annotationValue)
          )
          );
        }
      } else if(axiomObject.type === "SameIndividual" || axiomObject.type === "DifferentIndividuals"){
        let typeList = {
          "SameIndividual":'http://www.w3.org/2002/07/owl#sameAs',
          "DifferentIndividuals":'http://www.w3.org/2002/07/owl#differentFrom'
        }
        let subject = axiomObject.axiom[0].IRI;
		let predicate = typeList[axiomObject.type]
		if(typeof axiomObject.axiom[1].IRI !== "undefined"){
			let object = axiomObject.axiom[1].IRI;
			  writer.addQuad(
			  quad(
				namedNode(subject),
				namedNode(predicate),
				namedNode(object)
			  )
			);
		} else {
			for (let i = 0; i < axiomObject.axiom[1].length; i++) {
			  let object = axiomObject.axiom[1][i].IRI;

			  writer.addQuad(
			  quad(
				namedNode(subject),
				namedNode(predicate),
				namedNode(object)
			  )
			  );
			}
		}
	  } else if(axiomObject.type === "SameAsIndivids" ){
		// Namespaces
		const OWL = 'http://www.w3.org/2002/07/owl#';


		// Step 1: Convert to NamedNodes
		const individuals = axiomObject.axiom.map(x => namedNode(x.IRI));

		// Step 2: Add pairwise owl:sameAs triples
		for (let i = 0; i < individuals.length; i++) {
		  for (let j = i + 1; j < individuals.length; j++) {
			writer.addQuad(individuals[i], namedNode(OWL + 'sameAs'), individuals[j]);
			writer.addQuad(individuals[j], namedNode(OWL + 'sameAs'), individuals[i]);
		  }
		}


      } else if(axiomObject.type === "DifferentIndivids"){
		// Namespaces
		const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
		const OWL = 'http://www.w3.org/2002/07/owl#';

		// Step 1: Create a blank node for the axiom
		const differentAxiom = blankNode();

		// Step 2: Declare as owl:AllDifferent
		writer.addQuad(
		  differentAxiom,
		  namedNode(RDF + 'type'),
		  namedNode(OWL + 'AllDifferent')
		);

		// Step 3: Build RDF list of individuals (in reverse order)
		let list = namedNode(RDF + 'nil');
		for (let i = axiomObject.axiom.length - 1; i >= 0; i--) {
		  const listNode = blankNode();
		  const individualIRI = namedNode(axiomObject.axiom[i].IRI);

		  writer.addQuad(listNode, namedNode(RDF + 'first'), individualIRI);
		  writer.addQuad(listNode, namedNode(RDF + 'rest'), list);
		  list = listNode;
		}

		// Step 4: Attach the list with owl:members
		writer.addQuad(
		  differentAxiom,
		  namedNode(OWL + 'members'),
		  list
		);


      } else if(axiomObject.type === "DataPropertyAssertion"){
		  let objectLiteral;

		  if (axiomObject.axiom[3] && axiomObject.axiom[3].type) {
			objectLiteral = literal(axiomObject.axiom[2].value, namedNode(axiomObject.axiom[3].type));
		  } else {
			objectLiteral = literal(axiomObject.axiom[2].value);
		  }

		  writer.addQuad(
			quad(namedNode(axiomObject.axiom[1].IRI), namedNode(axiomObject.axiom[0].IRI), objectLiteral)
		  );


	  } else if(axiomObject.type === "NegativeDataPropertyAssertion"){
		const neg = blankNode();

		writer.addQuad(quad(neg, namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
								 namedNode("http://www.w3.org/2002/07/owl#NegativePropertyAssertion")));

		writer.addQuad(quad(neg, namedNode("http://www.w3.org/2002/07/owl#sourceIndividual"),
								 namedNode(axiomObject.axiom[1].IRI)));

		writer.addQuad(quad(neg, namedNode("http://www.w3.org/2002/07/owl#assertionProperty"),
								 namedNode(axiomObject.axiom[0].IRI)));

		// owl:targetValue "value" [^^datatype] — datatype optional
		let objectLiteral;
		if (axiomObject.axiom[3] && axiomObject.axiom[3].type) {
		  objectLiteral = literal(
			axiomObject.axiom[2].value,
			namedNode(axiomObject.axiom[3].type)
		  );
		} else {
		  objectLiteral = literal(axiomObject.axiom[2].value);
		}

		writer.addQuad(
		  quad(
			neg,
			namedNode("http://www.w3.org/2002/07/owl#targetValue"),
			objectLiteral
		  )
		);
	  } else if(axiomObject.type === "ObjectPropertyAssertion"){
		  writer.addQuad(
			quad(namedNode(axiomObject.axiom[1].IRI), namedNode(axiomObject.axiom[0].IRI), namedNode(axiomObject.axiom[2].IRI))
		  );
	  } else if(axiomObject.type === "NegativeObjectPropertyAssertion"){
		  const neg = blankNode();

		writer.addQuad(quad(neg, namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
								 namedNode("http://www.w3.org/2002/07/owl#NegativePropertyAssertion")));

		writer.addQuad(quad(neg, namedNode("http://www.w3.org/2002/07/owl#sourceIndividual"),
								 namedNode(axiomObject.axiom[1].IRI)));

		writer.addQuad(quad(neg, namedNode("http://www.w3.org/2002/07/owl#assertionProperty"),
								 namedNode(axiomObject.axiom[0].IRI)));

		writer.addQuad(quad(neg, namedNode("http://www.w3.org/2002/07/owl#targetIndividual"),
								 namedNode(axiomObject.axiom[2].IRI)));
	  }
	 }
  }


	for (const key of Object.keys(objectProperties)) {
       for (const clazz of Object.keys(objectProperties[key])) {
		let axiomObject = objectProperties[key][clazz];

		if (axiomObject.type === "Declaration" && axiomObject.axiom.type === "ObjectProperty") {
			const classIRI = axiomObject.axiom.axiom.IRI;
			if(typeof classIRI !== "undefined"){
				writer.addQuad(
					quad(
						namedNode(classIRI),
						namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
						namedNode('http://www.w3.org/2002/07/owl#ObjectProperty')
					)
				);
			}
		} else if(axiomObject.type === "ObjectPropertyDomain" || axiomObject.type === "ObjectPropertyRange" || axiomObject.type === "InverseObjectProperties"){
			let axiomList = {
				"ObjectPropertyDomain":'http://www.w3.org/2000/01/rdf-schema#domain',
				"ObjectPropertyRange":'http://www.w3.org/2000/01/rdf-schema#range',
				"InverseObjectProperties":'http://www.w3.org/2002/07/owl#inverseOf'

			}
			let subject = axiomObject.axiom[0].IRI;
			let predicate = axiomList[axiomObject.type];
			let object = axiomObject.axiom[1].IRI;

			if(subject && predicate && object && typeof subject !== "undefined"&& typeof predicate !== "undefined"&& typeof object !== "undefined"){
				writer.addQuad(
					quad(
						namedNode(subject),
						namedNode(predicate),
						namedNode(object)
					)
				);
			}
		} else if (typeof axiomObject.type !== "undefined" && axiomObject.type === "SubClassOf"){
			if(typeof axiomObject.axiom[1] !== "undefined" && axiomObject.axiom[1].type.indexOf("Cardinality") !== -1){
			 const clsIRI  = axiomObject.axiom[0].IRI;
				const part    = axiomObject.axiom[1];           // type: ObjectMin/Max/ExactCardinality
				const n       = part.axiom[0].Number;           // the number
				const propIRI = part.axiom[1].IRI;              // object property
				const classIRI = part.axiom[2]?.IRI;            // optional filler class for qualified form

				// _:r restriction node
				const r = blankNode();

				writer.addQuad(quad(
				  namedNode(clsIRI),
				  namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf"),
				  r
				));

				writer.addQuad(quad(
				  r,
				  namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
				  namedNode("http://www.w3.org/2002/07/owl#Restriction")
				));

				writer.addQuad(quad(
				  r,
				  namedNode("http://www.w3.org/2002/07/owl#onProperty"),
				  namedNode(propIRI)
				));

				// "n"^^xsd:nonNegativeInteger
				const nLit = literal(
				  String(n),
				  namedNode("http://www.w3.org/2001/XMLSchema#nonNegativeInteger")
				);

				// predicate maps for object property cardinalities
				const predUnq = {
				  ObjectMinCardinality:   "http://www.w3.org/2002/07/owl#minCardinality",
				  ObjectMaxCardinality:   "http://www.w3.org/2002/07/owl#maxCardinality",
				  ObjectExactCardinality: "http://www.w3.org/2002/07/owl#cardinality"
				};

				const predQ = {
				  ObjectMinCardinality:   "http://www.w3.org/2002/07/owl#minQualifiedCardinality",
				  ObjectMaxCardinality:   "http://www.w3.org/2002/07/owl#maxQualifiedCardinality",
				  ObjectExactCardinality: "http://www.w3.org/2002/07/owl#qualifiedCardinality"
				};

				if (classIRI) {
				  // Qualified: add *QualifiedCardinality* and owl:onClass
				  writer.addQuad(quad(r, namedNode(predQ[part.type]), nLit));
				  writer.addQuad(quad(
					r,
					namedNode("http://www.w3.org/2002/07/owl#onClass"),
					namedNode(classIRI)
				  ));
				} else {
				  // Unqualified: plain cardinality, no filler
				  writer.addQuad(quad(r, namedNode(predUnq[part.type]), nLit));
				}
			} else {
			 let axiomList = { "ObjectSomeValuesFrom":'http://www.w3.org/2002/07/owl#someValuesFrom', "ObjectAllValuesFrom":'http://www.w3.org/2002/07/owl#allValuesFrom' }
			  const r = blankNode();

			  // :A rdfs:subClassOf _:r .
			  writer.addQuad(quad(
				namedNode(axiomObject.axiom[0].IRI),
				namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf"),
				r
			  ));

			  // _:r a owl:Restriction .
			  writer.addQuad(quad(r, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode("http://www.w3.org/2002/07/owl#Restriction")));

			  // figure out onProperty target
			  // p2 shape: axiom[1].axiom[0] = { IRI: ... }
			  // p  shape: axiom[1].axiom[0] = { type: "ObjectInverseOf", axiom: { IRI: ... } }
			  const propPart = axiomObject.axiom[1].axiom[0];
			  let onPropObject;
			  if (typeof propPart.axiom !== "undefined" && propPart.axiom.type === "ObjectInverseOf") {
				// _:pe owl:inverseOf :propRest .
				const pe = blankNode();
				writer.addQuad(quad(pe, namedNode("http://www.w3.org/2002/07/owl#inverseOf"), namedNode(propPart.axiom.axiom.IRI)));
				onPropObject = pe; // owl:onProperty points to the blank node

			  } else {
				// direct property
				onPropObject = namedNode(propPart.IRI);
			  }

			  // _:r owl:onProperty X .
			  writer.addQuad(quad(r, namedNode("http://www.w3.org/2002/07/owl#onProperty"), onPropObject));

			  // _:r (some|all)ValuesFrom :B .
			  const restrType = axiomObject.axiom[1].type; // "ObjectSomeValuesFrom" | "ObjectAllValuesFrom"
			  writer.addQuad(quad(
				r,
				namedNode(axiomList[restrType]),
				namedNode(axiomObject.axiom[1].axiom[1].IRI)
			  ));
			}
		} else if(axiomObject.type === "EquivalentObjectProperties" || axiomObject.type === "DisjointObjectProperties" || axiomObject.type === "SubObjectPropertyOf"){
			let typeList = {
				"EquivalentObjectProperties":'http://www.w3.org/2002/07/owl#equivalentProperty',
				"SubObjectPropertyOf":'http://www.w3.org/2000/01/rdf-schema#subPropertyOf',
				"DisjointObjectProperties":'http://www.w3.org/2002/07/owl#propertyDisjointWith'

			}
			let subject = axiomObject.axiom[0].IRI;

			if(typeof axiomObject.axiom[1].axiom !== "undefined" && typeof axiomObject.axiom[1].axiom.type !== "undefined" && axiomObject.axiom[1].axiom.type === "ObjectPropertyChain"){
				const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
				const OWL = 'http://www.w3.org/2002/07/owl#';

				// build a term for each item in the chain, wrapping inverses in a bnode
				function termFor(item) {
				  if (item.inverseOf) {
					const inv = blankNode();
					writer.addQuad(inv, namedNode(OWL + 'inverseOf'), namedNode(item.IRI));
					return inv;
				  }
				  return namedNode(item.IRI);
				}

				const superProp = namedNode(axiomObject.axiom[0].IRI);
				const chainItems = axiomObject.axiom[1].axiom.axiom.map(termFor);

				// helper to create an RDF list: _:h rdf:first ... ; rdf:rest ...
				function addList(elements) {
				  const head = blankNode();
				  let cur = head;
				  for (let i = 0; i < elements.length; i++) {
					writer.addQuad(cur, namedNode(RDF + 'first'), elements[i]);
					if (i === elements.length - 1) {
					  writer.addQuad(cur, namedNode(RDF + 'rest'), namedNode(RDF + 'nil'));
					} else {
					  const next = blankNode();
					  writer.addQuad(cur, namedNode(RDF + 'rest'), next);
					  cur = next;
					}
				  }
				  return head;
				}

				const listHead = addList(chainItems);
				writer.addQuad(superProp, namedNode(OWL + 'propertyChainAxiom'), listHead);
			} else {
				for (let i = 0; i < axiomObject.axiom[1].length; i++) {
				  let predicate = typeList[axiomObject.type]
				  let object = axiomObject.axiom[1][i].IRI;
				  writer.addQuad(
					quad(
					  namedNode(subject),
					  namedNode(predicate),
					  namedNode(object)
					)
				  );
				}
			}
		} else if (axiomObject.type === "FunctionalObjectProperty" || axiomObject.type === "InverseFunctionalObjectProperty" || axiomObject.type === "SymmetricObjectProperty" || axiomObject.type === "AsymmetricObjectProperty" || axiomObject.type === "ReflexiveObjectProperty" || axiomObject.type === "IrreflexiveObjectProperty" || axiomObject.type === "TransitiveObjectProperty") {
			const subject = axiomObject.axiom[1].IRI;
			if(typeof axiomObject.axiom[1].IRI !== "undefined"){
				const objectPropertyTypes = {
				  "FunctionalObjectProperty": "http://www.w3.org/2002/07/owl#FunctionalProperty",
				  "InverseFunctionalObjectProperty": "http://www.w3.org/2002/07/owl#InverseFunctionalProperty",
				  "SymmetricObjectProperty": "http://www.w3.org/2002/07/owl#SymmetricProperty",
				  "AsymmetricObjectProperty": "http://www.w3.org/2002/07/owl#AsymmetricProperty",
				  "ReflexiveObjectProperty": "http://www.w3.org/2002/07/owl#ReflexiveProperty",
				  "IrreflexiveObjectProperty": "http://www.w3.org/2002/07/owl#IrreflexiveProperty",
				  "TransitiveObjectProperty": "http://www.w3.org/2002/07/owl#TransitiveProperty"
				};

				writer.addQuad(
					quad(
						namedNode(subject),
						namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
						namedNode(objectPropertyTypes[axiomObject.type])
					)
				);
			}
		} else if(axiomObject.type === "AnnotationAssertion"){
			let classIRI = axiomObject.axiom[1]?.IRI;
			let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol];
			let annotationValue = axiomObject.axiom[2]?.value;
			let annotationLanguage = axiomObject.axiom[3]?.language;
		    if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;

			if (classIRI && annotationType && annotationValue) {
			 writer.addQuad(
				quad(
				  namedNode(classIRI),
				  namedNode(annotationType),
				  literal(annotationValue)
				)
			  );

			  // Recursive function to add annotations (with support for nesting)
				function addAnnotationTriple(sourceSubject, sourcePredicate, sourceObject, annotation) {
				  const axiom = blankNode();

				  writer.addQuad(quad(axiom, namedNode('rdf:type'), namedNode('owl:Axiom')));
				  writer.addQuad(quad(axiom, namedNode('owl:annotatedSource'), sourceSubject));
				  writer.addQuad(quad(axiom, namedNode('owl:annotatedProperty'), sourcePredicate));
				  writer.addQuad(quad(axiom, namedNode('owl:annotatedTarget'), sourceObject));

				  const annotationPredicate = namedNode(annotation.IRI);
				  const annotationObject = annotation.isIRI
					? namedNode(annotation.value)
					: literal(annotation.value);

				  writer.addQuad(quad(axiom, annotationPredicate, annotationObject));

				  // Recursively handle nested annotations
				  if (Array.isArray(annotation.annotations)) {
					for (const nested of annotation.annotations) {
					  addAnnotationTriple(axiom, annotationPredicate, annotationObject, nested);
					}
				  }
				}
				// Process top-level annotations
				if(typeof axiomObject.axiom[3].annotations !== "undefined"){
					for (let annotation = 0; annotation < axiomObject.axiom[3].annotations.length; annotation++) {
					  addAnnotationTriple(classIRI, annotationType, annotationValue, axiomObject.axiom[3].annotations[annotation]);
					}
				}
			}
		}
	   }
    }
			// Serialize to Turtle and print
		// writer.end((error, result) => {
		  // if (error) console.error(error);
		  // else console.log(result);
		// });

		writer.end((error, outputText) => {
		  if (error) return console.error(error);

		  // Guess filename and MIME based on format
		  const filename = guessFilenameN3(onto, format);
		  const mime = mimeForFormatN3(format);

		  // Create a browser download
		  const blob = new Blob([outputText], { type: mime });
		  const a = document.createElement('a');
		  a.href = URL.createObjectURL(blob);
		  a.download = filename;
		  document.body.appendChild(a);
		  a.click();
		  a.remove();
		  URL.revokeObjectURL(a.href);

		  console.log(`Download started for ${filename} (${format})`);
		});

}

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
            // return elements == null || elements.attr("value") === "" ? "true" : "false";
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
			let rangeType = getTypeExpression(name);
			if(rangeType){
				ontologyObject = {"IRI": rangeType}
            } else if (name) {
                ontologyObject = {"IRI": await getFullName(name, namespace)}
                count++;
            }
        } else if (value.functionType === "getClassExpr") {
            if (!value.pathFilter && !value.path) {
                // ontologyObject = {"IRI": await getFullName(name, namespace)}
                axiomPart += await getClassExpression();
                count++;
            } else if (value.path && !value.path.filter) {
               let clazz = await getElementsFromPath(value.path.path, elemOWLGrEd);
               let classExpr = await getClassExpression(clazz);

                if (typeof classExpr === "undefined" || classExpr === null || classExpr === "") generateAxiom = false;
                else ontologyObject = {"IRI": await getFullName(classExpr)}
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
                let clazz = await getElementsFromPath(value.path, elemOWLGrEd);

                let domainOrRange = await getFullName(await getDomainOrRange(clazz));
                ontologyObject = {"IRI": domainOrRange}

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
			if (name) {
				ontologyObject = {"IRI": await getFullName(name, namespace)}
				console.log("EEEEEEEEEEEEEEEE", ontologyObject)
				count++;
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

    if(name !== null && name.indexOf(":") !== -1){
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
        return "<" + await getCurrentUri() + name + ">";
    }
}

async function getCurrentUri(pathTable, currentComp){
  return namespaceTable[":"]
}

async function getClassExpression(elem) {
  const elemName = await elem.getCompartmentValue("Name");
  return elemName;
  // get name from class
    // if (!elem) elem = utilities.getElementFromCompartment(source);

    // if (elem.find("/elemType").attr("id") === "Class") {
        // let name = elem.find("/compartment/subCompartment:has(/compartType[id='Name'])").attr("value");

        // if (name && name !== "") {
            // let namespace = elem.find("/compartment/subCompartment:has(/compartType[id='Namespace'])").attr("value");
            // return await getFullName(name, namespace);
        // } else {
            // let eqcl = elem.find("/compartment/subCompartment/subCompartment/subCompartment:has(/compartType[id='EquivalentClass'])").first();
            // if (!eqcl.isEmpty()) {
                // return MP.parseClassExpression(eqcl.attr("value"), diagram, t, classList, datatypeList);
            // }
        // }
    // } else {
        // return "";
    // }
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
	return await elem.getCompartmentValue("Name")
}

// async function getMultiplicity(value){
	// console.log("TO DO getMultiplicity")
	// return -1
// }

function getMultiplicity(str) {
  str = str.trim();

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
			elemOWLGrEd = elementFromPath[0]["link"];
			elementFromPath = elemOWLGrEd;
		}
	} else {
		if(elemOWLGrEd.obj.type === "Line") {
			elementFromPath = await elemOWLGrEd.getEndElement();
			elemOWLGrEd = elementFromPath;
		}else {
			elementFromPath = await elemOWLGrEd.getEndLinks();
			elemOWLGrEd = elementFromPath[0]["link"];
			elementFromPath = elemOWLGrEd;
		}
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


function getTypeExpression(dataType) {

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

function rdfList(writer, items) {
  // If your Writer has writer.list, you can just:
  // return writer.list(items);
  // Otherwise build rdf:first/rest chain:
  if (items.length === 0) return namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#nil");

  const RDF_FIRST = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
  const RDF_REST  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";
  const RDF_NIL   = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";

  const head = blankNode();
  let current = head;

  for (let i = 0; i < items.length; i++) {
    writer.addQuad(quad(current, namedNode(RDF_FIRST), items[i]));
    if (i === items.length - 1) {
      writer.addQuad(quad(current, namedNode(RDF_REST), namedNode(RDF_NIL)));
    } else {
      const next = blankNode();
      writer.addQuad(quad(current, namedNode(RDF_REST), next));
      current = next;
    }
  }
  return head;
}

// function URIgrammar() {
    // const grammar = new RegExp(/^<((ftp|http|https):\/\/[A-Za-z0-9\/._-]+)>$/);
    // return grammar;
// }



export {
}
