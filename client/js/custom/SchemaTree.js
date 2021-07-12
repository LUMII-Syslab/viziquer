
Template.schemaFilter.Classes = new ReactiveVar("");
Template.schemaFilter.Properties = new ReactiveVar("");
Template.schemaTree.Classes = new ReactiveVar("");
Template.schemaTree.Count = new ReactiveVar("");
Template.schemaFilter.Count = new ReactiveVar("");
Template.schemaFilter.Ont = new ReactiveVar("");
const startCount = 30;
const plusCount = 20;

Template.schemaTree.helpers({
	classes: function() {
		return Template.schemaTree.Classes.get();
	},
});

async function  useFilter () {
	var text = $('#filter_text').val();
	console.log(text)
	var params = {limit: Template.schemaTree.Count.get(), filter:text, filterColumn: 'display_name'};
	if ($("#dbo").is(":checked") || $("#yago").is(":checked")) {
		var namespaces = {};
		if ($("#dbo").is(":checked"))
			namespaces.in = ['dbo'];
		if ($("#yago").is(":checked"))
			namespaces.notIn = ['yago'];
		params.namespaces = namespaces;
	}
	var clFull = await dataShapes.getClasses(params);
	var classes = _.map(clFull.data, function(cl) {return {ch_count: 0, children: [], data_id: `${cl.prefix}:${cl.display_name}`, localName: `${cl.prefix}:${cl.display_name} (${cl.cnt_x})`}});
	
	if ( clFull.complete === false )
		classes.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});	
	Template.schemaTree.Classes.set(classes);
}

async function  useFilterP () {
	var text = $('#filter_text2').val();
	console.log("0000000000000000000")
	console.log(text)
	console.log($("#propType").val())
	var params = {propertyKind:'All', limit: Template.schemaFilter.Count.get(), filter:text, filterColumn: 'display_name'};
	if ($("#dbp").is(":checked") ) {
		var namespaces = {notIn: ['dbp']};
		params.namespaces = namespaces;
	}
	if ( $("#propType").val() === 'Object properties' )
		params.propertyKind = 'Object';
	if ( $("#propType").val() === 'Data properties' )
		params.propertyKind = 'Data';
		
	var pFull = await dataShapes.getProperties(params);  
	var properties = _.map(pFull.data, function(p) {return {ch_count: 0, children: [], data_id: `${p.prefix}:${p.display_name}`, localName: `${p.prefix}:${p.display_name} (${p.cnt_x})`}});
	if ( pFull.complete === false)
		properties.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
		
	Template.schemaFilter.Properties.set(properties);
}

Template.schemaTree.events({

	"click .toggle-tree-button": function(e) {
		var toggle_button = $(e.target);
		var class_item = toggle_button.closest(".class-item");
		var tree_node_id = toggle_button[0].attributes["node-id"].value;
		
		if (toggle_button.hasClass("expand")) {
			//class_item.find(".attributes-list").css({display: "block"});
			class_item.children().css({display: "block"});
			
			toggle_button.removeClass("expand")
						.addClass("collapse")
						.text("Collapse");
						
			if ( VQ_Schema_copy && VQ_Schema_copy.TreeList[tree_node_id])
				VQ_Schema_copy.TreeList[tree_node_id].display = "block";
		}

		else {
			class_item.find(".attributes-list").css({display: "none"});
			//class_item.children().css({display: "none"});
			toggle_button.removeClass("collapse")
						.addClass("expand")
						.text("Expand");
					
			if ( VQ_Schema_copy && VQ_Schema_copy.TreeList[tree_node_id])	
				VQ_Schema_copy.TreeList[tree_node_id].display = "none";	
		}
	},

	"dblclick .class-body": function(e) {
		var class_name = $(e.target).closest(".class-body").attr("value");
		//console.log($(e.target).closest(".class-body"))
		//var class_name = $(e.target).closest(".class-body").attr("data-id");
		if ( class_name !== "" && class_name !== "...")
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
			Template.schemaTree.Count.set(count)
			useFilter ();
		}		
	},
	'click #filter': async function(e) {
		useFilter ();
	},
	'click #dbo': async function(e) {
		useFilter ();
	},
	'click #yago': async function(e) {
		useFilter ();
	},

});

Template.schemaFilter.rendered = async function() {
	console.log("-----rendered schemaFilter----")
	var propTreeLimit = startCount;
	var pFull = await dataShapes.getProperties({propertyKind:'All', limit: propTreeLimit });  //,namespaces: { notIn: ['dbp']}
	var properties = _.map(pFull.data, function(p) {return {ch_count: 0, children: [], data_id: `${p.prefix}:${p.display_name}`, localName: `${p.prefix}:${p.display_name} (${p.cnt_x})`}});
	if ( pFull.complete === false)
		properties.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});	
	
	Template.schemaFilter.Properties.set(properties);
	Template.schemaFilter.Count.set(propTreeLimit);
}

Template.schemaTree.rendered = async function() {
	console.log("-----rendered schemaTree----")
	var classTreeLimit = startCount;
	//console.log(Session.get("activeProject"))
	var clFull = await dataShapes.getClasses({limit: classTreeLimit ,namespaces: { in: ['dbo']}});
	var classes = _.map(clFull.data, function(cl) {return {ch_count: 0, children: [], data_id: `${cl.prefix}:${cl.display_name}`, localName: `${cl.prefix}:${cl.display_name} (${cl.cnt_x})`}});
	if ( clFull.complete === false)
		classes.push({ch_count: 0, children: [], data_id: "...", localName: "More ..."});
	
	Template.schemaTree.Classes.set(classes);
	Template.schemaTree.Count.set(classTreeLimit);
}

Template.schemaFilter.helpers({
	properties: function() {
		return Template.schemaFilter.Properties.get();
	},
});

Template.schemaFilter.events({

	"dblclick .class-body": function(e) {
		var prop_name = $(e.target).closest(".class-body").attr("value");
		if ( prop_name === "...") {
			var count = Template.schemaFilter.Count.get();
			count = count + plusCount;
			Template.schemaFilter.Count.set(count)
			useFilterP ();
		}		
	},
	'click #filter2': async function(e) {
		useFilterP ();
	},
	'click #dbp': async function(e) {
		useFilterP ();
	},
	'click #propType': async function(e) {
		useFilterP ();
	},
});
