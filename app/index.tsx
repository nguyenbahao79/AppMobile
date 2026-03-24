import { Redirect, Href } from 'expo-router';

export default function RootIndex() {
  return <Redirect href={"/(auth)/login" as Href} />;
}
