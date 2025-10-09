import { useCallback } from 'react';
import { useNavigation, TabActions, StackActions } from '@react-navigation/native';

type NavLike = {
  getParent?: (id?: string) => any;
  getState?: () => any;
  dispatch?: (action: any) => void;
  navigate?: (name: string, params?: any) => void;
};

function getTabParent(nav: NavLike) {
  // Prefer explicit id if set in RootTabs.tsx; otherwise climb one level
  return nav.getParent?.('root-tabs') || nav.getParent?.();
}

function getProjectsChildKey(tabParent: any): string | null {
  // Find the Projects tab and its nested stack key
  const st = tabParent?.getState?.();
  if (!st?.routes) return null;
  const projectsRoute = st.routes.find((r: any) => r.name === 'Projects');
  // When the Projects tab hosts a Stack, its child navigator state has a key
  const child = projectsRoute?.state;
  return child?.key || null;
}

/**
 * Always return to the Projects LIST:
 * 1) jump to the Projects tab
 * 2) popToTop on the nested Projects stack (target = child stack key)
 */
export function useSafeBack() {
  const navigation = useNavigation() as unknown as NavLike;

  return useCallback(() => {
    const tabParent = getTabParent(navigation);
    if (tabParent) {
      // Ensure we're on the Projects tab
      tabParent.dispatch(TabActions.jumpTo('Projects'));

      // If Projects tab hosts a stack, pop it to the root list screen
      const childKey = getProjectsChildKey(tabParent);
      if (childKey) {
        tabParent.dispatch({ ...StackActions.popToTop(), target: childKey });
      }
      return;
    }

    // Fallbacks if no tab parent found
    navigation.dispatch?.(TabActions.jumpTo('Projects'));
    navigation.navigate?.('Projects');
  }, [navigation]);
}
