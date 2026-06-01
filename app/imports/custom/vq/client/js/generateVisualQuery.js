import { Utilities } from "../../../../platform/client/js/utilities/utils.js";
import { Create_VQ_Element_Async } from "./VQ_Element.js";
import { Interpreter } from "../../../../client/lib/interpreter.js";
import { Projects } from "../../../../db/platform/collections.js";
import { dataShapes } from "./DataShapes";

const RDF_TYPE_IRI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const WIKIDATA_DIRECT_IRI = "http://www.wikidata.org/prop/direct/P31";
const WIKIDATA_INDIRECT_IRI = `${WIKIDATA_DIRECT_IRI}/http://www.wikidata.org/prop/direct/P279*`;
const WIKIBASE_LABEL_SERVICE_IRI = "http://wikiba.se/ontology#label";
const BD_SERVICE_PARAM_IRI = "http://www.bigdata.com/rdf#serviceParam";
const SELECT_THIS_EXPRESSION = "(select this)";
const VALUES_UNDEF = "UNDEF";
const XSD_NS = "http://www.w3.org/2001/XMLSchema#";
const STRING_LITERAL = `${XSD_NS}string`;
const INTEGER_LITERAL = `${XSD_NS}integer`;
const XSD_NO_ANNOTATION = new Set(["integer", "decimal"]);
const INFIX_OPERATORS = new Set([
  "+",
  "-",
  "*",
  "/",
  "=",
  "!=",
  "<",
  ">",
  "<=",
  ">=",
  "&&",
  "||",
]);

/**
 * @enum {string}
 */
const ExpressionType = {
  Operation: "operation",
  Aggregate: "aggregate",
  FunctionCall: "functionCall",
};

/**
 * @enum {string}
 */
const MembershipRoleSetting = {
  WikidataDirect: "wdt:P31",
  WikidataIndirect: "wdt:P31/wdt:P279*",
  WikidataIndirectAlt: "wdt:P31.wdt:P279*",
};

/**
 * @enum {string}
 */
const Operator = {
  Exists: "exists",
  NotExists: "notexists",
  In: "in",
  NotIn: "notin",
  Regex: "regex",
  UnaryMinus: "UMINUS",
  UnaryPlus: "UPLUS",
};

const UNARY_OPERATORS = new Map([
  [Operator.UnaryMinus, "-"],
  [Operator.UnaryPlus, "+"],
]);

/**
 * @enum {string}
 */
const NodeTypes = {
  BlankNode: "BlankNode",
  Variable: "Variable",
  NamedNode: "NamedNode",
  Literal: "Literal",
};

/**
 * @enum {string}
 */
const WhereType = {
  BGP: "bgp",
  Group: "group",
  Optional: "optional",
  Bind: "bind",
  Filter: "filter",
  Values: "values",
  Query: "query",
  Minus: "minus",
  Union: "union",
  Graph: "graph",
  Service: "service",
};

/**
 * @enum {string}
 */
const NestingType = {
  Plain: "PLAIN",
  Subquery: "SUBQUERY",
  GlobalSubquery: "GLOBAL_SUBQUERY",
  Condition: "CONDITION",
};

/**
 * @enum {string}
 */
const LinkType = {
  Required: "REQUIRED",
  Optional: "OPTIONAL",
  Not: "NOT",
  FilterExists: "FILTER_EXISTS",
};

/**
 * @enum {string}
 */
const GraphInstruction = {
  From: "FROM",
  FromNamed: "FROM NAMED",
  Graph: "GRAPH",
  Service: "SERVICE",
  ServiceSilent: "SERVICE SILENT",
};

/**
 * @enum {string}
 */
const ResultStatus = {
  Ok: "OK",
  Error: "ERROR",
};

// === sparqljs types ===

/** @typedef {{termType: "Variable", value: string}} VariableTerm */
/** @typedef {{termType: "NamedNode", value: string}} IriTerm */
/** @typedef {{termType: "BlankNode", value: string}} BlankTerm */
/** @typedef {{termType: "Literal", value: string, language: string, datatype: IriTerm}} LiteralTerm */
/** @typedef {VariableTerm | IriTerm | LiteralTerm | BlankTerm} Term */

/**
 * @typedef {Object} VariableExpression
 * @property {Expression} expression
 * @property {VariableTerm} variable
 */

/** @typedef {VariableTerm | VariableExpression} Variable */

/**
 * @typedef {Object} Triple
 * @property {IriTerm | BlankTerm | VariableTerm} subject
 * @property {IriTerm | VariableTerm | PropertyPath} predicate
 * @property {Term} object
 */

/**
 * @typedef {Object} PropertyPath
 * @property {"path"} type
 * @property {"|" | "/" | "^" | "+" | "*" | "?" | "!"} pathType
 * @property {Array<IriTerm | PropertyPath>} items
 */

/**
 * @typedef {Object} OperationExpression
 * @property {"operation"} type
 * @property {string} operator
 * @property {Array<Expression | WherePattern>} args
 * @property {boolean} [distinct]
 */

/**
 * @typedef {Object} FunctionCallExpression
 * @property {"functionCall"} type
 * @property {IriTerm} function
 * @property {Expression[]} args
 * @property {boolean} [distinct]
 */

/**
 * @typedef {Object} AggregateExpression
 * @property {"aggregate"} type
 * @property {string} aggregation
 * @property {Expression} expression
 * @property {boolean} [distinct]
 * @property {string} [separator]
 */

/** @typedef {OperationExpression | FunctionCallExpression | AggregateExpression | IriTerm | VariableTerm | LiteralTerm} Expression */

/**
 * @typedef {Object} Ordering
 * @property {Expression} expression
 * @property {boolean} [descending]
 */

/**
 * @typedef {Object} Grouping
 * @property {Expression} expression
 * @property {VariableTerm} [variable]
 */

/** @typedef {Object.<string, IriTerm | BlankTerm | LiteralTerm | undefined>} ValuePatternRow */

/**
 * @typedef {Object} BgpPattern
 * @property {"bgp"} type
 * @property {Triple[]} triples
 */

/**
 * @typedef {Object} OptionalPattern
 * @property {"optional"} type
 * @property {WherePattern[]} patterns
 */

/**
 * @typedef {Object} UnionPattern
 * @property {"union"} type
 * @property {WherePattern[]} patterns
 */

/**
 * @typedef {Object} GroupPattern
 * @property {"group"} type
 * @property {WherePattern[]} patterns
 */

/**
 * @typedef {Object} GraphPattern
 * @property {"graph"} type
 * @property {IriTerm | VariableTerm} name
 * @property {WherePattern[]} patterns
 */

/**
 * @typedef {Object} MinusPattern
 * @property {"minus"} type
 * @property {WherePattern[]} patterns
 */

/**
 * @typedef {Object} ServicePattern
 * @property {"service"} type
 * @property {IriTerm | VariableTerm} name
 * @property {boolean} silent
 * @property {WherePattern[]} patterns
 */

/**
 * @typedef {Object} FilterPattern
 * @property {"filter"} type
 * @property {Expression} expression
 */

/**
 * @typedef {Object} BindPattern
 * @property {"bind"} type
 * @property {Expression} expression
 * @property {VariableTerm} variable
 */

/**
 * @typedef {Object} ValuesPattern
 * @property {"values"} type
 * @property {ValuePatternRow[]} values
 */

/** @typedef {BgpPattern | OptionalPattern | UnionPattern | GroupPattern | GraphPattern | MinusPattern | ServicePattern | FilterPattern | BindPattern | ValuesPattern | ParsedQuery} WherePattern */

/**
 * @typedef {Object} ParsedQuery
 * @property {"query"} [type]
 * @property {"SELECT"} [queryType]
 * @property {Variable[]} [variables]
 * @property {boolean} [distinct]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {WherePattern[]} [where]
 * @property {{default: IriTerm[], named: IriTerm[]}} [from]
 * @property {Ordering[]} [order]
 * @property {Grouping[]} [group]
 * @property {Expression[]} [having]
 * @property {ValuePatternRow[]} [values]
 * @property {Object.<string, string>} [prefixes]
 */

// === internal types ===

/**
 * @typedef {Object} GraphsService
 * @property {string} graph
 * @property {GraphInstruction} graphInstruction
 */

/**
 * @typedef {Object} ConfigOptions
 * @property {string} [directClassMembershipRole]
 * @property {string} [indirectClassMembershipRole]
 * @property {boolean} [showPrefixesForAllNames]
 */

class BlockContext {
  constructor() {
    /** @type {string} */
    this.id = crypto.randomUUID();
  }
}

class Graph {
  /**
   * @param {BlockContext} ctx
   */
  constructor(ctx) {
    /** @type {BlockContext} */
    this.ctx = ctx;
    /** @type {Map<string, Node>} */
    this.nodes = new Map();
    /** @type {Edge[]} */
    this.pendingReferences = [];
  }

  get size() {
    return this.nodes.size;
  }

  /**
   * @param {Node} node
   * @returns {Graph}
   */
  add(node) {
    this.nodes.set(node.id, node);
    return this;
  }

  /**
   * @param {string} id
   * @returns {Node|undefined}
   */
  get(id) {
    return this.nodes.get(id);
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this.nodes.has(id);
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    return this.nodes.delete(id);
  }

