import {
  useNavigation,
  TabActions,
  CommonActions,
} from '@react-navigation/native';
import { useCallback } from 'react';

export function useSafeBack() {
  const navigation = useNavigation<any>();

  return useCallback(() => {
    // 1) If we have a stack history on the current navigator, goBack.
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    // 2) Find the root tabs navigator and ensure the Projects stack has a list to go back to.
    const tabs = navigation.getParent?.('root-tabs') ?? navigation.getParent?.();
    if (tabs) {
      // Reset the Projects nested stack so it has ProjectsList as the only route.
      // This guarantees the Back button isn't needed after we jump.
      try {
        tabs.dispatch(
          CommonActions.navigate({
            name: 'Projects',
            params: {
              screen: 'ProjectsList',
              params: {},
            },
          })
        );
        return;
      } catch {
        // ignore and try a plain jump
      }

      // Fallback: simple tab jump to Projects
      try {
        tabs.dispatch(TabActions.jumpTo('Projects'));
        return;
      } catch {
        // ignore
      }
    }

    // 3) Absolute last resort: reset root to Projects → ProjectsList.
    try {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Projects',
              params: { screen: 'ProjectsList' },
            } as any,
          ],
        })
      );
    } catch {
      // swallow
    }
  }, [navigation]);
}
