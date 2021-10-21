
Template.schemaFilter.Properties = new ReactiveVar("");
Template.schemaFilter.F2 = new ReactiveVar("");
Template.schemaFilter.PropKind = new ReactiveVar("");
Template.schemaFilter.BL = new ReactiveVar("");
Template.schemaTree.Classes = new ReactiveVar("");
Template.schemaTree.Empty = new ReactiveVar("");
Template.schemaTree.F1 = new ReactiveVar("");
Template.schemaTree.NsInclude = new ReactiveVar("");
Template.schemaTree.NsP = new ReactiveVar("");
Template.schemaTree.NsM = new ReactiveVar("");
Template.schemaTree.NsL = new ReactiveVar("");
Template.schemaInstances.Instances = new ReactiveVar("");
Template.schemaInstances.IsBigClass = new ReactiveVar("");
Template.schemaInstances.Class = new ReactiveVar("");
Template.schemaInstances.Classes = new ReactiveVar("");
Template.schemaInstances.F3 = new ReactiveVar("");
Template.schemaInstances.showI = new ReactiveVar("");
//Template.schemaTree.Count = new ReactiveVar("");
//Template.schemaTree.TopClass = new ReactiveVar("");
//Template.schemaTree.ClassPath = new ReactiveVar("");
//Template.schemaFilter.Count = new ReactiveVar("");
//const startCount = 30;
//const plusCount = 20;

