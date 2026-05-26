// import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Template } from 'meteor/templating';
import { Interpreter } from '../../../../client/lib/interpreter.js'
import { Utilities, reset_variable } from '../../../../platform/client/js/utilities/utils.js'
import { is_system_admin } from '../../../../libs/platform/user_rights.js'
import { Projects, Diagrams } from '../../../../db/platform/collections.js'

import { dataShapes } from '../../../../custom/vq/client/js/DataShapes.js'

/** @import { DSSRequestProvider, DSSParams, ClassData, DSSPropertyData } from 'dss-client' */
/** @typedef {typeof yasgui.Yasgui.Yasqe | typeof yasqe.Yasqe} YASQE */
/** @typedef {InstanceType<YASQE>} Yasqe */

/** 
 * @typedef {Object} CompleterConfig
 * @property {(this: CompleterConfig, yasqe: Yasqe) => void} onInitialize
 * @property {(yasqe: Yasqe) => boolean} isValidCompletionPosition
 * @property {(yasqe: Yasqe, token?: AutocompletionToken) => Promise<string[]> | string[]} get
 * @property {(yasqe: Yasqe, token: AutocompletionToken) => AutocompletionToken} preProcessToken
 * @property {(yasqe: Yasqe, token: AutocompletionToken, suggestedString: string) => string} postProcessSuggestion
 * @property {(yasqe: Yasqe, hints: Hint[]) => Hint[]} postprocessHints
 * @property {boolean} bulk
 * @property {boolean} autoShow
 * @property {string} persistenceId
 * @property {string} name
 */

/**
 * @typedef {Object} EndpointData
 * @property {string} name
 * @property {string} dbSchemaName
 * @property {string} sparqlUrl
 */

import { DSSClient, queryLexer, suggestionComparatorModule, TripletStore, DSSAutocompletionClient, QueryBuilder, queryBuilderModule } from 'dss-client';


import './sparql_form.html'
// var yasqe = null;
// var yasqe3 = null;


var sparql_form_events = {

/*"blur #generated-sparql3": function(e) {
		var val = $(e.target).val();
		Session.set("generatedSparql", val);
		yasqe.setValue(val);
	},
	"blur #generated-sparql3": function(e) {
		var val = $(e.target).val();
		Session.set("generatedSparql", val);
		yasqe3.setValue(val);
	}, */

	"focus .yasqe": function() {
		Session.set("isYasqeActive", true)
	},

	"blur .yasqe": function() {
		Session.set("isYasqeActive", reset_variable())
	},

	"click #reset-sparql": function(e) {
		e.preventDefault();
		Session.set("generatedSparql", undefined);
		Session.set("executedSparql", {limit_set:false, number_of_rows:0});
		let yasqe = Template.sparqlForm_see_results.yasqe.get();
		let yasqe3 = Template.sparqlForm.yasqe3.get();

		yasqe.setValue("");
		yasqe3.setValue("");
	},

	"click #execute-sparql": function(e) {
		e.preventDefault();

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
    let query = yasqe.getValue();

    console.log("query ", query)

		Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(query);
	},

	"click #next-sparql": function(e) {
		e.preventDefault();

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
    var query = yasqe.getValue();
    var obj = Session.get("executedSparql");
		var paging_info = {offset:obj.offset, limit:obj.limit, number_of_rows:obj.number_of_rows};

		Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(query, paging_info);
	},

	"click #prev-sparql": function(e) {
		e.preventDefault();

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
    var query = yasqe.getValue();
    var obj = Session.get("executedSparql");
		var paging_info = {offset:obj.offset - 100, limit:obj.limit, number_of_rows:obj.number_of_rows};

		Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(query, paging_info);
	},

	"click #download-results": function(e) {
		e.preventDefault();

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
		var query = yasqe.getValue();
		var obj = Session.get("executedSparql");
		var paging_info = {download: true, offset:obj.offset - 50, limit:obj.limit, number_of_rows:obj.number_of_rows}

		Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(query, paging_info);
	}

};

const MAX_URI_DISPLAYED = 45;

