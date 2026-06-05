// @ts-check
import { Interpreter } from '/imports/client/lib/interpreter.js';
import { Template } from "meteor/templating";
import { createVQ_Element, VQ_Element } from '../js/VQ_Element.js'

import './generate_complex_table_query_form.html'
import { Button, getClasses, getPrefixes, getProperties, initReactComponents, rem, resolvePrefixedName } from '../js/complexTable.js';
import { createElement, useEffect, useState } from 'react';
import {
    ComplexPropertySelector,
    deduplicateTable,
    demangleVarName,
    formatMultiCardinalTableAsSelectQuery,
    formatQuery,
    formatUniversalPaginatorQuery,
    SyncPropertySelector,
} from 'rdf-toolbag';

/** @type {*} */
let modalElement = null;

// NOTE: Made this simple event handler in order to cleanly notify QueryGeneratorView when property
// selection needs to be pre-filled again.
// NOTE: autoFillStrategy:
//   - "fromElement" -- props are retrieved from the info available in the visual element
//   - "topProps" -- most frequently occurring props for the element's type are selected
//   - "linkTopProps" -- like "topProps" but the current element is assumed to be a link
/**
 * @typedef {{
 *   autofillStrategy: "fromElement" | "topProps" | "linkTopProps",
 * }} ModalRequestEventPayload
 **/
/** @typedef {(payload: ModalRequestEventPayload) => void} ModalRequestCallback */

/** @type {Set<ModalRequestCallback>} */
let eventTargets = new Set();
const queryGeneratorModalRequest = {
    /** @type {(callback: ModalRequestCallback) => void} */
    subscribe: (callback) => {eventTargets.add(callback)},
    /** @type {(callback: ModalRequestCallback) => void} */
    unsubcribe: (callback) => {eventTargets.delete(callback)},
    /** @type {ModalRequestCallback} */
    emit: (eventPayload) => eventTargets.forEach((callback) => callback(eventPayload)),
};

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

/**
 * useState hook that immediately tries to fetch the needed properties.
 *
 * @param {string?} selectedType
 * @param {"Object" | "Data"} propertyType
 * @param {number} [limit]
 *
 * @return {Promise<{label: string, value: string}[]>}
 */
async function getPropertySuggestions(selectedType, propertyType, limit) {
    console.log({ selectedType, propertyType });

    // NOTE: There's probably a bunch of properties to suggest when no type is known but for now
    // we will return empty array.
    if (!selectedType) return [];
    const props = await getProperties(selectedType, propertyType, limit);
    if (!props) return [];
    return props.map(({ iri, prefixedName }) => ({
        label: `${prefixedName}`,
        value: iri,
    }));
}

/**
 * @return ComplexPropertySelection
 */
function makeDefaultSelection() {
    return {
        rdfType: "",
        dataProps: [],
        objectProps: [],
    };
}

/**
 * @typedef {NonNullable<Parameters<typeof ComplexPropertySelector>[0]["selection"]>} ComplexPropertySelection
 */

/**
 * Call `setClass` with selected element's type.
 *
 * @param {(newValue: ComplexPropertySelection) => void} setSelection
 */
