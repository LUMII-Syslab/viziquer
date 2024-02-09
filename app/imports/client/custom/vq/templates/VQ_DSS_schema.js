import { Interpreter } from '/imports/client/lib/interpreter'

import { dataShapes } from '/imports/client/custom/vq/js/DataShapes.js'

import './VQ_DSS_schema.html'

Template.VQ_DSS_schema.SchemaName = new ReactiveVar("");
Template.VQ_DSS_schema.Classes = new ReactiveVar([]);
Template.VQ_DSS_schema.RestClasses = new ReactiveVar([]);
Template.VQ_DSS_schema.Properties = new ReactiveVar([]);
Template.VQ_DSS_schema.isBig =  new ReactiveVar(true);
Template.VQ_DSS_schema.isLocal =  new ReactiveVar(false);
Template.VQ_DSS_schema.ClassCountAll = new ReactiveVar("");
Template.VQ_DSS_schema.ClassCountSelected = new ReactiveVar("");
Template.VQ_DSS_schema.ClassCountFiltered = new ReactiveVar("");
Template.VQ_DSS_schema.ClassCountRest = new ReactiveVar("");
Template.VQ_DSS_schema.ManualDisabled = new ReactiveVar("disabled");
Template.VQ_DSS_schema.FilterDisabled = new ReactiveVar("");
Template.VQ_DSS_schema.NsFilters = new ReactiveVar("");
Template.VQ_DSS_schema.ClassCount = new ReactiveVar("");
Template.VQ_DSS_schema.IndCount = new ReactiveVar("");
Template.VQ_DSS_schema.SuperclassType = new ReactiveVar("");


