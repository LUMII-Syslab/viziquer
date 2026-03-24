// @ts-check
import { Interpreter } from '../../../lib/interpreter.js'
import { Template } from "meteor/templating";
import { createVQ_Element } from '../js/VQ_Element.js'

import './generate_complex_table_query_form.html'
import { Button, getClasses, getPrefixes, getProperties, initReactComponents, rem, resolvePrefixedName } from '../js/complexTable.js';
import { createElement, useEffect, useState } from 'react';
import { formatMultiCardinalTableAsSelectQuery, PropertySelector } from 'rdf-toolbag';

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
 */
function usePropertiesQuery(selectedType, propertyType) {
    const propertiesState = useState(
        /** @type {{value: string, label: string}[]} */ ([])
    );
    const [_, setProperties] = propertiesState;
    useEffect(() => {
        (async () => {
            if (!selectedType) {
                setProperties([]);
                return;
            }
            const props = await getProperties(selectedType, propertyType);
            if (!props) setProperties([]);
            else setProperties(props.map(({ iri, prefixedName }) => ({
                label: `${prefixedName}`,
                value: iri,
            })));
        })();
    }, [selectedType]);

    return propertiesState;
}

/**
 * Call `setClass` with selected element's type.
 *
 * @param {(newValue: string | null) => void} setClass
 */
function useSyncClass(setClass) {
    async function syncSelectionToDiagramSelection() {
        const elements = Interpreter.editor.getSelectedElements();
        const firstKey = Object.keys(elements)[0];
        const vqItem = await createVQ_Element(firstKey);
        if (!vqItem) return;

        const [prefixedClass, prefixes] = await Promise.all([
            vqItem.getName(),
            getPrefixes(),
        ]);

        const newClass = resolvePrefixedName(prefixes, prefixedClass);

        setClass(newClass);
    }

    useEffect(() => {
      const cb = () => syncSelectionToDiagramSelection();

      queryGeneratorModalRequest.subscribe(cb);
      return () => {
        queryGeneratorModalRequest.unsubcribe(cb)
      };
    }, [setClass]);
}

export function QueryGeneratorView() {
    const [selectedType, setSelectedType] = useState(
        /** @type {string?} */ (null)
    );
    const [typeSuggestions, setTypeSuggestions] = useState(
        /** @type {Awaited<ReturnType<getClasses>>} */ (null)
    );
    const [dataProperties, setDataProperties] = useState(
        /** @type {string[]} */ ([])
    );
    const [objectProperties, setObjectProperties] = useState(
        /** @type {string[]} */ ([])
    );
    const [suggestionsData] = usePropertiesQuery(selectedType, "Data");

    const [suggestionsClass] = usePropertiesQuery(selectedType, "Object");

    useSyncClass(setSelectedType);

    // NOTE: Init class suggestions
    useEffect(() => {
        (async () => {
            const res = await getClasses();
            setTypeSuggestions(res);
        })();
    }, []);

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
            createElement("p", {}, "Properties (data)"),
            createElement(
                PropertySelector,
                {
                    value: dataProperties,
                    // @ts-ignore
                    onValueChange: setDataProperties,
                    suggestions: suggestionsData,
                }
            ),
        ),
        createElement(
            "div",
            {},
            createElement("p", {}, "Properties (class)"),
            createElement(
                PropertySelector,
                {
                    value: objectProperties,
                    // @ts-ignore
                    onValueChange: setObjectProperties,
                    suggestions: suggestionsClass,
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
                        [...dataProperties, ...objectProperties],
                        limit
                    );
                    setEditorText(q);
                    switchToEditorTab();
                    Template.GenerateComplexTableQueryForm.hideModal();
                },
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
