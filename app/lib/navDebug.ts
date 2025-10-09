type NavLike = {
  getState?: () => any;
  getParent?: (id?: string) => any;
};

export function logNavTree(navigation: NavLike, label: string) {
  try {
    const parentRootTabs = navigation.getParent?.('root-tabs');
    const parentAny = navigation.getParent?.();

    const fmt = (nav: any) => {
      const st = nav?.getState?.();
      if (!st) return '(no state)';
      const routeNames = (st.routes || []).map((r: any) => r.name);
      return JSON.stringify(
        {
          type: st.type,
          index: st.index,
          routes: routeNames,
          current: st.routes?.[st.index || 0]?.name,
        },
        null,
        2
      );
    };

    // current level
    // @ts-ignore
    const currentState = navigation.getState?.();

    console.log('NAV DEBUG ::', label, {
      current: {
        index: currentState?.index,
        routes: (currentState?.routes || []).map((r: any) => r.name),
        current: currentState?.routes?.[currentState?.index || 0]?.name,
      },
      parent_root_tabs: fmt(parentRootTabs),
      parent_any: fmt(parentAny),
    });
  } catch (e) {
    console.log('NAV DEBUG ERROR ::', label, String(e));
  }
}
