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
Template.VQ_DSS_schema.IsPublic = new ReactiveVar(false);
Template.VQ_DSS_schema.HasClasses = new ReactiveVar('');

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

Template.VQ_DSS_schema.rendered = function() {
	clearData();
	Template.VQ_DSS_schema.IsPublic.set(false); // TODO kā lai atšķir, publiskais vai nepubliskais varaints?
	Template.VQ_DSS_schema.SchemaName.set(dataShapes.schema.schemaName);
	Template.VQ_DSS_schema.ClassCountAll.set(dataShapes.schema.classCount);
	Template.VQ_DSS_schema.PropCountAll.set(dataShapes.schema.propCount);

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
		return Template.VQ_DSS_schema.IsPublic.get();
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
	
});

function getParams() {
	let par = {addIds:false, disconnBig:$("#disconnBig").val(), hideSmall:$("#hideSmall").val(), compView:$("#compView").is(":checked"), newDifs:$("#newDifs").is(":checked"),
		pw:$("#pw").val(), diffG:$("#diffG").val(), diffS:0, supPar:1, schema:dataShapes.schema.schema}; // withoutGen:$("#withoutGen").is(":checked"),
		//if ( $("#diffG").val() == 10 ) 
		//	par.supPar = 2;
		if ( $("#abstr").is(":checked") )
			par.diffS = 50;
		if ( $("#diffG").val() == 0 )
			par.supPar = 0;

	if ( !Template.VQ_DSS_schema.IsPublic.get() ) {
		par.addIds = $("#addIds").is(":checked"); 
	}
	return par;
}

function getInfo() {
	return  [ `${dataShapes.schema.endpoint}`, `${Template.VQ_DSS_schema.ClassCountSelected.get()} classes in the diagram`,
			$('#nsFilter option:selected').text(), $('#disconnBig option:selected').text(),  $('#diffG option:selected').text()];
} 

