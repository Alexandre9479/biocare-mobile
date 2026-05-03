# Build Biocare APK with EAS (No Play Store needed)

## What this does
EAS Build sends your code to Expo's cloud servers.
They compile the APK for you. You get a download link.
Install it on any Android phone directly — no Play Store.

---

## Step 1: Open YOUR OWN terminal
Press `Win + R` → type `cmd` → Enter
(Do NOT use Claude Code terminal — Node version conflict)

## Step 2: Go to the app folder
```
cd C:\Users\alexa\Documents\biocare-mobile
```

## Step 3: Install EAS CLI
```
npm install -g eas-cli
```

## Step 4: Create a free Expo account
Go to: https://expo.dev → Sign Up (free, no credit card)
Use any email address.

## Step 5: Login to EAS
```
eas login
```
Enter the email and password you just created.

## Step 6: Link this project to your Expo account
```
eas init
```
When asked "Would you like to create a new EAS project?", press Enter (Yes).
It will create a project called "biocare-service-management".

## Step 7: BUILD THE APK
```
eas build --platform android --profile preview
```
- First time: it asks to generate a keystore — press Enter to let EAS handle it automatically
- The build runs on Expo's cloud (takes 5–15 minutes)
- You get a link like: https://expo.dev/artifacts/eas/...

## Step 8: Download and install
1. Open the link on your Android phone (or send it via WhatsApp to your phone)
2. Download the .apk file
3. If it asks "Allow installation from unknown sources" → Allow
4. Install → Done

The Biocare SMS app is now on your phone permanently.

---

## Distribute to engineers
Share the same download link with any engineer.
They download the APK, install it, login with their Biocare credentials.

Or run `eas build` again later — each build gives a new download link.

