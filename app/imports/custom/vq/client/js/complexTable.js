// @ts-check
import {
    createElement,
} from "react";
import { createRoot } from "react-dom/client";
import {
    PortalContext,
} from "multicardinal-table";
// @ts-ignore
import rdfToolbagStyle from 'multicardinal-table/dist/multicardinal-table.css';
import { dataShapes } from '../../../vq/client/js/DataShapes.js'

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
export function reshapeData(sourceData) {
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
                        const itemToExtractFrom = maybeLiteral[0];
                        const childType = typeof itemToExtractFrom;

                        if (childType === "object") {
                            value = itemToExtractFrom["_"];
                            extraProps = itemToExtractFrom["$"];
                        } else if (childType === "string") {
                            // NOTE: For some reason child can be a string, not just object.
                            value = itemToExtractFrom;
                            extraProps = {};
                        } else {
                            throw new Error(`Unexpected child type: ${childType}!`);
                        }
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
