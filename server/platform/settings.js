Meteor.methods({
    getEnvVariable: function(name) {
        if ([
            'SCHEMA_SERVER_URL',
        ].includes(name)) {
            return process.env[name];
        }
    }
});
