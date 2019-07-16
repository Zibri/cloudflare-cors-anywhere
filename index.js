/*
CORS Anywhere as a Cloudflare Worker!
(c) 2019 by Zibri (www.zibri.org)
email: zibri AT zibri DOT org
https://github.com/Zibri/cloudflare-cors-anywhere
*/


whitelist = [ "^http.?://www.zibri.org$", "zibri.org$", "test\\..*" ];  // regexp for whitelisted urls

function isWhitelisted(uri) {
    var ret=false;
    if (typeof uri == "string") {
        whitelist.forEach((m)=>{
	          if (uri.match(m)!=null) ret=true;
        });
    } else {         // decide what to do when Origin is null
    	  ret=true;    // true accepts null origins false rejects them.
    }
    return ret;
}

addEventListener("fetch", async event=>{
    event.respondWith((async function() {
        var origin_url = new URL(event.request.url);

        function fix(myHeaders) {
            myHeaders.set("Access-Control-Allow-Origin", "*");
            acrh = event.request.headers.get("access-control-request-headers");

            if (acrh) {
                myHeaders.set("Access-Control-Allow-Headers", acrh);
                myHeaders.set("Access-Control-Allow-Credentials", "true");
            }

            myHeaders.delete("X-Content-Type-Options");
            return myHeaders;
        }
        var fetch_url = unescape(origin_url.search.substr(1));
        var orig = event.request.headers.get("Origin");
        if (isWhitelisted(orig)) {
            if (origin_url.search.startsWith("?")) {
                var response = await fetch(fetch_url,event.request);
                var myHeaders = new Headers(response.headers);
                myHeaders = fix(myHeaders);

                var body = await response.arrayBuffer();
                var init = {
                    headers: myHeaders
                };
                return new Response(body,init);

            } else {
                var myHeaders = new Headers();
                myHeaders = fix(myHeaders);

                if (typeof event.request.cf != "undefined") {
                    if (typeof event.request.cf.country != "undefined") {
                        country = event.request.cf.country;
                    } else
                        country = false;

                    if (typeof event.request.cf.colo != "undefined") {
                        colo = event.request.cf.colo;
                    } else
                        colo = false;
                } else {
                    country = false;
                    colo = false;
                }

                return new Response(
                    "CLOUDFLARE-CORS-ANYWHERE\n\n"
                    + "Source:\nhttps://github.com/Zibri/cloudflare-cors-anywhere\n\n"
                    + "Usage:\n" 
                    + origin_url.origin + "/?uri\n\n" 
                    + "Limits: 100,000 requests/day\n" 
                    + "          1,000 requests/10 minutes\n\n" 
                    + (orig != null ? "Origin: " + orig + "\n" : "") 
                    + "Ip: " + event.request.headers.get("CF-Connecting-IP") + "\n" 
                    + (country ? "Country: " + country + "\n" : "") 
                    + (colo ? "Datacenter: " + colo + "\n" : "") 
                    + "\n",{status: 200, headers: myHeaders}
                    );
            }
          } else {
          	return new Response('403 Forbidden',{status: 403});
          }
    }
    )());
});