Interpreter.customMethods({
	
	VQ_DSS_schema: function(e){
		Template.VQ_DSS_schema.SchemaName.set(dataShapes.schema.schemaName);
		Template.VQ_DSS_schema.ClassCountAll.set(dataShapes.schema.classCount);
		// TODO cik lielas shēmas vispār piedāvāju vizualizēt
		if ( dataShapes.schema.classCount < dataShapes.schema.diagram.maxCount) {
			Template.VQ_DSS_schema.isBig.set(false);
			setClassList0();
		}
		else
			Template.VQ_DSS_schema.isBig.set(true);
		
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
	indCount: function() {
		return Template.VQ_DSS_schema.IndCount.get();
	},
	superclassType: function() {
		return Template.VQ_DSS_schema.SuperclassType.get();
	},
	properties: function() {
		return Template.VQ_DSS_schema.Properties.get();
	},
	
	
});


Template.VQ_DSS_schema.events({
	'click #makeDiagr': async function() {
		let classList = Template.VQ_DSS_schema.Classes.get();
		let all_s = [];
		_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
		
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( all_s.includes(cl.id)) cl.selected = 1;
		});
		classList = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});

		classList = classList.map(v => v.id);
		let propList = Template.VQ_DSS_schema.Properties.get();
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
		let info = [ `${Template.VQ_DSS_schema.ClassCountSelected.get()} classes in the diagram`,
			Template.VQ_DSS_schema.NsFilters.get().find(function(f){ return f.value == $("#nsFilter").val();}).name,
			Template.VQ_DSS_schema.IndCount.get().find(function(f){ return f.value == $("#indCount").val();}).name ];
		if ( $("#superclassType").val() != 0) {
			info.push(`Superclasses based on ${Template.VQ_DSS_schema.SuperclassType.get().find(function(f){ return f.value == $("#superclassType").val();}).name}`);
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
		let classList = Template.VQ_DSS_schema.Classes.get();
		let all_s = [];
		_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
		
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( all_s.includes(cl.id)) cl.selected = 1;
		});
		classList = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});

		classList = classList.map(v => v.id);
		let propList = Template.VQ_DSS_schema.Properties.get();
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
		let info = [ `${$("#classCount").val()} classes in the diagram`,
			Template.VQ_DSS_schema.NsFilters.get().find(function(f){ return f.value == $("#nsFilter").val();}).name,
			Template.VQ_DSS_schema.IndCount.get().find(function(f){ return f.value == $("#indCount").val();}).name ];
		
		if ( $("#remS").is(":checked") )
			info.push('Small properties are removed');
		
		const par = {addIds:$("#addIds").is(":checked"), disconnBig:$("#disconnBig").val(), compView:$("#compView").is(":checked"),
					diffG:$("#diffG").val(), diffS:$("#diffS").val(), schema:dataShapes.schema.schema};
		await dataShapes.makeSuperDiagr(classList, propList, par, info.join('\n'));
		//await dataShapes.makeSuperDiagr(classList, propList, remSmall, dataShapes.schema.schema, info.join('\n'));

	},
	'click #calck': async function() {
		//TODO šis vēlāk vairs nebūs
		let classList = Template.VQ_DSS_schema.Classes.get();
		let all_s = [];
		_.each(classList, function(cl) { all_s = [...new Set([...all_s, ...cl.s])]; });	
		
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( all_s.includes(cl.id)) cl.selected = 1;
		});
		classList = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});

		classList = classList.map(v => v.id);
		let propList = Template.VQ_DSS_schema.Properties.get();
		const remSmall = ($("#remS").is(":checked")) ? 10 : 0;
		if ( propList.length == 0 ) {
			const allParams = {main: { c_list: `${classList}`, remSmall:remSmall }};
			const rr = await dataShapes.callServerFunction("xx_getPropList", allParams);	
			propList = rr.data;
		}
		
		const par = {addIds:$("#addIds").is(":checked"), disconnBig:$("#disconnBig").val(), compView:$("#compView").is(":checked"),
					diffG:$("#diffG").val(), diffS:$("#diffS").val(), schema:dataShapes.schema.schema};
		await dataShapes.makeSuperDiagr(classList, propList, par, '', true);
	},
	'click #getProperties': async function() {
		let classList = Template.VQ_DSS_schema.Classes.get();
		classList = classList.map(v => v.id);
		const remSmall = ($("#remS").is(":checked")) ? 10 : 0;
		const rr = await dataShapes.callServerFunction("xx_getPropList", {main: { c_list: `${classList}`, remSmall:remSmall}});
		Template.VQ_DSS_schema.Properties.set(rr.data);
	},
	'change #classCount': function() {
		setClassList();
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
			Template.VQ_DSS_schema.ManualDisabled.set("");
			Template.VQ_DSS_schema.FilterDisabled.set("disabled");
			const classList = Template.VQ_DSS_schema.Classes.get().map(v => v.id);
			_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
				if ( classList.includes(cl.id))
					cl.selected = 1;
			});
		}
		else {
			Template.VQ_DSS_schema.ManualDisabled.set("disabled");
			Template.VQ_DSS_schema.FilterDisabled.set("");
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
	'click #addWithN': function() {
		if ($("#restClasses").val() != undefined) {
			const selected = $("#restClasses").val().map(v => Number(v));
			if ( selected.length > 0 ) {
				const list = dataShapes.schema.diagram.filteredClassList.find(function(cl) { return cl.id == selected[0]; }).c;
				_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
					if ( list.includes(cl.id) || cl.id == selected[0] )
						cl.selected = 1; 
				});
				makeClassLists();			
			}
		}
	},
	'click #removeProperties': function() {
		if ($("#selectedProperties").val() != undefined) {
			const selected = $("#selectedProperties").val().map(v => Number(v));
			let propList = Template.VQ_DSS_schema.Properties.get();
			propList = propList.filter(function(p){ return !selected.includes(p.id); })
			Template.VQ_DSS_schema.Properties.set(propList);
		}
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
	},
});

function setClassListInfo(classes, restClasses) {
	Template.VQ_DSS_schema.Classes.set(classes);
	Template.VQ_DSS_schema.ClassCountSelected.set(classes.length);	
	Template.VQ_DSS_schema.RestClasses.set(restClasses);	
	Template.VQ_DSS_schema.ClassCountRest.set(restClasses.length);
}

