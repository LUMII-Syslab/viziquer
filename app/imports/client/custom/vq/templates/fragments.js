import { dataShapes } from '/imports/client/custom/vq/js/DataShapes.js'

// Creates an adjacency list (a list of relevant cpc_rels for each class)
async function getCPCAdj() {
	const CPCWithNames = await dataShapes.callServerFunction("xx_getCPCInfoWithNames", {main: {}});
	const adj = new Map();
	CPCWithNames.data.forEach(cpc => {
		// Join namespace name and class name
		if (cpc.ns1_name === undefined) {cpc.ns1_name = "";}
		if (cpc.ns2_name === undefined) {cpc.ns2_name = "";}
		const c = `${cpc.ns1_name}:${cpc.class1_name}`;
		const otherC = `${cpc.ns2_name}:${cpc.class2_name}`;

		// Add this edge to the adjacency list of both ends. Direction of edge: otherC ->(p)-> c
		if(!adj.has(c)) {
			adj.set(c, new Set());
		}
		if(!adj.has(otherC)) {
			adj.set(otherC, new Set());
		}

		adj.get(otherC).add({class: c, property: cpc.property_name, cpcCount: cpc.cpc_cnt, edgeDirection: "out"});
		adj.get(c).add({class: otherC, property: cpc.property_name, cpcCount: cpc.cpc_cnt, edgeDirection: "in"});		
	});

	return adj;
}

// Heuristic calculation of fragments, uses CPC rels
export async function fragmentsHeuristic(fragmentClassCount) {
	const mainClasses = Template.VQ_DSS_schema.Classes.get().map(c => c.full_name);		// Classes around which the fragment should be created
	const mainClassCount = mainClasses.length;

	const xxClassCPCCounts = await dataShapes.callServerFunction("xx_getClassCPCCounts", {main: {}});
	const classCPCCounts = new Map(xxClassCPCCounts.data.map(obj => [`${obj.ns_name}:${obj.class_name}`, parseInt(obj.total_cpc_cnt)]));

	const adj = await getCPCAdj();

	let currClassCount = 0;
	const classes = [];
	const classRelevance = new Map();
	const cpcRelevances = [];	// For analysis/debugging

	// Treat main classes as very important candidates to ensure they are included in the fragment
	const candidates = mainClasses;
	candidates.forEach(c => {
		classRelevance.set(c, 1000);	
	});

	// Try to add classes to the fragment until the desired size is achieved
	while (currClassCount < fragmentClassCount) {
		// If it is not possible to get a fragment of required size, return fragment of maximum possible size
		if (candidates.length == 0) {break;}

		// Sort candidates in increasing order of relevance and add the most relevant candidate to the fragment
		candidates.sort((a, b) => classRelevance.get(a) - classRelevance.get(b));
		const bestCandidate = candidates.pop();
		classes.push(bestCandidate);
		currClassCount++;

		// If a main class is selected, change its relevance to 1 to ensure adequate relevance for classes linked to this class
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
				const relevanceGain = classRelevance.get(bestCandidate) * cp.cpcCount / classCPCCounts.get(bestCandidate);
				classRelevance.set(cp.class, classRelevance.get(cp.class) + relevanceGain);
				cpcRelevances.push({from: bestCandidate, to: cp.class, title: `${cp.property}`, label: `${relevanceGain.toFixed(2)}`});
			} 
		});
	}

	// For analysis/debugging
	// let nodes = classes.map(c => ( {id: c, label: `${c}, rel: ${classRelevance.get(c).toFixed(2)}`} ));
	// nodes.concat(candidates.map(c => ( {id: c, label: `Candidate: ${c}, rel: ${classRelevance.get(c).toFixed(2)}`} )));
	// console.log("cpcRelevance", cpcRelevances);
	// console.log("nodes", nodes);

	return classes;	
}

// Personalized PageRank, uses CPC rels
export async function fragmentsPPR(fragmentClassCount, alpha, tol) {
	const mainClasses = Template.VQ_DSS_schema.Classes.get().map(c => c.full_name);		// Classes around which the fragment should be created
	const mainClassCount = mainClasses.length;

	const xxClassCPCCounts = await dataShapes.callServerFunction("xx_getClassCPCCounts", {main: {}});
	const classCPCCounts = new Map(xxClassCPCCounts.data.map(obj => [`${obj.ns_name}:${obj.class_name}`, parseInt(obj.total_cpc_cnt)]));

	// Create an adjacency list (a list of relevant cpc_rels for each class)
	const adj = await getCPCAdj();
	const N = adj.size;

	// Initially all classes have the same rank
	let rank = new Map([...adj.keys()].map(c => [c, 1/N]));

	// When jumping to another class, probability of each class being chosen (1/mainClassCount for main classes, 0 for others)
	personalization = new Map([...adj.keys()].map(c => [c, 0]));
	mainClasses.forEach(c => {personalization.set(c, 1/mainClassCount);});

	let err;
	do {
		const prevRank = rank;
		rank = new Map(prevRank.keys().map(c => [c, 0]));
		// For each class c update the rank of its neighbors
		rank.forEach((cRank, c) => {
			adj.get(c).forEach((cp) => {
				const otherC = cp.class;
				// Increase rank of otherC by alpha * <rank of c> * <weight of the edge>
				rank.set(otherC, rank.get(otherC) + alpha * prevRank.get(c) * cp.cpcCount / classCPCCounts.get(c));
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

	// Sort by rank and choose the best classes
	const sortedClasses = [...rank.entries()].sort((a, b) => b[1] - a[1]);
	const classes = sortedClasses.slice(0, fragmentClassCount).map((obj) => obj[0]);

	return classes;	
}