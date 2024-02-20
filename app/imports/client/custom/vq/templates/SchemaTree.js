import { Interpreter } from '/imports/client/lib/interpreter'
import { Projects } from '/imports/db/platform/collections'

import { dataShapes } from '/imports/client/custom/vq/js/DataShapes'

import './SchemaTree.html'
import { Create_VQ_Element } from '../js/VQ_Element';

Template.schemaFilter.Properties = new ReactiveVar("");
Template.schemaFilter.F2 = new ReactiveVar("");
Template.schemaFilter.PropKind = new ReactiveVar("");
Template.schemaFilter.BL = new ReactiveVar("");
Template.schemaTree.Classes = new ReactiveVar("");
Template.schemaTree.Waiting = new ReactiveVar("");
Template.schemaTree.NeedReload = new ReactiveVar("");
Template.schemaTree.NotEmpty = new ReactiveVar("");
Template.schemaTree.F1 = new ReactiveVar("");
Template.schemaTree.Ns = new ReactiveVar("");
Template.schemaInstances.Instances = new ReactiveVar("");
Template.schemaInstances.IsBigClass = new ReactiveVar("");
Template.schemaInstances.Class = new ReactiveVar("");
Template.schemaInstances.Classes = new ReactiveVar("");
Template.schemaInstances.F3 = new ReactiveVar("");
Template.schemaInstances.showI = new ReactiveVar("");
Template.schemaInstances.isWD = new ReactiveVar("");
Template.schemaExtra.SchemaName = new ReactiveVar("");
Template.schemaExtra.Classes = new ReactiveVar([]);
Template.schemaExtra.RestClasses = new ReactiveVar([]);
Template.schemaExtra.Properties = new ReactiveVar([]);
Template.schemaExtra.isBig =  new ReactiveVar(true);
Template.schemaExtra.isLocal =  new ReactiveVar(false);
Template.schemaExtra.ClassCountAll = new ReactiveVar("");
Template.schemaExtra.ClassCountSelected = new ReactiveVar("");
Template.schemaExtra.ClassCountFiltered = new ReactiveVar("");
Template.schemaExtra.ClassCountRest = new ReactiveVar("");
Template.schemaExtra.ManualDisabled = new ReactiveVar("disabled");
Template.schemaExtra.FilterDisabled = new ReactiveVar("");
Template.schemaExtra.NsFilters = new ReactiveVar("");
Template.schemaExtra.ClassCount = new ReactiveVar("");
Template.schemaExtra.IndCount = new ReactiveVar("");
Template.schemaExtra.SuperclassType = new ReactiveVar("");
Template.schemaExtra.ClassCountForSlider = new ReactiveVar("");

const delay = ms => new Promise(res => setTimeout(res, ms));
//Template.schemaTree.Count = new ReactiveVar("");
//Template.schemaTree.TopClass = new ReactiveVar("");
//Template.schemaTree.ClassPath = new ReactiveVar("");
//Template.schemaFilter.Count = new ReactiveVar("");
//const startCount = 30;
//const plusCount = 20;
const delayTime = 1000;
let schemaTreeKeyDownTimeStamp;
let schemaFilterKeyDownTimeStamp;
let schemaInstancesKeyDownTimeStamp;

Template.schemaTree.onDestroyed(function() {
	Template.schemaTree.Classes.set([]);
	Template.schemaTree.Ns.set([]);
	//console.log('--Template.schemaTree.onDestroyed--')
});

Template.schemaTree.helpers({
	classes: function() {
		return Template.schemaTree.Classes.get();
	},
	ns: function() {
		return Template.schemaTree.Ns.get(); 
	},
	f1: function() {
		return Template.schemaTree.F1.get();
	},
	needReload: function() {
		return Template.schemaTree.NeedReload.get();
	},
	waiting: function() {
		return Template.schemaTree.Waiting.get();
	},
	notEmpty: function() {
		return Template.schemaTree.NotEmpty.get();
	},
});

function getNameF(o, col = 'cnt_x') {
	return `${o.full_name} (${o[col]})`;
/*
	if ( dataShapes.schema.showPrefixes === "false" && o.is_local) 
		return `${o.display_name} (${o[col]})`;
	else  {
		let name = `${o.prefix}:${o.display_name} (${o[col]})`;
		if ( o.prefix == null) 
			name = `${o.display_name} (${o[col]})`;
		return name;
	}
*/	
}

function getName(o) {
	return `${o.full_name}`;
/*
	if ( dataShapes.schema.showPrefixes === "false" && o.is_local) 
		return `${o.display_name}`;
	else {
		let name = `${o.prefix}:${o.display_name}`;
		if ( o.prefix == null) 
			name = o.display_name;
		return name;		
	}
*/	
}

function getNameDR(o) {
	if ( dataShapes.schema.showPrefixes === "false" && o.is_local) 
		return `${o.display_name}`;
	else {
		let name = `${o.prefix}:${o.display_name}`;
		if ( o.prefix == null) 
			name = o.display_name;
		return name;		
	}
}

function getNS() {
	let namespaces = {};
	_.each(dataShapes.schema.tree.ns, function(ns) {
		if (ns.type == 'in' && ns.checked)
			namespaces.in = [];
		if (ns.type == 'notIn' && ns.checked)
			namespaces.notIn = [];

	});
	_.each(dataShapes.schema.tree.ns, function(ns) {
		if (ns.checked) {
			if (ns.type == 'in')
				namespaces.in.push(ns.name);
			else
				namespaces.notIn.push(ns.name);
		}
	});
	return namespaces;

}

async function setBC() {
	const c = dataShapes.schema.tree.class;
    //const r = ( c == 'skos:Concept' || c == 'foaf:Document' || c == 'owl:Thing' ||  c == 'dbo:TimePeriod' ||  c == 'dbo:Agent' ? true : false); 
	//const r = (dataShapes.schema.tree.b_classes.filter(i => i == c).length !== 0)
	let cc = {data:[]};
	if ( c !== undefined && !c.includes('All classes') && c!= '')
		cc = await dataShapes.resolveClassByName({name: c})
	let r = false;
	if ( cc.data.length > 0 && cc.data[0].cnt > dataShapes.schema.tree.big_class_cnt)
		r = true;
	Template.schemaInstances.IsBigClass.set(r);
}

async function setTreeTop (filter = '', plus = 0) {
	const params = {treeMode: 'Top', limit: dataShapes.schema.tree.countC};
	if (filter !== '') {
		params.filter = filter;
		if (plus == 1) {
			let cc = Template.schemaTree.Classes.get();
			cc.pop();
			cc.push({ch_count: 0, children: [], data_id: "wait", localName: "Waiting answer..."});
			Template.schemaTree.Classes.set(cc);
		}
		else
			Template.schemaTree.Classes.set([{ch_count: 0, children: [], data_id: "wait", localName: "Waiting answer..."}]);

	}

	const namespaces = getNS();
	
	if (namespaces.in != undefined || namespaces.notIn != undefined)
		params.namespaces = namespaces;
	
	const clFull = await dataShapes.getTreeClasses({main:params});
	let classes = _.map(clFull.data, function(cl) {return {ch_count: Number(cl.has_subclasses), node_id: cl.id, children: [], data_id: getName(cl), localName: getNameF(cl)}});
	if ( clFull.complete === false)
		classes.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
	Template.schemaTree.Classes.set(classes);
	dataShapes.schema.tree.topClass = 0;
}

