Meteor.methods({
    EnableReplace: function(list) {
        
        let ExtensionJSON = {};
        let fs = Npm.require('fs');
        
        fs.readFile('/Viziquer/viziquer/jsons/FindReplaceExtension.json', 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }

        data = JSON.parse(data);
        list.data = data;
    });
    let SpecLineType = ElementTypes.findOne({name: "Specialization"})._id;
    let SpecializationLines = Elements.find({ elementTypeId: SpecLineType, diagramId: list.diagramId}).fetch();
    let EndElem         = _.uniq(_.pluck(SpecializationLines,'endElement'));
    let StartElem       = _.uniq(_.pluck(SpecializationLines,'startElement'));
    let SuperBoxes      = _.difference(EndElem, StartElem);
    if(!_.size(SuperBoxes)) SuperBoxes = _.pluck(Elements.find({diagramId:list.diagramId}).fetch(),'_id');// ja speciāllīniju nav vispār, bet ir tikai elementi
    // find and check find replace elementTypes in current configuration diagram
    let FindReplaceElement = ElementTypes.findOne({name: "FindReplaceElement", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    let RemoveElement      = ElementTypes.findOne({name: "RemoveElement", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    let FindReplaceLink    = ElementTypes.findOne({name: "FindReplaceLink", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    if( typeof FindReplaceElement === 'undefined' && 
        typeof FindReplaceLink    === 'undefined' &&
        typeof RemoveElement      === 'undefined'){
            Meteor.call("importFindReplaceElements", list);
        }
    else console.log("FindReplace are already enabled");
    
    let FindReplaceElem = Compartments.findOne({value: "FindReplaceElement", diagramId: list.diagramId}).elementId;
    let FRElem = Elements.findOne({_id:FindReplaceElem});
    let FREType = ElementTypes.findOne({elementId: FRElem._id})._id;
    
    if( FindReplaceElem){
        _.each(SuperBoxes, function(box){
            let BOX = Elements.findOne({_id: box});
            createSpecializationLink(FRElem, BOX, list,SpecLineType);
            console.log(ElementTypes.update({elementId: BOX._id}, {$set:{superTypeIds: [FREType]}}))
        });
    }
    else console.log("FindReplaceElement not found")
    }
});
function createSpecializationLink(FindReplaceElement, superBox, list, specLineTypeId) {

    let newSpecLineObj = {
        startElement:   superBox._id,
        endElement:     FindReplaceElement._id,
        diagramId:      list.diagramId,
        diagramTypeId:  list.diagramTypeId,
        elementTypeId:  specLineTypeId,
        style : {
                elementStyle : {
                        stroke : "rgb(92,71,118)",
                        strokeWidth : 1,
                        shadowColor : "red",
                        shadowBlur : 0,
                        shadowOpacity : 1,
                        shadowOffsetX : 0,
                        shadowOffsetY : 0,
                        tension : 0,
                        opacity : 1,
                        dash : [ ]
                },
                startShapeStyle : {
                        fill : "rgb(92,71,118)",
                        fillPriority : "color",
                        stroke : "rgb(92,71,118)",
                        strokeWidth : 1,
                        shadowColor : "red",
                        shadowBlur : 0,
                        shadowOpacity : 1,
                        shadowOffsetX : 0,
                        shadowOffsetY : 0,
                        tension : 0,
                        opacity : 1,
                        dash : [ ],
                        radius : 7,
                        shape : "None"
                },
                endShapeStyle : {
                        fill : "rgb(92,71,118)",
                        fillPriority : "color",
                        stroke : "rgb(92,71,118)",
                        strokeWidth : 1,
                        shadowColor : "red",
                        shadowBlur : 0,
                        shadowOpacity : 1,
                        shadowOffsetX : 0,
                        shadowOffsetY : 0,
                        tension : 0,
                        opacity : 1,
                        dash : [ ],
                        radius : 12,
                        shape : "Triangle"
                },
                lineType : "Orthogonal"
        },
        styleId : "46b11d5d2e84faf863f83ec4",
        type : "Line",
        points: [superBox.location.x, superBox.location.y, 
        FindReplaceElement.location.x, FindReplaceElement.location.y],
        toolId: list.toolId,
        versionId: list.versionId,
        data: {
            type: "Specialization",
            data:{
                endElementTypeId:   ElementTypes.findOne({elementId: FindReplaceElement._id})._id,
                startElementTypeId: ElementTypes.findOne({elementId: superBox._id})._id,
                diagramTypeId:      ElementTypes.findOne({elementId: superBox._id}).diagramTypeId
            }
        }
    };
    let newSpecLineId = Elements.insert(newSpecLineObj);
    
}