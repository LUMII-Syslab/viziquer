import { Interpreter } from '/client/lib/interpreter'
import { Projects, Compartments, CompartmentTypes } from '/libs/platform/collections'

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
	var callText = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${filter}&language=en&limit=${limit}&format=json&origin=*`;
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
};

function isIndividual(individual) {
	if (individual !== null && individual !== undefined && isURI(individual) != 0 && !individual.startsWith("?")) 
		return true;
}

const getPListI = (vq_obj) => {
	var pListI = {};
	var link_list =  vq_obj.getLinks();
	var link_list_filtered = link_list.map( function(l) { var type = (l.start ? 'in': 'out'); return {name:l.link.getName(), t:l.link.getType(), type: type, eE:l.link.obj.endElement, sE:l.link.obj.startElement}});
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
			var eE = new VQ_Element(link.eE);
			var individual =  eE.getInstanceAlias();
			if (isIndividual(individual)) {
				pListI.type = link.type;
				pListI.name = link.name;
				pListI.uriIndividual = dataShapes.getIndividualName(individual);;
			}
		}
		if (link.typeO === 'in' && link.name !== null && link.name !== undefined && link.name !== '++' ) {
			var sE = new VQ_Element(link.sE);
			var individual =  sE.getInstanceAlias();
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
	var pList = {in: [], out: []};
	var field_list = vq_obj.getFields().filter(function(f){ return f.requireValues }).map(function(f) { return {name:f.exp, type: 'out'}});
	_.each(field_list, function(link) {
		if (link.name !== null && link.name !== undefined && link.name.indexOf('@') != -1)
			link.name = link.name.substring(0,link.name.indexOf('@'));		
	})
	if (field_list.length > 0) pList.out = field_list;

	var link_list =  vq_obj.getLinks();

	var link_list_filtered = link_list.map( function(l) { var type = (l.start ? 'in': 'out'); return {name:l.link.getName(), t:l.link.getType(), type: type, eE:l.link.obj.endElement, sE:l.link.obj.startElement}});
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
		
		_.each(pList.in, function(link) {
			var el = new VQ_Element(link.element);
			var class_name = el.getName();
			var individual =  el.getInstanceAlias();
			if (class_name !== null && class_name !== undefined)
				link.className = class_name;			
			if (isIndividual(individual)) 
				link.uriIndividual = dataShapes.getIndividualName(individual);
		})
		
		_.each(pList.out, function(link) {
			if (link.element !== undefined ) {
				var el = new VQ_Element(link.element);
				var class_name = el.getName();
				var individual =  el.getInstanceAlias();
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
	var params = {}
	var individual =  vq_obj.getInstanceAlias();
	if (isIndividual(individual)) 
		params.uriIndividual = dataShapes.getIndividualName(individual);;

	var pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	return params;
}

const findElementDataForProperty = (vq_obj) => {
	var params = {};
	var individual =  vq_obj.getInstanceAlias();
	var class_name = vq_obj.getName();
	if (isIndividual(individual))
		params.uriIndividual = dataShapes.getIndividualName(individual);;
	if (class_name !== null && class_name !== undefined)
		params.className = class_name;

	var pList = {in: [], out: []};	
	//if (dataShapes.schema.use_pp_rels) 
	pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	
	//if (dataShapes.schema.schemaType !== 'wikidata') { // Ir uztaisīts, bet strādā drusku palēni
	//	var pListI = getPListI(vq_obj);
	//	if ( pListI.type != undefined) params.pListI = pListI;
	// }
	
	return params;
}

const findElementDataForIndividual = (vq_obj) => {
	var params = {};
	var class_name = vq_obj.getName();
	if (class_name !== null && class_name !== undefined)
		params.className = class_name;

	if (vq_obj.isIndirectClassMembership())
		params.isIndirectClassMembership = true;

	var pList = getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	
	//if (dataShapes.schema.schemaType !== 'wikidata') {
		var pListI = getPListI(vq_obj);
		if ( pListI.type != undefined) params.pListI = pListI;
	// }
	
	return params;
}

//const sparqlGetIndividualClasses = async (params, uriIndividual) => {
const findPropertiesIds = async (direct_class_role, indirect_class_role, prop_list = []) => {
		var id_list = [];
		async function addProperty(propertyName) {
			if (propertyName != '' && propertyName != undefined && propertyName != null ) {
				var prop = await dataShapes.resolvePropertyByName({name: propertyName});
				if (prop.data.length > 0)
					id_list.push(prop.data[0].id);
			}
		}
		
		await addProperty(direct_class_role);
		await addProperty(indirect_class_role);
		for (var element of prop_list) {
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

const classesWD = [
'All classes',
'[scholarly article (Q13442814)]', 
'[Wikimedia category (Q4167836)]', 
'[star (Q523)]', 
'[galaxy (Q318)]',
'[street (Q79007)]', 
'[painting (Q3305213)]', 
'[mountain (Q8502)]', 
'[collection (Q2668072)]', 
'[family name (Q101352)]', 
'[river (Q4022)]', 
'[hill (Q54050)]', 
'[building (Q41176)]', 
'[album (Q482994)]', 
'[film (Q11424)]', 
'[lake (Q23397)]', 
'[literary work (Q7725634)]', 
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
dataShapes = {
	schema : getEmptySchema(),
	clearSchema : function() {
		this.schema = getEmptySchema();
	},
	getOntologies : async function() {
		//dataShapes.getOntologies()
		var rr = await callWithGet('info/');

		if (!_.isEmpty(rr)) {
			rr.unshift({display_name:""});
			// *** console.log(rr)
			return await rr;
		}

		return NaN;
	},
	getPublicNamespaces : async function() {
		var rr = await callWithGet('public_ns/');
		if (!_.isEmpty(rr)) {
			this.schema.namespaces = rr;
			return await rr;
		}

		return NaN;
	},
	changeActiveProject : async function(proj_id) {
		//console.log('------changeActiveProject-------')
		var proj = Projects.findOne({_id: proj_id});
		//this.schema = getEmptySchema();
		if (proj !== undefined) {
			await this.changeActiveProjectFull(proj);
		}
	},
	changeActiveProjectFull : async function(proj) {
		//console.log('------changeActiveProjectFull-------')
		var projectId_in_process = this.schema.projectId_in_process;
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
				
				var info = await callWithGet('info/');
				if (info.filter(function(o){ return o.display_name == proj.schema}).length > 0) {
					var schema_info = info.filter(function(o){ return o.display_name == proj.schema})[0];
					this.schema.schema = schema_info.db_schema_name;
					this.schema.schemaType = schema_info.schema_name;
					this.schema.use_pp_rels = schema_info.use_pp_rels;
					this.schema.simple_prompt = schema_info.simple_prompt;
					this.schema.hide_individuals = schema_info.hide_instances;
					var prop_id_list = await findPropertiesIds(schema_info.direct_class_role, schema_info.indirect_class_role);
					if (prop_id_list.length>0)
						this.schema.deferred_properties = `id in ( ${prop_id_list})`;
					
					var ns = await this.getNamespaces_0();
					this.schema.namespaces = ns;
					var local_ns = ns.filter(function(n){ return n.is_local == true});
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
						var prop_id_list2 = await findPropertiesIds(schema_info.direct_class_role, schema_info.indirect_class_role, ['owl:sameAs', 'prov:wasDerivedFrom']);
						this.schema.deferred_properties = `display_name LIKE 'wiki%' or id in ( ${prop_id_list2})`;
					}
					else if (this.schema.schemaType === 'wikidata') {   
						this.schema.tree.class = 'All classes';
						this.schema.tree.classes = [];
					}
					else if (!this.schema.hide_individuals) {
						var clFull = await dataShapes.getTreeClasses({main:{treeMode: 'Top', limit: MAX_TREE_ANSWERS}});
						var c_list = clFull.data.map(v => `${v.prefix}:${v.display_name}`)
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
		startTime = Date.now();
		var s = this.schema.schema;
		
		if (s === "" || s === undefined ) {
			await this.changeActiveProject(Session.get("activeProject"));
			s = this.schema.schema;
		}

		// *** console.log(params)
		var rr = {complete: false, data: [], error: "DSS schema not found"};
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
			var rr = await this.callServerFunction("getNamespaces", {main:params});
			this.schema.namespaces = rr;
			return rr;
		} 
	},
	getNamespaces_0 : async function(params = {}) {
		var rr = await this.callServerFunction("getNamespaces", {main:params});
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
		if ( params.main.filter !== undefined) 
			params.main.filter = params.main.filter.replaceAll(' ','');
			
		return await this.callServerFunction("getClasses", params);
	},
	getTreeClasses : async function(params) {
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
			if (this.schema.treeTopsC[nsString] !== undefined && this.schema.treeTopsC[nsString].error != undefined) {
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
		params.deferred_properties = this.schema.deferred_properties;
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
		// *** dataShapes.getProperties({main:{propertyKind:'Object'}, element:{className: 'dbo:Tenure'}})
		// *** dataShapes.getProperties({main:{propertyKind:'ObjectExt'}, element: { className:'umbel-rc:Crater'}})
		// *** dataShapes.getProperties({main:{propertyKind:'Connect'}, element:{className: 'CareerStation'}, elementOE:{otherEndClassName:'umbel-rc:Crater'}})
		// *** dataShapes.getProperties({main:{propertyKind:'All', orderByPrefix: 'case when ns_id = 2 then 0 else 1 end desc,'}, element:{className: 'CareerStation'}})
		params.main.deferred_properties = this.schema.deferred_properties;
		return await this.callServerFunction("getProperties", params);
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
			var nList = [];
			nList.push(params.propertyKind);
			if ( params.basicOrder !== undefined && params.basicOrder )
				nList.push('Basic');
			else
				nList.push('Full');
			nList.push(params.limit);
			return nList.join('_');
		}
		var rr;
		if ( params.filter === undefined || params.filter === '' ) {
			var tName = makeTreeName(params);
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
		var faasEnabled = await faas.isEnabled();
		// *** console.log("------------getIndividuals ------------------")
		//dataShapes.getIndividuals({filter:'Julia'}, new VQ_Element(Session.get("activeElement")))
		var rr;

		if (this.schema.schemaType == 'wikidata' && params.filter != undefined && faasEnabled == false)
			return await this.getIndividualsWD(params.filter); 
		
		//if (this.schema.schemaType === 'wikidata') // TODO pagaidām filtrs ir atslēgts
		//	params.filter = '';  

		var allParams = {main: params};
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
		var rr = await callWithGetWD(filter, MAX_IND_ANSWERS);
		if (rr.success == 1) {
			var rez = _.map(rr.search, function(p) {
				var localName = `wd:[${p.label} (${p.id})]`;				
				return localName;
			});
			return rez;
		}
		else
			return [];

	},
	getTreeIndividuals : async function(params = {}, className) {
		// *** console.log("------------getTreeIndividuals ------------------")
		var rr = [];
		var allParams = {main: params, element:{className: className}};	
		
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
		var rr = await callWithGetWD(filter, MAX_IND_ANSWERS);
		if (rr.success == 1) {
			var rez = _.map(rr.search, function(p) {
				// TODO jāpaskatās, kāds īsti ir ns
				var localName = `wd:[${p.label} (${p.id})]`;				
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
		var rr;
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
		var rr;
		
		if (this.schema.resolvedIndividuals[params.name] !== undefined || this.schema.resolvedIndividualsF[params.name] !== undefined) {
			if (this.schema.resolvedIndividuals[params.name] !== undefined)
				rr = { complete:true, data: [this.schema.resolvedIndividuals[params.name]]};
			if (this.schema.resolvedIndividualsF[params.name] !== undefined)
				rr = { complete:false, data: []};
		}
		else {
			if (this.schema.schemaType === 'wikidata' &&  params.name.indexOf('//') == -1) {
				var prefix = params.name.substring(0, params.name.indexOf(':')+1);
				var iri = '';
				_.each(this.schema.namespaces, function(n) {
					if (params.name.indexOf(n.name) == 0 && prefix.length == n.name.length + 1)
						iri = params.name.replace(':','').replace(n.name,n.value);
				});
				var name= params.name.substring(params.name.indexOf(':')+1, params.name.length);
				var individuals = await this.getTreeIndividualsWD(name);

				if (individuals.length > 0) { 
					var rez = {};
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
		var rr = await this.callServerFunction("generateClassUpdate", {main: {label_name: label_name}});
		//console.log(rr);
		if (rr.data.length > 0) {
			var link = document.createElement("a"); 
			link.setAttribute("download", "Update.sql");
			link.href = URL.createObjectURL(new Blob([rr.data.join("\r\n")], {type: "application/json;charset=utf-8;"}));
			document.body.appendChild(link);
			link.click();
		}
	},
	tt : function (all = 1) {
		var el = new VQ_Element(Session.get("activeElement"));
		//var comparts = Compartments.find({elementId: el._id()}, {sort: {index: 1}}).fetch();
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
		var el = new VQ_Element(Session.get("activeElement"));
		console.log(el.getCoordinates());
	},
	tt3 : async function () {
	console.log("***************************")

	
	},
	test : async function () {
		//await this.callServerFunction("xxx_test", {main: {}});
		const pp = 'wdt:P31/wdt:P279*'
		console.log('**************************')
		var ll = pp.split('/');
		var rez = [];
		ll.forEach(l => { rez.push(l.split('*')); })
		console.log(rez)
		//console.log(pp.split('*'))
		//console.log(pp.split('/'))

	},
	printLog : function() {
		if ( this.schema.log.length > 0 ) {
			var link = document.createElement("a"); 
			link.setAttribute("download", "LOG.txt");
			link.href = URL.createObjectURL(new Blob([this.schema.log.join("\r\n")], {type: "application/json;charset=utf-8;"}));
			document.body.appendChild(link);
			link.click();
		}
		if ( this.schema.fullLog.length > 0 ) {
			var link2 = document.createElement("a"); 
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
		var rr = [];
		var allParams = {main: { limit: par.class_count_limit, class_ind:par.class_ind, isLocal: par.only_local, not_in:par.not_in }};
		allParams.main.not_in = allParams.main.not_in.map(v => this.schema.namespaces.filter(function(n){ return n.name == v})[0].id); // TODO būs jāpapildina
		rr = await this.callServerFunction("xx_getClassList", allParams);
		//console.log(rr)
		return rr.data;

		//var c_list = rr.data.map(v => v.id);
		//return c_list;		
	},
	getClassCount: async function() {
		rr = await this.callServerFunction("xx_getClassCount", {main:{}});
		return rr; 
	},
	makeDiagr : async function(c_list, p_list, superclassType, connectDataClases, addAllProp, remSmall, addIds, disconnBig, compView, schema, info ) {
		// Tiek padots zīmējamo klašu un propertiju saraksts
		var rr;
		var remBig = disconnBig > 0;
		var remCount = disconnBig; 
		var rezFull = {classes:{}, assoc:{}, schema:schema, info:info};
		var allParams = {main: { c_list: `${c_list}`, limit:c_list.length}};
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
			var id = `c_${cl.id}`;
			var isClasif = false;
			var type = 'Class';
			if ( cl.classification_property != undefined && cl.classification_property != 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
				isClasif = true;
				type = 'Classif';
			}	
			var full_name = `${cl.full_name} (${roundCount(cl.cnt)})`;
			if ( addIds ) full_name = `${full_name} ID-${cl.id}`;
			rezFull.classes[id] = { id:cl.id, super_classes:[], sub_classes:[], used:false, used2:false, hasGen:false, isClasif:isClasif, type:type, prefix:cl.prefix, displayName:cl.full_name, cnt:roundCount(cl.cnt),
				cnt0:cl.cnt, sup:cl.s, sub:cl.b, fullName:full_name, data_prop:cl.data_prop, object_prop:cl.obj_prop, atr_list:[], atr_list2:[], in_prop:[], out_prop:[],  all_atr:[] };
		});
		
		rr = await this.callServerFunction("xx_getCCInfo", allParams); 
		// DB virsklašu informācijas pielikšana
		for (var cl of rr.data) {	
			var id1 = `c_${cl.class_1_id}`;
			var id2 = `c_${cl.class_2_id}`;
			rezFull.classes[id1].super_classes.push(id2);
			rezFull.classes[id2].used = true;
			rezFull.classes[id1].hasGen = true;
			rezFull.classes[id2].hasGen = true;
		}
		
		var p_list_full = {};
		var super_classes = {};	
		// Funkcija potenciālo virsklašu veidošanai
		function add_superclass (sc_list, prop_name) {
			sc_id = `c_${sc_list.join('_')}`;
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
		var has_cpc = false;
		if ( cpc_info.length > 0 ) has_cpc = true;
		allParams.main.p_list =  p_list.map(v => v.id);
		rr = await this.callServerFunction("xx_getCPInfo", allParams); 
		var cp_info = rr.data;
		
		// Mazo propertiju noņemšana, ja ir uzstādīts dotais parametrs
		if ( remSmall > 0 ) {
			var tt = [];
			for (var ii of cp_info) {
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
		for (var p of p_list) {	
			var p_id = `p_${p.id}`;
			var p_name = `${p.prefix}:${p.display_name}`;
			if ( addIds ) 
				p_name = `${p_name}(${p.id})`;
		
			var cp_info_p = cp_info.filter(function(cp){ return cp.property_id == p.id && c_list.includes(cp.class_id) && cp.cover_set_index > 0; }); 
			var c_from = cp_info_p.filter(function(cp){ return cp.type_id == 2}); 
			var c_to = cp_info_p.filter(function(cp){ return cp.type_id == 1}); 

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
				var id = `c_${cl.class_id}`;
				var p_info = {p_name:pp.p_name, p_id:pp.id, class_name:class_name,  cnt:-1, object_cnt:object_cnt, is_domain:pp.is_domain, max_cardinality:pp.max_cardinality};
				rezFull.classes[id].atr_list.push(p_info);
				rezFull.classes[id].used = true;
				if ( !rezFull.classes[id].all_atr.includes(pp.id)) rezFull.classes[id].all_atr.push(pp.id);				
			}
			
			if ( c_from.length > 0  && c_to.length == 0) {
				for (var cl of c_from) {
					var id = `c_${cl.class_id}`;
					var class_name = ( cl.object_cnt > 0 ) ? '-> IRI' : '';	
					addAttribute(cl, pp, class_name);
				}
			}
			else if ( c_from.length > 0  && c_to.length > 0) {
				var temp_info = {sources:{}, targets:{}};
				for (var c_1 of c_from) { 
					temp_info.sources[c_1.class_id] = 0; 
				}
				for (var c_2 of c_to) { 
					temp_info.targets[c_2.class_id] = 0; 
				}
				for (var c_1 of c_from) {
					var from_id = `c_${c_1.class_id}`;
					var addedToAtr = false;
					if ( c_1.object_cnt > 0 ) {
						for (var c_2 of c_to) {
							var to_id = `c_${c_2.class_id}`;
							var cnt = -1;
							var cpc_i = cpc_info.filter(function(i){ return i.cp_rel_id == c_1.id && i.other_class_id == c_2.class_id});
							if ( has_cpc && cpc_i.length > 0 || !has_cpc) {  // Ja ir cpc, tad netiek ielikts tas klašu pāris, kura nav. Ja nu ir kāds iztrūkstošs pāris.
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
									var is_domain = pp.is_domain;
									var is_range = pp.is_range;
									if ( c_from.length == 1 && c_1.object_cnt == pp.cnt)
										is_domain = 'D';  // TODO Šim vispār jau pie Aigas būtu jābūt korekti sarēķinātam
									if ( c_to.length == 1 && cnt == pp.cnt)
										is_range = 'R';  
									var id = `c_${c_1.class_id}_c_${c_2.class_id}_${pp.p_name}`;
									var p_info = {p_name:pp.p_name, p_id:`p_${pp.id}`, id:pp.id, cnt:cnt, is_range:is_range, is_domain:is_domain, max_cardinality:pp.max_cardinality}
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
				var rr1;
				var ok = true;
				for (var cc of Object.keys(temp_info.targets)) {
					if ( temp_info.targets[cc] != c_from.length)
						ok = false;
				}
				if ( superclassType > 1  && c_from.length > 1 && ok ) { // ***
					rr1 = c_from.map( v => { return v.class_id});
					add_superclass (rr1, pp.p_name);
				}
				ok = true;
				for (var cc of Object.keys(temp_info.sources)) {
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
		for (var p of Object.keys(p_list_full)) {	
			var pp = p_list_full[p];
			var c_from = pp.c_from;
			var c_to = pp.c_to;
			addProperty(pp, c_from, c_to);
		}
	
		// Iztūkstošo propertiju pievienošana (pārbaudot arī apkārtni), skatās arī uz parametru
		var val = (addAllProp) ? -1 : 0;	
		for (var cl of Object.keys(rezFull.classes)) {
			cl_info = rezFull.classes[cl];
			if ( cl_info.type != 'Abstract') {
				for (var s of cl_info.sub) {
					if ( s != cl_info.id) {
						cl_info.all_atr = [...new Set([...cl_info.all_atr, ...rezFull.classes[`c_${s}`].all_atr])];
					}
				}
				for (var s of cl_info.sup) {
					if ( s != cl_info.id) {
						cl_info.all_atr = [...new Set([...cl_info.all_atr, ...rezFull.classes[`c_${s}`].all_atr])];
					}
				}
				
				var cp_info_p = cp_info.filter(function(cp){ return cp.class_id == cl_info.id && cp.type_id == 2 && cp.cover_set_index > val;}).map(cp => cp.property_id); // TODO - Te ir jautājums par cover set (tagad var no saskarnes pamainīt)
				for (var p of cp_info_p) {
					if ( !cl_info.all_atr.includes(p)) {
						console.log('******** Pieliek papildus propertiju ***********', cl_info.fullName, p_list_full[`p_${p}`].p_name)
						var c_from = cp_info.filter(function(cp){ 
							return cp.type_id == 2 && cp.property_id == p && cp.class_id == cl_info.id;
						}); 
						var c_to = cp_info.filter(function(cp){ 
							return cp.type_id == 1 && cp.property_id == p && c_list.includes(cp.class_id) && cp.cover_set_index > 0;
						}); 
						var c_to_full = cp_info.filter(function(cp){ 
							return cp.type_id == 1 && cp.property_id == p && c_list.includes(cp.class_id);
						}); 
						addProperty(p_list_full[`p_${p}`], c_from, c_to);
					}
				}
			
			}			
		} 
		
		console.log("*** super_classes ***", super_classes)
		// Pieliek abstraktās virsklases pie klasēm 
		var temp = {};
		var super_classes_list = [];
		for (var sc of Object.keys(super_classes)) {
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
		for (var sc1 of super_classes_list) {	
			for (var sc2 of super_classes_list) {	
				if ( sc1.cl_list.length < sc2.cl_list.length ) {
					var ii = 0;
					for (var c of sc1.cl_list) {
						if ( sc2.cl_list.includes(c) )
							ii = ii+1;
					}
					if ( ii == sc1.cl_list.length) {
						var cl_list = [];
						for (var c of sc2.cl_list) {
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
		for (var super_class of super_classes_list) {
			var sc = super_class.id;
			rezFull.classes[sc] = { id:super_class.id0, fullName:'', used:true, used2:true, hasGen:true, type:'Abstract', cl_list: super_class.cl_list_orig, super_classes:[], sub_classes:[],
									atr_list:[], atr_list2:[], in_prop:[], out_prop:[], all_atr:[] };
			var sc_list = [];
			for (var c of super_class.cl_list) {
				rezFull.classes[`c_${c}`].super_classes.push(sc); 
				rezFull.classes[`c_${c}`].hasGen = true;
				sc_list.push(rezFull.classes[`c_${c}`]);
			}

			sc_list = sc_list.sort((a, b) => { return b.cnt0 - a.cnt0; });
			var n_list = [];				
			for (var c of sc_list) {
				n_list.push(c.displayName);
			}
			
			rezFull.classes[sc].subClasses = sc_list.map(c => c.fullName).join('\n');
			rezFull.classes[sc].fullName = n_list.join(' or ');
			rezFull.classes[sc].displayName = n_list.join(' or ');	
		}
		
		// kopējo atribūtu pārvietošana pie virsklases
		for (var super_class of super_classes_list) {	
			var sc = super_class.id;
			var atr_tree = {};
			for (var c of super_class.cl_list) {
				for (var atr of rezFull.classes[`c_${c}`].atr_list ) {
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

			for (var atr of Object.keys(atr_tree)) {	
				if ( atr_tree[atr].count == super_class.cl_list.length) {
					rezFull.classes[sc].atr_list.push(atr_tree[atr].info);
				}
			}
			
			for (var c of super_class.cl_list) {
				var atr_list = [];
				for (var atr of rezFull.classes[`c_${c}`].atr_list ) {
					if ( atr_tree[atr.p_name].count != super_class.cl_list.length) {
						atr_list.push(atr);
					}
				}
				rezFull.classes[`c_${c}`].atr_list = atr_list;
			}
		}

		// kopējo ienākošo propertiju pārvietošana pie virsklases
		for (var super_class of super_classes_list) {	
			var sc = super_class.id;
			var atr_tree = {};
			for (var c of super_class.cl_list) {
				for (var atr of rezFull.classes[`c_${c}`].in_prop ) {
					var assoc = rezFull.assoc[atr];
					if ( !assoc.removed ) {
						var p_name = `${assoc.from}_${assoc.list[0].p_name}`;
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

			for (var atr of Object.keys(atr_tree)) {	
				if ( atr_tree[atr].count == super_class.cl_list.length) {
					for (var p_id of atr_tree[atr].id_list) {
						rezFull.assoc[p_id].removed = true;
					}
					rezFull.classes[atr_tree[atr].info.from].out_prop.push(atr_tree[atr].p_name);
					rezFull.classes[atr_tree[atr].info.to].in_prop.push(atr_tree[atr].p_name);
					rezFull.assoc[atr_tree[atr].p_name] = atr_tree[atr].info;
				}
			}
		}
		
		// kopējo izejošo propertiju pārvietošana pie virsklases
		for (var super_class of super_classes_list) {
			var sc = super_class.id;
			var atr_tree = {};
			for (var c of super_class.cl_list) {
				for (var atr of rezFull.classes[`c_${c}`].out_prop ) {
					var assoc = rezFull.assoc[atr];
					if ( !assoc.removed) {
						var p_name = `${assoc.to}_${assoc.list[0].p_name}`;
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

			for (var atr of Object.keys(atr_tree)) {	
				if ( atr_tree[atr].count == super_class.cl_list.length) {
					for (var p_id of atr_tree[atr].id_list) {
						rezFull.assoc[p_id].removed = true;
					}
					rezFull.classes[atr_tree[atr].info.to].in_prop.push(atr_tree[atr].p_name);
					rezFull.classes[atr_tree[atr].info.from].out_prop.push(atr_tree[atr].p_name);
					rezFull.assoc[atr_tree[atr].p_name] = atr_tree[atr].info;
				}
			}
		}

		// Saskaita, cik vietās ir propertija iezīmēta
		for (var aa of Object.keys(rezFull.assoc)) {
			if ( !rezFull.assoc[aa].removed) {
				var pId = rezFull.assoc[aa].list[0].p_id;
				p_list_full[pId].count = p_list_full[pId].count + 1;
			}
		}
		
		// Propertijas atvienošana
		function disconnectProp(prop) {
			var c_from = rezFull.classes[prop.from];	
			var c_to = rezFull.classes[prop.to];	
			var pr = prop.list[0];
			var p_id = pr.p_id.substring(2,pr.p_id.length);
			if ( rezFull.classes[prop.from].type != 'Abstract' && rezFull.classes[prop.to].type != 'Abstract') {
				c_to.atr_list2.push({p_name:pr.p_name, class_name:c_from.displayName}); 
				c_from.atr_list.push({p_name:pr.p_name, p_id:p_id, cnt:-1, object_cnt:pr.cnt, class_name:`-> ${c_to.displayName}`,
						max_cardinality:pr.max_cardinality, is_domain:pr.is_domain});
			}
			if ( rezFull.classes[prop.from].type == 'Abstract' && rezFull.classes[prop.to].type != 'Abstract') {
				var c_from_id_list = rezFull.classes[prop.from].cl_list.map(i => `c_${i}`);
				c_from.atr_list.push({p_name:pr.p_name, p_id:p_id, cnt:-1, object_cnt:pr.cnt, class_name:`-> ${c_to.displayName}`,
						max_cardinality:pr.max_cardinality, is_domain:pr.is_domain});
				for (var from_id of c_from_id_list) {
					var c_from_sub = rezFull.classes[from_id];
					c_to.atr_list2.push({p_name:pr.p_name, class_name:c_from_sub.displayName}); 
				}
			}
			if ( rezFull.classes[prop.from].type != 'Abstract' && rezFull.classes[prop.to].type == 'Abstract') {
				var c_to_id_list = rezFull.classes[prop.to].cl_list.map(i => `c_${i}`);
				c_to.atr_list2.push({p_name:pr.p_name, class_name:c_from.displayName}); 
				for (var to_id of c_to_id_list) {
					var c_to_sub = rezFull.classes[to_id];
					c_from.atr_list.push({p_name:pr.p_name, p_id:p_id, cnt:-1, object_cnt:pr.cnt, class_name:`-> ${c_to_sub.displayName}`,
								max_cardinality:pr.max_cardinality, is_domain:pr.is_domain});
				}
			}
			if ( rezFull.classes[prop.from].type == 'Abstract' && rezFull.classes[prop.to].type == 'Abstract') {
				var c_from_id_list = rezFull.classes[prop.from].cl_list.map(i => `c_${i}`);
				var c_to_id_list = rezFull.classes[prop.to].cl_list.map(i => `c_${i}`);
				for (var from_id of c_from_id_list) {
					for (var to_id of c_to_id_list) {
						var c_from_sub = rezFull.classes[from_id];
						var c_to_sub = rezFull.classes[to_id];
						c_from.atr_list.push({p_name:pr.p_name,  p_id:p_id, cnt:-1, object_cnt:pr.cnt, class_name:`-> ${c_to_sub.displayName}`,
								max_cardinality:pr.max_cardinality, is_domain:pr.is_domain});
						c_to.atr_list2.push({p_name:pr.p_name, class_name:c_from_sub.displayName}); 
					}
				}
			}
		}
		
		// Ievelk daudzgalu propertijas klasēs
		for (var aa of Object.keys(rezFull.assoc)) {
			var prop = rezFull.assoc[aa];
			if ( !prop.removed) {
				if ( remBig && p_list_full[prop.list[0].p_id].count > remCount) { 
					prop.removed = true;
					disconnectProp(prop);
				}
			}
		}
		
		// Apstrādā tās klases, kurām nav izejošo propertiju, atvieno, ja ir vajadzīgais parametrs
		for (var clId of Object.keys(rezFull.classes)) {
			var cl = rezFull.classes[clId];
			if ( !cl.hasGen && !cl.isClasif && cl.out_prop.length == 0) { // !cl.hasGen &&
				cl.type = 'Data';
				if ( !connectDataClases ) {
					for (var p of cl.in_prop) {
						var prop = rezFull.assoc[p];
						if ( !prop.removed) {
							prop.removed = true;
							disconnectProp(prop);
						}
					}
				}
			}
		}
		
		// Pārbauda klašu aktuālo saistību ar citām
		for (var aa of Object.keys(rezFull.assoc)) {
			var prop = rezFull.assoc[aa];
			if ( !prop.removed) {
				rezFull.classes[prop.from].used2 = true;	
				rezFull.classes[prop.to].used2 = true;
			}
		}
		
		// Savāc 'plānās' apakšklases pie virsklases TODO varētu būt 'plānas' arī klases zem abstraktajām
		for (var cl of Object.keys(rezFull.classes)) {
			if ( !rezFull.classes[cl].used ) {
				if ( rezFull.classes[cl].super_classes.length == 1 ) {
					var sc = rezFull.classes[cl].super_classes[0];
					//rezFull.classes[sc].sub_classes.push(rezFull.classes[cl].fullName);
					rezFull.classes[sc].sub_classes.push(rezFull.classes[cl]);
				}
				else
					rezFull.classes[cl].used = true;
			}
		}
		
		// Funkcija kompaktā atribūtu saraksta izveidošanai
		function getCompactAtrList (atr_list, type, class_id = 0) {
			var comp_atr_list = [];
			var temp = {};
			var temp2 = {};
			if ( type == 'out') {
				for (var a of atr_list) {
					var ii = `${a.p_name}#${a.p_id}`;
					var ii2 = `${a.p_name}_${a.p_id}_${a.class_name}`;
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
				for (var t of Object.keys(temp)) {
					if ( temp[t].length > 1) {
						var p_id = t.split('#')[1];
						if ( class_id >  0) {
							var prop = p_list_full[`p_${p_id}`];
							var cl_info = prop.c_from.filter(function(i){ return i.class_id == class_id});
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
				for (var a of atr_list) {
					var ii = a.p_name;
					if( temp[ii] == undefined ) {
						temp[ii] = 1;
						temp2[ii] = a;
					}
					else
						temp[ii] = temp[ii] + 1;
				}
				for (var t of Object.keys(temp)) {
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

		for (var cl of Object.keys(rezFull.classes)) {
			var classInfo = rezFull.classes[cl];   
			rezFull.classes[cl].sub_classes_group_string = '';
		}
		
		// Vientuļo klašu apstrāde pilno atribūtu gadījumam 
		if ( !compView ) {
			// Savāc vientuļo klašu atribūtus, meklē līdzīgās (pirmā iterācija)
			var temp = {};
			for (var clId of Object.keys(rezFull.classes)) {
				var classInfo = rezFull.classes[clId];
				if ( !classInfo.used2 && !classInfo.hasGen && !classInfo.isClasif ) {
					classInfo.type = 'Data';
					var atr_list = [];
					for (var a of classInfo.atr_list) {
						var aa = {p_name:a.p_name, p_id:a.p_id, cnt:-1, object_cnt:-1, class_name:a.class_name, is_domain:'', max_cardinality:'*'};
						atr_list.push(aa);
					}
					var cc = [classInfo.atr_list.map(n => `${n.p_name} ${n.class_name}`).sort().join('\n')];
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
			var temp2 = {};
			for (var t of Object.keys(temp)) {
				var cc = [getCompactAtrList(temp[t].atr_list, 'out').map(n => `${n.p_name}`).sort().join('\n')];
				cc.push(getCompactAtrList(temp[t].atr_list2,'in').map(n => `${n.p_name}`).sort().join('\n'));
				cc = cc.join('\n');
				if ( temp2[cc] == undefined )
					temp2[cc] = [`c_${temp[t].class_list[0]}`];
				else
					temp2[cc].push(`c_${temp[t].class_list[0]}`);	
				if (temp[t].class_list.length > 1 ) {
					var cl_list = [];
					for (var cl_id of temp[t].class_list) {
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
			for (var t of Object.keys(temp2)) {
				if ( temp2[t].length > 1 ) {
					var sc = `c_${temp2[t].join('_')}`;
					rezFull.classes[sc] = { id:`${temp2[t].join('_')}`, fullName:'', displayName:'', used:true, used2:true, hasGen:true, type:'Abstract', super_classes:[], sub_classes:[],
											atr_list:[], atr_list2:[], in_prop:[], out_prop:[], all_atr:[] };
					for (var c of temp2[t]) {
						rezFull.classes[c].super_classes.push(sc); 
						rezFull.classes[c].hasGen = true;
					}
				}
			}
		}

		// Vientuļo klašu apstrāde kompakto atribūtu gadījumam 
		if ( compView ) {
			// Savāc vientuļo klašu atribūtus, meklē līdzīgās 
			var temp = {};
			for (var clId of Object.keys(rezFull.classes)) {
				var classInfo = rezFull.classes[clId];
				if ( !classInfo.used2 && !classInfo.hasGen && !classInfo.isClasif ) {
					classInfo.type = 'Data';
					classInfo.free = true;
					var atr_list = getCompactAtrList(classInfo.atr_list, 'out');
					var atr_list2 = getCompactAtrList(classInfo.atr_list2, 'in');
					var cc = [atr_list.map(n => n.p_name).sort().join('\n')];
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
			for (var t of Object.keys(temp)) {
				if (temp[t].class_list.length > 1 ) {
					console.log("****",t, temp[t])
					var cl_list = [];
					var atr_list = [];
					var atr_list2 = [];
					for (var cl_id of temp[t].class_list) {
						cl_list.push(rezFull.classes[`c_${cl_id}`].fullName);
						rezFull.classes[`c_${cl_id}`].used = false;
						atr_list = [...new Set([...atr_list, ... rezFull.classes[`c_${cl_id}`].atr_list ])];
						atr_list2 = [...new Set([...atr_list2, ...rezFull.classes[`c_${cl_id}`].atr_list2 ])];
					}
					rezFull.classes[`c_${temp[t].class_list[0]}`].sub_classes_group_string = cl_list.sort().join('\n');
					//rezFull.classes[`c_${temp[t].class_list[0]}`].id = `a_${rezFull.classes[`c_${temp[t].class_list[0]}`].id}`;
					rezFull.classes[`c_${temp[t].class_list[0]}`].used = true; 
					rezFull.classes[`c_${temp[t].class_list[0]}`].atr_list3 = atr_list;
					rezFull.classes[`c_${temp[t].class_list[0]}`].atr_list4 = atr_list2;
					rezFull.classes[`c_${temp[t].class_list[0]}`].type = 'Sub';
					rezFull.classes[`c_${temp[t].class_list[0]}`].group = true; 
				}
			}
		}	
		
		// Meklē 'draudzīgās' klases starp brīvajām
		function makeSupClass(sc, cl_list, temp) {
			var sup_atr_list = [];
			var sup_atr_list2 = [];
			function makeAtrList(atr_list, type) {
				var r_atr_list = [];
				for ( let a of atr_list ) {
					var p = a.p_name;
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
			
			rezFull.classes[sc] = { id:`${cl_list.join('_')}`, fullName:'', displayName:'', used:true, used2:true, hasGen:true, type:'Abstract', super_classes:[], sub_classes:[]};
			for (let cl of cl_list) {
				classInfo = rezFull.classes[`c_${cl}`];
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

		if ( compView ) {
			rezFull.lines = {};
			var temp2 = {};
			// Apstrādā klašu pārus, apvieno grupās
			for (var clId_1 of Object.keys(rezFull.classes)) {
				var classInfo1 = rezFull.classes[clId_1];
				if ( (classInfo1.used && classInfo1.free) || classInfo1.group ) {
					for (var clId_2 of Object.keys(rezFull.classes)) {
						var classInfo2 = rezFull.classes[clId_2];
						if ( (classInfo2.used && classInfo2.free) || classInfo2.group ) {
							if ( classInfo1.id != classInfo2.id  && classInfo1.displayName < classInfo2.displayName) {
								var temp = {};
								var ii_1 = 0;
								var ii_2 = 0;
								function addAttrs(atr_list) {
									for ( var a of atr_list) {
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
								addAttrs(getCompactAtrList(classInfo1.atr_list, 'out'));
								addAttrs(getCompactAtrList(classInfo2.atr_list, 'out'));
								addAttrs(getCompactAtrList(classInfo1.atr_list2, 'in'));
								addAttrs(getCompactAtrList(classInfo2.atr_list2, 'in'));
								if ( ii_1 - ii_2 < 4 && ii_2 > 3 ) {  // TODO šīs ir patvaļīgi izvēlētas konstantes
									var id = `l_${classInfo1.id}_${classInfo2.id}`;
									rezFull.lines[id] = {id:id, from:`c_${classInfo1.id}`, to: `c_${classInfo2.id}`, val:`diff_${ii_1 - ii_2}` };
									var used = false;
									for (let k of Object.keys(temp2)) {
										var group = temp2[k];
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
			for (var k of Object.keys(temp2)) {
				var temp = {};
				for (var cl of temp2[k]) {
					classInfo = rezFull.classes[`c_${cl}`];
					for (var atr of getCompactAtrList(classInfo.atr_list,'out') ) {
						var prop = atr.p_name;
						if ( temp[prop] == undefined)
							temp[prop] = 1;
						else
							temp[prop] = temp[prop] + 1
					}
					for (var atr of getCompactAtrList(classInfo.atr_list2, 'in') ) {
						var prop = atr.p_name;
						if ( temp[prop] == undefined)
							temp[prop] = 1;
						else
							temp[prop] = temp[prop] + 1
					}
				}
				console.log(temp)
				var sup_atr_list = [];
				var sup_atr_list2 = [];
				var sc = `c_${temp2[k].join('_')}`;
				makeSupClass(sc, temp2[k], temp);
	

			}
		}

		// Funckcija atribūta izskata noformēšanai
		function getAttrString(classInfo){
			var class_id = classInfo.id;
			var atr_list = [];
			if ( class_id >  0) {
				for (var a of classInfo.atr_list) {
					var cl_info = p_list_full[`p_${a.p_id}`].c_from.filter(function(i){ return i.class_id == class_id});
					if ( cl_info.length > 0 ) {  // parastās klases
						var cnt = Number(cl_info[0].cnt);
						var object_cnt = ( !compView && a.object_cnt > 0 && a.object_cnt != cnt ) ? `${roundCount(a.object_cnt)}/` : '';
						var dataProc = '';
						if ( cl_info[0].object_cnt > 0 && cl_info[0].object_cnt != cnt) {
							var proc = Math.round(100*(cnt-cl_info[0].object_cnt)/cnt);
							if ( proc == 100) proc = 99.9;
							dataProc = ` ${proc}%d`;
						}
						var iri_card = ( a.iri_card != undefined) ? `(${a.iri_card})` : '';  
						atr_list.push(`${a.p_name} (${object_cnt}${roundCount(cnt)}${dataProc}) [${a.max_cardinality}] ${a.is_domain} ${a.class_name}${iri_card}`);	
					}
					else {
						var cnt = ( a.cnt == -1 ) ? '': ` (${roundCount(a.cnt)})`;
						var iri_card = ( a.iri_card != undefined) ? `(${a.iri_card})` : '';  
						atr_list.push(`{a.p_name}${cnt} [${a.max_cardinality}] ${a.is_domain} ${a.class_name}${iri_card}`);
					}	
				}
			}
			else {
				atr_list = classInfo.atr_list.map(function(a) {
					var cnt = ( a.cnt == -1 ) ? '': ` (${roundCount(a.cnt)})`;
					var iri_card = ( a.iri_card != undefined ) ? `(${a.iri_card})` : ''; 
					return `${a.p_name}${cnt} [${a.max_cardinality}] ${a.is_domain} ${a.class_name}${iri_card}`;
				});
			}
			return atr_list.sort().join('\n');
		}

		// Klases vizuālo atribūtu formēšana
		for (var cl of Object.keys(rezFull.classes)) {
			var classInfo = rezFull.classes[cl];   
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
				var list = classInfo.sub_classes.filter(function(c){ return c.isClasif == true});
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
		var assoc = {};
		for (var aa of Object.keys(rezFull.assoc)) {
			if ( !rezFull.assoc[aa].removed) { 
				rezFull.assoc[aa].list[0].cnt = ( rezFull.assoc[aa].list[0].cnt == -1  ) ? '' : ` (${roundCount(rezFull.assoc[aa].list[0].cnt)})`;	
				//if ( rezFull.assoc[aa].list[0].cnt == -1 )
				//	rezFull.assoc[aa].list[0].cnt = '';
				//else 
				//	rezFull.assoc[aa].list[0].cnt = `(${roundCount(rezFull.assoc[aa].list[0].cnt)})`;
				var a = rezFull.assoc[aa];
				var id = a.id2;
				if ( assoc[id] == undefined ){
					assoc[id] = rezFull.assoc[aa];
				}
				else {
					assoc[id].list.push(a.list[0]);
				}
			}
		}
		rezFull.assoc = assoc;
		
		for (var aa of Object.keys(rezFull.assoc)) {
			//rezFull.assoc[aa].string = rezFull.assoc[aa].list.map(n => `${n.p_name} (${n.cnt}/${n.cnt_all}) [${n.max_cardinality}] ${n.is_domain}${n.is_range}`).sort().join('\n');
			rezFull.assoc[aa].string = rezFull.assoc[aa].list.map(n => `${n.p_name}${n.cnt} [${n.max_cardinality}] ${n.is_domain}${n.is_range}`).sort().join('\n');
		}

		console.log("*** rezFull ***", rezFull);

		var link = document.createElement("a");
		link.setAttribute("download", "diagr_data.json");
		link.href = URL.createObjectURL(new Blob([JSON.stringify(rezFull, 0, 4)], {type: "application/json;charset=utf-8;"}));
		document.body.appendChild(link);
		link.click();
		console.log("**********************************");
		
	},
	makeSuperDiagr : async function(c_list, p_list, remSmall, schema, info) {
		// Tiek padots zīmējamo klašu un propertiju saraksts
		var rr;
		var rezFull = {classes:{}, supClasses:{}, schema:schema, info:info, type:'makeSuperDiagr'};
		var allParams = {main: { c_list: `${c_list}`, limit:c_list.length}};
		
		rr = await this.callServerFunction("xx_getClassListInfo", allParams);

		_.each(rr.data, function(cl) {
			rezFull.classes[`t_c_${cl.id}`] = { id:`t_c_${cl.id}`, used:false, displayName:`${cl.full_name} ID-${cl.id}`, type:'Data', parent:[]};
			rezFull.classes[`s_t_c_${cl.id}`] = { id:`s_t_c_${cl.id}`, used:false, displayName:`${cl.full_name} ID-${cl.id}`, type:'Data', parent:[]};
			//rezFull.classes[`s_t_d_c_${cl.id}`] = { id:`s_t_d_c_${cl.id}`, used:false, displayName:`${cl.full_name} ID-${cl.id}`, type:'Data', parent:[]};
		});
		
		var p_list_full = [];
		
		var super_classes = {t:{}, s_t:{}, s_t_d:{}};	
		// Funkcija potenciālo virsklašu veidošanai
		function add_superclass (key, sc_list, prop_name) {
			sc_id = `c_${sc_list.join('_')}`;
			if ( super_classes[key][sc_id] == undefined ) {
				var sc_names = [];
				for (var sc of sc_list) {	
					rezFull.classes[`${key}_c_${sc}`].parent.push(`${key}_${sc_id}`);
					rezFull.classes[`${key}_c_${sc}`].used = true;
					sc_names.push(rezFull.classes[`t_c_${sc}`].displayName);
				}
				sc_names = sc_names.sort((a, b) => { return a < b; });
				super_classes[key][sc_id] = {count:1, cl_list:sc_list, cl_names:sc_names.join('\n'), prop_list:[prop_name]};
			}
			else {
				if ( !super_classes[key][sc_id].prop_list.includes(prop_name)) {
					super_classes[key][sc_id].count = super_classes[key][sc_id].count + 1;
					super_classes[key][sc_id].prop_list.push(prop_name);			
				}
			}
		}
		
		allParams.main.p_list =  p_list.map(v => v.id);
		rr = await this.callServerFunction("xx_getCPInfo", allParams); 
		var cp_info = rr.data;
		
		// Mazo propertiju noņemšana, ja ir uzstādīts dotais parametrs
		if ( remSmall > 0 ) {
			var tt = [];
			for (var ii of cp_info) {
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
		
		// Propertiju saraksta sākotnējā apstrāde, savāc galus, izveido potenciālās virsklases, skatoties uz padoto parametru
		for (var p of p_list) {	
			var p_id = `p_${p.id}`;
			var p_name = `${p.prefix}:${p.display_name} (${p.id})`;

			var cp_info_p = cp_info.filter(function(cp){ 
				return cp.property_id == p.id && c_list.includes(cp.class_id) && cp.cover_set_index > 0;
			}); 

			var c_from = cp_info_p.filter(function(cp){ return cp.type_id == 2}); 
			var c_from_sc = cp_info_p.filter(function(cp){ return cp.type_id == 2 && cp.object_cnt > 0 }); 
			var c_to = cp_info_p.filter(function(cp){ return cp.type_id == 1}); 

			var rr1;

			if (c_to.length > 1 && c_from_sc.length > 0) {
				rr1 = c_to.map( v => { return v.class_id});
				add_superclass ('t', rr1, `->${p_name}`);
				add_superclass ('s_t', rr1, `->${p_name}`);
				//add_superclass ('s_t_d', rr1, `->${p_name}`);
			}
			if ( c_from_sc.length > 1) {
				rr1 = c_from_sc.map( v => { return v.class_id});
				add_superclass ('s_t', rr1, `${p_name}->`);
			}
		}
		
		console.log(super_classes)
		function ProcessSC(sc_tree, pref) {
			var temp = {};
			var super_classes_list = [];
			for (var sc of Object.keys(sc_tree)) {
				if ( sc_tree[sc].count > 1 ) {
					temp[sc] = sc_tree[sc];
					sc_tree[sc].id = sc;
					sc_tree[sc].parent = [];
					super_classes_list.push(sc_tree[sc])
				}
			}
			super_classes_list = super_classes_list.sort((a, b) => { return a.cl_list.length - b.cl_list.length; });
			
			for (var sc1 of super_classes_list) {	
				for (var sc2 of super_classes_list) {	
					if ( sc1.cl_list.length < sc2.cl_list.length ) {
						var ii = 0;
						for (var c of sc1.cl_list) {
							if ( sc2.cl_list.includes(c) )
								ii = ii+1;
						}
						if ( ii == sc1.cl_list.length) {
							sc1.parent.push(`${pref}${sc2.id}`);
						}	
					}				
				}
			}
			return super_classes_list;
		}

		super_classes.t = ProcessSC(super_classes.t, 't_');
		super_classes.s_t = ProcessSC(super_classes.s_t, 's_t_');
		//super_classes.s_t_d = ProcessSC(super_classes.s_t_d, 's_t_d_');
		console.log(super_classes)
		
		_.each(super_classes.t, function(cl) { var id = `t_${cl.id}`; cl.id2 = id; cl.type = 'Class'; cl.prop_string = cl.prop_list.sort().join('\n'); rezFull.supClasses[id] = cl; });
		_.each(super_classes.s_t, function(cl) { var id = `s_t_${cl.id}`; cl.id2 = id; cl.type = 'Classif'; cl.prop_string = cl.prop_list.sort().join('\n'); rezFull.supClasses[id] = cl; });
		//_.each(super_classes.s_t_d, function(cl) { var id = `s_t_d_${cl.id}`; cl.id2 = id; cl.type = 'Data'; cl.prop_string = cl.prop_list.sort().join('\n'); rezFull.supClasses[id] = cl; });
		console.log(rezFull)
		
		var link = document.createElement("a");
		link.setAttribute("download", "diagr_data.json");
		link.href = URL.createObjectURL(new Blob([JSON.stringify(rezFull, 0, 4)], {type: "application/json;charset=utf-8;"}));
		document.body.appendChild(link);
		link.click();
		
	},
	getCPName: function(localName, type) {
		//dataShapes.getCPName('http://dbpedia.org/ontology/Year', 'C') 
		if (localName.indexOf('//') == -1 && localName.indexOf(':' ) == -1) {
			var ns = '';
			if (this.schema.schemaType === 'wikidata' && type == 'P')
				ns = 'wdt';
			else
				ns = this.schema.local_ns;
				//ns = this.schema.namespaces.filter(function(n){ return n.is_local == true})[0].name
			localName = `${ns}:${localName}`;
		} 
		var name = this.getIndividualName(localName);
		return name;
	},
	getIndividualName: function(localName, gen = false) {
		//dataShapes.getIndividualName('wd:[Luigi Pirandello (Q1403)]')
		var rez = ''; 
		var prefix = '';
		if (localName.startsWith("="))
			localName = localName.substring(1,localName.length);
		if (localName.startsWith("["))	
			localName = `${this.schema.local_ns}:${localName}`;
			
		function getLastB(name){
			var r = -1; 
			var searchStrLen = 1;
			var startIndex = 0;
			var index;
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
			var name = '';
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

