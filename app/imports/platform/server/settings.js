Meteor.methods({
  getEnvVariable: function (name) {
    // if (["VQ_SCHEMA_SERVER_URL", "VQ_FAAS_SERVER_URL"].includes(name)) {
    if (name.startsWith('VQ_') || name.startsWith('OWLGRED_')) {
      // console.log(`env ${name} requested; returning ${process.env[name]}`)
      return process.env[name];
    } else {
      console.log(`Requesting this variable is not permitted`);
      return '';
    }
  },
});
