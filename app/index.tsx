import React, { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";

import CaptureDetailScreen from "../src/screens/CaptureDetailScreen";
import CaptureScreen from "../src/screens/CaptureScreen";
import EditTestCaseScreen from "../src/screens/EditTestCaseScreen";
import LoginScreen from "../src/screens/LoginScreen";
import ProjectsScreen from "../src/screens/ProjectsScreen";
import TrainingExamplesScreen from "../src/screens/TrainingExamplesScreen";

type Project = { id: string; name: string; created_at?: string };
type Capture = { id: string; title: string; created_at?: string };

type Route =
  | "projects"
  | "captures"
  | "captureDetail"
  | "editTestcase"
  | "training";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const [route, setRoute] = useState<Route>("projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
      setReady(true);

      if (!session) {
        setRoute("projects");
        setSelectedProject(null);
        setSelectedCapture(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoute("projects");
    setSelectedProject(null);
    setSelectedCapture(null);
  };

  if (!ready) return null;
  if (!signedIn) return <LoginScreen />;

  // ===== ROUTES =====

  if (route === "projects") {
    return (
      <ProjectsScreen
        onOpenProject={(p: Project) => {
          setSelectedProject(p);
          setRoute("captures");
        }}
        onSignOut={signOut}
      />
    );
  }

  if (route === "captures" && selectedProject) {
    return (
      <CaptureScreen
        project={selectedProject}
        onBack={() => {
          setSelectedProject(null);
          setRoute("projects");
        }}
        onOpenCapture={(c: Capture) => {
          setSelectedCapture(c);
          setRoute("captureDetail");
        }}
      />
    );
  }

  if (route === "captureDetail" && selectedCapture) {
    return (
      <CaptureDetailScreen
        capture={selectedCapture}
        onBack={() => setRoute("captures")}
        onEditTestcase={() => setRoute("editTestcase")}
        onOpenTraining={() => setRoute("training")}
      />
    );
  }

  if (route === "editTestcase" && selectedCapture) {
    return (
      <EditTestCaseScreen
        capture={selectedCapture}
        onBack={() => setRoute("captureDetail")}
      />
    );
  }

  if (route === "training") {
    return <TrainingExamplesScreen onBack={() => setRoute("captureDetail")} />;
  }

  // fallback
  return <ProjectsScreen onOpenProject={() => {}} onSignOut={signOut} />;
}
