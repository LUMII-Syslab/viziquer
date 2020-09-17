
Interpreter.methods({

	delete_tool: function() {
		var list = {toolId: Session.get("toolId"),};
		Meteor.call("removeTool", list, function(err, resp) {
			if (err) {
				console.error("Error in removeTool callback", err);
			}
			else {

				if (resp == 1) {
					Router.go("configurator");
				}

				else {
					console.log("There are projects attached to the tool");
				}
			}
		});
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

		return Tools.find({}, {sort: {name: 1}}).map(function(tool, i) {

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
	// import users functionality for testing purposes
	'click #import-users' : function(e) {
		$("#import-users-form").modal("show");
	},
	'click #import-users-ok' : function(e) {
		$("#import-users-form").modal("hide");
	},
	
	'change #import-users-file' : function (event) {
		const files  = event.currentTarget.files;
		
		_.each(files, function (file) {

			let reader = new FileReader();

			reader.onload = function (evt) {
				let contents 	= evt.target.result;
				let lines 		= contents.split('\n');
				let line 		= lines[0].split(',');
				let ProjectId 	= line[4].trim()
				for(let i = 1; i < lines.length - 1; i++){
					let Columns = lines[i].split(",");
					
					let userObj 	= {name: Columns[0], surname: Columns[1], password: Columns[0], email: Columns[3].trim()};
					let userInvite 	= { email: userObj.email, role: "Reader", projectId: ProjectId};
					
					Meteor.call("makeUser", userObj, function(err) {
						if (err) {
							console.log("Error in makeUser callback");
							console.log(err);
						}
						else {
							console.log(`user ${Columns[0]} is signed up successfully`);
						}
					});
					Utilities.callMeteorMethod("enrollUser", userInvite);
				}
			}
		reader.readAsText(file);
		});
		
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