import { fetchAuthSession } from "aws-amplify/auth";
import { config } from "./config";

// API Gateway's Cognito authorizer validates the ID token sent in the Authorization header.
async function request(method, path, body) {
  const { tokens } = await fetchAuthSession();
  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: tokens?.idToken?.toString() ?? "",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

export const listTasks = () => request("GET", "/tasks").then((d) => d.tasks);
export const createTask = (task) => request("POST", "/tasks", task);
export const updateTask = (id, changes) => request("PUT", `/tasks/${id}`, changes);
export const deleteTask = (id) => request("DELETE", `/tasks/${id}`);
