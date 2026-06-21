import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "./src/theme";
import { useAppFonts } from "./src/theme/fonts";
import { GlassTabBar } from "./src/components/GlassTabBar";
import { initDb } from "./src/db/inventory";
import { seedIfEmpty } from "./src/db/seed";
import { IntakeScreen } from "./src/screens/IntakeScreen";
import { InventoryScreen } from "./src/screens/InventoryScreen";
import { ShelfScreen } from "./src/screens/ShelfScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.paper, card: colors.paper },
};

export default function App() {
  const fontsLoaded = useAppFonts();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDb()
      .then(() => seedIfEmpty())
      .then(() => setDbReady(true))
      .catch(() => setDbReady(true)); // never block the app on seeding
  }, []);

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.clay} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <NavigationContainer theme={navTheme}>
          <Tab.Navigator
            tabBar={(props) => <GlassTabBar {...props} />}
            screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.paper } }}
          >
            <Tab.Screen name="Intake" component={IntakeScreen} />
            <Tab.Screen name="Inventory" component={InventoryScreen} />
            <Tab.Screen name="Shelf" component={ShelfScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
