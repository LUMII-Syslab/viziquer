// @ts-check
import { Interpreter } from '../../../lib/interpreter.js'
import { Template } from "meteor/templating";
import { createVQ_Element } from '../js/VQ_Element.js'

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
/** @type {Set<function>} */
let eventTargets = new Set();
const queryGeneratorModalRequest = {
    subscribe: (callback) => eventTargets.add(callback),
    unsubcribe: (callback) => eventTargets.delete(callback),
    emit: () => eventTargets.forEach((callback) => callback()),
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
 *
 * @return {Promise<{label: string, value: string}[]>}
 */
async function getPropertySuggestions(selectedType, propertyType) {
    console.log({ selectedType, propertyType });

    // NOTE: There's probably a bunch of properties to suggest when no type is known but for now
    // we will return empty array.
    if (!selectedType) return [];
    const props = await getProperties(selectedType, propertyType);
    if (!props) return [];
    return props.map(({ iri, prefixedName }) => ({
        label: `${prefixedName}`,
        value: iri,
    }));
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
    async function syncSelectionToDiagramSelection() {
        const elements = Interpreter.editor.getSelectedElements();
        const firstKey = Object.keys(elements)[0];
        const vqItem = await createVQ_Element(firstKey);
        if (!vqItem) return;

        const [prefixedClass, prefixes, fields] = await Promise.all([
            vqItem.getName(),
            getPrefixes(),
            vqItem.getFields(),
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
      const cb = () => syncSelectionToDiagramSelection();

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
            Button,
            {
                onClick: onCreateClick,
                style: {
                    width: "fit-content",
                },
            },
            "Create sparql",
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

Interpreter.customMethods({
    GenerateComplexTableQuery: async function() {
      queryGeneratorModalRequest.emit();

      if (!modalElement) return;
      modalElement.modal("show");
    },
})

Template.GenerateComplexTableQueryForm.hideModal = function () {
    modalElement?.modal("hide");
};
