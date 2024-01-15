import { Mongo } from 'meteor/mongo';
 
// Custom collections
const Schema = new Mongo.Collection("Schema");
const Services = new Mongo.Collection("Services");

const VQ_sparql_logs = new Mongo.Collection("VQ_Exec_SPARQL_Logs");

export {
	Schema,
	Services,
  VQ_sparql_logs,
}
