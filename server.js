const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { validate } = require("./lib/validation");

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY_BYTES = 10 * 1024;
const STATIC_FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytesRead = 0;
    let tooLarge = false;
    request.on("data", (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      if (tooLarge) {
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (tooLarge) {
        reject(Object.assign(new Error("Request body is too large."), { statusCode: 413 }));
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

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (request.method === "GET" && STATIC_FILES[url.pathname]) {
    const asset = STATIC_FILES[url.pathname];
    fs.readFile(path.join(__dirname, asset.file), (error, contents) => {
      if (error) {
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Unable to load the requested page asset.");
        return;
      }
      response.writeHead(200, {
        "Content-Type": asset.type,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
      });
      response.end(contents);
    });
    return;
  }

  if (url.pathname === "/api/register") {
    if (request.method !== "POST") {
      response.writeHead(405, { Allow: "POST" });
      response.end();
      return;
    }

    if (!request.headers["content-type"]?.startsWith("application/json")) {
      sendJson(response, 415, { message: "Send the form as JSON." });
      return;
    }

    try {
      const values = await readJson(request);
      const errors = validate(values);
      if (Object.keys(errors).length) {
        sendJson(response, 400, {
          message: "Please correct the highlighted fields and submit again.",
          errors,
        });
        return;
      }
      sendJson(response, 200, {
        message: "Your details passed server-side validation. Nothing was stored.",
      });
    } catch (error) {
      if (error.statusCode === 413) {
        sendJson(response, 413, { message: error.message });
        return;
      }
      if (error.statusCode === 400) {
        sendJson(response, 400, { message: error.message });
        return;
      }
      console.error("Failed to process registration request:", error);
      sendJson(response, 500, {
        message: "The form could not be processed. Please try again.",
      });
    }
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET" });
    response.end();
    return;
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Page not found.");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Validation demo running at http://localhost:${PORT}`);
});
