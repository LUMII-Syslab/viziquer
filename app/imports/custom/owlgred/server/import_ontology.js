import { DiagramTypes, ElementTypes, CompartmentTypes, Projects, Diagrams, Elements, Compartments } from '/imports/db/platform/collections'


Meteor.methods({
	importOntologyOWLGrEd: async function(list, ontology, ontologyName) {
		var user_id = Meteor.userId();

        let project = await Projects.findOneAsync({_id: list.projectId,});
        if (!project) {
         console.error("No Project");
         return;
        }

        let tool_id = project.toolId;

		let diagram_type = await DiagramTypes.findOneAsync({name: "Seed", toolId: tool_id,});
		if (!diagram_type) {
			console.error("No diagram type");
			return;
		}

		let ontologyPrefixes = ontology.prefixes;

		let diagram_object = {name: ontologyName,
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
								isLayoutComputationNeededOnLoad: 1
                                // description: "add dascription"
							};

        let new_diagram_id = await Diagrams.insertAsync(diagram_object);
		let element_map = {};

		//Namespaces
		let elemType = await ElementTypes.findOneAsync({name: "Namespaces", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No Namespaces type");
			return;
		}

		let namespaceStyle = elemType["styles"][0];
		let namespaceElem = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, namespaceStyle, false)

		let new_box_id = await Elements.insertAsync(namespaceElem);

		let listForCompartment = {
			diagram_id: new_diagram_id,
			diagram_type_id: diagram_type._id,
			projectId: list.projectId,
			versionId: list.versionId,
			element_id: new_box_id,
			element_type_id: elemType._id
		}

		let prefixes = ontology.prefixes;

		for (const iri in prefixes) {
			if(iri === "") {
				await add_one_compartment(listForCompartment, "Dafault Namespace", prefixes[iri], "Default: <"+ prefixes[iri] + ">");
				let diagram = await Diagrams.findOneAsync({_id:new_diagram_id});
				diagram.name = prefixes[iri];
			}
			else {
				await addCompartmentSubCompartments2(listForCompartment, "Namespaces declarations",[
				{name:"Prefix",value:iri},
				{name:"Namespace",value:prefixes[iri]}
				])
			}
		}

		// Class
		elemType = await ElementTypes.findOneAsync({name: "Class", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No Class type");
			return;
		}

		for (const key of Object.keys(ontology.classes)) {
			const item = ontology.classes[key];
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

            let elemStyle = elemType["styles"][0];
			let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, false)

			let new_box_id = await Elements.insertAsync(object);
			element_map[key] = new_box_id;

			let listForCompartment = {
				diagram_id: new_diagram_id,
				diagram_type_id: diagram_type._id,
				projectId: list.projectId,
				versionId: list.versionId,
				element_id: new_box_id,
				element_type_id: elemType._id
			}

			//Name
			await add_one_compartment(listForCompartment, "Name", item.prefixed, item.prefixed)
			// await add_one_compartment(listForCompartment, "HorizontalLine1", " ", " ")
			await setHorizontalLine(listForCompartment, "HorizontalLine1")

			//Label
			if(item.label) {await addCompartmentSubCompartments2(listForCompartment, "Annotation",[
				  {name:"AnnotationType",value:"Label"},
				  {name:"Value",value:item.label},
				  {name:"Language",value:""},
				])
			}
			//Annotations
			//TO DO
			for(let i = 0; i < item.annotations.length; i++){
			   await addCompartmentSubCompartments2(listForCompartment, "Annotation", item.annotations[i])
			}

			//Attributes
			for(let i = 0; i < item.dataProperties.length; i++){
			   await addCompartmentSubCompartments2(listForCompartment, "Attributes", item.dataProperties[i])
			}

			if(item.dataProperties.length>0){
				await setHorizontalLine(listForCompartment, "HorizontalLine6")
			}

			//superClasses
			for(let i = 0; i < item.superClasses.length; i++){
			   await addCompartmentSubCompartments2(listForCompartment, "SuperClasses", item.superClasses[i])
			}
			if(item.superClasses.length>0){
				await setHorizontalLine(listForCompartment, "HorizontalLine3")
			}

			// DisjointClasses
			for(let i = 0; i < item.disjointWith.length; i++){
			   await addCompartmentSubCompartments2(listForCompartment, "DisjointClasses", item.disjointWith[i])
			}

			if(item.disjointWith.length>0){
				await setHorizontalLine(listForCompartment, "HorizontalLine4")
			}

			// EquivalentClasses
			for(let i = 0; i < item.equivalentClasses.length; i++){
			   await addCompartmentSubCompartments2(listForCompartment, "EquivalentClasses", item.equivalentClasses[i])
			}

			if(item.equivalentClasses.length>0){
				await setHorizontalLine(listForCompartment, "HorizontalLine2")
			}

			// Keys
			for(let i = 0; i < item.keys.length; i++){
			   await addCompartmentSubCompartments2(listForCompartment, "Keys", item.keys[i])
			}

			if(item.keys.length>0){
				await setHorizontalLine(listForCompartment, "HorizontalLine5")
			}


		}

		//Super Classes as boxes
		let superClasses = ontology.superClasses;
		for (const iri in superClasses) {
			let subClasses = superClasses[iri];
			if(subClasses.length > 1){
				// HorizontalFork
			  elemType = await ElementTypes.findOneAsync({name: "HorizontalFork", diagramTypeId: diagram_type._id});
			  if (!elemType) {
					console.error("No HorizontalFork type");
					return;
			  }

			  let elemStyle = elemType["styles"][0];
			  let horizontalFork = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, false)

			  let horizontalFork_box_id = await Elements.insertAsync(horizontalFork);
			  element_map[horizontalFork_box_id] = horizontalFork_box_id;

			  // GeneralizationToFork
			  elemType = await ElementTypes.findOneAsync({name: "GeneralizationToFork", diagramTypeId: diagram_type._id});
			  if (!elemType) {
					console.error("No GeneralizationToFork type");
					return;
			  }

			  elemStyle = elemType["styles"][0];
			  let line_layoutSettings = ( elemType.layoutSettings != undefined) ?  elemType.layoutSettings : {};

			  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[horizontalFork_box_id], element_map[iri], line_layoutSettings);

			  let generalizationToFork_box_id = await Elements.insertAsync(object);
			  element_map[generalizationToFork_box_id] = generalizationToFork_box_id;


			  // AssocToFork
			  elemType = await ElementTypes.findOneAsync({name: "AssocToFork", diagramTypeId: diagram_type._id});
			  if (!elemType) {
					console.error("No AssocToFork type");
					return;
			  }
			  elemStyle = elemType["styles"][0];
			  line_layoutSettings = ( elemType.layoutSettings != undefined) ?  elemType.layoutSettings : {};

			  for(let sc = 0; sc < subClasses.length; sc++){
				  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[subClasses[sc]], element_map[horizontalFork_box_id], line_layoutSettings);
				  let new_line_id = await Elements.insertAsync(object);
				  element_map[new_line_id] = new_line_id;
			  }

			} else {
			  // Generalization
			  elemType = await ElementTypes.findOneAsync({name: "Generalization", diagramTypeId: diagram_type._id});
			  if (!elemType) {
					console.error("No Generalization type");
					return;
			  }

			  let elemStyle = elemType["styles"][0];
			  let line_layoutSettings = ( elemType.layoutSettings != undefined) ?  elemType.layoutSettings : {};

			  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[subClasses[0]], element_map[iri], line_layoutSettings);

			  let generalizationToFork_box_id = await Elements.insertAsync(object);
			  element_map[generalizationToFork_box_id] = generalizationToFork_box_id;

			}
		}

		// Association
		elemType = await ElementTypes.findOneAsync({name: "Association", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No Line type");
			return;
		}

		let assocStyles = elemType["styles"];
		let elemStyle = assocStyles.find(s => s.name === 'Association_direct');

        let line_layoutSettings = ( elemType.layoutSettings != undefined) ?  elemType.layoutSettings : {};

		for (const key of Object.keys(ontology.objectProperties)) {
			const item = ontology.objectProperties[key];
			if(!item.handled && item.domain.length === 1 && item.range.length === 1 ){
				const d = item.domain[0], r = item.range[0];
				if(item.inverseOf.length > 0){
					elemStyle = assocStyles.find(s => s.name === 'Association_both_end');
				}
				let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[d], element_map[r], line_layoutSettings);

				let new_line_id = await Elements.insertAsync(object);
				element_map[key] = new_line_id;

				let listForCompartment = {
					diagram_id: new_diagram_id,
					diagram_type_id: diagram_type._id,
					projectId: list.projectId,
					versionId: list.versionId,
					element_id: new_line_id,
					element_type_id: elemType._id
				}
				await add_one_compartment(listForCompartment, "Name", item.prefixed, item.prefixed)
				if (item.FunctionalProperty)        await add_one_compartment(listForCompartment, "Functional", "true", "{func}");
			    if (item.InverseFunctionalProperty) await add_one_compartment(listForCompartment, "InverseFunctional", "true", "{invf}");
			    if (item.TransitiveProperty)        await add_one_compartment(listForCompartment, "Transitive", "true", "{tran}");
			    if (item.SymmetricProperty)         await add_one_compartment(listForCompartment, "Symmetric", "true", "{sym}");
			    if (item.AsymmetricProperty)        await add_one_compartment(listForCompartment, "Asymmetric", "true", "{asym}");
			    if (item.ReflexiveProperty)         await add_one_compartment(listForCompartment, "Reflexive", "true", "{ref}");
			    if (item.IrreflexiveProperty)       await add_one_compartment(listForCompartment, "Irreflexive", "true", "{iref}");
				if (item.multiplicity) {
				await add_one_compartment(listForCompartment, "Multiplicity", item.multiplicity, "["+item.multiplicity+"]");
				}
				// SuperProperty
				for(let i = 0; i < item.superProperties.length; i++){
				   await addCompartmentSubCompartments2(listForCompartment, "SuperProperties", item.superProperties[i])
				}
				// DisjointProperty
				for(let i = 0; i < item.disjointProperties.length; i++){
				   await addCompartmentSubCompartments2(listForCompartment, "DisjointProperties", item.disjointProperties[i])
				}
				// EquivalentProperty
				for(let i = 0; i < item.equivalentProperties.length; i++){
				   await addCompartmentSubCompartments2(listForCompartment, "EquivalentProperties", item.equivalentProperties[i])
				}
				// Label
				if(item.label) {await addCompartmentSubCompartments2(listForCompartment, "Annotation",[
				  {name:"AnnotationType",value:"Label"},
				  {name:"Value",value:item.label},
				  {name:"Language",value:""},
				 ])
				}
				// Annotation
				for(let i = 0; i < item.annotations.length; i++){
				   await addCompartmentSubCompartments2(listForCompartment, "Annotation", item.annotations[i])
				}
				// PropertyChains
				for(let i = 0; i < item.propertyChains.length; i++){
				   await addCompartmentSubCompartments2(listForCompartment, "PropertyChains", item.propertyChains[i])
				}

				if(item.inverseOf.length > 0){
					await add_one_compartment(listForCompartment, "NameInv", item.prefixedInv, item.prefixedInv)
					if (item.FunctionalPropertyInv)        await add_one_compartment(listForCompartment, "FunctionalInv", "true", "{func}");
					if (item.InverseFunctionalPropertyInv) await add_one_compartment(listForCompartment, "InverseFunctionalInv", "true", "{invf}");
					if (item.TransitivePropertyInv)        await add_one_compartment(listForCompartment, "TransitiveInv", "true", "{tran}");
					if (item.SymmetricPropertyInv)         await add_one_compartment(listForCompartment, "SymmetricInv", "true", "{sym}");
					if (item.AsymmetricPropertyInv)        await add_one_compartment(listForCompartment, "AsymmetricInv", "true", "{asym}");
					if (item.ReflexivePropertyInv)         await add_one_compartment(listForCompartment, "ReflexiveInv", "true", "{ref}");
					if (item.IrreflexivePropertyInv)       await add_one_compartment(listForCompartment, "IrreflexiveInv", "true", "{iref}");
					if (item.multiplicityInv) {
						await add_one_compartment(listForCompartment, "MultiplicityInv", item.multiplicityInv, item.multiplicityInv);
					}
					// SuperProperty
					const superProps = item.superPropertiesInv || [];
					for (let i = 0; i < superProps.length; i++) {
					   await addCompartmentSubCompartments2(listForCompartment, "SuperPropertiesInv", superProps[i])
					}
					// DisjointProperty
					const disjointProps = item.disjointPropertiesInv || [];
					for(let i = 0; i < disjointProps.length; i++){
					   await addCompartmentSubCompartments2(listForCompartment, "DisjointPropertiesInv", disjointProps[i])
					}
					// EquivalentProperty
					const equivalentProps = item.equivalentPropertiesInv || [];
					for(let i = 0; i < equivalentProps.length; i++){
					   await addCompartmentSubCompartments2(listForCompartment, "EquivalentPropertiesInv", equivalentProps[i])
					}
					// Label
					if(item.labelInv) {await addCompartmentSubCompartments2(listForCompartment, "AnnotationInv",[
					  {name:"AnnotationType",value:"Label"},
					  {name:"Value",value:item.labelInv},
					  {name:"Language",value:""},
					 ])
					}
					// Annotation
					for(let i = 0; i < item.annotationsInv.length; i++){
					   await addCompartmentSubCompartments2(listForCompartment, "AnnotationInv", item.annotationsInv[i])
					}
					// PropertyChains
					for(let i = 0; i < item.propertyChainsInv.length; i++){
					   await addCompartmentSubCompartments2(listForCompartment, "PropertyChainsInv", item.propertyChainsInv[i])
					}
				}
			}
		}

		// Restriction
		elemType = await ElementTypes.findOneAsync({name: "Restriction", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No Restriction type");
			return;
		}

		elemStyle = elemType["styles"][0];
        line_layoutSettings = ( elemType.layoutSettings != undefined) ?  elemType.layoutSettings : {};

		for (const key of Object.keys(ontology.restrictions)) {
		  const item = ontology.restrictions[key];

		  let objectR;
		  let isAllValuesFrom = false;
		  if(item.allValuesFrom !== null) {
			objectR = item.allValuesFrom;
			isAllValuesFrom = true;
		  } else if(item.someValuesFrom !== null) objectR = item.someValuesFrom;
		  else objectR = item.onClass;
		  if(item.subject && objectR && element_map[item.subject] && element_map[objectR]){

			let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[item.subject], element_map[objectR], line_layoutSettings);

			let new_line_id = await Elements.insertAsync(object);
			element_map[new_line_id] = new_line_id;

			let listForCompartment = {
					diagram_id: new_diagram_id,
					diagram_type_id: diagram_type._id,
					projectId: list.projectId,
					versionId: list.versionId,
					element_id: new_line_id,
					element_type_id: elemType._id
			}

			  let roleName = ontology.objectProperties[item.onProperty].prefixed || iriToPrefixed(item.onProperty, ontologyPrefixes);
			  let roleNameInput = roleName;
			  if(item.inverse) {
				await add_one_compartment(listForCompartment, "IsInverse", "true");
				roleNameInput = "inverse("+ roleNameInput + ")";
			  }
			  await add_one_compartment(listForCompartment, "Role", roleName, roleNameInput);

			  if(item.allValuesFrom)  await add_one_compartment(listForCompartment, "Only", "true", "only");
			  if(item.someValuesFrom) await add_one_compartment(listForCompartment, "Some", "true", "some");

			  let multiplicity = formatCardinalityRange(item);
			  if(multiplicity !== null && multiplicity !== "0..*"){
				await add_one_compartment(listForCompartment, "Multiplicity", multiplicity, "["+multiplicity+"]");
			  }
		  }
		}

		// ComplementOf
		elemType = await ElementTypes.findOneAsync({name: "ComplementOf", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No ComplementOf type");
			return;
		}

		elemStyle = elemType["styles"][0];
        line_layoutSettings = ( elemType.layoutSettings != undefined) ?  elemType.layoutSettings : {};

		for (const key of Object.keys(ontology.complementOf)) {
		  const item = ontology.complementOf[key];

		  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[item.subject], element_map[item.object], line_layoutSettings);

		  let new_line_id = await Elements.insertAsync(object);
		  element_map[new_line_id] = new_line_id;

		  let listForCompartment = {
					diagram_id: new_diagram_id,
					diagram_type_id: diagram_type._id,
					projectId: list.projectId,
					versionId: list.versionId,
					element_id: new_line_id,
					element_type_id: elemType._id
		  }
		  await add_one_compartment(listForCompartment, "Label", "<<complementOf>>", "<<complementOf>>");
		}

		//Individuals
		elemType = await ElementTypes.findOneAsync({name: "Object", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No Object type");
			return;
		}

		for (const key of Object.keys(ontology.individuals)) {
			const item = ontology.individuals[key];
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

            let elemStyle = elemType["styles"][0];
			let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, false)

			let new_box_id = await Elements.insertAsync(object);
			element_map[key] = new_box_id;

			let listForCompartment = {
				diagram_id: new_diagram_id,
				diagram_type_id: diagram_type._id,
				projectId: list.projectId,
				versionId: list.versionId,
				element_id: new_box_id,
				element_type_id: elemType._id
			}

			//Name
			if(item.prefixed)await add_one_compartment(listForCompartment, "Name", item.prefixed, item.prefixed)
			//Class name
			if(item.className)await add_one_compartment(listForCompartment, "ClassName", item.className, ": "+item.className)
			await setHorizontalLine(listForCompartment, "HorizontalLine12")
			// Label
			if(item.label) {await addCompartmentSubCompartments2(listForCompartment, "Annotation",[
					  {name:"AnnotationType",value:"Label"},
					  {name:"Value",value:item.label},
					  {name:"Language",value:""},
					 ])
			}
			// Annotations
			for(let i = 0; i < item.annotations.length; i++){
				await addCompartmentSubCompartments2(listForCompartment, "Annotation", item.annotations[i])
			}
			// DataPropertyAssertions
			for(let i = 0; i < item.dataPropertyAssertions.length; i++){
				await addCompartmentSubCompartments2(listForCompartment, "DataPropertyAssertion", item.dataPropertyAssertions[i])
			}

			// NegativeDataPropertyAssertions
			for(let i = 0; i < item.negativeDataPropertyAssertions.length; i++){
				await addCompartmentSubCompartments2(listForCompartment, "NegativeDataPropertyAssertion", item.negativeDataPropertyAssertions[i])
			}
			if(item.dataPropertyAssertions.length > 0){
				await setHorizontalLine(listForCompartment, "HorizontalLine10")
			}
			if(item.negativeDataPropertyAssertions.length > 0){
				await setHorizontalLine(listForCompartment, "HorizontalLine9")
			}
			// DifferentIndividuals
			for(let i = 0; i < item.differentIndividuals.length; i++){
				await addCompartmentSubCompartments2(listForCompartment, "DifferentIndividuals", item.differentIndividuals[i])
			}
			// SameIndividuals
			for(let i = 0; i < item.sameIndividuals.length; i++){
				await addCompartmentSubCompartments2(listForCompartment, "SameIndividuals", item.sameIndividuals[i])
			}
			if(item.sameIndividuals.length > 0 || item.differentIndividuals.length > 0){
				await setHorizontalLine(listForCompartment, "HorizontalLine11")
			}
		}


		// objectPropertyAssertions
		elemType = await ElementTypes.findOneAsync({name: "LinkObject", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No LinkObject type");
			return;
		}

		assocStyles = elemType.styles;
		elemStyle= assocStyles.find(s => s.name === 'Link_direct');
        line_layoutSettings = ( elemType.layoutSettings != undefined) ?  elemType.layoutSettings : {};

		for (const key of Object.keys(ontology.objectPropertyAssertions)) {
		  const item = ontology.objectPropertyAssertions[key];

		  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[item.source], element_map[item.target], line_layoutSettings);

		  let new_line_id = await Elements.insertAsync(object);
		  element_map[new_line_id] = new_line_id;

		  let listForCompartment = {
					diagram_id: new_diagram_id,
					diagram_type_id: diagram_type._id,
					projectId: list.projectId,
					versionId: list.versionId,
					element_id: new_line_id,
					element_type_id: elemType._id
		  }
		  let propertyInput = item.prefixed;
		  if(item.negative === true){
			await add_one_compartment(listForCompartment, "IsNegativeAssertion", "true");
			propertyInput = "\u27C2"+propertyInput;
		  }
		  await add_one_compartment(listForCompartment, "Property", item.prefixed, propertyInput);
		}

		//AnnotationProperty
		elemType = await ElementTypes.findOneAsync({name: "AnnotationProperty", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No AnnotationProperty type");
			return;
		}

		for (const key of Object.keys(ontology.annotationProperties)) {
			const item = ontology.annotationProperties[key];
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

            let elemStyle = elemType["styles"][0];
			let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, false)

			let new_box_id = await Elements.insertAsync(object);
			element_map[new_box_id] = new_box_id;

			let listForCompartment = {
				diagram_id: new_diagram_id,
				diagram_type_id: diagram_type._id,
				projectId: list.projectId,
				versionId: list.versionId,
				element_id: new_box_id,
				element_type_id: elemType._id
			}

			//Name
			if(item.prefixed)await add_one_compartment(listForCompartment, "Name", item.prefixed, item.prefixed)
			//Domain
			if(item.domain.length === 1){
				let domain = ontology.classes[item.domain[0]]?.prefixed || iriToPrefixed(item.domain[0], ontologyPrefixes);
				await add_one_compartment(listForCompartment, "Domain", domain, "Domain: " + domain);
			}
			// Range
			if(item.range.length === 1){
				if(typeof ontology.classes[item.range[0]] !== "undefined") annotProp.setCompartmentValue("Range", ontology.classes[item.range[0]].prefixed, "Range: " + ontology.classes[item.range[0]].prefixed)
				else {
					let rangeType = getDatatypeLocalName(item.range[0]) || iriToPrefixed(item.range[0], ontologyPrefixes) ;
					await add_one_compartment(listForCompartment, "Range", rangeType, "Range: " + rangeType);
				}
			}
			// SuperProperties
			for (const sp of item.superProperties || []) {
			  await addCompartmentSubCompartments2(listForCompartment, "SuperProperties", [
				{ name: "SuperProperty", value: ontology.annotationProperties[sp]?.prefixed || iriToPrefixed(sp, ontologyPrefixes) }
			  ]);
			}

			if(item.superProperties.length>0){
				await setHorizontalLine(listForCompartment, "HorizontalLine7");
				await setHorizontalLine(listForCompartment, "HorizontalLine8");
		   }

			// Annotations
			if(item.label){
				await annotProp.addCompartmentSubCompartments2(listForCompartment, "Annotation",[
						  {name:"AnnotationType",value:"Label"},
						  {name:"Value",value:item.label},
						  {name:"Language",value:""},
				])
			}

			for(let an = 0; an < item.annotations.length; an++){
				  let annotation = item.annotations[an];
				  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
				  let value = annotation.v;
				  let language = annotation.lang || "";
				  if(value !== null && annotationType !== null){
					await addCompartmentSubCompartments2(listForCompartment, "Annotation",[
						  {name:"AnnotationType",value:annotationType},
						  {name:"Value",value:value},
						  {name:"Language",value:language},
						])
				  }
			}
		}


		//DataType
		elemType = await ElementTypes.findOneAsync({name: "DataType", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No DataType type");
			return;
		}

		for (const key of Object.keys(ontology.dataTypes)) {
			const item = ontology.dataTypes[key];
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

            let elemStyle = elemType["styles"][0];
			let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, false)

			let new_box_id = await Elements.insertAsync(object);
			element_map[new_box_id] = new_box_id;

			let listForCompartment = {
				diagram_id: new_diagram_id,
				diagram_type_id: diagram_type._id,
				projectId: list.projectId,
				versionId: list.versionId,
				element_id: new_box_id,
				element_type_id: elemType._id
			}
			await add_one_compartment(listForCompartment, "Label", "<<DataType>>", "<<DataType>>")
			//Name
			if(item.prefixed) await add_one_compartment(listForCompartment, "Name", item.prefixed, item.prefixed)
			// DataTypeDefinition
			if(item.base !== null) await add_one_compartment(listForCompartment, "DataTypeDefinition", getDatatypeLocalName(item.base), getDatatypeLocalName(item.base))

			// Annotation
			for(let an = 0; an < item.annotations.length; an++){
				  let annotation = item.annotations[an];
				  let annotationType = getBuiltInAnnotationShortName(annotation.p, ontology.annotationProperties);
				  let value = annotation.v;
				  let language = annotation.lang || "";
				  if(value !== null && annotationType !== null){
					await addCompartmentSubCompartments2(listForCompartment, "Annotation",[
						  {name:"AnnotationType",value:annotationType},
						  {name:"Value",value:value},
						  {name:"Language",value:language},
						])
				  }
			}
		}

		//DisjointClasses
		for (const key of Object.keys(ontology.allDisjointClasses)) {
			const item = ontology.allDisjointClasses[key];
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

			if(item.length > 2){
				elemType = await ElementTypes.findOneAsync({name: "DisjointClasses", diagramTypeId: diagram_type._id});
				if (!elemType) {
					console.error("No DisjointClasses type");
					return;
				}
				let elemStyle = elemType["styles"][0];
				let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, false)

				let new_box_id = await Elements.insertAsync(object);
				element_map[new_box_id] = new_box_id;

				let listForCompartment = {
					diagram_id: new_diagram_id,
					diagram_type_id: diagram_type._id,
					projectId: list.projectId,
					versionId: list.versionId,
					element_id: new_box_id,
					element_type_id: elemType._id
				}
				await add_one_compartment(listForCompartment, "Label", "<<disjoint>>", "<<disjoit>>")

				let elemTypeLine = await ElementTypes.findOneAsync({name: "Line", diagramTypeId: diagram_type._id});
				if (!elemTypeLine) {
					console.error("No Line type");
					return;
				}

				elemStyle = elemTypeLine["styles"][0];
				line_layoutSettings = ( elemTypeLine.layoutSettings != undefined) ?  elemTypeLine.layoutSettings : {};

				for (let c = 0; c < item.length; c++) {
				  if(element_map[item[c]]){
					let object = await Create_New_OWLGrEd_Element(list, elemTypeLine, diagram_type, new_diagram_id, elemStyle, true, element_map[new_box_id], element_map[item[c]], line_layoutSettings);

					let new_line_id = await Elements.insertAsync(object);
					element_map[new_line_id] = new_line_id;
				  }
				}
		  } else if(item.length === 2 && element_map[item[0]] && element_map[item[1]]){
			  // Disjoint
				elemType = await ElementTypes.findOneAsync({name: "Disjoint", diagramTypeId: diagram_type._id});
				if (!elemType) {
					console.error("No Disjoint type");
					return;
				}

			  elemStyle = elemType["styles"][0];
			  line_layoutSettings = ( elemType.layoutSettings != undefined) ?  elemType.layoutSettings : {};

			  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[item[0]], element_map[item[1]], line_layoutSettings);

			  let new_line_id = await Elements.insertAsync(object);
			  element_map[new_line_id] = new_line_id;

			  let listForCompartment = {
						diagram_id: new_diagram_id,
						diagram_type_id: diagram_type._id,
						projectId: list.projectId,
						versionId: list.versionId,
						element_id: new_line_id,
						element_type_id: elemType._id
			  }
			  await add_one_compartment(listForCompartment, "Label", "<<disjoint>>", "<<disjoint>>");
		  }
		}

		//EquivalentClasses
		for (const key of Object.keys(ontology.equivalentClasses)) {
			const item = ontology.equivalentClasses[key];
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				return;
			}

			if(item.length > 2){
				elemType = await ElementTypes.findOneAsync({name: "EquivalentClasses", diagramTypeId: diagram_type._id});
				if (!elemType) {
					console.error("No EquivalentClasses type");
					return;
				}
				let elemStyle = elemType["styles"][0];
				let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, false)

				let new_box_id = await Elements.insertAsync(object);
				element_map[new_box_id] = new_box_id;

				let listForCompartment = {
					diagram_id: new_diagram_id,
					diagram_type_id: diagram_type._id,
					projectId: list.projectId,
					versionId: list.versionId,
					element_id: new_box_id,
					element_type_id: elemType._id
				}
				await add_one_compartment(listForCompartment, "Label", "<<equivalent>>", "<<equivalent>>")

				let elemTypeLine = await ElementTypes.findOneAsync({name: "Line", diagramTypeId: diagram_type._id});
				if (!elemTypeLine) {
					console.error("No Line type");
					return;
				}

				elemStyle = elemTypeLine["styles"][0];
				line_layoutSettings = ( elemTypeLine.layoutSettings != undefined) ?  elemTypeLine.layoutSettings : {};

				for (let c = 0; c < item.length; c++) {
				  if(element_map[item[c]]){
					let object = await Create_New_OWLGrEd_Element(list, elemTypeLine, diagram_type, new_diagram_id, elemStyle, true, element_map[new_box_id], element_map[item[c]], line_layoutSettings);

					let new_line_id = await Elements.insertAsync(object);
					element_map[new_line_id] = new_line_id;
				  }
				}
		  } else if(item.length === 2 && element_map[item[0]] && element_map[item[1]]){
			  // Disjoint
				elemType = await ElementTypes.findOneAsync({name: "EquivalentClass", diagramTypeId: diagram_type._id});
				if (!elemType) {
					console.error("No EquivalentClass type");
					return;
				}

			  elemStyle = elemType["styles"][0];
			  line_layoutSettings = ( elemType.layoutSettings != undefined) ?  elemType.layoutSettings : {};

			  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[item[0]], element_map[item[1]], line_layoutSettings);

			  let new_line_id = await Elements.insertAsync(object);
			  element_map[new_line_id] = new_line_id;

			  let listForCompartment = {
						diagram_id: new_diagram_id,
						diagram_type_id: diagram_type._id,
						projectId: list.projectId,
						versionId: list.versionId,
						element_id: new_line_id,
						element_type_id: elemType._id
			  }
			  await add_one_compartment(listForCompartment, "Label", "<<equivalent>>", "<<equivalent>>");
		  }
		}
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
    if ( compartmentName == 'ClassList' ||  compartmentName == 'Name' ) {
      const nList = value_list.map(a => a.shortName)
      await add_one_compartment(list, 'SchemaInformation', JSON.stringify(nList), JSON.stringify(nList));
    }
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

    if ( compartmentName == 'ClassList' && !isGroup ) { // ( compartmentName == 'ClassList' && value_list.length == 1 ) {
      value = '';
    }
    await add_one_compartment(list, compartmentName, input, value);
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

