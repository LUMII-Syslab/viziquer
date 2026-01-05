// In server-only code
import * as $rdf from 'rdflib';


Meteor.methods({
  parseOwlTurtle(turtleText) {
    const store = $rdf.graph();
    const baseURI = 'http://example.org#';

    $rdf.parse(turtleText, store, baseURI, 'text/turtle');

    const result = $rdf.serialize(null, store, baseURI, 'application/rdf+xml');
    return result;
  },

  declareOwlClass() {
    const store = $rdf.graph();

    // Namespaces
    const EX = $rdf.Namespace('http://example.org/');
    const OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#');
    const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');

    // Add OWL class declaration
    store.add(EX('MyClass'), RDF('type'), OWL('Class'));

    // Serialize to Turtle
    const turtle = $rdf.serialize(null, store, 'http://example.org/', 'text/turtle');
	// const rdfxml = $rdf.serialize(null, store, 'http://example.org/', 'application/rdf+xml');
	// const ntriples = $rdf.serialize(null, store, 'http://example.org/', 'application/n-triples');
	// const n3 = $rdf.serialize(null, store, 'http://example.org/', 'text/n3');
	// const jsonld = $rdf.serialize(null, store, 'http://example.org/', 'application/ld+json');

    return turtle;
  },

  generateOwlRDFLib(onto, namespaceTable, format = 'text/turtle') {

	  const store = $rdf.graph();


    store.namespaces = {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      owl: 'http://www.w3.org/2002/07/owl#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    };
    let BASE;
     for (const key of Object.keys(namespaceTable)){
      if(key === ":") {
		store.namespaces[""] = namespaceTable[key];
		BASE = namespaceTable[key];
		// BASE = $rdf.Namespace(namespaceTable[key]);
	  }
      else store.namespaces[key] = namespaceTable[key]
    }

	  const ns = {
		rdf: $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
		rdfs: $rdf.Namespace('http://www.w3.org/2000/01/rdf-schema#'),
		owl: $rdf.Namespace('http://www.w3.org/2002/07/owl#'),
	  };

	  const annotationPropertyTypes = {
		"rdfs:label": ns.rdfs('label'),
		"rdfs:comment": ns.rdfs('comment'),
		"rdfs:seeAlso": ns.rdfs('seeAlso'),
		"rdfs:isDefinedBy": ns.rdfs('isDefinedBy'),
		"owl:versionInfo": ns.owl('versionInfo'),
		"owl:priorVersion": ns.owl('priorVersion'),
		"owl:backwardCompatibleWith": ns.owl('backwardCompatibleWith'),
		"owl:incompatibleWith": ns.owl('incompatibleWith'),
		"dc:title": $rdf.sym('http://purl.org/dc/elements/1.1/title'),
		"dc:creator": $rdf.sym('http://purl.org/dc/elements/1.1/creator'),
		"dc:description": $rdf.sym('http://purl.org/dc/elements/1.1/description'),
		"skos:definition": $rdf.sym('http://www.w3.org/2004/02/skos/core#definition'),
		"skos:altLabel": $rdf.sym('http://www.w3.org/2004/02/skos/core#altLabel'),
		"skos:prefLabel": $rdf.sym('http://www.w3.org/2004/02/skos/core#prefLabel'),
		"owl:annotatedSource": ns.owl('annotatedSource'),
		"owl:annotatedProperty": ns.owl('annotatedProperty'),
		"owl:annotatedTarget": ns.owl('annotatedTarget'),
		"rdf:reifies": ns.rdf('reifies')
	  };

	  const { Ontology, Class, DataType, AnnotationProperty, ObjectProperty, NamedIndividual } = onto;



	  const addTriple = (s, p, o) => store.add($rdf.sym(s), $rdf.sym(p), $rdf.sym(o));
	  for (const key of Object.keys(Ontology)) {
		if(key === "iri"){
			store.add(
			  $rdf.namedNode(Ontology[key]),
			  $rdf.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
			  $rdf.namedNode("http://www.w3.org/2002/07/owl#Ontology")
			);
		}
		for (const onto of Object.keys(Ontology[key])) {
			const ax = Ontology[key][onto];
			if(ax.type === "Annotation"){
				let subj = $rdf.namedNode(namespaceTable[":"])
				let annotationType = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol];
				let annotationValue = ax.axiom[1]?.value;
				let annotationLanguage = ax.axiom[2]?.language;
				if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;
				store.add(subj, annotationType, $rdf.literal(annotationValue));
			} else if(ax.type === "AnnotationAssertion") {
				if(typeof ax.axiom[1].IRI !== "undefined" && typeof ax.axiom[2].value !== "undefined"){
				  const subj = ax.axiom[1].IRI;
				  const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol];
				  let obj = ax.axiom[2].value;
				  const objLanguage = ax.axiom[3]?.language;
			      if(objLanguage) obj = obj + "@" + objLanguage;
				  if (subj && pred && obj) {
					store.add($rdf.sym(subj), pred, $rdf.literal(obj));
				  }
				}
			 }
		}
	  }
	  for (const key of Object.keys(Class)) {
		for (const clazz of Object.keys(Class[key])) {
		  const ax = Class[key][clazz];
		  if (ax.type === "Declaration" && ax.axiom.type === "Class") {
			addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.owl('Class').uri);
		  }else if (ax.type === "Declaration" && ax.axiom.type === "DataProperty") {
			addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.owl('DatatypeProperty').uri);
		  }else if (ax.type === "DataPropertyDomain") {
			  const attrIRI = ax.axiom[0].IRI;
			  const classIRI = ax.axiom[1].IRI;
			  addTriple(attrIRI, ns.rdfs('domain').uri, classIRI);
		  } else if (ax.type === "DataPropertyRange") {
			  const attrIRI = ax.axiom[0].IRI;
			  const classIRI = ax.axiom[1].IRI;
			  addTriple(attrIRI, ns.rdfs('range').uri, classIRI);
		  }else if (ax.type === "FunctionalDataProperty") {
			addTriple(ax.axiom.IRI, ns.rdf('type').uri, ns.owl('FunctionalProperty').uri);
		  } else if (["EquivalentDataProperties", "DisjointDataProperties", "SubDataPropertyOf"].includes(ax.type)) {
			  if (ax.axiom.length >= 2) {
				  const predMap = {
					  EquivalentDataProperties: ns.owl('equivalentProperty').uri,
					  DisjointDataProperties: ns.owl('propertyDisjointWith').uri,
					  SubDataPropertyOf: ns.rdfs('subPropertyOf').uri
					};

				  const base = ax.axiom[0].IRI;
				  for (let i = 1; i < ax.axiom.length; i++) {
					addTriple(base, predMap[ax.type] ,ax.axiom[i].IRI);
				  }
				}

		  } else if (["EquivalentClasses", "DisjointClasses", "SubClassOf"].includes(ax.type)) {
        const typeMap = {
          EquivalentClasses: ns.owl('equivalentClass').uri,
          DisjointClasses: ns.owl('disjointWith').uri,
          SubClassOf: ns.rdfs('subClassOf').uri,
        };

        if(typeof ax.axiom.type !== "undefined" && ax.axiom.type === "ObjectComplementOf"){
          // Blank node for ObjectComplementOf(:someClass)
            const complementBNode = $rdf.blankNode();

            // Declare it a class
            store.add(complementBNode, ns.rdf('type'), ns.owl('Class'));

            // owl:complementOf ex:someClass
            store.add(complementBNode, ns.owl('complementOf'), ax.axiom.axiom.IRI);

            // ex:Person owl:equivalentClass _:bnode
            store.add(ax.axiom.IRI, ns.owl('equivalentClass'), complementBNode);
        } else if(typeof ax.axiom[1] !== "undefined" && typeof ax.axiom[1].type !== "undefined" && ax.axiom[1].type.indexOf("Cardinality") !== -1){
		  const clsIRI   = ax.axiom[0].IRI;
		  const part     = ax.axiom[1];
		  const n        = part.axiom[0].Number;
		  const propIRI  = part.axiom[1].IRI;
		  const dtypeIRI = part.axiom[2]?.IRI; // may be undefined

		  // _:r (blank node for the restriction)
		  const r = $rdf.blankNode();

		  // :Class rdfs:subClassOf _:r
		  store.add($rdf.sym(clsIRI),
					$rdf.sym("http://www.w3.org/2000/01/rdf-schema#subClassOf"),
					r);

		  // _:r rdf:type owl:Restriction
		  store.add(r,
					$rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
					$rdf.sym("http://www.w3.org/2002/07/owl#Restriction"));

		  // _:r owl:onProperty :Attr
		  store.add(r,
					$rdf.sym("http://www.w3.org/2002/07/owl#onProperty"),
					$rdf.sym(propIRI));

		  // "n"^^xsd:nonNegativeInteger
		  const nLit = $rdf.literal(
			String(n),
			$rdf.sym("http://www.w3.org/2001/XMLSchema#nonNegativeInteger")
		  );

		  // predicate maps
		  const predUnq = {
			DataMinCardinality:  "http://www.w3.org/2002/07/owl#minCardinality",
			DataMaxCardinality:  "http://www.w3.org/2002/07/owl#maxCardinality",
			DataExactCardinality:"http://www.w3.org/2002/07/owl#cardinality"
		  };
		  const predQ = {
			DataMinCardinality:  "http://www.w3.org/2002/07/owl#minQualifiedCardinality",
			DataMaxCardinality:  "http://www.w3.org/2002/07/owl#maxQualifiedCardinality",
			DataExactCardinality:"http://www.w3.org/2002/07/owl#qualifiedCardinality"
		  };

		  if (dtypeIRI) {
			// Qualified cardinality
			store.add(r, $rdf.sym(predQ[part.type]), nLit);
			store.add(r,
					  $rdf.sym("http://www.w3.org/2002/07/owl#onDataRange"),
					  $rdf.sym(dtypeIRI));
		  } else {
			// Unqualified cardinality
			store.add(r, $rdf.sym(predUnq[part.type]), nLit);
			// no owl:onDataRange
		  }
		} else if(ax.type === "EquivalentClasses" && typeof ax.axiom[1] !== "undefined" && ax.axiom[1].type === "ObjectUnionOf"){
			 // Left-hand class

		  // Union part (ObjectUnionOf)
		  const unionPart = ax.axiom[1];
		  if (unionPart.type !== "ObjectUnionOf") {
			throw new Error("Expected ObjectUnionOf in ax.axiom[1]");
		  }


			const RDF  = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
			const OWL  = $rdf.Namespace('http://www.w3.org/2002/07/owl#');
			  const [left, right] = ax.axiom;

			  if (!left?.IRI) throw new Error('Left side must be a class IRI.');
			  if (right?.type !== 'ObjectUnionOf' || !Array.isArray(right.axiom) || right.axiom.length < 2) {
				throw new Error('Right side must be ObjectUnionOf with ≥ 2 class IRIs.');
			  }

			  // LHS class
			  const LHS = $rdf.namedNode(left.IRI);

			  // Union list members
			  const members = right.axiom.map(x => $rdf.namedNode(x.IRI));

			  // _:u a owl:Class ; owl:unionOf ( members )
			  const unionExpr = $rdf.blankNode();
			  const unionList = new $rdf.Collection(members); // builds rdf:first/rest chain
			  store.add(unionExpr, OWL('unionOf'), unionList);
			  // (optional) some tools like the explicit type triple:
			  // store.add(unionExpr, RDF('type'), OWL('Class'));

			  // :LHS owl:equivalentClass _:u .
			  store.add(LHS, OWL('equivalentClass'), unionExpr);


		}else{
		  if(ax.axiom.length > 2 && ax.type === "DisjointClasses"){
			const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
			const OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#');
			const EX = $rdf.Namespace('http://example.org/');

			// Convert to RDFLib NamedNodes
			const classNodes = ax.axiom.map(c => $rdf.namedNode(c.IRI));

			// Create a blank node for the axiom
			const axiom = $rdf.blankNode();

			// Add type triple: [] a owl:AllDisjointClasses
			store.add(axiom, RDF('type'), OWL('AllDisjointClasses'));

			// Create an RDF list of the class nodes
			const listNode = new $rdf.Collection(classNodes);

			// Link the list to the axiom: owl:members (ex:A ex:B ex:C ex:D)
			store.add(axiom, OWL('members'), listNode);
		  }else if(ax.axiom.length > 2 && ax.type === "EquivalentClasses") {
			   const OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#');

			  const classNodes = ax.axiom.map(c => $rdf.namedNode(c.IRI));

			  // Create pairwise owl:equivalentClass triples
			  for (let i = 0; i < classNodes.length; i++) {
				const subject = classNodes[i];
				const others = classNodes.filter((_, j) => j !== i);
				others.forEach(obj => {
				  store.add(subject, OWL('equivalentClass'), obj);
				});
			  }
		  }else{
			  const subj = ax.axiom[0].IRI;
			  if(typeof ax.axiom[1].IRI === "undefined"){
				for (const target of ax.axiom[1]) {
				  addTriple(subj, typeMap[ax.type], target.IRI);
				}
			  } else {
				addTriple(subj, typeMap[ax.type], ax.axiom[1].IRI);
			  }
			}
        }
		  } else if (ax.type === "AnnotationAssertion") {
			if(typeof ax.axiom[1].IRI !== "undefined" && typeof ax.axiom[2].value !== "undefined"){
			  const subj = ax.axiom[1].IRI;
			  const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol];
			  let obj = ax.axiom[2].value;
			  const objLanguage = ax.axiom[3]?.language;
			  if(objLanguage) obj = obj + "@" + objLanguage;
			  if (subj && pred && obj) {
				store.add($rdf.sym(subj), pred, $rdf.literal(obj));
			  }
			}
		  } else if (ax.type === "HasKey") {

			  const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
			  const OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#');
			  const cls = ax.axiom[0];
			  const propsBox = ax.axiom[1];

			  if (!cls?.IRI) throw new Error('HasKey: missing class IRI');
			  if (!propsBox || !Array.isArray(propsBox.axiom) || propsBox.axiom.length === 0) {
				throw new Error('HasKey: properties list is empty');
			  }

			  const classNode = $rdf.namedNode(cls.IRI);

			  // Build the list members: either a named node, or a bnode with owl:inverseOf
			  const members = propsBox.axiom.map(p => {
				if (p.inverseOf) {
				  const inv = $rdf.blankNode();
				  store.add(inv, OWL('inverseOf'), $rdf.namedNode(p.IRI));
				  return inv;
				} else {
				  return $rdf.namedNode(p.IRI);
				}
			  });

			  // Single RDF list with all property expressions
			  const keyList = new $rdf.Collection(members);

			  // :Class owl:hasKey ( ... )
			  store.add(classNode, OWL('hasKey'), keyList);

		  }
		}
	  }

	  for (const key of Object.keys(DataType)) {
		for (const d of Object.keys(DataType[key])) {
		  const ax = DataType[key][d];
		  if (ax.type === "Declaration" && ax.axiom.type === "Datatype") {
			addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.rdfs('Datatype').uri);
		  }else if (ax.type === "AnnotationAssertion") {
			if(typeof ax.axiom[1].IRI !== "undefined" && typeof ax.axiom[2].value !== "undefined"){
			  const subj = ax.axiom[1].IRI;
			  const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol];
			  let obj = ax.axiom[2].value;
			  const objLanguage = ax.axiom[3]?.language;
			  if(objLanguage) obj = obj + "@" + objLanguage;
			  if (subj && pred && obj) {
				store.add($rdf.sym(subj), pred, $rdf.literal(obj));
			  }
			}
		 } else if (ax.type === "DataTypeDefinition") {
			  const dt = ax.axiom[0].IRI;
			  const dtdefinition = ax.axiom[1].type;
			   if (dt && dtdefinition) {
				  const attrIRI = ax.axiom[0].IRI;
				  const classIRI = ax.axiom[1].IRI;
				  addTriple(dt, ns.owl('onDatatype').uri, dtdefinition);
			  }
			}
		}
	  }

	  for (const key of Object.keys(AnnotationProperty)) {
		for (const p of Object.keys(AnnotationProperty[key])) {
		  const ax = AnnotationProperty[key][p];
		  if (ax.type === "Declaration" && ax.axiom.type === "AnnotationProperty") {
        addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.owl('AnnotationProperty').uri);
		  } else if(ax.type === "AnnotationPropertyDomain" || ax.type === "AnnotationPropertyRange"){
		  if(typeof ax.axiom[1].IRI !== "undefined"){
			const typeMap = {
			  AnnotationPropertyDomain: ns.rdfs('domain').uri,
			  AnnotationPropertyRange: ns.rdfs('range').uri,
			};
			addTriple(ax.axiom[0].IRI, typeMap[ax.type], ax.axiom[1].IRI);
	     }
      } else if (ax.type === "AnnotationAssertion") {
        if(typeof ax.axiom[1].IRI !== "undefined" && typeof ax.axiom[2].value !== "undefined"){
          const subj = ax.axiom[1].IRI;
          const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol];
          let obj = ax.axiom[2].value;
		  const objLanguage = ax.axiom[3]?.language;
		  if(objLanguage) obj = obj + "@" + objLanguage;
          if (subj && pred && obj) {
            store.add($rdf.sym(subj), pred, $rdf.literal(obj));
          }
        }
		  } else if (ax.type === "SubAnnotationPropertyOf") {
        const subj = ax.axiom[0].IRI;
        for (const obj of ax.axiom[1]) {
          addTriple(subj, ns.rdfs('subPropertyOf'), obj.IRI);
        }
		  }
		}
	  }

    for (const key of Object.keys(NamedIndividual)) {
		for (const p of Object.keys(NamedIndividual[key])) {
		  const ax = NamedIndividual[key][p];
		  if (ax.type === "Declaration" && ax.axiom.type === "NamedIndividual") {
			addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.owl('NamedIndividual').uri);
		  } else if(ax.type === "ClassAssertion"){
			  if(typeof ax.axiom[0].IRI !== "undefined" && typeof ax.axiom[1].IRI !== "undefined")addTriple(ax.axiom[1].IRI, ns.rdf('type').uri, ax.axiom[0].IRI);
      } else if (ax.type === "AnnotationAssertion") {
        if(typeof ax.axiom[1].IRI !== "undefined" && typeof ax.axiom[2].value !== "undefined"){
          const subj = ax.axiom[1].IRI;
          const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol];
          let obj = ax.axiom[2].value;
		  const objLanguage = ax.axiom[3]?.language;
		  if(objLanguage) obj = obj + "@" + objLanguage;
          if (subj && pred && obj) {
            store.add($rdf.sym(subj), pred, $rdf.literal(obj));
          }
        }
		  }else if (["SameIndividual", "DifferentIndividuals"].includes(ax.type)) {
        const typeMap = {
          SameIndividual: ns.owl('sameAs').uri,
          DifferentIndividuals: ns.owl('differentFrom').uri,
        };
        const subj = ax.axiom[0].IRI;
        if(typeof ax.axiom[1].IRI === "undefined"){
          for (const target of ax.axiom[1]) {
            addTriple(subj, typeMap[ax.type], target.IRI);
          }
        } else {
          addTriple(subj, typeMap[ax.type], ax.axiom[1].IRI);
        }
		  } else if(ax.type === "SameAsIndivids"){
			const OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#');

			// Convert to NamedNodes (dedupe, drop falsy)
			const inds = ax.axiom.map(x => $rdf.namedNode(x.IRI));

			if (inds.length >= 2) {

			  const head = inds[0];
			  // for (let i = 1; i < inds.length; i++) {
				// store.add(head, OWL('sameAs'), inds[i]);
			  // }

			  // --- If you prefer full pairwise triples, use this instead ---
			  for (let i = 0; i < inds.length; i++) {
			    for (let j = i + 1; j < inds.length; j++) {
			      store.add(inds[i], OWL('sameAs'), inds[j]);
			      store.add(inds[j], OWL('sameAs'), inds[i]);
			    }
			  }
			}

		  } else if(ax.type === "DifferentIndivids"){
			const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
			const OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#');
			  // Convert to RDFLib NamedNodes
			const individuals = ax.axiom.map(x => $rdf.namedNode(x.IRI));

			// Step 1: Create a blank node for the axiom
			const axiom = $rdf.blankNode();

			// Step 2: Declare the type owl:AllDifferent
			store.add(axiom, RDF('type'), OWL('AllDifferent'));

			// Step 3: Create an RDF list of individuals
			const listNode = new $rdf.Collection(individuals);

			// Step 4: Link the list to the axiom with owl:members
			store.add(axiom, OWL('members'), listNode);

		  } else if(ax.type === "DataPropertyAssertion"){
			  let objectLiteral;
			  if (ax.axiom[3] && ax.axiom[3].type) {
				  // typed literal
				  objectLiteral = $rdf.literal(
					ax.axiom[2].value,
					$rdf.sym(ax.axiom[3].type)  // must be a NamedNode, not string
					);

				} else {
				  // plain literal
				  objectLiteral = $rdf.literal(ax.axiom[2].value);
				}

				// Add triple: :subject :property "value"^^type
				store.add(
				  $rdf.sym(ax.axiom[1].IRI),
				  $rdf.sym(ax.axiom[0].IRI),
				  objectLiteral
				);
		  } else if(ax.type === "NegativeDataPropertyAssertion"){
			  // Blank node for the negative assertion
			const neg = $rdf.blankNode();

			// a owl:NegativePropertyAssertion
			store.add(neg, ns.rdf("type"), ns.owl("NegativePropertyAssertion"));

			// owl:sourceIndividual :subject
			store.add(neg, ns.owl("sourceIndividual"), $rdf.sym(ax.axiom[1].IRI));

			// owl:assertionProperty :property
			store.add(neg, ns.owl("assertionProperty"), $rdf.sym(ax.axiom[0].IRI));

			// owl:targetValue "value" [^^datatype] — datatype optional
			let objectLiteral;
			if (ax.axiom[3] && ax.axiom[3].type) {
			  // modern shortcut: literal(value, NamedNode(datatypeIRI))
			  objectLiteral = $rdf.literal(
				ax.axiom[2].value,
				$rdf.sym(ax.axiom[3].type)
			  );
			} else {
			  objectLiteral = $rdf.literal(ax.axiom[2].value);
			}

			store.add(neg, ns.owl("targetValue"), objectLiteral);
		  }else if(ax.type === "ObjectPropertyAssertion"){
			store.add(
				$rdf.sym(ax.axiom[1].IRI),
				$rdf.sym(ax.axiom[0].IRI),
				$rdf.sym(ax.axiom[2].IRI)
			);
		  }else if(ax.type === "NegativeObjectPropertyAssertion"){
			  // Blank node for the negative assertion
			const neg = $rdf.blankNode();

			// a owl:NegativePropertyAssertion
			store.add(neg, ns.rdf("type"), ns.owl("NegativePropertyAssertion"));

			// owl:sourceIndividual :subject
			store.add(neg, ns.owl("sourceIndividual"), $rdf.sym(ax.axiom[1].IRI));

			// owl:assertionProperty :property
			store.add(neg, ns.owl("assertionProperty"), $rdf.sym(ax.axiom[0].IRI));

			store.add(neg, ns.owl("targetIndividual"), $rdf.sym(ax.axiom[2].IRI));
		  }
		}
	  }

	  for (const key of Object.keys(ObjectProperty)) {
		for (const p of Object.keys(ObjectProperty[key])) {
		  const ax = ObjectProperty[key][p];
		  if (ax.type === "Declaration" && ax.axiom.type === "ObjectProperty") {
			if(typeof ax.axiom.axiom.IRI !== "undefined")addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.owl('ObjectProperty').uri);
		  } else if (["ObjectPropertyDomain", "ObjectPropertyRange", "InverseObjectProperties"].includes(ax.type)) {
			const predMap = {
			  ObjectPropertyDomain: ns.rdfs('domain').uri,
			  ObjectPropertyRange: ns.rdfs('range').uri,
			  InverseObjectProperties: ns.owl('inverseOf').uri,
			};
			if(typeof ax.axiom[0].IRI !== "undefined" && typeof ax.axiom[1].IRI !== "undefined")addTriple(ax.axiom[0].IRI, predMap[ax.type], ax.axiom[1].IRI);
		  } else if (["EquivalentObjectProperties", "DisjointObjectProperties", "SubObjectPropertyOf"].includes(ax.type)) {

			if(typeof ax.axiom[1].axiom !== "undefined" && typeof ax.axiom[1].axiom.type !== "undefined" && ax.axiom[1].axiom.type === "ObjectPropertyChain"){
				const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
				const OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#');

				function termFor(item) {
				  if (item.inverseOf) {
					const inv = $rdf.blankNode();
					store.add(inv, OWL('inverseOf'), $rdf.sym(item.IRI));
					return inv;
				  }
				  return $rdf.sym(item.IRI);
				}

				const superProp = $rdf.sym(ax.axiom[0].IRI);
				const items = ax.axiom[1].axiom.axiom.map(termFor);

				// rdflib can create RDF Collections directly
				const list = new $rdf.Collection(items);
				store.add(superProp, OWL('propertyChainAxiom'), list);

			} else {


				const predMap = {
				  EquivalentObjectProperties: ns.owl('equivalentProperty').uri,
				  DisjointObjectProperties: ns.owl('propertyDisjointWith').uri,
				  SubObjectPropertyOf: ns.rdfs('subPropertyOf').uri,
				};
				const subj = ax.axiom[0].IRI;
				for (const obj of ax.axiom[1]) {
				  addTriple(subj, predMap[ax.type], obj.IRI);
				}
			}
		  } else if (typeof ax.type !== "undefined" && ax.type === "SubClassOf"){
			  if(typeof ax.axiom[1] !== "undefined" && ax.axiom[1].type.indexOf("Cardinality") !== -1){
				const clsIRI   = ax.axiom[0].IRI;
				const part     = ax.axiom[1];            // type: ObjectMin/Max/ExactCardinality
				const n        = part.axiom[0].Number;   // the number
				const propIRI  = part.axiom[1].IRI;      // object property IRI
				const classIRI = part.axiom[2]?.IRI;     // optional filler class IRI (qualified form)

				// _:r (blank node for the restriction)
				const r = $rdf.blankNode();

				// :A rdfs:subClassOf _:r
				store.add($rdf.sym(clsIRI),
						  $rdf.sym("http://www.w3.org/2000/01/rdf-schema#subClassOf"),
						  r);

				// _:r rdf:type owl:Restriction
				store.add(r,
						  $rdf.sym("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
						  $rdf.sym("http://www.w3.org/2002/07/owl#Restriction"));

				// _:r owl:onProperty :role
				store.add(r,
						  $rdf.sym("http://www.w3.org/2002/07/owl#onProperty"),
						  $rdf.sym(propIRI));

				// "n"^^xsd:nonNegativeInteger
				const nLit = $rdf.literal(
				  String(n),
				  $rdf.sym("http://www.w3.org/2001/XMLSchema#nonNegativeInteger")
				);

				// predicate maps for OBJECT property cardinalities
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
				  // Qualified: add *QualifiedCardinality* and owl:onClass :B
				  store.add(r, $rdf.sym(predQ[part.type]), nLit);
				  store.add(r,
							$rdf.sym("http://www.w3.org/2002/07/owl#onClass"),
							$rdf.sym(classIRI));
				} else {
				  // Unqualified: plain cardinality (no filler)
				  store.add(r, $rdf.sym(predUnq[part.type]), nLit);
				}
			  } else {
				// axiomList: predicates as NamedNodes
				const axiomList = {
				  ObjectSomeValuesFrom: ns.owl("someValuesFrom"),
				  ObjectAllValuesFrom:  ns.owl("allValuesFrom")
				};


				  const r = $rdf.blankNode();

				  // :A rdfs:subClassOf _:r .
				  store.add($rdf.sym(ax.axiom[0].IRI), ns.rdfs("subClassOf"), r);

				  // _:r a owl:Restriction .
				  store.add(r, ns.rdf("type"), ns.owl("Restriction"));

				  // figure out owl:onProperty target (direct vs inverse)
				  const propPart = ax.axiom[1].axiom[0]; // either { IRI } or { type:"ObjectInverseOf", axiom:{ IRI } }
				  let onPropObj;

				  if (typeof propPart.axiom !== "undefined" && propPart.axiom.type === "ObjectInverseOf") {
					// _:pe owl:inverseOf :propRest .
					const pe = $rdf.blankNode();
					store.add(pe, ns.owl("inverseOf"), $rdf.sym(propPart.axiom.axiom.IRI));
					onPropObj = pe; // owl:onProperty points to this blank node
				  } else {
					// direct property
					onPropObj = $rdf.sym(propPart.IRI);
				  }

				  // _:r owl:onProperty (X or [owl:inverseOf X]) .
				  store.add(r, ns.owl("onProperty"), onPropObj);

				  // _:r (some|all)ValuesFrom :B .
				  const restrPred = axiomList[ax.axiom[1].type]; // NamedNode
				  store.add(r, restrPred, $rdf.sym(ax.axiom[1].axiom[1].IRI));
			  }
		} else if (["FunctionalObjectProperty", "InverseFunctionalObjectProperty", "SymmetricObjectProperty", "AsymmetricObjectProperty", "ReflexiveObjectProperty", "IrreflexiveObjectProperty", "TransitiveObjectProperty"].includes(ax.type)) {
			if(typeof ax.axiom[1].IRI !== "undefined"){
				const objMap = {
				  FunctionalObjectProperty: ns.owl('FunctionalProperty').uri,
				  InverseFunctionalObjectProperty: ns.owl('InverseFunctionalProperty').uri,
				  SymmetricObjectProperty: ns.owl('SymmetricProperty').uri,
				  AsymmetricObjectProperty: ns.owl('AsymmetricProperty').uri,
				  ReflexiveObjectProperty: ns.owl('ReflexiveProperty').uri,
				  IrreflexiveObjectProperty: ns.owl('IrreflexiveProperty').uri,
				  TransitiveObjectProperty: ns.owl('TransitiveProperty').uri
				};
				const subj = ax.axiom[1].IRI;

				addTriple(subj, ns.rdf('type').uri, objMap[ax.type]);
			}
		  }else if (ax.type === "AnnotationAssertion") {
			const subj = ax.axiom[1]?.IRI;
			const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol];
			let obj = ax.axiom[2]?.value;
			const objLanguage = ax.axiom[3]?.language;
			if(objLanguage) obj = obj + "@" + objLanguage;
			if (subj && pred && obj) {
			  // Check for annotations on this annotation
			  const annotations = ax.axiom[3].annotations || [];

			  if (annotations.length > 0) {
				const axiomNode = $rdf.blankNode();
				store.add(axiomNode, ns.rdf('type'), ns.owl('Axiom'));
				store.add(axiomNode, ns.owl('annotatedSource'), $rdf.sym(subj));
				store.add(axiomNode, ns.owl('annotatedProperty'), pred);
				store.add(axiomNode, ns.owl('annotatedTarget'), $rdf.literal(obj));

				for (const ann of annotations) {
				  const annPred = annotationPropertyTypes[ann.IRI] || $rdf.sym(ann.IRI);
				  const annValue = $rdf.literal(ann.value);
				  store.add(axiomNode, annPred, annValue);

				  // Handle one level of nested annotations if present as object
				  const nestedAnnotations = ann.annotations;
				  if (Object.keys(nestedAnnotations).length > 0) {
					const nestedAxiomNode = $rdf.blankNode();
					store.add(nestedAxiomNode, ns.rdf('type'), ns.owl('Axiom'));
					store.add(nestedAxiomNode, ns.owl('annotatedSource'), axiomNode);
					store.add(nestedAxiomNode, ns.owl('annotatedProperty'), annPred);
					store.add(nestedAxiomNode, ns.owl('annotatedTarget'), annValue);

					const innerPred = annotationPropertyTypes[nestedAnnotations.IRI] || $rdf.sym(nestedAnnotations.IRI);
					const innerValue = $rdf.literal(nestedAnnotations.value);
					store.add(nestedAxiomNode, innerPred, innerValue);

				  }
				  //here is there level of annotations
				}
			  } else {
				store.add($rdf.sym(subj), pred, $rdf.literal(obj));
			  }
			}
		  }
		}
	  }
console.log("store.namespaces", store.namespaces)
	 return  store.serialize(null, format)
	  // return $rdf.serialize(null, store, BASE, format);
	}
});