var sparql_form_helpers = {

	generatedSparql: function() {
		return Session.get("generatedSparql");
	},

	executedSparql: function() {
		var result = Session.get("executedSparql");
		return result;
		/*return _.map(result, function(item, i) {
			return {value: item, index: i+1};
		});*/
	},

	plusOne: function(number) {
    return number + 1;
	},

  plusOneOffset: function(number, offset) {
		if (offset) {
			return number + offset - 50 + 1}
		else {
		  return number + 1;
		}
	},

  augmentedResult: function() {
    var self = Session.get("executedSparql");

    if (!self.sparql) {
      return;
    }

		var binding_map = _.map(self.sparql.head[0].variable, function(v) {
			return v["$"].name;
		});

    _.each(self.sparql.results[0].result, function(res) {

      var new_bindings = _.map(binding_map, function(map_item) {
        var  existing_binding = _.find(res.binding, function(binding) {return binding["$"].name==map_item});
        if (existing_binding) {
          return existing_binding;
        } else {
          return {};
        }
      });
      res.binding = new_bindings;
    })

    return _.map(self.sparql.results[0].result, function(p) {
      p.parent = self;
      return p;
    });
  },

  showPrev: function(offset) {
		return offset>50;
	},

  showNext: function(offset, number) {
		return offset < number;
	},

  shortifyUri: function(uri) {
    if (!uri || typeof uri !== 'string') return '';
    if (uri.length <= MAX_URI_DISPLAYED) return uri;

    let splitPos = uri.length;
    let pos = uri.indexOf('#');
    if (pos >= 0) {
      splitPos = pos;
    } else {
      pos = uri.lastIndexOf('/');
      if (pos >= 0) {
        splitPos = pos;
      } else {
        pos = uri.lastIndexOf(':');
        if (pos >= 0) {
          splitPos = pos;
        }
      }
    }

    let localName = uri.slice(splitPos);
    let beforeLocalName = uri.slice(0, splitPos);

    return `${beforeLocalName.slice(0, MAX_URI_DISPLAYED - localName.length - 2)}...${localName}`
  }

};


Template.sparqlForm.onRendered(async function () {
//console.log('--sparqlForm.onRendered--')
	var project_id = Session.get("activeProject");
	var project = Projects.findOne({ _id: project_id });

	if (project_id) {
		await dataShapes.changeActiveProject(project_id, 'Template.sparqlForm.onRendered');
	}

	YASQE.registerAutocompleter('customClassCompleter', customClassCompleter);
	YASQE.registerAutocompleter('customPropertyCompleter', dssClientCompleter);
	YASQE.defaults.autocompleters = ['customClassCompleter', "customPropertyCompleter", "variables"];


	let yasqe3 = YASQE.fromTextArea(document.getElementById("generated-sparql3"), {
		sparql: {
			showQueryButton: false,
		},
		//autoRefresh: true,
	});

	Template.sparqlForm.yasqe3 = new ReactiveVar(yasqe3);

	$(document).on('shown.bs.tab', '#vq-tab a[href="#sparql"]', function() {
		this.refresh();
	}.bind(yasqe3));

	yasqe3.on("blur", function(editor){
		var val = editor.getValue();
		Session.set("generatedSparql", val);

		let yasqe = Template.sparqlForm_see_results.yasqe.get();
		yasqe.setValue(val);
		// yasqe.refresh();
	});
	Session.set("generatedSparql", undefined);
	yasqe3.setValue("");

	//console.log(project)

	if (project!== undefined && project.newPublicProject) {

		var diagram = Diagrams.findOne({ _id: Session.get("activeDiagram") });
		//console.log(diagram)
		if (diagram.query !== undefined && diagram.query.length > 0) {
			yasqe3.setValue(diagram.query);
			if (project.isVisualizationNeeded){
				console.log("sparql_form.js, onRendered(), diagram.query =", diagram.query, [diagram.query])
				Interpreter.customExtensionPoints.visualizeSPARQL([diagram.query]);
			}
		}
		var list = {projectId: project_id, set: {newPublicProject: false, isVisualizationNeeded: false},};
		Utilities.callMeteorMethod("updateProject", list);
	}

	//const vv = "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX w: <http://ldf.fi/schema/warsa/>\nPREFIX foaf: <http://xmlns.com/foaf/0.1/>\nSELECT ?Person ?firstName ?familyName WHERE{\n  ?Person rdf:type w:Person.\n  OPTIONAL{?Person foaf:firstName ?firstName.}\n  OPTIONAL{?Person foaf:familyName ?familyName.}\n}"

});

