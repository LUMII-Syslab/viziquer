import { Template } from 'meteor/templating';
import { Interpreter } from '../../../../client/lib/interpreter.js'
import { dataShapes } from '../../../../custom/vq/client/js/DataShapes.js'
import './VQ_DSS_schema.html'
import { runFragmentAlgorithm, compareFragmentAlgorithmsIntersection, compareFragmentAlgorithmsSizeIncrease, compareFragmentAlgorithmsRank } from './fragments.js';

Template.VQ_DSS_schema.SchemaName = new ReactiveVar('');
Template.VQ_DSS_schema.Classes = new ReactiveVar([]);
Template.VQ_DSS_schema.RestClasses = new ReactiveVar([]);
Template.VQ_DSS_schema.ClassesF = new ReactiveVar([]);
Template.VQ_DSS_schema.ClassesFS = new ReactiveVar([]);
Template.VQ_DSS_schema.Properties = new ReactiveVar([]);
Template.VQ_DSS_schema.RestProperties = new ReactiveVar([]);
Template.VQ_DSS_schema.PropertiesF = new ReactiveVar([]);
Template.VQ_DSS_schema.PropertiesFS = new ReactiveVar([]);
Template.VQ_DSS_schema.UsedClasses = new ReactiveVar([]);
Template.VQ_DSS_schema.SubClasses = new ReactiveVar([]);
Template.VQ_DSS_schema.ClassProperties = new ReactiveVar([]);
Template.VQ_DSS_schema.isBig =  new ReactiveVar(true);
Template.VQ_DSS_schema.isLocal =  new ReactiveVar(false);
Template.VQ_DSS_schema.ClassCountAll = new ReactiveVar('');
Template.VQ_DSS_schema.PropCountAll = new ReactiveVar('');
Template.VQ_DSS_schema.PropSliderMax = new ReactiveVar('');
Template.VQ_DSS_schema.PropSliderSelected = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountSelected = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountFiltered = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountRest = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountUsed = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountGroups = new ReactiveVar('');
Template.VQ_DSS_schema.LinesCount = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountAbstr = new ReactiveVar('');
Template.VQ_DSS_schema.PropCount = new ReactiveVar('');
Template.VQ_DSS_schema.PropCountRest = new ReactiveVar('');
Template.VQ_DSS_schema.ManualDisabled = new ReactiveVar('disabled');
Template.VQ_DSS_schema.FilterDisabled = new ReactiveVar('');
Template.VQ_DSS_schema.NsFilters = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCount = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountForSlider = new ReactiveVar('');
Template.VQ_DSS_schema.ClassCountFromSlider = new ReactiveVar('');
//Template.VQ_DSS_schema.IsPublic = new ReactiveVar(false);
Template.VQ_DSS_schema.HasClasses = new ReactiveVar('');
Template.VQ_DSS_schema.fragmentForm = new ReactiveVar('');
Template.VQ_DSS_schema.HasCPC = new ReactiveVar('');
Template.VQ_DSS_schema.ShowFragmentBlock = new ReactiveVar('');

Interpreter.customMethods({
	VQ_DSS_schema: function(){
		// TODO liekas, ka pa šo zaru vairs neies
		console.log('-------VQ_DSS_schema !!! ------')
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

Template.VQ_DSS_schema.rendered = function( param = 'schema') {
	clearData();
	//Template.VQ_DSS_schema.IsPublic.set(true); // TODO kā lai atšķir, publiskais vai nepubliskais varaints?
  Template.VQ_DSS_schema.ShowFragmentBlock.set(false);
  Template.VQ_DSS_schema.fragmentForm.set(false);
  if ( param != 'schema')
    Template.VQ_DSS_schema.fragmentForm.set(true);
  Template.VQ_DSS_schema.SchemaName.set(dataShapes.schema.schemaName);
	Template.VQ_DSS_schema.ClassCountAll.set(dataShapes.schema.classCount);
	Template.VQ_DSS_schema.PropCountAll.set(dataShapes.schema.propCount);
	Template.VQ_DSS_schema.HasCPC.set(dataShapes.schema.has_cpc);
  Template.VQ_DSS_schema.ClassesF.set([]);
  Template.VQ_DSS_schema.ClassesFS.set([]);
  Template.VQ_DSS_schema.PropertiesF.set([]);
  Template.VQ_DSS_schema.PropertiesFS.set([]);

	// TODO cik lielas shēmas vispār piedāvāju vizualizēt
	if ( dataShapes.schema.classCount < dataShapes.schema.diagram.maxCount) {
		Template.VQ_DSS_schema.isBig.set(false);
		const propSliderSelected = setPropSliderInfo();
		Template.VQ_DSS_schema.PropSliderSelected.set(propSliderSelected);
		Template.VQ_DSS_schema.PropSliderMax.set(propSliderIntValues.length-1);
		Template.VQ_DSS_schema.ClassCountFromSlider.set(dataShapes.schema.classCount);
		if ( dataShapes.schema.classCount == 0)
			Template.VQ_DSS_schema.HasClasses.set('disabled');
		Template.VQ_DSS_schema.ClassCountFiltered.set('');
		if ( document.getElementById("propCount-slider-span") ) {
			document.getElementById("propCount-slider-span").innerHTML = `Property triples >${propSliderTextValues[propSliderSelected]}`;
			document.getElementById("propCount-slider-span2").innerHTML = `Property triples >${propSliderTextValues[propSliderSelected]}`;
		}
		setClassList0();
	}
	else {
		Template.VQ_DSS_schema.isBig.set(true);
	}
}

Template.VQ_DSS_schema.helpers({
	pub: function() {
		return dataShapes.schema.isPublic; //Template.VQ_DSS_schema.IsPublic.get();
	},
	hasClasses: function() {
		return Template.VQ_DSS_schema.HasClasses.get();
	},
	classes: function() {
		return Template.VQ_DSS_schema.Classes.get();
	},
	restClasses: function() {
		return Template.VQ_DSS_schema.RestClasses.get();
	},
  classesF: function() {
    return Template.VQ_DSS_schema.ClassesF.get();
  },
  classesFS: function() {
    return Template.VQ_DSS_schema.ClassesFS.get();
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
	linesCount: function() {
		return Template.VQ_DSS_schema.LinesCount.get();
	},
	classCountAbstr: function() {
		return Template.VQ_DSS_schema.ClassCountAbstr.get();
	},
	classCountForSlider: function() {
		return Template.VQ_DSS_schema.ClassCountForSlider.get();
	},
	propCountAll: function() {
		return Template.VQ_DSS_schema.PropCountAll.get();
	},
	propSliderSelected: function() {
		return Template.VQ_DSS_schema.PropSliderSelected.get();
	},
	propSliderMax: function() {
		return Template.VQ_DSS_schema.PropSliderMax.get();
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
	propertiesF: function() {
    //console.log('Helperis', Template.VQ_DSS_schema.propertiesF.get())
		return Template.VQ_DSS_schema.PropertiesF.get();
	},
	propertiesFS: function() {
		return Template.VQ_DSS_schema.PropertiesFS.get();
	},
	has_cpc: function () {
		return Template.VQ_DSS_schema.HasCPC.get();
	},
	showFragmentBlock: function() {
    	return Template.VQ_DSS_schema.ShowFragmentBlock.get();
	},
	fragmentForm: function() {
    	return Template.VQ_DSS_schema.fragmentForm.get();
	},
});

function getParams() {
  let diffG = (isFragment) ? 0 : $("#diffG").val();
	let par = {addIds:false, disconnBig:$("#disconnBig").val(), hideSmall:$("#hideSmall").val(), compView:$("#compView").is(":checked"), newDifs:true, cover:$("#cover").is(":checked"),
		pw:$("#pw").val(), k:1, diffG:diffG, diffS:0, supPar:1, schema:dataShapes.schema.schema, showIntersect:$("#showIntersect").is(":checked")}; // withoutGen:$("#withoutGen").is(":checked"),
		//if ( $("#diffG").val() == 10 )
		//	par.supPar = 2;
	if ( $("#abstr").is(":checked") )
		par.diffS = 50;
	if ( diffG == 0 )
		par.supPar = 0;
	if ( $("#oldDifs").is(":checked") )
		par.newDifs = false;

	//if ( !Template.VQ_DSS_schema.IsPublic.get() ) {
  if ( !dataShapes.schema.isPublic ) {
		par.addIds = $("#addIds").is(":checked");
		par.k = $("#kValue").val();
	}
	//console.log('Kāds parametrs newDiffs', par.newDifs)
	return par;
}

function getInfo() {
	return  [ `${dataShapes.schema.endpoint}`, `${Template.VQ_DSS_schema.ClassCountSelected.get()} classes in the diagram`,
			$('#nsFilter option:selected').text(), $('#disconnBig option:selected').text(),  $('#diffG option:selected').text()];
}

async function getClassesAndProperties(addSupClasses = true) {
	//addSupClasses Pagaidām ir konstante, bet būs iespēja virsklašu pielikšanu atslēgt
	let classList = Template.VQ_DSS_schema.Classes.get();
	let classIds = classList.map(v => v.id);
	let namespaces = {};
	let namespacesL = [];
	if (!$("#addSup").is(":checked"))
    	addSupClasses = false;

	if (addSupClasses) {
		let all_s = [];
		_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });

		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( all_s.includes(cl.id)) cl.sel = 1;
			else cl.sel = 0;
		});
	}
	else
	{
    	_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( classIds.includes(cl.id)) cl.sel = 1;
			else cl.sel = 0;
		});
	}

	classList = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.sel == 1});

	_.each(classList, function(cl) {
		if ( namespaces[cl.prefix] == undefined )
			namespaces[cl.prefix] = 1;
		else
			namespaces[cl.prefix] = namespaces[cl.prefix] + 1;
	});

	classList = classList.map(v => v.id);
	let propList = Template.VQ_DSS_schema.Properties.get();
	if ( propList.length == 0 ) {
		const allParams = {main: { c_list: `${classList}` }};
		const rr = await dataShapes.callServerFunction("xx_getPropList2", allParams);
		propList = rr.data;
	}
	_.each(propList, function(pr) {
		if ( namespaces[pr.prefix] == undefined )
			namespaces[pr.prefix] = 1;
		else
			namespaces[pr.prefix] = namespaces[pr.prefix] + 1;
	});

	const nsLoc = dataShapes.schema.namespaces.find(function(n){ return n.name == dataShapes.schema.local_ns });

	for (const ns of Object.keys(namespaces)) {
		const fullNs = dataShapes.schema.namespaces.find(function(n){ return n.name == ns });
		if ( fullNs != undefined && ns != 'null' && ns != dataShapes.schema.local_ns )
			namespacesL.push({name:`PREFIX ${ns}: <${fullNs.value}>`,cnt:namespaces[ns]});

		namespacesL = namespacesL.sort((a, b) => { return a.name.localeCompare(b.name); });
		//namespacesL = namespacesL.sort((a, b) => { return b.cnt - a.cnt; })
	}

    let propT = [];  // TODO Te būs jāprecizē
	  let propS = [];
    dataShapes.schema.diagram.properties.sort(function(a,b){ return b.id-a.id;});  // TODO šis ir drukai
    console.log('uuuuuuuuuuuuuuuuuuuuuu', dataShapes.schema.diagram.properties)
    //dataShapes.schema.diagram.properties.sort(function(a,b){ return b.cnt-a.cnt;});
    const onlyOrphan = $("#onlyOrphan").is(":checked");
    let parT = true;
    let parS = true;
    for (const p of dataShapes.schema.diagram.properties) {
      // TODO kaut kā unused_orphan_props būs jāņem vērā, bet ne gluži šādi
      //const tPar = p.type_1 == '0'
      if ( !unused_orphan_props.includes(p.full_name)) {
        if ( onlyOrphan ) {
          parT = p.type_1 === '0'
          parS = p.type_2 === '0'
        }
        else {
          parT = !p.target_cover_complete;
          parS = !p.source_cover_complete;
        }
		    if ( p.object_cnt !== 0 && parT && ( p.follows > 0 || p.common_objects > 0 )) { // !p.target_cover_complete p.type_1 === '0' ooooo
		      propT.push(p);
		    }
		    if ( p.object_cnt !== 0 && parS && p.is_follower === '0' && p.common_subjects > 0) { //p.type_2 === '0'
		      propS.push(p);
		    }
	    }
    }
console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%', propT, propS)
	namespacesL.unshift({name:`PREFIX ${dataShapes.schema.local_ns}: <${nsLoc.value}>`,cnt:namespaces[dataShapes.schema.local_ns]});
	return [classList, propList, namespacesL, {propT:propT, propS:propS}];
}

function setClassProperties(cId) {
	const basic = Template.VQ_DSS_schema.UsedClasses.get()[0].basic;
	const cInfo = rezFull.classes[cId];
	const subClasses = Template.VQ_DSS_schema.SubClasses.get();
	const firstClass = rezFull.classes[subClasses[0].id];
	let atr_list = ( !basic && subClasses.length > 1 && firstClass.isGroup ) ? firstClass.atr_list : cInfo.atr_list;

	let classProperties = [];
	for (const atr of atr_list ) {
		const aInfo = {id:`${atr.type} ${atr.p_name}`, display_name:`${atr.p_name} ${atr.type}
						${roundCount(atr.cnt2)}`, cnt2:atr.cnt2};
		if ( !basic && subClasses.length > 1 && cInfo.id != firstClass.id && firstClass.isGroup) {
			if ( atr.type != 'in' && !cInfo.all_atr.includes(atr.p_id))
				aInfo.selected = 'selected';
			if ( atr.type == 'in' && !cInfo.all_atr_in.includes(atr.p_id))
				aInfo.selected = 'selected';
		}
		classProperties.push(aInfo);
	}

/*
	for (const atr of cInfo.atr_list ) {
		//const aInfo = {id:`${atr.type} ${atr.p_name}`, display_name:`${atr.type} ${atr.p_name} ${roundCount(atr.cnt)} ${atr.cnt2}`};
		const aCnt = ( atr.cnt2 == atr.cnt ) ? '' : `${roundCount(atr.cnt)}`;
		const aInfo = {id:`${atr.type} ${atr.p_name}`, display_name:`${atr.p_name} ${atr.type} ${roundCount(atr.cnt2)} ${aCnt}`, cnt2:atr.cnt2};

		if ( atr.cnt == 0 && subClasses.length > 1 && subClasses[0].id == atr.gId) {
			aInfo.selected = 'selected';
			classProperties.push(aInfo);
		}
		else if ( atr.cnt > 0 ) {
			classProperties.push(aInfo);
		}
	} */
	//classProperties = classProperties.sort(function (a, b) { return ('' + a.id).localeCompare(b.id); });
	classProperties = classProperties.sort((a, b) => { return b.cnt2 - a.cnt2; });
	Template.VQ_DSS_schema.ClassProperties.set(classProperties);
}

function setSubClasses(cId) {
	const basic = Template.VQ_DSS_schema.UsedClasses.get()[0].basic; //TODO nav īsti skaisti
	const cInfo = rezFull.classes[cId];
	let subClasses = [{id:cId, display_name:cInfo.fullName, cnt_sum:cInfo.cnt_sum, selected:'selected'}];
	if ( (cInfo.isGroup || cInfo.type == 'Abstract') && !basic) {
		for (const sc of cInfo.c_list ) {
			const scInfo = rezFull.classes[sc];
			subClasses.push({id:sc, display_name:`___${scInfo.fullName}`, cnt_sum:scInfo.cnt_sum });
		}
	}
	if ( basic && cInfo.sub_classes.length > 0 ) {
		for (const sc of cInfo.sub_classes ) {
			const scInfo = rezFull.classes[sc];
			subClasses.push({id:sc, display_name:`___${scInfo.fullName}`, cnt_sum:scInfo.cnt_sum });
		}
	}
	Template.VQ_DSS_schema.SubClasses.set(subClasses);
	setClassProperties(cId);
}

async function getCPRels(allParams) {
	const calculateCoverSets = !params.cover; // Vai rēķināt cover_set_index uz vietas
	let rr;
	if (calculateCoverSets) {
		rr = await dataShapes.callServerFunction("xx_getCPInfoNew", allParams);
	}
	else {
		rr = await dataShapes.callServerFunction("xx_getCPInfo", allParams);
	}

	return rr.data;
}
async function getCPCRels(allParams) {
	const calculateCoverSets = !params.cover; // Vai rēķināt cover_set_index uz vietas
	let rr;
	if (calculateCoverSets) {
		rr = await dataShapes.callServerFunction("xx_getCPCInfoNew", allParams);
	}
	else {
		rr = await dataShapes.callServerFunction("xx_getCPCInfo", allParams);
	}

	return rr;
}

