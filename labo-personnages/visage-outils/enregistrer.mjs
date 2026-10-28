import { register } from "node:module";
register("./crochets.mjs", import.meta.url);
globalThis.location = { search: "" };
