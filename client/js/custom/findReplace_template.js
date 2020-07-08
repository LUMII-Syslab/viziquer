Template.replaceResults.helpers({

    ResultsJson: function() {
        return Session.get("ResultsJson");
    }
});
Template.replaceResults.events({
    'click .replace': function(){
        //replace all occurences
        console.log("replace all matches")
    },
    'click #selectMatch': function(){
        // replace selected occurence
        console.log("replace selected match", this.elements)
        Utilities.callMeteorMethod("replaceOneNode",this.elements, function(response){
            
        })
    },
    'click #highlightMatch': function(){
        // highlight selected match
        console.log("highlight match", this)
    }
})