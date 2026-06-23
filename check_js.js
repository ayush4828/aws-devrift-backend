const https = require('https');
https.get('https://devrift.in', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const match = d.match(/\/assets\/index-[^\.]+\.js/);
    if (match) {
      https.get('https://devrift.in' + match[0], r2 => {
        let d2 = '';
        r2.on('data', c => d2 += c);
        r2.on('end', () => {
          const apiUrls = d2.match(/https:\/\/api\.devrift\.in/g);
          const devUrls = d2.match(/https:\/\/devrift\.in/g);
          const localUrls = d2.match(/http:\/\/localhost:3000/g);
          console.log('Found API URLs:', apiUrls ? apiUrls.length : 0);
          console.log('Found Local URLs:', localUrls ? localUrls.length : 0);
          console.log('Found Dev URLs:', devUrls ? devUrls.length : 0);
        });
      });
    } else {
      console.log('No JS file found');
    }
  });
});
