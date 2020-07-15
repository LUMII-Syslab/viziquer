Template.replaceResults.helpers({

    ResultsJson: function() {
        return Session.get("ResultsJson");
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
        console.log("replace selected match", this.elements)
        if(_.size(this.elements) > 1){
            console.log('not implemented case, size', _.size(this.elements))
        }
        else{
            Utilities.callMeteorMethod("replaceOneNode",_.first(this.elements), function(response){
            
            })
        }
    },
    'click #highlightMatch': function(){
        // highlight selected match
        console.log("highlight match", this)
    }
})