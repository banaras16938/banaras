import type { NextConfig } from "next";
import { SEARCH_ENGINE_INDEXING_ENABLED } from "./src/config/public-site";

const nextConfig: NextConfig = {
  /* config options here */

  // Keep the whole website out of search engines: send `X-Robots-Tag: noindex, nofollow`
  // on every response (pages, API, images, static files). See src/config/public-site.ts
  async headers() {
    if (SEARCH_ENGINE_INDEXING_ENABLED) {
      return [];
    }

    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
