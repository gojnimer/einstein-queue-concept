"use client";
import useQueue from "@/hooks/useQueue";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Page({ params: { id } }: { params: { id: number } }) {
  const [encounter, setEncounter] = useState<any>(null);
  const router = useRouter();
  const [completedAttendance, setCompletedAttendance] = useState(false);
  const socket = useQueue(process.env.NEXT_PUBLIC_BACKEND_URL);
  useEffect(() => {
    const initEncounter = async () => {
      const info = await socket.emitEvent("update_queue_item_action", {
        body: {
          id,
          infoToUpdate: {
            status: "on_assessment",
            last_status_update: new Date(),
          },
          fallbackOnDisconnect: true,
        },
      });
      setEncounter(JSON.parse(info));
    };
    if (completedAttendance) {
      socket.emitEvent("update_queue_item_action", {
        body: {
          id,
          infoToUpdate: {
            status: "waiting_for_encounter",
            last_status_update: new Date(),
          },
        },
      });
      router.replace("/");
    } else initEncounter();
  }, [completedAttendance]);

  return (
    <div className={styles.mainContainer}>
      {encounter && (
        <h2>Realizando a avaliação do paciente {encounter.patient_name}</h2>
      )}
      <button onClick={() => setCompletedAttendance(true)}>
        Finalizar avaliação
      </button>
    </div>
  );
}
