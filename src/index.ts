const { Pool, Client } = require('pg');
import express = require('express');



function shorten(longURL: string): string {
  
}

const app = express();
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

app.get('/shorten/:url/', (req, res) => {
  const url = shorten(req.params.url);
  if (url) {
    res.send(url);
  } else {
    res.sendStatus(400);
  }
});

