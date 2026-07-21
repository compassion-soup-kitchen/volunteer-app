import type { Metadata } from "next";
import { InfoSection, InfoShell } from "../_components/info-page";

export const metadata: Metadata = {
  title: "Manatārua · Copyright | Te Pūaroha",
  description:
    "Copyright, trademark and attribution information for the Te Pūaroha volunteer app and website, from Compassion Soup Kitchen, Wellington.",
};

export default function CopyrightPage() {
  return (
    <InfoShell
      eyebrow="Manatārua · Copyright"
      title="Copyright & attribution"
      lede="Who owns what across the Te Pūaroha app and website, and how to ask about reusing it."
    >
      <InfoSection title="Copyright">
        <p>
          &copy; {new Date().getFullYear()} Compassion Soup Kitchen · Te Pūaroha. All rights
          reserved.
        </p>
        <p>
          All content in the Te Pūaroha app and on this website - including text, photographs,
          illustrations, icons, and the kōwhaiwhai-inspired patterns - belongs to Compassion Soup
          Kitchen unless noted otherwise. Please don&apos;t reproduce, distribute or adapt it
          without our written permission.
        </p>
      </InfoSection>

      <InfoSection title="Names and logo">
        <p>
          The Compassion Soup Kitchen name, the Te Pūaroha name, and the Compassion wordmark and
          koru heart are the property of Compassion Soup Kitchen and may not be used without
          permission.
        </p>
      </InfoSection>

      <InfoSection title="Photography">
        <p>
          Photographs of the Suzanne Aubert Compassion Centre, our kitchen and our volunteers are
          used with permission. If you appear in a photo and would like it removed, get in touch
          and we&apos;ll sort it with aroha.
        </p>
      </InfoSection>

      <InfoSection title="Open source">
        <p>
          The app and website are built with open-source software - including React, React Native,
          Expo and Next.js - used under their respective licences. Our thanks to the communities
          who maintain them.
        </p>
      </InfoSection>

      <InfoSection title="Permissions">
        <p>
          To ask about reusing any of our content, email{" "}
          <a
            href="mailto:info@soupkitchen.org.nz"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            info@soupkitchen.org.nz
          </a>
          . We&apos;re generally happy to help community groups, schools and media - just ask
          first.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
