import { Interpreter } from '/client/lib/interpreter'
import { Projects } from '/libs/platform/collections'

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


const delay = ms => new Promise(res => setTimeout(res, ms));
//Template.schemaTree.Count = new ReactiveVar("");
//Template.schemaTree.TopClass = new ReactiveVar("");
//Template.schemaTree.ClassPath = new ReactiveVar("");
//Template.schemaFilter.Count = new ReactiveVar("");
//const startCount = 30;
//const plusCount = 20;
const delayTime = 1000;
var schemaTreeKeyDownTimeStamp;
var schemaFilterKeyDownTimeStamp;
var schemaInstancesKeyDownTimeStamp;

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
	if ( dataShapes.schema.showPrefixes === "false" && o.is_local) 
		return `${o.display_name} (${o[col]})`;
	else 
		return `${o.prefix}:${o.display_name} (${o[col]})`;

}

function getName(o) {
	if ( dataShapes.schema.showPrefixes === "false" && o.is_local) 
		return `${o.display_name}`;
	else 
		return `${o.prefix}:${o.display_name}`;

}

function getNS() {
	var namespaces = {};
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
	//var params = {treeMode: 'Top', limit: Template.schemaTree.Count.get()};
	var params = {treeMode: 'Top', limit: dataShapes.schema.tree.countC};
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

	var namespaces = getNS();
	
	if (namespaces.in != undefined || namespaces.notIn != undefined)
		params.namespaces = namespaces;
		
	/*if ( dataShapes.schema.tree.dbo || dataShapes.schema.tree.yago || dataShapes.schema.tree.local ) {
		var namespaces = {};
		if (dataShapes.schema.tree.dbo)
			namespaces.in = ['dbo'];
		if (dataShapes.schema.tree.yago)
			namespaces.notIn = ['yago'];
		if (dataShapes.schema.tree.local)
			namespaces.in = [dataShapes.schema.localNS];
		params.namespaces = namespaces;
	} */
	
	
	var clFull = await dataShapes.getTreeClasses({main:params});
	var classes = _.map(clFull.data, function(cl) {return {ch_count: Number(cl.has_subclasses), node_id: cl.id, children: [], data_id: getName(cl), localName: getNameF(cl)}});
	if ( clFull.complete === false)
		classes.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
	Template.schemaTree.Classes.set(classes);
	dataShapes.schema.tree.topClass = 0;
}

async function setTreeSubClasses (cc, nsPlus, filter = '') {
	dataShapes.schema.tree.topClass = cc[0].node_id;
	//var params = {limit: Template.schemaTree.Count.get(), treeMode: 'Sub'}; 
	var params = {limit: dataShapes.schema.tree.countC, treeMode: 'Sub'}; 
	
	var tree = [{ ch_count: 1, children: [], data_id: ".", localName: "Tree top", node_id: 0 }];
	
	if ( filter !== '')
		params.filter = filter;

	var namespaces = getNS();
	if ( nsPlus && (namespaces.in != undefined || namespaces.notIn != undefined)) 
		params.namespaces = namespaces;
	/*if ( nsPlus) {
		if ($("#dbo").is(":checked") || $("#yago").is(":checked")) {
			var namespaces = {};
			if ($("#dbo").is(":checked"))
				namespaces.in = ['dbo'];
			if ($("#yago").is(":checked"))
				namespaces.notIn = ['yago'];
			params.namespaces = namespaces;
		}	
	} */
	params.classId =  dataShapes.schema.tree.topClass;
	//var clSub = await dataShapes.getTreeClasses({main:params, element:{classId: dataShapes.schema.tree.topClass}});
	var clSub = await dataShapes.getTreeClasses({main:params});
	var classes = _.map(clSub.data, function(cl) {return {ch_count: Number(cl.has_subclasses), node_id: cl.id, children: [], data_id: getName(cl), localName: getNameF(cl)}});
	if ( clSub.complete === false )
		classes.push({ch_count: 0, children: [], data_id: "..", localName: "More ..."});

	cc[0].children = classes;
	tree.push(cc[0]);
	Template.schemaTree.Classes.set(tree); 
}

async function  useFilter (plus = 0) {
	//var text = $('#filter_text').val().toLowerCase();
	var text = Template.schemaTree.F1.get();
	dataShapes.schema.tree.filterC = text;
	// ** setNS();
	var treeTop = Template.schemaTree.Classes.get(); 
	if ( dataShapes.schema.tree.topClass != 0 ) 
		if (treeTop.length == 1 )
			await setTreeSubClasses ([treeTop[0]], true, text.toLowerCase()); 
		else 
			await setTreeSubClasses ([treeTop[1]], true, text.toLowerCase()); 
	else 
		await setTreeTop(text.toLowerCase(), plus);
}

