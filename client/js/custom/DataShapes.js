// ***********************************************************************************
// const SCHEMA_SERVER_URL = 'http://localhost:3344/api';
let _schemaServerUrl = null;
const getSchemaServerUrl = async () => new Promise((resolve, reject) => {
    //if (_schemaServerUrl) return _schemaServerUrl;
    Meteor.call('getEnvVariable', 'SCHEMA_SERVER_URL', (error, result) => {
        if (error) {
            return reject(error);
        }
        _schemaServerUrl = result;
        return resolve(result);
    })
});
// ***********************************************************************************
const MAX_ANSWERS = 30;
const MAX_IND_ANSWERS = 100;
const MAX_TREE_ANSWERS = 30;
const TREE_PLUS = 20;
const BIG_CLASS_CNT = 500000;
// ***********************************************************************************
const callWithPost = async (funcName, data = {}) => {
	try {
        const schemaServerUrl = await getSchemaServerUrl();
		const response = await window.fetch(`${schemaServerUrl}/${funcName}`, {
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
        const schemaServerUrl = await getSchemaServerUrl();
		const response = await window.fetch(`${schemaServerUrl}/${funcName}`, {
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
	var field_list = vq_obj.getFields().filter(function(f){ return f.requireValues }).map(function(f) { return {name:f.exp, type: 'out'}});
	if (field_list.length > 0) pList.out = field_list;

	var link_list =  vq_obj.getLinks();

	var link_list_filtered = link_list.map( function(l) { var type = (l.start ? 'in': 'out'); return {name:l.link.getName(), t:l.link.getType(), type: type, eE:l.link.obj.endElement, sE:l.link.obj.startElement}});
	_.each(link_list_filtered, function(link) {
		if (link.type === 'in' && link.name !== null && link.name !== undefined ) {
			if ( link.t === 'REQUIRED' ) {
				pList.in.push(link);
			}
			else {
				if (!vq_obj.isRoot()) {
					var sE = new VQ_Element(link.sE);
					if (sE.isRoot())
						pList.in.push(link);
				}
			}
		}

		if (link.type === 'out' && link.name !== null && link.name !== undefined ) {
			if ( link.t === 'REQUIRED' ) {
				pList.out.push(link);
			}
			else {
				if (!vq_obj.isRoot()) {
					var eE = new VQ_Element(link.eE);
					if (eE.isRoot())
						pList.out.push(link);
				}
			}
		}
	});
	return pList;
}

// string -> int
// function checks if the text is uri
// 0 - not URI, 3 - full form, 4 - short form
function isURI(text) {
  if(text.indexOf("://") != -1)
    return 3;
  else
    if(text.indexOf(":") != -1) return 4;
  return 0;
};

const findElementDataForClass = (vq_obj) => {
	var params = {}
	var individual =  vq_obj.getInstanceAlias();
	if (individual !== null && individual !== undefined && isURI(individual) != 0) 
		params.uriIndividual = individual;

	var pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	return params;
}

const findElementDataForProperty = (vq_obj) => {
	var params = {};
	var individual =  vq_obj.getInstanceAlias();
	var class_name = vq_obj.getName();
	if (individual !== null && individual !== undefined && isURI(individual) != 0)
		params.uriIndividual = individual;
	if (class_name !== null && class_name !== undefined)
		params.className = class_name;

	var pList = {in: [], out: []};	
	//if (dataShapes.schema.use_pp_rels) 
	pList = getPList(vq_obj);
	
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

const classes = [
'All classes',
'dbo:Person', 
'dbo:Place', 
'dbo:Location', 
'dbo:Work', 
'dbo:Settlement', 
'dbo:Athlete', 
'dbo:Organisation', 
'dbo:MusicalWork', 
'dbo:Species', 
'dbo:Politician', 
'dbo:Film', 
'dbo:Animal', 
'dbo:Event', 
'dbo:Agent', 
'dbo:TimePeriod', 
'owl:Thing', 
'foaf:Document', 
'skos:Concept'
];

const getEmptySchema  = () => {
return {
		empty: true,
		resolvedClasses: {}, 
		resolvedProperties: {}, 
		resolvedClassesF: {}, 
		resolvedPropertiesF: {},
		treeTopsC: {}, 
		treeTopsP: {}, 
		localNS: "",
		namespaces: [],
		showPrefixes: "false", 
		limit: MAX_ANSWERS,
		big_class_cnt: BIG_CLASS_CNT,
		use_pp_rels: false,
		hide_individuals: false, 
		tree: {
			countC:MAX_TREE_ANSWERS, 
			countP:MAX_TREE_ANSWERS, 
			countI:MAX_IND_ANSWERS, 
			plus:TREE_PLUS,
			nsInclude: true,
			dbo: true, 
			yago: false, 
			local: false, 
			dbp: true, 
			filterC: '', 
			filterP: '', 
			filterI: '',
			pKind: 'All properties', 
			topClass: 0, 
			classPath: [],
			class: '',
			classes: [],
		}
	}
}

// ***********************************************************************************
dataShapes = {
	schema : getEmptySchema(),
	getOntologies : async function() {
		//dataShapes.getOntologies()
		var rr = await callWithGet('info/');
		rr.unshift({name:""});
		// *** console.log(rr)
		return await rr;
	},
	changeActiveProject : async function(proj_id) {
		//console.log('------changeActiveProject-------')
		var proj = Projects.findOne({_id: proj_id});
		this.schema = getEmptySchema();
		if (proj !== undefined) {
			if ( proj.schema !== undefined && proj.schema !== "") {
				this.schema.schemaName =  proj.schema;
				this.schema.showPrefixes = proj.showPrefixesForAllNames.toString();
				this.schema.empty = false;
				this.schema.endpoint =  proj.endpoint;
				if ( proj.uri != undefined && proj.uri !== '' )
					this.schema.endpoint = `${proj.endpoint}?default-graph-uri=${proj.uri}`; 
				
				var info = await callWithGet('info/');
				var schema_info = info.filter(function(o){ return o.name == proj.schema})[0];
				this.schema.schema = schema_info.schema;
				this.schema.use_pp_rels = schema_info.use_pp_rels;
				this.schema.hide_individuals = schema_info.hide_individuals;
				
				var ns = await this.getNamespaces();
				this.schema.namespaces = ns;
				var local_ns = ns.filter(function(n){ return n.is_local == true});
				if ( local_ns.length > 0 )
					this.schema.localNS = local_ns[0].name;

				if (schema_info.tree_profile === 'DBpedia') {
					this.schema.tree.class = 'All classes';
					this.schema.tree.classes = classes;
				}
				else if (schema_info.tree_profile === 'DBpediaL') {
					this.schema.tree.dbo = false;
				}
				else if (schema_info.tree_profile === 'BasicL') {
					this.schema.tree.nsInclude = false;
					this.schema.tree.dbo = false;
					this.schema.tree.local = true;
				}
				else  {
					this.schema.tree.nsInclude = false;
					this.schema.tree.dbo = false;
				}
				if (schema_info.tree_profile !== 'DBpedia' && !this.schema.hide_individuals) {
					var clFull = await dataShapes.getTreeClasses({main:{treeMode: 'Top', limit: MAX_TREE_ANSWERS}});
					var c_list = clFull.data.map(v => `${v.prefix}:${v.display_name}`)
					this.schema.tree.class = c_list[0];
					this.schema.tree.classes = c_list;
				}
			}
		}
	},
	callServerFunction : async function(funcName, params) {
		console.log("---------callServerFunction--------------" + funcName)
		console.log(params)

		//console.log(Projects.findOne({_id: Session.get("activeProject")}));
		startTime = Date.now();
		var s = this.schema.schema;
		if (s === "" || s === undefined ) {
			//console.log(Session.get("activeProject"))
			await this.changeActiveProject(Session.get("activeProject"));
			s = this.schema.schema;
		}
		
		//*if (s === "" || s === undefined ) {
		//*	console.log("--------Tomēr tukšs-------------")
		//*	this.schema.schema = 'DBpedia'; // ----- !!! ( for development ) - remove !!! -----
		//*	this.schema.showPrefixes = "true"; // ----- !!! ( for development ) - remove !!! -----
		//*	s = 'DBpedia';
		//*}
		
		// *** console.log(params)
		var rr = {complete: false, data: [], error: "DSS schema not found"};
		if (s !== "" && s !== undefined )
		{
			params.main.endpointUrl = this.schema.endpoint;
			params.main.use_pp_rels = this.schema.use_pp_rels;
			if ( params.main.limit === undefined )
				params.main.limit = this.schema.limit;

			rr = await callWithPost(`ontologies/${s}/${funcName}`, params);
		}
		else
			Interpreter.showErrorMsg("Project DSS parameter not found !");
		
		if ( rr.data ) 
			console.log(rr)
		console.log(Date.now() - startTime)
		return rr;
	},
	getNamespaces : async function(params = {}) {
		// *** console.log("------------getNamespaces ------------------")
		//dataShapes.getNamespaces()
		if ( this.schema.namespaces.length > 0)
			return this.schema.namespaces;
		else {
			var rr = await this.callServerFunction("getNamespaces", {main:params});
			this.schema.namespaces = rr;
			return rr;
		}
	},
	getClasses : async function(params = {}, vq_obj = null) {
		// *** console.log("------------GetClasses------------------")
		// dataShapes.getClasses()
		// dataShapes.getClasses({limit: 30})
		// dataShapes.getClasses({filter:'aa'})
		// dataShapes.getClasses({namespaces: { in: ['dbo','foaf'], notIn: ['yago']}})
		// dataShapes.getClasses({}, new VQ_Element(Session.get("activeElement")))
		var allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined ) {
			allParams.element = findElementDataForClass(vq_obj);
			//allParams.main.orderByPrefix = `case when v.is_local = true then 0 else 1 end,`;
		}
		return await this.callServerFunction("getClasses", allParams);
	},
	getClassesFull : async function(params = {}) {
		// *** console.log("------------GetClasses------------------")
		// ***  dataShapes.getClassesFull({main:{}, element: {uriIndividual: 'http://dbpedia.org/resource/Tivoli_Friheden'}})
		// ***  dataShapes.getClassesFull({{main:{},element: {uriIndividual: 'http://dbpedia.org/resource/Tivoli_Friheden'} })  -- visas ir yago klases
		// ***  dataShapes.getClassesFull({{main:{},element: { pList: { out: [{name: 'educationalAuthority', type: 'out'}]}}})
		// ***  dataShapes.getClassesFull({main:{ onlyPropsInSchema: true}, element: { pList: {in: [{name: 'super', type: 'in'}]}}})  23
		// ***  dataShapes.getClassesFull({main:{ onlyPropsInSchema: true}, element:{ pList: {in: [{name: 'super', type: 'in'}, {name: 'dbo:president', type: 'in'}], out: [{name: 'dbo:birthDate', type: 'out'}]}}}) 20
		// ***  dataShapes.getClassesFull({main: {onlyPropsInSchema: true}, element:{pList: {in: [{name: 'formerCallsigns', type: 'in'}], out: [{name: 'dbo:birthDate', type: 'out'}]}}}) 58

		return await this.callServerFunction("getClasses", params);
	},
	getTreeClasses : async function(params) {
		// *** console.log("------------GetTreeClasses------------------")
		// *** console.log(params)
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
		// *** console.log("------------GetProperties------------------")
		//dataShapes.getProperties({propertyKind:'Data'})  -- Data, Object, All (Data + Object), ObjectExt (in/out object properties), Connect
		//dataShapes.getProperties({propertyKind:'Object'})
		//dataShapes.getProperties({propertyKind:'Object', namespaces: { notIn: ['dbp']}})
		//dataShapes.getProperties({propertyKind:'Object', filter: 'aa'})
		//dataShapes.getProperties({propertyKind:'Object', namespaces: { notIn: ['dbp']}})
		//dataShapes.getProperties({propertyKind:'Object', namespaces: { notIn: ['dbp']}}, new VQ_Element(Session.get("activeElement")))
		var allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined )
			allParams.element = findElementDataForProperty(vq_obj);
		if ( vq_obj_2 !== null && vq_obj_2 !== undefined )
			allParams.elementOE = findElementDataForProperty(vq_obj_2);
		return await this.callServerFunction("getProperties", allParams);
	},
	getPropertiesFull : async function(params = {}) {
		// *** console.log("------------GetProperties------------------")
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
		
		return await this.callServerFunction("getProperties", params);
	},
	checkProperty : async function(params = {}) {
		// *** console.log("------------checkProperty-----------------")
		// *** dataShapes.checkProperty ({name:'onyx:EmotionSet', propertyName: 'onyx:hasEmotion'})
		// *** dataShapes.checkProperty ({name:'http://dbpedia.org/ontology/Country', propertyName: 'http://dbpedia.org/ontology/abstract'})
		// *** dataShapes.checkProperty ({name:'http://dbpedia.org/ontology/Country', propertyName: 'http://dbpedia.org/ontology/birthPlace'})
		return await this.callServerFunction("checkProperty", {main:params});
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
		// *** console.log("------------getIndividuals ------------------")
		//dataShapes.getIndividuals({filter:'Julia'}, new VQ_Element(Session.get("activeElement")))
		var rr;
		var allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined )
			allParams.element = findElementDataForIndividual(vq_obj);

		//console.log(allParams)
		if ( allParams.element.className !== undefined || allParams.element.pList !== undefined ) {
			rr = await this.callServerFunction("getIndividuals", allParams);
			if (rr.error != undefined)
				rr = []
		}
		else
			rr = [];
			
		return rr;
	},
	getTreeIndividuals : async function(params = {}, className) {
		// *** console.log("------------getTreeIndividuals ------------------")
		//dataShapes.getIndividuals({filter:'Julia'}, new VQ_Element(Session.get("activeElement")))
		var rr = [];
		var allParams = {main: params, element:{className: className}};
		
		if ( className !== '')
			rr = await this.callServerFunction("getTreeIndividuals", allParams);
		
		if (rr.error != undefined)
			rr = [];
			
		return rr;
	},
	resolveClassByName : async function(params = {}) {
		// *** console.log("------------resolveClassByName---"+ params.name +"---------------")
		//dataShapes.resolveClassByName({name: 'umbel-rc:Park'})
		//dataShapes.resolveClassByName({name: 'http://dbpedia.org/ontology/Year'})
		//dataShapes.resolveClassByName({name: 'foaf:Document'})
		
		var rr;
		if (this.schema.resolvedClasses[params.name] !== undefined || this.schema.resolvedClassesF[params.name] !== undefined) {
			if (this.schema.resolvedClasses[params.name] !== undefined)
				rr = { complete:true, data: [this.schema.resolvedClasses[params.name]]};
			if (this.schema.resolvedClassesF[params.name] !== undefined)
				rr = { complete:false, data: []};
			// *** console.log(rr)
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
		// *** console.log("------------resolvePropertyByName---"+ params.name +"---------------")
		//dataShapes.resolvePropertyByName({name: 'dbo:president'})
		//dataShapes.resolvePropertyByName({name: 'http://dbpedia.org/ontology/years'})
		var rr;
		if (this.schema.resolvedProperties[params.name] !== undefined || this.schema.resolvedPropertiesF[params.name] !== undefined) {
			if (this.schema.resolvedProperties[params.name] !== undefined)
				rr = { complete:true, data: [this.schema.resolvedProperties[params.name]]};
			if (this.schema.resolvedPropertiesF[params.name] !== undefined)
				rr = { complete:false, data: []};
			// *** console.log(rr)
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
