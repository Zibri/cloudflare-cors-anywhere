# cloudflare-cors-anywhere
Cloudflare CORS proxy in a worker.

CLOUDFLARE-CORS-ANYWHERE

Source:
https://github.com/Zibri/cloudflare-cors-anywhere

Demo:
https://test.cors.workers.dev

Post:
http://www.zibri.org/2019/07/your-own-cors-anywhere-proxy-on.html

Deploy workers:
https://workers.cloudflare.com/

Example:
```javascript
fetch('https://test.cors.workers.dev/?https://httpbin.org/post', {
  method: 'post',
  headers: { 'x-foo': 'bar', 'x-bar': 'foo', 'x-cors-headers': JSON.stringify({"additional_header": "value"}) }
}).then(r => {console.log(JSON.parse(r.headers.get("cors-received-headers")));return r.json()}).then(console.log)
```

Note:

All received headers are also returned in "cors-received-headers" header.
