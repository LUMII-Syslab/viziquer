import { Template } from 'meteor/templating';
import { dataShapes } from '/imports/custom/vq/client/js/DataShapes.js'


// Lookup propertyId -> {id, namespace, displayName} from the loaded schema 
function buildPropMetaGetter() {
	const propMeta = new Map();
	const plist = (dataShapes.schema && dataShapes.schema.diagram && dataShapes.schema.diagram.properties) || [];
	plist.forEach(p => propMeta.set(p.id, { id: p.id, namespace: p.prefix, displayName: p.display_name }));
	return (pid) => propMeta.get(pid) || { id: pid, namespace: undefined, displayName: undefined };
}

// Predicate: is the property's id in standardProperties? null/undefined -> always true
function makeIsStandardProperty(standardProperties) {
	if (standardProperties === undefined || standardProperties === null) return () => true;
	const set = new Set([...standardProperties].map(Number));
	return (prop) => !!(prop && set.has(Number(prop.id)));
}

// Creates an adjacency list (a list of relevant cpc_rels for each class)
export async function getCPCAdj(weightByCPCsum, useBothClasses, SCHEMA_LEVEL_EDGE_WEIGHT = null) {
	if (weightByCPCsum !== true && weightByCPCsum !== false) {console.error("getCPCAdj: weightByCPCsum is not true or false");}
	if (useBothClasses !== true && useBothClasses !== false) {console.error("getCPCAdj: useBothClasses is not true or false");}
	const CPCs = await dataShapes.callServerFunction("xx_getCPCInfo", {main: {}});

	// If weightByCPCsum is true, calculate total cpc count of each class. Otherwise use number of instances in a class
	let classSizes;
	if (weightByCPCsum === true) {
		classSizes = new Map();
		CPCs.data.forEach(cpc => {
			if (!classSizes.get(cpc.class_id)) {classSizes.set(cpc.class_id, 0);}
			if (!classSizes.get(cpc.other_class_id)) {classSizes.set(cpc.other_class_id, 0);}
			classSizes.set(cpc.class_id, classSizes.get(cpc.class_id) + parseFloat(cpc.cnt));
			classSizes.set(cpc.other_class_id, classSizes.get(cpc.other_class_id) + parseFloat(cpc.cnt));
		});
	}
	else {
		const xxClasses = await dataShapes.callServerFunction("xx_getClassesSimple", {main: {}});
		classSizes = new Map(xxClasses.data.map(obj => [obj.id, obj.cnt]));
	}

	// Create adjacency list
	const adj = new Map();
	CPCs.data.forEach(cpc => {
		const c = cpc.class_id;
		const otherC = cpc.other_class_id;
		// Add this edge to the adjacency list of both ends. Direction of edge: otherC ->(p)-> c
		if(!adj.has(c)) {
			adj.set(c, []);
		}
		if(!adj.has(otherC)) {
			adj.set(otherC, []);
		}
		const cnt = parseFloat(cpc.cnt);
		// Calculate edge weight. Do not allow a weight greater than 0.9. Important in cases where class size is used and cpc count is high; especially if one of the classes is small -- weight can become > 1000.
		if (useBothClasses === true) {
			let cpcWeight = SCHEMA_LEVEL_EDGE_WEIGHT !== null ? SCHEMA_LEVEL_EDGE_WEIGHT : Math.min(0.9, cnt / classSizes.get(otherC) * cnt / classSizes.get(c));
			adj.get(otherC).push({class: c, property: cpc.property_id, weight: cpcWeight, propDirection: "out"});
			adj.get(c).push({class: otherC, property: cpc.property_id, weight: cpcWeight, propDirection: "in"});
		}
		// For one-directional weight (swapping the weights is also worth considering)
		else {
			adj.get(otherC).push({class: c, property: cpc.property_id, weight: SCHEMA_LEVEL_EDGE_WEIGHT !== null ? SCHEMA_LEVEL_EDGE_WEIGHT : Math.min(0.9, cnt / classSizes.get(otherC)), propDirection: "out"});
			adj.get(c).push({class: otherC, property: cpc.property_id, weight: SCHEMA_LEVEL_EDGE_WEIGHT !== null ? SCHEMA_LEVEL_EDGE_WEIGHT : Math.min(0.9, cnt / classSizes.get(c)), propDirection: "in"});
		}
	});

	// Sort adjacency list of each class in decreasing order by weight and normalize to make all edges of a class have a total weight of 1
	adj.forEach((cps, c) => {
		cps.sort((a, b) => b.weight - a.weight);
		let weightSum = 0;
		cps.forEach(cp => {weightSum += cp.weight;})
		cps.forEach(cp => {cp.weight /= weightSum;})
	});

	return adj;
}

// Calculate adjacency list with weights from cp rels (pair each c->p to each p->c to get cpc)
async function getAdjFromCP(weightByCPCsum, useBothClasses) {
	if (weightByCPCsum !== true && weightByCPCsum !== false) {console.error("getAdjFromCP: weightByCPCsum is not true or false");}
	if (useBothClasses !== true && useBothClasses !== false) {console.error("getAdjFromCP: useBothClasses is not true or false");}
	const xxCPs = await dataShapes.callServerFunction("xx_getCPInfoObjectProps", {main: {}});
	const CPs = xxCPs.data;

	// If weightByCPCsum is true, calculate total cpc count of each class. Otherwise use number of instances in a class
	let classSizes = new Map();
	if (weightByCPCsum === false) {
		const xxClasses = await dataShapes.callServerFunction("xx_getClassesSimple", {main: {}});
		classSizes = new Map(xxClasses.data.map(obj => [obj.id, obj.cnt]));
	}

	const PtoCP = new Map();	// For each property for each direction a list of cp rels
	const PtoCPCnt = new Map();	// For each property for each direction sum of cp counts
	CPs.forEach(cp => {
		const p = cp.property_id;
		const c = cp.class_id;
		const cnt = parseFloat(cp.cnt);
		// Set values if not yet present
		if (!PtoCP.get(p)) {
			PtoCP.set(p, new Map());
			PtoCPCnt.set(p, new Map());
		}
		if (!PtoCP.get(p).get(cp.type_id)) {
			PtoCP.get(p).set(cp.type_id, []);
			PtoCPCnt.get(p).set(cp.type_id, 0);
		}

		// Update values
		PtoCP.get(p).get(cp.type_id).push(cp);
		PtoCPCnt.get(p).set(cp.type_id, PtoCPCnt.get(p).get(cp.type_id) + cnt);
		if (weightByCPCsum === true) {
			if (!classSizes.get(c)) {classSizes.set(c, 0);}
			classSizes.set(c, classSizes.get(c) + cnt);
		}

	});

	// Create adjacency list; look at all possible triples c2->p->c1 (each c2->p with each p->c1)
	const adj = new Map();
	// For each property
	PtoCP.forEach((cps, p) => {
		if (cps.get(1) && cps.get(2)) {
			// For each c2->p
			cps.get(2).forEach(cp2 => {
				const c2 = cp2.class_id;
				const cp2_cnt = parseFloat(cp2.cnt);
				if (!adj.get(c2)) {adj.set(c2, []);}
				// For each p->c1
				cps.get(1).forEach(cp1 => {
					const c1 = cp1.class_id;
					const cp1_cnt = parseFloat(cp1.cnt);
					const cnt = Math.min(cp1_cnt, cp2_cnt);
					if (!adj.get(c1)) {adj.set(c1, []);}

					// Calculate weight of c2->p->c1 in regards to c2 and add to adj
					let cpcWeight;
					if (useBothClasses === false) {	cpcWeight = Math.min(0.9, cnt / classSizes.get(c2)); }
					else { cpcWeight = Math.min(0.9, cnt / classSizes.get(c2) * cnt / classSizes.get(c1)); }
					cpcWeight *= cp1_cnt / PtoCPCnt.get(p).get(1);	// Account for uncertainty of which is the correct other end
					adj.get(c2).push({class: c1, property: p, weight: cpcWeight, propDirection: "out" });

					// Calculate weight of c2->p->c1 in regards to c1 and add to adj
					if (useBothClasses === false) {	cpcWeight = Math.min(0.9, cnt / classSizes.get(c1)); }
					else { cpcWeight = Math.min(0.9, cnt / classSizes.get(c2) * cnt / classSizes.get(c1)); }
					cpcWeight *= cp2_cnt / PtoCPCnt.get(p).get(2);	// Account for uncertainty of which is the correct other end
					adj.get(c1).push({class: c2, property: p, weight: cpcWeight, propDirection: "in"});
				});
			});
		}
	});


	// Sort adjacency list of each class in decreasing order by weight and normalize to make all edges of a class have a total weight of 1
	adj.forEach((cps, c) => {
		cps.sort((a, b) => b.weight - a.weight);
		let weightSum = 0;
		cps.forEach(cp => {weightSum += cp.weight;})
		cps.forEach(cp => {cp.weight /= weightSum;})
	});

	return adj;
}

