

Meteor.methods({
	parseSPARQLText: async function(text) {	 
		try{
			let SparqlParser = Npm.require('sparqljs').Parser;
			let parser = new SparqlParser();
			let parsedQuery = parser.parse(text);
			return {status:"OK", parsedQuery:parsedQuery};
		} catch (err) {
			return {status:"ERROR", error:err.toString()};
		}
	},
	
	parseService: function(parsedQuery) {
		
		var query = {
			 "queryType": "SELECT",
			 "variables": [
				{
				  "termType": "Variable",
				  "value": "human"
				}
			 ],
			"prefixes": { "bd": "http://www.bigdata.com/rdf#",
				"cc": "http://creativecommons.org/ns#",
				"dct": "http://purl.org/dc/terms/",
				"geo": "http://www.opengis.net/ont/geosparql#",
				"ontolex": "http://www.w3.org/ns/lemon/ontolex#",
				"owl": "http://www.w3.org/2002/07/owl#",
				"p": "http://www.wikidata.org/prop/",
				"pq": "http://www.wikidata.org/prop/qualifier/",
				"pqn": "http://www.wikidata.org/prop/qualifier/value-normalized/",
				"pqv": "http://www.wikidata.org/prop/qualifier/value/",
				"pr": "http://www.wikidata.org/prop/reference/",
				"prn": "http://www.wikidata.org/prop/reference/value-normalized/",
				"prov": "http://www.w3.org/ns/prov#",
				"prv": "http://www.wikidata.org/prop/reference/value/",
				"ps": "http://www.wikidata.org/prop/statement/",
				"psn": "http://www.wikidata.org/prop/statement/value-normalized/",
				"psv": "http://www.wikidata.org/prop/statement/value/",
				"rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
				"rdfs": "http://www.w3.org/2000/01/rdf-schema#",
				"schema": "http://schema.org/",
				"skos": "http://www.w3.org/2004/02/skos/core#",
				"wd": "http://www.wikidata.org/entity/",
				"wdata": "http://www.wikidata.org/wiki/Special:EntityData/",
				"wdno": "http://www.wikidata.org/prop/novalue/",
				"wdref": "http://www.wikidata.org/reference/",
				"wds": "http://www.wikidata.org/entity/statement/",
				"wdt": "http://www.wikidata.org/prop/direct/",
				"wdtn": "http://www.wikidata.org/prop/direct-normalized/",
				"wdv": "http://www.wikidata.org/value/",
				"wikibase": "http://wikiba.se/ontology#",
				"xsd": "http://www.w3.org/2001/XMLSchema#",
			},
			"where": []
		}
		query.where.push(parsedQuery)
		
		// Regenerate a SPARQL query from a JSON object
		var SparqlGenerator = Npm.require('sparqljs').Generator;
		var generator = new SparqlGenerator({ /* prefixes, baseIRI, factory, sparqlStar */ });
		var generatedQuery = generator.stringify(query);

		return generatedQuery.substring(generatedQuery.indexOf("SERVICE"), generatedQuery.length-1);
	},
});
