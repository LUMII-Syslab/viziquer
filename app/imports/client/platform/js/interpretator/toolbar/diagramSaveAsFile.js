import { Interpreter } from '/imports/client/lib/interpreter'
import { Dialog } from '/imports/client/platform/js/interpretator/Dialog'

import { Diagrams, Elements, Compartments, ElementTypes, CompartmentTypes, ElementsSections } from '/imports/db/platform/collections'


Template.downloadAsFile.helpers({

	fileName: function() {
		var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
		if (diagram)
			return diagram.name;
	},

});

Template.downloadAsFile.events({

	"click #create-file": function() {

		var form = $("#download-file-form");
		form.modal("hide");

		var list = {name: form.find("#file-name").val(),
					type: Dialog.getSelectionItem(form.find("#file-type")).attr("id"),
				};

		CreateFile(list);
	},

});

function CreateFile(list) {

	var file_types = {
		pdf: function() {
			CreatePDF(list);
		},
	};

	var file_type = list["type"];
	if (file_types[file_type])
		file_types[file_type]();
	else
		console.log("Can't convert to the specified file format:", file_type);
} 


//This is an ad-hoc function
function CreatePDF(params) {

	var diagram = Diagrams.findOne({_id: Session.get("activeDiagram")});
	if (diagram) {

		var editor = Interpreter.editor;
		var stage = editor.stage;

		var max_point = editor.size.computeActualSize();
		var max_x = max_point.x;
		var max_y = max_point.y;

		var shapes_layer = editor.getLayer("ShapesLayer");
		var background_rect = new Konva.Rect({x: 0, y: 0,
											width: max_x,
											height: max_y,
											fill: $(stage.container()).css("background-color"),
										});


		var swimlane_layer = editor.getLayer("SwimlaneLayer");
		if (swimlane_layer) {
			swimlane_layer.add(background_rect);
			background_rect.moveToBottom();
			swimlane_layer.draw();
		}

		else {
			shapes_layer.add(background_rect);
			background_rect.moveToBottom();
			shapes_layer.draw();
		}

		stage.toImage({
	       // mimeType: "image/jpeg",
	        quality: 1,
	        width: max_x,
	        height: max_y,

	        callback: function(imgData) {

				var image = imgData["src"];

				var docDefinition = {
					pageSize: 'A4',
            		pageMargins: [ 30, 25, 30, 25 ],

            		// Content with styles
					content: [
						{
							image: image,
							fit: [504, 791],
						//	pageBreak: 'after',
						},
						//{image: image, width: 565, height: 842},
						//{image: image, fit: [565, 842]}
					],

// 		            // Style dictionary
// 		            styles: {
// 		                headline: { fontSize: 25, bold: true, margin: [0, 0, 0, 25] },
// 		                listItem: { fontSize: 14, margin: [0, 0, 0, 5] },
// 		                listLabel: { bold: true },
// 		                listText: { italic: true }
// 		            }
				};

				//generate_elements_content(docDefinition, diagram._id);

				pdfMake.createPdf(docDefinition).download(params.name + ".pdf");

				var parent_layer = background_rect.getLayer();
				background_rect.destroy();
				parent_layer.draw();

			}
	    });
	}
}

function generate_elements_content(docDefinition, diagram_id) {

	var elements = Elements.find({diagramId: diagram_id});
	if (elements.count() == 0)
		return;

	var content = docDefinition.content;

	elements.forEach(function(elem) {

	//element
		var elem_type = ElementTypes.findOne({_id: elem["elementTypeId"]});
		if (!elem_type)
			return;

		var elem_pdf = { 
						text: "\n" + elem._id + "(" + elem_type.name +  ")", 
						style: 'header' 
					};

		content.push(elem_pdf);

	//atributes
		content.push({text: "Attributes", style: 'subheader'});

		var copmartments = Compartments.find({elementId: elem._id}, {sort: {index: 1}});
		if (copmartments.count() == 0) {
			content.push(element_content("No data"));
		}
		else {
			copmartments.forEach(function(compart) {

				var compart_type = CompartmentTypes.findOne({_id: compart["compartmentTypeId"]});
				if (!compart_type)
					return;

				var value = compart_type.name + ": " + compart.value
				content.push(element_content(value));			
			});
		}

	//sections
		content.push({text: "Sections", style: 'subheader'});

		var elements_sections = ElementsSections.find({elementId: elem._id});
		if (elements_sections.count() == 0) {
			content.push(element_content("No data"));
		}
		else {
			elements_sections.forEach(function(elem_section) {

				var section = Sections.findOne({_id: elem_section["sectionId"]});
				if (!section)
					return;

				content.push(element_content(section.text));
			});
		}

	//files
		content.push({text: "Files", style: 'subheader'});

		var diagram_files = DiagramFiles.find({elementId: elem._id});
		if (diagram_files.count() == 0) {
			content.push(element_content("No data"));
		}

		else {
			diagram_files.forEach(function(file) {
				content.push(element_content(file.name));
			});
		}

	});


	docDefinition.styles = {
							header: {
								fontSize: 14,
								bold: true
							},
							subheader: {
								margin: [15, 0, 40, 0],
								fontSize: 12,

							},
							compartmentMargin: {
								margin: [30, 0, 40, 0],
								fontSize: 11,
							},
						};
}

function element_content(val) {
	return {stack: [{text: val, style: 'compartmentMargin'}]};
}
