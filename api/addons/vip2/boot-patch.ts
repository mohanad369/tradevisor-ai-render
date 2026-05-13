// How to activate VIP2 in api/boot.ts
// Status: REFERENCE ONLY
// To activate: add these lines to api/boot.ts

// 1. Import the router
// import vip2Router from "../addons/vip2/router";

// 2. Mount the router (add before the 404 handler)
// app.route("/api/vip2", vip2Router);

// Full example:
//
// import vip2Router from "./addons/vip2/router";
//
// // After tRPC handler:
// app.route("/api/vip2", vip2Router);
//
// // 404 handler stays last
// app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));