async function setTreeSubClasses (cc, nsPlus, filter = '') {
	dataShapes.schema.tree.topClass = cc[0].node_id;
	const params = {limit: dataShapes.schema.tree.countC, treeMode: 'Sub'}; 
	let tree = [{ ch_count: 1, children: [], data_id: ".", localName: "Tree top", node_id: 0 }];
	
	if ( filter !== '')
		params.filter = filter;

	const namespaces = getNS();
	if ( nsPlus && (namespaces.in != undefined || namespaces.notIn != undefined)) 
		params.namespaces = namespaces;

	params.classId =  dataShapes.schema.tree.topClass;
	const clSub = await dataShapes.getTreeClasses({main:params});
	let classes = _.map(clSub.data, function(cl) {return {ch_count: Number(cl.has_subclasses), node_id: cl.id, children: [], data_id: getName(cl), localName: getNameF(cl)}});
	if ( clSub.complete === false )
		classes.push({ch_count: 0, children: [], data_id: "..", localName: "More ..."});

	cc[0].children = classes;
	tree.push(cc[0]);
	Template.schemaTree.Classes.set(tree); 
}

async function  useFilter (plus = 0) {
	const text = Template.schemaTree.F1.get();
	dataShapes.schema.tree.filterC = text;
	// ** setNS();
	const treeTop = Template.schemaTree.Classes.get(); 
	if ( dataShapes.schema.tree.topClass != 0 ) 
		if (treeTop.length == 1 )
			await setTreeSubClasses ([treeTop[0]], true, text.toLowerCase()); 
		else 
			await setTreeSubClasses ([treeTop[1]], true, text.toLowerCase()); 
	else 
		await setTreeTop(text.toLowerCase(), plus);
}

async function  useFilterP () {
	const text = Template.schemaFilter.F2.get();
	dataShapes.schema.tree.filterP = text;
	const params = {propertyKind:'All', limit: dataShapes.schema.tree.countP, filter:text.toLowerCase()};
	let col = 'cnt_x';
	
	if ($("#dbp").is(":checked") ) {
		params.basicOrder = true;
	}
	if ( $("#propType").val() === 'Object properties' ) {
		params.propertyKind = 'Object';
		dataShapes.schema.tree.pKind = 'Object properties';
		col = 'object_cnt_x'
	}
	if ( $("#propType").val() === 'Data properties' ) {
		params.propertyKind = 'Data';
		dataShapes.schema.tree.pKind = 'Data properties';
		col = 'data_cnt_x';
	}
	if ( $("#propType").val() === 'All properties' )
		dataShapes.schema.tree.pKind = 'All properties';
	
	if ( text !== "") {
		Template.schemaFilter.Properties.set([{ch_count: 0, children: [], data_id: "wait", localName: "Waiting answer..."}]);
	}
		
	const pFull = await dataShapes.getTreeProperties(params);  
	let properties = _.map(pFull.data, function(p) {return {ch_count: 0, children: [], data_id: getName(p), localName: getNameF(p, col)}});
	if ( pFull.complete === false)
		properties.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
		
	Template.schemaFilter.Properties.set(properties);
}

async function  useFilterI () {
	if (Template.schemaInstances.showI.get()) {
		let text = Template.schemaInstances.F3.get();
		let instances;
		let iFull;
		if ( text.indexOf(':') > -1 ) {
			text = text.substring(text.indexOf(':')+1, text.length);
			Template.schemaInstances.F3.set(text);
		}
		//dataShapes.schema.tree.filterI = text;
		const params = { limit: dataShapes.schema.tree.countI, filter:text};
		let className = Template.schemaInstances.Class.get();
		if ( className === '' || className === undefined || className === null ) 
			className = 'All classes';

		dataShapes.schema.tree.class = className;
		
		if (className.includes('All classes')) { // 'All classes' ir tikai DBpedia un Wikidata
			if ( text == '' ) {
				params.filter = 'First';  // Filtrs būs vienmēr
				text = 'First';
			}
					
			if (dataShapes.schema.schemaType === 'wikidata') { // Šis ir vienīgais wikidata zars, kas izpildās
				iFull = await dataShapes.getTreeIndividualsWD(text);
				instances = _.map(iFull, function(p) {return {data_id: p.localName, localName: p.localName, description: p.description}});
				Template.schemaInstances.Instances.set(instances);	
			}
			else {
				params.individualMode = 'Direct';  // Vispirms meklē tiešās sakritības (DBpedia)
				iFull = await dataShapes.getTreeIndividuals(params, className);  
				instances = _.map(iFull, function(p) {return {data_id: p.localName, localName: p.localName, description: ''}}); 
				//instances = _.map(iFull, function(p) {return { data_id: p, localName: p, description: ''}}); 
				instances.push({data_id: "...", localName: "Waiting full answer...", description: ''});	
				Template.schemaInstances.Instances.set(instances);
				params.individualMode = 'All';
				iFull = await dataShapes.getTreeIndividuals(params, className);  
				instances = _.map(iFull, function(p) {return {data_id: p.localName, localName: p.localName, description: ''}}); 
				//instances = _.map(iFull, function(p) {return {data_id: p, localName: p, description: ''}}); 
				Template.schemaInstances.Instances.set(instances);	
			}
		}
		else {  // Zināma konkrēta klase ( wikidata klase vairs netiek ņemta vērā)
			if ( text != '' ) { // Ir filtrs
				if ( dataShapes.schema.schemaType !== 'dbpedia') {
					instances = [{data_id: "...", localName: "Waiting ...", description: ''}];	
					params.individualMode = 'All';
					iFull = await dataShapes.getTreeIndividuals(params, className);
					instances = _.map(iFull, function(p) {return {data_id: p.localName, localName: p.localName, description: ''}});
					Template.schemaInstances.Instances.set(instances);
				}
				else {
					params.individualMode = 'Direct';  // TODO Šo saucam tikai DBpedia, bet tagad var visiem 
					iFull = await dataShapes.getTreeIndividuals(params, className);  
					instances = _.map(iFull, function(p) {return {data_id: p.localName, localName: p.localName, description: ''}}); 
					//instances = _.map(iFull, function(p) {return { data_id: p, localName: p, description: ''}}); 
					instances.push({data_id: "...", localName: "Waiting full answer...", description: ''});	
					Template.schemaInstances.Instances.set(instances);
					params.individualMode = 'All';
					iFull = await dataShapes.getTreeIndividuals(params, className);  
					instances = _.map(iFull, function(p) {return {data_id: p.localName, localName: p.localName, description: ''}}); 
					//instances = _.map(iFull, function(p) {return {data_id: p, localName: p, description: ''}}); 
					Template.schemaInstances.Instances.set(instances);	
				}
			}
			else { // ir klase, nav filtra		
				Template.schemaInstances.Instances.set([{ data_id: "wait", localName: "Waiting answer...", description: ''}]);
				iFull = await dataShapes.getTreeIndividuals(params, className);
                //if ( dataShapes.schema.schemaType === 'wikidata' || dataShapes.schema.schemaType === 'warsampo') 
                instances = _.map(iFull, function(p) {return {data_id: p.localName, localName: p.localName, description: p.description}});
                //else
                //    instances = _.map(iFull, function(p) {return {data_id: p, localName: p, description: ''}}); 
				Template.schemaInstances.Instances.set(instances);
			}
		}
	}
}

