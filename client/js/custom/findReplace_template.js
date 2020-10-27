Template.replaceResults.helpers({

    ResultsJson: function() {
        return Session.get("ResultsJson");
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
        const CurrentDiagramId = this.diagramId;
        if( !(typeof this === 'undefined') || _.size(this) ) {
            
            Utilities.callMeteorMethod('replaceAllOccurencesInDiagram', this, function(response){
                let ResultsJson = Session.get('ResultsJson');
                ResultsJson     = updateSession(ResultsJson,CurrentDiagramId, response);
                Session.set('ResultsJson', ResultsJson);
            });
            LayoutElements(CurrentDiagramId);
        }
    },
    'click #selectMatch': function(){
        // replace selected occurence
        console.log("replace selected match");
        let matchId = this.id;
        console.log("match",this);
        let elementsToLookup = _.flatten(_.map(this.match, function(matchItem){
            return _.map(matchItem.elements, function(element){
                return element.elementId;
            })
        }));// elementi, kurus jāmeklē citos matchos, lai pārbaudītu ka match nav konfiktējošs
        
        let UpdateStatus = Session.get('ResultsJson');
        _.each(UpdateStatus, function(diagramItems){
            _.each(diagramItems.matches, function(match){
                if(match.id == matchId) match.status = 'used';
            })
        });
        UpdateStatus = markConflictingMatches(UpdateStatus, elementsToLookup);
        Session.set('ResultsJson', UpdateStatus);
        
        Utilities.callMeteorMethod("replaceSingleOccurence",this, function(response){
            LayoutElements(Session.get('activeDiagram'));
        });
    },
    'click #highlightMatch': function() {
        // highlight selected match
        console.log('match: ',this);
        Session.set('foundMatchElements', [this]);
    },
    'click #highlightAll' : function() {
        Session.set('foundMatchElements', [this] );
    },
    'click #clearResults' : function() {
        Session.set('ResultsJson', [] );
    },
    'click #replaceInAllDiagrams' : function(){
        let Results = Session.get('ResultsJson');
        if( _.size(Results) ){
            _.each(Results, function(ResultItem){
                const CurrentDiagramId = ResultItem.diagramId;
                
                Utilities.callMeteorMethod('replaceAllOccurencesInDiagram', ResultItem, function(response){

                    let ResultsJson = Session.get('ResultsJson');
                    ResultsJson = updateSession(ResultsJson, CurrentDiagramId, response);
                    Session.set('ResultsJson', ResultsJson);
                }); 
                LayoutElements(CurrentDiagramId);
            })
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
                    
        if(diagramItem.diagramId == CurrentDiagramId){
            
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