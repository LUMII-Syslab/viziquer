
Template.toolDiagrams.helpers({

	diagrams: function() {
		return Diagrams.find({}, {sort: {name: 1}}).map(function(diagram) {
			return diagram;
		});
	},

});

Template.toolDiagrams.events({

	//opens dialog window to create a new configurator diagram
	'click #add' : function(e) {
		$("#add-configurator-diagram").modal("show");
	},

	//open dialog window for a configuration import
	'click #import-diagram' : function(e) {
		e.preventDefault();

		$("#upload-data").modal("show");
	
		return;
	},

	'click #download-diagram' : function(e) {
		e.preventDefault();

		var export_config = new ExportDiagramConfig();
		export_config.export();

		return;
	},


});


Template.importConfigurationForm.events({

	"click #ok-upload-files": function(e) {

		$("#upload-data").modal("hide");

        var fileList = $("#fileList")[0].files;
	    _.each(fileList, function(myFile) {

	        var reader = new FileReader();

	        reader.onload = function() {

	            try {
	                var objectArr = JSON.parse(reader.result);
	            }

	            catch (e) {
	                console.error("Error in reading JSON ", e);
	                return;
	            }   

	            var list = {toolId: Session.get("toolId"),
							versionId: Session.get("toolVersionId"),
	                        data: objectArr,
	                    };

				Utilities.callMeteorMethod("importConfiguration", list);


	        };   //reader.onload

	        reader.onerror = function(error) {
	            console.error("Error ", error); 
	        }

        	reader.readAsText(myFile);
	    });  //each

	},

});

Template.addConfiguratorDiagram.events({

	//opens dialog window to create a new configurator diagram
	'click #create-configurator-diagram' : function(e) {

		$('#add-configurator-diagram').attr("OKPressed", true);
		$("#add-configurator-diagram").modal("hide");

	},

	"hidden.bs.modal #add-configurator-diagram" : function(e) {
		var src = $('#add-configurator-diagram');
		if (src.attr("OKPressed")) {
			src.removeAttr("OKPressed");

			var diagram_name = $("#diagram-name").val();

			var editor_type_field = $('#editor-type');
			var item = Dialog.getSelectionItem(editor_type_field);
			var editor_type_id = item.attr("id");

			var diagram_type = DiagramTypes.findOne({toolId: {$ne: Session.get("toolId")},
														editorType: editor_type_id});

			if (diagram_type) {
				var diagram_type_id = diagram_type["_id"];		
				//create_diagram(diagram_name, diagram_type_id);

				var list = {toolId: Session.get("toolId"),
							versionId: Session.get("toolVersionId"),
							diagramTypeId: diagram_type_id,
							name: diagram_name,
							editorType: editor_type_id,
						};

				Utilities.callMeteorMethod("insertDiagramType", list, function(dgr_obj) {

						Router.go("configuratorDiagram",
												{toolId: list["toolId"],
												versionId: list["versionId"],
												_id: dgr_obj["diagramId"],
												diagramTypeId: diagram_type_id});
					});

			}
		}
	}

});