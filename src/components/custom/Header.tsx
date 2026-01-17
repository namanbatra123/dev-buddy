"use client";

import React from "react";
import Image from "next/image";
import Logo from "@/../public/logo.png";
import { Button } from "../ui/button";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <div className="border-b border-[#2a2a2a] flex items-center justify-between px-14 py-[13.5px] bg-[#0a0a0a]">
      <Image src={Logo} width={40} height={40} alt="logo" />
      {status === "authenticated" && session?.user ? (
        <div className="flex items-center space-x-4">
          <span className="text-white">
            Welcome, {session.user.name || "User"}!
          </span>
          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-600 hover:bg-red-700 text-white"
            variant="default"
          >
            Sign Out
          </Button>
        </div>
      ) : status === "loading" ? (
        <div className="w-[100px]" />
      ) : (
        <Button
          onClick={() => signIn("google")}
          className="bg-gradient-to-r from-[#7b61ff] to-[#00ccb1] hover:opacity-90 text-white"
          variant="default"
        >
          Sign in
        </Button>
      )}
    </div>
  );
}
