//
import { fastify } from 'fastify';
import path from 'path';
import fastifyStatic from 'fastify-static';

const runfiles: NodeRequire = require(process.env['BAZEL_NODE_RUNFILES_HELPER']!);

const PORT = 8080;
const server = fastify();

console.log(__dirname);

server.register(fastifyStatic, {
    root: path.join(__dirname, 'game'),
});

server.listen(PORT, (err, address) => {
    if (err) {
        throw err;
    }
    console.log(`devserver started on ${address}`);
});