async function  useFilterP (plus = 0) {
	//var text = $('#filter_text2').val().toLowerCase();
	var text = Template.schemaFilter.F2.get();
	dataShapes.schema.tree.filterP = text;
	var params = {propertyKind:'All', limit: dataShapes.schema.tree.countP, filter:text.toLowerCase()};
	var col = 'cnt_x';
	
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
		
	var pFull = await dataShapes.getTreeProperties(params);  
	var properties = _.map(pFull.data, function(p) {return {ch_count: 0, children: [], data_id: getName(p), localName: getNameF(p, col)}});
	if ( pFull.complete === false)
		properties.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
		
	Template.schemaFilter.Properties.set(properties);
}

async function  useFilterI (plus = 0) {
	if (Template.schemaInstances.showI.get()) {
		var text = Template.schemaInstances.F3.get();
		var instances;
		var iFull;
		if ( text.indexOf(':') > -1 ) {
			text = text.substring(text.indexOf(':')+1, text.length);
			Template.schemaInstances.F3.set(text);
		}
		//dataShapes.schema.tree.filterI = text;
		var params = { limit: dataShapes.schema.tree.countI, filter:text};
		var className = Template.schemaInstances.Class.get();
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
	var nsFilters = [{value:'All' ,name:'Classes in all namespaces'},{value:'Local' ,name:'Only local classes'},{value:'Exclude' ,name:'Exclude owl:, rdf:, rdfs:'}]
	var filteredClassList = dataShapes.schema.diagram.classList;	
	filteredClassList = filteredClassList.filter(function(c){ return c.is_local == 1;});
	
	if ( filteredClassList.length > 0 ) {
		nsFilters.find(function(f){ return f.value == 'Local';}).selected = "selected";
	}
	else {
		filteredClassList = dataShapes.schema.diagram.classList.filter(function(c){ const not_in = ['owl','rdf','rdfs']; return !not_in.includes(c.prefix);});
		nsFilters.find(function(f){ return f.value == 'Exclude';}).selected = "selected";		
	}
	
	Template.schemaExtra.NsFilters.set(nsFilters);

	dataShapes.schema.diagram.filteredClassList = filteredClassList;
	Template.schemaExtra.ClassCountFiltered.set(filteredClassList.length);	
	var classes = [];
	var restClasses = [];
	
	if ( filteredClassList.length > 30 ) {
		classes = filteredClassList.slice(0, 30);
		restClasses = filteredClassList.slice(30, filteredClassList.length+1);
	}
	else {
		classes = filteredClassList;
	}
	setClassListInfo(classes, restClasses);
}

function sortClassList() {

	var classList = dataShapes.schema.diagram.classList;
	const sortP = $("#sortPar").val();
	if  ( sortP == 1) 
		classList = classList.sort(function(a,b){ return b.cnt-a.cnt;});
	else
		classList = classList.sort(function(a,b){ return a.order-b.order;});
	
	dataShapes.schema.diagram.classList = classList;
	
	if (Template.schemaExtra.ManualDisabled.get() == "") {
		var classes = Template.schemaExtra.Classes.get();
		var restClasses = Template.schemaExtra.RestClasses.get();
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

	if (Template.schemaExtra.ManualDisabled.get() == "disabled") {
		var filteredClassList = dataShapes.schema.diagram.classList;
		const nsFilter = $("#nsFilter").val();
		const classCount = $("#classCount").val();
		const indCount = $("#indCount").val();

		if ( nsFilter == 'Exclude')
			filteredClassList = filteredClassList.filter(function(c){ const not_in = ['owl','rdf','rdfs']; return !not_in.includes(c.prefix);});
		if ( nsFilter == 'Local')
			filteredClassList = filteredClassList.filter(function(c){ return c.is_local == 1;});
		
		if ( indCount > 1 )
			filteredClassList = filteredClassList.filter(function(c){ return c.cnt >= indCount;});
			
		Template.schemaExtra.ClassCountFiltered.set(filteredClassList.length);	
		
		var classes = [];
		var restClasses = [];
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

	var classes = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 1});
	var restClasses = dataShapes.schema.diagram.filteredClassList.filter(function(c){ return c.selected == 0});
	setClassListInfo(classes, restClasses);
	sortClassList() 
}

Template.schemaTree.events({
	"click .toggle-tree-button": async function(e) {
		var toggle_button = $(e.target);
		var tree_node_id = toggle_button[0].attributes["node-id"].value;
		var topClass = dataShapes.schema.tree.topClass;
		//Template.schemaTree.Count.set(startCount);
		Template.schemaTree.F1.set('');
		dataShapes.schema.tree.filterC = '';

		if ( tree_node_id == 0 ) {
			await setTreeTop();
			return;
		}

		if ( topClass == tree_node_id) {
			var classPath = dataShapes.schema.tree.classPath;
			classPath.pop();
			if ( classPath.length === 0) {
				await setTreeTop();
			}
			else {
				var cc = classPath[classPath.length-1];
				await setTreeSubClasses ([cc], false);
			}
		}
		else {

			var treeTop = Template.schemaTree.Classes.get();
			var cc;
			
			if ( dataShapes.schema.tree.topClass === 0)
				cc = _.filter(treeTop, function(c){ return  c.node_id == tree_node_id });
			else
				cc = _.filter(treeTop[1].children, function(c){ return  c.node_id == tree_node_id });
			
			if ( cc[0].ch_count > 0) {
				var classPath = dataShapes.schema.tree.classPath;
				classPath.push(cc[0]);
				dataShapes.schema.tree.classPath = classPath;
				await setTreeSubClasses (cc, false);
			}
		}
	},
	'click .class-body': async function(e) {
		// console.log(e)
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
		var index = $(e.target).closest(".form-check-input").attr("index");
		dataShapes.schema.tree.ns[index].checked = $(e.target).is(":checked");
		Template.schemaTree.F1.set($('#filter_text').val());
		await useFilter ();
	},
	"dblclick .class-body": async function(e) {
		var class_name = $(e.target).closest(".class-body").attr("value");

		if ( class_name !== "" && class_name !== "..." && class_name !== ".." && class_name !== "." && class_name !== "wait")
		{
			const BLACK_HEADER_HEIGHT = 45;
			const DEFAULT_BOX_WIDTH = 194;
			const DEFAULT_BOX_HEIGHT = 66;
			const DEFAULT_OFFSET = 10;
			// get location of the editor
			var ajoo_scene_attrs = Interpreter.editor.stage.attrs;
			var attrs = {scroll_h: ajoo_scene_attrs.container.scrollTop,
			scroll_w: ajoo_scene_attrs.container.scrollLeft,
			visible_h: ajoo_scene_attrs.container.clientHeight,
			visible_w: ajoo_scene_attrs.container.clientWidth,
			total_h: ajoo_scene_attrs.height,
			y_relative_top: ajoo_scene_attrs.container.getBoundingClientRect().top,
			y_relative_bottom: ajoo_scene_attrs.container.getBoundingClientRect().bottom,
			};

			//// Place in bottom right corner of visible area
			var loc = {x: attrs.visible_w + attrs.scroll_w - DEFAULT_OFFSET- DEFAULT_BOX_WIDTH,
								 y: attrs.scroll_h + attrs.visible_h-DEFAULT_OFFSET-DEFAULT_BOX_HEIGHT,
								 width: DEFAULT_BOX_WIDTH,
								 height: DEFAULT_BOX_HEIGHT};

			Create_VQ_Element(function(boo) {
					var proj = Projects.findOne({_id: Session.get("activeProject")});
					boo.setNameAndIndirectClassMembership(class_name,proj && proj.indirectClassMembershipRole);
				}, loc);
			
		}
		if ( class_name === "...") {
			//var count = Template.schemaTree.Count.get();
			var count = dataShapes.schema.tree.countC;
			count = count + dataShapes.schema.tree.plus;
			//Template.schemaTree.Count.set(count);
			dataShapes.schema.tree.countC = count;
			await useFilter(1);
		}	
		if ( class_name === "..") {
			//var count = Template.schemaTree.Count.get();
			var count = dataShapes.schema.tree.countC;
			count = count + dataShapes.schema.tree.plus;
			//Template.schemaTree.Count.set(count);
			dataShapes.schema.tree.countC = count;
			await useFilter(1);
		}		
	},
	'click #filter': async function(e) {
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
	'click #reload': async function(e){
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
	var proj = Projects.findOne(Session.get("activeProject"));
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
		var prop_name = $(e.target).closest(".class-body").attr("value");
		if ( prop_name === "...") {
			var count = dataShapes.schema.tree.countP;
			count = count + dataShapes.schema.tree.plus;
			dataShapes.schema.tree.countP = count;
			await useFilterP(1);
		}
		else if ( prop_name !== "wait") {
			const BLACK_HEADER_HEIGHT = 45;
			const DEFAULT_BOX_WIDTH = 194;
			const DEFAULT_BOX_HEIGHT = 66;
			const DEFAULT_OFFSET = 10;	
			
			// get location of the editor
			var ajoo_scene_attrs = Interpreter.editor.stage.attrs;
			var attrs = {scroll_h: ajoo_scene_attrs.container.scrollTop,
			scroll_w: ajoo_scene_attrs.container.scrollLeft,
			visible_h: ajoo_scene_attrs.container.clientHeight,
			visible_w: ajoo_scene_attrs.container.clientWidth,
			total_h: ajoo_scene_attrs.height,
			y_relative_top: ajoo_scene_attrs.container.getBoundingClientRect().top,
			y_relative_bottom: ajoo_scene_attrs.container.getBoundingClientRect().bottom,
			};
			
			var loc = {x: attrs.visible_w + attrs.scroll_w - DEFAULT_OFFSET- DEFAULT_BOX_WIDTH,
					 y: attrs.scroll_h + attrs.visible_h-DEFAULT_OFFSET-DEFAULT_BOX_HEIGHT,
					 width: DEFAULT_BOX_WIDTH,
					 height: DEFAULT_BOX_HEIGHT};
			
			var pKind = "";
			var prop_info = await dataShapes.resolvePropertyByName({name: prop_name});
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
			
			var domainName  = "";
			var rangeName = "";
			if ( prop_info.domain_class_id !== null)
				domainName = getName({display_name: prop_info.dc_display_name, prefix: prop_info.dc_prefix, is_local: prop_info.dc_is_local });
			if ( prop_info.range_class_id !== null)
				rangeName = getName({display_name: prop_info.rc_display_name, prefix: prop_info.rc_prefix, is_local: prop_info.rc_is_local });
			
			if ( pKind == 'Object') {

				var loc2 = {x: attrs.visible_w + attrs.scroll_w - DEFAULT_OFFSET- DEFAULT_BOX_WIDTH,
									 y: attrs.scroll_h + attrs.visible_h - DEFAULT_OFFSET - 3*DEFAULT_BOX_HEIGHT,
									 width: DEFAULT_BOX_WIDTH,
									 height: DEFAULT_BOX_HEIGHT};

				Create_VQ_Element(function(boo) {
					var proj = Projects.findOne({_id: Session.get("activeProject")});
					boo.setNameAndIndirectClassMembership(domainName,proj && proj.indirectClassMembershipRole);
					
					Create_VQ_Element(function(cl){
						var proj = Projects.findOne({_id: Session.get("activeProject")});
						cl.setNameAndIndirectClassMembership(rangeName,proj && proj.indirectClassMembershipRole);
						
						cl.setClassStyle("condition");	                
						locLink = [loc.x+DEFAULT_BOX_WIDTH/2, loc2.y+DEFAULT_BOX_HEIGHT, loc.x+DEFAULT_BOX_WIDTH/2, loc.y];                 
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
						var proj = Projects.findOne({_id: Session.get("activeProject")});
						boo.setNameAndIndirectClassMembership(domainName,proj && proj.indirectClassMembershipRole);
						boo.addField(prop_name,null,true,false,false);
					}, loc);				

			}

			
		}		
	},
	'click #filter2': async function(e) {
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
	'click #dbp': async function(e) {
		//Template.schemaFilter.Count.set(startCount)
		Template.schemaFilter.F2.set($('#filter_text2').val());
		useFilterP ();
	},
	'change #propType': async function(e) {
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
		var i_name = $(e.target).closest(".class-body").attr("value");
		if ( i_name === "...") {
			var count = dataShapes.schema.tree.countI;
			count = count + dataShapes.schema.tree.plus;
			dataShapes.schema.tree.countI = count;
			await useFilterI();
		}
		else if (i_name !== "wait") {
			var className = Template.schemaInstances.Class.get();
			const BLACK_HEADER_HEIGHT = 45;
			const DEFAULT_BOX_WIDTH = 194;
			const DEFAULT_BOX_HEIGHT = 66;
			const DEFAULT_OFFSET = 10;	
			
			// get location of the editor
			var ajoo_scene_attrs = Interpreter.editor.stage.attrs;
			var attrs = {scroll_h: ajoo_scene_attrs.container.scrollTop,
			scroll_w: ajoo_scene_attrs.container.scrollLeft,
			visible_h: ajoo_scene_attrs.container.clientHeight,
			visible_w: ajoo_scene_attrs.container.clientWidth,
			total_h: ajoo_scene_attrs.height,
			y_relative_top: ajoo_scene_attrs.container.getBoundingClientRect().top,
			y_relative_bottom: ajoo_scene_attrs.container.getBoundingClientRect().bottom,
			};
			
			var loc = {x: attrs.visible_w + attrs.scroll_w - DEFAULT_OFFSET- DEFAULT_BOX_WIDTH,
					 y: attrs.scroll_h + attrs.visible_h-DEFAULT_OFFSET-DEFAULT_BOX_HEIGHT,
					 width: DEFAULT_BOX_WIDTH,
					 height: DEFAULT_BOX_HEIGHT};

			Create_VQ_Element(function(boo) {
					var name = '';
					if (!className.includes('All classes')) 
						name = className;
					var proj = Projects.findOne({_id: Session.get("activeProject")});
					boo.setNameAndIndirectClassMembership(name, proj && proj.indirectClassMembershipRole);
					boo.setInstanceAlias(i_name);
				}, loc);				
			
		}		
	},
	'click #filter3': async function(e) {
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
	'change #class': async function(e) {
		var className = $("#class").val();
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
	filterDisabled: function() {
		return Template.schemaExtra.FilterDisabled.get();
	},
	nsFilters: function() {
		return Template.schemaExtra.NsFilters.get();
	},
	properties: function() {
		return Template.schemaExtra.Properties.get();
	},
	
});

Template.schemaExtra.events({
	'click #makeDiagr': async function(e) {
		var classList = Template.schemaExtra.Classes.get();
		classList = classList.map(v => v.id);
		var propList = Template.schemaExtra.Properties.get();
		if ( propList.length == 0 ) {
			var not_in = [];
			if ($("#nsFilter").val() == 'Exclude' || $("#nsFilter").val() == 'Local')
				not_in = ['owl','rdf','rdfs'];

			var allParams = {main: { c_list: `${classList}`}};
			allParams.main.not_in = not_in.map(v => dataShapes.schema.namespaces.filter(function(n){ return n.name == v})[0].id);
			const rr = await dataShapes.callServerFunction("xx_getPropList", allParams);	
			propList = rr.data;
		}
		
		await dataShapes.makeDiagr(classList, propList, $("#superclassType").val());

	},
	'click #getProperties': async function(e) {
		var classList = Template.schemaExtra.Classes.get();
		classList = classList.map(v => v.id);
		const rr = await dataShapes.callServerFunction("xx_getPropList", {main: { c_list: `${classList}`}});
		Template.schemaExtra.Properties.set(rr.data);
	},
	
	'change #classCount': function(e) {
		setClassList();
	},
	'change #indCount': function(e) {
		setClassList();
	},
	'change #nsFilter': function(e) {
		setClassList();
	},
	'change #sortPar': function(e) {
		sortClassList();
	},
	'click #manual': function(e) {
		if ( $("#manual").is(":checked") ) {
			Template.schemaExtra.ManualDisabled.set("");
			Template.schemaExtra.FilterDisabled.set("disabled");
			var classList = Template.schemaExtra.Classes.get().map(v => v.id);
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
	'click #removeAll': function(e) {
		var classes = [];
		var restClasses = dataShapes.schema.diagram.filteredClassList;
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) { cl.selected = 0; });
		setClassListInfo(classes, restClasses);
	},
	'click #removeSelected': function(e) {
		var selected = $("#selectedClasses").val().map(v => Number(v));

		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( selected.includes(cl.id) )
				cl.selected = 0; 
		});
		makeClassLists();
	},
	'click #addSelected': function(e) {
		var selected = $("#restClasses").val().map(v => Number(v));
		_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
			if ( selected.includes(cl.id) )
				cl.selected = 1; 
		});
		makeClassLists();
	},		
	'click #addWithN': function(e) {
		var selected = $("#restClasses").val().map(v => Number(v));
		if ( selected.length > 0 ) {
			var list = dataShapes.schema.diagram.filteredClassList.find(function(cl) { return cl.id = selected[0]; }).c;
			_.each(dataShapes.schema.diagram.filteredClassList, function(cl) {
				if ( list.includes(cl.id) || cl.id == selected[0] )
					cl.selected = 1; 
			});
			makeClassLists();			
		}
	},
	'click #removeProperties': function(e) {
		var selected = $("#selectedProperties").val().map(v => Number(v));
		var propList = Template.schemaExtra.Properties.get();
		propList = propList.filter(function(p){ return !selected.includes(p.id); })
		Template.schemaExtra.Properties.set(propList);
	},		
});

Template.schemaExtra.rendered = async function() {
	//const classes = await dataShapes.getClassList();
	//Template.schemaExtra.Classes.set(classes);
}
