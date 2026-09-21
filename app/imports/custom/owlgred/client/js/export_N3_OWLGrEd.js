import { DataFactory, Writer } from 'n3';
const { namedNode, literal, quad, blankNode } = DataFactory;

let namespaceTable = {}

const RDF  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const OWL  = "http://www.w3.org/2002/07/owl#";
const XSD  = "http://www.w3.org/2001/XMLSchema#";

function guessFilenameN3(onto, format) {
  const iri = (onto && (onto.iri || onto.IRI || onto.ontologyIRI || onto.name)) || 'ontology';
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

function generateN3Syntax(onto, format, nsTable){
	namespaceTable = nsTable;
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

			  let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol]  || axiomObject.axiom[0]?.axiomSymbol;
			  let annotationValue = axiomObject.axiom[1]?.value;
			  let annotationLanguage = axiomObject.axiom[2]?.language;
			  // if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;

			  if (annotationType && annotationValue) {
				   const lit = annotationLanguage
					? literal(annotationValue, annotationLanguage)
					: literal(annotationValue);

				writer.addQuad(
				  quad(
					namedNode(namespaceTable[":"] || "http://owlgred.lumii.lv/web/2026#"),
					namedNode(annotationType),
					lit
				  )
				);
			  }
			}else if (axiomObject.type === "AnnotationAssertion") {
				let classIRI = axiomObject.axiom[1]?.IRI;
				let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol] || axiomObject.axiom[0]?.axiomSymbol;
				let annotationValue = axiomObject.axiom[2]?.value;
				let annotationLanguage = axiomObject.axiom[3]?.language;

				if (classIRI && annotationType && annotationValue) {
				  const lit = annotationLanguage
					? literal(annotationValue, annotationLanguage)
					: literal(annotationValue);

				  writer.addQuad(quad(namedNode(classIRI), namedNode(annotationType),lit));
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

		  if(classIRI){
			  writer.addQuad(
				quad(
				  namedNode(classIRI),
				  namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
				  namedNode('http://www.w3.org/2002/07/owl#Class')
				)
			  );
		  }
		} else if (axiomObject.type === "Declaration" && axiomObject.axiom.type === "DataProperty") {
		  const classIRI = axiomObject.axiom.axiom.IRI;
		  writer.addQuad(
			quad(
			  namedNode(classIRI),
			  namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
			  namedNode('http://www.w3.org/2002/07/owl#DatatypeProperty')
			)
		  );
		} else if (axiomObject.type === "Declaration" && axiomObject.axiom.type === "ObjectProperty") {
		  const classIRI = axiomObject.axiom.axiom.IRI;
		  writer.addQuad(
			quad(
			  namedNode(classIRI),
			  namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
			  namedNode('http://www.w3.org/2002/07/owl#ObjectProperty')
			)
		  );
		} else if (axiomObject.type === "DataPropertyDomain" || axiomObject.type === "ObjectPropertyDomain") {
		  const attrIRI = axiomObject.axiom[0].IRI;
		  let classIRI = axiomObject.axiom[1]?.IRI;
		  if(classIRI) classIRI = namedNode(classIRI);
		  else if(axiomObject.axiom[1].Expression){
			 const dataPropertySet = new Set(onto.DataProperty);
			 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom[1].Expression, {
					prefixes: namespaceTable,
					isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
			 });

			 for (let i = 0; i < exprQuads.length; i++) {
					writer.addQuad(exprQuads[i]);
			 }

			 classIRI = exprTerm;
		  }
		  writer.addQuad(
			quad(
			  namedNode(attrIRI),
			  namedNode('http://www.w3.org/2000/01/rdf-schema#domain'),
			  classIRI
			)
		  );
		} else if (axiomObject.type === "DataPropertyRange" || axiomObject.type === "ObjectPropertyRange") {
		  const attrIRI = axiomObject.axiom[0].IRI;
		  const classIRI = axiomObject.axiom[1].IRI;

		  if(classIRI !== null && attrIRI !== null && typeof classIRI === "string"){
			  writer.addQuad(
				quad(
				  namedNode(attrIRI),
				  namedNode('http://www.w3.org/2000/01/rdf-schema#range'),
				  namedNode(classIRI)
				)
			  );
		  } else if(classIRI !== null && attrIRI !== null && typeof classIRI === "object"){

			  const quads = buildDataPropertyRangeQuads(
				  attrIRI,
				  classIRI,
				  namespaceTable
			  );
			  writer.addQuads(quads);
		  }
		} else if (axiomObject.type === "FunctionalDataProperty" || axiomObject.type === "FunctionalObjectProperty") {
		  const classIRI = axiomObject.axiom.IRI;
		  if(classIRI){
			  writer.addQuad(
				quad(
				  namedNode(classIRI),
				  namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
				  namedNode('http://www.w3.org/2002/07/owl#FunctionalProperty')
				)
			  );
		  }
		}else if(axiomObject.type === "EquivalentDataProperties" || axiomObject.type === "DisjointDataProperties" || axiomObject.type === "SubDataPropertyOf" 
		|| axiomObject.type === "EquivalentObjectProperties" || axiomObject.type === "DisjointObjectProperties" || axiomObject.type === "SubObjectPropertyOf"){

			let typeList = {
				"EquivalentDataProperties":'http://www.w3.org/2002/07/owl#equivalentProperty',
				"SubDataPropertyOf":'http://www.w3.org/2000/01/rdf-schema#subPropertyOf',
				"DisjointDataProperties":'http://www.w3.org/2002/07/owl#propertyDisjointWith',
				"EquivalentObjectProperties":'http://www.w3.org/2002/07/owl#equivalentProperty',
				"SubObjectPropertyOf":'http://www.w3.org/2000/01/rdf-schema#subPropertyOf',
				"DisjointObjectProperties":'http://www.w3.org/2002/07/owl#propertyDisjointWith'

			}
			// Base property (the first one)
			const axiom = axiomObject.axiom;
			const base = namedNode(axiom[0].IRI);
			let predicate = typeList[axiomObject.type]
			// Add owl:equivalentProperty triples for the rest
			for (let i = 1; i < axiom.length; i++) {
			  if(axiom[i].length > 0){
				for (let j = 0; j < axiom[i].length; j++) {
					if(base && axiom[i][j].IRI) {
						writer.addQuad(quad(base, namedNode(predicate), namedNode(axiom[i][j].IRI)));
					}
				}
			  } else if(base && axiom[i].IRI){
				  writer.addQuad(
					quad(base, namedNode(predicate), namedNode(axiom[i].IRI))
				  );
			  }
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
			let classIRI = axiomObject.axiom.axiom.IRI;
			if(classIRI) classIRI = namedNode(classIRI);
			  else if(axiomObject.axiom.axiom.Expression){
				 const dataPropertySet = new Set(onto.DataProperty);
				 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom.axiom.Expression, {
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
				 });

				 for (let i = 0; i < exprQuads.length; i++) {
						writer.addQuad(exprQuads[i]);
				 }

				 classIRI = exprTerm;
			}
			writer.addQuad(
			  quad(
				complement,
				namedNode('http://www.w3.org/2002/07/owl#complementOf'),
				classIRI
			  )
			);
			let oclassIRI = axiomObject.axiom.IRI;
			if(oclassIRI) oclassIRI = namedNode(oclassIRI);
			  else if(axiomObject.axiom.Expression){
				 const dataPropertySet = new Set(onto.DataProperty);
				 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom.Expression, {
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
				 });

				 for (let i = 0; i < exprQuads.length; i++) {
						writer.addQuad(exprQuads[i]);
				 }

				 oclassIRI = exprTerm;
			}
			writer.addQuad(
			  quad(
				oclassIRI,
				namedNode('http://www.w3.org/2002/07/owl#equivalentClass'),
				complement
			  )
			);
		  } else if(typeof axiomObject.axiom[1] !== "undefined" && typeof axiomObject.axiom[1].type !== "undefined" && axiomObject.axiom[1].type.indexOf("Cardinality") !== -1){
			  let classIRI   = axiomObject.axiom[0].IRI;
			  const part     = axiomObject.axiom[1];
			  const n        = part.axiom[0].Number;
			  const propIRI  = part.axiom[1].IRI;
			  const dtypeIRI = part.axiom[2]?.IRI; // may be undefined
			  
			  if(classIRI) classIRI = namedNode(classIRI);
			  else if(axiomObject.axiom[0].Expression){
				 const dataPropertySet = new Set(onto.DataProperty);
				 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom[0].Expression, {
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
				 });

				 for (let i = 0; i < exprQuads.length; i++) {
						writer.addQuad(exprQuads[i]);
				 }

				 classIRI = exprTerm;
			  }

			  // SubClassOf(:Class _:r)
			  const r = blankNode();
			  writer.addQuad(quad(classIRI, namedNode("http://www.w3.org/2000/01/rdf-schema#subClassOf"), r));
			  writer.addQuad(quad(r, namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), namedNode("http://www.w3.org/2002/07/owl#Restriction")));
			  writer.addQuad(quad(r, namedNode("http://www.w3.org/2002/07/owl#onProperty"), namedNode(propIRI)));

			  // number literal must be xsd:nonNegativeInteger
			  const nLit = literal(String(n), namedNode("http://www.w3.org/2001/XMLSchema#nonNegativeInteger"));

			  // Map FS keywords to RDF predicates (qualified/unqualified)
			  const predUnq = {
				DataMinCardinality:  "http://www.w3.org/2002/07/owl#minCardinality",
				DataMaxCardinality:  "http://www.w3.org/2002/07/owl#maxCardinality",
				DataExactCardinality: "http://www.w3.org/2002/07/owl#cardinality",
				ObjectMinCardinality:  "http://www.w3.org/2002/07/owl#minCardinality",
				ObjectMaxCardinality:  "http://www.w3.org/2002/07/owl#maxCardinality",
				ObjectExactCardinality: "http://www.w3.org/2002/07/owl#cardinality"
			  };
			  const predQ = {
				DataMinCardinality:  "http://www.w3.org/2002/07/owl#minQualifiedCardinality",
				DataMaxCardinality:  "http://www.w3.org/2002/07/owl#maxQualifiedCardinality",
				DataExactCardinality: "http://www.w3.org/2002/07/owl#qualifiedCardinality",
				ObjectMinCardinality:  "http://www.w3.org/2002/07/owl#minQualifiedCardinality",
				ObjectMaxCardinality:  "http://www.w3.org/2002/07/owl#maxQualifiedCardinality",
				ObjectExactCardinality: "http://www.w3.org/2002/07/owl#qualifiedCardinality"
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
			let subType = null;
			let classIRI = axiomObject.axiom[0].IRI;
			  if(classIRI) subType = "IRI";
			  else if(axiomObject.axiom[0].Expression){
				  classIRI = axiomObject.axiom[0].Expression;
				  subType = "Expression";
			}
			
			// if (typeof axiomObject.axiom[1].IRI === "undefined") {
			if(axiomObject.axiom[1].length > 0){
				if(axiomObject.axiom[1].length){
			      for (let i = 0; i < axiomObject.axiom[1].length; i++) {
					addN3AxiomQuad({
						  classIRI,
						  axiomItem: axiomObject.axiom[1][i],
						  subType,
						  axiomType: axiomObject.type,
						  writer,
						  quad,
						  namedNode,
						  onto,
						  namespaceTable,
						  typeList,
						});

					
				  }
				} else if(axiomObject.axiom[1].Expression){
					const dataPropertySet = new Set(onto.DataProperty);
						const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom[1].Expression, {
						  prefixes: namespaceTable,
						  isObjectProperty: (propIri) => !dataPropertySet.has(propIri), // your function
						});

						// add the supporting triples first
						for (let i = 0; i < exprQuads.length; i++) {
						  writer.addQuad(exprQuads[i]);
						}

						// then add the axiom triple (EquivalentClasses or SubClassOf)
						writer.addQuad(
						  quad(
							namedNode(classIRI),
							namedNode(typeList[axiomObject.type]), // e.g. OWL+"equivalentClass" or RDFS+"subClassOf"
							exprTerm
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
			  addN3AxiomQuad({
						  classIRI,
						  axiomItem: axiomObject.axiom[1],
						  subType,
						  axiomType: axiomObject.type,
						  writer,
						  quad,
						  namedNode,
						  onto,
						  namespaceTable,
						  typeList,
						});
			}
		  }
		} else if (axiomObject.type === "AnnotationAssertion") {
			if(axiomObject.axiom?.[4]?.axiom) addAnnotationAssertionWithAxiomAnnotationsN3(writer, axiomObject);
			let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol] || axiomObject.axiom[0]?.axiomSymbol;
			let annotationValue = axiomObject.axiom[2]?.value;
			if (annotationType && annotationValue) {
				let classIRI = axiomObject.axiom[1]?.IRI;
				if(classIRI) classIRI = namedNode(classIRI);
				else if(axiomObject.axiom[1].Expression){
					const dataPropertySet = new Set(onto.DataProperty);
					const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom[1].Expression, {
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					});

					for (let i = 0; i < exprQuads.length; i++) {
						writer.addQuad(exprQuads[i]);
					}

					classIRI = exprTerm;
				  }
				
				let annotationLanguage = axiomObject.axiom[3]?.language;

				if (classIRI) {
				  const lit = annotationLanguage
					? literal(annotationValue, annotationLanguage)
					: literal(annotationValue);

				  writer.addQuad(quad(classIRI, namedNode(annotationType),lit));
				}
			}
		} else if (axiomObject.type === "HasKey") {
			  const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
			  const OWL = 'http://www.w3.org/2002/07/owl#';
			  const [cls, propsBox] = axiomObject.axiom;
			  if (!cls?.IRI && !cls?.Expression) throw new Error('HasKey: missing class IRI');
			  if (!propsBox || !Array.isArray(propsBox.axiom) || propsBox.axiom.length === 0) {
				throw new Error('HasKey: properties list is empty');
			  }
			  
			  let classNode;
			  if(cls.IRI) classNode = namedNode(cls.IRI);
			  else if(cls.Expression){
				const dataPropertySet = new Set(onto.DataProperty);
				const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(cls.Expression, {
					prefixes: namespaceTable,
					isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
				});

				for (let i = 0; i < exprQuads.length; i++) {
					writer.addQuad(exprQuads[i]);
				}

				classNode = exprTerm;
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
			  writer.addQuad(classNode, namedNode(OWL + 'hasKey'), listHead);
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
			let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol] || axiomObject.axiom[0]?.axiomSymbol;
			let annotationValue = axiomObject.axiom[2]?.value;
			let annotationLanguage = axiomObject.axiom[3]?.language;
			if (classIRI && annotationType && annotationValue) {
			  const lit = annotationLanguage
				? literal(annotationValue, annotationLanguage)
				: literal(annotationValue);

			  writer.addQuad(quad(namedNode(classIRI), namedNode(annotationType),lit));
			}
		} else if (axiomObject.type === "DataTypeDefinition") {
		  const dt = axiomObject.axiom[0].IRI;
		  const dtdefinition = axiomObject.axiom[1].type;

		 if(typeof dtdefinition === "string"){
			  writer.addQuad(
				quad(
				  namedNode(dt),
				  namedNode('http://www.w3.org/2002/07/owl#onDatatype'),
				  namedNode(dtdefinition)
				)
			  );
		  } else if(typeof dtdefinition === "object"){

			  const quads = buildDataPropertyRangeQuads(
				  dt,
				  dtdefinition,
				  namespaceTable
			  );
			  writer.addQuads(quads);
		  }
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
		let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol] || axiomObject.axiom[0]?.axiomSymbol;
		let annotationValue = axiomObject.axiom[2]?.value;
		let annotationLanguage = axiomObject.axiom[3]?.language;

		if (classIRI && annotationType && annotationValue) {
		  const lit = annotationLanguage
			? literal(annotationValue, annotationLanguage)
			: literal(annotationValue);

		  writer.addQuad(quad(namedNode(classIRI), namedNode(annotationType),lit));
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
        let subject = axiomObject.axiom[0].IRI;
		if(subject) subject = namedNode(subject);
		else if(axiomObject.axiom[0].Expression){
			 const dataPropertySet = new Set(onto.DataProperty);
			 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom[0].Expression, {
				prefixes: namespaceTable,
				isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
			 });

			 for (let i = 0; i < exprQuads.length; i++) {
				writer.addQuad(exprQuads[i]);
			 }

				 subject = exprTerm;
		}

        const object = axiomObject.axiom[1].IRI;
		if(typeof subject !== "undefined" && typeof object !== "undefined"){
			writer.addQuad(
			  quad(
				namedNode(object),
				namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
				subject
			  )
			);
		}
      } else if(axiomObject.type === "AnnotationAssertion"){
        let classIRI = axiomObject.axiom[1]?.IRI;
		let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol] || axiomObject.axiom[0]?.axiomSymbol;
		let annotationValue = axiomObject.axiom[2]?.value;
		let annotationLanguage = axiomObject.axiom[3]?.language;

		if (classIRI && annotationType && annotationValue) {
		  const lit = annotationLanguage
			? literal(annotationValue, annotationLanguage)
			: literal(annotationValue);

		  writer.addQuad(quad(namedNode(classIRI), namedNode(annotationType),lit));
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
		 const p = namedNode(axiomObject.axiom[0].IRI);
		  const s = namedNode(axiomObject.axiom[1].IRI);

		  // value literal (typed optional)
		  let o;
		  if (axiomObject.axiom[3] && axiomObject.axiom[3].type) {
			o = literal(axiomObject.axiom[2].value, namedNode(axiomObject.axiom[3].type));
		  } else {
			o = literal(axiomObject.axiom[2].value);
		  }
		  // base triple
		writer.addQuad(quad(s, p, o));

		// annotations: axiomObject.axiom[4].axiom
		const ann = axiomObject.axiom[4] && axiomObject.axiom[4].axiom;
		if (Array.isArray(ann) && ann.length) {
		  const ax = blankNode();

		  writer.addQuad(quad(ax, namedNode(RDF + "type"), namedNode(OWL + "Axiom")));
		  writer.addQuad(quad(ax, namedNode(OWL + "annotatedSource"), s));
		  writer.addQuad(quad(ax, namedNode(OWL + "annotatedProperty"), p));
		  writer.addQuad(quad(ax, namedNode(OWL + "annotatedTarget"), o));

		  for (const a of ann) {
			  const obj = a.type
				? literal(a.value, namedNode(a.type))
				: literal(a.value);

			  writer.addQuad(
				quad(
				  ax,
				  namedNode(a.axiomSymbol),
				  obj
				)
			  );
		  }
		}
	  } else if(axiomObject.type === "NegativeDataPropertyAssertion"){
		  const p = namedNode(axiomObject.axiom[0].IRI);
		  const s = namedNode(axiomObject.axiom[1].IRI);

		  // value literal (typed optional)
		  let o;
		  if (axiomObject.axiom[3] && axiomObject.axiom[3].type) {
			o = literal(axiomObject.axiom[2].value, namedNode(axiomObject.axiom[3].type));
		  } else {
			o = literal(axiomObject.axiom[2].value);
		  }
		   // base triple
			writer.addQuad(quad(s, p, o));

			// annotations: axiomObject.axiom[4].axiom
			const ann = axiomObject.axiom[4] && axiomObject.axiom[4].axiom;
			if (Array.isArray(ann) && ann.length) {
			  const ax = blankNode();

			  writer.addQuad(quad(ax, namedNode(RDF + "type"), namedNode(OWL + "Axiom")));
			  writer.addQuad(quad(ax, namedNode(OWL + "annotatedSource"), s));
			  writer.addQuad(quad(ax, namedNode(OWL + "annotatedProperty"), p));
			  writer.addQuad(quad(ax, namedNode(OWL + "annotatedTarget"), o));

			  for (const a of ann) {
				writer.addQuad(
				  quad(
					ax,
					namedNode(a.axiomSymbol),
					literal(a.value, namedNode(a.type))
				  )
				);
			  }
			}

	  } else if(axiomObject.type === "ObjectPropertyAssertion"){
		  const p = namedNode(axiomObject.axiom[0].IRI);
		  const s = namedNode(axiomObject.axiom[1].IRI);
		  const o = namedNode(axiomObject.axiom[2].IRI);

		  // base assertion triple
		  writer.addQuad(quad(s, p, o));

		  // axiom annotations (if any)
		  const annBlock = axiomObject.axiom[3] && axiomObject.axiom[3].axiom;
		  if (Array.isArray(annBlock) && annBlock.length) {
			const ax = blankNode();

			writer.addQuad(quad(ax, namedNode(RDF + "type"), namedNode(OWL + "Axiom")));
			writer.addQuad(quad(ax, namedNode(OWL + "annotatedSource"), s));
			writer.addQuad(quad(ax, namedNode(OWL + "annotatedProperty"), p));
			writer.addQuad(quad(ax, namedNode(OWL + "annotatedTarget"), o));

			for (const a of annBlock) {
			  const pred = namedNode(a.axiomSymbol);

			  const obj = a.type
				? literal(a.value, namedNode(a.type))
				: literal(a.value);

			  writer.addQuad(quad(ax, pred, obj));
			}
		  }
		  
		  
		  // writer.addQuad(
			// quad(namedNode(axiomObject.axiom[1].IRI), namedNode(axiomObject.axiom[0].IRI), namedNode(axiomObject.axiom[2].IRI))
		  // );
	  } else if(axiomObject.type === "NegativeObjectPropertyAssertion"){
		  const p = namedNode(axiomObject.axiom[0].IRI);
		  const s = namedNode(axiomObject.axiom[1].IRI);
		  const o = namedNode(axiomObject.axiom[2].IRI);

		  const neg = blankNode();

		  // the negative property assertion structure
		  writer.addQuad(quad(neg, namedNode(RDF + "type"), namedNode(OWL + "NegativePropertyAssertion")));
		  writer.addQuad(quad(neg, namedNode(OWL + "sourceIndividual"), s));
		  writer.addQuad(quad(neg, namedNode(OWL + "assertionProperty"), p));
		  writer.addQuad(quad(neg, namedNode(OWL + "targetIndividual"), o));

		  // axiom annotations (if any)
		  const annBlock = axiomObject.axiom[3] && axiomObject.axiom[3].axiom;
		  if (Array.isArray(annBlock) && annBlock.length) {
			const ax = blankNode();

			writer.addQuad(quad(ax, namedNode(RDF + "type"), namedNode(OWL + "Axiom")));

			// annotate the negative assertion node
			writer.addQuad(quad(ax, namedNode(OWL + "annotatedSource"), neg));
			writer.addQuad(quad(ax, namedNode(OWL + "annotatedProperty"), namedNode(RDF + "type")));
			writer.addQuad(quad(ax, namedNode(OWL + "annotatedTarget"), namedNode(OWL + "NegativePropertyAssertion")));

			// optionally also capture the actual content being negated (helps consumers)
			writer.addQuad(quad(ax, namedNode(OWL + "sourceIndividual"), s));
			writer.addQuad(quad(ax, namedNode(OWL + "assertionProperty"), p));
			writer.addQuad(quad(ax, namedNode(OWL + "targetIndividual"), o));

			for (const a of annBlock) {
			  const pred = namedNode(a.axiomSymbol);
			  const obj  = literal(a.value, namedNode(a.type));
			  writer.addQuad(quad(ax, pred, obj));
			}
  }
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

				
 
			if(predicate && subject && typeof predicate !== "undefined"&& typeof subject !== "undefined"){
				if(object) object = namedNode(object);
				else if(axiomObject.axiom[1].Expression){
					const dataPropertySet = new Set(onto.DataProperty);
					const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom[1].Expression, {
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					});

					for (let i = 0; i < exprQuads.length; i++) {
						writer.addQuad(exprQuads[i]);
					}

					object = exprTerm;
				}
				
				if(object && typeof object !== "undefined"){
					writer.addQuad(
						quad(
							namedNode(subject),
							namedNode(predicate),
							object
						)
					);
				}
			}
		} else if (typeof axiomObject.type !== "undefined" && axiomObject.type === "SubClassOf"){
			if(typeof axiomObject.axiom[1] !== "undefined" && axiomObject.axiom[1].type.indexOf("Cardinality") !== -1){
				let clsIRI  = axiomObject.axiom[0].IRI;
				const part    = axiomObject.axiom[1];           // type: ObjectMin/Max/ExactCardinality
				const n       = part.axiom[0].Number;           // the number
				const propIRI = part.axiom[1].IRI;              // object property
				let classIRI = part.axiom[2]?.IRI;            // optional filler class for qualified form
				
				if(clsIRI) clsIRI = namedNode(clsIRI);
				else if(axiomObject.axiom[0].Expression){
					 const dataPropertySet = new Set(onto.DataProperty);
					 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom[0].Expression, {
							prefixes: namespaceTable,
							isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					 });

					 for (let i = 0; i < exprQuads.length; i++) {
							writer.addQuad(exprQuads[i]);
					 }

					 clsIRI = exprTerm;
				}
				
				if(classIRI) classIRI = namedNode(classIRI);
				else if(part.axiom[2].Expression){
					 const dataPropertySet = new Set(onto.DataProperty);
					 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(part.axiom[2].Expression, {
							prefixes: namespaceTable,
							isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					 });

					 for (let i = 0; i < exprQuads.length; i++) {
							writer.addQuad(exprQuads[i]);
					 }

					 classIRI = exprTerm;
				}

				// _:r restriction node
				const r = blankNode();

				writer.addQuad(quad(
				  clsIRI,
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
					classIRI
				  ));
				} else {
				  // Unqualified: plain cardinality, no filler
				  writer.addQuad(quad(r, namedNode(predUnq[part.type]), nLit));
				}
			} else {
			 let axiomList = { "ObjectSomeValuesFrom":'http://www.w3.org/2002/07/owl#someValuesFrom', "ObjectAllValuesFrom":'http://www.w3.org/2002/07/owl#allValuesFrom' }
			  const r = blankNode();
 
			  // :A rdfs:subClassOf _:r .
			  
			  let classIRI = axiomObject.axiom[0]?.IRI;
			  if(classIRI) classIRI = namedNode(classIRI);
			  else if(axiomObject.axiom[0].Expression){
				 const dataPropertySet = new Set(onto.DataProperty);
				 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom[0].Expression, {
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
				 });

				 for (let i = 0; i < exprQuads.length; i++) {
						writer.addQuad(exprQuads[i]);
				 }

				 classIRI = exprTerm;
			  }
			  
			  
			  writer.addQuad(quad(
				classIRI,
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
				onPropObject = propPart.IRI;
				if(onPropObject) onPropObject = namedNode(onPropObject);
				else if(propPart.Expression){
					 const dataPropertySet = new Set(onto.DataProperty);
					 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(propPart.Expression, {
							prefixes: namespaceTable,
							isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					 });

					 for (let i = 0; i < exprQuads.length; i++) {
							writer.addQuad(exprQuads[i]);
					 }

					 onPropObject = exprTerm;
				  }
			  }

			  // _:r owl:onProperty X .
			  writer.addQuad(quad(r, namedNode("http://www.w3.org/2002/07/owl#onProperty"), onPropObject));

			  // _:r (some|all)ValuesFrom :B .
			  const restrType = axiomObject.axiom[1].type; // "ObjectSomeValuesFrom" | "ObjectAllValuesFrom"
			  
			  let oclassIRI = axiomObject.axiom[1]?.axiom[1]?.IRI;
			  if(oclassIRI) oclassIRI = namedNode(oclassIRI);
			  else if(axiomObject.axiom[1].axiom[1].Expression){
				 const dataPropertySet = new Set(onto.DataProperty);
				 const { term: exprTerm, quads: exprQuads } = classExpressionAstToN3(axiomObject.axiom[1].axiom[1].Expression, {
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
				 });

				 for (let i = 0; i < exprQuads.length; i++) {
						writer.addQuad(exprQuads[i]);
				 }

				 oclassIRI = exprTerm;
			  }
			  
			  writer.addQuad(quad(
				r,
				namedNode(axiomList[restrType]),
				oclassIRI
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
				if(axiomObject.axiom[1].length > 0){
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
				} else if(axiomObject.axiom[1]?.IRI){
					let predicate = typeList[axiomObject.type]
					  let object = axiomObject.axiom[1].IRI;
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
			let annotationType = annotationPropertyTypes[axiomObject.axiom[0]?.axiomSymbol] || axiomObject.axiom[0]?.axiomSymbol;
			let annotationValue = axiomObject.axiom[2]?.value;
			let annotationLanguage = axiomObject.axiom[3]?.language;

			if (classIRI && annotationType && annotationValue) {
			  const lit = annotationLanguage
				? literal(annotationValue, annotationLanguage)
				: literal(annotationValue);

			  writer.addQuad(quad(namedNode(classIRI), namedNode(annotationType),lit));
			}
			
	
			addAnnotationAssertionWithAxiomAnnotationsN3(writer, axiomObject);


			/*
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
			}*/
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
		});

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

// Facet tokens from your grammar -> RDF facet IRIs.
// (min/maxInclusive/Exclusive are the standard XSD facets) :contentReference[oaicite:2]{index=2}
const FACET_MAP = {
  "<=": XSD + "maxInclusive",
  "<":  XSD + "maxExclusive",
  ">=": XSD + "minInclusive",
  ">":  XSD + "minExclusive",
  "length":    XSD + "length",
  "maxLength": XSD + "maxLength",
  "minLength": XSD + "minLength",
  "pattern":   XSD + "pattern",
  "langPattern": RDF + "langRange",
};

const XSD_BUILTINS = new Set([
  "string","integer","decimal","float",
  "nonNegativeInteger","nonPositiveInteger",
  "positiveInteger","negativeInteger",
  "long","int","short","byte",
  "unsignedLong","unsignedInt","unsignedShort","unsignedByte",
  "double","boolean","dateTime","date","time",
]);

function dataRangeAstToN3(ast, prefixes = {}) {
  const quads = [];

  function asDataRange(node) {
    if (!node) throw new Error("Empty data range node");

    if (node.grammarProduction === "dataDisjunction") return disjunction(node);
    if (node.grammarProduction === "dataConjunction") return conjunction(node);

    // allow passing primary directly
    if (node.dataPrimaryType) return primary(node);

    throw new Error("Unexpected node shape");
  }

  function disjunction(node) {
    const terms = node.items.map(asDataRange);
    if (terms.length === 1) return terms[0];

    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(RDFS + "Datatype")));
    quads.push(quad(b, namedNode(OWL + "unionOf"), addRdfList(quads, terms)));
    return b;
  }

  function conjunction(node) {
    const terms = node.items.map(primary);
    if (terms.length === 1) return terms[0];

    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(RDFS + "Datatype")));
    quads.push(quad(b, namedNode(OWL + "intersectionOf"), addRdfList(quads, terms)));
    return b;
  }

  function primary(node) {
    let inner;
    switch (node.dataPrimaryType) {
      case "datatype":
        inner = datatypeToTerm(node.datatype, prefixes);
        break;
      case "datatypeRestriction":
        inner = datatypeRestriction(node.restriction);
        break;
      case "literalList":
        inner = dataOneOf(node.literalList);
        break;
      case "dataRange":
        inner = asDataRange(node.dataRange);
        break;
      default:
        throw new Error("Unknown dataPrimaryType: " + node.dataPrimaryType);
    }

    if (node.negation === "true") {
      const b = blankNode();
      quads.push(quad(b, namedNode(RDF + "type"), namedNode(RDFS + "Datatype")));
      quads.push(quad(b, namedNode(OWL + "datatypeComplementOf"), inner));
      return b;
    }
    return inner;
  }

  function dataOneOf(list) {
    const lits = list.map(l => literalToTerm(l, prefixes));
    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(RDFS + "Datatype")));
    quads.push(quad(b, namedNode(OWL + "oneOf"), addRdfList(quads, lits)));
    return b;
  }

  function datatypeRestriction(dr) {
    const dt = datatypeToTerm(dr.datatype, prefixes);
    const restrictionNodes = dr.restrictions.map(r => restrictionNode(r));

    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(RDFS + "Datatype")));
    quads.push(quad(b, namedNode(OWL + "onDatatype"), dt));
    quads.push(quad(b, namedNode(OWL + "withRestrictions"), addRdfList(quads, restrictionNodes)));
    return b;
  }

  function restrictionNode(r) {
    const facetIri = FACET_MAP[r.facet];
    if (!facetIri) throw new Error("Unknown facet token: " + r.facet);

    const b = blankNode();
    quads.push(quad(b, namedNode(facetIri), literalToTerm(r.value, prefixes)));
    return b;
  }

  const rangeTerm = asDataRange(ast);
  return { rangeTerm, quads };
}
/**
 * Builds the full DataPropertyRange triple + the datatype-expression triples.
 * DataPropertyRange(R DR) -> R rdfs:range DR. :contentReference[oaicite:10]{index=10}
 */
