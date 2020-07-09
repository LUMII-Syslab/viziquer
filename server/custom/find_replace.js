var apstaigatieFind;
var FindLineType;
var ReplaceLineType;
var findResults;
var foundDiagsId;

function getStartElem(diagParamList, diagramType){// iegūstam starta elementu Find vai replace grafam, atkarīgi no mode
    var elementToFind;
        CommentBoxType  = ElementTypes.findOne({name:"CommentBox",diagramTypeId: diagramType})._id;
        // iegūstam komentārbloku tipa id 
        DiagramBox      = Elements.findOne({diagramId: diagParamList.diagramId, elementTypeId: CommentBoxType});
        // papildinām katru komentārkastes objektu ar īpašību value (no compartments dokumenta)
        CompartmentType = CompartmentTypes.findOne({name: "Type",elementTypeId: CommentBoxType})._id; // atrodam vajadzīgo compartment tipu komentārbokšiem
            _.extend(DiagramBox,{
                value: Compartments.findOne({
                    elementId: DiagramBox._id, 
                    elementTypeId: DiagramBox.elementTypeId,
                    diagramId: diagParamList.diagramId,
                    compartmentTypeId: CompartmentType})
                    .value
            });
        FindLineType = ElementTypes.findOne({name: "FindLine", diagramTypeId: diagramType})._id; // speciāllīnijas tipa id
        ReplaceLineType = ElementTypes.findOne({name: "FindReplaceLink", diagramTypeId: diagramType})._id;// ja tādas speciāllīnijas definīcijā nav, tad metīs kļūdu
        SpecialLines        = Elements.find({diagramId: diagParamList.diagramId, elementTypeId: FindLineType}).fetch(); // iegūstam līniju masīvu
        SpecialLines.forEach(item =>{
            if(DiagramBox.value == "Find"){
                elementToFind       = Elements.findOne({_id: item.startElement});
            }
            else console.log('not found such box')
        });
            
    return elementToFind;
}
function getElementType(_elemTypeId){
    return ElementTypes.findOne({_id: _elemTypeId}).type;
}
function getRelatedEdges(_boxId){// pluck edge idus
    let Elem_edges = _.pluck(apstaigatieFind,'_id');
    return relatedEdges = Elements.find({
        $and:
        [
            {$or: [ {startElement:_boxId}, {endElement: _boxId} ]},
            {_id: {$nin: Elem_edges}},
            {elementTypeId: {$nin: [FindLineType,ReplaceLineType]}}// šeit jāpievieno arī replace speciāllīnijas tips
        ]
    });
}
function pushEdgeNodes(edge){
    FindSource = _.findWhere(apstaigatieFind,{_id: edge.startElement});
    FindTarget = _.findWhere(apstaigatieFind,{_id: edge.endElement});
    if( typeof FindSource === 'undefined'){
        source = Elements.findOne({_id: edge.startElement});
        _.extend(source,{visited: false});
        apstaigatieFind.push(source);
    }
    if( typeof FindTarget === 'undefined'){
        target = Elements.findOne({_id: edge.endElement});
        _.extend(target,{visited: false});
        apstaigatieFind.push(target);
    }
}

