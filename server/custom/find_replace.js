let ReplaceLineType;
let DeleteBoxType;
//let findResults;
let apstaigatieReplace;
let createdBoxes;

function getStartElements(diagParamList, diagramType){// iegūstam starta elementus no visām speciāllīnijām
    let elementsToFind  = [];
    ReplaceLineType     = ElementTypes.findOne({name: "FindReplaceLink", diagramTypeId: diagramType})._id;// ja tādas speciāllīnijas definīcijā nav, tad metīs kļūdu
    DeleteBoxType       = ElementTypes.findOne({name: "RemoveElement", diagramTypeId: diagramType})._id;
    let ReplaceLines    = Elements.find({elementTypeId: ReplaceLineType, diagramId: diagParamList.diagramId}).fetch();
    if( ReplaceLines ){
        _.each(ReplaceLines, function(ReplaceLine){
            let elementToFind = Elements.findOne({_id: ReplaceLine.startElement});
            elementsToFind.push(elementToFind);
        })
    }
    else console.log('Replace line not found');
    
    return elementsToFind;
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
function cartesianProductOf(listOfMatches) {
    return _.reduce(listOfMatches, function(a, b) {// a un b ir iteratori, kas iterē pa diviem blakus esošiem masīviem masīvā
        return _.flatten(_.map(a, function(x) {
            return _.map(b, function(y) {
                return x.concat([y]);
               // konkatenējam katru x elementu no a masīva ar katru y elementu no b masīva
            });// tādā veidā iegūstot dekarta reizinājumu
        }), true);// true ir tam, lai rezultāts ir divdimensionāls masīvs
    }, [ [] ]);
}// paņemts no https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
function FindDiagMatches(diagParamList){
    
    let diagramTypeId       = Diagrams.findOne({_id:diagParamList.diagramId}).diagramTypeId;
    let StartFindElements   = getStartElements(diagParamList, diagramTypeId);   // F - atrodam Find starta elementu
    let findResults         = [];// sagrupētie pēc diagramId
    let Results             = [];// satur katrai diagrammai atrasto fragmentu dekarta reizinājumu
    if(StartFindElements){
        _.each(StartFindElements, function(startFindElement){
            let Edges = getEdges(startFindElement._id);
            if( Edges && _.size(Edges) > 0){
                let findResult = Meteor.call('findEdge', _.first(Edges), diagParamList.diagramId);
                findResults.push(findResult);
            }
            else{
                let findResult = Meteor.call('findNode', startFindElement);
                findResults.push(findResult);
            }
        });
        let startFindElementsIds = _.pluck(StartFindElements,'_id');

        findResults = _.flatten(findResults);
        findResults = _.groupBy(findResults,'diagramId');
        let diagrams = _.keys(findResults);

        _.each(diagrams, function(diagram){
            let currentDiagramMatches = [];
            _.each(findResults[diagram], function(diagramItem){
                currentDiagramMatches.push(diagramItem.matches);
            });

            let diag                        = Diagrams.findOne({_id: diagram});
            let ProjectId                   = Versions.findOne({_id: diag.versionId}).projectId;
            let cartesianProductOfMatches   = cartesianProductOf(currentDiagramMatches);

            cartesianProductOfMatches       = _.map(cartesianProductOfMatches, function(match){
                return {
                    match:          match,
                    status:         'new',
                    id:             generate_id(),
                    projectId:      ProjectId,
                    versionId:      diag.versionId,
                    _id:            diagram,
                    diagramTypeId:  diag.diagramTypeId,
                    elements:       _.flatten(_.map(match, function(matchItem){

                        return _.map(matchItem.elements, function(elementPair){
                            return elementPair.elementId;
                        })
                    })),
                    editMode:       "findMode"
                }
            });
            let resultObj = {
                _id:            diagram,
                name:           _.first(findResults[diagram]).name,
                matches:        cartesianProductOfMatches,
                editMode:       "findMode",
                projectId:      ProjectId,
                versionId:      diag.versionId,
                diagramTypeId:  diag.diagramTypeId,
                elements:       _.uniq(_.flatten(_.map(cartesianProductOfMatches, function(match){

                    return _.map(match.match, function(matchItem){
                        return _.map(matchItem.elements, function(elementPair){
                            return elementPair.elementId;
                        })
                    })
                    
                })))
            }
            Results.push(resultObj);
        });
        Results = _.filter(Results, function(result){
            let uniqueFindElements = _.uniq(_.flatten(_.map(result.matches, function(match){

                return _.map(match.match, function(elements){
                    return _.map(elements.elements, function(element){
                        return element.findElementId;
                    })
                })
            })));
            
            return _.every(startFindElementsIds, function(startFindElementsId){
                return _.contains(uniqueFindElements, startFindElementsId);
            });
        }); 
        // console.dir(Results,{depth: null});
        return Results;
    }
    else console.log('Start elements not found')

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
    console.log( 'Compartments removal', Compartments.remove({elementId: elementId}) );
    console.log('element removal', elementId);
    console.log( 'Eleemnt removal', Elements.remove({_id: elementId}) );
    
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
function createBox(diagToReplaceIn, ReplaceElement, location = undefined){
    let Location;
    if(typeof location === 'undefined'){ Location = ReplaceElement.location; console.log('creating new box');}
    else { Location = location; console.log('creating box with specified location'); }
    return NewReplaceElement = {
    diagramId       : diagToReplaceIn,
    diagramTypeId   : ReplaceElement.diagramTypeId,
    elementTypeId   : ReplaceElement.elementTypeId,
    style           : ReplaceElement.style,
    styleId         : ReplaceElement.styleId,
    type            : ReplaceElement.type,
    location        : Location,
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
// function getStartElementsLocation(startElements, ReplaceLines){
//     console.log('ReplaceLines', ReplaceLines);
//     console.log('start elements',startElements);
//     let StartElementLocations = _.map(startElements, function(startElement){

//     })
// }
function replaceStruct(match){
    if(match){
        // console.log('match',match);
        let FindDiagram     = Elements.findOne({_id: _.first(match).findElementId}).diagramId;
        let ReplaceLines    = Elements.find({elementTypeId: ReplaceLineType, diagramId: FindDiagram}).fetch();
        ReplaceLines        = _.groupBy(ReplaceLines,'endElement');
        let endElements     = _.keys(ReplaceLines);
        let diagToReplaceIn = Elements.findOne({_id: _.first(match).elementId}).diagramId;
        let InsertedTracker = [];

        _.each(endElements, function(endElement){
            let endElementTypeId    = getElementTypeId(endElement);
            let startFindElements   = _.pluck(ReplaceLines[endElement], 'startElement');
            let startElements       = _.filter(match, function(element){ return _.contains(startFindElements, element.findElementId)});
            // getStartElementsLocation(startElements,ReplaceLines);
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
                        let StartLocation = undefined;
                        let EndLocation = undefined;

                        if(typeof start.inserted === 'undefined'){
                            let startbox;
                            if (start.local == endElement){ 
                                // ja elements ir speciāllīnijas labajā galā, tad mēģinām uzradīt tam aizvietojamo elementu tajā pašā vietā, kur bija vecais
                                console.log('start equals to endEleemnt');
                                let startElementLocationId =  _.findWhere(startElements, {findElementId: _.first(ReplaceLines[endElement]).startElement}).elementId;
                                StartLocation = Elements.findOne({_id: startElementLocationId}).location;
                                console.log("STARTLOCATOIN", StartLocation);
                            }
                            else if(_.contains(endElements, start.local) && start.local != endElement){
                                console.log('start not equals to endElement, but is in endElements');
                                // ja dotais uzradamais elements nav vienāds ar doto endElement, bet ir vienāds ar kādu citu end Elements, tad tam arī jāvedo cita location
                                let FoundEndElement = _.find(endElements, function(endElement){return endElement == start.local});
                                let startFindElement = _.first(ReplaceLines[FoundEndElement]).startElement; // atrodam elementu, kas ir aizvietojamās līnijas kreisajā pusē
                                let startElement = _.find(match, function(element){return element.findElementId == startFindElement}).elementId;// startFindElement atbilstošais elements dotajā match
                                StartLocation = Elements.findOne({_id: startElement}).location;
                            } else console.log('neither in start');
                            if(StartLocation) {startbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.startElement}), StartLocation);
                            console.log("STARTLOCATION", StartLocation);}
                            else {startbox =  createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.startElement}));
                                console.log('NO START LOCATION');}
                            _.first(createdBoxes[element.startElement]).inserted    = Elements.insert(startbox);
                        }
                        else {
                            console.log('found start eleemnt');
                        }
                        if(typeof end.inserted === 'undefined'){
                            let endbox;
                            if(end.local == endElement) {
                                console.log('end equals to endElement');
                                let endElementLocationId = _.findWhere(startElements, {findElementId: _.first(ReplaceLines[endElement]).startElement}).elementId;
                                EndLocation = Elements.findOne({_id: endElementLocationId}).location;
                            }
                            else if(_.contains(endElements, end.local) && end.local != endElement){
                                console.log('end equals not equals, but is in endElements');
                                let FoundEndElement = _.find(endElements, function(endElement){return endElement == end.local});
                                let startFindElement = _.first(ReplaceLines[FoundEndElement]).startElement; // atrodam elementu, kas ir aizvietojamās līnijas kreisajā pusē
                                let startElement = _.find(match, function(element){return element.findElementId == startFindElement}).elementId;// startFindElement atbilstošais elements dotajā match
                                EndLocation = Elements.findOne({_id: startElement}).location;
                                console.log('FoundEndElement', FoundEndElement);console.log('startFindElem',startFindElement);console.log('startElement',startElement);
                                console.log('endlocation',EndLocation);
                            } else console.log('neither in end');
                            if(EndLocation) {endbox  = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.endElement}), EndLocation);
                                console.log('ENDLOCATION', EndLocation);}
                            else {endbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.endElement}));
                                console.log('no LOCATION');}
                            _.first(createdBoxes[element.endElement]).inserted      = Elements.insert(endbox);
                        }
                        else{
                            console.log('found end eleemnt');
                        }
                        if( !FindEdgeBySourceAndTarget(start.inserted, end.inserted) ){ // pārbaudām, vai šķautne netika izveidota iepriekšējās iterācijās
                            let newEdge = createEdge(element, diagToReplaceIn, start.inserted, end.inserted);
                            let NewEdgeId = Elements.insert(newEdge);
                        }
                    }
                    else { // ja visited īpašība ir, vedojam šo pašu virsotni
                        let box = _.first(createdBoxes[element._id]);
                        let BoxLocation = undefined;
                        if(typeof box.inserted === 'undefined'){
                            let NewBox;
                            if(box.local == endElement) {
                                let boxElementLocationId = _.findWhere(startElements, {findElementId: _.first(ReplaceLines[endElement]).startElement}).elementId;
                                BoxLocation = Elements.findOne({_id: boxElementLocationId}).location;
                                console.log('box Location', BoxLocation);
                            }
                            else if(_.contains(endElements, box.local) && box.local != endElement){
                                let FoundEndElement = _.find(endElements, function(endElement){return endElement == box.local});
                                let startFindElement = _.first(ReplaceLines[FoundEndElement]).startElement; // atrodam elementu, kas ir aizvietojamās līnijas kreisajā pusē
                                let startElement = _.find(match, function(element){return element.findElementId == startFindElement}).elementId;// startFindElement atbilstošais elements dotajā match
                                BoxLocation = Elements.findOne({_id: startElement}).location;
                            }
                            if(BoxLocation) NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}), BoxLocation);
                            else NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}));
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
                startElements       = _.pluck(startElements, 'elementId');
                // console.log('match',match);
                
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
                    const DeleteElement = Elements.findOne({_id: de.elementId});
                    if(DeleteElement){
                        deleteOldElementAndCompartments(DeleteElement._id);
                    }
                });
            }
        });
    }
    else console.log('match not found/undefined')
}
function formatMatch(match){
    let FormatedMatch = _.flatten(_.map(match.match, function(MatchItem){
        return _.map(MatchItem.elements, function(elementPair){
            return elementPair;
        })
    }));
    return FormatedMatch;
}
function markConflictingMatches(matches, elementsToLookup) {
    _.each(matches, function(match){
        if(match.status == 'new'){
            let foundConflictingMatch = _.some(match.match, function(matchItem){
                return _.some(matchItem.elements, function(elementPair){
                    return _.contains(elementsToLookup, elementPair.elementId);
                }); // ja atrodam kaut vienu elementu, kas bija aizvietojamo elementu sarakstā, tad nomarķējam šo matchu kā konfiktējošu
            });
            if(foundConflictingMatch) match.status = 'conflicting';
        }
    });
    return matches;
}
Meteor.methods({
    findDiags: function(diagParamList){
        console.log(`Diagram id: ${diagParamList.diagramId}`);
        return FindDiagMatches(diagParamList);
    },
    replaceAllOccurencesInDiagram: function(diagramMatchData){
        let responseResults = [];
        _.each(diagramMatchData.matches, function(match){
            if(match.status == 'new'){
                let FormatedMatch   = formatMatch(match);
                match.status        = 'used';

                let respObj = { matchId: match.id, status: match.status};
                responseResults.push(respObj);

                replaceStruct(FormatedMatch);
                let elementsToLookup = _.flatten(_.map(match.match, function(matchItem){
                    return _.map(matchItem.elements, function(element){
                        return element.elementId;
                    })
                }));
                diagramMatchData.matches = markConflictingMatches(diagramMatchData.matches, elementsToLookup);
            }
            else{
                let respObj = { matchId: match.id, status: match.status};
                responseResults.push(respObj);
            }
        });
        return responseResults;// responseResults satur matchu idus un to attiecigo statusu, lai var piefikset to, kuri bia
        // aizvietoti un kuri ir konfliktejosi matchi
    },
    replaceSingleOccurence: function(match){
        let FormatedMatch = formatMatch(match)
        replaceStruct(FormatedMatch);
        return;
    },
    updateLayout: function(list) {
        let Boxes           = _.where(list.IdDict, {type: "box"});
        let Lines           = _.where(list.IdDict, {type: "line"});
        let layoutResult    = list.layoutResult;
        _.each(Boxes, function(Box){
            let newElementLocation = layoutResult.boxes[Box.intId];
            try{
                Elements.update({_id: Box.stringId}, 
                    {
                        $set: {"location.x":        newElementLocation.x,
                               "location.y":        newElementLocation.y,
                               "location.width":    newElementLocation.width,
                               "location.height":   newElementLocation.height
                            }
                    })
            }
            catch(error){
                console.error();
            }
        });
        _.each(Lines, function(Line){
            let linePoints = layoutResult.lines[Line.intId];
            let pointsArray = [];
            _.each(linePoints, function(point){
                pointsArray.push(point.x);
                pointsArray.push(point.y);
            });
            if(_.size(pointsArray)){
                try{
                    Elements.update({_id: Line.stringId},{
                        $set: {points: pointsArray}
                    })
                }
                catch(error){
                    console.log(error);
                }
            }
        });
        
    },
})