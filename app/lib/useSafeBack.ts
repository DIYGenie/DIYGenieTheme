import { useCallback } from 'react';
import { useNavigation, TabActions } from '@react-navigation/native';

type NavLike = {
  getParent?: (id?: string) => any;
  getState?: () => any;
  dispatch?: (action: any) => void;
  navigate?: (name: string, params?: any) => void;
};

function findTabAncestor(navigation: NavLike, maxHops = 4): any | null {
  // Try explicit id first (if your tabs are tagged)
  const byId = (navigation as any).getParent?.('root-tabs');
  if (byId) return byId;

  // Otherwise climb up to 4 levels looking for a router with type "tab"
  let cur: any = navigation;
  for (let i = 0; i < maxHops; i++) {
    const parent = cur?.getParent?.();
    if (!parent) break;
    const st = parent?.getState?.();
    if (st?.type === 'tab') return parent;
    cur = parent;
  }
  return null;
}

/**
 * Always jump to the Projects tab:
 * 1) Find the nearest Tab ancestor (by id or by type)
 * 2) TabActions.jumpTo('Projects')
 * 3) Fallback to dispatch on current nav (no crash if ignored)
 */
export function useSafeBack() {
  const navigation = useNavigation() as unknown as NavLike;

  return useCallback(() => {
    const tabParent = findTabAncestor(navigation);

    if (tabParent) {
      console.log('SAFEBACK :: found tab parent -> jumpTo("Projects")');
      tabParent.dispatch(TabActions.jumpTo('Projects'));
      return;
    }

    console.log('SAFEBACK :: no tab parent -> fallback jumpTo("Projects")');
    (navigation as any).dispatch?.(TabActions.jumpTo('Projects'));
  }, [navigation]);
}
