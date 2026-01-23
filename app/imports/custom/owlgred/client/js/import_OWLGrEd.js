import { Interpreter } from '../../../../client/lib/interpreter'

import { Elements, ElementTypes } from '/imports/db/platform/collections'
import { Create_New_OWLGrEd_Element } from './OWLGrEd_Element.js';
import { DataFactory, Writer, Parser, Store } from 'n3';
const { namedNode, literal, quad, blankNode } = DataFactory;

const RDF  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const OWL  = 'http://www.w3.org/2002/07/owl#';
const XSD  = 'http://www.w3.org/2001/XMLSchema#';

const delay = ms => new Promise(res => setTimeout(res, ms));

Interpreter.customMethods({

  loadOntologyOwlgred: async function(){
	// let ontology = saveOntologyRDFlib();
	let ontology = saveOntologyN3();
	await visualizeOntology(ontology);
  },
});

async function loadOntololgyN3OWLGrEd(ontologyText, ontologyName){
	let ontology = saveOntologyN3(ontologyText);
	await visualizeOntology(ontology);
}

async function loadOntololgyFromProjectN3OWLGrEd(ontologyText, ontologyName){
	let ontology = saveOntologyN3(ontologyText);
	// console.log("loadOntololgyFromProjectN3OWLGrEd", ontology)
	ontology = await createOntologyStructure(ontology);
	await Meteor.callAsync("importOntologyOWLGrEd", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")}, ontology, ontologyName);
	// await visualizeOntology(ontology);
}

async function loadOntololgyRDFLibOWLGrEd(ontologyText){
	let ontology = saveOntologyRDFlib(ontologyText);
}

async function saveOntologyRDFlib(ontologyText){
	Meteor.call('loadOwlRDFLib', ontologyText, (err, result) => {
	  if (err) {
		  console.error('Error generating:', err);
		  return;
		}

		// console.log('Output:\n', result);
		visualizeOntology(result);

	});
}

function saveOntologyN3(ontologyText){

	const parser = new Parser();
	const quads = parser.parse(ontologyText);
	const store = new Store(quads);
	let prefixes = parser._prefixes;

	const ontologyQuads = store.getQuads(
	  null,
	  namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
	  namedNode("http://www.w3.org/2002/07/owl#Ontology"),
	  null
	);


	const ontologyNode = ontologyQuads[0]?.subject;
	// if(ontologyNode.value && !prefixes[""]) prefixes[""] = ontologyNode.value;
	if(ontologyNode) prefixes= useOntologyPrefixAsDefault(prefixes, ontologyNode.value)

	let ontologyStructure = makeState(prefixes);

	discoverEntitiesN3(store, ontologyStructure, prefixes)

	routeTriplesN3(store, ontologyStructure)

	extendWithAnnotationsN3(store, ontologyStructure)

	// console.log("ontologyStructure3", ontologyStructure)

	return ontologyStructure
}


function makeState(prefixes = {}) {
  return {
    prefixes,
    classes: {}, individuals: {}, objectProperties: {}, dataProperties: {}, annotationProperties: {}, dataTypes: {}, allDisjointClasses: [], allDisjointProperties: [], allDifferent: [],
    // auxiliary indexes
    isAnnotationProp: new Set(),
    isObjectProp: new Set(),
    isDataProp: new Set(),
  };
}

// convert IRI to prefixed name ---
function iriToPrefixed(iri, prefixes = {}) {
  for (const [prefix, base] of Object.entries(prefixes)) {
    if (iri.startsWith(base)) {
      const local = iri.slice(base.length);

      // Rule 2: default prefix ("" or ":") → just the local name
      if (prefix === '' || prefix === ':') {
        return local;
      }

      // Rule 1: normal prefix → prefix:localName
      return `${prefix}:${local}`;
    }
  }

  // Rule 3: prefix unknown → return full IRI
  return iri;
}



// --- helper: detect built-in datatypes ---
function isBuiltInDatatype(iri) {
  return (
    iri.startsWith(XSD) ||
    iri === RDFS + 'Literal' ||
    iri === RDF + 'langString' ||
    iri === RDF + 'PlainLiteral' ||
    iri === OWL + 'real' ||
    iri === OWL + 'rational'
  );
}

// --- helper: parse an owl:Restriction blank node into a structured object ---
function parseRestriction(store, bn) {
  if (!bn || bn.termType !== 'BlankNode') return null;

  const getO = (pIri) => store.getQuads(bn, namedNode(pIri), null, null).map(q => q.object);
  const hasTypeRestriction = store.getQuads(bn, namedNode(RDF + 'type'), namedNode(OWL + 'Restriction'), null).length > 0;
  if (!hasTypeRestriction) return null;

  // --- handle onProperty and its inverse form ---
  let onProp = null;
  let inverse = false;
  const onPropObjs = getO(OWL + 'onProperty');
  if (onPropObjs.length) {
    const pTerm = onPropObjs[0];
    if (pTerm.termType === 'NamedNode') {
      onProp = pTerm.value;
    } else if (pTerm.termType === 'BlankNode') {
      const inv = store.getQuads(pTerm, namedNode(OWL + 'inverseOf'), null, null)[0]?.object;
      if (inv && inv.termType === 'NamedNode') {
        onProp = inv.value;
        inverse = true;  // <— mark inverseOf usage
      }
    }
  }

  // fillers
  const some = getO(OWL + 'someValuesFrom')[0];
  const all  = getO(OWL + 'allValuesFrom')[0];
  const hv   = getO(OWL + 'hasValue')[0];

  // Cardinalities
  const minCard = getO(OWL + 'minCardinality')[0];
  const maxCard = getO(OWL + 'maxCardinality')[0];
  const card    = getO(OWL + 'cardinality')[0];
  const qMinCard = getO(OWL + 'minQualifiedCardinality')[0];
  const qMaxCard = getO(OWL + 'maxQualifiedCardinality')[0];
  const qCard    = getO(OWL + 'qualifiedCardinality')[0];

  const onClass     = getO(OWL + 'onClass')[0];
  const onDataRange = getO(OWL + 'onDataRange')[0];

  const lit2num = (lit) => (lit && lit.termType === 'Literal' ? Number(lit.value) : null);

  const restriction = {
    bnode: `_:${bn.value}`,
    onProperty: onProp,
    inverse,   // <— NEW FIELD

    // fillers (IRIs)
    someValuesFrom: some?.termType === 'NamedNode' ? some.value : null,
    allValuesFrom:  all?.termType === 'NamedNode'  ? all.value  : null,
    hasValue: hv
      ? (hv.termType === 'NamedNode'
          ? hv.value
          : { literal: hv.value, lang: hv.language || null, dt: hv.datatype?.value || null })
      : null,

    // unqualified cardinalities
    minCardinality: lit2num(minCard),
    maxCardinality: lit2num(maxCard),
    cardinality:    lit2num(card),

    // qualified cardinalities
    minQualifiedCardinality: lit2num(qMinCard),
    maxQualifiedCardinality: lit2num(qMaxCard),
    qualifiedCardinality:    lit2num(qCard),

    onClass:     onClass?.termType === 'NamedNode' ? onClass.value : null,
    onDataRange: onDataRange?.termType === 'NamedNode' ? onDataRange.value : null
  };

  return restriction;
}



function discoverEntitiesN3(store, state, prefixes = {}) {
  const type = namedNode(RDF + 'type');

  const ensure = (bucket, iri, makeFn) => {
    if (!bucket[iri]) bucket[iri] = makeFn(iri);
    return bucket[iri];
  };

  const makeEntity = (iri, kind) => ({
    iri,
    prefixed: iriToPrefixed(iri, prefixes),
    label: null,
    annotations: [],
    kind
  });

  // Quick “kind” checks to avoid misclassifying subjects as individuals
  const isAlreadySchemaEntity = (iri) =>
    !!(state.classes[iri] || state.objectProperties[iri] || state.dataProperties[iri] ||
       state.annotationProperties[iri] || state.dataTypes?.[iri]);

  const makeDatatype = (iri) => ({
    ...makeEntity(iri, 'Datatype'),
    // fields used for OWL 2 datatype definitions
    base: null,                  // IRI of owl:onDatatype
    restrictions: [],            // [{ facet, value, dt, lang }]
    equivalentDatatypes: [],     // optional: if owl:equivalentClass to a named datatype
    disjointDatatypes: []        // (rare) if you later support these
  });

  const pushType = (s, o) => {
    if (s.termType !== 'NamedNode' || o.termType !== 'NamedNode') return;

    const sIri = s.value;
    const oIri = o.value;

    if (oIri === OWL + 'Class') {
      ensure(state.classes, sIri, iri => ({
        ...makeEntity(iri, 'Class'),
        superClasses: [],
        equivalentClasses: [],
        disjointWith: [],
        instances: [],
        dataProperties: [],
        objectProperties: [],
		restrictions: [],
		keys: [],
		complementOf: []
      }));
      return;
    }

    if (oIri === OWL + 'ObjectProperty') {
	  ensure(state.objectProperties, sIri, iri => ({
		...makeEntity(iri, 'ObjectProperty'),
		domain: [],
		range: [],
		characteristics: {},
		inverseOf: [] ,
		propertyChains: []
	  }));
	  state.isObjectProp.add(sIri);
	  return;
	}

    if (oIri === OWL + 'DatatypeProperty') {
      ensure(state.dataProperties, sIri, iri => ({
        ...makeEntity(iri, 'DatatypeProperty'),
        domain: [],
        range: [],
        characteristics: {}
      }));
      state.isDataProp.add(sIri);
      return;
    }


    if (oIri === OWL + 'AnnotationProperty') {
      ensure(state.annotationProperties, sIri, iri => ({
        ...makeEntity(iri, 'AnnotationProperty'),
        domain: [],
        range: [],
		superProperties: []
      }));
      state.isAnnotationProp.add(sIri);
      return;
    }

    if (oIri === RDFS + 'Datatype' || oIri === OWL + 'Datatype') {
      if (!isBuiltInDatatype(sIri) && typeof state.dataTypes !== 'undefined') {
        ensure(state.dataTypes, sIri, makeDatatype);

      }
      return;
    }

    //  Skip adding owl:NamedIndividual as a "type"
    if (oIri === OWL + 'NamedIndividual') {
      // We don't create or add this to types. Just ignore this axiom.
      return;
    }

    //  Treat as an Individual ONLY if:
    //  - subject is not already a schema entity (prop/class/datatype/annotationProp)
    //  - object is NOT any of the schema/entity kinds above
    //  - object is NOT owl:NamedIndividual (handled just above)
    if (!isAlreadySchemaEntity(sIri) && oIri !== OWL + 'Ontology') {
      ensure(state.individuals, sIri, iri => ({
        ...makeEntity(iri, 'Individual'),
        types: [],
        dataFacts: [],
        objFacts: []
      }));
      // Add the class IRI as type (skip NamedIndividual by guard above)
      state.individuals[sIri].types.push(oIri);
    }
  };

  // Pass A: rdf:type triples
  for (const q of store.getQuads(null, type, null, null)) {
    pushType(q.subject, q.object);
  }


  // Final cleanup: remove accidental `owl:NamedIndividual` types if any
  for (const ind of Object.values(state.individuals)) {
    ind.types = ind.types.filter(t => t !== OWL + 'NamedIndividual');
  }

  // Include subjects that are not schema entities
  for (const q of store.getQuads(null, null, null, null)) {
	  const s = q.subject;
	  const o = q.object;
	  if (s.termType === 'NamedNode') {
		const sIri = s.value;
		const oIri = o.value;
		if (!isAlreadySchemaEntity(sIri) && !state.individuals[sIri] && oIri !== OWL + 'Ontology') {
		  state.individuals[sIri] = {
			...makeEntity(sIri, 'Individual'),
			types: [],
			dataFacts: [],
			objFacts: []
		  };
		}
	  }
  }

  return state;
}


function routeTriplesN3(store, state, prefixes = {}) {
  const qAll = store.getQuads(null, null, null, null);

  const isDatatype = (iri) =>
    iri.startsWith(XSD) || iri === RDFS + 'Literal' || iri === RDF + 'langString' ||
    iri === RDF + 'PlainLiteral' || iri === OWL + 'real' || iri === OWL + 'rational';

  // NEW: make sure we can create a datatype bucket on-the-fly
  const ensureDatatype = (iri) => {
    if (typeof state.dataTypes === 'undefined') return null; // respect caller’s choice to omit datatypes
    if (!state.dataTypes[iri]) {
      state.dataTypes[iri] = {
        iri,
        prefixed: iriToPrefixed(iri, prefixes),
        label: null,
        annotations: [],
        kind: 'Datatype',
        base: null,
        restrictions: [],
        equivalentDatatypes: [],
        disjointDatatypes: []
      };
    }
    return state.dataTypes[iri];
  };

  // Ensure an individual bucket exists (local helper)
	const ensureIndividual = (iri) => {
	  if (!state.individuals[iri]) {
		state.individuals[iri] = {
		  iri,
		  prefixed: iriToPrefixed(iri, prefixes),
		  label: null,
		  annotations: [],
		  kind: 'Individual',
		  types: [],
		  dataFacts: [],
		  objFacts: []
		};
	  }
	  return state.individuals[iri];
	};

  const propBucket = (iri) => {
    let b = state.objectProperties[iri];
    if (b) {
      b.superProperties ||= [];
      b.equivalentProperties ||= [];
      b.disjointProperties ||= [];
      b.characteristics ||= {};
      b.domain ||= [];
      b.range ||= [];
	  b.inverseOf ||= [];
      b.propertyChains ||= [];
      return b;
    }
    b = state.dataProperties[iri];
    if (b) {
      b.superProperties ||= [];
      b.equivalentProperties ||= [];
      b.disjointProperties ||= [];
      b.characteristics ||= {};
      b.domain ||= [];
      b.range ||= [];
      return b;
    }
    // allow annotation properties to use same helpers where relevant
    b = state.annotationProperties[iri];
    if (b) {
	  b.superProperties ||= [];
      b.domain ||= [];
      b.range ||= [];
      return b;
    }
    return null;
  };

  for (const q of qAll) {
    const s = q.subject, p = q.predicate, o = q.object;

    // Labels
    if (p.value === RDFS + 'label' && s.termType === 'NamedNode' && o.termType === 'Literal') {
      const tgt =
        state.classes[s.value] ||
        state.objectProperties[s.value] ||
        state.dataProperties[s.value] ||
        state.individuals[s.value] ||
        state.annotationProperties[s.value] ||
        state.dataTypes?.[s.value];
      if (tgt) tgt.label = o.value;
      continue;
    }

    // Class axioms
    if (p.value === RDFS + 'subClassOf' && s.termType === 'NamedNode') {
	  const cls = state.classes[s.value];
	  if (cls) {
		if (o.termType === 'NamedNode') cls.superClasses.push(o.value);
		else if (o.termType === 'BlankNode') {
		  const r = parseRestriction(store, o);
		  if (r) (cls.restrictions ||= []).push(r);
		  else   (cls.restrictions ||= []).push({ bnode: `_:${o.value}`, raw: true });
		}
	  }
	  continue;
	}

	  // Extended equivalentClass handling: capture complement-of expressions
	  if (p.value === OWL + 'equivalentClass') {
		// Case A: :NamedClass owl:equivalentClass _:bn  (we already had a subset of this block)
		if (s.termType === 'NamedNode') {
		  const cls = state.classes[s.value];
		  if (cls) {
			if (o.termType === 'NamedNode') {
			  // keep existing behavior
			  (cls.equivalentClasses ||= []).push(o.value);
			} else if (o.termType === 'BlankNode') {
			  // Try complement-of on the BN
			  const target = getComplementTargetIri(store, o);
			  if (target) {
				(cls.complementOf ||= []).push(target);
			  } else {
				// (optional) keep raw if you wish
				// (cls.restrictions ||= []).push({ bnode: `_:${o.value}`, raw: true });
			  }
			}
		  }
		  continue;
		}

		// Case B: _:bn owl:equivalentClass :NamedClass
		if (o.termType === 'NamedNode') {
		  // Ensure class bucket exists (in case it wasn't typed earlier)
		  const tgtIri = o.value;
		  const cls = state.classes[tgtIri] || (state.classes[tgtIri] = {
			iri: tgtIri,
			prefixed: iriToPrefixed(tgtIri, prefixes),
			label: null,
			annotations: [],
			kind: 'Class',
			superClasses: [],
			equivalentClasses: [],
			disjointWith: [],
			instances: [],
			dataProperties: [],
			objectProperties: [],
			restrictions: [],
			keys: [],
			complementOf: []
		  });

		  if (s.termType === 'BlankNode') {
			const target = getComplementTargetIri(store, s);
			if (target) {
			  (cls.complementOf ||= []).push(target);
			} else {
			  // (optional) keep raw if you wish
			  // (cls.restrictions ||= []).push({ bnode: `_:${s.value}`, raw: true });
			}
		  } else if (s.termType === 'NamedNode') {
			// symmetric equivalentClass named↔named
			(cls.equivalentClasses ||= []).push(s.value);
		  }
		  continue;
		}
	  }
    if ((p.value === OWL + 'equivalentClass' || p.value === OWL + 'disjointWith') &&
        s.termType === 'NamedNode' && o.termType === 'NamedNode') {
      const cls = state.classes[s.value];
      if (cls) {
        const key = p.value.endsWith('equivalentClass') ? 'equivalentClasses' : 'disjointWith';
        cls[key].push(o.value);
      }
      continue;
    }

	// Class keys: :C owl:hasKey ( propExpr1 propExpr2 ... )
	if (p.value === OWL + 'hasKey' && s.termType === 'NamedNode') {
	  // Ensure class bucket exists even if no prior rdf:type owl:Class
	  if (!state.classes[s.value]) {
		state.classes[s.value] = {
		  iri: s.value,
		  prefixed: iriToPrefixed(s.value, prefixes),
		  label: null,
		  annotations: [],
		  kind: 'Class',
		  superClasses: [],
		  equivalentClasses: [],
		  disjointWith: [],
		  instances: [],
		  dataProperties: [],
		  objectProperties: [],
		  restrictions: [],
		  keys: []
		};
	  }

	  const cls = state.classes[s.value];
	  const items = parseRdfList(store, o);
	  const parsed = items
		.map(t => parseKeyItem(store, t, state))
		.filter(x => x && typeof x.iri === 'string');

	  if (parsed.length > 0) {
		(cls.keys ||= []).push(parsed);

		// Light ensure: create buckets for mentioned properties so later code can enrich them
		for (const it of parsed) {
		  if (it.kind === 'object' || (it.kind == null && !state.dataProperties[it.iri])) {
			// assume object if unknown; make OP bucket if missing
			if (!state.objectProperties[it.iri]) {
			  state.objectProperties[it.iri] = {
				iri: it.iri,
				prefixed: iriToPrefixed(it.iri, prefixes),
				label: null,
				annotations: [],
				kind: 'ObjectProperty',
				domain: [],
				range: [],
				characteristics: {},
				superProperties: [],
				equivalentProperties: [],
				disjointProperties: [],
				inverseOf: [],
				propertyChains: []
			  };
			}
			state.isObjectProp.add?.(it.iri);
		  }
		  if (it.kind === 'data') {
			if (!state.dataProperties[it.iri]) {
			  state.dataProperties[it.iri] = {
				iri: it.iri,
				prefixed: iriToPrefixed(it.iri, prefixes),
				label: null,
				annotations: [],
				kind: 'DatatypeProperty',
				domain: [],
				range: [],
				characteristics: {}
			  };
			}
			state.isDataProp.add?.(it.iri);
		  }
		}
	  }
	  continue;
	}


    // Property hierarchy
    if (p.value === RDFS + 'subPropertyOf' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
      const pb = propBucket(s.value);
      if (pb) pb.superProperties.push(o.value);
      continue;
    }
    if (p.value === OWL + 'equivalentProperty' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
      const pb = propBucket(s.value);
      if (pb) pb.equivalentProperties.push(o.value);
      continue;
    }
    if (p.value === OWL + 'propertyDisjointWith' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
      const pb = propBucket(s.value);
      if (pb) pb.disjointProperties.push(o.value);
      continue;
    }

    // Domains / Ranges
    if (p.value === RDFS + 'domain' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
      if (state.objectProperties[s.value]) state.objectProperties[s.value].domain.push(o.value);
      if (state.dataProperties[s.value])   state.dataProperties[s.value].domain.push(o.value);
      if (state.annotationProperties[s.value])  state.annotationProperties[s.value].domain.push(o.value);

      // link property under class bucket (for OP/DP only)
      const cls = state.classes[o.value];
      if (cls) {
        if (state.isObjectProp.has(s.value)) cls.objectProperties.push(s.value);
        if (state.isDataProp.has(s.value))   cls.dataProperties.push(s.value);
      }
      continue;
    }

    if (p.value === RDFS + 'range' && s.termType === 'NamedNode') {
      if (state.objectProperties[s.value] && o.termType === 'NamedNode') state.objectProperties[s.value].range.push(o.value);

      if (state.dataProperties[s.value]   && o.termType === 'NamedNode' && isDatatype(o.value)) state.dataProperties[s.value].range.push(o.value);

      // For annotation properties, range can be Class/IRI/Literal; we just record the IRI if NamedNode.
      if (state.annotationProperties[s.value] && o.termType === 'NamedNode') {
        state.annotationProperties[s.value].range.push(o.value);
      }
      continue;
    }

    // Property characteristics
    if (p.value === RDF + 'type' && s.termType === 'NamedNode') {
      const localName = o.value.startsWith(OWL) ? o.value.slice(OWL.length) : o.value;
      if (state.objectProperties[s.value] && localName.endsWith('Property') &&
          localName !== 'AnnotationProperty' && localName !== 'DatatypeProperty' && localName !== 'ObjectProperty') {
        state.objectProperties[s.value].characteristics[localName] = true;
      }
      if (state.dataProperties[s.value] && localName.endsWith('Property') &&
          localName !== 'AnnotationProperty' && localName !== 'DatatypeProperty' && localName !== 'ObjectProperty') {
        state.dataProperties[s.value].characteristics[localName] = true;
      }
      continue;
    }

	// Object property inverses
	if (p.value === OWL + 'inverseOf' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
	  // Mark as object properties for any downstream logic
	  state.isObjectProp.add(s.value);
	  state.isObjectProp.add(o.value);

	  // Store symmetric inverse links
	  state.objectProperties[s.value].inverseOf.push(o.value);
	  state.objectProperties[o.value].inverseOf.push(s.value);
	  continue;
	}


	// Property chain axioms: :superProp owl:propertyChainAxiom ( ...list... )
	if (p.value === OWL + 'propertyChainAxiom' && s.termType === 'NamedNode') {
	  // ensure the super property bucket exists as OP
	  const superProp = propBucket(s.value) ||
		(state.objectProperties[s.value] = {
		  iri: s.value,
		  prefixed: iriToPrefixed(s.value, prefixes),
		  label: null,
		  annotations: [],
		  kind: 'ObjectProperty',
		  domain: [],
		  range: [],
		  characteristics: {},
		  superProperties: [],
		  equivalentProperties: [],
		  disjointProperties: [],
		  inverseOf: [],
		  propertyChains: []
		});

	  state.isObjectProp.add(s.value);

	  // read the list and map items (support [owl:inverseOf :p] nodes)
	  const items = parseRdfList(store, o);
	  const chain = items
		.map(t => parseChainItem(store, t))
		.filter(x => x && typeof x.iri === 'string');

	  if (chain.length > 0) {
		// store the chain that implies this super property
		superProp.propertyChains.push(chain);

		// also mark each mentioned IRI as an object property bucket (light ensure)
		for (const it of chain) {
		  propBucket(it.iri) || (state.objectProperties[it.iri] = {
			iri: it.iri,
			prefixed: iriToPrefixed(it.iri, prefixes),
			label: null,
			annotations: [],
			kind: 'ObjectProperty',
			domain: [],
			range: [],
			characteristics: {},
			superProperties: [],
			equivalentProperties: [],
			disjointProperties: [],
			inverseOf: [],
			propertyChains: []
		  });
		  state.isObjectProp.add(it.iri);
		}
	  }
	  continue;
	}

    // Annotation assertions (now include datatypes as possible targets)
    if (state.isAnnotationProp.has(p.value) && s.termType === 'NamedNode') {
      const tgt =
        state.classes[s.value] ||
        state.objectProperties[s.value] ||
        state.dataProperties[s.value] ||
        state.individuals[s.value] ||
        state.annotationProperties[s.value] ||
        state.dataTypes?.[s.value];
      if (tgt) (tgt.annotations ||= []).push({
        p: p.value,
        v: o.termType === 'Literal' ? o.value : o.value,
        lang: o.language,
        dt: o.datatype?.value
      });
      continue;
    }

    // Datatype base (owl:onDatatype) — only handle named-node base (no bnodes/expressions)
    if (p.value === OWL + 'onDatatype' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
      const dtb = ensureDatatype(s.value);
      if (dtb) dtb.base = o.value;
      continue;
    }

	//  owl:AllDisjointClasses / owl:AllDisjointProperties / owl:AllDifferent ---
    if (p.value === RDF + 'type' &&
        s.termType === 'BlankNode' &&
        o.termType === 'NamedNode' &&
        (o.value === OWL + 'AllDisjointClasses' ||
         o.value === OWL + 'AllDisjointProperties' ||
         o.value === OWL + 'AllDifferent')) {

      // which list predicate to use
      const listPred =
        (o.value === OWL + 'AllDifferent')
          ? namedNode(OWL + 'distinctMembers')
          : namedNode(OWL + 'members');

      const head = store.getQuads(s, listPred, null, null)[0]?.object;
      if (head) {
        const terms = parseRdfList(store, head);
        const iris = [];

        for (const t of terms) {
          if (t.termType === 'NamedNode') {
            iris.push(t.value);

            // For AllDifferent, make sure we treat them as individuals
            if (o.value === OWL + 'AllDifferent') {
              ensureIndividual(t.value);
            }
          }
        }
        if (iris.length >= 2) {
          if (o.value === OWL + 'AllDisjointClasses') {
            state.allDisjointClasses.push(iris);
          } else if (o.value === OWL + 'AllDisjointProperties') {
            state.allDisjointProperties.push(iris);
          } else if (o.value === OWL + 'AllDifferent') {

            state.allDifferent.push(iris);
          }
        }
      }
      continue;
    }


	// Negative property assertions (reified as a bnode)
	// _:n a owl:NegativePropertyAssertion ;
	//     owl:sourceIndividual :s ;
	//     owl:assertionProperty :p ;
	//     (owl:targetIndividual :o | owl:targetValue "lit"^^dt ) .
	if (p.value === RDF + 'type' &&
		s.termType === 'BlankNode' &&
		o.termType === 'NamedNode' &&
		o.value === OWL + 'NegativePropertyAssertion') {

	  // Extract the parts from the same blank node
	  const src = store.getQuads(s, namedNode(OWL + 'sourceIndividual'), null, null)[0]?.object;
	  const ap  = store.getQuads(s, namedNode(OWL + 'assertionProperty'), null, null)[0]?.object;
	  const tgtI = store.getQuads(s, namedNode(OWL + 'targetIndividual'), null, null)[0]?.object;
	  const tgtV = store.getQuads(s, namedNode(OWL + 'targetValue'), null, null)[0]?.object;

	  // Need a named source individual and a named assertion property
	  if (src?.termType === 'NamedNode' && ap?.termType === 'NamedNode') {
		const srcIri = src.value;
		const apIri  = ap.value;
		const ind = ensureIndividual(srcIri);

		if (tgtI?.termType === 'NamedNode') {
		  // Negative OBJECT property assertion: ¬ ap(src, tgtI)
		  ind.objFacts.push({ p: apIri, object: tgtI.value, negative: true });
		} else if (tgtV?.termType === 'Literal') {
		  // Negative DATA property assertion: ¬ ap(src, "lit")
		  ind.dataFacts.push({
			p: apIri,
			value: tgtV.value,
			lang: tgtV.language || null,
			dt: tgtV.datatype?.value || null,
			negative: true
		  });
		}
	  }
	  continue;
	}

	// Built-in annotation property IRIs (in addition to declared ones)
	const builtInAnnProps = [
	  RDFS + 'comment', RDFS + 'seeAlso', RDFS + 'isDefinedBy',
	  OWL  + 'versionInfo', OWL + 'versionIRI', OWL + 'priorVersion',
	  OWL  + 'backwardCompatibleWith', OWL + 'incompatibleWith', OWL + 'deprecated'
	];

	// If this triple is an annotation assertion on a named entity (e.g. individual):
	if ((state.isAnnotationProp.has(p.value) || builtInAnnProps.includes(p.value))
		&& s.termType === 'NamedNode') {
	 /* // Ensure the subject is recorded as an individual entity
	  const entity = state.individuals[s.value] ?? ensureIndividual(s.value);
	  // Store full annotation detail in the annotations array
	  entity.annotations.push({
		p: p.value,
		v: o.termType === 'Literal' ? o.value : o.value,
		dt: o.termType === 'Literal' ? (o.datatype ? o.datatype.value : null) : undefined,
		lang: o.termType === 'Literal' ? (o.language || null) : undefined
	  });*/
	  continue;
	}

    // Individual facts
    if (state.individuals[s.value]) {
      if (o.termType === 'Literal') {
        state.individuals[s.value].dataFacts.push({ p: p.value, value: o.value, lang: o.language, dt: o.datatype?.value });
      } else if (o.termType === 'NamedNode') {
        state.individuals[s.value].objFacts.push({ p: p.value, object: o.value });
      }
      continue;
    }
  }

  // De-dup arrays
  const dedup = (arr) => Array.from(new Set(arr));
  for (const m of [state.objectProperties, state.dataProperties, state.annotationProperties]) {
    for (const iri of Object.keys(m)) {
      const b = m[iri]; if (!b) continue;
      b.superProperties      = dedup(b.superProperties || []);
      b.equivalentProperties = dedup(b.equivalentProperties || []);
      b.disjointProperties   = dedup(b.disjointProperties || []);
      b.domain               = dedup(b.domain || []);
      b.range                = dedup(b.range || []);
	  if (m === state.objectProperties) {
        b.inverseOf = dedup(b.inverseOf || []);
		// dedup chains by JSON signature
		if (Array.isArray(b.propertyChains)) {
			const sig = new Set();
			b.propertyChains = b.propertyChains.filter(chain => {
			  const key = JSON.stringify(chain);
			  if (sig.has(key)) return false;
			  sig.add(key);
			  return true;
			});
		}
      }
    }
  }

  // const dedup = (arr) => Array.from(new Set(arr));

	// for (const iri of Object.keys(state.classes)) {
	  // const c = state.classes[iri]; if (!c) continue;
	  // c.superClasses      = dedup(c.superClasses || []);
	  // c.equivalentClasses = dedup(c.equivalentClasses || []);
	  // c.disjointWith      = dedup(c.disjointWith || []);
	  // c.complementOf      = dedup(c.complementOf || []);   // ← NEW
	// }

  for (const iri of Object.keys(state.classes)) {
	  const c = state.classes[iri]; if (!c) continue;
	  if (Array.isArray(c.keys)) {
		const seen = new Set();
		c.keys = c.keys.filter(keyArr => {
		  // normalize to stable signature: array of {iri,inverse,kind} sorted by iri+inverse+kind
		  const sig = JSON.stringify(keyArr.map(k => [k.iri, !!k.inverse, k.kind || null]));
		  if (seen.has(sig)) return false;
		  seen.add(sig);
		  return true;
		});
	  }
	}


  // Final safety: strip owl:NamedIndividual if any slipped in
  for (const ind of Object.values(state.individuals)) {
    ind.types = (ind.types || []).filter(t => t !== OWL + 'NamedIndividual');
  }
}

function extendWithAnnotationsN3(store, structure) {
  // Define built-in annotation properties to capture (in addition to those declared in the ontology)
  const builtInAnnProps = [
    RDFS + 'comment',
    RDFS + 'seeAlso',
    RDFS + 'isDefinedBy',
    OWL  + 'versionInfo',
    OWL  + 'versionIRI',
    OWL  + 'priorVersion',
    OWL  + 'backwardCompatibleWith',
    OWL  + 'incompatibleWith',
    OWL  + 'deprecated'
  ];

  // Define known structural predicates to skip (already handled by routeTriplesN3 or not annotations)
  const structuralPreds = new Set([
    RDF  + 'type',
    RDFS + 'subClassOf',
    RDFS + 'subPropertyOf',
    RDFS + 'domain',
    RDFS + 'range',
    OWL  + 'equivalentClass',
    OWL  + 'equivalentProperty',
    OWL  + 'disjointWith',
    OWL  + 'propertyDisjointWith',
    OWL  + 'inverseOf',
    OWL  + 'propertyChainAxiom',
    OWL  + 'hasKey',
    OWL  + 'sameAs',
    OWL  + 'differentFrom',
    OWL  + 'unionOf',
    OWL  + 'intersectionOf',
    OWL  + 'complementOf',
    OWL  + 'oneOf'
  ]);

  // Identify the ontology node (if any) and record its annotations
  const ontologyQuads = store.getQuads(null, namedNode(RDF + 'type'), namedNode(OWL + 'Ontology'), null);
  if (ontologyQuads.length > 0) {
    const ontologyNode = ontologyQuads[0].subject;
    // Initialize ontology entry in the structure
    structure.ontology = {
      iri: ontologyNode.termType === 'NamedNode' ? ontologyNode.value : null,
      annotations: []
    };
    // Traverse all triples with the ontology as subject
    for (const { predicate: p, object: o } of store.getQuads(ontologyNode, null, null, null)) {
      if (p.value === RDF + 'type') continue; // skip owl:Ontology type triple
      if (p.value === RDFS + 'label' && o.termType === 'Literal') {
        // Capture ontology label separately (avoid duplicating label)
        structure.ontology.label = o.value;
        continue;
      }
      // Only capture triples where predicate is an annotation property
      if (structuralPreds.has(p.value)) continue;
      if (!structure.isAnnotationProp.has(p.value) && !builtInAnnProps.includes(p.value)) continue;
      // Record the annotation on the ontology
      const ann = { p: p.value, v: o.termType === 'Literal' ? o.value : o.value };
      if (o.termType === 'Literal') {
        ann.dt = o.datatype ? o.datatype.value : null;
        ann.lang = o.language || null;
      }
      structure.ontology.annotations.push(ann);
    }
  }

  // Helper to add an annotation entry to a structure entity
  const addAnnotation = (entity, propIri, obj) => {
    const annotation = { p: propIri, v: obj.termType === 'Literal' ? obj.value : obj.value };
    if (obj.termType === 'Literal') {
      annotation.dt = obj.datatype ? obj.datatype.value : null;
      annotation.lang = obj.language || null;
    }
    entity.annotations.push(annotation);
  };

  // Traverse all entity categories and collect annotation assertions
  const categories = ['classes', 'individuals', 'objectProperties', 'dataProperties', 'annotationProperties', 'dataTypes'];
  for (const cat of categories) {
    const entities = structure[cat];
    if (!entities) continue;
    for (const iri in entities) {
      const entity = entities[iri];
      // Determine subject term (handle blank nodes vs IRIs)
      const isBlank = iri.startsWith('_:') || iri.indexOf(':') === -1;
      const subjectTerm = isBlank
        ? (iri.startsWith('_:') ? blankNode(iri.slice(2)) : blankNode(iri))
        : namedNode(iri);
      // Get all triples for this subject
      for (const { predicate: p, object: o } of store.getQuads(subjectTerm, null, null, null)) {
        if (p.value === RDFS + 'label') continue;             // skip labels (already handled)
        if (structuralPreds.has(p.value)) continue;          // skip structural triples
        if (!structure.isAnnotationProp.has(p.value) && !builtInAnnProps.includes(p.value)) continue;  // not an annotation property
        if (structure.isAnnotationProp.has(p.value) && !isBlank) continue; // avoid duplicating annotations already handled in routeTriplesN3
        // Add the annotation assertion to the entity
        addAnnotation(entity, p.value, o);
      }
    }
  }

  return structure;
}

function getBuiltInAnnotationShortName(iri, annotationProperties) {
  const map = {
    // RDFS annotation properties
    "http://www.w3.org/2000/01/rdf-schema#label": "label",
    "http://www.w3.org/2000/01/rdf-schema#comment": "comment",
    "http://www.w3.org/2000/01/rdf-schema#seeAlso": "seeAlso",
    "http://www.w3.org/2000/01/rdf-schema#isDefinedBy": "isDefinedBy",

    // OWL annotation properties
    "http://www.w3.org/2002/07/owl#versionInfo": "versionInfo",
    "http://www.w3.org/2002/07/owl#versionIRI": "versionIRI",
    "http://www.w3.org/2002/07/owl#priorVersion": "priorVersion",
    "http://www.w3.org/2002/07/owl#backwardCompatibleWith": "backwardCompatibleWith",
    "http://www.w3.org/2002/07/owl#incompatibleWith": "incompatibleWith",
    "http://www.w3.org/2002/07/owl#deprecated": "deprecated",
  };

  // Return short name if found, otherwise try to derive from IRI
  if (map[iri]) return map[iri];

  if(annotationProperties[iri]) return annotationProperties[iri].prefixed;

  return null;

  // Fallback: extract local name after '#' or last '/'
  // const cut = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
  // return cut >= 0 ? iri.slice(cut + 1) : iri;
}


async function createOntologyStructure(ontology){
	let prefixes = ontology.prefixes;
	let ontologyPrefixes = ontology.prefixes;
	let classes = ontology.classes;
	let createdClasses = {};
	let restrictions = [];
	let complementOf = [];
	let superClasses = {};
	let disjointClasses = [];
	let equivalentClasses = [];
	let differentIndivids = [];
	let sameAsIndivids = [];

	for (const iri in classes) {
	  const cls = classes[iri];

	  // createdClasses[iri] = cl;
	  for(let an = 0; an < cls.annotations.length; an++){
		  let annotation = cls.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			cls.annotations[an] = [
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				]
		  }
	  }

	  for(let r = 0; r < cls.restrictions.length; r++){
		  let restriction = cls.restrictions[r];
		  // restriction some/only
		  if(restriction.allValuesFrom !== null || restriction.someValuesFrom !== null){
			  restriction["subject"] = iri;
			  restriction["onClass"] = restriction.someValuesFrom || restriction.allValuesFrom;
			  restrictions.push(restriction);
		  } else {
			  //object property cardinality
			  if(restriction.onClass !== null && restriction.onProperty !== null
			  && typeof classes[restriction.onClass] !== "undefined" && typeof ontology.objectProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.objectProperties[restriction.onProperty].domain[0] && restriction.onClass === ontology.objectProperties[restriction.onProperty].range[0]
			  ){
				let multiplicity = formatCardinalityRange(restriction);
				if(multiplicity !== null){
					ontology.objectProperties[restriction.onProperty].multiplicity = multiplicity;
				}
			  // data property cardinality
			  // }else if(restriction.onDataRange !== null && restriction.onProperty !== null
			  }else if(restriction.onProperty !== null
			  && typeof ontology.dataProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.dataProperties[restriction.onProperty].domain[0]
			  ){
				let multiplicity = formatCardinalityRange(restriction);
				if(multiplicity !== null){
					ontology.dataProperties[restriction.onProperty].multiplicity = multiplicity;
				}
			  }
			  //restriction cardinality
			  else if(restriction.onClass !== null && restriction.onProperty !== null
			  && typeof classes[restriction.onClass] !== "undefined" && typeof ontology.objectProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.objectProperties[restriction.onProperty].domain[0] && restriction.onClass !== ontology.objectProperties[restriction.onProperty].range[0]
			  ){
				  restriction["subject"] = iri;
			      restrictions.push(restriction);
			  }
			  //inverse restriction cardinality
			  else if(restriction.inverse === true && restriction.onClass !== null && restriction.onProperty !== null
			  && typeof classes[restriction.onClass] !== "undefined" && typeof ontology.objectProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.objectProperties[restriction.onProperty].range[0] && restriction.onClass === ontology.objectProperties[restriction.onProperty].domain[0]
			  ){
				  restriction["subject"] = iri;
			      restrictions.push(restriction);
			  }

		  }
	  }

	  for(let r = 0; r < cls.complementOf.length; r++){
		  let complement = {
			  subject:iri,
			  object:cls.complementOf[r]
		  }
		 complementOf.push(complement);

	  }

	  ontology.complementOf = complementOf;

	  for(let dp = 0; dp < cls.dataProperties.length; dp++){
		  let equivelentResult = [];
		  let superResult = [];
		  let disjointResult = [];
		  let dataProperty = ontology.dataProperties[cls.dataProperties[dp]];
		  for(let sc = 0; sc < dataProperty.superProperties.length; sc++){
			let superProperty = dataProperty.superProperties[sc];
			const propertyValue = ontology.dataProperties[superProperty]?.prefixed || iriToPrefixed(superProperty, ontologyPrefixes);

			if (propertyValue) {
				superResult.push({
				  name: "super",
				  value: propertyValue,
				  input: "\u2286"+propertyValue,

				});
			}

		  }
		  for(let dc = 0; dc < dataProperty.disjointProperties.length; dc++){
			let disjointProperty = dataProperty.disjointProperties[dc];
			const propertyValue = ontology.dataProperties[disjointProperty]?.prefixed || iriToPrefixed(disjointProperty, ontologyPrefixes);

			if (propertyValue) {
				disjointResult.push({
				  name: "disjoint",
				  value: propertyValue,
				  input: "\u27C2"+propertyValue,

				});
			}
		  }
		  for(let ec = 0; ec < dataProperty.equivalentProperties.length; ec++){
			let equivalentProperty = dataProperty.equivalentProperties[ec];
			const propertyValue = ontology.dataProperties[equivalentProperty]?.prefixed || iriToPrefixed(equivalentProperty, ontologyPrefixes);
			if (propertyValue) {
				equivelentResult.push({
				  name: "equivalent",
				  value: propertyValue,
				  input: "\u2261"+propertyValue,

				});
			}
		  }

		let equivalentProperties = `${equivelentResult.map(item => item.input).join(', ')}`;
		let superProperties = `${superResult.map(item => item.input).join(', ')}`;
		let disjointProperties = `${disjointResult.map(item => item.input).join(', ')}`;
		let ch = dataProperty.characteristics;
		let multiplicity = dataProperty.multiplicity || "";
		let functionalProperty = "false";
		if(ch.FunctionalProperty) functionalProperty = "true";

		let annotationsResult = [];
		if(dataProperty.label){
			let annotationType = "Label";
			let value = dataProperty.label;
			let language = "";
		  annotationsResult.push({
			  name: "Annotation",
			  annotationType,
			  value,
			  language,
			  input: value
			});
	   }
		for(let an = 0; an < dataProperty.annotations.length; an++){
		  let annotation = dataProperty.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";

		  if (value !== null && annotationType !== null) {
			annotationsResult.push({
			  name: "Annotation",
			  annotationType,
			  value,
			  language,
			  input: value
			});
		  }
	    }

		let annotationsInput = annotationsResult.map(item => {
		  const lang = item.language ? `@${item.language}` : '';
		  return `${item.annotationType} : ${item.value}${lang}`;
		}).join(', ');

		let attrName = dataProperty.prefixed || " ";
		cls.dataProperties[dp] = [
				  {name:"Name",value:attrName},
				  {name:"Type",value:getDatatypeLocalName(dataProperty.range[0]) || " "},
				  {name:"Multiplicity",value:multiplicity},
				  {name:"Annotation",input:annotationsInput, value:JSON.stringify(annotationsResult)},
				  {name:"IsFunctional",value:functionalProperty},
				  {name:"EquivalentProperties",input:equivalentProperties, value:JSON.stringify(equivelentResult)},
				  {name:"SuperProperties",input:superProperties, value:JSON.stringify(superResult)},
				  {name:"DisjointProperties",input:disjointProperties, value:JSON.stringify(disjointResult)}
				]
	  }

	  for(let sc = 0; sc < cls.superClasses.length; sc++){
		  let superClass = cls.superClasses[sc];

		  if(classes[superClass]){
			  if(!superClasses[superClass])  superClasses[superClass] = [];
			  superClasses[superClass].push(iri)

			  // cls.superClasses[sc] = [{name:"SuperClass",value:classes[superClass].prefixed}]
		  }


	  }
	  ontology.superClasses = superClasses;
	  for(let dc = 0; dc < cls.disjointWith.length; dc++){
		  let disjointClass = cls.disjointWith[dc];
		  disjointClasses.push([iri, disjointClass]);
		  // cls.disjointWith[dc] = [{name:"DisjointClass",value:classes[disjointClass].prefixed}];
	  }


	  for(let ec = 0; ec < cls.equivalentClasses.length; ec++){
		  let equivalentClass = cls.equivalentClasses[ec];
		  equivalentClasses.push([iri, equivalentClass]);
		  // cls.equivalentClasses[ec] = [{name:"EquivalentClass",value:classes[equivalentClass].prefixed}]

	  }
	//if parameter is graphical
		cls.disjointWith = [];
		cls.equivalentClasses = [];
		cls.superClasses = [];

	  for(let k = 0; k < cls.keys.length; k++){
		  let key = cls.keys[k];
		  let result = [];
		  for(let p = 0; p < key.length; p++){
			  let chain = key[p];
			  let chainValue;
			  if(chain.kind === "data") chainValue = ontology.dataProperties[chain.iri]?.prefixed || null;
			  else chainValue = ontology.objectProperties[chain.iri]?.prefixed || null;
			  if(chainValue !== null){
				  let chainInput = chainValue;
				  if(chain.inverse === true) chainInput = "inv("+ chainInput+")";
				  result.push(
					{
						name: "Key",
						value: chainValue,
						input: chainInput,
						delimiter: " + ",
						subCompartments: [
							{ name: "Property", value: chainValue, input: chainInput },
							{ name: "Inverse", value: chain.inverse, input: "" }
						]
					})
			  }

		  }

		  let chainProperties = `${result.map(item => item.input).join(' + ')}`;
		  cls.keys[k] = [{name:"Key",input:chainProperties, value:JSON.stringify(result)}]
	  }
	}
	const createdLinks = {};


	let di = groupDisjointClasses(differentIndivids);

	sameAsIndivids = groupDisjointClasses(sameAsIndivids);
	ontology.sameAsIndivids = sameAsIndivids;
	equivalentClasses = groupDisjointClasses(equivalentClasses);
	ontology.equivalentClasses = equivalentClasses;
	let dc = groupDisjointClasses(disjointClasses);
	ontology.allDisjointClasses = ontology.allDisjointClasses.concat(dc);

	// before the loop
	const objectProperties = ontology.objectProperties;

	let allDisjointProperties = ontology.allDisjointProperties;

	for (let dc = 0; dc < allDisjointProperties.length; dc++) {
	  const disjointProperties = allDisjointProperties[dc];
	  for (let c = 0; c < disjointProperties.length; c++) {
		for (let k = 0; k < disjointProperties.length; k++) {
		  if(k !== c && objectProperties[disjointProperties[c]]){
			  objectProperties[disjointProperties[c]]["disjointProperties"].push(disjointProperties[k])
		  }
		}
	  }
	}

	const handled = new Set(); // to skip creating a second link for the inverse partner



	// main loop
	for (const iri in objectProperties) {
	  if (handled.has(iri)) continue;

	  const ob = objectProperties[iri];
	  if (!(ob.domain?.length === 1 && ob.range?.length === 1)) continue;

	  // Detect an inverse partner with swapped domain/range
	  const invIri = Array.isArray(ob.inverseOf) && ob.inverseOf.length ? ob.inverseOf[0] : null;
	  let inv = null, collapseWithInverse = false;

	  if (invIri && objectProperties[invIri]) {
		inv = objectProperties[invIri];

		const obD = ob.domain[0], obR = ob.range[0];
		const invHasSingleDR = inv.domain?.length === 1 && inv.range?.length === 1;
		if (invHasSingleDR) {
		  const invD = inv.domain[0], invR = inv.range[0];
		  // same types, swapped positions
		  collapseWithInverse = (obD === invR) && (obR === invD);
		}
	  }

	  // Choose a primary to avoid creating two links (use lexicographic IRI order)
	  if (collapseWithInverse) {
		const primary = iri < invIri ? iri : invIri;
		const secondary = iri < invIri ? invIri : iri;

		if (iri !== primary) {
		  // The secondary one is skipped; the primary will create the link
		  handled.add(iri);

		  continue;
		}
		// Ensure we don't process secondary later
		handled.add(secondary);
		objectProperties[secondary].handled = true;
	  }


	  // createdLinks[iri] = cl;
	  for(let sp = 0; sp < ob.superProperties.length; sp++){
		ob.superProperties[sp] = [{ name: "SuperProperty", value: objectProperties[ob.superProperties[sp]]?.prefixed || iriToPrefixed(ob.superProperties[sp], ontologyPrefixes)}];
	  }

	  for(let dp = 0; dp < ob.disjointProperties.length; dp++){
		ob.disjointProperties[dp] = [{ name: "DisjointProperty", value: objectProperties[ob.disjointProperties[dp]]?.prefixed || iriToPrefixed(ob.disjointProperties[dp], ontologyPrefixes)}];
	  }

	  for(let ep = 0; ep < ob.equivalentProperties.length; ep++){
		ob.equivalentProperties[ep] = [{ name: "EquivalentProperty", value: objectProperties[ob.equivalentProperties[ep]]?.prefixed || iriToPrefixed(ob.equivalentProperties[ep], ontologyPrefixes)}];
	  }


	  for(let an = 0; an < ob.annotations.length; an++){
		  let annotation = ob.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			ob.annotations[an] = [
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
			]
		  }
	  }

	  for(let pc = 0; pc < ob.propertyChains.length; pc++){
		  let propertyChain = ob.propertyChains[pc];
		  let result = [];
		  for(let p = 0; p < propertyChain.length; p++){
			  let chain = propertyChain[p];
			  let chainValue = objectProperties[chain.iri]?.prefixed || null;
			  if(chainValue !== null){
				  let chainInput = chainValue;
				  if(chain.inverse === true) chainInput = "inv("+ chainInput+")";
				  result.push(
					{
						name: "PropertyChain",
						value: chainValue,
						input: chainInput,
						delimiter: " o ",
						subCompartments: [
							{ name: "Property", value: chainValue, input: chainInput },
							{ name: "Inverse", value: chain.inverse, input: "" }
						]
					})
			  }

		  }

		  let chainProperties = `${result.map(item => item.input).join(' o ')}`;
		  ob.propertyChains[pc] = [{name:"PropertyChain",input:chainProperties, value:JSON.stringify(result)}]
	  }

	  // If collapsing with inverse, record its info into *Inv compartments
	  if (collapseWithInverse && inv) {
		ob.prefixedInv = inv.prefixed;
		// CharacteristicsInv
	  if (inv.characteristics.FunctionalProperty)        ob.FunctionalPropertyInv = true;
	  if (inv.characteristics.InverseFunctionalProperty) ob.InverseFunctionalPropertyInv = true;
	  if (inv.characteristics.TransitiveProperty)        ob.TransitivePropertyInv = true;
	  if (inv.characteristics.SymmetricProperty)         ob.SymmetricPropertyInv = true;
	  if (inv.characteristics.AsymmetricProperty)        ob.AsymmetricPropertyInv = true;
	  if (inv.characteristics.ReflexiveProperty)         ob.ReflexivePropertyInv = true;
	  if (inv.characteristics.IrreflexiveProperty)       ob.IrreflexivePropertyInv = true;

		// MultiplicityInv (if you compute/display inverse multiplicity)
		if (inv.multiplicity) { ob.multiplicityInv = inv.multiplicity;}
		ob.superPropertiesInv = [];
		for (const sp of inv.superProperties || []) {
			ob.superPropertiesInv[sp] = [ { name: "SuperProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes) } ]
		}
		ob.disjointPropertiesInv = [];
		for (const sp of inv.disjointProperties || []) {
			ob.disjointPropertiesInv[sp] = [{ name: "DisjointProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes)}]
		}
		ob.equivalentPropertiesInv = [];
		for (const sp of inv.equivalentProperties || []) {
		  ob.equivalentPropertiesInv[sp] = [{ name: "EquivalentProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes) }]
		}

		if(inv.label){
		  ob.labelInv = [
				  {name:"AnnotationType",value:"Label"},
				  {name:"Value",value:inv.label},
				  {name:"Language",value:""},
		  ]
	    }
		ob.annotationsInv = [];
		for(let an = 0; an < inv.annotations.length; an++){
		  let annotation = inv.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			  ob.annotationsInv[an] = [
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				]
		  }
	    }
		ob.propertyChainsInv = [];
		for(let pc = 0; pc < inv.propertyChains.length; pc++){
		  let propertyChain = inv.propertyChains[pc];
		  let result = [];
		  for(let p = 0; p < propertyChain.length; p++){
			  let chain = propertyChain[p];
			  let chainValue = objectProperties[chain.iri]?.prefixed || null;
			  if(chainValue !== null){
				  let chainInput = chainValue;
				  if(chain.inverse === true) chainInput = "inv("+ chainInput+")";
				  result.push(
					{
						name: "PropertyChainInv",
						value: chainValue,
						input: chainInput,
						delimiter: " o ",
						subCompartments: [
							{ name: "Property", value: chainValue, input: chainInput },
							{ name: "Inverse", value: chain.inverse, input: "" }
						]
					})
			  }

		  }

		  let chainProperties = `${result.map(item => item.input).join(' o ')}`;
		  ob.propertyChainsInv[pc] = [{name:"PropertyChain",input:chainProperties, value:JSON.stringify(result)}]
	  }
	  }

		// objectProperties[iri] = ob;
	}

	restrictions = combineRestrictions(restrictions)
	ontology.restrictions = restrictions;

	let individuals = ontology.individuals;
	let objectPropertyAssertions = [];
	for (const iri in individuals) {
	  const individ = individuals[iri];

	  if(individ.types.length === 1) {
		const className = ontology.classes[individ.types[0]]?.prefixed || iriToPrefixed(individ.types[0], ontology.prefixes)
		individ.className = className
	  }


	 for(let an = 0; an < individ.annotations.length; an++){
		  let annotation = individ.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			individ.annotations[an] = [
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				]
		  }
	  }
	 let dataFacts = individ.dataFacts;
	 individ.dataPropertyAssertions = [];
	 individ.negativeDataPropertyAssertions = [];
	 individ.differentIndividuals = [];
	 individ.sameIndividuals = [];
	 for(let df = 0; df < dataFacts.length; df++){
		let dataFact = dataFacts[df];
		let dp = ontology.dataProperties[dataFact.p]?.prefixed || iriToPrefixed(dataFact.p, ontologyPrefixes);
		let t = getDatatypeLocalName(dataFact.dt);
		let value = dataFact.value;
		let lang = dataFact.lang;
		let negative = dataFact.negative

		if(dp || value){
			if (!negative){
				individ.dataPropertyAssertions.push([
			   {name:"Property",value:dp},
			   {name:"Value",value:value},
				{name:"Type",value:t}])
			} else {
				individ.negativeDataPropertyAssertions.push([
			   {name:"Property",value:dp},
			   {name:"Value",value:value},
				{name:"Type",value:t}])
			}
		}
	 }
	 let objFacts = individ.objFacts;
	 for(let df = 0; df < objFacts.length; df++){
		let objFact = objFacts[df];
		let op = objFact.p;
		let ontologyPrefixes = ontology.prefixes;
		let ob = individuals[objFact.object]?.prefixed || iriToPrefixed(objFact.object, ontologyPrefixes);
		if(op || ob){

			if(op === "http://www.w3.org/2002/07/owl#differentFrom"){
				// differentIndivids.push([ob, iri]);
				individ.differentIndividuals.push([
					{name:"Individual",value:ob}])
			} else if(op === "http://www.w3.org/2002/07/owl#sameAs"){
				// sameAsIndivids.push([ob, iri]);
				individ.sameIndividuals.push([
					{name:"Individual",value:ob}])
					indiv.setHorizontalLine("HorizontalLine11");
			} else {
				let prefixedOP = ontology.objectProperties[op]?.prefixed || iriToPrefixed(op, ontologyPrefixes);
				objectPropertyAssertions.push({iri: op, source:iri, target:objFact.object, prefixed:prefixedOP, negative:objFact.negative})
			}
		}
	 }
	}
	ontology.objectPropertyAssertions = objectPropertyAssertions;
	return ontology;
}

async function visualizeOntology(ontology){
	console.log("OOOOOO", ontology)
	let prefixes = ontology.prefixes;
	let newPosition = { height: 150, width: 400, x: 10, y: 10};
	let pr = await Create_New_OWLGrEd_Element(newPosition, "Namespaces", false)
	for (const iri in prefixes) {
		if(iri === "") pr.setCompartmentValue("Dafault Namespace", prefixes[iri], "Default: <"+ prefixes[iri] + ">")
		else {
			await pr.addCompartmentSubCompartments2("Namespaces declarations",[
			{name:"Prefix",value:iri},
			{name:"Namespace",value:prefixes[iri]}
			])
		}
	}

	let classes = ontology.classes;
	let createdClasses = {};
	let restrictions = [];
	let complementOf = [];
	let superClasses = {};
	let disjointClasses = [];
	let equivalentClasses = [];
	let differentIndivids = [];
	let sameAsIndivids = [];
	let x = 300;
	let y = 300;
	for (const iri in classes) {
	  const cls = classes[iri];

	  newPosition = { height: 150, width: 150, x: x, y: y};
	  y = y + 20;
	  let cl = await Create_New_OWLGrEd_Element(newPosition, "Class", false)
	  cl.setCompartmentValue("Name", cls.prefixed, cls.prefixed)
	  createdClasses[iri] = cl;

	  if(cls.label){
		  await cl.addCompartmentSubCompartments2("Annotation",[
				  {name:"AnnotationType",value:"Label"},
				  {name:"Value",value:cls.label},
				  {name:"Language",value:""},
				])
	  }

	  for(let an = 0; an < cls.annotations.length; an++){
		  let annotation = cls.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			await cl.addCompartmentSubCompartments2("Annotation",[
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				])
		  }
	  }


	  for(let r = 0; r < cls.restrictions.length; r++){
		  let restriction = cls.restrictions[r];
		  // restriction some/only
		  if(restriction.allValuesFrom !== null || restriction.someValuesFrom !== null){
			  restriction["subject"] = iri;
			  restriction["onClass"] = restriction.someValuesFrom || restriction.allValuesFrom;
			  restrictions.push(restriction);
		  } else {
			  //object property cardinality
			  if(restriction.onClass !== null && restriction.onProperty !== null
			  && typeof classes[restriction.onClass] !== "undefined" && typeof ontology.objectProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.objectProperties[restriction.onProperty].domain[0] && restriction.onClass === ontology.objectProperties[restriction.onProperty].range[0]
			  ){
				let multiplicity = formatCardinalityRange(restriction);
				if(multiplicity !== null){
					ontology.objectProperties[restriction.onProperty].multiplicity = multiplicity;
				}
			  // data property cardinality
			  // }else if(restriction.onDataRange !== null && restriction.onProperty !== null
			  }else if(restriction.onProperty !== null
			  && typeof ontology.dataProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.dataProperties[restriction.onProperty].domain[0]
			  ){
				let multiplicity = formatCardinalityRange(restriction);
				if(multiplicity !== null){
					ontology.dataProperties[restriction.onProperty].multiplicity = multiplicity;
				}
			  }
			  //restriction cardinality
			  else if(restriction.onClass !== null && restriction.onProperty !== null
			  && typeof classes[restriction.onClass] !== "undefined" && typeof ontology.objectProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.objectProperties[restriction.onProperty].domain[0] && restriction.onClass !== ontology.objectProperties[restriction.onProperty].range[0]
			  ){
				  restriction["subject"] = iri;
			      restrictions.push(restriction);
			  }
			  //inverse restriction cardinality
			  else if(restriction.inverse === true && restriction.onClass !== null && restriction.onProperty !== null
			  && typeof classes[restriction.onClass] !== "undefined" && typeof ontology.objectProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.objectProperties[restriction.onProperty].range[0] && restriction.onClass === ontology.objectProperties[restriction.onProperty].domain[0]
			  ){
				  restriction["subject"] = iri;
			      restrictions.push(restriction);
			  }

		  }
	  }

	 for(let r = 0; r < cls.complementOf.length; r++){
		  let complement = {
			  subject:iri,
			  object:cls.complementOf[r]
		  }
		 complementOf.push(complement);

	  }
	  let ontologyPrefixes = ontology.prefixes;
	  for(let dp = 0; dp < cls.dataProperties.length; dp++){
		  let equivelentResult = [];
		  let superResult = [];
		  let disjointResult = [];
		  let dataProperty = ontology.dataProperties[cls.dataProperties[dp]];
		  for(let sc = 0; sc < dataProperty.superProperties.length; sc++){
			let superProperty = dataProperty.superProperties[sc];
			const propertyValue = ontology.dataProperties[superProperty]?.prefixed || iriToPrefixed(superProperty, ontologyPrefixes);

			if (propertyValue) {
				superResult.push({
				  name: "super",
				  value: propertyValue,
				  input: "\u2286"+propertyValue,

				});
			}

		  }
		  for(let dc = 0; dc < dataProperty.disjointProperties.length; dc++){
			let disjointProperty = dataProperty.disjointProperties[dc];
			const propertyValue = ontology.dataProperties[disjointProperty]?.prefixed || iriToPrefixed(disjointProperty, ontologyPrefixes);

			if (propertyValue) {
				disjointResult.push({
				  name: "disjoint",
				  value: propertyValue,
				  input: "\u27C2"+propertyValue,

				});
			}
		  }
		  for(let ec = 0; ec < dataProperty.equivalentProperties.length; ec++){
			let equivalentProperty = dataProperty.equivalentProperties[ec];
			const propertyValue = ontology.dataProperties[equivalentProperty]?.prefixed || iriToPrefixed(equivalentProperty, ontologyPrefixes);
			if (propertyValue) {
				equivelentResult.push({
				  name: "equivalent",
				  value: propertyValue,
				  input: "\u2261"+propertyValue,

				});
			}
		  }

		let equivalentProperties = `${equivelentResult.map(item => item.input).join(', ')}`;
		let superProperties = `${superResult.map(item => item.input).join(', ')}`;
		let disjointProperties = `${disjointResult.map(item => item.input).join(', ')}`;
		let ch = dataProperty.characteristics;
		let multiplicity = dataProperty.multiplicity || "";
		let functionalProperty = "false";
		if(ch.FunctionalProperty) functionalProperty = "true";

		let annotationsResult = [];
		if(dataProperty.label){
			let annotationType = "Label";
			let value = dataProperty.label;
			let language = "";
		  annotationsResult.push({
			  name: "Annotation",
			  annotationType,
			  value,
			  language,
			  input: value
			});
	   }
		for(let an = 0; an < dataProperty.annotations.length; an++){
		  let annotation = dataProperty.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";

		  if (value !== null && annotationType !== null) {
			annotationsResult.push({
			  name: "Annotation",
			  annotationType,
			  value,
			  language,
			  input: value
			});
		  }
	    }

		let annotationsInput = annotationsResult.map(item => {
		  const lang = item.language ? `@${item.language}` : '';
		  return `${item.annotationType} : ${item.value}${lang}`;
		}).join(', ');


		  let attrName = dataProperty.prefixed || " ";
		  await cl.addCompartmentSubCompartments2("Attributes",[
				  {name:"Name",value:attrName},
				  {name:"Type",value:getDatatypeLocalName(dataProperty.range[0]) || " "},
				  {name:"Multiplicity",value:multiplicity},
				  {name:"Annotation",input:annotationsInput, value:JSON.stringify(annotationsResult)},
				  {name:"IsFunctional",value:functionalProperty},
				  {name:"EquivalentProperties",input:equivalentProperties, value:JSON.stringify(equivelentResult)},
				  {name:"SuperProperties",input:superProperties, value:JSON.stringify(superResult)},
				  {name:"DisjointProperties",input:disjointProperties, value:JSON.stringify(disjointResult)}
				])

		  // await cl.addCompartmentSubCompartments2("Attributes",[
				  // {name:"Name",value:attrName},
				  // {name:"Type",value:getDatatypeLocalName(dataProperty.range[0]) || " "},
				  // {name:"Multiplicity",value:multiplicity},
				  // {name:"Annotation",input:"", value:"[]"},
				  // {name:"IsFunctional",value:functionalProperty},
				  // {name:"EquivalentProperties",input:"", value:"[]"},
				  // {name:"SuperProperties",input:superProperties, value:superProperties},
				  // {name:"DisjointProperties",input:"", value:"[]"}
				// ])
	  }
	  if(cls.dataProperties.length>0){
		 await cl.setHorizontalLine("HorizontalLine6")
	  }
	  for(let sc = 0; sc < cls.superClasses.length; sc++){
		  let superClass = cls.superClasses[sc];

		  if(classes[superClass]){
			  if(!superClasses[superClass])  superClasses[superClass] = [];
			  superClasses[superClass].push(iri)
		  }

		  // await cl.addCompartmentSubCompartments2("SuperClasses",[
				  // {name:"SuperClass",value:classes[superClass].prefixed}])
	  }
	  // if(cls.superClasses.length>0){
		 // await cl.setHorizontalLine("HorizontalLine3")
	  // }
	  for(let dc = 0; dc < cls.disjointWith.length; dc++){
		  let disjointClass = cls.disjointWith[dc];
		  disjointClasses.push([iri, disjointClass])
		  // await cl.addCompartmentSubCompartments2("DisjointClasses",[
				  // {name:"DisjointClass",value:classes[disjointClass].prefixed}])
	  }
	  // if(cls.disjointWith.length>0){
		 // await cl.setHorizontalLine("HorizontalLine4")
	  // }
	  for(let ec = 0; ec < cls.equivalentClasses.length; ec++){
		  let equivalentClass = cls.equivalentClasses[ec];
		  equivalentClasses.push([iri, equivalentClass])
		  // await cl.addCompartmentSubCompartments2("EquivalentClasses",[
				  // {name:"EquivalentClass",value:classes[equivalentClass].prefixed}])
	  }
	  if(cls.equivalentClasses.length>0){
		 await cl.setHorizontalLine("HorizontalLine2")
	  }
	  for(let k = 0; k < cls.keys.length; k++){
		  let key = cls.keys[k];
		  let result = [];
		  for(let p = 0; p < key.length; p++){
			  let chain = key[p];
			  let chainValue;
			  if(chain.kind === "data") chainValue = ontology.dataProperties[chain.iri]?.prefixed || null;
			  else chainValue = ontology.objectProperties[chain.iri]?.prefixed || null;
			  if(chainValue !== null){
				  let chainInput = chainValue;
				  if(chain.inverse === true) chainInput = "inv("+ chainInput+")";
				  result.push(
					{
						name: "Key",
						value: chainValue,
						input: chainInput,
						delimiter: " + ",
						subCompartments: [
							{ name: "Property", value: chainValue, input: chainInput },
							{ name: "Inverse", value: chain.inverse, input: "" }
						]
					})
			  }

		  }

		  let chainProperties = `${result.map(item => item.input).join(' + ')}`;
			await cl.addCompartmentSubCompartments2("Keys",[
				 {name:"Key",input:chainProperties, value:JSON.stringify(result)}
		 ])
	  }
	   if(cls.keys.length>0){
		 await cl.setHorizontalLine("HorizontalLine5")
	  }

	}
	const createdLinks = {};
	for (const iri in superClasses) {
		let subClasses = superClasses[iri];
		if(subClasses.length > 1){
		  newPosition = { height: 150, width: 150, x: x, y: y};
		  y = y + 20;
		  let horizontalFork = await Create_New_OWLGrEd_Element(newPosition, "HorizontalFork", false)
		  createdClasses[horizontalFork.obj._id] = horizontalFork;
		  const locLink2 = [x+50, y+150, x+50, y+350];
		  let genF = await Create_New_OWLGrEd_Element(locLink2, "GeneralizationToFork", true, horizontalFork, createdClasses[iri])
		  createdLinks[genF.obj._id] = genF;
		  for(let sc = 0; sc < subClasses.length; sc++){
			  const locLink = [x+50, y+150, x+50, y+350];
			  let cl = await Create_New_OWLGrEd_Element(locLink, "AssocToFork", true, createdClasses[subClasses[sc]], horizontalFork)
			  createdLinks[cl.obj._id] = cl;
		  }
		} else {
			 const locLink = [x+50, y+150, x+50, y+350];
			  let cl = await Create_New_OWLGrEd_Element(locLink, "Generalization", true, createdClasses[subClasses[0]], createdClasses[iri])
			  createdLinks[cl.obj._id] = cl;
		}
	}

	let di = groupDisjointClasses(differentIndivids)
	// ontology.allDifferent = ontology.allDifferent.concat(di)
	sameAsIndivids = groupDisjointClasses(sameAsIndivids)
	equivalentClasses = groupDisjointClasses(equivalentClasses)
	let dc = groupDisjointClasses(disjointClasses)
	ontology.allDisjointClasses = ontology.allDisjointClasses.concat(dc)

	// before the loop
	const objectProperties = ontology.objectProperties;

	let allDisjointProperties = ontology.allDisjointProperties;

	for (let dc = 0; dc < allDisjointProperties.length; dc++) {
	  const disjointProperties = allDisjointProperties[dc];
	  for (let c = 0; c < disjointProperties.length; c++) {
		for (let k = 0; k < disjointProperties.length; k++) {
		  if(k !== c && objectProperties[disjointProperties[c]]){
			  objectProperties[disjointProperties[c]]["disjointProperties"].push(disjointProperties[k])
		  }
		}
	  }
	}




	const handled = new Set(); // to skip creating a second link for the inverse partner

	// small helper to stamp characteristics with optional suffix ("", "Inv")
	function setCharacteristicsCompartments(cl, ch, suffix = "") {
	  if (!ch) return;
	  if (ch.FunctionalProperty)        cl.setCompartmentValueAuto("Functional" + suffix, "true");
	  if (ch.InverseFunctionalProperty) cl.setCompartmentValueAuto("InverseFunctional" + suffix, "true");
	  if (ch.TransitiveProperty)        cl.setCompartmentValueAuto("Transitive" + suffix, "true");
	  if (ch.SymmetricProperty)         cl.setCompartmentValueAuto("Symmetric" + suffix, "true");
	  if (ch.AsymmetricProperty)        cl.setCompartmentValueAuto("Asymmetric" + suffix, "true");
	  if (ch.ReflexiveProperty)         cl.setCompartmentValueAuto("Reflexive" + suffix, "true");
	  if (ch.IrreflexiveProperty)       cl.setCompartmentValueAuto("Irreflexive" + suffix, "true");
	}

	// main loop
	for (const iri in objectProperties) {
	  if (handled.has(iri)) continue;

	  const ob = objectProperties[iri];
	  if (!(ob.domain?.length === 1 && ob.range?.length === 1)) continue;

	  // Detect an inverse partner with swapped domain/range
	  const invIri = Array.isArray(ob.inverseOf) && ob.inverseOf.length ? ob.inverseOf[0] : null;
	  let inv = null, collapseWithInverse = false;

	  if (invIri && objectProperties[invIri]) {
		inv = objectProperties[invIri];

		const obD = ob.domain[0], obR = ob.range[0];
		const invHasSingleDR = inv.domain?.length === 1 && inv.range?.length === 1;
		if (invHasSingleDR) {
		  const invD = inv.domain[0], invR = inv.range[0];
		  // same types, swapped positions
		  collapseWithInverse = (obD === invR) && (obR === invD);
		}
	  }

	  // Choose a primary to avoid creating two links (use lexicographic IRI order)
	  if (collapseWithInverse) {
		const primary = iri < invIri ? iri : invIri;
		const secondary = iri < invIri ? invIri : iri;

		if (iri !== primary) {
		  // The secondary one is skipped; the primary will create the link
		  handled.add(iri);
		  continue;
		}
		// Ensure we don't process secondary later
		handled.add(secondary);
	  }

	  // Create the link for 'ob' (or for the primary in the pair)
	  const d = ob.domain[0], r = ob.range[0];
	  const locLink = [x + 50, y + 150, x + 50, y + 350];
	  const cl = await Create_New_OWLGrEd_Element(locLink, "Association", true, createdClasses[d], createdClasses[r]);

	  // Forward (normal) compartments
	  cl.setCompartmentValue("Name", ob.prefixed, ob.prefixed);
	  createdLinks[iri] = cl;

	  setCharacteristicsCompartments(cl, ob.characteristics, "");

	  if (ob.multiplicity) {
		cl.setCompartmentValueAuto("Multiplicity", ob.multiplicity);
	  }
	  let ontologyPrefixes = ontology.prefixes;
	  // Super / Disjoint / Equivalent (forward)
	  for (const sp of ob.superProperties || []) {
		await cl.addCompartmentSubCompartments2("SuperProperties", [
		  { name: "SuperProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes)}
		]);
	  }
	  for (const dp of ob.disjointProperties || []) {
		await cl.addCompartmentSubCompartments2("DisjointProperties", [
		  { name: "DisjointProperty", value: objectProperties[dp]?.prefixed || iriToPrefixed(dp, ontologyPrefixes)}
		]);
	  }
	  for (const ep of ob.equivalentProperties || []) {
		await cl.addCompartmentSubCompartments2("EquivalentProperties", [
		  { name: "EquivalentProperty", value: objectProperties[ep]?.prefixed || iriToPrefixed(ep, ontologyPrefixes) }
		]);
	  }

	   if(ob.label){
		  await cl.addCompartmentSubCompartments2("Annotation",[
				  {name:"AnnotationType",value:"Label"},
				  {name:"Value",value:ob.label},
				  {name:"Language",value:""},
				])
	  }

	  for(let an = 0; an < ob.annotations.length; an++){
		  let annotation = ob.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			await cl.addCompartmentSubCompartments2("Annotation",[
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				])
		  }
	  }

	  for(let pc = 0; pc < ob.propertyChains.length; pc++){
		  let propertyChain = ob.propertyChains[pc];
		  let result = [];
		  for(let p = 0; p < propertyChain.length; p++){
			  let chain = propertyChain[p];
			  let chainValue = objectProperties[chain.iri]?.prefixed || null;
			  if(chainValue !== null){
				  let chainInput = chainValue;
				  if(chain.inverse === true) chainInput = "inv("+ chainInput+")";
				  result.push(
					{
						name: "PropertyChain",
						value: chainValue,
						input: chainInput,
						delimiter: " o ",
						subCompartments: [
							{ name: "Property", value: chainValue, input: chainInput },
							{ name: "Inverse", value: chain.inverse, input: "" }
						]
					})
			  }

		  }

		  let chainProperties = `${result.map(item => item.input).join(' o ')}`;
			await cl.addCompartmentSubCompartments2("PropertyChains",[
				 {name:"PropertyChain",input:chainProperties, value:JSON.stringify(result)}
		 ])
	  }

	  // If collapsing with inverse, record its info into *Inv compartments
	  if (collapseWithInverse && inv) {
		// NameInv (the inverse property name)
		cl.setCompartmentValue("NameInv", inv.prefixed, inv.prefixed);

		// CharacteristicsInv
		setCharacteristicsCompartments(cl, inv.characteristics, "Inv");

		// MultiplicityInv (if you compute/display inverse multiplicity)
		if (inv.multiplicity) {
		  cl.setCompartmentValueAuto("MultiplicityInv", inv.multiplicity);
		}

		for (const sp of inv.superProperties || []) {
		  await cl.addCompartmentSubCompartments2("SuperPropertiesInv", [
		    { name: "SuperProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes) }
		  ]);
		}

		for (const sp of inv.disjointProperties || []) {
		  await cl.addCompartmentSubCompartments2("DisjointPropertiesInv", [
		    { name: "DisjointProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes)}
		  ]);
		}

		for (const sp of inv.equivalentProperties || []) {
		  await cl.addCompartmentSubCompartments2("EquivalentPropertiesInv", [
		    { name: "EquivalentProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes) }
		  ]);
		}

		if(inv.label){
		  await cl.addCompartmentSubCompartments2("AnnotationInv",[
				  {name:"AnnotationType",value:"Label"},
				  {name:"Value",value:inv.label},
				  {name:"Language",value:""},
				])
	    }
		for(let an = 0; an < inv.annotations.length; an++){
		  let annotation = inv.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			await cl.addCompartmentSubCompartments2("AnnotationInv",[
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				])
		  }
	    }
		for(let pc = 0; pc < inv.propertyChains.length; pc++){
		  let propertyChain = inv.propertyChains[pc];
		  let result = [];
		  for(let p = 0; p < propertyChain.length; p++){
			  let chain = propertyChain[p];
			  let chainValue = objectProperties[chain.iri]?.prefixed || null;
			  if(chainValue !== null){
				  let chainInput = chainValue;
				  if(chain.inverse === true) chainInput = "inv("+ chainInput+")";
				  result.push(
					{
						name: "PropertyChainInv",
						value: chainValue,
						input: chainInput,
						delimiter: " o ",
						subCompartments: [
							{ name: "Property", value: chainValue, input: chainInput },
							{ name: "Inverse", value: chain.inverse, input: "" }
						]
					})
			  }

		  }

		  let chainProperties = `${result.map(item => item.input).join(' o ')}`;
			await cl.addCompartmentSubCompartments2("PropertyChainsInv",[
				 {name:"PropertyChain",input:chainProperties, value:JSON.stringify(result)}
		 ])
	  }
	  }

	    const elem = Elements.findOne({_id: Session.get("activeElement")});
		const elemType = ElementTypes.findOne({name: "Association"});
		let assocStyles = elemType.styles;
		let style;

		if(collapseWithInverse){
			style = assocStyles.find(s => s.name === 'Association_both_end');
		} else {
			style = assocStyles.find(s => s.name === 'Association_direct');
		}
		// Example usage:
		style = flattenObjectToArray(style);
		cl.setCustomStyle(style);
	}

	restrictions = combineRestrictions(restrictions)

	let ontologyPrefixes = ontology.prefixes;
	for (const iri in restrictions) {
		if(typeof restrictions[iri] !== "function"){
		  const ob = restrictions[iri];

		  const locLink = [x+50, y+150, x+50, y+350];
		  let object;
		  let isAllValuesFrom = false;
		  if(ob.allValuesFrom !== null) {
			object = ob.allValuesFrom;
			isAllValuesFrom = true;
		  } else if(ob.someValuesFrom !== null) object = ob.someValuesFrom;
		  else object = ob.onClass;
		  if( ob.subject && object && createdClasses[ob.subject] && createdClasses[object]){
			  let cl = await Create_New_OWLGrEd_Element(locLink, "Restriction", true, createdClasses[ob.subject], createdClasses[object]);

			  let roleName = objectProperties[ob.onProperty].prefixed || iriToPrefixed(ob.onProperty, ontologyPrefixes);
			  let roleNameInput = roleName;
			  if(ob.inverse) {
				cl.setCompartmentValueAuto("IsInverse", "true");
				roleNameInput = "inverse("+ roleNameInput + ")";
			  }
			  cl.setCompartmentValue("Role", roleName, roleNameInput);
			  createdLinks[iri] = cl;

			  if(ob.allValuesFrom) cl.setCompartmentValueAuto("Only", "true");
			  if(ob.someValuesFrom) cl.setCompartmentValueAuto("Some", "true")



			  let multiplicity = formatCardinalityRange(ob);
			  if(multiplicity !== null && multiplicity !== "0..*"){
				cl.setCompartmentValueAuto("Multiplicity", multiplicity);
			  }
		  }
		}
	}

	// complementOf
	for (const iri in complementOf) {
		if(typeof complementOf[iri] !== "function"){
		  const ob = complementOf[iri];

		  const locLink = [x+50, y+150, x+50, y+350];
		  let object;
		  let cl = await Create_New_OWLGrEd_Element(locLink, "ComplementOf", true, createdClasses[ob.subject], createdClasses[ob.object])
		  createdLinks[iri] = cl;
		}
	}

	let individuals = ontology.individuals;
	let objectPropertyAssertions = [];
	for (const iri in individuals) {
	  const individ = individuals[iri];

	  newPosition = { height: 150, width: 150, x: x, y: y};
	  y = y + 20;
	  let indiv = await Create_New_OWLGrEd_Element(newPosition, "Object", false)
	  indiv.setCompartmentValue("Name", individ.prefixed, individ.prefixed)
	  createdClasses[iri] = indiv;
	  if(individ.types.length === 1) {
		const className = ontology.classes[individ.types[0]]?.prefixed || iriToPrefixed(individ.types[0], ontology.prefixes)
		indiv.setCompartmentValue("ClassName", className, ": "+className)
	  }

	  if(individ.label){
		  await indiv.addCompartmentSubCompartments2("Annotation",[
				  {name:"AnnotationType",value:"Label"},
				  {name:"Value",value:individ.label},
				  {name:"Language",value:""},
				])
	  }
	 for(let an = 0; an < individ.annotations.length; an++){
		  let annotation = individ.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			await indiv.addCompartmentSubCompartments2("Annotation",[
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				])
		  }
	  }
	 let dataFacts = individ.dataFacts;
	 for(let df = 0; df < dataFacts.length; df++){
		let dataFact = dataFacts[df];
		let dp = ontology.dataProperties[dataFact.p]?.prefixed || iriToPrefixed(dataFact.p, ontologyPrefixes);
		let t = getDatatypeLocalName(dataFact.dt);
		let value = dataFact.value;
		let lang = dataFact.lang;
		let negative = dataFact.negative
		if(dp || value){
			if (!negative){
				await indiv.addCompartmentSubCompartments2("DataPropertyAssertion",[
			   {name:"Property",value:dp},
			   {name:"Value",value:value},
				{name:"Type",value:t}])
				indiv.setHorizontalLine("HorizontalLine10");
			} else {
				await indiv.addCompartmentSubCompartments2("NegativeDataPropertyAssertion",[
			   {name:"Property",value:dp},
			   {name:"Value",value:value},
				{name:"Type",value:t}])
				indiv.setHorizontalLine("HorizontalLine9");
			}
		}
	 }
	 let objFacts = individ.objFacts;
	 for(let df = 0; df < objFacts.length; df++){
		let objFact = objFacts[df];
		// let op = ontology.objectProperties[objFact.p].prefixed;
		let op = objFact.p;
		let ontologyPrefixes = ontology.prefixes;
		let ob = individuals[objFact.object]?.prefixed || iriToPrefixed(objFact.object, ontologyPrefixes);
		if(op || ob){

			if(op === "http://www.w3.org/2002/07/owl#differentFrom"){
				differentIndivids.push([ob, iri]);
				await indiv.addCompartmentSubCompartments2("DifferentIndividuals",[
					{name:"Individual",value:ob}])
				indiv.setHorizontalLine("HorizontalLine11");
			} else if(op === "http://www.w3.org/2002/07/owl#sameAs"){
				sameAsIndivids.push([ob, iri]);
				await indiv.addCompartmentSubCompartments2("SameIndividuals",[
					{name:"Individual",value:ob}])
					indiv.setHorizontalLine("HorizontalLine11");
			// } else if(typeof ontology.objectProperties[op] !== "undefined"){
				// objectPropertyAssertions.push({iri: op, source:iri, target:objFact.object, prefixed:ontology.objectProperties[op].prefixed, negative:objFact.negative})
			} else {
				let prefixedOP = ontology.objectProperties[op]?.prefixed || iriToPrefixed(op, ontologyPrefixes);
				objectPropertyAssertions.push({iri: op, source:iri, target:objFact.object, prefixed:prefixedOP, negative:objFact.negative})
			}
		}
	 }
	}


	for (const iri in objectPropertyAssertions) {
		if(typeof objectPropertyAssertions[iri] !== "function"){
		  const ob = objectPropertyAssertions[iri];

		  const locLink = [x+50, y+150, x+50, y+350];
		  let cl = await Create_New_OWLGrEd_Element(locLink, "LinkObject", true, createdClasses[ob.source], createdClasses[ob.target])
		  let propertyInput = ob.prefixed;
		  if(ob.negative === true){
			cl.setCompartmentValueAuto("IsNegativeAssertion", "true");
			propertyInput = "\u27C2"+propertyInput;
		  }

		  cl.setCompartmentValue("Property", ob.prefixed, propertyInput)
		  createdLinks[iri] = cl;

		 const elemType = ElementTypes.findOne({name: "LinkObject"});
		 let assocStyles = elemType.styles;
		 let style = assocStyles.find(s => s.name === 'Link_direct');

		 // Example usage:
		 style = flattenObjectToArray(style);
		 cl.setCustomStyle(style);
	  }
	}

	let annotationProperties = ontology.annotationProperties;

	for (const iri in annotationProperties) {
	  const annotationProperty = annotationProperties[iri];

	  newPosition = { height: 150, width: 150, x: x, y: y};
	  y = y + 20;
	  let annotProp = await Create_New_OWLGrEd_Element(newPosition, "AnnotationProperty", false)
	  annotProp.setCompartmentValue("Name", annotationProperty.prefixed, annotationProperty.prefixed)
	  createdClasses[iri] = annotProp;
	  let ontologyPrefixes = ontology.prefixes;
	  if(annotationProperty.domain.length === 1){
		let domain = ontology.classes[annotationProperty.domain[0]]?.prefixed || iriToPrefixed(annotationProperty.domain[0], ontologyPrefixes);
		annotProp.setCompartmentValue("Domain", domain, "Domain: " + domain)
	  }
	  if(annotationProperty.range.length === 1){
		if(typeof ontology.classes[annotationProperty.range[0]] !== "undefined") annotProp.setCompartmentValue("Range", ontology.classes[annotationProperty.range[0]].prefixed, "Range: " + ontology.classes[annotationProperty.range[0]].prefixed)
		else {
			let rangeType = getDatatypeLocalName(annotationProperty.range[0]) || iriToPrefixed(annotationProperty.range[0], ontologyPrefixes) ;
			annotProp.setCompartmentValue("Range", rangeType, "Range: " + rangeType)
		}
	  }

	  for (const sp of annotationProperty.superProperties || []) {
		  await annotProp.addCompartmentSubCompartments2("SuperProperties", [
		    { name: "SuperProperty", value: annotationProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes) }
		  ]);
		}

	 if(annotationProperty.superProperties.length>0){
		 await annotProp.setHorizontalLine("HorizontalLine7")
		 await annotProp.setHorizontalLine("HorizontalLine8")
	  }

	   if(annotationProperty.label){
		  await annotProp.addCompartmentSubCompartments2("Annotation",[
				  {name:"AnnotationType",value:"Label"},
				  {name:"Value",value:annotationProperty.label},
				  {name:"Language",value:""},
				])
	  }

	  for(let an = 0; an < annotationProperty.annotations.length; an++){
		  let annotation = annotationProperty.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			await annotProp.addCompartmentSubCompartments2("Annotation",[
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				])
		  }
	  }
	}

	let dataTypes = ontology.dataTypes;

	for (const iri in dataTypes) {
	  const dataType = dataTypes[iri];

	  newPosition = { height: 150, width: 150, x: x, y: y};
	  y = y + 20;
	  let dt = await Create_New_OWLGrEd_Element(newPosition, "DataType", false)
	  dt.setCompartmentValue("Name", dataType.prefixed, dataType.prefixed)
	  createdClasses[iri] = dt;

	  if(dataType.base !== null) dt.setCompartmentValue("DataTypeDefinition", getDatatypeLocalName(dataType.base), getDatatypeLocalName(dataType.base))

	  for(let an = 0; an < dataType.annotations.length; an++){
		  let annotation = dataType.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			await dt.addCompartmentSubCompartments2("Annotation",[
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				])
		  }
	  }
	}

	let allDisjointClasses = ontology.allDisjointClasses;

	for (let dc = 0; dc < allDisjointClasses.length; dc++) {
	  const disjointClasses = allDisjointClasses[dc];
	  if(disjointClasses.length > 2){
		  newPosition = { height: 150, width: 150, x: x, y: y};
		  y = y + 20;
		  let dt = await Create_New_OWLGrEd_Element(newPosition, "DisjointClasses", false)
		  createdClasses[dt.obj._id] = dt;
		  for (let c = 0; c < disjointClasses.length; c++) {
			  if(createdClasses[disjointClasses[c]]){
				  const locLink = [x+50, y+150, x+50, y+350];
				  let cl = await Create_New_OWLGrEd_Element(locLink, "Line", true, dt, createdClasses[disjointClasses[c]])
				  createdLinks[cl.obj._id] = cl;
			  }
		  }
	  } else if(disjointClasses.length === 2 && createdClasses[disjointClasses[0]] && createdClasses[disjointClasses[1]]){
		  if(createdClasses[disjointClasses[0]] && createdClasses[disjointClasses[1]]){
			const locLink = [x+50, y+150, x+50, y+350];
			let cl = await Create_New_OWLGrEd_Element(locLink, "Disjoint", true, createdClasses[disjointClasses[0]], createdClasses[disjointClasses[1]])
			createdLinks[cl.obj._id] = cl;
		  }
	  }
	}


	for (let dc = 0; dc < equivalentClasses.length; dc++) {
	  const eqClasses = equivalentClasses[dc];
	  if(eqClasses.length > 2){
		  newPosition = { height: 150, width: 150, x: x, y: y};
		  y = y + 20;
		  let dt = await Create_New_OWLGrEd_Element(newPosition, "EquivalentClasses", false)
		  createdClasses[dt.obj._id] = dt;
		  for (let c = 0; c < eqClasses.length; c++) {
			  if(createdClasses[eqClasses[c]]){
				  const locLink = [x+50, y+150, x+50, y+350];
				  let cl = await Create_New_OWLGrEd_Element(locLink, "Line", true, dt, createdClasses[eqClasses[c]])
				  createdLinks[cl.obj._id] = cl;
			  }
		  }
	  } else if(eqClasses.length === 2 && createdClasses[eqClasses[0]] && createdClasses[eqClasses[1]]){
		const locLink = [x+50, y+150, x+50, y+350];
		let cl = await Create_New_OWLGrEd_Element(locLink, "EquivalentClass", true, createdClasses[eqClasses[0]], createdClasses[eqClasses[1]])
		createdLinks[cl.obj._id] = cl;
	  }
	}

	let allDifferent = ontology.allDifferent;

	for (let dc = 0; dc < allDifferent.length; dc++) {
	  const differentIndivids = allDifferent[dc];
	  if(differentIndivids.length > 2){
		  newPosition = { height: 150, width: 150, x: x, y: y};
		  y = y + 20;
		  let dt = await Create_New_OWLGrEd_Element(newPosition, "DifferentIndivids", false)
		  createdClasses[dt.obj._id] = dt;
		  for (let c = 0; c < differentIndivids.length; c++) {
			  if(createdClasses[differentIndivids[c]]){
				  const locLink = [x+50, y+150, x+50, y+350];
				  let cl = await Create_New_OWLGrEd_Element(locLink, "Line", true, dt, createdClasses[differentIndivids[c]])
				  createdLinks[cl.obj._id] = cl;
			  }
		  }
	  } else if(differentIndivids.length === 2 && createdClasses[differentIndivids[0]] && createdClasses[differentIndivids[1]]){
		const locLink = [x+50, y+150, x+50, y+350];
		let cl = await Create_New_OWLGrEd_Element(locLink, "DifferentIndivid", true, createdClasses[differentIndivids[0]], createdClasses[differentIndivids[1]])
		createdLinks[cl.obj._id] = cl;
	  }
	}

	let editor = Interpreter.editor;

		let element_list = editor.getElements();
		var boxes = [];
		var lines = [];
		for(let elem_id in createdClasses){
			let element  = element_list[createdClasses[elem_id].obj._id];
			boxes.push(element)
		}

		for(let elem_id in createdLinks){
			let element  = element_list[createdLinks[elem_id].obj._id];
			lines.push(element)
		}

		// console.log(boxes, lines)
		// await delay(1500);
		Interpreter.execute("ComputeLayout", [200, 200, boxes, lines]);

}

