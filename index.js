addEventListener("fetch", async event => {
    event.respondWith(
        (async function () {
            var origin_url = new URL(event.request.url);
            if (origin_url.search.startsWith("?")) {
                var fetch_url = unescape(origin_url.search.substr(1));
                var response = await fetch(fetch_url,event.request);                
                var myHeaders = new Headers(response.headers);
                myHeaders.set("Access-Control-Allow-Origin", "*");
                acrh = event.request.headers.get("access-control-request-headers");
                if (acrh) {
                myHeaders.set("Access-Control-Allow-Headers", acrh);
                myHeaders.set("Access-Control-Allow-Credentials", "true");
                }
                myHeaders.delete("X-Content-Type-Options");
                var body = await response.arrayBuffer();
                var init = { headers: myHeaders }
                return new Response(body, init)
            } else {
                var myHeaders = new Headers();
                myHeaders.set("Access-Control-Allow-Origin", "*");
                acrh = event.request.headers.get("access-control-request-headers");
                if (acrh) {
                myHeaders.set("Access-Control-Allow-Headers", acrh);
                myHeaders.set("Access-Control-Allow-Credentials", "true");
                }
                myHeaders.delete("X-Content-Type-Options");
                return new Response(
                    "Usage\n"
                    + origin_url.origin
                    + "/?uri\n\n"
                    + "Limits: 100,000 requests/day\n"
                    + "          1,000 requests/10 minutes\n\n"
                    + "Origin: "+event.request.headers.get("Origin"),
                    { status: 200,headers: myHeaders });
            }
        })()
    ) 
})
