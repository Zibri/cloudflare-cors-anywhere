addEventListener("fetch", async event=>{
    event.respondWith((async function() {
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
            var init = {
                headers: myHeaders
            };
            return new Response(body,init);
        } else {
            var myHeaders = new Headers();
            myHeaders.set("Access-Control-Allow-Origin", "*");
            acrh = event.request.headers.get("access-control-request-headers");

            if (acrh) {
                myHeaders.set("Access-Control-Allow-Headers", acrh);
                myHeaders.set("Access-Control-Allow-Credentials", "true");
            }

            myHeaders.delete("X-Content-Type-Options");

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

            orig = event.request.headers.get("Origin");
            return new Response(
                "CF-CORS-ANYWHERE\n\n"
                + "Usage\n" 
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
    }
    )());
});
