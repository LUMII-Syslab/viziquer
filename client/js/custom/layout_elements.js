LayoutElements = (ActiveDiagramId) => {
    let IdDict = []; // konteiners id vārdnīcai
        if(ActiveDiagramId){
            let DiagramBoxes = Elements.find({diagramId: ActiveDiagramId, type: 'Box'}).fetch();
            // meklē elementus aktivajā diagrammā
            if(_.size(DiagramBoxes) > 0){
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
                        // katrai atrastai līnijai diagrammā tiek atrasti tās sākuma un beigu elementi un pievienoti layout 
                        if(startElement && endElement) layout.addLine(IdStartNum, startElement.intId, endElement.intId, diagramLine.points);

                        IdDict.push(IdPair);
                        IdStartNum++;
                    });
                }
                let result = layout.arrangeIncrementally();
                // izkārto inkrementāli, jeb ņemot vērā esošo izkārtojumu
                let list = {IdDict: IdDict, layoutResult: result};
                // izsauc servera metodi izkārtojuma atjaunināšanai
                Utilities.callMeteorMethod('updateLayout',list, function(response){

                });  
            } else alert("Diagram has no elements");
        }
}
