var apstaigatieFind;
var apstaigatieReplace;
var FindReplaceLineType;
var findResults;
var foundDiagsId;

function getStartElem(diagParamList, mode){// iegūstam starta elementu Find vai replace grafam, atkarīgi no mode
    var elementToFind;
        BoxTypeId       = ElementTypes.findOne({name: "CommentBox"})._id;  // iegūstam komentārbloku tipa id (jābūt TNwkqh6ogu3D4Nb5p)
        DiagramBoxes    = Elements.find({diagramId: diagParamList.diagramId, elementTypeId: BoxTypeId}).fetch();
        // papildinām katru komentārkastes objektu ar īpašību value (no compartments dokumenta)
        CompartmentType = CompartmentTypes.findOne({name: "Type",elementTypeId: BoxTypeId})._id; // atrodam vajadzīgo compartment tipu komentārbokšiem
        DiagramBoxes.forEach(item => {
            _.extend(item,{
                value: Compartments.findOne({
                    elementId: item._id, 
                    elementTypeId: item.elementTypeId,
                    diagramId: diagParamList.diagramId,
                    compartmentTypeId: CompartmentType})
                    .value
            });
        });
        FindReplaceLineType = ElementTypes.findOne({name: "FindReplaceType"})._id; // speciāllīnijas tipa id
        SpecialLines        = Elements.find({diagramId: diagParamList.diagramId, elementTypeId: FindReplaceLineType}).fetch(); // iegūstam līniju masīvu
    switch (mode){
        case "F":
            SpecialLines.forEach(item =>{
                Box = _.findWhere(DiagramBoxes,{_id: item.endElement}); // katrai speclīnijai meklējam kasti, uz kuru norāda endElement lauks
                if(Box.value == "Find"){
                    elementToFind       = Elements.findOne({_id: item.startElement});
                }
            });
            break;    
        case "R":
            SpecialLines.forEach(item =>{
                Box = _.findWhere(DiagramBoxes,{_id: item.endElement}); // katrai speclīnijai meklējam kasti, uz kuru norāda endElement lauks
                if(Box.value == "Replace"){
                    elementToFind       = Elements.findOne({_id: item.startElement});
                }
            });
            break;
        default:
            break;
    }
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
            {elementTypeId: {$ne: FindReplaceLineType}}// šeit jāpievieno arī replace speciāllīnijas tips
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
}/*
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
}*/
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
}
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
        /* Kad ir piedabūta pirmā rezultātu kopa ar diagrammu idiem, katrai diagrammai apstaigājam meklējamo fragmentu
           Katrā diagrammā sākam no pirmās atrastās šķautnes, atrodam visas šķautnes meklējamā fragmentā, kas ir piesaistītas dotās šķautnes
           galiem, atceroties vai nu tas bija start vai end, mēģinām atrast kārtējā diagrammā attiecīgās šķautnes, balstoties uz to, kādam galam jābūt
           tipam un papildus jāpārbauda constraints. ja kādā no soļiem neizdodas kaut ko artrast, filtrējam nost doto diagrammu un ejam pie nākošās 
        */
       findResults = Meteor.call('findEdge', Edges, diagId);
       // console.dir(findResults, { depth: null });
       /*
        foundEdges      = findEdges(_.first(Edges),true);// meklējam pirmo rezultātu kopu, lai sašaurināt meklēšanas diapazonu
        foundDiagsId    = _.uniq(_.pluck(foundEdges,'diagramId'));
        foundDiagsId    = _.filter(foundDiagsId, function(diagramId){
            return  FindMatchForDiagram(diagramId, Edges);
        })
        console.log('Found diags names:');
        _.each(foundDiagsId, function(diagId){
            let name = Diagrams.findOne({_id: diagId}).name;
            console.log(name);
        }) */
    }
}
function TraverseDiag(diagParamList){
    apstaigatieFind     = [];
    apstaigatieReplace  = [];
    StartFindElem       = getStartElem(diagParamList, "F");   // F - atrodam Find starta elementu
    StartReplaceElem    = getStartElem(diagParamList, "R");// R - atrodam Replace starta elementu
    _.extend(StartFindElem,{visited: false});
    apstaigatieFind.push(StartFindElem);
    var foundElem = getNotVisitedItems();
    while(foundElem){
        foundElem = getNotVisitedItems();
    }
    FindDiags(diagParamList.diagramId);
    return createJsonResult(findResults);
}
Meteor.methods({
    findDiags: function(diagParamList){
        console.log(`Diagram id: ${diagParamList.diagramId}`);
        return TraverseDiag(diagParamList);
    }
})