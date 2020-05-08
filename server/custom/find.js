//array of visited Element Id 
var apstaigatie;
var findResults;
var atrastasSkeles;
var constraintViolation;

function createJsonFromDiagIds(diagramidsAAA, list)
{
	diagramids = diagramidsAAA.result;
	console.log("createJsonFromDiagIds", diagramids, diagramidsAAA.potentialDiagIds);
	var aka = _.uniq(_.pluck(diagramids, "diagramId")).map(
			function (c) { 
				var diag = Diagrams.findOne({"_id": c});
				var diagElems = _.filter(diagramids, function (a) {return a.diagramId==c});
				var projectId = Versions.findOne({"_id": diag.versionId}).projectId;
				var diagElemIds = diagElems.map(function (c) { return c._id;})
				return {
					_id: c,
					name: diag.name,
					typeId : diag.diagramTypeId,
					elemCount: _.size(diagElems),
					projectId: projectId,
					versionId: diag.versionId,
					diagramTypeId: diag.diagramTypeId,
					diagram: c,
					path: "http://localhost:3000/project/" + projectId + "/diagram/"+c+"/type/"+diag.diagramTypeId+"/version/" + diag.versionId+"/findMode",
					elements: diagElemIds,
					editMode: "findMode"
				}
			}
		);
		var groups = _.groupBy(constraintViolation, function(c) { return c.compartmentId + '#' + c.regExpression;});
		
		var constraintsGrouped = _.map(groups, function(group){
			return {
				compartmentId: group[0].compartmentId,
				regExpression: group[0].regExpression,
				count:  _.size(group),
				diagrams: _.pluck(group, '_diagramId')
			}
		});

	return {result: aka, potentialDiagIds: diagramidsAAA.potentialDiagIds, violatedConstraints: constraintsGrouped}
};

function findByEdgeType(list)
{
	return edgeswithSourceTargetTypes = _.filter(
		Elements.find({ elementTypeId: list.edgeTypeId }, { fields: { diagramId: 1, startElement: 1, endElement: 1 } }).fetch(), 
		function (e){
			var start = Elements.findOne({_id: e.startElement});
			currentSourceElemType = start.elementTypeId;
			if (currentSourceElemType == list.sourceNodeTypeId) 
				{
					currentTargetElemType = Elements.findOne({_id: e.endElement}).elementTypeId;
					return (currentTargetElemType == list.targetNodeTypeId)
				}
			else
			return false;
	});
};

///NO .NET
function getNotVisitedEdge (_diagramId, _visitedElements)
{
//	diagramId  - findDiagram Id 
//  visitedElements -  list of Ids of visited find diagram Elements
// return notvisitedEdge or null
	return Elements.findOne({$and:
			[
			{diagramId: _diagramId},
			{type: "Line"},
			{_id: {$nin: _visitedElements }}
			]
			}); 
}

function getNotVisitedEdgeListForNode(_node)
{
	return allEdges = Elements.find(
		{$and:
			[
				{$or: [{startElement: _node._id}, {endElement: _node._id} ]},
				{_id: {$nin: apstaigatie}}
			]
		})
	

}

function getNotVisitedNode (_diagramId, _visitedElements)
{
//	diagramId  - findDiagram Id 
//  visitedElements -  list of Ids of visited find diagram Elements
// return notvisitedEdge or null
		return _.find(
			Elements.find({ diagramId: _diagramId }).fetch(),
			function (e) 
				{  return e.type=="Box" && !_.contains(_visitedElements, e._id)});
}

function edgeListToSourceNodeList (_edgeList)
{
   return _edgeList.map(
	   function(e) 
   			{ return Elements.findOne({_id: e.startElement});})

}

function edgeListToTargetNodeList (_edgeList)
{
   return _edgeList.map(
	   function(e) 
   			{ return Elements.findOne({_id: e.endElement});})

}

function findOutgoingEdgesWithType(_elementId, _elementTypeId)
{
	return Elements.find({"startElement" : _elementId, "elementTypeId": _elementTypeId}).fetch();
}