async function getClassesAndProperties() {
	let classList = Template.VQ_DSS_schema.Classes.get();
	let namespaces = {};
	let namespacesL = [];
	let all_s = [];
	_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
	
	_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
		if ( all_s.includes(cl.id)) cl.sel = 1;
		else cl.sel = 0;
	});
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

		namespacesL = namespacesL.sort((a, b) => { return b.cnt - a.cnt; })
	}
	namespacesL.unshift({name:`PREFIX ${dataShapes.schema.local_ns}: <${nsLoc.value}>`,cnt:namespaces[dataShapes.schema.local_ns]});

	return [classList, propList, namespacesL];
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
		console.log('************', Template.VQ_DSS_schema.Classes.get(), Template.VQ_DSS_schema.RestClasses.get(), Template.VQ_DSS_schema.Properties.get(), Template.VQ_DSS_schema.RestProperties.get())
		
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
	'click #printGroups': async function() {
		//TODO šis vēlāk vairs nebūs
		await printSup({printGroups:true});
	},	
	'click #printDiffs': async function() {
		//TODO šis vēlāk vairs nebūs
		await printSup({printDiffs:true});
	},
	'click #showClasses': async function() {
		await getBasicClasses();
		calculateAllDifs();
		console.log(rezFull)
		showClasses(true);
	},
	'click #showGroups': async function() {
		// if ( state == 0 )
		await getBasicClasses(); // TODO varētu šīs jau būt izrēķinātas
		calculateGroups();
		makeSuperClasses(); 
		makeAssociations();
		showClasses();
		Template.VQ_DSS_schema.LinesCount.set(countAssociations());
		rezFull.lines = {};
		console.log('rezFull', rezFull);
	},
	'click #makeDiagr': async function() {
		await getBasicClasses(); // TODO varētu šīs jau būt izrēķinātas
		calculateGroups();
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
	'click #makeDiagrAJOO2': async function() {
		//if ( state == 0 )
		await getBasicClasses(); 
		calculateGroups();
		makeSuperClasses(); 
		makeAssociations();
		showClasses(); // TODO Šeit būtu tikai jāsaskaita, kas būs diagrammā
		makeDiagramData();
		console.log('rezFull', rezFull);

		const table_representation = { 
			Schema:dataShapes.schema.schemaName, 
			ClassCount:Template.VQ_DSS_schema.ClassCountSelected.get(),
			CompactClassView:$("#compClassView").is(":checked"),
			NodesCount:Template.VQ_DSS_schema.ClassCountUsed.get(),
			Namespaces:{n_0:{compartments:{ List:rezFull.namespaces}}},
			Class:{}, 
			ObjectProperty:{}, 
			Generalization:{}};

		let hasGeneralization = false;
		let generalizationCount = 0;

		for (const k of Object.keys(rezFull.classes)) {
			const el = rezFull.classes[k];
			if ( el.used ) {
				let type = el.type;
				let typeNew = el.type;
				if ( type == 'Classif') { 
					if ( el.sub_classes_group_string != undefined ) {
						type = 'ClassifierGroup'
						typeNew = 'ClassifierGroup'
					}	
					else {
						type = 'Classifier';
						typeNew = 'Classifier';
					}
				}
				if ( type == 'Class' && el.sub_classes_group_string != undefined ) {
					type = 'ClassGroup';
					typeNew = `ClassGroup${el.size}`;
				}
				if ( type == 'Class' && el.sub_classes_group_string == undefined ) {
					type = 'Class';
					typeNew = `Class${el.size}`;
				}
				if ( type== 'Abstract') {
					type = 'AbstractClass';
					typeNew = `AbstractClass${el.size}`;
				}

				//const atrCnt = calculateCount(7, el.attributesT.out, el.cnt);  // Pagaidām neizmantosim
				//console.log(atrCnt);							atrCnt: atrCnt, 		
					
				table_representation.Class[k] = { compartments:{ 
						Name:el.fullNameD, 
						AttributesT:el.attributesT,
						ClassList:[],
						TypeOld:type,
						TypeNew:typeNew},
					Cnt:el.cnt};
				if ( el.sub_classes_group_string != undefined )
					table_representation.Class[k].compartments.ClassList = el.sub_classes_list;

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
			if ( el.removed == false  )
				table_representation.ObjectProperty[k] = { source: el.from, target: el.to, compartments:{ Name: el.names}};
		}
		table_representation.hasGeneralization = hasGeneralization;
		table_representation.generalizationCount = generalizationCount;
		console.log(table_representation)
		Meteor.call("importOntologyNew", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")}, table_representation);

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
	'click #removeAll': function() {
		// TODO Šīs pogas vairs nav
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
		const properties = dataShapes.schema.diagram.properties; 
		Template.VQ_DSS_schema.Properties.set(properties);
		Template.VQ_DSS_schema.PropCount.set(properties.length);
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
var has_cpc = false;
var propSliderIntValues = [];
var propSliderTextValues = [];
var propPositions = [];
var params = {};
const unused_props = [
	'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
	'http://www.w3.org/2004/02/skos/core#prefLabel',
	'http://www.w3.org/2004/02/skos/core#altLabel',
	'http://www.w3.org/2000/01/rdf-schema#label' ];

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
	rezFull = {classes:{}, assoc:{}, lines:{}, schema:dataShapes.schema.schema, type:'makeSuperDiagr', diffMax:0}; // TODO te zīmešanai nav vairāku variantu
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
		else if ( rezFull.diffMax < 25 )
			diffS = 5;
	}
	return {diffG:$("#diffG").val(), diffS:diffS};
}
// ***************** Konstantes***************************
function checkSimilarity(diff, level) {
	//Ekvivalentās klases (level 0) , līdzīgās klases (level = 1), abstraktajām virsklasēm (level = 2), apaksklašu savilkšana (level = 5) 
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
			if ( diff[1] < diffs.diffG && diff[0] > diff[1] ) 
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
	//Ekvivalentās klases (level 0) , līdzīgās klases (level = 1), abstraktajām virsklasēm (level = 2), apaksklašu savilkšana (level = 5) 
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
				if ( diff[0] <= diff[1] && !(diff[0] == 0 && diff[1] == 0 ) )
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
			s = s + Math.sqrt(Math.max(atrTree1[aId].cnt/classInfo1.cnt,1)*Math.max(atrTree2[aId].cnt/classInfo2.cnt,1))*pw;     //s(A,B) = ∑sqrt(max(pA/cA,1) * max(pB/cB,1)) *pw 
			// Bija data - Ad = Ad + Math.sqrt((atrTree1[aId].cnt/classInfo1.cnt)*(atrTree2[aId].cnt/classInfo2.cnt));
			// Bija obj - Ao = Ao + atrTree1[aId].class_list.length*Math.sqrt((atrTree1[aId].cnt/classInfo1.cnt)*(atrTree2[aId].cnt/classInfo2.cnt));
		}
		else if ( atrTree1[aId] != undefined ) { // Atribūts ir tikai pirmajai klasei
			d =d + Math.sqrt(Math.max(Math.pow(atrTree1[aId].cnt/classInfo1.cnt,1),2)*(classInfo1.cnt/(classInfo1.cnt+classInfo2.cnt))); //d(A,B) = ∑sqrt(max(pA/cA,1)^2*(cA/(cA+cB))) 
			// Bija data - Bd = Bd + Math.sqrt(atrTree1[aId].cnt/Math.sqrt(classInfo1.cnt*(classInfo1.cnt+classInfo2.cnt)));  
			// Bija obj - Bo = Bo + Math.sqrt(atrTree1[aId].cnt/Math.sqrt(classInfo1.cnt*(classInfo1.cnt+classInfo2.cnt)));  

		}
		else if ( atrTree2[aId] != undefined ) { // Atribūts ir tikai otrajai klasei
			d =d + Math.sqrt(Math.max(Math.pow(atrTree2[aId].cnt/classInfo2.cnt,1),2)*(classInfo2.cnt/(classInfo1.cnt+classInfo2.cnt)));
			// Bija data - Bd = Bd + Math.sqrt(atrTree2[aId].cnt/Math.sqrt(classInfo2.cnt*(classInfo1.cnt+classInfo2.cnt)));  
			// Bija obj - Bo = Bo + Math.sqrt(atrTree2[aId].cnt/Math.sqrt(classInfo2.cnt*(classInfo1.cnt+classInfo2.cnt)));  

		}
	}

	let dw = d;
	if ( params.pw > 0 )
		dw = d*Math.pow((Math.log10(classInfo1.cnt)+1)*(Math.log10(classInfo2.cnt)+1),1/params.pw); //dw(A,B) = d(A,B) * sqrt((log(cA)+1)*(log(cB)+1))

	const diff1 =  d/(s+0.1);
	const diff2 =  dw/(s+0.1);

	return {s1_dal:Math.round(diff1*10)/10, s2_dal:Math.round(diff2*10)/10, s1_s:Math.round(s*10)/10, s1_d:Math.round(d*10)/10, s2_dw:Math.round(dw*10)/10}; 
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
	if ( cnt < 10000)
			return cnt;
		else
			return cnt.toPrecision(2).replace("+", "");				
	}
}

