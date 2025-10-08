import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * Safe back handler:
 * 1) goBack() if a previous screen exists
 * 2) otherwise navigate to the Projects tab via parent navigator id "root-tabs"
 */
export function useSafeBack() {
  const navigation = useNavigation();

  return useCallback(() => {
    // @ts-ignore - RN Navigation v6 APIs
    if (navigation.canGoBack && navigation.canGoBack()) {
      // @ts-ignore
      navigation.goBack();
      return;
    }
    // @ts-ignore
    const parent = navigation.getParent?.('root-tabs');
    if (parent) {
      // @ts-ignore
      parent.navigate('Projects');
    }
  }, [navigation]);
}