async function add_one_compartment(list, compartmentName, input, value) {
	// console.log("add_one_compartment", list, compartmentName, input, value)
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
						type: compartment_type["type"] || "text",
						style: style,
						styleId: style_obj["id"],
						isObjectRepresentation: false,
						index: compartment_type.index,
						input: input,
						value: value,
						valueLC: value,
					};

	await Compartments.insertAsync(compart_obj);
}

async function addCompartmentSubCompartments2(list, compartment_name, subcompartment_value_list) {
    var ct =  await CompartmentTypes.findOneAsync({name: compartment_name, elementTypeId: list.element_type_id});
		if (ct) {
		let prefix = ct["prefix"] || "";
		let sufix = ct["suffix"] || "";
      var c_to_create = {
                compartment: {
                  projectId: list.projectId,
                  versionId: list.versionId,

                  diagramId: list.diagram_id,
                  diagramTypeId: list.diagram_type_id,
                  elementTypeId: list.element_type_id,

                  compartmentTypeId: ct._id,
                  elementId: list.element_id,

                  index: ct.index,
                //???  input: input,
                //???  value: value,
                  subCompartments: {},
                  isObjectRepresentation: false,

                  style: ct.styles[0]["style"],
                  styleId: ct.styles[0]["id"],
                },
              };
      c_to_create["compartment"]["subCompartments"][compartment_name] = {};
      c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name] = {};

      if (ct.inputType.type == "custom") {
      // if (ct.inputType.type == "custom" && ct.inputType.templateName == "multiField") {
           var ct_comparts_indexes = await Compartments.find({compartmentTypeId: ct._id, elementId: list.element_id}, {sort: {index: 1}})
                                    .map(function(c) {return c.index; });
			// search for hole in the array of indexes
           for (var idx of ct_comparts_indexes) {
             if (idx > c_to_create.compartment.index) { break; };
             c_to_create.compartment.index += 1;
           }
		  }

      var sorted_sub_compart_types = _.sortBy(ct["subCompartmentTypes"][0]["subCompartmentTypes"], function(sct) {return sct.index} );
      var value_array = [];

      _.each(sorted_sub_compart_types, function(sub_c) {
         c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name] = {};
        var sc_value = "";
        // var sc = _.find(subcompartment_value_list, function(s) {return s.name == sub_c.name});
        const sc = _.find(subcompartment_value_list, s => s.name === sub_c.name);

// Check for nested subCompartments
		if (sc) {
		  if (sc.subCompartments && Array.isArray(sc.subCompartments)) {
			// Nested subCompartments case (like "Keys")
			const nested_sorted = _.sortBy(sub_c.subCompartmentTypes, sct => sct.index);
			c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name] = {};

			const value_parts = [];

			nested_sorted.forEach(nested_sub => {
			  const nested_value = _.find(sc.subCompartments, ns => ns.name === nested_sub.name);
			  if (nested_value) {
				const transformer = nested_value.transformer || (v => v);
				let mapped_value;

				if (nested_sub.inputType.type === "checkbox") {
				  mapped_value = _.find(nested_sub.inputType.values, s => transformer(nested_value.value) === s.input)?.value;
				}
				if (typeof nested_value.input !== "undefined") mapped_value = nested_value.input;

				const built = buildCompartmentValue(nested_sub, transformer(nested_value.value), mapped_value);

				c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name][nested_sub.name] = {
				  input: transformer(nested_value.value),
				  value: built
				};

				if (built) {
				  value_parts.push(built);
				  value_parts.push(ct.concatStyle);
				}
			  }
			});

			if (value_parts.length) {
			  value_parts.pop();
			  const joined = value_parts.join("");
			  c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name]["value"] = joined;
			  c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name]["input"] = joined;
			  value_array.push(joined);
			  value_array.push(ct.concatStyle);
			}

		  } else if (sc.name && sc.value) {
			// Flat subCompartment (existing behavior)
			const transformer = sc.transformer || (v => v);
			let mapped_value;

			if (sub_c.inputType.type === "checkbox") {
			  mapped_value = _.find(sub_c.inputType.values, s => transformer(sc.value) === s.input)?.value;
			}
			if (typeof sc.input !== "undefined") mapped_value = sc.input;

			const sc_value = buildCompartmentValue(sub_c, transformer(sc.value), mapped_value);
			c_to_create.compartment.subCompartments[compartment_name][compartment_name][sub_c.name] = {
			  input: transformer(sc.value),
			  value: sc_value
			};

			if (sc_value) {
			  value_array.push(sc_value);
			  value_array.push(ct.concatStyle);
			}
		  }
		} else {
          // THIS probably doesn't work
          sc_value = buildCompartmentValue(sub_c);
          c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name]["input"] = sc_value;
          c_to_create["compartment"]["subCompartments"][compartment_name][compartment_name][sub_c.name]["value"] = sc_value;
        };

        if (sc_value) {
          value_array.push(sc_value);
          value_array.push(ct["concatStyle"])
        };
      });
      value_array.pop();

      c_to_create["compartment"]["value"] = value_array.join("");
      c_to_create["compartment"]["input"] = c_to_create["compartment"]["value"];
	  c_to_create["compartment"]["value"] = value_array.join("");
	  if(!c_to_create["compartment"]["value"].startsWith(prefix)) c_to_create["compartment"]["value"] = prefix + c_to_create["compartment"]["value"];
	  if(!c_to_create["compartment"]["value"].endsWith(sufix)) c_to_create["compartment"]["value"] = c_to_create["compartment"]["value"] + sufix;
	  // c_to_create["compartment"]["value"] = prefix + value_array.join("") + sufix;
	  // console.log("c_to_create", c_to_create)
	  await Compartments.insertAsync(c_to_create.compartment);
    };
  }

