# Mobile companion

Expo + React Native scaffold that ships with every web app provisioned
through Two Trees Digital. Starts inert — `App.hasMobile=false` and no
EAS project linked. Operators activate it from the Two Trees dashboard
when they're ready.

Built with **Expo SDK 54** + **React Native 0.81** + **React 19**.

## Activation flow (per-tenant operator)

1. **Two Trees dashboard → your App detail page → Services panel.** Click
   **Add Mobile**. The modify-app worker flips `App.hasMobile=true`. Page
   reloads in ~30s.

2. **A "Set up mobile" panel appears** below Services. Don't fill it in
   yet — first you need an EAS project.

3. **Locally:**
   ```bash
   cd apps/mobile
   npx eas-cli login                    # use your Expo account
   npx eas-cli init                     # creates an EAS project
   ```

   `eas init` writes the project ID into `app.json#extra.eas.projectId`.
   Copy it.

4. **Back in the dashboard's Set up mobile panel:** paste the project ID
   into the `easProjectId` field. Leave App Store / Play Store / TestFlight
   URLs blank for now. Click Save.

5. **Trigger your first build:**
   ```bash
   npx eas-cli build --profile preview --platform ios
   # or --platform android — Android needs no paid account
   ```

   First-time iOS build will prompt you for an Apple Developer Program
   account ($99/yr). If you don't have one yet, build for Android first
   and come back to iOS once Apple's enrollment clears.

6. **Test on Expo Go (no build needed) for fast iteration:**
   ```bash
   pnpm install            # at repo root
   cd apps/mobile
   npx expo start
   ```

   Scan the QR code with iPhone Camera (opens in Expo Go) or Android
   Expo Go app. ⚠️ Expo Go on iOS only ships the latest SDK — if you've
   pinned this app to an older SDK for any reason, scanning will fail
   and you'll need a development client build instead.

## Build profiles (`eas.json`)

- **development** — internal distribution, dev client enabled. Real
  devices, hot reload, native-module debugging.
- **preview** — internal distribution, iOS simulator-friendly. CI builds
  this on every PR touching `apps/mobile/**`.
- **production** — auto-incrementing build numbers, release channel
  `production`. CI builds this on push to `main`. Submit-ready.

## CI (`.github/workflows/mobile-build.yml`)

Triggers on PR/push when `apps/mobile/**` changes. Skips gracefully if
the `EXPO_TOKEN` repo secret isn't set — useful before you're ready to
let CI burn EAS minutes. Builds run with `--no-wait` so the workflow
returns immediately; check status at expo.dev.

## Customizing for your app

`app.json` ships with template-ish defaults. After `eas init`, change:

- **`name`** — display name in the home-screen icon and App Store/Play
  Store. Default is `mobile`.
- **`slug`** — URL-safe identifier for the EAS project. Default is `mobile`.
- **`bundleIdentifier`** (iOS) and **`package`** (Android) — change
  `com.twotreesdigital.mobile` to your namespace, e.g.
  `com.yourcompany.yourapp`. Must be unique on each store.
- **`scheme`** — deep-link scheme. Default is `app`.
- **`splash.backgroundColor`** + assets in `./assets/` — update to your
  brand.

`App.tsx` is a placeholder Welcome screen. Replace it with your real
first surface.

## Distribution

**TestFlight (iOS):**
```bash
npx eas-cli build --profile production --platform ios --auto-submit
```
Requires Apple Developer Program enrollment ($99/yr) and an app record
created in App Store Connect with a matching bundle identifier. The
`--auto-submit` flag uploads to TestFlight after the build completes.

**Play Store (Android):**
```bash
npx eas-cli build --profile production --platform android --auto-submit
```
Requires Google Play Console enrollment ($25 one-time) and an app record
created with a matching package name. EAS handles signing keystores.

After distribution, paste the public URLs (App Store, Play Store,
TestFlight) into the dashboard's MobileLinkPanel. They'll surface as
service links on the App detail page.

## Iteration tips

- **`eas update`** — push JS-only changes to existing preview/production
  installs without rebuilding. No App Store review wait. Native changes
  (new lib, app.json native config) still need a fresh build.
- **`eas device:create`** — register your physical iPhone's UDID for
  ad-hoc preview builds. Without this, iOS preview builds only install
  on simulators.
- **`npx expo install --fix`** — re-aligns all related deps to the
  current SDK's pinned versions. Run this after bumping Expo.

## Troubleshooting

**"Project is incompatible with this version of Expo Go"** — your
project's SDK is older than what Expo Go ships. Bump:
```bash
npx expo install expo@~<latest>.0.0
npx expo install --fix
```

**iOS build fails with "no team associated"** — Apple Dev Program
payment hasn't activated yet. Takes a few hours to a few days after
enrollment. Build for Android in the meantime.

**`pnpm install` fails on peer-dep warnings for React 19** — try
`--no-strict-peer-dependencies` as a workaround. Most warnings are
about transitive deps that haven't updated their peer ranges yet.

## Related dashboard surfaces

- **ServicesPanel** — Add/Remove Mobile button on the App detail page.
- **MobileLinkPanel** — appears after Add Mobile, captures EAS project
  ID + store URLs.
- **App detail page** — surfaces EAS Build, App Store, Play Store, and
  TestFlight links once populated.
