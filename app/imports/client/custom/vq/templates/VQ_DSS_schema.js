import { Interpreter } from '/imports/client/lib/interpreter'
import { dataShapes } from '/imports/client/custom/vq/js/DataShapes.js'
import './VQ_DSS_schema.html'

Template.VQ_DSS_schema.SchemaName = new ReactiveVar('');
Template.VQ_DSS_schema.Classes = new ReactiveVar([]);
Template.VQ_DSS_schema.RestClasses = new ReactiveVar([]);
Template.VQ_DSS_schema.Properties = new ReactiveVar([]);
Template.VQ_DSS_schema.RestProperties = new ReactiveVar([]);
Template.VQ_DSS_schema.UsedClasses = new ReactiveVar([]);
Template.VQ_DSS_schema.SubClasses = new ReactiveVar([]);
Template.VQ_DSS_schema.ClassProperties = new ReactiveVar([]);
Template.VQ_DSS_schema.isBig =  new ReactiveVar(true);
Template.VQ_DSS_schema.isLocal =  new ReactiveVar(false);
Template.VQ_DSS_schema.ClassCountAll = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountSelected = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountFiltered = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountRest = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountUsed = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountGroups = new ReactiveVar('');
Template.VQ_DSS_schema.PropCount = new ReactiveVar('');
Template.VQ_DSS_schema.PropCountRest = new ReactiveVar('');
Template.VQ_DSS_schema.ManualDisabled = new ReactiveVar('disabled');
Template.VQ_DSS_schema.FilterDisabled = new ReactiveVar('');
Template.VQ_DSS_schema.NsFilters = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCount = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountForSlider = new ReactiveVar('');


Interpreter.customMethods({
	VQ_DSS_schema: function(){
		Template.VQ_DSS_schema.SchemaName.set(dataShapes.schema.schemaName);
		Template.VQ_DSS_schema.ClassCountAll.set(dataShapes.schema.classCount);
		Template.VQ_DSS_schema.ClassCountFiltered.set('');
		// TODO cik lielas shēmas vispār piedāvāju vizualizēt
		if ( dataShapes.schema.classCount < dataShapes.schema.diagram.maxCount) {
			Template.VQ_DSS_schema.isBig.set(false);
			setClassList0();
		}
		else {
			Template.VQ_DSS_schema.isBig.set(true);
		}	
		
		$("#VQ-DSS-schema").modal("show");
	},
	
})


Template.VQ_DSS_schema.helpers({
	classes: function() {
		return Template.VQ_DSS_schema.Classes.get();
	}, 
	restClasses: function() {
		return Template.VQ_DSS_schema.RestClasses.get();
	},
	usedClasses: function() {
		return Template.VQ_DSS_schema.UsedClasses.get();
	},
	subClasses: function() {
		return Template.VQ_DSS_schema.SubClasses.get();
	},
	classProperties: function() {
		return Template.VQ_DSS_schema.ClassProperties.get();
	},
	info_schema: function() {
		return Template.VQ_DSS_schema.SchemaName.get();
	},
	isBig: function() {
		return Template.VQ_DSS_schema.isBig.get();
	},
	classCountAll: function() {
		return Template.VQ_DSS_schema.ClassCountAll.get();
	},
	classCountSelected: function() {
		return Template.VQ_DSS_schema.ClassCountSelected.get();
	},
	classCountFiltered: function() {
		return Template.VQ_DSS_schema.ClassCountFiltered.get();
	},
	classCountRest: function() {
		return Template.VQ_DSS_schema.ClassCountRest.get();
	},
	classCountUsed: function() {
		return Template.VQ_DSS_schema.ClassCountUsed.get();
	},
	classCountGroups: function() {
		return Template.VQ_DSS_schema.ClassCountGroups.get();
	},
	classCountForSlider: function() {
		return Template.VQ_DSS_schema.ClassCountForSlider.get();
	},
	propCount: function() {
		return Template.VQ_DSS_schema.PropCount.get();
	},
	propCountRest: function() {
		return Template.VQ_DSS_schema.PropCountRest.get();
	},
	manualDisabled: function() {
		return Template.VQ_DSS_schema.ManualDisabled.get();
	},
	filterDisabled: function() {
		return Template.VQ_DSS_schema.FilterDisabled.get();
	},
	nsFilters: function() {
		return Template.VQ_DSS_schema.NsFilters.get();
	},
	classCount: function() {
		return Template.VQ_DSS_schema.ClassCount.get();
	},
	properties: function() {
		return Template.VQ_DSS_schema.Properties.get();
	},
	restProperties: function() {
		return Template.VQ_DSS_schema.RestProperties.get();
	},	
	
});

function getParams() {
	const par = {addIds:$("#addIds").is(":checked"), disconnBig:$("#disconnBig").val(), compView:$("#compView").is(":checked"),
	diffG:$("#diffG").val(), diffS:$("#diffS").val(), supPar:$("#supPar").val(), schema:dataShapes.schema.schema};
	return par;
}

function getInfo() {
	return  [ `${dataShapes.schema.endpoint}`, `${Template.VQ_DSS_schema.ClassCountSelected.get()} classes in the diagram`,
	$('#nsFilter option:selected').text(), $('#disconnBig option:selected').text(),  $('#diffG option:selected').text(),
	$('#diffS option:selected').text(),  $('#supPar option:selected').text()];
} 

async function getClassesAndProperties() {
	let classList = Template.VQ_DSS_schema.Classes.get();
	let all_s = [];
	_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
	
	_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
		if ( all_s.includes(cl.id)) cl.sel = 1;
	});
	classList = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.sel == 1});

	classList = classList.map(v => v.id);
	let propList = Template.VQ_DSS_schema.Properties.get();
	if ( propList.length == 0 ) {
		const allParams = {main: { c_list: `${classList}` }};
		const rr = await dataShapes.callServerFunction("xx_getPropList2", allParams);	
		propList = rr.data;
	}
	return [classList, propList];
}

async function printSup(par0) {
	const classesAndProperties = await getClassesAndProperties();
	const classList = classesAndProperties[0];
	const propList = classesAndProperties[1];
	let par = getParams();
	par.printGroups = par0.printGroups; 
	par.printDiffs = par0.printDiffs;
	await dataShapes.makeSuperDiagr(classList, propList, par, getInfo().join('\n'));	
}

