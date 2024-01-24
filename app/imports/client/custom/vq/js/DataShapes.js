import { Projects, Compartments, CompartmentTypes } from '/imports/db/platform/collections'
import { faas } from '/imports/client/custom/vq/js/faas.js'
import { VQ_Element } from './VQ_Element';

// ***********************************************************************************
// const SCHEMA_SERVER_URL = 'http://localhost:3344/api';
//let _schemaServerUrl = null;
const getSchemaServerUrl = async () => new Promise((resolve, reject) => {
    //if (_schemaServerUrl) return _schemaServerUrl; // TODO šī saglabašana nezin kāpēc nestrādāja
    Meteor.call('getEnvVariable', 'SCHEMA_SERVER_URL', (error, result) => {
        if (error) {
            return reject(error);
        }
        //_schemaServerUrl = result;
        return resolve(result);
    })
});
// ***********************************************************************************
const MAX_ANSWERS = 30;
const MAX_IND_ANSWERS = 100;
const MAX_TREE_ANSWERS = 30;
const TREE_PLUS = 20;
const BIG_CLASS_CNT = 500000;
const DIAGRAM_CLASS_LIMIT = 1000;
const LONG_ANSWER = 3000;
const MakeLog = false;
const ConsoleLog = false;
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
//'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Q633795&language=en&limit=50&format=json&origin=*'
const callWithGetWD = async (filter, limit) => {
	const callText = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${filter}&language=en&limit=${limit}&format=json&origin=*`;
	try {
		const response = await window.fetch(callText, {
			method: 'GET',
			// mode: 'no-cors',
			cache: 'no-cache'
		});
		//console.log(response);
		if (!response.ok) {
			console.log('neveiksmīgs wd izsaukums');
			return {};
		}
		return await response.json();
	}
	catch(err) {
        console.error(err)
		return {};
    }
}
// ***********************************************************************************
// string -> int
// function checks if the text is uri
// 0 - not URI, 3 - full form, 4 - short form
function isURI(text) {
  if(text.indexOf("://") != -1)
    return 3;
  else
    if(text.indexOf(":") != -1 || text.indexOf("[") != -1 ) return 4;
  return 0;
}

function isIndividual(individual) {
	if (individual !== null && individual !== undefined && isURI(individual) != 0 && !individual.startsWith("?")) 
		return true;
}

const getPListI = (vq_obj) => {
	let pListI = {};
	const link_list =  vq_obj.getLinks();
	const link_list_filtered = link_list.map( function(l) { const type = (l.start ? 'in': 'out'); return {name:l.link.getName(), t:l.link.getType(), type: type, eE:l.link.obj.endElement, sE:l.link.obj.startElement}});
	_.each(link_list_filtered, function(link) {
		link.typeO = link.type;
		if (link.name !== null && link.name !== undefined && link.name.substring(0,1) === '^') {
			link.name = link.name.substring(1,link.name.length);
			if (link.type === 'in')
				link.type = 'out';
			else
				link.type = 'in';
		}
	})
	_.each(link_list_filtered, function(link) {
		if (link.typeO === 'out' && link.name !== null && link.name !== undefined && link.name !== '++' ) {
			const eE = new VQ_Element(link.eE);
			const individual =  eE.getInstanceAlias();
			if (isIndividual(individual)) {
				pListI.type = link.type;
				pListI.name = link.name;
				pListI.uriIndividual = dataShapes.getIndividualName(individual);
			}
		}
		if (link.typeO === 'in' && link.name !== null && link.name !== undefined && link.name !== '++' ) {
			const sE = new VQ_Element(link.sE);
			const individual =  sE.getInstanceAlias();
			if (isIndividual(individual)) {
				pListI.type = link.type;
				pListI.name = link.name;
				pListI.uriIndividual = dataShapes.getIndividualName(individual);
			}
		}
	});
	return pListI;	
}

const getPList = (vq_obj) => {
	let pList = {in: [], out: []};
	const field_list = vq_obj.getFields().filter(function(f){ return f.requireValues }).map(function(f) { return {name:f.exp, type: 'out'}});
	_.each(field_list, function(link) {
		if (link.name !== null && link.name !== undefined && link.name.indexOf('@') != -1)
			link.name = link.name.substring(0,link.name.indexOf('@'));		
	})
	if (field_list.length > 0) pList.out = field_list;

	const link_list =  vq_obj.getLinks();

	let link_list_filtered = link_list.map( function(l) { const type = (l.start ? 'in': 'out'); return {name:l.link.getName(), t:l.link.getType(), type: type, eE:l.link.obj.endElement, sE:l.link.obj.startElement}});
	_.each(link_list_filtered, function(link) {
		if (link.name !== null && link.name !== undefined && link.name.substring(0,1) === '^') {
			link.name = link.name.substring(1,link.name.length);
			if (link.type === 'in')
				link.type = 'out';
			else 
				link.type = 'in';
		}
		if (link.type === 'in')
			link.element = link.sE;
		else
			link.element = link.eE
	})
	_.each(link_list_filtered, function(link) {
		if (link.type === 'in' && link.name !== null && link.name !== undefined ) {
			if ( link.t === 'REQUIRED' ) {
				pList.in.push(link);
			}
			else {
				if (!vq_obj.isRoot()) {
					const sE = new VQ_Element(link.sE);
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
					const eE = new VQ_Element(link.eE);
					if (eE.isRoot())
						pList.out.push(link);
				}
			}
		}
		
		_.each(pList.in, function(link) {
			const el = new VQ_Element(link.element);
			const class_name = el.getName();
			const individual =  el.getInstanceAlias();
			if (class_name !== null && class_name !== undefined)
				link.className = class_name;			
			if (isIndividual(individual)) 
				link.uriIndividual = dataShapes.getIndividualName(individual);
		})
		
		_.each(pList.out, function(link) {
			if (link.element !== undefined ) {
				const el = new VQ_Element(link.element);
				const class_name = el.getName();
				const individual =  el.getInstanceAlias();
				if (class_name !== null && class_name !== undefined)
					link.className = class_name;			
				if (isIndividual(individual)) 
					link.uriIndividual = dataShapes.getIndividualName(individual);
			}
		})
	});
	return pList;
}

const findElementDataForClass = (vq_obj) => {
	let params = {}
	const individual =  vq_obj.getInstanceAlias();
	if (isIndividual(individual)) 
		params.uriIndividual = dataShapes.getIndividualName(individual);

	const pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	return params;
}

const findElementDataForProperty = (vq_obj) => {
	let params = {};
	const individual =  vq_obj.getInstanceAlias();
	const class_name = vq_obj.getName();
	if (isIndividual(individual))
		params.uriIndividual = dataShapes.getIndividualName(individual);
	if (class_name !== null && class_name !== undefined)
		params.className = class_name;

	let pList = {in: [], out: []};	
	//if (dataShapes.schema.use_pp_rels) 
	pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	
	//if (dataShapes.schema.schemaType !== 'wikidata') { // Ir uztaisīts, bet strādā drusku palēni
	//	const pListI = getPListI(vq_obj);
	//	if ( pListI.type != undefined) params.pListI = pListI;
	// }
	
	return params;
}

const findElementDataForIndividual = (vq_obj) => {
	let params = {};
	const class_name = vq_obj.getName();
	if (class_name !== null && class_name !== undefined)
		params.className = class_name;

	if (vq_obj.isIndirectClassMembership())
		params.isIndirectClassMembership = true;

	const pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	
	//if (dataShapes.schema.schemaType !== 'wikidata') {
		const pListI = getPListI(vq_obj);
		if ( pListI.type != undefined) params.pListI = pListI;
	// }
	
	return params;
}

//const sparqlGetIndividualClasses = async (params, uriIndividual) => {
const findPropertiesIds = async (direct_class_role, indirect_class_role, prop_list = []) => {
	let id_list = [];
	async function addProperty(propertyName) {
		if (propertyName != '' && propertyName != undefined && propertyName != null ) {
			const prop = await dataShapes.resolvePropertyByName({name: propertyName});
			if (prop.data.length > 0)
				id_list.push(prop.data[0].id);
		}
	}
	
	await addProperty(direct_class_role);
	await addProperty(indirect_class_role);
	for (const element of prop_list) {
		await addProperty(element);
	}
	return await id_list;
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
		filling: 0,
		classCount: 0,
		resolvedClasses: {}, 
		resolvedProperties: {}, 
		resolvedIndividuals: {}, 
		resolvedClassesF: {}, 
		resolvedPropertiesF: {},
		resolvedIndividualsF: {}, 
		treeTopsC: {}, 
		treeTopsP: {}, 
		treeTopsI: {}, 
		namespaces: [],
		local_ns: "",
		showPrefixes: "false", 
		projectId: "",
		projectId_in_process: "",
		limit: MAX_ANSWERS,
		use_pp_rels: false,
		simple_prompt: false,
		hide_individuals: false, 
		deferred_properties: 'false',
		log: [],
		fullLog: [],
		tree: {
			countC:MAX_TREE_ANSWERS, 
			countP:MAX_TREE_ANSWERS, 
			countI:MAX_IND_ANSWERS, 
			big_class_cnt: BIG_CLASS_CNT,
			plus:TREE_PLUS,
			ns: [],
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
		},
		diagram: {
			maxCount: DIAGRAM_CLASS_LIMIT,
			mode: 1,
			classList: [],
			filteredClassList: [],
		}
	};
}
const delay = ms => new Promise(res => setTimeout(res, ms));
// ***********************************************************************************
const dataShapes = {
	schema : getEmptySchema(),
	clearSchema : function() {
		this.schema = getEmptySchema();
	},
	getOntologiesOld : async function() {
		//dataShapes.getOntologies()
		let rr = await callWithGet('info/');

		if (!_.isEmpty(rr)) {
			rr.unshift({display_name:""});
			// *** console.log(rr)
			return await rr;
		}

		return NaN;
	},
	getOntologies : async function() {
		//dataShapes.getOntologies()
		let rr = await callWithGet('info2/');

		if (!_.isEmpty(rr) && !rr.error) {
			//console.log("rr ", rr)

			rr.unshift({display_name: ""});
			return await rr;
		}

		return NaN;
	},
	getPublicNamespaces : async function() {
		let rr = await callWithGet('public_ns/');
		if (!_.isEmpty(rr)) {
			this.schema.namespaces = rr;
			return await rr;
		}

		return NaN;
	},
	changeActiveProject : async function(proj_id) {
		//console.log('------changeActiveProject-------')
		const proj = Projects.findOne({_id: proj_id});
		//this.schema = getEmptySchema();
		if (proj !== undefined) {
			await this.changeActiveProjectFull(proj);
		}
	},
	changeActiveProjectFull : async function(proj) {
		//console.log('------changeActiveProjectFull-------')
		let projectId_in_process = this.schema.projectId_in_process;
		if ( proj !== undefined && projectId_in_process == proj._id ) {
			while (projectId_in_process == proj._id) {
				await delay(5000);
				projectId_in_process = this.schema.projectId_in_process;
			}
		}
		else if (proj !== undefined && ( this.schema.projectId != proj._id || this.schema.filling === 0 )) {
			this.schema = getEmptySchema();
			if ( proj.schema !== undefined && proj.schema !== "") {
				//this.schema.classCount = await this.getClassCount();
				//if (classCount < )
				this.schema.projectId = proj._id;
				this.schema.projectId_in_process = proj._id;
				this.schema.schemaName =  proj.schema;
				this.schema.showPrefixes = proj.showPrefixesForAllNames.toString();
				//this.schema.empty = false;
				this.schema.endpoint =  proj.endpoint;
				if ( proj.uri != undefined && proj.uri !== '' )
					this.schema.endpoint = `${proj.endpoint}?default-graph-uri=${proj.uri}`; 
				
				const info = await callWithGet('info/');

				if (info.error) {
					console.error(info);
					return;
				}


				if (info.filter(function(o){ return o.display_name == proj.schema}).length > 0) {
					const schema_info = info.filter(function(o){ return o.display_name == proj.schema})[0];
					this.schema.schema = schema_info.db_schema_name;
					this.schema.schemaType = schema_info.schema_name;
					this.schema.use_pp_rels = schema_info.use_pp_rels;
					this.schema.simple_prompt = schema_info.simple_prompt;
					this.schema.hide_individuals = schema_info.hide_instances;
					const prop_id_list = await findPropertiesIds(schema_info.direct_class_role, schema_info.indirect_class_role);
					if (prop_id_list.length>0)
						this.schema.deferred_properties = `id in ( ${prop_id_list})`;
					
					const ns = await this.getNamespaces_0();
					this.schema.namespaces = ns;
					const local_ns = ns.filter(function(n){ return n.is_local == true});
					this.schema.local_ns = local_ns[0].name;
					//if ( local_ns.length > 0 )
					//	this.schema.localNS = local_ns[0].name;
						
					this.schema.tree.ns = schema_info.profile_data.ns;
					_.each(this.schema.tree.ns, function (ns, i) {
						ns.index = i;
						if ( ns.isLocal == true) {
							if ( local_ns.length > 0 )
								ns.name = local_ns[0].name;
							else
								ns.name = '';
						}
					});

					if (schema_info.profile_data.schema === 'dbpedia') {
						this.schema.tree.class = 'All classes';
						this.schema.tree.classes = classes;
						//this.schema.deferred_properties = `display_name LIKE 'wiki%' or prefix = 'rdf' and display_name = 'type' or prefix = 'dct' and display_name = 'subject' or prefix = 'owl' and display_name = 'sameAs' or prefix = 'prov' and display_name = 'wasDerivedFrom'`;
						const prop_id_list2 = await findPropertiesIds(schema_info.direct_class_role, schema_info.indirect_class_role, ['owl:sameAs', 'prov:wasDerivedFrom']);
						this.schema.deferred_properties = `display_name LIKE 'wiki%' or id in ( ${prop_id_list2})`;
					}
					else if (this.schema.schemaType === 'wikidata') {   
						this.schema.tree.class = 'All classes';
						this.schema.tree.classes = [];
					}
					else if (!this.schema.hide_individuals) {
						const clFull = await dataShapes.getTreeClasses({main:{treeMode: 'Top', limit: MAX_TREE_ANSWERS}});
						const c_list = clFull.data.map(v => `${v.prefix}:${v.display_name}`)
						this.schema.tree.class = c_list[0];
						this.schema.tree.classes = c_list;
					}
					
					if (this.schema.schemaType === 'wikidata')
						this.schema.simple_prompt = true;
					
				}
				this.schema.classCount = await this.getClassCount();
				if ( this.schema.classCount < DIAGRAM_CLASS_LIMIT) {
					this.schema.diagram.classList = await this.getClassListExt();
					this.schema.diagram.filteredClassList = await this.getClassListExt();
				}
				this.schema.filling = 3;
				this.schema.projectId_in_process = "";

			}
			else {
				await this.getPublicNamespaces();
				if (proj.endpoint !== undefined && proj.endpoint !== "") {
					this.schema.endpoint =  proj.endpoint;
					if ( proj.uri != undefined && proj.uri !== '' )
						this.schema.endpoint = `${proj.endpoint}?default-graph-uri=${proj.uri}`; 
						
					this.schema.filling = 2;
				}
				else
					this.schema.filling = 1;
			}	
		}
	},
	callServerFunction : async function(funcName, params) {
		if ( ConsoleLog &&  funcName != 'resolvePropertyByName' && funcName.substring(0,2) != 'xx' ) {
			console.log("---------callServerFunction--------------" + funcName)
			console.log(params)
		}
		//console.log(Projects.findOne({_id: Session.get("activeProject")}));
		const startTime = Date.now();
		let s = this.schema.schema;
		
		if (s === "" || s === undefined ) {
			await this.changeActiveProject(Session.get("activeProject"));
			s = this.schema.schema;
		}

		// *** console.log(params)
		let rr = {complete: false, data: [], error: "DSS schema not found"};
		if (s !== "" && s !== undefined )
		{
			params.main.endpointUrl = this.schema.endpoint;
			params.main.use_pp_rels = this.schema.use_pp_rels;
			params.main.simple_prompt = this.schema.simple_prompt;
			// params.main.makeLog = MakeLog;
			params.main.schemaName = this.schema.schemaName;
			params.main.schemaType = this.schema.schemaType;
			params.main.showPrefixes = this.schema.showPrefixes;
			if ( params.main.limit === undefined )
				params.main.limit = this.schema.limit;

			rr = await callWithPost(`ontologies/${s}/${funcName}`, params);
		}
		//else
		//	Interpreter.showErrorMsg("Project DSS parameter not found !");  // TODO par šo padomāt

		const time = Date.now() - startTime

		if ( ConsoleLog &&  funcName != 'resolvePropertyByName' && funcName.substring(0,2) != 'xx') {			
			if ( rr.data ) {
				console.log(rr)
				//console.log(rr.data.map(v => v.prefix + ':' + v.display_name))
			}
			console.log(time)
		}
		if ( MakeLog ) {
			this.schema.fullLog.push(`${funcName};${time}`);
			if ( time > LONG_ANSWER ) 
				this.schema.log.push(`${funcName};${time};${params.main.filter};${JSON.stringify(params.element)};${rr.sql};${rr.sql2}`);
		}
		
		return rr;
	},
	getNamespaces : async function(params = {}) {
		// *** console.log("------------getNamespaces ------------------")
		//dataShapes.getNamespaces()
		if ( this.schema.namespaces.length > 0 )
			return this.schema.namespaces;
		else {
			let rr = await this.callServerFunction("getNamespaces", {main:params});
			this.schema.namespaces = rr;
			return rr;
		} 
	},
	getNamespaces_0 : async function(params = {}) {
		let rr = await this.callServerFunction("getNamespaces", {main:params});
		this.schema.namespaces = rr;
		return rr;
	},
	getClasses : async function(params = {}, vq_obj = null) {
		// *** console.log("------------GetClasses------------------")
		// dataShapes.getClasses()
		// dataShapes.getClasses({limit: 30})
		// dataShapes.getClasses({filter:'aa'})
		// dataShapes.getClasses({namespaces: { in: ['dbo','foaf'], notIn: ['yago']}})
		// dataShapes.getClasses({}, new VQ_Element(Session.get("activeElement")))
		if ( params.filter !== undefined) 
			params.filter = params.filter.replaceAll(' ','');
		if ( params.filter !== undefined && params.filter.split(':').length > 1 ) {
			const filter_split = params.filter.split(':');
			const ns = this.schema.namespaces.filter(function(n){ return n.name == filter_split[0];})
			if ( ns.length == 1 ) {
				params.filter = filter_split[1];
				params.namespaces = { in: [filter_split[0]]};
			}
			else {
				params.filter = filter_split[1];
			}
		}		
		let allParams = {main: params};
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
		if ( params.main.filter !== undefined) 
			params.main.filter = params.main.filter.replaceAll(' ','');
			
		if ( params.main.filter !== undefined && params.main.filter.split(':').length > 1 ) {
			const filter_split = params.main.filter.split(':');
			const ns = this.schema.namespaces.filter(function(n){ return n.name == filter_split[0];})
			if ( ns.length == 1 ) {
				params.main.filter = filter_split[1];
				params.main.namespaces = { in: [filter_split[0]]};
			}
			else {
				params.main.filter = filter_split[1];
			}
		}
			
		return await this.callServerFunction("getClasses", params);
	},
	getTreeClasses : async function(params) {
		function makeTreeName(params) {
			let nList = [];
			if ( params.main.namespaces !== undefined) {
				if ( params.main.namespaces.in !== undefined )
					nList.push(params.main.namespaces.in.join('_'));
				if ( params.main.namespaces.notIn !== undefined )
					nList.push(params.main.namespaces.notIn.join('_'));
			}
			nList.push(params.main.limit);
			return nList.join('_');
		}
		let rr;
		if ( params.main.treeMode === 'Top' && ( params.main.filter === undefined || params.main.filter === '' )) {
			const nsString = makeTreeName(params);
			//console.log(`in_${params.namespaces.in.join('_')}_notIn_${params.namespaces.notIn.join('_')}`)
			if (this.schema.treeTopsC[nsString] !== undefined && this.schema.treeTopsC[nsString].error != undefined) {
				rr = this.schema.treeTopsC[nsString];
			}
			else {
				rr =  await this.callServerFunction("getTreeClasses", params);
				this.schema.treeTopsC[nsString] = rr;
			}
		}
		else {
			if ( params.main.filter !== undefined && params.main.filter.split(':').length > 1 ) {
				const filter_split = params.main.filter.split(':');
				const ns = this.schema.namespaces.filter(function(n){ return n.name == filter_split[0];})
				if ( ns.length == 1 ) {
					params.main.filter = filter_split[1];
					params.main.namespaces = { in: [filter_split[0]]};
				}
				else {
					params.main.filter = filter_split[1];
				}
			}
			rr =  await this.callServerFunction("getTreeClasses", params);
		}

		return rr;
	},
	getPropertiesF : async function(params) {
		params.main.limit = params.main.limit + 1;
		let rr = await this.callServerFunction("getProperties", params);
		if ( rr.data.length == params.main.limit ) {
			rr.data.pop();
			rr.complete = false;
		}
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
		params.deferred_properties = this.schema.deferred_properties;
		if ( params.filter !== undefined && params.filter.split(':').length > 1 ) {
			const filter_split = params.filter.split(':');
			const ns = this.schema.namespaces.filter(function(n){ return n.name == filter_split[0];})
			if ( ns.length == 1 ) {
				params.filter = filter_split[1];
				params.namespaces = { in: [filter_split[0]]};
			}
			else {
				params.filter = filter_split[1];
			}
		}
		let allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined )
			allParams.element = findElementDataForProperty(vq_obj);
		if ( vq_obj_2 !== null && vq_obj_2 !== undefined )
			allParams.elementOE = findElementDataForProperty(vq_obj_2);
		return await this.getPropertiesF(allParams); //this.callServerFunction("getProperties", allParams);
	},
	getPropertiesFull : async function(params = {}) {
		// *** console.log("------------GetProperties------------------")
		// *** dataShapes.getProperties({main: {propertyKind:'Object'}, element:{className: 'umbel-rc:Park'}})
		// *** dataShapes.getProperties({main: {propertyKind:'Data'}, element: {className: 'umbel-rc:Park'}})
		// *** dataShapes.getProperties({main: {propertyKind:'Connect'}, element: {className: 'umbel-rc:Park'}, elementOE: {className: 'umbel-rc:Philosopher'}})
		// *** dataShapes.getProperties({main:{propertyKind:'All'}, element:{className: 'umbel-rc:Philosopher'}})
		// *** dataShapes.getProperties({main:{propertyKind:'Object'}, element:{className: 'dbo:Tenure'}})
		// *** dataShapes.getProperties({main:{propertyKind:'ObjectExt'}, element: { className:'umbel-rc:Crater'}})
		// *** dataShapes.getProperties({main:{propertyKind:'Connect'}, element:{className: 'CareerStation'}, elementOE:{otherEndClassName:'umbel-rc:Crater'}})
		// *** dataShapes.getProperties({main:{propertyKind:'All', orderByPrefix: 'case when ns_id = 2 then 0 else 1 end desc,'}, element:{className: 'CareerStation'}})
		params.main.deferred_properties = this.schema.deferred_properties;
		if ( params.main.filter !== undefined && params.main.filter.split(':').length > 1 ) {
			const filter_split = params.main.filter.split(':');
			const ns = this.schema.namespaces.filter(function(n){ return n.name == filter_split[0];})
			if ( ns.length == 1 ) {
				params.main.filter = filter_split[1];
				params.main.namespaces = { in: [filter_split[0]]};
			}
			else {
				params.main.filter = filter_split[1];
			}
		}
		return await this.getPropertiesF(params); //this.callServerFunction("getProperties", params);
	},
	getClassifiers : async function() {
		// TODO droši vien ar standarta limitu būs gana
		return await this.callServerFunction("getClassifiers", {main: {}});
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
			let nList = [];
			nList.push(params.propertyKind);
			if ( params.basicOrder !== undefined && params.basicOrder )
				nList.push('Basic');
			else
				nList.push('Full');
			nList.push(params.limit);
			return nList.join('_');
		}
		let rr;
		if ( params.filter === undefined || params.filter === '' ) {
			const tName = makeTreeName(params);
			if (this.schema.treeTopsP[tName] !== undefined && this.schema.treeTopsP[tName].error != undefined ) {
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
		const faasEnabled = await faas.isEnabled();
		// *** console.log("------------getIndividuals ------------------")
		//dataShapes.getIndividuals({filter:'Julia'}, new VQ_Element(Session.get("activeElement")))
		let rr;

		if (this.schema.schemaType == 'wikidata' && params.filter != undefined && faasEnabled == false)
			return await this.getIndividualsWD(params.filter); 
		
		//if (this.schema.schemaType === 'wikidata') // TODO pagaidām filtrs ir atslēgts
		//	params.filter = '';  

		let allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined ) {
			allParams.element = findElementDataForIndividual(vq_obj);
		}

		if (this.schema.schemaType === 'wikidata' && faasEnabled == true) {
			return await faas.getIndividuals(allParams); 
		}

		if ( allParams.element.className !== undefined || allParams.element.pList !== undefined ) {
			rr = await this.callServerFunction("getIndividuals", allParams);
				
			if (rr.error != undefined)
				rr = []
		}
		else
			rr = [];
			
		return rr;
	},
	getIndividualsWD : async function(filter) {
		const rr = await callWithGetWD(filter, MAX_IND_ANSWERS);
		if (rr.success == 1) {
			const rez = _.map(rr.search, function(p) {
				const localName = `wd:[${p.label} (${p.id})]`;				
				return localName;
			});
			return rez;
		}
		else
			return [];

	},
	getTreeIndividuals : async function(params = {}, className) {
		// *** console.log("------------getTreeIndividuals ------------------")
		let rr = [];
		let allParams = {main: params, element:{className: className}};	
		
		if (this.schema.treeTopsI[className] !== undefined && params.filter === '' ) {
			rr = this.schema.treeTopsI[className];
		}
		else {
			rr = await this.callServerFunction("getTreeIndividuals", allParams);
			if ( className !== '' && params.filter === '' && rr.error === undefined) {
				this.schema.treeTopsI[className] = rr;
			}	
		}
		
		if (rr.error != undefined)
			rr = [];
			
		return rr;
	},
	getTreeIndividualsWD : async function(filter) {
		let rr = await callWithGetWD(filter, MAX_IND_ANSWERS);
		if (rr.success == 1) {
			const rez = _.map(rr.search, function(p) {
				// TODO jāpaskatās, kāds īsti ir ns
				const localName = `wd:[${p.label} (${p.id})]`;				
				return {localName:localName , description: p.description, iri:p.concepturi, label:p.label};
			});
			return rez;
		}
		else
			return [];
	},
	resolveClassByName : async function(params = {}) {
		// *** console.log("------------resolveClassByName---"+ params.name +"---------------")
		//dataShapes.resolveClassByName({name: 'umbel-rc:Park'})
		//dataShapes.resolveClassByName({name: 'http://dbpedia.org/ontology/Year'})
		//dataShapes.resolveClassByName({name: 'foaf:Document'})
		
		let rr;
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
		
		if (rr.complete == true)
			rr.name = rr.data[0].full_name; //`${rr.data[0].prefix}:${rr.data[0].local_name}`;
		else
			rr.name = this.getCPName(params.name, 'C');
		return rr;
	},
	resolvePropertyByName : async function(params = {}) {
		// *** console.log("------------resolvePropertyByName---"+ params.name +"---------------")
		//dataShapes.resolvePropertyByName({name: 'dbo:president'})
		//dataShapes.resolvePropertyByName({name: 'http://dbpedia.org/ontology/years'})
		let rr;
		if ( typeof params.name !== "string" ) return { complete:false, name: '', data: []};
		
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

		if (rr.complete == true)
			rr.name = rr.data[0].full_name; //`${rr.data[0].prefix}:${rr.data[0].local_name}`;
		else
			rr.name = this.getCPName(params.name, 'P');
		return rr;
	},
	resolveIndividualByName : async function(params = {}) {
		//dataShapes.resolveIndividualByName({name: 'http://www.wikidata.org/entity/Q34770'})
		//dataShapes.resolveIndividualByName({name: 'wd:Q633795'})
		//dataShapes.resolveIndividualByName({name: 'dbr:Aaron_Cox'}) // dbpedia
		//dataShapes.resolveIndividualByName({name: "wd:[first (Q19269277)]"})

		if (params.name.indexOf('<') != -1)
			params.name = params.name.substring(1, params.name.length-1);
		
		params.name = this.getIndividualName(params.name);
		let rr;
		
		if (this.schema.resolvedIndividuals[params.name] !== undefined || this.schema.resolvedIndividualsF[params.name] !== undefined) {
			if (this.schema.resolvedIndividuals[params.name] !== undefined)
				rr = { complete:true, data: [this.schema.resolvedIndividuals[params.name]]};
			if (this.schema.resolvedIndividualsF[params.name] !== undefined)
				rr = { complete:false, data: []};
		}
		else {
			if (this.schema.schemaType === 'wikidata' &&  params.name.indexOf('//') == -1) {
				const prefix = params.name.substring(0, params.name.indexOf(':')+1);
				let iri = '';
				_.each(this.schema.namespaces, function(n) {
					if (params.name.indexOf(n.name) == 0 && prefix.length == n.name.length + 1)
						iri = params.name.replace(':','').replace(n.name,n.value);
				});
				const name= params.name.substring(params.name.indexOf(':')+1, params.name.length);
				const individuals = await this.getTreeIndividualsWD(name);

				if (individuals.length > 0) { 
					let rez = {};
					_.each(individuals, function(i) {
						if (i.iri == iri)
							rez = {name: params.name, localName: i.localName, label: i.label};
					});
					if ( rez.name != undefined) 
						rr = {complete: true, data:[rez]};
					else
						rr = await this.callServerFunction("resolveIndividualByName", {main: params});  // TODO - vai tā darīt
				}
				else {
					rr = await this.callServerFunction("resolveIndividualByName", {main: params});
				}
			}
			else {
				rr = await this.callServerFunction("resolveIndividualByName", {main: params});
			}
		}
		
		if ( rr.complete )
			this.schema.resolvedIndividuals[params.name] = rr.data[0];
		else if ( !rr.complete )
			this.schema.resolvedIndividualsF[params.name] = 1;
		return rr;	
		
	},
	generateClassUpdate : async function (label_name) {
		let rr = await this.callServerFunction("generateClassUpdate", {main: {label_name: label_name}});
		//console.log(rr);
		if (rr.data.length > 0) {
			let link = document.createElement("a"); 
			link.setAttribute("download", "Update.sql");
			link.href = URL.createObjectURL(new Blob([rr.data.join("\r\n")], {type: "application/json;charset=utf-8;"}));
			document.body.appendChild(link);
			link.click();
		}
	},
	tt : function (all = 1) {
		const el = new VQ_Element(Session.get("activeElement"));
		//const comparts = Compartments.find({elementId: el._id()}, {sort: {index: 1}}).fetch();
		//console.log(comparts)
		Compartments.find({elementId: el._id()}, {sort: {index: 1}}).forEach(function (cc) {
			console.log(cc)
			if (all == 1 || cc["style"].visible)
				console.log(CompartmentTypes.findOne({ _id:cc.compartmentTypeId})["name"] + "--" + cc["value"] +"*--"+ cc["style"].visible.toString() + "--" + cc["index"])
			//console.log(cc["value"])
			//console.log(cc["style"])
		})
		//console.log(el)
		//el.getCompartmentValue("Name")

	},
	tt2 : function () {
		const el = new VQ_Element(Session.get("activeElement"));
		console.log(el.getCoordinates());
	},
	tt3 : async function () {
	console.log("***************************")

	
	},
	test : async function () {
		//await this.callServerFunction("xxx_test", {main: {}});
		const pp = 'wdt:P31/wdt:P279*'
		console.log('**************************')
		const ll = pp.split('/');
		let rez = [];
		ll.forEach(l => { rez.push(l.split('*')); })
		console.log(rez)
		//console.log(pp.split('*'))
		//console.log(pp.split('/'))

	},
	printLog : function() {
		if ( this.schema.log.length > 0 ) {
			let link = document.createElement("a"); 
			link.setAttribute("download", "LOG.txt");
			link.href = URL.createObjectURL(new Blob([this.schema.log.join("\r\n")], {type: "application/json;charset=utf-8;"}));
			document.body.appendChild(link);
			link.click();
		}
		if ( this.schema.fullLog.length > 0 ) {
			let link2 = document.createElement("a"); 
			link2.setAttribute("download", "FULL_LOG.txt");
			link2.href = URL.createObjectURL(new Blob([this.schema.fullLog.join("\r\n")], {type: "application/json;charset=utf-8;"}));
			document.body.appendChild(link2);
			link2.click();
			}
		this.clearLog();
	},
	clearLog : function() {
		this.schema.log = [];
		this.schema.fullLog = [];
	},
	getClassListExt : async function() {
		const rr = await this.callServerFunction("xx_getClassListExt", {main: {limit:DIAGRAM_CLASS_LIMIT}});
		//console.log(rr)
		return rr.data;	
	},
	getClassList : async function(par) {
	// console.log(dataShapes.getClassList({}))
		//par = {class_count_limit:30, class_ind:1, only_local:false, not_in:['owl','rdf','rdfs']};
		//console.log(par)
		let rr = [];
		let allParams = {main: { limit: par.class_count_limit, class_ind:par.class_ind, isLocal: par.only_local, not_in:par.not_in }};
		allParams.main.not_in = allParams.main.not_in.map(v => this.schema.namespaces.filter(function(n){ return n.name == v})[0].id); // TODO būs jāpapildina
		rr = await this.callServerFunction("xx_getClassList", allParams);
		//console.log(rr)
		return rr.data;

		//const c_list = rr.data.map(v => v.id);
		//return c_list;		
	},
	getClassCount: async function() {
		let rr = await this.callServerFunction("xx_getClassCount", {main:{}});
		return rr; 
	},
	makeDiagr : async function(c_list, p_list, superclassType, remSmall, addIds, disconnBig, compView, schema, info ) {
		// Tiek padots zīmējamo klašu un propertiju saraksts
		let rr;
		const connectDataClases = true;
		const addAllProp = false;
		const remBig = disconnBig > 0;
		const remCount = disconnBig; 
		let rezFull = {classes:{}, assoc:{}, schema:schema, info:info};
		let allParams = {main: { c_list: `${c_list}`, limit:c_list.length}};
		let Gnum = 101;
		let Snum = 101;
		// Funkcija skaita noapaļošanai, izmanto klasēm un propertijām
		function roundCount(cnt) {
			if ( cnt == '' ) {
				return '';
			} 
			else {
				cnt = Number(cnt);
			if ( cnt < 10000)
					return cnt;
				else
					return cnt.toPrecision(2).replace("+", "");				
			}
		}
		
		rr = await this.callServerFunction("xx_getClassListInfo", allParams);
		// Pamata klašu saraksta izveidošana
		_.each(rr.data, function(cl) {
			const id = `c_${cl.id}`;
			let isClasif = false;
			let type = 'Class';
			if ( cl.classification_property != undefined && cl.classification_property != 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
				isClasif = true;
				type = 'Classif';
			}	
			let full_name = `${cl.full_name} (${roundCount(cl.cnt)})`;
			if ( addIds ) full_name = `${full_name} ID-${cl.id}`;
			rezFull.classes[id] = { id:cl.id, super_classes:[], sub_classes:[], used:false, used2:false, hasGen:false, isClasif:isClasif, type:type, prefix:cl.prefix, displayName:cl.full_name, cnt:roundCount(cl.cnt),
				cnt0:cl.cnt, sup:cl.s, sub:cl.b, fullName:full_name, data_prop:cl.data_prop, object_prop:cl.obj_prop, atr_list:[], atr_list2:[], in_prop:[], out_prop:[],  all_atr:[] };
		});
		
		rr = await this.callServerFunction("xx_getCCInfo", allParams); 
		// DB virsklašu informācijas pielikšana
		for (const cl of rr.data) {	
			const id1 = `c_${cl.class_1_id}`;
			const id2 = `c_${cl.class_2_id}`;
			rezFull.classes[id1].super_classes.push(id2);
			rezFull.classes[id2].used = true;
			rezFull.classes[id1].hasGen = true;
			rezFull.classes[id2].hasGen = true;
		}
		
		let p_list_full = {};
		let super_classes = {};	
		let rem_props = {};
		// Funkcija potenciālo virsklašu veidošanai
		function add_superclass (sc_list, prop_name) {
			let sc_id = `c_${sc_list.join('_')}`;
			if ( super_classes[sc_id] == undefined )
				super_classes[sc_id] = {count:1, cl_list:sc_list, id0:`${sc_list.join('_')}`, prop_list:[prop_name], level:0};
			else {
				// if ( !super_classes[sc_id].prop_list.includes(prop_name)) { Šis bija dīvaino cilpu izķeršanai
					super_classes[sc_id].count = super_classes[sc_id].count + 1;
					super_classes[sc_id].prop_list.push(prop_name);			
				// }
			}
		}
		
		rr = await this.callServerFunction("xx_getCPCInfo", allParams); 
		const cpc_info = rr.data;
		let has_cpc = false;
		if ( cpc_info.length > 0 ) has_cpc = true;
		allParams.main.p_list =  p_list.map(v => v.id);
		rr = await this.callServerFunction("xx_getCPInfo", allParams); 
		let cp_info = rr.data;
		
		// Mazo propertiju noņemšana, ja ir uzstādīts dotais parametrs
		if ( remSmall > 0 ) {
			let tt = [];
			for (const ii of cp_info) {
				if ( Number(ii.cnt) > remSmall-1 ) {
					if ( ii.object_cnt < remSmall && ii.object_cnt != 0) {
						ii.object_cnt = 0;
					}
					if ( Number(ii.cnt) - ii.object_cnt < remSmall && Number(ii.cnt) != ii.object_cnt ) {
						ii.object_cnt = Number(ii.cnt);
					}
					tt.push(ii);
				}
			}
			cp_info = tt;
		}
		
		// Propertiju saraksta sākotnējā apstrāde, savāc galus
		for (const p of p_list) {	
			const p_id = `p_${p.id}`;
			let p_name = `${p.prefix}:${p.display_name}`;
			if ( addIds ) 
				p_name = `${p_name}(${p.id})`;
		
			const cp_info_p = cp_info.filter(function(cp){ return cp.property_id == p.id && c_list.includes(cp.class_id) && cp.cover_set_index > 0; }); 
			const c_from = cp_info_p.filter(function(cp){ return cp.type_id == 2}); 
			const c_to = cp_info_p.filter(function(cp){ return cp.type_id == 1}); 

			if ( p.max_cardinality == -1 ) 
				p.max_cardinality = '*';
			p_list_full[p_id] = {id:p.id, c_from:c_from, c_to:c_to, p_name:p_name, cnt:p.cnt, object_cnt:p.object_cnt, count:0, max_cardinality:p.max_cardinality};
			
			if ( c_to.length == 1 && p.range_class_id == c_to[0].class_id)  // TODO te varētu būt drusku savādāk, šie ir Aigas atrastie 
				p_list_full[p_id].is_range = 'R';
			else
				p_list_full[p_id].is_range = '';
				
			if ( c_from.length > 0 && p.domain_class_id == c_from[0].class_id)  
				p_list_full[p_id].is_domain = 'D';
			else
				p_list_full[p_id].is_domain = '';
		}

		// Funkcija propertijas pielikšanai, tiek izsaukta divās vietās, , izveido potenciālās virsklases, skatoties uz padoto parametru
		function addProperty(pp, c_from, c_to) {
			function addAttribute(cl, pp, class_name, object_cnt = -1) {
				const id = `c_${cl.class_id}`;
				const p_info = {p_name:pp.p_name, p_id:pp.id, class_name:class_name,  cnt:-1, object_cnt:object_cnt, is_domain:pp.is_domain, max_cardinality:pp.max_cardinality};
				rezFull.classes[id].atr_list.push(p_info);
				rezFull.classes[id].used = true;
				if ( !rezFull.classes[id].all_atr.includes(pp.id)) rezFull.classes[id].all_atr.push(pp.id);				
			}
			
			if ( c_from.length > 0  && c_to.length == 0) {
				for (const cl of c_from) {
					const class_name = ( cl.object_cnt > 0 ) ? '-> IRI' : '';	
					addAttribute(cl, pp, class_name);
				}
			}
			else if ( c_from.length > 0  && c_to.length > 0) {
				let temp_info = {sources:{}, targets:{}};
				for (const c_1 of c_from) { 
					temp_info.sources[c_1.class_id] = 0; 
				}
				for (const c_2 of c_to) { 
					temp_info.targets[c_2.class_id] = 0; 
				}
				for (const c_1 of c_from) {
					let from_id = `c_${c_1.class_id}`;
					let addedToAtr = false;
					if ( c_1.object_cnt > 0 ) {
						for (const c_2 of c_to) {
							const to_id = `c_${c_2.class_id}`;
							let cnt = -1;
							const cpc_i = cpc_info.filter(function(i){ return i.cp_rel_id == c_1.id && i.other_class_id == c_2.class_id});
							if ( has_cpc && cpc_i.length > 0 || !has_cpc ) {  // Ja ir cpc, tad netiek ielikts tas klašu pāris, kura nav. Ja nu ir kāds iztrūkstošs pāris.
								if ( cpc_i.length > 0) 
									cnt = cpc_i[0].cnt;
								else {
									if ( c_to.length == 1 )
										cnt = c_1.object_cnt;
									else if ( c_from.length == 1 )
										cnt = c_2.object_cnt;
								}
								if ( from_id == to_id ) {
									addAttribute(c_1, pp, `<> ${rezFull.classes[from_id].displayName}`, cnt);
									addedToAtr = true;
								}
								else {
									let is_domain = pp.is_domain;
									let is_range = pp.is_range;
									if ( c_from.length == 1 && c_1.object_cnt == pp.cnt)
										is_domain = 'D';  // TODO Šim vispār jau pie Aigas būtu jābūt korekti sarēķinātam
									if ( c_to.length == 1 && cnt == pp.cnt)
										is_range = 'R';  
									const id = `c_${c_1.class_id}_c_${c_2.class_id}_${pp.p_name}`;
									const p_info = {p_name:pp.p_name, p_id:`p_${pp.id}`, id:pp.id, cnt:cnt, is_range:is_range, is_domain:is_domain, max_cardinality:pp.max_cardinality}
									rezFull.classes[from_id].used = true;
									if ( !rezFull.classes[from_id].all_atr.includes(pp.id)) rezFull.classes[from_id].all_atr.push(pp.id);
									rezFull.classes[to_id].used = true;
									if ( !rezFull.classes[from_id].out_prop.includes(id) )
										rezFull.classes[from_id].out_prop.push(id);
									if ( !rezFull.classes[to_id].in_prop.includes(id) )
										rezFull.classes[to_id].in_prop.push(id);

									rezFull.assoc[id] = {list:[p_info], from:from_id, to:to_id, removed:false, id2:`c_${c_1.class_id}_c_${c_2.class_id}`};
									temp_info.sources[c_1.class_id] = temp_info.sources[c_1.class_id] + 1;
									temp_info.targets[c_2.class_id] = temp_info.targets[c_2.class_id] + 1;
								}
							}	
						}
					}
					if ( c_1.object_cnt < Number(c_1.cnt) && ! addedToAtr) {  // Pieliek arī pie atribūtiem
						addAttribute(c_1, pp, '-> IRI');
					}
					if ( !rezFull.classes[from_id].all_atr.includes(pp.id)) {
						//console.log("***** Bija problēmas ar propertijas pielikšanu ******", rezFull.classes[from_id].displayName, pp.p_name);
						addAttribute(c_1, pp, '-> IRI');
					}
				}
				let rr1;
				let ok = true;
				for (const cc of Object.keys(temp_info.targets)) {
					if ( temp_info.targets[cc] != c_from.length)
						ok = false;
				}
				if ( superclassType > 1  && c_from.length > 1 && ok ) { // ***
					rr1 = c_from.map( v => { return v.class_id});
					add_superclass (rr1, pp.p_name);
				}
				ok = true;
				for (const cc of Object.keys(temp_info.sources)) {
					if ( temp_info.sources[cc] != c_to.length)
						ok = false;
				}
				if ( superclassType > 0  && c_to.length > 1 && ok ) { // ***
					rr1 = c_to.map( v => { return v.class_id});
					add_superclass (rr1, pp.p_name);
				}
			}
		}
		
		// Pamata propertiju pielikšana
		for (const p of Object.keys(p_list_full)) {	
			const pp = p_list_full[p];
			const c_from = pp.c_from;
			const c_to = pp.c_to;
			addProperty(pp, c_from, c_to);
		}
	
		// Iztūkstošo propertiju pievienošana (pārbaudot arī apkārtni), skatās arī uz parametru
		const val = (addAllProp) ? -1 : 0;	
		for (const cl of Object.keys(rezFull.classes)) {
			let cl_info = rezFull.classes[cl];
			if ( cl_info.type != 'Abstract') {
				for (const s of cl_info.sub) {
					if ( s != cl_info.id) {
						cl_info.all_atr = [...new Set([...cl_info.all_atr, ...rezFull.classes[`c_${s}`].all_atr])];
					}
				}
				for (const s of cl_info.sup) {
					if ( s != cl_info.id) {
						cl_info.all_atr = [...new Set([...cl_info.all_atr, ...rezFull.classes[`c_${s}`].all_atr])];
					}
				}
				
				const cp_info_p = cp_info.filter(function(cp){ return cp.class_id == cl_info.id && cp.type_id == 2 && cp.cover_set_index > val;}).map(cp => cp.property_id); // TODO - Te ir jautājums par cover set (tagad var no saskarnes pamainīt)
				for (const p of cp_info_p) {
					if ( !cl_info.all_atr.includes(p)) {
						console.log('******** Pieliek papildus propertiju ***********', cl_info.fullName, p_list_full[`p_${p}`].p_name)
						const c_from = cp_info.filter(function(cp){ 
							return cp.type_id == 2 && cp.property_id == p && cp.class_id == cl_info.id;
						}); 
						const c_to = cp_info.filter(function(cp){ 
							return cp.type_id == 1 && cp.property_id == p && c_list.includes(cp.class_id) && cp.cover_set_index > 0;
						}); 
						addProperty(p_list_full[`p_${p}`], c_from, c_to);
					}
				}
			}			
		} 
		
		console.log("*** super_classes ***", super_classes)
		// Saliek abstraktās virsklases sarakstā, lai var sakārtot 
		let temp = {};
		let super_classes_list = [];
		for (const sc of Object.keys(super_classes)) {
			if ( super_classes[sc].count > 1 ) { // TODO Jāpadomā, vai šādi vispār ir labi, varbūt vajag savādāk šķirot
				super_classes[sc].cl_list_orig = super_classes[sc].cl_list;
				temp[sc] = super_classes[sc];
				super_classes[sc].id = sc;
				super_classes_list.push(super_classes[sc])
			}
		}
		super_classes = temp;
		super_classes_list = super_classes_list.sort((a, b) => { return a.cl_list.length - b.cl_list.length; });
		console.log("*** p_list_full ***", p_list_full)
		
		// Izveido abstrakto virsklašu koku, TODO !!! varētu nestrādāt visos gadījumos
		for (const sc1 of super_classes_list) {	
			for (const sc2 of super_classes_list) {	
				if ( sc1.cl_list.length < sc2.cl_list.length ) {
					let ii = 0;
					for (const c of sc1.cl_list) {
						if ( sc2.cl_list.includes(c) )
							ii = ii+1;
					}
					if ( ii == sc1.cl_list.length) {
						let cl_list = [];
						for (const c of sc2.cl_list) {
							if ( !sc1.cl_list.includes(c) )
								cl_list.push(c);
						}
						cl_list.push(sc1.cl_list.join('_'));
						sc2.cl_list = cl_list;
						sc2.level = sc2.level + 1;
					}	
				}				
			}
		}
		
		super_classes_list = super_classes_list.sort((a, b) => { return a.level - b.level; });
		console.log("*** super_classes_list ***", super_classes_list)

		// Pieliek abstraktās virsklases klašu sarakstā
		for (const super_class of super_classes_list) {
			const sc = super_class.id;
			rezFull.classes[sc] = { id:super_class.id0, fullName:'', used:true, used2:true, hasGen:true, type:'Abstract', cl_list: super_class.cl_list_orig, super_classes:[], sub_classes:[],
									atr_list:[], atr_list2:[], in_prop:[], out_prop:[], all_atr:[] };
			let sc_list = [];
			for (const c of super_class.cl_list) {
				rezFull.classes[`c_${c}`].super_classes.push(sc); 
				rezFull.classes[`c_${c}`].hasGen = true;
				sc_list.push(rezFull.classes[`c_${c}`]);
			}

			sc_list = sc_list.sort((a, b) => { return b.cnt0 - a.cnt0; });
			let n_list = [];				
			for (const c of sc_list) {
				n_list.push(c.displayName);
			}
			
			rezFull.classes[sc].subClasses = sc_list.map(c => c.fullName).join('\n');
			//rezFull.classes[sc].fullName = n_list.join(' or ');
			//rezFull.classes[sc].displayName = n_list.join(' or ');	
			rezFull.classes[sc].fullName = `S${Snum}`;
			rezFull.classes[sc].displayName = `S${Snum}`;
			Snum = Snum + 1;
		}
		
		// kopējo atribūtu pārvietošana pie virsklases
		for (const super_class of super_classes_list) {	
			const sc = super_class.id;
			let atr_tree = {};
			for (const c of super_class.cl_list) {
				for (const atr of rezFull.classes[`c_${c}`].atr_list ) {
					if ( atr_tree[atr.p_name] == undefined)
						atr_tree[atr.p_name] = {count:1, info:{p_name:atr.p_name, p_id:atr.p_id, cnt:-1, object_cnt:-1, max_cardinality:atr.max_cardinality, class_name:atr.class_name, is_domain:''}};
					else {
						atr_tree[atr.p_name].count = atr_tree[atr.p_name].count+1;
						if ( atr.max_cardinality == '*')
							atr_tree[atr.p_name].info.max_cardinality = '*';
						if ( atr.class_name == '')
							atr_tree[atr.p_name].info.class_name= '';
					}
				}
			} 

			for (const atr of Object.keys(atr_tree)) {	
				if ( atr_tree[atr].count == super_class.cl_list.length) {
					rezFull.classes[sc].atr_list.push(atr_tree[atr].info);
				}
			}
			
			for (const c of super_class.cl_list) {
				let atr_list = [];
				for (const atr of rezFull.classes[`c_${c}`].atr_list ) {
					if ( atr_tree[atr.p_name].count != super_class.cl_list.length) {
						atr_list.push(atr);
					}
				}
				rezFull.classes[`c_${c}`].atr_list = atr_list;
			}
		}

		// kopējo ienākošo propertiju pārvietošana pie virsklases
		for (const super_class of super_classes_list) {	
			const sc = super_class.id;
			let atr_tree = {};
			for (const c of super_class.cl_list) {
				for (const atr of rezFull.classes[`c_${c}`].in_prop ) {
					let assoc = rezFull.assoc[atr];
					if ( !assoc.removed ) {
						const p_name = `${assoc.from}_${assoc.list[0].p_name}`;
						if ( atr_tree[p_name] == undefined)
							atr_tree[p_name] = {count:1, id_list:[atr], p_name:`${assoc.from}_${sc}_${assoc.list[0].p_name}`, 
												info:{ removed: false, from:assoc.from, to:sc, id2:`${assoc.from}_${sc}`,
													list:[{p_name:assoc.list[0].p_name, p_id:assoc.list[0].p_id, max_cardinality:assoc.list[0].max_cardinality, cnt:-1, is_domain:assoc.list[0].is_domain, is_range:'' }]}};
						else {
							atr_tree[p_name].count = atr_tree[p_name].count+1;
							atr_tree[p_name].id_list.push(atr);
							if ( assoc.list[0].max_cardinality == '*')
								atr_tree[p_name].info.list[0].max_cardinality = '*';
						}
					}
				}
			} 

			for (const atr of Object.keys(atr_tree)) {	
				if ( atr_tree[atr].count == super_class.cl_list.length) {
					for (const p_id of atr_tree[atr].id_list) {
						rezFull.assoc[p_id].removed = true;
					}
					rezFull.classes[atr_tree[atr].info.from].out_prop.push(atr_tree[atr].p_name);
					rezFull.classes[atr_tree[atr].info.to].in_prop.push(atr_tree[atr].p_name);
					rezFull.assoc[atr_tree[atr].p_name] = atr_tree[atr].info;
				}
			}
		}
		
		// kopējo izejošo propertiju pārvietošana pie virsklases
		for (const super_class of super_classes_list) {
			const sc = super_class.id;
			let atr_tree = {};
			for (const c of super_class.cl_list) {
				for (const atr of rezFull.classes[`c_${c}`].out_prop ) {
					let assoc = rezFull.assoc[atr];
					if ( !assoc.removed) {
						const p_name = `${assoc.to}_${assoc.list[0].p_name}`;
						if ( atr_tree[p_name] == undefined)
							atr_tree[p_name] = {count:1, id_list:[atr], p_name:`${sc}_${assoc.to}_${assoc.list[0].p_name}`, 
												info:{ removed: false, from:sc, to:assoc.to, id2:`${sc}_${assoc.to}`,
													list:[{p_name:assoc.list[0].p_name, p_id:assoc.list[0].p_id, max_cardinality:assoc.list[0].max_cardinality, cnt:-1, is_range:assoc.list[0].is_range, is_domain:'' }]}};
						else {
							atr_tree[p_name].count = atr_tree[p_name].count+1;
							atr_tree[p_name].id_list.push(atr);
							if ( assoc.list[0].max_cardinality == '*')
								atr_tree[p_name].info.list[0].max_cardinality = '*';
						}
					}
				}
			} 

			for (const atr of Object.keys(atr_tree)) {	
				if ( atr_tree[atr].count == super_class.cl_list.length) {
					for (const p_id of atr_tree[atr].id_list) {
						rezFull.assoc[p_id].removed = true;
					}
					rezFull.classes[atr_tree[atr].info.to].in_prop.push(atr_tree[atr].p_name);
					rezFull.classes[atr_tree[atr].info.from].out_prop.push(atr_tree[atr].p_name);
					rezFull.assoc[atr_tree[atr].p_name] = atr_tree[atr].info;
				}
			}
		}

		// Saskaita, cik vietās ir propertija iezīmēta
		for (const aa of Object.keys(rezFull.assoc)) {
			if ( !rezFull.assoc[aa].removed) {
				const pId = rezFull.assoc[aa].list[0].p_id;
				p_list_full[pId].count = p_list_full[pId].count + 1;
			}
		}
		
		// Propertijas atvienošana
		function disconnectProp(prop) {
			const c_from = rezFull.classes[prop.from];	
			const c_to = rezFull.classes[prop.to];	
			const pr = prop.list[0];
			const p_id = pr.p_id.substring(2,pr.p_id.length);
			if ( rezFull.classes[prop.from].type != 'Abstract' && rezFull.classes[prop.to].type != 'Abstract') {
				c_to.atr_list2.push({p_name:pr.p_name, class_name:c_from.displayName}); 
				c_from.atr_list.push({p_name:pr.p_name, p_id:p_id, cnt:-1, object_cnt:pr.cnt, class_name:`-> ${c_to.displayName}`,
						max_cardinality:pr.max_cardinality, is_domain:pr.is_domain});
			}
			if ( rezFull.classes[prop.from].type == 'Abstract' && rezFull.classes[prop.to].type != 'Abstract') {
				const c_from_id_list = rezFull.classes[prop.from].cl_list.map(i => `c_${i}`);
				c_from.atr_list.push({p_name:pr.p_name, p_id:p_id, cnt:-1, object_cnt:pr.cnt, class_name:`-> ${c_to.displayName}`,
						max_cardinality:pr.max_cardinality, is_domain:pr.is_domain});
				for (const from_id of c_from_id_list) {
					const c_from_sub = rezFull.classes[from_id];
					c_to.atr_list2.push({p_name:pr.p_name, class_name:c_from_sub.displayName}); 
				}
			}
			if ( rezFull.classes[prop.from].type != 'Abstract' && rezFull.classes[prop.to].type == 'Abstract') {
				const c_to_id_list = rezFull.classes[prop.to].cl_list.map(i => `c_${i}`);
				c_to.atr_list2.push({p_name:pr.p_name, class_name:c_from.displayName}); 
				for (const to_id of c_to_id_list) {
					const c_to_sub = rezFull.classes[to_id];
					c_from.atr_list.push({p_name:pr.p_name, p_id:p_id, cnt:-1, object_cnt:pr.cnt, class_name:`-> ${c_to_sub.displayName}`,
								max_cardinality:pr.max_cardinality, is_domain:pr.is_domain});
				}
			}
			if ( rezFull.classes[prop.from].type == 'Abstract' && rezFull.classes[prop.to].type == 'Abstract') {
				const c_from_id_list = rezFull.classes[prop.from].cl_list.map(i => `c_${i}`);
				const c_to_id_list = rezFull.classes[prop.to].cl_list.map(i => `c_${i}`);
				for (const from_id of c_from_id_list) {
					for (const to_id of c_to_id_list) {
						const c_from_sub = rezFull.classes[from_id];
						const c_to_sub = rezFull.classes[to_id];
						c_from.atr_list.push({p_name:pr.p_name,  p_id:p_id, cnt:-1, object_cnt:pr.cnt, class_name:`-> ${c_to_sub.displayName}`,
								max_cardinality:pr.max_cardinality, is_domain:pr.is_domain});
						c_to.atr_list2.push({p_name:pr.p_name, class_name:c_from_sub.displayName}); 
					}
				}
			}
		}
		
		// Ievelk daudzgalu propertijas klasēs
		for (const aa of Object.keys(rezFull.assoc)) {
			const prop = rezFull.assoc[aa];
			if ( !prop.removed) {
				if ( remBig && p_list_full[prop.list[0].p_id].count > remCount ) { //5555 remCount
					prop.removed = true;
					disconnectProp(prop);
					rem_props[prop.list[0].p_id] = p_list_full[prop.list[0].p_id].count;
				}
			}
		}

		// Apstrādā tās klases, kurām nav izejošo propertiju, atvieno, ja ir vajadzīgais parametrs
		for (const clId of Object.keys(rezFull.classes)) {
			const cl = rezFull.classes[clId];
			if ( !cl.hasGen && !cl.isClasif && cl.out_prop.length == 0) { // !cl.hasGen &&
				cl.type = 'Data';
				if ( !connectDataClases ) {
					for (const p of cl.in_prop) {
						const prop = rezFull.assoc[p];
						if ( !prop.removed) {
							prop.removed = true;
							disconnectProp(prop);
						}
					}
				}
			}
		}
		
		// Pārbauda klašu aktuālo saistību ar citām
		for (const aa of Object.keys(rezFull.assoc)) {
			const prop = rezFull.assoc[aa];
			if ( !prop.removed) {
				rezFull.classes[prop.from].used2 = true;	
				rezFull.classes[prop.to].used2 = true;
			}
		}
		
		// Savāc 'plānās' apakšklases pie virsklases TODO varētu būt 'plānas' arī klases zem abstraktajām
		for (const cl of Object.keys(rezFull.classes)) {
			if ( !rezFull.classes[cl].used ) {
				if ( rezFull.classes[cl].super_classes.length == 1 ) {
					const sc = rezFull.classes[cl].super_classes[0];
					//rezFull.classes[sc].sub_classes.push(rezFull.classes[cl].fullName);
					rezFull.classes[sc].sub_classes.push(rezFull.classes[cl]);
				}
				else
					rezFull.classes[cl].used = true;
			}
		}
		
		// Funkcija kompaktā atribūtu saraksta izveidošanai
		function getCompactAtrList (atr_list, type, class_id = 0) {
			let comp_atr_list = [];
			let temp = {};
			let temp2 = {};
			if ( type == 'out') {
				for (const a of atr_list) {
					const ii = `${a.p_name}#${a.p_id}`;
					const ii2 = `${a.p_name}_${a.p_id}_${a.class_name}`;
					if( temp[ii] == undefined ) {
						temp[ii] = [ii2];
						temp2[ii] = a;
					}
					else {
						if ( !temp[ii].includes(ii2)) {
							temp[ii].push(ii2);
						}
					}
				}
				for (const t of Object.keys(temp)) {
					if ( temp[t].length > 1) {
						const p_id = t.split('#')[1];
						if ( class_id >  0) {
							const prop = p_list_full[`p_${p_id}`];
							const cl_info = prop.c_from.filter(function(i){ return i.class_id == class_id});
							if ( cl_info.length > 0 )
								comp_atr_list.push({p_name:t.split('#')[0], p_id:p_id, cnt:Number(cl_info[0].cnt), object_cnt:cl_info[0].object_cnt, class_name:'->IRI', iri_card:temp[t].length, is_domain:'', max_cardinality:'*'});
						}
						else
							comp_atr_list.push({p_name:t.split('#')[0], p_id:p_id, cnt:-1, object_cnt:-1, class_name:'->IRI', iri_card:'*', is_domain:'', max_cardinality:'*'});
					}	
					else
						comp_atr_list.push(temp2[t]);
				}			
			}
			else {  // priekš atr_list2
				for (const a of atr_list) {
					const ii = a.p_name;
					if( temp[ii] == undefined ) {
						temp[ii] = 1;
						temp2[ii] = a;
					}
					else
						temp[ii] = temp[ii] + 1;
				}
				for (const t of Object.keys(temp)) {
					if ( temp[t] > 1)
						if ( class_id >  0) 
							comp_atr_list.push({p_name:t, class_name:`IRI(${temp[t]})`});
						else
							comp_atr_list.push({p_name:t, class_name:`IRI(*)`});
					else
						comp_atr_list.push(temp2[t]);
				}
			}
			return comp_atr_list;
		}

		for (const cl of Object.keys(rezFull.classes)) {
			rezFull.classes[cl].sub_classes_group_string = '';
		}
		
		// Vientuļo klašu apstrāde pilno atribūtu gadījumam 
		if ( !compView ) {
			// Savāc vientuļo klašu atribūtus, meklē līdzīgās (pirmā iterācija)
			let temp = {};
			for (const clId of Object.keys(rezFull.classes)) {
				const classInfo = rezFull.classes[clId];
				if ( !classInfo.used2 && !classInfo.hasGen && !classInfo.isClasif ) {
					classInfo.type = 'Data';
					let atr_list = [];
					for (const a of classInfo.atr_list) {
						const aa = {p_name:a.p_name, p_id:a.p_id, cnt:-1, object_cnt:-1, class_name:a.class_name, is_domain:'', max_cardinality:'*'};
						atr_list.push(aa);
					}
					let cc = [classInfo.atr_list.map(n => `${n.p_name} ${n.class_name}`).sort().join('\n')];
					cc.push(classInfo.atr_list2.map(n => `${n.p_name} ${n.class_name}`).sort().join('\n'));
					cc = cc.join('\n');
					if ( cc != '') {
						if ( temp[cc] == undefined )
							temp[cc] = {class_list:[classInfo.id], atr_list:atr_list, atr_list2:classInfo.atr_list2};
						else
							temp[cc].class_list.push(classInfo.id);
					}
				}
			}
			
			// Otrā iterācija līdzīgo vientuļo klasu savākšanai
			let temp2 = {};
			for (const t of Object.keys(temp)) {
				let cc = [getCompactAtrList(temp[t].atr_list, 'out').map(n => `${n.p_name}`).sort().join('\n')];
				cc.push(getCompactAtrList(temp[t].atr_list2,'in').map(n => `${n.p_name}`).sort().join('\n'));
				cc = cc.join('\n');
				if ( temp2[cc] == undefined )
					temp2[cc] = [`c_${temp[t].class_list[0]}`];
				else
					temp2[cc].push(`c_${temp[t].class_list[0]}`);	
				if (temp[t].class_list.length > 1 ) {
					let cl_list = [];
					for (const cl_id of temp[t].class_list) {
						cl_list.push(rezFull.classes[`c_${cl_id}`].fullName);
						rezFull.classes[`c_${cl_id}`].used = false;
					}
					rezFull.classes[`c_${temp[t].class_list[0]}`].sub_classes_group_string = cl_list.sort().join('\n');
					rezFull.classes[`c_${temp[t].class_list[0]}`].id = `a_${rezFull.classes[`c_${temp[t].class_list[0]}`].id}`;
					rezFull.classes[`c_${temp[t].class_list[0]}`].used = true; 
					rezFull.classes[`c_${temp[t].class_list[0]}`].atr_list = temp[t].atr_list;
					rezFull.classes[`c_${temp[t].class_list[0]}`].atr_list2 = temp[t].atr_list2;
					rezFull.classes[`c_${temp[t].class_list[0]}`].type = 'Sub';
				}
			}
			
			// Līdzīgo klašu virsklases izveidošana
			for (const t of Object.keys(temp2)) {
				if ( temp2[t].length > 1 ) {
					const sc = `c_${temp2[t].join('_')}`;
					rezFull.classes[sc] = { id:`${temp2[t].join('_')}`, fullName:'', displayName:'', used:true, used2:true, hasGen:true, type:'Abstract', super_classes:[], sub_classes:[],
											atr_list:[], atr_list2:[], in_prop:[], out_prop:[], all_atr:[] };
					for (const c of temp2[t]) {
						rezFull.classes[c].super_classes.push(sc); 
						rezFull.classes[c].hasGen = true;
					}
				}
			}
		}

		// Vientuļo klašu apstrāde kompakto atribūtu gadījumam 
		if ( compView ) {
			// Savāc vientuļo klašu atribūtus, meklē līdzīgās 
			let temp = {};
			for (const clId of Object.keys(rezFull.classes)) {
				const classInfo = rezFull.classes[clId];
				if ( !classInfo.used2 && !classInfo.hasGen && !classInfo.isClasif ) {
					classInfo.type = 'Data';
					classInfo.free = true;
					const atr_list = getCompactAtrList(classInfo.atr_list, 'out');
					const atr_list2 = getCompactAtrList(classInfo.atr_list2, 'in');
					let cc = [atr_list.map(n => n.p_name).sort().join('\n')];
					cc.push(atr_list2.map(n => n.p_name).sort().join('\n'));
					cc = cc.join('\n');
					if ( cc != '') {
						if ( temp[cc] == undefined )
							temp[cc] = {class_list:[classInfo.id]};
						else
							temp[cc].class_list.push(classInfo.id);
					}
				} 
			}
			
			console.log("^^^^^^^^^^^^^^ līdzīgie atribūti", temp)
			// Apvieno līdzīgās klases
			for (const t of Object.keys(temp)) {
				if (temp[t].class_list.length > 1 ) {
					console.log("****",t, temp[t])
					let cl_list = [];
					let atr_list = [];
					let atr_list2 = [];
					for (const cl_id of temp[t].class_list) {
						cl_list.push(rezFull.classes[`c_${cl_id}`].fullName);
						rezFull.classes[`c_${cl_id}`].used = false;
						atr_list = [...new Set([...atr_list, ... rezFull.classes[`c_${cl_id}`].atr_list ])];
						atr_list2 = [...new Set([...atr_list2, ...rezFull.classes[`c_${cl_id}`].atr_list2 ])];
					}
					rezFull.classes[`c_${temp[t].class_list[0]}`].sub_classes_group_string = cl_list.sort().join('\n');
					//rezFull.classes[`c_${temp[t].class_list[0]}`].id = `a_${rezFull.classes[`c_${temp[t].class_list[0]}`].id}`;
					rezFull.classes[`c_${temp[t].class_list[0]}`].used = true; 
					rezFull.classes[`c_${temp[t].class_list[0]}`].fullName = `G${Gnum}`;
					rezFull.classes[`c_${temp[t].class_list[0]}`].displayName = `G${Gnum}`;
					Gnum = Gnum + 1;
					rezFull.classes[`c_${temp[t].class_list[0]}`].atr_list3 = atr_list;
					rezFull.classes[`c_${temp[t].class_list[0]}`].atr_list4 = atr_list2;
					rezFull.classes[`c_${temp[t].class_list[0]}`].type = 'Sub';
					rezFull.classes[`c_${temp[t].class_list[0]}`].group = true; 
				}
			}
		}	
		
		// Meklē 'draudzīgās' klases starp brīvajām
		function makeSupClass(sc, cl_list, temp) {
			let sup_atr_list = [];
			let sup_atr_list2 = [];
			function makeAtrList(atr_list, type) {
				let r_atr_list = [];
				for (let a of atr_list ) {
					const p = a.p_name;
					if ( temp[p] == cl_list.length ) {
						if ( type == 'out')
							sup_atr_list.push(a);
						else
							sup_atr_list2.push(a);
					}
					else {
						r_atr_list.push(a);
					}
				}
				return r_atr_list;
			}
			
			rezFull.classes[sc] = { id:`${cl_list.join('_')}`, fullName:`S${Snum}`, displayName:`S${Snum}`, used:true, used2:true, hasGen:true, type:'Abstract', super_classes:[], sub_classes:[]};
			Snum = Snum + 1;
			for (let cl of cl_list) {
				const classInfo = rezFull.classes[`c_${cl}`];
				classInfo.super_classes.push(sc); 
				classInfo.hasGen = true;
				if ( classInfo.group ) {
					classInfo.atr_list3 = makeAtrList(classInfo.atr_list3, 'out');
					classInfo.atr_list4 = makeAtrList(classInfo.atr_list4, 'in');
				}
				else {
					classInfo.atr_list = makeAtrList(classInfo.atr_list, 'out');
					classInfo.atr_list2 = makeAtrList(classInfo.atr_list2, 'in');
				}
			}
			rezFull.classes[sc].atr_list3 = sup_atr_list;
			rezFull.classes[sc].atr_list4 = sup_atr_list2;
		}
		

		// Izveido klašu kopas, kuras ir līdzīgas ( ir kāds kopīgs atribūtu komplekts)
		let temp2 = {};
		let ii_1 = 0;
		let ii_2 = 0;
		function addAttrs(atr_list) {
			for (const a of atr_list) {
				if ( temp[a.p_name] == undefined) {
					temp[a.p_name] = 1;
					ii_1 = ii_1 + 1;
				}
				else {
					temp[a.p_name] = temp[a.p_name] + 1;
					ii_2 = ii_2 + 1;
				}
			}
		}
		if ( compView ) {
			rezFull.lines = {};

			// Apstrādā klašu pārus, apvieno grupās
			for (const clId_1 of Object.keys(rezFull.classes)) {
				const classInfo1 = rezFull.classes[clId_1];
				if ( (classInfo1.used && classInfo1.free) || classInfo1.group ) {
					for (const clId_2 of Object.keys(rezFull.classes)) {
						const classInfo2 = rezFull.classes[clId_2];
						if ( (classInfo2.used && classInfo2.free) || classInfo2.group ) {
							if ( classInfo1.id != classInfo2.id  && classInfo1.displayName < classInfo2.displayName) {
								temp = {};
								ii_1 = 0;
								ii_2 = 0;

								addAttrs(getCompactAtrList(classInfo1.atr_list, 'out'));
								addAttrs(getCompactAtrList(classInfo2.atr_list, 'out'));
								addAttrs(getCompactAtrList(classInfo1.atr_list2, 'in'));
								addAttrs(getCompactAtrList(classInfo2.atr_list2, 'in'));
								if ( ii_1 - ii_2 < 4 && ii_2 > 3 ) {  // TODO šīs ir patvaļīgi izvēlētas konstantes ii_1 kopīgais atribūtu skaits klašu pārim, ii_2 sakrītošais atribūtu skaits
									const id = `l_${classInfo1.id}_${classInfo2.id}`;
									rezFull.lines[id] = {id:id, from:`c_${classInfo1.id}`, to: `c_${classInfo2.id}`, val:`diff_${ii_1 - ii_2}` };
									let used = false;
									for (let k of Object.keys(temp2)) {
										const group = temp2[k];
										if ( group.includes(classInfo1.id)) {
											if ( !group.includes(classInfo2.id) )
												temp2[k].push(classInfo2.id);
											used = true;
										}
										if ( group.includes(classInfo2.id)) {
											if ( !group.includes(classInfo1.id) )
												temp2[k].push(classInfo1.id);
											used = true;
										}
									}
									if ( !used) 
										temp2[id] = [classInfo1.id, classInfo2.id];
								}
							}
						}
					}
				}
			}
			
			// Atrastajām grupām izveido virsklases, sakārto atribūtus
			console.log(temp2)
			for (const k of Object.keys(temp2)) {
				let temp = {};
				for (const cl of temp2[k]) {
					const classInfo = rezFull.classes[`c_${cl}`];
					for (const atr of getCompactAtrList(classInfo.atr_list,'out') ) {
						const prop = atr.p_name;
						if ( temp[prop] == undefined)
							temp[prop] = 1;
						else
							temp[prop] = temp[prop] + 1
					}
					for (const atr of getCompactAtrList(classInfo.atr_list2, 'in') ) {
						const prop = atr.p_name;
						if ( temp[prop] == undefined)
							temp[prop] = 1;
						else
							temp[prop] = temp[prop] + 1
					}
				}
				console.log(temp)
				const sc = `c_${temp2[k].join('_')}`;
				makeSupClass(sc, temp2[k], temp);
			}
		}

		// Funckcija atribūta izskata noformēšanai
		function getAttrString(classInfo){
			const class_id = classInfo.id;
			let atr_list = [];
			if ( class_id >  0) {
				for (const a of classInfo.atr_list) {
					const cl_info = p_list_full[`p_${a.p_id}`].c_from.filter(function(i){ return i.class_id == class_id});
					if ( cl_info.length > 0 ) {  // parastās klases
						const cnt = Number(cl_info[0].cnt);
						const object_cnt = ( !compView && a.object_cnt > 0 && a.object_cnt != cnt ) ? `${roundCount(a.object_cnt)}/` : '';
						let dataProc = '';
						if ( cl_info[0].object_cnt > 0 && cl_info[0].object_cnt != cnt) {
							let proc = Math.round(100*(cnt-cl_info[0].object_cnt)/cnt);
							if ( proc == 100) proc = 99.9;
							dataProc = ` ${proc}%d`;
						}
						const iri_card = ( a.iri_card != undefined) ? `(${a.iri_card})` : '';  
						atr_list.push(`${a.p_name} (${object_cnt}${roundCount(cnt)}${dataProc}) [${a.max_cardinality}] ${a.is_domain} ${a.class_name}${iri_card}`);	
					}
					else {
						const cnt = ( a.cnt == -1 ) ? '': ` (${roundCount(a.cnt)})`;
						const iri_card = ( a.iri_card != undefined) ? `(${a.iri_card})` : '';  
						atr_list.push(`{a.p_name}${cnt} [${a.max_cardinality}] ${a.is_domain} ${a.class_name}${iri_card}`);
					}	
				}
			}
			else {
				atr_list = classInfo.atr_list.map(function(a) {
					const cnt = ( a.cnt == -1 ) ? '': ` (${roundCount(a.cnt)})`;
					const iri_card = ( a.iri_card != undefined ) ? `(${a.iri_card})` : ''; 
					return `${a.p_name}${cnt} [${a.max_cardinality}] ${a.is_domain} ${a.class_name}${iri_card}`;
				});
			}
			return atr_list.sort().join('\n');
		}

		// Klases vizuālo atribūtu formēšana
		for (const cl of Object.keys(rezFull.classes)) {
			const classInfo = rezFull.classes[cl];   
			if ( compView ) {
				if ( classInfo.atr_list3 != undefined) {
					classInfo.atr_list = getCompactAtrList(classInfo.atr_list3, 'out');
					classInfo.atr_list2 = getCompactAtrList(classInfo.atr_list4, 'in');
				}
				else {
					classInfo.atr_list = getCompactAtrList(classInfo.atr_list, 'out', classInfo.id);
					classInfo.atr_list2 = getCompactAtrList(classInfo.atr_list2, 'in', classInfo.id);
				}
			}
			classInfo.atr_string = getAttrString(classInfo);
			classInfo.atr_string2 = classInfo.atr_list2.map(n => `<- ${n.p_name} ${n.class_name}`).sort().join('\n');
			if ( classInfo.sub_classes.length == 1 ) {
				rezFull.classes[`c_${classInfo.sub_classes[0].id}`].used = true;
				classInfo.sub_classes = [];
				classInfo.sub_classes_string = '';
				classInfo.sub_classes_clasif_string = '';
			}
			else if ( classInfo.sub_classes.length > 1 ) {
				classInfo.sub_classes_string = '';
				classInfo.sub_classes_clasif_string = '';
				let list = classInfo.sub_classes.filter(function(c){ return c.isClasif == true});
				if ( list.length > 0 ) {  // TODO teorētiski varētu būt arī tikai viena klase
					list = list.sort((a, b) => { return b.cnt0 - a.cnt0; });	
					classInfo.sub_classes_clasif_string = list.map(c => c.fullName).sort().join('\n');
				}
				
				list = classInfo.sub_classes.filter(function(c){ return c.isClasif == false});
				if ( list.length > 0 ) {  // TODO teorētiski varētu būt arī tikai viena klase
					list = list.sort((a, b) => { return b.cnt0 - a.cnt0; });	
					classInfo.sub_classes_string = list.map(c => c.fullName).sort().join('\n');
				}
			}
			else {
				classInfo.sub_classes_string = '';
				classInfo.sub_classes_clasif_string = '';
			}
		}
		
		// Asociāciju savilkšana kopā - pie vienas līnijas vairākas propertijas
		let assoc = {};
		for (const aa of Object.keys(rezFull.assoc)) {
			if ( !rezFull.assoc[aa].removed) { 
				rezFull.assoc[aa].list[0].cnt = ( rezFull.assoc[aa].list[0].cnt == -1  ) ? '' : ` (${roundCount(rezFull.assoc[aa].list[0].cnt)})`;	
				//if ( rezFull.assoc[aa].list[0].cnt == -1 )
				//	rezFull.assoc[aa].list[0].cnt = '';
				//else 
				//	rezFull.assoc[aa].list[0].cnt = `(${roundCount(rezFull.assoc[aa].list[0].cnt)})`;
				const a = rezFull.assoc[aa];
				const id = a.id2;
				if ( assoc[id] == undefined ){
					assoc[id] = rezFull.assoc[aa];
				}
				else {
					assoc[id].list.push(a.list[0]);
				}
			}
		}
		rezFull.assoc = assoc;
		
		for (const aa of Object.keys(rezFull.assoc)) {
			//rezFull.assoc[aa].string = rezFull.assoc[aa].list.map(n => `${n.p_name} (${n.cnt}/${n.cnt_all}) [${n.max_cardinality}] ${n.is_domain}${n.is_range}`).sort().join('\n');
			rezFull.assoc[aa].string = rezFull.assoc[aa].list.map(n => `${n.p_name}${n.cnt} [${n.max_cardinality}] ${n.is_domain}${n.is_range}`).sort().join('\n');
		}

		console.log("*** rezFull ***", rezFull);

		let link = document.createElement("a");
		link.setAttribute("download", "diagr_data.json");
		link.href = URL.createObjectURL(new Blob([JSON.stringify(rezFull, 0, 4)], {type: "application/json;charset=utf-8;"}));
		document.body.appendChild(link);
		link.click();
		console.log("**********************************");
		
	},
	makeSuperDiagr : async function(c_list, p_list, par, info, calk = false ) {
		// Tiek padots zīmējamo klašu un propertiju saraksts
		let rr;
		const addIds = par.addIds;
		const compView = par.compView;
		const schema = par.schema;
		const diffG = par.diffG;
		const diffS = par.diffS;
		const remBig = par.disconnBig > 0;
		const remCount = par.disconnBig; 		

		let rezFull = {classes:{}, assoc:{}, lines:{}, schema:schema, info:info, type:'makeSuperDiagr'};
		let allParams = {main: { c_list: `${c_list}`, limit:c_list.length}};
		let Gnum = 101;
		let Snum = 101;
		let p_list_full = {};
		let cpc_info;
		let has_cpc = false;
		let cp_info;
		// Funkcija skaita noapaļošanai, izmanto klasēm un propertijām
		function roundCount(cnt) {
			if ( cnt == '' ) {
				return '';
			} 
			else {
				cnt = Number(cnt);
			if ( cnt < 10000)
					return cnt;
				else
					return cnt.toPrecision(2).replace("+", "");				
			}
		}
		
		rr = await this.callServerFunction("xx_getClassListInfo", allParams);
		// Pamata klašu saraksta izveidošana
		_.each(rr.data, function(cl) {
			const id = `c_${cl.id}`;
			let type = 'Class';
			if ( cl.classification_property != undefined && cl.classification_property != 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
				type = 'Classif';
			}	
			let full_name = `${cl.full_name} (${roundCount(cl.cnt)})`;
			if ( addIds ) full_name = `${full_name} ID-${cl.id}`;
				rezFull.classes[id] = { id:id, super_classes:[], used:false, hasGen:false, type:type, 
					displayName:cl.full_name, fullName:full_name,			
					sup:cl.s, sub:cl.b, atr_list:[], all_atr:[], cnt:cl.cnt };
			//rezFull.classes[id] = { id:cl.id, super_classes:[], sub_classes:[], used:false, used2:false, hasGen:false, isClasif:isClasif, type:type, prefix:cl.prefix, displayName:cl.full_name, cnt:roundCount(cl.cnt),
			//	cnt0:cl.cnt, sup:cl.s, sub:cl.b, fullName:full_name, data_prop:cl.data_prop, object_prop:cl.obj_prop, atr_list:[], atr_list2:[], in_prop:[], out_prop:[],  all_atr:[] };
		});
		
		rr = await this.callServerFunction("xx_getCCInfo", allParams); 
		// DB virsklašu informācijas pielikšana
		for (const cl of rr.data) {	
			const id1 = `c_${cl.class_1_id}`;
			const id2 = `c_${cl.class_2_id}`;
			rezFull.classes[id1].super_classes.push(id2);
			rezFull.classes[id1].used = true;
			rezFull.classes[id2].used = true;
			rezFull.classes[id1].hasGen = true;
			rezFull.classes[id2].hasGen = true;
		}	
		
		rr = await this.callServerFunction("xx_getCPCInfo", allParams); 
		cpc_info = rr.data;
		if ( cpc_info.length > 0 ) has_cpc = true;
		allParams.main.p_list =  p_list.map(v => v.id);
		rr = await this.callServerFunction("xx_getCPInfo", allParams); 
		cp_info = rr.data;
		
		// Propertiju saraksta sākotnējā apstrāde, savāc galus
		for (const p of p_list) {	
			const p_id = `p_${p.id}`;
			const p_name = `${p.prefix}:${p.display_name}`;
		
			const cp_info_p = cp_info.filter(function(cp){ return cp.property_id == p.id && c_list.includes(cp.class_id) && cp.cover_set_index > 0; }); 
			const c_from = cp_info_p.filter(function(cp){ return cp.type_id == 2}); 
			const c_to = cp_info_p.filter(function(cp){ return cp.type_id == 1}); 

			if ( p.max_cardinality == -1 ) 
				p.max_cardinality = '*';
			p_list_full[p_id] = {id:p.id, c_from:c_from, c_to:c_to, p_name:p_name, cnt:p.cnt, object_cnt:p.object_cnt, count:0, max_cardinality:p.max_cardinality};
			
			if ( c_to.length == 1 && p.range_class_id == c_to[0].class_id)  // TODO te varētu būt drusku savādāk, šie ir Aigas atrastie 
				p_list_full[p_id].is_range = 'R';
			else
				p_list_full[p_id].is_range = '';
				
			if ( c_from.length > 0 && p.domain_class_id == c_from[0].class_id)  
				p_list_full[p_id].is_domain = 'D';
			else
				p_list_full[p_id].is_domain = '';
		}
	
		// Funkcija propertijas pielikšanai, tiek izsaukta divās vietās
		function addProperty(pp, c_from, c_to) {
			if ( c_from.length > 0  && c_to.length == 0) {	
				for (const cl of c_from) {
					const cl_id = `c_${cl.class_id}`;
					const p_info = {p_name:pp.p_name, p_id:pp.id, type:'data', cnt:Number(cl.cnt), object_cnt:cl.object_cnt, is_domain:pp.is_domain, max_cardinality:pp.max_cardinality, class_list:[]};
					rezFull.classes[cl_id].atr_list.push(p_info);
					rezFull.classes[cl_id].used = true;
					if ( !rezFull.classes[cl_id].all_atr.includes(pp.id)) rezFull.classes[cl_id].all_atr.push(pp.id);	
				}
			}
			else if ( c_from.length > 0  && c_to.length > 0) {
				for (const c_1 of c_from) {
					const from_id = `c_${c_1.class_id}`;
					// if ( c_1.object_cnt > 0 ) { TODO nez vai šo vajag pārbaudīt?
					let cl_list = c_to.map( c => c.class_id);
					const cpc_i = cpc_info.filter(function(i){ return i.cp_rel_id == c_1.id }); 
					if ( !compView && has_cpc && cpc_i.length > 0 )
						cl_list = cpc_i.map( c => c.other_class_id);
					const p_info = {p_name:pp.p_name, p_id:pp.id, type:'out', cnt:Number(c_1.cnt), object_cnt:c_1.object_cnt, is_domain:pp.is_domain, is_range:pp.is_range, max_cardinality:pp.max_cardinality, class_list:cl_list.sort()};
					rezFull.classes[from_id].atr_list.push(p_info);
					rezFull.classes[from_id].used = true;
					if ( !rezFull.classes[from_id].all_atr.includes(pp.id)) rezFull.classes[from_id].all_atr.push(pp.id);						
				}	
				for (const c_2 of c_to) {
					const to_id = `c_${c_2.class_id}`;
					let cl_list = c_from.map( c => c.class_id);
					const cpc_i = cpc_info.filter(function(i){ return i.cp_rel_id == c_2.id }); 
					if ( !compView && has_cpc && cpc_i.length > 0 )
						cl_list = cpc_i.map( c => c.other_class_id);
					const p_info = {p_name:pp.p_name, p_id:pp.id, type:'in', cnt:Number(c_2.cnt), object_cnt:c_2.object_cnt, is_domain:pp.is_domain, is_range:pp.is_range, class_list:cl_list.sort()};
					rezFull.classes[to_id].atr_list.push(p_info);
					rezFull.classes[to_id].used = true;
				}
			}
		}	
		
		// Pamata propertiju pielikšana
		for (const p of Object.keys(p_list_full)) {	
			const pp = p_list_full[p];
			const c_from = pp.c_from;
			const c_to = pp.c_to;
			addProperty(pp, c_from, c_to);
		}
				
		// Iztūkstošo propertiju pievienošana (pārbaudot arī apkārtni)
		for (const cl of Object.keys(rezFull.classes)) {
			let cl_info = rezFull.classes[cl];

			for (const s of cl_info.sub) {
				if ( s != cl_info.id) {
					cl_info.all_atr = [...new Set([...cl_info.all_atr, ...rezFull.classes[`c_${s}`].all_atr])];
				}
			}
			for (const s of cl_info.sup) {
				if ( s != cl_info.id) {
					cl_info.all_atr = [...new Set([...cl_info.all_atr, ...rezFull.classes[`c_${s}`].all_atr])];
				}
			}
			
			const cp_info_p = cp_info.filter(function(cp){ return cp.class_id == cl_info.id && cp.type_id == 2 && cp.cover_set_index > 0;}).map(cp => cp.property_id); 
			for (const p of cp_info_p) {
				if ( !cl_info.all_atr.includes(p)) {
					console.log('******** Pieliek papildus propertiju ***********', cl_info.fullName, p_list_full[`p_${p}`].p_name)
					const c_from = cp_info.filter(function(cp){ 
						return cp.type_id == 2 && cp.property_id == p && cp.class_id == cl_info.id;
					}); 
					const c_to = cp_info.filter(function(cp){ 
						return cp.type_id == 1 && cp.property_id == p && c_list.includes(cp.class_id) && cp.cover_set_index > 0;
					}); 
					addProperty(p_list_full[`p_${p}`], c_from, c_to);
				}
			}
		} 
		console.log(p_list_full);
		
		// *******************************************
		// Funkcija atribūtu apvienojuma veidošanai
		function makeAtrTree(cl_list) {
			let atrTree = {};
			for (const classInfo of cl_list) {
				for (const atr of classInfo.atr_list ) {
					let prop = `${atr.p_name}_${atr.type}`;
					if ( atrTree[prop] == undefined) {
						if ( atr.type == 'data' ) {
							atrTree[prop] = { class_list:atr.class_list, cnt:atr.cnt, is_domain:atr.is_domain, max_cardinality:atr.max_cardinality, 
								object_cnt:atr.object_cnt, p_id:atr.p_id, p_name:atr.p_name, type:atr.type, count:1};							
						}	
						else {
							atrTree[prop] = { class_list:atr.class_list, cnt:atr.cnt, is_domain:atr.is_domain, is_range:atr.is_range, max_cardinality:atr.max_cardinality, 
								object_cnt:atr.object_cnt, p_id:atr.p_id, p_name:atr.p_name, type:atr.type, count:1};	
						}
					}	
					else {
						atrTree[prop].count = atrTree[prop].count + 1;
						atrTree[prop].cnt = atrTree[prop].cnt + atr.cnt;
						atrTree[prop].object_cnt = atrTree[prop].object_cnt + atr.object_cnt;
						// TODO būtu jāapvieno arī class_list - pagaidām pieņemsim, ka visiem ir vienadi
					}	
				}
			}		
			return atrTree;
		}
		
		// Funkcija klašu grupas izveidošanai, izmanto dažādās situācijās 
		function makeClassGroup(cl_list, sup = []) {
			function addClassGroup(list, sup) {  
				if ( list.length > 1 ) {
					let atr_list = [];
					const atrTree = makeAtrTree(cl_list);
					let c_list_full = [];
					for (const pId of Object.keys(atrTree)) {
						atr_list.push(atrTree[pId]);
					}
					const g_id = `g_${Gnum}`;
					let i = 0;
					for (let classInfo of cl_list )	{
						classInfo.used = false;
						i = i + classInfo.cnt;
						if ( classInfo.isGroup ) {
							for (const cId of classInfo.c_list) {
								let cInfo = rezFull.classes[cId];
								cInfo.G_id = g_id;
								c_list_full.push(cInfo);
							}							
						}
						else {
							classInfo.G_id = g_id;
							c_list_full.push(classInfo);
						}		
					}	
					let fullName = `${c_list_full.sort((a, b) => { return b.cnt - a.cnt; })[0].displayName} et al. G${Gnum} (~${roundCount(i)})`;
					if ( c_list_full.length == 2 )
						fullName = `${c_list_full[0].displayName} or ${c_list_full[1].displayName} G${Gnum} (~${roundCount(i)})`;
					rezFull.classes[g_id] = { id:g_id, super_classes:sup, used:true, hasGen:false, type:list[0].type, 
					displayName:g_id, fullName:fullName, isGroup:true, c_list:c_list_full.map(c => c.id), sub_classes_group_string:c_list_full.map(c => c.fullName).sort().join('\n'),			
					sup:[], sub:[], atr_list:atr_list, all_atr:[], cnt:i }; 

					Gnum = Gnum + 1;
				}
			}
			addClassGroup(cl_list.filter(function(c){ return c.type == 'Class'; }), sup);
			addClassGroup(cl_list.filter(function(c){ return c.type == 'Classif'; }), sup);
		}
		function makeClassGroupFromTree(GroupTree) {
			for (const Gid of Object.keys(GroupTree)) {
				let c_list_full = [];
				for (const cId of GroupTree[Gid]) {
					c_list_full.push(rezFull.classes[cId]);
				}
				makeClassGroup(c_list_full);
			}
		}
		
		//
		let diffInfo = { diff: [0,0,0,0,0,0,0], diff2: [0,0,0,0,0,0,0], sim:[3,2,1]}; 
		for ( const clId1 of Object.keys(rezFull.classes)) {
			for ( const clId2 of Object.keys(rezFull.classes)) {
				const classInfo1 = rezFull.classes[clId1];
				const classInfo2 = rezFull.classes[clId2];
				if ( classInfo1.displayName < classInfo2.displayName ) {
					const diff = getDifference(classInfo1, classInfo2);
					if ( diff[1] < 6 ) { // && diff[0] > diff[1]) 
						diffInfo.diff[diff[1]]++;	
						if (diff[0] > diff[1]) 
							diffInfo.diff2[diff[1]]++;
					}
					if ( diff[1] > 6 && diff[1] < 11 ) { // && diff[0] > diff[1]) 
						diffInfo.diff[6]++;
						if ( diff[0] > diff[1] )
							diffInfo.diff2[6]++;
					}

					if ( diff[0] > diffInfo.sim[0] ) {
						diffInfo.sim[2] = diffInfo.sim[1];
						diffInfo.sim[1] = diffInfo.sim[0];
						diffInfo.sim[0] = diff[0];
					}
					else if ( diff[0] > diffInfo.sim[1] ) {
						diffInfo.sim[2] = diffInfo.sim[1];
						diffInfo.sim[1] = diff[0];
					}	
					else if ( diff[0] > diffInfo.sim[2] )
						diffInfo.sim[2] = diff[0];
					//if ( diff[0] > 10 &&  diff[1] > 0) ***
					//	console.log(diff[0], diff[1], classInfo1.displayName, classInfo2.displayName)
				}
			}
		}

		console.log(diffInfo)

		// Sākotnējo(obligāto) grupu veidošana 
		function makeFirstGroups() {
			// Atrod dažādas klašu grupas, bez atribūtiem, bez vai ar virsklasēm
			let empty_classes = [];
			let empty_sub_classes = {};
			let equivalent_classes = {};
			for (const clId of Object.keys(rezFull.classes)) {
				let classInfo = rezFull.classes[clId];
				if ( classInfo.atr_list.length == 0 && classInfo.super_classes.length == 0 ) {
					empty_classes.push(classInfo);
				}
				if ( classInfo.atr_list.length == 0 && classInfo.super_classes.length == 1 ) {
					if ( empty_sub_classes[classInfo.super_classes[0]] == undefined)
						empty_sub_classes[classInfo.super_classes[0]] = [classInfo];
					else
						empty_sub_classes[classInfo.super_classes[0]].push(classInfo);
				}
			}
			
			// Veido dažādas klašu grupas, bez atribūtiem, bez vai ar virsklasēm
			if ( empty_classes.length > 0 ) {
				makeClassGroup(empty_classes); 
			}
			for (const sup_id of Object.keys(empty_sub_classes)) {
				makeClassGroup(empty_sub_classes[sup_id], [sup_id])
			}
			
			// Veido klašu grupas, skatoties uz atribūtiem, klasēm, kas neietilpst vispārinašanās
			equivalent_classes = findSimilarClasses(0);
			console.log('Ekvivalentās klases', equivalent_classes)
			makeClassGroupFromTree(equivalent_classes);
		}
		if ( diffG > 0 )
			makeFirstGroups()
		
		// Funkcija klašu attāluma izrēķināšanai, ļoti svarīga funkcija ******
		function getDifference(classInfo1, classInfo2) {
			const unused_props = ['skos:altLabel','skos:prefLabel','rdf:type']; 			
			let all_atrs = [];
			if ( classInfo1.id == classInfo2.id ) {
				return [0, 0];
			}
			function getAttrTree(atr_list) {
				let atr_tree = {};  
				for (const a of atr_list) {
					if ( !unused_props.includes(a.p_name) ) {
						const p_id = `${a.p_name}_${a.type}`;
						atr_tree[p_id] = a;
						if ( !all_atrs.includes(p_id) )
							all_atrs.push(p_id);
					}
				}
				return atr_tree;
			}
			const atrTree1 = getAttrTree(classInfo1.atr_list);
			const atrTree2 = getAttrTree(classInfo2.atr_list);
			let Ad = 0;
			let Ao = 0;
			let Bd = 0;
			let Bo = 0;
			for (const aId of all_atrs) {
				if ( atrTree1[aId] != undefined && atrTree2[aId] != undefined) {
					if ( atrTree1[aId].type == 'data') {
						Ad = Ad + Math.sqrt((atrTree1[aId].cnt/classInfo1.cnt)*(atrTree2[aId].cnt/classInfo2.cnt));
					}
					if ( atrTree1[aId].type == 'out' || atrTree1[aId].type == 'in') { 
						Ao = Ao + atrTree1[aId].class_list.length*Math.sqrt((atrTree1[aId].cnt/classInfo1.cnt)*(atrTree2[aId].cnt/classInfo2.cnt));
					}
				}
				else if ( atrTree1[aId] != undefined ) {
					if ( atrTree1[aId].type == 'data') {
						Bd = Bd + Math.sqrt(atrTree1[aId].cnt/Math.sqrt(classInfo1.cnt*(classInfo1.cnt+classInfo2.cnt)));  
					}
					if ( atrTree1[aId].type == 'out' || atrTree1[aId].type == 'in') {
						Bo = Bo + Math.sqrt(atrTree1[aId].cnt/Math.sqrt(classInfo1.cnt*(classInfo1.cnt+classInfo2.cnt)));  
					}
				}
				else if ( atrTree2[aId] != undefined ) {
					if ( atrTree2[aId].type == 'data') {
						Bd = Bd + Math.sqrt(atrTree2[aId].cnt/Math.sqrt(classInfo2.cnt*(classInfo1.cnt+classInfo2.cnt)));  
					}
					if ( atrTree2[aId].type == 'out' || atrTree2[aId].type == 'in') {
						Bo = Bo + Math.sqrt(atrTree2[aId].cnt/Math.sqrt(classInfo2.cnt*(classInfo1.cnt+classInfo2.cnt)));  
					}
				}
			}
			//diff = Ad + Ao - Bd - Bo;
			//return Math.round(diff);
			//console.log(classInfo1.displayName, classInfo2.displayName, Math.round(Ad + Ao), Math.round(Bd + Bo)  )
			return [Math.round(Ad + Ao), Math.round(Bd + Bo)];
		}		
		
		// ***************** Konstantes***************************
		function checkSimilarity(diff, level) {
			let result = false;
			if ( level == 0 ) {
				if ( diff[1] == 0 )
				result = true;
			}
			else if ( level == 1 ) {
				if ( diff[1] < diffG && diff[0] > diff[1] ) // TODO padomāt, vai prasīt līdzību, vai neprasīt
					result = true;
			}
			else if ( level == 2 )  {
				if ( diff[0] > diffS )
					result = true;
			}
			return result;	
		}
		
		// Funkcija, kas pārbauda, vai klases (sarakstus) var apvienot
		function areSimilar( classList1, classList2, level) {
			let rezult = true;
			if ( level > 1 )
				return rezult;
			for ( const c1 of classList1) {
				for ( const c2 of classList2) {
					const classInfo1 = rezFull.classes[c1]; 
					const classInfo2 = rezFull.classes[c2];
					const diff = getDifference(classInfo1, classInfo2);
						if ( diff[0] <= diff[1] )
							rezult = false;
				}
			}
			return rezult;
		}
		// **************************************************	
		
		// Līdzīgo klašu atrašana, vēlāk tiks veidotas grupas (level = 1) vai virsklases (level = 2), printLines = true - beidz pēc līniju savilkšanas
		function findSimilarClasses(level) {
			let temp = {}; // Izmanto kaut kur dziļāk
			function addCount(clId, lId) {
				if ( temp[clId] == undefined )
					temp[clId] = {count:1, lines:[lId]};
				else {
					temp[clId].count = temp[clId].count + 1;
					temp[clId].lines.push(lId);
				}	
			}
			rezFull.lines = {};
			let class_list = []; // Klašu saraksts, kurām meklēs savstarpējās līdzības
			let temp2 = {};	
			let linesList = [];
			for (const clId of Object.keys(rezFull.classes)) {
				let classInfo = rezFull.classes[clId];
				if ( classInfo.atr_list.length > 0 && !classInfo.hasGen && classInfo.used ) {
					class_list.push(classInfo);
				}
			}
			class_list = class_list.sort((a, b) => { return b.cnt - a.cnt; }); 

			// Savelk līnijas starp klasēm
			for ( const classInfo1 of class_list) {
				for ( const classInfo2 of class_list) {
					const diff = getDifference(classInfo1, classInfo2);
					if ( checkSimilarity(diff, level) && classInfo1.cnt < classInfo2.cnt ) {  
						const lId = `l_${classInfo1.id}_${classInfo2.id}`;
						rezFull.lines[lId] = { id:lId, from:classInfo1.id, to:classInfo2.id, sim:diff[0], val:`diff_${diff[0]}_${diff[1]}`, val2:`diff_${diff[0]}_${diff[1]}`, red:'0' };
						linesList.push(rezFull.lines[lId]);
					}
				}
			}
			
			for (const clId of Object.keys(rezFull.classes)) {
				rezFull.classes[clId].gId = '';
			}
			linesList = linesList.sort((a, b) => { return b.sim - a.sim; });
			
			for (const line of linesList) {
				let classInfo1 = rezFull.classes[line.from];
				let classInfo2 = rezFull.classes[line.to];
				if ( classInfo1.gId == '' && classInfo2.gId == '') {
					temp2[line.id] = [classInfo1.id, classInfo2.id];
					classInfo1.gId = line.id;
					classInfo2.gId = line.id;
				}
				if ( classInfo1.gId == '' && classInfo2.gId != '') {
					if ( areSimilar( temp2[classInfo2.gId], [classInfo1.id], level) ) {
						temp2[classInfo2.gId].push(classInfo1.id);
						classInfo1.gId = classInfo2.gId;
					}
					else {
						line.red = '5';
					}
				}
				if ( classInfo1.gId != '' && classInfo2.gId == '') {
					if ( areSimilar( temp2[classInfo1.gId], [classInfo2.id], level) ) {
						temp2[classInfo1.gId].push(classInfo2.id);
						classInfo2.gId = classInfo1.gId;
					}
					else {
						line.red = '5';
					}
				}
				if ( classInfo1.gId != '' && classInfo2.gId != '' && classInfo1.gId != classInfo2.gId ) {
					// console.log('Apvienojam grupas', classInfo1.gId, temp2[classInfo1.gId], classInfo2.gId, temp2[classInfo2.gId])
					if ( areSimilar( temp2[classInfo1.gId], temp2[classInfo2.gId], level) ) {
						const gId2 = classInfo2.gId;
						for (const cl of temp2[classInfo2.gId]) {
							temp2[classInfo1.gId].push(cl);
							rezFull.classes[cl].gId = classInfo1.gId;
						}
						temp2[gId2] = [];
					}
					else {
						line.red = '5';
					}
				}
			}
			
			for (const gId of Object.keys(temp2)) {
				temp = {};
				// Pārskata, cik savāktas grupas ir tuvas pilnajam grafam
				for (const cId1 of temp2[gId]) {
					for (const cId2 of temp2[gId]) {
						if ( cId1 != cId2 ) {
							const lId = `l_${cId1}_${cId2}`;
							if ( rezFull.lines[lId] != undefined ) {
								addCount(cId1, lId);
								addCount(cId2, lId);
							}
						}	
					}
				}
				for (const clId of Object.keys(temp)) {
					if ( temp[clId].count < temp2[gId].length/2 ) {
						temp2[gId].splice(temp2[gId].indexOf(clId), 1);
						for (const lId of temp[clId].lines) {
							rezFull.lines[lId].red = '5';
						}
					}					
				}
				// Savelk trūkstošās līnijas
				for (const cId1 of temp2[gId]) {
					for (const cId2 of temp2[gId]) {
						const classInfo1 = rezFull.classes[cId1];
						const classInfo2 = rezFull.classes[cId2];
						if ( cId1 != cId2 ) {
							const lId1 = `l_${cId1}_${cId2}`;
							const lId2 = `l_${cId2}_${cId1}`;
							if ( rezFull.lines[lId1] == undefined && rezFull.lines[lId2] == undefined) {
								const diff = getDifference(classInfo1, classInfo2);
								if ( diff[0] > diff[1])
									rezFull.lines[lId1] = { id:lId1, from:cId1, to:cId2, val:`diff_${diff[0]}_${diff[1]}`, val2:`diff_${diff[0]}_${diff[1]}`, red:'1' };
								else
									rezFull.lines[lId1] = { id:lId1, from:cId1, to:cId2, val:`diff_${diff[0]}_${diff[1]}`, val2:`diff_${diff[0]}_${diff[1]}`, red:'2' };
							}
						}	
					}
				}
			}
			return temp2;				
		}
	
		// Apvieno tuvās klases grupās
		if ( diffG > 0 ) {
			const similarClassesG = findSimilarClasses(1); // Meklējam līdzīgas klases grupēšanai
			console.log("Līdzīgās klases grupu veidošanai", similarClassesG);
			makeClassGroupFromTree(similarClassesG);
		}

		// Funkcija virsklašu veidošanai
		function makeSupClass(cl_list, temp) {
			const sc_id = `s_${Snum}`;
			const sc_name = `S${Snum}`;  // TODO vārds būs cits
			Snum = Snum + 1;
			let sup_atr_list = [];
			function makeAtrList(atr_list) {
				let r_atr_list = [];
				for (let a of atr_list ) {
					const p = `${a.p_name}_${a.type}`;
					if ( temp[p].count > 1 ) {  // TODO vismaz divām klasēm ir atribūts, ja grib precīzi, tad vajag šādi: temp[p].count == cl_list.length
						if ( sup_atr_list.filter(function(a2){ return a2.p_name == a.p_name && a2.type == a.type}).length == 0 )  
							sup_atr_list.push(a);
					}
					else {
						r_atr_list.push(a);
					}
				}
				return r_atr_list;
			}
			
			rezFull.classes[sc_id] = { id:sc_id, fullName:sc_name, displayName:sc_name, used:true, hasGen:true, type:'Abstract', super_classes:[], c_list:[] };
			
			let g_list = [];	
			for (let classInfo of cl_list) {
				classInfo.super_classes.push(sc_id); 
				classInfo.hasGen = true;
				classInfo.S_id = sc_id;
				if ( classInfo.isGroup ) {
					for (let g_cl of classInfo.c_list) {
						rezFull.classes[g_cl].S_id = sc_id;
					}
				}
				rezFull.classes[sc_id].c_list.push(classInfo.id);
				const atr_list = makeAtrList(classInfo.atr_list);
				classInfo.atr_list = atr_list;
				if ( atr_list.length == 0 ) {
					if ( classInfo.isGroup ) {
						for (let g_cl of classInfo.c_list) {
							rezFull.classes[g_cl].atr_list = [];
							g_list.push(rezFull.classes[g_cl]);
						}						
					}
					else {
						g_list.push(classInfo);
					}
				}
			}
			if ( g_list.length > 1 ) {
				makeClassGroup(g_list, [sc_id])
			}
			rezFull.classes[sc_id].atr_list = sup_atr_list;
		}
		
		// Virsklašu veidošanas daļa
		if ( diffS > 0 ) {
			const similarClassesS = findSimilarClasses(2); // Meklējam līdzīgas klases vispārināšanas veidošanai
			console.log("Līdzīgās klases virsklašu veidošanai", similarClassesS)
			// Cikls pa klašu grupām, uztaisa virsklases   
			for (const k of Object.keys(similarClassesS)) {
				if ( similarClassesS[k].length > 0 ) {
					let c_list_full = [];
					for (const cId of similarClassesS[k]) {
						c_list_full.push(rezFull.classes[cId]);
					}
					const atrTree = makeAtrTree(c_list_full);
					makeSupClass(c_list_full, atrTree);
				}
			}
		}

		if ( calk ) {
			let clCount = 0;
			let grCount = 0;
			let abstrCount = 0;
			for (const clId of Object.keys(rezFull.classes)) {
				const cl_info = rezFull.classes[clId];
				if ( cl_info.used ) {
					clCount++;
					if ( cl_info.isGroup )
						grCount++;
					if ( cl_info.type == 'Abstract' )
						abstrCount++;
				}
			}
			console.log('Klašu skaits ', clCount);
			console.log('Grupu skaits ', grCount);
			console.log('Virsklašu skaits ', abstrCount);
			return;
		}

		
		// Saprot, kur ir īstie asociāciju gali (tas man noderēs)
		function findNewClassList(atr, type) {
			let c_list2 = [];
			for ( const cl of atr.class_list) {
				const cInfo = rezFull.classes[`c_${cl}`];
				if ( cInfo.G_id == undefined && cInfo.S_id == undefined ) {
					c_list2.push(`c_${cl}`);
				}
				if ( cInfo.G_id != undefined && cInfo.S_id == undefined) {
					if ( !c_list2.includes(cInfo.G_id))
						c_list2.push(cInfo.G_id);
				}
				if ( cInfo.S_id != undefined ) {  
					const aa = rezFull.classes[cInfo.S_id].atr_list.filter(function(a){ return a.p_name == atr.p_name && a.type == type}); 
					if ( aa.length > 0) {
						if ( !c_list2.includes(cInfo.S_id))
							c_list2.push(cInfo.S_id);
					}
					else if ( cInfo.G_id != undefined ) {
						if ( !c_list2.includes(cInfo.G_id))
							c_list2.push(cInfo.G_id);
					}
					else {
						c_list2.push(`c_${cl}`);
					}
				}
			}
			return 	c_list2;		
		}
		for (const clId of Object.keys(rezFull.classes)) {
			const classInfo = rezFull.classes[clId];
			if ( classInfo.used) {
				for (const atr of classInfo.atr_list) {
					if ( atr.type == 'out') {
							atr.class_list2 = findNewClassList(atr, 'in',);
					}
					if ( atr.type == 'in') {
						atr.class_list2 = findNewClassList(atr, 'out');
					}
				}
			}
		}		
		
		// Savelk asociācijas
		for (const clId of Object.keys(rezFull.classes)) {
			const classInfo = rezFull.classes[clId];
			if ( classInfo.used) {
				for ( const atr of classInfo.atr_list) {
					if ( atr.type == 'out') {
						for (const to_id of atr.class_list2) {
							// TODO asociācijas redzamā vērtība būs drusku bagātīgāka
							rezFull.assoc[`${clId}_${to_id}_${atr.p_name}`] = {string:atr.p_name, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:clId, to:to_id, removed:false };
						}
					}
				}
			}
		}	
		
		// Saskaita cik vietās propertija ir iezīmēta
		for (const aa of Object.keys(rezFull.assoc)) {
			if ( !rezFull.assoc[aa].removed) {
				p_list_full[rezFull.assoc[aa].p_id].count++;
			}
		}
		for (const pId of Object.keys(p_list_full)) {
			if ( p_list_full[pId].count  > remCount )
			console.log('Propertija netiek vilkta', p_list_full[pId].p_name, p_list_full[pId].count);
		}
		
		for (const aa of Object.keys(rezFull.assoc)) {
			const prop = rezFull.assoc[aa];
			if ( !prop.removed) {
				if ( remBig && p_list_full[prop.p_id].count > remCount ) { 
					prop.removed = true;
				}
			}
		}

		// Funkcija diagrammas izskata sakartošanai
		function makeDiagramData() {
			// Iegūst atribūtu rādāmo izskatu, noder diagrammai
			function getAtrString(atr_info) {
				// TODO te būs daudz sarežģītāk
				let p_name = atr_info.p_name;
				if ( addIds ) 
					p_name = `${p_name}(${atr_info.p_id})`;
				
				return `${p_name} ${atr_info.type} [${roundCount(atr_info.cnt)}]`; 
				//if ( atr_info.type == 'data' )
				//	return `${p_name} ${atr_info.type} [${atr_info.cnt}]`;
				//else	
				//	return `${p_name} ${atr_info.type} [${atr_info.cnt}] (${atr_info.class_list2.length})`;
			}
			
			for (const clId of Object.keys(rezFull.classes)) {
				const classInfo = rezFull.classes[clId];
				if ( classInfo.used )
					classInfo.atr_string = classInfo.atr_list.map( a => getAtrString(a)).sort().join('\n');
			}
			// Savāc kopā asociācijas
			let assoc = {}; 
			for (const aa of Object.keys(rezFull.assoc)) {
				const aInfo = rezFull.assoc[aa];
				if ( !aInfo.removed) {
					const aID = `${aInfo.from}_${aInfo.to}`;
					if ( assoc[aID] != undefined ) {
						assoc[aID].string = `${assoc[aID].string}\n${aInfo.string}`
					}
					else {
						assoc[aID] = {from:aInfo.from, to:aInfo.to, removed:false, string:aInfo.string};
					}
				}	
			}
			rezFull.assoc = assoc;
			console.log(rezFull);
					
		}
		makeDiagramData()
		
		
		// Funkcija diagrammas izdrukāšanai  **** kaut kad nevajadzēs
		function printDiagram() {
			let link = document.createElement("a");
			link.setAttribute("download", "diagr_data.json");
			link.href = URL.createObjectURL(new Blob([JSON.stringify(rezFull, 0, 4)], {type: "application/json;charset=utf-8;"}));
			document.body.appendChild(link);
			link.click();
		}
		function printDiagr(rezFull) {
		// Artūra diagrammas zīmēšana
			const table_representation = { SH:{}, Line3:{}, Gen:{}};
			let count = 0;
			for (const k of Object.keys(rezFull.classes)) {
				const el = rezFull.classes[k];
				if ( el.used ) {
					count = count + 1;
					table_representation.SH[k] = { compartments:{ name:el.fullName, atr_string:el.atr_string, type:el.type, group_string: el.sub_classes_group_string }};
					for (const s of el.super_classes) {
						table_representation.Gen[`${k}_${s}`] = { source:s, target:k, compartments:{}};
					}
				}
			}
			
			for (const k of Object.keys(rezFull.assoc)) {
				const el = rezFull.assoc[k];
				if ( el.removed == false  )
					table_representation.Line3[k] = { source: el.from, target: el.to, compartments:{ name: k, string: el.string}};
			}
			console.log('klašu skaits', count, table_representation)
			Meteor.call("importOntology", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")}, table_representation);
			
		} 
		printDiagram();  // TDA varaints
		printDiagr(rezFull); // Vietējais variants

	},
	getCPName: function(localName, type) {
		//dataShapes.getCPName('http://dbpedia.org/ontology/Year', 'C') 
		if (localName.indexOf('//') == -1 && localName.indexOf(':' ) == -1) {
			let ns = '';
			if (this.schema.schemaType === 'wikidata' && type == 'P')
				ns = 'wdt';
			else
				ns = this.schema.local_ns;
				//ns = this.schema.namespaces.filter(function(n){ return n.is_local == true})[0].name
			localName = `${ns}:${localName}`;
		} 
		const name = this.getIndividualName(localName);
		return name;
	},
	getIndividualName: function(localName, gen = false) {
		//dataShapes.getIndividualName('wd:[Luigi Pirandello (Q1403)]')
		let rez = ''; 
		let prefix = '';
		if (localName.startsWith("="))
			localName = localName.substring(1,localName.length);
		if (localName.startsWith("["))	
			localName = `${this.schema.local_ns}:${localName}`;
			
		function getLastB(name){
			let r = -1; 
			const searchStrLen = 1;
			let startIndex = 0;
			let index;
			while ((index = name.indexOf('(', startIndex)) > -1) {
				r = index;
				startIndex = index + searchStrLen;
			}
			return r;
		}
		if ( localName.indexOf(')]') != -1){
			prefix = localName.substring(0,localName.indexOf(':')); 
			//const name = localName.substring(localName.indexOf('(')+1,localName.length-2);
			const name = localName.substring(getLastB(localName)+1,localName.length-2);
			rez = `${prefix}:${name}`;
		}
		else if (localName.indexOf(']') != -1) {
			prefix = localName.substring(0,localName.indexOf(':'));
			const name = localName.substring(localName.indexOf(':')+2,localName.length-1);	
			rez = `${prefix}:${name}`;			
		}
		else if (localName.indexOf('//') != -1) {
			let name = '';
			_.each(this.schema.namespaces, function(ns) {
				if (localName.indexOf(ns.value) == 0 && localName.length > ns.value.length) {
					name = `${ns.name}:${localName.replace(ns.value,'')}`;
					prefix = ns.name;
				}	
			});
			
			if (name != '') 
				rez = name;
			else
				rez = localName;
		}
		else
			rez = localName;
			
		if ( prefix == '') 
			prefix = rez.substring(0,localName.indexOf(':')); 

		if ( gen && rez.indexOf('/') != -1) {
			_.each(this.schema.namespaces, function(ns) {
				if ( prefix == ns.name )
					rez = `<${ns.value}${rez.replace(ns.name,'').replace(':','')}>`;
			});
		}
		return rez;
	}
};

// ***********************************************************************************

export {
  dataShapes,
}