function findIncomingEdgesWithType(_elementId, _elementTypeId)
{
	return Elements.find({"endElement" : _elementId, "elementTypeId": _elementTypeId}).fetch();
}

function findEdge (_findEdge, _findDiagramId)
{
	var edgeswithType =Elements.find(
			{elementTypeId: _findEdge.elementTypeId, diagramId: {$ne: _findDiagramId}},
			{fields: {diagramId:1, startElement:1, endElement:1}}).fetch();
	
	if (edgeswithType || edgeswithType.length > 0)
	{
		//parbauda vai šķautņu nosacījumi izpildās
		edgeswithType = checkConstraintsForElementList(_findEdge, edgeswithType);

		sourceFindElem = Elements.findOne({_id: _findEdge.startElement});
	    targetFindElem = Elements.findOne({_id: _findEdge.endElement});
     	sourcetype = sourceFindElem.elementTypeId;
		targettype = targetFindElem.elementTypeId;
		sourceConstraints = findConstraintsForElement(sourceFindElem);
		targetConstraints = findConstraintsForElement(targetFindElem);
		//filtrē pēc tipiem
		edgesWithSourceTargetType = _.filter(edgeswithType,
			function(e) 
			{
				source = Elements.findOne({_id: e.startElement});
				target = Elements.findOne({_id: e.endElement});
				if (source.elementTypeId == sourcetype && target.elementTypeId==targettype)
				{
					return (checkConstraintsForElement(sourceConstraints, source) && 
						checkConstraintsForElement(targetConstraints, target))
				}
				else
				{
					return false;
				}
			})
			//edge, kam korekti source target virsotņu tipi
		processVisitedEdge(_findEdge, edgesWithSourceTargetType, sourceFindElem, targetFindElem);
		slice = createSlice(_findEdge, edgesWithSourceTargetType);
		slice = sliceKeyByIndex(slice, 1);
		slice = processRelatedNode(sourceFindElem, _findDiagramId, slice);
		slice = sliceKeyByIndex(slice, 2);	
		return processRelatedNode(targetFindElem, _findDiagramId, slice);
	}
	else
	{
		return [];
	}

}

function processRelatedNode(_visitedNode, _findDiagramId, _slice)
{
	var edges =  getNotVisitedEdgeListForNode(_visitedNode).fetch();
	edges.forEach(e => {
		_slice = processRelatedEdge(e, _findDiagramId, _slice)
	});
	return _slice;
}

function findMatchesforNode(_findNode)
{
	return _.find(findResults, function(fr){ return fr.findElement._id==_findNode._id; }).matchedElements;
}

function addEdgeAndTargetToSlice(_slice, _newEdgeMatches, _findEdge)
{
	// from se in Aslice
	// join e in edges
	// on se.key.Id equals e.startElement.Id
	// select new SliceElement(se, e, _patternElement.endElement,
	// 	InsertMode.EdgeTarget);

	return _.compact(_.flatten(_slice.map( 
		function(se)
			{
				_newEdgeMatches.map(
					function(e) { 
						if (se.keyId ==e.startElement)
						{
							newSlice = se.slice;
							var count = newSlice.push(e._id, e.endElement);
							var newSliceElement =
								{
									keyId: e.endElement,
									slice: newSlice,
									patternElement: _findEdge.endElement,
									index: count-1
								};
							return newSliceElement;
						}
						else 
						{return null;}
					}
				)
			}
		)
	));

}

function addEdgeAndSourceToSlice(_slice, _newEdgeMatches, _findEdge)
{
	// //from se in Aslice
	// join e in edges
	// on se.key.Id equals e.endElement.Id
	// select new SliceElement(se, e, _patternElement.startElement, InsertMode.EdgeSorce)
	
	var mapresult = _slice.map( 
		function(se)
			{
				return _newEdgeMatches.map(
					function(e) { 
						if (se.keyId ==e.endElement)
						{
							newSlice = se.slice;
							var count = newSlice.push(e._id, e.startElement);
							var newSliceElement =
								{
									keyId: e.startElement,
									slice: newSlice,
									patternElement: _findEdge.startElement,
									index: count-1
								};
							return newSliceElement;
						}
						else 
						{return null;}
					}
				)
			}
		)
 	  return _.compact(_.flatten(mapresult));
	}

