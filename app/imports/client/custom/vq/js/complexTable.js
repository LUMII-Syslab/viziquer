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
    deduplicateTable,
} from "rdf-toolbag";
// @ts-ignore
import rdfToolbagStyle from 'rdf-toolbag/dist/rdf-toolbag.css';
import { tableToRows } from 'rdf-toolbag/dist/rdf-toolbag.js'
import { dataShapes } from '../../../custom/vq/js/DataShapes.js'

// NOTE: Using `rem` and `styleOverrideMap` to emulate the default 1rem=16px layout because
// the current 1rem is too small to be readable and we need to override all variables that use
// rem units.
export const baseSizePx = 16;
/** @type (function(number):string) */
export const rem = (val) => `${baseSizePx * val}px`;

/**
 * @param style {string}
 */
function styleSheetFromString(style) {
    const res = new CSSStyleSheet();
    res.replaceSync(style);
    return res;
}

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

const varOverrideStyleSheet = styleSheetFromString(`:host { ${
    Object.entries(styleOverrideMap).map(([k, v]) => `${k}: ${v};\n`).join("")
} }`);

const rdfToolbagStyleSheet = styleSheetFromString(rdfToolbagStyle.textContent);

// NOTE: We picked a z-index that's bigger than bootstrap modal's z-index with the assumption that
// this modal will be above other modals.
const portalStyleSheet = styleSheetFromString("* { z-index: 2000; }");

const portalShadowClassname = "portal-shadow-host";

// NOTE: This function ensures only one portal shadow exists because we don't need more than one
function getPortalShadow() {
    const maybeRes = document.getElementsByClassName(portalShadowClassname).item(0);
    if (maybeRes) return maybeRes.shadowRoot;

    const portalShadowHost = document.body.appendChild(document.createElement("div"));
    portalShadowHost.classList.add(portalShadowClassname);
    const portalShadow = portalShadowHost.attachShadow({ mode: "open" });

    portalShadow.adoptedStyleSheets = [
        varOverrideStyleSheet,
        rdfToolbagStyleSheet,
        portalStyleSheet,
    ];

    return portalShadow;
}

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
export async function getClasses() {
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
 * @param {"Data" | "Object"} [propertyKind]
 * @param {number} [limit]
 *
 * @return {Promise<{
 *   iri: string,
 *   prefixedName: string,
 *   displayName: string,
 * }[] | null>}
 */
export async function getProperties(className, propertyKind, limit) {
    /** @type {{ error: string, data: *[] }} */
    const propertiesData = await dataShapes.getPropertiesFull({
        main: {
            propertyKind,
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
 * Get map that matches prefix with full URI.
 *
 * @return {Promise<{[key: string]:string}>}
 */
export async function getPrefixes() {
    /** @type {*} */
    const namespaces = await dataShapes.getNamespaces();
    const res = Object.fromEntries(namespaces.map((item) => [item.name, item.value]));

    return res;
}

/**
 * Get full URI from prefixedName.
 *
 * @param prefixMap {{[key: string]: string}}
 * @param prefixedName {string}
 *
 * @return {string?}
 */
export function resolvePrefixedName(prefixMap, prefixedName) {
    const splitName = prefixedName.split(":");
    if (splitName.length !== 2) return null;
    const [prefix, name] = splitName;
    const uriPrefix = prefixMap[prefix];
    if (uriPrefix === undefined) return null;
    return `${uriPrefix}${name}`;
}

/**
 * @param props {React.JSX.IntrinsicElements["button"]}
 */
export function Button(props) {
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

function TripleAggregationTableView() {
    const tableRes = useTracker(() => Session.get("executedSparql")?.sparql);
    const reshapedData = tableRes ? reshapeData(tableRes) : null;

    // NOTE: tableToRows throws error if there's not exactly 3 cols
    const rows = (() => {
        if (!reshapedData) return null
        try {
            return tableToRows(reshapedData);
        } catch {
            return null;
        }
    })();

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

function DeduplicatedTableView() {
    const [deduplicationKey, setDeduplicationKey] = useState(
        /** @type {string | undefined} */ (undefined)
    );

    const tableRes = useTracker(() => Session.get("executedSparql")?.sparql);
    const reshapedData = tableRes ? reshapeData(tableRes) : null;

    const rows = reshapedData && deduplicateTable(reshapedData, deduplicationKey);

    const firstRow = rows?.[0];

    if (!firstRow) return undefined;

    const properties = Object.keys(firstRow.props);
    const deduplicationKeySuggestions = [firstRow.idName, ...properties];

    return rows && properties && createElement(
        "div",
        {},
        createElement(
            "select",
            {
                value: deduplicationKey,
                // @ts-ignore
                onChange: (e) => setDeduplicationKey(e.target.value),
                style: {
                    padding: `${rem(0.5)} ${rem(1)}`,
                    border: "1px solid #aaa",
                    borderRadius: rem(0.5),
                },
            },
            deduplicationKeySuggestions?.map((item) => createElement(
                "option",
                { value: item, key: item },
                item,
            )),
        ),
        createElement(AggregatedTable, { properties, rows }),
    );
}

export function ExtendedTableView() {
    const [tabIndex, setTabIndex] = useState(0);

    /** @type {{name: string, el: React.ReactNode}[]} */
    const tabs = [
        {
            name: "Triple aggregation",
            el: createElement(
                "div",
                {},
                createElement(TableViewMsgs),
                createElement(TripleAggregationTableView),
            ),
        },
        {
            name: "Deduplicated table",
            el: createElement(
                "div",
                {},
                createElement(DeduplicatedTableView)
            )
        },
    ];

    return createElement(
        "div",
        {},
        createElement(
            "div",
            {
                style: {
                    padding: rem(0.5),
                    display: "flex",
                    gap: rem(0.5),
                }
            },
            tabs.map(({ name }, i) => {
                const selected = i == tabIndex;
                return createElement(
                    Button,
                    {
                        onClick: () => setTabIndex(i),
                        style: {
                            ...(selected ? {
                                fontWeight: "bold",
                            } : {}),
                        }
                    },
                    name,
                );
            }),
        ),
        tabs[tabIndex]?.el,
    );
}

/**
 * Mount property selector.
 *
 * @param domElement {Element}
 * @param component {React.ReactNode}
 */
export function initReactComponents(domElement, component) {
    // NOTE: Component root and portal root is wrapped in shadow DOM in order to isolate styling

    const mainShadow = domElement.attachShadow({ mode: "open" });

    mainShadow.adoptedStyleSheets = [
        varOverrideStyleSheet,
        rdfToolbagStyleSheet
    ];

    const root = createRoot(mainShadow);

    root.render(createElement(
        PortalContext,
        // @ts-ignore
        { value: { container: getPortalShadow() } },
        component,
    ));
}