function buildDataPropertyRangeQuads(propertyIri, dataRangeAst, prefixes = {}) {
  const { rangeTerm, quads } = dataRangeAstToN3(dataRangeAst, prefixes);
  quads.push(quad(namedNode(propertyIri), namedNode(RDFS + "range"), rangeTerm));
  // quads.push(quad(namedNode(propertyIri), namedNode(RDF + "type"), namedNode(OWL + "DatatypeProperty")));
  return quads;
}


function addRdfList(quads, elements) {
  if (!elements || elements.length === 0) return namedNode(RDF + "nil");
  const head = blankNode();
  let cur = head;
  for (let i = 0; i < elements.length; i++) {
    quads.push(quad(cur, namedNode(RDF + "first"), elements[i]));
    if (i === elements.length - 1) {
      quads.push(quad(cur, namedNode(RDF + "rest"), namedNode(RDF + "nil")));
    } else {
      const next = blankNode();
      quads.push(quad(cur, namedNode(RDF + "rest"), next));
      cur = next;
    }
  }
  return head;
}

// function unquote(s) {
  // if (typeof s !== "string") return "";
  // return (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') ? s.slice(1, -1) : s;
// }

function unquote(astQuoted) {
  if (typeof astQuoted !== "string") return "";
  if (astQuoted.length >= 2 && astQuoted[0] === '"' && astQuoted[astQuoted.length - 1] === '"') {
    return astQuoted.slice(1, -1);
  }
  return astQuoted;
}

