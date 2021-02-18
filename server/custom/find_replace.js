// autors: Dmitrijs
let ReplaceLineType;
let DeleteBoxType;
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
    return elementsToFind;
}
function getElementTypeId(elementId){ return Elements.findOne({_id: elementId}).elementTypeId; }
function getEdges(_boxId){
    // atrodam virsotnei saistītās šķautnes, kuras nav replaceLine tipa
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
function createErrorMessage(error){
    let msg = "Expected: ";
    let expectedItems = _.pluck(error.expected, "value");
    msg += expectedItems.join(" or ");
    msg += " but found ";
    if (error.found) msg += error.found
    else msg += " end of input"
    msg+= " at column " + error.location.start.column;
    return msg; // atgriež kļūdas paziņojumu izteiksmei
}
function BreadthFirstSearch(ElementsArray){ // grafa apstaigāšana plašumā
    let notVisitedBox = _.findWhere(ElementsArray, {visited: false});
    if(notVisitedBox){
        notVisitedBox.visited = true;
        let RelatedEdges = FindRelatedEdges(notVisitedBox._id);
        if(RelatedEdges){
            _.each(RelatedEdges, function(edge){
                let FindStartElement    = _.findWhere(ElementsArray, {_id: edge.startElement});
                let FindEndElement      = _.findWhere(ElementsArray, {_id: edge.endElement});
                if( typeof FindStartElement === 'undefined'){
                    let start = Elements.findOne({_id: edge.startElement});
                    _.extend(start,{visited: false});
                    ElementsArray.push(start);
                }
                if( typeof FindEndElement === 'undefined'){
                    let end = Elements.findOne({_id: edge.endElement});
                    _.extend(end,{visited: false});
                    ElementsArray.push(end);
                }
                let FoundEdgeInElementsArray = _.findWhere(ElementsArray, {_id: edge._id});
                if(!FoundEdgeInElementsArray) ElementsArray.push(edge)
            });
        }
        return true;
    }
    else return false;
}
function checkQuery(diagramId, diagramTypeId){ // grafiskā pieprasījuma validācija
    let ReplaceLines    = Elements.find({elementTypeId: ReplaceLineType, diagramId: diagramId, diagramTypeId: diagramTypeId}).fetch();
    let ExpressionErrors= [];
    if(_.size(ReplaceLines)){
        let OverLapping = _.some(ReplaceLines, function(ReplaceLine){
            // ja kaut vienas speciālās aizvietošanas līnijas meklējamais un aizvietojošais fragments pārklājas, atgriež true
            let findElement     = Elements.findOne({_id: ReplaceLine.startElement});
            let replaceElement  = Elements.findOne({_id: ReplaceLine.endElement});
            _.extend(findElement, {visited: false});
            _.extend(replaceElement, {visited: false});
            let FindGraph       = [findElement];
            let ReplaceGraph    = [replaceElement];
            let found           = BreadthFirstSearch(FindGraph);
            // apstaigā gan meklējamo, gan aizvietojamo grafu
            while(found) { found = BreadthFirstSearch(FindGraph); }
            found = BreadthFirstSearch(ReplaceGraph);
            while(found) { found = BreadthFirstSearch(ReplaceGraph); }
            // fragmenti pārklājas, ja tie ir identiski
            let FindGraphIds            = _.pluck(FindGraph, "_id");
            let ReplaceGraphIds         = _.pluck(ReplaceGraph, "_id");
            let overLappingElements     = _.intersection(FindGraphIds,ReplaceGraphIds);

            if(_.size(overLappingElements) > 0) return true;
            else{ // ja esošās speclīnijas fragmenti nepārklājas, tad var pārbaudīt izteiksmes
                _.each(ReplaceGraph, function(element){
                    let ElementCompartments = Compartments.find({elementId: element._id}).fetch();
                    if(_.size(ElementCompartments) > 0 ){
                        _.each(ElementCompartments, function(compartment){
                            const CompType = CompartmentTypes.findOne({_id: compartment.compartmentTypeId});
                            if(CompType.inputType.type == "input"){
                                try{
                                    let parsedResultArray = Compartments_exp_grammar.parse(compartment.input,{});
                                }
                                catch(error){
                                    let message = createErrorMessage(error);
                                    let ExpressionErrorObj = {
                                        Expression: compartment.value,
                                        ElementType: ElementTypes.findOne({_id: element.elementTypeId}).name,
                                        CompartmentType: CompType.name,
                                        Msg: message
                                    } // ievāc info par katru no kļūdainām izteiksmēm
                                    ExpressionErrors.push(ExpressionErrorObj);
                                }
                            }
                        });
                    }
                });
            }
        });
        if(OverLapping) return false;
        else return ExpressionErrors; 
    } // ja nav pārklājumu, tad atgriež masīvu ar kļūdaino izt. paziņojumiem
}
function FindDiagMatches(diagParamList){
    console.log("findDiags");
    let diagramTypeId       = Diagrams.findOne({_id:diagParamList.diagramId}).diagramTypeId;
    let StartFindElements   = getStartElements(diagParamList, diagramTypeId);   // F - atrodam Find starta elementu
    let findResults         = [];// sagrupētie pēc diagramId
    let Results             = [];// satur katrai diagrammai atrasto fragmentu dekarta reizinājumu
    if( _.size(StartFindElements) > 0 ){
        let queryCheck = checkQuery(diagParamList.diagramId, diagramTypeId);
        if(queryCheck){  // pirms meklēt fragmentus, jāpārbauda pieprasījums
            // katrai speclīnijas jāmeklē savs fragments
            console.log('query check ok');
            _.each(StartFindElements, function(startFindElement){
                let Edges = getEdges(startFindElement._id);
                if( Edges && _.size(Edges) > 0){
                    let findResult = Meteor.call('findEdge', _.first(Edges), diagParamList.diagramId);
                    findResults.push(findResult);
                } // ja ir atrastas šķautnes, tad meklē pēc šķautnes
                else{
                    let findResult = Meteor.call('findNode', startFindElement);
                    findResults.push(findResult);
                } // ja nav, tad meklē pēc virsotnes
            });
            let startFindElementsIds = _.pluck(StartFindElements,'_id');

            findResults = _.flatten(findResults);
            findResults = _.groupBy(findResults,'diagramId'); 
            let diagrams = _.keys(findResults);
            console.log('findResults');
            _.each(diagrams, function(diagram){
                let currentDiagramMatches = [];
                _.each(findResults[diagram], function(diagramItem){
                    currentDiagramMatches.push(diagramItem.matches);
                });

                let diag                        = Diagrams.findOne({_id: diagram});
                let ProjectId                   = Versions.findOne({_id: diag.versionId}).projectId;
                let cartesianProductOfMatches   = cartesianProductOf(currentDiagramMatches);
                // tā kā dažu spec līniju fragmenti var būt nesaistīti savā starpā, no šiem nesaistītiem
                // fragmentiem ir jāveido dekarta reizinājuma kopa
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
                            // elementu idi katram matcham, lai tos varētu izcelt
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
                        // to pašu visiem diagrammas matchiem, lai varētu izcelt visus fragmentus
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
            // nofiltrē tos matchus, kuri neietver visus meklējamo elementu idus,
            // katram matcha vienumam ir struktūra {elementId, findElementId}
            // elementId ir atrastais un findElementId ir tam atbisltošais meklējamais elements pierpasījuma diagrmmā
            console.log('return ok');
            return {result: Results, expressionErrors: queryCheck}
        
        } else return {msg: "Find fragment elements and Replace fragment elements are overlapping"}
    } 
    else return {msg: "Replace line have not been found"}

}

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
    ); // meklē pēc šķautni pēc sākuma un beigu elementiem
}
function switchEdgesFromOldToNewElement(oldElementId, newElementId,RelatedOldNodeEdges){
    if( RelatedOldNodeEdges){
        _.each(RelatedOldNodeEdges, function(edge){// kabinām klāt jaunai virsotnei
            if(edge.startElement == oldElementId){ // 
                console.log('update EDGE', Elements.update(
                    {_id: edge._id},
                    {$set: {startElement: newElementId}}
                    ));
                
            }
            if(edge.endElement == oldElementId){
                console.log('upadte EndElement edge', Elements.update(
                    {_id: edge._id},
                    {$set: {endElement: newElementId}}
                    ));
                
            }
        })// katru šķautni no aizvietojamā elementa pārkabina
    }
}
function deleteOldElementAndCompartments(elementId){ 
    Compartments.remove({elementId: elementId});
    Elements.remove({_id: elementId});
    // dzēšam nost Elementu un tā Compartments
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
    return ResultArray.join("");
}
function splitCompartmentvalue(value, parserdArray){
    let SplittedCompartment = value.split(parserdArray.delimiter);
    let size = SplittedCompartment.length;
    if(parserdArray.index > size - 1) return "";
    else return SplittedCompartment[parserdArray.index];
}
function findCompartValueBySpecLine(SpecLineName, CompartmentName, startElements, parserdArray = {}, match ){// line.atr
    
    let diagramIdFind   = Elements.findOne({_id: _.first(startElements)}).diagramId;
    let SpecLine        = Compartments.findOne({elementTypeId: ReplaceLineType, diagramId: diagramIdFind, value: SpecLineName});
    console.log(`elementTypeId: ${ReplaceLineType} diagramId: ${diagramIdFind} value: ${SpecLineName}`);
    if(SpecLine){
        let startElement = Elements.findOne({_id: SpecLine.elementId}).startElement;
        return findCompartValueByName(CompartmentName, _.intersection(startElements,[startElement]), parserdArray, match); // atstāj tikai to elementu, kas ir saistīts ar norādīto speclīniju
    }
    else console.log('not found spec line');
}
function findCompartValueByName(CompartmentName, startElements, parserdArray = {} , match){
    let value = "";
    let size = startElements.length;
    startElements = _.map(startElements, function(startElement){
        return _.findWhere(match, {findElementId: startElement}).elementId;
    });
    for(let i = 0; i < size; i++){
        let StartElementCompartments = Compartments.find({elementId: startElements[i]}).fetch();
        let startElemCompSize = StartElementCompartments.length;

        for(let j = 0; j < startElemCompSize; j++){
            let CompartmentType = CompartmentTypes.findOne({_id: StartElementCompartments[j].compartmentTypeId});
            
            if(CompartmentName == CompartmentType.name){
                // ja atrod atribūta tipu ar norādīto nosaukumu, tad uzstāda value no atrastā
                value = StartElementCompartments[j].value;
                break;
            }
        }
        if(value != "") break;
    }
    if( value != "" && parserdArray.type == "Split") value = splitCompartmentvalue(value, parserdArray);
    return value;
}
function extractCompartmentValues(ParsedResultArray, startElements, match){
    // izrēķina atribūta vērtību atkarībā no izteiksmes locekļa tipa
    let ResultArray         = _.map(ParsedResultArray, function(resultItem){
        switch(resultItem.type){
            case "LineWithAttribute":
                return findCompartValueBySpecLine(resultItem.LineName, resultItem.AttributeName,startElements,{}, match);
            case "Attribute":
                return findCompartValueByName(resultItem.AttributeName, startElements, match);
            case "StringConstant":
                return resultItem.Value;
            case "Split":
                return findCompartValueBySpecLine(resultItem.LineName, resultItem.AttributeName,startElements, resultItem, match);
            default: 
                return "";
        }
    });
    console.log("ResultArray:", ResultArray);
    return ConcatenateResults(ResultArray);
}
/* functions for getting cmp type prefix and sufix */
function getPrefix(compartmentType){
    return (_.has(compartmentType, "prefix")) ? compartmentType.prefix : "";
}
function getSuffix(compartmentType){
    return (_.has(compartmentType, "suffix")) ? compartmentType.suffix : "";
}
/*  */
function parseCompartmentExpressions(startElements, endElementId, createdEndElementId, match){ // looking for expression which starts with @ symbol
    let EndElementCompartments = Compartments.find({elementId: endElementId}).fetch();
    const CompartmentCount = _.size(EndElementCompartments);
    console.log("Cmp count", CompartmentCount);
    if(CompartmentCount){
        _.each(EndElementCompartments, function(EndElemCompartment){
                let parsedResultArray;
                const cmpType = CompartmentTypes.findOne({_id: EndElemCompartment.compartmentTypeId});
                
                if(cmpType.inputType.type == "input"){
                    try{
                        parsedResultArray = Compartments_exp_grammar.parse(EndElemCompartment.input,{}); // labouts no value uz input
                    }
                    catch(error){
                        console.log('Parse error', error);
                    }
                    
                    let ExpressionResult    = extractCompartmentValues(parsedResultArray, startElements, match);
                    
                    if(ExpressionResult.length){
                        let ExistingCompartment = Compartments.findOne({elementId: createdEndElementId, compartmentTypeId: EndElemCompartment.compartmentTypeId});
                        let value = getPrefix(cmpType) + ExpressionResult + getSuffix(cmpType); console.log("value", value)
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
                                value:                  value,
                                index:                  EndElemCompartment.index,
                                isObjectRepresentation: EndElemCompartment.isObjectRepresentation,
                                styleId:                EndElemCompartment.styleId,
                                style:                  EndElemCompartment.style,
                                valueLC:                value.toLowerCase()
                            }
                            newCompartment._id = Compartments.insert(newCompartment);
                        }
                        else{ // atjauno atribūta vērtību, ja tur jau bija iekopēta cita 
                            console.log('Updating created compartment:', Compartments.update(
                                {elementId: createdEndElementId, compartmentTypeId: EndElemCompartment.compartmentTypeId},
                                {$set: {value: value, valueLC: value.toLowerCase(), input: ExpressionResult}}
                                ));
                        }
                    }
                }
        });
    }
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
    let Location; // ja Location nav padots argumentā, tad liekam aizvietojamā elementa location
    if(typeof location === 'undefined'){ Location = ReplaceElement.location;}
    else { Location = location; }
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
    const StartElement = Elements.findOne({_id:startElement});
    const EndElement   = Elements.findOne({_id: endElement});
    const newPoints    = [
        StartElement.location.x, 
        StartElement.location.y, 
        EndElement.location.x, 
        StartElement.location.y, 
        EndElement.location.x, 
        EndElement.location.y
    ];
    return newEdge = {
        startElement    : startElement,
        endElement      : endElement,
        diagramId       : diagId,
        diagramTypeId   : edge.diagramTypeId,
        elementTypeId   : edge.elementTypeId,
        style           : edge.style,
        styleId         : edge.styleId,
        type            : edge.type,
        points          : newPoints,
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
function getNotVisitedItems() { 
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
function FindLinesToDelete(ReplaceLines, match){
    let startElements       = _.pluck(ReplaceLines, "startElement");
    let foundEdgesToDelete  = [];
    _.each(startElements, function(startElement){
        let RelatedEdges = FindRelatedEdges(startElement);
        if(RelatedEdges){
            _.each(RelatedEdges, function(edge){
                if(startElement != edge.startElement && _.contains(startElements, edge.startElement)){
                    let matchedEdge = _.findWhere(match, {findElementId: edge._id});
                    foundEdgesToDelete.push(matchedEdge.elementId);
                } 
                // ja dotais aizvietošanas elements nav dotās līnijas sākuma elements, tad dotais aizvietošanas elements ir endElement un ir jāpārbauda
                // dotās līnijas startElement. un otrādi
                else if(startElement != edge.endElement && _.contains(startElements, edge.endElement)) {
                    let matchedEdge = _.findWhere(match, {findElementId: edge._id});
                    foundEdgesToDelete.push(matchedEdge.elementId);
                } 
            });
        }
    });
    return _.uniq(foundEdgesToDelete);
}
function replaceStruct(match){
    if(match){
        let FindDiagram     = Elements.findOne({_id: _.first(match).findElementId}).diagramId;
        let ReplaceLines    = Elements.find({elementTypeId: ReplaceLineType, diagramId: FindDiagram}).fetch();
        console.log("match ", match);
        let LinesToDelete   = FindLinesToDelete(ReplaceLines,match); // atrodam līnijas, kuras jādzēš
        ReplaceLines        = _.groupBy(ReplaceLines,'endElement');
        let endElements     = _.keys(ReplaceLines);
        let diagToReplaceIn = Elements.findOne({_id: _.first(match).elementId}).diagramId;
        let InsertedTracker = [];
        _.each(endElements, function(endElement){
            let endElementTypeId    = getElementTypeId(endElement);
            let startFindElements   = _.pluck(ReplaceLines[endElement], 'startElement');
            let startElements       = _.filter(match, function(element){ return _.contains(startFindElements, element.findElementId)});
            
            if( !(typeof endElementTypeId === 'undefined') && endElementTypeId != DeleteBoxType){
                // ejot cauri speciāllīnijām, atrodam elementus, kurus ir jāaizvieto
                let FirstReplaceElement = Elements.findOne(endElement);
                _.extend(FirstReplaceElement, {visited: false});
                apstaigatieReplace = [FirstReplaceElement];
                let found = getNotVisitedItems();
                while(found) { found = getNotVisitedItems() }

                createdBoxes = _.filter(apstaigatieReplace, function(apst){ return _.has(apst, "visited") });
                console.log("InsertedTracker before createdBoxes container", InsertedTracker);
                InsertedTracker = _.compact(InsertedTracker);
                createdBoxes = _.map(createdBoxes, function(box){
                    console.log("InsertedTracker in map", InsertedTracker);
                    let insertedBox = _.findWhere(InsertedTracker, {localId: box._id});
                    if(typeof insertedBox === 'undefined') return {local: box._id, inserted: undefined}
                    else return {local: box._id, inserted: insertedBox.inserted}
                
                }); console.log("createdBoxes after map", createdBoxes);
                createdBoxes = _.groupBy(createdBoxes, 'local');

                // palīgkonteiners, lai pieglabāt jau ievietotās virsotnes
                console.log('created boxes before', createdBoxes);
                console.log('inserted tracker before: ', InsertedTracker);
                let apstaigatieReplaceId = _.pluck(apstaigatieReplace,'_id');
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
                            if(!_.contains(endElements, start.local)) parseCompartmentExpressions(startFindElements, start.local, start.inserted, match);
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
                            if(!_.contains(endElements, end.local)) parseCompartmentExpressions(startFindElements, end.local, end.inserted, match);
                        }
                        else{
                            console.log('found end eleemnt');
                        }
                        if( !FindEdgeBySourceAndTarget(start.inserted, end.inserted) ){ // pārbaudām, vai šķautne netika izveidota iepriekšējās iterācijās
                            let newEdge = createEdge(element, diagToReplaceIn, start.inserted, end.inserted);
                            let NewEdgeId = Elements.insert(newEdge);
                            parseCompartmentExpressions(startFindElements, element._id, NewEdgeId, match);
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
                                let FoundEndElement     = _.find(endElements, function(endElement){return endElement == box.local});
                                let startFindElement    = _.first(ReplaceLines[FoundEndElement]).startElement; // atrodam elementu, kas ir aizvietojamās līnijas kreisajā pusē
                                let startElement        = _.find(match, function(element){return element.findElementId == startFindElement}).elementId;// startFindElement atbilstošais elements dotajā match
                                BoxLocation             = Elements.findOne({_id: startElement}).location;
                            }
                            if(BoxLocation) NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}), BoxLocation);
                            else NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}));
                            _.first(createdBoxes[element._id]).inserted    = Elements.insert(NewBox);
                            if(!_.contains(endElements, box.local)) parseCompartmentExpressions(startFindElements, box.local, box.inserted, match);
                        }
                    }
                });
                InsertedTracker = _.map(apstaigatieReplace, function(apstaigatais){
                    if(createdBoxes[apstaigatais._id]){
                        return {localId: apstaigatais._id, inserted: _.first(createdBoxes[apstaigatais._id]).inserted}
                    }
                });
                InsertedTracker = _.compact(InsertedTracker);
                console.log("InsertedTracker",InsertedTracker);
                startElements       = _.pluck(startElements, 'elementId');
                
                let createdEndElement = _.first(createdBoxes[FirstReplaceElement._id]).inserted;
                _.each(LinesToDelete, function(line){ deleteOldElementAndCompartments(line) });
                _.each(startElements, function(element){ switchEdgesFromOldToNewElement(element, createdEndElement,FindRelatedEdges(element)) });// pārvietojam šķautnes
                // jāveic pārbaudi uz to vai šķautnes ir jāoārkabina, vai nav. Ja nav jāpārkabina, piemēram, pie delete edge paterna.
                createCompartments(startElements, createdEndElement); 
                parseCompartmentExpressions(startFindElements,endElement ,createdEndElement,match);
                _.each(startElements, function(element){ deleteOldElementAndCompartments(element)}); // dzēšam vecos elementus
            }
            if(endElementTypeId == DeleteBoxType){
                // ja speclīnijas beigās ir speciālais dzēšanas elements, tad aizvietošanas vietā ir dzēšana
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
    replaceInAllDiagrams: function(diagramsMatchData){
        let response = [];
        _.each(diagramsMatchData, function(diagramMatchData){
            _.each(diagramMatchData.matches, function(match){
                if(match.status == 'new'){
                    let FormatedMatch   = formatMatch(match);
                    match.status        = 'used';
    
                    let respObj = { matchId: match.id, status: match.status};
                    response.push(respObj);
    
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
                    response.push(respObj);
                }
            });
        });
        return response;
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
        _.each(Boxes, function(Box){ // sākumā atjauno virsotnes
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
        _.each(Lines, function(Line){ // pēc tam atjauno līniju points
            let linePoints = layoutResult.lines[Line.intId];
            let pointsArray = []; // katrai līnijai points jāievāc [x1,y1,...,xn,yn] formātā
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
    checkDiagramExistance(diagramId){
        const diagram = Diagrams.findOne({_id: diagramId})
        if(!diagram) return false;
        else return true;
    }
})