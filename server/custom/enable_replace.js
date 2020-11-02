Meteor.methods({
    EnableReplace: function(list) {
        let data
    if(Meteor.isServer){
        data = JSON.parse(Assets.getText('FindReplaceExtension.json'));
        list.data = data;
    }

    let SpecLineType = ElementTypes.findOne({name: "Specialization"})._id;
    let SuperBoxes      = _.pluck(ElementTypes.find({diagramId: list.diagramId, type:"Box", superTypeIds: {$size: 0}}).fetch(),'elementId');
    if(!_.size(SuperBoxes)){ console.log('superBoxes not found'); return;}
    let FindReplaceElement = ElementTypes.findOne({name: "FindReplaceElement", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    let RemoveElement      = ElementTypes.findOne({name: "RemoveElement", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    let FindReplaceLink    = ElementTypes.findOne({name: "FindReplaceLink", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    if( typeof FindReplaceElement === 'undefined' && 
        typeof FindReplaceLink    === 'undefined' &&
        typeof RemoveElement      === 'undefined'){
            Meteor.call("importFindReplaceElements", list);
            let FindReplaceElem = Compartments.findOne({value: "FindReplaceElement", diagramId: list.diagramId}).elementId;
            let FRElem = Elements.findOne({_id:FindReplaceElem});
            let FREType = ElementTypes.findOne({elementId: FRElem._id})._id;
    
            if(FindReplaceElem){
                _.each(SuperBoxes, function(box){
                let BOX = Elements.findOne({_id: box});
                createSpecializationLink(FRElem, BOX, list,SpecLineType);
                console.log(ElementTypes.update({elementId: BOX._id}, {$set:{superTypeIds: [FREType]}}))
                });
                insertReplaceButtonInToolbar(list.diagramId);
            }
            else console.log("FindReplaceElement not found")
    }
    else console.log("FindReplace are already enabled");
    
    }
});
function insertReplaceButtonInToolbar(diagramId){ // def's diagram Id. Inserts EnableReplace button in configuration diagram toolbar
    let DiagramTypeId = DiagramTypes.findOne({diagramId: diagramId})._id; // current def diagram type id
    if( typeof DiagramTypeId === 'undefined') console.log('Diagram type not found');
    else{
        console.log(DiagramTypes.update({_id: DiagramTypeId}, 
            {
                $push: {toolbar: { 
                    id : generate_id(),
                    icon : "fa-bars",
                    name : "replace",
                    procedure : "Replace"
                    }
                }
            }
        ));
    }
}
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
        points: [superBox.location.x, superBox.location.y, FindReplaceElement.location.x, superBox.location.y,
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