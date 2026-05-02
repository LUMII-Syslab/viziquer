import { Utilities } from "../../../../platform/client/js/utilities/utils.js";
import { Create_VQ_Element_Async } from "./VQ_Element.js";
import {
  parsedQueryToAST,
  ResultStatus,
  NestingType,
  LinkType,
} from "./sparqlToAST";
import { Interpreter } from "../../../../client/lib/interpreter.js";
import { Projects } from "../../../../db/platform/collections.js";
import { dataShapes } from "./DataShapes";

/**
 * @enum {string}
 */
const ParseStatus = {
  Ok: "OK",
  Error: "ERROR",
};

/** @typedef {Object} AstAttribute
 * @property {string} alias
 * @property {string} exp
 * @property {boolean} isHelper
 * @property {boolean} requireValues
 * @property {boolean} addLabel
 * @property {boolean} addAltLabel
 * @property {boolean} addDescription
 * @property {string|null} attributeCondition
 */

/** @typedef {{ exp: string, alias: string }} AstAggregation */
/** @typedef {{ exp: string }} AstCondition */
/** @typedef {{ exp: string, isDescending: boolean }} AstOrdering */
/** @typedef {{ exp: string }} AstGrouping */
/** @typedef {{ exp: string }} AstHaving */
/** @typedef {{ graph: string, graphInstruction: string }} AstNamedGraph */
/** @typedef {{ graph: string, graphInstruction: string }} AstGraphsService */
/** @typedef {{ local_name: string }} AstIdentification */
/** @typedef {{ isInverse: boolean, identification: { target_node_id: string, local_name: string } }} AstConditionLink */

/**
 * @typedef {Object} AstNode
 * @property {string} id
 * @property {AstConditionLink[]} conditionLinks
 * @property {AstIdentification} identification
 * @property {boolean} indirectClassMembership
 * @property {string[]|null} serviceLabelLang
 * @property {string|null} instanceAlias
 * @property {AstAttribute[]} fields
 * @property {AstAggregation[]} aggregations
 * @property {AstCondition[]} conditions
 * @property {boolean} [distinct]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {AstOrdering[]} [orderings]
 * @property {AstGrouping[]} [groupings]
 * @property {AstHaving} [having]
 * @property {AstNamedGraph[]} [namedGraphs]
 * @property {boolean} [isInverse]
 * @property {boolean} [isSubQuery]
 * @property {boolean} [isGlobalSubQuery]
 * @property {string} [linkType]
 * @property {boolean} [isDelayedLink]
 * @property {AstIdentification} [linkIdentification]
 * @property {AstGraphsService|null} [graphsServiceLink]
 * @property {AstNode[]} children
 */

Interpreter.customMethods({
  /**
   * @param {string} text
   * @param {number} x
   * @param {number} y
   */
  generateVisualQuery: async (text, x, y) => {
    Interpreter.destroyErrorMsg();

    const prefixedText = await prependKnownPrefixes(text);

    /** @type {{ status: ParseStatus.Ok, parsedQuery: object } | { status: ParseStatus.Error, error: string }} */
    const parseResult = await Utilities.callMeteorMethodAsync(
      "parseSPARQLText",
      prefixedText,
    );

    if (parseResult.status !== ParseStatus.Ok) {
      Interpreter.showErrorMsg(
        `Visualization error: ${parseResult.error ?? "Unknown error occurred when parsing SPARQL"}`,
        -3,
      );
      return;
    }

    const result = await parsedQueryToAST(
      parseResult.parsedQuery,
      await buildConfig(),
    );

    if (result.status === ResultStatus.Error) {
      Interpreter.showErrorMsg(`Visualization error: ${result.error}`, -3);
      return;
    }

    const { boxes, lines } = await visualize(result.ast.root, x, y);
    await runComputeLayout(boxes, lines, x, y);
  },
});

/**
 * @param {string} text
 * @returns {Promise<string>}
 */
