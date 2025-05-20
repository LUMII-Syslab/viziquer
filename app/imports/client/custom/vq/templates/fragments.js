import { dataShapes } from '/imports/client/custom/vq/js/DataShapes.js'


// Creates an adjacency list (a list of relevant cpc_rels for each class)
export async function getCPCAdj(weightByCPCsum) {
	if (weightByCPCsum !== true && weightByCPCsum !== false) {console.error("getCPCAdj: weightByCPCsum is not true or false");}
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
		cpcWeight = cnt / classSizes.get(otherC) * cnt / classSizes.get(c);
		if (weightByCPCsum === true) {cpcWeight = Math.min(0.9, cpcWeight);}
		adj.get(otherC).push({class: c, property: cpc.property_id, weight: cpcWeight, propDirection: "out"});
		adj.get(c).push({class: otherC, property: cpc.property_id, weight: cpcWeight, propDirection: "in"});		
		// For one-directional weight (swapping the weights is also worth considering)
		// adj.get(otherC).push({class: c, property: cpc.property_id, weight: Math.min(0.9, cnt / classSizes.get(otherC)), propDirection: "out"});
		// adj.get(c).push({class: otherC, property: cpc.property_id, weight: Math.min(0.9, cnt / classSizes.get(c)), propDirection: "in"});		
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
async function getAdjFromCP(weightByCPCsum) {
	if (weightByCPCsum !== true && weightByCPCsum !== false) {console.error("getAdjFromCP: weightByCPCsum is not true or false");}
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
					let cpcWeight = Math.min(0.9, cnt / classSizes.get(c2) * cnt / classSizes.get(c1));
					cpcWeight *= cp1_cnt / PtoCPCnt.get(p).get(1);	// In both directions
					// let cpcWeight = Math.min(0.9, cnt / classSizes.get(c2)) * cp1_cnt / PtoCPCnt.get(p).get(1);	// In one direction
					adj.get(c2).push({class: c1, property: p, weight: cpcWeight, propDirection: "out" });

					// Calculate weight of c2->p->c1 in regards to c1 and add to adj
					cpcWeight = Math.min(0.9, cnt / classSizes.get(c1) * cnt / classSizes.get(c2));
					cpcWeight *= cp2_cnt / PtoCPCnt.get(p).get(2);	// In both directions
					// cpcWeight = Math.min(0.9, cnt / classSizes.get(c1)) * cp2_cnt / PtoCPCnt.get(p).get(2);	// In one direction
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

// Finds a fragment surrounding main classes. Only classes that are directly connected to main classes are considered. Each main class gives its neighbors a total of 1/mainClassCount relevance
export async function fragmentsTrivial(mainClasses, fragmentClassCount, weightByCPCsum, adj) {
	const mainClassCount = mainClasses.length;

	// Create an adjacency list (a list of relevant cpc_rels for each class) if not given as a parameter
	if (adj === undefined) {
		adj = await getCPCAdj(weightByCPCsum);
		if (adj.size == 0) {adj = await getAdjFromCP(weightByCPCsum);}
	}

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
export async function fragmentsHeuristic(mainClasses, fragmentClassCount, weightByCPCsum, adj) {
	const mainClassCount = mainClasses.length;
	const mainClass = mainClasses[0];
	
	// Create an adjacency list (a list of relevant cpc_rels for each class) if not given as a parameter
	if (adj === undefined) {
		adj = await getCPCAdj(weightByCPCsum);
		if (adj.size == 0) {adj = await getAdjFromCP(weightByCPCsum);}
	}

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
		if (candidates.length == 0) {break;}

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
export async function fragmentsPPR(mainClasses, fragmentClassCount, alpha, tol, weightByCPCsum, adj) {
	// Create an adjacency list (a list of relevant cpc_rels for each class) if not given as a parameter
	if (adj === undefined) {
		adj = await getCPCAdj(weightByCPCsum);
		if (adj.size == 0) {adj = await getAdjFromCP(weightByCPCsum);}
	}

	// Calculate rank using PPR
	const rank = PPR(adj, mainClasses, alpha, tol);

	// Sort by rank and choose the best classes
	const sortedClasses = [...rank.entries()].sort((a, b) => b[1] - a[1]);
	const classes = sortedClasses.slice(0, fragmentClassCount).map((obj) => obj[0]);

	// justifyFragmentRelevance(adj, classes, rank, [mainClasses[0]]);

	return [classes, rank];	
}

// Limited Personalized PageRank (cross between heuristic and PPR), uses CPC rels
export async function fragmentsLimitedPPR(mainClasses, fragmentClassCount, alpha, tol, weightByCPCsum, adj) {
	// Create an adjacency list (a list of relevant cpc_rels for each class) if not given as a parameter
	if (adj === undefined) {
		adj = await getCPCAdj(weightByCPCsum);
		if (adj.size == 0) {adj = await getAdjFromCP(weightByCPCsum);}
	}

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
		if (rank.length == currClassCount) {break;}

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

	
	// justifyFragmentRelevance(adj, classes, rank, [mainClasses[0]]);

	return [classes, rank];	
}

let classNames, propertyNames;
export async function runFragmentAlgorithm(algorithm, mainClasses, fragSize, weightByCPCsum, adj) {
	// Class and property names needed for justifyFragmentRelevance
	const xxClasses = await dataShapes.callServerFunction("xx_getClassesSimple", {main: {}});
	classNames = new Map(xxClasses.data.map(obj => [obj.id, `${obj.ns_name}:${obj.class_name}`]));
	const xxProperties = await dataShapes.callServerFunction("xx_getPropertiesSimple", {main: {}});
	propertyNames = new Map(xxProperties.data.map(obj => [obj.id, obj.name]));

	let fragmentClasses, rank;
	switch (algorithm) {
		case "trivial":
			[fragmentClasses, rank] = await fragmentsTrivial(mainClasses, fragSize, weightByCPCsum, adj);
			break;
		case "heuristic":
			[fragmentClasses, rank] = await fragmentsHeuristic(mainClasses, fragSize, weightByCPCsum, adj);
			break;
		case "ppr":
			[fragmentClasses, rank] = await fragmentsPPR(mainClasses, fragSize, 0.85, 1e-5, weightByCPCsum, adj);
			break;
		case "limited-ppr":
			[fragmentClasses, rank] = await fragmentsLimitedPPR(mainClasses, fragSize, 0.85, 1e-5, weightByCPCsum, adj);
	}
	return [fragmentClasses, rank];
}

// Compare fragments calculated by various algorithms by calculating the fraction of common classes; uses each of selected classes as a main class
export async function compareFragmentAlgorithmsIntersection(weightByCPCsum) {
	const adj = await getCPCAdj(weightByCPCsum);
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
					const [frag1, ] = await runFragmentAlgorithm(alg1, [mainClass], fragSize, weightByCPCsum, adj);
					const [frag2, ] = await runFragmentAlgorithm(alg2, [mainClass], fragSize, weightByCPCsum, adj);
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
			if (a1 == a2) {continue;}
			const alg2 = algorithms[a2];
			const similarities = new Map();
			for (let fragSize = 10; fragSize <= 30; fragSize += 5) {
				similarities.set(fragSize, []);
				for (let i = 0; i < mainClasses.length; i++) {
					const mainClass = mainClasses[i];
					const [frag1, ] = await runFragmentAlgorithm(alg1, [mainClass], fragSize, weightByCPCsum, adj);
					let minSize = fragSize-1;
					let maxSize = dataShapes.schema.diagram.filteredClassList.length;
					while (maxSize - minSize > 1) {
						let size = Math.floor((minSize + maxSize) / 2);
						const [frag2, ] = await runFragmentAlgorithm(alg2, [mainClass], size, weightByCPCsum, adj);
						const commonClasses = frag1.filter(c => frag2.includes(c));
						if (commonClasses.length == frag1.length) {
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

// Compare fragments calculated by various algorithms by comparing relevance (rank); uses each of selected classes as a main class
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
					let [frag1, rank1] = await runFragmentAlgorithm(alg1, [mainClass], fragSize, weightByCPCsum, adj);
					let [frag2, rank2] = await runFragmentAlgorithm(alg2, [mainClass], fragSize, weightByCPCsum, adj);
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
