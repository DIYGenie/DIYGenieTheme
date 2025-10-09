import { useCallback } from 'react';
import { useNavigation, TabActions } from '@react-navigation/native';

export function useSafeBack() {
  const navigation = useNavigation();

  return useCallback(() => {
    // @ts-ignore
    const parent = navigation.getParent?.('root-tabs') || navigation.getParent?.();

    if (parent) {
      console.log('SAFEBACK :: using parent TabActions.jumpTo("Projects")');
      parent.dispatch(TabActions.jumpTo('Projects'));
      return;
    }

    console.log('SAFEBACK :: fallback TabActions.jumpTo("Projects") on current nav');
    // @ts-ignore
    navigation.dispatch?.(TabActions.jumpTo('Projects'));
  }, [navigation]);
}
