let ReplaceLineType;
let DeleteBoxType;
//let findResults;
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
    
    let diagramTypeId   = Diagrams.findOne({_id:diagParamList.diagramId}).diagramTypeId;
    let StartFindElem   = getStartElem(diagParamList, diagramTypeId);   // F - atrodam Find starta elementu
    let findResults     = [];
    if(StartFindElem){
        let Edges = getEdges(StartFindElem._id);
        if( Edges && _.size(Edges) > 0){
            findResults = Meteor.call('findEdge', _.first(Edges), diagParamList.diagramId);
        }
        else{
            findResults = Meteor.call('findNode', StartFindElem);
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
function createCompartments(oldElementsList, newElementId){
     let newElementTypeId = getElementTypeId(newElementId);
    _.each(oldElementsList, function(oldElementId){
        let oldElementCompartments = Compartments.find({elementId: oldElementId}).fetch();
        if(_.size(oldElementCompartments)){

            _.each(oldElementCompartments, function(oldElementCompartment){
                let compartmentType             = CompartmentTypes.findOne({_id: oldElementCompartment.compartmentTypeId});// old Compartment type
                let NewElementCompartmentType   = CompartmentTypes.findOne({
                    elementTypeId: newElementTypeId, 
                    name: compartmentType.name,
                    inputType: compartmentType.inputType
                });
                if( NewElementCompartmentType ){
                    // ja tips ir atrasts, tad veidojam kopiju no vecā compartments, ar to nav jābūt problēmu,
                    // un ievietojam jaunu Compartment dbāzē, uzmanīgi ar elementId, elementTypeId, compartmentTypeId utt
                    let NewElementCompartment = Compartments.findOne({elementId: newElementId, compartmentTypeId: NewElementCompartmentType._id});
                    if( typeof NewElementCompartment === 'undefined'){// ja vēl nav atribūta ar atrasto atribūta tipu pie jaunā elementa, tad veidojam jaunu atribūtu
                        NewElementCompartment                   = oldElementCompartment;
                        NewElementCompartment._id               = undefined;
                        NewElementCompartment.elementId         = newElementId;
                        NewElementCompartment.elementTypeId     = newElementTypeId;
                        NewElementCompartment.compartmentTypeId = NewElementCompartmentType._id;

                        console.log('compartment insertion:',Compartments.insert(NewElementCompartment));
                    }
                    else console.log('compartment with such type already exists');
                }
                else console.log('Compartment type not found');
            });
        }
    });
        
}
function ConcatenateResults(ResultArray){
    let result = "";
    for(let i = 0; i < ResultArray.length; i++){
        result = result.concat(ResultArray[i]);
    }
    return result;
}
function findCompartValueBySpecLine(Expression, startElements){// line.atr
    Expression          = Expression.trim();
    let SpecLineName    = Expression.substring(0,Expression.indexOf("."));
    let CompartmentName = Expression.substring( Expression.indexOf(".")+1 );
    let diagramIdFind   = Elements.findOne({_id: _.first(startElements)}).diagramId;
    let SpecLine        = Compartments.findOne({elementTypeId: ReplaceLineType, diagramId: diagramIdFind, value: SpecLineName});
    if(SpecLine){
        let startElement = Elements.findOne({_id: SpecLine.elementId}).startElement;
        return findCompartValueByName(CompartmentName, _.intersection(startElements,[startElement]));
    }
    else console.log('not found spec line');
}
function findCompartValueByName(CompartmentName, startElements){
    CompartmentName = CompartmentName.trim();
    let value = "";
    for(let i = 0; i < startElements.length; i++){
        let StartElementCompartments = Compartments.find({elementId: startElements[i]}).fetch();

        for(let j = 0; j < StartElementCompartments.length; j++){
            let CompartmentType = CompartmentTypes.findOne({_id: StartElementCompartments[j].compartmentTypeId});
            if(CompartmentName == CompartmentType.name){
                value = StartElementCompartments[i].value;
                break;
            }
        }
        if(value.length) break;
    }
    return value;
}
function extractCompartmentValues(Expression, startElements){
    let partsOfCompartment  = Expression.split("+");
    let ResultArray         = _.map(partsOfCompartment, function(resultItem){
        if(resultItem.includes("@") && resultItem.includes(".")){ return findCompartValueBySpecLine(resultItem.substring(1),startElements)}
        else if(resultItem.includes("@")) { return findCompartValueByName(resultItem.substring(1), startElements) }
        else return resultItem;
    });
    return ConcatenateResults(ResultArray);
}
function parseCompartmentExpressions(startElements, endElementId, createdEndElementId){ // looking for expression which starts with @ symbol
    let EndElementCompartments = Compartments.find({elementId: endElementId}).fetch();
    
    _.each(EndElementCompartments, function(EndElemCompartment){
        if(EndElemCompartment.value.includes("@")){
            let ExpressionResult    = extractCompartmentValues(EndElemCompartment.value, startElements);
            if(ExpressionResult.length){
                let ExistingCompartment = Compartments.findOne({elementId: createdEndElementId, compartmentTypeId: EndElemCompartment.compartmentTypeId});
                if(typeof ExistingCompartment === 'undefined'){
                    let newCompartment = {
                        _id:                    undefined,
                        projectId:              EndElemCompartment.projectId,
                        elementId:              createdEndElementId,
                        diagramId:              Elements.findOne({_id: createdEndElementId}).diagramId,
                        diagramTypeId:          EndElemCompartment.diagramTypeId,
                        elementTypeId:          EndElemCompartment.elementTypeId,
                        versionId:              EndElemCompartment.versionId,
                        compartmentTypeId:      EndElemCompartment.compartmentTypeId,
                        input:                  ExpressionResult,
                        value:                  ExpressionResult,
                        index:                  EndElemCompartment.index,
                        isObjectRepresentation: EndElemCompartment.isObjectRepresentation,
                        styleId:                EndElemCompartment.styleId,
                        style:                  EndElemCompartment.style,
                        valueLC:                ExpressionResult.toLowerCase()
                    }
                    newCompartment._id = Compartments.insert(newCompartment);
                }
                else{ // smthing wrong with Expression Result
                    console.log('Updating created compartment:', Compartments.update(
                        {elementId: createdEndElementId, compartmentTypeId: EndElemCompartment.compartmentTypeId},
                        {$set: {value: ExpressionResult, valueLC: ExpressionResult.toLowerCase(), input: ExpressionResult}}
                        ));
                }
            }
        }
    });
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
                parseCompartmentExpressions(startFindElements,endElement ,createdEndElement);
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