
Interpreter.methods({

	delete_tool: function() {

		var list = {toolId: Session.get("toolId")};
		Meteor.call("removeTool", list, function(err){
			if (err)
				console.log("Error in removeTool callback", err);
		});

		Router.go("configurator");
	},

});


Template.configuratorTemplate.helpers({
	tools: function() {

		var rows = 4;
		var row_elems = 1;
		var colors = ["bg-danger", "bg-primary", "bg-warning", "bg-success"];

		//building color list
		var color_list = [];
		for (var i=0;i<rows;i++)
			for (var j=0;j<row_elems;j++)
				color_list.push(colors[i]);

		var divider = rows * row_elems;

		return Tools.find({}, {$sort: {name: 1}}).map(function(tool, i) {

			tool["date"] = joined_date(tool["createdAt"]);
			tool["color"] = color_list[i % divider];
			tool["toolId"] = tool["_id"];

			var user_tool = UserTools.findOne({toolId: tool["_id"]});
			if (user_tool) {
				tool["versionId"] = user_tool["versionId"];
			}

			return tool;
		});
	},
});

Template.configuratorRibbon.events({

//opens dialog to create a new tool
	'click #add-tool' : function(e) {
		$("#add-tool-form").modal("show");
	},

//shows button's tooltip on mouse over
    'mouseover .btn-ribbon' : function(e, templ) {
    	Dialog.destroyTooltip(e);
    },

//removes tooltip on mouse leave
    'mouseleave .btn-ribbon' : function(e, templ) {
    	Dialog.destroyTooltip(e);
    },	
});

Template.addToolForm.events({

	//opens dialog window to create a new configurator diagram
	'click #create-tool' : function(e) {
		$('#add-tool-form').attr("OKPressed", true);
		$("#add-tool-form").modal("hide");
	},

	"hidden.bs.modal #add-tool-form" : function(e) {
		var src = $('#add-tool-form');
		if (src.attr("OKPressed")) {

			src.removeAttr("OKPressed");
			var tool_name = $("#tool-name").val();
		
			var list = {name: tool_name};

			Meteor.call("insertTool", list, function(err, id) {
				if (err) {
					console.log("Error in insertTool callback", err);
				}

				else {
					if (id) {
	  					Router.go("tool", {_id: id});
					}
				}
			});
	  	}
	},

});