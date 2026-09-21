// In server-only code 
import * as $rdf from 'rdflib';

const RDF  = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const RDFS = "http://www.w3.org/2000/01/rdf-schema#";
const OWL  = "http://www.w3.org/2002/07/owl#";
const XSD  = "http://www.w3.org/2001/XMLSchema#";
const sh = "http://www.w3.org/ns/shacl#";
const sh_local = "http://www.w3.org/ns/shacl_local#";
const dash = "http://datashapes.org/dash#";


Meteor.methods({
  

  generateShaclRDFLib(onto, namespaceTable, format = 'text/turtle') {

	const store = $rdf.graph();


    store.namespaces = {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      owl: 'http://www.w3.org/2002/07/owl#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
	  sh: 'http://www.w3.org/ns/shacl#',
	  sh_local: 'http://www.w3.org/ns/shacl_local#',
	  dash: 'http://datashapes.org/dash#',
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
		sh: $rdf.Namespace('http://www.w3.org/ns/shacl#'),
		sh_local: $rdf.Namespace('http://www.w3.org/ns/shacl_local#'),
		dash: $rdf.Namespace('http://datashapes.org/dash#'),
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

	  let { Ontology, Class, DataType, AnnotationProperty, ObjectProperty, NamedIndividual, SHACL } = onto;



	  const addTriple = (s, p, o) => store.add($rdf.sym(s), $rdf.sym(p), $rdf.sym(o));
	  for (const key of Object.keys(Ontology)) {
		if(key === "iri"){
			addTriple(Ontology[key], ns.rdf('type').uri, ns.owl('Ontology').uri);
		} else {
		  for (const onto of Object.keys(Ontology[key])) {
			const ax = Ontology[key][onto];
			if(ax.type === "Annotation"){
				let subj = $rdf.namedNode(namespaceTable[":"])
				let annotationType = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol] || $rdf.sym(ax.axiom[0]?.axiomSymbol);
				let annotationValue = ax.axiom[1]?.value;
				let annotationLanguage = ax.axiom[2]?.language;
				// if(annotationLanguage) annotationValue = annotationValue + "@" + annotationLanguage;
				const objLanguage = ax.axiom[2]?.language;
				  if (subj && annotationType && annotationValue) {
					 if (objLanguage) {
						store.add(subj, annotationType, $rdf.literal(annotationValue, objLanguage));
					  } else {
						store.add(subj, annotationType, $rdf.literal(annotationValue));
					  }
				  }
			} else if(ax.type === "AnnotationAssertion") {
				if(typeof ax.axiom[1].IRI !== "undefined" && typeof ax.axiom[2].value !== "undefined"){
				  const subj = ax.axiom[1].IRI;
				  const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol] || $rdf.sym(ax.axiom[0]?.axiomSymbol);
				  let obj = ax.axiom[2].value;
				  const objLanguage = ax.axiom[3]?.language;
				  if (subj && pred && obj) {
					 if (objLanguage) {
						store.add(subj, pred, $rdf.literal(obj, objLanguage));
					  } else {
						store.add(subj, pred, $rdf.literal(obj));
					  }
				  }
				}
			 }
		  }
		}
	  }
	  
	  
	  //NodeShapes
	  for (const key of Object.keys(SHACL.NodeShape)) {
		let shape = SHACL.NodeShape[key];
		// NodeShape
		addTriple(shape.IRI, ns.rdf('type').uri, ns.sh('NodeShape').uri);
		let owlClass = shape.owlClass;
		if(owlClass && owlClass.IRI){
			// OWL class declaration
			addTriple(owlClass.IRI, ns.rdf('type').uri, ns.owl('Class').uri);
			//sh:targetClass
			addTriple(shape.IRI, ns.sh('targetClass').uri, owlClass.IRI);
		}
		if(shape.Instance) {
			let instance = shape.Instance;
			// Instance declaration
			addTriple(instance.IRI, ns.rdf('type').uri, ns.owl('NamedIndividual').uri);
			//targerNode
			addTriple(shape.IRI, ns.sh('targetNode').uri, instance.IRI);
			if(instance.onClass) addTriple(shape.IRI, ns.sh('class').uri, instance.onClass);
			let properties = instance.Properties;
			if(properties){
				for (let p = 0; p < properties.length; p++){

					const propertyIRI = $rdf.sym(properties[p]["path"]);   // e.g. "http://example.org/personName"
					const datatypeIRI = properties[p]["type"];        // e.g. "http://www.w3.org/2001/XMLSchema#string"
					const value = properties[p].hasValue;

					// blank node for:
					// [ sh:path :personName ; sh:hasValue "Anna"^^xsd:string ]
					const propertyShape = $rdf.blankNode();


					// sh_local:Anna_shape sh:property _:propertyShape .
					store.add(
					  shape.IRI,
					  $rdf.sym(ns.sh('property')),
					  propertyShape
					);

					// _:propertyShape sh:path :personName .
					store.add(
					  propertyShape,
					  $rdf.sym(ns.sh('path')),
					  propertyIRI
					);

					// _:propertyShape sh:hasValue "Anna"^^xsd:string .
					if(datatypeIRI){
						store.add(
						  propertyShape,
						  $rdf.sym(ns.sh('hasValue')),
						  $rdf.literal(value, undefined, $rdf.sym(datatypeIRI))
						);
					} else {
						store.add(
						  propertyShape,
						  $rdf.sym(ns.sh('hasValue')),
						  $rdf.sym(value)
						);
					}
					
				}
			}
		}
		let disjoint = shape.disjoint;
		if(disjoint){
			for (let d = 0; d < disjoint.length; d++){
				const notShape = $rdf.blankNode();
				// sh_local:Student_shape sh:not _:notShape
				store.add(
				  shape.IRI,
				  $rdf.sym(ns.sh('not').uri),
				  notShape
				);

				// _:notShape sh:class n0:Teacher
				store.add(
				  notShape,
				  $rdf.sym(ns.sh('class').uri),
				   $rdf.sym(disjoint[d])
				);
		    }			
		}
		
		let subClass = shape.superClass;
		if(subClass){
			for (let s = 0; s < subClass.length; s++){
				addTriple(shape.IRI, ns.sh('class').uri, subClass[s])
		    }			
		}
		
		let or = shape.or;
		if(or){
			// Create blank node shapes:
			// [ sh:class :Student ]
			// [ sh:class :Teacher ]
			const alternativeShapes = or.map(classIRI => {
			  const shape = $rdf.blankNode();

			  store.add(
				shape,
				$rdf.sym(ns.sh('class').uri),
				$rdf.sym(classIRI)
			  );

			  return shape;
			});

			// Create RDF list:
			// ( [ sh:class :Student ] [ sh:class :Teacher ] )
			const orList = createRdfList(store, alternativeShapes);

			// sh_local:Person_shape sh:or ( ... ) .
			store.add(
			  shape.IRI,
			  $rdf.sym(ns.sh('or').uri),
			  orList
			);

		}
		
		let xone = shape.xone;
		if(xone){
			// Create blank node shapes:
			// [ sh:class :Student ]
			// [ sh:class :Teacher ]
			const alternativeShapes = xone.map(classIRI => {
			  const shape = $rdf.blankNode();

			  store.add(
				shape,
				$rdf.sym(ns.sh('class').uri),
				$rdf.sym(classIRI)
			  );

			  return shape;
			});

			// Create RDF list:
			// ( [ sh:class :Student ] [ sh:class :Teacher ] )
			const orList = createRdfList(store, alternativeShapes);

			store.add(
			  shape.IRI,
			  $rdf.sym(ns.sh('xone').uri),
			  orList
			);

		}
		
		let annotations = shape.annotations;
		if(annotations){
		  for (const annotation of annotations) {
			  if (!annotation.annotationType || annotation.value === undefined || annotation.value === null) {
				continue;
			  }

			  const predicate = $rdf.sym(annotation.annotationType);

			  let object;
			  if (annotation.language && annotation.language.trim() !== "") {
				object = $rdf.literal(annotation.value, annotation.language);
			  } else {
				object = $rdf.literal(annotation.value);
			  }

			  store.add(
				shape.IRI,
				predicate,
				object
			  );
			}
		}
		
		let targetSubjectsOf = shape.targetSubjectsOf;
		if(targetSubjectsOf){
			addTriple(shape.IRI, ns.sh('targetSubjectsOf').uri, targetSubjectsOf)
		}
		let targetObjectOf = shape.targetObjectOf;
		if(targetObjectOf){
			addTriple(shape.IRI, ns.sh('targetObjectOf').uri, targetObjectOf)
		}
		let clazz = shape.class;
		if(clazz){
			addTriple(shape.IRI, ns.sh('class').uri, clazz.IRI)
		}
		let node = shape.node;
		if(node){
			addTriple(shape.IRI, ns.sh('node').uri, node.IRI)
		}
	  } 
	  
	  //PropertyShapes
	  for (const key of Object.keys(SHACL.PropertyShape)) {
		let shape = SHACL.PropertyShape[key];
		// PropertyShape
		addTriple(shape.IRI, ns.rdf('type').uri, ns.sh('PropertyShape').uri);
		let owlProperty = shape.owlProperty;
		if(owlProperty && owlProperty.IRI){
			//OWL property declaration
			addTriple(owlProperty.IRI, ns.rdf('type').uri, ns.owl(owlProperty.kind).uri);
			//rdf:property
			addTriple(owlProperty.IRI, ns.rdf('type').uri, ns.rdf('Property').uri);
			// sh:path
			addTriple(shape.IRI, ns.sh('path').uri, owlProperty.IRI);
		}
		let range = shape.range;
		if(range && range.IRI){
			// sh:datatype
			if (range.kind === "datatype") addTriple(shape.IRI, ns.sh('datatype').uri, range.IRI);
			//sh:class
			else if (range.kind === "class") addTriple(shape.IRI, ns.sh('class').uri, range.IRI);
		}
		let domain = shape.domain;
		if(domain && domain.nodeShapeIRI){
			// sh:property
			addTriple(domain.nodeShapeIRI, ns.sh('property').uri, shape.IRI);
		}
		let multiplicity = shape.multiplicity;
		if(multiplicity && multiplicity.minCount){
			// sh:minCount
			store.add(
			  $rdf.sym(shape.IRI),
			  $rdf.sym(ns.sh('minCount')),
			  $rdf.literal(multiplicity.minCount, undefined, $rdf.sym(XSD + "integer"))
			);
		}
		if(multiplicity && multiplicity.maxCount){
			// sh:maxCount
			store.add(
			  $rdf.sym(shape.IRI),
			  $rdf.sym(ns.sh('maxCount')),
			  $rdf.literal(multiplicity.maxCount, undefined, $rdf.sym(XSD + "integer"))
			);
		}
		let equals = shape.equals;
		if(equals){
		  for (let e = 0; e < equals.length; e++){
			// sh:equals
			addTriple(shape.IRI, ns.sh('equals').uri, equals[e]);
		  }
		}
		let disjoint = shape.disjoint;
		if(disjoint){
		  for (let d = 0; d < disjoint.length; d++){
			// sh:disjoint
			addTriple(shape.IRI, ns.sh('disjoint').uri, disjoint[d]);
		  }
		}
		
		let subsetof = shape.subsetof;
		if(subsetof){
		  for (let s = 0; s < subsetof.length; s++){
			// dash:subSetOf
			addTriple(shape.IRI, ns.dash('subSetOf').uri, subsetof[s]);
		  }
		}
		
		let annotations = shape.annotations;
		if(annotations){
		  for (const annotation of annotations) {
			  if (!annotation.annotationType || annotation.value === undefined || annotation.value === null) {
				continue;
			  }

			  const predicate = $rdf.sym(annotation.annotationType);

			  let object;
			  if (annotation.language && annotation.language.trim() !== "") {
				object = $rdf.literal(annotation.value, annotation.language);
			  } else {
				object = $rdf.literal(annotation.value);
			  }

			  store.add(
				shape.IRI,
				predicate,
				object
			  );
			}
		}
		let inverseProperty = shape.inverseProperty;
		if(inverseProperty){
			const inversePathNode = $rdf.blankNode();

			store.add(
			  shape.IRI,
			  $rdf.sym(ns.sh('equals').uri),
			  inversePathNode
			);


			store.add(
			  inversePathNode,
			  $rdf.sym(ns.sh('inversePath').uri),
			  $rdf.sym(inverseProperty.IRI)
			);
		}
	  }
	  
	  
	  Class = {};
	  // DataType= {};
	  // AnnotationProperty= {};
	  ObjectProperty= {};
	  NamedIndividual= {};
	  for (const key of Object.keys(Class)) {
		let shapeName;
		for (const clazz of Object.keys(Class[key])) {
		  const ax = Class[key][clazz];
		  
		  //SHACL CLASS DECLARATION
		  // if(ax.shape_name){
			// shapeName = ax.shape_name;
			// addTriple(ns.sh_local(shapeName).uri, ns.rdf('type').uri, ns.sh('NodeShape').uri);
			// if(ax.IRI)addTriple(ns.sh_local(shapeName).uri, ns.sh('targetClass').uri, ax.IRI);
		  // }
		  
		  if (ax.type === "Declaration" && ax.axiom.type === "Class" && ax.axiom.axiom.IRI) {
			// addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.owl('Class').uri);
		  }else if (ax.type === "Declaration" && ax.axiom.type === "DataProperty") {
			addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.owl('DatatypeProperty').uri);
			//SHACL DATA PROPERTY DECLARATION
			let propertyName = getLocalName(ax.axiom.axiom.IRI);
			propertyName = ns.sh_local(shapeName+"_"+propertyName).uri;
			addTriple(propertyName, ns.rdf('type').uri, ns.sh('PropertyShape').uri);
			addTriple(propertyName, ns.sh('path').uri, ax.axiom.axiom.IRI);

		  }else if (ax.type === "Declaration" && ax.axiom.type === "ObjectProperty") {
			addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.owl('ObjectProperty').uri);
			
			//SHACL OBJECT PROPERTY DECLARATION
			let propertyName = getLocalName(ax.axiom.axiom.IRI);
			propertyName = ns.sh_local(shapeName+"_"+propertyName).uri;
			addTriple(propertyName, ns.rdf('type').uri, ns.sh('PropertyShape').uri);
			addTriple(propertyName, ns.sh('path').uri, ax.axiom.axiom.IRI);

		  }else if (ax.type === "DataPropertyDomain" || ax.type === "ObjectPropertyDomain") {
			  const attrIRI = ax.axiom[0].IRI;
			  let classIRI = ax.axiom[1].IRI;
			  if(classIRI) {
				classIRI = $rdf.sym(classIRI);
				
				//SHACL PROPERTY DOMAIN
				let propertyName = getLocalName(attrIRI);
				propertyName = ns.sh_local(shapeName+"_"+propertyName).uri;
				addTriple(ns.sh_local(shapeName).uri, ns.sh('property').uri, propertyName);
			  }
			  else if(ax.axiom[1].Expression){
				  const dataPropertySet = new Set(onto.DataProperty);
				  const { term: exprTerm } = classExpressionAstToRdflib(
					$rdf,
					store,
					ax.axiom[1].Expression,
					{
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					}
				);
				classIRI = exprTerm;
			  }
  
			  if(attrIRI && classIRI) store.add($rdf.sym(attrIRI), $rdf.sym(ns.rdfs('domain').uri), classIRI);
			  
		  } else if (ax.type === "DataPropertyRange" || ax.type === "ObjectPropertyRange") {
			  const attrIRI = ax.axiom[0].IRI;
			  const classIRI = ax.axiom[1].IRI;
			  if(classIRI !== null && attrIRI !== null && typeof classIRI === "string"){
				 addTriple(attrIRI, ns.rdfs('range').uri, classIRI);
				 
				//SHACL PROPERTY RANGE
				let propertyName = getLocalName(attrIRI);
				propertyName = ns.sh_local(shapeName+"_"+propertyName).uri;
				if (ax.type === "DataPropertyRange") addTriple(propertyName, ns.sh('datatype').uri, classIRI);
				else addTriple(propertyName, ns.sh('class').uri, classIRI)

				 
			  } else if(classIRI !== null && attrIRI !== null && typeof classIRI === "object"){
					const statements = buildDataPropertyRangeStatements(attrIRI, classIRI, namespaceTable);
					for (const st of statements) store.add(st.subject, st.predicate, st.object); 
			  }


		  }else if (ax.type === "FunctionalDataProperty" || ax.type === "FunctionalObjectProperty") {
			if(ax.axiom.IRI)addTriple(ax.axiom.IRI, ns.rdf('type').uri, ns.owl('FunctionalProperty').uri);
		  } else if (["EquivalentDataProperties", "DisjointDataProperties", "SubDataPropertyOf", "EquivalentObjectProperties", "DisjointObjectProperties", "SubObjectPropertyOf"].includes(ax.type)) {
			  if (ax.axiom.length >= 2) {
				  const predMap = {
					  EquivalentDataProperties: ns.owl('equivalentProperty').uri,
					  DisjointDataProperties: ns.owl('propertyDisjointWith').uri,
					  SubDataPropertyOf: ns.rdfs('subPropertyOf').uri
					};

				  const base = ax.axiom[0].IRI;
				 
				  for (let i = 1; i < ax.axiom.length; i++) {
					if(ax.axiom[i].length > 0){
						 for (let j = 0; j < ax.axiom[i].length; j++) {
							 if(base && ax.axiom[i][j].IRI) addTriple(base, predMap[ax.type] ,ax.axiom[i][j].IRI);
						 }
					}
					
					else if(base && ax.axiom[i].IRI) addTriple(base, predMap[ax.type] ,ax.axiom[i].IRI);
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
			let classIRI = ax.axiom.axiom.IRI
			if(classIRI) classIRI = $rdf.sym(classIRI);
		    else if(ax.axiom.axiom.Expression){
				const dataPropertySet = new Set(onto.DataProperty);
				const { term: exprTerm } = classExpressionAstToRdflib(
					$rdf,
					store,
					ax.axiom.axiom.Expression,
					{
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					}
				);
				classIRI = exprTerm;
		    }
            store.add(complementBNode, ns.owl('complementOf'), classIRI);
			
			let oclassIRI = ax.axiom.IRI
			if(oclassIRI) oclassIRI = $rdf.sym(oclassIRI);
		    else if(ax.axiom.Expression){
				const dataPropertySet = new Set(onto.DataProperty);
				const { term: exprTerm } = classExpressionAstToRdflib(
					$rdf,
					store,
					ax.axiom.Expression,
					{
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					}
				);
				oclassIRI = exprTerm;
		    }
            // ex:Person owl:equivalentClass _:bnode
            store.add(oclassIRI, ns.owl('equivalentClass'), complementBNode);
        } else if(typeof ax.axiom[1] !== "undefined" && typeof ax.axiom[1].type !== "undefined" && ax.axiom[1].type.indexOf("Cardinality") !== -1){
		  
		  let classIRI = ax.axiom[0].IRI;
		  const part     = ax.axiom[1];
		  const n        = part.axiom[0].Number;
		  const propIRI  = part.axiom[1].IRI;
		  const dtypeIRI = part.axiom[2]?.IRI; // may be undefined
		  
		  
		  if(classIRI) classIRI = $rdf.sym(classIRI);
		  else if(ax.axiom[0].Expression){
			const dataPropertySet = new Set(onto.DataProperty);
			const { term: exprTerm } = classExpressionAstToRdflib(
				$rdf,
				store,
				ax.axiom[0].Expression,
				{
					prefixes: namespaceTable,
					isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
				}
			);
			classIRI = exprTerm;
		  }

		  // _:r (blank node for the restriction)
		  const r = $rdf.blankNode();

		  // :Class rdfs:subClassOf _:r
		  store.add(classIRI,
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
			DataExactCardinality:"http://www.w3.org/2002/07/owl#cardinality",
			ObjectMinCardinality:  "http://www.w3.org/2002/07/owl#minCardinality",
			ObjectMaxCardinality:  "http://www.w3.org/2002/07/owl#maxCardinality",
			ObjectExactCardinality:"http://www.w3.org/2002/07/owl#cardinality"
		  };
		  const predQ = {
			DataMinCardinality:  "http://www.w3.org/2002/07/owl#minQualifiedCardinality",
			DataMaxCardinality:  "http://www.w3.org/2002/07/owl#maxQualifiedCardinality",
			DataExactCardinality:"http://www.w3.org/2002/07/owl#qualifiedCardinality",
			ObjectMinCardinality:  "http://www.w3.org/2002/07/owl#minQualifiedCardinality",
			ObjectMaxCardinality:  "http://www.w3.org/2002/07/owl#maxQualifiedCardinality",
			ObjectExactCardinality:"http://www.w3.org/2002/07/owl#qualifiedCardinality"
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


		}else{/*
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
			  let subType = null;
			  let subj = ax.axiom[0].IRI;
			  if(subj) subType = "IRI";
			  else if(ax.axiom[0].Expression){
				  subj = ax.axiom[0].Expression;
				  subType = "Expression";
			  }
			  
			  if(ax.axiom[1].length > 0){
			  // if(typeof ax.axiom[1].IRI === "undefined"){

				  if(ax.axiom[1].length){
					for (const target of ax.axiom[1]) {
					  addAxiomTriple({
						  subj,
						  target,
						  subType,
						  axType: ax.type,
						  store,
						  onto,
						  namespaceTable,
						  typeMap,
						  addTriple,
						});
					}
				  } else if(ax.axiom[1].Expression && subj) {
					  const dataPropertySet = new Set(onto.DataProperty);
							const { term: exprTerm } = classExpressionAstToRdflib(
							  $rdf,
							  store,
							  ax.axiom[1].Expression,
							  {
								prefixes: namespaceTable,
								isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
							  }
							);

							store.add(
							  $rdf.sym(subj),
							  $rdf.sym(typeMap[ax.type]), 
							  exprTerm
							);
				  }
			  } else {
				let target = ax.axiom[1]
				addAxiomTriple({
						  subj,
						  target,
						  subType,
						  axType: ax.type,
						  store,
						  onto,
						  namespaceTable,
						  typeMap,
						  addTriple,
						});
			  }
			}
        */
		}
		  } else if (ax.type === "AnnotationAssertion") {
			if(ax.axiom?.[4]?.axiom){
				  addAnnotationAssertionWithAxiomAnnotations(store, ax)
			}
			if((typeof ax.axiom[1].IRI !== "undefined" ||typeof ax.axiom[1].Expression !== "undefined") && typeof ax.axiom[2].value !== "undefined"){
			  
			  const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol] || $rdf.sym(ax.axiom[0]?.axiomSymbol);
			  let obj = ax.axiom[2].value;
			  if(pred && obj){
				  let subj = ax.axiom[1].IRI;
				  if(subj) subj = $rdf.sym(subj);
				  else if(ax.axiom[1].Expression){
					  const dataPropertySet = new Set(onto.DataProperty);
					  const { term: exprTerm } = classExpressionAstToRdflib(
						$rdf,
						store,
						ax.axiom[1].Expression,
						{
							prefixes: namespaceTable,
							isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
						}
					);
					subj = exprTerm;
				  }
				  
				  const objLanguage = ax.axiom[3]?.language;
				  // if(objLanguage) obj = obj + "@" + objLanguage;
				  if (subj) {
					  if (objLanguage) {
						store.add(subj, pred, $rdf.literal(obj, objLanguage));
					  } else {
						store.add(subj, pred, $rdf.literal(obj));
					  }
				  }
			  }
			}
		  } else if (ax.type === "HasKey") {
			/*
			  const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
			  const OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#');
			  const cls = ax.axiom[0];
			  const propsBox = ax.axiom[1];

			  if (!cls?.IRI && !cls?.Expression) throw new Error('HasKey: missing class IRI');
			  if (!propsBox || !Array.isArray(propsBox.axiom) || propsBox.axiom.length === 0) {
				throw new Error('HasKey: properties list is empty');
			  }

			  let classNode;
			  if(cls.IRI) classNode = $rdf.namedNode(cls.IRI);
			  else if(cls.Expression){
				  const dataPropertySet = new Set(onto.DataProperty);
				  const { term: exprTerm } = classExpressionAstToRdflib(
					$rdf,
					store,
					cls.Expression,
					{
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					}
				);
				classNode = exprTerm;
			  }
			  
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
			*/
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
			  const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol] || $rdf.sym(ax.axiom[0]?.axiomSymbol);
			  let obj = ax.axiom[2].value;
			  const objLanguage = ax.axiom[3]?.language;
			  if (subj && pred && obj) {
				 if (objLanguage) {
					store.add(subj, pred, $rdf.literal(obj, objLanguage));
				  } else {
					store.add(subj, pred, $rdf.literal(obj));
				  }
			  }
			}
		 } else if (ax.type === "DataTypeDefinition") {
			const dt = ax.axiom[0].IRI;
			const dtdefinition = ax.axiom[1].type;
			if (dt && dtdefinition) {
				const attrIRI = ax.axiom[0].IRI;

				if(typeof dtdefinition === "string") addTriple(dt, ns.owl('onDatatype').uri, dtdefinition);
				else{
					const statements = buildDataPropertyRangeStatements(attrIRI, dtdefinition, namespaceTable);
					for (const st of statements) store.add(st.subject, st.predicate, st.object); 
				}
			}
		  }
		}
	  }

	  for (const key of Object.keys(AnnotationProperty)) {
		for (const p of Object.keys(AnnotationProperty[key])) {
		  const ax = AnnotationProperty[key][p];
		  if (ax.type === "Declaration" && ax.axiom.type === "AnnotationProperty") {
			addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.owl('AnnotationProperty').uri);
			addTriple(ax.axiom.axiom.IRI, ns.rdf('type').uri, ns.rdf('Property').uri);
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
          const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol] || $rdf.sym(ax.axiom[0]?.axiomSymbol);
          let obj = ax.axiom[2].value;
		  const objLanguage = ax.axiom[3]?.language;

          if (subj && pred && obj) {
            if (objLanguage) {
				store.add(subj, pred, $rdf.literal(obj, objLanguage));
			} else {
				store.add(subj, pred, $rdf.literal(obj));
			}
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
			if(typeof ax.axiom[1].IRI !== "undefined"){
				let classIRI = ax.axiom[0].IRI;
				if(classIRI) classIRI = $rdf.sym(classIRI);
				else if(ax.axiom[0].Expression){
					const dataPropertySet = new Set(onto.DataProperty);
					const { term: exprTerm } = classExpressionAstToRdflib(
						$rdf,
						store,
						ax.axiom[0].Expression,
						{
							prefixes: namespaceTable,
							isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
						}
					);
					classIRI = exprTerm;
				}
				if(classIRI)store.add($rdf.sym(ax.axiom[1].IRI), $rdf.sym(ns.rdf('type').uri), classIRI);
		    }
			
			  // if(typeof ax.axiom[0].IRI !== "undefined" && typeof ax.axiom[1].IRI !== "undefined")addTriple(ax.axiom[1].IRI, ns.rdf('type').uri, ax.axiom[0].IRI);
      } else if (ax.type === "AnnotationAssertion") {
        if(typeof ax.axiom[1].IRI !== "undefined" && typeof ax.axiom[2].value !== "undefined"){
          const subj = ax.axiom[1].IRI;
          const pred = annotationPropertyTypes[ax.axiom[0]?.axiomSymbol] || $rdf.sym(ax.axiom[0]?.axiomSymbol);
          let obj = ax.axiom[2].value;
		  const objLanguage = ax.axiom[3]?.language;
          if (subj && pred && obj) {
			if (objLanguage) {
			store.add(subj, pred, $rdf.literal(obj, objLanguage));
		  } else {
			store.add(subj, pred, $rdf.literal(obj));
			}
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
			  const p = $rdf.sym(ax.axiom[0].IRI);
			  const s = $rdf.sym(ax.axiom[1].IRI);
			  const o = makeLiteral_RDFlib($rdf, ax);

			  // Base assertion triple
			  store.add(s, p, o);

			  // Optional axiom annotations: in your example it's ax.axiom[4].axiom
			  const ann = ax.axiom[4] && ax.axiom[4].axiom;
			  if (Array.isArray(ann) && ann.length) {
				  const axiomBNode = $rdf.blankNode();

				  store.add(axiomBNode, ns.rdf("type"), ns.owl("Axiom"));
				  store.add(axiomBNode, ns.owl("annotatedSource"), s);
				  store.add(axiomBNode, ns.owl("annotatedProperty"), p);
				  store.add(axiomBNode, ns.owl("annotatedTarget"), o);

				  for (const a of ann) {
					const pred = $rdf.sym(a.axiomSymbol);

					const obj = a.type
					  ? $rdf.literal(a.value, $rdf.sym(a.type))
					  : $rdf.literal(a.value);

					store.add(axiomBNode, pred, obj);
				  }
			  }
		  } else if(ax.type === "NegativeDataPropertyAssertion"){
			  const p = $rdf.sym(ax.axiom[0].IRI);
			  const s = $rdf.sym(ax.axiom[1].IRI);
			  const o = makeLiteral_RDFlib($rdf, ax);

			  // Blank node for the negative assertion
			  const neg = $rdf.blankNode();

			  // a owl:NegativePropertyAssertion
			  store.add(neg, ns.rdf("type"), ns.owl("NegativePropertyAssertion"));
			  store.add(neg, ns.owl("sourceIndividual"), s);
			  store.add(neg, ns.owl("assertionProperty"), p);
			  store.add(neg, ns.owl("targetValue"), o);

			  // Optional annotations: for NegativeDataPropertyAssertion, assume same position ax.axiom[4].axiom
			  const ann = ax.axiom[4] && ax.axiom[4].axiom;
			  if (Array.isArray(ann) && ann.length) {
				const axiomBNode = $rdf.blankNode();

				store.add(axiomBNode, ns.rdf("type"), ns.owl("Axiom"));

				// Annotate the negative assertion resource
				store.add(axiomBNode, ns.owl("annotatedSource"), neg);
				store.add(axiomBNode, ns.owl("annotatedProperty"), ns.rdf("type"));
				store.add(axiomBNode, ns.owl("annotatedTarget"), ns.owl("NegativePropertyAssertion"));

				// Also include the negative assertion content (helps consumers)
				store.add(axiomBNode, ns.owl("sourceIndividual"), s);
				store.add(axiomBNode, ns.owl("assertionProperty"), p);
				store.add(axiomBNode, ns.owl("targetValue"), o);

				for (const a of ann) {
				  const pred = $rdf.sym(a.axiomSymbol);
				  const obj  = $rdf.literal(a.value, $rdf.sym(a.type));
				  store.add(axiomBNode, pred, obj);
				}
			  }
		  }else if(ax.type === "ObjectPropertyAssertion"){
			  const p = $rdf.sym(ax.axiom[0].IRI);
			  const s = $rdf.sym(ax.axiom[1].IRI);
			  const o = $rdf.sym(ax.axiom[2].IRI);

			  // Base assertion
			  store.add(s, p, o);

			  // Optional axiom annotations
			  const ann = ax.axiom[3] && ax.axiom[3].axiom;
			  if (Array.isArray(ann) && ann.length) {
				const axiomBNode = $rdf.blankNode();

				store.add(axiomBNode, ns.rdf("type"), ns.owl("Axiom"));
				store.add(axiomBNode, ns.owl("annotatedSource"), s);
				store.add(axiomBNode, ns.owl("annotatedProperty"), p);
				store.add(axiomBNode, ns.owl("annotatedTarget"), o);

				for (const a of ann) {
				  const pred = $rdf.sym(a.axiomSymbol);

				  const obj = a.type
					? $rdf.literal(a.value, $rdf.sym(a.type))
					: $rdf.literal(a.value);

				  store.add(axiomBNode, pred, obj);
				}
			  }
		  }else if(ax.type === "NegativeObjectPropertyAssertion"){
			  const p = $rdf.sym(ax.axiom[0].IRI);
			  const s = $rdf.sym(ax.axiom[1].IRI);
			  const o = $rdf.sym(ax.axiom[2].IRI);

			  // Blank node for the negative assertion (OWL mapping)
			  const neg = $rdf.blankNode();

			  store.add(neg, ns.rdf("type"), ns.owl("NegativePropertyAssertion"));
			  store.add(neg, ns.owl("sourceIndividual"), s);
			  store.add(neg, ns.owl("assertionProperty"), p);
			  store.add(neg, ns.owl("targetIndividual"), o);

			  // Optional axiom annotations
			  const ann = ax.axiom[3] && ax.axiom[3].axiom;
			  if (Array.isArray(ann) && ann.length) {
				// Reify/annotate the negative assertion node
				const axiomBNode = $rdf.blankNode();

				store.add(axiomBNode, ns.rdf("type"), ns.owl("Axiom"));

				// Annotate *this negative assertion resource*
				store.add(axiomBNode, ns.owl("annotatedSource"), neg);
				store.add(axiomBNode, ns.owl("annotatedProperty"), ns.rdf("type"));
				store.add(axiomBNode, ns.owl("annotatedTarget"), ns.owl("NegativePropertyAssertion"));

				// Also include the content of the negative assertion (helps consumers)
				store.add(axiomBNode, ns.owl("sourceIndividual"), s);
				store.add(axiomBNode, ns.owl("assertionProperty"), p);
				store.add(axiomBNode, ns.owl("targetIndividual"), o);

				for (const a of ann) {
				  const pred = $rdf.sym(a.axiomSymbol);
				  const obj  = $rdf.literal(a.value, $rdf.sym(a.type));
				  store.add(axiomBNode, pred, obj);
				}
			  }
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
			
			  let classIRI = ax.axiom[1].IRI;
			  if(classIRI) classIRI = $rdf.sym(classIRI);
			
			if(typeof ax.axiom[0].IRI !== "undefined"){
				if(ax.axiom[1].Expression){
				  const dataPropertySet = new Set(onto.DataProperty);
				  const { term: exprTerm } = classExpressionAstToRdflib(
					$rdf,
					store,
					ax.axiom[1].Expression,
					{
						prefixes: namespaceTable,
						isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
					}
				  );
				  classIRI = exprTerm;
				}
				if(classIRI)store.add($rdf.sym(ax.axiom[0].IRI), $rdf.sym(predMap[ax.type]), classIRI);
			}
			
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
				if(ax.axiom[1].length>0){
					for (const obj of ax.axiom[1]) {
					  addTriple(subj, predMap[ax.type], obj.IRI);
					}
				} else if(ax.axiom[1].IRI) {
					addTriple(subj, predMap[ax.type], ax.axiom[1].IRI);
				}
			}
		  } else if (typeof ax.type !== "undefined" && ax.type === "SubClassOf"){
			  if(typeof ax.axiom[1] !== "undefined" && ax.axiom[1].type.indexOf("Cardinality") !== -1){
				let clsIRI   = ax.axiom[0].IRI;
				const part     = ax.axiom[1];            // type: ObjectMin/Max/ExactCardinality
				const n        = part.axiom[0].Number;   // the number
				const propIRI  = part.axiom[1].IRI;      // object property IRI
				let classIRI = part.axiom[2]?.IRI;     // optional filler class IRI (qualified form)
				
				if(clsIRI) clsIRI = $rdf.sym(clsIRI);
				else if(ax.axiom[0].Expression){
					const dataPropertySet = new Set(onto.DataProperty);
					const { term: exprTerm } = classExpressionAstToRdflib(
						$rdf,
						store,
						ax.axiom[0].Expression,
						{
							prefixes: namespaceTable,
							isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
						}
					);
					clsIRI = exprTerm;
				}
				
				if(classIRI) classIRI = $rdf.sym(classIRI);
				else if(part.axiom[2].Expression){
					const dataPropertySet = new Set(onto.DataProperty);
					const { term: exprTerm } = classExpressionAstToRdflib(
						$rdf,
						store,
						part.axiom[2].Expression,
						{
							prefixes: namespaceTable,
							isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
						}
					);
					classIRI = exprTerm;
				}

				// _:r (blank node for the restriction)
				const r = $rdf.blankNode();

				// :A rdfs:subClassOf _:r
				store.add(clsIRI,
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
							classIRI);
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
				  let classIRI = ax.axiom[0].IRI;
				  if(classIRI) classIRI = $rdf.sym(classIRI);
				  else if(ax.axiom[0].Expression){
					  const dataPropertySet = new Set(onto.DataProperty);
					  const { term: exprTerm } = classExpressionAstToRdflib(
						$rdf,
						store,
						ax.axiom[0].Expression,
						{
							prefixes: namespaceTable,
							isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
						}
					);
					classIRI = exprTerm;
				  }
				  
				  
				  store.add(classIRI, ns.rdfs("subClassOf"), r);

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
				  
				  let oclassIRI = ax.axiom[1].axiom[1].IRI;
				  if(oclassIRI) oclassIRI = $rdf.sym(oclassIRI);
				  else if(ax.axiom[1].axiom[1].Expression){
					  const dataPropertySet = new Set(onto.DataProperty);
					  const { term: exprTerm } = classExpressionAstToRdflib(
						$rdf,
						store,
						ax.axiom[1].axiom[1].Expression,
						{
							prefixes: namespaceTable,
							isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
						}
					);
					oclassIRI = exprTerm;
				  }
				  
				  store.add(r, restrPred, oclassIRI);
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
		  
			addAnnotationAssertionWithAxiomAnnotations(store, ax)

		  }
		}
	  }
	 return  store.serialize(null, format)
	  // return $rdf.serialize(null, store, BASE, format);
	}
});



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

