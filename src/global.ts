const GlobalStatus = {
  // server: 'http://172.28.14.131:6001',
  server: "http://localhost:6001",
  localhost: "http://localhost:3000",
  localhost_server: "http://localhost:6001",
  cookieTag: "DjangoToken",
  anonymousPage: "login",
  anonymousPath: "anonymous",
  projectAuthAbandonPath: "project",
  serverPath: "/test/",
  methodColor: ["#009879", "#F6CA75", "#5C91E7", "#E27266"],
  colorList: [
    ["#009879", "#28c0a1"],
    ["#436363", "#2f4f4f"],
  ],
  lightColor: "#28c0a1",
  regular_type_info_map: () => {
    return {
      string: {
        color: "#43CD80",
      },
      integer: {
        color: "#00CED1",
      },
      boolean: {
        color: "#FF6A6A",
      },
      number: {
        color: "#DA70D6",
      },
      array: {
        color: "#FFC125",
      },
      object: {
        color: "#64A1F9",
      },
      null: {
        color: "#8B795E",
      },
      files: {
        color: "#9373ee",
      },
    }
  },
  regular_reqeust_method_info_map: () => {
    return {
      get: {
        color: "#43CD80",
      },
      post: {
        color: "#eead0e",
      },
      put: {
        color: "#1e90ff",
      },
      delete: {
        color: "#FF6A6A",
      },
      patch: {
        color: "#FFC125",
      }
    }
  },
  regular_content_type_map: () => {
    return [
      {
        value: "application/atom+xml",
        label: "application/atom+xml",
      },
      {
        value: "application/ecmascript",
        label: "application/ecmascript",
      },
      {
        value: "application/json",
        label: "application/json",
      },
      {
        value: "application/vnd.api+json",
        label: "application/vnd.api+json",
      },
      {
        value: "application/javascript",
        label: "application/javascript",
      },
      {
        value: "application/octet-stream",
        label: "application/octet-stream",
      },
      {
        value: "application/ogg",
        label: "application/ogg",
      },
      {
        value: "application/pdf",
        label: "application/pdf",
      },
      {
        value: "application/postscript",
        label: "application/postscript",
      },
      {
        value: "application/rdf+xml",
        label: "application/rdf+xml",
      },
      {
        value: "application/rss+xml",
        label: "application/rss+xml",
      },
      {
        value: "application/soap+xml",
        label: "application/soap+xml",
      },
      {
        value: "application/font-woff",
        label: "application/font-woff",
      },
      {
        value: "application/x-msgpack",
        label: "application/x-msgpack",
      },
      {
        value: "application/x-yaml",
        label: "application/x-yaml",
      },
      {
        value: "application/xhtml+xml",
        label: "application/xhtml+xml",
      },
      {
        value: "application/xml",
        label: "application/xml",
      },
      {
        value: "application/xml-dtd",
        label: "application/xml-dtd",
      },
      {
        value: "application/xop+xml",
        label: "application/xop+xml",
      },
      {
        value: "application/zip",
        label: "application/zip",
      },
      {
        value: "application/gzip",
        label: "application/gzip",
      },
      {
        value: "application/graphql",
        label: "application/graphql",
      },
      {
        value: "application/x-www-form-urlencoded",
        label: "application/x-www-form-urlencoded",
      },
      {
        value: "audio/basic",
        label: "audio/basic",
      },
      {
        value: "audio/L24",
        label: "audio/L24",
      },
      {
        value: "audio/mp4",
        label: "audio/mp4",
      },
      {
        value: "audio/mpeg",
        label: "audio/mpeg",
      },
      {
        value: "audio/ogg",
        label: "audio/ogg",
      },
      {
        value: "audio/vorbis",
        label: "audio/vorbis",
      },
      {
        value: "audio/vnd.rn-realaudio",
        label: "audio/vnd.rn-realaudio",
      },
      {
        value: "audio/vnd.wave",
        label: "audio/vnd.wave",
      },
      {
        value: "audio/webm",
        label: "audio/webm",
      },
      {
        value: "image/gif",
        label: "image/gif",
      },
      {
        value: "image/jpeg",
        label: "image/jpeg",
      },
      {
        value: "image/pjpeg",
        label: "image/pjpeg",
      },
      {
        value: "image/png",
        label: "image/png",
      },
      {
        value: "image/svg+xml",
        label: "image/svg+xml",
      },
      {
        value: "image/tiff",
        label: "image/tiff",
      },
      {
        value: "message/http",
        label: "message/http",
      },
      {
        value: "message/imdn+xml",
        label: "message/imdn+xml",
      },
      {
        value: "message/partial",
        label: "message/partial",
      },
      {
        value: "message/rfc822",
        label: "message/rfc822",
      },
      {
        value: "multipart/mixed",
        label: "multipart/mixed",
      },
      {
        value: "multipart/alternative",
        label: "multipart/alternative",
      },
      {
        value: "multipart/related",
        label: "multipart/related",
      },
      {
        value: "multipart/form-data",
        label: "multipart/form-data",
      },
      {
        value: "multipart/signed",
        label: "multipart/signed",
      },
      {
        value: "multipart/encrypted",
        label: "multipart/encrypted",
      },
      {
        value: "text/cmd",
        label: "text/cmd",
      },
      {
        value: "text/css",
        label: "text/css",
      },
      {
        value: "text/csv",
        label: "text/csv",
      },
      {
        value: "text/html",
        label: "text/html",
      },
      {
        value: "text/plain",
        label: "text/plain",
      },
      {
        value: "text/vcard",
        label: "text/vcard",
      },
      {
        value: "text/xml",
        label: "text/xml",
      }
    ]
  },
  regular_headers_map: () => {
    return [
      {
        value: "Accept",
        label: "Accept",
      },
      {
        value: "Accept-Charset",
        label: "Accept-Charset",
      },
      {
        value: "Accept-Encoding",
        label: "Accept-Encoding",
      },
      {
        value: "Accept-Language",
        label: "Accept-Language",
      },
      {
        value: "Access-Control-Request-Headers",
        label: "Access-Control-Request-Headers",
      },
      {
        value: "Access-Control-Request-Method",
        label: "Access-Control-Request-Method",
      },
      {
        value: "Authorization",
        label: "Authorization",
      },
      {
        value: "Cache-Control",
        label: "Cache-Control",
      },
      {
        value: "Content-MD5",
        label: "Content-MD5",
      },
      {
        value: "Content-Length",
        label: "Content-Length",
      },
      {
        value: "Content-Transfer-Encoding",
        label: "Content-Transfer-Encoding",
      },
      {
        value: "Content-Type",
        label: "Content-Type",
      },
      {
        value: "Cookie",
        label: "Cookie",
      },
      {
        value: "Date",
        label: "Date",
      },
      {
        value: "Expect",
        label: "Expect",
      },
      {
        value: "From",
        label: "From",
      },
      {
        value: "Host",
        label: "Host",
      },
      {
        value: "If-Match",
        label: "If-Match",
      },
      {
        value: "If-Modified-Since",
        label: "If-Modified-Since",
      },
      {
        value: "If-None-Match",
        label: "If-None-Match",
      },
      {
        value: "If-Range",
        label: "If-Range",
      },
      {
        value: "If-Unmodified-Since",
        label: "If-Unmodified-Since",
      },
      {
        value: "Keep-Alive",
        label: "Keep-Alive",
      },
      {
        value: "Max-Forwards",
        label: "Max-Forwards",
      },
      {
        value: "Origin",
        label: "Origin",
      },
      {
        value: "Pragma",
        label: "Pragma",
      },
      {
        value: "Proxy-Authorization",
        label: "Proxy-Authorization",
      },
      {
        value: "Range",
        label: "Range",
      },
      {
        value: "Referer",
        label: "Referer",
      },
      {
        value: "TE",
        label: "TE",
      },
      {
        value: "Trailer",
        label: "Trailer",
      },
      {
        value: "Transfer-Encoding",
        label: "Transfer-Encoding",
      },
      {
        value: "Upgrade",
        label: "Upgrade",
      },
      {
        value: "User-Agent",
        label: "User-Agent",
      },
      {
        value: "Via",
        label: "Via",
      },
      {
        value: "Warning",
        label: "Warning",
      },
      {
        value: "X-Requested-With",
        label: "X-Requested-With",
      },
      {
        value: "X-Do-Not-Track",
        label: "X-Do-Not-Track",
      },
      {
        value: "DNT",
        label: "DNT",
      },
      {
        value: "x-api-key",
        label: "x-api-key",
      },
    ];
  },
  regular_response_status_map: () => {
    return {
      100: "Continue",
      101: "Switching Protocol",
      102: "Processing (WebDAV)",
      200: "OK",
      201: "Created",
      202: "Accepted",
      203: "Non-Authoritative Information",
      204: "No Content",
      205: "Reset Content",
      206: "Partial Content",
      300: "Multiple Choice",
      301: "Moved Permanently",
      302: "Found",
      303: "See Other",
      304: "Not Modified",
      305: "Use Proxy",
      306: "unused",
      307: "Temporary Redirect",
      308: "Permanent Redirect",
      400: "Bad Request",
      401: "Unauthorized",
      402: "Payment Required",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      406: "Not Acceptable",
      407: "Proxy Authentication Required",
      408: "Request Timeout",
      409: "Conflict",
      410: "Gone",
      411: "Length Required",
      412: "Precondition Failed",
      413: "Payload Too Large",
      414: "URI Too Long",
      500: "Internal Server Error",
      501: "Not Implemented",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
      505: "HTTP Version Not Supported",
    };
  },
};

export default GlobalStatus;
