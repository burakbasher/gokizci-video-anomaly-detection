"use client";
/*
import { Loading } from "@/components/loading";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * This page handles device fetching and redirects the user to the detection page for the first device retrieved.
 * It uses the `useSession` hook from NextAuth.js to manage user authentication.
 *
 * The process includes:
 * - Fetching a list of devices via the `fetchDevices` API function with specific pagination (1, 4).
 * - If devices are found, the user is redirected to the `/detection/[id]` page of the first device.
 * - If no devices are found, or an error occurs during fetching, appropriate error messages are set.
 *
 * During the fetch operation, a loading spinner (`Loading` component) is displayed to indicate the process.
 * The page ensures smooth user experience and redirects based on available devices.
 */

/*
export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const { devices } = await fetchDevices(1, 4);  // Fetch devices with specified parameters

        if (devices && devices.length > 0) {
          const id = devices[0]._id;  // Get the ID of the first device
          router.replace(`/detection/${id}`);
        } else {
          setError("No devices found.");
        }
      } catch (err) {
        setError("Failed to fetch devices.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDevices();  // Call the async function to load devices
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <Loading />
      </div>
    );
  }

  if (error) {
    return <p>{error}</p>;
  }

  // If loading or error, a fallback UI should be provided
  return null;
}
*/