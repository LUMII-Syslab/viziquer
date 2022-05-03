// ***********************************************************************************
// const FAAS_SERVER_URL = 'http://localhost:59286/api';
let _faasServerUrl = null;
const getFaasServerUrl = async () => new Promise((resolve, reject) => {
    Meteor.call('getEnvVariable', 'FAAS_SERVER_URL', (error, result) => {
        if (error) {
            return reject(error);
        }
        _faasServerUrl = result;
        return resolve(result);
    })
});
// ***********************************************************************************
// const MAX_ANSWERS = 30;
// const MAX_IND_ANSWERS = 100;
// const MAX_TREE_ANSWERS = 30;
// const TREE_PLUS = 20;
// const BIG_CLASS_CNT = 500000;
// const LONG_ANSWER = 3000;
// const MakeLog = false;
// const ConsoleLog = false;
// ***********************************************************************************
const ALLOWED_NAMESPACES = ["wdt"];
// ***********************************************************************************

const callFAAS = async (callText) => {
    // *** console.log("------------callFAAS ------------------");
    try {
        const faasServerUrl = await getFaasServerUrl();
        const url = faasServerUrl+callText;
        console.log(`url=${url}`);

		const response = await window.fetch(url, {
			method: 'GET',
			// mode: 'no-cors',
			cache: 'no-cache'
		});
		//console.log(response);
		if (!response.ok) {
			console.log('neveiksmīgs wd izsaukums');
			return { error: response };
		}
		return await response.json();
	}
	catch(err) {
        console.error(err);
		return {};
    }
}

const callFAASFindInstances = async (faasIParams) => {
    // *** console.log("------------callFAASFindInstances ------------------");
	// 'faasIParams' is result of function convertAllParamsToFindInstancesParams()
	// 	let rez = {
	// 		instanceOf: [],    // types of instance
	// 		inProperties: [],  // properting incoming to instance
	// 		outProperties: [], // properties outgoing from instance
	// 		textFilter: "",    // text to be found in the Labels/AltLabels
	// 		id: [],            // exact IDs. might be useful while gathering properties 
	// 		limit: 100         // number of returned records
	// 	}
	
	//var callText = `http://localhost:59286/api/FindInstances?words=${faasIParams.textFilter}&instanceOf=${faasIParams.instanceOf.join('%20')}&inProp=${faasIParams.inProperties.join('%20AND%20')}&outProp=${faasIParams.outProperties.join('%20AND%20')}&limit=${faasIParams.limit}`
	var callText = `/FindInstances?` + new URLSearchParams({
		words:      faasIParams.textFilter || '',
		instanceOf: (faasIParams.instanceOf || []).join(' '),
		inProp:     (faasIParams.inProperties || []).join(' AND '),
		outProp:    (faasIParams.outProperties || []).join(' AND '),
        id:         (faasIParams.id || []).join(' '),
		limit:      faasIParams.limit || MAX_IND_ANSWERS
	});
    return await callFAAS(callText);
}

const callFAASGetProperty = async (id = []) => {
    // *** console.log("------------callFAASGetProperty ------------------");
	//var callText = `http://localhost:59286/api/GetProperty?id=${id.join('%20')}&limit=${id.length+1}`
	var callText = `/GetProperty?` + new URLSearchParams({
		id: id.join(' '),
		limit: id.length+1
	});
    return await callFAAS(callText);
}


const callFAASFindProperties = async (faasPParams) => {
    // *** console.log("------------callFAASFindProperties ------------------");
	//var callText = `http://localhost:59286/api/FindProperties?words=${faasPParams.textFilter}&domain=${faasPParams.domain.join('%20AND%20')}&range=${faasPParams.range.join('%20AND%20')}&id=${faasPParams.id.join('%20')}&limit=${faasPParams.limit}`
	var callText = `/FindProperties?` + new URLSearchParams({
		words:      faasPParams.textFilter || '',
		domain:     (faasPParams.domain || []).join(' AND '),
		range:      (faasPParams.range || []).join(' AND '),
		id:         (faasPParams.id || []).join(' '),
		limit:      faasPParams.limit || MAX_IND_ANSWERS
    });
    return await callFAAS(callText);
}


