#!/usr/bin/env node
/* Apply schema.sql from the os2514-db package using psql. */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function main() {
    let pkgPath;
    try {
        pkgPath = require.resolve('os2514-db/package.json');
    } catch (e) {
        console.error('Could not resolve package: os2514-db');
        console.error('Make sure workspaces are installed (npm i at repo root).');
        process.exit(1);
    }

    const dbDir = path.dirname(pkgPath);
    const schema = path.join(dbDir, 'schema.sql');
    if (!fs.existsSync(schema)) {
        console.error('schema.sql not found at:', schema);
        process.exit(1);
    }

    const user = process.env.PG_USER || 'postgres';
    const database = process.env.PG_DATABASE || 'soccer_game';
    const host = process.env.PG_HOST;
    const port = process.env.PG_PORT;

    const args = [];
    if (host) args.push('-h', host);
    if (port) args.push('-p', String(port));
    args.push('-U', user, '-d', database, '-f', schema);

    const result = spawnSync('psql', args, { stdio: 'inherit' });
    if (result.error) {
        console.error('Failed to run psql:', result.error.message);
        process.exit(1);
    }
    process.exit(result.status ?? 0);
}

main();