function setClassProperties(cId) {
	const cInfo = rezFull.classes[cId];
	let classProperties = [];
	for (const atr of cInfo.atr_list ) {
		//const aInfo = {id:`${atr.type} ${atr.p_name}`, display_name:`${atr.type} ${atr.p_name} ${roundCount(atr.cnt)} ${atr.cnt2}`};
		const aCnt = ( atr.cnt2 == atr.cnt ) ? '' : `${roundCount(atr.cnt)}`;
		const aInfo = {id:`${atr.type} ${atr.p_name}`, display_name:`${atr.p_name} ${atr.type} ${roundCount(atr.cnt2)} ${aCnt}`, cnt2:atr.cnt2};
		if ( atr.cnt == 0 )
			aInfo.selected = 'selected';
		classProperties.push(aInfo);
	}
	//classProperties = classProperties.sort(function (a, b) { return ('' + a.id).localeCompare(b.id); });
	classProperties = classProperties.sort((a, b) => { return b.cnt2 - a.cnt2; });
	Template.VQ_DSS_schema.ClassProperties.set(classProperties);
}

function setSubClasses(cId) {
	const cInfo = rezFull.classes[cId];
	let subClasses = [{id:cId, display_name:cInfo.fullName, cnt_sum:cInfo.cnt_sum, selected:'selected'}];
	if ( cInfo.isGroup || cInfo.type == 'Abstract') {
		for (const sc of cInfo.c_list ) {
			const scInfo = rezFull.classes[sc];
			subClasses.push({id:sc, display_name:`.  ${scInfo.fullName}`, cnt_sum:scInfo.cnt_sum });
		}
	}
	Template.VQ_DSS_schema.SubClasses.set(subClasses);
	setClassProperties(cId);
}

Template.VQ_DSS_schema.events({
	'click #makeDiagr2': async function() {
		const classesAndProperties = await getClassesAndProperties();
		const classList = classesAndProperties[0];
		const propList = classesAndProperties[1];

		await dataShapes.makeSuperDiagr(classList, propList, getParams(), getInfo().join('\n'));
	}, 
	'click #calck': async function() {
		//TODO šis vēlāk vairs nebūs
		const classesAndProperties = await getClassesAndProperties();
		const classList = classesAndProperties[0];
		const propList = classesAndProperties[1];
		await dataShapes.makeSuperDiagr(classList, propList, getParams(), '', true);
		let cl = await dataShapes.getClasses();
		console.log('cccc', cl.data);
		const sh = dataShapes.schema.schema;
		dataShapes.schema.schema = 'europeana';
		cl = await dataShapes.getClasses();
		console.log('cccc2', cl.data);
		dataShapes.schema.schema = sh;
		console.log('Info', dataShapes.schema.info)
		console.log('Info2', dataShapes.getOntologiesSync())
		
		cl = await dataShapes.resolveClassByName({name: 'w:Photograph'})
		console.log(cl)
		dataShapes.schema.schema = 'europeana';
		dataShapes.schema.resolvedClasses = {}
		cl = await dataShapes.resolveClassByName({name: 'w:Photograph'})
		console.log(cl)
	},
	'click #printGroups': async function() {
		//TODO šis vēlāk vairs nebūs
		await printSup({printGroups:true});
	},	
	'click #printDiffs': async function() {
		//TODO šis vēlāk vairs nebūs
		await printSup({printDiffs:true});
	},
	'click #showClassess': async function() {
		await getBasicClasses();
		showClasses();
	},
	'click #showGroups': async function() {
		if ( state == 0 )
			await getBasicClasses(); // TODO varētu šīs jau būt izrēķinātas
		calculateGroups();
		makeSuperClasses(); 
		showClasses();
		console.log('Savācām grupas')
		console.log('rezFull', rezFull);
	},
	'click #makeDiagr': async function() {
		if ( state == 0 )
			await getBasicClasses(); // TODO varētu šīs jau būt izrēķinātas
		calculateGroups();
		makeSuperClasses(); 
		makeAssociations();
		makeDiagramData();
		rezFull.info = getInfo().join('\n');
		console.log('rezFull', rezFull);
		let link = document.createElement("a");
		link.setAttribute("download", "diagr_data.json");
		link.href = URL.createObjectURL(new Blob([JSON.stringify(rezFull, 0, 4)], {type: "application/json;charset=utf-8;"}));
		document.body.appendChild(link);
		link.click();
	},
	'click #getProperties': async function() {
		let classList = Template.VQ_DSS_schema.Classes.get();
		classList = classList.map(v => v.id);
		const rr = await dataShapes.callServerFunction("xx_getPropList2", {main: { c_list: `${classList}`}});
		Template.VQ_DSS_schema.Properties.set(rr.data);
		Template.VQ_DSS_schema.PropCount.set(rr.data.length);
	},
	'change #classCount': function() {
		setClassList(true);
		clearData();
	},
	'change #nsFilter': function() {
		setClassList();
		clearData();
	},
	'change #sortPar': function() {
		sortClassList();
		clearData();
	},
	'change #supPar': function() {
		clearData();
	},
	'change #diffG': function() {
		clearData();
	},
	'change #diffS': function() {
		clearData();
	},
	'click #manual': function() {
		if ( $("#manual").is(":checked") ) {
			Template.VQ_DSS_schema.ManualDisabled.set("");
			Template.VQ_DSS_schema.FilterDisabled.set("disabled");
			const classList = Template.VQ_DSS_schema.Classes.get().map(v => v.id);
			_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
				if ( classList.includes(cl.id))
					cl.sel = 1;
			});
		}
		else {
			Template.VQ_DSS_schema.ManualDisabled.set("disabled");
			Template.VQ_DSS_schema.FilterDisabled.set("");
		}
	},
	'click #removeAll': function() {
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) { cl.sel = 0; });
		makeClassLists();
		clearData();
	},
	'click #removeSelected': function() {
		if ($("#selectedClasses").val() != undefined) {
			const selected = $("#selectedClasses").val().map(v => Number(v));

			_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
				if ( selected.includes(cl.id) )
					cl.sel = 0; 
			});
			makeClassLists();
		}
		clearData();
	},
	'change #usedClasses': function() {
		setSubClasses($("#usedClasses").val());
	},
	'change #subClasses': function() {
		setClassProperties($("#subClasses").val());
	},	
	'click #addSelected': function() {
		if ($("#restClasses").val() != undefined) {
			const selected = $("#restClasses").val().map(v => Number(v));
			_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
				if ( selected.includes(cl.id) )
					cl.sel = 1; 
			});
			makeClassLists();
		}
		clearData();
	},		
	'click #removeSelectedProp': function() {
		if ($("#selectedProperties").val() != undefined) {
			const selected = $("#selectedProperties").val().map(v => Number(v));
			let propList = Template.VQ_DSS_schema.Properties.get();
			let restPropList = Template.VQ_DSS_schema.RestProperties.get();
			for (const p of propList) {
				if ( selected.includes(p.id))	
					restPropList.push(p);
			}
			propList = propList.filter(function(p){ return !selected.includes(p.id); });
			Template.VQ_DSS_schema.Properties.set(propList);
			Template.VQ_DSS_schema.PropCount.set(propList.length);
			restPropList = restPropList.sort((a, b) => { return b.cnt - a.cnt; });
			Template.VQ_DSS_schema.RestProperties.set(restPropList);
			Template.VQ_DSS_schema.PropCountRest.set(restPropList.length);
		}
		clearData();
	},
	'click #addSelectedProp': function() {
		if ($("#restProperties").val() != undefined) {
			const selected = $("#restProperties").val().map(v => Number(v));
			let propList = Template.VQ_DSS_schema.Properties.get();
			let restPropList = Template.VQ_DSS_schema.RestProperties.get();
			for (const p of restPropList) {
				if ( selected.includes(p.id))	
					propList.push(p);
			}
			restPropList = restPropList.filter(function(p){ return !selected.includes(p.id); });
			propList = propList.sort((a, b) => { return b.cnt - a.cnt; });
			Template.VQ_DSS_schema.Properties.set(propList);
			Template.VQ_DSS_schema.PropCount.set(propList.length);
			Template.VQ_DSS_schema.RestProperties.set(restPropList);
			Template.VQ_DSS_schema.PropCountRest.set(restPropList.length);
		}
		clearData();
	},
	'input #diffS': function() {
		let slider = document.getElementById("diffS");
		let output = document.getElementById("diffS-slider-span");
		output.innerHTML = slider.value;
	},
	'input #classCount': function() {
		let slider = document.getElementById("classCount");
		let output = document.getElementById("classCount-slider-span");
		output.innerHTML = slider.value;
		clearData();
	},
});

