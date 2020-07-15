let ReplaceLineType;
let findResults;

function getStartElem(diagParamList, diagramType){// iegūstam pirmo elementu no speciāllīnijas
    let elementToFind;
    ReplaceLineType = ElementTypes.findOne({name: "FindReplaceLink", diagramTypeId: diagramType})._id;// ja tādas speciāllīnijas definīcijā nav, tad metīs kļūdu
    let ReplaceLine = Elements.findOne({elementTypeId: ReplaceLineType, diagramId: diagParamList.diagramId});
    if( ReplaceLine ){
        elementToFind = Elements.findOne({_id: ReplaceLine.startElement})
    }
    else console.log('Replace line not found');
    
    return elementToFind;
}

function getEdges(_boxId){
    
    return relatedEdges = Elements.find({
        $and:
        [
            {$or: [ {startElement:_boxId}, {endElement: _boxId} ]},
            {elementTypeId: {$ne: ReplaceLineType}}
        ]
    }).fetch();
}

function FindDiagMatches(diagParamList){
    
    diagramTypeId   = Diagrams.findOne({_id:diagParamList.diagramId}).diagramTypeId;
    StartFindElem   = getStartElem(diagParamList, diagramTypeId);   // F - atrodam Find starta elementu
    if(StartFindElem){
        let Edges = getEdges(StartFindElem._id);
        if( Edges && _.size(Edges) > 0){
            findResults = Meteor.call('findEdge', _.first(Edges), diagParamList.diagramId);
            console.log('Found matches by edge:')
            console.dir(findResults, { depth: null })
        }
        else{
            findResults = Meteor.call('findNode', StartFindElem);
            /* console.log('Found matches by node')
            console.dir(findResults, { depth: null }); */
        }
        return findResults;
    }
    else console.log('Start element not found')

}
/** Aizvietošanas funkcijas **/
function FindRelatedEdges(elementId){
    return RelatedOldNodeEdges = Elements.find({
        $and:
        [
            {$or: [{startElement: elementId},{endElement: elementId}]}
        ]
    }).fetch();// atlasām saistītās šķautnes
}
function switchEdgesFromOldToNewElement(oldElementId, newElementId,RelatedOldNodeEdges){
    if( RelatedOldNodeEdges){
        _.each(RelatedOldNodeEdges, function(edge){// kabinām klāt jaunai virsotnei
            if(edge.startElement == oldElementId){ // exception handling???
                Elements.update(
                    {_id: edge._id},
                    {$set: {startElement: newElementId}}
                    )
            }
            else if(edge.endElement == oldElementId){
                Elements.update(
                    {_id: edge._id},
                    {$set: {endElement: newElementId}}
                    )
            }
        })
    }
}
function deleteOldElementAndCompartments(elementId){ // dzēšam nost Elementu un tā Compartments
    console.log('Compartments deletion', Compartments.remove({elementId: elementId}));
    console.log('Element deletion', Elements.remove({_id: elementId}));
}
function createCompartments(oldElementId, newElementId){
    let oldElemCompartments = Compartments.find({elementId: oldElementId}).fetch();
    if( _.size(oldElemCompartments) > 0){
        let newElementTypeId = Elements.findOne({_id: newElementId}).elementTypeId;
        _.each(oldElemCompartments, function(compartment){
            let oldCompartmentType = CompartmentTypes.findOne({_id: compartment.compartmentTypeId});
            let newElemCompartmentType = CompartmentTypes.findOne({
                elementTypeId:  newElementTypeId,
                name:           oldCompartmentType.name,
                inputType:      {type: oldCompartmentType.inputType.type, inputType: oldCompartmentType.inputType.inputType}    
            })._id;
            if(newElemCompartmentType){
                console.log('old compartment:',Compartments.findOne({_id: compartment._id}));
                delete compartment._id;
                compartment.elementId = newElementId;
                compartment.diagramId = Elements.findOne({_id: newElementId}).diagramId;
                compartment.elementTypeId = Elements.findOne({_id: newElementId}).elementTypeId;
                compartment.compartmentTypeId = CompartmentTypes.findOne({elementTypeId: compartment.elementTypeId})._id;
                compartment._id = Compartments.insert(compartment);
                console.log('new compartment:', Compartments.findOne({_id: compartment._id}))
            }
        })
    }
    else console.log('copartments not found')
}
function replaceSingleNode(matchElements){
    if(matchElements){
        let FindDiagramId   = Elements.findOne({_id: matchElements.findElementId}).diagramId; // diagramma, kurā meklēsim aizvietotājelementu
        let ReplaceLine     = Elements.findOne({elementTypeId: ReplaceLineType, diagramId: FindDiagramId});
        let ReplaceElement  = Elements.findOne({_id: ReplaceLine.endElement});
        let diagToReplaceIn = Elements.findOne({_id: matchElements.elementId}).diagramId;
        let NewReplaceElement = {
        diagramId       : diagToReplaceIn,
        diagramTypeId   : ReplaceElement.diagramTypeId,
        elementTypeId   : ReplaceElement.elementTypeId,
        style           : ReplaceElement.style,
        styleId         : ReplaceElement.styleId,
        type            : ReplaceElement.type,
        location        : Elements.findOne({_id: matchElements.elementId}).location,
        projectId       : ReplaceElement.projectId,
        versionId       : ReplaceElement.versionId
        }
        let id          = Elements.insert(NewReplaceElement);// jaunā elementa ids
        let RelatedOldNodeEdges = FindRelatedEdges(matchElements.elementId);

        switchEdgesFromOldToNewElement(matchElements.elementId, id, RelatedOldNodeEdges);
        createCompartments(matchElements.elementId,id);
        deleteOldElementAndCompartments(matchElements.elementId);
    }
    else console.log('match Elements not found');
}
Meteor.methods({
    findDiags: function(diagParamList){
        console.log(`Diagram id: ${diagParamList.diagramId}`);
        return FindDiagMatches(diagParamList);
    },
    replaceOneNode: function(matchElements){
        replaceSingleNode(matchElements)
        return;
    },
    replaceOneNodeManyOccurences: function(matches){
        _.each(matches, function(match){
            replaceSingleNode(_.first(match.elements))
            return
        })
    }
})