  /**
   * @returns {IterableIterator<Node>}
   */
  values() {
    return this.nodes.values();
  }

  /**
   * @returns {Node|null}
   */
  getRoot() {
    for (const node of this.nodes.values()) {
      if (node.isRoot) return node;
    }
    return null;
  }

  /**
   * @returns {Node}
   */
  getRootOrFail() {
    const root = this.getRoot();
    if (!root) {
      throw new Error("No root node found");
    }
    return root;
  }

  applyRoot() {
    if (this.nodes.size > 0) {
      this.nodes.values().next().value.isRoot = true;
    }
  }

  /**
   * @returns {Node}
   */
  createUnitNode() {
    const node = new Node(NodeTypes.NamedNode, null, this.ctx);
    node.class = "[ ]";
    node.resolved = true;
    node.isRoot = true;
    this.add(node);
    return node;
  }

  /**
   * @param {string} id
   */
  removeNode(id) {
    const node = this.nodes.get(id);
    for (const edge of node.incoming) {
      edge.from.outgoing = edge.from.outgoing.filter((e) => e.id !== edge.id);
    }
    for (const edge of node.outgoing) {
      edge.to.incoming = edge.to.incoming.filter((e) => e.id !== edge.id);
    }
    for (const edge of node.referencedBy) {
      edge.from.ownedReferences = edge.from.ownedReferences.filter(
        (e) => e.id !== edge.id,
      );
    }
    this.nodes.delete(id);
  }

  /**
   * @param {Edge} edge
   */
  addPendingReference(edge) {
    this.pendingReferences.push(edge);
  }

  applyReferenceOwnership() {
    const root = this.getRoot();
    if (!root || this.pendingReferences.length === 0) return;

    const depth = new Map([[root.id, 0]]);
    const stack = [root];
    while (stack.length > 0) {
      const node = stack.pop();
      const d = depth.get(node.id);
      for (const e of [...node.outgoing, ...node.incoming]) {
        const neighbor = e.to === node ? e.from : e.to;
        if (!depth.has(neighbor.id)) {
          depth.set(neighbor.id, d + 1);
          stack.push(neighbor);
        }
      }
    }

    for (const ref of this.pendingReferences) {
      const fromDepth = depth.get(ref.from.id) ?? 0;
      const toDepth = depth.get(ref.to.id) ?? 0;
      if (fromDepth >= toDepth) {
        ref.from.ownedReferences.push(ref);
        ref.to.referencedBy.push(ref);
      } else {
        ref.to.ownedReferences.push(ref);
        ref.from.referencedBy.push(ref);
      }
    }
  }

  /**
   * @param {string[]} variables
   * @param {BlockContext|null} [ctx]
   * @returns {Node|null}
   */
  findNodeForVariable(variables, ctx = null) {
    const ctxId = ctx?.id ?? null;
    const inCtx = (node) => ctxId === null || node.blockContext.id === ctxId;

    // prefer the root node if it matches any variable
    for (const variable of variables) {
      for (const node of this.nodes.values()) {
        if (
          inCtx(node) &&
          node.isRoot &&
          (node.instance === variable ||
            node.attributes.some((attr) => attr.alias === variable))
        ) {
          return node;
        }
      }
    }

    // fall back to the node matching the first variable
    const first = variables[0];
    for (const node of this.nodes.values()) {
      if (inCtx(node) && node.attributes.some((attr) => attr.alias === first))
        return node;
    }
    for (const node of this.nodes.values()) {
      if (inCtx(node) && node.instance === first) return node;
    }

    // search for predicate variables: ?a ?b ?c leaves attr {predicateVariable:'b'} on ?a
    for (const variable of variables) {
      for (const node of this.nodes.values()) {
        if (
          inCtx(node) &&
          node.attributes.some((attr) => attr.predicateVariable === variable)
        ) {
          return node;
        }
      }
    }

    // Fallback: search outgoing edges directly when applyAttributes was skipped (inner blocks)
    for (const variable of variables) {
      for (const node of this.nodes.values()) {
        if (
          inCtx(node) &&
          node.outgoing.some(
            (e) => e.type === NodeTypes.Variable && e.name === variable,
          )
        ) {
          return node;
        }
      }
    }

    return null;
  }

  /**
   * @param {string[]} variables
   * @returns {Node|null}
   */
  findNodeForVariableInContext(variables) {
    return this.findNodeForVariable(variables, this.ctx);
  }

  /**
   * @param {string[]} variables
   * @param {Graph[]} graphSegments
   * @returns {Node|null}
   */
  findOrCreateNodeForVariable(variables, graphSegments) {
    let targetNode = this.findNodeForVariableInContext(variables);
    if (targetNode) return targetNode;

    let previousSegmentTargetNode = null;
    for (const s of graphSegments) {
      previousSegmentTargetNode = s.findNodeForVariableInContext(variables);
      if (previousSegmentTargetNode) break;
    }
    if (previousSegmentTargetNode) {
      for (const node of this.nodes.values()) {
        if (
          node.blockContext.id === this.ctx.id &&
          node.instance === previousSegmentTargetNode.instance
        ) {
          return node;
        }
      }

      const n = new Node(
        previousSegmentTargetNode.type,
        previousSegmentTargetNode.instance,
        this.ctx,
      );
      const root = this.getRoot();
      targetNode = n;
      this.add(n);

      if (root) {
        Edge.additional(n, root).wire();
      } else {
        n.isRoot = true;
      }
    }

    return targetNode;
  }

  /**
   * @param {string[]} variables
   * @param {Graph[]} [graphSegments]
   * @returns {Node}
   */
  findOrCreateNode(variables, graphSegments = []) {
    return (
      this.findOrCreateNodeForVariable(variables, graphSegments) ??
      this.getRoot() ??
      this.createUnitNode()
    );
  }

  /**
   * @param {Graph} innerGraph
   * @param {NestingType} nestingType
   * @param {LinkType} linkType
   * @param {GraphsService|null} [graphsService]
   */
  connect(innerGraph, nestingType, linkType, graphsService = null) {
    const innerRoot = innerGraph.getRoot();

    for (const node of innerGraph.values()) {
      node.isRoot = false;
    }

    const makeEdge = (name, from, to) => {
      const e = new Edge(name, null, from, to);
      e.nestingType = nestingType;
      e.linkType = linkType;
      e.wire();
      return e;
    };

    let primaryStructuralEdge = null;

    if (this.size === 0) {
      const outerRoot = this.createUnitNode();
      if (innerRoot) {
        primaryStructuralEdge = makeEdge("++", outerRoot, innerRoot);
      }

      for (const node of innerGraph.values()) {
        this.add(node);
      }
      if (primaryStructuralEdge && graphsService) {
        primaryStructuralEdge.graphsService = graphsService;
      }
      return;
    }

    // Collect ALL shared variable pairs between outer and inner block.
    const sharedPairs = [];
    for (const outer of this.values()) {
      if (outer.type !== NodeTypes.Variable) continue;
      if (outer.blockContext.id !== this.ctx.id) continue;
      for (const inner of innerGraph.values()) {
        if (inner.type !== NodeTypes.Variable) continue;
        if (inner.blockContext.id !== innerGraph.ctx.id) continue;
        if (outer.instance === inner.instance) {
          sharedPairs.push({ outer, inner });
        }
      }
    }

    if (sharedPairs.length > 0) {
      for (const { outer, inner } of sharedPairs) {
        if (!innerGraph.has(inner.id)) continue;

        const hasAbsorbableChildren = inner.outgoing.some(
          isAbsorbableAttribute,
        );
        const hasNonTrivialAttributes =
          inner.attributes.length > (inner.selected ? 1 : 0);
        const canMerge =
          !hasAbsorbableChildren &&
          innerGraph.size > 1 &&
          inner.conditions.length === 0 &&
          !hasNonTrivialAttributes;

        if (primaryStructuralEdge) {
          const refEdge = Edge.sameInstance(outer, inner);
          inner.ownedReferences.push(refEdge);
          outer.referencedBy.push(refEdge);
        } else if (canMerge) {
          let connectingEdge = null,
            isInverse = false;
          if (inner.outgoing.length > 0) {
            connectingEdge = inner.outgoing[0];
            isInverse = false;
          } else if (inner.incoming.length > 0) {
            connectingEdge = inner.incoming[0];
            isInverse = true;
          }

          const hasNestingConflict =
            connectingEdge &&
            connectingEdge.nestingType !== NestingType.Plain &&
            nestingType !== NestingType.Plain;
          const hasLinkConflict =
            connectingEdge &&
            connectingEdge.linkType !== LinkType.Required &&
            linkType !== LinkType.Required;

          if (connectingEdge && !hasNestingConflict && !hasLinkConflict) {
            if (nestingType !== NestingType.Plain) {
              connectingEdge.nestingType = nestingType;
            }
            if (linkType !== LinkType.Required) {
              connectingEdge.linkType = linkType;
            }
            if (!isInverse) {
              connectingEdge.from = outer;
              outer.outgoing.push(connectingEdge);
              for (const edge of inner.outgoing) {
                if (edge.id === connectingEdge.id) continue;
                edge.from = outer;
                outer.outgoing.push(edge);
              }
              for (const edge of inner.incoming) {
                edge.to = outer;
                outer.incoming.push(edge);
              }
            } else {
              connectingEdge.to = outer;
              outer.incoming.push(connectingEdge);
              for (const edge of inner.incoming) {
                if (edge.id === connectingEdge.id) continue;
                edge.to = outer;
                outer.incoming.push(edge);
              }
              for (const edge of inner.outgoing) {
                edge.from = outer;
                outer.outgoing.push(edge);
              }
            }
            outer.aggregations.push(...inner.aggregations);
            outer.conditions.push(...inner.conditions);
            for (const refEdge of inner.referencedBy) {
              refEdge.from.ownedReferences =
                refEdge.from.ownedReferences.filter((e) => e.id !== refEdge.id);
            }
            for (const refEdge of inner.ownedReferences) {
              refEdge.to.referencedBy = refEdge.to.referencedBy.filter(
                (e) => e.id !== refEdge.id,
              );
            }
            innerGraph.delete(inner.id);
            primaryStructuralEdge = connectingEdge;
          } else {
            primaryStructuralEdge = makeEdge("==", outer, inner);
          }
        } else {
          primaryStructuralEdge = makeEdge("==", outer, inner);
        }
      }
    } else {
      const outerRoot = this.getRootOrFail();
      if (innerRoot) {
        primaryStructuralEdge = makeEdge("++", innerRoot, outerRoot);
      }
    }

    for (const node of innerGraph.values()) {
      this.add(node);
    }

    if (primaryStructuralEdge && graphsService) {
      primaryStructuralEdge.graphsService = graphsService;
    }
  }

