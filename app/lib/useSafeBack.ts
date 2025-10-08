import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

/**
 * Returns a back handler that:
 * 1) goBack() if possible
 * 2) otherwise navigates to the Projects tab via parent id "root-tabs"
 */
export function useSafeBack() {
  const navigation = useNavigation();

  return useCallback(() => {
    // @ts-ignore canGoBack exists on v6
    if (navigation.canGoBack && navigation.canGoBack()) {
      // @ts-ignore goBack exists on v6
      navigation.goBack();
      return;
    }
    // Try sending the user to the Projects tab
    // Assumes your tab navigator has id="root-tabs" and a tab named "Projects"
    // @ts-ignore getParent is available on v6
    const parent = navigation.getParent?.('root-tabs');
    if (parent) {
      // @ts-ignore navigate signature is permissive at runtime
      parent.navigate('Projects');
      return;
    }
    // Last resort: no-op
  }, [navigation]);
}
