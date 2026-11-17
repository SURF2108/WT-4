"use strict";

require("dotenv").config();

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY_BYTES = 16 * 1024;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const STATIC_FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
};
const API_ROUTES = {
  "/api/auth": require("../api/auth"),
  "/api/budget": require("../api/budget"),
  "/api/transactions": require("../api/transactions"),
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytesRead = 0;
    request.on("data", (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (bytesRead > MAX_BODY_BYTES) {
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Request body must contain valid JSON."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function createApiResponse(response) {
  let statusCode = 200;
  const headers = {};
  return {
    setHeader(name, value) {
      headers[name] = value;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      });
      response.end(JSON.stringify(body));
    },
  };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (request.method === "GET" && STATIC_FILES[url.pathname]) {
    const asset = STATIC_FILES[url.pathname];
    fs.readFile(path.join(PUBLIC_DIR, asset.file), (error, contents) => {
      if (error) {
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Unable to load the requested page asset.");
        return;
      }
      response.writeHead(200, {
        "Content-Type": asset.type,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      });
      response.end(contents);
    });
    return;
  }

  const apiHandler = API_ROUTES[url.pathname];
  if (apiHandler) {
    const headers = {
      method: request.method,
      url: request.url,
      headers: request.headers,
    };
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      if (!request.headers["content-type"]?.startsWith("application/json")) {
        headers.body = undefined;
      } else {
        try {
          headers.body = await readJson(request);
        } catch (error) {
          sendJson(response, error.statusCode || 400, { message: error.message });
          return;
        }
      }
    }

    await apiHandler(headers, createApiResponse(response));
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET, POST, PUT, DELETE" });
    response.end();
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Page not found.");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Budget tracker running at http://localhost:${PORT}`);
});
