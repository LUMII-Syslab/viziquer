let ReplaceLineType;
let DeleteBoxType;
let findResults;
let apstaigatieReplace;
let createdBoxes;

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
            // console.log('Found matches by edge:')
            // console.dir(findResults, { depth: null })
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
function getCompartmentValues(compartmentType, ElementList){
    let compartmentValues = {
        input   : "",
        value   : "",
        valueLC : ""
    };
    let FoundCompartments = Compartments.find({
        $and:
        [
            {elementId: {$in: ElementList}}
        ]
    }).fetch();
    if( FoundCompartments ){
        console.log('FOUND COMPARTMENTS', FoundCompartments);
        _.each(FoundCompartments, function(compartment){
            
            compartmentValues.input += compartment.input + " ";
            compartmentValues.value += compartment.value + " ";
            compartmentValues.valueLC += compartment.valueLC + " "; 
        })
        compartmentValues.input.trim();
        compartmentValues.value.trim();
        compartmentValues.valueLC.trim();
        return compartmentValues; 
    }
    else console.log('compartments not found')
}
function createCompartments(oldElementsList, newElementId){
    let newElementTypeId = getElementTypeId(newElementId);
    
        let oldElemCompartments = Compartments.find(
            {$and:
            [
                {elementId: {$in: oldElementsList}}
            ]}).fetch();
        if( _.size(oldElemCompartments) > 0){
            
            // _.each(oldElemCompartments, function(compartment){
                let compartment = _.first(oldElemCompartments);
                let oldCompartmentType = CompartmentTypes.findOne({_id: compartment.compartmentTypeId});
                let newElemCompartmentType = CompartmentTypes.findOne({
                    elementTypeId:  newElementTypeId,
                    name:           oldCompartmentType.name,
                    inputType:      {type: oldCompartmentType.inputType.type, inputType: oldCompartmentType.inputType.inputType}   
                })._id;
                if(newElemCompartmentType){
                    let compartmentValues = getCompartmentValues(newElemCompartmentType, oldElementsList);
                    console.log('found compartments values', compartmentValues)
                    delete compartment._id;
                    compartment.elementId           = newElementId;
                    compartment.diagramId           = Elements.findOne({_id: newElementId}).diagramId;
                    compartment.elementTypeId       = Elements.findOne({_id: newElementId}).elementTypeId;
                    compartment.compartmentTypeId   = CompartmentTypes.findOne({elementTypeId: compartment.elementTypeId})._id;
                    compartment.input               = compartmentValues.input;
                    compartment.value               = compartmentValues.value;
                    compartment.valueLC             = compartmentValues.valueLC;
                    compartment._id = Compartments.insert(compartment);
                    console.log('new compartment:', Compartments.findOne({_id: compartment._id}))
                }
            // })
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
            if( !(typeof endElementTypeId === 'undefined') && endElementTypeId != DeleteBoxType){
                // ejot cauri speciāllīnijām, atrodam elementus, kurus ir jāaizvieto
                let FirstReplaceElement = Elements.findOne(endElement);
                _.extend(FirstReplaceElement, {visited: false});
                apstaigatieReplace = [FirstReplaceElement];
                let found = getNotVisitedItems();
                while(found) { found = getNotVisitedItems() }
                createdBoxes = _.filter(apstaigatieReplace, function(apst){ return _.has(apst, "visited") });
                createdBoxes = _.groupBy(_.map(createdBoxes, function(box){ return {local: box._id, inserted: undefined} }), 'local');
                // palīgkonteiners, lai pieglabāt jau ievietotās virsotnes
                _.each(apstaigatieReplace, function(element){
                    if( !_.has(element,"visited")){ // visited īpašības nav tikai šķautnēm konteinerā apastaigatieReplace
                        let start = _.first(createdBoxes[element.startElement]);
                        let end   = _.first(createdBoxes[element.endElement]);
                        if(typeof start.inserted === 'undefined'){
                            let startbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.startElement}));
                            _.first(createdBoxes[element.startElement]).inserted    = Elements.insert(startbox);
                        }
                        if(typeof end.inserted === 'undefined'){
                            let endbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.endElement}));
                            _.first(createdBoxes[element.endElement]).inserted      = Elements.insert(endbox);
                        }
                        console.log('created boxes',createdBoxes)
                        let newEdge = createEdge(element, diagToReplaceIn, start.inserted, end.inserted);
                        let NewEdgeId = Elements.insert(newEdge);
                    }
                    else { // ja visited īpašība ir, vedojam šo pašu virsotni
                        let box = createdBoxes[element._id];
                        if(typeof box.inserted === 'undefined'){
                            let NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}));
                            _.first(createdBoxes[element._id]).inserted    = Elements.insert(NewBox);
                        }
                    }
                });
                let startFindElements = _.pluck(ReplaceLines[endElement], 'startElement');
                let startElements = _.filter(match, function(element){ return _.contains(startFindElements, element.findElementId)});
                startElements = _.pluck(startElements, 'elementId');
                
                let createdEndElement = _.first(createdBoxes[FirstReplaceElement._id]).inserted;
                _.each(startElements, function(element){ switchEdgesFromOldToNewElement(element, createdEndElement,FindRelatedEdges(element)) });// pārvietojam šķautnes
                createCompartments(startElements, createdEndElement);
                _.each(startElements, function(element){ deleteOldElementAndCompartments(element)}); // dzēšam vecos elementus
            }
        });
    }
    else console.log('match not found/undefined')
}
Meteor.methods({
    findDiags: function(diagParamList){
        console.log(`Diagram id: ${diagParamList.diagramId}`);
        return FindDiagMatches(diagParamList);
    },
    replaceOneNodeManyOccurences: function(matches){
        _.each(matches, function(match){
            // vēl jātiek galā ar vienu
            return
        })
    },
    replaceStructure: function(match){
        replaceStruct(match)
        return;
    }
})