// same as in your N3 code (needed for preferXsdBuiltins mapping)
const XSD_BUILTINS = new Set([
  "string","integer","decimal","float",
  "nonNegativeInteger","nonPositiveInteger",
  "positiveInteger","negativeInteger",
  "long","int","short","byte",
  "unsignedLong","unsignedInt","unsignedShort","unsignedByte",
  "double","boolean","dateTime","date","time",
]);

function unquote(astQuoted) {
  if (typeof astQuoted !== "string") return "";
  if (astQuoted.length >= 2 && astQuoted[0] === '"' && astQuoted[astQuoted.length - 1] === '"') {
    return astQuoted.slice(1, -1);
  }
  return astQuoted;
}

// --- Blank node helper (handles rdflib variations) ---
function BN($rdf) {
  if (typeof $rdf.blankNode === "function") return $rdf.blankNode();
  if (typeof $rdf.bnode === "function") return $rdf.bnode();
  throw new Error("No blank node factory found (blankNode/bnode)");
}

function blankNodeFromAstBlank($rdf, str) {
  const s = String(str);
  if (s.startsWith("_:")) {
    // rdflib accepts id in blankNode(id) in many builds
    try { return $rdf.blankNode(s.slice(2)); } catch (e) { /* ignore */ }
    // fallback: fresh blank node
  }
  return BN($rdf);
}

