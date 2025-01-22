import { DiagramTypes, ElementTypes, CompartmentTypes, Projects, Diagrams, Elements, Compartments } from '/imports/db/platform/collections'



Meteor.methods({

    importOntologyNew: function(list, ontology) {
		var user_id = Meteor.userId();

        let project = Projects.findOne({_id: list.projectId,});
        if (!project) {
         console.error("No Project");
         return;
        }

        let tool_id = project.toolId;

		let diagram_type = DiagramTypes.findOne({name: "DataSchema", toolId: tool_id,});
		if (!diagram_type) {
			console.error("No diagram type");
			return;
		}

		let diagram_object = {name: `DataSchema - ${ontology.Schema}`,
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
                                description:`${ontology.ClassCount} classes, ${ontology.NodesCount} nodes, ${ontology.LinesCount + ontology.generalizationCount} (${ontology.LinesCount}a + ${ontology.generalizationCount}g) lines, Merging level - ${ontology.params.diffG}` 
							};
        
        //if ( !ontology.hasGeneralization ) {
        //    console.log('Mēģinam likt klāt citu izvietojumu', ontology.Schema)
        //    diagram_object['layoutSettings'] = {layout: 'UNIVERSAL', arrangeMethod: 'arrangeFromScratch'};
        //    //console.log(diagram_object, diagram_object.description, 'aaaaa')
        //}

        let new_diagram_id = Diagrams.insert(diagram_object);
		let element_map = {};

        // Namespaces part 
        let ns_type = ElementTypes.findOne({name: "Namespaces", diagramTypeId: diagram_type._id});
        if (!ns_type) {
			console.error("No Namespaces type");
			return;
		}    
        let ns_style = ns_type["styles"][0];
		let ns_style_id = ns_style["id"];   
        let ns_object = {diagramId: new_diagram_id,
            type: "Box",
            location: {x: 10, y: 10, width: 5, height: 5},
            styleId: ns_style_id,
            style: ns_style,
            elementTypeId: ns_type._id,
            diagramTypeId: diagram_type._id,
            projectId: list.projectId,
            versionId: list.versionId,
        };
        list.diagram_id = new_diagram_id;
		list.diagram_type_id = diagram_type._id;
        list.compactClassView = ontology.CompactClassView;
        list.uStrings = ontology.uStrings;

        let ns_element = Elements.insert(ns_object);
        //const nsProc = (ontology.Namespaces.n_0.compartments.List.length > 35) ? Math.round(3500/ontology.Namespaces.n_0.compartments.List.length) : 100; 
        //add_one_compartment_from_list(list, "List", ontology.Namespaces.n_0.compartments.List, '', nsProc, new_diagram_id, diagram_type._id, ns_element, ns_type._id, false)
        list.element_id = ns_element;
        list.element_type_id = ns_type._id;
        add_one_compartment_from_list(list, "List", ontology.Namespaces.n_0.compartments.List, '', {cut:false}, false)

        // Class part 
		let class_type = ElementTypes.findOne({name: "Class", diagramTypeId: diagram_type._id});
		if (!class_type) {
			console.error("No Class type");
			return;
		}

        list.element_type_id = class_type._id;
		_.each(ontology.Class, function(item, key) {

			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

            let class_style = class_type["styles"][0];
            let class_style_old = class_type["styles"].find(function(s){ return s.name == item.compartments.TypeOld});
            let class_style_new = class_type["styles"].find(function(s){ return s.name == item.compartments.TypeNew});
            if ( class_style_old != undefined )
                class_style = class_style_old; 
            if ( class_style_new != undefined )
                class_style = class_style_new; 

			let object = {diagramId: new_diagram_id,
							type: "Box",
							location: {x: 10, y: 10, width: 5, height: 5},
							styleId: class_style["id"],
							style: class_style,
							elementTypeId: class_type._id,
							diagramTypeId: diagram_type._id,
							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_box_id = Elements.insert(object);
			element_map[key] = new_box_id;
            list.element_id = new_box_id;

			add_class_compartments(list, item);
		});

		// Gen part
		let gen_type = ElementTypes.findOne({name: "Generalization", diagramTypeId: diagram_type._id});
		if (!gen_type) {
			console.error("No Gen type");
			return;
		}

		let gen_style = gen_type["styles"][0];
        let gen_layoutSettings = ( gen_type.layoutSettings != undefined) ?  gen_type.layoutSettings : {};

		_.each(ontology.Generalization, function(item, key) {
			let object = {diagramId: new_diagram_id,
							type: "Line",
							points: [0, 20, 20, 20],
                            startElement: element_map[item.target],
							endElement: element_map[item.source],
                            startSides: gen_type.startSides || 4,
                            endSides: gen_type.endSides || 1,
							styleId: gen_style["id"],
							elementTypeId: gen_type._id,
							diagramTypeId: diagram_type._id,
                            style:{
								elementStyle: gen_style.elementStyle,
								startShapeStyle: gen_style.startShapeStyle,
								endShapeStyle: gen_style.endShapeStyle,
								lineType: "Orthogonal",
                            },
                            layoutSettings: gen_layoutSettings,
							projectId: list.projectId,
							versionId: list.versionId,
						};

            let new_gen_id = Elements.insert(object);
			element_map[key] = new_gen_id;  // Priekš kam ?

		});


		// Lines part
		let line_type = ElementTypes.findOne({name: "ObjectProperty", diagramTypeId: diagram_type._id});
		if (!line_type) {
			console.error("No Line type");
			return;
		}
        list.element_type_id = line_type._id;

		let line_style = line_type["styles"][0];
        let line_layoutSettings = ( line_type.layoutSettings != undefined) ?  line_type.layoutSettings : {};
        let cut_info = {cut:false, class_cnt:0, max:5};

		_.each(ontology.ObjectProperty, function(item, key) {
			let object = {diagramId: new_diagram_id,
							type: "Line",
							points: [0, 10, 10, 10],
							startElement: element_map[item.source],
							endElement: element_map[item.target],
							styleId: line_style["id"],
                            style:{
								elementStyle: line_style.elementStyle,
								startShapeStyle: line_style.startShapeStyle,
								endShapeStyle: line_style.endShapeStyle,
								lineType: "Orthogonal",
                            },
                            layoutSettings: line_layoutSettings,
							elementTypeId: line_type._id,
							diagramTypeId: diagram_type._id,
							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_line_id = Elements.insert(object);
            list.element_id = new_line_id;
            element_map[key] = new_line_id;
            cut_info.class_cnt = ontology.Class[item.source].Cnt;
            const lineCompCount = 5;
            cut_info.cut = item.compartments.Name.length > lineCompCount;
            cut_info.max = lineCompCount; 
            add_one_compartment_from_list(list, "Name", item.compartments.Name, '', cut_info);
		});
        
        // Intersect Lines part
		let iline_type = ElementTypes.findOne({name: "intersection", diagramTypeId: diagram_type._id});
		if (!iline_type) {
			console.error("No intersection Line type");
			return;
		}
        list.element_type_id = iline_type._id;

		let iline_style = iline_type["styles"][0];
        let iline_layoutSettings = ( iline_type.layoutSettings != undefined) ?  iline_type.layoutSettings : {};

		_.each(ontology.Intersect, function(item, key) {
			let object = {diagramId: new_diagram_id,
							type: "Line",
							points: [0, 10, 10, 10],
							startElement: element_map[item.source],
							endElement: element_map[item.target],
							styleId: iline_style["id"],
                            style:{
								elementStyle: iline_style.elementStyle,
								startShapeStyle: iline_style.startShapeStyle,
								endShapeStyle: iline_style.endShapeStyle,
								lineType: "Orthogonal",
                            },
                            layoutSettings: iline_layoutSettings,
							elementTypeId: iline_type._id,
							diagramTypeId: diagram_type._id,
							projectId: list.projectId,
							versionId: list.versionId,
						};

			let new_line_id = Elements.insert(object);
            list.element_id = new_line_id;
            element_map[key] = new_line_id;
            add_one_compartment(list, "Information", item.compartments.Information, '');
		})
	},
});

function add_compartment(list, item, diagram_id, diagram_type_id, element_id, element_type_id) {
    // Vecajam Artūra variantam
	let compartments = item.compartments;

	let fill = "";
	let placement = "";
	let value = "";
	if (compartments.string) {
		value = replace_newline(compartments.string);
		placement = "start-left";
		fill = "rgb(65,113,156)";
	}
	else {
		value = replace_newline(compartments.name) + "\n" + replace_newline(compartments.atr_string) + "\n" + replace_newline(compartments.group_string);
		placement = "inside";
		fill = "white";

	}


	let compartment_type = CompartmentTypes.findOne({elementTypeId: element_type_id,});
	if (!compartment_type) {
		console.error("No compartment type");
		return;
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

function add_class_compartments(list, item ) {
	let compartments = item.compartments;
    // Class Name
    add_one_compartment(list, "Name", compartments.Name, compartments.Name)
  
    const outCount = 7;
    const inCount = 5;
    const classCount = 7;
    let cut_info = {cut:false, class_cnt:item.Cnt, max:7};
    if ( item.Cnt < 3 ) { // TODO Tāda ne pārāk smuka cīņa ar mazajām daudzpropertiju klasēm
        cut_info.class_cnt = 3;
    }

    // Attributes
    if ( compartments.AttributesT.out.length > 0 ) {
        cut_info.cut = compartments.AttributesT.out.length > outCount;
        cut_info.max = outCount; 
        add_one_compartment_from_list(list, "PropOut", compartments.AttributesT.out, '', cut_info)
    }
    if ( compartments.AttributesT.in.length > 0 ) {
        cut_info.cut = compartments.AttributesT.in.length > inCount;
        cut_info.max = inCount; 
        add_one_compartment_from_list(list, "PropIn", compartments.AttributesT.in, `${list.uStrings.u_in_prop} `, cut_info)
    }
    if ( compartments.AttributesT.c.length > 0 ) {
        cut_info.cut = compartments.AttributesT.c.length > inCount;
        cut_info.max = inCount; 
        add_one_compartment_from_list(list, "PropC", compartments.AttributesT.c, `${list.uStrings.u_c_prop} `, cut_info)
    }

    //SubClasses
    if ( compartments.ClassList.length > 0 ) {
        cut_info.cut = compartments.ClassList.length > classCount;
        cut_info.max = classCount; 
        add_one_compartment_from_list(list, "ClassList", compartments.ClassList, '', cut_info);
    }

}

function add_one_compartment_from_list(list, compartmentName, value_list, pref, cut_info, sort = true) {
    const input = ( sort ) ? replace_newline(value_list.map(a => a.name).sort().join('\n')) : replace_newline(value_list.map(a => a.name).join('\n'));
    const length = value_list.length;  
    let max_count = value_list.length; 
    if ( !list.compactClassView && compartmentName != 'ClassList')
        cut_info.cut = false; 
    if ( cut_info.cut ) {
        const values75 = value_list.filter(function(v){ return v.cnt > 0.75*cut_info.class_cnt; });
        const values50 = value_list.filter(function(v){ return v.cnt > 0.5*cut_info.class_cnt; });
        //const values10 = value_list.filter(function(v){ return v.cnt > 0.1*cut_info.class_cnt; });
        if ( values75.length > cut_info.max )
            max_count = values75.length;
        else if ( values50.length > cut_info.max )
            max_count = values50.length;
        //else if ( values10.length > cut_info.max )
        //    max_count = values10.length;
        else
            max_count = cut_info.max;

        if ( length - max_count < 3 )
            max_count = length;
    }
 
    if ( max_count < length ) {
        value_list = value_list.slice(0, max_count);
    }
    let value = ( sort ) ? replace_newline(value_list.map(a => `${pref}${a.name}`).sort().join('\n')) : replace_newline(value_list.map(a => `${pref}${a.name}`).join('\n'));
    if ( max_count < length )  value = `${value}\n...(${length-max_count})...`; 

    add_one_compartment(list, compartmentName, input, value);
}

/*
function add_one_compartment_from_list(list, compartmentName, value_list, pref, proc, diagram_id, diagram_type_id, element_id, element_type_id, sort = true) {
    const input = ( sort ) ? replace_newline(value_list.map(a => a.name).sort().join('\n')) : replace_newline(value_list.map(a => a.name).join('\n'));
    const max_count = Math.round(value_list.length*proc/100);
    const length = value_list.length;   
    if ( value_list.length < 3 || length-max_count == 1) proc = 100; // TODO šis ir lai nesanāk dīvaini
    if ( proc < 100 ) {
        value_list = value_list.slice(0, max_count);
    }
    let value = ( sort ) ? replace_newline(value_list.map(a => `${pref}${a.name}`).sort().join('\n')) : replace_newline(value_list.map(a => `${pref}${a.name}`).join('\n'));
    if ( proc < 100 )  value = `${value}\n...(${length-max_count})...`; 

    add_one_compartment(list, compartmentName, input, value);
} */

function add_one_compartment(list, compartmentName, input, value) {

	let compartment_type = CompartmentTypes.findOne({elementTypeId: list.element_type_id, name:compartmentName});
	if (!compartment_type) {
		console.error("No compartment type", compartmentName);
		return;
	}

	let style_obj = compartment_type["styles"][0];
	let style = style_obj["style"];

	let compart_obj = {diagramId: list.diagram_id,
						diagramTypeId: list.diagram_type_id,
						projectId: list.projectId,
						versionId: list.versionId,
						elementId: list.element_id,
						elementTypeId: list.element_type_id,
						compartmentTypeId: compartment_type._id,
						style: style,
						styleId: style_obj["id"],
						isObjectRepresentation: false,
						index: 1,
						input: input,
						value: value,
						valueLC: value,
					};

	Compartments.insert(compart_obj);
}

function replace_newline(str) {
	str = str || "";
	return str.replace(/\\n/g, "\n");
}


