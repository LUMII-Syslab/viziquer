

Meteor.methods({
	parseSPARQLText: function(text) {
		var SparqlParser = Npm.require('sparqljs').Parser;
		var parser = new SparqlParser();

		//var fs = Npm.require('fs');
		//var text = fs.readFileSync('C:/Users/Julija/Desktop/ViziQuer/ViziQuerWeb/SPARQL_ViziQuer/SPARQL_text.txt','utf8')
		//var text = fs.readFileSync('E:/ViziQuer/ViziQuer_web/SPARQL_to_ViziQuer/SPARQL_text.txt','utf8')
		var parsedQuery = parser.parse(text);

		// fs.writeFile('C:/Users/Julija/Desktop/ViziQuer/ViziQuerWeb/SPARQL_ViziQuer/parsedSparql.json', JSON.stringify(parsedQuery, 0, 2), 'utf8');
		// fs.writeFile('E:/ViziQuer/ViziQuer_web/SPARQL_to_ViziQuer/parsedSparql.json', JSON.stringify(parsedQuery, 0, 2), 'utf8');
		return parsedQuery;
	},
	
	
	
	parseExpressionForCompletions: function(data) {
		console.log(data["cls"]);
		var peg = Npm.require('pegjs');
		
		var classNames = [];
		for(var key in data["cls"]){
			classNames.push('"'+data["cls"][key]["name"]+'"');
		}
		console.log(classNames);
		
		try {
					
					// CharRange = start:[a-z] "-" end:[a-z] {
						// if (end.charCodeAt(0) < start.charCodeAt(0)) {
						  // expected("valid character range");
						  // return;
						// }

						// return {
						  // start: start,
						  // end:   end
						// };
					  // }
					
					var grammar = [
							'start = exp ',
							'exp     = factor (factorOp factor)*',
							'factor = term (termOp term)*',
							'term = number / ( variable) /  "(" exp  ")" / reference',
							'factorOp = ( "+") / ( "-")',
							'termOp =  ( "*") / ( "/")',
							'number = [0-9]+' ,
							'reference = ref "." attr',
							'variable = var:(([a-zA-Z] / "_") ([a-zA-Z] / "_" / [0-9])*){',
								'if(true){expected("valid character range"); return;}',
								'return var',
							'}',
							//'variable = ' + classNames.join(" / "),
						].join("\n");
				
					var parser = peg.generate(grammar);
					//var parser = PEG.buildParser(grammar);
					//console.log(parser.parse("aaa+"));
					
					return parser.parse("Registration+");
				
				}
				catch(err) {
					return err;
				}
	},
	
	
	
});