function setClassListInfo(classes, restClasses) {
	for ( const c of classes) {
		c.selected = '';
	}
	for ( const c of restClasses) {
		c.selected = '';
	}
	Template.VQ_DSS_schema.Classes.set(classes);
	Template.VQ_DSS_schema.ClassCountSelected.set(classes.length);	
	Template.VQ_DSS_schema.RestClasses.set(restClasses);	
	Template.VQ_DSS_schema.ClassCountRest.set(restClasses.length);
}

function setClassList0() {
	Template.VQ_DSS_schema.ManualDisabled.set("disabled");
	Template.VQ_DSS_schema.FilterDisabled.set("");
	Template.VQ_DSS_schema.Properties.set([]);
	Template.VQ_DSS_schema.RestProperties.set([]);
	const nsFilters = [{value:'All' ,name:'Classes in all namespaces'},{value:'Local' ,name:'Only local classes'},{value:'Exclude' ,name:'Exclude owl:, rdf:, rdfs:'}];

	const schema = dataShapes.schema.schema;
	let nsFiltersSel = 'All';
	let classCountSel = 300;
	
	let filteredClassList = dataShapes.schema.diagram.classList;	
	console.log('*** Esam koka veidošanā ***', schema)

	// TODO  Šis ir manai ērtībai, vai nu jāmet ārā, vai jāliek konfigurācijā

	if ( schema == 'mondial' ) {
		nsFiltersSel = 'Local';
	}
	else if ( schema == 'europeana' ) {
		nsFiltersSel = 'Exclude'
	}
	else if ( schema == 'academy_sampo_x' || schema == 'academy_sampo' ) {
		nsFiltersSel = 'Exclude'
	}
	else if ( schema == 'war_sampo' || schema == 'war_sampo_2' ) {
		nsFiltersSel = 'Local';
	}
	
	if ( nsFiltersSel == 'Exclude' ) 
		filteredClassList = dataShapes.schema.diagram.classList.filter(function(c){ const not_in = ['owl','rdf','rdfs']; return !not_in.includes(c.prefix);});
	if ( nsFiltersSel == 'Local' ) 
		filteredClassList = filteredClassList.filter(function(c){ return c.is_local == 1;});

	if ( filteredClassList.length < 300 )	
		classCountSel = filteredClassList.length;
	
	dataShapes.schema.diagram.filteredClassList = filteredClassList;
	Template.VQ_DSS_schema.ClassCountFiltered.set(filteredClassList.length);
	Template.VQ_DSS_schema.ClassCountForSlider.set(classCountSel);
	nsFilters.find(function(f){ return f.value == nsFiltersSel;}).selected = 'selected';
	Template.VQ_DSS_schema.NsFilters.set(nsFilters);

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
		classList = classList.sort(function(a,b){ return b.cnt_sum-a.cnt_sum;});
	if  ( sortP == 2) 
		classList = classList.sort(function(a,b){ return a.order-b.order;});
	if  ( sortP == 3) 
		classList = classList.sort(function(a,b){ return b.cnt-a.cnt;});
	if  ( sortP == 4) 
		classList = classList.sort(function(a,b){ return b.in_props-a.in_props;});
	
	dataShapes.schema.diagram.classList = classList;
	
	if (Template.VQ_DSS_schema.ManualDisabled.get() == "") {
		let classes = Template.VQ_DSS_schema.Classes.get();
		let restClasses = Template.VQ_DSS_schema.RestClasses.get();
		if  ( sortP == 1) { 
			classes = classes.sort(function(a,b){ return b.cnt_sum-a.cnt_sum;});
			restClasses = restClasses.sort(function(a,b){ return b.cnt_sum-a.cnt_sum;});
		}	
		if  ( sortP == 2) {
			classes = classes.sort(function(a,b){ return a.order-b.order;});
			restClasses = restClasses.sort(function(a,b){ return a.order-b.order;});
		}
		if  ( sortP == 3) {
			classes = classes.sort(function(a,b){ return b.cnt-a.cnt;});
			restClasses = restClasses.sort(function(a,b){ return b.cnt-a.cnt;});
		}
		if  ( sortP == 4) {
			classes = classes.sort(function(a,b){ return b.in_props-a.in_props;});
			restClasses = restClasses.sort(function(a,b){ return b.in_props-a.in_props;});
		}
		setClassListInfo(classes, restClasses);
	}
	else
		setClassList(true);
}

