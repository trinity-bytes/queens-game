import { t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/site";

// The page is a client component, which cannot export metadata.
export const metadata = pageMetadata("/credits", t("es", "credits.title"));

export default function CreditsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