function useSyncWithDiagram(setSelection) {
    /**
     * @param {string} val
     *
     * @return {string}
     **/
    function itemNameToPrefixedName(val) {
        const matches = val.split(/\s+/);

        // NOTE: Probably should find a first match that looks like prefixed name but this will do
        // for now
        return matches[0];
    }

    /**
     * @param {ModalRequestEventPayload} payload
     */
    async function syncSelectionToDiagramSelection(payload) {
        // TODO: This function should maintain some sort of loading state. If the user starts
        // editing while this function is not finished, selection will most likely be overriden on
        // finish.
        switch (payload.autofillStrategy) {
            case "fromElement":
                await fromElementSyncSelectionToDiagramSelection();
                break;
            case "topProps":
                await topPropsSyncSelectionToDiagramSelection();
                break;
            case "linkTopProps":
                await topPropsLinkSyncSelectionToDiagramSelection();
                break;
        }
    }

    const dataLimit = 5;
    const objLimit = 3;

    /**
     * @param {{[key: string]: string}} prefixes
     * @param {Awaited<ReturnType<createVQ_Element>>} vqItem
     *
     * @return ComplexPropertySelection
     */
    async function topPropsToSelection(prefixes, vqItem) {
        if (!vqItem) return makeDefaultSelection();

        const prefixedClass = await vqItem.getName().then(itemNameToPrefixedName);
        const resolvedClass = resolvePrefixedName(prefixes, prefixedClass);

        if (!resolvedClass) return makeDefaultSelection();

        const [dataProps, objectProps] = await Promise.all([
            getPropertySuggestions(resolvedClass, "Data", dataLimit)
                .then((res) => res.map(({ value }) => ({ name: value }))),
            getPropertySuggestions(resolvedClass, "Object", objLimit)
                .then((res) => res.map(({ value }) => ({
                    name: value,
                    selection: {
                        rdfType: "",
                        dataProps: [],
                        objectProps: [],
                    },
                }))),
        ]);

        return {
            rdfType: resolvedClass,
            dataProps,
            objectProps,
        };
    }

    async function topPropsSyncSelectionToDiagramSelection() {
        const elements = Interpreter.editor.getSelectedElements();
        const firstKey = Object.keys(elements)[0];

        const [vqItem, prefixes] = await Promise.all([
            createVQ_Element(firstKey),
            getPrefixes(),
        ]);

        setSelection(
            vqItem
                ? await topPropsToSelection(prefixes, vqItem)
                : makeDefaultSelection()
        );
    }

    async function topPropsLinkSyncSelectionToDiagramSelection() {
        const elements = Interpreter.editor.getSelectedElements();
        const firstElement = Object.entries(elements)[0][1];
        if (!firstElement) throw new Error("No element can be found!");
        if (firstElement.type !== "Line") throw new Error("Found element is not a line!");

        const startId = firstElement?.startElementId;
        const endId = firstElement?.endElementId;

        const [startObj, endObj, linkObj, prefixes] = await Promise.all([
            createVQ_Element(startId),
            createVQ_Element(endId),
            createVQ_Element(firstElement._id),
            getPrefixes(),
        ]);

        if (!startObj) throw new Error("Start element could not be found!");
        if (!endObj) throw new Error("End element could not be found!");
        if (!linkObj) throw new Error("Link element could not be found!");

        const [startSelection, endSelection, linkName] = await Promise.all([
            topPropsToSelection(prefixes, startObj),
            topPropsToSelection(prefixes, endObj),
            linkObj
                .getName()
                .then(itemNameToPrefixedName)
                .then((name) => resolvePrefixedName(prefixes, name)),
        ]);

        if (!linkName) throw new Error("link name could not be found");

        const tmpReplaceIndex = startSelection.objectProps.findIndex((item) => item.name === linkName);
        // NOTE: Correcting the index to make slicing by index simpler
        const replaceIndex = (tmpReplaceIndex === -1)
              ? startSelection.objectProps.length
              : tmpReplaceIndex;

        /** @type {ComplexPropertySelection} */
        const finalSelection = {
            ...startSelection,
            objectProps: [
                ...startSelection.objectProps.slice(0, replaceIndex),
                {
                    name: linkName,
                    selection: endSelection,
                },
                ...startSelection.objectProps.slice(replaceIndex + 1),
            ],
        };

        setSelection(finalSelection);
    }

    async function fromElementSyncSelectionToDiagramSelection() {
        const elements = Interpreter.editor.getSelectedElements();
        const firstKey = Object.keys(elements)[0];
        const vqItem = await createVQ_Element(firstKey);
        if (!vqItem) return;

        const [prefixedClass, prefixes, fields] = await Promise.all([
            vqItem.getName().then(itemNameToPrefixedName),
            getPrefixes(),
            vqItem.getFields()
            // NOTE: adding type to .catch return value because otherwise the resulting type will be
            // a union with never[] that causes useless errors.
                  .catch(() => /** @type {Awaited<ReturnType<(typeof vqItem.getFields)>>} */ ([])),
        ]);



        /** @type {{label: string, value: string}[]} */
        const newProperties = fields.flatMap(({ exp }) => {
            const maybeValue = resolvePrefixedName(prefixes, exp);
            return maybeValue ? ({ value: maybeValue, label: exp }) : [];
        });

        const newClass = resolvePrefixedName(prefixes, prefixedClass);

        setSelection({
            rdfType: newClass || "",
            dataProps: newProperties.map(({ value }) => ({ name: value })),
            objectProps: [],
        });
    }

    useEffect(() => {
      /** @type {ModalRequestCallback} */
      const cb = (payload) => {syncSelectionToDiagramSelection(payload)};

      queryGeneratorModalRequest.subscribe(cb);
      return () => {
        queryGeneratorModalRequest.unsubcribe(cb)
      };
    }, [setSelection]);
}

