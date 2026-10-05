import { useCallback, useEffect, useState } from "react";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import { createTask, deleteTask, listTasks, updateTask } from "./api";

const TABS = ["Pending", "Completed", "Expired"];
const today = () => new Date().toISOString().slice(0, 10);

function remaining(deadline, now) {
  const ms = new Date(deadline).getTime() - now;
  if (ms <= 0) return "deadline reached";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}h ` : ""}${m}m ${s % 60}s left`;
}

function TaskForm({ onCreate }) {
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today());
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setBusy(true);
    try {
      await onCreate({
        description,
        date,
        ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}),
      });
      setDescription("");
      setDeadline("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form" onSubmit={submit}>
      <input placeholder="What needs to be done?" value={description} maxLength={500}
             onChange={(e) => setDescription(e.target.value)} required />
      <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Deadline <small>(optional, default +5 min)</small>
        <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </label>
      <button disabled={busy}>{busy ? "Adding..." : "Add task"}</button>
    </form>
  );
}

function TaskItem({ task, now, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(task.Description);
  const [date, setDate] = useState(task.Date);

  async function save() {
    await onUpdate(task.TaskId, { description, date });
    setEditing(false);
  }

  return (
    <li className={`card task ${task.Status.toLowerCase()}`}>
      {editing ? (
        <div className="edit">
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={save}>Save</button>
          <button className="secondary" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <>
          <div className="task-main">
            <span className={`badge ${task.Status.toLowerCase()}`}>{task.Status}</span>
            <strong>{task.Description}</strong>
            <span className="meta">
              {task.Date} · deadline {new Date(task.Deadline).toLocaleString()}
              {task.Status === "Pending" && <> · <em>{remaining(task.Deadline, now)}</em></>}
            </span>
          </div>
          <div className="actions">
            {task.Status === "Pending" && <button onClick={() => onUpdate(task.TaskId, { status: "Completed" })}>Complete</button>}
            {task.Status === "Completed" && <button className="secondary" onClick={() => onUpdate(task.TaskId, { status: "Pending" })}>Reopen</button>}
            {task.Status !== "Expired" && <button className="secondary" onClick={() => setEditing(true)}>Edit</button>}
            <button className="danger" onClick={() => onDelete(task.TaskId)}>Delete</button>
          </div>
        </>
      )}
    </li>
  );
}

function Tasks() {
  const { user, signOut } = useAuthenticator((ctx) => [ctx.user]);
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState("Pending");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    try {
      setTasks(await listTasks());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 10000); // pick up server-side expiry
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [refresh]);

  const run = (fn) => async (...args) => {
    try {
      await fn(...args);
      setError("");
    } catch (err) {
      setError(err.message);
    }
    await refresh();
  };

  const visible = tasks.filter((t) => t.Status === tab);

  return (
    <main className="container">
      <header>
        <h1>Module 8 To-Do</h1>
        <div className="user">
          <span>{user?.signInDetails?.loginId}</span>
          <button className="secondary" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <TaskForm onCreate={run(createTask)} />
      {error && <p className="error">{error}</p>}
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>
            {t} ({tasks.filter((x) => x.Status === t).length})
          </button>
        ))}
      </nav>
      <ul className="list">
        {visible.length === 0 && <li className="empty">No {tab.toLowerCase()} tasks.</li>}
        {visible.map((task) => (
          <TaskItem key={task.TaskId} task={task} now={now} onUpdate={run(updateTask)} onDelete={run(deleteTask)} />
        ))}
      </ul>
      <footer>Expired tasks trigger an email notification. Confirm the SNS subscription email after your first sign-in.</footer>
    </main>
  );
}

export default function App() {
  const { authStatus } = useAuthenticator((ctx) => [ctx.authStatus]);
  if (authStatus !== "authenticated") {
    return (
      <div className="auth">
        <h1>Module 8 To-Do</h1>
        <Authenticator loginMechanisms={["email"]} />
      </div>
    );
  }
  return <Tasks />;
}
