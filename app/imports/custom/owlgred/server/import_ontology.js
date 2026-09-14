import { DiagramTypes, ElementTypes, CompartmentTypes, Projects, Diagrams, Elements, Compartments } from '/imports/db/platform/collections'


Meteor.methods({
	importOntologyOWLGrEd: async function(list, ontology, ontologyName, importSettings) {

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
		//Annotation 
		elemType = await ElementTypes.findOneAsync({name: "Annotation", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No Class type");
			return;
		}
		for (const key of Object.keys(ontology.ontology.annotations)) {
			const item = ontology.ontology.annotations[key];

			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				continue;
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
			//Type
			await add_one_compartment(listForCompartment, "AnnotationType", item[0].value, "<<"+item[0].value+">>");
			//Value
			await add_one_compartment(listForCompartment, "Value", item[1].value, 'Value: "'+item[1].value + '"');
			// Language
			if(item[2].value !== "")await add_one_compartment(listForCompartment, "Language", item[2].value, 'Language: '+item[2].value);
		}

		// Class
		elemType = await ElementTypes.findOneAsync({name: "Class", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No Class type");
			return;
		}
		let classifiersList = {};
		if(importSettings?.showAsClassifiers === true && (importSettings?.showAsClassifiersSKOS === true || importSettings?.showAsClassifiersSKOSIndividualEnumeration === true)){
			if(ontology.classes["http://www.w3.org/2004/02/skos/core#Concept"] && ontology.classes["http://www.w3.org/2004/02/skos/core#ConceptScheme"]){
				
				let elemTypeC = await ElementTypes.findOneAsync({name: "Classifier", diagramTypeId: diagram_type._id});
				if (!elemTypeC) {
					console.error("No Classifier type");
					return;
				}
				let elemStyle = elemTypeC["styles"][0];
				let skosConceptScheme = ontology.classes["http://www.w3.org/2004/02/skos/core#ConceptScheme"];
				let skosConceptSchemeInstances = skosConceptScheme["instances"];
				
				let instancesToBeRemoved = [];
				
				
				for(let i = 0; i < skosConceptSchemeInstances.length; i++){
					let object = await Create_New_OWLGrEd_Element(list, elemTypeC, diagram_type, new_diagram_id, elemStyle, false)
					classifiersList[skosConceptSchemeInstances[i]] = object;
					
					let new_box_id = await Elements.insertAsync(object);
					element_map[new_box_id] = new_box_id;
					classifiersList[skosConceptSchemeInstances[i]]._id = new_box_id;
					let listForCompartment = {
						diagram_id: new_diagram_id,
						diagram_type_id: diagram_type._id,
						projectId: list.projectId,
						versionId: list.versionId,
						element_id: new_box_id,
						element_type_id: elemTypeC._id
					}
					instancesToBeRemoved.push(skosConceptSchemeInstances[i]);
					const item = ontology.classes[skosConceptSchemeInstances[i]] || ontology.classes[skosConceptSchemeInstances[i].substring(0, skosConceptSchemeInstances[i].length-13)];
									
					if(item && importSettings?.showAsClassifiersSKOSIndividualEnumeration === true && item.definitionExpression !== null && item.equivalentClasses.length === 1 && parseUnquotedListExpression(item.equivalentClasses[0][0]["value"]).length >0){
						await add_one_compartment(listForCompartment, "Label", "<<Individual enumeration + SKOS>>", "<<Classifier vocabulary>>")
						await add_one_compartment(listForCompartment, "ExportMode", "Individual enumeration + SKOS", "Individual enumeration + SKOS")
					} else 
					{
						await add_one_compartment(listForCompartment, "Label", "<<SKOS vocabulary>>", "<<SKOS vocabulary>>")
						await add_one_compartment(listForCompartment, "ExportMode", "SKOS vocabulary", "SKOS vocabulary")
					}
					//Name
					let clName = iriToLocalName(skosConceptSchemeInstances[i])
					if (clName.endsWith("ConceptScheme")) {
						clName =  clName.substring(0, clName.length-13);
					}
					await add_one_compartment(listForCompartment, "Name", clName, clName)
					await setHorizontalLine(listForCompartment, "HorizontalLine1")
					
					let opa = ontology.objectPropertyAssertions;

					for(let o = 0; o < opa.length; o++){
						if(typeof opa[o] != "undefined" && opa[o]["iri"] === "http://www.w3.org/2004/02/skos/core#inScheme" && opa[o]["target"] === skosConceptSchemeInstances[i]){
							instancesToBeRemoved.push(opa[o]["source"]);
							await addCompartmentSubCompartments2(listForCompartment, "Values",[
								{name:"Name",value:iriToLocalName(opa[o]["source"])},
							])
							
							delete opa[o];
						}
						
					}
					
					// removeIndividualsByInstances(ontology.individuals, item.instances);
					// ontology = moveObjectPropertiesWithClassRangeToDataProperties(ontology);
				}
				removeIndividualsByInstances(ontology.individuals, instancesToBeRemoved);
				
			}
			delete ontology.classes["http://www.w3.org/2004/02/skos/core#Concept"];
			delete ontology.classes["http://www.w3.org/2004/02/skos/core#ConceptScheme"];
			delete ontology.objectProperties["http://www.w3.org/2004/02/skos/core#inScheme"];
		}
	  let createClasses = true;
	  if(createClasses){
		for (const key of Object.keys(ontology.classes)) {
		  const item = ontology.classes[key];
		  if(importSettings?.showAsClassifiers === true && (importSettings?.showAsClassifiersIndividualEnumeration === true || importSettings?.showAsClassifiersSKOSIndividualEnumeration === true) && item.definitionExpression !== null && item.equivalentClasses.length === 1 && parseUnquotedListExpression(item.equivalentClasses[0][0]["value"]).length >0){
				if(item.superClasses.length === 0 && item.disjointWith.length === 0 && item.dataProperties.length === 0 && item.restrictions.length === 0 && item.keys.length === 0 && item.complementOf.length === 0){
					
					if(importSettings?.showAsClassifiersSKOSIndividualEnumeration === true && (classifiersList[item.iri] || classifiersList[item.iri+"ConceptScheme"])) {
						let cl = classifiersList[item.iri] || classifiersList[item.iri+"ConceptScheme"];
						
						
					} else{
					
						let classifValues = parseUnquotedListExpression(item.equivalentClasses[0][0]["value"]);
						let elemTypeC = await ElementTypes.findOneAsync({name: "Classifier", diagramTypeId: diagram_type._id});
						if (!elemTypeC) {
							console.error("No Classifier type");
							return;
						}
						let elemStyle = elemTypeC["styles"][0];
						let object = await Create_New_OWLGrEd_Element(list, elemTypeC, diagram_type, new_diagram_id, elemStyle, false)
						let new_box_id = await Elements.insertAsync(object);
						element_map[new_box_id] = new_box_id;

						let listForCompartment = {
							diagram_id: new_diagram_id,
							diagram_type_id: diagram_type._id,
							projectId: list.projectId,
							versionId: list.versionId,
							element_id: new_box_id,
							element_type_id: elemTypeC._id
						}
						await add_one_compartment(listForCompartment, "Label", "<<Classifier>>", "<<Classifier>>")
						//Name
						if(item.prefixed) await add_one_compartment(listForCompartment, "Name", item.prefixed, item.prefixed)
						await setHorizontalLine(listForCompartment, "HorizontalLine1")
						await add_one_compartment(listForCompartment, "ExportMode", "Individual enumeration", "Individual enumeration")
						for(let v = 0; v < classifValues.length; v++){
							await addCompartmentSubCompartments2(listForCompartment, "Values",[
								{name:"Name",value:classifValues[v]},
							])
						}
						await setHorizontalLine(listForCompartment, "HorizontalLine2")
						await add_one_compartment(listForCompartment, "ClosedClassifier", "true", "{closed}")
					}
					removeIndividualsByInstances(ontology.individuals, item.instances);
					removeIndividualListByClass(ontology.individualList, item.iri);

					ontology = moveObjectPropertiesWithClassRangeToDataProperties(ontology, item.iri);
				}
		  } else{
			
			
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				continue;
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

			//Comment
			if(item.comment) await add_one_compartment(listForCompartment, "Comment", item.comment, item.comment)

			//Annotations
			if((importSettings?.showClassAnnotationsType_graph ?? true) === true){
			  let elemTypeAn = await ElementTypes.findOneAsync({name: "Annotation", diagramTypeId: diagram_type._id});
			  if (!elemTypeAn) {
					console.error("No Class type");
					return;
			  }
			  let elemStyleAn = elemTypeAn["styles"][0];
			  
			  let elemTypeAnC = await ElementTypes.findOneAsync({name: "Connector", diagramTypeId: diagram_type._id});
				if (!elemTypeAnC) {
					console.error("No Class type");
					return;
				}
			  let elemStyleAnC = elemTypeAnC["styles"][0];
			  let line_layoutSettings = ( elemStyleAnC.layoutSettings !== undefined) ?  elemStyleAnC.layoutSettings : {};
			  
			  //Label
			  if(item.label) {
					const itemAn = item.label;
					let object = await Create_New_OWLGrEd_Element(list, elemTypeAn, diagram_type, new_diagram_id, elemStyleAn, false)

					let new_box_id_An = await Elements.insertAsync(object);
					element_map[new_box_id_An] = new_box_id_An;

					let listForCompartmentAn = {
						diagram_id: new_diagram_id,
						diagram_type_id: diagram_type._id,
						projectId: list.projectId,
						versionId: list.versionId,
						element_id: new_box_id_An,
						element_type_id: elemTypeAn._id
					}
					
					//Type
					await add_one_compartment(listForCompartmentAn, "AnnotationType", "Label", "<<Label>>");
					//Value
					await add_one_compartment(listForCompartmentAn, "Value", item.label, 'Value: "'+item.label + '"');
					
				    let objectC = await Create_New_OWLGrEd_Element(list, elemStyleAnC, diagram_type, new_diagram_id, elemStyleAnC, true, new_box_id_An, new_box_id, line_layoutSettings);

				    let new_line_id_An = await Elements.insertAsync(objectC);
				    element_map[new_line_id_An] = new_line_id_An;
					
			  }	

			  
			  for(let i = 0; i < item.annotations.length; i++){

				const itemAn = item.annotations[i];
				if(itemAn !== null){
					let object = await Create_New_OWLGrEd_Element(list, elemTypeAn, diagram_type, new_diagram_id, elemStyleAn, false)

					let new_box_id_An = await Elements.insertAsync(object);
					element_map[new_box_id_An] = new_box_id_An;

					let listForCompartmentAn = {
						diagram_id: new_diagram_id,
						diagram_type_id: diagram_type._id,
						projectId: list.projectId,
						versionId: list.versionId,
						element_id: new_box_id_An,
						element_type_id: elemTypeAn._id
					}
					
					//Type
					await add_one_compartment(listForCompartmentAn, "AnnotationType", itemAn[0].value, "<<"+itemAn[0].value+">>");
					//Value
					await add_one_compartment(listForCompartmentAn, "Value", itemAn[1].value, 'Value: "'+itemAn[1].value + '"');
					// Language
					if(itemAn[2].value !== "")await add_one_compartment(listForCompartmentAn, "Language", itemAn[2].value, 'Language: '+itemAn[2].value);
					
					
				    let objectC = await Create_New_OWLGrEd_Element(list, elemStyleAnC, diagram_type, new_diagram_id, elemStyleAnC, true, new_box_id_An, new_box_id, line_layoutSettings);

				    let new_line_id_An = await Elements.insertAsync(objectC);
				    element_map[new_line_id_An] = new_line_id_An;
				}
			  }
			} else {
			    //Label
				if(item.label) {await addCompartmentSubCompartments2(listForCompartment, "Annotation",[
					  {name:"AnnotationType",value:"Label"},
					  {name:"Value",value:item.label},
				 	  {name:"Language",value:""},
					])
				}	
			  if(item.annotations){
			    for(let i = 0; i < item.annotations.length; i++){
			     await addCompartmentSubCompartments2(listForCompartment, "Annotation", item.annotations[i])
			    }
			  }
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
				if(typeof item.disjointWith[i] !== "string")await addCompartmentSubCompartments2(listForCompartment, "DisjointClasses", item.disjointWith[i])
			}

			if(item.disjointWith.length>0){
				await setHorizontalLine(listForCompartment, "HorizontalLine4")
			}

			// EquivalentClasses
			for(let i = 0; i < item.equivalentClasses.length; i++){
			   if(typeof item.equivalentClasses[i] !== "string")await addCompartmentSubCompartments2(listForCompartment, "EquivalentClasses", item.equivalentClasses[i])
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
			
			// Individuals
			if(item.individuals){
			  let individualCount = importSettings?.individualCountInList || 100000;
			  for(let i = 0; i < item.individuals.length; i++){
				  
				let line =
						i < individualCount
						? item.individuals[i][0].input
						: "";
					
				await addCompartmentSubCompartments2(listForCompartment, "Individuals", [
							{
								name: "Individual",
								input: line,
								value: item.individuals[i][0].value
							}
						]);  
				  
				  
			    // await addCompartmentSubCompartments2(listForCompartment, "Individuals", item.individuals[i])
			  }
			}
		  }
		}
	  }

		//Super Classes as boxes
		let superClasses = ontology.superClasses;
		for (const iri in superClasses) {
			let subClasses = superClasses[iri];
			if(subClasses.length > 1){
			  if((importSettings?.showSubclassesGraphicsType_forks ?? true) === true){
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
				  let line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};
				  if(element_map[iri]){
					  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[horizontalFork_box_id], element_map[iri], line_layoutSettings);

					  let generalizationToFork_box_id = await Elements.insertAsync(object);
					  element_map[generalizationToFork_box_id] = generalizationToFork_box_id;
					  
					  
					  if(importSettings?.showDisjointClassesMarkAtForks === true){
						let res = containsSameArrayAndRemove(subClasses, ontology.allDisjointClasses);
						if(res.found === true)
						  ontology.allDisjointClasses = res.list;
					  
						  let listForCompartmentAn = {
							diagram_id: new_diagram_id,
							diagram_type_id: diagram_type._id,
							projectId: list.projectId,
							versionId: list.versionId,
							element_id: generalizationToFork_box_id,
							element_type_id: elemType._id
						}
						
						//Disjoint
						await add_one_compartment(listForCompartmentAn, "Disjoint", "true", "{disjoint}");
					  }
				  } else {console.error("No superclass for GeneralizationToFork", iri)}
				  

				  // AssocToFork
				  elemType = await ElementTypes.findOneAsync({name: "AssocToFork", diagramTypeId: diagram_type._id});
				  if (!elemType) {
						console.error("No AssocToFork type");
						return;
				  }
				  elemStyle = elemType["styles"][0];
				  line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};

				  for(let sc = 0; sc < subClasses.length; sc++){
					  if( element_map[subClasses[sc]]){
						  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[subClasses[sc]], element_map[horizontalFork_box_id], line_layoutSettings);
						  let new_line_id = await Elements.insertAsync(object);
						  element_map[new_line_id] = new_line_id;
					  } else {console.error("No sub class for GeneralizationToFork", subClasses[sc])}
				  }
			  
			  }else if((importSettings?.showSubclassesGraphicsType_lines ?? true) === true){
				  // Generalization
				  elemType = await ElementTypes.findOneAsync({name: "Generalization", diagramTypeId: diagram_type._id});
				  if (!elemType) {
						console.error("No Generalization type");
						return;
				  }

				  let elemStyle = elemType["styles"][0];
				  let line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};
				  
				  for(let sc = 0; sc < subClasses.length; sc++){
					if( element_map[subClasses[sc]] && element_map[iri]){
					  let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[subClasses[sc]], element_map[iri], line_layoutSettings);
					  let new_line_id = await Elements.insertAsync(object);
					  element_map[new_line_id] = new_line_id;
					} else {
						if(!element_map[iri]) console.error("No superclass for Generalization", iri);
						if(!element_map[subClasses[sc]]) console.error("No sub class for Generalization", subClasses[sc]);
					}
				  }
				  
			  }

			} else {
			  // Generalization
			  if( element_map[subClasses[0]] && element_map[iri]){
			    elemType = await ElementTypes.findOneAsync({name: "Generalization", diagramTypeId: diagram_type._id});
			    if (!elemType) {
					console.error("No Generalization type");
					return;
			    }
		
			    let elemStyle = elemType["styles"][0];
			    let line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};

			    let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[subClasses[0]], element_map[iri], line_layoutSettings);

			    let generalizationToFork_box_id = await Elements.insertAsync(object);
			    element_map[generalizationToFork_box_id] = generalizationToFork_box_id;
			  }else {
				if(!element_map[iri]) console.error("No superclass for Generalization", iri);
				if(!element_map[subClasses[0]]) console.error("No sub class for Generalization", subClasses[sc]);
			  }
			}
		}
		
		//Data Property
		 elemType = await ElementTypes.findOneAsync({name: "DataProperty", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No DataProperty type");
			return;
		}

		let elemStyle = elemType["styles"][0];
		
		if((importSettings?.showDataProperties ?? true) === true){
		  for (const key of Object.keys(ontology.dataProperties)) {
			const item = ontology.dataProperties[key];
			if(item.domain.length === 1 && item.Qualifiers.length > 0){
			  if(item.domain[0]){
				let object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, false)
				  
				 let new_line_id = await Elements.insertAsync(object);
				  element_map[key] = new_line_id;
				  
				  // linePropertyClass
				  let elemTypeLine = await ElementTypes.findOneAsync({name: "linePropertyClass", diagramTypeId: diagram_type._id});
				  if (!elemTypeLine) {
						console.error("No linePropertyClass type");
						return;
				  }

				  elemStyle = elemTypeLine["styles"][0];
				  let line_layoutSettings = ( elemTypeLine.layoutSettings !== undefined) ?  elemTypeLine.layoutSettings : {};
				  const d = item.domain[0];
				  let objectLine = await Create_New_OWLGrEd_Element(list, elemTypeLine, diagram_type, new_diagram_id, elemStyle, true, element_map[d], new_line_id, line_layoutSettings);

				  let objectLine_id = await Elements.insertAsync(objectLine);
				  element_map[objectLine_id] = objectLine_id;
				  				
				  let listForCompartment = {
					diagram_id: new_diagram_id,
					diagram_type_id: diagram_type._id,
					projectId: list.projectId,
					versionId: list.versionId,
					element_id: new_line_id,
					element_type_id: elemType._id
				  }
				  await add_one_compartment(listForCompartment, "Name", item.prefixed, item.prefixed)
				  await setHorizontalLine(listForCompartment, "HorizontalLine19")
				  
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
				  
				  // qualifiers
				  const qualifiers = item.Qualifiers || [];
				  for (let i = 0; i < qualifiers.length; i++) {
					await addCompartmentSubCompartments2(listForCompartment, "Qualifiers", qualifiers[i])
				  }
			  }else{console.error("No domain class for data property", item)}
			}
		  }
		}
		
		// Association
		elemType = await ElementTypes.findOneAsync({name: "Association", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No Line type");
			return;
		}

		let assocStyles = elemType["styles"];
		elemStyle = assocStyles.find(s => s.name === 'Association_direct');

        let line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};
		if((importSettings?.showObjectProperties ?? true) === true && importSettings?.showObjectPropertiesType_graph === true){
		  for (const key of Object.keys(ontology.objectProperties)) {
			const item = ontology.objectProperties[key];
			if(!item.handled && item.domain.length === 1 && item.range.length === 1 && element_map[item.domain[0]] && element_map[item.range[0]]){
			  let object;
			  let new_line_id;
			  const d = item.domain[0], r = item.range[0];
			  if(element_map[d] && element_map[r]){
				if(item.Qualifiers.length > 0){
					
				  elemType = await ElementTypes.findOneAsync({name: "ObjectProperty", diagramTypeId: diagram_type._id});
				  if (!elemType) {
						console.error("No ObjectProperty type");
						return;
				  }

				  elemStyle = elemType["styles"][0];
				  object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, false)
				  
				  new_line_id = await Elements.insertAsync(object);
				  element_map[key] = new_line_id;
				  
				  // linePropertyClass
				  let elemTypeLine = await ElementTypes.findOneAsync({name: "linePropertyClass", diagramTypeId: diagram_type._id});
				  if (!elemTypeLine) {
						console.error("No linePropertyClass type");
						return;
				  }

				  elemStyle = elemTypeLine["styles"][0];
				  let line_layoutSettings = ( elemTypeLine.layoutSettings !== undefined) ?  elemTypeLine.layoutSettings : {};

				  let objectLine = await Create_New_OWLGrEd_Element(list, elemTypeLine, diagram_type, new_diagram_id, elemStyle, true, element_map[d], new_line_id, line_layoutSettings);

				  let objectLine_id = await Elements.insertAsync(objectLine);
				  element_map[objectLine_id] = objectLine_id;
				  
				  objectLine = await Create_New_OWLGrEd_Element(list, elemTypeLine, diagram_type, new_diagram_id, elemStyle, true, new_line_id, element_map[r], line_layoutSettings);

				  objectLine_id = await Elements.insertAsync(objectLine);
				  element_map[objectLine_id] = objectLine_id;
				
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
						if(item.annotations[i][0]["value"] !== "ex:qualifier") await addCompartmentSubCompartments2(listForCompartment, "Annotation", item.annotations[i])
					}
					// PropertyChains
					for(let i = 0; i < item.propertyChains.length; i++){
					   await addCompartmentSubCompartments2(listForCompartment, "PropertyChains", item.propertyChains[i])
					}
					  
				  // qualifiers
				  const qualifiers = item.Qualifiers || [];
				  for (let i = 0; i < qualifiers.length; i++) {
					await addCompartmentSubCompartments2(listForCompartment, "Qualifiers", qualifiers[i])
				  }
				   await setHorizontalLine(listForCompartment, "HorizontalLine14")
				  
				} else {
				
					
					if(item.inverseOf.length > 0){
						elemStyle = assocStyles.find(s => s.name === 'Association_both_end');
					}
					object = await Create_New_OWLGrEd_Element(list, elemType, diagram_type, new_diagram_id, elemStyle, true, element_map[d], element_map[r], line_layoutSettings);

					new_line_id = await Elements.insertAsync(object);
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

					if(item.inverseOf.length > 0 && item.prefixedInv){

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
						const annot = item.annotationsInv || [];
						for(let i = 0; i < annot.length; i++){
						   await addCompartmentSubCompartments2(listForCompartment, "AnnotationInv", annot[i])
						}
						// PropertyChains
						const propertyChainsInv = item.propertyChainsInv || [];
						for(let i = 0; i < propertyChainsInv.length; i++){
						   await addCompartmentSubCompartments2(listForCompartment, "PropertyChainsInv", propertyChainsInv[i])
						}
					}
				  }
				} else {
					if(!element_map[d]) console.error("Object property DOMAIN not found", item)
					if(!element_map[r]) console.error("Object property RANGE not found", item)
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
        line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};

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
		  } else {
			  if(!item.subject) console.error("No restriction subject", item);
			  if(!objectR) console.error("No restriction object", item);
			  if(!item.subject) console.error("No restriction subject class", item);
			  if(!item.subject) console.error("No restriction object class", item);
		  }
		}

		// ComplementOf
		elemType = await ElementTypes.findOneAsync({name: "ComplementOf", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No ComplementOf type");
			return;
		}

		elemStyle = elemType["styles"][0];
        line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};

		if(ontology.complementOf){
			for (const key of Object.keys(ontology.complementOf)) {
			  const item = ontology.complementOf[key];
			  if(element_map[item.subject] && element_map[item.object]){

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
			  } else {
				if(!element_map[item.subject]) console.error("No sybject class for ComplementOf", item);
				if(!element_map[item.object]) console.error("No sybject object for ComplementOf", item);
			  }
			}
		}
		//Individuals
		elemType = await ElementTypes.findOneAsync({name: "Object", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No Object type");
			return;
		}

		for (const key of Object.keys(ontology.individuals)) {
			const item = ontology.individuals[key];
			// if (element_map[key]) {
				// console.error("Key already exists", key, element_map);
				// continue;
			// }

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
			
			if(item.classID){
			  let elemTypeAnC = await ElementTypes.findOneAsync({name: "InstanceOf", diagramTypeId: diagram_type._id});
			  if (!elemTypeAnC) {
				console.error("No Class type");
				return;
			  }
			  let elemStyleAnC = elemTypeAnC["styles"][0];
			  let line_layoutSettings = ( elemStyleAnC.layoutSettings !== undefined) ?  elemStyleAnC.layoutSettings : {};
			  
			  for(let t = 0; t < item.classID.length; t++){
				  if(element_map[item.classID[t]]){
					let objectC = await Create_New_OWLGrEd_Element(list, elemStyleAnC, diagram_type, new_diagram_id, elemStyleAnC, true, new_box_id, element_map[item.classID[t]], line_layoutSettings);

					let new_line_id_An = await Elements.insertAsync(objectC);
					element_map[new_line_id_An] = new_line_id_An;
					  
					let listForCompartmentL = {
						diagram_id: new_diagram_id,
						diagram_type_id: diagram_type._id,
						projectId: list.projectId,
						versionId: list.versionId,
						element_id: new_line_id_An,
						element_type_id: elemTypeAnC._id
					}
					  
					await add_one_compartment(listForCompartmentL, "Label", "<<instanceOf>>", "<<instanceOf>>");
				  } else {
					  console.error("No Class for individual", item, t)
				  }
			  }	
			}
			
			//Annotations
			if((importSettings?.showIndividualAnnotationType_graph ?? true) === true){
			  let elemTypeAn = await ElementTypes.findOneAsync({name: "Annotation", diagramTypeId: diagram_type._id});
			  if (!elemTypeAn) {
					console.error("No Class type");
					return;
			  }
			  let elemStyleAn = elemTypeAn["styles"][0];
			  
			  let elemTypeAnC = await ElementTypes.findOneAsync({name: "Connector", diagramTypeId: diagram_type._id});
				if (!elemTypeAnC) {
					console.error("No Class type");
					return;
				}
			  let elemStyleAnC = elemTypeAnC["styles"][0];
			  let line_layoutSettings = ( elemStyleAnC.layoutSettings !== undefined) ?  elemStyleAnC.layoutSettings : {};
			  
			  //Label
			  if(item.label) {
					const itemAn = item.label;
					let object = await Create_New_OWLGrEd_Element(list, elemTypeAn, diagram_type, new_diagram_id, elemStyleAn, false)

					let new_box_id_An = await Elements.insertAsync(object);
					element_map[new_box_id_An] = new_box_id_An;

					let listForCompartmentAn = {
						diagram_id: new_diagram_id,
						diagram_type_id: diagram_type._id,
						projectId: list.projectId,
						versionId: list.versionId,
						element_id: new_box_id_An,
						element_type_id: elemTypeAn._id
					}
					
					//Type
					await add_one_compartment(listForCompartmentAn, "AnnotationType", "Label", "<<Label>>");
					//Value
					await add_one_compartment(listForCompartmentAn, "Value", item.label, 'Value: "'+item.label + '"');
					
				    let objectC = await Create_New_OWLGrEd_Element(list, elemStyleAnC, diagram_type, new_diagram_id, elemStyleAnC, true, new_box_id_An, new_box_id, line_layoutSettings);

				    let new_line_id_An = await Elements.insertAsync(objectC);
				    element_map[new_line_id_An] = new_line_id_An;
					
			  }	

			  for(let i = 0; i < item.annotations.length; i++){

				const itemAn = item.annotations[i];
				if(itemAn !== null){
					let object = await Create_New_OWLGrEd_Element(list, elemTypeAn, diagram_type, new_diagram_id, elemStyleAn, false)

					let new_box_id_An = await Elements.insertAsync(object);
					element_map[new_box_id_An] = new_box_id_An;

					let listForCompartmentAn = {
						diagram_id: new_diagram_id,
						diagram_type_id: diagram_type._id,
						projectId: list.projectId,
						versionId: list.versionId,
						element_id: new_box_id_An,
						element_type_id: elemTypeAn._id
					}
					
					//Type
					await add_one_compartment(listForCompartmentAn, "AnnotationType", itemAn[0].value, "<<"+itemAn[0].value+">>");
					//Value
					await add_one_compartment(listForCompartmentAn, "Value", itemAn[1].value, 'Value: "'+itemAn[1].value + '"');
					// Language
					if(itemAn[2].value !== "")await add_one_compartment(listForCompartmentAn, "Language", itemAn[2].value, 'Language: '+itemAn[2].value);
					
					
				    let objectC = await Create_New_OWLGrEd_Element(list, elemStyleAnC, diagram_type, new_diagram_id, elemStyleAnC, true, new_box_id_An, new_box_id, line_layoutSettings);

				    let new_line_id_An = await Elements.insertAsync(objectC);
				    element_map[new_line_id_An] = new_line_id_An;
				}
			  }
			} else {
			
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
			}
			// DataPropertyAssertions
			if(item.dataPropertyAssertions){
			  for(let i = 0; i < item.dataPropertyAssertions.length; i++){
				await addCompartmentSubCompartments2(listForCompartment, "DataPropertyAssertion", item.dataPropertyAssertions[i])
			  }
			}
			// NegativeDataPropertyAssertions
			if(item.negativeDataPropertyAssertions){
			  for(let i = 0; i < item.negativeDataPropertyAssertions.length; i++){
				await addCompartmentSubCompartments2(listForCompartment, "NegativeDataPropertyAssertion", item.negativeDataPropertyAssertions[i])
			  }
			}
			if(item.dataPropertyAssertions && item.dataPropertyAssertions.length > 0){
				await setHorizontalLine(listForCompartment, "HorizontalLine10")
			}
			if(item.negativeDataPropertyAssertions && item.negativeDataPropertyAssertions.length > 0){
				await setHorizontalLine(listForCompartment, "HorizontalLine9")
			}
			// DifferentIndividuals
			if(item.differentIndividuals){
			  for(let i = 0; i < item.differentIndividuals.length; i++){
				await addCompartmentSubCompartments2(listForCompartment, "DifferentIndividuals", item.differentIndividuals[i])
			  }
			}
			// SameIndividuals
			if(item.sameIndividuals){
			  for(let i = 0; i < item.sameIndividuals.length; i++){
				await addCompartmentSubCompartments2(listForCompartment, "SameIndividuals", item.sameIndividuals[i])
			  }
			}
			if((item.sameIndividuals && item.sameIndividuals.length > 0) || (item.differentIndividuals && item.differentIndividuals.length > 0)){
				await setHorizontalLine(listForCompartment, "HorizontalLine11")
			}
		}
		
		
		// ontology.classes
		//Individual List
		elemType = await ElementTypes.findOneAsync({name: "ObjectList", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No ObjectList type");
			return;
		}
		
		let individualCount = importSettings?.individualCountInList || 100000;

		for (const key of Object.keys(ontology.individualList)) {
			
			//console.log("IIIIIIIII", key, ontology.classes[key], ontology.individualList[key])
			let individClass = ontology.classes[key];
			let individClassName = key;
			if(individClass) {
				individClassName = individClass.prefixed;
				
				const item = ontology.individualList[key];
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

				//Class name
				await add_one_compartment(listForCompartment, "ClassName", individClassName, "Individual list of " + individClassName);
				
				let classDataPropertyies = individClass.dataProperties;
				let classObjectPropertyies = individClass.objectProperties;

				classDataPropertyies = transformProperties(classDataPropertyies, ontology.prefixes);

				const columns = buildColumns(
					  classDataPropertyies,
					  classObjectPropertyies,
					  ontology
				);

				const rows = buildRows(item, columns);
				
				const visibleValuesByRowId = makeTextTable(columns, rows);

				for(let r = 0; r < rows.length; r++){

					let line =
					r < individualCount
					? visibleValuesByRowId[r+2]
					: "";
					
					if(r==0) line = visibleValuesByRowId[0]+"\n"+visibleValuesByRowId[1]+"\n"+line;
					await addCompartmentSubCompartments2(listForCompartment, "Individuals", [
							{
								name: "Individual",
								input: line,
								value: JSON.stringify(rows[r].cells)
							}
						]);
				}
				
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
        line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};
		
		if(ontology.objectPropertyAssertions){
			for (const key of Object.keys(ontology.objectPropertyAssertions)) {
			  const item = ontology.objectPropertyAssertions[key];
			  if(item.createLink !== false){
				  if(element_map[item.source] && element_map[item.target]){
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
				  } else {
					console.error("No Individual box for object Property Assertion", item); 
				  }
			  }
			}
		}

		//AnnotationProperty
		elemType = await ElementTypes.findOneAsync({name: "AnnotationProperty", diagramTypeId: diagram_type._id});
		if (!elemType) {
			console.error("No AnnotationProperty type");
			return;
		}

		for (const key of Object.keys(ontology.annotationProperties)) {
		  if (!(key in ontology.dataProperties))  {
			const item = ontology.annotationProperties[key];
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				continue;
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
				if(typeof ontology.classes[item.range[0]] !== "undefined") {
					await add_one_compartment(listForCompartment, "Range", ontology.classes[item.range[0]].prefixed, "Range: " + ontology.classes[item.range[0]].prefixed);
				}
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
				await addCompartmentSubCompartments2(listForCompartment, "Annotation",[
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
				continue;
			}
			let classifValues = parseQuotedListExpression(item.definitionExpression);
			if(importSettings?.showAsClassifiers === true && importSettings?.showAsClassifiersDataTypes === true && item.definitionExpression !== null && classifValues.length> 0) {
				elemType = await ElementTypes.findOneAsync({name: "Classifier", diagramTypeId: diagram_type._id});
				if (!elemType) {
					console.error("No Classifier type");
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
				await add_one_compartment(listForCompartment, "Label", "<<Datatype classifier>>", "<<Datatype classifier>>")
				//Name
				if(item.prefixed) await add_one_compartment(listForCompartment, "Name", item.prefixed, item.prefixed)
				await setHorizontalLine(listForCompartment, "HorizontalLine1")
				await add_one_compartment(listForCompartment, "ExportMode", "Datatype enumeration (DataOneOf)", "Datatype enumeration (DataOneOf)")
				for(let v = 0; v < classifValues.length; v++){
					await addCompartmentSubCompartments2(listForCompartment, "Values",[
						{name:"Name",value:classifValues[v]},
					])
				}
				// await setHorizontalLine(listForCompartment, "HorizontalLine2")
			} else{
				elemType = await ElementTypes.findOneAsync({name: "DataType", diagramTypeId: diagram_type._id});
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
				if(item.definitionExpression !== null) await add_one_compartment(listForCompartment, "DataTypeDefinition", item.definitionExpression, item.definitionExpression)

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
		}

		//DisjointClasses
		for (const key of Object.keys(ontology.allDisjointClasses)) {
			const item = ontology.allDisjointClasses[key];
			// if (element_map[key]) {
				// console.error("Key already exists", key, element_map);
				// return;
			// }

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
				line_layoutSettings = ( elemTypeLine.layoutSettings !== undefined) ?  elemTypeLine.layoutSettings : {};

				for (let c = 0; c < item.length; c++) {
				  if(element_map[item[c]]){
					let object = await Create_New_OWLGrEd_Element(list, elemTypeLine, diagram_type, new_diagram_id, elemStyle, true, element_map[new_box_id], element_map[item[c]], line_layoutSettings);

					let new_line_id = await Elements.insertAsync(object);
					element_map[new_line_id] = new_line_id;
				  } else {
					console.error("No Disjoint Class", item[c]);
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
			  line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};

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
		  } else {
			  if(!element_map[item[0]])console.error("No Disjoint Class", item[0]);
			  if(!element_map[item[1]])console.error("No Disjoint Class", item[1]);
		  }
		}

		//EquivalentClasses
		for (const key of Object.keys(ontology.equivalentClasses)) {
			const item = ontology.equivalentClasses[key];
			if (element_map[key]) {
				console.error("Key already exists", key, element_map);
				continue;
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
				line_layoutSettings = ( elemTypeLine.layoutSettings !== undefined) ?  elemTypeLine.layoutSettings : {};

				for (let c = 0; c < item.length; c++) {
				  if(element_map[item[c]]){
					let object = await Create_New_OWLGrEd_Element(list, elemTypeLine, diagram_type, new_diagram_id, elemStyle, true, element_map[new_box_id], element_map[item[c]], line_layoutSettings);

					let new_line_id = await Elements.insertAsync(object);
					element_map[new_line_id] = new_line_id;
				  } else {console.error("No Equivalent Class", item[c]);}
				}
		  } else if(item.length === 2 && element_map[item[0]] && element_map[item[1]]){
			  // Disjoint
				elemType = await ElementTypes.findOneAsync({name: "EquivalentClass", diagramTypeId: diagram_type._id});
				if (!elemType) {
					console.error("No EquivalentClass type");
					return;
				}

			  elemStyle = elemType["styles"][0];
			  line_layoutSettings = ( elemType.layoutSettings !== undefined) ?  elemType.layoutSettings : {};

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
		  }else {
			  if(!element_map[item[0]])console.error("No Equivalent Class", item[0]);
			  if(!element_map[item[1]])console.error("No Equivalent Class", item[1]);
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
    if ( compartmentName === 'ClassList' ||  compartmentName === 'Name' ) {
      const nList = value_list.map(a => a.shortName)
      await add_one_compartment(list, 'SchemaInformation', JSON.stringify(nList), JSON.stringify(nList));
    }
    if ( !list.compactClassView && compartmentName !== 'ClassList')
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

      if (ct.inputType.type === "custom") {
      // if (ct.inputType.type === "custom" && ct.inputType.templateName === "multiField") {
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
        // var sc = _.find(subcompartment_value_list, function(s) {return s.name === sub_c.name});
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
		if (mapped_value || mapped_value === "") {
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

function sameElements(a, b) {
  if (a.length !== b.length) return false;

  const counts = new Map();
  for (const x of a) counts.set(x, (counts.get(x) || 0) + 1);

  for (const x of b) {
    const n = counts.get(x);
    if (!n) return false;
    if (n === 1) counts.delete(x);
    else counts.set(x, n - 1);
  }
  return counts.size === 0;
}

function containsSameArrayAndRemove(target, listOfArrays) {
  const idx = listOfArrays.findIndex(arr => sameElements(target, arr));

  if (idx === -1) {
    return { found: false, list: listOfArrays.slice() }; // unchanged copy
  }

  const newList = listOfArrays.slice();
  newList.splice(idx, 1); // remove matched array
  return { found: true, list: newList };
}


function getLocalName(iri) {
  if (!iri) return "";
  return iri.split("#").pop().split("/").pop();
}


function buildColumns(dataProperties = [], objectProperties = [], ontology = {}) {
  const columns = [
    {
      id: "IRI",
      name: "IRI",
      kind: "iri",
    },
  ];

  for (const propertyIri of dataProperties) {
    const property = ontology.dataProperties?.[propertyIri];

    if (!property) continue;

    columns.push({
      id: property.iri,
      name: property.prefixed || property.label || getLocalName(property.iri),
      kind: "data",
    });
  }

  for (const propertyIri of objectProperties) {
    const property = ontology.objectProperties?.[propertyIri];

    if (!property) continue;

    const firstRangeIri = property.range?.[0];

    columns.push({
      id: property.iri,
      name: property.prefixed || property.label || getLocalName(property.iri),
      kind: "object",
      targetClassName: getLocalName(firstRangeIri),
    });
  }

  return columns;
}

function buildRows(itemList = [], columns = []) {
  return itemList.map(item => {
    const cells = columns.map(column => {
      if (column.kind === "iri") {
        return {
          id: column.id,
          columnKind: column.kind,
          value: item.prefixed || getLocalName(item.iri),
		  name: column.name,
        };
      }

      if (column.kind === "data") {
        const fact = item.dataFacts?.find(f => f.p === column.id && !f.negative);

        return {
          id: column.id,
          columnKind: column.kind,
          value: fact?.value || "",
		  name: column.name,
        };
      }

      if (column.kind === "object") {
        const fact = item.objFacts?.find(f => f.p === column.id && !f.negative);

        return {
          id: column.id,
          columnKind: column.kind,
          value: fact ? getLocalName(fact.object) : "",
		  name: column.name,
        };
      }

      return {
        id: column.id,
        columnKind: column.kind,
        value: "",
		name: column.name,
      };
    });

    return { cells };
  });
}


function makeTextTable(columns = [], rows = []) {
  const VERTICAL = "\u2502";   // │
  const HORIZONTAL = "\u2500"; // ─
  const CROSS = "\u253C";      // ┼

  const headerValues = columns.map(column => column.name);

  const rowValues = rows.map(row => {
    return columns.map(column => {
      const cell = row.cells.find(c => c.id === column.id);
      return cell?.value ?? "";
    });
  });

  const allValues = [headerValues, ...rowValues];

  const columnWidths = columns.map((_, columnIndex) => {
    return Math.max(
      ...allValues.map(row => String(row[columnIndex] ?? "").length)
    );
  });

  function padValue(value, columnIndex) {
    return String(value ?? "").padEnd(columnWidths[columnIndex], " ");
  }

  function makeLine(values) {
    return values
      .map((value, index) => padValue(value, index))
      .join(` ${VERTICAL} `);
  }

  const headerLine = makeLine(headerValues);

  const horizontalLine = columnWidths
    .map(width => HORIZONTAL.repeat(width))
    .join(`${HORIZONTAL}${CROSS}${HORIZONTAL}`);

  const dataLines = rowValues.map(makeLine);

  const lines = [
    headerLine,
    horizontalLine,
    ...dataLines,
  ];

  return Object.fromEntries(
    lines.map((line, index) => [index, line])
  );
}

function transformProperties(data, prefixes) {
  const defaultPrefix = prefixes[""] || "";

  return data
    .map(propertyFields => {
      const nameField = propertyFields.find(field => field.name === "Name");

      if (!nameField || !nameField.value) {
        return null;
      }

      const name = nameField.value.trim();

      // If name has prefix, use only the local part
      // Example: ex:studentName -> studentName
      const localName = name.includes(":")
        ? name.split(":").slice(1).join(":")
        : name;

      return defaultPrefix + localName;
    })
    .filter(Boolean);
}

function parseQuotedListExpression(expr) {
  if (typeof expr !== "string") return [];

  const result = [];
  const re = /"((?:\\.|[^"\\])*)"/g;

  let match;
  while ((match = re.exec(expr)) !== null) {
    result.push(
      match[1]
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
    );
  }

  return result;
}

// For strings like:
// ( Male, Female )
// ({ Male, Female })
// { Male, Female }
// ( Male Female )
function parseUnquotedListExpression(expr) {
  if (typeof expr !== "string") return [];

  let text = expr.trim();

  // Remove surrounding ({ ... }) form
  if (text.startsWith("({") && text.endsWith("})")) {
    text = text.slice(2, -2).trim();
  }
  // Remove surrounding { ... } form
  else if (text.startsWith("{") && text.endsWith("}")) {
    text = text.slice(1, -1).trim();
  }
  // Remove surrounding ( ... ) form
  else if (text.startsWith("(") && text.endsWith(")")) {
    text = text.slice(1, -1).trim();
  }

  return text
    .split(/[,\s]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

function removeIndividualsByInstances(individuals, instances) {
  if (!individuals || typeof individuals !== "object") return individuals;
  if (!Array.isArray(instances)) return individuals;

  for (const iri of instances) {
    delete individuals[iri];
  }

  return individuals;
}

function removeIndividualListByClass(individualList, classIri){
  for (const iri of Object.keys(individualList)) {
    if(iri === classIri) delete individualList[iri];
  }

  return individualList;
}

function moveObjectPropertiesWithClassRangeToDataProperties(ontology, classIri) {
  if (!ontology?.classes || !ontology?.objectProperties) return ontology;

  for (const [propIri, prop] of Object.entries(ontology.objectProperties)) {
    const domainIri = prop.domain?.[0];
    const rangeIri = prop.range?.[0];

    if (!domainIri || !rangeIri) continue;

    const rangeClass = ontology.classes[rangeIri];
    const domainClass = ontology.classes[domainIri];

    // Move only if the object property range is a class in ontology.classes
    if (!rangeClass || !domainClass) continue;
	
	// if (rangeIri !== classIri) continue;

    const dataPropertyRow = [
      {
        name: "Name",
        value: prop.prefixed || iriToLocalName(prop.iri)
      },
      {
        name: "Type",
        value: rangeClass.prefixed || iriToLocalName(rangeIri)
      },
      {
        name: "Multiplicity",
        value: ""
      },
      {
        name: "Annotation",
        input: "",
        value: JSON.stringify(prop.annotations || [])
      },
      {
        name: "IsFunctional",
        value: String(!!prop.characteristics?.FunctionalProperty)
      },
      {
        name: "EquivalentProperties",
        input: "",
        value: JSON.stringify(prop.equivalentProperties || [])
      },
      {
        name: "SuperProperties",
        input: "",
        value: JSON.stringify(prop.superProperties || [])
      },
      {
        name: "DisjointProperties",
        input: "",
        value: JSON.stringify(prop.disjointProperties || [])
      }
    ];

    domainClass.dataProperties ||= [];

    const alreadyExists = domainClass.dataProperties.some(row =>
      Array.isArray(row) &&
      row.some(c => c.name === "Name" && c.value === dataPropertyRow[0].value)
    );

    if (!alreadyExists) {
      domainClass.dataProperties.push(dataPropertyRow);
    }

    // Remove the property from domain class objectProperties
    domainClass.objectProperties = (domainClass.objectProperties || [])
      .filter(x => x !== propIri);

    // Remove the property from range class objectProperties
    rangeClass.objectProperties = (rangeClass.objectProperties || [])
      .filter(x => x !== propIri);

    // Remove from ontology.objectProperties
    // delete ontology.objectProperties[propIri];
  }

  return ontology;
}

function iriToLocalName(iri) {
  if (!iri || typeof iri !== "string") return iri;
  const hashIndex = iri.lastIndexOf("#");
  if (hashIndex !== -1) return iri.slice(hashIndex + 1);

  const slashIndex = iri.lastIndexOf("/");
  if (slashIndex !== -1) return iri.slice(slashIndex + 1);

  return iri;
}