function replace_newline(str) {
	str = str || "";
	return str.replace(/\\n/g, "\n");
}

async function Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, isLine, source, target, line_layoutSettings) {

  if (isLine) {
    let object = {diagramId: new_diagram_id,
				type: "Line",
				points: [0, 10, 10, 10],
				startElement: source,
				endElement: target,
				styleId: elemStyle["id"],
				style:{
					elementStyle: elemStyle.elementStyle,
					startShapeStyle: elemStyle.startShapeStyle,
					endShapeStyle: elemStyle.endShapeStyle,
					lineType: "Orthogonal",
				},
				layoutSettings: line_layoutSettings,
				elementTypeId: elemType._id,
				diagramTypeId: diagram_type._id,
				projectId: list.projectId,
				versionId: list.versionId,
			};
	return object
  } else {
	let object = {diagramId: new_diagram_id,
		type: "Box",
		location: {x: 10, y: 10, width: 5, height: 5},
		styleId: elemStyle["id"],
		style: elemStyle,
		elementTypeId: elemType._id,
		diagramTypeId: diagram_type._id,
		projectId: list.projectId,
		versionId: list.versionId,
	};
	return object
  }

};

// Returns a string like "0..n", "1..*", or "n..m"
function formatCardinalityRange(restriction) {
  // 1) Exact cardinality dominates (qualified preferred)
  const exact =
    (Number.isInteger(restriction.qualifiedCardinality) ? restriction.qualifiedCardinality : null) ??
    (Number.isInteger(restriction.cardinality) ? restriction.cardinality : null);

  if (exact !== null) {
    return exact;
  }

  // 2) Otherwise use min/max (qualified preferred)
  let min =
    (Number.isInteger(restriction.minQualifiedCardinality) ? restriction.minQualifiedCardinality : null) ??
    (Number.isInteger(restriction.minCardinality) ? restriction.minCardinality : null);

  let max =
    (Number.isInteger(restriction.maxQualifiedCardinality) ? restriction.maxQualifiedCardinality : null) ??
    (Number.isInteger(restriction.maxCardinality) ? restriction.maxCardinality : null);

  // 3) Existential-style fillers imply at least 1
  //    - someValuesFrom(C) ⇒ ∃R.C ⇒ min ≥ 1
  //    - hasValue(v)       ⇒ ∃R.{v} ⇒ min ≥ 1
  // if ((restriction.someValuesFrom || restriction.hasValue) && (min === null || min < 1)) {
    // min = 1;
  // }

  // 4) Defaults for missing bounds
  if (min === null) min = 0;
  const maxStr = (max === null) ? '*' : String(max);

  return `${min}..${maxStr}`;
  // return null;
}

