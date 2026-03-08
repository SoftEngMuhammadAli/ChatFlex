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
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const { data } = await authApi.register(form);
      if (data.token) {
        login(data);
        navigate("/dashboard");
        return;
      }
      setMessage(
        data.devVerificationToken
          ? `Account created. Verify your email. Dev token: ${data.devVerificationToken}`
          : data.message || "Account created. Verify your email before login."
      );
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
        {message && <div style={{ background: "#ecfeff", border: "1px solid #99f6e4", padding: 8 }}>{message}</div>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Workspace"}
        </button>

        <small>
          Already have an account? <Link to="/login">Sign in</Link> | <Link to="/verify-email">Verify email</Link>
        </small>
      </form>
    </main>
  );
};

export default RegisterPage;