function combineRestrictions(restrictions) {
  if (!Array.isArray(restrictions) || restrictions.length === 0) return [];

  const keyOf = (r) => `${r.subject || ''}|${r.onProperty || ''}|${r.onClass || ''}`;

  // group by subject + onProperty + onClass
  const groups = new Map();
  for (const r of restrictions) {
    const k = keyOf(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }

  const out = [];

  for (const [key, arr] of groups) {
    if (arr.length === 1) {
      out.push(arr[0]);
      continue;
    }

    // collect exacts (value + type)
    const exacts = arr
      .map(r => {
        if (Number.isInteger(r.qualifiedCardinality)) {
          return { type: 'qualified', value: r.qualifiedCardinality, r };
        }
        if (Number.isInteger(r.cardinality)) {
          return { type: 'unqualified', value: r.cardinality, r };
        }
        return null;
      })
      .filter(Boolean);

    // rule: do not combine if there are DIFFERENT exact cardinalities
    if (exacts.length > 1) {
      const first = exacts[0];
      const conflict = exacts.some(e => e.value !== first.value || e.type !== first.type);
      if (conflict) {
        // push all as-is, unmerged
        out.push(...arr);
        continue;
      }
    }

    // start combined from a shallow clone of the first, then normalize/merge
    const base = { ...arr[0] };

    // helper to merge a numeric field by fn across all defined integers
    const pick = (field, reducer) => {
      const vals = arr.map(r => r[field]).filter(v => Number.isInteger(v));
      return vals.length ? vals.reduce(reducer) : null;
    };

    // helpers for agreement on fillers
    const agree = (field) => {
      const vals = arr.map(r => r[field]).filter(v => v !== null);
      if (vals.length === 0) return null;
      const first = vals[0];
      return vals.every(v => v === first) ? first : null;
    };

    // Build merged object
    const merged = {
      // identifiers
      subject: base.subject ?? null,
      onProperty: base.onProperty ?? null,
      onClass: base.onClass ?? null,
      onDataRange: base.onDataRange ?? null,

      // keep all source bnodes for traceability
      bnode: arr.map(r => r.bnode).filter(Boolean),

      // fillers: keep only if all non-null agree
      someValuesFrom: agree('someValuesFrom'),
      allValuesFrom:  agree('allValuesFrom'),
      hasValue:       agree('hasValue'),

      // exacts: prefer the one that exists in the group (qualified beats unqualified if both present & equal)
      cardinality: null,
      qualifiedCardinality: null,

      // mins: take MIN across present values (your rule)
      minCardinality:            pick('minCardinality',            (a, b) => Math.min(a, b)),
      minQualifiedCardinality:   pick('minQualifiedCardinality',   (a, b) => Math.min(a, b)),

      // maxs: take MAX across present values (your rule)
      maxCardinality:            pick('maxCardinality',            (a, b) => Math.max(a, b)),
      maxQualifiedCardinality:   pick('maxQualifiedCardinality',   (a, b) => Math.max(a, b)),
    };

    // set exact if present (we already ensured no conflict)
    if (exacts.length >= 1) {
      // prefer qualified over unqualified if both present and equal
      const hasQualified = exacts.find(e => e.type === 'qualified');
      if (hasQualified) {
        merged.qualifiedCardinality = hasQualified.value;
      } else {
        merged.cardinality = exacts[0].value;
      }
    }

    out.push(merged);
  }

  return out;
}



function getDatatypeLocalName(iri) {
  if (!iri) return null;

  const builtInDatatypePrefixes = {
    "http://www.w3.org/2000/01/rdf-schema#": [
      "Literal"
    ],
    "http://www.w3.org/2001/XMLSchema#": [
      "NCName", "NMTOKEN", "Name", "anyURI", "base64Binary", "boolean",
      "byte", "dateTime", "dateTimeStamp", "decimal", "double", "float",
      "hexBinary", "int", "integer", "language", "long", "negativeInteger",
      "nonNegativeInteger", "nonPositiveInteger", "normalizedString",
      "positiveInteger", "short", "string", "token", "unsignedByte",
      "unsignedInt", "unsignedLong", "unsignedShort", "date", "time"
    ],
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": [
      "PlainLiteral", "XMLLiteral"
    ],
    "http://www.w3.org/2002/07/owl#": [
      "rational", "real"
    ]
  };

  // Find which prefix matches
  for (const [prefix, names] of Object.entries(builtInDatatypePrefixes)) {
    if (iri.startsWith(prefix)) {
      const localName = iri.substring(prefix.length);
      if (names.includes(localName)) {
        return localName;
      }
    }
  }

  return null; // or iri if you prefer returning unchanged
}

