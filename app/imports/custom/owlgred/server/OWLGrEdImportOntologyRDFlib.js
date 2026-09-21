// Server-side OWLGrEd ontology import using rdflib.js
// Generated from import_OWLGrEd.js logic, but using rdflib Store.match() and rdflib term constructors.
//

import * as $rdf from 'rdflib';

const RDF  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const OWL  = 'http://www.w3.org/2002/07/owl#';
const XSD  = 'http://www.w3.org/2001/XMLSchema#';

function detectContentType(text) {
  const t = String(text || '').trim();
  if (!t) return 'text/turtle';

  // RDF/XML
  if (t.startsWith('<') && /<rdf:RDF\b|<\?xml\b/i.test(t)) return 'application/rdf+xml';

  // JSON-LD
  if (t.startsWith('{') && /"@context"\s*:/i.test(t)) return 'application/ld+json';

  // Turtle / TriG
  if (/@prefix\s+|PREFIX\s+/i.test(t)) return 'text/turtle';

  // N-Triples: <s> <p> <o> .
  if (/^<[^>]+>\s+<[^>]+>\s+.+\s+\.$/m.test(t)) return 'application/n-triples';

  // fallback
  return 'text/turtle';
}

function prefixesFromTurtle(text) {
  const prefixes = {};

  // @prefix ex: <http://example/> .
  const atPrefix = /@prefix\s+([A-Za-z][\w-]*)?:\s*<([^>]+)>\s*\./g;
  for (const m of text.matchAll(atPrefix)) prefixes[m[1] || ""] = m[2];

  // PREFIX ex: <http://example/>
  const sparqlPrefix = /PREFIX\s+([A-Za-z][\w-]*)?:\s*<([^>]+)>/gi;
  for (const m of text.matchAll(sparqlPrefix)) prefixes[m[1] || ""] = m[2];

  return prefixes;
}

function prefixesFromRdfXml(text) {
  const prefixes = {};

  // 1) Grab xmlns declarations
  const xmlnsRe = /\bxmlns(?::([A-Za-z_][\w.-]*))?\s*=\s*["']([^"']+)["']/g;
  for (const m of text.matchAll(xmlnsRe)) {
    const prefix = m[1] || ""; // default ns
    prefixes[prefix] = m[2];
  }

  // 2) If default namespace missing, try to infer it from ontology IRI/base
  if (!prefixes[""]) {
    // xml:base on root (common)
    let iri =
      (text.match(/\bxml:base\s*=\s*["']([^"']+)["']/i) || [])[1] ||
      // rdf:about on <owl:Ontology ...>
      (text.match(/<owl:Ontology\b[^>]*\brdf:about\s*=\s*["']([^"']+)["']/i) || [])[1] ||
      // rdf:ID on <owl:Ontology rdf:ID="X">  => base + "#X" usually; we'll treat base as "#"
      (text.match(/<owl:Ontology\b[^>]*\brdf:ID\s*=\s*["']([^"']+)["']/i) || [])[1];

    if (iri) {
      // If rdf:ID gave us just an ID token, we can't know the real base; best effort:
      // treat it as a local fragment base.
      if (!iri.includes(":") && !iri.includes("/") && !iri.includes("#")) {
        iri = `urn:ontology#`;
      } else {
        // normalize namespace to end with '#' or '/'
        iri = normalizeNamespace(iri);
      }
      prefixes[""] = iri;
    }
  }

  return prefixes;
}

