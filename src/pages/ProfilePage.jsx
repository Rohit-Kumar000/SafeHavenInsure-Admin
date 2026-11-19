import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Lock, Monitor, LogOut, CheckCircle2, Mail, ShieldCheck,
  Users, FileText, ClipboardList, CreditCard, Eye, EyeOff,
  Camera, ImagePlus, Trash2, Loader2,
} from "lucide-react";
import Avatar from "../components/common/Avatar";
import { resizeImage } from "../utils/image";
import Field from "../components/common/Field";
import PageHeader from "../components/common/PageHeader";
import { useAuth, passwordProblem } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { inputCls, btnPrimary, btnGhost, card } from "../components/common/ui";

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className={card}>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function useFlash() {
  const [msg, setMsg] = useState("");
  const show = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 3000);
  };
  const node = msg ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
      <CheckCircle2 className="h-4 w-4" /> {msg}
    </span>
  ) : null;
  return [node, show];
}

function ProfileBanner() {
  const { user, media, setMedia } = useAuth();
  const avatarRef = useRef(null);
  const coverRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const pick = async (e, key, w, h) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(key);
    try {
      const dataUrl = await resizeImage(file, w, h);
      const blob = await (await fetch(dataUrl)).blob();
      const res = await setMedia(key, new File([blob], `${key}.jpg`, { type: "image/jpeg" }));
      if (!res.ok) setError(res.error);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const ghostBtn =
    "inline-flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/60 disabled:opacity-60";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Cover */}
      <div className="relative h-32 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 sm:h-44">
        {media.cover && (
          <img src={media.cover} alt="Cover" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute right-3 top-3 flex gap-2">
          <button onClick={() => coverRef.current?.click()} disabled={busy === "cover"} className={ghostBtn}>
            {busy === "cover" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            <span className="hidden sm:inline">{media.cover ? "Change cover" : "Add cover"}</span>
          </button>
          {media.cover && (
            <button onClick={() => setMedia("cover", null)} title="Remove cover" className={ghostBtn}>
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <input
          ref={coverRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => pick(e, "cover", 1400, 420)}
        />
      </div>

        {/* Avatar and details */}
      <div className="flex flex-col gap-4 px-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="-mt-8 flex min-w-0 flex-col gap-3 sm:-mt-10 sm:flex-row sm:items-end sm:gap-5">
          <div className="relative w-fit shrink-0">
            <Avatar className="h-24 w-24 rounded-2xl text-4xl ring-4 ring-white dark:ring-slate-900 sm:h-28 sm:w-28" />
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={busy === "avatar"}
              title="Change photo"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-2 ring-white transition hover:bg-blue-700 disabled:opacity-60 dark:ring-slate-900"
            >
              {busy === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => pick(e, "avatar", 400, 400)}
            />
          </div>

          <div className="min-w-0 pb-1">
            <h3 className="truncate text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h3>
            <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:bg-blue-500/15 dark:text-blue-400 sm:self-auto">
          <ShieldCheck className="h-4 w-4" /> {user?.roleName || "Admin"}
        </span>
      </div>

      {error && (
        <p className="border-t border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function PersonalInfo() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [flash, show] = useFlash();
  const emailChanged = email.trim().toLowerCase() !== (user?.email || "").toLowerCase();

  const save = async (e) => {
    e.preventDefault();
    const err = {};
    if (name.trim().length < 2) err.name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) err.email = "Enter a valid email";
    if (emailChanged && !password) err.password = "Enter your current password to change the email";
    setErrors(err);
    if (Object.keys(err).length) return;
    setSaving(true);
    const res = await updateProfile({ name: name.trim(), email: email.trim(), password });
    setSaving(false);
    if (!res.ok) return setErrors({ form: res.error });
    setPassword("");
    show("Profile updated");
  };

  return (
    <Section icon={User} title="Personal Information" desc="Your name and the email you log in with.">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" error={errors.name}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
        </div>
        {emailChanged && (
          <Field label="Current Password" error={errors.password}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputCls} />
          </Field>
        )}
        {errors.form && <p className="text-sm text-red-500">{errors.form}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save Changes"}</button>
          {flash}
        </div>
      </form>
    </Section>
  );
}

function PasswordForm() {
  const { changePassword } = useAuth();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [flash, flashShow] = useFlash();

  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    const err = {};
    if (!cur) err.cur = "Enter your current password";
    if (passwordProblem(next)) err.next = passwordProblem(next);
    else if (next === cur) err.next = "New password must be different";
    if (confirm !== next) err.confirm = "Passwords do not match";
    if (!Object.keys(err).length) {
      setSaving(true);
      const res = await changePassword(cur, next);
      setSaving(false);
      if (!res.ok) err.cur = res.error;
    }
    setErrors(err);
    if (Object.keys(err).length) return;
    setCur("");
    setNext("");
    setConfirm("");
    flashShow("Password changed");
  };

  const type = show ? "text" : "password";

  return (
    <Section icon={Lock} title="Security" desc="Change your password. Use at least 8 characters with letters and numbers.">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Current Password" error={errors.cur}>
            <input type={type} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" className={inputCls} />
          </Field>
          <Field label="New Password" error={errors.next}>
            <input type={type} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className={inputCls} />
          </Field>
          <Field label="Confirm Password" error={errors.confirm}>
            <input type={type} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={inputCls} />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-blue-700 dark:text-slate-400"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {show ? "Hide passwords" : "Show passwords"}
        </button>
        <div className="flex flex-wrap items-center gap-4">
          <button disabled={saving} className={btnPrimary}>{saving ? "Updating..." : "Change Password"}</button>
          {flash}
        </div>
      </form>
    </Section>
  );
}

function ProfilePage() {
  const { user, logout } = useAuth();
  const { customers, policies, claims, payments } = useData();
  const navigate = useNavigate();

  const remembered = localStorage.getItem("sh_remember") === "1";
  const method = "Email and password (Appwrite)";

  const stats = [
    { label: "Customers", value: customers.length, icon: Users },
    { label: "Policies", value: policies.length, icon: FileText },
    { label: "Claims", value: claims.length, icon: ClipboardList },
    { label: "Payments", value: payments.length, icon: CreditCard },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const labelCls = "text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500";
  const valueCls = "mt-0.5 text-sm font-medium text-gray-900 dark:text-white";

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="Your account details, photos, security and session." />

      <ProfileBanner />

      {/* Activity */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className={`${card} flex items-center gap-3 sm:gap-4`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
              <p className="truncate text-xs text-gray-500 dark:text-slate-400">{label} managed</p>
            </div>
          </div>
        ))}
      </div>

      <PersonalInfo />
      <PasswordForm />

      <Section icon={Monitor} title="Session" desc="How you are logged in on this browser.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className={labelCls}>Login method</p>
            <p className={valueCls}>{method}</p>
          </div>
          <div>
            <p className={labelCls}>Session type</p>
            <p className={valueCls}>{remembered ? "Remembered on this device" : "Ends when browser closes"}</p>
          </div>
          <div>
            <p className={labelCls}>Role</p>
            <p className={valueCls}>{user?.roleName || "Admin"}</p>
          </div>
        </div>
        <div className="mt-5 border-t border-gray-100 pt-4 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className={`${btnGhost} !border-red-300 !text-red-600 hover:!bg-red-50 dark:!border-red-500/40 dark:!text-red-400 dark:hover:!bg-red-500/10`}
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </Section>
    </div>
  );
}

export default ProfilePage;