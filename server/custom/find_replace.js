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
            console.log('Found matches by node')
            console.dir(findResults, { depth: null });
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
function replaceSingleNode(matchElements){
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
    let id          = Elements.insert(NewReplaceElement);
    let testElem    = Elements.findOne({_id: id});
    let RelatedOldNodeEdges = FindRelatedEdges(matchElements.elementId);
    console.log('Related edges', RelatedOldNodeEdges);

    switchEdgesFromOldToNewElement(matchElements.elementId, id, RelatedOldNodeEdges);
    
    deleteOldElementAndCompartments(matchElements.elementId);
    console.log('new replace element',testElem);
    
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
            replaceSingleNode(match.elements)
            return
        })
    }
})