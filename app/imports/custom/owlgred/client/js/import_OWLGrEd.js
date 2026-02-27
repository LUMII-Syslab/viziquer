import { Interpreter } from '../../../../client/lib/interpreter'

import { Elements, ElementTypes, Projects } from '/imports/db/platform/collections'
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
	let importSettings = await getImportParameters();
	ontology = await createOntologyStructure(ontology, importSettings);
	
	await Meteor.callAsync("importOntologyOWLGrEd", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")}, ontology, ontologyName, importSettings);
	// await visualizeOntology(ontology);
}


async function loadOntololgyFromProjectRDFLibOWLGrEd(ontologyText, ontologyName) {
  let ontology = await saveOntologyRDFlib(ontologyText);
  const importSettings = await getImportParameters();
  ontology = await createOntologyStructure(ontology, importSettings);

  await Meteor.callAsync(
    "importOntologyOWLGrEd",
    { projectId: Session.get("activeProject"), versionId: Session.get("versionId") },
    ontology,
    ontologyName,
    importSettings
  );
}


async function saveOntologyRDFlib(ontologyText) {
  // returns the same ontologyStructure shape as saveOntologyN3()
  return await Meteor.callAsync('loadOwlRDFLib', ontologyText);
}

// async function loadOntololgyRDFLibOWLGrEd(ontologyText, ontologyName) {
  // const ontology = await saveOntologyRDFlib(ontologyText);
  // await visualizeOntology(ontology);
// }

// async function loadOntololgyRDFLibOWLGrEd(ontologyText){
	// let ontology = saveOntologyRDFlib(ontologyText);
// }

// async function saveOntologyRDFlib(ontologyText){
	// Meteor.call('loadOwlRDFLib', ontologyText, (err, result) => {
	  // if (err) {
		  // console.error('Error generating:', err);
		  // return;
		// }

		// visualizeOntology(result);

	// });
// }

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

	routeTriplesN3(store, ontologyStructure, prefixes)

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
  const rdfType = namedNode(RDF + "type");