function getDatatypeLocalName(iri) {
  if (!iri) return null;

  const builtInDatatypePrefixes = {
    "http://www.w3.org/2000/01/rdf-schema#": [
      "Literal"
    ],
    "http://www.w3.org/2001/XMLSchema#": [
      "NCName", "NMTOKEN", "Name", "anyURI", "base64Binary", "boolean",
      "byte", "dateTime", "dateTimeStamp", "decimal", "double", "float",
      "hexBinary", "int", "integer", "language", "long", "negativeInteger",
      "nonNegativeInteger", "nonPositiveInteger", "normalizedString",
      "positiveInteger", "short", "string", "token", "unsignedByte",
      "unsignedInt", "unsignedLong", "unsignedShort", "date", "time"
    ],
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#": [
      "PlainLiteral", "XMLLiteral"
    ],
    "http://www.w3.org/2002/07/owl#": [
      "rational", "real"
    ]
  };

  // Find which prefix matches
  for (const [prefix, names] of Object.entries(builtInDatatypePrefixes)) {
    if (iri.startsWith(prefix)) {
      const localName = iri.substring(prefix.length);
      if (names.includes(localName)) {
        return localName;
      }
    }
  }

  return null; // or iri if you prefer returning unchanged
}

// convert IRI to prefixed name ---
function iriToPrefixed(iri, prefixes = {}) {
  for (const [prefix, base] of Object.entries(prefixes)) {
    if (iri.startsWith(base)) {
      const local = iri.slice(base.length);

      // Rule 2: default prefix ("" or ":") → just the local name
      if (prefix === '' || prefix === ':') {
        return local;
      }

      // Rule 1: normal prefix → prefix:localName
      return `${prefix}:${local}`;
    }
  }

  // Rule 3: prefix unknown → return full IRI
  return iri;
}

