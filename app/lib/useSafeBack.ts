import { useCallback } from 'react';
import { useNavigation, TabActions } from '@react-navigation/native';

type NavLike = {
  getParent?: (id?: string) => any;
  getState?: () => any;
  dispatch?: (action: any) => void;
  navigate?: (name: string, params?: any) => void;
};

function getTabParent(nav: NavLike) {
  // Prefer explicit id if set in RootTabs.tsx
  const byId = nav.getParent?.('root-tabs');
  if (byId) return byId;
  return nav.getParent?.();
}

function getProjectsChildRootName(tabParent: any): string | null {
  const st = tabParent?.getState?.();
  if (!st?.routes) return null;

  const projectsRoute = st.routes.find((r: any) => r.name === 'Projects');
  // If the Projects tab hosts a nested stack, its state will be here
  const child = projectsRoute?.state;
  if (child?.routes?.length) {
    // Root of that stack is routes[0] (or use child.index if you want current)
    const root = child.routes[0]?.name;
    return typeof root === 'string' ? root : null;
  }
  return null;
}

/**
 * Jump to the Projects tab AND its root stack screen (Projects list).
 * - Reads the tab parent's state to discover the nested stack's root route name.
 * - Falls back to jumpTo('Projects') if the child isn't a stack.
 */
export function useSafeBack() {
  const navigation = useNavigation() as unknown as NavLike;

  return useCallback(() => {
    const tabParent = getTabParent(navigation);

    if (tabParent) {
      const childRoot = getProjectsChildRootName(tabParent);

      if (childRoot) {
        console.log(
          'SAFEBACK :: parent.navigate("Projects", { screen:', childRoot, '})'
        );
        tabParent.navigate('Projects', { screen: childRoot });
        return;
      }

      console.log('SAFEBACK :: parent TabActions.jumpTo("Projects") (no child stack)');
      tabParent.dispatch?.(TabActions.jumpTo('Projects'));
      return;
    }

    console.log('SAFEBACK :: no tab parent -> direct navigate("Projects")');
    navigation.navigate?.('Projects');
  }, [navigation]);
}
