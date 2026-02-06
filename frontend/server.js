const express = require('express');
const path = require('path');

const parsedPort = process.env.PORT ? Number(process.env.PORT) : NaN;
const port = Number.isNaN(parsedPort) ? 5173 : parsedPort;

const app = express();
const publicDir = __dirname;

app.use(express.static(publicDir));

app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
    console.log(`Frontend servido en http://localhost:${port}`);
});