  /**
   * @param {Node|null} chainTip
   * @param {Graph} segmentGraph
   * @returns {Node|null}
   */
  appendSegment(chainTip, segmentGraph) {
    for (const n of segmentGraph.values()) {
      this.add(n);
    }
    if (!chainTip) return null;

    let anchor = null;
    const segmentRoot = segmentGraph.getRoot();
    if (!segmentRoot?.isUnit()) {
      for (const n of segmentGraph.values()) {
        if (
          n.instance === chainTip.instance &&
          n.blockContext === segmentGraph.ctx
        ) {
          anchor = n;
          const e = Edge.sameInstance(chainTip, anchor).wire();
          e.isDelayed = true;
          break;
        }
      }
    }
    if (anchor === null && segmentRoot) {
      const e = Edge.additional(chainTip, segmentRoot).wire();
      e.isDelayed = true;
      anchor = segmentRoot;
    }

    for (const n of segmentGraph.values()) {
      n.isRoot = false;
    }

    return anchor;
  }

  /**
   * Connects all non-connected components to the component
   * that contains the root.
   */
  connectComponents() {
    if (this.size === 0) return;

    const rootNode = this.getRootOrFail();
    const unionFind = new UnionFind();

    for (const node of this.values()) {
      unionFind.ensure(node.id);
      for (const edge of node.outgoing) {
        unionFind.ensure(edge.to.id);
        unionFind.union(node.id, edge.to.id);
      }
    }

    for (const node of this.values()) {
      if (!unionFind.connected(node.id, rootNode.id)) {
        Edge.additional(node, rootNode).wire();
        unionFind.union(node.id, rootNode.id);
      }
    }
  }

  /**
   * @param {Set<string>} selectedVariables
   */
  async resolveNames(selectedVariables) {
    for (const node of this.values()) {
      await node.resolveInstance();
      for (const edge of node.outgoing) {
        await edge.resolveName(selectedVariables);
      }
      for (const edge of node.ownedReferences) {
        await edge.resolveName(selectedVariables);
      }
    }
  }

  cleanupBlankNodes() {
    for (const node of this.values()) {
      if (node.type === NodeTypes.BlankNode) {
        node.instance = null;
      }
    }
  }
}

class Edge {
  /**
   * @param {string|null} name
   * @param {string|null} type
   * @param {Node} from
   * @param {Node} to
   */
  constructor(name, type, from, to) {
    /** @type {string} */
    this.id = crypto.randomUUID();
    /** @type {string|null} */
    this.name = name;
    /** @type {string|null} */
    this.type = type;
    /** @type {Node} */
    this.from = from;
    /** @type {Node} */
    this.to = to;
    /** @type {string} */
    this.nestingType = NestingType.Plain;
    /** @type {string} */
    this.linkType = LinkType.Required;
    /** @type {boolean} */
    this.isDelayed = false;
    /** @type {boolean} */
    this.resolved = false;
    /** @type {GraphsService|null} */
    this.graphsService = null;
  }

  /**
   * @param {Set<string>} selectedVariables
   */
  async resolveName(selectedVariables) {
    if (this.resolved) return;
    if (this.type === NodeTypes.NamedNode) {
      this.name = await resolveProperty(this.name);
    } else if (this.type === NodeTypes.Variable) {
      this.name = predicateExpression(this.name, selectedVariables);
    }
    this.resolved = true;
  }

  /**
   * @param {Node} from
   * @param {Node} to
   * @returns {Edge}
   */
  static sameInstance(from, to) {
    return new Edge("==", null, from, to);
  }

  /**
   * @param {Node} from
   * @param {Node} to
   * @returns {Edge}
   */
  static additional(from, to) {
    return new Edge("++", null, from, to);
  }

  /**
   * @returns {Edge}
   */
  wire() {
    this.from.outgoing.push(this);
    this.to.incoming.push(this);
    return this;
  }

  /**
   * @returns {boolean}
   */
  isInverseReference() {
    return this.from.ownedReferences.includes(this);
  }

  /**
   * @returns {Node}
   */
  referencedNode() {
    return this.isInverseReference() ? this.to : this.from;
  }
}

class PathEdge extends Edge {
  /**
   * @param {PropertyPath} path
   * @param {Node} from
   * @param {Node} to
   */
  constructor(path, from, to) {
    super(null, null, from, to);
    /** @type {PropertyPath} */
    this.path = path;
  }

  async resolveName(selectedVariables) {
    if (!this.resolved) {
      this.name = await resolvePathExpression(this.path);
      this.resolved = true;
    }
  }
}

class Config {
  /** @param {ConfigOptions} options */
  constructor(options = {}) {
    /** @type {string} */
    this.directClassMembershipRole =
      options.directClassMembershipRole ?? RDF_TYPE_IRI;
    /** @type {string|null} */
    this.indirectClassMembershipRole =
      options.indirectClassMembershipRole ?? null;
    /** @type {boolean} */
    this.showPrefixesForAllNames = options.showPrefixesForAllNames ?? false;
  }
}
let config = new Config();

class Node {
  /**
   * @param {string} type
   * @param {string|null} value
   * @param {BlockContext} blockContext
   */
  constructor(type, value, blockContext) {
    /** @type {string} */
    this.id = crypto.randomUUID();
    /** @type {string} */
    this.type = type;
    /** @type {string|null} */
    this.class = null;
    /** @type {string|null} */
    this.instance = value;
    /** @type {boolean} */
    this.indirectClassMembership = false;
    /** @type {string|null} */
    this.serviceLabelLang = null;
    /** @type {{expression: string, alias: string}[]} */
    this.aggregations = [];
    /** @type {Attribute[]} */
    this.attributes = [];
    /** @type {Edge[]} */
    this.incoming = [];
    /** @type {Edge[]} */
    this.ownedReferences = [];
    /** @type {Edge[]} */
    this.referencedBy = [];
    /** @type {Edge[]} */
    this.outgoing = [];
    /** @type {boolean} */
    this.isRoot = false;
    /** @type {boolean} */
    this.isRequired = true;
    /** @type {boolean} */
    this.resolved = false;
    /** @type {boolean} */
    this.selected = false;
    /** @type {string[]} */
    this.conditions = [];
    /** @type {string[]} */
    this.groupings = [];
    /** @type {string|null} */
    this.having = null;
    /** @type {{expression: string, descending: boolean}[]} */
    this.orders = [];
    /** @type {boolean} */
    this.distinct = false;
    /** @type {?number} */
    this.limit = null;
    /** @type {?number} */
    this.offset = null;
    /** @type {GraphsService[]} */
    this.namedGraphs = [];
    /** @type {BlockContext} */
    this.blockContext = blockContext;
  }

  isUnit() {
    return this.class === "[ ]";
  }

  async resolveInstance() {
    if (this.type === NodeTypes.NamedNode && !this.resolved) {
      this.instance = await resolveIndividual(this.instance);
      this.resolved = true;
    }
  }
}

class UnionFind {
  constructor() {
    /**
     * @type {Map<string, number>}
     */
    this.sets = new Map();
  }

  /**
   * @param {string} id
   */
  ensure(id) {
    if (!this.sets.has(id)) {
      this.sets.set(id, this.sets.size);
    }
  }

  /**
   * @param {string} id
   * @returns {number | undefined}
   */
  find(id) {
    return this.sets.get(id);
  }

  /**
   * @param {string} x
   * @param {string} y
   */
  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === undefined || rootY === undefined || rootX === rootY) return;
    for (const [key, value] of this.sets.entries()) {
      if (value === rootY) {
        this.sets.set(key, rootX);
      }
    }
  }

  /**
   * @param {string} x
   * @param {string} y
   * @returns {boolean}
   */
  connected(x, y) {
    return this.find(x) === this.find(y);
  }
}

