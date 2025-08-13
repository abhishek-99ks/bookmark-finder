const fs = require("fs");

let code = fs.readFileSync("popup.js", "utf8");

// Set DEBUG to false for production
code = code.replace(/const DEBUG = true;/, "const DEBUG = false;");

fs.writeFileSync("popup.js", code, "utf8");
console.log("Production popup.js built without debug hooks!");
