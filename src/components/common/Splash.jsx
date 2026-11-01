import logo from "../../assets/logo.jpg";

function Splash({ text = "Loading your workspace..." }) {
  return (
    <div className="bg-luxe pattern-dots flex min-h-dvh flex-col items-center justify-center gap-6 text-white">
      <div className="relative">
        <div className="absolute -inset-3 animate-ping rounded-full bg-gold-400/20" />
        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white shadow-2xl ring-2 ring-gold-400/70">
          <img src={logo} alt="SafeHavenInsure" className="h-full w-full object-contain" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-display text-2xl font-bold tracking-tight">
          SafeHaven<span className="text-gold-gradient">Insure</span>
        </p>
        <p className="mt-1 text-sm text-gold-200">{text}</p>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="relative h-full w-full overflow-hidden rounded-full bg-gold-400/80 [animation:shimmer_1.2s_infinite]" />
      </div>
    </div>
  );
}

export default Splash;
