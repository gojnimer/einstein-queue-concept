"use client";
import useQueue from "@/hooks/useQueue";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Page({ params: { id } }: { params: { id: number } }) {
  const [encounter, setEncounter] = useState<any>(null);
  const router = useRouter();
  const socket = useQueue(process.env.NEXT_PUBLIC_BACKEND_URL);
  useEffect(() => {
    const initEncounter = async () => {
      const info = await socket.emitEvent("update_queue_item_action", {
        body: {
          id,
          infoToUpdate: {
            status: "on_encounter",
            last_status_update: new Date(),
          },
          fallbackOnDisconnect: true,
        },
      });
      setEncounter(JSON.parse(info));
    };

    initEncounter();
  }, []);

  return (
    <div className={styles.mainContainer}>
      {encounter ? (
        <>
          <h2>Realizando o atendimento do paciente {encounter.patient_name}</h2>
          <button
            className={styles.btnAction}
            onClick={async () => {
              await socket.emitEvent("pop_from_queue", {
                body: {
                  id,
                },
              });
              router.replace("/");
            }}
          >
            Finalizar atendimento
          </button>
        </>
      ) : (
        <h2>Carregando informações do paciente...</h2>
      )}
    </div>
  );
}