function buildCompartmentValue(compart_type, input, mapped_value, elemStyleId, compartStyleId) {

		//if there is no mapped values, then value <== input
		var value;
		if (mapped_value || mapped_value == "") {
			value = mapped_value;
		}

		else {
			if (input || input === "") {
				value = input;
			}
			else {
				// var default_value = compart_type["defaultValue"];
				var default_value = compart_type["defaultValue"];
				value = default_value;
			}
		}

		var prefix = compart_type["prefix"] || "";
		var suffix = compart_type["suffix"] || "";

		//adding the prefix and suffix to the value
		if (value) {
			value = prefix + value + suffix;
		}

		return value;
}

  async function setHorizontalLine(list, compartmentName){
	  	// console.log("add_one_compartment", list, compartmentName, input, value)
	let compartment_type = await CompartmentTypes.findOneAsync({elementTypeId: list.element_type_id, name:compartmentName});
	if (!compartment_type) {
		console.error("No compartment type", compartmentName);
		return;
	}

	let style_obj = compartment_type["styles"][0];
	let style = style_obj["style"];
	style.visible = true;

	let compart_obj = {diagramId: list.diagram_id,
						diagramTypeId: list.diagram_type_id,
						projectId: list.projectId,
						versionId: list.versionId,
						elementId: list.element_id,
						elementTypeId: list.element_type_id,
						compartmentTypeId: compartment_type._id,
						type: compartment_type["type"] || "text",
						style: style,
						styleId: style_obj["id"],
						isObjectRepresentation: false,
						index: compartment_type.index,
						input: " ",
						value: " ",
						valueLC: " ",
					};

	await Compartments.insertAsync(compart_obj);
  }