/**
 * Create an RDF list in the store.
 * If store.list exists, prefer it (often serializes as "( ... )").
 * Else, explicit rdf:first/rest.
 */
function makeList($rdf, store, elements) {
  if (!elements || elements.length === 0) return $rdf.sym(RDF + "nil");

  // Prefer a Collection object (serializes as (...) in Turtle)
  // Different rdflib builds expose this differently, so we feature-detect.
  if (typeof $rdf.collection === "function") {
    return $rdf.collection(elements);
  }
  if (typeof $rdf.Collection === "function") {
    return new $rdf.Collection(elements);
  }
  if (store && typeof store.list === "function") {
    // Some builds provide store.list([...]) which returns a Collection-like list node
    return store.list(elements);
  }

  // Last resort: explicit rdf:first/rest
  const firstPred = $rdf.sym(RDF + "first");
  const restPred  = $rdf.sym(RDF + "rest");
  const nil       = $rdf.sym(RDF + "nil");

  let head = (typeof $rdf.blankNode === "function") ? $rdf.blankNode() : $rdf.bnode();
  let cur = head;

  for (let i = 0; i < elements.length; i++) {
    store.add(cur, firstPred, elements[i]);
    if (i === elements.length - 1) {
      store.add(cur, restPred, nil);
    } else {
      const next = (typeof $rdf.blankNode === "function") ? $rdf.blankNode() : $rdf.bnode();
      store.add(cur, restPred, next);
      cur = next;
    }
  }
  return head;
}