function setClassListInfo(classes, restClasses) {
	Template.schemaExtra.Classes.set(classes);
	Template.schemaExtra.ClassCountSelected.set(classes.length);	
	Template.schemaExtra.RestClasses.set(restClasses);	
	Template.schemaExtra.ClassCountRest.set(restClasses.length);
}


function setClassList0() {
	Template.schemaExtra.ManualDisabled.set("disabled");
	Template.schemaExtra.FilterDisabled.set("");
	Template.schemaExtra.Properties.set([]);
	const nsFilters = [{value:'All' ,name:'Classes in all namespaces'},{value:'Local' ,name:'Only local classes'},{value:'Exclude' ,name:'Exclude owl:, rdf:, rdfs:'}];
	//const classCount = [{value:15 ,name:'15 classes in the diagram'}, {value:30 ,name:'30 classes in the diagram'}, {value:40 ,name:'40 classes in the diagram'}, {value:50 ,name:'50 classes in the diagram'}, {value:100 ,name:'100 classes in the diagram'}, {value:300 ,name:'300 classes in the diagram'}];
	const indCount = [{value:1 ,name:'Classes of all sizes'}, {value:10 ,name:'At least 10 individuals'}, {value:50 ,name:'At least 50 individuals'}, {value:100 ,name:'At least 100 individuals'}];
	const superclassType = [{value:1 ,name:'targets'}, {value:2 ,name:'sources and targets'}, {value:0 ,name:'Without superclasses'},];
	const schema = dataShapes.schema.schema;
	let nsFiltersSel = 'Exclude';
	let classCountSel = 300;
	let indCountSel = 1;
	let superclassTypeSel = 1;
	
	let filteredClassList = dataShapes.schema.diagram.classList;	
	filteredClassList = filteredClassList.filter(function(c){ return c.is_local == 1;});
	console.log('*** Esam koka veidošanā ***', schema)
	// TODO  Šis ir manai ērtībai, vai nu jāmet ārā, vai jāliek konfigurācijā
	if ( schema == 'iswc2017') {
		superclassTypeSel = 0;
	}
	else if ( schema == 'mondial' ) {
		nsFiltersSel = 'Local';
		superclassTypeSel = 2;
	}
	else if ( schema == 'europeana' ) {
		superclassTypeSel = 1;
	}
	else if ( schema == 'nobel_prizes_v0' || schema == 'nobel_prizes_x' || schema == 'nobel_prizes_y' || schema == 'nobel_prizes') {
		superclassTypeSel = 1;
		indCountSel = 10;
	}
	else if ( schema == 'academy_sampo_x' || schema == 'academy_sampo' ) {
		superclassTypeSel = 2;
	}
	else if ( schema == 'war_sampo' || schema == 'war_sampo_2' ) {
		nsFiltersSel = 'Local';
		superclassTypeSel = 2;
	}
	else if ( schema == 'data_europa_eu' ) {
		superclassTypeSel = 2;
	}
	//else { // TODO Izskatās, ko tikai lokālās klases nav interesantas
	//	if ( filteredClassList.length > 0 ) 
	//		nsFiltersSel = 'Local';
	//	else 
	//		nsFiltersSel = 'Exclude';
	//}
	
	if ( nsFiltersSel == 'Exclude' ) 
		filteredClassList = dataShapes.schema.diagram.classList.filter(function(c){ const not_in = ['owl','rdf','rdfs']; return !not_in.includes(c.prefix);});
	
	if ( indCountSel > 1 )
		filteredClassList = filteredClassList.filter(function(c){ return c.cnt >= indCountSel;});
	
	if ( filteredClassList.length < 300 )	
		classCountSel = filteredClassList.length;
	
	dataShapes.schema.diagram.filteredClassList = filteredClassList;
	Template.schemaExtra.ClassCountFiltered.set(filteredClassList.length);
	Template.schemaExtra.ClassCountForSlider.set(classCountSel);
		
	nsFilters.find(function(f){ return f.value == nsFiltersSel;}).selected = "selected";
	//classCount.find(function(f){ return f.value == classCountSel;}).selected = "selected";
	indCount.find(function(f){ return f.value == indCountSel;}).selected = "selected";
	superclassType.find(function(f){ return f.value == superclassTypeSel;}).selected = "selected";
	
	Template.schemaExtra.NsFilters.set(nsFilters);
	//Template.schemaExtra.ClassCount.set(classCount);
	Template.schemaExtra.IndCount.set(indCount);
	Template.schemaExtra.SuperclassType.set(superclassType);

	let classes = [];
	let restClasses = [];
	if ( filteredClassList.length > classCountSel ) {
		classes = filteredClassList.slice(0, classCountSel);
		restClasses = filteredClassList.slice(classCountSel, filteredClassList.length+1);
	}
	else {
		classes = filteredClassList;
	}
	setClassListInfo(classes, restClasses);
}

function sortClassList() {
	let classList = dataShapes.schema.diagram.classList;
	const sortP = $("#sortPar").val();
	if  ( sortP == 1) 
		classList = classList.sort(function(a,b){ return b.cnt-a.cnt;});
	if  ( sortP == 2) 
		classList = classList.sort(function(a,b){ return a.order-b.order;});
	if  ( sortP == 3) 
		classList = classList.sort(function(a,b){ return b.in_props-a.in_props;});
	
	dataShapes.schema.diagram.classList = classList;
	
	if (Template.schemaExtra.ManualDisabled.get() == "") {
		let classes = Template.schemaExtra.Classes.get();
		let restClasses = Template.schemaExtra.RestClasses.get();
		if  ( sortP == 1) { 
			classes = classes.sort(function(a,b){ return b.cnt-a.cnt;});
			restClasses = restClasses.sort(function(a,b){ return b.cnt-a.cnt;});
		}	
		if  ( sortP == 2) {
			classes = classes.sort(function(a,b){ return a.order-b.order;});
			restClasses = restClasses.sort(function(a,b){ return a.order-b.order;});
		}
		if  ( sortP == 3) {
			classes = classes.sort(function(a,b){ return b.in_props-a.in_props;});
			restClasses = restClasses.sort(function(a,b){ return b.in_props-a.in_props;});
		}
		setClassListInfo(classes, restClasses);
	}
	else
		setClassList(true);
}

