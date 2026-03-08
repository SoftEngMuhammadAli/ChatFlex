import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../services/api";

const ResetPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestReset = async () => {
    setError("");
    setMessage("");
    try {
      const { data } = await authApi.forgotPassword({ email });
      if (data.devResetToken) {
        setToken(data.devResetToken);
      }
      setMessage(data.devResetToken ? `Dev token: ${data.devResetToken}` : data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to request reset");
    }
  };

  const submitReset = async () => {
    setError("");
    setMessage("");
    try {
      const { data } = await authApi.resetPassword({ email, token, newPassword });
      setMessage(data.message || "Password reset successful.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to reset password");
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p>Request reset token and set a new password.</p>

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <button type="button" onClick={requestReset}>
          Request Reset Token
        </button>

        <label>Reset Token</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} />

        <label>New Password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

        <button type="button" onClick={submitReset}>
          Reset Password
        </button>

        {message && <div style={{ background: "#ecfeff", border: "1px solid #99f6e4", padding: 8 }}>{message}</div>}
        {error && <div className="error-text">{error}</div>}

        <small>
          Back to <Link to="/login">Login</Link>
        </small>
      </div>
    </main>
  );
};

export default ResetPasswordPage;