function normalizeNamespace(iri) {
  // If it already ends with # or /, keep it.
  if (/[#\/]$/.test(iri)) return iri;

  // If it contains a fragment, keep up to and including '#'
  const hash = iri.lastIndexOf("#");
  if (hash !== -1) return iri.slice(0, hash + 1);

  // Otherwise keep up to last '/'
  const slash = iri.lastIndexOf("/");
  if (slash !== -1) return iri.slice(0, slash + 1);

  // Fallback
  return iri + "#";
}

function prefixesFromJsonLd(text) {
  const prefixes = {};
  const obj = JSON.parse(text);
  const ctx = obj["@context"];
  if (!ctx) return prefixes;

  const add = (c) => {
    if (c && typeof c === "object" && !Array.isArray(c)) {
      for (const [k, v] of Object.entries(c)) {
        if (typeof v === "string" && /[:/#]$/.test(v)) prefixes[k] = v; // heuristic
      }
    }
  };
  if (Array.isArray(ctx)) ctx.forEach(add); else add(ctx);
  return prefixes;
}

async function parseToStore(text, baseIri = 'urn:owlgred:base#', contentType) {
  const store = $rdf.graph();
  const ct = contentType || detectContentType(text);

  if (ct === 'application/ld+json') {
    await new Promise((resolve, reject) => {
      try {
        $rdf.parse(text, store, baseIri, ct, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  } else {
    // sync parse for turtle/rdfxml/ntriples
    $rdf.parse(text, store, baseIri, ct);
  }

  // const prefixes = { ...(store.namespaces || {}) };
  
  
   let prefixes = {};
  if (ct.includes("turtle") || ct.includes("trig")) prefixes = prefixesFromTurtle(text);
  else if (ct.includes("rdf+xml") || ct.includes("xml")) prefixes = prefixesFromRdfXml(text);
  else if (ct.includes("ld+json") || ct.includes("json")) prefixes = prefixesFromJsonLd(text);

  
  
  return { store, prefixes, contentType: ct };
}

async function saveOntologyRDFlib(ontologyText) {
  let { store, prefixes } = await parseToStore(ontologyText);
  
	

  // Identify ontology node (if present) to set default prefix
  const ontologyQuads = store.match(
    null,
    $rdf.sym(RDF + 'type'),
    $rdf.sym(OWL + 'Ontology'),
    null
  );

  const ontologyNode = ontologyQuads[0]?.subject || null;
  if (ontologyNode && ontologyNode.termType === 'NamedNode') {
    // keep same behaviour as saveOntologyN3
    // const updated = useOntologyPrefixAsDefault(prefixes, ontologyNode.value);
    // mutate in-place for downstream
    // for (const k of Object.keys(prefixes)) delete prefixes[k];
    // Object.assign(prefixes, updated);
  }

   // prefixes = prefixesFromTurtle(ontologyText);

  const ontologyStructure = makeState(prefixes);

  discoverEntitiesRDFlib(store, ontologyStructure, prefixes);
  routeTriplesRDFlib(store, ontologyStructure, prefixes);
  extendWithQualifierAnnotationsRDFlib(store, ontologyStructure, prefixes);
  extendWithAnnotationsRDFlib(store, ontologyStructure);

  return ontologyStructure;
}

Meteor.methods({
  async loadOwlRDFLib(ontologyText) {
    return await saveOntologyRDFlib(ontologyText);
  }
});

function makeState(prefixes = {}) {
  return {
    prefixes,
    classes: {}, individuals: {}, objectProperties: {}, dataProperties: {}, annotationProperties: {}, dataTypes: {}, allDisjointClasses: [], allDisjointProperties: [], allDifferent: [],
    // auxiliary indexes
    isAnnotationProp: new Set(),
    isObjectProp: new Set(),
    isDataProp: new Set(),
	qualifierAnnotationProperty: 'http://lumii.lv/2011/1.0/extended#qualifier',
  };
}

function iriToPrefixed(iri, prefixes = {}) {
  if (!iri) return iri;

  // Expand RDF/XML entity-style namespace usage:
  //   &Prefix;LocalName
  // or
  //   http://.../&Prefix;LocalName
  iri = iri.replace(/&([A-Za-z_][\w.-]*);([A-Za-z_][\w.-]*)/g, (full, entityPrefix, local) => {
    return prefixes[entityPrefix] ? prefixes[entityPrefix] + local : full;
  });

  // Try existing prefixes first
  for (const [prefix, base] of Object.entries(prefixes)) {
    if (iri.startsWith(base)) {
      const local = iri.slice(base.length);

      if (prefix === '' || prefix === ':') {
        return local;
      }

      return `${prefix}:${local}`;
    }
  }

  // Split unknown IRI into namespace + local name
  const parts = splitNamespaceAndLocal(iri);
  if (!parts) return iri;

  const { namespace, local } = parts;

  // Reuse prefix if same namespace already exists under another key
  for (const [prefix, base] of Object.entries(prefixes)) {
    if (base === namespace) {
      return (prefix === '' || prefix === ':') ? local : `${prefix}:${local}`;
    }
  }

  // Auto-create new readable prefix from namespace
  const newPrefix = makePrefixFromNamespace(namespace, prefixes);
  prefixes[newPrefix] = namespace;

  return `${newPrefix}:${local}`;
}

function splitNamespaceAndLocal(iri) {
  if (!iri) return null;

  const hash = iri.lastIndexOf('#');
  if (hash !== -1 && hash < iri.length - 1) {
    return {
      namespace: iri.slice(0, hash + 1),
      local: iri.slice(hash + 1)
    };
  }

  const slash = iri.lastIndexOf('/');
  if (slash !== -1 && slash < iri.length - 1) {
    return {
      namespace: iri.slice(0, slash + 1),
      local: iri.slice(slash + 1)
    };
  }

  return null;
}

function makePrefixFromNamespace(namespace, prefixes) {
  let candidate = namespace
    .replace(/[\/#]+$/, '')
    .split(/[\/#]/)
    .pop()
    .replace(/\.(owl|rdf|ttl|xml)$/i, '')
    .replace(/[^A-Za-z0-9_-]/g, '') || 'ns';

  if (!/^[A-Za-z_]/.test(candidate)) {
    candidate = `ns_${candidate}`;
  }

  let prefix = candidate;
  let i = 1;
  while (Object.prototype.hasOwnProperty.call(prefixes, prefix)) {
    prefix = `${candidate}${i++}`;
  }

  return prefix;
}

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

function parseRestriction(store, bn) {
  if (!bn || bn.termType !== 'BlankNode') return null;

  const getO = (pIri) => store.match(bn, $rdf.sym(pIri), null, null).map(q => q.object);
  const hasTypeRestriction = store.match(bn, $rdf.sym(RDF + 'type'), $rdf.sym(OWL + 'Restriction'), null).length > 0;
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
      const inv = store.match(pTerm, $rdf.sym(OWL + 'inverseOf'), null, null)[0]?.object;
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

function discoverEntitiesRDFlib(store, state, prefixes = {}) {
  const type = $rdf.sym(RDF + 'type');

  const termKey = (t) => (t && t.termType === 'BlankNode') ? (`_:` + t.value) : (t ? t.value : null);

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
	if (oIri === OWL + 'Thing') {
	  ensure(state.classes, oIri, iri => ({
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
	}

    if (oIri === OWL + 'ObjectProperty') {
	  ensure(state.objectProperties, sIri, iri => ({
		...makeEntity(iri, 'ObjectProperty'),
		domain: [],
		range: [],
		characteristics: {},
		inverseOf: [] ,
		propertyChains: [],
		Qualifiers: []
	  }));
	  state.isObjectProp.add(sIri);
	  return;
	}

    if (oIri === OWL + 'DatatypeProperty') {
      ensure(state.dataProperties, sIri, iri => ({
        ...makeEntity(iri, 'DatatypeProperty'),
        domain: [],
        range: [],
        characteristics: {},
		Qualifiers: []
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
  for (const q of store.match(null, type, null, null)) {
    pushType(q.subject, q.object);
  }


  // Final cleanup: remove accidental `owl:NamedIndividual` types if any
  for (const ind of Object.values(state.individuals)) {
    ind.types = ind.types.filter(t => t !== OWL + 'NamedIndividual');
  }
  const rdfType = $rdf.sym(RDF + "type");
const owlOntology = $rdf.sym(OWL + "Ontology");

 // collect all ontology subject nodes (can be NamedNode OR BlankNode)
	const ontologySubjects = new Set(
	  store.match(null, rdfType, owlOntology, null).map(q => termKey(q.subject)) // .id works for NamedNode/BlankNode
	);
  // Include subjects that are not schema entities
  for (const q of store.match(null, null, null, null)) {
	  const s = q.subject;
	  const o = q.object;

	  // if subject is the ontology node (including _:n0), skip
	  if (ontologySubjects.has(termKey(s))) continue;

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

function routeTriplesRDFlib(store, state, prefixes = {}) {
  const qAll = store.match(null, null, null, null);

  const isDatatype = (iri) =>
    iri.startsWith(XSD) || iri === RDFS + 'Literal' || iri === RDF + 'langString' ||
    iri === RDF + 'PlainLiteral' || iri === OWL + 'real' || iri === OWL + 'rational';

   const ensureClass = (iri) => {
    if (!state.classes[iri]) {
      state.classes[iri] = {
        iri,
        prefixed: iriToPrefixed(iri, prefixes),
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
      };
    }
    return state.classes[iri];
  };

  // make sure we can create a datatype bucket on-the-fly
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
  
  const ensureAnnotationProperty = (iri) => {
	  if (!state.annotationProperties[iri]) {
		state.annotationProperties[iri] = {
		  iri,
		  prefixed: iriToPrefixed(iri, prefixes),
		  label: null,
		  annotations: [],
		  kind: 'AnnotationProperty',
		  domain: [],
		  range: [],
		  superProperties: [],
		  Qualifiers: []
		};
	  }
	  state.isAnnotationProp.add(iri);
	  return state.annotationProperties[iri];
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
	  b.Qualifiers ||= [];
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
	  b.Qualifiers ||= [];
      return b;
    }
    // allow annotation properties to use same helpers where relevant
    b = state.annotationProperties[iri];
    if (b) {
	  b.superProperties ||= [];
      b.domain ||= [];
      b.range ||= [];
	  b.Qualifiers ||= [];
      return b;
    }
    return null;
  };
  
   const termKey = (t) =>
    (t && t.termType === 'BlankNode') ? ('_:' + t.value) : t?.value;

  const ontologySubjects = new Set(
    store.match(null, $rdf.sym(RDF + 'type'), $rdf.sym(OWL + 'Ontology'), null)
      .map(q => termKey(q.subject))
  );

  
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
				propertyChains: [],
				Qualifiers: []
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
				characteristics: {},
				Qualifiers: []
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
				propertyChains: [],
				Qualifiers: []
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
				characteristics: {},
				Qualifiers: []
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
        if (state.annotationProperties[s.value]) state.annotationProperties[s.value].domain.push(o.value);

        // ensure class exists even without explicit declaration axiom
        const cls = ensureClass(o.value);
        if (state.isObjectProp.has(s.value)) cls.objectProperties.push(s.value);
        if (state.isDataProp.has(s.value))   cls.dataProperties.push(s.value);

        continue;
      }

      // Anonymous class-expression domain
      if (o.termType === 'BlankNode') {
        const man = serializeClassExpressionForUI(store, o, prefixes);
        if (man) {
          const anonIri = ensureAnonClassForExpr(o, man);

          if (state.objectProperties[s.value]) state.objectProperties[s.value].domain.push(anonIri);
          if (state.dataProperties[s.value])   state.dataProperties[s.value].domain.push(anonIri);
          if (state.annotationProperties[s.value]) state.annotationProperties[s.value].domain.push(anonIri);

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

          // ensure class exists even without explicit declaration axiom
          const cls = ensureClass(o.value);
          cls.objectProperties.push(s.value);

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

	  
	  // DatatypeProperty range can be:
		// 1) built-in datatype
		// 2) imported/custom datatype, e.g. n0:Gender a rdfs:Datatype
		// 3) complex datatype expression bnode
		if (state.dataProperties[s.value]) {
		  if (o.termType === 'NamedNode') {
			state.dataProperties[s.value].range.push(o.value);

			if (isDatatype(o.value) || state.dataTypes?.[o.value]) {
			  // this is a datatype, do NOT create a class
			  ensureDatatype(o.value);
			} else {
			  // Fallback only for non-declared unknown ranges
			  // You may keep this if OWLGrEd allows class-like values here,
			  // but for normal OWL datatype properties this should rarely happen.
			  const cls = ensureClass(o.value);
			  cls.dataProperties.push(s.value);
			}
		  } else if (o.termType === 'BlankNode') {
			const man = serializeDataRangeForUI_RDFlib(
			  store, o, prefixes,
			  $rdf, RDF, OWL, XSD,
			  getDatatypeLocalName,
			  iriToPrefixed
			);
			if (man) state.dataProperties[s.value].rangeExpression = man;
		  }
		}

      // For annotation properties, range can be Class/IRI/Literal
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
		  propertyChains: [],
		  Qualifiers: []
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
			propertyChains: [],
			Qualifiers: []
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
          const quads = store.match(rTerm, null, null, null);
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
          ? $rdf.sym(OWL + 'distinctMembers')
          : $rdf.sym(OWL + 'members');

      const head = store.match(s, listPred, null, null)[0]?.object;
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
	  const src = store.match(s, $rdf.sym(OWL + 'sourceIndividual'), null, null)[0]?.object;
	  const ap  = store.match(s, $rdf.sym(OWL + 'assertionProperty'), null, null)[0]?.object;
	  const tgtI = store.match(s, $rdf.sym(OWL + 'targetIndividual'), null, null)[0]?.object;
	  const tgtV = store.match(s, $rdf.sym(OWL + 'targetValue'), null, null)[0]?.object;

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
	
	// Positive individual property assertions:
	// :Anna :studentName "Anna" .
	// :Anna :takes :CS .
	if (
	  s.termType === 'NamedNode' &&
	  state.individuals[s.value]
	) {
	  if (ontologySubjects.has(termKey(s))) {
		continue;
	  }

	  const structuralPredsForFacts = new Set([
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
		OWL  + 'unionOf',
		OWL  + 'intersectionOf',
		OWL  + 'complementOf',
		OWL  + 'oneOf'
	  ]);

	  const isKnownAnn =
		state.isAnnotationProp.has(p.value) || builtInAnnProps.includes(p.value);

	  if (!isKnownAnn && !structuralPredsForFacts.has(p.value)) {
		const ind = ensureIndividual(s.value);

		// Data property assertion
		if (o.termType === 'Literal') {
		  if (!state.dataProperties[p.value]) {
			state.dataProperties[p.value] = {
			  iri: p.value,
			  prefixed: iriToPrefixed(p.value, prefixes),
			  label: null,
			  annotations: [],
			  kind: 'DatatypeProperty',
			  domain: [],
			  range: [],
			  characteristics: {},
			  Qualifiers: []
			};
		  }

		  state.isDataProp.add(p.value);

		  ind.dataFacts ||= [];
		  ind.dataFacts.push({
			p: p.value,
			value: o.value,
			lang: o.language || null,
			dt: o.datatype?.value || null,
			negative: false
		  });

		  continue;
		}

		// Object property assertion
		if (o.termType === 'NamedNode') {
		  if (!state.objectProperties[p.value]) {
			state.objectProperties[p.value] = {
			  iri: p.value,
			  prefixed: iriToPrefixed(p.value, prefixes),
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
			  propertyChains: [],
			  Qualifiers: []
			};
		  }

		  state.isObjectProp.add(p.value);

		  ensureIndividual(o.value);

		  ind.objFacts ||= [];
		  ind.objFacts.push({
			p: p.value,
			object: o.value,
			negative: false
		  });

		  continue;
		}
	  }
	}
	
	// Annotation assertion on a named subject.
	// If predicate is built-in OR declared annotation property OR custom undeclared,
	// treat it as an annotation property and keep the assertion.
	if (s.termType === 'NamedNode') {
		if (ontologySubjects.has(termKey(s))) {
		continue; // ontology annotation, do not create instance box
	  }
	  const isKnownAnn =
		state.isAnnotationProp.has(p.value) || builtInAnnProps.includes(p.value);

	  // Skip structural predicates here; they are handled elsewhere
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

	  const isKnownObjectOrDataProperty =
	  state.isObjectProp.has(p.value) ||
	  state.isDataProp.has(p.value) ||
	  !!state.objectProperties[p.value] ||
	  !!state.dataProperties[p.value];

	if ((isKnownAnn || !structuralPreds.has(p.value)) && !isKnownObjectOrDataProperty) {
		if (!isKnownAnn) {
		  ensureAnnotationProperty(p.value);
		}

		const entity =
		  state.classes[s.value] ||
		  state.objectProperties[s.value] ||
		  state.dataProperties[s.value] ||
		  state.annotationProperties[s.value] ||
		  state.dataTypes?.[s.value] ||
		  state.individuals[s.value] ||
		  ensureIndividual(s.value);

		entity.annotations.push({
		  p: p.value,
		  v: o.termType === 'Literal' ? o.value : o.value,
		  dt: o.termType === 'Literal' ? (o.datatype ? o.datatype.value : null) : undefined,
		  lang: o.termType === 'Literal' ? (o.language || null) : undefined
		});
		continue;
	  }
	}

    // Individual facts
    // if (state.individuals[s.value]) {
      // if (o.termType === 'Literal') {
        // state.individuals[s.value].dataFacts.push({ p: p.value, value: o.value, lang: o.language, dt: o.datatype?.value });
      // } else if (o.termType === 'NamedNode') {
        // state.individuals[s.value].objFacts.push({ p: p.value, object: o.value });
      // }
      // continue;
    // }
  }
  
  // Default missing domains/ranges to owl:Thing only when needed

  // Object properties:
  // if no domain -> owl:Thing
  // if no range  -> owl:Thing
  for (const prop of Object.values(state.objectProperties)) {
    prop.domain ||= [];
    prop.range ||= [];

    if (prop.domain.length === 0) {
      prop.domain.push(OWL + 'Thing');

      const owlThingClass = ensureClass(OWL + 'Thing');
      if (!owlThingClass.objectProperties.includes(prop.iri)) {
        owlThingClass.objectProperties.push(prop.iri);
      }
    }

    if (prop.range.length === 0) {
      prop.range.push(OWL + 'Thing');

      const owlThingClass = ensureClass(OWL + 'Thing');
      if (!owlThingClass.objectProperties.includes(prop.iri)) {
        owlThingClass.objectProperties.push(prop.iri);
      }
    }
  }

  // Data properties:
  // if no domain -> owl:Thing
  for (const prop of Object.values(state.dataProperties)) {
    prop.domain ||= [];

    if (prop.domain.length === 0) {
      prop.domain.push(OWL + 'Thing');

      const owlThingClass = ensureClass(OWL + 'Thing');
      if (!owlThingClass.dataProperties.includes(prop.iri)) {
        owlThingClass.dataProperties.push(prop.iri);
      }
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

function getDatatypeLocalName2(iri) {
  if (!iri || typeof iri !== 'string') return null;
  if (iri.startsWith(XSD)) return iri.slice(XSD.length);
  if (iri.startsWith(RDFS)) return iri.slice(RDFS.length);
  if (iri.startsWith(RDF)) return iri.slice(RDF.length);
  if (iri.startsWith(OWL)) return iri.slice(OWL.length);
  return null;
}

function formatCardinalityRange({
  cardinality = null,
  minCardinality = null,
  maxCardinality = null,
  qualifiedCardinality = null,
  minQualifiedCardinality = null,
  maxQualifiedCardinality = null
} = {}) {
  const exact = qualifiedCardinality ?? cardinality;
  if (Number.isFinite(exact)) return `${exact}..${exact}`;

  const min = minQualifiedCardinality ?? minCardinality;
  const max = maxQualifiedCardinality ?? maxCardinality;

  if (Number.isFinite(min) && Number.isFinite(max)) return `${min}..${max}`;
  if (Number.isFinite(min)) return `${min}..*`;
  if (Number.isFinite(max)) return `0..${max}`;

  return null;
}

function extendWithQualifierAnnotationsRDFlib(store, structure, prefixes = {}) {
  const QUALIFIER_IRI =
    structure.qualifierAnnotationProperty ||
    'http://lumii.lv/2011/1.0/extended#qualifier';

  const annotatedPropertyPred = $rdf.sym(OWL + 'annotatedProperty');
  const annotatedSourcePred = $rdf.sym(OWL + 'annotatedSource');
  const annotatedTargetPred = $rdf.sym(OWL + 'annotatedTarget');
  const rdfTypePred = $rdf.sym(RDF + 'type');
  const owlAxiomNode = $rdf.sym(OWL + 'Axiom');
  const qualifierPred = $rdf.sym(QUALIFIER_IRI);

  const getPropertyBucket = (iri) =>
    structure.objectProperties?.[iri] ||
    structure.dataProperties?.[iri] ||
    null;

  const getOrCreateQualifier = (propertyBucket, targetIri) => {
    propertyBucket.Qualifiers ||= [];

    let qualifier = propertyBucket.Qualifiers.find(q => q && q._iri === targetIri);
    if (!qualifier) {
      qualifier = {
        Property: iriToPrefixed(targetIri, prefixes),
        Type: null,
        Multiplicity: null,
        _iri: targetIri
      };
      propertyBucket.Qualifiers.push(qualifier);
    }
    return qualifier;
  };

  // direct assertions:
  // :p ex:qualifier :dateFrom , :dateTo .
  for (const st of store.match(null, qualifierPred, null, null)) {
    const s = st.subject;
    const o = st.object;

    if (s.termType !== 'NamedNode' || o.termType !== 'NamedNode') continue;

    const propertyBucket = getPropertyBucket(s.value);
    if (!propertyBucket) continue;

    getOrCreateQualifier(propertyBucket, o.value);
  }

  // annotated assertions:
  // [] a owl:Axiom ;
  //    owl:annotatedSource :p ;
  //    owl:annotatedProperty ex:qualifier ;
  //    owl:annotatedTarget :dateFrom ;
  //    rdfs:range xsd:dateTime ;
  //    owl:maxCardinality 1 .
  for (const axiomSt of store.match(null, rdfTypePred, owlAxiomNode, null)) {
    const axiomNode = axiomSt.subject;

    const annotatedProperty =
      store.match(axiomNode, annotatedPropertyPred, null, null)[0]?.object;
    if (annotatedProperty?.termType !== 'NamedNode') continue;
    if (annotatedProperty.value !== QUALIFIER_IRI) continue;

    const annotatedSource =
      store.match(axiomNode, annotatedSourcePred, null, null)[0]?.object;
    const annotatedTarget =
      store.match(axiomNode, annotatedTargetPred, null, null)[0]?.object;

    if (annotatedSource?.termType !== 'NamedNode') continue;
    if (annotatedTarget?.termType !== 'NamedNode') continue;

    const propertyBucket = getPropertyBucket(annotatedSource.value);
    if (!propertyBucket) continue;

    const qualifier = getOrCreateQualifier(propertyBucket, annotatedTarget.value);

    const rangeObj =
      store.match(axiomNode, $rdf.sym(RDFS + 'range'), null, null)[0]?.object;
    if (rangeObj?.termType === 'NamedNode') {
      qualifier.Type =
        getDatatypeLocalName2(rangeObj.value) ||
        iriToPrefixed(rangeObj.value, prefixes);
    }

    const litToInt = (predicateIri) => {
      const lit = store.match(axiomNode, $rdf.sym(predicateIri), null, null)[0]?.object;
      return lit?.termType === 'Literal' ? Number(lit.value) : null;
    };

    const multiplicity = formatCardinalityRange({
      cardinality: litToInt(OWL + 'cardinality'),
      minCardinality: litToInt(OWL + 'minCardinality'),
      maxCardinality: litToInt(OWL + 'maxCardinality'),
      qualifiedCardinality: litToInt(OWL + 'qualifiedCardinality'),
      minQualifiedCardinality: litToInt(OWL + 'minQualifiedCardinality'),
      maxQualifiedCardinality: litToInt(OWL + 'maxQualifiedCardinality')
    });

    if (multiplicity !== null) {
      qualifier.Multiplicity = multiplicity;
    }
  }

  // cleanup helper field and dedup
  for (const bucketMap of [structure.objectProperties, structure.dataProperties]) {
    for (const iri of Object.keys(bucketMap || {})) {
      const propertyBucket = bucketMap[iri];
      if (!propertyBucket) continue;

      if (!Array.isArray(propertyBucket.Qualifiers)) {
        propertyBucket.Qualifiers = [];
        continue;
      }

      const seen = new Set();
      propertyBucket.Qualifiers = propertyBucket.Qualifiers.filter(q => {
        if (!q || !q._iri) return false;
        if (seen.has(q._iri)) return false;
        seen.add(q._iri);
        delete q._iri;
        return true;
      });
    }
  }

  return structure;
}

function extendWithAnnotationsRDFlib(store, structure) {
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
  const ontologyQuads = store.match(null, $rdf.sym(RDF + 'type'), $rdf.sym(OWL + 'Ontology'), null);
  if (ontologyQuads.length > 0) {
    const ontologyNode = ontologyQuads[0].subject;
    // Initialize ontology entry in the structure
    structure.ontology = {
      iri: ontologyNode.termType === 'NamedNode' ? ontologyNode.value : null,
      annotations: []
    };
    // Traverse all triples with the ontology as subject
    for (const { predicate: p, object: o } of store.match(ontologyNode, null, null, null)) {
      if (p.value === RDF + 'type') continue; // skip owl:Ontology type triple
      if (p.value === RDFS + 'label' && o.termType === 'Literal') {
        // Capture ontology label separately (avoid duplicating label)
        structure.ontology.label = o.value;
        continue;
      }
      // Only capture triples where predicate is an annotation property
      if (structuralPreds.has(p.value)) continue;
      if (structuralPreds.has(p.value)) continue;

	  if (!structure.isAnnotationProp.has(p.value) && !builtInAnnProps.includes(p.value)) {
		  if (!structure.annotationProperties[p.value]) {
			structure.annotationProperties[p.value] = {
			  iri: p.value,
			  prefixed: iriToPrefixed(p.value, structure.prefixes),
			  label: null,
			  annotations: [],
			  kind: 'AnnotationProperty',
			  domain: [],
			  range: [],
			  superProperties: [],
			  Qualifiers: []
			};
		  }
		  structure.isAnnotationProp.add(p.value);
	  }
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
        ? (iri.startsWith('_:') ? $rdf.blankNode(iri.slice(2)) : $rdf.blankNode(iri))
        : $rdf.sym(iri);
      // Get all triples for this subject
      for (const { predicate: p, object: o } of store.match(subjectTerm, null, null, null)) {
        if (p.value === RDFS + 'label') continue;             // skip labels (already handled)
        if (structuralPreds.has(p.value)) continue;          // skip structural triples
        if (structuralPreds.has(p.value)) continue;

		if (!structure.isAnnotationProp.has(p.value) && !builtInAnnProps.includes(p.value)) {
		  if (!structure.annotationProperties[p.value]) {
			structure.annotationProperties[p.value] = {
			  iri: p.value,
			  prefixed: iriToPrefixed(p.value, structure.prefixes),
			  label: null,
			  annotations: [],
			  kind: 'AnnotationProperty',
			  domain: [],
			  range: [],
			  superProperties: [],
			  Qualifiers: []
			};
		  }
		  structure.isAnnotationProp.add(p.value);
		}
		if (structure.isAnnotationProp.has(p.value) && !isBlank) continue; // avoid duplicating annotations already handled in routeTriplesN3
        // Add the annotation assertion to the entity
        addAnnotation(entity, p.value, o);
      }
    }
  }

  return structure;
}

// ---- helper functions (datatype & class expression serialization, RDF lists, etc.) ----
function parseRdfList(store, head) {
  // rdflib.js often parses Turtle lists `( ... )` as a Collection with `.elements`
  if (head && head.termType === 'Collection') {
    return head.elements || [];
  }

  const RDF_FIRST = $rdf.sym(RDF + 'first');
  const RDF_REST  = $rdf.sym(RDF + 'rest');
  const RDF_NIL   = $rdf.sym(RDF + 'nil');

  const out = [];
  let cur = head;

  if (!cur) return [];

  // If it's not a BlankNode, treat as single-item "list"
  if (cur.termType !== 'BlankNode') return [cur];

  const seen = new Set();

  while (cur && cur.termType === 'BlankNode' && !seen.has(cur.value)) {
    seen.add(cur.value);

    const first = store.match(cur, RDF_FIRST, null, null)[0]?.object;
    if (!first) break;
    out.push(first);

    const rest = store.match(cur, RDF_REST, null, null)[0]?.object;
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

  const get1 = (pIri) => store.match(term, $rdf.sym(pIri), null, null)[0]?.object || null;

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

        const quads = store.match(rTerm, null, null, null);
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







// ----------------------------------------------------------
// =========================
// RDFlib.js versions of Manchester datatype + class-expression serializers
// Based on import_OWLGrEd.js logic, replacing store.getQuads(...) with store.match(...)
// =========================

// RDFlib helpers (no N3 adapters; just rdflib idioms)
function _sym($rdf, iri) { return $rdf.sym(iri); }
function _match(store, s, p, o) { return store.match(s || null, p || null, o || null, null); }
function _firstObj(store, s, p) {
  const st = _match(store, s, p, null);
  return st && st.length ? st[0].object : null;
}

// -------------------------
// Read an RDF list (rdf:first/rest ... rdf:nil) into an array of terms (RDFlib)
// (N3 original: parseRdfList) :contentReference[oaicite:2]{index=2}
// -------------------------
function parseRdfListRDFlib(store, head, $rdf, RDF) {
    // Turtle (...) often becomes a Collection in rdflib
  if (head && head.termType === "Collection") {
    return head.elements || [];
  }

  const RDF_FIRST = $rdf.sym(RDF + "first");
  const RDF_REST  = $rdf.sym(RDF + "rest");
  const RDF_NIL   = $rdf.sym(RDF + "nil");

  const out = [];
  let cur = head;

  if (!cur) return [];
  if (cur.termType !== "BlankNode") return [cur];

  const seen = new Set();
  while (cur && cur.termType === "BlankNode" && !seen.has(cur.value)) {
    seen.add(cur.value);

    const firstSt = store.match(cur, RDF_FIRST, null, null);
    if (!firstSt.length) break;
    out.push(firstSt[0].object);

    const restSt = store.match(cur, RDF_REST, null, null);
    if (!restSt.length) break;

    const rest = restSt[0].object;
    if (rest.termType === "NamedNode" && rest.value === RDF_NIL.value) break;
    cur = rest;
  }
  return out;
}

// -------------------------
// Datatype (data range) expression import helpers (RDFlib)
// Matches your N3 block: XSD_FACET_TO_MANCHESTER + literalToManchester + serializeDataRange + serializeDataRangeForUI 
// -------------------------

function escapeQuotedString_RDFlib(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function datatypeIriToManchester_RDFlib(iri, prefixes = {}, getDatatypeLocalName, iriToPrefixed) {
  if (!iri) return null;
  const builtIn = getDatatypeLocalName(iri);
  if (builtIn) return builtIn;
  return iriToPrefixed(iri, prefixes);
}

function literalToManchester_RDFlib(lit, prefixes = {}, XSD, RDF, getDatatypeLocalName, iriToPrefixed) {
  if (!lit) return null;

  // RDFlib term types: NamedNode | BlankNode | Literal
  if (lit.termType !== "Literal") {
    if (lit.termType === "NamedNode") return iriToPrefixed(lit.value, prefixes);
    return null;
  }

  const dtIri = lit.datatype && lit.datatype.value ? lit.datatype.value : null;
  const lang = lit.language || "";

  if (lang) {
    return `"${escapeQuotedString_RDFlib(lit.value)}"@${lang}`;
  }

  if (!dtIri || dtIri === XSD + "string" || dtIri === RDF + "langString") {
    return `"${escapeQuotedString_RDFlib(lit.value)}"`;
  }

  const v = String(lit.value).trim();
  if (/^[+-]?\d+$/.test(v) || /^[+-]?\d+\.\d+$/.test(v) || /^[+-]?(?:\d+\.)?\d+[eE][+-]?\d+(?:[fF])?$/.test(v)) {
    return v;
  }

  const dtName = datatypeIriToManchester_RDFlib(dtIri, prefixes, getDatatypeLocalName, iriToPrefixed);
  return `"${escapeQuotedString_RDFlib(lit.value)}"^^${dtName}`;
}

// Map XSD facets (same as N3) :contentReference[oaicite:4]{index=4}
function XSD_FACET_TO_MANCHESTER_RDFlib(XSD, RDF) {
  return {
    [XSD + "minExclusive"]: ">",
    [XSD + "minInclusive"]: ">=",
    [XSD + "maxExclusive"]: "<",
    [XSD + "maxInclusive"]: "<=",
    [XSD + "length"]: "length",
    [XSD + "maxLength"]: "maxLength",
    [XSD + "minLength"]: "minLength",
    [XSD + "pattern"]: "pattern",
    [RDF + "langRange"]: "langPattern",
  };
}

// Serialize an OWL2 datatype expression node to Manchester datatype expression (RDFlib)
// Returns { text, needsParens } 
function serializeDataRange_RDFlib(
  store,
  term,
  prefixes,
  visited,
  $rdf,
  RDF,
  OWL,
  XSD,
  getDatatypeLocalName,
  iriToPrefixed
) {
  if (!term) return { text: null, needsParens: false };

  if (term.termType === "NamedNode") {
    return { text: datatypeIriToManchester_RDFlib(term.value, prefixes, getDatatypeLocalName, iriToPrefixed), needsParens: false };
  }

  if (term.termType === "Literal") {
    return { text: literalToManchester_RDFlib(term, prefixes, XSD, RDF, getDatatypeLocalName, iriToPrefixed), needsParens: false };
  }

  if (term.termType !== "BlankNode") return { text: null, needsParens: false };

  if (visited.has(term.value)) return { text: null, needsParens: false };
  visited.add(term.value);

  const get1 = (pIri) => _firstObj(store, term, _sym($rdf, pIri));

  // intersectionOf / unionOf
  const inter = get1(OWL + "intersectionOf");
  if (inter) {
    const items = parseRdfListRDFlib(store, inter, $rdf, RDF);
    const parts = items.map(t => serializeDataRange_RDFlib(store, t, prefixes, visited, $rdf, RDF, OWL, XSD, getDatatypeLocalName, iriToPrefixed).text).filter(Boolean);
    return { text: parts.join(" and "), needsParens: true };
  }

  const uni = get1(OWL + "unionOf");
  if (uni) {
    const items = parseRdfListRDFlib(store, uni, $rdf, RDF);
    const parts = items.map(t => serializeDataRange_RDFlib(store, t, prefixes, visited, $rdf, RDF, OWL, XSD, getDatatypeLocalName, iriToPrefixed).text).filter(Boolean);
    return { text: parts.join(" or "), needsParens: true };
  }

  // datatypeComplementOf
  const comp = get1(OWL + "datatypeComplementOf");
  if (comp) {
    const inner = serializeDataRange_RDFlib(store, comp, prefixes, visited, $rdf, RDF, OWL, XSD, getDatatypeLocalName, iriToPrefixed);
    const innerTxt = inner.text ? (inner.needsParens ? `(${inner.text})` : inner.text) : null;
    return { text: innerTxt ? `not ${innerTxt}` : null, needsParens: true };
  }

  // oneOf (datatype enumeration)
  const oneOf = get1(OWL + "oneOf");
  if (oneOf) {
    const items = parseRdfListRDFlib(store, oneOf, $rdf, RDF);
    const parts = items
      .map(t => literalToManchester_RDFlib(t, prefixes, XSD, RDF, getDatatypeLocalName, iriToPrefixed))
      .filter(Boolean);
    return { text: `{ ${parts.join(", ")} }`, needsParens: true };
  }

  // onDatatype + withRestrictions
  const onDt = get1(OWL + "onDatatype");
  const withR = get1(OWL + "withRestrictions");
  if (onDt && onDt.termType === "NamedNode") {
    const base = datatypeIriToManchester_RDFlib(onDt.value, prefixes, getDatatypeLocalName, iriToPrefixed);
    if (withR) {
      const restrItems = parseRdfListRDFlib(store, withR, $rdf, RDF);
      const parts = [];
      const facetMap = XSD_FACET_TO_MANCHESTER_RDFlib(XSD, RDF);

      for (const rTerm of restrItems) {
        if (!rTerm || rTerm.termType !== "BlankNode") continue;

        let facetPred = null;
        let facetObj = null;

        const qs = _match(store, rTerm, null, null);
        for (const st of qs) {
          const mp = facetMap[st.predicate.value];
          if (mp) {
            facetPred = mp;
            facetObj = st.object;
            break;
          }
        }
        if (!facetPred || !facetObj) continue;

        const vTxt =
          facetObj.termType === "Literal"
            ? literalToManchester_RDFlib(facetObj, prefixes, XSD, RDF, getDatatypeLocalName, iriToPrefixed)
            : facetObj.termType === "NamedNode"
              ? iriToPrefixed(facetObj.value, prefixes)
              : null;

        if (vTxt) parts.push(`${facetPred} ${vTxt}`);
      }

      if (parts.length > 0) {
        return { text: `${base}[${parts.join(", ")}]`, needsParens: true };
      }
    }
    return { text: base, needsParens: true };
  }

  return { text: null, needsParens: false };
}

// Convenience: wrap complex expressions with parentheses for UI compartments
// (N3 original: serializeDataRangeForUI) :contentReference[oaicite:6]{index=6}
function serializeDataRangeForUI_RDFlib(
  store,
  term,
  prefixes,
  $rdf,
  RDF,
  OWL,
  XSD,
  getDatatypeLocalName,
  iriToPrefixed
) {
  const res = serializeDataRange_RDFlib(store, term, prefixes || {}, new Set(), $rdf, RDF, OWL, XSD, getDatatypeLocalName, iriToPrefixed);
  if (!res.text) return null;
  return res.needsParens ? `(${res.text})` : res.text;
}

// -------------------------
// Class expression import helpers (Manchester) (RDFlib)
// Mirrors your N3 serializeClassExpressionForUI + dependencies after datatype block 
// -------------------------

function termLooksLikeDatatypeIri_RDFlib(iri, RDF, RDFS, OWL, XSD, getDatatypeLocalName) {
  if (!iri) return false;
  return (
    iri.startsWith(XSD) ||
    iri === RDFS + "Literal" ||
    iri === RDF + "langString" ||
    iri === RDF + "PlainLiteral" ||
    iri === OWL + "real" ||
    iri === OWL + "rational" ||
    !!getDatatypeLocalName(iri)
  );
}

function serializeSomePrimary_RDFlib(
  store,
  term,
  prefixes,
  visited,
  $rdf,
  RDF,
  RDFS,
  OWL,
  XSD,
  getDatatypeLocalName,
  iriToPrefixed,
  formatDatatypeForUI
) {
  if (!term) return null;

  if (term.termType === "NamedNode") {
    return termLooksLikeDatatypeIri_RDFlib(term.value, RDF, RDFS, OWL, XSD, getDatatypeLocalName)
      ? formatDatatypeForUI(term.value, { prefixes }) // or pass ontology object if you have it
      : iriToPrefixed(term.value, prefixes);
  }

  if (term.termType === "Literal") {
    return literalToManchester_RDFlib(term, prefixes, XSD, RDF, getDatatypeLocalName, iriToPrefixed);
  }

  if (term.termType !== "BlankNode") return null;

  // If blank node is a datatype expression, serialize as datatype range
  const dtTxt = serializeDataRange_RDFlib(store, term, prefixes, visited, $rdf, RDF, OWL, XSD, getDatatypeLocalName, iriToPrefixed);
  if (dtTxt && dtTxt.text) return dtTxt.needsParens ? `(${dtTxt.text})` : dtTxt.text;

  // Else treat as class expression
  const ce = serializeClassExpression_RDFlib(store, term, prefixes, visited, $rdf, RDF, OWL, XSD, getDatatypeLocalName, iriToPrefixed, formatDatatypeForUI, RDFS);
  if (ce && ce.text) return ce.needsParens ? `(${ce.text})` : ce.text;

  return null;
}

function serializeRestriction_RDFlib(
  store,
  bn,
  prefixes,
  visited,
  $rdf,
  RDF,
  RDFS,
  OWL,
  XSD,
  getDatatypeLocalName,
  iriToPrefixed,
  formatDatatypeForUI
) {
  // Must be owl:Restriction
  const isRestr = _match(store, bn, _sym($rdf, RDF + "type"), _sym($rdf, OWL + "Restriction")).length > 0;
  if (!isRestr) return null;

  // onProperty, incl inverse form
  let onProp = _firstObj(store, bn, _sym($rdf, OWL + "onProperty"));
  let inverse = false;
  let propTxt = null;

  if (onProp) {
    if (onProp.termType === "NamedNode") {
      propTxt = iriToPrefixed(onProp.value, prefixes);
    } else if (onProp.termType === "BlankNode") {
      const inv = _firstObj(store, onProp, _sym($rdf, OWL + "inverseOf"));
      if (inv && inv.termType === "NamedNode") {
        inverse = true;
        propTxt = `inverse (${iriToPrefixed(inv.value, prefixes)})`;
      }
    }
  }

  if (!propTxt) return null;

  // some / only
  const some = _firstObj(store, bn, _sym($rdf, OWL + "someValuesFrom"));
  if (some) {
    const filler = serializeSomePrimary_RDFlib(store, some, prefixes, visited, $rdf, RDF, RDFS, OWL, XSD, getDatatypeLocalName, iriToPrefixed, formatDatatypeForUI);
    return filler ? { text: `${propTxt} some ${filler}`, needsParens: true } : null;
  }

  const all = _firstObj(store, bn, _sym($rdf, OWL + "allValuesFrom"));
  if (all) {
    const filler = serializeSomePrimary_RDFlib(store, all, prefixes, visited, $rdf, RDF, RDFS, OWL, XSD, getDatatypeLocalName, iriToPrefixed, formatDatatypeForUI);
    return filler ? { text: `${propTxt} only ${filler}`, needsParens: true } : null;
  }

  // value
  const hv = _firstObj(store, bn, _sym($rdf, OWL + "hasValue"));
  if (hv) {
    const vTxt =
      hv.termType === "NamedNode"
        ? iriToPrefixed(hv.value, prefixes)
        : hv.termType === "Literal"
          ? literalToManchester_RDFlib(hv, prefixes, XSD, RDF, getDatatypeLocalName, iriToPrefixed)
          : null;
    return vTxt ? { text: `${propTxt} value ${vTxt}`, needsParens: true } : null;
  }

  // Self
  const hasSelf = _firstObj(store, bn, _sym($rdf, OWL + "hasSelf"));
  if (hasSelf && hasSelf.termType === "Literal" && String(hasSelf.value) === "true") {
    return { text: `${propTxt} Self`, needsParens: true };
  }

  // Cardinalities (min/max/exactly, qualified/unqualified)
  const litNum = (t) => (t && t.termType === "Literal" ? Number(t.value) : null);

  const card = litNum(_firstObj(store, bn, _sym($rdf, OWL + "cardinality")));
  const minC = litNum(_firstObj(store, bn, _sym($rdf, OWL + "minCardinality")));
  const maxC = litNum(_firstObj(store, bn, _sym($rdf, OWL + "maxCardinality")));

  const qCard = litNum(_firstObj(store, bn, _sym($rdf, OWL + "qualifiedCardinality")));
  const qMin  = litNum(_firstObj(store, bn, _sym($rdf, OWL + "minQualifiedCardinality")));
  const qMax  = litNum(_firstObj(store, bn, _sym($rdf, OWL + "maxQualifiedCardinality")));

  const onClass = _firstObj(store, bn, _sym($rdf, OWL + "onClass"));
  const onDR    = _firstObj(store, bn, _sym($rdf, OWL + "onDataRange"));

  const qualFiller = onClass || onDR;
  const qualTxt = qualFiller
    ? serializeSomePrimary_RDFlib(store, qualFiller, prefixes, visited, $rdf, RDF, RDFS, OWL, XSD, getDatatypeLocalName, iriToPrefixed, formatDatatypeForUI)
    : null;

  const mk = (kw, n, filler) => filler ? `${propTxt} ${kw} ${n} ${filler}` : `${propTxt} ${kw} ${n}`;

  if (qCard !== null) return { text: mk("exactly", qCard, qualTxt), needsParens: true };
  if (qMin  !== null) return { text: mk("min",     qMin,  qualTxt), needsParens: true };
  if (qMax  !== null) return { text: mk("max",     qMax,  qualTxt), needsParens: true };

  if (card !== null) return { text: mk("exactly", card, null), needsParens: true };
  if (minC !== null) return { text: mk("min",     minC, null), needsParens: true };
  if (maxC !== null) return { text: mk("max",     maxC, null), needsParens: true };

  return null;
}

function serializeClassExpression_RDFlib(
  store,
  term,
  prefixes,
  visited,
  $rdf,
  RDF,
  OWL,
  XSD,
  getDatatypeLocalName,
  iriToPrefixed,
  formatDatatypeForUI,
  RDFS
) {
  if (!term) return { text: null, needsParens: false };

  if (term.termType === "NamedNode") {
    return { text: iriToPrefixed(term.value, prefixes), needsParens: false };
  }

  if (term.termType === "Literal") {
    return {
      text: literalToManchester_RDFlib(term, prefixes, XSD, RDF, getDatatypeLocalName, iriToPrefixed),
      needsParens: false
    };
  }

  if (term.termType !== "BlankNode") return { text: null, needsParens: false };

  if (visited.has(term.value)) return { text: null, needsParens: false };
  visited.add(term.value);

  // Restriction?
  const r = serializeRestriction_RDFlib(store, term, prefixes, visited, $rdf, RDF, RDFS, OWL, XSD, getDatatypeLocalName, iriToPrefixed, formatDatatypeForUI);
  if (r && r.text) return r;

  // complementOf
  const comp = _firstObj(store, term, _sym($rdf, OWL + "complementOf"));
  if (comp) {
    const inner = serializeClassExpression_RDFlib(store, comp, prefixes, visited, $rdf, RDF, OWL, XSD, getDatatypeLocalName, iriToPrefixed, formatDatatypeForUI, RDFS);
    const innerTxt = inner.text ? (inner.needsParens ? `(${inner.text})` : inner.text) : null;
    return { text: innerTxt ? `not ${innerTxt}` : null, needsParens: true };
  }

  // intersectionOf / unionOf
  const inter = _firstObj(store, term, _sym($rdf, OWL + "intersectionOf"));
  if (inter) {
    const items = parseRdfListRDFlib(store, inter, $rdf, RDF);
    const parts = items.map(t => {
      const rr = serializeClassExpression_RDFlib(store, t, prefixes, visited, $rdf, RDF, OWL, XSD, getDatatypeLocalName, iriToPrefixed, formatDatatypeForUI, RDFS);
      return rr.text ? (rr.needsParens ? `(${rr.text})` : rr.text) : null;
    }).filter(Boolean);
    return { text: parts.join(" and "), needsParens: true };
  }

  const uni = _firstObj(store, term, _sym($rdf, OWL + "unionOf"));
  if (uni) {
    const items = parseRdfListRDFlib(store, uni, $rdf, RDF);
    const parts = items.map(t => {
      const rr = serializeClassExpression_RDFlib(store, t, prefixes, visited, $rdf, RDF, OWL, XSD, getDatatypeLocalName, iriToPrefixed, formatDatatypeForUI, RDFS);
      return rr.text ? (rr.needsParens ? `(${rr.text})` : rr.text) : null;
    }).filter(Boolean);
    return { text: parts.join(" or "), needsParens: true };
  }

  // oneOf (class enumeration)
  const oneOf = _firstObj(store, term, _sym($rdf, OWL + "oneOf"));
  if (oneOf) {
    const items = parseRdfListRDFlib(store, oneOf, $rdf, RDF);
    const parts = items.map(t => {
      if (t.termType === "NamedNode") return iriToPrefixed(t.value, prefixes);
      if (t.termType === "Literal") return literalToManchester_RDFlib(t, prefixes, XSD, RDF, getDatatypeLocalName, iriToPrefixed);
      return null;
    }).filter(Boolean);
    return { text: `{ ${parts.join(", ")} }`, needsParens: true };
  }

  return { text: null, needsParens: false };
}

function serializeClassExpressionForUI_RDFlib(
  store,
  term,
  prefixes,
  $rdf,
  RDF,
  OWL,
  XSD,
  getDatatypeLocalName,
  iriToPrefixed,
  formatDatatypeForUI,
  RDFS
) {
  const res = serializeClassExpression_RDFlib(
    store,
    term,
    prefixes || {},
    new Set(),
    $rdf,
    RDF,
    OWL,
    XSD,
    getDatatypeLocalName,
    iriToPrefixed,
    formatDatatypeForUI,
    RDFS
  );
  if (!res.text) return null;
  return res.needsParens ? `(${res.text})` : res.text;
}

// -------------------------
// Key and chain helpers (RDFlib)
// Mirrors parseKeyItem / parseChainItem / getComplementTargetIri in your file :contentReference[oaicite:8]{index=8}
// -------------------------

function parseKeyItem_RDFlib(store, term, state, $rdf, OWL) {
  if (!term) return null;

  if (term.termType === "BlankNode") {
    const inv = _firstObj(store, term, _sym($rdf, OWL + "inverseOf"));
    if (inv && inv.termType === "NamedNode") {
      return { iri: inv.value, inverse: true, kind: "object" };
    }
    return null;
  }

  if (term.termType === "NamedNode") {
    const iri = term.value;
    const isOP = state.isObjectProp?.has?.(iri) || !!state.objectProperties?.[iri];
    const isDP = state.isDataProp?.has?.(iri)   || !!state.dataProperties?.[iri];
    const kind = isOP ? "object" : (isDP ? "data" : null);
    return { iri, inverse: false, kind };
  }

  return null;
}

function parseChainItem_RDFlib(store, term, $rdf, OWL) {
  if (!term) return null;

  if (term.termType === "NamedNode") return { iri: term.value, inverse: false };

  if (term.termType === "BlankNode") {
    const inv = _firstObj(store, term, _sym($rdf, OWL + "inverseOf"));
    if (inv && inv.termType === "NamedNode") return { iri: inv.value, inverse: true };
  }
  return null;
}

function getComplementTargetIri_RDFlib(store, bn, $rdf, RDF, OWL) {
  if (!bn || bn.termType !== "BlankNode") return null;

  const hasClassType = _match(store, bn, _sym($rdf, RDF + "type"), _sym($rdf, OWL + "Class")).length > 0;

  const compObj = _firstObj(store, bn, _sym($rdf, OWL + "complementOf"));
  if (!compObj) return null;

  if (compObj.termType === "NamedNode") return compObj.value;

  // If complement points to another expression, you can still return null here
  // (your N3 version tries to serialize; keep the same behavior if needed)
  if (!hasClassType) return null;

  return null;
}
// ----------------------------------------------------------















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
  const onProp = store.match(bn, $rdf.sym(OWL + 'onProperty'), null, null)[0]?.object || null;
  let inverse = false;
  let propIri = null;

  if (onProp?.termType === 'NamedNode') {
    propIri = onProp.value;
  } else if (onProp?.termType === 'BlankNode') {
    const inv = store.match(onProp, $rdf.sym(OWL + 'inverseOf'), null, null)[0]?.object;
    if (inv?.termType === 'NamedNode') {
      inverse = true;
      propIri = inv.value;
    }
  }

  if (!propIri) return null;

  const propTxt = iriToPrefixed(propIri, prefixes);
  const headTxt = inverse ? `inverse(${propTxt})` : propTxt;

  // Fillers
  const some = store.match(bn, $rdf.sym(OWL + 'someValuesFrom'), null, null)[0]?.object || null;
  const all  = store.match(bn, $rdf.sym(OWL + 'allValuesFrom'), null, null)[0]?.object || null;
  const hv   = store.match(bn, $rdf.sym(OWL + 'hasValue'), null, null)[0]?.object || null;
  const hs   = store.match(bn, $rdf.sym(OWL + 'hasSelf'), null, null)[0]?.object || null;

  // Cardinalities
  const minCard  = store.match(bn, $rdf.sym(OWL + 'minCardinality'), null, null)[0]?.object || null;
  const maxCard  = store.match(bn, $rdf.sym(OWL + 'maxCardinality'), null, null)[0]?.object || null;
  const card     = store.match(bn, $rdf.sym(OWL + 'cardinality'), null, null)[0]?.object || null;
  const qMinCard = store.match(bn, $rdf.sym(OWL + 'minQualifiedCardinality'), null, null)[0]?.object || null;
  const qMaxCard = store.match(bn, $rdf.sym(OWL + 'maxQualifiedCardinality'), null, null)[0]?.object || null;
  const qCard    = store.match(bn, $rdf.sym(OWL + 'qualifiedCardinality'), null, null)[0]?.object || null;

  const onClass     = store.match(bn, $rdf.sym(OWL + 'onClass'), null, null)[0]?.object || null;
  const onDataRange = store.match(bn, $rdf.sym(OWL + 'onDataRange'), null, null)[0]?.object || null;

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
    const hasOnProp = store.match(term, $rdf.sym(OWL + 'onProperty'), null, null).length > 0;
    if (hasOnProp) {
      const rTxt = serializeRestrictionManchester(store, term, prefixes, visited);
      return { text: rTxt, needsParens: true };
    }

    // complementOf
    const comp = store.match(term, $rdf.sym(OWL + 'complementOf'), null, null)[0]?.object || null;
    if (comp) {
      const inner = serializeClassExpression(store, comp, prefixes, visited);
      const innerTxt = inner.text ? (inner.needsParens ? `(${inner.text})` : inner.text) : null;
      return { text: innerTxt ? `not ${innerTxt}` : null, needsParens: true };
    }

    // intersectionOf / unionOf
    const inter = store.match(term, $rdf.sym(OWL + 'intersectionOf'), null, null)[0]?.object || null;
    if (inter) {
      const items = parseRdfList(store, inter);
      const parts = items.map(t => {
        const r = serializeClassExpression(store, t, prefixes, visited);
        return r.text ? (r.needsParens ? `(${r.text})` : r.text) : null;
      }).filter(Boolean);
      return { text: parts.join(' and '), needsParens: true };
    }

    const uni = store.match(term, $rdf.sym(OWL + 'unionOf'), null, null)[0]?.object || null;
    if (uni) {
      const items = parseRdfList(store, uni);
      const parts = items.map(t => {
        const r = serializeClassExpression(store, t, prefixes, visited);
        return r.text ? (r.needsParens ? `(${r.text})` : r.text) : null;
      }).filter(Boolean);
      return { text: parts.join(' or '), needsParens: true };
    }

    // oneOf (class enumeration)
    const oneOf = store.match(term, $rdf.sym(OWL + 'oneOf'), null, null)[0]?.object || null;
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
    const inv = store.match(term, $rdf.sym(OWL + 'inverseOf'), null, null)[0]?.object;
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
    const inv = store.match(term, $rdf.sym(OWL + 'inverseOf'), null, null)[0]?.object;
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
    store.match(bn, $rdf.sym(RDF + 'type'), $rdf.sym(OWL + 'Class'), null).length > 0;

  const compObj = store.match(bn, $rdf.sym(OWL + 'complementOf'), null, null)[0]?.object;
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

