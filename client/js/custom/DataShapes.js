// ***********************************************************************************
const SCHEMA_SERVER_URL = 'http://localhost:3344/api';
const MAX_ANSWERS = 30;
const MAX_TREE_ANSWERS = 30;
const TREE_PLUS = 0;
// ***********************************************************************************
const callWithPost = async (funcName, data = {}) => {
	try {
		const response = await window.fetch(`${SCHEMA_SERVER_URL}/${funcName}`, {
			method: 'POST',
			mode: 'cors',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});
		//console.log(response)
		return await response.json();
	}
	catch(err) {
		console.log("-------error-----------")
		return {complete: false, data: [], error: err};  
    }	
}

const callWithGet = async (funcName) => {
	try {
		const response = await window.fetch(`${SCHEMA_SERVER_URL}/${funcName}`, {
			method: 'GET',
			mode: 'cors',
			cache: 'no-cache'
		});
		// console.log(response)
		return await response.json();
	}
	catch(err) {
        console.error(err)
		return {};  
    }
}

// ***********************************************************************************
const getPList = (vq_obj) => {
	var pList = {in: [], out: []};
	var field_list = vq_obj.getFields().map(function(f) { return {name:f.exp, type: 'out'}});
	if (field_list.length > 0) pList.out = field_list;

	var link_list =  vq_obj.getLinks();
	var link_list_filtered = link_list.map( function(l) { var type = (l.start ? 'in': 'out'); return {name:l.link.getName(), type: type}});
	_.each(link_list_filtered, function(link) {
		if (link.type === 'in' && link.name !== null && link.name !== undefined )
				pList.in.push(link);
		if (link.type === 'out' && link.name !== null && link.name !== undefined ) 
			pList.out.push(link);
	});
	
	return pList;
}

const findElementDataForClass = (vq_obj) => {
	var params = {}
	var individual =  vq_obj.getInstanceAlias();
	if (individual !== null && individual !== undefined) 
		params.uriIndividual = individual;
	
	var pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	return params;
}

const findElementDataForProperty = (vq_obj) => {
	var params = {};
	var individual =  vq_obj.getInstanceAlias();
	var class_name = vq_obj.getName();
	if (individual !== null && individual !== undefined) 
		params.uriIndividual = individual;
	if (class_name !== null && class_name !== undefined) 
		params.className = class_name;
	
	var pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	return params;
}

const findElementDataForIndividual = (vq_obj) => {
	var params = {};
	var class_name = vq_obj.getName();
	if (class_name !== null && class_name !== undefined) 
		params.className = class_name;
	
	var pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	return params;
}

