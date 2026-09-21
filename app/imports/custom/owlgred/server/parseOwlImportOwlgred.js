import * as $rdf from 'rdflib';  // RDFLib.js library

// Namespaces constants
const RDF  = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const OWL  = 'http://www.w3.org/2002/07/owl#';
const XSD  = 'http://www.w3.org/2001/XMLSchema#';

import fs from "fs";
import path from "path";

// Helper to convert full IRI to prefixed name if possible
function iriToPrefixed(iri, prefixes = {}) {
  for (const [pfx, base] of Object.entries(prefixes)) {
    if (iri.startsWith(base)) {
      const prefixLabel = pfx === '' ? ':' : `${pfx}:`;
      return prefixLabel + iri.slice(base.length);
    }
  }
  // Fallback: use fragment or last segment as local name
  const cut = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
  return cut >= 0 ? iri.slice(cut + 1) : iri;
}

Meteor.methods({
	
  OWLGREDwritePublicOntologyLoadingPreferences(settings) {
    // check(settings, Object);

    // Project root (works in dev; production bundles may differ)
    const publicDir = path.join(process.cwd(), "public/OWLGrEd_ImportSettings");
    const filePath = path.join(publicDir, "ontology-loading-preferences.json");
	

	
    // fs.mkdirSync(publicDir, { recursive: true });
    // fs.writeFileSync(filePath, settings, "utf8");

    return { ok: true, filePath };
  },

  // Meteor method to load and parse an OWL ontology using RDFLib.js
  loadOwlRDFLib2(ontologyText) {
    // **1. Detect the ontology format and set content type for RDFLib parser**
    let contentType;
    const text = ontologyText || '';
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      // JSON-LD (starts with '{' or '[' and likely contains "@context")
      contentType = 'application/ld+json';
    } else if (trimmed.startsWith('<?xml') || trimmed.startsWith('<rdf:RDF') || trimmed.indexOf('<rdf:RDF') !== -1) {
      // RDF/XML (XML content with <rdf:RDF> root)
      contentType = 'application/rdf+xml';
    } else {
      // Default to Turtle/N3 (handles .ttl, .n3, TriG, etc.)
      contentType = 'text/turtle';
    }

    // **2. Parse the ontology string with RDFLib.js**
    const store = $rdf.graph();
    const baseUri = 'http://example.org/tempBase#';  // Base URI for relative IRIs
    try {
      $rdf.parse(text, store, baseUri, contentType);
    } catch (err) {
      throw new Meteor.Error('OntologyParseError', `Failed to parse ontology: ${err.message}`);
    }

    // **3. Extract prefix declarations to build the prefixes map**
    const prefixes = {};
    if (contentType === 'text/turtle') {
      // Turtle/N3: look for "@prefix" or "PREFIX" declarations and "@base"/"BASE"
      const prefixRegex = /@prefix\s+([^:\s]+):\s*<([^>]+)>/gi;
      const sparqlPrefixRegex = /^PREFIX\s+([^:\s]+):\s*<([^>]+)>/gmi;
      const baseRegex = /@base\s*<([^>]+)>/gi;
      const sparqlBaseRegex = /^BASE\s*<([^>]+)>/gmi;
      let match;
      while ((match = prefixRegex.exec(text)) !== null) {
        const [ , pfx, uri ] = match;
        prefixes[pfx] = uri;
      }
      while ((match = sparqlPrefixRegex.exec(text)) !== null) {
        const [ , pfx, uri ] = match;
        prefixes[pfx] = uri;
      }
      if ((match = baseRegex.exec(text)) !== null) {
        prefixes[''] = match[1];
      }
      if ((match = sparqlBaseRegex.exec(text)) !== null) {
        prefixes[''] = match[1];
      }
    } else if (contentType === 'application/rdf+xml') {
      // RDF/XML: capture xml:base and xmlns:prefix declarations
      const baseMatch = text.match(/xml:base\s*=\s*"([^"]+)"/i);
      if (baseMatch) {
        prefixes[''] = baseMatch[1];
      }
      const xmlnsRegex = /xmlns:([^=]+)\s*=\s*"([^"]+)"/gi;
      let m;
      while ((m = xmlnsRegex.exec(text)) !== null) {
        const [ , pfx, uri ] = m;
        prefixes[pfx] = uri;
      }
    } else if (contentType === 'application/ld+json') {
      // JSON-LD: try to extract simple prefix mappings from @context
      try {
        const json = JSON.parse(text);
        const ctx = json['@context'];
        if (ctx && typeof ctx === 'object') {
          for (const [key, val] of Object.entries(ctx)) {
            if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('urn:'))) {
              prefixes[key] = val;
            }
          }
        }
      } catch (e) {
        // If JSON parsing fails or context is not an object, skip prefix extraction
      }
    }

    // **4. Initialize the ontology state structure (same shape as N3 version)**
    const state = {
      prefixes,
      classes: {},
      individuals: {},
      objectProperties: {},
      dataProperties: {},
      annotationProperties: {},
      dataTypes: {},
      // Helper sets to track property types
      isAnnotationProp: new Set(),
      isObjectProp: new Set(),
      isDataProp: new Set(),
    };

    // Helper function to create a base entity object
    const makeEntity = (iri, kind) => ({
      iri,
      prefixed: iriToPrefixed(iri, prefixes),
      label: null,
      annotations: [],
      kind,
    });

    // Helper to ensure an entity exists in a given bucket
    const ensure = (bucket, iri, creatorFn) => {
      if (!bucket[iri]) bucket[iri] = creatorFn(iri);
      return bucket[iri];
    };

    // Helper to identify built-in datatypes (to avoid treating them as custom dataTypes)
    const isBuiltInDatatype = (iri) => (
      iri.startsWith(XSD) ||
      iri === RDFS + 'Literal' ||
      iri === RDF + 'langString' ||
      iri === RDF + 'PlainLiteral' ||
      iri === OWL + 'real' ||
      iri === OWL + 'rational'
    );

    // **5. Discover entities via rdf:type triples (like discoverEntitiesN3)**
    const rdfTypeNode = $rdf.sym(RDF + 'type');
    const typeTriples = store.match(undefined, rdfTypeNode, undefined);  // all ?s rdf:type ?o
    typeTriples.forEach(({ subject: s, object: o }) => {
      if (s.termType !== 'NamedNode' || o.termType !== 'NamedNode') return;
      const sIri = s.value;
      const oIri = o.value;
      if (oIri === OWL + 'Class') {
        // OWL class
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
      } else if (oIri === OWL + 'ObjectProperty') {
        // OWL object property
        ensure(state.objectProperties, sIri, iri => ({
          ...makeEntity(iri, 'ObjectProperty'),
          domain: [],
          range: [],
          characteristics: {},
          inverseOf: [],
          propertyChains: []
        }));
        state.isObjectProp.add(sIri);
      } else if (oIri === OWL + 'DatatypeProperty') {
        // OWL data property
        ensure(state.dataProperties, sIri, iri => ({
          ...makeEntity(iri, 'DatatypeProperty'),
          domain: [],
          range: [],
          characteristics: {}
        }));
        state.isDataProp.add(sIri);
      } else if (oIri === OWL + 'AnnotationProperty') {
        // OWL annotation property
        ensure(state.annotationProperties, sIri, iri => ({
          ...makeEntity(iri, 'AnnotationProperty'),
          domain: [],
          range: [],
          superProperties: []
        }));
        state.isAnnotationProp.add(sIri);
      } else if (oIri === RDFS + 'Datatype' || oIri === OWL + 'Datatype') {
        // Custom datatype definition
        if (!isBuiltInDatatype(sIri) && state.dataTypes) {
          ensure(state.dataTypes, sIri, iri => ({
            ...makeEntity(iri, 'Datatype'),
            base: null,
            restrictions: [],        // datatype facets (if any)
            equivalentDatatypes: [],
            disjointDatatypes: []
          }));
        }
      } else if (oIri === OWL + 'NamedIndividual') {
        // Skip explicit owl:NamedIndividual type (handled implicitly below)
        return;
      } else {
        // If not a schema element above and not already classified, treat as individual
        const alreadySchema = state.classes[sIri] || state.objectProperties[sIri] ||
                              state.dataProperties[sIri] || state.annotationProperties[sIri] ||
                              (state.dataTypes && state.dataTypes[sIri]);
        if (!alreadySchema) {
          ensure(state.individuals, sIri, iri => ({
            ...makeEntity(iri, 'Individual'),
            types: [],
            dataFacts: [],
            objFacts: []
          }));
          // Record this rdf:type as one of the individual's types
          state.individuals[sIri].types.push(oIri);
        }
      }
    });

    // Clean up any owl:NamedIndividual types from individuals' types array
    Object.values(state.individuals).forEach(ind => {
      ind.types = ind.types.filter(t => t !== OWL + 'NamedIndividual');
    });

    // **6. Define helper parsers for complex structures (Restrictions, lists, etc.)**

    // Parse an owl:Restriction blank node into a structured object
    function parseRestriction(bn) {
      if (!bn || bn.termType !== 'BlankNode') return null;
      const hasRestrictionType = store.match(bn, $rdf.sym(RDF + 'type'), $rdf.sym(OWL + 'Restriction')).length > 0;
      if (!hasRestrictionType) return null;
      // onProperty (could be direct or blank node with inverseOf)
      let onPropIRI = null;
      let inverseFlag = false;
      const onPropSt = store.match(bn, $rdf.sym(OWL + 'onProperty'), undefined)[0];
      if (onPropSt) {
        const onPropTerm = onPropSt.object;
        if (onPropTerm.termType === 'NamedNode') {
          onPropIRI = onPropTerm.value;
        } else if (onPropTerm.termType === 'BlankNode') {
          const inv = store.match(onPropTerm, $rdf.sym(OWL + 'inverseOf'), undefined)[0]?.object;
          if (inv && inv.termType === 'NamedNode') {
            onPropIRI = inv.value;
            inverseFlag = true;
          }
        }
      }
      // Restriction fillers
      const someTerm = store.match(bn, $rdf.sym(OWL + 'someValuesFrom'), undefined)[0]?.object;
      const allTerm  = store.match(bn, $rdf.sym(OWL + 'allValuesFrom'), undefined)[0]?.object;
      const hvTerm   = store.match(bn, $rdf.sym(OWL + 'hasValue'), undefined)[0]?.object;
      // Cardinalities
      const minCardLit = store.match(bn, $rdf.sym(OWL + 'minCardinality'), undefined)[0]?.object;
      const maxCardLit = store.match(bn, $rdf.sym(OWL + 'maxCardinality'), undefined)[0]?.object;
      const cardLit    = store.match(bn, $rdf.sym(OWL + 'cardinality'), undefined)[0]?.object;
      const qMinCardLit = store.match(bn, $rdf.sym(OWL + 'minQualifiedCardinality'), undefined)[0]?.object;
      const qMaxCardLit = store.match(bn, $rdf.sym(OWL + 'maxQualifiedCardinality'), undefined)[0]?.object;
      const qCardLit    = store.match(bn, $rdf.sym(OWL + 'qualifiedCardinality'), undefined)[0]?.object;
      // Qualified restriction class/dataRange
      const onClassTerm     = store.match(bn, $rdf.sym(OWL + 'onClass'), undefined)[0]?.object;
      const onDataRangeTerm = store.match(bn, $rdf.sym(OWL + 'onDataRange'), undefined)[0]?.object;
      // Convert literal to number (for cardinalities)
      const lit2num = lit => (lit && lit.termType === 'Literal') ? Number(lit.value) : null;
      return {
        bnode: `_:${bn.value}`,
        onProperty: onPropIRI,
        inverse: inverseFlag,
        // Fillers (IRIs or literal for hasValue)
        someValuesFrom: (someTerm && someTerm.termType === 'NamedNode') ? someTerm.value : null,
        allValuesFrom:  (allTerm && allTerm.termType === 'NamedNode')  ? allTerm.value  : null,
        hasValue: hvTerm ? (
                    hvTerm.termType === 'NamedNode'
                      ? hvTerm.value
                      : { literal: hvTerm.value, lang: hvTerm.language || null, dt: hvTerm.datatype?.value || null }
                  )
                : null,
        // Cardinalities (as numbers if present)
        minCardinality: lit2num(minCardLit),
        maxCardinality: lit2num(maxCardLit),
        cardinality:    lit2num(cardLit),
        minQualifiedCardinality: lit2num(qMinCardLit),
        maxQualifiedCardinality: lit2num(qMaxCardLit),
        qualifiedCardinality:    lit2num(qCardLit),
        // Qualified restriction on class or data range
        onClass:     (onClassTerm && onClassTerm.termType === 'NamedNode') ? onClassTerm.value : null,
        onDataRange: (onDataRangeTerm && onDataRangeTerm.termType === 'NamedNode') ? onDataRangeTerm.value : null,
      };
    }

    // Parse an RDF list (rdf:first/rest) into an array of item terms
    function parseRdfList(listHead) {
      const RDF_FIRST = $rdf.sym(RDF + 'first');
      const RDF_REST  = $rdf.sym(RDF + 'rest');
      const RDF_NIL   = $rdf.sym(RDF + 'nil');
      const items = [];
      let current = listHead;
      if (!current || current.termType !== 'BlankNode') {
        // Not a list head (maybe a single item or none)
        if (current) items.push(current);
        return items;
      }
      const seenBnodes = new Set();
      // Traverse the list
      while (current.termType === 'BlankNode' && !seenBnodes.has(current.value)) {
        seenBnodes.add(current.value);
        const firstObj = store.match(current, RDF_FIRST, undefined)[0]?.object;
        if (!firstObj) break;
        items.push(firstObj);
        const restObj = store.match(current, RDF_REST, undefined)[0]?.object;
        if (!restObj || (restObj.termType === 'NamedNode' && restObj.value === RDF_NIL.uri)) {
          // End of list (rdf:nil) or no rest
          break;
        }
        current = restObj;
      }
      return items;
    }

    // Parse an item in owl:hasKey list to { iri, inverse, kind }
    function parseKeyItem(term) {
      if (!term) return null;
      if (term.termType === 'BlankNode') {
        // e.g., [ owl:inverseOf :P ] representing an inverse property
        const invTarget = store.match(term, $rdf.sym(OWL + 'inverseOf'), undefined)[0]?.object;
        if (invTarget && invTarget.termType === 'NamedNode') {
          return { iri: invTarget.value, inverse: true, kind: 'object' };
        }
        return null;  // unsupported blank node in key list
      }
      if (term.termType === 'NamedNode') {
        const iri = term.value;
        // Determine if this IRI is known as object or data property (to set kind)
        const isOP = state.isObjectProp.has(iri) || !!state.objectProperties[iri];
        const isDP = state.isDataProp.has(iri)   || !!state.dataProperties[iri];
        const kind = isOP ? 'object' : (isDP ? 'data' : null);
        return { iri, inverse: false, kind };
      }
      return null;
    }

    // Parse an item in owl:propertyChainAxiom list to { iri, inverse }
    function parseChainItem(term) {
      if (!term) return null;
      if (term.termType === 'NamedNode') {
        return { iri: term.value, inverse: false };
      }
      if (term.termType === 'BlankNode') {
        // e.g., [ owl:inverseOf :P ] in chain
        const invTarget = store.match(term, $rdf.sym(OWL + 'inverseOf'), undefined)[0]?.object;
        if (invTarget && invTarget.termType === 'NamedNode') {
          return { iri: invTarget.value, inverse: true };
        }
      }
      // Unsupported chain item (e.g., nested expressions)
      return null;
    }

    // Get target IRI for an owl:complementOf class expression (if it exists)
    function getComplementTargetIri(bn) {
      if (!bn || bn.termType !== 'BlankNode') return null;
      const compObj = store.match(bn, $rdf.sym(OWL + 'complementOf'), undefined)[0]?.object;
      if (!compObj) return null;
      if (compObj.termType === 'NamedNode') return compObj.value;
      if (compObj.termType === 'Literal') {
        const val = compObj.value.trim();
        if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
          // Non-standard: literal giving an IRI
          return val;
        }
      }
      return null;
    }

    // **7. Process all triples to populate relations, hierarchies, and facts (like routeTriplesN3)**
    const allStatements = store.match(undefined, undefined, undefined);
    allStatements.forEach(({ subject: s, predicate: p, object: o }) => {
      const sIri = (s.termType === 'NamedNode') ? s.value : null;
      const pIri = p.value;
      // RDFS label: assign labels to any known entity
      if (pIri === RDFS + 'label' && s.termType === 'NamedNode' && o.termType === 'Literal') {
        const tgt = state.classes[sIri] || state.objectProperties[sIri] ||
                    state.dataProperties[sIri] || state.annotationProperties[sIri] ||
                    state.individuals[sIri] || state.dataTypes[sIri];
        if (tgt) {
          tgt.label = o.value;
        }
        return;  // continue to next statement
      }

      // rdfs:subClassOf: add superclass or restriction
      if (pIri === RDFS + 'subClassOf' && s.termType === 'NamedNode') {
        const cls = state.classes[sIri];
        if (cls) {
          if (o.termType === 'NamedNode') {
            cls.superClasses.push(o.value);
          } else if (o.termType === 'BlankNode') {
            const restr = parseRestriction(o);
            cls.restrictions = cls.restrictions || [];
            if (restr) {
              cls.restrictions.push(restr);
            } else {
              // Unrecognized blank node (not a Restriction) – store raw reference
              cls.restrictions.push({ bnode: `_:${o.value}`, raw: true });
            }
          }
        }
        return;
      }

      // owl:equivalentClass: handle class equivalences and complements
      if (pIri === OWL + 'equivalentClass') {
        if (s.termType === 'NamedNode') {
          const cls = state.classes[sIri];
          if (cls) {
            if (o.termType === 'NamedNode') {
              // direct named equivalent class
              cls.equivalentClasses = cls.equivalentClasses || [];
              cls.equivalentClasses.push(o.value);
            } else if (o.termType === 'BlankNode') {
              // check if blank node is a complementOf something
              const targetIri = getComplementTargetIri(o);
              if (targetIri) {
                cls.complementOf = cls.complementOf || [];
                cls.complementOf.push(targetIri);
              } else {
                // Could store raw blank expression if needed
                // cls.restrictions?.push({ bnode: `_:${o.value}`, raw: true });
              }
            }
          }
          return;
        }
        if (o.termType === 'NamedNode') {
          // Case: blank node equivalent to a named class
          const targetClassIri = o.value;
          const cls = state.classes[targetClassIri] || (state.classes[targetClassIri] = {
            iri: targetClassIri,
            prefixed: iriToPrefixed(targetClassIri, prefixes),
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
            const compTarget = getComplementTargetIri(s);
            if (compTarget) {
              cls.complementOf = cls.complementOf || [];
              cls.complementOf.push(compTarget);
            } else {
              // Optionally store raw blank node expression
              // cls.restrictions.push({ bnode: `_:${s.value}`, raw: true });
            }
          } else if (s.termType === 'NamedNode') {
            // symmetric case: two named classes equivalently declared (will be handled anyway by loop)
            cls.equivalentClasses.push(s.value);
          }
          return;
        }
      }

      // owl:disjointWith or owl:equivalentClass (named-named case)
      if ((pIri === OWL + 'disjointWith' || pIri === OWL + 'equivalentClass') &&
          s.termType === 'NamedNode' && o.termType === 'NamedNode') {
        const cls = state.classes[sIri];
        if (cls) {
          const arrName = pIri.endsWith('equivalentClass') ? 'equivalentClasses' : 'disjointWith';
          cls[arrName] = cls[arrName] || [];
          cls[arrName].push(o.value);
        }
        return;
      }

      // owl:hasKey: capture key property sets for classes
      if (pIri === OWL + 'hasKey' && s.termType === 'NamedNode') {
        if (!state.classes[sIri]) {
          // Ensure the class exists in the structure
          state.classes[sIri] = {
            iri: sIri,
            prefixed: iriToPrefixed(sIri, prefixes),
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
        const cls = state.classes[sIri];
        const listItems = parseRdfList(o);  // parse the list of properties
        const keyProps = listItems.map(item => parseKeyItem(item)).filter(x => x && typeof x.iri === 'string');
        if (keyProps.length > 0) {
          cls.keys = cls.keys || [];
          cls.keys.push(keyProps);
          // Ensure each property in the key has a bucket
          keyProps.forEach(prop => {
            if (prop.kind === 'object' || (prop.kind === null && !state.dataProperties[prop.iri])) {
              // Treat as object property by default if unknown
              if (!state.objectProperties[prop.iri]) {
                state.objectProperties[prop.iri] = {
                  iri: prop.iri,
                  prefixed: iriToPrefixed(prop.iri, prefixes),
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
              state.isObjectProp.add(prop.iri);
            }
            if (prop.kind === 'data') {
              if (!state.dataProperties[prop.iri]) {
                state.dataProperties[prop.iri] = {
                  iri: prop.iri,
                  prefixed: iriToPrefixed(prop.iri, prefixes),
                  label: null,
                  annotations: [],
                  kind: 'DatatypeProperty',
                  domain: [],
                  range: [],
                  characteristics: {}
                };
              }
              state.isDataProp.add(prop.iri);
            }
          });
        }
        return;
      }

      // rdfs:subPropertyOf: property hierarchy
      if (pIri === RDFS + 'subPropertyOf' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
        const propBucket = state.objectProperties[sIri] || state.dataProperties[sIri] || state.annotationProperties[sIri];
        if (propBucket) {
          propBucket.superProperties = propBucket.superProperties || [];
          propBucket.superProperties.push(o.value);
        }
        return;
      }

      // owl:equivalentProperty
      if (pIri === OWL + 'equivalentProperty' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
        const propBucket = state.objectProperties[sIri] || state.dataProperties[sIri];
        if (propBucket) {
          propBucket.equivalentProperties = propBucket.equivalentProperties || [];
          propBucket.equivalentProperties.push(o.value);
        }
        return;
      }

      // owl:propertyDisjointWith
      if (pIri === OWL + 'propertyDisjointWith' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
        const propBucket = state.objectProperties[sIri] || state.dataProperties[sIri];
        if (propBucket) {
          propBucket.disjointProperties = propBucket.disjointProperties || [];
          propBucket.disjointProperties.push(o.value);
        }
        return;
      }

      // rdfs:domain
      if (pIri === RDFS + 'domain' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
        if (state.objectProperties[sIri]) state.objectProperties[sIri].domain.push(o.value);
        if (state.dataProperties[sIri])   state.dataProperties[sIri].domain.push(o.value);
        if (state.annotationProperties[sIri]) state.annotationProperties[sIri].domain.push(o.value);
        // Also link the property under the class (domain) for object/data properties
        const domainClass = state.classes[o.value];
        if (domainClass) {
          if (state.isObjectProp.has(sIri)) domainClass.objectProperties.push(sIri);
          if (state.isDataProp.has(sIri))   domainClass.dataProperties.push(sIri);
        }
        return;
      }
	  
	  // Datatype definition written as:
	  // :D a rdfs:Datatype ;
	  //    rdfs:range [ a rdfs:Datatype ; owl:oneOf ( "A" "B" ) ] .
	  if (
	    p.value === RDFS + 'range' &&
	    s.termType === 'NamedNode' &&
	    state.dataTypes?.[s.value]
	  ) {
	    const dtb = ensureDatatype(s.value);

	    if (o.termType === 'NamedNode') {
	      dtb.definitionExpression = datatypeIriToManchester(o.value, prefixes);
	    } else if (o.termType === 'BlankNode') {
		  const man = serializeDataRangeForUI(store, o, prefixes);
		  if (man) dtb.definitionExpression = man;
	    }

	    return;
	  }

      // rdfs:range
      if (pIri === RDFS + 'range' && s.termType === 'NamedNode') {
        if (state.objectProperties[sIri] && o.termType === 'NamedNode') {
          state.objectProperties[sIri].range.push(o.value);
        }
        if (state.dataProperties[sIri] && o.termType === 'NamedNode') {
          // Only add range if it's a datatype (to avoid adding class IRIs to data property range)
          const oIri = o.value;
          if (oIri.startsWith(XSD) || oIri === RDFS + 'Literal' || oIri === RDF + 'langString' ||
              oIri === RDF + 'PlainLiteral' || oIri === OWL + 'real' || oIri === OWL + 'rational') {
            state.dataProperties[sIri].range.push(o.value);
          }
        }
        if (state.annotationProperties[sIri] && o.termType === 'NamedNode') {
          state.annotationProperties[sIri].range.push(o.value);
        }
        return;
      }

      // rdf:type for property characteristics (e.g., owl:FunctionalProperty, SymmetricProperty, etc.)
      if (pIri === RDF + 'type' && s.termType === 'NamedNode') {
        const localName = o.value.startsWith(OWL) ? o.value.slice(OWL.length) : o.value;
        // If the object is a property type (ends with "Property" but is not the base types themselves)
        if (state.objectProperties[sIri] && localName.endsWith('Property') &&
            localName !== 'ObjectProperty' && localName !== 'DatatypeProperty' && localName !== 'AnnotationProperty') {
          state.objectProperties[sIri].characteristics = state.objectProperties[sIri].characteristics || {};
          state.objectProperties[sIri].characteristics[localName] = true;
        }
        if (state.dataProperties[sIri] && localName.endsWith('Property') &&
            localName !== 'ObjectProperty' && localName !== 'DatatypeProperty' && localName !== 'AnnotationProperty') {
          state.dataProperties[sIri].characteristics = state.dataProperties[sIri].characteristics || {};
          state.dataProperties[sIri].characteristics[localName] = true;
        }
        return;
      }

      // owl:inverseOf: link inverse object properties
      if (pIri === OWL + 'inverseOf' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
        const p1 = s.value, p2 = o.value;
        // Mark both as object properties in case not already
        state.isObjectProp.add(p1);
        state.isObjectProp.add(p2);
        // Ensure both property buckets exist
        if (!state.objectProperties[p1]) {
          state.objectProperties[p1] = {
            iri: p1,
            prefixed: iriToPrefixed(p1, prefixes),
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
        if (!state.objectProperties[p2]) {
          state.objectProperties[p2] = {
            iri: p2,
            prefixed: iriToPrefixed(p2, prefixes),
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
        // Record symmetric inverse links
        state.objectProperties[p1].inverseOf.push(p2);
        state.objectProperties[p2].inverseOf.push(p1);
        return;
      }

      // owl:propertyChainAxiom: capture property chain axioms for object properties
      if (pIri === OWL + 'propertyChainAxiom' && s.termType === 'NamedNode') {
        const superPropIri = s.value;
        // Ensure the super property has an ObjectProperty bucket
        const superProp = state.objectProperties[superPropIri] || (state.objectProperties[superPropIri] = {
          iri: superPropIri,
          prefixed: iriToPrefixed(superPropIri, prefixes),
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
        state.isObjectProp.add(superPropIri);
        // Parse the chain list
        const chainItems = parseRdfList(o);
        const chain = chainItems.map(item => parseChainItem(item)).filter(x => x && typeof x.iri === 'string');
        if (chain.length > 0) {
          superProp.propertyChains = superProp.propertyChains || [];
          superProp.propertyChains.push(chain);
          // Ensure each property in the chain is marked as an object property
          chain.forEach(link => {
            if (!state.objectProperties[link.iri]) {
              state.objectProperties[link.iri] = {
                iri: link.iri,
                prefixed: iriToPrefixed(link.iri, prefixes),
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
            state.isObjectProp.add(link.iri);
          });
        }
        return;
      }

      // Annotation assertions: if predicate is an annotation property
      if (state.isAnnotationProp.has(pIri) && s.termType === 'NamedNode') {
        const targetEntity = state.classes[sIri] || state.objectProperties[sIri] ||
                              state.dataProperties[sIri] || state.individuals[sIri] ||
                              state.annotationProperties[sIri] || state.dataTypes[sIri];
        if (targetEntity) {
          targetEntity.annotations = targetEntity.annotations || [];
          targetEntity.annotations.push({
            p: pIri,
            v: (o.termType === 'Literal') ? o.value : o.value,
            lang: (o.termType === 'Literal') ? o.language || null : undefined,
            dt: (o.termType === 'Literal') ? (o.datatype ? o.datatype.value : null) : undefined
          });
        }
        return;
      }

      // owl:onDatatype for custom datatype definitions
      if (pIri === OWL + 'onDatatype' && s.termType === 'NamedNode' && o.termType === 'NamedNode') {
        const dtIri = s.value;
        if (state.dataTypes && state.dataTypes[dtIri]) {
          state.dataTypes[dtIri].base = o.value;
        }
        return;
      }

      // owl:NegativePropertyAssertion handling (reified as blank node)
      if (pIri === RDF + 'type' && s.termType === 'BlankNode' && o.termType === 'NamedNode' && o.value === OWL + 'NegativePropertyAssertion') {
        // Extract the components of the negative assertion
        const sourceInd = store.match(s, $rdf.sym(OWL + 'sourceIndividual'), undefined)[0]?.object;
        const assertionProp = store.match(s, $rdf.sym(OWL + 'assertionProperty'), undefined)[0]?.object;
        const targetInd = store.match(s, $rdf.sym(OWL + 'targetIndividual'), undefined)[0]?.object;
        const targetLit = store.match(s, $rdf.sym(OWL + 'targetValue'), undefined)[0]?.object;
        if (sourceInd && sourceInd.termType === 'NamedNode' && assertionProp && assertionProp.termType === 'NamedNode') {
          const srcIRI = sourceInd.value;
          const propIRI = assertionProp.value;
          const srcIndividual = ensure(state.individuals, srcIRI, iri => ({
            ...makeEntity(iri, 'Individual'),
            types: [],
            dataFacts: [],
            objFacts: []
          }));
          if (targetInd && targetInd.termType === 'NamedNode') {
            // Negative object property assertion ¬prop(src, targetInd)
            srcIndividual.objFacts.push({ p: propIRI, object: targetInd.value, negative: true });
          } else if (targetLit && targetLit.termType === 'Literal') {
            // Negative data property assertion ¬prop(src, "value")
            srcIndividual.dataFacts.push({
              p: propIRI,
              value: targetLit.value,
              lang: targetLit.language || null,
              dt: targetLit.datatype ? targetLit.datatype.value : null,
              negative: true
            });
          }
        }
        return;
      }

      // Remaining: if subject is a known individual, treat triple as a fact
      if (sIri && state.individuals[sIri]) {
        const ind = state.individuals[sIri];
        if (o.termType === 'Literal') {
          ind.dataFacts.push({
            p: pIri,
            value: o.value,
            lang: o.language || null,
            dt: o.datatype ? o.datatype.value : null
          });
        } else if (o.termType === 'NamedNode') {
          ind.objFacts.push({
            p: pIri,
            object: o.value
          });
        }
        return;
      }
    });  // end forEach allStatements

    // **8. Deduplicate array fields to remove duplicates**
    const deduplicate = (arr) => Array.from(new Set(arr));
    // Deduplicate property arrays
    Object.values(state.objectProperties).forEach(prop => {
      if (!prop) return;
      prop.superProperties      = deduplicate(prop.superProperties || []);
      prop.equivalentProperties = deduplicate(prop.equivalentProperties || []);
      prop.disjointProperties   = deduplicate(prop.disjointProperties || []);
      prop.domain               = deduplicate(prop.domain || []);
      prop.range                = deduplicate(prop.range || []);
      prop.inverseOf            = deduplicate(prop.inverseOf || []);
      if (Array.isArray(prop.propertyChains)) {
        // Deduplicate property chain entries by JSON string (to compare array of objects)
        const seenChains = new Set();
        prop.propertyChains = prop.propertyChains.filter(chain => {
          const key = JSON.stringify(chain);
          if (seenChains.has(key)) return false;
          seenChains.add(key);
          return true;
        });
      }
    });
    Object.values(state.dataProperties).forEach(prop => {
      if (!prop) return;
      prop.superProperties      = deduplicate(prop.superProperties || []);
      prop.equivalentProperties = deduplicate(prop.equivalentProperties || []);
      prop.disjointProperties   = deduplicate(prop.disjointProperties || []);
      prop.domain               = deduplicate(prop.domain || []);
      prop.range                = deduplicate(prop.range || []);
    });
    Object.values(state.annotationProperties).forEach(prop => {
      if (!prop) return;
      prop.superProperties = deduplicate(prop.superProperties || []);
      prop.domain         = deduplicate(prop.domain || []);
      prop.range          = deduplicate(prop.range || []);
    });

    // **9. Capture any remaining annotations (ontology and entity annotations)**
    // Ontology node annotations (if ontology declared)
    const ontologyDecl = store.match(undefined, $rdf.sym(RDF + 'type'), $rdf.sym(OWL + 'Ontology'))[0];
    if (ontologyDecl) {
      const ontologyNode = ontologyDecl.subject;
      state.ontology = {
        iri: (ontologyNode.termType === 'NamedNode') ? ontologyNode.value : null,
        annotations: []
      };
      // Iterate all triples with the ontology as subject
      const ontTriples = store.match(ontologyNode, undefined, undefined);
      ontTriples.forEach(({ predicate: pred, object: obj }) => {
        const pIRI = pred.value;
        if (pIRI === RDF + 'type') return;  // skip owl:Ontology type triple
        if (pIRI === RDFS + 'label' && obj.termType === 'Literal') {
          // If there's an rdfs:label on the ontology, store it separately
          state.ontology.label = obj.value;
          return;
        }
        // Only include if predicate is an annotation property (declared or built-in) and not a structural triple
        const structuralPreds = new Set([
          RDF + 'type', RDFS + 'subClassOf', RDFS + 'subPropertyOf', RDFS + 'domain', RDFS + 'range',
          OWL + 'equivalentClass', OWL + 'equivalentProperty', OWL + 'disjointWith', OWL + 'propertyDisjointWith',
          OWL + 'inverseOf', OWL + 'propertyChainAxiom', OWL + 'hasKey', OWL + 'sameAs', OWL + 'differentFrom',
          OWL + 'unionOf', OWL + 'intersectionOf', OWL + 'complementOf', OWL + 'oneOf'
        ]);
        const builtInAnnProps = [
          RDFS + 'comment', RDFS + 'seeAlso', RDFS + 'isDefinedBy',
          OWL + 'versionInfo', OWL + 'versionIRI', OWL + 'priorVersion',
          OWL + 'backwardCompatibleWith', OWL + 'incompatibleWith', OWL + 'deprecated'
        ];
        if (structuralPreds.has(pIRI)) return;
        if (!state.isAnnotationProp.has(pIRI) && !builtInAnnProps.includes(pIRI)) return;
        // Record annotation (literal or IRI) on the ontology
        const ann = { p: pIRI, v: (obj.termType === 'Literal') ? obj.value : obj.value };
        if (obj.termType === 'Literal') {
          ann.dt = obj.datatype ? obj.datatype.value : null;
          ann.lang = obj.language || null;
        }
        state.ontology.annotations.push(ann);
      });
    }

    // Entity annotations for any triple that was not handled above:
    const structuralPredsSet = new Set([
      RDF + 'type', RDFS + 'subClassOf', RDFS + 'subPropertyOf', RDFS + 'domain', RDFS + 'range',
      OWL + 'equivalentClass', OWL + 'equivalentProperty', OWL + 'disjointWith', OWL + 'propertyDisjointWith',
      OWL + 'inverseOf', OWL + 'propertyChainAxiom', OWL + 'hasKey', OWL + 'sameAs', OWL + 'differentFrom',
      OWL + 'unionOf', OWL + 'intersectionOf', OWL + 'complementOf', OWL + 'oneOf'
    ]);
    const builtInAnnPropsList = [
      RDFS + 'comment', RDFS + 'seeAlso', RDFS + 'isDefinedBy',
      OWL + 'versionInfo', OWL + 'versionIRI', OWL + 'priorVersion',
      OWL + 'backwardCompatibleWith', OWL + 'incompatibleWith', OWL + 'deprecated'
    ];
    // Iterate over all entities in each category
    ['classes','individuals','objectProperties','dataProperties','annotationProperties','dataTypes'].forEach(category => {
      const entities = state[category];
      if (!entities) return;
      for (const iri in entities) {
        const entity = entities[iri];
        // Determine term for subject (convert blank node IRIs like "_:abc" to actual blank node)
        const isBlank = iri.startsWith('_:') || !iri.includes(':');
        const subjTerm = isBlank
          ? $rdf.blankNode(iri.startsWith('_:') ? iri.slice(2) : iri)
          : $rdf.sym(iri);
        const triples = store.match(subjTerm, undefined, undefined);
        triples.forEach(({ predicate: pred, object: obj }) => {
          const pIRI = pred.value;
          if (pIRI === RDFS + 'label') return;               // skip labels (already set)
          if (structuralPredsSet.has(pIRI)) return;          // skip structural triples handled above
          if (!state.isAnnotationProp.has(pIRI) && !builtInAnnPropsList.includes(pIRI)) return;  // not an annotation property
          if (state.isAnnotationProp.has(pIRI) && !isBlank) return;  // skip annotation properties for named subjects (already added in main loop)
          // Add annotation entry to the entity
          const annEntry = {
            p: pIRI,
            v: (obj.termType === 'Literal') ? obj.value : obj.value
          };
          if (obj.termType === 'Literal') {
            annEntry.dt = obj.datatype ? obj.datatype.value : null;
            annEntry.lang = obj.language || null;
          }
          entity.annotations.push(annEntry);
        });
      }
    });

    // **10. Return the completed ontology structure**
    return state;
  }
});