// Returns a string like "0..n", "1..*", or "n..m"
function formatCardinalityRange(restriction) {
  // 1) Exact cardinality dominates (qualified preferred)
  const exact =
    (Number.isInteger(restriction.qualifiedCardinality) ? restriction.qualifiedCardinality : null) ??
    (Number.isInteger(restriction.cardinality) ? restriction.cardinality : null);

  if (exact !== null) {
    return exact;
  }

  // 2) Otherwise use min/max (qualified preferred)
  let min =
    (Number.isInteger(restriction.minQualifiedCardinality) ? restriction.minQualifiedCardinality : null) ??
    (Number.isInteger(restriction.minCardinality) ? restriction.minCardinality : null);

  let max =
    (Number.isInteger(restriction.maxQualifiedCardinality) ? restriction.maxQualifiedCardinality : null) ??
    (Number.isInteger(restriction.maxCardinality) ? restriction.maxCardinality : null);

  // 3) Existential-style fillers imply at least 1
  //    - someValuesFrom(C) ⇒ ∃R.C ⇒ min ≥ 1
  //    - hasValue(v)       ⇒ ∃R.{v} ⇒ min ≥ 1
  // if ((restriction.someValuesFrom || restriction.hasValue) && (min === null || min < 1)) {
    // min = 1;
  // }

  // 4) Defaults for missing bounds
  if (min === null) min = 0;
  const maxStr = (max === null) ? '*' : String(max);

  return `${min}..${maxStr}`;
  // return null;
}

