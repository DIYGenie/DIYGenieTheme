import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * Always return the user to the Projects tab.
 * - Looks up the parent tab navigator by id "root-tabs"
 * - Finds the tab whose name includes "Projects" (robust to route naming)
 * - Navigates to that tab; no history pop to random places
 */
export function useSafeBack() {
  const navigation = useNavigation();

  return useCallback(() => {
    // Prefer navigating the parent tabs rather than goBack()
    // @ts-ignore
    const parent = navigation.getParent?.('root-tabs');

    if (parent) {
      // Try to find a tab whose route name contains "Projects"
      const state = parent.getState?.();
      const routes = state?.routes ?? [];
      const projectsRoute =
        routes.find((r: any) =>
          String(r.name).toLowerCase().includes('projects')
        ) || routes.find((r: any) => r.name === 'ProjectsNavigator')
          || routes.find((r: any) => r.name === 'ProjectsTab')
          || routes.find((r: any) => r.name === 'Projects');

      if (projectsRoute) {
        // @ts-ignore
        parent.navigate(projectsRoute.name);
        return;
      }
      // Fallback to a few common names
      // @ts-ignore
      parent.navigate('Projects');
      return;
    }

    // Last-resort: try direct navigate (won't crash if route exists)
    // @ts-ignore
    navigation.navigate?.('Projects');
  }, [navigation]);
}
