import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { colors } from "../theme/colors";

import AuthScreen from "../screens/AuthScreen";
import BlogsScreen from "../screens/BlogsScreen";
import UniAIScreen from "../screens/UniAIScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AdminScreen from "../screens/AdminScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import CanvasWorkspaceScreen from "../screens/CanvasWorkspaceScreen";
import UserProfileScreen from "../screens/UserProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function BlogsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BlogsFeed" component={BlogsScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="AdminPanel" component={AdminScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const { student } = useAuth();
  return (
    <Tab.Navigator
      initialRouteName="Blogs"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          backgroundColor: "rgba(255,255,255,0.92)",
          borderTopWidth: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 10,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontFamily: "Manrope_700Bold",
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        },
      }}
    >
      <Tab.Screen
        name="UniAI"
        component={UniAIScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" size={size} color={color} />
          ),
          tabBarLabel: "UniAI",
        }}
      />
      <Tab.Screen
        name="Blogs"
        component={BlogsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="reader-outline" size={size} color={color} />
          ),
          tabBarLabel: "Blogs",
        }}
      />
      <Tab.Screen
        name="Canvas"
        component={CanvasWorkspaceScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
          tabBarLabel: "Canvas",
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
          tabBarLabel: "Settings",
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { student, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {student ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
