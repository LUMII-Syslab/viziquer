Meteor.methods({
    getEnvVariable: function(name) {
        if ([
            'SCHEMA_SERVER_URL',
        ].includes(name)) {
            console.log(`env ${name} requested; returning ${process.env[name]}`)
            return process.env[name];
        }
    }
});