function setClassList(changeCount = false) {

	if (Template.schemaExtra.ManualDisabled.get() == "disabled") {
		let filteredClassList = dataShapes.schema.diagram.classList;
		const nsFilter = $("#nsFilter").val();
		let classCount = $("#classCount").val();
		const indCount = $("#indCount").val();

		if ( nsFilter == 'Exclude')
			filteredClassList = filteredClassList.filter(function(c){ const not_in = ['owl','rdf','rdfs']; return !not_in.includes(c.prefix);});
		if ( nsFilter == 'Local')
			filteredClassList = filteredClassList.filter(function(c){ return c.is_local == 1;});
		
		if ( indCount > 1 )
			filteredClassList = filteredClassList.filter(function(c){ return c.cnt >= indCount;});
			
		Template.schemaExtra.ClassCountFiltered.set(filteredClassList.length);	

		const classCountForSlider = ( filteredClassList.length < 300 ) ? filteredClassList.length : 300;
		Template.schemaExtra.ClassCountForSlider.set(classCountForSlider);
		if ( !changeCount )
			classCount = classCountForSlider; 
		//if ( classCount > classCountForSlider ) // TODO nez kā ir labāk?
		//	classCount = classCountForSlider;
		
		let classes = [];
		let restClasses = [];
		if ( filteredClassList.length > classCount ) {
			classes = filteredClassList.slice(0, classCount); 
			restClasses = filteredClassList.slice(classCount, filteredClassList.length+1);
		}
		else {
			classes = filteredClassList;
		}
		
		dataShapes.schema.diagram.filteredClassList = filteredClassList;
		setClassListInfo(classes, restClasses);
	}
}

function makeClassLists() {
	const classes = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});
	const restClasses = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 0});
	setClassListInfo(classes, restClasses);
	sortClassList() 
}

Template.schemaTree.events({
	"click .toggle-tree-button": async function(e) {
		const toggle_button = $(e.target);
		const tree_node_id = toggle_button[0].attributes["node-id"].value;
		const topClass = dataShapes.schema.tree.topClass;
		//Template.schemaTree.Count.set(startCount);
		Template.schemaTree.F1.set('');
		dataShapes.schema.tree.filterC = '';

		if ( tree_node_id == 0 ) {
			await setTreeTop();
			return;
		}

		if ( topClass == tree_node_id) {
			let classPath = dataShapes.schema.tree.classPath;
			classPath.pop();
			if ( classPath.length === 0) {
				await setTreeTop();
			}
			else {
				const cc = classPath[classPath.length-1];
				await setTreeSubClasses ([cc], false);
			}
		}
		else {

			const treeTop = Template.schemaTree.Classes.get();
			let cc;
			
			if ( dataShapes.schema.tree.topClass === 0)
				cc = _.filter(treeTop, function(c){ return  c.node_id == tree_node_id });
			else
				cc = _.filter(treeTop[1].children, function(c){ return  c.node_id == tree_node_id });
			
			if ( cc[0].ch_count > 0) {
				let classPath = dataShapes.schema.tree.classPath;
				classPath.push(cc[0]);
				dataShapes.schema.tree.classPath = classPath;
				await setTreeSubClasses (cc, false);
			}
		}
	},
	"keydown #filter_text": async function(e) {
		schemaTreeKeyDownTimeStamp = e.timeStamp;
		await delay(delayTime);
		if ( schemaTreeKeyDownTimeStamp === e.timeStamp ) {
			Template.schemaTree.F1.set($('#filter_text').val());
			await useFilter ();
		}
	},
	"click .form-check-input": async function(e) {
		const index = $(e.target).closest(".form-check-input").attr("index");
		dataShapes.schema.tree.ns[index].checked = $(e.target).is(":checked");
		Template.schemaTree.F1.set($('#filter_text').val());
		await useFilter ();
	},
	"dblclick .class-body": async function(e) {
		const class_name = $(e.target).closest(".class-body").attr("value");

		if ( class_name !== "" && class_name !== "..." && class_name !== ".." && class_name !== "." && class_name !== "wait")
		{
			const DEFAULT_BOX_WIDTH = 194;
			const DEFAULT_BOX_HEIGHT = 66;
			const DEFAULT_OFFSET = 10;
			// get location of the editor
			const ajoo_scene_attrs = Interpreter.editor.stage.attrs;
			const attrs = {scroll_h: ajoo_scene_attrs.container.scrollTop,
			scroll_w: ajoo_scene_attrs.container.scrollLeft,
			visible_h: ajoo_scene_attrs.container.clientHeight,
			visible_w: ajoo_scene_attrs.container.clientWidth,
			total_h: ajoo_scene_attrs.height,
			y_relative_top: ajoo_scene_attrs.container.getBoundingClientRect().top,
			y_relative_bottom: ajoo_scene_attrs.container.getBoundingClientRect().bottom,
			};

			//// Place in bottom right corner of visible area
			const loc = {x: attrs.visible_w + attrs.scroll_w - DEFAULT_OFFSET- DEFAULT_BOX_WIDTH,
							y: attrs.scroll_h + attrs.visible_h-DEFAULT_OFFSET-DEFAULT_BOX_HEIGHT,
							width: DEFAULT_BOX_WIDTH,
							height: DEFAULT_BOX_HEIGHT};

			Create_VQ_Element(function(boo) {
					const proj = Projects.findOne({_id: Session.get("activeProject")});
					boo.setNameAndIndirectClassMembership(class_name,proj && proj.indirectClassMembershipRole);
				}, loc);
			
		}
		if ( class_name === "...") {
			let count = dataShapes.schema.tree.countC;
			count = count + dataShapes.schema.tree.plus;
			//Template.schemaTree.Count.set(count);
			dataShapes.schema.tree.countC = count;
			await useFilter(1);
		}	
		if ( class_name === "..") {
			let count = dataShapes.schema.tree.countC;
			count = count + dataShapes.schema.tree.plus;
			//Template.schemaTree.Count.set(count);
			dataShapes.schema.tree.countC = count;
			await useFilter(1);
		}		
	},
	'click #filter': async function() {
		//Template.schemaTree.Count.set(startCount)
		Template.schemaTree.F1.set($('#filter_text').val());
		await useFilter();
	},
	'keydown #filter': async function(e) {
		//Template.schemaTree.Count.set(startCount)
		if ( e.keyCode === 13 ) {
			Template.schemaTree.F1.set($('#filter_text').val());
			await useFilter();
		}
	},
	'keyup #filter_text': async function(e){
		if (e.keyCode == 13) {
			Template.schemaTree.F1.set($('#filter_text').val());
			await useFilter();
		}
		return;
	},
	'click #reload': async function(){
		//console.log('click #reload')
		Template.schemaTree.Waiting.set(true);
		await dataShapes.changeActiveProject(Session.get("activeProject"));
		Template.schemaTree.Waiting.set(false);
		Template.schemaTree.NeedReload.set(false);
		if (dataShapes.schema.filling !== 3) {
			Template.schemaTree.NotEmpty.set(false);
		}
		else {
			Template.schemaTree.NotEmpty.set(true);
		}
		Template.schemaTree.Ns.set(dataShapes.schema.tree.ns);
		Template.schemaTree.F1.set(dataShapes.schema.tree.filterC);	
		await useFilter ();	
		Template.schemaFilter.F2.set(dataShapes.schema.tree.filterP);
		Template.schemaFilter.PropKind.set(dataShapes.schema.tree.pKind);
		Template.schemaFilter.BL.set(dataShapes.schema.tree.dbp);
		await useFilterP ();
		//$("#class").val(dataShapes.schema.tree.class);	
		Template.schemaInstances.F3.set('');
		Template.schemaInstances.Class.set(dataShapes.schema.tree.class);
		Template.schemaInstances.showI.set(!dataShapes.schema.hide_individuals);
		Template.schemaInstances.isWD.set(dataShapes.schema.schemaType == 'wikidata');
		Template.schemaInstances.Classes.set(dataShapes.schema.tree.classes.map( v => { if ( v == dataShapes.schema.tree.class ) return {name:v, selected: "selected"}; else return {name:v}; }));		
		await setBC()
		await useFilterI();	
		
		Template.schemaExtra.SchemaName.set(dataShapes.schema.schemaName);
		Template.schemaExtra.ClassCountAll.set(dataShapes.schema.classCount);
		// TODO cik lielas shēmas vispār piedāvāju vizualizēt
		if ( dataShapes.schema.classCount < dataShapes.schema.diagram.maxCount) {
			Template.schemaExtra.isBig.set(false);
			setClassList0();
		}
		else
			Template.schemaExtra.isBig.set(true);
	},	
	
});

