// Dmitrija kods

let ReplaceLineType;
let DeleteBoxType;
let apstaigatieReplace;
let createdBoxes;
let ElementDict; // elementu vārdnīca, kurā tiek pieglabāti aizvietoto elementu idi, ja aizvietojamais tips nemainījās

function getStartElements(diagParamList, diagramType){
    // iegūstam starta elementus no visām speciāllīnijām
    let elementsToFind  = [];
    ReplaceLineType     = ElementTypes.findOne({name: "FindReplaceLink", diagramTypeId: diagramType})._id;
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
function getElementTypeId(elementId){ return Elements.findOne({_id: elementId}).elementTypeId; } // atgriež elementa tipa id
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
    // veido Dekarta reizinājumu matchiem
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
    // izveido izteiksmes ķļudas paziņojuma simbolu virkni no error objekta, kuru atgriež parseris
    let msg             = "Expected: ";
    let expectedItems   = _.pluck(error.expected, "value");
    msg                 += expectedItems.join(" or ");
    msg                 += " but found ";

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
/***@RDBMS pieejas uzmetums */
function findGraphRdbms(findGraph){
    // findGraph - meklejamais grafs
    _.each(findGraph, (element) => { 
        if(_.has(element, 'visited')) element.visited = false; // nomainam virsotnu apstaigashanas markerus
        // else _.extend(element, {visitedEdge: false}); // uzstadam apstaigashanas markerus skautnes, lai nav jalookupo lieku reizi
    }); // markejam virsotnes ka neapstaigatas

    let isFirstNode = true;
    let findNode = _.first(findGraph);
    let FindNodes = [findNode];
    const pipeline = [];
    
    // pagaidam bez atributu parbaudes!!!
    while(FindNodes.length > 0){ // next depth find Nodes
        findNode = FindNodes.pop();
        console.log('popped findNode id: ', findNode._id);
        console.log('is first: ', isFirstNode);
        if(isFirstNode){
            findNode.visited = true;
            const matchStage = {
                $match: {
                    _id: {
                        $ne:findNode._id
                    },
                    elementTypeId: findNode.elementTypeId,
                    diagramId: { $ne: findNode.diagramId}
                }
            }
            pipeline.push(matchStage);
            const addTrackAuxFieldsStage = {
                $addFields:{
                    foundElements: [{findElement: findNode._id, elementId: "$_id"}],
                    elementIds: ["$_id"], // maybe lookedupnode will be good idea for checking edge connectivity
                    lastMatchedPoppedNode: '$$ROOT',
                    matchedBackTrackingNode: '$$ROOT',
                    findElementId: findNode._id
                }
            }
            pipeline.push(addTrackAuxFieldsStage);
            isFirstNode = false;
            const lookupFindElementCompartments = { // NOT PUSHED TO PIPELINE
                $lookup: {
                    from: 'Compartments',
                    let : {findElementId: findNode._id},
                        pipeline: [
                            {
                                $match:{
                                    $expr: {
                                        $eq: ['$elementId', '$$findElementId']
                                    }
                                }
                            }
                        ],
                    as: 'findElementCompartments'
                }
            }
            pipeline.push(lookupFindElementCompartments)
            const countStage = { // NOT PUSHED TO PIPELINE
                $addFields: {
                    findElementCompartmentsCount: { $size: '$findElementCompartments'}
                }
            }
            pipeline.push(countStage);
            const lookupFoundElementCompartments = { // NOT PUSHED TO PIPELINE
                $lookup: {
                    from: 'Compartments',
                    localField: '_id',
                    foreignField: 'elementId',
                    as: 'foundElementCompartments'
                }
            }
            pipeline.push(lookupFoundElementCompartments);
            
            const filterByConstraints = {
                $addFields:{
                    findElementCompartments:{
                        $filter:{
                            input: '$findElementCompartments',
                            as: 'compartment',
                            cond:{
                                $and: [
                                    { $in: ['$$compartment.compartmentTypeId', '$foundElementCompartments.compartmentTypeId'] },
                                    { $gt: [
                                        { $indexOfCP: 
                                        [
                                            {
                                                $arrayElemAt: ['$foundElementCompartments.value', {$indexOfArray: ['$foundElementCompartments.compartmentTypeId','$$compartment.compartmentTypeId'] }]
                                            }, 
                                            '$$compartment.value'
                                        ]
                                    },
                                    -1]}
                                    
                                ]
                            }
                        }
                    }
                }
            }
            pipeline.push(filterByConstraints);
            
            const matchFiltered = {
                $match: {
                    $or: [
                        { findElementCompartmentsCount: {$eq: 0}},
                        { $expr:{$eq:["$findElementCompartmentsCount", {$size: '$findElementCompartments'}]} }
                    ]
                }
            }
            pipeline.push(matchFiltered);
            /**@meklee pirmaas virsotnes */
            const relatedIncomingFindEdges = _.where(findGraph, {endElement: findNode._id});
            console.log('related incoming edges',relatedIncomingFindEdges);
            _.each(relatedIncomingFindEdges, (edge) =>{
                console.log('edge.endElement', edge.endElement);
                console.log('findNode._id', findNode._id)
                if (edge.endElement === edge.startElement){
                    const lookupEdgeStage = {
                        $lookup:{
                            from: 'Elements',
                            let : {startElementId: "$_id",foundIds: '$elementIds'},
                            pipeline: [
                                {
                                    $match:{
                                        $expr: {
                                            $and:[
                                                { $eq: ['$elementTypeId', edge.elementTypeId] },
                                                { $eq: ['$startElement', '$$startElementId'] },
                                                { $eq: ['$endElement', '$$startElementId']},
                                                // { $not: {$in: ['$_id', '$$foundIds']}}
                                            ]
                                        }
                                    }
                                },
                                {
                                    $lookup: {
                                        from: 'Compartments',
                                        let : {findElementId: edge._id},
                                            pipeline: [
                                                {
                                                    $match:{
                                                        $expr: {
                                                            $eq: ['$elementId', '$$findElementId']
                                                        }
                                                    }
                                                }
                                            ],
                                        as: 'findElementCompartments'
                                    }
                                },
                                {
                                    $addFields: {
                                        findElementCompartmentsCount: { $size: '$findElementCompartments'}
                                    }
                                },
                                {
                                    $lookup: {
                                        from: 'Compartments',
                                        localField: '_id',
                                        foreignField: 'elementId',
                                        as: 'foundElementCompartments'
                                    }
                                },
                                {
                                    $addFields:{
                                        findElementCompartments:{
                                            $filter:{
                                                input: '$findElementCompartments',
                                                as: 'compartment',
                                                cond:{
                                                    $and: [
                                                        { $in: ['$$compartment.compartmentTypeId', '$foundElementCompartments.compartmentTypeId'] },
                                                        { $gt: [
                                                            { $indexOfCP: 
                                                            [
                                                                {
                                                                    $arrayElemAt: ['$foundElementCompartments.value', {$indexOfArray: ['$foundElementCompartments.compartmentTypeId','$$compartment.compartmentTypeId'] }]
                                                                }, 
                                                                '$$compartment.value'
                                                            ]
                                                        },
                                                        -1]}
                                                        
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                },
                                {
                                    $match: {
                                        $or: [
                                            { findElementCompartmentsCount: {$eq: 0}},
                                            { $expr:{$eq:["$findElementCompartmentsCount", {$size: '$findElementCompartments'}]} }
                                        ]
                                    }
                                }
                            ],
                            as: 'lookedUpEdge'
                        }
                    }
                    pipeline.push(lookupEdgeStage);
                    const filterEmptyEdgesStage = {
                        $match:{
                            "lookedUpEdge":{$ne:[]}
                        }
                    }
                    pipeline.push(filterEmptyEdgesStage);
                    const unwindStage = {
                        $unwind:{
                            path: "$lookedUpEdge"
                        }
                    }
                    pipeline.push(unwindStage);
                    const updateVisitedElementsFields = {
                        $addFields:{
                            foundElements: { $concatArrays: [ "$foundElements", [ {findElementId: edge._id, elementId: "$lookedUpEdge._id"} ] ] }, 
                            elementIds: { $concatArrays: [ "$elementIds", [ "$lookedUpEdge._id" ] ] },
                        }
                    }
                    pipeline.push(updateVisitedElementsFields);
                }
                let nextDepthNode = _.findWhere(findGraph, {_id: edge.startElement, visited: false});
                if(nextDepthNode && typeof _.findWhere(FindNodes,{_id: nextDepthNode._id}) === 'undefined') FindNodes.push(nextDepthNode);
            })
            const relatedOutcomingFindEdges = _.where(findGraph, {startElement: findNode._id});
            console.log('related outcoming edges', relatedOutcomingFindEdges);
            _.each(relatedOutcomingFindEdges, (edge) =>{
                console.log('edge.startElement', edge.startElement);
                console.log('findNode._id', findNode._id)
                // edge.visitedEdge = true;
                let nextDepthNode = _.findWhere(findGraph, {_id: edge.endElement, visited: false});
                if(nextDepthNode && typeof _.findWhere(FindNodes,{_id: nextDepthNode._id}) === 'undefined') FindNodes.push(nextDepthNode);
            })
            console.log('FindNodes after first if',FindNodes);
            console.log('inter query');
            // const subresult = Promise.await(Elements.rawCollection().aggregate(pipeline).toArray());
            // console.dir(subresult, {depth: null});

        }
        else {
            console.log('FindNodes',FindNodes);
            
            if(findNode.visited === false){
                findNode.visited = true;
                const lookupNodeStage = {
                    $lookup:{
                        from: 'Elements',
                        let : {foundIds: "$elementIds", diagId: "$diagramId", foundElementId: "$_id"},
                        pipeline: [
                            {
                                $match:{
                                    $expr: {
                                        $and:[
                                            { $eq: ['$elementTypeId', findNode.elementTypeId] },
                                            { $eq: ['$diagramId','$$diagId']},
                                            { $not: {$in: ['$_id', '$$foundIds']}}
                                        ]
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: 'Compartments',
                                    let : {findElementId: findNode._id},
                                        pipeline: [
                                            {
                                                $match:{
                                                    $expr: {
                                                        $eq: ['$elementId', '$$findElementId']
                                                    }
                                                }
                                            }
                                        ],
                                    as: 'findElementCompartments'
                                }
                            },
                            {
                                $addFields: {
                                    findElementCompartmentsCount: { $size: '$findElementCompartments'}
                                }
                            },
                            {
                                $lookup: {
                                    from: 'Compartments',
                                    localField: '_id',
                                    foreignField: 'elementId',
                                    as: 'foundElementCompartments'
                                }
                            },
                            {
                                $addFields:{
                                    findElementCompartments:{
                                        $filter:{
                                            input: '$findElementCompartments',
                                            as: 'compartment',
                                            cond:{
                                                $and: [
                                                    { $in: ['$$compartment.compartmentTypeId', '$foundElementCompartments.compartmentTypeId'] },
                                                    { $gt: [
                                                        { $indexOfCP: 
                                                        [
                                                            {
                                                                $arrayElemAt: ['$foundElementCompartments.value', {$indexOfArray: ['$foundElementCompartments.compartmentTypeId','$$compartment.compartmentTypeId'] }]
                                                            }, 
                                                            '$$compartment.value'
                                                        ]
                                                    },
                                                    -1]}
                                                    
                                                ]
                                            }
                                        }
                                    }
                                }
                            },
                            {
                                $match: {
                                    $or: [
                                        { findElementCompartmentsCount: {$eq: 0}},
                                        { $expr:{$eq:["$findElementCompartmentsCount", {$size: '$findElementCompartments'}]} }
                                    ]
                                }
                            }
                        ],
                        as: 'lookedUpNode'
                    },
                }
                pipeline.push(lookupNodeStage);
                const filterEmptyStage = {
                    $match:{
                        "lookedUpNode":{$ne:[]}
                    }
                }
                pipeline.push(filterEmptyStage);
                const unwindStage = {
                    $unwind:{
                        path: "$lookedUpNode"
                    }
                }
                pipeline.push(unwindStage);
                const subresult = Promise.await(Elements.rawCollection().aggregate(pipeline).toArray());
                console.dir(_.findWhere(subresult,{diagramId:"cY5Zc8u7d2E7XCKTH"}), {depth: null});
                const updateTrackingFields = {
                    $addFields:{
                        foundElements: { $concatArrays: [ "$foundElements", [ {findElementId: findNode._id, elementId: "$lookedUpNode._id"} ] ] }, 
                        elementIds: { $concatArrays: [ "$elementIds", [ "$lookedUpNode._id" ] ] },
                        lastMatchedPoppedNode: '$lookedUpNode'
                    }
                }
                pipeline.push(updateTrackingFields);
                const nextDepthFindNodes = [];
                const relatedIncomingFindEdges = _.where(findGraph, {endElement: findNode._id});
                console.log('findNode id ',findNode._id);
                console.log('related incoming edges ', relatedIncomingFindEdges);
                console.log('related incoming edges size', relatedIncomingFindEdges.length);
                if(relatedIncomingFindEdges.length > 0){
                    _.each(relatedIncomingFindEdges, (edge) => {
                        console.log('edge id ',edge._id);
                        let nextDepthNode = _.findWhere(findGraph, {_id: edge.startElement});
                        if(nextDepthNode.visited){
                            if(FindNodes.length == 0){
                                console.log('Find nodes is empty incoming');
                                // startElemenet == matchedBackTrackingNode._id
                                // endElmeent == lookedUpNode._id
                                // $nin: ['$_id', '$$elementIds']
                                // $unwind
                                const lookupEdgeStage = {
                                    $lookup:{
                                        from: 'Elements',
                                        let : {startElementId: "$matchedBackTrackingNode._id", endElementId: '$lookedUpNode._id',foundIds: '$elementIds'},
                                        pipeline: [
                                            {
                                                $match:{
                                                    $expr: {
                                                        $and:[
                                                            { $eq: ['$elementTypeId', edge.elementTypeId] },
                                                            { $eq: ['$startElement', '$$startElementId'] },
                                                            { $eq: ['$endElement', '$$endElementId']},
                                                            // { $not: {$in: ['$_id', '$$foundIds']}}
                                                        ]
                                                    }
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: 'Compartments',
                                                    let : {findElementId: edge._id},
                                                        pipeline: [
                                                            {
                                                                $match:{
                                                                    $expr: {
                                                                        $eq: ['$elementId', '$$findElementId']
                                                                    }
                                                                }
                                                            }
                                                        ],
                                                    as: 'findElementCompartments'
                                                }
                                            },
                                            {
                                                $addFields: {
                                                    findElementCompartmentsCount: { $size: '$findElementCompartments'}
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: 'Compartments',
                                                    localField: '_id',
                                                    foreignField: 'elementId',
                                                    as: 'foundElementCompartments'
                                                }
                                            },
                                            {
                                                $addFields:{
                                                    findElementCompartments:{
                                                        $filter:{
                                                            input: '$findElementCompartments',
                                                            as: 'compartment',
                                                            cond:{
                                                                $and: [
                                                                    { $in: ['$$compartment.compartmentTypeId', '$foundElementCompartments.compartmentTypeId'] },
                                                                    { $gt: [
                                                                        { $indexOfCP: 
                                                                        [
                                                                            {
                                                                                $arrayElemAt: ['$foundElementCompartments.value', {$indexOfArray: ['$foundElementCompartments.compartmentTypeId','$$compartment.compartmentTypeId'] }]
                                                                            }, 
                                                                            '$$compartment.value'
                                                                        ]
                                                                    },
                                                                    -1]}
                                                                    
                                                                ]
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            {
                                                $match: {
                                                    $or: [
                                                        { findElementCompartmentsCount: {$eq: 0}},
                                                        { $expr:{$eq:["$findElementCompartmentsCount", {$size: '$findElementCompartments'}]} }
                                                    ]
                                                }
                                            }
                                        ],
                                        as: 'lookedUpEdge'
                                    }
                                }
                                pipeline.push(lookupEdgeStage);
                                
                            }
                            else{
                                console.log('findNodes is not empty incoming')
                                // startElement == lastMatchedPoppedNode._id
                                // endElmeent == lookedUpNode._id
                                // $nin: ['$_id', '$$elementIds']
                                // unwind
                                const lookupEdgeStage = {
                                    $lookup:{
                                        from: 'Elements',
                                        let : {startElementId: "$lastMatchedPoppedNode._id", endElementId: '$lookedUpNode._id',foundIds: '$elementIds'},
                                        pipeline: [
                                            {
                                                $match:{
                                                    $expr: {
                                                        $and:[
                                                            { $eq: ['$elementTypeId', edge.elementTypeId] },
                                                            { $eq: ['$startElement', '$$startElementId'] },
                                                            { $eq: ['$endElement', '$$endElementId']},
                                                            // { $not: {$in: ['$_id', '$$foundIds']}}
                                                        ]
                                                    }
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: 'Compartments',
                                                    let : {findElementId: edge._id},
                                                        pipeline: [
                                                            {
                                                                $match:{
                                                                    $expr: {
                                                                        $eq: ['$elementId', '$$findElementId']
                                                                    }
                                                                }
                                                            }
                                                        ],
                                                    as: 'findElementCompartments'
                                                }
                                            },
                                            {
                                                $addFields: {
                                                    findElementCompartmentsCount: { $size: '$findElementCompartments'}
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: 'Compartments',
                                                    localField: '_id',
                                                    foreignField: 'elementId',
                                                    as: 'foundElementCompartments'
                                                }
                                            },
                                            {
                                                $addFields:{
                                                    findElementCompartments:{
                                                        $filter:{
                                                            input: '$findElementCompartments',
                                                            as: 'compartment',
                                                            cond:{
                                                                $and: [
                                                                    { $in: ['$$compartment.compartmentTypeId', '$foundElementCompartments.compartmentTypeId'] },
                                                                    { $gt: [
                                                                        { $indexOfCP: 
                                                                        [
                                                                            {
                                                                                $arrayElemAt: ['$foundElementCompartments.value', {$indexOfArray: ['$foundElementCompartments.compartmentTypeId','$$compartment.compartmentTypeId'] }]
                                                                            }, 
                                                                            '$$compartment.value'
                                                                        ]
                                                                    },
                                                                    -1]}
                                                                    
                                                                ]
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            {
                                                $match: {
                                                    $or: [
                                                        { findElementCompartmentsCount: {$eq: 0}},
                                                        { $expr:{$eq:["$findElementCompartmentsCount", {$size: '$findElementCompartments'}]} }
                                                    ]
                                                }
                                            }
                                        ],
                                        as: 'lookedUpEdge'
                                    }
                                }
                                pipeline.push(lookupEdgeStage);
                                
                            }
                            const filterEmptyEdgesStage = {
                                $match:{
                                    "lookedUpEdge":{$ne:[]}
                                }
                            }
                            pipeline.push(filterEmptyEdgesStage);
                            const unwindStage = {
                                $unwind:{
                                    path: "$lookedUpEdge"
                                }
                            }
                            pipeline.push(unwindStage);
                            const updateVisitedElementsFields = {
                                $addFields:{
                                    foundElements: { $concatArrays: [ "$foundElements", [ {findElementId: edge._id, elementId: "$lookedUpEdge._id"} ] ] }, 
                                    elementIds: { $concatArrays: [ "$elementIds", [ "$lookedUpEdge._id" ] ] },
                                }
                            }
                            pipeline.push(updateVisitedElementsFields);
                        }
                        // do i need to push node only if it is not visited, so it is known when to update backtrackingNode field? no.
                        // we push all, bu t in separate array, that later will be concatenated with findNodes
                        if(typeof _.findWhere(nextDepthFindNodes,{_id: nextDepthNode._id === 'undefined'})) nextDepthFindNodes.push(nextDepthNode);
                    })
                }
                const relatedOutcomingFindEdges = _.where(findGraph, {startElement: findNode._id});
                console.log('related outcoming edges ', relatedOutcomingFindEdges);
                if(relatedOutcomingFindEdges.length > 0){
                    _.each(relatedOutcomingFindEdges, (edge) => {
                        console.log(edge._id);
                        let nextDepthNode = _.findWhere(findGraph, {_id: edge.startElement});
                        if(nextDepthNode.visited){
                            if(FindNodes.length == 0){
                                console.log('Find nodes is empty outcoming');
                                // endElemenet == matchedBackTrackingNode._id
                                // startElmeent == lookedUpNode._id
                                // $nin: ['$_id', '$$elementIds']
                                // unwind
                                const lookupEdgeStage = {
                                    $lookup:{
                                        from: 'Elements',
                                        let : {startElementId: "$lookedUpNode._id", endElementId: '$matchedBackTrackingNode._id',foundIds: '$elementIds'},
                                        pipeline: [
                                            {
                                                $match:{
                                                    $expr: {
                                                        $and:[
                                                            { $eq: ['$elementTypeId', edge.elementTypeId] },
                                                            { $eq: ['$startElement', '$$startElementId'] },
                                                            { $eq: ['$endElement', '$$endElementId']},
                                                            // { $not: {$in: ['$_id', '$$foundIds']}}
                                                        ]
                                                    }
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: 'Compartments',
                                                    let : {findElementId: edge._id},
                                                        pipeline: [
                                                            {
                                                                $match:{
                                                                    $expr: {
                                                                        $eq: ['$elementId', '$$findElementId']
                                                                    }
                                                                }
                                                            }
                                                        ],
                                                    as: 'findElementCompartments'
                                                }
                                            },
                                            {
                                                $addFields: {
                                                    findElementCompartmentsCount: { $size: '$findElementCompartments'}
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: 'Compartments',
                                                    localField: '_id',
                                                    foreignField: 'elementId',
                                                    as: 'foundElementCompartments'
                                                }
                                            },
                                            {
                                                $addFields:{
                                                    findElementCompartments:{
                                                        $filter:{
                                                            input: '$findElementCompartments',
                                                            as: 'compartment',
                                                            cond:{
                                                                $and: [
                                                                    { $in: ['$$compartment.compartmentTypeId', '$foundElementCompartments.compartmentTypeId'] },
                                                                    { $gt: [
                                                                        { $indexOfCP: 
                                                                        [
                                                                            {
                                                                                $arrayElemAt: ['$foundElementCompartments.value', {$indexOfArray: ['$foundElementCompartments.compartmentTypeId','$$compartment.compartmentTypeId'] }]
                                                                            }, 
                                                                            '$$compartment.value'
                                                                        ]
                                                                    },
                                                                    -1]}
                                                                    
                                                                ]
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            {
                                                $match: {
                                                    $or: [
                                                        { findElementCompartmentsCount: {$eq: 0}},
                                                        { $expr:{$eq:["$findElementCompartmentsCount", {$size: '$findElementCompartments'}]} }
                                                    ]
                                                }
                                            }
                                        ],
                                        as: 'lookedUpEdge'
                                    }
                                }
                                pipeline.push(lookupEdgeStage);
                            }
                            else{
                                // endElement == lastMatchedPoppedNode._id
                                // startElmeent == lookedUpNode._id
                                // $nin: ['$_id', '$$elementIds']
                                // unwind
                                console.log('findNodes is not empty outcoming')
                                const lookupEdgeStage = {
                                    $lookup:{
                                        from: 'Elements',
                                        let : {startElementId: "$lookedUpNode._id", endElementId: '$lastMatchedPoppedNode._id',foundIds: '$elementIds'},
                                        pipeline: [
                                            {
                                                $match:{
                                                    $expr: {
                                                        $and:[
                                                            { $eq: ['$elementTypeId', edge.elementTypeId] },
                                                            { $eq: ['$startElement', '$$startElementId'] },
                                                            { $eq: ['$endElement', '$$endElementId']},
                                                            // { $not: {$in: ['$_id', '$$foundIds']}}
                                                        ]
                                                    }
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: 'Compartments',
                                                    let : {findElementId: edge._id},
                                                        pipeline: [
                                                            {
                                                                $match:{
                                                                    $expr: {
                                                                        $eq: ['$elementId', '$$findElementId']
                                                                    }
                                                                }
                                                            }
                                                        ],
                                                    as: 'findElementCompartments'
                                                }
                                            },
                                            {
                                                $addFields: {
                                                    findElementCompartmentsCount: { $size: '$findElementCompartments'}
                                                }
                                            },
                                            {
                                                $lookup: {
                                                    from: 'Compartments',
                                                    localField: '_id',
                                                    foreignField: 'elementId',
                                                    as: 'foundElementCompartments'
                                                }
                                            },
                                            {
                                                $addFields:{
                                                    findElementCompartments:{
                                                        $filter:{
                                                            input: '$findElementCompartments',
                                                            as: 'compartment',
                                                            cond:{
                                                                $and: [
                                                                    { $in: ['$$compartment.compartmentTypeId', '$foundElementCompartments.compartmentTypeId'] },
                                                                    { $gt: [
                                                                        { $indexOfCP: 
                                                                        [
                                                                            {
                                                                                $arrayElemAt: ['$foundElementCompartments.value', {$indexOfArray: ['$foundElementCompartments.compartmentTypeId','$$compartment.compartmentTypeId'] }]
                                                                            }, 
                                                                            '$$compartment.value'
                                                                        ]
                                                                    },
                                                                    -1]}
                                                                    
                                                                ]
                                                            }
                                                        }
                                                    }
                                                }
                                            },
                                            {
                                                $match: {
                                                    $or: [
                                                        { findElementCompartmentsCount: {$eq: 0}},
                                                        { $expr:{$eq:["$findElementCompartmentsCount", {$size: '$findElementCompartments'}]} }
                                                    ]
                                                }
                                            }
                                        ],
                                        as: 'lookedUpEdge'
                                    }
                                }
                                pipeline.push(lookupEdgeStage);
                            }
                            // const subresult = Promise.await(Elements.rawCollection().aggregate(pipeline).toArray());
                            // console.dir(_.where(subresult,{diagramId:'xZe8Nu3ZP7kz5zPG6'}), {depth: null});
                            // console.log('subresult size', subresult.length);
                            // console.log('found diagram ids ', _.pluck(subresult,'_id'));

                            const filterEmptyEdgesStage = {
                                $match:{
                                    "lookedUpEdge":{$ne:[]}
                                }
                            }
                            pipeline.push(filterEmptyEdgesStage);
                            const unwindStage = {
                                $unwind:{
                                    path: "$lookedUpEdge"
                                }
                            }
                            pipeline.push(unwindStage);
                            const updateVisitedElementsFields = {
                                $addFields:{
                                    foundElements: { $concatArrays: [ "$foundElements", [ {findElementId: edge._id, elementId: "$lookedUpEdge._id"} ] ] }, 
                                    elementIds: { $concatArrays: [ "$elementIds", [ "$lookedUpEdge._id" ] ] },
                                }
                            }
                            pipeline.push(updateVisitedElementsFields);
                        }
                        if(typeof _.findWhere(nextDepthFindNodes,{_id: nextDepthNode._id === 'undefined'})) nextDepthFindNodes.push(nextDepthNode);
                    })
                }
                // only then update backtracking field and concatenate FindNodes and nextDepthFindNodes
                if(FindNodes.length === 0){
                    const updateBacktrackingFieldStage = {
                        $addFields:{
                            matchedBackTrackingNode: '$lastMatchedPoppedNode'
                        }
                    }
                    pipeline.push(updateBacktrackingFieldStage);
                }
                FindNodes = FindNodes.concat(nextDepthFindNodes);
            }
        }
    }
    // grouping results
    const groupStage = {
        $group: {
            _id: "$diagramId",
            elements: {$push: "$$ROOT"}
        }
    }
    pipeline.push(groupStage);
    const result = Promise.await(Elements.rawCollection().aggregate(pipeline).toArray());
    // console.dir(result[0], {depth: null});
    console.log('result size', result.length);
    console.log('found diagram ids ', _.pluck(result,'_id'));
}
function findByEdges(findElement){
    _.extend(findElement, {visited: false});
    let findGraph = [findElement];
    let found = BreadthFirstSearch(findGraph);
    while( found ) { found = BreadthFirstSearch(findGraph)}
    
    findGraphRdbms(findGraph);
    // let edges = _.filter(findGraph, (element)=>{
    //     return _.has(element, 'startElement')
    // });
    // _.each(edges, (edge) => {
    //     _.extend(edge, {startElementObj: _.findWhere(findGraph, {_id: edge.startElement})})
    //     _.extend(edge, {endElementObj: _.findWhere(findGraph, {_id: edge.endElement})})

    // })
    
    
    // const lookedUpNodes = []; // may be it is better to accumulate looked up edges to?
    // const pipeline = [
    //     {
    //         $match: {
    //             _id: {
    //                 $ne:edges[0]._id
    //             },
    //             elementTypeId: edges[0].elementTypeId,
    //             diagramId: { $ne: edges[0].diagramId}
    //         }
    //     },
    //     {
    //         $addFields:{
    //             foundElements: [{findElement: edges[0]._id, elementId: "$_id"}],
    //             elementIds: ["$_id"] 
    //         }
    //     },
        
    //     {
    //         $lookup:{
    //             from: 'Elements',
    //             let : {startElementId: "$startElement"},
    //             pipeline: [
    //                 {
    //                     $match:{
    //                         $expr: {
    //                             $and:[
    //                                 { $eq: ['$elementTypeId', edges[0].startElementObj.elementTypeId] },
    //                                 { $eq: ['$_id', '$$startElementId'] }
    //                             ]
    //                         }
    //                     }
    //                 }
    //             ],
    //             as: 'lookedUpStartNode'
    //         },
    //     },
    //     { // filtrējam tos, kuriem neko neatrada
    //         $match:{
    //             "lookedUpStartNode":{$ne:[]}
    //         }
    //     },
    //     {
    //         $unwind:{
    //             path: "$lookedUpStartNode"
    //         }
    //     },
    //     // if endElement is not looked up already
    //     { 
    //         $addFields: { 
    //             foundElements: { $concatArrays: [ "$foundElements", [ {findElementId: edges[0].startElement, elementId: "$lookedUpStartNode._id"} ] ] }, 
    //             elementIds: { $concatArrays: [ "$elementIds", [ "$lookedUpStartNode._id" ] ] }
    //         } 
    //     },
    //     {
    //         $lookup:{
    //             from: 'Elements',
    //             let : {endElementId: "$endElement"},
    //             pipeline: [
    //                 {
    //                     $match:{
    //                         $expr: {
    //                             $and:[
    //                                 { $eq: ['$elementTypeId', edges[0].endElementObj.elementTypeId] },
    //                                 { $eq: ['$_id', '$$endElementId'] }
    //                             ]
    //                         }
    //                     }
    //                 }
    //             ],
    //             as: 'lookedUpEndNode'
    //         },
    //     },
    //     { // filtrējam tos, kuriem neko neatrada
    //         $match:{
    //             "lookedUpEndNode":{$ne:[]}
    //         }
    //     },
    //     {
    //         $unwind:{
    //             path: "$lookedUpEndNode"
    //         }
    //     },
    //     { 
    //         $addFields: { 
    //             foundElements: { $concatArrays: [ "$foundElements", [ {findElementId: edges[0].endElement, elementId: "$lookedUpEndNode._id"} ] ] },
    //             elementIds: { $concatArrays: [ "$elementIds", [ "$lookedUpEndNode._id" ] ] }
    //         } 
    //     },
    //     {// jaliek pasaas beigaas
    //         $group: {
    //             _id: "$diagramId",
    //             elements: {$push: "$$ROOT"}
    //         }
    //     }
    // ];
    // const result = Promise.await(Elements.rawCollection().aggregate(pipeline).toArray());
    // console.dir(result, {depth: null});
    /** @Katrai edge lookupot tās nodes, ja tās vēl nav lookupotas.  
    _.each(edges, (edge) => {
        if(!_.contains(lookedUpNodes, edge.startElement)){
            let lookupObj = {
                $lookup: {
                    from: 'Elements',
                    // let: { startElementTypeId: edge.startElementObj.elementTypeId},
                    pipeline: [
                        {
                            $match:{
                                $expr: {
                                    $and:[
                                        { $eq: ['$_elementTypeId', edge.startElementObj.elementTypeId] },
                                        { $eq: ['$_id', '$$startElement'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'lookedUpStartNode'
                }
            }
            pipeline.push(lookupObj);
            lookedUpNodes.push(edge.startElement);
        }
        if(!_.contains(lookedUpNodes, edge.endElement)){
            let lookupObj = {
                $lookup: {
                    from: 'Elements',
                    // let: { startElementTypeId: edge.startElementObj.elementTypeId},
                    pipeline: [
                        {
                            $match:{
                                $expr: {
                                    $and:[
                                        { $eq: ['$_elementTypeId', edge.endElementObj.elementTypeId] },
                                        { $eq: ['$_id', '$$endElement'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'lookedUpEndNode'
                }
            }
            pipeline.push(lookupObj);
            lookedUpNodes.push(edge.endElement);
        }
    });
    */
    // what is next? can i just join in others? do i have to join each edge first?
}
function findSingleElementMatches(findElement){
    // $lookup can be used for compartments and edge starttype and endType check
    // compartment filtering is not implemented!!
    let elements =   [ findElement ];
    const pipeline = [
        {
            $match: {
                _id: {
                    $ne:findElement._id
                },
                elementTypeId: findElement.elementTypeId
            }
        },
        {
            $group: {
                _id: "$diagramId",
                elements: {$push: "$$ROOT"}
            }
        },
        {
            $lookup: {
                from: "Diagrams",
                localField: "_id",
                foreignField: "_id",
                as: "Diagrams"
            }
        },
        // {
        //     $replaceRoot: {
        //         newRoot: {
        //             $mergeObjects: [
        //                 {
        //                     $arrayElemAt: ["$Diagrams", 0]
        //                 },
        //                 "$$ROOT"
        //             ]
        //         }
        //     }
        // },
        {
            $project: {
                Diagrams :{
                    name:1
                },
                // this is only to make results in console more readable, this needs to be modified or removed lately
                elements: {
                    elementTypeId:1,
                }
            }
        }
    ];
    const result = Promise.await(Elements.rawCollection().aggregate(pipeline).toArray());
    // do not forget about findElement, which is just single element passed as an argument in this function
    console.log("Matches in RDBMS approach, match2 variable");
    console.dir(result, {depth: null});
    
}
/** @pieejas beigas */

function checkQuery(diagramId, diagramTypeId ){ // grafiskā pieprasījuma validācija
    
    let ReplaceLines    = Elements.find({elementTypeId: ReplaceLineType, diagramId: diagramId, diagramTypeId: diagramTypeId}).fetch();
    let ExpressionErrors= [];
    if(_.size(ReplaceLines)){
        let OverLapping = _.some(ReplaceLines, function(ReplaceLine){
            // ja kaut vienas speciālās aizvietošanas līnijas meklējamais un aizvietojošais fragments pārklājas, atgriež true
            let findElement     = Elements.findOne({_id: ReplaceLine.startElement});
            let replaceElement  = Elements.findOne({_id: ReplaceLine.endElement});
            /**@move it to find diags function later */
            // findSingleElementMatches(findElement).then(response => {
            //     groupedByDiagId = [...response];
            // });
            // console.log('returned from find single: ',groupedByDiagId);
            /**@end of call */
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

        if(OverLapping) return false;
        else return ExpressionErrors; 
    } // ja nav pārklājumu, tad atgriež masīvu ar kļūdaino izt. paziņojumiem
}
function checkDuplicates(findResult, findElementsIds){
    // pārbauda, vai matchā ir vienādi findElementId
    let duplicate = {};
    let findElements = _.uniq(_.flatten(_.map(findResult[0].matches, function(match){
        return _.map(match.elements, function(element){
            return element.findElementId;
        })
    })));

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

    return duplicate;
}
function FindDiagMatches(diagParamList){
    console.log("findDiags");
    // meklē matchus 
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
                    let findResult = Meteor.call('findEdge', _.first(Edges), diagParamList.diagramId, diagParamList.userId);
                    // console.log('findResult')
                    // console.log(findResult)
                    findByEdges(startFindElement);
                    let duplicate = checkDuplicates(findResult, findElementIds);
                    if( duplicate.found == false ) findResults.push(findResult);
                    findElementIds = duplicate.findElementsIds;
                } // ja ir atrastas šķautnes, tad meklē pēc šķautnes
                else{
                    let findResult = Meteor.call('findNode', startFindElement, diagParamList.userId);
                    findResults.push(findResult);
                    findSingleElementMatches(startFindElement);

                    // console.log('findResult')
                    // console.dir(findResult, {depth: null})
                } // ja nav, tad meklē pēc virsotnes
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
                
                // tā kā dažu spec līniju fragmenti var būt nesaistīti savā starpā, no šiem nesaistītiem
                // fragmentiem ir jāveido dekarta reizinājuma kopa
                cartesianProductOfMatches       = _.map(cartesianProductOfMatches, function(match){
                    let elements = _.flatten(_.map(match, function(matchItem){
                        // elementu idi katram matcham, lai tos varētu izcelt
                        return _.map(matchItem.elements, function(elementPair){
                            return elementPair.elementId;
                        })
                    }));
                    return {
                        match:          match,
                        status:         'new',
                        id:             generate_id(),
                        projectId:      ProjectId,
                        versionId:      diag.versionId,
                        _id:            diagram,
                        diagramTypeId:  diag.diagramTypeId,
                        elements:       elements,
                        elementCount:   _.size(_.uniq(elements)),
                        editMode:       "findMode",
                    }
                });
                cartesianProductOfMatches = _.sortBy(cartesianProductOfMatches, function(match){ return -match.elementCount});
                let resultObj = {
                    _id:            diagram,
                    name:           _.first(findResults[diagram]).name,
                    matches:        cartesianProductOfMatches,
                    editMode:       "findMode",
                    projectId:      ProjectId,
                    versionId:      diag.versionId,
                    matchCount:     _.size(cartesianProductOfMatches),
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
    else return Meteor.call("findMe", diagParamList); // šeit vienkārši jāizsauc findMe no find.js, ja nav speciāllīniju

}

function FindRelatedEdges(elementId){
    // atlasām saistītās šķautnes
    return RelatedOldNodeEdges = Elements.find({
        $and:
        [
            {$or: [{startElement: elementId},{endElement: elementId}]},
            {elementTypeId: {$ne: ReplaceLineType}}
        ]
    }).fetch();
}
function FindEdgeBySourceAndTarget(soureId, targetId){
    // meklē pēc šķautni pēc sākuma un beigu elementiem
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
    // katru šķautni no aizvietojamā elementa pārkabina uz jaunizveidoto elementu
    if( RelatedOldNodeEdges){
        _.each(RelatedOldNodeEdges, function(edge){// kabinām klāt jaunai virsotnei
            if(edge.startElement == oldElementId){ 
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
        })
    }
}
function deleteOldElementAndCompartments(elementId){
    // dzēšam nost Elementu un tā Compartments
    Compartments.remove({elementId: elementId});
    Elements.remove({_id: elementId});
}
function createCompartments(oldElementsList, newElementId){
    // veido atribūtus jaunizveidotam elementam no aizvietojamiem elementiem
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
                    // console.log("NewElementCompartment: ",NewElementCompartment);
                    if( typeof NewElementCompartment === 'undefined'){// ja vēl nav atribūta ar atrasto atribūta tipu pie jaunā elementa, tad veidojam jaunu atribūtu
                        NewElementCompartment                   = oldElementCompartment;
                        NewElementCompartment._id               = undefined;
                        NewElementCompartment.elementId         = newElementId;
                        NewElementCompartment.elementTypeId     = newElementTypeId;
                        NewElementCompartment.compartmentTypeId = NewElementCompartmentType._id;

                        Compartments.insert(NewElementCompartment);
                        
                    }
                    else console.log('compartment with such type already exists');
                }
                else console.log('Compartment type not found');
            });
        }
    });    
}
function ConcatenateResults(ResultArray){
    // konkatenē iegūtās virknes no izteiksmēm
    return ResultArray.join("");
}
function splitCompartmentvalue(value, parserdArray){
    // sadala iegūto vērtību
    let SplittedCompartment = value.split(parserdArray.delimiter);
    let size = SplittedCompartment.length;
    if(parserdArray.index > size - 1) return "";
    else return SplittedCompartment[parserdArray.index];
}
function findCompartValueBySpecLine(SpecLineName, CompartmentName, startElements, parserdArray = {}, match ){// line.atr
    // meklē elementus pēc speclīnijas, kad atrod, nodod vadību findCompartValueByName funkcijai 
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
    // iegūst vērtību no izteiksmē norādītā atribūta nosaukuma
    let value = "";
    let size = startElements.length;
    startElements = _.map(startElements, function(startElement){
        return _.findWhere(match, {findElementId: startElement}).elementId;
    });
    
    for(let i = 0; i < size; i++){
        let StartElementCompartments = Compartments.find({elementId: startElements[i]}).fetch(); 
        if(StartElementCompartments.length == 0) {
            startElements[i] = _.findWhere(ElementDict, {initial: startElements[i]}).replacedId;
            StartElementCompartments = Compartments.find({elementId: startElements[i]}).fetch();
        }
        let startElemCompSize = StartElementCompartments.length; 
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
    console.log("ResultArray:", ResultArray);
    return ConcatenateResults(ResultArray);
}
/* funkcijas prefiksu un sufiksu iegūšanai*/
function getPrefix(compartmentType){
    return (_.has(compartmentType, "prefix")) ? compartmentType.prefix : "";
}
function getSuffix(compartmentType){
    return (_.has(compartmentType, "suffix")) ? compartmentType.suffix : "";
}
/*  */
function parseCompartmentExpressions(startElements, endElementId, createdEndElementId, match){ 
    // parsē izteiksmes
    let EndElementCompartments = Compartments.find({elementId: endElementId}).fetch();
    console.log("EndElem Cmp ", EndElementCompartments);
    const CompartmentCount = _.size(EndElementCompartments);
   
    if(CompartmentCount){
        _.each(EndElementCompartments, function(EndElemCompartment){
                let parsedResultArray;
                const cmpType = CompartmentTypes.findOne({_id: EndElemCompartment.compartmentTypeId});
                
                if(cmpType.inputType.type == "input" || cmpType.inputType.type == "textarea"){ // pie citiem tipiem būs jāskatās
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
                                projectId:              Elements.findOne({_id: createdEndElementId}).projectId,
                                elementId:              createdEndElementId,
                                diagramId:              Elements.findOne({_id: createdEndElementId}).diagramId,
                                diagramTypeId:          Elements.findOne({_id: createdEndElementId}).diagramTypeId,
                                elementTypeId:          Elements.findOne({_id: createdEndElementId}).elementTypeId,
                                versionId:              Elements.findOne({_id: createdEndElementId}).versionId,
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
    // dzēš šķautnes, kuras ir saistītas ar doto elementu
    let RelatedEdges = FindRelatedEdges(elementId);
    if(!( typeof RelatedEdges === 'undefined')){
        _.each(RelatedEdges, function(relatedEdge){
            deleteOldElementAndCompartments(relatedEdge._id);
        })
    }
}
function createBox(diagToReplaceIn, ReplaceElement, location = undefined){
    // veido elementa objektu
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
    projectId       : Diagrams.findOne({_id: diagToReplaceIn}).projectId,
    versionId       : Diagrams.findOne({_id: diagToReplaceIn}).versionId
    }
}
function createEdge(edge, diagId, startElement, endElement){
    // veido šķautnes objektu
    const StartElement = Elements.findOne({_id:startElement});
    const EndElement   = Elements.findOne({_id: endElement});
    console.log("EndEleemnt ", EndElement);
    console.log("endElement Create edge ", endElement);
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
        projectId       : Diagrams.findOne({_id: diagId}).projectId,
        versionId       : Diagrams.findOne({_id: diagId}).versionId,
    }
}

function pushEdgeNodes(edge){
    // apstaigāšanas daļa
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
    // apstaigāšanas daļa
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
    // atrod dzēšamās šķautnes pieprasījumā, delete edge paterns
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
function ToSwitch(rLine, SwitchToCompartmentType){
    // pārbauda speclīnijas SwitchLinesTo vērtību
    let compartment = Compartments.findOne({elementId: rLine._id, compartmentTypeId: SwitchToCompartmentType});
    console.log(`compartment: ${compartment} rLine._id ${rLine._id} rLine ${rLine} compartmentTypeId ${SwitchToCompartmentType}`)
    if(compartment) return compartment.value == "true";
    else return false;
}
function checkReplaceLinesIntersection(element, replaceLines){
    // pārbauda merge gadījumus, kad papildus speclīnijas, piemēram, izteiksmēm
    let RL_endElem_Not_eq_element = Elements.find({
        $and:[
            {diagramId: element.diagramId},
            {elementTypeId: ReplaceLineType},
            {endElement: {$ne: element._id}}
        ]
    }).fetch();
    
    RL_endElem_Not_eq_element = _.pluck(RL_endElem_Not_eq_element,"startElement");
    let elementReplaceLines = _.uniq(_.pluck(replaceLines,"startElement"));
    return _.size(_.intersection(RL_endElem_Not_eq_element,elementReplaceLines)) > 0;
}
function createNode(
    element,
    endElement,
    endElements,
    box,
    BoxLocation,
    match,
    startElements,
    startFindElements,
    ReplaceLines,
    diagToReplaceIn,
    apstaigatieReplace,
    createdBoxes,
    parsedElements,
    replaceElementsId
){
    // uzrada jaunu elementu
    let NewBox;
    let FoundMatchedElement
    console.log("-----------------------------------------CREATING NEW NODE-----------------------------------------------------------", box.local);
    const SwitchToCompartmentType = CompartmentTypes.findOne({name: "SwitchLinesTo", diagramTypeId: element.diagramTypeId})._id;
    if(box.local == endElement) {
        let boxElementLocationId = _.findWhere(startElements, {findElementId: _.first(ReplaceLines[endElement]).startElement}).elementId;
        
        FoundMatchedElement = Elements.findOne({_id: boxElementLocationId});
        
        if(typeof FoundMatchedElement === 'undefined') {
            boxElementLocationId = _.findWhere(ElementDict, {initial: boxElementLocationId}).replacedId;
            FoundMatchedElement = Elements.findOne({_id: boxElementLocationId});
        }
        BoxLocation = FoundMatchedElement.location;
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
        BoxLocation = FoundMatchedElement.location;
    }
    if(BoxLocation) NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}), BoxLocation);
    else NewBox = createBox(diagToReplaceIn, _.findWhere(apstaigatieReplace, {_id: element._id}));
    _.first(createdBoxes[element._id]).inserted    = Elements.insert(NewBox);
    // console.log("match",match);
    console.log(`box.local: ${box.local} endElements ${endElements}`);

    if(_.contains(endElements, box.local)){
        let relatedStartElements = _.pluck(ReplaceLines[box.local],'startElement');
        relatedStartElements = _.filter(match, function(matchItem){ 
            return _.contains(relatedStartElements, matchItem.findElementId);
        });
        relatedStartElements = _.map(relatedStartElements,function(matchElement){
            let alreadyReplacedWith = _.findWhere(ElementDict, {initial: matchElement.elementId});
            let StillExists = Elements.findOne({_id: matchElement.elementId});
            if(alreadyReplacedWith.replacedId && typeof StillExists === 'undefined') return alreadyReplacedWith.replacedId;
            else return matchElement.elementId;  
        });
        

        _.each(relatedStartElements, function(relatedStartElement){
            // find replace lines between relatedStartelement's findElementId and box.local
            // check SwitchLinesTo attribute value 
            let findElement = _.findWhere(match, {elementId: relatedStartElement});
            if(!findElement){ 
                findElement = _.findWhere(
                    match,
                    {elementId: _.findWhere(ElementDict,{replacedId: relatedStartElement}).initial
                }).findElementId;

            } 
            else findElement = findElement.findElementId;
            
            let replaceLines = _.where(ReplaceLines[box.local], {startElement: findElement});

            const checkRLIntersection = checkReplaceLinesIntersection(element, replaceLines);

            let relatedStartElementToReplace = undefined; 
            if(replaceLines){
               // console.log("replaceLines", replaceLines);
                let toSwitch = _.some(replaceLines, function(rLine){
                    return ToSwitch(rLine,SwitchToCompartmentType);
                });
                if(toSwitch) {
                    const relatedEdges = FindRelatedEdges(relatedStartElement);
                    relatedStartElementToReplace = relatedStartElement;
                    console.log("related Edges", relatedEdges);
                    console.log("relatedStartElement in toSwitch",relatedStartElement);
                    switchEdgesFromOldToNewElement(relatedStartElement, _.first(createdBoxes[element._id]).inserted, relatedEdges);

                    if(getElementTypeId(relatedStartElement) == getElementTypeId(box.local)){
                        let index = ElementDict.findIndex(pair => pair.initial === relatedStartElement);
                        if(typeof ElementDict[index].replacedId === "undefined") ElementDict[index].replacedId = _.first(createdBoxes[element._id]).inserted;
                        else if (_.contains(relatedStartElements, ElementDict[index].initial) ){
                            ElementDict[index].replacedId = _.first(createdBoxes[element._id]).inserted;
                        }
                        else {
                            index = ElementDict.findIndex(pair => pair.initial === ElementDict[index].replacedId);
                            ElementDict[index].replacedId = _.first(createdBoxes[element._id]).inserted;
                        }
                    }

                    createCompartments([relatedStartElement], _.first(createdBoxes[element._id]).inserted);
                    // kopējam atribūtus tikai no tā elementa, kuram atbiltošai replace līnijai atribūts SwitchLinesTo ir ieķeksēts 
                }
                else{
                    let ToSwitchRL = _.filter(ReplaceLines[box.local], function(RL){
                        return ToSwitch(RL, SwitchToCompartmentType);
                    });
                    if(_.size(ToSwitchRL) > 0){
                        let ReplaceElement = _.findWhere(ElementDict,{
                            initial: _.findWhere(match, {findElementId: _.first(ToSwitchRL).startElement}).elementId
                        });
                        if(_.contains(relatedStartElements,ReplaceElement.initial))relatedStartElementToReplace = ReplaceElement.initial;
                        else relatedStartElementToReplace = ReplaceElement.replacedId;
                    }
                    else{
                        if(!checkRLIntersection){
                            if(getElementTypeId(relatedStartElement) == getElementTypeId(box.local)){
                                let index = ElementDict.findIndex(pair => pair.initial === relatedStartElement);
                                if(typeof ElementDict[index].replacedId === "undefined") ElementDict[index].replacedId = _.first(createdBoxes[element._id]).inserted;
                                else{
                                    let nIndex = ElementDict.findIndex(pair => pair.initial === ElementDict[index].replacedId);
                                    if(nIndex == -1) ElementDict[index].replacedId = _.first(createdBoxes[element._id]).inserted;
                                    else ElementDict[nIndex].replacedId = _.first(createdBoxes[element._id]).inserted;
                                }   
                            }
                        }
                    }
                }
            }
            // ja ir merge gadījums ar papildus speclīnijām, tad dzēš tikai ieķeksēta SwitchLinesTo atribūta atbilstošo elementu
            if( checkRLIntersection && 
                relatedStartElementToReplace ) replaceElementsId.push(relatedStartElementToReplace);
            else replaceElementsId.push(relatedStartElement); 
        });
    }

    if(!_.contains(parsedElements, box.local)) {
        parseCompartmentExpressions(startFindElements, box.local, box.inserted, match);
        parsedElements.push(box.local);
    }
    return {
        createdBoxes: createdBoxes,
        box: box,
        parsedElements: parsedElements,
        replaceElementsId: replaceElementsId
    }
}

function replaceStruct(match){
    if(match){
        
        let FindDiagram     = Elements.findOne({_id: _.first(match).findElementId}).diagramId;
        let ReplaceLines    = Elements.find({elementTypeId: ReplaceLineType, diagramId: FindDiagram}).fetch();
        
        let LinesToDelete   = FindLinesToDelete(ReplaceLines,match); // atrodam līnijas, kuras jādzēš
        ReplaceLines        = _.groupBy(ReplaceLines,'endElement');
        let endElements     = _.keys(ReplaceLines);
        let diagToReplaceIn = Elements.findOne({_id: _.first(match).elementId}).diagramId;
        let InsertedTracker = [];
        let parsedElements  = [];
        let replaceElementsId   = [];

        _.each(LinesToDelete, function(line){ deleteOldElementAndCompartments(line) });
        
        _.each(endElements, function(endElement){
            _.each(ReplaceLines[endElement], function(replaceline){
                if(getElementTypeId(endElement) == getElementTypeId(replaceline.startElement)) {
                    // aizpilda ElementDict vārdnīcu
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
                
                InsertedTracker = _.compact(InsertedTracker);
                createdBoxes = _.map(createdBoxes, function(box){
                    let insertedBox = _.findWhere(InsertedTracker, {localId: box._id});
                    if(typeof insertedBox === 'undefined') //return {local: box._id, inserted: undefined}
                     {
                        if(_.contains(endElements, box._id)){
                            let boxStartFindElements = _.pluck(ReplaceLines[box._id], 'startElement');
                            let boxStartElements = _.filter(match, function(element){ return _.contains(boxStartFindElements, element.findElementId)});
                            boxStartElements = _.pluck(boxStartElements, "elementId");
                            
                            boxStartElements = _.filter(boxStartElements, function(element){ 
                                // filtrējam sākuma elementus pēc tā vai to tips ir vienāds ar endElement
                                let FoundElement = Elements.findOne({_id: element});
                                if(typeof FoundElement !== 'undefined') return FoundElement.elementTypeId == box.elementTypeId;
                                else {
                                    FoundElement = _.findWhere(ElementDict, {initial: element}).replacedId;
                                    return getElementTypeId(FoundElement) == box.elementTypeId;
                                }
                            });
                            if( _.size(boxStartElements) > 0) {
                                let ElementDictItem = _.findWhere(ElementDict, {initial: _.first(boxStartElements)});
                                
                                return {local: box._id, inserted: ElementDictItem.replacedId}
                            }
                            else return {local: box._id, inserted: undefined}
                        }
                        else return {local: box._id, inserted: undefined}
                    }
                    
                    else return {local: box._id, inserted: insertedBox.inserted}
                
                });
                createdBoxes = _.groupBy(createdBoxes, 'local');
                // palīgkonteiners, lai pieglabāt jau ievietotās virsotnes
                
                let apstaigatieReplaceId = _.pluck(apstaigatieReplace,'_id');
                _.each(apstaigatieReplace, function(element){
                    if( !_.has(element,"visited")){ 
                        // visited īpašības nav tikai šķautnēm konteinerā apastaigatieReplace, veido startElement un endElement
                        let start = _.first(createdBoxes[element.startElement]);
                        let end   = _.first(createdBoxes[element.endElement]);
                        let StartLocation = undefined;
                        let EndLocation = undefined;
                        
                        if(typeof start.inserted === 'undefined'){
                            let obj = createNode(
                                element,
                                endElement,
                                endElements,
                                start,
                                StartLocation,
                                match,
                                startElements,
                                startFindElements,
                                ReplaceLines,
                                diagToReplaceIn,
                                apstaigatieReplace,
                                createdBoxes,
                                parsedElements,
                                replaceElementsId
                                );
                            createdBoxes        = obj.createdBoxes;
                            start               = obj.box;
                            replaceElementsId   = obj.replaceElementsId;
                            parsedElements      = obj.parsedElements;
                        }
                        else {
                            console.log('found start eleemnt');
                        }
                        if(typeof end.inserted === 'undefined'){
                            let obj = createNode(
                                element,
                                endElement,
                                endElements,
                                end,
                                EndLocation,
                                match,
                                startElements,
                                startFindElements,
                                ReplaceLines,
                                diagToReplaceIn,
                                apstaigatieReplace,
                                createdBoxes,
                                parsedElements,
                                replaceElementsId
                                );
                            createdBoxes        = obj.createdBoxes;
                            end                 = obj.box;
                            replaceElementsId   = obj.replaceElementsId;
                            parsedElements      = obj.parsedElements;
                        }
                        else{
                           console.log('found end eleemnt');
                        }
                        if( !FindEdgeBySourceAndTarget(start.inserted, end.inserted) ){ 
                            // pārbaudām, vai šķautne netika izveidota iepriekšējās iterācijās
                            let newEdge = createEdge(element, diagToReplaceIn, start.inserted, end.inserted);
                            let NewEdgeId = Elements.insert(newEdge);
                            if(!_.contains(parsedElements, element._id)) {
                                parseCompartmentExpressions(startFindElements, element._id, NewEdgeId, match);
                                parsedElements.push(element._id);
                            }
                        }
                    }
                    else { // ja visited īpašība ir, vedojam šo pašu virsotni
                        
                        let box = _.first(createdBoxes[element._id]);
                        let BoxLocation = undefined;
                        if(typeof box.inserted === 'undefined'){
                            
                            let obj = createNode(
                                element,
                                endElement,
                                endElements,
                                box,
                                BoxLocation,
                                match,
                                startElements,
                                startFindElements,
                                ReplaceLines,
                                diagToReplaceIn,
                                apstaigatieReplace,
                                createdBoxes,
                                parsedElements,
                                replaceElementsId
                                );
                            createdBoxes        = obj.createdBoxes;
                            box                 = obj.box;
                            replaceElementsId   = obj.replaceElementsId;
                            parsedElements      = obj.parsedElements;
                        }
                        
                    }
                });
                
                InsertedTracker = _.map(apstaigatieReplace, function(apstaigatais){
                    if(createdBoxes[apstaigatais._id]){
                        return {localId: apstaigatais._id, inserted: _.first(createdBoxes[apstaigatais._id]).inserted}
                    }
                });
                InsertedTracker = _.compact(InsertedTracker);
                
                let createdEndElement = _.first(createdBoxes[FirstReplaceElement._id]).inserted;

                if(!_.contains(parsedElements, endElement)) {
                    parseCompartmentExpressions(startFindElements,endElement ,createdEndElement,match);
                    parsedElements.push(endElement);
                }
                
            }
            if(endElementTypeId == DeleteBoxType){
                // ja speclīnijas beigās ir speciālais dzēšanas elements, tad aizvietošanas vietā ir dzēšana
                let DeleteFindElements  = _.pluck(ReplaceLines[endElement], 'startElement');
                let DeleteElements      = _.filter(match, function(element){ return _.contains(DeleteFindElements, element.findElementId)});
                _.each(DeleteElements, function(de){
                    const DeleteElement = Elements.findOne({_id: de.elementId});
                    if(DeleteElement){
                        replaceElementsId.push(DeleteElement._id);
                    }
                });
            }
        });
        if(_.size(replaceElementsId) > 0){
            replaceElementsId = _.uniq(replaceElementsId);
            console.log("replaceElementsId", replaceElementsId);
            _.each(replaceElementsId, function(element){ deleteOldElementAndCompartments(element)}); // dzēšam vecos elementus
        }
    }
    else console.log('match not found/undefined')
}
function formatMatch(match){
    // pārveido match struktūru pirms aizvietošanas
    let FormatedMatch = _.flatten(_.map(match.match, function(MatchItem){
        return _.map(MatchItem.elements, function(elementPair){
            return elementPair;
        })
    }));
    
    return FormatedMatch;
}
function markConflictingMatches(matches, elementsToLookup) { 
    // marķē konfliktējošos matchus pēc kārtējās aizvietošanas
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
                foundConflictingMatch = _.size(ElementsToLookup) != _.size(foundElements); 
                // ja vārdnīca ElementDict, tad marķēšanas semantika mainās

            }
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
        // atjauno diagramas izkārtojumu
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
        // console.timeEnd("updateLayoutTimer");
    },
    checkDiagramExistance(diagramId){
        const diagram = Diagrams.findOne({_id: diagramId})
        if(!diagram) return false;
        else return true;
    },
})