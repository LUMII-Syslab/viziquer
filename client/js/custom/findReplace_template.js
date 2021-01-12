Template.replaceResults.helpers({
    // helperi templates datiem
    ResultsJson: function() {
        return Session.get("ResultsJson");
    },
    ExpErrors: function(){
        return Session.get("ExpErrors")
    },
    DiagramErrorMessage: function() {
        return Session.get("DiagramErrorMsg");
    },
    isNewMatch: function(status) {
        return status == 'new'
    },
    isUsedMatch: function(status) {
        return status == 'used'
    },
    isConflictingMatch: function(status) {
        return status == 'conflicting'
    }
});
Template.registerHelper('incremented', function(index){
    return ++index;
})
Template.replaceResults.events({
    'click .replace': function(){
        //replace all occurences
        console.log("replace all matches");
        const CurrentDiagramId = this._id;
        console.log("Current diag id", CurrentDiagramId);
        if( !(typeof this === 'undefined') || _.size(this) ) {
            ReplaceAllOccurences(CurrentDiagramId, this);
        }
    },
    'click #selectMatch': function(){
        // replace selected occurence
        console.log("replace selected match");
        replaceSingleMatch(this._id, this);
    },
    'click #highlightMatch': function() {
        // highlight selected match
        console.log('match: ',this);
        HighlightMatch(this._id,[this]);
    },
    'click #highlightAll' : function() {
        // Session.set('foundMatchElements', [this] );
        HighlightMatch(this._id, [this]);
    },
    'click #clearResults' : function() {
        // clear all tables and messages
        Session.set('ResultsJson', [] );
        Session.set("DiagramErrorMsg", []);
        Session.set("ExpErrors", []);
    },
    'click #replaceInAllDiagrams' : function(){
        let Results = Session.get('ResultsJson');
        let NotFoundDiagrams = [];
        if( _.size(Results) ){
            ReplaceInAllDiagrams(Results);
        }
    }
})
function markConflictingMatches(ResultsJson, elementsToLookup){
    _.each(ResultsJson, function(diagramItems){
        _.each(diagramItems.matches, function(match){
            if(match.status == 'new'){
                let foundConflictingMatch = _.some(match.match, function(matchItem){
                    return _.some(matchItem.elements, function(elementPair){
                        return _.contains(elementsToLookup, elementPair.elementId);
                    }); // ja atrodam kaut vienu elementu, kas bija aizvietojamo elementu sarakstā, tad nomarķējam šo matchu kā konfiktējošu
                });
                if(foundConflictingMatch) match.status = 'conflicting';
            }
        })
    });
    return ResultsJson;
}
function updateSession (ResultsJson, CurrentDiagramId, response){// atjaunojam sesijas datus ResultsJson
    _.each(ResultsJson, function(diagramItem){
        console.log("updating session");
        if(diagramItem._id == CurrentDiagramId){
            
            _.each(diagramItem.matches, function(match){
                let responseItem = _.findWhere(response, {matchId: match.id});
                
                if(responseItem){
                    match.status = responseItem.status;
                }
            })
        }
    });
    return ResultsJson;
}
function HighlightMatch(diagramId, match){
    Utilities.callMeteorMethod("checkDiagramExistance", diagramId,function(response){
        Session.set("DiagramErrorMsg","");
        if(response) Session.set('foundMatchElements', match);
        else{
            Session.set('foundMatchElements', []);
            Session.set("DiagramErrorMsg","Diagram does not exist");
            history.go(-1);
        }
    });
}
function replaceSingleMatch(diagramId, list){
    Utilities.callMeteorMethod("checkDiagramExistance", diagramId,function(response){
        Session.set("DiagramErrorMsg",""); // Sessijas dati diagrammas paziņojumam
        if(response) {
            let matchId = list.id;
            let elementsToLookup = _.flatten(_.map(list.match, function(matchItem){
                return _.map(matchItem.elements, function(element){
                    return element.elementId;
                })
            }));// elementi, kurus jāmeklē citos fragmentos, lai samarķētu konfliktējošos 
            
            let UpdateStatus = Session.get('ResultsJson');
            _.each(UpdateStatus, function(diagramItems){
                _.each(diagramItems.matches, function(match){
                    if(match.id == matchId) match.status = 'used'; // maina izmantotā fragmenta statusu
                })
            });
            UpdateStatus = markConflictingMatches(UpdateStatus, elementsToLookup);
            Session.set('ResultsJson', UpdateStatus);
            
            Utilities.callMeteorMethod("replaceSingleOccurence",list, function(response){
                LayoutElements(Session.get('activeDiagram')); // izkārto diagrammas elementus
            });
        }
        else { // Ja diagrammas nav, jāuzstāda atbilstošs paziņojums
            Session.set("DiagramErrorMsg","Diagram does not exist");
        }
    });
}
function ReplaceAllOccurences(diagramId, list){
    Utilities.callMeteorMethod("checkDiagramExistance", diagramId,function(response){
        Session.set("DiagramErrorMsg","");
        if(response) {
            Utilities.callMeteorMethod('replaceAllOccurencesInDiagram', list, function(ReplaceResponse){
                let ResultsJson = Session.get('ResultsJson');
                console.log("ResultsJson before", ResultsJson);
                console.log("Replace response",ReplaceResponse);
                ResultsJson     = updateSession(ResultsJson,diagramId, ReplaceResponse);
                console.log("ResultsJson after update", ResultsJson);
                Session.set('ResultsJson', ResultsJson);
            });
            LayoutElements(diagramId);
        }
        else{
            Session.set("DiagramErrorMsg","Diagram does not exist");
        }
    });
}
function ReplaceInAllDiagrams(Results){
    
    Session.set("DiagramErrorMsg","");
    let NotFoundDiagrams = [];
    _.each(Results, function(ResultItem){
        const CurrentDiagramId = ResultItem._id;
        
        Utilities.callMeteorMethod("checkDiagramExistance", CurrentDiagramId,function(response){
            
            if(response){
                Utilities.callMeteorMethod('replaceAllOccurencesInDiagram', ResultItem, function(ReplaceResponse){

                    let ResultsJson = Session.get('ResultsJson');
                    ResultsJson = updateSession(ResultsJson, CurrentDiagramId, ReplaceResponse);
                    Session.set('ResultsJson', ResultsJson);
                }); 
                LayoutElements(CurrentDiagramId);
            }
            else{
                NotFoundDiagrams.push(ResultItem.name);
                Session.set("DiagramErrorMsg", "Diagrams: " + NotFoundDiagrams.join() + " do not exist");
            }
        });
    })
}