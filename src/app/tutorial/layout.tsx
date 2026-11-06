import { t } from "@/lib/i18n";
import { pageMetadata } from "@/lib/site";

// The page is a client component, which cannot export metadata.
export const metadata = pageMetadata("/tutorial", t("es", "tutorial.title"));

export default function TutorialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
