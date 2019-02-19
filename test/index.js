'use strict';

const Code          = require('code');
const Lab           = require('lab');
const Hapi          = require('hapi');

const HapiElastic = require('../lib');

// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const { expect }       = Code;

const getServer = async (options = {}) => {

    const server = Hapi.server();

    await server.register({
        plugin : HapiElastic,
        options
    });

    return server;
};

const deleteIndex = async (client, index) => {

    if (await client.indices.exists({ index })) {

        await client.indices.delete({ index });
    }
};

describe('Plugin ', () => {

    it('should expose client on server', async () => {

        const server = await getServer();

        await server.initialize();

        expect(server.elasticsearch).to.be.an.object();
    });

    it('should expose client on request', async (flags) => {

        const server = await getServer();

        server.route({
            method  : 'get',
            path    : '/test',
            handler : flags.mustCall((request) => {

                expect(request.elasticsearch).to.be.an.object();

                return '';
            }, 1)
        });

        await server.inject('/test');
    });

    it('should create indices before start', async (flags) => {

        const indices = ['test', 'another'];

        const server = await getServer({ indices });

        flags.onCleanup = async () => {

            await Promise.all(indices.map((index) => deleteIndex(server.elasticsearch, index)));
        };

        expect(await server.elasticsearch.indices.exists({ index : indices })).to.be.false();

        await server.initialize();

        expect(await server.elasticsearch.indices.exists({ index : indices })).to.be.true();
    });

    it('should only create non existent indices', async (flags) => {

        const indices = ['test', 'another', 'already'];

        const server = await getServer({ indices });

        flags.onCleanup = async () => {

            await Promise.all(indices.map((index) => deleteIndex(server.elasticsearch, index)));
        };

        await server.elasticsearch.indices.create({ index : 'already' });

        expect(await server.elasticsearch.indices.exists({ index : ['test', 'another'] })).to.be.false();
        expect(await server.elasticsearch.indices.exists({ index : ['already'] })).to.be.true();

        await server.initialize();

        expect(await server.elasticsearch.indices.exists({ index : indices })).to.be.true();
    });

});
