// import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '../../../lib/interpreter.js'
import { Utilities, reset_variable } from '../../../platform/js/utilities/utils.js'
import { is_system_admin } from '../../../../libs/platform/user_rights.js'
import { Projects, Diagrams } from '../../../../db/platform/collections.js'

import { dataShapes } from '../../../custom/vq/js/DataShapes.js'

import {
    Fragment,
    createElement,
    useEffect,
    useState,
} from "react";
import { createRoot } from "react-dom/client";
import { useTracker } from "meteor/react-meteor-data";
import {
    PortalContext,
    AggregatedTable,
    PropertySelector,
    formatMultiCardinalTableAsSelectQuery,
} from "rdf-toolbag";

// FIXME: styling is not quite right
import rdfToolbagStyle from '/node_modules/rdf-toolbag/dist/rdf-toolbag.css';
import './sparql_form.html'
import { tableToRows } from 'rdf-toolbag/dist/rdf-toolbag.js'

YASQE.registerAutocompleter('customClassCompleter', customClassCompleter);
YASQE.registerAutocompleter('customPropertyCompleter', customPropertyCompleter);
YASQE.defaults.autocompleters = ['customClassCompleter', "customPropertyCompleter", "variables"];

// var yasqe = null;
// var yasqe3 = null;

// NOTE: Using `rem` and `styleOverrideMap` to emulate the default 1rem=16px layout because
// the current 1rem is too small to be readable and we need to override all variables that use
// rem units.
const baseSizePx = 16;
const rem = (val) => `${baseSizePx * val}px`;


/**
 * Reshape xml-ified json to json.
 *
 * @return {{
 *   head: { vars: string[] },
 *   results: {
 *     bindings: {
 *       [col: string]: {
 *         type: "uri" | "literal",
 *         value: string,
 *       }
 *     }[]
 *   }
 * }}
 */
function reshapeData(sourceData) {
    const cols = sourceData.head[0].variable.map((item) => item["$"].name);
    const items = sourceData.results[0]?.result ?? [];
    const rows = items
        .map((row) => {
            const entries = row
                .binding
                .map((item) => {
                    const key = item["$"].name;

                    const maybeUri = item.uri;
                    const maybeLiteral = item.literal;
                    let type;
                    let value;
                    let extraProps = {};

                    if (maybeUri !== undefined) {
                        type = "uri";
                        value = maybeUri[0];
                    } else if (maybeLiteral !== undefined) {
                        type = "literal";
                        value = maybeLiteral[0]["_"];
                        extraProps = maybeLiteral[0]["$"];
                    } else {
                        throw new Error("Unexpected type!");
                    }

                    return [key, {
                        ...extraProps,
                        type,
                        value,
                    }];
                });

            return Object.fromEntries(entries);
        });

    const res = {
        head: { vars: cols },
        results: { bindings: rows },
    };

    return res;
}

/**
 * @return {Promise<{
 *   iri: string,
 *   prefixedName: string,
 *   displayName: string,
 * }[] | null>}
 */
async function getClasses() {
    const classesData = await dataShapes.getClasses();
    // TODO: provide error msg
    if (classesData.error) return null;
    return classesData.data.map((item) => ({
        iri: item.iri,
        prefixedName: item.full_name,
        displayName: item.display_name,
    }));
}

/**
 * @param {string} className
 * @param {number} [limit]
 *
 * @return {Promise<{
 *   iri: string,
 *   prefixedName: string,
 *   displayName: string,
 * }[] | null>}
 */
async function getProperties(className, limit) {
    const propertiesData = await dataShapes.getPropertiesFull({
        main: {
            propertyKind: 'Data',
            limit,
            addTypes: true,
        },
        element: { className },
    });

    // TODO: provide error msg
    if (propertiesData.error) return null;

    return propertiesData.data.map((item) => ({
        iri: item.iri,
        prefixedName: item.full_name,
        displayName: item.display_name,
    }));
}

function Button(props) {
    const { style, ...restProps } = props;

    return createElement(
        "button",
        {
            style: {
                padding: `${rem(0.5)} ${rem(1)}`,
                cursor: "pointer",
                borderRadius: rem(0.5),
                color: "#000",
                border: "1px solid #aaa",
                ...style,
            },
            ...restProps,
        },
    );
}

function TableView() {
    const tableRes = useTracker(() => Session.get("executedSparql")?.sparql);
    const reshapedData = tableRes ? reshapeData(tableRes) : null;
    const rows = reshapedData ? tableToRows(reshapedData) : null;
    const properties = (rows && (rows.length >= 1)) ? Object.keys(rows[0].props) : undefined;

    const canTableBeRendered = properties && rows;

    return createElement(
        "div",
        {},
        !canTableBeRendered && createElement("p", {}, "table can't be rendered"),
        canTableBeRendered && createElement(
            AggregatedTable,
            {
                properties,
                rows,
            }),
    );
}

function TableViewMsgs() {
    const executedSparql = useTracker(() => Session.get("executedSparql"));
    const limit = executedSparql?.limit;
    const unprocessedNumberOfRows = executedSparql?.number_of_rows;
    // NOTE: numberOfRows is a string for some reason and it should be processed
    const numberOfRows = (unprocessedNumberOfRows === undefined)
          ? undefined
          : Number(unprocessedNumberOfRows);

    /** @type {string|null} */
    let msg = null;

    if (!executedSparql) msg = "No sparql results.";
    else if (limit === undefined) msg = "Limit is not defined";
    else if (numberOfRows === undefined) msg = "Number of rows is unknown";
    else if (numberOfRows >= limit) msg = "Warning: row limit is reached, data may be incomplete";

    return createElement(
        Fragment,
        {},
        msg && createElement("p", { style: { fontSize: rem(1) }}, msg)
    );
}

