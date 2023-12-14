import { Mongo } from 'meteor/mongo';
 
// Custom collections
const TriplesMaps = new Mongo.Collection("TriplesMaps");
const Associations = new Mongo.Collection("Associations");
const Attributes = new Mongo.Collection("Attributes");
const Classes = new Mongo.Collection("Classes");
const Schema = new Mongo.Collection("Schema");
const Services = new Mongo.Collection("Services");

const VQ_sparql_logs = new Mongo.Collection("VQ_Exec_SPARQL_Logs");

export {
	Associations,
	Attributes,
	Classes,
	Schema,
	TriplesMaps,
	Services,
  VQ_sparql_logs,
}
