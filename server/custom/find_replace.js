// autors: Dmitrijs
let ReplaceLineType;
let DeleteBoxType;
let apstaigatieReplace;
let createdBoxes;
let ElementDict; // elementu vārdnīca, kurā tiek pieglabāti aizvietoto elementu idi, ja aizvietojamais tips nemainījās

function getStartElements(diagParamList, diagramType){// iegūstam starta elementus no visām speciāllīnijām
    console.time("getStartElementsTimer");
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
    console.timeEnd("getStartElementsTimer");
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
    console.time("checkQueryTimer");
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
                                    console.log("parser error", error);
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
        console.timeEnd("checkQueryTimer");
        if(OverLapping) return false;
        else return ExpressionErrors; 
    } // ja nav pārklājumu, tad atgriež masīvu ar kļūdaino izt. paziņojumiem
}
function checkDuplicates(findResult, findElementsIds){
    console.time("checkDuplicateTimer");
    let duplicate = {};
    let findElements = _.uniq(_.flatten(_.map(findResult[0].matches, function(match){
        return _.map(match.elements, function(element){
            return element.findElementId;
        })
    })));
    // console.log("findElements",findElements);
    // console.log("findElementsIds", findElementsIds);
    duplicate["found"] = _.every(findElements, function(findElement){ return _.contains(findElementsIds, findElement)});
    
    if(_.size(findElementsIds) == 0){
        findElementsIds = findElements;
    }
    else{
        _.each(findElements, function(findElement){
            if(!_.contains(findElementsIds, findElement) ) findElementsIds.push(findElement);
        });
    }    
    duplicate["findElementsIds"] = findElementsIds;
    console.timeEnd("checkDuplicateTimer");
    return duplicate;
}
function FindDiagMatches(diagParamList){
    console.log("findDiags");
    console.time("FindDiagMatchesTimer");
    let diagramTypeId       = Diagrams.findOne({_id:diagParamList.diagramId}).diagramTypeId;
    let StartFindElements   = getStartElements(diagParamList, diagramTypeId);   // F - atrodam Find starta elementu
    let findResults         = [];// sagrupētie pēc diagramId
    let Results             = [];// satur katrai diagrammai atrasto fragmentu dekarta reizinājumu
    let findElementIds      = [];// glabās meklējamo fragmentu idus, lai pārbaudītu kārtējo matchu uz unikalitāti
    if( _.size(StartFindElements) > 0 ){
        let queryCheck = checkQuery(diagParamList.diagramId, diagramTypeId);
        if(queryCheck){  // pirms meklēt fragmentus, jāpārbauda pieprasījums
            // katrai speclīnijas jāmeklē savs fragments
            console.log('query check ok');
            _.each(StartFindElements, function(startFindElement){
                let Edges = getEdges(startFindElement._id);
                if( Edges && _.size(Edges) > 0){
                    let findResult = Meteor.call('findEdge', _.first(Edges), diagParamList.diagramId);
                    let duplicate = checkDuplicates(findResult, findElementIds);
                    if( duplicate.found == false ) findResults.push(findResult);
                    findElementIds = duplicate.findElementsIds;
                } // ja ir atrastas šķautnes, tad meklē pēc šķautnes
                else{
                    let findResult = Meteor.call('findNode', startFindElement);
                    findResults.push(findResult);
                } // ja nav, tad meklē pēc virsotnes
            });
            let startFindElementsIds = _.pluck(StartFindElements,'_id');
            // console.log("Find results before grouping");
            // console.dir(findResults, {depth: null});
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
                console.time("cartesianProductTime");
                let cartesianProductOfMatches   = cartesianProductOf(currentDiagramMatches);
                console.timeEnd("cartesianProductTime");
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
            console.time("ResultsFilteringTime");
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
            console.timeEnd("ResultsFilteringTime");
            // nofiltrē tos matchus, kuri neietver visus meklējamo elementu idus,
            // katram matcha vienumam ir struktūra {elementId, findElementId}
            // elementId ir atrastais un findElementId ir tam atbisltošais meklējamais elements pierpasījuma diagrmmā
            console.log('return ok');
            console.timeEnd("FindDiagMatchesTimer");
            // console.log("Find Results after grouping and Cartesian product");
            // console.dir(Results, {depth: null});
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
    console.time("DeletionTimer");
    // console.log("element deleting Id:", elementId);
    Compartments.remove({elementId: elementId});
    Elements.remove({_id: elementId});
    // dzēšam nost Elementu un tā Compartments
    console.timeEnd("DeletionTimer");
}
function createCompartments(oldElementsList, newElementId){
    console.time("createCmpTime");
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
    console.timeEnd("createCmpTime");    
}
function ConcatenateResults(ResultArray){
    return ResultArray.join("");
}
function splitCompartmentvalue(value, parserdArray){
    // console.log(`value to split: ${value} parsedArray: ${parserdArray}`);
    let SplittedCompartment = value.split(parserdArray.delimiter);
    let size = SplittedCompartment.length;
    if(parserdArray.index > size - 1) return "";
    else return SplittedCompartment[parserdArray.index];
}
function findCompartValueBySpecLine(SpecLineName, CompartmentName, startElements, parserdArray = {}, match ){// line.atr
    
    let diagramIdFind   = Elements.findOne({_id: _.first(startElements)}).diagramId;
    let SpecLine        = Compartments.findOne({elementTypeId: ReplaceLineType, diagramId: diagramIdFind, value: SpecLineName});
    // console.log(`elementTypeId: ${ReplaceLineType} diagramId: ${diagramIdFind} value: ${SpecLineName}`);
    if(SpecLine){
        let startElement = Elements.findOne({_id: SpecLine.elementId}).startElement;
        // console.log("startElement in find by specline", startElement);
        return findCompartValueByName(CompartmentName,[startElement], parserdArray, match); // atstāj tikai to elementu, kas ir saistīts ar norādīto speclīniju
    }
    else console.log('not found spec line');
}
function findCompartValueByName(CompartmentName, startElements, parserdArray = {} , match){
    // console.log(`CompartmentName: ${CompartmentName} startElements: ${startElements} parserdArray: ${parserdArray} match: ${match}`);
    let value = "";
    let size = startElements.length;
    startElements = _.map(startElements, function(startElement){
        return _.findWhere(match, {findElementId: startElement}).elementId;
    });
    
    // console.log("Start elements after map", startElements);
    for(let i = 0; i < size; i++){
        let StartElementCompartments = Compartments.find({elementId: startElements[i]}).fetch(); // pie test split ar Dispense rezultāts ir [], jo datubāzē atbi;stoša match elementa vairs nav
        if(StartElementCompartments.length == 0) {
            startElements[i] = _.findWhere(ElementDict, {initial: startElements[i]}).replacedId;
            StartElementCompartments = Compartments.find({elementId: startElements[i]}).fetch();
        }
        let startElemCompSize = StartElementCompartments.length; // jo dzēš pirms tam, tāpēc sākumā ir jāapstaigā visi end Elementi un tikai pēc tam tos jādzēš
        // console.log("Star eleme cmp", StartElementCompartments);
        // console.log("starteleme comp size", startElemCompSize);
        for(let j = 0; j < startElemCompSize; j++){
            let CompartmentType = CompartmentTypes.findOne({_id: StartElementCompartments[j].compartmentTypeId});
            // console.log("Found Cmp type", CompartmentType);
            // console.log(`CompartmentName: ${CompartmentName} CompartmentType.name ${CompartmentType.name}`);
            if(CompartmentName == CompartmentType.name){
                // ja atrod atribūta tipu ar norādīto nosaukumu, tad uzstāda value no atrastā
                value = StartElementCompartments[j].value;
                // console.log("value to split", StartElementCompartments[j].value);
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
    // console.log("ResultArray:", ResultArray);
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
    console.time("ParsingAndExpProcesssingTimer");
    let EndElementCompartments = Compartments.find({elementId: endElementId}).fetch();
    const CompartmentCount = _.size(EndElementCompartments);
    // console.log("Cmp count", CompartmentCount);
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
    console.timeEnd("ParsingAndExpProcesssingTimer");
}
function deleteElementEdges(elementId){
    console.time("deleteEdgesTimer");
    let RelatedEdges = FindRelatedEdges(elementId);
    if(!( typeof RelatedEdges === 'undefined')){
        _.each(RelatedEdges, function(relatedEdge){
            deleteOldElementAndCompartments(relatedEdge._id);
        })
    }
    console.timeEnd("deleteEdgesTimer");
}
function createBox(diagToReplaceIn, ReplaceElement, location = undefined){
    console.time("CreateBoxToInsert");
    console.log("FindRepalceElementId", ReplaceElement._id);
    let Location; // ja Location nav padots argumentā, tad liekam aizvietojamā elementa location
    if(typeof location === 'undefined'){ Location = ReplaceElement.location;}
    else { Location = location; }
    console.timeEnd("CreateBoxToInsert");
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
    console.time("FindLinesToDeleteTimer");
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
    console.timeEnd("FindLinesToDeleteTimer");
    return _.uniq(foundEdgesToDelete);
}

/*
function createNode(
    endElement,
    endElements,
    box,
    Location,
    match,
    startElements,
    startFindElements,
    ReplaceLines,
    diagToReplaceIn,
    apstaigatieReplace,
    createdBoxes,
    parsedElements,
){
    let startbox;
    let FoundMatchedStartElement;
    if (start.local == endElement){ 
        // ja elements ir speciāllīnijas labajā galā, tad mēģinām uzradīt tam aizvietojamo elementu tajā pašā vietā, kur bija vecais
        // console.log('start equals to endEleemnt');
        let startElementLocationId =  _.findWhere(startElements, {findElementId: _.first(ReplaceLines[endElement]).startElement}).elementId;
        FoundMatchedStartElement = Elements.findOne({_id: startElementLocationId});
        
        if(typeof FoundMatchedStartElement === 'undefined') {
            startElementLocationId = _.findWhere(ElementDict, {initial: startElementLocationId}).replacedId;
            FoundMatchedStartElement = Elements.findOne({_id: startElementLocationId});
        }
        StartLocation = FoundMatchedStartElement.location;
        // console.log("STARTLOCATOIN", StartLocation);
    }
    else if(_.contains(endElements, start.local) && start.local != endElement){
        // console.log('start not equals to endElement, but is in endElements');
        // ja dotais uzradamais elements nav vienāds ar doto endElement, bet ir vienāds ar kādu citu end Elements, tad tam arī jāvedo cita location
        let FoundEndElement = _.find(endElements, function(endElement){return endElement == start.local});
        let startFindElement = _.first(ReplaceLines[FoundEndElement]).startElement; // atrodam elementu, kas ir aizvietojamās līnijas kreisajā pusē
        let startElement = _.find(match, function(element){return element.findElementId == startFindElement}).elementId;// startFindElement atbilstošais elements dotajā match
        FoundMatchedStartElement = Elements.findOne({_id: startElement});
        if(typeof FoundMatchedStartElement === 'undefined') {
            startElement = _.findWhere(ElementDict, {initial: startElement}).replacedId;
            FoundMatchedStartElement = Elements.findOne({_id: startElement});
        }
        StartLocation = FoundMatchedStartElement.location;
    } else // console.log('neither in start');
    if(StartLocation) {startbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.startElement}), StartLocation);
    // console.log("STARTLOCATION", StartLocation);
    }
    else {startbox =  createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.startElement}));
        // console.log('NO START LOCATION');
    }
    _.first(createdBoxes[element.startElement]).inserted    = Elements.insert(startbox);

    let MatchedReplaceElements = _.filter(ReplaceLines[start.local], function(item){
        if(getElementTypeId(start.local) == getElementTypeId(item.startElement)) return true;
        else { let replaceElement = _.findWhere(match, {findElementId: item.startElement}).elementId; replaceElementsId.push(replaceElement); return false;}
    });
    MatchedReplaceElements = _.pluck(MatchedReplaceElements, "startElement");
    if(_.contains(endElements, start.local) && _.size(MatchedReplaceElements) > 0) {
        _.each(MatchedReplaceElements, function(element){
            let initialMatchedId = _.findWhere(match, {findElementId: element}).elementId;

            _.each(ElementDict, function(item){ if(item.initial == initialMatchedId ) {
                if(!(typeof item.replacedId === 'undefined')){
                    _.each(startElements, function(startElement){ if(startElement.elementId == item.initial) replaceElementsId.push(item.replacedId)})
                }
                else replaceElementsId.push(item.initial);
                item.replacedId = start.inserted;
            }   })
        });
        
        console.log("ElementDict", ElementDict);
        
    }
    if(!_.contains(parsedElements, start.local)) {
        parseCompartmentExpressions(startFindElements, start.local, start.inserted, match);
        parsedElements.push(start.local);
    }
}
*/
function replaceStruct(match){
    if(match){
        console.time("replaceStructOverallTimer");
        console.time("repalceBeforeEach");
        let FindDiagram     = Elements.findOne({_id: _.first(match).findElementId}).diagramId;
        let ReplaceLines    = Elements.find({elementTypeId: ReplaceLineType, diagramId: FindDiagram}).fetch();
        // console.log("match ", match);
        let LinesToDelete   = FindLinesToDelete(ReplaceLines,match); // atrodam līnijas, kuras jādzēš
        ReplaceLines        = _.groupBy(ReplaceLines,'endElement');
        let endElements     = _.keys(ReplaceLines);
        let diagToReplaceIn = Elements.findOne({_id: _.first(match).elementId}).diagramId;
        let InsertedTracker = [];
        let parsedElements  = [];

        //console.log("match",match);
        _.each(endElements, function(endElement){
            _.each(ReplaceLines[endElement], function(replaceline){
                if(getElementTypeId(endElement) == getElementTypeId(replaceline.startElement)) {
                    //console.log("endElement", endElement);
                    //console.log("startElement", replaceline.startElement);
                    let initialMatched = _.findWhere(match, {findElementId: replaceline.startElement});
                    if(!ElementDict) {
                        ElementDict = [];
                        ElementDict.push({ initial: initialMatched.elementId, replacedId: undefined });
                    }
                    else {
                        let found = _.findWhere(ElementDict, {initial: initialMatched.elementId});
                        if(typeof found === 'undefined') ElementDict.push({ initial: initialMatched.elementId, replacedId: undefined });
                    }
                } 
            });
        });
        console.log("ElementsDict before replace", ElementDict);
        console.timeEnd("repalceBeforeEach");
        _.each(endElements, function(endElement){
            let endElementTypeId    = getElementTypeId(endElement);
            let startFindElements   = _.pluck(ReplaceLines[endElement], 'startElement');
            let startElements       = _.filter(match, function(element){ return _.contains(startFindElements, element.findElementId)});
            let replaceElementsId   = [];
            
            if( !(typeof endElementTypeId === 'undefined') && endElementTypeId != DeleteBoxType){
                // ejot cauri speciāllīnijām, atrodam elementus, kurus ir jāaizvieto
                let FirstReplaceElement = Elements.findOne(endElement);
                _.extend(FirstReplaceElement, {visited: false});
                console.time("repalceBFS");
                apstaigatieReplace = [FirstReplaceElement];
                let found = getNotVisitedItems();
                while(found) { found = getNotVisitedItems() }
                console.timeEnd("repalceBFS");
                console.time("createdboxTime");
                createdBoxes = _.filter(apstaigatieReplace, function(apst){ return _.has(apst, "visited") });
                // console.log("InsertedTracker before createdBoxes container", InsertedTracker);
                InsertedTracker = _.compact(InsertedTracker);
                createdBoxes = _.map(createdBoxes, function(box){
                    // console.log("InsertedTracker in map", InsertedTracker);
                    let insertedBox = _.findWhere(InsertedTracker, {localId: box._id});
                    if(typeof insertedBox === 'undefined') //return {local: box._id, inserted: undefined}
                     {
                        if(_.contains(endElements, box._id)){
                            // ??? 
                            let boxStartFindElements = _.pluck(ReplaceLines[box._id], 'startElement');
                            let boxStartElements = _.filter(match, function(element){ return _.contains(boxStartFindElements, element.findElementId)});
                            boxStartElements = _.pluck(boxStartElements, "elementId");
                            console.log("BOXSTARTELEMENTS", boxStartElements);
                            boxStartElements = _.filter(boxStartElements, function(element){
                                let FoundElement = Elements.findOne({_id: element});
                                if(typeof FoundElement !== 'undefined') return FoundElement.elementTypeId == box.elementTypeId;
                                else {
                                    FoundElement = _.findWhere(ElementDict, {initial: element}).replacedId;
                                    return getElementTypeId(FoundElement) == box.elementTypeId;
                                }
                            });
                            let ElementDictItem = _.findWhere(ElementDict, {initial: _.first(boxStartElements)}); // šeit būs jāpārstrādā, jo pie merge var būt problēmas
                            return {local: box._id, inserted: ElementDictItem.replacedId}
                        }
                        else return {local: box._id, inserted: undefined}
                    }
                    
                    else return {local: box._id, inserted: insertedBox.inserted}
                
                }); // console.log("createdBoxes after map", createdBoxes);
                createdBoxes = _.groupBy(createdBoxes, 'local');
                console.log("createdBOXES", createdBoxes);
                console.timeEnd("createdboxTime");
                // palīgkonteiners, lai pieglabāt jau ievietotās virsotnes
                // console.log('created boxes before', createdBoxes);
                // console.log('inserted tracker before: ', InsertedTracker);
                let apstaigatieReplaceId = _.pluck(apstaigatieReplace,'_id');
                _.each(apstaigatieReplace, function(element){
                    if( !_.has(element,"visited")){ // visited īpašības nav tikai šķautnēm konteinerā apastaigatieReplace
                        let start = _.first(createdBoxes[element.startElement]);
                        let end   = _.first(createdBoxes[element.endElement]);
                        let StartLocation = undefined;
                        let EndLocation = undefined;
                        console.time("EdgeAndItsBoxesProcessTime");
                        if(typeof start.inserted === 'undefined'){
                            let startbox;
                            let FoundMatchedStartElement;
                            if (start.local == endElement){ 
                                // ja elements ir speciāllīnijas labajā galā, tad mēģinām uzradīt tam aizvietojamo elementu tajā pašā vietā, kur bija vecais
                                // console.log('start equals to endEleemnt');
                                let startElementLocationId =  _.findWhere(startElements, {findElementId: _.first(ReplaceLines[endElement]).startElement}).elementId;
                                FoundMatchedStartElement = Elements.findOne({_id: startElementLocationId});
                                
                                if(typeof FoundMatchedStartElement === 'undefined') {
                                    startElementLocationId = _.findWhere(ElementDict, {initial: startElementLocationId}).replacedId;
                                    FoundMatchedStartElement = Elements.findOne({_id: startElementLocationId});
                                }
                                StartLocation = FoundMatchedStartElement.location;
                                // console.log("STARTLOCATOIN", StartLocation);
                            }
                            else if(_.contains(endElements, start.local) && start.local != endElement){
                                // console.log('start not equals to endElement, but is in endElements');
                                // ja dotais uzradamais elements nav vienāds ar doto endElement, bet ir vienāds ar kādu citu end Elements, tad tam arī jāvedo cita location
                                let FoundEndElement = _.find(endElements, function(endElement){return endElement == start.local});
                                let startFindElement = _.first(ReplaceLines[FoundEndElement]).startElement; // atrodam elementu, kas ir aizvietojamās līnijas kreisajā pusē
                                let startElement = _.find(match, function(element){return element.findElementId == startFindElement}).elementId;// startFindElement atbilstošais elements dotajā match
                                FoundMatchedStartElement = Elements.findOne({_id: startElement});
                                if(typeof FoundMatchedStartElement === 'undefined') {
                                    startElement = _.findWhere(ElementDict, {initial: startElement}).replacedId;
                                    FoundMatchedStartElement = Elements.findOne({_id: startElement});
                                }
                                StartLocation = FoundMatchedStartElement.location;
                            } else // console.log('neither in start');
                            if(StartLocation) {startbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.startElement}), StartLocation);
                            // console.log("STARTLOCATION", StartLocation);
                            }
                            else {startbox =  createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.startElement}));
                                // console.log('NO START LOCATION');
                            }
                            _.first(createdBoxes[element.startElement]).inserted    = Elements.insert(startbox);

                            let MatchedReplaceElements = _.filter(ReplaceLines[start.local], function(item){
                                if(getElementTypeId(start.local) == getElementTypeId(item.startElement)) return true;
                                else { let replaceElement = _.findWhere(match, {findElementId: item.startElement}).elementId; replaceElementsId.push(replaceElement); return false;}
                            });
                            MatchedReplaceElements = _.pluck(MatchedReplaceElements, "startElement");
                            if(_.contains(endElements, start.local) && _.size(MatchedReplaceElements) > 0) {
                                _.each(MatchedReplaceElements, function(element){
                                    let initialMatchedId = _.findWhere(match, {findElementId: element}).elementId;

                                    _.each(ElementDict, function(item){ if(item.initial == initialMatchedId ) {
                                        if(!(typeof item.replacedId === 'undefined')){
                                            _.each(startElements, function(startElement){ if(startElement.elementId == item.initial) replaceElementsId.push(item.replacedId)})
                                        }
                                        else replaceElementsId.push(item.initial);
                                        item.replacedId = start.inserted;
                                    }   })
                                });
                                
                                console.log("ElementDict", ElementDict);
                                
                            }
                            if(!_.contains(parsedElements, start.local)) {
                                parseCompartmentExpressions(startFindElements, start.local, start.inserted, match);
                                parsedElements.push(start.local);
                            }
                        }
                        else {
                            // console.log('found start eleemnt');
                        }
                        if(typeof end.inserted === 'undefined'){
                            let endbox;
                            let FoundMatchedEndElement;
                            if(end.local == endElement) {
                                // console.log('end equals to endElement');
                                let endElementLocationId = _.findWhere(startElements, {findElementId: _.first(ReplaceLines[endElement]).startElement}).elementId;
                            
                                FoundMatchedEndElement = Elements.findOne({_id: endElementLocationId});
                                
                                if(typeof FoundMatchedEndElement === 'undefined') {
                                    endElementLocationId = _.findWhere(ElementDict, {initial: endElementLocationId}).replacedId;
                                    FoundMatchedEndElement = Elements.findOne({_id: endElementLocationId});
                                }
                                EndLocation = FoundMatchedEndElement.location;
                            }
                            else if(_.contains(endElements, end.local) && end.local != endElement){
                                // console.log('end equals not equals, but is in endElements');
                                let FoundEndElement = _.find(endElements, function(endElement){return endElement == end.local});
                                let startFindElement = _.first(ReplaceLines[FoundEndElement]).startElement; // atrodam elementu, kas ir aizvietojamās līnijas kreisajā pusē
                                let startElement = _.find(match, function(element){return element.findElementId == startFindElement}).elementId;// startFindElement atbilstošais elements dotajā match
                                FoundMatchedEndElement = Elements.findOne({_id: startElement});
                                
                                if(typeof FoundMatchedEndElement === 'undefined') {
                                    startElement = _.findWhere(ElementDict, {initial: startElement}).replacedId;
                                    FoundMatchedEndElement = Elements.findOne({_id: startElement});
                                }
                                EndLocation = FoundMatchedEndElement.location;
                                // console.log('FoundEndElement', FoundEndElement);console.log('startFindElem',startFindElement);console.log('startElement',startElement);
                                //console.log('endlocation',EndLocation);
                            } else {}  // console.log('neither in end');
                            if(EndLocation) {endbox  = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.endElement}), EndLocation);}
                            else {endbox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element.endElement}));}
                            _.first(createdBoxes[element.endElement]).inserted      = Elements.insert(endbox);

                            let MatchedReplaceElements = _.filter(ReplaceLines[end.local], function(item){
                                if(getElementTypeId(end.local) == getElementTypeId(item.startElement)) return true;
                                else { let replaceElement = _.findWhere(match, {findElementId: item.startElement}).elementId; replaceElementsId.push(replaceElement); return false;}
                            });
                            MatchedReplaceElements = _.pluck(MatchedReplaceElements, "startElement");
                            if(_.contains(endElements, end.local) && _.size(MatchedReplaceElements) > 0) {
                                _.each(MatchedReplaceElements, function(element){
                                    let initialMatchedId = _.findWhere(match, {findElementId: element}).elementId;

                                    _.each(ElementDict, function(item){ 
                                        if(item.initial == initialMatchedId ) {
                                            if(!(typeof item.replacedId === 'undefined')){
                                                _.each(startElements, function(startElement){ if(startElement.elementId == item.initial) replaceElementsId.push(item.replacedId)})
                                            }
                                            else replaceElementsId.push(item.initial);
                                            item.replacedId = end.inserted;
                                        }    
                                    });
                                });
                                
                                console.log("ElementDict", ElementDict);
                                
                            }
                            if(!_.contains(parsedElements, end.local)) {
                                parseCompartmentExpressions(startFindElements, end.local, end.inserted, match);
                                parsedElements.push(end.local);
                            }
                        }
                        else{
                           // console.log('found end eleemnt');
                        }
                        if( !FindEdgeBySourceAndTarget(start.inserted, end.inserted) ){ // pārbaudām, vai šķautne netika izveidota iepriekšējās iterācijās
                            let newEdge = createEdge(element, diagToReplaceIn, start.inserted, end.inserted);
                            let NewEdgeId = Elements.insert(newEdge);
                            if(!_.contains(parsedElements, element._id)) {
                                parseCompartmentExpressions(startFindElements, element._id, NewEdgeId, match);
                                parsedElements.push(element._id);
                            }
                        }
                        console.timeEnd("EdgeAndItsBoxesProcessTime");
                    }
                    else { // ja visited īpašība ir, vedojam šo pašu virsotni
                        console.time("boxProcessingTime");
                        let box = _.first(createdBoxes[element._id]);
                        let BoxLocation = undefined;
                        if(typeof box.inserted === 'undefined'){
                            console.log("local box", box.local);
                            console.dir(createdBoxes, {depth:null});
                            let NewBox;
                            let FoundMatchedElement
                            if(box.local == endElement) {
                                let boxElementLocationId = _.findWhere(startElements, {findElementId: _.first(ReplaceLines[endElement]).startElement}).elementId;
                                //console.log("boclocationID", boxElementLocationId);
                                FoundMatchedElement = Elements.findOne({_id: boxElementLocationId});
                                //console.log("FoundElement", FoundMatchedElement);
                                if(typeof FoundMatchedElement === 'undefined') {
                                    boxElementLocationId = _.findWhere(ElementDict, {initial: boxElementLocationId}).replacedId;
                                    FoundMatchedElement = Elements.findOne({_id: boxElementLocationId});
                                }
                                BoxLocation = FoundMatchedElement.location;
                                // console.log('box Location', BoxLocation);
                            }
                            else if(_.contains(endElements, box.local) && box.local != endElement){
                                let FoundEndElement     = _.find(endElements, function(endElement){return endElement == box.local});
                                let startFindElement    = _.first(ReplaceLines[FoundEndElement]).startElement; // atrodam elementu, kas ir aizvietojamās līnijas kreisajā pusē
                                let startElement        = _.find(match, function(element){return element.findElementId == startFindElement}).elementId;// startFindElement atbilstošais elements dotajā match
                                
                                FoundMatchedElement = Elements.findOne({_id: startElement});
                                
                                if(typeof FoundMatchedElement === 'undefined') {
                                    startElement = _.findWhere(ElementDict, {initial: startElement}).replacedId;
                                    FoundMatchedElement = Elements.findOne({_id: startElement});
                                }
                                EndLocation = FoundMatchedElement.location;
                            }
                            if(BoxLocation) NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}), BoxLocation);
                            else NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}));
                            _.first(createdBoxes[element._id]).inserted    = Elements.insert(NewBox);
                            console.log("match",match);
                            console.log(`box.local: ${box.local} endElements ${endElements}`);
                            let MatchedReplaceElements = _.filter(ReplaceLines[box.local], function(item){
                                if(getElementTypeId(box.local) == getElementTypeId(item.startElement)) return true;
                                else { let replaceElement = _.findWhere(match, {findElementId: item.startElement}).elementId; replaceElementsId.push(replaceElement); return false;}
                            });
                            MatchedReplaceElements = _.pluck(MatchedReplaceElements, "startElement");
                            if(_.contains(endElements, box.local) && _.size(MatchedReplaceElements) > 0) {
                                _.each(MatchedReplaceElements, function(element){
                                    let initialMatchedId = _.findWhere(match, {findElementId: element}).elementId;

                                    _.each(ElementDict, function(item){ if(item.initial == initialMatchedId ) {
                                        if(!(typeof item.replacedId === 'undefined')){
                                            _.each(startElements, function(startElement){ if(startElement.elementId == item.initial) replaceElementsId.push(item.replacedId)})
                                        }
                                        else replaceElementsId.push(item.initial);
                                        item.replacedId = box.inserted;
                                    }   })
                                });
                                
                                console.log("ElementDict", ElementDict);
                                
                            }
                            if(!_.contains(parsedElements, box.local)) {
                                parseCompartmentExpressions(startFindElements, box.local, box.inserted, match);
                                parsedElements.push(box.local);
                            }
                        }
                        console.timeEnd("boxProcessingTime");
                    }
                });
                console.time("InsertedTrackerMapTime");
                InsertedTracker = _.map(apstaigatieReplace, function(apstaigatais){
                    if(createdBoxes[apstaigatais._id]){
                        return {localId: apstaigatais._id, inserted: _.first(createdBoxes[apstaigatais._id]).inserted}
                    }
                });
                InsertedTracker = _.compact(InsertedTracker);
                console.timeEnd("InsertedTrackerMapTime");
                // console.log("InsertedTracker",InsertedTracker);
                // startElements       = _.pluck(startElements, 'elementId');
                // startElements       = _.map(startElements, function(element){
                //     let foundInDict = _.findWhere(ElementDict, {initial: element});
                //     if(typeof foundInDict === "undefined") return element;
                //     return foundInDict.replacedId;
                // });
                let createdEndElement = _.first(createdBoxes[FirstReplaceElement._id]).inserted;
                _.each(LinesToDelete, function(line){ deleteOldElementAndCompartments(line) });
                console.time("LinesSwitchingTime");
                _.each(replaceElementsId, function(element){ switchEdgesFromOldToNewElement(element, createdEndElement,FindRelatedEdges(element)) });// pārvietojam šķautnes
                console.timeEnd("LinesSwitchingTime");
                // jāveic pārbaudi uz to vai šķautnes ir jāoārkabina, vai nav. Ja nav jāpārkabina, piemēram, pie delete edge paterna.
                createCompartments(replaceElementsId, createdEndElement); 
                if(!_.contains(parsedElements, endElement)) {
                    parseCompartmentExpressions(startFindElements,endElement ,createdEndElement,match);
                    parsedElements.push(endElement);
                }
                console.log("replaceElementsId", replaceElementsId);
                _.each(replaceElementsId, function(element){ deleteOldElementAndCompartments(element)}); // dzēšam vecos elementus
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
        console.timeEnd("replaceStructOverallTimer");
    }
    else console.log('match not found/undefined')
}
function formatMatch(match){
    console.time("formatMatchTimer");
    let FormatedMatch = _.flatten(_.map(match.match, function(MatchItem){
        return _.map(MatchItem.elements, function(elementPair){
            return elementPair;
        })
    }));
    console.timeEnd("formatMatchTimer");
    return FormatedMatch;
}
function markConflictingMatches(matches, elementsToLookup) { 
    console.time("markConflictingMatchesTimer");
    _.each(matches, function(match){
        if(match.status == 'new'){
            let foundConflictingMatch = false;
            if(_.size(ElementDict) == 0) {
                console.log("ElementDict is empty");
                foundConflictingMatch = _.some(match.match, function(matchItem){
                    return _.some(matchItem.elements, function(elementPair){
                        return _.contains(elementsToLookup, elementPair.elementId);
                    }); // ja atrodam kaut vienu elementu, kas bija aizvietojamo elementu sarakstā, tad nomarķējam šo matchu kā konfiktējošu
                });
            } else {
                let ElementDictInitials = _.pluck(ElementDict, "initial");
                let ElementsToLookup    = formatMatch(match);
                console.log("ElementsToLookUp before map", ElementsToLookup);
                console.log("ElementDict", ElementDict);
                ElementsToLookup        = _.map(ElementsToLookup, function(pair){
                    if(_.contains(ElementDictInitials, pair.elementId)) return _.findWhere(ElementDict, {initial: pair.elementId}).replacedId;
                    return pair.elementId;
                });
                let foundElements = Elements.find({
                    $and:
                    [
                        {_id: {$in: ElementsToLookup}}
                    ]
                }).fetch();
                foundConflictingMatch = _.size(ElementsToLookup) != _.size(foundElements); // ja vārdnīca ElementDict, tad marķēšanas semantika mainās
                console.log("ElementsTollokup", ElementsToLookup);
                console.log("foundElements", _.pluck(foundElements, "_id"));
                console.log("found conflicting", foundConflictingMatch);
            }
            if(foundConflictingMatch) match.status = 'conflicting';
        }
    });
    console.timeEnd("markConflictingMatchesTimer");
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
            ElementDict = []; // iztīram elementu vārdnīcu, apstrādājot nākamo diagrammu, jo tur būs citi endElement atrastie match elementi
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
    replaceSingleOccurence: function(ParamList){
        let FormatedMatch   = formatMatch(ParamList.match);
        replaceStruct(FormatedMatch);
        let responseResults = [];

        _.each(ParamList.matchData, function(diagramMatchData){
            _.each(diagramMatchData.matches, function(match){
                if(match._id == ParamList.diagramId ){
                    diagramMatchData.matches = markConflictingMatches(diagramMatchData.matches, ParamList.elementsToLookup);
                }
            });
        });
        _.each(ParamList.matchData, function(diagramMatchData){
            _.each(diagramMatchData.matches, function(match){
                if(match._id == ParamList.diagramId ){
                    let respObj = { matchId: match.id, status: match.status};
                    responseResults.push(respObj);
                }
            });
        });
        return responseResults;
    },
    updateLayout: function(list) {
        console.time("updateLayoutTimer");
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
        console.timeEnd("updateLayoutTimer");
    },
    checkDiagramExistance(diagramId){
        const diagram = Diagrams.findOne({_id: diagramId})
        if(!diagram) return false;
        else return true;
    }
})