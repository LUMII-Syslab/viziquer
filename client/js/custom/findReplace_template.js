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
        console.log("replace all matches")
        if( _.size(_.first(this.matches).elements) > 1){
            console.log('not implemented case')
        }
        else{
            Utilities.callMeteorMethod("replaceOneNodeManyOccurences",this.matches, function(response){
            
            })
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
        /*
        Utilities.callMeteorMethod("replaceStructure",this, function(response){

        })
       */
    },
    'click #highlightMatch': function(){
        // highlight selected match
        console.log("highlight match", this)
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