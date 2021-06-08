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
    },
    queryDiagData: function() {
        return Session.get("QueryDiagData");
    },
    notQueryDiagram: function() {
        const queryDiagData = Session.get("QueryDiagData");
        return queryDiagData.diagramId != Session.get("activeDiagram");
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
        console.log("replace single selected match");
        
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
        Session.set('foundMatchElements', []);
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
    console.log("highLighting match");
    Utilities.callMeteorMethod("checkDiagramExistance", diagramId,function(response){
        console.log("RESP");
        Session.set("DiagramErrorMsg","");
        // Session.set('foundMatchElements', []);
        if(response) {
            const matchInSession = Session.get('foundMatchElements');
            if( _.size(matchInSession) == 0 || typeof matchInSession === 'undefined') Session.set('foundMatchElements', match);
            else {
                Session.set('foundMatchElements', match);
                console.log("found match in session");
                // history.go(-1);
                // history.go(1);
            }
        }
        else{
            Session.set('foundMatchElements', []);
            Session.set("DiagramErrorMsg","Diagram does not exist");
            history.go(-1);
        }
    });
}
function replaceSingleMatch(diagramId, list){
    console.time('SingleMatch_replace');

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
            // UpdateStatus = markConflictingMatches(UpdateStatus, elementsToLookup);
            // Session.set('ResultsJson', UpdateStatus);
            let ParamList = {
                match: list,
                matchData: UpdateStatus,
                diagramId: diagramId,
                elementsToLookup: elementsToLookup
            }
            Utilities.callMeteorMethod("replaceSingleOccurence",ParamList, function(response){
                UpdateStatus = updateSession(UpdateStatus, diagramId, response);
                Session.set('ResultsJson', UpdateStatus);
                LayoutElements(diagramId); // izkārto diagrammas elementus
            });
            console.timeEnd('SingleMatch_replace');
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
// function ReplaceInAllDiagrams(Results){
//     // console.time('AllMatches_replace_time');
//     Session.set("DiagramErrorMsg","");
//     let NotFoundDiagrams = [];
//     _.each(Results, function(ResultItem){
//         let t0 = performance.now();
//         const CurrentDiagramId = ResultItem._id;
//         console.time('Replace_All_by_one');
//         Utilities.callMeteorMethod("checkDiagramExistance", CurrentDiagramId,function(response){
            
//             if(response){
//                 Utilities.callMeteorMethod('replaceAllOccurencesInDiagram', ResultItem, function(ReplaceResponse){

//                     let ResultsJson = Session.get('ResultsJson');
//                     ResultsJson = updateSession(ResultsJson, CurrentDiagramId, ReplaceResponse);
//                     Session.set('ResultsJson', ResultsJson);
//                 }); 
//                 LayoutElements(CurrentDiagramId);
//             }
//             else{
//                 NotFoundDiagrams.push(ResultItem.name);
//                 Session.set("DiagramErrorMsg", "Diagrams: " + NotFoundDiagrams.join() + " do not exist");
//             }
//             console.timeEnd('Replace_All_by_one');
//             let t1 = performance.now()
//             prefSum += t1-t0;
//             // console.log("perfPart: ", `${prefSum} ms`);
//             if(ResultItem._id == Results[ResultsSize-1]._id) console.log("Time to replace all matches: ", `${prefSum} ms`);
//         });
//     }); 
//     // console.timeEnd('AllMatches_replace_time');
// }
function ReplaceInAllDiagrams(Results){
    Session.set("DiagramErrorMsg", "");
    console.time('replaceAll_time');
    Utilities.callMeteorMethod('replaceInAllDiagrams', Results, function(ReplaceResponse){
        console.timeEnd('replaceAll_time')
        let ResultsJson = Session.get('ResultsJson');
        console.time('update_session_and_layout');
        console.log("Replace response", ReplaceResponse);
        _.each(Results, function(result){
            const CurrentDiagramId = result._id;
            ResultsJson = updateSession(ResultsJson, CurrentDiagramId, ReplaceResponse);
            Session.set('ResultsJson', ResultsJson);
            LayoutElements(CurrentDiagramId);
        })
        console.timeEnd('update_session_and_layout');
    }); 
}