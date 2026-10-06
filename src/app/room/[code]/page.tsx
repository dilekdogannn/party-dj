import { Suspense } from "react";
import { GuestRoom } from "@/components/guest-room";

export default function RoomPage({ params }: PageProps<"/room/[code]">) {
  return (
    <Suspense>{params.then(({ code }) => <GuestRoom code={code.toUpperCase()} />)}</Suspense>
  );
}