Template.sparqlForm.helpers(sparql_form_helpers);
Template.sparqlForm.events(sparql_form_events);

Template.sparqlForm_see_results.onDestroyed(function() {
	//console.log('-----------sparqlForm_see_results.onDestroyed(-----------')
	Session.set("generatedSparql", undefined);
	Session.set("executedSparql", {limit_set: false, number_of_rows: 0});

	Session.set("isYasqeActive", reset_variable())
});

Template.sparqlForm_see_results.onRendered(function() {

  var yasqe_config = {
    sparql: {
      showQueryButton: false,
    },

    extraKeys: {
      Esc: function () {
        console.log("esc pressed");
      },
    },

  };
  // var proj = Projects.findOne({_id: Session.get("activeProject")});
	//
  // if (proj && proj.uri && proj.endpoint) {
  //   yasqe_config.sparql.endpoint = proj.endpoint;
	// 	yasqe_config.sparql.namedGraphs = [proj.uri];
  // };

	let yasqe = YASQE.fromTextArea(document.getElementById("generated-sparql"), yasqe_config);
	yasqe.on("blur", function(editor) {
		var val = editor.getValue();

		Session.set("generatedSparql", val);

		let yasqe3 = Template.sparqlForm.yasqe3.get();
		yasqe3.setValue(val);
		//yasqe3.refresh();
	});
	//yasqe.setValue("A");


	Template.sparqlForm_see_results.yasqe = new ReactiveVar(yasqe);
});


Template.sparqlForm_see_results.helpers(sparql_form_helpers);
Template.sparqlForm_see_results.events(sparql_form_events);



