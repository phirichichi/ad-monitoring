import { useMemo } from "react";
import LoginPage from "./features/auth/LoginPage";
import HomePage from "./features/admin/HomePage";

export default function App() {
  const isAuthed = useMemo(() => {
    return Boolean(localStorage.getItem("access_token"));
  }, []);

  return isAuthed ? <HomePage /> : <LoginPage />;
}