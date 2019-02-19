'use strict';

const Joi                                = require('joi');
const Hoek                               = require('hoek');
const { Client } = require('elasticsearch');

const Pkg = require('../package');

const internals = {
    defaults : {
        indices       : [],
        configuration : {
            host : 'localhost:9200'
        }
    }
};

internals.schema = {
    indices       : Joi.array().items(Joi.string()),
    configuration : Joi.object({
        host                       : Joi.alternatives().try([Joi.string(), Joi.array().items(Joi.string()), Joi.array().items(Joi.object())]),
        hosts                      : Joi.alternatives().try([Joi.string(), Joi.array().items(Joi.string()), Joi.array().items(Joi.object())]),
        httpAuth                   : Joi.string(),
        log                        : Joi.alternatives()
            .try([Joi.string(), Joi.array().items(Joi.string()), Joi.object(), Joi.array().items(Joi.object())]),
        apiVersion                 : Joi.string()
            .valid(['6.6', '6.5', '6.4', '6.3', '6.2', '6.1', '6.0', '5.6', '2.4', '1.7', '0.90', '6.7', '7.0', '7.x', 'master']),
        plugins                    : Joi.array().items(Joi.func()),
        sniffOnStart               : Joi.boolean(),
        sniffInterval              : Joi.number().valid(false),
        sniffOnConnectionFault     : Joi.boolean(),
        maxRetries                 : Joi.number().integer(),
        requestTimeout             : Joi.number(),
        deadTimeout                : Joi.number(),
        pingTimeout                : Joi.number(),
        maxSockets                 : Joi.number(),
        keepAlive                  : Joi.boolean(),
        keepAliveInterval          : Joi.number(),
        keepAliveMaxFreeSockets    : Joi.number(),
        keepAliveFreeSocketTimeout : Joi.number(),
        suggestCompression         : Joi.boolean(),
        connectionClass            : Joi.string(),
        sniffedNodesProtocol       : Joi.string(),
        ssl                        : Joi.object({
            pfx                : Joi.alternatives().try([Joi.string(), Joi.array().items(Joi.string())]),
            key                : Joi.string(),
            passphrase         : Joi.string(),
            cert               : Joi.string(),
            ca                 : Joi.alternatives().try([Joi.string(), Joi.array().items(Joi.string())]),
            ciphers            : Joi.string(),
            rejectUnauthorized : Joi.boolean(),
            secureProtocol     : Joi.string()
        }),
        selector                   : Joi.alternatives().try([Joi.string().valid(['roundRobin', 'random']), Joi.func()]),
        defer                      : Joi.func(),
        nodesToHostCallback        : Joi.func(),
        createNodeAgent            : Joi.func()
    }).oxor('host', 'hosts')
};

module.exports.plugin = {
    pkg      : Pkg,
    register : (server, options) => {

        const settings = Hoek.applyToDefaults(internals.defaults, options);

        Joi.assert(settings, internals.schema, 'Invalid ElasticSearch configuration');

        const client = new Client(Hoek.clone(settings.configuration));

        server.decorate('server', 'elasticsearch', client);
        server.decorate('request', 'elasticsearch', client);

        server.ext('onPreStart', async () => {

            for (const index of settings.indices) {

                if (!(await client.indices.exists({ index }))) {

                    await client.indices.create({ index });
                }
            }
        });
    }
};
