
Template.schemaFilter.Classes = new ReactiveVar("");
Template.schemaFilter.Properties = new ReactiveVar("");
Template.schemaTree.Classes = new ReactiveVar("");
Template.schemaTree.Count = new ReactiveVar("");
Template.schemaTree.TopClass = new ReactiveVar("");
Template.schemaTree.ClassPath = new ReactiveVar("");
Template.schemaFilter.Count = new ReactiveVar("");
Template.schemaFilter.Ont = new ReactiveVar("");
const startCount = 10;
const plusCount = 5;

Template.schemaTree.helpers({
	classes: function() {
		return Template.schemaTree.Classes.get();
	},
});

function getNameF(o) {
	if ( dataShapes.schema.showPrefixes === "false" && o.is_local) 
		return `${o.display_name} (${o.cnt_x})`;
	else 
		return `${o.prefix}:${o.display_name} (${o.cnt_x})`;

}

function getName(o) {
	if ( dataShapes.schema.showPrefixes === "false" && o.is_local) 
		return `${o.display_name}`;
	else 
		return `${o.prefix}:${o.display_name}`;

}

async function setTreeTop (filter = '') {
	var params = {mode: 'Top', limit: Template.schemaTree.Count.get()};
	if (filter !== '')
		params.filter = filter;
		
	var namespaces = { in:[], notIn:[]};
	if ($("#dbo").is(":checked"))
		namespaces.in = ['dbo'];
	if ($("#yago").is(":checked"))
		namespaces.notIn = ['yago'];
	params.namespaces = namespaces;
	
	var clFull = await dataShapes.getTreeClasses(params);
	var classes = _.map(clFull.data, function(cl) {return {ch_count: Number(cl.has_subclasses), node_id: cl.id, children: [], data_id: getName(cl), localName: getNameF(cl)}});
	if ( clFull.complete === false)
		classes.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
	Template.schemaTree.Classes.set(classes);
	Template.schemaTree.TopClass.set(0);
}

async function setTreeSubClasses (cc, nsPlus, filter = '') {
	
	Template.schemaTree.TopClass.set(cc[0].node_id);
	var params = {limit: Template.schemaTree.Count.get(), mode: 'Sub', class_id: Template.schemaTree.TopClass.get()};
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
		
	var clSub = await dataShapes.getTreeClasses(params);
	var classes = _.map(clSub.data, function(cl) {return {ch_count: Number(cl.has_subclasses), node_id: cl.id, children: [], data_id: getName(cl), localName: getNameF(cl)}});
	if ( clSub.complete === false )
		classes.push({ch_count: 0, children: [], data_id: "..", localName: "More ..."});

	cc[0].children = classes;
	tree.push(cc[0]);
	Template.schemaTree.Classes.set(tree); 
}

async function  useFilter () {
	var text = $('#filter_text').val().toLowerCase();
	var treeTop = Template.schemaTree.Classes.get();

	if ( Template.schemaTree.TopClass.get() != 0 ) 
		await setTreeSubClasses ([treeTop[1]], true, text);
	else 
		await setTreeTop(text);
}

async function  useFilterP () {
	var text = $('#filter_text2').val().toLowerCase();
	var params = {propertyKind:'All', limit: Template.schemaFilter.Count.get(), filter:text};
	if ($("#dbp").is(":checked") ) {
		params.namespaces = {notIn: ['dbp']};
	}
	if ( $("#propType").val() === 'Object properties' )
		params.propertyKind = 'Object';
	if ( $("#propType").val() === 'Data properties' )
		params.propertyKind = 'Data';
		
	var pFull = await dataShapes.getProperties(params);  
	var properties = _.map(pFull.data, function(p) {return {ch_count: 0, children: [], data_id: getName(p), localName: getNameF(p)}});
	if ( pFull.complete === false)
		properties.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
		
	Template.schemaFilter.Properties.set(properties);
}

Template.schemaTree.events({
	"click .toggle-tree-button": async function(e) {
		var toggle_button = $(e.target);
		var tree_node_id = toggle_button[0].attributes["node-id"].value;
		var topClass = Template.schemaTree.TopClass.get();
		console.log(tree_node_id)
		//console.log(Template.schemaTree.ClassPath.get())
		Template.schemaTree.Count.set(startCount);
		$("#filter_text")[0].value = "";

		if ( tree_node_id == 0 ) {
			await setTreeTop();
		}
		if ( topClass == tree_node_id) {
			var classPath = Template.schemaTree.ClassPath.get();
			classPath.pop();
			if ( classPath.length === 0) {
				await setTreeTop();
			}
			else {
				var cc = classPath[classPath.length-1];
				console.log(classPath)
				console.log(classPath.length-1)
				console.log(cc)
				await setTreeSubClasses ([cc], false);
			}
		}
		else {

			var treeTop = Template.schemaTree.Classes.get();
			var cc;
			
			if ( Template.schemaTree.TopClass.get() === 0)
				cc = _.filter(treeTop, function(c){ return  c.node_id == tree_node_id });
			else
				cc = _.filter(treeTop[1].children, function(c){ return  c.node_id == tree_node_id });
				
			//console.log(cc)
			if ( cc[0].ch_count > 0) {
				var classPath = Template.schemaTree.ClassPath.get();
				classPath.push(cc[0]);
				Template.schemaTree.ClassPath.set(classPath);
				//console.log(Template.schemaTree.ClassPath.get())
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
			var count = Template.schemaTree.Count.get();
			count = count + plusCount;
			Template.schemaTree.Count.set(count);
			await useFilter();
		}	
		if ( class_name === "..") {
			var count = Template.schemaTree.Count.get();
			count = count + plusCount;
			Template.schemaTree.Count.set(count);
			await useFilter();
		}		
	},
	'click #filter': async function(e) {
		Template.schemaTree.Count.set(startCount)
		await useFilter();
	},
	'click #dbo': async function(e) {
		Template.schemaTree.Count.set(startCount)
		await useFilter ();
	},
	'click #yago': async function(e) {
		Template.schemaTree.Count.set(startCount)
		await useFilter ();
	},

});

Template.schemaFilter.rendered = async function() {
	//console.log("-----rendered schemaFilter----")
	var pFull = await dataShapes.getProperties({propertyKind:'All', limit: startCount, namespaces: { notIn: ['dbp']}});
	var properties = _.map(pFull.data, function(p) {return {ch_count: 0, children: [], data_id: getName(p), localName: getNameF(p)}});
	if ( pFull.complete === false)
		properties.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});	
	Template.schemaFilter.Properties.set(properties);
	Template.schemaFilter.Count.set(startCount);
}

Template.schemaTree.rendered = async function() {

	Template.schemaTree.Count.set(startCount);
	await setTreeTop ();
	Template.schemaTree.ClassPath.set([]);

	}

Template.schemaFilter.helpers({
	properties: function() {
		return Template.schemaFilter.Properties.get();
	},
});

Template.schemaFilter.events({

	"dblclick .class-body": async function(e) {
		var prop_name = $(e.target).closest(".class-body").attr("value");
		if ( prop_name === "...") {
			var count = Template.schemaFilter.Count.get();
			count = count + plusCount;
			Template.schemaFilter.Count.set(count);
			await useFilterP();
		}		
	},
	'click #filter2': async function(e) {
		Template.schemaFilter.Count.set(startCount)
		await useFilterP();
	},
	'click #dbp': async function(e) {
		Template.schemaFilter.Count.set(startCount)
		useFilterP ();
	},
	'click #propType': async function(e) {
		Template.schemaFilter.Count.set(startCount)
		useFilterP ();
	},
});
