import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { Home, PawPrint, BellRing, MapPinned, UserRound } from 'lucide-react-native';
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
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 4,
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: {
          marginBottom: -2,
        },
        // Add animation for active tab (optional, can be further enhanced)
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Home size={focused ? size + 4 : size} color={focused ? Colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'My Pets',
          tabBarIcon: ({ color, size, focused }) => (
            <PawPrint size={focused ? size + 4 : size} color={focused ? Colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size, focused }) => (
            <BellRing size={focused ? size + 4 : size} color={focused ? Colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size, focused }) => (
            <MapPinned size={focused ? size + 4 : size} color={focused ? Colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <UserRound size={focused ? size + 4 : size} color={focused ? Colors.primary : color} />
          ),
        }}
      />
    </Tabs>
  );
}
