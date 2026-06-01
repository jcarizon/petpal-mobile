import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Home, PawPrint, Bone, MapPinned, UserRound } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.neutral400,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          backgroundColor: Colors.surface,
          borderRadius: 24,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: Colors.neutral900,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 0,
          overflow: 'visible',
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Community',
          tabBarLabel: () => null,
          tabBarIcon: ({ color, size, focused }) => (
            <Home size={focused ? size + 8 : size + 4} color={focused ? Colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'My Pets',
          tabBarLabel: () => null,
          tabBarIcon: ({ color, size, focused }) => (
            <PawPrint size={focused ? size + 8 : size + 4} color={focused ? Colors.primary : color} />
          ),
        }}
      />
<Tabs.Screen
        name="pawmatch"
        options={{
          title: 'PawMatch',
          tabBarLabel: () => null,
          tabBarItemStyle: styles.pawmatchTabItem,
          tabBarIcon: ({ focused }) => (
            <View style={[styles.pawmatchButton, focused && styles.pawmatchButtonFocused]}>
              <Bone
                size={40}
                color={Colors.textInverse}
                fill={focused ? Colors.textInverse : 'transparent'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarLabel: () => null,
          tabBarIcon: ({ color, size, focused }) => (
            <MapPinned size={focused ? size + 8 : size + 4} color={focused ? Colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarLabel: () => null,
          tabBarIcon: ({ color, size, focused }) => (
            <UserRound size={focused ? size + 8 : size + 4} color={focused ? Colors.primary : color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pawmatchTabItem: {
    marginTop: -24,
    overflow: 'visible',
  },
  pawmatchButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.surface,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.36,
    shadowRadius: 14,
    elevation: 12,
  },
pawmatchButtonFocused: {
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
    transform: [{ scale: 1.12 }],
  },
});