// Like getCPCAdj but unweighted, each (otherClass, direction) pair appears at most once per class
// adj value: {neighbors: [{class, propDirection, properties}], inCount, outCount, properties, standardRelCount, userDefinedRelCount}
// standardRelCount/userDefinedRelCount split neighbors by whether the connecting property is in standardProperties (null -> all standard);
// a neighbor with both standard and user-defined properties is counted in both.
export async function getCPCAdjSimple(standardProperties = null, edgesInTriples = true, cntTransform = null, useInstanceCount = false) {
	const CPCs = await dataShapes.callServerFunction("xx_getCPCInfo", {main: {}});
	const getProp = buildPropMetaGetter();
	const isStandardProperty = makeIsStandardProperty(standardProperties);
	const cpcPropIds = [...new Set(CPCs.data.map(r => r.property_id))];
	console.log("getCPCAdjSimple: standardProperties =", standardProperties, "| std matches =", standardProperties ? cpcPropIds.filter(id => standardProperties.map(Number).includes(Number(id))) : "all (null)");

	let classSizes = null;
	if (useInstanceCount) {
		const xxClasses = await dataShapes.callServerFunction("xx_getClassesSimple", {main: {}});
		classSizes = new Map(xxClasses.data.map(obj => [obj.id, Number(obj.cnt) || 0]));
	}

	const adj = new Map();
	const seen = new Map(); // cls -> Map<key, {nb, hasStd, hasUserDef}>
	const ensure = (cls) => {
		if (!adj.has(cls)) { adj.set(cls, {neighbors: [], inCount: 0, outCount: 0, properties: new Map(), standardRelCount: 0, userDefinedRelCount: 0, instanceCount: classSizes ? (classSizes.get(cls) ?? 0) : 0}); seen.set(cls, new Map()); }
	};

	const transform = cntTransform ?? Math.log10;
	const relInc = (cnt) => edgesInTriples ? transform(Math.max(1, Number(cnt) || 1)) : 1;

	CPCs.data.forEach(cpc => {
		const c = cpc.class_id;
		const otherC = cpc.other_class_id;
		// Direction of edge: otherC ->(p)-> c
		ensure(c);
		ensure(otherC);

		const prop = getProp(cpc.property_id);
		adj.get(c).properties.set(prop.id, prop);
		adj.get(otherC).properties.set(prop.id, prop);

		const std = isStandardProperty(prop);
		const outKey = `${c}|out`;
		const outEntry = seen.get(otherC).get(outKey);
		if (!outEntry) {
			const nb = {class: c, propDirection: "out", properties: [prop]};
			seen.get(otherC).set(outKey, {nb, hasStd: std, hasUserDef: !std});
			adj.get(otherC).neighbors.push(nb);
			adj.get(otherC).outCount += useInstanceCount ? (adj.get(c).instanceCount || 1) : 1;
			if (std) adj.get(otherC).standardRelCount += relInc(cpc.cnt);
			else adj.get(otherC).userDefinedRelCount += relInc(cpc.cnt);
		} else if (!outEntry.nb.properties.some(p => p.id === prop.id)) {
			outEntry.nb.properties.push(prop);
			if (std && !outEntry.hasStd) { outEntry.hasStd = true; adj.get(otherC).standardRelCount += relInc(cpc.cnt); }
			if (!std && !outEntry.hasUserDef) { outEntry.hasUserDef = true; adj.get(otherC).userDefinedRelCount += relInc(cpc.cnt); }
		}
		const inKey = `${otherC}|in`;
		const inEntry = seen.get(c).get(inKey);
		if (!inEntry) {
			const nb = {class: otherC, propDirection: "in", properties: [prop]};
			seen.get(c).set(inKey, {nb, hasStd: std, hasUserDef: !std});
			adj.get(c).neighbors.push(nb);
			adj.get(c).inCount += useInstanceCount ? (adj.get(otherC).instanceCount || 1) : 1;
			if (std) adj.get(c).standardRelCount += relInc(cpc.cnt);
			else adj.get(c).userDefinedRelCount += relInc(cpc.cnt);
		} else if (!inEntry.nb.properties.some(p => p.id === prop.id)) {
			inEntry.nb.properties.push(prop);
			if (std && !inEntry.hasStd) { inEntry.hasStd = true; adj.get(c).standardRelCount += relInc(cpc.cnt); }
			if (!std && !inEntry.hasUserDef) { inEntry.hasUserDef = true; adj.get(c).userDefinedRelCount += relInc(cpc.cnt); }
		}
	});

	return adj;
}

// Like getAdjFromCP but unweighted, same shape as getCPCAdjSimple.
export async function getAdjFromCPSimple(standardProperties = null) {
	const xxCPs = await dataShapes.callServerFunction("xx_getCPInfoObjectProps", {main: {}});
	const CPs = xxCPs.data;
	const getProp = buildPropMetaGetter();
	const isStandardProperty = makeIsStandardProperty(standardProperties);

	const PtoCP = new Map();	// For each property for each direction a list of cp rels
	CPs.forEach(cp => {
		const p = cp.property_id;
		if (!PtoCP.get(p)) { PtoCP.set(p, new Map()); }
		if (!PtoCP.get(p).get(cp.type_id)) { PtoCP.get(p).set(cp.type_id, []); }
		PtoCP.get(p).get(cp.type_id).push(cp);
	});

	const adj = new Map();
	const seen = new Map(); // cls -> Map<key, {nb, hasStd, hasUserDef}>
	const ensure = (cls) => {
		if (!adj.has(cls)) { adj.set(cls, {neighbors: [], inCount: 0, outCount: 0, properties: new Map(), standardRelCount: 0, userDefinedRelCount: 0}); seen.set(cls, new Map()); }
	};

	// For each property look at all possible triples c2->p->c1; only when both ends of the property are observed
	PtoCP.forEach((cps, p) => {
		if (cps.get(1) && cps.get(2)) {
			const prop = getProp(p);
			cps.get(2).forEach(cp2 => {
				const c2 = cp2.class_id;
				ensure(c2);
				adj.get(c2).properties.set(prop.id, prop);
				cps.get(1).forEach(cp1 => {
					const c1 = cp1.class_id;
					ensure(c1);
					adj.get(c1).properties.set(prop.id, prop);

					const std = isStandardProperty(prop);
					const outKey = `${c1}|out`;
					const outEntry = seen.get(c2).get(outKey);
					if (!outEntry) {
						const nb = {class: c1, propDirection: "out", properties: [prop]};
						seen.get(c2).set(outKey, {nb, hasStd: std, hasUserDef: !std});
						adj.get(c2).neighbors.push(nb);
						adj.get(c2).outCount++;
						if (std) adj.get(c2).standardRelCount++; else adj.get(c2).userDefinedRelCount++;
					} else if (!outEntry.nb.properties.some(p => p.id === prop.id)) {
						outEntry.nb.properties.push(prop);
						if (std && !outEntry.hasStd) { outEntry.hasStd = true; adj.get(c2).standardRelCount++; }
						if (!std && !outEntry.hasUserDef) { outEntry.hasUserDef = true; adj.get(c2).userDefinedRelCount++; }
					}
					const inKey = `${c2}|in`;
					const inEntry = seen.get(c1).get(inKey);
					if (!inEntry) {
						const nb = {class: c2, propDirection: "in", properties: [prop]};
						seen.get(c1).set(inKey, {nb, hasStd: std, hasUserDef: !std});
						adj.get(c1).neighbors.push(nb);
						adj.get(c1).inCount++;
						if (std) adj.get(c1).standardRelCount++; else adj.get(c1).userDefinedRelCount++;
					} else if (!inEntry.nb.properties.some(p => p.id === prop.id)) {
						inEntry.nb.properties.push(prop);
						if (std && !inEntry.hasStd) { inEntry.hasStd = true; adj.get(c1).standardRelCount++; }
						if (!std && !inEntry.hasUserDef) { inEntry.hasUserDef = true; adj.get(c1).userDefinedRelCount++; }
					}
				});
			});
		}
	});

	return adj;
}

