import { DiagramTypes, ElementTypes, CompartmentTypes, Projects, Diagrams, Elements, Compartments } from '../../../db/platform/collections.js'



Meteor.methods({

    importOntologyNew: async function(list, ontology) {
		var user_id = Meteor.userId();

        let project = await Projects.findOneAsync({_id: list.projectId,});
        if (!project) {
         console.error("No Project");
         return;
        }

        let tool_id = project.toolId;

		let diagram_type = await DiagramTypes.findOneAsync({name: "DataSchema", toolId: tool_id,});
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
								imageUrl: "https://placehold.co/770x347",
								parentDiagrams: [],
								allowedGroups: [],
								editing: {},
								seenCount: 0,
								projectId: list.projectId,
								versionId: list.versionId,
								isLayoutComputationNeededOnLoad: 1,
                description:ontology.diagram_description
							};

        //if ( !ontology.hasGeneralization ) {
        //    console.log('Mēģinam likt klāt citu izvietojumu', ontology.Schema)
        //    diagram_object['layoutSettings'] = {layout: 'UNIVERSAL', arrangeMethod: 'arrangeFromScratch'};
        //    //console.log(diagram_object, diagram_object.description, 'aaaaa')
        //}

      let new_diagram_id = await Diagrams.insertAsync(diagram_object);
		  let element_map = {};

      // Namespaces part

      let ns_type = await ElementTypes.findOneAsync({name: "Namespaces", diagramTypeId: diagram_type._id});
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

        let ns_element = await Elements.insertAsync(ns_object);
        //const nsProc = (ontology.Namespaces.n_0.compartments.List.length > 35) ? Math.round(3500/ontology.Namespaces.n_0.compartments.List.length) : 100;
        //add_one_compartment_from_list(list, "List", ontology.Namespaces.n_0.compartments.List, '', nsProc, new_diagram_id, diagram_type._id, ns_element, ns_type._id, false)
        list.element_id = ns_element;
        list.element_type_id = ns_type._id;
        await add_one_compartment_from_list(list, "List", ontology.Namespaces.n_0.compartments.List, '', {cut:false}, false)


    // Class part
		let class_type = await ElementTypes.findOneAsync({name: "Class", diagramTypeId: diagram_type._id});
		if (!class_type) {
			console.error("No Class type");
			return;
		}

    list.element_type_id = class_type._id;
		for (const key of Object.keys(ontology.Class)) {
			const item = ontology.Class[key];
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

            let class_style = class_type["styles"][0];
            let class_style_old = class_type["styles"].find(function(s){ return s.name === item.TypeOld});
            let class_style_new = class_type["styles"].find(function(s){ return s.name === item.TypeNew});
            if ( class_style_old !== undefined )
                class_style = class_style_old;
            if ( class_style_new !== undefined )
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

			let new_box_id = await Elements.insertAsync(object);
			element_map[key] = new_box_id;
            list.element_id = new_box_id;

			await add_class_compartments(list, item);
		}
		/*
		_.each(ontology.Class, async function(item, key) {

			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

            let class_style = class_type["styles"][0];
            let class_style_old = class_type["styles"].find(function(s){ return s.name === item.compartments.TypeOld});
            let class_style_new = class_type["styles"].find(function(s){ return s.name === item.compartments.TypeNew});
            if ( class_style_old !== undefined )
                class_style = class_style_old;
            if ( class_style_new !== undefined )
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

			let new_box_id = await Elements.insertAsync(object);
			element_map[key] = new_box_id;
            list.element_id = new_box_id;

			await add_class_compartments(list, item);
		});
		*/

		// Gen part
		let gen_type = await ElementTypes.findOneAsync({name: "Generalization", diagramTypeId: diagram_type._id});
		if (!gen_type) {
			console.error("No Gen type");
			return;
		}

		let gen_style = gen_type["styles"][0];
        let gen_layoutSettings = ( gen_type.layoutSettings !== undefined) ?  gen_type.layoutSettings : {};

		for (const key of Object.keys(ontology.Generalization)) {
			const item = ontology.Generalization[key];
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

            let new_gen_id = await Elements.insertAsync(object);
			element_map[key] = new_gen_id;  // Priekš kam ?
		}
		/*
		_.each(ontology.Generalization, async function(item, key) {
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

            let new_gen_id = await Elements.insertAsync(object);
			element_map[key] = new_gen_id;  // Priekš kam ?

		});
		*/

		// Lines part
		let line_type = await ElementTypes.findOneAsync({name: "ObjectProperty", diagramTypeId: diagram_type._id});
		if (!line_type) {
			console.error("No Line type");
			return;
		}
        list.element_type_id = line_type._id;

		let line_style = line_type["styles"][0];
        let line_layoutSettings = ( line_type.layoutSettings !== undefined) ?  line_type.layoutSettings : {};
        let cut_info = {cut:false, class_cnt:0, max:5};

		for (const key of Object.keys(ontology.ObjectProperty)) {
			const item = ontology.ObjectProperty[key];
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

			let new_line_id = await Elements.insertAsync(object);
			list.element_id = new_line_id;
			element_map[key] = new_line_id;
			cut_info.class_cnt = ontology.Class[item.source].Cnt;
			const lineCompCount = 5;
			cut_info.cut = item.compartments.Name.length > lineCompCount;
			cut_info.max = lineCompCount;
			await add_one_compartment_from_list(list, "Name", item.compartments.Name, '', cut_info);
		}
		/*
		_.each(ontology.ObjectProperty, async function(item, key) {
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

			let new_line_id = await Elements.insertAsync(object);
            list.element_id = new_line_id;
            element_map[key] = new_line_id;
            cut_info.class_cnt = ontology.Class[item.source].Cnt;
            const lineCompCount = 5;
            cut_info.cut = item.compartments.Name.length > lineCompCount;
            cut_info.max = lineCompCount;
            await add_one_compartment_from_list(list, "Name", item.compartments.Name, '', cut_info);
		});
		*/

        // Intersect Lines part
		let iline_type = await ElementTypes.findOneAsync({name: "intersection", diagramTypeId: diagram_type._id});
		if (!iline_type) {
			console.error("No intersection Line type");
			return;
		}
        list.element_type_id = iline_type._id;

		let iline_style = iline_type["styles"][0];
        let iline_layoutSettings = ( iline_type.layoutSettings !== undefined) ?  iline_type.layoutSettings : {};

		for (const key of Object.keys(ontology.Intersect)) {
			const item = ontology.Intersect[key];
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

			let new_line_id = await Elements.insertAsync(object);
			list.element_id = new_line_id;
			element_map[key] = new_line_id;
			await add_one_compartment(list, "Information", item.compartments.Information, '');
		}
		/*
		_.each(ontology.Intersect, async function(item, key) {
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

			let new_line_id = await Elements.insertAsync(object);
            list.element_id = new_line_id;
            element_map[key] = new_line_id;
            await add_one_compartment(list, "Information", item.compartments.Information, '');
		})
		*/
	},
	addClassCompartments: async function (list, item) {
		await add_class_compartments(list, item);
	},
	addOneCompartmentFromList: async function (list, compartmentName, value_list, pref, cut_info) {
		await add_one_compartment_from_list(list, compartmentName, value_list, pref, cut_info);
	},
});

