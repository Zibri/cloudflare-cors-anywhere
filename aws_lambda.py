import json
import re
from requests import Request, Session
import base64
from urllib.parse import urlparse

blacklist = []
whitelist = [ '.*' ]

def isListed(uri, listing):
    for i in listing:
        if re.search(i, 'uri'):
            return True
    return False

def lambda_handler(event, context):
    try:
        method = event['requestContext']['http']['method']
        origin = event['headers'].get('origin')
        cIp = event['headers'].get('x-forwarded-for')
    except KeyError:
        return {'body': json.dumps('This is for HTTP CORS proxy')}
    
    isOPTIONS = method == 'OPTIONS'
    
    def fix(myHeaders):
        myHeaders['Access-Control-Allow-Origin'] = event['headers'].get('origin')
        
        if(isOPTIONS):
            myHeaders['Access-Control-Allow-Methods'] = event['headers'].get('access-control-request-method')
            arch = event['headers'].get('access-control-request-headers')
            
            if arch:
                myHeaders['Access-Control-Allow-Headers'] = arch
            
            myHeaders.pop('X-Content-Type-Options', default=None)
        
        return myHeaders
    
    fetch_url = event['pathParameters'].get('path')
    if event.get('rawQueryString') is not None and event.get('rawQueryString') != '':
        fetch_url += '?' + event.get('rawQueryString')
    
    fetch_url = fetch_url.replace(r':/', r'://', 1)
        
    orig = event['headers'].get('origin', '')
    
    remIp = cIp
    
    if not isListed(fetch_url, blacklist) and isListed(orig, whitelist):
        xheaders = event['headers'].get('x-cors-headers', None)
        
        if xheaders is not None:
            try:
                xheaders = json.loads(xheaders)
            except:
                xheaders = None
        
        if(event.get('rawPath').startswith('/')):
            recv_headers = {};
            for key in event['headers']:
                if (re.match('(?i)^origin', key) == None and
                re.match('(?i)eferer', key) == None and
                re.match('(?i)host', key) == None and
                re.match('(?i)x-forw', key) == None and
                re.match('(?i)x-cors-headers', key) == None):
                    recv_headers[key] = event['headers'][key]
            
            if xheaders is not None:
                for key in xheaders:
                   recv_headers[key] = event['headers'][key]
            
            with Session() as sess:
                newreq = Request(event['requestContext']['http']['method'], fetch_url, params = event.get('queryStringParameters'), headers = recv_headers)
                
                prepared = sess.prepare_request(newreq)
                
                if event.get('isBase64Encoded') == True:
                    prepared.body = base64.b64decode(event.get('body'))
                elif event.get('body', None) is not None:
                    prepared.body = event.get('body')
                
                response = sess.send(prepared)
            myHeaders = response.headers
                
            cors_headers = []
            allh = {}
                
            for key in myHeaders:
                cors_headers.append(key)
                allh[key] = myHeaders[key]
               
                cors_headers.append('cors-received-headers')
                myHeaders = fix(myHeaders)
               
                myHeaders['Access-Control-Expose-Headers'] = ','.join(cors_headers)
                myHeaders['cors-received-headers'] = json.dumps(dict(allh))
               
                if isOPTIONS:
                    body = None
                else:
                    body = response.content
                
                return {
                    'isBase64Encoded': True,
                    'statusCode': 200 if isOPTIONS else response.status_code,
                    'body' : '' if isOPTIONS else base64.b64encode(body),
                    'headers' : dict(myHeaders),
                }
