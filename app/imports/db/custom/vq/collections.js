import { Mongo } from 'meteor/mongo';

// Custom collections
// const Services = new Mongo.Collection("Services");

const VQ_sparql_logs = new Mongo.Collection("VQ_Exec_SPARQL_Logs");

// Per-user, per-schema set of property ids treated as "standard" by the BRP
// fragment algorithm. One document per (userId, schemaName).
const VQ_brp_standard_properties = new Mongo.Collection("VQ_BRP_Standard_Properties");

export {
	// Services,
  VQ_sparql_logs,
  VQ_brp_standard_properties,
}
