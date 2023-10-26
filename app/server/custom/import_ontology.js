import { Tools, DiagramTypes, ElementTypes, CompartmentTypes, Diagrams, Elements, Compartments } from '/libs/platform/collections'

let ontology = {
  Gen: {
    c_10_c_7_10: {
      compartments: {
        Val: " "
      },
      source: "c_7_10",
      target: "c_10"
    },
    c_16_c_6: {
      compartments: {
        Val: " "
      },
      source: "c_6",
      target: "c_16"
    },
    c_2_c_6: {
      compartments: {
        Val: " "
      },
      source: "c_6",
      target: "c_2"
    },
    c_4_c_5: {
      compartments: {
        Val: " "
      },
      source: "c_5",
      target: "c_4"
    },
    c_7_c_7_10: {
      compartments: {
        Val: " "
      },
      source: "c_7_10",
      target: "c_7"
    },
    c_8_c_5: {
      compartments: {
        Val: " "
      },
      source: "c_5",
      target: "c_8"
    }
  },
  Line3: {
    c_16_c_1: {
      compartments: {
        A: "dbo:affiliation (797)/797 [*] DR",
        name: "c_16_c_1"
      },
      source: "c_16",
      target: "c_1"
    },
    c_16_c_7_10: {
      compartments: {
        A: "dbo:birthPlace (2004)/2004 [*] DR\\ndbo:deathPlace (1308)/1308 [*] DR",
        name: "c_16_c_7_10"
      },
      source: "c_16",
      target: "c_7_10"
    },
    c_1_c_10: {
      compartments: {
        A: "dbo:country (345)/345 [*] DR",
        name: "c_1_c_10"
      },
      source: "c_1",
      target: "c_10"
    },
    c_1_c_7: {
      compartments: {
        A: "dbo:city (338)/338 [1] DR",
        name: "c_1_c_7"
      },
      source: "c_1",
      target: "c_7"
    },
    c_2_c_7_10: {
      compartments: {
        A: "schema_s:foundingLocation (44)/44 [*] DR",
        name: "c_2_c_7_10"
      },
      source: "c_2",
      target: "c_7_10"
    },
    c_4_c_1: {
      compartments: {
        A: "nobel:university (799)/799 [*] DR",
        name: "c_4_c_1"
      },
      source: "c_4",
      target: "c_1"
    },
    c_4_c_8: {
      compartments: {
        A: "dct:isPartOf (982)/984 [1] D",
        name: "c_4_c_8"
      },
      source: "c_4",
      target: "c_8"
    },
    c_5_c_6: {
      compartments: {
        A: "nobel:laureate (1966)/1966 [*] DR",
        name: "c_5_c_6"
      },
      source: "c_5",
      target: "c_6"
    },
    c_6_c_4: {
      compartments: {
        A: "nobel:laureateAward (984)/984 [*] DR",
        name: "c_6_c_4"
      },
      source: "c_6",
      target: "c_4"
    },
    c_6_c_8: {
      compartments: {
        A: "nobel:nobelPrize (982)/984 [*] D",
        name: "c_6_c_8"
      },
      source: "c_6",
      target: "c_8"
    },
    c_8_c_4: {
      compartments: {
        A: "dct:hasPart (982)/982 [*] DR",
        name: "c_8_c_4"
      },
      source: "c_8",
      target: "c_4"
    }
  },
  SH: {
    c_1: {
      compartments: {
        A4: "rdfs:label (1023) [*]  ",
        A6: "",
        Type: "Class",
        name: "dbo:University (341)"
      }
    },
    c_10: {
      compartments: {
        A4: "",
        A6: "",
        Type: "Class",
        name: "dbo:Country (127)"
      }
    },
    c_16: {
      compartments: {
        A4: "",
        A6: "",
        Type: "Class",
        name: "foaf:Person (949)"
      }
    },
    c_2: {
      compartments: {
        A4: "dct:created (26) [1] D \\nfoaf:name (75) [*]  \\nrdfs:label (26) [*]  \\nschema_s:foundingDate (26) [1] D ",
        A6: "",
        Type: "Class",
        name: "foaf:Organization (27)"
      }
    },
    c_4: {
      compartments: {
        A4: "nobel:category (984) [1] D -> IRI\\nnobel:motivation (1957) [*] D \\nnobel:share (984) [1] D \\nnobel:sortOrder (984) [1] D \\nnobel:year (984) [1] D \\nrdfs:label (2952) [*]  ",
        A6: "",
        Type: "Class",
        name: "nobel:LaureateAward (984)"
      }
    },
    c_5: {
      compartments: {
        A4: "nobel:categoryOrder (612) [1] D ",
        A6: "",
        Type: "Class",
        name: "dbo:Award (1.60K)"
      }
    },
    c_6: {
      compartments: {
        A4: "dbp:dateOfBirth (949) [1] D \\ndbp:dateOfDeath (650) [1] D \\nfoaf:birthday (949) [1] D \\nfoaf:familyName (947) [1] D \\nfoaf:gender (949) [1] D \\nfoaf:givenName (949) [1] D ",
        A6: "",
        Type: "Class",
        name: "nobel:Laureate (976)"
      }
    },
    c_7: {
      compartments: {
        A4: "",
        A6: "",
        Type: "Class",
        name: "dbo:City (951)"
      }
    },
    c_7_10: {
      compartments: {
        A4: "rdfs:label (3234) [*]  ",
        A6: "",
        Type: "Abstract",
        name: "dbo:City or dbo:Country"
      }
    },
    c_8: {
      compartments: {
        A4: "",
        A6: "",
        Type: "Class",
        name: "nobel:NobelPrize (612)"
      }
    }
  }
}


