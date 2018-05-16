const { Client } = require('pg');
import express = require('express');
import validUrl = require('valid-url');


const app = express();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
client.connect();

console.log('Connected to ' + process.env.DATABASE_URL);


function find(shortURL: string, callback: (err: boolean, row: any) => void) {
  const text = 'SELECT * FROM urls WHERE shortURL = $1';
  client.query(text, [ shortURL ], (err: any, res: any) => {
    if (err) {
      callback(err, undefined);
    } else if (res) {
      if (res.rows.length) {
        callback(false, res.rows[0]);
      } else {
        callback(true, undefined);
      }
    }
  });
}
function reverseFind(longURL: string, callback: (err: boolean, row: any) => void) {
  const text = 'SELECT * FROM urls WHERE longURL = $1;';
  client.query(text, [ longURL ], (err: any, res: any) => {
    if (err) {
      callback(err, undefined);
    } else if (res) {
      if (res.rows.length) {
        callback(false, res.rows[0]);
      } else {
        callback(true, undefined);
      }
    }
  });
}

function shorten(longURL: string, callback: (err: boolean, shortURL: string) => void) {
  // verify the URL
  if (!validUrl.isWebUri(longURL)) {
    return callback(true, undefined);
  }
  // see if the URL has already been shortened
  reverseFind(longURL, (err, row) => {
    if (!err) {
      return callback(false, row.shorturl);
    }
    // see if there is room in the database
    client.query('SELECT COUNT(*) FROM urls;', (err: any, res: any) => {
      if (err) {
        return callback(err, undefined);
      }
      const count = parseInt(res.rows[0].count);
      if (count >= 10000) {
        return callback(true, undefined);
      }
      // shorten the URL
      const linkNo = `0000${count.toString(10)}`.substr(-4);
      const text = 'INSERT INTO urls(longURL, shortURL) VALUES($1, $2) RETURNING *';
      const values = [ longURL, linkNo ];
      client.query(text, values, (err: any, res: any) => {
        if (err) {
          console.log(err.stack);
          return callback(true, undefined);
        }
        return callback(false, res.rows[0].shorturl);
      });
    });
  });
}

app.get(/\/shorten\/(.*)/, (req, res) => {
  const longURL = req.params[0];
  shorten(longURL, (err, shortURL) => {
    if (err) {
      res.sendStatus(400);
    } else {
      res.send(`${req.headers.host}/${shortURL}`);
    }
  });
});
app.get('/:shortURL/', (req, res) => {
  const shortURL = req.params.shortURL;
  find(shortURL, (err, row) => {
    if (err) {
      console.log(err);
      res.sendStatus(404);
    } else {
      res.redirect(row.longurl);
    }
  });
});

app.listen(process.env.PORT, () =>
  console.log(`Running on http://localhost:${process.env.PORT}/`));

