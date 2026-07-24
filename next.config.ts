import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM assets that must not be bundled; pg stays external for
  // its optional native bindings.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
