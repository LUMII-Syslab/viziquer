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
const MAX_IND_ANSWERS = 100;
// const MAX_TREE_ANSWERS = 30;
// const TREE_PLUS = 20;
// const BIG_CLASS_CNT = 500000;
// const LONG_ANSWER = 3000;
// const MakeLog = false;
// const ConsoleLog = false;
// ***********************************************************************************
const ALLOWED_NAMESPACES = ["wdt"];
// ***********************************************************************************

const callFAASGet = async (callText) => {
    // *** console.log("------------callFAAS ------------------");
    try {
        const faasServerUrl = await getFaasServerUrl();
        const url = faasServerUrl+callText;
        //console.log(`url=${url}`);

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

const callFAASPost = async (callText, data) => {
    // *** console.log("------------callFAAS ------------------");
    try {
        const faasServerUrl = await getFaasServerUrl();
        const url = faasServerUrl+callText;
        //console.log(`url=${url}`);

		const response = await window.fetch(url, {
			method: 'POST',
			// mode: 'no-cors',
			cache: 'no-cache',
            content: "application/json",
            body: JSON.stringify(data)
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
	
    var arrlimit=500;
	//var callText = `http://localhost:59286/api/FindInstances?words=${faasIParams.textFilter}&instanceOf=${faasIParams.instanceOf.join('%20')}&inProp=${faasIParams.inProperties.join('%20AND%20')}&outProp=${faasIParams.outProperties.join('%20AND%20')}&limit=${faasIParams.limit}`
	var callText = `/FindInstances?` + new URLSearchParams({
		words:      faasIParams.textFilter || '',
		instanceOf: (faasIParams.instanceOf || []).slice(0,arrlimit).join(' '),
		inProp:     (faasIParams.inProperties || []).slice(0,arrlimit).join(' AND '),
		outProp:    (faasIParams.outProperties || []).slice(0,arrlimit).join(' AND '),
        id:         (faasIParams.id || []).slice(0,arrlimit).join(' '),
		limit:      faasIParams.limit || MAX_IND_ANSWERS,
        dummy: false
	});
    return await callFAASGet(callText);
}

const callFAASGetProperty = async (id = []) => {
    // *** console.log("------------callFAASGetProperty ------------------");
	//var callText = `http://localhost:59286/api/GetProperty?id=${id.join('%20')}&limit=${id.length+1}`
	var callText = `/GetProperty?` + new URLSearchParams({
		id: id.join(' '),
		limit: id.length+1
	});
    return await callFAASGet(callText);
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
    return await callFAASGet(callText);
}


faas = {
    fnDisplayName : function(id, label) {
        return (label?`[${label} (${id})]`:id)
    },
    mapEntityToVQInstances : function(item) {
        return `wd:${faas.fnDisplayName(item.id, item.label)}`;
    },
    mapEntityToVQClasses : function(item) {
        return {
            prefix: "wd",
            local_name: item.id,
            display_name: faas.fnDisplayName(item.id, item.label),
            is_local: true,
            principal_class: 1
        }
    },
    getClassesByProperties : async function(allParams = {}) {
		// *** console.log("------------mapEntityToVQInstances ------------------");
        var faasParam = await this.convertAllParamsToFindInstancesParams(allParams);
        // at this moment is not improtant would it be in or out property
        var prop = await callFAASFindProperties({id : faasParam.inProperties.concat(faasParam.outProperties)})

        console.log(`prop=${JSON.stringify(prop)}`)
        var instIds = [];
        if (faasParam.inProperties.length > 0) {
            prop.map(p=>p.domain).forEach(arr => { arr.forEach(ele => { instIds.push(ele); })})
        } else {
            prop.map(p=>p.range).forEach(arr => { arr.forEach(ele => { instIds.push(ele); })})
        }
        console.log(`instIds=${JSON.stringify(instIds)}`)
        // only unique class IDs
        instIds = instIds.filter((i,p) => instIds.indexOf(i) == p).map(i => { return `Q${i}` } );
        console.log(`instIds fo;ter=${JSON.stringify(instIds)}`)

        var faasIParam = {
            words: "",
            id: instIds
        }
        var inst = await callFAASFindInstances(faasIParam);
        return {
            data: inst.map(faas.mapEntityToVQClasses)
        }
    },
    getProperties : async function (ids = []) {
		// *** console.log("------------getProperties ------------------");
        return await callFAASGetProperty(ids);
    },
	getIndividuals : async function(allParams = {}) {
		// *** console.log("------------getIndividuals ------------------");
		var rr;
        var faasParam = await this.convertAllParamsToFindInstancesParams(allParams);
        rr = await callFAASFindInstances(faasParam);
        //console.log(`rr=${JSON.stringify(rr)}`);
        if (rr.error != undefined)
            rr = [];
		
		// output text formated hopefully same way as other autocompletion data providers 
		return rr.map(this.mapEntityToVQInstances);
	},
    getIndividualProperties : async function(allParams = {}) {
		// *** console.log("------------getIndividualProperties ------------------");

        // output result template
        rez = {
            "complete":false,
            "data":[],
            "error":"DSS schema not found"
        };
        if (!allParams || !allParams.element)
            return rez;

		var faasIParam = await this.convertAllParamsToFindInstancesParams(allParams);
        faasIParam.limit = MAX_IND_ANSWERS * 100; // get x10 more instances to retrieve more properties of different instances
		var ins = await callFAASFindInstances(faasIParam);
        var ip =[], op=[];
        // get unique list of properties both for `incoming` and `outgoing` properties
        _.forEach(ins, function(e) {
            ip = ip.concat(e.reverseProperties.map(p=>p.id).filter((p) => ip.indexOf(p) < 0));
            op = op.concat(e.properties.map(p=>p.id).filter((p) => op.indexOf(p) < 0));
        });

        // build joint list of all property IDs and find property data. Duplicates here are ok. Lucene query will return just 1 instance per ID
        var faasPParam = {
            id:      ip.concat(op)
        }
		var prop = await callFAASFindProperties(faasPParam);
        //console.log(`prop=${JSON.stringify(prop)}`);
        
        // function to build in/out properties for Viziquer
        // both in and out properties might contain the same property.
        function buildPropArray(faasPropsId = [], faasPropsArr = [], mark = "") {
            // buildPropArray(["P1"],[{id:"P1",label="test"}],"in")
            // buildPropArray(["P1"],[{id:"P1",label="test"}],"out")
            return faasPropsId.map(pid => {
                let s = faasPropsArr.find(x => x.id == pid); 
                if (!s) return {};
    
                let label=s.label;
                let text=(label?`[${label} (${pid})]`:pid);
                return {
                    mark: mark,
                    x_max_cardinality: -1,
                    class_iri: null,
                    prefix: "wdt",
                    display_name: text,
                    local_name: pid
                }
            });
        }

        // results
        rez.complete = true;
        rez.error = "";
        rez.data = buildPropArray(ip, prop, "in").concat(buildPropArray(op, prop, "out"));

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

		//console.log(`allParams=${JSON.stringify(allParams)}` );
        if (!allParams || !allParams.element)
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