import { useCallback } from 'react';
import { useNavigation, TabActions } from '@react-navigation/native';

type NavLike = {
  getParent?: (id?: string) => any;
  dispatch?: (action: any) => void;
  navigate?: (name: string, params?: any) => void;
};

export function useSafeBack() {
  const navigation = useNavigation() as unknown as NavLike;

  return useCallback(() => {
    // Get the tab parent (prefer id="root-tabs" if present)
    const tabParent =
      (navigation.getParent && navigation.getParent('root-tabs')) ||
      (navigation.getParent && navigation.getParent());

    // 1) If we have a tab parent, navigate into its NESTED stack screen for Projects.
    //    We try a few common screen names for the Projects list.
    const targets = ['Projects', 'ProjectsScreen', 'ProjectsList'];
    if (tabParent?.navigate) {
      for (const screenName of targets) {
        try {
          // Navigate to the Projects tab, and inside it to the list screen.
          tabParent.navigate('Projects', { screen: screenName });
          console.log('SAFEBACK :: parent.navigate("Projects", { screen:', screenName, '})');
          return;
        } catch (_e) {
          // try next name
        }
      }
      // Fallback: at least jump to the Projects tab
      tabParent.dispatch?.(TabActions.jumpTo('Projects'));
      console.log('SAFEBACK :: parent TabActions.jumpTo("Projects") fallback');
      return;
    }

    // 2) Ultimate fallback: try direct navigate from current nav
    navigation.navigate?.('Projects');
    console.log('SAFEBACK :: direct navigation.navigate("Projects") fallback');
  }, [navigation]);
}
