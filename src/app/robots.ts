import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Required by output: "export", which only writes static routes.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