class Attribute {
  /**
   * @param {string|null} value
   * @param {string} [alias]
   * @param {boolean} [isHelper]
   * @param {boolean} [isRequired]
   */
  constructor(value, alias = "", isHelper = false, isRequired = false) {
    /** @type {string|null} */
    this.value = value;
    /** @type {string} */
    this.alias = alias;
    /** @type {boolean} */
    this.isHelper = isHelper;
    /** @type {boolean} */
    this.isRequired = isRequired;
    /** @type {string|null} */
    this.predicateVariable = null;
    /** @type {boolean} */
    this.addLabel = false;
    /** @type {boolean} */
    this.addAltLabel = false;
    /** @type {boolean} */
    this.addDescription = false;
    /** @type {string|null} */
    this.attributeCondition = null;
  }
}

class AST {
  /**
   * @param {Graph} graph
   */
  constructor(graph) {
    /** @type {Graph} */
    this.graph = graph;
  }

  build() {
    const root = this.graph.getRootOrFail();
    const visited = new Set([root.id]);
    return {
      root: {
        namedGraphs: root.namedGraphs,
        ...this.serializeNode(root),
        children: this.serializeChildren(root, visited),
      },
    };
  }

  /**
   * @param {Node} node
   * @returns {object}
   */
  serializeNode(node) {
    return {
      id: node.id,
      conditionLinks: node.ownedReferences.map((ref) => ({
        isInverse: ref.isInverseReference(),
        identification: {
          target_node_id: ref.referencedNode().id,
          local_name: ref.name,
        },
      })),
      identification: { local_name: node.class },
      indirectClassMembership: node.indirectClassMembership,
      serviceLabelLang: node.serviceLabelLang,
      instanceAlias: node.instance,
      fields: node.attributes.map((attribute) => ({
        alias: attribute.alias,
        exp: attribute.value,
        isHelper: attribute.isHelper,
        requireValues: attribute.isRequired,
        addLabel: attribute.addLabel,
        addAltLabel: attribute.addAltLabel,
        addDescription: attribute.addDescription,
        attributeCondition: attribute.attributeCondition,
      })),
      aggregations: node.aggregations.map((aggregation) => ({
        exp: aggregation.expression,
        alias: aggregation.alias,
      })),
      conditions: node.conditions.map((condition) => ({
        exp: condition,
      })),
      ...this.serializeOptionalFields(node),
    };
  }

  /**
   * @param {Node} node
   * @returns {object}
   */
  serializeOptionalFields(node) {
    const fields = {};
    if (node.distinct) {
      fields.distinct = true;
    }
    if (node.limit !== null) {
      fields.limit = node.limit;
    }
    if (node.offset !== null) {
      fields.offset = node.offset;
    }
    if (node.orders.length > 0) {
      fields.orderings = node.orders.map((order) => ({
        exp: order.expression,
        isDescending: order.descending,
      }));
    }
    if (node.groupings.length > 0) {
      fields.groupings = node.groupings.map((g) => ({ exp: g }));
    }
    if (node.having !== null) {
      fields.having = { exp: node.having };
    }
    return fields;
  }

