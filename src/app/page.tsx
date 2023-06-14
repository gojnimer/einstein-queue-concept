"use client";
import styles from "./page.module.css";
import useQueue from "../hooks/useQueue";
import { useEffect, useReducer, useState } from "react";
import { faker } from "@faker-js/faker";
import { useRouter } from "next/navigation";

//diff in years between two dates
const diffYears = (date1: Date, date2: Date) => {
  const diffInMiliseconds = Math.abs(date1.getTime() - date2.getTime());
  const years = Math.floor(diffInMiliseconds / 1000 / 60 / 60 / 24 / 365);
  return years;
};

const statusStrings = {
  waiting_for_assessment: "Aguardando avaliação",
  on_assessment: "Em avaliação",
  waiting_for_encounter: "Aguardando atendimento",
  on_encounter: "Em atendimento",
};

const statusButtonAction = {
  waiting_for_assessment: "Iniciar avaliação",
  on_assessment: "Em avaliação",
  waiting_for_encounter: "Iniciar atendimento",
  on_encounter: "Em atendimento",
};

const statusColor: Record<string, string> = {
  waiting_for_assessment: "rgb(13, 103, 206)",
  on_assessment: "rgb(247, 193, 113)",
  waiting_for_encounter: "rgb(78, 202, 62)",
  on_encounter: "rgb(255, 0, 0)",
};

const createFakePatient = () => {
  const currentDate = new Date();
  return {
    id: Math.random()
      .toString(36)
      .replace(/[^a-z]+/g, "")
      .substr(2, 10),
    category: [
      "cardiologia",
      "neurologia",
      "ortopedia",
      "pediatria",
      "psiquiatria",
    ][Math.floor(Math.random() * 5)],
    patient_name: faker.person.fullName(),
    status: "waiting_for_assessment",
    gender: faker.person.sex(),
    birthDate: faker.date.birthdate(),
    last_status_update: currentDate,
    created_when: currentDate,
  };
};
interface QueueItem {
  id: number;
  category: string;
  categoryId: number;
  patient_name: string;
  status:
    | "waiting_for_assessment"
    | "on_assessment"
    | "waiting_for_encounter"
    | "on_encounter";
  last_status_update: Date;
  created_when: Date;
  gender: string;
  birthDate: Date;
}

interface QueueCategory {
  category: string;
  queue: Array<QueueItem>;
}

const sortQueueByCategory = (queue: Array<QueueItem>) =>
  queue
    .sort(
      (a, b) =>
        new Date(a.last_status_update).getTime() -
        new Date(b.last_status_update).getTime()
    )
    .sort((a, b) => {
      const priority = [
        "on_assessment",
        "on_encounter",
        "waiting_for_assessment",
        "waiting_for_encounter",
      ];
      return priority.indexOf(b.status) - priority.indexOf(a.status);
    })
    .reduce((acc, item) => {
      const categoryIndex = acc.findIndex(
        ({ category }) => category === item.category
      );
      if (categoryIndex !== -1) {
        acc[categoryIndex].queue.push(item);
      } else {
        acc.push({
          category: item.category,
          queue: [item],
        });
      }
      return acc;
    }, [] as Array<QueueCategory>);

const queueReducer = (
  state: Array<QueueCategory>,
  action: {
    type: "update_queue";
    payload?: Array<QueueItem>;
  }
) => {
  switch (action.type) {
    case "update_queue":
      return sortQueueByCategory(action.payload as Array<QueueItem>);
    default:
      return state;
  }
};

