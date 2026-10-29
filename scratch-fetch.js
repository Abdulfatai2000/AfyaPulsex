const http = require('http');

http.get('http://localhost:3000/officer/map', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.log('Error:', res.statusCode);
      console.log(data);
    } else {
      console.log('Success, response length:', data.length);
    }
  });
}).on('error', (err) => console.error(err));
