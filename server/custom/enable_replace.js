Meteor.methods({
    EnableReplace: function(list) {
        
        let ExtensionJSON = {};
        let fs = Npm.require('fs');
        
        fs.readFile('/Viziquer/viziquer/jsons/FindReplaceExtension.json', 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }

        data = JSON.parse(data);
        list.data = data;
    });
    let FindReplaceElement = ElementTypes.findOne({name: "FindReplaceElement", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    let RemoveElement      = ElementTypes.findOne({name: "RemoveElement", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    let FindReplaceLink    = ElementTypes.findOne({name: "FindReplaceLink", diagramId: list.diagramId, diagramTypeId: list.diagramTypeId});
    if( typeof FindReplaceElement === 'undefined' && 
        typeof FindReplaceLink    === 'undefined' &&
        typeof RemoveElement      === 'undefined'){
            Meteor.call("importFindReplaceElements", list);
        }
    else console.log("FindReplace are already enabled");
    }
})