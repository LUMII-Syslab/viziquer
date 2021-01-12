Meteor.methods({
    EnableReplace: function(list) {
        let data
    if(Meteor.isServer){
        data = JSON.parse(Assets.getText('FindReplaceExtension.json'));
        list.data = data;
    }// KSBA DSL sintakses elementi JSON formātā

    let SpecLineType = ElementTypes.findOne({name: "Specialization"})._id;
    let SuperBoxes      = _.pluck(ElementTypes.find({diagramId: list.diagramId, type:"Box", superTypeIds: {$size: 0}}).fetch(),'elementId');
    if(!_.size(SuperBoxes)){ 
        return {msg: "DSL syntax diagram is empty"} // ja nav neviena SuperBox, tad diagramma ir tukša
    }
    let FindReplaceElement = ElementTypes.findOne({name: "FindReplaceElement", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    let RemoveElement      = ElementTypes.findOne({name: "RemoveElement", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    let FindReplaceLink    = ElementTypes.findOne({name: "FindReplaceLink", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    if( typeof FindReplaceElement === 'undefined' && 
        typeof FindReplaceLink    === 'undefined' &&
        typeof RemoveElement      === 'undefined'){
            Meteor.call("importFindReplaceElements", list); // Impotē KSBA DSL Elementus DSL sintakses diagrammā
            let FindReplaceElementId    = Compartments.findOne({value: "FindReplaceElement", diagramId: list.diagramId}).elementId;
            let FindReplaceElement      = Elements.findOne({_id:FindReplaceElementId});
            let FindReplaceElementType  = ElementTypes.findOne({elementId: FindReplaceElement._id})._id;
            // ar katru no SuperBoxes ir jāizveido specializācijas līnija ar FindReplaceElement, lai iespējotu KSBA
            if(FindReplaceElementId){
                _.each(SuperBoxes, function(box){
                let BOX = Elements.findOne({_id: box});
                createSpecializationLink(FindReplaceElement, BOX, list,SpecLineType);
                ElementTypes.update({elementId: BOX._id}, {$set:{superTypeIds: [FindReplaceElementType]}});
                });
                insertReplaceButtonInToolbar(list.diagramId);// pievieno pogas diagrammu rīka panelī
                insertLayoutButtonInToolbar(list.diagramId);
            }
    }
    else return {msg: "Replace has been already enabled"};
    // Ja KSBA jau bija iespējots, tad izvada atbilstošu paziņojumu
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
                    icon : "fa-search",
                    name : "Find",
                    procedure : "Replace"
                    }
                }
            }
        ));
    }
}
function insertLayoutButtonInToolbar(diagramId){ // def's diagram Id. Inserts EnableReplace button in configuration diagram toolbar
    let DiagramTypeId = DiagramTypes.findOne({diagramId: diagramId})._id; // current def diagram type id
    if( typeof DiagramTypeId === 'undefined') console.log('Diagram type not found');
    else{
        console.log(DiagramTypes.update({_id: DiagramTypeId}, 
            {
                $push: {toolbar: { 
                    id : generate_id(),
                    icon : "fa-arrow-up",
                    name : "Layout",
                    procedure : "LayoutElements"
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