function setClassList(changeCount = false) {

	if (Template.VQ_DSS_schema.ManualDisabled.get() == "disabled") {
		let filteredClassList = dataShapes.schema.diagram.classList;
		const nsFilter = $("#nsFilter").val();
		let classCount = $("#classCount").val();

		if ( nsFilter == 'Exclude')
			filteredClassList = filteredClassList.filter(function(c){ const not_in = ['owl','rdf','rdfs']; return !not_in.includes(c.prefix);});
		if ( nsFilter == 'Local')
			filteredClassList = filteredClassList.filter(function(c){ return c.is_local == 1;});
			
		Template.VQ_DSS_schema.ClassCountFiltered.set(filteredClassList.length);	

		const classCountForSlider = ( filteredClassList.length < 300 ) ? filteredClassList.length : 300;
		Template.VQ_DSS_schema.ClassCountForSlider.set(classCountForSlider);
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
	const classes = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.sel == 1});
	const restClasses = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.sel == 0});
	setClassListInfo(classes, restClasses);
	sortClassList() 
}
// *********************** Datu glabāšanas vietas *********************************************************
var rezFull = {classes:{}, assoc:{}, lines:{}};
var p_list_full = {};
var state = 0;  // 0 - tukšš, 1 - pamata klases, 2 - grupas un virsklases
var Gnum = 101;
var Snum = 101;
var cpc_info = [];
var has_cpc = false;
function clearData() {
	console.log('Iztīra datus')
	rezFull = {classes:{}, assoc:{}, lines:{}, schema:dataShapes.schema.schema, type:'makeSuperDiagr'}; // TODO te zīmešanai nav vairāku variantu
	p_list_full = {}; 
	state = 0;
	Gnum = 101;
	Snum = 101;
	cpc_info = [];
	has_cpc = false;
	Template.VQ_DSS_schema.UsedClasses.set([]);
	Template.VQ_DSS_schema.SubClasses.set([]);
	Template.VQ_DSS_schema.ClassProperties.set([]);
	Template.VQ_DSS_schema.ClassCountUsed.set('');
	Template.VQ_DSS_schema.ClassCountGroups.set('');
}
// **********************************************************************************************************
// ***************** Vairākkart izmantojamās funkcijas ******************************************************
// **********************************************************************************************************
function getDiffs() {
	const diffG = $("#diffG").val();
	let diffS = $("#diffS").val();
	if ( $("#supPar").val() == 2 ) 
		diffS = -1; // Ja ir parametrs savilkt visparinašanas, tad arī abstraktās netiek taisītas
	
		return {diffG:diffG, diffS:diffS};
}

// ***************** Konstantes***************************
function checkSimilarity(diff, level) {
	const diffs = getDiffs();
	let result = false;
	if ( level == 0 ) {
		if ( diff[1] == 0 )
		result = true;
	}
	else if ( level == 1 ) {
		if ( diff[1] < diffs.diffG && diff[0] > diff[1] ) // TODO padomāt, vai prasīt līdzību, vai neprasīt
			result = true;
	}
	else if ( level == 2 )  {
		if ( diff[0] > diffs.diffS )
			result = true;
	}
	return result;	
}

// Funkcija, kas pārbauda, vai klases (sarakstus) var apvienot
function areSimilar(rezFull, classList1, classList2, level) {
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
	let diifB = Math.round(Bd + Bo);
		if ( diifB == 0 && Bd + Bo > 0 ) {
			diifB = 0.5;
		}
	return [Math.round(Ad + Ao), diifB]; //[Math.round(Ad + Ao), Math.round(Bd + Bo)]; 
}	

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

