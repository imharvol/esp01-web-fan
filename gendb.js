const path = require('path')
const Database = require('better-sqlite3') // https://github.com/JoshuaWise/better-sqlite3/blob/HEAD/docs/api.md

const dbPath = path.join(__dirname, 'db.sqlite')
const db = new Database(dbPath, { verbose: console.log })

db.exec(`
CREATE TABLE "captchas" (
    "token" TEXT,
    "valid" INTEGER NOT NULL,
    "uses"  INTEGER NOT NULL,
    "generatedBy"   INTEGER NOT NULL,
    "timestamp"   INTEGER NOT NULL,
    PRIMARY KEY("token")
);

CREATE TABLE "actions" (
    "id"    INTEGER PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "dedicatoria" TEXT NOT NULL,
    "activated" INTEGER NOT NULL,
    "red" INTEGER NOT NULL,
    "green" INTEGER NOT NULL,
    "blue" INTEGER NOT NULL,
    "timestamp"   INTEGER NOT NULL,
    "captcha"   TEXT NOT NULL,
    FOREIGN KEY("captcha") REFERENCES "captchas"("token")
);
`)
