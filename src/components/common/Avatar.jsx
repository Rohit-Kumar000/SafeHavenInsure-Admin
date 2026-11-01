import { useAuth } from "../../context/AuthContext";

// Shows the profile photo, or the first letter of the name if there is no photo
function Avatar({ className = "h-9 w-9 text-sm rounded-full" }) {
  const { user, media } = useAuth();

  if (media.avatar) {
    return <img src={media.avatar} alt={user?.name || "Profile"} className={`${className} shrink-0 object-cover`} />;
  }
  return (
    <div className={`${className} flex shrink-0 items-center justify-center bg-gold-sheen font-bold text-blue-950`}>
      {user?.name?.charAt(0)?.toUpperCase() || "A"}
    </div>
  );
}

export default Avatar;