Meteor.methods({
	json2csv: function(list) {
    var fields = list.fields;
    const Json2csvParser = Npm.require('json2csv').Parser;
    const json2csvParser = new Json2csvParser({ fields });
    var csv = json2csvParser.parse(list.json);
		return csv;
	},
});