Template.schemaTree.rendered = async function() {
	//console.log("-----rendered schemaTree----")
	Template.schemaTree.Waiting.set(true);
	const proj = Projects.findOne(Session.get("activeProject"));
	if ( (proj !== undefined && dataShapes.schema.projectId != proj._id) || (dataShapes.schema.filling === 0 && proj !== undefined)) {
		await dataShapes.changeActiveProjectFull(proj);
	}
	Template.schemaTree.Waiting.set(false);
	//console.log(dataShapes.schema)
	//console.log(Projects.findOne(Session.get("activeProject")));
	//Template.schemaTree.Count.set(startCount);
	if (dataShapes.schema.filling === 0) {
		Template.schemaTree.NeedReload.set(true);
		// *** Template.schemaTree.NsInclude.set(false);
	}
	else if (dataShapes.schema.filling !== 3) {
		Template.schemaTree.NeedReload.set(false);
		Template.schemaTree.NotEmpty.set(false);
	}
	else {
		Template.schemaTree.NeedReload.set(false);
		Template.schemaTree.NotEmpty.set(true);
		Template.schemaTree.Ns.set(dataShapes.schema.tree.ns);
		Template.schemaTree.F1.set(dataShapes.schema.tree.filterC);	
		Template.schemaTree.Classes.set([dataShapes.schema.tree.classPath[dataShapes.schema.tree.classPath.length-1]]); 
		//$("#filter_text")[0].value = dataShapes.schema.tree.filterC;
		await useFilter ();	
		
		Template.schemaFilter.F2.set(dataShapes.schema.tree.filterP);
		Template.schemaFilter.PropKind.set(dataShapes.schema.tree.pKind);
		Template.schemaFilter.BL.set(dataShapes.schema.tree.dbp);
		await useFilterP ();
		Template.schemaInstances.F3.set('');
		Template.schemaInstances.Class.set(dataShapes.schema.tree.class);
		Template.schemaInstances.showI.set(!dataShapes.schema.hide_individuals);
		Template.schemaInstances.isWD.set(dataShapes.schema.schemaType == 'wikidata');
		Template.schemaInstances.Classes.set(dataShapes.schema.tree.classes.map( v => { if ( v == dataShapes.schema.tree.class ) return {name:v, selected: "selected"}; else return {name:v}; }));
		await setBC();
		await useFilterI();	

		Template.schemaExtra.SchemaName.set(dataShapes.schema.schemaName);
		Template.schemaExtra.ClassCountAll.set(dataShapes.schema.classCount);
		// TODO cik lielas shēmas vispār piedāvāju vizualizēt
		if ( dataShapes.schema.classCount < dataShapes.schema.diagram.maxCount) {
			Template.schemaExtra.isBig.set(false);
			setClassList0();	
		}
		else
			Template.schemaExtra.isBig.set(true);
	}
	//Template.schemaTree.ClassPath.set([]);
}

Template.schemaFilter.rendered = async function() {
	//console.log("-----rendered schemaFilter (Properties)----")
	// Pārnests uz schemaTree.rendered
	// Template.schemaFilter.F2.set(dataShapes.schema.tree.filterP);
	// Template.schemaFilter.PropKind.set(dataShapes.schema.tree.pKind);
	// Template.schemaFilter.BL.set(dataShapes.schema.tree.dbp);
	// await useFilterP ();

}

Template.schemaInstances.rendered = async function() {
	//console.log("-----rendered schemaInstances----")
	// Pārnests uz schemaTree.rendered
	// Template.schemaInstances.F3.set(dataShapes.schema.tree.filterI);
	// Template.schemaInstances.Class.set(dataShapes.schema.tree.class);
	// Template.schemaInstances.showI.set(!dataShapes.schema.hide_individuals);
	// Template.schemaInstances.isWD.set(dataShapes.schema.schemaType == 'wikidata');
	// Template.schemaInstances.Classes.set(dataShapes.schema.tree.classes.map( v => { if ( v == dataShapes.schema.tree.class ) return {name:v, selected: "selected"}; else return {name:v}; }));
	// await setBC();
	// await useFilterI();
}

Template.schemaFilter.helpers({
	properties: function() {
		return Template.schemaFilter.Properties.get();
	},
	notEmpty: function() {
		return Template.schemaTree.NotEmpty.get();
	},
	f2: function() {
		return Template.schemaFilter.F2.get();
	},
	dbp: function() {
		return Template.schemaFilter.BL.get();
	},
	pKind: function() {
		return Template.schemaFilter.PropKind.get();
	},
});

