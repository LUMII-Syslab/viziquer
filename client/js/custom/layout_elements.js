LayoutElements = (ActiveDiagramId) => {
    let IdDict = [];
        if(ActiveDiagramId){
            let DiagramBoxes = Elements.find({diagramId: ActiveDiagramId, type: 'Box'}).fetch();
            if(DiagramBoxes){
                let IdStartNum  = 1;
                let layout      = new IMCSDiagramLayout;

                _.each(DiagramBoxes, function(diagramBox){
                    let IdPair          = {stringId: diagramBox._id, intId: IdStartNum, type: "box"};
                    let ElementLocation = diagramBox.location;

                    layout.addBox(IdStartNum, ElementLocation.x, ElementLocation.y, ElementLocation.width, ElementLocation.height);
                    IdDict.push(IdPair);
                    IdStartNum++;
                });
                let DiagramLines = Elements.find({diagramId: ActiveDiagramId, type: "Line"}).fetch();
                if(DiagramLines){
                    _.each(DiagramLines, function(diagramLine){
                        let IdPair          = {stringId: diagramLine._id, intId: IdStartNum, type: "line"};
                        let startElement    = _.findWhere(IdDict, {stringId: diagramLine.startElement});
                        let endElement      = _.findWhere(IdDict, {stringId: diagramLine.endElement});

                        if(startElement && endElement) layout.addLine(IdStartNum, startElement.intId, endElement.intId, diagramLine.points);

                        IdDict.push(IdPair);
                        IdStartNum++;
                    });
                }
                let result = layout.arrangeIncrementally();
                console.log('layout result',result);
                let list = {IdDict: IdDict, layoutResult: result};
                
                Utilities.callMeteorMethod('updateLayout',list, function(response){

                });  
            } // else no boxes were found
        }
}