
Template.schemaFilter.Properties = new ReactiveVar("");
Template.schemaTree.Classes = new ReactiveVar("");
Template.schemaInstances.Instances = new ReactiveVar("");
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
	dbo: function() {
		return dataShapes.schema.tree.dbo;
	},
	yago: function() {
		return dataShapes.schema.tree.yago;
	},
	f: function() {
		return dataShapes.schema.tree.filterC;
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
	if ($("#dbo").is(":checked"))
		dataShapes.schema.tree.dbo = true;
	else
		dataShapes.schema.tree.dbo = false;
		
	if ($("#yago").is(":checked"))
		dataShapes.schema.tree.yago = true;
	else
		dataShapes.schema.tree.yago = false;
}

async function setTreeTop (filter = '') {
	//var params = {treeMode: 'Top', limit: Template.schemaTree.Count.get()};
	var params = {treeMode: 'Top', limit: dataShapes.schema.tree.countC};
	if (filter !== '')
		params.filter = filter;
		
	if ($("#dbo").is(":checked") || $("#yago").is(":checked")) {
		var namespaces = {};
		if ($("#dbo").is(":checked"))
			namespaces.in = ['dbo'];
		if ($("#yago").is(":checked"))
			namespaces.notIn = ['yago'];
		params.namespaces = namespaces;
	}
	
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

async function  useFilter () {
	var text = $('#filter_text').val().toLowerCase();
	dataShapes.schema.tree.filterC = text;
	setNS();
	var treeTop = Template.schemaTree.Classes.get();

	if ( dataShapes.schema.tree.topClass != 0 ) 
		await setTreeSubClasses ([treeTop[1]], true, text);
	else 
		await setTreeTop(text);
}

async function  useFilterP () {
	var text = $('#filter_text2').val().toLowerCase();
	dataShapes.schema.tree.filterP = text;
	var params = {propertyKind:'All', limit: dataShapes.schema.tree.countP, filter:text};
	var col = 'cnt_x';
	if ($("#dbp").is(":checked") ) {
		//params.namespaces = {notIn: ['dbp']};
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
		
	var pFull = await dataShapes.getTreeProperties(params);  
	var properties = _.map(pFull.data, function(p) {return {ch_count: 0, children: [], data_id: getName(p), localName: getNameF(p, col)}});
	if ( pFull.complete === false)
		properties.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
		
	Template.schemaFilter.Properties.set(properties);
}

async function  useFilterI () {
	var text = $('#filter_text3').val();
	dataShapes.schema.tree.filterI = text;
	var params = { limit: dataShapes.schema.tree.countI, filter:text};
	var className = $("#class").val();
	dataShapes.schema.tree.class = className;

	var iFull = await dataShapes.getTreeIndividuals(params, className);  

	var instances = _.map(iFull, function(p) {return {ch_count: 0, children: [], data_id: p, localName: p}});
	instances.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
		
	Template.schemaInstances.Instances.set(instances);
}

Template.schemaTree.events({
	"click .toggle-tree-button": async function(e) {
		var toggle_button = $(e.target);
		var tree_node_id = toggle_button[0].attributes["node-id"].value;
		var topClass = dataShapes.schema.tree.topClass;
		//Template.schemaTree.Count.set(startCount);
		$("#filter_text")[0].value = '';
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

	"dblclick .class-body": async function(e) {
		var class_name = $(e.target).closest(".class-body").attr("value");

		if ( class_name !== "" && class_name !== "..." && class_name !== ".." && class_name !== ".")
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
			await useFilter();
		}	
		if ( class_name === "..") {
			//var count = Template.schemaTree.Count.get();
			var count = dataShapes.schema.tree.countC;
			count = count + dataShapes.schema.tree.plus;
			//Template.schemaTree.Count.set(count);
			dataShapes.schema.tree.countC = count;
			await useFilter();
		}		
	},
	'click #filter': async function(e) {
		//Template.schemaTree.Count.set(startCount)
		await useFilter();
	},
	'click #dbo': async function(e) {
		//Template.schemaTree.Count.set(startCount)
		await useFilter ();
	},
	'click #yago': async function(e) {
		//Template.schemaTree.Count.set(startCount)
		await useFilter ();
	},
	'keyup #filter_text': async function(e){
		if (e.keyCode == 13) {
			await useFilter();
		}
		return;
	},
});

Template.schemaTree.rendered = async function() {
	//console.log("-----rendered schemaTree----")
	//Template.schemaTree.Count.set(startCount);
	$("#filter_text")[0].value = dataShapes.schema.tree.filterC;
	await useFilter ();
	//Template.schemaTree.ClassPath.set([]);

}

Template.schemaFilter.rendered = async function() {
	//console.log("-----rendered schemaFilter----")
	$("#filter_text2")[0].value = dataShapes.schema.tree.filterP;
	$("#propType").val(dataShapes.schema.tree.pKind);
	await useFilterP ();
	
	//var pFull = await dataShapes.getTreeProperties({propertyKind:'All', limit: dataShapes.schema.tree.countP, orderByPrefix: `case when ns_id = 2 then 0 else case when display_name LIKE 'wiki%' or prefix = 'rdf' and display_name = 'type' or prefix = 'dct' and display_name = 'subject' or prefix = 'owl' and display_name = 'sameAs' or prefix = 'prov' and display_name = 'wasDerivedFrom' then 1 else 2 end end desc,`});
	//var properties = _.map(pFull.data, function(p) {return {ch_count: 0, children: [], data_id: getName(p), localName: getNameF(p)}});
	//if ( pFull.complete === false)
	//	properties.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});	
	//Template.schemaFilter.Properties.set(properties);
}

Template.schemaInstances.rendered = async function() {
	//console.log("-----rendered schemaInstances----")
	$("#filter_text3")[0].value = dataShapes.schema.tree.filterI;
	$("#class").val(dataShapes.schema.tree.class);
	await useFilterI ();
}

Template.schemaFilter.helpers({
	properties: function() {
		return Template.schemaFilter.Properties.get();
	},
	f: function() {
		return dataShapes.schema.tree.filterP;
	},
	dbp: function() {
		return dataShapes.schema.tree.dbp;
	},
	pKind: function() {
		return dataShapes.schema.tree.pKind;
	},
});

Template.schemaFilter.events({
	"dblclick .class-body": async function(e) {
		var prop_name = $(e.target).closest(".class-body").attr("value");
		if ( prop_name === "...") {
			var count = dataShapes.schema.tree.countP;
			count = count + dataShapes.schema.tree.plus;
			dataShapes.schema.tree.countP = count;
			await useFilterP();
		}
		else {
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
		await useFilterP();
	},
	'click #dbp': async function(e) {
		//Template.schemaFilter.Count.set(startCount)
		useFilterP ();
	},
	'click #propType': async function(e) {
		//Template.schemaFilter.Count.set(startCount)
		useFilterP ();
	},
	'keyup #filter_text2': async function(e){
		if (e.keyCode == 13) {
			await useFilterP();
		}
		return;
	},
});

Template.schemaInstances.helpers({
	instances: function() {
		return Template.schemaInstances.Instances.get();
	},
	f: function() {
		return dataShapes.schema.tree.filterI;
	},
	class: function() {
		return dataShapes.schema.tree.class;
	},
});

Template.schemaInstances.events({
	"dblclick .class-body": async function(e) {
		var i_name = $(e.target).closest(".class-body").attr("value");
		console.log(i_name)
		if ( i_name === "...") {
			var count = dataShapes.schema.tree.countI;
			count = count + dataShapes.schema.tree.plus;
			dataShapes.schema.tree.countI = count;
			await useFilterI();
		}
		else {
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
					boo.setName("");
					boo.setInstanceAlias(i_name);
					var proj = Projects.findOne({_id: Session.get("activeProject")});
					boo.setIndirectClassMembership(proj && proj.indirectClassMembershipRole);
				}, loc);				



			
		}		
	},
	'click #filter3': async function(e) {
		await useFilterI();
	},
	'click #class': async function(e) {
		var className = $("#class").val();
		if ( className !== dataShapes.schema.tree.class)
			useFilterI ();
	},
	'keyup #filter_text3': async function(e){
		if (e.keyCode == 13) {
			await useFilterI();
		}
		return;
	},
});