// Finds a fragment surrounding main classes. Only classes that are directly connected to main classes are considered. Each main class gives its neighbors a total of 1/mainClassCount relevance
export async function fragmentsTrivial(mainClasses, fragmentClassCount, adj) {
	const mainClassCount = mainClasses.length;

	const classRelevance = new Map();
	const candidatesSet = new Set(mainClasses);
	mainClasses.forEach(c => { classRelevance.set(c, 1000); });	// Make sure main classes will be chosen

	// Calculate relevance of neighbors of main classes
	mainClasses.forEach(c => {
		adj.get(c).forEach(cp => {
			if (!classRelevance.get(cp.class)) {
				classRelevance.set(cp.class, 0);
			}
			// Increase relevance of candidate class based on fraction of cpc count vs total cpc count of c
			const relevanceGain = 1/mainClassCount * cp.weight;
			classRelevance.set(cp.class, classRelevance.get(cp.class) + relevanceGain);

			candidatesSet.add(cp.class);
		});
	});

	// Sort candidates by relevance and choose the best
	const candidates = [...candidatesSet];
	candidates.sort((a, b) => classRelevance.get(b) - classRelevance.get(a));
	const classes = candidates.slice(0,fragmentClassCount);
	mainClasses.forEach(c => { classRelevance.set(c, 1/mainClassCount); });

	return [classes, classRelevance];
}

// Heuristic calculation of fragments, uses CPC rels
export async function fragmentsHeuristic(mainClasses, fragmentClassCount, adj) {
	const mainClassCount = mainClasses.length;
	const mainClass = mainClasses[0];

	let currClassCount = 0;
	const classes = [];
	const classRelevance = new Map();

	// Treat main classes as very important candidates to ensure they are included in the fragment
	const candidates = mainClasses;
	candidates.forEach(c => {
		classRelevance.set(c, 1000);
	});

	// Try to add classes to the fragment until the desired size is achieved
	while (currClassCount < fragmentClassCount) {
		// If it is not possible to get a fragment of required size, return fragment of maximum possible size
		if (candidates.length === 0) {break;}

		// Sort candidates in increasing order of relevance and add the most relevant candidate to the fragment
		candidates.sort((a, b) => classRelevance.get(a) - classRelevance.get(b));
		const bestCandidate = candidates.pop();
		classes.push(bestCandidate);
		currClassCount++;

		// If a main class is selected, change its relevance to 1/mainClassCount to ensure adequate relevance for classes linked to this class
		if (classRelevance.get(bestCandidate) >= 1000) {classRelevance.set(bestCandidate, 1/mainClassCount);}

		// Update relevance for neighbors of bestCandidate
		adj.get(bestCandidate).forEach(cp => {
			if (!classes.includes(cp.class)) {
				if (!candidates.includes(cp.class)) {
					candidates.push(cp.class);
					if (!classRelevance.get(cp.class)) {
						classRelevance.set(cp.class, 0);
					}
				}
				// Add <relevance of current bestCandidate> * <relevance of this cpc in context of current bestCandidate> to neighboring class
				const relevanceGain = classRelevance.get(bestCandidate) * cp.weight;
				classRelevance.set(cp.class, classRelevance.get(cp.class) + relevanceGain);
			}
		});
	}

	// justifyFragmentRelevance(adj, classes, classRelevance, [mainClass]);

	return [classes, classRelevance];
}

// Personalized PageRank - calculates rank for given adjacency list and main classes (classes to which the surfer teleports to)
function PPR(adj, mainClasses, alpha, tol) {
	const N = adj.size;

	// When jumping to another class, probability of each class being chosen (1/mainClassCount for main classes, 0 for others)
	const personalization = new Map([...adj.keys()].map(c => [c, 0]));
	mainClasses.forEach(c => {personalization.set(c, 1/mainClasses.length);});

	// Start at main classes
	let rank = personalization;

	let err;
	do {
		const sortedRank = [...rank.entries()].sort((a, b) => b[1] - a[1]);
		const prevRank = rank;
		rank = new Map([...prevRank.keys()].map(c => [c, 0]));
		// For each class c update the rank of its neighbors
		rank.forEach((cRank, c) => {
			adj.get(c).forEach((cp) => {
				const otherC = cp.class;
				// Increase rank of otherC by alpha * <rank of c> * <weight of the edge>
				rank.set(otherC, rank.get(otherC) + alpha * prevRank.get(c) * cp.weight);
			});
			// Increse rank of c by probability of it being jumped to
			rank.set(c, cRank + (1 - alpha) * personalization.get(c));
		});
		// Check convergence
		err = 0;
		rank.forEach((_, c) => {
			err += Math.abs(rank.get(c) - prevRank.get(c));
		});
	} while (err > N*tol);
	return rank;
}

// Finds a fragment using Personalized PageRank, uses CPC rels
export async function fragmentsPPR(mainClasses, fragmentClassCount, alpha, tol, adj) {
	// Calculate rank using PPR
	const rank = PPR(adj, mainClasses, alpha, tol);

	// Sort by rank and choose the best classes
	const sortedClasses = [...rank.entries()].sort((a, b) => b[1] - a[1]);
	const classes = sortedClasses.slice(0, fragmentClassCount).map((obj) => obj[0]);

	// justifyFragmentRelevance(adj, classes, rank, [mainClasses[0]]);

	return [classes, rank];
}

// Limited Personalized PageRank (cross between heuristic and PPR), uses CPC rels
export async function fragmentsLimitedPPR(mainClasses, fragmentClassCount, alpha, tol, adj) {
	// Initially choose the main classes as fragment classes
	const classes = [...mainClasses];

	let currClassCount = mainClasses.length;
	let rank;
	// Try to add classes to the fragment until the desired size is achieved
	while (currClassCount < fragmentClassCount) {
		// Filter the adj to only include already chosen classes, candidates and properties of the chosen classes.
		// This approach is not very useful here but would allow to use minimal queries (only get cpc info for chosen classes) if the schema is not extracted
		const adjFragment = new Map();
		adj.forEach((CPs, c) => {
			CPs.forEach((cp) => {
				if (classes.includes(c) || classes.includes(cp.class)) {
					if (!adjFragment.get(c)) {adjFragment.set(c, []);}
					adjFragment.get(c).push(cp);
				}
			});
		});

		// Calculate rank using PPR
		rank = PPR(adjFragment, mainClasses, alpha, tol);

		// If there are no new candidates, return fragment as is
		if (rank.length === currClassCount) {break;}

		// Add the best candidate to the fragment (sort in decreasing order of rank and choose the first class that is not yet chosen as part of the fragment)
		const sortedRank = [...rank.entries()].sort((a, b) => b[1] - a[1]);
		for (let i = 0; i < sortedRank.length; i++) {
			if (!classes.includes(sortedRank[i][0])) {
				classes.push(sortedRank[i][0]);
				currClassCount++;
				break;
			}
		}
	}

	return [classes, rank];
}