function iriAstToNode($rdf, iriAst, prefixes = {}, opts = {}) {
  const { preferXsdBuiltins = false } = opts;
  const t = iriAst.IRItype;
  const v = iriAst.value;

  if (t === "fullIRI") {
    const s = String(v);
    const iri = (s.startsWith("<") && s.endsWith(">")) ? s.slice(1, -1) : s;
    return $rdf.sym(iri);
  }

  if (t === "simpleIRI") {
    const name = String(v);

    // ONLY in datatype/data-range context:
    if (preferXsdBuiltins && XSD_BUILTINS.has(name)) {
      return $rdf.sym(XSD + name);
    }

    if (/^[a-z][a-z0-9+.-]*:/.test(name)) return $rdf.sym(name);
    if (prefixes.base) return $rdf.sym(prefixes.base + name);
    if (prefixes[":"]) return $rdf.sym(prefixes[":"] + name);
    return $rdf.sym(name);
  }

  if (t === "abbreviatedIRI" || t === "fullNamespaceIRI") {
    const name = v.name;
    const pref = v.prefix;

    if (prefixes[pref]) return $rdf.sym(prefixes[pref] + name);
    if (/^https?:\/\//.test(pref) || pref.includes("#") || pref.endsWith("/")) return $rdf.sym(pref + name);
    return $rdf.sym(pref + ":" + name);
  }

  throw new Error("Unsupported IRItype: " + t);
}

function iriAsDatatypeNode($rdf, iriAst, prefixes) {
  return iriAstToNode($rdf, iriAst, prefixes, { preferXsdBuiltins: true });
}

/* ----- datatype/literal helpers ----- */

function datatypeToNode($rdf, dtAst, prefixes) {
  if (dtAst.type === "predefined") return $rdf.sym(XSD + String(dtAst.value));
  if (dtAst.type === "IRI") return iriAsDatatypeNode($rdf, dtAst.value, prefixes);
  throw new Error("Unknown datatype.type: " + dtAst.type);
}

function literalToNode($rdf, litAst, prefixes) {
  switch (litAst.type) {
    case "stringNoLang":
      return $rdf.literal(unquote(litAst.value));
    case "stringWithLang":
      // rdflib: lit(value, lang, datatype)
      return $rdf.lit(unquote(litAst.value), String(litAst.language || ""), undefined);
    case "typed":
      return $rdf.lit(unquote(litAst.value), undefined, datatypeToNode($rdf, litAst.datatype, prefixes));
    case "integer":
      return $rdf.lit(String(litAst.value), undefined, $rdf.sym(XSD + "integer"));
    case "decimal":
      return $rdf.lit(String(litAst.value), undefined, $rdf.sym(XSD + "decimal"));
    case "float": {
      const s = String(litAst.value);
      const lex = /[fF]$/.test(s) ? s.slice(0, -1) : s;
      return $rdf.lit(lex, undefined, $rdf.sym(XSD + "float"));
    }
    default:
      throw new Error("Unsupported literal type: " + litAst.type);
  }
}

function datatypeRestrictionToDataRange($rdf, store, dr, prefixes, doc) {
  const dt = datatypeToNode($rdf, dr.datatype, prefixes);
  const restrictionNodes = (dr.restrictions || []).map(r => {
    const facetIri = FACET_MAP[r.facet];
    if (!facetIri) throw new Error("Unknown facet token: " + r.facet);
    const bn = BN($rdf);
    store.add(bn, $rdf.sym(facetIri), literalToNode($rdf, r.value, prefixes), doc);
    return bn;
  });

  const b = BN($rdf);
  store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(RDFS + "Datatype"), doc);
  store.add(b, $rdf.sym(OWL + "onDatatype"), dt, doc);
  store.add(b, $rdf.sym(OWL + "withRestrictions"), makeList($rdf, store, restrictionNodes, doc), doc);
  return b;
}

