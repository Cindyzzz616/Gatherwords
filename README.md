# Welcome to Gatherwords!
<img src="./assets/images/Gatherwords.png"><img>

## Inspiration
- trip to the balkans
- visiting friends houses
- texting mom

## What it does
- foraging
- digesting

## How we built it
- codex

## Challenges we ran into
- split with team

## Accomplishments that we're proud of
- seriously started at like 8pm

## What we learned
- problem before solution
- would I actually use the app
- don't nuke your code with astra

## What's next for Gatherwords
- add more ways to forage - e.g. video calls, meetings and lessons
- more fine grained linguistic analysis
- multilingual support
   - code-switching in listen mode
   - multiple languages in one frame in observe mode
- buttons to play audio during review - the audio files are already saved, just not accessed
- multilingual interface - makes more sense for a language learning app

## Setup instructions
This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
# Practice activities

Practice starts with a multiple-choice question based on a randomly selected nonempty encounter in `users/{userId}/encounters`. After that, swipe right or tap Next to randomly choose a multiple-choice question, fill-in-the-blank, or flashcard. Each MCQ has four shuffled choices. The bottom-right question mark reveals the answer; answering also reveals feedback before proceeding. Flashcards reveal on tap, and fill-in-the-blank cards accept a typed answer. No practice results are saved yet.

The Python server calls OpenAI's Responses API with structured output and validates generated activities before returning them. It verifies the app's Firebase ID token and reads encounters only from that user's collection. Anonymous Firebase sessions work too. Encounter text is sent to OpenAI only when an activity is requested.

Add `OPENAI_API_KEY` to your server's `.env` and optionally set `OPENAI_PRACTICE_MODEL` (default `gpt-4.1-mini`). Keep the key server-only. Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to the Firebase service account for this project. Start the existing server from this directory with:

```bash
python3 -m pip install -r requirements.txt
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --env-file .env
```

The app uses `EXPO_PUBLIC_TRANSCRIPTION_URL` for practice by default, or `EXPO_PUBLIC_PRACTICE_SERVER_URL` for a separate backend. On a phone, use your computer's LAN address and restart Expo after changing the URL. Missing keys, expired sessions, empty encounters, and generation failures display a message and a retry option where applicable.

API reference: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
