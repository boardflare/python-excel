-- Migration number: 0001 	 2024-12-05T04:01:22.651Z

CREATE TABLE IF NOT EXISTS functions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created TEXT NOT NULL,
    modified TEXT NOT NULL,
    function TEXT
);