const owlOntology = namedNode(OWL + "Ontology");

 // collect all ontology subject nodes (can be NamedNode OR BlankNode)
	const ontologySubjects = new Set(
	  store.getQuads(null, rdfType, owlOntology, null).map(q => q.subject.id) // .id works for NamedNode/BlankNode
	);
  // Include subjects that are not schema entities
  for (const q of store.getQuads(null, null, null, null)) {
	  const s = q.subject;
	  const o = q.object;

	  // if subject is the ontology node (including _:n0), skip
	  if (ontologySubjects.has(s.id)) continue;

	  if (s.termType === "NamedNode") {
		const sIri = s.value;

		// object might not be a NamedNode (Literal/BlankNode), so guard it
		const oIri = (o.termType === "NamedNode") ? o.value : null;

		// also optional: skip rdf:type owl:Ontology triples (already covered by ontologySubjects check)
		if (!isAlreadySchemaEntity(sIri) && !state.individuals[sIri]) {
		  state.individuals[sIri] = {
			...makeEntity(sIri, "Individual"),
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

  
    // Remove a single pair of outer parentheses ONLY if they wrap the whole expression
  // (OWLGrEd text compartments want no outer "(...)")
  const stripOuterParens = (s) => {
    if (!s) return s;
    let t = String(s).trim();
    if (t.length < 2 || t[0] !== '(' || t[t.length - 1] !== ')') return t;

    let depth = 0;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      // if we closed the first '(' before the last char, outer parens don't wrap whole expr
      if (depth === 0 && i < t.length - 1) return t;
    }
    // outer parens wrap the whole string
    return t.slice(1, -1).trim();
  };

  // Create (or reuse) an anonymous class bucket for a blank-node class expression.
  // Returns the synthetic IRI used as the class key.
  const ensureAnonClassForExpr = (bn, manExpr) => {
    const expr = stripOuterParens(manExpr);

    // Reuse an existing anonymous class if the same expression was already seen
    if (expr) {
      if (state.anonClassByExpr instanceof Map && state.anonClassByExpr.has(expr)) {
        const existingIri = state.anonClassByExpr.get(expr);
        const existing = state.classes[existingIri];
        if (existing) {
          (existing.equivalentClassExpressions ||= []);
          if (!existing.equivalentClassExpressions.includes(expr)) existing.equivalentClassExpressions.push(expr);
          return existingIri;
        }
      }

      // Backward-safe fallback: scan existing classes (in case anonClassByExpr wasn't populated yet)
      for (const iri of Object.keys(state.classes)) {
        const c = state.classes[iri];
        if (!c) continue;
        if (c.prefixed === '' && Array.isArray(c.equivalentClassExpressions) && c.equivalentClassExpressions.includes(expr)) {
          if (state.anonClassByExpr instanceof Map) state.anonClassByExpr.set(expr, iri);
          return iri;
        }
      }
    }

    // Otherwise create a new anonymous class bucket keyed by this blank node
    const anonIri = `_:${bn.value}`;
    if (!state.classes[anonIri]) {
      state.classes[anonIri] = {
        iri: anonIri,
        prefixed: "",          // no printable name; shows as unnamed class in diagram
        label: null,
        comment: null,
        annotations: [],
        kind: 'Class',
        superClasses: [],
        equivalentClasses: [],
        disjointWith: [],
        restrictions: [],
        keys: [],
        objectProperties: [],
        dataProperties: [],
        complementOf: [],
        instances: []
      };
    }

    const cls = state.classes[anonIri];
    if (expr) {
      (cls.equivalentClassExpressions ||= []);
      if (!cls.equivalentClassExpressions.includes(expr)) cls.equivalentClassExpressions.push(expr);
      if (state.anonClassByExpr instanceof Map) state.anonClassByExpr.set(expr, anonIri);
    }

    return anonIri;
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


    // Individual rdf:type to an anonymous class expression: :ind a [ ... ] .
    if (p.value === RDF + 'type' && s.termType === 'NamedNode' && o.termType === 'BlankNode' && state.individuals[s.value]) {
      const man = serializeClassExpressionForUI(store, o, prefixes);
      if (man) {
        const anonIri = ensureAnonClassForExpr(o, man);
        const ind = state.individuals[s.value];
        (ind.types ||= []);
        if (!ind.types.includes(anonIri)) ind.types.push(anonIri);
        const cls = state.classes[anonIri];
        if (cls) {
          (cls.instances ||= []);
          if (!cls.instances.includes(s.value)) cls.instances.push(s.value);
        }
      }
      continue;
    }

    // Class axioms

    // Class axioms where the SUBJECT is an anonymous class-expression bnode.
    // We materialize it as a no-name class bucket whose EquivalentClasses text contains the Manchester expression,
    // and then attach subclass axioms/restrictions to that bucket.
    if (p.value === RDFS + 'subClassOf' && s.termType === 'BlankNode') {
      // Ignore the rare case where the subject itself is a Restriction bnode; OWLGrEd treats restrictions as lines, not classes.
      const subjIsRestriction = parseRestriction(store, s);
      if (subjIsRestriction) continue;

      const subjMan = serializeClassExpressionForUI(store, s, prefixes);
      const subjIri = subjMan ? ensureAnonClassForExpr(s, subjMan) : `_:${s.value}`;
      if (!state.classes[subjIri]) {
        state.classes[subjIri] = {
          iri: subjIri,
          prefixed: "",
          label: null,
          comment: null,
          annotations: [],
          kind: 'Class',
          superClasses: [],
          equivalentClasses: [],
          disjointWith: [],
          restrictions: [],
          keys: [],
          objectProperties: [],
          dataProperties: [],
          complementOf: [],
          instances: []
        };
      }

      const cls = state.classes[subjIri];

      if (o.termType === 'NamedNode') {
        (cls.superClasses ||= []).push(o.value);
      } else if (o.termType === 'BlankNode') {
        const r = parseRestriction(store, o);
        if (r) {
          (cls.restrictions ||= []).push(r);
        } else {
          const man = serializeClassExpressionForUI(store, o, prefixes);
          if (man) (cls.superClassExpressions ||= []).push(stripOuterParens(man));
        }
      }
      continue;
    }

    if (p.value === RDFS + 'subClassOf' && s.termType === 'NamedNode') {
	  const cls = state.classes[s.value];
	  if (cls) {
		if (o.termType === 'NamedNode') {
		  cls.superClasses.push(o.value);
		} else if (o.termType === 'BlankNode') {
		  // Prefer restriction parsing (used for graphical restrictions/multiplicities)
		  const r = parseRestriction(store, o);
		  if (r) {
			(cls.restrictions ||= []).push(r);
		  } else {
			// Otherwise try full class-expression import (intersection/union/oneOf/complement/restriction-as-text)
			const man = serializeClassExpressionForUI(store, o, prefixes);
			if (man) (cls.superClassExpressions ||= []).push(stripOuterParens(man));
			else     (cls.restrictions ||= []).push({ bnode: `_:${o.value}`, raw: true });
		  }
		}
	  }
	  continue;
	}


	  // Extended equivalentClass handling where SUBJECT is an anonymous class-expression bnode
	  if (p.value === OWL + 'equivalentClass' && s.termType === 'BlankNode') {
		  const subjIsRestriction = parseRestriction(store, s);
		  if (subjIsRestriction) continue;
		  const subjMan = serializeClassExpressionForUI(store, s, prefixes);
		  if (!subjMan) continue;
		  const subjIri = ensureAnonClassForExpr(s, subjMan);
		  const cls = state.classes[subjIri];

		  if (o.termType === 'NamedNode') {
			  (cls.equivalentClasses ||= []).push(o.value);
		  } else if (o.termType === 'BlankNode') {
			  const target = getComplementTargetIri(store, o);
			  if (target) {
				  (cls.complementOf ||= []).push(target);
			  } else {
				  const man = serializeClassExpressionForUI(store, o, prefixes);
				  if (man) (cls.equivalentClassExpressions ||= []).push(stripOuterParens(man));
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
				// Try full class-expression import for text compartments
				const man = serializeClassExpressionForUI(store, o, prefixes);
						if (man) (cls.equivalentClassExpressions ||= []).push(stripOuterParens(man));
				// else ignore/keep raw
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
			  const man = serializeClassExpressionForUI(store, s, prefixes);
			  if (man) (cls.equivalentClassExpressions ||= []).push(stripOuterParens(man));
			}
		  } else if (s.termType === 'NamedNode') {
			// symmetric equivalentClass named↔named
			(cls.equivalentClasses ||= []).push(s.value);
		  }
		  continue;
		}
	  }
    
    // Datatype definitions (named rdfs:Datatype) via owl:equivalentClass to a datatype expression bnode
    if (p.value === OWL + 'equivalentClass') {
      // :D owl:equivalentClass _:bn
      if (s.termType === 'NamedNode' && state.dataTypes?.[s.value]) {
        const dtb = ensureDatatype(s.value);
        if (o.termType === 'NamedNode') {
          (dtb.equivalentDatatypes ||= []).push(o.value);
        } else if (o.termType === 'BlankNode') {
          const man = serializeDataRangeForUI(store, o, prefixes);
          if (man) dtb.definitionExpression = man;
        }
        continue;
      }

      // _:bn owl:equivalentClass :D
      if (o.termType === 'NamedNode' && state.dataTypes?.[o.value] && s.termType === 'BlankNode') {
        const dtb = ensureDatatype(o.value);
        const man = serializeDataRangeForUI(store, s, prefixes);
        if (man) dtb.definitionExpression = man;
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


// DisjointWith where SUBJECT is an anonymous class-expression bnode
if (p.value === OWL + 'disjointWith' && s.termType === 'BlankNode') {
  const subjIsRestriction = parseRestriction(store, s);
  if (subjIsRestriction) continue;
  const subjMan = serializeClassExpressionForUI(store, s, prefixes);
  if (!subjMan) continue;
  const subjIri = ensureAnonClassForExpr(s, subjMan);
  const cls = state.classes[subjIri];

  if (o.termType === 'NamedNode') {
    (cls.disjointWith ||= []).push(o.value);
  } else if (o.termType === 'BlankNode') {
    const man = serializeClassExpressionForUI(store, o, prefixes);
    if (man) (cls.disjointClassExpressions ||= []).push(stripOuterParens(man));
  }
  continue;
}

// DisjointWith with anonymous class expressions: keep as Manchester text (no graph links)
if (p.value === OWL + 'disjointWith') {
  // :A owl:disjointWith _:bnExpr
  if (s.termType === 'NamedNode' && o.termType === 'BlankNode') {
    const cls = state.classes[s.value];
    if (cls) {
      const man = serializeClassExpressionForUI(store, o, prefixes);
      if (man) (cls.disjointClassExpressions ||= []).push(stripOuterParens(man));
    }
    continue;
  }

  // _:bnExpr owl:disjointWith :A  (OWL disjointWith is symmetric, import onto the named class)
  if (o.termType === 'NamedNode' && s.termType === 'BlankNode') {
    const cls = state.classes[o.value];
    if (cls) {
      const man = serializeClassExpressionForUI(store, s, prefixes);
      if (man) (cls.disjointClassExpressions ||= []).push(stripOuterParens(man));
    }
    continue;
  }
}

	
	// Class keys where SUBJECT is an anonymous class-expression bnode
	if (p.value === OWL + 'hasKey' && s.termType === 'BlankNode') {
	  const subjIsRestriction = parseRestriction(store, s);
	  if (subjIsRestriction) continue;
	  const subjMan = serializeClassExpressionForUI(store, s, prefixes);
	  if (!subjMan) continue;
	  const subjIri = ensureAnonClassForExpr(s, subjMan);
	  const cls = state.classes[subjIri];

	  const items = parseRdfList(store, o);
	  const parsed = items
		.map(t => parseKeyItem(store, t, state))
		.filter(x => x && typeof x.iri === 'string');

	  if (parsed.length > 0) {
		(cls.keys ||= []).push(parsed);

		// Light ensure: create buckets for mentioned properties so later code can enrich them
		for (const it of parsed) {
		  if (it.kind === 'object' || (it.kind === null && !state.dataProperties[it.iri])) {
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
		  if (it.kind === 'object' || (it.kind === null && !state.dataProperties[it.iri])) {
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
    if (p.value === RDFS + 'domain' && s.termType === 'NamedNode') {
      // Named class domain
      if (o.termType === 'NamedNode') {
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

      // Anonymous class-expression domain: create an unnamed class node and attach expr as equivalent class
      if (o.termType === 'BlankNode') {
        const man = serializeClassExpressionForUI(store, o, prefixes);
        if (man) {
          const anonIri = ensureAnonClassForExpr(o, man);

          if (state.objectProperties[s.value]) state.objectProperties[s.value].domain.push(anonIri);
          if (state.dataProperties[s.value])   state.dataProperties[s.value].domain.push(anonIri);
          if (state.annotationProperties[s.value])  state.annotationProperties[s.value].domain.push(anonIri);

          const cls = state.classes[anonIri];
          if (cls) {
            if (state.isObjectProp.has(s.value)) cls.objectProperties.push(s.value);
            if (state.isDataProp.has(s.value))   cls.dataProperties.push(s.value);
          }
        }
        continue;
      }

      continue;
    }

    if (p.value === RDFS + 'range' && s.termType === 'NamedNode') {
      // ObjectProperty range: named class OR anonymous class expression
      if (state.objectProperties[s.value]) {
        if (o.termType === 'NamedNode') {
          state.objectProperties[s.value].range.push(o.value);
        } else if (o.termType === 'BlankNode') {
          const man = serializeClassExpressionForUI(store, o, prefixes);
          if (man) {
            const anonIri = ensureAnonClassForExpr(o, man);
            state.objectProperties[s.value].range.push(anonIri);
            const cls = state.classes[anonIri];
            if (cls) cls.objectProperties.push(s.value);
          }
        }
      }

      // DatatypeProperty range can be a named datatype OR a complex datatype expression bnode.
      if (state.dataProperties[s.value]) {
        if (o.termType === 'NamedNode' && isDatatype(o.value)) {
          state.dataProperties[s.value].range.push(o.value);
        } else if (o.termType === 'BlankNode') {
          const man = serializeDataRangeForUI(store, o, prefixes);
          if (man) state.dataProperties[s.value].rangeExpression = man;
        }
      }

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

    // Datatype base (owl:onDatatype)
    if (p.value === OWL + 'onDatatype' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
      const dtb = ensureDatatype(s.value);
      if (dtb) dtb.base = o.value;
      continue;
    }

    // Datatype restrictions list (owl:withRestrictions) for named datatypes (rare but easy to support)
    if (p.value === OWL + 'withRestrictions' && s.termType === 'NamedNode' && state.dataTypes?.[s.value]) {
      const dtb = ensureDatatype(s.value);
      if (dtb) {
        const items = parseRdfList(store, o);
        dtb.restrictions ||= [];
        for (const rTerm of items) {
          if (!rTerm || rTerm.termType !== 'BlankNode') continue;
          const quads = store.getQuads(rTerm, null, null, null);
          for (const q2 of quads) {
            const facet = XSD_FACET_TO_MANCHESTER[q2.predicate.value];
            if (!facet) continue;
            const vTxt = (q2.object.termType === 'Literal') ? literalToManchester(q2.object, prefixes)
                       : (q2.object.termType === 'NamedNode') ? iriToPrefixed(q2.object.value, prefixes)
                       : null;
            if (vTxt) {
              dtb.restrictions.push({ facet, value: vTxt });
              break;
            }
          }
        }
      }
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


async function createOntologyStructure(ontology, importSettings){
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
	
  // console.log("SSSSSSSSSSSSSSS", ontology, importSettings["showClasses"]);
  if((importSettings?.showOntoAnnotations ?? true) === true && ontology.ontology && ontology.ontology.annotations){
	  for(let an = 0; an < ontology.ontology.annotations.length; an++){
		  let annotation = ontology.ontology.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
				ontology.ontology.annotations[an] = [
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				]
		  }
	  }
  }
  
  if((importSettings?.showClasses ?? true) === true){
	for (const iri in classes) {
	  const cls = classes[iri];

	  if((importSettings?.showClassAnnotations ?? true) === true){
		let firstComment = false;
	    for(let an = 0; an < cls.annotations.length; an++){
		  let annotation = cls.annotations[an];
		  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
		  let value = annotation.v;
		  let language = annotation.lang || "";
		  if(value !== null && annotationType !== null){
			if((importSettings?.showClassAnnotationsEnableSpecComments ?? true) === true && annotationType === "comment" && firstComment === false){
				firstComment = true;
				cls.comment = value;
				delete cls.annotations[an];
			} else {
				cls.annotations[an] = [
				  {name:"AnnotationType",value:annotationType},
				  {name:"Value",value:value},
				  {name:"Language",value:language},
				]
			}
		  }
	    }
	  }
	  
	  if((importSettings?.showPropertyRestrictions ?? true) === true){
	    for(let r = 0; r < cls.restrictions.length; r++){
		  let restriction = cls.restrictions[r];
		  // restriction some/only
		  if(restriction.allValuesFrom !== null || restriction.someValuesFrom !== null){

			  // If this is a data-property restriction (or the filler is a datatype),
			  // represent it as a superclass expression:  pr only integer
			  const fillerIri = restriction.someValuesFrom || restriction.allValuesFrom;
			  const isDataProp = !!ontology.dataProperties?.[restriction.onProperty];
			  const fillerIsDatatype = termLooksLikeDatatypeIri(fillerIri) || !!ontology.dataTypes?.[fillerIri];

			  const mustBeTextExpr = isDataProp || fillerIsDatatype;

			  if(((importSettings?.showPropertyRestrictionsGraphically ?? true) === true) && !mustBeTextExpr){

				  restriction["subject"] = iri;
				  restriction["onClass"] = fillerIri;

				  if(iri === restriction["onClass"] && (importSettings?.showPropertyRestrictionsGraphicallyNoLineToSelf) === true){

				  } else restrictions.push(restriction);

			  } else {
				  // text expression
				  let onPropertyTxt = restriction.onProperty;

				  if(typeof ontology.objectProperties?.[onPropertyTxt] !== "undefined") onPropertyTxt = ontology.objectProperties[onPropertyTxt].prefixed;
				  else if(typeof ontology.dataProperties?.[onPropertyTxt] !== "undefined") onPropertyTxt = ontology.dataProperties[onPropertyTxt].prefixed;
				  else onPropertyTxt = iriToPrefixed(onPropertyTxt, ontologyPrefixes);

				  let someOnly = (restriction.allValuesFrom !== null) ? "only" : "some";

				  let fillerTxt = null;
				  // class filler
				  if(typeof ontology.classes?.[fillerIri] !== "undefined") {
					  fillerTxt = ontology.classes[fillerIri].prefixed;
				  } else {
					  // datatype / data-range filler
					  fillerTxt = formatDatatypeForUI(fillerIri, ontology);
				  }

				  let inverseStart = "";
				  let inverseEnd = "";
				  if(restriction.inverse === true) {
					  inverseStart = "inverse (";
					  inverseEnd = ")";
				  }

				  if(onPropertyTxt && someOnly && fillerTxt){
					  cls.superClasses.push([{name: 'SuperClass', value: inverseStart + onPropertyTxt + inverseEnd + " " + someOnly + " " + fillerTxt}])
				  }
			  }

		  } else if(restriction.hasValue !== null && (typeof ontology.dataProperties?.[restriction.onProperty] !== "undefined")){

			  // Data-property hasValue restriction should be a superclass expression:
			  //   pr value "A"   or   pr value Dog (if ontology uses individuals as values)
			  let onPropertyTxt = restriction.onProperty;
			  if(typeof ontology.dataProperties?.[onPropertyTxt] !== "undefined") onPropertyTxt = ontology.dataProperties[onPropertyTxt].prefixed;
			  else onPropertyTxt = iriToPrefixed(onPropertyTxt, ontologyPrefixes);

			  let valueTxt = null;
			  if(typeof restriction.hasValue === "string"){
				  valueTxt = iriToPrefixed(restriction.hasValue, ontologyPrefixes);
			  } else if(restriction.hasValue && typeof restriction.hasValue === "object" && typeof restriction.hasValue.literal !== "undefined"){
				  const lit = String(restriction.hasValue.literal);
				  const lang = restriction.hasValue.lang;
				  const dtIri = restriction.hasValue.dt;

				  // Escape quotes minimally
				  const esc = lit.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");

				  if(lang) valueTxt = `"${esc}"@${lang}`;
				  else if(dtIri && dtIri !== (XSD + "string")) valueTxt = `"${esc}"^^${iriToPrefixed(dtIri, ontologyPrefixes)}`;
				  else valueTxt = `"${esc}"`;
			  }

			  if(onPropertyTxt && valueTxt){
				  cls.superClasses.push([{name: 'SuperClass', value: onPropertyTxt + " value " + valueTxt}])
			  }

		  } else {
			  //object property cardinality
			  if((importSettings?.showObjectCardinalityRestrictionsAsMultiplicity ?? true) === true
			  && restriction.onClass !== null && restriction.onProperty !== null
			  && typeof classes[restriction.onClass] !== "undefined" && typeof ontology.objectProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.objectProperties[restriction.onProperty].domain[0] && restriction.onClass === ontology.objectProperties[restriction.onProperty].range[0]
			  ){
				let multiplicity = formatCardinalityRange(restriction);
				if(multiplicity !== null){
					ontology.objectProperties[restriction.onProperty].multiplicity = multiplicity;
				}
			  // data property cardinality
			  // }else if(restriction.onDataRange !== null && restriction.onProperty !== null
			  }else if((importSettings?.showDataCardinalityRestrictionsAsMultiplicity ?? true) === true
			  && restriction.onProperty !== null
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
				  if((importSettings?.showPropertyRestrictionsGraphically ?? true) === true){
					  restriction["subject"] = iri;
					  restrictions.push(restriction);
				  } else {
					  //TO DO restriction to superclass expression
				  }
			  }
			  //inverse restriction cardinality
			  else if(restriction.inverse === true && restriction.onClass !== null && restriction.onProperty !== null
			  && typeof classes[restriction.onClass] !== "undefined" && typeof ontology.objectProperties[restriction.onProperty] !== "undefined"
			  && iri === ontology.objectProperties[restriction.onProperty].range[0] && restriction.onClass === ontology.objectProperties[restriction.onProperty].domain[0]
			  ){
				  if((importSettings?.showPropertyRestrictionsGraphically ?? true) === true){
					  restriction["subject"] = iri;
					  restrictions.push(restriction);
				  }
			  }

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

	  
	  if((importSettings?.showDataProperties ?? true) === true){
	    for(let dp = 0; dp < cls.dataProperties.length; dp++){
		  let equivelentResult = [];
		  let superResult = [];
		  let disjointResult = [];
		  let dataProperty = ontology.dataProperties[cls.dataProperties[dp]];
		  
		  if((importSettings?.showDataPropertiesSubDataProperties ?? true) === true){
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
		  }
		  if((importSettings?.showDataPropertiesDisjointDataProperties ?? true) === true){
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
		  }
		  if((importSettings?.showDataPropertiesEquivalentDataProperties ?? true) === true){
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
		  }
		let equivalentProperties = `${equivelentResult.map(item => item.input).join(', ')}`;
		let superProperties = `${superResult.map(item => item.input).join(', ')}`;
		let disjointProperties = `${disjointResult.map(item => item.input).join(', ')}`;
		let ch = dataProperty.characteristics;
		let multiplicity = dataProperty.multiplicity || "";
		let functionalProperty = "false";
		
		if((importSettings?.showDataPropertiesIsFunctional ?? true) === true && ch.FunctionalProperty) functionalProperty = "true";

		let annotationsResult = [];
		
		if((importSettings?.showDataPropertyAnnotations ?? true) === true){
		
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
		}

		let annotationsInput = annotationsResult.map(item => {
		  const lang = item.language ? `@${item.language}` : '';
		  return `${item.annotationType} : ${item.value}${lang}`;
		}).join(', ');

		let attrName = dataProperty.prefixed || " ";
		cls.dataProperties[dp] = [
				  {name:"Name",value:attrName},
				  {name:"Type",value:(dataProperty.rangeExpression || formatDatatypeForUI(dataProperty.range[0], ontology)) || " "},
				  {name:"Multiplicity",value:multiplicity},
				  {name:"Annotation",input:annotationsInput, value:JSON.stringify(annotationsResult)},
				  {name:"IsFunctional",value:functionalProperty},
				  {name:"EquivalentProperties",input:equivalentProperties, value:JSON.stringify(equivelentResult)},
				  {name:"SuperProperties",input:superProperties, value:JSON.stringify(superResult)},
				  {name:"DisjointProperties",input:disjointProperties, value:JSON.stringify(disjointResult)}
				]
	   }
	   
	   
	   	if((importSettings?.showObjectProperties ?? true) === true && (importSettings?.showObjectPropertiesType_text) === true){
			for(let op = 0; op < cls.objectProperties.length; op++){
	
			  let equivelentResult = [];
			  let superResult = [];
			  let disjointResult = [];
			  let dataProperty = ontology.objectProperties[cls.objectProperties[op]];
			  
			  if((importSettings?.showDataPropertiesSubDataProperties ?? true) === true){
				for(let sc = 0; sc < dataProperty.superProperties.length; sc++){
					let superProperty = dataProperty.superProperties[sc];
					const propertyValue = ontology.objectProperties[superProperty]?.prefixed || iriToPrefixed(superProperty, ontologyPrefixes);

					if (propertyValue) {
						superResult.push({
						  name: "super",
						  value: propertyValue,
						  input: "\u2286"+propertyValue,

						});
					}
				}
			  }
			  if((importSettings?.showDataPropertiesDisjointDataProperties ?? true) === true){
				  for(let dc = 0; dc < dataProperty.disjointProperties.length; dc++){
					let disjointProperty = dataProperty.disjointProperties[dc];
					const propertyValue = ontology.objectProperties[disjointProperty]?.prefixed || iriToPrefixed(disjointProperty, ontologyPrefixes);

					if (propertyValue) {
						disjointResult.push({
						  name: "disjoint",
						  value: propertyValue,
						  input: "\u27C2"+propertyValue,

						});
					}
				  }
			  }
			  if((importSettings?.showDataPropertiesEquivalentDataProperties ?? true) === true){
				  for(let ec = 0; ec < dataProperty.equivalentProperties.length; ec++){
					let equivalentProperty = dataProperty.equivalentProperties[ec];
					const propertyValue = ontology.objectProperties[equivalentProperty]?.prefixed || iriToPrefixed(equivalentProperty, ontologyPrefixes);
					if (propertyValue) {
						equivelentResult.push({
						  name: "equivalent",
						  value: propertyValue,
						  input: "\u2261"+propertyValue,

						});
					}
				  }
			  }
			  let equivalentProperties = `${equivelentResult.map(item => item.input).join(', ')}`;
			  let superProperties = `${superResult.map(item => item.input).join(', ')}`;
			  let disjointProperties = `${disjointResult.map(item => item.input).join(', ')}`;
			  let ch = dataProperty.characteristics;
			  let multiplicity = dataProperty.multiplicity || "";
			  let functionalProperty = "false";
			
			  if((importSettings?.showDataPropertiesIsFunctional ?? true) === true && ch.FunctionalProperty) functionalProperty = "true";

			  let annotationsResult = [];
			
			  if((importSettings?.showDataPropertyAnnotations ?? true) === true){
			
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
			  }
				
			  let annotationsInput = annotationsResult.map(item => {
				const lang = item.language ? `@${item.language}` : '';
				return `${item.annotationType} : ${item.value}${lang}`;
			  }).join(', ');
				

			  let attrName = dataProperty.prefixed || " ";
			  cls.dataProperties.push([
					  {name:"Name",value:attrName},
					  {name:"Type",value:ontology.classes[dataProperty.range[0]].prefixed},
					  {name:"Multiplicity",value:multiplicity},
					  {name:"Annotation",input:annotationsInput, value:JSON.stringify(annotationsResult)},
					  {name:"IsFunctional",value:functionalProperty},
					  {name:"EquivalentProperties",input:equivalentProperties, value:JSON.stringify(equivelentResult)},
					  {name:"SuperProperties",input:superProperties, value:JSON.stringify(superResult)},
					  {name:"DisjointProperties",input:disjointProperties, value:JSON.stringify(disjointResult)}
			  ])
			}
		  }
	   
	   
      }

	  if((importSettings?.showSubclasses ?? true) === true){
	    for(let sc = 0; sc < cls.superClasses.length; sc++){
		  let superClass = cls.superClasses[sc];

		  if(classes[superClass]){
			   if((importSettings?.showSubclassesType_graph ?? true) === true){
				  if(!superClasses[superClass])  superClasses[superClass] = [];
				  superClasses[superClass].push(iri)
			   }
			  if((importSettings?.showSubclassesType_text ?? true) === true) cls.superClasses[sc] = [{name:"SuperClass",value:classes[superClass].prefixed}]
		  }
	    }
	  }
	  ontology.superClasses = superClasses;
	  
	  if((importSettings?.showDisjointClasses ?? true) === true){
	    for(let dc = 0; dc < cls.disjointWith.length; dc++){
		  let disjointClass = cls.disjointWith[dc];
		  if((importSettings?.showDisjointClassesType_graph ?? true) === true){  
			  disjointClasses.push([iri, disjointClass]);
		  }
		  if((importSettings?.showDisjointClassesType_text ?? true) === true) {
			cls.disjointWith[dc] = [{name:"DisjointClass",value:classes[disjointClass].prefixed}];
			classes[disjointClass].disjointWith.push(iri);
		  }
		}
	  }

	  if((importSettings?.showEquivalentClasses ?? true) === true){
	    for(let ec = 0; ec < cls.equivalentClasses.length; ec++){
		  let equivalentClass = cls.equivalentClasses[ec];
		  if((importSettings?.showEquivalentClassesType_graph ?? true) === true){
			equivalentClasses.push([iri, equivalentClass]);
		  }
		  if((importSettings?.showEquivalentClassesType_text ?? true) === true){
			  cls.equivalentClasses[ec] = [{name:"EquivalentClass",value:classes[equivalentClass].prefixed}];
			  classes[equivalentClass].disjointWith.push(iri);
		  }
	    }
	  }
	  
	  //if parameter is graphical
	  if((importSettings?.showDisjointClassesType_text ?? false) === false) cls.disjointWith = [];
	  if((importSettings?.showEquivalentClassesType_text ?? false) === false) cls.equivalentClasses = [];
	  if((importSettings?.showSubclassesType_text ?? false) === false) cls.superClasses = [];
	  
	  // Also include imported Manchester expressions for text-mode compartments (no graph links for these)
	  if((importSettings?.showSubclasses ?? true) === true && Array.isArray(cls.superClassExpressions) && cls.superClassExpressions.length){
		for(let i = 0; i < cls.superClassExpressions.length; i++){
			cls.superClasses.push([{name:"SuperClass", value: cls.superClassExpressions[i]}]);
		}
	  }
	  if((importSettings?.showDisjointClasses ?? true) === true && Array.isArray(cls.disjointClassExpressions) && cls.disjointClassExpressions.length){
		for(let i = 0; i < cls.disjointClassExpressions.length; i++){
			cls.disjointWith.push([{name:"DisjointClass", value: cls.disjointClassExpressions[i]}]);
		}
	  }
	  if((importSettings?.showEquivalentClasses ?? true) === true && Array.isArray(cls.equivalentClassExpressions) && cls.equivalentClassExpressions.length){
		for(let i = 0; i < cls.equivalentClassExpressions.length; i++){
			cls.equivalentClasses.push([{name:"EquivalentClass", value: cls.equivalentClassExpressions[i]}]);
		}
	  }

	  

	  if((importSettings?.showKeys ?? true) === true){
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
	}
  }
	const createdLinks = {};
// uniqueUndirectedPairs

	let di;
	if((importSettings?.showDifferentIndividualsGraphicsGroupAsBoxes ?? true) === true) di = groupDisjointClasses(differentIndivids);
	else di = uniqueUndirectedPairs(differentIndivids);
	ontology.allDifferent = di;
	if((importSettings?.showSameIndividualsGraphicsGroupAsBoxes ?? true) === true) sameAsIndivids = groupDisjointClasses(sameAsIndivids);
	else sameAsIndivids = uniqueUndirectedPairs(sameAsIndivids);
	ontology.sameAsIndivids = sameAsIndivids;
	if((importSettings?.showEquivalentClassesGraphicsGroupAsBoxes ?? true) === true) equivalentClasses = groupDisjointClasses(equivalentClasses);
	else equivalentClasses = uniqueUndirectedPairs(equivalentClasses);
	ontology.equivalentClasses = equivalentClasses;
	let dc;
	if((importSettings?.showDisjointClassesGraphicsGroupAsBoxes ?? true) === true) dc = groupDisjointClasses(disjointClasses);
	else dc = uniqueUndirectedPairs(disjointClasses);
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
	 if((importSettings?.showObjectProperties ?? true) === true && importSettings?.showObjectPropertiesType_graph === true){
	for (const iri in objectProperties) {
	  if (handled.has(iri)) continue;

	  const ob = objectProperties[iri];
	  if (!(ob.domain?.length === 1 && ob.range?.length === 1)) continue;

	  // Detect an inverse partner with swapped domain/range
	  const invIri = Array.isArray(ob.inverseOf) && ob.inverseOf.length ? ob.inverseOf[0] : null;
	  let inv = null, collapseWithInverse = false;
	  // showObjectPropertiesMergeInverse
	  if((importSettings?.showObjectPropertiesMergeInverse ?? true) === true){
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
	  if((importSettings?.showObjectPropertiesSubObjectProperties ?? true) === true){
		  for(let sp = 0; sp < ob.superProperties.length; sp++){
			ob.superProperties[sp] = [{ name: "SuperProperty", value: objectProperties[ob.superProperties[sp]]?.prefixed || iriToPrefixed(ob.superProperties[sp], ontologyPrefixes)}];
		  }
	  }
	  if((importSettings?.showObjectPropertiesDisjointObjectProperties ?? true) === true){
		  for(let dp = 0; dp < ob.disjointProperties.length; dp++){
			ob.disjointProperties[dp] = [{ name: "DisjointProperty", value: objectProperties[ob.disjointProperties[dp]]?.prefixed || iriToPrefixed(ob.disjointProperties[dp], ontologyPrefixes)}];
		  }
	  }
	  if((importSettings?.showObjectPropertiesEquivalentObjectProperties ?? true) === true){
		  for(let ep = 0; ep < ob.equivalentProperties.length; ep++){
			ob.equivalentProperties[ep] = [{ name: "EquivalentProperty", value: objectProperties[ob.equivalentProperties[ep]]?.prefixed || iriToPrefixed(ob.equivalentProperties[ep], ontologyPrefixes)}];
		  }
	  }

	  if((importSettings?.showObjectPropertiesAnnotations ?? true) === true){
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
	  }
	  if((importSettings?.showObjectPropertiesPropertyChains ?? true) === true){
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
	  }
	  
	  if (ob.characteristics.FunctionalProperty && (importSettings?.showObjectPropertiesIsFunctional ?? true) === true)        ob.FunctionalProperty = true;
	  if (ob.characteristics.InverseFunctionalProperty && (importSettings?.showObjectPropertiesIsInverSefunctional ?? true) === true) ob.InverseFunctionalProperty = true;
	  if (ob.characteristics.TransitiveProperty && (importSettings?.showObjectPropertiesIsTransitive ?? true) === true)        ob.TransitiveProperty = true;
	  if (ob.characteristics.SymmetricProperty && (importSettings?.showObjectPropertiesIsSymmetric ?? true) === true)         ob.SymmetricProperty = true;
	  if (ob.characteristics.AsymmetricProperty && (importSettings?.showObjectPropertiesIsAsymmetric ?? true) === true)        ob.AsymmetricProperty = true;
	  if (ob.characteristics.ReflexiveProperty && (importSettings?.showObjectPropertiesIsReflexive ?? true) === true)         ob.ReflexiveProperty = true;
	  if (ob.characteristics.IrreflexiveProperty && (importSettings?.showObjectPropertiesIsIrreflexive ?? true) === true)       ob.IrreflexiveProperty = true;
	  
	  // If collapsing with inverse, record its info into *Inv compartments
	  if (collapseWithInverse && inv) {
		ob.prefixedInv = inv.prefixed;
		// CharacteristicsInv
	  if (inv.characteristics.FunctionalProperty && (importSettings?.showObjectPropertiesIsFunctional ?? true) === true)        ob.FunctionalPropertyInv = true;
	  if (inv.characteristics.InverseFunctionalProperty && (importSettings?.showObjectPropertiesIsInverSefunctional ?? true) === true) ob.InverseFunctionalPropertyInv = true;
	  if (inv.characteristics.TransitiveProperty && (importSettings?.showObjectPropertiesIsTransitive ?? true) === true)        ob.TransitivePropertyInv = true;
	  if (inv.characteristics.SymmetricProperty && (importSettings?.showObjectPropertiesIsSymmetric ?? true) === true)         ob.SymmetricPropertyInv = true;
	  if (inv.characteristics.AsymmetricProperty && (importSettings?.showObjectPropertiesIsAsymmetric ?? true) === true)        ob.AsymmetricPropertyInv = true;
	  if (inv.characteristics.ReflexiveProperty && (importSettings?.showObjectPropertiesIsReflexive ?? true) === true)         ob.ReflexivePropertyInv = true;
	  if (inv.characteristics.IrreflexiveProperty && (importSettings?.showObjectPropertiesIsIrreflexive ?? true) === true)       ob.IrreflexivePropertyInv = true;

		// MultiplicityInv (if you compute/display inverse multiplicity)
		if (inv.multiplicity) { ob.multiplicityInv = inv.multiplicity;}
		 
		ob.superPropertiesInv = [];
		if((importSettings?.showObjectPropertiesSubObjectProperties ?? true) === true){
		  for (const sp of inv.superProperties || []) {
			ob.superPropertiesInv[sp] = [ { name: "SuperProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes) } ]
		  }
		}
		ob.disjointPropertiesInv = [];
		if((importSettings?.showObjectPropertiesDisjointObjectProperties ?? true) === true){
		  for (const sp of inv.disjointProperties || []) {
			ob.disjointPropertiesInv[sp] = [{ name: "DisjointProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes)}]
		  }
		}
		ob.equivalentPropertiesInv = [];
		if((importSettings?.showObjectPropertiesEquivalentObjectProperties ?? true) === true){
		  for (const sp of inv.equivalentProperties || []) {
		    ob.equivalentPropertiesInv[sp] = [{ name: "EquivalentProperty", value: objectProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes) }]
		  }
		}
		ob.annotationsInv = [];
		if((importSettings?.showObjectPropertiesAnnotations ?? true) === true){
		  if(inv.label){
		    ob.labelInv = [
				  {name:"AnnotationType",value:"Label"},
				  {name:"Value",value:inv.label},
				  {name:"Language",value:""},
		    ]
	      }
		
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
		}
		ob.propertyChainsInv = [];
		if((importSettings?.showObjectPropertiesPropertyChains ?? true) === true){
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
	  }

		// objectProperties[iri] = ob;
	}
	}

	restrictions = combineRestrictions(restrictions)
	ontology.restrictions = restrictions;
	
	if((importSettings?.showIndividuals ?? true) === true){
		let individuals = ontology.individuals;
		let objectPropertyAssertions = [];
		for (const iri in individuals) {
		  const individ = individuals[iri];
		  if((importSettings?.showIndividualClassAssertions ?? true) === true){
		    if(individ.types.length === 1 && ((importSettings?.showClassAssertionsType_text ?? true) === true || importSettings?.showClassAssertionsGraphicsKeepText === true)) {
			  const className = ontology.classes[individ.types[0]]?.prefixed || iriToPrefixed(individ.types[0], ontology.prefixes);
			  if(!className.startsWith("_:")) individ.className = className;
		    } 
			if(individ.types.length === 1 && (importSettings?.showClassAssertionsType_graph) === true){
			  individ.classID = individ.types[0];
			}
		  }
		 if((importSettings?.showIndividualAnnotations ?? true) === true){
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
				if((importSettings?.showIndividualsDataPropertyAssertions ?? true) === true && !negative){
					individ.dataPropertyAssertions.push([
				   {name:"Property",value:dp},
				   {name:"Value",value:value},
					{name:"Type",value:t}])
				} else if((importSettings?.showIndividualsNegativeDataPropertyAssertions ?? true) === true) {
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

				if(op === "http://www.w3.org/2002/07/owl#differentFrom" && (importSettings?.showDifferentIndividuals ?? true) === true){
					if((importSettings?.showDifferentIndividualsType_graph ?? true) === true){
						differentIndivids.push([ob, iri]);
					}
					if((importSettings?.showDifferentIndividualsType_text ?? true) === true){
						individ.differentIndividuals.push([
							{name:"Individual",value:ob}])
					}
				} else if(op === "http://www.w3.org/2002/07/owl#sameAs" && (importSettings?.showSameIndividuals ?? true) === true){
					if((importSettings?.showSameIndividualsType_graph ?? true) === true){
						sameAsIndivids.push([ob, iri]);
					}
					if((importSettings?.showSameIndividualsType_text ?? true) === true){
					  individ.sameIndividuals.push([
						{name:"Individual",value:ob}])
						indiv.setHorizontalLine("HorizontalLine11");
					}
				} else {
					let prefixedOP = ontology.objectProperties[op]?.prefixed || iriToPrefixed(op, ontologyPrefixes);
					if((importSettings?.showIndividualsObjectPropertyAssertions ?? true) === true && objFact.negative !== true){
						objectPropertyAssertions.push({iri: op, source:iri, target:objFact.object, prefixed:prefixedOP, negative:objFact.negative})
					}
					if((importSettings?.showIndividualsNegativeObjectPropertyAssertions ?? true) === true && objFact.negative === true){
						objectPropertyAssertions.push({iri: op, source:iri, target:objFact.object, prefixed:prefixedOP, negative:objFact.negative})
					}
				}
			}
		 }
		}

		ontology.objectPropertyAssertions = objectPropertyAssertions;
	} else {ontology.individuals = {}}
		
	if((importSettings?.showDataTypes ?? true) === true){
		
	} else {
		ontology.dataTypes = {};
	}
	
	if((importSettings?.showAnnotationPropertyDefs ?? true) === true){
		
	} else {
		ontology.annotationProperties = {};
	}
		
	return ontology;
}

async function getImportParameters(){
  try {
	const proj = await Projects.findOneAsync({ _id: Session.get("activeProject") });
    // const res = await fetch("/OWLGrEd_ImportSettings/ontology-loading-preferences.json", {
      // cache: "no-store",
    // });
    // if (!res.ok) throw new Error("HTTP " + res.status);
    const jsonString = proj?.OWLGrEdimportParameters;
	const json = JSON.parse(jsonString);
    return json;
  } catch (err) {
    console.error("Failed to load ontology loading preferences", err);
    return {};
  }
}

async function visualizeOntology(ontology){
    
    let importSettings = await getImportParameters();
	
	// console.log("OOOOOO", ontology, importSettings)
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
				  {name:"Type",value:(dataProperty.rangeExpression || formatDatatypeForUI(dataProperty.range[0], ontology)) || " "},
				  {name:"Multiplicity",value:multiplicity},
				  {name:"Annotation",input:annotationsInput, value:JSON.stringify(annotationsResult)},
				  {name:"IsFunctional",value:functionalProperty},
				  {name:"EquivalentProperties",input:equivalentProperties, value:JSON.stringify(equivelentResult)},
				  {name:"SuperProperties",input:superProperties, value:JSON.stringify(superResult)},
				  {name:"DisjointProperties",input:disjointProperties, value:JSON.stringify(disjointResult)}
				])

		  // await cl.addCompartmentSubCompartments2("Attributes",[
				  // {name:"Name",value:attrName},
				  // {name:"Type",value:(dataProperty.rangeExpression || formatDatatypeForUI(dataProperty.range[0], ontology)) || " "},
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
	  const dtDef = buildDatatypeDefinitionForUI(dataType, ontology);
	  if(dtDef) dt.setCompartmentValue("DataTypeDefinition", dtDef, dtDef)

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

// Format a datatype IRI for OWLGrEd UI compartments.
// - built-ins -> short local name (integer, string, ...)
// - named custom datatypes -> prefixed name if known
// - fallback -> iriToPrefixed
function formatDatatypeForUI(iri, ontologyOrPrefixes) {
  if (!iri) return null;
  const local = getDatatypeLocalName(iri);
  if (local) return local;

  // Allow passing either full ontology object (preferred) or prefixes map
  const prefixes = ontologyOrPrefixes?.prefixes || ontologyOrPrefixes || {};
  const prefixed = (ontologyOrPrefixes?.dataTypes?.[iri]?.prefixed) || null;
  return prefixed || iriToPrefixed(iri, prefixes);
}

function buildDatatypeDefinitionForUI(dt, ontology) {
  if (!dt) return null;
  if (dt.definitionExpression) return dt.definitionExpression;

  if (dt.base) {
    const baseName = formatDatatypeForUI(dt.base, ontology);
    if (dt.restrictions && dt.restrictions.length) {
      const parts = dt.restrictions
        .map(r => (r && r.facet && r.value) ? `${r.facet} ${r.value}` : null)
        .filter(Boolean);
      if (parts.length) return `(${baseName}[${parts.join(', ')}])`;
    }
    return baseName;
  }
  return null;
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

// -------------------------
// Datatype (data range) expression import helpers
//   Supports OWL 2 datatype expressions serialized as blank nodes, including:
//   - owl:onDatatype + owl:withRestrictions
//   - owl:intersectionOf / owl:unionOf
//   - owl:datatypeComplementOf
//   - owl:oneOf
// Produces Manchester-style datatype expressions compatible with data_range_grammar_OWLGrEd.pegjs
// -------------------------

const XSD_FACET_TO_MANCHESTER = {
  [XSD + 'minExclusive']: '>',
  [XSD + 'minInclusive']: '>=',
  [XSD + 'maxExclusive']: '<',
  [XSD + 'maxInclusive']: '<=',
  [XSD + 'length']: 'length',
  [XSD + 'maxLength']: 'maxLength',
  [XSD + 'minLength']: 'minLength',
  [XSD + 'pattern']: 'pattern',
  // OWL2 uses rdf:langRange for language-range restrictions; grammar uses 'langPattern'
  [RDF + 'langRange']: 'langPattern',
};

function datatypeIriToManchester(iri, prefixes = {}) {
  if (!iri) return null;
  const builtIn = getDatatypeLocalName(iri);
  if (builtIn) return builtIn;
  return iriToPrefixed(iri, prefixes);
}

function termToManchesterDatatype(term, prefixes = {}) {
  if (!term) return null;
  if (term.termType === 'NamedNode') return datatypeIriToManchester(term.value, prefixes);
  // For blank nodes, caller should serialize via serializeDataRange()
  return null;
}

function escapeQuotedString(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function literalToManchester(lit, prefixes = {}) {
  if (!lit) return null;

  if (lit.termType !== 'Literal') {
    // Some lists may (non-standardly) contain IRIs; fall back
    if (lit.termType === 'NamedNode') return iriToPrefixed(lit.value, prefixes);
    return null;
  }

  const dtIri = lit.datatype?.value;
  const lang = lit.language || '';

  // If language tag present, always emit "..."@lang
  if (lang) {
    return `"${escapeQuotedString(lit.value)}"@${lang}`;
  }

  // Un-typed or xsd:string-like: emit simple quoted string
  if (!dtIri || dtIri === XSD + 'string' || dtIri === RDF + 'langString') {
    return `"${escapeQuotedString(lit.value)}"`;
  }

  // Numeric-like literals: prefer bare token if it looks like a number
  const v = String(lit.value).trim();
  if (/^[+-]?\d+$/.test(v) || /^[+-]?\d+\.\d+$/.test(v) || /^[+-]?(?:\d+\.)?\d+[eE][+-]?\d+(?:[fF])?$/.test(v)) {
    return v;
  }

  // Otherwise: "v"^^datatype
  const dtName = datatypeIriToManchester(dtIri, prefixes);
  return `"${escapeQuotedString(lit.value)}"^^${dtName}`;
}

// Serialize an OWL2 datatype expression node to Manchester datatype expression (no outer parentheses added here).
// Returns { text, needsParens }
function serializeDataRange(store, term, prefixes = {}, visited = new Set()) {
  if (!term) return { text: null, needsParens: false };

  // Named datatype
  if (term.termType === 'NamedNode') {
    return { text: datatypeIriToManchester(term.value, prefixes), needsParens: false };
  }

  // Literals appear only in owl:oneOf lists (datatype enumerations)
  if (term.termType === 'Literal') {
    return { text: literalToManchester(term, prefixes), needsParens: false };
  }

  if (term.termType !== 'BlankNode') {
    return { text: null, needsParens: false };
  }

  // loop breaker
  if (visited.has(term.value)) return { text: null, needsParens: false };
  visited.add(term.value);

  const get1 = (pIri) => store.getQuads(term, namedNode(pIri), null, null)[0]?.object || null;

  // intersectionOf / unionOf
  const inter = get1(OWL + 'intersectionOf');
  if (inter) {
    const items = parseRdfList(store, inter);
    const parts = items.map(t => serializeDataRange(store, t, prefixes, visited).text).filter(Boolean);
    return { text: parts.join(' and '), needsParens: true };
  }

  const uni = get1(OWL + 'unionOf');
  if (uni) {
    const items = parseRdfList(store, uni);
    const parts = items.map(t => serializeDataRange(store, t, prefixes, visited).text).filter(Boolean);
    return { text: parts.join(' or '), needsParens: true };
  }

  // datatypeComplementOf
  const comp = get1(OWL + 'datatypeComplementOf');
  if (comp) {
    const inner = serializeDataRange(store, comp, prefixes, visited);
    const innerTxt = inner.text ? (inner.needsParens ? `(${inner.text})` : inner.text) : null;
    return { text: innerTxt ? `not ${innerTxt}` : null, needsParens: true };
  }

  // oneOf (datatype enumeration)
  const oneOf = get1(OWL + 'oneOf');
  if (oneOf) {
    const items = parseRdfList(store, oneOf);
    const parts = items.map(t => literalToManchester(t, prefixes)).filter(Boolean);
    return { text: `{ ${parts.join(', ')} }`, needsParens: true };
  }

  // onDatatype + withRestrictions
  const onDt = get1(OWL + 'onDatatype');
  const withR = get1(OWL + 'withRestrictions');
  if (onDt && onDt.termType === 'NamedNode') {
    const base = datatypeIriToManchester(onDt.value, prefixes);
    if (withR) {
      const restrItems = parseRdfList(store, withR);
      const parts = [];

      for (const rTerm of restrItems) {
        if (!rTerm || rTerm.termType !== 'BlankNode') continue;

        // Find first facet predicate we know
        let facetPred = null;
        let facetObj = null;

        const quads = store.getQuads(rTerm, null, null, null);
        for (const q of quads) {
          const mp = XSD_FACET_TO_MANCHESTER[q.predicate.value];
          if (mp) {
            facetPred = mp;
            facetObj = q.object;
            break;
          }
        }

        if (!facetPred || !facetObj) continue;

        const vTxt = (facetObj.termType === 'Literal') ? literalToManchester(facetObj, prefixes)
                  : (facetObj.termType === 'NamedNode') ? iriToPrefixed(facetObj.value, prefixes)
                  : null;

        if (vTxt) parts.push(`${facetPred} ${vTxt}`);
      }

      if (parts.length > 0) {
        return { text: `${base}[${parts.join(', ')}]`, needsParens: true };
      }
    }

    // plain base datatype (typed as a bnode)
    return { text: base, needsParens: true };
  }

  // Unknown/unsupported bnode form
  return { text: null, needsParens: false };
}

// Convenience: wrap complex expressions with parentheses for UI compartments where OWLGrEd expects "( ... )"
function serializeDataRangeForUI(store, term, prefixes = {}) {
  const res = serializeDataRange(store, term, prefixes, new Set());
  if (!res.text) return null;
  return res.needsParens ? `(${res.text})` : res.text;
}



/* =========================
   Class expression import helpers (Manchester)
   Supports OWL 2 class expressions serialized as blank nodes, including:
   - owl:complementOf
   - owl:intersectionOf / owl:unionOf
   - owl:oneOf (enumeration)
   - owl:Restriction (some/only/value/Self/min/max/exactly, incl. qualified)
   Also supports datatype/data-range fillers by delegating to serializeDataRange().
   Produces Manchester-style class expressions compatible with class_expression_grammar_OWLGrEd.pegjs
========================= */

function termLooksLikeDatatypeIri(iri) {
  if (!iri) return false;
  return (
    iri.startsWith(XSD) ||
    iri === RDFS + 'Literal' ||
    iri === RDF + 'langString' ||
    iri === RDF + 'PlainLiteral' ||
    iri === OWL + 'real' ||
    iri === OWL + 'rational' ||
    !!getDatatypeLocalName(iri)
  );
}

function serializeSomePrimary(store, term, prefixes = {}, visited = new Set()) {
  if (!term) return null;

  // Named resources (class / datatype / individual)
  if (term.termType === 'NamedNode') {
    return termLooksLikeDatatypeIri(term.value)
      ? formatDatatypeForUI(term.value, prefixes)
      : iriToPrefixed(term.value, prefixes);
  }

  // Literals (for value / literal list)
  if (term.termType === 'Literal') {
    return literalToManchester(term, prefixes);
  }

  // Blank nodes: could be class expr, restriction, or datatype expression
  if (term.termType !== 'BlankNode') return null;

  // Try datatype/data range first (some/only targets may be data ranges)
  const dr = serializeDataRange(store, term, prefixes, visited);
  if (dr && dr.text) {
    // For SomePrimary, only parenthesize when needed
    return dr.needsParens ? `(${dr.text})` : dr.text;
  }

  // Otherwise treat as a class expression
  const ce = serializeClassExpression(store, term, prefixes, visited);
  if (ce && ce.text) {
    return ce.needsParens ? `(${ce.text})` : ce.text;
  }

  return null;
}

function serializeRestrictionManchester(store, bn, prefixes = {}, visited = new Set()) {
  // Determine property / inverse
  const onProp = store.getQuads(bn, namedNode(OWL + 'onProperty'), null, null)[0]?.object || null;
  let inverse = false;
  let propIri = null;

  if (onProp?.termType === 'NamedNode') {
    propIri = onProp.value;
  } else if (onProp?.termType === 'BlankNode') {
    const inv = store.getQuads(onProp, namedNode(OWL + 'inverseOf'), null, null)[0]?.object;
    if (inv?.termType === 'NamedNode') {
      inverse = true;
      propIri = inv.value;
    }
  }

  if (!propIri) return null;

  const propTxt = iriToPrefixed(propIri, prefixes);
  const headTxt = inverse ? `inverse(${propTxt})` : propTxt;

  // Fillers
  const some = store.getQuads(bn, namedNode(OWL + 'someValuesFrom'), null, null)[0]?.object || null;
  const all  = store.getQuads(bn, namedNode(OWL + 'allValuesFrom'), null, null)[0]?.object || null;
  const hv   = store.getQuads(bn, namedNode(OWL + 'hasValue'), null, null)[0]?.object || null;
  const hs   = store.getQuads(bn, namedNode(OWL + 'hasSelf'), null, null)[0]?.object || null;

  // Cardinalities
  const minCard  = store.getQuads(bn, namedNode(OWL + 'minCardinality'), null, null)[0]?.object || null;
  const maxCard  = store.getQuads(bn, namedNode(OWL + 'maxCardinality'), null, null)[0]?.object || null;
  const card     = store.getQuads(bn, namedNode(OWL + 'cardinality'), null, null)[0]?.object || null;
  const qMinCard = store.getQuads(bn, namedNode(OWL + 'minQualifiedCardinality'), null, null)[0]?.object || null;
  const qMaxCard = store.getQuads(bn, namedNode(OWL + 'maxQualifiedCardinality'), null, null)[0]?.object || null;
  const qCard    = store.getQuads(bn, namedNode(OWL + 'qualifiedCardinality'), null, null)[0]?.object || null;

  const onClass     = store.getQuads(bn, namedNode(OWL + 'onClass'), null, null)[0]?.object || null;
  const onDataRange = store.getQuads(bn, namedNode(OWL + 'onDataRange'), null, null)[0]?.object || null;

  const lit2num = (lit) => (lit && lit.termType === 'Literal' ? Number(lit.value) : null);

  // some / only
  if (some) {
    const v = serializeSomePrimary(store, some, prefixes, visited);
    return v ? `${headTxt} some ${v}` : null;
  }
  if (all) {
    const v = serializeSomePrimary(store, all, prefixes, visited);
    return v ? `${headTxt} only ${v}` : null;
  }

  // value
  if (hv) {
    const v = serializeSomePrimary(store, hv, prefixes, visited);
    return v ? `${headTxt} value ${v}` : null;
  }

  // Self
  if (hs && hs.termType === 'Literal' && String(hs.value).toLowerCase() === 'true') {
    return `${headTxt} Self`;
  }

  // Cardinalities (prefer qualified when present)
  const exact = lit2num(qCard) ?? lit2num(card);
  const min   = lit2num(qMinCard) ?? lit2num(minCard);
  const max   = lit2num(qMaxCard) ?? lit2num(maxCard);

  const fillerTerm = onClass || onDataRange || null;
  const fillerTxt = fillerTerm ? serializeSomePrimary(store, fillerTerm, prefixes, visited) : null;

  if (Number.isInteger(exact)) {
    return fillerTxt ? `${headTxt} exactly ${exact} ${fillerTxt}` : `${headTxt} exactly ${exact}`;
  }
  if (Number.isInteger(min)) {
    return fillerTxt ? `${headTxt} min ${min} ${fillerTxt}` : `${headTxt} min ${min}`;
  }
  if (Number.isInteger(max)) {
    return fillerTxt ? `${headTxt} max ${max} ${fillerTxt}` : `${headTxt} max ${max}`;
  }

  return null;
}

function serializeClassExpression(store, term, prefixes = {}, visited = new Set()) {
  if (!term) return { text: null, needsParens: false };

  // Avoid cycles
  if (term.termType === 'BlankNode') {
    if (visited.has(term.value)) return { text: null, needsParens: false };
    visited.add(term.value);
  }

  // Named class (or named datatype used as filler)
  if (term.termType === 'NamedNode') {
    const t = termLooksLikeDatatypeIri(term.value)
      ? formatDatatypeForUI(term.value, prefixes)
      : iriToPrefixed(term.value, prefixes);
    return { text: t, needsParens: false };
  }

  // Restriction bnodes
  if (term.termType === 'BlankNode') {
    // If this looks like a Restriction, serialize it
    const hasOnProp = store.getQuads(term, namedNode(OWL + 'onProperty'), null, null).length > 0;
    if (hasOnProp) {
      const rTxt = serializeRestrictionManchester(store, term, prefixes, visited);
      return { text: rTxt, needsParens: true };
    }

    // complementOf
    const comp = store.getQuads(term, namedNode(OWL + 'complementOf'), null, null)[0]?.object || null;
    if (comp) {
      const inner = serializeClassExpression(store, comp, prefixes, visited);
      const innerTxt = inner.text ? (inner.needsParens ? `(${inner.text})` : inner.text) : null;
      return { text: innerTxt ? `not ${innerTxt}` : null, needsParens: true };
    }

    // intersectionOf / unionOf
    const inter = store.getQuads(term, namedNode(OWL + 'intersectionOf'), null, null)[0]?.object || null;
    if (inter) {
      const items = parseRdfList(store, inter);
      const parts = items.map(t => {
        const r = serializeClassExpression(store, t, prefixes, visited);
        return r.text ? (r.needsParens ? `(${r.text})` : r.text) : null;
      }).filter(Boolean);
      return { text: parts.join(' and '), needsParens: true };
    }

    const uni = store.getQuads(term, namedNode(OWL + 'unionOf'), null, null)[0]?.object || null;
    if (uni) {
      const items = parseRdfList(store, uni);
      const parts = items.map(t => {
        const r = serializeClassExpression(store, t, prefixes, visited);
        return r.text ? (r.needsParens ? `(${r.text})` : r.text) : null;
      }).filter(Boolean);
      return { text: parts.join(' or '), needsParens: true };
    }

    // oneOf (class enumeration)
    const oneOf = store.getQuads(term, namedNode(OWL + 'oneOf'), null, null)[0]?.object || null;
    if (oneOf) {
      const items = parseRdfList(store, oneOf);
      const parts = items.map(t => {
        if (t.termType === 'NamedNode') return iriToPrefixed(t.value, prefixes);
        if (t.termType === 'Literal') return literalToManchester(t, prefixes);
        return null;
      }).filter(Boolean);
      return { text: `{ ${parts.join(', ')} }`, needsParens: true };
    }

    // Unknown/unsupported bnode form
    return { text: null, needsParens: false };
  }

  return { text: null, needsParens: false };
}

function serializeClassExpressionForUI(store, term, prefixes = {}) {
  const res = serializeClassExpression(store, term, prefixes, new Set());
  if (!res.text) return null;
  return res.needsParens ? `(${res.text})` : res.text;
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

function uniqueUndirectedPairs(pairs) {
  const seen = new Set();
  const out = [];

  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length < 2) continue;

    const a = pair[0];
    const b = pair[1];
    if (!a || !b || a === b) continue;

    // canonical order
    const [x, y] = a < b ? [a, b] : [b, a];
    const key = `${x}||${y}`;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push([x, y]);
  }

  return out;
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
  loadOntololgyFromProjectRDFLibOWLGrEd
}