function addEdgeToSlice(_slice, _newEdgeMatches, _findEdge)
{
	// from se in Aslice
	// join e in edges
	// on se.key.Id equals e.startElement.Id
	// select new SliceElement(se, e, _patternElement.endElement,
	// 	InsertMode.EdgeTarget);

	return _.compact(_.flatten(_slice.map( 
		function(se)
			{
				return _newEdgeMatches.map(
					function(e) { 
						if (se.keyId ==e.endElement)
						{
							newSlice = se.slice;
							var count = newSlice.push(e._id);
							var newSliceElement =
								{
									keyId: e._id,
									slice: newSlice,
									patternElement: _findEdge._id,
									index: count-1
								};
							return newSliceElement;
						}
						else 
						{return null;}
					}
				)
			}
		)
	));

}

function createSlice(_findEdge, _newEdgeMatches)
{
	return _newEdgeMatches.map( function(e)
				{
					var elems  = [e._id, e.startElement, e.endElement];
                    return   {   keyId: e._id,
                        slice: elems,
                        index: 0,
                        patternElement: _findEdge
					};
				});
}

function sliceKeyByIndex(_slice, _index)
{
	return _slice.map(
		function(e)
	{ 
		return {	keyId: e.slice[_index],
			slice: e.slice,
			index: _index,
			patternElement: e.patternElement
		};
	})
}

function processRelatedEdge(_edge, _findDiagramId, _slice)
{
	if (_.contains(apstaigatie, _edge.startElement))
	{
		if (_.contains(apstaigatie, _edge.endElement))
		{
			//apstaigats source un target, jāpievieno savienojošais Edge
			sourceNode = Elements.findOne({_id: _edge.startElement});
			targetNode = Elements.findOne({_id: _edge.endElement});
			sourceNodeMatches = findMatchesforNode(sourceNode);
			targetNodeMatches = findMatchesforNode(targetNode);
			targetNodeMatchIds = targetNodeMatches.map(n => n._id);
			var atrastais=[];
			sourceNodeMatches.forEach(n => {
				edgesForNodeWithType =_.filter(findOutgoingEdgesWithType(n._id, _edge.elementTypeId),
						function(e) {
							targetNodeForEdge = Elements.findOne({ _id: e.endElement, elementTypeId: targetNode.elementTypeId });
							//return true or false
							return (targetNodeForEdge && _.contains(targetNodeMatchIds, e.endElement));
							})
				if (edgesForNodeWithType)
				{
					atrastais = atrastais.concat(edgesForNodeWithType);
				}
			});
			_slice = addEdgeToSlice(_slice, atrastais, _edge);
            processVisitedEdge(_edge, atrastais, null, null);
		}
		else
		{
			//apstaigāts tikai source, jāpievieno edge un target
			sourceNode = Elements.findOne({_id: _edge.startElement});
			targetNode = Elements.findOne({_id: _edge.endElement});
			var atrastais=[];
		
			findMatchesforNode(sourceNode).forEach(n => {
				edgesForNodeWithType =_.filter(findOutgoingEdgesWithType(n._id, _edge.elementTypeId),
						function(e) {
							targetNodeForEdge = Elements.findOne({_id: e.endElement, elementTypeId: targetNode.elementTypeId});
							if (targetNodeForEdge) 
							{
								return true;
							}
							else
							{
								return false
							}
						})
				if (edgesForNodeWithType)
				{
					atrastais.concat(edgesForNodeWithType);
				}
			});
			_slice = addEdgeAndTargetToSlice(_slice, atrastais, _edge);
			processVisitedEdge(_edge, atrastais, null, targetNode);
			if (_slice)
			{
			   _slice = processRelatedNode(targetNode, _findDiagramId, _slice);
			}
		}
	}
	else
	{
		if (_.contains(apstaigatie, _edge.endElement))
		{
			//apstaigāts tikai target, jāpievieno edge un source
			sourceNode = Elements.findOne({_id: _edge.startElement});
			targetNode = Elements.findOne({_id: _edge.endElement});
		    var atrastais=[];
			findMatchesforNode(targetNode).forEach(n => {
				edgesForNodeWithType =_.filter(findIncomingEdgesWithType(n._id, _edge.elementTypeId),
						function(e) {
							sourceNodeForEdge = Elements.findOne({_id: e.startElement, elementTypeId: sourceNode.elementTypeId});
							if (sourceNodeForEdge)
							{
								return true;
							}
							else
							{
								return false;
							}
						})
				if (edgesForNodeWithType)
				{
					atrastais = atrastais.concat(edgesForNodeWithType);
				}
			});
			_slice = addEdgeAndSourceToSlice(_slice, atrastais, _edge);
			processVisitedEdge(_edge, atrastais, sourceNode, null);
			if (_slice)
			{
			   _slice = processRelatedNode(sourceNode, _findDiagramId, _slice);
			}
		}
		else
		{
			//Te nevajadzētu nonākt, ja neviens gals nav apstaigāts
			findEdge(_edge, _findDiagramId);
		}
	}
	return _slice;
}

