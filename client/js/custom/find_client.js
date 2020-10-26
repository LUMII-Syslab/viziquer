Interpreter.customMethods({
    LayoutElements: function() {
        console.log('layouting elements');
        let ActiveDiagramId = Session.get('activeDiagram');
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
                        let endElement      = _.findWhere(IdDict, {stringId: diagramLine.startElement});

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
    },

    Find: function()
    {
        function GetActiveElement()
        {
          return Elements.findOne({_id:  Session.get("activeElement")});
        };
   
        function GetNodeParams(elem)
        {
               return { elemTypeId: elem.elementTypeId, element: elem._id, projectId: Session.get("activeProject"), versionId: Session.get("versionId")};
        };

        function GetEdgeParams(elem)
        {
            return {
                edgeTypeId: elem.elementTypeId,
                element:elem.id,
                sourceNodeTypeId: Elements.findOne({_id: elem.startElement}).elementTypeId,
                targetNodeTypeId: Elements.findOne({_id: elem.endElement}).elementTypeId,
                projectId: Session.get("activeProject"),
                versionId: Session.get("versionId")};
        };

        function GetDiagParams(diagId)
        {
            console.log("GetDiagParams", diagId, Session.get("activeProject"), Session.get("versionId") );
            return { diagramId: diagId, projectId: Session.get("activeProject"), versionId: Session.get("versionId")};
        };

        function CallServerFind(serverMethodName, list)
         {   
            console.log("CallServerFind", serverMethodName, list);
              Utilities.callMeteorMethod(serverMethodName, list, function(resp) {
         /*         console.log("resp", resp.result);
                  var abc = _.map(resp.result, function(item) { 

                    _.extend(item, {
                        //versionId: Session.get("versionId"),
                         //       projectId:  Session.get("activeProject"),
                                diagramTypeId: item.typeId
                } )  
                    return item;                  })
                    console.log("abc", abc);*/
                Session.set("json", resp.result);
                Session.set("PotentialResults", resp.potentialDiagIds);
                Session.set("ViolatedConstiants", resp.violatedConstraints);
            });    
        };

        elem = GetActiveElement();
        if (elem) {
            if (elem.type == "Line") {
                CallServerFind("findByEdgeType", GetEdgeParams(elem));
            }
            else if (elem.type == "Box") {
                //Ņem vērā string constraints
                CallServerFind("findByNode", GetNodeParams(elem));
            }
            else { }
        }
        else
        {
            console.log("findMe būs", Session.get("activeDiagram"));
            CallServerFind("findMe", GetDiagParams(Session.get("activeDiagram")));
        }
    },

    Replace: function(){
        function getDiagramParams(diagID){ // Aktivās diagrammas parametri
            return { diagramId: diagID, projectId: Session.get("activeProject"), versionId: Session.get("versionId")};
        };
        function CallServerFind(serverMethodName, diagParamList){
            console.log("CallServerFind", serverMethodName, diagParamList);
            Utilities.callMeteorMethod(serverMethodName, diagParamList, function(response){
                Session.set("ResultsJson", response);
            });
        };
        CallServerFind("findDiags", getDiagramParams(Session.get("activeDiagram")));
    }

})
