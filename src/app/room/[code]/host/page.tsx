import { Suspense } from "react";
import { HostRoom } from "@/components/host-room";

export default function HostPage({ params }: PageProps<"/room/[code]/host">) {
  return (
    <Suspense>{params.then(({ code }) => <HostRoom code={code.toUpperCase()} />)}</Suspense>
  );
}
