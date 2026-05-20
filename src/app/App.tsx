import { Landing } from "@/components/Landing";
import { TypeRightAway } from "@/components/TypeRightAway";
import { CustomHub } from "@/components/CustomHub";
import { ScreenStub } from "@/components/ScreenStub";
import { TypingScreen } from "@/components/TypingScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { useAppStore } from "@/state/useAppStore";

export function App() {
  const view = useAppStore((s) => s.view);

  switch (view.name) {
    case "landing":
      return <Landing />;
    case "type-right-away":
      return <TypeRightAway />;
    case "custom-hub":
      return <CustomHub />;
    case "paste-config":
      return <ScreenStub title="Paste config" trail={["custom", "paste"]} />;
    case "prompt-builder":
      return (
        <ScreenStub title="Build config prompt" trail={["custom", "prompt"]} />
      );
    case "load-any-repo":
      return <ScreenStub title="Load any repo" trail={["custom", "repo"]} />;
    case "loading":
      return <LoadingScreen title={view.title} />;
    case "typing":
      return <TypingScreen />;
    case "summary":
      return <ScreenStub title="Session complete" trail={["summary"]} />;
    case "error":
      return <ErrorScreen title={view.title} detail={view.detail} />;
  }
}