// Relation Relevance (BRP), used to order vertexes in AdjacentNodes
// vertexInfo: cpcListSimple value object for Vn (has .neighbors and .relevance)
// pathSet: Array<Map<classId, valueObject>> -- each path has the same shape as cpcListSimple
// Incoming and outgoing relationships are counted separately (each entry in vertexInfo.neighbors counts)
function relationRelevance(vertexInfo, pathSet) {
	// Pre-summarize each path so we don't rebuild sumRelevance per neighbor lookup
	const pathInfo = pathSet.map(path => {
		let sumRelevance = 0;
		path.forEach((obj) => { sumRelevance += obj.relevance; });
		return { path, sumRelevance, size: path.size };
	});

	let sumSizePaths = 0;
	pathInfo.forEach(p => { sumSizePaths += p.size; });

	// noPath: count of Vn's neighbor-entries that point at a vertex contained in any path
	let noPath = 0;
	vertexInfo.neighbors.forEach(nb => {
		for (const p of pathInfo) {
			if (p.path.has(nb.class)) {
				noPath++;
				break;
			}
		}
	});

	// Σ over paths T that Vn touches: sumRelevance(T) / sumSizePaths
	let pathTerm = 0;
	if (sumSizePaths > 0) {
		pathInfo.forEach(p => {
			const touches = vertexInfo.neighbors.some(nb => p.path.has(nb.class));
			if (touches) pathTerm += p.sumRelevance / sumSizePaths;
		});
	}

	return noPath + vertexInfo.relevance + pathTerm;
}

// Path quality (BRP), combines Relevance Coverage (RC) and Relevance Degree (RD) via an f-measure
// path: Map<classId, {relevance, ...}> -- subset of cpcListSimple representing the path's vertexes
// graph: Map<classId, {relevance, ...}> -- full cpcListSimple
function fmeasure(path, graph, alpha) {
	// Accept either Map<classId, valueObject-with-.relevance> (BRP shape) or Map<classId, number> (numeric rank shape)
	const rel = (v) => (typeof v === 'number' ? v : (v && typeof v.relevance === 'number' ? v.relevance : 0));

	let pathRelevanceSum = 0;
	path.forEach((v) => { pathRelevanceSum += rel(v); });

	let graphRelevanceSum = 0;
	let maxRelevance = 0;
	graph.forEach((v) => {
		const r = rel(v);
		graphRelevanceSum += r;
		if (r > maxRelevance) maxRelevance = r;
	});

	const avgRelevance = path.size > 0 ? pathRelevanceSum / path.size : 0;

	const RC = graphRelevanceSum > 0 ? pathRelevanceSum / graphRelevanceSum : 0;
	const RD = maxRelevance > 0 ? avgRelevance / maxRelevance : 0;

	const denom = (1 - alpha) * RD + alpha * RC;
	return denom > 0 ? (RD * RC) / denom : 0;
}

// Export class_id, class_name, weight for every class in the current filtered dataset.
// Weight field matches the active sort parameter in #sortPar (cnt_sum / cnt / in_props / order).
export function exportClassDatasetCSV() {
	const classList = dataShapes.schema?.diagram?.filteredClassList ?? [];
	const sortP = parseInt(document.getElementById("sortPar")?.value ?? "1");
	const weightField = sortP === 3 ? "cnt" : sortP === 4 ? "in_props" : sortP === 2 ? "order" : "cnt_sum";

	const rows = [["class_id", "class_name", "weight"]];
	classList.forEach(cl => {
		const name = cl.prefix ? `${cl.prefix}:${cl.display_name}` : (cl.display_name ?? cl.name ?? "");
		rows.push([cl.id, name, cl[weightField] ?? ""]);
	});
	const schemaName = dataShapes.schema?.schemaName ?? "dataset";
	downloadCSV(`class_dataset_${schemaName}.csv`, rows);
}

