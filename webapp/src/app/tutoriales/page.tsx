import type { Metadata } from "next";
import { TutorialsPage } from "@/features/tutorials/components/TutorialsPage";

export const metadata: Metadata = {
  title: "Tutoriales | Socius",
  description:
    "Videos cortos para cargar tu catálogo, vender, controlar abonos y entender tus números.",
};

export default function Page() {
  return <TutorialsPage />;
}
