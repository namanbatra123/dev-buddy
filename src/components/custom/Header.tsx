import React from "react";
import Image from "next/image";
import Logo from "@/../public/logo.png";
import { Button } from "../ui/button";

export default function Header() {
  return (
    <div className="border-b border-[#2a2a2a] flex items-center justify-between px-14 py-[13.5px] bg-[#0a0a0a]">
      <Image src={Logo} width={40} height={40} alt="logo" />
      <Button
        className="bg-gradient-to-r from-[#7b61ff] to-[#00ccb1] hover:opacity-90 text-white"
        variant="default"
      >
        Sign in
      </Button>
    </div>
  );
}