Template.schemaFilter.events({
	"dblclick .class-body": async function(e) {
		const prop_name = $(e.target).closest(".class-body").attr("value");
		if ( prop_name === "...") {
			let count = dataShapes.schema.tree.countP;
			count = count + dataShapes.schema.tree.plus;
			dataShapes.schema.tree.countP = count;
			await useFilterP(); //  bija useFilterP(1), bet parametrs netiek ņemts vērā
		}
		else if ( prop_name !== "wait") {
			const DEFAULT_BOX_WIDTH = 194;
			const DEFAULT_BOX_HEIGHT = 66;
			const DEFAULT_OFFSET = 10;	
			
			// get location of the editor
			const ajoo_scene_attrs = Interpreter.editor.stage.attrs;
			const attrs = {scroll_h: ajoo_scene_attrs.container.scrollTop,
			scroll_w: ajoo_scene_attrs.container.scrollLeft,
			visible_h: ajoo_scene_attrs.container.clientHeight,
			visible_w: ajoo_scene_attrs.container.clientWidth,
			total_h: ajoo_scene_attrs.height,
			y_relative_top: ajoo_scene_attrs.container.getBoundingClientRect().top,
			y_relative_bottom: ajoo_scene_attrs.container.getBoundingClientRect().bottom,
			};
			
			const loc = {x: attrs.visible_w + attrs.scroll_w - DEFAULT_OFFSET- DEFAULT_BOX_WIDTH,
					y: attrs.scroll_h + attrs.visible_h-DEFAULT_OFFSET-DEFAULT_BOX_HEIGHT,
					width: DEFAULT_BOX_WIDTH,
					height: DEFAULT_BOX_HEIGHT};
			
			let pKind = "";
			let prop_info = await dataShapes.resolvePropertyByName({name: prop_name});
			prop_info = prop_info.data[0];
			if (dataShapes.schema.tree.pKind == 'Object properties') 
				pKind = "Object";
			if (dataShapes.schema.tree.pKind == 'Data properties') 
				pKind = "Data";
			if ( pKind === "") {
				if ( prop_info.object_cnt > prop_info.data_cnt )
					pKind = "Object";
				else
					pKind = "Data";
			}
			
			let domainName  = "";
			let rangeName = "";
			if ( prop_info.domain_class_id !== null)
				domainName = getNameDR({display_name: prop_info.dc_display_name, prefix: prop_info.dc_prefix, is_local: prop_info.dc_is_local });
			if ( prop_info.range_class_id !== null)
				rangeName = getNameDR({display_name: prop_info.rc_display_name, prefix: prop_info.rc_prefix, is_local: prop_info.rc_is_local });
			
			if ( pKind == 'Object') {

				const loc2 = {x: attrs.visible_w + attrs.scroll_w - DEFAULT_OFFSET- DEFAULT_BOX_WIDTH,
								y: attrs.scroll_h + attrs.visible_h - DEFAULT_OFFSET - 3*DEFAULT_BOX_HEIGHT,
								width: DEFAULT_BOX_WIDTH,
								height: DEFAULT_BOX_HEIGHT};

				Create_VQ_Element(function(boo) {
					const proj = Projects.findOne({_id: Session.get("activeProject")});
					boo.setNameAndIndirectClassMembership(domainName,proj && proj.indirectClassMembershipRole);
					
					Create_VQ_Element(function(cl){
						const proj = Projects.findOne({_id: Session.get("activeProject")});
						cl.setNameAndIndirectClassMembership(rangeName,proj && proj.indirectClassMembershipRole);
						
						cl.setClassStyle("condition");	                
						const locLink = [loc.x+DEFAULT_BOX_WIDTH/2, loc2.y+DEFAULT_BOX_HEIGHT, loc.x+DEFAULT_BOX_WIDTH/2, loc.y];                 
						Create_VQ_Element(function(lnk) {
							lnk.setName(prop_name);
							lnk.setLinkType("REQUIRED");	                    
							lnk.setNestingType("PLAIN");						
							if (proj && proj.autoHideDefaultPropertyName=="true") { 
								lnk.hideDefaultLinkName(true);
								lnk.setHideDefaultLinkName("true");
							}
						}, locLink, true, boo, cl); }
					, loc);}
				,loc2);
				
			}
			else {
				Create_VQ_Element(function(boo) {
						const proj = Projects.findOne({_id: Session.get("activeProject")});
						boo.setNameAndIndirectClassMembership(domainName,proj && proj.indirectClassMembershipRole);
						boo.addField(prop_name,null,true,false,false);
					}, loc);				

			}

			
		}		
	},
	'click #filter2': async function() {
		//Template.schemaFilter.Count.set(startCount)
		Template.schemaFilter.F2.set($('#filter_text2').val());
		await useFilterP();
	},
	'keydown #filter2': async function(e) {
		if ( e.keyCode === 13 ) {
			Template.schemaFilter.F2.set($('#filter_text2').val());
			await useFilterP();
		}
	},
	"keydown #filter_text2": async function(e) {
		schemaFilterKeyDownTimeStamp = e.timeStamp;
		await delay(delayTime);
		if ( schemaFilterKeyDownTimeStamp === e.timeStamp ) {
			Template.schemaFilter.F2.set($('#filter_text2').val());
			await useFilterP();
		}
	},
	'click #dbp': async function() {
		//Template.schemaFilter.Count.set(startCount)
		Template.schemaFilter.F2.set($('#filter_text2').val());
		useFilterP ();
	},
	'change #propType': async function() {
		//Template.schemaFilter.Count.set(startCount)
		Template.schemaFilter.F2.set($('#filter_text2').val());
		useFilterP ();
	},
	'keyup #filter_text2': async function(e){
		if (e.keyCode == 13) {
			Template.schemaFilter.F2.set($('#filter_text2').val());
			await useFilterP();
		}
		return;
	},
});

Template.schemaInstances.helpers({
	instances: function() {
		return Template.schemaInstances.Instances.get();
	},
	notEmpty: function() {
		return Template.schemaTree.NotEmpty.get();
	},
	f3: function() {
		return Template.schemaInstances.F3.get();
	},
	class: function() {
		return Template.schemaInstances.Class.get();
		//return dataShapes.schema.tree.class;
	},
	classes: function() {  
		return Template.schemaInstances.Classes.get();
		//return dataShapes.schema.tree.classes.map( v => { return {name:v}});
	},
	isBigClass: function() {
		return Template.schemaInstances.IsBigClass.get();
	},
	showI: function() {
		return Template.schemaInstances.showI.get();
	},
	isWD: function() {
		return Template.schemaInstances.isWD.get();
	},
});

