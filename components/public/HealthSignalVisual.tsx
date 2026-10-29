import Image from "next/image";
/** Decorative illustration only; the nodes do not represent live health data. */
export function HealthSignalVisual() {
  return (
    <div className="ap-signal-visual" aria-hidden="true">
      <Image
        src="/images/community-signals.png"
        alt=""
        width={1536}
        height={1024}
        sizes="(max-width: 767px) 100vw, 60vw"
        preload
        className="ap-hero-image"
      />
    </div>
  );
}
