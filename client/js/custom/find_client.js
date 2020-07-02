Interpreter.customMethods({

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
                  console.log("resp", resp.result);
                  var abc = _.map(resp.result, function(item) { 
                    _.extend(item, {
                        //versionId: Session.get("versionId"),
                         //       projectId:  Session.get("activeProject"),
                                diagramTypeId: item.typeId
                } )  
                    return item;                  })
                    console.log("abc", abc);
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

    TestNew: function() {
    },
    Replace: function(){
        function getDiagramParams(diagID){ // Aktivās diagrammas parametri
            return { diagramId: diagID, projectId: Session.get("activeProject"), versionId: Session.get("versionId")};
        };
        function CallServerFind(serverMethodName, diagParamList){
            console.log("CallServerFind", serverMethodName, diagParamList);
            Utilities.callMeteorMethod(serverMethodName, diagParamList, function(response){
                /* šo varēs atkometēt, kad strādās find servera daļa
                console.log("response", response.result);

                Session.set("JSON_Res", response.result);
                Session.set("PotentialRes", response.potentialDiagIds);
                Session.set("ViolatedConstraints", response.violatedConstraints);
                */
            });
        };
        console.log("Aktīvais elements: ", Session.get("activeElement"));
        CallServerFind("findDiags", getDiagramParams(Session.get("activeDiagram")));
        /*
        console.log("test");
        elem = Session.get("activeElement"); 
        // info par aktīvo/izvēlēto elementu
        elemType    = Elements.findOne({_id: elem}).elementTypeId;
        elemName    = ElementTypes.findOne({_id: elemType}).name;
        console.log("Active element id : " + elem + " Element name: "+ elemName);
        ActDiag     = Session.get("activeDiagram");
        
        BoxTypeId       = ElementTypes.findOne({name: "Box"})._id;  // iegūstam komentārbloku tipa id (jābūt TNwkqh6ogu3D4Nb5p)
        DiagramBoxes    = Elements.find({diagramId: ActDiag, elementTypeId: BoxTypeId}).fetch();
        // papildinām katru komentārkastes objektu ar īpašību value (no compartments dokumenta)
        DiagramBoxes.forEach(item => {
            _.extend(item,{
                value: Compartments.findOne({elementId: item._id, elementTypeId: item.elementTypeId,diagramId: ActDiag,index:0}).value 
            }); // ko nozīmē index lauks compartments dokumentā? ievadlauka vērtība?
            console.log(item.value); // pēdējais value ir undefined, kāpēc?tāpēc ka jādabū compartment tips, kā? 
        });
        console.log(DiagramBoxes); 

        FindReplaceLineType = ElementTypes.findOne({name: "FindReplaceType"})._id; // speciāllīnijas tipa id
        SpecialLines        = Elements.find({diagramId: ActDiag, elementTypeId: FindReplaceLineType}).fetch(); // iegūstam līniju masīvu
        console.log(SpecialLines);
        
        SpecialLines.forEach(item =>{
            Box = _.findWhere(DiagramBoxes,{_id: item.endElement}); // katrai speclīnijai meklējam kasti, uz kuru norāda endElement lauks
            if(Box.value == "Find"){
                elementToFind       = Elements.findOne({_id: item.startElement});
                elementToFindName   = ElementTypes.findOne({_id: elementToFind.elementTypeId}).name;
                console.log(`Element to find => id: ${elementToFind._id} name: ${elementToFindName}`);
            }
            else if(Box.value == "Replace"){
                elementToReplace        = Elements.findOne({_id: item.startElement});
                elementToReplaceName    = ElementTypes.findOne({_id: elementToReplace.elementTypeId}).name;
                console.log(`Element to replace with => id: ${elementToReplace._id} name: ${elementToReplaceName}`);
            }
        });
        */
    }

})
