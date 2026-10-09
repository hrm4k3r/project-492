"use client";
import { usePathname } from "next/navigation";
import AgeGate from "./AgeGate";
import NavBar from "./NavBar";
import Footer from "./Footer";

export default function ShellPublico({ children }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return children;

  return (
    <>
      <AgeGate />
      <NavBar />
      {children}
      <Footer />
    </>
  );
}
