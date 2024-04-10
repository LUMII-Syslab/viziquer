import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Interpreter } from '/imports/client/lib/interpreter'
import { Utilities } from '/imports/client/platform/js/utilities/utils'
import { Compartments, Elements, Diagrams, DiagramTypes, ElementTypes } from '/imports/db/platform/collections'


Interpreter.methods({

	createDiagram: function(diagram_name, diagram_type_id) {

		var diagram_type = DiagramTypes.findOne({_id: diagram_type_id});
		if (!diagram_type) {
			return;
		}

		var list = {name: diagram_name};
		var res = Interpreter.executeExtensionPoint(diagram_type, "beforeCreateDiagram", list);

		if (res != false) {
			Interpreter.executeExtensionPoint(diagram_type, "createDiagram", list);

			Utilities.callMeteorMethod("insertDiagram", list, function(id) {

				list["diagramId"] = id;
				Interpreter.executeExtensionPoint(diagram_type, "afterCreateDiagram", list);

				if (id) {
					FlowRouter.go("diagram", {projectId: list["projectId"],
											_id: id,
											diagramTypeId: list["diagramTypeId"],
											versionId: list["versionId"],
										});
				}

			});
		}
	},

	delete_diagram: function(diagram_id) {

		if (!diagram_id) {
			diagram_id = Session.get("activeDiagram");
		}

		var diagram = Diagrams.findOne({_id: diagram_id});
		if (diagram) {
			var diagram_type_id = diagram["diagramTypeId"];
			var diagram_type = DiagramTypes.findOne({_id: diagram_type_id});
			if (!diagram_type) {
				diagram_type = DiagramTypes.findOne({});
				if (!diagram_type) {
					return;
				}
			}

			var list = {id: diagram_id};
			var res = Interpreter.executeExtensionPoint(diagram_type, "beforeDeleteDiagram", list);
			if (res != false) {
				Interpreter.executeExtensionPoint(diagram_type, "deleteDiagram", list);
				Interpreter.executeExtensionPoint(diagram_type, "afterDeleteDiagram", list);
			}
		}
	},

	CreateDiagram: function(list) {

		var obj_type = this;

		list["projectId"] = Session.get("activeProject");
		list["versionId"] = Session.get("versionId");
		list["style"] = obj_type["style"];
		list["diagramTypeId"] = obj_type["_id"];
		list["editorType"] = obj_type["editorType"];
	},

	DeleteDiagramObject: function(list) {

		var obj_type = this;

		list["projectId"] = Session.get("activeProject");
		list["versionId"] =	Session.get("versionId");

		Utilities.callMeteorMethod("removeDiagram", list);
		FlowRouter.go("diagrams", {projectId: Session.get("activeProject"), versionId: Session.get("versionId")});
	},

	AddTargetDiagram: function() {

		var elem_type = ElementTypes.findOne({_id: Session.get("activeElementType")});
		if (elem_type) {

			//vajag new diagram type
			var diagram_type = DiagramTypes.findOne({_id: elem_type["targetDiagramTypeId"]});
			if (!diagram_type) {
				return;
			}

			var elem_id = Session.get("activeElement");
			var compart = Compartments.findOne({elementId: elem_id, isObjectRepresentation: true});
			if (!compart) {
				compart = Compartments.findOne({elementId: elem_id});
			}

			var diagram = {projectId: Session.get("activeProject"),
							versionId: Session.get("versionId"),
							name: compart["value"] || "Diagram",
							diagramTypeId: diagram_type["_id"],
							style: diagram_type["style"],
						};

			var element = {projectId: Session.get("activeProject"),
							versionId: Session.get("versionId"),
							id: elem_id,
						};

			var list = {parentDiagram: Session.get("activeDiagram"), diagram: diagram, element: element};

			Utilities.callMeteorMethod("addTargetDiagram", list);
		}
	},

	Navigate: function() {
		var elem = Elements.findOne({_id: Session.get("activeElement")});
		if (elem) {
			var target_id = elem["targetId"];
			if (target_id) {

				var stage = Interpreter.editor;
				stage["selection"] = [];
				stage["selected"] = {};

				FlowRouter.go("diagram", {projectId: Session.get("activeProject"),
										_id: target_id,
										diagramTypeId: Session.get("diagramType"),
										versionId: Session.get("versionId"),
										editMode: "edit",
									});
			}
		}
	},

	ChangeCollectionPosition: function(list) {
	    list["projectId"] = Session.get("activeProject");
	    list["versionId"] = Session.get("versionId");

	    Utilities.callMeteorMethod("changeCollectionPosition", list);
	},


	align_selected_boxes: function(list) {
		console.log("align selected boxes")
		// Interpreter.editor.alignSelection(0, 1);

	 //    list["projectId"] = Session.get("activeProject");
	 //    list["versionId"] = Session.get("versionId");

	 //    Utilities.callMeteorMethod("changeCollectionPosition", list);
	},

  ComputeFlowLayout: function() {
    // remember existing
		let editor = Interpreter.editor;
		let remembered_layout_settings = { ...editor.layoutSettings };

    editor.layoutSettings.layout = "INVERSE_VERTICAL";
    Interpreter.execute("ComputeLayout");

    // restore 
    editor.layoutSettings = remembered_layout_settings;
  },

  ComputeUniversalLayout: function() {
    // remember existing
		let editor = Interpreter.editor;
		let remembered_layout_settings = { ...editor.layoutSettings };

    editor.layoutSettings.layout = "UNIVERSAL";
    Interpreter.execute("ComputeLayout");

    // restore 
    editor.layoutSettings = remembered_layout_settings;
  },

	ComputeLayout: function(x, y, boxes, lines) {
		let editor = Interpreter.editor;

		let layout_settings = editor.layoutSettings;
    let layoutType = layout_settings.layout;

    let layoutEngine = editor.layoutEngine(layoutType);

		let elements_to_map = {};
		let elements_from_map = {};

		x = x || 0;
		y = y || 0;

		let elements = editor.getElements();
		boxes = boxes || _.filter(elements, function(elem) {
							return elem.type == "Box";
						});

		lines = lines || _.filter(elements, function(elem) {
							return elem.type == "Line";
						});

		_.each(boxes, function(box, i) {
			let position = box.getElementPosition();

			let width = position.width;
			let height = position.height;
			if (box.compartments) {
				let compart_width = 0;
				let compart_height = 0;

				Compartments.find({elementId: box._id}).forEach(function(compart) {
					//calculate width and height only for visible compartments
					if(compart.style.visible == true){
            if (!compart.value) return;
						let value = compart.value.trimStart();
						if (value == "") {
							return;
						}

						let font_size = compart.style.fontSize;
						let tmp_width = 0;
						let tmp_height = 0;

						let splitted_value = value.split(/\r?\n/);
						_.each(splitted_value, function(row) {
							if (row == "") {
								return;
							}

							//text_length = number_of_charecters_in_string / 2 rounded towards the greater value
							let text_length = row.length * Math.ceil(font_size/2);
							tmp_width = Math.max(tmp_width, text_length);

							//tmp_height = font_size + consant for gap between compartments
							tmp_height += font_size + 5; // add a height gap between compartments

							// if compartment lenght if bigger than max box width
							if(text_length > 500){
								//compartment height = font_size * (text_length/max_box_width/2 rounded towards the greater value)
								tmp_height += font_size * Math.ceil(text_length/500/2) + 5;
							}
						});

						compart_width = Math.max(compart_width, tmp_width);
						compart_height += tmp_height;
					}
				});

				if (compart_width != 0) {
					width = compart_width + 5;
				}

				if (compart_height != 0) {
					height = compart_height + 5;
				}
			}
			//min height
			if(height < 30) height = 30;
			//min width
			if(width < 120) width = 120;

			layoutEngine.addBox(i, position.x, position.y, width, height);

			let box_id = box._id;
			if (!_.isNumber(elements_to_map[box_id])) {
				elements_to_map[box_id] = i;
				elements_from_map[i] = box;
			}
		});

		let k = _.size(boxes) + _.size(lines);
		_.each(lines, function(line, j) {
			let i = _.size(boxes) + j;

/*      
			let options = {lineType: "ORTHOGONAL",};
			if (_.isNumber(line.startSides)) {
				_.extend(options, {startSides: line.startSides,});
			}

			if (_.isNumber(line.endSides)) {
				_.extend(options, {endSides: line.endSides,});
			}

			// iespejams ir labaks veids, ka so parbaudit, neizmantojot hard-coded konstanti
			if (layoutType == "INVERSE_VERTICAL") {
        // FIXME: hack: ja līnijai ir teksts, tad tā nav apakšklases (plūsmas) līnija
        // vajadzētu plūsmas pazīmi saņemt jau datos, vai nu no konfigurācijas, vai no import_ontology
				let line_layout_settings = line.layoutSettings;
				console.log("this is line layout settings ", line_layout_settings);


        if (line?.compartments?.compartments[0]?.value?.trim()) {
          options.isFlowEdge = false;
          options.startSides = 10; // sānu malas
          options.endSides = 15;
        } else {
          options.isFlowEdge = true;
          options.startSides = 5; // augša vai apakša
          options.endSides = 5;
        }
      }

			layoutEngine.addLine(i, elements_to_map[line.startElementId], elements_to_map[line.endElementId], options);
*/      

      const DEFAULT_LINE_LAYOUT = { isFlowEdge: false, startSides: 15, endSides: 15, lineType: 'ORTHOGONAL' }

      layoutEngine.addLine(i, elements_to_map[line.startElementId], elements_to_map[line.endElementId], line.layoutSettings ?? DEFAULT_LINE_LAYOUT);

			let line_id = line._id;
			if (!_.isNumber(elements_to_map[line_id])) {
				elements_to_map[line_id] = i;
				elements_from_map[i] = line;
			}

			if (line.compartments && line.compartments.compartments) {

				_.each(line.compartments.compartments, function(compart) {
					k++;
					let placement = compart.placement;
					layoutEngine.addLineLabel(k, i, placement.width, placement.height, placement.name);
				});
			}
		});


    // let new_layout = arrangeIncrementally ? layoutEngine.arrangeIncrementally() : layoutEngine.arrangeFromScratch();
		let new_layout = layoutEngine.arrangeFromScratch();
		if (layoutType == "arrangeIncrementally") {
			new_layout = layoutEngine.arrangeIncrementally();
		}

    console.log('the new layout is', new_layout)
    // FIXME: te nekas netiek darīts ar sarēķinātajām iezīmju vietām ( new_layout.labels[] ) !!

		let moved_boxes = _.map(new_layout.boxes, function(box_in, key) {
							let box = elements_from_map[key];
							if (!box) {
								console.error("No box", key, elements_from_map);
								return;
							}
							let box_x = x + box_in.x;
							let box_y = y + box_in.y

							box.setElementPosition(box_x, box_y);
							box.updateSize(box_in.width, box_in.height);

							return {id: box._id, position: {x: box_x,
															y: box_y,
															width: box_in.width,
															height: box_in.height,
														},};
						});

    	let new_lines = _.map(new_layout.lines, function(line_in, key) {
				    		let line_new_points = [];
				    		_.each(line_in, function(line) {
				    			line_new_points.push(x + line.x);
				    			line_new_points.push(y + line.y);
				    		});

				    		let line = elements_from_map[key];
				    		if (!line) {
									console.error("No line", key, elements_from_map);
									return;
								}

			    			line.setPoints(line_new_points);
							// link.setPoints(line_points);
							// OrthogonalRerouting.recompute(link, state);

				    		return {id: line._id, points: line_new_points};
				    	});

		let list = {projectId: Session.get("activeProject"),
								versionId: Session.get("versionId"),
								diagramId: Session.get("activeDiagram"),
								lines: new_lines,
								movedBoxes: moved_boxes,
								isLayoutComputationNeededOnLoad: editor.isLayoutComputationNeededOnLoad,
							};

		Utilities.callMeteorMethod("changeCollectionPosition", list, function() {
			editor.size.recomputeStageBorders();
		});

	},

});

