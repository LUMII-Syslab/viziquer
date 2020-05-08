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

})