// ***********************************************************************************
dataShapes = {
	schema : { resolvedClasses: {}, resolvedProperties: {}, resolvedClassesF: {}, resolvedPropertiesF: {}, 
			   treeTopsC: {}, treeTopsP: {}, showPrefixes: "false", limit: MAX_ANSWERS,
			   tree:{countC:MAX_TREE_ANSWERS, countP:MAX_TREE_ANSWERS, plus:TREE_PLUS, dbo: true, yago: false, dbp: true, filterC: '', filterP: '', 
					 pKind: 'All properties', topClass: 0, classPath: []}},
	getOntologies : async function() {
		//dataShapes.getOntologies()
		var rr = await callWithGet('info/');
		rr.unshift({name:""});
		console.log(rr)
		return await rr;		
	},
	changeActiveProject : async function(proj_id) {
		var proj = Projects.findOne({_id: proj_id});
		console.log(proj)
		this.schema = { resolvedClasses: {}, resolvedProperties: {}, resolvedClassesF: {}, resolvedPropertiesF: {}, 
						treeTopsC: {}, treeTopsP: {}, showPrefixes: "false", limit: MAX_ANSWERS, 
						tree:{countC:MAX_TREE_ANSWERS, countP:MAX_TREE_ANSWERS, plus:TREE_PLUS, dbo: true, yago: false, dbp: true, filterC: '', filterP: '', 
					          pKind: 'All properties', topClass: 0, classPath: []}};
		if (proj !== undefined) {
			if ( proj.schema !== undefined && proj.schema !== "") {
				this.schema.schema =  proj.schema;
				this.schema.showPrefixes = proj.showPrefixesForAllNames;
				//this.schema.ontologies = {};
				//this.schema.endpoint =  proj.endpoint;   // "https://dbpedia.org/sparql"
				//this.schema.limit = MAX_ANSWERS;
				//var list = {projectId: proj_id, set:{ filters:{list:ont_list}}};
				//Utilities.callMeteorMethod("updateProject", list);
				//this.schema.ontologies.list = ont_list;
			}
		}
	},
	callServerFunction : async function(funcName, params) {
		this.schema.schema = 'DBpedia'; // ----- !!! ( for development ) - remove !!! -----
		var s = this.schema.schema;
		console.log(params)
		var rr = {complete: false, data: [], error: "DSS parameter not found"};
		if (s !== "" && s !== undefined )
		{		
			params.main.endpointUrl = this.schema.endpoint;
			if ( params.main.limit === undefined )
				params.main.limit = this.schema.limit;
				
			rr = await callWithPost(`ontologies/${s}/${funcName}`, params);
		}
		console.log(rr)
		return await rr;
	},
	getNamespaces : async function(params = {}) {
		console.log("------------getNamespaces ------------------")
		//dataShapes.getNamespaces()
		return await this.callServerFunction("getNamespaces", {main:params});
	},
	getClasses : async function(params = {}, vq_obj = null) {
		console.log("------------GetClasses------------------")
		// dataShapes.getClasses()
		// dataShapes.getClasses({limit: 30}) 
		// dataShapes.getClasses({filter:'aa'})
		// dataShapes.getClasses({namespaces: { in: ['dbo','foaf'], notIn: ['yago']}})
		// dataShapes.getClasses({}, new VQ_Element(Session.get("activeElement")))
		// ***  dataShapes.getClasses({element: {uriIndividual: 'http://dbpedia.org/resource/Tivoli_Friheden'}})
		// ***  dataShapes.getClasses({element: {uriIndividual: 'http://dbpedia.org/resource/Tivoli_Friheden'} })  -- visas ir yago klases
		// ***  dataShapes.getClasses({element: { pList: { out: [{name: 'educationalAuthority', type: 'out'}]}}})
		// ***  dataShapes.getClasses({main:{ onlyPropsInSchema: true}, element: { pList: {in: [{name: 'super', type: 'in'}]}}})  23
		// ***  dataShapes.getClasses({main:{ onlyPropsInSchema: true}, element:{ pList: {in: [{name: 'super', type: 'in'}, {name: 'dbo:president', type: 'in'}], out: [{name: 'dbo:birthDate', type: 'out'}]}}}) 20
		// ***  dataShapes.getClasses({main: {onlyPropsInSchema: true}, element:{pList: {in: [{name: 'formerCallsigns', type: 'in'}], out: [{name: 'dbo:birthDate', type: 'out'}]}}}) 58
		var allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined ) {
			allParams.element = findElementDataForClass(vq_obj);
			allParams.main.orderByPrefix = `case when v.is_local = true then 0 else 1 end,`;
		}
		return await this.callServerFunction("getClasses", allParams);
	},
	getTreeClasses : async function(params) {
		console.log("------------GetTreeClasses------------------")
		console.log(params)
		function makeTreeName(params) {
			var nList = [];
			if ( params.main.namespaces !== undefined) {
				if ( params.main.namespaces.in !== undefined )
					nList.push(params.main.namespaces.in.join('_'));
				if ( params.main.namespaces.notIn !== undefined )
					nList.push(params.main.namespaces.notIn.join('_'));
			}
			nList.push(params.main.limit);
			return nList.join('_');
		}
		var rr;
		if ( params.main.treeMode === 'Top' && ( params.main.filter === undefined || params.main.filter === '' )) {
			var nsString = makeTreeName(params);
			//console.log(`in_${params.namespaces.in.join('_')}_notIn_${params.namespaces.notIn.join('_')}`)
			if (this.schema.treeTopsC[nsString] !== undefined) {
				rr = this.schema.treeTopsC[nsString];
			}
			else {
				rr =  await this.callServerFunction("getTreeClasses", params);
				this.schema.treeTopsC[nsString] = rr;
			}
		}
		else
			rr =  await this.callServerFunction("getTreeClasses", params);
			
		return rr;
	},
	getProperties : async function(params = {}, vq_obj = null, vq_obj_2 = null) {		
		console.log("------------GetProperties------------------")
		//dataShapes.getProperties({propertyKind:'Data'})  -- Data, Object, All (Data + Object), ObjectExt (in/out object properties), Connect
		//dataShapes.getProperties({propertyKind:'Object'})
		//dataShapes.getProperties({propertyKind:'Object', namespaces: { notIn: ['dbp']}})
		//dataShapes.getProperties({propertyKind:'Object', filter: 'aa'})
		//dataShapes.getProperties({propertyKind:'Object', namespaces: { notIn: ['dbp']}})
		//dataShapes.getProperties({propertyKind:'Object', namespaces: { notIn: ['dbp']}}, new VQ_Element(Session.get("activeElement")))
		// *** dataShapes.getProperties({main: {propertyKind:'Object'}, element:{className: 'umbel-rc:Park'}})
		// *** dataShapes.getProperties({main: {propertyKind:'Data'}, element: {className: 'umbel-rc:Park'}})
		// *** dataShapes.getProperties({main: {propertyKind:'Connect'}, element: {className: 'umbel-rc:Park'}, elementOE: {className: 'umbel-rc:Philosopher'}}) 
		// *** dataShapes.getProperties({main:{propertyKind:'All'}, element:{className: 'umbel-rc:Philosopher'}})
		// *** dataShapes.getProperties({main:{propertyKind:'ObjectExt'}, elemet:{uriIndividual: "http://dbpedia.org/resource/Gulliver's_World"}})
		// *** dataShapes.getProperties({main:{propertyKind:'Connect'}, elemet: { riIndividual: "http://dbpedia.org/resource/Gulliver's_World"}, elementOE: {uriIndividual: "http://en.wikipedia.org/wiki/Gulliver's_World"}})
		// *** dataShapes.getProperties({main:{propertyKind:'ObjectExt'}, element:{uriIndividual: "http://en.wikipedia.org/wiki/Gulliver's_World"}})
		// *** dataShapes.getProperties({main:{propertyKind:'Object'}, element:{className: 'dbo:Tenure'}})
		// *** dataShapes.getProperties({main:{propertyKind:'ObjectExt'}, element: { className:'umbel-rc:Crater'}})
		// *** dataShapes.getProperties({main:{propertyKind:'Connect'}, element:{className: 'CareerStation'}, elementOE:{otherEndClassName:'umbel-rc:Crater'}})
		// *** dataShapes.getProperties({main:{propertyKind:'All', orderByPrefix: 'case when ns_id = 2 then 0 else 1 end desc,'}, element:{className: 'CareerStation'}})
		var allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined )
			allParams.element = findElementDataForProperty(vq_obj);
		if ( vq_obj_2 !== null && vq_obj_2 !== undefined )
			allParams.elementOE = findElementDataForProperty(vq_obj_2);
		return await this.callServerFunction("getProperties", allParams);
	},
	getTreeProperties : async function(params) {
		function makeTreeName(params) {
			var nList = [];
			nList.push(params.propertyKind);
			if ( params.orderByPrefix !== undefined && params.orderByPrefix !== undefined )
				nList.push('Basic');
			else
				nList.push('Full');
			nList.push(params.limit);
			return nList.join('_');
		}
		var rr;
		if ( params.filter === undefined || params.filter === '' ) {
			var tName = makeTreeName(params);
			if (this.schema.treeTopsP[tName] !== undefined) {
				rr = this.schema.treeTopsP[tName];
			}
			else {
				rr =  await this.getProperties(params);
				this.schema.treeTopsP[tName] = rr;
			}
		}
		else
			rr =  await this.getProperties(params);

		return rr;
	},
	getIndividuals : async function(params = {}, vq_obj = null) {
		console.log("------------getIndividuals ------------------")
		//dataShapes.getIndividuals({filter:'Julia'}, new VQ_Element(Session.get("activeElement")))
		var rr;
		var allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined ) 
			allParams.element = findElementDataForIndividual(vq_obj);
			
		//console.log(allParams)
		if ( allParams.element.className !== undefined || allParams.element.pList !== undefined )
			rr = await this.callServerFunction("getIndividuals", allParams);
		else
			rr = { complete:false, data: []}; 
		return rr;
	},
	resolveClassByName : async function(params = {}) {	
		console.log("------------resolveClassByName---"+ params.name +"---------------")
		//dataShapes.resolveClassByName({name: 'umbel-rc:Park'})
		var rr;
		if (this.schema.resolvedClasses[params.name] !== undefined || this.schema.resolvedClassesF[params.name] !== undefined) {
			if (this.schema.resolvedClasses[params.name] !== undefined) 
				rr = { complete:true, data: [this.schema.resolvedClasses[params.name]]};
			if (this.schema.resolvedClassesF[params.name] !== undefined) 
				rr = { complete:false, data: []};
			console.log(rr)
		}
		else {
			rr = await this.callServerFunction("resolveClassByName", {main: params});
			if ( rr.complete )
				this.schema.resolvedClasses[params.name] = rr.data[0];
			else
				this.schema.resolvedClassesF[params.name] = 1;
		}
		return rr;
	},
	resolvePropertyByName : async function(params = {}) {	
		console.log("------------resolvePropertyByName---"+ params.name +"---------------")
		//dataShapes.resolvePropertyByName({name: 'dbo:president'})
		var rr;
		if (this.schema.resolvedProperties[params.name] !== undefined || this.schema.resolvedPropertiesF[params.name] !== undefined) {
			if (this.schema.resolvedProperties[params.name] !== undefined)
				rr = { complete:true, data: [this.schema.resolvedProperties[params.name]]};
			if (this.schema.resolvedPropertiesF[params.name] !== undefined)
				rr = { complete:false, data: []};
			console.log(rr)
		}
		else {
			rr = await this.callServerFunction("resolvePropertyByName", {main: params});
			if ( rr.complete )
				this.schema.resolvedProperties[params.name] = rr.data[0];
			else
				this.schema.resolvedPropertiesF[params.name] = 1;
		}
		return rr;
	},
};

// ***********************************************************************************