function findNode (_findNode)
{
	var nodeList = Elements.find(
			{elementTypeId: _findNode.elemTypeId, diagramId: {$ne: _findNode.diagramId}}, 
			{fields: {diagramId:1}})
		.fetch();
	nodeList2 = checkConstraintsForElementList(_findNode, nodeList);
	processVisitedNode(_findNode, nodeList2)
	return true;
}

function processVisitedNode(_findElement, _foundElementList)
{
	var findElement = {findElement: _findElement, matchedElements: _foundElementList};
	if (apstaigatie)
	{
		apstaigatie.push(_findElement._id);
		findResults.push(findElement);
	}
	else
	{
		apstaigatie = [_findElement._id];
		findResults = [findElement];
	}
}

function processVisitedEdge(_findEdge, _foundEdgeList, _sourceNode, _targetNode)
{
	var findElement = {findElement: _findEdge, matchedElements: _foundEdgeList};
	if (apstaigatie)
	{
		apstaigatie.push(_findEdge._id);
		findResults.push(findElement);
	}
	else
	{
		apstaigatie = [_findEdge._id];
		findResults = [findElement];
	}

	if (_sourceNode)
	{
		apstaigatie.push(_sourceNode._id);
		sourceNodeList = edgeListToSourceNodeList (_foundEdgeList);
		var sourceFindElement = {findElement: _sourceNode, matchedElements: sourceNodeList};
		findResults.push(sourceFindElement);
	};
	if (_targetNode)
	{
		apstaigatie.push(_targetNode._id);
		targetNodeList = edgeListToTargetNodeList (_foundEdgeList);
		var targetFindElement = {findElement: _targetNode, matchedElements: targetNodeList};
		findResults.push(targetFindElement);
	};

}

function processPotentialResults(_findResultsAAA, _potentialDiagIds, list)
{
	console.log("processPotentialResults", _potentialDiagIds, _findResultsAAA);
	PotentialElems= _.filter(_.flatten(_findResultsAAA), function(e) {return _.contains(_potentialDiagIds, e.diagramId)} );
	console.log(PotentialElems);
	var aka = _potentialDiagIds.map(
		function (c) { 

			var diag = Diagrams.findOne({"_id": c});
			var projectId = Versions.findOne({"_id": diag.versionId}).projectId;
			var diagElems = _.filter(PotentialElems, function (a) {return a.diagramId==c});
			var diagElemIds = diagElems.map(function (c) { return c._id;})
			console.log("ciklā", c, diag, diagElemIds, diagElems);
			return {
				_id: c,
				name: diag.name,
				typeId : diag.diagramTypeId,
				elemCount: _.size(diagElems),
				projectId: projectId,
				versionId: diag.versionId,
				diagramTypeId: diag.diagramTypeId,
				diagram: c,
				path: "http://localhost:3000/project/" + projectId + "/diagram/"+c+"/type/"+diag.diagramTypeId+"/version/" + diag.versionId+"/findMode",
				elements: diagElemIds,
				editMode: "findMode"
			}
		}
	);
	return aka;
}