function setClassList0() {
	Template.VQ_DSS_schema.ManualDisabled.set("disabled");
	Template.VQ_DSS_schema.FilterDisabled.set("");
	Template.VQ_DSS_schema.Properties.set([]);
	const nsFilters = [{value:'All' ,name:'Classes in all namespaces'},{value:'Local' ,name:'Only local classes'},{value:'Exclude' ,name:'Exclude owl:, rdf:, rdfs:'}];
	const classCount = [{value:15 ,name:'15 classes in the diagram'}, {value:30 ,name:'30 classes in the diagram'}, {value:40 ,name:'40 classes in the diagram'}, {value:50 ,name:'50 classes in the diagram'}, {value:100 ,name:'100 classes in the diagram'}, {value:300 ,name:'300 classes in the diagram'}];
	const indCount = [{value:1 ,name:'Classes of all sizes'}, {value:10 ,name:'At least 10 individuals'}, {value:50 ,name:'At least 50 individuals'}, {value:100 ,name:'At least 100 individuals'}];
	const superclassType = [{value:1 ,name:'targets'}, {value:2 ,name:'sources and targets'}, {value:0 ,name:'Without superclasses'},];
	const schema = dataShapes.schema.schema;
	let nsFiltersSel = '';
	let classCountSel = 30;
	let indCountSel = 1;
	let superclassTypeSel = 1;
	
	let filteredClassList = dataShapes.schema.diagram.classList;	
	filteredClassList = filteredClassList.filter(function(c){ return c.is_local == 1;});
	
	// TODO  Šis ir manai ērtībai, vai nu jāmet ārā, vai jāliek konfigurācijā
	if ( schema == 'iswc2017') {
		classCountSel = 40;
		nsFiltersSel = 'Exclude';
		superclassTypeSel = 0;
	}
	else if ( schema == 'mondial' ) {
		nsFiltersSel = 'Local';
		superclassTypeSel = 2;
	}
	else if ( schema == 'europeana' ) {
		nsFiltersSel = 'Exclude';
		superclassTypeSel = 1;
	}
	else if ( schema == 'nobel_prizes_v0' || schema == 'nobel_prizes_x' || schema == 'nobel_prizes_y' || schema == 'nobel_prizes') {
		nsFiltersSel = 'Exclude';
		superclassTypeSel = 1;
		indCountSel = 10;
	}
	else if ( schema == 'academy_sampo_x' || schema == 'academy_sampo' ) {
		classCountSel = 300;
		nsFiltersSel = 'Exclude';
		superclassTypeSel = 2;
	}
	else if ( schema == 'war_sampo_2' || schema == 'war_sampo_2' ) {
		classCountSel = 50;
		nsFiltersSel = 'Local';
		superclassTypeSel = 2;
	}
	else {
		if ( filteredClassList.length > 0 ) 
			nsFiltersSel = 'Local';
		else 
			nsFiltersSel = 'Exclude';
	}
	
	if ( nsFiltersSel == 'Exclude' ) 
		filteredClassList = dataShapes.schema.diagram.classList.filter(function(c){ const not_in = ['owl','rdf','rdfs']; return !not_in.includes(c.prefix);});
	
	if ( indCountSel > 1 )
		filteredClassList = filteredClassList.filter(function(c){ return c.cnt >= indCountSel;});
		
	dataShapes.schema.diagram.filteredClassList = filteredClassList;
	Template.VQ_DSS_schema.ClassCountFiltered.set(filteredClassList.length);
		
	nsFilters.find(function(f){ return f.value == nsFiltersSel;}).selected = "selected";
	classCount.find(function(f){ return f.value == classCountSel;}).selected = "selected";
	indCount.find(function(f){ return f.value == indCountSel;}).selected = "selected";
	superclassType.find(function(f){ return f.value == superclassTypeSel;}).selected = "selected";
	
	Template.VQ_DSS_schema.NsFilters.set(nsFilters);
	Template.VQ_DSS_schema.ClassCount.set(classCount);
	Template.VQ_DSS_schema.IndCount.set(indCount);
	Template.VQ_DSS_schema.SuperclassType.set(superclassType);

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
	else
		classList = classList.sort(function(a,b){ return a.order-b.order;});
	
	dataShapes.schema.diagram.classList = classList;
	
	if (Template.VQ_DSS_schema.ManualDisabled.get() == "") {
		let classes = Template.VQ_DSS_schema.Classes.get();
		let restClasses = Template.VQ_DSS_schema.RestClasses.get();
		if  ( sortP == 1) { 
			classes = classes.sort(function(a,b){ return b.cnt-a.cnt;});
			restClasses = restClasses.sort(function(a,b){ return b.cnt-a.cnt;});
		}	
		else {
			classes = classes.sort(function(a,b){ return a.order-b.order;});
			restClasses = restClasses.sort(function(a,b){ return a.order-b.order;});
		}
		setClassListInfo(classes, restClasses);
	}
	else
		setClassList();
}

function setClassList() {
	if (Template.VQ_DSS_schema.ManualDisabled.get() == "disabled") {
		let filteredClassList = dataShapes.schema.diagram.classList;
		const nsFilter = $("#nsFilter").val();
		const classCount = $("#classCount").val();
		const indCount = $("#indCount").val();

		if ( nsFilter == 'Exclude')
			filteredClassList = filteredClassList.filter(function(c){ const not_in = ['owl','rdf','rdfs']; return !not_in.includes(c.prefix);});
		if ( nsFilter == 'Local')
			filteredClassList = filteredClassList.filter(function(c){ return c.is_local == 1;});
		
		if ( indCount > 1 )
			filteredClassList = filteredClassList.filter(function(c){ return c.cnt >= indCount;});
			
		Template.VQ_DSS_schema.ClassCountFiltered.set(filteredClassList.length);	
		
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