// Build a CSV string from an array of rows and trigger a browser download, used only for analysis and testing
function downloadCSV(filename, rows) {
	const csv = rows.map(row => row.map(cell => {
		const s = String(cell ?? "");
		return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	}).join(",")).join("\n");
	const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

// Undirected BFS over the simple adj map, 
// Returns Map<class, hopDistance>
function bfsUndirected(start, adj) {
	const dist = new Map([[start, 0]]);
	const queue = [start];
	let head = 0;
	while (head < queue.length) {
		const c = queue[head++];
		const node = adj.get(c);
		if (!node) continue;
		node.neighbors.forEach(nb => {
			if (!dist.has(nb.class)) {
				dist.set(nb.class, dist.get(c) + 1);
				queue.push(nb.class);
			}
		});
	}
	return dist;
}

// Subgraph-connectivity metrics for a fragment
// Returns { components, largestSize, isolatedCount }:
//   components -- count of connected components within the fragment subgraph
//   largestSize -- vertex count of the biggest component
//   isolatedCount -- vertices with no neighbour inside the fragment
function subgraphConnectivity(fragClassIds, simpleAdj) {
	const fragSet = new Set(fragClassIds);
	let isolatedCount = 0;
	fragClassIds.forEach(c => {
		const node = simpleAdj.get(c);
		if (!node || !node.neighbors.some(nb => fragSet.has(nb.class))) isolatedCount++;
	});

	const visited = new Set();
	let components = 0;
	let largestSize = 0;
	fragClassIds.forEach(start => {
		if (visited.has(start)) return;
		components++;
		let size = 0;
		const queue = [start];
		let head = 0;
		while (head < queue.length) {
			const c = queue[head++];
			if (visited.has(c)) continue;
			visited.add(c);
			size++;
			const node = simpleAdj.get(c);
			if (!node) continue;
			node.neighbors.forEach(nb => {
				if (fragSet.has(nb.class) && !visited.has(nb.class)) queue.push(nb.class);
			});
		}
		if (size > largestSize) largestSize = size;
	});

	return { components, largestSize, isolatedCount };
}

export async function computeBRPRelevance(mainClasses, config = {}, rawAdj = undefined) {
	const mainClassBoost = 1;
	const classWeightIncoming = config.classWeightIncoming ?? 0.3;
	const classWeightOutgoing = 1 - classWeightIncoming;
	const propWeightStandart = config.propWeightStandart ?? 0.2;
	const propWeightUserDefined = 1 - propWeightStandart;
	const beta = config.beta ?? 0.8;
	const alpha = 1 - beta;
	const cntTransform = config.cntTransform ?? (x => x);
	const useInstanceCount = config.useInstanceCount ?? false;

	let cpcListSimple = rawAdj;
	if (!cpcListSimple) {
		cpcListSimple = await getCPCAdjSimple(config.standardProperties ?? null, config.edgesInTriples, cntTransform, useInstanceCount);
		if (cpcListSimple.size == 0) cpcListSimple = await getAdjFromCPSimple(config.standardProperties ?? null);
	}

	// Guard: with 0 or 1 classes, centrality formula divides by zero.
	if (cpcListSimple.size <= 1) {
		const relevanceMap = new Map([...cpcListSimple].map(([k]) => [k, 0]));
		return { cpcListSimple, relevanceMap };
	}

	// Max rels is the max amount one class has in the entire schema
	let maxStandardRels = 0, maxUserDefinedRels = 0;
	cpcListSimple.forEach((obj) => {
		if (obj.standardRelCount > maxStandardRels) maxStandardRels = obj.standardRelCount;
		if (obj.userDefinedRelCount > maxUserDefinedRels) maxUserDefinedRels = obj.userDefinedRelCount;
	});
	console.log("Max standart rels are ", maxStandardRels, "Max user defined rels are ", maxUserDefinedRels);

	// Centrality(Cn) = (WI*CI + WO*CO) * (ns*ws/maxs + nud*wud/maxud) / (|C| - 1)
	const totalInstances = [...cpcListSimple.values()].reduce((sum, obj) => sum + (obj.instanceCount ?? 0), 0);
	cpcListSimple.forEach((obj, classId) => {
		if (mainClasses.includes(classId)) {
			obj.centralityMeasure = mainClassBoost;
		} else {
			const standardPropTerm = maxStandardRels > 0 ? (obj.standardRelCount * propWeightStandart) / maxStandardRels : 0;
			const userDefinedPropTerm = maxUserDefinedRels > 0 ? (obj.userDefinedRelCount * propWeightUserDefined) / maxUserDefinedRels : 0;
			const propTerm = standardPropTerm + userDefinedPropTerm;
			obj.propTerms = {standardPropTerm: standardPropTerm, userDefinedPropTerm: userDefinedPropTerm, sum: propTerm};

			const divisor = totalInstances > 0
				? (totalInstances - (obj.instanceCount ?? 0))
				: (cpcListSimple.size - 1);
			obj.centralityDivisor = divisor;

			const classTerm = (classWeightIncoming * obj.inCount) + (classWeightOutgoing * obj.outCount);
			obj.classTerm = classTerm;
			obj.centralityMeasure = classTerm * propTerm / divisor;
		}
	});

	const closenessMode = config.closenessMode ?? 'centralityBased';
	const N = cpcListSimple.size;
	let nodeWeightMap = null;
	if (closenessMode === 'weightBased') {
		const classList = (dataShapes.schema?.diagram?.classList) ?? [];
		nodeWeightMap = new Map(classList.map(obj => [obj.id, Number(obj.cnt_sum ?? 0)]));
	}

	// Closeness
	cpcListSimple.forEach((objCn, Cn) => {
		const dist = bfsUndirected(Cn, cpcListSimple);
		if (closenessMode === 'unweighted') {
			let sumD = 0;
			dist.forEach((d, n) => {
				if (n === Cn || d === 0) return;
				sumD += d;
			});
			objCn.closeness = sumD > 0 ? (N - 1) / sumD : 0;
		} else {
			let num = 0, den = 0;
			dist.forEach((d, n) => {
				if (n === Cn || d === 0) return;
				const w = closenessMode === 'weightBased'
					? (nodeWeightMap?.get(n) ?? 0)
					: cpcListSimple.get(n).centralityMeasure;
				num += w / d;
				den += 1 / d;
			});
			objCn.closeness = den > 0 ? num / den : 0;
		}
	});

	// weightBased closeness is a weighted avg of raw cnt_sum values → can be huge; normalize to [0,1]
	if (closenessMode === 'weightBased') {
		let maxCloseness = 0;
		cpcListSimple.forEach(obj => { if (obj.closeness > maxCloseness) maxCloseness = obj.closeness; });
		if (maxCloseness > 0) cpcListSimple.forEach(obj => { obj.closeness /= maxCloseness; });
	}

	// Relevance: weighted combination of centrality and closeness; alpha + beta = 1
	cpcListSimple.forEach((obj) => {
		obj.relevance = beta * obj.centralityMeasure + alpha * obj.closeness;
	});
	console.log("CPC Adjacency list for BRP: ", cpcListSimple);

	const relevanceMap = new Map([...cpcListSimple].map(([k, v]) => [k, v.relevance]));
	return { cpcListSimple, relevanceMap };
}

/**
 * config (all fields optional):
 *
 *  classWeightIncoming  {number}    0.3              Weight of incoming rels in centrality; outgoing = 1 - classWeightIncoming
 *  propWeightStandart   {number}    0.2              Weight of standard properties in centrality; user-defined = 1 - propWeightStandart
 *  beta                 {number}    0.8              Centrality share of relevance score; closeness share = 1 - beta
 *  closenessMode        {string}    'centralityBased'  How to weight BFS closeness:
 *                                                       'centralityBased' — weight neighbours by their centrality
 *                                                       'weightBased'     — weight by class cnt_sum from the schema
 *                                                       'unweighted'      — plain shortest-path distance sums
 *
 *  The following are ignored when simpleAdj is provided:
 *  cntTransform         {Function}  Math.log10       Applied to triple counts when building the adj list;
 *                                                      supported: Math.log10, Math.log2, Math.sqrt, x => x (full/identity)
 *  useInstanceCount     {boolean}   false            Use class instance count instead of class count for adj list and centrality divisor
 *  standardProperties   {number[]}  null             Property IDs treated as standard; null = all properties standard
 *  edgesInTriples       {boolean}   true             Scale adj list edge weights by triple count; false = each unique (neighbour, direction) pair counts as 1
 */
export async function fragmentsBRP(mainClasses, fragmentClassCount, simpleAdj, config = {edgesInTriples: true}) {
	console.log("fragmentsBRP config:", {...config, cntTransform: config.cntTransform ? (config.cntTransform.name || 'anonymous') : null});
	const alphaF = 0.5;
	const log = true;

	let cpcListSimple;
	if (config.preCalcAdj) {
		cpcListSimple = config.preCalcAdj;
	} else {
		({ cpcListSimple } = await computeBRPRelevance(mainClasses, config, simpleAdj));
	}

	// Guard: BRP loop requires at least 2 nodes.
	if (cpcListSimple.size <= 1) {
		const classes = [...cpcListSimple.keys()].slice(0, fragmentClassCount);
		return [classes, cpcListSimple];
	}

	// --- Broaden Relevant Paths (BRP) ---

	// NodeSet: all vertexes ordered by relevance desc, each entry is [classId, valueObject]
	const NodeSet = [...cpcListSimple.entries()].sort((a, b) => b[1].relevance - a[1].relevance);
	// AdjacentNodes: vertexes connected to anything in PathSet, ordered by Relation Relevance desc
	const AdjacentNodes = [];
	// PathSet: Array<Map<classId, valueObject>>; each path has the same shape as cpcListSimple
	let PathSet = [];
	const inPathSet = new Set();

	const removeFromList = (list, classId) => {
		const idx = list.findIndex(([id]) => id === classId);
		if (idx >= 0) list.splice(idx, 1);
	};

	let resultPath = null;
	while (true) {
		if (NodeSet.length === 0) { 
			if (log) console.log("Stopped because NODESet is empty");
			break;
		}

		// Stop condition: the best path has reached the requested size, pathSet is kept
		// sorted by f-measure desc, so PathSet[0] is both the largest-ready and best path
		if (PathSet.length > 0 && PathSet[0].size >= fragmentClassCount) {
			resultPath = PathSet[0];
			if (log) console.log("Stopped because we have created a fragment with max size");
			break;
		}

		// Pick Cr -- AdjacentNodes' head wins only if its relevance is strictly higher than NodeSet's head
		let Cr;
		if (AdjacentNodes.length > 0 && AdjacentNodes[0][1].relevance >= NodeSet[0][1].relevance) {
			Cr = AdjacentNodes.shift();
			if (log) console.log("Cr from ADJACENTNodes is ", JSON.stringify(Cr[0]));
			removeFromList(NodeSet, Cr[0]);
		} else {
			Cr = NodeSet.shift();
			if (log) console.log("Cr from NODESet is ", JSON.stringify(Cr[0]));
			removeFromList(AdjacentNodes, Cr[0]);
		}
		if (log) console.log("NodeSet ", NodeSet.length, "AdjacentNodes ", AdjacentNodes.length);

		// Insert Cr into PathSet, if Cr connects to existing paths, merge them with Cr into one path
		const connected = [];
		const unconnected = [];
		PathSet.forEach(path => {
			if (Cr[1].neighbors.some(nb => path.has(nb.class))) connected.push(path);
			else unconnected.push(path);
		});
		if (connected.length > 0) {
			const merged = new Map([Cr]);
			connected.forEach(path => path.forEach((v, k) => merged.set(k, v)));
			PathSet = [...unconnected, merged];
		} else {
			PathSet.push(new Map([Cr]));
		}
		inPathSet.add(Cr[0]);
		if (log) console.log("PathSet looks like ", PathSet);

		// Keep PathSet ordered by f-measure desc so PathSet[0] is always the best path
		const pathF = new Map(PathSet.map(p => [p, fmeasure(p, cpcListSimple, alphaF)]));
		PathSet.sort((a, b) => pathF.get(b) - pathF.get(a));

		// Add Cr's neighbors to AdjacentNodes (skip if already in PathSet or already in AdjacentNodes)
		Cr[1].neighbors.forEach(nb => {
			if (inPathSet.has(nb.class)) return;
			if (AdjacentNodes.some(([id]) => id === nb.class)) return;
			const nbInfo = cpcListSimple.get(nb.class);
			if (nbInfo) AdjacentNodes.push([nb.class, nbInfo]);
		});

		// Re-order AdjacentNodes by Relation Relevance against the updated PathSet
		AdjacentNodes.forEach(([, info]) => {
			info.relationRelevance = relationRelevance(info, PathSet);
		});
		AdjacentNodes.sort((a, b) => b[1].relationRelevance - a[1].relationRelevance);
	}

	// Fallback (NodeSet exhausted before any path hit the target size): PathSet is kept
	// sorted by f-measure desc, so the best surviving path is simply PathSet[0]
	if (!resultPath && PathSet.length > 0) resultPath = PathSet[0];

	const classes = resultPath ? [...resultPath.keys()] : [];
	const rank = new Map([...cpcListSimple].map(([k, v]) => [k, v.relevance]));

	return [classes, rank];
}

function getBoolsFromEdgeWeightContext(edgeWeightContext) {
	let weightByCPCsum;
	if (edgeWeightContext === "src-tgt-size" || edgeWeightContext === "src-size") {weightByCPCsum = false;}
	else if (edgeWeightContext === "src-tgt-conn" || edgeWeightContext === "src-conn") {weightByCPCsum = true;}

	let useBothClasses;
	if (edgeWeightContext === "src-size" || edgeWeightContext === "src-conn") {useBothClasses = false;}
	else if (edgeWeightContext === "src-tgt-size" || edgeWeightContext === "src-tgt-conn") {useBothClasses = true;}

	return [weightByCPCsum, useBothClasses];
}

let classNames, propertyNames;
export async function runFragmentAlgorithm(algorithm, edgeWeightContext, mainClasses, fragSize, adj, brpConfig = {}) {
	// Class and property names needed for justifyFragmentRelevance
	const xxClasses = await dataShapes.callServerFunction("xx_getClassesSimple", {main: {}});
	classNames = new Map(xxClasses.data.map(obj => [obj.id, `${obj.ns_name}:${obj.class_name}`]));
	const xxProperties = await dataShapes.callServerFunction("xx_getPropertiesSimple", {main: {}});
	propertyNames = new Map(xxProperties.data.map(obj => [obj.id, obj.name]));

	let [weightByCPCsum, useBothClasses] = getBoolsFromEdgeWeightContext(edgeWeightContext);

	// Create an adjacency list (a list of relevant cpc_rels for each class) if not given as a parameter
	if (adj === undefined && algorithm != "brp") {
		adj = await getCPCAdj(weightByCPCsum, useBothClasses);
		if (adj.size === 0) {adj = await getAdjFromCP(weightByCPCsum, useBothClasses);}
	}

	let fragmentClasses, rank;
	switch (algorithm) {
		case "trivial":
			[fragmentClasses, rank] = await fragmentsTrivial(mainClasses, fragSize, adj);
			break;
		case "heuristic":
			[fragmentClasses, rank] = await fragmentsHeuristic(mainClasses, fragSize, adj);
			break;
		case "ppr":
			[fragmentClasses, rank] = await fragmentsPPR(mainClasses, fragSize, 0.85, 1e-5, adj);
			break;
		case "limited-ppr":
			[fragmentClasses, rank] = await fragmentsLimitedPPR(mainClasses, fragSize, 0.85, 1e-5, adj);
			break;
		case "brp":
			[fragmentClasses, rank] = await fragmentsBRP(mainClasses, fragSize, undefined, brpConfig);
			break;
	}
	return [fragmentClasses, rank];
}

// Run BRP over a cartesian product of (paramRanges × fragSize). Downloads brp_runs.csv (one row per run)
// and brp_fragment_classes.csv (one row per fragment class); join on run_id.
// paramRanges: BRP config keys -> scalar | array. Supported keys: classWeightIncoming, beta, propWeightStandart.
// Standard properties come from the #fragment-std-prop-list box (empty -> all properties standard).
// Use this only for testing/analysis!
export async function exportBRPAnalysisCSV(paramRanges = {}, fragSizes = [10, 20, 30, 40, 50], mainClasses = null) {
	const paramSets = Object.keys(paramRanges).reduce((acc, key) => {
		const values = Array.isArray(paramRanges[key]) ? paramRanges[key] : [paramRanges[key]];
		return acc.flatMap(combo => values.map(v => ({ ...combo, [key]: v })));
	}, [{}]);

	const xxClasses = await dataShapes.callServerFunction("xx_getClassesSimple", {main: {}});
	const localClassNames = new Map(xxClasses.data.map(obj => [obj.id, `${obj.ns_name}:${obj.class_name}`]));

	const standardProperties = [...document.querySelectorAll("#fragment-std-prop-list .fragment-std-prop-row")]
		.map(r => Number(r.dataset.propId)).filter(Number.isFinite);
	const stdPropArg = standardProperties.length > 0 ? standardProperties : null;
	const standardPropCol = standardProperties.join(";");

	let simpleAdj = await getCPCAdjSimple(stdPropArg);
	if (simpleAdj.size === 0) simpleAdj = await getAdjFromCPSimple(stdPropArg);

	// Fall back to the schema browser selection only if mainClasses wasn't explicitly passed.
	if (mainClasses === null || mainClasses === undefined) {
		mainClasses = Template.VQ_DSS_schema.Classes.get().map(c => c.id);
	}
	const mainClassesSet = new Set(mainClasses);
	const mainClassIds = mainClasses.join(";");
	console.log(`BRP sweep: mainClasses=[${mainClasses.join(", ")}], paramSets=${paramSets.length} (from ranges), fragSizes=[${fragSizes.join(", ")}]`);

	const alphaF = 0.7;
	const runsRows = [["run_id", "class_weight_incoming", "beta", "prop_weight_standart", "frag_size", "fragment_size_actual", "fragment_f_measure", "connected_components", "largest_component_fraction", "isolated_count", "main_class_ids"]];
	const classRows = [["run_id", "class_id", "class_name", "is_main_class", "centrality", "closeness", "relevance", "relation_relevance", "standard_properties"]];

	for (let paramIdx = 0; paramIdx < paramSets.length; paramIdx++) {
		const paramSet = paramSets[paramIdx];
		const classWeightIncoming = paramSet.classWeightIncoming ?? 0.3;
		const beta = paramSet.beta ?? 0.3;
		const propWeightStandart = paramSet.propWeightStandart ?? 0.4;

		for (const fragSize of fragSizes) {
			const runId = `p${paramIdx}_s${fragSize}`;
			const [frag, ] = await fragmentsBRP(mainClasses, fragSize, simpleAdj, { ...paramSet, standardProperties: stdPropArg });

			const fragMap = new Map();
			frag.forEach(id => { const v = simpleAdj.get(id); if (v) fragMap.set(id, v); });
			const fragF = fmeasure(fragMap, simpleAdj, alphaF);

			const conn = subgraphConnectivity(frag, simpleAdj);
			const largestComponentFraction = frag.length > 0 ? conn.largestSize / frag.length : 0;

			runsRows.push([runId, classWeightIncoming, beta, propWeightStandart, fragSize, frag.length, fragF, conn.components, largestComponentFraction, conn.isolatedCount, mainClassIds]);

			frag.forEach(id => {
				const v = simpleAdj.get(id);
				if (!v) return;
				classRows.push([
					runId,
					id,
					localClassNames.get(id) ?? "",
					mainClassesSet.has(id) ? 1 : 0,
					v.centralityMeasure,
					v.closeness,
					v.relevance,
					v.relationRelevance ?? "",
					standardPropCol,
				]);
			});

			console.log(`Run ${runId}: fragment size ${frag.length}/${fragSize}, f-measure ${fragF.toFixed(4)}`);
		}
	}

	downloadCSV("brp_runs.csv", runsRows);
	downloadCSV("brp_fragment_classes.csv", classRows);
	console.log(`Wrote brp_runs.csv (${runsRows.length - 1} rows) and brp_fragment_classes.csv (${classRows.length - 1} rows).`);
}

// brpConfigs: each key may be a scalar or array. Arrays are expanded into a full cross-product of BRP variants.
// cntTransform values must be {name: string, fn: Function} objects so the name can appear in CSV output.
// standardProperties is always a single value (not varied).
export async function exportCSVBRPandPPRComparison(mainClasses, pprEdgeWeightContexts = [""], brpConfigs = {}, fragSizes = [10, 20, 30, 40, 50]) {
	const pprAlpha = 0.85;
	const pprTol = 1e-5;
	const xxClasses = await dataShapes.callServerFunction("xx_getClassesSimple", {main: {}});
	const localClassNames = new Map(xxClasses.data.map(obj => [obj.id, `${obj.ns_name}:${obj.class_name}`]));

	const standardProperties = brpConfigs.standardProperties ?? null;
	const standardPropCol = standardProperties ? standardProperties.join(";") : "";

	// Normalize a config value (scalar or array) to an array, using def if absent.
	const toArr = (val, def) => (val === undefined || val === null) ? [def] : (Array.isArray(val) ? val : [val]);

	// Normalize a cntTransform value to {name, fn}. Accepts {name, fn} or a plain function.
	const normTransform = (v) => {
		if (v && typeof v === "object" && typeof v.fn === "function") return v;
		if (typeof v === "function") return {name: "custom", fn: v};
		return {name: "identity", fn: x => x};
	};

	const edgesInTriplesArr   = toArr(brpConfigs.edgesInTriples,        true);
	const cntTransformArr     = toArr(brpConfigs.cntTransform,          null).map(normTransform);
	const useInstanceCountArr = toArr(brpConfigs.useInstanceCount,       false);
	const classWeightArr      = toArr(brpConfigs.classWeightIncoming,    0.3);
	const betaArr             = toArr(brpConfigs.beta,                   0.8);
	const propWeightArr       = toArr(brpConfigs.propWeightStandart,     0.2);
	const closenessModeArr    = toArr(brpConfigs.closenessMode,          'centralityBased');

	// Full cross-product over all variant axes.
	const cartesian = (...arrs) => arrs.reduce((acc, arr) => acc.flatMap(x => arr.map(y => [...x, y])), [[]]);
	const brpVariants = cartesian(edgesInTriplesArr, cntTransformArr, useInstanceCountArr, classWeightArr, betaArr, propWeightArr, closenessModeArr)
		.map(([edgesInTriples, cntTransform, useInstanceCount, classWeightIncoming, beta, propWeightStandart, closenessMode]) => ({
			edgesInTriples, cntTransform, useInstanceCount, classWeightIncoming, beta, propWeightStandart, closenessMode, standardProperties,
		}));

	// Cache BRP adj by the parameters that affect graph construction.
	const brpAdjCache = new Map();
	const getBRPAdj = async (v) => {
		const key = `${v.edgesInTriples}|${v.cntTransform.name}|${v.useInstanceCount}|${standardPropCol}`;
		if (!brpAdjCache.has(key)) {
			let adj = await getCPCAdjSimple(v.standardProperties, v.edgesInTriples, v.cntTransform.fn, v.useInstanceCount);
			if (adj.size === 0) adj = await getAdjFromCPSimple(v.standardProperties);
			brpAdjCache.set(key, adj);
		}
		return brpAdjCache.get(key);
	};

	// Cache PPR adj per edge-weight context.
	const pprAdjCache = new Map();
	const getPPRAdj = async (ctx) => {
		if (!pprAdjCache.has(ctx)) {
			if (ctx === "no-ctx") {
				pprAdjCache.set(ctx, await getCPCAdj(true, true, 1));
			} else {
				const [w, ub] = getBoolsFromEdgeWeightContext(ctx);
				pprAdjCache.set(ctx, await getCPCAdj(w, ub));
			}
		}
		return pprAdjCache.get(ctx);
	};

	const getAllSubsets = (arr) => {
		const result = [];
		for (let mask = 1; mask < (1 << arr.length); mask++) {
			result.push(arr.filter((_, i) => mask & (1 << i)));
		}
		return result.sort((a, b) => a.length - b.length);
	};
	const mainClassCombos = getAllSubsets(mainClasses);

	const brpRunsRows   = [["run_id", "edges_in_triples", "cnt_transform", "use_instance_count", "class_weight_incoming", "beta", "prop_weight_standart", "closeness_mode", "frag_size", "fragment_size_actual", "main_class_ids"]];
	const brpClassRows  = [["run_id", "class_id", "class_name", "is_main_class", "centrality", "closeness", "relevance", "relation_relevance", "standard_properties"]];
	const pprRunsRows   = [["run_id", "alpha", "edge_weight_context", "frag_size", "fragment_size_actual", "main_class_ids"]];
	const pprClassRows  = [["run_id", "class_id", "class_name", "is_main_class", "rank", "standard_properties"]];

	// PPR runs are independent of BRP variants — run once per combo × fragSize × context.
	for (let comboIdx = 0; comboIdx < mainClassCombos.length; comboIdx++) {
		const mainClassCombo = mainClassCombos[comboIdx];
		const mainClassesSet = new Set(mainClassCombo);
		const mainClassIds = mainClassCombo.join(";");

		for (const fragSize of fragSizes) {
			for (let ctxIdx = 0; ctxIdx < pprEdgeWeightContexts.length; ctxIdx++) {
				const edgeWeightContext = pprEdgeWeightContexts[ctxIdx];
				const pprAdj = await getPPRAdj(edgeWeightContext);
				const pprRunId = `ppr_c${comboIdx}_ctx${ctxIdx}_s${fragSize}`;
				const [pprFrag, pprRank] = await fragmentsPPR(mainClassCombo, fragSize, pprAlpha, pprTol, pprAdj);
				pprRunsRows.push([pprRunId, pprAlpha, edgeWeightContext, fragSize, pprFrag.length, mainClassIds]);
				pprFrag.forEach(id => {
					pprClassRows.push([pprRunId, id, localClassNames.get(id) ?? "", mainClassesSet.has(id) ? 1 : 0, pprRank.get(id) ?? 0, standardPropCol]);
				});
				console.log(`PPR c${comboIdx} ctx${ctxIdx} s${fragSize} (alpha=${pprAlpha}, ctx=${edgeWeightContext}): size ${pprFrag.length}`);
			}
		}
	}

	// BRP runs: one pass per variant × combo × fragSize.
	for (let variantIdx = 0; variantIdx < brpVariants.length; variantIdx++) {
		const v = brpVariants[variantIdx];
		const simpleAdj = await getBRPAdj(v);
		const variantConfig = {...v, cntTransform: v.cntTransform.fn};

		for (let comboIdx = 0; comboIdx < mainClassCombos.length; comboIdx++) {
			const mainClassCombo = mainClassCombos[comboIdx];
			const mainClassesSet = new Set(mainClassCombo);
			const mainClassIds = mainClassCombo.join(";");

			for (const fragSize of fragSizes) {
				const brpRunId = `brp_v${variantIdx}_c${comboIdx}_s${fragSize}`;
				const [brpFrag, ] = await fragmentsBRP(mainClassCombo, fragSize, simpleAdj, variantConfig);
				brpRunsRows.push([brpRunId, v.edgesInTriples, v.cntTransform.name, v.useInstanceCount, v.classWeightIncoming, v.beta, v.propWeightStandart, v.closenessMode, fragSize, brpFrag.length, mainClassIds]);
				brpFrag.forEach(id => {
					const entry = simpleAdj.get(id);
					if (!entry) return;
					brpClassRows.push([brpRunId, id, localClassNames.get(id) ?? "", mainClassesSet.has(id) ? 1 : 0, entry.centralityMeasure, entry.closeness, entry.relevance, entry.relationRelevance ?? "", standardPropCol]);
				});
				console.log(`BRP v${variantIdx} (edges=${v.edgesInTriples}, transform=${v.cntTransform.name}, instances=${v.useInstanceCount}) c${comboIdx} s${fragSize}: size ${brpFrag.length}`);
			}
		}
	}

	downloadCSV("brp_runs.csv", brpRunsRows);
	downloadCSV("brp_fragment_classes.csv", brpClassRows);
	downloadCSV("ppr_runs.csv", pprRunsRows);
	downloadCSV("ppr_fragment_classes.csv", pprClassRows);
	console.log(`Wrote brp_runs.csv (${brpRunsRows.length - 1} rows), brp_fragment_classes.csv (${brpClassRows.length - 1} rows), ppr_runs.csv (${pprRunsRows.length - 1} rows), ppr_fragment_classes.csv (${pprClassRows.length - 1} rows)`);
}

// Compare fragments calculated by various algorithms by calculating the fraction of common classes; uses each of selected classes as a main class. Currently always uses CPC rels.
export async function compareFragmentAlgorithmsIntersection(edgeWeightContext) {
	let [weightByCPCsum, useBothClasses] = getBoolsFromEdgeWeightContext(edgeWeightContext);
	const adj = await getCPCAdj(weightByCPCsum, useBothClasses);
	const mainClasses = Template.VQ_DSS_schema.Classes.get().map(c => c.id);		// Classes around which the fragment should be created
	const algorithms = ["trivial", "heuristic", "ppr", "limited-ppr"];
	for (let a1 = 0; a1 < algorithms.length; a1++) {
		const alg1 = algorithms[a1];
		for (let a2 = a1+1; a2 < algorithms.length; a2++) {
			const alg2 = algorithms[a2];
			const similarities = new Map();
			for (let fragSize = 10; fragSize <= 30; fragSize += 5) {
				similarities.set(fragSize, []);
				for (let i = 0; i < mainClasses.length; i++) {
					const mainClass = mainClasses[i];
					const [frag1, ] = await runFragmentAlgorithm(alg1, undefined, [mainClass], fragSize, adj);
					const [frag2, ] = await runFragmentAlgorithm(alg2, undefined, [mainClass], fragSize, adj);
					const commonClasses = frag1.filter(c => frag2.includes(c));
					const commonFraction = commonClasses.length / Math.max(frag1.length, frag2.length);
					similarities.get(fragSize).push(commonFraction);
				}
				console.log(`Common classes fractions for ${alg1}, ${alg2}, frag size ${fragSize}:`, JSON.stringify(similarities.get(fragSize)));
			}
		}
	}
}

// Compare fragments calculated by various algorithms by calculating the increase of size of frag2 needed to include all classes in frag1; uses each of selected classes as a main class
export async function compareFragmentAlgorithmsSizeIncrease(weightByCPCsum) {
	const adj = await getCPCAdj(weightByCPCsum);
	const mainClasses = Template.VQ_DSS_schema.Classes.get().map(c => c.id);		// Classes around which the fragment should be created
	const algorithms = ["trivial", "heuristic", "ppr", "limited-ppr"];
	for (let a1 = 0; a1 < algorithms.length; a1++) {
		const alg1 = algorithms[a1];
		for (let a2 = 0; a2 < algorithms.length; a2++) {
			if (a1 === a2) {continue;}
			const alg2 = algorithms[a2];
			const similarities = new Map();
			for (let fragSize = 10; fragSize <= 30; fragSize += 5) {
				similarities.set(fragSize, []);
				for (let i = 0; i < mainClasses.length; i++) {
					const mainClass = mainClasses[i];
					const [frag1, ] = await runFragmentAlgorithm(alg1, undefined, [mainClass], fragSize, adj);
					let minSize = fragSize-1;
					let maxSize = dataShapes.schema.diagram.filteredClassList.length;
					while (maxSize - minSize > 1) {
						let size = Math.floor((minSize + maxSize) / 2);
						const [frag2, ] = await runFragmentAlgorithm(alg1, undefined, [mainClass], fragSize, adj);
						const commonClasses = frag1.filter(c => frag2.includes(c));
						if (commonClasses.length === frag1.length) {
							maxSize = size;
						}
						else {
							minSize = size;
						}
					}
					const sizeIncrease = maxSize / frag1.length;
					similarities.get(fragSize).push(sizeIncrease);
				}
				console.log(`Size increase for ${alg1}, ${alg2}, frag size ${fragSize}:`, JSON.stringify(similarities.get(fragSize)));
			}
		}
	}
}

function normalizedRank(rank) {
	const keys = [ ...rank.keys() ];
	let sum = 0;
	keys.forEach(key => {
		sum += rank.get(key);
	});
	keys.forEach(key => {
		rank.set(key, rank.get(key) / sum);
	});
	return rank;
}

// Compare fragments calculated by various algorithms by comparing relevance (rank); uses each of selected classes as a main class. Results are more difficult to interpret
export async function compareFragmentAlgorithmsRank(weightByCPCsum) {
	const adj = await getCPCAdj(weightByCPCsum);
	const mainClasses = Template.VQ_DSS_schema.Classes.get().map(c => c.id);		// Classes around which the fragment should be created
	const algorithms = ["trivial", "heuristic", "ppr", "limited-ppr"];
	const allClasses = dataShapes.schema.diagram.filteredClassList.map(c => c.id);
	console.log("allClasses", allClasses);
	for (let a1 = 0; a1 < algorithms.length; a1++) {
		const alg1 = algorithms[a1];
		for (let a2 = a1+1; a2 < algorithms.length; a2++) {
			const alg2 = algorithms[a2];
			const rankDistances = new Map();
			for (let fragSize = 10; fragSize <= 30; fragSize += 5) {
				rankDistances.set(fragSize, []);
				for (let i = 0; i < mainClasses.length; i++) {
					const mainClass = mainClasses[i];
					let [frag1, rank1] = await runFragmentAlgorithm(alg1, undefined, [mainClass], fragSize, adj);
					let [frag2, rank2] = await runFragmentAlgorithm(alg1, undefined, [mainClass], fragSize, adj);
					rank1 = normalizedRank(rank1);
					rank2 = normalizedRank(rank2);
					let rankDistance = 0;
					allClasses.forEach(c => {
						const r1 = rank1.get(c) ? rank1.get(c) : 0;
						const r2 = rank2.get(c) ? rank2.get(c) : 0;
						rankDistance += (r1-r2)*(r1-r2);
					});
					rankDistance = Math.sqrt(rankDistance);
					rankDistances.get(fragSize).push(rankDistance);
				}
				console.log(`Rank distance for ${alg1}, ${alg2}, frag size ${fragSize}:`, JSON.stringify(rankDistances.get(fragSize)));
			}
		}
	}
}

// Display classes and their neighbors as a list in html. Double click items to see their neighbors
// Not very aesthetic but can be useful
function justifyFragmentRelevance(adj, fragmentClasses, rank, prevClasses) {
	$("#fragment-ancestor-classes").empty();
	$("#fragment-adj-classes").empty();

	let parentDiv = $("#fragment-ancestor-classes");
	prevClasses.forEach((c, idx) => {
		const ul = $("<ul/>");
		const li = $("<li/>");
		const div = $("<div/>");
		const p = $("<p/>");

		li.css("padding-left", "10px");
		p.text(classNames.get(c));
		p.dblclick(() => {justifyFragmentRelevance(adj, fragmentClasses, rank, prevClasses.slice(0,idx+1))});

		parentDiv.append(ul);
		ul.append(li);
		li.append(div);
		div.append(p);
		parentDiv = div;
	});

	const N = fragmentClasses.length;
	let classesInList = [];
	for (let i = 0; i < adj.get(prevClasses[prevClasses.length - 1]).length; i++) {
		const cp = adj.get(prevClasses[prevClasses.length - 1])[i];
		const c = cp.class;
		if (classesInList.includes(c)) {continue;}
		classesInList.push(c);

		const li = $("<li/>");
		const div = $("<div/>");
		const details = $("<details/>");
		const summary = $("<summary/>");
		const detailsUL = $("<ul/>");

		detailsUL.css("padding-left", "10px");
		li.dblclick(() => {justifyFragmentRelevance(adj, fragmentClasses, rank, prevClasses.concat([c]))});

		summary.text(`${classNames.get(c)}, ${propertyNames.get(cp.property)} (total rank: ${rank.get(c).toFixed(4)}, rank from parent: ${cp.weight})`);
		if (fragmentClasses.includes(c)) {
			summary.css("font-weight", "900");
		}
		// Fill the details with neighbors of c
		adj.get(c).slice(0, N).forEach((cp2) => {
			const cpLI = $("<li/>");
			cpLI.text(`${classNames.get(cp2.class)}, ${propertyNames.get(cp2.property)}, ${cp2.weight.toFixed(4)}`);
			detailsUL.append(cpLI);
		});

		$("#fragment-adj-classes").append(li);
		li.append(div);
		div.append(details);
		details.append(summary);
		details.append(detailsUL);

		if (classesInList.length >= N+2) {break;}
	}
}
