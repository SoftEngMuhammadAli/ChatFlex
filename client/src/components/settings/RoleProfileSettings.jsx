import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Save, Upload, UserCircle2, Trash2, Eye, EyeOff } from "lucide-react";
import { setSessionUser } from "../../features/auth/authSlice";
import {
  deleteCurrentUserAvatar,
  fetchCurrentUserProfile,
  uploadCurrentUserAvatar,
  selectCurrentUserDraft,
  selectCurrentUserError,
  selectCurrentUserLoading,
  selectCurrentUserProfile,
  selectCurrentUserSaving,
  selectCurrentUserSuccess,
  setUserDraftField,
  updateCurrentUserProfile,
} from "../../features/user/userSlice";

const RoleProfileSettings = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const profile = useSelector(selectCurrentUserProfile);
  const draft = useSelector(selectCurrentUserDraft);
  const loading = useSelector(selectCurrentUserLoading);
  const saving = useSelector(selectCurrentUserSaving);
  const error = useSelector(selectCurrentUserError);
  const success = useSelector(selectCurrentUserSuccess);

  useEffect(() => {
    dispatch(fetchCurrentUserProfile());
  }, [dispatch]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    dispatch(setUserDraftField({ field: name, value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const updated = await dispatch(updateCurrentUserProfile(draft)).unwrap();
      if (updated) {
        dispatch(setSessionUser({ ...(profile || {}), ...updated }));
      }
    } catch (_error) {
      console.error("Profile update failed", _error);
    }
  };

  const avatarPreviewUrl = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile);
    }
    return profile?.profilePictureUrl || "";
  }, [avatarFile, profile?.profilePictureUrl]);

  useEffect(() => {
    return () => {
      if (avatarFile && avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarFile, avatarPreviewUrl]);

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    try {
      const updated = await dispatch(
        uploadCurrentUserAvatar(avatarFile),
      ).unwrap();

      if (updated) {
        dispatch(setSessionUser({ ...(profile || {}), ...updated }));
      }

      setAvatarFile(null);
      setAvatarBroken(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (_error) {
      console.error("Avatar upload failed", _error);
    }
  };

  const handleDeleteAvatar = async () => {
    if (avatarFile) {
      setAvatarFile(null);
      setAvatarBroken(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    const hasCurrentAvatar = Boolean(profile?.profilePictureUrl);
    if (!hasCurrentAvatar) return;

    const confirmed = window.confirm("Remove your profile picture?");
    if (!confirmed) return;

    try {
      const updated = await dispatch(deleteCurrentUserAvatar()).unwrap();

      if (updated) {
        dispatch(setSessionUser({ ...(profile || {}), ...updated }));
      }

      setAvatarBroken(false);
    } catch (_error) {
      console.error("Avatar delete failed", _error);
    }
  };

  const fallbackInitial = String(draft?.name || profile?.name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  const shouldShowImage = Boolean(avatarPreviewUrl) && !avatarBroken;

  return (
    <div className="theme-page animate-in fade-in duration-500 pb-8">
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6">
        <div className="mb-6 flex flex-wrap items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
            <UserCircle2 size={22} />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Profile Information
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Update your name, avatar, and password.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="mb-2 flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              {shouldShowImage ? (
                <img
                  src={avatarPreviewUrl}
                  alt="Profile"
                  className="h-14 w-14 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-emerald-100 dark:bg-emerald-500/20 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {fallbackInitial}
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Profile Picture
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  PNG, JPG, WEBP up to 5MB.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setAvatarFile(file);
                  setAvatarBroken(false);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || saving}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
              >
                Choose Image
              </button>

              <button
                type="button"
                onClick={handleAvatarUpload}
                disabled={loading || saving || !avatarFile}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                <Upload size={15} />
                Upload
              </button>

              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={
                  loading ||
                  saving ||
                  (!avatarFile && !profile?.profilePictureUrl)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-60"
              >
                <Trash2 size={15} />
                {avatarFile ? "Remove Selected" : "Delete"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={draft?.name || ""}
                onChange={handleFieldChange}
                disabled={loading || saving}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                placeholder="Your name"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={draft?.email || ""}
                onChange={handleFieldChange}
                disabled
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 outline-none"
                placeholder="Email"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Email cannot be changed from this screen.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={draft?.password || ""}
                onChange={handleFieldChange}
                disabled={loading || saving}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 pr-10 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                placeholder="Leave blank to keep current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading || saving}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-60"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              <Save size={15} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default RoleProfileSettings;