Template.schemaTree.helpers({
	classes: function() {
		return Template.schemaTree.Classes.get();
	},
	nsInclude: function() {
		return Template.schemaTree.NsInclude.get();
	},
	dbo: function() {
		return Template.schemaTree.NsP.get();
	},
	local: function() {
		return Template.schemaTree.NsL.get();
	},
	yago: function() {
		return Template.schemaTree.NsM.get();
	},
	f1: function() {
		return Template.schemaTree.F1.get();
	},
	empty: function() {
		return Template.schemaTree.Empty.get();
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

function setNS() {
	if ($("#dbo").is(":checked")) {
		dataShapes.schema.tree.dbo = true;
		Template.schemaTree.NsP.set(true);
	}
	else {
		dataShapes.schema.tree.dbo = false;
		Template.schemaTree.NsP.set(false);
	}
	
	if ($("#local").is(":checked")) {
		dataShapes.schema.tree.local = true;
		Template.schemaTree.NsL.set(true);
	}
	else {
		dataShapes.schema.tree.local = false;
		Template.schemaTree.NsL.set(false);
	}
		
	if ($("#yago").is(":checked")) {
		dataShapes.schema.tree.yago = true;
		Template.schemaTree.NsM.set(true);
	}
	else {
		dataShapes.schema.tree.yago = false;
		Template.schemaTree.NsM.set(false);
	}
	
}

function setBC() {
	const c = dataShapes.schema.tree.class;
    //const r = ( c == 'skos:Concept' || c == 'foaf:Document' || c == 'owl:Thing' ||  c == 'dbo:TimePeriod' ||  c == 'dbo:Agent' ? true : false); 
	const r = (dataShapes.schema.tree.b_classes.filter(i => i == c).length !== 0)
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

	if ( dataShapes.schema.tree.dbo || dataShapes.schema.tree.yago || dataShapes.schema.tree.local ) {
		var namespaces = {};
		if (dataShapes.schema.tree.dbo)
			namespaces.in = ['dbo'];
		if (dataShapes.schema.tree.yago)
			namespaces.notIn = ['yago'];
		if (dataShapes.schema.tree.local)
			namespaces.in = [dataShapes.schema.localNS];
		params.namespaces = namespaces;
	} 
	
	/*if ($("#dbo").is(":checked") || $("#yago").is(":checked")) {
		var namespaces = {};
		if ($("#dbo").is(":checked"))
			namespaces.in = [;;dbo];
		if ($("#yago").is(":checked"))
			namespaces.notIn = ['yago'];
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

	if ( nsPlus) {
		if ($("#dbo").is(":checked") || $("#yago").is(":checked")) {
			var namespaces = {};
			if ($("#dbo").is(":checked"))
				namespaces.in = ['dbo'];
			if ($("#yago").is(":checked"))
				namespaces.notIn = ['yago'];
			params.namespaces = namespaces;
		}	
	}
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
	var text = Template.schemaTree.F1.get().toLowerCase();
	dataShapes.schema.tree.filterC = text;
	// ** setNS();
	var treeTop = Template.schemaTree.Classes.get();
	
	if ( dataShapes.schema.tree.topClass != 0 ) 
		await setTreeSubClasses ([treeTop[1]], true, text);
	else 
		await setTreeTop(text, plus);
}

async function  useFilterP (plus = 0) {
	//var text = $('#filter_text2').val().toLowerCase();
	var text = Template.schemaFilter.F2.get().toLowerCase();
	dataShapes.schema.tree.filterP = text;
	var params = {propertyKind:'All', limit: dataShapes.schema.tree.countP, filter:text};
	var col = 'cnt_x';
	if ($("#dbp").is(":checked") ) {
		params.orderByPrefix = `case when ns_id = 2 then 0 
else case when display_name LIKE 'wiki%' or prefix = 'rdf' and display_name = 'type' or prefix = 'dct' and display_name = 'subject'
or prefix = 'owl' and display_name = 'sameAs' or prefix = 'prov' and display_name = 'wasDerivedFrom' then 1 else 2 end end desc,`; 
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
	//var text = $('#filter_text3').val();
	if (Template.schemaInstances.showI.get()) {
		var text = Template.schemaInstances.F3.get();
		dataShapes.schema.tree.filterI = text;
		var params = { limit: dataShapes.schema.tree.countI, filter:text};
		//var className = $("#class").val();
		var className = Template.schemaInstances.Class.get();

		dataShapes.schema.tree.class = className;
		
		Template.schemaInstances.Instances.set([{ch_count: 0, children: [], data_id: "wait", localName: "Waiting answer..."}]);

		var iFull = await dataShapes.getTreeIndividuals(params, className);  

		var instances = _.map(iFull, function(p) {return {ch_count: 0, children: [], data_id: p, localName: p}});
		if (iFull.length === dataShapes.schema.tree.countI)
			instances.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
			
		Template.schemaInstances.Instances.set(instances);
	}
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
		console.log(e)
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
					boo.setName(class_name);
					var proj = Projects.findOne({_id: Session.get("activeProject")});
					boo.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
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
	'click #dbo': async function(e) {
		//Template.schemaTree.Count.set(startCount)
		setNS();
		Template.schemaTree.F1.set($('#filter_text').val());
		await useFilter ();
	},
	'click #local': async function(e) {
		//Template.schemaTree.Count.set(startCount)
		setNS();
		Template.schemaTree.F1.set($('#filter_text').val());
		await useFilter ();
	},
	'click #yago': async function(e) {
		//Template.schemaTree.Count.set(startCount)
		setNS();
		Template.schemaTree.F1.set($('#filter_text').val());
		await useFilter ();
	},
	'keyup #filter_text': async function(e){
		if (e.keyCode == 13) {
			Template.schemaTree.F1.set($('#filter_text').val());
			await useFilter();
		}
		return;
	},
	'click #reload': async function(e){
		await dataShapes.changeActiveProject(Session.get("activeProject"));
		Template.schemaTree.Empty.set(false);
		Template.schemaTree.NsInclude.set(dataShapes.schema.tree.nsInclude);
		Template.schemaTree.NsP.set(dataShapes.schema.tree.dbo);
		Template.schemaTree.NsL.set(dataShapes.schema.tree.local);
		Template.schemaTree.NsM.set(dataShapes.schema.tree.yago	);
		Template.schemaTree.F1.set(dataShapes.schema.tree.filterC);	
		await useFilter ();	
		Template.schemaFilter.F2.set(dataShapes.schema.tree.filterP);
		Template.schemaFilter.PropKind.set(dataShapes.schema.tree.pKind);
		Template.schemaFilter.BL.set(dataShapes.schema.tree.dbp);
		await useFilterP ();
		//$("#class").val(dataShapes.schema.tree.class);	
		Template.schemaInstances.F3.set(dataShapes.schema.tree.filterI);
		Template.schemaInstances.Class.set(dataShapes.schema.tree.class);
		Template.schemaInstances.showI.set(!dataShapes.schema.hide_individuals);
		Template.schemaInstances.Classes.set(dataShapes.schema.tree.classes.map( v => { if ( v == dataShapes.schema.tree.class ) return {name:v, selected: "selected"}; else return {name:v}; }));		
		await useFilterI ();	
	},	
	
});

Template.schemaTree.rendered = async function() {
	console.log("-----rendered schemaTree----")

	//console.log(Projects.findOne(Session.get("activeProject")));
	//Template.schemaTree.Count.set(startCount);
	if (dataShapes.schema.empty) {
		Template.schemaTree.Empty.set(true);
		Template.schemaTree.NsInclude.set(false);
	}
	else {
		Template.schemaTree.Empty.set(false);
		Template.schemaTree.NsInclude.set(dataShapes.schema.tree.nsInclude);
		Template.schemaTree.NsP.set(dataShapes.schema.tree.dbo);
		Template.schemaTree.NsL.set(dataShapes.schema.tree.local);
		Template.schemaTree.NsM.set(dataShapes.schema.tree.yago);
		Template.schemaTree.F1.set(dataShapes.schema.tree.filterC);		

		//$("#filter_text")[0].value = dataShapes.schema.tree.filterC;
		await useFilter ();		
	}

	//Template.schemaTree.ClassPath.set([]);
}

Template.schemaFilter.rendered = async function() {
	//console.log("-----rendered schemaFilter----")
	Template.schemaFilter.F2.set(dataShapes.schema.tree.filterP);
	Template.schemaFilter.PropKind.set(dataShapes.schema.tree.pKind);
	Template.schemaFilter.BL.set(dataShapes.schema.tree.dbp);
	await useFilterP ();
	
	//var pFull = await dataShapes.getTreeProperties({propertyKind:'All', limit: dataShapes.schema.tree.countP, orderByPrefix: `case when ns_id = 2 then 0 else case when display_name LIKE 'wiki%' or prefix = 'rdf' and display_name = 'type' or prefix = 'dct' and display_name = 'subject' or prefix = 'owl' and display_name = 'sameAs' or prefix = 'prov' and display_name = 'wasDerivedFrom' then 1 else 2 end end desc,`});
	//var properties = _.map(pFull.data, function(p) {return {ch_count: 0, children: [], data_id: getName(p), localName: getNameF(p)}});
	//if ( pFull.complete === false)
	//	properties.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});	
	//Template.schemaFilter.Properties.set(properties);
}

Template.schemaInstances.rendered = async function() {
	//console.log("-----rendered schemaInstances----")
	//$("#filter_text3")[0].value = dataShapes.schema.tree.filterI;
	//$("#class").val(dataShapes.schema.tree.class);
	Template.schemaInstances.F3.set(dataShapes.schema.tree.filterI);
	Template.schemaInstances.Class.set(dataShapes.schema.tree.class);
	Template.schemaInstances.showI.set(!dataShapes.schema.hide_individuals);
	Template.schemaInstances.Classes.set(dataShapes.schema.tree.classes.map( v => { if ( v == dataShapes.schema.tree.class ) return {name:v, selected: "selected"}; else return {name:v}; }));
	setBC();
	await useFilterI ();
}

Template.schemaFilter.helpers({
	properties: function() {
		return Template.schemaFilter.Properties.get();
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
					boo.setName(domainName);
					boo.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
					
					Create_VQ_Element(function(cl){
						var proj = Projects.findOne({_id: Session.get("activeProject")});
						cl.setName(rangeName);
						cl.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
						
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
						boo.setName(domainName);
						var proj = Projects.findOne({_id: Session.get("activeProject")});
						boo.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
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
	'click #dbp': async function(e) {
		//Template.schemaFilter.Count.set(startCount)
		Template.schemaFilter.F2.set($('#filter_text2').val());
		useFilterP ();
	},
	'click #propType': async function(e) {
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
					if (!$("#class").val().includes('All classes')) { // TODO
						boo.setName($("#class").val());
						var proj = Projects.findOne({_id: Session.get("activeProject")});
						boo.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
					}
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
	'click #class': async function(e) {
		var className = $("#class").val();
		if ( className !== dataShapes.schema.tree.class) {
			//Template.schemaInstances.F3.set('');  //TODO
			//dataShapes.schema.tree.filterI = '';  //TODO
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