function getNotVisitedItems(){// šeit parametrā var ielikt mode parametru, lai varētu ievākt gan Find, gan Replace grafus pēc vajadzības
    var RelatedEdges;
    var notVisitedElementBox;
    
    notVisitedElementBox = _.findWhere(apstaigatieFind,{visited: false});
    if(notVisitedElementBox){
        notVisitedElementBox.visited = true;
        RelatedEdges = getRelatedEdges(notVisitedElementBox._id);
        RelatedEdges.forEach(e=>{
            pushEdgeNodes(e);
            apstaigatieFind.push(e);
        });
        return true;
    }
    else return false;
}
/*
function findConstraintsForElem(elem){
    return Compartments.find({ elementId: elem._id }).fetch().map(
		function (e) {
			ct=CompartmentTypes.findOne({_id: e.compartmentTypeId}); 
			reg = ".*";
			if (ct.inputType.inputType == "text") {reg = ".*"+e.input+".*"}
			else if (ct.inputType.inputType == "number") {reg = "^" + e.input+"$"}
			else {reg = ".*"}
			return {
				compartmentId: e._id, 
				input: e.input,
				regExpression: reg,
				compartmentTypeId: ct._id, 
				inputType: ct.inputType.inputType, 
				controlType: ct.inputType.type}});
}
function checkRegExConstraintForElement(_Constraint,_Element){
    let compartment = Compartments.find(
        {
            input: {$regex: _Constraint.regExpression},
            elementId: _Element._id,
            compartmentTypeId: _Constraint.compartmentTypeId
        }
    ).fetch();
    if( _.size(compartment) == 1) return true;
    else return false;
}
function checkConstraintsForElementList(_element, _foundElementList){
    var foundList = _foundElementList;
    var elementConstraints = findConstraintsForElem(_element);

    _.each(elementConstraints, function(constraint){
        if(foundList != null && _.size(foundList) > 0){
            foundList = _.filter(foundList, function(foundListItem){return checkRegExConstraintForElement(constraint,foundListItem)})
        }
        else return null;
    });
    return foundList;
}
function checkConstraintsForElem(constraints, _foundElement)
{

	var result = true;
	//ja kāds nosacījums neizpildās tālāk baudīt nav jēgas, tad jālec āra no cikla
	//find iterē pa kolekciju līdz pirmajam, kas der, tapēc, ja nemačojas atgriežam true, 
	//lai find beigtu izpildi, bet res uzstādam false, jo elementam kāds no constraints neizpildās
	_.find(constraints, function(c) {
		if (checkRegExConstraintForElement(c, _foundElement))
		{
			return false;
		}
		else
		{
			result = false;
			return true;
		}
	})
	return result;
}
function pushFindResult(Node, foundNodesWithConstraints){ // skat processVisitedNode
    var FindElement = {FindElement: Node, MatchedElements: foundNodesWithConstraints} // vai nepieciešama tieši šāda struktūra ?
    
    if (findResults) findResults.push(FindElement);
    else findResults = [FindElement];
}
function findNode(Node){
    var foundNodes = Elements.find(
        {
            elementTypeId: Node.elementTypeId,
            diagramId: {$ne: Node.diagramId}
        },
        {
            fields: {diagramId:1}
        }
    ).fetch();
    if(!foundNodes) return;
    foundNodesWithConstraints = checkConstraintsForElementList(Node,foundNodes);

    if( typeof foundNodesWithConstraints === 'undefined'){ console.log('No results has been found (undefined)'); return; }
    else pushFindResult(Node,foundNodesWithConstraints);
}
function findEdgesWithConstraints(_edge, _edges, foundDiagsId){
    _edges          = checkConstraintsForElementList(_edge, _edges);
    StartFindElem   = Elements.findOne({_id: _edge.startElement});
    EndFindElement  = Elements.findOne({_id: _edge.endElement});
    startType       = StartFindElem.elementTypeId;
    endType         = EndFindElement.elementTypeId;
    startConstraints= findConstraintsForElem(StartFindElem);
    endConstraints  = findConstraintsForElem(EndFindElement);

    return edgesWithConstraints = _.filter(_edges,
        function(edge){
            start = Elements.findOne({_id: edge.startElement})
            end   = Elements.findOne({_id: edge.endElement})
            if( start.elementTypeId == startType && end.elementTypeId == endType){
                return ( checkConstraintsForElem(startConstraints,start) && 
                checkConstraintsForElem(endConstraints,end)) // vai nav jāpārbauda arī pašas šķautnes constraints ??
            }
            else return false
        });
}
function findEdges(edge, first = false){// egde ir meklējamā šķautne
    if (first){// pirmai rezultātu kopai
        let edges       = Elements.find(
            {elementTypeId: edge.elementTypeId, diagramId: {$ne: edge.diagramId}},
            {fields: {startElement:1, endElement:1, diagramId: 1}}).fetch();
        if(edges || _.size(edges) > 0){
            return findEdgesWithConstraints(edge, edges, foundDiagsId);
        }
        else return [];
    }
    else{// katrai nākamajai rezultātu kopai
        let edges = Elements.find(
            {elementTypeId: edge.elementTypeId, diagramId: {$in: foundDiagsId}},
            {fields: {startElement:1, endElement:1, diagramId: 1}}).fetch();
        if(edges || _.size(edges) > 0){
            return findEdgesWithConstraints(edge, edges, foundDiagsId);
        }
        else return [];
    }
}
function checkRelatedEdges(RelatedEdges, currentFindEdge, diagId, mode){ // funkcija mēģina meklēt dotajā diagrammā kārtējās saistītās šķautnes
    let currentFoundEdges = Elements.find({
        diagramId: diagId, 
        elementTypeId: currentFindEdge.elementTypeId
    }).fetch();
    if(currentFoundEdges || _.size(currentFoundEdges) > 0) currentFoundEdges = findEdgesWithConstraints(currentFindEdge,currentFoundEdges,foundDiagsId);
    else return false;

    if(currentFoundEdges){
        if(mode == 'source'){
            let foundRelatedEdges = []; // kaut kā jāvar ielikt findResults, lai pēc tam korekti saskaitīt fragmentus
            let found = [];
            _.each(currentFoundEdges, function(foundEdge){
                
                found.push(_.every(RelatedEdges, function(RE){
                    let RelatedFound = Elements.findOne({
                        $and:
                        [
                            {elementTypeId: RE.elementTypeId},
                            {diagramId: diagId},
                            {$or: [{startElement: foundEdge.startElement}, {endElement: foundEdge.startElement}]}
                        ]
                    })
                    if( !RelatedFound) { return false;}
                    else { foundRelatedEdges.push(RelatedFound); return true;}
                }))
            })
            if(_.some(found)) return true;
            else return false;
        }
        else if(mode == 'target'){
            let foundRelatedEdges = [];
            let found = [];
            _.each(currentFoundEdges, function(foundEdge){
                
                found.push(_.every(RelatedEdges, function(RE){
                    let RelatedFound = Elements.findOne({
                        $and:
                        [
                            {elementTypeId: RE.elementTypeId},
                            {diagramId: diagId},
                            {$or: [{startElement: foundEdge.endElement}, {endElement: foundEdge.endElement}]}
                        ]
                    })
                    if( !RelatedFound) { return false;}
                    else { foundRelatedEdges.push(RelatedFound); return true;}
                }))
            })
            if(_.some(found)) return true;
            else return false;
        }
        else console.log('Incorrect mode');
    }
    else return false;
}
function FindMatchForDiagram(_diagId, _findEdges){
    let currentFindEdge = _.findWhere(_findEdges,{visited: false}); // dotā meklējamā šķautne
    while(currentFindEdge){
        currentFindEdge.visited = true; 
        let RelatedFindSourceEdges = _.filter(_findEdges, function(RelSourceEdge){ // šķautnes, kas ir savienotas ar dotās škautnes startElement
            return ((RelSourceEdge.endElement == currentFindEdge.startElement || RelSourceEdge.startElement == currentFindEdge.startElement)
            && RelSourceEdge._id != currentFindEdge._id);
        });
        let RelatedFindTargetEdges = _.filter(_findEdges, function(RelTargetEdge){ // šķautnes, kas ir savienotas ar dotās škautnes endElement
            return ((RelTargetEdge.endElement == currentFindEdge.endElement || RelTargetEdge.startElement == currentFindEdge.endElement)
            && RelTargetEdge._id != currentFindEdge._id); 
        });
        if( !RelatedFindSourceEdges && !RelatedFindTargetEdges){ // ja dotai šķautnei nav saistīto šķautņu(piemēram tā ir viena pati)
            let edges = Elements.find({elementTypeId: currentFindEdge.elementTypeId, diagramId: _diagId}).fetch();
            if( findEdgesWithConstraints(currentFindEdge, edges, foundDiagsId)) { _findEdges.forEach(e => {e.visited = false}); return true;}
            else { _findEdges.forEach(e => {e.visited = false}); return false;} // šeit var pieglabāt arī atrasto fragmentu skaitu, kā to darīt lielākam fragmentam?
        }
        else if (RelatedFindSourceEdges){
            if(RelatedFindTargetEdges){
                if( !checkRelatedEdges(RelatedFindSourceEdges,currentFindEdge, _diagId,'source') 
                || !checkRelatedEdges(RelatedFindTargetEdges,currentFindEdge, _diagId, 'target') ) { _findEdges.forEach(e => {e.visited = false}); return false;}
            }
            else { if( !checkRelatedEdges(RelatedFindSourceEdges,currentFindEdge, _diagId,'source') ) { _findEdges.forEach(e => {e.visited = false}); return false;} }
        }
        else if (RelatedFindTargetEdges){
            if( !checkRelatedEdges(RelatedFindTargetEdges,currentFindEdge, _diagId, 'target') ) { _findEdges.forEach(e => {e.visited = false}); return false;}
        }
        currentFindEdge = _.findWhere(_findEdges, {visited:false});// neaizmirsti uzstādīt visām šķautnēm visited false, lai būtu iespējams atkārtot nākamām diagrammām
    }
    _findEdges.forEach(e => {e.visited = false}); 
    return true;
}*/
function createJsonResult(res){
    _.each(res, function(diag){
        _.extend(diag, {name: Diagrams.findOne({_id: diag.diagramId}).name})
    })
    return res;
}
function FindDiags(diagId){
    if( apstaigatieFind.length == 0) console.log('tukšs grafs');
    else if (apstaigatieFind.length == 1){// jāmeklē tikai viens elements, virsotne
        findResults = Meteor.call('findNode', _.first(apstaigatieFind));
        
        console.dir(findResults, { depth: null });
    } 
    else{
        let Edges = _.filter(apstaigatieFind,function(element){
            return !_.has(element, 'visited');
        });
        _.each(Edges,function(e){_.extend(e,{visited: false})})
        
       findResults = Meteor.call('findEdge', Edges, diagId);
       
    }
}
function TraverseDiag(diagParamList){
    apstaigatieFind     = [];
    diagramTypeId       = Diagrams.findOne({_id:diagParamList.diagramId}).diagramTypeId;
    StartFindElem       = getStartElem(diagParamList, diagramTypeId);   // F - atrodam Find starta elementu

    _.extend(StartFindElem,{visited: false});
    apstaigatieFind.push(StartFindElem);
    var foundElem = getNotVisitedItems();
    while(foundElem){
        foundElem = getNotVisitedItems();
    }
    FindDiags(diagParamList.diagramId);
    return createJsonResult(findResults);
}
/** Aizvietošanas funkcijas **/
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
    location        : ReplaceElement.location,
    projectId       : ReplaceElement.projectId,
    versionId       : ReplaceElement.versionId
    }
    let id          = Elements.insert(NewReplaceElement);
    let testElem    = Elements.findOne({_id: id});
    let RelatedOldNodeEdges = Elements.find({
        $and:
        [
            {$or: [{startElement: matchElements.elementId},{endElement: matchElements.elementId}]}
        ]
    }).fetch();// atlasām saistītās šķautnes
    console.log('Related edges', RelatedOldNodeEdges)
    if( RelatedOldNodeEdges){
        _.each(RelatedOldNodeEdges, function(edge){// kabinām klāt jaunai virsotnei
            if(edge.startElement == matchElements.elementId){ // exception handling???
                Elements.update(
                    {_id: edge._id},
                    {$set: {startElement: id}}
                    )
            }
            else if(edge.endElement == matchElements.elementId){
                Elements.update(
                    {_id: edge._id},
                    {$set: {endElement: id}}
                    )
            }
        })
    }
    
    console.log('Compartments deletion', Compartments.remove({elementId: matchElements.elementId}));
    console.log('Element deletion', Elements.remove({_id: matchElements.elementId}));
    console.log('new replace element',testElem);
    
}
Meteor.methods({
    findDiags: function(diagParamList){
        console.log(`Diagram id: ${diagParamList.diagramId}`);
        return TraverseDiag(diagParamList);
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