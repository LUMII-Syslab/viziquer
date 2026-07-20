import { Projects, Compartments, CompartmentTypes, DiagramTypes, Diagrams } from '../../../../db/platform/collections.js'
import { Services } from '../../../../db/platform/collections.js'
import { faas } from './faas.js'
import { createVQ_Element } from './VQ_Element.js'
import { getSchemaNameForElement } from './transformations.js'

// ***********************************************************************************
// const VQ_SCHEMA_SERVER_URL = 'http://localhost:3344/api';
//let _schemaServerUrl = null;
const getSchemaServerUrl = async () => new Promise((resolve, reject) => {
    //if (_schemaServerUrl) return _schemaServerUrl; // TODO šī saglabašana nezin kāpēc nestrādāja
    Meteor.call('getEnvVariable', 'VQ_SCHEMA_SERVER_URL', (error, result) => {
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
const DIAGRAM_CLASS_LIMIT = 2000;
const LONG_ANSWER = 3000;
const MakeLog = false;
const ConsoleLog = false;
const isPublic = true;  // Parametrs testu paslēpšanai
// Testa komitam
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
const callWithGetS = async (pr_info) => {
	//console.log('Izsaucam...', pr_info.name)
	let rez = false;
	try {
		//const response = await window.fetch(`${pr_info.link}`, {
		await window.fetch(`${pr_info.link}`, {
			method: 'GET',
			cache: 'no-cache'
		});
		rez = true;
	}
	catch(err) {
		//console.error(err)
	}
	return rez;
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
  if(text.indexOf("://") !== -1)
    return 3;
  else
    if(text.indexOf(":") !== -1 || text.indexOf("[") !== -1 ) return 4;
  return 0;
}

function isIndividual(individual) {
	if (individual !== null && individual !== undefined && isURI(individual) !== 0 && !individual.startsWith("?"))
		return true;
}

const getPListI = async (vq_obj) => {
	let pListI = {};
	const link_list =  await vq_obj.getLinks();
	//let link_list_filtered = link_list.map(async function(l) { const type = (l.start ? 'in': 'out'); return {name: await l.link.getName(), t:await l.link.getType(), type: type, eE:l.link.obj.endElement, sE:l.link.obj.startElement}});
	let link_list_filtered = [];

	for (const l of link_list) {
		const type = (l.start ? 'in': 'out');
		const lName = await l.link.getName();
		const lType = await l.link.getType();
		link_list_filtered.push({name:lName, t:lType, type: type, eE:l.link.obj.endElement, sE:l.link.obj.startElement});
	}

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
	const el_schema = await getSchemaNameForElement(vq_obj._id());
	//_.each(link_list_filtered, async function(link) {
	for (const link of link_list_filtered) {
		const l_schema = await getSchemaNameForElement(link.element);
		if (link.typeO === 'out' && link.name !== null && link.name !== undefined && link.name !== '++' && el_schema == l_schema ) {
			// 555 Jāpaskatās, kas notiks ciklā
			const eE = await createVQ_Element(link.eE); // const eE = new VQ_Element(link.eE);
			const individual =  await eE.getInstanceAlias();
			if (isIndividual(individual)) {
				pListI.type = link.type;
				pListI.name = link.name;
				pListI.uriIndividual = dataShapes.getIndividualName(individual);
			}
		}
		if (link.typeO === 'in' && link.name !== null && link.name !== undefined && link.name !== '++' && el_schema == l_schema ) {
			const sE = await createVQ_Element(link.sE); // const sE = new VQ_Element(link.sE);
			const individual =  await sE.getInstanceAlias();
			if (isIndividual(individual)) {
				pListI.type = link.type;
				pListI.name = link.name;
				pListI.uriIndividual = dataShapes.getIndividualName(individual);
			}
		}
	}
	//});
	return pListI;
}

const getPList = async (vq_obj) => {
	let pList = {in: [], out: []};
	const field_list_full = await vq_obj.getFields();
	const field_list = field_list_full.filter(function(f){ return f.requireValues }).map(function(f) { return {name:f.exp, type: 'out'}});
	_.each(field_list, function(link) {
		if (link.name !== null && link.name !== undefined && link.name.indexOf('@') !== -1)
			link.name = link.name.substring(0,link.name.indexOf('@'));
	})
	if (field_list.length > 0) pList.out = field_list;

	const link_list =  await vq_obj.getLinks();

	//let link_list_filtered = link_list.map(async function(l) { const type = (l.start ? 'in': 'out'); return {name: await l.link.getName(), t:await l.link.getType(), type: type, eE:l.link.obj.endElement, sE:l.link.obj.startElement}});
	let link_list_filtered = [];
	for (const l of link_list) {
		const type = (l.start ? 'in': 'out');
		const lName = await l.link.getName();
		const lType = await l.link.getType();
		link_list_filtered.push({name:lName, t:lType, type: type, eE:l.link.obj.endElement, sE:l.link.obj.startElement});
	}

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
	const activeDiagram = await Diagrams.findOneAsync({ _id: Session.get("activeDiagram") });
	const data_schema_diagram_type = await DiagramTypes.findOneAsync({ name: "DataSchema" });
	const el_schema = await getSchemaNameForElement(vq_obj._id(), data_schema_diagram_type ? activeDiagram["diagramTypeId"] == data_schema_diagram_type._id : false);
	const isRoot = await vq_obj.isRoot();

	for (const link of link_list_filtered) {
		const l_schema = await getSchemaNameForElement(link.element, data_schema_diagram_type ? activeDiagram["diagramTypeId"] == data_schema_diagram_type._id : false);
		if (link.type === 'in' && link.name !== null && link.name !== undefined && link.name !== '++' && el_schema == l_schema) { // Šeit nebija tas ++
			if (link.t === 'REQUIRED') {
				pList.in.push(link);
			}
			else {
				if (!isRoot) {
					const sE = await createVQ_Element(link.sE); // const sE = new VQ_Element(link.sE);
					if (await sE.isRoot())
						pList.in.push(link);
				}
			}
		}

		if (link.type === 'out' && link.name !== null && link.name !== undefined  && link.name !== '++' && el_schema == l_schema ) {
			if ( link.t === 'REQUIRED' ) {
				pList.out.push(link);
			}
			else {
				if (!isRoot) {
					const eE = await createVQ_Element(link.eE); // const eE = new VQ_Element(link.eE);
					if (await eE.isRoot())
						pList.out.push(link);
				}
			}
		}

		for (const l of pList.in) {
			const el = await createVQ_Element(l.element); // const el = new VQ_Element(link.element);
			const class_name = await el.getName();
			const individual =  await el.getInstanceAlias();
			if (class_name !== null && class_name !== undefined)
				l.className = class_name;
			if (isIndividual(individual))
				l.uriIndividual = dataShapes.getIndividualName(individual);
		}
		//_.each(pList.in, function(link) {
		//	const el = new VQ_Element(link.element);
		//	const class_name = el.getName();
		//	const individual =  el.getInstanceAlias();
		//	if (class_name !== null && class_name !== undefined)
		//		link.className = class_name;
		//	if (isIndividual(individual))
		//		link.uriIndividual = dataShapes.getIndividualName(individual);
		//})

		for (const l of pList.out) {
			if (l.element !== undefined ) {
				const el = await createVQ_Element(l.element); // const el = new VQ_Element(l.element);
				const class_name = await el.getName();
				const individual =  await el.getInstanceAlias();
				if (class_name !== null && class_name !== undefined)
					l.className = class_name;
				if (isIndividual(individual))
					l.uriIndividual = dataShapes.getIndividualName(individual);
			}
		}
		//_.each(pList.out, function(link) {
		//	if (link.element !== undefined ) {
		//		const el = new VQ_Element(link.element);
		//		const class_name = el.getName();
		//		const individual =  el.getInstanceAlias();
		//		if (class_name !== null && class_name !== undefined)
		//			link.className = class_name;
		//		if (isIndividual(individual))
		//			link.uriIndividual = dataShapes.getIndividualName(individual);
		//	}
		//})
	}

	return pList;
}

const findElementDataForClass = async (vq_obj) => {
	let params = {}
	const individual =  await vq_obj.getInstanceAlias();
	if (isIndividual(individual))
		params.uriIndividual = dataShapes.getIndividualName(individual);

	const pList = await getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;
	return params;
}

const findElementDataForProperty = async (vq_obj, className = null) => {
	let params = {};
	const individual = await vq_obj.getInstanceAlias();
	const class_name = className ? className : await vq_obj.getName();
	if (isIndividual(individual))
		params.uriIndividual = dataShapes.getIndividualName(individual);
	if (class_name !== null && class_name !== undefined)
		params.className = class_name;

	let pList = {in: [], out: []};
	//if (dataShapes.schema.use_pp_rels)
	pList = await getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;

	//if (dataShapes.schema.schemaType !== 'wikidata') { // Ir uztaisīts, bet strādā drusku palēni
	//	const pListI = getPListI(vq_obj);
	//	if ( pListI.type !== undefined) params.pListI = pListI;
	// }
	return params;
}

const findElementDataForIndividual = async (vq_obj) => {
	let params = {};
	const class_name = await vq_obj.getName();
	if (class_name !== null && class_name !== undefined && class_name !== '')
		params.className = class_name;

	const isIndirectClassMembership = await vq_obj.isIndirectClassMembership();
	if (isIndirectClassMembership)
		params.isIndirectClassMembership = true;

	const pList = await getPList(vq_obj);
	if (pList.in.length > 0 || pList.out.length > 0) params.pList = pList;

	//if (dataShapes.schema.schemaType !== 'wikidata') {
		const pListI = await getPListI(vq_obj);
		if ( pListI.type !== undefined) params.pListI = pListI;
	// }

	return params;
}

//const sparqlGetIndividualClasses = async (params, uriIndividual) => {
const findPropertiesIds = async (direct_class_role, indirect_class_role, prop_list = []) => {
	let id_list = [];
	async function addProperty(propertyName) {
		if (propertyName !== '' && propertyName !== undefined && propertyName !== null ) {
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
		isPublic: isPublic,
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
	getOntologies : async function() {
		//dataShapes.getOntologies()
		let rr = await callWithGet('info/');

		if (!_.isEmpty(rr) && !rr.error) {
			//console.log("rr ", rr)

			rr.unshift({display_name: ""});
			return await rr;
		}

		return NaN;
	},
	getOntologiesAndTags : async function() {
		let rr = await callWithGet('infoOntTags/');

		if (!_.isEmpty(rr) && !rr.error) {
			//console.log("rr ", rr)
			return await rr;
		}

		return NaN;
	},
	getOntologiesSync : function() {
		return this.schema.info;
	},
	getPublicNamespaces : async function() {
		let rr = await callWithGet('public_ns/');
		if (!_.isEmpty(rr)) {
			this.schema.namespaces = rr;
			return await rr;
		}

		return NaN;
	},
	changeActiveProject : async function(proj_id, txt = 'nezināma vieta') {
		//console.log('------changeActiveProject-------')
		//const proj = Projects.findOne({_id: proj_id});
		const proj = await Projects.findOneAsync({_id: proj_id});
		//this.schema = getEmptySchema();
		if (proj !== undefined) {
			await this.changeActiveProjectFull(proj, txt);
		}
	},
	changeActiveProjectFull : async function(proj, txt) {
		console.log('------changeActiveProjectFull-------', txt )
		let projectId_in_process = this.schema.projectId_in_process;
		if ( proj !== undefined && projectId_in_process == proj._id ) {
			while (projectId_in_process == proj._id) {
        console.log('----Iestājas gaidīšana------')
				await delay(500);// await delay(5000);
				projectId_in_process = this.schema.projectId_in_process;
			}
		}
		else if (proj !== undefined && ( this.schema.projectId !== proj._id || this.schema.filling === 0 )) {
      console.log('--- !!!!!!------- Tiek mainīts projekts -------!!!!!!---------', proj._id)
			this.schema = getEmptySchema();
			if ( proj.schema !== undefined && proj.schema !== "") {
				this.schema.projectId = proj._id;
				this.schema.projectId_in_process = proj._id;
				this.schema.schemaName =  proj.schema;
				this.schema.showPrefixes = proj.showPrefixesForAllNames.toString();
				//this.schema.empty = false;
				this.schema.endpoint =  proj.endpoint;
				if ( proj.uri !== undefined && proj.uri !== '' && proj.uri !== null )
					this.schema.endpoint = `${proj.endpoint}?default-graph-uri=${proj.uri}`;

				const info = await callWithGet('info/');
				if (info.error) {
					console.error(info);
					this.schema.projectId_in_process = "";
					return;
				}
				this.schema.info = info;
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

					this.schema.classCount = await this.getClassCount();
					this.schema.has_cpc = await this.getCPC_info();
					const propInfo = await this.getPropInfo();
					this.schema.propCount = propInfo.count;
					this.schema.propMax = propInfo.max;
					if ( this.schema.classCount < DIAGRAM_CLASS_LIMIT) {
						this.schema.diagram.classList = await this.getClassListExt();
            this.schema.diagram.filteredClassList = this.schema.diagram.classList;
						this.schema.diagram.properties = await this.getPropListExt();
            let propS = [];
            let propTCount = 0;
            for (const p of this.schema.diagram.properties) {
            	p.cnt = Number(p.cnt);
            	p.object_cnt = Number(p.object_cnt);
            	p.full_name = `${p.prefix}:${p.display_name}`;
              if ( p.object_cnt !== 0 && p.type_2 === '0' && p.is_follower === '0' && p.common_subjects > 0) {
                const pp = {id:-p.id, id_prop:p.id, display_name:`Source for ${p.full_name} (${p.cntR})`, sel:0};
                propS.push(pp);
              }
              if (p.object_cnt !== 0 && p.type_1 === '0' && ( p.follows > 0 || p.common_objects > 0 ))
                propTCount = propTCount + 1;
            }
            this.schema.diagram.propS = propS;
            this.schema.diagram.nonClassPropLabel = `Free sources-${propS.length}, free targets-${propTCount}`;
					}
					this.schema.filling = 3;
				}
				else { // Neatrada projekta shēmu DSS serverī
					await this.getPublicNamespaces();
					if (proj.endpoint !== undefined && proj.endpoint !== "") {
						this.schema.endpoint =  proj.endpoint;
						if ( proj.uri !== undefined && proj.uri !== '' && proj.uri !== null  )
							this.schema.endpoint = `${proj.endpoint}?default-graph-uri=${proj.uri}`;

						this.schema.filling = 2;
					}
					else {
						this.schema.filling = 1;
					}
				}
				this.schema.projectId_in_process = "";
			}
			else {
				await this.getPublicNamespaces();
				if (proj.endpoint !== undefined && proj.endpoint !== "") {
					this.schema.endpoint =  proj.endpoint;
					if ( proj.uri !== undefined && proj.uri !== '' && proj.uri !== null )
						this.schema.endpoint = `${proj.endpoint}?default-graph-uri=${proj.uri}`;

					this.schema.filling = 2;
				}
				else {
					this.schema.filling = 1;
				}
				this.schema.projectId_in_process = "";
			}
		}
	},
	callServerFunction : async function(funcName, params) {
		if ( ConsoleLog &&  funcName !== 'resolvePropertyByName' && funcName.substring(0,2) !== 'xx' ) {
			console.log("---------callServerFunction--------------" + funcName)
			console.log(params)
		}
		const startTime = Date.now();
		let s = this.schema.schema;
		let new_schema;
		if ( params.main.schema !== undefined) {
			new_schema = this.getOntologiesSync().find(function(o) { return o.db_schema_name == params.main.schema});
			if ( new_schema !== undefined )
				s = params.main.schema;
		}

		if (s === "" || s === undefined ) {
			await this.changeActiveProject(Session.get("activeProject"), 'Ir nomainīts projekts, callServerFunction');
			s = this.schema.schema;
		}

		// *** console.log(params)
		let rr = {complete: false, data: [], error: "DSS schema not found"};
		if (s !== "" && s !== undefined )
		{
			if ( s == this.schema.schema) {
				params.main.endpointUrl = this.schema.endpoint;
				params.main.use_pp_rels = this.schema.use_pp_rels;
				params.main.simple_prompt = this.schema.simple_prompt;
				params.main.schemaName = this.schema.schemaName;
				params.main.schemaType = this.schema.schemaType;
				params.main.showPrefixes = this.schema.showPrefixes;
			}
			else {
				params.main.endpointUrl = new_schema.sparql_url;
				if ( new_schema.named_graph !== null	)
					params.main.endpointUrl = `${new_schema.sparql_url}?default-graph-uri=${new_schema.named_graph}`;
				params.main.use_pp_rels = new_schema.use_pp_rels;
				params.main.simple_prompt = new_schema.simple_prompt;
				params.main.schemaName = new_schema.display_name;
				params.main.schemaType = new_schema.schema_name;
				params.main.showPrefixes = 'true';
			}

			if ( params.main.limit === undefined )
				params.main.limit = this.schema.limit;

			rr = await callWithPost(`ontologies/${s}/${funcName}`, params);
		}
		//else
		//	Interpreter.showErrorMsg("Project DSS parameter not found !");  // TODO par šo padomāt

		const time = Date.now() - startTime

		if ( ConsoleLog &&  funcName !== 'resolvePropertyByName' && funcName.substring(0,2) !== 'xx') {
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
	checkServices : async function(services) {
		for (const s of services) {
			for (const pr of s.projects) {
				//console.log('********************')
				const rr = await callWithGetS(pr);
				//console.log('**** rezultāts  ', rr)
				pr.ok = rr;
			}
		}

		return services;
	},
	getServices : async function() {
		Meteor.subscribe("Services", {});
		var services = Services.find().map(function(s) {
			return s;
		});

		for (const s of services) {
			for (const pr of s.projects) {
				const rr = await callWithGetS(pr);
				pr.ok = rr;
			}
		}
		return services;
	},
	getNamespaces : async function(params = {}) {
		// *** console.log("------------getNamespaces ------------------")
		//dataShapes.getNamespaces({schema:'europeana'})
		//dataShapes.getNamespaces()
		if ( params.schema == undefined ) {
			if ( this.schema.namespaces.length > 0 )
				return this.schema.namespaces;
			else {
				let rr = await this.callServerFunction("getNamespaces", {main:params});
				this.schema.namespaces = rr;
				return rr;
			}
		}
		else {
			let rr = await this.callServerFunction("getNamespaces", {main:params});
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
		// dataShapes.getClasses({schema:'europeana'})
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
			allParams.element = await findElementDataForClass(vq_obj);
			//allParams.main.orderByPrefix = `case when v.is_local = true then 0 else 1 end,`;
		}

		return await this.callServerFunction("getClasses", allParams);
	},
	getClassesFull : async function(params = {}) {
		// *** console.log("------------GetClasses------------------")
		// ***  dataShapes.getClassesFull({main:{schema:'europeana'}, element: {uriIndividual: 'http://www.bildindex.de/bilder/m/fm239485'}})
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
			if (this.schema.treeTopsC[nsString] !== undefined && this.schema.treeTopsC[nsString].error !== undefined) {
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
		if ( params.main.limit === undefined )
			params.main.limit = this.schema.limit;

		params.main.limit = params.main.limit + 1;
		let rr = await this.callServerFunction("getProperties", params);
		if ( rr.data.length == params.main.limit ) {
			rr.data.pop();
			rr.complete = false;
		}
		return rr;
	},
	getProperties: async function (params = {}, vq_obj = null, vq_obj_2 = null, className_obj_1 = null) {
		// *** console.log("*** ---------GetProperties---------------***", vq_obj)
		//dataShapes.getProperties({schema:'europeana', propertyKind:'Data'})
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
		let allParams = { main: params };
		if (vq_obj !== null && vq_obj !== undefined)
			allParams.element = await findElementDataForProperty(vq_obj, className_obj_1);
		if (vq_obj_2 !== null && vq_obj_2 !== undefined)
			allParams.elementOE = await findElementDataForProperty(vq_obj_2);
		return await this.getPropertiesF(allParams); //this.callServerFunction("getProperties", allParams);
	},
	getPropertiesFull : async function(params = {}) {
		// *** console.log("------------GetProperties------------------")
		// *** dataShapes.getPropertiesFull({main:{schema:'europeana', propertyKind:'Data'}})
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
	getClassifiers : async function(params = {}) {
		// TODO droši vien ar standarta limitu būs gana
		//dataShapes.getClassifiers({schema:'nobel_prizes_x'})
		return await this.callServerFunction("getClassifiers", {main: params});
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
			if (this.schema.treeTopsP[tName] !== undefined && this.schema.treeTopsP[tName].error !== undefined ) {
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

		if (this.schema.schemaType == 'wikidata' && params.filter !== undefined && faasEnabled == false)
			return await this.getIndividualsWD(params.filter);

		//if (this.schema.schemaType === 'wikidata') // TODO pagaidām filtrs ir atslēgts
		//	params.filter = '';

		let allParams = {main: params};
		if ( vq_obj !== null && vq_obj !== undefined ) {
			allParams.element = await findElementDataForIndividual(vq_obj);
		}

		if (this.schema.schemaType === 'wikidata' && faasEnabled == true) {
			return await faas.getIndividuals(allParams);
		}

		if ( allParams.element !== undefined && (allParams.element.className !== undefined || allParams.element.pList !== undefined )) {
			rr = await this.callServerFunction("getIndividuals", allParams);

			if (rr.error !== undefined)
				rr = []
		}
		else
			rr = [];

		return rr;
	},
	getClassIndividuals : async function(params, className) {
		// *** console.log("------------getClassIndividuals ------------------")
		// *** dataShapes.getClassIndividuals({limit:10}, 'UnitJoining')
		// *** dataShapes.getClassIndividuals({limit:10, schema:'europeana'}, ':WebResource')

		let rr;

		//if (this.schema.schemaType == 'wikidata' && params.filter !== undefined )
		//	return await this.getIndividualsWD(params.filter);

		let allParams = {main: params, element: {className:className}};
		rr = await this.callServerFunction("getIndividuals", allParams);

		if (rr.error !== undefined)
			rr = []

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

		if (rr.error !== undefined)
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
			//dataShapes.resolveClassByName({schema:'europeana', name: ':WebResource'})
		//dataShapes.resolveClassByName({name: 'umbel-rc:Park'})
		//dataShapes.resolveClassByName({name: 'http://dbpedia.org/ontology/Year'})
		//dataShapes.resolveClassByName({name: 'foaf:Document'})

		let rr;
		if (this.schema.resolvedClasses[params.name] !== undefined || this.schema.resolvedClassesF[params.name] !== undefined && params.schema == undefined) {
			if (this.schema.resolvedClasses[params.name] !== undefined)
				rr = { complete:true, data: [this.schema.resolvedClasses[params.name]]};
			if (this.schema.resolvedClassesF[params.name] !== undefined)
				rr = { complete:false, data: []};
			// *** console.log(rr)
		}
		else {
			rr = await this.callServerFunction("resolveClassByName", {main: params});
			if ( params.schema == undefined ) {
				if ( rr.complete )
					this.schema.resolvedClasses[params.name] = rr.data[0];
				else
					this.schema.resolvedClassesF[params.name] = 1;
			}
			else {
				const new_schema = this.getOntologiesSync().find(function(o) { return o.db_schema_name == params.schema});
				if ( rr.complete ) {
					rr.data[0].direct_class_role = new_schema.direct_class_role;
					rr.data[0].indirect_class_role = new_schema.indirect_class_role;
				}
			}
		}

		if (rr.complete == true)
			rr.name = rr.data[0].full_name; //`${rr.data[0].prefix}:${rr.data[0].local_name}`;
		else
			rr.name = this.getCPName(params.name, 'C');
		return rr;
	},
	resolvePropertyByName : async function(params = {}) {
		// *** console.log("------------resolvePropertyByName---"+ params.name +"---------------")
		//dataShapes.resolvePropertyByName({schema:'europeana', name: ':componentColor'})
		//dataShapes.resolvePropertyByName({name: 'dbo:president'})
		//dataShapes.resolvePropertyByName({name: 'http://dbpedia.org/ontology/years'})
		let rr;
		if ( typeof params.name !== "string" ) return { complete:false, name: '', data: []};

		if (this.schema.resolvedProperties[params.name] !== undefined || this.schema.resolvedPropertiesF[params.name] !== undefined  && params.schema == undefined) {
			if (this.schema.resolvedProperties[params.name] !== undefined)
				rr = { complete:true, data: [this.schema.resolvedProperties[params.name]]};
			if (this.schema.resolvedPropertiesF[params.name] !== undefined)
				rr = { complete:false, data: []};
			// *** console.log(rr)
		}
		else {
			rr = await this.callServerFunction("resolvePropertyByName", {main: params});
			if ( params.schema == undefined ) {
				if ( rr.complete )
					this.schema.resolvedProperties[params.name] = rr.data[0];
				else
					this.schema.resolvedPropertiesF[params.name] = 1;
			}
		}

		if (rr.complete == true)
			rr.name = rr.data[0].full_name; //`${rr.data[0].prefix}:${rr.data[0].local_name}`;
		else
			rr.name = this.getCPName(params.name, 'P');
		return rr;
	},
	resolveIndividualByName : async function(params = {}) {
		//dataShapes.resolveIndividualByName({schema:'europeana', name:'http://www.bildindex.de/bilder/m/fm239485'}) TODO - wikidata
		//dataShapes.resolveIndividualByName({name: 'http://www.wikidata.org/entity/Q34770'})
		//dataShapes.resolveIndividualByName({name: 'wd:Q633795'})
		//dataShapes.resolveIndividualByName({name: 'dbr:Aaron_Cox'}) // dbpedia
		//dataShapes.resolveIndividualByName({name: "wd:[first (Q19269277)]"})

		if (params.name.indexOf('<') !== -1)
			params.name = params.name.substring(1, params.name.length-1);

		params.name = this.getIndividualName(params.name);
		let rr;

		if (this.schema.resolvedIndividuals[params.name] !== undefined || this.schema.resolvedIndividualsF[params.name] !== undefined  && params.schema == undefined) {
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
					if ( rez.name !== undefined)
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

		if ( params.schema == undefined ) {
			if ( rr.complete )
				this.schema.resolvedIndividuals[params.name] = rr.data[0];
			else if ( !rr.complete )
				this.schema.resolvedIndividualsF[params.name] = 1;
		}
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
	tt : async function (all = 1) {
		// Šī ir funkcija testam
		const el = await createVQ_Element(Session.get("activeElement"));// const el = new VQ_Element(Session.get("activeElement"));
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
	getPropListExt : async function() {
		const rr = await this.callServerFunction("xx_getPropList3", {main: {}});
		//console.log(rr)
		return rr.data;
	},
	getClassList : async function(par) {
	// console.log(dataShapes.getClassList({}))
    // Šī funkcija liekas netiek vairs izsaukta
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
	getCPC_info: async function() {
		let rr = await this.callServerFunction("xx_getCPC_info", {main:{}});
		return rr;
	},
	getPropInfo: async function() {
		let rr = await this.callServerFunction("xx_getPropertyInfo", {main:{}});
		return rr;
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
		if ( localName.indexOf(')]') !== -1){
			prefix = localName.substring(0,localName.indexOf(':'));
			//const name = localName.substring(localName.indexOf('(')+1,localName.length-2);
			const name = localName.substring(getLastB(localName)+1,localName.length-2);
			rez = `${prefix}:${name}`;
		}
		else if (localName.indexOf(']') !== -1) {
			prefix = localName.substring(0,localName.indexOf(':'));
			const name = localName.substring(localName.indexOf(':')+2,localName.length-1);
			rez = `${prefix}:${name}`;
		}
		else if (localName.indexOf('//') !== -1) {
			let name = '';
			_.each(this.schema.namespaces, function(ns) {
				if (localName.indexOf(ns.value) == 0 && localName.length > ns.value.length) {
					name = `${ns.name}:${localName.replace(ns.value,'')}`;
					prefix = ns.name;
				}
			});

			if (name !== '')
				rez = name;
			else
				rez = localName;
		}
		else
			rez = localName;

		if ( prefix == '')
			prefix = rez.substring(0,localName.indexOf(':'));

		if ( gen && rez.indexOf('/') !== -1) {
			_.each(this.schema.namespaces, function(ns) {
				if ( prefix == ns.name )
					rez = `<${ns.value}${rez.replace(ns.name,'').replace(':','')}>`;
			});
		}
		return rez;
	},
};

// ***********************************************************************************

export {
  dataShapes,
}
