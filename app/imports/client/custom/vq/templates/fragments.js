import { dataShapes } from '/imports/client/custom/vq/js/DataShapes.js'

export async function fragments(fragmentClassCount) {
	const mainClasses = Template.VQ_DSS_schema.Classes.get().map(c => c.full_name);		// Classes around which the fragment should be created

	const xxClassCPCCounts = await dataShapes.callServerFunction("xx_getClassCPCCounts", {main: {}});
	const classCPCCounts = new Map(xxClassCPCCounts.data.map(obj => [`${obj.ns_name}:${obj.class_name}`, parseInt(obj.total_cpc_cnt)]));

	const CPCWithNames = await dataShapes.callServerFunction("xx_getCPCInfoWithNames", {main: {}});

	// Create an adjacency list (a list of relevant cpc_rels for each class)
	const adj = {};
	CPCWithNames.data.forEach(cpc => {
		// Join namespace name and class name
		if (cpc.ns1_name === undefined) {cpc.ns1_name = "";}
		if (cpc.ns2_name === undefined) {cpc.ns2_name = "";}
		const c = `${cpc.ns1_name}:${cpc.class1_name}`;
		const otherC = `${cpc.ns2_name}:${cpc.class2_name}`;

		// Add this edge to the adjacency list of both ends. Direction of edge: otherC ->(p)-> c
		if(!adj[c]) {
			adj[c] = new Set();
		}
		if(!adj[otherC]) {
			adj[otherC] = new Set();
		}

		adj[otherC].add({class: c, property: cpc.property_name, cpcCount: cpc.cpc_cnt, edgeDirection: "out"});
		adj[c].add({class: otherC, property: cpc.property_name, cpcCount: cpc.cpc_cnt, edgeDirection: "in"});		
	});

	let currClassCount = 0;
	const classes = [];
	const classRelevance = {};
	const cpcRelevances = [];	// For analysis/debugging

	// Treat main classes as very important candidates to ensure they are included in the fragment
	const candidates = mainClasses;
	candidates.forEach(c => {
		classRelevance[c]  = 1000;	
	});

	// Try to add classes to the fragment until the desired size is achieved
	while (currClassCount < fragmentClassCount) {
		// If it is not possible to get a fragment of required size, return fragment of maximum possible size
		if (candidates.length == 0) {break;}

		// Sort candidates in increasing order of relevance and add the most relevant candidate to the fragment
		candidates.sort((a, b) => classRelevance[a] - classRelevance[b]);
		const bestCandidate = candidates.pop();
		classes.push(bestCandidate);
		currClassCount++;

		// If a main class is selected, change its relevance to 1 to ensure adequate relevance for classes linked to this class
		if (classRelevance[bestCandidate] >= 1000) {classRelevance[bestCandidate] = 1;}	
		
		// Update relevance for neighbors of bestCandidate
		adj[bestCandidate].forEach(cp => {
			if (!classes.includes(cp.class)) {
				if (!candidates.includes(cp.class)) {	
					candidates.push(cp.class);
					if (!classRelevance[cp.class]) {
						classRelevance[cp.class] = 0;
					}
				}
				// Add <relevance of current bestCandidate> * <relevance of this cpc in context of current bestCandidate> to neighboring class
				const relevanceGain = classRelevance[bestCandidate] * cp.cpcCount / classCPCCounts.get(bestCandidate);
				classRelevance[cp.class] += relevanceGain;
				cpcRelevances.push({from: bestCandidate, to: cp.class, title: `${cp.property}`, label: `${relevanceGain.toFixed(2)}`});
			} 
		});
	}

	// For analysis/debugging
	// let nodes = classes.map(c => ( {id: c, label: `${c}, rel: ${classRelevance[c].toFixed(2)}`} ));
	// nodes.concat(candidates.map(c => ( {id: c, label: `Candidate: ${c}, rel: ${classRelevance[c].toFixed(2)}`} )));
	// console.log("cpcRelevance", cpcRelevances);
	// console.log("nodes", nodes);

	return classes;	
}