function getBuiltInAnnotationShortName(iri, annotationProperties) {
  const map = {
    // RDFS annotation properties
    "http://www.w3.org/2000/01/rdf-schema#label": "label",
    "http://www.w3.org/2000/01/rdf-schema#comment": "comment",
    "http://www.w3.org/2000/01/rdf-schema#seeAlso": "seeAlso",
    "http://www.w3.org/2000/01/rdf-schema#isDefinedBy": "isDefinedBy",

    // OWL annotation properties
    "http://www.w3.org/2002/07/owl#versionInfo": "versionInfo",
    "http://www.w3.org/2002/07/owl#versionIRI": "versionIRI",
    "http://www.w3.org/2002/07/owl#priorVersion": "priorVersion",
    "http://www.w3.org/2002/07/owl#backwardCompatibleWith": "backwardCompatibleWith",
    "http://www.w3.org/2002/07/owl#incompatibleWith": "incompatibleWith",
    "http://www.w3.org/2002/07/owl#deprecated": "deprecated",
  };

  // Return short name if found, otherwise try to derive from IRI
  if (map[iri]) return map[iri];

  if(annotationProperties[iri]) return annotationProperties[iri].prefixed;

  return null;

  // Fallback: extract local name after '#' or last '/'
  // const cut = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
  // return cut >= 0 ? iri.slice(cut + 1) : iri;
}