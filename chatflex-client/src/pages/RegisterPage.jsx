import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    workspaceName: ""
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await authApi.register(form);
      login(data);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Create ChatFlex Workspace</h1>
        <p>Get your MERN chatbot SaaS running in minutes.</p>

        <label>Your Name</label>
        <input
          required
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />

        <label>Workspace Name</label>
        <input
          required
          value={form.workspaceName}
          onChange={(event) => setForm((prev) => ({ ...prev, workspaceName: event.target.value }))}
        />

        <label>Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />

        <label>Password</label>
        <input
          type="password"
          minLength={6}
          required
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />

        {error && <div className="error-text">{error}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Workspace"}
        </button>

        <small>
          Already have an account? <Link to="/login">Sign in</Link>
        </small>
      </form>
    </main>
  );
};

export default RegisterPage;
