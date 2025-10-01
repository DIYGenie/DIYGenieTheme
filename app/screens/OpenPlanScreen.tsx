import React, { useState } from "react";
import { View, Text } from "react-native";
import { ScreenScroll, ButtonPrimary, Card, SectionTitle, ui, space } from "../ui/components";

export default function OpenPlanScreen({ route, navigation }: any) {
  const { id } = route.params || {};
  const tabs = ["Overview","Materials","Steps","Shopping"] as const;
  const [active, setActive] = useState<typeof tabs[number]>("Overview");

  const Tab = ({ name }: { name: typeof tabs[number] }) => (
    <ButtonPrimary
      title={name}
      onPress={() => setActive(name)}
      style={{ paddingVertical:10, marginRight:10, backgroundColor: active===name ? "#E39A33" : "#F3F4F6" }}
      textStyle={{ color: active===name ? "#fff" : "#111827", fontSize:14 }}
    />
  );

  const Stub = ({ title, body }: { title: string; body: string }) => (
    <Card style={{ marginTop: space.md }}>
      <SectionTitle>{title}</SectionTitle>
      <Text style={ui.p}>{body}</Text>
    </Card>
  );

  return (
    <ScreenScroll>
      <Text style={[ui.h1, { marginBottom: space.md }]}>Project Plan</Text>
      <View style={{ flexDirection:"row", marginBottom: space.md }}>
        {tabs.map(t => <Tab key={t} name={t} />)}
      </View>

      {active==="Overview"  && <Stub title="Overview"  body="High-level summary (stub)" />}
      {active==="Materials" && <Stub title="Materials" body="Tools & materials list (stub)" />}
      {active==="Steps"     && <Stub title="Steps"     body="Step-by-step instructions (stub)" />}
      {active==="Shopping"  && <Stub title="Shopping"  body="Suggested items & links (stub)" />}

      <ButtonPrimary title="Back to Project" onPress={() => navigation.goBack()} style={{ marginTop: space.lg }} />
    </ScreenScroll>
  );
}
