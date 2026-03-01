// import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '../../../lib/interpreter.js'
import { Utilities, reset_variable } from '../../../platform/js/utilities/utils.js'
import { is_system_admin } from '../../../../libs/platform/user_rights.js'
import { Projects, Diagrams } from '../../../../db/platform/collections.js'

import { dataShapes } from '../../../custom/vq/js/DataShapes.js'

import {
    initReactComponents,
    ExtendedTableView,
    QueryGeneratorView,
} from '../js/complexTable.js';
import { createElement } from 'react';

import './sparql_form.html'

YASQE.registerAutocompleter('customClassCompleter', customClassCompleter);
YASQE.registerAutocompleter('customPropertyCompleter', customPropertyCompleter);
YASQE.defaults.autocompleters = ['customClassCompleter', "customPropertyCompleter", "variables"];

// var yasqe = null;
// var yasqe3 = null;


// NOTE: Limit size that is larger than the usual page size and can be used to fetch more rows
const BIG_LIMIT = 2000;

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

    "click #change-limit": async function(e) {
        e.preventDefault();

        const yasqe = Template.sparqlForm_see_results.yasqe.get();
        const query = yasqe.getValue();
        const obj = Session.get("executedSparql");

        const newLimit = BIG_LIMIT;
		const paging_info = { offset: 0, limit: newLimit, number_of_rows: obj.number_of_rows};

		await Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(query, paging_info);

        // NOTE: We are fixing limit because it is not updated
        // NOTE: We are overriding limit_set to be true only when row count hits the limit because
        // UI uses this info to show if the limit is reached.
        const oldValue = Session.get("executedSparql");
        Session.set("executedSparql", {
            ...oldValue,
            limit: newLimit,
            limit_set: oldValue.number_of_rows >= newLimit,
        });
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
  },

  bigLimit() {
    return BIG_LIMIT;
  },
};


Template.sparqlForm.onRendered( async function() {
//console.log('--sparqlForm.onRendered--')

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

	var project_id = Session.get("activeProject");
	var project = Projects.findOne({_id: project_id,});
	//console.log(project)

	if (project!== undefined && project.newPublicProject) {

		await dataShapes.changeActiveProject(project_id, 'Template.sparqlForm.onRendered');
		var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
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

    const elementSelector = ".react-mount-root";
    const maybeElement = this.find(elementSelector);
    if (maybeElement) {
        initReactComponents(maybeElement, createElement(ExtendedTableView));
    } else {
        throw new Error(
            `Could not find element by '${elementSelector}, React component won't be mounted!`
        );
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
		if (triple.subject == token.string && (triple.predicate == "rdf:type" || triple.predicate == "a")) {
			className = triple.object;
			break;
		}
		// Otherwise if previous token is a subject or an object in a triple, find possible classes based on the predicate of the triple
		if (triple.subject == token.string) {
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
		if (triple.object == token.string) {
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

			if (predicateToken.string == "a" || predicateToken.string == "rdf:type") {
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

function customPropertyCompleter(yasqe_doc) {
	return {
		isValidCompletionPosition: function(){return YASQE.Autocompleters.properties.isValidCompletionPosition(yasqe_doc)},
		preProcessToken: function(token) {return token},
		postProcessToken: function(token, suggestedString)  {return suggestedString},
		bulk: false,
		async: true,
		autoShow: false,
		get: async(token, callback) => {
			let result = [];
			const previousToken = yasqe_doc.getPreviousNonWsToken(yasqe_doc.getDoc().getCursor().line, token);	// Previous non-whitespace token (subject, e.g. variable)
			const sparqlQuery = yasqe_doc.getValue();
			const extractedTriples = extractTriplePatternsFromQuery(sparqlQuery);
			const classes = await getTokenClassesFromTriples(previousToken, extractedTriples);

			// Get properties of possible classes
			if (classes) {
				for (let c of classes) {
					let properties = await dataShapes.getPropertiesFull({
						main: { propertyKind: 'All' },
						element: { className: c }
					});
					result = result.concat(properties.data.map(row => row.full_name));
				}
				// Remove duplicates
				result = [...new Set(result)];

				// Filter and sort the results based on incomplete token
				result = sortAndFilterResult(result, token);
			}

			callback(result);

		}
	};

}