// Līdzīgo klašu atrašana // Ekvivalentās klases (level 0) , līdzīgās klases (level = 1), abstraktajām virsklasēm (level = 2), apaksklašu savilkšana (level = 5) 
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
function makeAtrTree(cl_list, key) {   
	let atrTree = {};
	for (const classInfo of cl_list) {
		for (const atr of classInfo[key] ) {
			let prop = `${atr.p_name}_${atr.type}`;
			if ( atrTree[prop] == undefined) {
				atrTree[prop] = { class_list:atr.class_list, cnt:atr.cnt, cnt2:atr.cnt2,  is_domain:atr.is_domain, is_range:atr.is_range, max_cardinality:atr.max_cardinality, 
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
				if ( !(atrTree[prop].is_range == 'R' && atr.is_range == 'R'))
					atrTree[prop].is_range = '';
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
		/* 5555 Šī ir tukšo atribūtu pielikšanas vieta, liekas, ka vairs nevajadzēs
		for (const classInfo of c_list_full) {
			if ( !ekv ) {
				for (const atr of atr_list) {
					if ( classInfo.atr_list.filter(function(a){ return a.p_name == atr.p_name && a.type == atr.type}).length == 0 ) {
						const a2 = {p_name:atr.p_name, type:atr.type, gId:g_id, cnt:0, cnt2:atr.cnt2, class_list:atr.class_list,
							cnt_full:atr.cnt_full, count:0, is_domain:atr.is_domain, is_range:atr.is_range,
							max_cardinality:atr.max_cardinality, object_cnt:atr.object_cnt, p_id:atr.p_id };
						classInfo.atr_list.push(a2);
					}
					else {
						const cAtr = classInfo.atr_list.find(function(a){ return a.p_name == atr.p_name && a.type == atr.type});
						cAtr.cnt2 = atr.cnt2;
					}
				}
			}
			else {
				classInfo.atr_list = atr_list;
			}
		} */
		const cnt = ( sum ) ? i_cnt : list[0].cnt;
		const cnt_sum = ( sum ) ? getWeight(i_cnt, i_in_props) : getWeight(list[0].cnt, list[0].in_props);

		c_list_full = c_list_full.sort((a, b) => { return b.cnt_sum - a.cnt_sum; });
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
		rezFull.classes[g_id] = { id:g_id, super_classes:[], used:true, hasGen:false, type:class_type, group_type:group_type,  
			displayName:displayName, fullName:fullName, fullNameD:fullNameD, isGroup:true, c_list:c_list_full.map(c => c.id), c_list_id:c_list_full.map(c => c.id_id),
			sub_classes_group_string:c_list_full.map(c => c.fullNameD).sort().join('\n'),
			sub_classes_list:c_list_full.map(c => c.fullNameD).sort(), sub_classes:[],				
			sup:[], sub:[], atr_list:atr_list, atr_list_full:atr_list_full, all_atr:[], cnt:cnt, cnt_sum:cnt_sum, in_props:i_in_props }; 

		rezFull.classes[g_id].sub_classes_list =  _.map(c_list_full, function(c) {
			return {cnt:c.cnt, name:c.fullNameD};
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
		const gr_id = makeClassGroup(c_list_full, 'Class and subClasses');
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
			if (  basic && cInfo.sub_classes.length > 0 ) pref = 'A';
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
	clearData();
	//state = 1;
	const classesAndProperties = await getClassesAndProperties();
	rezFull.namespaces = classesAndProperties[2];
	const c_list = classesAndProperties[0];
	const p_list = classesAndProperties[1];
	params = getParams();
	let rr;
	const addIds = params.addIds;
	const compView = params.compView; // Atribūtu parametrs
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
	
	rr = await dataShapes.callServerFunction("xx_getCCInfo", allParams); 
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
	
	rr = await dataShapes.callServerFunction("xx_getCPCInfo", allParams); 
	cpc_info = rr.data;
	if ( cpc_info.length > 0 ) { 
		has_cpc = true;
		for (const cpc of cpc_info) {
			cpc.cnt = Number(cpc.cnt);
		}
	}	

	allParams.main.p_list =  p_list.map(v => v.id);
	rr = await dataShapes.callServerFunction("xx_getCPInfo", allParams); 
	cp_info = rr.data;
	
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
		if (cp_info_p_o.length == 0 )
			c_to = [];

		if ( p.max_cardinality == -1 ) 
			p.max_cardinality = '*';
		p_list_full[p_id] = {id:p.id, p_name:p_name, c_from:c_from, c_to:c_to, iri:p.iri, c_from_full:c_from_full, c_to_full:c_to_full,  
			cnt:Number(p.cnt), object_cnt:Number(p.object_cnt), count:0, max_cardinality:p.max_cardinality};
		
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
				const p_info = {p_name:pp.p_name, p_id:pp.id, type:'data', cnt:Number(cl.cnt), cnt2:Number(cl.cnt), object_cnt:Number(cl.object_cnt), 
					is_domain:pp.is_domain, is_range:'', max_cardinality:pp.max_cardinality, class_list:[], cnt_full:Number(pp.cnt)};
				rezFull.classes[cl_id].atr_list.push(p_info);
				rezFull.classes[cl_id].used = true;
				if ( !rezFull.classes[cl_id].all_atr.includes(pp.id)) rezFull.classes[cl_id].all_atr.push(pp.id);	
			}
		}
		else if ( c_from.length > 0  && c_to.length > 0) {
			for (const c_1 of c_from) {
				const from_id = `c_${c_1.class_id}`;
				if ( c_1.object_cnt > 0 ) { 
					let cl_list = c_to.map( c => c.class_id);
					const cpc_i = cpc_info.filter(function(i){ return i.cp_rel_id == c_1.id }); 
					if ( !compView && has_cpc && cpc_i.length > 0 )
						cl_list = cpc_i.map( c => c.other_class_id);
					const p_info = {p_name:pp.p_name, p_id:pp.id, type:'out', cnt:Number(c_1.cnt), cnt2:Number(c_1.cnt), object_cnt:Number(c_1.object_cnt), 
						is_domain:pp.is_domain, is_range:pp.is_range, max_cardinality:pp.max_cardinality, class_list:cl_list.sort(), cnt_full:Number(pp.cnt)};
					rezFull.classes[from_id].atr_list.push(p_info);
				}
				else {
					const p_info = {p_name:pp.p_name, p_id:pp.id, type:'data', cnt:Number(c_1.cnt), cnt2:Number(c_1.cnt), object_cnt:Number(c_1.object_cnt), 
						is_domain:pp.is_domain, is_range:'', max_cardinality:pp.max_cardinality, class_list:[], cnt_full:Number(pp.cnt)};
					rezFull.classes[from_id].atr_list.push(p_info);
				}
				rezFull.classes[from_id].used = true;
				if ( !rezFull.classes[from_id].all_atr.includes(pp.id)) rezFull.classes[from_id].all_atr.push(pp.id);						
			}	
			for (const c_2 of c_to) {
				const to_id = `c_${c_2.class_id}`;
				let cl_list = c_from.map( c => c.class_id);
				const cpc_i = cpc_info.filter(function(i){ return i.cp_rel_id == c_2.id }); 
				if ( !compView && has_cpc && cpc_i.length > 0 )
					cl_list = cpc_i.map( c => c.other_class_id);
				const p_info = {p_name:pp.p_name, p_id:pp.id, type:'in', cnt:Number(c_2.cnt), cnt2:Number(c_2.cnt), object_cnt:Number(c_2.object_cnt), 
					is_domain:pp.is_domain, is_range:pp.is_range, class_list:cl_list.sort(), cnt_full:Number(pp.cnt)};
				rezFull.classes[to_id].atr_list.push(p_info);
				rezFull.classes[to_id].used = true;
				if ( !rezFull.classes[to_id].all_atr_in.includes(pp.id)) rezFull.classes[to_id].all_atr_in.push(pp.id);
			}
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
		const c_to = pp.c_to;
		addProperty(pp, c_from, c_to);
		if ( !unused_props.includes(pp.iri) )
			addPropertyFull(pp, pp.c_from_full, pp.c_to_full);
	}
			
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
		
		const cp_info_p = cp_info.filter(function(cp){ return cp.class_id == cl_info.id && cp.type_id == 2 && cp.cover_set_index > 0;}).map(cp => cp.property_id); 
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
	console.log('p_list_full', p_list_full);
	//console.log('rezFull', rezFull);
}

// *** Izveido klašu grupas, skatoties uz parametiem
async function calculateGroups() {
	// Tiek padots zīmējamo klašu un propertiju saraksts
	const diffG = params.diffG;
	console.log('**************calculateGroups*****************', params)
	const compChain = ( params.supPar == 1 ) ? true : false; // Vai apvienot vispārināšanas virknes
	//const compTree = ( params.supPar == 2 ) ? true : false; // Vai apvienot sākotnējos klašu kokus (vairs nebūs) 
	// Sākotnējo klašu koku apvienošana
	/* Šo vairs nedarīsim (vismaz pagaidām)
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
			makeClassGroup(class_list, {class_type:'Class',group_type:'Class and Tree of subClases'}, false); 
		}
	} */

	// Virsklašu virkņu apvienošana - compTree un compChain ir savstarpēji izslēdzoši
	/*
	if ( params.withoutGen ) {
		let class_list = [];
		for (const clId of Object.keys(rezFull.classes)) {
			class_list.push(rezFull.classes[clId]);
		}
		const similar_classes = findSimilarClasses(1, class_list);
		console.log('Draudzīgās klases', similar_classes)
		makeClassGroupFromTree(similar_classes, 'Similar classes');
		return;
	} */
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

		/* Pārtaisīju savādāk, saliek vispārināšanas jaunās vietās
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
		} */
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
			type:'Abstract', super_classes:[], c_list:[], c_list_id:[]};
		
		let g_list = [];
		let c_list_full = [];
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
				}
			}
			else {
				rezFull.classes[sc_id].c_list_id.push(classInfo.id_id);
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

		if ( g_list.length > 1 ) {
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
	const hideSmall = params.hideSmall;

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
				if ( atr.type == 'out' && atr.cnt > 0 && atr.cnt_full > hideSmall ) {
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
						const p_name = ( params.addIds ) ? `${atr.p_name}(ID-${atr.p_id})`: atr.p_name;
						if ( !has_cpc) {
							rezFull.assoc[aId] = {string:`${p_name}  ${atr.is_domain}${atr.is_range}`, cnt:0, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:clId, to:to_id, removed:false };
						}
						else {
							const cpc_info_a = cpc_info.filter(function(i){ 
								return i.property_id == atr.p_id && i.type_id == 2 && classInfo.c_list_id.includes(i.class_id) && rezFull.classes[to_id].c_list_id.includes(i.other_class_id)}); 
							const aCnt = cpc_info_a.map( v => v.cnt).reduce((a, b) => a + b, 0);
							if ( aCnt > 0 )
								rezFull.assoc[aId] = {string:`${p_name} (${roundCount(aCnt)}) ${atr.is_domain}${atr.is_range}`,cnt:aCnt, p_name:atr.p_name, p_id:`p_${atr.p_id}`, from:clId, to:to_id, removed:false };
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
				rez = `${p_name} ${cntString} ${atr_info.is_range}${atr_info.is_domain} <- ${classNames}`;
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
	function getAtrList(atrList) {
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

			classInfo.atr_string = restAtrList.filter(function(a){ return a.cnt > 0 }).map(a => getAtrString(a)).sort().join('\n');
			classInfo.attributesT.out = getAtrList(restAtrList);
			if ( inPropList.length > 0 ) {
				classInfo.atr_string = `${classInfo.atr_string}\n${inPropList.filter(function(a){ return a.cnt > 0 }).map(a => `<- ${getAtrString(a)}`).sort().join('\n')}`;
				classInfo.attributesT.in = getAtrList(inPropList);
			}
			if ( classInfo.attributesT.c.length > 0 )
				classInfo.atr_string = `${classInfo.atr_string}\n${classInfo.attributesT.c.filter(function(a){ return a.cnt > 0 }).map(a => `<> ${a.name}`).sort().join('\n')}`;
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
				assoc[aID].names.push({name:aInfo.string, cnt:aInfo.cnt});
			}
			else {
				assoc[aID] = {from:aInfo.from, to:aInfo.to, removed:false, string:aInfo.string, 
				names:[{name:aInfo.string, cnt:aInfo.cnt}]};
			}
		}	
	}
	for (const aa of Object.keys(assoc)) {
		const aInfo = assoc[aa];
		aInfo.names = aInfo.names.sort((a, b) => { return b.cnt - a.cnt; });
	}
	
	rezFull.assoc = assoc;
}


// **********************************************************************************************************