  /**
   * @param {Node} node
   * @param {Set<string>} visited
   * @returns {object[]}
   */
  serializeChildren(node, visited) {
    const children = [];

    const edges = [
      ...node.incoming.map((e) => ({ edge: e, n: e.from, isInverse: true })),
      ...node.outgoing.map((e) => ({ edge: e, n: e.to, isInverse: false })),
    ];

    for (const { edge, n, isInverse } of edges) {
      if (visited.has(n.id)) continue;
      visited.add(n.id);
      children.push({
        isInverse,
        isSubQuery: edge.nestingType === NestingType.Subquery,
        isGlobalSubQuery: edge.nestingType === NestingType.GlobalSubquery,
        linkType: edge.linkType,
        isDelayedLink: edge.isDelayed,
        linkIdentification: { local_name: edge.name },
        graphsServiceLink: edge.graphsService,
        ...this.serializeNode(n),
        children: this.serializeChildren(n, visited),
      });
    }

    return children;
  }
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {ConfigOptions} options
 * @return {Promise<{status: ResultStatus.Ok, ast: {root: object}} | {status: ResultStatus.Error, error: string}>}
 */
async function parsedQueryToAST(parsedQuery, options) {
  config = new Config(options);
  try {
    const block = await buildBlock(parsedQuery, true);
    return {
      status: ResultStatus.Ok,
      ast: new AST(block.graph).build(),
    };
  } catch (e) {
    return {
      status: ResultStatus.Error,
      error: e.message,
    };
  }
}

/**
 * @param {string} name
 * @returns {Promise<string>}
 */
async function resolveProperty(name) {
  const identification = await dataShapes.resolvePropertyByName({ name });
  if (!identification.complete) return name;
  return pickName(identification);
}

/**
 * @param {string} name
 * @returns {Promise<string>}
 */
async function resolveClass(name) {
  const identification = await dataShapes.resolveClassByName({ name });
  if (!identification.complete) return name;
  return pickName(identification);
}

/**
 * @param {string} name
 * @returns {Promise<string>}
 */
async function resolveIndividual(name) {
  const identification = await dataShapes.resolveIndividualByName({ name });
  if (!identification.complete) return name;
  return identification.data[0].localName;
}

/**
 * @param {{ data: { full_name: string, display_name: string }[] }} identification
 * @returns {string}
 */
function pickName(identification) {
  const data = identification.data[0];
  if (
    !config.showPrefixesForAllNames &&
    (data.prefix === "wd" || data.prefix === "wdt")
  ) {
    return data.display_name;
  }
  return data.full_name;
}

/**
 * @param {WherePattern} pattern
 * @returns {boolean}
 */
function isLabelService(pattern) {
  return (
    pattern.type === WhereType.Service &&
    pattern.name?.value === WIKIBASE_LABEL_SERVICE_IRI
  );
}

/**
 * Whether an OPTIONAL pattern is simple enough to absorb inline as an
 * attribute — a single triple, optionally followed by an inline-able FILTER
 * on its object.
 * @param {WherePattern} pattern
 * @returns {boolean}
 */
function isSimpleOptional(pattern) {
  if (pattern.type !== WhereType.Optional) return false;
  if (pattern.patterns.length < 1 || pattern.patterns.length > 2) return false;

  const bgp = pattern.patterns[0];
  if (bgp.type !== WhereType.BGP || bgp.triples.length !== 1) return false;

  if (pattern.patterns.length === 1) return true;

  const filter = pattern.patterns[1];
  if (filter.type !== WhereType.Filter) return false;

  const obj = bgp.triples[0].object;
  if (obj.termType !== NodeTypes.Variable) return false;
  return isInlineableFilter(filter.expression, obj.value);
}

/**
 * @param {WherePattern} pattern
 * @returns {boolean}
 */
function isSimpleFilter(pattern) {
  if (pattern.type !== WhereType.Filter) return false;
  const expr = pattern.expression;
  if (expr.type !== ExpressionType.Operation) return true;
  if (expr.operator !== Operator.Exists && expr.operator !== Operator.NotExists)
    return true;
  return tryInlineFilterExists(expr) !== null;
}

/**
 * @param {Term} term
 * @returns {boolean}
 */
function isGrammarCompatibleLiteral(term) {
  if (term.termType !== NodeTypes.Literal) return false;
  if (term.language) return false;
  if (!term.datatype) return true;
  const datatype = term.datatype.value;
  return datatype === STRING_LITERAL || datatype === INTEGER_LITERAL;
}

/**
 * @param {OperationExpression} expr
 * @param {string} varName
 * @returns {boolean}
 */
function isInlineableFilter(expr, varName) {
  if (expr.type !== ExpressionType.Operation) return false;
  if (!INFIX_OPERATORS.has(expr.operator)) return false;
  if (expr.args.length !== 2) return false;
  if (
    expr.args[0].termType !== NodeTypes.Variable ||
    expr.args[0].value !== varName
  )
    return false;
  return isGrammarCompatibleLiteral(expr.args[1]);
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {BlockContext} ctx
 * @param {Set<string>} selectedVariables
 * @returns {Promise<Graph>}
 */
async function buildGraph(parsedQuery, ctx, selectedVariables) {
  const bgpTriples = parsedQuery.where.flatMap((w) =>
    w.type === WhereType.BGP ? w.triples : [],
  );

  const graph = new Graph(ctx);
  const termIndex = new Map();
  const getOrCreateNode = (term) => {
    const key = `${term.termType}::${term.value}`;
    if (!termIndex.has(key)) {
      const node = new Node(term.termType, term.value, ctx);
      termIndex.set(key, node.id);
      graph.add(node);
    }
    return graph.get(termIndex.get(key));
  };

  const unionFind = new UnionFind();

  for (const triple of bgpTriples) {
    const subjectNode = getOrCreateNode(triple.subject);
    unionFind.ensure(subjectNode.id);
    if (triple.object.termType === NodeTypes.Literal) continue;

    const isDirectClass =
      triple.predicate.termType === NodeTypes.NamedNode &&
      triple.predicate.value === config.directClassMembershipRole;
    const isIndirectClass =
      config.indirectClassMembershipRole !== null &&
      triple.predicate.type === "path" &&
      pathToIRIString(triple.predicate) === config.indirectClassMembershipRole;

    if (isDirectClass || isIndirectClass) {
      if (triple.object.termType === NodeTypes.Variable) {
        subjectNode.class = predicateExpression(
          triple.object.value,
          selectedVariables,
        );
      } else {
        subjectNode.class = await resolveClass(triple.object.value);
      }
      subjectNode.indirectClassMembership = isIndirectClass;
      continue;
    }

    const objectNode = getOrCreateNode(triple.object);
    unionFind.ensure(objectNode.id);
    const edge =
      triple.predicate.type === "path"
        ? new PathEdge(triple.predicate, subjectNode, objectNode)
        : new Edge(
            triple.predicate.value,
            triple.predicate.termType,
            subjectNode,
            objectNode,
          );
    if (unionFind.connected(subjectNode.id, objectNode.id)) {
      graph.addPendingReference(edge);
    } else {
      edge.wire();
      unionFind.union(subjectNode.id, objectNode.id);
    }
  }

  return graph;
}

/**
 * @param {WherePattern} pattern
 * @returns {Set<string>}
 */
function collectPatternVars(pattern) {
  const vars = new Set();
  if (!pattern) return vars;
  switch (pattern.type) {
    case WhereType.BGP:
      for (const t of pattern.triples) {
        if (t.subject.termType === NodeTypes.Variable)
          vars.add(t.subject.value);
        if (t.predicate.termType === NodeTypes.Variable)
          vars.add(t.predicate.value);
        if (t.object.termType === NodeTypes.Variable) vars.add(t.object.value);
      }
      break;
    case WhereType.Optional:
    case WhereType.Minus:
    case WhereType.Union:
    case WhereType.Graph:
    case WhereType.Service:
    case WhereType.Group:
      for (const p of pattern.patterns ?? []) {
        for (const v of collectPatternVars(p)) vars.add(v);
      }
      break;
    case WhereType.Bind:
      vars.add(pattern.variable.value);
      for (const v of variablesFromExpression(pattern.expression) ?? [])
        vars.add(v);
      break;
    case WhereType.Values:
      for (const row of pattern.values ?? []) {
        for (const key of Object.keys(row)) {
          vars.add(key.startsWith("?") ? key.slice(1) : key);
        }
      }
      break;
    case WhereType.Filter:
      break;
    case WhereType.Query:
      // only the projected subquery variables escape
      for (const v of pattern.variables ?? []) {
        if (v.termType === NodeTypes.Variable) vars.add(v.value);
        else if (v.variable?.value) vars.add(v.variable.value);
      }
      break;
  }
  return vars;
}

/**
 * Splits a WHERE clause into the minimal number of ordered segments.
 * A split is only introduced when a boundary pattern references a variable
 * introduced by a preceding boundary in the current segment (non-BGP variable overlap).
 *
 * @param {WherePattern[]} where
 * @returns {WherePattern[][]}
 */
function splitIntoOrderedSegments(where) {
  if (!where || where.length === 0) return [];

  const isBoundaryPattern = (p) =>
    p.type === WhereType.Bind ||
    p.type === WhereType.Values ||
    p.type === WhereType.Minus ||
    p.type === WhereType.Optional ||
    (p.type === WhereType.Group &&
      (p.patterns ?? []).some((inner) => inner.type === WhereType.Query));

  const segments = [];
  let current = [];
  const previousVars = new Set();

  for (let i = 0; i < where.length; i++) {
    const pattern = where[i];
    const patternVars = collectPatternVars(pattern);

    if (!isBoundaryPattern(pattern)) {
      for (const v of patternVars) previousVars.add(v);
      current.push(pattern);
      continue;
    }

    const newVars = new Set(
      [...patternVars].filter((v) => !previousVars.has(v)),
    );

    let needsSplit = false;
    if (newVars.size > 0) {
      for (let j = i + 1; j < where.length && !needsSplit; j++) {
        for (const v of collectPatternVars(where[j])) {
          if (newVars.has(v)) {
            needsSplit = true;
            break;
          }
        }
      }
    }

    for (const v of patternVars) {
      previousVars.add(v);
    }
    current.push(pattern);

    if (needsSplit) {
      segments.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }
  return segments;
}

/**
 * @param {WherePattern[]} wherePatterns
 * @param {Variable[]} variables
 * @returns {ParsedQuery}
 */
function syntheticQuery(wherePatterns, variables) {
  return {
    variables: variables.map((v) => (v.expression ? v.variable : v)),
    where: wherePatterns,
  };
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {boolean} isOutermostBlock
 */
async function buildBlock(parsedQuery, isOutermostBlock = false) {
  const selectedVariables = collectSelectedVariables(parsedQuery);
  const segments = splitIntoOrderedSegments(parsedQuery.where ?? []);
  const graphSegments = [];
  const ctx = new BlockContext();
  const graph = new Graph(ctx);
  let chainTip = null;

  for (const segment of segments) {
    const graphSegment = await buildSegment(
      { variables: parsedQuery.variables, where: segment },
      isOutermostBlock,
      graphSegments,
      ctx,
      selectedVariables,
    );
    graphSegments.push(graphSegment);
    if (!chainTip) {
      chainTip = graph.getRoot();
    }
    chainTip = graph.appendSegment(chainTip, graphSegment);
  }
  await applyExpressionProjections(parsedQuery, graph);
  await applyGlobalValuesExpressions(
    parsedQuery,
    graph,
    selectedVariables,
    graphSegments,
  );
  await applyHaving(graph, parsedQuery);
  await applyAggregations(graph, parsedQuery);
  applyGroupings(graph, parsedQuery, selectedVariables);
  await applyOrdering(graph, parsedQuery);
  if (isOutermostBlock) {
    applyLabelServiceLanguages(parsedQuery, graph);
    applyLabelFlags(graph, selectedVariables);
  }
  graph.cleanupBlankNodes();
  applyBlockFields(graph, parsedQuery);

  return {
    graph,
    projectedVariables: collectProjectedVariables(parsedQuery),
  };
}

/**
 * @param {ParsedQuery} parsedQuery
 * @returns {string|null}
 */
function findLabelServiceLanguage(parsedQuery) {
  for (const pattern of parsedQuery.where ?? []) {
    if (!isLabelService(pattern)) continue;
    for (const inner of pattern.patterns ?? []) {
      if (inner.type !== WhereType.BGP) continue;
      for (const triple of inner.triples) {
        if (triple.subject.value === BD_SERVICE_PARAM_IRI) {
          return triple.object.value.replace(/"/g, "");
        }
      }
    }
  }
  return null;
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {Graph} graph
 */
function applyLabelServiceLanguages(parsedQuery, graph) {
  const lang = findLabelServiceLanguage(parsedQuery);
  if (lang === null) return;
  const root = graph.getRoot();
  if (root) {
    root.serviceLabelLang = lang;
  }
}

/**
 * @param {Graph} graph
 * @param {Set<string>} selectedVariables
 */
function applyLabelFlags(graph, selectedVariables) {
  const root = graph.getRoot();
  if (!root?.serviceLabelLang) return;
  for (const node of graph.values()) {
    const selectAttr = node.attributes.find(
      (a) => a.value === SELECT_THIS_EXPRESSION,
    );
    if (selectAttr && node.instance) {
      selectAttr.addLabel = selectedVariables.has(node.instance + "Label");
      selectAttr.addAltLabel = selectedVariables.has(
        node.instance + "AltLabel",
      );
      selectAttr.addDescription = selectedVariables.has(
        node.instance + "Description",
      );
    }
    for (const attr of node.attributes) {
      if (!attr.alias) continue;
      attr.addLabel = selectedVariables.has(attr.alias + "Label");
      attr.addAltLabel = selectedVariables.has(attr.alias + "AltLabel");
      attr.addDescription = selectedVariables.has(attr.alias + "Description");
    }
  }
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {Graph} graph
 * @returns {Promise<Set<string>>}
 */
async function buildInnerBlocks(parsedQuery, graph) {
  const newSubqueryVars = new Set();
  for (const w of parsedQuery.where) {
    if (w.type === WhereType.Query) {
      const inner = await buildBlock(w);
      const outerInstances = new Set(
        [...graph.values()].map((n) => n.instance),
      );
      graph.connect(inner.graph, NestingType.Subquery, LinkType.Required);
      for (const varName of inner.projectedVariables) {
        if (!outerInstances.has(varName)) newSubqueryVars.add(varName);
      }
      continue;
    }

    if (w.type === WhereType.Group) {
      const subqueries = w.patterns.filter((p) => p.type === WhereType.Query);
      if (subqueries.length === 0) {
        const inner = await buildBlock(
          syntheticQuery(w.patterns, parsedQuery.variables),
        );
        graph.connect(inner.graph, NestingType.Plain, LinkType.Required);
      } else {
        for (const sq of subqueries) {
          const inner = await buildBlock(sq);
          const outerInstances = new Set(
            [...graph.values()].map((n) => n.instance),
          );
          graph.connect(inner.graph, NestingType.Subquery, LinkType.Required);
          for (const varName of inner.projectedVariables) {
            if (!outerInstances.has(varName)) newSubqueryVars.add(varName);
          }
        }
      }
      continue;
    }

    if (w.type === WhereType.Union) {
      const unionNode = new Node(NodeTypes.NamedNode, null, graph.ctx);
      unionNode.class = "[ + ]";
      unionNode.resolved = true;
      unionNode.isRoot = graph.size === 0;
      graph.add(unionNode);

      for (const branch of w.patterns) {
        const patterns =
          branch.type === WhereType.Group ? branch.patterns : [branch];
        const inner = await buildBlock(
          syntheticQuery(patterns, parsedQuery.variables),
        );

        const innerRoot = inner.graph.getRoot();

        for (const node of inner.graph.values()) {
          node.isRoot = false;
        }

        if (innerRoot) {
          Edge.additional(innerRoot, unionNode).wire();
        }

        for (const node of inner.graph.values()) graph.add(node);
      }
      continue;
    }

    if (w.type === WhereType.Optional && !isSimpleOptional(w)) {
      const inner = await buildBlock(
        syntheticQuery(w.patterns, parsedQuery.variables),
      );
      graph.connect(inner.graph, NestingType.Plain, LinkType.Optional);
      continue;
    }

    if (w.type === WhereType.Minus) {
      const patterns = w.patterns;
      if (patterns.length > 0) {
        const inner = await buildBlock(
          syntheticQuery(patterns, parsedQuery.variables),
        );
        graph.connect(inner.graph, NestingType.GlobalSubquery, LinkType.Not);
      }
      continue;
    }

    if (w.type === WhereType.Graph) {
      const graphName =
        w.name.termType === NodeTypes.Variable
          ? `?${w.name.value}`
          : w.name.value;
      const inner = await buildBlock(
        syntheticQuery(w.patterns, parsedQuery.variables),
      );
      graph.connect(inner.graph, NestingType.Plain, LinkType.Required, {
        graph: graphName,
        graphInstruction: GraphInstruction.Graph,
      });
      continue;
    }

    if (w.type === WhereType.Service && !isLabelService(w)) {
      const serviceName =
        w.name.termType === NodeTypes.Variable
          ? `?${w.name.value}`
          : w.name.value;
      const graphInstruction = w.silent
        ? GraphInstruction.ServiceSilent
        : GraphInstruction.Service;
      const inner = await buildBlock(
        syntheticQuery(w.patterns, parsedQuery.variables),
      );
      graph.connect(inner.graph, NestingType.Plain, LinkType.Required, {
        graph: serviceName,
        graphInstruction,
      });
      continue;
    }

    if (w.type === WhereType.Filter && !isSimpleFilter(w)) {
      const expr = w.expression;
      const group = expr.args[0];
      const patterns =
        group?.type === WhereType.Group ? group.patterns : [group];
      const inner = await buildBlock(
        syntheticQuery(patterns, parsedQuery.variables),
      );
      const linkType =
        expr.operator === Operator.NotExists
          ? LinkType.Not
          : LinkType.FilterExists;
      graph.connect(inner.graph, NestingType.Subquery, linkType);
    }
  }
  return newSubqueryVars;
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {Graph} graph
 * @param {Set<string>} selectedVariables
 */
async function applySimpleOptionalAttributes(
  parsedQuery,
  graph,
  selectedVariables,
) {
  const findOrCreateNode = (term) => {
    for (const node of graph.values()) {
      if (node.type === term.termType && node.instance === term.value)
        return node;
    }
    const node = new Node(term.termType, term.value, graph.ctx);
    node.isRequired = false;
    graph.add(node);
    return node;
  };

  for (const w of parsedQuery.where) {
    if (!isSimpleOptional(w)) continue;
    const triple = w.patterns[0].triples[0];
    const subjectNode = findOrCreateNode(triple.subject);

    const edge =
      triple.predicate.type === "path"
        ? new PathEdge(triple.predicate, subjectNode, subjectNode)
        : new Edge(
            triple.predicate.value,
            triple.predicate.termType,
            subjectNode,
            subjectNode,
          );
    const value = await attributeExpression(edge, selectedVariables);

    if (triple.object.termType === NodeTypes.Literal) continue;

    const objectVar =
      triple.object.termType === NodeTypes.Variable
        ? triple.object.value
        : null;
    const attr = new Attribute(
      value,
      objectVar ?? "",
      objectVar ? !selectedVariables.has(objectVar) : true,
      false,
    );
    attr.predicateVariable =
      triple.predicate.termType === NodeTypes.Variable
        ? triple.predicate.value
        : null;

    if (w.patterns.length === 2) {
      const filterExpr = w.patterns[1].expression;
      const condStr = await expressionToString(filterExpr, {
        [triple.object.value]: "",
      });
      attr.attributeCondition = condStr.trim();
    }

    subjectNode.attributes.push(attr);
  }
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {boolean} isOutermostBlock
 * @param {Graph[]} graphSegments
 * @param {BlockContext} ctx
 * @param {Set<string>} selectedVariables
 * @returns {Promise<Graph>}
 */
async function buildSegment(
  parsedQuery,
  isOutermostBlock,
  graphSegments,
  ctx,
  selectedVariables,
) {
  const graph = await buildGraph(parsedQuery, ctx, selectedVariables);
  await applySimpleOptionalAttributes(parsedQuery, graph, selectedVariables);
  graph.applyRoot();
  graph.applyReferenceOwnership();
  const newSubqueryVars = await buildInnerBlocks(parsedQuery, graph);
  await applySubqueryVars(graph, newSubqueryVars, selectedVariables);
  if (isOutermostBlock) {
    await applyAttributes(graph, selectedVariables);
    await graph.resolveNames(selectedVariables);
  }
  applySelectAttributes(graph, selectedVariables);
  await applyBindExpressions(
    parsedQuery,
    graph,
    selectedVariables,
    graphSegments,
  );
  await applyFilterExpressions(parsedQuery, graph, graphSegments);
  await applyValuesExpressions(
    parsedQuery,
    graph,
    selectedVariables,
    graphSegments,
  );
  await applyLiteralTriples(parsedQuery, graph);
  graph.connectComponents();

  return graph;
}

/**
 * @param {PropertyPath} path
 * @returns {string}
 */
function pathToIRIString(path) {
  const itemToString = (item) => {
    if (item.termType === NodeTypes.NamedNode) {
      return item.value;
    }
    if (item.type === "path") {
      return pathToIRIString(item);
    }
    return "";
  };

  if (path.pathType === "^") {
    return `^${itemToString(path.items[0])}`;
  }
  if (path.pathType === "*" || path.pathType === "+" || path.pathType === "?") {
    return `${itemToString(path.items[0])}${path.pathType}`;
  }
  if (path.pathType === "!") {
    const parts = path.items.map(itemToString);
    return parts.length === 1 ? `!${parts[0]}` : `!(${parts.join("|")})`;
  }
  if (path.pathType === "|") {
    return path.items.map(itemToString).join("|");
  }
  if (path.pathType === "/") {
    return path.items.map(itemToString).join("/");
  }
  throw new Error(`can\'t process path expression: ${JSON.stringify(path)}`);
}

/**
 * @param {PropertyPath} path
 * @returns {Promise<string>}
 */
async function resolvePathExpression(path) {
  const resolveSingle = async (item) => {
    if (item.termType === NodeTypes.NamedNode) {
      return await resolveProperty(item.value);
    } else if (item.type === "path") {
      return await resolvePathExpression(/** @type {PropertyPath} */ (item));
    }
    return null;
  };

  if (path.pathType === "^") {
    const inner = await resolveSingle(path.items[0]);
    const needsParens = path.items[0].type === "path";
    return needsParens ? `^(${inner})` : `^${inner}`;
  }

  if (path.pathType === "*" || path.pathType === "+" || path.pathType === "?") {
    const inner = await resolveSingle(path.items[0]);
    const needsParens = path.items[0].type === "path";
    return needsParens
      ? `(${inner})${path.pathType}`
      : `${inner}${path.pathType}`;
  }

  if (path.pathType === "!") {
    const parts = [];
    for (const item of path.items) parts.push(await resolveSingle(item));
    if (parts.length === 1) {
      const needsParens =
        path.items[0].type === "path" && path.items[0].pathType === "|";
      return needsParens ? `!(${parts[0]})` : `!${parts[0]}`;
    }
    return `!(${parts.join(" | ")})`;
  }

  const parts = [];
  for (const item of path.items) {
    if (item.termType === NodeTypes.NamedNode) {
      parts.push(await resolveProperty(item.value));
    } else if (item.type === "path") {
      parts.push(
        await resolvePathExpression(/** @type {PropertyPath} */ (item)),
      );
    }
  }

  if (path.pathType === "|") return parts.join(" | ");
  if (path.pathType === "/") return parts.join("/");
  throw new Error(`can\'t process path expression: ${JSON.stringify(path)}`);
}

/**
 * @param {Edge|PathEdge} edge
 * @returns {boolean}
 */
function isAbsorbableAttribute(edge) {
  const isPathEdge = edge instanceof PathEdge;
  if (
    edge.type !== NodeTypes.NamedNode &&
    edge.type !== NodeTypes.Variable &&
    !isPathEdge
  )
    return false;
  if (edge.name === config.directClassMembershipRole) return false;
  if (
    config.indirectClassMembershipRole !== null &&
    isPathEdge &&
    pathToIRIString(edge.path) === config.indirectClassMembershipRole
  )
    return false;

  const node = edge.to;
  return (
    node.type === NodeTypes.Variable &&
    node.class === null &&
    node.outgoing.length === 0 &&
    node.incoming.length === 1 &&
    node.ownedReferences.length === 0 &&
    node.referencedBy.length === 0 &&
    node.aggregations.length === 0
  );
}

/**
 * @param {Edge|PathEdge} edge
 * @param {Set<string>} selectedVariables
 * @returns {Promise<string|null>}
 */
async function attributeExpression(edge, selectedVariables) {
  await edge.resolveName(selectedVariables);
  if (edge instanceof PathEdge) {
    return `[[${edge.name}]]`;
  }
  return edge.name;
}

/**
 * @param {string} name
 * @param {Set<string>} selectedVariables
 * @returns {string}
 */
function predicateExpression(name, selectedVariables) {
  return selectedVariables.has(name) ? `?${name}` : `??${name}`;
}

/**
 * @param {Graph} graph
 * @param {Set<string>} selectedVariables
 */
async function applyAttributes(graph, selectedVariables) {
  const toAbsorb = [];

  for (const node of graph.values()) {
    if (node.type !== NodeTypes.Variable || node.incoming.length !== 1)
      continue;
    const edge = node.incoming[0];
    if (isAbsorbableAttribute(edge)) {
      toAbsorb.push({ node, edge });
    }
  }

  for (const { node, edge } of toAbsorb) {
    const predicateVariable =
      edge.type === NodeTypes.Variable ? edge.name : null;
    const value = await attributeExpression(edge, selectedVariables);

    const attr = new Attribute(
      value,
      node.instance,
      !selectedVariables.has(node.instance),
      node.isRequired,
    );
    attr.predicateVariable = predicateVariable;
    edge.from.attributes.push(attr);

    edge.from.conditions.push(...node.conditions);
    for (const attr of node.attributes) {
      if (attr.alias !== "") edge.from.attributes.push(attr);
    }

    graph.removeNode(node.id);
  }
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {Graph} graph
 */
async function applyExpressionProjections(parsedQuery, graph) {
  for (const variable of parsedQuery.variables) {
    if (variable.expression && !containsAggregation(variable.expression)) {
      const vars = variablesFromExpression(variable.expression);
      const targetNode = graph.findOrCreateNode(vars);
      targetNode.attributes.push(
        new Attribute(
          await expressionToString(variable.expression),
          variable.variable.value,
          false,
          false,
        ),
      );
    }
  }
}

/**
 * @param {Graph} graph
 * @param {Set<string>} selectedVariables
 */
function applySelectAttributes(graph, selectedVariables) {
  for (const node of graph.values()) {
    if (selectedVariables.has(node.instance) && !node.selected) {
      node.selected = true;
      node.attributes.unshift(
        new Attribute(SELECT_THIS_EXPRESSION, "", false, false),
      );
    }
  }
}

/**
 * @param {Expression | OperationExpression} expr
 * @returns {string[]}
 */
function aggregatedVariablesFromExpression(expr) {
  if (expr.type === ExpressionType.Aggregate) {
    return variablesFromExpression(expr.expression);
  }
  if (expr.type === ExpressionType.Operation) {
    return expr.args.flatMap((arg) => aggregatedVariablesFromExpression(arg));
  }
  return [];
}

async function applyAggregations(graph, parsedQuery) {
  for (const variable of parsedQuery.variables) {
    if (!variable.expression) continue;

    const aggregatedVars = aggregatedVariablesFromExpression(
      variable.expression,
    );
    if (aggregatedVars.length === 0) continue;

    const targetNode = graph.findNodeForVariable(aggregatedVars);
    if (!targetNode) continue;

    const replacements = /** @type {Object.<string, string>} */ ({
      [targetNode.instance]: ".",
    });

    targetNode.aggregations.push({
      expression: await expressionToString(variable.expression, replacements),
      alias: variable.variable.value,
    });
  }
}

/**
 * @param {Graph} graph
 * @param {ParsedQuery} parsedQuery
 * @param {Set<string>} selectedVariables
 */
function applyGroupings(graph, parsedQuery, selectedVariables) {
  if (!parsedQuery.group || parsedQuery.group.length === 0) return;

  const rootNode = graph.getRoot();
  if (!rootNode) return;

  for (const g of parsedQuery.group) {
    if (
      g.expression &&
      g.expression.termType === NodeTypes.Variable &&
      !selectedVariables.has(g.expression.value)
    ) {
      rootNode.groupings.push(g.expression.value);
    }
  }
}

/**
 * @param {Graph} graph
 * @param {ParsedQuery} parsedQuery
 */
async function applyHaving(graph, parsedQuery) {
  const having = parsedQuery.having ?? [];
  const rootNode = graph.getRoot();
  if (!rootNode) return;

  const expressions = [];
  for (const expr of having) {
    const aggregatedVars = aggregatedVariablesFromExpression(expr);
    const targetNode = graph.findNodeForVariable(aggregatedVars);
    const replacements = targetNode ? { [targetNode.instance]: "." } : {};
    expressions.push(await expressionToString(expr, replacements));
  }
  if (expressions.length > 0) {
    rootNode.having = expressions.join(" && ");
  }
}

/**
 * @param {Graph} graph
 * @param {ParsedQuery} parsedQuery
 */
async function applyOrdering(graph, parsedQuery) {
  const ordering = parsedQuery.order ?? [];
  const rootNode = graph.getRoot();
  if (!rootNode) return;

  for (const order of ordering) {
    rootNode.orders.push({
      descending: order.descending ?? false,
      expression: await expressionToString(order.expression),
    });
  }
}

/**
 * @param {Graph} graph
 * @param {ParsedQuery} parsedQuery
 */
function applyBlockFields(graph, parsedQuery) {
  const rootNode = graph.getRoot();
  if (!rootNode) return;

  rootNode.distinct = parsedQuery.distinct ?? false;
  rootNode.limit = parsedQuery.limit ?? null;
  rootNode.offset = parsedQuery.offset ?? null;
  rootNode.namedGraphs = [
    ...(parsedQuery.from?.default ?? []).map((n) => ({
      graph: n.value,
      graphInstruction: GraphInstruction.From,
    })),
    ...(parsedQuery.from?.named ?? []).map((n) => ({
      graph: n.value,
      graphInstruction: GraphInstruction.FromNamed,
    })),
  ];
}

/**
 * @param {Expression} expr
 * @param {Object.<string, string>} replacements
 * @returns {Promise<string>}
 */
async function expressionToString(expr, replacements = {}) {
  if (expr.termType === NodeTypes.NamedNode) {
    return await resolveProperty(expr.value);
  }

  if (expr.termType === NodeTypes.Literal) {
    if (expr.language) {
      return `"${expr.value}"@${expr.language}`;
    }
    if (expr.datatype.value === STRING_LITERAL) {
      return `"${expr.value}"`;
    }
    const datatype = expr.datatype.value;
    if (datatype.startsWith(XSD_NS)) {
      const localName = datatype.slice(XSD_NS.length);
      if (XSD_NO_ANNOTATION.has(localName)) {
        return expr.value;
      }
      return `"${expr.value}"^^xsd:${localName}`;
    }
    return `"${expr.value}"^^<${datatype}>`;
  }

  if (expr.termType === NodeTypes.Variable) {
    if (expr.value in replacements) {
      return replacements[expr.value];
    }

    return `@${expr.value}`;
  }

  if (expr.type === ExpressionType.Aggregate) {
    let argumentString = await expressionToString(
      expr.expression,
      replacements,
    );
    let aggregate = expr.aggregation;
    if (aggregate === "count") {
      if (expr.distinct) aggregate += "_distinct";
      return `${aggregate}(${argumentString})`;
    } else {
      let prefix = "";
      if (expr.distinct) {
        prefix = "DISTINCT ";
      }
      return `${aggregate}(${prefix}${argumentString})`;
    }
  }

  if (expr.type === ExpressionType.Operation) {
    if (expr.operator === Operator.In || expr.operator === Operator.NotIn) {
      const label = expr.operator === Operator.In ? "IN" : "NOT IN";
      const lhs = await expressionToString(expr.args[0], replacements);
      const values = await Promise.all(
        expr.args[1].map((arg) => expressionToString(arg, replacements)),
      );
      return `${lhs} ${label} (${values.join(", ")})`;
    }

    const args = await Promise.all(
      expr.args.map((arg) => expressionToString(arg, replacements)),
    );

    if (UNARY_OPERATORS.has(expr.operator) && args.length === 1) {
      return `${UNARY_OPERATORS.get(expr.operator)}${args[0]}`;
    }

    if (INFIX_OPERATORS.has(expr.operator) && args.length === 2) {
      return `${args[0]} ${expr.operator} ${args[1]}`;
    }

    if (expr.operator === Operator.Regex) {
      if (args.length === 3 && args[2] === '"i"') {
        return `${args[0]} ~* ${args[1]}`;
      }
      if (args.length === 2) {
        return `${args[0]} ~ ${args[1]}`;
      }
    }

    return `${expr.operator}(${args.join(", ")})`;
  }

  if (expr.type === ExpressionType.FunctionCall) {
    const args = await Promise.all(
      expr.args.map((arg) => expressionToString(arg, replacements)),
    );
    const functionIRI = expr.function.value;
    if (functionIRI.startsWith(XSD_NS)) {
      const inner = expr.args[0];
      const needsParens =
        inner.type === ExpressionType.Operation &&
        INFIX_OPERATORS.has(inner.operator);
      return needsParens ? `(${args[0]})` : args[0];
    }
    const localName = functionIRI.split(/[#\/]/).pop() || functionIRI;
    return `${localName}(${args.join(", ")})`;
  }

  throw new Error(`can\'t process expression: ${JSON.stringify(expr)}`);
}

/**
 * @param {OperationExpression} expr
 * @returns {boolean}
 */
function containsAggregation(expr) {
  if (expr.type === ExpressionType.Aggregate) return true;
  if (expr.type === ExpressionType.Operation) {
    return expr.args.some((arg) => containsAggregation(arg));
  }
  return false;
}

/**
 * @param {ParsedQuery} parsedQuery
 * @returns {Set<string>}
 */
function collectProjectedVariables(parsedQuery) {
  const projected = new Set();
  for (const variable of parsedQuery.variables) {
    if (variable.termType === NodeTypes.Variable) projected.add(variable.value);
    else if (variable.expression) projected.add(variable.variable.value);
  }
  return projected;
}

/**
 * @param {ParsedQuery} parsedQuery
 * @returns {Set<string>}
 */
function collectSelectedVariables(parsedQuery) {
  const isWildcardSelect = parsedQuery.variables.some(
    (v) => Object.keys(v).length === 0,
  );
  if (isWildcardSelect) {
    const selected = new Set();
    for (const w of parsedQuery.where) {
      for (const v of collectPatternVars(w)) {
        selected.add(v);
      }
    }
    if (parsedQuery.values) {
      for (const row of parsedQuery.values) {
        for (const key of Object.keys(row)) {
          selected.add(key.startsWith("?") ? key.slice(1) : key);
        }
      }
    }
    return selected;
  }

  const selected = new Set();
  for (const variable of parsedQuery.variables) {
    if (variable.termType === NodeTypes.Variable) {
      selected.add(variable.value);
    }
  }
  return selected;
}

function variablesFromExpression(expr) {
  if (expr.termType === NodeTypes.Literal) {
    return [];
  }

  if (expr.termType === NodeTypes.Variable) {
    return [expr.value];
  }

  if (expr.type === ExpressionType.Aggregate) {
    return variablesFromExpression(expr.expression);
  }

  if (
    expr.type === ExpressionType.Operation ||
    expr.type === ExpressionType.FunctionCall
  ) {
    return expr.args.flatMap((arg) => variablesFromExpression(arg));
  }

  return [];
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {Graph} graph
 * @param {Set<string>} selectedVariables
 * @param {Graph[]} graphSegments
 */
async function applyBindExpressions(
  parsedQuery,
  graph,
  selectedVariables,
  graphSegments,
) {
  for (const w of parsedQuery.where) {
    if (w.type !== WhereType.Bind) continue;
    const variables = variablesFromExpression(w.expression);

    const targetNode = graph.findOrCreateNode(variables, graphSegments);

    targetNode.attributes.push(
      new Attribute(
        await expressionToString(w.expression),
        w.variable.value,
        !selectedVariables.has(w.variable.value),
        true,
      ),
    );
  }
}

/**
 * Checks if a FILTER EXISTS/NOT EXISTS expression can be inlined as a textual condition.
 * This is possible when the EXISTS block contains a single triple introducing a variable,
 * followed by a filter on that variable.
 *
 * @param {OperationExpression} expr
 * @returns {{ subject: string, predicate: string, variable: string, filter: Expression, negated: boolean } | null}
 */
function tryInlineFilterExists(expr) {
  if (expr.type !== ExpressionType.Operation) return null;
  if (expr.operator !== Operator.Exists && expr.operator !== Operator.NotExists)
    return null;

  const group = expr.args[0];
  if (!group || group.type !== WhereType.Group) return null;

  const bgp = group.patterns.find((p) => p.type === WhereType.BGP);
  const filter = group.patterns.find((p) => p.type === WhereType.Filter);
  if (!bgp || !filter) return null;
  if (bgp.triples.length !== 1) return null;
  if (group.patterns.length !== 2) return null;

  const triple = bgp.triples[0];
  const filterVars = variablesFromExpression(filter.expression);
  const objectVar =
    triple.object.termType === NodeTypes.Variable ? triple.object.value : null;

  if (!objectVar || !filterVars.includes(objectVar)) return null;

  return {
    subject: triple.subject.value,
    predicate: triple.predicate.value,
    variable: objectVar,
    filter: filter.expression,
    negated: expr.operator === Operator.NotExists,
  };
}

/**
 * @param {ValuePatternRow[]} rows
 * @param {Graph} graph
 * @param {Set<string>} selectedVariables
 * @param {Graph[]} graphSegments
 * @returns {Promise<void>}
 */
async function applyValuesRows(rows, graph, selectedVariables, graphSegments) {
  /**
   * @type {string[]}
   */
  const variables = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      const varName = key.startsWith("?") ? key.slice(1) : key;
      if (!variables.includes(varName)) variables.push(varName);
    }
  }

  if (variables.length === 0) return;

  const isMultiVariable = variables.length > 1;

  const renderedRows = await Promise.all(
    rows.map(async (row) => {
      const vals = await Promise.all(
        variables.map(async (varName) => {
          const term = row[`?${varName}`];
          return term ? await expressionToString(term) : VALUES_UNDEF;
        }),
      );
      return isMultiVariable ? `(${vals.join(", ")})` : vals[0];
    }),
  );

  const alias = isMultiVariable ? `(${variables.join(", ")})` : variables[0];
  const value = `{${renderedRows.join(", ")}}`;

  let targetNode = graph.findOrCreateNode(variables, graphSegments);

  targetNode.attributes.push(
    new Attribute(
      value,
      alias,
      variables.every((v) => !selectedVariables.has(v)),
      false,
    ),
  );
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {Graph} graph
 * @param {Set<string>} selectedVariables
 * @param {Graph[]} graphSegments
 */
async function applyValuesExpressions(
  parsedQuery,
  graph,
  selectedVariables,
  graphSegments,
) {
  for (const w of parsedQuery.where) {
    if (w.type !== WhereType.Values) continue;
    await applyValuesRows(w.values, graph, selectedVariables, graphSegments);
  }
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {Graph} graph
 * @param {Set<string>} selectedVariables
 * @param {Graph[]} graphSegments
 */
async function applyGlobalValuesExpressions(
  parsedQuery,
  graph,
  selectedVariables,
  graphSegments,
) {
  if (parsedQuery.values && parsedQuery.values.length > 0) {
    await applyValuesRows(
      parsedQuery.values,
      graph,
      selectedVariables,
      graphSegments,
    );
  }
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {Graph} graph
 * @param {Graph[]} graphSegments
 */
async function applyFilterExpressions(parsedQuery, graph, graphSegments) {
  for (const w of parsedQuery.where.filter(isSimpleFilter)) {
    const inlined = tryInlineFilterExists(w.expression);

    if (inlined) {
      const predicateName = await resolveProperty(inlined.predicate);

      const conditionStr = await expressionToString(inlined.filter, {
        [inlined.variable]: predicateName,
      });

      const targetNode = graph.findOrCreateNode(
        [inlined.subject],
        graphSegments,
      );
      targetNode.conditions.push(
        inlined.negated ? `NOT EXISTS ${conditionStr}` : conditionStr,
      );
    } else {
      const variables = variablesFromExpression(w.expression);

      const targetNode = graph.findOrCreateNode(variables, graphSegments);

      targetNode.conditions.push(await expressionToString(w.expression));
    }
  }
}

/**
 * @param {ParsedQuery} parsedQuery
 * @param {Graph} graph
 */
async function applyLiteralTriples(parsedQuery, graph) {
  const literalTriples = parsedQuery.where
    .filter((w) => w.type === WhereType.BGP)
    .flatMap((w) => w.triples)
    .filter((t) => t.object.termType === NodeTypes.Literal);

  for (const triple of literalTriples) {
    const targetNode = graph.findNodeForVariableInContext([
      triple.subject.value,
    ]);
    if (!targetNode) continue;

    const predicateName = await resolveProperty(triple.predicate.value);
    const literalValue = await expressionToString(triple.object);

    targetNode.conditions.push(`${predicateName} -> ${literalValue}`);
  }
}

/**
 * @param {Graph} graph
 * @param {Set<string>} newSubqueryVars
 * @param {Set<string>} selectedVariables
 */
function applySubqueryVars(graph, newSubqueryVars, selectedVariables) {
  if (newSubqueryVars.size > 0) {
    const rootNode = graph.getRootOrFail();
    for (const varName of newSubqueryVars) {
      rootNode.attributes.push(
        new Attribute(
          `@${varName}`,
          varName,
          !selectedVariables.has(varName),
          false,
        ),
      );
    }
  }
}

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
    proj?.directClassMembershipRole === MembershipRoleSetting.WikidataDirect
      ? WIKIDATA_DIRECT_IRI
      : RDF_TYPE_IRI;

  const indirRole = proj?.indirectClassMembershipRole;
  const isWikidataIndirect =
    indirRole === MembershipRoleSetting.WikidataIndirect ||
    indirRole === MembershipRoleSetting.WikidataIndirectAlt;
  const indirectClassMembershipRole = isWikidataIndirect
    ? WIKIDATA_INDIRECT_IRI
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
