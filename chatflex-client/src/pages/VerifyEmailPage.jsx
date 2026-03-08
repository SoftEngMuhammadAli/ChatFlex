import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../services/api";

const VerifyEmailPage = () => {
  const [email, setEmail] = useState("");
  const [requestToken, setRequestToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestVerification = async () => {
    setError("");
    setMessage("");
    try {
      const { data } = await authApi.requestEmailVerification({ email });
      setMessage(data.devVerificationToken ? `Dev token: ${data.devVerificationToken}` : data.message);
      if (data.devVerificationToken) {
        setRequestToken(data.devVerificationToken);
        setVerifyToken(data.devVerificationToken);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to request verification");
    }
  };

  const confirmVerification = async () => {
    setError("");
    setMessage("");
    try {
      const tokenToUse = verifyToken || requestToken;
      const { data } = await authApi.verifyEmail({ email, token: tokenToUse });
      setMessage(data.message || "Email verified. You can login now.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to verify email");
    }
  };

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1>Verify Email</h1>
        <p>Request verification token then confirm your email.</p>

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <button type="button" onClick={requestVerification}>
          Request Verification Token
        </button>

        <label>Verification Token</label>
        <input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} />

        <button type="button" onClick={confirmVerification}>
          Confirm Verification
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

export default VerifyEmailPage;