faas = {
    mapEntityToVQInstances : function(item) {
		// *** console.log("------------mapEntityToVQInstances ------------------");
        let label=item.label;
        let text=(label?`[${label} (${item.id})]`:item.id);
        return `wd:${text}`;
    },
    getProperties : async function (ids = []) {
		// *** console.log("------------getProperties ------------------");
        return await callFAASGetProperty(ids);
    },
	getIndividuals : async function(params = {}, vq_obj = null) {
		// *** console.log("------------getIndividuals ------------------");
		var rr;

		var allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined )
			allParams.element = findElementDataForIndividual(vq_obj);

		if ( allParams.element.className !== undefined || allParams.element.pList !== undefined ) {
			var faasParam = await this.convertAllParamsToFindInstancesParams(allParams);
			rr = await callFAASFindInstances(faasParam);
			//console.log(`rr=${JSON.stringify(rr)}`);
			if (rr.error != undefined)
				rr = []
		}
		else
			rr = [];
		
		// output text formated hopefully same way as other autocompletion data providers 
		return rr.map(mapEntityToVQInstances);
	},
    getIndividualProperties : async function(allParams = {}) {
		// *** console.log("------------getIndividualProperties ------------------");

        rez = {
            "complete":false,
            "data":[],
            "error":"DSS schema not found"
        };
        if (!allParams || !allParams.element)
            return rez;

		var faasIParam = await this.convertAllParamsToFindInstancesParams(allParams);
		var ins = await callFAASFindInstances(faasIParam);
        var ip =[], op=[];
        _.forEach(ins, function(e) {
            ip = ip.concat(e.reverseProperties.map(p=>p.id).filter((p) => ip.indexOf(p) < 0));
            op = ip.concat(e.properties.map(p=>p.id).filter((p) => ip.indexOf(p) < 0));
        });

        var faasPParam = {
            id:      ip.concat(op)
        }
		var prop = await callFAASFindProperties(faasPParam);
        //console.log(`prop=${JSON.stringify(prop)}`);

        rez.complete = true;
        rez.error = "";
        rez.data = prop.map(p => {
            let label=p.label;

            let text=(label?`[${label} (${p.id})]`:p.id);
            return {
                mark: (ip.includes(p.id)?"in":"out"),
                x_max_cardinality: -1,
                class_iri: null,
                prefix: "wdt",
                display_name: text,
                local_name: p.id
            }
        });

        return rez;
    },
	convertAllParamsToFindInstancesParams : async function(allParams = {}) {
		// *** console.log("------------convertAllParamsToFindInstancesParams ------------------");
		// expects "params" structure is 
		//	{
		// 		"main": { "limit": 100, "filter": "Karin" },
		// 		"element": {
		// 			"className": "[human (Q5)]",
		// 			"pList": {
		// 				"in": [{ "name": "[creator (P170)]", "t": "REQUIRED" }, {...}],
		// 				"out": [{ "name": "[occupation (P106)]", "t": "REQUIRED"}, {...}]
		// 			}
		// 		}
		//	}
		// expects "nsAllowed" to hold a list of namespaces the FAAS should look into. 
		// Example below is for Wikidata
		//	["wdt","wd", ...]
		//

		let rez = {
			instanceOf: [],                // types of instance
			inProperties: [],              // properting incoming to instance
			outProperties: [],             // properties outgoing from instance
			textFilter: "",                // text to be found in the Labels/AltLabels
            id: [],                        // exact IDs. might be useful while gathering properties 
			limit: MAX_IND_ANSWERS         // number of returned records
		}

		// uses "pList" properties (in or out) and "ALLOWED_NAMESPACES"
		async function findPropertyNames( prop = [] ) {
			let rez=[];
			for (let i=0; i<prop.length; i++) {
				let o = await dataShapes.resolvePropertyByName({name: prop[i].name});
				if (!o.data || !o.complete) continue;
				if (ALLOWED_NAMESPACES.includes(o.data[0].prefix) && o.data[0].local_name) {
					rez.push(o.data[0].local_name);
				}
			}
			return rez;
		}
		async function findClassNames( className = "") {
			let rez = [];
			if (!className) return rez;
			var cls = await dataShapes.resolveClassByName( {name: className  });
			if (!cls || !cls.data || !cls.data[0]) return rez;
			rez.push(cls.data[0].local_name);
			return rez;
		}
        async function findIndividualName( uriIndividual = "") {
			let rez = [];
			if (!uriIndividual) return rez;
            var ind = await dataShapes.resolveIndividualByName( {name: uriIndividual  });
			if (!ind || !ind.data || !ind.data[0]) return rez;
            rez.push(ind.data[0].name.split(':').pop());
			return rez;
        }

		console.log(`allParams=${JSON.stringify(allParams)}` );
        if (!allParams || !allParams.element || !allParams.element.className)
            return rez;

		if (allParams.element.className)
			rez.instanceOf = rez.instanceOf.concat(await findClassNames(allParams.element.className));
        if (allParams.element.uriIndividual)
            rez.id = rez.id.concat(await findIndividualName(allParams.element.uriIndividual));
		if (allParams.element.pList && allParams.element.pList.in)
			rez.inProperties = rez.inProperties.concat(await findPropertyNames(allParams.element.pList.in));
		if (allParams.element.pList && allParams.element.pList.out)
			rez.outProperties = rez.outProperties.concat(await findPropertyNames(allParams.element.pList.out));
		rez.textFilter = allParams.main.filter;
		rez.limit = allParams.main.limit;

		return rez;
	}
}