// @ts-check
import {
    Fragment,
    createElement,
    useEffect,
    useState,
} from "react";
import { createRoot } from "react-dom/client";
import { useTracker } from "meteor/react-meteor-data";
import { Session } from "meteor/session";
import { Template } from "meteor/templating";
import {
    PortalContext,
    AggregatedTable,
    PropertySelector,
    formatMultiCardinalTableAsSelectQuery,
} from "rdf-toolbag";
// @ts-ignore
import rdfToolbagStyle from 'rdf-toolbag/dist/rdf-toolbag.css';
import { tableToRows } from 'rdf-toolbag/dist/rdf-toolbag.js'
import { dataShapes } from '../../../custom/vq/js/DataShapes.js'

// NOTE: Using `rem` and `styleOverrideMap` to emulate the default 1rem=16px layout because
// the current 1rem is too small to be readable and we need to override all variables that use
// rem units.
const baseSizePx = 16;
/** @type (function(number):string) */
const rem = (val) => `${baseSizePx * val}px`;

/**
 * Reshape xml-ified json to json.
 *
 * @param sourceData {*}
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
    /** @type {{ error: string, data: *[] }} */
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
    /** @type {{ error: string, data: *[] }} */
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

/**
 * @param props {React.JSX.IntrinsicElements["button"]}
 */
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

export function ExtendedTableView() {
    return createElement(
        "div",
        {},
        createElement(TableViewMsgs),
        createElement(TableView),
    );
}

/**
 * @param text {string}
 */
function setEditorText(text) {
    const yasqe = Template.sparqlForm_see_results.yasqe.get();
    const yasqe3 = Template.sparqlForm.yasqe3.get();

    yasqe.setValue(text);
    yasqe3.setValue(text);
}

function switchToEditorTab() {
    // @ts-ignore
    $('#vq-tab a[href="#sparql"]').tab('show');
}

export function QueryGeneratorView() {
    const [selectedType, setSelectedType] = useState(
        /** @type {string?} */ (null)
    );
    const [typeSuggestions, setTypeSuggestions] = useState(
        /** @type {Awaited<ReturnType<getClasses>>} */ (null)
    );
    const [properties, setProperties] = useState(
        /** @type {string[]} */ ([])
    );
    const [suggestions, setSuggestions] = useState(
        /** @type {{label: string, value: string}[]} */ ([])
    );

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
            if (!selectedType) {
                setSuggestions([]);
                return;
            }
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
                    // @ts-ignore
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
                    // @ts-ignore
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
 *
 * @param domElement {HTMLElement}
 * @param component {React.FC}
 */
export function initReactComponents(domElement, component) {
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
        // @ts-ignore
        { value: { container: portalShadow } },
        component,
    ));
}
