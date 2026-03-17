import { useGoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import googleLoginIcon from "../../assets/icons/google_logo.svg";
import { googleOAuthLogin } from "../../features/auth/oAuthSlice";

const GoogleAuthButton = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await dispatch(googleOAuthLogin(tokenResponse.access_token)).unwrap();
        navigate("/");
      } catch (error) {
        console.error("Google login failed:", error);
      }
    },
    onError: (error) => console.error("Google login failed:", error),
  });

  return (
    <button
      onClick={() => login()}
      type="button"
      className="theme-secondary-button flex w-full items-center justify-center gap-3 rounded-[18px] px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
    >
      <img src={googleLoginIcon} alt="Google" className="w-5 h-5" />
      <span>Google</span>
    </button>
  );
};

export default GoogleAuthButton;
