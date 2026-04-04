# GSOT Manager – Mobile App Setup Guide

## What This Is

A cross-platform mobile app for **iPhone and Android** built with React Native (Expo).
It lets users manage the full GSOT hierarchy:

**Goal → Strategy → Objective → Tactic → Task**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo SDK 50 |
| Navigation | React Navigation v6 |
| UI Components | React Native Paper (Material Design 3) |
| Local Storage | AsyncStorage |
| Platform | iOS + Android (single codebase) |

---

## Prerequisites

Install these on your computer first:

1. **Node.js** (v18+) — https://nodejs.org
2. **Expo CLI** — `npm install -g expo-cli`
3. **For testing on device**: Install the **Expo Go** app from the App Store / Google Play

---

## Quick Start

```bash
# 1. Open terminal and go into the app folder
cd gsot-app

# 2. Install all dependencies
npm install

# 3. Start the app
npx expo start
```

A QR code will appear in your terminal. Scan it with:
- **iPhone**: Camera app → scan QR → opens in Expo Go
- **Android**: Expo Go app → "Scan QR code"

---

## Running on Simulators/Emulators

```bash
# iOS Simulator (requires Xcode on a Mac)
npx expo start --ios

# Android Emulator (requires Android Studio)
npx expo start --android
```

---

## App Structure

```
gsot-app/
├── App.js                          ← Entry point
├── app.json                        ← Expo config (app name, icons, etc.)
├── package.json                    ← Dependencies
└── src/
    ├── context/
    │   ├── AuthContext.js          ← User login/registration state
    │   └── GSOTContext.js          ← All GSOT data + CRUD operations
    ├── navigation/
    │   └── AppNavigator.js         ← Tab + stack navigation
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.js
    │   │   └── RegisterScreen.js
    │   ├── dashboard/
    │   │   ├── DashboardScreen.js  ← Home with stats & progress
    │   │   └── ProfileScreen.js    ← User profile & GSOT info
    │   ├── goals/
    │   │   ├── GoalsScreen.js      ← List of goals + search
    │   │   └── GoalDetailScreen.js ← Goal detail + strategies
    │   ├── strategies/
    │   │   └── StrategyDetailScreen.js
    │   ├── objectives/
    │   │   └── ObjectiveDetailScreen.js
    │   └── tactics/
    │       └── TacticDetailScreen.js ← Tactics + task checklist
    ├── components/
    │   ├── GSOTCard.js             ← Reusable item card
    │   ├── ItemFormModal.js        ← Add/edit form modal
    │   └── EmptyState.js           ← Empty list placeholder
    └── utils/
        ├── theme.js                ← Colors, GSOT config, theme
        └── storage.js              ← AsyncStorage CRUD helpers
```

---

## Features

### Authentication
- Create account with name, email, and password
- Sign in / sign out
- Data is stored per-user on the device

### GSOT Hierarchy (full drill-down)
- **Goals** → create, edit, delete, search, categorize (Economic, Legal, Environmental, etc.)
- **Strategies** → linked to a Goal, with progress rollup
- **Objectives** → linked to a Strategy
- **Tactics** → linked to an Objective
- **Tasks** → linked to a Tactic, tap to mark complete/incomplete

### Progress Tracking
- Progress rolls up automatically: Tasks → Tactic → Objective → Strategy → Goal
- Progress bars at every level
- Dashboard with overall stats and hierarchy progress view

### Cascading Deletes
- Deleting a Goal deletes all linked Strategies, Objectives, Tactics, and Tasks
- Confirmation alerts before destructive actions

---

## Publishing to App Store / Google Play

When ready to publish:

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo account (create free account at expo.dev)
eas login

# Configure build
eas build:configure

# Build for iOS (creates .ipa for App Store)
eas build --platform ios

# Build for Android (creates .aab for Google Play)
eas build --platform android
```

---

## Upgrading to a Real Backend

Currently, all data is stored locally on the device with AsyncStorage.
To add cloud sync and multi-device support, replace the storage layer with:

- **Firebase** (Firestore + Firebase Auth) — recommended for quick setup
- **Supabase** — open-source Firebase alternative
- **AWS Amplify** — enterprise-grade

The `AuthContext.js` and `GSOTContext.js` files are designed to make this swap straightforward — all data operations are isolated in those two files.

---

## GSOT Framework Reference

| Level | Name | Definition |
|-------|------|------------|
| 1 | **Goal** | Broad primary outcome (economic, legal, environmental, political, social) |
| 2 | **Strategy** | The overall approach you'll take to achieve the goal |
| 3 | **Objective** | Specific, measurable milestone tied to a strategy |
| 4 | **Tactic** | Specific action taken to accomplish an objective |
| 5 | **Task** | Concrete work item that accomplishes a tactic |

*Based on the GSOT Model © 2022, White's Elm, LLC*
