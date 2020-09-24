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
function FindEdgeBySourceAndTarget(soureId, targetId){
    return ( Elements.findOne({
        startElement: soureId,
        endElement: targetId
    })  || 
    Elements.findOne({
        startElement: targetId,
        endElement: soureId
    })
    );
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
    console.log('element removal');
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
function findCompartValueBySpecLine(SpecLineName, CompartmentName, startElements){// line.atr
    
    let diagramIdFind   = Elements.findOne({_id: _.first(startElements)}).diagramId;
    let SpecLine        = Compartments.findOne({elementTypeId: ReplaceLineType, diagramId: diagramIdFind, value: SpecLineName});
    console.log(`elementTypeId: ${ReplaceLineType} diagramId: ${diagramIdFind} value: ${SpecLineName}`);
    if(SpecLine){
        let startElement = Elements.findOne({_id: SpecLine.elementId}).startElement;
        return findCompartValueByName(CompartmentName, _.intersection(startElements,[startElement]));
    }
    else console.log('not found spec line');
}
function findCompartValueByName(CompartmentName, startElements){
    let value = "";
    for(let i = 0; i < startElements.length; i++){
        let StartElementCompartments = Compartments.find({elementId: startElements[i]}).fetch();
        for(let j = 0; j < StartElementCompartments.length; j++){
            let CompartmentType = CompartmentTypes.findOne({_id: StartElementCompartments[j].compartmentTypeId});
            console.log(`CompartmentName ${CompartmentName}! CompartmentType.name ${CompartmentType.name}!`);
            if(CompartmentName == CompartmentType.name){
                console.log('compartment type name matched')
                value = StartElementCompartments[j].value;
                break;
            }
        }
        console.log('value:', value)
        if(value != "") break;
    }
    return value;
}
function extractCompartmentValues(ParsedResultArray, startElements){

    let ResultArray         = _.map(ParsedResultArray, function(resultItem){
        switch(resultItem.type){
            case "LineWithAttribute":
                return findCompartValueBySpecLine(resultItem.LineName, resultItem.AttributeName,startElements);
            case "Attribute":
                return findCompartValueByName(resultItem.AttributeName, startElements);
            case "StringConstant":
                return resultItem.Value;
            default: 
                return "";
        }
    });
    console.log("ResultArray:", ResultArray);
    return ConcatenateResults(ResultArray);
}
function parseCompartmentExpressions(startElements, endElementId, createdEndElementId){ // looking for expression which starts with @ symbol
    let EndElementCompartments = Compartments.find({elementId: endElementId}).fetch();
    
    _.each(EndElementCompartments, function(EndElemCompartment){
            let parsedResultArray;
            const cmpType = CompartmentTypes.findOne({_id: EndElemCompartment.compartmentTypeId});
            
            if(cmpType.inputType.type == "input"){
                try{
                    parsedResultArray = Compartments_exp_grammar.parse(EndElemCompartment.value,{});
                }
                catch(error){
                    console.log('Parse error', error);
                }
                console.log('parsed output', parsedResultArray);
                let ExpressionResult    = extractCompartmentValues(parsedResultArray, startElements);
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
    console.log('creating new box');
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
        let InsertedTracker = [];

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
                createdBoxes = _.groupBy(_.map(createdBoxes, function(box){
                    let insertedBox = _.findWhere(InsertedTracker, {localId: box._id});
                    if(typeof insertedBox === 'undefined') return {local: box._id, inserted: undefined}
                    else return {local: box._id, inserted: insertedBox.inserted}
                
                }), 'local');

                // palīgkonteiners, lai pieglabāt jau ievietotās virsotnes
                console.log('created boxes before', createdBoxes);
                console.log('inserted tracker before: ', InsertedTracker);
                _.each(apstaigatieReplace, function(element){
                    if( !_.has(element,"visited")){ // visited īpašības nav tikai šķautnēm konteinerā apastaigatieReplace
                        let start = _.first(createdBoxes[element.startElement]);
                        let end   = _.first(createdBoxes[element.endElement]);
                        console.log('start', start);
                        console.log('end', end);
                        if(typeof start.inserted === 'undefined'){
                            let startbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.startElement}));
                            _.first(createdBoxes[element.startElement]).inserted    = Elements.insert(startbox);
                        }
                        else console.log('found start eleemnt');
                        if(typeof end.inserted === 'undefined'){
                            let endbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.endElement}));
                            _.first(createdBoxes[element.endElement]).inserted      = Elements.insert(endbox);
                        }
                        else console.log('found end eleemnt');
                        if( !FindEdgeBySourceAndTarget(start.inserted, end.inserted) ){ // pārbaudām, vai šķautne netika izveidota iepriekšējās iterācijās
                            let newEdge = createEdge(element, diagToReplaceIn, start.inserted, end.inserted);
                            let NewEdgeId = Elements.insert(newEdge);
                        }
                    }
                    else { // ja visited īpašība ir, vedojam šo pašu virsotni
                        let box = _.first(createdBoxes[element._id]);
                        console.log('box',box);
                        if(typeof box.inserted === 'undefined'){
                            let NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}));
                            _.first(createdBoxes[element._id]).inserted    = Elements.insert(NewBox);
                        }
                    }
                });
                InsertedTracker = _.map(apstaigatieReplace, function(apstaigatais){
                    if(createdBoxes[apstaigatais._id]){
                        return {localId: apstaigatais._id, inserted: _.first(createdBoxes[apstaigatais._id]).inserted}
                    }
                });
                console.log('createdBoxes after', createdBoxes);
                console.log('inserted tracker after', InsertedTracker);
                let startFindElements = _.pluck(ReplaceLines[endElement], 'startElement');
                console.log('match',match);
                let startElements = _.filter(match, function(element){ return _.contains(startFindElements, element.findElementId)});
                // problēma pie startElements, ja gribam pievienot šķautni, match meklēs tikai pēc viena no speciālšķautņu end elementa
                // tāpēc nav iespējams padzēst, iekopēt comp no veciem elementiem.
                startElements = _.pluck(startElements, 'elementId');
                console.log('startFindElements',startFindElements);
                console.log('startElements',startElements);
                let createdEndElement = _.first(createdBoxes[FirstReplaceElement._id]).inserted;
                _.each(startElements, function(element){ switchEdgesFromOldToNewElement(element, createdEndElement,FindRelatedEdges(element)) });// pārvietojam šķautnes
                createCompartments(startElements, createdEndElement); 
                parseCompartmentExpressions(startFindElements,endElement ,createdEndElement);
                _.each(startElements, function(element){ deleteOldElementAndCompartments(element)}); // dzēšam vecos elementus
            }
            if(endElementTypeId == DeleteBoxType){
                let DeleteFindElements  = _.pluck(ReplaceLines[endElement], 'startElement');
                let DeleteElements      = _.filter(match, function(element){ return _.contains(DeleteFindElements, element.findElementId)});
                _.each(DeleteElements, function(de){ 
                    deleteOldElementAndCompartments(de.elementId);
                });
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