function extractTriplePatternsFromQuery(sparqlQuery) {
	// Locate the `WHERE` clause
	const whereIndex = sparqlQuery.toUpperCase().indexOf(" WHERE");
	if (whereIndex === -1) {
		return [];
	}

	// Extract the portion of the query starting from the `WHERE` clause
	const whereClause = sparqlQuery.slice(whereIndex);

	// Regex to match triple patterns
	const triplePatternRegex =
		/([^\s;{}]+)\s+([^\s;{}()]+(?:\([^)]*\))?)\s+((["'].*?["'](?:\^\^<[^>]+>|@[a-zA-Z]+)?)|<[^>]+>|[^\s;{}()]+)\s*\.\s*/g;

	const triples = [];
	let match;

	while ((match = triplePatternRegex.exec(whereClause)) !== null) {
		const [fullMatch, subject, predicate, object] = match;

		triples.push({
			subject,
			predicate,
			object,
		});
	}

	return triples;
}

// Returns a list of class names that a given token may have based on triples that contain the token
async function getTokenClassesFromTriples(token, extractedTriples) {
	let className;
	let classes;
	for (const triple of extractedTriples) {
		// If there is a triple that reveals the exact class of previous token, use that class
		if (triple.subject === token.string && (triple.predicate === "rdf:type" || triple.predicate === "a")) {
			className = triple.object;
			break;
		}
		// Otherwise if previous token is a subject or an object in a triple, find possible classes based on the predicate of the triple
		if (triple.subject === token.string) {
			let classesOut = await dataShapes.getClassesFull({
				main: { onlyPropsInSchema: true },
				element: { pList: { out: [{ name: triple.predicate, type: 'out' }] } }
			});
			classesOut = classesOut.data.map(row => row.full_name);
			if (classes) {
				// Only keep classes that match all relevant triples
				classes = classes.filter(c => classesOut.includes(c));
			}
			else {
				classes = classesOut;
			}
		}
		if (triple.object === token.string) {
			let classesIn = await dataShapes.getClassesFull({
				main: { onlyPropsInSchema: true },
				element: { pList: { in: [{ name: triple.predicate, type: 'in' }] }
				}
			});
			classesIn = classesIn.data.map(row => row.full_name);
			if (classes) {
				classes = classes.filter(c => classesIn.includes(c));
			}
			else {
				classes = classesIn;
			}
		}
	}
	if (className) {
		return [className];
	}
	else {
		return classes;
	}
}

// Filters and sorts the list of autocompletion results to best match the current token
function sortAndFilterResult(result, currToken) {
	// Only keep results that contain the current token
	result = result.filter(prop => prop.toLowerCase().includes(currToken.string.toLowerCase()));

	// Sort results so that those starting with the current token come first
	result.sort((a, b) => {
		const aStartsWith = a.toLowerCase().startsWith(currToken.string.toLowerCase());	// true if a starts with the current token, otherwise false
		const bStartsWith = b.toLowerCase().startsWith(currToken.string.toLowerCase());
		if (aStartsWith && !bStartsWith) return -1;
		if (!aStartsWith && bStartsWith) return 1;
		return 0;
	});
	return result;
}

function customClassCompleter(yasqe_doc) {
	return {
		isValidCompletionPosition: function(){return YASQE.Autocompleters.classes.isValidCompletionPosition(yasqe_doc)},
		preProcessToken: function(token) {return token},
		postProcessToken: function(token, suggestedString)  {return suggestedString},
		bulk: false,
		async: true,
		autoShow: false,
		get: async (token, callback) => {
			let result = [];
			const cur = yasqe_doc.getDoc().getCursor();	// Text cursor position
			const predicateToken = yasqe_doc.getPreviousNonWsToken(cur.line, token);	// Non-whitespace token before the current token (predicate)
			const subjectToken = yasqe_doc.getPreviousNonWsToken(cur.line, predicateToken);	// Non-whitespace token before the predicate token (subject)

			if (predicateToken.string === "a" || predicateToken.string === "rdf:type") {
				let classes = await getTokenClassesFromTriples(subjectToken, extractTriplePatternsFromQuery(yasqe_doc.getValue()));
				// Suggest all classes if no classes were found using existing triples
				if (!classes) {
					classes = await dataShapes.getClassesFull({main:{ onlyPropsInSchema: true}});
					classes = classes.data.map(row => row.full_name);
				}

				// Filter and sort the results based on incomplete token
				result = sortAndFilterResult(classes, token);
			}

			callback(result);

		}
	};
}


/**
 * @implements {DSSRequestProvider}
 */
class VqDSSRequestProvider {

	/**
	 * 
	 * @param {DSSParams} params 
	 * @returns {Promise<{data: ClassData[], complete: boolean}>}
	 */
	async getClasses(params) {
		const classes = await dataShapes.getClassesFull(params);
		const classData = classes.data.map(c => ({ value: c.iri, count: Number(c.cnt) }));
		return { data: classData, complete: classes.complete };
	}

	/**
	 * 
	 * @param {DSSParams} params 
	 * @returns {Promise<{data: DSSPropertyData[], complete: boolean}>}
	 */
	async getProperties(params) {
		const data = await dataShapes.getPropertiesFull(params);
		const propertyData = data.data.map(
			(p) => ({
				name: p.iri,
				type: p.mark,
				count: Number(p.o),
				displayName: p.display_name,
				localName: p.local_name,
				prefix: p.prefix,
				nsId: p.ns_id
			})
		);
		return { data: propertyData, complete: data.complete };
	}
	/**
	 * @returns {Promise<NamespaceData[]>}
	 */
	async getNamespaces() {
		return await dataShapes.getNamespaces();
	}
	/**
	 * 
	 * @returns {Promise<{name: string, dbSchemaName: string, schemaName: string, sparqlUrl: string}[]>}
	 */
	async getOntologyList() {
		/** @type { {id: number, display_name: string, db_schema_name: string, schema_name: string, sparql_url: string}[] } */
		const ontologies = await dataShapes.getOntologies();
		return ontologies.map(o => ({
			dbSchemaName: o.db_schema_name,
			name: o.display_name,
			schemaName: o.schema_name,
			sparqlUrl: o.sparql_url,
		}
		));
	}

	/**
	 * @return {Promise<string>}
	 */
	getOntology() {
		return Promise.resolve(dataShapes.schema.schema);
	}
}


/** 
 * @param {typeof YASQE} yasqeClass
 * @returns {CompleterConfig}
 */
function dssClientCompleter(yasqeClass) {
	const requestProvider = new VqDSSRequestProvider();
	/**@type {string} */
	const currentOntology = dataShapes.schema.schema;
	/**@type { {id: number, display_name: string, db_schema_name: string, schema_name: string, sparql_url: string}[] } */
	const endpoints = dataShapes.getOntologiesSync();
	const selectedEndpointData = endpoints.find(e => e.db_schema_name === currentOntology);
	const dssClient = new DSSClient(new VqDSSRequestProvider());

	const defaultPropertyCompleter = YASQE.Autocompleters["properties"];
	const defaultClassCompleter = YASQE.Autocompleters["classes"];
	/** @type CompleterConfig */
	const propertyCompleter = {
		name: "dasa_properties",
		autoShow: false,
		get: async (t, callback) => {
			callback(await getProperties(dssClient, yasqeClass, selectedEndpointData, t));
		},
		bulk: false,
		async: true,
		isValidCompletionPosition: () => {
			const isValid = defaultPropertyCompleter.isValidCompletionPosition(yasqeClass);
			console.log(`isValid: ${isValid}`);
			return isValid ?? false;
		},
		preProcessToken(token) {
			return preprocessIriForCompletion(yasqeClass, token);
		},
		postProcessToken: (t, s) => {
			return postProcessPropertySuggestion(yasqeClass, t, s);

		},
	}
	return propertyCompleter;
}

/** @type {{propertydata: { [IRIs: string]: PropertyData }, tokenMap: { [tokens: string]: PropertyData | null }, namespaceData?: NamespaceData[], token: AutocompletionToken | null}}*/
let autocompletionData = {
	propertydata: {},
	tokenMap: {},
	namespaceData: [],
	token: null,
};
/** @type {AbortController | null} */
let autocompleterAbortController = null;

/* 
Copied pre/post process functions from YASGUI
Copy of the MIT License from YASGUI for these functions
------------------------------------------------------------
The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/**
 * Converts rdf:type to http://.../type and converts <http://...> to http://...
 * Stores additional info such as the used namespace and prefix in the token object
 * @param {Yasqe} yasqe
 * @param {AutocompletionToken} token
 * @returns {AutocompletionToken}
 */
function preprocessIriForCompletion(yasqe, token) {
	const processedToken = token;
	const queryPrefixes = yasqe.getPrefixesFromQuery();
	const stringToPreprocess = token.string;

	const getPreviousNonWsToken = (startCh) => {
		const line = yasqe.getDoc().getCursor().line;
		let ch = Math.max(startCh - 1, 0);
		let prevToken = yasqe.getTokenAt({ line, ch });
		while (prevToken && prevToken.type === "ws" && prevToken.start > 0) {
			ch = Math.max(prevToken.start - 1, 0);
			prevToken = yasqe.getTokenAt({ line, ch });
		}
		return prevToken;
	};

	if (stringToPreprocess.indexOf("<") < 0) {
		const prefixSeparatorIndex = stringToPreprocess.indexOf(":");
		if (prefixSeparatorIndex >= 0) {
			processedToken.tokenPrefix = stringToPreprocess.substring(0, prefixSeparatorIndex + 1);
		} else {
			const prevToken = getPreviousNonWsToken(processedToken.start);
			if (prevToken && prevToken.string.endsWith(":")) {
				processedToken.tokenPrefix = prevToken.string;
				processedToken.from = { ch: prevToken.start };
			} else if (prevToken && prevToken.string === ":") {
				const prevPrevToken = getPreviousNonWsToken(prevToken.start);
				if (prevPrevToken) {
					processedToken.tokenPrefix = prevPrevToken.string + ":";
					processedToken.from = { ch: prevPrevToken.start };
				}
			}
		}

		if (processedToken.tokenPrefix && queryPrefixes[processedToken.tokenPrefix.slice(0, -1)] != null) {
			processedToken.tokenPrefixUri = queryPrefixes[processedToken.tokenPrefix.slice(0, -1)];
		}
	}

	processedToken.autocompletionString = stringToPreprocess.trim();
	if (stringToPreprocess.indexOf("<") < 0 && stringToPreprocess.indexOf(":") > -1) {
		// hmm, the token is prefixed. We still need the complete uri for autocompletions. generate this!
		for (const prefix in queryPrefixes) {
			if (processedToken.tokenPrefix === prefix + ":") {
				processedToken.autocompletionString = queryPrefixes[prefix];
				processedToken.autocompletionString += stringToPreprocess.substring(prefix.length + 1);
				break;
			}
		}
	} else if (stringToPreprocess.indexOf("<") < 0 && processedToken.tokenPrefixUri) {
		processedToken.autocompletionString = processedToken.tokenPrefixUri + stringToPreprocess;
	}

	if (processedToken.autocompletionString.indexOf("<") == 0)
		processedToken.autocompletionString = processedToken.autocompletionString.substring(1);
	if (processedToken.autocompletionString.indexOf(">", processedToken.autocompletionString.length - 1) > 0)
		processedToken.autocompletionString = processedToken.autocompletionString.substring(0, processedToken.autocompletionString.length - 1);
	return processedToken;
}

/**
 * @param {Yasqe} _yasqe
 * @param {AutocompletionToken} token
 * @param {string} suggestedString
 * @param {NamespaceData[]} namespaces
 * @returns {string}
 */
function postprocessIriCompletion(_yasqe, _, suggestedString, namespaces = []) {
	// console.log(`Token to complete: ${JSON.stringify(token)}, suggested string: ${suggestedString}`);

	// If the token is prefixable, convert the suggested string to prefixed form
	const prefixes = namespaces.map(ns => ([ns.name, ns.value]));

	const matchingPrefixEntry = prefixes.filter(([, uri]) => suggestedString.startsWith(uri));
	// Find the longest matching prefix to ensure the most specific prefix is used
	const sortedMatchingPrefixEntries = matchingPrefixEntry.sort((a, b) => b[1].length - a[1].length);
	if (sortedMatchingPrefixEntries.length > 0 && sortedMatchingPrefixEntries[0]) {
		const [matchingPrefix, matchingUri] = sortedMatchingPrefixEntries[0];
		suggestedString = matchingPrefix + ":" + suggestedString.substring(matchingUri.length);
	} else {
		suggestedString = `<${suggestedString}>`;
	}
	return suggestedString;
}

/**
 * Converts various sparql token forms to a normalized IRI form.
 * @param {Yasqe} yasqe instance of the editor
 * @param {string} iri IRI to preprocess
 * @returns {string} Normalized IRI
 */
function preprocessIri(yasqe, iri) {
	const queryPrefixes = yasqe.getPrefixesFromQuery();
	if (iri.indexOf("<") < 0) {
		// prefix form
		const prefixSeparatorIndex = iri.indexOf(":");
		if (prefixSeparatorIndex >= 0) {
			const prefix = iri.substring(0, prefixSeparatorIndex);
			if (queryPrefixes[prefix] != null) {
				return queryPrefixes[prefix] + iri.substring(prefixSeparatorIndex + 1);
			}
		}
		console.warn(`Could not preprocess IRI ${iri} to full URI form. Returning as is.`);
		return iri;
	} else {
		if (iri.trim().endsWith(">")) {
			// <IRI> form
			return iri.substring(1, iri.length - 1);
		} else {
			// Incomplete <IRI form
			return iri.substring(1);
		}
	}
}
/* ----- End of copied functions ----- */

/**
 * @param {Yasqe} yasqe
 * @param {{subject: string, predicate: string, object: string}} triplePattern
 * @returns {{subject: string, predicate: string, object: string}}
 */
function preprocessTriplePattern(yasqe, triplePattern) {
	return {
		subject: preprocessIri(yasqe, triplePattern.subject),
		predicate: preprocessIri(yasqe, triplePattern.predicate),
		object: preprocessIri(yasqe, triplePattern.object),
	};
}

/**@typedef {{subject: string, predicate: string, object: string}} Triple */

/**
 * @param {DSSClient} dssClient
 * @param {Triple[]} queryContext
 * @param {string} dbSchemaName
 * @returns {DSSAutocompletionClient}
 */
function constructClient(dssClient, queryContext) {
	const tripleStore = new TripletStore();
	tripleStore.triplets = queryContext;
	const client = new DSSAutocompletionClient(tripleStore, dssClient);
	client.perRequestLimit = 600;
	return client;
}




const getProperties = async (dssClient, yasqeClass, endpointData, token) => {
	if (autocompleterAbortController) {
		autocompleterAbortController.abort("New autocompletion request triggered");
	}
	autocompleterAbortController = new AbortController();
	const cursor = yasqeClass.getCursor();
	console.log(`Cursor position: line ${cursor.line}, ch ${cursor.ch}`);

	const triplePatterns = queryBuilderModule.extractTriplePatternsFromQuery(yasqeClass.getValue(), cursor);
	console.log(triplePatterns);

	const processedTriples = triplePatterns[0].map(tp => preprocessTriplePattern(yasqeClass, tp));
	const currentTriple = triplePatterns[1] ? preprocessTriplePattern(yasqeClass, triplePatterns[1]) : null;
	const activeItem = endpointData;
	if (!activeItem) {
		console.error("No active endpoint selected for autocompletion.");
		return [];
	}
	console.log(`Current endpoint: ${activeItem?.name}`);

	const autocompletionClient = constructClient(dssClient, processedTriples, activeItem.dbSchemaName);
	const incomingBuilder = new QueryBuilder();
	incomingBuilder.usePPRels = true;
	let suggestions = await autocompletionClient.suggestProperties(currentTriple.subject, currentTriple.object, null);

	const namespaceData = await autocompletionClient.dssClient.getNamespaces();

	if (token) {
		suggestions = suggestions.sort(suggestionComparatorModule.suggestionComparator(yasqeClass.getPrefixesFromQuery(), token.autocompletionString, namespaceData));
	}

	if (suggestions.length === 0) {
		console.log("Falling back to generic property suggestions");
		const genericSuggestions = await yasqeClass.Autocompleters["property"]?.get(yasqeClass, token);
		return genericSuggestions || [];
	}

	autocompletionData = {
		propertydata: suggestions.reduce((acc, suggestion) => {
			acc[suggestion.value] = suggestion;
			return acc;
		}, {}),
		tokenMap: {},
		namespaceData: await autocompletionClient.dssClient.getNamespaces(),
		token: token ?? null,
	}

	const suggestionValues = suggestions.map(s => s.value);
	console.log(`Found ${suggestionValues.length} property suggestions: ${suggestionValues}`);
	return suggestionValues;
}


/**@type {NonNullable<CompleterConfig["postProcessSuggestion"]>} */
export const postProcessPropertySuggestion = (yasqe, token, suggestedString) => {
	const completedString = postprocessIriCompletion(yasqe, token, suggestedString, autocompletionData.namespaceData);
	autocompletionData.tokenMap[completedString] = autocompletionData.propertydata[suggestedString] ?? null;
	return completedString;
}

/**
 * 
 * @param {string} sub 
 * @param {string} str 
 * @returns {[string, boolean][]} 
 */
function subsequenceHighlighter(sub, str) {
	/** @type {[string, boolean][]} */
	const result = [];
	let subIndex = 0;
	for (let i = 0; i < str.length; i++) {
		if (subIndex < sub.length && str[i].toLocaleLowerCase() === sub[subIndex].toLocaleLowerCase()) {
			result.push([str[i], true]);
			subIndex++;
		} else {
			result.push([str[i], false]);
		}
	}
	return result;
}

/**
 * 
 * @param {[string, boolean][]} highlightedSequence 
 * @returns 
 */
function highlightSequenceToHtml(highlightedSequence) {
	const span = document.createElement("span");
	for (const [char, isHighlighted] of highlightedSequence) {
		const charSpan = document.createElement("span");
		charSpan.textContent = char;
		if (isHighlighted) {
			charSpan.classList.add("highlighted");
		}
		span.appendChild(charSpan);
	}
	return span;
}