const Timer = ({
  initialTime,
  onClick,
}: {
  initialTime: string;
  onClick?: () => void;
}) => {
  const hoursBetweenDates = () => {
    const diffInMiliseconds = Math.abs(
      new Date().getTime() - new Date(initialTime).getTime()
    );
    const seconds = Math.floor(diffInMiliseconds / 1000) % 60;
    const minutes = Math.floor(diffInMiliseconds / 1000 / 60) % 60;
    const hours = Math.floor(diffInMiliseconds / 1000 / 60 / 60);

    const formatter = (valor: any) => {
      return valor < 10 ? `0${valor}` : valor;
    };

    return `${formatter(hours)}:${formatter(minutes)}:${formatter(seconds)}`;
  };

  /*  const [time, setTime] = useState(hoursBetweenDates()); */
  const [time, refresh] = useReducer(
    () => hoursBetweenDates(),
    hoursBetweenDates()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={styles.timePill}
      {...{ onClick }}
      style={{ backgroundColor: "rgb(55, 143, 247)" }}
    >
      {time}
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const socket = useQueue(process.env.NEXT_PUBLIC_BACKEND_URL);
  const [categories, dispatch] = useReducer(queueReducer, []);
  const [categoryFilter, setCategoryFilter] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await socket.emitEvent("get_full_queue");
        dispatch({
          type: "update_queue",
          payload: (response as string[]).map(
            (item: string) => JSON.parse(item) as QueueItem
          ) as Array<QueueItem>,
        });
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    socket.addListener("queue_updated", (data: string[]) => {
      dispatch({
        type: "update_queue",
        payload: data.map(
          (item: string) => JSON.parse(item) as QueueItem
        ) as Array<QueueItem>,
      });
    });

    // Cleanup
    return () => {
      socket.removeListener("queue_updated");
    };
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.categoriesContainer}>
        <>
          <h2>Categorias</h2>
          {categories.length > 1 && (
            <h3
              style={{
                cursor: "pointer",
                opacity: categoryFilter.length ? 0.6 : 1,
              }}
              onClick={(_e) => setCategoryFilter([])}
            >
              Todos (
              {categories.reduce((acc, { queue }) => acc + queue.length, 0)})
            </h3>
          )}
          {categories.map(({ category, queue: { length } }, index) => (
            <h3
              key={`queue-category-${index}`}
              onClick={(_e) => {
                const newFilter = [...categoryFilter];
                if (newFilter.includes(category as never)) {
                  newFilter.splice(newFilter.indexOf(category as never), 1);
                } else {
                  newFilter.push(category as never);
                }
                setCategoryFilter(newFilter);
              }}
              style={{
                textTransform: "capitalize",
                cursor: "pointer",
                opacity: categoryFilter.includes(category as never) ? 0.6 : 1,
              }}
            >
              {category} ({length})
            </h3>
          ))}
          {!categories.length && <p>Nenhuma categoria encontrada</p>}
        </>
        <button
          className={styles.btnAddPatient}
          onClick={async (_e) =>
            socket.emitEvent("push_to_queue", {
              body: { queue_item: createFakePatient() },
            })
          }
        >
          Adicionar paciente
        </button>
      </div>
      <div className={styles.queueContainer}>
        <>
          <h2>PoC - Fila de atendimento (Socket + Redis)</h2>
          {categories
            .filter(
              ({ category }) => !categoryFilter.includes(category as never)
            )
            .map(({ category, queue }, index) => (
              <>
                <h3
                  style={{ textTransform: "capitalize" }}
                  key={`queue-category-${index}`}
                >
                  {category}
                </h3>
                {queue.map(
                  (
                    {
                      id,
                      patient_name,
                      last_status_update,
                      status,
                      gender,
                      birthDate,
                    },
                    queueIndex
                  ) => (
                    <div
                      className={styles.queueItem}
                      key={`queue-category-${index}-patient-${queueIndex}`}
                    >
                      <h4 style={{ textTransform: "capitalize" }}>
                        {patient_name}
                      </h4>
                      <p
                        style={{
                          gridRowStart: "2",
                          gridColumnStart: "1",
                          color: "gray",
                          textTransform: "capitalize",
                        }}
                      >
                        {diffYears(new Date(birthDate), new Date())} anos |{" "}
                        {gender}
                      </p>
                      <Timer
                        initialTime={last_status_update.toString()}
                        {...{ status }}
                      />
                      <p style={{ gridRowStart: "2", gridColumnStart: "2" }}>
                        {statusStrings[status]}
                      </p>
                      <button
                        onClick={(_e) => {
                          if (status === "waiting_for_assessment")
                            router.push(`/attendance/${id}`);
                          else if (status === "waiting_for_encounter")
                            router.push(`/encounter/${id}`);
                        }}
                        style={{ backgroundColor: statusColor[status] }}
                        className={styles.btnStartAction}
                      >
                        {statusButtonAction[status]}
                      </button>
                    </div>
                  )
                )}
              </>
            ))}
        </>
      </div>
    </main>
  );
}