function ExtendedTableView() {
    return createElement(
        "div",
        {},
        createElement(TableViewMsgs),
        createElement(TableView),
    );
}

function setEditorText(text) {
    const yasqe = Template.sparqlForm_see_results.yasqe.get();
    const yasqe3 = Template.sparqlForm.yasqe3.get();

    yasqe.setValue(text);
    yasqe3.setValue(text);
}

function switchToEditorTab() {
    $('#vq-tab a[href="#sparql"]').tab('show');
}

function QueryGeneratorView() {
    const [selectedType, setSelectedType] = useState(null);
    const [typeSuggestions, setTypeSuggestions] = useState(null);
    const [properties, setProperties] = useState([]);
    const [suggestions, setSuggestions] = useState([]);

    // NOTE: Init class suggestions
    useEffect(() => {
        (async () => {
            const res = await getClasses();
            setTypeSuggestions(res);
        })();
    }, []);

    // NOTE: Sync suggestions to selected class
    useEffect(() => {
        (async () => {
            const res = await getProperties(selectedType);
            if (!res) setSuggestions([]);
            else setSuggestions(res.map(({ iri, prefixedName }) => ({
                label: `${prefixedName}`,
                value: iri,
            })));
        })();
    }, [selectedType]);

    return createElement(
        "div",
        {
            style: {
                display: "flex",
                flexDirection: "column",
                gap: rem(0.5),
                fontSize: rem(1.0),
            },
        },
        createElement(
            "div",
            {},
            createElement("p", {}, "Type"),
            createElement(
                "select",
                {
                    value: selectedType || "",
                    onChange: (e) => setSelectedType(e.target.value),
                    style: {
                        padding: `${rem(0.5)} ${rem(1)}`,
                        border: "1px solid #aaa",
                        borderRadius: rem(0.5),
                    },
                },
                createElement(
                    "option",
                    {
                        value: "",
                        hidden: true,
                    },
                    "--Select type--",
                ),
                typeSuggestions && typeSuggestions.map((item) => createElement(
                    "option",
                    {
                        value: item.iri,
                        key: item.iri,
                    },
                    item.iri,
                )),
            ),
        ),
        createElement(
            "div",
            {},
            createElement("p", {}, "Properties"),
            createElement(
                PropertySelector,
                {
                    value: properties,
                    onValueChange: setProperties,
                    suggestions,
                }
            ),
        ),
        createElement(
            Button,
            {
                onClick: () => {
                    if (!selectedType) return;
                    const limit = 10;
                    const q = formatMultiCardinalTableAsSelectQuery(
                        `<${selectedType}>`,
                        properties,
                        limit
                    );
                    setEditorText(q);
                    switchToEditorTab();
                },
                style: {
                    width: "fit-content",
                },
            },
            "Create sparql",
        ),
    );
}

/**
 * Mount property selector.
 */
function initReactComponents(domElement, component) {
    // NOTE: Component root and portal root is wrapped in shadow DOM in order to isolate styling

    const styleOverrideMap = {
        "--spacing": rem(0.25),
        "--text-xs": rem(0.75),
        "--text-sm": rem(0.875),
        "--text-base": rem(1),
        "--text-lg": rem(1.125),
        "--text-xl": rem(1.25),
        "--text-2xl": rem(1.5),
        "--text-3xl": rem(1.875),
        "--text-4xl": rem(2.25),
        "--text-5xl": rem(3),
        "--text-6xl": rem(3.75),
        "--text-7xl": rem(4.5),
        "--text-8xl": rem(6),
        "--text-9xl": rem(8),
        "--radius": rem(0.625),
        "--radius-xs": rem(0.125),
        "--radius-sm": rem(0.25),
        "--radius-md": rem(0.375),
        "--radius-lg": rem(0.5),
        "--radius-xl": rem(0.75),
        "--radius-2xl": rem(1),
        "--radius-3xl": rem(1.5),
        "--radius-4xl": rem(2),
    };

    const varOverride = new CSSStyleSheet();
    const styleString = `:host { ${
      Object.entries(styleOverrideMap).map(([k, v]) => `${k}: ${v};\n`).join("")
    } }`;
    varOverride.replaceSync(styleString);
    console.log({ styleString, varOverride });


    const constructedStyleSheet = new CSSStyleSheet();
    constructedStyleSheet.replaceSync(rdfToolbagStyle.textContent);

    const constructedStyleSheetArray = [varOverride, constructedStyleSheet];

    const mainShadow = domElement.attachShadow({ mode: "open" });
    const portalShadowHost = document.body.appendChild(document.createElement("div"));
    // NOTE: Added classname for debugability
    portalShadowHost.classList.add("portal-shadow-host");
    const portalShadow = portalShadowHost.attachShadow({ mode: "open" });

    mainShadow.adoptedStyleSheets = constructedStyleSheetArray;
    portalShadow.adoptedStyleSheets = constructedStyleSheetArray;

    const root = createRoot(mainShadow);

    root.render(createElement(
        PortalContext,
        { value: { container: portalShadow } },
        component,
    ));
}

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

    const anotherElement = this.find("#queryGen");
    if (!anotherElement) {
        throw new Error("unexpected missing");
    }

    const root = anotherElement.getElementsByClassName("react-mount-root")[0];

    if (!root) {
        throw new Error("unexpected missing root");
    }

    initReactComponents(root, createElement(QueryGeneratorView));

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
