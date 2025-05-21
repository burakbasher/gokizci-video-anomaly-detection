"app/(pages)/profile/page.tsx"

"use client";

import { useAuth } from "@/components/contexts/AuthContext";
import { Loading } from "@/components/loading";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return <div className="flex justify-center items-center h-screen">
      <Loading />
    </div>;
  }

  return (
    <div>
      <ProfilePanel />
    </div>
  );
}
