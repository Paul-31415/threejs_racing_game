//
import { fastify } from 'fastify';
import path from 'path';
import fastifyStatic from 'fastify-static';

const runfiles: NodeRequire = require(process.env['BAZEL_NODE_RUNFILES_HELPER']!);

const PORT = 8080;
const server = fastify();

server.register(fastifyStatic, {
    prefix: "/external/npm/node_modules",
    root: path.join(__dirname, "node_modules"),
});

server.register(fastifyStatic, {
    root: __dirname,
    decorateReply: false,
});


server.listen(PORT, "0.0.0.0", (err, address) => {
    if (err) {
        throw err;
    }
    console.log(`devserver started on ${address}`);
});





