import http from 'http';

const server = http.createServer((req, res) => {
  res.end('ok');
});

server.listen(3000, '127.0.0.1', (err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('listening on 3000');
});