function DiagramsForFindResult(list)
{
	diagramIds = [];
	potentialDiagramIds = []
	first = true;
	console.log("DiagramsForFindResult", findResults)
	aaa =  findResults.map(
		function(fr)
		{
			matchedElementsIds = fr.matchedElements.map(
				function(me) { return {_id: me._id, diagramId: me.diagramId} }
				);	
			currentDiagramIds = _.pluck(matchedElementsIds, "diagramId");
			if (first)
			{
				diagramIds = currentDiagramIds;
				potentialDiagramIds = currentDiagramIds;
				first = false;
			}
			else
			{
				diagramIds = _.intersection(diagramIds,  currentDiagramIds);
				potentialDiagramIds = _.union(potentialDiagramIds, currentDiagramIds)
			}
			return matchedElementsIds;
		}
		);
		potentialDiagramIdsWithoutExact =  _.difference(potentialDiagramIds, diagramIds);
		pr= processPotentialResults(aaa, potentialDiagramIdsWithoutExact, list);
	return {result: _.filter(_.flatten(aaa), function(e) {return _.contains(diagramIds, e.diagramId)} ),
	        potentialDiagIds: pr
			};
}

//Constraints

//atrod Compartmentus elementam un no katra kompartment uztaisa Constraint
//atkarībā no CompartmentType InputType.inputType (datu tipa) ģenerē regulāro izteiksmi.
function findConstraintsForElement(_findElement)
{
	return Compartments.find({ elementId: _findElement._id }).fetch().map(
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

//atstāj tikai tos elementus, kam izpildās visi cnstraint
function checkConstraintsForElementList(_findElement, _foundElementList)
{
	var atrastie = _foundElementList;
	var constraints = findConstraintsForElement(_findElement);

	_.each(constraints, function(c) {

		if (atrastie != null && _.size(atrastie)>0)
		{
			atrastie = _.filter(atrastie, function (a) {return checkRegExConstraintForElement(c, a)} )
		}
		else 
		{
			return null;
		}
	})
	return atrastie;
}

function checkConstraintsForElement(constraints, _foundElement)
{

	var res = true;
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
			res = false;
			return true;
		}
	})
	return res;
}

//pārbauda vai attiecīgajam diagrammas elementam izpildās dotais constrainits 
//atgriež True vai False 
function checkRegExConstraintForElement(_constraint, _element)
{
	com =  Compartments
		.find({
				input: {$regex : _constraint.regExpression}, 
				elementId: _element._id, 
				compartmentTypeId: _constraint.compartmentTypeId}, 
		).fetch();
	if (_.size(com) == 1)
		{return true;}
	else
	{
		var cv = _.extend(_constraint, {_id:_element._id,
			_diagramId: _element.diagramId});
		
		console.log("ConstraintNotSatisfied", cv, _constraint, _element._id);
		if (constraintViolation)
			constraintViolation.push(cv);
		else
		    constraintViolation = [cv];
			
		return false;
	}
}

function findMe(list)
{
	console.log("Find Me");
	apstaigatie = [];
	findResults = [];
	slices = [];
	constraintViolation = [];

	notVisitedEdge = getNotVisitedEdge(list.diagramId, apstaigatie);
	while (notVisitedEdge)
	{
		slices.push(findEdge(notVisitedEdge, list.diagramId));
		notVisitedEdge = getNotVisitedEdge(list.diagramId, apstaigatie);
	}
	notVisitedNode = getNotVisitedNode(list.diagramId, apstaigatie);
	while (notVisitedNode)
	{
		findNode(notVisitedNode);
		notVisitedNode = getNotVisitedNode(list.diagramId, apstaigatie);
	};

	return createJsonFromDiagIds(DiagramsForFindResult(list), list);
}


