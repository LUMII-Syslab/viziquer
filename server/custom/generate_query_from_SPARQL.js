

Meteor.methods({
	parseSPARQLText: function(text) {
		var SparqlParser = Npm.require('sparqljs').Parser;
		var parser = new SparqlParser();

		var fs = Npm.require('fs');
		//var text = fs.readFileSync('C:/Users/Julija/Desktop/ViziQuer/ViziQuerWeb/SPARQL_ViziQuer/SPARQL_text.txt','utf8')
		//var text = fs.readFileSync('E:/ViziQuer/ViziQuer_web/SPARQL_to_ViziQuer/SPARQL_text.txt','utf8')
		var parsedQuery = parser.parse(text);

		// fs.writeFile('C:/Users/Julija/Desktop/ViziQuer/ViziQuerWeb/SPARQL_ViziQuer/parsedSparql.json', JSON.stringify(parsedQuery, 0, 2), 'utf8');
		// fs.writeFile('E:/ViziQuer/ViziQuer_web/SPARQL_to_ViziQuer/parsedSparql.json', JSON.stringify(parsedQuery, 0, 2), 'utf8');
		return parsedQuery;
	},
});
