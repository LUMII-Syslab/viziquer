let ReplaceLineType;
let DeleteBoxType;
let findResults;
let apstaigatieReplace;

function getStartElem(diagParamList, diagramType){// iegūstam pirmo elementu no speciāllīnijas
    let elementToFind;
    ReplaceLineType = ElementTypes.findOne({name: "FindReplaceLink", diagramTypeId: diagramType})._id;// ja tādas speciāllīnijas definīcijā nav, tad metīs kļūdu
    DeleteBoxType   = ElementTypes.findOne({name: "RemoveElement", diagramTypeId: diagramType})._id;
    let ReplaceLine = Elements.findOne({elementTypeId: ReplaceLineType, diagramId: diagParamList.diagramId});
    if( ReplaceLine ){
        elementToFind = Elements.findOne({_id: ReplaceLine.startElement})
    }
    else console.log('Replace line not found');
    
    return elementToFind;
}
function getElementTypeId(elementId){ return Elements.findOne({_id: elementId}).elementTypeId; }
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
            {$or: [{startElement: elementId},{endElement: elementId}]},
            {elementTypeId: {$ne: ReplaceLineType}}
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
    Compartments.remove({elementId: elementId});
    Elements.remove({_id: elementId});
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
function deleteElementEdges(elementId){
    let RelatedEdges = FindRelatedEdges(elementId);
    if(!( typeof RelatedEdges === 'undefined')){
        _.each(RelatedEdges, function(relatedEdge){
            deleteOldElementAndCompartments(relatedEdge._id);
        })
    }
}
function createBox(diagToReplaceIn, ReplaceElement){
    return NewReplaceElement = {
    diagramId       : diagToReplaceIn,
    diagramTypeId   : ReplaceElement.diagramTypeId,
    elementTypeId   : ReplaceElement.elementTypeId,
    style           : ReplaceElement.style,
    styleId         : ReplaceElement.styleId,
    type            : ReplaceElement.type,
    location        : ReplaceElement.location,
    projectId       : ReplaceElement.projectId,
    versionId       : ReplaceElement.versionId
    }
}
function createEdge(edge, diagId, startElement, endElement){
    return newEdge = {
        startElement    : startElement,
        endElement      : endElement,
        diagramId       : diagId,
        diagramTypeId   : edge.diagramTypeId,
        elementTypeId   : edge.elementTypeId,
        style           : edge.style,
        styleId         : edge.styleId,
        type            : edge.type,
        points          : edge.points,
        projectId       : edge.projectId,
        versionId       : edge.versionId,
    }
}
function replaceSingleNode(matchElement){ // tiek izsaukts, kad ir tikai viens elements meklējamā pusē
    if(matchElement){
        let FindDiagramId   = Elements.findOne({_id: matchElement.findElementId}).diagramId; // diagramma, kurā meklēsim aizvietotājelementu
        let ReplaceLine     = Elements.findOne({elementTypeId: ReplaceLineType, diagramId: FindDiagramId});
        let ReplaceElement  = Elements.findOne({_id: ReplaceLine.endElement});
        let diagToReplaceIn = Elements.findOne({_id: matchElement.elementId}).diagramId;
        if(ReplaceElement.elementTypeId == DeleteBoxType){
            deleteElementEdges(matchElement.elementId);
            deleteOldElementAndCompartments(matchElement.elementId);
        }
        else{
            let NewReplaceElement = createBox(diagToReplaceIn, ReplaceElement);
            let id          = Elements.insert(NewReplaceElement);// jaunā elementa ids
            let RelatedOldNodeEdges = FindRelatedEdges(matchElement.elementId);

            switchEdgesFromOldToNewElement(matchElement.elementId, id, RelatedOldNodeEdges);
            createCompartments(matchElement.elementId,id);
            deleteOldElementAndCompartments(matchElement.elementId);
        }
    }
    else console.log('match Elements not found');
}
function pushEdgeNodes(edge){
    let FindSource = _.findWhere(apstaigatieReplace,{_id: edge.startElement});
    let FindTarget = _.findWhere(apstaigatieReplace,{_id: edge.endElement});
    if( typeof FindSource === 'undefined'){
        let source = Elements.findOne({_id: edge.startElement});
        _.extend(source,{visited: false});
        apstaigatieReplace.push(source);
    }
    if( typeof FindTarget === 'undefined'){
        let target = Elements.findOne({_id: edge.endElement});
        _.extend(target,{visited: false});
        apstaigatieReplace.push(target);
    }
}
function getNotVisitedItems() { // ciklojas
    let notVisitedBox = _.findWhere(apstaigatieReplace, {visited: false});
    if(notVisitedBox) {
        notVisitedBox.visited = true;
        let RelatedEdges = FindRelatedEdges(notVisitedBox._id);
        if( RelatedEdges ){
            _.each(RelatedEdges, function(edge){
                pushEdgeNodes(edge);
                let edgeInContainer = _.findWhere(apstaigatieReplace, {_id: edge._id});
                if(!edgeInContainer) apstaigatieReplace.push(edge);
            });
        }
        return true;
    }
    else return false;
}
function replaceStruct(match){
    if(match){
        let FindDiagram     = Elements.findOne({_id: _.first(match).findElementId}).diagramId;
        let ReplaceLines    = Elements.find({elementTypeId: ReplaceLineType, diagramId: FindDiagram}).fetch();
        ReplaceLines        = _.groupBy(ReplaceLines,'endElement');
        let endElements     = _.keys(ReplaceLines);
        let diagToReplaceIn = Elements.findOne({_id: _.first(match).elementId}).diagramId;

        _.each(endElements, function(endElement){
            let endElementTypeId = getElementTypeId(endElement);
            if( !(typeof endElementTypeId === 'undefined') && endElementTypeId == DeleteBoxType){
                // ejot cauri speciāllīnijām, atrodam elementus, kurus ir jāizdzēš
                _.each(ReplaceLines[endElement], function(ReplaceLine){
                    // jādzēš korekti match elementi, kurš tieši???
                })
                endElements = _.without(endElements, endElement)
            }
            else{
                let FirstReplaceElement = Elements.findOne(endElement);
                _.extend(FirstReplaceElement, {visited: false});
                apstaigatieReplace = [FirstReplaceElement];
                let found = getNotVisitedItems();
                while(found) { found = getNotVisitedItems() }
                if(_.size(apstaigatieReplace) == 1){
                    
                }
                else if ( _.size(apstaigatieReplace) > 1){
                    let createdBoxes = _.filter(apstaigatieReplace, function(apst){ return _.has(apst, "visited") });
                    createdBoxes = _.groupBy(_.map(createdBoxes, function(box){ return {local: box._id, inserted: undefined} }), 'local');
                    console.log(createdBoxes);
                     // palīgkonteiners, lai pieglabāt jau ievietotās virsotnes
                    _.each(apstaigatieReplace, function(element){
                        if( !_.has(element,"visited")){ // visited īpašības nav tikai šķautnēm konteinerā apastaigatieReplace
                            let start = createdBoxes[element.startElement]
                            let end   = createdBoxes[element.endElement];
                            if(typeof start.inserted === 'undefined'){
                                let startbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.startElement}));
                                createdBoxes[element.startElement].inserted    = Elements.insert(startbox);
                            }
                            if(typeof end.inserted === 'undefined'){
                                let endbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.endElement}));
                                createdBoxes[element.endElement].inserted      = Elements.insert(endbox);
                            }
                            let newEdge = createEdge(element, diagToReplaceIn, start.inserted, end.inserted);
                            let NewEdgeId = Elements.insert(newEdge);
                        }
                    })
                }
            }
        })
    }
    else console.log('match not found/undefined')
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
    },
    replaceComplexStructure: function(match){
        replaceStruct(match)
        return;
    }
})