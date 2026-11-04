import { ConfigBanner } from "@/features/page/ConfigBanner";

import preview from "../../../.storybook/preview";

// G-05: the banner of a build without a valid script URL (D-05, a-25, 03 § 3). The URLs that show it are listed in
// ConfigBanner.test.tsx; they all render the same banner.

const meta = preview.meta({ component: ConfigBanner });

export const MissingUrl = meta.story({ args: { url: "" } });