// Read an RDF list (rdf:first/rest ... rdf:nil) into an array of terms
function parseRdfList(store, head) {
  const RDF_FIRST = namedNode(RDF + 'first');
  const RDF_REST  = namedNode(RDF + 'rest');
  const RDF_NIL   = namedNode(RDF + 'nil');

  const out = [];
  let cur = head;

  // If it's not a BNode, treat as single-item list
  if (cur.termType !== 'BlankNode') return [cur];

  // defensive loop breaker
  const seen = new Set();

  while (cur && cur.termType === 'BlankNode' && !seen.has(cur.value)) {
    seen.add(cur.value);

    const first = store.getQuads(cur, RDF_FIRST, null, null)[0]?.object;
    if (!first) break;
    out.push(first);

    const rest = store.getQuads(cur, RDF_REST, null, null)[0]?.object;
    if (!rest || (rest.termType === 'NamedNode' && rest.value === RDF_NIL.value)) break;
    cur = rest;
  }
  return out;
}

// Map a key item term into { iri, inverse, kind }
// - Supports [ owl:inverseOf :p ] for inverse object properties
// - 'kind' ∈ {'object','data',null}; we try best-effort using known buckets/flags
function parseKeyItem(store, term, state) {
  if (!term) return null;

  // Inverse form: [ owl:inverseOf :p ]
  if (term.termType === 'BlankNode') {
    const inv = store.getQuads(term, namedNode(OWL + 'inverseOf'), null, null)[0]?.object;
    if (inv && inv.termType === 'NamedNode') {
      // inverse only makes sense for object properties
      return { iri: inv.value, inverse: true, kind: 'object' };
    }
    return null; // unsupported blank node (ignore gracefully)
  }

  if (term.termType === 'NamedNode') {
    const iri = term.value;
    // Try to classify using what we know so far
    const isOP = state.isObjectProp?.has?.(iri) || !!state.objectProperties[iri];
    const isDP = state.isDataProp?.has?.(iri)   || !!state.dataProperties[iri];
    const kind = isOP ? 'object' : (isDP ? 'data' : null);
    return { iri, inverse: false, kind };
  }

  return null;
}