function blankNodeFromAstBlank(str) {
  const s = String(str);
  if (s.startsWith("_:")) return blankNode(s.slice(2));
  return blankNode();
}

function iriAstToNamedNode(iriAst, prefixes = {}, opts = {}) {
  const { preferXsdBuiltins = false } = opts;
  const t = iriAst.IRItype;
  const v = iriAst.value;

  if (t === "fullIRI") {
    const s = String(v);
    const iri = (s.startsWith("<") && s.endsWith(">")) ? s.slice(1, -1) : s;
    return namedNode(iri);
  }

  if (t === "simpleIRI") {
    const name = String(v);

    // Only map builtin datatype names when we are in a datatype/data-range context
    if (preferXsdBuiltins && XSD_BUILTINS.has(name)) {
      return namedNode(XSD + name); // <-- xsd:integer etc.
    }

    if (/^[a-z][a-z0-9+.-]*:/.test(name)) return namedNode(name);
    if (prefixes.base) return namedNode(prefixes.base + name);
	if (prefixes[":"]) return namedNode(prefixes[":"] + name);
    return namedNode(name);
  }

  if (t === "abbreviatedIRI" || t === "fullNamespaceIRI") {
    const name = v.name;
    const pref = v.prefix;

    if (prefixes[pref]) return namedNode(prefixes[pref] + name);
    if (/^https?:\/\//.test(pref) || pref.includes("#") || pref.endsWith("/")) return namedNode(pref + name);
    return namedNode(pref + ":" + name);
  }

  throw new Error("Unsupported IRItype: " + t);
}

function iriAsDatatypeTerm(iriAst, prefixes) {
  return iriAstToNamedNode(iriAst, prefixes, { preferXsdBuiltins: true });
}

/* ----- datatype/literal helpers (for data ranges) ----- */

function datatypeToTerm(dtAst, prefixes) {
  if (dtAst.type === "predefined") return namedNode(XSD + String(dtAst.value));
  if (dtAst.type === "IRI") return iriAsDatatypeTerm(dtAst.value, prefixes);
   // return getTypeExpression(dtAst.value)
  throw new Error("Unknown datatype.type: " + dtAst.type);
}

function literalToTerm(litAst, prefixes) {
  switch (litAst.type) {
    case "stringNoLang": return literal(unquote(litAst.value));
    case "stringWithLang": return literal(unquote(litAst.value), String(litAst.language || ""));
    case "typed": return literal(unquote(litAst.value), datatypeToTerm(litAst.datatype, prefixes));
    case "integer": return literal(String(litAst.value), namedNode(XSD + "integer"));
    case "decimal": return literal(String(litAst.value), namedNode(XSD + "decimal"));
    case "float": {
      const s = String(litAst.value);
      const lex = /[fF]$/.test(s) ? s.slice(0, -1) : s;
      return literal(lex, namedNode(XSD + "float"));
    }
    default: throw new Error("Unsupported literal type: " + litAst.type);
  }
}

function datatypeRestrictionToDataRange(dr, prefixes, quads) {
  const dt = datatypeToTerm(dr.datatype, prefixes);
  const restrictionNodes = (dr.restrictions || []).map(r => {
    const facetIri = FACET_MAP[r.facet];
    if (!facetIri) throw new Error("Unknown facet token: " + r.facet);
    const bn = blankNode();
    quads.push(quad(bn, namedNode(facetIri), literalToTerm(r.value, prefixes)));
    return bn;
  });

  const b = blankNode();
  quads.push(quad(b, namedNode(RDF + "type"), namedNode(RDFS + "Datatype")));
  quads.push(quad(b, namedNode(OWL + "onDatatype"), dt));
  quads.push(quad(b, namedNode(OWL + "withRestrictions"), addRdfList(quads, restrictionNodes)));
  return b;
}

function literalListToDataOneOf(list, prefixes, quads) {
  const lits = (list || []).map(l => literalToTerm(l, prefixes));
  const b = blankNode();
  quads.push(quad(b, namedNode(RDF + "type"), namedNode(RDFS + "Datatype")));
  quads.push(quad(b, namedNode(OWL + "oneOf"), addRdfList(quads, lits)));
  return b;
}

/**
 * Convert JSON-friendly class-expression AST into OWL/RDF quads.
 *
 * @param {object} ast - your JSON AST
 * @param {object} options
 * @param {object} options.prefixes - prefix expansions (optional), e.g. { base: "...", ex: "..." }
 * @param {(propertyIri: string) => boolean} options.isObjectProperty - REQUIRED
 * @returns {{ term: any, quads: any[] }}
 */
function classExpressionAstToN3(ast, { prefixes = {}, isObjectProperty } = {}) {
  if (typeof isObjectProperty !== "function") {
    throw new Error("classExpressionAstToN3: options.isObjectProperty(propertyIri) is required");
  }

  const quads = [];

  function asClassExpr(node) {
    if (!node) throw new Error("Empty class expression");

    switch (node.grammarProduction) {
      case "disjunction": return disjunction(node);
      case "conjunctionNoRestrictions": return conjunctionNoRestrictions(node);
      case "conjunctionWithRestrictions": return conjunctionWithRestrictions(node);
      case "unknownDisjunction": return unknownDisjunction(node);
      case "unknownConjunction": return unknownConjunction(node);
      default:
        if (node.primaryType) return primary(node);
        throw new Error("Unexpected node: " + JSON.stringify(node));
    }
  }

  function disjunction(node) {
    const parts = (node.items || []).map(asClassExpr);
    if (parts.length === 1) return parts[0];

    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
    quads.push(quad(b, namedNode(OWL + "unionOf"), addRdfList(quads, parts)));
    return b;
  }

  function conjunctionNoRestrictions(node) {
    const parts = (node.items || []).map(primary);
    if (parts.length === 1) return parts[0];

    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
    quads.push(quad(b, namedNode(OWL + "intersectionOf"), addRdfList(quads, parts)));
    return b;
  }

  function conjunctionWithRestrictions(node) {
    const cls = iriAstToNamedNode(node.class, prefixes);
    const rs = (node.restrictions || []).map(r => restrictionAsClassExpr(r));
    const parts = [cls].concat(rs);

    if (parts.length === 1) return parts[0];

    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
    quads.push(quad(b, namedNode(OWL + "intersectionOf"), addRdfList(quads, parts)));
    return b;
  }

  function primary(p) {
    let inner;
    if (p.primaryType === "atomic") inner = atomic(p.primary);
    else if (p.primaryType === "restriction") inner = restrictionAsClassExpr(p.primary);
    else throw new Error("Unknown primaryType: " + p.primaryType);

    if (p.negation === "true") {
      const b = blankNode();
      quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
      quads.push(quad(b, namedNode(OWL + "complementOf"), inner));
      return b;
    }
    return inner;
  }

  function atomic(a) {
    switch (a.atomType) {
      case "class":
        return iriAstToNamedNode(a.class, prefixes);

      case "expression":
        return asClassExpr(a.expression);

      case "individualList": {
        const inds = (a.list || []).map(individualToTerm);
        const b = blankNode();
        quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
        quads.push(quad(b, namedNode(OWL + "oneOf"), addRdfList(quads, inds)));
        return b;
      }

      default:
        throw new Error("Unknown atomType: " + a.atomType);
    }
  }

  function individualToTerm(ind) {
    if (ind.individualType === "IRI") return iriAstToNamedNode(ind.individual, prefixes);
    if (ind.individualType === "blank") return blankNodeFromAstBlank(ind.individual);
    throw new Error("Unknown individualType: " + ind.individualType);
  }

  function inversePropertyTerm(propertyIriAst, inverseFlag, propIsObject) {
    const p = iriAstToNamedNode(propertyIriAst, prefixes);

    if (inverseFlag !== "true") return p;

    if (!propIsObject) {
      throw new Error("Inverse used with a data property: " + p.value);
    }

    const ip = blankNode();
    quads.push(quad(ip, namedNode(OWL + "inverseOf"), p));
    return ip;
  }

  function restrictionAsClassExpr(r) {
    const propNode = iriAstToNamedNode(r.property, prefixes);
    const propIri = propNode.value;
    const propIsObject = !!isObjectProperty(propIri);
    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Restriction")));

    const onProp = inversePropertyTerm(r.property, r.inverse, propIsObject);
    quads.push(quad(b, namedNode(OWL + "onProperty"), onProp));

    const kw = r.keyword;

    if (kw === "some") {
      const filler = someOnlyFiller(r.value, propIsObject);
      quads.push(quad(b, namedNode(OWL + "someValuesFrom"), filler));
      return b;
    }

    if (kw === "only") {
      const filler = someOnlyFiller(r.value, propIsObject);
      quads.push(quad(b, namedNode(OWL + "allValuesFrom"), filler));
      return b;
    }

    if (kw === "value") {
      const hv = hasValueTerm(r.value, propIsObject);
      quads.push(quad(b, namedNode(OWL + "hasValue"), hv));
      return b;
    }

    if (kw === "Self") {
      if (!propIsObject) throw new Error("Self used with a data property: " + propIri);
      quads.push(quad(b, namedNode(OWL + "hasSelf"), literal("true", namedNode(XSD + "boolean"))));
      return b;
    }

    if (kw === "min" || kw === "max" || kw === "exactly") {
      const n = String(r.count);

      if (r.value && r.value !== null) {
        // Qualified cardinality
        const qPred =
          (kw === "min") ? OWL + "minQualifiedCardinality" :
          (kw === "max") ? OWL + "maxQualifiedCardinality" :
                           OWL + "qualifiedCardinality";

        quads.push(quad(b, namedNode(qPred), literal(n, namedNode(XSD + "nonNegativeInteger"))));

        const filler = someOnlyFiller(r.value, propIsObject);
        quads.push(quad(b, namedNode(propIsObject ? (OWL + "onClass") : (OWL + "onDataRange")), filler));
        return b;
      }

      // Unqualified cardinality
      const unqPred =
        (kw === "min") ? OWL + "minCardinality" :
        (kw === "max") ? OWL + "maxCardinality" :
                         OWL + "cardinality";

      quads.push(quad(b, namedNode(unqPred), literal(n, namedNode(XSD + "nonNegativeInteger"))));
      return b;
    }

    throw new Error("Unknown restriction keyword: " + kw);
  }

  function hasValueTerm(v, propIsObject) {
    // Object property -> individual required; Data property -> literal required
    if (propIsObject) {
      if (v && typeof v === "object" && v.individualType) return individualToTerm(v);
      throw new Error("ObjectProperty hasValue expects an individual, got: " + JSON.stringify(v));
    } else {
      if (v && typeof v === "object" && v.type) return literalToTerm(v, prefixes);
      throw new Error("DataProperty hasValue expects a literal, got: " + JSON.stringify(v));
    }
  }

  function someOnlyFiller(sp, propIsObject) {
    // ObjectProperty expects a *class expression* (or ObjectOneOf / Restriction / etc.)
    // DataProperty expects a *data range* (datatypeRestriction / literalList / datatype IRI ...)
    if (!sp || typeof sp !== "object") throw new Error("Bad somePrimary: " + sp);

    if (propIsObject) {
      switch (sp.unknownPrimaryType) {
        case "IRI":
          return iriAstToNamedNode(sp.IRI, prefixes);
        case "restriction":
          return restrictionAsClassExpr(sp.restriction);
        case "expression":
          return asClassExpr(sp.expression);
        case "individualList": {
          const inds = (sp.list || []).map(individualToTerm);
          const b = blankNode();
          quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
          quads.push(quad(b, namedNode(OWL + "oneOf"), addRdfList(quads, inds)));
          return b;
        }
        default:
          throw new Error("ObjectProperty filler cannot be " + sp.unknownPrimaryType);
      }
    } else {
      switch (sp.unknownPrimaryType) {
        case "datatypeRestriction":
          return datatypeRestrictionToDataRange(sp.restriction, prefixes, quads);
        case "literalList":
          return literalListToDataOneOf(sp.list, prefixes, quads);
        case "IRI":
          // Treat IRI as datatype IRI for data properties (as in your 'exactly 1 integer' example)
          return iriAsDatatypeTerm(sp.IRI, prefixes);
        case "expression":
          // Your somePrimary allows expression(...) but for data properties that would be a data range,
          // while your unknownExpression grammar describes class-like expressions.
          // Safer to reject (so you notice invalid Manchester).
          throw new Error("DataProperty filler cannot be an unknownExpression (class expression).");
        case "restriction":
          throw new Error("DataProperty filler cannot be an object restriction.");
        case "individualList":
          throw new Error("DataProperty filler cannot be an individual list.");
        default:
          throw new Error("Unsupported DataProperty filler: " + sp.unknownPrimaryType);
      }
    }
  }

  /* ----- unknownExpression nodes used inside SomePrimary(expression) ----- */
  function unknownDisjunction(node) {
    const parts = (node.items || []).map(unknownConjunction);
    if (parts.length === 1) return parts[0];

    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
    quads.push(quad(b, namedNode(OWL + "unionOf"), addRdfList(quads, parts)));
    return b;
  }

  function unknownConjunction(node) {
    if (node.grammarProduction === "conjunctionWithRestrictions") return conjunctionWithRestrictions(node);
    if (node.grammarProduction !== "unknownConjunction") {
      throw new Error("Unexpected unknownConjunction node");
    }

    const parts = (node.items || []).map(unknownPrimaryAsClassExpr);
    if (parts.length === 1) return parts[0];

    const b = blankNode();
    quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
    quads.push(quad(b, namedNode(OWL + "intersectionOf"), addRdfList(quads, parts)));
    return b;
  }

  function unknownPrimaryAsClassExpr(p) {
    let inner;
    switch (p.unknownPrimaryType) {
      case "IRI":
        inner = iriAstToNamedNode(p.IRI, prefixes);
        break;
      case "restriction":
        inner = restrictionAsClassExpr(p.restriction);
        break;
      case "expression":
        inner = asClassExpr(p.expression);
        break;
      case "individualList": {
        const inds = (p.list || []).map(individualToTerm);
        const b = blankNode();
        quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
        quads.push(quad(b, namedNode(OWL + "oneOf"), addRdfList(quads, inds)));
        inner = b;
        break;
      }
      default:
        throw new Error("Unknown unknownPrimaryType: " + p.unknownPrimaryType);
    }

    if (p.negation === "true") {
      const b = blankNode();
      quads.push(quad(b, namedNode(RDF + "type"), namedNode(OWL + "Class")));
      quads.push(quad(b, namedNode(OWL + "complementOf"), inner));
      return b;
    }
    return inner;
  }

  const term = asClassExpr(ast);
  return { term, quads };
}

function isObjectProperty(property){
	return false
}


function addN3AxiomQuad({
  classIRI,
  axiomItem,          // e.g. axiomObject.axiom[1][i]
  subType,            // "IRI" | "Expression"
  axiomType,          // axiomObject.type
  writer,
  quad,
  namedNode,
  onto,
  namespaceTable,
  typeList,
}) {
  const dataPropertySet = new Set(onto.DataProperty);

  const addExprSupportAndGetTerm = (expression) => {
    const { term, quads } = classExpressionAstToN3(expression, {
      prefixes: namespaceTable,
      isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
    });

    for (let j = 0; j < quads.length; j++) writer.addQuad(quads[j]);
    return term;
  };

  const predicate = namedNode(typeList[axiomType]);

  // IRI → IRI
  if (axiomItem.IRI && subType === "IRI") {
    writer.addQuad(
      quad(namedNode(classIRI), predicate, namedNode(axiomItem.IRI))
    );
    return;
  }

  // Expression → IRI
  if (axiomItem.IRI && subType === "Expression") {
    const subjTerm = addExprSupportAndGetTerm(classIRI);
    writer.addQuad(
      quad(subjTerm, predicate, namedNode(axiomItem.IRI))
    );
    return;
  }

  // IRI → Expression
  if (axiomItem.Expression && subType === "IRI") {
    const objTerm = addExprSupportAndGetTerm(axiomItem.Expression);
    writer.addQuad(
      quad(namedNode(classIRI), predicate, objTerm)
    );
    return;
  }

  // Expression → Expression
  if (axiomItem.Expression && subType === "Expression") {
    const subjTerm = addExprSupportAndGetTerm(classIRI);
    const objTerm = addExprSupportAndGetTerm(axiomItem.Expression);
    writer.addQuad(
      quad(subjTerm, predicate, objTerm)
    );
  }
}

const NS = {
  rdf:  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl:  "http://www.w3.org/2002/07/owl#",
  xsd:  "http://www.w3.org/2001/XMLSchema#",
  dc:   "http://purl.org/dc/elements/1.1/",
  skos: "http://www.w3.org/2004/02/skos/core#",
};

function nn(iri) { return namedNode(iri); }

// Your mapping, but returning N3 NamedNodes
function predFromAxiomSymbolN3(axiomSymbol) {
  const map = {
    "rdfs:label": nn(NS.rdfs + "label"),
    "rdfs:comment": nn(NS.rdfs + "comment"),
    "rdfs:seeAlso": nn(NS.rdfs + "seeAlso"),
    "rdfs:isDefinedBy": nn(NS.rdfs + "isDefinedBy"),
    "owl:versionInfo": nn(NS.owl + "versionInfo"),
    "owl:priorVersion": nn(NS.owl + "priorVersion"),
    "owl:backwardCompatibleWith": nn(NS.owl + "backwardCompatibleWith"),
    "owl:incompatibleWith": nn(NS.owl + "incompatibleWith"),
    "dc:title": nn(NS.dc + "title"),
    "dc:creator": nn(NS.dc + "creator"),
    "dc:description": nn(NS.dc + "description"),
    "skos:definition": nn(NS.skos + "definition"),
    "skos:altLabel": nn(NS.skos + "altLabel"),
    "skos:prefLabel": nn(NS.skos + "prefLabel"),
    "owl:annotatedSource": nn(NS.owl + "annotatedSource"),
    "owl:annotatedProperty": nn(NS.owl + "annotatedProperty"),
    "owl:annotatedTarget": nn(NS.owl + "annotatedTarget"),
    "rdf:reifies": nn(NS.rdf + "reifies"),
  };

  // If axiomSymbol is already a full IRI, use it directly.
  // If it’s prefixed (e.g., "rdfs:range") and NOT in map, you need a prefix-expander.
  // Here we do a minimal expander for rdf/rdfs/owl/xsd/dc/skos:
  if (map[axiomSymbol]) return map[axiomSymbol];

  const m = /^([a-zA-Z_][\w-]*):(.+)$/.exec(axiomSymbol || "");
  if (m) {
    const [_, pfx, local] = m;
    if (NS[pfx]) return nn(NS[pfx] + local);
  }

  return nn(axiomSymbol); // assume absolute IRI
}

function termFromValueOrIRIN3(objNode, langNode) {
  if (!objNode) return null;

  if (typeof objNode.IRI !== "undefined") {
    return nn(objNode.IRI);
  }

  if (typeof objNode.value !== "undefined") {
    const lang = langNode?.language;
    return lang ? literal(objNode.value, lang) : literal(objNode.value);
  }

  if (typeof objNode.Number !== "undefined") {
    // Cardinalities: nonNegativeInteger is a good default
    return literal(String(objNode.Number), nn(NS.xsd + "nonNegativeInteger"));
  }

  return null;
}

// writer can be N3.Writer or store can be N3.Store. Both can accept quads.
// - If using N3.Writer: writer.addQuad(s,p,o)
// - If using N3.Store:  store.addQuad(s,p,o)
function addQuad(target, s, p, o) {
  if (!s || !p || !o) return;
  if (typeof target.addQuad === "function") target.addQuad(s, p, o);
  else if (typeof target.add === "function") target.addQuad(s, p, o); // just in case
}

// ---- main: AnnotationAssertion with optional axiom annotations (N3.js) ----
export function addAnnotationAssertionWithAxiomAnnotationsN3(target, ax) {
  if (typeof ax?.axiom?.[1]?.IRI === "undefined") return;

  const subj = nn(ax.axiom[1].IRI);
  const pred = predFromAxiomSymbolN3(ax.axiom[0]?.axiomSymbol);
  const objTerm = termFromValueOrIRIN3(ax.axiom[2], ax.axiom[3]);
  if (!subj || !pred || !objTerm) return;

  // 1) base triple
  addQuad(target, subj, pred, objTerm);

  // 2) axiom annotations via owl:Axiom reification
  const annList = ax.axiom?.[4]?.axiom;
  if (Array.isArray(annList) && annList.length > 0) {
    const axiomBNode = blankNode();

    addQuad(target, axiomBNode, nn(NS.rdf + "type"), nn(NS.owl + "Axiom"));
    addQuad(target, axiomBNode, nn(NS.owl + "annotatedSource"), subj);
    addQuad(target, axiomBNode, nn(NS.owl + "annotatedProperty"), pred);
    addQuad(target, axiomBNode, nn(NS.owl + "annotatedTarget"), objTerm);

    for (const ann of annList) {
      const annPred = predFromAxiomSymbolN3(ann?.axiomSymbol);
      const annObj = termFromValueOrIRIN3(
        ann?.axiom,
        ann?.language ? { language: ann.language } : null
      );

      if (annPred && annObj) {
        addQuad(target, axiomBNode, annPred, annObj);
      }
    }
  }
}



export {
	generateN3Syntax
}