Template.schemaInstances.events({
	"dblclick .class-body": async function(e) {
		const i_name = $(e.target).closest(".class-body").attr("value");
		if ( i_name === "...") {
			let count = dataShapes.schema.tree.countI;
			count = count + dataShapes.schema.tree.plus;
			dataShapes.schema.tree.countI = count;
			await useFilterI();
		}
		else if (i_name !== "wait") {
			const className = Template.schemaInstances.Class.get();
			const DEFAULT_BOX_WIDTH = 194;
			const DEFAULT_BOX_HEIGHT = 66;
			const DEFAULT_OFFSET = 10;	
			
			// get location of the editor
			const ajoo_scene_attrs = Interpreter.editor.stage.attrs;
			const attrs = {scroll_h: ajoo_scene_attrs.container.scrollTop,
				scroll_w: ajoo_scene_attrs.container.scrollLeft,
				visible_h: ajoo_scene_attrs.container.clientHeight,
				visible_w: ajoo_scene_attrs.container.clientWidth,
				total_h: ajoo_scene_attrs.height,
				y_relative_top: ajoo_scene_attrs.container.getBoundingClientRect().top,
				y_relative_bottom: ajoo_scene_attrs.container.getBoundingClientRect().bottom,
			};
			
			const loc = {x: attrs.visible_w + attrs.scroll_w - DEFAULT_OFFSET- DEFAULT_BOX_WIDTH,
				y: attrs.scroll_h + attrs.visible_h-DEFAULT_OFFSET-DEFAULT_BOX_HEIGHT,
				width: DEFAULT_BOX_WIDTH,
				height: DEFAULT_BOX_HEIGHT};

			Create_VQ_Element(function(boo) {
					let name = '';
					if (!className.includes('All classes')) 
						name = className;
					const proj = Projects.findOne({_id: Session.get("activeProject")});
					boo.setNameAndIndirectClassMembership(name, proj && proj.indirectClassMembershipRole);
					boo.setInstanceAlias(i_name);
				}, loc);				
			
		}		
	},
	'click #filter3': async function() {
		Template.schemaInstances.F3.set($('#filter_text3').val());
		await useFilterI();
	},
	'keydown #filter3': async function(e) {
		if ( e.keyCode === 13 ) {
			Template.schemaInstances.F3.set($('#filter_text3').val());
			await useFilterI();
		}
	},
	"keydown #filter_text3": async function(e) {
		schemaInstancesKeyDownTimeStamp = e.timeStamp;
		await delay(delayTime);
		if ( schemaInstancesKeyDownTimeStamp === e.timeStamp ) {
			Template.schemaInstances.F3.set($('#filter_text3').val());
			await useFilterI();
		}
	},
	'change #class': async function() {
		const className = $("#class").val();
		if ( className !== dataShapes.schema.tree.class) {
			Template.schemaInstances.F3.set('');  
			dataShapes.schema.tree.filterI = '';  
			dataShapes.schema.tree.class = className;
			Template.schemaInstances.Class.set(className);
			setBC();
			useFilterI ();
		}
	},
	'keyup #filter_text3': async function(e){
		if (e.keyCode == 13) {
			Template.schemaInstances.F3.set($('#filter_text3').val());
			await useFilterI();
		}
		return;
	},
});

Template.schemaExtra.helpers({
	classes: function() {
		return Template.schemaExtra.Classes.get();
	}, 
	restClasses: function() {
		return Template.schemaExtra.RestClasses.get();
	},
	info_schema: function() {
		return Template.schemaExtra.SchemaName.get();
	},
	isBig: function() {
		return Template.schemaExtra.isBig.get();
	},
	classCountAll: function() {
		return Template.schemaExtra.ClassCountAll.get();
	},
	classCountSelected: function() {
		return Template.schemaExtra.ClassCountSelected.get();
	},
	classCountFiltered: function() {
		return Template.schemaExtra.ClassCountFiltered.get();
	},
	classCountRest: function() {
		return Template.schemaExtra.ClassCountRest.get();
	},
	manualDisabled: function() {
		return Template.schemaExtra.ManualDisabled.get();
	},
	classCountForSlider: function() {
		return Template.schemaExtra.ClassCountForSlider.get();
	},
	filterDisabled: function() {
		return Template.schemaExtra.FilterDisabled.get();
	},
	nsFilters: function() {
		return Template.schemaExtra.NsFilters.get();
	},
	classCount: function() {
		return Template.schemaExtra.ClassCount.get();
	},
	indCount: function() {
		return Template.schemaExtra.IndCount.get();
	},
	superclassType: function() {
		return Template.schemaExtra.SuperclassType.get();
	},
	properties: function() {
		return Template.schemaExtra.Properties.get();
	},
	
});

/*
function addSuperclasses(classes) {
	let all_s = [];
	_.each(classes, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
	
	_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
		if ( all_s.includes(cl.id)) cl.selected = 1;
	});
	
	return dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});
} */

function getParams() {
	const par = {addIds:$("#addIds").is(":checked"), disconnBig:$("#disconnBig").val(), compView:$("#compView").is(":checked"),
	diffG:$("#diffG").val(), diffS:$("#diffS").val(), supPar:$("#supPar").val(), schema:dataShapes.schema.schema};
	return par;
}

async function printSup(par0) {
	let classList = Template.schemaExtra.Classes.get();
	let all_s = [];
	_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
	
	_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
		if ( all_s.includes(cl.id)) cl.selected = 1;
	});
	classList = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});

	classList = classList.map(v => v.id);
	let propList = Template.schemaExtra.Properties.get();
	const remSmall = ($("#remS").is(":checked")) ? 10 : 0;
	if ( propList.length == 0 ) {
		const allParams = {main: { c_list: `${classList}`, remSmall:remSmall }};
		const rr = await dataShapes.callServerFunction("xx_getPropList", allParams);	
		propList = rr.data;
	}
	const par = getParams();
	par.printGroups = par0.printGroups; 
	par.printDiffs = par0.printDiffs;

	const info = [ `${Template.schemaExtra.ClassCountSelected.get()} classes in the diagram`,
		$('#nsFilter option:selected').text(),  $('#indCount option:selected').text(),
		$('#disconnBig option:selected').text(),  $('#diffG option:selected').text(),
		$('#diffS option:selected').text(),  $('#supPar option:selected').text()];

	await dataShapes.makeSuperDiagr(classList, propList, par, info.join('\n'));	
}

