import { t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/site";

// The page is a client component, which cannot export metadata.
export const metadata = pageMetadata("/leaderboard", t("es", "leaderboard.title"));

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