Meteor.methods({

	importOntology: function(list) {
		var user_id = Meteor.userId();

		let tool = Tools.findOne({name: "Viziquer"});
		if (!tool) {
			console.error("No tool");
			return;
		}

		let diagram_type = DiagramTypes.findOne({name: "Ontology", toolId: tool._id,});
		if (!diagram_type) {
			console.error("No diagram type");
			return;
		}

		let diagram_object = {name: "Ontology diagram",
								diagramTypeId: diagram_type._id,
								style: diagram_type.style,

								createdAt: new Date(),
								createdBy: user_id,
								editorType: "ajooEditor",

								imageUrl: "http://placehold.it/770x347",
								parentDiagrams: [],
								allowedGroups: [],
								editing: {},
								seenCount: 0,
								projectId: list.projectId,
								versionId: list.versionId,
								isLayoutComputationNeededOnLoad: 1,
							};

		let new_diagram_id = Diagrams.insert(diagram_object);
		let element_map = {};

		// Box part
		let box_type = ElementTypes.findOne({type: "Box", diagramTypeId: diagram_type._id});
		if (!box_type) {
			console.error("No box type");
			return;
		}

		let box_style = box_type["styles"][0];
		let box_style_id = box_style["id"];

		let box_compartment_type = CompartmentTypes.findOne({elementTypeId: box_type._id,});
		if (!box_compartment_type) {
			console.error("No compartment type");
			return;
		}

		_.each(ontology.SH, function(item, key) {

			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

			let object = {diagramId: new_diagram_id,
							type: "Box",
							location: {x: 10, y: 10, width: 5, height: 5},
							styleId: box_style_id,
							style: box_style,
							elementTypeId: box_type._id,
							diagramTypeId: diagram_type._id,
							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_box_id = Elements.insert(object);
			element_map[key] = new_box_id;

			add_compartment(list, item, box_compartment_type, new_diagram_id, diagram_type._id, new_box_id, box_type._id);
		});


		// Line3 part
		let line3_type = ElementTypes.findOne({name: "Line", diagramTypeId: diagram_type._id});
		if (!line3_type) {
			console.error("No Line3 type");
			return;
		}

		let line3_style = line3_type["styles"][0];
		let line3_style_id = line3_style["id"];

		let line3_compartment_type = CompartmentTypes.findOne({elementTypeId: line3_type._id,});
		if (!line3_compartment_type) {
			console.error("No compartment type");
			return;
		}

		_.each(ontology.Line3, function(item, key) {
			let object = {diagramId: new_diagram_id,
							type: "Line",
							points: [0, 10, 10, 10],
							startElement: element_map[item.source],
							endElement: element_map[item.target],

							styleId: line3_style_id,
							style: {
								elementStyle: line3_style.elementStyle,
								startShapeStyle: line3_style.startShapeStyle,
								endShapeStyle: line3_style.endShapeStyle,
								lineType: "Orthogonal",
							},

							elementTypeId: line3_type._id,
							diagramTypeId: diagram_type._id,

							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_line_id = Elements.insert(object);
			element_map[key] = new_line_id;

			add_compartment(list, item, line3_compartment_type, new_diagram_id, diagram_type._id, new_line_id, line3_type._id);
		});


		// Gen part
		let gen_type = ElementTypes.findOne({name: "Gen", diagramTypeId: diagram_type._id});
		if (!gen_type) {
			console.error("No Gen type");
			return;
		}

		let gen_style = gen_type["styles"][0];
		let gen_style_id = gen_style["id"];


		let gen_compartment_type = CompartmentTypes.findOne({elementTypeId: gen_type._id,});
		if (!gen_compartment_type) {
			console.error("No compartment type");
			return;
		}

		_.each(ontology.Gen, function(item, key) {
			let object = {diagramId: new_diagram_id,
							type: "Line",
							points: [0, 20, 20, 20],
							startElement: element_map[item.source],
							endElement: element_map[item.target],

							styleId: gen_style_id,

							elementTypeId: gen_type._id,
							diagramTypeId: diagram_type._id,

							style: {
								elementStyle: gen_style.elementStyle,
								startShapeStyle: gen_style.startShapeStyle,
								endShapeStyle: gen_style.endShapeStyle,
								lineType: "Orthogonal",
							},

							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_line_id = Elements.insert(object);
			element_map[key] = new_line_id;

			add_compartment(list, item, gen_compartment_type, new_diagram_id, diagram_type._id, new_line_id, gen_type._id);
		});

	},
});


function add_compartment(list, item, compartment_type, diagram_id, diagram_type_id, element_id, element_type_id) {
	let compartments = item.compartments;

	let fill = "";
	let placement = "";
	let value = "";
	if (compartments.A) {
		value = compartments.A;
		placement = "end-left";
		fill = "rgb(65,113,156)";
	}
	else {
		if (compartments.Val) {
			value = compartments.Val;
			placement = "end-left";
			// fill = "#000000";
			fill = "rgb(65,113,156)";
		}
		else {
			value = replace_newline(compartments.Type) + "\n" + replace_newline(compartments.name) + "\n" + replace_newline(compartments.A4) + "\n" + replace_newline(compartments.A6);
			placement = "inside";
			fill = "white";
			// fill = "blue";
		}
	}

	let style_obj = compartment_type["styles"][0];
	let style = style_obj["style"];
	_.extend(style, {placement: placement,
						strokeWidth: "1",
						fill: fill,
					});

	let compart_obj = {diagramId: diagram_id,
						diagramTypeId: diagram_type_id,
						projectId: list.projectId,
						versionId: list.versionId,
						elementId: element_id,
						elementTypeId: element_type_id,
						compartmentTypeId: compartment_type._id,
						style: style,
						styleId: style_obj["id"],
						isObjectRepresentation: false,
						index: 1,

						input: value,
						value: value,
						valueLC: value,
					};

	Compartments.insert(compart_obj);
}


function replace_newline(str) {
	return str.replace(/\\n/g, "\n");
}