async function prependKnownPrefixes(text) {
  const namespaces = await dataShapes.getNamespaces();
  if (!namespaces || namespaces.complete === false) {
    return text;
  }
  const prefixLines = namespaces
    .map((p) => `PREFIX ${p.name}: <${p.value}>`)
    .join("\n");
  return prefixLines + "\n" + text;
}

/**
 * @returns {Promise<{
 * directClassMembershipRole: string,
 * indirectClassMembershipRole: string|null,
 * showPrefixesForAllNames: boolean
 * }>}
 */
async function buildConfig() {
  const proj = await Projects.findOneAsync({
    _id: Session.get("activeProject"),
  });

  const directClassMembershipRole =
    proj?.directClassMembershipRole === "wdt:P31"
      ? "http://www.wikidata.org/prop/direct/P31"
      : "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

  const indirRole = proj?.indirectClassMembershipRole;
  const indirectClassMembershipRole =
    indirRole === "wdt:P31/wdt:P279*" || indirRole === "wdt:P31.wdt:P279*"
      ? "http://www.wikidata.org/prop/direct/P31/http://www.wikidata.org/prop/direct/P279*"
      : null;

  return {
    directClassMembershipRole,
    indirectClassMembershipRole,
    showPrefixesForAllNames: proj?.showPrefixesForAllNames === true,
  };
}

/**
 * @param {Object<string, VQ_Element_Async>} boxes
 * @param {VQ_Element_Async[]} lines
 * @param {number} x
 * @param {number} y
 */
async function runComputeLayout(boxes, lines, x, y) {
  const editor = Interpreter.editor;
  const element_list = editor.getElements();
  const boxElements = Object.values(boxes).map((b) => element_list[b._id()]);
  const lineElements = lines.map((l) => element_list[l._id()]);
  await new Promise((resolve) => setTimeout(resolve, 500));
  Interpreter.execute("ComputeLayout", [x, y, boxElements, lineElements]);
}

/**
 * @param {AstNode} node
 * @param {number} x
 * @param {number} y
 * @returns {Promise<{ boxes: Object<string, VQ_Element_Async>, lines: VQ_Element_Async[] }>}
 */
async function visualize(node, x, y) {
  const boxes = {};
  const lines = [];
  await visualizeSpanningTree(node, null, x, y, boxes, lines);
  await visualizeConditionLinks(node, boxes, lines);
  return { boxes, lines };
}

/**
 * @param {AstNode} node
 * @param {VQ_Element_Async|null} parent
 * @param {number} x
 * @param {number} y
 * @param {Object<string, VQ_Element_Async>} boxes
 * @param {VQ_Element_Async[]} lines
 */
async function visualizeSpanningTree(node, parent, x, y, boxes, lines) {
  /** @type {VQ_Element_Async} */
  const classBox = await Create_VQ_Element_Async({
    x,
    y,
    width: 300,
    height: 60,
  });

  await classBox.setClassStyle(parent !== null ? "condition" : "query");
  await applyNodeToBox(classBox, node);

  if (parent !== null) {
    const linkLine = await createLink(node, classBox, parent, x, y);
    lines.push(linkLine);
  }

  let childY = y;
  for (const child of node.children) {
    childY += 100;
    await visualizeSpanningTree(child, classBox, x, childY, boxes, lines);
  }

  boxes[node.id] = classBox;
}

/**
 * @param {VQ_Element_Async} box
 * @param {AstNode} node
 */