// Līdzīgo klašu atrašana (0) , vēlāk tiks veidotas grupas (level = 1) 
function findSimilarClasses(level) {
	// TODO te bija kaut kas arī virsklašu taisīšanai
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
			if ( areSimilar(rezFull, temp2[classInfo2.gId], [classInfo1.id], level) ) {
				temp2[classInfo2.gId].push(classInfo1.id);
				classInfo1.gId = classInfo2.gId;
			}
			else {
				line.red = '5';
			}
		}
		if ( classInfo1.gId != '' && classInfo2.gId == '') {
			if ( areSimilar(rezFull,  temp2[classInfo1.gId], [classInfo2.id], level) ) {
				temp2[classInfo1.gId].push(classInfo2.id);
				classInfo2.gId = classInfo1.gId;
			}
			else {
				line.red = '5';
			}
		}
		if ( classInfo1.gId != '' && classInfo2.gId != '' && classInfo1.gId != classInfo2.gId ) {
			// console.log('Apvienojam grupas', classInfo1.gId, temp2[classInfo1.gId], classInfo2.gId, temp2[classInfo2.gId])
			if ( areSimilar(rezFull,  temp2[classInfo1.gId], temp2[classInfo2.gId], level) ) {
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
			// TODO šeit izmet ārā tās klases, kuras nav parāk draudzīgas ar pārējām
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
						if ( diff[0] > diff[1]) // TODO šet arī kaut kādu līdzību pieprasa, it ka 'else' varētu arī neiestāties
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

// Funkcija atribūtu apvienojuma veidošanai
function makeAtrTree(cl_list) {
	let atrTree = {};
	for (const classInfo of cl_list) {
		for (const atr of classInfo.atr_list ) {
			let prop = `${atr.p_name}_${atr.type}`;
			if ( atrTree[prop] == undefined) {
				atrTree[prop] = { class_list:atr.class_list, cnt:atr.cnt, cnt2:atr.cnt2,  is_domain:atr.is_domain, is_range:atr.is_range, max_cardinality:atr.max_cardinality, 
					object_cnt:atr.object_cnt, p_id:atr.p_id, p_name:atr.p_name, type:atr.type, count:1};	
			}	
			else {
				atrTree[prop].count = atrTree[prop].count + 1;
				atrTree[prop].cnt = atrTree[prop].cnt + atr.cnt;
				atrTree[prop].cnt2 = atrTree[prop].cnt2 + atr.cnt2;
				atrTree[prop].object_cnt = atrTree[prop].object_cnt + atr.object_cnt;
				if ( atr.max_cardinality == '*' )
					atrTree[prop].max_cardinality = '*';
				if ( !(atrTree[prop].is_domain == 'D' && atr.is_domain == 'D'))
					atrTree[prop].is_domain = '';
				if ( !(atrTree[prop].is_range == 'R' && atr.is_range == 'R'))
					atrTree[prop].is_range = '';
				for (const cl of atr.class_list) {
					if ( !atrTree[prop].class_list.includes(cl))
						atrTree[prop].class_list.push(cl);
				}
			}

		}
	}		
	return atrTree;
}

// Funkcija klašu grupas izveidošanai, izmanto dažādās situācijās 
function makeClassGroup(list, type, sum = true) {
	let g_id = '';
	if ( list.length > 1 ) {
		let atr_list = [];
		const atrTree = makeAtrTree(list);
		let c_list_full = [];
		for (const pId of Object.keys(atrTree)) {
			atr_list.push(atrTree[pId]);
		}
		g_id = `g_${Gnum}`;
		let i_cnt = 0;
		let i_in_props = 0;
		for (let classInfo of list )	{
			classInfo.used = false;
			i_cnt = i_cnt + classInfo.cnt;
			i_in_props = i_in_props + classInfo.in_props;
			if ( classInfo.isGroup ) {
				for (const cId of classInfo.c_list) {
					let cInfo = rezFull.classes[cId];
					if ( cInfo.G_id == undefined )
						cInfo.G_id = [g_id];
					else
						cInfo.G_id.push(g_id);
					c_list_full.push(cInfo);
				}							
			}
			else {
				if ( classInfo.G_id == undefined )
					classInfo.G_id = [g_id];
				else
					classInfo.G_id.push(g_id);
				c_list_full.push(classInfo);
			}		
		}

		for (const classInfo of c_list_full) {
			for (const atr of atr_list) {
				if ( classInfo.atr_list.filter(function(a){ return a.p_name == atr.p_name && a.type == atr.type}).length == 0 ) {
					const a2 = {p_name:atr.p_name, type:atr.type, cnt:0, cnt2:atr.cnt2 };
					classInfo.atr_list.push(a2);
				}
				else {
					const cAtr = classInfo.atr_list.find(function(a){ return a.p_name == atr.p_name && a.type == atr.type});
					cAtr.cnt2 = atr.cnt2;
				}
			}
		}
		const cnt_sum = ( sum ) ? `(~${roundCount(getWeight(i_cnt, i_in_props))})`: `(${roundCount(list[0].cnt_sum)})`;
		let fullName = `${c_list_full.sort((a, b) => { return b.cnt_sum - a.cnt_sum; })[0].displayName} et al. G${Gnum} ${cnt_sum}`;
		let displayName = `${c_list_full.sort((a, b) => { return b.cnt_sum - a.cnt_sum; })[0].displayName} et al.`;
		if ( c_list_full.length == 2 ) {
			fullName = `${c_list_full[0].displayName} or ${c_list_full[1].displayName} G${Gnum} ${cnt_sum}`;
			displayName = `${c_list_full[0].displayName} or ${c_list_full[1].displayName}`;
		}
		rezFull.classes[g_id] = { id:g_id, super_classes:[], used:true, hasGen:false, type:type, 
			displayName:displayName, fullName:fullName, isGroup:true, c_list:c_list_full.map(c => c.id), c_list_id:c_list_full.map(c => c.id_id),
			sub_classes_group_string:c_list_full.map(c => c.fullName).sort().join('\n'),			
			sup:[], sub:[], atr_list:atr_list, all_atr:[], cnt:i_cnt, cnt_sum:getWeight(i_cnt, i_in_props), in_props:i_in_props }; 

		Gnum = Gnum + 1;
	}
	return g_id;
}
function makeClassGroupFromTree(GroupTree) {
	for (const Gid of Object.keys(GroupTree)) {
		let c_list_full = [];
		for (const cId of GroupTree[Gid]) {
			c_list_full.push(rezFull.classes[cId]);
		}
		makeClassGroup(c_list_full, 'Class');
	}
}

// **************************
function getWeight(cnt, in_props) {
	return cnt + Math.round(Math.pow(in_props, 5/6));
}

// **********************************************************************************************************
// *** Parāda klašu sarakstu
function showClasses() {
	let usedClasses	= [];
	for (const cl of Object.keys(rezFull.classes)) {
		let cInfo = rezFull.classes[cl];
		if ( cInfo.used ) {
			let pref = 'C';
			if ( cInfo.isGroup ) pref = 'G';
			if ( cInfo.type == 'Abstract' ) pref = 'A';
			usedClasses.push({id:cl, display_name:`${pref} ${cInfo.fullName}`, cnt_sum:cInfo.cnt_sum}); 
		}
	}
	usedClasses.sort((a, b) => { return b.cnt_sum - a.cnt_sum; });
	if ( usedClasses.length > 0 ) {
		usedClasses[0].selected = 'selected';
		setSubClasses(usedClasses[0].id);
	}
	Template.VQ_DSS_schema.UsedClasses.set(usedClasses);
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
	Template.VQ_DSS_schema.UsedClasses.set(usedClasses);
	Template.VQ_DSS_schema.ClassCountUsed.set(clCount);
	Template.VQ_DSS_schema.ClassCountGroups.set(grCount);

}
// *** Salasa sākotnējās klases un to propertijas
async function getBasicClasses() {
	console.log('Meklē sākotnējās klases')
	clearData();
	const classesAndProperties = await getClassesAndProperties();
	const c_list = classesAndProperties[0];
	const p_list = classesAndProperties[1];
	const par = getParams();
	let rr;
	const addIds = par.addIds;
	const compView = par.compView; // Atribūtu parametrs
	let allParams = {main: { c_list: `${c_list}`, limit:c_list.length}};
	has_cpc = false;
	let cp_info;
	
	rr = await dataShapes.callServerFunction("xx_getClassListInfo", allParams);
	// Pamata klašu saraksta izveidošana
	_.each(rr.data, function(cl) {
		const id = `c_${cl.id}`;
		let type = 'Class';
		if ( cl.classification_property != undefined && cl.classification_property != 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
			type = 'Classif';
		}	
		//let full_name = `${cl.full_name} (${roundCount(cl.cnt)})`;
		cl.cnt = Number(cl.cnt);
		let full_name = `${cl.full_name} (weight-${roundCount(cl.cnt_sum)} (${roundCount(cl.cnt)} ${roundCount(cl.in_props)}))`;

		if ( addIds ) full_name = `${full_name} ID-${cl.id}`;
			rezFull.classes[id] = { id:id, id_id:cl.id, c_list_id:[cl.id],	super_classes:[], used:false, hasGen:false, type:type, 
				displayName:cl.full_name, fullName:full_name,			
				sup:cl.s, sub:cl.b, sup0:cl.s0, sub0:cl.b0, atr_list:[], all_atr:[], cnt:cl.cnt, cnt_sum:cl.cnt_sum, in_props:cl.in_props };
	});
	
	rr = await dataShapes.callServerFunction("xx_getCCInfo", allParams); 
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
	
	rr = await dataShapes.callServerFunction("xx_getCPCInfo", allParams); 
	cpc_info = rr.data;
	if ( cpc_info.length > 0 ) has_cpc = true;
	allParams.main.p_list =  p_list.map(v => v.id);
	rr = await dataShapes.callServerFunction("xx_getCPInfo", allParams); 
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
				const p_info = {p_name:pp.p_name, p_id:pp.id, type:'data', cnt:Number(cl.cnt), cnt2:Number(cl.cnt), object_cnt:Number(cl.object_cnt), is_domain:pp.is_domain, is_range:'', max_cardinality:pp.max_cardinality, class_list:[]};
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
				const p_info = {p_name:pp.p_name, p_id:pp.id, type:'out', cnt:Number(c_1.cnt), cnt2:Number(c_1.cnt), object_cnt:Number(c_1.object_cnt), is_domain:pp.is_domain, is_range:pp.is_range, max_cardinality:pp.max_cardinality, class_list:cl_list.sort()};
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
				const p_info = {p_name:pp.p_name, p_id:pp.id, type:'in', cnt:Number(c_2.cnt), cnt2:Number(c_2.cnt), object_cnt:Number(c_2.object_cnt), is_domain:pp.is_domain, is_range:pp.is_range, class_list:cl_list.sort()};
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
	console.log('p_list_full', p_list_full);
	console.log('rezFull', rezFull);
}

// *** Izveido klašu grupas, skatoties uz parametiem
async function calculateGroups() {
	// Tiek padots zīmējamo klašu un propertiju saraksts
	const par = getParams();
	const diffG = par.diffG;
	const compChain = ( par.supPar == 1 ) ? true : false; // Vai apvienot vispārinašanas virknes
	const compTree = ( par.supPar == 2 ) ? true : false; // Vai apvienot sākotnējos klašu kokus

	// Sākotnējo klašu koku apvienošana
	if ( compTree ) {
		let top_classes = [];
		for (const clId of Object.keys(rezFull.classes)) {
			const classInfo = rezFull.classes[clId];
			if ( classInfo.sup0.length == 0 && classInfo.sub0.length > 0 ) {
				top_classes.push(classInfo);
			}
		}
		for (const tClass of top_classes) {
			let class_list = [];
			for (const cId of tClass.sub) {
				class_list.push(rezFull.classes[`c_${cId}`]);
			}
			// TODO varētu būt papildus nosacījumi, vai doto klašu koku var apvienot
			console.log('Klašu koki******************', class_list)
			makeClassGroup(class_list, 'Class', false); 
		}
	}

	// Virsklašu virkņu apvienošana - compTree un compChain ir savstarpēji izslēdzoši
	if ( compChain) {
		let top_classes = [];
		for (const clId of Object.keys(rezFull.classes)) {
			const classInfo = rezFull.classes[clId];
			if ( classInfo.sub0.length == 1 && ( classInfo.sup0.length != 1 || classInfo.cnt != rezFull.classes[`c_${classInfo.sup0[0]}`].cnt)) {
				const classInfo2 = rezFull.classes[`c_${classInfo.sub0[0]}`];
				if ( classInfo.cnt == classInfo2.cnt && classInfo2.sup0.length == 1) {
					top_classes.push(classInfo);
				}	
			}
		}
		console.log('Virkņu sākumi', top_classes)
		for (const topClass of top_classes) {
			let isNext = true;
			let class_chain = [topClass];
			let thisClass = topClass;
			while ( isNext || class_chain.length > 100) { // TODO Te tāda dīvaina konstante, skatās, vai tās virknes nav pārāk garas 
				isNext = false;
				const nextClass = rezFull.classes[`c_${thisClass.sub0[0]}`];
				class_chain.push(nextClass);
				if (nextClass.sub0.length == 1 ) {
					const nextNextClass = rezFull.classes[`c_${nextClass.sub0[0]}`];
					if ( nextClass.cnt == nextNextClass.cnt && nextNextClass.sup0.length == 1 ) {
						isNext = true;
						thisClass = nextClass;
					}
				} 
			}
			const classGrId = makeClassGroup(class_chain, 'Class', false);
			rezFull.classes[classGrId].super_classes = class_chain[0].super_classes;
		}
		for (const clId of Object.keys(rezFull.classes)) {
			let classInfo = rezFull.classes[clId];
			if ( classInfo.used ) {
				let s_list = [];
				for (const sId of classInfo.super_classes) {
					if (rezFull.classes[sId].G_id == undefined)
						s_list.push(sId);
					else
						s_list.push(rezFull.classes[sId].G_id[0]); //TODO Ir pieņēmums, ka būs pareizi koki
				}
				classInfo.super_classes = s_list;
			}
		}
	}

	// Sākotnējo(obligāto) grupu veidošana 
	function makeFirstGroups() {
		// Atrod dažādas klašu grupas, bez atribūtiem, bez vai ar virsklasēm
		let empty_classes = [];
		let empty_sub_classes = {};
		let equivalent_classes = {};
		for (const clId of Object.keys(rezFull.classes)) {
			let classInfo = rezFull.classes[clId];
			if ( classInfo.used ) {
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
		}
		
		// Veido dažādas klašu grupas, bez atribūtiem, bez vai ar virsklasēm
		if ( empty_classes.length > 0 ) {
			makeClassGroup(empty_classes.filter(function(c){ return c.type == 'Class'; }), 'Class');
			makeClassGroup(empty_classes.filter(function(c){ return c.type == 'Classif'; }), 'Classif');
		}
		for (const sup_id of Object.keys(empty_sub_classes)) {
			const classGrId =  makeClassGroup(empty_sub_classes[sup_id].filter(function(c){ return c.type == 'Class'; }), 'Class');
			if ( classGrId != '' )
				rezFull.classes[classGrId].super_classes = [sup_id];
			const classifGrId =  makeClassGroup(empty_sub_classes[sup_id].filter(function(c){ return c.type == 'Classif'; }), 'Classif');
			if ( classifGrId != '' )
				rezFull.classes[classifGrId].super_classes = [sup_id];

		}
		
		// Veido klašu grupas, skatoties uz atribūtiem, klasēm, kas neietilpst vispārinašanās
		equivalent_classes = findSimilarClasses(0);
		console.log('Ekvivalentās klases', equivalent_classes)
		makeClassGroupFromTree(equivalent_classes);
	}
	if ( diffG > 0 )
		makeFirstGroups()
	// **************************************************	

	// Apvieno tuvās klases grupās
	if ( diffG > 0 ) {
		const similarClassesG = findSimilarClasses(1); // Meklējam līdzīgas klases grupēšanai
		console.log("Līdzīgās klases grupu veidošanai", similarClassesG);
		makeClassGroupFromTree(similarClassesG);
	}
}

// Virsklašu veidošanas funkcija
function makeSuperClasses() {
	const par = getParams();
	const diffS = par.diffS;
	function makeSupClass(cl_list, temp) {
		const sc_id = `s_${Snum}`;
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
		function getInPropCount(atr_list) {
			let in_props = 0;
			for (const atr of atr_list) {
				if ( atr.type == 'in')
					in_props = in_props + atr.cnt;
			}
			return in_props;
		}
		
		rezFull.classes[sc_id] = { id:sc_id, used:true, hasGen:true,
			type:'Abstract', super_classes:[], c_list:[], c_list_id:[]};
		
		let g_list = [];
		let c_list_full = [];
		let cnt = 0;	
		for (let classInfo of cl_list) {
			c_list_full.push(classInfo);
			cnt = cnt + classInfo.cnt;
			classInfo.super_classes.push(sc_id); 
			classInfo.hasGen = true;
			classInfo.S_id = sc_id;
			if ( classInfo.isGroup ) {
				for (let g_cl of classInfo.c_list) {
					rezFull.classes[g_cl].S_id = sc_id;
					rezFull.classes[sc_id].c_list_id.push(rezFull.classes[g_cl].id_id);
				}
			}
			else {
				rezFull.classes[sc_id].c_list_id.push(classInfo.id_id);
			}
			rezFull.classes[sc_id].c_list.push(classInfo.id);
			const atr_list = makeAtrList(classInfo.atr_list);
			classInfo.atr_list = atr_list;
			classInfo.in_props = getInPropCount(atr_list);
			classInfo.cnt_sum = getWeight(classInfo.cnt, classInfo.in_props);
			classInfo.fullName = `${classInfo.displayName} (weight-${roundCount(classInfo.cnt_sum)} (${roundCount(classInfo.cnt)} ${roundCount(classInfo.in_props)}))`;

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
		rezFull.classes[sc_id].cnt = cnt;
		rezFull.classes[sc_id].in_props = getInPropCount(sup_atr_list);
		rezFull.classes[sc_id].cnt_sum = getWeight(rezFull.classes[sc_id].cnt, rezFull.classes[sc_id].in_props);
		
		let fullName = `${c_list_full.sort((a, b) => { return b.cnt - a.cnt; })[0].displayName} et al. S${Snum} (~${roundCount(rezFull.classes[sc_id].cnt_sum)})`;
		let displayName = `${c_list_full.sort((a, b) => { return b.cnt - a.cnt; })[0].displayName} et al.`;
		if ( c_list_full.length == 2 ) {
			fullName = `${c_list_full[0].displayName} or ${c_list_full[1].displayName} S${Gnum} (~${roundCount(cnt)})`;
			displayName = `${c_list_full[0].displayName} or ${c_list_full[1].displayName}`;
		}
		rezFull.classes[sc_id].fullName = fullName;
		rezFull.classes[sc_id].displayName = displayName;
	}
	
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
		rezFull.lines = {};
	}
}

// Diagrammas līniju savilkšanas daļa 
function makeAssociations() {
	const par = getParams();
	const remBig = par.disconnBig > 0;
	const remCount = par.disconnBig;
	function findNewClassList(atr, type) {
		let c_list2 = [];
		for ( const cl of atr.class_list) {
			const cInfo = rezFull.classes[`c_${cl}`];
			if ( cInfo != undefined ) {
				if ( cInfo.G_id == undefined && cInfo.S_id == undefined ) {
					c_list2.push(`c_${cl}`);
				}
				if ( cInfo.G_id != undefined && cInfo.S_id == undefined) {
					for (const g of cInfo.G_id) {
						if ( !c_list2.includes(g))
							c_list2.push(g);
					}
				}
				if ( cInfo.S_id != undefined ) {  
					const aa = rezFull.classes[cInfo.S_id].atr_list.filter(function(a){ return a.p_name == atr.p_name && a.type == type}); 
					if ( aa.length > 0) {
						if ( !c_list2.includes(cInfo.S_id))
							c_list2.push(cInfo.S_id);
					}
					else if ( cInfo.G_id != undefined ) {  // TODO te ir pieņēmums, ka visrklases taisot, katra klase var būt tikai viena grupā
						if ( !c_list2.includes(cInfo.G_id[0]))
							c_list2.push(cInfo.G_id[0]);
					}
					else {
						c_list2.push(`c_${cl}`);
					}
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
					if ( has_cpc ) {
						const cpc_info_full = cpc_info.filter(function(i){ 
							return i.property_id == atr.p_id && i.type_id == 2 && classInfo.c_list_id.includes(i.class_id) && atr.class_list.includes(i.other_class_id)}); 
						atr.object_cnt_dgr = cpc_info_full.map( v => v.cnt).reduce((a, b) => a + b, 0);
					}
					else {
						atr.object_cnt_dgr = atr.object_cnt; // TODO te varētu būt arī savādāk, kā darīt, ja nav cpc_rels
					}

					for (const to_id of atr.class_list2) {
						const aId = `${clId}_${to_id}_${atr.p_name}`;
						const p_name = ( par.addIds ) ? `${atr.p_name}(ID-${atr.p_id})`: atr.p_name;
						if ( !has_cpc) {
							rezFull.assoc[aId] = {string:`${p_name}  ${atr.is_domain}${atr.is_range}`, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:clId, to:to_id, removed:false };
						}
						else {
							const cpc_info_a = cpc_info.filter(function(i){ 
								return i.property_id == atr.p_id && i.type_id == 2 && classInfo.c_list_id.includes(i.class_id) && rezFull.classes[to_id].c_list_id.includes(i.other_class_id)}); 
							const aCnt = cpc_info_a.map( v => v.cnt).reduce((a, b) => a + b, 0);
							if ( aCnt > 0 )
								rezFull.assoc[aId] = {string:`${p_name} (${roundCount(aCnt)}) ${atr.is_domain}${atr.is_range}`, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:clId, to:to_id, removed:false };
						}
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
		if ( p_list_full[pId].count  > par.remCount )
			console.log('Propertija netiek vilkta', p_list_full[pId].p_name, p_list_full[pId].count);
	}
	for (const aa of Object.keys(rezFull.assoc)) {
		const assoc = rezFull.assoc[aa];
		if ( !assoc.removed) {
			if ( remBig && p_list_full[assoc.p_id].count > remCount ) { 
				assoc.removed = true;
			}
			else {
				p_list_full[assoc.p_id].in_diagram = true;
			}
		}
	}
}

// Funkcija diagrammas izskata sakartošanai
function makeDiagramData() {
	const par = getParams();
	// Iegūst atribūtu rādāmo izskatu, noder diagrammai
	function getAtrString(atr_info) {
		let rez = '';
		const p_name = ( par.addIds ) ? `${atr_info.p_name}(ID-${atr_info.p_id})`: atr_info.p_name;
		let cntString = roundCount(atr_info.cnt);
		let dataProc = '';
		if ( atr_info.object_cnt != atr_info.cnt && atr_info.object_cnt > 0) {
			let proc = Math.round(100*(atr_info.cnt-atr_info.object_cnt)/atr_info.cnt);
			if ( proc == 100) proc = 99.9;
			if ( proc == 0 ) proc = 0.01;
			dataProc = ` ${proc}%d`;
		}
		cntString = `(${cntString}${dataProc})`;
		if ( atr_info.type == 'data') {
			rez = `${p_name} ${cntString} [${atr_info.max_cardinality}] ${atr_info.is_domain}`; 
			if ( atr_info.object_cnt > 0 )
				rez = `${rez} -> IRI`;
		}
		else {
			// TODO klašu saraksta rādīšanā būtu jāskatās, vai kompaktie, vai nekompaktie atribūti
			let classNames = '';
			if ( !(atr_info.class_list2 == undefined) ) {
				if ( atr_info.class_list2.length > 3 ) 
					classNames = ` ${rezFull.classes[atr_info.class_list2[0]].displayName},${rezFull.classes[atr_info.class_list2[1]].displayName}..(${atr_info.class_list2.length})`;
				else 
					classNames = ` ${atr_info.class_list2.map(cl => rezFull.classes[cl].displayName).sort().join(',')}`;
			}
			if ( atr_info.type == 'out' ) {
				if ( p_list_full[`p_${atr_info.p_id}`].in_diagram )
					rez = `${p_name} ${cntString} [${atr_info.max_cardinality}] ${atr_info.is_domain}${atr_info.is_range} -> dgr,IRI`;
				else
					rez = `${p_name} ${cntString} [${atr_info.max_cardinality}] ${atr_info.is_domain}${atr_info.is_range} -> ${classNames}`;
			}
			if (atr_info.type == 'in') 
				rez = `<-${p_name} ${cntString} ${atr_info.is_range}${atr_info.is_domain} <- ${classNames}`;
			if (atr_info.type == 'cycle') 
				rez = `${p_name} ${cntString} ${atr_info.is_range}${atr_info.is_domain} <-> ${classNames}`;
			}	
		return rez; 
		//const clCount = ( atr_info.type != 'data') ? ` (${atr_info.class_list2.length})` : '';
		//if ( atr_info.type == 'data' )
		//	return `${p_name} ${atr_info.type} [${atr_info.cnt}]`;
		//else	
		//	return `${p_name} ${atr_info.type} [${atr_info.cnt}] (${atr_info.class_list2.length})`;
	}
	
	for (const clId of Object.keys(rezFull.classes)) {
		const classInfo = rezFull.classes[clId];
		let restAtrList = [];
		let inPropList = [];
		if ( classInfo.used ) {
			for ( const atr of classInfo.atr_list) {
				if ( atr.type == 'data' )
					restAtrList.push(atr);
				if ( atr.type == 'out' ) {
					if ( !(p_list_full[`p_${atr.p_id}`].in_diagram && atr.object_cnt_dgr == atr.object_cnt) )
						restAtrList.push(atr);
				}
				if ( atr.type == 'in' && !p_list_full[`p_${atr.p_id}`].in_diagram)
					inPropList.push(atr);
			}

			classInfo.atr_string = restAtrList.map(a => getAtrString(a)).sort().join('\n');
			if ( inPropList.length > 0 )
				classInfo.atr_string = `${classInfo.atr_string}\n${inPropList.map(a => getAtrString(a)).sort().join('\n')}`;
			
		}
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
}




// **********************************************************************************************************