// Map a chain "item" term to { iri, inverse } supporting [ owl:inverseOf :p ]
function parseChainItem(store, term) {
  if (!term) return null;
  if (term.termType === 'NamedNode') {
    return { iri: term.value, inverse: false };
  }
  if (term.termType === 'BlankNode') {
    // check for [ owl:inverseOf :p ]
    const inv = store.getQuads(term, namedNode(OWL + 'inverseOf'), null, null)[0]?.object;
    if (inv && inv.termType === 'NamedNode') {
      return { iri: inv.value, inverse: true };
    }
  }
  // unsupported form (e.g., nested expressions) — skip
  return null;
}

function getComplementTargetIri(store, bn) {
  if (!bn || bn.termType !== 'BlankNode') return null;

  // Must be a class expression with owl:complementOf some target
  const hasClassType =
    store.getQuads(bn, namedNode(RDF + 'type'), namedNode(OWL + 'Class'), null).length > 0;

  const compObj = store.getQuads(bn, namedNode(OWL + 'complementOf'), null, null)[0]?.object;
  if (!compObj) return null;

  // Prefer NamedNode target: owl:complementOf :C
  if (compObj.termType === 'NamedNode') return compObj.value;

  // Be tolerant if someone serialized as a literal IRI string (non-standard)
  if (compObj.termType === 'Literal') {
    const v = compObj.value?.trim();
    if (v && (v.startsWith('http://') || v.startsWith('https://'))) return v;
  }
  return null;
}