function literalListToDataOneOf($rdf, store, list, prefixes, doc) {
  const lits = (list || []).map(l => literalToNode($rdf, l, prefixes));
  const b = BN($rdf);
  store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(RDFS + "Datatype"), doc);
  store.add(b, $rdf.sym(OWL + "oneOf"), makeList($rdf, store, lits, doc), doc);
  return b;
}

/**
 * Convert JSON-friendly class-expression AST into rdflib.js structure in a store.
 *
 * @param {$rdf.IndexedFormula} store
 * @param {object} ast
 * @param {object} options
 * @param {object} options.prefixes
 * @param {(propertyIri: string) => boolean} options.isObjectProperty
 * @param {$rdf.NamedNode|undefined} options.doc  graph/context (optional)
 * @returns {{ term: any }}  // term is NamedNode or BlankNode
 */
function classExpressionAstToRdflib($rdf, store, ast, { prefixes = {}, isObjectProperty, doc = undefined } = {}) {
  if (typeof isObjectProperty !== "function") {
    throw new Error("classExpressionAstToRdflib: options.isObjectProperty(propertyIri) is required");
  }

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

    const b = BN($rdf);
    store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
    store.add(b, $rdf.sym(OWL + "unionOf"), makeList($rdf, store, parts, doc), doc);
    return b;
  }

  function conjunctionNoRestrictions(node) {
    const parts = (node.items || []).map(primary);
    if (parts.length === 1) return parts[0];

    const b = BN($rdf);
    store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
    store.add(b, $rdf.sym(OWL + "intersectionOf"), makeList($rdf, store, parts, doc), doc);
    return b;
  }

  function conjunctionWithRestrictions(node) {
    const cls = iriAstToNode($rdf, node.class, prefixes);
    const rs = (node.restrictions || []).map(r => restrictionAsClassExpr(r));
    const parts = [cls].concat(rs);

    if (parts.length === 1) return parts[0];

    const b = BN($rdf);
    store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
    store.add(b, $rdf.sym(OWL + "intersectionOf"), makeList($rdf, store, parts, doc), doc);
    return b;
  }

  function primary(p) {
    let inner;
    if (p.primaryType === "atomic") inner = atomic(p.primary);
    else if (p.primaryType === "restriction") inner = restrictionAsClassExpr(p.primary);
    else throw new Error("Unknown primaryType: " + p.primaryType);

    if (p.negation === "true") {
      const b = BN($rdf);
      store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
      store.add(b, $rdf.sym(OWL + "complementOf"), inner, doc);
      return b;
    }
    return inner;
  }

  function atomic(a) {
    switch (a.atomType) {
      case "class":
        return iriAstToNode($rdf, a.class, prefixes);

      case "expression":
        return asClassExpr(a.expression);

      case "individualList": {
        const inds = (a.list || []).map(individualToNode);
        const b = BN($rdf);
        store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
        store.add(b, $rdf.sym(OWL + "oneOf"), makeList($rdf, store, inds, doc), doc);
        return b;
      }

      default:
        throw new Error("Unknown atomType: " + a.atomType);
    }
  }

  function individualToNode(ind) {
    if (ind.individualType === "IRI") return iriAstToNode($rdf, ind.individual, prefixes);
    if (ind.individualType === "blank") return blankNodeFromAstBlank($rdf, ind.individual);
    throw new Error("Unknown individualType: " + ind.individualType);
  }

  function inversePropertyNode(propertyIriAst, inverseFlag, propIsObject) {
    const p = iriAstToNode($rdf, propertyIriAst, prefixes);
    if (inverseFlag !== "true") return p;

    if (!propIsObject) throw new Error("Inverse used with a data property: " + p.value);

    const ip = BN($rdf);
    store.add(ip, $rdf.sym(OWL + "inverseOf"), p, doc);
    return ip;
  }

  function hasValueNode(v, propIsObject) {
    if (propIsObject) {
      if (v && typeof v === "object" && v.individualType) return individualToNode(v);
      throw new Error("ObjectProperty hasValue expects an individual, got: " + JSON.stringify(v));
    } else {
      if (v && typeof v === "object" && v.type) return literalToNode($rdf, v, prefixes);
      throw new Error("DataProperty hasValue expects a literal, got: " + JSON.stringify(v));
    }
  }

  function someOnlyFiller(sp, propIsObject) {
    if (!sp || typeof sp !== "object") throw new Error("Bad somePrimary: " + sp);

    if (propIsObject) {
      switch (sp.unknownPrimaryType) {
        case "IRI":
          return iriAstToNode($rdf, sp.IRI, prefixes);
        case "restriction":
          return restrictionAsClassExpr(sp.restriction);
        case "expression":
          return asClassExpr(sp.expression);
        case "individualList": {
          const inds = (sp.list || []).map(individualToNode);
          const b = BN($rdf);
          store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
          store.add(b, $rdf.sym(OWL + "oneOf"), makeList($rdf, store, inds, doc), doc);
          return b;
        }
        default:
          throw new Error("ObjectProperty filler cannot be " + sp.unknownPrimaryType);
      }
    } else {
      switch (sp.unknownPrimaryType) {
        case "datatypeRestriction":
          return datatypeRestrictionToDataRange($rdf, store, sp.restriction, prefixes, doc);
        case "literalList":
          return literalListToDataOneOf($rdf, store, sp.list, prefixes, doc);
        case "IRI":
          // For data properties: integer -> xsd:integer (datatype context!)
          return iriAsDatatypeNode($rdf, sp.IRI, prefixes);
        case "expression":
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

  function restrictionAsClassExpr(r) {
    const propNode = iriAstToNode($rdf, r.property, prefixes);
    const propIri = propNode.value;
    const propIsObject = !!isObjectProperty(propIri);

    const b = BN($rdf);
    store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Restriction"), doc);

    const onProp = inversePropertyNode(r.property, r.inverse, propIsObject);
    store.add(b, $rdf.sym(OWL + "onProperty"), onProp, doc);

    const kw = r.keyword;

    if (kw === "some") {
      const filler = someOnlyFiller(r.value, propIsObject);
      store.add(b, $rdf.sym(OWL + "someValuesFrom"), filler, doc);
      return b;
    }

    if (kw === "only") {
      const filler = someOnlyFiller(r.value, propIsObject);
      store.add(b, $rdf.sym(OWL + "allValuesFrom"), filler, doc);
      return b;
    }

    if (kw === "value") {
      const hv = hasValueNode(r.value, propIsObject);
      store.add(b, $rdf.sym(OWL + "hasValue"), hv, doc);
      return b;
    }

    if (kw === "Self") {
      if (!propIsObject) throw new Error("Self used with a data property: " + propIri);
      store.add(b, $rdf.sym(OWL + "hasSelf"), $rdf.lit("true", undefined, $rdf.sym(XSD + "boolean")), doc);
      return b;
    }

    if (kw === "min" || kw === "max" || kw === "exactly") {
      const n = String(r.count);

      if (r.value && r.value !== null) {
        const qPred =
          (kw === "min") ? OWL + "minQualifiedCardinality" :
          (kw === "max") ? OWL + "maxQualifiedCardinality" :
                           OWL + "qualifiedCardinality";

        store.add(b, $rdf.sym(qPred), $rdf.lit(n, undefined, $rdf.sym(XSD + "nonNegativeInteger")), doc);

        const filler = someOnlyFiller(r.value, propIsObject);
        store.add(b, $rdf.sym(propIsObject ? (OWL + "onClass") : (OWL + "onDataRange")), filler, doc);
        return b;
      }

      const unqPred =
        (kw === "min") ? OWL + "minCardinality" :
        (kw === "max") ? OWL + "maxCardinality" :
                         OWL + "cardinality";

      store.add(b, $rdf.sym(unqPred), $rdf.lit(n, undefined, $rdf.sym(XSD + "nonNegativeInteger")), doc);
      return b;
    }

    throw new Error("Unknown restriction keyword: " + kw);
  }

  function unknownDisjunction(node) {
    const parts = (node.items || []).map(unknownConjunction);
    if (parts.length === 1) return parts[0];

    const b = BN($rdf);
    store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
    store.add(b, $rdf.sym(OWL + "unionOf"), makeList($rdf, store, parts, doc), doc);
    return b;
  }

  function unknownConjunction(node) {
    if (node.grammarProduction === "conjunctionWithRestrictions") return conjunctionWithRestrictions(node);

    if (node.grammarProduction !== "unknownConjunction") {
      throw new Error("Unexpected unknownConjunction node");
    }

    const parts = (node.items || []).map(unknownPrimaryAsClassExpr);
    if (parts.length === 1) return parts[0];

    const b = BN($rdf);
    store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
    store.add(b, $rdf.sym(OWL + "intersectionOf"), makeList($rdf, store, parts, doc), doc);
    return b;
  }

  function unknownPrimaryAsClassExpr(p) {
    let inner;

    switch (p.unknownPrimaryType) {
      case "IRI":
        inner = iriAstToNode($rdf, p.IRI, prefixes);
        break;
      case "restriction":
        inner = restrictionAsClassExpr(p.restriction);
        break;
      case "expression":
        inner = asClassExpr(p.expression);
        break;
      case "individualList": {
        const inds = (p.list || []).map(individualToNode);
        const b = BN($rdf);
        store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
        store.add(b, $rdf.sym(OWL + "oneOf"), makeList($rdf, store, inds, doc), doc);
        inner = b;
        break;
      }
      default:
        throw new Error("Unknown unknownPrimaryType: " + p.unknownPrimaryType);
    }

    if (p.negation === "true") {
      const b = BN($rdf);
      store.add(b, $rdf.sym(RDF + "type"), $rdf.sym(OWL + "Class"), doc);
      store.add(b, $rdf.sym(OWL + "complementOf"), inner, doc);
      return b;
    }

    return inner;
  }

  const term = asClassExpr(ast);
  return { term };
}

function addAxiomTriple({
  subj,
  target,
  subType,
  axType,
  store,
  onto,
  namespaceTable,
  typeMap,
  addTriple,
}) {
  const dataPropertySet = new Set(onto.DataProperty);

  const makeExprTerm = (expression) =>
    classExpressionAstToRdflib($rdf, store, expression, {
      prefixes: namespaceTable,
      isObjectProperty: (propIri) => !dataPropertySet.has(propIri),
    }).term;

  // IRI → IRI
  if (target.IRI && subType === "IRI") {
    addTriple(subj, typeMap[axType], target.IRI);
    return;
  }

  // Expression → IRI
  if (target.IRI && subType === "Expression") {
    const subjTerm = makeExprTerm(subj);
    store.add(subjTerm, $rdf.sym(typeMap[axType]), $rdf.sym(target.IRI));
    return;
  }

  // IRI → Expression
  if (target.Expression && subType === "IRI") {
    const objTerm = makeExprTerm(target.Expression);
    store.add($rdf.sym(subj), $rdf.sym(typeMap[axType]), objTerm);
    return;
  }

  // Expression → Expression
  if (target.Expression && subType === "Expression") {
    const subjTerm = makeExprTerm(subj);
    const objTerm = makeExprTerm(target.Expression);
    store.add(subjTerm, $rdf.sym(typeMap[axType]), objTerm);
  }
}

/**
 * Builds the full DataPropertyRange triple + the datatype-expression triples.
 * DataPropertyRange(R DR) -> R rdfs:range DR. :contentReference[oaicite:10]{index=10}
 */
function buildDataPropertyRangeStatements(propertyIri, dataRangeAst, prefixes = {}) {
  const { rangeTerm, statements } = dataRangeAstToRdflib(dataRangeAst, prefixes);

  const prop = $rdf.namedNode(propertyIri);

  statements.push($rdf.st(prop, $rdf.namedNode(RDFS + "range"), rangeTerm));
  // statements.push($rdf.st(prop, $rdf.namedNode(RDF + "type"), $rdf.namedNode(OWL + "DatatypeProperty")));

  return statements;
}

function iriAstToNamedNode(iriAst, prefixes = {}, opts = {}) {
  const { preferXsdBuiltins = false } = opts;
  const t = iriAst.IRItype;
  const v = iriAst.value;

  // NOTE: rdflib namedNode expects a plain IRI string (no < >)
  if (t === "fullIRI") {
    const s = String(v);
    const iri = (s.startsWith("<") && s.endsWith(">")) ? s.slice(1, -1) : s;
    return $rdf.namedNode(iri);
  }

  if (t === "simpleIRI") {
    const name = String(v);

    // Only map builtin datatype names when we are in a datatype/data-range context
    if (preferXsdBuiltins && XSD_BUILTINS.has(name)) {
      return $rdf.namedNode(XSD + name); // xsd:integer etc.
    }

    // If it already looks like a CURIE/prefixed form "ex:Foo" or even a full scheme "http:"
    if (/^[a-z][a-z0-9+.-]*:/.test(name)) return $rdf.namedNode(name);

    // Your original behavior: base or ":" prefix fallback
    if (prefixes.base) return $rdf.namedNode(prefixes.base + name);
    if (prefixes[":"]) return $rdf.namedNode(prefixes[":"] + name);

    // last resort: treat as-is
    return $rdf.namedNode(name);
  }

  if (t === "abbreviatedIRI" || t === "fullNamespaceIRI") {
    const name = v.name;
    const pref = v.prefix;

    // pref is like "ex" or "ex:" depending on your parser; you used prefixes[pref]
    if (prefixes[pref]) return $rdf.namedNode(prefixes[pref] + name);

    // allow pref being a full namespace IRI already
    if (/^https?:\/\//.test(pref) || pref.includes("#") || pref.endsWith("/")) {
      return $rdf.namedNode(pref + name);
    }

    // fallback: keep as "pref:name"
    return $rdf.namedNode(pref + ":" + name);
  }

  throw new Error("Unsupported IRItype: " + t);
}

function iriAsDatatypeTerm(iriAst, prefixes) {
  return iriAstToNamedNode(iriAst, prefixes, { preferXsdBuiltins: true });
}

/** ----- datatype/literal helpers (for data ranges) ----- **/
function datatypeToTerm(dtAst, prefixes) {
  if (dtAst.type === "predefined") return $rdf.namedNode(XSD + String(dtAst.value));
  if (dtAst.type === "IRI") return iriAsDatatypeTerm(dtAst.value, prefixes);
  throw new Error("Unknown datatype.type: " + dtAst.type);
}

function literalToTerm(litAst, prefixes) {
  switch (litAst.type) {
    case "stringNoLang":
      return $rdf.literal(unquote(litAst.value));

    case "stringWithLang":
      // rdflib: literal(value, lang) where lang is string
      return $rdf.literal(unquote(litAst.value), String(litAst.language || ""));

    case "typed":
      // rdflib: literal(value, datatypeNamedNode)
      return $rdf.literal(unquote(litAst.value), datatypeToTerm(litAst.datatype, prefixes));

    case "integer":
      return $rdf.literal(String(litAst.value), $rdf.namedNode(XSD + "integer"));

    case "decimal":
      return $rdf.literal(String(litAst.value), $rdf.namedNode(XSD + "decimal"));

    case "float": {
      const s = String(litAst.value);
      const lex = /[fF]$/.test(s) ? s.slice(0, -1) : s;
      return $rdf.literal(lex, $rdf.namedNode(XSD + "float"));
    }

    default:
      throw new Error("Unsupported literal type: " + litAst.type);
  }
}

function dataRangeAstToRdflib(ast, prefixes = {}) {
  const store = $rdf.graph();
  const statements = store.statements || []; // store keeps statements internally; still return a handle

  const sym = (iri) => ($rdf.sym ? $rdf.sym(iri) : $rdf.namedNode(iri));
  const bnode = () => (typeof $rdf.blankNode === "function" ? $rdf.blankNode() : $rdf.bnode());

  const rdfType = sym(RDF + "type");
  const rdfsDatatype = sym(RDFS + "Datatype");

  const owlUnionOf = sym(OWL + "unionOf");
  const owlIntersectionOf = sym(OWL + "intersectionOf");
  const owlOneOf = sym(OWL + "oneOf");
  const owlDatatypeComplementOf = sym(OWL + "datatypeComplementOf");
  const owlOnDatatype = sym(OWL + "onDatatype");
  const owlWithRestrictions = sym(OWL + "withRestrictions");

  function add(s, p, o) {
    store.add(s, p, o);
  }

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

    const b = bnode();
    add(b, rdfType, rdfsDatatype);

    // IMPORTANT: use makeList (Collection if available)
    const listHead = makeList($rdf, store, terms);
    add(b, owlUnionOf, listHead);

    return b;
  }

  function conjunction(node) {
    // keep your original behavior: conjunction maps items via primary()
    const terms = node.items.map(primary);
    if (terms.length === 1) return terms[0];

    const b = bnode();
    add(b, rdfType, rdfsDatatype);

    const listHead = makeList($rdf, store, terms);
    add(b, owlIntersectionOf, listHead);

    return b;
  }

  function primary(node) {
    let inner;

    switch (node.dataPrimaryType) {
      case "datatype":
        inner = datatypeToTerm(node.datatype, prefixes); // -> NamedNode (sym/namedNode)
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
      const b = bnode();
      add(b, rdfType, rdfsDatatype);
      add(b, owlDatatypeComplementOf, inner);
      return b;
    }

    return inner;
  }

  function dataOneOf(list) {
    const lits = list.map(l => literalToTerm(l, prefixes)); // -> Literal
    const b = bnode();

    add(b, rdfType, rdfsDatatype);

    const listHead = makeList($rdf, store, lits);
    add(b, owlOneOf, listHead);

    return b;
  }

  function datatypeRestriction(dr) {
    const dt = datatypeToTerm(dr.datatype, prefixes);
    const restrictionNodes = dr.restrictions.map(r => restrictionNode(r));

    const b = bnode();
    add(b, rdfType, rdfsDatatype);
    add(b, owlOnDatatype, dt);

    const listHead = makeList($rdf, store, restrictionNodes);
    add(b, owlWithRestrictions, listHead);

    return b;
  }

  function restrictionNode(r) {
    const facetIri = FACET_MAP[r.facet];
    if (!facetIri) throw new Error("Unknown facet token: " + r.facet + " (add to FACET_MAP)");

    const b = bnode();
    add(b, sym(facetIri), literalToTerm(r.value, prefixes));
    return b;
  }

  const rangeTerm = asDataRange(ast);

  // statements: depending on rdflib build, store.statements is the array you want
  return { rangeTerm, store, statements: store.statements || statements };
}


function termFromValueOrIRI(objNode, langNode) {
	const XSD = $rdf.Namespace('http://www.w3.org/2001/XMLSchema#');
  // objNode can be: { IRI }, { value }, { Number }
  if (!objNode) return null;

  if (typeof objNode.IRI !== "undefined") {
    return $rdf.sym(objNode.IRI);
  }

  if (typeof objNode.value !== "undefined") {
    const lang = langNode?.language;
    return lang ? $rdf.literal(objNode.value, lang) : $rdf.literal(objNode.value);
  }

  if (typeof objNode.Number !== "undefined") {
    // good default for cardinalities in OWL
    return $rdf.literal(String(objNode.Number), XSD("nonNegativeInteger"));
  }

  return null;
}

function predFromAxiomSymbol(axiomSymbol) {
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
  return annotationPropertyTypes[axiomSymbol] || $rdf.sym(axiomSymbol);
}

// ---- main: AnnotationAssertion with optional axiom annotations ----
function addAnnotationAssertionWithAxiomAnnotations(store, ax) {
    const OWL = $rdf.Namespace('http://www.w3.org/2002/07/owl#');
    const RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    
  // ax.axiom: [ predSymbolNode, subjNode, objNode, langNode, optionalAnnotationsNode ]
  if (typeof ax?.axiom?.[1]?.IRI === "undefined") return;

  const subj = $rdf.sym(ax.axiom[1].IRI);
  const pred = predFromAxiomSymbol(ax.axiom[0]?.axiomSymbol);

  const objTerm = termFromValueOrIRI(ax.axiom[2], ax.axiom[3]);
  if (!subj || !pred || !objTerm) return;

  // 1) add the base triple (AnnotationAssertion)
  store.add(subj, pred, objTerm);

  // 2) if axiom annotations exist, reify with owl:Axiom and add them
  const annList = ax.axiom?.[4]?.axiom;
  if (Array.isArray(annList) && annList.length > 0) {
    const axiomBNode = $rdf.blankNode();

    store.add(axiomBNode, RDF("type"), OWL("Axiom"));
    store.add(axiomBNode, OWL("annotatedSource"), subj);
    store.add(axiomBNode, OWL("annotatedProperty"), pred);
    store.add(axiomBNode, OWL("annotatedTarget"), objTerm);

    for (const ann of annList) {
      // ann example:
      // { type:"Annotation", axiomSymbol:"rdfs:range", axiom:{IRI:"..."} }
      // { type:"Annotation", axiomSymbol:"owl:maxCardinality", axiom:{Number:1} }
      const annPred = predFromAxiomSymbol(ann?.axiomSymbol);
      const annObj = termFromValueOrIRI(ann?.axiom, ann?.language ? { language: ann.language } : null);

      if (annPred && annObj) {
        store.add(axiomBNode, annPred, annObj);
      }
    }
  }
}

function makeLiteral_RDFlib($rdf, ax) {
  // Your encoding: value is in ax.axiom[2].value
  // Datatype (optional) is in ax.axiom[3].type
  const val = ax.axiom[2]?.value ?? "";

  if (ax.axiom[3] && ax.axiom[3].type) {
    return $rdf.literal(val, $rdf.sym(ax.axiom[3].type)); // typed literal
  }
  return $rdf.literal(val); // plain literal
}


function getLocalName(iri) {
  if (typeof iri !== "string") return "";

  // Remove wrapping angle brackets, common in RDF/N-Triples
  iri = iri.trim().replace(/^<|>$/g, "");

  // Local name is usually after the last #, /, or :
  const index = Math.max(
    iri.lastIndexOf("#"),
    iri.lastIndexOf("/"),
    iri.lastIndexOf(":")
  );

  return index >= 0 ? iri.slice(index + 1) : iri;
}

function createRdfList(store, items) {
  const RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";

  if (!items || items.length === 0) {
    return $rdf.sym(RDF + "nil");
  }

  const head = $rdf.blankNode();
  let current = head;

  for (let i = 0; i < items.length; i++) {
    store.add(
      current,
      $rdf.sym(RDF + "first"),
      items[i]
    );

    if (i === items.length - 1) {
      store.add(
        current,
        $rdf.sym(RDF + "rest"),
        $rdf.sym(RDF + "nil")
      );
    } else {
      const next = $rdf.blankNode();

      store.add(
        current,
        $rdf.sym(RDF + "rest"),
        next
      );

      current = next;
    }
  }

  return head;
}