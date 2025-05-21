"components/users/UserPanelController.tsx"

"use client";

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { UserPanel } from "./UserPanel";

export function UserPanelController() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") {
    return null;
  }
  
  return <UserPanel />;
}