Template.schemaExtra.events({
	'click #makeDiagr': async function() {
		let classList = Template.schemaExtra.Classes.get();
		let all_s = [];
		_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
		
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( all_s.includes(cl.id)) cl.selected = 1;
		});
		classList = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});

		classList = classList.map(v => v.id);
		let propList = Template.schemaExtra.Properties.get();
		const remSmall = ($("#remS").is(":checked")) ? 10 : 0;
		if ( propList.length == 0 ) {
			//let not_in = [];
			//if ($("#nsFilter").val() == 'Exclude' || $("#nsFilter").val() == 'Local')
			//	not_in = ['owl','rdf','rdfs'];
			// Ņemam visas propertijas, pagaidām nav ielikts lokālais propertiju filtrs
			const allParams = {main: { c_list: `${classList}`, remSmall:remSmall }};
			//allParams.main.not_in = not_in.map(v => dataShapes.schema.namespaces.filter(function(n){ return n.name == v})[0].id);
			const rr = await dataShapes.callServerFunction("xx_getPropList", allParams);	
			propList = rr.data;
		}
		let info = [ `${Template.schemaExtra.ClassCountSelected.get()} classes in the diagram`,
			Template.schemaExtra.NsFilters.get().find(function(f){ return f.value == $("#nsFilter").val();}).name,
			Template.schemaExtra.IndCount.get().find(function(f){ return f.value == $("#indCount").val();}).name ];
		if ( $("#superclassType").val() != 0) {
			info.push(`Superclasses based on ${Template.schemaExtra.SuperclassType.get().find(function(f){ return f.value == $("#superclassType").val();}).name}`);
		}
		
		if ( $("#remS").is(":checked") )
			info.push('Small properties are removed');
			
		if ( $("#compView").is(":checked") )
			info.push('Compact attribute view');			

		await dataShapes.makeDiagr(classList, propList, $("#superclassType").val(),  
			remSmall, $("#addIds").is(":checked"), $("#disconnBig").val(), 
			$("#compView").is(":checked"), dataShapes.schema.schema, info.join('\n')); 

	},
	'click #makeDiagr2': async function() {
		let classList = Template.schemaExtra.Classes.get();
		let all_s = [];
		_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
		
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( all_s.includes(cl.id)) cl.selected = 1;
		});
		classList = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});

		classList = classList.map(v => v.id);
		let propList = Template.schemaExtra.Properties.get();
		const remSmall = ($("#remS").is(":checked")) ? 10 : 0;
		if ( propList.length == 0 ) {
			//let not_in = [];
			//if ($("#nsFilter").val() == 'Exclude' || $("#nsFilter").val() == 'Local')
			//	not_in = ['owl','rdf','rdfs'];
			
			const allParams = {main: { c_list: `${classList}`, remSmall:remSmall }};
			//allParams.main.not_in = not_in.map(v => dataShapes.schema.namespaces.filter(function(n){ return n.name == v})[0].id);
			const rr = await dataShapes.callServerFunction("xx_getPropList", allParams);	
			propList = rr.data;
		}
		let info = [ `${Template.schemaExtra.ClassCountSelected.get()} classes in the diagram`,
			Template.schemaExtra.NsFilters.get().find(function(f){ return f.value == $("#nsFilter").val();}).name,
			Template.schemaExtra.IndCount.get().find(function(f){ return f.value == $("#indCount").val();}).name,
			$('#disconnBig option:selected').text(),  $('#diffG option:selected').text(),
			$('#diffS option:selected').text(),  $('#supPar option:selected').text()];
		
		if ( $("#remS").is(":checked") )
			info.push('Small properties are removed');

			// TODO Info vajag papildināt

		await dataShapes.makeSuperDiagr(classList, propList, getParams(), info.join('\n'));
		//await dataShapes.makeSuperDiagr(classList, propList, remSmall, dataShapes.schema.schema, info.join('\n'));

	},
	'click #calck': async function() {
		//TODO šis vēlāk vairs nebūs
		let classList = Template.schemaExtra.Classes.get();
		let all_s = [];
		_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
		
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( all_s.includes(cl.id)) cl.selected = 1;
		});
		classList = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});

		classList = classList.map(v => v.id);
		let propList = Template.schemaExtra.Properties.get();
		const remSmall = ($("#remS").is(":checked")) ? 10 : 0;
		if ( propList.length == 0 ) {
			const allParams = {main: { c_list: `${classList}`, remSmall:remSmall }};
			const rr = await dataShapes.callServerFunction("xx_getPropList", allParams);	
			propList = rr.data;
		}
		
		await dataShapes.makeSuperDiagr(classList, propList, getParams(), '', true);
	},
	'click #printGroups': async function() {
		//TODO šis vēlāk vairs nebūs
		await printSup({printGroups:true});
	},	
	'click #printDiffs': async function() {
		//TODO šis vēlāk vairs nebūs
		await printSup({printDiffs:true});
	},
	'click #getProperties': async function() {
		let classList = Template.schemaExtra.Classes.get();
		classList = classList.map(v => v.id);
		const remSmall = ($("#remS").is(":checked")) ? 10 : 0;
		const rr = await dataShapes.callServerFunction("xx_getPropList", {main: { c_list: `${classList}`, remSmall:remSmall}});
		Template.schemaExtra.Properties.set(rr.data);
	},
	'change #classCount': function() {
		setClassList(true);
	},
	'change #indCount': function() {
		setClassList();
	},
	'change #nsFilter': function() {
		setClassList();
	},
	'change #sortPar': function() {
		sortClassList();
	},
	'click #manual': function() {
		if ( $("#manual").is(":checked") ) {
			Template.schemaExtra.ManualDisabled.set("");
			Template.schemaExtra.FilterDisabled.set("disabled");
			const classList = Template.schemaExtra.Classes.get().map(v => v.id);
			_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
				if ( classList.includes(cl.id))
					cl.selected = 1;
			});
		}
		else {
			Template.schemaExtra.ManualDisabled.set("disabled");
			Template.schemaExtra.FilterDisabled.set("");
		}
	},
	'click #removeAll': function() {
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) { cl.selected = 0; });
		makeClassLists();
	},
	'click #removeSelected': function() {
		if ($("#selectedClasses").val() != undefined) {
			const selected = $("#selectedClasses").val().map(v => Number(v));

			_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
				if ( selected.includes(cl.id) )
					cl.selected = 0; 
			});
			makeClassLists();
		}
	},
	'click #addSelected': function() {
		if ($("#restClasses").val() != undefined) {
			const selected = $("#restClasses").val().map(v => Number(v));
			_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
				if ( selected.includes(cl.id) )
					cl.selected = 1; 
			});
			makeClassLists();
		}
	},		
	//'click #addWithN': function() {
	//	if ($("#restClasses").val() != undefined) {
	//		const selected = $("#restClasses").val().map(v => Number(v));
	//		if ( selected.length > 0 ) {
	//			const list = dataShapes.schema.diagram.filteredClassList.find(function(cl) { return cl.id == selected[0]; }).c;
	//			_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
	//				if ( list.includes(cl.id) || cl.id == selected[0] )
	//					cl.selected = 1; 
	//			});
	//			makeClassLists();			
	//		}
	//	}
	//},
	'click #removeProperties': function() {
		if ($("#selectedProperties").val() != undefined) {
			const selected = $("#selectedProperties").val().map(v => Number(v));
			let propList = Template.schemaExtra.Properties.get();
			propList = propList.filter(function(p){ return !selected.includes(p.id); })
			Template.schemaExtra.Properties.set(propList);
		}
	},		
});

