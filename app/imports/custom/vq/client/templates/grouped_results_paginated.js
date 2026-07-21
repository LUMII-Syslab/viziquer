// @ts-check
import {
  createElement as e,
  Fragment,
  useEffect,
  useState,
} from 'react';
import {
    MultiCardinalTableServer,
    SyncPropertySelector,
} from "rdf-toolbag";
import { Projects } from '../../../../db/platform/collections.js'
import { Utilities } from '../../../../platform/client/js/utilities/utils.js'

/** @typedef
 * {NonNullable<React.ComponentProps<typeof MultiCardinalTableServer>["pagination"]>}
 * Pagination */

/**
 * @param {string} query
 */
async function executeUnlimited(query) {
  const proj = await Projects.findOneAsync({_id: Session.get("activeProject")});
  if (!proj) throw new Error("Unexpected missing project!");
  /** @type {string | undefined}  */
  const maybeEndpoint = proj.endpoint;
  if (!maybeEndpoint) throw new Error("unexpected missing endpoint in project!");
  // NOTE: endpoint could have credentials we might need to use

  /** @type {import("../../server/execute_sparql.js").ExecuteSparqlSimpleJsonParams} */
  const params = {
    query,
    url: maybeEndpoint,
  };

  const res = await Utilities.callMeteorMethodAsync("executeSparqlSimpleJson", params);

  return res;
}

/**
 * Get synchronized editor text.
 *
 * @return {string}
 */
function useEditorText() {
  const yasqe3 = Template.sparqlForm.yasqe3.get();

  /** @return {string} */
  function fetchString() {
    return yasqe3.getValue();
  }

  const [editorString, setEditorString] = useState(fetchString());

  function handleChange() {
    setEditorString(fetchString());
  }

  useEffect(() => {
    yasqe3.on("change", handleChange);

    return () => {
      yasqe3.off("change", handleChange);
    };
  });

  return editorString;
}

/**
 * @param {string} value
 */
function setEditorText(value) {
  const yasqe3 = Template.sparqlForm.yasqe3.get();
  yasqe3.setValue(value);
}

/**
 * @param {string} query
 *
 * @return {string[]}
 */
function findSparqlVars(query) {
  // NOTE: find everything that starts with "?" and remove leading "?"
  const matches = (query.match(/\?\w+/g) ?? []).map((s) => s.slice(1));

  // NOTE: deduplicate
  return [...new Set(matches)];
}

/**
 * @param {Object} props
 * @param {string[]} props.value
 * @param {(newValue: string[]) => void} props.onValueChange
 * @param {string} props.query
 **/
function IdVarsSelector({ value, onValueChange, query }) {
  return e(Fragment, {},
    e("div", { style: { marginBottom: "4px" } },
      e("p", { style: { fontSize: "16px" } }, "Key columns"),
      e(SyncPropertySelector, {
          suggestions: findSparqlVars(query).map((value) => ({ label: value, value })),
          value,
          onValueChange,
        }),
    ),
  )
}

/**
 * @template T
 * @param {Object} props
 * @param {T} props.tempValue
 * @param {T} props.value
 * @param {(newValue: T) => void} props.onValueChange
 * @param {(newValue: T) => void} props.onTempValueChange
 * @param {string} props.differenceMessage
 */
function SaveableValueBar({
  tempValue,
  onTempValueChange,
  value,
  onValueChange,
  differenceMessage,
}) {
  const valuesAreSame = (typeof tempValue === "string")
        ? tempValue === value
        : JSON.stringify(tempValue) === JSON.stringify(value);

  const red = "#fc8675";
  const regular = "#65cea7";

  const buttonStyle = {
    padding: "4px 8px",
    margin: "4px 0px",
    cursor: "pointer",
    borderRadius: "4px",
    color: "white",
  };

  const showBar = !valuesAreSame;

  return e(
    "div",
    { style: { display: "flex", alignItems: "center", gap: "8px" }},
    showBar && e(
      Fragment,
      {},
      e("button", {
        disabled: !showBar,
        style: { ...buttonStyle, background: regular },
        onClick: () => onValueChange(tempValue),
      }, "Save"),
      e("button", {
        disabled: !showBar,
        style: { ...buttonStyle, background: red },
        onClick: () => onTempValueChange(value),
      }, "Revert"),
      e("p", {}, differenceMessage),
    ),
  );
}

/**
 * Show a warning when idVars contains values not encountered in query.
 *
 * @param {Object} props
 * @param {string[]} props.idVars
 * @param {string} props.query
 */
function IdVarsWarning({ idVars, query }) {
  const vars = findSparqlVars(query);
  const unknownVars = idVars.filter((it) => !vars.includes(it));

  const shouldShow = unknownVars.length !== 0;

  return shouldShow && e("p", {}, `Selected unknown vars: ${JSON.stringify(unknownVars)}`);
}

/**
 * @param {Object} props
 * @param {string[]} props.value
 * @param {(newValue: string[]) => void} props.onValueChange
 * @param {string} props.query
 **/
function SaveableIdVarsSelector({ value, onValueChange, query }) {
  const [tempValue, setTempValue] = useState(value);

  return e(
    Fragment,
    {},
    e(IdVarsSelector, { value: tempValue, onValueChange: setTempValue, query }),
    e(/** @type {typeof SaveableValueBar<string[]>} */ (SaveableValueBar), {
      value,
      tempValue,
      onValueChange,
      onTempValueChange: setTempValue,
      differenceMessage: "Key columns are not saved!",
    }),
  );
}

/**
 * @param {Object} props
 * @param {string} props.value
 * @param {(newValue: string) => void} props.onValueChange
 */
function SaveableQuery({ value, onValueChange }) {
  const q = useEditorText();

  return e(/** @type {typeof SaveableValueBar<string>}  */(SaveableValueBar), {
    tempValue: q,
    onTempValueChange: setEditorText,
    value,
    onValueChange,
    differenceMessage: "Query is not saved!",
  });
}

export function GroupedResultsPaginated() {
  const q = useEditorText();
  const [idVars, setIdVars] = useState(["this"]);

  const [savedQuery, setSavedQuery]= useState("");

  const [pagination, setPagination] = useState(
    /** @type {Pagination} */ ({ pageIndex: 0, pageSize: 10 })
  );

  return e(
    "div",
    {},
    e(SaveableIdVarsSelector, {
      value: idVars,
      onValueChange: setIdVars,
      query: q,
    }),
    e(IdVarsWarning, { query: q, idVars }),
    e(SaveableQuery, { value: savedQuery, onValueChange: setSavedQuery }),
    e(MultiCardinalTableServer, {
      queryCallback: ({ query }) => {
        return executeUnlimited(query);
      },
      baseQuery: savedQuery,
      counterLimit: 100_000,
      rawRowLimit: 100_000,
      idVars,
      pagination,
      onPaginationChange: setPagination,
    }),
  );
}
