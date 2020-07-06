Template.replaceResults.helpers({

    ResultsJson: function() {
        return Session.get("ResultsJson");
    }
});
Template.replaceResults.events({
    'click .replace': function(){
        Session.set("currentMatches",this.matches);
    }
})