/*
CORS Anywhere as a Cloudflare Worker!
(c) 2019 by Zibri (www.zibri.org)
email: zibri AT zibri DOT org
https://github.com/Zibri/cloudflare-cors-anywhere

This Cloudflare Worker script acts as a CORS proxy that allows
cross-origin resource sharing for specified origins and URLs.
It handles OPTIONS preflight requests and modifies response headers accordingly to enable CORS.
The script also includes functionality to parse custom headers and provide detailed information
about the CORS proxy service when accessed without specific parameters.
The script is configurable with whitelist and blacklist patterns, although the blacklist feature is currently unused.
The main goal is to facilitate cross-origin requests while enforcing specific security and rate-limiting policies.
*/

// Configuration: Whitelist and Blacklist (not used in this version)
// whitelist = [ "^http.?://www.zibri.org$", "zibri.org$", "test\\..*" ];  // regexp for whitelisted urls
blacklist = [ ];           // regexp for blacklisted urls
whitelist = [ ".*" ];      // regexp for whitelisted origins

// Function to check if a given URI or origin is listed in the whitelist or blacklist
function isListed(uri, listing) {
    var ret = false;
    if (typeof uri == "string") {
        // Iterate through each pattern in the listing to match against the URI
        listing.forEach((m) => {
            if (uri.match(m) != null) {
                ret = true; // Set to true if URI matches any pattern in the listing
            }
        });
    } else {
        // If URI is null (e.g., when Origin header is missing), decide based on the implementation
        ret = true; // In this case, true accepts null origins, false would reject them
    }
    return ret;
}

// Event listener for incoming fetch requests
addEventListener("fetch", async event => {
    event.respondWith((async function() {
        // Determine if the incoming request is an OPTIONS preflight request
        isOPTIONS = (event.request.method == "OPTIONS");
        
        // Extract the origin URL from the incoming request
        var origin_url = new URL(event.request.url);

        // Function to modify headers to enable CORS
        function fix(myHeaders) {
            myHeaders.set("Access-Control-Allow-Origin", event.request.headers.get("Origin"));
            if (isOPTIONS) {
                myHeaders.set("Access-Control-Allow-Methods", event.request.headers.get("access-control-request-method"));
                acrh = event.request.headers.get("access-control-request-headers");

                if (acrh) {
                    myHeaders.set("Access-Control-Allow-Headers", acrh);
                }

                myHeaders.delete("X-Content-Type-Options"); // Remove X-Content-Type-Options header
            }
            return myHeaders;
        }

        // Extract the fetch URL from the query parameter of the origin URL
        var fetch_url = decodeURIComponent(decodeURIComponent(origin_url.search.substr(1)));

        // Extract the Origin and CF-Connecting-IP headers from the incoming request
        var orig = event.request.headers.get("Origin");
        var remIp = event.request.headers.get("CF-Connecting-IP");

        // Check if the fetch URL is not blacklisted and the origin is whitelisted
        if ((!isListed(fetch_url, blacklist)) && (isListed(orig, whitelist))) {
            // Extract additional custom headers (x-cors-headers) from the incoming request
            xheaders = event.request.headers.get("x-cors-headers");

            // Parse the x-cors-headers if present
            if (xheaders != null) {
                try {
                    xheaders = JSON.parse(xheaders);
                } catch (e) {}
            }

            // Handle different scenarios based on the query parameters of the origin URL
            if (origin_url.search.startsWith("?")) {
                // Construct new headers excluding certain headers from the original request
                recv_headers = {};
                for (var pair of event.request.headers.entries()) {
                    if (
                        (pair[0].match("^origin") == null) &&
                        (pair[0].match("eferer") == null) &&
                        (pair[0].match("^cf-") == null) &&
                        (pair[0].match("^x-forw") == null) &&
                        (pair[0].match("^x-cors-headers") == null)
                    ) {
                        recv_headers[pair[0]] = pair[1];
                    }
                }

                // Append x-cors-headers to the received headers if present
                if (xheaders != null) {
                    Object.entries(xheaders).forEach((c) => (recv_headers[c[0]] = c[1]));
                }

                // Create a new request based on the modified headers
                newreq = new Request(event.request, {
                    redirect: "follow",
                    headers: recv_headers
                });

                // Perform the fetch operation to the specified fetch_url
                var response = await fetch(fetch_url, newreq);
                var myHeaders = new Headers(response.headers);
                cors_headers = [];
                allh = {};
                for (var pair of response.headers.entries()) {
                    cors_headers.push(pair[0]);
                    allh[pair[0]] = pair[1];
                }
                cors_headers.push("cors-received-headers");
                myHeaders = fix(myHeaders);

                // Manipulate response headers to include CORS-related headers
                myHeaders.set("Access-Control-Expose-Headers", cors_headers.join(","));
                myHeaders.set("cors-received-headers", JSON.stringify(allh));

                // Prepare the final response with appropriate status and body
                var init = {
                    headers: myHeaders,
                    status: isOPTIONS ? 200 : response.status,
                    statusText: isOPTIONS ? "OK" : response.statusText
                };
                return new Response(body, init);

            } else {
                // Generate a response when no query parameter is specified in the origin URL
                var myHeaders = new Headers();
                myHeaders = fix(myHeaders);

                // Extract country and datacenter information from Cloudflare if available
                if (typeof event.request.cf != "undefined") {
                    var country = event.request.cf.country || false;
                    var colo = event.request.cf.colo || false;
                } else {
                    var country = false;
                    var colo = false;
                }

                // Return a response with CORS-related information
                return new Response(
                    "CLOUDFLARE-CORS-ANYWHERE\n\n" +
                    "Source:\nhttps://github.com/Zibri/cloudflare-cors-anywhere\n\n" +
                    "Usage:\n" +
                    origin_url.origin + "/?uri\n\n" +
                    "Donate:\nhttps://paypal.me/Zibri/5\n\n" +
                    "Limits: 100,000 requests/day\n" +
                    "          1,000 requests/10 minutes\n\n" +
                    (orig != null ? "Origin: " + orig + "\n" : "") +
                    "Ip: " + remIp + "\n" +
                    (country ? "Country: " + country + "\n" : "") +
                    (colo ? "Datacenter: " + colo + "\n" : "") +
                    "\n" +
                    (xheaders != null ? "\nx-cors-headers: " + JSON.stringify(xheaders) : ""),
                    {
                        status: 200,
                        headers: myHeaders
                    }
                );
            }
        } else {
            // Return a forbidden response for requests that are not allowed
            return new Response(
                "Create your own CORS proxy</br>\n" +
                "<a href='https://github.com/Zibri/cloudflare-cors-anywhere'>https://github.com/Zibri/cloudflare-cors-anywhere</a></br>\n" +
                "\nDonate</br>\n" +
                "<a href='https://paypal.me/Zibri/5'>https://paypal.me/Zibri/5</a>\n",
                {
                    status: 403,
                    statusText: 'Forbidden',
                    headers: {
                        "Content-Type": "text/html"
                    }
                }
            );
        }
    })());
});