/*
function calculateCount(value, list, parentCnt) {
	//console.log('-------calculateCount---------', list, parentCnt)
	let info = { proc10:0, proc25:0, proc50:0 };
	let rezValue = value;

	for (const el of list ) {
		el.pproc = Math.round(el.cnt*100/parentCnt)
		if ( el.cnt < parentCnt/2 ) {
			info.proc50 = info.proc50 + 1;
			el.proc = 50;
		}
		if ( el.cnt < parentCnt/4 ) {
			info.proc25 = info.proc25 + 1;
			el.proc = 25;
		}
		if ( el.cnt < parentCnt/10 ) {
			info.proc10 = info.proc10 + 1;
			el.proc = 10;
		}
	}

	console.log(info)
	if ( list.length - info.proc50 >= value )
		rezValue = list.length - info.proc50;
	else if ( list.length - info.proc25 >= value )
		rezValue = list.length - info.proc25;
	else
		rezValue = list.length - info.proc10;

	if ( list.length - rezValue == 1 )
		rezValue = 	list.length;

	return rezValue;
} */

Template.VQ_DSS_schema.events({
	'click #calck': async function() {
    const startTime = Date.now();
		const classesAndProperties = await getClassesAndProperties();
    console.log(classesAndProperties)
    console.log('.....Test.....', Date.now() - startTime)
    return
		let classList = classesAndProperties[0];
		let propList = classesAndProperties[1];
		//console.log(propList)
		propList = propList.map(v => v.id);
		let allParams = {main: { c_list: classList, p_list:propList}};
		//console.log(allParams, classList, propList )

		const rr1 = await dataShapes.callServerFunction("xx_getCPCInfo", allParams);
		const rr2 = await dataShapes.callServerFunction("xx_getCPCInfoNew", allParams);
		console.log(rr1,rr2)
		const rr1Ids = rr1.data.map(v => v.id);
		const rr2Ids = rr2.data.map(v => v.id);
		for (const c of rr2Ids) {
			if (!rr1Ids.includes(c))
				console.log(rr2.data.filter(function(i){ return i.id == c}));
		}

		//let cl;
		//cl = await dataShapes.getClasses();
		//console.log('getClasses', cl.data);
		//cl = await dataShapes.getClasses({schema:'europeana'});
		//console.log('getClasses-europeana', cl.data);
		//cl = await dataShapes.getClasses({schema:'mini_hospital'});
		//console.log('getClasses-mini_hospital', cl.data);
		//cl = await dataShapes.getClassesFull({main:{}, element: {uriIndividual: 'https://swapi.co/resource/film/1'}})
		//console.log('getClassesFull',cl.data)
		//cl = await dataShapes.getClassesFull({main:{schema:'europeana'}, element: {uriIndividual: 'http://www.bildindex.de/bilder/m/fm239485'}})
		//console.log('getClassesFull-europeana',cl.data)
		//cl = await dataShapes.resolveIndividualByName({ name: 'https://swapi.co/resource/film/1'})
		//console.log('resolveIndividualByName',cl.data)
		//cl = await dataShapes.resolveIndividualByName({schema:'europeana', name:'http://www.bildindex.de/bilder/m/fm239485'})
		//console.log('resolveIndividualByName-europeana',cl.data)
		//cl = await dataShapes.resolveClassByName({name: ':Film'})
		//console.log('resolveClassByName',cl.data)
		//cl = await dataShapes.resolveClassByName({schema:'europeana', name: ':WebResource'})
		//console.log('resolveClassByName-europeana',cl.data)
		//cl = await dataShapes.resolveClassByName({schema:'wikidata', name: 'wd:[star (Q523)]'})
		//console.log('resolveClassByName-wikidata',cl.data)
		//cl = await dataShapes.resolvePropertyByName({name: ':character'})
		//console.log('resolvePropertyByName',cl.data)
		//cl = await dataShapes.resolvePropertyByName({schema:'europeana', name: ':componentColor'})
		//console.log('resolvePropertyByName-europeana',cl.data)
		//cl = await dataShapes.getClassifiers();
		//console.log('getClassifiers', cl);
		//cl = await dataShapes.getClassifiers({schema:'nobel_prizes_x'});
		//console.log('getClassifiers-nobel_prizes_x', cl);
		//cl = await dataShapes.getProperties({schema:'europeana', propertyKind:'Data'});
		//console.log('getProperties-europeana', cl.data);
		//cl = await dataShapes.getProperties({schema:'mini_hospital',propertyKind:'Data'});
		//console.log('getProperties-mini_hospital', cl.data);
		//cl = await dataShapes.getPropertiesFull({main:{schema:'europeana', propertyKind:'Data'}});
		//console.log('getPropertiesFull-europeana', cl.data);
		//cl = await dataShapes.getPropertiesFull({main:{schema:'mini_hospital',propertyKind:'Data'}});
		//console.log('getPropertiesFull-mini_hospital', cl.data);
		//cl = await dataShapes.getClassIndividuals({limit:10}, 'UnitJoining');
		//console.log('getClassIndividuals', cl);
		//cl = await dataShapes.getClassIndividuals({limit:10, schema:'europeana'}, ':WebResource');
		//console.log('getClassIndividuals-europeana', cl);
		//console.log(dataShapes.getOntologiesSync())
		//cl = await dataShapes.checkProperty({name:'UnitJoining', propertyName: 'crm:P144_joined_with'});
		//console.log('checkProperty', cl.data);
		//cl = await dataShapes.checkProperty({schema:'europeana', name:':WebResource', propertyName: ':componentColor'});
		//console.log('checkProperty-europeana', cl.data);

		//cl = await dataShapes.resolveClassByName({name: 'w:Photograph'})
		//console.log(cl)

	},
	'click #showClasses': async function() {
		await getBasicClasses();
		calculateAllDifs();
		console.log(rezFull)
		showClasses(true);
	},
	'click #showGroups': async function() {
		// if ( state == 0 )
    const startTime = Date.now();
		await getBasicClasses(); // TODO varētu šīs jau būt izrēķinātas
    console.log('################### pēc getBasicClasses',Date.now() - startTime)
    let time2 = Date.now();
		await calculateGroups();
    console.log('################### pēc calculateGroups',Date.now() - time2)
    time2 = Date.now();
		makeSuperClasses();
    console.log('################### pēc makeSuperClasses',Date.now() - time2)
    time2 = Date.now();
		makeAssociations();
    console.log('################### pēc makeAssociations',Date.now() - time2)
    time2 = Date.now();
		showClasses();
    console.log('################### pēc showClasses',Date.now() - time2)
		Template.VQ_DSS_schema.LinesCount.set(countAssociations());
		rezFull.lines = {};
		console.log('rezFull', rezFull);
	},
	'click #makeDiagr': async function() {
		await getBasicClasses(); // TODO varētu šīs jau būt izrēķinātas
		await calculateGroups();
    console.log('Pēc calculateGroups')
		makeSuperClasses();
		makeAssociations();
		makeDiagramData();
		rezFull.info = getInfo().join('\n');
		rezFull.namespaces = rezFull.namespaces.map(a => a.name).join('\n');
		rezFull.lines = {};
		console.log('rezFull', rezFull);

		let link = document.createElement("a");
		link.setAttribute("download", "diagr_data.json");
		link.href = URL.createObjectURL(new Blob([JSON.stringify(rezFull, 0, 4)], {type: "application/json;charset=utf-8;"}));
		document.body.appendChild(link);
		link.click();
	},
  'click #makeDiagrAJOOFragment': async function() {
    const classesF = Template.VQ_DSS_schema.ClassesFS.get();
    const classNamesList = classesF.filter(function(c){ return c.seed }).map(a => a.name).join(', ');
    const SeedIdList = classesF.filter(function(c){ return c.seed }).map(a => a.id);
    if ( classesF.length == 0 )
      return;
    let classIds = classesF.map(a => a.id);
    let namespaces = {};
    let namespacesL = [];
    const addSupClasses = $("#addSupF").is(":checked") ? true : false;
    const connectAll = $("#connectAll").is(":checked") ? true : false;

    let params = {main: { ids:classIds}};
		let rr = await dataShapes.callServerFunction("xx_getClassListFullfromIds", params);
    let classList = rr.data;

    if (addSupClasses) {
      let all_s = [];
      _.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });

      params.main.ids = [];
      for (const c of all_s) {
        params.main.ids.push(c);
      }
      rr = await dataShapes.callServerFunction("xx_getClassListFullfromIds", params);
      classList = rr.data;
    }
    console.log('Kādas ir klases sākuma/kopējās', classesF, classList);


    const table_representation = {
			Schema:dataShapes.schema.schemaName,
			ClassCount:10,
			CompactClassView:true,
			NodesCount:10,
			LinesCount:0,
			Namespaces:{n_0:{compartments:{ List:[]}}},
			Class:{},
			ObjectProperty:{},
			Generalization:{},
			Intersect:{},
			uStrings:{u_in_prop:u_in_prop,u_c_prop:u_c_prop},
      diagram_description:`Fragment for ${classNamesList}, fragment size ${classList.length}`
		};

    function addNS(elList) {
      for (const el of elList) {
        if ( namespaces[el.prefix] == undefined )
          namespaces[el.prefix] = 1;
        else
          namespaces[el.prefix] = namespaces[el.prefix] + 1;
        }
    }

    addNS(classList);

    const limit = 30; // Te jādomā, ko ar to limitu darīt
    for (const el of classList) {
      const propOut = await dataShapes.callServerFunction("xx_getClassOutProperties", {main: { c_id: el.id, limit:limit} });
      addNS( propOut.data);
      for (const p of propOut.data) {
        if ( p.object_cnt > 0 )
          p.name = `${p.name} ${u_to_type} IRI`;
      }

      const propIn = await dataShapes.callServerFunction("xx_getClassInProperties", {main: { c_id: el.id, limit:limit} });
      addNS( propIn.data);
      //console.log(propIn)
      for (const p of propIn.data) {
        p.name = `${p.name} ${u_from_type} IRI`;
      }

      table_representation.Class[el.id] = { compartments:{
        Name:el.display_name,
        AttributesT:{out:propOut.data, in:propIn.data, c:[]},
        ClassList:[{cnt:el.cnt, shortName:el.name, name:el.display_name}]},
        TypeOld:'Class',
        TypeNew:'Class',
        Cnt:el.cnt};

        for (const el2 of classList) {
          if (el.id != el2.id && ( connectAll || SeedIdList.includes(el.id) || SeedIdList.includes(el2.id))) {
            const propA = await dataShapes.callServerFunction("xx_getClasstoClassProperties", {main: { c_1_id: el.id, c_2_id:el2.id, limit:limit} });
            addNS( propA.data);
            //console.log("Savienojums", el,el2, propA)
            if (propA.data.length > 0)
              table_representation.ObjectProperty[`${el.id }_${el2.id}`] = { source: el.id, target: el2.id, compartments:{ Name: propA.data}};
          }
        }
    }

    const nsLoc = dataShapes.schema.namespaces.find(function(n){ return n.name == dataShapes.schema.local_ns });

    for (const ns of Object.keys(namespaces)) {
      const fullNs = dataShapes.schema.namespaces.find(function(n){ return n.name == ns });
      if ( fullNs != undefined && ns != 'null' && ns != dataShapes.schema.local_ns ) {
        namespacesL.push({name:`PREFIX ${ns}: <${fullNs.value}>`,cnt:namespaces[ns]});
      }
    }
    namespacesL = namespacesL.sort((a, b) => { return a.name.localeCompare(b.name); });
    namespacesL.unshift({name:`PREFIX ${dataShapes.schema.local_ns}: <${nsLoc.value}>`,cnt:namespaces[dataShapes.schema.local_ns]});
    table_representation.Namespaces.n_0.compartments.List = namespacesL;
    console.log(table_representation)
    //table_representation.params = getParams();  /// ?????

		await Meteor.callAsync("importOntologyNew", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")}, table_representation);

  },
	'click #makeDiagrAJOO2': async function() {
		//if ( state == 0 )
    const startTime = Date.now();
		await getBasicClasses();
    console.log('################### pēc getBasicClasses',Date.now() - startTime);
    let time2 = Date.now();
  	await calculateGroups();
    console.log('################### pēc calculateGroups',Date.now() - time2)
    time2 = Date.now();
		makeSuperClasses();
    console.log('################### pēc makeSuperClasses',Date.now() - time2)
    time2 = Date.now();
		makeAssociations();
    console.log('################### pēc makeAssociations',Date.now() - time2)
    time2 = Date.now();
		showClasses(); // TODO Šeit būtu tikai jāsaskaita, kas būs diagrammā
    console.log('################### pēc showClasses',Date.now() - time2)
    time2 = Date.now();
		makeDiagramData();
    console.log('################### pēc makeDiagramData',Date.now() - time2)
    time2 = Date.now();
		console.log('rezFull', rezFull);

		const table_representation = {
			Schema:dataShapes.schema.schemaName,
			ClassCount:Template.VQ_DSS_schema.ClassCountSelected.get(),
			CompactClassView:$("#compClassView").is(":checked"),
			NodesCount:Template.VQ_DSS_schema.ClassCountUsed.get(),
			LinesCount:countAssociations(),
			Namespaces:{n_0:{compartments:{ List:rezFull.namespaces}}},
			Class:{},
			ObjectProperty:{},
			Generalization:{},
			Intersect:{},
			uStrings:{u_in_prop:u_in_prop,u_c_prop:u_c_prop}
		};

		let hasGeneralization = false;
		let generalizationCount = 0;

		for (const k of Object.keys(rezFull.classes)) {
			const el = rezFull.classes[k];
			if ( el.used ) {
				let type = el.type;
				let typeNew = el.type;
        let isGroup = false;
				if ( type == 'Classif') {
					if ( el.sub_classes_group_string != undefined ) {
						type = 'ClassifierGroup'
						typeNew = 'ClassifierGroup'
            isGroup = true;
					}
					else {
						type = 'Classifier';
						typeNew = 'Classifier';
					}
				}
				if ( type == 'Class' && el.sub_classes_group_string != undefined ) {
					type = 'ClassGroup';
					typeNew = `ClassGroup${el.size}`;
          isGroup = true;
				}
				if ( type == 'Class' && el.sub_classes_group_string == undefined ) {
					type = 'Class';
					typeNew = `Class${el.size}`;
				}
				if ( type == 'Abstract') {
					type = 'AbstractClass';
					typeNew = `AbstractClass${el.size}`;
				}
        if ( type == 'PropertyTarget' || type == 'PropertySource') {
          type = 'Class';
					typeNew = 'PropertyEnd';
          if ( el.sub_classes_group_string != undefined ) {
            isGroup = true;
            typeNew = 'PropertyEnds';
          }
        }

				//const atrCnt = calculateCount(7, el.attributesT.out, el.cnt);  // Pagaidām neizmantosim
				//console.log(atrCnt);							atrCnt: atrCnt,

				table_representation.Class[k] = { compartments:{
						Name:el.fullNameD,
						AttributesT:el.attributesT,
						ClassList:[]},
            TypeOld:type,
						TypeNew:typeNew,
            IsGroup:isGroup,
					  Cnt:el.cnt};
				if ( el.sub_classes_list != undefined && el.sub_classes_list.length > 0 )
					table_representation.Class[k].compartments.ClassList = el.sub_classes_list;
        else
          table_representation.Class[k].compartments.ClassList = [{cnt:el.cnt, name:el.fullNameD, shortName:el.displayName }];

				for (const s of el.super_classes) {
					if ( rezFull.classes[s].used ) {
						hasGeneralization = true;
						generalizationCount = generalizationCount + 1;
						table_representation.Generalization[`${k}_${s}`] = { source:s, target:k, compartments:{}};
					}
				}
			}
		}

		for (const k of Object.keys(rezFull.assoc)) {
			const el = rezFull.assoc[k];
			if ( el.removed == false )
				table_representation.ObjectProperty[k] = { source: el.from, target: el.to, compartments:{ Name: el.names}};
		}
		for (const l of Object.keys(rezFull.lines)) {
			const el = rezFull.lines[l];
			table_representation.Intersect[l] = { source: el.from, target: el.to, compartments:{ Information: 'Class instances intersect'}};
		}
		table_representation.hasGeneralization = hasGeneralization;
		table_representation.generalizationCount = generalizationCount;
		table_representation.params = getParams();
		table_representation.diagram_description =`${table_representation.ClassCount} classes, ${table_representation.NodesCount} nodes, ${table_representation.LinesCount +
    table_representation.generalizationCount} (${table_representation.LinesCount}a + ${table_representation.generalizationCount}g) lines, Merging level - ${table_representation.params.diffG}`

    console.log('################### pēc table_representation',Date.now() - time2)
    time2 = Date.now();
    console.log(table_representation)

		//await Utilities.callMeteorMethodAsync("importOntologyNew", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")}, table_representation);
		await Meteor.callAsync("importOntologyNew", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")}, table_representation);
		//Meteor.call("importOntologyNew", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")}, table_representation);
    console.log('################### pēc importOntologyNew',Date.now() - time2)
	},
	'click #getProperties': async function() {
		let classList = Template.VQ_DSS_schema.Classes.get();
		classList = classList.map(v => v.id);
		const rr = await dataShapes.callServerFunction("xx_getPropList2", {main: { c_list: `${classList}`}});
		Template.VQ_DSS_schema.Properties.set(rr.data);
		Template.VQ_DSS_schema.PropCount.set(rr.data.length);
	},
	'change #classCount': function() {
		const classCount = $("#classCount").val();
		document.getElementById("classCount-slider-span2").innerHTML = classCount;
		Template.VQ_DSS_schema.ClassCountFromSlider.set(classCount);
		setClassList(true);
		clearData();
	},
	'change #classCount2': function() {
		const classCount = $("#classCount2").val();
		document.getElementById("classCount-slider-span").innerHTML = classCount;
		Template.VQ_DSS_schema.ClassCountFromSlider.set(classCount);
		setClassList(true);
		clearData();
	},
	'change #propSlider': function() {
		const propSlider = $("#propSlider").val();
		const textValue = propSliderTextValues[propSlider];
		document.getElementById("propCount-slider-span2").innerHTML = `Property triples >${textValue}`;
		setPropList(propSlider);
		clearData();
	},
	'change #propSlider2': function() {
		const propSlider = $("#propSlider2").val();
		const textValue = propSliderTextValues[propSlider];
		document.getElementById("propCount-slider-span").innerHTML = `Property triples >${textValue}`;
		setPropList(propSlider);
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
	'change #diffG': function() {
		clearData();
	},
	'click #abstr' : function() {
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
	'click #getFragment': async function() {
		// Get parameters
    isFragment = true; // TODO šis nav līdz galam uztaisīts
		const mainClasses = Template.VQ_DSS_schema.Classes.get().map(c => c.id);		// Classes around which the fragment should be created
		const fragSize = parseInt(document.getElementById("fragment-size").value);
		const fragAlgorithm = document.getElementById("fragment-algorithm").value;
		const fragEdgeWeightContext = document.getElementById("fragment-edge-weight-context").value;

		// Uncomment to console log fragment similarity comparison for different algorithms
		// compareFragmentAlgorithmsIntersection();
		// compareFragmentAlgorithmsSizeIncrease();
		// compareFragmentAlgorithmsRank();

		// Calculate fragment
		const [fragmentClasses, rank] = await runFragmentAlgorithm(fragAlgorithm, fragEdgeWeightContext, mainClasses, fragSize);

		// Update list of chosen classes
    _.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( fragmentClasses.includes(cl.id)) cl.sel = 1;
			else cl.sel = 0;
		});
    makeClassLists();
		//const classes = dataShapes.schema.diagram.filteredClassList.filter(function(c){return fragmentClasses.includes(c.id)});
		//const restClasses = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return !fragmentClasses.includes(c.id)});
		//setClassListInfo(classes, restClasses);
		//clearData();
	},
  'click #getFragment2': async function() {
		// Get parameters
		const mainClasses = Template.VQ_DSS_schema.ClassesFS.get().map(c => c.id);		// Classes around which the fragment should be created
		const fragSize = parseInt(document.getElementById("fragment-size2").value);
		const fragAlgorithm = document.getElementById("fragment-algorithm2").value;
		const fragEdgeWeightContext = document.getElementById("fragment-edge-weight-context2").value;

		// Uncomment to console log fragment similarity comparison for different algorithms
		// compareFragmentAlgorithmsIntersection();
		// compareFragmentAlgorithmsSizeIncrease();
		// compareFragmentAlgorithmsRank();

		// Calculate fragment
		const [fragmentClasses, rank] = await runFragmentAlgorithm(fragAlgorithm, fragEdgeWeightContext, mainClasses, fragSize);

		// Update list of chosen classes
    console.log(fragmentClasses)
    let allParams = {main: { ids:fragmentClasses}}; //{main: { limit: fragSize, ids:fragmentClasses}};
		rr = await dataShapes.callServerFunction("xx_getClassListfromIds", allParams);
    _.each(rr.data, function(cl) {
			if ( mainClasses.includes(cl.id))
        cl.seed = true;
		});
    Template.VQ_DSS_schema.ClassesFS.set(rr.data);
    console.log('Kas mums sanāca',Template.VQ_DSS_schema.ClassesFS.get())

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
  'click #moveR': function() {
		if ($("#classesF").val() != undefined) {
			const selected = $("#classesF").val().map(v => Number(v));
      let classesF = [];
      let classesFS = Template.VQ_DSS_schema.ClassesFS.get();
      for (const cl of Template.VQ_DSS_schema.ClassesF.get()) {
        if ( selected.includes(cl.id) ) {
          classesFS.push(cl);
        }
        else {
          classesF.push(cl);
        }
      }
      classesF = classesF.sort(function(a,b){ return b.cnt-a.cnt;});
      classesFS = classesFS.sort(function(a,b){ return b.cnt-a.cnt;});
      Template.VQ_DSS_schema.ClassesF.set(classesF);
      Template.VQ_DSS_schema.ClassesFS.set(classesFS);
		}
	},
  'click #moveL': function() {
		if ($("#classesFS").val() != undefined) {
			const selected = $("#classesFS").val().map(v => Number(v));
      let classesFS = [];
      let classesF = Template.VQ_DSS_schema.ClassesF.get();
      for (const cl of Template.VQ_DSS_schema.ClassesFS.get()) {
        if ( selected.includes(cl.id) ) {
          classesF.push(cl);
        }
        else {
          classesFS.push(cl);
        }
      }
      classesF = classesF.sort(function(a,b){ return b.cnt-a.cnt;});
      classesFS = classesFS.sort(function(a,b){ return b.cnt-a.cnt;});
      Template.VQ_DSS_schema.ClassesF.set(classesF);
      Template.VQ_DSS_schema.ClassesFS.set(classesFS);
		}
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
	'input #classCount': function() {
		let slider = document.getElementById("classCount");
		let output = document.getElementById("classCount-slider-span");
		output.innerHTML = slider.value;
		clearData();
	},
	'input #classCount2': function() {
		let slider = document.getElementById("classCount2");
		let output = document.getElementById("classCount-slider-span2");
		output.innerHTML = slider.value;
		clearData();
	},
	'input #propSlider': function() {
		let propSlider = document.getElementById("propSlider").value;
		const textValue = propSliderTextValues[propSlider];
		let output = document.getElementById("propCount-slider-span");
		output.innerHTML = `Property triples >${textValue}`;
		clearData();
	},
	'input #propSlider2': function() {
		let propSlider = document.getElementById("propSlider2").value;
		const textValue = propSliderTextValues[propSlider];
		let output = document.getElementById("propCount-slider-span2");
		output.innerHTML = `Property triples >${textValue}`;
		clearData();
	},
  'click #diffG': function() {
    isFragment = false;
  },
  'keyup #filter' : async function(){
    var filter = $("#filter").val().toLowerCase();
    let allParams = {main: { limit: 100, filter: filter }};
		rr = await dataShapes.callServerFunction("xx_getClassList", allParams);
    Template.VQ_DSS_schema.ClassesF.set(rr.data);
  },
  'click #hideFragment': function() {
    if (Template.VQ_DSS_schema.ShowFragmentBlock.get() ) {
      Template.VQ_DSS_schema.ShowFragmentBlock.set(false);
    }
    else {
      Template.VQ_DSS_schema.ShowFragmentBlock.set(true);
    }
  },
  'click #freeProp': function() {
    let freeProp = false;
	if ( $("#freeProp").is(":checked") ) {
    	freeProp = true;
	}
	const properties = dataShapes.schema.diagram.properties;
    let propF = [];
    for (const p of properties) {
      if ( !unused_orphan_props.includes(p.full_name)) {
        if ( freeProp) {
          if ( p.object_cnt !== 0 && ( p.type_1 === '0' || p.type_2 === '0')) {
            propF.push(p);
          }
        }
        else {
          if ( p.object_cnt !== 0 && ( p.source_cover_complete === false || p.target_cover_complete === false ) ) {
            propF.push(p);
          }
        }
      }
    }
    Template.VQ_DSS_schema.PropertiesF.set(propF);
	},
  'click #propMoveR': function() {
		if ($("#propertiesF").val() != undefined) {
			const selected = $("#propertiesF").val().map(v => Number(v));
      let propF = [];
      let propFS = Template.VQ_DSS_schema.PropertiesFS.get();
      for (const p of Template.VQ_DSS_schema.PropertiesF.get() ) {
        if ( selected.includes(p.id) ) {
          propFS.push(p);
        }
        else {
          propF.push(p);
        }
      }
      propF = propF.sort(function(a,b){ return b.cnt-a.cnt;});
      propFS = propFS.sort(function(a,b){ return b.cnt-a.cnt;});
      Template.VQ_DSS_schema.PropertiesF.set(propF);
      Template.VQ_DSS_schema.PropertiesFS.set(propFS);
		}
	},
  'click #propMoveL': function() {
	if ($("#propertiesFS").val() != undefined) {
	  const selected = $("#propertiesFS").val().map(v => Number(v));
      let propFS = [];
      let propF = Template.VQ_DSS_schema.PropertiesF.get();
      for (const cl of Template.VQ_DSS_schema.PropertiesFS.get()) {
        if ( selected.includes(cl.id) ) {
          propF.push(cl);
        }
        else {
          propFS.push(cl);
        }
      }
      propF = propF.sort(function(a,b){ return b.cnt-a.cnt;});
      propFS = propFS.sort(function(a,b){ return b.cnt-a.cnt;});
      Template.VQ_DSS_schema.PropertiesF.set(propF);
      Template.VQ_DSS_schema.PropertiesFS.set(propFS);
	}
  },
  'click #makeDiagrAJOOProperties': async function() {
    const propSelected = Template.VQ_DSS_schema.PropertiesFS.get();
    let freeProp = false;
		if ( $("#freeProp").is(":checked") ) {
      freeProp = true;
		}
    if ( propSelected.length === 0 ) {
      return;
    }
    const propSelectedIds = propSelected.map(v => v.id);
    console.log('Kādas propertijas ir atlasītas', propSelected)
    console.log('Kādas propertijas ir atlasītas', propSelectedIds)

    let allParams = {main: {p_list: propSelectedIds, props:true}};
    let rr = await dataShapes.callServerFunction("xx_getCPInfo", allParams);
    const cp_info = rr.data;
    console.log(cp_info)
    for (const cp of cp_info) {
      if ( cp.type_id == 2 )
        cp.name = `NO ${cp.prefix}:${cp.display_name} (${cp.cnt})`;
      else if ( cp.type_id == 1 )
        cp.name = `UZ ${cp.prefix}:${cp.display_name} (${cp.cnt})`;
    }
    console.log('CP_rels_info', rr.data)
    rr = await dataShapes.callServerFunction("xx_getPPInfo", allParams);
    const pp_info = rr.data;
    console.log('PP_rels_info', rr.data.length)

    let prop_tree = {};
    let namespaces = {};
    for (const p of propSelected) {
      const cp_info_p = cp_info.filter(function(cp){ return cp.property_id === p.id; });
      const c_from = cp_info_p.filter(function(cp){ return cp.type_id === 2});
      const c_to = cp_info_p.filter(function(cp){ return cp.type_id === 1});
      const pp_info_type_1a = pp_info.filter(function(pp){ return pp.type_id === 1 && pp.property_1_id === p.id;});
      const pp_info_type_1b = pp_info.filter(function(pp){ return pp.type_id === 1 && pp.property_2_id === p.id;});
      const pp_info_type_2 = pp_info.filter(function(pp){ return pp.type_id === 2 && pp.property_1_id == p.id && propSelectedIds.includes(pp.property_2_id);});
      const pp_info_type_3 = pp_info.filter(function(pp){ return pp.type_id === 3 && pp.property_1_id == p.id && propSelectedIds.includes(pp.property_2_id);});

      prop_tree[p.id] = {id:p.id, p_name:p.p_name, full_name:p.full_name, prefix:p.prefix, c_from:c_from, c_to:c_to, cnt:Number(p.cnt), type_1:p.type_1, type_2: p.type_2,
        pp_type_1a: pp_info_type_1a, pp_type_1b: pp_info_type_1b, pp_type_2: pp_info_type_2, pp_type_3: pp_info_type_3 };

      if ( freeProp ) {
        if ( p.type_2 === '0' ) {
          prop_tree[p.id].putSource = true;
        }
        if ( p.type_1 === '0' ) {
          prop_tree[p.id].putTarget = true;
        }
      }
      else {
        if ( !p.source_cover_complete ) {
          prop_tree[p.id].putSource = true;
        }
        if ( !p.target_cover_complete ) {
          prop_tree[p.id].putTarget = true;
        }
      }

      if ( namespaces[p.prefix] == undefined )
        namespaces[p.prefix] = 1;
      else
        namespaces[p.prefix] = namespaces[p.prefix] + 1;
    }

    let prop_full_names = {};
    for (const p of dataShapes.schema.diagram.properties) {
      prop_full_names[p.id] = p.p_name;
    }

    console.log('Savācāmmmmmm', prop_tree, namespaces)

    const table_representation = {
      Schema:dataShapes.schema.schemaName,
      ClassCount:10,
      CompactClassView:true,
      NodesCount:10,
      LinesCount:0,
      Namespaces:{n_0:{compartments:{ List:[]}}},
      Class:{},
      ObjectProperty:{},
      Generalization:{},
      Intersect:{},
      uStrings:{u_in_prop:'', u_c_prop:''},
      diagram_description:`Propertiju diagramma`
    };

    let connected = {};
    function put_line(line_type, source, target, compartments) {
      table_representation[line_type][`${source}_${target}`] = { source: source, target: target, compartments: compartments};
      connected[source] = true;
      connected[target] = true;

    }
    for (const k of Object.keys(prop_tree)) {
			const el = prop_tree[k];

      if ( el.putSource) {
        let p_in = [];
        for (const pp of el.pp_type_1b) {
          p_in.push({name: `Ienāk ${prop_full_names[pp.property_1_id]} cnt-${pp.cnt}`, cnt:pp.cnt});
          connected[`T2_${el.id}`] = true;
          if ( prop_tree[pp.property_1_id] !== undefined && prop_tree[pp.property_1_id].putTarget) {
            put_line('Intersect', `T2_${el.id}`, `T1_${pp.property_1_id}`, { Information: `Savienojas - ${pp.cnt}`});
            //table_representation.Intersect[`S${el.id}_T${pp.property_1_id}`] = { source: `T2_${el.id}`, target: `T1_${pp.property_1_id}`, compartments:{ Information: `Savienojas - ${pp.cnt}`}};
            //connected[`T2_${el.id}`] = true;
            //connected[`T1_${pp.property_1_id}`] = true;
          }
        }
        // for (const pp of el.pp_type_1a) {
        //  p_in.push({name:` Ienāk 21 ${prop_tree[pp.property_2_id].full_name} (${pp.cnt})`, cnt:pp.cnt});
        //}
        //if ( el.type_1 === '0' || p_in.length > 0 && el.c_to.length > 0 ) {
          table_representation.Class[`T2_${el.id}`] = { compartments:{
            Name:`Source for ${el.p_name} ID-${el.id}`,
            AttributesT:{out:p_in, in:el.c_to, c:[]},
            ClassList:[{cnt:el.cnt, shortName:el.full_name, name:`Source for ${el.p_name}`}]},
            TypeOld:'Class',
            TypeNew:'Classifier',
            Cnt:el.cnt
          };
        //}
        //const el_atrs = table_representation.Class[`T2_${el.id}`].compartments.AttributesT;
        //if ( el_atrs.out.length === 0 || el_atrs.in.length === 0 )
        //  table_representation.Class[`T2_${el.id}`].TypeNew = 'Class0';
      }

      if ( el.putTarget ) {
        let p_out = [];
        for (const pp of el.pp_type_1a) {
          p_out.push({name:`Iziet ${prop_full_names[pp.property_2_id]} cnt-${pp.cnt}`, cnt:pp.cnt});
          connected[`T1_${el.id}`] = true;
          if ( prop_tree[pp.property_2_id] !== undefined &&  prop_tree[pp.property_2_id].putSource) {
            put_line('Intersect', `T1_${el.id}`, `T2_${pp.property_2_id}`, { Information: `Savienojas - ${pp.cnt}`});
            //table_representation.Intersect[`T${el.id}_S${pp.property_2_id}`] = { source: `T1_${el.id}`, target: `T2_${pp.property_2_id}`, compartments:{ Information: `Savienojas - ${pp.cnt}`}};
          }
        }
        //for (const pp of el.pp_type_1b) {
        //  p_out.push({name: `Iziet 21 ${prop_tree[pp.property_1_id].full_name} (${pp.cnt})`, cnt:pp.cnt});
        //}
        //if ( el.type_2 === '0' || p_out.length > 0 && el.c_from.length > 0 ) {
          table_representation.Class[`T1_${el.id}`] = { compartments:{
            Name:`Target for ${el.p_name} ID-${el.id}`,
            AttributesT:{out:el.c_from, in:p_out, c:[]},
            ClassList:[{cnt:el.cnt, shortName:el.full_name, name:`Target for ${el.p_name}`}]},
            TypeOld:'Class',
            TypeNew:'Class',
            Cnt:el.cnt
          };
        //}
        //const el_atrs = table_representation.Class[`T1_${el.id}`].compartments.AttributesT;
        //if ( el_atrs.out.length === 0 || el_atrs.in.length === 0 )
        //  table_representation.Class[`T1_${el.id}`].TypeNew = 'Class0';
      }

    }

    for (const k of Object.keys(prop_tree)) {
			const el = prop_tree[k];
      if ( el.putSource && table_representation.Class[`T2_${el.id}`] !== undefined ) {
        if (el.pp_type_2.length > 0 ) {
          for (const el2 of el.pp_type_2) {
            if (table_representation.Class[`T2_${el2.property_2_id}`] !== undefined) {
              if ( el.id !==  el2.property_2_id) {
                put_line('ObjectProperty', `T2_${el.id}`, `T2_${el2.property_2_id}`, { Name: [{name: el2.cnt, shortName: el2.cnt, cnt: el2.cnt}]});
                //table_representation.ObjectProperty[`T2_${el.id }_T2_${el2.property_2_id}`] = { source: `T2_${el.id}`, target: `T2_${el2.property_2_id}`, compartments:{ Name: [{name: el2.cnt, shortName: el2.cnt, cnt: el2.cnt}]}};
              }
            }
          }
        }
      }
      if ( el.putTarget && table_representation.Class[`T1_${el.id}`] !== undefined ) {
        if (el.pp_type_3.length > 0 ) {
          for (const el2 of el.pp_type_3) {
            if (table_representation.Class[`T1_${el2.property_2_id}`] !== undefined) {
              if ( el.id !== el2.property_2_id) {
                put_line('ObjectProperty', `T1_${el.id}`, `T1_${el2.property_2_id}`, { Name: [{name: el2.cnt, shortName: el2.cnt, cnt: el2.cnt}]});
                //table_representation.ObjectProperty[`T1_${el.id}_T1_${el2.property_2_id}`] = { source: `T1_${el.id}`, target: `T1_${el2.property_2_id}`, compartments:{ Name: [{name: el2.cnt, shortName: el2.cnt, cnt: el2.cnt}]}};
              }
            }
          }
        }
      }

      // Nez vai šis ir interesanti ?
      //if ( el.type_2 === '0' &&  el.type_1 === '0' ) {
      //  const idFrom = `T1_${el.id}`;
      //  const idTo = `T2_${el.id}`;
      //  table_representation.Intersect[`${idFrom}_${idTo}`] = { source: idFrom, target: idTo, compartments:{ Information: 'Tā pati propertija'}};
      //}
    }

    table_representation.Class['T1_0'] = { compartments:{
      Name:'Targets ... ',
      AttributesT:{out:[], in:[], c:[]},
      ClassList:[]},
      TypeOld:'Class',
      TypeNew:'Class',
      IsGroup: true,
      Cnt:1
    };

    table_representation.Class['T2_0'] = { compartments:{
      Name:'Sources ... ',
      AttributesT:{out:[], in:[], c:[]},
      ClassList:[]},
      TypeOld:'Class',
      TypeNew:'Classifier',
      IsGroup: true,
      Cnt:1
    };

    for (const k of Object.keys(table_representation.Class)) {
      el = table_representation.Class[k];
      if ( k !== 'T1_0' && k !== 'T2_0') {
        if ( connected[k] === undefined ) {
          if ( el.TypeNew === 'Class') {
            table_representation.Class['T1_0'].compartments.ClassList.push(table_representation.Class[k].compartments.ClassList[0]);
          }
          else {
            table_representation.Class['T2_0'].compartments.ClassList.push(table_representation.Class[k].compartments.ClassList[0]);
          }
          delete table_representation.Class[k];
        }
      }
    }

    if ( table_representation.Class['T1_0'].compartments.ClassList.length === 0 )
      delete table_representation.Class['T1_0'];

    if ( table_representation.Class['T2_0'].compartments.ClassList.length === 0 )
      delete table_representation.Class['T2_0'];

    const nsLoc = dataShapes.schema.namespaces.find(function(n){ return n.name == dataShapes.schema.local_ns });
    let namespacesL = [];

    for (const ns of Object.keys(namespaces)) {
      const fullNs = dataShapes.schema.namespaces.find(function(n){ return n.name == ns });
      if ( fullNs != undefined && ns != 'null' && ns != dataShapes.schema.local_ns ) {
        namespacesL.push({name:`PREFIX ${ns}: <${fullNs.value}>`,cnt:namespaces[ns]});
      }
    }
    namespacesL = namespacesL.sort((a, b) => { return a.name.localeCompare(b.name); });
    namespacesL.unshift({name:`PREFIX ${dataShapes.schema.local_ns}: <${nsLoc.value}>`,cnt:namespaces[dataShapes.schema.local_ns]});
    table_representation.Namespaces.n_0.compartments.List = namespacesL;

    console.log(table_representation, connected)

    await Meteor.callAsync("importOntologyNew", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")}, table_representation);

  }
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
	if ( classes.length == 0 ) {
		Template.VQ_DSS_schema.HasClasses.set('disabled');
	}
	else {
		Template.VQ_DSS_schema.HasClasses.set('');
	}
	Template.VQ_DSS_schema.RestClasses.set(restClasses);
	Template.VQ_DSS_schema.ClassCountRest.set(restClasses.length);
	if ( document.getElementById("classCount-slider-span") ) {
		document.getElementById("classCount-slider-span").innerHTML = classes.length;
		document.getElementById("classCount-slider-span2").innerHTML = classes.length;
	}
}

function setClassList0() {
	// Izsauc  -- VQ_DSS_schema.rendered
	Template.VQ_DSS_schema.ManualDisabled.set("disabled");
	Template.VQ_DSS_schema.FilterDisabled.set("");
	Template.VQ_DSS_schema.RestProperties.set([]);
	const nsFilters = [{value:'All' ,name:'Classes in all namespaces'},{value:'Local' ,name:'Only local classes'},{value:'Exclude' ,name:'Exclude owl:, rdf:, rdfs:'}];

	//const schema = dataShapes.schema.schema;
	let nsFiltersSel = 'All';
	let classCountSel = 300;

	let filteredClassList = dataShapes.schema.diagram.classList;

	// TODO  Šis ir manai ērtībai, vai nu jāmet ārā, vai jāliek konfigurācijā
	/*
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
	*/

	// TODO tagad visliem ir All, šis vairs nekad neizpildīsies
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

	if ( dataShapes.schema.diagram.properties != undefined) {
    //console.log('AAAAAAAAAAAAAAA', dataShapes.schema.diagram.properties)
		const properties = dataShapes.schema.diagram.properties;
    let propF = [];
		Template.VQ_DSS_schema.Properties.set(properties);
		Template.VQ_DSS_schema.PropCount.set(properties.length);
    for (const p of properties) {
      if ( !unused_orphan_props.includes(p.full_name )) {
        if ( p.object_cnt !== 0 && ( p.type_1 === '0' || p.type_2 === '0')) {
          propF.push(p);
        }
      }
    }
    Template.VQ_DSS_schema.PropertiesF.set(propF);
	}
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
		let classCount = Template.VQ_DSS_schema.ClassCountFromSlider.get(); //$("#classCount").val();

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

function setPropList(propSlider) {
	Template.VQ_DSS_schema.PropSliderSelected.set(propSlider);
	const properties = dataShapes.schema.diagram.properties.slice(0, propPositions[propSlider]);
	const restProperties = dataShapes.schema.diagram.properties.slice(propPositions[propSlider]);
	Template.VQ_DSS_schema.Properties.set(properties);
	Template.VQ_DSS_schema.PropCount.set(properties.length);
	Template.VQ_DSS_schema.RestProperties.set(restProperties);
	Template.VQ_DSS_schema.PropCountRest.set(restProperties.length);
}
// *********************** Datu glabāšanas vietas *********************************************************
var rezFull = {classes:{}, assoc:{}, lines:{}};
var p_list_full = {};
//var state = 0;  // 0 - tukšs, 1 - pamata klases, 2 - grupas un virsklases (nav īsti realizēts)
var Gnum = 101;
var Snum = 101;
var cpc_info = [];
var cc_info_type3 = [];
var has_cpc = false;
var propSliderIntValues = [];
var propSliderTextValues = [];
var propPositions = [];
var params = {};
var isFragment = false;
const u_to_type =   '\u21D2';
const u_from_type = '\u21D0';
const u_in_prop = '\u21A4'; //'\u21E4'; //'\u2B70';
const u_c_prop = '\u27F2'; //'\u21B6'; Pusloka aplis
const unused_props = [
	'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
	'http://www.w3.org/2004/02/skos/core#prefLabel',
	'http://www.w3.org/2004/02/skos/core#altLabel',
	'http://www.w3.org/2000/01/rdf-schema#label' ];
//const unused_orphan_props = [ 'rdf:type', 'rdf:first', 'rdf:rest', 'rdf:value', 'rdf:_1', 'rdf:_2', 'rdf:_3', 'rdf:_4', 'rdf:_5', 'rdfs:label', 'rdfs:comment', 'owl:sameAs' ];
const unused_orphan_props = []; // TODO šīs būs jaatliek atpakaļ

function setPropSliderInfo() {
	//let propSliderIntValuesTemp = [1,5,10,20,50,100,200,500,1000,2000,5000];  // TODO jāsakrīt ar propSliderIntValues
	propSliderIntValues = [1,5,10,20,50,100,200,500,1000,2000,5000];
	propSliderTextValues = ['1','5','10','20','50','100','200','500','1e3','2e3','5e3'];
	propPositions = [];
	if ( dataShapes.schema.diagram.properties != undefined ) {
		const propPow = Math.round(Math.log10(dataShapes.schema.propMax));
		if ( propPow > 4 ) {
			for (let i = 4; i < propPow; i++) {
				propSliderIntValues.push(Math.pow(10, i));
				//propSliderIntValuesTemp.push(Math.pow(10, i));
				propSliderTextValues.push(`1e${i}`);
			}
		}
		//propSliderIntValuesTemp.push(Math.pow(10, propPow));
		//let pp = propSliderIntValuesTemp.length-1;
		let pp = propSliderIntValues.length-1;
		for (let i = 0; i < dataShapes.schema.diagram.properties.length; i++) {
			const p = dataShapes.schema.diagram.properties[i];
			if (Number(p.cnt) < propSliderIntValues[pp]) {
				propPositions.unshift(i);
				pp = pp - 1;
			}
		}
		propPositions.unshift(dataShapes.schema.diagram.properties.length);
	}

	return 0; // TODO, te varētu būt arī lielāks skaitlis, ja propertiju ir visai daudz
}
function clearData() {
	rezFull = {classes:{}, assoc:{}, lines:{}, schema:dataShapes.schema.schema, diffMax:0};
	p_list_full = {};
	//state = 0;
	Gnum = 101;
	Snum = 101;
	cpc_info = [];
	has_cpc = false;
	Template.VQ_DSS_schema.UsedClasses.set([]);
	Template.VQ_DSS_schema.SubClasses.set([]);
	Template.VQ_DSS_schema.ClassProperties.set([]);
	Template.VQ_DSS_schema.ClassCountUsed.set(0);
	Template.VQ_DSS_schema.ClassCountGroups.set(0);
	Template.VQ_DSS_schema.LinesCount.set(0);
	Template.VQ_DSS_schema.ClassCountAbstr.set(0);
}
// **********************************************************************************************************
// ***************** Vairākkart izmantojamās funkcijas ******************************************************
// **********************************************************************************************************
function getDiffs() {
	let diffS = ( $("#abstr").is(":checked") ) ? 50 : 0;
	if ( diffS > 0 ) {
		if ( rezFull.diffMax < 50 && rezFull.diffMax > 25 )
			diffS = 25;
		else if ( rezFull.diffMax <= 25 && rezFull.diffMax > 5)
			diffS = 5;
		else if ( rezFull.diffMax <= 5 )
			diffS = rezFull.diffMax - 1;
	}
  let diffG = (isFragment) ? 0 : $("#diffG").val();
  return {diffG:diffG, diffS:diffS};
	//return {diffG:$("#diffG").val(), diffS:diffS};
}
// ***************** Konstantes***************************
function checkSimilarity(diff, level) {
	//Ekvivalentās klases (level 0) , līdzīgās klases (level = 1), abstraktajām virsklasēm (level = 2), apaksklašu savilkšana (level = 5 vairs nebūs)
	const diffs = getDiffs();
	let result = false;
	if ( level == 0 ) {
		if ( diff[1] == 0 )
		result = true;
	}
	else if ( level == 1 ) {
		if ( diff[1] == 0 ) {
			result = true;
		}
		else {
			if ( diff[1] < diffs.diffG && params.k * diff[0] > diff[1] )
				result = true;
			//if ( diffs.diffG == 10  ) { // TODO ļoti pagaidu risinājums   55555
			//	if ( diff[1] < 6 && diff[0] > 0 )
			//		result = true;
			//	if ( diff[0] > 25 )
			//		result = true;
			//}
			//else if ( diff[1] < diffs.diffG && diff[0] > diff[1] ) // TODO padomāt, vai prasīt līdzību, vai neprasīt
			//	result = true;
		}
	}
	else if ( level == 2 )  {  // Abstrakto virsklašu taisīšanai
		if ( diff[0] > diffs.diffS )
			result = true;
	}
	else if ( level == 5 )  { // TODO Tas bija tikai vecajam varaintam
		if ( diff[1] < diffs.diffG )
			result = true;
	}
	return result;
}

// Funkcija, kas pārbauda, vai klases (sarakstus) var apvienot
function areSimilar(rezFull, classList1, classList2, level) {
	//Ekvivalentās klases (level 0) , līdzīgās klases (level = 1), abstraktajām virsklasēm (level = 2), apakšklašu savilkšana (level = 5 /vairs nebūs)
	let rezult = true;
	//const diffs = getDiffs();
	if ( level > 1 )
		return rezult;
	//if ( diffs.diffG == 10) //TODO pagaidu risinājums
	//	return rezult;
	for ( const c1 of classList1) {
		for ( const c2 of classList2) {
			const classInfo1 = rezFull.classes[c1];
			const classInfo2 = rezFull.classes[c2];
			const diff = getDifference(classInfo1, classInfo2);
				if ( params.k * diff[0] <= diff[1] && !(diff[0] == 0 && diff[1] == 0 )) // Tukšās vienādās - diff[0] == 0 && diff[1] == 0
					rezult = false;
		}
	}
	return rezult;
}

function calculateAllDifs() {
	for(const cId of Object.keys(rezFull.classes)) {
		rezFull.classes[cId].diffs_plus = {};
		rezFull.classes[cId].diffs_minus = {};
	}

	for(const cId_1 of Object.keys(rezFull.classes)) {
		const classInfo_1 = rezFull.classes[cId_1];
		for(const cId_2 of Object.keys(rezFull.classes)) {
			const classInfo_2 = rezFull.classes[cId_2];
			if ( classInfo_1.id_id < classInfo_2.id_id ) {
				const diff1 = getDifferenceOld(classInfo_1, classInfo_2);
				let diff_all = getDifferenceNew(classInfo_1, classInfo_2);
				diff_all.old_sim = diff1[0];
				diff_all.old_dif = diff1[1];
				if ( diff_all.s1_dal < 1 ) {
					classInfo_1.diffs_plus[`${cId_2}_${classInfo_2.displayName}`] = diff_all;
					classInfo_2.diffs_plus[`${cId_1}_${classInfo_1.displayName}`] = diff_all;
				}
				else {
					classInfo_1.diffs_minus[`${cId_2}_${classInfo_2.displayName}`] = diff_all;
					classInfo_2.diffs_minus[`${cId_1}_${classInfo_1.displayName}`] = diff_all;
				}
			}
		}
	}
}

// Funkcija klašu attāluma izrēķināšanai, ļoti svarīga funkcija ******
function getDifferenceNew(classInfo1, classInfo2) {
	let all_atrs = [];
	//if ( classInfo1.id == classInfo2.id ) {  // Par šo padomāt, kādas vērtības vajag klasei pašai pret sevi
	//	return [0, 0];
	//}
	function getAttrTree(atr_list) {
		let atr_tree = {};
		for (const a of atr_list) {
			const p_id = `${a.p_name}_${a.type}`;
			atr_tree[p_id] = a;
			if ( !all_atrs.includes(p_id) ) {
				all_atrs.push(p_id);
			}
		}
		return atr_tree;
	}
	const atrTree1 = getAttrTree(classInfo1.atr_list_full);
	const atrTree2 = getAttrTree(classInfo2.atr_list_full);

	const pw = 1;
	let s = 0;
	let d = 0;

	for (const aId of all_atrs) {
		if ( atrTree1[aId] != undefined && atrTree2[aId] != undefined) { // Atribūts ir abām klasēm
			s = s + Math.sqrt(Math.min(atrTree1[aId].cnt/classInfo1.cnt,1)*Math.min(atrTree2[aId].cnt/classInfo2.cnt,1))*pw;     //s(A,B) = ∑sqrt(max(pA/cA,1) * max(pB/cB,1)) *pw
			// Bija data - Ad = Ad + Math.sqrt((atrTree1[aId].cnt/classInfo1.cnt)*(atrTree2[aId].cnt/classInfo2.cnt));
			// Bija obj - Ao = Ao + atrTree1[aId].class_list.length*Math.sqrt((atrTree1[aId].cnt/classInfo1.cnt)*(atrTree2[aId].cnt/classInfo2.cnt));
		}
		else if ( atrTree1[aId] != undefined ) { // Atribūts ir tikai pirmajai klasei
			d =d + Math.sqrt(Math.min(Math.pow(atrTree1[aId].cnt/classInfo1.cnt,1),2)*(classInfo1.cnt/(classInfo1.cnt+classInfo2.cnt))); //d(A,B) = ∑sqrt(max(pA/cA,1)^2*(cA/(cA+cB)))
			// Bija data - Bd = Bd + Math.sqrt(atrTree1[aId].cnt/Math.sqrt(classInfo1.cnt*(classInfo1.cnt+classInfo2.cnt)));
			// Bija obj - Bo = Bo + Math.sqrt(atrTree1[aId].cnt/Math.sqrt(classInfo1.cnt*(classInfo1.cnt+classInfo2.cnt)));

		}
		else if ( atrTree2[aId] != undefined ) { // Atribūts ir tikai otrajai klasei
			d =d + Math.sqrt(Math.min(Math.pow(atrTree2[aId].cnt/classInfo2.cnt,1),2)*(classInfo2.cnt/(classInfo1.cnt+classInfo2.cnt)));
			// Bija data - Bd = Bd + Math.sqrt(atrTree2[aId].cnt/Math.sqrt(classInfo2.cnt*(classInfo1.cnt+classInfo2.cnt)));
			// Bija obj - Bo = Bo + Math.sqrt(atrTree2[aId].cnt/Math.sqrt(classInfo2.cnt*(classInfo1.cnt+classInfo2.cnt)));

		}
	}

	let dw = d;
	if ( params.pw > 0 )
		dw = d*Math.pow((Math.log10(classInfo1.cnt)+1)*(Math.log10(classInfo2.cnt)+1),1/params.pw); //dw(A,B) = d(A,B) * sqrt((log(cA)+1)*(log(cB)+1))

	const diff1 =  d/(s+0.1);
	const diff2 =  dw/(s+0.1);
	if ( params.newDifs && classInfo1.id != classInfo2.id )
		rezFull.diffMax = Math.max(rezFull.diffMax , s);

	//return {s1_dal:Math.round(diff1*10)/10, s2_dal:Math.round(diff2*10)/10, s1_s:Math.round(s*10)/10, s1_d:Math.round(d*10)/10, s2_dw:Math.round(dw*10)/10};
	return {s1_dal:Math.round(diff1*10)/10, s2_dal:Math.round(diff2*10)/10, s1_s:s, s1_d:Math.round(d*10)/10, s2_dw:dw};
}

// Funkcija klašu attāluma izrēķināšanai, ļoti svarīga funkcija ******
function getDifferenceOld(classInfo1, classInfo2) {
	//const unused_props = ['skos:altLabel','skos:prefLabel','rdf:type'];

	let all_atrs = [];
	if ( classInfo1.id == classInfo2.id ) {
		return [0, 0];
	}
	function getAttrTree(atr_list) {
		let atr_tree = {};
		for (const a of atr_list) {
			if ( !unused_props.includes(p_list_full[`p_${a.p_id}`].iri) ) { //TODO te būs izslēgšana, ja vispār būs
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
	let diffA = Math.round(Ad + Ao);
	if ( diffA == 0 && Ad + Ao > 0 ) {
		diffA = 0.5;
	}
	let diffB = Math.round(Bd + Bo);
	if ( diffB == 0 && Bd + Bo > 0 ) {
		diffB = 0.5;
	}
	if ( !params.newDifs )
		rezFull.diffMax = Math.max(rezFull.diffMax , diffA);
	return [diffA, diffB]; //[Math.round(Ad + Ao), Math.round(Bd + Bo)];
}

function getDifference(classInfo1, classInfoo2) {
	if ( params.newDifs ) {
		const diffs = getDifferenceNew(classInfo1, classInfoo2);
		return [diffs.s1_s, diffs.s2_dw]; // TODO te būs jāņem s2_dw
	}
	else {
		return getDifferenceOld(classInfo1, classInfoo2);
	}
}
// Funkcija skaita noapaļošanai, izmanto klasēm un propertijām
function roundCount(cnt) {
	if ( cnt == '' ) {
		return '';
	}
	else {
		cnt = Number(cnt);
		const formatter = Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 3 });
		return formatter.format(cnt);
	//if ( cnt < 10000)
	//		return cnt;
	//	else
	//		return cnt.toPrecision(2).replace("+", "");
	}
}

// Līdzīgo klašu atrašana // Ekvivalentās klases (level 0) , līdzīgās klases (level = 1), abstraktajām virsklasēm (level = 2), apaksklašu savilkšana (level = 5 / vecais varaints)
function findSimilarClasses(level, class_list = []) {
	// Klašu saraksts tiek padots tikai mēģinot apvienot apakšklases (level 5)
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
	//let class_list = []; // Klašu saraksts, kurām meklēs savstarpējās līdzības
	let temp2 = {};
	let linesList = [];
	if ( class_list.length == 0 ) {
		for (const clId of Object.keys(rezFull.classes)) {
			let classInfo = rezFull.classes[clId];
			if ( classInfo.atr_list.length > 0 && !classInfo.hasGen && classInfo.used ) {
				class_list.push(classInfo);
			}
		}
	}
	class_list = class_list.sort((a, b) => { return b.cnt - a.cnt; });

	// Savelk līnijas starp klasēm
	for ( const classInfo1 of class_list) {
		for ( const classInfo2 of class_list) {
			const diff = getDifference(classInfo1, classInfo2);
			if ( checkSimilarity(diff, level) && classInfo1.type == classInfo2.type && ( classInfo1.cnt < classInfo2.cnt || ( classInfo1.cnt == classInfo2.cnt && classInfo1.id_id < classInfo2.id_id)) ) {
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
				console.log('Metam klasi ārā', clId, level)
				temp2[gId].splice(temp2[gId].indexOf(clId), 1); // TODO Šis būs jāpārtaisa
				for (const lId of temp[clId].lines) {
					rezFull.lines[lId].red = '5';
				}
			}
		}
		// Savelk trūkstošās līnijas, to vajag tikai grupu zīmēšanai
		for (const cId1 of temp2[gId]) {
			for (const cId2 of temp2[gId]) {
				const classInfo1 = rezFull.classes[cId1];
				const classInfo2 = rezFull.classes[cId2];
				if ( cId1 != cId2 ) {
					const lId1 = `l_${cId1}_${cId2}`;
					const lId2 = `l_${cId2}_${cId1}`;
					if ( rezFull.lines[lId1] == undefined && rezFull.lines[lId2] == undefined) {
						const diff = getDifference(classInfo1, classInfo2);
						if ( params.k * diff[0] > diff[1]) // TODO šet arī kaut kādu līdzību pieprasa, it ka 'else' varētu arī neiestāties
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
function makeAtrTree(cl_list, key) {
	let atrTree = {};
	for (const classInfo of cl_list) {
		for (const atr of classInfo[key] ) {
			let prop = `${atr.p_name}_${atr.type}`;
			if ( atrTree[prop] == undefined) {
				atrTree[prop] = { class_list:atr.class_list, cnt:atr.cnt, cnt2:atr.cnt2,  is_domain:atr.is_domain, range_id:atr.range_id, max_cardinality:atr.max_cardinality,
					object_cnt:atr.object_cnt, p_id:atr.p_id, p_name:atr.p_name, type:atr.type, count:1, cnt_full:atr.cnt_full};
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
				if ( atrTree[prop].range_id != atr.range_id)
					atrTree[prop].range_id = '';
				if ( atr.class_list != undefined ) {
					for (const cl of atr.class_list) {
						if ( !atrTree[prop].class_list.includes(cl))
							atrTree[prop].class_list.push(cl);
					}
				}
			}
		}
	}
	return atrTree;
}

// Funkcija klašu grupas izveidošanai, izmanto dažādās situācijās
function makeClassGroup(list, group_type, sum = true ) { // ekv = false) {
	function addGroupId(cl_id, g_id) {
		let cInfo = rezFull.classes[cl_id];
		if ( cInfo.G_id == undefined )
			cInfo.G_id = [g_id];
		else
			cInfo.G_id.push(g_id);
	}
  if ( group_type == 'Equivalent classes' && list[0].type == 'PropertyTarget')
    sum = false;
	let hasGen = false;
	let g_id = '';
	if ( list.length > 1 ) {
		let atr_list = [];
		let atr_list_full = [];
		const class_type = list[0].type;
		const atrTree = makeAtrTree(list, 'atr_list');
		const atrTreeFull = makeAtrTree(list, 'atr_list_full');
		let c_list_full = [];
		let c_tree = {};
		for (const pId of Object.keys(atrTree)) {
			atr_list.push(atrTree[pId]);
		}
		for (const pId of Object.keys(atrTreeFull)) {
			atr_list_full.push(atrTreeFull[pId]);
		}
		g_id = `g_${Gnum}`;
		let i_cnt = 0;
		let i_in_props = 0;
		for (let classInfo of list ) {
			classInfo.used = false;
			if (classInfo.hasGen)
				hasGen = true;
			i_cnt = i_cnt + classInfo.cnt;
			i_in_props = i_in_props + classInfo.in_props;
			if ( classInfo.isGroup ) {
				for (const cId of classInfo.c_list) {
					let cInfo = rezFull.classes[cId];
					addGroupId(cId, g_id);
					//c_list_full.push(cInfo);
					c_tree[cInfo.id] = cInfo;
				}
				addGroupId(classInfo.id, g_id);
			}
			else {
				addGroupId(classInfo.id, g_id);
				//c_list_full.push(classInfo);
				c_tree[classInfo.id] = classInfo;
			}
		}

		for (const c of Object.keys(c_tree)) {
			c_list_full.push(c_tree[c]);
		}
		c_list_full = c_list_full.sort((a, b) => { return b.cnt_sum - a.cnt_sum; });
		//const cnt = ( sum ) ? i_cnt : list[0].cnt;
		//const cnt_sum = ( sum ) ? getWeight(i_cnt, i_in_props) : getWeight(list[0].cnt, list[0].in_props);
    const cnt = ( sum ) ? i_cnt : c_list_full[0].cnt;
		const cnt_sum = ( sum ) ? getWeight(i_cnt, i_in_props) : getWeight(c_list_full[0].cnt, c_list_full[0].in_props);
		const txt = (c_list_full[0].isGroup) ? '' : ' et al.';
		let fullName = `${c_list_full[0].displayName}${txt} G${Gnum} (weight-${roundCount(cnt_sum)})`;
		let fullNameD = `${c_list_full[0].displayName}${txt} G${Gnum} (${roundCount(cnt)})`;
		let displayName = `${c_list_full[0].displayName}${txt}`;
		// Ieliku visur vienādi, var labot atpakaļ
		//if ( c_list_full.length == 2 ) {
		//	fullName = `${c_list_full[0].displayName} or ${c_list_full[1].displayName} G${Gnum} (weight-${roundCount(cnt_sum)})`;
		//	fullNameD = `${c_list_full[0].displayName} or ${c_list_full[1].displayName} G${Gnum} (${roundCount(cnt)})`;
		//	displayName = `${c_list_full[0].displayName} or ${c_list_full[1].displayName}`;
		//}
		rezFull.classes[g_id] = { id:g_id, super_classes:[], used:true, hasGen:hasGen, type:class_type, group_type:group_type,
			displayName:displayName, fullName:fullName, fullNameD:fullNameD, isGroup:true, c_list:c_list_full.map(c => c.id), c_list_id:c_list_full.map(c => c.id_id),
			sub_classes_group_string:c_list_full.map(c => c.fullNameD).sort().join('\n'),
			sub_classes_list:c_list_full.map(c => c.fullNameD).sort(), sub_classes:[],
			sup:[], sub:[], atr_list:atr_list, atr_list_full:atr_list_full, all_atr:[], cnt:cnt, cnt_sum:cnt_sum, in_props:i_in_props };

		rezFull.classes[g_id].sub_classes_list =  _.map(c_list_full, function(c) {
			return {cnt:c.cnt, name:c.fullNameD, shortName:c.displayName};
			}).sort((a, b) => { return b.cnt - a.cnt; });
		Gnum = Gnum + 1;
	}
	return g_id;
}
function makeClassGroupFromTree(GroupTree, group_type, sup_id = '') {
	for (const Gid of Object.keys(GroupTree)) {
		let c_list_full = [];
		for (const cId of GroupTree[Gid]) {
			c_list_full.push(rezFull.classes[cId]);
		}
		const gr_id = makeClassGroup(c_list_full, group_type);
		if ( gr_id != '' && sup_id != '') {
			rezFull.classes[gr_id].super_classes = [sup_id];
			rezFull.classes[sup_id].sub_classes.push(gr_id);
		}
	}
}
function makeClassGroupsFromSubClasses(GroupTree) {
	for (const supId of Object.keys(GroupTree)) {
		const supClass = rezFull.classes[supId];
		let c_list_full = [];
		for (const cId of GroupTree[supId]) {
			c_list_full.push(rezFull.classes[cId]);
		}
		const gr_id = makeClassGroup(c_list_full, 'Class and subClasses', false);
		if ( gr_id != '' ) { // Cīņa ar daudzkāršo mantošanu
			for (const sub of c_list_full) {
				if ( sub.id != c_list_full[c_list_full.length-1].id ) {
					if ( sub.super_classes.length > 1 ) {
						console.log('Daudzkāršā mantošana ***************', sub)
						sub.used = true;
						let sup_list = [];
						for (const cc of sub.super_classes) {
							if ( cc !=  c_list_full[c_list_full.length-1].id) {
								sup_list.push(cc);
							}
						}
						sub.super_classes = sup_list;
					}
				}
			}
		}
		if ( gr_id != '' && supClass.super_classes.length > 0 ) {
			rezFull.classes[gr_id].super_classes = supClass.super_classes;
			for (const supSupClass of supClass.super_classes ) {
				rezFull.classes[supSupClass].sub_classes[rezFull.classes[supSupClass].sub_classes.indexOf(supId)] = gr_id;
			}
			rezFull.classes[supClass.id].super_classes = [];
		}
	}
}

// **************************
function getWeight(cnt, in_props) {
	return cnt + Math.round(Math.pow(in_props, 5/6));
}

// **********************************************************************************************************
// *** Parāda klašu sarakstu
function showClasses(basic = false) {
	let usedClasses	= [];
	let indMax = 0; // TODO jāpadomā ko ņemt skaitu vai svaru, jāliek iekš key
	const key = 'cnt_sum';

	for (const cl of Object.keys(rezFull.classes)) {
		let cInfo = rezFull.classes[cl];
		if ( cInfo[key] > indMax )
			indMax = cInfo[key];
	}

	for (const cl of Object.keys(rezFull.classes)) {
		let cInfo = rezFull.classes[cl];
		if ( cInfo.used || basic) {
			let pref = 'C';
			if ( cInfo.isGroup ) pref = 'M';
			if ( cInfo.type == 'Abstract' ) pref = 'A';
      if ( cInfo.type == 'PropertyTarget' || cInfo.type == 'PropertySource') pref = 'P';
			if ( basic && cInfo.sub_classes.length > 0 ) pref = 'A';
			if ( indMax < 1000) { // Šī ir konstante
				if ( cInfo[key] < 100 ) // Cita konstante
					cInfo.size = 0;
				else
					cInfo.size = 1;
			}
			else {
				if ( cInfo[key] < 100 )
					cInfo.size = 0;
				else if ( cInfo[key] < Math.pow(10,Math.log10(indMax)/2+1) )
					cInfo.size = 1;
				else
					cInfo.size = 2;

			}
			usedClasses.push({id:cl, display_name:`${pref} ${cInfo.fullName}`, cnt_sum:cInfo.cnt_sum, basic:basic});
			//usedClasses.push({id:cl, display_name:`s${cInfo.size} ${pref} ${cInfo.fullName}`, cnt_sum:cInfo.cnt_sum, basic:basic});
		}
	}
	usedClasses.sort((a, b) => { return b.cnt_sum - a.cnt_sum; });
	if ( usedClasses.length > 0 ) {
		usedClasses[0].selected = 'selected';
		Template.VQ_DSS_schema.UsedClasses.set(usedClasses);
		setSubClasses(usedClasses[0].id);
	}
	let clCount = 0;
	let grCount = 0;
	let abstrCount = 0;
	for (const clId of Object.keys(rezFull.classes)) {
		const cl_info = rezFull.classes[clId];
		if ( cl_info.used || basic ) {
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
	Template.VQ_DSS_schema.ClassCountAbstr.set(abstrCount);
}
// *** Salasa sākotnējās klases un to propertijas
async function getBasicClasses() {
  //console.log('Izsauc - getBasicClasses')
	clearData();
	//state = 1;
	const classesAndProperties = await getClassesAndProperties(); // Var pateikt, ka nav jāliek virsklases klāt (Tagad ir parametrs formā, kas ir galvenais)
	rezFull.namespaces = classesAndProperties[2];
	const c_list = classesAndProperties[0];
	let p_list = classesAndProperties[1];

  //const rr0 = await dataShapes.callServerFunction("xx_getPropList2", {main: { c_list: `${c_list}`}});
  //console.log('getBasicClasses- propertiju saraksta salīdzināšana', p_list.length, rr0.data.length)
	params = getParams();
	let rr;
	const addIds = params.addIds;
	//const compView = params.compView; // Atribūtu parametrs
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

		cl.cnt = Number(cl.cnt);
		let full_name = `${cl.full_name} (weight-${roundCount(cl.cnt_sum)} (${roundCount(cl.cnt)} ${roundCount(cl.in_props)}))`;
		let full_name_d = `${cl.full_name} (${roundCount(cl.cnt)})`;

		if ( addIds ) {
			full_name = `${full_name} ID-${cl.id}`;
			full_name_d = `${full_name_d} ID-${cl.id}`;
		}
			rezFull.classes[id] = { id:id, displayName:cl.full_name, id_id:cl.id, c_list_id:[cl.id], super_classes:[], sub_classes:[],
				used:true, hasGen:false, type:type, fullName:full_name, fullNameD:full_name_d,
				sup:cl.s, sub:cl.b, sup0:cl.s0, sub0:cl.b0, cnt:cl.cnt, cnt_sum:cl.cnt_sum, in_props:cl.in_props,
				atr_list:[], all_atr:[], all_atr_in:[], atr_list_full:[] };
	});

	if ( params.cover) // TODO Jāpadomā, vai šim nevajag atsevišķu pazīmi
		rr = await dataShapes.callServerFunction("xx_getCCInfo", allParams);
	else
		rr = await dataShapes.callServerFunction("xx_getCCInfoNew", allParams);

	// DB virsklašu informācijas pielikšana
	for (const cl of rr.data) {
		const id1 = `c_${cl.class_1_id}`;
		const id2 = `c_${cl.class_2_id}`;
		rezFull.classes[id1].super_classes.push(id2);
		rezFull.classes[id2].sub_classes.push(id1);
		rezFull.classes[id1].used = true;
		rezFull.classes[id2].used = true;
		rezFull.classes[id1].hasGen = true;
		rezFull.classes[id2].hasGen = true;
	}

	//rr = await dataShapes.callServerFunction("xx_getCPCInfo", allParams);
	allParams.main.p_list =  p_list.map(v => v.id);
	rr = await getCPCRels(allParams);
	cpc_info = rr.data;
  if ( cpc_info.length > 0 ) {
		has_cpc = true;
		for (const cpc of cpc_info) {
			cpc.cnt = Number(cpc.cnt);
		}
	}
	rr = await dataShapes.callServerFunction("xx_getCCInfo_Type3", allParams);
	cc_info_type3 = rr.data;

	//rr = await dataShapes.callServerFunction("xx_getCPInfo", allParams);
	//cp_info = rr.data;
	cp_info = await getCPRels(allParams);
  //console.log('getBasicClasses- Dabūjām cp_rels')
	// 55555555 Testam (ņemam tikai īpašās propertijas)
	allParams.main.p_list =  p_list.map(v => v.id);
	//const tt = await dataShapes.callServerFunction("xx_getCPInfoNew", allParams);
	//p_list = p_list.filter(function(p){ return tt.diffs.pIds.includes(p.id)});
	//console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', p_list);

	// Propertiju saraksta sākotnējā apstrāde, savāc galus
	for (const p of p_list) {
		const p_id = `p_${p.id}`;
		const p_name = `${p.prefix}:${p.display_name}`;
		const cp_info_p = cp_info.filter(function(cp){ return cp.property_id == p.id && c_list.includes(cp.class_id) && cp.cover_set_index > 0; });
		const cp_info_p_full = cp_info.filter(function(cp){ return cp.property_id == p.id && c_list.includes(cp.class_id) });
		const cp_info_p_o =  cp_info_p.filter(function(cp){ return cp.type_id == 2 && cp.object_cnt > 0; });
		const c_from = cp_info_p.filter(function(cp){ return cp.type_id == 2});
		const c_from_full = cp_info_p_full.filter(function(cp){ return cp.type_id == 2});
		const c_to_full = cp_info_p_full.filter(function(cp){ return cp.type_id == 1});
		let c_to = cp_info_p.filter(function(cp){ return cp.type_id == 1});

		//if (cp_info_p_o.length == 0 )  // TODO Šis liekas bija kaut kādiem ne gluži labiem datiem
		//	c_to = [];

		if ( p.max_cardinality == -1 )
			p.max_cardinality = '*';
		p_list_full[p_id] = {id:p.id, p_name:p_name, c_from:c_from, c_to:c_to, iri:p.iri, c_from_full:c_from_full, c_to_full:c_to_full,
			cnt:Number(p.cnt), object_cnt:Number(p.object_cnt), count:0, max_cardinality:p.max_cardinality};

		if ( c_to.length == 1 && p.range_class_id == c_to[0].class_id)  // TODO te varētu būt drusku savādāk, šie ir Aigas atrastie
			p_list_full[p_id].range_id = `c_${p.range_class_id}`;
		else
			p_list_full[p_id].range_id = '';

		if ( c_from.length == 1 && p.domain_class_id == c_from[0].class_id) // Te nezin kāpēc bija  _from.length > 0
			p_list_full[p_id].is_domain = 'D';
		else
			p_list_full[p_id].is_domain = '';
	}
  console.log(p_list_full)
  //console.log('getBasicClasses- Pirmais cikls beidzās')
	// Funkcija propertijas pielikšanai, tiek izsaukta divās vietās
	function addProperty(pp, c_from, c_to) {
		if ( c_from.length > 0  && c_to.length == 0) {
			for (const cl of c_from) {
				const cl_id = `c_${cl.class_id}`;
				const p_info = {p_name:pp.p_name, p_id:pp.id, type:'data', cnt:Number(cl.cnt), cnt2:Number(cl.cnt), object_cnt:Number(cl.object_cnt),
					is_domain:pp.is_domain, range_id:'', max_cardinality:pp.max_cardinality, class_list:[], cnt_full:Number(pp.cnt)};
				rezFull.classes[cl_id].atr_list.push(p_info);
				rezFull.classes[cl_id].used = true;
				if ( !rezFull.classes[cl_id].all_atr.includes(pp.id)) rezFull.classes[cl_id].all_atr.push(pp.id);
			}
		}
		else if ( c_from.length > 0  || c_to.length > 0) {  // TODO te bija &&
			for (const c_1 of c_from) {
				const from_id = `c_${c_1.class_id}`;
				if ( c_1.object_cnt > 0 ) {
					let cl_list = c_to.map( c => c.class_id);
					//const cpc_i = cpc_info.filter(function(i){ return i.class_id == c_1.class_id && i.property_id == c_1.property_id && i.type_id == c_1.type_id });  // ??? { return i.cp_rel_id == c_1.id });
					const cpc_i = cpc_info.filter(function(i){ return i.cp_rel_id == c_1.id });
					const from_id = `c_${c_1.class_id}`;
					if ( has_cpc && cpc_i.length > 0 ) // ( !compView && has_cpc && cpc_i.length > 0 )
						cl_list = cpc_i.map( c => c.other_class_id);
					const p_info = {p_name:pp.p_name, p_id:pp.id, type:'out', cnt:Number(c_1.cnt), cnt2:Number(c_1.cnt), object_cnt:Number(c_1.object_cnt),
						is_domain:pp.is_domain, range_id:pp.range_id, max_cardinality:pp.max_cardinality, class_list:cl_list.sort(), cnt_full:Number(pp.cnt)};
					rezFull.classes[from_id].atr_list.push(p_info);
				}
				else {
					const p_info = {p_name:pp.p_name, p_id:pp.id, type:'data', cnt:Number(c_1.cnt), cnt2:Number(c_1.cnt), object_cnt:Number(c_1.object_cnt),
						is_domain:pp.is_domain, range_id:'', max_cardinality:pp.max_cardinality, class_list:[], cnt_full:Number(pp.cnt)};
					rezFull.classes[from_id].atr_list.push(p_info);
				}
				rezFull.classes[from_id].used = true;
				if ( !rezFull.classes[from_id].all_atr.includes(pp.id)) rezFull.classes[from_id].all_atr.push(pp.id);
			}
			for (const c_2 of c_to) {
				const to_id = `c_${c_2.class_id}`;
				let cl_list = c_from.map( c => c.class_id);
				//const cpc_i = cpc_info.filter(function(i){ return i.other_class_id == c_2.class_id && i.property_id == c_2.property_id && i.type_id == c_2.type_id});  //{ return i.cp_rel_id == c_2.id });
				const cpc_i = cpc_info.filter(function(i){ return i.cp_rel_id == c_2.id });
				if ( has_cpc && cpc_i.length > 0 ) // ( !compView && has_cpc && cpc_i.length > 0 )
					cl_list = cpc_i.map( c => c.other_class_id);
				const p_info = {p_name:pp.p_name, p_id:pp.id, type:'in', cnt:Number(c_2.cnt), cnt2:Number(c_2.cnt), object_cnt:Number(c_2.object_cnt),
					is_domain:pp.is_domain, range_id:pp.range_id, class_list:cl_list.sort(), cnt_full:Number(pp.cnt)};
				rezFull.classes[to_id].atr_list.push(p_info);
				rezFull.classes[to_id].used = true;
				if ( !rezFull.classes[to_id].all_atr_in.includes(pp.id)) rezFull.classes[to_id].all_atr_in.push(pp.id);
			}
		}
    else {
      //console.log('HHHHHHHHHHHHHHHHHHHHHHHHHHHH', pp)
    }
	}

	// Funkcija visu propertiju pielikšanai
	function addPropertyFull(pp, c_from, c_to) {
		if ( c_from.length > 0 ) {
			for (const cl of c_from) {
				const cl_id = `c_${cl.class_id}`;
				const p_info = {p_name:pp.p_name, p_id:pp.id, type:'out', cnt:Number(cl.cnt), cnt2:Number(cl.cnt), cover_set_index:cl.cover_set_index, cnt_full:Number(pp.cnt)};
				rezFull.classes[cl_id].atr_list_full.push(p_info);
			}
		}
		if ( c_to.length > 0 ) {
			for (const cl of c_to) {
				const cl_id = `c_${cl.class_id}`;
				const p_info = {p_name:pp.p_name, p_id:pp.id, type:'in', cnt:Number(cl.cnt), cnt2:Number(cl.cnt), cover_set_index:cl.cover_set_index, cnt_full:Number(pp.cnt)};
				rezFull.classes[cl_id].atr_list_full.push(p_info);
			}
		}
	}

	//  propertiju pielikšana un visu (arī mantoto) propertiju pielikšana
	for (const p of Object.keys(p_list_full)) {
		const pp = p_list_full[p];
		const c_from = pp.c_from;
		let c_to = pp.c_to;
		//if (has_cpc)
		//	c_to = pp.c_to_full;
		addProperty(pp, c_from, c_to);
		if ( !unused_props.includes(pp.iri) )
			addPropertyFull(pp, pp.c_from_full, pp.c_to_full);
	}
  //console.log('getBasicClasses- Otrais cikls beidzās')
	// Iztūkstošo propertiju pievienošana (pārbaudot arī apkārtni)
	for (const cl of Object.keys(rezFull.classes)) {
		let cl_info = rezFull.classes[cl];

		for (const s of cl_info.sub) {
			if ( s != cl_info.id) {
				cl_info.all_atr = [...new Set([...cl_info.all_atr, ...rezFull.classes[`c_${s}`].all_atr])];
				cl_info.all_atr_in = [...new Set([...cl_info.all_atr_in, ...rezFull.classes[`c_${s}`].all_atr_in])];
			}
		}
		for (const s of cl_info.sup) {
			if ( s != cl_info.id) {
				cl_info.all_atr = [...new Set([...cl_info.all_atr, ...rezFull.classes[`c_${s}`].all_atr])];
				cl_info.all_atr_in = [...new Set([...cl_info.all_atr_in, ...rezFull.classes[`c_${s}`].all_atr_in])];
			}
		}

		const cp_info_p = cp_info.filter(function(cp){ return cp.class_id == cl_info.id && cp.type_id == 2 && cp.cover_set_index > 0;}).map(cp => cp.property_id); // ??? Kāpēc te ir cp.cover_set_index > 0
		for (const p of cp_info_p) {
			if ( !cl_info.all_atr.includes(p)) {
				console.log('******** Pieliek papildus propertiju ***********', cl_info.fullNameD, p_list_full[`p_${p}`].p_name)
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

  function addAttr(c_id, p_id, cnt, object_cnt, type) {
    const p_info = p_list_full[`p_${p_id}`];
    if ( type === 'in' ) {
      const class_ids = p_info.c_from.map( v => v.class_id);
      rezFull.classes[c_id].all_atr_in.push(p_id);
      rezFull.classes[c_id].atr_list.push({type:type, class_list:class_ids, cnt:cnt, cnt2:cnt, object_cnt:object_cnt, cnt_full:p_info.cnt, is_domain:'', range_id:'', max_cardinality:'*', p_id:p_id, p_name:p_info.p_name});
      if ( !unused_props.includes(p_info.iri) ) {
        rezFull.classes[c_id].atr_list_full.push({type:type, cnt:cnt, cnt2:cnt, cnt_full:p_info.cnt, cover_set_index:1, p_id:p_id, p_name:p_info.p_name});
      }
    }
    else {
      const class_ids = p_info.c_to.map( v => v.class_id);
      rezFull.classes[c_id].all_atr.push(p_id);
      rezFull.classes[c_id].atr_list.push({type:type, class_list:class_ids, cnt:cnt, cnt2:cnt, object_cnt:object_cnt, cnt_full:p_info.cnt, is_domain:'', range_id:'', max_cardinality:'*', p_id:p_id, p_name:p_info.p_name});
      if ( !unused_props.includes(p_info.iri) ) {
        rezFull.classes[c_id].atr_list_full.push({type:type, cnt:cnt, cnt2:cnt, cnt_full:p_info.cnt, cover_set_index:1, p_id:p_id, p_name:p_info.p_name});
      }
    }
  }

  if ( !dataShapes.schema.isPublic) {
    const propT = classesAndProperties[3].propT;
    const propS = classesAndProperties[3].propS;
    rr = await dataShapes.callServerFunction("xx_getPPInfo", allParams);
    const pp_info = rr.data;

    if ( propT.length + propS.length > 0 ) {
      for (const p of propT) {
        const id = `pt_${p.id}`;
        const name = `Target for ${p.full_name}`;
        const full_name = `Target for ${p.full_name} (${roundCount(p.object_cnt)})`;
        rezFull.classes[id] = { id:id, displayName:p.full_name, id_id:p.id, c_list_id:[p.id], super_classes:[], sub_classes:[],
          used:true, hasGen:false, type:'PropertyTarget', fullName:full_name, fullNameD:full_name,
          sup:[], sub:[], sup0:[], sub0:[], cnt:p.object_cnt, cnt_sum:p.object_cnt, in_props:0,
          atr_list:[], all_atr:[], all_atr_in:[], atr_list_full:[]};
        if ( p.type_1 != '0') {
          const prop_info = p_list_full[`p_${p.id}`];
          for(const c of prop_info.c_to){
            const cId = `c_${c.class_id}`;
            rezFull.classes[id].sub_classes.push(cId);
            rezFull.classes[cId].super_classes.push(id);
            rezFull.classes[id].hasGen = true;
            rezFull.classes[cId].hasGen = true;
          }
        }
        addAttr(id, p.id, p.cnt, p.cnt, 'in');
        const comon_objects = pp_info.filter(function(pp) { return pp.property_1_id == p.id && pp.property_2_id !== p.id  && pp.type_id== 3; });
        for ( const p2 of comon_objects) {
          addAttr(id, p2.property_2_id, Number(p2.cnt), Number(p2.cnt), 'in');
        }
        const followers = pp_info.filter(function(pp) { return pp.property_1_id == p.id && pp.property_2_id !== p.id  && pp.type_id== 1; });

        for ( const p2 of followers) {
          let object_cnt = Number(p2.cnt);
          let type = 'out';
          if ( p_list_full[`p_${p2.property_2_id}`].object_cnt == 0 ) {
            object_cnt = 0;
            type = 'data';
          }
          addAttr(id, p2.property_2_id, Number(p2.cnt), object_cnt, type);
        }
      }
      for (const p of propS) {
        const id = `ps_${p.id}`;
        const name = `Saurce for ${p.full_name}`;
        const full_name = `Saurce for ${p.full_name} (${roundCount(p.object_cnt)})`;
        rezFull.classes[id] = { id:id, displayName:name, id_id:p.id, c_list_id:[p.id], super_classes:[], sub_classes:[],
          used:true, hasGen:false, type:'PropertySource', fullName:name, fullNameD:name,
          sup:[], sub:[], sup0:[], sub0:[], cnt:p.object_cnt, cnt_sum:p.object_cnt, in_props:0,
          atr_list:[], all_atr:[], all_atr_in:[], atr_list_full:[] };
        addAttr(id, p.id, p.cnt, p.cnt, 'out');
        const comon_subjects = pp_info.filter(function(pp) { return pp.property_1_id == p.id && pp.property_2_id !== p.id  && pp.type_id== 2; });
        for ( const p2 of comon_subjects) {
          let object_cnt = Number(p2.cnt);
          let type = 'out';
          if ( p_list_full[`p_${p2.property_2_id}`].object_cnt == 0 ) {
            object_cnt = 0;
            type = 'data';
          }
          addAttr(id, p2.property_2_id, Number(p2.cnt), object_cnt, type);
        }
        const in_props = pp_info.filter(function(pp) { return pp.property_2_id == p.id && pp.property_1_id !== p.id  && pp.type_id== 1; });
        for ( const p2 of in_props) {
          addAttr(id, p2.property_1_id, Number(p2.cnt), Number(p2.cnt), 'in');
        }
      }
    }
  }
	//console.log('getBasicClasses- p_list_full', p_list_full);
	//console.log('rezFull', rezFull);
}

// *** Izveido klašu grupas, skatoties uz parametiem
async function calculateGroups() {
	// Tiek padots zīmējamo klašu un propertiju saraksts
	const diffG = params.diffG;
	console.log('**************calculateGroups*****************', params)
	const compChain = ( params.supPar == 1 ) ? true : false; // Vai apvienot vispārināšanas virknes
	if ( compChain) {
		let top_classes = [];
		for (const clId of Object.keys(rezFull.classes)) {
			const classInfo = rezFull.classes[clId];
			if ( classInfo.sub0 != undefined && classInfo.sup0 != undefined) {  // Grupām nav šo parametru
				if ( classInfo.sub0.length == 1 && ( classInfo.sup0.length != 1 || classInfo.cnt != rezFull.classes[`c_${classInfo.sup0[0]}`].cnt)) {
					const classInfo2 = rezFull.classes[`c_${classInfo.sub0[0]}`];
					if ( classInfo.cnt == classInfo2.cnt && classInfo2.sup0.length == 1 && classInfo.type == classInfo2.type) {
						top_classes.push(classInfo);
					}
				}
			}
		}
		console.log('Virsklašu virkņu sākumi (ekvivalentas klases)', top_classes)
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
					if ( nextClass.cnt == nextNextClass.cnt && nextNextClass.sup0.length == 1 && nextClass.type == nextNextClass.type) {
						isNext = true;
						thisClass = nextClass;
					}
				}
			}
			const classGrId = makeClassGroup(class_chain, 'Equivalent classes (chain)', false); // Šīm bija tā pazīme, ka ir ekvivalentas
			rezFull.classes[classGrId].super_classes = class_chain[0].super_classes;
			rezFull.classes[classGrId].sub_classes = class_chain[class_chain.length-1].sub_classes;

			if ( class_chain[0].super_classes.length > 0) {
				for (const sId of class_chain[0].super_classes) {
					const sInfo = rezFull.classes[sId];
					sInfo.sub_classes[sInfo.sub_classes.indexOf(class_chain[0].id)] = classGrId;
				}
			}
			if ( class_chain[class_chain.length-1].sub_classes.length > 0) {
				for (const sId of class_chain[class_chain.length-1].sub_classes) {
					const sInfo = rezFull.classes[sId];
					sInfo.super_classes[sInfo.super_classes.indexOf(class_chain[class_chain.length-1].id)] = classGrId;
				}
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
				if ( classInfo.atr_list.length == 0 && classInfo.super_classes.length == 0 && classInfo.sub_classes.length == 0 ) {
					empty_classes.push(classInfo);
				}
				if ( classInfo.atr_list.length == 0 && classInfo.super_classes.length == 1 && classInfo.sub_classes.length == 0 ) {
					if ( empty_sub_classes[classInfo.super_classes[0]] == undefined)
						empty_sub_classes[classInfo.super_classes[0]] = [classInfo];
					else
						empty_sub_classes[classInfo.super_classes[0]].push(classInfo);
				}
			}
		}

		// Veido dažādas klašu grupas, bez atribūtiem, bez vai ar virsklasēm
		if ( empty_classes.length > 0 ) {
			makeClassGroup(empty_classes.filter(function(c){ return c.type == 'Class'; }), 'Empty classes');
			makeClassGroup(empty_classes.filter(function(c){ return c.type == 'Classif'; }), 'Empty classes');
		}

		console.log("Tukšās apakšklases", empty_sub_classes)
		function makeEmptySubclassesGroup(classList, sup_id) {
			const classGrId =  makeClassGroup(classList, 'Empty subClasses');
			const supClass = rezFull.classes[sup_id];
			if ( classGrId != '' ) {
				rezFull.classes[classGrId].super_classes = [sup_id];
				const classListIds = classList.map( c => c.id);
				let sub_classes = [classGrId];
				for (const s of supClass.sub_classes) {
					if ( !classListIds.includes(s))
						sub_classes.push(s);
				}
				supClass.sub_classes = sub_classes;
			}
		}
		for (const sup_id of Object.keys(empty_sub_classes)) {
			makeEmptySubclassesGroup(empty_sub_classes[sup_id].filter(function(c){ return c.type == 'Class'; }), sup_id);
			makeEmptySubclassesGroup(empty_sub_classes[sup_id].filter(function(c){ return c.type == 'Classif'; }), sup_id);
			//const classGrId =  makeClassGroup(empty_sub_classes[sup_id].filter(function(c){ return c.type == 'Class'; }), 'Empty subClasses');
			//if ( classGrId != '' ) {
			//	rezFull.classes[classGrId].super_classes = [sup_id];
			//	rezFull.classes[sup_id].sub_classes.push(classGrId); // TODO Jāpadomā, vai nevajag savilktās apakšklases izmest laukā no saraksta
			//}
			//const classifGrId =  makeClassGroup(empty_sub_classes[sup_id].filter(function(c){ return c.type == 'Classif'; }), 'Empty subClasses');
			//if ( classifGrId != '' ) {
			//	rezFull.classes[classifGrId].super_classes = [sup_id];
			//}
		}

		// Veido klašu grupas, skatoties uz atribūtiem, klasēm, kas neietilpst vispārinašanās
		equivalent_classes = findSimilarClasses(0);
		console.log('Ekvivalentās klases', equivalent_classes)
		makeClassGroupFromTree(equivalent_classes, 'Equivalent classes');
	}
	if ( diffG > 0 )
		makeFirstGroups()
	// **************************************************

	function findSuperclasses() {
		let super_classes = {};
		let find = false;
		for (const clId of Object.keys(rezFull.classes)) {
			let classInfo = rezFull.classes[clId];
			if ( classInfo.used && classInfo.union_par == 1 ) {
				let s_list = [];
				for (const cl of classInfo.sub_classes) {
					if ( rezFull.classes[cl].used && rezFull.classes[cl].sub_classes.length == 0 && classInfo.type == rezFull.classes[cl].type) {
						s_list.push(rezFull.classes[cl]);
					}
				}
				if ( classInfo.sub_classes.length == s_list.length ) {
					let cc = 0;
					for (const s of s_list) {
						if ( params.newDifs ) {
							const diff = getDifference(classInfo, s);
							if ( diff[1] < diffG && diff[0] > diff[1] ) {
								cc = cc + 1;
							}
						}
						else {
							const diff = getDifference({id:classInfo.id, cnt:classInfo.cnt, atr_list:[]}, s);
							if ( diff[1] < diffG ) {
								cc = cc + 1;
							}
						}
					}
					if ( classInfo.sub_classes.length == cc ) {
						classInfo.union_par = 3;
						super_classes[classInfo.id] = s_list.map(s => s.id);
						super_classes[classInfo.id].push(classInfo.id);
						find = true;
					}
					else {
						classInfo.union_par = 5;
						console.log('****** Klase tika izbrāķēta apakšklašu ievilkšanā atšķirību dēļ', classInfo)
					}
				}
				else {
					console.log('****** Klase tika izbrāķēta apakšklašu ievilkšanā apakšklašu skaita dēļ', classInfo, s_list)
				}

			}
		}
		return {find:find, groups:super_classes};
	}
	// Apvieno tuvās klases grupās
	if ( diffG > 1 ) {
		// Potenciālās 'ievelkošās' virsklases
		for (const clId of Object.keys(rezFull.classes)) {
			let classInfo = rezFull.classes[clId];
			if ( classInfo.used && classInfo.sub_classes.length > 0 )
				classInfo.union_par = 1;
			else
				classInfo.union_par = 0;
		}

		let super_classes = findSuperclasses();
		while ( super_classes.find ) {
			console.log("Ko atrada apakšklašu ievilkšanai", super_classes);
			makeClassGroupsFromSubClasses(super_classes.groups);
			super_classes = findSuperclasses();
		}

		// Draudzīgo apakšklašu savilkšana kopā
		super_classes = {};
		for (const clId of Object.keys(rezFull.classes)) {
			let classInfo = rezFull.classes[clId];
			if ( classInfo.used && classInfo.sub_classes.length > 0 ) {
				super_classes[classInfo.id] = [];
				for (const cl of classInfo.sub_classes) {
					if ( rezFull.classes[cl].used && rezFull.classes[cl].sub_classes.length == 0 )
						super_classes[classInfo.id].push(rezFull.classes[cl]);
				}
			}
		}
		console.log('Virsklases ar bērniem', super_classes)
		let grouped_classes = [];
		for (const sc of Object.keys(super_classes)) {
			if ( super_classes[sc].length > 1 ) {
				//console.log('virsklase', sc)
				let level = 5;
				if ( params.newDifs ) {
					level = 1; // Ja ir jaunai variants, tad pārbauda parasto līdzību
				}
				const sc_gr = findSimilarClasses(level, super_classes[sc]);
				console.log("Apakšklašu grupas", sc, sc_gr)
				for (const c of Object.keys(sc_gr)) {
					for (const cId of sc_gr[c]) {
						grouped_classes.push(cId);
					}
				}
				makeClassGroupFromTree(sc_gr, 'Similar subClasses', sc);
				//console.log('grupas',sc_gr)
			}
		}

		for (const clId of Object.keys(rezFull.classes)) {
			let classInfo = rezFull.classes[clId];
			if ( grouped_classes.includes(classInfo.id) && classInfo.super_classes.length > 1 && classInfo.G_id != undefined ) {
				let gr_sup = [];
				for (const gr of classInfo.G_id ) {
					if ( rezFull.classes[gr].used ) {
						for (const s of rezFull.classes[gr].super_classes) {
							gr_sup.push(s);
						}
					}
				}
				let rest_sp = [];
				for (const s of classInfo.super_classes) {
					if ( !gr_sup.includes(s) )
						rest_sp.push(s);
				}
				if ( rest_sp.length > 0 ) {
					console.log("Bija tā dīvainā situācija apakšklasēm", classInfo, rest_sp)
					classInfo.used = true;
					classInfo.super_classes = rest_sp;
				}
			}
			/*
			if ( classInfo.G_id != undefined && classInfo.super_classes.length > 1 && classInfo.G_id.length < classInfo.super_classes.length ) {
				console.log("Bija tā dīvainā situācija apakšklasēm", classInfo)
				classInfo.used = true;
				let g_sc = [];
				let c_sc = [];
				for (const g of classInfo.G_id) {
					if ( rezFull.classes[g].super_classes.length > 0 )
						g_sc.push(rezFull.classes[g].super_classes[0]);
				}
				for (const s of classInfo.super_classes) {
					if ( !g_sc.includes(s))
						c_sc.push(s);
				}
				classInfo.super_classes = c_sc;
			} */
		}

		const similarClassesG = findSimilarClasses(1); // Meklējam līdzīgas klases grupēšanai
		console.log("Līdzīgās klases grupu veidošanai", similarClassesG);
		makeClassGroupFromTree(similarClassesG, 'Similar classes');
	}
}

// Virsklašu veidošanas funkcija
function makeSuperClasses() {
	const diffS = params.diffS;
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
			type:'Abstract', super_classes:[], c_list:[], c_list_id:[], sub_classes_list:[]};

		let g_list = [];
		let c_list_full = [];
    let c_list_full_elem = [];
    //rezFull.classes[g_id].sub_classes_list =  _.map(c_list_full, function(c) {
		//	return {cnt:c.cnt, name:c.fullNameD, shortName:c.displayName};

		let cnt = 0;
		for (let classInfo of cl_list) {
			const atr_list = makeAtrList(classInfo.atr_list);
			c_list_full.push(classInfo);
			cnt = cnt + classInfo.cnt;
			classInfo.super_classes.push(sc_id);
			classInfo.hasGen = true;
			classInfo.S_id = sc_id;
			if ( classInfo.isGroup ) {
				for (let g_cl of classInfo.c_list) {
					rezFull.classes[g_cl].S_id = sc_id;
					rezFull.classes[sc_id].c_list_id.push(rezFull.classes[g_cl].id_id);
          rezFull.classes[sc_id].sub_classes_list.push({cnt:rezFull.classes[g_cl].cnt, name:rezFull.classes[g_cl].fullNameD, shortName:rezFull.classes[g_cl].displayName});
				}
			}
			else {
				rezFull.classes[sc_id].c_list_id.push(classInfo.id_id);
        rezFull.classes[sc_id].sub_classes_list.push({cnt:classInfo.cnt, name:classInfo.fullNameD, shortName:classInfo.displayName});
			}
			if ( atr_list.length > 0 )
				rezFull.classes[sc_id].c_list.push(classInfo.id);
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

		if ( g_list.length > 1 && params.diffG > 0) {
			const grId = makeClassGroup(g_list, 'in makeSuperClasses');
			const gClass =  rezFull.classes[grId];
			gClass.super_classes.push(sc_id);
			gClass.S_id = sc_id;
			gClass.hasGen = true;
			rezFull.classes[sc_id].c_list.push(grId);
		}
		else if ( g_list.length == 1 ) {
			rezFull.classes[sc_id].c_list.push(g_list[0].id);
		}

		rezFull.classes[sc_id].atr_list = sup_atr_list;
		rezFull.classes[sc_id].cnt = cnt;
		rezFull.classes[sc_id].in_props = getInPropCount(sup_atr_list);
		rezFull.classes[sc_id].cnt_sum = getWeight(rezFull.classes[sc_id].cnt, rezFull.classes[sc_id].in_props);

		c_list_full = c_list_full.sort((a, b) => { return b.cnt - a.cnt; });
		const txt = (c_list_full[0].isGroup) ? '' : ' et al.';
		let fullName = `${c_list_full[0].displayName}${txt} S${Snum} (weight~${roundCount(rezFull.classes[sc_id].cnt_sum)})`;
		let fullNameD = `${c_list_full[0].displayName}${txt} S${Snum} (~${roundCount(cnt)})`;
		let displayName = `${c_list_full[0].displayName}${txt}`;
		if ( c_list_full.length == 2 ) {
			fullName = `${c_list_full[0].displayName} or ${c_list_full[1].displayName} S${Gnum} (weight~${roundCount(rezFull.classes[sc_id].cnt_sum)})`;
			fullNameD = `${c_list_full[0].displayName} or ${c_list_full[1].displayName} S${Gnum} (~${roundCount(cnt)})`;
			displayName = `${c_list_full[0].displayName} or ${c_list_full[1].displayName}`;
		}
		rezFull.classes[sc_id].fullName = fullName;
		rezFull.classes[sc_id].fullNameD = fullNameD;
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
				const atrTree = makeAtrTree(c_list_full, 'atr_list');
				makeSupClass(c_list_full, atrTree);
			}
		}
		rezFull.lines = {};
	}
}

function countAssociations() {
	let count = 0;
	let assoc = {}
	for (const aa of Object.keys(rezFull.assoc)) {
		const aInfo = rezFull.assoc[aa];
		if ( !aInfo.removed && aInfo.from != aInfo.to) {
			assoc[`${aInfo.from}_${aInfo.to}`] = 1;
		}
	}
	console.log('Līniju skaitīšanai', assoc)
	for (const a of Object.keys(assoc)) {
		count = count + assoc[a];
	}
	return count;
}

// Diagrammas līniju savilkšanas daļa
function makeAssociations() {
	const remBig = params.disconnBig > 0;
	const remCount = params.disconnBig;
	let hideSmall = params.hideSmall;
	let showEssent = 0;
	if ( hideSmall < 0 ) {
		showEssent = -1/hideSmall;
		hideSmall = 0;
	}
	const showIntersect = params.showIntersect;

	function findNewClassList(atr, type = '') {
		let c_list2 = [];
		for ( const cl of atr.class_list) {
			const cInfo = rezFull.classes[`c_${cl}`];
			if ( cInfo != undefined ) {
				if ( cInfo.G_id == undefined && cInfo.S_id == undefined ) {
					c_list2.push(`c_${cl}`);
				}
				if ( cInfo.G_id != undefined && cInfo.S_id == undefined) {
					for (const g of cInfo.G_id) {
						if ( !c_list2.includes(g) && rezFull.classes[g].used)
							c_list2.push(g);
					}
				}
				if ( cInfo.S_id != undefined ) {
					const aa = rezFull.classes[cInfo.S_id].atr_list.filter(function(a){ return a.p_name == atr.p_name && a.type == type});
					if ( aa.length > 0) {
						if ( !c_list2.includes(cInfo.S_id))
							c_list2.push(cInfo.S_id);
					}
					else if ( cInfo.G_id != undefined ) {
						for (const g of cInfo.G_id) {
							if ( !c_list2.includes(g) && rezFull.classes[g].used)
								c_list2.push(g);
						}
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
				if ( atr.type == 'out' && atr.cnt > 0 && atr.cnt_full > hideSmall && atr.object_cnt > classInfo.cnt*showEssent ) {
					let hasAssoc = false;
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
						const is_range = ( atr.range_id == to_id ) ? 'R':'';
						const p_name = ( params.addIds ) ? `${atr.p_name}(ID-${atr.p_id})`: atr.p_name;
						if ( !has_cpc) {
							rezFull.assoc[aId] = {string:`${p_name}  ${atr.is_domain}${is_range}`, cnt:0, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:clId, to:to_id, removed:false };
							hasAssoc = true;
						}
						else {
							const cpc_info_a = cpc_info.filter(function(i){
								return i.property_id == atr.p_id && i.type_id == 2 && classInfo.c_list_id.includes(i.class_id) && rezFull.classes[to_id].c_list_id.includes(i.other_class_id);
							});
							const aCnt = cpc_info_a.map( v => v.cnt).reduce((a, b) => a + b, 0);
							if ( aCnt > 0 ) {
								rezFull.assoc[aId] = {string:`${p_name} (${roundCount(aCnt)}) ${atr.is_domain}${is_range}`,cnt:aCnt, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:clId, to:to_id, removed:false };
								hasAssoc = true;
							}
						}
					}
					atr.hasAssoc = hasAssoc;
				}

        if ( !dataShapes.schema.isPublic ) {
          //if ( classInfo.type == 'PropertyTarget') {
            if ( atr.type == 'out' && ( classInfo.type == 'PropertyTarget' || classInfo.type == 'PropertySource' ) ) {
              for (const to_id of atr.class_list2) {
                const aId = `${clId}_${to_id}_${atr.p_name}`;
                rezFull.assoc[aId] = {string:`${atr.p_name} (${roundCount(atr.cnt)})`, cnt:atr.cnt, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:clId, to:to_id, removed:false };
                atr.hasAssoc = true;
                atr.object_cnt_dgr = atr.object_cnt;
              }
              if ( atr.class_list2.length == 0 && rezFull.classes[`pt_${atr.p_id}`] != undefined ) {
                let to_id = `pt_${atr.p_id}`;
                if ( rezFull.classes[to_id].G_id != undefined ) {
                  to_id = rezFull.classes[to_id].G_id[rezFull.classes[to_id].G_id.length-1];
                }
                rezFull.assoc[`${clId}_${to_id}_${atr.p_name}`] = {string:`${atr.p_name} (${roundCount(atr.cnt)})`, cnt:atr.cnt, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:clId, to:to_id, removed:false };
                atr.hasAssoc = true;
                atr.object_cnt_dgr = atr.object_cnt;
              }
            }
            if ( atr.type == 'in' &&  classInfo.type == 'PropertyTarget' ) {
              for (const to_id of atr.class_list2) {
                const aId = `${to_id}_${clId}_${atr.p_name}`;
                rezFull.assoc[aId] = {string:`${atr.p_name} (${roundCount(atr.cnt)})`, cnt:atr.cnt, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:to_id, to:clId, removed:false };
                atr.hasAssoc = true;
              }
            }
          //}
          //if ( classInfo.type == 'PropertySource') {
          //  console.log('IR SSSSSSSSSSSSSSSSSSSSSSS', classInfo)
          //}
        }

			}
		}
	}

	// Saskaita cik vietās propertija ir iezīmēta
	for (const aa of Object.keys(rezFull.assoc)) {
		const aInfo = rezFull.assoc[aa];
		if ( !aInfo.removed && aInfo.from != aInfo.to ) {
			p_list_full[rezFull.assoc[aa].p_id].count++;
		}
	}
	let hidedProps = {big:[],small:[]};
	for (const pId of Object.keys(p_list_full)) {
		if ( p_list_full[pId].count  > remCount && remBig)
			hidedProps.big.push(`${p_list_full[pId].p_name} cnt ${p_list_full[pId].cnt} dgr_lines_cnt ${p_list_full[pId].count}`);
		if ( p_list_full[pId].cnt <=  hideSmall )
			hidedProps.small.push(`${p_list_full[pId].p_name} cnt ${p_list_full[pId].cnt}`);
	}
	if ( hidedProps.big.length > 0 || hidedProps.big.small > 0 )
		console.log('Propertijas, kas netiek novilktas kā līnijas:', hidedProps )

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
	rezFull.lines = {};
	// Savieno klases, kuras šķeļās
	if ( showIntersect) {
		for (const p of cc_info_type3) {
			const c1 = findNewClassList({p_name:'',class_list:[p.class_1_id]})[0];
			const c2 = findNewClassList({p_name:'',class_list:[p.class_2_id]})[0];
			if ( c1 != c2 && c1 < c2 ) {
				rezFull.lines[`${c1}_${c2}_i`] = {from:c1, to:c2};
			}
		}
	}
}

// Funkcija diagrammas izskata sakartošanai
function makeDiagramData() {
	// Iegūst atribūtu rādāmo izskatu, noder diagrammai
	function getAtrString(atr_info) {
		let rez = '';
		const p_name = ( params.addIds ) ? `${atr_info.p_name}(ID-${atr_info.p_id})`: atr_info.p_name;
		let cntString = roundCount(atr_info.cnt);
		let dataProc = '';
		if ( atr_info.object_cnt < atr_info.cnt && atr_info.object_cnt > 0) {
			let proc = Math.round(100*(atr_info.cnt-atr_info.object_cnt)/atr_info.cnt);
			if ( proc == 100) proc = 99.9;
			if ( proc == 0 ) proc = 0.01;
			dataProc = ` ${proc}%d`;
		}
		cntString = `(${cntString}${dataProc})`;
		if ( atr_info.type == 'data') {
			rez = `${p_name} ${cntString} [${atr_info.max_cardinality}] ${atr_info.is_domain}`;
			if ( atr_info.object_cnt > 0 )
				rez = `${rez} ${u_to_type} IRI`;
		}
		else {
			let classNames = '';
			let is_range = '';
			if ( atr_info.class_list2.length == 1 && atr_info.class_list2[0] == atr_info.range_id )
				is_range = 'R';
			if ( !(atr_info.class_list2 == undefined) ) {
				if (params.compView && atr_info.class_list2.length > 3 ) {
					classNames = ` ${rezFull.classes[atr_info.class_list2[0]].displayName},${rezFull.classes[atr_info.class_list2[1]].displayName}..(${atr_info.class_list2.length})`;
				}
				else {
					classNames = ` ${atr_info.class_list2.map(cl => rezFull.classes[cl].displayName).sort().join(',')}`;
				}
			}
			if ( atr_info.class_list2.length == 0 ) classNames = ' IRI';

			if ( atr_info.type == 'out' ) {
				if ( p_list_full[`p_${atr_info.p_id}`].in_diagram ) {
					if ( atr_info.object_cnt_dgr > 0 )
						rez = `${p_name} ${cntString} [${atr_info.max_cardinality}] ${atr_info.is_domain} ${u_to_type} dgr,IRI`;
					else
						rez = `${p_name} ${cntString} [${atr_info.max_cardinality}] ${atr_info.is_domain} ${u_to_type} IRI`;
				}
				else {
					rez = `${p_name} ${cntString} [${atr_info.max_cardinality}] ${atr_info.is_domain}${is_range} ${u_to_type}${classNames}`;
				}
			}
			if (atr_info.type == 'in') {
				rez = `${p_name} ${cntString} ${is_range}${atr_info.is_domain} ${u_from_type}${classNames}`;
			}
		}

		rez = rez.replaceAll('  ', ' ');
		return rez;
		//const clCount = ( atr_info.type != 'data') ? ` (${atr_info.class_list2.length})` : '';
		//if ( atr_info.type == 'data' )
		//	return `${p_name} ${atr_info.type} [${atr_info.cnt}]`;
		//else
		//	return `${p_name} ${atr_info.type} [${atr_info.cnt}] (${atr_info.class_list2.length})`;
	}
	function getAtrList(atrList) {
		if ( has_cpc )  // Ja nav, tad skaits var būt 0
			atrList = atrList.filter(function(a){ return a.cnt > 0 });
		atrList =  atrList.sort((a, b) => { return b.cnt - a.cnt; });
		const rez = _.map(atrList, function(a) {
			return {cnt:a.cnt, name:getAtrString(a)};
		});
		return rez;
	}

	// Cikliskās asociācijas
	for (const clId of Object.keys(rezFull.classes)) {
		rezFull.classes[clId]['attributesT'] = {out:[],in:[],c:[]};
	}

	for (const aa of Object.keys(rezFull.assoc)) {
		const aInfo = rezFull.assoc[aa];
		if ( !aInfo.removed) {
			if ( aInfo.from == aInfo.to ) {
				if ( has_cpc && aInfo.cnt > 0 )
					rezFull.classes[aInfo.from].attributesT.c.push({name:`${aInfo.string}`, cnt:aInfo.cnt});
				else if ( !has_cpc )
					rezFull.classes[aInfo.from].attributesT.c.push({name:`${aInfo.string}`, cnt:aInfo.cnt});
				aInfo.removed = true;
			}
		}
	}
	// Klašu apstrāde
	for (const clId of Object.keys(rezFull.classes)) {
		const classInfo = rezFull.classes[clId];
		let restAtrList = [];
		let inPropList = [];
		if ( classInfo.used ) {
			classInfo.attributesT.c.sort((a, b) => { return b.cnt - a.cnt; });
			for ( const atr of classInfo.atr_list) { // BBBBBB te būs jāpielabo
				if ( atr.type == 'data' ) {
					restAtrList.push(atr);
				}
				if ( atr.type == 'out' ) {
					if ( !(p_list_full[`p_${atr.p_id}`].in_diagram && atr.object_cnt_dgr >= atr.object_cnt) ) {
						restAtrList.push(atr);
					}
					if ( p_list_full[`p_${atr.p_id}`].in_diagram && atr.object_cnt_dgr > atr.object_cnt) {
						console.log('******* Aizdomīgs atribūts  ********', classInfo.displayName, atr.p_name)
					}
				}
				if ( atr.type == 'in' && !p_list_full[`p_${atr.p_id}`].in_diagram)
					inPropList.push(atr);
			}

			restAtrList = getAtrList(restAtrList);
			//classInfo.atr_string = restAtrList.filter(function(a){ return a.cnt > 0 }).map(a => getAtrString(a)).sort().join('\n');
			//classInfo.attributesT.out = getAtrList(restAtrList);
			classInfo.atr_string = restAtrList.map(a => a.name).sort().join('\n');
			classInfo.attributesT.out = restAtrList;
			if ( inPropList.length > 0 ) {
				inPropList = getAtrList(inPropList);
				//classInfo.atr_string = `${classInfo.atr_string}\n${inPropList.filter(function(a){ return a.cnt > 0 }).map(a => `\u21a4 ${getAtrString(a)}`).sort().join('\n')}`;
				//classInfo.attributesT.in = getAtrList(inPropList);
				classInfo.atr_string = `${classInfo.atr_string}\n${inPropList.map(a => `<- ${a.name}`).sort().join('\n')}`;  // \u2193
				classInfo.attributesT.in = inPropList;
			}
			if ( classInfo.attributesT.c.length > 0 ) {
				//classInfo.atr_string = `${classInfo.atr_string}\n${classInfo.attributesT.c.filter(function(a){ return a.cnt > 0 }).map(a => `\u27F2 ${a.name}`).sort().join('\n')}`;
				classInfo.atr_string = `${classInfo.atr_string}\n${classInfo.attributesT.c.map(a => `<> ${a.name}`).sort().join('\n')}`; // \u2195
			}
			classInfo.atr_string = classInfo.atr_string.replaceAll(u_to_type,'=>');
			classInfo.atr_string = classInfo.atr_string.replaceAll(u_from_type,'<=');
		}
	}
	// Savāc kopā asociācijas
	let assoc = {};
	for (const aa of Object.keys(rezFull.assoc)) {
		const aInfo = rezFull.assoc[aa];
		if ( !aInfo.removed) {
			const aID = `${aInfo.from}_${aInfo.to}`;
			if ( assoc[aID] != undefined ) {
				assoc[aID].string = `${assoc[aID].string}\n${aInfo.string}`;
				assoc[aID].names.push({name:aInfo.string, shortName:aInfo.p_name, cnt:aInfo.cnt});
			}
			else {
				assoc[aID] = {from:aInfo.from, to:aInfo.to, removed:false, string:aInfo.string,
				names:[{name:aInfo.string, shortName:aInfo.p_name, cnt:aInfo.cnt}]};
			}
		}
	}
	//for (const aa of Object.keys(rezFull.lines)) {
	//	const lInfo = rezFull.lines[aa];
	//	assoc[aa] = {from:lInfo.from, to:lInfo.to, removed:false, string:'', names:[]};
	//}
	for (const aa of Object.keys(assoc)) {
		const aInfo = assoc[aa];
		aInfo.names = aInfo.names.sort((a, b) => { return b.cnt - a.cnt; });
	}

	rezFull.assoc = assoc;
}
// **********************************************************************************************************