function flattenObjectToArray(obj, prefix = '') {
    let result = [];
    for (let key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        const value = obj[key];
        const attrName = prefix ? `${prefix}.${key}` : key;

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            result = result.concat(flattenObjectToArray(value, attrName));
        } else {
            result.push({ attrName, attrValue: value });
        }
    }
    return result;
}


function groupDisjointClasses(pairs) {
  // 1) Normalise pairs (unordered, no duplicates, no self-pairs)
  const edgeSet = new Set();
  const nodes = new Set();

  for (const [a, b] of pairs) {
    if (!a || !b || a === b) continue;
    const [x, y] = a < b ? [a, b] : [b, a];
    const key = x + '||' + y;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    nodes.add(x);
    nodes.add(y);
  }

  // 2) Build adjacency map
  const adj = new Map();
  for (const n of nodes) adj.set(n, new Set());
  for (const key of edgeSet) {
    const [x, y] = key.split('||');
    adj.get(x).add(y);
    adj.get(y).add(x);
  }

  // 3) Bron–Kerbosch algorithm for maximal cliques
  const cliques = [];

  function bronKerbosch(R, P, X) {
    if (P.size === 0 && X.size === 0) {
      if (R.size >= 2) {
        cliques.push(Array.from(R)); // one maximal disjoint group
      }
      return;
    }

    // simple pivot (first element of P ∪ X)
    const unionPX = new Set([...P, ...X]);
    const u = unionPX.values().next().value;
    const pWithoutNeighborsOfU = [...P].filter(v => !adj.get(u).has(v));

    for (const v of pWithoutNeighborsOfU) {
      const Nv = adj.get(v);
      bronKerbosch(
        new Set([...R, v]),
        new Set([...P].filter(x => Nv.has(x))),
        new Set([...X].filter(x => Nv.has(x)))
      );
      P.delete(v);
      X.add(v);
    }
  }

  bronKerbosch(new Set(), new Set(nodes), new Set());

  return cliques;
}

function useOntologyPrefixAsDefault(prefixes, ontologyIRI) {
  // 0. If empty prefix already exists, do nothing
  if (prefixes[""] !== undefined) return prefixes;

  // 1. Find prefix whose namespace matches ontology IRI
  let ontologyPrefix = null;

  for (const [p, ns] of Object.entries(prefixes)) {
    if (ontologyIRI.startsWith(ns)) {
      ontologyPrefix = p;
      break;
    }
  }

  if (!ontologyPrefix) return prefixes; // ontology prefix missing

  // 2. Move that prefix to the empty key
  const updated = { ...prefixes };

  updated[""] = updated[ontologyPrefix];
  delete updated[ontologyPrefix];

  return updated;
}

export {
  loadOntololgyN3OWLGrEd,
  loadOntololgyFromProjectN3OWLGrEd,
  loadOntololgyRDFLibOWLGrEd,
}
