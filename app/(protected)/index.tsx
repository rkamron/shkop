// Redirects /(protected) straight to the home tab so the group root is never
// rendered as a blank screen.
import { Redirect } from "expo-router";

export default function ProtectedIndex() {
  return <Redirect href="./(tabs)/home" />;
}