Meteor.methods({

	findByElementType: function (list) {

		var diagramids = Elements.find({ elementTypeId: list.elemTypeId }, { fields: { diagramId: 1 } });
		return _.uniq(_.pluck(diagramids.fetch(), "diagramId")).map(
			function (c) {
				var diag = Diagrams.findOne({ "_id": c });
				var projectId = Versions.findOne({"_id": diag.versionId}).projectId;
				var diagElems = _.filter(diagramids.fetch(), function (a) { return a.diagramId == c });
				var diagElemIds = diagElems.map(function (c) { return c._id; })
				return {
					_id: c,
					name: diag.name,
					typeId: diag.diagramTypeId,
					elemCount: _.size(diagElems),
					path: "http://localhost:3000/project/" + projectId + "/diagram/" + c + "/type/" + diag.diagramTypeId + "/version/" + diag.versionId,
					elements: diagElemIds
				}
			}
		)
	},

	//līdzīgi findByElementType, bet ņem vērā Node property Constraints
	findByNode: function(list)
	{
		var atrastie = checkConstraintsForElementList(
			Elements.findOne({_id: list.element}), 
			Elements.find({elementTypeId: list.elemTypeId}, {fields: {diagramId:1}}).fetch());

		var diagramids = _.map(atrastie, 
			function (a) {return {_id: a._id, diagramId: a.diagramId}}	);

		//dažādie unikuāli diagrammu Idi
		dgidsarray3 = _.uniq(_.pluck(diagramids, "diagramId"))
			.map(
			function (c) { 
				var diag = Diagrams.findOne({"_id": c});
				var projectId = Versions.findOne({"_id": diag.versionId}).projectId;
				var diagElems = _.filter(diagramids, function (a) {return a.diagramId==c});
				var diagElemIds = diagElems.map(function (c) { return c._id;})

				return {
					_id: c,
					name: diag.name,
					diagramTypeId: diag.diagramTypeId,
					typeId: diag.diagramTypeId,
					projectId: projectId,
					versionId: diag.versionId,
					elemCount: _.size(diagElemIds),
					diagram: c,
					path: "http://localhost:3000/project/" + projectId + "/diagram/"+c+"/type/"+diag.diagramTypeId+"/version/" + diag.versionId,
					elements: diagElemIds,
					editMode: "findMode"
			}
			});
			return {result: dgidsarray3,
				potentialDiagIds: []}
	},

	findByEdgeType: function(list){
	// 	list.elementTypeId - edge type
	//  list.sourceNodeTypeId - source node type
	//  list.targetNodeTypeId - target node type
	//  list.projectId - active project id
	//  list.versionId - active version id 
	  
	// find edges with a type
	var edgeswithSourceTargetTypes = findByEdgeType(list);

	var result = {result: edgeswithSourceTargetTypes,
	potentialDiagIds: []
	};

	return createJsonFromDiagIds(result, list);
    },

	findMe: function(list){
	    // 	list.diagramId - diagram
		//  list.projectId - active project id
		//  list.versionId - active version id 
		return findMe(list);
	},

	RemoveConstraintAndFind: function(list){
		Compartments.remove(list.compartmentId);
		return findMe(list);
	},

	UpdateStyle: function(list){
		var foundElementsjson =  list.json;
		var foundDiag = _.find(foundElementsjson, function(i){return (i._id == list.diagId)});
		console.log("foundDiag", foundDiag, "json", foundElementsjson);
		var diagElements = foundDiag.elements;
		console.log("diagElements", diagElements);
		_.every(diagElements, function (el) {
		  Elements.update(
			{_id:el},
			{$set: {style: {elementStyle: {strokeWidth: 5, stroke: "rgb(80,203,91)"}}}}
		  );
		  console.log("Update for", el);
		  return list.json;
		});
	}
});