async function add_class_compartments(list, item) {
	let compartments = item.compartments;
    // Class Name
    await add_one_compartment(list, "Name", compartments.Name, compartments.Name)

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
        await add_one_compartment_from_list(list, "PropOut", compartments.AttributesT.out, '', cut_info)
    }
    if ( compartments.AttributesT.in.length > 0 ) {
        cut_info.cut = compartments.AttributesT.in.length > inCount;
        cut_info.max = inCount;
        await add_one_compartment_from_list(list, "PropIn", compartments.AttributesT.in, `${list.uStrings.u_in_prop} `, cut_info)
    }
    if ( compartments.AttributesT.c.length > 0 ) {
        cut_info.cut = compartments.AttributesT.c.length > inCount;
        cut_info.max = inCount;
        await add_one_compartment_from_list(list, "PropC", compartments.AttributesT.c, `${list.uStrings.u_c_prop} `, cut_info)
    }

    //SubClasses
    if ( compartments.ClassList.length > 0 ) {
        cut_info.cut = compartments.ClassList.length > classCount;
        cut_info.max = classCount;
        await add_one_compartment_from_list(list, "ClassList", compartments.ClassList, '', cut_info, true, item.IsGroup );
    }

}

async function add_one_compartment_from_list(list, compartmentName, value_list, pref, cut_info, sort = true, isGroup = false) {
    const input = ( sort ) ? replace_newline(value_list.map(a => a.name).sort().join('\n')) : replace_newline(value_list.map(a => a.name).join('\n'));
    const length = value_list.length;
    let max_count = value_list.length;
    if ( compartmentName === 'ClassList' ||  compartmentName === 'Name' ) {
      const nList = value_list.map(a => a.shortName)
      await add_one_compartment(list, 'SchemaInformation', JSON.stringify(nList), JSON.stringify(nList));
    }
    if ( !list.compactClassView && compartmentName !== 'ClassList')
        cut_info.cut = false;
    else if ( !list.compactClassView && compartmentName === 'ClassList' && length < 20) // Tāda šaubiga konstante
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

    if ( compartmentName === 'ClassList' && !isGroup ) { // ( compartmentName === 'ClassList' && value_list.length === 1 ) {
      value = '';
    }
    await add_one_compartment(list, compartmentName, input, value);
}

/*
function add_one_compartment_from_list(list, compartmentName, value_list, pref, proc, diagram_id, diagram_type_id, element_id, element_type_id, sort = true) {
    const input = ( sort ) ? replace_newline(value_list.map(a => a.name).sort().join('\n')) : replace_newline(value_list.map(a => a.name).join('\n'));
    const max_count = Math.round(value_list.length*proc/100);
    const length = value_list.length;
    if ( value_list.length < 3 || length-max_count === 1) proc = 100; // TODO šis ir lai nesanāk dīvaini
    if ( proc < 100 ) {
        value_list = value_list.slice(0, max_count);
    }
    let value = ( sort ) ? replace_newline(value_list.map(a => `${pref}${a.name}`).sort().join('\n')) : replace_newline(value_list.map(a => `${pref}${a.name}`).join('\n'));
    if ( proc < 100 )  value = `${value}\n...(${length-max_count})...`;

    add_one_compartment(list, compartmentName, input, value);
} */

async function add_one_compartment(list, compartmentName, input, value) {

	let compartment_type = await CompartmentTypes.findOneAsync({elementTypeId: list.element_type_id, name:compartmentName});
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

	await Compartments.insertAsync(compart_obj);
}

function replace_newline(str) {
	str = str || "";
	return str.replace(/\\n/g, "\n");
}