async function applyNodeToBox(box, node) {
  for (const field of node.fields) {
    await box.addField(
      field.exp,
      field.alias,
      field.requireValues,
      false,
      field.isHelper,
      field.addLabel,
      field.addAltLabel,
      field.addDescription,
      null,
      null,
      field.attributeCondition ?? "",
      field.attributeCondition !== null,
    );
  }
  await box.setNameAndIndirectClassMembership(
    node.identification.local_name,
    node.indirectClassMembership,
  );
  await box.setInstanceAlias(node.instanceAlias);
  if (node.distinct) {
    await box.setDistinct(node.distinct);
  }
  if (node.limit !== undefined) {
    box.setLimit(node.limit);
  }
  if (node.offset !== undefined) {
    box.setOffset(node.offset);
  }
  for (const aggregation of node.aggregations) {
    box.addAggregateField(aggregation.exp, aggregation.alias, false, false);
  }
  for (const order of node.orderings ?? []) {
    box.addOrdering(order.exp, order.isDescending);
  }
  for (const condition of node.conditions) {
    box.addCondition(condition.exp, false);
  }
  for (const grouping of node.groupings ?? []) {
    box.addGrouping(grouping.exp);
  }
  if (node.having) {
    box.setHaving(node.having.exp);
  }
  if (node.serviceLabelLang) {
    await box.setLabelServiceLanguages(node.serviceLabelLang);
  }
  for (const ng of node.namedGraphs ?? []) {
    await box.addNamedGraph(ng.graph, ng.graphInstruction);
  }
}

/**
 * @param {AstNode} node
 * @param {VQ_Element_Async} classBox
 * @param {VQ_Element_Async} parent
 * @param {number} x
 * @param {number} y
 * @returns {Promise<VQ_Element_Async>}
 */
async function createLink(node, classBox, parent, x, y) {
  const oldPosition = await parent.getCoordinates();
  const coordX = x + 10;
  const coordY = oldPosition.y + oldPosition.height;
  const [coords, from, to] = node.isInverse
    ? [[coordX, y, coordX, coordY], classBox, parent]
    : [[coordX, coordY, coordX, y], parent, classBox];
  const linkLine = await Create_VQ_Element_Async(coords, true, from, to);
  await linkLine.setName(node.linkIdentification.local_name);
  await linkLine.setLinkType(node.linkType);
  await linkLine.setIsDelayedLink(node.isDelayedLink);
  await linkLine.setNestingType(nestingTypeOf(node));
  if (node.graphsServiceLink) {
    await linkLine.addGraphsServices(
      node.graphsServiceLink.graph,
      node.graphsServiceLink.graphInstruction,
      "",
    );
  }
  return linkLine;
}

/**
 * @param {AstNode} node
 * @returns {NestingType}
 */
function nestingTypeOf(node) {
  if (node.isGlobalSubQuery) return NestingType.GlobalSubquery;
  if (node.isSubQuery) return NestingType.Subquery;
  return NestingType.Plain;
}

/**
 * @param {AstNode} node
 * @param {Object<string, VQ_Element_Async>} boxes
 * @param {VQ_Element_Async[]} lines
 */
async function visualizeConditionLinks(node, boxes, lines) {
  const classBox = boxes[node.id];

  for (const ref of node.conditionLinks) {
    const toBox = boxes[ref.identification.target_node_id];
    const sCoordinates = await classBox.getCoordinates();
    const tCoordinates = await toBox.getCoordinates();
    const coordX = tCoordinates.x + tCoordinates.width - 20;
    const sourceAboveTarget = sCoordinates.y < tCoordinates.y;
    const coordY1 = sourceAboveTarget
      ? sCoordinates.y + sCoordinates.height
      : tCoordinates.y + tCoordinates.height;
    const coordY2 = sourceAboveTarget ? tCoordinates.y : sCoordinates.y;
    const [from, to] = ref.isInverse ? [classBox, toBox] : [toBox, classBox];
    const linkLine = await Create_VQ_Element_Async(
      [coordX, coordY2, coordX, coordY1],
      true,
      from,
      to,
    );
    await linkLine.setName(ref.identification.local_name);
    await linkLine.setLinkType(LinkType.Required);
    await linkLine.setNestingType(NestingType.Condition);
    lines.push(linkLine);
  }

  for (const child of node.children) {
    await visualizeConditionLinks(child, boxes, lines);
  }
}
