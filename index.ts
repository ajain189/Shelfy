// gesture-handler must be the very first import in the app entry.
import 'react-native-gesture-handler';

// Polyfills MUST load before anything imports the Gemini SDK.
// React Native's JS runtime lacks a complete WHATWG URL and
// crypto.getRandomValues, which the SDK relies on. These shim them in.
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