export function QueryGeneratorView() {
    const [selection, setSelection] = useState(
        /** @type {ComplexPropertySelection} */ ({
            rdfType: "",
            dataProps: [],
            objectProps: [],
        })
    );
    const [idVars, setIdVars] = useState(["this"]);

    /**
     * @param {ComplexPropertySelection} selection
     * @return {string[]}
     */
    function selectionToIdVarSuggestions(selection) {
        // NOTE: A pretty rough method to do this but it does work
        const formattedQuery = formatQuery(selection);
        const matches = formattedQuery.match(/\?\w+/g);
        // NOTE: Keep unique values and remove the leading "?" in matched var name
        return [...new Set(matches)].map((match) => match.slice(1));
    }

    const suggestions = selectionToIdVarSuggestions(selection).flatMap((value) => {
        const label = demangleVarName(value, selection);
        return label ? { value, label } : [];
    });

    const globalLimit = 1000; // FIXME: hardcoded
    const pageSize = 10; // FIXME: hardcoded

    useSyncWithDiagram(setSelection);

    function onCreateClick() {
        const queryToWrap = formatQuery(selection);
        const finalQuery = formatUniversalPaginatorQuery({
            queryToWrap,
            globalLimit,
            groupLimit: pageSize,
            groupOffset: 0,
            idVars,
        });

        setEditorText(finalQuery);
        switchToEditorTab();
        Session.set("complexTableInfo", { idVars, finalQuery, selection });

        Template.GenerateComplexTableQueryForm.hideModal();
    }

    function onExecuteClick() {
        const queryToWrap = formatQuery(selection);
        const finalQuery = formatUniversalPaginatorQuery({
            queryToWrap,
            globalLimit,
            groupLimit: pageSize,
            groupOffset: 0,
            idVars,
        });

        setEditorText(finalQuery);
        Session.set("complexTableInfo", { idVars, finalQuery, selection });

        Template.GenerateComplexTableQueryForm.hideModal();

        Interpreter.customExtensionPoints.ExecuteSPARQL_from_text(finalQuery);
    }

    function H1({ style, ...props }) {
        return createElement(
            "h1",
            {
                style: {
                    fontSize: `${16 * 1.5}px`,
                    fontWeight: "bold",
                    marginTop: `${16 * 0.5}px`,
                    ...(style ?? {}),
                },
                ...props,
            },
        );
    }

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
        createElement(H1, {}, "Property Selection"),
        createElement(
            ComplexPropertySelector,
            {
                selection,
                onSelectionChange: setSelection,
                dataPropFetcher: (rdfType) => getPropertySuggestions(rdfType, "Data"),
                objectPropFetcher: (rdfType) => getPropertySuggestions(rdfType, "Object"),
                rdfTypeFetcher: () => getClasses()
                    .then((res) => (res || []).map(({ iri, prefixedName }) => ({
                        label: `${prefixedName}`,
                        value: iri,
                    }))),
            },
        ),
        createElement(H1, {}, "Limiting & Grouping"),
        createElement(
            "div",
            {
                style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: rem(0.5),
                },
            },
            createElement("p", {}, `globalLimit: ${globalLimit}`),
            createElement("p", {}, `pageSize: ${pageSize}`),
            createElement(
                "div",
                {},
                createElement("p", {}, "idVars"),
                createElement(
                    SyncPropertySelector,
                    {
                        suggestions,
                        value: idVars,
                        onValueChange: setIdVars,
                    }),
            ),
        ),
        createElement(
            "div",
            { style: { display: "flex", gap: "8px" } },
            createElement(
                Button,
                {
                    onClick: onCreateClick,
                    style: {
                        width: "fit-content",
                    },
                },
                "Create sparql",
            ),
            createElement(
                Button,
                {
                    onClick: onExecuteClick,
                    style: {
                        width: "fit-content",
                    },
                },
                "Execute sparql",
            ),
        ),
    );
}

Template.GenerateComplexTableQueryForm.onRendered(function () {
  modalElement = this.$(".modal");
  /** @type {HTMLElement} */
  const domEl = modalElement.get(0);
  const mountRoot = domEl.getElementsByClassName("modal-body").item(0);
  if (!mountRoot) {
    console.error("Could not find .modal-body to mount!");
    return;
  }

  initReactComponents(mountRoot, createElement(QueryGeneratorView));
});

function tryShowingModal() {
    if (!modalElement) return;
    modalElement.modal("show");
}

Interpreter.customMethods({
    GenerateComplexTableQueryDSS: async function() {
      queryGeneratorModalRequest.emit({ autofillStrategy: "topProps" });
      tryShowingModal();
    },
    GenerateComplexTableQueryDSSAuto: async function() {
      alert("todo: implement GenerateComplexTableQueryDSSAuto");
    },
    // NOTE: Named "normal" because the arrow looks ordinary
    GenerateComplexTableQueryLinkNormal: async function() {
        queryGeneratorModalRequest.emit({ autofillStrategy: "linkTopProps" });
        tryShowingModal();
    },
    // NOTE: Named "strong" because the arrow looks bolder than ordinary arrow
    GenerateComplexTableQueryLinkStrong: async function() {
        alert("todo implement link strong");
    },
    GenerateComplexTableQuery: async function() {
      queryGeneratorModalRequest.emit({ autofillStrategy: "fromElement" });
      tryShowingModal();
    },
})

Template.GenerateComplexTableQueryForm.hideModal = function () {
    modalElement?.modal("hide");
};
