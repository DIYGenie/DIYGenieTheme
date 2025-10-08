import { useCallback } from 'react';
import { useNavigation, TabActions } from '@react-navigation/native';

/**
 * Always jump to the Projects tab.
 * Uses TabActions.jumpTo to avoid goBack() edge cases.
 * Looks up the parent tab navigator (id="root-tabs" if present), else falls back.
 */
export function useSafeBack() {
  const navigation = useNavigation();

  return useCallback(() => {
    // Prefer the parent tabs (id="root-tabs" if set)
    // @ts-ignore
    const parent = navigation.getParent?.('root-tabs') || navigation.getParent?.();
    if (parent) {
      parent.dispatch(TabActions.jumpTo('Projects'));
      return;
    }
    // Fallback: try jumping directly (works if this screen itself is inside tabs)
    // @ts-ignore
    navigation.dispatch?.(TabActions.jumpTo('Projects'));
  }, [navigation]);
}
